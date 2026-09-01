/* motor.lock: verificar o escribir. La escritura es SIEMPRE una orden explicita.
 *
 *   node motor/lock.mjs                       verifica y dice que encuentra
 *   node motor/lock.mjs --escribir            regenera el lock (tras actualizar el motor)
 *   node motor/lock.mjs --escribir --version 1.1.0
 *
 * El build normal solo verifica (via entorno.verificarMotor) y jamas arregla un hash. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  RAIZ_MOTOR, cliente, motor, sha256, ficherosDelMotor, verificarMotor,
} from './entorno.mjs';

const args = process.argv.slice(2);
const escribir = args.includes('--escribir');
const vIdx = args.indexOf('--version');

if (!escribir) {
  const lock = verificarMotor();
  console.log('motor.lock cuadra | version', lock.version, '|',
    Object.keys(lock.ficheros).length, 'ficheros del motor +',
    Object.keys(lock.envoltorios).length, 'envoltorios | esquema estado', lock.esquemaEstado,
    '| esquema carta', lock.esquemaCarta);
  process.exit(0);
}

const anterior = existsSync(cliente('motor.lock'))
  ? JSON.parse(readFileSync(cliente('motor.lock'), 'utf8'))
  : null;
const version = vIdx !== -1 && args[vIdx + 1]
  ? args[vIdx + 1]
  : (anterior?.version ?? '1.0.0');

const ficheros = {};
for (const rel of ficherosDelMotor()) ficheros[rel] = sha256(motor(rel));

const envoltorios = {};
for (const rel of ['gen.mjs', 'importar.mjs']) {
  if (!existsSync(cliente(rel))) {
    console.error('Falta el envoltorio ' + rel + ' en la raiz del cliente: no se escribe el lock.');
    process.exit(1);
  }
  envoltorios[rel] = sha256(cliente(rel));
}

const lock = {
  formato: 'motor.lock/1',
  version: String(version),
  /* Las epocas de datos que este motor entiende. Un motor futuro que cambie el formato del
     estado o de la carta sube estos numeros, y la comprobacion del build correspondiente
     aborta con datos de una epoca que no entienda. */
  esquemaEstado: 2,
  esquemaCarta: 'carta/2',
  fecha: new Date().toISOString().slice(0, 10),
  envoltorios,
  ficheros,
};
writeFileSync(cliente('motor.lock'), JSON.stringify(lock, null, 1) + String.fromCharCode(10));
console.log('motor.lock escrito | version', lock.version, '|',
  Object.keys(ficheros).length, 'ficheros +', Object.keys(envoltorios).length, 'envoltorios');
