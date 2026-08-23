/* Convierte carta.mjs en los dos ficheros que lee el build.
 *
 *   node importar.mjs
 *
 * Escribe menu.md con los platos y reescribe las cinco secciones de catálogo de
 * i18n.es.mjs — names, descriptions, notes, tabs y groups. La sección `ui` NO se toca:
 * son cadenas de interfaz que se mantienen a mano y que además llevan el título y el
 * rótulo del restaurante.
 *
 * Y comprueba que la estructura de carta.mjs cuadre con la de cliente.mjs. Son dos
 * ficheros distintos porque uno es la carta y el otro es la identidad, pero las pestañas
 * tienen que decir lo mismo en los dos: si no, el build revienta más tarde y con un
 * mensaje peor. Cuando no cuadran, esto escupe el bloque exacto que hay que pegar.
 *
 * Por qué existe: sin él, dar de alta un restaurante era escribir a mano 500 claves de
 * diccionario y una tabla markdown de 60 filas, y equivocarse en una sola rompía el build
 * con un error que no señalaba la línea.
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

const NL = String.fromCharCode(10);
const aqui = (f) => new URL('./' + f, import.meta.url);

/* Comillas simples y escapado, como el resto del proyecto. */
const js = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

/* ---- recorrer la carta una vez y sacar todo lo que hace falta ---- */
const platos = [];        // { cat, en, es, descEn, descEs, precio }
const cats = [];          // { tab, tabEs, icono, cat, catEs, sub, subEs, iconoSub, intro }
for (const t of CARTA) {
  const [tabEn, tabEs] = t.pestana;
  for (const g of t.grupos) {
    const [catEn, catEs] = g.categoria;
    cats.push({
      tab: tabEn, tabEs, icono: t.icono, cat: catEn, catEs,
      sub: g.subtitulo ? g.subtitulo[0] : null,
      subEs: g.subtitulo ? g.subtitulo[1] : null,
      iconoSub: g.icono || null,
      intro: t.intro || null,
    });
    for (const [en, es, descEn, descEs, precio] of g.platos) {
      platos.push({ cat: catEn, en, es, descEn, descEs, precio });
    }
  }
}

/* Un nombre repetido en dos categorías comparte traducción, y eso es una decisión, no un
   descuido: si el mismo plato se llama igual, se traduce igual. Pero si alguien escribe dos
   traducciones distintas para el mismo nombre, gana la primera en silencio — y eso sí es un
   error que hay que ver. */
const choques = [];
const unico = (pares, donde) => {
  const m = new Map();
  for (const [k, v] of pares) {
    if (m.has(k) && m.get(k) !== v) choques.push(donde + ': ' + JSON.stringify(k));
    if (!m.has(k)) m.set(k, v);
  }
  return m;
};

const names = unico(platos.map((p) => [p.en, p.es]), 'names');
const descs = unico([['', '']].concat(
  platos.filter((p) => p.descEn).map((p) => [p.descEn, p.descEs])), 'descriptions');
const tabs = unico(CARTA.map((t) => t.pestana), 'tabs');
const groups = unico(cats.filter((c) => c.sub).map((c) => [c.sub, c.subEs]), 'groups');

if (choques.length) {
  throw new Error('el mismo texto con dos traducciones distintas en carta.mjs:' + NL
    + '  ' + [...new Set(choques)].join(NL + '  '));
}

/* ---- menu.md ---- */
const md = ['# Carta — generada por importar.mjs desde carta.mjs', '',
  '> NO SE EDITA A MANO: cada `node importar.mjs` la reescribe entera.',
  '> Los platos se cambian en carta.mjs.', '',
  '## Data format', '',
  'Each category contains a Markdown table with: `id`, `name`, `description`, `price`.', ''];
let n = 0;
for (const c of cats) {
  md.push('## ' + c.cat, '', '| id | name | description | price |', '|---|---|---|---:|');
  for (const p of platos.filter((x) => x.cat === c.cat)) {
    n += 1;
    md.push('| ' + String(n).padStart(2, '0') + ' | ' + p.en + ' | ' + p.descEn + ' | ' + p.precio + ' |');
  }
  md.push('');
}
writeFileSync(aqui('menu.md'), md.join(NL) + NL);

/* ---- i18n.es.mjs: se reescriben cinco secciones y se respeta ui ---- */
const ruta = aqui('i18n.es.mjs');
const viejo = existsSync(ruta) ? readFileSync(ruta, 'utf8').replace(/\r\n/g, NL) : '';
const mUi = viejo.match(/(?:\/\*(?:[^*]|\*(?!\/))*\*\/\s*\n)?export const ui = \{[\s\S]*?\n\};/);
if (!mUi) throw new Error('no encuentro la sección ui en i18n.es.mjs: se conserva, no se genera');

/* La línea de intro de una pestaña vive en TAB_INTRO, pero el build la traduce por la
   sección ui, igual que cualquier otro texto de interfaz. Así que la escribe el importador
   —sale de carta.mjs— y el resto de ui se queda como estaba, que es a mano. Sin esto el
   build reventaba con «missing translations» señalando una cadena que nadie había escrito
   a mano en ningún sitio. */
const uiConIntros = (bloque) => {
  let out = bloque;
  for (const t of CARTA.filter((x) => x.intro)) {
    const linea = "  " + js(t.intro[0]) + ": " + js(t.intro[1]) + ",";
    const yaEsta = new RegExp("^  " + js(t.intro[0]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      + ":.*$", "m");
    out = yaEsta.test(out) ? out.replace(yaEsta, linea)
                           : out.replace("export const ui = {", "export const ui = {" + NL + linea);
  }
  return out;
};

const seccion = (nombre, mapa, nota) => [
  '/* ' + nota + ' */',
  'export const ' + nombre + ' = {',
  ...[...mapa].map(([k, v]) => '  ' + js(k) + ': ' + js(v) + ','),
  '};',
].join(NL);

writeFileSync(ruta, [
  '/* Catálogo en español. Lo escribe importar.mjs desde carta.mjs: no editar a mano, se',
  '   sobrescribe. La sección ui de abajo sí es a mano — es interfaz, no carta. */',
  '',
  seccion('names', names, 'Los nombres de los platos.'),
  '',
  seccion('descriptions', descs, 'Las descripciones. La cadena vacía es para los platos sin ella.'),
  '',
  seccion('notes', new Map(), 'Notas de categoría. Hoy no hay ninguna.'),
  '',
  seccion('tabs', tabs, 'Las pestañas.'),
  '',
  seccion('groups', groups, 'Los subtítulos dentro de una pestaña.'),
  '',
  uiConIntros(mUi[0]),
  '',
].join(NL));

/* ---- ¿cuadra con cliente.mjs? ---- */
const bloque = (nombre, lineas) =>
  ['export const ' + nombre + (nombre === 'GROUPS' ? ' = [' : ' = {'), ...lineas,
    nombre === 'GROUPS' ? '];' : '};'].join(NL);

const grupos = [];
for (const t of CARTA) {
  grupos.push('  [' + js(t.pestana[0]) + ', [');
  for (const c of cats.filter((x) => x.tab === t.pestana[0])) {
    grupos.push('    [' + js(c.cat) + ', ' + (c.sub ? js(c.sub) : 'null') + '],');
  }
  grupos.push('  ]],');
}
const esperado = [
  bloque('TAB_INTRO', CARTA.filter((t) => t.intro).map((t) => '  ' + js(t.pestana[0]) + ': ' + js(t.intro[0]) + ',')),
  bloque('GROUPS', grupos),
  bloque('TAB_ICON', CARTA.map((t) => '  ' + js(t.pestana[0]) + ': ' + js(t.icono) + ',')),
  bloque('GROUP_ICON_BY_CAT', cats.filter((c) => c.sub).map((c) => '  ' + js(c.cat) + ': ' + js(c.iconoSub) + ',')),
].join(NL + NL);

const cli = readFileSync(aqui('cliente.mjs'), 'utf8').replace(/\r\n/g, NL);
const falta = esperado.split(NL).filter((l) => l.trim() && !cli.includes(l.trim()));

console.log('menu.md    ' + n + ' platos en ' + cats.length + ' categorías');
console.log('i18n.es    names ' + names.size + ' · descriptions ' + descs.size
  + ' · tabs ' + tabs.size + ' · groups ' + groups.size + ' · ui intacta');
if (falta.length) {
  console.log(NL + 'OJO: cliente.mjs no cuadra con carta.mjs. Pega esto en cliente.mjs:' + NL);
  console.log(esperado);
} else {
  console.log('cliente.mjs cuadra con carta.mjs');
}
