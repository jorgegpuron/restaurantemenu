/* El nucleo transaccional del cambio de motor. Sin CLI: esto lo usan actualizar.mjs (el caso
 * normal) y migrar.mjs (el salto de esquema, que necesita encajar el cambio de motor dentro
 * de una operacion mas grande sin duplicar ni debilitar ninguna guarda).
 *
 * Maquina de estados, y no hay atajos entre ellos:
 *
 *     NUEVA --preparar()--> PREPARADA --aplicar()--> APLICANDO --(m5 completa)-->
 *     APLICADA_NO_CONFIRMADA --commit()--> CONFIRMADA
 *
 *     rollback() vale en PREPARADA, APLICANDO y APLICADA_NO_CONFIRMADA y lleva a REVERTIDA;
 *     tras CONFIRMADA lanza: el punto de no retorno es commit() y no hay vuelta atras.
 *
 * preparar() lo valida TODO sin tocar el motor activo: git limpio, el motor actual cuadra con
 * su lock, el origen cuadra con el suyo (formato, rutas, hashes), y la version nueva queda
 * preparada y re-verificada en una carpeta de trabajo. Lo que motor.lock es y lo que no es
 * (control de integridad y cambios, NO firma criptografica) esta documentado donde vive esa
 * decision: entorno.mjs.
 *
 * aplicar() son cinco mutaciones registradas una a una (m1..m5); los RESPALDOS en memoria de
 * motor.lock, gen.mjs e importar.mjs existen todos ANTES de la primera, y viven hasta
 * commit(): mientras la transaccion no este confirmada, rollback() puede deshacer cualquier
 * prefijo de mutaciones y dejar la raiz byte a byte como estaba.
 *
 * LIMITE DE ESCRITURA POR CONSTRUCCION, no por buenas intenciones: toda escritura, borrado o
 * renombre pasa por dentroDelRecinto(), que solo admite
 *
 *     motor/**    motor.lock    gen.mjs    importar.mjs
 *     y las dos carpetas de trabajo .motor.nueva-* / .motor.anterior-* de ESTA transaccion
 *     (viven junto a motor/ porque un renombre entre volumenes no es atomico ni garantizado)
 *
 * Cualquier otra ruta lanza, aunque el lock del origen viniera envenenado.
 *
 * La prueba de fallo a mitad esta automatizada con MOTOR_FALLO_PRUEBA: 'tras-m1'..'tras-m5'
 * lanzan un error justo despues de esa mutacion; 'tras-swap' y 'tras-envoltorios' son alias
 * historicos de 'tras-m2' y 'tras-m4'. Solo existe para eso. */
import { execSync } from 'node:child_process';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync, renameSync, lstatSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RAIZ_CLIENTE, RAIZ_MOTOR, cliente, sha256, verificarMotor } from './entorno.mjs';

const NL = String.fromCharCode(10);

export function crearTransaccionMotor({ origen }) {
  const ORIGEN = origen;

  /* ---- el recinto ---- */
  const marca = Math.random().toString(16).slice(2, 8);
  const NUEVA = cliente('.motor.nueva-' + marca + '/');
  const ANTERIOR = cliente('.motor.anterior-' + marca + '/');
  /* Ficheros por IGUALDAD EXACTA; carpetas por prefijo CON su separador: motor.lock.bak o
     gen.mjs2 no pasan por parecerse. */
  const FICHEROS_PERMITIDOS = [
    cliente('motor.lock').pathname,
    cliente('gen.mjs').pathname,
    cliente('importar.mjs').pathname,
  ];
  const CARPETAS_PERMITIDAS = [
    RAIZ_MOTOR.pathname,
    NUEVA.pathname,
    ANTERIOR.pathname,
  ];
  function dentroDelRecinto(url) {
    const ruta = url.pathname;
    if (!FICHEROS_PERMITIDOS.includes(ruta)
        && !CARPETAS_PERMITIDAS.some((p) => ruta === p || ruta.startsWith(p))) {
      throw new Error('ESCRITURA FUERA DEL RECINTO: ' + ruta + NL
        + 'La transaccion solo puede tocar motor/, motor.lock, los envoltorios y sus'
        + ' carpetas de trabajo. Esto es un error de programa, no del operador.');
    }
    return url;
  }
  const escribir = (url, datos) => writeFileSync(dentroDelRecinto(url), datos);
  const copiarA = (desde, hasta) => copyFileSync(desde, dentroDelRecinto(hasta));
  const borrar = (url) => rmSync(dentroDelRecinto(url), { recursive: true, force: true });
  const renombrar = (a, b) => renameSync(dentroDelRecinto(a), dentroDelRecinto(b));
  const carpeta = (url) => mkdirSync(dentroDelRecinto(url), { recursive: true });

  /* ---- estado interno ---- */
  let estadoActual = 'NUEVA';
  let lockActual = null;
  let lockOrigen = null;
  let bytesLockOrigen = null;
  let respaldoLock = null;
  let respaldoGen = null;
  let respaldoImportar = null;
  /* El registro de mutaciones: rollback() deshace exactamente el prefijo hecho, ni mas. */
  const hechas = { m1: false, m2: false, m3: false, m4: false, m5: false };
  let resultadoCommit = null;

  const gancho = (punto) => {
    let pedido = process.env.MOTOR_FALLO_PRUEBA || '';
    if (pedido === 'tras-swap') pedido = 'tras-m2';
    if (pedido === 'tras-envoltorios') pedido = 'tras-m4';
    if (pedido === punto) throw new Error('FALLO SIMULADO ' + punto + ' (prueba)');
  };

  /* ---- preparar: todas las validaciones + staging, NADA del motor activo tocado ---- */
  function preparar() {
    if (estadoActual !== 'NUEVA') {
      throw new Error('preparar() requiere estado NUEVA, no ' + estadoActual);
    }

    /* git limpio: no se cambia el motor con trabajo a medias. */
    const sucio = execSync('git status --porcelain', { cwd: fileURLToPath(RAIZ_CLIENTE) }).toString().trim();
    if (sucio) {
      throw new Error('El arbol de git no esta limpio. Guarda o descarta antes de tocar el motor:' + NL
        + sucio.split(NL).slice(0, 8).map((l) => '  ' + l).join(NL));
    }

    /* El motor ACTUAL cuadra con su lock: una personalizacion local se para aqui, con su
       lista, en vez de perderse bajo la version nueva. */
    lockActual = verificarMotor();

    /* El ORIGEN cuadra con su propio lock: no se instala un motor manipulado. */
    bytesLockOrigen = readFileSync(new URL('motor.lock', ORIGEN));
    lockOrigen = JSON.parse(bytesLockOrigen.toString('utf8'));
    if (lockOrigen.formato !== 'motor.lock/1') {
      throw new Error('El origen trae un motor.lock de formato desconocido: ' + lockOrigen.formato);
    }
    /* Las rutas del lock del origen pasan por la MISMA validacion que las del propio: se
       reusa el criterio construyendo las URL solo tras comprobar la forma. */
    const esEnlace = (u) => {
      try { return lstatSync(u).isSymbolicLink(); } catch (e) { return false; }
    };
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
      else if (esEnlace(u)) malOrigen.push('ENLACE SIMBOLICO ' + rel);
      else if (sha256(u) !== h) malOrigen.push('CAMBIADO ' + rel);
    }
    for (const [rel, h] of Object.entries(lockOrigen.envoltorios || {})) {
      if (rel !== 'gen.mjs' && rel !== 'importar.mjs') { malOrigen.push('ENVOLTORIO NO AUTORIZADO ' + rel); continue; }
      const u = new URL(rel, ORIGEN);
      if (!existsSync(u)) malOrigen.push('FALTA envoltorio ' + rel);
      else if (esEnlace(u)) malOrigen.push('ENLACE SIMBOLICO envoltorio ' + rel);
      else if (sha256(u) !== h) malOrigen.push('CAMBIADO envoltorio ' + rel);
    }
    if (malOrigen.length) {
      throw new Error('El ORIGEN no cuadra con su propio lock: no se instala un motor manipulado.' + NL
        + malOrigen.slice(0, 8).map((m) => '  ' + m).join(NL));
    }

    /* Staging: la version nueva, completa y re-verificada, en la carpeta de trabajo. Una
       copia a medias o corrupta se queda ahi y ahi muere. */
    borrar(NUEVA);
    carpeta(NUEVA);
    for (const rel of Object.keys(lockOrigen.ficheros)) {
      const destino = new URL(rel, NUEVA);
      carpeta(new URL('./', destino));
      copiarA(new URL('motor/' + rel, ORIGEN), destino);
    }
    for (const [rel, h] of Object.entries(lockOrigen.ficheros)) {
      if (sha256(new URL(rel, NUEVA)) !== h) {
        borrar(NUEVA);
        throw new Error('La copia preparada no cuadra (' + rel + '): no se ha tocado el motor activo.');
      }
    }

    /* Los respaldos, ANTES de que exista la primera mutacion que deshacer. */
    respaldoLock = readFileSync(cliente('motor.lock'));
    respaldoGen = readFileSync(cliente('gen.mjs'));
    respaldoImportar = readFileSync(cliente('importar.mjs'));

    estadoActual = 'PREPARADA';
  }

  /* ---- aplicar: las cinco mutaciones, registradas una a una ---- */
  function aplicar() {
    if (estadoActual !== 'PREPARADA') {
      throw new Error('aplicar() requiere estado PREPARADA, no ' + estadoActual);
    }
    if (!respaldoLock || !respaldoGen || !respaldoImportar) {
      throw new Error('aplicar() sin respaldos: esto es un error de programa.');
    }
    estadoActual = 'APLICANDO';
    renombrar(RAIZ_MOTOR, ANTERIOR);
    hechas.m1 = true;
    gancho('tras-m1');
    renombrar(NUEVA, RAIZ_MOTOR);
    hechas.m2 = true;
    gancho('tras-m2');
    copiarA(new URL('gen.mjs', ORIGEN), cliente('gen.mjs'));
    hechas.m3 = true;
    gancho('tras-m3');
    copiarA(new URL('importar.mjs', ORIGEN), cliente('importar.mjs'));
    hechas.m4 = true;
    gancho('tras-m4');
    escribir(cliente('motor.lock'), bytesLockOrigen);
    hechas.m5 = true;
    gancho('tras-m5');
    estadoActual = 'APLICADA_NO_CONFIRMADA';
  }

  /* ---- verificar: el motor activo cuadra con el lock NUEVO; no cambia de estado ---- */
  function verificar() {
    if (estadoActual !== 'APLICADA_NO_CONFIRMADA') {
      throw new Error('verificar() requiere estado APLICADA_NO_CONFIRMADA, no ' + estadoActual);
    }
    if (!readFileSync(cliente('motor.lock')).equals(bytesLockOrigen)) {
      throw new Error('motor.lock en disco no es el del origen: la aplicacion quedo a medias.');
    }
    return verificarMotor();
  }

  /* ---- commit: el punto de no retorno; SOLO aqui se retira el motor anterior ---- */
  function commit() {
    if (estadoActual === 'CONFIRMADA') {
      /* Idempotente, y con utilidad: si quedo limpieza pendiente, se reintenta. */
      if (resultadoCommit.limpiezaPendiente.length) {
        if (!existsSync(ANTERIOR)) resultadoCommit = { limpiezaPendiente: [] };
        else {
          try { borrar(ANTERIOR); resultadoCommit = { limpiezaPendiente: [] }; }
          catch (e) { /* sigue pendiente; el llamador ya tiene la ruta */ }
        }
      }
      return resultadoCommit;
    }
    if (estadoActual !== 'APLICADA_NO_CONFIRMADA') {
      throw new Error('commit() requiere estado APLICADA_NO_CONFIRMADA, no ' + estadoActual);
    }
    /* Un fallo al borrar el temporal NO es un fallo de la transaccion: el motor nuevo ya
       esta entero y verificado. Se informa la ruta y la transaccion queda CONFIRMADA. */
    const limpiezaPendiente = [];
    try { borrar(ANTERIOR); } catch (e) { limpiezaPendiente.push(fileURLToPath(ANTERIOR)); }
    respaldoLock = null;
    respaldoGen = null;
    respaldoImportar = null;
    estadoActual = 'CONFIRMADA';
    resultadoCommit = { limpiezaPendiente };
    return resultadoCommit;
  }

  /* ---- rollback: deshacer exactamente el prefijo de mutaciones hecho ---- */
  function rollback() {
    if (estadoActual === 'CONFIRMADA') {
      throw new Error('rollback() tras commit(): el punto de no retorno ya paso y no hay vuelta atras.');
    }
    if (estadoActual !== 'PREPARADA' && estadoActual !== 'APLICANDO' && estadoActual !== 'APLICADA_NO_CONFIRMADA') {
      throw new Error('rollback() requiere una transaccion preparada o aplicandose, no ' + estadoActual);
    }
    const huboAplicar = estadoActual !== 'PREPARADA';
    /* Primero los renombres, segun el registro: con m2 hecha, el motor activo es el nuevo y
       sobra; con solo m1, la carpeta anterior vuelve a su sitio y ya. */
    if (hechas.m2) {
      if (existsSync(RAIZ_MOTOR)) borrar(RAIZ_MOTOR);
      if (existsSync(ANTERIOR)) renombrar(ANTERIOR, RAIZ_MOTOR);
    } else if (hechas.m1 && existsSync(ANTERIOR)) {
      renombrar(ANTERIOR, RAIZ_MOTOR);
    }
    /* Despues, SIEMPRE que aplicar() llego a entrar, los tres ficheros de la raiz recuperan
       sus bytes desde los respaldos: da igual en cual de m3..m5 se quedo, reescribir es
       idempotente. En PREPARADA no se toco nada, asi que solo se limpia el staging. */
    if (huboAplicar) {
      escribir(cliente('motor.lock'), respaldoLock);
      escribir(cliente('gen.mjs'), respaldoGen);
      escribir(cliente('importar.mjs'), respaldoImportar);
    }
    borrar(NUEVA);
    borrar(ANTERIOR);
    estadoActual = 'REVERTIDA';
  }

  return {
    get lockActual() { return lockActual; },
    get lockOrigen() { return lockOrigen; },
    preparar,
    aplicar,
    verificar,
    commit,
    rollback,
    estado: () => estadoActual,
  };
}
