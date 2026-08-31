<?php
/**
 * Apunta que alguien ha abierto la ficha de un plato. Junto con datos.php y record.php, uno de
 * los tres archivos de admin/ a los que llama la carta pública, así que hace UNA sola cosa:
 * añadir una línea al final del registro del mes.
 *
 * UNA LÍNEA Y NO UN JSON, por lo mismo que datos.php cuenta con el tamaño del archivo: con
 * treinta comensales mirando platos a la vez, leer un JSON, sumarle uno y reescribirlo entero
 * pierde incrementos o deja el archivo a medias. Un append corto con LOCK_EX es atómico también
 * en hosting compartido. La suma se hace después, una vez al día, cuando el panel se abre.
 *
 * No guarda IP, ni cookie, ni identificador de ninguna clase. La línea dice «el plato a1b2c3d4
 * se miró el día tal» y nada más: este archivo es incapaz de distinguir dos comensales.
 */
require __DIR__ . '/config.php';

if (!DATOS_ACTIVO) {
  http_response_code(404);
  exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  exit;
}

/* El mismo filtro de robots que datos.php y record.php. */
$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if ($ua === '' || preg_match(
      '~bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|pingdom|uptime'
    . '|curl|wget|python|okhttp|go-http|java/|libwww|facebookexternalhit|whatsapp|telegram~i',
      $ua)) {
  http_response_code(204);
  exit;
}

/* El identificador son ocho caracteres hexadecimales y nada más. Lo que no lo sea no llega al
   registro: un archivo que crece con lo que mande cualquiera es un archivo que un día llena el
   disco del restaurante. */
$id = strtolower(trim((string) @file_get_contents('php://input')));
if (!preg_match('/^[0-9a-f]{8}$/', $id)) {
  http_response_code(204);
  exit;
}

/* Y además tiene que ser un plato de ESTA carta. platos.json lo escribe el build, así que la
   comprobación se rehace sola en cada publicación: un plato que se va de la carta deja de
   contar al día siguiente. */
$raw = @file_get_contents(__DIR__ . '/platos.json');
$lista = $raw === false ? null : json_decode($raw, true);
if (!is_array($lista)) {
  http_response_code(204);        // sin catálogo no se apunta nada: no es asunto del comensal
  exit;
}
$vale = false;
foreach ($lista as $p) {
  if (!is_array($p) || !isset($p['key'])) continue;
  /* El hash de la clave vieja se acepta durante la compatibilidad: una carta cacheada de
     antes de la migracion sigue contando sus consultas. Se retira con data-legacy. */
  if (substr(sha1((string) $p['key']), 0, 8) === $id
      || (isset($p['legacy']) && substr(sha1((string) $p['legacy']), 0, 8) === $id)) { $vale = true; break; }
}
if (!$vale) {
  http_response_code(204);
  exit;
}

/* El día natural de Canarias, el mismo que cuenta las aperturas: si las dos cifras salen en la
   misma pantalla —«el 34% de quienes abren la carta miran el solomillo»— tienen que estar
   contadas con el mismo reloj o el porcentaje es mentira.

   VA DUPLICADO de datos.php a propósito, igual que allí: este archivo corre en cada consulta y
   no va a cargar el panel entero por dos líneas. */
$fecha = (new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('Y-m-d');

$dir = DATOS_DIR;
if (!is_dir($dir)) {
  @mkdir($dir, 0775, true);
}
if (!is_dir($dir) || !is_writable($dir)) {
  http_response_code(204);
  exit;
}
/* El mismo guardián que escribe datos.php, por si esta es la primera escritura de la carpeta. */
if (!is_file($dir . '/.htaccess')) {
  @file_put_contents($dir . '/.htaccess', "Require all denied\n");
}

$log = $dir . '/v-' . substr($fecha, 0, 7) . '.log';

/* Tope de tamaño, como DATOS_MAX_DIA lo es de aperturas: un registro que crece sin freno acaba
   llenando la cuota del hosting, y entonces se cae la carta entera y no sólo el contador. Con
   una línea de 20 bytes, dos megas son cien mil consultas en un mes. */
if (@filesize($log) > VISTAS_MAX_BYTES) {
  http_response_code(204);
  exit;
}

/* Con FILE_APPEND y LOCK_EX, como escribe datos.php: veinte bytes al final de un archivo no se
   entrelazan con los de la visita de la mesa de al lado. */
@file_put_contents($log, $id . ';' . $fecha . "\n", FILE_APPEND | LOCK_EX);

http_response_code(204);
