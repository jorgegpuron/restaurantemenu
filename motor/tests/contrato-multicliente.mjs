/* ------------------------------------------------------------------ *
 * Contrato multicliente: el motor no nombra a ningun restaurante
 * ------------------------------------------------------------------ *
 *
 * El invariante del producto es una frase: el COMPORTAMIENTO es del motor, el DATO es del
 * cliente. Esta prueba vigila la mitad que nadie vigilaba -- que el dato de un cliente no se
 * cuele dentro del motor -- y lo hace donde duele: en el build, para todos los clientes, en
 * cada compilacion.
 *
 * POR QUE EXISTE, con nombres y fecha. El alta de Bar Restaurante Guaza (14 sep 2026) heredo
 * el motor con el nombre y el vocabulario del restaurante semilla escritos en sus comentarios:
 * la ruta de otro cliente en el .htaccess, sus platos como ejemplo en el panel, su marca
 * citada como si fuera el color de fabrica. Nada de eso llegaba a la carta publica -- eran
 * comentarios -- pero viajaba entero al repositorio privado de un restaurante que no tiene
 * nada que ver, y las instrucciones del servidor le mandaban abrir una carpeta que no existe
 * en su dominio.
 *
 * Y lo peor no fue que pasara, sino que la herramienta de alta dijo que no pasaba:
 * `--detectar` exime de la revision todo fichero de motor/ cuyo hash cuadre con motor.lock.
 * Lo firmado era invisible. Una puerta que no mira donde esta el problema.
 *
 * QUE PROHIBE, y de donde lo saca. De `cliente.mjs`, nunca de una lista fija dentro del motor
 * -- una lista fija seria exactamente el mismo error que persigue:
 *
 *   CLIENTE.slug            el prefijo con el que guarda en el navegador
 *   CLIENTE.base            cada segmento de su RUTA publica: la carpeta del restaurante y
 *                           la de la carta dentro de ella. El dominio NO -- socialcard.es
 *                           es del producto, y el motor lo nombra con todo el derecho.
 *   CLIENTE.nombre          el rotulo entero, tal cual
 *   CLIENTE.vocabulario     OPCIONAL: las palabras propias del restaurante -- sus platos, su
 *                           cocina, su marca -- que no salen de ningun otro campo.
 *
 * Asi la puerta es del motor y el dato es del cliente, que es justo lo que se defiende. Y se
 * cierra sola: quien edite el motor trabajando desde un cliente y escriba una palabra suya
 * rompe el build DE ESE CLIENTE, en el acto, no tres altas despues.
 *
 * `nombre` NO se parte en palabras a proposito. 'Bar / Restaurante Guaza' daria «Restaurante»,
 * que el motor dice legitimamente por todas partes; una prueba que grita en falso se acaba
 * desactivando, y entonces no protege de nada. Para eso esta `vocabulario`: lo distintivo lo
 * declara quien lo sabe.
 *
 * QUE NO MIRA, y por que cada exencion:
 *
 *   **.md                 SPEC.md es el diario de diseno del panel: cita clientes reales
 *                         porque su asunto ES lo que se decidio para ellos. No se publica
 *                         (contrato-salida.mjs) y no es codigo.
 *   motor/tests/**        esta prueba nombra lo que busca; buscarse a si misma es un bucle.
 *   motor/alergenos.mjs   el catalogo de los 14 alergenos de la UE y sus alias. Su materia
 *                         son nombres de comida en tres idiomas -- naan, samosa, cuscus,
 *                         seitan -- y ninguno esta ahi por un restaurante concreto: estan
 *                         porque llevan gluten. Prohibirle vocabulario de cocina a la lista
 *                         de alergenos seria romper la lista.
 *   binarios              banderas, iconos, video: no se leen como texto.
 *
 * Ejecutar suelto:  node motor/tests/contrato-multicliente.mjs
 * Desde cualquier directorio: las rutas salen de import.meta.url, nunca del cwd.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CLIENTE } from '../../cliente.mjs';
import { ficherosDelMotor, motor } from '../entorno.mjs';
import { PISTAS } from '../alergenos.mjs';

const NL = String.fromCharCode(10);

/* Toda palabra que el catalogo de alergenos del motor YA declara como pista. Son del
   PRODUCTO por definicion: estan ahi porque llevan gluten o lacteo, no porque las sirva un
   restaurante concreto. Un cliente indio declarara 'naan' y 'paneer' en su vocabulario sin
   saber que el motor las necesita para avisar de un alergeno; si la puerta le hiciera caso,
   el build se pararia para siempre y la unica salida seria desactivar la puerta.

   Asi que mandan los alergenos: seguridad alimentaria por encima de higiene de comentarios.
   Y se calcula, no se escribe a mano -- una lista copiada aqui se separaria de la de alla. */
const DEL_CATALOGO_DE_ALERGENOS = new Set(
  Object.values(PISTAS)
    .flatMap((porIdioma) => Object.values(porIdioma).flat())
    .map((p) => String(p).toLowerCase()),
);

/* Rutas del motor (relativas, con '/') que esta prueba no lee. Ver la cabecera: cada una
   tiene su razon escrita, y ninguna es "es que da guerra". */
const EXENTAS = [
  (rel) => rel.endsWith('.md'),
  (rel) => rel.startsWith('tests/'),
  (rel) => rel === 'alergenos.mjs',
];

/* Extensiones que se leen como texto. Lo que no este aqui es binario y no se abre: una webp
   con los bytes de 'totm' por casualidad no es una fuga, es ruido. */
const TEXTO = ['.mjs', '.js', '.php', '.css', '.html', '.htaccess', '.txt', '.json', '.svg'];

const esTexto = (rel) => TEXTO.some((ext) => rel.endsWith(ext)) || rel.endsWith('.htaccess');

/* Las palabras prohibidas, derivadas del cliente. Minimo cuatro letras: por debajo, cualquier
   trozo casa con media lengua y la prueba deja de decir nada. */
export function terminosDelCliente(cli = CLIENTE) {
  const crudos = [];

  if (cli.slug) crudos.push(String(cli.slug));
  if (cli.nombre) crudos.push(String(cli.nombre));

  /* Solo la ruta. El dominio es del producto y sale legitimamente en el motor. */
  if (cli.base) {
    try {
      for (const seg of new URL(cli.base).pathname.split('/')) if (seg) crudos.push(seg);
    } catch { /* base mal formada: ya revienta el build en gen.mjs, no es asunto de aqui */ }
  }

  for (const v of (Array.isArray(cli.vocabulario) ? cli.vocabulario : [])) crudos.push(String(v));

  const vistos = new Set();
  const fuera = [];
  for (const t of crudos) {
    const limpio = t.trim();
    if (limpio.length < 4) continue;
    const clave = limpio.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    /* Si el catalogo de alergenos ya la declara, gana el catalogo. Ver arriba. */
    if (DEL_CATALOGO_DE_ALERGENOS.has(clave)) continue;
    fuera.push(limpio);
  }
  return fuera;
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Frontera de palabra propia: \b de JavaScript trata '_' y los acentos de forma que aqui
   estorba. Un segmento de ruta con guiones bajos tiene que casar entero, y un nombre dentro
   de su propio plural sigue contando como cita. Se exige que lo pegado a los lados no sea
   letra ni digito.

   Se EXPORTA porque nuevo-cliente.mjs --detectar busca exactamente lo mismo: dos matchers
   escritos aparte se separan, y el dia que se separen uno de los dos dira "limpio" sobre
   algo que el otro encuentra. */
export const patronDe = (termino) =>
  new RegExp('(^|[^0-9A-Za-z])' + escapar(termino) + '([^0-9A-Za-z]|$)', 'i');

function casa(texto, termino) {
  const re = patronDe(termino);
  const lineas = texto.split(NL);
  const golpes = [];
  for (let i = 0; i < lineas.length; i++) {
    if (re.test(lineas[i])) golpes.push({ linea: i + 1, texto: lineas[i].trim().slice(0, 100) });
  }
  return golpes;
}

/* Devuelve { terminos, revisados, fallos }. fallos vacio = el motor no nombra a nadie. */
export function contratoMulticliente(cli = CLIENTE) {
  const terminos = terminosDelCliente(cli);
  const fallos = [];
  let revisados = 0;

  if (!terminos.length) return { terminos, revisados, fallos };

  for (const rel of ficherosDelMotor()) {
    if (EXENTAS.some((f) => f(rel))) continue;
    if (!esTexto(rel)) continue;
    let texto;
    try { texto = readFileSync(motor(rel), 'utf8'); } catch { continue; }
    revisados++;
    for (const termino of terminos) {
      for (const g of casa(texto, termino)) {
        fallos.push('motor/' + rel + ':' + g.linea + '  cita ' + JSON.stringify(termino)
          + '   ' + g.texto);
      }
    }
  }
  return { terminos, revisados, fallos };
}

/* Ejecutado como programa: informa y decide el codigo de salida. Importado: solo exporta. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { terminos, revisados, fallos } = contratoMulticliente();
  if (fallos.length) {
    console.error('CONTRATO MULTICLIENTE: ' + fallos.length + ' cita(s) del cliente dentro del motor.' + NL);
    for (const f of fallos) console.error('  ' + f);
    console.error(NL + 'El motor es de TODOS los clientes: lo que nombre a uno viaja a los demas.');
    console.error('Reescribe la cita sin el nombre -- el porque del comentario se conserva, el');
    console.error('restaurante se va -- o, si de verdad es del producto y no del cliente, sacalo');
    console.error('de CLIENTE.vocabulario en cliente.mjs y di ahi por que.');
    process.exit(1);
  }
  console.log('contrato multicliente | ' + revisados + ' fichero(s) del motor | '
    + terminos.length + ' termino(s) del cliente | ninguna cita');
}
