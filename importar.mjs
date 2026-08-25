/* Convierte carta.mjs en los ficheros que lee el build.
 *
 *   node importar.mjs
 *
 * Escribe menu.md con los platos y reescribe las cinco secciones de catálogo de CADA
 * diccionario de idioma — names, descriptions, notes, tabs y groups. La sección `ui` NO se
 * toca en ninguno: son cadenas de interfaz que se mantienen a mano y que además llevan el
 * título y el rótulo del restaurante.
 *
 * Y comprueba que la estructura de carta.mjs cuadre con la de cliente.mjs. Son dos
 * ficheros distintos porque uno es la carta y el otro es la identidad, pero las pestañas
 * tienen que decir lo mismo en los dos: si no, el build revienta más tarde y con un
 * mensaje peor. Cuando no cuadran, esto escupe el bloque exacto que hay que pegar.
 *
 * Por qué existe: sin él, dar de alta un restaurante era escribir a mano 500 claves de
 * diccionario y una tabla markdown de 60 filas, y equivocarse en una sola rompía el build
 * con un error que no señalaba la línea.
 *
 * TRES DIFERENCIAS CON EL IMPORTADOR DE LOS DEMÁS CLIENTES, y las tres están aquí porque
 * Tinge llevaba su menu.md a mano desde antes de que este flujo existiera:
 *
 *   1. IDIOMAS. El importador de partida sólo sabía escribir i18n.es.mjs. Tinge tiene
 *      alemán además de español, así que aquí los idiomas salen de IDIOMAS_CLIENTE en
 *      cliente.mjs y se escribe un fichero por idioma. Con un solo idioma se comporta
 *      exactamente igual que antes.
 *
 *   2. EL NÚMERO DEL PLATO. El importador de partida numeraba solo, 01, 02, 03... Los
 *      números de Tinge no son correlativos: la carta salta del 67 al 69, desdobla el 24
 *      en 24a/24b/24c, y las salsas, los ingredientes y las pestañas Sin gluten y Vegano
 *      no llevan número. Como el número se imprime al lado del plato y el buscador busca
 *      por él, inventarlo cambiaría lo que ve el comensal. Así que va escrito en carta.mjs
 *      y esto lo copia tal cual. Si un plato no trae número, se cae al contador de antes.
 *
 *   3. NOTAS DE CATEGORÍA. La frase que vale para todo un grupo («Todos los naan se
 *      elaboran sin huevo») ya la sabía pintar gen.mjs, pero el importador de partida la
 *      dejaba siempre vacía. Tinge tiene nueve. Viene de Café Regina, que fue donde se
 *      resolvió primero.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/* Import dinamico para poder decir que falta en cristiano. Con un import normal, un
   restaurante sin carta.mjs recibe un ERR_MODULE_NOT_FOUND y a adivinar. */
let CARTA;
try {
  ({ CARTA } = await import('./carta.mjs'));
} catch (e) {
  console.error('No hay carta.mjs en esta carpeta.');
  console.error('Copia carta.EJEMPLO.mjs a carta.mjs y escribe dentro la carta del restaurante.');
  process.exit(1);
}

const { IDIOMAS_CLIENTE } = await import('./cliente.mjs');

const NL = String.fromCharCode(10);
const aqui = (f) => new URL('./' + f, import.meta.url);

/* Comillas simples y escapado, como el resto del proyecto. */
const js = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

/* Cuántas columnas de texto lleva cada cadena traducible: el inglés más un idioma por cada
   uno de los de cliente.mjs. Con [es] son 2 y las filas de plato quedan como en Dedos o en
   Regina; con [es, de] son 3, que es lo de Tinge. */
const N = IDIOMAS_CLIENTE.length;
const COLS = 1 + N;

/* Una cadena traducible: en carta.mjs es un array [en, es, de...]. Si viene corto, se
   dice qué falta en vez de escribir `undefined` en un diccionario. */
const texto = (v, donde) => {
  const a = Array.isArray(v) ? v : [v];
  if (a.length !== COLS) {
    throw new Error(donde + ': hacen falta ' + COLS + ' idiomas ('
      + ['en'].concat(IDIOMAS_CLIENTE.map((l) => l.code)).join(', ') + ') y hay ' + a.length
      + ': ' + JSON.stringify(a));
  }
  return a;
};

/* ---- recorrer la carta una vez y sacar todo lo que hace falta ---- */
/* Lo que va DESPUÉS del precio, que es donde chocaban las dos cartas que existen: una escribe
   ahí el número de plato y la otra la lista de alérgenos.

   Se distingue por forma, no por posición: un array son los alérgenos, y lo que aparezca antes
   es el número. Detrás de los alérgenos van el premio y la medalla. Así conviven las dos y una
   carta nueva puede llevar las cuatro cosas o ninguna.

     [.., precio]                              nada más: el número lo pone el contador
     [.., precio, "07"]                        con número escrito a mano
     [.., precio, ["trigo"], "", ""]           con alérgenos
     [.., precio, "07", ["trigo"], "1ª", "oro"]  con las cuatro */
const MEDALLAS = ['oro', 'bronce'];

function extras(resto, donde) {
  let id;
  let i = 0;
  if (resto.length && !Array.isArray(resto[0])) { id = String(resto[0]); i = 1; }
  const alergenos = Array.isArray(resto[i]) ? resto[i] : [];
  const premio = resto[i + 1] === undefined ? '' : String(resto[i + 1]);
  const medalla = resto[i + 2] === undefined ? '' : String(resto[i + 2]);
  if (medalla && !MEDALLAS.includes(medalla)) {
    throw new Error(donde + ': la medalla ' + JSON.stringify(medalla) + ' no existe.'
      + ' Las validas son: ' + MEDALLAS.join(', '));
  }
  return { id, alergenos, premio, medalla };
}

const platos = [];        // { cat, nombre[], desc[], precio, id }
/* Los alergenos que el motor sabe pintar. Un nombre mal escrito no se pinta y no avisa, asi que
   se para aqui: es el unico sitio donde alguien lo esta mirando. */
const CONOCIDOS = ['trigo', 'leche', 'huevo', 'soja', 'mostaza', 'apio', 'sulfitos',
                   'sesamo', 'frutos_secos', 'pescado', 'crustaceos'];

const cats = [];          // { tab, icono, cat, sub[], iconoSub, nota[] }
for (const t of CARTA) {
  const pestana = texto(t.pestana, 'pestaña');
  for (const g of t.grupos) {
    /* La categoría es una clave interna: agrupa los platos en menu.md y no se enseña nunca.
       Por eso se admite como cadena suelta. Los clientes que la escriben como array siguen
       valiendo: se toma el inglés, que es lo único que se usaba ya. */
    const catEn = Array.isArray(g.categoria) ? g.categoria[0] : g.categoria;
    cats.push({
      tab: pestana[0], icono: t.icono, cat: catEn,
      sub: g.subtitulo ? texto(g.subtitulo, 'subtítulo de ' + catEn) : null,
      iconoSub: g.icono || null,
      nota: g.nota ? texto(g.nota, 'nota de ' + catEn) : null,
    });
    for (const fila of g.platos) {
      const nombre = texto(fila.slice(0, COLS), 'plato en ' + catEn);
      const desc = texto(fila.slice(COLS, COLS * 2), 'descripción en ' + catEn);
      platos.push({ cat: catEn, nombre, desc, precio: fila[COLS * 2],
                    ...extras(fila.slice(COLS * 2 + 1), catEn) });
    }
  }
}

/* Un nombre repetido en dos categorías comparte traducción, y eso es una decisión, no un
   descuido: si el mismo plato se llama igual, se traduce igual. Pero si alguien escribe dos
   traducciones distintas para el mismo nombre, gana la primera en silencio — y eso sí es un
   error que hay que ver. */
const choques = [];
const unico = (filas, donde) => {
  const m = new Map();
  for (const fila of filas) {
    const k = fila[0];
    /* Se guarda la fila ENTERA, con el inglés en la posición 0, para que el índice de un
       idioma sea el mismo aquí que en carta.mjs: 0 inglés, 1 el primero de IDIOMAS_CLIENTE,
       2 el segundo. Guardar sólo las traducciones desplazaba el índice en uno, y el español
       acababa escribiéndose con el texto alemán sin que nada reventara. */
    const a = m.get(k);
    if (a && a.slice(1).join(' | ') !== fila.slice(1).join(' | ')) {
      choques.push(donde + ': ' + JSON.stringify(k));
    }
    if (!a) m.set(k, fila);
  }
  return m;
};

const names = unico(platos.map((p) => p.nombre), 'names');
const descs = unico([new Array(COLS).fill('')].concat(
  platos.filter((p) => p.desc[0]).map((p) => p.desc)), 'descriptions');
const notes = unico(cats.filter((c) => c.nota).map((c) => c.nota), 'notes');
const tabs = unico(CARTA.map((t) => texto(t.pestana, 'pestaña')), 'tabs');
const groups = unico(cats.filter((c) => c.sub).map((c) => c.sub), 'groups');

if (choques.length) {
  throw new Error('el mismo texto con dos traducciones distintas en carta.mjs:' + NL
    + '  ' + [...new Set(choques)].join(NL + '  '));
}

/* ---- menu.md ---- */
/* ¿Usa alguien las columnas de mas? De eso depende que menu.md salga con cuatro columnas o con
   siete. Una carta que no declara nada sale exactamente igual que antes de que existieran. */
const hayExtras = platos.some((p) => p.alergenos.length || p.premio || p.medalla);

const raros = [...new Set(platos.flatMap((p) => p.alergenos)
  .filter((a) => !CONOCIDOS.includes(a)))];
if (raros.length) {
  throw new Error('alergenos que no existen en carta.mjs: ' + raros.join(', ') + NL
    + '  los validos son: ' + CONOCIDOS.join(', '));
}

const md = ['# Carta — generada por importar.mjs desde carta.mjs', '',
  '> NO SE EDITA A MANO: cada `node importar.mjs` la reescribe entera.',
  '> Los platos se cambian en carta.mjs.', '',
  '## Data format', '',
  'Each category contains a Markdown table with: `id`, `name`, `description`, `price`.', ''];
let n = 0;
let sinNumero = 0;
for (const c of cats) {
  md.push('## ' + c.cat, '');
  /* La nota va como cita justo debajo del título: es el formato que gen.mjs ya parsea. */
  if (c.nota) md.push('> ' + c.nota[0], '');
  /* Las columnas de mas se escriben solo si alguien las usa. gen.mjs las lee si estan y las
     ignora si no, asi que una carta sin alergenos sigue saliendo con cuatro columnas. */
  md.push(hayExtras
    ? '| id | name | description | price | allergens | award | medal |'
    : '| id | name | description | price |',
    hayExtras ? '|---|---|---|---:|---|---|---|' : '|---|---|---|---:|');
  for (const p of platos.filter((x) => x.cat === c.cat)) {
    n += 1;
    /* El número que trae el plato manda. Sin él, el contador de siempre. Y la cadena vacía
       es un número válido: quiere decir «este plato no lleva número», que es lo que pasa en
       las listas de salsas y en las pestañas Sin gluten y Vegano. */
    const id = p.id === undefined ? String(n).padStart(2, '0') : p.id;
    if (id === '') sinNumero += 1;
    const fila = '| ' + id + ' | ' + p.nombre[0] + ' | ' + p.desc[0] + ' | ' + p.precio + ' |';
    md.push(hayExtras
      ? fila + ' ' + p.alergenos.join(' ') + ' | ' + p.premio + ' | ' + p.medalla + ' |'
      : fila);
  }
  md.push('');
}
writeFileSync(aqui('menu.md'), md.join(NL) + NL);

/* ---- i18n.<idioma>.mjs: se reescriben cinco secciones y se respeta ui ---- */
const seccion = (nombre, mapa, col, nota) => [
  '/* ' + nota + ' */',
  'export const ' + nombre + ' = {',
  ...[...mapa].map(([k, v]) => '  ' + js(k) + ': ' + js(v[col]) + ','),
  '};',
].join(NL);

/* La línea de intro de una pestaña vive en TAB_INTRO, pero el build la traduce por la
   sección ui, igual que cualquier otro texto de interfaz. Así que la escribe el importador
   —sale de carta.mjs— y el resto de ui se queda como estaba, que es a mano. Sin esto el
   build reventaba con «missing translations» señalando una cadena que nadie había escrito
   a mano en ningún sitio. */
const uiConIntros = (bloque, col) => {
  let out = bloque;
  for (const t of CARTA.filter((x) => x.intro)) {
    const intro = texto(t.intro, 'intro de ' + texto(t.pestana, 'pestaña')[0]);
    const linea = '  ' + js(intro[0]) + ': ' + js(intro[col]) + ',';
    const yaEsta = new RegExp('^  ' + js(intro[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      + ':.*$', 'm');
    out = yaEsta.test(out) ? out.replace(yaEsta, linea)
                           : out.replace('export const ui = {', 'export const ui = {' + NL + linea);
  }
  return out;
};

const escritos = [];
IDIOMAS_CLIENTE.forEach((idioma, i) => {
  const col = i + 1;                       // 0 es el inglés, que es la clave
  const fichero = 'i18n.' + idioma.code + '.mjs';
  const ruta = aqui(fichero);
  const viejo = existsSync(ruta) ? readFileSync(ruta, 'utf8').replace(/\r\n/g, NL) : '';
  const mUi = viejo.match(/(?:\/\*(?:[^*]|\*(?!\/))*\*\/\s*\n)?export const ui = \{[\s\S]*?\n\};/);
  if (!mUi) {
    throw new Error('no encuentro la sección ui en ' + fichero + ': se conserva, no se genera.'
      + NL + '  Es la interfaz de la carta y se mantiene a mano; el importador sólo escribe'
      + NL + '  el catálogo. Si el fichero no existe todavía, cópialo de otro idioma y'
      + NL + '  traduce su ui antes de volver a pasar por aquí.');
  }

  writeFileSync(ruta, [
    '/* Catálogo en ' + idioma.name + '. Lo escribe importar.mjs desde carta.mjs: no editar a mano,',
    '   se sobrescribe. La sección ui de abajo sí es a mano — es interfaz, no carta. */',
    '',
    seccion('names', names, col, 'Los nombres de los platos.'),
    '',
    seccion('descriptions', descs, col, 'Las descripciones. La cadena vacía es para los platos sin ella.'),
    '',
    seccion('notes', notes, col, 'Notas de categoría: la frase que vale para todo un grupo de platos.'),
    '',
    seccion('tabs', tabs, col, 'Las pestañas.'),
    '',
    seccion('groups', groups, col, 'Los subtítulos dentro de una pestaña.'),
    '',
    uiConIntros(mUi[0], col),
    '',
  ].join(NL));
  escritos.push(fichero);
});

/* ---- ¿cuadra con cliente.mjs? ---- */
const bloque = (nombre, lineas) =>
  ['export const ' + nombre + (nombre === 'GROUPS' ? ' = [' : ' = {'), ...lineas,
    nombre === 'GROUPS' ? '];' : '};'].join(NL);

const grupos = [];
for (const t of CARTA) {
  const pestana = texto(t.pestana, 'pestaña');
  grupos.push('  [' + js(pestana[0]) + ', [');
  for (const c of cats.filter((x) => x.tab === pestana[0])) {
    grupos.push('    [' + js(c.cat) + ', ' + (c.sub ? js(c.sub[0]) : 'null') + '],');
  }
  grupos.push('  ]],');
}
const esperado = [
  bloque('TAB_INTRO', CARTA.filter((t) => t.intro).map(
    (t) => '  ' + js(texto(t.pestana, 'pestaña')[0]) + ': ' + js(texto(t.intro, 'intro')[0]) + ',')),
  bloque('GROUPS', grupos),
  bloque('TAB_ICON', CARTA.map((t) => '  ' + js(texto(t.pestana, 'pestaña')[0]) + ': ' + js(t.icono) + ',')),
  bloque('GROUP_ICON_BY_CAT', cats.filter((c) => c.sub).map((c) => '  ' + js(c.cat) + ': ' + js(c.iconoSub) + ',')),
].join(NL + NL);

const cli = readFileSync(aqui('cliente.mjs'), 'utf8').replace(/\r\n/g, NL);
/* La comprobación mira el ORDEN, no sólo la presencia.
 *
 * Antes preguntaba «¿está esta línea en cliente.mjs?», una por una. Eso deja pasar el caso
 * que más duele: cambiar de sitio una pestaña en carta.mjs. Todas las líneas siguen estando,
 * así que decía «cuadra» — y el build salía con las pestañas en el orden viejo de GROUPS y
 * los números de plato en el orden nuevo de menu.md. Dos ordenaciones distintas en la misma
 * carta, y ningún aviso.
 *
 * Ahora recorre las líneas esperadas de arriba abajo exigiendo que aparezcan en cliente.mjs
 * en ese mismo orden. Una línea que existe pero está antes de donde debería cuenta como que
 * no cuadra, que es justo lo que es. Se permiten comentarios y líneas sueltas en medio: se
 * comprueba el orden relativo, no que el bloque sea idéntico carácter a carácter. */
const lineasCli = cli.split(NL).map((l) => l.trim());
const falta = [];
let desde = 0;
for (const linea of esperado.split(NL)) {
  const buscada = linea.trim();
  if (!buscada) continue;
  const donde = lineasCli.indexOf(buscada, desde);
  if (donde === -1) falta.push(buscada);
  else desde = donde + 1;
}

console.log('menu.md    ' + n + ' platos en ' + cats.length + ' categorías'
  + (sinNumero ? ' · ' + sinNumero + ' sin número, como en la carta impresa' : ''));
console.log('idiomas    ' + escritos.join(' · ') + ' (ui intacta en cada uno)');
console.log('catálogo   names ' + names.size + ' · descriptions ' + descs.size
  + ' · notes ' + notes.size + ' · tabs ' + tabs.size + ' · groups ' + groups.size);
if (falta.length) {
  console.log(NL + 'OJO: cliente.mjs no cuadra con carta.mjs. Pega esto en cliente.mjs:' + NL);
  console.log(esperado);
} else {
  console.log('cliente.mjs cuadra con carta.mjs');
}
