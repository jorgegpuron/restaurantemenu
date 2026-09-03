/* Comprueba que 2-subir contiene una compilacion COMPLETA.
 *
 *   node motor/verificar-build.mjs
 *
 * Se ejecuta en dos sitios y con el mismo codigo, para que no haya dos listas que se separen:
 *   1. al final de gen.mjs, asi un build truncado no llega a decir "2-subir rehecha";
 *   2. en el workflow, despues de compilar y ANTES del FTP.
 *
 * Falla cerrado: si falta un solo fichero obligatorio, sale con codigo 1, dice exactamente
 * cuales faltan y no arregla ni borra nada. Un build incompleto no es algo que se repare al
 * vuelo: es algo que no se sube.
 *
 * Lo que se espera lo decide motor/contrato-salida.mjs, que lo deriva de motor.lock y de
 * cliente.mjs -- nunca de listar las carpetas de origen, que es justo lo que fallo el dia que
 * salieron 18 ficheros en vez de 73.
 */
import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cliente, salida, RAIZ_SALIDA } from './entorno.mjs';
import { CLIENTE } from '../cliente.mjs';
import { contratoSalida, CARPETAS_OBLIGATORIAS } from './contrato-salida.mjs';

const NL = String.fromCharCode(10);

/* Devuelve la lista de problemas. Vacia = build completo. Se exporta para que gen.mjs la
   llame sin lanzar un proceso aparte. */
export function verificarBuild() {
  const problemas = [];

  if (!existsSync(RAIZ_SALIDA)) {
    return ['no existe la carpeta de salida: ' + fileURLToPath(RAIZ_SALIDA)];
  }

  const lock = JSON.parse(readFileSync(cliente('motor.lock'), 'utf8'));
  const esperados = contratoSalida(lock, CLIENTE);

  for (const [ruta, razon] of esperados) {
    const url = salida(ruta);
    if (!existsSync(url)) {
      problemas.push('falta  ' + ruta + '   (' + razon + ')');
      continue;
    }
    const st = statSync(url);
    if (!st.isFile()) {
      problemas.push('no es un fichero  ' + ruta);
    } else if (st.size === 0) {
      problemas.push('vacio  ' + ruta + '   (' + razon + ')');
    }
  }

  for (const dir of CARPETAS_OBLIGATORIAS) {
    const url = salida(dir + '/');
    if (!existsSync(url) || !statSync(url).isDirectory()) {
      problemas.push('falta la carpeta  ' + dir + '/');
    } else if (!readdirSync(url).length) {
      problemas.push('carpeta vacia  ' + dir + '/');
    }
  }

  return problemas;
}

/* Ejecutado como programa: informa y decide el codigo de salida. Importado: solo exporta. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problemas = verificarBuild();
  const total = contratoSalida(JSON.parse(readFileSync(cliente('motor.lock'), 'utf8')), CLIENTE).size;
  if (problemas.length) {
    console.error('BUILD INCOMPLETO: ' + problemas.length + ' problema(s) sobre '
      + total + ' ficheros obligatorios.' + NL);
    for (const p of problemas) console.error('  ' + p);
    console.error(NL + 'No se sube nada. Vuelve a compilar y comprueba que el motor esta entero:');
    console.error('  node gen.mjs   (y si el motor esta tocado: node motor/lock.mjs --escribir)');
    process.exit(1);
  }
  console.log('build completo | ' + total + ' ficheros obligatorios verificados');
}
