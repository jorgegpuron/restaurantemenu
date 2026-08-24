<?php
/**
 * Apunta una apertura de la carta. Es el único archivo de admin/ al que llama la carta de los
 * clientes, así que hace UNA sola cosa: añadir un byte al final del fichero del día.
 *
 * Un byte y no un JSON, a propósito. Con veinte mesas abriendo la carta a la vez, leer un JSON,
 * sumarle uno y reescribirlo entero es corrupción garantizada: dos visitas leen el mismo número
 * y una se pierde, o peor, se quedan a medias de la escritura y el fichero deja de ser JSON. Es
 * el mismo pie del que ya tropezó el panel con dos pestañas pisándose el .tmp. Un append con
 * LOCK_EX de un byte es atómico también en hosting compartido, y entonces el número de aperturas
 * es literalmente el tamaño del archivo. No hay nada que corromper.
 *
 * No guarda IP, ni cookie, ni identificador de ninguna clase: este archivo es incapaz de
 * distinguir dos visitas. Sólo sabe contar.
 */
require __DIR__ . '/config.php';

// 404 y no 403: apagado significa que esto no existe, no que exista y no te deje.
if (!DATOS_ACTIVO) {
  http_response_code(404);
  exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  exit;
}

/* Robots y precargas. Es la segunda red: la primera son los cuatro segundos a la vista que exige
   el medidor de la carta antes de llamar aquí. */
$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if ($ua === '' || preg_match(
      '~bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|pingdom|uptime'
    . '|curl|wget|python|okhttp|go-http|java/|libwww|facebookexternalhit|whatsapp|telegram~i',
      $ua)) {
  http_response_code(204);
  exit;
}

/* El día natural de Canarias, de 00:00 a 00:00.

   NO es la fecha de servicio de los agotados, que corre el corte a las 6:00 para que una cena
   larga siga siendo la de anoche. Eso vale para la cocina y no para contar gente: quien abre la
   carta a las 02:00 es de hoy, y el día del contador empieza y acaba donde lo dice el reloj.

   VA DUPLICADA de fecha_contador() de index.php, no importada: este archivo corre en cada visita
   y no va a cargar el panel entero por dos líneas. */
$fecha = (new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('Y-m-d');

$dir = DATOS_DIR;
if (!is_dir($dir)) {
  @mkdir($dir, 0775, true);
}
if (!is_dir($dir) || !is_writable($dir)) {
  http_response_code(204);   // no se puede contar; no es asunto del cliente que está comiendo
  exit;
}
/* Redundante y va igual: el .htaccess de admin/ ya deniega .txt en todo lo que cuelga de él,
   pero una carpeta de datos que depende de una regla escrita dos niveles más arriba es una
   carpeta que queda abierta el día que alguien reordene ese archivo. */
if (!is_file($dir . '/.htaccess')) {
  @file_put_contents($dir . '/.htaccess', 'Require all denied' . PHP_EOL);
}

$archivo = $dir . '/d-' . $fecha . '.txt';
if (!is_file($archivo) || filesize($archivo) < DATOS_MAX_DIA) {
  @file_put_contents($archivo, '.', FILE_APPEND | LOCK_EX);
}

http_response_code(204);
