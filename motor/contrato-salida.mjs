/* Que tiene que haber en 2-subir para que una compilacion este COMPLETA.
 *
 * Existe porque un build salio truncado —18 ficheros en vez de 73, sin faltar ninguno de los
 * cuatro que el workflow mira— y termino con exit 0. Faltaban las 37 banderas y 18 de los 24
 * ficheros del panel: una carta que se habria publicado sin banderas y con el panel a medias.
 *
 * LA REGLA DE ORO DE ESTE FICHERO: la lista de lo obligatorio NO se saca leyendo las carpetas
 * de origen. Precisamente lo que fallo aquella vez fue el listado de dos carpetas del motor, y
 * una comprobacion que volviera a listarlas heredaria el mismo fallo -- diria "no falta nada"
 * porque tampoco esperaba nada. Se saca de motor.lock, que es un JSON versionado con los 74
 * ficheros del motor y sus hashes, y de cliente.mjs. Ninguno de los dos depende de que el
 * sistema de ficheros conteste bien en ese instante.
 *
 * Y TAMPOCO es una cuenta de ficheros: "73" vale hoy para Guaza y no vale para Tinge (74), ni
 * para un cliente sin juego, ni para el motor de dentro de tres versiones. Lo que se comprueba
 * es que cada fichero que el build DEBE producir esta en su sitio, con su nombre, y no vacio.
 *
 * Lo unico que se excluye a proposito es lo que escribe el panel en el servidor: eso no forma
 * parte de un build limpio y exigirlo seria pedir que el build invente datos de produccion.
 */

/* Los nombres que el build deja en tierra a proposito al copiar carpetas (misma lista que
   NO_SUBIR en gen.mjs; aqui se necesita para no exigir lo que nunca se copia). */
const EN_TIERRA = new Set([
  'SPEC.md', 'clave.php', 'superclave.php', 'intentos.json', 'accesos.log',
  'permitir-hash.txt', 'marcador.json', 'canjes.json', '.gitkeep',
]);

/* Lo que gen.mjs escribe en generado/admin/ y acaba en admin/. No sale del lock porque no es
   codigo del motor: es salida del build, distinta en cada cliente pero SIEMPRE presente. */
const DERIVADOS_ADMIN = [
  'cliente.php', 'fuentes.html', 'paises.php', 'platos.json', 'tokens.css',
];

/* La raiz de la carta. juego.html va SIEMPRE: cuando el cliente no tiene juego, el build
   escribe una lapida que sustituye a cualquier copia vieja que hubiera desplegada. */
const RAIZ = [
  'index.html', 'juego.html', '404.php', 'version.json',
  '.htaccess', 'LEEME-SERVIDOR.txt', 'estado-EJEMPLO.json',
];

/* Lo que el panel escribe en produccion y el build NO produce. Se listan para dejar dicho por
   que no se exigen: no es un olvido. */
export const NO_SON_DEL_BUILD = [
  'estado.json', 'record.json', 'admin/clave.php', 'admin/superclave.php',
  'admin/activacion.consumida', 'admin/intentos.json', 'admin/accesos.log',
  'admin/canjes.json', 'admin/marcador.json', 'admin/permitir-hash.txt',
  'admin/copias/', 'admin/datos/', 'assets/hero/', 'assets/platos/', 'assets/publicidad/',
  'admin/activacion.php',
];

/* El contrato, como lista de rutas relativas a 2-subir. `lock` es motor.lock ya leido y
   `cliente` es el objeto CLIENTE de cliente.mjs. */
export function contratoSalida(lock, cliente) {
  const esperados = new Map();          // ruta -> por que se espera
  const pon = (ruta, razon) => esperados.set(ruta, razon);

  for (const f of RAIZ) pon(f, 'salida del build');
  pon('admin/.htaccess', 'el cliente lo aporta en server/admin/');
  for (const f of DERIVADOS_ADMIN) pon('admin/' + f, 'derivado del build');

  const delMotor = Object.keys(lock.ficheros || {});
  if (!delMotor.length) {
    throw new Error('motor.lock no lista ningun fichero: sin el no se puede verificar el build.');
  }

  /* El panel: primer nivel de server/admin/, que es lo que copia el build. Las subcarpetas
     (copias/) las crea el panel en el servidor y no viajan. */
  for (const rel of delMotor) {
    if (!rel.startsWith('server/admin/')) continue;
    const resto = rel.slice('server/admin/'.length);
    if (resto.includes('/')) continue;
    if (EN_TIERRA.has(resto)) continue;
    pon('admin/' + resto, 'codigo del panel, en motor.lock');
  }

  /* Las banderas: el catalogo COMPLETO del motor, no solo las de los idiomas de este cliente.
     El build las copia todas y el selector de un idioma que se anada manana ya las encuentra. */
  for (const rel of delMotor) {
    if (!rel.startsWith('assets/banderas/')) continue;
    pon(rel, 'catalogo de banderas del motor, en motor.lock');
  }

  /* El arte del juego solo viaja si el cliente tiene la capacidad. */
  if (cliente.funciones && cliente.funciones.juego) {
    for (const rel of delMotor) {
      if (rel.startsWith('assets/') && !rel.startsWith('assets/banderas/')) {
        pon(rel, 'arte del juego (funciones.juego)');
      }
    }
  }

  /* Invariante aparte, por si el catalogo de banderas cambiara de forma: cada idioma
     configurado tiene que poder ensenar la suya. Es la comprobacion que de verdad importa
     para el selector, y se deriva de cliente.mjs, no del lock. */
  const idiomas = [cliente.idiomas.base, ...cliente.idiomas.extras];
  for (const l of idiomas) {
    pon('assets/banderas/' + l.bandera + '.webp', 'bandera del idioma ' + l.code);
  }

  return esperados;
}

/* Carpetas que tienen que existir y no estar vacias. */
export const CARPETAS_OBLIGATORIAS = ['admin', 'assets/banderas'];
