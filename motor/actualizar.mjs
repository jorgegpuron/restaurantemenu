/* Actualizar el motor desde una carpeta local con una version nueva.
 *
 *   node motor/actualizar.mjs --desde <carpeta-con-motor-y-lock>
 *
 * La carpeta de origen trae motor/ y motor.lock (el suyo). NO descarga nada de internet: de
 * donde salga esa carpeta es una decision de otra fase.
 *
 * TRANSACCIONAL. El nucleo vive en transaccion-motor.mjs y este script solo lo dirige:
 * preparar (validaciones + staging, motor activo intacto), pre-vuelo de esquema, aplicar,
 * verificar, commit. Si cualquier paso falla antes del commit, rollback() deja todo byte a
 * byte como estaba. El recinto de escritura y la prueba de fallo a mitad (MOTOR_FALLO_PRUEBA,
 * 'tras-m1'..'tras-m5' mas los alias 'tras-swap' y 'tras-envoltorios') estan documentados
 * alli.
 *
 * PRE-VUELO DE ESQUEMA, incondicional y solo lectura: un motor cuyo esquemaCarta o
 * esquemaEstado no sea el de los datos del cliente NO se instala desde aqui, porque dejaria
 * una pareja motor/datos que no compila. Ese salto lo hace motor/migrar.mjs, que convierte
 * los datos en la misma operacion. No hay ninguna bandera para saltarse esta comprobacion.
 *
 * Reglas previas, y todas abortan sin escribir nada:
 *   1. git limpio: no se actualiza con trabajo a medias.
 *   2. el motor ACTUAL cuadra con su lock: una personalizacion local se para aqui, con su
 *      lista, en vez de perderse bajo la version nueva.
 *   3. el ORIGEN cuadra con su propio lock: no se instala un motor manipulado.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RAIZ_CLIENTE, cliente } from './entorno.mjs';
import { crearTransaccionMotor } from './transaccion-motor.mjs';

const NL = String.fromCharCode(10);
const args = process.argv.slice(2);
const dIdx = args.indexOf('--desde');
if (dIdx === -1 || !args[dIdx + 1]) {
  console.error('Uso: node motor/actualizar.mjs --desde <carpeta con motor/ y motor.lock>');
  process.exit(1);
}
const rutaDesde = args[dIdx + 1];
const ORIGEN = pathToFileURL(rutaDesde.replace(/[\\/]+$/, '') + '/');

/* ---- preparar: todas las validaciones + staging, sin tocar el motor activo ---- */
const tx = crearTransaccionMotor({ origen: ORIGEN });
try {
  tx.preparar();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const { lockActual, lockOrigen } = tx;

/* ---- pre-vuelo de esquema: la pareja motor/datos tiene que coincidir ANTES ---- */
const esquemaCliente = JSON.parse(readFileSync(cliente('carta.json'), 'utf8')).esquema;
if (esquemaCliente !== lockOrigen.esquemaCarta || lockActual.esquemaEstado !== lockOrigen.esquemaEstado) {
  tx.rollback();
  console.error('ESQUEMAS INCOMPATIBLES: este motor no se instala sobre estos datos.');
  if (esquemaCliente !== lockOrigen.esquemaCarta) {
    console.error('  esquema de la carta del cliente: ' + esquemaCliente
      + '  |  esquemaCarta del motor del origen: ' + lockOrigen.esquemaCarta);
  }
  if (lockActual.esquemaEstado !== lockOrigen.esquemaEstado) {
    console.error('  esquemaEstado del motor actual: ' + lockActual.esquemaEstado
      + '  |  esquemaEstado del motor del origen: ' + lockOrigen.esquemaEstado);
  }
  console.error('El salto de esquema es una migracion, no una actualizacion, y no hay bandera');
  console.error('para saltarse esta comprobacion. Ejecuta:');
  console.error('  node motor/migrar.mjs --desde ' + rutaDesde);
  process.exit(1);
}

/* ---- el cambio, con vuelta atras entera si algo falla ---- */
console.log('actualizando motor', lockActual.version, '->', lockOrigen.version);
try {
  tx.aplicar();
  tx.verificar();
} catch (e) {
  tx.rollback();
  console.error('LA ACTUALIZACION FALLO Y SE HA DESHECHO ENTERA: ' + e.message);
  console.error('Comprueba: git status debe salir limpio.');
  process.exit(1);
}
const { limpiezaPendiente } = tx.commit();
if (limpiezaPendiente.length) {
  console.log('AVISO: el motor anterior quedo sin borrar; retiralo a mano: ' + limpiezaPendiente.join(', '));
}

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
