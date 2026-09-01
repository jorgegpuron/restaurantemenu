/* Convierte carta.json en los ficheros que lee el build.
 *
 *   node importar.mjs
 *
 * carta.json es LA fuente de la carta desde la migración a identificadores estables, y desde
 * la fase 5 también de su ESTRUCTURA: pestañas, categorías y sus metadatos de comportamiento
 * (especial, selector, aviso, escala, copiaDe) viven ahí, no en cliente.mjs. Cada plato lleva
 * su `dishId` y cada categoría su `categoryId`, permanentes y opacos: renombrar, traducir,
 * cambiar el precio o mover un plato no los toca. El número visible (`numero`) es contenido,
 * no identidad. Si existe un carta.mjs, es el respaldo congelado de la conversión de un
 * cliente antiguo y no lo lee nadie.
 *
 * TEXTOS POR CÓDIGO DE IDIOMA, nunca por posición. Un texto traducible es un objeto
 * { en: '...', es: '...', de: '...' } con exactamente el idioma base más los extras
 * declarados en CLIENTE.idiomas — reordenar los idiomas del selector no puede reasignar
 * traducciones, porque cada una viaja atada a su código. Una cadena suelta significa
 * INVARIABLE: el mismo texto en todos los idiomas (los nombres de nivel Madras, Vindaloo...).
 *
 * Escribe menu.md (en el idioma base) y reescribe las cinco secciones de catálogo de CADA
 * diccionario de idioma extra — names, descriptions, notes, tabs y groups. La sección `ui`
 * NO se toca en ninguno: son cadenas de interfaz que se mantienen a mano y que además llevan
 * el título y el rótulo del restaurante. La única excepción es un extra 'en' sin diccionario
 * previo: el inglés es el catálogo nativo del motor, así que su ui se siembra vacía.
 *
 * Por qué existe: sin él, dar de alta un restaurante era escribir a mano 500 claves de
 * diccionario y una tabla markdown de 60 filas, y equivocarse en una sola rompía el build
 * con un error que no señalaba la línea.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { verificarMotor, cliente } from './entorno.mjs';

/* El motor tiene que ser exactamente el que dice motor.lock, tambien aqui: el importador
   escribe menu.md y los diccionarios, y un importador manipulado escribiria la carta. */
verificarMotor();

/* ---- carta.json: la fuente, y su validación ----
   Se valida AQUÍ y no en gen.mjs porque éste es el único sitio que la lee: un fichero que
   escribe un programa —el día que el panel edite la carta, lo hará— no puede darse por bueno
   sin mirarlo. Cada error dice la ruta exacta del dato que falla. */
const RUTA_CARTA = cliente('carta.json');
if (!existsSync(RUTA_CARTA)) {
  console.error('No hay carta.json en esta carpeta: es la única fuente de la carta.');
  console.error('carta.mjs, si existe, es el respaldo congelado de la conversión y no vale como fuente.');
  process.exit(1);
}
let FUENTE;
try {
  FUENTE = JSON.parse(readFileSync(RUTA_CARTA, 'utf8'));
} catch (e) {
  console.error('carta.json no es JSON válido: ' + e.message);
  process.exit(1);
}
if (FUENTE.esquema === 'carta/1') {
  /* La época anterior no se interpreta en silencio: la migración es EXPLÍCITA. */
  console.error('carta.json es del esquema carta/1 y este motor entiende carta/2.');
  console.error('La migración es explícita y revisable: node motor/migrar.mjs --desde <origen-del-motor>');
  console.error('(convierte los textos a objetos por código de idioma; los metadatos');
  console.error('estructurales, si el restaurante los usa, se añaden a mano después).');
  process.exit(1);
}
if (FUENTE.esquema !== 'carta/2') {
  console.error('carta.json: esquema desconocido ' + JSON.stringify(FUENTE.esquema)
    + ' — este importador entiende "carta/2". No se adivina: revisa el fichero.');
  process.exit(1);
}
/* La marca de las plantillas de alta: una carta de ejemplo no puede llegar a publicarse. */
if (FUENTE.noPublicable) {
  console.error('carta.json lleva la marca noPublicable: es una carta de ejemplo, no la del');
  console.error('restaurante. Escribe la carta de verdad y quita la marca.');
  process.exit(1);
}
if (!Array.isArray(FUENTE.pestanas) || !FUENTE.pestanas.length) {
  console.error('carta.json: falta la lista `pestanas` o está vacía.');
  process.exit(1);
}
const CARTA = FUENTE.pestanas;

/* Los identificadores permanentes. Formato y unicidad se comprueban en cada pasada: un ID
   repetido mezclaría fotos, precios y agotados de dos platos, que es exactamente la clase de
   fallo silencioso que los IDs vienen a impedir. */
{
  const vistos = new Map();
  const mal = [];
  CARTA.forEach((t, ti) => t.grupos?.forEach((g, gi) => {
    const donde = 'pestanas[' + ti + '].grupos[' + gi + ']';
    if (!/^c_[0-9a-f]{10,}$/.test(g.categoryId || '')) mal.push(donde + ': categoryId ' + JSON.stringify(g.categoryId));
    else if (vistos.has(g.categoryId)) mal.push(donde + ': categoryId repetido con ' + vistos.get(g.categoryId));
    else vistos.set(g.categoryId, donde);
    g.platos?.forEach((p, pi) => {
      const dp = donde + '.platos[' + pi + ']';
      if (!/^d_[0-9a-f]{10,}$/.test(p.dishId || '')) mal.push(dp + ': dishId ' + JSON.stringify(p.dishId));
      else if (vistos.has(p.dishId)) mal.push(dp + ': dishId repetido con ' + vistos.get(p.dishId));
      else vistos.set(p.dishId, dp);
    });
  }));
  if (mal.length) {
    console.error('carta.json: identificadores inválidos o repetidos:');
    mal.slice(0, 12).forEach((m) => console.error('  ' + m));
    process.exit(1);
  }
}

/* Los idiomas del cliente: el base (el texto del documento) y los extras (los del selector,
   cada uno con su diccionario salvo el inglés, que es el catálogo nativo del motor). */
const { CLIENTE } = await import('../cliente.mjs');
const IDIOMAS_DEF = CLIENTE && CLIENTE.idiomas;
if (!IDIOMAS_DEF || !IDIOMAS_DEF.base || !IDIOMAS_DEF.base.code || !Array.isArray(IDIOMAS_DEF.extras)) {
  console.error('cliente.mjs: falta CLIENTE.idiomas con { base: {code,...}, extras: [...] }.');
  console.error('Es el contrato de idiomas de la fase 5; el formato viejo IDIOMAS_CLIENTE ya no vale.');
  process.exit(1);
}
const BASE = IDIOMAS_DEF.base;
const EXTRAS = IDIOMAS_DEF.extras;

const NL = String.fromCharCode(10);
/* Todo lo que se lee y escribe aqui es DEL CLIENTE: menu.md y los diccionarios. */
const aqui = (f) => cliente(f);

/* Comillas simples y escapado, como el resto del proyecto. */
const js = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

/* Los códigos, con el base delante: es el índice 0 de cada fila interna, igual que el
   inglés lo era antes. El orden interno sale de ESTA lista, nunca del orden de las claves
   del JSON ni del orden del selector. */
const CODIGOS = [BASE.code].concat(EXTRAS.map((l) => l.code));

/* Una cadena traducible de carta/2: un objeto por código de idioma, o una cadena suelta que
   vale INVARIABLE para todos. Falta o sobra un código → se dice cuál, en vez de escribir
   `undefined` en un diccionario o de reasignar traducciones por posición. */
const texto = (v, donde) => {
  if (typeof v === 'string') return CODIGOS.map(() => v);
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error(donde + ': un texto es un objeto por código de idioma {'
      + CODIGOS.join(', ') + '} o una cadena invariable — hay ' + JSON.stringify(v));
  }
  const faltan = CODIGOS.filter((c) => typeof v[c] !== 'string');
  const sobran = Object.keys(v).filter((c) => !CODIGOS.includes(c));
  if (faltan.length || sobran.length) {
    throw new Error(donde + ': códigos de idioma '
      + (faltan.length ? 'que faltan: ' + faltan.join(', ') : '')
      + (faltan.length && sobran.length ? ' · ' : '')
      + (sobran.length ? 'que sobran: ' + sobran.join(', ') : '')
      + ' en ' + JSON.stringify(v));
  }
  return CODIGOS.map((c) => v[c]);
};

/* ---- recorrer la carta una vez y sacar todo lo que hace falta ---- */
const MEDALLAS = ['oro', 'bronce'];

const platos = [];        // { cat, nombre[], desc[], precio, id, dishId }
/* Los alergenos que el motor sabe pintar. Un nombre mal escrito no se pinta y no avisa, asi que
   se para aqui: es el unico sitio donde alguien lo esta mirando. */
const CONOCIDOS = ['trigo', 'leche', 'huevo', 'soja', 'mostaza', 'apio', 'sulfitos',
                   'sesamo', 'frutos_secos', 'pescado', 'crustaceos'];

const cats = [];          // { tab, icono, cat, sub[], iconoSub, nota[] }
for (const t of CARTA) {
  const pestana = texto(t.pestana, 'pestaña');
  for (const g of t.grupos) {
    /* La categoría es una clave técnica en el idioma base: agrupa los platos en menu.md y no
       se enseña nunca. La identidad de máquina es categoryId; esto es solo su nombre. */
    const catEn = Array.isArray(g.categoria) ? g.categoria[0] : g.categoria;
    const grupoCats = {
      tab: pestana[0], icono: t.icono, cat: catEn,
      sub: g.subtitulo ? texto(g.subtitulo, 'subtítulo de ' + catEn) : null,
      iconoSub: g.icono || null,
      nota: g.nota ? texto(g.nota, 'nota de ' + catEn) : null,
      /* Las filas de ESTE grupo, no «las que se llamen igual»: dos categorías homónimas
         son grupos distintos con categoryId distinto, y cada sección de menu.md lleva
         exactamente los platos del suyo. */
      filas: [],
    };
    cats.push(grupoCats);
    /* La proyección humana de un plato: lo único con lo que menu.md puede reconciliar. Dos
       platos con dishId distinto y la misma proyección serían indistinguibles al leerlos, y
       un intercambio les movería la identidad en silencio. Se prohíbe ANTES de escribir. */
    const proyecciones = new Map();
    for (const p of g.platos) {
      const nombre = texto(p.nombre, 'plato en ' + catEn);
      const desc = texto(p.descripcion, 'descripción de ' + nombre[0] + ' en ' + catEn);
      const medalla = p.medalla === undefined ? '' : String(p.medalla);
      if (medalla && !MEDALLAS.includes(medalla)) {
        throw new Error(catEn + ' / ' + nombre[0] + ': la medalla ' + JSON.stringify(medalla)
          + ' no existe. Las validas son: ' + MEDALLAS.join(', '));
      }
      const proy = [p.numero, nombre[0], desc[0], p.precio].join(' | ');
      if (proyecciones.has(proy)) {
        throw new Error('platos gemelos en ' + JSON.stringify(catEn) + ': '
          + proyecciones.get(proy) + ' y ' + p.dishId + ' comparten numero, nombre,'
          + ' descripcion y precio (' + JSON.stringify(proy) + ').' + NL
          + '  menu.md no podria distinguirlos: diferencia el numero o la descripcion.');
      }
      proyecciones.set(proy, p.dishId);
      const fila = { cat: catEn, nombre, desc, precio: p.precio,
                     id: p.numero, dishId: p.dishId,
                     alergenos: Array.isArray(p.alergenos) ? p.alergenos : [],
                     premio: p.premio === undefined ? '' : String(p.premio), medalla };
      platos.push(fila);
      grupoCats.filas.push(fila);
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
    /* Se guarda la fila ENTERA, con el idioma base en la posición 0, para que el índice de
       un extra sea el mismo aquí que en CODIGOS: 0 el base, 1 el primer extra, 2 el segundo.
       Guardar sólo las traducciones desplazaba el índice en uno, y el español acababa
       escribiéndose con el texto alemán sin que nada reventara. */
    const a = m.get(k);
    if (a && a.slice(1).join(' | ') !== fila.slice(1).join(' | ')) {
      choques.push(donde + ': ' + JSON.stringify(k));
    }
    if (!a) m.set(k, fila);
  }
  return m;
};

const names = unico(platos.map((p) => p.nombre), 'names');
const descs = unico([new Array(CODIGOS.length).fill('')].concat(
  platos.filter((p) => p.desc[0]).map((p) => p.desc)), 'descriptions');
const notes = unico(cats.filter((c) => c.nota).map((c) => c.nota), 'notes');
const tabs = unico(CARTA.map((t) => texto(t.pestana, 'pestaña')), 'tabs');
const groups = unico(cats.filter((c) => c.sub).map((c) => c.sub), 'groups');

if (choques.length) {
  throw new Error('el mismo texto con dos traducciones distintas en carta.json:' + NL
    + '  ' + [...new Set(choques)].join(NL + '  '));
}

/* ---- menu.md ---- */
/* ¿Usa alguien las columnas de mas? De eso depende que menu.md salga con cuatro columnas o con
   siete. Una carta que no declara nada sale exactamente igual que antes de que existieran. */
const hayExtras = platos.some((p) => p.alergenos.length || p.premio || p.medalla);

const raros = [...new Set(platos.flatMap((p) => p.alergenos)
  .filter((a) => !CONOCIDOS.includes(a)))];
if (raros.length) {
  throw new Error('alergenos que no existen en carta.json: ' + raros.join(', ') + NL
    + '  los validos son: ' + CONOCIDOS.join(', '));
}

const md = ['# Carta — generada por importar.mjs desde carta.json', '',
  '> NO SE EDITA A MANO: cada `node importar.mjs` la reescribe entera.',
  '> Los platos se cambian en carta.json.', '',
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
  for (const p of c.filas) {
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

/* La línea de intro de una pestaña vive en carta.json, pero el build la traduce por la
   sección ui, igual que cualquier otro texto de interfaz. Así que la escribe el importador
   —sale de carta.json— y el resto de ui se queda como estaba, que es a mano. Sin esto el
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
EXTRAS.forEach((idioma, i) => {
  const col = i + 1;                       // 0 es el idioma base, que es la clave
  const fichero = 'i18n.' + idioma.code + '.mjs';
  const ruta = aqui(fichero);
  let viejo = existsSync(ruta) ? readFileSync(ruta, 'utf8').replace(/\r\n/g, NL) : '';
  let mUi = viejo.match(/(?:\/\*(?:[^*]|\*(?!\/))*\*\/\s*\n)?export const ui = \{[\s\S]*?\n\};/);
  if (!mUi && idioma.code === 'en') {
    /* El inglés es el catálogo nativo del motor: puede ir de extra SIN traducir la interfaz.
       Se siembra una ui vacía y el build cae a los literales del propio motor. */
    viejo = '';
    mUi = ['/* La interfaz en inglés es el catálogo nativo del motor: esta sección puede'
      + NL + '   quedarse vacía. */' + NL + 'export const ui = {' + NL + '};'];
  }
  if (!mUi) {
    throw new Error('no encuentro la sección ui en ' + fichero + ': se conserva, no se genera.'
      + NL + '  Es la interfaz de la carta y se mantiene a mano; el importador sólo escribe'
      + NL + '  el catálogo. Si el fichero no existe todavía, cópialo de otro idioma y'
      + NL + '  traduce su ui antes de volver a pasar por aquí.');
  }

  writeFileSync(ruta, [
    '/* Catálogo en ' + idioma.name + '. Lo escribe importar.mjs desde carta.json: no editar a mano,',
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

console.log('menu.md    ' + n + ' platos en ' + cats.length + ' categorías'
  + (sinNumero ? ' · ' + sinNumero + ' sin número, como en la carta impresa' : ''));
console.log('idiomas    ' + escritos.join(' · ') + ' (ui intacta en cada uno)');
console.log('catálogo   names ' + names.size + ' · descriptions ' + descs.size
  + ' · notes ' + notes.size + ' · tabs ' + tabs.size + ' · groups ' + groups.size);
