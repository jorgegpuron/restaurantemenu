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
 * etiquetas de producto (item-tag, dsheet-flag, aviso-badge, .badge,
 * el boton Buscar): $neutro fijo SOLO con el naranja de fabrica exacto -- '#FF7517',
 * literal a proposito, es el hex del motor, no el de fabrica de un cliente concreto --
 * excepcion visual consciente y pedida (2.45:1, aceptado); con cualquier otro
 * colorPrincipal, es $accentInk, sin excepcion. Devuelve los cinco tokens que dependen
 * de colorPrincipal, listos para imprimir en un <style>. */
function derivar_principal(string $hex): ?array {
  $oscuro = defined('CLIENTE_COLOR_OSCURO') ? CLIENTE_COLOR_OSCURO : '#121212';
  $neutro = defined('CLIENTE_COLOR_NEUTRAL') ? CLIENTE_COLOR_NEUTRAL : '#F6F4F4';
  /* Respaldo puro: si ni OSCURO ni NEUTRO leen sobre un fondo (hueco de luminancia
     0.162946 < L < 0.202220, donde cae un gris medio como #777777), cae a negro o blanco
     puro, el que mas contraste de. Misma regla que motor/temas.mjs::inkSobre(); el peor
     caso del respaldo es 4.5826:1, asi que siempre pasa el umbral. Antes esto devolvia
     null y el panel rechazaba el color entero. */
  $tinta = function (string $fondo) use ($oscuro, $neutro): string {
    if (color_contraste($oscuro, $fondo) >= 4.5) return $oscuro;
    if (color_contraste($neutro, $fondo) >= 4.5) return $neutro;
    return color_contraste('#000000', $fondo) >= color_contraste('#FFFFFF', $fondo) ? '#000000' : '#FFFFFF';
  };
  $accentInk = $tinta($hex);
  $metal = null;
  for ($t = 100; $t >= 40; $t--) {
    $c = color_mezcla($hex, $neutro, $t / 100);
    if (color_contraste($c, $oscuro) >= 4.5) { $metal = $c; break; }
  }
  if ($metal === null) return null;
  $metalInk = $tinta($metal);
  $badgeInk = strtoupper($hex) === '#FF7517' ? $neutro : $accentInk;
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

/* ---------------------------------------------------------------- comprobar una imagen
 * Lo que una foto tiene que pasar ANTES de que nadie la decodifique. La cabecera de un
 * fichero se puede escribir a mano: getimagesize() se cree unas dimensiones de miles de
 * millones de píxeles si se las ponen delante, y con eso GD pediría más memoria de la que
 * tiene el hosting entero. Por eso los límites van primero y la decodificación, la última.
 *
 * 20 megapíxeles son 5.000 × 4.000: más de lo que cabe en el mega de la portada. */
const IMG_LADO_MAX = 8000;
const IMG_PIXELES_MAX = 20000000;

/** El tipo real del fichero por su contenido, o null si no es una imagen admitida. Con
 *  finfo, el MIME del contenido tiene que coincidir con el de la cabecera; sin finfo queda
 *  la cabecera, que es lo que había. Nunca se mira lo que dice el navegador. */
function imagen_tipo_real(string $ruta): ?int {
  $info = @getimagesize($ruta);
  if ($info === false || !isset(HERO_TIPOS[$info[2]])) return null;
  if (function_exists('finfo_open')) {
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($ruta);
    if ($mime !== image_type_to_mime_type($info[2])) return null;
  }
  return $info[2];
}

/** La extensión con la que llega el fichero tiene que ser la de lo que lleva dentro. Sin
 *  extensión se acepta: manda el contenido. Un .jpg con un PNG dentro es, casi siempre, un
 *  renombrado a mano, y eso es justo lo que no hay que guardar sin decir nada. */
function imagen_extension_cuadra(string $nombre, int $tipo): bool {
  $ext = strtolower((string) pathinfo($nombre, PATHINFO_EXTENSION));
  if ($ext === '') return true;
  $de = ['jpg' => IMAGETYPE_JPEG, 'jpeg' => IMAGETYPE_JPEG, 'jpe' => IMAGETYPE_JPEG,
         'png' => IMAGETYPE_PNG, 'webp' => IMAGETYPE_WEBP];
  return isset($de[$ext]) && $de[$ext] === $tipo;
}

/** La función de GD que abre este tipo, o null si el servidor no puede abrirlo. */
function imagen_decodificador(int $tipo): ?string {
  if (!function_exists('imagecreatetruecolor')) return null;
  $fn = [IMAGETYPE_JPEG => 'imagecreatefromjpeg', IMAGETYPE_PNG => 'imagecreatefrompng',
         IMAGETYPE_WEBP => 'imagecreatefromwebp'][$tipo] ?? null;
  return ($fn !== null && function_exists($fn)) ? $fn : null;
}

/** Un valor de php.ini con sufijo (128M, 2G, 512K) en bytes. Vacío o -1 (sin límite): 0. */
function ini_a_bytes(string $v): int {
  $v = trim($v);
  if ($v === '' || $v === '-1') return 0;
  $n = (float) $v;
  switch (strtolower(substr($v, -1))) {
    case 'g': $n *= 1024;   // sigue
    case 'm': $n *= 1024;   // sigue
    case 'k': $n *= 1024;
  }
  return (int) $n;
}

/** memory_limit en bytes; sin límite devuelve PHP_INT_MAX. */
function memoria_limite_bytes(): int {
  $b = ini_a_bytes((string) ini_get('memory_limit'));
  return $b > 0 ? $b : PHP_INT_MAX;
}

/* ---------------------------------------------------------------- errores de subida
 * PHP resume lo que ha pasado con un fichero subido en un código numérico. Al restaurante
 * un «código 1» no le dice nada, y además el tope que de verdad aplica no es solo el del
 * panel: si el hosting pone upload_max_filesize o post_max_size por debajo, manda el hosting
 * y el fichero ni llega. Aquí se dice el tope REAL en MB y nada más de la configuración. */
function subida_tope_bytes(int $topePanel): int {
  $tope = $topePanel;
  foreach (['upload_max_filesize', 'post_max_size'] as $clave) {
    $b = ini_a_bytes((string) ini_get($clave));
    if ($b > 0 && $b < $tope) $tope = $b;
  }
  return $tope;
}

/** «500 KB», «1 MB», «1,9 MB»: lo que lee una persona, sin decimales de más. */
function peso_texto(int $bytes): string {
  if ($bytes < 1048576) return (string) round($bytes / 1024) . ' KB';
  $mb = $bytes / 1048576;
  return (abs($mb - round($mb)) < 0.05 ? (string) round($mb) : number_format($mb, 1, ',', '.')) . ' MB';
}

/** El mensaje para un código de error de subida distinto de UPLOAD_ERR_OK. `$que` es la
 *  palabra con la que la pantalla llama a lo que se sube: «foto», «imagen». */
function subida_error_texto(int $codigo, int $topePanel, string $que): string {
  $tope = peso_texto(subida_tope_bytes($topePanel));
  switch ($codigo) {
    case UPLOAD_ERR_INI_SIZE:
    case UPLOAD_ERR_FORM_SIZE:
      return 'La ' . $que . ' pesa más de lo que admite este servidor: el máximo es ' . $tope
           . '. Redúcela y vuelve a subirla.';
    case UPLOAD_ERR_PARTIAL:
      return 'La ' . $que . ' ha llegado a medias: se cortó la conexión mientras subía. Vuelve a intentarlo.';
    case UPLOAD_ERR_NO_FILE:
      return 'Elige primero una ' . $que . '.';
    case UPLOAD_ERR_NO_TMP_DIR:
    case UPLOAD_ERR_CANT_WRITE:
    case UPLOAD_ERR_EXTENSION:
      return 'El servidor no ha podido guardar la ' . $que . ' (fallo del hosting, código ' . $codigo
           . '). Avisa a quien lleva el hosting.';
  }
  return 'La subida de la ' . $que . ' ha fallado (código ' . $codigo . '). Vuelve a intentarlo.';
}

/** GD guarda cada píxel en 4 bytes y trabaja con dos imágenes a la vez al reescalar. Con
 *  margen: si no cabe, mejor decirlo que dejar el panel en blanco a mitad de subida. */
function imagen_cabe_en_memoria(int $ancho, int $alto): bool {
  $necesita = $ancho * $alto * 5 + 4 * 1048576;
  return memory_get_usage() + $necesita < memoria_limite_bytes();
}

/** Devuelve el nombre guardado, o un mensaje de error.
 *
 *  Falla cerrado: una foto que el servidor no ha podido ABRIR ENTERA no se guarda, y sin GD
 *  no se guarda ninguna. Antes, si GD faltaba o fallaba con el fichero, se guardaba tal cual
 *  «porque ya había pasado las comprobaciones» — y las comprobaciones eran leer una cabecera.
 *  Así entró en la portada un PNG de 4 KB con una cabecera inventada, que la carta pedía y no
 *  podía pintar. */
function hero_guardar(array $f) {
  $codigo = (int) ($f['error'] ?? UPLOAD_ERR_NO_FILE);
  if ($codigo !== UPLOAD_ERR_OK) {
    return ['error' => subida_error_texto($codigo, HERO_MAX_BYTES, 'foto')];
  }
  if ($f['size'] > HERO_MAX_BYTES) {
    return ['error' => 'La foto pesa ' . peso_texto((int) $f['size']) . ' y el máximo es '
                     . peso_texto(subida_tope_bytes(HERO_MAX_BYTES)) . '.'];
  }
  if (!is_uploaded_file($f['tmp_name'])) return ['error' => 'Archivo no válido.'];

  $tipo = imagen_tipo_real($f['tmp_name']);
  if ($tipo === null) {
    return ['error' => 'Eso no es una imagen JPG, PNG o WebP.'];
  }
  if (!imagen_extension_cuadra((string) ($f['name'] ?? ''), $tipo)) {
    return ['error' => 'El archivo se llama .' . strtolower((string) pathinfo((string) $f['name'], PATHINFO_EXTENSION))
                     . ' pero dentro lleva una imagen ' . strtoupper(HERO_TIPOS[$tipo])
                     . '. Guárdalo con su extensión de verdad y vuelve a subirlo.'];
  }
  $info = @getimagesize($f['tmp_name']);
  $ancho = (int) ($info[0] ?? 0);
  $alto  = (int) ($info[1] ?? 0);
  if ($ancho < 800) {
    return ['error' => 'La foto mide ' . $ancho . ' px de ancho. Hacen falta 800 como mínimo, '
                     . 'o se verá borrosa en una pantalla grande.'];
  }
  if ($ancho > IMG_LADO_MAX || $alto > IMG_LADO_MAX || $ancho * $alto > IMG_PIXELES_MAX) {
    return ['error' => 'La foto mide ' . $ancho . ' × ' . $alto . ' px: demasiado grande para procesarla aquí. '
                     . 'Redúcela por debajo de ' . IMG_LADO_MAX . ' px de lado ('
                     . (IMG_PIXELES_MAX / 1000000) . ' megapíxeles) y vuelve a subirla.'];
  }
  if (imagen_decodificador($tipo) === null) {
    return ['error' => 'Este servidor no puede comprobar imágenes ' . strtoupper(HERO_TIPOS[$tipo])
                     . ' (le falta la extensión GD con ese formato). Por seguridad no se guarda ninguna '
                     . 'foto sin comprobar: avisa a quien lleva el hosting.'];
  }
  if (!imagen_cabe_en_memoria($ancho, $alto)) {
    return ['error' => 'La foto mide ' . $ancho . ' × ' . $alto . ' px y este servidor no tiene memoria '
                     . 'para abrirla. Redúcela y vuelve a subirla.'];
  }
  if (!hero_carpeta_lista()) {
    return ['error' => 'No puedo escribir en assets/hero/. Crea la carpeta en el servidor y dale permiso de escritura.'];
  }

  $nombre = bin2hex(random_bytes(8)) . '.' . HERO_TIPOS[$tipo];
  $destino = HERO_DIR . '/' . $nombre;
  /* La portada se ve a lo sumo a pantalla de móvil o tablet: por encima de 1600 px de ancho
     el mega entero sólo paga datos. Se reescala y recomprime con GD, y de paso es GD quien
     certifica que la imagen se abre entera. Si no se abre, no hay foto: no se guarda en crudo. */
  if (!hero_recomprimir($f['tmp_name'], $info, $destino)) {
    @unlink($destino);
    return ['error' => 'La imagen está dañada: el servidor no ha podido abrirla entera. No se ha guardado.'];
  }
  @chmod($destino, 0644);
  /* Las variantes, aquí mismo: es una sola foto y el que acaba de subirla está esperando. Si
     GD no puede con ellas no se aborta nada — la foto ya está guardada y la carta sabe servir
     el original. */
  hero_generar_variantes($nombre);
  return ['ok' => $nombre];
}

/** Reescala a 1600 px de ancho como mucho y reencoda en su mismo formato. Devuelve false si
 *  la imagen no se ha podido abrir entera o no se ha podido escribir: quien llama decide, y
 *  no queda ningún fichero a medias en el destino. */
function hero_recomprimir(string $tmp, array $info, string $destino): bool {
  if (!function_exists('imagecreatetruecolor')) return false;
  $tipo = $info[2];
  $img = false;
  /* Un JPEG cortado a la mitad se abre «bien» por defecto: libjpeg rellena de gris lo que
     falta y GD se calla. Aquí una foto a medias es una foto rota, y tiene que fallar. */
  @ini_set('gd.jpeg_ignore_warning', '0');
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
  $codigo = (int) ($f['error'] ?? UPLOAD_ERR_NO_FILE);
  if ($codigo !== UPLOAD_ERR_OK) {
    return ['error' => subida_error_texto($codigo, FOTOS_MAX_BYTES, 'foto')];
  }
  if (!is_uploaded_file($f['tmp_name'])) return ['error' => 'Archivo no válido.'];
  if ($f['size'] > FOTOS_MAX_BYTES) {
    return ['error' => 'La foto pesa ' . peso_texto((int) $f['size']) . ' y el máximo es '
                     . peso_texto(subida_tope_bytes(FOTOS_MAX_BYTES)) . '.'];
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
    if (!preg_match('/^(anterior|[0-9]{4}-[0-9]{2}-[0-9]{2}(-[0-9]{4}|-[0-9]{8})?)\.json$/', $f)) continue;
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
  /* Con segundos y dos cifras de contador por si dos cambios caen en el mismo segundo. Antes
     el nombre solo llevaba hora y minuto, y una restauracion hecha en el mismo minuto que el
     ultimo cambio de precios PISABA la copia de ese cambio: la salida de emergencia se
     borraba a si misma. Los nombres viejos (solo minuto) se siguen listando y ordenando. */
  $sello = (new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('Y-m-d-His');
  $ruta = COPIAS_DIR . '/' . $sello . '00.json';
  for ($n = 0; $n < 100; $n++) {
    $ruta = COPIAS_DIR . '/' . $sello . sprintf('%02d', $n) . '.json';
    if (!is_file($ruta)) break;
  }
  escribir_atomico($ruta, $raw);
  copias_purgar();
}


function h(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

/* ------------------------------------------------------------------ texto Unicode
 * mbstring NO es un requisito de este panel, y estas cuatro funciones son la razon: son el
 * UNICO sitio del fichero donde se nombra una mb_*, y todas siguen la misma regla —mbstring si
 * la extension esta, y si no un camino equivalente que no depende de ella—. Cualquier llamada
 * suelta a mb_* fuera de aqui vuelve a abrir el agujero que se tapa con esto.
 *
 * El agujero era real y se midio: en un PHP sin mbstring, `mb_strtoupper()` en las iniciales de
 * los dias de la oferta lanzaba «Call to undefined function» a media pagina. El panel se
 * renderizaba hasta la pestana Ofertas y moria ahi: llegaban las ocho pestañas de la barra pero
 * solo tres de los ocho paneles, sin un mensaje de error a la vista. record.php caia igual al
 * guardar un nombre. Este fichero ya trataba a GD asi (function_exists antes de usarla) y ya
 * trataba asi a dos de las mb_*: faltaban las otras tres.
 *
 * Los acentos latinos que un camino ASCII no sabria cambiar de caja. No es Unicode entero —eso
 * es exactamente lo que hace mbstring y por eso se prefiere cuando esta—, pero cubre las
 * lenguas del producto. Lo que NO puede pasar es corromper bytes: por eso la parte ASCII va con
 * strtr() sobre las 26 letras y no con strtolower(), que en algunas versiones y locales toca
 * bytes por encima de 0x7F y parte un caracter UTF-8 por la mitad. */
const CAJA_MAY = ['Á','À','Â','Ä','Ã','Å','Ç','É','È','Ê','Ë','Í','Ì','Î','Ï','Ñ',
                  'Ó','Ò','Ô','Ö','Õ','Ú','Ù','Û','Ü','Ý','Æ','Œ'];
const CAJA_MIN = ['á','à','â','ä','ã','å','ç','é','è','ê','ë','í','ì','î','ï','ñ',
                  'ó','ò','ô','ö','õ','ú','ù','û','ü','ý','æ','œ'];
const CAJA_AZ_MAY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CAJA_AZ_MIN = 'abcdefghijklmnopqrstuvwxyz';

function minuscula(string $s): string {
  if (function_exists('mb_strtolower')) return mb_strtolower($s, 'UTF-8');
  return strtr(str_replace(CAJA_MAY, CAJA_MIN, $s), CAJA_AZ_MAY, CAJA_AZ_MIN);
}

function mayuscula(string $s): string {
  if (function_exists('mb_strtoupper')) return mb_strtoupper($s, 'UTF-8');
  return strtr(str_replace(CAJA_MIN, CAJA_MAY, $s), CAJA_AZ_MIN, CAJA_AZ_MAY);
}

/* Cabecera de ficha de categoría (Platos y Ofertas): una sola línea, nunca dos con la
   misma palabra repetida. La categoría («Sopas») y su pestaña de la carta («Aperitivos y
   sopas») son datos distintos y las dos hacen falta — el mismo nombre de categoría se
   repite en varias pestañas (Sopas vive en su pestaña normal, y otra vez suelta dentro de
   Sin gluten y de Vegano: 40 fichas reales, cero colisión con esta regla, comprobado). Si
   la pestaña ya empieza por el nombre de la categoría, se enseña sólo la pestaña (es el
   caso de "Aperitivos" dentro de "Aperitivos y sopas": mostrar las dos por separado sólo
   repetía la misma palabra dos veces). Si son idénticas, una sola vez. En cualquier otro
   caso, las dos, separadas por un punto medio. */
function etiqueta_categoria(string $nombre, string $tab): string {
  $n = minuscula($nombre);
  $t = minuscula($tab);
  if ($n === $t) return $nombre;
  if (strpos($t, $n) === 0) return $tab;
  return $nombre . ' · ' . $tab;
}

/* Recorte por CARACTERES, no por bytes: cortar un UTF-8 a la brava parte una tilde en dos y
   deja basura en pantalla y en el JSON. Sin mbstring se cuentan puntos de codigo con una
   expresion regular /u, la misma tecnica que caracteres() de aqui abajo; si el texto no es
   UTF-8 valido preg_split() devuelve false (sin aviso) y ahi si se cae a bytes, que es lo unico
   que queda cuando la cadena ya venia rota. */
function recorte(string $s, int $desde, ?int $largo = null): string {
  if (function_exists('mb_substr')) return mb_substr($s, $desde, $largo, 'UTF-8');
  $trozos = preg_split('//u', $s, -1, PREG_SPLIT_NO_EMPTY);
  if ($trozos === false) return $largo === null ? substr($s, $desde) : substr($s, $desde, $largo);
  return implode('', $largo === null ? array_slice($trozos, $desde) : array_slice($trozos, $desde, $largo));
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
    $ico = "<svg viewBox='0 0 12 12' fill='none' stroke='currentColor' stroke-width='2'"
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

$pestana  = (string) ($_GET['t'] ?? 'platos');
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
  /* Cierre funcional MISE-B, punto 2: esta es la puerta compartida por TODOS los
     autoguardados (Ofertas, Agotados, precio en línea, destacado, foto...) — todos ellos
     viven dentro del `if ($csrfOk)` de más abajo, así que un CSRF inválido aquí es el
     único sitio que hace falta tocar para que ninguno de ellos pueda parecer "guardado"
     sin estarlo. Antes esto devolvía HTTP 200 con la página entera — un fetch lee
     `r.ok === true` y no tiene forma de distinguirlo de un guardado real. La navegación
     tradicional (recarga de página completa) no cambia: sigue viendo exactamente el
     mismo aviso, sólo que ahora con el código correcto por debajo, invisible para quien
     lee la pantalla. Login, sesión, cookies y generación del propio CSRF no se tocan. */
  http_response_code(403);
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
    $pestana = 'ajustes';

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
        /* SOLO LOS PRECIOS. La ficha se llama «copias de precios», cada fila dice «Precios de
           antes del cambio» y la confirmacion pregunta por los precios. Restaurar el estado
           entero —como se hacia antes— se llevaba en silencio los agotados, destacados,
           ofertas, banner, fotos y datos de marca posteriores a la copia. Nada de eso se toca.

           Las claves de la copia se traducen al esquema de ahora con la misma vista que usa el
           panel al leer el estado: una copia anterior a los identificadores permanentes sigue
           valiendo, y una copia con las dos claves (id + nombre viejo) no duplica nada. */
        $copiaVista = estado_vista(array_replace(estado_vacio(), $vuelta), $porKey, $mapaLegacy, $catIdDe);
        $preciosCopia = is_array($copiaVista['prices'] ?? null) ? $copiaVista['prices'] : [];
        $preciosAhora = is_array($estado['prices'] ?? null) ? $estado['prices'] : [];
        $cuando = $encontrada === 'anterior.json'
                ? 'de antes del último guardado'
                : 'del ' . (new DateTimeImmutable(substr($encontrada, 0, 10)))->format('d/m/y');
        if ($preciosCopia == $preciosAhora) {
          $aviso = 'Los precios de la copia ' . $cuando . ' son los mismos que hay ahora: no hay nada que restaurar.';
        } else {
          /* guardar_estado() apunta antes el estado de AHORA en otra copia (copia_de_seguridad
             salta porque cambian los precios): deshacer una restauracion es otra restauracion.
             Nadie se queda sin salida por haber pulsado el boton equivocado. */
          $estado['prices'] = $preciosCopia;
          if (guardar_estado($estado)) {
            $aviso = 'Restaurados los precios de la copia ' . $cuando . ': ' . count($preciosCopia)
                   . ' precio(s) distintos de la carta. Lo demás (agotados, destacados, ofertas, '
                   . 'banner, fotos y marca) sigue como estaba.';
          } else {
            $error = 'No se ha podido escribir estado.json. No se ha cambiado nada.';
          }
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
          $fallos[] = ($nombre !== '' ? recorte(basename($nombre), 0, 40) . ': ' : '') . $r['error'];
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
    $pestana = 'platos';
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
      /* Cierre funcional MISE-B, punto 3: faltaba el código de estado — un fetch veía
         HTTP 200 con la página entera y no tenía forma de saber que el guardado había
         fallado. El contrato de guardar_agotados no cambia (sigue reemplazando el
         conjunto completo); esto sólo hace que el fallo se note. */
      http_response_code(500);
      $error = 'No se ha podido escribir estado.json. Revisa los permisos de la carpeta.';
    }
  }

  /* --- destacados --- */
  if (isset($_POST['destacado_add'])) {
    $pestana = 'platos';
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
    $pestana = 'platos';
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
    /* Validos (1-7), sin repetidos y en orden: `dia[]` repetido en el POST dejaba [1,7,7]
       escrito en el estado. La carta no se rompia, pero el fichero mentia. */
    $dias = array_values(array_unique(array_filter(array_map('intval', (array) ($_POST['dia'] ?? [])), function ($d) {
      return $d >= 1 && $d <= 7;
    })));
    sort($dias);
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

  /* --- oferta, autoguardado de UNA categoría o UN plato suelto ---
     Marcar una categoría o un plato en Ofertas obligaba a bajar hasta «Guardar cambios» —
     y ESE botón manda pct/horas/días/on a la vez, así que un guardado a medio escribir el
     porcentaje (por ejemplo) se publicaba entero sólo por tocar una casilla. Estos dos
     manejadores autoguardan SIN pasar por guardar_oferta: leen la oferta actual, tocan
     sólo el campo que les toca (cats o keys, nunca los dos, nunca pct/from/to/days/on) y
     escriben. Ninguno de los dos exige que la oferta esté encendida — igual que
     guardar_oferta, se puede dejar todo preparado con el interruptor apagado.
     Sólo existen aquí, en Ofertas: Platos sigue sin poder tocar estado['offer']. */
  if (isset($_POST['oferta_cat_toggle'])) {
    $pestana = 'ofertas';
    $cid = (string) $_POST['oferta_cat_toggle'];
    $idsCat = array_flip($catIdDe);
    if (!isset($idsCat[$cid])) {
      http_response_code(422);
      $error = 'Esa categoría no existe.';
    } else {
      $ofertaAhora = is_array($estado['offer']) ? array_replace(estado_vacio()['offer'], $estado['offer']) : estado_vacio()['offer'];
      $marcar = !empty($_POST['oferta_cat_on']);
      $cats = (array) $ofertaAhora['cats'];
      if ($marcar) {
        if (!in_array($cid, $cats, true)) $cats[] = $cid;
      } else {
        $cats = array_values(array_diff($cats, [$cid]));
      }
      $ofertaAhora['cats'] = $cats;
      $estado['offer'] = $ofertaAhora;
      if (guardar_estado($estado)) {
        $aviso = $marcar ? 'Categoría añadida a la oferta.' : 'Categoría quitada de la oferta.';
      } else {
        http_response_code(500);
        $error = 'No se ha podido escribir estado.json.';
      }
    }
  }
  if (isset($_POST['oferta_plato_toggle'])) {
    $pestana = 'ofertas';
    $k = (string) $_POST['oferta_plato_toggle'];
    if (!isset($porKey[$k])) {
      http_response_code(422);
      $error = 'Ese plato no está en la carta.';
    } else {
      $ofertaAhora = is_array($estado['offer']) ? array_replace(estado_vacio()['offer'], $estado['offer']) : estado_vacio()['offer'];
      $enCategoria = in_array((string) ($porKey[$k]['catId'] ?? ''), (array) $ofertaAhora['cats'], true);
      $sinPrecio = $porKey[$k]['price'] === '';
      if ($enCategoria || $sinPrecio) {
        http_response_code(422);
        $error = 'Ese plato no se puede tocar suelto.';
      } else {
        $marcar = !empty($_POST['oferta_plato_on']);
        $keys = (array) $ofertaAhora['keys'];
        if ($marcar) {
          if (!in_array($k, $keys, true)) $keys[] = $k;
        } else {
          $keys = array_values(array_diff($keys, [$k]));
        }
        $ofertaAhora['keys'] = $keys;
        $estado['offer'] = $ofertaAhora;
        if (guardar_estado($estado)) {
          $aviso = $marcar ? 'Plato metido en la oferta.' : 'Plato quitado de la oferta.';
        } else {
          http_response_code(500);
          $error = 'No se ha podido escribir estado.json.';
        }
      }
    }
  }

  /* --- oferta, fase 2: porcentaje/horario/días/estado autoguardan cada uno por su cuenta ---
     Mismo principio que categoría/plato: cada acción toca UN campo de estado['offer'] y
     deja los demás tal como estén en disco — nunca reconstruye la oferta entera desde lo
     que traiga el POST. guardar_oferta (arriba) sigue siendo el camino tradicional/de
     respaldo sin JavaScript; estos cuatro son el atajo con autoguardado.

     Los tres que pueden rechazarse por una razón de negocio (no sólo un fallo de disco)
     devuelven 422 explícito además de $error: un fetch que sólo mirase el 200 no podría
     distinguir "guardado" de "rechazado", y aquí SÍ hay rechazos reales (porcentaje fuera
     de rango, horario invertido, encender sin categoría/plato/día/porcentaje/horario
     válidos). Un fallo de escritura en disco es distinto —el POST era correcto, escribir
     falló— y se marca 500, no 422. */
  if (isset($_POST['oferta_pct_guardar'])) {
    $pestana = 'ofertas';
    $pct = filter_var($_POST['pct'] ?? '', FILTER_VALIDATE_INT);
    if ($pct === false || $pct < 1 || $pct > 90) {
      http_response_code(422);
      $error = 'El descuento tiene que estar entre 1 y 90.';
    } else {
      $ofertaAhora = is_array($estado['offer']) ? array_replace(estado_vacio()['offer'], $estado['offer']) : estado_vacio()['offer'];
      $ofertaAhora['percent'] = $pct;
      $estado['offer'] = $ofertaAhora;
      if (guardar_estado($estado)) {
        $aviso = 'Descuento actualizado: ' . $pct . '%.';
      } else {
        http_response_code(500);
        $error = 'No se ha podido escribir estado.json.';
      }
    }
  }
  if (isset($_POST['oferta_horario_guardar'])) {
    $pestana = 'ofertas';
    $desdeStr = (string) ($_POST['desde'] ?? '');
    $hastaStr = (string) ($_POST['hasta'] ?? '');
    $formatoOk = preg_match('/^([0-9]{1,2}):([0-9]{2})$/', $desdeStr) && preg_match('/^([0-9]{1,2}):([0-9]{2})$/', $hastaStr);
    $desde = $formatoOk ? minutos($desdeStr, -1) : -1;
    $hasta = $formatoOk ? minutos($hastaStr, -1) : -1;
    if ($desde < 0 || $hasta < 0) {
      http_response_code(422);
      $error = 'El horario no es válido.';
    } elseif ($hasta <= $desde) {
      http_response_code(422);
      $error = 'La hora de fin tiene que ser posterior a la de inicio.';
    } else {
      $ofertaAhora = is_array($estado['offer']) ? array_replace(estado_vacio()['offer'], $estado['offer']) : estado_vacio()['offer'];
      $ofertaAhora['from'] = $desde;
      $ofertaAhora['to'] = $hasta;
      $estado['offer'] = $ofertaAhora;
      if (guardar_estado($estado)) {
        $aviso = 'Horario actualizado: ' . hhmm($desde) . ' a ' . hhmm($hasta - 1) . '.';
      } else {
        http_response_code(500);
        $error = 'No se ha podido escribir estado.json.';
      }
    }
  }
  if (isset($_POST['oferta_dias_guardar'])) {
    $pestana = 'ofertas';
    /* Mismo criterio que guardar_oferta: nunca se persiste una colección vacía — "una
       oferta necesita al menos un día" se cumple aquí igual que en el navegador (que ya
       no deja llegar a cero: ni "Semanal" ni quitar el último día mandan dia[] vacío
       a propósito, cierre funcional MISE-B). Se conserva como red de seguridad del lado
       servidor — un envío sin JavaScript, o cualquier otro que llegue vacío por lo que
       sea, cae a los siete en vez de dejar "oferta sin días". */
    $dias = array_values(array_unique(array_filter(array_map('intval', (array) ($_POST['dia'] ?? [])), function ($d) {
      return $d >= 1 && $d <= 7;
    })));
    sort($dias);
    $ofertaAhora = is_array($estado['offer']) ? array_replace(estado_vacio()['offer'], $estado['offer']) : estado_vacio()['offer'];
    $ofertaAhora['days'] = $dias ?: [1, 2, 3, 4, 5, 6, 7];
    $estado['offer'] = $ofertaAhora;
    if (guardar_estado($estado)) {
      $aviso = 'Días actualizados.';
    } else {
      http_response_code(500);
      $error = 'No se ha podido escribir estado.json.';
    }
  }
  if (isset($_POST['oferta_estado_toggle'])) {
    $pestana = 'ofertas';
    $marcar = !empty($_POST['oferta_estado_on']);
    $ofertaAhora = is_array($estado['offer']) ? array_replace(estado_vacio()['offer'], $estado['offer']) : estado_vacio()['offer'];
    if (!$marcar) {
      // Apagar nunca borra nada: categorías, platos, porcentaje, horario y días se quedan
      // tal cual, listos para volver a encenderse con la misma programación.
      $ofertaAhora['on'] = false;
      $estado['offer'] = $ofertaAhora;
      if (guardar_estado($estado)) {
        $aviso = 'Oferta apagada.';
      } else {
        http_response_code(500);
        $error = 'No se ha podido escribir estado.json.';
      }
    } else {
      $tieneAlcance = !empty($ofertaAhora['cats']) || !empty($ofertaAhora['keys']);
      $tieneDias = !empty($ofertaAhora['days']);
      $pct = (int) $ofertaAhora['percent'];
      $pctValido = $pct >= 1 && $pct <= 90;
      $horarioValido = (int) $ofertaAhora['to'] > (int) $ofertaAhora['from'];
      if (!$tieneAlcance) {
        http_response_code(422);
        $error = 'Elige al menos una categoría o un plato antes de encenderla.';
      } elseif (!$tieneDias) {
        http_response_code(422);
        $error = 'Elige al menos un día antes de encenderla.';
      } elseif (!$pctValido) {
        http_response_code(422);
        $error = 'El descuento tiene que estar entre 1 y 90 antes de encenderla.';
      } elseif (!$horarioValido) {
        http_response_code(422);
        $error = 'El horario no es válido: revisa desde y hasta antes de encenderla.';
      } else {
        $ofertaAhora['on'] = true;
        $estado['offer'] = $ofertaAhora;
        if (guardar_estado($estado)) {
          $aviso = 'Oferta encendida.';
        } else {
          http_response_code(500);
          $error = 'No se ha podido escribir estado.json.';
        }
      }
    }
  }

  /* --- precios, paso 1: calcular la propuesta y NO escribir nada ---
     Subir toda la carta de un clic y descubrir los céntimos raros cuando ya está publicada es
     justo lo que hay que evitar. Aquí sólo se calcula; publicar es otro botón. */
  if (isset($_POST['precios_calcular'])) {
    $pestana = 'platos';
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

  /* --- precios, paso 1 bis: la misma lista, sin tocar un centimo ---
     Cambiar UN precio a mano obligaba a aplicar antes un porcentaje a los 312 platos y luego
     deshacer 311. La lista editable ya existia; lo que no habia era forma de abrirla sin
     subir nada. Esto NO relaja la validacion del porcentaje —precios_calcular sigue exigiendo
     0 < pct <= 50—: es otra rama que monta la propuesta con lo que ya hay puesto.
     pct = null es la senal de "aqui no se ha calculado nada": la plantilla no habla de
     redondeo, porque no ha redondeado nada. */
  if (isset($_POST['precios_manual'])) {
    $pestana = 'platos';
    $previsua = ['pct' => null, 'filas' => []];
    foreach ($lista as $p) {
      if ($p['price'] === '') continue;                     // "Incluido" no tiene precio que cambiar
      $actual = (string) ($estado['prices'][$p['key']] ?? $p['price']);
      $previsua['filas'][] = [
        'key' => $p['key'], 'id' => $p['id'], 'name' => $p['name'], 'tab' => $p['tab'],
        'carta' => $p['price'], 'actual' => $actual,
        'nuevo' => $actual,
      ];
    }
  }

  /* --- precios, paso 2: publicar lo que se vea en pantalla --- */
  if (isset($_POST['precios_publicar'])) {
    $pestana = 'platos';
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
      http_response_code(500);
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
    if (!$f || !is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
      /* El codigo de PHP traducido a algo que se entiende, con el tope que aplica de verdad
         (el del panel o el del hosting, el que sea mas bajo). Ver subida_error_texto(). */
      $error = subida_error_texto((int) (is_array($f) ? ($f['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE), PUB_MAX_BYTES, 'imagen');
    } elseif ($f['size'] > PUB_MAX_BYTES) {
      /* el peso real y el maximo DERIVADO de la constante: que jamas parezca que se
         rechaza algo dentro del limite ("pesa 2 MB y el maximo es 2 MB"). */
      $error = 'La imagen pesa ' . number_format($f['size'] / 1048576, 2, ',', '.') . ' MB '
             . 'y el maximo es ' . peso_texto(subida_tope_bytes(PUB_MAX_BYTES)) . '.';
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
    $pestana = 'ajustes';
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
    $pestana = 'platos';
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

/* MISE-B Fase 1: Agotados/Destacados/Precios dejan de ser destinos de navegación propios
   y se consolidan en «platos» (ver SPEC.md). Ofertas sigue siendo su propia pantalla —es
   una regla, no un dato por plato—. «ajustes» es nuevo: agrupa copias de seguridad y el
   bloque de superadministrador, que antes vivían sueltos dentro de Marca. */
$PESTANAS = ['platos' => 'Platos', 'ofertas' => 'Ofertas', 'juego' => 'Juego', 'publicidad' => 'Publicidad',
             'datos' => 'Analítica', 'marca' => 'Marca', 'ajustes' => 'Ajustes'];
if (!DATOS_ACTIVO)   unset($PESTANAS['datos']);     // la fuente es el contrato: ver config.php
if (!CLIENTE_JUEGO)  unset($PESTANAS['juego']);     // sin la capacidad no hay nada que apagar
if (!CLIENTE_PUBLICIDAD) unset($PESTANAS['publicidad']); // idem, Fase 7
if (!isset($PESTANAS[$pestana])) $pestana = 'platos';
$CUENTAS = [
  'platos'     => count($agotados),   // lo mismo que antes contaba «agotados»: lo accionable hoy
  'ofertas'    => $oferta['on'] ? 1 : 0,
  'juego'      => $juego['on'] ? 1 : 0,
  'publicidad' => pub_estado_banner($bannerPub) === 'ACTIVO' ? 1 : 0,
  'datos'      => 0,      // el contador no es una cuenta de cosas pendientes
  'marca'      => 0,      // no es una cuenta de nada: no lleva contador
  'ajustes'    => 0,
];
?>
<!doctype html>
<html lang="es" translate="no" class="notranslate">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>La carta de hoy — <?= h(CLIENTE_NOMBRE) ?></title>
<?php /* El icono de pestaña. Sin esta línea el navegador pide /favicon.ico por su cuenta y se lleva
         un 404: la carta sí declaraba el suyo y el panel no. Es el mismo SVG que ya genera el build
         con el color del cliente, así que no hay icono nuevo que mantener ni fichero que duplicar.
         La ruta relativa vale igual desde /admin/ que desde /admin/index.php. */ ?>
<link rel="icon" type="image/svg+xml" href="../assets/titleIcon-accent.svg">
<?php /* Las mismas dos tipografías que la carta, escritas por el build. */ ?>
<?php @include __DIR__ . '/fuentes.html'; ?>
<?php /* La tipografia del PANEL, que no es la de la carta. Bricolage y Source Serif tienen
         voz —son las de la carta del restaurante— y aqui estorban: esto es una herramienta que
         se usa de pie y con prisa.

         SocialCard V1: Arimo sustituye a Inter. El prototipo aprobado esta dibujado sobre
         Nimbus Sans, que es una Helvetica; Arimo comparte esas mismas metricas (es la
         Liberation Sans de Google, compatible metrica con Helvetica/Arial), asi que el
         dibujo del prototipo se conserva sin licencia que gestionar ni fichero que alojar.
         Cuatro pesos reales servidos por Google —400, 500, 600, 700— que es justo lo que
         pide la escala tipografica: nada se sintetiza.

         Va aparte y no dentro de fuentes.html porque ese fichero lo escribe gen.mjs y es de
         la carta: el panel es lo unico que necesita esto. */ ?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" media="print" onload="this.media='all'"
      href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;500;600;700&display=swap">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;500;600;700&display=swap"></noscript>
<link rel="stylesheet" href="tokens.css">
<?php /* SocialCard V1: el tema, ANTES de que se pinte nada. Si esto viajara al final del
         documento el navegador dibujaria primero el tema por defecto y luego el guardado,
         y se veria el parpadeo. Sin dependencias: lee localStorage y pone la clase. */ ?>
<script>
  (function () {
    var m = 'light';
    try { var g = localStorage.getItem('socialcard-color-mode'); if (g === 'dark' || g === 'light') m = g; } catch (e) {}
    document.documentElement.classList.add(m);
  })();
</script>
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

  /* -------------------------------------------------------------- Mise, capa local
   * Siete tokens propios del admin, en :root para que cubran también login y diálogos
   * sin depender de si cuelgan de .card-main. No tocan --r-card/--r-chip/--r-pill/
   * --r-sheet ni ningún token de gen.mjs: --p-radius-card es un valor propio, el resto
   * son alias o derivados de --accent/--accent-ink/--metal ya garantizados por
   * verificarPaleta() en temas.mjs. MISE-A R1. */
  :root{
    --p-radius-card:16px;
    /* Mise DS-1: alias independiente, incluso con el mismo valor -- no es
       --p-radius-card con otro nombre. Ese sigue siendo solo de .card-main. */
    --ui-radius-modal:16px;
    /* Mise DS-2: radio real de botones/campos/pct (ya era 12px en los cuatro,
       aqui solo se nombra). Los cuadrados de icono a 9px (adm-pct-ir,
       adm-foto-b) se quedan fuera a proposito: alias-arlos aqui cambiaria su
       valor, no solo su nombre. */
    --ui-radius-control:var(--radius-xl);
    /* Mise DS-2: opacidad de disabled para controles con texto/fondo propio.
       Los iconos sueltos (.foto-btn, .adm-foto-b) ya tenian su propio .3 --
       no se toca ese, es mas fuerte a proposito porque ahi no hay etiqueta
       que siga necesitando leerse. */
    --ui-control-disabled-opacity:.45;
    /* SocialCard V1: el acento de la HERRAMIENTA deja de ser el color del restaurante.
       Son dos cosas distintas que hasta ahora compartian token por comodidad: --accent es
       la marca del cliente (vive en la carta publica y en la pestaña Marca, y sigue
       exactamente donde estaba), y esto de aqui es el color de producto de SocialCard, que
       es el mismo panel para todos los restaurantes. Con la marca de Tinge (#FF7517) el
       naranja del panel salia casi igual por casualidad; con un cliente de marca verde el
       panel entero se volvia verde, que nunca fue la intencion. Invariante multicliente:
       el comportamiento es del motor, el dato es del cliente. */
    --p-accent-fill:var(--sc-primary);
    --p-accent-ink:var(--sc-primary-ink);
    --p-accent-stroke:var(--sc-primary);
    --p-accent-glow:color-mix(in srgb, var(--sc-primary) 22%, transparent);
    --p-accent-select:color-mix(in srgb, var(--sc-primary) 26%, transparent);
  }

  /* ============================================================ SocialCard V1: cimientos ==
   * El sistema visual del prototipo SocialCard, en dos temas completos.
   *
   * La pieza que hace que esto sea abordable: el panel ya tenia una capa de indireccion
   * —ocho tokens de color declarados en .card-main (--ink, --surface, --muted, --base,
   * --border, --chip, --hairline, --offer)— de la que cuelgan sus 10.000 lineas de CSS.
   * Aqui NO se reescriben esas lineas: se redirigen esos ocho tokens a los de abajo. Cada
   * regla del panel sigue diciendo var(--ink) o var(--chip) como siempre, y cambia de tema
   * sola. Lo que se toca es el origen, no los mil sitios que lo consumen.
   *
   * Valores: los del encargo. Donde el prototipo difiere se ha seguido el encargo y la
   * diferencia queda anotada en SPEC.md, no resuelta en silencio.
   */
  :root,
  :root.light{
    color-scheme:light;
    --sc-canvas:#F2F4F7;
    --sc-surface:#FFFFFF;
    /* Tercera superficie, la de la navegacion. En claro coincide con la tarjeta; en
       oscuro NO, y por eso es un token propio y no un alias de --sc-surface. */
    --sc-nav:#FFFFFF;
    --sc-text:#202631;
    --sc-text-2:#596576;
    --sc-border:#DCE1E8;
    --sc-primary:#C2410C;
    --sc-primary-ink:#FFFFFF;
    --sc-selected-bg:#FFF0E5;
    --sc-selected-text:#9A3412;
    --sc-muted-bg:#EDF0F4;
    --sc-hover-bg:#EDF0F4;
    /* Tinta intermedia entre el texto principal y el secundario. La usa el prototipo
       para lo que esta seleccionado pero no es la accion principal: chip activo,
       boton secundario. Es --secondary-foreground alli. */
    --sc-text-medio:#3D4959;
    /* El campo NO tiene fondo propio en el prototipo: usa el canvas, que sobre una
       tarjeta blanca es justo un escalon mas oscuro y por eso se ve sin necesidad de
       inventar un tono. Medido: background #F2F4F7, borde #DCE1E8. */
    --sc-input-bg:var(--sc-canvas);
    /* Este NO es el borde del campo (ese es --sc-border): es el gris fuerte que el
       prototipo llama --input y reserva para la PISTA de los interruptores apagados
       y para lo que tiene que verse sobre blanco. */
    --sc-input-border:#BDC6D2;
    --sc-scrim:rgba(32,38,49,.45);
    --sc-sombra-hoja:0 -12px 32px -12px rgba(32,38,49,.22);
    --sc-sombra-card:0 2px 5px #18273a06;

    --sc-ok-bg:#E4F4EC;   --sc-ok-ink:#166448;
    --sc-warn-bg:#FFF3CC; --sc-warn-ink:#815000;
    --sc-bad-bg:#FDECEC;  --sc-bad-ink:#BD2031;
  }
  :root.dark{
    color-scheme:dark;
    --sc-canvas:#15191F;
    --sc-surface:#1E242D;
    --sc-nav:#1A1F27;
    --sc-text:#F3F5F8;
    --sc-text-2:#ADB9C9;
    --sc-border:#38424F;
    --sc-primary:#FB923C;
    --sc-primary-ink:#291405;
    --sc-selected-bg:#392B22;
    --sc-selected-text:#FDBA74;
    --sc-muted-bg:#28313D;
    --sc-hover-bg:#28313D;
    --sc-text-medio:#D4DCE6;
    --sc-input-bg:var(--sc-canvas);
    --sc-input-border:#526174;
    --sc-scrim:rgba(8,10,13,.62);
    --sc-sombra-hoja:0 -12px 32px -12px rgba(0,0,0,.6);
    --sc-sombra-card:0 2px 5px #00000014;

    --sc-ok-bg:#1D3A30;   --sc-ok-ink:#86DFB3;
    --sc-warn-bg:#3B321F; --sc-warn-ink:#F8D37B;
    --sc-bad-bg:#3B2022;  --sc-bad-ink:#FF8891;
  }

  /* Escala de spacing y de radios. Se estrenan en el shell (V2) y en cada componente
     segun le toque migrar; NO se hace un reemplazo masivo de los margenes que ya
     existen — la escala Fibonacci de gen.mjs (--s1..--s6) sigue viva debajo y las dos
     conviven hasta que cada pantalla pase por su version. */
  :root{
    --space-1:4px;
    --space-2:8px;
    --space-3:12px;
    --space-4:16px;
    --space-6:24px;
    --space-8:32px;

    /* Los radios del prototipo, medidos con getComputedStyle y no estimados. Su base
       es --radius:.65rem = 10.4px, y los escalones se derivan de ella igual que alli:
       sm = r-4, md = r-2, lg = r, xl = r+4. La tarjeta usa un 16 fijo aparte. */
    --radius:10.4px;
    --radius-sm:6.4px;
    --radius-md:8.4px;
    --radius-lg:10.4px;
    --radius-xl:14.4px;
    --radius-card:16px;
    --radius-pill:999px;

    /* Medidas del shell, tomadas del prototipo con el navegador, no a ojo. */
    --sc-sidebar-w:232px;
    --sc-rail-w:68px;
    --sc-header-h:68px;
    --sc-contenido-max:1580px;
  }

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
  /* Con sidebar (>=768px, con sesión) el tope de 1570 ya no tiene sentido: ese ancho se
     pensó para antes de que existiera la columna del sidebar, y en un monitor ancho deja una
     franja vacía a la derecha del todo. Con sesión, el contenido usa lo que quede del
     viewport tras la columna reservada en el body. */
  @media (min-width:768px){ body:not(.sin-entrar) .page{max-width:none} }
  .card-main{
    position:relative;               /* ancla de las insignias de sesión */

    /* ---------------------------------------------------------------- el panel, oscuro
     * Los tokens de color se redefinen AQUI y no en :root. Asi la cabecera, la fila de
     * pestañas, los botones y todo lo que cuelga heredan el oscuro sin tocar ni una de sus
     * reglas: cada una sigue diciendo var(--ink) o var(--surface) como siempre.
     *
     * Tres superficies y no dos, para que haya profundidad sin sombras:
     *   pagina #08090A  <  tarjeta #101114  <  fichas #191B1F
     *
     * Las pestañas que aun no se han migrado al sistema nuevo se devuelven la paleta clara
     * mas abajo, en .pane:not([data-pane="publicidad"]). Sin eso quedarian con texto oscuro
     * sobre fondo oscuro, que es la razon por la que este paso no se hizo antes.
     */
    /* SocialCard V1: los mismos ocho nombres de siempre, apuntando al sistema nuevo.
       Ni una de las reglas que los consumen ha cambiado — siguen diciendo var(--ink),
       var(--chip), var(--hairline)— y ahora las dos paletas les llegan solas.
       --base era un tercer nivel de texto (mas apagado que --muted); el sistema nuevo
       tiene dos y no tres, asi que los dos caen en el secundario: anotado en SPEC.md. */
    --ink:var(--sc-text);
    --p-fg:var(--ink);
    --muted:var(--sc-text-2);
    --base:var(--sc-text-2);
    --surface:var(--sc-surface);
    --border:var(--sc-border);
    --chip:var(--sc-muted-bg);
    --hairline:var(--sc-border);
    /* Rojo de estado, tambien por tema. De aqui cuelgan los siete grupos semanticos
       de DS-1, que siguen separados exactamente igual: solo cambia el origen. */
    --offer:var(--sc-bad-ink);
    --scrim:var(--sc-scrim);

    /* Mise DS-1: alias semanticos de --offer. Solo estos dos hacen falta aqui
       porque son los unicos con consumidores fuera de .adm-board (insignia
       de modo demo y avisos/toast antes de entrar en una pestana); el resto
       de grupos semanticos de --offer se declaran dentro de .adm-board, que
       es donde vive el resto de sus consumidores. Se redeclaran alli tambien
       porque --offer cambia de valor entre este ambito y ese. */
    --ui-state-error:var(--offer);
    --ui-badge-demo:var(--offer);

    /* -------------------------------------------------- la escala, SocialCard V1
     * Eran tres tamaños; el sistema nuevo pide seis, y dos de los tres viejos ya
     * coincidian con el —20 y 13— asi que solo se mueve uno y se añaden tres:
     *   --t0  24px / 600   titulo de pantalla        (nuevo, lo estrena la cabecera)
     *   --t1  20px / 600   cifra que se mira de lejos     (igual que antes)
     *   --tb  16px         contenido y nombre de plato    (nuevo)
     *   --t2  14px / 500   navegacion, botones, campos, etiquetas   (era 15)
     *   --t3  13px / 400   descripcion y apunte           (igual que antes)
     *   --t4  12px / 500   metadatos y contadores         (nuevo, y es el suelo)
     * Nada por debajo de 12: quien usa esto tiene mas de 45 años. */
    --t0:24px;
    --t1:20px;
    --tb:16px;
    --t2:14px;
    --t3:13px;
    --t4:12px;

    /* Arimo para todo el panel. La de la carta se queda en la carta. */
    font-family:"Arimo",Arial,system-ui,sans-serif;
    font-size:var(--t2);
    /* Sin font-feature-settings de Inter: "cv05"/"cv08" eran alternativas de aquella
       familia y en Arimo no existen — dejarlas escritas seria pedirle a la fuente algo
       que no tiene. Las cifras tabulares, que si importan, se piden donde se usan. */

    background:var(--surface);
    color:var(--ink);
    border-radius:var(--p-radius-card);
    border:1px solid var(--hairline);
    box-shadow:none;
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
    /* El aire baja de 55 y 89 a 34: la tarjeta ya no es una hoja de papel con margenes,
       es el tablero de trabajo, y el ancho se usa. */
    .card-main{padding:var(--s4)}
  }
  @media (min-width:1200px){
    .card-main{padding:var(--s4)}
  }

  /* La pagina, mas oscura que la tarjeta: la tarjeta tiene que levantarse del fondo. */
  body:has(.card-main){background:var(--sc-canvas)}

  /* --------------------------------------------------- la capa de transicion, retirada
   * Aqui vivio una regla que devolvia la paleta clara a las pestañas que aun no se
   * habian migrado y las dibujaba como isla. Las ocho estan migradas, asi que se ha
   * ido entera: el oscuro se hereda de .card-main y ninguna pestaña necesita
   * excepcion. Si alguna vez se añade una pantalla nueva sin migrar, se vuelve a
   * poner aqui con su :not() y se quita cuando le toque. */

  /* --------------------------------------------------- el cromo, ya en oscuro
   * Dos piezas no se arreglan solas al cambiar los tokens porque llevan su color
   * escrito a mano, pensado para la tarjeta clara de antes. */

  /* ------------------------------------------- lo que pinta el navegador
   * La seleccion, el cursor de texto y la barra de desplazamiento venian con los
   * valores de fabrica —azul de sistema y gris claro— sobre un panel negro. Son
   * parte del diseño aunque no se dibujen aqui. */
  .card-main ::selection,
  .adm-acciones-fuera ::selection{background:var(--p-accent-select);color:var(--p-fg)}
  .card-main input,.card-main textarea{caret-color:var(--p-accent-stroke)}
  .card-main{scrollbar-color:var(--sc-input-border) transparent;scrollbar-width:thin}
  .card-main ::-webkit-scrollbar{width:10px;height:10px}
  .card-main ::-webkit-scrollbar-track{background:transparent}
  .card-main ::-webkit-scrollbar-thumb{background:var(--sc-input-border);border-radius:999px;border:2px solid transparent;background-clip:content-box}
  .card-main ::-webkit-scrollbar-thumb:hover{background:var(--sc-text-2);background-clip:content-box}
  /* Cifras de ancho fijo donde hay numeros que se comparan: fechas, horas,
     contadores y dias del calendario. Sin esto, el 1 baila. */
  .adm-periodo,.adm-horas input,.adm-cal-d,.adm-acciones-estado,.adm-nativo input{
    font-variant-numeric:tabular-nums;
  }

  /* Una sola familia en TODO el panel. La hoja base escribe la tipografia de la
     carta en h2, en los botones y en los campos, asi que heredar no basta: hay
     que decirlo aqui una vez y para todo lo que cuelga de la tarjeta. */
  .card-main,
  .card-main h1,.card-main h2,.card-main h3,.card-main h4,
  .card-main button,.card-main input,.card-main select,.card-main textarea,
  .card-main label,.card-main summary,.card-main a{
    font-family:"Arimo",Arial,system-ui,sans-serif;
  }
  /* El apunte iba a 14: el unico tamaño que se salia de los tres. */
  .card-main .hint{font-size:var(--t3)}

  /* ------------------------------------------------------- la cabecera, a escala
   * La fecha iba a 34 px con la tipografia de la carta. Con tres tamaños y una
   * sola familia, baja a --t1: sigue siendo lo mas grande de la pantalla, pero
   * deja de gritar por encima del trabajo. */
  .card-main .head{margin-bottom:var(--s3)}
  .card-main .head-eyebrow{
    font-family:inherit;font-size:var(--t3);font-weight:600;
    letter-spacing:.08em;color:var(--muted);
  }
  .card-main .head h1{
    font-family:inherit;font-size:var(--t1);font-weight:650;letter-spacing:-.01em;
    margin:4px 0 0;
  }
  .card-main .head h1 .dia{font-weight:500;color:var(--muted);display:inline;font-size:inherit;letter-spacing:0}
  .card-main .head .sub,
  .card-main .head .sub-servicio{font-family:inherit;font-size:var(--t3);color:var(--muted)}
  .card-main .head .sub a{color:var(--ink)}
  .card-main .insignia{font-family:inherit;font-size:var(--t3);letter-spacing:.04em}
  /* MISE-B: con sidebar, cuatro líneas centradas (marca, fecha, aviso de madrugada,
     sesión) leían como una portada antes de la superficie de trabajo. Se aplana a una
     sola franja, alineada a la izquierda, para que Platos empiece antes. El aviso de
     madrugada (poco frecuente) se queda en su propia línea cuando aparece: es
     información real que no cabe bien inline sin perder claridad. */
  body:not(.sin-entrar) .head{
    text-align:left;margin-bottom:var(--s2);
    display:flex;flex-wrap:wrap;align-items:baseline;column-gap:10px;row-gap:2px;
  }
  body:not(.sin-entrar) .head-eyebrow{margin:0}
  body:not(.sin-entrar) .head h1{font-size:var(--t2);font-weight:600}
  body:not(.sin-entrar) .head .sub{margin:0}
  body:not(.sin-entrar) .head .sub-servicio{flex:1 1 100%;max-width:none;margin:2px 0 0}
  /* A partir de 1024px, marca, fecha y el aviso de sesión viven en el pie de la barra
     lateral (.adm-sidebar-marca/-fecha/-sesion, junto a Salir) — aquí se apagan para no
     decirlo dos veces. Por debajo de 1024 la barra no tiene sitio para ese texto (icono
     solo, o barra oculta del todo), así que se quedan aquí tal cual estaban. El aviso de
     madrugada (.sub-servicio, poco frecuente) no se muda: es información del servicio en
     curso, no identidad del restaurante, y se sigue leyendo mejor junto al contenido. */
  @media (min-width:1024px){
    body:not(.sin-entrar) .head-eyebrow,
    body:not(.sin-entrar) .head h1,
    body:not(.sin-entrar) .head .sub-sesion{display:none}
  }
  body:has(.card-main) .chapa{font-family:"Arimo",Arial,sans-serif;font-size:var(--t3,13px)}

  /* MISE-B, décima ronda: "En línea" se retiró (no comprobaba nada real) y "Usuario"
     también (el caso normal no necesita insignia) — sólo queda la insignia cuando hay
     algo que merece decirse: demo, o superadministrador. */
  .card-main .insignia{border-color:transparent}
  .card-main .insignia.is-super{background:var(--accent);color:var(--accent-ink)}
  .card-main .insignia.is-demo{background:var(--sc-warn-bg);color:var(--sc-warn-ink)}

  /* ---------------------------------------------------------- la botonera
   * Sangraba 21 px a cada lado para recortarse contra el borde de la tarjeta
   * clara; con el relleno nuevo eso sacaba 33 px de scroll horizontal.
   *
   * El centrado se hace con margenes automaticos y NO con justify-content,
   * como ya dejo escrito quien la monto: al desbordar, centrar deja el primer
   * boton fuera de alcance por la izquierda. Ese truco se respeta.
   *
   * Y minimalista: sin pastilla en reposo. Solo texto, y el activo con una
   * pastilla clara. El contador, un chip pequeño al lado. */
  .card-main .tabs-wrap{margin-left:0;margin-right:0}
  .card-main .tabs-wrap::before,
  .card-main .tabs-wrap::after{display:none}
  .card-main .tabs{
    gap:2px;padding:2px 0 var(--s2);
    border-bottom:1px solid var(--hairline);margin-bottom:var(--s3);
  }
  .card-main .tabs > :first-child{margin-left:auto}
  .card-main .tabs > :last-child{margin-right:auto}
  .card-main .tabs button{
    min-height:40px;padding:0 16px;border:0;border-radius:10px;
    background:transparent;color:var(--muted);
    font-family:inherit;font-size:var(--t2);font-weight:500;letter-spacing:0;
    text-transform:none;box-shadow:none;
    transition:color var(--t-press) var(--ease-out),background var(--t-press) var(--ease-out);
  }
  .card-main .tabs button:hover{background:transparent;color:var(--ink)}
  .card-main .tabs button.on{
    background:var(--ink);color:var(--surface);font-weight:600;
  }
  .card-main .tabs .n{
    display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;
    margin-left:7px;border-radius:999px;
    background:var(--chip);color:var(--ink);
    font-size:var(--t3);font-weight:600;font-variant-numeric:tabular-nums;
  }
  .card-main .tabs button.on .n{background:rgba(18,18,18,.16);color:var(--surface)}

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
       se veia. Y dentro del panel es cuando se mira: despues de subir.

       El color YA NO es --metal: es la marca del cliente, y una chapa tecnica (fecha de
       build, IDs de compilación) no es sitio para el acento de marca — se leía como un
       aviso o una acción, no como una nota al pie. Blanco y gris, como cualquier pie de
       version: gris para el cuerpo, y --surface (blanco) para el dato que de verdad se
       compara, en .chapa strong, más abajo. El gris no es --muted -- ese ya se midio
       ilegible sobre esta tinta (parrafo de arriba) -- es una mezcla con --surface que se
       queda en 7,6:1 de contraste, comoda de sobra. */
    color:color-mix(in srgb, var(--surface) 65%, var(--ink));
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

  /* ==================================================================== MISE-B: el shell ==
   * Sidebar persistente en escritorio (>=1024px), riel de iconos en tablet (768-1023px),
   * barra inferior + hoja «Más» en móvil (<768px). Reemplaza la barra de pestañas de
   * arriba, que se queda sin usar (las reglas .tabs/.tabs-wrap/.tabs-arrow no se borran:
   * las sigue usando la carta pública con el mismo nombre de clase en su propia hoja).
   *
   * Sin wrapper nuevo alrededor del contenido: la barra ocupa una columna real reservando
   * el hueco con padding-left en el body, y ella misma va en position:fixed. Así ningún
   * `<div>` de apertura queda sin su cierre en un archivo de 9000 líneas.
   */
  /* SocialCard V2: medidas del prototipo, medidas en el navegador y no a ojo —
     232 de barra, 68 de riel, item de 40 con radio 12 y hueco de 8. */
  .adm-sidebar{
    display:none;position:fixed;top:0;left:0;bottom:0;z-index:20;
    flex-direction:column;gap:2px;padding:var(--space-2);overflow-y:auto;
    width:var(--sc-rail-w);background:var(--sc-nav);border-right:1px solid var(--sc-border);
  }
  /* El hueco del sidebar sólo se reserva con sesión: .sin-entrar (login/recepción) no lo
     lleva y no debe empujarse igualmente — se coló ese bug en la primera versión. */
  @media (min-width:768px){
    body:not(.sin-entrar){padding-left:var(--sc-rail-w)}
    .adm-sidebar{display:flex}
  }
  @media (min-width:1024px){
    body:not(.sin-entrar){padding-left:var(--sc-sidebar-w)}
    .adm-sidebar{width:var(--sc-sidebar-w);padding:var(--space-2) var(--space-3)}
  }
  /* La cabecera de la barra: marca del producto. Sólo cuando hay ancho para rotular;
     en riel el icono se queda solo y centrado. */
  .adm-sidebar-cab{
    display:flex;align-items:center;gap:var(--space-3);
    padding:var(--space-2) var(--space-2) var(--space-4);
    margin-bottom:var(--space-2);border-bottom:1px solid var(--sc-border);
  }
  @media (max-width:1023px){ .adm-sidebar-cab{justify-content:center;padding-left:0;padding-right:0} }
  .adm-sidebar-logo{
    flex:none;display:grid;place-items:center;width:36px;height:36px;
    border-radius:var(--radius-lg);background:var(--sc-primary);color:var(--sc-primary-ink);
  }
  .adm-sidebar-logo svg{width:16px;height:16px}
  .adm-sidebar-marcas{min-width:0;display:none}
  @media (min-width:1024px){ .adm-sidebar-marcas{display:block} }
  .adm-sidebar-producto{
    margin:0;font-size:var(--t2);font-weight:600;color:var(--sc-text);
    letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .adm-sidebar-cliente{
    margin:0;font-size:var(--t3);color:var(--sc-text-2);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .adm-sidebar-grupo{display:flex;flex-direction:column;gap:2px;margin-bottom:var(--space-2)}
  .adm-sidebar-rotulo{
    display:none;align-items:center;height:32px;margin:var(--space-2) 0 0;padding:0 var(--space-2);
    font-size:var(--t4);font-weight:500;letter-spacing:.14em;
    text-transform:uppercase;color:var(--sc-text-2);
  }
  @media (min-width:1024px){ .adm-sidebar-rotulo{display:flex} }
  .adm-nav-item{
    position:relative;display:flex;align-items:center;gap:var(--space-2);
    min-height:40px;padding:0 var(--space-3);border-radius:var(--radius-xl);border:0;background:transparent;
    color:var(--sc-text-2);text-decoration:none;font-family:inherit;font-size:var(--t2);font-weight:400;
    cursor:pointer;transition:background var(--t-fast) var(--ease-out),color var(--t-fast) var(--ease-out);
  }
  @media (max-width:1023px){ .adm-nav-item{justify-content:center;padding:0} }
  /* 16px: es lo que MIDE el icono en el prototipo. Sus clases dicen size-[17px]
     pero una regla mas especifica de la propia biblioteca lo deja en 16 -- lo que
     cuenta es el pixel dibujado, no la clase escrita. */
  .adm-nav-ico{flex:none;width:16px;height:16px}
  .adm-nav-item .txt{display:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  @media (min-width:1024px){ .adm-nav-item .txt{display:block} }
  .adm-nav-item .n{
    margin-left:auto;display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;
    border-radius:var(--radius-pill);background:var(--sc-muted-bg);color:var(--sc-text-2);
    font-size:var(--t4);font-weight:600;font-variant-numeric:tabular-nums;
  }
  @media (max-width:1023px){
    .adm-nav-item .n{position:absolute;top:2px;right:2px;margin-left:0;min-width:18px;height:18px;padding:0 4px}
  }
  .adm-nav-item:hover{background:var(--sc-hover-bg);color:var(--sc-text)}
  .adm-nav-item:focus-visible{outline:2px solid var(--sc-primary);outline-offset:2px}
  /* Seleccionado NO es relleno naranja solido: es la pastilla suave del prototipo.
     Veinte destinos en naranja no destacan ninguno (regla del naranja, punto 15). */
  .adm-nav-item.on{background:var(--sc-selected-bg);color:var(--sc-selected-text);font-weight:600}
  .adm-nav-item.on .n{background:color-mix(in srgb, var(--sc-selected-text) 14%, transparent);color:inherit}
  /* Vuelta atrás: un border-top sólo arriba de Salir repetía el mismo fallo que se acaba
     de corregir en las filas y en el separador de categoría — .adm-nav-item también lleva
     border-radius:11px, así que ese filete se curvaba igual en sus esquinas. La línea recta
     vuelve al contenedor (.adm-sidebar-pie, sin radio propio), encima de todo el bloque —
     empezando por el nombre del restaurante. Salir se distingue con un borde COMPLETO
     (las cuatro esquinas curvan igual, nunca una sola arista suelta) en vez de compartir
     esa línea: se lee como un botón propio, no como una acción más de la lista. */
  .adm-sidebar-pie{margin-top:auto;padding-top:var(--space-3);border-top:1px solid var(--sc-border)}
  .adm-sidebar-pie .adm-nav-item{
    margin-top:var(--space-2);border:1px solid var(--sc-border);
  }
  /* El aviso de sesión —y, desde la novena ronda, nombre y fecha— sólo caben cuando la
     barra rotula con texto: icono solo en tablet (768-1023), barra oculta del todo en
     móvil (<768). Se esconden por debajo de 1024 y los mismos datos se ven en el
     <header> (.head-eyebrow/h1/.sub-sesion, más abajo) en su lugar: nunca desaparecen,
     sólo cambian de sitio según haya donde ponerlos. */
  /* SocialCard V2: nombre y fecha se mudan a la cabecera nueva, que ahora existe
     y esta SIEMPRE visible (tambien en movil, que es donde antes no cabian). Aqui
     quedarian dicho dos veces, asi que se apagan. El aviso de sesion se queda: habla
     del tiempo que le queda a esta sesion, no de identidad, y su sitio es junto a Salir. */
  .adm-sidebar-marca,
  .adm-sidebar-fecha{display:none}
  .adm-sidebar-sesion{
    display:none;margin:0 0 var(--space-2);padding:0 var(--space-3);
    font-size:var(--t3);color:var(--sc-text-2);line-height:1.4;
  }
  @media (min-width:1024px){
    .adm-sidebar-sesion{display:block}
  }

  /* El tooltip sólo hace falta cuando el icono va solo (tablet): a partir de 1024px ya hay
     rótulo visible y duplicarlo sería ruido. El nombre accesible del botón es aria-label,
     puesto siempre — nunca depende de este tooltip ni de .txt, que a estas anchuras está
     en display:none y no cuenta para el nombre accesible. */
  .adm-nav-tooltip{
    position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%) translateX(-4px);
    padding:6px 8px;border-radius:var(--radius-sm);
    background:var(--sc-text);color:var(--sc-surface);
    font-size:var(--t4);font-weight:500;white-space:nowrap;pointer-events:none;
    opacity:0;visibility:hidden;transition:opacity var(--t-fast) var(--ease-out),transform var(--t-fast) var(--ease-out);
    box-shadow:0 8px 24px -8px rgba(0,0,0,.6);z-index:21;
  }
  @media (min-width:1024px){ .adm-nav-tooltip{display:none} }
  .adm-nav-item:hover .adm-nav-tooltip,
  .adm-nav-item:focus-visible .adm-nav-tooltip{opacity:1;visibility:visible;transform:translateY(-50%) translateX(0)}

  /* =============================================== SocialCard V2: la cabecera ==
   * El panel no tenia cabecera: el titulo y la fecha vivian dentro de la tarjeta y se
   * iban con el scroll. El prototipo la tiene, mide 68 y se queda pegada arriba.
   *
   * Va en position:fixed y el hueco se reserva con padding-top en el body — el mismo
   * patron que ya usaba el sidebar, y por la misma razon: no hace falta abrir ningun
   * <div> nuevo alrededor del contenido en un fichero de 10.000 lineas.
   */
  .adm-topbar{
    display:none;position:fixed;top:0;left:0;right:0;z-index:19;
    height:var(--sc-header-h);align-items:center;gap:var(--space-4);
    padding:0 var(--space-4);
    background:color-mix(in srgb, var(--sc-canvas) 92%, transparent);
    -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
    border-bottom:1px solid var(--sc-border);
  }
  body:not(.sin-entrar) .adm-topbar{display:flex}
  body:not(.sin-entrar){padding-top:var(--sc-header-h)}
  @media (min-width:768px){
    body:not(.sin-entrar) .adm-topbar{left:var(--sc-rail-w)}
  }
  @media (min-width:1024px){
    body:not(.sin-entrar) .adm-topbar{left:var(--sc-sidebar-w);padding:0 var(--space-6)}
  }
  .adm-topbar-txt{min-width:0;flex:1 1 auto}
  .adm-topbar-titulo{
    margin:0;font-size:var(--t0);font-weight:600;line-height:32px;letter-spacing:-.03em;
    color:var(--sc-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .adm-topbar-sub{
    margin:0;font-size:var(--t3);font-weight:400;line-height:1.4;color:var(--sc-text-2);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  /* Por debajo de 560 el titulo de 24 y su linea de apoyo no caben juntos en 68px de
     alto sin apretarse: se queda el titulo, que es el que orienta. */
  @media (max-width:559px){
    .adm-topbar-titulo{font-size:var(--t1)}
    .adm-topbar-sub{display:none}
  }
  .adm-topbar-acciones{display:flex;align-items:center;gap:var(--space-2);flex:none}

  /* ---- selector de tema ---- */
  .adm-tema{
    display:flex;align-items:center;gap:var(--space-2);
    height:40px;padding:0 10px;
    border:1px solid var(--sc-border);border-radius:var(--radius-xl);background:var(--sc-surface);
  }
  .adm-tema-ico{flex:none;width:16px;height:16px;color:var(--sc-text-2);transition:color var(--t-fast) var(--ease-out)}
  :root.light .adm-tema-sol{color:var(--sc-selected-text)}
  :root.dark .adm-tema-luna{color:var(--sc-selected-text)}
  /* V5: el selector de tema deja sus 32x18 y adopta el interruptor unico (40x22). Es
     una desviacion CONSCIENTE del prototipo, que lo dibuja a 32x18: la orden de esta
     ronda pide una sola geometria para todos los toggles del panel, y tener el del tema
     a un tamaño y los otros seis a otro era justo la incoherencia que habia que cerrar.
     min-height:0 sigue siendo obligatorio: el reset general pone min-height:48px a TODO
     <button> y sin esto saldria de 40x48. */
  .adm-tema-sw{
    position:relative;flex:none;width:40px;height:22px;padding:0;border:0;
    min-height:0;box-sizing:border-box;
    border-radius:var(--radius-pill);background:var(--sc-input-border);cursor:pointer;
    transition:background 160ms var(--ease-out);
  }
  .adm-tema-sw::before{
    content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;
    transform:translate(-50%,-50%);
  }
  .adm-tema-sw[aria-checked="true"]{background:var(--sc-primary)}
  .adm-tema-sw:focus-visible{outline:2px solid var(--sc-primary);outline-offset:2px}
  .adm-tema-bola{
    position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:var(--radius-pill);
    background:var(--sc-surface);pointer-events:none;
    transition:transform 160ms var(--ease-out);
  }
  .adm-tema-sw[aria-checked="true"] .adm-tema-bola{transform:translateX(18px)}
  /* Sin JavaScript el interruptor no puede hacer nada: se retira en vez de quedarse
     como un boton muerto. El tema por defecto (claro) se sigue viendo entero. */
  html:not(.adm-con-js) .adm-tema{display:none}

  /* La cabecera vieja, dentro de la tarjeta, decia lo mismo que la nueva. Se apaga
     entera menos el aviso de madrugada, que NO es identidad: es informacion del
     servicio en curso y se sigue leyendo mejor pegada al contenido. */
  body:not(.sin-entrar) .head-eyebrow,
  body:not(.sin-entrar) .head h1,
  body:not(.sin-entrar) .head .sub-sesion{display:none}
  body:not(.sin-entrar) .head:not(:has(.sub-servicio)){display:none}

  /* ---- barra inferior (móvil) ---- */
  .adm-navmovil{
    display:flex;position:fixed;left:0;right:0;bottom:0;z-index:20;
    background:var(--sc-nav);border-top:1px solid var(--sc-border);
    padding:6px var(--space-1) calc(6px + env(safe-area-inset-bottom));
  }
  @media (min-width:768px){ .adm-navmovil{display:none} }
  body:not(.sin-entrar){padding-bottom:64px}
  /* El reset de 768 decia `body` a secas y perdia por especificidad contra
     `body:not(.sin-entrar)`: en escritorio quedaban 64px muertos al final de cada
     pantalla, con la barra inferior ya oculta. Venia de MISE-B y no se habia visto;
     con la cabecera nueva sumando 68 arriba, ese hueco ya se nota. */
  @media (min-width:768px){ body:not(.sin-entrar),body{padding-bottom:0} }
  .adm-navmovil-item{
    flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:3px;
    min-height:52px;padding:6px 2px;border:0;background:transparent;color:var(--sc-text-2);
    font-family:inherit;font-size:var(--t4);font-weight:500;cursor:pointer;border-radius:var(--radius-lg);
  }
  /* 20px y no 17: aqui el icono va SOLO sobre su rotulo diminuto y a un brazo de
     distancia, no al lado de un texto de 14. Es la excepcion razonada al tamaño de
     navegacion, no un descuido. */
  .adm-navmovil-item svg{width:20px;height:20px}
  .adm-navmovil-item:focus-visible{outline:2px solid var(--sc-primary);outline-offset:-2px}
  .adm-navmovil-item.on{color:var(--sc-selected-text);font-weight:600}
  .adm-navmovil-item.on svg{color:var(--sc-primary)}

  /* ---- hoja «Más» ---- */
  #velo-sheet{
    position:fixed;inset:0;z-index:30;background:var(--scrim);
    opacity:0;visibility:hidden;transition:opacity var(--t-fast) var(--ease-out);
  }
  #velo-sheet.activo{opacity:1;visibility:visible}
  .adm-sheet{
    position:fixed;left:0;right:0;bottom:0;z-index:31;max-height:75vh;overflow-y:auto;
    background:var(--sc-surface);border:1px solid var(--sc-border);border-bottom:0;
    border-radius:var(--radius-xl) var(--radius-xl) 0 0;
    padding:10px var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
    box-shadow:var(--sc-sombra-hoja);
    transform:translateY(100%);transition:transform var(--t-fast) var(--ease-out);
  }
  .adm-sheet.activo{transform:translateY(0)}
  .adm-sheet-agarre{width:36px;height:4px;margin:2px auto 12px;border-radius:var(--radius-pill);background:var(--sc-border)}
  .adm-sheet-cab{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)}
  .adm-sheet-cab h2{margin:0;font-size:var(--t1);font-weight:600;letter-spacing:-.02em;color:var(--sc-text)}
  .adm-sheet-cab button{
    border:0;background:var(--sc-muted-bg);color:var(--sc-text-2);
    width:32px;height:32px;border-radius:var(--radius-md);display:grid;place-items:center;cursor:pointer;
  }
  .adm-sheet-cab button:hover{background:var(--sc-hover-bg);color:var(--sc-text)}
  .adm-sheet-lista{display:flex;flex-direction:column;gap:2px;padding-bottom:6px}
  .adm-sheet-item{
    display:flex;align-items:center;gap:var(--space-3);min-height:48px;padding:0 var(--space-3);
    border-radius:var(--radius-lg);
    border:0;background:transparent;color:var(--sc-text);text-decoration:none;
    font-family:inherit;font-size:var(--t2);font-weight:500;cursor:pointer;
  }
  .adm-sheet-item svg{width:17px;height:17px;flex:none;color:var(--sc-text-2)}
  .adm-sheet-item:hover{background:var(--sc-hover-bg)}
  .adm-sheet-item:focus-visible{outline:2px solid var(--sc-primary);outline-offset:-2px}
  @media (min-width:768px){ .adm-sheet, #velo-sheet{display:none} }

  /* ---- Platos: filtro por estado y controles nuevos de la fila fusionada ---- */
  .adm-chips-estado{display:flex;flex-wrap:wrap;gap:6px;margin:var(--s2) 0}

  /* ---- los cuatro filtros, como la rejilla de tarjetas del prototipo ----
     Medida en el prototipo ejecutado, no estimada: tarjeta de min-height 82 con relleno
     16 y hueco 12, la pastilla del icono a la IZQUIERDA (36x36, radio 14.4 — ni cuadrado
     con borde ni circulo), fondo melocoton y el icono a 16 en la tinta naranja oscura.
     Al lado, la cifra a 20/600 con tracking -.03em y el rotulo a 13 apagado. */
  .adm-chips-estado.adm-kpis{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;
    margin:0 0 var(--space-4);flex-wrap:nowrap;overflow:visible;
  }
  @media (min-width:1024px){
    .adm-chips-estado.adm-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}
  }
  .adm-kpis .adm-kpi{
    display:flex;flex-direction:row;align-items:center;gap:var(--space-3);
    min-height:82px;padding:var(--space-3) var(--space-4);
    min-width:0;white-space:normal;overflow:hidden;text-align:left;
    border:1px solid var(--sc-border);border-radius:var(--radius-card);
    background:var(--sc-surface);box-shadow:var(--sc-sombra-card);cursor:pointer;
    transition:background var(--t-fast) var(--ease-out),border-color var(--t-fast) var(--ease-out);
  }
  .adm-kpis .adm-kpi .adm-kpi-ico{
    flex:none;display:grid;place-items:center;width:36px;height:36px;
    border-radius:var(--radius-xl);
    background:var(--sc-selected-bg);color:var(--sc-selected-text);
    transition:background var(--t-fast) var(--ease-out),color var(--t-fast) var(--ease-out);
  }
  .adm-kpis .adm-kpi .adm-kpi-ico svg{width:16px;height:16px}
  .adm-kpis .adm-kpi .adm-kpi-txt{display:flex;flex-direction:column;min-width:0;gap:1px}
  .adm-kpis .adm-kpi .adm-kpi-n{
    min-width:0;padding:0;border-radius:0;background:transparent;
    font-size:var(--t1);font-weight:600;line-height:1.15;letter-spacing:-.03em;
    color:var(--sc-text);font-variant-numeric:tabular-nums;
  }
  .adm-kpis .adm-kpi .adm-kpi-t{font-size:var(--t3);font-weight:400;line-height:1.3;color:var(--sc-text-2)}
  /* La explicacion de cada tarjeta. `white-space:normal` y `max-width` NO son de adorno:
     .adm-chip —del que hereda— trae `white-space:nowrap`, y sin apagarlo la frase no
     envuelve y saca scroll horizontal en movil. */
  .adm-kpis .adm-kpi .adm-kpi-s{
    max-width:100%;min-width:0;white-space:normal;margin-top:2px;
    font-size:var(--t4);font-weight:400;line-height:1.35;color:var(--sc-text-2);
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  }
  .adm-kpis .adm-kpi:hover{background:var(--sc-muted-bg)}
  .adm-kpis .adm-kpi[aria-pressed="true"]{
    background:var(--sc-selected-bg);border-color:var(--sc-selected-text);
  }
  /* Con la tarjeta ya en melocoton, la pastilla del icono se invierte para no fundirse
     con ella: relleno solido y el icono en claro. */
  .adm-kpis .adm-kpi[aria-pressed="true"] .adm-kpi-ico{
    background:var(--sc-selected-text);color:var(--sc-selected-bg);
  }
  .adm-kpis .adm-kpi[aria-pressed="true"] .adm-kpi-n,
  .adm-kpis .adm-kpi[aria-pressed="true"] .adm-kpi-t,
  .adm-kpis .adm-kpi[aria-pressed="true"] .adm-kpi-s{color:var(--sc-selected-text)}
  .adm-kpis .adm-kpi[aria-pressed="true"]:hover{background:var(--sc-selected-bg)}
  .adm-kpis .adm-kpi:focus-visible{outline:2px solid var(--sc-primary);outline-offset:2px}
  /* SocialCard V3: el chip del prototipo, medido — 36 de alto (no los 40 que decidio
     DS-2, ni los 44 de H4), radio 10.4, relleno 12, 13/500, SIN borde. La pastilla es
     lo unico que dice "activo": en reposo no hay fondo. */
  .adm-chip{
    display:inline-flex;align-items:center;gap:var(--space-2);min-height:36px;padding:0 var(--space-3);
    border:0;border-radius:var(--radius-lg);background:transparent;color:var(--sc-text-2);
    font-family:inherit;font-size:var(--t3);font-weight:500;cursor:pointer;white-space:nowrap;
    transition:background var(--t-fast) var(--ease-out),color var(--t-fast) var(--ease-out);
  }
  .adm-chip:hover{background:var(--sc-muted-bg);color:var(--sc-text-medio)}
  .adm-chip-n{
    min-width:20px;padding:1px 6px;border-radius:var(--radius-md);
    background:var(--sc-muted-bg);color:var(--sc-text-2);
    font-size:var(--t4);font-weight:600;text-align:center;font-variant-numeric:tabular-nums;
  }
  .adm-chip[aria-pressed="true"]{background:var(--sc-muted-bg);color:var(--sc-text-medio);font-weight:600}
  /* Sobre la pastilla gris del chip activo, un contador del mismo gris desaparece:
     sube a la superficie de la tarjeta para seguir leyendose. */
  .adm-chip[aria-pressed="true"] .adm-chip-n{background:var(--sc-surface);color:var(--sc-text-medio)}
  /* DS-2: sin :focus-visible propio -- es un <button> normal y corriente, la
     regla general de mas abajo (button:focus-visible) ya le da el mismo
     contorno. Repetirlo aqui era duplicar, no reforzar. */

  /* MISE-B, tercera ronda: en escritorio/tablet, una sola fila, siempre visible — el
     <details> que la envuelve (auditoría UX/UI, hallazgo H1) se fuerza abierto ahí y se
     comporta como si no existiera. Sólo en móvil estrecho (≤699px, ver el <details>
     mismo, más abajo) pliega de verdad. */
  /* V7, tras revisión: fuera el filete de abajo. Separaba dos cosas que ya están separadas
     —debajo viene el aviso de agotados, que es su propia caja gris, y después las
     categorías, que son tarjetas—: era una raya de más en una pantalla que ya tiene
     bastantes bordes. El aire hace el mismo trabajo. */
  .adm-ajustar-precios-caja{
    margin-bottom:var(--s3);
  }
  .adm-ajustar-precios-resumen{
    display:flex;align-items:center;gap:8px;
    cursor:default;list-style:none;
  }
  .adm-ajustar-precios-resumen::-webkit-details-marker{display:none}
  .adm-ajustar-precios-resumen:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
  .adm-ajustar-precios-chev{display:none;flex:none;width:18px;height:18px;color:var(--muted)}
  .adm-ajustar-precios{
    display:flex;flex-wrap:wrap;align-items:center;gap:8px;
  }
  .adm-ajustar-precios-etq{font-size:var(--t3,13px);font-weight:600;color:var(--muted);margin-right:2px}
  /* V7: el rótulo deja de vivir en su propio renglón. Colgaba solo encima de los botones,
     sin nada a la derecha, y se leía como un título de sección que no es: en escritorio la
     cabecera del <details> no se puede ni pulsar. Ahora va DELANTE de los botones, en la
     misma línea, que es lo que de verdad es — un rótulo que dice de qué son esos botones.
     El <details> pasa a flex sólo aquí, donde está forzado abierto siempre; en móvil sigue
     en bloque y plegando de verdad. */
  @media (min-width:700px){
    .adm-ajustar-precios-caja{display:flex;align-items:flex-start;gap:var(--space-3)}
    /* Los navegadores nuevos meten el contenido de un <details> en una caja propia
       (`::details-content`), así que el item del flex no era la fila de botones sino ese
       envoltorio: la fila se quedaba en 695 de los 1035 disponibles y «Cambiar precio
       manual» caía a una segunda línea con 364 px libres al lado. Aplanándolo, el item
       vuelve a ser la fila. Donde el pseudo-elemento no existe, esta regla se ignora y el
       resultado ya era el correcto. */
    .adm-ajustar-precios-caja::details-content{display:contents}
    /* El rótulo se alinea con la PRIMERA línea de botones, no con el centro del bloque:
       si los controles envuelven, centrarlo lo dejaba flotando en mitad de la nada. Los
       11 px lo bajan a la línea de base de un botón de 40. */
    .adm-ajustar-precios-resumen{flex:none;padding-top:11px}
    /* `flex:1 1 0` y no `auto`: con `auto` la base es el ancho del contenido y la fila se
       quedaba en 695 de los 1035 disponibles, envolviendo sin necesidad. */
    .adm-ajustar-precios{flex:1 1 0;min-width:0}
  }
  .adm-ajustar-precios-volver{
    display:flex;align-items:center;gap:8px;margin-left:auto;
  }
  .adm-ajustar-precios-volver .adm-f-nota{white-space:nowrap}
  @media (max-width:560px){
    .adm-ajustar-precios-volver{margin-left:0;flex:1 1 100%}
  }
  /* Mismo corte que ya usa el resto del panel para "estrecho" (.adm-orow, más abajo). Sólo
     aquí abajo se ve y se comporta como un desplegable de verdad: cabecera tocable y
     chevron que gira. En cualquier otro ancho, `.adm-ajustar-precios-resumen` de arriba
     ya la deja con `cursor:default` y el chevron oculto — un rótulo fijo, no un control. */
  @media (max-width:699px){
    /* 44px de alto real: aquí SÍ es un control que se toca, no un rótulo — el mismo
       criterio de área táctil que ya usa el resto del panel. */
    .adm-ajustar-precios-resumen{cursor:pointer;min-height:44px}
    .adm-ajustar-precios-chev{display:block}
    .adm-ajustar-precios-caja[open] .adm-ajustar-precios-chev{transform:rotate(180deg)}
    .adm-ajustar-precios{padding-top:6px}
  }

  /* La fila fusionada: casilla, cámara, número y nombre igual que siempre; precio, oferta y
     destacado se agrupan en un bloque final que envuelve entero en estrecho, en vez de que
     cada control busque su propio hueco — así se lee como un grupo y no como tres sobras. */
  /* .adm-orow-nm hereda flex:1 1 auto de la regla general (Ofertas/Agotados de siempre), que
     se come todo el hueco sobrante compitiendo con .adm-plato-acciones. Aquí, dentro de la
     fila fusionada, el nombre no necesita crecer: el margin-left:auto de abajo ya empuja las
     acciones al borde derecho por sí solo, y sin la competencia el precio deja de encogerse
     a un tamaño ilegible. */
  .adm-platorow .adm-orow-nm{flex:0 1 auto}
  .adm-plato-acciones{display:flex;align-items:center;gap:10px;flex:none;margin-left:auto}
  /* .adm-orow input{position:absolute;opacity:0;width:1px;height:1px} (más arriba) da por
     hecho que el único <input> dentro de una fila es el checkbox de agotado, oculto a
     propósito detrás de su tick — cierto en Ofertas/como era Agotados, falso aquí: esta fila
     también lleva el precio en un <input> real y visible. Se le devuelve su caja. */
  /* 32 de alto, el mismo que el boton "Destacar" que tiene al lado: con 40 contra 32 las
     dos cajas de la fila no casaban y chocaban a la vista. */
  .adm-plato-acciones input.adm-prow-nuevo{
    position:static;opacity:1;flex:0 0 84px;width:84px;height:auto;min-height:32px;
  }
  .adm-plato-acciones .adm-tag-oferta,
  .adm-plato-acciones .adm-plato-sinoferta,
  .adm-plato-acciones .adm-tag,
  .adm-plato-acciones .adm-plato-destbtn,
  .adm-plato-acciones .adm-plato-incluido{flex:none}
  /* .adm-prow-nuevo/.adm-prow-fijo traen order:3;margin-left:auto desde la fila de Precios
     en estrecho (@699px, más abajo) — pensado para SU layout, no para el grupo de acciones
     de Platos, donde reordenaba el precio a su propia línea, roto. Se neutraliza aquí, con
     más especificidad, para las dos clases que se reutilizan dentro de este grupo. */
  .adm-plato-acciones .adm-prow-nuevo,
  .adm-plato-acciones .adm-prow-fijo{order:0;margin-left:0}
  .adm-plato-incluido{color:var(--muted);font-size:var(--t3);white-space:nowrap}
  .adm-plato-sinoferta{color:var(--base);opacity:.6;width:20px;text-align:center}
  .adm-tag-oferta{
    color:var(--ui-badge-promo);text-decoration:none;cursor:pointer;
    border:1px solid color-mix(in srgb,var(--ui-badge-promo) 45%,transparent);background:transparent;
  }
  .adm-tag-oferta:hover{background:color-mix(in srgb,var(--ui-badge-promo) 14%,transparent)}
  .adm-plato-destbtn{
    flex:none;min-height:32px;padding:0 13px;border-radius:999px;
    border:1px solid var(--border);background:transparent;color:var(--muted);
    display:inline-flex;align-items:center;gap:6px;
    font-family:inherit;font-size:var(--t3);font-weight:600;cursor:pointer;
    transition:background var(--t-fast) var(--ease-out),color var(--t-fast) var(--ease-out),border-color var(--t-fast) var(--ease-out);
  }
  /* El icono va siempre en el botón, pero de sobra: la palabra "Destacar" ya lo dice todo
     con sitio de sobra. Sólo en la ficha bento estrecha (más abajo) se apaga la palabra y
     se queda el icono solo. */
  .adm-plato-destbtn .ico{flex:none;width:15px;height:15px}
  .adm-plato-destbtn:hover{border-color:var(--marca-borde);color:var(--ink)}
  /* DS-2: mismo caso que .adm-chip -- es <button>, la regla general de
     button:focus-visible ya cubre este contorno sin repetirlo aqui. */
  .adm-plato-destbtn.es-elegido{background:var(--marca-fondo);border-color:var(--marca-fondo);color:var(--marca-ink)}
  .adm-tag-destacado-cambiar.es-elegido{background:var(--marca-fondo);color:var(--marca-ink)}
  /* La fila de Platos vive siempre dentro de una COLUMNA de la ficha bento (una sola en
     móvil/ficha estrecha, dos en escritorio) — el corte depende del ancho de esa columna
     (container query sobre `.adm-cat-bento-col`, no de la ficha entera ni del viewport):
     una columna estrecha es el mismo aprieto tenga el monitor el tamaño que tenga.
     El propietario lo dejó claro: una sola línea de verdad, cámara+plato+insignia+selector
     nunca apilados en pisos. Cámara, número, precio, oferta, destacar y agotado no caben
     ni de lejos en ~340px si cada uno pide el hueco de siempre, así que aquí se RECORTA en
     vez de apilar: el nombre se trunca con "…", el subtítulo (ingredientes/inglés) se
     esconde entero — se conserva en el `title` del nombre, el ratón encima lo sigue dando
     — "Destacar" pierde la palabra y se queda en el icono, la Oferta pasa de palabra a
     icono de "%", y el precio se estrecha a lo que pide un importe con coma. La etiqueta ya
     puesta (Bestseller, Veggie favourite…) es información real, no decoración — se queda en
     texto, sólo con un tope y "…" si no le cupiera entera. */
  @container adm-cat-bento-col (max-width:620px){
    .adm-cat-bento-lista .adm-platorow{flex-wrap:nowrap;gap:8px}
    .adm-cat-bento-lista .adm-platorow .adm-orow-nm{
      flex:1 1 auto;min-width:30px;display:block;
      overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    }
    /* El número del plato pide 2.6em (~34px) en la fila de siempre, con sitio de sobra —
       aquí se le recorta a lo justo para dos-tres cifras. */
    .adm-cat-bento-lista .adm-platorow .adm-prow-n{min-width:1.8em}
    /* Ya no hace falta encoger la cámara aquí: desde V3 mide 32 en todo el panel, que
       es la medida del botón de icono del prototipo, y su área táctil de 44 la garantiza
       el ::before de su propia regla. Esta excepción se retira por vacía. */
    .adm-cat-bento-lista .adm-plato-acciones{flex:none;gap:4px}
    .adm-cat-bento-lista .adm-plato-acciones input.adm-prow-nuevo{flex:0 0 46px;width:46px;padding:0 6px;font-size:var(--t3,13px)}
    .adm-cat-bento-lista .adm-plato-sinoferta{display:none}
    .adm-cat-bento-lista .adm-tag-oferta{
      width:24px;height:24px;padding:0;
      display:inline-flex;align-items:center;justify-content:center;
    }
    .adm-cat-bento-lista .adm-tag-oferta svg{width:14px;height:14px}
    .adm-cat-bento-lista .adm-plato-destbtn{width:28px;height:28px;padding:0;justify-content:center}
    .adm-cat-bento-lista .adm-plato-destbtn .txt{display:none}
    .adm-cat-bento-lista .adm-plato-destbtn .ico{width:14px;height:14px}
    .adm-cat-bento-lista .adm-tag-destacado-cambiar{
      /* 84 y no 60: el tope viejo se calculo para una etiqueta de 13/700 con tracking.
         A 12/600 y sin tracking cabe mas texto en menos sitio. */
      max-width:84px;
    }
  }
  /* V6, tras revisión: en columna ancha —en un portátil la columna de una categoría pasa
     de 500 px— el tope de 84 recortaba la etiqueta con puntos suspensivos habiendo sitio
     de sobra. El tope es para las columnas estrechas; donde cabe, no se recorta.
     Medido a 1512: la columna mide 560, y la etiqueta más larga («Hay que probarlo») 118. */
  @container adm-cat-bento-col (min-width:420px){
    .adm-cat-bento-lista .adm-tag-destacado-cambiar{max-width:none}
  }
  /* Columna MUY estrecha (movil de 320): el grupo de acciones de la fila —precio,
     etiqueta e interruptor— no encoge, asi que con el tope de 84 sumaba 198px dentro de
     una fila de 220 y sacaba scroll horizontal. Aqui la etiqueta cede: es lo unico
     recortable del grupo sin perder un control. */
  /* SocialCard V7, agujero encontrado midiendo Platos a 390 pantalla a pantalla: el tope de
     260 lo cerraba en móvil pequeño pero dejaba un hueco entre 260 y ~340 de columna. A 390
     de pantalla la columna mide 290 —por encima de 260, así que esta regla no entraba— y el
     grupo de acciones sumaba 224 dentro de una fila de 290: el interruptor salía 9 px FUERA
     de su tarjeta y la tarjeta lo recortaba (`overflow:hidden`). El documento no sacaba
     scroll, por eso ninguna ronda anterior lo vio: sólo aparece comprobando caja por caja.

     El umbral sube a 300 — medido, no estimado: a 290 de columna el grupo se salía 9 px y a
     322 (portátil de 1024) cabe sin desbordar. Lo que pide una línea entera es:
     46 del precio + 22 del indicador + 104 de la etiqueta + 40 del interruptor + la cámara y
     el número + un mínimo legible de nombre. Por debajo, la etiqueta cede a 48 y la fila
     envuelve, exactamente igual que ya hacía a 320. */
  @container adm-cat-bento-col (max-width:300px){
    .adm-cat-bento-lista .adm-tag-destacado-cambiar{max-width:48px}
    /* Y la fila vuelve a envolver. La regla de 480 la fuerza a UNA linea, que es lo
       correcto mientras quepa; a 320 el grupo de acciones —precio, etiqueta, destacar e
       interruptor— mide 162 dentro de una fila de 220 y se salia de la tarjeta, que
       recorta (overflow:hidden). Envolviendo, las acciones bajan a su propia linea en vez
       de quedarse cortadas. */
    .adm-cat-bento-lista .adm-platorow{flex-wrap:wrap;row-gap:6px}
    .adm-cat-bento-lista .adm-platorow .adm-orow-nm{flex:1 1 100%;order:-1}
    .adm-cat-bento-lista .adm-plato-acciones{margin-left:auto}
  }
  /* El parche táctil condicionado a dedo+ficha estrecha también se retira: el ::before
     de 44x44 de .camara es incondicional desde V3 y cubre este caso y todos los demás. */

  /* ==================================================================== MISE-B: Platos ==
   * Corrección de paridad con el prototipo v2.1: sin ficha exterior, sin acordeón. Cabecera
   * compacta y filtros arriba; la lista de abajo pasó de ser un separador+fuelle por
   * categoría (rechazado tras revisión visual) al bento probado primero en Ofertas: mismo
   * mecanismo, .adm-cat-bento/.adm-cat-bento-cab/.adm-cat-bento-lista de esa hoja de
   * estilos, sin ficha propia aquí. Nada de esto toca contratos: es sólo el envoltorio
   * visual de las mismas filas/handlers de siempre.
   */
  /* Las reglas de .adm-platos-cab y .adm-platos-titulo se retiran: su marcado ya no
     existe. El titulo lo dice la cabecera fija, el total la tarjeta "Todos" y la ayuda,
     cada tarjeta por su cuenta. */
  .adm-platos-titulo{
    margin:0;font-size:var(--t2);font-weight:600;color:var(--sc-text-2);
    display:flex;align-items:center;gap:var(--space-2);
  }
  /* La cifra, que es lo que se mira: 20/600 tabular, el escalon "cifra importante"
     del sistema. El rotulo que la acompaña baja a metadato. */
  .adm-platos-titulo .adm-f-nota{
    font-size:var(--t1);font-weight:600;color:var(--sc-text);
    font-variant-numeric:tabular-nums;
  }

  /* La barra de trabajo, como TARJETA y pegada bajo la cabecera fija — el patron del
     prototipo (rounded-2xl, borde, superficie, relleno 12, buscador a la izquierda y
     filtros a la derecha). `top` es la altura de la cabecera y no 0: con la cabecera
     fija de V2, un sticky en 0 se quedaria por detras de ella. */
  /* Sin `position:sticky`. Lo probe pegada bajo la cabecera y la medicion lo desmonto:
     a 560px la barra envuelve a 158px de alto y, pegada, se comia una quinta parte de la
     pantalla de forma permanente. El prototipo tampoco la fija, y la version anterior de
     este panel tampoco — era idea mia y estaba mal. */
  .adm-platos-filtros{
    display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3);
    margin:0 0 var(--space-4);padding:var(--space-3);
    background:var(--sc-surface);
    border:1px solid var(--sc-border);border-radius:var(--radius-card);
    box-shadow:var(--sc-sombra-card);
  }
  .adm-platos-filtros .adm-buscar{flex:1 1 260px;min-width:0;max-width:28rem}
  .adm-platos-filtros .adm-chips-estado{
    flex:1 1 auto;justify-content:flex-end;margin:0;gap:var(--space-2);min-width:0;
  }
  /* Estrecho: los filtros NO envuelven, ruedan en horizontal — igual que en el
     prototipo (overflow-x-auto + scrollbar-none). Envolviendo, los cuatro chips
     apilaban la barra hasta 202px de alto en 320, y eso es una pantalla de platos
     menos antes de empezar a trabajar. */
  @media (max-width:1023px){
    /* `flex-wrap:nowrap` NO es decorativo: en columna, un contenedor flex que envuelve
       reparte los hijos en varias COLUMNAS y `align-items:stretch` los estira al ancho de
       su linea, no al del contenedor. Medido: buscador y chips salian a 470px dentro de
       una caja de 320 a viewport 390. Con nowrap vuelven a los 296 que les tocan. */
    .adm-platos-filtros{flex-direction:column;flex-wrap:nowrap;align-items:stretch}
    /* En columna, el eje principal es el VERTICAL: ese `flex:1 1 260px` de arriba
       dejaba de medir ancho y pasaba a medir ALTO — la etiqueta del buscador salia de
       260px de alto y la barra entera de 334. Es la misma trampa que .adm-dto ya tiene
       documentada unas lineas mas abajo, en la ficha de Ofertas. */
    .adm-platos-filtros .adm-buscar{flex:0 0 auto;max-width:none}
    .adm-platos-filtros .adm-chips-estado{
      flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;
      scrollbar-width:none;-webkit-overflow-scrolling:touch;
    }
    .adm-platos-filtros .adm-chips-estado::-webkit-scrollbar{display:none}
    .adm-platos-filtros .adm-chip{flex:none}
  }

  /* Una sola línea de verdad (ver el @container de la ficha estrecha, más abajo): la fila
     de Platos vuelve a medir prácticamente lo mismo que la de Ofertas (59 contra 57px), así
     que ya no hace falta un tope de altura propio — hereda el de 8 filas de la regla
     compartida (.adm-cat-bento-lista, más abajo) sin necesidad de repetirlo aquí. */

  /* ---- Destacado, ya elegido: un solo pill con dos zonas — cambiar / quitar ----
     Las dos zonas son <button>, y el `button{min-height:48px}` genérico de más abajo
     (pensado para botones normales, no para una pastilla de fila) se colaba aquí sin que
     nada lo pisara: la etiqueta salía tan alta como un botón de formulario entero, con el
     texto descentrado dentro de esa caja de más. Se fija una altura propia en las dos
     mitades — ya no dependen de lo que mida el texto ni de lo que diga la regla genérica. */
  /* La etiqueta de destacado es AHORA lo unico que resalta en la fila: al quitar el
     fondo de hover, es ella quien dice "este plato esta destacado", y por eso pasa del
     gris neutro a la pastilla de seleccion del sistema.
     Y encoge: 22 de alto en vez de 26, 12px en vez de 13 y sin el `letter-spacing` que
     la ensanchaba. Las etiquetas las escribe el restaurante y pueden ser largas
     ("HAY QUE PROBARLO"), asi que ademas se le pone tope de ancho con puntos suspensivos:
     la fila no se rompe por muy larga que sea la palabra. */
  .adm-tag-destacado{display:inline-flex;align-items:stretch;flex:0 1 auto;min-width:0}
  .adm-tag-destacado-cambiar{
    height:22px;min-height:0;box-sizing:border-box;display:inline-flex;align-items:center;
    border:0;border-radius:var(--radius-md) 0 0 var(--radius-md);padding:0 6px 0 8px;
    background:var(--sc-selected-bg);color:var(--sc-selected-text);
    font-family:inherit;font-size:var(--t4);font-weight:600;letter-spacing:0;text-transform:uppercase;
    /* `flex:0 1 auto` + `min-width:0`: el tope de ancho es un TECHO, no una medida fija.
       Con `flex:none` la etiqueta empujaba la fila y a 320px sacaba 18px de scroll
       horizontal; asi cede sitio y se recorta con puntos suspensivos cuando hace falta. */
    flex:0 1 auto;min-width:0;
    /* V6, tras revisión: 14ch cortaba «HAY QUE PROBARLO» (16 caracteres) en cuanto se
       usaba esa etiqueta. El tope existe para que una palabra larga no empuje la fila,
       no para recortar las etiquetas que el propio panel ofrece: sube a 20ch, que las
       cubre todas. El recorte de verdad —el que salva el ancho— lo hace el tope en px
       de la columna estrecha, más abajo. */
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:20ch;
    cursor:pointer;
  }
  .adm-tag-destacado-cambiar:hover{background:var(--sc-selected-text);color:var(--sc-surface)}
  .adm-tag-destacado-cambiar:focus-visible{outline:2px solid var(--sc-primary);outline-offset:1px}
  .adm-tag-destacado-quitar{
    height:22px;min-height:0;box-sizing:border-box;
    /* padding:0 explicito: el reset general de <button> pone `padding:0 21px` y con
       box-sizing:border-box se comia el ancho — la mitad de "quitar" salia de 42px en
       vez de 20. Misma familia de trampa que el min-height:48. */
    display:grid;place-items:center;width:20px;padding:0;flex:none;border:0;
    border-radius:0 var(--radius-md) var(--radius-md) 0;
    background:var(--sc-selected-bg);color:var(--sc-selected-text);opacity:.75;cursor:pointer;
  }
  .adm-tag-destacado-quitar svg{width:11px;height:11px}
  .adm-tag-destacado-quitar:hover{opacity:1;background:color-mix(in srgb, var(--ui-state-danger) 20%, transparent);color:var(--ui-state-danger)}
  .adm-tag-destacado-quitar:focus-visible{outline:2px solid var(--sc-primary);outline-offset:1px}

  /* ---- Agotado, en el grupo de acciones: mismo checkbox, aspecto de interruptor mini.
     Rojo al marcar y no verde: agotado es una baja, no un "encendido". */
  /* V5: sin medidas propias — usa el interruptor unico (40x22). Lo unico que conserva
     es su COLOR al marcar: un agotado no es un "encendido", es una baja, y por eso va en
     el rojo de --ui-state-depleted y no en el primario. Es la unica excepcion de color
     del componente, y es semantica, no decorativa. */
  .adm-sw.adm-sw-agotado{padding:0;gap:0;flex:none}
  .adm-sw.adm-sw-agotado:has(input:checked) .adm-sw-pista{background:var(--ui-state-depleted)}

  /* Auditoría correctiva: el tamaño VISUAL de Agotado/Destacado se queda igual (36x21 el
     interruptor, 26px la pastilla) — lo que crece es sólo el área táctil, y sólo en
     puntero basto/sin hover (dedo, no ratón). Un ::before invisible, más grande que la
     caja real y descentrado según el vecino que tenga al lado (para no comerle el hueco a
     Oferta/Precio en el mismo grupo), simula el "hit slop" de ~44px sin tocar el alto de
     la fila ni el layout de escritorio, que ni carga esta regla. */
  @media (pointer:coarse), (hover:none) {
    /* El parche de .adm-sw-agotado se retira: desde V5 el propio componente lleva su
       area tactil de 44x44 en .adm-sw-pista::before, incondicional y no solo con dedo. */
    .adm-tag-destacado-cambiar,.adm-tag-destacado-quitar{position:relative}
    .adm-tag-destacado-cambiar::before{
      content:'';position:absolute;top:-9px;bottom:-9px;left:-4px;right:0;
    }
    .adm-tag-destacado-quitar::before{
      content:'';position:absolute;top:-9px;bottom:-9px;left:0;right:-4px;
    }
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
  /* V5: el aviso compartido, al sistema. Radio 12 (usaba --r-sheet, 21px, de la carta
     publica) y cuerpo 14. Ok y error usan la pareja fondo+tinta de su estado, no una
     mezcla del color del restaurante — y por eso el "ok" pasa a verde de exito y deja de
     depender de la marca del cliente. Lo heredan las siete pantallas. */
  .msg{
    border-radius:var(--radius-lg);
    padding:var(--space-3) var(--space-4);
    margin-bottom:var(--space-4);
    font-size:var(--t2);line-height:1.45;
  }
  .msg.ok{background:var(--sc-ok-bg);color:var(--sc-ok-ink)}
  .msg.bad{background:var(--sc-bad-bg);color:var(--ui-state-error)}
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

  /* ---------- CSS RETIRADO EN SocialCard V7 ----------
     Aqui vivian `.tools`, `.search`, `.chips` y `.chip`: la barra de trabajo y los filtros
     del panel ANTERIOR a la migracion. Platos los sustituyo en V3 por `.adm-buscar` y la
     rejilla de tarjetas `.adm-kpi`, y desde entonces no los pedia nadie. Comprobado antes de
     borrar: CERO `class=` en el marcado, CERO construccion dinamica desde JavaScript o PHP
     (ni `classList`, ni `className =`, ni concatenacion de cadenas). Se van con ellos los dos
     data URI de la lupa, que solo pintaba `.search`. */

  /* ---------- FILAS RETIRADAS EN V7 ----------
     `.row` era la fila del panel anterior. La sustituyo `.adm-orow` en V3 y desde entonces
     no la pedia nadie: cero `class=` en el marcado y cero construccion dinamica. */
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
  /* SocialCard V3: boton de icono del prototipo — 32x32, radio 10.4, icono de 16,
     sin pastilla en reposo y con el gris apagado al pasar el raton. El area tactil
     real sigue siendo de 44 gracias al ::before invisible de mas abajo: se encoge lo
     que se DIBUJA, no lo que se puede pulsar. */
  .camara{
    position:relative;
    flex:0 0 auto;width:32px;height:32px;min-height:0;padding:0;
    display:flex;align-items:center;justify-content:center;
    border:0;border-radius:var(--radius-lg);background:transparent;
    color:var(--sc-text-2);opacity:.75;cursor:pointer;
    transition:opacity var(--t-fast) ease,color var(--t-fast) ease,background-color var(--t-fast) ease;
  }
  .camara::before{
    content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;
    transform:translate(-50%,-50%);
  }
  .camara svg{width:16px;height:16px}
  .camara:hover{opacity:1;background:var(--sc-muted-bg);color:var(--sc-text)}
  .camara.tiene{color:var(--sc-primary);opacity:1}
  .camara.tiene::after{
    content:"";position:absolute;right:3px;top:3px;
    width:6px;height:6px;border-radius:50%;background:var(--sc-primary);
  }
  .camara:focus-visible{outline:2px solid var(--sc-primary);outline-offset:-2px}

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
    padding:var(--s3);border-radius:var(--p-radius-card);
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
  .recorte .err{margin:var(--s2) 0 0;color:var(--ui-state-error);font-size:14px}
  .recorte .err:empty{display:none}
  .camara.cargando{opacity:1;color:var(--p-accent-stroke)}
  .camara.cargando svg{animation:latir 900ms ease-in-out infinite}
  @keyframes latir{0%,100%{opacity:.35}50%{opacity:1}}
  @media (prefers-reduced-motion:reduce){ .camara.cargando svg{animation:none} }


  /* ---------- formularios ----------
     Un campo es un rótulo pequeño en versales y una caja alta. Nada de bordes por todas
     partes: el fondo blanco sobre la crema ya separa lo editable de lo que sólo se lee, y el
     filete queda para el foco. Alturas de 52 y 56 porque esto se rellena con el dedo. */
  .fld{
    display:block;margin-bottom:var(--s3);
    font-family:var(--title-font);
    font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
    color:var(--ink);
  }
  .fld input,.fld select,.fld textarea{
    display:block;width:100%;margin-top:7px;
    min-height:56px;padding:0 var(--s3);
    border:1px solid var(--border);
    border-radius:var(--ui-radius-control);
    background:var(--chip);
    color:var(--ink);
    font-family:inherit;font-size:16px;font-weight:400;letter-spacing:0;text-transform:none;
    transition:box-shadow var(--t-fast) ease;
  }
  .fld select{
    /* la flecha del sistema en Bricolage y no la del navegador, que rompe la coherencia */
    appearance:none;-webkit-appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475864' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6l6 -6'/%3E%3C/svg%3E");
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
  .fld input:focus-visible,.fld select:focus-visible,.fld textarea:focus-visible{
    outline:none;
    border-color:var(--p-accent-stroke);
    box-shadow:0 0 0 3px var(--p-accent-glow);
  }
  .fld input::placeholder,.fld textarea::placeholder{color:var(--muted)}
  .opt{color:var(--muted);font-weight:400;letter-spacing:.06em;text-transform:none}

  /* ---------- buscador de platos (Destacados) ---------- */
  .combo{position:relative;margin-bottom:var(--s3)}
  .combo-q{
    display:block;width:100%;min-height:56px;padding:0 var(--s3);
    border:1px solid var(--border);border-radius:12px;
    background:var(--chip);color:var(--ink);
    font-family:inherit;font-size:16px;
    transition:box-shadow var(--t-fast) ease;
  }
  .combo-q:focus-visible{outline:none;border-color:var(--p-accent-stroke);box-shadow:0 0 0 3px var(--p-accent-glow)}
  .combo-q.is-ok{box-shadow:inset 0 0 0 2px var(--p-accent-stroke);font-family:var(--title-font);font-weight:600}
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
  .combo-num{flex:0 0 auto;min-width:30px;font-family:var(--title-font);font-size:13px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}
  .combo-txt{flex:1 1 auto;min-width:0;font-family:var(--title-font);font-size:15px;font-weight:600;line-height:1.25}
  .combo-txt small{display:block;font-family:var(--body-font);font-size:13px;font-weight:400;color:var(--muted)}
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
    background:var(--sc-input-bg);color:var(--ink);
    font-family:var(--title-font);font-size:16px;font-weight:600;
    text-align:right;font-variant-numeric:tabular-nums;
  }
  .pnuevo:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:transparent}
  .pfijo{font-family:var(--title-font);font-weight:700;font-variant-numeric:tabular-nums}
  .badge{
    display:inline-block;padding:2px 9px;border-radius:var(--r-pill);
    /* --badge-ink: NEUTRO fijo solo con el naranja de fabrica, adaptativo (accent-ink)
       con cualquier otro colorPrincipal -- misma regla que todo badge con fondo --accent. */
    background:var(--accent);color:var(--badge-ink);
    font-family:var(--title-font);font-size:10px;font-weight:600;
    letter-spacing:.1em;text-transform:uppercase;
  }

  /* ---------- BARRA FIJA RETIRADA EN V7 ----------
     `.bar` era la barra de accion fija del panel anterior. La sustituyo
     `.adm-acciones-fuera` en V2 y desde entonces no la pedia nadie: cero `class=` en el
     marcado y cero construccion dinamica. Con ella se va `.bar .ver`, su enlace a la carta,
     que era el ultimo consumidor real del `min-height:48` generico fuera de la recepcion. */
  /* SocialCard V7: LA REGLA GENÉRICA PIERDE LA GEOMETRÍA.
     `min-height:48px` y `padding:0 var(--s3)` venían de la primera versión del panel, cuando
     todos sus botones eran pastillas de 48. Hoy no queda ni uno: cada componente declara su
     altura —40 en `.adm-btn`, 36 en `.adm-chip`, 32 en `.adm-destpick` y `.adm-pct-ir`, 30
     en `.vp-per`, 26 en `.adm-ayuda-b`, 22 en la etiqueta—. La regla ya no vestía a nadie;
     sólo esperaba a que alguien se olvidara de anularla, y ha mordido SIETE veces:
     `.adm-tema-sw` y `.adm-pct-ir` (32x48), `.adm-foto-b` (40x48), la mitad «quitar» de la
     etiqueta (42 de ancho), «Quitar las fechas» (48 de alto siendo un enlace) y el aspa de
     la hoja «Más» (32x48).

     Se le quitan las dos declaraciones aquí, en el selector de MENOR peso posible (0,0,1),
     que es lo único que no puede ganarle a ningún componente. Medido antes de tocarla: en
     todo el panel sólo CUATRO botones dependían de su `min-height` y UNO de su `padding` —
     los dos del recorte de foto, el enlace de «Quitar las fechas» (que quiere 0) y el de
     entrar. Los dos primeros pasan a la geometría del sistema; el de entrar declara la
     suya, más abajo, porque la recepción sigue en el lenguaje antiguo. */
  button{
    font-family:var(--title-font);font-size:15px;font-weight:600;
    border:0;border-radius:var(--r-pill);
    cursor:pointer;touch-action:manipulation;
    transition:transform var(--t-press) var(--ease-out),background-color var(--t-fast) ease;
  }
  button:active{transform:scale(.97)}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

  /* ==================================================================== SocialCard V7
     LA TRAMPA DEL RESET, CERRADA EN EL COMPONENTE Y NO CASO A CASO.

     `button{min-height:48px;padding:0 var(--s3)}` es de la primera versión del panel, cuando
     TODOS sus botones eran pastillas de 48. Desde V1 no queda ni uno: cada componente del
     sistema declara su propia altura —40 en `.adm-btn`, 36 en `.adm-chip`, 32 en
     `.adm-destpick` y en `.adm-pct-ir`, 26 en `.adm-ayuda-b`, 22 en la etiqueta—. La regla
     ya no viste a nadie: sólo espera a que alguien se olvide de anularla.

     Y ha mordido SEIS veces, todas iguales y todas encontradas midiendo: `.adm-tema-sw` y
     `.adm-pct-ir` salían 32x48; `.adm-foto-b`, 40x48; la mitad «quitar» de la etiqueta, 42
     de ancho por el padding; y en V7, «Quitar las fechas» —que es un enlace subrayado, no
     una caja— medía 48 px de alto.

     Se apaga dentro del panel, que es donde el sistema manda. Fuera —recepción, login,
     activación, la hoja del recorte— sigue en pie: esas pantallas todavía usan el lenguaje
     antiguo y ahí la regla SÍ viste.

     Comprobado por DOM antes y después, botón a botón en las siete pantallas: la única
     altura que cambia es la de «Quitar las fechas», de 48 a su alto real de texto. */
  /* PRIMER INTENTO, DESCARTADO Y ANOTADO PARA QUE NADIE LO REPITA:
     apagarla con `.card-main button{min-height:0;padding:0}` parece lo natural y es
     exactamente el mismo error que se quiere arreglar. `.card-main button` pesa (0,1,1) y
     `.adm-btn` pesa (0,1,0): la regla «de limpieza» GANA a los componentes. Medido en vivo:
     `.adm-btn` cayó de 40 a 18, `.adm-vermas` a 17, `.adm-pct` a 18, `.adm-atajo` de 96 a
     70 y `.adm-destpick` de 32 a 28. Se retiró.

     Lo que sí se hace, más abajo y en cada sitio: la regla genérica pierde la geometría
     —`button` baja a (0,0,1) y ya no puede ganarle a ninguna clase— y los pocos consumidores
     reales que la necesitaban la declaran ellos. */
  /* SocialCard V7: los dos botones que quedaban del lenguaje antiguo pasan al sistema.
     Los usa la hoja de recortar la foto —que se abre desde CUALQUIER fila de Platos y desde
     Marca—, así que se veían 312 veces al día: pastilla negra de 48 con radio 999 al lado de
     controles de 40 con radio 14,4. Mismo papel, misma geometría que `.adm-btn`/`.adm-btn-
     guardar`: 40 de alto, radio de control, tipografía del sistema.

     Siguen llamándose `.save` y `.ghost` a propósito: los usan también el banner de migración
     de estado, el envío sin JavaScript de Publicidad y la salida del modo demo. Renombrarlos
     sería refactor, y V7 no hace refactor. */
  .save{
    display:inline-flex;align-items:center;justify-content:center;gap:9px;
    min-height:40px;padding:0 var(--space-4);border-radius:var(--ui-radius-control);
    background:var(--sc-primary);color:var(--sc-primary-ink);
    font-family:inherit;font-size:var(--t2);font-weight:600;
  }
  .save:hover{background:color-mix(in srgb, var(--sc-primary) 88%, #FFF)}
  .ghost{
    display:inline-flex;align-items:center;justify-content:center;gap:9px;
    background:transparent;color:var(--sc-text);
    border:1px solid var(--sc-border);
    padding:0 var(--space-3);min-height:40px;border-radius:var(--ui-radius-control);
    font-family:inherit;font-size:var(--t2);font-weight:500;
  }
  .ghost:hover{background:var(--sc-hover-bg);border-color:var(--sc-input-border)}

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
    border-radius:var(--p-radius-card);
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
  .dt-chip.baja{color:var(--ui-trend-negative);background:color-mix(in srgb,var(--ui-trend-negative) 10%,transparent)}
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
    border-radius:var(--p-radius-card);
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
  /* ---------- la recepción, SocialCard V7 ----------
     Era la última pantalla en el lenguaje anterior: tipografía de títulos distinta, campos
     de 52 y 56 con radio de pastilla, y un botón negro de 48. Ahora es del sistema, como el
     resto: Arimo —la hereda de `.card-main`, por eso se le quita el `font-family` propio—,
     campo de 40 con el radio de control, y el botón en el primario del panel.

     Lo que la sigue distinguiendo NO es la geometría: es la foto de la puerta, el
     antetítulo, el nombre grande y el filete. Un campo más alto no la hacía más «puerta»,
     sólo la sacaba del sistema. */
  .login{max-width:380px}
  .login .card-main{padding:var(--s4) var(--s3)}
  .login h1{margin:0 0 4px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:var(--sc-text)}
  .login input{
    width:100%;min-height:40px;padding:0 14px;margin-bottom:var(--s2);
    border:1px solid var(--sc-border);border-radius:var(--ui-radius-control);
    background:var(--sc-input-bg);color:var(--sc-text);
    font-family:inherit;font-size:var(--t2);
    transition:border-color var(--t-press) var(--ease-out),box-shadow var(--t-press) var(--ease-out);
  }
  .login input::placeholder{color:var(--sc-text-2)}
  .login input:focus,.login input:focus-visible{
    border-color:var(--sc-primary);box-shadow:0 0 0 3px var(--p-accent-glow);outline:none;
  }
  .login button{
    display:inline-flex;align-items:center;justify-content:center;
    width:100%;min-height:40px;padding:0 var(--space-3);
    border:1px solid var(--sc-primary);border-radius:var(--ui-radius-control);
    background:var(--sc-primary);color:var(--sc-primary-ink);
    font-family:inherit;font-size:var(--t2);font-weight:600;
  }
  .login button:hover{background:color-mix(in srgb, var(--sc-primary) 88%, #FFF);border-color:color-mix(in srgb, var(--sc-primary) 88%, #FFF)}

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
    border-radius:calc(var(--p-radius-card) - var(--s1)) calc(var(--p-radius-card) - var(--s1)) var(--r-sheet) var(--r-sheet);
    overflow:hidden;
    /* El fondo mientras carga, no un gris que aparece y se va justo antes de la imagen.
       V7: el neutro del sistema en vez de la tinta — en claro, un rectángulo negro de 3:2
       durante la carga era lo más oscuro de la pantalla. */
    background:var(--sc-muted-bg);
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
    font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;
    color:var(--sc-text-2);
  }
  .login.is-recepcion h1{margin:0 0 var(--s3);font-size:30px;line-height:1.1}
  .login-filete{width:var(--s4);height:1px;margin:0 auto var(--s4);background:var(--sc-border)}
  /* V7: la recepción ya no tiene un campo más alto que el resto del panel. Se le queda lo
     que de verdad la distingue: el texto centrado. */
  .login.is-recepcion input{text-align:center}

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
    .prow{break-inside:avoid}
    /* Las listas de precios, en dos columnas: 326 filas en una sola dejaban medio
       panel vacio. Cuelga de .adm-precios desde que el pane es bento. */
    .adm-precios{columns:2;column-gap:var(--s4)}
    .adm-prow{break-inside:avoid}
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
    background:var(--sc-input-bg);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 10%,transparent);
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

  /* ---------- insignias de sesión ----------
     Fijas arriba a la derecha, como las etiquetas de oferta y destacados de la carta.
     MISE-B, décima ronda: sólo avisan de lo que de verdad hace falta saber — que se ha
     entrado como SUPERADMIN (más alcance que el caso normal) o que el panel está abierto
     en demo. "En línea" no comprobaba nada (ni un latido, nada en JS la tocaba) y
     "Usuario" era el caso de siempre: las dos se retiraron. Siempre a la vista, también
     con el scroll abajo — cuando hay algo que mostrar. */
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
  .insignia.is-super{background:var(--ink);color:var(--surface);outline:2px solid var(--surface)}
  .insignia.is-demo{background:var(--ui-badge-demo);color:var(--surface)}

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
    display:flex;align-items:flex-start;gap:var(--space-3);
    width:min(520px,100%);padding:var(--space-3) var(--space-4);
    /* SocialCard V1: radio 12 y cuerpo 14, las medidas del sistema. Antes usaba
       --r-sheet (21px), que es un radio de la CARTA publica, no del panel. */
    border-radius:var(--radius-lg);
    /* Invertido respecto a la tarjeta, que es como se separa del contenido: la tinta
       del tema hace de fondo y la superficie hace de texto. Funciona igual en los dos
       temas sin una regla por tema. El error va en el rojo de estado. */
    background:var(--ink);color:var(--surface);
    box-shadow:0 12px 32px color-mix(in srgb,var(--sc-canvas) 45%,transparent);
    font-size:var(--t2);line-height:1.4;
    pointer-events:auto;
    opacity:0;transform:scale(.96);
    transition:opacity var(--t-fast) var(--ease-out),transform var(--t-fast) var(--ease-out);
  }
  .toast.is-in{opacity:1;transform:none}
  .toast.bad{background:var(--ui-state-error)}
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

  /* ==========================================================================
     PUBLICIDAD — un tablero de edicion, en bento.

     Este pane es el UNICO oscuro del panel, y es a proposito: se lee como una
     superficie de trabajo con su propio marco, no como una pantalla que se ha
     equivocado de tema. Los tokens oscuros se redefinen solo dentro de
     .adm-board; ninguna otra pestana los ve.

     Los <input type="datetime-local"> siguen siendo los que mandan al servidor:
     esto solo cambia como se rellenan y como se ve.
     ========================================================================== */
  .adm-board{
    /* Los de color ya los pone .card-main; aqui solo queda la superficie de las
       fichas, que va un escalon por encima de la tarjeta para que se separen.
       SocialCard V1: en claro ese escalon va HACIA ABAJO (un gris muy tenue sobre
       blanco) y en oscuro HACIA ARRIBA (mas claro que la tarjeta). El token
       --sc-muted-bg ya trae esa inversion resuelta en cada tema. */
    --ficha:var(--sc-muted-bg);
    /* Lo MARCADO va en gris, del mismo tono que las barras de Analitica y que los textos
       secundarios. El naranja se guarda para los detalles —los iconos de las fichas— y para
       el boton que cierra la faena. Con veinte platos elegidos, veinte pastillas naranjas no
       destacan nada: destacan todas, que es no destacar ninguna. En gris, lo que resalta es
       el unico boton naranja de la pantalla, que es donde hay que ir. */
    --marca-fondo:var(--base);            /* relleno de lo elegido */
    --marca-ink:var(--sc-surface);        /* texto encima de ese relleno */
    --marca-velo:color-mix(in srgb, var(--sc-text) 6%, transparent);   /* la fila entera, apenas teñida */
    --marca-velo-mas:color-mix(in srgb, var(--sc-text) 11%, transparent);
    --marca-borde:color-mix(in srgb, var(--sc-text) 28%, transparent);

    /* SocialCard V1: los tres estados, con la pareja fondo+tinta del sistema nuevo. */
    --ok:var(--sc-ok-ink); --ok-fondo:var(--sc-ok-bg);
    --aviso:var(--sc-warn-ink); --aviso-fondo:var(--sc-warn-bg);
    --offer:var(--sc-bad-ink);

    /* Mise DS-1: el resto de alias semanticos de --offer, redeclarados aqui
       porque --offer vale otra cosa fuera de .adm-board (ver arriba). Cada
       uno tiene un solo significado real -- ver SPEC.md, entrada DS-1. */
    --ui-state-error:var(--offer);
    --ui-state-danger:var(--offer);
    --ui-state-depleted:var(--offer);
    --ui-badge-promo:var(--offer);
    --ui-trend-negative:var(--offer);
    --ui-state-inactive:var(--offer);

    /* Ya no dibuja nada: la .card-main es el tablero desde que el panel es oscuro.
       Esto se queda solo por los tokens de arriba, que son los que usan las fichas. */
    background:transparent;border:0;border-radius:0;
    padding:0;margin:0;
  }

  .adm-bento{display:grid;gap:var(--s3);grid-template-columns:minmax(0,1fr)}
  /* Ajustes solo lleva UNA ficha (copias) cuando entra el restaurante — con la rejilla de
     6 columnas se colocaba en 1/6 de ancho, estirada a la altura de un pane vacío: la
     ficha real de 270px flotando sobre un hueco de cientos de px. Vuelve a ser una
     columna a ancho completo.
     SocialCard V6: en sesión de superadministrador la pantalla YA tiene cuatro fichas y
     la rejilla vuelve a tener sentido, así que la excepción se condiciona a que no haya
     ninguna ficha de superadministrador. `:has()` ya lo usa el interruptor único. */
  .pane[data-pane="ajustes"] .adm-bento:not(:has(.adm-f-super)){display:block}
  @media (min-width:1000px){
    /* La columna estrecha lleva Estado arriba y Horario debajo; la vista previa
       ocupa las dos filas, asi que las tres cajas acaban a la misma altura sin
       tener que fijar ninguna a mano. Duracion cruza el ancho entero. */
    .adm-bento{grid-template-columns:repeat(6,minmax(0,1fr));align-items:stretch}
    /* Tres fichas en la columna estrecha —Estado, Horario y Enlace— y la vista
       previa cruzando las tres filas: el alto total no cambia, se reparte entre
       tres en vez de dos. Duracion cruza el ancho entero debajo. */
    .adm-f-estado{grid-column:1 / span 2;grid-row:1}
    .adm-f-horas {grid-column:1 / span 2;grid-row:2}
    .adm-f-enlace{grid-column:1 / span 2;grid-row:3}
    .adm-f-crea  {grid-column:3 / span 4;grid-row:1 / span 3}
    .adm-f-dur   {grid-column:1 / span 6;grid-row:4}

    /* Marca, SocialCard V6: en tres filas, y el orden ya NO es el que minimiza el hueco
       sino el de la tarea. Antes se emparejaba por alto —portadas+redes, color+Google,
       nombre sola al final—: cuadraba la rejilla y dejaba lo que define la identidad del
       restaurante en el ÚLTIMO sitio donde se mira.

       Ahora: primero quién es (nombre y color, las dos cosas que el comensal lee como
       marca), luego cómo se ve (las portadas, que son lo primero que abre la carta), y
       al final lo que sale en el pie (la nota y las redes). Las dos filas de dos se
       emparejan además por alto real medido a 1512: nombre 229 con color 294, y Google
       294 con redes 294 —redes baja de 383 a 294 al pasar sus cuatro campos a .adm-2col.
       El hueco muerto de la fila 1 es 65 px; con el orden viejo era de 160.

       Portadas cruza el ancho entero porque es una rejilla de miniaturas: a 566 px
       entraban dos por fila, a 1153 entran cinco. */
    .adm-f-nombre{grid-column:1 / span 3;grid-row:1}
    .adm-f-color {grid-column:4 / span 3;grid-row:1}
    .adm-f-fotos {grid-column:1 / span 6;grid-row:2}
    .adm-f-google{grid-column:1 / span 3;grid-row:3}
    .adm-f-redes {grid-column:4 / span 3;grid-row:3}

    /* Ajustes (sólo con sesión de superadministrador; sin ella la pantalla sigue siendo
       una columna, ver el :not(:has()) de arriba). Las copias cruzan el ancho porque son
       una lista; las dos fichas de contraseña se emparejan —son la misma tarea vista
       desde los dos roles— y el registro vuelve a cruzar, que es otra lista. */
    .adm-f-copias   {grid-column:1 / span 6;grid-row:1}
    .adm-f-super-tit{grid-column:1 / span 6;grid-row:2}
    .adm-f-clicli   {grid-column:1 / span 3;grid-row:3}
    .adm-f-clisuper {grid-column:4 / span 3;grid-row:3}
    .adm-f-log      {grid-column:1 / span 6;grid-row:4}

    /* Juego. Una sola ficha a todo el ancho: el interruptor vive dentro del
       marcador y no en una caja aparte. */
    .adm-f-juego{grid-column:1 / span 6;grid-row:1}

    /* Analitica. La grafica cruza el ancho porque son treinta barras; las tres
       cifras se reparten la fila de abajo a tercios iguales —son el mismo dato en
       tres ventanas y ninguna manda sobre otra—; y los platos, otra vez el ancho
       entero, que es una lista. */
    /* Precios, pantalla de elegir: UNA ficha a todo el ancho con los dos caminos
       dentro, y debajo la lista de lo que ya esta cambiado. En dos cajas separadas
       se leian como dos cosas distintas, y no lo son: llevan a la misma lista.

       Pantalla de revisar: una ficha por pestaña de la carta, apiladas. En dos
       columnas la rejilla igualaria alturas entre pestañas de 4 y de 60 platos. */
    /* Ofertas. Arriba las tres decisiones que caben de un vistazo, a dos columnas
       cada una; debajo lo que es lista: categorias y platos, a todo el ancho. */
    .adm-f-ooferta {grid-column:1 / span 6;grid-row:1}

    /* Agotados: el buscador arriba a todo el ancho y las categorias plegadas debajo. */
    .adm-f-agbuscar{grid-column:1 / span 6;grid-row:1}

    /* Destacados cabe en una sola ficha: lo puesto arriba y la fila de añadir debajo. */
    .adm-f-dest   {grid-column:1 / span 6;grid-row:1}
    .adm-f-osueltos{grid-column:1 / span 6;grid-row:2}
    /* Sin acordeón — cada categoría es su propia ficha del bento. Empezó a 2 de 6
       columnas (tres fichas por fila); el propietario pidió el mismo ancho completo
       que ya usa Precios a mano (.adm-f-ptab, arriba) — una categoría, una fila, con
       sus platos repartidos en dos columnas internas (ver .adm-cat-bento-lista). */
    .adm-cat-bento {grid-column:1 / span 6}

    .adm-f-pcambiar{grid-column:1 / span 6;grid-row:1}
    .adm-f-pfuera  {grid-column:1 / span 6;grid-row:2}
    .adm-f-prev,.adm-f-ptab{grid-column:1 / span 6}

    .adm-f-dt30   {grid-column:1 / span 6;grid-row:1}
    .adm-f-dthoy  {grid-column:1 / span 2;grid-row:2}
    .adm-f-dtsem  {grid-column:3 / span 2;grid-row:2}
    .adm-f-dtmes  {grid-column:5 / span 2;grid-row:2}
    .adm-f-dtplatos{grid-column:1 / span 6;grid-row:3}
  }
  /* El formulario ya no dibuja: solo guarda los campos que viajan. */
  .adm-form-suelto{display:contents}

  /* SocialCard V4: la ficha generica pasa a ser la tarjeta del prototipo — superficie
     (no el gris de --ficha), radio 16, borde de tarjeta y su sombra minima, relleno 16.
     Es la MISMA caja que ya usa el bento de Platos desde V3, asi que las dos pantallas
     dejan de tener dos tarjetas distintas. La usan tambien Publicidad, Juego, Marca y
     Ajustes: heredan la caja correcta desde ya, aunque su composicion interna siga
     pendiente de V5/V6. --r-sheet (21px) era un radio de la CARTA publica, no del panel. */
  .adm-f{
    background:var(--sc-surface);border:1px solid var(--sc-border);border-radius:var(--radius-card);
    box-shadow:var(--sc-sombra-card);
    padding:var(--space-4);min-width:0;margin:0;
    /* Al estirarse para igualar alturas, el contenido se queda arriba en vez de
       repartirse por la caja. */
    display:flex;flex-direction:column;align-items:stretch;
  }
  /* En 375 el titulo se recortaba a 33 px porque la insignia y el interruptor le
     comian la fila. Que envuelva: en estrecho la insignia baja a su linea. */
  .adm-f-cab{display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);flex-wrap:wrap}
  .adm-f-cab h2{flex:1 1 auto;min-width:0;white-space:normal}
  /* 36x36 con radio 10.4 e icono de 16: el cuadro de icono del prototipo. En gris
     neutro y NO en naranja — el naranja se guarda para accion y seleccion; el icono de
     una seccion es identificacion, no una llamada a pulsar (punto 7 del encargo). */
  .adm-f-ico{
    width:36px;height:36px;flex:none;border-radius:var(--radius-lg);background:var(--sc-muted-bg);
    color:var(--sc-text-2);display:grid;place-items:center;
  }
  /* El trazo se normaliza aqui y no rehaciendo 22 rutas: `stroke-width` en CSS gana a
     la presentacion del atributo, asi que los iconos de las fichas que todavia no han
     migrado (Publicidad, Juego, Marca, Ajustes) dejan de mezclar 1.6/1.75/2 desde ya.
     Sus RUTAS se cambiaran por las de Lucide cuando migre su pantalla. */
  .adm-f-ico svg{width:16px;height:16px;stroke-width:2}
  .adm-f-cab h2{
    margin:0;font-size:var(--t2);font-weight:600;
    letter-spacing:-.01em;color:var(--sc-text);min-width:0;
  }
  .adm-f-cab .der{margin-left:auto;display:flex;align-items:center;gap:var(--space-2);flex:none}
  .adm-f-nota{font-size:var(--t3);color:var(--muted);white-space:nowrap}
  .adm-f-txt{margin:0 0 var(--s2);font-size:var(--t3);line-height:1.5;color:var(--muted)}

  /* ---- estado ---- */
  /* SocialCard V4: la insignia del prototipo, medida — radio 8.4 (rounded-md),
     relleno 2/8, 12px peso 600, sin tracking y sin pastilla de 30px de alto. Los tres
     estados usan la pareja fondo+tinta de su color semantico, no un rojo decorativo. */
  .adm-estado{
    display:inline-flex;align-items:center;padding:2px var(--space-2);
    border-radius:var(--radius-md);
    font-size:var(--t4);font-weight:600;letter-spacing:0;
    font-variant-numeric:tabular-nums;
  }
  .adm-e-activo{background:var(--ok-fondo);color:var(--ok)}
  .adm-e-programado{background:var(--aviso-fondo);color:var(--aviso)}
  .adm-e-caducado{background:var(--chip);color:var(--muted)}
  .adm-e-incompleto{background:color-mix(in srgb, var(--ui-state-inactive) 10%, var(--sc-surface));color:var(--ui-state-inactive)}
  /* SocialCard V1: el fondo se deriva del propio estado en vez de repetir el rojo
     a mano — asi sigue al tema sin tener dos fuentes de verdad para el mismo color.
     V3: la mezcla va contra la SUPERFICIE y no contra transparente, y baja del 14 al
     10%. Con transparente, el tinte se sumaba a lo que hubiera debajo (la cabecera gris
     de la ficha) y el resultado medido era 4,30:1 con texto de 13 — por debajo del 4,5
     de WCAG AA. Contra la superficie el fondo es siempre el mismo y mide 5,25:1.
     No se ha tocado --ui-state-inactive: el token del prototipo se respeta, lo que
     estaba mal calculado era MI fondo derivado. */
  .adm-e-desactivado{background:color-mix(in srgb, var(--ui-state-inactive) 10%, var(--sc-surface));color:var(--ui-state-inactive)}

  /* ---- interruptor ---- */
  .adm-sw{display:flex;align-items:center;gap:11px;cursor:pointer;padding:var(--s1) 0 0}
  .adm-sw input{position:absolute;opacity:0;width:1px;height:1px;appearance:none}
  /* ======================================================= SocialCard V5: EL interruptor ==
   * UN componente, UNA geometria, para todo el panel. Antes convivian tres tamaños
   * distintos —54x30 en los maestros, 36x21 en las filas, 32x18 en el selector de tema—
   * heredados de rondas distintas. La jerarquia de una accion importante se consigue con
   * su sitio, su rotulo, su aire y su superficie; no agrandando el control.
   *
   *   pista  40 x 22      bola  18 x 18      holgura  2      recorrido  18
   *
   * El borde va como `inset box-shadow` y NO como `border`: un borde de verdad come de
   * los 22px de alto (box-sizing) y descuadra la holgura de 2; la sombra interior dibuja
   * el mismo filete sin tocar la geometria. Hace falta porque el gris apagado del
   * prototipo (--sc-input-border) mide 1,7:1 contra la tarjeta blanca: sin filete, el
   * control apagado no se ve. Con el, su contorno mide 5,7:1.
   */
  .adm-sw-pista{
    position:relative;width:40px;height:22px;flex:none;box-sizing:border-box;
    border:0;border-radius:var(--radius-pill);
    /* Sin filete: pedido expreso tras verlo en pantalla. El apagado se distingue por
       su propio gris y por la bola, no por un contorno. */
    background:var(--sc-input-border);
    transition:background 160ms var(--ease-out);
  }
  /* Area tactil de 44x44 centrada en la pista, sin ocupar sitio ni agrandar el dibujo.
     SocialCard V7: sólo con puntero grueso. El 44 es la medida del dedo y en un raton no
     compra nada —el interruptor va dentro de un <label> que ya se puede pulsar entero,
     rotulo incluido—, mientras que una zona invisible mas alta que la fila es justo lo que
     hace que se pulse el interruptor del plato de al lado.

     Medido antes de tocarlo, por si acaso: las filas de Platos van a 56-57 px de paso y la
     zona de 44 se queda en 22 arriba y 22 abajo, asi que NO habia solape ni con puntero
     fino. `elementFromPoint` en los cuatro bordes de la zona de tres interruptores
     contiguos devuelve siempre el MISMO interruptor. La regla se escribe para que no
     aparezca el dia que una fila baje de 44 px de alto, no para arreglar algo roto. */
  @media (pointer:coarse){
    .adm-sw-pista::before{
      content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;
      transform:translate(-50%,-50%);
    }
  }
  /* Con puntero fino la zona no pasa del dibujo: cero solape posible entre filas, sea cual
     sea su alto. Lo que hace grande el objetivo del raton es el <label>, no esto. */
  @media (pointer:fine){
    .adm-sw-pista::before{
      content:"";position:absolute;left:-2px;right:-2px;top:-2px;bottom:-2px;
    }
  }
  .adm-sw-bola{
    position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:var(--radius-pill);
    background:var(--sc-surface);
    transition:transform 160ms var(--ease-out);
  }
  .adm-sw:has(input:checked) .adm-sw-pista{background:var(--sc-primary)}
  .adm-sw:has(input:checked) .adm-sw-bola{transform:translateX(18px)}
  .adm-sw:has(input:focus-visible) .adm-sw-pista{outline:2px solid var(--sc-primary);outline-offset:2px}
  .adm-sw:has(input:disabled){cursor:default}
  .adm-sw:has(input:disabled) .adm-sw-pista{opacity:var(--ui-control-disabled-opacity)}
  .adm-sw-txt{font-size:var(--t2);font-weight:500;color:var(--sc-text)}

  /* ---- creatividad ---- */
  /* V5 — Publicidad. La vista previa es el RESULTADO y va separada de la configuracion:
     radio de tarjeta, sobre el gris apagado, y el estado vacio con filete discontinuo del
     borde del sistema en vez de un 1.5px propio. --r-chip era un radio de la carta. */
  .adm-previo,.adm-previo-vacio{
    width:100%;aspect-ratio:1120/480;border-radius:var(--radius-lg);display:block;object-fit:cover;
    background:var(--sc-muted-bg);
  }
  .adm-previo-vacio{
    border:1px dashed var(--sc-input-border);display:grid;place-items:center;gap:var(--space-2);
    color:var(--sc-text-2);font-size:var(--t3);text-align:center;
  }
  .adm-previo-vacio svg{width:24px;height:24px;stroke-width:2}

  .adm-img-acciones{display:flex;gap:var(--space-2);margin-top:var(--space-3);align-items:center}
  .adm-img-acciones > form{flex:1 1 0;min-width:0;margin:0;display:flex}
  .adm-btn{
    display:inline-flex;align-items:center;justify-content:center;gap:9px;
    /* V5: 40, la altura estandar del sistema. Convivian cuatro —40, 46, 52 y 54—
       repartidas entre pantallas por herencia de rondas distintas. La jerarquia de un
       boton la dan su color, su sitio y su aire, no su altura: el mismo argumento que
       unifico los interruptores en esta misma ronda. */
    flex:1 1 auto;min-width:0;min-height:40px;padding:0 var(--space-3);border-radius:var(--ui-radius-control);
    border:1px solid var(--sc-border);background:var(--sc-surface);color:var(--sc-text);
    font-size:var(--t2);font-weight:500;white-space:nowrap;
    cursor:pointer;text-decoration:none;
    transition:background var(--t-press) var(--ease-out),border-color var(--t-press) var(--ease-out),transform var(--t-press) var(--ease-out);
  }
  .adm-btn svg{width:16px;height:16px;flex:none;stroke-width:2}
  .adm-btn:hover{background:var(--sc-hover-bg);border-color:var(--sc-input-border)}
  .adm-btn:active{transform:scale(.98)}
  /* DS-2: STANDARD (46px) es .adm-btn tal cual; COMPACT (40px) es esta
     variante -- las dos unicas densidades del sistema, ya median esto antes
     de nombrarlas. Disabled: opacidad unica en vez de tocar color/fondo/borde
     uno a uno, para que los tres se apaguen juntos sin desentonar. */
  .adm-btn:disabled,.adm-pct:disabled,.adm-chip:disabled,.adm-campo:disabled{
    opacity:var(--ui-control-disabled-opacity);cursor:default;
  }
  .adm-btn-fino{flex:0 0 auto;min-height:40px;padding:0 14px;font-size:var(--t3)}
  .adm-btn-quitar{border-color:color-mix(in srgb, var(--ui-state-danger) 45%, transparent);color:var(--ui-state-danger);background:transparent}
  .adm-btn-quitar:hover{background:color-mix(in srgb, var(--ui-state-danger) 10%, transparent);border-color:var(--ui-state-danger)}
  .adm-btn-archivo:focus-within{outline:2.5px solid var(--accent);outline-offset:2px}
  /* Subiendo: el boton deja de invitar a pulsarlo y late despacio. */
  .adm-btn-archivo.esta-subiendo{
    pointer-events:none;color:var(--muted);
    animation:adm-latido 1.4s var(--ease-out) infinite;
  }
  @keyframes adm-latido{0%,100%{opacity:1}50%{opacity:.55}}
  @media (prefers-reduced-motion:reduce){ .adm-btn-archivo.esta-subiendo{animation:none} }
  .adm-subir{gap:10px;flex-wrap:wrap}
  .adm-subir input[type=file]{flex:1 1 100%;min-width:0;color:var(--muted);font-size:var(--t3)}
  .adm-crea-ancla{flex:0 0 auto;display:inline-flex;align-items:center}
  /* Los dos botones no caben en una columna de 305: "Reemplazar imagen" se
     recortaba a 102 px. Se apilan antes que romper la palabra. Va DESPUES de la
     regla base a proposito: con la misma especificidad manda el orden, y puesto
     antes no se aplicaba. */
  @media (max-width:560px){
    .adm-img-acciones{flex-wrap:wrap}
    .adm-img-acciones > form{flex:1 1 100%}
  }
  .adm-crea-medidas{margin:11px 2px 0;color:var(--muted)}
  .adm-crea-medidas strong{color:var(--ink)}
  /* Con JavaScript el campo y su boton desaparecen: manda la etiqueta. Sin padding
     ni borde, o el boton escondido sigue midiendo lo suyo y empuja la fila. */
  .adm-js .adm-subir{position:relative}
  .adm-js .adm-subir input[type=file],
  .adm-js .adm-subir-envio{
    position:absolute;width:1px;height:1px;min-height:0;padding:0;border:0;margin:0;
    opacity:0;pointer-events:none;overflow:hidden;
  }

  .adm-periodo{margin:var(--space-2) 0 0;font-size:var(--t3);color:var(--sc-text-2);line-height:1.45}
  .adm-periodo .cuando{display:block;font-size:var(--t2);font-weight:650;color:var(--ink)}
  .adm-periodo .dura{display:block}

  /* ---- duracion: fichas con icono, como la referencia ---- */
  .adm-cuando-pie{margin:0 0 var(--space-2);color:var(--sc-text-2);font-size:var(--t3)}
  .adm-atajos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3)}
  @media (max-width:900px){ .adm-atajos{grid-template-columns:repeat(2,minmax(0,1fr))} }
  @media (max-width:520px){ .adm-atajos{grid-template-columns:minmax(0,1fr)} }
  /* Los atajos de duracion son una seleccion: usan el lenguaje de seleccion del sistema
     —pastilla suave— en vez del naranja de la marca del restaurante. Bordes de 1px y
     radio de tarjeta; el icono a 16, como el resto del panel. */
  .adm-atajo{
    position:relative;display:grid;gap:3px;align-content:start;text-align:left;
    min-height:96px;padding:var(--space-3) var(--space-4);border-radius:var(--radius-lg);
    border:1px solid var(--sc-border);background:var(--sc-surface);color:var(--sc-text);
    transition:border-color var(--t-press) var(--ease-out),background var(--t-press) var(--ease-out),transform var(--t-press) var(--ease-out);
  }
  .adm-atajo:hover{border-color:var(--sc-input-border);background:var(--sc-muted-bg)}
  .adm-atajo:active{transform:scale(.99)}
  .adm-atajo .ico{display:block;color:var(--sc-text-2);margin-bottom:var(--space-2)}
  .adm-atajo .ico svg{width:16px;height:16px;stroke-width:2}
  .adm-atajo .t{font-size:var(--t2);font-weight:600;line-height:1.25}
  .adm-atajo .s{font-size:var(--t3);color:var(--sc-text-2);line-height:1.35}
  .adm-atajo .punto{
    position:absolute;top:var(--space-3);right:var(--space-4);width:14px;height:14px;
    border-radius:var(--radius-pill);
    border:1px solid var(--sc-input-border);transition:background var(--t-press) var(--ease-out),border-color var(--t-press) var(--ease-out);
  }
  .adm-atajo[aria-pressed="true"]{border-color:var(--sc-selected-text);background:var(--sc-selected-bg)}
  .adm-atajo[aria-pressed="true"] .t{color:var(--sc-selected-text)}
  .adm-atajo[aria-pressed="true"] .s{color:var(--sc-selected-text)}
  .adm-atajo[aria-pressed="true"] .ico{color:var(--sc-selected-text)}
  .adm-atajo[aria-pressed="true"] .punto{background:var(--sc-selected-text);border-color:var(--sc-selected-text)}

  /* ---- horas ---- */
  .adm-horas{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--s2)}
  .adm-horas label{
    display:block;font-size:var(--t3);font-weight:650;
    color:var(--muted);margin-bottom:8px;
  }
  .adm-hora-caja{position:relative;display:block}
  .adm-hora-caja svg{
    position:absolute;right:13px;top:50%;transform:translateY(-50%);
    width:19px;height:19px;color:var(--muted);pointer-events:none;
  }
  /* El campo va sobre el CANVAS, que es lo que mide el prototipo (#F2F4F7 sobre tarjeta
     blanca), no sobre el gris apagado ni sobre un blanco propio.
     V5: y mide 40 en TODO el panel. Convivian tres alturas de campo —40 en los buscadores
     migrados, 42 en los 293 precios de fila y 50 en el resto— que es exactamente la
     incoherencia que esta ronda cierra. 40 es la altura de campo medida en el prototipo. */
  .adm-campo,.adm-horas input[type=time]{
    width:100%;min-height:40px;padding:0 42px 0 14px;
    font-size:var(--t2);
    border:1px solid var(--sc-border);border-radius:var(--ui-radius-control);
    background:var(--sc-input-bg);color:var(--ink);
    transition:border-color var(--t-press) var(--ease-out),box-shadow var(--t-press) var(--ease-out);
  }
  /* V5: los overrides de altura de .adm-campo en Platos y Ofertas se retiran — la regla
     base ya mide 40 en todo el panel y repetirlo aqui era decir dos veces lo mismo. */
  .adm-campo{padding-right:14px}
  .adm-campo:focus-visible,.adm-horas input[type=time]:focus-visible{
    border-color:var(--sc-primary);box-shadow:0 0 0 3px var(--p-accent-glow);outline:none;
  }
  .adm-campo::placeholder{color:var(--sc-text-2)}
  .adm-horas input[type=time]::-webkit-calendar-picker-indicator{opacity:0;width:26px}

  /* ---- enlace ---- */
  .adm-check{display:flex;align-items:center;gap:var(--space-3);margin-top:var(--space-2);font-size:var(--t2)}
  /* El acento de una casilla es el del PANEL, no el del restaurante. */
  .adm-check input{width:18px;height:18px;flex:none;accent-color:var(--sc-primary)}

  /* ---- acciones ---- */
  /* ------------------------------------------------- las acciones, fuera de la caja
   * Centradas y debajo de la tarjeta. El fondo de la pagina las separa del
   * contenido sin necesidad de una linea ni de otra caja. */
  .adm-acciones-fuera{
    /* Vive FUERA de .card-main, asi que no hereda sus tokens: hay que darselos.
       SocialCard V1: mismos nombres, mismo sistema de temas que la tarjeta. */
    --ink:var(--sc-text); --p-fg:var(--ink); --muted:var(--sc-text-2); --surface:var(--sc-surface);
    --border:var(--sc-border); --chip:var(--sc-muted-bg); --hairline:var(--sc-border);
    /* --ok vivia solo en .adm-board, que esta DENTRO de la tarjeta. Aqui var(--ok) no
       resolvia, el fondo del boton de guardar se quedaba en transparente y el boton
       desaparecia contra el fondo de la pagina. Los tokens de la tira son suyos. */
    --ok:var(--sc-primary); --offer:var(--sc-bad-ink);
    --t2:14px; --t3:13px; --t4:12px;
    font-family:"Arimo",Arial,system-ui,sans-serif;
    color:var(--ink);

    display:none;                       /* la enseña el JavaScript segun la pestaña */
    align-items:center;justify-content:center;gap:var(--s2);flex-wrap:wrap;
    margin:var(--s3) auto 0;padding:0 var(--s2);
  }
  .adm-acciones-fuera[data-visible]{display:flex}
  .adm-acciones-estado{
    font-size:var(--t3);font-weight:600;letter-spacing:.05em;color:var(--sc-text-2);
    order:-1;flex-basis:100%;text-align:center;
  }
  /* .adm-btn-ver y .adm-btn-guardar nacieron dentro de una ficha, donde ocupar el
     ancho entero era lo correcto. Fuera de la caja son dos botones en una fila y ese
     width:100% los estiraba hasta el borde de la pagina. */
  .adm-acciones-fuera .adm-btn{flex:0 0 auto;width:auto;min-width:190px}
  /* Sin JavaScript se ven todas: feo, pero se puede guardar. */
  html:not(.adm-con-js) .adm-acciones-fuera{display:flex}

  .adm-f-acc{display:grid;gap:var(--s2);align-content:start}
  .adm-acciones{display:grid;gap:10px}
  .adm-acciones-txt{
    font-size:var(--t3);font-weight:700;letter-spacing:.05em;
    color:var(--muted);
  }
  .adm-btn-ver{width:100%}
  .adm-btn-guardar{
    /* SocialCard V4 — contraste. La tinta era --accent-ink (#121212), que se calcula
       para el naranja del RESTAURANTE; desde V1 el fondo de este boton es el primario de
       SocialCard, y esa pareja mal casada medía 3,62:1 con texto de 14 — por debajo del
       4,5 de WCAG AA, en las siete pantallas. La pareja correcta del sistema es
       primary + primary-ink, que es la que usa el prototipo: 5,9:1.
       No se ha tocado ningun token del prototipo; estaban mal emparejados. */
    width:100%;min-height:40px;background:var(--ok);border-color:var(--ok);color:var(--sc-primary-ink);
    font-weight:700;font-size:var(--t2);
  }
  .adm-btn-guardar:hover{background:color-mix(in srgb, var(--sc-primary) 88%, #FFF);border-color:color-mix(in srgb, var(--sc-primary) 88%, #FFF)}

  /* Con JavaScript los controles nativos se esconden; sin el, mandan ellos. */
  .adm-js .adm-nativo{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .adm-nativo{margin:0 0 var(--s2);font-size:var(--t3);color:var(--muted)}
  /* V7: 40 y el radio del sistema, como cualquier campo. Sólo lo ve quien navega sin
     JavaScript, pero es una pantalla del panel y no otra cosa. Antes: 48 y radio 12. */
  .adm-nativo input{
    width:100%;min-height:40px;padding:0 12px;margin-top:6px;
    border:1px solid var(--sc-border);border-radius:var(--ui-radius-control);
    background:var(--sc-input-bg);color:var(--sc-text);
  }

  /* ---- calendario ---- */
  .adm-cal-caja{margin-top:var(--s3)}
  .adm-cal{border:1px solid var(--hairline);border-radius:var(--r-chip);padding:var(--s2);background:color-mix(in srgb, var(--sc-text) 3%, transparent)}
  /* minmax(0,1fr) y no 1fr: por defecto un item de rejilla no encoge por debajo de su
     contenido, y los dos meses sacaban scroll horizontal a toda la pagina. */
  .adm-cal-meses{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s2)}
  .adm-cal-mes{min-width:0}
  @media (max-width:760px){ .adm-cal-meses{grid-template-columns:minmax(0,1fr)} .adm-cal-mes:last-child{display:none} }
  /* Una cabecera para los DOS meses, con las flechas en los extremos. Antes cada
     mes llevaba la suya y el segundo tenia dos huecos vacios donde el primero
     tenia botones: la fila quedaba coja. */
  .adm-cal-cab{display:flex;align-items:center;gap:var(--s2);padding:2px 2px var(--s2)}
  .adm-cal-rango{
    flex:1;text-align:center;font-size:var(--t2);font-weight:650;
    text-transform:capitalize;letter-spacing:-.005em;
  }
  .adm-cal-rango .ano{color:var(--muted);font-weight:500}
  .adm-cal-mes-rot{
    text-align:center;padding-bottom:9px;
    font-size:var(--t3);font-weight:650;text-transform:capitalize;color:var(--muted);
  }
  .adm-cal-nav{
    width:44px;height:44px;border-radius:12px;border:1px solid var(--border);background:transparent;
    color:var(--ink);display:grid;place-items:center;cursor:pointer;flex:none;
    transition:background var(--t-press) var(--ease-out),border-color var(--t-press) var(--ease-out),transform var(--t-press) var(--ease-out);
  }
  .adm-cal-nav svg{width:20px;height:20px}
  .adm-cal-nav:hover{background:var(--chip);border-color:var(--muted)}
  .adm-cal-nav:active{transform:scale(.96)}

  /* Quitar las fechas: enlace, no ficha. */
  .adm-quitar-fechas{
    grid-column:1 / -1;margin:var(--s1) 2px 0;display:flex;gap:7px;flex-wrap:wrap;align-items:baseline;
    font-size:var(--t3);color:var(--muted);
  }
  .adm-quitar-fechas button{
    border:0;background:transparent;padding:0;cursor:pointer;
    font-size:var(--t3);font-weight:600;color:var(--ink);
    text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;
  }
  .adm-quitar-fechas button:hover{color:var(--p-accent-stroke)}
  .adm-cal-rejilla{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}
  .adm-cal-dow{height:28px;display:grid;place-items:center;font-size:var(--t3);font-weight:650;color:var(--muted)}
  .adm-cal-d{
    /* 44 de alto: el objetivo tactil minimo. En siete columnas el ancho sobra. */
    position:relative;height:44px;border:0;background:transparent;border-radius:10px;color:var(--ink);
    font-size:var(--t2);font-weight:500;font-variant-numeric:tabular-nums;
    cursor:pointer;transition:background var(--t-press) var(--ease-out),color var(--t-press) var(--ease-out);
  }
  .adm-cal-d:hover{background:var(--chip)}
  .adm-cal-d.fuera{visibility:hidden}
  .adm-cal-d.hoy::after{content:"";position:absolute;left:50%;bottom:5px;transform:translateX(-50%);width:5px;height:5px;border-radius:999px;background:var(--accent)}
  .adm-cal-d.dentro{background:color-mix(in srgb, var(--accent) 18%, var(--surface));border-radius:0}
  .adm-cal-d.extremo{background:var(--ok);color:var(--sc-primary-ink);font-weight:700}
  .adm-cal-d.ini{border-radius:10px 0 0 10px}
  .adm-cal-d.fin{border-radius:0 10px 10px 0}
  .adm-cal-d.ini.fin{border-radius:10px}
  .adm-cal-pie{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 2px 0;margin-top:9px;border-top:1px solid var(--hairline)}
  .adm-cal-pie .lee{margin-right:auto;font-size:var(--t3);color:var(--muted)}

  /* ---- la ayuda del pane ---- */
  /* Redondo de verdad —mismo alto que ancho— y con la "i" de informacion dentro. */
  .adm-ayuda-b{
    position:relative;width:26px;height:26px;min-width:26px;min-height:26px;
    flex:none;padding:0;vertical-align:middle;margin-left:7px;
    border:1px solid var(--border);border-radius:50%;background:transparent;color:var(--muted);
    display:inline-grid;place-items:center;cursor:pointer;line-height:0;
    transition:background var(--t-press) var(--ease-out),color var(--t-press) var(--ease-out),border-color var(--t-press) var(--ease-out);
  }
  .adm-ayuda-b svg{width:15px;height:15px}
  .adm-ayuda-b::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}
  .adm-ayuda-b:hover,.adm-ayuda-b[aria-expanded="true"]{background:var(--ink);border-color:var(--ink);color:var(--sc-surface)}
  #adm-ayudas{position:fixed;inset:0;pointer-events:none;z-index:1200}
  .adm-globo{
    position:absolute;max-width:330px;pointer-events:auto;background:var(--sc-surface);color:var(--sc-text);
    border:1px solid var(--sc-border);
    border-radius:var(--radius-lg);padding:14px 17px;
    font-size:var(--t3);line-height:1.5;
    box-shadow:0 16px 44px -16px rgba(0,0,0,.8);
    animation:adm-globo-in 150ms var(--ease-out) forwards;
  }
  .adm-globo b{display:block;font-size:var(--t3);font-weight:700;margin-bottom:4px}
  @keyframes adm-globo-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  .adm-js .hint[data-adm-ayuda]{display:none}

  /* ====================================================================== precios, en bento
   * Dos pantallas con las mismas piezas: los atajos de porcentaje, y la fila de precio, que
   * se usa igual para la lista editable y para la de solo lectura.
   * ======================================================================================= */

  /* ---- la banda de opciones de Precios ----
     Cuatro porcentajes, uno que se escribe y "a mano", todas del mismo alto y en la misma
     fila. Es una sola pregunta —cuanto— y se contesta en un sitio. */
  .adm-pcambiar-guia{margin:0 0 var(--s3)}
  .adm-banda{display:flex;flex-wrap:wrap;gap:9px;align-items:stretch}
  .adm-pct{
    /* No crece: con 4 botones + porcentaje libre + "Cambiar precio manual" repartiéndose la fila con
       flex:1, cada uno se estiraba a ~180-300px según el viewport — mucho más ancho de
       lo que pide "+15%". Se quedan en su ancho de contenido y el hueco que sueltan se
       lo lleva "Cambiar precio manual" (ver .adm-ajustar-precios-mano), que así se lee como un botón de
       verdad y no como una miniatura al lado de cuatro losetas. */
    /* SocialCard V4: 40 de alto, como el campo del porcentaje libre que tiene al lado
       — al bajar ese a los 40 medidos del prototipo, dejar estos en 54 partia la fila en
       dos alturas. Peso 600, no 700: el 700 era del sistema anterior. */
    flex:0 0 auto;min-width:72px;min-height:40px;padding:0 var(--space-3);
    border:1px solid var(--sc-border);border-radius:var(--ui-radius-control);
    background:var(--sc-surface);color:var(--sc-text);
    font-family:inherit;font-size:var(--t2);font-weight:600;font-variant-numeric:tabular-nums;
    cursor:pointer;
    transition:background var(--t-press) var(--ease-out),border-color var(--t-press) var(--ease-out),transform var(--t-press) var(--ease-out);
  }
  .adm-pct:hover{background:var(--sc-hover-bg);border-color:var(--sc-input-border)}
  .adm-pct:active{transform:scale(.98)}

  /* El porcentaje libre es una opcion mas: mismo alto, mismo borde y mismo radio que los
     cuatro de al lado, con el campo dentro y sin borde propio. El foco lo pinta la caja
     entera, no el campo, o se verian dos marcos uno dentro de otro. */
  /* SocialCard V4: la caja del porcentaje es un CAMPO, y como tal usa la geometria de
     campo medida en el prototipo — 40 de alto, radio 14.4, fondo canvas y borde de
     tarjeta. Antes eran 54 y fondo gris, que la hacia parecer un boton. */
  .adm-pct-otro{
    flex:0 1 210px;display:flex;align-items:center;gap:1px;
    min-width:0;                       /* o no baja de su contenido minimo */
    min-height:40px;margin:0;padding:0 6px 0 12px;
    border:1px solid var(--sc-border);border-radius:var(--ui-radius-control);background:var(--sc-input-bg);
    transition:border-color var(--t-press) var(--ease-out),box-shadow var(--t-press) var(--ease-out);
  }
  .adm-pct-otro:focus-within{border-color:var(--sc-primary);box-shadow:0 0 0 3px var(--p-accent-glow)}
  .adm-pct-mas,.adm-pct-pc{color:var(--sc-text-2);font-size:var(--t2);font-weight:600;flex:none}
  .adm-pct-pc{margin-right:6px}
  .adm-pct-num{
    flex:1 1 0;min-width:0;padding:0 1px;
    border:0;background:transparent;color:var(--sc-text);
    font-family:inherit;font-size:var(--t2);font-weight:600;font-variant-numeric:tabular-nums;
  }
  .adm-pct-num:focus{outline:none}
  .adm-pct-num::placeholder{color:var(--sc-text-2);font-weight:400}
  /* 32x32 con radio 8.4 e icono de 16: el boton de icono compacto del prototipo.
     min-height:0 es OBLIGATORIO — el reset general pone min-height:48px a todo <button>
     y sin esto sale de 32x48. Es la tercera vez que aparece esta trampa en el panel
     (.adm-foto-b en DS-2, .adm-tema-sw en V2): cualquier boton por debajo de 48 la
     necesita. */
  .adm-pct-ir{
    flex:none;width:32px;height:32px;min-height:0;padding:0;border:0;border-radius:var(--radius-md);
    background:var(--sc-surface);color:var(--sc-text-2);
    display:grid;place-items:center;cursor:pointer;
    transition:background var(--t-press) var(--ease-out),color var(--t-press) var(--ease-out);
  }
  .adm-pct-ir svg{width:16px;height:16px}
  .adm-pct-ir:hover{background:var(--sc-primary);color:var(--sc-primary-ink)}

  /* "Cambiar precio manual" no sube nada: es la unica que no es un porcentaje, asi que no se pinta como
     uno. Antes era un botón .adm-pct mas (54px, chip lleno) — un quinto botón del mismo
     peso que +3/+5/+10/+15%, cuando la pregunta de "cuánto subir" ya la contestan esos
     cuatro y el campo libre. "Cambiar precio manual" es una puerta a OTRA pantalla (la revisión plato a
     plato), no una opción más de la misma pregunta: por eso pasa a .adm-btn/.adm-btn-fino,
     el botón estándar del panel (40px), y se separa del grupo de porcentajes empujado al
     final de la fila. Menos botones leyéndose como iguales. */
  .adm-ajustar-precios-mano{
    /* Mismo alto que el bloque de porcentajes (54px, no los 40px de .adm-btn-fino) y el
       doble de ancho de antes: al quitarle a los .adm-pct el crecimiento que no
       necesitaban, este es quien se queda el hueco — más presencia de botón, no una
       tira delgada perdida al final de cuatro losetas grandes. */
    /* V5: 40, como todos. Los 54 se pusieron para igualar el alto de los .adm-pct de al
       lado; esos bajaron a 40 en V4, asi que este ya era el unico boton del panel con
       altura propia. Sigue teniendo mas presencia que sus vecinos por ancho, no por alto. */
    flex:0 0 auto;min-width:212px;min-height:40px;margin-left:auto;font-size:var(--t2);
  }
  .adm-ajustar-precios-mano svg{color:var(--sc-primary)}
  @media (max-width:699px){
    /* Al envolver, el campo del porcentaje libre y "a mano" ocupan su linea entera: en
       media fila se leerian como sobras de la de arriba. */
    .adm-pct-otro{flex:1 1 100%}
    .adm-ajustar-precios-mano{flex:1 1 100%;margin-left:0}
  }

  /* ---- la fila de precio ----
     Numero, nombre, lo que vale ahora y lo que va a valer. El precio de ahora va apagado y
     el nuevo destacado: se lee «de esto, a esto», que es la pregunta. */
  .adm-precios{display:block;margin:0 0 var(--s2)}
  .adm-prow{
    display:flex;align-items:center;gap:var(--space-3);
    padding:var(--space-2) var(--space-1);border-top:1px solid var(--sc-border);
  }
  .adm-prow:first-child{border-top:0}
  .adm-prow-n{
    flex:0 0 auto;min-width:2.6em;
    color:var(--sc-text-2);font-size:var(--t3);font-weight:500;font-variant-numeric:tabular-nums;
  }
  .adm-prow-nm{flex:1 1 auto;min-width:0;font-size:var(--t2);font-weight:600;line-height:1.5}
  .adm-prow-viejo{
    flex:0 0 auto;color:var(--muted);font-size:var(--t3);
    font-variant-numeric:tabular-nums;white-space:nowrap;
  }
  .adm-prow-fijo{
    flex:0 0 auto;font-size:var(--t2);font-weight:600;color:var(--sc-text);
    font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;
  }
  .adm-prow-nuevo{
    flex:0 0 92px;min-height:40px;padding:0 10px;text-align:right;
    font-variant-numeric:tabular-nums;
  }
  .adm-prow[hidden]{display:none}

  /* ---- el buscador de la lista ----
     312 platos. Sin esto, cambiar uno a mano es una busqueda a ojo por trece bloques. */
  .adm-buscar{position:relative;display:block}
  /* La lupa a 16, el tamaño de icono del prototipo. */
  .adm-buscar svg{
    position:absolute;left:12px;top:50%;transform:translateY(-50%);
    width:16px;height:16px;color:var(--sc-text-2);pointer-events:none;
  }
  .adm-buscar .adm-campo{padding-left:40px}
  .adm-buscar input[type=search]::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
  .adm-filtro-cuenta{margin:9px 2px 0}

  /* ======================================================================= ofertas, en bento
   * Tres piezas nuevas: los siete dias, las categorias y la fila de plato con casilla. Las
   * tres son la misma idea —una pastilla que se marca— con tres tamaños distintos.
   * ======================================================================================= */

  /* ---- los dias ----
     Siete circulos con la inicial: una semana entera cabe de un vistazo y cada uno es un
     blanco de 46 px, que es lo que mide un dedo. Al final, "Semanal", que los enciende los
     siete de una vez: la oferta de todos los dias es la mitad de los casos y no tiene por
     que costar siete toques. Sólo enciende — nunca apaga (cierre funcional MISE-B: una
     oferta necesita al menos un día, así que "Semanal" no puede ser un interruptor que
     los quite todos). */
  /* SocialCard V4 — los siete dias.
     El prototipo NO tiene selector de dias, asi que no hay medida que copiar: se
     construyen con el sistema de seleccion ya aprobado y medido, el del chip y el del
     item de navegacion. 36x36 con radio 10.4 (no circulos de 46), y los tres estados
     del sistema: reposo apagado, hover gris, elegido en la pastilla suave.
     Elegido NO es naranja solido: con los siete dias puestos —el caso normal— serian
     siete bloques naranjas seguidos, que es exactamente el "si todo es naranja nada
     destaca" del punto 7. La pastilla suave es la misma que marca el destino activo
     del sidebar. */
  .adm-dias{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center}
  .adm-dia{
    flex:none;position:relative;width:36px;height:36px;
    display:grid;place-items:center;
    border:0;border-radius:var(--radius-lg);background:var(--sc-muted-bg);
    color:var(--sc-text-2);font-size:var(--t3);font-weight:600;cursor:pointer;
    transition:background var(--t-press) var(--ease-out),color var(--t-press) var(--ease-out);
  }
  /* Se dibuja a 36 pero se toca a 44: la casilla de un dia se pulsa con el pulgar. */
  .adm-dia::before{
    content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;
    transform:translate(-50%,-50%);
  }
  .adm-dia input{position:absolute;opacity:0;width:1px;height:1px}
  .adm-dia:hover{background:var(--sc-hover-bg);color:var(--sc-text-medio)}
  .adm-dia:has(input:checked){background:var(--sc-selected-bg);color:var(--sc-selected-text);font-weight:600}
  .adm-dia:has(input:focus-visible){outline:2.5px solid var(--sc-primary);outline-offset:2px}
  /* "Semanal" es un boton compacto del sistema, no una pastilla aparte. */
  .adm-dia-semanal{
    flex:none;margin-left:var(--space-1);min-height:36px;padding:0 var(--space-3);
    border:0;border-radius:var(--radius-lg);background:transparent;color:var(--sc-text-2);
    font-family:inherit;font-size:var(--t3);font-weight:500;cursor:pointer;white-space:nowrap;
    transition:background var(--t-press) var(--ease-out),color var(--t-press) var(--ease-out);
  }
  .adm-dia-semanal:hover{background:var(--sc-muted-bg);color:var(--sc-text-medio)}
  .adm-dia-semanal[aria-pressed="true"]{background:var(--sc-muted-bg);color:var(--sc-text-medio);font-weight:600}

  /* El interruptor "Todos" (categoría entera en la oferta) se quitó de la cabecera de la
     ficha por orden expresa del propietario — "esto nunca va a pasar" en su negocio. Se
     retira toda su CSS (`.adm-sw-cat*`, confirmado sin más usos por grep). El handler
     `oferta_cat_toggle` y el campo `cats` de `estado.json` se dejan tal cual: no rompen
     nada estando inertes, y tocar el contrato del backend no era parte del encargo — sólo
     el control de la interfaz. */
  /* V5: sin medidas propias — el interruptor unico. */
  .adm-sw.adm-sw-oferta{padding:0;gap:0;flex:none;margin-left:auto}
  /* Sin opacity propia: la fila entera ya se atenúa con .por-categoria (0.5) — repetirlo
     aquí encima sólo apagaba el interruptor más de la cuenta (0.5 x 0.6, casi invisible).
     Con "Todos" retirado, .por-categoria ya no lo dispara nadie desde la interfaz, pero se
     deja tal cual por lo mismo de arriba: no estorba estando inerte. */
  .adm-sw.adm-sw-oferta:has(input:disabled){cursor:default}

  /* ---- la fila de plato, con interruptor ----
     La fila NO es la etiqueta (a diferencia de la versión con casilla/tick de antes): el
     interruptor de más abajo es su propio control, al final de la fila, como en Platos. */
  /* Sin border-radius: con esquinas redondeadas, el border-bottom se curva justo en ellas
     y una línea recta se ve como el filo de un óvalo — el mismo fallo que ya se corrigió
     en el separador de categoría (MISE-B, octava ronda), aquí sobre cada fila de plato. El
     resalte al pasar el ratón se queda cuadrado, como una fila de tabla. Este fix se
     conserva en la auditoría correctiva: no es parte del interruptor de oferta revertido. */
  .adm-ofertas{display:block}
  /* SocialCard V3: separador ARRIBA y no abajo, y la primera fila sin el — es el
     patron del prototipo (border-t + first:border-t-0), y evita el filete suelto que
     dejaba la ultima fila contra el borde de la ficha. Relleno horizontal 16, como el
     de su cabecera, para que nombre y titulo de categoria queden a plomo. */
  .adm-orow{
    display:flex;align-items:center;gap:var(--space-3);
    /* Un solo ritmo de fila en todo el producto. El relleno y el filete ya eran los
       mismos en Platos y en Ofertas; lo que las separaba era el CONTENIDO — la fila de
       Platos la estira su campo de precio de 40 (56 en total) y la de Ofertas se quedaba
       en 38 con solo un interruptor de 22. Con el minimo, las dos respiran igual. */
    min-height:56px;
    padding:var(--space-2) var(--space-4);border-top:1px solid var(--sc-border);
    cursor:pointer;
  }
  .adm-orow:first-child{border-top:0}
  .adm-orow[hidden]{display:none}
  /* appearance:none, además de opacity:0: a 1x1px la casilla nativa no debía verse, pero
     el control seguía "vivo" para el navegador (appearance:auto) — reportado un marcado
     rojo junto a la fila, con ratón encima, que ninguno de los elementos propios de la
     fila explica (auditado el HTML de una fila marcada: ni rastro). Apagar el widget
     nativo del todo es lo correcto de todas formas para una casilla que ya se sustituye
     entera por su propio control visual (el interruptor de Ofertas, la cámara/precio de
     Platos) — no depende de acertar la causa exacta para ser la regla correcta aquí. */
  .adm-orow input{position:absolute;opacity:0;width:1px;height:1px;appearance:none}
  /* Bloque y no flex en columna: como flex, el <small> era un item que no bajaba de su
     contenido minimo y se recortaba en estrecho —«Especialidades · Mango C…»—. En bloque
     envuelve solo, que es lo que hace el texto desde siempre. */
  /* Nombre 14/600 y apunte 13/400 apagado: la pareja del prototipo. */
  .adm-orow-nm{flex:1 1 auto;min-width:0;font-size:var(--t2);font-weight:600;line-height:1.5;display:block}
  .adm-orow-nm small{
    display:block;margin-top:2px;
    font-size:var(--t3);color:var(--sc-text-2);font-weight:400;line-height:1.5;
  }
  /* Ya dentro por su categoria, o sin precio que rebajar: se ven, pero no se tocan. */
  .adm-orow.por-categoria{opacity:.5;cursor:default}
  /* Una vez marcado no hace falta reaccionar al ratón: la casilla naranja ya lo dice
     todo. Antes el hover aclaraba el fondo (--marca-velo-mas); ahora se queda exactamente
     igual en reposo y con el ratón encima — nada que "parpadee" sobre una fila ya
     marcada. */
  /* SocialCard V6, tras revisión del propietario: se retira TAMBIÉN el velo de la fila en
     oferta. En la ronda anterior cayeron el de agotada y el de destacada y este se quedó;
     como la clase es la misma en las dos pantallas, el tinte de Ofertas se arrastraba a
     Platos y volvía a pintar allí el fondo que se había quitado. Lo que dice que una fila
     está en oferta es su indicador —el círculo con el filete de oferta— en Platos, y la
     casilla marcada en Ofertas. El fondo no añadía nada y competía con los otros dos
     estados. Se deja la regla vacía a propósito: es donde vivía y donde se buscará. */
  .adm-orow.es-oferta{background:transparent}

  /* El descuento usa la misma casilla del porcentaje libre de Precios, sin la flecha.
     OJO: la ficha es un flex en COLUMNA, asi que un flex-basis aqui mide el alto y no el
     ancho; la casilla se estiraba a 140 px de alto. Se le da ancho y se le quita el flex. */
  .adm-dto{flex:none;width:100%;max-width:150px}

  /* ---- la fila de agotado ----
     Misma fila que la de ofertas, con la camara al final en vez del precio. Marcado NO se
     pinta con el acento: un agotado no es un logro, es una baja. Se tacha, como en la carta,
     y se apaga. */
  /* Sin fondo: el nombre tachado en rojo y el interruptor encendido ya lo dicen, y
     teñir la fila entera competia con la etiqueta de destacado. */
  .adm-orow.es-agotado .adm-orow-nm{color:var(--ui-state-depleted);text-decoration:line-through;text-decoration-thickness:1px}
  .adm-orow.es-agotado .adm-prow-n{color:var(--ui-state-depleted);opacity:.75}
  .adm-ag-resumen{margin-top:var(--s2)}

  /* ---- destacados ----
     La fila de añadir cierra la ficha, debajo de un filete: primero lo que hay puesto,
     despues lo que se hace con ello. */
  .adm-dest-add{
    display:flex;flex-wrap:wrap;gap:var(--s2) var(--s3);align-items:flex-end;
    margin:var(--s3) 0 0;padding-top:var(--s3);border-top:1px solid var(--hairline);
  }
  .adm-dest-plato{flex:1 1 280px;min-width:0}
  .adm-dest-et{flex:0 1 210px;min-width:0}
  .adm-dest-btn{min-height:50px;flex:0 0 auto}
  .adm-tag{
    flex:none;padding:4px 10px;border-radius:var(--radius-pill);
    background:var(--marca-velo-mas);color:var(--ink);
    font-size:var(--t3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;
    white-space:nowrap;
  }

  /* ---- el indicador de oferta de la fila de Platos ----
     SocialCard V6, tras revisión. `.adm-tag` está declarada AQUÍ, después de
     `.adm-tag-oferta` (mucho más arriba) y con la misma especificidad: su relleno gris
     ganaba al `transparent` de aquella, y el indicador salía como una mancha gris en vez
     del círculo con el filete de oferta. Es la sexta vez que aparece la misma trampa en
     esta migración —regla genérica declarada después que la específica— y se paga igual:
     subiendo el selector, no reordenando el fichero.

     Medido: el badge de destacado mide 22 de alto. El indicador se le iguala —22x22— para
     que las dos piezas de la fila se lean a la misma altura. */
  .adm-plato-acciones .adm-tag.adm-tag-oferta,
  .adm-cat-bento-lista .adm-tag.adm-tag-oferta{
    width:22px;height:22px;padding:0;flex:none;
    display:inline-flex;align-items:center;justify-content:center;
    border-radius:var(--radius-pill);
    background:transparent;color:var(--ui-badge-promo);
    /* 70% y no el 45% de antes: medido, el filete al 45% daba 2,23:1 contra la tarjeta y
       WCAG 1.4.11 pide 3 para el contorno de un control. El icono de dentro ya iba a
       6,15:1, así que el círculo se veía "flojo" sin estarlo del todo — ahora las dos
       partes pasan. */
    border:1px solid color-mix(in srgb,var(--ui-badge-promo) 70%,transparent);
  }
  .adm-plato-acciones .adm-tag.adm-tag-oferta svg,
  .adm-cat-bento-lista .adm-tag.adm-tag-oferta svg{width:13px;height:13px}
  .adm-plato-acciones .adm-tag.adm-tag-oferta:hover,
  .adm-cat-bento-lista .adm-tag.adm-tag-oferta:hover{background:color-mix(in srgb,var(--ui-badge-promo) 14%,transparent)}

  /* ---- la fila de la lista de destacar ----
     Es un boton de verdad, no una fila con un boton dentro: se toca en cualquier sitio y
     eso es lo que se hace con ella. */
  .adm-destrow{width:100%;text-align:left;font-family:inherit;color:inherit}
  button.adm-destrow{border:0;background:transparent;cursor:pointer}
  button.adm-destrow:hover{background:var(--chip)}
  button.adm-destrow:focus-visible{outline:2.5px solid var(--accent);outline-offset:-2px;border-radius:11px}
  .adm-destpick-ir{
    flex:none;margin-left:auto;padding:5px 12px;border-radius:999px;
    border:1px solid var(--border);color:var(--muted);
    font-size:var(--t3);font-weight:600;
  }
  button.adm-destrow:hover .adm-destpick-ir{border-color:var(--marca-borde);color:var(--ink)}
  /* Elegido: se queda marcado hasta que se añade, para no perder de vista cual se toco. */
  .adm-destpick.es-elegido{background:var(--marca-velo-mas)}
  .adm-destpick.es-elegido .adm-destpick-ir{background:var(--marca-fondo);border-color:var(--marca-fondo);color:var(--marca-ink)}
  /* El destacado ya NO tiñe la fila entera. Lo dice su etiqueta, que para eso pasa a la
     pastilla de seleccion: un velo gris sobre toda la fila competia con el agotado y con
     la oferta —que si necesitan marcar la fila— y ademas se confundia con el hover. */

  /* ---- las etiquetas, debajo del plato tocado ----
     Sangradas hasta donde empieza el nombre, para que se lea como algo que cuelga de esa
     fila y no como otra fila mas de la lista. */
  .adm-destet{
    display:flex;flex-wrap:wrap;align-items:center;gap:8px;
    margin:0 0 8px;padding:11px 12px 12px 46px;
    border-radius:0 0 11px 11px;background:var(--marca-velo-mas);
  }
  .adm-destet[hidden]{display:none}
  .adm-destet-rot{
    flex:0 0 100%;margin-bottom:2px;
    font-size:var(--t3);font-weight:600;color:var(--muted);
  }
  .adm-destet-b{
    min-height:40px;padding:0 15px;border-radius:999px;
    border:1px solid var(--marca-borde);background:transparent;color:var(--ink);
    font-family:inherit;font-size:var(--t3);font-weight:700;cursor:pointer;
    transition:background var(--t-press) var(--ease-out),color var(--t-press) var(--ease-out);
  }
  .adm-destet-b:hover{background:var(--marca-fondo);color:var(--marca-ink)}
  .adm-destet-b:focus-visible{outline:2.5px solid var(--accent);outline-offset:2px}
  .adm-destet-x{
    min-height:40px;padding:0 13px;margin-left:auto;
    border:0;background:transparent;color:var(--muted);
    font-family:inherit;font-size:var(--t3);font-weight:600;cursor:pointer;
  }
  .adm-destet-x:hover{color:var(--ink)}
  /* La fila abierta se queda pegada a sus etiquetas: sin esquina redonda abajo. */
  .adm-destpick.es-elegido{border-radius:11px 11px 0 0}

  /* El buscador de plato traia fondo blanco escrito a mano y la tipografia de la carta. */
  .adm-f .combo{margin:0;position:relative}
  .adm-f .combo-q{
    min-height:50px;padding:0 14px;border-radius:12px;
    border:1px solid var(--border);background:var(--chip);color:var(--ink);
    box-shadow:none;font-family:inherit;font-size:var(--t2);
  }
  .adm-f .combo-q:focus-visible{border-color:var(--p-accent-stroke);box-shadow:0 0 0 3px var(--p-accent-glow);outline:none}
  .adm-f .combo-q.is-ok{font-family:inherit;font-weight:700;border-color:var(--p-accent-stroke)}
  .adm-f .combo-lista{background:var(--ficha);border-color:var(--border);box-shadow:0 16px 44px -16px rgba(0,0,0,.8)}
  .adm-f .combo-op.is-activo,.adm-f .combo-op:hover{background:var(--surface)}
  .adm-f .combo-num,.adm-f .combo-txt,.adm-f .combo-txt small,.adm-f .combo-vacio{font-family:inherit}
  .adm-f .combo-txt{font-size:var(--t2)}
  .adm-f .combo-num,.adm-f .combo-txt small,.adm-f .combo-vacio{font-size:var(--t3)}
  /* En estrecho el nombre del plato se quedaba en 84 px y "Especialidades" mide 92: una
     palabra que no cabe no se parte sola, se sale. La fila envuelve y el precio baja a su
     linea, con lo que el nombre se lleva el ancho entero. Y por si aun asi aparece una
     palabra imposible, que se parta antes que salirse. */
  .adm-orow-nm,.adm-orow-nm small{overflow-wrap:anywhere}
  @media (max-width:699px){
    .adm-orow{flex-wrap:wrap;row-gap:4px}
    .adm-orow-nm{flex:1 1 calc(100% - 5.6em)}
    .adm-orow .adm-prow-fijo{margin-left:auto}
  }
  /* Estado, descuento y las dos horas en una fila: se lee de izquierda a derecha como se
     dice —«encendida, un 25%, de 17:00 a 19:00»—. El interruptor lleva rotulo como los
     otros tres, o seria el unico control sin nombre de la fila. */
  /* ---- la regla de la oferta ----
     Los cuatro datos en una fila y en el orden en que se dicen: cuanto, cuando (horas),
     cuando (dias) y, al final, encendida o no. Encender es lo ultimo que se hace.
     Los dias se llevan el hueco que sobre; el interruptor se va al borde derecho. */
  .adm-regla{display:flex;flex-wrap:wrap;gap:var(--space-4);align-items:flex-start;margin-bottom:var(--space-2)}
  .adm-regla-g{display:flex;flex-direction:column;min-width:0}
  .adm-regla-g .adm-lbl{margin-top:0}
  .adm-regla-dias{flex:1 1 auto}
  .adm-sw-alto{min-height:40px;padding:0}
  /* SocialCard V4: el interruptor maestro, ya fuera del plegado. Una fila propia
     inmediatamente debajo del titulo: rotulo a la izquierda, interruptor y su palabra a
     la derecha — el mismo patron "etiqueta + switch" que usa la fila de plato del
     prototipo. Sobre el gris apagado para que se lea como el control principal de la
     ficha y no como un ajuste mas. */
  .adm-oferta-maestro{
    display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);
    min-height:56px;margin:0 0 var(--space-3);padding:0 var(--space-3);
    background:var(--sc-muted-bg);border-radius:var(--radius-lg);
  }
  .adm-oferta-maestro .adm-lbl{margin:0;flex:none}
  .adm-oferta-maestro .adm-sw{flex:none;padding:0}
  /* Las dos horas son UN dato. Con la flecha en medio se leen como un rango; separadas por
     el mismo hueco que lo demas parecian dos campos sin relacion. */
  .adm-rango{display:flex;align-items:center;gap:var(--space-2)}
  /* Las horas son campos: 40 de alto, como el resto de campos migrados. */
  .adm-rango .adm-campo{width:120px;flex:none;min-height:40px}
  .adm-rango-f{flex:none;color:var(--sc-text-2);display:grid;place-items:center}
  .adm-rango-f svg{width:16px;height:16px}
  /* ---- 320 px: los dos sitios que no cabian. Solo por debajo de 360 para no mover nada
     en los anchos que ya estaban bien (375, 768, 1280, 1920, medidos). Las dos horas de la
     oferta dejan de medir 120 fijos y se reparten el ancho; la cabecera de «Platos mas
     consultados» baja su grupo de periodos a una segunda linea en vez de empujar la caja. */
  @media (max-width:359px){
    .adm-rango .adm-campo{width:auto;flex:1 1 0;min-width:0}
    .adm-f-cab .der.adm-a-platos{margin-left:0;flex:1 0 100%;justify-content:flex-start}
  }
  /* La frase del reloj cierra la ficha: es un dato de lo que pasa, no el pie de un control. */
  .adm-regla-pie{
    margin:var(--space-4) 0 0;padding-top:var(--space-3);border-top:1px solid var(--sc-border);
    font-size:var(--t3);line-height:1.5;color:var(--sc-text-2);
  }
  @media (max-width:900px){
    .adm-regla-dias{flex:1 1 100%}
  }

  /* Hallazgo H3, Fase 2: en cualquier ancho que no sea el móvil de abajo, "Configurar
     oferta" no existe visualmente — el <details> lo fuerza abierto por JS y esta cabecera
     se apaga del todo, así que la ficha se ve exactamente igual que antes de este cambio:
     ni una palabra nueva, ni un aviso de que algo se pueda plegar. */
  .adm-oferta-config-resumen{
    display:none;list-style:none;cursor:default;
  }
  .adm-oferta-config-resumen::-webkit-details-marker{display:none}
  .adm-oferta-config-chev{display:none;flex:none;width:18px;height:18px;color:var(--muted)}
  .adm-oferta-config-resumen:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

  /* Medido en vivo, ancho a ancho (1512/1200/1024/900/768/699/600/560/390/320): la ficha
     se queda en meseta a 427px desde 1024 hasta 699 —el mismo alto que ya toleraba
     tablet/escritorio sin queja— y es exactamente en 560px, un corte que el propio
     fichero ya usa en otro sitio, donde empieza a subir de verdad (501, luego 597 a 390,
     712 a 320, con la primera categoría de Platos sueltos recién en y=1115). No es 699
     "porque ya estaba": a 699px la ficha mide lo mismo que a 1024, así que ese corte no
     hacía nada aquí — 560 es el que de verdad separa "como tablet/escritorio" de "empieza
     a doler". Por debajo de esa medida, la cabecera se ve y se puede tocar; el orden
     visual pone el estado (frase canónica) ANTES que el acceso a configurar, como pide
     la jerarquía de esta fase — sin mover nada en el HTML, sólo el orden de pintado. */
  @media (max-width:560px){
    .adm-f-ooferta > .adm-f-cab{order:0}
    .adm-f-ooferta > .hint{order:1}
    .adm-f-ooferta > .adm-regla-pie{order:2;margin-top:var(--s2)}
    .adm-f-ooferta > .adm-oferta-config{order:3}
    .adm-oferta-config-resumen{
      display:flex;align-items:center;gap:8px;cursor:pointer;min-height:44px;
      margin-top:var(--s2);padding-top:var(--s2);border-top:1px solid var(--hairline);
      font-size:var(--t2);font-weight:600;color:var(--ink);
    }
    .adm-oferta-config-chev{display:block}
    .adm-oferta-config[open] .adm-oferta-config-chev{transform:rotate(180deg)}
  }
  @media (max-width:900px){.adm-4col{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (max-width:480px){.adm-4col{grid-template-columns:minmax(0,1fr)}}

  /* ---- prueba: fichas de categoría en bento, sin acordeón ----
     Las cuarenta categorías se pintan TODAS a la vez. Empezó tres por fila (2 de 6
     columnas); ahora una categoría es una fila entera, ancho completo — igual que ya
     hacía Precios a mano con sus fichas por pestaña — y reparte sus propios platos en
     dos columnas internas (`.adm-cat-bento-lista`, más abajo) en vez de una lista angosta
     de una sola. Nada que abrir ni cerrar: la ficha tiene una cabecera fija y, al no
     competir ya por alto con vecinas de la misma fila, ya no necesita un tope de altura
     ni scroll propio — crece lo que necesite, como cualquier ficha apilada del panel. */
  /* SocialCard V3: la ficha de categoria es la tarjeta del prototipo — radio 16,
     superficie (no el gris de --chip), borde de tarjeta y su sombra minima. */
  .adm-cat-bento{
    border:1px solid var(--sc-border);border-radius:var(--radius-card);background:var(--sc-surface);
    box-shadow:var(--sc-sombra-card);
    display:flex;flex-direction:column;overflow:hidden;
    /* Contenedor de tamaño para decidir UNA columna de platos o DOS (más abajo,
       `.adm-cat-bento-lista`): el ancho que importa aquí es el de la FICHA entera. */
    container-type:inline-size;container-name:adm-cat-bento;
    /* .adm-f trae padding:21px de fábrica (el margen de cualquier ficha del panel) — de
       más aquí: la cabecera y la lista ya llevan el suyo propio (0 14px cada una), así que
       ese padding heredado sólo sumaba un cerco extra sin usarlo para nada, alejando la
       cámara del borde del que se quejó el propietario. Se apaga sólo en este componente. */
    padding:0;
  }
  .adm-cat-bento[data-con-marcas]{border-color:var(--marca-borde)}
  /* Cabecera de 56 sobre el gris apagado, con filete abajo y relleno 16: exactamente
     la del prototipo (min-h-14, bg-muted, border-b, px-4). El nombre, 14/600. */
  .adm-cat-bento-cab{
    display:flex;align-items:center;gap:var(--space-3);flex:none;
    min-height:56px;padding:0 var(--space-4);
    background:var(--sc-muted-bg);
    font-size:var(--t2);font-weight:600;color:var(--sc-text);
    border-bottom:1px solid var(--sc-border);
  }
  /* flex:1 estiraba esta caja a todo el hueco sobrante aunque el texto («Sopas») fuera
     corto — la insignia naranja de al lado quedaba pegada al BORDE de la caja, no al
     texto, así que se leía lejos del título en vez de "seguida" de él. Ahora encoge a su
     contenido (0 1 auto) y es el CONTADOR quien se empuja al extremo derecho
     (margin-left:auto, más abajo): nombre + insignia quedan juntos a la izquierda,
     contador + interruptor juntos a la derecha. */
  /* Una sola línea, un solo tamaño: categoría y pestaña de la carta llegan ya fundidas en
     una sola cadena desde PHP (etiqueta_categoria()) — no hay un <small> que peinar aparte. */
  .adm-cat-bento-nm{
    flex:0 1 auto;min-width:0;max-width:100%;
    overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
  }
  /* En naranja de marca (--accent/--accent-ink), no en el gris neutro de antes: es la
     única cifra de la cabecera que dice "aquí hay algo encendido" y se pedía que se
     notara de un vistazo, justo pegada al nombre — de ahí que vaya inmediatamente
     después en el marcado, sin nada elástico entre los dos. */
  /* La insignia de "hay algo marcado aqui" sigue siendo la unica cifra en color de la
     cabecera. Pasa al naranja del PRODUCTO (--sc-primary), no al de la marca del
     restaurante: V1 separo las dos cosas y esto es cromo del panel. */
  .adm-cat-bento-marca{
    flex:none;padding:2px var(--space-2);border-radius:var(--radius-md);
    background:var(--sc-selected-bg);color:var(--sc-selected-text);
    font-size:var(--t4);font-weight:600;white-space:nowrap;
  }
  /* Contador: 12 tabular en pastilla de radio 8.4, como el del prototipo. Sube a la
     superficie de la tarjeta porque la cabecera ya es gris y un gris sobre gris no se
     lee -- el prototipo usa el mismo tono para los dos y ahi el contador desaparece. */
  .adm-cat-bento-n{
    flex:none;min-width:22px;height:22px;padding:2px var(--space-2);border-radius:var(--radius-md);
    background:var(--sc-surface);color:var(--sc-text-2);
    display:inline-grid;place-items:center;
    font-size:var(--t4);font-weight:500;font-variant-numeric:tabular-nums;
    margin-left:auto;
  }
  /* El precio (.adm-prow-fijo) ya es flex:0 0 auto + white-space:nowrap desde siempre —
     nunca fue él quien se rompía de línea. Lo que rompía la fila era dejar que la fila
     ENTERA hiciera flex-wrap: con eso, a tres columnas (~365px), el conjunto casilla+
     número+nombre+precio no cabía y el precio caía a una segunda línea. La regla es la
     contraria: la fila NUNCA envuelve (flex-wrap normal, precio siempre en su sitio) y es
     el NOMBRE —el único elemento elástico de la fila— el que se recorta con "…" cuando no
     cabe.

     Dos columnas, no una lista angosta: con la ficha a todo el ancho (arriba), una sola
     lista vertical desperdiciaba media pantalla en blanco a los lados. Los propios platos
     vienen ya repartidos en dos mitades desde PHP (columnasPlatos, por cantidad, no por
     alto calculado) — aquí sólo se colocan una al lado de la otra. Por debajo de cierto
     ancho de FICHA (container query, no viewport: es el ancho de la ficha lo que decide,
     no el de la pantalla) dos columnas quedarían más estrechas que la fila de tres de
     antes — se colapsa a una sola, y entonces es esa única columna la que usa el ancho
     completo. Sin tope de alto ni scroll propio: una ficha a todo lo ancho no le quita
     sitio a ninguna vecina por crecer, así que crece lo que le haga falta. */
  .adm-cat-bento-lista{display:grid;grid-template-columns:1fr 1fr;column-gap:28px;padding:0 14px}

  /* ---- tres por columna, y el resto detras del desplegable ----
     Se recorta por CSS y no quitando filas del HTML: los 312 platos siguen estando en el
     documento, asi que el buscador y los filtros los siguen encontrando aunque la ficha
     este plegada — el JavaScript de arriba (aplicarFiltro) no se entera de nada. */
  .adm-cat-bento:not([data-abierto]) .adm-cat-bento-col > .adm-orow:nth-child(n+4){display:none}
  /* Buscando o filtrando, el recorte se levanta: si no, un plato que coincide podria
     quedarse escondido detras del "Ver mas" y pareceria que no existe. */
  .esta-filtrando .adm-cat-bento .adm-cat-bento-col > .adm-orow:nth-child(n+4){display:flex}
  .esta-filtrando .adm-vermas{display:none}

  .adm-vermas{
    display:flex;align-items:center;justify-content:center;gap:var(--space-2);
    width:100%;min-height:40px;margin:0;padding:0 var(--space-4);
    border:0;border-top:1px solid var(--sc-border);border-radius:0;
    background:transparent;color:var(--sc-text-2);
    font-family:inherit;font-size:var(--t3);font-weight:500;cursor:pointer;
    transition:background var(--t-fast) var(--ease-out),color var(--t-fast) var(--ease-out);
  }
  .adm-vermas:hover{background:var(--sc-muted-bg);color:var(--sc-text)}
  .adm-vermas:focus-visible{outline:2px solid var(--sc-primary);outline-offset:-2px}
  .adm-vermas-chev{width:16px;height:16px;flex:none;transition:transform var(--t-fast) var(--ease-out)}
  .adm-vermas[aria-expanded="true"] .adm-vermas-chev{transform:rotate(180deg)}
  @container adm-cat-bento (max-width:820px){
    .adm-cat-bento-lista{grid-template-columns:1fr}
  }
  /* Contenedor de tamaño para lo de aquí abajo: cuánto le cabe a CADA columna de platos,
     no a la ficha entera (con dos columnas, la ficha puede ser ancha y cada columna ir
     igual de justa que antes a tres por fila). */
  .adm-cat-bento-col{container-type:inline-size;container-name:adm-cat-bento-col;min-width:0}
  @container adm-cat-bento-col (max-width: 480px) {
    .adm-cat-bento-lista .adm-orow-nm{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .adm-cat-bento-lista .adm-orow-nm small{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  }
  @media (max-width:699px){
    .adm-cat-bento-cab{flex-wrap:wrap;row-gap:7px;padding:11px 14px}
    .adm-cat-bento-nm{flex:1 1 calc(100% - 2.4em)}
    .adm-cat-bento-marca{margin-left:auto}
  }
  /* En estrecho no caben las cuatro cosas en una linea: el nombre del plato se quedaba en
     42 px y «Salsa o encurtido a elegir» salia como «Sal…». La fila se parte en dos, con el
     numero y el nombre arriba y los dos precios debajo, el nuevo a la derecha. Igual que en
     el podio y en la lista de platos de Analitica: una sola forma de partir una fila. */
  @media (max-width:699px){
    .adm-prow{flex-wrap:wrap;row-gap:6px;padding:9px 4px;column-gap:9px}
    .adm-prow-n{order:0}
    .adm-prow-nm{order:1;flex:1 1 calc(100% - 3.4em)}
    .adm-prow-viejo{order:2;margin-left:calc(2.6em + 9px)}
    .adm-prow-nuevo,.adm-prow-fijo{order:3;margin-left:auto}
  }
  .adm-f-ptab[hidden]{display:none}

  /* ==================================================================== analítica, en el sistema
   * La pestaña traía rejilla propia (`dt-bento`) y baldosas propias (`dt-baldosa`): las dos se
   * han ido y usa las del panel. Lo de aquí abajo NO rediseña nada: reajusta lo de DENTRO —las
   * barras, las cifras, los chips y las filas de platos— a la tipografía y a los tres tamaños
   * del sistema, y arregla las piezas que estaban pensadas para la tarjeta clara.
   * ============================================================================================ */

  /* Una sola familia. Estas reglas pedían la tipografía de la carta por su nombre, así que
     heredar de .card-main no bastaba. */
  .adm-f .dt-lectura,.adm-f .dt-globo,.adm-f .dt-eje,.adm-f .dt-chip,.adm-f .dt-cifra-n,
  .adm-f .vp-per button,.adm-f .vp-pos,.adm-f .vp-nom,.adm-f .vp-n,.adm-f .vp-pct,
  .adm-f .vp-mas summary,.adm-dt-pie{font-family:inherit}

  /* Los tres tamaños, también aquí. La cifra de cada ventana va a --t1: es lo mayor de su
     ficha, y una ficha con un título, un chip y un número no necesita un cuarto tamaño para
     que se sepa cuál de los tres es el dato. */
  .adm-f .dt-cifra-n{font-size:var(--t1);font-weight:600;line-height:1.1;margin:0 0 var(--space-2);letter-spacing:-.01em;color:var(--sc-text);font-variant-numeric:tabular-nums}
  .adm-f .dt-lectura{font-size:var(--t1)}
  .adm-f .dt-lectura em{font-size:var(--t3)}
  .adm-f .vp-nom,.adm-f .vp-n{font-size:var(--t2)}
  .adm-f .dt-eje,.adm-f .dt-chip,.adm-f .dt-globo,.adm-f .vp-pos,.adm-f .vp-pct,
  .adm-f .vp-per button,.adm-f .vp-mas summary,.adm-dt-pie{font-size:var(--t3)}

  /* La ficha de los treinta días reacciona al dedo como reaccionaba su baldosa. */
  .adm-f.tocando{background:var(--sc-hover-bg)}
  .adm-f.tocando .dt-lectura{color:var(--ink);opacity:1}

  /* El selector de periodo. En claro, el elegido se levantaba con --surface y una sombra;
     sobre negro --surface es MÁS oscuro que el chip, así que el elegido desaparecía. Se
     invierte, igual que las pestañas de arriba. */
  .adm-f .vp-per{background:var(--chip);border:1px solid var(--hairline);padding:3px}
  .adm-f .vp-per button{min-height:30px;padding:0 12px}
  .adm-f .vp-per button[aria-pressed="true"]{background:var(--ink);color:var(--sc-surface);box-shadow:none}

  /* Las filas de platos: el mismo radio y el mismo aire que .adm-fila, para que una lista
     dentro de una ficha se lea igual en todo el panel. */
  .adm-f .vp-lista{gap:3px}
  .adm-f .vp-fila{border-radius:11px;padding:9px 12px}
  .adm-f .vp-barra{border-radius:11px}
  .adm-f .vp-mas summary{color:var(--muted)}
  .adm-f .vp-mas summary:hover{color:var(--ink)}

  /* Los tres datos del pie, debajo del eje: desde cuándo se cuenta, cuánto va contado y
     cuánto se guarda. Es lo único de la nota vieja que no cabía en un globo de ayuda. */
  /* Las barras van en GRIS, del mismo tono que los textos secundarios, y no en el naranja
     de la marca. Dos razones, y ninguna es de gusto:

     La primera, que el naranja calculado para la tarjeta crema no vale aquí. Estaba en
     `color-mix(var(--accent) 26%, transparent)`, que sobre crema daba un melocotón claro;
     sobre negro, naranja al 26% no es naranja claro, es MARRÓN —es lo que sale de mezclar
     naranja con negro— y treinta barras marrones son una textura, no un dato.

     La segunda, que subirlo tampoco valía: treinta barras naranjas a todo color son mucho
     naranja para una pantalla que sólo se lee. El acento se guarda para donde dice algo
     —el punto que late, el chip de variación, la barra que se está leyendo— y el resto del
     gráfico se pinta con el gris de los textos, que es lo que es: información, no aviso. */
  .adm-f .dt-b i{background:var(--sc-text-2)}
  .adm-f .dt-barras.tocando .dt-b i{background:color-mix(in srgb, var(--sc-text) 14%, transparent)}
  .adm-f .dt-barras.tocando .dt-b.vecina i{background:color-mix(in srgb, var(--sc-text) 34%, transparent)}
  /* La única naranja del gráfico es la que se está leyendo. Iba en blanco (--ink), que sobre
     crema era el máximo contraste posible; sobre un gris apagado, el color es lo que la
     separa de las otras veintinueve. */
  .adm-f .dt-barras.tocando .dt-b.viva i{background:var(--sc-primary)}
  .adm-f .dt-b.futuro i{background:color-mix(in srgb, var(--sc-text) 7%, transparent)}
  /* La barra de la fila de un plato lleva el nombre encima: gris muy bajo, para que sea un
     fondo que mide y no un bloque de color que compita con el texto. */
  .adm-f .vp-barra{background:color-mix(in srgb, var(--sc-text) 10%, transparent)}

  .adm-dt-pie{
    display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-4);
    margin:var(--space-3) 0 0;padding-top:var(--space-3);
    border-top:1px solid var(--sc-border);
    color:var(--sc-text-2);font-variant-numeric:tabular-nums;
  }

  /* ---- analítica en estrecho ----
     Dos cosas no caben a 375. El selector de periodo mide 265 px dentro de una ficha de 250
     y sacaba 13 px de scroll a toda la página: se le deja envolver y se le quita relleno. Y
     el nombre del plato se quedaba en 89 px —«Arroz basmati hervido» recortado a «Arroz
     bas…»—: la fila envuelve y el nombre se lee entero, con las cifras debajo. */
  @media (max-width:699px){
    .adm-f-cab .der{flex-wrap:wrap;min-width:0}
    .adm-f .vp-per{flex-wrap:wrap;padding:2px}
    .adm-f .vp-per button{padding:0 9px}
    /* La fila se parte en DOS lineas fijas y no "donde caiga": puesto y nombre arriba,
       consultas y porcentaje abajo a la derecha. Dejandolo al azar del flex, el 125 se
       quedaba junto al nombre y el 21% bajaba solo: diez filas y ninguna igual. */
    .adm-f .vp-fila{flex-wrap:wrap;row-gap:1px;column-gap:9px}
    .adm-f .vp-nom{
      flex:1 1 calc(100% - 2.6em);white-space:normal;overflow:visible;text-overflow:clip;
      line-height:1.35;
    }
    .adm-f .vp-n{margin-left:auto}
  }

  /* ======================================================================= marca, en bento
   * Marca no trae ni un token ni una ficha propios: .adm-board, .adm-bento, .adm-f, la
   * cabecera con su icono, .adm-campo, .adm-sw, .adm-btn y la tira de acciones son los
   * mismos que estrenó Publicidad. Lo de aquí abajo es SOLO lo que Marca tiene y
   * Publicidad no —una galería de portadas, una muestra de color y una lista de copias—,
   * y va con prefijo adm- porque mañana lo pedirá otra pestaña.
   * ====================================================================================== */

  /* ---- rótulo de campo ----
     Publicidad se apañaba con aria-label porque cada ficha tenía un campo y el título de
     la ficha ya decía cuál era. Aquí hay fichas con cuatro campos seguidos: hace falta
     rótulo visible, y con el mismo peso que el resto del sistema. */
  /* 13/500 apagado: la etiqueta acompaña al control, no compite con el. */
  .adm-lbl{display:block;margin:var(--space-2) 0 6px;font-size:var(--t3);font-weight:500;color:var(--sc-text-2)}
  .adm-lbl .opt{font-weight:400;color:var(--sc-text-2)}
  .adm-2col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s2)}
  .adm-2col .adm-lbl{margin-top:0}
  /* Excepción de Redes: «Nota» y «Reseñas» son dos cifras cortas y caben partidas a
     cualquier ancho; dos direcciones completas, no. Se parten sólo cuando la ficha es de
     verdad ancha —a 1200 mide 445 y cada columna 215—; por debajo vuelven a apilarse. */
  .adm-2col-redes{grid-template-columns:minmax(0,1fr)}
  @media (min-width:1200px){.adm-2col-redes{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
  /* El interruptor no lleva margen abajo —en Publicidad cierra la ficha y sobraria—,
     asi que lo pone lo que venga detras. Sin esto, "La nota SE ENSEÑA en la carta" y
     el rotulo "Nota" se tocaban. */
  .adm-sw + .adm-2col,.adm-sw + .adm-lbl{margin-top:var(--s3)}
  .adm-al-pie{margin:auto 0 0}

  /* ---- vacíos ----
     Un hueco en blanco no dice si falta algo o si algo se ha roto. */
  .adm-vacio{
    display:flex;flex-direction:column;align-items:center;gap:var(--space-2);text-align:center;
    margin:0 0 var(--space-2);padding:var(--space-6) var(--space-4);
    border:1px dashed var(--sc-input-border);border-radius:var(--radius-lg);
    color:var(--sc-text-2);font-size:var(--t3);line-height:1.5;
  }
  .adm-vacio svg{width:24px;height:24px;flex:none;stroke-width:2}

  /* ---- portadas ----
     Las flechas y la papelera van en el pie de la miniatura, no encima de la foto: sobre
     una imagen cualquier icono se pierde con la primera portada oscura. */
  .adm-fotos{
    display:grid;gap:var(--s2);margin-bottom:var(--s2);align-content:start;
    grid-template-columns:repeat(auto-fill,minmax(190px,1fr));
  }
  .adm-foto{
    display:flex;flex-direction:column;min-width:0;
    /* V6: era un 14 literal. --radius-xl (14.4) es el mismo valor del sistema. */
    border:1px solid var(--hairline);border-radius:var(--radius-xl);overflow:hidden;background:var(--chip);
  }
  .adm-foto img{width:100%;aspect-ratio:16 / 9;object-fit:cover;display:block;background:var(--sc-muted-bg)}
  .adm-foto-pie{display:flex;align-items:center;gap:3px;padding:6px 7px}
  .adm-foto-pos{
    margin-right:auto;min-width:23px;height:23px;padding:0 6px;border-radius:7px;
    background:var(--surface);color:var(--muted);
    font-size:var(--t3);font-weight:700;display:inline-grid;place-items:center;
    font-variant-numeric:tabular-nums;
  }
  .adm-foto-b{
    /* DS-2: COMPACT (40px) -- antes 32px. Fila con hueco de sobra a 390/320
       (medido), el radio de 9px se queda literal: es el de icon-button
       cuadrado, no el de .adm-btn/.adm-campo, y aliasarlo aqui le cambiaria
       el valor a .adm-pct-ir tambien sin querer. min-height:0 anula el
       button{min-height:48px} de mas abajo -- sin esto medía 40x48, no
       40x40 (mismo motivo por el que .camara ya lo lleva). */
    width:40px;height:40px;min-height:0;flex:none;padding:0;border:0;border-radius:9px;
    background:transparent;color:var(--muted);
    display:grid;place-items:center;cursor:pointer;
    transition:background var(--t-press) var(--ease-out),color var(--t-press) var(--ease-out);
  }
  .adm-foto-b svg{width:18px;height:18px}
  .adm-foto-b:hover:not(:disabled){background:var(--surface);color:var(--ink)}
  .adm-foto-b:disabled{opacity:.3;cursor:default}
  .adm-foto-b-quitar:hover:not(:disabled){background:color-mix(in srgb, var(--ui-state-danger) 14%, transparent);color:var(--ui-state-danger)}
  .adm-foto-aviso{margin:0 0 var(--s2);font-size:var(--t3);color:var(--muted)}
  .adm-foto-aviso-mal{color:var(--ui-state-error)}
  .adm-subida{
    display:flex;align-items:center;gap:10px;flex-wrap:wrap;
    margin:auto 0 0;padding-top:var(--s2);border-top:1px solid var(--hairline);
  }
  .adm-subida input[type=file]{flex:1 1 190px;min-width:0;color:var(--muted);font-size:var(--t3)}
  /* El botón que pinta el navegador dentro del campo de fichero venía de fábrica: gris
     claro con la letra del sistema, sobre una ficha negra. Es parte del diseño aunque no
     se dibuje aquí. Vale para las dos pestañas que suben imágenes. */
  .adm-subida input[type=file]::file-selector-button,
  .adm-subir input[type=file]::file-selector-button{
    margin-right:10px;padding:0 13px;min-height:38px;
    border:1px solid var(--border);border-radius:10px;background:var(--chip);color:var(--ink);
    font-family:inherit;font-size:var(--t3);font-weight:600;cursor:pointer;
  }
  .adm-subida input[type=file]::file-selector-button:hover,
  .adm-subir input[type=file]::file-selector-button:hover{background:var(--sc-hover-bg);border-color:var(--sc-input-border)}

  /* ---- color ----
     El cuadrado es el selector del navegador, no una muestra decorativa: se pulsa y abre
     la paleta del sistema. El hexadecimal de al lado es el que de verdad viaja. */
  .adm-color{display:flex;align-items:center;gap:var(--space-2)}
  /* SocialCard V6: la muestra medía 54x50 —ni el 40 del campo que tiene al lado ni un
     cuadrado— y su radio era un 12 literal. Pasa a 40x40 con el radio del campo: los dos
     controles de la fila comparten alto y esquina, que es lo que hace que se lean como
     UN control con dos mitades y no como dos cajas sueltas. */
  .adm-color-muestra{
    width:40px;height:40px;min-height:0;flex:none;padding:0;cursor:pointer;
    border:1px solid var(--sc-border);border-radius:var(--ui-radius-control);background:var(--sc-input-bg);
  }
  .adm-color-muestra::-webkit-color-swatch-wrapper{padding:3px}
  .adm-color-muestra::-webkit-color-swatch{border:0;border-radius:7px}
  .adm-color-muestra::-moz-color-swatch{border:0;border-radius:7px}
  .adm-color-hex{flex:1 1 0;min-width:0;text-transform:uppercase;font-variant-numeric:tabular-nums}
  /* Deshacer no es la acción principal de la ficha: a ancho completo pesaba lo mismo que
     Guardar. Vuelve a su ancho natural, alineado a la izquierda con los campos. */
  .adm-color-volver{align-self:flex-start;margin-top:var(--space-2)}
  .adm-color-rot{margin:var(--s3) 0 8px}
  .adm-color-fijos{display:flex;flex-wrap:wrap;gap:7px}
  .adm-color-fijo{
    display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 10px 0 7px;
    border-radius:var(--radius-pill);background:var(--chip);border:1px solid var(--hairline);
  }
  /* El aro de dentro salva al Oscuro del motor: sin él, un color casi negro no tiene
     silueta contra la ficha y el chip parece que le falte el punto. */
  .adm-color-fijo i{
    width:15px;height:15px;flex:none;border-radius:5px;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);
  }
  .adm-color-fijo b{font-size:var(--t3);font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}

  /* ==================================================================== SocialCard V6
     Lo que faltaba para cerrar Marca y Ajustes. Cuatro piezas, todas construidas con
     tokens del sistema: no hay un quinto lenguaje visual aquí dentro. */

  /* ---- campo de fichero ----
     El `input[type=file]` desnudo medía 38 px de alto contra los 40 del resto de campos,
     y el botón que pinta el navegador dentro no se puede alinear con nada. Se envuelve en
     una caja que SÍ es del sistema —misma superficie, mismo borde, mismo radio, mismo
     foco— y el input real se estira invisible por encima: sigue siendo el control nativo,
     con su multiple, su accept y su required intactos. */
  .adm-archivo{
    position:relative;display:flex;align-items:center;gap:var(--space-3);
    min-height:40px;padding:0 var(--space-3);
    background:var(--sc-input-bg);border:1px solid var(--sc-border);
    border-radius:var(--ui-radius-control);color:var(--sc-text-2);font-size:var(--t3);
    flex:1 1 220px;max-width:420px;min-width:0;
  }
  .adm-archivo:focus-within{border-color:var(--p-accent-stroke);box-shadow:0 0 0 3px var(--p-accent-glow)}
  .adm-archivo input[type=file]{
    position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;
  }
  .adm-archivo svg{width:16px;height:16px;flex:none;stroke-width:2}
  .adm-archivo-txt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  /* ---- ficha plegable ----
     Las tres fichas de superadministrador se abren pocas veces al año. Dejarlas abiertas
     llena la pantalla de campos de contraseña que nadie va a tocar; esconderlas en un
     `<details>` sin estilo las sacaba del sistema. Es la MISMA .adm-f: sólo cambia que su
     cabecera es el resumen y que se pliega. Sin card dentro de card. */
  /* display:block y no el flex de .adm-f: sobre un <details> el flex reparte summary y
     cuerpo como items y el plegado nativo se comporta de forma distinta según navegador. */
  .adm-f-plega{display:block;padding:0;align-self:start}
  .adm-f-plega > summary{
    display:flex;align-items:center;gap:var(--space-3);
    padding:var(--space-4);margin:0;cursor:pointer;list-style:none;
    border-radius:var(--radius-card);
  }
  .adm-f-plega > summary::-webkit-details-marker{display:none}
  .adm-f-plega > summary:hover{background:var(--sc-hover-bg)}
  .adm-f-plega > summary:focus-visible{outline:2.5px solid var(--p-accent-stroke);outline-offset:-2px}
  /* El resumen ES el botón: dentro sólo va contenido de frase, así que el rótulo no puede
     ser un <h2>. Se le da el mismo aspecto que a la cabecera de una ficha normal — quien
     lo lee ve el mismo título; quien lo escucha oye un botón que despliega, que es
     exactamente lo que hace. El <h2> de la sección de arriba mantiene la estructura. */
  .adm-f-tit{
    flex:1 1 auto;min-width:0;
    font-size:var(--t2);font-weight:600;letter-spacing:-.01em;color:var(--sc-text);
  }
  /* `display:grid` no es adorno: `transform` NO se aplica a un elemento en línea no
     reemplazado, así que con el <span> por defecto el galón no giraba al abrir. Medido:
     matrix(1,0,0,1,0,0) con [open] puesto. Misma familia que las cinco trampas ya
     anotadas — la regla genérica que gana en silencio. */
  .adm-f-plega-v{
    flex:none;width:20px;height:20px;display:grid;place-items:center;color:var(--sc-text-2);
    transition:transform var(--t-press) var(--ease-out);
  }
  /* `.der` sólo está definido como hijo de `.adm-f-cab`, y en el resumen no hay cabecera. */
  .adm-f-plega > summary .der{flex:none;display:flex;align-items:center;gap:var(--space-2)}
  .adm-f-plega-v svg{width:20px;height:20px;stroke-width:2;display:block}
  .adm-f-plega[open] > summary .adm-f-plega-v{transform:rotate(180deg)}
  .adm-f-plega-cuerpo{padding:0 var(--space-4) var(--space-4)}
  /* El plegado abierto separa la cabecera del cuerpo con el mismo filete de la ficha. */
  .adm-f-plega[open] > summary{border-bottom:1px solid var(--sc-border);border-radius:var(--radius-card) var(--radius-card) 0 0;margin-bottom:var(--space-4)}
  /* La rejilla estira las fichas de una fila a la misma altura; con dos plegables cerrados
     eso está bien, pero con uno abierto y otro cerrado el cerrado quedaría con 300 px de
     caja vacía. align-self:start (arriba) las deja cada una a su alto real. */

  /* ---- rótulo de sección ----
     Separa las fichas del restaurante de las que sólo ve el superadministrador. No es un
     título de pantalla —eso lo dice la cabecera fija—: es una línea que marca dónde
     empieza otra cosa. */
  .adm-seccion{
    display:flex;align-items:center;gap:var(--space-3);
    margin:var(--space-6) 0 var(--space-3);
  }
  .adm-seccion h2{
    margin:0;flex:none;font-size:var(--t3);font-weight:600;letter-spacing:.04em;
    text-transform:uppercase;color:var(--sc-text-2);
  }
  .adm-seccion::after{content:"";flex:1 1 auto;height:1px;background:var(--sc-border)}

  /* Los campos de una acción sensible no se estiran a todo el ancho de la ficha: una
     contraseña es corta y un campo de 500 px invita a escribir una frase. 340 es el ancho
     que ya tenían, ahora sin `style` en el atributo. El botón, a su ancho natural. */
  .adm-form-seg{display:flex;flex-direction:column;align-items:stretch;max-width:340px}
  .adm-form-seg .adm-campo{width:100%}

  /* ---- registro de accesos ----
     Un `<pre>` con la fuente del sistema y sin caja: en claro salía como texto suelto
     encima del fondo. Caja del sistema, monoespaciado tabular y desplazamiento propio —
     una línea larga no puede empujar la pantalla entera. */
  .adm-log{
    margin:0;padding:var(--space-3);max-height:280px;overflow:auto;
    background:var(--sc-muted-bg);border:1px solid var(--sc-border);border-radius:var(--radius-lg);
    font:var(--t3)/1.7 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    color:var(--sc-text-2);white-space:pre;
  }

  /* ---- aviso de acción sensible ----
     Lo que cambia una contraseña o expulsa sesiones no puede parecerse a guardar un
     nombre. No se esconde en un tooltip: se lee antes de pulsar. */
  .adm-aviso-seg{
    display:flex;align-items:flex-start;gap:var(--space-2);
    margin:0 0 var(--space-3);padding:10px 12px;
    /* La pareja fondo+tinta de aviso del sistema, la misma que usa la insignia de demo.
       No se inventa un amarillo: --sc-warn-bg y --sc-warn-ink ya vienen calculadas para
       los dos temas y su contraste está medido. */
    background:var(--sc-warn-bg);
    border:1px solid color-mix(in srgb, var(--sc-warn-ink) 30%, transparent);
    border-radius:var(--radius-lg);
    font-size:var(--t3);line-height:1.5;color:var(--sc-warn-ink);
  }
  .adm-aviso-seg svg{width:16px;height:16px;flex:none;stroke-width:2;margin-top:2px}
  .adm-f-super .adm-btn{align-self:flex-start;margin-top:var(--space-3)}

  /* ---- la fila con acción ----
     Una línea que dice algo y trae uno o dos botones al final. Nació para las copias de
     seguridad y la usan ya el marcador del juego y todo lo que venga: por eso se llama
     .adm-fila y no .adm-copia. */
  .adm-filas{display:grid;gap:8px;margin-bottom:var(--s2)}
  .adm-fila{
    display:flex;align-items:center;gap:9px;flex-wrap:wrap;
    /* V6: era un 13 literal; --radius-xl (14.4) es el radio de este tamaño de caja. */
    padding:10px 12px;border-radius:var(--radius-xl);margin:0 0 var(--s2);
    background:var(--chip);border:1px solid var(--hairline);
  }
  .adm-filas .adm-fila{margin:0}
  .adm-fila-txt{display:grid;gap:2px;min-width:0;flex:1 1 190px}
  .adm-fila-que{
    flex:1 1 190px;min-width:0;margin-right:auto;
    font-size:var(--t3);font-weight:600;color:var(--ink);line-height:1.4;
  }
  .adm-fila-dato{font-size:var(--t3);color:var(--muted);font-variant-numeric:tabular-nums}
  /* Lo que borra sin vuelta atrás se separa de la lista y se pinta en rojo. */
  .adm-fila-peligro{
    margin:var(--s2) 0 0;background:transparent;border-color:color-mix(in srgb, var(--ui-state-danger) 30%, transparent);
  }

  /* ---- el interruptor del juego, arriba del marcador ----
     El rotulo dice ON u OFF y nada mas: la frase larga la cuenta la linea de abajo
     de la propia fila, y repetirla al lado del interruptor era decirlo dos veces. */
  /* Sin fondo y con mas aire debajo: con el mismo chip que las filas del podio se
     leia como una cuarta entrada de la lista, y es el control, no un dato. */
  .adm-juego-sw{gap:var(--s2);background:transparent;margin-bottom:var(--s3)}
  .adm-juego-sw .adm-sw{padding:0;flex:none}
  .adm-juego-sw .adm-sw-txt{
    min-width:36px;font-size:var(--t3);font-weight:600;letter-spacing:.10em;color:var(--sc-text-2);
  }
  .adm-juego-sw .adm-sw:has(input:checked) .adm-sw-txt{color:var(--sc-text)}

  /* ---- el podio del juego ----
     Es una .adm-fila con dos cosas más: el puesto delante y la puntuación al final. El
     primero lleva el acento; los otros dos, el chip de siempre. */
  /* V5 — el podio. El puesto es una insignia del sistema (radio 8.4, 12 tabular) y el
     primero lleva la pastilla suave de seleccion, no un relleno de color macizo. */
  .adm-podio{list-style:none;margin:0 0 var(--space-2);padding:0;display:grid;gap:var(--space-2)}
  .adm-podio .adm-fila{margin:0}
  .adm-pod-n{
    width:24px;height:24px;flex:none;border-radius:var(--radius-md);display:grid;place-items:center;
    background:var(--sc-muted-bg);color:var(--sc-text-2);
    font-size:var(--t4);font-weight:600;font-variant-numeric:tabular-nums;
  }
  .adm-podio > li:first-child .adm-pod-n{background:var(--sc-selected-bg);color:var(--sc-selected-text)}
  .adm-pod-quien{
    display:flex;align-items:center;gap:var(--space-2);min-width:0;
    font-size:var(--t2);font-weight:600;color:var(--sc-text);
  }
  .adm-pod-quien.es-anon{color:var(--sc-text-2);font-weight:400;font-style:italic}
  .adm-pod-bandera{border-radius:3px;flex:none;display:block}
  /* Las puntuaciones se comparan entre ellas: mismo ancho, a la derecha y con
     cifras de ancho fijo, o el 9.040 y el 14.820 no empiezan en el mismo sitio. */
  .adm-pod-pts{
    margin-left:auto;min-width:80px;text-align:right;
    font-size:var(--t2);font-weight:600;color:var(--sc-text);
    font-variant-numeric:tabular-nums;
  }
  /* El boton de quitar el nombre solo sale si hay nombre que quitar. Sin reservarle
     el hueco, la puntuacion de la fila sin nombre se iba 129 px a la derecha y la
     columna de numeros dejaba de ser una columna. */
  .adm-pod .adm-btn-fino{flex:0 0 128px}
  .adm-podio > li:not(:has(button))::after{content:"";flex:0 0 128px}
  @media (max-width:699px){
    /* Ahi la fila ya envuelve por su cuenta: reservar el hueco solo añadiria una
       linea vacia. Y la puntuacion deja de empujarse a la derecha: en la linea de
       abajo va pegada a la izquierda, con o sin boton detras, o la fila sin nombre
       manda su numero al borde y la columna se rompe otra vez. */
    .adm-pod .adm-btn-fino{flex:0 0 auto}
    .adm-podio > li:not(:has(button))::after{display:none}
    .adm-pod-pts{margin-left:0}
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
          <?php /* La etiqueta de verdad, oculta a la vista: el placeholder desaparece al
                   escribir y aria-label no cuenta como etiqueta para todas las herramientas. */ ?>
          <label for="clave" class="sr">Contraseña</label>
          <input type="password" id="clave" name="clave" placeholder="Contraseña" autocomplete="current-password" required autofocus>
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
  <?php /* MISE-B, décima ronda: "En línea" no comprobaba nada — ni un latido, ni una
           reconexión, nada en JS la tocaba nunca. Era el texto fijo que salía siempre
           que la página cargaba con sesión, lo cual es cierto por definición (si no
           hubiera "línea", no habría página) y no dice nada que el usuario no supiera ya.
           Se retira. "Usuario" tampoco avisaba de nada que no fuera el caso normal —
           sólo queda la insignia cuando SÍ hay algo que merece decirse: demo, o sesión de
           superadministrador (más alcance, sí vale la pena que se note). */ ?>
  <?php if ($demo || $super): ?>
    <div class="insignias" role="status" aria-label="Sesión">
      <?php if ($demo): ?>
        <span class="insignia is-demo">Modo demo</span>
      <?php else: ?>
        <span class="insignia is-super">Superadmin</span>
      <?php endif; ?>
    </div>
  <?php endif; ?>
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
    <?php /* MISE-B, octava ronda: este aviso se repite también en el pie de la barra
             lateral (id="adm-sidebar"), integrado con Salir bajo la misma línea divisoria
             que ya llevaba esa barra. Aquí se queda para cuando la barra no enseña texto
             (icono solo en tablet, oculta del todo en móvil) — .sub-sesion se esconde sólo
             a partir de 1024px, que es donde la barra empieza a rotular. */ ?>
    <p class="sub sub-sesion">
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
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>')
        + '</span><span class="toast-txt"></span>'
        + '<button type="button" class="toast-x" aria-label="Cerrar aviso"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
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

  <?php /* ============================================================ MISE-B: navegación ==
   * Sidebar persistente en escritorio, riel de iconos en tablet, barra inferior + hoja
   * «Más» en móvil. Sustituye a la barra de pestañas horizontal. Sigue siendo botones que
   * cambian de panel sin recargar (mismo `.pane`/data-pane de siempre); sólo cambia dónde
   * viven. Las mismas tres constantes de capacidad de siempre (CLIENTE_JUEGO,
   * CLIENTE_PUBLICIDAD, DATOS_ACTIVO) deciden qué existe, aquí y en la barra inferior y la
   * hoja «Más» — un cliente sin esa capacidad no deja huecos ni destinos muertos.
   * Los iconos y el rótulo de cada botón coinciden con $PESTANAS de arriba a propósito: es
   * el mismo catálogo de destinos, sólo agrupado. */ ?>
  <?php
    /* SocialCard V2: iconografia Lucide, la misma biblioteca del prototipo. Cinco de
       los siete son EL MISMO icono que usa el prototipo para ese destino, copiado de
       su DOM y no dibujado de nuevo: utensils (Platos), megaphone (Publicidad),
       sparkles (Juego), chart-column (Estadisticas), paintbrush (Apariencia) y
       settings (Ajustes). Ofertas no existe en el prototipo: lleva badge-percent,
       Lucide tambien, que es literalmente el descuento del que va la pantalla.
       Todos a viewBox 24, fill none, stroke currentColor, stroke-width 2, cabos y
       uniones redondos — el estandar de la biblioteca, no una mezcla. */
    $NAV_ICONOS = [
      'platos'     => '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
      'ofertas'    => '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/>',
      'publicidad' => '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/><path d="M8 6v8"/>',
      'juego'      => '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
      'datos'      => '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
      'marca'      => '<path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/>',
      'ajustes'    => '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
    ];
    $navBoton = function (string $slug) use ($PESTANAS, $pestana, $CUENTAS, $NAV_ICONOS): string {
      $nombre = $PESTANAS[$slug];
      $on = $pestana === $slug;
      $n = $CUENTAS[$slug] ?? 0;
      return '<button type="button" class="adm-nav-item' . ($on ? ' on' : '') . '" data-tab="' . h($slug) . '"'
        . ' id="navtab-' . h($slug) . '" aria-controls="panel-' . h($slug) . '" aria-selected="' . ($on ? 'true' : 'false') . '"'
        . ' aria-label="' . h($nombre) . '">'
        . '<svg class="adm-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $NAV_ICONOS[$slug] . '</svg>'
        . '<span class="txt">' . h($nombre) . '</span>'
        . ($n ? '<span class="n">' . (int) $n . '</span>' : '')
        . '<span class="adm-nav-tooltip" role="tooltip">' . h($nombre) . '</span>'
        . '</button>';
    };
  ?>
  <?php /* ====================================================== SocialCard V2: cabecera ==
     68px pegada arriba, con el titulo de la pantalla y el selector de tema. El titulo
     sale de $PESTANAS, el mismo catalogo de destinos que rotula la navegacion — no hay
     una segunda lista de nombres que mantener. Lo actualiza el mismo JS que cambia de
     panel. */ ?>
  <header class="adm-topbar">
    <div class="adm-topbar-txt">
      <h2 class="adm-topbar-titulo" id="adm-topbar-titulo"><?= h($PESTANAS[$pestana] ?? 'Panel') ?></h2>
      <p class="adm-topbar-sub"><?= h(CLIENTE_NOMBRE) ?> · <?= h(dia_semana($hoyReal)) ?>, <?= h((new DateTimeImmutable($hoyReal))->format("d/m/y")) ?></p>
    </div>
    <div class="adm-topbar-acciones">
      <?php /* Sol, interruptor, luna: la misma pieza del prototipo, con sus medidas
               (40 de alto, radio 12, iconos de 16, interruptor de 32x18). */ ?>
      <div class="adm-tema">
        <svg class="adm-tema-ico adm-tema-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <button type="button" class="adm-tema-sw" id="adm-tema-sw" role="switch" aria-checked="false" aria-label="Modo oscuro" title="Cambiar a modo oscuro"><span class="adm-tema-bola"></span></button>
        <svg class="adm-tema-ico adm-tema-luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>
      </div>
    </div>
  </header>

  <nav class="adm-sidebar" id="adm-sidebar" aria-label="Secciones del panel">
    <?php /* SocialCard V2: la marca del producto encabeza la barra, como en el prototipo.
             En riel (768-1023) se queda solo el cuadrado del icono, centrado. */ ?>
    <div class="adm-sidebar-cab">
      <span class="adm-sidebar-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
      </span>
      <div class="adm-sidebar-marcas">
        <p class="adm-sidebar-producto">SocialCard</p>
        <p class="adm-sidebar-cliente"><?= h(CLIENTE_NOMBRE) ?></p>
      </div>
    </div>
    <div class="adm-sidebar-grupo"><?= $navBoton('platos') ?></div>
    <div class="adm-sidebar-grupo">
      <p class="adm-sidebar-rotulo">Operación</p>
      <?= $navBoton('ofertas') ?>
    </div>
    <?php if (CLIENTE_PUBLICIDAD || CLIENTE_JUEGO): ?>
      <div class="adm-sidebar-grupo" data-grupo-marketing>
        <p class="adm-sidebar-rotulo">Marketing</p>
        <?php if (CLIENTE_PUBLICIDAD): ?><?= $navBoton('publicidad') ?><?php endif; ?>
        <?php if (CLIENTE_JUEGO): ?><?= $navBoton('juego') ?><?php endif; ?>
      </div>
    <?php endif; ?>
    <?php if (DATOS_ACTIVO): ?>
      <div class="adm-sidebar-grupo" data-grupo-negocio>
        <p class="adm-sidebar-rotulo">Negocio</p>
        <?= $navBoton('datos') ?>
      </div>
    <?php endif; ?>
    <div class="adm-sidebar-grupo">
      <p class="adm-sidebar-rotulo">Configuración</p>
      <?= $navBoton('marca') ?>
      <?= $navBoton('ajustes') ?>
    </div>
    <div class="adm-sidebar-pie">
      <?php /* MISE-B, novena ronda: nombre y fecha se suman aquí al aviso de sesión que ya
               vivía en este pie (octava ronda) — mismos datos que el <header>, mismo criterio
               de "sólo a partir de 1024px, que es cuando la barra rotula con texto"; por
               debajo se siguen viendo en el <header> (.head-eyebrow/h1/.sub-sesion), nunca
               desaparecen, sólo cambian de sitio según haya donde ponerlos. */ ?>
      <p class="adm-sidebar-marca"><?= h(CLIENTE_NOMBRE) ?></p>
      <p class="adm-sidebar-fecha"><?= h(dia_semana($hoyReal)) ?>, <?= h((new DateTimeImmutable($hoyReal))->format("d/m/y")) ?></p>
      <p class="adm-sidebar-sesion">
        Servicio en curso<?php if (!$demo): ?> · se cierra en <?= (int) SESION_MINUTOS ?> min<?php endif; ?>
      </p>
      <a class="adm-nav-item" href="?salir=1" aria-label="Salir">
        <svg class="adm-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
        <span class="txt">Salir</span>
        <span class="adm-nav-tooltip" role="tooltip">Salir</span>
      </a>
    </div>
  </nav>

  <?php /* Barra inferior: sólo Platos, Ofertas, Analítica (si hay) y «Más». El resto de
           destinos vive en la hoja, para no meter más de cuatro botones en un pulgar. */ ?>
  <nav class="adm-navmovil" aria-label="Navegación">
    <button type="button" class="adm-navmovil-item<?= $pestana === 'platos' ? ' on' : '' ?>" data-tab="platos" aria-label="Platos" aria-current="<?= $pestana === 'platos' ? 'page' : 'false' ?>">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 12H3"/><path d="M17 18H3"/><path d="M21 6H3"/></svg>
      <span class="txt">Platos</span>
    </button>
    <button type="button" class="adm-navmovil-item<?= $pestana === 'ofertas' ? ' on' : '' ?>" data-tab="ofertas" aria-label="Ofertas" aria-current="<?= $pestana === 'ofertas' ? 'page' : 'false' ?>">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 20.99a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.775a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>
      <span class="txt">Ofertas</span>
    </button>
    <?php if (DATOS_ACTIVO): ?>
      <button type="button" class="adm-navmovil-item<?= $pestana === 'datos' ? ' on' : '' ?>" data-tab="datos" aria-label="Analítica" aria-current="<?= $pestana === 'datos' ? 'page' : 'false' ?>">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
        <span class="txt">Analítica</span>
      </button>
    <?php endif; ?>
    <button type="button" class="adm-navmovil-item" id="btn-mas-movil" aria-haspopup="dialog" aria-controls="sheet-mas" aria-label="Más opciones">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
      <span class="txt">Más</span>
    </button>
  </nav>

  <div class="velo" id="velo-sheet"></div>
  <div class="adm-sheet" id="sheet-mas" role="dialog" aria-modal="true" aria-labelledby="sheet-titulo" aria-hidden="true" inert>
    <div class="adm-sheet-agarre" aria-hidden="true"></div>
    <div class="adm-sheet-cab">
      <h2 id="sheet-titulo">Más</h2>
      <button type="button" id="sheet-cerrar" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
    <div class="adm-sheet-lista">
      <?php if (CLIENTE_PUBLICIDAD): ?>
        <button type="button" class="adm-sheet-item" data-tab="publicidad">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          Publicidad
        </button>
      <?php endif; ?>
      <?php if (CLIENTE_JUEGO): ?>
        <button type="button" class="adm-sheet-item" data-tab="juego">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="12" x="2" y="6" rx="6" ry="6"/><circle cx="8" cy="12" r="2"/></svg>
          Juego
        </button>
      <?php endif; ?>
      <button type="button" class="adm-sheet-item" data-tab="marca">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        Marca
      </button>
      <button type="button" class="adm-sheet-item" data-tab="ajustes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>
        Ajustes
      </button>
      <a class="adm-sheet-item" href="?salir=1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
        Salir
      </a>
    </div>
  </div>


  <?php /* ==================================================== MISE-B: PLATOS (fusión) ==
   * Consolida lo que antes eran tres pestañas —Agotados hoy, Destacados, Precios— más un
   * indicador de solo lectura de Ofertas, en una sola pantalla por plato. Los CUATRO
   * handlers siguen siendo exactamente los de siempre (guardar_agotados,
   * destacado_add/destacado_del, precios_calcular/precios_manual/precios_publicar/
   * precios_reset): esto es recomposición de interfaz, no un endpoint nuevo. Ver SPEC.md.
   *
   * Oferta es la única columna que NO tiene control aquí: es una regla que vive en su
   * propia pantalla (categorías + platos + horario + días), no un dato por plato. El
   * enlace lleva a Ofertas tal cual, sin JavaScript de por medio.
   */ ?>
  <section class="pane" data-pane="platos" role="tabpanel" id="panel-platos" aria-labelledby="navtab-platos"<?= $pestana === 'platos' ? '' : ' hidden' ?>>
    <div class="adm-board">

    <?php if ($previsua): ?>
      <?php /* ------------------------------------------------------------------ revisar
       * Lo que antes era la pantalla «Precios, paso 2»: se relocaliza tal cual, sin tocar
       * ni un campo. Sigue ocupando la pantalla entera mientras está en pantalla —es una
       * subida que toca de golpe hasta 312 platos, y no se quiere ver Platos detrás como si
       * ya estuviera publicado. */ ?>
      <?php
        $pctTxt = $previsua['pct'] === null
          ? null
          : rtrim(rtrim(number_format($previsua['pct'], 2, ',', ''), '0'), ',');
        $porTab = [];
        foreach ($previsua['filas'] as $f) $porTab[$f['tab']][] = $f;
      ?>
      <form method="post" id="precios-form" class="adm-form-suelto">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
      </form>

      <div class="adm-bento">

        <section class="adm-f adm-f-prev">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><?php if ($pctTxt === null): ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg><?php else: ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg><?php endif; ?></span>
            <h2><?= $pctTxt === null ? 'Precios a mano' : 'Subida del ' . h($pctTxt) . '%' ?></h2>
            <span class="der adm-a-prev">
              <span class="adm-f-nota"><?= count($previsua['filas']) ?> platos</span>
            </span>
          </div>
          <p class="hint" data-adm-ayuda="Todavía no se ha publicado nada" data-adm-ancla=".adm-a-prev">
            <?php if ($pctTxt === null): ?>
              Ésta es la lista con los precios que hay puestos ahora mismo. Cambia los que
              quieras y publica; lo que no toques se queda igual.
            <?php else: ?>
              Esto es lo que quedaría con una subida del <?= h($pctTxt) ?>%, ya redondeado a
              múltiplos de 5 céntimos. Cambia los que no te cuadren y publica.
            <?php endif; ?>
            Un precio en blanco devuelve ese plato al precio de la carta. El mismo plato que
            sale en Sin gluten o en Vegano se cambia una vez y las dos filas se mueven solas.
          </p>
          <label class="adm-buscar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
            <input class="adm-campo" type="search" id="precios-filtro" autocomplete="off"
                   placeholder="Buscar un plato por nombre o número" aria-label="Buscar un plato por nombre o número">
          </label>
          <p class="adm-f-nota adm-filtro-cuenta" id="precios-cuenta" role="status" aria-live="polite" hidden></p>
        </section>

        <?php foreach ($porTab as $tab => $filas): ?>
          <section class="adm-f adm-f-ptab" data-tab-precios>
            <div class="adm-f-cab">
              <h2><?= h($tab) ?></h2>
              <span class="der"><span class="adm-f-nota"><?= count($filas) ?></span></span>
            </div>
            <div class="adm-precios">
              <?php foreach ($filas as $f): ?>
                <div class="adm-prow" data-busca="<?= h(minuscula($f['name']) . ' ' . $f['id']) ?>">
                  <span class="adm-prow-n"><?= h($f['id']) ?></span>
                  <span class="adm-prow-nm"><?= h($f['name']) ?></span>
                  <span class="adm-prow-viejo"><?= h(CLIENTE_MONEDA) ?><?= h($f['actual']) ?></span>
                  <input class="adm-campo adm-prow-nuevo" type="text" inputmode="decimal"
                         form="precios-form"
                         name="precio[<?= h($f['key']) ?>]" value="<?= h($f['nuevo']) ?>"
                         <?= isset($hermanas[$f['key']]) ? 'data-plato="' . h($f['name'] . ' ' . $f['carta']) . '"' : '' ?>
                         aria-label="Precio nuevo de <?= h($f['name']) ?>">
                </div>
              <?php endforeach; ?>
            </div>
          </section>
        <?php endforeach; ?>

      </div>

    <?php else: ?>

      <form method="post" id="agotados-form" class="adm-form-suelto">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <input type="hidden" name="guardar_agotados" value="1">
      </form>
      <form method="post" id="precios-form" class="adm-form-suelto">
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <input type="hidden" name="precios_publicar" value="1">
      </form>

      <?php
        $porCategoria = [];
        foreach ($lista as $p) {
          $cid = (string) ($p['catId'] ?? $p['cat']);
          if (!isset($porCategoria[$cid])) {
            $porCategoria[$cid] = ['nombre' => $catsEs[$p['cat']] ?? $p['cat'], 'tab' => $p['tab'], 'platos' => []];
          }
          $porCategoria[$cid]['platos'][] = $p;
        }
      ?>

      <?php /* MISE-B, corrección de paridad con el prototipo v2.1: Platos deja de vivir
               dentro de una ficha con acordeones por categoría —eso era la arquitectura
               antigua de Agotados, reutilizada por comodidad al implementar, y el propio
               propietario la ha rechazado tras revisión visual—. Categoría pasa a ser
               separador + filtro, nunca una puerta que hay que abrir: por defecto, los 312
               platos están servidos y visibles. Ver SPEC.md.

               Bento, tras la prueba en Ofertas: sustituye al separador+lista de arriba por
               el mismo mecanismo ya probado allí — cuarenta fichas, tres por fila, cada una
               con scroll propio en vez de un fuelle que abrir. Cumple la misma regla de
               arriba mejor que el separador: ya no hay ni una puerta que fingir que está
               abierta, no existe el concepto de plegar. */ ?>
      <?php /* El titulo "Platos" y su cifra se retiran: la cabecera fija de arriba ya dice
               en que pantalla estas, y el total vive ahora en la tarjeta "Todos" de las
               cuatro de abajo, que es donde ademas se puede pulsar. Queda el ancla del
               boton de ayuda, que el JavaScript rellena. */ ?>
      <?php /* La ayuda general de Platos se retira entera. Su contenido esta repartido
               donde se usa: cada tarjeta de filtro explica lo suyo, y el aviso de que la
               oferta se cambia en Ofertas vive en la tarjeta "Con oferta". Un boton de
               ayuda suelto al lado del buscador, sin nada que lo explicara, era ruido. */ ?>

      <?php /* Los cuatro filtros de estado, como la rejilla de cuatro tarjetas del
               prototipo: la cifra grande arriba y el rotulo debajo. Siguen siendo los
               MISMOS botones —mismo data-filter, mismo contenedor .adm-chips-estado del
               que cuelga su JavaScript, mismos id de contador (#n-chip-agotados y
               #n-chip-oferta, que actualiza la sincronizacion con Ofertas)—: solo cambia
               como se ven y donde estan. */ ?>
      <div class="adm-chips-estado adm-kpis" role="group" aria-label="Filtrar por estado">
        <button type="button" class="adm-chip adm-kpi" data-filter="todos" aria-pressed="true">
          <span class="adm-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></span>
          <span class="adm-kpi-txt">
            <span class="adm-chip-n adm-kpi-n"><?= count($lista) ?></span>
            <span class="adm-kpi-t">Todos</span>
            <span class="adm-kpi-s">Los que hay en la carta</span>
          </span>
        </button>
        <button type="button" class="adm-chip adm-kpi" data-filter="agotados" aria-pressed="false">
          <span class="adm-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg></span>
          <span class="adm-kpi-txt">
            <span class="adm-chip-n adm-kpi-n" id="n-chip-agotados"><?= count($agotados) ?></span>
            <span class="adm-kpi-t">Agotados</span>
            <span class="adm-kpi-s">Hoy no se pueden pedir. Se limpian solos a las <?= (int) CORTE_HORA ?>:00</span>
          </span>
        </button>
        <button type="button" class="adm-chip adm-kpi" data-filter="destacados" aria-pressed="false">
          <span class="adm-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg></span>
          <span class="adm-kpi-txt">
            <span class="adm-chip-n adm-kpi-n"><?= count($tags) ?></span>
            <span class="adm-kpi-t">Destacados</span>
            <span class="adm-kpi-s">Llevan etiqueta visible en la carta</span>
          </span>
        </button>
        <button type="button" class="adm-chip adm-kpi" data-filter="oferta" aria-pressed="false">
          <span class="adm-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/></svg></span>
          <span class="adm-kpi-txt">
            <span class="adm-chip-n adm-kpi-n" id="n-chip-oferta">0</span>
            <span class="adm-kpi-t">Con oferta</span>
            <span class="adm-kpi-s">La regla se cambia en Ofertas, no aquí</span>
          </span>
        </button>
      </div>


      <div class="adm-platos-filtros">
        <label class="adm-buscar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/></svg>
          <input class="adm-campo" type="search" id="q" autocomplete="off"
                 placeholder="Buscar un plato por nombre o número" aria-label="Buscar un plato por nombre o número">
        </label>
      </div>

      <?php /* MISE-B, tercera ronda: «Ajustar precios %» dejó de ser un <details> que
               reordenaba la pantalla al abrirse — visible desde el primer momento, en una
               única fila. Mismos cinco formularios/handlers de siempre
               (precios_calcular/precios_manual/precios_reset), eso no cambia aquí tampoco:
               siguen siendo exactamente los mismos campos, dentro del mismo <div
               class="adm-ajustar-precios">, sólo que ahora ese div vive dentro de un
               <details> en vez de a la intemperie.

               Auditoría UX/UI, hallazgo H1: en móvil (≤699px, el mismo corte que ya usa el
               resto del panel para "estrecho") esta caja, siempre abierta, apilaba tantas
               filas (etiqueta + 4 botones de porcentaje + el campo "otro %" + "Cambiar precio manual") que
               empujaba la primera fila de plato debajo de la barra de navegación inferior
               fija — medido en la auditoría: a 320px la primera fila quedaba oculta al
               100%, a 390px al 81%. Es una acción de vez en cuando (subir precios en
               bloque), no la tarea diaria (buscar/marcar un plato) — no debería ganarle el
               sitio a la lista en la pantalla más pequeña.

               La solución es un <details> de verdad, no un imitador con JS desde cero: sin
               JavaScript (o con él roto) esta caja se sirve con el atributo `open` puesto,
               así que se ve y funciona exactamente igual que hoy — ni un control deja de
               estar visible ni de funcionar. Con JavaScript, un script mínimo (más abajo,
               junto al resto de scripts de Platos) decide el estado según el ancho real:
               cerrada por defecto en ≤699px, abierta en cualquier otro — y usa
               matchMedia para mantenerlo así si la ventana cambia de tamaño cruzando ese
               corte, no sólo en la carga. En escritorio/tablet, un guardián de un renglón
               evita que un clic accidental en la cabecera la cierre — se queda exactamente
               como estaba, "sin añadir interacción innecesaria". */ ?>
      <details class="adm-ajustar-precios-caja" open>
        <summary class="adm-ajustar-precios-resumen">
          <span class="adm-ajustar-precios-etq">Ajustar precios</span>
          <svg class="adm-ajustar-precios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </summary>
        <div class="adm-ajustar-precios">
          <form method="post" style="display:contents">
            <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
            <input type="hidden" name="precios_calcular" value="1">
            <?php foreach ([3, 5, 10, 15] as $n): ?>
              <button class="adm-pct" name="subir" value="<?= $n ?>" type="submit">+<?= $n ?>%</button>
            <?php endforeach; ?>
          </form>
          <form method="post" class="adm-pct-otro">
            <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
            <span class="adm-pct-mas" aria-hidden="true">+</span>
            <input class="adm-pct-num" type="text" inputmode="decimal" name="subir" size="4"
                   placeholder="7,5" required aria-label="Otro porcentaje de subida">
            <span class="adm-pct-pc" aria-hidden="true">%</span>
            <button class="adm-pct-ir" name="precios_calcular" value="1" type="submit"
                    aria-label="Ver cómo quedaría con ese porcentaje"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button>
          </form>
          <form method="post" style="display:contents">
            <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
            <button class="adm-btn adm-btn-fino adm-ajustar-precios-mano" name="precios_manual" value="1" type="submit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
              Cambiar precio manual
            </button>
          </form>
          <?php if ($precios): ?>
            <form method="post" class="adm-ajustar-precios-volver"
                  onsubmit="return confirm('¿Devolver TODOS los precios a los de la carta? Se pierden los <?= count($precios) ?> cambios y no se puede deshacer desde aquí.')">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <span class="adm-f-nota"><?= count($precios) ?> distinto<?= count($precios) === 1 ? '' : 's' ?> de la carta</span>
              <button class="adm-btn adm-btn-fino adm-btn-quitar" name="precios_reset" value="1" type="submit">Volver a los de la carta</button>
            </form>
          <?php endif; ?>
        </div>
      </details>
      <div class="adm-fila adm-ag-resumen" id="resumen"<?= count($agotados) === 0 ? ' hidden' : '' ?>>
        <span class="adm-fila-que"><span id="n"><?= count($agotados) ?></span> <span id="n-txt"><?= count($agotados) === 1 ? 'plato marcado' : 'platos marcados' ?></span> agotados ahora mismo</span>
        <button type="button" class="adm-btn adm-btn-fino adm-btn-quitar" id="clear-all">Quitar todos</button>
      </div>
      <p class="adm-vacio" id="vacio" hidden>Ningún plato coincide con la búsqueda.</p>

      <?php /* El formulario de etiquetas, compartido por las 312 filas: el JavaScript lo
               mueve debajo de la que se toca. Sin JavaScript no se mueve de aquí y no
               estorba —se elige el plato desde el propio botón «Destacar» igualmente,
               sólo que sin el desplazamiento visual—. */ ?>
      <form method="post" id="dest-et" class="adm-destet" hidden>
        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        <input type="hidden" name="destacado_add" value="1">
        <input type="hidden" name="hl_key" id="dest-et-key" value="">
        <span class="adm-destet-rot">¿Con qué etiqueta?</span>
        <?php foreach (ETIQUETAS as $e): ?>
          <button class="adm-destet-b" name="hl_label" value="<?= h($e) ?>" type="submit"><?= h(ETIQUETAS_ES[$e] ?? $e) ?></button>
        <?php endforeach; ?>
        <button type="button" class="adm-destet-x" id="dest-et-x" aria-label="Cerrar las etiquetas">Cancelar</button>
      </form>

      <div class="adm-bento adm-platos-lista">
        <?php foreach ($porCategoria as $cid => $grupo): ?>
          <section class="adm-f adm-cat-bento" data-cat-bento>
            <div class="adm-cat-bento-cab">
              <span class="adm-cat-bento-nm"><?= h(etiqueta_categoria($grupo['nombre'], $grupo['tab'])) ?></span>
              <span class="adm-cat-bento-n"><?= count($grupo['platos']) ?></span>
            </div>
            <?php
              /* A todo el ancho, la ficha ya no compite en alto con sus vecinas de fila
                 (era una de tres, ahora la única) — se reparte a dos columnas para no
                 desperdiciar ese ancho en una lista angosta. Reparto por CANTIDAD, mitad
                 y mitad (izquierda se lleva el impar de sobra), no por altura calculada:
                 predecible con cualquier dato. */
              $mitadPlatos = (int) ceil(count($grupo['platos']) / 2);
              $columnasPlatos = [
                array_slice($grupo['platos'], 0, $mitadPlatos),
                array_slice($grupo['platos'], $mitadPlatos),
              ];
            ?>
            <div class="adm-ofertas adm-cat-bento-lista">
            <?php foreach ($columnasPlatos as $columnaPlatos): ?>
              <div class="adm-cat-bento-col">
              <?php foreach ($columnaPlatos as $p):
                $k = $p['key'];
                $onAg = isset($agotados[$k]);
                $suFoto = (string) ($fotosPlato[$k] ?? '');
                $etiqueta = $tags[$k] ?? null;
                $tienePrecio = $p['price'] !== '';
                $precioActual = $tienePrecio ? (string) ($estado['prices'][$k] ?? $p['price']) : '';
                $enOferta = $oferta['on'] && (
                  in_array((string) ($p['catId'] ?? ''), (array) $oferta['cats'], true)
                  || in_array($k, (array) $oferta['keys'], true)
                );
              ?>
              <div class="adm-orow adm-platorow<?= $onAg ? ' es-agotado' : '' ?><?= $etiqueta !== null ? ' es-destacado' : '' ?><?= $enOferta ? ' es-oferta' : '' ?>"
                   data-busca="<?= h(minuscula($p['name'] . ' ' . $p['name_en'] . ' ' . $p['id'] . ' ' . $p['sub'])) ?>">
                <button type="button" class="camara<?= $suFoto !== '' ? ' tiene' : '' ?>"
                        data-k="<?= h($k) ?>" data-foto="<?= h($suFoto) ?>"
                        data-nombre="<?= h($p['name']) ?>"
                        title="<?= $suFoto !== '' ? 'Cambiar la foto' : 'Poner foto' ?>"
                        aria-label="<?= $suFoto !== '' ? 'Cambiar la foto de ' : 'Poner foto a ' ?><?= h($p['name']) ?>">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </button>
                <span class="adm-prow-n"><?= h($p['id']) ?></span>
                <span class="adm-orow-nm" title="<?= h($p['name'] . ($p['sub'] !== '' ? ' — ' . $p['sub'] : '') . ($p['name_en'] !== $p['name'] ? ' · ' . $p['name_en'] : '')) ?>"><?= h($p['name']) ?></span>

                <?php /* MISE-B, segunda ronda: grupo operativo único al final —
                         precio · oferta · destacado · agotado—, en vez de agotado suelto al
                         principio. Mismo input, mismo form, mismo handler: sólo cambia dónde
                         vive en la fila. */ ?>
                <span class="adm-plato-acciones">
                  <?php if ($tienePrecio): ?>
                    <input class="adm-campo adm-prow-nuevo" type="text" inputmode="decimal"
                           form="precios-form" name="precio[<?= h($k) ?>]" value="<?= h($precioActual) ?>"
                           <?= isset($hermanas[$k]) ? 'data-plato="' . h($p['name'] . ' ' . $p['price']) . '"' : '' ?>
                           aria-label="Precio de <?= h($p['name']) ?>">
                  <?php else: ?>
                    <span class="adm-prow-fijo adm-plato-incluido">Incluido</span>
                  <?php endif; ?>

                  <?php if ($enOferta): ?>
                    <a class="adm-tag adm-tag-oferta" href="?t=ofertas" title="En oferta — ver la regla de Ofertas"
                       aria-label="<?= h($p['name']) ?> está en oferta — ver la regla de Ofertas">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M17 7L7 17"/></svg>
                    </a>
                  <?php else: ?>
                    <span class="adm-plato-sinoferta" aria-hidden="true">—</span>
                  <?php endif; ?>

                  <?php if ($etiqueta !== null): ?>
                    <?php /* Un solo control percibido: el pill cambia la etiqueta (reabre el
                             mismo selector real), la × la quita — dos acciones, un formulario
                             cada una, sin colisionar con el hl_label del selector. */ ?>
                    <span class="adm-tag-destacado">
                      <button type="button" class="adm-destpick adm-tag-destacado-cambiar"
                              data-k="<?= h($k) ?>" data-id="<?= h($p['id']) ?>" data-nombre="<?= h($p['name']) ?>"
                              title="<?= h(ETIQUETAS_ES[$etiqueta] ?? $etiqueta) ?>"
                              aria-expanded="false" aria-label="Destacado de <?= h($p['name']) ?>: <?= h(ETIQUETAS_ES[$etiqueta] ?? $etiqueta) ?> — cambiar etiqueta"><?= h(ETIQUETAS_ES[$etiqueta] ?? $etiqueta) ?></button>
                      <form method="post" style="display:contents">
                        <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                        <button class="adm-tag-destacado-quitar" name="destacado_del" value="<?= h($k) ?>" type="submit" aria-label="Quitar destacado de <?= h($p['name']) ?>">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </form>
                    </span>
                  <?php else: ?>
                    <button type="button" class="adm-destpick adm-plato-destbtn"
                            data-k="<?= h($k) ?>" data-id="<?= h($p['id']) ?>" data-nombre="<?= h($p['name']) ?>"
                            aria-expanded="false" aria-label="Destacar <?= h($p['name']) ?>">
                      <span class="txt">Destacar</span>
                      <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 20.99a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.775a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>
                    </button>
                  <?php endif; ?>

                  <label class="adm-sw adm-sw-agotado">
                    <input type="checkbox" name="agotado[]" value="<?= h($k) ?>" form="agotados-form"<?= $onAg ? ' checked' : '' ?>
                           <?= isset($hermanas[$k]) ? 'data-plato="' . h($p['name'] . ' ' . $p['price']) . '"' : '' ?>>
                    <span class="adm-sw-pista"><span class="adm-sw-bola"></span></span>
                    <span class="sr">Agotado hoy: <?= h($p['name']) ?></span>
                  </label>
                </span>
              </div>
              <?php endforeach; ?>
              </div>
            <?php endforeach; ?>
            </div>
            <?php /* SocialCard: la ficha muestra tres platos por columna —seis en total— y
                     el resto se despliega desde aqui. Con 312 platos en 41 categorias, la
                     lista completa era un scroll larguisimo antes de llegar a la segunda
                     categoria. El boton solo aparece si de verdad sobra algo. */ ?>
            <?php if (count($grupo['platos']) > 6): $sobran = count($grupo['platos']) - 6; ?>
              <button type="button" class="adm-vermas" data-vermas aria-expanded="false"
                      data-mas="Ver <?= $sobran ?> <?= $sobran === 1 ? 'plato' : 'platos' ?> más" data-menos="Ver menos">
                <span class="adm-vermas-txt">Ver <?= $sobran ?> <?= $sobran === 1 ? 'plato' : 'platos' ?> más</span>
                <svg class="adm-vermas-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            <?php endif; ?>
          </section>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <!-- El recorte de la foto. Una sola capa para los 312 platos: se abre con el plato que se
         haya pulsado y se cierra al terminar. -->
    <div class="recorte" id="recorte" role="dialog" aria-modal="true" aria-labelledby="rec-t">
      <div class="caja">
        <h3 id="rec-t">Foto del plato</h3>
        <p class="quien" id="rec-quien"></p>

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

    <?php if (!$previsua): ?>
    <script>
      /* ---------------------------------------------- plegado de "Ajustar precios" en móvil
       * Auditoría UX/UI, hallazgo H1. Sin JavaScript, `<details open>` deja esto exactamente
       * como estaba: visible siempre, cero controles perdidos. Con JavaScript, el estado se
       * decide por el ancho real (mismo corte de 699px que ya usa el resto del panel), no al
       * cargar una vez nada más: un cambio de tamaño que cruce ese corte (girar una tablet,
       * redimensionar la ventana) lo vuelve a ajustar solo. En ancho de escritorio/tablet, un
       * guardián de un renglón evita que un clic en la cabecera la cierre por accidente —
       * ahí no es un control, es un rótulo fijo, igual que antes de este cambio. */
      (function () {
        var caja = document.querySelector('.adm-ajustar-precios-caja');
        if (!caja) return;
        var mq = window.matchMedia('(max-width:699px)');
        function ajustar(m) { caja.open = !m.matches; }
        ajustar(mq);
        if (mq.addEventListener) mq.addEventListener('change', ajustar);
        else if (mq.addListener) mq.addListener(ajustar);
        var resumen = caja.querySelector('.adm-ajustar-precios-resumen');
        resumen.addEventListener('click', function (e) {
          if (!mq.matches) e.preventDefault();
        });
      })();
    </script>
    <script>
      /* -------------------------------------------------------- buscador y filtro por estado */
      (function () {
        var pane = document.querySelector('.pane[data-pane="platos"]');
        if (!pane) return;
        var formAg = document.getElementById('agotados-form');
        var formPrecio = document.getElementById('precios-form');
        var q = document.getElementById('q');
        var vacio = document.getElementById('vacio');
        /* Bento: cada categoría es una ficha [data-cat-bento] siempre a la vista, con su
           propio scroll — se oculta entera sólo si el filtro le deja cero filas dentro.
           Ya no hay nada que plegar, así que tampoco hay aria-expanded que recalcular. Y
           ya no hay filtro de categoría (se retiró: con las 40 siempre a la vista, saltar
           a una sola dejaba de tener sentido) — sólo texto y chips de estado. */
        var fichas = [].slice.call(pane.querySelectorAll('[data-cat-bento]'));
        var filtro = 'todos';
        var sucio = false;

        function aplicarFiltro() {
          var t = q.value.trim().toLowerCase();
          var total = 0;
          fichas.forEach(function (ficha) {
            var visibles = 0;
            [].slice.call(ficha.querySelectorAll('.adm-orow')).forEach(function (fila) {
              var pasaFiltro = filtro === 'todos'
                || (filtro === 'agotados' && fila.classList.contains('es-agotado'))
                || (filtro === 'destacados' && fila.classList.contains('es-destacado'))
                || (filtro === 'oferta' && fila.classList.contains('es-oferta'));
              var hay = (!t || fila.dataset.busca.indexOf(t) !== -1) && pasaFiltro;
              fila.hidden = !hay;
              if (hay) visibles++;
            });
            ficha.hidden = visibles === 0;
            total += visibles;
          });
          vacio.hidden = total > 0;
          /* Buscando o filtrando se levanta el recorte de tres por columna: un plato que
             coincide no puede quedarse escondido detras de un "Ver mas". Es una clase en
             el contenedor, no un cambio fila a fila: el recorte lo hace el CSS. */
          var lista = pane.querySelector('.adm-platos-lista');
          if (lista) lista.classList.toggle('esta-filtrando', !!t || filtro !== 'todos');
        }
        q.addEventListener('input', aplicarFiltro);

        /* ---- "Ver X platos mas": abre y cierra su propia ficha ----
           Solo pone/quita un atributo en la <section>; quien enseña o esconde las filas
           es el CSS. Sin peticion, sin tocar el marcado de las filas y sin depender de
           cuantas haya. */
        /* document y no pane: el mismo boton existe en Platos y en Ofertas, y asi se
           engancha una sola vez para los dos. */
        [].slice.call(document.querySelectorAll('[data-vermas]')).forEach(function (boton) {
          boton.addEventListener('click', function () {
            var ficha = boton.closest('.adm-cat-bento');
            if (!ficha) return;
            var abierta = ficha.hasAttribute('data-abierto');
            if (abierta) ficha.removeAttribute('data-abierto');
            else ficha.setAttribute('data-abierto', '');
            boton.setAttribute('aria-expanded', String(!abierta));
            var txt = boton.querySelector('.adm-vermas-txt');
            if (txt) txt.textContent = !abierta ? boton.dataset.menos : boton.dataset.mas;
          });
        });

        pane.querySelectorAll('.adm-chips-estado [data-filter]').forEach(function (b) {
          b.addEventListener('click', function () {
            filtro = b.dataset.filter;
            pane.querySelectorAll('.adm-chips-estado [data-filter]').forEach(function (o) {
              o.setAttribute('aria-pressed', String(o === b));
            });
            aplicarFiltro();
          });
        });

        var nChipOferta = document.getElementById('n-chip-oferta');
        if (nChipOferta) nChipOferta.textContent = pane.querySelectorAll('.adm-orow.es-oferta').length;

        /* V7: cuenta PLATOS, no casillas. Un plato puede tener DOS casillas en esta misma
           pantalla —una en su categoría y otra en la lista de agotados—, y marcarHermanas
           las sincroniza a propósito; contando casillas, marcar un plato ponía «2 platos
           agotados». Se cuentan identificadores distintos (data-plato); si alguna casilla
           no lo trae, cuenta como una suya y no se pierde del recuento. */
        function agotadosDistintos() {
          var vistos = Object.create(null), n = 0, i = 0;
          pane.querySelectorAll('input[name="agotado[]"]:checked').forEach(function (cb) {
            var id = cb.dataset.plato || ('#sin-id-' + (i++));
            if (vistos[id]) return;
            vistos[id] = true; n++;
          });
          return n;
        }

        function refrescar() {
          var n = agotadosDistintos();
          var nEl = document.getElementById('n');
          if (nEl) nEl.textContent = n;
          var nTxt = document.getElementById('n-txt');
          if (nTxt) nTxt.textContent = n === 1 ? 'plato marcado' : 'platos marcados';
          var resumen = document.getElementById('resumen');
          if (resumen) resumen.hidden = n === 0;
          var nChip = document.getElementById('n-chip-agotados');
          if (nChip) nChip.textContent = n;
          var c = document.querySelector('.adm-acciones-fuera[data-para="platos"] .adm-acciones-estado');
          if (c) c.textContent = (n === 1 ? '1 plato agotado' : n + ' platos agotados') + (sucio ? ' · guardando…' : '');
        }

        function marcarHermanas(cb) {
          var plato = cb.dataset.plato;
          if (!plato) return;
          pane.querySelectorAll('input[name="agotado[]"][data-plato="' + plato.replace(/"/g, '\\"') + '"]')
            .forEach(function (otra) {
              if (otra === cb || otra.checked === cb.checked) return;
              otra.checked = cb.checked;
              var suFila = otra.closest('.adm-orow');
              if (suFila) suFila.classList.toggle('es-agotado', otra.checked);
            });
        }

        /* Autosubmit: cada click en Agotado envía el estado COMPLETO de las 312 casillas por
           detrás (fetch), igual contrato que el botón «Guardar cambios» de siempre —
           guardar_agotados sigue reemplazando el array entero, así que hace falta mandarlo
           entero, y con todas las filas siempre en el DOM (el buscador sólo las oculta con
           CSS) el fetch nunca puede perder una marca por no estar montada. Sin JavaScript la
           casilla se queda marcada y el botón «Guardar cambios» de fuera hace exactamente lo
           mismo, en una vuelta de página. */
        /* Cierre funcional MISE-B, punto 3: `alGuardarBien`/`alFallar` son nuevos y
           opcionales — las llamadas de siempre (2 argumentos) se comportan exactamente
           igual. Sirven para que quien llame pueda quedarse con el último conjunto
           CONFIRMADO por el servidor y, si falla, deshacer hasta ese mismo conjunto —
           nunca el optimista que se pintó antes de saber si el guardado salía bien. */
        function enviarFormulario(form, entradaSucia, alGuardarBien, alFallar) {
          if (!window.fetch) { form.submit(); return; }
          entradaSucia(true);
          var datos = new FormData(form);
          fetch(location.pathname, { method: 'POST', body: datos, credentials: 'same-origin' })
            .then(function (r) { if (!r.ok) throw new Error('http'); })
            .then(function () {
              entradaSucia(false);
              if (alGuardarBien) alGuardarBien();
              if (window.toast) toast('Guardado.', 'ok');
            })
            .catch(function () {
              entradaSucia(false);
              if (alFallar) alFallar();
              if (window.toast) toast('No se ha podido guardar. Comprueba la conexión.', 'bad');
            });
        }

        /* El conjunto de claves agotadas tal y como lo confirmó el servidor la última vez
           — al cargar, es justo lo que el propio PHP acaba de pintar marcado. Sólo se
           mueve cuando un guardado termina bien; un fallo restaura la interfaz ENTERA
           (casillas, .es-agotado, contador, resumen, chip) a este mismo conjunto, nunca
           al optimista a medio camino. */
        var agotadosConfirmados = [].slice.call(pane.querySelectorAll('input[name="agotado[]"]:checked'))
          .map(function (cb) { return cb.value; });
        function clavesAgotadasActuales() {
          return [].slice.call(pane.querySelectorAll('input[name="agotado[]"]:checked'))
            .map(function (cb) { return cb.value; });
        }
        function restaurarAgotados(claves) {
          var deben = {};
          claves.forEach(function (k) { deben[k] = true; });
          pane.querySelectorAll('input[name="agotado[]"]').forEach(function (cb) {
            var debeEstar = !!deben[cb.value];
            if (cb.checked === debeEstar) return;
            cb.checked = debeEstar;
            var fila = cb.closest('.adm-orow');
            if (fila) fila.classList.toggle('es-agotado', debeEstar);
          });
          refrescar();
        }

        var envioPendiente = null;
        pane.addEventListener('change', function (e) {
          if (!e.target || e.target.name !== 'agotado[]') return;
          var fila = e.target.closest('.adm-orow');
          if (fila) fila.classList.toggle('es-agotado', e.target.checked);
          marcarHermanas(e.target);
          refrescar();
          sucio = true;
          clearTimeout(envioPendiente);
          envioPendiente = setTimeout(function () {
            enviarFormulario(formAg, function (v) { sucio = v; refrescar(); },
              function () { agotadosConfirmados = clavesAgotadasActuales(); },
              function () { restaurarAgotados(agotadosConfirmados); });
          }, 250);
        });

        document.getElementById('clear-all').addEventListener('click', function () {
          var marcados = pane.querySelectorAll('input[name="agotado[]"]:checked');
          if (!marcados.length) return;
          if (!window.confirm('¿Quitar los ' + marcados.length + ' agotados?')) return;
          marcados.forEach(function (cb) {
            cb.checked = false;
            cb.closest('.adm-orow').classList.remove('es-agotado');
          });
          refrescar();
          aplicarFiltro();
          clearTimeout(envioPendiente);
          enviarFormulario(formAg, function (v) { sucio = v; refrescar(); },
            function () { agotadosConfirmados = clavesAgotadasActuales(); },
            function () { restaurarAgotados(agotadosConfirmados); aplicarFiltro(); });
        });

        /* El precio autosubmite al salir del campo (blur / Enter), no en cada tecla: escribir
           «9» antes de «9,50» no debe publicar un precio de 9€ a medio escribir.

           Cierre funcional MISE-B, punto 4: `precios_publicar` NO se toca (sigue siendo la
           autoridad, sigue re-validando por su cuenta) — todo esto es una guardia delante,
           para que un valor que ya se sabe malo ni salga de aquí. `dataset.confirmado`
           guarda, por campo, el último valor que el servidor SÍ confirmó (empieza siendo
           el que el propio PHP acaba de pintar); un valor inválido, o un guardado que
           falla, vuelve ahí — nunca se queda enseñando lo que se intentó mandar. */
        var preciosNuevos = [].slice.call(pane.querySelectorAll('.adm-prow-nuevo'));
        preciosNuevos.forEach(function (el) { el.dataset.confirmado = el.value; });

        function precioValido(crudo) {
          var v = crudo.trim().replace(',', '.');
          if (v === '') return true; // vacío = precio base, comportamiento de siempre
          return /^\d+(\.\d+)?$/.test(v) && parseFloat(v) > 0;
        }

        var envioPrecio = null;
        var preciosPendientes = [];
        pane.addEventListener('change', function (e) {
          if (!e.target || !e.target.classList || !e.target.classList.contains('adm-prow-nuevo')) return;
          var input = e.target;
          if (!precioValido(input.value)) {
            input.value = input.dataset.confirmado || '';
            return;
          }
          var afectados = [input];
          var plato = input.dataset.plato;
          if (plato) {
            pane.querySelectorAll('.adm-prow-nuevo[data-plato="' + plato.replace(/"/g, '\\"') + '"]')
              .forEach(function (otro) { if (otro !== input) { otro.value = input.value; afectados.push(otro); } });
          }
          afectados.forEach(function (el) { if (preciosPendientes.indexOf(el) === -1) preciosPendientes.push(el); });

          clearTimeout(envioPrecio);
          envioPrecio = setTimeout(function () {
            var lote = preciosPendientes;
            preciosPendientes = [];
            enviarFormulario(formPrecio, function () {},
              function () { lote.forEach(function (el) { el.dataset.confirmado = el.value; }); },
              function () { lote.forEach(function (el) { el.value = el.dataset.confirmado || ''; }); });
          }, 200);
        });

        window.addEventListener('beforeunload', function (e) {
          if (!sucio) return;
          e.preventDefault();
          e.returnValue = '';
        });
      })();
    </script>

    <script>
      /* ---------------------------------------------------------------- foto del plato
       * Idéntico al de siempre: todo el trabajo pesado lo hace el navegador (recorta a
       * 1000x1000, comprime a WebP) y sube por fetch a foto_accion, sin pasar por ningún
       * Guardar. Sólo cambia el formulario del que lee el CSRF (ahora agotados-form vive en
       * Platos, con el mismo id de siempre). */
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
        var formCsrf = document.getElementById('agotados-form');
        if (!capa || !file || !formCsrf) return;
        var campoCsrf = formCsrf.querySelector('input[name=csrf]');
        var csrf = campoCsrf ? campoCsrf.value : '';

        var ctx = lienzo.getContext('2d');
        var boton = null;
        var st = null;
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

        function encajar() {
          var min = Math.max(DIM / st.img.width, DIM / st.img.height);
          st.minEscala = min;
          if (st.escala < min) st.escala = min;
          var w = st.img.width * st.escala, h = st.img.height * st.escala;
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

        function cargar(f) {
          error('');
          if (!f) return;
          if (f.size > MAX_ORIGINAL) {
            error('Esa foto pesa ' + Math.round(f.size / 1048576) + ' MB y es demasiado grande para '
                + 'abrirla aqui. Mandatela por WhatsApp y sube la que llega, que viene mas ligera.');
            return;
          }
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
          var razon = DIM / caja.getBoundingClientRect().width;
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

        function exportar() {
          var calidades = [0.82, 0.77, 0.72, 0.67, 0.62, 0.57, 0.52];
          var i = 0;
          return new Promise(function (resolver, rechazar) {
            (function probar() {
              if (i >= calidades.length) { rechazar(new Error('grande')); return; }
              lienzo.toBlob(function (blob) {
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
          bGuardar.textContent = 'Guardando…';
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
            actual.setAttribute('aria-label', 'Cambiar la foto de ' + (actual.dataset.nombre || ''));
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
            actual.setAttribute('aria-label', 'Poner foto a ' + (actual.dataset.nombre || ''));
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

        document.addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('.camara') : null;
          if (!b) return;
          e.preventDefault();
          boton = b;
          ultimoFoco = b;
          quienEl.textContent = b.dataset.nombre || '';
          error('');
          if (b.dataset.foto) {
            imgEl.src = '../' + <?= json_encode(FOTOS_URL) ?> + b.dataset.foto + '?t=' + Date.now();
            imgEl.alt = b.dataset.nombre || '';
            abrir('actual');
          } else {
            file.click();
          }
        });
      })();
    </script>

    <script>
      /* -------------------------------------------------- combobox y selector de Destacar
       * Adaptado del que tenía la antigua pestaña Destacados: mismo buscador con teclado,
       * mismo formulario compartido #dest-et movido junto al plato que se toca. Sólo cambia
       * el selector del pane (ahora «platos») y el ancla del formulario compartido, que
       * ahora cuelga de la fila entera (.adm-platorow) y no de un botón suelto, para que se
       * vea pegado a la fila y no a mitad de sus controles. */
      (function () {
        var pane = document.querySelector('.pane[data-pane="platos"]');
        if (!pane) return;
        function etiquetasForm() { return document.getElementById('dest-et'); }
        function cerrarEtiquetas() {
          var etForm = etiquetasForm();
          if (etForm) etForm.hidden = true;
          pane.querySelectorAll('.adm-destpick.es-elegido').forEach(function (o) {
            o.classList.remove('es-elegido');
            o.setAttribute('aria-expanded', 'false');
          });
        }
        pane.addEventListener('click', function (e) {
          if (e.target.closest('#dest-et')) return;
          var b = e.target.closest('.adm-destpick');
          if (!b) { cerrarEtiquetas(); return; }
          var yaAbierto = b.classList.contains('es-elegido');
          cerrarEtiquetas();
          if (yaAbierto) return;

          b.classList.add('es-elegido');
          b.setAttribute('aria-expanded', 'true');
          var etForm = etiquetasForm();
          if (etForm) {
            document.getElementById('dest-et-key').value = b.dataset.k;
            var fila = b.closest('.adm-platorow') || b;
            fila.insertAdjacentElement('afterend', etForm);
            etForm.hidden = false;
            var primera = etForm.querySelector('.adm-destet-b');
            if (primera) primera.focus({ preventScroll: true });
          }
        });
        pane.addEventListener('click', function (e) {
          if (e.target.id === 'dest-et-x') cerrarEtiquetas();
        });
        document.addEventListener('keydown', function (e) {
          var etForm = etiquetasForm();
          if (e.key === 'Escape' && etForm && !etForm.hidden) cerrarEtiquetas();
        });
      })();
    </script>
    <?php endif; ?>

    </div>
  </section>

  <?php /* ================================================================ ofertas, en bento ==
   * La pestaña más grande del panel: un interruptor, un descuento, una franja horaria, siete
   * días, cuarenta categorías y 312 platos. En una columna era un rollo de papel.
   *
   * Arriba, una ficha con toda la decisión: estado, descuento, horas y días. Debajo, las
   * categorías enteras, sueltas y a la vista. Y al final los platos, plegados en un acordeón
   * por categoría, que es lo único que de verdad hacía scroll.
   *
   * Fase 2: ya no hay nada que dependa de bajar hasta «Guardar cambios» — cada control
   * autoguarda el suyo (oferta_pct_guardar / oferta_horario_guardar / oferta_dias_guardar /
   * oferta_estado_toggle / oferta_cat_toggle / oferta_plato_toggle, todos más abajo).
   * «Guardar cambios» y form="ofertas-form" NO se retiran: siguen siendo el camino
   * completo de siempre, y con JavaScript sin inicializar o desactivado son la ÚNICA
   * forma de guardar — todos los campos siguen llevando form="ofertas-form" a propósito.
   * Con JS, ese botón pasa a ser un respaldo que nunca hace falta pulsar.
   */ ?>
  <?php
    $ofEstado = !$oferta['on'] ? 'APAGADA' : ($oferta_corriendo ? 'CORRIENDO' : 'PROGRAMADA');
    $ofClase  = !$oferta['on'] ? 'adm-e-desactivado' : ($oferta_corriendo ? 'adm-e-activo' : 'adm-e-programado');
  ?>
  <section class="pane" data-pane="ofertas" role="tabpanel" id="panel-ofertas" aria-labelledby="tab-ofertas"<?= $pestana === 'ofertas' ? '' : ' hidden' ?>>
    <div class="adm-board">
      <div class="adm-bento">

        <form method="post" id="ofertas-form" class="adm-form-suelto">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        </form>

        <?php /* ---------------------------------------------------------------- la oferta
         * Estado, descuento, horas y días en UNA ficha. Estaban en tres y no hacía falta: una
         * oferta del 25% de 17:00 a 19:00 los lunes y martes es una sola frase, y leerla
         * saltando entre cajas es leerla a trozos. Los cuatro controles van en una fila con
         * su rótulo encima, así que se lee de izquierda a derecha como se dice.
         */ ?>
        <section class="adm-f adm-f-ooferta">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/></svg></span>
            <h2>La oferta</h2>
            <span class="der adm-a-oferta">
              <span class="adm-estado <?= $ofClase ?>"><?= $ofEstado ?></span>
            </span>
          </div>

          <?php /* SocialCard V4: el interruptor maestro sale del <details>.
                   Vivia dentro de "Configurar oferta", asi que en movil —donde ese bloque
                   se pliega— encender o apagar la oferta exigia desplegar la configuracion
                   entera. Es la accion mas frecuente de esta pantalla y la segunda en la
                   jerarquia, detras del estado: ahora esta siempre a la vista, justo debajo
                   del titulo y de la insignia.
                   Es un cambio de SITIO en el marcado, no de control: mismo <input>, mismo
                   name="oferta_on", mismo form, mismo `.adm-sw` alrededor. El JS lo busca
                   por `input[name="oferta_on"]` y sube con `closest('.adm-sw')`, asi que
                   sigue encontrandolo igual, y repintarEstadoOferta sigue apuntando dentro
                   de .adm-f-ooferta. Cero cambios de contrato. */ ?>
          <div class="adm-oferta-maestro">
            <span class="adm-lbl" id="of-rot-on">Estado</span>
            <label class="adm-sw adm-sw-alto">
              <input type="checkbox" name="oferta_on" value="1" form="ofertas-form" aria-labelledby="of-rot-on"<?= $oferta['on'] ? ' checked' : '' ?>>
              <span class="adm-sw-pista"><span class="adm-sw-bola"></span></span>
              <span class="adm-sw-txt" data-on="Encendida" data-off="Apagada"><?= $oferta['on'] ? 'Encendida' : 'Apagada' ?></span>
            </label>
          </div>
          <p class="hint" data-adm-ayuda="Cómo funciona la oferta" data-adm-ancla=".adm-a-oferta">
            Un descuento que se enciende y se apaga solo a la hora que digas, en hora canaria y
            no en la del móvil del cliente. En la carta sale el precio rebajado arriba, el de
            siempre tachado debajo, y una etiqueta roja al lado del número. «Hasta 12:00» quiere
            decir que la última hora con descuento es las 11:59. «Encendida» aquí y «no se ve
            nada» en la web sólo parecen contradecirse hasta que alguien dice la hora en voz
            alta: la frase de debajo del interruptor la dice.
          </p>

          <?php /* La oferta entera es UNA regla y se lee como una frase: «un 25%, de 17:00 a
                   19:00, lunes y martes, encendida». Por eso va en una sola fila y en ese
                   orden — el interruptor al final, porque encender es lo último que se hace,
                   no lo primero. Las dos horas son UN dato, un rango, y van juntas con su
                   flecha: separadas por el mismo hueco que lo demás se leían como dos campos
                   sin relación.

                   Y la frase del reloj cierra la ficha a todo el ancho, con su filete: es un
                   dato de lo que está pasando —no el pie de ningún control— y hace juego con
                   el chip de la cabecera, que dice lo mismo en una palabra. Debajo del
                   interruptor estiraba su columna y dejaba las otras tres cojas.

                   Auditoría UX/UI, hallazgo H3, Fase 2: en móvil (≤560px, ver el <details>
                   mismo, más abajo, para la medida que justifica ese corte) esta fila de
                   cuatro grupos se apila en hasta cuatro pisos (712px medidos a 320px de
                   ancho, con la primera categoría de "Platos sueltos" recién a y=1115) —
                   configuración que se toca de vez en cuando, por delante de la tarea diaria
                   (elegir platos). El estado (icono, insignia y la frase de abajo,
                   `.adm-regla-pie`) NUNCA se pliega — sólo esto, la configuración detallada,
                   dentro de un <details> de verdad: sin JavaScript queda abierto, exactamente
                   como hoy. */ ?>
          <details class="adm-oferta-config" open>
            <summary class="adm-oferta-config-resumen">
              <span class="adm-oferta-config-etq">Configurar oferta</span>
              <svg class="adm-oferta-config-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
          <div class="adm-regla">
            <div class="adm-regla-g">
              <label class="adm-lbl" for="of-pct">Descuento</label>
              <div class="adm-pct-otro adm-dto">
                <input class="adm-pct-num" id="of-pct" type="number" name="pct" form="ofertas-form"
                       min="1" max="90" step="1" size="3" required
                       value="<?= (int) $oferta['percent'] ?>" aria-label="Descuento en porcentaje">
                <span class="adm-pct-pc" aria-hidden="true">%</span>
              </div>
            </div>

            <div class="adm-regla-g">
              <span class="adm-lbl" id="of-rot-horas">Horario <span class="opt">(hora de Canarias)</span></span>
              <div class="adm-rango" role="group" aria-labelledby="of-rot-horas">
                <input class="adm-campo" id="of-desde" type="time" name="desde" form="ofertas-form"
                       value="<?= h(hhmm((int) $oferta['from'])) ?>" required aria-label="Desde">
                <span class="adm-rango-f" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8L22 12L18 16"/><path d="M2 12H22"/></svg></span>
                <input class="adm-campo" id="of-hasta" type="time" name="hasta" form="ofertas-form"
                       value="<?= h(hhmm((int) $oferta['to'])) ?>" required aria-label="Hasta, no incluida">
              </div>
            </div>

            <?php /* Siete círculos con la inicial y, al final, «Semanal»: el atajo de la
                     oferta que corre todos los días, que es la mitad de los casos. */ ?>
            <div class="adm-regla-g adm-regla-dias">
              <span class="adm-lbl" id="of-rot-dias">Días</span>
              <div class="adm-dias" role="group" aria-labelledby="of-rot-dias">
                <?php foreach (DIAS as $n => $nombre): ?>
                  <label class="adm-dia">
                    <input type="checkbox" name="dia[]" value="<?= (int) $n ?>" form="ofertas-form"<?= in_array($n, (array) $oferta['days'], true) ? ' checked' : '' ?>>
                    <span aria-hidden="true"><?= h(mayuscula(recorte($nombre, 0, 1))) ?></span>
                    <span class="sr"><?= h($nombre) ?></span>
                  </label>
                <?php endforeach; ?>
                <button type="button" class="adm-dia-semanal" id="of-semanal"
                        aria-pressed="<?= count((array) $oferta['days']) === count(DIAS) ? 'true' : 'false' ?>">Semanal</button>
              </div>
            </div>

          </div>
          </details>

          <p class="adm-regla-pie">
            <?php if (!$oferta['on']): ?>
              En la carta no hay ningún descuento.
            <?php elseif ($oferta_corriendo): ?>
              Corriendo ahora mismo en la carta.
            <?php else: ?>
              Fuera de su horario: ahora no se ve en la carta.
            <?php endif; ?>
            En Canarias son las <?= h($ahora_canarias->format('H:i')) ?> del
            <?= h(minuscula(dia_semana($ahora_canarias->format('Y-m-d')))) ?>.
          </p>
        </section>
        <?php /* MISE-B, prueba bento: la ficha "Categorías enteras" se retira — el
                 selector de categoría entera se muda a la cabecera de cada ficha, ahí
                 donde ya se ven sus platos, en vez de en una rejilla aparte que había que
                 relacionar a ojo con la lista de abajo. Mismo checkbox `cat[]`, mismo
                 oferta_cat_toggle, mismo autoguardado: sólo cambia dónde vive. */ ?>

        <?php /* --------------------------------------------------------- platos sueltos */ ?>
        <section class="adm-f adm-f-osueltos">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg></span>
            <h2>Platos sueltos</h2>
            <span class="der">
              <span class="vp-per" role="group" aria-label="Filtro">
                <button type="button" data-ofiltro="todos" aria-pressed="true">Todos</button>
                <button type="button" data-ofiltro="marcados" aria-pressed="false">Sólo marcados</button>
              </span>
            </span>
          </div>
          <label class="adm-buscar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
            <input class="adm-campo" type="search" id="qo" autocomplete="off"
                   placeholder="Buscar un plato por nombre o número" aria-label="Buscar un plato por nombre o número">
          </label>
          <p class="adm-vacio" id="ovacio" hidden>Ningún plato coincide con la búsqueda.</p>
        </section>

        <?php /* ------------------------------------------- los platos, por categoría
         * PRUEBA (sin acordeón): 312 filas repartidas en cuarenta fichas de bento, tres
         * por fila, TODAS a la vista de golpe — nada que abrir ni cerrar. Cada ficha lleva
         * su propia lista con scroll interno (~10 platos visibles, el resto se desplaza
         * dentro de la ficha) para que una categoría de 40 no empuje a las demás pantalla
         * abajo. El resumen sigue diciendo cuántos hay y cuántos están dentro de la
         * oferta — ya no hay un acordeón cerrado que esconder, pero la cifra sigue
         * ahorrando contarlos a ojo. Y la pestaña de la carta va al lado del nombre porque
         * los nombres de categoría se repiten: hay «Sopas» en más de una.
         *
         * El buscador ya no necesita abrir nada (todo está siempre visible): sólo oculta
         * filas y, si una ficha se queda sin ninguna, la ficha entera.
         */ ?>
        <?php
          $porCategoria = [];
          foreach ($lista as $p) {
            /* Sin precio, la oferta no aplica — no hay nada que descontar. Se descarta
               aquí, a la entrada: una categoría que sólo tuviera platos sin precio no
               llega a tener ficha (nunca se le añade ni un plato), y no hace falta
               esconderla aparte. */
            if ($p['price'] === '') continue;
            $cid = (string) ($p['catId'] ?? $p['cat']);
            if (!isset($porCategoria[$cid])) {
              $porCategoria[$cid] = [
                'nombre' => $catsEs[$p['cat']] ?? $p['cat'],
                'tab'    => $p['tab'],
                'platos' => [],
              ];
            }
            $porCategoria[$cid]['platos'][] = $p;
          }
        ?>
        <?php foreach ($porCategoria as $cid => $grupo):
          $catMarcada = in_array($cid, (array) $oferta['cats'], true);
          /* OJO con el nombre: aqui habia un $dentro y $dentro es el flag de sesion del panel
             ($dentro = !empty($_SESSION['ok'])). Al pisarlo, el <?php if ($dentro) ?> del final
             del fichero pasaba a evaluar un entero y la pagina se quedaba sin su ultimo bloque
             —la capa de ayudas y el script del sistema— sin dar ni un error. */
          $enOferta = 0;
          foreach ($grupo['platos'] as $p) {
            if ($catMarcada || in_array($p['key'], (array) $oferta['keys'], true)) $enOferta++;
          } ?>
          <section class="adm-f adm-cat-bento" data-cat-bento<?= $enOferta > 0 ? ' data-con-marcas' : '' ?>>
            <div class="adm-cat-bento-cab">
              <span class="adm-cat-bento-nm"><?= h(etiqueta_categoria($grupo['nombre'], $grupo['tab'])) ?></span>
              <?php if ($enOferta > 0): ?>
                <span class="adm-cat-bento-marca" data-dentro><?= (int) $enOferta ?> en oferta</span>
              <?php endif; ?>
              <span class="adm-cat-bento-n"><?= count($grupo['platos']) ?></span>
            </div>
            <?php
              $mitadPlatos = (int) ceil(count($grupo['platos']) / 2);
              $columnasPlatos = [
                array_slice($grupo['platos'], 0, $mitadPlatos),
                array_slice($grupo['platos'], $mitadPlatos),
              ];
            ?>
            <div class="adm-ofertas adm-cat-bento-lista">
            <?php foreach ($columnasPlatos as $columnaPlatos): ?>
              <div class="adm-cat-bento-col">
              <?php foreach ($columnaPlatos as $p):
                $porCat = $catMarcada;
                $suelto = in_array($p['key'], (array) $oferta['keys'], true); ?>
                <div class="adm-orow<?= $porCat ? ' por-categoria' : '' ?><?= $suelto ? ' es-oferta' : '' ?>"
                     data-cat="<?= h($cid) ?>"
                     data-busca="<?= h(minuscula($p['name'] . ' ' . $p['name_en'] . ' ' . $p['id'] . ' ' . $p['sub'])) ?>">
                  <span class="adm-prow-n"><?= h($p['id']) ?></span>
                  <span class="adm-orow-nm"><?= h($p['name']) ?><?php if ($porCat): ?><small>Toda la categoría</small><?php endif; ?></span>
                  <span class="adm-prow-fijo"><?= h(CLIENTE_MONEDA) . h($p['price']) ?></span>
                  <label class="adm-sw adm-sw-oferta" title="<?= $porCat ? 'Ya incluido por su categoría' : ($suelto ? 'Quitar de la oferta' : 'Meter en la oferta') ?>">
                    <input type="checkbox" name="oferta_plato[]" value="<?= h($p['key']) ?>" form="ofertas-form"
                           <?= $suelto ? ' checked' : '' ?><?= $porCat ? ' disabled' : '' ?>
                           aria-label="<?= h($p['name']) ?> en oferta">
                    <span class="adm-sw-pista"><span class="adm-sw-bola"></span></span>
                  </label>
                </div>
              <?php endforeach; ?>
              </div>
            <?php endforeach; ?>
            </div>
            <?php /* Mismo pie que en Platos: tres por columna y el resto detras del
                     desplegable. */ ?>
            <?php if (count($grupo['platos']) > 6): $sobran = count($grupo['platos']) - 6; ?>
              <button type="button" class="adm-vermas" data-vermas aria-expanded="false"
                      data-mas="Ver <?= $sobran ?> <?= $sobran === 1 ? 'plato' : 'platos' ?> más" data-menos="Ver menos">
                <span class="adm-vermas-txt">Ver <?= $sobran ?> <?= $sobran === 1 ? 'plato' : 'platos' ?> más</span>
                <svg class="adm-vermas-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            <?php endif; ?>
          </section>
        <?php endforeach; ?>

      </div>
    </div>

    <script>
      /* ------------------------------------------- plegado de "Configurar oferta" en móvil
       * Hallazgo H3, Fase 2. Mismo patrón que "Ajustar precios" en Platos (H1): sin
       * JavaScript, `<details open>` deja esto exactamente como estaba — visible siempre,
       * cero controles perdidos. Con JavaScript, el estado se decide por el ancho real
       * (560px, medido — ver el comentario junto a la regla CSS), con un listener de
       * `change` (no sólo al cargar) para que un cambio de tamaño que cruce ese corte lo
       * reajuste solo. En escritorio/tablet, un guardián de un renglón evita que un clic
       * en la cabecera la cierre por accidente — ahí no es un control, ni siquiera se ve. */
      (function () {
        var caja = document.querySelector('.adm-oferta-config');
        if (!caja) return;
        var mq = window.matchMedia('(max-width:560px)');
        function ajustar(m) { caja.open = !m.matches; }
        ajustar(mq);
        if (mq.addEventListener) mq.addEventListener('change', ajustar);
        else if (mq.addListener) mq.addListener(ajustar);
        var resumen = caja.querySelector('.adm-oferta-config-resumen');
        resumen.addEventListener('click', function (e) {
          if (!mq.matches) e.preventDefault();
        });
      })();
    </script>

    <script>
      /* El buscador y el filtro de la lista de la oferta.
         Los controles ya no cuelgan del <form> —viajan con form="ofertas-form"—, así que el
         oyente va en el pane: un listener en el formulario no vería ni un cambio. */
      (function () {
        var pane = document.querySelector('.pane[data-pane="ofertas"]');
        var q = document.getElementById('qo');
        if (!pane || !q) return;
        var vacio = document.getElementById('ovacio');
        var fichas = [].slice.call(pane.querySelectorAll('[data-cat-bento]'));
        var filtro = 'todos';

        function aplicar() {
          var t = q.value.trim().toLowerCase();
          var total = 0;
          fichas.forEach(function (ficha) {
            var visibles = 0;
            [].slice.call(ficha.querySelectorAll('.adm-orow')).forEach(function (fila) {
              var marcado = fila.classList.contains('es-oferta') || fila.classList.contains('por-categoria');
              var hay = (!t || fila.dataset.busca.indexOf(t) !== -1)
                     && (filtro === 'todos' || marcado);
              fila.hidden = !hay;
              if (hay) visibles++;
            });
            ficha.hidden = visibles === 0;
            total += visibles;
          });
          vacio.hidden = total > 0;
          /* Mismo criterio que en Platos: buscando o filtrando se levanta el recorte de
             tres por columna, o un plato que coincide se quedaria detras del "Ver mas". */
          var lista = pane.querySelector('.adm-bento');
          if (lista) lista.classList.toggle('esta-filtrando', !!t || filtro !== 'todos');
        }
        q.addEventListener('input', aplicar);

        pane.querySelectorAll('[data-ofiltro]').forEach(function (b) {
          b.addEventListener('click', function () {
            filtro = b.dataset.ofiltro;
            pane.querySelectorAll('[data-ofiltro]').forEach(function (o) {
              o.setAttribute('aria-pressed', String(o === b));
            });
            aplicar();
          });
        });

        function contar() {
          var n = pane.querySelectorAll('input[name="oferta_plato[]"]:checked').length;
          var c = document.querySelector('.adm-acciones-fuera[data-para="ofertas"] .adm-acciones-estado');
          if (c) c.textContent = n === 1 ? '1 plato suelto en oferta' : n + ' platos sueltos en oferta';
          /* La insignia de cada ficha: con quince platos visibles y el resto con scroll
             dentro, la cifra dice lo que hay marcado sin tener que desplazarse a mirar. */
          fichas.forEach(function (ficha) {
            var dentro = [].slice.call(ficha.querySelectorAll('.adm-orow'))
              .filter(function (f) { return f.classList.contains('es-oferta') || f.classList.contains('por-categoria'); }).length;
            var ins = ficha.querySelector('[data-dentro]');
            ficha.toggleAttribute('data-con-marcas', dentro > 0);
            if (ins) { ins.hidden = dentro === 0; ins.textContent = dentro + ' en oferta'; }
          });
        }

        /* "Semanal" selecciona los siete días; nunca los desmarca (ver el listener, más
           abajo, y su comentario propio). */
        var semanal = document.getElementById('of-semanal');
        function pintarSemanal() {
          var dias = [].slice.call(pane.querySelectorAll('input[name="dia[]"]'));
          var todos = dias.length > 0 && dias.every(function (d) { return d.checked; });
          if (semanal) semanal.setAttribute('aria-pressed', String(todos));
        }

        /* Autoguardado de categorías y platos sueltos: NUNCA el ofertas-form completo — ese
           manda también pct/horas/días/on, y marcar un plato no puede publicar de rebote un
           porcentaje a medio escribir. oferta_cat_toggle/oferta_plato_toggle (servidor) tocan
           un solo campo cada uno.

           Cola en vez de fetch suelto: si el usuario marca varias filas muy rápido, dos
           guardados en paralelo harían cada uno su propio read-modify-write sobre
           estado.offer y el segundo en terminar pisaría al primero. Aquí cada autoguardado
           espera a que el anterior termine (éxito o fallo) antes de mandarse — nunca dos a
           la vez. */
        var colaOferta = Promise.resolve();
        function encolarOferta(tarea) {
          var resultado = colaOferta.then(tarea, tarea);
          colaOferta = resultado.then(function () {}, function () {});
          return resultado;
        }
        function csrfOferta() {
          var form = document.getElementById('ofertas-form');
          var campo = form ? form.querySelector('input[name="csrf"]') : null;
          return campo ? campo.value : '';
        }
        /* El error de verdad ya viaja en cada respuesta, aunque nadie lo leyera hasta
           ahora: es la misma página recién repintada, y esta trae siempre el toast(...)
           de la linea 6540 con el $error exacto del servidor. Sacarlo de ahi es leer lo
           que ya esta, no adivinar ni repetir la validacion: si un dia cambia el texto
           de un mensaje, este sigue funcionando sin tocarlo. */
        function mensajeErrorDeRespuesta(html) {
          if (typeof html !== 'string') return null;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var script = doc.getElementById('toasts');
          script = script ? script.nextElementSibling : null;
          if (!script || script.tagName !== 'SCRIPT') return null;
          var m = /toast\(\s*("(?:[^"\\]|\\.)*")\s*,\s*'bad'\s*\)/.exec(script.textContent);
          return m ? JSON.parse(m[1]) : null;
        }

        function autoguardarOferta(campos) {
          return encolarOferta(function () {
            /* URLSearchParams(objeto) no sabe de arrays — un valor array se aplanaria a
               "1,3,5" en vez de mandar dia[]=1&dia[]=3&dia[]=5. Se construye a mano para
               que un campo como 'dia[]' con un array llegue igual que si lo mandara un
               <form> real con varias casillas del mismo name. */
            var datos = new URLSearchParams();
            Object.keys(campos).forEach(function (k) {
              var v = campos[k];
              if (Array.isArray(v)) { v.forEach(function (item) { datos.append(k, item); }); }
              else { datos.append(k, v); }
            });
            datos.set('csrf', csrfOferta());
            return fetch(location.pathname, { method: 'POST', body: datos, credentials: 'same-origin' })
              .then(function (r) {
                return r.text().then(function (texto) {
                  if (!r.ok) {
                    if (window.toast) {
                      toast(mensajeErrorDeRespuesta(texto) || 'No se ha podido guardar. Comprueba la conexión.', 'bad');
                    }
                    throw new Error('http');
                  }
                  return texto;
                });
              });
          });
        }

        /* Cierre funcional MISE-B, punto 6 (y remate Fase 0.1): tras guardar bien un cambio
           que puede mover si la oferta está "corriendo" ahora mismo (encender/apagar,
           horario, días), ni la insignia ESTADO (APAGADA/CORRIENDO/PROGRAMADA) ni la frase
           de debajo (.adm-regla-pie: "En la carta no hay ningún descuento." / "Corriendo
           ahora mismo..." / "Fuera de su horario...", con la hora de Canarias) pueden
           quedarse diciendo lo de antes — las dos cuentan la MISMA cosa, así que las dos se
           repintan juntas o ninguna, nunca una sí y la otra no. La respuesta del propio
           guardado YA es la página entera recién repintada con el estado nuevo — se le
           sacan esos dos trozos y se copian a los que se ven, en vez de recalcular en JS si
           "ahora" cae dentro del horario y los días (esa cuenta ya la hace el servidor,
           aquí no se repite). Sin insignias nuevas, sin tarjetas nuevas, sin tocar el resto
           de la ficha. */
        function repintarEstadoOferta(html) {
          if (typeof html !== 'string') return;
          var doc = new DOMParser().parseFromString(html, 'text/html');

          var badgeActual = pane.querySelector('.adm-f-ooferta .adm-estado');
          var badgeNuevo = doc.querySelector('.adm-f-ooferta .adm-estado');
          if (badgeActual && badgeNuevo) {
            badgeActual.className = badgeNuevo.className;
            badgeActual.textContent = badgeNuevo.textContent;
          }

          var pieActual = pane.querySelector('.adm-f-ooferta .adm-regla-pie');
          var pieNuevo = doc.querySelector('.adm-f-ooferta .adm-regla-pie');
          if (pieActual && pieNuevo) {
            pieActual.textContent = pieNuevo.textContent;
          }
        }

        /* Auditoría de uso real: Platos e Ofertas viven en el mismo documento pero cada
           uno pinta SU PROPIA copia de la fila del plato (misma clase .adm-orow, dos
           elementos distintos) — tocar una oferta aquí no movía ni el contador "Con
           oferta" ni la etiqueta de Platos hasta volver a cargar. Mismo patrón que
           repintarEstadoOferta: la respuesta del guardado YA trae Platos recien pintado
           con el estado nuevo (misma pagina, mismo PHP, mismo $enOferta) — se copia lo
           que cambia fila a fila, por la clave real del plato (data-k de .camara, no
           data-busca: un plato puede repetirse en varias categorias/pestañas y las dos
           filas tienen que quedar iguales). No se reemplaza el pane ni la fila entera:
           sólo la clase es-oferta y la etiqueta/guion, así que el buscador, los filtros,
           el scroll y un precio a medio escribir en esa misma fila no se tocan. Semántica
           congelada: sigue siendo exactamente $enOferta = on && (categoria o plato), la
           misma que ya calcula PHP — aquí no se recalcula nada, sólo se copia. */
        function repintarPlatosDesdeOferta(html) {
          if (typeof html !== 'string') return;
          var platosPane = document.querySelector('.pane[data-pane="platos"]');
          if (!platosPane) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var platosFresco = doc.querySelector('.pane[data-pane="platos"]');
          if (!platosFresco) return;

          var frescoPorClave = {};
          [].slice.call(platosFresco.querySelectorAll('.adm-orow')).forEach(function (filaFresca) {
            var camaraFresca = filaFresca.querySelector('.camara[data-k]');
            if (camaraFresca) frescoPorClave[camaraFresca.dataset.k] = filaFresca;
          });

          [].slice.call(platosPane.querySelectorAll('.adm-orow')).forEach(function (filaViva) {
            var camaraViva = filaViva.querySelector('.camara[data-k]');
            var filaFresca = camaraViva ? frescoPorClave[camaraViva.dataset.k] : null;
            if (!filaFresca) return;
            filaViva.classList.toggle('es-oferta', filaFresca.classList.contains('es-oferta'));
            var slotViejo = filaViva.querySelector('.adm-tag-oferta, .adm-plato-sinoferta');
            var slotNuevo = filaFresca.querySelector('.adm-tag-oferta, .adm-plato-sinoferta');
            if (slotViejo && slotNuevo) slotViejo.replaceWith(slotNuevo.cloneNode(true));
          });

          var nChipOferta = document.getElementById('n-chip-oferta');
          if (nChipOferta) nChipOferta.textContent = platosPane.querySelectorAll('.adm-orow.es-oferta').length;
        }

        /* Marcar una categoría entera desactiva sus platos sueltos: ya están dentro, y dejar
           las dos casillas vivas invita a pensar que hay que marcar las dos. Función aparte
           porque el revertido de un fallo es literalmente volver a llamarla con el estado
           contrario. */
        function marcarPorCategoria(cat, activa) {
          pane.querySelectorAll('.adm-orow').forEach(function (fila) {
            if (fila.dataset.cat !== cat) return;
            var cb = fila.querySelector('input[name="oferta_plato[]"]');
            fila.classList.toggle('por-categoria', activa);
            if (cb) cb.disabled = activa;
          });
        }

        /* ---------------------------------------------------------- fase 2: porcentaje
           Sólo en change (que en un <input type=number> ya es "al perder el foco con el
           valor cambiado", nunca tecla a tecla) y en Enter explícito — escribir "30" no
           manda "3" y luego "30", manda "30" una vez. Valor inválido: no se manda nada y
           el campo vuelve al último que sí está guardado. */
        var pctInput = document.getElementById('of-pct');
        var pctPersistido = pctInput ? parseInt(pctInput.value, 10) : null;
        function guardarPct() {
          var n = parseInt(pctInput.value, 10);
          var valido = Number.isFinite(n) && n >= 1 && n <= 90;
          if (!valido) { pctInput.value = pctPersistido; return; }
          if (n === pctPersistido) return;
          pctInput.disabled = true;
          autoguardarOferta({ oferta_pct_guardar: '1', pct: String(n) })
            .then(function () { pctPersistido = n; })
            .catch(function () { pctInput.value = pctPersistido; })
            .then(function () { pctInput.disabled = false; }, function () { pctInput.disabled = false; });
        }
        if (pctInput) {
          pctInput.addEventListener('change', guardarPct);
          pctInput.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            guardarPct();
          });
        }

        /* ------------------------------------------------------------- fase 2: horario
           Desde y Hasta viajan SIEMPRE juntos en un único guardado — nunca uno sin el
           otro, para no dejar a medias una combinación que sólo tiene sentido completa. */
        var desdeInput = document.getElementById('of-desde');
        var hastaInput = document.getElementById('of-hasta');
        var desdePersistido = desdeInput ? desdeInput.value : null;
        var hastaPersistido = hastaInput ? hastaInput.value : null;
        function horaAMinutos(hhmm) {
          var m = /^([0-9]{1,2}):([0-9]{2})$/.exec(hhmm || '');
          if (!m) return null;
          var v = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
          return (v >= 0 && v <= 1440) ? v : null;
        }
        function guardarHorario() {
          var desde = desdeInput.value, hasta = hastaInput.value;
          var dMin = horaAMinutos(desde), hMin = horaAMinutos(hasta);
          var valido = dMin !== null && hMin !== null && hMin > dMin;
          if (!valido) { desdeInput.value = desdePersistido; hastaInput.value = hastaPersistido; return; }
          if (desde === desdePersistido && hasta === hastaPersistido) return;
          desdeInput.disabled = true; hastaInput.disabled = true;
          autoguardarOferta({ oferta_horario_guardar: '1', desde: desde, hasta: hasta })
            .then(function (html) { desdePersistido = desde; hastaPersistido = hasta; repintarEstadoOferta(html); })
            .catch(function () { desdeInput.value = desdePersistido; hastaInput.value = hastaPersistido; })
            .then(function () {
              desdeInput.disabled = false; hastaInput.disabled = false;
            }, function () {
              desdeInput.disabled = false; hastaInput.disabled = false;
            });
        }
        if (desdeInput && hastaInput) {
          desdeInput.addEventListener('change', guardarHorario);
          hastaInput.addEventListener('change', guardarHorario);
        }

        /* ---------------------------------------------------------------- fase 2: días
           Al tocar UN día se manda la colección completa resultante (así lo exige
           oferta_dias_guardar): se recalcula desde las casillas, no desde el que cambió.
           "Semanal" usa esta MISMA función — no un camino aparte — así que corre por la
           misma cola y con el mismo guardado que un día suelto. */
        var diasInputs = [].slice.call(pane.querySelectorAll('input[name="dia[]"]'));
        var diasPersistidos = diasInputs.filter(function (d) { return d.checked; })
          .map(function (d) { return parseInt(d.value, 10); }).sort(function (a, b) { return a - b; });
        function diasActuales() {
          var vistos = {};
          var arr = [];
          diasInputs.forEach(function (d) {
            var v = parseInt(d.value, 10);
            if (d.checked && !vistos[v]) { vistos[v] = true; arr.push(v); }
          });
          arr.sort(function (a, b) { return a - b; });
          return arr;
        }
        function marcarDias(lista) {
          diasInputs.forEach(function (d) { d.checked = lista.indexOf(parseInt(d.value, 10)) !== -1; });
          pintarSemanal();
        }
        function mismosDias(a, b) {
          return a.length === b.length && a.every(function (v, i) { return v === b[i]; });
        }
        function guardarDias() {
          var actuales = diasActuales();
          pintarSemanal();
          if (mismosDias(actuales, diasPersistidos)) return;
          diasInputs.forEach(function (d) { d.disabled = true; });
          if (semanal) semanal.disabled = true;
          autoguardarOferta({ oferta_dias_guardar: '1', 'dia[]': actuales })
            .then(function (html) { diasPersistidos = actuales; repintarEstadoOferta(html); })
            .catch(function () { marcarDias(diasPersistidos); })
            .then(function () {
              diasInputs.forEach(function (d) { d.disabled = false; });
              if (semanal) semanal.disabled = false;
            }, function () {
              diasInputs.forEach(function (d) { d.disabled = false; });
              if (semanal) semanal.disabled = false;
            });
        }
        if (semanal) {
          /* Cierre funcional MISE-B, punto 1: "Semanal" sólo SELECCIONA los siete días —
             nunca los quita. Antes era un interruptor de verdad (los siete marcados +
             clic = los siete a cero), y el servidor no admite una oferta sin ningún día
             (cae de vuelta a los siete si le llega el array vacío) — el navegador se
             quedaba enseñando cero mientras el disco decía siete, hasta el siguiente
             recargado. Con los siete ya marcados, un clic no cambia nada y no hay
             petición que mandar. */
          semanal.addEventListener('click', function () {
            var todos = diasInputs.every(function (d) { return d.checked; });
            if (todos) return;
            diasInputs.forEach(function (d) { d.checked = true; });
            guardarDias();
          });
        }

        /* --------------------------------------------------------------- fase 2: estado
           Encendida/Apagada. Apagar siempre se deja (no borra nada). Encender lo valida
           el SERVIDOR contra lo que ya está en disco (categoría/plato, día, porcentaje,
           horario) — el cliente no repite esa cuenta, sólo revierte si el servidor dice
           que no. El rótulo Encendida/Apagada lo actualiza ya un listener genérico de
           todas las .adm-sw (más abajo en este archivo); en el revertido se toca a mano
           porque cambiar checked por JS no dispara ese listener. */
        var estadoInput = document.querySelector('input[name="oferta_on"]');
        if (estadoInput) {
          estadoInput.addEventListener('change', function () {
            var marcar = estadoInput.checked;
            var caja = estadoInput.closest('.adm-sw');
            var texto = caja ? caja.querySelector('.adm-sw-txt') : null;
            estadoInput.disabled = true;
            autoguardarOferta({ oferta_estado_toggle: '1', oferta_estado_on: marcar ? '1' : '0' })
              .then(function (html) { repintarEstadoOferta(html); repintarPlatosDesdeOferta(html); })
              .catch(function () {
                estadoInput.checked = !marcar;
                if (texto && texto.dataset.on) {
                  texto.textContent = estadoInput.checked ? texto.dataset.on : texto.dataset.off;
                }
              })
              .then(function () { estadoInput.disabled = false; }, function () { estadoInput.disabled = false; });
          });
        }

        pane.addEventListener('change', function (e) {
          if (e.target.name === 'oferta_plato[]') {
            var cb = e.target;
            var fila = cb.closest('.adm-orow');
            var marcar = cb.checked;
            /* Estado visual inmediato — antes de saber si el guardado sale bien. */
            fila.classList.toggle('es-oferta', marcar);
            contar();
            cb.disabled = true; // evita una segunda pulsación mientras esta viaja
            autoguardarOferta({ oferta_plato_toggle: cb.value, oferta_plato_on: marcar ? '1' : '0' })
              .catch(function () {
                // Fallo: se restaura la casilla y todo lo que se pintó a partir de ella.
                cb.checked = !marcar;
                fila.classList.toggle('es-oferta', !marcar);
                contar();
              })
              .then(function (html) {
                /* No un simple "false": si una categoría se marcó MIENTRAS este guardado
                   viajaba, la fila ya lleva .por-categoria y el control tiene que seguir
                   bloqueado — reactivarlo a ciegas desharía ese bloqueo. */
                cb.disabled = fila.classList.contains('por-categoria');
                /* Sólo al marcar, y sólo tras confirmar el guardado — no en el optimista de
                   arriba, que podría acabar revertido. Quitar de la oferta no lo pide nadie
                   y ya se ve solo (el interruptor vuelve a su sitio). */
                if (marcar && window.toast) toast('Puesto en oferta.', 'ok');
                repintarPlatosDesdeOferta(html);
              }, function () {
                cb.disabled = fila.classList.contains('por-categoria');
              });
            return;
          }
          if (e.target.name === 'dia[]') {
            /* Cierre funcional MISE-B, punto 1: una oferta necesita al menos un día. Si
               quitar ÉSTE la dejaría en cero, se repone en el momento — ni una petición
               con dia[] vacío llega a salir. */
            if (diasActuales().length === 0) { e.target.checked = true; return; }
            guardarDias();
            return;
          }
          if (e.target.name === 'cat[]') {
            var cbCat = e.target;
            var cat = cbCat.value;
            var marcarCat = cbCat.checked;
            marcarPorCategoria(cat, marcarCat);
            contar();
            cbCat.disabled = true;
            autoguardarOferta({ oferta_cat_toggle: cat, oferta_cat_on: marcarCat ? '1' : '0' })
              .catch(function () {
                cbCat.checked = !marcarCat;
                marcarPorCategoria(cat, !marcarCat);
                contar();
              })
              .then(function () { cbCat.disabled = false; }, function () { cbCat.disabled = false; });
            return;
          }
          contar();
        });
      })();
    </script>

  </section>

  <?php if (CLIENTE_JUEGO): ?>
  <?php /* ================================================================ juego, en bento ==
   * Una sola ficha, a todo el ancho. Empezó con dos —Estado a la izquierda, el marcador a
   * la derecha— y sobraba: una caja con borde para un interruptor solo es marco sin cuadro,
   * y encima obligaba a que este pane fuera el único que no igualaba alturas.
   *
   * El interruptor vive ahora arriba del marcador, en su propia fila, y dice ON u OFF.
   * Encender el juego y mirar quién va ganando son la misma pantalla.
   *
   * Sólo un campo viaja con "Guardar cambios" —el interruptor—, así que se engancha con
   * form="juego-form". Quitar un nombre y vaciar el marcador tienen su propio formulario
   * cada uno: borran algo que no se recupera y no se pulsan por inercia al lado de un
   * interruptor.
   */ ?>
  <?php $juegoOn = !empty($juego["on"]); ?>
  <section class="pane" data-pane="juego" role="tabpanel" id="panel-juego" aria-labelledby="tab-juego"<?= $pestana === "juego" ? "" : " hidden" ?>>
    <div class="adm-board">
      <div class="adm-bento">

        <section class="adm-f adm-f-juego">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.5A2.5 2.5 0 0 0 8 10.5"/><path d="M16 5.5h2.5A2.5 2.5 0 0 1 16 10.5"/><path d="M12 13v3"/><path d="M8.5 20h7"/><path d="M10 20v-1.5a2 2 0 0 1 4 0V20"/></svg></span>
            <h2>Los tres mejores</h2>
            <span class="der adm-a-podio">
              <span class="adm-f-nota"><?= count($record) ?> de 3</span>
            </span>
          </div>
          <p class="hint" data-adm-ayuda="El marcador" data-adm-ancla=".adm-a-podio">
            El primero sale en la tarjeta del juego dentro de la carta; los tres, al acabar una
            partida. El nombre y el país los escribe quien juega, y por eso hay un botón para
            quitarlos: la lista de palabrotas del servidor nunca está completa. Quitar el nombre
            deja la puntuación en su sitio.
          </p>

          <?php /* El interruptor, arriba del marcador y no en una ficha aparte: es lo primero
                   que se decide de esta pantalla. */ ?>
          <div class="adm-fila adm-juego-sw">
            <span class="adm-fila-txt">
              <span class="adm-fila-que">El juego en la carta<span class="adm-a-juego"></span></span>
              <span class="adm-fila-dato"><?= $juegoOn
                ? 'La tarjeta de Chilli Rush sale en la carta y las partidas cuentan para el marcador.'
                : 'La tarjeta no sale en la carta y no se apunta ningún récord.' ?></span>
            </span>
            <label class="adm-sw">
              <input type="checkbox" name="juego_on" value="1" form="juego-form"<?= $juegoOn ? " checked" : "" ?>>
              <span class="adm-sw-pista"><span class="adm-sw-bola"></span></span>
              <span class="adm-sw-txt" data-on="ON" data-off="OFF"><?= $juegoOn ? 'ON' : 'OFF' ?></span>
            </label>
          </div>
          <p class="hint" data-adm-ayuda="El juego en la carta" data-adm-ancla=".adm-a-juego">
            Un minijuego de 30 segundos para quien ya ha pedido y está esperando. Se abre desde
            la carta y no necesita nada de la cocina: no hay premio que dar ni código que
            comprobar, y sólo se guarda la puntuación más alta que se ha hecho aquí. Apagado, la
            tarjeta de Chilli Rush desaparece de la carta y no se apunta ningún récord; la
            página del juego sigue existiendo para quien tenga el enlace guardado.
          </p>

          <?php if (!$record): ?>
            <p class="adm-vacio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              Todavía no ha jugado nadie. El primero que puntúe abre el marcador.
            </p>
          <?php else: ?>
            <ol class="adm-podio">
              <?php foreach ($record as $i => $x): ?>
                <li class="adm-fila adm-pod">
                  <span class="adm-pod-n"><?= $i + 1 ?></span>
                  <span class="adm-fila-txt">
                    <?php if ($x["nombre"] !== ""): ?>
                      <span class="adm-pod-quien"><?= h($x["nombre"]) ?>
                        <?php if ($x["pais"] !== "" && isset(PAISES_NOMBRE[$x["pais"]])): ?>
                          <img class="adm-pod-bandera" src="../assets/banderas/<?= h($x["pais"]) ?>.webp"
                               width="20" height="15" alt="<?= h(PAISES_NOMBRE[$x["pais"]]) ?>">
                        <?php endif; ?>
                      </span>
                    <?php else: ?>
                      <span class="adm-pod-quien es-anon">Sin nombre</span>
                    <?php endif; ?>
                    <span class="adm-fila-dato">
                      <?= $x["fecha"] !== "" ? h((new DateTimeImmutable($x["fecha"]))->format("d/m/Y")) : 'sin fecha' ?>
                    </span>
                  </span>
                  <span class="adm-pod-pts"><?= number_format($x["puntos"], 0, ",", ".") ?></span>
                  <?php if ($x["nombre"] !== "" || $x["pais"] !== ""): ?>
                    <form method="post" style="display:contents">
                      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                      <button class="adm-btn adm-btn-fino" name="borrar_nombre" value="<?= (int) $i ?>"
                              type="submit"
                              onclick="return confirm('¿Quitar el nombre y el país de esta puntuación? La puntuación se queda.')">
                        Quitar nombre</button>
                    </form>
                  <?php endif; ?>
                </li>
              <?php endforeach; ?>
            </ol>

            <?php /* Vaciar el marcador va en su propio formulario y no en el Guardar de fuera:
                     borra algo que no se recupera. */ ?>
            <form method="post" class="adm-fila adm-fila-peligro">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <span class="adm-fila-que">Empieza de cero. No se puede deshacer.</span>
              <button class="adm-btn adm-btn-fino adm-btn-quitar" name="reiniciar_record" value="1" type="submit"
                      onclick="return confirm('¿Vaciar el marcador entero? Se pierden las tres puntuaciones y no se puede deshacer.')">
                Vaciar el marcador</button>
            </form>
          <?php endif; ?>
        </section>

        <form method="post" id="juego-form" class="adm-form-suelto">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        </form>

      </div>
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
  <section class="pane" data-pane="publicidad" role="tabpanel" id="panel-publicidad" aria-labelledby="tab-publicidad"<?= $pestana === 'publicidad' ? '' : ' hidden' ?>>
    <?php /* El parrafo de siempre. Con JavaScript se recoge en el icono de ayuda de la ficha
             de estado; sin el se queda visible, que es como esta hoy. */ ?>
    <p class="hint" data-adm-ayuda="Donde sale el banner" data-adm-ancla=".adm-f-estado .adm-f-cab .der">
      Un hueco publicitario en la carta, entre la tarjeta del juego y la nota de Google.
      <strong>Solo sale en moviles</strong> (pantallas de menos de 768&nbsp;px), con el ancho de la
      tarjeta. La creatividad debe medir exactamente
      <strong><?= PUB_ANCHO_OBLIGATORIO ?>&nbsp;&times;&nbsp;<?= PUB_ALTO_OBLIGATORIO ?>&nbsp;px</strong>:
      el banner mantiene esa proporcion con una altura responsive, no fija
      (a 560&nbsp;px de ancho llega a <?= (int) round(560 * PUB_ALTO_OBLIGATORIO / PUB_ANCHO_OBLIGATORIO) ?>&nbsp;px
      de alto). Sin imagen, apagado o fuera de fechas, no ocupa nada.
    </p>

    <?php
      $pubEstado = pub_estado_banner($bannerPub);
      $pubImg    = is_array($bannerPub) ? (string) ($bannerPub['img'] ?? '') : '';
      $tieneImg  = pub_nombre_valido($pubImg);
      /* La misma palabra de siempre, dicha entera: hasta ahora el administrador leia
         "CADUCADO" y tenia que deducir el resto. */
      $PUB_EXPLICA = [
        'ACTIVO'      => 'El banner se esta viendo ahora mismo en los moviles.',
        'PROGRAMADO'  => 'Todavia no ha empezado. Saldra solo cuando llegue la fecha.',
        'CADUCADO'    => 'La fecha de fin ya paso. No se ve, y no hace falta apagarlo.',
        'INCOMPLETO'  => 'Encendido pero sin imagen valida: no puede salir.',
        'DESACTIVADO' => 'Apagado a mano. No sale aunque este en fechas.',
      ];
    ?>

    <?php /* ------------------------------------------------------------------ el tablero
     * Este pane es el unico oscuro del panel, y es a proposito: se lee como un tablero de
     * edicion con su propia superficie, no como una pantalla que se ha equivocado de tema.
     * Los tokens oscuros se redefinen SOLO aqui dentro; ninguna otra pestana se entera.
     *
     * Tres formularios y ninguno anidado, que seria HTML invalido:
     *   - adm-form-img  sube la creatividad
     *   - adm-form-del  la borra
     *   - adm-form      guarda todo lo demas; los controles que viven en otras fichas se
     *                   enganchan a el con form="pub-form", que funciona sin JavaScript.
     * Los dos <input type="datetime-local"> se quedan DENTRO de adm-form: son los que de
     * verdad viajan, y no dependen de ningun atributo para llegar.
     */ ?>
    <div class="adm-board">
      <div class="adm-bento">

        <section class="adm-f adm-f-estado">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg></span>
            <h2>Estado</h2>
            <span class="der">
              <span class="adm-estado adm-e-<?= h(minuscula($pubEstado)) ?>"><?= h($pubEstado) ?></span>
            </span>
          </div>
          <p class="adm-f-txt"><?= h($PUB_EXPLICA[$pubEstado] ?? '') ?>
            Son las <?= h((new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('H:i')) ?> en el restaurante.</p>
          <label class="adm-sw">
            <input type="checkbox" name="pub_on" value="1" form="pub-form"<?= !empty($bannerPub['on']) ? ' checked' : '' ?>>
            <span class="adm-sw-pista"><span class="adm-sw-bola"></span></span>
            <span class="adm-sw-txt" data-on="Encendido" data-off="Apagado"><?= !empty($bannerPub['on']) ? 'Encendido' : 'Apagado' ?></span>
          </label>
        </section>

        <section class="adm-f adm-f-crea">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg></span>
            <h2>Vista previa en vivo</h2>
            <span class="der"><span class="adm-f-nota">Solo movil</span></span>
          </div>

          <?php if ($tieneImg): ?>
            <img class="adm-previo" src="<?= h('../' . PUB_URL . $pubImg) ?>"
                 alt="La creatividad actual del banner">
          <?php else: ?>
            <div class="adm-previo-vacio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              Sin imagen todavia
            </div>
          <?php endif; ?>

          <div class="adm-img-acciones">
            <form method="post" enctype="multipart/form-data" class="adm-subir" id="pub-form-img">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <?php /* Con JavaScript esta etiqueta ES el boton: abre el selector y al elegir
                       fichero pulsa el envio. Sin JavaScript se queda escondida y se ven el
                       campo y el boton de siempre. */ ?>
              <label class="adm-btn adm-btn-archivo" for="pub_img" hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                <?= $tieneImg ? 'Reemplazar imagen' : 'Subir imagen' ?>
              </label>
              <input type="file" id="pub_img" name="pub_img" accept="image/jpeg,image/png,image/webp">
              <button class="save adm-subir-envio" name="subir_banner" value="1" type="submit"><?= $tieneImg ? 'Reemplazar imagen' : 'Subir imagen' ?></button>
            </form>
            <?php if ($tieneImg): ?>
              <?php /* Borrar la creatividad borra el fichero del servidor y no se deshace.
                       El panel ya pregunta antes de quitar una foto de portada; aqui no
                       preguntaba nada. Mismo patron que el resto de la casa. */ ?>
              <form method="post" class="adm-quitar" id="pub-form-del"
                    onsubmit="return confirm('¿Quitar la imagen del banner? Se borra del servidor y no se puede deshacer.')">
                <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                <button class="adm-btn adm-btn-quitar" name="eliminar_banner" value="1" type="submit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  Quitar imagen
                </button>
              </form>
            <?php endif; ?>
            <span class="adm-crea-ancla"></span>
          </div>

          <?php /* Los requisitos ya no ocupan una linea fija: viven en el icono de al lado.
                   Sin JavaScript se quedan visibles aqui, como antes. */ ?>
          <p class="hint adm-crea-medidas" data-adm-ayuda="Requisitos de la imagen"
             data-adm-ancla=".adm-crea-ancla">Tamano obligatorio: <?= PUB_ANCHO_OBLIGATORIO ?>
            &times; <?= PUB_ALTO_OBLIGATORIO ?>&nbsp;px &middot; Maximo: <?= PUB_MAX_BYTES / 1048576 ?>&nbsp;MB
            &middot; JPG, PNG o WebP</p>

          <?php /* aria-live: al elegir una duracion el periodo cambia aqui, lejos del boton
                 que se acaba de pulsar. Sin esto, quien no ve la pantalla no se entera de
                 lo que ha hecho. "polite" porque no interrumpe: espera a que acabe de leer. */ ?>
        <p class="adm-periodo" id="pub-tramo" role="status" aria-live="polite" hidden></p>
        </section>

        <section class="adm-f adm-f-dur">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg></span>
            <h2>Duracion de la campana</h2>
            <span class="der"></span>
          </div>
          <p class="hint adm-cuando-pie">
            Sin fecha de inicio empieza en cuanto lo enciendas; sin fecha de fin, no caduca.
            La hora es siempre la del restaurante.
          </p>
          <div class="adm-atajos" id="pub-atajos" hidden></div>
          <div class="adm-cal-caja" id="pub-cal" hidden></div>
        </section>

        <section class="adm-f adm-f-horas">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            <h2>Horario diario</h2>
            <span class="der"><span class="adm-f-nota">Hora del restaurante</span></span>
          </div>
          <div class="adm-horas" id="pub-horas" hidden></div>
        </section>

        <section class="adm-f adm-f-enlace">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
            <h2>Enlace al tocar el banner</h2>
            <span class="der"><span class="adm-f-nota">Opcional</span></span>
          </div>
          <input class="adm-campo" name="pub_url" type="url" inputmode="url" maxlength="300"
                 form="pub-form" value="<?= h((string) ($bannerPub['url'] ?? '')) ?>"
                 placeholder="https://ejemplo.com/promo" aria-label="Enlace al tocar el banner">
          <label class="adm-check">
            <input type="checkbox" name="pub_blank" value="1" form="pub-form"<?= !isset($bannerPub['blank']) || !empty($bannerPub['blank']) ? ' checked' : '' ?>>
            Abrir el enlace en una pestana nueva
          </label>
        </section>

        <?php /* El formulario deja de ser una ficha: ya no pinta nada. Con display:contents
                 no ocupa sitio en la rejilla y sus hijos —los dos campos de fecha— se
                 comportan como si colgaran del bento. Los botones que lo envian viven
                 FUERA de la tarjeta y se enganchan con form="pub-form". */ ?>
        <form method="post" id="pub-form" class="adm-form-suelto">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">

          <?php /* ------------------------------------------------------------ las fechas
           * Estos dos son los que viajan al servidor y no cambian. pub_fecha_a_local() ya
           * devuelve "Y-m-d\TH:i" en hora del restaurante, que es exactamente lo que escribe
           * el calendario, asi que no hay conversion de por medio.
           *
           * El JavaScript los oculta y los pilota. Sin JavaScript no se oculta nada: se ven
           * los dos controles del navegador y el pane guarda igual que antes de este cambio.
           */ ?>
          <div class="adm-fechas" id="pub-fechas">
            <p class="adm-nativo"><label>Empieza (opcional, hora del restaurante)<br>
              <input type="datetime-local" name="pub_inicio" id="pub-inicio"
                     value="<?= h(pub_fecha_a_local((string) ($bannerPub['startAt'] ?? ''))) ?>"></label></p>
            <p class="adm-nativo"><label>Termina (opcional, hora del restaurante)<br>
              <input type="datetime-local" name="pub_fin" id="pub-fin"
                     value="<?= h(pub_fecha_a_local((string) ($bannerPub['endAt'] ?? ''))) ?>"></label></p>
          </div>

        </form>

      </div>
    </div>
  </section>
  <?php endif; ?>

  <?php /* ============================================================= analítica, en bento ==
   * Esta pestaña ya venía con rejilla propia —`dt-bento`, `dt-baldosa`— porque nació después
   * que las demás. Migrar aquí no es rediseñar: es **quitar** su rejilla y sus baldosas y
   * dejar que use las del panel, que hacen lo mismo. Lo que sí se queda tal cual es lo de
   * dentro: las barras, el globo que sigue al dedo, el chip de variación y las filas de
   * platos, que son de esta pantalla y de ninguna otra.
   *
   * Dos cosas se han ido a un globo de ayuda en vez de ocupar una caja: «son móviles, no
   * clientes» y la letra pequeña de los porcentajes. Los tres datos del pie —desde cuándo,
   * cuántas en total y cuántos meses se guardan— sí se quedan a la vista, debajo del eje.
   *
   * Aquí no se guarda nada: no hay formulario, no hay tira de acciones y no hay botón de
   * guardar. Es la única pestaña que sólo se lee.
   */ ?>
  <?php if (DATOS_ACTIVO): ?>
  <section class="pane" data-pane="datos" role="tabpanel" id="panel-datos" aria-labelledby="tab-datos"<?= $pestana === 'datos' ? '' : ' hidden' ?>>
    <div class="adm-board">

    <?php /* Los avisos de estado van ARRIBA y fuera de la rejilla: si no se está contando
             nada, eso no puede leerse al final. */ ?>
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
      ?>

      <div class="adm-bento">

        <?php /* --------------------------------------------------------- los 30 días */ ?>
        <section class="adm-f adm-f-dt30" id="dt-tile">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></span>
            <h2>Últimos 30 días</h2>
            <span class="der adm-a-dt30">
              <span class="dt-vivo" aria-hidden="true"></span>
              <span class="dt-lectura" id="dt-lectura" role="status" aria-live="polite"
                    data-reposo="<?= number_format($dt["hoy"], 0, ",", ".") ?>">
                <?= number_format($dt["hoy"], 0, ",", ".") ?><em>hoy</em></span>
            </span>
          </div>
          <p class="hint" data-adm-ayuda="Cómo leer esto" data-adm-ancla=".adm-a-dt30">
            Son móviles, no clientes. El mismo móvil cuenta una vez al día, aunque abra la carta
            tres veces; y en una mesa de cuatro donde sólo uno mira, cuenta uno. Se cuenta cuando
            alguien abre la carta y la tiene delante cuatro segundos. Pasa el dedo o el ratón por
            encima de las barras para leer el día a día.
          </p>
          <div class="dt-barras" id="dt-barras" role="img"
               aria-label="Aperturas de los últimos 30 días. Los totales, en las fichas de abajo.">
            <?php foreach ($ptos as $i => $x):
                 $alto = $x["n"] > 0 ? max(4, round(($x["n"] / $topeG) * 100)) : 0;
                 $f = new DateTimeImmutable($x["fecha"]); ?>
              <span class="dt-b<?= $x["n"] > 0 ? "" : " cero" ?>" data-i="<?= $i ?>"
                    style="--i:<?= $i ?>">
                <span class="dt-globo"><?= number_format($x["n"], 0, ",", ".") ?>
                  · <?= h(recorte(dia_semana($x["fecha"]), 0, 3)) ?> <?= h($f->format("d/m")) ?></span>
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
          <p class="adm-dt-pie">
            <span>Desde el <?= h((new DateTimeImmutable($dt["desde"]))->format("d/m/Y")) ?></span>
            <span><?= number_format($dt["total"], 0, ",", ".") ?>
              <?= $dt["total"] == 1 ? "apertura" : "aperturas" ?> en total</span>
            <span>Se guardan <?= (int) DATOS_MESES ?> meses</span>
          </p>
        </section>

        <?php /* ------------------------------------------------------ las tres cifras */ ?>
        <section class="adm-f adm-f-dthoy">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg></span>
            <h2>Hoy</h2>
            <span class="der"><?= dt_chip(datos_pct($dt["hoy"], $dt["hoyAntes"]), $dt["habiaHoy"]) ?></span>
          </div>
          <div class="dt-cifra-n"><?= number_format($dt["hoy"], 0, ",", ".") ?></div>
          <?= dt_tira($dt["tiraHoy"], "hace 7 días", "hoy", "Los siete últimos días. Hoy es la última barra.") ?>
        </section>

        <section class="adm-f adm-f-dtsem">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg></span>
            <h2>Esta semana</h2>
            <span class="der"><?= dt_chip(datos_pct($dt["semana"], $dt["semanaAntes"]), $dt["habiaSemana"]) ?></span>
          </div>
          <div class="dt-cifra-n"><?= number_format($dt["semana"], 0, ",", ".") ?></div>
          <?= dt_tira($dt["tiraSemana"], "lun", "dom", "La semana entera; los días que faltan van en hueco.", $dt["diasSemana"]) ?>
        </section>

        <section class="adm-f adm-f-dtmes">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg></span>
            <h2><?= h($dt["mesNombre"]) ?></h2>
            <span class="der"><?= dt_chip(datos_pct($dt["mes"], $dt["mesAntes"]), $dt["habiaMes"]) ?></span>
          </div>
          <div class="dt-cifra-n"><?= number_format($dt["mes"], 0, ",", ".") ?></div>
          <?= dt_tira($dt["tiraMes"], "día 1", "día " . $dt["diasDelMes"], "El mes entero; los días que faltan van en hueco.", $dt["diaDelMes"]) ?>
        </section>

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
        <?php /* -------------------------------------------------------- los platos */ ?>
        <section class="adm-f adm-f-dtplatos">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></svg></span>
            <h2>Platos más consultados</h2>
            <span class="der adm-a-platos">
              <?php if ($vhayAlgo): ?>
                <span class="vp-per" role="group" aria-label="Periodo">
                  <?php foreach ($vperiodos as $k => $per): ?>
                    <button type="button" data-vper="<?= h($k) ?>"
                            aria-pressed="<?= $k === 'semana' ? 'true' : 'false' ?>"><?= h($per['rot']) ?></button>
                  <?php endforeach; ?>
                </span>
              <?php endif; ?>
            </span>
          </div>
          <p class="hint" data-adm-ayuda="Los platos más consultados" data-adm-ancla=".adm-a-platos">
            El porcentaje es sobre las aperturas de la carta del mismo periodo. Aquí sólo salen
            los platos con foto: son los únicos cuya ficha se abre, así que esto no compara un
            plato con todos, compara los que tienen foto entre sí. Se cuenta cuando alguien toca
            un plato con foto y se le abre la ficha, una vez por plato y visita.
          </p>

          <?php if (!$vhayAlgo): ?>
            <p class="adm-vacio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></svg>
              Todavía nadie ha abierto la ficha de un plato. Los platos sin foto no abren ficha,
              así que no aparecen aquí.
            </p>
          <?php else: foreach ($vperiodos as $k => $per):
            $filas = vp_lista($per['v'], $dt["vid"], (int) $per['ap'], 10);
            $todas = vp_lista($per['v'], $dt["vid"], (int) $per['ap'], 0);
            $cuantos = 0;
            foreach ($per['v'] as $id => $n) if (isset($dt["vid"][$id])) $cuantos++; ?>
            <div class="vp-caja" data-vpanel="<?= h($k) ?>"<?= $k === 'semana' ? '' : ' hidden' ?>>
              <?php if ($filas === ''): ?>
                <p class="adm-vacio">Ningún plato consultado en este periodo.</p>
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
        </section>

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

    <?php endif; ?>
    </div>
  </section>
  <?php endif; ?>

  <?php /* ---------------------------------------------------------------- marca */ ?>
  <?php /* ================================================================ marca, en bento ==
   * La segunda pestana del sistema, y la que demuestra que es un sistema: aqui no se ha
   * escrito ni una clase propia de Marca. Las fichas, la cabecera con su icono, el
   * interruptor, los campos, los botones y la tira de acciones son EXACTAMENTE los de
   * Publicidad. Lo unico nuevo es lo que aqui existe y alli no —la galeria de portadas, la
   * muestra de color y la lista de copias—, y tambien va con prefijo adm-, porque manana
   * lo pedira otra pestana.
   *
   * Cuatro fichas guardan con el mismo boton —color, nota de Google, redes y nombre— y sus
   * controles viven en fichas distintas, asi que se enganchan al formulario con
   * form="marca-form". El formulario ya no dibuja nada (display:contents) y solo lleva el
   * csrf. Portadas y copias tienen los suyos: cada accion se manda sola y no espera a
   * "Guardar cambios".
   */ ?>
  <section class="pane" data-pane="marca" role="tabpanel" id="panel-marca" aria-labelledby="tab-marca"<?= $pestana === 'marca' ? '' : ' hidden' ?>>
    <div class="adm-board">
      <div class="adm-bento">

        <?php /* ---------------------------------------------------------------- el nombre */ ?>
        <section class="adm-f adm-f-nombre">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><?php /* Lucide «type» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/></svg></span>
            <h2>Nombre en la carta</h2>
            <span class="der adm-a-nombre"></span>
          </div>
          <p class="hint" data-adm-ayuda="El nombre en la carta" data-adm-ancla=".adm-a-nombre">
            Lo que ve el comensal al abrir la carta: el nombre grande y el texto pequeño de
            encima. Deja los dos en blanco para usar los de fábrica. El texto pequeño se enseña
            igual en los tres idiomas: escribir aquí no lo traduce, así que si lo cambias,
            cámbialo pensando que lo van a leer en cualquiera de ellos.
          </p>
          <label class="adm-lbl" for="marca-nombre">Nombre del restaurante <span class="opt">(máximo 20)</span></label>
          <input class="adm-campo" id="marca-nombre" name="marca_nombre" form="marca-form" maxlength="20"
                 value="<?= h($marca['nombreVisible']) ?>" placeholder="<?= h(CLIENTE_NOMBRE) ?>">
          <label class="adm-lbl" for="marca-rotulo">Texto pequeño, encima del nombre <span class="opt">(máximo 25)</span></label>
          <input class="adm-campo" id="marca-rotulo" name="marca_rotulo" form="marca-form" maxlength="25"
                 value="<?= h($marca['rotuloVisible']) ?>"
                 placeholder="<?= h(defined('CLIENTE_ROTULO') ? CLIENTE_ROTULO : '') ?>">
        </section>

        <?php /* ----------------------------------------------------------------- el color */ ?>
        <section class="adm-f adm-f-color">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><?php /* Lucide «palette» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/></svg></span>
            <h2>Color de marca</h2>
            <span class="der adm-a-color"></span>
          </div>
          <p class="hint" data-adm-ayuda="El color de marca" data-adm-ancla=".adm-a-color">
            El Primario se aplica a la carta al momento, sin recompilar. Un color claro no se
            rechaza por serlo: el texto y los iconos que van encima pasan solos a oscuros o a
            claros, lo que se lea mejor. Sólo se rechaza si de verdad no hay forma de leerlo, y se
            explica por qué. Secundario, Oscuro y Neutro son del motor, no del restaurante:
            iguales para cualquier carta y no se cambian desde aquí. El rojo de las ofertas y del
            picante tampoco es un color de marca, es un aviso.
          </p>
          <label class="adm-lbl" for="color-principal-hex">Primario
            <span class="opt">(en blanco, el de fábrica: <?= h(CLIENTE_COLOR_PRINCIPAL) ?>)</span>
          </label>
          <div class="adm-color">
            <input type="color" id="color-principal-picker" class="adm-color-muestra"
                   value="<?= h($colorPrincipalActual) ?>"
                   aria-label="Elegir color principal con el selector">
            <input type="text" id="color-principal-hex" name="marca_color_principal" form="marca-form"
                   class="adm-campo adm-color-hex"
                   value="<?= h($marca['colorPrincipal']) ?>" placeholder="<?= h(CLIENTE_COLOR_PRINCIPAL) ?>"
                   pattern="#?[0-9A-Fa-f]{6}" maxlength="7" spellcheck="false" autocomplete="off"
                   aria-label="Color principal en hexadecimal">
          </div>
          <button type="button" class="adm-btn adm-btn-fino adm-color-volver" id="color-principal-restaurar">Restaurar color original</button>
          <p class="adm-f-nota adm-color-rot">Del motor, iguales en todas las cartas</p>
          <div class="adm-color-fijos">
            <span class="adm-color-fijo" role="group" aria-label="Secundario, del motor: <?= h(CLIENTE_COLOR_SECUNDARIO) ?>">
              <i style="background:<?= h(CLIENTE_COLOR_SECUNDARIO) ?>" aria-hidden="true"></i>
              <b aria-hidden="true"><?= h(CLIENTE_COLOR_SECUNDARIO) ?></b>
            </span>
            <span class="adm-color-fijo" role="group" aria-label="Oscuro, del motor: <?= h(CLIENTE_COLOR_OSCURO) ?>">
              <i style="background:<?= h(CLIENTE_COLOR_OSCURO) ?>" aria-hidden="true"></i>
              <b aria-hidden="true"><?= h(CLIENTE_COLOR_OSCURO) ?></b>
            </span>
            <span class="adm-color-fijo" role="group" aria-label="Neutro, del motor: <?= h(CLIENTE_COLOR_NEUTRAL) ?>">
              <i style="background:<?= h(CLIENTE_COLOR_NEUTRAL) ?>" aria-hidden="true"></i>
              <b aria-hidden="true"><?= h(CLIENTE_COLOR_NEUTRAL) ?></b>
            </span>
          </div>
        </section>

        <?php /* ------------------------------------------------------------- las portadas
         * Es la ficha grande, el mismo papel que la vista previa en Publicidad: lo que se
         * mira. Las flechas y la papelera van en el pie de cada miniatura y no encima de la
         * foto: sobre una imagen cualquier icono se pierde a la primera portada oscura.
         */ ?>
        <section class="adm-f adm-f-fotos">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><?php /* Lucide «images» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/></svg></span>
            <h2>Fotos de portada</h2>
            <span class="der adm-a-fotos">
              <span class="adm-f-nota"><?= count($fotos) ?> de <?= (int) HERO_MAX ?></span>
            </span>
          </div>
          <p class="hint" data-adm-ayuda="Las fotos de portada" data-adm-ancla=".adm-a-fotos">
            La carta abre con ellas y se pasan con el dedo. Máximo 1 MB por foto: por encima de
            eso no se ve mejor y sí tarda más en abrir con datos móviles. JPG, PNG o WebP, mínimo
            800 px de ancho. Salen recortadas a lo ancho, así que lo importante conviene tenerlo
            en el centro. Puedes elegir varias de una vez, y si el servidor rechaza el envío por
            tamaño, súbelas de dos en dos.
          </p>

          <?php if (!$fotos): ?>
            <p class="adm-vacio">
              <?php /* Lucide «image» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              Todavía no hay fotos. La carta abre directamente con el nombre del restaurante.
            </p>
          <?php else: ?>
            <div class="adm-fotos">
              <?php foreach ($fotos as $i => $f): ?>
                <div class="adm-foto" data-foto="<?= h($f) ?>">
                  <img src="../assets/hero/<?= h($f) ?>" alt="">
                  <div class="adm-foto-pie">
                    <span class="pos adm-foto-pos"><?= $i + 1 ?></span>
                    <form method="post" style="display:contents">
                      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                      <input type="hidden" name="dir" value="arriba">
                      <button class="adm-foto-b" name="mover_foto" value="<?= h($f) ?>" type="submit"
                              data-mover="arriba"
                              aria-label="Subir la foto <?= $i + 1 ?>"<?= $i === 0 ? ' disabled' : '' ?>><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg></button>
                    </form>
                    <form method="post" style="display:contents">
                      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                      <input type="hidden" name="dir" value="abajo">
                      <button class="adm-foto-b" name="mover_foto" value="<?= h($f) ?>" type="submit"
                              data-mover="abajo"
                              aria-label="Bajar la foto <?= $i + 1 ?>"<?= $i === count($fotos) - 1 ? ' disabled' : '' ?>><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
                    </form>
                    <form method="post" style="display:contents"
                          onsubmit="return confirm('¿Quitar esta foto de la carta? Se borra del servidor y no se puede deshacer.')">
                      <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                      <button class="adm-foto-b adm-foto-b-quitar" name="quitar_foto" value="<?= h($f) ?>" type="submit"
                              aria-label="Quitar la foto <?= $i + 1 ?>"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
                    </form>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
            <p class="adm-foto-aviso" role="status" aria-live="polite"></p>
          <?php endif; ?>

          <?php if (count($fotos) < HERO_MAX): ?>
            <form method="post" enctype="multipart/form-data" class="adm-subida">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <?php /* Aviso al navegador, no defensa: el limite de verdad se comprueba en PHP. */ ?>
              <input type="hidden" name="MAX_FILE_SIZE" value="<?= (int) HERO_MAX_BYTES ?>">
              <?php /* SocialCard V6: el campo nativo se estira invisible sobre una caja que sí
                       es del sistema. Sigue siendo el mismo input —multiple, accept, required y
                       name intactos—; lo único que cambia es que ahora mide 40 como el resto de
                       campos y se ve igual en claro y en oscuro. El rótulo lo escribe el propio
                       navegador dentro del botón que ya no se dibuja, así que lo ponemos aquí y
                       lo actualiza el guion de abajo al elegir. */ ?>
              <label class="adm-archivo">
                <?php /* Lucide «image-plus» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/></svg>
                <input type="file" name="foto[]" accept="image/jpeg,image/png,image/webp" multiple required
                       aria-label="Elegir fotos">
                <span class="adm-archivo-txt" data-vacio="Elegir fotos…">Elegir fotos…</span>
              </label>
              <button class="adm-btn adm-btn-fino" name="subir_foto" value="1" type="submit">Subir</button>
            </form>
          <?php else: ?>
            <p class="adm-f-txt adm-al-pie">Ya están las <?= (int) HERO_MAX ?>. Quita una para poder subir otra.</p>
          <?php endif; ?>
        </section>

        <?php /* -------------------------------------------------------- la nota de Google */ ?>
        <section class="adm-f adm-f-google">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><?php /* Lucide «star» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 20.99a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.775a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg></span>
            <h2>La nota de Google</h2>
            <span class="der adm-a-google"></span>
          </div>
          <p class="hint" data-adm-ayuda="La nota de Google" data-adm-ancla=".adm-a-google">
            Sale al final de la carta, justo encima del pie: la nota, cinco estrellas y el número
            de reseñas. Va ahí y no arriba porque quien lee esto ya está sentado; lo que hace la
            prueba social al final es recordar que se puede dejar una reseña. Copia la nota y el
            número de tu ficha de Google tal cual salen allí: no hay nada conectado a Google. El
            enlace no tiene que ser de Google —vale TripAdvisor, El Tenedor o la que use el
            negocio— y el bloque del final de la carta lleva al mismo sitio.
          </p>
          <label class="adm-sw">
            <input type="checkbox" name="op_on" value="1" form="marca-form"<?= $opinion['on'] ? ' checked' : '' ?>>
            <span class="adm-sw-pista"><span class="adm-sw-bola"></span></span>
            <span class="adm-sw-txt" data-on="La nota SE ENSEÑA en la carta" data-off="La nota NO se enseña"><?= $opinion['on'] ? 'La nota SE ENSEÑA en la carta' : 'La nota NO se enseña' ?></span>
          </label>
          <div class="adm-2col">
            <div class="adm-2col-c">
              <label class="adm-lbl" for="op-nota">Nota <span class="opt">(como en Google)</span></label>
              <input class="adm-campo" id="op-nota" name="op_nota" form="marca-form" inputmode="decimal" maxlength="3"
                     value="<?= h(str_replace('.', ',', (string) $opinion['rating'])) ?>" placeholder="4,9">
            </div>
            <div class="adm-2col-c">
              <label class="adm-lbl" for="op-cuantas">Número de reseñas</label>
              <input class="adm-campo" id="op-cuantas" type="number" name="op_cuantas" form="marca-form"
                     min="0" max="100000" step="1"
                     value="<?= (int) $opinion['count'] ?>" placeholder="180">
            </div>
          </div>
          <label class="adm-lbl" for="op-url">Enlace para dejar reseña <span class="opt">(empieza por https://)</span></label>
          <input class="adm-campo" id="op-url" name="op_url" type="url" inputmode="url" maxlength="300" form="marca-form"
                 value="<?= h($resena['url'] ?? '') ?>"
                 placeholder="https://g.page/r/XXXXXXXXXXXX/review">
        </section>

        <?php /* ----------------------------------------------------------------- las redes */ ?>
        <section class="adm-f adm-f-redes">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><?php /* Lucide «share-2» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg></span>
            <h2>Redes</h2>
            <span class="der adm-a-redes"></span>
          </div>
          <p class="hint" data-adm-ayuda="Las redes" data-adm-ancla=".adm-a-redes">
            Salen como iconos al final de la carta, debajo de la nota. Los que dejes en blanco no
            aparecen: un restaurante con sólo WhatsApp enseña un icono, no cuatro huecos. Se
            comprueba que cada dirección sea de su red antes de guardar: pegar la de Instagram en
            la casilla de Facebook es el error más común, y así no pasa.
          </p>
          <label class="adm-lbl" for="red-whatsapp">WhatsApp <span class="opt">(sólo el número)</span><span class="adm-a-wa"></span></label>
          <p class="hint" data-adm-ayuda="El número de WhatsApp" data-adm-ancla=".adm-a-wa">
            Sin el «+», sin espacios y sin el 0 de delante: da igual cómo lo escribas, se limpia
            solo. El código de país es obligatorio, 34 para España. El enlace de mensaje directo
            lo monta la carta.
          </p>
          <input class="adm-campo" id="red-whatsapp" name="red_whatsapp" form="marca-form" inputmode="tel" maxlength="20"
                 value="<?= h($redes['whatsapp'] ?? '') ?>" placeholder="34617798557">
          <?php /* SocialCard V6: las tres direcciones son el mismo tipo de dato y se rellenan
                   de una sentada. En columna sumaban 383 px de ficha para tres campos; a dos
                   columnas la ficha baja a la altura de la de Google, que es su pareja de fila,
                   y deja de haber un escalón de 90 px entre las dos. WhatsApp se queda arriba y
                   a lo ancho porque no es una URL y lleva su propia ayuda. */ ?>
          <div class="adm-2col adm-2col-redes">
            <div class="adm-2col-c">
              <label class="adm-lbl" for="red-instagram">Instagram</label>
              <input class="adm-campo" id="red-instagram" name="red_instagram" type="url" inputmode="url" maxlength="300" form="marca-form"
                     value="<?= h($redes['instagram'] ?? '') ?>" placeholder="https://www.instagram.com/turestaurante">
            </div>
            <div class="adm-2col-c">
              <label class="adm-lbl" for="red-facebook">Facebook</label>
              <input class="adm-campo" id="red-facebook" name="red_facebook" type="url" inputmode="url" maxlength="300" form="marca-form"
                     value="<?= h($redes['facebook'] ?? '') ?>" placeholder="https://www.facebook.com/turestaurante">
            </div>
          </div>
          <label class="adm-lbl" for="red-tripadvisor">Tripadvisor</label>
          <input class="adm-campo" id="red-tripadvisor" name="red_tripadvisor" type="url" inputmode="url" maxlength="300" form="marca-form"
                 value="<?= h($redes['tripadvisor'] ?? '') ?>" placeholder="https://www.tripadvisor.es/Restaurant_Review-...">
        </section>

        <?php /* La ficha de copias de seguridad vive ahora en Ajustes, junto al resto de
                 mantenimiento de cuenta — ver SPEC.md, MISE-B Fase 1. */ ?>

        <?php /* El formulario no dibuja: con display:contents no ocupa sitio en la rejilla.
                 Solo lleva el csrf; los campos de las cuatro fichas que guardan juntas se
                 enganchan a el con form="marca-form", y el boton que lo envia vive FUERA de la
                 tarjeta. Funciona sin JavaScript. */ ?>
        <form method="post" id="marca-form" class="adm-form-suelto">
          <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
        </form>

      </div>
    </div>
  </section>


  <?php /* ===================================================== MISE-B: AJUSTES (nueva) ==
   * Agrupa lo que antes vivía suelto colgado de Marca: la ficha de copias de seguridad
   * (ligada a los cambios de precio, no a la identidad del restaurante) y, sólo para
   * superadministrador, el mantenimiento de cuenta. Ningún campo ni handler cambia — es
   * la reubicación que documenta SPEC.md, MISE-B Fase 1, corrección #4: reiniciar_record
   * se queda en Juego porque el objeto que administra es el marcador, no la cuenta. */ ?>
  <section class="pane" data-pane="ajustes" role="tabpanel" id="panel-ajustes" aria-labelledby="navtab-ajustes"<?= $pestana === 'ajustes' ? '' : ' hidden' ?>>
    <div class="adm-board">
      <div class="adm-bento">

        <?php $copias = copias_listar(); ?>
        <section class="adm-f adm-f-copias">
          <div class="adm-f-cab">
            <span class="adm-f-ico"><?php /* Lucide «archive» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg></span>
            <h2>Copias de seguridad</h2>
            <span class="der adm-a-copias">
              <span class="adm-f-nota"><?= count($copias) ?> de <?= (int) COPIAS_MAX ?></span>
            </span>
          </div>
          <p class="hint" data-adm-ayuda="Las copias de seguridad" data-adm-ancla=".adm-a-copias">
            Se copia cuando cambian los precios, y sólo entonces. Es lo único que no se puede
            deshacer a mano: una subida del 10% toca cientos de platos. Lo demás —un agotado, un
            destacado, una oferta— se deshace desmarcando la casilla. Restaurar tambien se puede
            deshacer: antes de escribir, el panel apunta cómo está ahora, así que nunca te quedas
            sin salida por haber pulsado el botón equivocado.
          </p>

          <form method="post" class="adm-fila">
            <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
            <span class="adm-fila-que">El estado de ahora, para guardarlo fuera del servidor</span>
            <button class="adm-btn adm-btn-fino" name="descargar_estado" value="1" type="submit">Descargar</button>
          </form>

          <?php if (!$copias): ?>
            <p class="adm-vacio">
              <?php /* Lucide «clock» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Todavía no hay ninguna. La primera se escribe la próxima vez que cambien los precios.
            </p>
          <?php else: ?>
            <div class="adm-filas">
              <?php foreach ($copias as $c):
                $kb = max(1, (int) round($c['bytes'] / 1024));
                $sinExt = substr($c['nombre'], 0, -5);
                if (preg_match('/^([0-9]{4}-[0-9]{2}-[0-9]{2})-([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})$/', $sinExt, $m)) {
                  $dia   = new DateTimeImmutable($m[1]);
                  $cuando = minuscula(dia_semana($m[1])) . ' '
                          . $dia->format('d/m/y') . ' · ' . $m[2] . ':' . $m[3] . ':' . $m[4]
                          . ($m[5] !== '00' ? ' (' . ((int) $m[5] + 1) . ')' : '');
                } elseif (preg_match('/^([0-9]{4}-[0-9]{2}-[0-9]{2})-([0-9]{2})([0-9]{2})$/', $sinExt, $m)) {
                  $dia   = new DateTimeImmutable($m[1]);
                  $cuando = minuscula(dia_semana($m[1])) . ' '
                          . $dia->format('d/m/y') . ' · ' . $m[2] . ':' . $m[3];
                } elseif (preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $sinExt)) {
                  $dia    = new DateTimeImmutable($sinExt);
                  $cuando = minuscula(dia_semana($sinExt)) . ' ' . $dia->format('d/m/y');
                } else {
                  $cuando = 'de antes';
                }
                $confirmar = '¿Devolver los precios a como estaban antes del cambio del '
                           . $cuando . '?'; ?>
                <div class="adm-fila">
                  <span class="adm-fila-txt">
                    <span class="adm-fila-que">Precios de antes del cambio</span>
                    <span class="adm-fila-dato"><?= h($cuando) ?> · <?= $kb ?> KB</span>
                  </span>
                  <form method="post" style="display:contents">
                    <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                    <button class="adm-btn adm-btn-fino" name="descargar_copia" value="<?= h($c['nombre']) ?>"
                            type="submit">Descargar</button>
                  </form>
                  <form method="post" style="display:contents">
                    <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                    <button class="adm-btn adm-btn-fino" name="restaurar_copia" value="<?= h($c['nombre']) ?>"
                            type="submit"
                            onclick="return confirm('<?= h($confirmar) ?>')">Restaurar</button>
                  </form>
                </div>
              <?php endforeach; ?>
            </div>
            <form method="post" class="adm-fila adm-fila-peligro">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <span class="adm-fila-que">Empezar de cero. No se puede deshacer.</span>
              <button class="adm-btn adm-btn-fino adm-btn-quitar" name="vaciar_copias" value="1" type="submit"
                      onclick="return confirm('¿Borrar todas las copias de precios? No se puede deshacer.')">Borrar todas</button>
            </form>
          <?php endif; ?>
        </section>

      <?php if ($super): ?>
        <?php /* SocialCard V6. Sólo lo ve una sesión de superadministrador: el restaurante ni
                 conoce estas acciones ni puede llegar a ellas —los manejadores comprueban el
                 rol de SESIÓN, no la presencia del formulario, así que esconder el HTML no es
                 la defensa y quitarlo tampoco la debilita—.

                 Lo que cambia en V6 es sólo cómo se ve: eran tres `<details class="card">` con
                 estilos en el atributo, campos `.fld` de 56 px, un `button.save` negro de 48 y
                 un `<pre>` sin caja. Ahora son tres fichas del sistema dentro del mismo bento
                 que las copias. Ni un name, ni un value, ni un handler cambian. */ ?>
        <div class="adm-seccion adm-f-super-tit">
          <h2>Superadministrador</h2>
        </div>

        <?php /* --------------------------------------- la contraseña del restaurante */ ?>
        <details class="adm-f adm-f-super adm-f-plega adm-f-clicli">
          <summary>
            <span class="adm-f-ico"><?php /* Lucide «key-round» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg></span>
            <span class="adm-f-tit">Contraseña del restaurante</span>
            <span class="adm-f-plega-v"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span>
          </summary>
          <div class="adm-f-plega-cuerpo">
            <p class="adm-aviso-seg">
              <?php /* Lucide «triangle-alert» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span>Al cambiarla se cierran todas las sesiones abiertas del restaurante. Si no
                le comunicas la nueva, se queda fuera del panel.</span>
            </p>
            <p class="adm-f-txt">
              El restaurante no puede cambiar su contraseña: sólo se cambia desde aquí. No hace
              falta saber la antigua.
            </p>
            <form method="post" class="adm-form-seg">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <input type="hidden" name="reset_cliente" value="1">
              <label class="adm-lbl" for="super-cliente-nueva">Contraseña nueva del restaurante <span class="opt">(mín. 8)</span></label>
              <input class="adm-campo" type="password" id="super-cliente-nueva" name="cliente_nueva" autocomplete="off" required>
              <button class="adm-btn" type="submit">Restablecer</button>
            </form>
          </div>
        </details>

        <?php /* ------------------------------------------------ mi propia contraseña */ ?>
        <details class="adm-f adm-f-super adm-f-plega adm-f-clisuper">
          <summary>
            <span class="adm-f-ico"><?php /* Lucide «lock» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
            <span class="adm-f-tit">Mi contraseña</span>
            <span class="adm-f-plega-v"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span>
          </summary>
          <div class="adm-f-plega-cuerpo">
            <?php if ($super_en_entorno): ?>
              <p class="adm-f-txt">
                Tu hash vive en la variable de entorno <code>SUPERADMIN_PASSWORD_HASH</code>.
                Genera uno nuevo con <code>hash.php</code> y cámbialo donde esté definida la
                variable; desde aquí no se puede escribir.
              </p>
            <?php else: ?>
              <p class="adm-aviso-seg">
                <?php /* Lucide «triangle-alert» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                <span>Cambiarla expulsa a cualquier otra sesión de superadministrador abierta.
                  Esta sigue dentro.</span>
              </p>
              <form method="post" class="adm-form-seg">
                <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
                <input type="hidden" name="cambiar_super" value="1">
                <label class="adm-lbl" for="super-actual">Contraseña actual</label>
                <input class="adm-campo" type="password" id="super-actual" name="super_actual" autocomplete="current-password" required>
                <label class="adm-lbl" for="super-nueva">Contraseña nueva <span class="opt">(mín. 12)</span></label>
                <input class="adm-campo" type="password" id="super-nueva" name="super_nueva" autocomplete="new-password" required>
                <button class="adm-btn" type="submit">Cambiar</button>
              </form>
            <?php endif; ?>
          </div>
        </details>

        <?php /* ----------------------------------------------- el registro de accesos */ ?>
        <?php
          $log_lineas = [];
          $log_raw = @file_get_contents(LOG_PATH);
          if (is_string($log_raw) && $log_raw !== '') {
            $log_lineas = array_slice(array_filter(explode("\n", trim($log_raw))), -30);
            $log_lineas = array_reverse($log_lineas);
          }
        ?>
        <details class="adm-f adm-f-super adm-f-plega adm-f-log">
          <summary>
            <span class="adm-f-ico"><?php /* Lucide «scroll-text» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg></span>
            <span class="adm-f-tit">Registro de accesos</span>
            <span class="der"><span class="adm-f-nota"><?= $log_lineas ? count($log_lineas) . ' líneas' : 'vacío' ?></span></span>
            <span class="adm-f-plega-v"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span>
          </summary>
          <div class="adm-f-plega-cuerpo">
            <p class="adm-f-txt">
              Entradas, fallos y cambios de contraseña, con fecha UTC e IP. Nunca se apuntan
              contraseñas. Se rota solo al pasar de 256&nbsp;KB.
            </p>
            <?php if (!$log_lineas): ?>
              <p class="adm-vacio">
                <?php /* Lucide «file-clock» */ ?><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 18a3 3 0 1 0-6 0"/><path d="M4.5 13V4a2 2 0 0 1 2-2h7.5l6 6v12a2 2 0 0 1-2 2H8"/><path d="M12 16v2l1.5 1"/></svg>
                Todavía no hay nada apuntado.
              </p>
            <?php else: ?>
              <pre class="adm-log" tabindex="0" aria-label="Últimas <?= count($log_lineas) ?> líneas del registro"><?php
                foreach ($log_lineas as $l) echo h($l) . "\n";
              ?></pre>
            <?php endif; ?>
          </div>
        </details>
      <?php endif; ?>

      </div>

    </div>
  </section>

  <script>
    /* MISE-B: todos los destinos siguen en el mismo documento; esto sólo enseña un panel.
       Los botones que cambian de panel viven en tres sitios —sidebar, barra inferior, hoja
       «Más»— y los tres llevan data-tab con el mismo slug de siempre. La URL se sigue
       actualizando con replaceState, y el servidor sigue entendiendo ?t= al volver de un
       guardado, exactamente igual que con la barra de pestañas que sustituye. */
    (function () {
      var botones = [].slice.call(document.querySelectorAll('[data-tab]'));
      var paneles = [].slice.call(document.querySelectorAll('.pane'));
      if (!botones.length || !paneles.length) return;

      var tituloCabecera = document.getElementById('adm-topbar-titulo');

      function abrir(slug) {
        paneles.forEach(function (p) { p.hidden = p.dataset.pane !== slug; });
        botones.forEach(function (b) {
          var on = b.dataset.tab === slug;
          b.classList.toggle('on', on);
          if (b.hasAttribute('aria-selected')) b.setAttribute('aria-selected', String(on));
          if (b.hasAttribute('aria-current')) b.setAttribute('aria-current', on ? 'page' : 'false');
        });
        /* SocialCard V2: el titulo de la cabecera dice donde estas. El nombre se lee del
           propio boton de navegacion (su aria-label), que ya lo trae de $PESTANAS: no hay
           una segunda lista de rotulos en JavaScript que se pueda quedar vieja. */
        if (tituloCabecera) {
          var boton = botones.filter(function (b) { return b.dataset.tab === slug && b.getAttribute('aria-label'); })[0];
          if (boton) tituloCabecera.textContent = boton.getAttribute('aria-label');
        }
        try { history.replaceState(null, '', '?t=' + encodeURIComponent(slug)); } catch (e) {}
        // cambiar de destino es empezar otra tarea: se vuelve arriba, como al abrirla
        window.scrollTo(0, 0);
      }
      window.admIrA = abrir;

      botones.forEach(function (b) {
        b.addEventListener('click', function () {
          abrir(b.dataset.tab);
          if (b.closest('#sheet-mas')) cerrarSheet();
        });
      });

      /* ---- hoja «Más» (móvil): inert de verdad mientras está cerrada, foco atrapado
         mientras está abierta, fondo (sidebar/barra inferior incluidos) bloqueado entero. */
      /* ---- SocialCard V2: claro / oscuro ----------------------------------------
         La clase ya la puso el guion del <head> antes de pintar nada; esto solo la
         cambia y la recuerda. Preferencia puramente visual: no viaja al servidor, no
         toca estado.json y no anade ninguna peticion. */
      (function () {
        var sw = document.getElementById('adm-tema-sw');
        if (!sw) return;
        var raiz = document.documentElement;

        function pintar(modo) {
          var oscuro = modo === 'dark';
          raiz.classList.toggle('dark', oscuro);
          raiz.classList.toggle('light', !oscuro);
          sw.setAttribute('aria-checked', String(oscuro));
          sw.title = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
          sw.setAttribute('aria-label', oscuro ? 'Modo oscuro activado' : 'Modo oscuro');
        }

        pintar(raiz.classList.contains('dark') ? 'dark' : 'light');

        sw.addEventListener('click', function () {
          var nuevo = raiz.classList.contains('dark') ? 'light' : 'dark';
          pintar(nuevo);
          try { localStorage.setItem('socialcard-color-mode', nuevo); } catch (e) {}
        });
      })();

      var sheet = document.getElementById('sheet-mas');
      var velo = document.getElementById('velo-sheet');
      var btnMas = document.getElementById('btn-mas-movil');
      var btnCerrar = document.getElementById('sheet-cerrar');
      var FONDO = ['#adm-sidebar', '.adm-navmovil'].map(function (s) { return document.querySelector(s); });
      var elementoQueAbrio = null;

      function bloquearFondo(bloquear) {
        FONDO.forEach(function (el) { if (el) el.inert = bloquear; });
      }
      function focosDe(cont) {
        return [].slice.call(cont.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
          .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
      }
      function abrirSheet(disparador) {
        if (!sheet) return;
        elementoQueAbrio = disparador || document.activeElement;
        velo.classList.add('activo');
        sheet.classList.add('activo');
        sheet.setAttribute('aria-hidden', 'false');
        sheet.inert = false;
        bloquearFondo(true);
        var primero = sheet.querySelector('.adm-sheet-item');
        if (primero) primero.focus();
      }
      function cerrarSheet() {
        if (!sheet || !sheet.classList.contains('activo')) return;
        velo.classList.remove('activo');
        sheet.classList.remove('activo');
        sheet.setAttribute('aria-hidden', 'true');
        sheet.inert = true;
        bloquearFondo(false);
        if (elementoQueAbrio && elementoQueAbrio.focus) elementoQueAbrio.focus();
      }
      if (btnMas) btnMas.addEventListener('click', function () { abrirSheet(btnMas); });
      if (btnCerrar) btnCerrar.addEventListener('click', cerrarSheet);
      if (velo) velo.addEventListener('click', cerrarSheet);
      if (sheet) {
        sheet.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { e.preventDefault(); cerrarSheet(); return; }
          if (e.key !== 'Tab') return;
          var f = focosDe(sheet);
          if (!f.length) return;
          var primero = f[0], ultimo = f[f.length - 1];
          if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
          else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
        });
      }
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
    /* SocialCard V6: el campo de fichero ya no enseña el rótulo que pinta el navegador
       —está tapado—, así que lo escribe esto. Es puro adorno: sin JavaScript el campo sigue
       subiendo igual, sólo que sin decir cuántas fotos hay elegidas. */
    (function () {
      var campos = [].slice.call(document.querySelectorAll('.adm-archivo input[type=file]'));
      campos.forEach(function (inp) {
        var rot = inp.parentNode.querySelector('.adm-archivo-txt');
        if (!rot) return;
        inp.addEventListener('change', function () {
          var n = inp.files ? inp.files.length : 0;
          rot.textContent = n === 0 ? rot.dataset.vacio
                          : n === 1 ? inp.files[0].name
                          : n + ' fotos elegidas';
        });
      });
    })();

    (function () {
      var caja = document.querySelector('.adm-fotos');
      if (!caja || !window.fetch) return;

      var aviso = document.querySelector('.pane[data-pane="marca"] .adm-foto-aviso');

      function decir(txt, mal) {
        if (window.toast) { toast(txt, mal ? 'bad' : 'ok'); return; }
        if (!aviso) return;
        aviso.textContent = txt;
        aviso.className = 'adm-foto-aviso' + (mal ? ' adm-foto-aviso-mal' : '');
      }

      function renumerar() {
        var filas = [].slice.call(caja.querySelectorAll('.adm-foto'));
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
        var fila = b.closest('.adm-foto');
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
  </div><?php /* .card-main */ ?>

  <?php /* ------------------------------------------------- las acciones, fuera de la caja
   * Guardar no es contenido: es lo que se hace con el contenido. Por eso sale de la
   * tarjeta y se queda debajo, centrado, en el fondo de la pagina.
   *
   * Es SISTEMA, no un apaño de Publicidad: cada pestaña que se migre emite aqui su tira
   * con data-para="<slug>", y el JavaScript de abajo enseña la que corresponde a la
   * pestaña activa. Los botones se enganchan a su formulario con form="<id>", que
   * funciona sin JavaScript.
   *
   * Sin JavaScript se ven todas las tiras. Es feo y es correcto: se puede guardar.
   */ ?>
  <?php if (CLIENTE_PUBLICIDAD): ?>
    <div class="adm-acciones-fuera" data-para="publicidad">
      <span class="adm-acciones-estado"><?= h($pubEstado ?? '') ?></span>
      <a class="adm-btn adm-btn-ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver la carta</a>
      <button class="adm-btn adm-btn-guardar" form="pub-form" name="guardar_publicidad" value="1" type="submit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        Guardar cambios
      </button>
    </div>
  <?php endif; ?>

  <?php /* MISE-B: agotado y precio ya se guardan solos (autosubmit por JS, ver el script de
           Platos); esta tira es el respaldo SIN JavaScript de los dos a la vez — dos botones,
           cada uno enganchado a su propio formulario/handler de siempre. Destacado sigue sin
           tira: cada etiqueta se añade y se quita con su propio botón, al momento, igual que
           antes. */ ?>
  <?php if (!$previsua): $nAgotados = count($agotados); ?>
  <div class="adm-acciones-fuera" data-para="platos">
    <span class="adm-acciones-estado"><?= $nAgotados === 1 ? '1 plato agotado' : $nAgotados . ' platos agotados' ?></span>
    <a class="adm-btn adm-btn-ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver la carta</a>
    <button class="adm-btn adm-btn-guardar" form="agotados-form" type="submit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      Guardar agotados
    </button>
    <button class="adm-btn adm-btn-guardar" form="precios-form" type="submit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      Guardar precios
    </button>
  </div>
  <?php endif; ?>

  <?php $ofSueltos = count((array) $oferta['keys']); ?>
  <div class="adm-acciones-fuera" data-para="ofertas">
    <span class="adm-acciones-estado"><?= $ofSueltos === 1 ? '1 plato suelto en oferta' : $ofSueltos . ' platos sueltos en oferta' ?></span>
    <a class="adm-btn adm-btn-ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver la carta</a>
    <button class="adm-btn adm-btn-guardar" form="ofertas-form" name="guardar_oferta" value="1" type="submit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      Guardar cambios
    </button>
  </div>

  <?php if ($previsua): ?>
    <?php /* Sólo mientras hay propuesta en pantalla: en la otra pantalla de Precios no hay
             nada que guardar, se elige de dónde sale el cambio y ya. */ ?>
    <div class="adm-acciones-fuera" data-para="platos-revisar">
      <span class="adm-acciones-estado">Todavía no se ha publicado nada</span>
      <a class="adm-btn adm-btn-ver" href="?t=platos">Cancelar</a>
      <button class="adm-btn adm-btn-guardar" form="precios-form" name="precios_publicar" value="1" type="submit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        Publicar precios
      </button>
    </div>
  <?php endif; ?>

  <?php if (CLIENTE_JUEGO): ?>
    <div class="adm-acciones-fuera" data-para="juego">
      <span class="adm-acciones-estado"><?= !empty($juego['on']) ? 'El juego sale en la carta' : 'El juego no sale en la carta' ?></span>
      <a class="adm-btn adm-btn-ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver la carta</a>
      <button class="adm-btn adm-btn-guardar" form="juego-form" name="guardar_juego" value="1" type="submit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        Guardar cambios
      </button>
    </div>
  <?php endif; ?>

  <?php $marcaNombre = $marca['nombreVisible'] !== '' ? $marca['nombreVisible'] : CLIENTE_NOMBRE; ?>
  <div class="adm-acciones-fuera" data-para="marca">
    <span class="adm-acciones-estado">En la carta: <?= h($marcaNombre) ?></span>
    <a class="adm-btn adm-btn-ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver la carta</a>
    <button class="adm-btn adm-btn-guardar" form="marca-form" name="guardar_marca" value="1" type="submit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      Guardar cambios
    </button>
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

<?php /* ==================================================== publicidad: fechas y ayuda ====
 * Todo lo de aqui es opcional por diseno: si este script no corre, el pane se comporta
 * exactamente como antes —los dos <input type="datetime-local"> del navegador, visibles y
 * funcionando—. Lo primero que hace es marcar el pane con .adm-js, y es esa clase la que
 * esconde los controles nativos. Sin script, no hay clase y no se esconde nada.
 */ ?>
<?php if (CLIENTE_PUBLICIDAD && $dentro): ?>
<script>
(function () {
  var pane = document.querySelector('.pane[data-pane="publicidad"]');
  if (!pane) return;
  var ini = document.getElementById('pub-inicio');
  var fin = document.getElementById('pub-fin');
  if (!ini || !fin) return;

  pane.classList.add('adm-js');

  /* ---------------------------------------------------------------- fechas, sin librerias */
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var DOW = ['L','M','X','J','V','S','D'];          // la semana empieza en lunes
  var HOY = new Date(); HOY.setHours(0,0,0,0);

  function dosCifras(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + dosCifras(d.getMonth()+1) + '-' + dosCifras(d.getDate()); }
  function mismo(a, b) { return !!a && !!b && iso(a) === iso(b); }
  function suma(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function finMes(d) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
  function lunes(d) { var x = new Date(d); x.setDate(x.getDate() - ((x.getDay()+6) % 7)); return x; }
  function bonita(d) {
    if (!d) return '';
    return d.getDate() + ' de ' + MESES[d.getMonth()]
      + (d.getFullYear() !== HOY.getFullYear() ? ' de ' + d.getFullYear() : '');
  }
  function dias(a, b) { return Math.round((new Date(iso(b)) - new Date(iso(a))) / 86400000); }

  /* Lee y escribe el valor del control nativo. Ese es el contrato: "Y-m-d\TH:i". */
  function leer(input) {
    var v = (input.value || '').trim();
    if (!v) return { f: null, h: '' };
    var p = v.split('T');
    var q = p[0].split('-');
    if (q.length !== 3) return { f: null, h: '' };
    var d = new Date(+q[0], +q[1] - 1, +q[2]);
    if (isNaN(d.getTime())) return { f: null, h: '' };
    return { f: d, h: (p[1] || '00:00').slice(0, 5) };
  }
  function escribir(input, fecha, hora) {
    input.value = fecha ? iso(fecha) + 'T' + (hora || '00:00') : '';
  }

  var A = leer(ini), B = leer(fin);
  var est = {
    /* El dia que lleva el foco dentro del calendario. Se mueve con las flechas y
       sobrevive a cada repintado, que es lo que hace que teclear no reinicie. */
    foco: null,
    ini: A.f, iniHora: A.h || '00:00',
    fin: B.f, finHora: B.h || '23:59',
    mes: new Date((A.f || HOY).getFullYear(), (A.f || HOY).getMonth(), 1),
    calAbierto: false,
    eligiendo: 'ini',
    atajo: null
  };

  function volcar() {
    escribir(ini, est.ini, est.iniHora);
    escribir(fin, est.fin, est.finHora);
  }

  /* ------------------------------------------------------------------------- los atajos
   * Cada duracion con su icono, para que se distingan de un vistazo y no haya que leer
   * las cinco. Dibujados aqui: ningun icono viene de fuera. */
  var DIBUJOS = {
    semana:   '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7 13.5h4"/>',
    quincena: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7 13.5h10M7 17h6"/>',
    mes:      '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M15.5 14.5l2 2l2.5-3"/>',
    ano:      '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M8 13h2M8 16.5h2M13 13h3M13 16.5h3"/>',
    sinfin:   '<path d="M7 15.5a3.5 3.5 0 1 1 0-7c2.6 0 3.4 3.5 5 3.5s2.4-3.5 5-3.5a3.5 3.5 0 1 1 0 7c-2.6 0-3.4-3.5-5-3.5s-2.4 3.5-5 3.5z"/>',
    otras:    '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="12.5" cy="15" r="2.5"/><path d="M14.4 16.9l1.6 1.6"/>',
    sin:      '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M9.5 15.5l5-3.5M9.5 12l5 3.5"/>',
    reloj:    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  };
  function dibujo(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (DIBUJOS[n] || '') + '</svg>';
  }

  var ATAJOS = [
    ['semana',   'Una semana',         '7 dias desde hoy'],
    ['quincena', 'Quince dias',        '15 dias desde hoy'],
    ['mes',      'Hasta fin de mes',   'Al ultimo dia del mes'],
    ['ano',      '365 dias',           'Un ano entero'],
    ['sinfin',   'Desde hoy, sin fin', 'Hasta que lo apagues']
  ];
  function aplicaAtajo(k) {
    var hoy = new Date(HOY);
    est.atajo = k;
    if (k === 'semana')   { est.ini = hoy; est.fin = suma(hoy, 6);   est.finHora = '23:59'; }
    if (k === 'quincena') { est.ini = hoy; est.fin = suma(hoy, 14);  est.finHora = '23:59'; }
    if (k === 'mes')      { est.ini = hoy; est.fin = finMes(hoy);    est.finHora = '23:59'; }
    if (k === 'ano')      { est.ini = hoy; est.fin = suma(hoy, 364); est.finHora = '23:59'; }
    if (k === 'sinfin')   { est.ini = hoy; est.fin = null; }
    est.mes = new Date(est.ini.getFullYear(), est.ini.getMonth(), 1);
    est.calAbierto = false;
    est.eligiendo = 'ini';
  }

  /* -------------------------------------------------------------------------- el pintado */
  var cajaAtajos = document.getElementById('pub-atajos');
  var cajaCal    = document.getElementById('pub-cal');
  var cajaHoras  = document.getElementById('pub-horas');
  var cajaTramo  = document.getElementById('pub-tramo');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function flecha(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'
      + (d < 0 ? 'M15 6l-6 6l6 6' : 'M9 6l6 6l-6 6') + '"/></svg>';
  }

  /* Un mes: solo su nombre y su rejilla. Las flechas ya no viven aqui — hay una
     sola cabecera para los dos, mas arriba.

     SIEMPRE 42 celdas, seis filas. Antes se cortaba en 35 cuando el mes cabia en
     cinco, y entonces el mes de al lado, que necesitaba seis, quedaba una fila mas
     abajo: los dias de uno y otro no cuadraban. Las que sobran se ocultan con
     visibility, que reserva el hueco; display:none no lo haria. */
  /* ¿Cae esa fecha en alguno de los dos meses que se ven? */
  function dentroDeLosDosMeses(isoDia) {
    var q = isoDia.split('-'), d = new Date(+q[0], +q[1] - 1, +q[2]);
    var a = new Date(est.mes.getFullYear(), est.mes.getMonth(), 1);
    var b = new Date(est.mes.getFullYear(), est.mes.getMonth() + 2, 0);
    return d >= a && d <= b;
  }

  function mesHTML(base) {
    var primero = new Date(base.getFullYear(), base.getMonth(), 1);
    var arranque = lunes(primero);
    var h = '<div class="adm-cal-mes">';
    h += '<div class="adm-cal-mes-rot">' + MESES[base.getMonth()] + ' ' + base.getFullYear() + '</div>';
    h += '<div class="adm-cal-rejilla">';
    for (var i = 0; i < 7; i++) h += '<span class="adm-cal-dow" aria-hidden="true">' + DOW[i] + '</span>';
    for (var j = 0; j < 42; j++) {
      var d = suma(arranque, j);
      var otro = d.getMonth() !== base.getMonth();
      var c = ['adm-cal-d'];
      if (otro) c.push('fuera');
      if (mismo(d, HOY)) c.push('hoy');
      if (!otro && est.ini && est.fin) {
        if (d > est.ini && d < est.fin) c.push('dentro');
        if (mismo(d, est.ini)) c.push('extremo', 'ini');
        if (mismo(d, est.fin)) c.push('extremo', 'fin');
      } else if (!otro && est.ini && mismo(d, est.ini)) {
        c.push('extremo', 'ini', 'fin');
      }
      /* Un solo dia tabulable en todo el calendario (el patron de rejilla): con 61
         botones, salir de aqui con el tabulador eran 61 pulsaciones. El resto se
         recorre con las flechas. */
      var esFoco = !otro && iso(d) === est.foco;
      h += '<button type="button" class="' + c.join(' ') + '" data-dia="' + iso(d) + '"'
        + (otro ? ' tabindex="-1" aria-hidden="true"' : ' tabindex="' + (esFoco ? '0' : '-1') + '"')
        + ' aria-label="' + esc(bonita(d)) + '">' + d.getDate() + '</button>';
    }
    return h + '</div></div>';
  }

  function pintar() {
    /* atajos: ficha con icono, titulo, apunte y el punto de elegido */
    function ficha(clave, icono, titulo, apunte, elegido, extra) {
      return '<button type="button" class="adm-atajo" ' + (extra || ('data-atajo="' + clave + '"'))
        + ' aria-pressed="' + (elegido ? 'true' : 'false') + '">'
        + '<span class="ico">' + dibujo(icono) + '</span>'
        + '<span class="punto" aria-hidden="true"></span>'
        + '<span class="t">' + esc(titulo) + '</span>'
        + '<span class="s">' + esc(apunte) + '</span></button>';
    }
    var ha = '';
    for (var i = 0; i < ATAJOS.length; i++) {
      ha += ficha(ATAJOS[i][0], ATAJOS[i][0], ATAJOS[i][1], ATAJOS[i][2], est.atajo === ATAJOS[i][0]);
    }
    ha += ficha('', 'otras', 'Otras fechas', 'Elegirlas en el calendario', est.calAbierto, 'data-otras');
    /* "Quitar las fechas" sale de la rejilla: no es una duracion, es deshacer. Se
       queda como enlace debajo, que sigue estando pero no compite con las otras. */
    ha += '<p class="adm-quitar-fechas"><button type="button" data-sin>Quitar las fechas</button>'
        + '<span> — el banner empieza al encenderlo y no caduca</span></p>';
    cajaAtajos.innerHTML = ha;
    cajaAtajos.hidden = false;

    /* calendario */
    if (est.calAbierto) {
      var seg = new Date(est.mes.getFullYear(), est.mes.getMonth() + 1, 1);
      /* El dia con foco: el inicio elegido si esta a la vista, si no hoy, si no el
         primero del mes. Sin esto no habria ningun boton tabulable en la rejilla. */
      if (!est.foco || !dentroDeLosDosMeses(est.foco)) {
        var cand = (est.ini && dentroDeLosDosMeses(iso(est.ini))) ? est.ini
                 : (dentroDeLosDosMeses(iso(HOY)) ? HOY : new Date(est.mes));
        est.foco = iso(cand);
      }
      /* Una sola cabecera para los dos meses, con las flechas en los extremos y
         el tramo que se ve en medio. Antes cada mes llevaba su barra y el segundo
         tenia dos huecos vacios donde el primero tenia botones. */
      cajaCal.innerHTML = '<div class="adm-cal">'
        + '<div class="adm-cal-cab">'
        +   '<button type="button" class="adm-cal-nav" data-mes="-1" aria-label="Meses anteriores">' + flecha(-1) + '</button>'
        +   '<span class="adm-cal-rango">' + esc(MESES[est.mes.getMonth()]) + ' — ' + esc(MESES[seg.getMonth()])
        +     ' <span class="ano">' + seg.getFullYear() + '</span></span>'
        +   '<button type="button" class="adm-cal-nav" data-mes="1" aria-label="Meses siguientes">' + flecha(1) + '</button>'
        + '</div>'
        + '<div class="adm-cal-meses">' + mesHTML(est.mes) + mesHTML(seg) + '</div>'
        + '<div class="adm-cal-pie"><span class="lee">'
        + (est.eligiendo === 'ini' ? 'Toca el dia en que empieza.' : 'Ahora el dia en que termina.')
        + '</span><button type="button" class="adm-btn" data-cerrar-cal>Listo</button></div></div>';
      cajaCal.hidden = false;
    } else {
      cajaCal.innerHTML = '';
      cajaCal.hidden = true;
    }

    /* horas, cada una con su reloj */
    function hora(id, rot, cual, valor) {
      return '<div><label for="' + id + '">' + rot + '</label>'
        + '<span class="adm-hora-caja"><input type="time" id="' + id + '" data-hora="' + cual + '"'
        + ' value="' + esc(valor) + '">' + dibujo('reloj') + '</span></div>';
    }
    cajaHoras.innerHTML = hora('adm-h-ini', 'Empieza a las', 'ini', est.iniHora)
                        + hora('adm-h-fin', 'Termina a las', 'fin', est.finHora);
    cajaHoras.hidden = false;

    /* tramo */
    var t;
    if (!est.ini && !est.fin) {
      t = '<span class="cuando">Sin fechas</span>'
        + '<span class="dura">Empieza al encenderlo y no caduca.</span>';
    } else {
      var n = (est.ini && est.fin) ? dias(est.ini, est.fin) + 1 : null;
      t = '<span class="cuando">' + (est.ini ? 'Del ' + esc(bonita(est.ini)) : 'Desde ya') + ' '
        + (est.fin ? 'al ' + esc(bonita(est.fin)) : 'sin fecha de fin') + '</span>'
        + (n ? '<span class="dura">' + n + (n === 1 ? ' dia' : ' dias')
               + ' &middot; de ' + esc(est.iniHora) + ' a ' + esc(est.finHora) + '</span>' : '');
    }
    cajaTramo.innerHTML = t;
    cajaTramo.hidden = false;

    volcar();

    /* Devolver el foco al dia que lo tenia: sin esto, cada flecha repinta y el foco
       se va al principio del documento. */
    if (est.devolverFoco) {
      est.devolverFoco = false;
      var d = cajaCal.querySelector('[data-dia="' + est.foco + '"]');
      if (d) d.focus();
    }
  }

  /* ------------------------------------------------------------------------- los clicks */
  pane.addEventListener('click', function (e) {
    var b;

    b = e.target.closest('[data-atajo]');
    if (b) { aplicaAtajo(b.dataset.atajo); pintar(); return; }

    if (e.target.closest('[data-otras]')) {
      est.calAbierto = !est.calAbierto; est.atajo = null; est.eligiendo = 'ini'; pintar(); return;
    }
    if (e.target.closest('[data-cerrar-cal]')) { est.calAbierto = false; pintar(); return; }
    if (e.target.closest('[data-sin]')) {
      est.ini = null; est.fin = null; est.atajo = null; est.eligiendo = 'ini'; pintar(); return;
    }

    b = e.target.closest('[data-mes]');
    if (b) { est.mes = new Date(est.mes.getFullYear(), est.mes.getMonth() + (+b.dataset.mes), 1); pintar(); return; }

    b = e.target.closest('[data-dia]');
    if (b) {
      var q = b.dataset.dia.split('-');
      var d = new Date(+q[0], +q[1] - 1, +q[2]);
      if (est.eligiendo === 'ini') { est.ini = d; est.fin = null; est.eligiendo = 'fin'; }
      else {
        /* Si el segundo toque cae antes que el primero, se invierte en vez de
           rechazarlo: es lo que la persona quiere decir. */
        if (est.ini && d < est.ini) { est.fin = est.ini; est.ini = d; } else { est.fin = d; }
        est.eligiendo = 'ini';
      }
      est.atajo = null;
      /* El foco se queda en el dia que se acaba de elegir. Sin esto, elegir el
         inicio te deja sin sitio y hay que volver a entrar en la rejilla para
         elegir el fin. */
      est.foco = iso(d);
      est.devolverFoco = true;
      pintar();
    }
  });

  /* ------------------------------------------------------- el calendario, con teclado
   * Patron de rejilla: flechas para moverse, Inicio/Fin a los extremos de la semana,
   * RePag/AvPag para cambiar de mes, y Enter o Espacio eligen (eso ya lo hace el
   * boton). Al repintar se devuelve el foco al dia que lo tenia, o teclear reiniciaria
   * la posicion en cada pulsacion. */
  pane.addEventListener('keydown', function (e) {
    var d = e.target.closest('[data-dia]');
    if (!d) return;
    var salto = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7, PageUp:null, PageDown:null };
    if (!(e.key in salto) && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();

    var q = d.dataset.dia.split('-');
    var hoy = new Date(+q[0], +q[1] - 1, +q[2]);

    if (e.key === 'PageUp' || e.key === 'PageDown') {
      est.mes = new Date(est.mes.getFullYear(), est.mes.getMonth() + (e.key === 'PageUp' ? -1 : 1), 1);
      est.foco = iso(suma(hoy, e.key === 'PageUp' ? -28 : 28));
    } else if (e.key === 'Home') {
      est.foco = iso(lunes(hoy));
    } else if (e.key === 'End') {
      est.foco = iso(suma(lunes(hoy), 6));
    } else {
      est.foco = iso(suma(hoy, salto[e.key]));
    }
    /* Si el salto se sale de los dos meses, el calendario avanza con el. */
    if (!dentroDeLosDosMeses(est.foco)) {
      var f = est.foco.split('-');
      est.mes = new Date(+f[0], +f[1] - 1, 1);
    }
    est.devolverFoco = true;
    pintar();
  });

  pane.addEventListener('change', function (e) {
    var h = e.target.closest('[data-hora]');
    if (!h) return;
    if (h.dataset.hora === 'ini') est.iniHora = h.value || '00:00';
    else est.finHora = h.value || '23:59';
    est.atajo = null;
    pintar();
  });

  pintar();

  /* --------------------------------------------------------------- la imagen, en un toque */
  var formImg = document.getElementById('pub-form-img');
  if (formImg) {
    var etiqueta = formImg.querySelector('.adm-btn-archivo');
    var campo = formImg.querySelector('input[type=file]');
    var envio = formImg.querySelector('.adm-subir-envio');
    if (etiqueta && campo && envio) {
      etiqueta.hidden = false;                       // sin JS se queda escondida
      campo.addEventListener('change', function () {
        if (!campo.files || !campo.files.length) return;
        /* Estado de subida: sin esto se elige el fichero y no pasa nada visible
           hasta que la pagina vuelve. Con una imagen de 2 MB en el movil del
           restaurante eso son varios segundos de duda. */
        etiqueta.setAttribute('aria-busy', 'true');
        etiqueta.classList.add('esta-subiendo');
        etiqueta.textContent = 'Subiendo…';
        /* Se PULSA el boton, no se envia el formulario: form.submit() no incluye
           el name/value del boton, y sin subir_banner=1 el servidor no entra en
           la rama de subida. La imagen se iria al limbo sin decir nada. */
        envio.click();
      });
    }
  }
})();
</script>
<?php endif; ?>

<?php /* ================================================== el sistema, para todas las pestañas
 * Tres cosas que empezaron dentro de Publicidad y ya no son suyas: la tira de acciones de
 * fuera de la caja, el rótulo de los interruptores y la ayuda en globo. Cada pestaña que se
 * migra las usa tal cual, así que viven aquí y no dentro del script de una pestaña — si se
 * quedaran allí, un cliente sin Publicidad se quedaría también sin ellas.
 *
 * Todo es opcional por diseño: si este script no corre, las tiras se ven todas (feo y
 * correcto: se puede guardar), los interruptores dicen lo que escribió PHP, y las ayudas se
 * quedan como el párrafo de texto que ya eran.
 */ ?>
<?php if ($dentro): ?>
<div id="adm-ayudas"></div>
<script>
(function () {

  /* ------------------------------------------- las acciones de fuera de la caja
   * Cada pestaña migrada emite su tira con data-para. Aqui solo se enseña la de la
   * pestaña activa. Marcar el <html> es lo que apaga el respaldo de "sin JavaScript
   * se ven todas": si este script no corre, la clase no se pone y se ven todas. */
  document.documentElement.classList.add('adm-con-js');
  var tiras = [].slice.call(document.querySelectorAll('.adm-acciones-fuera'));
  /* Platos es la única pestaña cuya tira es puro respaldo sin JavaScript: agotado y precio
     ya se guardan solos (autosubmit, ver el script de Platos). Con JS activo no se enseña
     ni siendo la pestaña activa — con JS apagado, el bloque de arriba (adm-con-js) nunca se
     añade y la regla CSS de siempre la sigue mostrando igual que a las demás. */
  function tiraDe(slug) {
    tiras.forEach(function (t) {
      /* La tira de revisar precios no depende de qué pestaña esté «activa» — sólo existe en
         el DOM cuando el servidor está mostrando esa pantalla ($previsua), así que si está
         presente, se enseña siempre. */
      if (t.dataset.para === 'platos-revisar') { t.setAttribute('data-visible', ''); return; }
      if (t.dataset.para === slug && t.dataset.para !== 'platos') t.setAttribute('data-visible', '');
      else t.removeAttribute('data-visible');
    });
  }
  if (tiras.length) {
    var activa = document.querySelector('[data-tab].on');
    tiraDe(activa ? activa.dataset.tab : '');
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { tiraDe(b.dataset.tab); });
    });
  }

  /* El rotulo del interruptor lo pinta PHP con el estado guardado; al tocarlo hay que
     moverlo, o dice "Apagado" con el interruptor ya encendido. Los dos textos vienen en
     data-on y data-off del propio rotulo: el interruptor de Publicidad dice "Encendido" y
     el de la nota de Google dice otra cosa, y el codigo no tiene por que saberlo. */
  [].slice.call(document.querySelectorAll('.adm-sw')).forEach(function (caja) {
    var entrada = caja.querySelector('input');
    var texto = caja.querySelector('.adm-sw-txt');
    if (!entrada || !texto || !texto.dataset.on) return;
    entrada.addEventListener('change', function () {
      texto.textContent = entrada.checked ? texto.dataset.on : texto.dataset.off;
    });
  });

  /* ------------------------------------------------------- la lista de precios
   * Dos cosas, y las dos son opcionales: sin JavaScript la lista se ve entera y el
   * servidor completa las filas hermanas al publicar, que es lo que ya hacia.
   *
   * 1. El mismo plato esta en varias filas —su pestaña de comida y otra vez en Sin
   *    gluten o en Vegano— y el precio se escribe una sola vez. Se copia mientras se
   *    teclea para que se VEA que las dos filas se mueven: enterarse al publicar es
   *    enterarse tarde.
   * 2. El filtro. Son 312 platos repartidos en trece fichas; cambiar uno a mano sin
   *    buscador es recorrerlas a ojo. Esconde filas y esconde la ficha entera cuando
   *    no le queda ninguna, para que no queden trece cabeceras vacias. */
  document.addEventListener('input', function (e) {
    var campo = e.target;
    if (!campo.classList || !campo.classList.contains('adm-prow-nuevo')) return;
    var plato = campo.dataset.plato;
    if (!plato) return;
    document.querySelectorAll('.adm-prow-nuevo[data-plato="' + plato.replace(/"/g, '\\"') + '"]')
      .forEach(function (otro) { if (otro !== campo) otro.value = campo.value; });
  });

  var filtro = document.getElementById('precios-filtro');
  if (filtro) {
    var cuenta = document.getElementById('precios-cuenta');
    var fichas = [].slice.call(document.querySelectorAll('[data-tab-precios]'));
    filtro.addEventListener('input', function () {
      var q = filtro.value.trim().toLowerCase();
      var vistos = 0;
      fichas.forEach(function (ficha) {
        var quedan = 0;
        [].slice.call(ficha.querySelectorAll('.adm-prow')).forEach(function (fila) {
          var hay = q === '' || (fila.dataset.busca || '').indexOf(q) !== -1;
          fila.hidden = !hay;
          if (hay) quedan++;
        });
        ficha.hidden = quedan === 0;
        vistos += quedan;
      });
      if (!cuenta) return;
      cuenta.hidden = q === '';
      cuenta.textContent = vistos === 0
        ? 'Ningun plato con «' + filtro.value.trim() + '»'
        : (vistos === 1 ? '1 plato' : vistos + ' platos') + ' con «' + filtro.value.trim() + '»';
    });
  }

  /* ------------------------------------------------------------------------- la ayuda
   * Cada parrafo con data-adm-ayuda deja de ocupar sitio y se convierte en un boton
   * redondo con la "i" de informacion, colgado de donde diga data-adm-ancla. El texto
   * sale del propio parrafo: sin JavaScript se lee ahi mismo y no se pierde nada. */
  var capa = document.getElementById('adm-ayudas');
  var abierto = null;

  function cerrar() {
    if (capa) capa.innerHTML = '';
    if (abierto) { abierto.setAttribute('aria-expanded', 'false'); abierto.removeAttribute('aria-describedby'); }
    abierto = null;
  }
  function abrir(boton, titulo, texto) {
    var mismoBoton = abierto === boton;
    cerrar();
    if (mismoBoton || !capa) return;
    var id = 'adm-ay-' + Math.random().toString(36).slice(2, 8);
    var g = document.createElement('div');
    g.className = 'adm-globo'; g.id = id; g.setAttribute('role', 'dialog');
    var t = document.createElement('b'); t.textContent = titulo;
    g.appendChild(t); g.appendChild(document.createTextNode(texto));
    capa.appendChild(g);
    var r = boton.getBoundingClientRect();
    var izq = Math.max(8, Math.min(r.left + r.width / 2 - g.offsetWidth / 2, window.innerWidth - g.offsetWidth - 8));
    var arr = r.bottom + 10;
    if (arr + g.offsetHeight > window.innerHeight - 8) arr = Math.max(8, r.top - g.offsetHeight - 10);
    g.style.left = izq + 'px'; g.style.top = arr + 'px';
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-describedby', id);
    abierto = boton;
  }

  var hints = document.querySelectorAll('.hint[data-adm-ayuda]');
  for (var k = 0; k < hints.length; k++) {
    (function (hint) {
      var pane = hint.closest('.pane');
      if (!pane) return;
      var titulo = hint.getAttribute('data-adm-ayuda') || 'Ayuda';
      var texto = (hint.textContent || '').replace(/\s+/g, ' ').trim();
      if (!texto) return;
      /* Por defecto se cuelga de la linea del estado, que es la cabecera del pane. Un hint
         puede pedir otro sitio con data-adm-ancla: asi la ayuda queda junto a lo que explica
         y no se amontonan dos iconos en la cabecera. */
      var sel = hint.getAttribute('data-adm-ancla');
      var ancla = sel ? pane.querySelector(sel) : pane.querySelector('.adm-estado-linea');
      if (!ancla) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'adm-ayuda-b';
      /* Icono de informacion, no una interrogacion: la "i" dice "esto te explica
         algo" y la "?" dice "esto te pregunta algo". */
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
        + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<circle cx="12" cy="12" r="9.25"/><path d="M12 11.25v5"/><path d="M12 7.75h.01"/></svg>';
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-label', 'Que es ' + titulo);
      b.addEventListener('click', function (ev) { ev.stopPropagation(); abrir(b, titulo, texto); });
      ancla.appendChild(b);
      /* La clase que esconde el parrafo se pone SOLO cuando su ayuda ya tiene boton: si
         algo falla a medio camino, el texto se queda visible en vez de desaparecer. */
      pane.classList.add('adm-js');
    })(hints[k]);
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.adm-globo') && !e.target.closest('.adm-ayuda-b')) cerrar();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && abierto) { var b = abierto; cerrar(); b.focus(); }
  });
  window.addEventListener('resize', cerrar);
  window.addEventListener('scroll', cerrar, true);
})();
</script>
<?php endif; ?>
</body>
</html>
