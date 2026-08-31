/* Actualizar el motor desde una carpeta local con una version nueva.
 *
 *   node motor/actualizar.mjs --desde <carpeta-con-motor-y-lock>
 *
 * La carpeta de origen trae motor/ y motor.lock (el suyo). NO descarga nada de internet: de
 * donde salga esa carpeta es una decision de otra fase.
 *
 * TRANSACCIONAL. Primero se valida TODO y se prepara la version nueva en una carpeta de
 * trabajo; el motor activo no se toca hasta que la copia esta completa y re-verificada. El
 * cambio de verdad son dos renombres de carpeta; si cualquier paso falla, el motor anterior
 * se conserva o se restaura entero, y los temporales se limpian. La prueba de fallo a mitad
 * esta automatizada con la variable MOTOR_FALLO_PRUEBA (solo existe para eso: lanza un error
 * en el punto pedido, 'tras-swap' o 'tras-envoltorios').
 *
 * LIMITE DE ESCRITURA POR CONSTRUCCION, no por buenas intenciones: toda escritura, borrado o
 * renombre pasa por dentroDelRecinto(), que solo admite
 *
 *     motor/**    motor.lock    gen.mjs    importar.mjs
 *     y las dos carpetas de trabajo .motor.nueva-* / .motor.anterior-* que esta misma
 *     transaccion crea y retira (tienen que vivir junto a motor/ porque un renombre entre
 *     volumenes no es atomico ni esta garantizado)
 *
 * Cualquier otra ruta lanza, aunque el lock del origen viniera envenenado: las rutas de los
 * locks ya las valida entorno.mjs (ni absolutas, ni '..', ni barra invertida, ni enlaces).
 *
 * Reglas previas, y todas abortan sin escribir nada:
 *   1. git limpio: no se actualiza con trabajo a medias.
 *   2. el motor ACTUAL cuadra con su lock: una personalizacion local se para aqui, con su
 *      lista, en vez de perderse bajo la version nueva.
 *   3. el ORIGEN cuadra con su propio lock: no se instala un motor manipulado.
 */
import { execSync } from 'node:child_process';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync, renameSync,
} from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RAIZ_CLIENTE, RAIZ_MOTOR, cliente, sha256, verificarMotor } from './entorno.mjs';

const NL = String.fromCharCode(10);
const args = process.argv.slice(2);
const dIdx = args.indexOf('--desde');
if (dIdx === -1 || !args[dIdx + 1]) {
  console.error('Uso: node motor/actualizar.mjs --desde <carpeta con motor/ y motor.lock>');
  process.exit(1);
}
const ORIGEN = pathToFileURL(args[dIdx + 1].replace(/[\\/]+$/, '') + '/');
const FALLO_PRUEBA = process.env.MOTOR_FALLO_PRUEBA || '';

/* ---- el recinto ---- */
const marca = Math.random().toString(16).slice(2, 8);
const NUEVA = cliente('.motor.nueva-' + marca + '/');
const ANTERIOR = cliente('.motor.anterior-' + marca + '/');
const PERMITIDAS = [
  RAIZ_MOTOR.pathname,
  cliente('motor.lock').pathname,
  cliente('gen.mjs').pathname,
  cliente('importar.mjs').pathname,
  NUEVA.pathname,
  ANTERIOR.pathname,
];
function dentroDelRecinto(url) {
  const ruta = url.pathname;
  if (!PERMITIDAS.some((p) => ruta === p || ruta.startsWith(p))) {
    throw new Error('ESCRITURA FUERA DEL RECINTO: ' + ruta + NL
      + 'El actualizador solo puede tocar motor/, motor.lock, los envoltorios y sus'
      + ' carpetas de trabajo. Esto es un error de programa, no del operador.');
  }
  return url;
}
const escribir = (url, datos) => writeFileSync(dentroDelRecinto(url), datos);
const copiarA = (desde, hasta) => copyFileSync(desde, dentroDelRecinto(hasta));
const borrar = (url) => rmSync(dentroDelRecinto(url), { recursive: true, force: true });
const renombrar = (a, b) => renameSync(dentroDelRecinto(a), dentroDelRecinto(b));
const carpeta = (url) => mkdirSync(dentroDelRecinto(url), { recursive: true });

/* ---- validaciones previas (sin escribir nada) ---- */
const sucio = execSync('git status --porcelain', { cwd: fileURLToPath(RAIZ_CLIENTE) }).toString().trim();
if (sucio) {
  console.error('El arbol de git no esta limpio. Guarda o descarta antes de actualizar el motor:');
  console.error(sucio.split(NL).slice(0, 8).map((l) => '  ' + l).join(NL));
  process.exit(1);
}
const lockActual = verificarMotor();

const lockOrigen = JSON.parse(readFileSync(new URL('motor.lock', ORIGEN), 'utf8'));
if (lockOrigen.formato !== 'motor.lock/1') {
  console.error('El origen trae un motor.lock de formato desconocido: ' + lockOrigen.formato);
  process.exit(1);
}
/* Las rutas del lock del origen pasan por la MISMA validacion que las del propio: se reusa
   el criterio construyendo las URL solo tras comprobar la forma. */
const rutaMala = (rel) => {
  if (typeof rel !== 'string' || rel === '') return 'vacia';
  if (rel.indexOf(String.fromCharCode(92)) !== -1) return 'barra invertida';
  if (/^([a-zA-Z]:|\/)/.test(rel)) return 'absoluta';
  if (rel.split('/').some((t) => t === '..' || t === '.')) return 'sale del directorio';
  return null;
};
const malOrigen = [];
for (const [rel, h] of Object.entries(lockOrigen.ficheros || {})) {
  const p = rutaMala(rel);
  if (p) { malOrigen.push('RUTA INVALIDA (' + p + ') ' + JSON.stringify(rel)); continue; }
  const u = new URL('motor/' + rel, ORIGEN);
  if (!existsSync(u)) malOrigen.push('FALTA ' + rel);
  else if (sha256(u) !== h) malOrigen.push('CAMBIADO ' + rel);
}
for (const [rel, h] of Object.entries(lockOrigen.envoltorios || {})) {
  if (rel !== 'gen.mjs' && rel !== 'importar.mjs') { malOrigen.push('ENVOLTORIO NO AUTORIZADO ' + rel); continue; }
  const u = new URL(rel, ORIGEN);
  if (!existsSync(u)) malOrigen.push('FALTA envoltorio ' + rel);
  else if (sha256(u) !== h) malOrigen.push('CAMBIADO envoltorio ' + rel);
}
if (malOrigen.length) {
  console.error('El ORIGEN no cuadra con su propio lock: no se instala un motor manipulado.');
  malOrigen.slice(0, 8).forEach((m) => console.error('  ' + m));
  process.exit(1);
}

/* ---- preparar la version nueva SIN tocar el motor activo ---- */
console.log('actualizando motor', lockActual.version, '->', lockOrigen.version);
borrar(NUEVA);
carpeta(NUEVA);
for (const rel of Object.keys(lockOrigen.ficheros)) {
  const destino = new URL(rel, NUEVA);
  carpeta(new URL('./', destino));
  copiarA(new URL('motor/' + rel, ORIGEN), destino);
}
/* Re-verificacion de la copia: lo preparado tiene que cuadrar con el lock del origen ANTES
   del cambio. Una copia a medias o corrupta se queda en la carpeta de trabajo y ahi muere. */
for (const [rel, h] of Object.entries(lockOrigen.ficheros)) {
  if (sha256(new URL(rel, NUEVA)) !== h) {
    borrar(NUEVA);
    console.error('La copia preparada no cuadra (' + rel + '): no se ha tocado el motor activo.');
    process.exit(1);
  }
}

/* ---- el cambio: dos renombres, con vuelta atras ---- */
const respaldoLock = readFileSync(cliente('motor.lock'));
const respaldoGen = readFileSync(cliente('gen.mjs'));
const respaldoImportar = readFileSync(cliente('importar.mjs'));
let enSwap = false;
try {
  renombrar(RAIZ_MOTOR, ANTERIOR);
  enSwap = true;
  renombrar(NUEVA, RAIZ_MOTOR);
  if (FALLO_PRUEBA === 'tras-swap') throw new Error('FALLO SIMULADO tras el swap (prueba)');
  copiarA(new URL('gen.mjs', ORIGEN), cliente('gen.mjs'));
  copiarA(new URL('importar.mjs', ORIGEN), cliente('importar.mjs'));
  if (FALLO_PRUEBA === 'tras-envoltorios') throw new Error('FALLO SIMULADO tras los envoltorios (prueba)');
  escribir(cliente('motor.lock'), readFileSync(new URL('motor.lock', ORIGEN)));
} catch (e) {
  /* Vuelta atras completa: el motor anterior vuelve a su sitio y los tres ficheros de la
     raiz recuperan sus bytes. Nada queda a medias. */
  if (enSwap && existsSync(ANTERIOR)) {
    if (existsSync(RAIZ_MOTOR)) borrar(RAIZ_MOTOR);
    renombrar(ANTERIOR, RAIZ_MOTOR);
  }
  escribir(cliente('motor.lock'), respaldoLock);
  escribir(cliente('gen.mjs'), respaldoGen);
  escribir(cliente('importar.mjs'), respaldoImportar);
  borrar(NUEVA);
  console.error('LA ACTUALIZACION FALLO Y SE HA DESHECHO ENTERA: ' + e.message);
  console.error('Comprueba: git status debe salir limpio.');
  process.exit(1);
}
borrar(ANTERIOR);

/* ---- resumen ---- */
const cambiados = [];
for (const rel of Object.keys(lockOrigen.ficheros)) {
  if (lockActual.ficheros[rel] !== lockOrigen.ficheros[rel]) cambiados.push('motor/' + rel);
}
for (const rel of Object.keys(lockOrigen.envoltorios)) {
  if (lockActual.envoltorios[rel] !== lockOrigen.envoltorios[rel]) cambiados.push(rel + ' (envoltorio)');
}
const retirados = Object.keys(lockActual.ficheros).filter((r) => !(r in lockOrigen.ficheros));
console.log(NL + 'ficheros con cambios: ' + (cambiados.length || 'ninguno'));
cambiados.forEach((c) => console.log('  ~ ' + c));
retirados.forEach((r) => console.log('  - motor/' + r + ' (retirado)'));
console.log(NL + 'diff contra git (resumen):');
console.log(execSync('git diff --stat', { cwd: fileURLToPath(RAIZ_CLIENTE) }).toString());
console.log('AHORA: node importar.mjs && node gen.mjs, pasa la bateria entera, y solo');
console.log('entonces decide el commit. Deshacer: git checkout -- motor/ gen.mjs importar.mjs motor.lock');
