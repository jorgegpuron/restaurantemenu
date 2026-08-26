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

/* Si se sube este archivo sin el config.php nuevo, la constante de los temas no existiria y
   el panel se caeria entero por una pestana. Una subida a medias no puede dejar sin carta a
   nadie: se define aqui el mismo valor por defecto y listo. */
if (!defined('TEMAS_PATH')) define('TEMAS_PATH', __DIR__ . '/temas.json');

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
session_name('totm_admin');
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
     inglés se conserva en name_en para quien conozca el plato por él (y para buscar). Un
     platos.json antiguo sin los campos en español sigue funcionando, en inglés. */
  foreach ($lista as &$p) {
    $p['name_en']  = (string) ($p['name'] ?? '');
    $p['group_en'] = (string) ($p['group'] ?? '');
    $p['tab_en']   = (string) ($p['tab'] ?? '');
    $p['name']  = (string) ($p['es'] ?? $p['name'] ?? '');
    $p['group'] = (string) ($p['group_es'] ?? $p['group'] ?? '');
    $p['tab']   = (string) ($p['tab_es'] ?? $p['tab'] ?? '');
    /* Lo que la carta enseña bajo el nombre: la pestaña y, si es distinto, el grupo. */
    $p['sub']   = $p['tab'] . ($p['group'] !== $p['tab'] ? ' · ' . $p['group'] : '');
  }
  unset($p);
  return $lista;
}

/* Los temas los escribe el build, igual que el catálogo de platos. Si el archivo no está
   —una subida a medias— el panel no se rompe: se queda con el tema de la casa y la pestaña
   avisa. Nunca se inventa un color aquí. */
function temas_json(): array {
  static $cache = null;                 // se consulta varias veces por peticion: se lee una
  if ($cache !== null) return $cache;
  $raw = @file_get_contents(TEMAS_PATH);
  $d = $raw === false ? null : json_decode($raw, true);
  $cache = is_array($d) ? $d : [];
  return $cache;
}

function temas(): array {
  $d = temas_json();
  return !empty($d['temas']) && is_array($d['temas']) ? $d['temas'] : [];
}

function tema_por_defecto(): string {
  $d = temas_json();
  return !empty($d['porDefecto']) ? (string) $d['porDefecto'] : 'marino';
}

function estado_vacio(): array {
  return [
    'soldOut' => [],
    'tags'    => [],
    'offer'   => ['on' => false, 'cats' => [], 'keys' => [], 'percent' => 20, 'from' => 600, 'to' => 720, 'days' => [1,2,3,4,5,6,7]],
    'prices'  => [],
    /* El juego de color de la marca. Es lo único del estado que no cambia a diario: se
       elige el día que se monta el restaurante y no se vuelve a tocar. */
    'theme'   => tema_por_defecto(),
    /* La nota de Google que sale al final de la carta. Arranca apagada y a cero a propósito:
       una carta recién montada no puede heredar la nota de otro restaurante. */
    'reviews' => ['on' => false, 'rating' => 0, 'count' => 0],
    /* Las fotos del carrusel de cabecera, en el orden en que se ven. Sólo los nombres de
       archivo: viven en assets/hero/ y ahí los deja el propio panel. */
    'hero'    => [],
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
  return is_writable(HERO_DIR);
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

/* Un nombre de archivo que llega por POST no se usa nunca tal cual para borrar: se comprueba
   que sea uno de los que hay en el estado. Sin esto, un ../../ borra lo que quiera. */
function hero_borrar(string $nombre, array $hero): bool {
  if (!in_array($nombre, $hero, true)) return false;
  @unlink(HERO_DIR . '/' . $nombre);
  return true;
}

function leer_estado(): array {
  $raw = @file_get_contents(ESTADO_PATH);
  $e = $raw === false ? [] : (json_decode($raw, true) ?: []);
  return array_replace(estado_vacio(), is_array($e) ? $e : []);
}

/* Escritura atómica: a un temporal y luego rename. Si el proceso se corta a medias queda el
   archivo anterior entero, y no un JSON truncado que la carta no sabría leer.
   El temporal lleva nombre único por escritura: con un nombre fijo, dos guardados a la vez
   (dos pestañas, la tablet de cocina y el móvil) se pisaban el .tmp entre el write y el
   rename y podía publicarse un archivo a medias. */
function guardar_estado(array $estado): bool {
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
   traducida en la carta; una etiqueta inventada aquí saldría en inglés en los tres idiomas. */
const ETIQUETAS = ['Bestseller', 'Most loved', 'Signature', 'Popular', 'Must try', 'Veggie favourite'];
const ETIQUETAS_ES = [
  'Bestseller' => 'Más vendido', 'Most loved' => 'El más querido', 'Signature' => 'De la casa',
  'Popular' => 'Popular', 'Must try' => 'Hay que probarlo', 'Veggie favourite' => 'Favorito veggie',
];
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
if ($sin_configurar && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['nueva'])) {
  usleep(300000);
  $espera = bloqueo_minutos_restantes();
  $nueva = (string) $_POST['nueva'];
  if (!hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) ($_POST['csrf'] ?? ''))) {
    $error = 'La página ha caducado. Recarga y vuelve a intentarlo.';
  } elseif ($espera > 0) {
    $error = 'Demasiados intentos seguidos. Espera ' . $espera . ' minuto(s) y vuelve a probar.';
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
    if ($clave_escrita) registrar_acceso('contraseña del restaurante configurada por primera vez');
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
$repetidos = [];
foreach ($lista as $p) { $repetidos[$p['name']] = ($repetidos[$p['name']] ?? 0) + 1; }
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
  $estado = leer_estado();
  $hoy = fecha_servicio();

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

  /* Marca: colores y opiniones en el MISMO guardado. Cuando eran dos formularios distintos
     en la misma pantalla, guardar uno perdía lo que hubiera escrito en el otro. Un botón.

     Del tema sólo se acepta un slug que exista en temas.json: un valor libre acabaría como un
     data-tema sin CSS detrás, es decir, la carta en los colores de otro. */
  if (isset($_POST['guardar_marca'])) {
    $pestana = 'marca';
    $elegido = (string) ($_POST['tema'] ?? '');
    $validos = array_column(temas(), 'slug');

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

    if (!in_array($elegido, $validos, true)) {
      $error = 'Ese juego de colores no existe. Elige uno de la lista.';
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
      $estado['theme'] = $elegido;
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
    foreach (array_unique((array) ($_POST['agotado'] ?? [])) as $k) {
      if (is_string($k) && in_array($k, $validas, true)) $nuevo[$k] = $hoy;
    }
    $estado['soldOut'] = $nuevo;
    if (guardar_estado($estado)) {
      $aviso = count($nuevo) === 0
        ? 'Guardado: hoy no hay nada agotado.'
        : 'Guardado: ' . count($nuevo) . ' plato(s) agotados. Se limpia solo mañana a las ' . CORTE_HORA . ':00.';
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
    $catsSel = array_values(array_filter((array) ($_POST['cat'] ?? []), function ($c) use ($cats) {
      return is_string($c) && isset($cats[$c]);
    }));
    // platos sueltos: los de una categoría ya marcada entera no se guardan dos veces
    $keysSel = array_values(array_filter(array_unique((array) ($_POST['oferta_plato'] ?? [])),
      function ($k) use ($porKey, $catsSel) {
        return is_string($k) && isset($porKey[$k]) && !in_array($porKey[$k]['cat'], $catsSel, true);
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
    foreach ((array) ($_POST['precio'] ?? []) as $k => $v) {
      if (!isset($porKey[$k]) || $porKey[$k]['price'] === '') continue;
      $v = str_replace(',', '.', trim((string) $v));
      if ($v === '' || !is_numeric($v) || (float) $v <= 0) continue;
      $v = number_format((float) $v, 2, '.', '');
      if ($v !== $porKey[$k]['price']) $nuevos[$k] = $v;     // sólo se guarda lo que difiere
    }
    $estado['prices'] = $nuevos;
    if (guardar_estado($estado)) {
      $aviso = count($nuevos) === 0
        ? 'Publicado: todos los precios vuelven a ser los de la carta.'
        : 'Publicado: ' . count($nuevos) . ' precio(s) distintos de la carta.';
    } else {
      $error = 'No se ha podido escribir estado.json.';
    }
  }

  /* --- el juego ---
     Antes esta pantalla configuraba el premio: objetivo, texto, minutos y si se pedía reseña al
     acabarse. Ya no hay premio, así que queda un interruptor. */
  if (isset($_POST['guardar_juego'])) {
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
$estado   = leer_estado();
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
$catsVisibles = [];
foreach ($lista as $p) { $catsVisibles[$p['cat']] = ($catsVisibles[$p['cat']] ?? 0) + 1; }
$listaKeys = array_flip(array_column($lista, 'key'));
$agotados = array_intersect_key($agotados, $listaKeys);
/* «Corriendo ahora mismo» sólo si la oferta rebaja algo que se vea. */
$oferta_corriendo = $oferta_corriendo && (
  array_intersect((array) $oferta['cats'], array_keys($catsVisibles))
  || array_intersect((array) $oferta['keys'], array_keys($listaKeys))
);
$juego    = is_array($estado['game']) ? array_replace(estado_vacio()['game'], $estado['game']) : estado_vacio()['game'];
$record   = record_leer();
/* El enlace de resenas lo pinta Marca. No era del premio y no se va con el. */
$resena   = is_array($estado['review'] ?? null) ? array_replace(estado_vacio()['review'], $estado['review']) : estado_vacio()['review'];
$csrf     = (string) ($_SESSION['csrf'] ?? '');
$temas    = temas();
$opinion  = is_array($estado['reviews'] ?? null)
  ? array_replace(estado_vacio()['reviews'], $estado['reviews'])
  : estado_vacio()['reviews'];
$fotos    = is_array($estado['hero'] ?? null) ? array_values($estado['hero']) : [];
$redes    = is_array($estado['social'] ?? null)
  ? array_replace(estado_vacio()['social'], $estado['social'])
  : estado_vacio()['social'];
$tema_actual = (string) ($estado['theme'] ?? tema_por_defecto());
if (!in_array($tema_actual, array_column($temas, 'slug'), true)) $tema_actual = tema_por_defecto();

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
  $dt = ["escribible" => is_dir(DATOS_DIR) ? is_writable(DATOS_DIR)
                                           : is_writable(dirname(DATOS_DIR))];
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
             'ofertas' => 'Ofertas', 'precios' => 'Precios', 'juego' => 'Juego',
             'datos' => 'Analítica', 'marca' => 'Marca'];
if (!DATOS_ACTIVO)   unset($PESTANAS['datos']);     // el par de gen.mjs: ver config.php
if (!isset($PESTANAS[$pestana])) $pestana = 'agotados';
$CUENTAS = [
  'agotados'   => count($agotados),
  'destacados' => count($tags),
  'ofertas'    => $oferta['on'] ? 1 : 0,
  'precios'    => count($precios),
  'juego'      => $juego['on'] ? 1 : 0,
  'datos'      => 0,      // el contador no es una cuenta de cosas pendientes
  'marca'      => 0,      // no es una cuenta de nada: no lleva contador
];
?>
<!doctype html>
<html lang="es" translate="no" class="notranslate"<?= $tema_actual === tema_por_defecto() ? '' : ' data-tema="' . h($tema_actual) . '"' ?>>
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>La carta de hoy — <?= h(CLIENTE_NOMBRE) ?></title>
<?php /* Las mismas dos tipografías que la carta, escritas por el build. */ ?>
<?php @include __DIR__ . '/fuentes.html'; ?>
<link rel="stylesheet" href="tokens.css">
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
    color:var(--accent-ink);
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
  /* La chapa de version. Al pie, apagada y en tipografia de numeros: no es para leerla cada
     dia, es para mirarla cuando algo no cuadra despues de subir. */
  .chapa{
    margin:var(--s4) auto var(--s3);
    text-align:center;
    color:var(--muted);
    font-size:13px;
    line-height:1.6;
  }
  .chapa strong{color:var(--ink);font-variant-numeric:tabular-nums}
  .chapa-id{font-size:11px;opacity:.65;font-variant-numeric:tabular-nums}
  .chapa-mal{color:var(--mal,#b3261e);font-weight:600}
  .head .sub a{color:var(--accent-ink)}

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
  .tabs-arrow:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
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
  .tabs button:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
  .tabs button.on{background:var(--accent);color:var(--surface)}
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
    color:var(--accent-ink);
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
    color:var(--accent-ink);
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
  .search:focus{outline:2px solid var(--accent-ink);outline-offset:1px;border-color:transparent}
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
  .tick:has(input:focus-visible){outline:2px solid var(--accent-ink);outline-offset:-2px;border-radius:var(--r-sheet)}
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
    color:var(--accent-ink);
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
    box-shadow:inset 0 0 0 2px var(--accent-ink);
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
  .combo-q:focus{outline:none;box-shadow:inset 0 0 0 2px var(--accent-ink)}
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
  .switch:has(input:checked){background:color-mix(in srgb,var(--accent) 12%,transparent)}
  .switch:has(input:checked) .switch-pista{background:var(--accent)}
  .switch:has(input:checked) .switch-bola{transform:translateX(24px)}
  .switch:has(input:checked) .switch-txt{color:var(--accent-ink)}
  .switch:has(input:checked) .switch-on{display:inline}
  .switch:has(input:checked) .switch-off{display:none}
  .switch:has(input:focus-visible){outline:2px solid var(--accent-ink);outline-offset:2px}
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
  .marca:has(input:checked){background:var(--accent);color:var(--surface)}
  .marca:has(input:checked) .tickmark{background:color-mix(in srgb,var(--surface) 28%,transparent);color:var(--surface)}
  .marca:has(input:focus-visible){outline:2px solid var(--accent-ink);outline-offset:2px}

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
  .cats input{width:22px;height:22px;flex:0 0 auto;accent-color:var(--accent-ink);cursor:pointer}
  .cats span{font-family:var(--title-font);font-size:15px;font-weight:600;line-height:1.25}
  .cats em{
    display:block;margin-top:1px;
    color:var(--muted);font-style:normal;font-family:var(--body-font);font-size:13px;font-weight:400;
  }
  .cats label:has(input:checked) span{color:var(--accent-ink)}

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
    .pct:hover{background:var(--accent);color:var(--surface)}
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
  .pnuevo:focus{outline:2px solid var(--accent-ink);outline-offset:1px;border-color:transparent}
  .pfijo{font-family:var(--title-font);font-weight:700;font-variant-numeric:tabular-nums}
  .badge{
    display:inline-block;padding:2px 9px;border-radius:var(--r-pill);
    background:var(--accent);color:var(--surface);
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
  button:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
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
  .dt-vivo{width:7px;height:7px;border-radius:50%;background:var(--accent-ink);flex:0 0 auto}
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
    background:color-mix(in srgb,var(--accent-ink) 26%,transparent)}
  /* El gesto que se trae del componente: la tocada entera, las de al lado a media luz y las
     demas apagadas. Sin esto, treinta barras del mismo color son una textura, no un dato. */
  .dt-barras.tocando .dt-b i{background:color-mix(in srgb,var(--accent-ink) 11%,transparent)}
  .dt-barras.tocando .dt-b.vecina i{background:color-mix(in srgb,var(--accent-ink) 34%,transparent)}
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

  a{color:var(--accent-ink)}

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
  .login input:focus{outline:2px solid var(--accent-ink);outline-offset:1px;border-color:transparent}
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
  .orow .tick input{accent-color:var(--accent-ink)}
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

  /* ---------- muestras de marca ----------
     Cada muestra es una carta de verdad en miniatura —fondo, tarjeta, un antetítulo en el
     acento, dos platos con su precio, un filete y una etiqueta de oferta— porque un cuadrado
     de color no dice nada de cómo va a quedar. Los colores no salen de aquí: llegan en el
     atributo style de cada tarjeta, ya derivados y ya medidos por el build. */
  .temas{
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(240px,1fr));
    gap:var(--s3);
    margin:0;
  }
  .tema{display:block;cursor:pointer}
  .tema input{position:absolute;opacity:0;width:0;height:0}
  .tema-muestra{
    display:block;
    padding:var(--s2);
    border-radius:var(--r-sheet);
    border:2px solid var(--border);
    background:var(--t-ink);
    transition:transform var(--t-press) var(--ease-out),border-color var(--t-fast) ease;
  }
  .tema:active .tema-muestra{transform:scale(.98)}
  /* El fondo de la muestra ES el fondo oscuro del tema, así que un borde oscuro dentro no
     se ve. La marca de elegido va por fuera, sobre la crema del panel, donde sí se lee. */
  .tema input:checked + .tema-muestra{outline:3px solid var(--accent-ink);outline-offset:3px}
  .tema input:focus-visible + .tema-muestra{outline:3px solid var(--ink);outline-offset:3px}
  .tema-carta{
    display:block;
    padding:var(--s2) var(--s2) 10px;
    border-radius:12px;
    background:var(--t-surface);
    font-family:var(--body-font);
  }
  .tema-eyebrow{
    display:block;margin-bottom:6px;
    color:var(--t-accent);
    font-family:var(--title-font);
    font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;
  }
  .tema-fila{
    display:flex;align-items:baseline;justify-content:space-between;gap:8px;
    padding:5px 0;
    border-bottom:1px solid var(--t-hairline);
    color:var(--t-ink);
    font-size:12px;
  }
  .tema-fila:last-of-type{border-bottom:0}
  .tema-fila em{color:var(--t-muted);font-style:normal;font-size:10px}
  .tema-precio{font-family:var(--title-font);font-weight:600;font-variant-numeric:tabular-nums}
  .tema-pill{
    display:inline-block;margin-top:8px;
    padding:2px 8px;border-radius:999px;
    background:var(--offer);color:var(--t-surface);
    font-family:var(--title-font);font-size:9px;font-weight:700;letter-spacing:.06em;
  }
  .tema-pie{
    display:flex;align-items:center;gap:6px;
    margin-top:10px;padding:0 4px;
    color:var(--t-surface);
    font-family:var(--title-font);font-size:10px;letter-spacing:.06em;
  }
  .tema-punto{width:8px;height:8px;border-radius:50%;background:var(--t-base)}
  .tema-nombre{
    display:flex;align-items:center;gap:6px;
    margin-top:10px;
    font-family:var(--title-font);font-size:16px;font-weight:700;
  }
  .tema-check{
    display:none;
    color:var(--accent-ink);
    font-family:var(--body-font);font-size:12px;font-weight:400;
  }
  .tema input:checked ~ .tema-nombre .tema-check{display:inline}
  .tema-nota{display:block;margin-top:2px;color:var(--muted);font-size:13px;line-height:1.35}
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
  .insignia.is-user{background:var(--accent);color:var(--surface)}
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
<body>
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
        <?php if (SUPERADMIN_HASH !== ''): ?>
          <p class="sub" style="margin-bottom:8px">Primero, la contraseña de superadministrador:
            sin ella nadie puede reclamar este panel.</p>
          <input type="password" name="super" placeholder="Contraseña de superadministrador" autocomplete="off" required autofocus>
        <?php endif; ?>
        <input type="password" name="nueva" placeholder="Contraseña nueva (mín. 8)" autocomplete="new-password" required<?= SUPERADMIN_HASH === '' ? ' autofocus' : '' ?>>
        <button type="submit">Guardar contraseña</button>
      </form>
    <?php endif; ?>
  </div></div>

<?php elseif (!$dentro): ?>
  <?php
    /* La imagen de la puerta va POR TEMA: acceso-laurel.jpg, acceso-mar.jpg… Cada juego de
       color tiene la suya, así que la puerta cambia cuando el restaurante cambia el tema y no
       queda una foto verde delante de una tarjeta ciruela. No sale de estado.json ni la escribe
       el panel: son archivos fijos en admin/ que se sustituyen a mano por FTP.

       Tres escalones: la del tema en uso, la del tema de la casa, y acceso.jpg como último
       recurso. Si no hay ninguna, la tarjeta se queda sin foto en vez de enseñar un hueco gris.

       Al src se le cuelga la fecha del archivo: al reemplazarlo, la dirección cambia sola y
       nadie se queda viendo el anterior por la caché. */
    $foto_login = '';
    foreach (['acceso-' . $tema_actual . '.jpg', 'acceso-' . tema_por_defecto() . '.jpg', 'acceso.jpg'] as $cual) {
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
          <input type="password" name="clave" placeholder="Contraseña" autocomplete="current-password" required autofocus>
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
        <strong><?= h(mb_strtolower(dia_semana($hoy), "UTF-8")) ?>
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
        <?= h(mb_strtolower(dia_semana($hoy), "UTF-8")) ?><?php endif; ?>.
      </p>

      <?php $tabActual = null; foreach ($lista as $p):
        if ($p['tab'] !== $tabActual):
          if ($tabActual !== null) echo '</div>';
          $tabActual = $p['tab'];
          echo '<h2 class="sec">' . h($tabActual) . '</h2><div class="card sec-body">';
        endif;
        $on = isset($agotados[$p['key']]); ?>
        <div class="row<?= $on ? ' is-out' : '' ?>" data-name="<?= h(mb_strtolower($p['name'] . ' ' . $p['name_en'] . ' ' . $p['id'] . ' ' . $p['sub'])) ?>">
          <label class="tick">
            <input type="checkbox" name="agotado[]" value="<?= h($p['key']) ?>"<?= $on ? ' checked' : '' ?>>
            <span class="sr">Agotado hoy: <?= h($p['name']) ?></span>
          </label>
          <span class="num"><?= h($p['id']) ?></span>
          <span class="nm"><?= h($p['name']) ?><br><small><?= h($p['sub']) ?><?= $p['name_en'] !== $p['name'] ? ' · ' . h($p['name_en']) : '' ?></small></span>
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

      form.addEventListener('change', function (e) {
        var row = e.target.closest('.row');
        if (row && e.target.name === 'agotado[]') row.classList.toggle('is-out', e.target.checked);
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
      <?= h(mb_strtolower(dia_semana($ahora_canarias->format('Y-m-d')))) ?>.
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
              <input type="checkbox" name="cat[]" value="<?= h($c) ?>"<?= in_array($c, (array) $oferta['cats'], true) ? ' checked' : '' ?>>
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
        $porCat = in_array($p['cat'], (array) $oferta['cats'], true);
        $suelto = in_array($p['key'], (array) $oferta['keys'], true);
        $sinPrecio = $p['price'] === ''; ?>
        <div class="row orow<?= $porCat ? ' por-categoria' : '' ?><?= $suelto ? ' is-oferta' : '' ?><?= $sinPrecio ? ' sin-precio' : '' ?>"
             data-cat="<?= h($p['cat']) ?>"
             data-name="<?= h(mb_strtolower($p['name'] . ' ' . $p['name_en'] . ' ' . $p['id'] . ' ' . $p['sub'])) ?>">
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
          <span class="pfijo"><?= $sinPrecio ? '' : '€' . h($p['price']) ?></span>
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
            <span class="pviejo">€<?= h($f['actual']) ?></span>
            <input class="pnuevo" type="text" inputmode="decimal"
                   name="precio[<?= h($f['key']) ?>]" value="<?= h($f['nuevo']) ?>"
                   aria-label="Precio nuevo de <?= h($f['name']) ?>">
          </div>
        <?php endforeach; if ($tabActual !== null) echo '</div>'; ?>

        <div class="bar">
          <a href="?t=precios" class="count">Cancelar</a>
          <button class="save" name="precios_publicar" value="1" type="submit">Publicar precios</button>
        </div>
      </form>

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
              <span class="pviejo">€<?= h($p['price']) ?></span>
              <span class="pfijo">€<?= h((string) $v) ?></span>
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
      Las fotos de portada, el juego de colores de la carta y las copias de seguridad. Los
      colores <strong>se eligen una vez</strong>, el día que se monta el restaurante; a las
      fotos y a las copias se vuelve cuando haga falta.
    </p>

    <?php if (!$temas): ?>
      <div class="msg bad">
        No encuentro <code>temas.json</code>. Súbelo junto a este archivo: lo genera el build
        con la carta. Mientras tanto la carta se ve con los colores de la casa.
      </div>
    <?php else: ?>

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

        <div class="temas">
          <?php foreach ($temas as $t):
            $tk = is_array($t['tokens'] ?? null) ? $t['tokens'] : []; ?>
            <label class="tema" style="
              --t-ink:<?= h($tk['--ink'] ?? '#000') ?>;
              --t-surface:<?= h($tk['--surface'] ?? '#fff') ?>;
              --t-accent:<?= h($tk['--accent'] ?? '#000') ?>;
              --t-muted:<?= h($tk['--muted'] ?? '#666') ?>;
              --t-base:<?= h($tk['--base'] ?? '#999') ?>;
              --t-hairline:<?= h($tk['--hairline'] ?? '#ddd') ?>;">
              <input type="radio" name="tema" value="<?= h($t['slug']) ?>"
                     <?= $tema_actual === $t['slug'] ? ' checked' : '' ?>>
              <span class="tema-muestra" aria-hidden="true">
                <span class="tema-carta">
                  <span class="tema-eyebrow">Para empezar</span>
                  <span class="tema-fila"><span>Croquetas de la casa<br><em>seis unidades</em></span><span class="tema-precio">8,50</span></span>
                  <span class="tema-fila"><span>Ensalada de temporada<br><em>con vinagreta</em></span><span class="tema-precio">9,00</span></span>
                  <span class="tema-pill">-20% HOY</span>
                </span>
                <span class="tema-pie"><span class="tema-punto"></span>PIE DE LA CARTA</span>
              </span>
              <span class="tema-nombre">
                <?= h($t['nombre']) ?><span class="tema-check">· elegido</span>
              </span>
              <span class="tema-nota"><?= h($t['nota'] ?? '') ?></span>
            </label>
          <?php endforeach; ?>
        </div>

        <p class="hint" style="margin-top:var(--s3)">
          El rojo de las ofertas y del picante no cambia con el tema: no es un color de marca,
          es un aviso, y significa lo mismo en todos. Los del juego tampoco.
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

        <div class="bar">
          <?php /* Lo que hay guardado, no lo que está marcado: si no coinciden, la propia
                   clase dirty escribe «sin guardar» detrás. */
            $nombre_actual = 'el de la casa';
            foreach ($temas as $t) if ($t['slug'] === $tema_actual) $nombre_actual = $t['nombre']; ?>
          <span class="count">En la carta: <?= h($nombre_actual) ?></span>
          <span class="acciones">
            <a class="ver" href="../index.html?v=<?= time() ?>" target="_blank" rel="noopener">Ver menú</a>
            <button class="save" name="guardar_marca" value="1" type="submit">Guardar</button>
          </span>
        </div>
      </form>
    <?php endif; ?>

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
              $cuando = mb_strtolower(dia_semana($m[1]), 'UTF-8') . ' '
                      . $dia->format('d/m/y') . ' · ' . $m[2] . ':' . $m[3];
            } elseif (preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $sinExt)) {
              $dia    = new DateTimeImmutable($sinExt);
              $cuando = mb_strtolower(dia_semana($sinExt), 'UTF-8') . ' ' . $dia->format('d/m/y');
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

    /* El panel se pinta del tema que se toca, antes de guardarlo. Una muestra de 240px
       convence a medias; ver la aplicación entera cambiar de color convence del todo.
       Para que nadie confunda probar con guardar, el contador de la barra pasa a rojo y
       escribe «sin guardar» hasta que se pulsa el botón. */
    (function () {
      var radios = [].slice.call(document.querySelectorAll('input[name="tema"]'));
      if (!radios.length) return;
      var guardado = document.documentElement.dataset.tema || '<?= h(tema_por_defecto()) ?>';
      var contador = document.querySelector('.pane[data-pane="marca"] .count');

      radios.forEach(function (r) {
        r.addEventListener('change', function () {
          if (r.value === '<?= h(tema_por_defecto()) ?>') delete document.documentElement.dataset.tema;
          else document.documentElement.dataset.tema = r.value;
          if (contador) contador.classList.toggle('dirty', r.value !== guardado);
        });
      });
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
