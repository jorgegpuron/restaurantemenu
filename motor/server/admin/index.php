<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/paises.php';   // lo escribe el build desde banderas.mjs

/* cliente.php lo escribe el build. Si el que hay arriba es de una version anterior no
   trae la marca, y el panel tiene que seguir abriendo igual: la chapa dira que no lo sabe. */
if (!defined('BUILD_ID')) define('BUILD_ID', '');
if (!defined('BUILD_FECHA')) define('BUILD_FECHA', '');
/* config.php si se edita a mano, y uno del servidor puede ser anterior al cambio de nombre. */
if (!defined('COPIAS_MAX')) define('COPIAS_MAX', defined('COPIAS_DIAS') ? (int) COPIAS_DIAS : 3);

/* Los avisos de PHP van al registro del servidor, nunca a la pantalla: un warning pintado en
   el navegador enseña rutas internas del hosting a quien no debe verlas. */
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// El panel no tiene por qué salir en Google, y menos aún con el modo demo abierto.
header('X-Robots-Tag: noindex, nofollow');
// Ni dentro de un iframe ajeno, ni con el navegador adivinando tipos, ni contando a otra
// web desde dónde se llega. Tres cabeceras que no cuestan nada y cierran tres puertas.
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

// Un id de sesión que no haya emitido este servidor no se acepta: sin esto, fijar la cookie
// de la víctima antes de que entre le regala la sesión al que la fijó.
ini_set('session.use_strict_mode', '1');
// Nombre propio y cookie acotada a admin/: en un hosting con varios sitios PHP bajo el mismo
// dominio, un PHPSESSID en / se mezcla con el de cualquier otra aplicación.
/* El nombre sale del slug del cliente (cliente.php, escrito por el build): dos paneles en
   el mismo dominio no comparten cookie.

   PHP exige un nombre de sesion de letras y digitos, asi que el slug se normaliza. Y la
   normalizacion puede hacer chocar slugs distintos ("restaurante-uno" y "restaurante_uno"
   quedarian iguales), asi que SOLO el slug que ya es limpio usa su nombre tal cual; a
   cualquier otro se le añade un hash corto y estable del slug ORIGINAL, que separa lo que la
   limpieza junto. Para un slug limpio como el del primer cliente, el resultado es exactamente
   el valor historico y nadie pierde su sesion. Sin cliente.php: nombre neutro. */
$slugPanel = defined('CLIENTE_SLUG') ? (string) CLIENTE_SLUG : '';
$slugLimpio = preg_replace('/[^a-z0-9]/', '', strtolower($slugPanel));
if ($slugPanel === '') {
  session_name('carta_admin');
} elseif ($slugLimpio === $slugPanel && $slugLimpio !== '') {
  session_name($slugLimpio . '_admin');
} else {
  $base = $slugLimpio !== '' ? substr($slugLimpio, 0, 12) : 'carta';
  session_name($base . '_' . substr(sha1($slugPanel), 0, 6) . '_admin');
}
session_start([
  'cookie_httponly' => true,
  'cookie_samesite' => 'Lax',
  'cookie_secure'   => !empty($_SERVER['HTTPS']),
  'cookie_path'     => rtrim(dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/')), '/') . '/',
  // El recolector por defecto borra sesiones a los 24 min; el panel promete 30. Margen de 5.
  'gc_maxlifetime'  => SESION_MINUTOS * 60 + 300,
]);
// Toda petición tiene token CSRF desde el principio: también la pantalla de primera
// configuración lo necesita, que escribe la contraseña y es la acción más grave de todas.
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));

/* ---------------------------------------------------------------- fecha de servicio
 * Un plato marcado a las 22:00 sigue agotado a las 02:00 — es el mismo servicio. Por eso
 * la unidad no es el día natural sino la "fecha de servicio": la fecha en Canarias,
 * retrocedida un día antes de las 06:00. Así el archivo caduca solo y nadie tiene que
 * limpiarlo por la mañana. */
function fecha_servicio(): string {
  $ahora = new DateTimeImmutable('now', new DateTimeZone(TZ));
  if ((int) $ahora->format('G') < CORTE_HORA) {
    $ahora = $ahora->modify('-1 day');
  }
  return $ahora->format('Y-m-d');
}

/* El dia del contador NO es el de servicio. El de servicio corre el corte a las 6:00 para que
   una cena que se alarga siga siendo la de anoche, y eso es lo correcto para los agotados: lo
   decide la cocina y la cocina no cierra a las doce. Contar gente es otra cosa — se cuenta por
   dia natural de Canarias, y a las 00:00 empieza otro. */
function fecha_contador(): string {
  return (new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('Y-m-d');
}

/* ---------------------------------------------------------------- catálogo y estado */
function platos(): array {
  $raw = @file_get_contents(PLATOS_PATH);
  if ($raw === false) return [];
  $lista = json_decode($raw, true);
  if (!is_array($lista)) return [];
  /* El panel enseña lo mismo que la carta en español: número, nombre y pestaña. El nombre
     inglés se conserva en name_en para quien conozca el plato por él (y para buscar).
     `es`/`en` (y sus `tab_`/`group_`) los manda ya resueltos motor/gen.mjs -- español e
     inglés de verdad, esten donde esten configurados en este cliente (base o extra), nunca
     "el primer idioma extra que haya". Un platos.json antiguo sin `en`/`tab_en`/`group_en`
     cae al campo base (`name`/`tab`/`group` crudos, antes de la reescritura de abajo) y
     sigue funcionando, igual que ya hacía con `es`. */
  foreach ($lista as &$p) {
    $p['name_en']  = (string) ($p['en'] ?? $p['name'] ?? '');
    $p['group_en'] = (string) ($p['group_en'] ?? $p['group'] ?? '');
    $p['tab_en']   = (string) ($p['tab_en'] ?? $p['tab'] ?? '');
    $p['name']  = (string) ($p['es'] ?? $p['name'] ?? '');
    $p['group'] = (string) ($p['group_es'] ?? $p['group'] ?? '');
    $p['tab']   = (string) ($p['tab_es'] ?? $p['tab'] ?? '');
    /* Lo que la carta enseña bajo el nombre: la pestaña y, si es distinto, el grupo. */
    $p['sub']   = $p['tab'] . ($p['group'] !== $p['tab'] ? ' · ' . $p['group'] : '');
  }
  unset($p);
  return $lista;
}

/* ------------------------------------------------------ el mismo plato, en varias filas
 *
 * Un plato ocupa varias filas de la carta: además de su pestaña de comida está en Sin gluten
 * y en Vegano, y alguno sale en cinco sitios. Cada fila tiene su propia clave y el estado va
 * por clave, así que agotar el Papadum de Aperitivos dejaba el de Vegano disponible y al
 * precio viejo. Comprobado en la carta publicada: 23 platos con filas espejo, y el comensal
 * viendo el mismo plato agotado y disponible a la vez.
 *
 * Son el mismo plato los que comparten NOMBRE y PRECIO DE CARTA. El precio tiene que entrar:
 * «Pollo Tikka» vale 8,00 de entrante y 19,95 en el biryani, y no es el mismo plato. Y es el
 * precio de la CARTA, no el que haya puesto el panel: si fuera el de ahora, cambiarle el
 * precio a una fila la separaría de sus hermanas justo cuando más falta hace que sigan juntas.
 *
 * Devuelve clave => todas las claves de ese plato, la suya incluida. Las filas sin hermanas
 * no salen: quien pregunte por ellas se queda con su propia clave y no paga nada. */
function plato_hermanas(array $lista): array {
  $porPlato = [];
  foreach ($lista as $p) {
    $porPlato[$p['name'] . "\0" . $p['price']][] = $p['key'];
  }
  $out = [];
  foreach ($porPlato as $claves) {
    if (count($claves) < 2) continue;
    foreach ($claves as $k) $out[$k] = $claves;
  }
  return $out;
}

function estado_vacio(): array {
  return [
    /* La version del formato. 2 = las claves de plato son dishId y las de categoria catId;
       sin el campo, o con 1, es el formato anterior: el panel lo lee tal cual y ofrece la
       migracion explicita — ver estado_analizar(). */
    'esquema' => 2,
    'soldOut' => [],
    'tags'    => [],
    'offer'   => ['on' => false, 'cats' => [], 'keys' => [], 'percent' => 20, 'from' => 600, 'to' => 720, 'days' => [1,2,3,4,5,6,7]],
    'prices'  => [],
    /* La nota de Google que sale al final de la carta. Arranca apagada y a cero a propósito:
       una carta recién montada no puede heredar la nota de otro restaurante. */
    'reviews' => ['on' => false, 'rating' => 0, 'count' => 0],
    /* Las fotos del carrusel de cabecera, en el orden en que se ven. Sólo los nombres de
       archivo: viven en assets/hero/ y ahí los deja el propio panel. */
    'hero'    => [],
    /* Una foto por plato: clave del plato => nombre de archivo. Viven en assets/platos/ y las
       deja aquí el panel, igual que las del hero.

       Van en el ESTADO y no en la carta a propósito. La carta se compila desde carta.mjs en el
       ordenador de quien la mantiene; el estado lo escribe el panel en el servidor. Una foto
       guardada en la carta se perdería en la siguiente compilación, y además el panel no sabe
       escribir la carta. El precio de esto es el mismo que ya pagan los precios y los agotados:
       se identifica por la clave del plato, así que renombrarlo en la carta le quita la foto.

       Sólo el nombre del archivo, nunca la ruta: la carpeta la ponen FOTOS_DIR y FOTOS_URL. */
    'fotos'   => [],
    /* Las redes del restaurante. Del WhatsApp se guarda SOLO el numero en digitos; la
       direccion la monta la carta. Guardar el enlace entero seria guardar dos veces el mismo
       dato y dejar que se separen. */
    'social'  => ['whatsapp' => '', 'instagram' => '', 'facebook' => '', 'tripadvisor' => ''],
    /* El juego se entrega ENCENDIDO. Venía apagado porque encenderlo comprometía al
       restaurante a pagar un premio; sin premio no compromete a nada. */
    'game'    => ['on' => true],
    /* El enlace de reseñas. Es configuración del restaurante y se edita en Marca; la carta lo
       usa al pie. El juego ya no lo toca: se fue con los premios. */
    'review'  => ['url' => ''],
    /* Override del nombre, el texto pequeño de portada y el color principal. cliente.mjs
       trae los de fábrica; esto es lo que el propio restaurante ha cambiado desde el
       panel para sustituirlos, y nunca al revés — el panel no toca cliente.mjs. Vacío es
       "sigue mandando el de fábrica", no "sin nombre"/"sin color". */
    'marca'   => ['nombreVisible' => '', 'rotuloVisible' => '', 'colorPrincipal' => ''],
    'actualizado' => null,
  ];
}

/* ---------------------------------------------------------------- redes
 * De un enlace pegado por un cliente no se fia uno: llegan con espacios, sin protocolo, con la
 * app en vez de la web, o pegados en la casilla equivocada —el de Instagram en la de Facebook
 * es el error mas comun de todos—. Asi que se comprueba el dominio, no solo que sea una URL.
 */
const REDES_HOST = [
  'instagram'   => ['instagram.com'],
  'facebook'    => ['facebook.com', 'fb.com', 'fb.me'],
  'tripadvisor' => ['tripadvisor'],   // .com, .es, .co.uk... se compara por prefijo de dominio
];

function red_url_ok(string $red, string $url): bool {
  if (!filter_var($url, FILTER_VALIDATE_URL)) return false;
  if (stripos($url, 'https://') !== 0) return false;
  $host = strtolower((string) parse_url($url, PHP_URL_HOST));
  if ($host === '') return false;
  if (strpos($host, 'www.') === 0) $host = substr($host, 4);
  foreach (REDES_HOST[$red] as $bueno) {
    if ($red === 'tripadvisor') {
      if (strpos($host, $bueno) !== false) return true;
    } elseif ($host === $bueno || substr($host, -strlen('.' . $bueno)) === '.' . $bueno) {
      return true;
    }
  }
  return false;
}

/* El telefono se guarda en digitos y nada mas: es lo que quiere wa.me y lo que sobrevive a que
   alguien lo escriba con espacios, guiones, parentesis o un mas delante.
   El 00 de las llamadas internacionales se cae: en un enlace no vale, y quien lo escribe asi
   esta poniendo bien el pais sin saberlo. */
function wa_normalizar(string $t): string {
  $d = preg_replace('/[^0-9]/', '', $t);
  if ($d === '') return '';
  if (strpos($d, '00') === 0) $d = substr($d, 2);
  return $d;
}

/* ---------------------------------------------------------------- color de marca
 * El unico color que Marca deja editar. Secundario, Oscuro y Neutral son constantes
 * fijas del motor -- llegan por cliente.php (CLIENTE_COLOR_*), con el mismo respaldo
 * NEUTRO que el resto del panel si faltara (build a medias). La aritmetica de aqui es
 * la MISMA, cifra por cifra, que motor/temas.mjs (Node, al compilar) y que la funcion
 * gemela en el <script> de la carta (JS, en el navegador de quien la visita): un color
 * que el panel acepta tiene que dar el mismo resultado en los tres sitios. */
function color_normalizar(string $valor): ?string {
  $s = trim($valor);
  if (!preg_match('/^#?([0-9a-fA-F]{6})$/', $s, $m)) return null;
  return '#' . strtoupper($m[1]);
}
function color_aRGB(string $hex): array {
  $h = ltrim($hex, '#');
  return [hexdec(substr($h, 0, 2)), hexdec(substr($h, 2, 2)), hexdec(substr($h, 4, 2))];
}
function color_canal(float $c): float {
  $s = $c / 255;
  return $s <= 0.04045 ? $s / 12.92 : pow(($s + 0.055) / 1.055, 2.4);
}
function color_luz(string $hex): float {
  $c = array_map('color_canal', color_aRGB($hex));
  return 0.2126 * $c[0] + 0.7152 * $c[1] + 0.0722 * $c[2];
}
function color_contraste(string $a, string $b): float {
  $x = color_luz($a); $y = color_luz($b);
  return (max($x, $y) + 0.05) / (min($x, $y) + 0.05);
}
function color_mezcla(string $a, string $b, float $t): string {
  $ca = color_aRGB($a); $cb = color_aRGB($b);
  $out = '#';
  for ($i = 0; $i < 3; $i++) {
    $n = (int) round(min(255, max(0, $ca[$i] * $t + $cb[$i] * (1 - $t))));
    $out .= str_pad(dechex($n), 2, '0', STR_PAD_LEFT);
  }
  return $out;
}
/* null si el hex no da para un --accent-ink, un --metal o un --metal-ink legibles contra
 * las constantes fijas -- el UNICO criterio de rechazo: ni Oscuro ni Neutro se leen
 * encima de este color en los sitios donde el acento (o su variante metal) hace de
 * FONDO. Un color CLARO (amarillo, beige, naranja pastel) no se rechaza por ser claro:
 * Oscuro casi siempre lee bien sobre un fondo claro, así que $accentInk cae ahí solo.
 * $metalInk se calcula sobre el $metal YA aclarado, no reutiliza $accentInk: con un
 * colorPrincipal oscuro, metal puede acabar bastante más claro que el hex original (ver
 * el mismo razonamiento en motor/temas.mjs). $badgeInk es la tinta de los badges/
 * etiquetas de producto (item-tag, dsheet-flag, aviso-badge, .badge, .insignia.is-user,
 * el boton Buscar): blanco fijo SOLO con el naranja de fabrica exacto -- '#FF7517',
 * literal a proposito, es el hex del motor, no el de fabrica de un cliente concreto --
 * excepcion visual consciente y pedida; con cualquier otro colorPrincipal, es
 * $accentInk, sin excepcion. Devuelve los cinco tokens que dependen de colorPrincipal,
 * listos para imprimir en un <style>. */
function derivar_principal(string $hex): ?array {
  $oscuro = defined('CLIENTE_COLOR_OSCURO') ? CLIENTE_COLOR_OSCURO : '#2C2727';
  $neutro = defined('CLIENTE_COLOR_NEUTRAL') ? CLIENTE_COLOR_NEUTRAL : '#F6F4F4';
  $accentInk = null;
  if (color_contraste($oscuro, $hex) >= 4.5) $accentInk = $oscuro;
  elseif (color_contraste($neutro, $hex) >= 4.5) $accentInk = $neutro;
  if ($accentInk === null) return null;
  $metal = null;
  for ($t = 100; $t >= 40; $t--) {
    $c = color_mezcla($hex, $neutro, $t / 100);
    if (color_contraste($c, $oscuro) >= 4.5) { $metal = $c; break; }
  }
  if ($metal === null) return null;
  $metalInk = null;
  if (color_contraste($oscuro, $metal) >= 4.5) $metalInk = $oscuro;
  elseif (color_contraste($neutro, $metal) >= 4.5) $metalInk = $neutro;
  if ($metalInk === null) return null;
  $badgeInk = strtoupper($hex) === '#FF7517' ? '#FFFFFF' : $accentInk;
  return ['--accent' => $hex, '--accent-ink' => $accentInk, '--metal' => $metal, '--metal-ink' => $metalInk, '--badge-ink' => $badgeInk];
}

/* ---------------------------------------------------------------- fotos de cabecera
 * Una carpeta que acepta archivos de fuera es la puerta clásica de entrada a un servidor, así
 * que aquí no se confía en nada de lo que llega:
 *
 *   - El tipo NO sale del nombre ni de la cabecera que manda el navegador, que las escribe
 *     quien sube. Sale de mirar los bytes con getimagesize(), que además confirma que el
 *     archivo es una imagen de verdad y no un .php disfrazado.
 *   - La extensión la ponemos nosotros a partir de ese tipo. El nombre original se tira
 *     entero: puede traer barras, puntos o nombres reservados de Windows.
 *   - El nombre nuevo es aleatorio. Así nadie puede adivinar una URL ni pisar un archivo
 *     existente, y dos fotos con el mismo nombre no se estorban.
 *   - Y la carpeta lleva un .htaccess que apaga la ejecución de PHP, por si algún día algo
 *     de lo anterior falla.
 */
const HERO_TIPOS = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];

/* is_writable() NO es la última palabra: sobre OneDrive, unidades de red y carpetas con ACL
   de Windows devuelve false en carpetas donde escribir funciona perfectamente — comprobado
   en esta misma máquina, con is_writable() a 0 en assets/platos, assets/hero y
   assets/publicidad y la escritura real funcionando en las tres. Ese falso negativo dejaba
   el panel diciendo «no puedo escribir» y bloqueaba subidas que habrían ido bien.
   Así que si is_writable() dice que no, se pregunta al disco: se escribe un fichero de
   prueba y se borra. Sólo se rechaza cuando el disco también dice que no, que es cuando el
   mensaje al restaurante («dale permiso de escritura») es verdad. */
function carpeta_escribible(string $dir): bool {
  if (is_writable($dir)) return true;
  $sonda = $dir . '/.escritura-' . bin2hex(random_bytes(4)) . '.tmp';
  if (@file_put_contents($sonda, '') === false) return false;
  @unlink($sonda);
  return true;
}

function hero_carpeta_lista(): bool {
  if (!is_dir(HERO_DIR) && !@mkdir(HERO_DIR, 0755, true)) return false;
  /* El guardián se escribe una vez y se queda. Si la carpeta ya lo tiene, no se toca. */
  $guardia = HERO_DIR . '/.htaccess';
  if (!is_file($guardia)) {
    /* Todo va dentro de <IfModule>. php_flag SOLO existe con mod_php: en un servidor con
       PHP-FPM, que es lo normal hoy, esa línea suelta devuelve un 500 en toda la carpeta de
       imágenes. Un guardián que tumba el sitio no es un guardián. */
    @file_put_contents($guardia, implode(PHP_EOL, [
      '# Aqui solo hay imagenes subidas desde el panel. Nada se ejecuta.',
      '<IfModule mod_php.c>',
      '  php_flag engine off',
      '</IfModule>',
      '<IfModule mod_php7.c>',
      '  php_flag engine off',
      '</IfModule>',
      '<IfModule mod_mime.c>',
      '  RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps',
      '  AddType text/plain .php .phtml .php3 .php4 .php5 .php7 .phps',
      '</IfModule>',
      '<IfModule mod_headers.c>',
      '  Header set X-Content-Type-Options "nosniff"',
      '</IfModule>',
    ]) . PHP_EOL);
  }
  return carpeta_escribible(HERO_DIR);
}

/* --- publicidad: el banner alquilado de la carta ---------------------------------------
   Mismos principios que las fotos del hero: nombre aleatorio generado AQUI (16 hex +
   extension del mapa admitido), carpeta con guardian que apaga PHP, y validacion del
   basename en CADA uso -- persistir, borrar, pintar. El estado guarda SOLO el basename;
   la ruta publica la dicta el motor (PUB_URL, horneada en cliente.php) y la fisica se
   deriva de ella (PUB_DIR, config.php). Nadie que escriba en el POST elige rutas. */

function pub_nombre_valido(string $n): bool {
  return (bool) preg_match('/^[0-9a-f]{16}\.(jpg|png|webp)$/', $n);
}

function pub_carpeta_lista(): bool {
  if (!is_dir(PUB_DIR) && !@mkdir(PUB_DIR, 0755, true)) return false;
  $guardia = PUB_DIR . '/.htaccess';
  if (!is_file($guardia)) {
    @file_put_contents($guardia, implode(PHP_EOL, [
      '# Aqui solo hay imagenes subidas desde el panel. Nada se ejecuta.',
      '<IfModule mod_php.c>',
      '  php_flag engine off',
      '</IfModule>',
      '<IfModule mod_php7.c>',
      '  php_flag engine off',
      '</IfModule>',
      '<IfModule mod_mime.c>',
      '  RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps',
      '  AddType text/plain .php .phtml .php3 .php4 .php5 .php7 .phps',
      '</IfModule>',
      '<IfModule mod_headers.c>',
      '  Header set X-Content-Type-Options "nosniff"',
      '</IfModule>',
    ]) . PHP_EOL);
  }
  return carpeta_escribible(PUB_DIR);
}

/* Borra UNA creatividad por su basename, y nada mas que eso: sin glob, sin recursion, sin
   rutas del POST. Un symlink donde se esperaba el fichero aborta y se registra: no se sigue.
   Ausente = ya esta hecho (idempotente). Devuelve false solo cuando el fichero sigue ahi. */
function pub_borrar(string $nombre): bool {
  if (!pub_nombre_valido($nombre)) { registrar_acceso('publicidad: basename invalido al borrar'); return false; }
  $ruta = PUB_DIR . '/' . $nombre;
  if (is_link($ruta)) { registrar_acceso('publicidad: ' . $nombre . ' es un symlink, borrado abortado'); return false; }
  if (!is_file($ruta)) return true;
  if (!@unlink($ruta)) { registrar_acceso('publicidad: no he podido borrar ' . $nombre); return false; }
  return true;
}

/* De 'YYYY-MM-DDTHH:MM' escrito en la hora del restaurante (input datetime-local) al
   instante UTC que guarda el estado. Devuelve '' si no hay nada, null si no parsea. */
function pub_fecha_a_utc(string $v): ?string {
  $v = trim($v);
  if ($v === '') return '';
  $d = DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $v, new DateTimeZone(TZ));
  if ($d === false) return null;
  return $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
}

/* Y la vuelta, para rellenar el input al editar. */
function pub_fecha_a_local(string $utc): string {
  if ($utc === '') return '';
  try { $d = new DateTimeImmutable($utc); } catch (Exception $e) { return ''; }
  return $d->setTimezone(new DateTimeZone(TZ))->format('Y-m-d\TH:i');
}

/* El estado que se le ensena al administrador. INCOMPLETO manda sobre las fechas: un banner
   encendido sin imagen valida no puede salir, este en el periodo que este. */
function pub_estado_banner(?array $b): string {
  if (!is_array($b) || empty($b['on'])) return 'DESACTIVADO';
  if (!pub_nombre_valido((string) ($b['img'] ?? ''))) return 'INCOMPLETO';
  $ahora = time();
  $ini = (string) ($b['startAt'] ?? '');
  $fin = (string) ($b['endAt'] ?? '');
  if ($ini !== '') { $t = strtotime($ini); if ($t === false || $ahora < $t) return 'PROGRAMADO'; }
  if ($fin !== '') { $t = strtotime($fin); if ($t === false || $ahora > $t) return 'CADUCADO'; }
  return 'ACTIVO';
}

/* Con varios archivos, PHP no da una lista de archivos: da un archivo cuyos campos son
   listas. $_FILES['foto']['name'] es un array, ['size'] es otro, y hay que recomponerlos por
   indice. Es una de las formas mas raras de la biblioteca estandar y la fuente de la mitad de
   los fallos de subida multiple. */
function hero_archivos(): array {
  $f = $_FILES['foto'] ?? null;
  if (!is_array($f) || !isset($f['name'])) return [];
  if (!is_array($f['name'])) return [$f];                 // uno solo, forma clasica
  $out = [];
  foreach (array_keys($f['name']) as $i) {
    $out[] = [
      'name'     => $f['name'][$i],
      'type'     => $f['type'][$i] ?? '',
      'tmp_name' => $f['tmp_name'][$i] ?? '',
      'error'    => $f['error'][$i] ?? UPLOAD_ERR_NO_FILE,
      'size'     => $f['size'][$i] ?? 0,
    ];
  }
  return $out;
}

/** Devuelve el nombre guardado, o un mensaje de error. */
function hero_guardar(array $f) {
  if (!isset($f['error']) || $f['error'] !== UPLOAD_ERR_OK) {
    if (($f['error'] ?? 0) === UPLOAD_ERR_INI_SIZE || ($f['error'] ?? 0) === UPLOAD_ERR_FORM_SIZE) {
      return ['error' => 'La foto pesa más de 1 MB.'];
    }
    return ['error' => 'No ha llegado la foto. Inténtalo otra vez.'];
  }
  if ($f['size'] > HERO_MAX_BYTES) {
    return ['error' => 'La foto pesa ' . round($f['size'] / 1048576, 1) . ' MB y el máximo es 1 MB.'];
  }
  if (!is_uploaded_file($f['tmp_name'])) return ['error' => 'Archivo no válido.'];

  $info = @getimagesize($f['tmp_name']);
  if ($info === false || !isset(HERO_TIPOS[$info[2]])) {
    return ['error' => 'Eso no es una imagen JPG, PNG o WebP.'];
  }
  if ($info[0] < 800) {
    return ['error' => 'La foto mide ' . (int) $info[0] . ' px de ancho. Hacen falta 800 como mínimo, '
                     . 'o se verá borrosa en una pantalla grande.'];
  }
  if (!hero_carpeta_lista()) {
    return ['error' => 'No puedo escribir en assets/hero/. Crea la carpeta en el servidor y dale permiso de escritura.'];
  }

  $nombre = bin2hex(random_bytes(8)) . '.' . HERO_TIPOS[$info[2]];
  $destino = HERO_DIR . '/' . $nombre;
  /* La portada se ve a lo sumo a pantalla de móvil o tablet: por encima de 1600 px de ancho
     el mega entero sólo paga datos. Si el hosting trae GD —cualquier cPanel lo trae— se
     reescala y recomprime; si no, o si GD falla con este archivo, se guarda tal cual, que
     ya pasó todas las comprobaciones. La foto nunca se pierde por optimizarla. */
  if (!hero_recomprimir($f['tmp_name'], $info, $destino)
      && !@move_uploaded_file($f['tmp_name'], $destino)) {
    return ['error' => 'No he podido guardar la foto.'];
  }
  @chmod($destino, 0644);
  /* Las variantes, aquí mismo: es una sola foto y el que acaba de subirla está esperando. Si
     GD no puede con ellas no se aborta nada — la foto ya está guardada y la carta sabe servir
     el original. */
  hero_generar_variantes($nombre);
  return ['ok' => $nombre];
}

/** Reescala a 1600 px de ancho como mucho y reencoda en su mismo formato. */
function hero_recomprimir(string $tmp, array $info, string $destino): bool {
  if (!function_exists('imagecreatetruecolor')) return false;
  $tipo = $info[2];
  $img = false;
  if ($tipo === IMAGETYPE_JPEG && function_exists('imagecreatefromjpeg')) $img = @imagecreatefromjpeg($tmp);
  if ($tipo === IMAGETYPE_PNG  && function_exists('imagecreatefrompng'))  $img = @imagecreatefrompng($tmp);
  if ($tipo === IMAGETYPE_WEBP && function_exists('imagecreatefromwebp')) $img = @imagecreatefromwebp($tmp);
  if ($img === false) return false;
  if ($info[0] > 1600) {
    $red = @imagescale($img, 1600);
    if ($red !== false) { imagedestroy($img); $img = $red; }
  }
  $ok = false;
  if ($tipo === IMAGETYPE_JPEG) $ok = @imagejpeg($img, $destino, 80);
  if ($tipo === IMAGETYPE_PNG) {
    imagesavealpha($img, true);
    $ok = @imagepng($img, $destino, 6);
  }
  if ($tipo === IMAGETYPE_WEBP && function_exists('imagewebp')) $ok = @imagewebp($img, $destino, 78);
  imagedestroy($img);
  if (!$ok) { @unlink($destino); return false; }
  return true;
}

/* ---------------------------------------------------------------- variantes de portada
 * Cada foto se guarda además en varios anchos y en WebP. El original no se toca: sigue siendo
 * el que se sirve a quien no entienda WebP, y el que se borra manda sobre todo lo demás.
 *
 * El nombre de cada variante es el del original sin extensión, un guion y el ancho:
 *   a1b2c3d4e5f6a7b8.jpg  ->  a1b2c3d4e5f6a7b8-800.webp
 * Así se sabe qué variantes tiene una foto sin apuntarlo en ningún sitio, y borrarlas es
 * mirar la carpeta.
 *
 * Si el hosting no trae GD con WebP, aquí no se genera nada y no pasa nada: la carta lo ve en
 * `heroWebp` del estado y sirve el original, que es lo que hacía antes de todo esto.
 */
function hero_base(string $nombre): string {
  return preg_replace('/\.[^.]+$/', '', $nombre);
}

/** Los anchos de los que ya existe variante en disco, para una foto. */
function hero_variantes_en_disco(string $nombre): array {
  $base = hero_base($nombre);
  $out = [];
  foreach (HERO_ANCHOS as $w) {
    if (is_file(HERO_DIR . '/' . $base . '-' . $w . '.webp')) $out[] = $w;
  }
  return $out;
}

/** Los anchos que TOCA tener: los de la escalera que no superen el original. */
function hero_anchos_previstos(string $nombre): array {
  $info = @getimagesize(HERO_DIR . '/' . $nombre);
  if ($info === false) return [];
  $ancho = (int) $info[0];
  $out = [];
  foreach (HERO_ANCHOS as $w) {
    if ($w <= $ancho) $out[] = $w;
  }
  /* Una foto de 900 px se queda con 480, 640 y 800. Ampliarla a 1200 sería inventar píxeles y
     pesar más por una imagen que no mejora. */
  return $out;
}

/** Genera las variantes que falten de UNA foto. Devuelve true si al acabar están todas. */
function hero_generar_variantes(string $nombre): bool {
  if (!function_exists('imagewebp') || !function_exists('imagecreatetruecolor')) return false;
  $origen = HERO_DIR . '/' . $nombre;
  if (!is_file($origen)) return false;
  $previstos = hero_anchos_previstos($nombre);
  if (!$previstos) return false;
  $faltan = array_diff($previstos, hero_variantes_en_disco($nombre));
  if (!$faltan) return true;

  $info = @getimagesize($origen);
  $img = false;
  if ($info[2] === IMAGETYPE_JPEG && function_exists('imagecreatefromjpeg')) $img = @imagecreatefromjpeg($origen);
  if ($info[2] === IMAGETYPE_PNG  && function_exists('imagecreatefrompng'))  $img = @imagecreatefrompng($origen);
  if ($info[2] === IMAGETYPE_WEBP && function_exists('imagecreatefromwebp')) $img = @imagecreatefromwebp($origen);
  if ($img === false) return false;

  $base = hero_base($nombre);
  foreach ($faltan as $w) {
    $chico = @imagescale($img, $w);
    if ($chico === false) continue;
    $destino = HERO_DIR . '/' . $base . '-' . $w . '.webp';
    /* Al fichero temporal primero: si el proceso se corta a media escritura, la carta no llega
       a ver nunca media imagen con el nombre bueno. */
    $tmp = $destino . '.tmp';
    if (@imagewebp($chico, $tmp, HERO_WEBP_CALIDAD)) {
      @rename($tmp, $destino);
      @chmod($destino, 0644);
    } else {
      @unlink($tmp);
    }
    imagedestroy($chico);
  }
  imagedestroy($img);
  return !array_diff($previstos, hero_variantes_en_disco($nombre));
}

/* Las fotos que ya estaban subidas antes de que existieran las variantes también las tienen
   que tener. Se van haciendo por visita al panel, y el que manda es el RELOJ, no un número
   fijo de fotos: cada foto son seis decodificaciones y seis codificaciones de GD, y lo que hay
   que evitar es pasarse del tiempo máximo de una petición en un hosting compartido, que suele
   estar en treinta segundos.
   Con ocho segundos de presupuesto caben varias fotos en un servidor normal y sólo una en uno
   lento, que es exactamente lo que se quiere: el rápido termina en una visita y el lento no se
   queda a medias. Mientras falten, la carta sirve el original y se ve igual. */
function hero_completar_pendientes(array $hero, float $presupuesto = 8.0): int {
  $arranque = microtime(true);
  $hechas = 0;
  foreach ($hero as $nombre) {
    if (!is_string($nombre)) continue;
    $previstos = hero_anchos_previstos($nombre);
    if (!$previstos || !array_diff($previstos, hero_variantes_en_disco($nombre))) continue;
    hero_generar_variantes($nombre);
    $hechas++;
    /* Se mira el reloj DESPUÉS de cada foto y no antes: así nunca se empieza una que no va a
       caber, pero tampoco se deja de hacer la primera por ir justos. */
    if (microtime(true) - $arranque > $presupuesto) break;
  }
  return $hechas;
}

/** Las fotos que tienen la escalera completa. Es lo que la carta necesita saber. */
/* Devuelve, por cada foto, QUÉ ANCHOS tiene de verdad en disco. No una lista de nombres: un
   mapa nombre → anchos.
 *
 * La diferencia no es cosmética, y costó un fallo en producción. El panel reduce las subidas a
 * 1600 px COMO MÁXIMO, así que una foto que llegó con 1565 no genera la variante de 1600 —y
 * hace bien, ampliarla sería inventar píxeles—. Pero la carta anunciaba siempre los seis anchos
 * de la escalera, incluido uno que para esa foto no existía. En una pantalla ancha el navegador
 * pedía el de 1600, recibía un 404, y la diapositiva desaparecía sin decir nada. En móvil no se
 * veía, porque ahí nunca se pide el escalón grande.
 *
 * Con el mapa, la carta anuncia exactamente lo que hay.
 */
function hero_con_variantes(array $hero): array {
  $out = [];
  foreach ($hero as $nombre) {
    if (!is_string($nombre)) continue;
    $previstos = hero_anchos_previstos($nombre);
    if ($previstos && !array_diff($previstos, hero_variantes_en_disco($nombre))) {
      $out[$nombre] = array_values($previstos);
    }
  }
  return $out;
}

/* Un nombre de archivo que llega por POST no se usa nunca tal cual para borrar: se comprueba
   que sea uno de los que hay en el estado. Sin esto, un ../../ borra lo que quiera. */
function hero_borrar(string $nombre, array $hero): bool {
  if (!in_array($nombre, $hero, true)) return false;
  @unlink(HERO_DIR . '/' . $nombre);
  /* Y sus variantes: si se quedaran, la carpeta acumularía cinco WebP huérfanos por cada foto
     que el restaurante cambie de idea. */
  $base = hero_base($nombre);
  foreach (HERO_ANCHOS as $w) @unlink(HERO_DIR . '/' . $base . '-' . $w . '.webp');
  return true;
}

/* ---------------------------------------------------------------- fotos de plato
 * La foto llega ya recortada y comprimida por el navegador: 1000x1000 WebP por debajo de medio
 * mega. Aquí no se reescala nada —GD puede no estar, y no hace falta— pero tampoco se cree uno
 * lo que llega: se comprueba el peso, el tipo REAL con finfo y las dimensiones. Un .php
 * renombrado a .webp no pasa de la segunda comprobación.
 *
 * La carpeta lleva el mismo guardián que la del hero, y por el mismo motivo: es la única
 * carpeta del sitio donde escribe un desconocido a través del panel. */
function fotos_carpeta_lista(): bool {
  if (!is_dir(FOTOS_DIR) && !@mkdir(FOTOS_DIR, 0755, true)) return false;
  $guardia = FOTOS_DIR . '/.htaccess';
  if (!is_file($guardia)) {
    /* Todo dentro de <IfModule>, como en hero: php_flag suelto tumba la carpeta entera en un
       servidor con PHP-FPM, y un guardián que tira el sitio no es un guardián. */
    @file_put_contents($guardia, implode(PHP_EOL, [
      '# Aqui solo hay fotos de plato subidas desde el panel. Nada se ejecuta.',
      '<IfModule mod_php.c>',
      '  php_flag engine off',
      '</IfModule>',
      '<IfModule mod_php7.c>',
      '  php_flag engine off',
      '</IfModule>',
      '<IfModule mod_mime.c>',
      '  RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps',
      '  AddType text/plain .php .phtml .php3 .php4 .php5 .php7 .phps',
      '</IfModule>',
      '<IfModule mod_headers.c>',
      '  Header set X-Content-Type-Options "nosniff"',
      '</IfModule>',
    ]) . PHP_EOL);
  }
  return carpeta_escribible(FOTOS_DIR);
}

/* El nombre lleva el plato delante para poder mirar la carpeta por FTP y saber qué es cada
   cosa, y ocho al azar detrás para que cambiar la foto cambie la dirección: sin eso, el
   navegador del comensal seguiría enseñando la anterior durante horas. */
function fotos_nombre(string $key): string {
  $slug = strtolower($key);
  $slug = strtr($slug, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n']);
  $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
  $slug = trim((string) $slug, '-');
  if ($slug === '') $slug = 'plato';
  if (strlen($slug) > 40) $slug = rtrim(substr($slug, 0, 40), '-');
  return $slug . '-' . bin2hex(random_bytes(4)) . '.webp';
}

/** Devuelve ['ok' => nombre] o ['error' => mensaje]. No toca el estado: eso lo hace quien llama. */
function fotos_guardar(array $f) {
  if (!isset($f['error']) || $f['error'] !== UPLOAD_ERR_OK) {
    return ['error' => 'No ha llegado la foto. Inténtalo otra vez.'];
  }
  if (!is_uploaded_file($f['tmp_name'])) return ['error' => 'Archivo no válido.'];
  if ($f['size'] > FOTOS_MAX_BYTES) {
    return ['error' => 'La foto pesa más de ' . round(FOTOS_MAX_BYTES / 1024) . ' KB.'];
  }
  /* El tipo REAL, no el que dice el navegador ni la extensión. */
  $mime = function_exists('finfo_open')
    ? (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name'])
    : null;
  $info = @getimagesize($f['tmp_name']);
  $tipoOk = ($mime === 'image/webp') || ($mime === null && $info && $info[2] === IMAGETYPE_WEBP);
  if (!$tipoOk) return ['error' => 'Formato no permitido: la foto tiene que llegar en WebP.'];
  if (!$info || $info[0] !== FOTOS_DIM || $info[1] !== FOTOS_DIM) {
    return ['error' => 'La foto tiene que medir ' . FOTOS_DIM . 'x' . FOTOS_DIM . '.'];
  }
  return ['ok' => true];
}

/* Igual que en el hero: un nombre que llega por POST no se pega nunca a una ruta. Sólo se borra
   lo que esté escrito en el estado. */
function fotos_borrar(string $nombre, array $fotos): bool {
  if ($nombre === '' || !in_array($nombre, $fotos, true)) return false;
  @unlink(FOTOS_DIR . '/' . $nombre);
  return true;
}

function leer_estado(): array {
  $raw = @file_get_contents(ESTADO_PATH);
  $e = $raw === false ? [] : (json_decode($raw, true) ?: []);
  $hay = is_array($e) && $e !== [];
  $r = array_replace(estado_vacio(), $hay ? $e : []);
  /* La plantilla trae esquema 2, pero un fichero real ANTERIOR al campo es esquema 1: sin
     esta linea, el array_replace le regalaba el 2 de la plantilla a un estado sin migrar y
     la migracion explicita nunca se ofrecia. Sin fichero, es una instalacion nueva: 2. */
  $r['esquema'] = $hay ? (int) ($e['esquema'] ?? 1) : 2;
  return $r;
}

/* ---------------------------------------------------------------- identificadores permanentes
 *
 * Un estado.json anterior a los dishId indexa por "categoria :: nombre". La politica, decidida
 * y sin excepciones:
 *
 *   - NADA se migra en silencio. El fichero conserva su esquema hasta que una persona pasa por
 *     la migracion explicita del panel: copia, vista previa, confirmacion y verificacion.
 *   - Una COLISION —la clave vieja y su dishId conviven con valores DISTINTOS— bloquea la
 *     migracion Y los guardados: no se escribe nada hasta revisarla a mano. Con valores
 *     identicos no hay colision: se consolida.
 *   - Una clave que no es ni dishId ni clave vieja NO se pierde nunca: viaja intacta y se
 *     ensena como desconocida.
 *   - `hidden` es un campo HEREDADO sin consumidor (el escaparate antiguo): ni bloquea, ni se
 *     borra. Su limpieza sera otra decision explicita.
 *
 * Tres funciones y ninguna escribe en disco:
 *   estado_analizar   que pasaria al migrar: renombres, consolidaciones, desconocidas,
 *                     colisiones, heredados, y la prevision (solo si no hay colisiones).
 *   estado_vista      la vista en memoria con la que trabaja el panel: claves dishId primero.
 *   estado_claves_al_guardar
 *                     al escribir: si el fichero sigue en esquema 1, TODO vuelve a claves
 *                     viejas (el fichero no cambia de epoca por un guardado normal); si ya es
 *                     esquema 2, cada entrada dishId lleva al lado su ALIAS con la clave vieja
 *                     y las ofertas llevan id y nombre, para que una carta cacheada de antes
 *                     de la migracion siga viendo agotados, precios, etiquetas, fotos y
 *                     ofertas. Los alias caducan con la compatibilidad, nunca solos. */
function estado_analizar(array $estado, array $porKey, array $mapaLegacy, array $catIdDe): array {
  $r = ['esquema' => (int) ($estado['esquema'] ?? 1), 'renombres' => 0, 'consolidadas' => 0,
        'desconocidas' => [], 'colisiones' => [], 'heredados' => [], 'prevision' => null];
  $prev = $estado;
  foreach (['soldOut', 'prices', 'tags', 'fotos'] as $campo) {
    if (!is_array($estado[$campo] ?? null)) continue;
    $nuevo = [];
    foreach ($estado[$campo] as $k => $v) {
      $k = (string) $k;
      if (isset($porKey[$k])) { $nuevo[$k] = $v; continue; }
      if (isset($mapaLegacy[$k])) {
        $id = $mapaLegacy[$k];
        if (array_key_exists($id, $estado[$campo]) && $estado[$campo][$id] !== $v) {
          $r['colisiones'][] = $campo . ': ' . $k . ' vale ' . json_encode($v, JSON_UNESCAPED_UNICODE)
            . ' pero su dishId ' . $id . ' vale ' . json_encode($estado[$campo][$id], JSON_UNESCAPED_UNICODE);
          $nuevo[$k] = $v;   // en la prevision no valdra, pero aqui no se pierde nada
          continue;
        }
        if (array_key_exists($id, $estado[$campo])) $r['consolidadas']++; else $r['renombres']++;
        $nuevo[$id] = $v;
        continue;
      }
      $r['desconocidas'][] = $campo . ': ' . $k;
      $nuevo[$k] = $v;
    }
    $prev[$campo] = $nuevo;
  }
  if (is_array($estado['offer']['keys'] ?? null)) {
    $keys = [];
    foreach ($estado['offer']['keys'] as $k) {
      $k = (string) $k;
      if (isset($porKey[$k])) $keys[$k] = true;
      elseif (isset($mapaLegacy[$k])) { $keys[$mapaLegacy[$k]] = true; $r['renombres']++; }
      else { $keys[$k] = true; $r['desconocidas'][] = 'offer.keys: ' . $k; }
    }
    $prev['offer']['keys'] = array_keys($keys);
  }
  if (is_array($estado['offer']['cats'] ?? null)) {
    $idsValidos = array_flip($catIdDe);
    $cats = [];
    foreach ($estado['offer']['cats'] as $c) {
      $c = (string) $c;
      if (isset($idsValidos[$c])) $cats[$c] = true;
      elseif (isset($catIdDe[$c])) { $cats[$catIdDe[$c]] = true; $r['renombres']++; }
      else { $cats[$c] = true; $r['desconocidas'][] = 'offer.cats: ' . $c; }
    }
    $prev['offer']['cats'] = array_keys($cats);
  }
  if (!empty($estado['hidden']) && array_filter((array) $estado['hidden'])) {
    $r['heredados'][] = 'hidden: campo del escaparate antiguo, sin consumidor en el codigo actual; viaja intacto';
  }
  $prev['esquema'] = 2;
  $r['prevision'] = $r['colisiones'] ? null : $prev;
  return $r;
}

function estado_vista(array $estado, array $porKey, array $mapaLegacy, array $catIdDe): array {
  $an = estado_analizar($estado, $porKey, $mapaLegacy, $catIdDe);
  if ($an['prevision'] !== null) {
    $v = $an['prevision'];
    $v['esquema'] = (int) ($estado['esquema'] ?? 1);   // la vista NO cambia la epoca del fichero
    return $v;
  }
  /* Con colisiones, los guardados estan bloqueados: la vista prefiere el dishId solo para
     ENSENAR algo coherente, y el fichero queda intacto. */
  foreach (['soldOut', 'prices', 'tags', 'fotos'] as $campo) {
    if (!is_array($estado[$campo] ?? null)) continue;
    $nuevo = [];
    foreach ($estado[$campo] as $k => $v) {
      $k = (string) $k;
      $id = isset($porKey[$k]) ? $k : ($mapaLegacy[$k] ?? $k);
      if (!array_key_exists($id, $nuevo)) $nuevo[$id] = $v;
    }
    $estado[$campo] = $nuevo;
  }
  return $estado;
}

function estado_claves_al_guardar(array $estado, array $porKey, array $mapaLegacy, array $catIdDe): array {
  $v2 = ((int) ($estado['esquema'] ?? 1)) >= 2;
  $legacyDe = [];
  foreach ($mapaLegacy as $vieja => $id) $legacyDe[$id] = $vieja;
  $nombreDe = array_flip($catIdDe);
  foreach (['soldOut', 'prices', 'tags', 'fotos'] as $campo) {
    if (!is_array($estado[$campo] ?? null)) continue;
    $out = [];
    foreach ($estado[$campo] as $k => $v) {
      $k = (string) $k;
      if ($v2) {
        $out[$k] = $v;
        if (isset($legacyDe[$k]) && !array_key_exists($legacyDe[$k], $estado[$campo])) $out[$legacyDe[$k]] = $v;
      } else {
        $out[$legacyDe[$k] ?? $k] = $v;
      }
    }
    $estado[$campo] = $out;
  }
  if (is_array($estado['offer']['keys'] ?? null)) {
    $out = [];
    foreach ($estado['offer']['keys'] as $k) {
      $k = (string) $k;
      if ($v2) { $out[$k] = true; if (isset($legacyDe[$k])) $out[$legacyDe[$k]] = true; }
      else $out[$legacyDe[$k] ?? $k] = true;
    }
    $estado['offer']['keys'] = array_keys($out);
  }
  if (is_array($estado['offer']['cats'] ?? null)) {
    $out = [];
    foreach ($estado['offer']['cats'] as $c) {
      $c = (string) $c;
      if ($v2) { $out[$c] = true; if (isset($nombreDe[$c])) $out[$nombreDe[$c]] = true; }
      else $out[$nombreDe[$c] ?? $c] = true;
    }
    $estado['offer']['cats'] = array_keys($out);
  }
  if (!$v2) unset($estado['esquema']);   // el fichero sigue siendo de su epoca, sin marcas nuevas
  return $estado;
}

/* Escritura atómica: a un temporal y luego rename. Si el proceso se corta a medias queda el
   archivo anterior entero, y no un JSON truncado que la carta no sabría leer.
   El temporal lleva nombre único por escritura: con un nombre fijo, dos guardados a la vez
   (dos pestañas, la tablet de cocina y el móvil) se pisaban el .tmp entre el write y el
   rename y podía publicarse un archivo a medias. */
function guardar_estado(array $estado): bool {
  /* Con una colision viva (la clave vieja y su dishId con valores distintos) NO se escribe
     NADA: cualquier guardado consolidaria un valor y perderia el otro en silencio. El aviso
     rojo del panel dice cuales son; se resuelven a mano y esto vuelve a abrir. */
  global $migraColisiones, $porKey, $mapaLegacy, $catIdDe;
  if (!empty($migraColisiones)) return false;
  $estado = estado_claves_al_guardar($estado, $porKey ?? [], $mapaLegacy ?? [], $catIdDe ?? []);
  /* Antes de tocar el disco, la foto de como estaba. Ver copia_de_seguridad(). */
  copia_de_seguridad($estado);
  $estado['actualizado'] = gmdate('c');
  /* Los canjes de premios se fueron con los premios, pero un estado.json viejo puede seguir
     trayendo la lista dentro: se retira para no publicarla. De review sólo queda el enlace;
     los campos muertos de versiones anteriores se caen aquí al guardar. */
  unset($estado['redeemed']);
  if (is_array($estado['review'] ?? null)) {
    $estado['review'] = array_intersect_key($estado['review'], ['url' => 1]);
  }
  /* Qué fotos de portada tienen su escalera de anchos en WebP. No es una preferencia que se
     configure: es el estado del disco, y por eso se recalcula en cada guardado en vez de
     apuntarse. La carta sólo pide variantes de las fotos que salen aquí; de las demás pide el
     original. Así nunca pide un fichero que no existe, ni en el rato que va desde que se sube
     una foto hasta que se le generan las variantes, ni en un hosting sin WebP. */
  $estado['heroWebp'] = hero_con_variantes(is_array($estado['hero'] ?? null) ? $estado['hero'] : []);
  $json = json_encode($estado, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
  if ($json === false) return false;
  $tmp = ESTADO_PATH . '.' . bin2hex(random_bytes(6)) . '.tmp';
  if (@file_put_contents($tmp, $json, LOCK_EX) === false) return false;
  if (!@rename($tmp, ESTADO_PATH)) { @unlink($tmp); return false; }
  return true;
}

/* ---------------------------------------------------------------- copias de seguridad
 * El panel reconstruye `soldOut` y `prices` enteros en cada guardado y descarta lo que no
 * valide. Un guardado a destiempo -- o el boton que devuelve los precios a los de la carta --
 * se llevaba por delante el trabajo de semanas sin preguntar y sin vuelta atras.
 *
 * Dos copias, y cada una contesta a una pregunta distinta:
 *
 *   anterior.json          Como estaba justo antes del ultimo guardado. Deshace el error de
 *                          hace un minuto, que es el que de verdad pasa.
 *   <fecha-servicio>.json  Como estaba al empezar ese servicio. Se escribe una sola vez al
 *                          dia, en el primer guardado, y se conservan los ultimos COPIAS_DIAS.
 *
 * Viven en admin/copias/ y no en la raiz: estado.json es publico porque lo lee la carta, pero
 * su historial no tiene por que serlo -- diria a que hora se agota cada plato y cada cuanto se
 * cambian los precios. El .htaccess de admin/ ya deniega todo .json; la carpeta lleva ademas
 * el suyo, por si algun dia se mueve de sitio y se queda sin el de arriba.
 */
function escribir_atomico(string $destino, string $contenido): bool {
  $tmp = $destino . '.' . bin2hex(random_bytes(6)) . '.tmp';
  if (@file_put_contents($tmp, $contenido, LOCK_EX) === false) return false;
  if (!@rename($tmp, $destino)) { @unlink($tmp); return false; }
  return true;
}

function copias_dir(): ?string {
  if (!is_dir(COPIAS_DIR) && !@mkdir(COPIAS_DIR, 0755, true) && !is_dir(COPIAS_DIR)) return null;
  $guardia = COPIAS_DIR . '/.htaccess';
  if (!is_file($guardia)) {
    @file_put_contents($guardia, 'Require all denied' . PHP_EOL . 'Options -Indexes' . PHP_EOL);
  }
  return COPIAS_DIR;
}

/* Solo los nombres que escribe copia_de_seguridad(). Cualquier otra cosa que aparezca en la
   carpeta -- un .tmp de una escritura cortada, algo subido a mano por FTP -- no se lista, no se
   descarga y no se restaura. Es lo que permite que el nombre que llega del formulario no
   necesite mas comprobacion que estar en esta lista: nunca se concatena lo que manda el
   navegador con una ruta. */
function copias_listar(): array {
  if (!is_dir(COPIAS_DIR)) return [];
  $out = [];
  foreach ((array) @scandir(COPIAS_DIR) as $f) {
    $f = (string) $f;
    /* El nombre de ahora lleva hora: 2026-08-26-0223.json. Se siguen reconociendo los dos de
       antes —anterior.json y el de solo fecha— para poder listarlos y borrarlos desde aqui;
       lo que no se reconoce no se lista, no se descarga y no se restaura. */
    if (!preg_match('/^(anterior|[0-9]{4}-[0-9]{2}-[0-9]{2}(-[0-9]{4})?)\.json$/', $f)) continue;
    $ruta = COPIAS_DIR . '/' . $f;
    $out[] = ['nombre' => $f, 'bytes' => (int) @filesize($ruta), 'ts' => (int) @filemtime($ruta)];
  }
  /* De la mas nueva a la mas vieja. El nombre empieza por la fecha, asi que ordenar por texto
     ya es ordenar por tiempo. anterior.json, si queda alguno viejo, se va al final: no se sabe
     de cuando es. */
  usort($out, function (array $a, array $b): int {
    $va = $a['nombre'] === 'anterior.json';
    $vb = $b['nombre'] === 'anterior.json';
    if ($va !== $vb) return $va ? 1 : -1;
    return strcmp($b['nombre'], $a['nombre']);
  });
  return $out;
}

/* Se queda con las COPIAS_MAX primeras de la lista, que ya viene de la mas nueva a la mas
   vieja, y borra el resto. Barre tambien los nombres viejos —anterior.json y los de solo
   fecha— porque van al final del orden y caen los primeros. */
function copias_purgar(): void {
  foreach (array_slice(copias_listar(), COPIAS_MAX) as $viejo) {
    @unlink(COPIAS_DIR . '/' . $viejo['nombre']);
  }
}

/* Vaciarlas todas. Lo pide el panel con su boton: las copias de antes de la regla de precios
   son fotos de cualquier guardado y no sirven para lo unico que ahora se quiere revertir. */
function copias_vaciar(): int {
  $n = 0;
  foreach (copias_listar() as $c) {
    if (@unlink(COPIAS_DIR . '/' . $c['nombre'])) $n++;
  }
  return $n;
}

/* Se llama ANTES de escribir, con el estado que todavia esta en disco. Si falla no dice nada y
   el guardado sigue: no poder copiar es malo, pero impedir que el restaurante marque un plato
   agotado en plena cena es peor. */
function copia_de_seguridad(array $nuevo): void {
  $raw = @file_get_contents(ESTADO_PATH);
  if ($raw === false || $raw === '') return;      // primer guardado: no hay nada que copiar

  /* SOLO cuando cambian los PRECIOS. Es lo unico que alguien querria revertir: subir un 5% a
     toda la carta y arrepentirse toca cientos de platos y no se deshace a mano. Un agotado o
     un destacado se deshacen desmarcando la casilla, y guardar una copia por cada uno llenaba
     la carpeta de fotos identicas que solo estorban para encontrar la que importa. */
  $viejo = json_decode($raw, true);
  $antes = (is_array($viejo) && is_array($viejo['prices'] ?? null)) ? $viejo['prices'] : [];
  $ahora = is_array($nuevo['prices'] ?? null) ? $nuevo['prices'] : [];
  /* == y no ===: compara pares clave-valor sin mirar el orden, que es lo que hace falta.
     Con === bastaria con que el formulario devolviera las claves en otro orden para que
     pareciera un cambio de precios y se copiara sin motivo. */
  if ($antes == $ahora) return;

  if (copias_dir() === null) return;

  /* Una por cambio, con la hora de Canarias en el nombre. Antes era una por dia de servicio y
     el segundo cambio de precios del mismo dia no dejaba rastro. Dos cambios en el mismo
     minuto se pisan, y esta bien: es el mismo arrepentimiento.

     La fecha va en el nombre y no se saca de filemtime porque el fichero se puede mover o
     restaurar y la fecha del sistema deja de decir cuando se hizo el cambio. */
  $sello = (new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('Y-m-d-Hi');
  escribir_atomico(COPIAS_DIR . '/' . $sello . '.json', $raw);
  copias_purgar();
}


function h(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

/* mb_strtolower() depende de la extension mbstring. No siempre esta activada (mismo motivo
   por el que las funciones GD de mas abajo se comprueban con function_exists() antes de
   usarlas): sin la guarda, un unico plato pintado con acentos tira el panel entero abajo con
   un error fatal, en vez de tirar solo el minusculado correcto de acentos y enye. */
function minuscula(string $s): string {
  return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

/* Caracteres reales, no bytes: strlen() de un nombre con "ñ" o una tilde cuenta de más, y un
   límite pensado en caracteres se disparaba antes de tiempo (o, al reves, dejaba pasar menos
   de los que promete). Misma guarda que minuscula() de arriba: mb_strlen() si mbstring esta
   activa: si no, puntos de codigo Unicode contados con una expresion regular /u, que no
   depende de la extension. */
function caracteres(string $s): int {
  if (function_exists('mb_strlen')) return mb_strlen($s, 'UTF-8');
  $n = preg_match_all('/./us', $s);
  return $n === false ? strlen($s) : $n;
}

/* Los precios de un restaurante acaban en cifras redondas. Un +5% sobre 4,50 da 4,725, y
   4,73 en una carta canta. Se redondea al múltiplo de 0,05 más cercano, que deja 4,75. */
function redondear(float $n): string {
  return number_format(round($n * 20) / 20, 2, '.', '');
}

function minutos(string $hhmm, int $porDefecto): int {
  if (!preg_match('/^(\d{1,2}):(\d{2})$/', $hhmm, $m)) return $porDefecto;
  $v = ((int) $m[1]) * 60 + (int) $m[2];
  return ($v >= 0 && $v <= 1440) ? $v : $porDefecto;
}

function hhmm(int $min): string {
  return sprintf('%02d:%02d', intdiv($min, 60), $min % 60);
}

/* Vocabulario cerrado: el panel elige entre estas, no escribe texto libre. Cada una está
   traducida en la carta; una etiqueta inventada aquí saldría en inglés en los tres idiomas.
   Las claves y SU traducción al español las escribe gen.mjs en cliente.php
   (ETIQUETAS_DESTACADO / ETIQUETAS_DESTACADO_ES), resueltas con la MISMA función que traduce
   la carta pública -- nunca una copia aparte. Antes vivían hardcodeadas aquí SEGUNDA VEZ, y
   las dos listas se desincronizaron con el tiempo: el panel llegó a ofrecer "De la casa"
   para una etiqueta que la carta ya mostraba como "Plato insignia". El respaldo de abajo es
   sólo para un build a medias sin cliente.php -- igual que CLIENTE_NOMBRE unas líneas más
   arriba -- nunca la fuente normal. */
/* define() y no const: el valor depende de si cliente.php llegó a definir su constante, y
   const exige una expresión constante en tiempo de compilación -- define() no. Sigue siendo
   una constante de verdad, visible dentro de cualquier función sin `global`, igual que antes. */
define('ETIQUETAS', defined('ETIQUETAS_DESTACADO') ? ETIQUETAS_DESTACADO
  : ['Bestseller', 'Most loved', 'Signature', 'Popular', 'Must try', 'Veggie favourite']);
define('ETIQUETAS_ES', defined('ETIQUETAS_DESTACADO_ES') ? ETIQUETAS_DESTACADO_ES : [
  'Bestseller' => 'Bestseller', 'Most loved' => 'Most loved', 'Signature' => 'Signature',
  'Popular' => 'Popular', 'Must try' => 'Must try', 'Veggie favourite' => 'Veggie favourite',
]);
const MESES = [1 => 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = [1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes', 6 => 'Sábado', 7 => 'Domingo'];

/* PHP escribe los días en inglés salvo que el servidor tenga intl y el locale bien puesto, y
   en un hosting compartido eso no se puede dar por hecho. Se traduce aquí y se acabó. */
function dia_semana(string $fecha): string {
  $n = (int) date('N', strtotime($fecha));   // 1 = lunes
  return DIAS[$n] ?? '';
}

/* ---------------------------------------------------------------- el récord del juego
 * La puntuación más alta que se ha hecho aquí. La escribe record.php cuando alguien la supera
 * y este panel sólo la lee y la pone a cero. Vive en la raíz y no en admin/ porque el juego,
 * que es público, tiene que poder leerla — y el .htaccess de aquí deniega todo .json. */
/* Los tres mejores. Se lee el fichero PRIVADO, que es el que manda y el que lleva el
   identificador de cada marca; el publico de la raiz es una copia sin el. */
function record_leer(): array {
  $raw = @file_get_contents(MARCADOR_PATH);
  $r = $raw === false ? null : json_decode($raw, true);
  /* Sin privado se mira el publico: es lo que pasa la primera vez despues de actualizar. */
  if (!is_array($r)) {
    $raw = @file_get_contents(RECORD_PATH);
    $r = $raw === false ? null : json_decode($raw, true);
  }
  if (!is_array($r)) return [];
  if (isset($r['puntos'])) {                       // el formato viejo, de un solo record
    return [['id' => '', 'puntos' => (int) $r['puntos'], 'nombre' => '', 'pais' => '',
             'fecha' => (string) ($r['fecha'] ?? '')]];
  }
  $top = [];
  foreach ((array) ($r['top'] ?? []) as $x) {
    if (!is_array($x) || (int) ($x['puntos'] ?? 0) < 1) continue;
    $top[] = [
      'id'     => (string) ($x['id'] ?? ''),
      'puntos' => (int) $x['puntos'],
      'nombre' => (string) ($x['nombre'] ?? ''),
      'pais'   => (string) ($x['pais'] ?? ''),
      'fecha'  => (string) ($x['fecha'] ?? ''),
    ];
  }
  return $top;
}

/* Escribe los dos, el privado y su copia publica sin identificadores. Misma regla que
   record.php: primero el que manda. */
function record_guardar(array $top): bool {
  $uno = static fn(string $ruta, array $datos) => escribir_atomico(
    $ruta, (string) json_encode($datos, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  if (!$uno(MARCADOR_PATH, ['top' => array_values($top)])) return false;
  $uno(RECORD_PATH, ['top' => array_values(array_map(
    static fn(array $x) => ['puntos' => $x['puntos'], 'nombre' => $x['nombre'],
                            'pais' => $x['pais'], 'fecha' => $x['fecha']], $top))]);
  return true;
}

/* Poner a cero es BORRAR el fichero, no escribir un cero: un record.json con puntos:0 y una
   fecha diría que alguien hizo cero puntos ese día. Sin fichero, la casa no tiene récord. */
function record_a_cero(): bool {
  $a = !is_file(MARCADOR_PATH) || @unlink(MARCADOR_PATH);
  $b = !is_file(RECORD_PATH) || @unlink(RECORD_PATH);
  return $a && $b;
}

function guardar_clave(string $hash): bool {
  $f   = __DIR__ . '/clave.php';
  $tmp = $f . '.' . bin2hex(random_bytes(6)) . '.tmp';
  $php = "<?php" . PHP_EOL
       . "// Generado por el panel. No lo edites a mano y no lo subas por FTP encima:" . PHP_EOL
       . "// aquí vive la contraseña, y sobrescribirlo deja al restaurante fuera." . PHP_EOL
       . "define('ADMIN_HASH', '" . addslashes($hash) . "');" . PHP_EOL;
  if (@file_put_contents($tmp, $php, LOCK_EX) === false) return false;
  @chmod($tmp, 0644);
  if (!@rename($tmp, $f)) { @unlink($tmp); return false; }
  // Sin esto el servidor puede seguir sirviendo la versión vieja desde la caché de opcodes.
  if (function_exists('opcache_invalidate')) @opcache_invalidate($f, true);
  clearstatcache(true, $f);   // la fecha del archivo es la referencia de sesión: fresca
  return true;
}

/* Fase 7 — activación del panel, marca de un solo uso de verdad. `ADMIN_HASH !== ''` no
   basta: es un efecto de guardar_clave(), reversible si clave.php se borrara algún día.
   Esta marca es independiente y no se borra sola — index.php la comprueba ANTES de mirar
   el token, así que en cuanto existe, la pantalla de activación por token deja de estar
   disponible para siempre, pase lo que pase con clave.php o con el Secret. */
function marcar_activacion_consumida(): bool {
  $f   = ACTIVACION_CONSUMIDA_PATH;
  $tmp = $f . '.' . bin2hex(random_bytes(6)) . '.tmp';
  $php = 'activado: ' . date('c') . PHP_EOL;
  if (@file_put_contents($tmp, $php, LOCK_EX) === false) return false;
  @chmod($tmp, 0644);
  if (!@rename($tmp, $f)) { @unlink($tmp); return false; }
  clearstatcache(true, $f);
  return true;
}

/* Fase 7 — cierre inmediato en ESTE servidor, sin esperar a un despliegue futuro. En el
   mismo instante en que un token se usa con éxito, admin/activacion.php se reescribe con
   256 bits de aleatoriedad que no son el hash de ningún token — nadie los generó a partir
   de uno, así que no hay ningún secreto conocido que produzca ese valor, y encontrar uno
   por fuerza bruta es tan inviable como romper SHA-256 al azar (no es que "no exista
   matemáticamente una preimagen": es que no hay ninguna conocida, y buscarla no es
   viable). El fichero en el servidor no se puede dejar vacío ni desaparecer: gen.mjs exige
   PANEL_ACTIVACION_HASH no vacío en todo cliente con activacionPanel=true, así que un
   futuro build sin este fichero simplemente no llegaría a desplegarse — hay que dejarlo
   con ALGÚN valor, y este es el que no sirve para nada.
   Es la segunda capa: la guardia primaria es marcar_activacion_consumida(), de arriba. Y
   --cerrar-activacion (nuevo-cliente.mjs) hace lo mismo en el Secret de GitHub, para que
   el PRÓXIMO build que se despliegue también traiga un hash muerto en vez del real. */
function matar_hash_activacion_local(): bool {
  $f   = __DIR__ . '/activacion.php';
  $tmp = $f . '.' . bin2hex(random_bytes(6)) . '.tmp';
  $muerto = bin2hex(random_bytes(32));
  $php = "<?php" . PHP_EOL
       . "// Activación ya consumida. Este valor no es el hash de ningún token real:" . PHP_EOL
       . "// nadie lo generó a partir de uno, así que ningún token puede volver a activar esto." . PHP_EOL
       . "define('PANEL_ACTIVACION_HASH', '" . $muerto . "');" . PHP_EOL;
  if (@file_put_contents($tmp, $php, LOCK_EX) === false) return false;
  @chmod($tmp, 0644);
  if (!@rename($tmp, $f)) { @unlink($tmp); return false; }
  if (function_exists('opcache_invalidate')) @opcache_invalidate($f, true);
  clearstatcache(true, $f);
  return true;
}

/* La del superadministrador se escribe igual, en su propio archivo. Sólo la toca el propio
   superadministrador (o quien tenga FTP); ninguna acción del rol restaurante llega aquí. */
function guardar_superclave(string $hash): bool {
  $f   = __DIR__ . '/superclave.php';
  $tmp = $f . '.' . bin2hex(random_bytes(6)) . '.tmp';
  $php = "<?php" . PHP_EOL
       . "// Hash del SUPERADMINISTRADOR. Generado con hash.php; no lo edites a mano." . PHP_EOL
       . "define('SUPERADMIN_HASH', '" . addslashes($hash) . "');" . PHP_EOL;
  if (@file_put_contents($tmp, $php, LOCK_EX) === false) return false;
  @chmod($tmp, 0644);
  if (!@rename($tmp, $f)) { @unlink($tmp); return false; }
  if (function_exists('opcache_invalidate')) @opcache_invalidate($f, true);
  clearstatcache(true, $f);
  return true;
}

/* La sesión se liga a la versión de la contraseña con la que se abrió: la fecha de su
 * archivo. Cambiar la contraseña —el gesto de quien sospecha que alguien más la tiene—
 * expulsa así a cualquier sesión ya abierta, y no sólo a las futuras. Con el hash en
 * variable de entorno no hay archivo que mirar y se devuelve un valor fijo. */
function clave_ref(string $rol): int {
  if ($rol === 'super') {
    if ((string) getenv('SUPERADMIN_PASSWORD_HASH') !== '') return -1;
    return (int) @filemtime(__DIR__ . '/superclave.php');
  }
  return (int) @filemtime(__DIR__ . '/clave.php');
}

/* ---------------------------------------------------------------- fuerza bruta
 * Un retardo de 300 ms solo no frena un ataque paciente: tras MAX_FALLOS seguidos desde una
 * IP, esa IP espera BLOQUEO_MINUTOS. El registro es un JSON pequeño que caduca solo y que el
 * .htaccess no sirve. En hosting compartido no hay nada mejor que el sistema de archivos, y
 * para un formulario con una única contraseña sobra. */
function intentos_leer(): array {
  $raw = @file_get_contents(INTENTOS_PATH);
  $d = $raw === false ? [] : (json_decode($raw, true) ?: []);
  $ahora = time();
  // caducan solos: un contador de la semana pasada no debe contar hoy
  foreach ($d as $ip => $r) {
    if (!is_array($r) || ($ahora - (int) ($r['ultimo'] ?? 0)) > BLOQUEO_MINUTOS * 60) unset($d[$ip]);
  }
  return $d;
}

function intentos_guardar(array $d): void {
  $tmp = INTENTOS_PATH . '.' . bin2hex(random_bytes(6)) . '.tmp';
  if (@file_put_contents($tmp, json_encode($d), LOCK_EX) !== false) {
    @rename($tmp, INTENTOS_PATH);
  }
}

function ip_cliente(): string {
  // La IP directa. Las cabeceras X-Forwarded-* las escribe quien quiere: no valen aquí.
  return (string) ($_SERVER['REMOTE_ADDR'] ?? 'desconocida');
}

/** Minutos que le quedan de espera a esta IP, o 0 si puede intentarlo. */
function bloqueo_minutos_restantes(): int {
  $d = intentos_leer();
  $r = $d[ip_cliente()] ?? null;
  if (!is_array($r) || (int) ($r['n'] ?? 0) < MAX_FALLOS) return 0;
  $fin = (int) ($r['ultimo'] ?? 0) + BLOQUEO_MINUTOS * 60;
  return max(1, (int) ceil(($fin - time()) / 60));
}

function apuntar_fallo(): void {
  $d = intentos_leer();
  $ip = ip_cliente();
  $n = (int) (($d[$ip]['n'] ?? 0)) + 1;
  $d[$ip] = ['n' => $n, 'ultimo' => time()];
  intentos_guardar($d);
  if ($n === MAX_FALLOS) registrar_acceso('bloqueo por ' . MAX_FALLOS . ' fallos');
}

function limpiar_fallos(): void {
  $d = intentos_leer();
  unset($d[ip_cliente()]);
  intentos_guardar($d);
}

/* ---------------------------------------------------------------- registro de accesos
 * Una línea por evento: cuándo, desde qué IP, qué pasó. Nunca contraseñas, nunca hashes.
 * Si el archivo pasa de 256 KB rota a .1 y empieza otro: un log que crece sin límite en un
 * hosting compartido acaba siendo el problema que pretendía vigilar. */
function registrar_acceso(string $evento): void {
  if (@filesize(LOG_PATH) > 262144) @rename(LOG_PATH, LOG_PATH . '.1');
  $linea = gmdate('Y-m-d H:i:s') . 'Z | ' . ip_cliente() . ' | '
         . str_replace(["\r", "\n"], ' ', $evento) . PHP_EOL;
  @file_put_contents(LOG_PATH, $linea, FILE_APPEND | LOCK_EX);
}

/* ---------------------------------------------------------------- sesión */
$error = null;
$aviso = null;

if (isset($_GET['salir'])) {
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
  }
  session_destroy();
  header('Location: index.php');
  exit;
}

/* Una sola casilla de contraseña para los dos roles: primero se prueba la del restaurante y
 * después la del superadministrador. No hay usuario que adivinar ni mensaje que distinga un
 * rol del otro, así que tampoco hay nada que enumerar. */
if ((ADMIN_HASH !== '' || SUPERADMIN_HASH !== '') && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['clave'])) {
  // Un pequeño retardo encarece probar contraseñas a lo bruto contra este formulario…
  usleep(300000);
  // …y el contador por IP corta en seco al que insiste.
  $espera = bloqueo_minutos_restantes();
  if ($espera > 0) {
    $error = 'Demasiados intentos seguidos. Espera ' . $espera . ' minuto(s) y vuelve a probar.';
  } else {
    $rol_entrando = null;
    if (ADMIN_HASH !== '' && password_verify((string) $_POST['clave'], ADMIN_HASH)) {
      $rol_entrando = 'cliente';
    } elseif (SUPERADMIN_HASH !== '' && password_verify((string) $_POST['clave'], SUPERADMIN_HASH)) {
      $rol_entrando = 'super';
    }
    if ($rol_entrando !== null) {
      limpiar_fallos();
      session_regenerate_id(true);
      $_SESSION['ok'] = true;
      $_SESSION['rol'] = $rol_entrando;
      $_SESSION['clave_ref'] = clave_ref($rol_entrando);
      $_SESSION['visto'] = time();
      $_SESSION['csrf'] = bin2hex(random_bytes(16));
      registrar_acceso('entrada correcta (' . $rol_entrando . ')');
      header('Location: index.php');
      exit;
    }
    apuntar_fallo();
    registrar_acceso('contraseña incorrecta');
    $error = 'Contraseña incorrecta.';
  }
}

/* Caducidad por inactividad. Se mide desde la última acción, no desde el login.
 * Y si la contraseña del rol ha cambiado desde que se abrió esta sesión, se cierra también:
 * el cambio de contraseña debe expulsar a quien ya estuviera dentro. */
$caducada = false;
$expulsada = false;
if (!empty($_SESSION['ok'])) {
  $ref_ok = !isset($_SESSION['clave_ref'])
         || (int) $_SESSION['clave_ref'] === clave_ref((string) ($_SESSION['rol'] ?? 'cliente'));
  if (!$ref_ok) {
    $_SESSION = [];
    session_destroy();
    session_start();
    /* Un token vacío empataría con un POST vacío en hash_equals: siempre hay token. */
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    $expulsada = true;
  } elseif (isset($_SESSION['visto']) && (time() - (int) $_SESSION['visto']) > SESION_MINUTOS * 60) {
    $_SESSION = [];
    session_destroy();
    session_start();
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    $caducada = true;
  } else {
    $_SESSION['visto'] = time();
  }
}
if ($caducada) $error = 'La sesión se ha cerrado por inactividad. Vuelve a entrar.';
if ($expulsada) $error = 'La contraseña ha cambiado y esta sesión se ha cerrado. Entra con la nueva.';

$dentro = !empty($_SESSION['ok']);
$sin_configurar = (ADMIN_HASH === '');

/* Modo demo: se entra sin contraseña. Se sigue necesitando el token CSRF para guardar.
 * Se apaga solo en cuanto existe una contraseña, sin tocar config.php: poner contraseña y
 * salir del demo son la misma acción, y así no queda ningún paso que se pueda olvidar. */
$demo = defined('DEMO_SIN_CLAVE') && DEMO_SIN_CLAVE && ADMIN_HASH === '';
if ($demo) {
  $dentro = true;
  $sin_configurar = false;
  if ($caducada) { $error = null; $caducada = false; }
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
}

/* El rol de esta petición. El demo trabaja con los permisos del restaurante; una sesión
 * antigua sin rol guardado también, que es lo que era. */
$rol = $demo ? 'demo' : (string) ($_SESSION['rol'] ?? 'cliente');
if (!$dentro) $rol = '';
$super = ($rol === 'super');
/* El hash del superadmin puede venir de una variable de entorno; entonces no hay archivo que
 * reescribir y su cambio de contraseña se hace donde viva la variable. */
$super_en_entorno = (string) getenv('SUPERADMIN_PASSWORD_HASH') !== '';

/* Primera vez: se elige contraseña y el panel escribe clave.php él mismo. Si la carpeta no
 * deja escribir, enseña el archivo para crearlo a mano.
 *
 * Si hay superadministrador configurado, este paso pide TAMBIÉN su contraseña. Sin esa
 * comprobación, el primero que encuentra la URL antes que el restaurante pone la contraseña
 * él y deja fuera al dueño: la carrera clásica de toda pantalla de primera configuración. */
$hash_nuevo = null;
$clave_escrita = false;
/* Fase 7 — activación por token. Un cliente nacido de nuevo-cliente.mjs despliega su
   panel con PANEL_ACTIVACION_HASH puesto; un cliente que no lo tenga configurado deja
   $activacion_requerida en false y todo este bloque se comporta exactamente como antes. */
$activacion_requerida = (defined('PANEL_ACTIVACION_HASH') && PANEL_ACTIVACION_HASH !== '');
if ($sin_configurar && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['nueva'])) {
  usleep(300000);
  $espera = bloqueo_minutos_restantes();
  $nueva = (string) $_POST['nueva'];
  if (!hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) ($_POST['csrf'] ?? ''))) {
    $error = 'La página ha caducado. Recarga y vuelve a intentarlo.';
  } elseif ($espera > 0) {
    $error = 'Demasiados intentos seguidos. Espera ' . $espera . ' minuto(s) y vuelve a probar.';
  } elseif ($activacion_requerida && is_file(ACTIVACION_CONSUMIDA_PATH)) {
    /* No debería poder llegar aquí ($sin_configurar ya sería false en cuanto exista
       clave.php, y las dos se escriben juntas) — guardia primaria explícita, no confiar
       solo en ADMIN_HASH. */
    $error = 'La activación de este panel ya se ha consumido.';
  } elseif ($activacion_requerida && !hash_equals(PANEL_ACTIVACION_HASH,
              hash('sha256', (string) ($_POST['token_activacion'] ?? '')))) {
    apuntar_fallo();
    registrar_acceso('configuración inicial rechazada: token de activación incorrecto');
    $error = 'El token de activación no es correcto.';
  } elseif (SUPERADMIN_HASH !== '' && !password_verify((string) ($_POST['super'] ?? ''), SUPERADMIN_HASH)) {
    apuntar_fallo();
    registrar_acceso('configuración inicial rechazada: superadmin incorrecto');
    $error = 'La contraseña de superadministrador no es correcta.';
  } elseif (strlen($nueva) < 8) {
    $error = 'Usa al menos 8 caracteres.';
  } else {
    limpiar_fallos();
    $hash_nuevo = password_hash($nueva, PASSWORD_DEFAULT);
    $clave_escrita = guardar_clave($hash_nuevo);
    if ($clave_escrita) {
      registrar_acceso('contraseña del restaurante configurada por primera vez');
      if ($activacion_requerida) {
        marcar_activacion_consumida();
        matar_hash_activacion_local();
        registrar_acceso('activación por token consumida; hash cerrado en este servidor');
      }
    }
  }
}

/* Salir del modo demo: es exactamente poner la primera contraseña, con la misma guarda. */
if ($demo && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['salir_demo'])) {
  usleep(300000);
  $espera = bloqueo_minutos_restantes();
  $nueva = (string) ($_POST['clave_nueva'] ?? '');
  if (!hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) ($_POST['csrf'] ?? ''))) {
    $error = 'La sesión ha caducado. Recarga y vuelve a intentarlo.';
  } elseif ($espera > 0) {
    $error = 'Demasiados intentos seguidos. Espera ' . $espera . ' minuto(s) y vuelve a probar.';
  } elseif (SUPERADMIN_HASH !== '' && !password_verify((string) ($_POST['super'] ?? ''), SUPERADMIN_HASH)) {
    apuntar_fallo();
    registrar_acceso('salida de demo rechazada: superadmin incorrecto');
    $error = 'La contraseña de superadministrador no es correcta.';
  } elseif (strlen($nueva) < 8) {
    $error = 'La contraseña necesita al menos 8 caracteres.';
  } elseif (guardar_clave(password_hash($nueva, PASSWORD_DEFAULT))) {
    limpiar_fallos();
    registrar_acceso('demo cerrado: contraseña del restaurante configurada');
    header('Location: index.php');
    exit;
  } else {
    $error = 'No se ha podido escribir clave.php. Revisa los permisos de la carpeta admin/.';
  }
}

/* El restaurante NO cambia su contraseña desde el panel: sólo el superadministrador la
   restablece. Una contraseña que el cliente puede cambiar a solas es una contraseña que
   acaba perdida, y el rescate volvía a ser el FTP. */

/* ---------------------------------------------------------------- superadministrador
 * Dos acciones propias, ninguna al alcance del restaurante:
 *   - Restablecer la contraseña del cliente cuando la pierde o la bloquea. Es el rescate
 *     que motiva el rol: el restaurante recupera su panel sin tocar el servidor.
 *   - Cambiar la suya propia, pidiendo la actual (sólo si vive en superclave.php; si vive
 *     en una variable de entorno, se cambia allí y aquí no hay nada que escribir). */
if ($dentro && $super && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['reset_cliente'])) {
  if (!hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) ($_POST['csrf'] ?? ''))) {
    $error = 'La sesión ha caducado. Vuelve a entrar.';
  } elseif (strlen((string) ($_POST['cliente_nueva'] ?? '')) < 8) {
    $error = 'La contraseña nueva del restaurante necesita al menos 8 caracteres.';
  } elseif (guardar_clave(password_hash((string) $_POST['cliente_nueva'], PASSWORD_DEFAULT))) {
    registrar_acceso('contraseña del restaurante restablecida (super)');
    $aviso = 'Hecho: el restaurante ya puede entrar con la contraseña nueva.';
  } else {
    $error = 'No se ha podido escribir clave.php. Revisa los permisos de la carpeta admin/.';
  }
}

if ($dentro && $super && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['cambiar_super'])) {
  if (!hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) ($_POST['csrf'] ?? ''))) {
    $error = 'La sesión ha caducado. Vuelve a entrar.';
  } elseif ($super_en_entorno) {
    $error = 'Tu hash vive en la variable de entorno SUPERADMIN_PASSWORD_HASH: cámbialo allí.';
  } elseif (!password_verify((string) ($_POST['super_actual'] ?? ''), SUPERADMIN_HASH)) {
    registrar_acceso('cambio de clave super rechazado: actual incorrecta');
    $error = 'Tu contraseña actual no es correcta.';
  } elseif (strlen((string) ($_POST['super_nueva'] ?? '')) < 12) {
    $error = 'La contraseña de superadministrador necesita al menos 12 caracteres.';
  } elseif (guardar_superclave(password_hash((string) $_POST['super_nueva'], PASSWORD_DEFAULT))) {
    registrar_acceso('contraseña de superadmin cambiada');
    $_SESSION['clave_ref'] = clave_ref('super');     // esta sesión sigue; las demás se expulsan
    $aviso = 'Contraseña de superadministrador cambiada.';
  } else {
    $error = 'No se ha podido escribir superclave.php. Revisa los permisos de la carpeta admin/.';
  }
}

/* ---------------------------------------------------------------- guardar */
/* OJO: $lista es el catalogo de platos y lo lee TODO el panel. No reutilizar el nombre
   dentro de un manejador: pisarlo deja la pagina en blanco a partir de las pestañas, porque
   las filas se pintan recorriendo cadenas en vez de platos. Ya paso una vez con las fotos. */
$lista   = platos();
$porKey  = [];
foreach ($lista as $p) $porKey[$p['key']] = $p;
$validas = array_keys($porKey);
$cats    = [];
$catsEs  = [];   // clave inglesa de la categoría -> rótulo en español, como en la carta
foreach ($lista as $p) { $cats[$p['cat']] = ($cats[$p['cat']] ?? 0) + 1; $catsEs[$p['cat']] = $p['group']; }
$hermanas = plato_hermanas($lista);
/* Los mapas de la migracion a identificadores permanentes. platos.json trae, por plato, la
   clave nueva (key = dishId) y la vieja (legacy = "categoria :: nombre"), y por categoria su
   catId. Con eso un estado.json guardado por el panel anterior se traduce al leerlo. */
$catIdDe = [];      // nombre interno de categoria -> categoryId
$mapaLegacy = [];   // clave vieja -> dishId
foreach ($lista as $p) {
  if (isset($p['catId']) && $p['catId'] !== '') $catIdDe[$p['cat']] = (string) $p['catId'];
  if (isset($p['legacy']) && $p['legacy'] !== '') $mapaLegacy[(string) $p['legacy']] = (string) $p['key'];
}
$migraColisiones = []; $migraAnalisis = ['esquema' => 2, 'colisiones' => []];
$tabsEn = [];    // clave inglesa de la pestaña -> rótulo en español
foreach ($lista as $p) { $tabsEn[$p['tab_en']] = $p['tab']; }
$catTab = [];    // clave de grupo -> clave inglesa de su pestaña
foreach ($lista as $p) { $catTab[$p['cat']] = $p['tab_en']; }

/* ---------------------------------------------------------------- contador de aperturas
 * Los dias del mes en curso viven en un fichero por dia, y las aperturas son su TAMANO: cada
 * visita anade un byte (ver datos.php). Los meses ya cerrados se guardan en un JSON cada uno.
 *
 * La consolidacion la dispara el panel al abrirse, no la carta al cargarse: el trabajo lo paga
 * quien mira los numeros una vez al dia, no el cliente sentado en la mesa. Sin ella la carpeta
 * juntaria 365 archivos al ano, y un listado de mil entradas en un FTP compartido es lento.
 */
function datos_hay(): bool {
  return DATOS_ACTIVO && is_dir(DATOS_DIR);
}

/* Los d-*.txt de meses ya cerrados pasan a su JSON, y despues se borran.
   PRIMERO se escribe el mes y SOLO DESPUES se borra el dia: al reves se perderia la cuenta
   entera por un disco lleno, y estos numeros no se reconstruyen de ningun sitio. */
function datos_consolidar(string $mesActual): void {
  $porMes = [];
  foreach ((array) @glob(DATOS_DIR . "/d-*.txt") as $f) {
    if (!preg_match("~/d-(\\d{4}-\\d{2})-(\\d{2})\\.txt$~", $f, $m)) continue;
    if ($m[1] >= $mesActual) continue;              // el mes en curso no se cierra
    $porMes[$m[1]][$m[2]] = (int) @filesize($f);
  }
  foreach ($porMes as $mes => $dias) {
    $ruta = DATOS_DIR . "/" . $mes . ".json";
    $ya = is_file($ruta) ? (json_decode((string) @file_get_contents($ruta), true) ?: []) : [];
    $dias = array_replace(is_array($ya["dias"] ?? null) ? $ya["dias"] : [], $dias);
    ksort($dias);
    $json = json_encode(["mes" => $mes, "dias" => $dias, "total" => array_sum($dias)],
      JSON_UNESCAPED_UNICODE);
    if ($json === false || !escribir_atomico($ruta, $json)) continue;   // sin JSON no se borra
    foreach (array_keys($dias) as $dd) @unlink(DATOS_DIR . "/d-" . $mes . "-" . $dd . ".txt");
  }
  /* Purga de lo mas viejo. Se cuenta por meses guardados, no por fecha: un restaurante que
     cierra tres meses no debe perder el historial por no haber abierto. */
  $viejos = (array) @glob(DATOS_DIR . "/[0-9][0-9][0-9][0-9]-[0-9][0-9].json");
  sort($viejos);
  foreach (array_slice($viejos, 0, max(0, count($viejos) - DATOS_MESES)) as $f) @unlink($f);
}


/* ---------------------------------------------------------------- consultas de plato
 * vista.php escribe una linea por consulta en v-YYYY-MM.log. Aqui se suman y se guardan por mes
 * en vp-YYYY-MM.json, con la misma forma que los meses cerrados de aperturas: un archivo por
 * mes, los dias dentro.
 *
 * EL REGISTRO SE RENOMBRA ANTES DE LEERLO. Renombrar es atomico: las consultas que lleguen
 * mientras se suma empiezan un registro limpio y no se pierde ninguna. Si el proceso se cae a
 * mitad queda un .procesando, y lo primero que hace la vuelta siguiente es terminarlo — nunca
 * se descarta, que ahi dentro hay dias de trabajo del restaurante.
 */
function vistas_consolidar(): void {
  if (!datos_hay()) return;

  /* Primero los huerfanos de una vuelta que fallo, y despues el registro de ahora. */
  $pendientes = (array) @glob(DATOS_DIR . '/v-*.log.procesando');
  foreach ((array) @glob(DATOS_DIR . '/v-*.log') as $log) {
    $destino = $log . '.procesando';
    /* Si ya hay uno con ese nombre, se deja para la vuelta siguiente: pisarlo seria perderlo. */
    if (is_file($destino)) continue;
    if (@rename($log, $destino)) $pendientes[] = $destino;
  }

  foreach (array_unique($pendientes) as $archivo) {
    if (!preg_match('~/v-(\d{4}-\d{2})\.log\.procesando$~', $archivo, $m)) { @unlink($archivo); continue; }
    $suma = [];
    $fh = @fopen($archivo, 'r');
    if (!$fh) continue;
    while (($linea = fgets($fh)) !== false) {
      $linea = trim($linea);
      if (!preg_match('/^([0-9a-f]{8});(\d{4}-\d{2}-\d{2})$/', $linea, $x)) continue;
      $suma[substr($x[2], 8, 2)][$x[1]] = ($suma[substr($x[2], 8, 2)][$x[1]] ?? 0) + 1;
    }
    fclose($fh);
    if (!$suma) { @unlink($archivo); continue; }

    $ruta = DATOS_DIR . '/vp-' . $m[1] . '.json';
    $ya = is_file($ruta) ? (json_decode((string) @file_get_contents($ruta), true) ?: []) : [];
    $dias = is_array($ya['dias'] ?? null) ? $ya['dias'] : [];
    foreach ($suma as $dd => $platos) {
      foreach ($platos as $id => $n) {
        $dias[$dd][$id] = (int) ($dias[$dd][$id] ?? 0) + (int) $n;
      }
    }
    ksort($dias);
    $json = json_encode(['mes' => $m[1], 'dias' => $dias], JSON_UNESCAPED_UNICODE);
    /* Sin JSON escrito NO se borra el registro: mas vale sumar dos veces manana que perder el
       dia entero hoy. */
    if ($json === false || !escribir_atomico($ruta, $json)) continue;
    @unlink($archivo);
  }

  /* La misma purga que las aperturas, contada por meses guardados y no por fecha. */
  $viejos = (array) @glob(DATOS_DIR . '/vp-[0-9][0-9][0-9][0-9]-[0-9][0-9].json');
  sort($viejos);
  foreach (array_slice($viejos, 0, max(0, count($viejos) - DATOS_MESES)) as $f) @unlink($f);
}


/* Una tabla de platos consultados. $vistas es [id => n] ya ordenado, y $aperturas el total de
   aperturas de ese mismo periodo: el porcentaje es lo unico que se puede leer sin contexto —
   «el 34% de quienes abren la carta miran el solomillo» dice algo, «127» no dice nada. */
function vp_lista(array $vistas, array $porVid, int $aperturas, int $tope): string {
  $filas = '';
  $primero = 0;
  $i = 0;
  foreach ($vistas as $id => $n) {
    if (!isset($porVid[$id])) continue;          // plato que ya no esta en la carta
    if ($primero === 0) $primero = (int) $n;
    $i++;
    if ($tope > 0 && $i > $tope) break;
    $ancho = $primero > 0 ? max(2, (int) round($n / $primero * 100)) : 0;
    $pct = $aperturas > 0 ? (int) round($n / $aperturas * 100) : null;
    $filas .= '<div class="vp-fila">'
      . '<span class="vp-barra" style="width:' . $ancho . '%"></span>'
      . '<span class="vp-pos">' . $i . '</span>'
      . '<span class="vp-nom">' . h($porVid[$id]['name']) . '</span>'
      . '<span class="vp-n">' . number_format((int) $n, 0, ',', '.') . '</span>'
      . '<span class="vp-pct">' . ($pct === null ? '&nbsp;' : $pct . '%') . '</span>'
      . '</div>';
  }
  return $filas;
}

/* ["Y-m-d" => [id => consultas]] con todo lo consolidado. */
function vistas_serie(): array {
  $serie = [];
  foreach ((array) @glob(DATOS_DIR . '/vp-[0-9][0-9][0-9][0-9]-[0-9][0-9].json') as $f) {
    $j = json_decode((string) @file_get_contents($f), true);
    if (!is_array($j) || !is_array($j['dias'] ?? null)) continue;
    foreach ($j['dias'] as $dd => $platos) {
      if (!is_array($platos)) continue;
      $serie[$j['mes'] . '-' . $dd] = $platos;
    }
  }
  ksort($serie);
  return $serie;
}

/* Suma N dias seguidos desde una fecha y devuelve [id => consultas], de mas a menos. */
function vistas_rango(array $serie, string $desde, int $dias): array {
  $d = new DateTimeImmutable($desde);
  $out = [];
  for ($i = 0; $i < $dias; $i++) {
    $f = $d->modify('+' . $i . ' day')->format('Y-m-d');
    foreach ((array) ($serie[$f] ?? []) as $id => $n) {
      $out[$id] = ($out[$id] ?? 0) + (int) $n;
    }
  }
  arsort($out);
  return $out;
}

/* ["Y-m-d" => aperturas] con todo: los meses cerrados de sus JSON y los dias del mes en curso
   del tamano de su fichero. */
function datos_serie(): array {
  $serie = [];
  foreach ((array) @glob(DATOS_DIR . "/[0-9][0-9][0-9][0-9]-[0-9][0-9].json") as $f) {
    $j = json_decode((string) @file_get_contents($f), true);
    if (!is_array($j) || !is_array($j["dias"] ?? null)) continue;
    foreach ($j["dias"] as $dd => $n) $serie[$j["mes"] . "-" . $dd] = (int) $n;
  }
  foreach ((array) @glob(DATOS_DIR . "/d-*.txt") as $f) {
    if (!preg_match("~/d-(\\d{4}-\\d{2}-\\d{2})\\.txt$~", $f, $m)) continue;
    $serie[$m[1]] = (int) @filesize($f);
  }
  ksort($serie);
  return $serie;
}

/* Suma N dias seguidos desde una fecha. Los dias sin fichero valen cero y no rompen: un
   restaurante cerrado el lunes no tiene archivo del lunes. */
function datos_rango(array $serie, string $desde, int $dias): int {
  $d = new DateTimeImmutable($desde);
  $n = 0;
  for ($i = 0; $i < $dias; $i++) {
    $n += (int) ($serie[$d->modify("+" . $i . " day")->format("Y-m-d")] ?? 0);
  }
  return $n;
}

/* Sin periodo anterior no hay porcentaje: se escribe «sin datos todavia». El primer mes de todos
   no tiene con que compararse, y un -100% ahi es una mentira. */
/* La variacion en tres caracteres en vez de en una frase. La flecha va como icono y no como signo
   menos: a 12px un guion no se ve, y una flecha si. Sin nada con que comparar no se escribe «sin
   datos» sino que es la primera vez, que es lo mismo dicho en positivo. */
/* Tres estados y no dos. Sin porcentaje pueden pasar dos cosas MUY distintas: que entonces no
   contabamos —primera vez— o que contabamos y ese periodo fue cero, que es un dato real y de los
   buenos: el lunes pasado el local cerro. Con un solo estado, un lunes cerrado se leia «1.ª vez»
   teniendo mil aperturas en el mes. */
function dt_chip(?int $pct, bool $habia = false): string {
  if ($pct === null) {
    return $habia ? '<span class="dt-chip nuevo">antes 0</span>'
                  : '<span class="dt-chip nuevo">1.ª vez</span>';
  }
  $cls = $pct > 0 ? ' sube' : ($pct < 0 ? ' baja' : '');
  $ico = '';
  if ($pct !== 0) {
    $trazo = $pct > 0 ? 'M6 10V2M2.5 5.5 6 2l3.5 3.5' : 'M6 2v8M2.5 6.5 6 10l3.5-3.5';
    $ico = "<svg viewBox='0 0 12 12' fill='none' stroke='currentColor' stroke-width='2.2'"
         . " stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>"
         . "<path d='" . $trazo . "'/></svg>";
  }
  return '<span class="dt-chip' . $cls . '">' . $ico . abs($pct) . '%</span>';
}

/* La tira de barras de una baldosa. Reusa las clases de la grafica grande a proposito: si algun
   dia cambia el aspecto de una barra, cambia en los cuatro sitios a la vez y no en uno. */
function dt_tira(array $v, string $izq, string $der, string $etiqueta, ?int $reales = null): string {
  $reales = $reales ?? count($v);
  /* max() de una lista vacia es un ValueError en PHP 8, no un aviso. Hoy no llega vacia nunca,
     pero esto es un ayudante y el que lo llame el ano que viene no va a leer esta linea. */
  $tope = $v ? max(1, max($v)) : 1;
  $barras = '';
  foreach ($v as $i => $n) {
    /* El 6% de suelo es para que un dia flojo se vea como una barra baja y no como la nada. El
       dia sin una sola apertura si baja a cero: lo pinta .dt-b.cero con su filete de 2px. */
    $alto = $n > 0 ? max(6, (int) round($n / $tope * 100)) : 0;
    /* Un dia que aun no ha llegado no es un dia de cero: el cero lleva su filete y el futuro no
       lleva nada, para que no se lea «ese dia no vino nadie» cuando todavia no ha pasado. */
    $cls = $i >= $reales ? ' cero futuro' : ($n > 0 ? '' : ' cero');
    $barras .= '<span class="dt-b' . $cls . '" style="--i:' . $i . '">'
             . '<i style="height:' . $alto . '%"></i></span>';
  }
  return '<div class="dt-barras chica" role="img" aria-label="' . h($etiqueta) . '">' . $barras . '</div>'
       . '<div class="dt-eje"><span>' . h($izq) . '</span><span>' . h($der) . '</span></div>';
}

function datos_pct(int $ahora, int $antes): ?int {
  if ($antes <= 0) return null;
  return (int) round((($ahora - $antes) / $antes) * 100);
}

$pestana  = (string) ($_GET['t'] ?? 'agotados');
$previsua = null;   // paso 2 de los precios: propuesta calculada y sin publicar

$esPost = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
$csrfOk = $dentro && $esPost && hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) ($_POST['csrf'] ?? ''));

/* Si el envío pesa más de lo que admite el servidor, PHP lo tira ENTERO antes de que llegue
   aquí: $_POST y $_FILES vienen vacíos y el token de sesión tampoco está, así que sin esta
   comprobación el panel diría «la sesión ha caducado» y el cliente no entendería nada. */
$post_tirado = $esPost && !$_POST && !$_FILES && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0;

if ($post_tirado) {
  $limite = ini_get('post_max_size');
  $error = 'El servidor ha rechazado el envío por tamaño: no acepta más de ' . h((string) $limite)
         . ' por envío. Sube una foto más ligera.';
} elseif ($dentro && $esPost && !$csrfOk && !isset($_POST['clave']) && !isset($_POST['nueva'])) {
  $error = 'La sesión ha caducado. Vuelve a entrar.';
}

if ($csrfOk) {
  $estadoCrudo = leer_estado();
  $migraAnalisis = estado_analizar($estadoCrudo, $porKey, $mapaLegacy, $catIdDe);
  $migraColisiones = $migraAnalisis['colisiones'];
  $estado = estado_vista($estadoCrudo, $porKey, $mapaLegacy, $catIdDe);
  $hoy = fecha_servicio();

  /* --- la migracion explicita a identificadores permanentes --- */
  if (isset($_POST['migrar_estado'])) {
    if ($migraAnalisis['esquema'] >= 2) {
      $aviso = 'El estado ya usa identificadores permanentes: no hay nada que migrar.';
    } elseif ($migraColisiones) {
      $error = 'No se migra: hay colisiones que necesitan revision manual. No se ha cambiado nada.';
    } elseif ($migraAnalisis['prevision'] === null) {
      $error = 'La prevision no se pudo calcular. No se ha cambiado nada.';
    } elseif (guardar_estado($migraAnalisis['prevision'])) {
      /* Verificacion inmediata: se relee del disco y se vuelve a analizar. */
      $rel = estado_analizar(leer_estado(), $porKey, $mapaLegacy, $catIdDe);
      if ($rel['esquema'] === 2 && !$rel['colisiones']) {
        $aviso = 'Estado migrado a identificadores permanentes y verificado. '
               . 'La copia de justo antes esta en Marca > Copias (anterior.json): restaurarla deshace la migracion.';
        registrar_acceso('migracion de estado a esquema 2: verificada');
      } else {
        $error = 'La verificacion posterior no cuadra: restaura anterior.json desde Marca > Copias.';
      }
      $estadoCrudo = leer_estado();
      $migraAnalisis = estado_analizar($estadoCrudo, $porKey, $mapaLegacy, $catIdDe);
      $migraColisiones = $migraAnalisis['colisiones'];
      $estado = estado_vista($estadoCrudo, $porKey, $mapaLegacy, $catIdDe);
    } else {
      $error = 'No se ha podido escribir estado.json. No se ha cambiado nada.';
    }
  }

  /* ---------------------------------------------------------------- fotos de plato
   * Llega por fetch desde la lista de platos y contesta JSON, no una página: la lista tiene 312
   * filas y recargarla entera para cambiar una foto sería perder el sitio donde estabas y el
   * texto que hubiera en el buscador.
   *
   * Va aquí dentro y no en un archivo aparte para no duplicar la puerta: la sesión y el token
   * ya están comprobados en $csrfOk, que es lo que protege a todo lo demás del panel. */
  if (isset($_POST['foto_accion'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    $accion = (string) $_POST['foto_accion'];
    $key    = (string) ($_POST['foto_plato'] ?? '');
    $fotosPlato  = is_array($estado['fotos'] ?? null) ? $estado['fotos'] : [];
    $fallo  = static function (string $m) {
      echo json_encode(['ok' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
      exit;
    };

    /* El plato tiene que existir en la carta de ahora. Sin esto, el estado se llena de claves
       que no pinta nadie y la carpeta de fotos, de archivos que no reclama nadie. */
    if (!isset($porKey[$key])) $fallo('Ese plato ya no está en la carta.');

    $anterior = (string) ($fotosPlato[$key] ?? '');

    if ($accion === 'quitar') {
      if ($anterior === '') $fallo('Ese plato no tiene foto.');
      fotos_borrar($anterior, $fotosPlato);
      unset($fotosPlato[$key]);
      $estado['fotos'] = $fotosPlato;
      if (!guardar_estado($estado)) $fallo('No he podido guardar. Inténtalo otra vez.');
      registrar_acceso('foto quitada: ' . $key);
      echo json_encode(['ok' => true, 'foto' => null], JSON_UNESCAPED_UNICODE);
      exit;
    }

    if ($accion !== 'subir') $fallo('Acción desconocida.');

    $sube = fotos_guardar($_FILES['foto'] ?? []);
    if (isset($sube['error'])) $fallo($sube['error']);
    if (!fotos_carpeta_lista()) {
      $fallo('No puedo escribir en assets/platos/. Crea la carpeta en el servidor y dale permiso de escritura.');
    }

    $nombre  = fotos_nombre($key);
    $destino = FOTOS_DIR . '/' . $nombre;
    if (!@move_uploaded_file($_FILES['foto']['tmp_name'], $destino)) {
      $fallo('No he podido guardar la foto.');
    }
    @chmod($destino, 0644);

    /* Primero el estado y después el borrado de la anterior. Al revés, un guardado que falla
       deja al plato apuntando a un archivo que ya no está: la carta enseñaría un hueco. */
    $fotosPlato[$key] = $nombre;
    $estado['fotos'] = $fotosPlato;
    if (!guardar_estado($estado)) {
      @unlink($destino);
      $fallo('No he podido guardar. La foto no se ha cambiado.');
    }
    if ($anterior !== '' && $anterior !== $nombre) fotos_borrar($anterior, [$anterior]);
    registrar_acceso('foto nueva: ' . $key);
    echo json_encode(['ok' => true, 'foto' => $nombre, 'url' => FOTOS_URL . $nombre],
                     JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* --- copias de seguridad --- */
  /* Las descargas salen por PHP y no por un enlace directo: admin/copias/ esta denegado por el
     .htaccess, que es justo lo que queremos, asi que el fichero lo sirve el panel con la sesion
     ya comprobada. El nombre que llega del formulario no se pega nunca a una ruta: se busca en
     copias_listar(), y lo que no aparece en esa lista no existe para el panel. */
  if (isset($_POST['descargar_copia']) || isset($_POST['restaurar_copia'])) {
    $restaurar  = isset($_POST['restaurar_copia']);
    $pedido     = (string) ($restaurar ? $_POST['restaurar_copia'] : $_POST['descargar_copia']);
    $encontrada = null;
    foreach (copias_listar() as $c) {
      if ($c['nombre'] === $pedido) $encontrada = $c['nombre'];
    }
    $pestana = 'marca';

    if ($encontrada === null) {
      $error = 'Esa copia ya no esta. Actualiza la pagina para ver la lista de ahora.';
    } elseif (!$restaurar) {
      $ruta = COPIAS_DIR . '/' . $encontrada;
      header('Content-Type: application/json; charset=utf-8');
      header('Content-Disposition: attachment; filename="estado-' . $encontrada . '"');
      header('Content-Length: ' . (string) filesize($ruta));
      readfile($ruta);
      exit;
    } else {
      $raw   = (string) @file_get_contents(COPIAS_DIR . '/' . $encontrada);
      $vuelta = json_decode($raw, true);
      if (!is_array($vuelta)) {
        $error = 'La copia no se puede leer. No se ha cambiado nada.';
      } else {
        /* Restaurar pasa por guardar_estado(), asi que lo primero que hace es copiar el estado
           de AHORA a anterior.json. Deshacer una restauracion es, por tanto, otra restauracion:
           nadie se queda sin salida por haber pulsado el boton equivocado. */
        $estado = array_replace(estado_vacio(), $vuelta);
        /* La copia manda: si es de antes de los identificadores, se restaura COMO esquema 1 y
           el panel vuelve a ofrecer la migracion explicita. Sin esto, estado_vacio() le
           regalaba el esquema 2 de la plantilla y la copia vieja quedaba mal etiquetada. */
        $estado['esquema'] = (int) ($vuelta['esquema'] ?? 1);
        if (guardar_estado($estado)) {
          $aviso = $encontrada === 'anterior.json'
                 ? 'Deshecho el ultimo guardado. La carta vuelve a como estaba antes de el.'
                 : 'Restaurada la copia del '
                 . (new DateTimeImmutable(substr($encontrada, 0, 10)))->format('d/m/y') . '.';
        } else {
          $error = 'No se ha podido escribir estado.json. No se ha cambiado nada.';
        }
      }
    }
  }

  /* El estado de ahora, tal cual esta en disco. Es la copia que hay que bajarse ANTES de una
     migracion: las de copias/ son de despues. */
  if (isset($_POST['descargar_estado']) && is_file(ESTADO_PATH)) {
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="estado-' . fecha_servicio() . '-actual.json"');
    header('Content-Length: ' . (string) filesize(ESTADO_PATH));
    readfile(ESTADO_PATH);
    exit;
  }


  /* --- agotados --- */
  /* Las fotos no son un ajuste que se edita y se guarda: subir y quitar son acciones que
     pasan al momento. Por eso van en su propio formulario y no tienen boton de guardar — no
     hay nada que se pueda olvidar de pulsar. */
  if (isset($_POST['subir_foto'])) {
    $pestana = 'marca';
    $hero = is_array($estado['hero'] ?? null) ? array_values($estado['hero']) : [];
    $sitio = HERO_MAX - count($hero);

    if ($sitio <= 0) {
      $error = 'Ya hay ' . HERO_MAX . ' fotos. Quita una antes de subir otra.';
    } else {
      /* Se suben las que quepan y se dice cuáles se han quedado fuera. Rechazar el envío
         entero porque sobre una es peor: el cliente ya ha esperado la subida. */
      /* Un selector vacío manda igualmente una entrada con UPLOAD_ERR_NO_FILE. Se tira antes
         de contar nada: si no, una plaza libre se convertiría en un error inventado. */
      $llegan  = array_values(array_filter(hero_archivos(), function ($f) {
        return ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
      }));
      $sobran  = max(0, count($llegan) - $sitio);
      $entran  = array_slice($llegan, 0, $sitio);
      $puestas = 0;
      $fallos  = [];

      foreach ($entran as $i => $f) {
        $r = hero_guardar($f);
        if (isset($r['error'])) {
          $nombre = trim((string) ($f['name'] ?? ''));
          $fallos[] = ($nombre !== '' ? mb_substr(basename($nombre), 0, 40) . ': ' : '') . $r['error'];
        } else {
          $hero[] = $r['ok'];
          $puestas++;
        }
      }

      if ($puestas) {
        $estado['hero'] = $hero;
        if (!guardar_estado($estado)) {
          $error = 'Las fotos se subieron pero no he podido escribir estado.json.';
          $puestas = 0;
        }
      }

      /* Un solo mensaje con todo lo que ha pasado: cuántas entraron, cuántas se quedaron
         fuera por falta de sitio y por qué fallaron las demás. */
      if ($error === null) {
        $partes = [];
        if ($puestas) {
          $partes[] = $puestas === 1
            ? 'Foto subida.'
            : $puestas . ' fotos subidas.';
          $partes[] = 'Ya son ' . count($hero) . ' de ' . HERO_MAX . '.';
        }
        if ($sobran) {
          $partes[] = $sobran === 1
            ? 'Una se ha quedado fuera: sólo caben ' . HERO_MAX . '.'
            : $sobran . ' se han quedado fuera: sólo caben ' . HERO_MAX . '.';
        }
        if ($fallos) $partes[] = 'No entraron ' . count($fallos) . ': ' . implode(' | ', $fallos);

        if ($puestas) $aviso = implode(' ', $partes);
        else $error = $partes ? implode(' ', $partes) : 'No ha llegado ninguna foto.';
      }
    }
  }

  if (isset($_POST['quitar_foto'])) {
    $pestana = 'marca';
    $hero = is_array($estado['hero'] ?? null) ? array_values($estado['hero']) : [];
    $cual = (string) ($_POST['quitar_foto'] ?? '');
    if (!hero_borrar($cual, $hero)) {
      $error = 'Esa foto ya no está.';
    } else {
      $estado['hero'] = array_values(array_filter($hero, function ($x) use ($cual) { return $x !== $cual; }));
      $aviso = guardar_estado($estado) ? 'Foto quitada.' : 'No he podido escribir estado.json.';
    }
  }

  /* Reordenar entero desde el navegador: llega la lista tal y como ha quedado en pantalla.
     Se comprueba que sea exactamente el mismo conjunto que hay guardado —mismos nombres, misma
     cantidad— antes de tocar nada. Asi una peticion vieja o manipulada no puede colar un
     archivo que no existe ni perder uno por el camino. */
  if (isset($_POST['ordenar_fotos'])) {
    $pestana = 'marca';
    $hero = is_array($estado['hero'] ?? null) ? array_values($estado['hero']) : [];
    $nuevo = array_values(array_filter(
      array_map('strval', (array) ($_POST['orden'] ?? [])),
      function ($x) { return $x !== ''; }
    ));
    $mismos = count($nuevo) === count($hero) && !array_diff($nuevo, $hero) && !array_diff($hero, $nuevo);
    $sinPagina = ($_SERVER['HTTP_X_SIN_PAGINA'] ?? '') === '1';

    if (!$mismos) {
      $error = 'El orden que llega no cuadra con las fotos que hay. Recarga la página.';
      if ($sinPagina) { header('Content-Type: text/plain; charset=utf-8'); echo 'ERROR'; exit; }
    } else {
      $estado['hero'] = $nuevo;
      $ok = guardar_estado($estado);
      if ($sinPagina) {
        header('Content-Type: text/plain; charset=utf-8');
        echo $ok ? 'OK' : 'ERROR';
        exit;
      }
      $aviso = $ok ? 'Orden cambiado.' : 'No he podido escribir estado.json.';
    }
  }

  /* Mover una foto de sitio es reordenar la lista, no volver a subir nada. */
  if (isset($_POST['mover_foto'])) {
    $pestana = 'marca';
    $hero = is_array($estado['hero'] ?? null) ? array_values($estado['hero']) : [];
    $cual = (string) ($_POST['mover_foto'] ?? '');
    $dir  = ($_POST['dir'] ?? '') === 'abajo' ? 1 : -1;
    $i = array_search($cual, $hero, true);
    $j = $i === false ? -1 : $i + $dir;
    if ($i !== false && $j >= 0 && $j < count($hero)) {
      $tmp = $hero[$i]; $hero[$i] = $hero[$j]; $hero[$j] = $tmp;
      $estado['hero'] = $hero;
      $aviso = guardar_estado($estado) ? 'Orden cambiado.' : 'No he podido escribir estado.json.';
    }
  }

  /* Marca: nombre, texto de portada, color principal y opiniones en el MISMO guardado.
     Cuando eran formularios distintos en la misma pantalla, guardar uno perdía lo que
     hubiera escrito en el otro. Un botón. Secundario/Oscuro/Neutral no se guardan aquí:
     son constantes del motor, se ven abajo solo de referencia. */
  if (isset($_POST['guardar_marca'])) {
    $pestana = 'marca';

    /* El nombre y el texto pequeño de portada. Vacío es válido a propósito: es la forma de
       volver al de fábrica sin tener que escribirlo de nuevo. maxlength en el HTML es sólo
       una ayuda visual -- el límite de verdad se comprueba aquí, en caracteres reales, no en
       lo que el navegador deje escribir. */
    $marcaNombre = trim((string) ($_POST['marca_nombre'] ?? ''));
    $marcaRotulo = trim((string) ($_POST['marca_rotulo'] ?? ''));

    /* El color principal. Vacío tambien es valido, y por la misma razon: es «restaurar»,
       vuelve al de cliente.mjs sin tener que teclearlo. Si trae algo, tiene que ser un
       hex de verdad Y tiene que leerse con la jerarquia fija (Secundario/Oscuro/Neutral)
       -- la MISMA comprobacion que hara el build el dia que este color pase a cliente.mjs,
       para que nunca se pueda guardar en caliente un color que el motor rechazaria en frio. */
    $colorPost = trim((string) ($_POST['marca_color_principal'] ?? ''));
    $colorNormalizado = '';
    $colorError = null;
    if ($colorPost !== '') {
      $colorNormalizado = color_normalizar($colorPost) ?? '';
      if ($colorNormalizado === '') {
        $colorError = 'Ese color no es un hex válido. Usa el formato #RRGGBB, por ejemplo #FF7517.';
      } elseif (derivar_principal($colorNormalizado) === null) {
        $colorError = 'El sistema ya prueba texto oscuro y texto claro encima de ese color, y ninguno de los dos se lee bien. Prueba con un color de intensidad media -- ni muy claro ni muy oscuro -- para que alguno de los dos funcione.';
      }
    }

    $op_on  = !empty($_POST['op_on']);
    $op_not = str_replace(',', '.', trim((string) ($_POST['op_nota'] ?? '0')));
    $op_not = is_numeric($op_not) ? round((float) $op_not, 1) : -1;
    $op_num = (int) ($_POST['op_cuantas'] ?? 0);
    $op_url = trim((string) ($_POST['op_url'] ?? ''));
    $urlOk  = $op_url === ''
      || (filter_var($op_url, FILTER_VALIDATE_URL) !== false && stripos($op_url, 'https://') === 0);

    /* Redes. Se comprueban todas antes de guardar ninguna: guardar dos buenas y rechazar la
       tercera dejaria al cliente sin saber que se ha guardado y que no. */
    $wa = wa_normalizar((string) ($_POST['red_whatsapp'] ?? ''));
    $redes = ['whatsapp' => $wa];
    $malas = [];
    if ($wa !== '' && (strlen($wa) < 10 || strlen($wa) > 15)) {
      $malas[] = 'WhatsApp: hacen falta el código de país y el número, entre 10 y 15 cifras. '
               . 'Por ejemplo 34 617 79 85 57 para España.';
    }
    foreach (['instagram' => 'Instagram', 'facebook' => 'Facebook', 'tripadvisor' => 'Tripadvisor'] as $k => $nombre) {
      $v = trim((string) ($_POST['red_' . $k] ?? ''));
      $redes[$k] = $v;
      if ($v !== '' && !red_url_ok($k, $v)) {
        $malas[] = $nombre . ': la dirección tiene que empezar por https:// y ser de ' . $nombre . '.';
      }
    }

    if (caracteres($marcaNombre) > 20) {
      $error = 'El nombre no puede pasar de 20 caracteres (van ' . caracteres($marcaNombre) . ').';
    } elseif (caracteres($marcaRotulo) > 25) {
      $error = 'El texto pequeño no puede pasar de 25 caracteres (van ' . caracteres($marcaRotulo) . ').';
    } elseif ($colorError !== null) {
      $error = $colorError;
    } elseif ($op_not < 0 || $op_not > 5) {
      $error = 'La nota tiene que estar entre 0 y 5. Ponla como sale en Google, por ejemplo 4,9.';
    } elseif ($op_num < 0 || $op_num > 100000) {
      $error = 'El número de reseñas no me cuadra.';
    } elseif ($op_on && ($op_not <= 0 || $op_num <= 0)) {
      $error = 'Para enseñar la nota hacen falta las dos cosas: la nota y el número de reseñas.';
    } elseif (!$urlOk) {
      $error = 'El enlace de reseñas no vale. Tiene que empezar por https:// y ser una dirección completa.';
    } elseif ($malas) {
      $error = implode(' ', $malas);
    } else {
      $estado['marca'] = ['nombreVisible' => $marcaNombre, 'rotuloVisible' => $marcaRotulo, 'colorPrincipal' => $colorNormalizado];
      $estado['reviews'] = ['on' => $op_on, 'rating' => $op_not, 'count' => $op_num];
      $estado['social'] = $redes;
      /* El enlace es de aquí, y ya es lo único que queda en review. */
      $estado['review'] = array_replace(
        estado_vacio()['review'],
        is_array($estado['review'] ?? null) ? $estado['review'] : [],
        ['url' => $op_url]
      );
      if (guardar_estado($estado)) {
        $aviso = $op_on
          ? 'Guardado. Al final de la carta sale la nota de Google.'
          : 'Guardado. La nota de Google no se enseña: su interruptor está apagado.';
      } else {
        $error = 'No he podido escribir estado.json.';
      }
    }
  }

  if (isset($_POST['guardar_agotados'])) {
    $pestana = 'agotados';
    $nuevo = [];
    $marcados = 0;
    foreach (array_unique((array) ($_POST['agotado'] ?? [])) as $k) {
      if (!is_string($k) || !in_array($k, $validas, true)) continue;
      $marcados++;
      /* Un plato agotado lo está en todas sus filas. Ver plato_hermanas: si no, el mismo
         Papadum salía tachado en Aperitivos y disponible en Vegano. */
      foreach ($hermanas[$k] ?? [$k] as $h) $nuevo[$h] = $hoy;
    }
    $estado['soldOut'] = $nuevo;
    /* Las casillas se marcan solas entre hermanas en el navegador, así que esto casi nunca
       tiene nada que contar. Casi: sin JavaScript, o marcando desde el buscador de la lista,
       aquí es donde se completa, y entonces hay que decirlo o el que guarda ve más tachones
       de los que puso. */
    $filasExtra = count($nuevo) - $marcados;
    if (guardar_estado($estado)) {
      $aviso = count($nuevo) === 0
        ? 'Guardado: hoy no hay nada agotado.'
        : 'Guardado: ' . $marcados . ' plato(s) agotados'
          . ($filasExtra > 0 ? ', y ' . $filasExtra . ' fila(s) más de esos mismos platos en Sin gluten o Vegano' : '')
          . '. Se limpia solo mañana a las ' . CORTE_HORA . ':00.';
    } else {
      $error = 'No se ha podido escribir estado.json. Revisa los permisos de la carpeta.';
    }
  }

  /* --- destacados --- */
  if (isset($_POST['destacado_add'])) {
    $pestana = 'destacados';
    $k = (string) ($_POST['hl_key'] ?? '');
    $e = (string) ($_POST['hl_label'] ?? '');
    if (!in_array($k, $validas, true)) {
      $error = 'Ese plato no está en la carta.';
    } elseif (!in_array($e, ETIQUETAS, true)) {
      $error = 'Esa etiqueta no existe.';
    } else {
      $estado['tags'][$k] = $e;
      if (guardar_estado($estado)) $aviso = 'Destacado añadido.';
      else $error = 'No se ha podido escribir estado.json.';
    }
  }
  if (isset($_POST['destacado_del'])) {
    $pestana = 'destacados';
    unset($estado['tags'][(string) $_POST['destacado_del']]);
    if (guardar_estado($estado)) $aviso = 'Destacado quitado.';
    else $error = 'No se ha podido escribir estado.json.';
  }

  /* --- oferta --- */
  if (isset($_POST['guardar_oferta'])) {
    $pestana = 'ofertas';
    /* Las categorias viajan por su categoryId, no por su nombre: renombrar una categoria no
       puede apagarle la oferta. Se valida contra los ids que existen en la carta de ahora. */
    $idsCat = array_flip($catIdDe);
    $catsSel = array_values(array_filter((array) ($_POST['cat'] ?? []), function ($c) use ($idsCat) {
      return is_string($c) && isset($idsCat[$c]);
    }));
    // platos sueltos: los de una categoría ya marcada entera no se guardan dos veces
    $keysSel = array_values(array_filter(array_unique((array) ($_POST['oferta_plato'] ?? [])),
      function ($k) use ($porKey, $catsSel) {
        return is_string($k) && isset($porKey[$k])
            && !in_array((string) ($porKey[$k]['catId'] ?? ''), $catsSel, true);
      }));
    $dias = array_values(array_filter(array_map('intval', (array) ($_POST['dia'] ?? [])), function ($d) {
      return $d >= 1 && $d <= 7;
    }));
    $pct   = (int) ($_POST['pct'] ?? 0);
    $desde = minutos((string) ($_POST['desde'] ?? ''), 600);
    $hasta = minutos((string) ($_POST['hasta'] ?? ''), 720);
    $on    = !empty($_POST['oferta_on']);

    if ($on && !$catsSel && !$keysSel) {
      $error = 'Elige al menos una categoría o un plato.';
    } elseif ($on && !$dias) {
      $error = 'Elige al menos un día.';
    } elseif ($on && ($pct < 1 || $pct > 90)) {
      $error = 'El descuento tiene que estar entre 1 y 90.';
    } elseif ($on && $hasta <= $desde) {
      $error = 'La hora de fin tiene que ser posterior a la de inicio.';
    } else {
      $estado['offer'] = [
        'on' => $on, 'cats' => $catsSel, 'keys' => $keysSel, 'percent' => $pct ?: 20,
        'from' => $desde, 'to' => $hasta, 'days' => $dias ?: [1,2,3,4,5,6,7],
      ];
      if (guardar_estado($estado)) {
        if ($on) {
          $aviso = 'Oferta guardada y encendida: ' . $pct . '% de ' . hhmm($desde) . ' a ' . hhmm($hasta - 1) . '.';
        } else {
          // Guardar la configuración con el interruptor apagado es el error silencioso de esta
          // pantalla: todo parece correcto y en la carta no pasa nada. Se dice sin rodeos.
          $error = 'GUARDADO, PERO LA OFERTA ESTÁ APAGADA: en la carta no se ve ningún descuento. '
                 . 'Enciende el interruptor de arriba y vuelve a guardar.';
        }
      } else {
        $error = 'No se ha podido escribir estado.json.';
      }
    }
  }

  /* --- precios, paso 1: calcular la propuesta y NO escribir nada ---
     Subir toda la carta de un clic y descubrir los céntimos raros cuando ya está publicada es
     justo lo que hay que evitar. Aquí sólo se calcula; publicar es otro botón. */
  if (isset($_POST['precios_calcular'])) {
    $pestana = 'precios';
    $pct = (float) str_replace(',', '.', (string) ($_POST['subir'] ?? '0'));
    if ($pct <= 0 || $pct > 50) {
      $error = 'La subida tiene que estar entre 0 y 50%.';
    } else {
      $previsua = ['pct' => $pct, 'filas' => []];
      foreach ($lista as $p) {
        if ($p['price'] === '') continue;                   // "Incluido" no tiene precio que subir
        $actual = (string) ($estado['prices'][$p['key']] ?? $p['price']);
        $previsua['filas'][] = [
          'key' => $p['key'], 'id' => $p['id'], 'name' => $p['name'], 'tab' => $p['tab'],
          'carta' => $p['price'], 'actual' => $actual,
          'nuevo' => redondear(((float) $actual) * (1 + $pct / 100)),
        ];
      }
    }
  }

  /* --- precios, paso 2: publicar lo que se vea en pantalla --- */
  if (isset($_POST['precios_publicar'])) {
    $pestana = 'precios';
    $nuevos = [];
    /* Lo que no era un numero se descartaba en silencio y el mensaje seguia diciendo
       «Publicado». Quien escribe 9,5O con una letra O en vez de un cero veia el aviso verde,
       se iba, y el plato se quedaba al precio de la carta. Ahora se guarda igual lo que vale
       —no se pierde el trabajo bueno por una casilla mala— pero se dice cual fallo.
       El campo VACIO no es un error: es la forma de decir «vuelve al precio de la carta». */
    $malos = [];
    foreach ((array) ($_POST['precio'] ?? []) as $k => $v) {
      if (!isset($porKey[$k]) || $porKey[$k]['price'] === '') continue;
      $v = str_replace(',', '.', trim((string) $v));
      if ($v === '') continue;
      if (!is_numeric($v) || (float) $v <= 0) { $malos[$porKey[$k]['name']] = true; continue; }
      $v = number_format((float) $v, 2, '.', '');
      if ($v !== $porKey[$k]['price']) $nuevos[$k] = $v;     // sólo se guarda lo que difiere
    }

    /* Un precio puesto a un plato vale para todas sus filas: es el mismo plato. Ver
       plato_hermanas. Si alguien ha escrito a mano DOS precios distintos para el mismo plato
       no se le pisa ninguno y se avisa: quien decide si eso es un error es el restaurante. */
    $extendidos = [];
    $choque = [];
    foreach ($nuevos as $k => $v) {
      foreach ($hermanas[$k] ?? [] as $h) {
        if ($h === $k) continue;
        if (!isset($nuevos[$h])) $extendidos[$h] = $v;
        elseif ($nuevos[$h] !== $v) $choque[$porKey[$k]['name']] = true;
      }
    }
    $nuevos = $nuevos + $extendidos;

    $estado['prices'] = $nuevos;
    if (guardar_estado($estado)) {
      $aviso = count($nuevos) === 0
        ? 'Publicado: todos los precios vuelven a ser los de la carta.'
        : 'Publicado: ' . count($nuevos) . ' precio(s) distintos de la carta'
          . (count($extendidos) > 0 ? ', contando ' . count($extendidos) . ' fila(s) del mismo plato en Sin gluten o Vegano' : '')
          . '.';
      if ($malos) {
        $aviso .= ' NO se ha guardado el precio de ' . implode(', ', array_keys($malos))
                . ': lo escrito ahí no es un precio. Vuelve a intentarlo con ese.';
      }
      if ($choque) {
        $aviso .= ' Ojo: ' . implode(', ', array_keys($choque))
                . ' ha quedado con dos precios distintos en pestañas distintas. Si no es a propósito, corrígelo.';
      }
    } else {
      $error = 'No se ha podido escribir estado.json.';
    }
  }

  /* --- el juego ---
     Antes esta pantalla configuraba el premio: objetivo, texto, minutos y si se pedía reseña al
     acabarse. Ya no hay premio, así que queda un interruptor. */
  if (isset($_POST['guardar_juego']) && CLIENTE_JUEGO) {
    $pestana = 'juego';
    $estado['game'] = ['on' => !empty($_POST['juego_on'])];
    if (!guardar_estado($estado)) {
      $error = 'No se ha podido escribir estado.json.';
    } elseif ($estado['game']['on']) {
      $aviso = 'Guardado. El juego sale en la carta.';
    } else {
      $aviso = 'Guardado. El juego no sale en la carta.';
    }
  }

  /* --- publicidad: configuracion del banner ---
     Dominio propio del estado (publicidad.banner), a proposito fuera de game: el POST del
     juego reescribe game entero y aqui nadie pisa a nadie. La imagen NO se toca en este
     guardar: tiene sus propios botones con su propio ciclo de vida. */
  if (isset($_POST['guardar_publicidad'])) {
    $pestana = 'publicidad';
    $b = is_array($estado['publicidad']['banner'] ?? null) ? $estado['publicidad']['banner'] : [];
    $b['on'] = !empty($_POST['pub_on']);
    $url = trim((string) ($_POST['pub_url'] ?? ''));
    if ($url !== '') {
      $esquema = strtolower((string) parse_url($url, PHP_URL_SCHEME));
      if ($esquema !== 'https' && $esquema !== 'http') {
        $error = 'La URL del banner tiene que empezar por https:// (o http://). No se ha guardado nada.';
      }
    }
    $ini = pub_fecha_a_utc((string) ($_POST['pub_inicio'] ?? ''));
    $fin = pub_fecha_a_utc((string) ($_POST['pub_fin'] ?? ''));
    if (!$error && ($ini === null || $fin === null)) {
      $error = 'Una de las fechas no tiene sentido. Escribelas con el selector, no a mano.';
    }
    if (!$error && $ini !== '' && $fin !== '' && strtotime($ini) >= strtotime($fin)) {
      $error = 'El fin del banner tiene que ser DESPUES del inicio. No se ha guardado nada.';
    }
    if (!$error) {
      $b['url'] = $url;
      $b['blank'] = !empty($_POST['pub_blank']);
      /* el alt dejo de configurarse (la carta pone siempre "Publicidad"); si un estado
         viejo arrastra la clave, este guardar la retira sin tocar nada mas */
      unset($b['alt']);
      if ($ini === '') unset($b['startAt']); else $b['startAt'] = $ini;
      if ($fin === '') unset($b['endAt']);   else $b['endAt'] = $fin;
      $estado['publicidad'] = is_array($estado['publicidad'] ?? null) ? $estado['publicidad'] : [];
      $estado['publicidad']['banner'] = $b;
      if (!guardar_estado($estado)) {
        $error = 'No se ha podido escribir estado.json.';
      } else {
        $aviso = 'Guardado. El banner esta ' . strtolower(pub_estado_banner($b)) . '.';
      }
    }
  }

  /* Subir o reemplazar la creatividad. El orden es el del contrato: escribir la nueva,
     verificarla, persistir el estado apuntando a ella y SOLO entonces retirar la vieja.
     Si persistir falla, la nueva se limpia (compensacion) y el estado anterior queda tal
     cual; si es la limpieza la que falla, queda huerfana y se registra: nunca se oculta. */
  if (isset($_POST['subir_banner'])) {
    $pestana = 'publicidad';
    $f = $_FILES['pub_img'] ?? null;
    if (!$f || !is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
      $error = 'Elige primero una imagen.';
    } elseif ($f['error'] !== UPLOAD_ERR_OK) {
      $error = 'La subida ha fallado (codigo ' . (int) $f['error'] . '). Vuelve a intentarlo.';
    } elseif ($f['size'] > PUB_MAX_BYTES) {
      /* dos decimales y el maximo DERIVADO de la constante: que jamas parezca que se
         rechaza algo dentro del limite ("pesa 2 MB y el maximo es 2 MB"). */
      $error = 'La imagen pesa ' . number_format($f['size'] / 1048576, 2, ',', '.') . ' MB '
             . 'y el maximo es ' . number_format(PUB_MAX_BYTES / 1048576, 2, ',', '.') . ' MB.';
    } elseif (!is_uploaded_file($f['tmp_name'])) {
      $error = 'Archivo no valido.';
    } else {
      $info = @getimagesize($f['tmp_name']);
      if ($info === false || !isset(HERO_TIPOS[$info[2]])) {
        $error = 'Eso no es una imagen JPG, PNG o WebP.';
      } elseif ($info[0] !== PUB_ANCHO_OBLIGATORIO || $info[1] !== PUB_ALTO_OBLIGATORIO) {
        /* Exacto, no un minimo ni la proporcion: 1680x720 tiene la misma razon 7:3 y aqui
           se rechaza igual. La medida sale de PUB_ANCHO/ALTO_OBLIGATORIO, nunca repetida. */
        $error = 'La creatividad debe medir exactamente ' . PUB_ANCHO_OBLIGATORIO . ' x '
               . PUB_ALTO_OBLIGATORIO . ' px. La imagen seleccionada mide '
               . (int) $info[0] . ' x ' . (int) $info[1] . ' px.';
      } elseif (!pub_carpeta_lista()) {
        $error = 'No puedo escribir en ' . PUB_URL . '. Crea la carpeta en el servidor y dale permiso de escritura.';
      } else {
        $nombre  = bin2hex(random_bytes(8)) . '.' . HERO_TIPOS[$info[2]];
        $destino = PUB_DIR . '/' . $nombre;
        if (!@move_uploaded_file($f['tmp_name'], $destino)) {
          $error = 'No he podido guardar la imagen.';
        } elseif (@getimagesize($destino) === false) {
          @unlink($destino);
          $error = 'La imagen ha llegado rota. Vuelve a intentarlo.';
        } else {
          @chmod($destino, 0644);
          $b = is_array($estado['publicidad']['banner'] ?? null) ? $estado['publicidad']['banner'] : [];
          $anterior = (string) ($b['img'] ?? '');
          $b['img'] = $nombre;
          if (!isset($b['on'])) $b['on'] = false;
          $estado['publicidad'] = is_array($estado['publicidad'] ?? null) ? $estado['publicidad'] : [];
          $estado['publicidad']['banner'] = $b;
          if (!guardar_estado($estado)) {
            /* compensacion: el estado no ha cambiado, la imagen nueva sobra */
            if (!pub_borrar($nombre)) {
              registrar_acceso('publicidad: ' . $nombre . ' queda huerfana tras fallo de estado.json');
            }
            $error = 'No se ha podido escribir estado.json. La imagen nueva se ha descartado.';
          } else {
            $aviso = 'Imagen guardada. El banner esta ' . strtolower(pub_estado_banner($b)) . '.';
            if ($anterior !== '' && $anterior !== $nombre && !pub_borrar($anterior)) {
              registrar_acceso('publicidad: la creatividad anterior ' . $anterior . ' queda como residuo');
              $aviso .= ' (La imagen anterior no se ha podido borrar; queda registrada.)';
            }
          }
        }
      }
    }
  }

  /* Quitar la creatividad: primero el estado deja de apuntarla, despues se borra el fichero.
     Al reves, un fallo a mitad dejaria la carta pidiendo una imagen que ya no existe. */
  if (isset($_POST['eliminar_banner'])) {
    $pestana = 'publicidad';
    $bAct = is_array($estado['publicidad']['banner'] ?? null) ? $estado['publicidad']['banner'] : [];
    $actual = (string) ($bAct['img'] ?? '');
    if ($actual === '') {
      $aviso = 'No hay imagen que quitar.';
    } else {
      $b = $bAct;
      unset($b['img']);
      $estado['publicidad']['banner'] = $b;
      if (!guardar_estado($estado)) {
        $error = 'No se ha podido escribir estado.json.';
      } else {
        $aviso = 'Imagen quitada. Sin imagen el banner no sale.';
        if (!pub_borrar($actual)) {
          registrar_acceso('publicidad: ' . $actual . ' queda como residuo tras quitarla del estado');
          $aviso .= ' (El fichero no se ha podido borrar; queda registrado.)';
        }
      }
    }
  }

  /* Poner el récord a cero. Va en su propio botón y no en el Guardar de la pestaña: es una
     acción destructiva y no se pulsa por inercia al lado de un interruptor. */
  /* Borrar el nombre de una marca sin borrar la marca. Es lo que se usa cuando alguien escribe
     algo feo: la lista de palabrotas de record.php quita el 90% y esto es lo que de verdad
     protege, porque una lista nunca esta completa. */
  if (isset($_POST['borrar_nombre'])) {
    $pestana = 'juego';
    $cual = (string) $_POST['borrar_nombre'];
    $top = record_leer();
    $tocado = false;
    foreach ($top as $i => $x) {
      if ((string) $i !== $cual) continue;
      $top[$i]['nombre'] = '';
      $top[$i]['pais'] = '';
      $tocado = true;
    }
    if (!$tocado) {
      $error = 'Esa marca ya no está.';
    } elseif (record_guardar($top)) {
      $aviso = 'Nombre borrado. La puntuación se queda.';
    } else {
      $error = 'No he podido escribir el marcador.';
    }
  }

  /* Vaciar las copias. Va en su propio formulario y no en ningun Guardar: borra algo que no
     se recupera. Hizo falta al cambiar la regla: las copias de antes son fotos de cualquier
     guardado y no sirven para lo unico que ahora se quiere revertir, un cambio de precios. */
  if (isset($_POST['vaciar_copias'])) {
    $pestana = 'marca';
    $n = copias_vaciar();
    $aviso = $n === 0
      ? 'No había ninguna copia que borrar.'
      : 'Borradas ' . $n . ' copia(s). La próxima se escribe en el siguiente cambio de precios.';
  }

  if (isset($_POST['reiniciar_record'])) {
    $pestana = 'juego';
    if (record_a_cero()) {
      $aviso = 'Récord a cero. La próxima partida que puntúe pone el nuevo.';
    } else {
      $error = 'No he podido borrar record.json.';
    }
  }

  if (isset($_POST['precios_reset'])) {
    $pestana = 'precios';
    $estado['prices'] = [];
    if (guardar_estado($estado)) $aviso = 'Precios devueltos a los de la carta.';
    else $error = 'No se ha podido escribir estado.json.';
  }
}

/* ---------------------------------------------------------------- datos para la vista */
$estadoCrudo    = leer_estado();
$migraAnalisis  = estado_analizar($estadoCrudo, $porKey, $mapaLegacy, $catIdDe);
$migraColisiones = $migraAnalisis['colisiones'];
$estado         = estado_vista($estadoCrudo, $porKey, $mapaLegacy, $catIdDe);
if ($migraColisiones) {
  registrar_acceso('estado con colisiones dishId/clave vieja: ' . count($migraColisiones)
    . ' - guardados bloqueados');
}

/* Las fotos de portada que se subieron antes de que existieran las variantes se ponen al día
   solas, por visita al panel y con un presupuesto de tiempo. Ver hero_completar_pendientes():
   lo que hay que evitar es pasarse del máximo de una petición en un hosting compartido, no
   hacer pocas. Mientras falten, la carta sirve el original y se ve igual; sólo pesa más. */
if (is_array($estado['hero'] ?? null) && $estado['hero']) {
  hero_completar_pendientes($estado['hero']);
  $conVariantes = hero_con_variantes($estado['hero']);
  /* Se escribe sólo si ha cambiado, y sin pasar por guardar_estado(): esto es un dato derivado
     del disco, no una decisión del restaurante. Con la ceremonia entera cada visita al panel
     dejaría una copia de seguridad y movería la fecha de «actualizado», que es la que la carta
     enseña. */
  if (($estado['heroWebp'] ?? null) !== $conVariantes) {
    $estado['heroWebp'] = $conVariantes;
    $json = json_encode($estado, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json !== false) {
      $tmp = ESTADO_PATH . '.' . bin2hex(random_bytes(6)) . '.tmp';
      if (@file_put_contents($tmp, $json, LOCK_EX) !== false && !@rename($tmp, ESTADO_PATH)) @unlink($tmp);
    }
  }
}
/* DOS fechas y no una, y conviene no confundirlas:
 *
 *   $hoy      la de SERVICIO. Retrocede un dia antes de las 6:00 y es la que decide que
 *             agotados siguen puestos: lo marcado a las 22:00 sigue marcado a las 02:00.
 *   $hoyReal  la del RELOJ de Canarias. Es la que fecha el panel, porque quien lo abre a la
 *             una de la madrugada del miercoles espera leer miercoles y no martes.
 *
 * Coinciden 18 horas de cada 24. Entre las 00:00 y el corte no, y ahi el panel lo dice. */
$hoy      = fecha_servicio();
$hoyReal  = fecha_contador();
$agotados = [];
foreach ((array) $estado['soldOut'] as $k => $d) { if ($d === $hoy) $agotados[$k] = true; }
$tags     = is_array($estado['tags']) ? $estado['tags'] : [];
$oferta   = is_array($estado['offer']) ? array_replace(estado_vacio()['offer'], $estado['offer']) : estado_vacio()['offer'];
if (!is_array($oferta['keys'])) $oferta['keys'] = [];
if (!is_array($oferta['cats'])) $oferta['cats'] = [];

/* Lo que la carta está viendo AHORA, con el reloj del restaurante. Sin esto, «la oferta está
   activa» en el panel y «no se ve nada» en la web parecen contradecirse, cuando casi siempre
   es que la franja no está abierta. */
$ahora_canarias = new DateTimeImmutable('now', new DateTimeZone(TZ));
$min_ahora = ((int) $ahora_canarias->format('G')) * 60 + (int) $ahora_canarias->format('i');
$dia_ahora = (int) $ahora_canarias->format('N');
$oferta_corriendo = $oferta['on']
  && ($oferta['cats'] || $oferta['keys'])
  && in_array($dia_ahora, (array) $oferta['days'], true)
  && $min_ahora >= (int) $oferta['from']
  && $min_ahora < (int) $oferta['to'];
$precios  = is_array($estado['prices']) ? $estado['prices'] : [];
/* Las fotos NO se cruzan con la lista de platos, al contrario que los agotados. Un plato que
   hoy no está —porque se le cambió el nombre en la carta— vuelve mañana si se deshace el
   cambio, y con él su foto. Borrar la entrada aquí sería borrar el trabajo de alguien por un
   despiste de una tarde. Lo que queda huérfano es el archivo, y eso se ve por FTP. */
/* $fotosPlato y no $fotos: diecinueve lineas mas abajo, $fotos son las de la PORTADA. Con el
   mismo nombre, la lista de platos se pintaba entera sin fotos y sin dar un solo error. */
$fotosPlato = is_array($estado['fotos'] ?? null) ? $estado['fotos'] : [];
$catsVisibles = [];
foreach ($lista as $p) { $catsVisibles[$p['cat']] = ($catsVisibles[$p['cat']] ?? 0) + 1; }
$listaKeys = array_flip(array_column($lista, 'key'));
$agotados = array_intersect_key($agotados, $listaKeys);
/* «Corriendo ahora mismo» sólo si la oferta rebaja algo que se vea. */
$oferta_corriendo = $oferta_corriendo && (
  array_intersect((array) $oferta['cats'], array_values($catIdDe))
  || array_intersect((array) $oferta['keys'], array_keys($listaKeys))
);
$juego    = is_array($estado['game']) ? array_replace(estado_vacio()['game'], $estado['game']) : estado_vacio()['game'];
$record   = record_leer();
$bannerPub = is_array($estado['publicidad'] ?? null) && is_array($estado['publicidad']['banner'] ?? null)
  ? $estado['publicidad']['banner'] : null;
/* El enlace de resenas lo pinta Marca. No era del premio y no se va con el. */
$resena   = is_array($estado['review'] ?? null) ? array_replace(estado_vacio()['review'], $estado['review']) : estado_vacio()['review'];
$csrf     = (string) ($_SESSION['csrf'] ?? '');
$opinion  = is_array($estado['reviews'] ?? null)
  ? array_replace(estado_vacio()['reviews'], $estado['reviews'])
  : estado_vacio()['reviews'];
$fotos    = is_array($estado['hero'] ?? null) ? array_values($estado['hero']) : [];
$redes    = is_array($estado['social'] ?? null)
  ? array_replace(estado_vacio()['social'], $estado['social'])
  : estado_vacio()['social'];
$marca = is_array($estado['marca'] ?? null)
  ? array_replace(estado_vacio()['marca'], $estado['marca'])
  : estado_vacio()['marca'];
/* El color de verdad ahora mismo: el override si hay uno guardado y valido, si no el de
   build. `$colorPrincipalOverride` es null cuando no hace falta pintar nada encima del
   tokens.css de siempre -- ni override guardado, ni override que ya no se leyera bien
   (un cliente.mjs cambiado a mano tras guardar el override, caso raro pero posible). */
$colorPrincipalActual = defined('CLIENTE_COLOR_PRINCIPAL') ? CLIENTE_COLOR_PRINCIPAL : '#FF7517';
$colorPrincipalOverride = null;
if ($marca['colorPrincipal'] !== '') {
  $colorPrincipalOverride = derivar_principal($marca['colorPrincipal']);
  if ($colorPrincipalOverride !== null) $colorPrincipalActual = $marca['colorPrincipal'];
}

/* Marca va la última a propósito: se toca una vez y las otras cuatro, cada día. */
/* ---------------------------------------------------------------- datos, antes de pintar
 * Se hace venga o no venga pedida la pestana: son cuatro glob y una suma de enteros, y asi el
 * HTML de mas abajo solo pinta. Lo que si hace falta es sesion —ver la guarda de aqui debajo—,
 * porque esto tambien escribe. */
$dt = null;
/* Con sesion y no siempre. Esto no solo lee: consolida, escribe el JSON del mes y borra los
   ficheros de dia. Cualquiera que supiera la direccion del panel disparaba esas escrituras sin
   haber entrado. No se filtraba nada —la pestana no se pinta sin sesion— pero borrar ficheros
   por una peticion anonima no se sostiene.
   A cambio, la consolidacion deja de correr si nadie entra al panel en todo un mes. Se asume:
   se entra a diario para los agotados, y lo peor que pasa son treinta ficheros de mas. */
if (DATOS_ACTIVO && $dentro) {
  /* Se mira la carpeta de datos, no la de encima. Si admin/ es escribible y admin/datos/ no,
     esto decia que todo iba bien mientras datos.php no podia apuntar nada. Cuando todavia no
     existe se mira la de encima, que es quien tiene que dejar crearla. */
  /* Por el mismo motivo que las carpetas de imagenes: is_writable() miente en OneDrive, en
     unidades de red y con ACL de Windows. Ver carpeta_escribible(). */
  $dt = ["escribible" => is_dir(DATOS_DIR) ? carpeta_escribible(DATOS_DIR)
                                           : carpeta_escribible(dirname(DATOS_DIR))];
  /* Contar gente va por dia natural: es la misma fecha que la cabecera, $hoyReal, y no la de
     servicio, que corre el corte a las 6:00 porque eso es cosa de los agotados. */
  $hoyD = new DateTimeImmutable($hoyReal);
  if (datos_hay()) datos_consolidar($hoyD->format("Y-m"));
  $serie = datos_hay() ? datos_serie() : [];
  $dt["serie"] = $serie;
  $dt["desde"] = $serie ? array_key_first($serie) : null;

  /* HOY contra el MISMO DIA de la semana pasada, no contra ayer: el domingo no se parece al
     sabado ni de lejos, y comparar con ayer daria una catastrofe cada domingo. */
  $dt["hoy"]      = (int) ($serie[$hoyReal] ?? 0);
  $dt["hoyAntes"] = (int) ($serie[$hoyD->modify("-7 day")->format("Y-m-d")] ?? 0);

  /* SIEMPRE contra el mismo numero de dias. Cuatro dias de esta semana contra los siete de la
     anterior pintaria un desplome inventado cada lunes, martes y miercoles. */
  $lunes = $hoyD->modify("monday this week");
  $dt["diasSemana"] = (int) $lunes->diff($hoyD)->days + 1;
  $dt["semana"]      = datos_rango($serie, $lunes->format("Y-m-d"), $dt["diasSemana"]);
  $dt["semanaAntes"] = datos_rango($serie, $lunes->modify("-7 day")->format("Y-m-d"), $dt["diasSemana"]);

  /* Y el mes igual: los mismos N dias del mes anterior. Ojo con que un 31 de marzo no tiene 31
     de febrero — se compara con lo que el mes anterior de si. */
  $dt["diaDelMes"] = (int) $hoyD->format("j");
  $mesAnt = $hoyD->modify("first day of previous month");
  $dt["mes"]      = datos_rango($serie, $hoyD->format("Y-m-01"), $dt["diaDelMes"]);
  $dt["mesAntes"] = datos_rango($serie, $mesAnt->format("Y-m-01"),
                      min($dt["diaDelMes"], (int) $mesAnt->format("t")));
  $dt["mesNombre"]    = MESES[(int) $hoyD->format("n")];

  /* ---- los platos mas consultados ----
     Se consolida aqui y no en cada consulta: el trabajo lo paga quien mira los numeros una vez
     al dia, no el comensal sentado en la mesa. Ver vistas_consolidar(). */
  vistas_consolidar();
  $vserie = vistas_serie();
  $dt["vhay"] = $vserie !== [];
  /* La equivalencia id -> plato se rehace sola desde la carta de ahora: no hay tabla que
     mantener. Un plato que se fue de la carta desaparece de la tabla, y sus consultas con el. */
  $porVid = [];
  foreach ($lista as $p) $porVid[substr(sha1((string) $p["key"]), 0, 8)] = $p;
  /* Las lineas escritas antes de la migracion llevan el hash de la clave vieja: se vuelcan al
     cajon del dishId para que el historial de un plato sea UNA fila y no dos. */
  $vidCanon = [];
  foreach ($lista as $p) {
    if (!empty($p['legacy'])) $vidCanon[substr(sha1((string) $p['legacy']), 0, 8)] = substr(sha1((string) $p['key']), 0, 8);
  }
  foreach ($vserie as $dia => $ids) {
    $m = [];
    foreach ($ids as $id => $n) { $c = $vidCanon[$id] ?? $id; $m[$c] = ($m[$c] ?? 0) + (int) $n; }
    arsort($m);
    $vserie[$dia] = $m;
  }
  $dt["vid"] = $porVid;
  /* Los mismos tres periodos que las tarjetas de arriba, contados igual, para que el porcentaje
     se pueda leer contra la cifra que tiene al lado. */
  $dt["vhoy"]    = vistas_rango($vserie, $hoyReal, 1);
  $dt["vsemana"] = vistas_rango($vserie, $lunes->format("Y-m-d"), $dt["diasSemana"]);
  $dt["vmes"]    = vistas_rango($vserie, $hoyD->format("Y-m-01"), $dt["diaDelMes"]);

  /* ¿Ya contabamos cuando empieza el periodo con el que se compara? De eso depende que un cero
     signifique «cerramos» o «entonces no habia contador». */
  $desde = $dt["desde"];
  $yaSe = fn(string $f): bool => $desde !== null && $desde <= $f;
  $dt["habiaHoy"]    = $yaSe($hoyD->modify("-7 day")->format("Y-m-d"));
  $dt["habiaSemana"] = $yaSe($lunes->modify("-7 day")->format("Y-m-d"));
  $dt["habiaMes"]    = $yaSe($mesAnt->format("Y-m-01"));

  /* Treinta dias, no catorce: la grafica es una linea y con catorce puntos no se ve una
     tendencia, se ve un zigzag. */
  $dt["dias"] = [];
  for ($i = 29; $i >= 0; $i--) {
    $f = $hoyD->modify("-" . $i . " day");
    $dt["dias"][] = ["fecha" => $f->format("Y-m-d"), "n" => (int) ($serie[$f->format("Y-m-d")] ?? 0)];
  }

  /* Seis meses, y NO se pintan los anteriores al primer dato: un cero ahi se lee como «ese mes
     no vino nadie» en vez de como «ese mes todavia no contabamos». */
  $dt["meses"] = [];
  for ($i = 5; $i >= 0; $i--) {
    $m = $hoyD->modify("first day of this month")->modify("-" . $i . " month");
    $clave = $m->format("Y-m");
    if ($dt["desde"] !== null && $clave < substr($dt["desde"], 0, 7)) continue;
    $n = 0;
    foreach ($serie as $f => $v) if (strncmp($f, $clave, 7) === 0) $n += $v;
    $dt["meses"][] = ["clave" => $clave, "nombre" => MESES[(int) $m->format("n")] . " " . $m->format("Y"),
                      "n" => $n, "encurso" => $clave === $hoyD->format("Y-m")];
  }
  /* El pico del periodo se marca siempre: es lo primero que se busca —cuando fue el mejor dia—
     y hacerlo buscar tocando puntos uno a uno seria absurdo. */
  $dt["pico"] = null;
  foreach ($dt["dias"] as $i => $x) {
    if ($dt["pico"] === null || $x["n"] > $dt["dias"][$dt["pico"]]["n"]) $dt["pico"] = $i;
  }
  if ($dt["pico"] !== null && $dt["dias"][$dt["pico"]]["n"] <= 0) $dt["pico"] = null;
  /* Una tira de barras por baldosa, cada una con SU ventana: la de Hoy son los siete ultimos
     dias —un domingo no se entiende sin ver los domingos de al lado—, la de la semana va de
     lunes a hoy y la del mes son los dias del mes en curso. */
  $tira = function (string $desde, int $n) use ($serie) {
    $d0 = new DateTimeImmutable($desde);
    $r = [];
    for ($k = 0; $k < $n; $k++) {
      $r[] = (int) ($serie[$d0->modify("+" . $k . " day")->format("Y-m-d")] ?? 0);
    }
    return $r;
  };
  $dt["tiraHoy"]    = $tira($hoyD->modify("-6 day")->format("Y-m-d"), 7);
  /* La semana y el mes se pintan ENTEROS y los dias que aun no han llegado van en hueco. Un
     lunes, la semana era una sola barra a todo el ancho de la baldosa: eso no es una grafica,
     es un bloque. Asi la tira mide siempre lo mismo y se ve cuanto queda por delante. */
  $dt["diasDelMes"]  = (int) $hoyD->format("t");
  $dt["tiraSemana"] = $tira($lunes->format("Y-m-d"), 7);
  $dt["tiraMes"]    = $tira($hoyD->format("Y-m-01"), $dt["diasDelMes"]);

  /* El tope de DATOS_MAX_DIA cortaba el dia en silencio. Sigue cortando —es lo que protege el
     disco— pero ahora se dice, porque un numero topado no es un numero. */
  $dt["topado"] = $serie && max($serie) >= DATOS_MAX_DIA;
  $dt["total"] = array_sum($serie);
}

$PESTANAS = ['agotados' => 'Agotados hoy', 'destacados' => 'Destacados',
             'ofertas' => 'Ofertas', 'precios' => 'Precios', 'juego' => 'Juego', 'publicidad' => 'Publicidad',
             'datos' => 'Analítica', 'marca' => 'Marca'];
if (!DATOS_ACTIVO)   unset($PESTANAS['datos']);     // la fuente es el contrato: ver config.php
if (!CLIENTE_JUEGO)  unset($PESTANAS['juego']);     // sin la capacidad no hay nada que apagar
if (!CLIENTE_PUBLICIDAD) unset($PESTANAS['publicidad']); // idem, Fase 7
if (!isset($PESTANAS[$pestana])) $pestana = 'agotados';
$CUENTAS = [
  'agotados'   => count($agotados),
  'destacados' => count($tags),
  'ofertas'    => $oferta['on'] ? 1 : 0,
  'precios'    => count($precios),
  'juego'      => $juego['on'] ? 1 : 0,
  'publicidad' => pub_estado_banner($bannerPub) === 'ACTIVO' ? 1 : 0,
  'datos'      => 0,      // el contador no es una cuenta de cosas pendientes
  'marca'      => 0,      // no es una cuenta de nada: no lleva contador
];
?>
<!doctype html>
<html lang="es" translate="no" class="notranslate">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>La carta de hoy — <?= h(CLIENTE_NOMBRE) ?></title>
<?php /* Las mismas dos tipografías que la carta, escritas por el build. */ ?>
<?php @include __DIR__ . '/fuentes.html'; ?>
<link rel="stylesheet" href="tokens.css">
<?php if ($colorPrincipalOverride !== null): ?>
<style>
  /* El color que el propio restaurante guardo desde esta pestana, por encima del de
     build en tokens.css -- el panel es PHP, asi que aqui se recalcula en cada carga en
     vez de esperar a un runtime aparte (eso es lo que hace la carta publica, que es
     HTML estatico: ver aplicarMarca()/derivarPrincipal() en el <script> de gen.mjs). */
  :root{
    --accent:<?= h($colorPrincipalOverride['--accent']) ?>;
    --accent-ink:<?= h($colorPrincipalOverride['--accent-ink']) ?>;
    --metal:<?= h($colorPrincipalOverride['--metal']) ?>;
    --metal-ink:<?= h($colorPrincipalOverride['--metal-ink']) ?>;
    --badge-ink:<?= h($colorPrincipalOverride['--badge-ink']) ?>;
  }
</style>
<?php endif; ?>
<style>
  /* El panel es la carta puesta del revés: la misma tarjeta crema, pero flotando sobre el
     navy de la marca en vez de sobre el teal. Mismo juego tipográfico —Bricolage para lo que
     se mira, Source Serif para lo que se lee—, misma escala Fibonacci, mismos radios y la
     misma curva de movimiento. Los tokens y el link de las fuentes los escribe gen.mjs, así
     que un cambio de color en la carta llega aquí solo.

     Lo único que cambia es la densidad: aquí se trabaja de pie y con prisa, no se lee. */

  *,*::before,*::after{box-sizing:border-box}

  body{
    margin:0;
    background:var(--ink);
    color:var(--surface);
    font-family:var(--body-font);
    font-size:16px;
    line-height:1.5;
    -webkit-font-smoothing:antialiased;
  }

  /* ---------- la tarjeta ---------- */
  /* El mismo contenedor que la carta: 1570 de tope y 13px de aire a los lados. En 860 el
     panel dejaba media pantalla vacía en un portátil mientras las filas de plato se apretaban
     en 800px. Aquí hay 326 filas y cuarenta y una categorías: el ancho se usa. */
  .page{width:100%;max-width:1570px;margin:0 auto;padding:var(--s2) var(--s2) calc(96px + var(--s4))}
  .card-main{
    position:relative;               /* ancla de las insignias de sesión */
    background:var(--surface);
    color:var(--ink);
    border-radius:var(--r-card);
    box-shadow:var(--lift-card);
    /* El mismo aire arriba que a los lados: el hueco de más sobre el contenido era espacio
       muerto, y en una pantalla que se usa de pie con el móvil en la mano, espacio muerto es
       una fila de plato menos. */
    padding:var(--s3);
    /* Sin overflow:hidden. Recortar aquí parecía lo correcto para las esquinas redondeadas,
       pero un ancestro con overflow oculto anula el position:sticky del buscador: deja de
       pegarse y se va con el scroll. Nada se sale igualmente — .tools tiene los márgenes
       negativos justos del padding, y la fila de pestañas se recorta ella sola. */
  }
  @media (min-width:768px){
    .page{padding:var(--s3) var(--s3) calc(96px + var(--s5))}
    .card-main{padding:var(--s5)}
  }
  /* De portátil para arriba la tarjeta respira como la de la carta */
  @media (min-width:1200px){
    .card-main{padding:var(--s6)}
  }

  /* ---------- cabecera ---------- */
  .head{text-align:center;margin-bottom:var(--s4)}
  .head-eyebrow{
    margin:0 0 6px;
    font-family:var(--title-font);
    font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;
    color:var(--ink);
  }
  /* La fecha es el dato, así que va en cifras grandes y tabulares: cambia todos los días y
     no debe bailar de ancho al hacerlo. El día de la semana acompaña, en un peso menos. */
  .head h1{font-variant-numeric:tabular-nums}
  .head h1 .dia{font-weight:600;color:var(--muted)}
  @media (max-width:400px){
    .head h1 .dia{display:block;font-size:.62em;letter-spacing:0}
  }
  .head h1{
    margin:0;
    font-family:var(--title-font);
    font-size:clamp(26px,6vw,34px);
    font-weight:800;
    line-height:1.05;
    letter-spacing:-0.02em;
    color:var(--ink);
  }
  .head .sub{
    margin:6px 0 0;
    color:var(--muted);
    font-size:14px;
    line-height:1.45;
  }
  /* El aviso de la madrugada se lee antes que el pie de sesion: no es un adorno, es lo que
     explica por que la fecha de arriba no es la del movil de quien mira. */
  .head .sub-servicio{
    max-width:44ch;
    margin-inline:auto;
    color:var(--ink);
  }
  /* La chapa de version. Es para mirarla cuando algo no cuadra despues de subir, y por eso
     tiene que LEERSE cuando se mira.
     Lleva el mismo tratamiento que el pie de la carta publica (.site-footer en gen.mjs) y con
     los mismos tokens, no con una combinacion propia: misma familia, mismo cuerpo, misma
     interlinea, mismo color y centrada. Las dos caras del producto hablan con la misma voz.
     Antes .chapa-id iba a 11px con opacity .65 encima de --muted, que ya es un gris discreto
     de por si: el resultado era una linea practicamente invisible, y lo invisible era
     justamente el dato que se viene a buscar. Fuera el cuerpo reducido y fuera la opacidad;
     el numero se queda en cifras tabulares, que es lo suyo para comparar dos compilaciones. */
  .chapa{
    margin:var(--s4) auto var(--s3);
    text-align:center;
    /* El color NO es el --muted del pie publico, y no por capricho: alli el pie cae sobre el
       papel claro de la carta y aqui la chapa cuelga del BODY, que es --ink. El mismo token
       daria gris oscuro sobre tinta oscura -- medido: 1,9:1 en ciruela, 2,1 en laurel, 2,3 en
       onice, ilegible en los cinco temas. Se usa el token que ocupa ESE papel en esta cara del
       producto: --metal, que existe justamente para leerse sobre el fondo oscuro. Es el mismo
       criterio, no la misma constante.

       Va en la regla base y no colgado de .sin-entrar. Antes solo se aclaraba en la pantalla
       de acceso, pero la chapa esta sobre la tinta del body SIEMPRE -- es hermana de la
       tarjeta, no descendiente-- asi que dentro del panel se quedaba en el gris oscuro y no
       se veia. Y dentro del panel es cuando se mira: despues de subir. */
    color:var(--metal);
    font-family:var(--body-font);
    font-size:14px;
    line-height:24px;
  }
  .chapa strong{color:var(--surface);font-variant-numeric:tabular-nums}
  .chapa-id{font-variant-numeric:tabular-nums}
  .chapa-mal{color:var(--mal,#b3261e);font-weight:600}
  .head .sub a{color:var(--ink)}

  /* ---------- pestañas ---------- */
  /* La misma barra de categorías de la carta: una fila, con desplazamiento lateral cuando no
     cabe, y la activa rellena en teal. */
  .tabs{
    display:flex;gap:var(--s1);
    margin:0 calc(var(--s3) * -1) var(--s4);
    padding:2px var(--s3) var(--s2);
    /* el desbordamiento se recorta en el propio scroller, no en la tarjeta */
    overflow-x:auto;
    overscroll-behavior-x:contain;
    scrollbar-width:none;
  }
  .tabs::-webkit-scrollbar{display:none}
  /* Centradas mientras caben y pegadas al borde en cuanto desbordan. Los márgenes automáticos
     hacen eso solos; justify-content:center no, porque al desbordar deja el primer botón
     fuera de alcance por la izquierda. Es el mismo truco que la barra de categorías. */
  .tabs > :first-child{margin-left:auto}
  .tabs > :last-child{margin-right:auto}
  .tabs-wrap{position:relative;margin:0 calc(var(--s3) * -1) var(--s4)}
  .tabs-wrap .tabs{margin:0}
  .tabs-wrap[hidden]{display:none}
  /* fundidos en los bordes: se apagan al llegar a cada extremo */
  .tabs-wrap::before,.tabs-wrap::after{
    content:"";position:absolute;top:0;bottom:var(--s2);width:var(--s5);z-index:2;pointer-events:none;
    transition:opacity var(--t-fast) var(--ease-out);
  }
  .tabs-wrap::before{left:0;background:linear-gradient(90deg,var(--surface),transparent)}
  .tabs-wrap::after{right:0;background:linear-gradient(270deg,var(--surface),transparent)}
  .tabs-wrap:not(.is-scrollable)::before,.tabs-wrap:not(.is-scrollable)::after,
  .tabs-wrap.at-start::before,.tabs-wrap.at-end::after{opacity:0}
  .tabs-arrow{
    position:absolute;top:50%;z-index:3;display:none;align-items:center;justify-content:center;
    width:40px;height:40px;margin-top:-24px;padding:0;border:0;border-radius:var(--r-pill);
    background:var(--chip);color:var(--ink);cursor:pointer;box-shadow:var(--lift-fab);
    transition:opacity var(--t-fast) var(--ease-out),transform var(--t-press) var(--ease-out);
  }
  .tabs-arrow svg{width:18px;height:18px}
  .tabs-arrow-prev{left:4px}
  .tabs-arrow-next{right:4px}
  .tabs-arrow:not(:disabled):active{transform:scale(.92)}
  .tabs-arrow:disabled{opacity:.3;cursor:default}
  .tabs-arrow:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  @media (min-width:768px){
    .tabs-wrap{margin-left:calc(var(--s5) * -1);margin-right:calc(var(--s5) * -1)}
    .tabs-wrap.is-scrollable .tabs-arrow{display:flex}
    .tabs-wrap.is-scrollable .tabs{padding-left:52px;padding-right:52px}
  }
  @media (min-width:1200px){
    .tabs-wrap{margin-left:calc(var(--s6) * -1);margin-right:calc(var(--s6) * -1)}
  }
  .tabs button{
    flex:0 0 auto;
    display:inline-flex;align-items:center;gap:var(--s1);
    min-height:48px;padding:0 var(--s3);   /* 48: mismo alto que el buscador y sus filtros */
    border-radius:var(--r-pill);
    background:var(--chip);
    color:var(--muted);
    font-family:var(--title-font);
    font-size:15px;font-weight:600;
    text-decoration:none;
    transition:background-color var(--t-fast) ease,color var(--t-fast) ease,transform var(--t-press) var(--ease-out);
  }
  .tabs button:active{transform:scale(.97)}
  .tabs button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .tabs button.on{background:var(--solid);color:var(--solid-ink)}
  .tabs .n{
    min-width:20px;padding:0 6px;
    border-radius:var(--r-pill);
    background:color-mix(in srgb,var(--ink) 10%,transparent);
    font-size:12px;font-variant-numeric:tabular-nums;text-align:center;
  }
  .tabs button.on .n{background:color-mix(in srgb,var(--surface) 22%,transparent)}
  @media (hover:hover) and (pointer:fine){
    .tabs button:not(.on):hover{color:var(--ink)}
  }

  /* ---------- bloques ---------- */
  h2{
    font-family:var(--title-font);
    font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
    color:var(--ink);
    margin:var(--s4) 0 var(--s2);
  }
  .card{
    background:transparent;
    border-top:1px solid var(--hairline);
    padding:var(--s2) 0 0;
    margin-bottom:var(--s3);
  }
  .hint{color:var(--muted);font-size:14px;line-height:1.5;margin:0 0 var(--s3)}
  .hint strong{color:var(--ink);font-weight:600;font-family:var(--title-font)}
  .msg{
    border-radius:var(--r-sheet);
    padding:var(--s2) var(--s3);
    margin-bottom:var(--s3);
    font-size:15px;line-height:1.45;
  }
  .msg.ok{background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent-ink)}
  .msg.bad{background:color-mix(in srgb,var(--offer) 10%,transparent);color:var(--offer)}
  .msg code{font-family:ui-monospace,monospace;font-size:.92em}
  .demo-salir{margin-top:var(--s2)}
  .demo-salir > summary{
    cursor:pointer;
    display:inline-block;
    min-height:40px;line-height:40px;
    font-family:var(--title-font);font-weight:600;
  }
  .demo-salir form{max-width:320px;margin-top:var(--s2)}
  .demo-salir .fld{color:inherit}
  .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
      clip:rect(0 0 0 0);white-space:nowrap;border:0}

  /* ---------- resumen ---------- */
  .resumen{border-top:0;padding:0}
  .res-line{
    display:grid;grid-template-columns:1fr auto;align-items:center;
    gap:2px var(--s3);padding:var(--s2) 0;
  }
  .res-lbl{
    grid-column:1;
    font-family:var(--title-font);
    font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
    color:var(--ink);
  }
  .res-val{
    grid-column:1;
    font-family:var(--title-font);
    font-size:26px;font-weight:800;line-height:1.1;
    font-variant-numeric:tabular-nums;
  }
  .res-line .ghost{grid-column:2;grid-row:1 / span 2}

  /* ---------- buscador y filtros ---------- */
  .tools{
    position:sticky;top:0;z-index:10;
    background:var(--surface);
    margin:0 calc(var(--s3) * -1);
    padding:var(--s3) var(--s3) var(--s2);
  }
  @media (min-width:768px){
    .tools{margin:0 calc(var(--s5) * -1);padding:var(--s3) var(--s5) var(--s2)}
  }
  @media (min-width:1200px){
    .tools{margin:0 calc(var(--s6) * -1);padding:var(--s3) var(--s6) var(--s2)}
  }
  .search{
    width:100%;
    min-height:48px;padding:0 var(--s3);   /* 48: como las pestañas y los filtros */
    border:1px solid var(--border);
    border-radius:var(--r-pill);
    background:#fff;color:var(--ink);
    font-family:var(--body-font);font-size:16px;
  }
  .search::placeholder{color:var(--muted)}
  .search:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:transparent}
  .chips{display:flex;gap:var(--s1);margin-top:var(--s2)}
  /* De tablet para arriba, buscador y filtros en la misma línea: el cajón estira y los dos
     botones se quedan a su ancho a la derecha. En móvil siguen uno debajo de otro. */
  @media (min-width:768px){
    .tools{display:flex;align-items:center;gap:var(--s2)}
    .search{flex:1 1 auto;min-width:0}
    .chips{flex:0 0 auto;margin-top:0}
  }
  .chip{
    background:var(--chip);color:var(--muted);
    font-family:var(--title-font);font-size:14px;font-weight:600;
    padding:0 var(--s3);min-height:48px;
  }
  .chip.is-on{background:var(--ink);color:var(--surface)}

  /* ---------- filas ---------- */
  /* Idénticas a las de la carta: nombre en Bricolage, grupo en serif apagado, filete de 1px. */
  .row{
    display:flex;align-items:center;gap:var(--s2);
    min-height:60px;padding:var(--s1) 0;
    border-bottom:1px solid var(--hairline);
    transition:background-color var(--t-fast) ease;
  }
  .row:last-child{border-bottom:0}
  .tick{display:flex;align-items:center;justify-content:center;
        width:44px;height:44px;flex:0 0 auto;margin-left:-6px;cursor:pointer}
  .tick input{width:24px;height:24px;accent-color:var(--offer);cursor:pointer}
  .tick:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:-2px;border-radius:var(--r-sheet)}
  .num{
    flex:0 0 auto;min-width:34px;
    font-family:var(--title-font);font-size:12px;font-weight:600;
    color:var(--muted);font-variant-numeric:tabular-nums;
  }
  .nm{flex:1 1 auto;min-width:0;font-family:var(--title-font);font-size:16px;font-weight:600;line-height:1.3}
  .nm small{
    display:block;margin-top:2px;
    font-family:var(--body-font);font-size:13px;font-weight:400;color:var(--muted);
  }
  /* ---------- foto del plato ----------
     El botón de cámara vive al final de la fila, con los mismos 44 px de área táctil que la
     casilla de agotado. Apagado dice «aquí se puede poner foto»; encendido, en el acento de la
     marca, dice «este plato ya la tiene» — y es también el botón para cambiarla. */
  .camara{
    flex:0 0 auto;width:44px;height:44px;min-height:0;padding:0;
    display:flex;align-items:center;justify-content:center;
    border:0;border-radius:var(--r-pill);background:transparent;
    color:var(--muted);opacity:.55;cursor:pointer;
    transition:opacity var(--t-fast) ease,color var(--t-fast) ease,background-color var(--t-fast) ease;
  }
  .camara svg{width:21px;height:21px}
  .camara:hover{opacity:1;background:var(--chip)}
  .camara.tiene{color:var(--accent);opacity:1}
  .camara.tiene::after{
    content:"";position:absolute;margin:22px 0 0 22px;
    width:7px;height:7px;border-radius:50%;background:var(--accent);
  }
  .camara:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}

  /* El recorte. Una capa sobre todo, con el cuadrado en el centro: lo que se ve dentro del
     cuadrado es exactamente lo que se guarda, ni más ni menos. */
  .recorte{
    position:fixed;inset:0;z-index:60;display:none;
    align-items:center;justify-content:center;padding:var(--s3);
    background:var(--scrim);
  }
  .recorte[open]{display:flex}
  .recorte .caja{
    width:min(420px,100%);max-height:100%;overflow:auto;
    padding:var(--s3);border-radius:var(--r-card);
    background:var(--surface);box-shadow:var(--lift-card);
  }
  .recorte h3{margin:0 0 var(--s1);font-family:var(--title-font);font-size:18px}
  .recorte .quien{margin:0 0 var(--s2);color:var(--muted);font-size:14px}
  .lienzo-caja{
    position:relative;width:100%;aspect-ratio:1/1;
    border-radius:var(--r-sheet);overflow:hidden;background:var(--chip);
    touch-action:none;cursor:grab;
  }
  .lienzo-caja:active{cursor:grabbing}
  .lienzo-caja canvas{display:block;width:100%;height:100%}
  .recorte .pista{margin:var(--s2) 0 0;color:var(--muted);font-size:13px;text-align:center}
  .recorte .fila-b{display:flex;gap:var(--s2);margin-top:var(--s2)}
  .recorte .fila-b button{flex:1}
  .recorte .zoom{width:100%;margin:var(--s2) 0 0;accent-color:var(--accent)}
  .recorte .err{margin:var(--s2) 0 0;color:var(--offer);font-size:14px}
  .recorte .err:empty{display:none}
  .camara.cargando{opacity:1;color:var(--accent)}
  .camara.cargando svg{animation:latir 900ms ease-in-out infinite}
  @keyframes latir{0%,100%{opacity:.35}50%{opacity:1}}
  @media (prefers-reduced-motion:reduce){ .camara.cargando svg{animation:none} }

  .row.is-out .nm{color:var(--offer);text-decoration:line-through;text-decoration-thickness:1px}
  .row.is-out .nm small{color:var(--offer);opacity:.75}
  .row.is-out .num{color:var(--offer)}
  @media (hover:hover) and (pointer:fine){
    .row:hover{background:color-mix(in srgb,var(--ink) 3%,transparent)}
  }

  /* ---------- formularios ----------
     Un campo es un rótulo pequeño en versales y una caja alta. Nada de bordes por todas
     partes: el fondo blanco sobre la crema ya separa lo editable de lo que sólo se lee, y el
     filete queda para el foco. Alturas de 52 y 56 porque esto se rellena con el dedo. */
  .fld{
    display:block;margin-bottom:var(--s3);
    font-family:var(--title-font);
    font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
    color:var(--ink);
  }
  .fld input,.fld select,.fld textarea{
    display:block;width:100%;margin-top:7px;
    min-height:56px;padding:0 var(--s3);
    border:1px solid transparent;
    border-radius:var(--r-sheet);
    background:#fff;
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 10%,transparent);
    color:var(--ink);
    font-family:var(--body-font);font-size:16px;font-weight:400;letter-spacing:0;text-transform:none;
    transition:box-shadow var(--t-fast) ease;
  }
  .fld select{
    /* la flecha del sistema en Bricolage y no la del navegador, que rompe la coherencia */
    appearance:none;-webkit-appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475864' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6l6 -6'/%3E%3C/svg%3E");
    background-repeat:no-repeat;
    background-position:right var(--s3) center;
    background-size:20px 20px;
    padding-right:var(--s5);
  }
  /* El textarea es el mismo campo, pero con varias lineas: necesita padding arriba y abajo
     y una altura que crezca con el contenido en vez del alto fijo de una sola linea. */
  .fld textarea{
    min-height:0;
    padding:var(--s2) var(--s3);
    line-height:1.5;
    resize:vertical;
  }
  .fld input:focus,.fld select:focus,.fld textarea:focus{
    outline:none;
    box-shadow:inset 0 0 0 2px var(--accent);
  }
  .fld input::placeholder,.fld textarea::placeholder{color:var(--muted)}
  .opt{color:var(--muted);font-weight:400;letter-spacing:.06em;text-transform:none}

  /* ---------- buscador de platos (Destacados) ---------- */
  .combo{position:relative;margin-bottom:var(--s3)}
  .combo-q{
    display:block;width:100%;min-height:56px;padding:0 var(--s3);
    border:1px solid transparent;border-radius:var(--r-sheet);
    background:#fff;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 10%,transparent);color:var(--ink);
    font-family:var(--body-font);font-size:16px;
    transition:box-shadow var(--t-fast) ease;
  }
  .combo-q:focus{outline:none;box-shadow:inset 0 0 0 2px var(--accent)}
  .combo-q.is-ok{box-shadow:inset 0 0 0 2px var(--accent);font-family:var(--title-font);font-weight:600}
  .combo-lista{
    position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:30;
    max-height:340px;overflow-y:auto;margin:0;padding:5px;list-style:none;
    border:1px solid var(--border);border-radius:var(--r-sheet);
    background:var(--surface);box-shadow:var(--lift-sheet);
  }
  .combo-lista[hidden]{display:none}
  .combo-op{
    display:flex;align-items:center;gap:var(--s2);
    min-height:48px;padding:6px 10px;border-radius:11px;cursor:pointer;
  }
  .combo-op.is-activo{background:var(--chip)}
  @media (hover:hover) and (pointer:fine){ .combo-op:hover{background:var(--chip)} }
  .combo-op.ya{opacity:.45;cursor:default}
  .combo-num{flex:0 0 auto;min-width:30px;font-family:var(--title-font);font-size:12px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}
  .combo-txt{flex:1 1 auto;min-width:0;font-family:var(--title-font);font-size:15px;font-weight:600;line-height:1.25}
  .combo-txt small{display:block;font-family:var(--body-font);font-size:12.5px;font-weight:400;color:var(--muted)}
  .combo-vacio{padding:12px 10px;color:var(--muted);font-size:14px}

  /* Dos o tres campos cortos por fila cuando hay sitio, uno debajo de otro cuando no. */
  .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0 var(--s3)}

  /* ---------- casillas en forma de píldora ----------
     Días de la semana, interruptores. La casilla del sistema desaparece y la píldora entera
     es el objetivo: 44 de alto y el estado se ve por relleno, no por un cuadradito. */
  .marcas{display:flex;flex-wrap:wrap;gap:var(--s1)}
  .marcas-centro{justify-content:center}

  /* ---------- el interruptor ----------
     Encender la oferta y apagarla se distinguían sólo por el relleno de una píldora, y se
     guardó una oferta entera con el interruptor en off sin que nadie lo notara: en el panel
     todo correcto, en la carta nada. Ahora el estado se dice con palabras —ENCENDIDA /
     APAGADA— además del color y de la posición de la bola. Tres señales, ninguna de ellas
     sólo el color. */
  .switch{
    display:flex;align-items:center;gap:var(--s2);
    width:100%;min-height:64px;
    margin-bottom:var(--s3);padding:0 var(--s3);
    border-radius:var(--r-sheet);
    background:var(--chip);
    cursor:pointer;
    transition:background-color var(--t-fast) ease;
  }
  .switch input{position:absolute;opacity:0;width:1px;height:1px}
  .switch-pista{
    flex:0 0 auto;
    display:block;width:56px;height:32px;padding:3px;
    border-radius:var(--r-pill);
    background:color-mix(in srgb,var(--ink) 22%,transparent);
    transition:background-color var(--t-fast) ease;
  }
  .switch-bola{
    display:block;width:26px;height:26px;
    border-radius:50%;
    background:var(--surface);
    box-shadow:0 1px 3px color-mix(in srgb,var(--ink) 35%,transparent);
    transition:transform var(--t-fast) var(--ease-out);
  }
  .switch-txt{
    font-family:var(--title-font);font-size:16px;font-weight:600;
    color:var(--muted);
  }
  .switch-on{display:none}
  .switch:has(input:checked){background:color-mix(in srgb,var(--solid) 10%,transparent)}
  .switch:has(input:checked) .switch-pista{background:var(--solid)}
  .switch:has(input:checked) .switch-bola{transform:translateX(24px)}
  .switch:has(input:checked) .switch-txt{color:var(--ink)}
  .switch:has(input:checked) .switch-on{display:inline}
  .switch:has(input:checked) .switch-off{display:none}
  .switch:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
  @media (prefers-reduced-motion:reduce){ .switch-bola{transition:none} }
  .marca{
    position:relative;
    display:inline-flex;align-items:center;gap:var(--s1);
    min-height:46px;padding:0 var(--s3);
    border-radius:var(--r-pill);
    background:var(--chip);
    color:var(--muted);
    cursor:pointer;
    font-family:var(--title-font);font-size:15px;font-weight:600;
    transition:background-color var(--t-fast) ease,color var(--t-fast) ease,transform var(--t-press) var(--ease-out);
  }
  .marca:active{transform:scale(.97)}
  .marca input{position:absolute;opacity:0;width:100%;height:100%;left:0;top:0;margin:0;cursor:pointer}
  .marca .tickmark{
    display:inline-flex;align-items:center;justify-content:center;
    width:18px;height:18px;flex:0 0 auto;
    border-radius:50%;
    background:color-mix(in srgb,var(--ink) 12%,transparent);
    color:transparent;
  }
  .marca .tickmark svg{width:12px;height:12px}
  .marca:has(input:checked){background:var(--solid);color:var(--solid-ink)}
  .marca:has(input:checked) .tickmark{background:color-mix(in srgb,var(--solid-ink) 28%,transparent);color:var(--solid-ink)}
  .marca:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}

  /* ---------- lista de categorías ----------
     Cuarenta y una casillas: en columnas para no hacer una tira de dos pantallas, con el
     filete separando cada una como en las filas de plato. */
  .cats{columns:2;column-gap:var(--s4)}
  @media (max-width:560px){ .cats{columns:1} }
  .cats label{
    display:flex;align-items:center;gap:var(--s2);
    min-height:48px;padding:var(--s1) 0;
    border-bottom:1px solid var(--hairline);
    break-inside:avoid;cursor:pointer;
  }
  .cats input{width:22px;height:22px;flex:0 0 auto;accent-color:var(--accent);cursor:pointer}
  .cats span{font-family:var(--title-font);font-size:15px;font-weight:600;line-height:1.25}
  .cats em{
    display:block;margin-top:1px;
    color:var(--muted);font-style:normal;font-family:var(--body-font);font-size:13px;font-weight:400;
  }
  .cats label:has(input:checked) span{color:var(--ink)}

  /* ---------- los porcentajes ----------
     Tres cifras grandes, que es lo que se toca. El texto de al lado ya explica que no
     publican nada; el botón sólo tiene que ser fácil de acertar. */
  .pcts{display:flex;gap:var(--s2);flex-wrap:wrap}
  .pct{
    flex:1 1 0;min-width:0;
    min-height:72px;padding:0 var(--s1);
    border-radius:var(--r-sheet);
    background:var(--chip);color:var(--ink);
    font-family:var(--title-font);font-size:24px;font-weight:800;letter-spacing:-0.02em;
    font-variant-numeric:tabular-nums;
  }
  @media (hover:hover) and (pointer:fine){
    .pct:hover{background:var(--solid);color:var(--solid-ink)}
  }

  /* El récord, en grande. Es un solo número y es lo único que hay que mirar en esta pestaña. */
  /* El podio del panel. Una linea por marca, con su bandera y su boton de quitar el nombre. */
  .podio-admin{list-style:none;margin:0;padding:0;display:grid;gap:2px}
  .podio-admin li{
    display:flex;align-items:center;gap:var(--s2);
    padding:9px 2px;border-top:1px solid var(--hairline);
  }
  .podio-admin li:first-child{border-top:0}
  .pod-pts{
    font-family:var(--title-font);font-size:22px;font-weight:700;color:var(--ink);
    font-variant-numeric:tabular-nums;min-width:2.6em;
  }
  .pod-quien{font-family:var(--title-font);font-weight:600;color:var(--ink)}
  .pod-quien.anon{color:var(--muted);font-weight:400;font-style:italic}
  .pod-bandera{border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.2);flex:0 0 auto}
  .pod-fecha{margin-left:auto;color:var(--muted);font-size:12px;
    font-variant-numeric:tabular-nums;white-space:nowrap}
  .pod-x{flex:0 0 auto}
  @media (max-width:520px){
    .podio-admin li{flex-wrap:wrap}
    .pod-fecha{margin-left:auto}
    .pod-x{width:100%;margin-top:4px}
  }

  /* ---------- precios ---------- */
  .prow{
    display:grid;grid-template-columns:34px 1fr auto auto;align-items:center;gap:var(--s2);
    min-height:56px;padding:var(--s1) 0;border-bottom:1px solid var(--hairline);
  }
  .prow:last-child{border-bottom:0}
  .prow .nm{font-size:15px}
  .pviejo{
    color:var(--muted);font-family:var(--title-font);font-size:14px;
    font-variant-numeric:tabular-nums;
    text-decoration:line-through;text-decoration-thickness:1px;
  }
  .pnuevo{
    width:96px;min-height:48px;padding:0 var(--s2);
    border:1px solid var(--border);border-radius:var(--r-sheet);
    background:#fff;color:var(--ink);
    font-family:var(--title-font);font-size:16px;font-weight:600;
    text-align:right;font-variant-numeric:tabular-nums;
  }
  .pnuevo:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:transparent}
  .pfijo{font-family:var(--title-font);font-weight:700;font-variant-numeric:tabular-nums}
  .badge{
    display:inline-block;padding:2px 9px;border-radius:var(--r-pill);
    /* --badge-ink: blanco fijo solo con el naranja de fabrica, adaptativo con
       cualquier otro colorPrincipal -- misma regla que todo badge con fondo --accent. */
    background:var(--accent);color:var(--badge-ink);
    font-family:var(--title-font);font-size:10px;font-weight:600;
    letter-spacing:.1em;text-transform:uppercase;
  }

  /* ---------- barra fija ---------- */
  /* Flota sobre el navy como el botón de categorías flota sobre el teal en la carta. */
  .bar{
    position:fixed;left:0;right:0;bottom:0;z-index:20;
    display:flex;gap:var(--s2);align-items:center;justify-content:space-between;
    max-width:1570px;margin:0 auto;
    padding:var(--s2) var(--s3) calc(var(--s2) + env(safe-area-inset-bottom));
    background:var(--surface);
    border-radius:var(--r-card) var(--r-card) 0 0;
    box-shadow:var(--lift-sheet);
  }
  /* Guardar y «Ver menú», juntos a la derecha de la barra. El enlace abre en OTRA pestaña a
     propósito: abriéndose aquí, lo que estuviera sin guardar se perdería al volver. Y lleva la
     hora en la dirección para que el navegador no enseñe la carta de antes del guardado, que es
     justo lo que se va a comprobar. */
  .bar .acciones{display:flex;align-items:center;gap:var(--s2);min-width:0}
  .bar .ver{
    display:inline-flex;align-items:center;justify-content:center;
    min-height:48px;padding:0 var(--s3);
    border:1px solid var(--border);border-radius:var(--r-pill);
    background:transparent;color:var(--muted);text-decoration:none;
    font-family:var(--title-font);font-size:15px;font-weight:600;white-space:nowrap;
    transition:color var(--t-fast) ease,border-color var(--t-fast) ease;
  }
  .bar .ver:hover{color:var(--ink);border-color:var(--muted)}
  button{
    font-family:var(--title-font);font-size:15px;font-weight:600;
    border:0;border-radius:var(--r-pill);
    padding:0 var(--s3);min-height:48px;
    cursor:pointer;touch-action:manipulation;
    transition:transform var(--t-press) var(--ease-out),background-color var(--t-fast) ease;
  }
  button:active{transform:scale(.97)}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .save{background:var(--ink);color:var(--surface);padding:0 var(--s4)}
  .ghost{
    background:transparent;color:var(--muted);
    border:1px solid var(--border);
    padding:0 var(--s3);min-height:44px;font-size:14px;
  }
  .ghost:hover{color:var(--ink);border-color:var(--muted)}
  .count{color:var(--muted);font-family:var(--title-font);font-size:14px;font-variant-numeric:tabular-nums}
  .count.dirty{color:var(--offer);font-weight:600}
  .count.dirty::after{content:" · sin guardar"}

  /* Copias de seguridad. Una fila por copia: qué es y de cuándo a la izquierda, los dos
     botones a la derecha. Por debajo de 560 el texto se lleva la fila entera y los botones
     caen debajo, que es lo único que cabe sin partir palabras. */
  /* Una fila de accion DENTRO de una tarjeta. NO es .bar: esa es la barra fija de abajo y
     hay exactamente una por pestana. Poner una segunda la superpone a la primera y deja el
     boton de Guardar debajo, invisible y sin poder pulsarse. */
  .fila-accion{
    display:flex;gap:var(--s2);align-items:center;justify-content:space-between;
    flex-wrap:wrap;margin-top:var(--s3);
  }
  /* ---- rejilla bento de la pestana Datos ----
     Portado de un componente de React con Tailwind (MiniChart, 21st.dev). Lo que se trae es la
     idea, no el codigo: aqui no hay React ni Tailwind ni paso de compilacion, asi que las
     utilidades se vuelven clases y los foreground/[0.06] se vuelven tokens del tema.

     Lo que se trae tal cual: la baldosa con borde tenue, el numero de la cabecera que cambia al
     recorrer las barras, y sobre todo el gesto de foco — la barra tocada al maximo, sus vecinas
     a media luz y el resto apagadas. Eso ultimo es lo que hace que treinta barras se lean. */

  /* ---------- platos mas consultados ----------
     Una fila por plato: el puesto, el nombre sobre su barra y las dos cifras a la derecha. La
     barra va DETRAS del nombre y no en una columna aparte: en un movil, una columna de barras
     de 40px no dice nada, y de fondo se lee de un vistazo quien manda. */
  .vp{margin-top:var(--s3)}
  .vp-cab{display:flex;align-items:center;justify-content:space-between;gap:var(--s2);flex-wrap:wrap}
  .vp-cab h3{margin:0;font-family:var(--title-font);font-size:17px}
  .vp-per{display:flex;gap:4px;background:var(--chip);padding:3px;border-radius:var(--r-pill)}
  .vp-per button{
    min-height:34px;padding:0 var(--s2);border:0;border-radius:var(--r-pill);
    background:transparent;color:var(--muted);
    font-family:var(--title-font);font-size:14px;font-weight:600;cursor:pointer;
  }
  .vp-per button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--lift-fab)}
  .vp-lista{margin-top:var(--s2);display:grid;gap:2px}
  .vp-fila{
    position:relative;display:flex;align-items:center;gap:var(--s2);
    padding:9px 12px;border-radius:var(--r-sheet);overflow:hidden;
  }
  .vp-barra{
    position:absolute;left:0;top:0;bottom:0;
    background:color-mix(in srgb,var(--accent) 16%,transparent);
    border-radius:var(--r-sheet);
  }
  /* Las celdas por encima de la barra, una a una. Con `.vp-fila > *` la barra entraba en el
     reparto —position:relative la devolvía al flujo— y se comía la fila entera: el nombre se
     quedaba en cero y la fila se leía «1 · 20 · 17%», sin plato. */
  .vp-pos,.vp-nom,.vp-n,.vp-pct{position:relative}
  .vp-pos{width:1.4em;color:var(--muted);font-family:var(--title-font);font-size:13px;
    font-weight:600;font-variant-numeric:tabular-nums}
  .vp-nom{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    font-family:var(--title-font);font-size:15px;font-weight:600}
  .vp-n{font-family:var(--title-font);font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
  .vp-pct{width:3.6em;text-align:right;color:var(--ink);
    font-family:var(--title-font);font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
  .vp-vacio{margin:var(--s2) 0 0;color:var(--muted);font-size:15px}
  .vp-mas{margin-top:var(--s2)}
  .vp-mas summary{cursor:pointer;color:var(--ink);font-family:var(--title-font);
    font-size:14px;font-weight:600}
  .vp-pie{margin:var(--s2) 0 0;color:var(--muted);font-size:13px;line-height:1.5}
  .dt-bento{display:grid;gap:var(--s2);grid-template-columns:1fr;margin-top:var(--s3)}
  @media (min-width:720px){.dt-bento{grid-template-columns:repeat(3,1fr)}
    .dt-baldosa.ancha{grid-column:1 / -1}}
  .dt-baldosa{
    position:relative;padding:var(--s3) var(--s3) var(--s2);
    border-radius:var(--r-card);
    background:color-mix(in srgb,var(--ink) 3%,var(--surface));
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 9%,transparent);
  }
  @media (prefers-reduced-motion: no-preference){
    .dt-baldosa{transition:background-color 200ms ease-out,box-shadow 200ms ease-out}
  }
  .dt-baldosa.tocando{
    background:color-mix(in srgb,var(--ink) 5%,var(--surface));
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 15%,transparent);
  }
  .dt-cab{display:flex;align-items:center;justify-content:space-between;gap:var(--s2);
    min-height:26px;margin-bottom:var(--s3)}
  .dt-cab .rotulo{display:flex;align-items:center;gap:6px}
  /* El punto late para decir «esto es de hoy», no por adorno. Es el unico movimiento perpetuo
     de la carta y del panel, y por eso es de 2px y muy lento. */
  .dt-vivo{width:7px;height:7px;border-radius:50%;background:var(--accent);flex:0 0 auto}
  @media (prefers-reduced-motion: no-preference){
    .dt-vivo{animation:dt-late 2.4s ease-in-out infinite}
  }
  @keyframes dt-late{0%,100%{opacity:1}50%{opacity:.35}}
  /* El numero de la cabecera: apagado en reposo, encendido mientras se recorre. */
  .dt-lectura{font-family:var(--title-font);font-size:19px;font-weight:700;
    font-variant-numeric:tabular-nums;color:var(--muted);opacity:.55;white-space:nowrap}
  .dt-lectura em{font-style:normal;font-size:12px;font-weight:600;margin-left:4px;opacity:.75}
  .dt-baldosa.tocando .dt-lectura{color:var(--ink);opacity:1}
  @media (prefers-reduced-motion: no-preference){
    .dt-lectura{transition:color 200ms ease-out,opacity 200ms ease-out}
  }

  /* ---- las barras ---- */
  .dt-barras{display:flex;align-items:flex-end;gap:2px;height:96px;touch-action:pan-y}
  .dt-b{position:relative;flex:1;display:flex;flex-direction:column;justify-content:flex-end;
    height:100%;min-width:0}
  .dt-b i{display:block;width:100%;border-radius:var(--r-pill);transform-origin:bottom;
    background:color-mix(in srgb,var(--accent) 26%,transparent)}
  /* El gesto que se trae del componente: la tocada entera, las de al lado a media luz y las
     demas apagadas. Sin esto, treinta barras del mismo color son una textura, no un dato. */
  .dt-barras.tocando .dt-b i{background:color-mix(in srgb,var(--accent) 11%,transparent)}
  .dt-barras.tocando .dt-b.vecina i{background:color-mix(in srgb,var(--accent) 34%,transparent)}
  .dt-barras.tocando .dt-b.viva i{background:var(--ink)}
  .dt-b.cero i{min-height:2px;background:color-mix(in srgb,var(--ink) 12%,transparent)}
  @media (prefers-reduced-motion: no-preference){
    .dt-b i{transition:background-color 200ms ease-out}
    .dt-b{animation:dt-sube 260ms cubic-bezier(.16,1,.3,1) backwards;
      animation-delay:calc(var(--i) * 6ms)}
  }
  @keyframes dt-sube{from{transform:scaleY(0);transform-origin:bottom}}
  /* El globo va sobre la barra, no sobre el dedo: en un movil el dedo tapa la barra y el globo
     encima seria lo unico que se ve. */
  .dt-globo{
    position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);
    padding:5px 9px;border-radius:var(--r-pill);
    background:var(--ink);color:var(--surface);
    font-family:var(--title-font);font-size:12px;font-weight:600;line-height:1.2;
    white-space:nowrap;font-variant-numeric:tabular-nums;pointer-events:none;
    opacity:0;visibility:hidden;
  }
  .dt-b.viva .dt-globo{opacity:1;visibility:visible}
  /* En los tres primeros y los tres ultimos dias el globo va anclado al borde en vez de
     centrado. Centrado se salia: mide unos 100px y las barras de los extremos estan a menos de
     50 del borde. Ahora mismo lo salva el relleno de la tarjeta, pero eso es suerte, no
     diseno: en una pantalla mas estrecha o con menos relleno quedaria cortado. */
  .dt-b:nth-child(-n+3) .dt-globo{left:0;transform:none}
  .dt-b:nth-last-child(-n+3) .dt-globo{left:auto;right:0;transform:none}
  @media (prefers-reduced-motion: no-preference){
    .dt-globo{transition:opacity 160ms ease-out,visibility 160ms}
  }
  /* ---- la tira pequena de cada baldosa ----
     Hereda todo de .dt-barras: mismo hueco, mismo redondeo, mismo color, misma entrada. Aqui
     solo baja la altura y se apaga el gesto del dedo — treinta barras piden un globo con el
     valor, siete de 30px de alto no piden nada. */
  .dt-barras.chica{height:32px;margin-top:var(--s2);touch-action:auto}
  .dt-barras.chica .dt-b{pointer-events:none}
  .dt-b.futuro i{background:color-mix(in srgb,var(--ink) 5%,transparent)}
  .dt-barras.chica + .dt-eje{margin-top:6px;font-size:10px;letter-spacing:.06em;
    text-transform:uppercase}

  /* ---- el chip de variacion ----
     Ocupa el hueco que dejaba la frase, en la cabecera y no debajo del numero: leido de arriba
     abajo queda «Hoy, un 10% menos, 54», que es el orden en que se pregunta. */
  .dt-chip{
    display:inline-flex;align-items:center;gap:3px;
    padding:2px 7px 2px 5px;border-radius:var(--r-pill);
    background:color-mix(in srgb,var(--ink) 8%,transparent);color:var(--muted);
    font-family:var(--title-font);font-size:12px;font-weight:700;
    font-variant-numeric:tabular-nums;letter-spacing:0;text-transform:none;
  }
  .dt-chip.sube{color:var(--ink);background:color-mix(in srgb,var(--ink) 12%,transparent)}
  .dt-chip.baja{color:var(--offer);background:color-mix(in srgb,var(--offer) 10%,transparent)}
  .dt-chip.nuevo{font-size:11px;letter-spacing:.06em;padding:2px 8px}
  .dt-chip svg{width:10px;height:10px;flex:0 0 auto}

  .dt-eje{display:flex;justify-content:space-between;margin-top:var(--s2);
    color:var(--muted);font-size:11px;font-family:var(--title-font)}

  /* ---- la nota que explica la rejilla ----
     Era un parrafo de dos frases largas debajo de las baldosas, y se leia como si fuera un dato
     mas. No lo es: es la letra que explica los datos, y tiene que verse que lo es antes de
     leerla. Sin relleno de fondo y con el filete de puntos se lee como una nota; con el mismo
     fondo que las baldosas se leia como una baldosa de texto.

     Y va partida en dos avisos con su entradilla en negrita, no corrida: cada uno responde una
     pregunta distinta —que cuenta y que no guarda— y juntas en un parrafo no se distinguian. */
  .dt-nota{
    margin-top:var(--s3);padding:var(--s3);
    border-radius:var(--r-card);
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 12%,transparent);
  }
  .dt-nota-cab{display:flex;align-items:center;gap:7px;margin-bottom:var(--s3);color:var(--muted)}
  .dt-nota-cab svg{width:15px;height:15px;flex:0 0 auto}
  .dt-nota-lista{display:grid;gap:var(--s3)}
  /* A todo el ancho y sin medida acotada. Con dos avisos en dos columnas la medida era la
     comoda de leer; con uno solo, acotarlo dejaba media nota vacia al lado. Y el texto que
     queda son ciento cincuenta caracteres: a todo el ancho son dos lineas, no un parrafo. */
  .dt-nota-lista p{margin:0;color:var(--muted);font-size:14px;line-height:1.55}
  .dt-nota-lista b{color:var(--ink);font-family:var(--title-font);font-weight:600}
  .dt-nota-pie{
    display:flex;flex-wrap:wrap;gap:4px var(--s3);
    margin-top:var(--s3);padding-top:var(--s3);
    border-top:1px dotted color-mix(in srgb,var(--ink) 22%,transparent);
    color:var(--muted);font-family:var(--title-font);font-size:12px;
    font-variant-numeric:tabular-nums;
  }
  /* ---- las baldosas de cifra ---- */
  .dt-cifra-n{font-family:var(--title-font);font-size:30px;font-weight:700;line-height:1.05;
    font-variant-numeric:tabular-nums;color:var(--ink);margin:2px 0 4px}
  .dt-contra{color:var(--muted);font-size:13px;line-height:1.4}
  .dt-pct{font-family:var(--title-font);font-weight:700;white-space:nowrap;color:var(--ink)}
  .copias{margin-top:var(--s3)}
  .copia{
    display:grid;
    grid-template-columns:1fr auto auto;
    align-items:center;
    gap:var(--s2);
    padding:var(--s3) 0;
    border-top:1px solid var(--hairline);
  }
  .copia-txt{display:block}
  .copia-que{display:block;font-family:var(--title-font);font-weight:600}
  .copia-dato{
    display:block;color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums;
  }
  @media (max-width:560px){
    .copia{grid-template-columns:1fr 1fr}
    .copia-txt{grid-column:1 / -1}
  }

  a{color:var(--ink)}

  /* ---------- entrar ----------
     La puerta es la misma tarjeta que la carta, no un formulario aparte: la foto de portada
     metida 8px con radio concéntrico —34 menos esos 8 arriba, radio de hoja abajo, igual que
     en el hero—, el bloque de título centrado y el filete corto que allí separa los platos.
     Quien abre el panel reconoce la pieza antes de leer nada.

     La pantalla de primera configuración NO lleva foto: es texto largo y de un solo uso, así
     que se queda con la tarjeta lisa de siempre. De ahí que lo nuevo vaya bajo .is-recepcion
     en vez de sobre .login a secas. */
  /* La puerta no tiene barra de acciones abajo, así que los 151px que .page reserva para ella
     sobran: se centra la tarjeta en la pantalla. El margen automático —y no align-items:center—
     porque cuando la tarjeta no cabe, centrar recorta por arriba sin poder llegar; con margin
     auto sobra scroll por los dos lados. */
  .page-login{display:flex;min-height:100dvh;padding:var(--s3)}
  .page-login > .login{margin:auto}
  .login{max-width:380px}
  .login .card-main{padding:var(--s4) var(--s3)}
  .login h1{margin:0 0 4px;font-family:var(--title-font);font-size:26px;font-weight:800;letter-spacing:-0.02em}
  .login input{
    width:100%;min-height:52px;padding:0 var(--s3);margin-bottom:var(--s2);
    border:1px solid var(--border);border-radius:var(--r-pill);
    background:#fff;color:var(--ink);
    font-family:var(--body-font);font-size:16px;
  }
  .login input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:transparent}
  .login button{width:100%;background:var(--ink);color:var(--surface)}

  .login.is-recepcion{max-width:440px}
  .login.is-recepcion .card-main{padding:var(--s1) var(--s1) var(--s5)}
  /* Sin foto —estado.json todavía sin portadas, o el archivo ya no está— la tarjeta vuelve a
     sus rellenos normales: un hueco gris en la puerta se lee como un fallo del panel. */
  .login.is-recepcion.sin-foto .card-main{padding:var(--s5) var(--s3)}
  .login.is-recepcion.sin-foto .login-cuerpo{padding:0}
  .login-foto{
    position:relative;
    /* La misma caja 3:2 del hero: la foto puede venir como venga, recorta el navegador. */
    aspect-ratio:3 / 2;
    border-radius:calc(var(--r-card) - var(--s1)) calc(var(--r-card) - var(--s1)) var(--r-sheet) var(--r-sheet);
    overflow:hidden;
    /* El fondo de la página mientras carga, no un gris: así no hay un color que aparece y se
       va justo antes de que entre la imagen. */
    background:var(--ink);
  }
  .login-foto img{
    width:100%;height:100%;object-fit:cover;display:block;
    /* 420ms, por encima de los 180 del resto: esto no responde a un gesto, es una imagen
       apareciendo, y a 200 el recorte se lee como un tirón. */
    animation:login-foto 420ms var(--ease-out) both;
  }
  @keyframes login-foto{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}
  .login-cuerpo{padding:var(--s4) var(--s3) 0;text-align:center}
  .login-eyebrow{
    margin:0 0 var(--s2);
    font-family:var(--title-font);
    font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;
    color:var(--muted);
  }
  .login.is-recepcion h1{margin:0 0 var(--s3);font-size:30px;line-height:1.1}
  .login-filete{width:var(--s4);height:1px;margin:0 auto var(--s4);background:var(--hairline)}
  .login.is-recepcion input{min-height:56px;font-size:17px;text-align:center}

  /* ---------- la contraseña, con asteriscos ----------
     El navegador pinta puntos y no hay forma de cambiarle el carácter desde CSS
     (-webkit-text-security sólo ofrece disc, circle y square). Así que el campo sigue siendo
     type="password" —para que los gestores de contraseñas y el llavero del móvil sigan
     funcionando, y para que el valor no pase por JavaScript— pero se le vuelve el texto
     transparente y encima se dibuja un asterisco por carácter.

     El letter-spacing que le pone el script iguala el avance del punto al del asterisco; sin
     eso el cursor se iría separando del último carácter conforme se escribe. */
  .clave-campo{position:relative}
  .clave-campo input.con-mascara{color:transparent;-webkit-text-fill-color:transparent}
  .clave-campo input.con-mascara::placeholder{color:var(--muted);-webkit-text-fill-color:var(--muted);letter-spacing:normal}
  /* El autorrelleno de Chrome repinta el texto con -webkit-text-fill-color, que se salta el
     color transparente: volvían a verse los puntos del navegador DEBAJO de los asteriscos, y
     de paso teñía el campo de azul. El box-shadow interior es la única forma de tapar ese
     fondo; el text-fill vuelve a esconder los puntos. */
  .clave-campo input.con-mascara:-webkit-autofill,
  .clave-campo input.con-mascara:-webkit-autofill:hover,
  .clave-campo input.con-mascara:-webkit-autofill:focus{
    -webkit-text-fill-color:transparent;
    -webkit-box-shadow:0 0 0 100px #fff inset;
    box-shadow:0 0 0 100px #fff inset;
  }
  .clave-mascara{
    position:absolute;
    inset:0;
    display:flex;align-items:center;justify-content:center;
    padding:0 var(--s3);
    color:var(--ink);
    font-family:var(--body-font);font-size:17px;
    pointer-events:none;
    overflow:hidden;
  }
  /* Los paneles que no tocan no se pintan; el que está abierto trae su propia barra fija. */
  /* Con la tarjeta ancha, 326 filas en una sola columna dejaban medio panel vacío. De
     portátil para arriba van en dos, como los platos de la carta. break-inside evita que una
     fila se parta por la mitad entre columnas. */
  @media (min-width:1200px){
    .sec-body{columns:2;column-gap:var(--s5)}
    .sec-body .row{break-inside:avoid}
    .sec-body .row:last-child{border-bottom:1px solid var(--hairline)}
    .prow{break-inside:avoid}
    .pane[data-pane="precios"] .card{columns:2;column-gap:var(--s5)}
    .pane[data-pane="precios"] .pcts,
    .pane[data-pane="precios"] .card:has(.pcts){columns:1}
  }
  /* Filas de la pestaña de ofertas */
  .orow .tick input{accent-color:var(--accent)}
  /* Dos veces la misma regla: la primera es el respaldo para un navegador sin color-mix,
     la segunda tiñe la fila con el acento del tema que esté puesto. */
  .orow.is-oferta{background:var(--chip)}
  .orow.is-oferta{background:color-mix(in srgb,var(--accent) 8%,transparent)}
  .orow.is-oferta .nm{color:var(--accent-ink)}
  /* Ya dentro por su categoría, o sin precio que rebajar: se ven, pero no se tocan. */
  .orow.por-categoria,.orow.sin-precio{opacity:.5}
  .hrow.por-categoria{opacity:.5}
  .hrow.por-categoria .tick{cursor:default;pointer-events:none}
  .cats label.por-categoria{opacity:.5}
  .orow.por-categoria .tick,.orow.sin-precio .tick{cursor:default}
  .pane[hidden]{display:none}
  .hidden{display:none}
  [hidden]{display:none !important}

  /* ---------- fotos de portada ----------
     Una fila por foto, con la miniatura a su tamaño real de proporción: lo que se ve aquí es
     lo que se va a ver en la carta, recortado igual. Los botones de orden y de quitar a la
     derecha, con área de dedo. */
  .fotos{display:flex;flex-direction:column;gap:var(--s2);margin:0 0 var(--s3)}
  .foto{
    display:flex;align-items:center;gap:var(--s2);
    padding:8px;
    border:1px solid var(--border);
    border-radius:var(--r-sheet);
  }
  .foto img{
    flex:0 0 auto;
    /* la misma proporcion que la portada: lo que se ve aqui es lo que se va a ver alli */
    width:96px;height:64px;
    object-fit:cover;
    border-radius:10px;
    background:var(--chip);
  }
  .foto .pos{
    flex:0 0 auto;
    min-width:22px;
    color:var(--muted);
    font-family:var(--title-font);font-size:12px;font-weight:600;
    font-variant-numeric:tabular-nums;
  }
  .foto .hueco{flex:1 1 auto}
  .foto-btn{
    display:flex;align-items:center;justify-content:center;
    width:40px;height:40px;
    padding:0;border:1px solid var(--border);border-radius:var(--r-pill);
    background:transparent;color:var(--ink);
    cursor:pointer;
    transition:transform var(--t-press) var(--ease-out),border-color var(--t-fast) ease;
  }
  .foto-btn svg{width:17px;height:17px}
  .foto-btn:active{transform:scale(.92)}
  .foto-btn:disabled{opacity:.3;cursor:default}
  .foto-btn.quitar{color:var(--offer);border-color:transparent}
  .foto-aviso{margin:calc(var(--s2) * -1) 2px var(--s3);min-height:20px}
  .foto-aviso-mal{color:var(--offer)}
  .foto-vacio{
    padding:var(--s4) var(--s3);
    border:1px dashed var(--border);
    border-radius:var(--r-sheet);
    color:var(--muted);
    text-align:center;
  }
  .subir{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2)}
  .subir input[type=file]{
    flex:1 1 200px;min-width:0;
    font-family:var(--body-font);font-size:14px;color:var(--muted);
  }
  .subir input[type=file]::file-selector-button{
    margin-right:var(--s2);
    min-height:40px;padding:0 var(--s3);
    border:1px solid var(--border);border-radius:var(--r-pill);
    background:transparent;color:var(--ink);
    font-family:var(--title-font);font-size:13px;font-weight:600;
    cursor:pointer;
  }

  /* ---------- los 4 colores, en una unica fila ----------
     Corrección de layout, pedido expreso y literal: Primario (picker + hex, los unicos
     editables) y los tres fijos del motor (Secundario/Oscuro/Neutro, solo lectura -- ver
     motor/temas.mjs) van en el MISMO contenedor horizontal, nunca repartidos en varias
     filas. nowrap fuerza la fila; cada control ocupa SOLO su ancho natural -- nada de
     flex:1 que estire el campo de hex a media pantalla, como pasaba antes. Si en un
     movil muy estrecho no caben ni comprimidos al minimo, el contenedor scrollea en
     horizontal (overflow-x:auto) en vez de romper a una segunda fila -- tambien pedido
     expreso. El picker da un hex siempre valido; el campo de texto es el que de verdad
     viaja al servidor, sincronizados por JS (ver el <script> de esta pestaña). */
  .colores-fila{
    display:flex;align-items:center;gap:8px;flex-wrap:nowrap;
    margin-top:7px;overflow-x:auto;padding-bottom:2px;
  }
  .colores-fila input[type=color]{
    width:36px;height:36px;flex:none;padding:0;border:1px solid var(--border);
    /* Redondo, igual que los puntos de Secundario/Oscuro/Neutral. */
    border-radius:50%;background:transparent;cursor:pointer;
  }
  .colores-fila input[type=color]::-webkit-color-swatch-wrapper{padding:3px}
  .colores-fila input[type=color]::-webkit-color-swatch{border:0;border-radius:50%}
  .colores-fila input[type=text]{
    flex:none;width:92px;min-height:36px;padding:0 8px;
    border:1px solid transparent;border-radius:var(--r-sheet);
    background:#fff;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 10%,transparent);
    color:var(--ink);font-family:var(--body-font);font-size:13px;
    text-transform:uppercase;font-variant-numeric:tabular-nums;
  }
  .colores-fila input[type=text]:focus{outline:2px solid var(--accent);outline-offset:1px}
  .colores-fila input[type=text]:invalid:not(:placeholder-shown){box-shadow:inset 0 0 0 2px var(--offer)}
  .colores-fila .ghost{flex:none;white-space:nowrap;padding:0 var(--s2);min-height:36px;font-size:12px}
  /* Los tres fijos: circulo + hex, compactos -- el nombre (Secundario/Oscuro/Neutro) no
     va como texto visible aqui, sino en aria-label del grupo (role="group"), para que un
     lector de pantalla lo siga anunciando sin que ocupe ancho en la fila. */
  .color-fijo{
    display:flex;align-items:center;gap:5px;flex:none;
    padding:4px 8px 4px 4px;
    border:1px solid var(--border);border-radius:var(--r-pill);
  }
  .color-fijo-punto{
    width:20px;height:20px;flex:none;
    border-radius:50%;border:1px solid var(--hairline);
  }
  .color-fijo-hex{
    display:block;flex:none;white-space:nowrap;
    color:var(--muted);font-size:11px;font-variant-numeric:tabular-nums;
  }
  /* El aviso de sin guardar alarga el contador; que se parta él y no el botón. */
  .pane[data-pane="marca"] .save{white-space:nowrap}

  /* ---------- insignias de sesión ----------
     Fijas arriba a la derecha, como las etiquetas de oferta y destacados de la carta:
     dicen con qué llave se ha entrado (USUARIO o SUPERADMIN) y si el panel está en línea
     con contraseña o abierto en demo. Siempre a la vista, también con el scroll abajo. */
  .insignias{
    /* Dentro de la tarjeta, en su esquina, y quietas: flotando sobre el navy tapaban y
       distraían; aquí se leen una vez al entrar, que es lo que tienen que hacer. */
    display:flex;justify-content:center;gap:6px;margin:0 0 var(--s2);pointer-events:none;
  }
  /* En móvil no hay esquina libre: pisaban el rótulo. Ahí van en fila, quietas, encima de él;
     de tablet en adelante, en la esquina de la tarjeta. */
  @media (min-width:768px){
    .insignias{position:absolute;top:var(--s3);right:var(--s3);z-index:5;margin:0}
  }
  .insignia{
    display:inline-block;padding:4px 10px;
    border-radius:var(--r-pill);
    font-family:var(--title-font);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
    box-shadow:0 1px 3px color-mix(in srgb,var(--ink) 25%,transparent);
  }
  .insignia.is-online{background:var(--surface);color:var(--accent-ink)}
  .insignia.is-user{background:var(--accent);color:var(--badge-ink)}
  .insignia.is-super{background:var(--ink);color:var(--surface);outline:2px solid var(--surface)}
  .insignia.is-demo{background:var(--offer);color:var(--surface)}

  /* ---------- avisos flotantes (toast) ----------
     Antes cada guardado dejaba una franja fija bajo la cabecera que había que leer y que
     empujaba el contenido. Ahora el aviso flota arriba, se va solo si es bueno y se queda
     hasta que se cierra si es un error: un error que desaparece solo no se ha leído. */
  .toasts{
    /* Centrado en la pantalla, no arriba: inset:0 sobre position:fixed mide siempre el
       viewport real del navegador (también cuando la barra del móvil aparece y desaparece),
       y el flex centra en ese alto sin calcular nada a mano. */
    position:fixed;inset:0;z-index:60;
    display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;
    padding:0 12px;
    pointer-events:none;
  }
  .toast{
    display:flex;align-items:flex-start;gap:12px;
    width:min(520px,100%);padding:14px 12px 14px 16px;
    border-radius:var(--r-sheet);
    /* Invertido respecto a la tarjeta: tinta sobre crema no destacaba encima del panel crema;
       crema sobre navy sí, y el error va en el rojo de aviso. */
    background:var(--ink);color:var(--surface);
    box-shadow:0 12px 32px color-mix(in srgb,var(--ink) 35%,transparent);
    font-size:15px;line-height:1.4;
    pointer-events:auto;
    opacity:0;transform:scale(.96);
    transition:opacity var(--t-fast) var(--ease-out),transform var(--t-fast) var(--ease-out);
  }
  .toast.is-in{opacity:1;transform:none}
  .toast.bad{background:var(--offer)}
  .toast-icon{flex:0 0 auto;width:26px;height:26px;margin-top:1px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--surface) 18%,transparent);color:var(--surface)}
  .toast-icon svg{width:16px;height:16px}
  .toast-txt{flex:1 1 auto;min-width:0;padding-top:3px}
  .toast-x{
    flex:0 0 auto;width:40px;height:40px;margin:-8px -4px -8px 0;padding:0;
    border:0;border-radius:var(--r-pill);background:transparent;color:color-mix(in srgb,var(--surface) 75%,transparent);
    display:flex;align-items:center;justify-content:center;cursor:pointer;
  }
  .toast-x svg{width:18px;height:18px}
  .toast-x:hover,.toast-x:focus-visible{color:var(--surface);background:color-mix(in srgb,var(--surface) 12%,transparent);outline:none}
  @media (prefers-reduced-motion:reduce){ .toast{transform:none} }

  @media (prefers-reduced-motion:reduce){
    *{transition-duration:1ms !important;animation-duration:1ms !important}
    button:active,.tabs button:active{transform:none}
  }
</style>
</head>
<body<?= $dentro ? "" : ' class="sin-entrar"' ?>>
<div class="page<?= $dentro ? "" : " page-login" ?>">

<?php if ($sin_configurar): ?>
  <div class="login"><div class="card-main">
    <h1>Configurar acceso</h1>
    <p class="sub">Elige una contraseña. Sólo se hace una vez.</p>
    <?php if ($error): ?><div class="msg bad"><?= h($error) ?></div><?php endif; ?>
    <?php if ($hash_nuevo && $clave_escrita): ?>
      <div class="msg ok">
        Listo. <a href="./">Recarga y entra</a> con tu contraseña.<br>
        No hace falta tocar ningún archivo: se ha guardado en <code>clave.php</code>, que ya
        no se sobrescribe cuando se actualiza la carta.
      </div>
    <?php elseif ($hash_nuevo): ?>
      <div class="msg bad">
        No he podido escribir <code>clave.php</code>. Crea tú el archivo <code>admin/clave.php</code>
        con este contenido exacto:
        <textarea readonly style="width:100%;margin-top:8px;padding:8px;font:13px/1.4 ui-monospace,monospace;border-radius:8px;border:1px solid var(--border)" rows="3">&lt;?php
define('ADMIN_HASH', '<?= h($hash_nuevo) ?>');</textarea>
        Después recarga esta página y entra con tu contraseña.
      </div>
    <?php else: ?>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= h((string) ($_SESSION['csrf'] ?? '')) ?>">
        <?php if ($activacion_requerida): ?>
          <p class="sub" style="margin-bottom:8px">Este panel necesita el token de activación
            que se generó al dar de alta este cliente. Se usa una sola vez.</p>
          <input type="text" name="token_activacion" placeholder="Token de activación" aria-label="Token de activación" autocomplete="off" required autofocus>
        <?php endif; ?>
        <?php if (SUPERADMIN_HASH !== ''): ?>
          <p class="sub" style="margin-bottom:8px">Primero, la contraseña de superadministrador:
            sin ella nadie puede reclamar este panel.</p>
          <input type="password" name="super" placeholder="Contraseña de superadministrador" aria-label="Contraseña de superadministrador" autocomplete="off" required<?= $activacion_requerida ? '' : ' autofocus' ?>>
        <?php endif; ?>
        <input type="password" name="nueva" placeholder="Contraseña nueva (mín. 8)" aria-label="Contraseña nueva, mínimo 8 caracteres" autocomplete="new-password" required<?= (SUPERADMIN_HASH === '' && !$activacion_requerida) ? ' autofocus' : '' ?>>
        <button type="submit">Guardar contraseña</button>
      </form>
    <?php endif; ?>
  </div></div>

<?php elseif (!$dentro): ?>
  <?php
    /* La imagen de la puerta. `acceso.jpg` NO sale de estado.json ni la escribe el panel: es
       un archivo fijo en admin/ que el restaurante sustituye a mano por FTP -- y por eso
       deploy.yml lo excluye siempre del despliegue, para no pisar una foto ya personalizada.

       `motor-acceso.jpg` es la MISMA idea pero del motor, no del cliente: una foto genérica
       (sin marca de ningún restaurante), con nombre distinto a propósito para que el exclude
       de deploy.yml (que solo empieza por "acceso") no la alcance -- SÍ viaja en cada
       despliegue, así que un cliente recién nacido, sin foto propia subida todavía, tiene
       puerta desde el primer día. En cuanto el restaurante sube la suya, esa gana siempre: se
       comprueba primero.

       Al src se le cuelga la fecha del archivo: al reemplazarlo, la dirección cambia sola y
       nadie se queda viendo el anterior por la caché. */
    $foto_login = '';
    foreach (['acceso.jpg', 'motor-acceso.jpg'] as $cual) {
      if (is_file(__DIR__ . '/' . $cual)) { $foto_login = $cual; break; }
    }
    $hay_foto = $foto_login !== '';
  ?>
  <div class="login is-recepcion<?= $hay_foto ? '' : ' sin-foto' ?>"><div class="card-main">
    <?php if ($hay_foto): ?>
      <div class="login-foto">
        <img src="<?= h($foto_login) ?>?v=<?= (int) filemtime(__DIR__ . '/' . $foto_login) ?>" alt="" fetchpriority="high">
      </div>
    <?php endif; ?>
    <div class="login-cuerpo">
      <p class="login-eyebrow">Acceso privado</p>
      <h1><?= h(CLIENTE_NOMBRE) ?></h1>
      <div class="login-filete"></div>
      <?php if ($error): ?><div class="msg bad"><?= h($error) ?></div><?php endif; ?>
      <form method="post">
        <div class="clave-campo">
          <input type="password" name="clave" placeholder="Contraseña" aria-label="Contraseña" autocomplete="current-password" required autofocus>
          <span class="clave-mascara" aria-hidden="true"></span>
        </div>
        <button type="submit">Entrar</button>
      </form>
    </div>
  </div></div>

  <script>
  /* Asteriscos en lugar de puntos. El campo no cambia de tipo: sigue siendo password, así que
     el gestor de contraseñas lo reconoce y el valor no se copia a ninguna variable. Sólo se
     lee cuántos caracteres tiene para pintar esos mismos asteriscos encima.

     La máscara se activa desde aquí y no desde el CSS: sin JavaScript el texto transparente
     dejaría el campo pareciendo vacío mientras se escribe. */
  (function () {
    var campo = document.querySelector('.clave-campo input');
    var mascara = document.querySelector('.clave-mascara');
    if (!campo || !mascara) return;

    /* Igualar avances: el punto del navegador (U+2022) y el asterisco no miden lo mismo, y sin
       compensar, el cursor se va separando del último carácter. Se mide una vez, con la tipo
       real que tenga el campo. Si algo falla, el campo se queda con sus puntos de siempre. */
    try {
      var cs = getComputedStyle(campo);
      var lienzo = document.createElement('canvas').getContext('2d');
      lienzo.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var salto = lienzo.measureText('*').width - lienzo.measureText('•').width;
      if (isFinite(salto)) campo.style.letterSpacing = salto.toFixed(2) + 'px';
    } catch (e) {}

    campo.classList.add('con-mascara');
    function pinta() { mascara.textContent = new Array(campo.value.length + 1).join('*'); }
    campo.addEventListener('input', pinta);
    campo.addEventListener('change', pinta);
    /* El autorrelleno del navegador no siempre dispara input: se vuelve a mirar un par de
       veces mientras carga la página. */
    pinta();
    setTimeout(pinta, 250);
    setTimeout(pinta, 1000);
  })();
  </script>

<?php else: ?>
  <div class="card-main">
  <div class="insignias" role="status" aria-label="Sesión">
    <?php if ($demo): ?>
      <span class="insignia is-demo">Modo demo</span>
    <?php else: ?>
      <span class="insignia is-online">En línea</span>
      <span class="insignia <?= $super ? 'is-super' : 'is-user' ?>"><?= $super ? 'Superadmin' : 'Usuario' ?></span>
    <?php endif; ?>
  </div>
  <header class="head">
    <p class="head-eyebrow"><?= h(CLIENTE_NOMBRE) ?></p>
    <h1><span class="dia"><?= h(dia_semana($hoyReal)) ?>,</span> <?= h((new DateTimeImmutable($hoyReal))->format("d/m/y")) ?></h1>
    <?php /* De madrugada la fecha de arriba ya es la de hoy, pero los agotados todavia son los
             de anoche: se limpian en el corte, no a las doce. Quien entra a la una y ve tres platos
             tachados tiene que saber de que servicio son y cuando se van a ir solos.

             El resto del dia las dos fechas son la misma y esta linea no se pinta. */ ?>
    <?php if ($hoy !== $hoyReal): ?>
      <p class="sub sub-servicio">
        Son las <strong><?= h((new DateTimeImmutable("now", new DateTimeZone(TZ)))->format("H:i")) ?>
        </strong> en Canarias. Los agotados que veas son los del servicio del
        <strong><?= h(minuscula(dia_semana($hoy))) ?>
        <?= h((new DateTimeImmutable($hoy))->format("d/m")) ?></strong> y se limpian solos a
        las <?= (int) CORTE_HORA ?>:00.
      </p>
    <?php endif; ?>
    <p class="sub">
      Servicio en curso<?php if (!$demo): ?> · la sesión se cierra sola tras
      <?= (int) SESION_MINUTOS ?> min sin actividad · <a href="?salir=1">Salir</a><?php endif; ?>
    </p>
  </header>

  <?php if ($demo): ?>
      <details class="demo-salir card">
        <summary>Modo demo: abierto sin contraseña · poner contraseña y salir</summary>
        <p class="hint" style="margin:var(--s2) 0 0">Cualquiera que dé con la dirección puede marcar agotados y cambiar precios.</p>
        <form method="post">
          <input type="hidden" name="salir_demo" value="1">
          <input type="hidden" name="csrf" value="<?= h($csrf ?? ($_SESSION['csrf'] ?? '')) ?>">
          <?php if (SUPERADMIN_HASH !== ''): ?>
            <label class="fld">Contraseña de superadministrador
              <input type="password" name="super" autocomplete="off" required>
            </label>
          <?php endif; ?>
          <label class="fld">Contraseña nueva <span class="opt">(mín. 8)</span>
            <input type="password" name="clave_nueva" autocomplete="new-password" required>
          </label>
          <button class="save" type="submit">Guardar y cerrar el demo</button>
        </form>
        <p class="hint" style="margin:var(--s2) 0 0">
          No hay que tocar ningún archivo. El panel guarda la contraseña en
          <code>admin/clave.php</code> y el modo demo se apaga solo. Para volver al demo,
          borra ese archivo del servidor.
        </p>
      </details>
  <?php endif; ?>

  <div class="toasts" id="toasts" aria-live="polite"></div>
  <script>
    /* Avisos flotantes. Los buenos se van solos a los 4,5 s; los errores se quedan hasta que
       se cierran, y con role=alert para que el lector de pantalla los anuncie al momento. */
    window.toast = function (texto, tipo) {
      var caja = document.getElementById('toasts');
      if (!caja) return;
      var mal = tipo === 'bad';
      var t = document.createElement('div');
      t.className = 'toast ' + (mal ? 'bad' : 'ok');
      t.setAttribute('role', mal ? 'alert' : 'status');
      t.innerHTML = '<span class="toast-icon" aria-hidden="true">' + (mal
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l9 -9"/></svg>')
        + '</span><span class="toast-txt"></span>'
        + '<button type="button" class="toast-x" aria-label="Cerrar aviso"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg></button>';
      t.querySelector('.toast-txt').textContent = texto;
      caja.appendChild(t);
      void t.offsetHeight;
      t.classList.add('is-in');
      var fuera = function () {
        t.classList.remove('is-in');
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
      };
      t.querySelector('.toast-x').addEventListener('click', fuera);
      if (!mal) setTimeout(fuera, 4500);
      return t;
    };
    <?php if ($aviso): ?>toast(<?= json_encode($aviso, JSON_UNESCAPED_UNICODE) ?>, 'ok');<?php endif; ?>
    <?php if ($error): ?>toast(<?= json_encode($error, JSON_UNESCAPED_UNICODE) ?>, 'bad');<?php endif; ?>
  </script>

  <?php if (!$lista): ?>
    <div class="msg bad">No encuentro <code>platos.json</code>. Súbelo junto a este archivo.</div>
  <?php else: ?>

  <?php if (!empty($migraColisiones)): ?>
    <div class="msg bad">
      <strong>Colisiones entre claves antiguas y sus identificadores — los guardados están bloqueados.</strong><br>
      La misma cosa tiene dos valores distintos y elegir uno a ciegas perdería el otro. Se resuelve
      a mano (corrigiendo <code>estado.json</code> o restaurando una copia) y esto se desbloquea solo.<br>
      <?php foreach (array_slice($migraColisiones, 0, 6) as $c): ?>· <?= h($c) ?><br><?php endforeach; ?>
    </div>
  <?php elseif (($migraAnalisis['esquema'] ?? 2) < 2): ?>
    <div class="msg" style="background:#fff6e0;border:1px solid #d9b24a">
      <strong>Este estado usa las claves antiguas («categoría :: nombre»).</strong>
      Migrar a identificadores permanentes hace que renombrar un plato no le quite su foto, su
      precio ni su agotado. Vista previa:
      <?= (int) $migraAnalisis['renombres'] ?> clave(s) a renombrar,
      <?= (int) $migraAnalisis['consolidadas'] ?> ya consolidada(s),
      <?= count($migraAnalisis['desconocidas']) ?> desconocida(s) que viajarán intactas<?php
        if ($migraAnalisis['desconocidas']): ?> (<?= h(implode(' · ', array_slice($migraAnalisis['desconocidas'], 0, 4))) ?>)<?php endif;
        if ($migraAnalisis['heredados']): ?>; campo heredado: <?= h(implode(' · ', $migraAnalisis['heredados'])) ?><?php endif; ?>.
      Antes de escribir se guarda copia en Marca &gt; Copias, y restaurar
      <code>anterior.json</code> deshace la migración entera.
      <form method="post" style="margin-top:8px">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <button class="save" name="migrar_estado" value="1" type="submit"
                onclick="return confirm('¿Migrar el estado a identificadores permanentes? Se guarda copia antes.')">
          Migrar ahora
        </button>
      </form>
    </div>
  <?php endif; ?>

  <!-- Botones, no enlaces: las cinco pestañas viven en el mismo documento y se cambian sin
       recargar, igual que las categorías de la carta. Con <a href="?t=..."> cada toque era una
       página nueva — parpadeo en blanco, scroll al principio y medio segundo de espera. -->
  <?php /* La misma barra que las categorías de la carta: una fila que se desplaza, con
           flechas de 768px en adelante (el ratón no desliza), fundidos en los bordes que se
           apagan al llegar a cada extremo, y la pestaña activa siempre a la vista. */ ?>
  <div class="tabs-wrap" id="tabs-wrap"<?= $previsua ? ' hidden' : '' ?>>
    <button type="button" class="tabs-arrow tabs-arrow-prev" aria-label="Pestañas anteriores"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6"/></svg></button>
    <nav class="tabs" id="tabs" role="tablist">
      <?php foreach ($PESTANAS as $slug => $nombre): ?>
        <button type="button" role="tab" data-tab="<?= h($slug) ?>"
                aria-selected="<?= $pestana === $slug ? 'true' : 'false' ?>"
                class="<?= $pestana === $slug ? 'on' : '' ?>"><?= h($nombre) ?><?php
          if ($CUENTAS[$slug]) echo '<span class="n">' . (int) $CUENTAS[$slug] . '</span>'; ?></button>
      <?php endforeach; ?>
    </nav>
    <button type="button" class="tabs-arrow tabs-arrow-next" aria-label="Pestañas siguientes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6"/></svg></button>
  </div>

  <?php /* ================================================== AGOTADOS ============== */ ?>
  <section class="pane" data-pane="agotados"<?= $pestana === 'agotados' ? '' : ' hidden' ?>>
    <form method="post" id="f">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
      <input type="hidden" name="guardar_agotados" value="1">

      <?php /* Sin nada agotado no hay nada que resumir: el bloque no existe hasta que se marca
               el primer plato (el JS lo enseña al momento, sin esperar a guardar). */ ?>
      <div class="card resumen" id="resumen"<?= count($agotados) === 0 ? ' hidden' : '' ?>>
        <div class="res-line">
          <span class="res-lbl">Agotados hoy</span>
          <span class="res-val"><span id="n"><?= count($agotados) ?></span></span>
          <button type="button" class="ghost" id="clear-all">Quitar todos</button>
        </div>
      </div>

      <div class="tools">
        <input class="search" id="q" type="search" placeholder="Buscar plato o número…" autocomplete="off"
               aria-label="Buscar plato o número">
        <div class="chips" role="group" aria-label="Filtro">
          <button type="button" class="chip is-on" data-filter="todos" aria-pressed="true">Todos</button>
          <button type="button" class="chip" data-filter="marcados" aria-pressed="false">Sólo marcados</button>
        </div>
      </div>

      <p class="hint">
        Marca la casilla y el plato sale <strong>tachado</strong> en la carta. Se limpia solo
        mañana a las <?= (int) CORTE_HORA ?>:00<?php if ($hoy !== $hoyReal): ?>,
        y lo que hay marcado ahora es del servicio del
        <?= h(minuscula(dia_semana($hoy))) ?><?php endif; ?>.
      </p>

      <?php $tabActual = null; foreach ($lista as $p):
        if ($p['tab'] !== $tabActual):
          if ($tabActual !== null) echo '</div>';
          $tabActual = $p['tab'];
          echo '<h2 class="sec">' . h($tabActual) . '</h2><div class="card sec-body">';
        endif;
        $on = isset($agotados[$p['key']]); ?>
        <div class="row<?= $on ? ' is-out' : '' ?>" data-name="<?= h(minuscula($p['name'] . ' ' . $p['name_en'] . ' ' . $p['id'] . ' ' . $p['sub'])) ?>">
          <label class="tick">
            <input type="checkbox" name="agotado[]" value="<?= h($p['key']) ?>"<?= $on ? ' checked' : '' ?>
                   <?= isset($hermanas[$p['key']]) ? 'data-plato="' . h($p['name'] . ' ' . $p['price']) . '"' : '' ?>>
            <span class="sr">Agotado hoy: <?= h($p['name']) ?></span>
          </label>
          <span class="num"><?= h($p['id']) ?></span>
          <span class="nm"><?= h($p['name']) ?><br><small><?= h($p['sub']) ?><?= $p['name_en'] !== $p['name'] ? ' · ' . h($p['name_en']) : '' ?></small></span>
          <?php $suFoto = (string) ($fotosPlato[$p['key']] ?? ''); ?>
          <button type="button" class="camara<?= $suFoto !== '' ? ' tiene' : '' ?>"
                  data-k="<?= h($p['key']) ?>" data-foto="<?= h($suFoto) ?>"
                  data-nombre="<?= h($p['name']) ?>"
                  title="<?= $suFoto !== '' ? 'Cambiar la foto' : 'Poner foto' ?>"
                  aria-label="<?= $suFoto !== '' ? 'Cambiar la foto de ' : 'Poner foto a ' ?><?= h($p['name']) ?>">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 7h2l1.5 -2h7l1.5 2h2a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2"/>
              <circle cx="12" cy="12.5" r="3.2"/>
            </svg>
          </button>
        </div>
      <?php endforeach; if ($tabActual !== null) echo '</div>'; ?>

      <p class="hint" id="vacio" hidden>Ningún plato coincide con la búsqueda.</p>

      <div class="bar">
        <span class="count" id="estado-txt"><span id="n2"><?= count($agotados) ?></span> agotados</span>
        <span class="acciones">
          <a class="ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver menú</a>
          <button class="save" type="submit">Guardar</button>
        </span>
      </div>
    </form>

    <!-- El recorte de la foto. Una sola capa para los 312 platos: se abre con el plato que se
         haya pulsado y se cierra al terminar. -->
    <div class="recorte" id="recorte" role="dialog" aria-modal="true" aria-labelledby="rec-t">
      <div class="caja">
        <h3 id="rec-t">Foto del plato</h3>
        <p class="quien" id="rec-quien"></p>

        <!-- lo que hay ahora -->
        <div id="rec-actual" hidden>
          <img id="rec-img" alt="" width="120" height="120"
               style="width:120px;height:120px;object-fit:cover;border-radius:var(--r-sheet);display:block">
          <div class="fila-b">
            <button type="button" class="save" id="rec-cambiar">Cambiar</button>
            <button type="button" class="ghost" id="rec-quitar">Quitar foto</button>
          </div>
          <div class="fila-b">
            <button type="button" class="ghost" id="rec-cerrar">Cerrar</button>
          </div>
        </div>

        <!-- el recorte -->
        <div id="rec-editor" hidden>
          <div class="lienzo-caja" id="rec-caja"><canvas id="rec-lienzo" width="1000" height="1000"></canvas></div>
          <input type="range" class="zoom" id="rec-zoom" min="100" max="400" value="100"
                 aria-label="Acercar o alejar la foto">
          <p class="pista">Arrastra para encuadrar. Lo que se ve en el cuadrado es lo que se guarda.</p>
          <div class="fila-b">
            <button type="button" class="save" id="rec-guardar">Guardar foto</button>
            <button type="button" class="ghost" id="rec-cancelar">Cancelar</button>
          </div>
        </div>

        <p class="err" id="rec-error"></p>
      </div>
    </div>
    <input type="file" id="rec-file" accept="image/*" hidden>

    <script>
      var form = document.getElementById('f');
      var q = document.getElementById('q');
      var vacio = document.getElementById('vacio');
      var filtro = 'todos';
      var sucio = false;

      function aplicarFiltro() {
        var t = q.value.trim().toLowerCase();
        var total = 0;
        document.querySelectorAll('.pane[data-pane="agotados"] .sec-body').forEach(function (body) {
          var visibles = 0;
          body.querySelectorAll('.row').forEach(function (row) {
            var hit = (!t || row.dataset.name.indexOf(t) !== -1)
                   && (filtro === 'todos' || row.classList.contains('is-out'));
            row.classList.toggle('hidden', !hit);
            if (hit) visibles++;
          });
          body.classList.toggle('hidden', visibles === 0);
          var h2 = body.previousElementSibling;
          if (h2 && h2.classList.contains('sec')) h2.classList.toggle('hidden', visibles === 0);
          total += visibles;
        });
        vacio.hidden = total > 0;
      }
      q.addEventListener('input', aplicarFiltro);

      document.querySelectorAll('.pane[data-pane="agotados"] .chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          filtro = chip.dataset.filter;
          document.querySelectorAll('.pane[data-pane="agotados"] .chip').forEach(function (c) {
            var on = c === chip;
            c.classList.toggle('is-on', on);
            c.setAttribute('aria-pressed', String(on));
          });
          aplicarFiltro();
        });
      });

      // Contadores en vivo: marcar veinte platos y no ver subir el número deja la duda de si
      // se ha marcado algo de verdad.
      function refrescar() {
        var n = document.querySelectorAll('input[name="agotado[]"]:checked').length;
        document.getElementById('n').textContent = n;
        document.getElementById('n2').textContent = n;
        document.getElementById('resumen').hidden = n === 0;
        document.getElementById('estado-txt').classList.toggle('dirty', sucio);
      }

      /* Las filas del mismo plato se marcan y se desmarcan juntas.
         Un plato está en su pestaña de comida y otra vez en Sin gluten o en Vegano, y son el
         mismo plato: si la cocina se queda sin él, se queda sin él en las tres. El servidor
         lo completa igual al guardar, pero hacerlo aquí es lo que permite DESmarcarlo: si la
         casilla hermana se quedara marcada, el servidor volvería a tacharlo y quitar el
         agotado sería imposible. */
      function marcarHermanas(cb) {
        var plato = cb.dataset.plato;
        if (!plato) return;
        document.querySelectorAll('input[name="agotado[]"][data-plato="' + plato.replace(/"/g, '\\"') + '"]')
          .forEach(function (otra) {
            if (otra === cb || otra.checked === cb.checked) return;
            otra.checked = cb.checked;
            var suFila = otra.closest('.row');
            if (suFila) suFila.classList.toggle('is-out', otra.checked);
          });
      }

      form.addEventListener('change', function (e) {
        var row = e.target.closest('.row');
        if (row && e.target.name === 'agotado[]') {
          row.classList.toggle('is-out', e.target.checked);
          marcarHermanas(e.target);
        }
        sucio = true;
        refrescar();
      });

      document.getElementById('clear-all').addEventListener('click', function () {
        var marcados = document.querySelectorAll('input[name="agotado[]"]:checked');
        if (!window.confirm('¿Quitar los ' + marcados.length + ' agotados?')) return;
        marcados.forEach(function (cb) {
          cb.checked = false;
          cb.closest('.row').classList.remove('is-out');
        });
        sucio = true;
        refrescar();
        aplicarFiltro();
      });

      // Marcar diez platos y cerrar la pestaña sin guardar es el error caro de esta pantalla.
      window.addEventListener('beforeunload', function (e) {
        if (!sucio) return;
        e.preventDefault();
        e.returnValue = '';
      });
      form.addEventListener('submit', function () { sucio = false; });
    </script>

    <script>
      /* ---------------------------------------------------------------- foto del plato
       * Todo el trabajo pesado lo hace el NAVEGADOR: recorta a 1000x1000 y comprime a WebP por
       * debajo de medio mega antes de subir. Al servidor le llega una foto pequena y ya hecha,
       * y por eso no hace falta GD en el hosting ni esperar a que suban ocho megas por el wifi
       * del restaurante.
       *
       * La foto se sube sola, sin pasar por el Guardar de la pestana: son cosas distintas, y
       * mezclarlas obligaria a guardar los agotados para cambiar una foto. */
      (function () {
        var DIM = 1000, MAX_BYTES = 512000, MAX_ORIGINAL = 25 * 1024 * 1024;

        var capa    = document.getElementById('recorte');
        var file    = document.getElementById('rec-file');
        var lienzo  = document.getElementById('rec-lienzo');
        var caja    = document.getElementById('rec-caja');
        var zoom    = document.getElementById('rec-zoom');
        var errEl   = document.getElementById('rec-error');
        var quienEl = document.getElementById('rec-quien');
        var vActual = document.getElementById('rec-actual');
        var vEditor = document.getElementById('rec-editor');
        var imgEl   = document.getElementById('rec-img');
        var bGuardar = document.getElementById('rec-guardar');
        if (!capa || !file || !form) return;
        var campoCsrf = form.querySelector('input[name=csrf]');
        var csrf = campoCsrf ? campoCsrf.value : '';

        var ctx = lienzo.getContext('2d');
        var boton = null;                    // el boton de camara que abrio la capa
        var st = null;                       // { img, escala, minEscala, x, y }
        var ultimoFoco = null;

        function error(m) { errEl.textContent = m || ''; }

        function abrir(vista) {
          vActual.hidden = (vista !== 'actual');
          vEditor.hidden = (vista !== 'editor');
          capa.setAttribute('open', '');
          document.body.style.overflow = 'hidden';
          var f = document.getElementById(vista === 'actual' ? 'rec-cambiar' : 'rec-guardar');
          if (f) f.focus();
        }
        function cerrar() {
          capa.removeAttribute('open');
          document.body.style.overflow = '';
          error('');
          st = null;
          file.value = '';
          if (ultimoFoco) { ultimoFoco.focus(); ultimoFoco = null; }
        }

        /* ---- pintar ---- */
        function encajar() {
          var min = Math.max(DIM / st.img.width, DIM / st.img.height);
          st.minEscala = min;
          if (st.escala < min) st.escala = min;
          var w = st.img.width * st.escala, h = st.img.height * st.escala;
          /* El cuadrado, siempre cubierto: nada de bordes blancos por arrastrar de mas. */
          st.x = Math.min(0, Math.max(DIM - w, st.x));
          st.y = Math.min(0, Math.max(DIM - h, st.y));
        }
        function pintar() {
          if (!st) return;
          encajar();
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, DIM, DIM);
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(st.img, st.x, st.y, st.img.width * st.escala, st.img.height * st.escala);
          zoom.value = String(Math.round((st.escala / st.minEscala) * 100));
        }

        /* ---- cargar el archivo elegido ---- */
        function cargar(f) {
          error('');
          if (!f) return;
          if (f.size > MAX_ORIGINAL) {
            error('Esa foto pesa ' + Math.round(f.size / 1048576) + ' MB y es demasiado grande para '
                + 'abrirla aqui. Mandatela por WhatsApp y sube la que llega, que viene mas ligera.');
            return;
          }
          /* createImageBitmap respeta la orientacion EXIF: sin esto, las fotos verticales de
             movil salen tumbadas. */
          createImageBitmap(f).then(function (img) {
            st = { img: img, escala: Math.max(DIM / img.width, DIM / img.height), x: 0, y: 0 };
            st.x = (DIM - img.width * st.escala) / 2;
            st.y = (DIM - img.height * st.escala) / 2;
            pintar();
            abrir('editor');
          }).catch(function () {
            error('Tu navegador no puede leer este formato. Prueba a subir la foto en JPG.');
          });
        }

        /* ---- arrastrar y pellizcar ---- */
        var punteros = {}, dist0 = 0, escala0 = 1;
        caja.addEventListener('pointerdown', function (e) {
          if (!st) return;
          caja.setPointerCapture(e.pointerId);
          punteros[e.pointerId] = { x: e.clientX, y: e.clientY };
          var ids = Object.keys(punteros);
          if (ids.length === 2) {
            var a = punteros[ids[0]], b = punteros[ids[1]];
            dist0 = Math.hypot(a.x - b.x, a.y - b.y);
            escala0 = st.escala;
          }
        });
        caja.addEventListener('pointermove', function (e) {
          if (!st || !punteros[e.pointerId]) return;
          var prev = punteros[e.pointerId];
          punteros[e.pointerId] = { x: e.clientX, y: e.clientY };
          var ids = Object.keys(punteros);
          var razon = DIM / caja.getBoundingClientRect().width;   // pantalla -> lienzo
          if (ids.length === 2) {
            var a = punteros[ids[0]], b = punteros[ids[1]];
            var d = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist0 > 0) escalar(escala0 * (d / dist0));
          } else {
            st.x += (e.clientX - prev.x) * razon;
            st.y += (e.clientY - prev.y) * razon;
          }
          pintar();
        });
        function soltar(e) {
          delete punteros[e.pointerId];
          if (Object.keys(punteros).length < 2) dist0 = 0;
        }
        caja.addEventListener('pointerup', soltar);
        caja.addEventListener('pointercancel', soltar);

        /* El zoom deja quieto el centro del cuadrado. Sin esto, acercar echa la foto hacia una
           esquina y hay que recolocarla a mano cada vez. */
        function escalar(nueva) {
          if (!st) return;
          var min = st.minEscala || Math.max(DIM / st.img.width, DIM / st.img.height);
          nueva = Math.max(min, Math.min(min * 4, nueva));
          var k = nueva / st.escala;
          st.x = DIM / 2 - (DIM / 2 - st.x) * k;
          st.y = DIM / 2 - (DIM / 2 - st.y) * k;
          st.escala = nueva;
        }
        caja.addEventListener('wheel', function (e) {
          if (!st) return;
          e.preventDefault();
          escalar(st.escala * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
          pintar();
        }, { passive: false });
        zoom.addEventListener('input', function () {
          if (!st) return;
          escalar(st.minEscala * (parseInt(zoom.value, 10) / 100));
          pintar();
        });

        /* ---- exportar y subir ---- */
        function exportar() {
          var calidades = [0.82, 0.77, 0.72, 0.67, 0.62, 0.57, 0.52];
          var i = 0;
          return new Promise(function (resolver, rechazar) {
            (function probar() {
              if (i >= calidades.length) { rechazar(new Error('grande')); return; }
              lienzo.toBlob(function (blob) {
                /* Un navegador sin WebP devuelve null. Se avisa y se para: subir cuatro megas
                   en otro formato para que el servidor lo rechace no ayuda a nadie. */
                if (!blob) { rechazar(new Error('webp')); return; }
                if (blob.size <= MAX_BYTES) resolver(blob);
                else probar();
              }, 'image/webp', calidades[i++]);
            })();
          });
        }

        function enviar(datos) {
          datos.append('csrf', csrf);
          return fetch(location.pathname, { method: 'POST', body: datos, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (j) {
              if (!j || !j.ok) throw new Error((j && j.error) || 'No se ha podido guardar.');
              return j;
            });
        }

        bGuardar.addEventListener('click', function () {
          if (!st || !boton) return;
          error('');
          var actual = boton;
          var textoAntes = bGuardar.textContent;
          bGuardar.disabled = true;
          bGuardar.textContent = 'Guardando\u2026';
          actual.classList.add('cargando');
          exportar().then(function (blob) {
            var fd = new FormData();
            fd.append('foto_accion', 'subir');
            fd.append('foto_plato', actual.dataset.k);
            fd.append('foto', blob, 'plato.webp');
            return enviar(fd);
          }).then(function (j) {
            actual.dataset.foto = j.foto;
            actual.classList.add('tiene');
            actual.title = 'Cambiar la foto';
            cerrar();
          }).catch(function (e) {
            var m = e && e.message;
            error(m === 'webp'
              ? 'Tu navegador no sabe guardar en WebP. Prueba desde otro navegador.'
              : m === 'grande'
                ? 'No he podido dejar la foto por debajo de 500 KB. Prueba con otra.'
                : m || 'No se ha podido guardar.');
          }).then(function () {
            bGuardar.disabled = false;
            bGuardar.textContent = textoAntes;
            actual.classList.remove('cargando');
          });
        });

        document.getElementById('rec-quitar').addEventListener('click', function () {
          if (!boton) return;
          var actual = boton;
          error('');
          var fd = new FormData();
          fd.append('foto_accion', 'quitar');
          fd.append('foto_plato', actual.dataset.k);
          enviar(fd).then(function () {
            actual.dataset.foto = '';
            actual.classList.remove('tiene');
            actual.title = 'Poner foto';
            cerrar();
          }).catch(function (e) { error((e && e.message) || 'No se ha podido quitar.'); });
        });

        document.getElementById('rec-cambiar').addEventListener('click', function () { file.click(); });
        document.getElementById('rec-cancelar').addEventListener('click', cerrar);
        document.getElementById('rec-cerrar').addEventListener('click', cerrar);
        capa.addEventListener('click', function (e) { if (e.target === capa) cerrar(); });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && capa.hasAttribute('open')) cerrar();
        });
        file.addEventListener('change', function () { cargar(file.files && file.files[0]); });

        /* Un solo oyente para las 312 filas. */
        document.addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('.camara') : null;
          if (!b) return;
          e.preventDefault();
          boton = b;
          ultimoFoco = b;
          quienEl.textContent = b.dataset.nombre || '';
          error('');
          if (b.dataset.foto) {
            /* El panel vive en admin/ y FOTOS_URL cuelga de la raiz de la carta, que esta un piso
               por encima: sin el ../ la vista previa pediria admin/assets/platos/ y no habria foto. */
            imgEl.src = '../' + <?= json_encode(FOTOS_URL) ?> + b.dataset.foto + '?t=' + Date.now();
            imgEl.alt = b.dataset.nombre || '';
            abrir('actual');
          } else {
            file.click();
          }
        });
      })();
    </script>

  <?php /* ================================================ DESTACADOS ============== */ ?>
  </section>

  <section class="pane" data-pane="destacados"<?= $pestana === 'destacados' ? '' : ' hidden' ?>>
    <p class="hint">
      Las etiquetas que salen al lado del número del plato. El vocabulario es cerrado a
      propósito: cada etiqueta está traducida a los tres idiomas. <strong>No caducan</strong>,
      se quedan hasta que las quites.
    </p>

    <div class="card">
      <?php if (!$tags): ?>
        <p class="hint" style="margin:6px 2px">Ahora mismo no hay ninguno.</p>
      <?php else: ?>
        <?php foreach ($tags as $k => $et): $p = $porKey[$k] ?? null; if (!$p) continue; ?>
          <div class="row">
            <span class="num"><?= h($p['id']) ?></span>
            <span class="nm"><?= h($p['name']) ?><br>
              <small><span class="badge"><?= h(ETIQUETAS_ES[$et] ?? $et) ?></span> · <?= h($p['sub']) ?><?= $p['name_en'] !== $p['name'] ? ' · ' . h($p['name_en']) : '' ?></small>
            </span>
            <form method="post" style="margin:0">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <button class="ghost" name="destacado_del" value="<?= h($k) ?>" type="submit">Quitar</button>
            </form>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>

    <h2>Añadir</h2>
    <form method="post" class="card">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
      <?php /* Un <select> de 313 opciones era un castigo. Ahora se escribe —número o nombre, en
               español o en inglés, sin tildes— y la lista se filtra al momento. El valor que
               viaja es la clave del plato, en el campo oculto; el servidor la sigue validando
               contra el catálogo como antes. */ ?>
      <label class="fld" for="hl-q">Plato <span class="opt">(escribe el número o el nombre)</span></label>
      <div class="combo" id="hl-combo">
        <input id="hl-q" class="combo-q" type="text" inputmode="search" autocomplete="off" spellcheck="false"
               placeholder="Por ejemplo: 56, cordero o lamb…"
               role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="hl-lista" aria-haspopup="listbox">
        <input type="hidden" name="hl_key" id="hl-key" value="">
        <ul class="combo-lista" id="hl-lista" role="listbox" hidden></ul>
      </div>
      <script>
        /* Catálogo mínimo para buscar: clave, número, nombre en español e inglés, pestaña,
           y si ya está destacado. ~20 KB que sólo carga quien abre el panel. */
        var PLATOS = <?= json_encode(array_map(function ($p) use ($tags) {
          return ['k' => $p['key'], 'id' => (string) $p['id'], 'es' => $p['name'], 'en' => $p['name_en'], 'g' => $p['sub'], 'd' => isset($tags[$p['key']])];
        }, $lista), JSON_UNESCAPED_UNICODE) ?>;
        (function () {
          var q = document.getElementById('hl-q'), key = document.getElementById('hl-key'), lista = document.getElementById('hl-lista');
          var activo = -1, visibles = [];
          function plano(t) {
            var d = String(t).toLowerCase().normalize('NFD'), out = '';
            for (var i = 0; i < d.length; i++) { var c = d.charCodeAt(i); if (c < 768 || c > 879) out += d.charAt(i); }
            return out;
          }
          function filtrar(t) {
            t = plano(t.trim());
            if (!t) return [];
            var esNum = /^\d+$/.test(t);
            return PLATOS.filter(function (p) {
              if (esNum) return p.id === t || p.id.indexOf(t) === 0;
              return plano(p.es).indexOf(t) !== -1 || plano(p.en).indexOf(t) !== -1 || plano(p.g).indexOf(t) !== -1;
            }).slice(0, 12);
          }
          function pintar() {
            visibles = filtrar(q.value);
            lista.textContent = '';
            activo = -1;
            if (!visibles.length) {
              if (q.value.trim()) {
                var v = document.createElement('li'); v.className = 'combo-vacio'; v.textContent = 'Ningún plato coincide.'; lista.appendChild(v);
                abrir(true);
              } else abrir(false);
              return;
            }
            visibles.forEach(function (p, i) {
              var li = document.createElement('li');
              li.setAttribute('role', 'option'); li.id = 'hl-op-' + i;
              li.className = 'combo-op' + (p.d ? ' ya' : '');
              li.setAttribute('aria-selected', 'false');
              var n = document.createElement('span'); n.className = 'combo-num'; n.textContent = p.id || '·';
              var t = document.createElement('span'); t.className = 'combo-txt';
              t.textContent = p.es;
              var s = document.createElement('small'); s.textContent = p.g + (p.en !== p.es ? ' · ' + p.en : '') + (p.d ? ' · ya destacado' : '');
              t.appendChild(s);
              li.appendChild(n); li.appendChild(t);
              li.addEventListener('pointerdown', function (e) { e.preventDefault(); elegir(i); });
              lista.appendChild(li);
            });
            abrir(true);
          }
          function abrir(si) { lista.hidden = !si; q.setAttribute('aria-expanded', String(si)); }
          function marcar(i) {
            var ops = lista.querySelectorAll('.combo-op');
            ops.forEach(function (o, j) { o.setAttribute('aria-selected', String(j === i)); o.classList.toggle('is-activo', j === i); });
            activo = i;
            q.setAttribute('aria-activedescendant', i >= 0 ? 'hl-op-' + i : '');
            if (i >= 0 && ops[i].scrollIntoView) ops[i].scrollIntoView({ block: 'nearest' });
          }
          function elegir(i) {
            var p = visibles[i]; if (!p || p.d) return;
            key.value = p.k;
            q.value = (p.id ? p.id + ' · ' : '') + p.es;
            q.classList.add('is-ok');
            abrir(false);
          }
          q.addEventListener('input', function () { key.value = ''; q.classList.remove('is-ok'); pintar(); });
          q.addEventListener('focus', function () { if (!key.value && q.value.trim()) pintar(); });
          q.addEventListener('keydown', function (e) {
            if (lista.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { pintar(); }
            if (e.key === 'ArrowDown') { e.preventDefault(); marcar(Math.min(visibles.length - 1, activo + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(Math.max(0, activo - 1)); }
            else if (e.key === 'Enter') { if (!lista.hidden && visibles.length) { e.preventDefault(); elegir(activo >= 0 ? activo : 0); } else if (!key.value) { e.preventDefault(); } }
            else if (e.key === 'Escape') { abrir(false); }
          });
          document.addEventListener('pointerdown', function (e) {
            if (!document.getElementById('hl-combo').contains(e.target)) abrir(false);
          });
          /* Sin plato elegido no se envía: el servidor lo rechazaría igual, pero el aviso aquí
             llega antes y dice qué falta. */
          q.form.addEventListener('submit', function (e) {
            if (!key.value) {
              e.preventDefault();
              if (window.toast) toast('Elige un plato de la lista: escribe el número o el nombre y toca el que sea.', 'bad');
              q.focus();
            }
          });
        })();
      </script>
      <label class="fld">Etiqueta
        <select name="hl_label" required>
          <?php foreach (ETIQUETAS as $e): ?>
            <option value="<?= h($e) ?>"><?= h(ETIQUETAS_ES[$e]) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <button class="save" name="destacado_add" value="1" type="submit">Añadir destacado</button>
    </form>

  <?php /* =================================================== OFERTAS ============== */ ?>
  </section>

  <section class="pane" data-pane="ofertas"<?= $pestana === 'ofertas' ? '' : ' hidden' ?>>
    <!-- Lo primero que se lee: qué está pasando ahora mismo con el reloj del restaurante.
         «Activa» en el panel y «no se ve nada» en la web sólo parecen contradecirse hasta que
         alguien dice la hora en voz alta. -->
    <div class="msg <?= $oferta_corriendo ? 'ok' : 'bad' ?>" style="margin-bottom:var(--s3)">
      <strong>
        <?php if (!$oferta['on']): ?>
          La oferta está apagada.
        <?php elseif ($oferta_corriendo): ?>
          Corriendo ahora mismo en la carta.
        <?php else: ?>
          Guardada, pero fuera de su horario: ahora no se ve en la carta.
        <?php endif; ?>
      </strong><br>
      En Canarias son las <?= h($ahora_canarias->format('H:i')) ?> del
      <?= h(minuscula(dia_semana($ahora_canarias->format('Y-m-d')))) ?>.
      <?php if ($oferta['on']): ?>
        La franja va de <?= h(hhmm((int) $oferta['from'])) ?> a <?= h(hhmm(((int) $oferta['to']) - 1)) ?>.
      <?php endif; ?>
    </div>

    <p class="hint">
      Un descuento que se enciende y se apaga solo a la hora que digas, <strong>en hora
      canaria</strong>, no en la del móvil del cliente. En la carta sale el precio rebajado
      arriba, el de siempre tachado debajo, y una etiqueta roja al lado del número.
    </p>

    <form method="post" id="fo">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">

      <div class="card">
<label class="switch">
          <input type="checkbox" name="oferta_on" value="1"<?= $oferta['on'] ? ' checked' : '' ?>>
          <span class="switch-pista" aria-hidden="true"><span class="switch-bola"></span></span>
          <span class="switch-txt">
            <span class="switch-on">La oferta está ENCENDIDA</span>
            <span class="switch-off">La oferta está APAGADA</span>
          </span>
        </label>
        <div class="grid2">
          <label class="fld">Descuento (%)
            <input type="number" name="pct" min="1" max="90" step="1" value="<?= (int) $oferta['percent'] ?>" required>
          </label>
          <label class="fld">Desde
            <input type="time" name="desde" value="<?= h(hhmm((int) $oferta['from'])) ?>" required>
          </label>
          <label class="fld">Hasta <span class="opt">(no incluida)</span>
            <input type="time" name="hasta" value="<?= h(hhmm((int) $oferta['to'])) ?>" required>
          </label>
        </div>
        <p class="hint" style="margin:0 2px">
          «Hasta 12:00» quiere decir que la última hora con descuento es las 11:59.
        </p>
      </div>

      <h2>Días</h2>
      <div class="card">
        <div class="marcas marcas-centro">
          <?php foreach (DIAS as $n => $nombre): ?>
            <label class="marca">
              <input type="checkbox" name="dia[]" value="<?= (int) $n ?>"<?= in_array($n, (array) $oferta['days'], true) ? ' checked' : '' ?>>
              <span class="tickmark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l9 -9"/></svg></span> <?= h($nombre) ?>
            </label>
          <?php endforeach; ?>
        </div>
      </div>

      <h2>Categorías enteras</h2>
      <div class="card">
        <p class="hint" style="margin-bottom:var(--s2)">
          Marca aquí una categoría y entran todos sus platos, incluidos los que se añadan más
          adelante. Debajo puedes además elegir platos sueltos.
        </p>
        <div class="cats">
          <?php foreach ($catsVisibles as $c => $n): ?>
            <label>
              <input type="checkbox" name="cat[]" value="<?= h($catIdDe[$c] ?? $c) ?>"<?= in_array($catIdDe[$c] ?? $c, (array) $oferta['cats'], true) ? ' checked' : '' ?>>
              <span><?= h($catsEs[$c] ?? $c) ?><em><?= (int) $n ?> plato<?= $n === 1 ? '' : 's' ?></em></span>
            </label>
          <?php endforeach; ?>
        </div>
      </div>

      <h2>Platos sueltos</h2>
      <div class="tools">
        <input class="search" id="qo" type="search" placeholder="Buscar plato o número…" autocomplete="off"
               aria-label="Buscar plato o número">
        <div class="chips" role="group" aria-label="Filtro">
          <button type="button" class="chip is-on" data-ofiltro="todos" aria-pressed="true">Todos</button>
          <button type="button" class="chip" data-ofiltro="marcados" aria-pressed="false">Sólo marcados</button>
        </div>
      </div>
      <p class="hint">
        Los platos de una categoría ya marcada arriba salen atenuados: ya están dentro y no hace
        falta tocarlos.
      </p>

      <?php $tabActual = null; foreach ($lista as $p):
        if ($p['tab'] !== $tabActual):
          if ($tabActual !== null) echo '</div>';
          $tabActual = $p['tab'];
          echo '<h2 class="sec osec">' . h($tabActual) . '</h2><div class="sec-body osec-body">';
        endif;
        $porCat = in_array((string) ($p['catId'] ?? ''), (array) $oferta['cats'], true);
        $suelto = in_array($p['key'], (array) $oferta['keys'], true);
        $sinPrecio = $p['price'] === ''; ?>
        <div class="row orow<?= $porCat ? ' por-categoria' : '' ?><?= $suelto ? ' is-oferta' : '' ?><?= $sinPrecio ? ' sin-precio' : '' ?>"
             data-cat="<?= h($p['catId'] ?? $p['cat']) ?>"
             data-name="<?= h(minuscula($p['name'] . ' ' . $p['name_en'] . ' ' . $p['id'] . ' ' . $p['sub'])) ?>">
          <label class="tick">
            <input type="checkbox" name="oferta_plato[]" value="<?= h($p['key']) ?>"
                   <?= $suelto ? ' checked' : '' ?><?= ($porCat || $sinPrecio) ? ' disabled' : '' ?>>
            <span class="sr">En oferta: <?= h($p['name']) ?></span>
          </label>
          <span class="num"><?= h($p['id']) ?></span>
          <span class="nm"><?= h($p['name']) ?><small><?= h($p['group']) ?><?= $p['name_en'] !== $p['name'] ? ' · ' . h($p['name_en']) : '' ?><?php
            if ($porCat) echo ' · toda la categoría';
            elseif ($sinPrecio) echo ' · sin precio';
          ?></small></span>
          <span class="pfijo"><?= $sinPrecio ? '' : h(CLIENTE_MONEDA) . h($p['price']) ?></span>
        </div>
      <?php endforeach; if ($tabActual !== null) echo '</div>'; ?>

      <p class="hint" id="ovacio" hidden>Ningún plato coincide con la búsqueda.</p>

      <div class="bar">
        <span class="count" id="ocount"><?= count($oferta['keys']) ?> plato(s) sueltos</span>
        <span class="acciones">
          <a class="ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver menú</a>
          <button class="save" name="guardar_oferta" value="1" type="submit">Guardar oferta</button>
        </span>
      </div>
    </form>

    <script>
      /* El mismo buscador que en agotados, sobre la lista de la oferta. */
      (function () {
        var q = document.getElementById('qo');
        if (!q) return;
        var vacio = document.getElementById('ovacio');
        var cuenta = document.getElementById('ocount');
        var filtro = 'todos';

        function aplicar() {
          var t = q.value.trim().toLowerCase();
          var total = 0;
          document.querySelectorAll('.osec-body').forEach(function (body) {
            var visibles = 0;
            body.querySelectorAll('.orow').forEach(function (row) {
              var marcado = row.classList.contains('is-oferta') || row.classList.contains('por-categoria');
              var hit = (!t || row.dataset.name.indexOf(t) !== -1)
                     && (filtro === 'todos' || marcado);
              row.classList.toggle('hidden', !hit);
              if (hit) visibles++;
            });
            body.classList.toggle('hidden', visibles === 0);
            var h2 = body.previousElementSibling;
            if (h2 && h2.classList.contains('osec')) h2.classList.toggle('hidden', visibles === 0);
            total += visibles;
          });
          vacio.hidden = total > 0;
        }
        q.addEventListener('input', aplicar);

        document.querySelectorAll('[data-ofiltro]').forEach(function (chip) {
          chip.addEventListener('click', function () {
            filtro = chip.dataset.ofiltro;
            document.querySelectorAll('[data-ofiltro]').forEach(function (c) {
              var on = c === chip;
              c.classList.toggle('is-on', on);
              c.setAttribute('aria-pressed', String(on));
            });
            aplicar();
          });
        });

        var form = document.getElementById('fo');
        form.addEventListener('change', function (e) {
          if (e.target.name === 'oferta_plato[]') {
            e.target.closest('.orow').classList.toggle('is-oferta', e.target.checked);
          }
          /* Marcar una categoría entera desactiva sus platos sueltos: ya están dentro, y dejar
             las dos casillas vivas invita a pensar que hay que marcar las dos. */
          if (e.target.name === 'cat[]') {
            var cat = e.target.value;
            document.querySelectorAll('.orow').forEach(function (row) {
              if (row.dataset.cat !== cat) return;
              var cb = row.querySelector('input[name="oferta_plato[]"]');
              row.classList.toggle('por-categoria', e.target.checked);
              if (cb && !row.classList.contains('sin-precio')) cb.disabled = e.target.checked;
            });
          }
          cuenta.textContent = document.querySelectorAll('input[name="oferta_plato[]"]:checked').length + ' plato(s) sueltos';
        });
      })();
    </script>

  </section>

  <section class="pane" data-pane="precios"<?= $pestana === 'precios' ? '' : ' hidden' ?>>

    <?php if ($previsua): ?>
      <p class="hint">
        <strong>Todavía no se ha publicado nada.</strong> Esto es lo que quedaría con una subida
        del <?= h(rtrim(rtrim(number_format($previsua['pct'], 2, ',', ''), '0'), ',')) ?>%, ya
        redondeado a múltiplos de 5 céntimos. Cambia los que no te cuadren y publica.
      </p>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <?php $tabActual = null; foreach ($previsua['filas'] as $f):
          if ($f['tab'] !== $tabActual):
            if ($tabActual !== null) echo '</div>';
            $tabActual = $f['tab'];
            echo '<h2>' . h($tabActual) . '</h2><div class="card">';
          endif; ?>
          <div class="prow">
            <span class="num"><?= h($f['id']) ?></span>
            <span class="nm"><?= h($f['name']) ?></span>
            <span class="pviejo"><?= h(CLIENTE_MONEDA) ?><?= h($f['actual']) ?></span>
            <input class="pnuevo" type="text" inputmode="decimal"
                   name="precio[<?= h($f['key']) ?>]" value="<?= h($f['nuevo']) ?>"
                   <?= isset($hermanas[$f['key']]) ? 'data-plato="' . h($f['name'] . ' ' . $f['carta']) . '"' : '' ?>
                   aria-label="Precio nuevo de <?= h($f['name']) ?>">
          </div>
        <?php endforeach; if ($tabActual !== null) echo '</div>'; ?>

        <div class="bar">
          <a href="?t=precios" class="count">Cancelar</a>
          <button class="save" name="precios_publicar" value="1" type="submit">Publicar precios</button>
        </div>
      </form>

      <script>
        /* El mismo plato está en varias filas —su pestaña de comida y otra vez en Sin gluten o
           en Vegano— y el precio se escribe una sola vez. Se copia mientras se teclea, para que
           quien lo cambia VEA que las dos filas se mueven; el servidor lo completa igual al
           guardar, pero enterarse al publicar es enterarse tarde. */
        document.addEventListener('input', function (e) {
          var campo = e.target;
          if (!campo.classList || !campo.classList.contains('pnuevo')) return;
          var plato = campo.dataset.plato;
          if (!plato) return;
          document.querySelectorAll('.pnuevo[data-plato="' + plato.replace(/"/g, '\\"') + '"]')
            .forEach(function (otro) {
              if (otro !== campo) otro.value = campo.value;
            });
        });
      </script>

    <?php else: ?>
      <p class="hint">
        Subir precios va en dos pasos: primero ves la lista entera con los precios nuevos ya
        redondeados, y sólo se publica cuando lo dices tú. <strong>Pulsar un porcentaje no
        cambia nada en la web.</strong>
      </p>

      <div class="card">
        <form method="post">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
          <div class="pcts">
            <button class="pct" name="subir" value="5" type="submit">+5%</button>
            <button class="pct" name="subir" value="10" type="submit">+10%</button>
            <button class="pct" name="subir" value="15" type="submit">+15%</button>
          </div>
          <input type="hidden" name="precios_calcular" value="1">
        </form>
      </div>

      <div class="card">
        <form method="post">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
          <label class="fld" style="max-width:220px">Otro porcentaje
            <input type="text" inputmode="decimal" name="subir" placeholder="7,5" required>
          </label>
          <button class="save" name="precios_calcular" value="1" type="submit">Ver cómo quedaría</button>
        </form>
      </div>

      <?php if ($precios): ?>
        <h2>Precios distintos de la carta (<?= count($precios) ?>)</h2>
        <div class="card">
          <?php foreach ($precios as $k => $v): $p = $porKey[$k] ?? null; if (!$p) continue; ?>
            <div class="prow">
              <span class="num"><?= h($p['id']) ?></span>
              <span class="nm"><?= h($p['name']) ?></span>
              <span class="pviejo"><?= h(CLIENTE_MONEDA) ?><?= h($p['price']) ?></span>
              <span class="pfijo"><?= h(CLIENTE_MONEDA) ?><?= h((string) $v) ?></span>
            </div>
          <?php endforeach; ?>
        </div>
        <form method="post" onsubmit="return confirm('¿Devolver todos los precios a los de la carta?')">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
          <button class="ghost" name="precios_reset" value="1" type="submit">Volver a los precios de la carta</button>
        </form>
      <?php else: ?>
        <p class="hint">Ahora mismo la carta muestra sus precios originales.</p>
      <?php endif; ?>
    <?php endif; ?>

  <?php /* ===================================================== JUEGO ============== */ ?>
  </section>

  <?php if (CLIENTE_JUEGO): ?>
  <section class="pane" data-pane="juego"<?= $pestana === "juego" ? "" : " hidden" ?>>
    <p class="hint">
      Un minijuego de 30 segundos para quien ya ha pedido y está esperando. Se abre desde la
      carta y no necesita nada de la cocina: <strong>no hay premio que dar ni código que
      comprobar</strong>. Sólo se guarda la puntuación más alta que se ha hecho aquí.
    </p>

    <form method="post">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
      <div class="card">
        <label class="switch">
          <input type="checkbox" name="juego_on" value="1"<?= !empty($juego["on"]) ? " checked" : "" ?>>
          <span class="switch-pista"><span class="switch-bola"></span></span>
          <span class="switch-txt">
            <span class="switch-on">El juego sale en la carta</span>
            <span class="switch-off">El juego NO sale en la carta</span>
          </span>
        </label>
        <p class="hint" style="margin:var(--s3) 2px 0">
          Apagado, la tarjeta de Chilli Rush desaparece de la carta y no se apunta ningún récord.
          La página del juego sigue existiendo para quien tenga el enlace guardado.
        </p>
      </div>
      <div class="bar">
        <span class="count"><?= !empty($juego["on"]) ? "En la carta" : "Fuera de la carta" ?></span>
        <span class="acciones">
          <a class="ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver menú</a>
          <button class="save" name="guardar_juego" value="1" type="submit">Guardar</button>
        </span>
      </div>
    </form>

    <h2>Los tres mejores</h2>
    <div class="card">
      <?php if (!$record): ?>
        <p class="hint" style="margin:0 2px">
          <strong>Todavía no ha jugado nadie.</strong> El primero que puntúe abre el marcador.
        </p>
      <?php else: ?>
        <ol class="podio-admin">
          <?php foreach ($record as $i => $x): ?>
          <li>
            <span class="pod-pts"><?= number_format($x["puntos"], 0, ",", ".") ?></span>
            <?php if ($x["nombre"] !== ""): ?>
              <span class="pod-quien"><?= h($x["nombre"]) ?></span>
            <?php else: ?>
              <span class="pod-quien anon">sin nombre</span>
            <?php endif; ?>
            <?php if ($x["pais"] !== "" && isset(PAISES_NOMBRE[$x["pais"]])): ?>
              <img class="pod-bandera" src="../assets/banderas/<?= h($x["pais"]) ?>.webp"
                   width="20" height="15"
                   alt="<?= h(PAISES_NOMBRE[$x["pais"]]) ?>">
            <?php endif; ?>
            <span class="pod-fecha">
              <?php if ($x["fecha"] !== ""): ?>
                <?= h((new DateTimeImmutable($x["fecha"]))->format("d/m/Y")) ?>
              <?php endif; ?>
            </span>
            <?php if ($x["nombre"] !== "" || $x["pais"] !== ""): ?>
            <form method="post" style="margin:0">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <button class="ghost pod-x" name="borrar_nombre" value="<?= (int) $i ?>"
                      type="submit" title="Quitar el nombre y dejar la puntuación">
                Quitar nombre</button>
            </form>
            <?php endif; ?>
          </li>
          <?php endforeach; ?>
        </ol>
        <p class="hint" style="margin:var(--s3) 2px 0">
          El primero sale en la tarjeta del juego dentro de la carta; los tres, al acabar una
          partida. El nombre y el país los escribe quien juega, y por eso hay un botón para
          quitarlos: <strong>la lista de palabrotas del servidor nunca está completa</strong>.
          Quitar el nombre deja la puntuación en su sitio.
        </p>

        <?php /* Vaciar el marcador va en su propio formulario y no en el Guardar de arriba:
                 borra algo que no se recupera, y no se pulsa por inercia al lado de un
                 interruptor. */ ?>
        <div class="fila-accion">
          <span class="hint" style="margin:0">Empieza de cero. No se puede deshacer.</span>
          <form method="post" style="margin:0">
            <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
            <button class="ghost" name="reiniciar_record" value="1" type="submit">
              Vaciar el marcador</button>
          </form>
        </div>
      <?php endif; ?>
    </div>
  </section>
  <?php endif; ?>

  <?php /* Publicidad: independiente del juego y de CLIENTE_JUEGO a proposito (decision del
           propietario): el hueco es de la CARTA y un cliente sin juego tambien lo alquila.
           Fase 7: antes de esta correccion, el <section> de aqui abajo vivia DENTRO del
           if (CLIENTE_JUEGO) de arriba por error de anidado -- el comentario ya decia que
           debian ser independientes, el codigo no lo era todavia. Ahora cada uno cierra su
           propio if justo donde termina su propia section. */ ?>
  <?php if (CLIENTE_PUBLICIDAD): ?>
  <section class="pane" data-pane="publicidad"<?= $pestana === 'publicidad' ? '' : ' hidden' ?>>
    <p class="hint">
      Un hueco publicitario en la carta, entre la tarjeta del juego y la nota de Google.
      <strong>Solo sale en moviles</strong> (pantallas de menos de 768&nbsp;px), con el ancho de la
      tarjeta. La creatividad debe medir exactamente
      <strong><?= PUB_ANCHO_OBLIGATORIO ?>&nbsp;&times;&nbsp;<?= PUB_ALTO_OBLIGATORIO ?>&nbsp;px</strong>:
      el banner mantiene esa proporcion con una altura responsive, no fija
      (a 560&nbsp;px de ancho llega a <?= (int) round(560 * PUB_ALTO_OBLIGATORIO / PUB_ANCHO_OBLIGATORIO) ?>&nbsp;px
      de alto). Sin imagen, apagado o fuera de fechas, no ocupa nada.
    </p>

    <?php $pubEstado = pub_estado_banner($bannerPub); ?>
    <div class="card">
      <p style="margin:0 2px var(--s3)">
        Estado ahora mismo: <strong><?= h($pubEstado) ?></strong>
        <?php if ($pubEstado === 'INCOMPLETO'): ?> &mdash; encendido pero sin imagen valida.<?php endif; ?>
        <span class="hint" style="display:block;margin-top:4px">
          Son las <?= h((new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('H:i')) ?> en el restaurante.
        </span>
      </p>

      <?php $pubImg = is_array($bannerPub) ? (string) ($bannerPub['img'] ?? '') : ''; ?>
      <?php if (pub_nombre_valido($pubImg)): ?>
        <p style="margin:0 2px var(--s2)"><img
          src="<?= h('../' . PUB_URL . $pubImg) ?>" alt="La creatividad actual del banner"
          style="width:100%;max-width:560px;height:auto;aspect-ratio:1120/480;object-fit:cover;border-radius:8px"></p>
        <form method="post" style="margin:0 0 var(--s3)">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
          <button class="ghost-btn" name="eliminar_banner" value="1" type="submit">Quitar la imagen</button>
        </form>
      <?php else: ?>
        <p class="hint" style="margin:0 2px var(--s3)"><strong>Sin imagen todavia.</strong></p>
      <?php endif; ?>

      <form method="post" enctype="multipart/form-data" style="margin:0">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <p class="hint" style="margin:0 2px var(--s2)">Tamano obligatorio: <?= PUB_ANCHO_OBLIGATORIO ?>
          &times; <?= PUB_ALTO_OBLIGATORIO ?>&nbsp;px &middot; Maximo: <?= PUB_MAX_BYTES / 1048576 ?>&nbsp;MB
          &middot; JPG, PNG o WebP</p>
        <input type="file" name="pub_img" accept="image/jpeg,image/png,image/webp">
        <button class="save" name="subir_banner" value="1" type="submit"><?= pub_nombre_valido($pubImg) ? 'Reemplazar imagen' : 'Subir imagen' ?></button>
      </form>
    </div>

    <form method="post">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
      <div class="card">
        <label class="switch">
          <input type="checkbox" name="pub_on" value="1"<?= !empty($bannerPub['on']) ? ' checked' : '' ?>>
          <span class="switch-pista"><span class="switch-bola"></span></span>
          <span class="switch-txt">
            <span class="switch-on">El banner sale en la carta (si tiene imagen y esta en fechas)</span>
            <span class="switch-off">El banner NO sale en la carta</span>
          </span>
        </label>

        <p style="margin:var(--s3) 2px var(--s1)"><label>Enlace al tocar el banner (opcional)<br>
          <input type="url" name="pub_url" placeholder="https://ejemplo.com/promo"
                 value="<?= h((string) ($bannerPub['url'] ?? '')) ?>" style="width:100%"></label></p>

        <p style="margin:var(--s2) 2px var(--s1)"><label>
          <input type="checkbox" name="pub_blank" value="1"<?= !isset($bannerPub['blank']) || !empty($bannerPub['blank']) ? ' checked' : '' ?>>
          Abrir el enlace en una pestana nueva</label></p>

        <p style="margin:var(--s2) 2px var(--s1)"><label>Empieza (opcional, hora del restaurante)<br>
          <input type="datetime-local" name="pub_inicio"
                 value="<?= h(pub_fecha_a_local((string) ($bannerPub['startAt'] ?? ''))) ?>"></label></p>

        <p style="margin:var(--s2) 2px 0"><label>Termina (opcional, hora del restaurante)<br>
          <input type="datetime-local" name="pub_fin"
                 value="<?= h(pub_fecha_a_local((string) ($bannerPub['endAt'] ?? ''))) ?>"></label></p>
      </div>
      <div class="bar">
        <span class="count"><?= h($pubEstado) ?></span>
        <span class="acciones">
          <a class="ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver menu</a>
          <button class="save" name="guardar_publicidad" value="1" type="submit">Guardar</button>
        </span>
      </div>
    </form>
  </section>
  <?php endif; ?>

  <?php /* ---------------------------------------------------------------- datos */ ?>
  <?php if (DATOS_ACTIVO): ?>
  <section class="pane" data-pane="datos"<?= $pestana === 'datos' ? '' : ' hidden' ?>>

    <?php /* Sin parrafo de cabecera: manda la rejilla. Lo que hay que explicar esta abajo.
         Los avisos de estado SI van arriba: si no se esta contando nada, eso no puede leerse
         al final. */ ?>
    <?php if ($dt["topado"]): ?>
      <div class="msg bad">
        <strong>Hay un día que ha llegado al tope.</strong> El contador para en
        <?= number_format(DATOS_MAX_DIA, 0, ",", ".") ?> aperturas al día para no llenar el
        disco, y ese día hubo más de las que se apuntaron. Sube <code>DATOS_MAX_DIA</code> en
        <code>admin/config.php</code> si se repite.
      </div>
    <?php endif; ?>


    <?php if (!$dt["escribible"]): ?>
      <div class="msg bad">
        <strong>No se está contando nada.</strong> La carpeta <code>admin/</code> no es
        escribible por PHP, así que no se puede apuntar ninguna apertura. En cPanel suele
        arreglarse poniéndole 755 a <code>admin/</code>.
      </div>
    <?php elseif (!$dt["serie"]): ?>
      <div class="msg">
        Todavía no hay ningún dato. El contador empieza <strong>la próxima vez que alguien abra
        la carta</strong> y la tenga delante cuatro segundos.
      </div>
    <?php else: ?>

      <?php
        $ptos = $dt["dias"];
        $topeG = max(1, max(array_column($ptos, "n")));
        $ult = count($ptos) - 1;
      ?>

      <div class="dt-bento">

        <div class="dt-baldosa ancha" id="dt-tile">
          <div class="dt-cab">
            <span class="rotulo"><span class="dt-vivo" aria-hidden="true"></span>Últimos 30 días</span>
            <span class="dt-lectura" id="dt-lectura" role="status" aria-live="polite"
                  data-reposo="<?= number_format($dt["hoy"], 0, ",", ".") ?>">
              <?= number_format($dt["hoy"], 0, ",", ".") ?><em>hoy</em></span>
          </div>
          <div class="dt-barras" id="dt-barras" role="img"
               aria-label="Aperturas de los últimos 30 días. Los totales, en las tarjetas de abajo.">
            <?php foreach ($ptos as $i => $x):
                 $alto = $x["n"] > 0 ? max(4, round(($x["n"] / $topeG) * 100)) : 0;
                 $f = new DateTimeImmutable($x["fecha"]); ?>
              <span class="dt-b<?= $x["n"] > 0 ? "" : " cero" ?>" data-i="<?= $i ?>"
                    style="--i:<?= $i ?>">
                <span class="dt-globo"><?= number_format($x["n"], 0, ",", ".") ?>
                  · <?= h(mb_substr(dia_semana($x["fecha"]), 0, 3, "UTF-8")) ?> <?= h($f->format("d/m")) ?></span>
                <i style="height:<?= $alto ?>%"></i>
              </span>
            <?php endforeach; ?>
          </div>
          <div class="dt-eje">
            <span><?= h((new DateTimeImmutable($ptos[0]["fecha"]))->format("d/m")) ?></span>
            <?php if ($dt["pico"] !== null): ?>
              <span>máx. <?= number_format($ptos[$dt["pico"]]["n"], 0, ",", ".") ?>
                el <?= h((new DateTimeImmutable($ptos[$dt["pico"]]["fecha"]))->format("d/m")) ?></span>
            <?php endif; ?>
            <span>hoy</span>
          </div>
        </div>

        <div class="dt-baldosa">
          <div class="dt-cab"><span class="rotulo">Hoy</span>
            <?= dt_chip(datos_pct($dt["hoy"], $dt["hoyAntes"]), $dt["habiaHoy"]) ?></div>
          <div class="dt-cifra-n"><?= number_format($dt["hoy"], 0, ",", ".") ?></div>
          <?= dt_tira($dt["tiraHoy"], "hace 7 días", "hoy", "Los siete últimos días. Hoy es la última barra.") ?>
        </div>
        <div class="dt-baldosa">
          <div class="dt-cab"><span class="rotulo">Esta semana</span>
            <?= dt_chip(datos_pct($dt["semana"], $dt["semanaAntes"]), $dt["habiaSemana"]) ?></div>
          <div class="dt-cifra-n"><?= number_format($dt["semana"], 0, ",", ".") ?></div>
          <?= dt_tira($dt["tiraSemana"], "lun", "dom", "La semana entera; los días que faltan van en hueco.", $dt["diasSemana"]) ?>
        </div>
        <div class="dt-baldosa">
          <div class="dt-cab"><span class="rotulo"><?= h($dt["mesNombre"]) ?></span>
            <?= dt_chip(datos_pct($dt["mes"], $dt["mesAntes"]), $dt["habiaMes"]) ?></div>
          <div class="dt-cifra-n"><?= number_format($dt["mes"], 0, ",", ".") ?></div>
          <?= dt_tira($dt["tiraMes"], "día 1", "día " . $dt["diasDelMes"], "El mes entero; los días que faltan van en hueco.", $dt["diaDelMes"]) ?>
        </div>
      </div>


      <?php
        /* Los tres periodos se pintan de una vez y el boton sólo enseña uno: son tres listas de
           diez filas, no vale la pena una peticion al servidor para cambiar de una a otra. */
        $vperiodos = [
          'hoy'    => ['rot' => 'Hoy',        'v' => $dt["vhoy"],    'ap' => $dt["hoy"]],
          'semana' => ['rot' => 'Esta semana','v' => $dt["vsemana"], 'ap' => $dt["semana"]],
          'mes'    => ['rot' => $dt["mesNombre"], 'v' => $dt["vmes"], 'ap' => $dt["mes"]],
        ];
        $vhayAlgo = ($dt["vhoy"] || $dt["vsemana"] || $dt["vmes"]);
      ?>
      <div class="vp">
        <div class="vp-cab">
          <h3>Platos más consultados</h3>
          <?php if ($vhayAlgo): ?>
            <div class="vp-per" role="group" aria-label="Periodo">
              <?php foreach ($vperiodos as $k => $per): ?>
                <button type="button" data-vper="<?= h($k) ?>"
                        aria-pressed="<?= $k === 'semana' ? 'true' : 'false' ?>"><?= h($per['rot']) ?></button>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
        </div>

        <?php if (!$vhayAlgo): ?>
          <p class="vp-vacio">
            Todavía nadie ha abierto la ficha de un plato. Se cuenta cuando alguien
            <strong>toca un plato con foto</strong> y se le abre la ficha, una vez por plato y
            visita. Los platos sin foto no abren ficha, así que no aparecen aquí.
          </p>
        <?php else: foreach ($vperiodos as $k => $per):
          $filas = vp_lista($per['v'], $dt["vid"], (int) $per['ap'], 10);
          $todas = vp_lista($per['v'], $dt["vid"], (int) $per['ap'], 0);
          $cuantos = 0;
          foreach ($per['v'] as $id => $n) if (isset($dt["vid"][$id])) $cuantos++; ?>
          <div class="vp-caja" data-vpanel="<?= h($k) ?>"<?= $k === 'semana' ? '' : ' hidden' ?>>
            <?php if ($filas === ''): ?>
              <p class="vp-vacio">Ningún plato consultado en este periodo.</p>
            <?php else: ?>
              <div class="vp-lista"><?= $filas ?></div>
              <?php if ($cuantos > 10): ?>
                <details class="vp-mas">
                  <summary>Ver los <?= (int) $cuantos ?> platos</summary>
                  <div class="vp-lista" style="margin-top:var(--s2)"><?= $todas ?></div>
                </details>
              <?php endif; ?>
            <?php endif; ?>
          </div>
        <?php endforeach; endif; ?>

        <p class="vp-pie">
          El porcentaje es sobre las aperturas de la carta del mismo periodo.
          <b>Aquí sólo salen los platos con foto</b>: son los únicos cuya ficha se abre, así que
          esto no compara un plato con todos, compara los que tienen foto entre sí.
        </p>
      </div>

      <script>
        (function () {
          var botones = document.querySelectorAll('[data-vper]');
          botones.forEach(function (b) {
            b.addEventListener('click', function () {
              botones.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
              document.querySelectorAll('[data-vpanel]').forEach(function (p) {
                p.hidden = (p.dataset.vpanel !== b.dataset.vper);
              });
            });
          });
        })();
      </script>

      <div class="dt-nota">
        <div class="dt-nota-cab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>
          <span class="rotulo">Cómo leer esto</span>
        </div>
        <div class="dt-nota-lista">
          <p><b>Son móviles, no clientes.</b>
            El mismo móvil cuenta una vez al día, aunque abra la carta tres veces. Y en una mesa
            de cuatro donde sólo uno mira, cuenta uno.</p>
        </div>
        <p class="dt-nota-pie">
          <span>Desde el <?= h((new DateTimeImmutable($dt["desde"]))->format("d/m/Y")) ?></span>
          <span><?= number_format($dt["total"], 0, ",", ".") ?>
            <?= $dt["total"] == 1 ? "apertura" : "aperturas" ?> en total</span>
          <span>Se guardan <?= (int) DATOS_MESES ?> meses</span>
        </p>
      </div>
    <?php endif; ?>
  </section>
  <?php endif; ?>

  <?php /* ---------------------------------------------------------------- marca */ ?>
  <section class="pane" data-pane="marca"<?= $pestana === 'marca' ? '' : ' hidden' ?>>
    <p class="hint">
      Las fotos de portada, el color de marca y las copias de seguridad. Secundario, Oscuro
      y Neutro son del motor y no cambian nunca; el Primario es el único tuyo, y se puede
      <strong>volver a él cuando haga falta</strong> -- igual que las fotos y las copias.
    </p>

      <h2>Fotos de portada</h2>
      <div class="card">
        <p class="hint">
          Hasta <?= (int) HERO_MAX ?> fotos, y la carta abre con ellas: se pasan con el dedo.
          Puedes elegir varias de una vez.
          <strong>Máximo 1 MB por foto</strong> — por encima de eso no se ve mejor y sí tarda
          más en abrir con datos móviles. JPG, PNG o WebP, mínimo 800 px de ancho.
          Salen recortadas a lo ancho, así que lo importante conviene tenerlo en el centro.
        </p>
        <?php if (count($fotos) < HERO_MAX): ?>
          <p class="hint" style="margin-top:calc(var(--s2) * -1)">
            Quedan <strong><?= HERO_MAX - count($fotos) ?></strong>.
            Si el servidor rechaza el envío por tamaño, súbelas de dos en dos.
          </p>
        <?php endif; ?>

        <?php if (!$fotos): ?>
          <p class="foto-vacio">Todavía no hay fotos. La carta abre directamente con el nombre del restaurante.</p>
        <?php else: ?>
          <div class="fotos">
            <?php foreach ($fotos as $i => $f): ?>
              <div class="foto" data-foto="<?= h($f) ?>">
                <span class="pos"><?= $i + 1 ?></span>
                <img src="../assets/hero/<?= h($f) ?>" alt="">
                <span class="hueco"></span>
                <form method="post" style="display:contents">
                  <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                  <input type="hidden" name="dir" value="arriba">
                  <button class="foto-btn" name="mover_foto" value="<?= h($f) ?>" type="submit"
                          data-mover="arriba"
                          aria-label="Subir la foto <?= $i + 1 ?>"<?= $i === 0 ? ' disabled' : '' ?>><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6 -6l6 6"/></svg></button>
                </form>
                <form method="post" style="display:contents">
                  <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                  <input type="hidden" name="dir" value="abajo">
                  <button class="foto-btn" name="mover_foto" value="<?= h($f) ?>" type="submit"
                          data-mover="abajo"
                          aria-label="Bajar la foto <?= $i + 1 ?>"<?= $i === count($fotos) - 1 ? ' disabled' : '' ?>><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6"/></svg></button>
                </form>
                <form method="post" style="display:contents"
                      onsubmit="return confirm('¿Quitar esta foto de la carta?')">
                  <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                  <button class="foto-btn quitar" name="quitar_foto" value="<?= h($f) ?>" type="submit"
                          aria-label="Quitar la foto <?= $i + 1 ?>"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/></svg></button>
                </form>
              </div>
            <?php endforeach; ?>
          </div>
          <p class="foto-aviso hint" role="status" aria-live="polite"></p>
        <?php endif; ?>

        <?php if (count($fotos) < HERO_MAX): ?>
          <form method="post" enctype="multipart/form-data" class="subir">
            <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
            <?php /* Aviso al navegador, no defensa: el límite de verdad se comprueba en PHP. */ ?>
            <input type="hidden" name="MAX_FILE_SIZE" value="<?= (int) HERO_MAX_BYTES ?>">
            <input type="file" name="foto[]" accept="image/jpeg,image/png,image/webp" multiple required
                   aria-label="Elegir fotos">
            <button class="save" name="subir_foto" value="1" type="submit">Subir</button>
          </form>
        <?php else: ?>
          <p class="hint" style="margin:0 2px">
            Ya están las <?= (int) HERO_MAX ?>. Quita una para poder subir otra.
          </p>
        <?php endif; ?>
      </div>

      <h2>Colores</h2>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">

        <label class="fld" for="color-principal-hex">Colores
          <span class="opt">(el Primario es tuyo -- en blanco, el de fábrica: <?= h(CLIENTE_COLOR_PRINCIPAL) ?>)</span>
        </label>
        <div class="colores-fila">
          <input type="color" id="color-principal-picker" value="<?= h($colorPrincipalActual) ?>"
                 aria-label="Elegir color principal con el selector">
          <input type="text" id="color-principal-hex" name="marca_color_principal"
                 value="<?= h($marca['colorPrincipal']) ?>" placeholder="<?= h(CLIENTE_COLOR_PRINCIPAL) ?>"
                 pattern="#?[0-9A-Fa-f]{6}" maxlength="7" spellcheck="false" autocomplete="off"
                 aria-label="Color principal en hexadecimal">
          <button type="button" class="ghost" id="color-principal-restaurar">Restaurar color original</button>
          <span class="color-fijo" role="group" aria-label="Secundario, del motor: <?= h(CLIENTE_COLOR_SECUNDARIO) ?>">
            <span class="color-fijo-punto" style="background:<?= h(CLIENTE_COLOR_SECUNDARIO) ?>" aria-hidden="true"></span>
            <span class="color-fijo-hex" aria-hidden="true"><?= h(CLIENTE_COLOR_SECUNDARIO) ?></span>
          </span>
          <span class="color-fijo" role="group" aria-label="Oscuro, del motor: <?= h(CLIENTE_COLOR_OSCURO) ?>">
            <span class="color-fijo-punto" style="background:<?= h(CLIENTE_COLOR_OSCURO) ?>" aria-hidden="true"></span>
            <span class="color-fijo-hex" aria-hidden="true"><?= h(CLIENTE_COLOR_OSCURO) ?></span>
          </span>
          <span class="color-fijo" role="group" aria-label="Neutro, del motor: <?= h(CLIENTE_COLOR_NEUTRAL) ?>">
            <span class="color-fijo-punto" style="background:<?= h(CLIENTE_COLOR_NEUTRAL) ?>" aria-hidden="true"></span>
            <span class="color-fijo-hex" aria-hidden="true"><?= h(CLIENTE_COLOR_NEUTRAL) ?></span>
          </span>
        </div>
        <p class="hint" style="margin:6px 2px 0">
          El Primario (círculo + hex editables) se aplica a la carta al momento, sin
          recompilar. Un color claro no se rechaza por serlo: el texto y los iconos que
          van encima pasan solos a oscuros o a claros, lo que se lea mejor. Solo se
          rechaza si de verdad no hay forma de leerlo, y se explica por qué.
        </p>
        <p class="hint" style="margin-top:6px">
          Secundario, Oscuro y Neutro son del motor, no del restaurante: iguales para
          cualquier carta y no se cambian desde aquí. El rojo de las ofertas y del picante
          tampoco es un color de marca -- es un aviso, y es igual para todos los clientes.
        </p>

        <h2>La nota de Google</h2>
        <div class="card">
          <p class="hint">
            Sale al final de la carta, justo encima del pie: la nota, cinco estrellas y el
            número de reseñas. Va ahí y no arriba porque quien lee esto ya está sentado; lo
            que hace la prueba social al final es recordar que se puede dejar una reseña. Si
            has puesto el enlace de reseñas en la pestaña Juego, el bloque lleva a él.
          </p>
          <label class="switch">
            <input type="checkbox" name="op_on" value="1"<?= $opinion['on'] ? ' checked' : '' ?>>
            <span class="switch-pista" aria-hidden="true"><span class="switch-bola"></span></span>
            <span class="switch-txt">
              <span class="switch-on">La nota SE ENSEÑA en la carta</span>
              <span class="switch-off">La nota NO se enseña</span>
            </span>
          </label>
          <div class="grid2">
            <label class="fld">Nota <span class="opt">(como en Google: 4,9)</span>
              <input name="op_nota" inputmode="decimal" maxlength="3"
                     value="<?= h(str_replace('.', ',', (string) $opinion['rating'])) ?>" placeholder="4,9">
            </label>
            <label class="fld">Número de reseñas
              <input type="number" name="op_cuantas" min="0" max="100000" step="1"
                     value="<?= (int) $opinion['count'] ?>" placeholder="180">
            </label>
          </div>
          <p class="hint" style="margin:0 2px">
            Cópialos de tu ficha de Google tal cual salen allí. Se escriben a mano y se
            cambian cuando cambien: no hay nada conectado a Google, y para un dato que se
            mueve dos veces al año es lo que toca.
          </p>

          <label class="fld" style="margin-top:var(--s3)">Enlace para dejar reseña
            <span class="opt">(tiene que empezar por https://)</span>
            <input name="op_url" type="url" inputmode="url" maxlength="300"
                   value="<?= h($resena['url'] ?? '') ?>"
                   placeholder="https://g.page/r/XXXXXXXXXXXX/review">
          </label>
          <p class="hint" style="margin:0 2px">
            Se usa al tocar la nota al final de la carta. El juego ya no lleva a ningún sitio:
            se juega y se vuelve a la carta, sin pedir nada a nadie.
            <br>
            No tiene que ser de Google. Vale cualquier dirección donde se deje opinión —Google,
            TripAdvisor, El Tenedor, la que use el negocio— y el bloque del final de la carta
            lleva al mismo sitio.
          </p>
        </div>

        <h2>Redes</h2>
        <div class="card">
          <p class="hint">
            Salen como iconos al final de la carta, debajo de la nota. Los que dejes en blanco
            no aparecen: un restaurante con sólo WhatsApp enseña un icono, no cuatro huecos.
          </p>

          <label class="fld">WhatsApp <span class="opt">(sólo el número, con el código de país)</span>
            <input name="red_whatsapp" inputmode="tel" maxlength="20"
                   value="<?= h($redes['whatsapp'] ?? '') ?>" placeholder="34617798557">
          </label>
          <p class="hint" style="margin:-8px 2px var(--s3)">
            Sin el <code>+</code>, sin espacios y sin el 0 de delante: da igual cómo lo
            escribas, se limpia solo. <strong>El código de país es obligatorio</strong> — 34
            para España. El enlace de mensaje directo lo monta la carta.
          </p>

          <label class="fld">Instagram
            <input name="red_instagram" type="url" inputmode="url" maxlength="300"
                   value="<?= h($redes['instagram'] ?? '') ?>"
                   placeholder="https://www.instagram.com/turestaurante">
          </label>
          <label class="fld">Facebook
            <input name="red_facebook" type="url" inputmode="url" maxlength="300"
                   value="<?= h($redes['facebook'] ?? '') ?>"
                   placeholder="https://www.facebook.com/turestaurante">
          </label>
          <label class="fld">Tripadvisor
            <input name="red_tripadvisor" type="url" inputmode="url" maxlength="300"
                   value="<?= h($redes['tripadvisor'] ?? '') ?>"
                   placeholder="https://www.tripadvisor.es/Restaurant_Review-...">
          </label>
          <p class="hint" style="margin:0 2px">
            Se comprueba que cada dirección sea de su red antes de guardar: pegar la de
            Instagram en la casilla de Facebook es el error más común, y así no pasa.
          </p>
        </div>

        <h2>Nombre en la carta</h2>
        <div class="card">
          <p class="hint">
            Lo que ve el comensal al abrir la carta: el nombre grande y el texto pequeño de
            encima. Deja los dos en blanco para usar los de fábrica.
          </p>
          <label class="fld">Nombre del restaurante
            <span class="opt">(máximo 20 caracteres; en blanco, el de fábrica)</span>
            <input name="marca_nombre" maxlength="20"
                   value="<?= h($marca['nombreVisible']) ?>"
                   placeholder="<?= h(CLIENTE_NOMBRE) ?>">
          </label>
          <label class="fld">Texto pequeño, encima del nombre
            <span class="opt">(máximo 25 caracteres; en blanco, el de fábrica)</span>
            <input name="marca_rotulo" maxlength="25"
                   value="<?= h($marca['rotuloVisible']) ?>"
                   placeholder="<?= h(defined('CLIENTE_ROTULO') ? CLIENTE_ROTULO : '') ?>">
          </label>
          <p class="hint" style="margin:0 2px">
            El texto pequeño se enseña igual en los tres idiomas: escribir aquí no lo traduce,
            así que si lo cambias, cámbialo pensando que lo van a leer en cualquiera de ellos.
          </p>
        </div>

        <div class="bar">
          <?php $nombre_actual = $marca['nombreVisible'] !== '' ? $marca['nombreVisible'] : CLIENTE_NOMBRE; ?>
          <span class="count">En la carta: <?= h($nombre_actual) ?></span>
          <span class="acciones">
            <a class="ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver menú</a>
            <button class="save" name="guardar_marca" value="1" type="submit">Guardar</button>
          </span>
        </div>
      </form>

    <h2>Copias de seguridad</h2>
    <div class="card">
      <p class="hint">
        <strong>Se copia cuando cambian los precios, y sólo entonces.</strong> Es lo único que
        no se puede deshacer a mano: una subida del 10% toca cientos de platos. Lo demás —un
        agotado, un destacado, una oferta— se deshace desmarcando la casilla, y guardar una
        copia por cada uno llenaba la carpeta de fotos iguales que sólo estorban para
        encontrar la que importa. Se guardan las <strong><?= (int) COPIAS_MAX ?> últimas</strong>.
      </p>

      <form method="post">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <div class="fila-accion">
          <span class="count">El estado de ahora, para guardarlo fuera del servidor</span>
          <button class="ghost" name="descargar_estado" value="1" type="submit">Descargar</button>
        </div>
      </form>

      <?php $copias = copias_listar(); ?>
      <?php if (!$copias): ?>
        <p class="hint" style="margin:var(--s3) 2px 0">
          Todavía no hay ninguna. La primera se escribe la próxima vez que guardes algo.
        </p>
      <?php else: ?>
        <div class="copias">
          <?php foreach ($copias as $c):
            $kb = max(1, (int) round($c['bytes'] / 1024));
            /* La fecha sale del NOMBRE y no de filemtime: el fichero se puede mover, bajar y
               volver a subir, y entonces su fecha de sistema deja de decir cuando se hizo el
               cambio de precios, que es lo unico que interesa saber de el. */
            $sinExt = substr($c['nombre'], 0, -5);
            if (preg_match('/^([0-9]{4}-[0-9]{2}-[0-9]{2})-([0-9]{2})([0-9]{2})$/', $sinExt, $m)) {
              $dia   = new DateTimeImmutable($m[1]);
              $cuando = minuscula(dia_semana($m[1])) . ' '
                      . $dia->format('d/m/y') . ' · ' . $m[2] . ':' . $m[3];
            } elseif (preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $sinExt)) {
              $dia    = new DateTimeImmutable($sinExt);
              $cuando = minuscula(dia_semana($sinExt)) . ' ' . $dia->format('d/m/y');
            } else {
              $cuando = 'de antes';               // anterior.json, si queda alguno
            }
            $que       = 'Precios de antes del cambio · ' . $cuando;
            $dato      = $kb . ' KB';
            $confirmar = '¿Devolver los precios a como estaban antes del cambio del '
                       . $cuando . '?'; ?>
            <div class="copia">
              <span class="copia-txt">
                <span class="copia-que"><?= h($que) ?></span>
                <span class="copia-dato"><?= h($dato) ?></span>
              </span>
              <form method="post" style="display:contents">
                <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                <button class="ghost" name="descargar_copia" value="<?= h($c['nombre']) ?>"
                        type="submit">Descargar</button>
              </form>
              <form method="post" style="display:contents">
                <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                <button class="ghost" name="restaurar_copia" value="<?= h($c['nombre']) ?>"
                        type="submit"
                        onclick="return confirm('<?= h($confirmar) ?>')">Restaurar</button>
              </form>
            </div>
          <?php endforeach; ?>
        </div>
        <p class="hint" style="margin:var(--s3) 2px 0">
          Restaurar también se puede deshacer: antes de escribir, el panel apunta cómo está
          ahora. Nunca te quedas sin salida por haber pulsado el botón equivocado.
        </p>
      <?php endif; ?>

      <?php if ($copias): ?>
        <div class="fila-accion">
          <span class="hint" style="margin:0">Empezar de cero. No se puede deshacer.</span>
          <form method="post" style="margin:0">
            <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
            <button class="ghost" name="vaciar_copias" value="1" type="submit">
              Borrar todas las copias</button>
          </form>
        </div>
      <?php endif; ?>
    </div>

  </section>


  <?php if ($super): ?>
    <?php /* Sólo lo ve una sesión de superadministrador. El restaurante ni conoce estas
             acciones ni puede llegar a ellas: los manejadores comprueban el rol de sesión,
             no la presencia del formulario. */ ?>
    <h2 style="margin-top:var(--s5)">Superadministrador</h2>

    <details class="card">
      <summary style="cursor:pointer;font-weight:600">Restablecer la contraseña del restaurante</summary>
      <p class="hint" style="margin-top:14px">
        El restaurante no puede cambiar su contraseña: sólo se cambia desde aquí. No hace
        falta saber la antigua: se escribe una nueva y se le comunica en mano.
      </p>
      <form method="post" style="max-width:340px">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <input type="hidden" name="reset_cliente" value="1">
        <label class="fld">Contraseña nueva del restaurante <span class="opt">(mín. 8)</span>
          <input type="password" name="cliente_nueva" autocomplete="off" required>
        </label>
        <button class="save" type="submit" style="margin-top:12px">Restablecer</button>
      </form>
    </details>

    <details class="card">
      <summary style="cursor:pointer;font-weight:600">Cambiar mi contraseña de superadministrador</summary>
      <?php if ($super_en_entorno): ?>
        <p class="hint" style="margin-top:14px">
          Tu hash vive en la variable de entorno <code>SUPERADMIN_PASSWORD_HASH</code>.
          Genera uno nuevo con <code>hash.php</code> y cámbialo donde esté definida la
          variable; desde aquí no se puede escribir.
        </p>
      <?php else: ?>
        <form method="post" style="margin-top:14px;max-width:340px">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
          <input type="hidden" name="cambiar_super" value="1">
          <label class="fld">Contraseña actual
            <input type="password" name="super_actual" autocomplete="current-password" required>
          </label>
          <label class="fld">Contraseña nueva <span class="opt">(mín. 12)</span>
            <input type="password" name="super_nueva" autocomplete="new-password" required>
          </label>
          <button type="submit" style="margin-top:12px">Cambiar</button>
        </form>
      <?php endif; ?>
    </details>

    <details class="card">
      <summary style="cursor:pointer;font-weight:600">Registro de accesos</summary>
      <p class="hint" style="margin-top:14px">
        Entradas, fallos y cambios de contraseña, con fecha UTC e IP. Nunca se apuntan
        contraseñas. Se rota solo al pasar de 256&nbsp;KB.
      </p>
      <?php
        $log_lineas = [];
        $log_raw = @file_get_contents(LOG_PATH);
        if (is_string($log_raw) && $log_raw !== '') {
          $log_lineas = array_slice(array_filter(explode("\n", trim($log_raw))), -30);
          $log_lineas = array_reverse($log_lineas);
        }
      ?>
      <?php if (!$log_lineas): ?>
        <p class="hint">Todavía no hay nada apuntado.</p>
      <?php else: ?>
        <pre style="margin:0;padding:var(--s2) 0;font:12px/1.6 ui-monospace,monospace;overflow-x:auto"><?php
          foreach ($log_lineas as $l) echo h($l) . "\n";
        ?></pre>
      <?php endif; ?>
    </details>
  <?php endif; ?>


  <script>
    /* Las cinco pestañas están en el mismo documento; esto sólo enseña una. Es lo mismo que
       hace la carta con sus trece categorías, y por eso ahora se siente igual: sin recarga,
       sin parpadeo y sin perder lo que estabas haciendo. La URL se actualiza con replaceState
       para que recargar caiga en la misma pestaña, y el servidor sigue entendiendo ?t= cuando
       vuelve de un guardado. */
    (function () {
      var botones = [].slice.call(document.querySelectorAll('.tabs [data-tab]'));
      var paneles = [].slice.call(document.querySelectorAll('.pane'));
      if (!botones.length || !paneles.length) return;

      var envoltorio = document.getElementById('tabs-wrap');
      var fila = document.getElementById('tabs');
      var flechaPrev = envoltorio && envoltorio.querySelector('.tabs-arrow-prev');
      var flechaNext = envoltorio && envoltorio.querySelector('.tabs-arrow-next');
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

      function sincronizar() {
        if (!envoltorio || !fila) return;
        var max = fila.scrollWidth - fila.clientWidth;
        envoltorio.classList.toggle('is-scrollable', max > 1);
        envoltorio.classList.toggle('at-start', fila.scrollLeft <= 1);
        envoltorio.classList.toggle('at-end', fila.scrollLeft >= max - 1);
        if (flechaPrev) flechaPrev.disabled = fila.scrollLeft <= 1;
        if (flechaNext) flechaNext.disabled = fila.scrollLeft >= max - 1;
      }
      function empujar(dir) {
        fila.scrollBy({ left: dir * fila.clientWidth * 0.6, behavior: reduce ? 'auto' : 'smooth' });
      }
      if (envoltorio && fila) {
        if (flechaPrev) flechaPrev.addEventListener('click', function () { empujar(-1); });
        if (flechaNext) flechaNext.addEventListener('click', function () { empujar(1); });
        fila.addEventListener('scroll', sincronizar, { passive: true });
        window.addEventListener('resize', sincronizar);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(sincronizar);
        sincronizar();
        // la pestaña con la que se llega (tras un guardado) queda a la vista, no recortada
        var activaAhora = fila.querySelector('.on');
        if (activaAhora && activaAhora.scrollIntoView) activaAhora.scrollIntoView({ block: 'nearest', inline: 'center' });
      }

      function abrir(slug) {
        paneles.forEach(function (p) { p.hidden = p.dataset.pane !== slug; });
        botones.forEach(function (b) {
          var on = b.dataset.tab === slug;
          b.classList.toggle('on', on);
          b.setAttribute('aria-selected', String(on));
          if (on && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' });
        });
        try { history.replaceState(null, '', '?t=' + encodeURIComponent(slug)); } catch (e) {}
        // cambiar de pestaña es empezar otra tarea: se vuelve arriba, como al abrirla
        window.scrollTo(0, 0);
      }

      botones.forEach(function (b) {
        b.addEventListener('click', function () { abrir(b.dataset.tab); });
      });
    })();

    /* ---------------- reordenar fotos sin recargar ----------------
       Cada flecha era un formulario, y cada formulario una peticion POST con su pagina entera
       de vuelta: el navegador se iba, volvia y repintaba 312 filas de platos para mover una
       miniatura dos centimetros. Funcionaba, pero se sentia como un parpadeo por cada toque.

       Ahora la fila se mueve en el sitio y el guardado se manda por detras. El orden que se
       envia es el que ha quedado en pantalla, no "sube esta una posicion": asi, si alguien
       pulsa tres veces seguidas, lo que llega al servidor es el resultado final y no tres
       ordenes que puedan cruzarse.

       Si el navegador no tiene fetch, no se toca nada y los formularios siguen funcionando
       como siempre. Es la razon por la que se han dejado puestos. */
    (function () {
      var caja = document.querySelector('.fotos');
      if (!caja || !window.fetch) return;

      var aviso = document.querySelector('.pane[data-pane="marca"] .foto-aviso');

      function decir(txt, mal) {
        if (window.toast) { toast(txt, mal ? 'bad' : 'ok'); return; }
        if (!aviso) return;
        aviso.textContent = txt;
        aviso.className = 'foto-aviso hint' + (mal ? ' foto-aviso-mal' : '');
      }

      function renumerar() {
        var filas = [].slice.call(caja.querySelectorAll('.foto'));
        filas.forEach(function (fila, i) {
          fila.querySelector('.pos').textContent = i + 1;
          var arriba = fila.querySelector('[data-mover="arriba"]');
          var abajo = fila.querySelector('[data-mover="abajo"]');
          if (arriba) arriba.disabled = i === 0;
          if (abajo) abajo.disabled = i === filas.length - 1;
        });
        return filas.map(function (f) { return f.dataset.foto; });
      }

      function guardar(orden) {
        var cuerpo = new URLSearchParams();
        cuerpo.append('csrf', <?= json_encode($csrf) ?>);
        cuerpo.append('ordenar_fotos', '1');
        orden.forEach(function (f) { cuerpo.append('orden[]', f); });
        decir('Guardando el orden…', false);
        fetch(location.pathname + '?t=marca', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Sin-Pagina': '1' },
          body: cuerpo.toString(),
          credentials: 'same-origin',
        }).then(function (r) {
          if (!r.ok) throw new Error('http');
          return r.text();
        }).then(function (t) {
          if (t.indexOf('OK') !== 0) throw new Error('respuesta');
          decir('Orden guardado.', false);
        }).catch(function () {
          decir('No he podido guardar el orden. Recarga la página y vuelve a intentarlo.', true);
        });
      }

      caja.addEventListener('click', function (e) {
        var b = e.target.closest('[data-mover]');
        if (!b || b.disabled) return;
        e.preventDefault();
        var fila = b.closest('.foto');
        var otra = b.dataset.mover === 'arriba'
          ? fila.previousElementSibling
          : fila.nextElementSibling;
        if (!otra) return;
        if (b.dataset.mover === 'arriba') caja.insertBefore(fila, otra);
        else caja.insertBefore(otra, fila);
        /* El foco se queda en el boton que se ha pulsado, que ahora esta en otro sitio de la
           lista: sin esto, quien navega con teclado pierde el hilo en cada movimiento. */
        b.focus();
        guardar(renumerar());
      });
    })();

    /* El picker da un hex siempre valido; el campo de texto es el que de verdad viaja
       en el POST (name="marca_color_principal") -- se mantienen sincronizados en los
       dos sentidos para que escribir el hex a mano funcione igual que elegirlo. La
       validacion real (contraste contra Secundario/Oscuro/Neutral) es cosa del
       servidor, al guardar: aqui solo se comprueba formato, para que el picker no
       reciba un valor que no entienda. */
    (function () {
      var picker = document.getElementById('color-principal-picker');
      var texto = document.getElementById('color-principal-hex');
      var restaurar = document.getElementById('color-principal-restaurar');
      if (!picker || !texto) return;
      var original = <?= json_encode(CLIENTE_COLOR_PRINCIPAL) ?>;

      picker.addEventListener('input', function () { texto.value = picker.value.toUpperCase(); });
      texto.addEventListener('input', function () {
        var v = texto.value.trim();
        if (v && v.charAt(0) !== '#') v = '#' + v;
        if (/^#[0-9A-Fa-f]{6}$/.test(v)) picker.value = v;
      });
      if (restaurar) {
        restaurar.addEventListener('click', function () {
          texto.value = '';
          picker.value = original;
        });
      }
    })();

  </script>

  <?php endif; ?>
  </div>
<?php endif; ?>

</div>

<?php /* ---------------------------------------------------------------- la chapa de version
 * Tres numeros que deberian ser el mismo:
 *
 *   BUILD_ID          el de este panel, escrito por el build dentro de cliente.php
 *   version.json      el de la carta que hay en esta misma carpeta
 *   el del movil      el que lleva dentro el index.html que ese movil tenga cacheado
 *
 * Los dos primeros se comparan aqui: si no coinciden, la subida se quedo a medias. El
 * tercero no se puede ver desde aqui, pero teniendo este a mano se sabe contra que comparar.
 */ ?>
<?php
  $cartaRaw = @file_get_contents(__DIR__ . '/../version.json');
  $cartaJ = $cartaRaw === false ? null : json_decode($cartaRaw, true);
  $cartaBuild = is_array($cartaJ) ? (string) ($cartaJ['build'] ?? '') : '';
  $cuadra = BUILD_ID !== '' && $cartaBuild !== '' && BUILD_ID === $cartaBuild;
 ?>
<p class="chapa">
  <?php if (BUILD_FECHA !== ''): ?>
    Versión <strong><?= h(BUILD_FECHA) ?></strong>
  <?php else: ?>
    Versión <strong>desconocida</strong> (este panel es anterior a la chapa)
  <?php endif; ?>
  <?php if (BUILD_ID !== '' && $cartaBuild !== '' && !$cuadra): ?>
    <span class="chapa-mal">· la carta de al lado es de otra compilación:
    la subida se quedó a medias</span>
  <?php endif; ?>
  <br>
  <span class="chapa-id">panel <?= h(BUILD_ID !== '' ? BUILD_ID : '?') ?> · carta <?= h($cartaBuild !== '' ? $cartaBuild : '?') ?></span>
</p>

  <?php if (DATOS_ACTIVO): ?>
  <script>
  /* Recorrer las barras.
   *
   * Portado de MiniChart (React + Tailwind). Lo que se trae es el gesto: la barra tocada al
   * maximo, sus dos vecinas a media luz y las demas apagadas. Con treinta barras del mismo color
   * lo que se ve es una textura; con el apagado, se ve UN dia.
   *
   * Dos cosas que el original NO hace y aqui son obligatorias:
   *
   * 1. Punteros en vez de onMouseEnter. Este panel se abre en la tablet de la cocina y en un
   *    movil; con solo hover, alli no pasa nada al tocar. pointerdown/pointermove cubre dedo y
   *    raton por el mismo camino.
   * 2. Enganche a la barra mas cercana, no a la de debajo del dedo. Treinta barras en 330px son
   *    once pixeles cada una y un dedo mide cuarenta y cinco: sin enganche, la mitad de los
   *    toques caen en el hueco entre dos y no pasa nada.
   */
  (function () {
    var caja = document.getElementById("dt-barras");
    var tile = document.getElementById("dt-tile");
    var lectura = document.getElementById("dt-lectura");
    if (!caja || !tile || !lectura) return;

    var barras = [].slice.call(caja.querySelectorAll(".dt-b"));
    if (!barras.length) return;
    var reposo = lectura.getAttribute("data-reposo") || "";
    var actual = -1;

    function marca(i) {
      if (i === actual) return;
      actual = i;
      for (var j = 0; j < barras.length; j++) {
        barras[j].classList.toggle("viva", j === i);
        barras[j].classList.toggle("vecina", j === i - 1 || j === i + 1);
      }
      var g = barras[i].querySelector(".dt-globo");
      var txt = g ? g.textContent.trim() : "";
      var corte = txt.indexOf("\u00b7");
      lectura.innerHTML = corte > 0
        ? txt.slice(0, corte).trim() + "<em>" + txt.slice(corte + 1).trim() + "</em>"
        : txt;
    }

    function suelta() {
      actual = -1;
      caja.classList.remove("tocando");
      tile.classList.remove("tocando");
      for (var j = 0; j < barras.length; j++) barras[j].classList.remove("viva", "vecina");
      lectura.innerHTML = reposo + "<em>hoy</em>";
    }

    function cerca(clienteX) {
      var mejor = 0, dist = Infinity;
      for (var i = 0; i < barras.length; i++) {
        var r = barras[i].getBoundingClientRect();
        var d = Math.abs((r.left + r.width / 2) - clienteX);
        if (d < dist) { dist = d; mejor = i; }
      }
      return mejor;
    }

    function agarra(e) {
      caja.classList.add("tocando");
      tile.classList.add("tocando");
      marca(cerca(e.clientX));
    }

    caja.addEventListener("pointerdown", function (e) {
      agarra(e);
      /* Capturar el puntero: el dedo puede salirse de la caja arrastrando y se sigue leyendo,
         que es lo que uno hace para recorrer la quincena. */
      if (caja.setPointerCapture) { try { caja.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    caja.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse" && e.buttons === 0) { agarra(e); return; }   // raton: basta pasar
      if (caja.classList.contains("tocando")) marca(cerca(e.clientX));
    });
    caja.addEventListener("pointerup", suelta);
    caja.addEventListener("pointercancel", suelta);
    caja.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") suelta(); });
  })();
  </script>
  <?php endif; ?>
</body>
</html>
