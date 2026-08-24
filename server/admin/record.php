<?php
/**
 * Guarda el récord de Chilli Rush. Junto con datos.php, uno de los dos únicos archivos de admin/
 * a los que llama la página pública, así que hace UNA sola cosa y falla callando.
 *
 * El récord vive en record.json, en la raíz y no aquí dentro: el .htaccess de admin/ deniega todo
 * .json, y el juego tiene que poder leerlo. Y va en su propio fichero y no en estado.json a
 * propósito — ahí están los agotados, los precios, el tema y las fotos, o sea el trabajo real del
 * restaurante, y un endpoint público no toca eso ni por accidente.
 *
 * No guarda quién lo hizo: sólo la puntuación y el día. Ni nombre, ni IP, ni cookie.
 */
require __DIR__ . '/config.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  exit;
}

/* El mismo filtro de robots que datos.php. Aquí importa menos —un robot no juega treinta segundos
   y manda una puntuación— pero la puerta se cierra igual. */
$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if ($ua === '' || preg_match(
      '~bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|pingdom|uptime'
    . '|curl|wget|python|okhttp|go-http|java/|libwww|facebookexternalhit|whatsapp|telegram~i',
      $ua)) {
  http_response_code(204);
  exit;
}

/* El tope no es una cuota, es un filtro de disparates. En treinta segundos, con el ritmo que va
   de 620 a 320 ms, caben unas 64 fichas; si todas fueran doradas y no fallara ninguna serían 192.
   Por encima de RECORD_MAX la partida no ha existido.
   Esto impide un récord absurdo y no impide que alguien con la consola abierta mande un 250. Sin
   sesiones ni seguimiento no hay forma, y este proyecto no los quiere: es un marcador de bar. */
$p = (string) ($_POST['puntos'] ?? '');
if (!preg_match('/^[0-9]{1,4}$/', $p)) {
  http_response_code(400);
  exit;
}
$puntos = (int) $p;
if ($puntos < 1 || $puntos > RECORD_MAX) {
  http_response_code(400);
  exit;
}

/* Con el juego apagado no se apunta nada. El enlace desaparece de la carta, pero juego.html sigue
   estando: sin esto, un restaurante que apagó el juego seguiría acumulando récords. */
$est = @file_get_contents(ESTADO_PATH);
$j = $est === false ? null : json_decode($est, true);
if (!is_array($j) || empty($j['game']['on'])) {
  http_response_code(204);
  exit;
}

/* Lo que hay ahora. Un JSON ilegible o ausente vale como cero: es la primera partida de la casa. */
$actual = 0;
$raw = @file_get_contents(RECORD_PATH);
if ($raw !== false) {
  $r = json_decode($raw, true);
  if (is_array($r)) $actual = max(0, (int) ($r['puntos'] ?? 0));
}

/* Sólo se escribe si supera. Sin esto, cada partida del día tocaría el disco para nada — y de paso
   es lo que limita solo la frecuencia de escritura sin tener que contar peticiones de nadie. */
if ($puntos > $actual) {
  $hoy = (new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('Y-m-d');
  $json = json_encode(['puntos' => $puntos, 'fecha' => $hoy], JSON_UNESCAPED_SLASHES);
  /* Temporal y rename, como todo lo que escribe este proyecto: si el proceso se corta a medias
     queda el récord anterior entero y no un JSON truncado que el juego no sabría leer. */
  $tmp = RECORD_PATH . '.' . bin2hex(random_bytes(6)) . '.tmp';
  if (@file_put_contents($tmp, $json, LOCK_EX) !== false && @rename($tmp, RECORD_PATH)) {
    $actual = $puntos;
  } else {
    @unlink($tmp);
  }
}

/* Se devuelve el récord que queda en pie, para que el juego pinte el bueno aunque otra mesa lo
   haya batido mientras esta jugaba. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode(['puntos' => $actual], JSON_UNESCAPED_SLASHES);
