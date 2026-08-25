<?php
/**
 * El marcador de Chilli Rush: los tres mejores. Junto con datos.php, uno de los dos únicos
 * archivos de admin/ a los que llama la página pública, así que hace poco y falla callando.
 *
 * El marcador vive en record.json, en la raíz y no aquí dentro: el .htaccess de admin/ deniega
 * todo .json y el juego tiene que poder leerlo. Y va en su propio fichero y no en estado.json a
 * propósito — ahí están los agotados, los precios y las fotos, o sea el trabajo real del
 * restaurante, y un endpoint público no toca eso ni por accidente.
 *
 * DOS LLAMADAS Y NO UNA. Al acabar la partida el juego manda la puntuación sola, sin nombre: si
 * el jugador cierra la pestaña mientras piensa cómo se llama, la marca ya está guardada. Si ha
 * entrado en el podio, la respuesta trae un `id` y una segunda llamada le pone nombre y país.
 * Con una sola llamada, el que cierra la pestaña pierde el récord.
 *
 * Del jugador se guarda lo que él escribe y nada más: un nombre y un país de una lista cerrada.
 * Ni IP, ni cookie, ni identificador de ninguna clase.
 */
require __DIR__ . '/config.php';
require __DIR__ . '/paises.php';          // lo escribe el build desde banderas.mjs

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

/* Con el juego apagado no se apunta nada. El enlace desaparece de la carta, pero juego.html sigue
   estando: sin esto, un restaurante que apagó el juego seguiría acumulando marcas. */
$est = @file_get_contents(ESTADO_PATH);
$e = $est === false ? null : json_decode($est, true);
if (!is_array($e) || empty($e['game']['on'])) {
  http_response_code(204);
  exit;
}

/* ------------------------------------------------------------------ el marcador que hay */
function marcador_leer(): array {
  $raw = @file_get_contents(MARCADOR_PATH);
  $j = $raw === false ? null : json_decode($raw, true);
  if (!is_array($j)) return [];
  /* Sin marcador privado se mira el público: es lo que pasa al actualizar un restaurante que ya
     tenía marca, y así no la pierde. Los identificadores se rehacen solos al primer guardado. */
  if (!is_array($j)) {
    $raw = @file_get_contents(RECORD_PATH);
    $j = $raw === false ? null : json_decode($raw, true);
  }
  if (!is_array($j)) return [];
  /* Y un record.json de la versión de un solo récord se lee como un podio de uno. */
  if (isset($j['puntos'])) {
    return [['id' => 'viejo', 'puntos' => (int) $j['puntos'], 'nombre' => '',
             'pais' => '', 'fecha' => (string) ($j['fecha'] ?? '')]];
  }
  $top = [];
  foreach ((array) ($j['top'] ?? []) as $x) {
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

/* Dos ficheros y un solo origen. Primero el privado —el que manda— y después el público, que
   es una copia sin los identificadores. Si falla el segundo, el marcador sigue entero y el
   siguiente guardado lo rehace; al revés se publicarían identificadores. */
function marcador_escribir(array $top): bool {
  if (!escribir_json(MARCADOR_PATH, ['top' => array_values($top)])) return false;
  escribir_json(RECORD_PATH, ['top' => array_values(array_map(
    static fn(array $x) => ['puntos' => $x['puntos'], 'nombre' => $x['nombre'],
                            'pais' => $x['pais'], 'fecha' => $x['fecha']], $top))]);
  return true;
}

function escribir_json(string $ruta, array $datos): bool {
  $json = json_encode($datos, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json === false) return false;
  /* Temporal y rename, como todo lo que escribe este proyecto: si el proceso se corta a medias
     queda el marcador anterior entero y no un JSON truncado que el juego no sabría leer. */
  $tmp = $ruta . '.' . bin2hex(random_bytes(6)) . '.tmp';
  if (@file_put_contents($tmp, $json, LOCK_EX) === false) return false;
  if (!@rename($tmp, $ruta)) { @unlink($tmp); return false; }
  return true;
}

/* Lo que se devuelve al juego: sin el id, que es cosa de quien acaba de jugar. */
function responder(array $top, string $id = ''): void {
  $publico = array_map(static fn(array $x) => [
    'puntos' => $x['puntos'], 'nombre' => $x['nombre'], 'pais' => $x['pais'],
  ], $top);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($id === '' ? ['top' => $publico] : ['top' => $publico, 'id' => $id],
                   JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}

/* ------------------------------------------------------------------ el nombre
 * Lo escribe un desconocido y sale en la carta de un restaurante, así que se acota:
 *
 *   - doce caracteres, que es lo que cabe en la tarjeta sin romperla;
 *   - ni saltos de línea ni caracteres de control, que romperían el JSON o el maquetado;
 *   - nada que parezca un enlace, que es como se cuela publicidad en un marcador público;
 *   - y una lista de palabrotas, que NUNCA es completa — por eso el panel tiene un botón para
 *     borrar un nombre de un clic. La lista quita el 90%; el botón es lo que de verdad protege.
 */
const FEO = ['puta', 'puto', 'mierda', 'joder', 'cabron', 'gilipollas', 'coño', 'polla',
             'follar', 'zorra', 'maricon', 'fuck', 'shit', 'cunt', 'bitch', 'nazi', 'hitler',
             'porn', 'sexo', 'xxx'];

function nombre_limpio(string $s): string {
  $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s);
  /* Los ángulos fuera: un nombre no los necesita, y así no hay que confiar en que los tres
     sitios que lo pintan escapen bien. Se escapan igual; esto es el cinturón. */
  $s = str_replace(['<', '>'], '', $s);
  $s = trim(preg_replace('/\s+/u', ' ', (string) $s));
  if ($s === '') return '';
  /* Enlaces y direcciones: no es un sitio para anunciarse. */
  if (preg_match('~https?://|www\.|\.(com|net|org|es)\b|@~iu', $s)) return '';
  /* La lista se mira sobre el texto ENTERO y ANTES de recortar. Recortando primero,
     «gil1poll4s» se quedaba en «gil1po» y colaba: la palabra desaparecía con el recorte. */
  $plano = mb_strtolower($s, 'UTF-8');
  $plano = strtr($plano, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u',
                          '0'=>'o','1'=>'i','3'=>'e','4'=>'a','5'=>'s','7'=>'t','@'=>'a','$'=>'s']);
  $plano = preg_replace('/[^a-zñ]/u', '', $plano);
  foreach (FEO as $mala) {
    if ($plano !== '' && str_contains($plano, $mala)) return '';
  }
  /* Y ahora sí, el recorte: doce es lo que cabe en la tarjeta de la carta sin romperla. */
  return mb_strlen($s, 'UTF-8') > 12 ? mb_substr($s, 0, 12, 'UTF-8') : $s;
}

function pais_limpio(string $s): string {
  $s = strtolower(trim($s));
  return in_array($s, PAISES_CODIGOS, true) ? $s : '';
}

/* ------------------------------------------------------------------ segunda llamada: el nombre */
$id = (string) ($_POST['id'] ?? '');
if ($id !== '') {
  if (!preg_match('/^[0-9a-f]{8}$/', $id)) { http_response_code(400); exit; }
  $top = marcador_leer();
  $nombre = nombre_limpio((string) ($_POST['nombre'] ?? ''));
  $pais = pais_limpio((string) ($_POST['pais'] ?? ''));
  foreach ($top as $i => $x) {
    if ($x['id'] !== $id) continue;
    $top[$i]['nombre'] = $nombre;
    $top[$i]['pais'] = $pais;
    marcador_escribir($top);
    responder($top);
  }
  responder($top);                 // el puesto ya no está: otro lo ha desbancado
}

/* ------------------------------------------------------------------ primera llamada: la marca
 * El tope no es una cuota, es un filtro de disparates. En treinta segundos, con el ritmo que va
 * de 690 a 355 ms, caben unas 58 fichas; si todas fueran doradas y no fallara ninguna serían 174.
 * Por encima de RECORD_MAX la partida no ha existido.
 *
 * Esto impide una marca absurda y no impide que alguien con la consola abierta mande un 250. Sin
 * sesiones ni seguimiento no hay forma, y este proyecto no los quiere: es un marcador de bar.
 */
$p = (string) ($_POST['puntos'] ?? '');
if (!preg_match('/^[0-9]{1,4}$/', $p)) { http_response_code(400); exit; }
$puntos = (int) $p;
if ($puntos < 1 || $puntos > RECORD_MAX) { http_response_code(400); exit; }

$top = marcador_leer();

/* ¿Entra en el podio? Se compara con el tercero. El empate NO desbanca: quien ya está lo hizo
   antes, y bajar a alguien del podio por igualarle es lo que menos gusta en un marcador. */
$ultimo = count($top) >= 3 ? $top[2]['puntos'] : 0;
if (count($top) >= 3 && $puntos <= $ultimo) {
  responder($top);
}

$nuevo = [
  'id'     => bin2hex(random_bytes(4)),
  'puntos' => $puntos,
  'nombre' => nombre_limpio((string) ($_POST['nombre'] ?? '')),
  'pais'   => pais_limpio((string) ($_POST['pais'] ?? '')),
  'fecha'  => (new DateTimeImmutable('now', new DateTimeZone(TZ)))->format('Y-m-d'),
];
$top[] = $nuevo;

/* Se ordena por puntos y, a igualdad, primero el que lleva más tiempo: usort no es estable
   garantizado, así que el desempate se dice a mano en vez de confiarlo al orden del array. */
usort($top, static function (array $a, array $b) {
  if ($a['puntos'] !== $b['puntos']) return $b['puntos'] <=> $a['puntos'];
  return strcmp($a['fecha'], $b['fecha']);
});
$top = array_slice($top, 0, 3);

/* Sólo se escribe si el nuevo se ha quedado dentro. Sin esto, cada partida del día tocaría el
   disco para nada — y de paso es lo que limita solo la frecuencia de escritura. */
$dentro = false;
foreach ($top as $x) { if ($x['id'] === $nuevo['id']) $dentro = true; }
if ($dentro) marcador_escribir($top);

responder($top, $dentro ? $nuevo['id'] : '');
