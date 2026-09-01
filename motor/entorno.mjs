/* Las rutas del motor, calculadas UNA vez y validadas UNA vez.
 *
 * El contrato de carpetas es fijo y es la interfaz del motor:
 *
 *     <cliente>/1-proyecto/            la raiz del cliente (git, cliente.mjs, carta.json)
 *     <cliente>/1-proyecto/motor/      el motor: este fichero y sus hermanos
 *     <cliente>/1-proyecto/server/     lo que se sube al hosting ademas de lo generado
 *     <cliente>/2-subir/               la salida, rehecha entera en cada build
 *
 * Nadie mas calcula rutas: gen.mjs e importar.mjs piden aqui. Si un dia el contrato cambia,
 * cambia en un solo sitio.
 *
 * La validacion es deliberadamente ruidosa: un motor copiado a una carpeta que no es un
 * cliente (sin cliente.mjs, sin carta.json) no debe compilar nada, debe decir donde esta el
 * error. Es la primera guarda del alta de clientes nuevos. */
import { existsSync, readFileSync, readdirSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const RAIZ_MOTOR = new URL('./', import.meta.url);
export const RAIZ_CLIENTE = new URL('../', RAIZ_MOTOR);
export const RAIZ_SALIDA = new URL('../2-subir/', RAIZ_CLIENTE);
/* Los DERIVADOS VOLATILES locales (lo que cada build rehace y git ignora) viven en
   generado/, separados de las fuentes de la raiz. Es una carpeta local y regenerable:
   borrarla entera solo cuesta un build. */
export const RAIZ_GENERADO = new URL('generado/', RAIZ_CLIENTE);

export const motor = (f) => new URL(f, RAIZ_MOTOR);
export const cliente = (f) => new URL(f, RAIZ_CLIENTE);
export const salida = (f) => new URL(f, RAIZ_SALIDA);
export const generado = (f) => new URL(f, RAIZ_GENERADO);

/* El nombre de la carpeta que CONTIENE al cliente (p. ej. "restaurante_x"): es lo que la
   guarda de restos compara contra la direccion publica de cliente.mjs. */
export const CARPETA_CLIENTE = new URL('../', RAIZ_CLIENTE).pathname
  .replace(/\/+$/, '').split('/').pop();

const NL = String.fromCharCode(10);
function morir(queja, arreglo) {
  throw new Error(NL + NL + queja + NL + NL + '  Como se arregla:  ' + arreglo + NL);
}

for (const [f, pista] of [
  ['cliente.mjs', 'el motor tiene que vivir en motor/ DENTRO de la carpeta del cliente'],
  ['carta.json', 'la carta del cliente; si es un alta nueva, copiala de la plantilla del motor'],
]) {
  if (!existsSync(cliente(f))) {
    morir('No encuentro ' + f + ' en ' + RAIZ_CLIENTE.pathname + ' — esto no es la raiz de un cliente.', pista);
  }
}

/* ---- motor.lock ----
 *
 * La lista exacta de lo que ES el motor, con el SHA-256 de cada fichero. Vive en la raiz del
 * cliente, al lado de motor/. Los envoltorios de la raiz lo verifican ANTES de cargar el
 * compilador o el importador (import dinamico: el orden es el mecanismo), asi que un modulo
 * del motor alterado no llega a ejecutar ni una linea.
 *
 * LO QUE ES Y LO QUE NO ES: motor.lock es un control de INTEGRIDAD Y CAMBIOS — detecta la
 * personalizacion local olvidada, la copia a medias, el fichero colado. NO es una firma
 * criptografica: quien pueda editar el motor puede editar tambien este verificador, y ningun
 * fichero puede protegerse de quien puede reescribirlo. La defensa frente a ese caso es git
 * y la revision de commits, no el lock. Por eso mismo entorno.mjs solo importa modulos de
 * node: verificar no puede depender de nada que este bajo verificacion.
 *
 * Reglas:
 *
 *   - un fichero del lock que falta            -> aborta
 *   - un fichero con otro hash                 -> aborta (personalizacion local o corrupcion)
 *   - un fichero en motor/ que el lock no lista -> aborta (nadie cuela nada en el motor)
 *
 * El build NUNCA arregla hashes: regenerar el lock es una orden explicita
 * (node motor/lock.mjs --escribir) que se da al actualizar el motor a proposito. Los
 * envoltorios de la raiz (gen.mjs, importar.mjs) tambien van en el lock: son la interfaz
 * estable del motor y nadie deberia poder cambiarlos sin que el build lo cante. */
export function sha256(url) {
  return createHash('sha256').update(readFileSync(url)).digest('hex');
}

export function ficherosDelMotor() {
  const out = [];
  const anda = (dir, prefijo) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isDirectory()) anda(new URL(e.name + '/', dir), prefijo + e.name + '/');
      else out.push(prefijo + e.name);
    }
  };
  anda(RAIZ_MOTOR, '');
  return out;
}

export function verificarMotor() {
  const ruta = cliente('motor.lock');
  if (!existsSync(ruta)) {
    morir('No hay motor.lock en la raiz del cliente.',
      'si acabas de actualizar el motor a mano, genera el lock con: node motor/lock.mjs --escribir');
  }
  let lock;
  try {
    lock = JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (e) {
    morir('motor.lock no es JSON valido: ' + e.message, 'restauralo del historial de git');
  }
  if (lock.formato !== 'motor.lock/1') {
    morir('motor.lock: formato desconocido ' + JSON.stringify(lock.formato),
      'este motor entiende "motor.lock/1"; no se adivina');
  }
  /* Las RUTAS del lock se validan antes de tocarlas: una entrada con ruta absoluta, con
     '..', con barra invertida o que apunte a un enlace simbolico convertiria la verificacion
     (y peor, una actualizacion) en una escritura fuera del recinto. Se rechazan, no se
     interpretan. */
  const rutaMala = (rel) => {
    if (typeof rel !== 'string' || rel === '') return 'vacia';
    if (rel.indexOf(String.fromCharCode(92)) !== -1) return 'barra invertida';
    if (/^([a-zA-Z]:|\/)/.test(rel)) return 'absoluta';
    if (rel.split('/').some((t) => t === '..' || t === '.')) return 'sale del directorio';
    return null;
  };
  const esEnlace = (url) => {
    try { return lstatSync(url).isSymbolicLink(); } catch (e) { return false; }
  };
  const mal = [];
  for (const [rel, esperado] of Object.entries(lock.ficheros || {})) {
    const porQue = rutaMala(rel);
    if (porQue) { mal.push('RUTA INVALIDA (' + porQue + ')  ' + JSON.stringify(rel)); continue; }
    const url = motor(rel);
    if (!existsSync(url)) { mal.push('FALTA  motor/' + rel); continue; }
    if (esEnlace(url)) { mal.push('ENLACE SIMBOLICO  motor/' + rel); continue; }
    if (sha256(url) !== esperado) mal.push('CAMBIADO  motor/' + rel);
  }
  for (const [rel, esperado] of Object.entries(lock.envoltorios || {})) {
    if (rel !== 'gen.mjs' && rel !== 'importar.mjs') {
      mal.push('ENVOLTORIO NO AUTORIZADO  ' + JSON.stringify(rel)); continue;
    }
    const url = cliente(rel);
    if (!existsSync(url)) { mal.push('FALTA  ' + rel + ' (envoltorio)'); continue; }
    if (esEnlace(url)) { mal.push('ENLACE SIMBOLICO  ' + rel + ' (envoltorio)'); continue; }
    if (sha256(url) !== esperado) mal.push('CAMBIADO  ' + rel + ' (envoltorio)');
  }
  const listados = new Set(Object.keys(lock.ficheros || {}));
  for (const rel of ficherosDelMotor()) {
    if (!listados.has(rel)) mal.push('SIN REGISTRAR  motor/' + rel);
  }
  if (mal.length) {
    morir('El motor no cuadra con motor.lock:' + NL + '  ' + mal.join(NL + '  '),
      'si el cambio es tuyo y a proposito, registralo: node motor/lock.mjs --escribir' + NL
      + '                     si no lo es, restaura el motor desde git antes de compilar');
  }
  return lock;
}
