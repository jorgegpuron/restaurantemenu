import { readFileSync, writeFileSync, readdirSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { buildGame } from './juego.mjs';
import {
  cssTemas, temasParaPanel, verificar as verificarTemas, derivar, TEMAS, TEMA_POR_DEFECTO,
} from './temas.mjs';
/* Todo lo que es de ESTE restaurante. gen.mjs no lleva dentro ni un nombre ni una
   categoria: si hay que abrirlo para dar de alta a un cliente, algo esta mal puesto. */
import {
  CLIENTE, CLAVE, IDIOMAS_CLIENTE,
  TAB_INTRO, GROUPS, TAB_ICON, GROUP_ICON_BY_CAT, CATEGORIAS_DUPLICADAS,
} from './cliente.mjs';

/* Antes de escribir nada: si un tema deja un texto por debajo de su umbral WCAG, el build
   revienta aquí y no llega a producción. */
verificarTemas();

/* Las dos tipografías, en un solo sitio: la carta y el juego cargan exactamente las
   mismas, así que el navegador ya las tiene en caché al pasar de una a otro.
   Se pide el eje de peso continuo (400..800) y no tres instancias sueltas: las pestañas
   animan de 500 a 800, y con pesos separados por comas ese recorrido no existe. Una fuente
   variable pesa además menos que las tres estáticas. */
export const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&amp;family=Source+Serif+4:opsz,wght@8..60,400..600&amp;display=swap" rel="stylesheet">`;

/* Tokens compartidos: la carta y el juego beben del mismo sitio.
   Los colores ya no están escritos aquí: los escribe temas.mjs, un bloque por juego de
   marca, y el panel elige cuál manda. Lo que queda en este archivo es lo que no cambia de
   un restaurante a otro — tipografías, espacios, radios y movimiento. */
export const TOKENS = cssTemas() + `:root{
  /* Sans display over serif body — the inverse of the usual pairing, which is what gives
     Jade its voice: the name reads as signage, the dish copy as a printed page. Both faces
     are variable with an optical-size axis, so they reshape with the size instead of being
     scaled. Weights top out at 800, not 900. */
  --title-font:"Bricolage Grotesque",system-ui,sans-serif;
  --body-font:"Source Serif 4",Georgia,serif;

  /* Spacing — Fibonacci, the client's own scale. Every gap on the page resolves to one
     of these; no loose 15/20/30/60 values. */
  --s1:8px;
  --s2:13px;
  --s3:21px;
  --s4:34px;
  --s5:55px;
  --s6:89px;
  --s7:144px;

  /* Radius — three sizes, scaled to the surface each one wraps */
  --r-pill:999px;
  --r-sheet:21px;
  --r-card:34px;

  /* Motion — one vocabulary for the whole page.
     The built-in CSS easings are too weak to read as intentional. */
  --ease-out:cubic-bezier(0.23,1,0.32,1);       /* entrances, exits, indicators */
  --ease-drawer:cubic-bezier(0.32,0.72,0,1);    /* the sheet, iOS-like */
  --t-press:140ms;                              /* press feedback */
  --t-fast:180ms;                               /* colour, fades, tab content */
  --t-sheet-in:340ms;
  --t-sheet-out:240ms;                          /* exit faster than enter */

  /* El multiplicador del tamaño de texto. 1 es lo de siempre y es el valor de partida: quien
     no toque nada ve la carta exactamente igual que antes. Lo suben los tres botones del hero
     y sólo afecta al texto de los platos — la barra de categorías, los chips y el cajón se
     quedan con sus medidas, que son áreas de dedo y no texto que leer. */
  --escala:1;

  /* El hueco que reserva la línea de número y etiquetas crece con ellas, o el nombre del plato
     se le monta encima en cuanto se sube el tamaño. */
  --tags-line:calc(22px * var(--escala));   /* the number/flag line on phones — the price offsets by it */
}
`;

/* ---- banderas ----
 * Dibujadas, no emoji. Windows no incluye NINGUNA bandera en su fuente de emoji: donde iOS y
 * Android pintan la bandera, Windows enseña las dos letras del código de país. No es un fallo
 * del navegador ni algo que se arregle con una fuente distinta; es una decisión de Microsoft
 * desde hace años. Con un SVG se ve igual en los cinco sistemas y pesa 200 bytes.
 *
 * Estos colores son la única excepción a la regla de no meter colores fuera del tema: una
 * bandera con los colores de la marca deja de ser una bandera. Van escritos aquí y en ningún
 * otro sitio.
 *
 * Las banderas son además un atajo discutible —un idioma no es un país— pero en un selector de
 * tres, con el nombre al lado escrito en su propio idioma, el nombre manda y la bandera sólo
 * ayuda a encontrarlo de un vistazo. Inglés lleva la del Reino Unido: en una terraza de
 * Canarias, el turista que lee inglés es británico casi siempre.
 */
const BANDERA_GB = '<svg class="bandera" viewBox="0 0 24 16" aria-hidden="true">'
  + '<rect width="24" height="16" fill="#012169"/>'
  + '<path d="M0 0l24 16M24 0L0 16" stroke="#fff" stroke-width="3.2"/>'
  + '<path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" stroke-width="1.9"/>'
  + '<path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="5.3"/>'
  + '<path d="M12 0v16M0 8h24" stroke="#C8102E" stroke-width="3.2"/></svg>';

const BANDERA_ES = '<svg class="bandera" viewBox="0 0 24 16" aria-hidden="true">'
  + '<rect width="24" height="16" fill="#AA151B"/>'
  + '<rect y="4" width="24" height="8" fill="#F1BF00"/></svg>';

const BANDERA_DE = '<svg class="bandera" viewBox="0 0 24 16" aria-hidden="true">'
  + '<rect width="24" height="16" fill="#000"/>'
  + '<rect y="5.34" width="24" height="5.33" fill="#DD0000"/>'
  + '<rect y="10.67" width="24" height="5.33" fill="#FFCE00"/></svg>';


/* ---- las redes del restaurante ----
 * Hasta cinco iconos debajo de la nota. Salen del panel, no del build: cada negocio tiene las
 * suyas y ninguna es obligatoria — el que solo tenga WhatsApp vera un icono, no cuatro huecos.
 *
 * El orden esta fijado aqui y no es alfabetico: WhatsApp primero porque es el unico con el que
 * se hace algo ahora mismo —escribir— y los demas son sitios a los que se va luego.
 *
 * Del WhatsApp se guarda solo el numero. La direccion la monta la carta: wa.me es la forma
 * oficial y la unica que abre la aplicacion si esta instalada y la web si no, sin pedir
 * permisos ni depender de que el telefono reconozca un esquema raro.
 */
const REDES = [
  { key: 'whatsapp', label: 'WhatsApp', icon: '<path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9"/><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"/>' },
  { key: 'instagram', label: 'Instagram', icon: '<path d="M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z"/><path d="M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0 -6"/><path d="M16.5 7.5l0 .01"/>' },
  { key: 'facebook', label: 'Facebook', icon: '<path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"/>' },
  { key: 'tripadvisor', label: 'Tripadvisor', icon: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M8.5 12.5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M15.5 12.5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M11 8.5l1 1.2l1 -1.2"/>' },
];

/* ---- la marca de esta compilacion ----
 * Un numero que cambia en cada build y que viaja en dos sitios: dentro del HTML y en un
 * version.json de treinta bytes. El runtime los compara y, si no coinciden, se recarga.
 *
 * Hace falta porque la cache de un movil que YA tiene la carta no se arregla con cabeceras:
 * las cabeceras nuevas solo mandan sobre la proxima descarga, y ese movil no va a hacer
 * ninguna precisamente porque cree que la suya vale. Sin esto, la unica salida era pedirle al
 * cliente que recargara a mano, y a un cliente sentado en una mesa no se le pide eso.
 */
const BUILD = String(Date.now());

/* English is the document text; every other language rides along in data-<code>. */
const LANGS = IDIOMAS_CLIENTE;

/* El ingles es el texto del documento; los demas idiomas los elige el cliente en
   cliente.mjs. Las banderas son del motor: el restaurante dice que idiomas quiere, no
   como se dibuja cada una. */
const BANDERAS = { en: BANDERA_GB, es: BANDERA_ES, de: BANDERA_DE };
const IDIOMAS = [{ code: 'en', name: 'English', flag: BANDERAS.en }]
  .concat(LANGS.map((l) => ({ code: l.code, name: l.name, flag: BANDERAS[l.code] })));

/* ------------------------------------------------------------------ *
 * 1. Parse menu.md
 * ------------------------------------------------------------------ */

const md = readFileSync(new URL('./menu.md', import.meta.url), 'utf8');

/** @type {Record<string, {note: string, items: {id:string,name:string,desc:string,price:string}[]}>} */
const categories = {};
let current = null;

for (const raw of md.split(/\r?\n/)) {
  const line = raw.trim();

  const heading = line.match(/^##\s+(.+)$/);
  if (heading) {
    current = heading[1].trim();
    categories[current] = { note: '', items: [] };
    continue;
  }
  if (!current) continue;

  if (line.startsWith('>')) {
    const note = line.replace(/^>\s?/, '').trim();
    categories[current].note = categories[current].note ? categories[current].note + ' ' + note : note;
    continue;
  }

  if (!line.startsWith('|')) continue;
  if (/^\|\s*-+/.test(line) || /^\|\s*id\s*\|/i.test(line)) continue;

  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length < 4) continue;

  const [id, name, desc, price] = cells;
  categories[current].items.push({ id, name, desc, price });
}


// fail loudly instead of silently emitting an empty tab
const missing = GROUPS.flatMap(([, subs]) => subs.map(([c]) => c)).filter((c) => !categories[c]);
if (missing.length) throw new Error('categories not found in menu.md: ' + missing.join(' | '));


for (const [copia, original] of Object.entries(CATEGORIAS_DUPLICADAS)) {
  const a = categories[original];
  const b = categories[copia];
  if (!a || !b) throw new Error('duplicado declarado que no existe: ' + copia + ' / ' + original);
  const huella = (c) => c.items.map((it) => [it.name, it.desc, it.price].join('|')).join(String.fromCharCode(10));
  if (huella(a) !== huella(b)) {
    throw new Error(
      'la categoría "' + copia + '" ya no es una copia exacta de "' + original + '": '
      + 'revisa menu.md, porque una de las dos ha cambiado y la carta sólo enseña una.',
    );
  }
}

const used = new Set(GROUPS.flatMap(([, subs]) => subs.map(([c]) => c)));
const orphans = Object.keys(categories).filter(
  (c) => !used.has(c) && !CATEGORIAS_DUPLICADAS[c] && categories[c].items.length,
);
if (orphans.length) throw new Error('categories with items not mapped to a tab: ' + orphans.join(' | '));

/* ------------------------------------------------------------------ *
 * 3. Render
 * ------------------------------------------------------------------ */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const money = (price) =>
  /^included$/i.test(price) ? 'Included' : '€' + price;

/* ---- bilingual output -------------------------------------------------
 * English is the document text; every other language rides along in data-<code> and the
 * switch swaps textContent. One DOM, so changing language keeps the open category and the
 * scroll position, and the page still reads in English with JS disabled. A missing
 * translation throws at build time rather than leaking an English word into a menu. */
const missingTr = [];
const missingIcons = [];
function tr(en, group, lang) {
  const v = lang.dicts[group][en];
  if (v === undefined) {
    missingTr.push(lang.code + ' / ' + group + ': ' + JSON.stringify(en));
    return en;
  }
  return v;
}
// every language's data-<code> attribute for one string
const attrs = (en, group, suffix = '') =>
  LANGS.map((l) => ` data-${l.code}${suffix}="${esc(tr(en, group, l))}"`).join('');
// a translatable text node
const T = (en, group, cls) =>
  `<span class="i18n${cls ? ' ' + cls : ''}"${attrs(en, group)}>${esc(en)}</span>`;
// a translatable attribute
const TL = (en) => ` aria-label="${esc(en)}"${attrs(en, 'ui', '-label')}`;

/* ---- the number slot ----
 * Sauce and ingredient lists are choosers, not numbered dishes, so where the source has
 * no dish number the slot carries a mark instead: a bowl for the base you pick, a drop
 * for what goes on it. Decorative — the group heading already says which list you are in,
 * so screen readers skip them rather than hearing "sauce" nineteen times. */
const SAUCE_CATS = new Set(['Curries - Sauces', 'South Indian Curries - Sauces']);
const INGREDIENT_CATS = new Set([
  'Curries - Ingredients',
  'South Indian Curries - Ingredients',
  'Gluten Free - Curries',
  'Vegan - Curries',
]);
/* ---- alérgenos ----
 * Ocho de los catorce, los que de verdad se preguntan en una cocina del sur de la India: el
 * trigo de los panes, los lácteos del paneer y el ghee, el anacardo de los korma, el pescado
 * de los currys, el huevo de algunos panes y postres, el sésamo del aceite de gingelly, la
 * mostaza del tempering —que está en casi todo— y los sulfitos del vino.
 *
 * No son una declaración de lo que lleva cada plato: eso lo dice el personal, y el texto de
 * al lado lo deja claro. Aquí sólo dicen de qué va el aviso, que es lo que hace que alguien
 * lo lea. Faltan crustáceos a propósito — ver más abajo.
 *
 * Seis salen de Tabler (MIT). Dos no existen en ningún set decente y están dibujados en la
 * misma gramática: rejilla de 24, trazo 1.75, extremos redondeados, sin relleno. Los dos
 * están mirados a 84px y a 21px antes de entrar: un icono que no se lee a su tamaño real es
 * ruido, y el primero que puse para frutos secos era literalmente una tuerca de tornillo. */
const ALERGENO = {
  wheat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.014 21.514v-3.75" /> <path d="M5.93 9.504l-.43 1.604c-.712 2.659 .866 5.391 3.524 6.105c.997 .268 1.993 .535 2.99 .801v-3.44c-.164 -2.105 -1.637 -3.879 -3.676 -4.426l-2.408 -.644" /> <path d="M13.744 11.164c.454 -.454 .815 -.994 1.061 -1.587c.246 -.594 .372 -1.23 .372 -1.873c0 -.643 -.126 -1.279 -.372 -1.872c-.246 -.594 -.606 -1.133 -1.061 -1.588l-1.73 -1.73l-1.73 1.73c-.454 .454 -.815 .994 -1.06 1.588c-.246 .594 -.372 1.23 -.373 1.872c0 .643 .127 1.279 .373 1.873c.246 .594 .606 1.133 1.06 1.587" /> <path d="M18.099 9.504l.43 1.604c.712 2.659 -.866 5.391 -3.525 6.105c-.997 .268 -1.994 .535 -2.99 .801v-3.44c.164 -2.105 1.637 -3.879 3.677 -4.426l2.408 -.644" /></svg>`,
  milk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h8v-2a1 1 0 0 0 -1 -1h-6a1 1 0 0 0 -1 1v2" /> <path d="M16 6l1.094 1.759a6 6 0 0 1 .906 3.17v8.071a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8.071a6 6 0 0 1 .906 -3.17l1.094 -1.759" /> <path d="M10 16a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /> <path d="M10 10h4" /></svg>`,
  nut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4c-4 0 -7 3 -7 7c0 4 3 8 7 9c4 -1 7 -5 7 -9c0 -4 -3 -7 -7 -7z"/><path d="M12 4v16"/><path d="M9 8c1 1.5 1 3.5 0 5"/><path d="M15 8c-1 1.5 -1 3.5 0 5"/></svg>`,
  fish: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571" /> <path d="M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504" /> <path d="M18 11v.01" /> <path d="M11.5 10.5c-.667 1 -.667 2 0 3" /></svg>`,
  egg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14.083c0 4.154 -2.966 6.74 -7 6.917c-4.2 0 -7 -2.763 -7 -6.917c0 -5.538 3.5 -11.09 7 -11.083c3.5 .007 7 5.545 7 11.083" /></svg>`,
  sesame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M8.5 4.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M8.5 14.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M3.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M13.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M18.5 4.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M13.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M18.5 14.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>`,
  mustard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3h4v3h-4z"/><path d="M9 6h6l1.5 3v10a2 2 0 0 1 -2 2h-5a2 2 0 0 1 -2 -2v-10z"/><path d="M9 12h6"/></svg>`,
  sulphites: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21l8 0" /> <path d="M12 15l0 6" /> <path d="M17 3l1 7c0 3.012 -2.686 5 -6 5s-6 -1.988 -6 -5l1 -7h10" /> <path d="M6 10a5 5 0 0 1 6 0a5 5 0 0 0 6 0" /></svg>`,
};

const ICON = {
  sauce: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546"/></svg>',
  ingredient: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/></svg>',
};
const iconFor = (catName) =>
  SAUCE_CATS.has(catName) ? 'sauce' : INGREDIENT_CATS.has(catName) ? 'ingredient' : null;

/* ---- highlight tags ----
 * Eight marketing flags, keyed by category *and* dish name because Katori Chaat and Chana
 * Masala each appear three times (main, gluten free, vegan) and only the main-menu row is
 * meant to carry the flag. The build throws on a key that matches no row, so a renamed dish
 * cannot silently drop its badge. */
/* ---- highlights, offers and prices ----
 * Nada de esto se decide ya en el build: lo decide el panel y lo pinta el runtime leyendo
 * estado.json. Lo que sí sale del build es el vocabulario cerrado de etiquetas — el panel
 * elige entre estas, no escribe texto libre, para que estén traducidas siempre. */
const HIGHLIGHTS = ['Bestseller', 'Most loved', 'Signature', 'Popular', 'Must try', 'Veggie favourite'];

/* Cadenas que el runtime necesita en los tres idiomas. T() sirve para el HTML, pero un texto
   que se compone en JS (un porcentaje, una hora) necesita el diccionario en crudo. */
const RUNTIME_STRINGS = HIGHLIGHTS.concat([
  '{pct}% off',
  'Today we make it easy! Enjoy {pct}% off selected dishes.',
  'Hi, I would like a digital menu like this one for my restaurant.',
  '+{count} positive reviews on Google',
  'out of 5',
  /* el buscador compone estas desde JS, asi que no pueden vivir en el HTML */
  '{n} dishes',
  '{n} dish',
  'Nothing matches. Try another word.',
  'Nothing matches inside the filters.',
  'Clear filters',
  'and {n} more. Narrow the search.',
  'Sold out today',
  'Search dish or number',
  'Photo of the restaurant',
  'Photo {n} of {total}',
]);

/* ---- diet marks ----
 * Derived, never invented. A dish on the main menu is marked only when a dish of the same
 * name also appears in the restaurant's own Gluten Free or Vegan list. The mark therefore
 * says "there is a version of this" — not "this is". The two lists carry different prices,
 * so the plate that arrives is a different preparation, and for an allergy that distinction
 * is the whole point. Anything the source does not state stays unmarked. */
const normDish = (s) =>
  s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const gfNames = new Set();
const veganNames = new Set();
for (const [cat, data] of Object.entries(categories)) {
  if (/^Gluten Free/.test(cat)) data.items.forEach((it) => gfNames.add(normDish(it.name)));
  if (/^Vegan/.test(cat)) data.items.forEach((it) => veganNames.add(normDish(it.name)));
}
const isSpecialCat = (cat) => /^Gluten Free|^Vegan/.test(cat);

const DIET_ICON = {
  vegan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3l.014 0"/></svg>',
  gf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M12 21.5v-3.75"/><path d="M5.916 9.49l-.43 1.604c-.712 2.659 .866 5.392 3.524 6.104c.997 .268 1.994 .535 2.99 .802v-3.44c-.164 -2.105 -1.637 -3.879 -3.677 -4.426l-2.407 -.644"/><path d="M10.249 4.251c.007 -.007 .014 -.014 .021 -.021l1.73 -1.73"/><path d="M10.27 11.15c-.589 -.589 -1.017 -1.318 -1.246 -2.118"/><path d="M14.988 8.988c.229 -.834 .234 -1.713 .013 -2.549c-.221 -.836 -.659 -1.598 -1.271 -2.209l-1.73 -1.73"/><path d="M16.038 10.037l2.046 -.547l.431 1.604c.142 .53 .193 1.063 .162 1.583"/><path d="M16.506 16.505c-.45 .307 -.959 .544 -1.516 .694c-.997 .268 -1.994 .535 -2.99 .801v-3.44c.055 -.708 .259 -1.379 .582 -1.978"/></svg>',
};

function dietMarks(catName, name) {
  if (isSpecialCat(catName)) return '';   // the tab already says it
  const n = normDish(name);
  let out = '';
  if (veganNames.has(n)) {
    out += `<span class="diet diet-vegan" role="img"${TL('Available vegan')}>${DIET_ICON.vegan}</span>`;
  }
  if (gfNames.has(n)) {
    out += `<span class="diet diet-gf" role="img"${TL('Available gluten free')}>${DIET_ICON.gf}</span>`;
  }
  return out ? `<span class="diet-marks">${out}</span>` : '';
}

/* ---- group icons ----
 * One mark per subcategory heading, not per dish. Per dish it would have been noise: the
 * 326 dishes only resolve to about 16 shapes, and a tab like Breads would have stacked 23
 * identical bread icons down one column, repeating what its own heading already says. */
/* Tabler Icons (MIT), outline set, stroke 1.75, currentColor — one family, one optical
   size. Paths lifted verbatim from @tabler/icons rather than redrawn, and inlined instead
   of imported: this page is static HTML with no bundler, so inlining only the shapes in
   use is the tree-shaking. */
const GROUP_ICON = {
  appetizers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3"/></svg>',
  soup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/><path d="M12 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M16 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M8 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/></svg>',
  vegetarian: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 15h10v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2v-4"/><path d="M12 9a6 6 0 0 0 -6 -6h-3v2a6 6 0 0 0 6 6h3"/><path d="M12 11a6 6 0 0 1 6 -6h3v1a6 6 0 0 1 -6 6h-3"/><path d="M12 15l0 -6"/></svg>',
  meat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.62 8.382l1.966 -1.967a2 2 0 1 1 3.414 -1.415a2 2 0 1 1 -1.413 3.414l-1.82 1.821"/><path d="M5.904 18.596c2.733 2.734 5.9 4 7.07 2.829c1.172 -1.172 -.094 -4.338 -2.828 -7.071c-2.733 -2.734 -5.9 -4 -7.07 -2.829c-1.172 1.172 .094 4.338 2.828 7.071"/><path d="M7.5 16l1 1"/><path d="M12.975 21.425c3.905 -3.906 4.855 -9.288 2.121 -12.021c-2.733 -2.734 -8.115 -1.784 -12.02 2.121"/></svg>',
  salad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/><path d="M18.5 11c.351 -1.017 .426 -2.236 .5 -3.714v-1.286h-2.256c-2.83 0 -4.616 .804 -5.64 2.076"/><path d="M5.255 11.008a12.204 12.204 0 0 1 -.255 -2.008v-1h1.755c.98 0 1.801 .124 2.479 .35"/><path d="M8 8l1 -4l4 2.5"/><path d="M13 11v-.5a2.5 2.5 0 1 0 -5 0v.5"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3l.014 0"/></svg>',
  lentils: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/><path d="M8 7c1.657 0 3 -.895 3 -2s-1.343 -2 -3 -2s-3 .895 -3 2s1.343 2 3 2"/><path d="M11 5h9"/></svg>',
  rice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7h.01"/><path d="M15 7h.01"/><path d="M9 7h.01"/><path d="M5 5a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -14"/><path d="M9 15h6"/><path d="M5 11h14"/></svg>',
  bread: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 4a3 3 0 0 1 2 5.235v8.765a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-8.764a3 3 0 0 1 1.824 -5.231h12.176v-.005"/></svg>',
  fries: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v17m-3 -17v3a3 3 0 1 0 6 0v-3"/><path d="M14 8a3 4 0 1 0 6 0a3 4 0 1 0 -6 0"/><path d="M17 12v9"/></svg>',
  special: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6"/></svg>',
  kids: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 10l.01 0"/><path d="M15 10l.01 0"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/></svg>',
  bowl: ICON.ingredient,
  drop: ICON.sauce,
};



const renderItem = (it, showSlot, icon, catName) => {
  // the slot renders as a left column on desktop and as a badge before the name on phones;
  // whichever is not in use is display:none, so it never reaches the accessibility tree twice
  let column = '';
  let badge = '';
  if (showSlot) {
    if (it.id) {
      column = `\n                        <span class="item-id">${esc(it.id)}</span>`;
      badge = `<span class="item-badge">${esc(it.id)}</span>`;
    } else if (icon) {
      column = `\n                        <span class="item-id item-icon">${ICON[icon]}</span>`;
      badge = `<span class="item-badge item-badge-icon">${ICON[icon]}</span>`;
    } else {
      // an empty slot, so rows without a number still line up with the ones that have one
      column = `\n                        <span class="item-id" aria-hidden="true"></span>`;
    }
  }
  /* Los destacados, la oferta y el precio ya no se deciden aquí: los decide el panel y los
     pinta el runtime leyendo estado.json. El HTML sale con el precio de carta y con los huecos
     vacíos, así que sin JS y sin estado la carta sigue siendo correcta, sólo que sin novedades
     del día. Las etiquetas se emiten vacías y ocultas para no tener que crear nodos después. */
  const soldFlag = `<span class="sold-out-flag">${T('Sold out today', 'ui')}</span>`;
  const offerTag = `<span class="item-tag item-tag-offer" hidden></span>`;
  const highTag  = `<span class="item-tag item-tag-high" hidden></span>`;
  /* El número va suelto delante del nombre, no dentro de .item-tags: en el móvil ocupaba una
     línea entera para sí — 312 platos × una fila = cinco pantallas de scroll — y como prefijo
     del nombre cabe en la misma línea. Las etiquetas sí conservan su línea, pero sólo las
     lleva un puñado de filas al día. */
  const tags = `<span class="item-tags">${offerTag}${highTag}${soldFlag}</span>`;

  const included = /^included$/i.test(it.price);
  const priceCell = included ? T('Included', 'ui') : esc(money(it.price));
  // the key the panel writes into estado.json — category + name, so the gluten-free copy of a
  // dish can sell out, be highlighted or be repriced on its own
  const key = esc(catName + ' :: ' + it.name);
  return `                    <div class="single-menu-items" data-key="${key}" data-cat="${esc(catName)}"${included ? '' : ` data-price="${esc(it.price)}"`}>
                      <div class="details">${column}
                        <div class="menu-content">
                          <h3>${tags}${badge}${T(it.name, 'names')}${dietMarks(catName, it.name)}</h3>
                          <p>${T(it.desc, 'descriptions')}</p>
                        </div>
                      </div>
                      <h6>${priceCell}</h6>
                    </div>`;
};

/* ---- escala de picante ----
 * Era una frase: «Niveles de picante: suave, ligero, medio, Madras, Vindaloo y Phall». Leída
 * así, los seis nombres pesan lo mismo y no dicen nada del salto que hay entre uno y otro —
 * que es justo lo que alguien necesita saber antes de pedir un Phall.
 *
 * Ahora es una escala: una barra que va de la crema al rojo y seis peldaños con sus chiles.
 * Los tres primeros nombres se traducen; Madras, Vindaloo y Phall no, que son nombres de
 * cocina y en cualquier idioma se piden igual. */
const NIVELES = [
  /* Suave llevaba el chile tachado, y eso dice «no lleva picante», que es falso: suave es poco,
     no nada. La escala pasa a ir de uno a seis; el que no quiere picante no elige un nivel,
     elige otro plato. */
  { nombre: 'Mild', chiles: 1, traducir: true },
  { nombre: 'Touch', chiles: 2, traducir: true },
  { nombre: 'Medium', chiles: 3, traducir: true },
  { nombre: 'Madras', chiles: 4, traducir: false },
  { nombre: 'Vindaloo', chiles: 5, traducir: false },
  { nombre: 'Phall', chiles: 6, traducir: false },
];

const CHILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 11c0 2.21 -2.239 4 -5 4s-5 -1.79 -5 -4a8 8 0 1 0 16 0a3 3 0 0 0 -6 0"/><path d="M16 8c0 -2 2 -4 4 -4"/></svg>';

/* El rojo de cada peldaño sale de una sola interpolación: del rojo de oferta hacia un granate
   oscuro, para que la barra y las marcas cuenten lo mismo y no haya seis colores sueltos. */
const rojoNivel = (i, total) => {
  const t = total > 1 ? i / (total - 1) : 0;
  const mez = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${mez(224, 122)},${mez(122, 20)},${mez(46, 24)})`;
};

const escalaPicante = () => {
  const items = NIVELES.map((n, i) => {
    const marcas = Array.from({ length: n.chiles }, () => `<span class="heat-mark">${CHILE}</span>`).join('');
    const etiqueta = n.traducir ? T(n.nombre, 'ui') : esc(n.nombre);
    return `                    <li class="heat-step">
                      <span class="heat-marks" style="--heat:${rojoNivel(i, NIVELES.length)}">${marcas}</span>
                      <span class="heat-name">${etiqueta}</span>
                    </li>`;
  }).join(String.fromCharCode(10));

  return `                <div class="heat-scale">
                  <ul class="heat-steps">
${items}
                  </ul>
                </div>` + String.fromCharCode(10);
};

/* Notas de menu.md que son condición de pedido y no descripción: se pintan al final del grupo
   con el distintivo IMPORTANTE (ver renderSub). Se identifican por su texto exacto. */
const AVISOS_AL_FINAL = [
  'Only served for children under 9 years.',
  'All rice dishes use Indian basmati rice.',
  'All naans are egg-free.',
];

/* Función Ocultos (platos, grupos y pestañas que desaparecen de la carta desde el panel).
   APAGADA de momento por decisión del cliente hasta que la lógica esté madura. Para
   encenderla: true aquí y OCULTOS_ACTIVO en server/admin/config.php, y regenerar. */
const OCULTOS_ACTIVO = false;

const renderSub = (catName, label, showSlot) => {
  const cat = categories[catName];
  const half = Math.ceil(cat.items.length / 2);
  const left = cat.items.slice(0, half);
  const right = cat.items.slice(half);
  const icon = iconFor(catName);

  const gIcon = GROUP_ICON_BY_CAT[catName];
  if (label && !gIcon) missingIcons.push(catName);
  const head = label
    ? `                <h4 class="menu-group-title"><span class="group-icon" aria-hidden="true">${GROUP_ICON[gIcon] || ''}</span>${T(label, 'groups')}</h4>` + String.fromCharCode(10)
    : '';
  /* La escala de picante va DEBAJO de los platos, no encima: es una leyenda de lo que se acaba
     de leer, no una advertencia previa. Lo que la nota dijera además se queda arriba como
     texto — salvo el «elige después una salsa de la lista siguiente», que ya lo dicen los
     pasos y repetirlo es ruido. */
  const PICANTE = 'Spice levels: Mild, Touch, Medium, Madras, Vindaloo, Phall.';
  const YA_LO_DICEN_LOS_PASOS = [
    'Select one sauce from the next section.',
    'Select one South Indian sauce from the next section.',
  ];
  let note = '';
  let avisoFinal = '';
  let escala = '';
  if (cat.note && cat.note.indexOf(PICANTE) !== -1) {
    escala = escalaPicante();
    const resto = cat.note.split(PICANTE)
      .map((t) => t.trim())
      .filter((t) => t && !YA_LO_DICEN_LOS_PASOS.includes(t));
    note = resto.map((t) => `                <p class="menu-group-note">${T(t, 'ui')}</p>`).join(String.fromCharCode(10))
         + (resto.length ? String.fromCharCode(10) : '');
  } else if (cat.note && AVISOS_AL_FINAL.includes(cat.note)) {
    /* Un aviso que condiciona el pedido («sólo para menores de 9 años») va al final del grupo,
       después de los platos, con un distintivo IMPORTANTE: es lo último que se lee antes de
       pedir, no una nota de cabecera que se salta. */
    avisoFinal = `                <p class="menu-group-aviso"><span class="aviso-badge">${T('Important', 'ui')}</span>${T(cat.note, 'notes')}</p>` + String.fromCharCode(10);
  } else if (cat.note) {
    note = `                <p class="menu-group-note">${T(cat.note, 'notes')}</p>` + String.fromCharCode(10);
  }
  const offerNote = '';

  const col = (items, offset) =>
    items.map((it) => renderItem(it, showSlot, icon, catName)).join('\n');

  return `              <div class="menu-group${escala ? ' con-escala' : ''}" data-cat="${esc(catName)}">
${head}${note}${offerNote}                <div class="row">
                  <div class="col-lg-6">
${col(left, 0)}
                  </div>
                  <div class="col-lg-6">
${col(right, 1)}
                  </div>
                </div>
${avisoFinal}${escala}              </div>`;
};

// Kids / Gluten Free / Vegan are a different kind of choice from a course — they get
// their own labelled block at the end of the bar and their own group in the index sheet.
const SPECIAL = new Set(['Kids', 'Gluten Free', 'Vegan']);
const countOf = (subs) => subs.reduce((n, [cat]) => n + categories[cat].items.length, 0);

const nav = GROUPS.map(([label], i) => {
  const id = 'pills-' + slug(label);
  const divider = SPECIAL.has(label) && !SPECIAL.has(GROUPS[i - 1]?.[0])
    ? `              <li class="nav-divider" role="presentation">${T('Special menus', 'ui')}</li>\n`
    : '';
  return `${divider}              <li class="nav-item${i === 0 ? ' active' : ''}" role="presentation" data-tab="${esc(label)}">
                <button class="nav-link i18n" ${attrs(label, 'tabs')} id="${id}-tab" data-target="${id}" type="button" role="tab" aria-controls="${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}">${esc(label)}</button>
              </li>`;
}).join('\n');

const sheetGroup = (title, entries) => `      <p class="sheet-label">${T(title, 'ui')}</p>
      <ul class="sheet-list">
${entries.map(([label, subs], i) => {
  const id = 'pills-' + slug(label);
  return `        <li>
          <button type="button" class="sheet-item" data-target="${id}"${i === 0 && title === 'Menu' ? ' aria-current="true"' : ''}>
            <span class="sheet-item-icon" aria-hidden="true">${TAB_ICON[label] === 'gf' ? DIET_ICON.gf : GROUP_ICON[TAB_ICON[label]]}</span>
            <span class="sheet-item-name">${T(label, 'tabs')}</span>
            <span class="sheet-item-count">${countOf(subs)}</span>
          </button>
        </li>`;
}).join('\n')}
      </ul>`;

const sheet = [
  sheetGroup('Menu', GROUPS.filter(([l]) => !SPECIAL.has(l))),
  sheetGroup('Special menus', GROUPS.filter(([l]) => SPECIAL.has(l))),
].join('\n');

const panes = GROUPS.map(([label, subs], i) => {
  const id = 'pills-' + slug(label);
  // decide the slot column once per tab so every group inside it lines up
  const showSlot = subs.some(([cat]) => categories[cat].items.some((it) => it.id !== '') || iconFor(cat));
  const body = subs.map(([cat, sublabel], j) => renderSub(cat, sublabel, showSlot)).join(String.fromCharCode(10));
  /* La línea de la pestaña (sólo Vegano la tiene) va al FINAL, después de todos los grupos,
     con el distintivo IMPORTANTE: es condición de lo que se pide, no una introducción. */
  const cierre = TAB_INTRO[label]
    ? String.fromCharCode(10) + `              <p class="menu-group-aviso tab-aviso"><span class="aviso-badge">${T('Important', 'ui')}</span>${T(TAB_INTRO[label], 'ui')}</p>`
    : '';
  return `              <div class="tab-pane${i === 0 ? ' active' : ''}${showSlot ? ' has-ids' : ''}" id="${id}" role="tabpanel" aria-labelledby="${id}-tab" data-tab="${esc(label)}">
${body}${cierre}
              </div>`;
}).join('\n');

const totalItems = Object.values(categories).reduce((n, c) => n + c.items.length, 0);

const html = `<!DOCTYPE html>
<html lang="en" translate="no" class="notranslate">
<head>
<!-- La carta ya trae su propio traductor (ES/EN/DE), con los platos traducidos a mano por
     alguien que sabe qué es un paneer. El del navegador encima de eso convierte «Naan de ajo»
     en cualquier cosa y además pelea con nuestro cambio de idioma: Chrome envuelve los nodos
     en <font> y el siguiente cambio se los come. translate="no" es el estándar; la meta y la
     clase son para los que no lo miran. -->
<script>document.documentElement.className+=' js';try{var _t=localStorage.getItem('${CLAVE('tema')}');if(_t)document.documentElement.dataset.tema=_t;var _e=localStorage.getItem('${CLAVE('escala')}');if(_e)document.documentElement.style.setProperty('--escala',_e)}catch(e){}</script>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${CLIENTE.titulo}</title>
<meta name="description" content="${CLIENTE.descripcion}"${attrs(CLIENTE.descripcion, 'ui')}>
<link rel="icon" type="image/svg+xml" href="assets/titleIcon-accent.svg">
<meta name="theme-color" content="${derivar(TEMAS.find((t) => t.slug === TEMA_POR_DEFECTO))['--ink']}">
<link rel="canonical" href="${CLIENTE.base}">
<meta property="og:type" content="website">
<meta property="og:title" content="${CLIENTE.tituloSocial}">
<meta property="og:description" content="${CLIENTE.descripcion}">
<meta property="og:url" content="${CLIENTE.base}">
${FONTS}
<style>
/* Palette. Un bloque por tema, escrito por temas.mjs: el de la casa en :root y los demás
   colgando de data-tema, que pone el runtime al leer estado.json. Tres semillas por tema
   —fondo, tarjeta y acento— y los otros doce valores derivados de ellas, porque son el
   mismo color a distintas opacidades y elegirlos a mano convertiría cada tema en un
   rediseño.

   El original, "Jade", es ahora el tema marino. Su lectura sigue siendo la misma:
   sobre la tarjeta crema, ink 16.0:1 · muted 6.8:1 · accent 5.2:1. Ningún tema entra sin
   pasar esas mismas medidas — se comprueban en el build, no a ojo. */
${TOKENS}*,*::before,*::after{box-sizing:border-box}
/* cream on the dark teal, 5.2:1 — navy on it was only 3.3 */
::selection{background:var(--accent);color:var(--surface)}
/* La barra de la página también es del tema: sobre el navy, la gris del sistema es lo único
   en pantalla que no ha elegido nadie. Aquí la pastilla es crema al 30%, que se ve sin gritar,
   y la canaleta transparente deja pasar el fondo. */
html{
  scrollbar-width:thin;
  scrollbar-color:color-mix(in srgb,var(--surface) 30%,transparent) transparent;
}
html::-webkit-scrollbar{width:12px}
html::-webkit-scrollbar-track{background:transparent}
html::-webkit-scrollbar-thumb{
  border:3px solid transparent;
  border-radius:var(--r-pill);
  background:color-mix(in srgb,var(--surface) 30%,transparent);
  background-clip:content-box;
}
@media (hover:hover) and (pointer:fine){
  html::-webkit-scrollbar-thumb:hover{
    background:color-mix(in srgb,var(--surface) 52%,transparent);
    background-clip:content-box;
  }
}

body{
  margin:0;
  /* La página es el navy de la marca, no el teal. La tarjeta crema flotando sobre oscuro
     tiene más presencia y es la misma relación que el panel: fondo profundo, papel encima. */
  background:var(--ink);
  font-family:var(--body-font);
  font-size:16px;
  line-height:28px;
  color:var(--muted);
  -webkit-font-smoothing:antialiased;
}
img{max-width:100%;height:auto;display:block}
h2,h3,h4,h6,p{margin:0}

/* ---------- layout ---------- */
/* El mismo aire por arriba que el panel: 34 en movil, 55 de tablet para arriba. Eran dos
   pantallas de la misma marca empezando a alturas distintas. */
/* 21 arriba, los mismos que el panel: de 768 en adelante la carta y el panel se miran juntos
   —pantalla partida, tablet en la mano— y los 55 de antes dejaban la carta arrancando 34px más
   abajo. Abajo se quedan los 89: ahí no hay nada con lo que cuadrar. En móvil manda el override
   de más abajo, que son 13, y allí ya coincidían. */
.food-menu-section{position:relative;margin:var(--s3) 0 var(--s6)}
.container{width:100%;max-width:1570px;margin:0 auto;padding:0 var(--s2)}

.food-menu-tab-wrapper{
  position:relative;
  z-index:1;
  background:var(--surface);
  --radio-tarjeta:var(--r-card);      /* lo lee el marco del hero para ir concéntrico */
  border-radius:var(--radio-tarjeta);
  padding:var(--s6) 0;
  /* cream on cream is a 1.05:1 edge — the lift is what makes this read as a sheet */
  box-shadow:var(--lift-card);
}

/* ---------- decorative shapes ---------- */
/* Held back to texture. They are template artwork outside the three-colour system, so they
   sit quiet behind the type instead of competing with it — and they no longer bob forever:
   perpetual decorative motion has no function and pulls the eye off the menu. */
.shape1,.shape2,.shape3{position:absolute;display:none;opacity:.55}
@media (min-width:1200px){.shape1,.shape2,.shape3{display:block}}
.shape1{top:var(--s4);left:var(--s4)}
.shape2{top:var(--s5);right:var(--s3)}
.shape3{bottom:0;right:0}

/* ---------- title ---------- */
.title-area{position:relative;z-index:5}
.title-area .sub-title{
  display:block;
  text-align:center;
  color:var(--accent-ink);
  letter-spacing:.08em;
  font-family:var(--title-font);
  /* stepped down from 16px; 8px, the next notch on the 8pt scale, is unreadable
     for an uppercase tracked label, so this lands on 13 — the Fibonacci step below 16 */
  font-size:13px;
  font-weight:600;
  line-height:normal;
  text-transform:uppercase;
  margin-bottom:var(--s2);
}
.title-area .title{
  color:var(--ink);
  text-align:center;
  font-family:var(--title-font);
  /* clamped so the restaurant name stays on one line down to a 320px screen */
  font-size:clamp(26px,7.6vw,44px);
  font-weight:800;
  font-optical-sizing:auto;
  /* tracking is size-specific: large type reads too loose at 0, so it tightens as it grows.
     Leading tightens with it — 1.25 was body-like spacing on a display line. */
  letter-spacing:-0.02em;
  line-height:1.08;
  /* no capitalize here: it rendered the restaurant name as "Tinge Of Turmeric" */
  margin-bottom:0;
}

/* ---------- language ----------
   Sits between the name and the category bar: language is a page-level choice, so it does
   not belong inside a row of categories that scrolls sideways. */
/* ---- el idioma ----
   Puerto del desplegable de 21st.dev (@samsiavoshian2009, language-selector-dropdown): pastilla
   con bandera, nombre y chevron, y un panel con la marca en el idioma activo. Alli es React con
   Tailwind, lucide y shadcn; aqui es el mismo dibujo sin ninguna de las cuatro cosas, porque
   meterlas costaria mas kilobytes de JS que toda la carta.

   Era una fila de tres pildoras centrada bajo el titulo: 65px de alto en un movil para un
   control que se toca una vez por visita. En la esquina, esos 65px son platos. */
.lang{position:relative}
.lang-trigger{
  display:flex;
  align-items:center;
  gap:7px;
  /* 44 y no 40: al lado va el control de tamaño de texto, que es de 44 porque lo usa quien
     peor apunta con el dedo. Dos píldoras de alto distinto en la misma fila se leen como un
     descuadre, así que suben las dos. */
  height:44px;
  padding:0 10px 0 12px;
  border:1px solid var(--border);
  border-radius:var(--r-pill);
  background:var(--surface);
  color:var(--ink);
  font-family:var(--title-font);
  /* 16 como los chips y como las opciones del desplegable: el idioma elegido se lee igual
     cerrado que abierto. */
  font-size:16px;
  font-weight:600;
  cursor:pointer;
  transition:border-color var(--t-fast) ease,transform var(--t-press) var(--ease-out);
}
.lang-trigger:active{transform:scale(.96)}
.lang-trigger:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
@media (hover:hover) and (pointer:fine){
  .lang-trigger:hover{border-color:var(--muted)}
}
.lang-flag{display:inline-flex;flex:0 0 auto}
/* El borde no es decoracion: las banderas con blanco en el canto —la del Reino Unido— se
   derraman sobre la crema sin el. */
.bandera{
  width:21px;
  height:14px;
  border-radius:3px;
  box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 14%,transparent);
}
.lang-chevron{
  width:15px;height:15px;
  color:var(--muted);
  transition:transform var(--t-fast) var(--ease-out);
}
.lang-trigger[aria-expanded="true"] .lang-chevron{transform:rotate(180deg)}

/* El panel cuelga del boton, no del centro de la pantalla: sale de donde se ha tocado. */
.lang-menu{
  position:absolute;
  top:calc(100% + 6px);
  right:0;
  z-index:20;
  min-width:172px;
  padding:5px;
  border:1px solid var(--border);
  border-radius:16px;
  background:var(--surface);
  box-shadow:var(--lift-fab);
  transform-origin:top right;
  transition:opacity var(--t-fast) var(--ease-out),transform var(--t-fast) var(--ease-out);
}
.lang-menu[hidden]{display:none}
/* Nunca desde scale(0): nada aparece de la nada. */
.lang-menu.is-closed{opacity:0;transform:translateY(-2px) scale(.97)}
.lang-opt{
  display:flex;
  align-items:center;
  gap:9px;
  width:100%;
  min-height:42px;
  padding:0 9px;
  border:0;
  border-radius:11px;
  background:transparent;
  color:var(--ink);
  /* La misma tipografía y el mismo tamaño que los chips de categoría: es un control, no
     texto de lectura, y los dos se tocan igual. */
  font-family:var(--title-font);
  font-size:16px;
  font-weight:600;
  text-align:left;
  cursor:pointer;
  transition:background-color var(--t-fast) ease;
}
.lang-opt .lang-name{flex:1 1 auto}
.lang-opt:focus-visible{outline:2px solid var(--accent-ink);outline-offset:-2px}
@media (hover:hover) and (pointer:fine){
  .lang-opt:hover{background:var(--chip)}
}
.lang-opt[aria-checked="true"]{color:var(--accent-ink);font-weight:600}
.lang-check{width:17px;height:17px;color:var(--accent-ink);opacity:0}
.lang-opt[aria-checked="true"] .lang-check{opacity:1}
/* Sin JS el desplegable no abre, asi que se ensena la lista entera: los tres idiomas siguen
   siendo alcanzables aunque el script no llegue nunca. */
html:not(.js) .lang-trigger{display:none}
html:not(.js) .lang-menu{position:static;display:block}
@media (prefers-reduced-motion:reduce){
  .lang-menu,.lang-chevron{transition:none}
  .lang-menu.is-closed{transform:none}
}

/* ---------- Chilli Rush: la entrada desde la carta ----------
   Es un enlace a otra página, no un bloque decorativo, así que se comporta como tal — cursor,
   foco visible y respuesta al pulsar.

   Trae la cara del juego a la carta: fondo de tinta como su portada, la mascota en su medallón
   y «Rush» en el rojo inclinado. Antes iba en el acento de latón y se leía como una sección más
   del menú; el trabajo de este bloque es justo el contrario, decir «esto es otra cosa».

   Dónde va el rojo, y por qué no en todo: el rojo de oferta contra el crema da 4,48:1. Sobra
   para texto grande y para iconos (3:1), pero se queda a un pelo del 4,5 que pide el texto
   normal. Así que el rojo sólo se usa en el medallón y en la caja de «Rush» —24px en negrita,
   texto grande— y el premio va en una píldora crema con tinta, que da 9,6:1. Un bloque entero
   rojo habría dejado el pie y la línea de encima por debajo del mínimo legible. */
.game-card{
  display:flex;
  align-items:center;
  gap:var(--s2);
  margin-top:var(--s3);
  padding:var(--s3);
  border-radius:var(--r-sheet);
  background:var(--ink);
  color:var(--surface);
  text-decoration:none;
  transition:transform var(--t-press) var(--ease-out);
}
.game-card[hidden]{display:none}
.game-card:active{transform:scale(.985)}
.game-card:focus-visible{outline:3px solid var(--ink);outline-offset:3px}

/* Aquí iba el chile de la casa en un medallón de 48, y flotaba. Se cae porque no cabía: con él
   delante, a 375 el nombre y la llamada sumaban 353 de los 265 que hay y la llamada se
   descolgaba a una segunda fila. El nombre ya lleva el chile en la palabra y el rojo lo pone
   «Rush», así que lo que se pierde es sólo el adorno.

   El nombre encoge con la pantalla —de 22 a 34— para que la llamada quepa detrás en un móvil
   estrecho sin dejar de ser grande donde hay sitio. */

.game-card-title{
  flex:0 1 auto;
  min-width:0;
  font-family:var(--title-font);
  /* Crece con la pantalla y no se parte nunca. El suelo son 21: con el nombre a 24 y la
     llamada en 121, a 360px de movil se salia de la tarjeta, y como no puede envolver lo que
     hacia era desbordar. El techo son 34, que es donde deja de tener sentido crecer. */
  font-size:clamp(21px,6.4vw,34px);font-weight:800;line-height:1.05;letter-spacing:-0.02em;
  white-space:nowrap;
}
/* La firma del juego, la misma inclinación y el mismo rojo que en su portada. */
.game-card-title em{
  font-style:normal;
  display:inline-block;
  transform:rotate(-3deg);
  padding:0 .18em;
  border-radius:.14em;
  background:var(--offer);
  color:var(--surface);
}
/* El botón: redondo, 64 y en el rojo del juego. Pegado a la derecha con margin-left:auto y
   centrado en vertical por el align-items del bloque, así que da igual cuánto crezca el texto.
   Es el mismo rojo del botón «Jugar» de la portada del juego, con la flecha en crema: 4,5:1
   sobre el rojo, de sobra para un icono.

   El aro de crema al 22% no es decoración: en Caoba el rojo sobre la tinta granate da 2,4:1 y
   el círculo se perdería contra el fondo de la tarjeta. Con el aro, el borde se lee en los
   cinco temas sin meter un color nuevo. */
/* La llamada: un solo botón. La palabra y el triángulo dentro de la misma píldora, no dos
   piezas seguidas — dos formas juntas parecían dos acciones cuando siempre fueron una.

   Crema con texto de tinta: 10,8:1. El triángulo va en el rojo del juego, que al ser icono le
   basta con 3:1. La píldora en rojo con el texto en crema se quedaba en 4,48 y no llegaba al
   mínimo del texto normal, así que el rojo aquí sólo puede ser el icono. */
.game-card-cta{
  flex:0 0 auto;
  margin-left:auto;
  display:flex;align-items:center;gap:var(--s1);
  height:48px;padding:0 var(--s3);
  border-radius:var(--r-pill);
  background:var(--surface);
  color:var(--ink);
  font-family:var(--title-font);font-size:16px;font-weight:600;
  transition:transform var(--t-press) var(--ease-out);
}
.game-card-cta svg{flex:0 0 auto;width:17px;height:17px;color:var(--offer)}
@media (hover:hover) and (pointer:fine){
  .game-card:hover .game-card-cta{transform:translateX(3px)}
}
.game-card:active .game-card-cta{transform:scale(.96)}
@media (prefers-reduced-motion:reduce){
  .game-card,.game-card-cta{transition:none}
  .game-card:hover .game-card-cta,
  .game-card:active .game-card-cta{transform:none}
}

/* ---------- las redes ----------
   Debajo de la nota, misma fila, centradas. El dibujo mide 32 dentro de un circulo de 56 —doce
   de aire por lado— y de sobra sobre el area de dedo minima, que son 48.

   Circulo lleno del color del texto y logo en el color del papel: 16:1, que se ve desde el otro
   lado de la mesa y con la pantalla al sol de una terraza. Antes eran contornos sueltos y a
   este tamano se perdian contra la crema.

   Aqui la separacion SI es un hueco de verdad y no padding: con discos llenos, dos circulos
   pegados se leen como una mancha. */
.social{
  display:flex;
  justify-content:center;
  align-items:center;
  flex-wrap:wrap;
  gap:var(--s1);
  margin-top:var(--s3);
}
.social[hidden]{display:none}
.social-link{
  display:flex;
  align-items:center;
  justify-content:center;
  width:56px;
  height:56px;
  border-radius:var(--r-pill);
  background:var(--ink);
  color:var(--surface);
  transition:transform var(--t-press) var(--ease-out),background-color var(--t-fast) ease;
}
.social-link svg{width:32px;height:32px}
.social-link:active{transform:scale(.9)}
/* El foco por fuera del disco: dentro de uno lleno y oscuro no se veria. */
.social-link:focus-visible{outline:3px solid var(--accent-ink);outline-offset:2px}
@media (hover:hover) and (pointer:fine){
  .social-link:hover{background:color-mix(in srgb,var(--ink) 82%,var(--surface))}
}

/* ---------- buscador de platos ----------
   La carta tiene 312 platos repartidos en 13 pestanas, y hasta ahora encontrar el paneer
   costaba abrirlas a mano una por una. Esto es lo que mas cambia el uso de la carta.

   Vive DENTRO de la hoja de categorias en vez de tener su propia pantalla: la hoja ya es el
   sitio al que se va cuando no sabes donde esta algo, ya se abre con un gesto que el cliente
   conoce y ya esta a un dedo en el movil. Un componente menos que aprender.

   No hay indice ni copia de los platos en memoria: las 312 filas ya estan en el DOM con su
   numero, su precio, sus marcas y su estado. Buscar es recorrerlas. */
/* 13 de aire sobre el buscador: sin ellos el campo empezaba justo donde acaba la cabecera y el
   desvanecido de 13 que la separa de la lista caía encima, montándose con el borde del cuadro.
   Con el margen, ese desvanecido cae sobre papel y del botón de cerrar al buscador quedan 21. */
.dish-search{margin:var(--s2) 0}
.ds-field{position:relative}
.ds-icon{
  position:absolute;left:14px;top:50%;
  display:flex;
  transform:translateY(-50%);
  color:var(--muted);
  pointer-events:none;
}
.ds-icon svg{width:18px;height:18px}
.ds-field input{
  width:100%;
  min-height:48px;
  padding:0 46px 0 42px;
  border:1px solid var(--border);
  border-radius:var(--r-pill);
  background:var(--surface);
  color:var(--ink);
  font-family:var(--body-font);
  /* 16px o iOS hace zoom al enfocar y descoloca la hoja entera */
  font-size:16px;
  -webkit-appearance:none;
  appearance:none;
  transition:border-color var(--t-fast) ease,box-shadow var(--t-fast) ease;
}
.ds-field input::placeholder{color:var(--muted)}
.ds-field input::-webkit-search-cancel-button{display:none}
.ds-field input:focus{outline:none;border-color:transparent;box-shadow:0 0 0 2px var(--accent)}
.ds-clear{
  position:absolute;right:6px;top:50%;
  display:none;align-items:center;justify-content:center;
  width:38px;height:38px;
  margin-top:-19px;
  padding:0;border:0;border-radius:50%;
  background:transparent;color:var(--muted);
  cursor:pointer;
  transition:transform var(--t-press) var(--ease-out);
}
.ds-clear svg{width:16px;height:16px}
.ds-clear:active{transform:scale(.9)}
.ds-clear:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
.ds-field.has-text .ds-clear{display:flex}

/* ---- los filtros ----
   Tres, no ocho. Cada uno lleva su cuenta, y la cuenta no es el total: es cuantos platos
   anadiria ESE chip dentro de lo que ya esta filtrado. Un contador que promete 53 y entrega
   10 es peor que no ponerlo. */
.ds-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:var(--s2)}
.ds-chip{
  display:inline-flex;align-items:center;gap:6px;
  min-height:38px;
  padding:0 14px;
  border:1px solid var(--border);
  border-radius:var(--r-pill);
  background:transparent;
  color:var(--muted);
  font-family:var(--title-font);
  font-size:13px;font-weight:600;
  cursor:pointer;
  transition:transform var(--t-press) var(--ease-out),background-color var(--t-fast) ease,
             color var(--t-fast) ease,border-color var(--t-fast) ease;
}
/* display:inline-flex gana al [hidden] del navegador. Ya paso una vez con 326 pildoras
   vacias detras de cada numero de plato; aqui no se repite. */
.ds-chip[hidden]{display:none}
.ds-chip:active{transform:scale(.96)}
.ds-chip:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
.ds-chip .n{font-variant-numeric:tabular-nums;font-size:11px;opacity:.65}
.ds-chip[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--surface)}
.ds-chip[aria-pressed="true"] .n{opacity:.8}

/* ---- resultados ----
   Mientras hay busqueda o filtro, la lista de categorias se va: son dos respuestas a la
   misma pregunta y ensenar las dos a la vez obliga a elegir. */
.ds-results[hidden]{display:none}
.sheet.is-searching .sheet-list,
.sheet.is-searching .sheet-label{display:none}
.ds-total{
  margin:var(--s2) 0 0;
  padding:0 2px;
  color:var(--muted);
  font-family:var(--title-font);
  font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
}
.ds-hit{
  display:flex;align-items:baseline;gap:10px;
  width:100%;
  padding:11px 2px;
  border:0;border-top:1px solid var(--hairline);
  background:transparent;color:var(--ink);
  font-family:var(--body-font);
  text-align:left;cursor:pointer;
  transition:transform var(--t-press) var(--ease-out);
}
.ds-hit:active{transform:scale(.99)}
.ds-hit:focus-visible{outline:2px solid var(--accent-ink);outline-offset:-2px;border-radius:8px}
.ds-hit-num{
  flex:0 0 auto;min-width:26px;
  color:var(--muted);
  font-family:var(--title-font);font-size:11px;font-weight:600;
  font-variant-numeric:tabular-nums;
}
.ds-hit-name{flex:1 1 auto;min-width:0;font-size:15px;line-height:1.25}
.ds-hit-where{display:block;color:var(--muted);font-size:12px}
.ds-hit-price{
  flex:0 0 auto;
  font-family:var(--title-font);font-size:14px;font-weight:600;
  font-variant-numeric:tabular-nums;
}
.ds-hit .diet-marks{margin-left:6px}
.ds-hit .diet-marks svg{width:13px;height:13px}
.ds-hit.is-off .ds-hit-name,
.ds-hit.is-off .ds-hit-price{opacity:.45}
.ds-hit.is-off .ds-hit-name{text-decoration:line-through;text-decoration-thickness:1px}
.ds-empty{
  padding:var(--s4) 2px var(--s3);
  color:var(--muted);
  font-family:var(--body-font);font-size:15px;
  text-align:center;
}
.ds-reset{
  display:block;margin:0 auto var(--s3);
  min-height:44px;padding:0 var(--s3);
  border:1px solid var(--border);border-radius:var(--r-pill);
  background:transparent;color:var(--ink);
  font-family:var(--title-font);font-size:14px;font-weight:600;
  cursor:pointer;
  transition:transform var(--t-press) var(--ease-out);
}
.ds-reset:active{transform:scale(.97)}
.ds-reset:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}

/* Al saltar a un plato, un destello para que el ojo lo encuentre entre veinte filas iguales.
   Una vez, y se acabo: nada que siga moviendose mientras se lee. */
@keyframes ds-flash{from{background:var(--chip)}to{background:transparent}}
.ds-flash{animation:ds-flash 1400ms var(--ease-out)}
@media (prefers-reduced-motion:reduce){
  .ds-flash{animation:none;outline:2px solid var(--accent);outline-offset:4px}
}

/* ---------- opiniones de Google ----------
   Lo ultimo que se lee antes del pie, y a proposito: la prueba social va despues de la
   comida, no antes de ella. Nadie elige un restaurante en el que ya esta sentado; lo que si
   hace es dejar una resena si se le recuerda en el momento adecuado.

   El bloque entero lo enciende el panel. Sale oculto del build para que una carta nueva no
   herede nunca la nota de otro restaurante: sin datos configurados, aqui no hay nada. */
.reviews{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:6px;
  margin-top:var(--s5);
  padding-top:var(--s4);
  border-top:1px solid var(--hairline);
  text-align:center;
  text-decoration:none;
  color:var(--ink);
}
.reviews[hidden]{display:none}
/* La nota y las cinco estrellas van juntas y el texto debajo: con cinco estrellas la linea
   entera no cabe de un tiron en un movil, y dejarla al wrap natural la parte por donde le
   apetezca. Partirla aqui es decidirlo nosotros. */
.reviews-line{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  margin:0;
}
.reviews-score{
  font-family:var(--title-font);
  font-size:clamp(26px,7vw,34px);
  font-weight:800;
  line-height:1;
  letter-spacing:-0.02em;
  font-variant-numeric:tabular-nums;
}
.reviews-stars{display:flex;gap:2px}
.reviews-stars svg{
  width:clamp(18px,4.6vw,22px);
  height:clamp(18px,4.6vw,22px);
  fill:var(--accent);
}
.reviews-text{
  font-family:var(--body-font);
  font-size:clamp(15px,4vw,17px);
  color:var(--muted);
}

/* ---------- tabs ---------- */
/* ---- la calle ----
   El margen lateral de la tarjeta vivia repetido en cuatro breakpoints, y en cuanto algo mas
   quiso alinearse con el —la foto, los controles sobre ella— empezaron a descuadrarse por
   turnos. Ahora es una variable: los breakpoints la cambian y todo lo que se alinea la lee. */
:root{--gutter:var(--s7)}
.food-menu-tab{padding:0 var(--gutter)}
/* One row at every width, scrolled horizontally when it does not fit.
   The auto margins centre the row while it fits and collapse to 0 once it overflows,
   which justify-content:center cannot do without making the left end unreachable. */
.tab-nav{position:relative;margin-top:var(--s4)}
.nav-pills{
  display:flex;
  flex-wrap:nowrap;
  align-items:center;
  justify-content:flex-start;
  list-style:none;
  margin:0;
  padding:0 var(--s5);
  overflow-x:auto;
  overscroll-behavior-x:contain;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
}
.nav-pills::-webkit-scrollbar{display:none}
.nav-pills > li:first-child{margin-left:auto}
.nav-pills > li:last-child{margin-right:auto}

/* fades tell the reader the row keeps going past that edge */
.tab-nav::before,.tab-nav::after{
  content:"";
  position:absolute;
  top:0;
  bottom:0;
  width:var(--s5);
  z-index:2;
  pointer-events:none;
  transition:opacity var(--t-fast) var(--ease-out);
}
.tab-nav::before{left:0;background:linear-gradient(90deg,var(--surface),var(--surface-0))}
.tab-nav::after{right:0;background:linear-gradient(270deg,var(--surface),var(--surface-0))}
.tab-nav.at-start::before,.tab-nav.at-end::after{opacity:0}

/* mouse users get arrows; on touch the row is swiped instead */
.nav-arrow{
  position:absolute;
  top:50%;
  z-index:3;
  display:none;
  align-items:center;
  justify-content:center;
  width:40px;
  height:40px;
  margin-top:-20px;
  padding:0;
  border:0;
  border-radius:var(--r-pill);
  background:var(--chip);
  color:var(--ink);
  cursor:pointer;
  transition:opacity var(--t-fast) var(--ease-out),transform var(--t-press) var(--ease-out);
}
.nav-arrow-prev{left:0}
.nav-arrow-next{right:0}
.nav-arrow:not(:disabled):active{transform:scale(.92)}
.nav-arrow:disabled{opacity:.3;cursor:default}
.nav-arrow:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
/* ---- la lupa ----
   Vive en el racimo de la cabecera, al lado del idioma. Solo de 768 para arriba: por debajo
   esta el boton flotante de categorias, que ya abre la misma hoja y esta siempre a un dedo.
   Poner las dos puertas en un movil seria repetir el mismo sitio dos veces. */
.nav-search{
  display:none;
  align-items:center;
  justify-content:center;
  width:40px;
  height:40px;
  padding:0;
  border:0;
  border-radius:var(--r-pill);
  background:var(--chip);
  color:var(--ink);
  cursor:pointer;
  transition:background-color var(--t-fast) ease,transform var(--t-press) var(--ease-out);
}
.nav-search svg{width:19px;height:19px}
.nav-search:active{transform:scale(.92)}
.nav-search:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
@media (hover:hover) and (pointer:fine){
  .nav-search:hover{background:var(--border)}
}
@media (min-width:768px){
  .nav-search{display:flex}
}
@media (min-width:768px){
  .tab-nav.is-scrollable .nav-arrow{display:flex}
}
.nav-pills .nav-link{
  display:block;
  position:relative;
  padding:5px var(--s3) 6px 0;
  margin:var(--s1) var(--s3) var(--s1) 0;
  color:var(--ink);
  font-family:var(--title-font);
  font-size:20px;
  font-weight:600;
  line-height:30px;
  letter-spacing:-0.005em;
  text-align:center;
  white-space:nowrap;
  background:transparent;
  border:0;
  border-radius:0;
  cursor:pointer;
  transition:color var(--t-fast) ease,transform var(--t-press) var(--ease-out),
             font-variation-settings var(--t-fast) var(--ease-out);
}
.nav-pills .nav-link:active{transform:scale(.97)}
/* the 2px rule is decoration on top of the colour change, never the only state cue */
.nav-pills .nav-link::after{
  content:"";
  position:absolute;
  left:0;
  right:var(--s3);
  bottom:0;
  height:2px;
  background:var(--accent);
  transform:scaleX(0);
  transform-origin:left;
  transition:transform var(--t-fast) var(--ease-out);
}
/* touch fires :hover on tap, so the hover shift is gated to real pointers */
@media (hover:hover) and (pointer:fine){
  .nav-pills .nav-link:hover{color:var(--accent-ink)}
}
/* Hasta ahora la pestana activa y las demas pesaban lo mismo —600 las dos— y solo cambiaban
   de color y de subrayado. Esto anade la jerarquia que faltaba: 500 en reposo, 800 activa, y
   el paso de una a otra recorre el eje en vez de saltar.
   Hace falta el eje continuo, no tres instancias sueltas: por eso la peticion de fuentes pide
   ahora 400..800 y 400..600 en vez de pesos separados por comas. Una fuente variable ademas
   pesa menos que las tres estaticas que se bajaban antes. */
.nav-pills .nav-link{font-variation-settings:"wght" 500}
.nav-item.active .nav-link{color:var(--accent-ink);font-variation-settings:"wght" 800}
.nav-item.active .nav-link::after{transform:scaleX(1)}
.nav-pills .nav-link:focus-visible{outline:2px solid var(--accent-ink);outline-offset:3px}

/* "Special menus" separator — Kids / Gluten Free / Vegan are not courses */
.nav-divider{
  display:flex;
  align-items:center;
  gap:var(--s2);
  margin:var(--s1) var(--s3) var(--s1) 0;
  padding:5px 0 6px;
  color:var(--muted);
  font-family:var(--title-font);
  font-size:12px;
  font-weight:600;
  line-height:30px;
  text-transform:uppercase;
  letter-spacing:.1em;
  white-space:nowrap;
}
.nav-divider::before{content:"";width:1px;height:20px;background:var(--border)}
.tab-content{margin-top:0}
.tab-pane{display:none}
.tab-pane.active{display:block}

/* ---------- subcategory block ---------- */
/* A quiet line under the tab title — secondary text, no box, no new component */

.menu-group + .menu-group{margin-top:var(--s5)}
.tab-pane > .menu-group:first-child > .menu-group-title{margin-top:var(--s3)}
.menu-group-title{
  color:var(--accent-ink);
  font-family:var(--title-font);
  font-size:13px;
  font-weight:600;
  line-height:normal;
  text-transform:uppercase;
  /* small caps read tighter than they measure — tracking opens up as size drops */
  letter-spacing:.12em;
  /* El filete ya no va DEBAJO del rotulo: sale de el y llega hasta el margen, a la altura
     de la linea. Es como se separan las secciones en una revista y como se separaban en una
     carta impresa, y ademas devuelve al rotulo el peso que perdia con una raya de punta a
     punta encima. Antes eran 2px de teal a sangre 37 veces en la misma pagina: la marca mas
     de plantilla que habia en pantalla. */
  margin-bottom:var(--s2);
}
.menu-group-title{display:flex;align-items:center;gap:var(--s1)}
.menu-group-title::after{
  content:"";
  flex:1 1 auto;
  height:1px;
  margin-left:var(--s1);
  background:var(--border);
}
.group-icon{
  flex:0 0 auto;
  display:inline-flex;
  /* accent-ink, matching the heading it sits beside: raw --accent is 2.1:1 on cream and
     the shape stopped reading at 17px */
  color:var(--accent-ink);
}
.group-icon svg{width:17px;height:17px}

/* diet marks — informational, so they carry a label rather than aria-hidden */
.diet-marks{display:inline-flex;align-items:center;gap:5px;margin-left:var(--s1);vertical-align:1px}
.diet{display:inline-flex;color:var(--accent-ink)}
.diet svg{width:14px;height:14px}

.menu-legend{
  margin-top:var(--s5);
  padding-top:var(--s3);
  border-top:1px solid var(--hairline);
  font-family:var(--body-font);
}
/* The marks are the quiet half — a convenience, and explicitly not a declaration. */
.legend-marks{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:var(--s1) var(--s3);
  color:var(--muted);
  font-size:calc(13px * var(--escala));
  line-height:calc(20px * var(--escala));
}
.legend-item{display:inline-flex;align-items:center;gap:6px}
.legend-caveat{flex:1 1 260px;min-width:0}
/* The notice is the half the restaurant actually leans on when someone asks, so it carries
   the weight: full-strength ink at 16:1 rather than the muted whisper the marks get. */
.legend-allergens{
  margin-top:var(--s3);
  /* Se sale de la calle del contenido para quedarse a 8 del borde de la tarjeta, igual que la
     portada. Como vive dentro de la columna de texto, la unica forma es tirar de ella hacia
     fuera lo que mide esa calle y devolverle los 8. Al leer --gutter cuadra sola en los cuatro
     breakpoints. */
  margin-left:calc(var(--s1) - var(--gutter));
  margin-right:calc(var(--s1) - var(--gutter));
  padding:var(--s3);
  border-radius:var(--r-sheet);
  background:var(--chip);
  color:var(--ink);
  font-size:14px;
  line-height:22px;
}
/* From tablet up the panel spans the whole column and turns into label + text, so the width
   is used without stretching two sentences into a 130-character line. */
@media (min-width:768px){
  /* Una sola columna centrada, no dos de anchos dispares. En dos columnas el rótulo se
     centraba en 240px y el texto en 879 — dos centros distintos, que es justo lo que hacía que
     el bloque se viera torcido. Y 879px son unos 120 caracteres por línea, el doble de lo que
     se lee cómodo, así que la medida se acota a 62ch. */
  /* De tablet en adelante el texto usa el ancho entero del bloque, con 18px a cada lado.
     Es una medida larga —más de lo que recomienda cualquier manual— pero son tres frases que
     se leen una vez, no un párrafo en el que uno se instala, y así deja de partir palabras.
     18px va literal a propósito: es lo que se pidió, y no hay token que caiga ahí. */
  .legend-allergens{
    padding:var(--s4) 18px;
    font-size:15px;
    line-height:24px;
  }
  .allergen-head{margin-bottom:var(--s2)}
  .legend-allergens .allergen-head strong{margin-bottom:0}
  .allergen-text{
    max-width:none;
    margin:0;
    /* con la línea tan ancha casi nunca hace falta partir, y partir de más era lo que
       hacía que se viera cortado */
    -webkit-hyphens:none;
    hyphens:none;
  }
}
/* Justificado: los dos lados a plomo y la última línea a la izquierda, que es lo que hace
   text-align-last por defecto. Con la guionación activada, porque justificar una columna
   estrecha sin partir palabras abre ríos de espacio entre ellas; el atributo lang del <html>
   cambia con el idioma, así que el navegador parte según las reglas de cada uno. */
/* La pregunta que abre el parrafo: misma linea y mismo cuerpo, solo mas peso. Es una
   entradilla, no un segundo titulo. */
.allergen-lead{font-weight:700}
.allergen-text{
  display:block;
  text-align:justify;
  -webkit-hyphens:auto;
  hyphens:auto;
}
/* Va después del bloque de tablet a propósito: los dos selectores tienen la misma
   especificidad, así que gana el último y la regla de arriba se comía la de dentro. */

/* El rotulo ALERGENOS, no cualquier <strong> del bloque: la pregunta que abre el parrafo
   tambien es un strong y salia en mayusculas con interletrado, repitiendo el titulo justo
   debajo del titulo. */
.legend-allergens .allergen-head strong{
  display:block;
  font-family:var(--title-font);
  font-size:13px;
  font-weight:600;
  letter-spacing:.12em;
  text-transform:uppercase;
  /* ink, not accent: accent-ink on the chip background measured 4.47:1, and this is the one
     line on the page that must not be borderline. Size, weight and tracking carry the
     hierarchy instead of colour. */
  color:var(--ink);
  margin-bottom:0;
}
/* La palabra arriba y los cuatro iconos debajo: en 180px de columna no caben en la misma
   línea, y apilados leen como un rótulo con su viñeta en vez de como una fila apretada. */
.allergen-head{
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  gap:7px;
  margin-bottom:var(--s1);
}
/* Ocho iconos de 21px son 168px de dibujo. En móvil el bloque deja 239px por dentro, así que
   los 24px de hueco no caben —serían 336— y la fila se partiría en 5+3, que queda ranguada.
   Se usa el hueco más ancho que mantiene la tira en una línea, y los 24 entran de tablet
   para arriba, donde sobra sitio. */
.allergen-icons{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:var(--s2) 10px}
/* Este media query va al final, después de las dos reglas base. Los selectores tienen la misma
   especificidad, así que manda el orden: escrito antes, la regla base lo pisaba y ni el hueco
   de 24 ni el centrado llegaban a aplicarse. Me pasó dos veces seguidas en este mismo bloque. */
@media (min-width:768px){
  .allergen-icons{gap:var(--s2) 24px}
  /* Centrado, no justificado. Con la línea a ancho completo la última cae corta y centrada
     equilibra el bloque; justificar aquí sólo servía para estirar huecos. En móvil se queda
     justificado, que en una columna de seis líneas es lo que se veía bien. */
  .allergen-text{
    text-align:center;
    -webkit-hyphens:none;
    hyphens:none;
  }
}
.allergen{
  display:inline-flex;
  /* muted, no ink: los iconos acompañan al rótulo, no compiten con él. 5.9:1 sobre el chip,
     por encima del 3:1 que pide un elemento gráfico y del 4.5:1 de texto. */
  color:var(--muted);
}
.allergen svg{width:21px;height:21px;display:block}
/* Los iconos dicen de qué va el aviso; su nombre sólo lo necesita quien no los ve. */
.a11y{
  position:absolute;
  width:1px;height:1px;
  padding:0;margin:-1px;
  overflow:hidden;
  clip:rect(0 0 0 0);
  white-space:nowrap;
  border:0;
}

/* ---------- escala de picante ----------
   La barra de arriba es el degradado del rojo de oferta a un granate; cada peldaño lleva su
   color de esa misma interpolación, así que la barra y las marcas cuentan lo mismo. No es un
   color nuevo: es --offer estirado.

   El número de chiles es la información; el color la refuerza pero no la sustituye, porque
   entre el peldaño 3 y el 4 la diferencia de tono es la que es y hay quien no la ve. */
/* Va al final del bloque, pegada a los platos: sin filete que la separe, porque es la leyenda
   de lo que se acaba de leer y no otra sección. */
/* Mismo formato que la línea de «Hay versión vegana»: icono y nombre en horizontal, alineados
   a la izquierda, serif apagado a 13px y el icono a 14. Lo único que cambia es que aquí el
   icono va en rojo, porque el rojo ES el dato. */
.heat-scale{margin-top:var(--s3)}
.con-escala .single-menu-items:last-child{border-bottom:0}
.con-escala .single-menu-items:last-child .menu-content{border-bottom:0}
.heat-steps{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:var(--s1) var(--s3);
  margin:var(--s2) 0 0;
  padding:0;
  list-style:none;
  color:var(--muted);
  font-size:13px;
  line-height:20px;
}
.heat-step{display:inline-flex;align-items:center;gap:6px}
/* Un filete entre un nivel y el siguiente. Seis niveles seguidos sin nada en medio se leen
   como una sola tira de chiles y nombres; con la marca, cada uno es una cosa. Va a tinta al
   14% —marca de agua— y a la derecha de cada nivel menos del último: si la fila envuelve, la
   marca se queda al final de la línea, que se lee como «sigue», y no colgando al principio
   de la siguiente. */
.heat-step:not(:last-child)::after{
  content:"";
  width:1px;
  height:13px;
  margin-left:var(--s2);
  background:color-mix(in srgb,var(--ink) 14%,transparent);
}
.heat-steps{column-gap:var(--s2)}
.heat-marks{display:inline-flex;align-items:center;gap:1px;color:var(--heat)}
.heat-mark{display:inline-flex}
.heat-mark svg{width:14px;height:14px}
.heat-name{font-family:var(--body-font)}

.menu-group-note{
  color:var(--muted);
  font-family:var(--body-font);
  font-size:14px;
  line-height:24px;
  margin-top:var(--s2);
}
.menu-group-title + .menu-group-note{margin-top:var(--s3)}
/* El aviso de cierre de un grupo: distintivo relleno en el acento + texto en tinta. Va
   después de los platos, con el mismo aire que un plato más. */
.menu-group-aviso{
  display:flex;align-items:center;flex-wrap:wrap;gap:var(--s1) var(--s2);
  /* Al mismo eje que los nombres de plato y los rótulos de grupo: con margen lateral propio
     el aviso quedaba 21px metido hacia dentro y se leía como otra cosa. */
  margin:var(--s3) 0 0;
  color:var(--ink);
  font-family:var(--body-font);font-size:14px;line-height:1.45;
}
.tab-aviso{margin-top:var(--s4)}
.aviso-badge{
  display:inline-block;padding:3px 9px;border-radius:var(--r-pill);
  background:var(--accent-ink);color:var(--surface);
  font-family:var(--title-font);font-size:calc(10px * var(--escala));font-weight:700;letter-spacing:.12em;text-transform:uppercase;
}

/* ---------- grid ---------- */
.row{display:flex;flex-wrap:wrap;margin:0 calc(var(--s3) * -1)}
.col-lg-6{width:100%;max-width:100%;padding:0 var(--s3)}
@media (min-width:992px){.col-lg-6{width:50%}}

/* ---------- menu item ---------- */
.single-menu-items{
  display:flex;
  /* the price used to float against the vertical centre of a two-line name; it now sits on
     the name's own first line, which is where the eye looks for it */
  align-items:flex-start;
  justify-content:space-between;
  margin-top:var(--s4);
}
/* flex:1 lets .details fill the column; without it the block is shrink-to-fit and the
   hairline tracks each description's length instead of running to the price */
.single-menu-items .details{display:flex;align-items:flex-start;gap:var(--s3);flex:1;min-width:0}
.item-id{
  flex:0 0 auto;
  min-width:var(--s3);
  color:var(--muted);
  font-variant-numeric:tabular-nums;
  font-family:var(--title-font);
  font-size:14px;
  font-weight:600;
  line-height:24px;
  text-align:right;
}
/* the sauce / ingredient mark, sitting in the same slot the dish number would use */
.item-icon{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  height:30px;
  color:var(--accent-ink);
  opacity:.75;
}
.item-icon svg{width:17px;height:17px}
.item-badge-icon{
  padding:0 5px;
  color:var(--accent-ink);
  line-height:0;
}
.item-badge-icon svg{width:14px;height:14px;display:inline-block;vertical-align:-2px}
/* On desktop the number lives in its own column, so this wrapper carries only the flag and
   sits inline before the name. On phones it becomes the line above the name and holds both. */
.item-tags{display:inline}
.item-tag{
  display:inline-block;
  margin-right:var(--s1);
  padding:1px 7px;
  border-radius:var(--r-pill);
  /* filled, unlike the muted number badge: eight rows out of 326 are meant to be seen.
     Cream on accent-ink is 5.2:1; accent-ink on the chip would have been 4.5 at 10px. */
  background:var(--accent-ink);
  color:var(--surface);
  font-family:var(--title-font);
  font-size:calc(10px * var(--escala));
  font-weight:600;
  line-height:16px;
  letter-spacing:.1em;
  text-transform:uppercase;
  vertical-align:3px;
  white-space:nowrap;
}
/* ---- sold out today ----
   Dimmed, struck and flagged — never hidden: a guest who came for that dish needs to see it
   exists and is off today, not wonder whether the kitchen dropped it.
   The dish sits at .45 rather than the .2 that was asked for. At .2 the name measures about
   1.3:1 against the cream and simply cannot be read; .45 still reads as unmistakably off
   while leaving the dish legible. One number to change if you want it fainter. */
.sold-out-flag{display:none}
/* A sold-out dish has no discount to advertise: the offer flag stands down when the kitchen
   marks the dish off, so the row never reads "20% OFF · SOLD OUT". */
.is-sold-out .item-tag-offer{display:none !important}
.is-sold-out .price-now{display:none !important}
.is-sold-out.has-offer .price-was,
.is-sold-out .has-offer .price-was{display:inline;font-size:inherit;line-height:inherit;color:var(--ink)}
/* Dimming piece by piece rather than on the row: opacity makes a stacking context, so a
   child can never be more opaque than its parent — with .45 on the row the flag itself
   came out washed out, which is the one thing here that has to be read. */
.is-sold-out .menu-content h3 > .i18n,
.is-sold-out .menu-content h3 > .diet-marks,
.is-sold-out .menu-content p,
.is-sold-out h6,
.is-sold-out .item-id,
.is-sold-out .item-badge{opacity:.45}
.is-sold-out .menu-content h3 > .i18n{text-decoration:line-through;text-decoration-thickness:1px}
.is-sold-out h6{text-decoration:line-through;text-decoration-thickness:1px}
.is-sold-out .sold-out-flag{
  display:inline-block;
  margin-right:var(--s1);
  padding:1px 7px;
  border-radius:var(--r-pill);
  background:var(--chip);
  color:var(--muted);
  font-family:var(--title-font);
  font-size:calc(10px * var(--escala));
  font-weight:600;
  line-height:16px;
  letter-spacing:.1em;
  text-transform:uppercase;
  vertical-align:3px;
  white-space:nowrap;
  text-decoration:none;
}

/* A staff affordance, not customer UI: it lets the sales rep show the offer outside its
   window without pretending it is live — the note under the heading still states the hours.
   Deliberately faint (it fails the 3:1 guidance for UI controls, which is the point), and it
   reaches full contrast on hover and on keyboard focus so it can still be found and operated.
   The 18px glyph carries a 44px hit area. */
/* ---- el carrusel de cabecera ----
   Comparte la clase .food-menu-tab con el contenido a proposito: asi el margen lateral de las
   fotos y el de los platos salen de la MISMA regla y no pueden separarse cuando alguien toque
   uno de los cuatro breakpoints.

   El desplazamiento es scroll nativo con scroll-snap. Sin libreria y sin JS para el gesto: en
   un movil eso da la inercia del sistema, que ninguna implementacion propia iguala, y en un
   navegador viejo degrada a una tira que se arrastra. El JS solo pinta las fotos, mueve los
   puntos y responde a las flechas.

   NO se pasa solo. Un carrusel con reproduccion automatica es movimiento perpetuo en la
   primera pantalla de una carta que se lee durante minutos, y este proyecto no se lo permite.
   Ademas roba el control: la foto que te interesaba se va sola. */
/* La foto no usa la calle del contenido: usa el mismo aire que deja la tarjeta por arriba, y
   lo mismo por los lados. Una portada tiene mas presencia pegada al borde que metida en la
   columna de texto, y el resultado es un marco de 13 igual por los tres lados.
   Por eso NO lleva la clase .food-menu-tab, que es la que da la calle del contenido. */
.hero{margin:0 0 var(--s4);padding:0 var(--s1)}
.hero[hidden]{display:none}
.hero-frame{
  position:relative;
  /* 3:2 en movil y tablet. La caja manda sobre el original: la foto puede venir en la
     proporcion que sea, recorta el navegador — cambiar este numero no obliga a volver a
     subir nada. En escritorio se aplana a 2:1 mas abajo: es la misma foto, con menos
     recorte por los lados y mas por arriba y abajo. */
  aspect-ratio:3 / 2;
  /* Arriba, concéntrico con la tarjeta: el marco va 8px (--s1) por dentro de un radio de 34,
     así que el radio que se VE igual es 34 − 8 = 26 — con 34 a secas el canalillo crema se
     engorda en la esquina. Abajo se queda el radio de hoja, que es lo que separa la foto del
     título. */
  /* Radio concéntrico: el de la tarjeta MENOS los 8px que la foto está metida hacia dentro.
     Con el mismo número en las dos, el hueco entre ambas curvas pasa de 8px en los lados a
     11,3 (8·raiz de 2) en la diagonal de la esquina, y ese ensanchamiento se lee como que la
     foto está menos redondeada. Restando el margen, el hueco es 8 en todo el recorrido y las
     dos curvas se leen paralelas. Abajo, el radio de siempre. */
  border-radius:calc(var(--radio-tarjeta) - var(--s1)) calc(var(--radio-tarjeta) - var(--s1)) var(--r-sheet) var(--r-sheet);
  overflow:hidden;
  /* el hueco no es blanco mientras cargan: es el gris del propio sistema */
  background:var(--chip);
}
.hero-track{
  display:flex;
  height:100%;
  margin:0;
  padding:0;
  list-style:none;
  overflow-x:auto;
  overscroll-behavior-x:contain;
  scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
}
.hero-track::-webkit-scrollbar{display:none}
.hero-track:focus-visible{outline:3px solid var(--accent-ink);outline-offset:-3px}
/* Con una sola foto no hay nada que deslizar, y dejar el scroll vivo permite arrastrarla
   fuera de su sitio sin que vuelva. */
.hero.is-single .hero-track{overflow-x:hidden}
.hero-slide{
  flex:0 0 100%;
  height:100%;
  scroll-snap-align:center;
  scroll-snap-stop:always;
}
.hero-slide img{
  display:block;
  width:100%;
  height:100%;
  object-fit:cover;
  opacity:0;
  transition:opacity var(--t-sheet-in) var(--ease-out);
}
.hero-slide img.is-ready{opacity:1}

/* ---- las flechas ----
   Solo con raton: en un movil se desliza con el dedo y dos botones encima de la foto serian
   dos estorbos. */
.hero-arrow{
  position:absolute;
  top:50%;
  z-index:2;
  display:none;
  align-items:center;
  justify-content:center;
  width:38px;
  height:38px;
  margin-top:-19px;
  padding:0;
  border:0;
  border-radius:var(--r-pill);
  background:var(--surface);
  color:var(--ink);
  box-shadow:var(--lift-fab);
  cursor:pointer;
  transition:opacity var(--t-fast) ease,transform var(--t-press) var(--ease-out);
}
.hero-arrow svg{width:20px;height:20px}
.hero-prev{left:var(--s2)}
.hero-next{right:var(--s2)}
.hero-arrow:active{transform:scale(.92)}
.hero-arrow:disabled{opacity:0;pointer-events:none}
.hero-arrow:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
@media (hover:hover) and (pointer:fine){
  .hero:not(.is-single) .hero-arrow{display:flex}
}

/* ---- los puntos ----
   El punto es de 8px pero se toca en 44: el area de dedo la da el padding del boton, no el
   dibujo. Es la misma regla que el resto de la carta. */
/* Dentro de la foto, abajo y al centro. Fuera se comia una franja de la tarjeta para tres
   puntos y separaba la foto del titulo; dentro no cuesta un pixel de alto.
   Sobre una imagen que no controlo hacen falta las dos cosas: el punto claro y una sombra
   suave debajo, porque un punto crema sobre un cielo blanco no existe. */
.hero-dots{
  position:absolute;
  left:0;
  right:0;
  bottom:2px;
  z-index:2;
  display:flex;
  justify-content:center;
  align-items:center;
  gap:2px;
}
.hero.is-single .hero-dots{display:none}
/* Lo que separa un punto de otro no es el gap: es el ancho del botón, que lleva el punto
   centrado en su área de dedo. Con 26 de botón y 4 de gap quedaban 23px de aire entre puntos
   de 7 — un racimo desparramado. Con 22 y 2 quedan 16 entre puntos de 8, y los centros siguen
   a 24, que es el mínimo que pide WCAG 2.2 para objetivos contiguos. */
.hero-dots{gap:2px}
.hero-dot{
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  width:22px;
  height:32px;
  padding:0;
  border:0;
  background:transparent;
  cursor:pointer;
}
/* El punto de la foto que se está viendo no crece: se ESTIRA hasta una píldora, y los demás
   se quedan redondos. Dice dos cosas de un vistazo —cuál miras y cuántas hay— sin depender
   sólo de la opacidad, que sobre una foto clara casi no se ve.

   Se anima el ancho, y es la excepción a la regla de este proyecto de animar sólo transform y
   opacity. La alternativa era un scaleX, que a 7px de alto y radio de píldora deforma los dos
   extremos en óvalos; y el coste real aquí es nulo: cinco elementos de 7px dentro de un flex
   aislado, sin texto alrededor que rehacer.

   La curva lleva un rebote corto (el .34,1.56 del final) porque imita el muelle del original y
   porque el gesto lo pide: el dedo empuja la foto y el punto acompaña. */
.hero-dot::before{
  content:"";
  width:8px;
  height:8px;
  border-radius:999px;
  background:var(--surface);
  opacity:.55;
  box-shadow:0 1px 3px rgba(0,0,0,.45);
  transition:width 320ms cubic-bezier(.34,1.56,.64,1),opacity var(--t-fast) ease;
}
.hero-dot[aria-current="true"]::before{width:21px;opacity:1}
/* El halo que sale del punto al llegar: nace en el propio punto y se desvanece hacia fuera.
   Sólo se dibuja mientras dura, y sólo en el activo, así que no hay nada animándose en bucle. */
.hero-dot::after{
  content:"";
  position:absolute;
  width:8px;
  height:8px;
  border-radius:999px;
  background:var(--surface);
  opacity:0;
  pointer-events:none;
}
.hero-dot[aria-current="true"]::after{animation:halo-punto 620ms var(--ease-out)}
@keyframes halo-punto{
  from{opacity:.45;transform:scale(1)}
  to{opacity:0;transform:scale(3.2)}
}
.hero-dot:focus-visible{outline:2px solid var(--accent-ink);outline-offset:-4px;border-radius:8px}
@media (hover:hover) and (pointer:fine){
  .hero-dot:not([aria-current="true"]):hover::before{opacity:.85}
}
@media (prefers-reduced-motion:reduce){
  .hero-slide img{transition:none}
  /* Sin viaje: el ancho cambia de golpe y el halo no se dibuja. El estado sigue diciéndose
     con la forma, que es lo que importa. */
  .hero-dot::before{transition:none}
  .hero-dot[aria-current="true"]::after{animation:none}
}
/* Con fotos, la tarjeta no necesita 89px de crema vacia por arriba: solo los justos para que
   el racimo de controles no se le eche encima.
   Con dos clases y no con una: la regla de los breakpoints es .food-menu-tab-wrapper a secas
   y va mas abajo en el archivo, asi que con la misma especificidad ganaria ella por orden de
   origen. Ya ha pasado tres veces en este proyecto. */
/* Con foto, los controles van sobre ella y la tarjeta no necesita ni el hueco de 56px ni los
   89 de crema: la imagen empieza donde empieza la tarjeta. */
.food-menu-tab-wrapper.has-hero{padding-top:var(--s1)}

/* ---- la portada, mas plana en escritorio ----
   3:2 en una pantalla ancha es demasiado alto: a 1570 son 1029px de foto y la carta empieza
   por debajo del pliegue. En un movil, en cambio, 3:2 es lo que hace que la portada tenga
   presencia. Asi que la proporcion cambia con el ancho y las fotos no se tocan: el recorte lo
   hace el navegador sobre el mismo archivo.

   Todo lo que va encima de la foto —los controles, los puntos— esta posicionado contra el
   marco, no contra medidas fijas, asi que sigue a la caja sin tocar una linea mas. */
@media (min-width:1024px){
  .hero-frame{aspect-ratio:2 / 1}
}

/* ---- el racimo de la cabecera ----
   Reloj de previsualizacion, lupa e idioma, juntos en la esquina. Absoluto sobre la tarjeta:
   el titulo sigue centrado en su ancho completo y estos no le roban sitio. */
/* ---- tamaño del texto ----
   Tres botones que dicen lo que hacen con el tamaño de su propia letra: no hay palabra que
   traducir a tres idiomas ni icono que descifrar. Viven en la misma barra que el idioma y la
   lupa, que es donde ya está todo lo que se toca una vez y no se vuelve a tocar.

   44 de alto, no 40 como el selector de idioma: es el control que va a usar quien peor apunta
   con el dedo, y ahorrarle 4px al hero no compensa. El selector sube a 44 también, para que
   los dos lean como una sola fila. */
.txt-size{
  display:flex;
  align-items:center;
  gap:2px;
  padding:4px;
  border-radius:var(--r-pill);
  background:color-mix(in srgb, var(--surface) 82%, transparent);
  -webkit-backdrop-filter:blur(10px);
  backdrop-filter:blur(10px);
  box-shadow:var(--lift-fab);
}
.txt-size-btn{
  display:flex;
  align-items:center;
  justify-content:center;
  min-width:38px;
  height:36px;
  padding:0 6px;
  border:0;
  border-radius:var(--r-pill);
  background:transparent;
  color:var(--muted);
  font-family:var(--title-font);
  font-weight:600;
  line-height:1;
  cursor:pointer;
  transition:background-color var(--t-fast) ease,color var(--t-fast) ease,transform var(--t-press) var(--ease-out);
}
.txt-size-btn:active{transform:scale(.94)}
.txt-size-btn[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.txt-size-btn:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
/* Cada botón a su tamaño: la A pequeña es la normal, la grande es la grande. */
.txt-size-btn:nth-child(1){font-size:13px}
.txt-size-btn:nth-child(2){font-size:16px}
.txt-size-btn:nth-child(3){font-size:19px}
@media (hover:hover) and (pointer:fine){
  .txt-size-btn:not([aria-pressed="true"]):hover{background:var(--chip);color:var(--ink)}
}
@media (prefers-reduced-motion:reduce){
  .txt-size-btn{transition:none}
  .txt-size-btn:active{transform:none}
}

.head-tools{
  position:absolute;
  top:4px;
  right:4px;
  z-index:6;
  display:flex;
  align-items:center;
  gap:4px;
  transition:top var(--t-fast) var(--ease-out),right var(--t-fast) var(--ease-out);
}
/* ---- con foto, los controles van ENCIMA de ella ----
   Metidos 13px por sus dos lados desde la esquina de la foto. Alinearlos con el margen del
   contenido —34— los dejaria pegados al borde de la imagen, que no es "mismo margen": es
   tocarse.

   Y ahi debajo puede haber cualquier cosa, asi que dejan de ser cremas planas y pasan a ser
   vidrio: fondo casi opaco mas desenfoque, que es como se resuelve un control sobre una foto
   que no controlas. Quien pida menos transparencia lo recibe solido. */
.has-hero .head-tools{
  /* El marco de la foto son 8; los controles van 13 MAS adentro, ya sobre la imagen. Son dos
     cosas distintas a proposito: 8 es cuanto respira la portada contra el borde de la tarjeta,
     y 13 es cuanto se separan los botones de una esquina que tiene 21 de radio. Con 8 tambien
     aqui se montarian sobre la curva. */
  top:calc(var(--s1) + var(--s2));
  right:calc(var(--s1) + var(--s2));
  padding:4px;
  border-radius:var(--r-pill);
  background:color-mix(in srgb,var(--surface) 78%,transparent);
  backdrop-filter:blur(12px) saturate(140%);
  -webkit-backdrop-filter:blur(12px) saturate(140%);
  box-shadow:var(--lift-fab);
}
.has-hero .head-tools .lang-trigger,
.has-hero .head-tools .nav-search{border-color:transparent;background:transparent}
@media (prefers-reduced-transparency:reduce){
  .has-hero .head-tools{background:var(--surface);backdrop-filter:none;-webkit-backdrop-filter:none}
}
/* ---- oferta por franja ----
   Un cuarto color, a propósito: un descuento que no es rojo no se lee como descuento, y esto
   es una señal funcional, no decoración. Crema sobre #C62828 es 5.2:1.

   Quién se ve y quién no lo decide el runtime con el atributo hidden y con la clase
   has-offer, no una clase global en <html>. Antes iba al revés y fue un error caro: cuando
   las ofertas pasaron a configurarse desde el panel, el JS dejó de poner esa clase y toda la
   oferta se calculaba bien pero no se veía. Un solo dueño del estado. */
.item-tag-offer{display:inline-block;background:var(--offer)}
/* Una sola banda, encima de las pestañas. Antes iba una nota bajo el título de cada categoría
   en oferta: con dos o tres categorías se repetía la misma frase tres veces, y con platos
   sueltos aparecía bajo un epígrafe que no gobernaba los platos rebajados. Arriba se lee una
   vez, antes de elegir sección, que es cuando todavía puede cambiar lo que alguien pide. */
.offer-banner{
  display:flex;
  flex-direction:column;
  /* De lado a lado de la tarjeta: sin margen y sin caja. Una franja roja con esquinas
     redondeadas era un cartel pegado encima de la carta; dos lineas que la cruzan entera se
     leen como parte de ella. Y deja de competir con la etiqueta roja que ya llevan los precios
     rebajados: el rojo se queda donde importa, en el precio. */
  /* 21 y no 34: el aire de antes pesaba demasiado para una banda que ya es alta. Se queda en
     el escalon de la escala y no en un 24 suelto — en esta carta no hay medidas sueltas. */
  margin:var(--s3) 0 0;
  /* Ocho pixeles entre el filete y el texto, arriba y abajo por igual. El aire de fuera lo da
     el margen; este relleno es solo la distancia a las lineas. */
  padding:var(--s1) 0;
  border-top:1px solid var(--hairline);
  border-bottom:1px solid var(--hairline);
  /* ---- LOS VALORES QUE SE TOCAN ----
     Tamano, peso, interletrado e interlineado, todos juntos y en un solo sitio. */
  font-family:var(--title-font);
  font-size:clamp(26px,7.2vw,40px);        /* el alto de la letra */
  font-weight:800;                          /* el eje de peso llega hasta 800 */
  letter-spacing:0.02em;                    /* separacion entre letras */
  line-height:0.94;                         /* separacion entre las dos lineas */
  text-transform:uppercase;
  /* ---- el color, en una sola perilla ----
     El color es el del texto y lo que lo aclara es la opacidad. Da el mismo resultado que
     mezclarlo con el papel, pero deja UN numero que tocar en vez de un porcentaje dentro de una
     funcion, y no depende de que el navegador tenga color-mix.

     0.48 es el suelo, no una preferencia: por debajo se cae de 3:1 y este texto deja de cumplir
     accesibilidad para texto grande. Mas bajo se ve mas marca de agua y menos se lee. */
  color:var(--ink);
}
/* La capa que recorta. El texto sale y entra por los lados en vez de aparecer cortado contra
   el borde; los filetes se quedan fuera de aqui y llegan enteros de lado a lado. */
.offer-mask{
  overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 40px),transparent);
  mask-image:linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 40px),transparent);
}
/* ---- las marquesinas ----
   Este proyecto no se permite movimiento perpetuo, y una marquesina es exactamente eso. La
   excepcion se sostiene por una razon: esta banda solo existe mientras corre la franja de la
   oferta, no esta ahi siempre, y su mensaje entero ES la urgencia. Fuera de su horario no hay
   nada moviendose en la pantalla.

   Dos lineas en sentidos contrarios. Cada carril lleva el mensaje repetido y luego el conjunto
   duplicado; la animacion recorre justo la mitad, asi que al terminar el segundo juego esta
   exactamente donde empezo el primero y el salto no se ve. Solo se anima transform, que va en
   la GPU y no toca el hilo principal mientras el cliente lee la carta.

   La duracion la calcula el runtime a partir del ancho para que la velocidad sea la misma —60
   px por segundo— con un mensaje corto o largo. Con una duracion fija, un texto largo pasaria
   disparado y uno corto se arrastraria. */
.offer-track{
  display:flex;
  align-items:center;
  flex:0 0 auto;
  width:max-content;
  /* La opacidad va aqui y no en el bloque: la del bloque es la de la ENTRADA —de 0 a 1 al
     aparecer— y una sola propiedad no puede hacer las dos cosas. Separadas, cada una manda en
     lo suyo y esta se puede tocar sin romper aquella. */
  opacity:.48;
  will-change:transform;
  animation:marquesina var(--marquesina,22s) linear infinite;
}
.offer-track-inv{animation-name:marquesina-inv}
.offer-unidad{display:flex;align-items:center;gap:var(--s3);padding-right:var(--s3);white-space:nowrap}
.offer-punto{
  flex:0 0 auto;
  width:.34em;
  height:.34em;
  border-radius:50%;
  background:currentColor;
}
@keyframes marquesina{
  from{transform:translateX(0)}
  to{transform:translateX(-50%)}
}
@keyframes marquesina-inv{
  from{transform:translateX(-50%)}
  to{transform:translateX(0)}
}
/* Se para al pasar el raton por encima: si algo se mueve y quieres leerlo entero, tienes que
   poder pararlo. En movil no aplica y no hace falta: el mensaje pasa entero cada vuelta. */
@media (hover:hover) and (pointer:fine){
  .offer-banner:hover .offer-track{animation-play-state:paused}
}
/* Quien pide menos movimiento recibe el mensaje quieto y centrado, en una sola linea. */
@media (prefers-reduced-motion:reduce){
  .offer-banner{
    align-items:center;
    padding:var(--s3) var(--gutter);
    text-align:center;
  }
  .offer-mask{-webkit-mask-image:none;mask-image:none}
  .offer-track{animation:none;width:auto;flex:1 1 auto;justify-content:center}
  .offer-track-inv{display:none}
  .offer-unidad{white-space:normal;padding-right:0}
}
.offer-banner[hidden]{display:none}
/* La franja se abre y se cierra sola con el reloj del restaurante, asi que una carta que
   lleve un rato abierta ve aparecer la banda de golpe a mitad de lectura. Eso es justo el
   caso en que una entrada tiene trabajo: no adorna, evita que algo se materialice encima del
   texto. Una vez, al aparecer; despues se queda quieta. */
.offer-banner{opacity:0;transform:translateY(-6px);
  transition:opacity var(--t-sheet-in) var(--ease-out),transform var(--t-sheet-in) var(--ease-out)}
.offer-banner.is-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){
  .offer-banner{transform:none;transition:opacity var(--t-fast) ease}
  .offer-banner.is-in{transform:none}
}
.offer-banner svg{width:20px;height:20px;flex:0 0 auto}


.has-offer{display:block;text-align:right}
.has-offer .price-now{display:block;color:var(--offer)}
.has-offer .price-was{
  display:block;
  color:var(--muted);
  font-size:14px;
  line-height:18px;
  text-decoration:line-through;
  text-decoration-thickness:1px;
}
/* [hidden] tiene que ganar a cualquier display de clase: sin esto una etiqueta oculta sigue
   viéndose, porque .item-tag-offer{display:inline-block} empata en especificidad y va después. */
[hidden]{display:none !important}

.item-badge{
  display:none;
  margin-right:8px;
  color:var(--muted);
  font-family:var(--body-font);
  font-size:calc(13px * var(--escala));
  font-weight:600;
  font-variant-numeric:tabular-nums;
  vertical-align:1px;
  white-space:nowrap;
}
/* The rule now runs the full width of the column, so it carries the eye from the dish name
   to its price. Capped at 350px it stopped 220px short and the two read as unrelated. */
/* El filete, a la misma distancia del plato de arriba que del de abajo: con 8 arriba y 21
   abajo se leía como el subrayado de la descripción y no como la línea que separa dos platos.
   13 y 13 lo centran, y de paso el hueco total baja de 30 a 26. */
.menu-content{width:100%;padding-bottom:var(--s2);border-bottom:1px solid var(--hairline)}
/* El último plato de cada grupo no lleva filete: el rótulo del grupo siguiente ya trae el
   suyo, y dos rayas seguidas era una de más. En móvil las dos columnas se apilan, así que el
   último es el de la columna derecha —o el de la izquierda si la derecha va vacía—; de 992px
   en adelante van lado a lado y lo es el último de cada columna. */
.col-lg-6:last-child > .single-menu-items:last-child .menu-content{border-bottom:0}
.row:not(:has(.col-lg-6:last-child .single-menu-items)) .col-lg-6:first-child > .single-menu-items:last-child .menu-content{border-bottom:0}
@media (min-width:992px){
  .col-lg-6 > .single-menu-items:last-child .menu-content{border-bottom:0}
}
.menu-content h3{
  color:var(--ink);
  font-family:var(--title-font);
  font-size:20px;
  font-weight:600;
  line-height:30px;
  letter-spacing:-0.01em;
  font-optical-sizing:auto;
  /* source section used text-transform:capitalize; dropped so dish names render exactly
     as written in menu.md ("Sauce or Pickle", "(with bone)") */
  text-transform:none;
  margin-bottom:3px;
}
.menu-content p{
  color:var(--muted);
  font-family:var(--body-font);
  font-size:14px;
  font-weight:400;
  line-height:24px;
  /* the rule spans the column, but the sentence still stops at a readable measure */
  max-width:46ch;
  margin-top:-.3em;
}
.single-menu-items h6{
  color:var(--ink);
  text-align:right;
  font-family:var(--title-font);
  font-size:18px;
  font-weight:600;
  /* matches the dish name's line box so the price lands on the same baseline */
  line-height:30px;
  white-space:nowrap;
  padding-left:var(--s3);
  font-variant-numeric:tabular-nums;
}

/* ---------- footer ---------- */
.site-footer{
  color:var(--muted);
  padding:0 12px 56px;
  text-align:center;
  font-family:var(--body-font);
  font-size:14px;
  line-height:24px;
}
/* El pie va en dos lineas siempre, cortado por el <br> del marcado: la pregunta arriba y la
   respuesta —el enlace— abajo. Si una de las dos aun no cabe en un movil estrecho (el aleman
   es mas largo que las otras dos), balance reparte esa linea en vez de dejar una palabra
   suelta colgando. */
.site-footer p{text-wrap:balance}
/* ---------- category index (phone only) ---------- */
.menu-fab{
  position:fixed;
  left:50%;
  bottom:calc(16px + env(safe-area-inset-bottom));
  transform:translateX(-50%);
  z-index:40;
  display:none;
  align-items:center;
  gap:8px;
  min-height:48px;
  /* 29 y no 22 de relleno: el botón pasa de 148 a 162 de ancho (un 10%) para que el pulgar
     lo acierte sin mirar, que es como se usa una carta con el móvil en una mano. */
  padding:0 29px;
  border:0;
  border-radius:999px;
  /* Del color de la marca, no crema: flotando sobre la tarjeta —que también es crema— el botón
     se perdía en cuanto pasaba por encima de ella. El acento del tema contrasta con las dos
     cosas, con la tarjeta clara y con el fondo oscuro de la página. */
  background:var(--accent);
  color:var(--surface);
  font-family:var(--title-font);
  font-size:15px;
  font-weight:600;
  cursor:pointer;
  box-shadow:var(--lift-fab);
  transition:transform var(--t-press) var(--ease-out);
}
/* translateX(-50%) is doing the centring, so the press scale has to compose with it */
.menu-fab:active{transform:translateX(-50%) scale(.96)}
.menu-fab:focus-visible{outline:2px solid var(--accent-ink);outline-offset:-6px}
@media (max-width:767px){.menu-fab{display:flex}}

.sheet[hidden]{display:none}
.sheet{position:fixed;inset:0;z-index:50}
/* En cuanto empieza a cerrarse deja de recibir toques: si no, durante los 240-400 ms de la
   salida sigue tapando el botón de categorías (z 40) y cada toque ahí vuelve a llamar a
   closeSheet(), que alarga la espera. Era el «botón muerto hasta que hago scroll». */
.sheet:not(.is-open){pointer-events:none}
.sheet-backdrop{
  position:absolute;
  inset:0;
  background:var(--scrim);
  opacity:0;
  transition:opacity var(--t-sheet-out) var(--ease-out);
}
/* ---- la barra de desplazamiento ----
   La del sistema es gris de Windows sobre crema, y ademas se comia la esquina redondeada: se
   dibuja pegada al borde derecho y tapa justo el radio, asi que el panel parecia cortado por
   ahi. Aqui es del color del texto a un cuarto, con la pastilla metida hacia dentro por un
   borde transparente —el truco del background-clip— para que no llegue nunca a la esquina.

   Firefox no admite ::-webkit-scrollbar y Chrome ignoraba scrollbar-color hasta hace poco:
   se declaran las dos cosas y cada navegador coge la suya. */
.sheet-panel{
  scrollbar-width:thin;
  scrollbar-color:color-mix(in srgb,var(--ink) 28%,transparent) transparent;
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  max-height:82dvh;
  overflow-y:auto;
  overscroll-behavior:contain;
  background:var(--surface);
  border-radius:var(--r-sheet) var(--r-sheet) 0 0;
  /* Aire de sobra al final: con sólo 21 la última categoría quedaba pegada al canto y parecía
     que la lista seguía y estaba cortada. 55 dejan claro que ahí se acaba. */
  padding:6px var(--s3) calc(var(--s5) + env(safe-area-inset-bottom));
  box-shadow:var(--lift-sheet);
  /* percentage, so it clears its own height whatever the content */
  transform:translateY(100%);
  transition:transform var(--t-sheet-out) var(--ease-drawer);
}
.sheet-panel::-webkit-scrollbar{width:11px}
.sheet-panel::-webkit-scrollbar-track{background:transparent}
.sheet-panel::-webkit-scrollbar-thumb{
  border:3px solid transparent;
  border-radius:var(--r-pill);
  background:color-mix(in srgb,var(--ink) 24%,transparent);
  background-clip:content-box;
}
@media (hover:hover) and (pointer:fine){
  .sheet-panel::-webkit-scrollbar-thumb:hover{
    background:color-mix(in srgb,var(--ink) 42%,transparent);
    background-clip:content-box;
  }
}

/* El asa se dibuja dentro de la cabecera y no antes: como bloque propio empujaba el título y
   la cruz 16px hacia abajo, y con la cabecera pegada esa altura extra dejaba la cruz fuera del
   panel al bajar la lista. Superpuesta no ocupa alto y se queda donde se ve. */
.sheet-head::before{
  content:"";
  position:absolute;
  left:50%;
  top:7px;
  transform:translateX(-50%);
  width:var(--s4);
  height:4px;
  border-radius:2px;
  background:var(--border);
}
/* A transition, not a keyframe: the sheet can be opened and dismissed in quick succession
   and must retarget from wherever it currently sits, not restart from the bottom.
   It leaves the way it arrived, and leaves faster than it came. */
.sheet.is-open .sheet-panel{transform:translateY(0);transition-duration:var(--t-sheet-in)}
/* Hasta ahora esta hoja solo existia en el movil, asi que ocupar todo el ancho daba igual.
   Con la lupa se abre tambien en escritorio, y una hoja de 1570px de ancho no es una hoja:
   se le pone tope y se centra, anclada abajo como en el movil. */
@media (min-width:768px){
  .sheet-panel{
    left:50%;
    right:auto;
    width:min(520px,calc(100% - var(--s5)));
    transform:translate(-50%,100%);
  }
  .sheet.is-open .sheet-panel{transform:translate(-50%,0)}
}
.sheet.is-open .sheet-backdrop{opacity:1;transition-duration:var(--t-sheet-in)}
/* Pegada arriba: el panel entero es el que hace scroll, así que la cabecera se iba con la
   lista y la cruz desaparecía en cuanto se bajaba un poco — de ahí que pareciera que sólo se
   podía cerrar «volviendo arriba». Ahora se queda, con el papel del tema detrás para que las
   filas pasen por debajo sin transparentarse. */
.sheet-head{
  position:relative;         /* ancla del asa */
  position:sticky;
  /* top:0 y no negativo: con el negativo la cabecera subía 6px al pegarse y la cruz cambiaba
     de sitio entre el estado recién abierto y el estado con la lista bajada. Con 0 se ancla al
     borde del área de scroll —que ya está 6 dentro por el relleno del panel— y no se mueve. */
  top:0;
  z-index:3;
  display:flex;align-items:center;justify-content:space-between;gap:var(--s3);
  margin:0 calc(var(--s3) * -1);
  /* 7 + los 6 del relleno del panel = los 13 de aire que se ven en la esquina. */
  padding:7px var(--s3) var(--s1);
  background:var(--surface);
}
/* Un desvanecido bajo la cabecera para que el corte no sea una línea dura. */
.sheet-head::after{
  content:"";
  position:absolute;
  left:0;right:0;top:100%;
  height:var(--s2);
  background:linear-gradient(var(--surface),var(--surface-0));
  pointer-events:none;
}
.sheet-head h2{
  color:var(--ink);
  font-family:var(--title-font);
  font-size:22px;
  font-weight:800;
  line-height:32px;
}
.sheet-close{
  display:flex;
  align-items:center;
  justify-content:center;
  width:44px;
  height:44px;
  /* En la esquina, con el mismo aire arriba que a la derecha: 13 y 13 desde el borde del
     panel. El de arriba lo pone el relleno de la cabecera; éste resta del relleno lateral. */
  margin-right:-8px;
  border:0;
  border-radius:var(--r-pill);
  background:var(--chip);
  color:var(--ink);
  cursor:pointer;
  transition:transform var(--t-press) var(--ease-out);
}
.sheet-close:active{transform:scale(.92)}
.sheet-close:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
.sheet-label{
  margin:var(--s3) 0 4px;
  color:var(--muted);
  font-family:var(--title-font);
  font-size:12px;
  font-weight:600;
  line-height:24px;
  text-transform:uppercase;
  letter-spacing:.1em;
}
.sheet-list{list-style:none;margin:0;padding:0}
.sheet-list li + li .sheet-item{border-top:1px solid var(--hairline)}
.sheet-item{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:var(--s3);
  width:100%;
  min-height:var(--s5);
  padding:var(--s1) 0;
  border:0;
  background:transparent;
  color:var(--ink);
  font-family:var(--title-font);
  font-size:18px;
  font-weight:600;
  text-align:left;
  cursor:pointer;
  transition:transform var(--t-press) var(--ease-out),color var(--t-fast) ease;
  /* the press scales toward the finger's side of the row, not its centre */
  transform-origin:left center;
}
.sheet-item:active{transform:scale(.985)}
.sheet-item:focus-visible{outline:2px solid var(--accent-ink);outline-offset:-2px}
.sheet-item[aria-current="true"]{color:var(--accent-ink)}
/* the dot is redundant with the colour, so state never depends on colour alone */
.sheet-item .sheet-item-name{flex:1 1 auto}
.sheet-item[aria-current="true"] .sheet-item-name::before{
  content:"";
  display:inline-block;
  width:8px;
  height:8px;
  margin-right:10px;
  border-radius:50%;
  background:var(--accent);
  vertical-align:middle;
}
.sheet-item-icon{
  flex:0 0 auto;
  display:inline-flex;
  color:var(--accent-ink);
  opacity:.85;
}
.sheet-item-icon svg{width:18px;height:18px}
.sheet-item-count{
  flex:0 0 auto;
  color:var(--muted);
  font-family:var(--body-font);
  font-size:14px;
  font-weight:400;
  font-variant-numeric:tabular-nums;
}

/* El pie es el único texto que se apoya en la página y no en la tarjeta. Sobre el navy va en
   crema: 16:1. Cuando el fondo era teal iba en navy por lo mismo — se mide y se decide. */
.site-footer{color:var(--surface)}
/* La marca, en el metal del tema: es el único sitio donde el metálico sale sin oscurecer,
   porque el fondo de la página es oscuro y ahí sí se lee. */
.site-footer .brand{color:var(--metal)}
/* El enlace subrayado es la única cosa pulsable del pie: se marca como tal y se le da alto de
   dedo sin romper la línea, con padding vertical en vez de display:block. */
.footer-wa{
  color:var(--surface);
  font-weight:600;
  text-decoration:underline;
  text-underline-offset:3px;
  text-decoration-thickness:1px;
  padding:6px 0;
}
.footer-wa:focus-visible{outline:2px solid var(--surface);outline-offset:2px;border-radius:4px}
@media (hover:hover) and (pointer:fine){
  .footer-wa:hover{text-decoration-thickness:2px}
}
.site-footer .brand{
  font-family:var(--title-font);
  font-weight:600;
  letter-spacing:.04em;
}

/* ---------- entrance ----------
   There isn't one, deliberately. The page arrived with a WOW-style reveal: the title was held
   at visibility:hidden until an observer fired, then slid 100% of its own height over a full
   second. That is half a second of empty card above the fold on every single load, it delays
   the largest text on the page (and with it LCP), and if the script ever fails the title never
   appears at all. Softening it to a 320ms fade did not fix the premise: this is a menu people
   reopen to check a price, so a load animation is a tax they pay every time for a flourish
   they see once. The heading now paints with the document. Motion on this page is spent where
   it answers the user — pressing, switching category, opening the index. */

/* ---------- tab content ----------
   Switching category used to swap two display values, so 76 dishes replaced 9 with no bridge.
   A short fade is the whole treatment: this is the page's primary action and it has to stay
   instant. No stagger on the rows — 326 lines of prices are being read, not watched. */
.tab-pane{opacity:1}
.js .tab-pane.active{
  animation:pane-in var(--t-fast) var(--ease-out) both;
}
@keyframes pane-in{
  from{opacity:0;transform:translateY(4px)}
  to{opacity:1;transform:none}
}

/* ---------- breakpoints ---------- */
@media (max-width:1600px){
  :root{--gutter:var(--s6)}
}
@media (max-width:1399px){.single-menu-items{margin-top:var(--s2)}}
@media (max-width:1199px){
  .food-menu-tab-wrapper{padding:var(--s5) 0}
  :root{--gutter:var(--s5)}
}
@media (max-width:991px){
  .menu-group + .menu-group{margin-top:var(--s4)}
}
@media (max-width:767px){
  /* ---- el bloque del nombre, centrado entre la foto y las categorías ----
     El rótulo y el nombre del restaurante se leen como una sola cosa, así que llevan el mismo
     aire arriba y abajo (32) y entre ellos el mínimo de la escala (8). Los 32 los pide el
     cliente y no son escalón —el de al lado es 34—, pero es su marca y su decisión.
     El tercer hueco se compone: la barra tiene 72 de alto con el chip de 44 centrado, así que
     sobran 14 dentro; el margen de la barra se queda en 18 para que el hueco visible entre el
     nombre y el chip sea también 32. */
  .hero{margin-bottom:32px}
  .title-area .sub-title{margin-bottom:8px}

  /* 21 y no 34: en un móvil de 375 la carta tiene 349 de tarjeta y cada píxel de margen se
     lo quita al nombre del plato. Con 21 el contenido gana 26 de ancho y siguen quedando dos
     escalones de aire (13 de la pantalla a la tarjeta, 21 de la tarjeta al texto). */
  :root{--gutter:var(--s3)}
  /* El aire de arriba, el mismo que la tarjeta deja a cada lado (13). Antes eran 34 arriba y
     13 a los lados: en un móvil eso son dos filas de plato de espacio muerto. */
  .food-menu-section{margin-top:var(--s2)}
  .food-menu-tab-wrapper{--radio-tarjeta:var(--r-sheet);border-radius:var(--radio-tarjeta)}

  /* On the phone the bar is also sticky, so a category can be changed from anywhere in a
     76-item list without scrolling back to the top. It is a translucent layer rather than an
     opaque strip: the menu stays visible sliding underneath, which is what tells you the
     page is still moving while the chrome stays put. */
  .tab-nav{
    position:sticky;
    top:0;
    z-index:30;
    /* Sangra hasta el borde de la tarjeta tirando de sí misma lo que mide la calle. El tirón
       lo lee de --gutter y no de un número escrito a mano: cuando la calle bajó de 34 a 21, el
       valor fijo dejó la barra 13px más ancha que la tarjeta por cada lado y se salía. */
    /* 18 arriba: la barra mide 72 con el chip de 44 centrado, así que dentro sobran 14; 18+14
       dejan el hueco visible entre el nombre y el chip en 32, el mismo que hay sobre el rótulo.
       Va en el atajo y no en un margin-top aparte, que esta misma regla pisaría. */
    margin:18px calc(var(--gutter) * -1) 0;
    /* 72 de alto con los chips (44) centrados dentro: la barra pegada es lo único fijo de la
       pantalla y ese aire es lo que la separa de la foto arriba y de la lista abajo. */
    display:flex;
    align-items:center;
    min-height:72px;
    padding-bottom:0;
    /* El papel del tema, no una crema escrita a mano: con otra paleta la barra pegada salía
       de un color distinto al de la tarjeta y se veía la banda. La primera línea es el
       respaldo sólido para quien no tenga color-mix. */
    background:var(--surface);
    background:color-mix(in srgb,var(--surface) 82%,transparent);
    backdrop-filter:blur(14px) saturate(140%);
    -webkit-backdrop-filter:blur(14px) saturate(140%);
    transition:box-shadow var(--t-fast) var(--ease-out);
  }
  /* a soft edge where the sheet meets moving content, not a hard 1px divider */
  /* La sombra de la barra pegada sale del color de texto del tema, no de un navy fijo. */
  .tab-nav.is-stuck{box-shadow:0 10px 18px -16px var(--ink)}
  .tab-nav.is-stuck{box-shadow:0 10px 18px -16px color-mix(in srgb,var(--ink) 85%,transparent)}
  /* 34 y no 21: el fundido tiene que cubrir el chip que asoma para que se vea desaparecer
     bajo el borde y no cortado a hachazo. */
  .tab-nav::before,.tab-nav::after{bottom:var(--s1);width:var(--s4)}
  .tab-nav::before{background:linear-gradient(90deg,var(--surface) 20%,var(--surface-0))}
  .tab-nav::after{background:linear-gradient(270deg,var(--surface) 20%,var(--surface-0))}

  /* ---- el pie, centrado en su hueco ----
     Aqui abajo hay tres cosas: el borde de la tarjeta, el pie y el boton flotante. El pie
     tiene que quedar a la misma distancia de las otras dos, y no lo estaba: 89 por arriba y
     unos 25 por abajo, porque el relleno inferior se medía contra el final de la pagina y el
     boton flota 64 px por encima de ese final —16 de separacion mas sus 48 de alto.

     Asi que el hueco de abajo se calcula como el de arriba MAS lo que ocupa el boton. Los dos
     salen de var(--s5), que es el mismo valor: si un dia cambia, cambian los dos a la vez. */
  .food-menu-section{margin-bottom:var(--s5)}
  .site-footer{padding-bottom:calc(var(--s5) + 64px + env(safe-area-inset-bottom))}

  .nav-pills{
    gap:var(--s1);           /* the 8px minimum gap between touch targets */
    /* Por la derecha, la calle se queda en 8: los 21 de siempre dejaban el chip siguiente
       asomando 8px, que no se lee como un chip cortado sino como el borde de la tarjeta. Un
       chip partido es la señal universal de «esto sigue»; para eso tiene que verse partido. */
    padding:0 var(--s1) 0 var(--gutter);
    width:100%;
  }
  /* Sin scroll-snap: enganchaba la fila a 21px en reposo —cortando el primer chip— y se
     comía el empujón de bienvenida. El asomo ya lo da la calle de la derecha. */

  /* the number stops being a column and becomes a badge in front of the name,
     which hands the name back ~46px of width */
  /* the number sits on its own line above the name — 01 / Plato / descripción,
     with the highlight flag beside the number when a dish has one */
  .item-id{display:none}
  /* El número, en la misma línea que el nombre. La línea de etiquetas sólo existe cuando hay
     una etiqueta que enseñar: la pone el runtime con .has-tags o con .is-sold-out. */
  .item-tags{display:none}
  .has-tags .item-tags,
  .is-sold-out .item-tags{display:block;width:max-content;margin:0 0 5px;line-height:var(--tags-line)}
  .item-badge{display:inline}
  .item-tag{vertical-align:1px}
  /* That line pushes the dish name down, so the price follows it rather than sitting up
     beside the number. The row carries the class from the generator instead of :has(),
     so alignment does not depend on selector support. */
  .single-menu-items.has-tags h6,
  .single-menu-items.is-sold-out h6{padding-top:calc(var(--tags-line) + 5px)}
  .item-badge-icon svg{vertical-align:-2px;width:15px;height:15px}
  .single-menu-items .details{gap:0}
  /* measured at 390px across all 326 names: 278 fit one line, 46 two, 2 three */
  .menu-content h3{font-size:calc(16px * var(--escala));line-height:calc(22px * var(--escala));margin-bottom:6px}
  .menu-content p{font-size:calc(14px * var(--escala));line-height:calc(21px * var(--escala))}
  /* the price shares the dish name's line box, so the two sit on the same line */
  .single-menu-items h6{font-size:16px;line-height:22px;padding-left:var(--s2)}

  /* chips: 44px tall, filled, so they read as tappable and meet the touch minimum */
  .nav-pills .nav-link{
    display:flex;
    align-items:center;
    min-height:44px;
    margin:0;
    padding:0 var(--s3);
    border-radius:var(--r-pill);
    background:var(--chip);
    color:var(--ink);
    font-size:16px;
    line-height:1.2;
    letter-spacing:0;
    white-space:nowrap;
    transition:background-color var(--t-fast) ease,color var(--t-fast) ease,
               transform var(--t-press) var(--ease-out),
               font-variation-settings var(--t-fast) var(--ease-out);
  }
  .nav-pills .nav-link:active{transform:scale(.95)}
  .nav-pills .nav-link::after{display:none}
  .nav-item.active .nav-link{background:var(--accent-ink);color:var(--surface)}
  .nav-divider{margin:0 4px 0 0;padding:0;line-height:1.2}
}
@media (max-width:470px){
  /* price wraps onto its own line here, as in the source section */
  .single-menu-items{flex-wrap:wrap;gap:var(--s3)}
  .single-menu-items h6{padding-left:0}
}

/* ---------- accessibility ----------
   Reduced motion is gentler motion, not none: presses still respond, colours still change,
   the sheet still fades. What goes is travel — the slide, the rise, the scale. */
@media (prefers-reduced-motion:reduce){
  .js .tab-pane.active{animation:none}
  .sheet-panel{
    transform:none;
    opacity:0;
    transition:opacity var(--t-fast) ease;
  }
  .sheet.is-open .sheet-panel{transform:none;opacity:1}
  .nav-pills .nav-link:active,
  .nav-arrow:not(:disabled):active,
  .sheet-item:active,
  .sheet-close:active{transform:none}
  .menu-fab:active{transform:translateX(-50%)}
  .nav-pills .nav-link::after{transition:none}
}

/* frosted chrome is a nice-to-have; legibility is not */
@media (prefers-reduced-transparency:reduce){
  .tab-nav{background:var(--surface);backdrop-filter:none;-webkit-backdrop-filter:none}
}

@media (prefers-contrast:more){
  .menu-content{border-bottom-color:var(--ink)}
  .menu-group-title::after{background:var(--accent-ink)}
  .tab-nav{background:var(--surface);backdrop-filter:none;-webkit-backdrop-filter:none}
}

</style>
</head>
<body>

<section class="food-menu-section fix">
  <div class="food-menu-wrapper style3">
    <div class="container">
      <div class="food-menu-tab-wrapper style3">

        <!-- lazy: dentro de un display:none nunca intersecan, así que el móvil (que jamás
             las enseña: sólo existen de 1200px en adelante) no descarga sus ~60 KB -->
        <div class="shape1">
          <img src="assets/foodmenuShape3_1.png" alt="" width="137" height="158" loading="lazy" decoding="async">
        </div>
        <div class="shape2">
          <img src="assets/foodmenuShape3_2.png" alt="" width="125" height="106" loading="lazy" decoding="async">
        </div>
        <div class="shape3">
          <img src="assets/foodmenuShape3_3.png" alt="" width="131" height="172" loading="lazy" decoding="async">
        </div>

        <!-- Los tres controles de la carta, juntos y arriba a la derecha. El idioma era una
             fila entera debajo del titulo: 65px de alto en un movil, para algo que se toca una
             vez y no se vuelve a tocar. Un desplegable lo deja en una esquina y devuelve ese
             alto a los platos, que es a lo que se viene. -->
        <div class="head-tools">
          <div class="txt-size" id="txt-size" role="group"${TL('Text size')}>
            <button type="button" class="txt-size-btn" data-escala="1" aria-pressed="true"${TL('Normal text')}>A</button>
            <button type="button" class="txt-size-btn" data-escala="1.15" aria-pressed="false"${TL('Large text')}>A</button>
            <button type="button" class="txt-size-btn" data-escala="1.3" aria-pressed="false"${TL('Very large text')}>A</button>
          </div>
          <button type="button" class="nav-search" id="nav-search"${TL('Search dishes')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/></svg>
          </button>
          <!-- Cada idioma escrito en su idioma y con su bandera, no en codigos de dos letras:
               un aleman busca "Deutsch", no "DE". -->
          <div class="lang" id="lang">
            <button type="button" class="lang-trigger" id="lang-trigger"
                    aria-haspopup="true" aria-expanded="false" aria-controls="lang-menu"${TL('Language')}>
              <span class="lang-flag" id="lang-flag" aria-hidden="true"></span>
              <span class="lang-name" id="lang-name"></span>
              <svg class="lang-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6"/></svg>
            </button>
            <div class="lang-menu" id="lang-menu" role="menu" hidden>
${IDIOMAS.map((l) => `              <button type="button" class="lang-opt" role="menuitemradio" aria-checked="false" data-lang="${l.code}" lang="${l.code}">
                <span class="lang-flag" aria-hidden="true">${l.flag}</span>
                <span class="lang-name">${esc(l.name)}</span>
                <svg class="lang-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5l9 -9"/></svg>
              </button>`).join(String.fromCharCode(10))}
            </div>
          </div>
        </div>

        <!-- El carrusel de cabecera. Sale vacio del build y lo llena el runtime con lo que
             haya subido el panel: las fotos son del restaurante y cambian sin recompilar. Si
             no hay ninguna, este bloque no llega a existir en pantalla. -->
        <figure class="hero" id="hero" hidden>
          <div class="hero-frame">
            <ul class="hero-track" id="hero-track" tabindex="0"${TL('Photo of the restaurant')}></ul>
            <button type="button" class="hero-arrow hero-prev" id="hero-prev"${TL('Previous photo')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6"/></svg>
            </button>
            <button type="button" class="hero-arrow hero-next" id="hero-next"${TL('Next photo')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6"/></svg>
            </button>
            <div class="hero-dots" id="hero-dots" role="group"${TL('Photos')}></div>
          </div>
        </figure>

        <div class="title-area">
          <div class="sub-title">${T(CLIENTE.rotulo, 'ui')}</div>
          <h2 class="title">${esc(CLIENTE.nombre)}</h2>
        </div>



        <!-- La banda de oferta. El carril lo monta el runtime repitiendo el mensaje, y va
             oculto a los lectores de pantalla: un texto repetido cuatro veces se leeria cuatro
             veces. El mensaje de verdad, una sola vez, vive en el span invisible de al lado. -->
        <div class="offer-banner" id="offer-banner" hidden>
          <!-- El recorte y el difuminado de los bordes van en una capa de dentro, no en el
               bloque: una mascara afecta a todo lo que pinta el elemento, filetes incluidos, y
               las lineas se habrian desvanecido en las puntas junto con el texto. -->
          <div class="offer-mask">
            <div class="offer-track" id="offer-track-1" aria-hidden="true"></div>
            <div class="offer-track offer-track-inv" id="offer-track-2" aria-hidden="true"></div>
          </div>
          <span class="a11y" id="offer-banner-txt" role="status"></span>
        </div>

        <div class="food-menu-tab style2">
          <div class="tab-nav-sentinel" aria-hidden="true"></div>
          <div class="tab-nav">
            <button type="button" class="nav-arrow nav-arrow-prev"${TL('Scroll categories left')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6"/></svg>
            </button>
            <ul class="nav nav-pills" id="pills-tab" role="tablist"${TL('Menu categories')}>
${nav}
            </ul>
            <button type="button" class="nav-arrow nav-arrow-next"${TL('Scroll categories right')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6"/></svg>
            </button>
          </div>

          <div class="tab-content">
${panes}
          </div>

          <div class="menu-legend">
            <p class="legend-marks">
              <span class="legend-item"><span class="diet diet-vegan" aria-hidden="true">${DIET_ICON.vegan}</span>${T('Available vegan', 'ui')}</span>
              <span class="legend-item"><span class="diet diet-gf" aria-hidden="true">${DIET_ICON.gf}</span>${T('Available gluten free', 'ui')}</span>
              <span class="legend-caveat">${T('These marks point to a version of the dish on our vegan or gluten-free menu.', 'ui')}</span>
            </p>
            <p class="legend-allergens">
              <span class="allergen-head">
                <strong>${T('Allergens', 'ui')}</strong>
                <span class="allergen-icons">
                  <span class="allergen">${ALERGENO.wheat}<span class="a11y">${T('Gluten', 'ui')}</span></span>
                  <span class="allergen">${ALERGENO.milk}<span class="a11y">${T('Dairy', 'ui')}</span></span>
                  <span class="allergen">${ALERGENO.nut}<span class="a11y">${T('Nuts', 'ui')}</span></span>
                  <span class="allergen">${ALERGENO.fish}<span class="a11y">${T('Fish', 'ui')}</span></span>
                  <span class="allergen">${ALERGENO.egg}<span class="a11y">${T('Egg', 'ui')}</span></span>
                  <span class="allergen">${ALERGENO.sesame}<span class="a11y">${T('Sesame', 'ui')}</span></span>
                  <span class="allergen">${ALERGENO.mustard}<span class="a11y">${T('Mustard', 'ui')}</span></span>
                  <span class="allergen">${ALERGENO.sulphites}<span class="a11y">${T('Sulphites', 'ui')}</span></span>
                </span>
              </span>
              <span class="allergen-text"><strong class="allergen-lead">${T('Allergies or intolerances?', 'ui')}</strong> ${T('Ask our staff about the 14 allergens. The vegan and gluten-free icons do not replace this information.', 'ui')}</span>
            </p>
          </div>

          <!-- La entrada al juego va al final a propósito: el momento de jugar es después de
               pedir, no mientras se elige. El enlace se oculta si el restaurante apaga el
               juego desde el panel. -->
          <a class="game-card" id="game-card" href="juego.html" hidden>
            <span class="game-card-title">Chilli <em>Rush</em></span>
            <span class="game-card-cta">
              ${T('Play', 'ui')}
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.2 5.4a1 1 0 0 1 1.53 -.85l8 6.6a1 1 0 0 1 0 1.7l-8 6.6a1 1 0 0 1 -1.53 -.85z"/></svg>
            </span>
          </a>

          <!-- La nota de Google. Los números y los nombres salen de estado.json, nunca del
               build: cada restaurante tiene los suyos y esta carta se vende a varios. Si el
               panel no los ha configurado, el bloque no existe. Es un enlace a la ficha si
               la hay, y un div si no: no se deja un enlace que no lleva a ningún sitio. -->
          <a class="reviews" id="reviews" href="#" hidden>
            <span class="reviews-line">
              <span class="reviews-score" id="reviews-score"></span>
              <span class="reviews-stars" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9l6.5 .9l-4.7 4.6l1.1 6.5l-5.8 -3.1l-5.8 3.1l1.1 -6.5l-4.7 -4.6l6.5 -.9z"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9l6.5 .9l-4.7 4.6l1.1 6.5l-5.8 -3.1l-5.8 3.1l1.1 -6.5l-4.7 -4.6l6.5 -.9z"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9l6.5 .9l-4.7 4.6l1.1 6.5l-5.8 -3.1l-5.8 3.1l1.1 -6.5l-4.7 -4.6l6.5 -.9z"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9l6.5 .9l-4.7 4.6l1.1 6.5l-5.8 -3.1l-5.8 3.1l1.1 -6.5l-4.7 -4.6l6.5 -.9z"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9l6.5 .9l-4.7 4.6l1.1 6.5l-5.8 -3.1l-5.8 3.1l1.1 -6.5l-4.7 -4.6l6.5 -.9z"/></svg></span>
              <span class="a11y" id="reviews-of"></span>
            </span>
            <span class="reviews-text" id="reviews-text"></span>
          </a>

          <!-- Fuera del enlace de la nota a proposito: un enlace dentro de otro no existe en
               HTML, y el navegador lo desmonta por su cuenta dejando un resultado distinto en
               cada motor. -->
          <div class="social" id="social" hidden></div>
        </div>

      </div>
    </div>
  </div>
</section>

<footer class="site-footer">
  <p><span class="brand">SocialCard</span> <span id="footer-year">2026</span> — ${T('Want your own menu?', 'ui')}<br>
    <a class="footer-wa" id="footer-wa" href="https://wa.me/34617798557" target="_blank" rel="noopener">${T('Message us', 'ui')}</a>
    ${T('and we visit you (Zona Sur)', 'ui')}</p>
</footer>

<button class="menu-fab" type="button" id="menu-fab" aria-haspopup="dialog" aria-expanded="false" aria-controls="category-sheet">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l16 0"/><path d="M4 12l16 0"/><path d="M4 18l16 0"/></svg>
  ${T('Categories', 'ui')}
</button>

<div class="sheet" id="category-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" hidden>
  <div class="sheet-backdrop" data-close></div>
  <div class="sheet-panel">
    <div class="sheet-head">
      <h2 id="sheet-title">${T('Categories', 'ui')}</h2>
      <button type="button" class="sheet-close" data-close${TL('Close categories')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="dish-search">
      <div class="ds-field">
        <span class="ds-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/></svg></span>
        <!-- El placeholder lo pone el runtime, no el build: T() emite un <span> con las
             traducciones dentro, y dentro de un atributo eso no vale. Va por TR, como el
             resto de cadenas que compone el JS. -->
        <input type="search" id="ds-q" autocomplete="off" enterkeyhint="search"${TL('Search dish or number')}>
        <button type="button" class="ds-clear" id="ds-clear"${TL('Clear search')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg></button>
      </div>
      <div class="ds-chips" role="group"${TL('Filters')}>
${veganNames.size ? `        <button type="button" class="ds-chip" data-filter="vegan" aria-pressed="false">${T('Vegan', 'tabs')} <span class="n"></span></button>
` : ''}${gfNames.size ? `        <button type="button" class="ds-chip" data-filter="gf" aria-pressed="false">${T('Gluten Free', 'tabs')} <span class="n"></span></button>
` : ''}        <button type="button" class="ds-chip" data-filter="offer" aria-pressed="false">${T('On offer', 'ui')} <span class="n"></span></button>
      </div>
    </div>

    <div class="ds-results" id="ds-results" hidden>
      <p class="ds-total" id="ds-total"></p>
      <div id="ds-hits"></div>
    </div>

${sheet}
  </div>
</div>

<script>
(function () {
  var year = document.getElementById('footer-year');
  if (year) year.textContent = new Date().getFullYear();

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var nav = document.getElementById('pills-tab');
  var TITLE = ${JSON.stringify(Object.assign({ en: CLIENTE.titulo },
      Object.fromEntries(LANGS.map((l) => [l.code, tr(CLIENTE.titulo, 'ui', l)]))))};
  var sentinel = document.querySelector('.tab-nav-sentinel');
  var navBar = document.querySelector('.tab-nav');
  var content = document.querySelector('.tab-content');
  var links = [].slice.call(nav.querySelectorAll('.nav-link'));

  function selectTab(targetId, opts) {
    var btn = nav.querySelector('.nav-link[data-target="' + targetId + '"]');
    var pane = document.getElementById(targetId);
    if (!btn || !pane) return;
    if (pane.dataset.visibles === '0') return;      // oculta desde el panel: no hay nada que abrir
    // re-selecting the open category would replay its fade for no reason
    if (pane.classList.contains('active') && !(opts && opts.force)) {
      if (opts && opts.focus) btn.focus();
      return;
    }

    nav.querySelectorAll('.nav-item').forEach(function (li) { li.classList.remove('active'); });
    /* Roving tabindex: una sola parada de Tab en la barra (la activa); dentro se navega con
       las flechas, que ya existen. Trece paradas de Tab para cruzar la barra eran un peaje. */
    links.forEach(function (b) { b.setAttribute('aria-selected', 'false'); b.tabIndex = -1; });
    content.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.remove('active'); });

    btn.parentElement.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.tabIndex = 0;
    pane.classList.add('active');

    document.querySelectorAll('.sheet-item').forEach(function (item) {
      if (item.dataset.target === targetId) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    // keep the chosen chip visible in the scroller
    if (btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });

    // a new category always starts at the top of its list, never mid-scroll in the old one
    if (opts && opts.align !== false) {
      var top = sentinel.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (opts && opts.focus) btn.focus();
  }

  nav.addEventListener('click', function (e) {
    var btn = e.target.closest('.nav-link');
    if (btn) selectTab(btn.dataset.target);
  });

  // arrow keys move between tabs, as expected of a tablist
  nav.addEventListener('keydown', function (e) {
    /* Sólo entre pestañas visibles: una oculta desde el panel no existe para el teclado. */
    var vis = links.filter(function (b) { return !(b.parentElement && b.parentElement.hidden); });
    var i = vis.indexOf(document.activeElement);
    if (i < 0) return;
    var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? vis.length - 1 : -1;
    if (next < 0 || next >= vis.length) return;
    e.preventDefault();
    selectTab(vis[next].dataset.target, { focus: true, align: false });
  });

  // shadow under the bar only while it is actually stuck to the top
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      navBar.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { threshold: 1 }).observe(sentinel);
  }

  // fades and arrows track how much of the row is still hidden on each side
  var prevArrow = navBar.querySelector('.nav-arrow-prev');
  var nextArrow = navBar.querySelector('.nav-arrow-next');

  function syncScroller() {
    var max = nav.scrollWidth - nav.clientWidth;
    var atStart = nav.scrollLeft <= 1;
    var atEnd = nav.scrollLeft >= max - 1;
    navBar.classList.toggle('is-scrollable', max > 1);
    navBar.classList.toggle('at-start', atStart);
    navBar.classList.toggle('at-end', atEnd);
    prevArrow.disabled = atStart;
    nextArrow.disabled = atEnd;
  }

  function nudge(dir) {
    nav.scrollBy({ left: dir * nav.clientWidth * 0.6, behavior: reduce ? 'auto' : 'smooth' });
  }
  prevArrow.addEventListener('click', function () { nudge(-1); });
  nextArrow.addEventListener('click', function () { nudge(1); });

  /* ---- el empujón de bienvenida ----
     Trece categorías y en un móvil se ven dos: sin una señal, nadie desliza una fila que
     parece completa. Al abrir, la barra avanza 16px y vuelve; el ojo ve moverse los chips y
     entiende el gesto sin que nadie se lo explique. Una vez por visita —lo recuerda la
     pestaña, no el móvil, para que la siguiente visita real vuelva a verlo—, sólo si de
     verdad hay algo fuera, y nunca con prefers-reduced-motion, donde el asomo y el fundido
     siguen contándolo sin movimiento. */
  function empujon() {
    if (reduce) return;
    if (nav.scrollWidth - nav.clientWidth < 40) return;
    try { if (sessionStorage.getItem('${CLAVE('empujon')}')) return; sessionStorage.setItem('${CLAVE('empujon')}', '1'); } catch (e) {}
    var t0 = 0;
    var paso = function (t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 900);
      /* ida y vuelta con una curva suave: sube hasta 16 y baja, sin frenazo al final */
      nav.scrollLeft = 16 * Math.sin(p * Math.PI) * (p < 0.5 ? 1 : 1);
      if (p < 1) requestAnimationFrame(paso); else nav.scrollLeft = 0;
    };
    setTimeout(function () { requestAnimationFrame(paso); }, 700);
  }
  empujon();

  nav.addEventListener('scroll', syncScroller, { passive: true });
  window.addEventListener('resize', syncScroller);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncScroller);
  syncScroller();

  /* Diccionario para los textos que el JS compone (un porcentaje, una hora, una etiqueta).
     T() vale para el HTML, pero esto no está en el HTML hasta que el panel lo enciende. */
  var TR = ${JSON.stringify(Object.fromEntries(RUNTIME_STRINGS.map((k) => [k, {
    en: k,
    ...Object.fromEntries(LANGS.map((l) => [l.code, l.dicts.ui[k]])),
  }])))};

  /* ---- la carta del día ----
     Un único estado.json manda sobre cuatro cosas: qué está agotado, qué lleva destacado, qué
     categorías tienen oferta ahora mismo y qué precios se han cambiado. Todo se pinta en un
     solo render() para que no haya dos sitios calculando el precio de una fila.

     La cocina marca un plato a las 22:00 y tiene que seguir marcado hasta el reparto de la
     mañana siguiente, así que la unidad no es el día natural sino la *fecha de servicio*: la
     fecha en Canarias retrocedida un día antes de las 06:00. El archivo caduca solo.

     Si estado.json falta o no se puede leer, no se marca nada y la carta queda como salió del
     build: precios de siempre, sin agotados y sin ofertas. Nunca se esconde comida porque una
     petición haya fallado. */
  var estado = null;

  function canaryParts() {
    try {
      var f = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Atlantic/Canary',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      });
      var p = {};
      f.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      // hourCycle h23 debería bastar, pero hay motores que aún devuelven 24 a medianoche
      p.hour = String((+p.hour) % 24);
      return p;
    } catch (e) { return null; }
  }

  function serviceDate() {
    var p = canaryParts();
    if (!p) return null;
    var d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
    if (+p.hour < 6) d.setUTCDate(d.getUTCDate() - 1);   // sigue siendo el servicio de anoche
    return d.toISOString().slice(0, 10);
  }

  /* Día de la semana en Canarias, 1 = lunes. Se calcula desde la fecha, no desde el weekday
     que devuelve Intl, para no depender del idioma en que lo escriba. */
  function canaryWeekday() {
    var p = canaryParts();
    if (!p) return null;
    var d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
    return d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  }

  function canaryMinutes() {
    var p = canaryParts();
    return p ? (+p.hour) * 60 + (+p.minute) : null;
  }

  function tr(key) {
    var lang = document.documentElement.lang || 'en';
    var e = TR[key];
    return e ? (e[lang] || e.en || key) : key;
  }

  function fill(plantilla, datos) {
    return plantilla.replace(/[{]([a-z]+)[}]/g, function (m, k) {
      return datos[k] !== undefined ? datos[k] : m;
    });
  }

  /* ---- oferta ----
     Antes estaba clavada a Aperitivos, 20%, 10:00–11:59. Ahora sale del panel: qué categorías,
     qué porcentaje, qué franja y qué días. El reloj que manda es el del restaurante, no el del
     visitante, y se revisa cada medio minuto para que una página abierta cruce el principio y
     el final de la franja sola. */
  function offerCfg() {
    var o = estado && estado.offer;
    var hayDonde = o && ((o.cats && o.cats.length) || (o.keys && o.keys.length));
    /* El panel ya valida el porcentaje, pero estado.json sobrevive a rebuilds y a manos:
       un valor corrupto degrada a «sin oferta», nunca a un €NaN en 326 platos. */
    var pct = o ? Math.round(+o.percent) : 0;
    if (!o || !o.on || !isFinite(pct) || pct < 1 || pct > 90 || !hayDonde) return null;
    return {
      cats: o.cats || [],
      keys: o.keys || [],          // platos sueltos, además de las categorías enteras
      percent: pct,
      from: typeof o.from === 'number' ? o.from : 600,
      to: typeof o.to === 'number' ? o.to : 720,
      days: (o.days && o.days.length) ? o.days : [1, 2, 3, 4, 5, 6, 7],
    };
  }

  function offerByClock() {
    var cfg = offerCfg();
    if (!cfg) return false;
    var d = canaryWeekday(), m = canaryMinutes();
    if (d === null || m === null) return false;
    if (cfg.days.indexOf(d) === -1) return false;
    return m >= cfg.from && m < cfg.to;      // el final es exclusivo: 12:00 cierra a las 11:59
  }

  function offerOn() {
    var cfg = offerCfg();
    if (!cfg) return false;
    return offerByClock();
  }

  /* ---- el carril de la marquesina ----
     Se rehace solo cuando cambia el mensaje: render() pasa cada treinta segundos y rehacerlo
     en cada pasada reiniciaria la animacion a mitad de vuelta.

     Cuantas copias hacen falta no se puede saber sin medir: depende del texto, del idioma y
     del ancho del movil. Se mide una y se repite hasta pasar del doble del ancho visible; de
     ahi sale tambien la duracion, para que la velocidad no dependa de lo larga que sea la
     frase. */
  var marquesinaFirma = '';

  function montarMarquesina(mensaje) {
    var banda = document.getElementById('offer-banner');
    var carriles = [document.getElementById('offer-track-1'), document.getElementById('offer-track-2')];
    if (!banda || !carriles[0]) return;
    var firma = mensaje + '|' + banda.clientWidth;
    if (firma === marquesinaFirma) return;
    marquesinaFirma = firma;

    function unidad() {
      var d = document.createElement('span');
      d.className = 'offer-unidad';
      d.appendChild(document.createTextNode(mensaje));
      var punto = document.createElement('span');
      punto.className = 'offer-punto';
      d.appendChild(punto);
      return d;
    }

    carriles.forEach(function (c) { if (c) c.textContent = ''; });

    if (reduce) { carriles[0].appendChild(unidad()); return; }

    /* Una copia para medir. */
    var una = unidad();
    carriles[0].appendChild(una);
    var anchoUno = una.getBoundingClientRect().width;
    var visible = banda.clientWidth;
    /* Si no hay medidas —la banda sigue oculta, o el navegador aun no ha maquetado— no se
       inventa nada: se reintenta en el siguiente fotograma. Un ancho de cero convertido en uno
       llenaria el carril con cientos de copias. */
    if (anchoUno < 10 || visible < 10) {
      marquesinaFirma = '';
      requestAnimationFrame(function () { montarMarquesina(mensaje); });
      return;
    }
    /* Tope duro: con doce copias se cubre cualquier pantalla, y si alguna medida saliera rara
       el carril no puede crecer sin fin. */
    var copias = Math.min(12, Math.max(2, Math.ceil((visible * 2) / anchoUno)));

    carriles.forEach(function (carril) {
      if (!carril) return;
      carril.textContent = '';
      /* El conjunto dos veces: la animacion recorre la mitad y vuelve al mismo punto. */
      for (var v = 0; v < 2; v++) {
        var juego = document.createDocumentFragment();
        for (var i = 0; i < copias; i++) juego.appendChild(unidad());
        carril.appendChild(juego);
      }
      /* La duracion sale del ancho REAL del carril ya montado, no de la estimacion: entre
         medir una copia y montarlas todas puede entrar la tipografia y cambiar cada letra de
         sitio. scrollWidth / 2 es exactamente lo que recorre la animacion. */
      var recorrido = carril.scrollWidth / 2;
      carril.style.setProperty('--marquesina', Math.max(6, recorrido / 60).toFixed(1) + 's');
    });
  }

  function rehacerMarquesina() {
    var t = document.getElementById('offer-banner-txt');
    if (t && t.textContent) { marquesinaFirma = ''; montarMarquesina(t.textContent); }
  }

  /* Al girar el movil cambia el ancho y hacen falta otras tantas copias. */
  window.addEventListener('resize', rehacerMarquesina);

  /* Y en cuanto entra la tipografia: si se mide con la fuente de reserva, cada copia sale mas
     estrecha de lo que va a ser, el calculo pide mas copias de las necesarias y la duracion se
     queda corta. El resultado era una marquesina al doble de velocidad. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rehacerMarquesina);

  function euros(n) { return '€' + n.toFixed(2); }

  /* ---- opiniones de Google ----
     La nota y el numero de resenas los escribe el panel; aqui solo se pintan. No se piden a
     Google en vivo a proposito: la API necesita clave, factura y un proxy en el servidor, y
     una nota que cambia dos veces al ano no justifica ninguna de las tres cosas. */
  function pintarOpiniones() {
    var bloque = document.getElementById('reviews');
    if (!bloque) return;
    var r = (estado && estado.reviews) || null;
    var nota = r ? +r.rating : 0;
    var cuantas = r ? Math.round(+r.count || 0) : 0;
    if (!r || !r.on || !(nota > 0) || !(cuantas > 0)) { bloque.hidden = true; return; }

    var lang = document.documentElement.lang || 'en';
    var texto = nota.toFixed(1);
    document.getElementById('reviews-score').textContent = lang === 'en' ? texto : texto.replace('.', ',');
    document.getElementById('reviews-of').textContent = tr('out of 5');
    document.getElementById('reviews-text').textContent =
      fill(tr('+{count} positive reviews on Google'), { count: cuantas });

    /* El mismo enlace que usa el juego, pero NO la misma condicion. El campo enabled significa "se
       pide resena al acabar el premio", que es una regla del juego; aqui basta con que haya
       enlace. Si no lo hay, esto deja de ser un enlace en vez de ser un enlace roto. */
    var url = (estado.review && estado.review.url) || '';
    if (url && url.slice(0, 8).toLowerCase() === 'https://') {
      bloque.setAttribute('href', url);
      bloque.setAttribute('target', '_blank');
      bloque.setAttribute('rel', 'noopener');
    } else {
      bloque.removeAttribute('href');
      bloque.removeAttribute('target');
      bloque.removeAttribute('rel');
    }

    bloque.hidden = false;
  }

  /* ---- las redes ----
     Se pintan desde el estado y se vuelven a pintar solo si la lista ha cambiado: render()
     pasa cada treinta segundos y no hace falta rehacer cuatro enlaces cada media vuelta.

     El numero de WhatsApp se guarda sin nada mas que digitos y la direccion se monta aqui.
     Asi el panel no tiene que saber como se escribe un enlace de WhatsApp y el dia que cambie
     la forma oficial se cambia en un sitio. */
  var REDES = ${JSON.stringify(REDES)};
  var redesFirma = '';

  /* ---- abrir la aplicacion, no el navegador ----
     Cada red se comporta distinto y no hay una forma que valga para las cuatro:

     WhatsApp ya abre la app con wa.me, que es un enlace normal que el sistema reconoce. No se
     toca: cambiarlo por whatsapp:// seria peor, porque en un movil sin WhatsApp el toque no
     haria absolutamente nada, y con wa.me se abre la web.

     Instagram y Facebook si necesitan su esquema propio para saltar a la app desde dentro de un
     navegador. El problema del esquema es que si la app no esta instalada no pasa nada: el
     toque muere. Asi que se intenta el esquema y se pone un temporizador; si a los 900 ms la
     pagina sigue delante —senal de que no ha saltado a ninguna parte— se va a la web.

     La comprobacion es que la pestana se haya escondido, que es lo que ocurre cuando el sistema
     abre otra aplicacion encima. Si se escondio, se cancela la vuelta a la web: sin eso, al
     volver de Instagram el navegador te habria abierto ademas la pagina web por detras.

     En escritorio no se intenta nada: ahi no hay apps que abrir y el esquema solo consigue que
     el navegador enseñe un dialogo feo. */
  function esTactil() {
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  function usuarioInstagram(url) {
    var t = String(url).split('?')[0].split('#')[0];
    var partes = t.split('/');
    for (var i = partes.length - 1; i >= 0; i--) {
      var p = partes[i];
      if (p && p !== 'www.instagram.com' && p !== 'instagram.com' && p !== 'https:') return p;
    }
    return '';
  }

  function esquemaDe(key, url) {
    if (key === 'instagram') {
      var u = usuarioInstagram(url);
      return u ? 'instagram://user?username=' + encodeURIComponent(u) : '';
    }
    if (key === 'facebook') {
      /* El unico esquema de Facebook que funciona sin conocer el identificador numerico de la
         pagina. Meta lo ha roto y arreglado varias veces; por eso la vuelta a la web importa
         aqui mas que en Instagram. */
      return 'fb://facewebmodal/f?href=' + encodeURIComponent(url);
    }
    return '';
  }

  function abrirConApp(esquema, web) {
    var salto = false;
    function alEsconderse() { if (document.hidden) salto = true; }
    document.addEventListener('visibilitychange', alEsconderse);
    var t = setTimeout(function () {
      document.removeEventListener('visibilitychange', alEsconderse);
      if (!salto && !document.hidden) window.location.href = web;
    }, 900);
    /* Dentro del gesto del dedo: fuera de el, el navegador bloquea la navegacion. */
    try { window.location.href = esquema; } catch (e) { clearTimeout(t); window.location.href = web; }
  }

  function pintarRedes() {
    var caja = document.getElementById('social');
    if (!caja) return;
    var r = (estado && estado.social) || {};
    var firma = REDES.map(function (x) { return x.key + ':' + (r[x.key] || ''); }).join('|');
    if (firma === redesFirma) return;
    redesFirma = firma;

    caja.textContent = '';
    var puestas = 0;
    REDES.forEach(function (red) {
      var v = String(r[red.key] || '').trim();
      if (!v) return;
      var href = red.key === 'whatsapp' ? 'https://wa.me/' + v : v;
      if (href.slice(0, 8).toLowerCase() !== 'https://') return;
      var a = document.createElement('a');
      a.className = 'social-link';
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', red.label);
      /* El href se queda con la direccion web SIEMPRE: es lo que se copia al mantener pulsado,
         lo que ve un buscador y lo que funciona si el JS no llega. El salto a la app es un
         anadido encima, no un sustituto. */
      var esquema = esquemaDe(red.key, href);
      if (esquema) {
        a.addEventListener('click', function (ev) {
          if (!esTactil()) return;
          ev.preventDefault();
          abrirConApp(esquema, href);
        });
      }
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + red.icon + '</svg>';
      caja.appendChild(a);
      puestas++;
    });
    caja.hidden = puestas === 0;
  }

  /* ---- el render ----
     Una sola pasada por las 326 filas. Cada fila se recalcula entera desde el estado, sin
     acumular: así llamar a render() dos veces da el mismo resultado que llamarlo una. */
  /* ================================================================ OCULTOS ================
     QUÉ ES: una lista, en estado.json, de cosas que el restaurante NO quiere que existan en la
     carta hasta nuevo aviso. Tiene tres cajones:
        hidden.tabs  → pestañas enteras, por su nombre inglés de build ("Kids", "Biryani")
        hidden.cats  → grupos enteros, por su clave de categoría ("Butter Masala Biryani")
        hidden.keys  → platos sueltos, por su clave ("Appetizers :: Papadum")
     A diferencia de «Agotados hoy», NO caduca: sólo vuelve cuando el panel lo desmarca.

     QUÉ HACE ESTA FUNCIÓN, en orden, en cada pasada de render():
        1. Recorre cada pestaña (.tab-pane, que lleva data-tab con su nombre inglés).
        2. Dentro, cada grupo (.menu-group, con data-cat) y cada fila de plato (data-key).
           Una fila se esconde si su pestaña está en tabs, o su grupo en cats, o su clave en
           keys. Un grupo sin filas visibles se esconde entero; una pestaña sin filas visibles
           se esconde en la barra (.nav-item) y en la hoja de categorías (.sheet-item), y su
           contador de platos pasa a ser el de filas visibles.
        3. Los rótulos de la hoja («Carta», «Cartas especiales») y el separador de la barra se
           van si ya no tienen nada debajo.
        4. Si la pestaña que estaba abierta se ha quedado vacía, se abre la primera visible.
        5. Se vuelve a medir la barra (flechas y fundidos) porque ha cambiado de ancho.
     El buscador y los chips (dsPintar / dsCuentas) miran row.hidden y no cuentan lo oculto;
     la banda de oferta sólo sale si queda algún plato rebajado visible; las flechas del
     teclado saltan las pestañas ocultas; selectTab() no abre una pestaña vacía.

     INTERRUPTOR: con OCULTOS_ACTIVO en false (gen.mjs, arriba) esta función no hace nada y
     todo se ve, aunque estado.json traiga cosas en hidden. Está apagado hasta que la función
     esté madura y clara; el panel tiene su propio interruptor (OCULTOS_ACTIVO en config.php).
     ======================================================================================= */
  function aplicarOcultos() {
    if (!OCULTOS_ACTIVO) return;
    var oc = (estado && estado.hidden) || {};
    var hTabs = Array.isArray(oc.tabs) ? oc.tabs : [];
    var hCats = Array.isArray(oc.cats) ? oc.cats : [];
    var hKeys = Array.isArray(oc.keys) ? oc.keys : [];
    var panes = [].slice.call(document.querySelectorAll('.tab-pane'));
    panes.forEach(function (pane) {
      var tabOculta = hTabs.indexOf(pane.dataset.tab) !== -1;
      var visiblesPane = 0;
      pane.querySelectorAll('.menu-group').forEach(function (g) {
        var catOculta = tabOculta || hCats.indexOf(g.dataset.cat) !== -1;
        var visiblesGrupo = 0;
        g.querySelectorAll('.single-menu-items').forEach(function (row) {
          var fuera = catOculta || hKeys.indexOf(row.dataset.key) !== -1;
          row.hidden = fuera;
          if (!fuera) visiblesGrupo++;
        });
        g.hidden = visiblesGrupo === 0;
        visiblesPane += visiblesGrupo;
      });
      pane.dataset.visibles = String(visiblesPane);
      var li = document.querySelector('.nav-item[data-tab="' + pane.dataset.tab.replace(/"/g, '\\"') + '"]');
      if (li) li.hidden = visiblesPane === 0;
      var hoja = document.querySelector('.sheet-item[data-target="' + pane.id + '"]');
      if (hoja) {
        if (hoja.parentElement) hoja.parentElement.hidden = visiblesPane === 0;
        var cuenta = hoja.querySelector('.sheet-item-count');
        if (cuenta) cuenta.textContent = visiblesPane;
      }
    });
    /* Los rótulos de la hoja («Carta», «Menús especiales») se van con sus listas si se
       quedan sin entradas visibles. */
    document.querySelectorAll('.sheet-list').forEach(function (ul) {
      var alguna = false;
      for (var k = 0; k < ul.children.length; k++) if (!ul.children[k].hidden) { alguna = true; break; }
      ul.hidden = !alguna;
      var rotulo = ul.previousElementSibling;
      if (rotulo && rotulo.classList.contains('sheet-label')) rotulo.hidden = !alguna;
    });
    /* El separador «Menús especiales» sobra si no queda ninguna especial visible. */
    var divisor = document.querySelector('.nav-divider');
    if (divisor) {
      var li2 = divisor.nextElementSibling, alguna = false;
      while (li2) { if (!li2.hidden) { alguna = true; break; } li2 = li2.nextElementSibling; }
      divisor.hidden = !alguna;
    }
    var activa = document.querySelector('.tab-pane.active');
    if (activa && activa.dataset.visibles === '0') {
      for (var i = 0; i < panes.length; i++) {
        if (panes[i].dataset.visibles !== '0') { selectTab(panes[i].id, { force: true }); break; }
      }
    }
    /* La barra cambia de ancho al quitar o poner pestañas: flechas y fundidos se recalculan. */
    syncScroller();
  }

  function render() {
    aplicarOcultos();
    var hayOfertaVisible = false;
    var hoy = serviceDate();
    var out = (estado && estado.soldOut) || {};
    var tags = (estado && estado.tags) || {};
    var precios = (estado && estado.prices) || {};
    var cfg = offerCfg();
    var on = offerOn();
    var cats = (on && cfg) ? cfg.cats : [];
    var keys = (on && cfg) ? cfg.keys : [];
    function enOferta(row) {
      return cats.indexOf(row.dataset.cat) !== -1 || keys.indexOf(row.dataset.key) !== -1;
    }

    document.querySelectorAll('.single-menu-items[data-key]').forEach(function (row) {
      var key = row.dataset.key;

      row.classList.toggle('is-sold-out', hoy !== null && out[key] === hoy);

      // destacado
      var alto = row.querySelector('.item-tag-high');
      if (alto) {
        var etiqueta = tags[key];
        if (etiqueta && TR[etiqueta]) {
          alto.textContent = tr(etiqueta);
          alto.dataset.tag = etiqueta;          // la clave, para los filtros de la hoja
          alto.hidden = false;
        } else {
          alto.textContent = '';
          delete alto.dataset.tag;
          alto.hidden = true;
        }
      }

      // precio: primero el que haya puesto el panel, y encima la oferta si toca
      var h6 = row.querySelector('h6');
      var base = row.dataset.price;
      if (h6 && base) {
        var vigente = precios[key] ? Number(precios[key]) : Number(base);
        if (!isFinite(vigente)) vigente = Number(base);
        if (enOferta(row)) {
          /* En céntimos enteros: 4.35 × 0.8 en coma flotante da 3.4799…, que toFixed pinta
             como 3.48 pero otros redondeos (el TPV, el camarero a mano) dan 3.48 también —
             y con otros precios el error cae al lado malo y muestra un céntimo de menos. */
          var rebajado = Math.round(Math.round(vigente * 100) * (100 - cfg.percent) / 100) / 100;
          h6.className = 'has-offer';
          h6.innerHTML = '<span class="price-now"></span><span class="price-was"></span>';
          h6.firstChild.textContent = euros(rebajado);
          h6.lastChild.textContent = euros(vigente);
        } else {
          h6.className = '';
          h6.textContent = euros(vigente);
        }
      }

      var oferta = row.querySelector('.item-tag-offer');
      if (oferta) {
        var visible = enOferta(row) && !!row.dataset.price;
        oferta.textContent = visible ? fill(tr('{pct}% off'), { pct: cfg.percent }) : '';
        oferta.hidden = !visible;
        if (visible && !row.hidden) hayOfertaVisible = true;
      }

      /* El número ya no vive aquí, así que la línea de etiquetas —y el desplazamiento del
         precio que la acompaña— sólo aparece si hay etiqueta que enseñar. */
      row.classList.toggle('has-tags',
        (alto && !alto.hidden) || (oferta && !oferta.hidden));
    });

    /* La banda de oferta, una sola y arriba del todo. Dice el porcentaje, a qué se aplica y
       hasta cuándo. El «a qué» importa: un «50% de descuento» a secas encima de la carta
       entera promete lo que no hay si la oferta sólo cubre dos categorías.
       Con más de tres categorías, o con platos sueltos por medio, enumerarlas deja de leerse
       y se dice «platos seleccionados». */
    var banda = document.getElementById('offer-banner');
    if (banda) {
      /* Sin ningún plato visible rebajado —la oferta cae entera en una pestaña oculta— la
         banda promete un descuento que no está en la carta: no sale. */
      if (!on || !cfg || !hayOfertaVisible) {
        banda.hidden = true;
        banda.classList.remove('is-in');
      } else {
        var estaba = !banda.hidden;
        /* Solo el porcentaje. Antes el mensaje enumeraba las categorias en oferta y decia la
           hora de fin: en una marquesina que pasa de largo, eso era una frase demasiado larga
           para leerla de un vistazo, y encima cambiaba de longitud segun cuantas categorias
           hubiera marcadas. Cual esta rebajado ya lo dice cada plato con su etiqueta. */
        var mensaje = fill(tr('Today we make it easy! Enjoy {pct}% off selected dishes.'), { pct: cfg.percent });
        document.getElementById('offer-banner-txt').textContent = mensaje;
        banda.hidden = false;
        /* Solo la primera vez: render() pasa cada treinta segundos y reiniciar la entrada en
           cada pasada seria movimiento perpetuo, que es lo que este proyecto no hace. */
        if (!estaba) { void banda.offsetWidth; }
        banda.classList.add('is-in');
        /* Despues de quitar el hidden y NO antes: un elemento oculto no tiene ancho, y sin
           ancho el calculo de cuantas copias caben da un numero absurdo. */
        montarMarquesina(mensaje);
      }
    }

    // el juego se enseña sólo si el restaurante lo tiene encendido
    var juego = document.getElementById('game-card');
    if (juego) juego.hidden = !(estado && estado.game && estado.game.on);


    pintarOpiniones();
    pintarHero();
    pintarRedes();

    /* Las cuentas de los filtros dependen de la oferta del dia, que llega en estado.json
       despues de pintar. Se recalculan en cada pasada del render, que es barato: tres
       recorridos sobre 312 filas ya montadas. */
    dsCuentas();
    /* Con la hoja abierta y resultados en pantalla, lo que el panel acaba de ocultar (o
       mostrar) se refleja al momento en vez de dejar platos que ya no existen en la lista. */
    if (dsRes && !dsRes.hidden) dsPintar();
  }

  /* El enlace de WhatsApp lleva el mensaje ya escrito, en el idioma en el que se está leyendo
     la carta: quien pulsa no tiene que pensar qué poner, y eso es la mitad de un contacto. */
  var WA = 'https://wa.me/34617798557';
  var waLink = document.getElementById('footer-wa');

  function pintarWa() {
    if (!waLink) return;
    var msg = tr('Hi, I would like a digital menu like this one for my restaurant.');
    waLink.href = WA + '?text=' + encodeURIComponent(msg);
  }
  document.addEventListener('totm:lang', pintarWa);
  pintarWa();

  document.addEventListener('totm:lang', render);
  setInterval(render, 30000);          // el reloj: abre y cierra la franja de oferta sola
  render();

  /* El estado se vuelve a pedir cada minuto y al volver a la pestaña. Sin esto, la cocina
     guarda un agotado o enciende una oferta y una carta ya abierta —la del cliente que está
     sentado en la mesa— no se entera hasta que recarga. Son 200 bytes por vuelta.
     Si la petición falla se conserva el estado anterior en vez de vaciarlo: un corte de red
     no debe borrar los agotados de la pantalla. */
  /* ---- el tema de marca ----
     El juego de colores lo elige el panel y viaja en estado.json, pero estado.json llega
     por fetch, es decir, después de pintar. Si se aplicara solo ahí, el cliente vería medio
     segundo de los colores de la casa antes del cambio: un parpadeo feísimo en la primera
     pantalla del restaurante.

     Por eso el tema se guarda también en el móvil y un script de dos líneas en el <head> lo
     pone antes de pintar. Este de aquí solo corrige si el panel lo ha cambiado desde la
     última visita. La primera visita de todas sí ve el tema de la casa un instante: es la
     única forma de evitarlo del todo, y sería reescribir el HTML en cada cambio. */
  /* Ocultos apagado de momento: ver el comentario largo sobre aplicarOcultos(). */
  var OCULTOS_ACTIVO = ${JSON.stringify(OCULTOS_ACTIVO)};
  var TEMAS_OK = ${JSON.stringify(TEMAS.map((t) => t.slug))};
  var TEMA_DEF = ${JSON.stringify(TEMA_POR_DEFECTO)};

  function aplicarTema(slug) {
    if (TEMAS_OK.indexOf(slug) === -1) slug = TEMA_DEF;
    var raiz = document.documentElement;
    if (slug === TEMA_DEF) delete raiz.dataset.tema;
    else raiz.dataset.tema = slug;
    try { localStorage.setItem('${CLAVE('tema')}', slug); } catch (e) {}
    /* La barra del navegador, del color del fondo de la página: con un valor fijo, al
       cambiar de tema el móvil seguía enmarcando la carta con el color del tema anterior. */
    var meta = document.querySelector('meta[name="theme-color"]');
    var fondo = getComputedStyle(raiz).getPropertyValue('--ink').trim();
    if (meta && fondo) meta.content = fondo;
  }

  function cargarEstado() {
    return fetch('estado.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (state) {
        if (state) { estado = state; aplicarTema(state.theme); }
        render();
      })
      .catch(function () { /* la carta se queda entera y con sus precios */ });
  }

  cargarEstado();
  setInterval(function () { if (!document.hidden) cargarEstado(); }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) cargarEstado();
  });

  /* ------------------------------------------------------------------ *
   * Carrusel de cabecera
   * ------------------------------------------------------------------ *
   * Las fotos las sube el restaurante desde el panel, asi que la lista viaja en estado.json y
   * no en el build: cambiar la foto de portada no puede exigir recompilar la carta.
   *
   * Se reconstruye solo cuando la lista cambia. render() pasa cada treinta segundos y volver
   * a montar los <img> en cada pasada reiniciaria las descargas y el fundido de entrada.
   */
  var heroFig = document.getElementById('hero');
  var heroTrack = document.getElementById('hero-track');
  var heroDots = document.getElementById('hero-dots');
  var heroPrev = document.getElementById('hero-prev');
  var heroNext = document.getElementById('hero-next');
  var heroFirma = '';
  var heroN = 0;
  var heroActual = 0;

  function heroIndice() {
    if (!heroN) return 0;
    var w = heroTrack.clientWidth || 1;
    return Math.max(0, Math.min(heroN - 1, Math.round(heroTrack.scrollLeft / w)));
  }

  function heroPintarEstado() {
    heroActual = heroIndice();
    var puntos = heroDots.children;
    for (var i = 0; i < puntos.length; i++) {
      if (i === heroActual) puntos[i].setAttribute('aria-current', 'true');
      else puntos[i].removeAttribute('aria-current');
    }
    if (heroPrev) heroPrev.disabled = heroActual === 0;
    if (heroNext) heroNext.disabled = heroActual === heroN - 1;
  }

  function heroIr(i) {
    heroTrack.scrollTo({
      left: Math.max(0, Math.min(heroN - 1, i)) * heroTrack.clientWidth,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  function pintarHero() {
    if (!heroFig) return;
    var fotos = (estado && estado.hero && estado.hero.length) ? estado.hero.slice(0, 5) : [];
    var firma = fotos.join('|');
    if (firma === heroFirma) return;
    heroFirma = firma;
    heroN = fotos.length;

    heroTrack.textContent = '';
    heroDots.textContent = '';
    document.documentElement.classList.toggle('con-hero', heroN > 0);
    var tarjeta = document.querySelector('.food-menu-tab-wrapper');
    if (tarjeta) tarjeta.classList.toggle('has-hero', heroN > 0);
    heroFig.hidden = heroN === 0;
    heroFig.classList.toggle('is-single', heroN === 1);
    if (!heroN) return;

    fotos.forEach(function (archivo, i) {
      var li = document.createElement('li');
      li.className = 'hero-slide';
      var img = document.createElement('img');
      img.src = 'assets/hero/' + archivo;
      img.alt = tr('Photo of the restaurant');
      img.decoding = 'async';
      /* La primera es el elemento mas grande de la primera pantalla: se pide con prioridad.
         Las demas, en diferido — nadie paga por descargar cuatro fotos que quiza no mire. */
      if (i === 0) img.setAttribute('fetchpriority', 'high');
      else img.loading = 'lazy';
      if (img.complete) img.classList.add('is-ready');
      else img.addEventListener('load', function () { img.classList.add('is-ready'); });
      /* Una foto que no carga no deja un icono roto: se queda el gris del hueco. */
      img.addEventListener('error', function () { li.hidden = true; });
      li.appendChild(img);
      heroTrack.appendChild(li);

      var punto = document.createElement('button');
      punto.type = 'button';
      punto.className = 'hero-dot';
      /* Sin role=tab: esto es un carrusel, no unas pestañas — un tab promete un tabpanel
         asociado que aquí no existe. El activo se marca con aria-current. */
      if (i === 0) punto.setAttribute('aria-current', 'true');
      punto.setAttribute('aria-label', fill(tr('Photo {n} of {total}'), { n: i + 1, total: fotos.length }));
      punto.addEventListener('click', function () { heroIr(i); });
      heroDots.appendChild(punto);
    });

    heroTrack.scrollLeft = 0;
    heroPintarEstado();
  }

  if (heroFig) {
    /* El scroll dispara muchisimos eventos por gesto; se pinta una vez por fotograma. */
    var heroPend = false;
    heroTrack.addEventListener('scroll', function () {
      if (heroPend) return;
      heroPend = true;
      requestAnimationFrame(function () { heroPend = false; heroPintarEstado(); });
    });
    heroPrev.addEventListener('click', function () { heroIr(heroActual - 1); });
    heroNext.addEventListener('click', function () { heroIr(heroActual + 1); });
    heroTrack.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); heroIr(heroActual + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); heroIr(heroActual - 1); }
    });
    /* Al girar el movil cambia el ancho del carril y el scroll queda a medio camino. */
    window.addEventListener('resize', function () { heroIr(heroActual); });
    document.addEventListener('totm:lang', function () {
      var imgs = heroTrack.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) imgs[i].alt = tr('Photo of the restaurant');
    });
  }

  /* ---- la carta de este movil, ¿es la de ahora? ----
     Se compara la marca del HTML con la del servidor. version.json son treinta bytes y se
     pide sin cache, asi que la respuesta es siempre la de verdad.

     Se comprueba al abrir y al volver a la pestana, no en bucle: un cliente tiene la carta
     abierta media hora y no hace falta preguntar cada minuto por algo que cambia una vez al
     dia.

     Una sola recarga por sesion. Si el servidor no tuviera las cabeceras puestas, recargar
     devolveria otra vez la version vieja y el movil entraria en bucle; con el tope, en el
     peor caso se queda como estaba. */
  var RECARGA = '${CLAVE('recargada')}';

  function comprobarVersion() {
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (!v || !v.build || v.build === ${JSON.stringify(BUILD)}) return;
        var ya = false;
        try { ya = sessionStorage.getItem(RECARGA) === v.build; } catch (e) {}
        if (ya) return;
        try { sessionStorage.setItem(RECARGA, v.build); } catch (e) {}
        location.reload();
      })
      .catch(function () { /* sin conexion la carta sigue siendo util */ });
  }

  setTimeout(comprobarVersion, 2500);      // primero que se vea la carta, luego se comprueba
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) comprobarVersion();
  });

  /* ---- language ----
     Both languages ship in the same DOM, so switching keeps the open category, the scroll
     position and the state of the sheet. English is what the markup says; Spanish lives in
     data-es, which means the page still reads correctly if this script never runs. */
  /* ---- el desplegable de idioma ----
     Abre, cierra al elegir, al tocar fuera y con Escape; las flechas recorren la lista. Todo
     eso lo daba gratis un <select> nativo y aqui hay que escribirlo, que es el precio de un
     desplegable propio. A cambio, es el mismo control en los tres sistemas y con la letra y
     los colores de la carta. */
  var IDIOMAS = ${JSON.stringify(IDIOMAS)};
  var langCaja = document.getElementById('lang');
  var langTrigger = document.getElementById('lang-trigger');
  var langMenu = document.getElementById('lang-menu');
  var langFlag = document.getElementById('lang-flag');
  var langName = document.getElementById('lang-name');
  var langOpts = [].slice.call(document.querySelectorAll('.lang-opt'));

  function langAbrir(abre) {
    if (!langTrigger) return;
    langTrigger.setAttribute('aria-expanded', String(abre));
    if (abre) {
      langMenu.hidden = false;
      langMenu.classList.add('is-closed');
      /* un fotograma en el estado cerrado para que el navegador tenga desde donde animar */
      void langMenu.offsetWidth;
      langMenu.classList.remove('is-closed');
      var marcado = langMenu.querySelector('[aria-checked="true"]') || langOpts[0];
      if (marcado) marcado.focus();
    } else {
      langMenu.classList.add('is-closed');
      if (reduce) { langMenu.hidden = true; return; }
      setTimeout(function () {
        if (langTrigger.getAttribute('aria-expanded') === 'false') langMenu.hidden = true;
      }, 180);
    }
  }

  if (langTrigger) {
    langTrigger.addEventListener('click', function () {
      langAbrir(langTrigger.getAttribute('aria-expanded') !== 'true');
    });
    langOpts.forEach(function (o, i) {
      o.addEventListener('click', function () {
        setLang(o.dataset.lang);
        langAbrir(false);
        langTrigger.focus();
      });
      o.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          var j = (i + (e.key === 'ArrowDown' ? 1 : -1) + langOpts.length) % langOpts.length;
          langOpts[j].focus();
        }
      });
    });
    /* Tocar fuera cierra. En pointerdown y no en click: si no, arrastrar la carta con el menu
       abierto lo deja abierto hasta que se suelta el dedo. */
    document.addEventListener('pointerdown', function (e) {
      if (langTrigger.getAttribute('aria-expanded') !== 'true') return;
      if (langCaja.contains(e.target)) return;
      langAbrir(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (langTrigger.getAttribute('aria-expanded') !== 'true') return;
      langAbrir(false);
      langTrigger.focus();
    });
  }

  function langPintar(lang) {
    var l = null;
    for (var i = 0; i < IDIOMAS.length; i++) if (IDIOMAS[i].code === lang) l = IDIOMAS[i];
    if (!l) return;
    if (langFlag) langFlag.innerHTML = l.flag;
    if (langName) langName.textContent = l.name;
    langOpts.forEach(function (o) {
      o.setAttribute('aria-checked', String(o.dataset.lang === lang));
    });
  }

  function setLang(lang) {
    document.documentElement.lang = lang;
    /* El enlace al juego lleva el idioma que se está mirando: el juego abre en ese idioma
       aunque localStorage no esté disponible (modo privado). */
    var tarjetaJuego = document.getElementById('game-card');
    if (tarjetaJuego) tarjetaJuego.href = 'juego.html?lang=' + encodeURIComponent(lang);

    document.querySelectorAll('[data-es]').forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.tagName === 'META' ? el.content : el.textContent;
      var next = el.dataset[lang] !== undefined ? el.dataset[lang] : el.dataset.en;
      if (el.tagName === 'META') el.content = next;
      else el.textContent = next;
    });

    document.querySelectorAll('[data-es-label]').forEach(function (el) {
      if (el.dataset.enLabel === undefined) el.dataset.enLabel = el.getAttribute('aria-label');
      var k = lang + 'Label';
      el.setAttribute('aria-label', el.dataset[k] !== undefined ? el.dataset[k] : el.dataset.enLabel);
    });

    document.title = TITLE[lang] || TITLE.en;
    document.dispatchEvent(new CustomEvent('totm:lang'));
    langPintar(lang);
    try { localStorage.setItem('${CLAVE('lang')}', lang); } catch (e) {}

    // the category names just changed width — remeasure the scroller and re-centre the chip
    syncScroller();
    var activeChip = nav.querySelector('.nav-item.active .nav-link');
    if (activeChip && activeChip.scrollIntoView) {
      activeChip.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
    }
  }



  /* ---- que idioma se abre ----
     Manda lo que el cliente eligio la ultima vez. Si no ha elegido nunca, el de su telefono:
     se recorre navigator.languages entera y no solo la primera, porque un movil configurado
     en catalan con ingles detras tiene que abrir en ingles y no en el idioma de la casa.
     Si ninguno de los suyos es de los tres, ingles — es el idioma que mas turistas comparten
     y ninguno se queda con una carta que no entiende.

     Y se llama SIEMPRE, tambien para el ingles. Antes habia una condicion que se lo saltaba cuando tocaba ingles: con las tres
     pildoras daba igual, porque el marcado ya venia con el ingles marcado, pero el
     desplegable pinta su bandera y su nombre desde el JS. El resultado era
     un selector en blanco en cualquier telefono que no estuviera en español ni en aleman. */
  function idiomaSoportado(c) {
    for (var i = 0; i < IDIOMAS.length; i++) if (IDIOMAS[i].code === c) return true;
    return false;
  }

  function idiomaDelNavegador() {
    var lista = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ''];
    for (var i = 0; i < lista.length; i++) {
      var c = String(lista[i] || '').slice(0, 2).toLowerCase();
      if (idiomaSoportado(c)) return c;
    }
    return 'en';
  }

  var saved;
  try { saved = localStorage.getItem('${CLAVE('lang')}'); } catch (e) {}
  if (!saved || !idiomaSoportado(saved)) saved = idiomaDelNavegador();
  setLang(saved);

  /* ---- category index sheet ---- */
  var fab = document.getElementById('menu-fab');
  var sheet = document.getElementById('category-sheet');

  var sheetInvocador = null;   // a quién devolver el foco al cerrar: lupa o botón flotante

  function openSheet(alBuscador) {
    clearTimeout(closeTimer);
    sheetInvocador = document.activeElement;
    /* Una entrada de historial mientras la hoja está abierta: el botón atrás del móvil la
       cierra en vez de sacar al cliente de la carta, que es lo que hacía hasta ahora. */
    try { history.pushState({ totmHoja: 1 }, ''); } catch (e) {}
    sheet.hidden = false;
    // one frame at the closed position so the browser has something to transition from
    void sheet.offsetHeight;
    sheet.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    /* Abierta desde la lupa se enfoca el campo, que es a lo que se venia. Abierta desde el
       boton de categorias NO: en un movil eso levanta el teclado y tapa media hoja antes de
       que nadie haya pedido escribir. */
    var foco = alBuscador
      ? document.getElementById('ds-q')
      : (sheet.querySelector('.sheet-item[aria-current="true"]') || sheet.querySelector('.sheet-close'));
    if (foco) foco.focus({ preventScroll: true });
  }

  var sheetPanel = sheet.querySelector('.sheet-panel');
  var closeTimer;

  function closeSheet(porHistorial) {
    if (sheet.hidden) return;
    /* Si el cierre NO viene del botón atrás hay que deshacer la entrada que puso openSheet;
       si viene de él, el navegador ya la ha quitado y volver a llamar retrocedería dos veces
       —sacando al cliente de la carta, que es justo lo que se quería evitar—. */
    if (!porHistorial) {
      try { if (history.state && history.state.totmHoja) history.back(); } catch (e) {}
    }
    sheet.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    /* El foco vuelve a quien abrió la hoja — la lupa de la barra o el botón flotante —,
       no siempre al botón flotante: quien navegaba con teclado no debe perder el sitio. */
    if (sheetInvocador && document.contains(sheetInvocador) && sheetInvocador.focus) {
      sheetInvocador.focus();
    } else {
      fab.focus();
    }
    sheetInvocador = null;
    // the panel leaves the way it came, so it stays mounted until the slide-down finishes
    clearTimeout(closeTimer);
    if (reduce) { sheet.hidden = true; return; }
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      sheetPanel.removeEventListener('transitionend', onEnd);
      if (!sheet.classList.contains('is-open')) sheet.hidden = true;
    };
    var onEnd = function (e) { if (e.propertyName === 'transform') finish(); };
    sheetPanel.addEventListener('transitionend', onEnd);
    closeTimer = setTimeout(finish, 400); // transitionend can be skipped on a hidden tab
  }

  fab.addEventListener('click', function () { openSheet(false); });

  var lupa = document.getElementById('nav-search');
  if (lupa) lupa.addEventListener('click', function () { openSheet(true); });

  sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { closeSheet(); return; }
    var item = e.target.closest('.sheet-item');
    if (!item) return;
    selectTab(item.dataset.target);
    closeSheet();
    var top = sentinel.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
  });


  /* ------------------------------------------------------------------ *
   * Buscador de platos
   * ------------------------------------------------------------------ *
   * No hay indice ni copia de la carta: las 312 filas ya estan en el DOM, con su numero, su
   * precio, sus marcas de dieta y su estado del dia. Buscar es recorrerlas. Por eso el
   * buscador no anade una sola peticion ni un solo kilobyte de datos.
   *
   * Se busca sin tildes y sin mayusculas: nadie escribe acentos en el movil de un
   * restaurante, y "menta" tiene que encontrar "Mentha" igual que al reves.
   */
  var dsQ = document.getElementById('ds-q');
  var dsCampo = dsQ ? dsQ.parentNode : null;
  var dsRes = document.getElementById('ds-results');
  var dsTotal = document.getElementById('ds-total');
  var dsHits = document.getElementById('ds-hits');
  var dsChips = [].slice.call(document.querySelectorAll('.ds-chip'));
  var dsFiltros = { vegan: false, gf: false, offer: false, tag: '' };
  /* Las seis etiquetas del panel, en su orden. Cada una es un chip que sólo existe mientras
     algún plato la lleve —el panel las pone y las quita a diario— igual que el de oferta. */
  var TAG_KEYS = ['Bestseller', 'Most loved', 'Signature', 'Popular', 'Must try', 'Veggie favourite'];
  var TOPE = 60;               // mas resultados que esto no se leen: se afina la busqueda

  var DS = dsQ ? [].slice.call(document.querySelectorAll('.single-menu-items[data-key]')).map(function (fila) {
    var pane = fila.closest('.tab-pane');
    return {
      el: fila,
      pane: pane,
      chip: pane ? document.querySelector('.nav-link[data-target="' + pane.id + '"]') : null,
      /* ojo: el primer .i18n dentro del h3 es la etiqueta de agotado, que vive en
         .item-tags. El nombre del plato es el hijo DIRECTO del h3. */
      nombre: fila.querySelector('h3 > .i18n') || fila.querySelector('h3'),
      num: ((fila.querySelector('.item-id') || {}).textContent || '').trim(),
      vegan: !!fila.querySelector('.diet-vegan'),
      gf: !!fila.querySelector('.diet-gf'),
    };
  }) : [];

  function dsPlano(t) {
    var d = String(t).toLowerCase().normalize('NFD');
    var out = '';
    for (var i = 0; i < d.length; i++) {
      var c = d.charCodeAt(i);
      if (c >= 768 && c <= 879) continue;      // los diacriticos, fuera
      out += d.charAt(i);
    }
    return out;
  }

  /* has-offer lo pone render() en el h6 del precio, no en la fila: la oferta es del precio. */
  function dsOferta(f) { return !!f.el.querySelector('h6.has-offer'); }
  function dsAgotado(f) { return f.el.classList.contains('is-sold-out'); }
  function dsTag(f) { var t = f.el.querySelector('.item-tag-high:not([hidden])'); return t ? (t.dataset.tag || '') : ''; }

  function dsPasa(f, salvo) {
    if (dsFiltros.vegan && salvo !== 'vegan' && !f.vegan) return false;
    if (dsFiltros.gf && salvo !== 'gf' && !f.gf) return false;
    if (dsFiltros.offer && salvo !== 'offer' && !dsOferta(f)) return false;
    if (dsFiltros.tag && salvo !== 'tag' && dsTag(f) !== dsFiltros.tag) return false;
    return true;
  }

  /* El numero de cada chip no es el total de la carta: es cuantos platos anadiria ESE chip
     dentro de lo que ya esta filtrado por los otros. Un contador que promete 53 y entrega 10
     es peor que no poner contador. */
  function dsCuentas() {
    if (!dsQ) return;

    /* El chip de oferta no es como los otros dos. Vegano y sin gluten son una propiedad del
       plato, escrita en la carta y siempre cierta; la oferta es un estado de la hora, que
       enciende y apaga el panel. Fuera de su franja no hay nada que filtrar, asi que el chip
       se va en vez de quedarse marcando cero y sin hacer nada. Vuelve solo.
       Se mira si hay ALGUNA oferta viva, no cuantas quedan dentro de los otros filtros: si
       alguien tiene puesto vegano y hoy no hay ningun vegano rebajado, la oferta sigue
       existiendo y el chip tiene que seguir ahi. */
    var hayOferta = false;
    for (var j = 0; j < DS.length; j++) {
      if (!DS[j].el.hidden && dsOferta(DS[j])) { hayOferta = true; break; }
    }
    var chipOferta = document.querySelector('.ds-chip[data-filter="offer"]');
    if (chipOferta) {
      chipOferta.hidden = !hayOferta;
      /* Si la franja se acaba con el filtro puesto, se quita solo: si no, la carta se
         quedaria vacia sin nada en pantalla que explicara por que. */
      if (!hayOferta && dsFiltros.offer) {
        dsFiltros.offer = false;
        chipOferta.setAttribute('aria-pressed', 'false');
        dsPintar();
      }
    }

    dsChips.forEach(function (chip) {
      var k = chip.dataset.filter;
      var n = 0;
      for (var i = 0; i < DS.length; i++) {
        var f = DS[i];
        if (f.el.hidden || !dsPasa(f, k)) continue;
        if (k === 'vegan' ? f.vegan : k === 'gf' ? f.gf : dsOferta(f)) n++;
      }
      var hueco = chip.querySelector('.n');
      if (hueco) hueco.textContent = n;
    });

    /* Chips de etiqueta. Existen sólo mientras algún plato lleve esa etiqueta; el contador es
       cuántos añadiría dentro de lo ya filtrado. Son excluyentes entre sí (un plato lleva una
       sola etiqueta), así que tocar uno suelta el otro. */
    var caja = document.querySelector('.ds-chips');
    if (!caja) return;
    var vivo = false;
    TAG_KEYS.forEach(function (tag) {
      var chip = caja.querySelector('.ds-chip-tag[data-tag="' + tag + '"]');
      if (!chip) {
        chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ds-chip ds-chip-tag';
        chip.dataset.tag = tag;
        chip.setAttribute('aria-pressed', 'false');
        chip.innerHTML = '<span class="t"></span> <span class="n"></span>';
        chip.addEventListener('click', function () {
          dsFiltros.tag = dsFiltros.tag === tag ? '' : tag;
          caja.querySelectorAll('.ds-chip-tag').forEach(function (c) {
            c.setAttribute('aria-pressed', String(c.dataset.tag === dsFiltros.tag));
          });
          dsCuentas();
          dsPintar();
        });
        caja.appendChild(chip);
      }
      var total = 0, dentro = 0;
      for (var j = 0; j < DS.length; j++) {
        if (DS[j].el.hidden || dsTag(DS[j]) !== tag) continue;
        total++;
        if (dsPasa(DS[j], 'tag')) dentro++;
      }
      chip.hidden = total === 0;
      chip.querySelector('.t').textContent = tr(tag);
      chip.querySelector('.n').textContent = dentro;
      if (dsFiltros.tag === tag && total > 0) vivo = true;
    });
    /* Si el panel quita la etiqueta que estaba filtrando, el filtro se suelta solo: si no, la
       lista se quedaría vacía sin nada en pantalla que lo explicara. */
    if (dsFiltros.tag && !vivo) {
      dsFiltros.tag = '';
      caja.querySelectorAll('.ds-chip-tag').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      dsPintar();
    }
  }

  function dsPintar() {
    if (!dsQ) return;
    var t = dsPlano(dsQ.value.trim());
    var hayFiltro = dsFiltros.vegan || dsFiltros.gf || dsFiltros.offer || !!dsFiltros.tag;
    var activo = !!t || hayFiltro;
    sheet.classList.toggle('is-searching', activo);
    dsRes.hidden = !activo;
    if (!activo) { dsHits.textContent = ''; dsTotal.textContent = ''; return; }

    var enc = DS.filter(function (f) {
      if (f.el.hidden) return false;                // oculto desde el panel
      if (!dsPasa(f)) return false;
      if (!t) return true;
      return dsPlano(f.nombre.textContent).indexOf(t) !== -1 || f.num.indexOf(t) !== -1;
    });

    dsTotal.textContent = fill(tr(enc.length === 1 ? '{n} dish' : '{n} dishes'), { n: enc.length });
    dsHits.textContent = '';

    if (!enc.length) {
      /* Un vacio tiene dos causas y el cliente no sabe cual le ha tocado: o ese plato no
         existe, o lo escondio un filtro que puso hace treinta segundos. Si hay filtros
         puestos se dice, y se ofrece quitarlos. Si no, no se ofrece nada. */
      var vacio = document.createElement('p');
      vacio.className = 'ds-empty';
      vacio.textContent = tr(hayFiltro ? 'Nothing matches inside the filters.' : 'Nothing matches. Try another word.');
      dsHits.appendChild(vacio);
      if (hayFiltro) {
        var quitar = document.createElement('button');
        quitar.type = 'button';
        quitar.className = 'ds-reset';
        quitar.textContent = tr('Clear filters');
        quitar.addEventListener('click', dsQuitarFiltros);
        dsHits.appendChild(quitar);
      }
      return;
    }

    enc.slice(0, TOPE).forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ds-hit' + (dsAgotado(f) ? ' is-off' : '');

      var num = document.createElement('span');
      num.className = 'ds-hit-num';
      num.textContent = f.num;

      var nom = document.createElement('span');
      nom.className = 'ds-hit-name';
      nom.appendChild(document.createTextNode(f.nombre.textContent));
      var marcas = f.el.querySelector('.diet-marks');
      if (marcas) nom.appendChild(marcas.cloneNode(true));

      var donde = document.createElement('span');
      donde.className = 'ds-hit-where';
      donde.textContent = (f.chip ? f.chip.textContent : '') +
        (dsAgotado(f) ? ' - ' + tr('Sold out today') : '');
      nom.appendChild(donde);

      var pre = document.createElement('span');
      pre.className = 'ds-hit-price';
      var precio = f.el.querySelector('.price-now') || f.el.querySelector('h6');
      pre.textContent = precio ? precio.textContent.trim() : '';

      b.appendChild(num); b.appendChild(nom); b.appendChild(pre);
      b.addEventListener('click', function () { dsSaltar(f); });
      dsHits.appendChild(b);
    });

    if (enc.length > TOPE) {
      var mas = document.createElement('p');
      mas.className = 'ds-empty';
      mas.textContent = fill(tr('and {n} more. Narrow the search.'), { n: enc.length - TOPE });
      dsHits.appendChild(mas);
    }
  }

  /* Tocar un resultado abre su pestana, cierra la hoja y deja el plato en pantalla. El
     destello dura lo justo para que el ojo lo encuentre entre veinte filas iguales. */
  function dsSaltar(f) {
    if (f.pane) selectTab(f.pane.id);
    closeSheet();
    setTimeout(function () {
      f.el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      f.el.classList.remove('ds-flash');
      void f.el.offsetWidth;                    // reinicia la animacion aunque sea el mismo plato
      f.el.classList.add('ds-flash');
    }, reduce ? 0 : 260);
  }

  function dsQuitarFiltros() {
    dsFiltros.vegan = dsFiltros.gf = dsFiltros.offer = false;
    dsFiltros.tag = '';
    dsChips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    document.querySelectorAll('.ds-chip-tag').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    dsCuentas();
    dsPintar();
  }

  if (dsQ) {
    dsQ.addEventListener('input', function () {
      dsCampo.classList.toggle('has-text', !!dsQ.value);
      dsPintar();
    });
    dsQ.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      dsQ.blur();                               // en el movil, baja el teclado y deja ver
    });
    document.getElementById('ds-clear').addEventListener('click', function () {
      dsQ.value = '';
      dsCampo.classList.remove('has-text');
      dsPintar();
      dsQ.focus();
    });
    dsChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var k = chip.dataset.filter;
        dsFiltros[k] = !dsFiltros[k];
        chip.setAttribute('aria-pressed', String(dsFiltros[k]));
        dsCuentas();
        dsPintar();
      });
    });
    /* Los nombres cambian con el idioma, asi que lo encontrado tambien; y el texto guia del
       campo, que no puede salir del build porque va dentro de un atributo. */
    function dsPlaceholder() { dsQ.placeholder = tr('Search dish or number'); }
    document.addEventListener('totm:lang', function () { dsPlaceholder(); dsCuentas(); dsPintar(); });
    dsPlaceholder();
    dsCuentas();
  }

  /* ------------------------------------------------------------------ *
   * Arrastre de la hoja
   * ------------------------------------------------------------------ *
   * Sigue al dedo 1:1, se cierra por velocidad y no solo por distancia --un golpe seco tiene
   * que bastar-- y opone resistencia creciente si se tira hacia arriba, en vez de chocar
   * contra una pared invisible.
   *
   * Con prefers-reduced-motion no se activa: ahi la hoja aparece y desaparece con una
   * opacidad y sin desplazarse, y arrastrarla seria justo el movimiento que se ha pedido no
   * tener.
   */
  if (!reduce && window.PointerEvent) {
    var arrastrando = false, y0 = 0, t0 = 0, dy = 0;

    /* Cuanto mas se tira de mas, menos se mueve. Las cosas de verdad no chocan: frenan. */
    var elastico = function (x) { return (x * 90) / (90 + Math.abs(x)); };

    /* El gesto empieza en cualquier punto de la hoja, TAMBIÉN sobre la lista. Antes se
       descartaba en cuanto el dedo caía sobre un botón, y la lista entera son botones: por eso
       en la práctica sólo se podía arrastrar desde la barrita de arriba y casi nadie lo
       encontraba. Ahora se espera: hasta que el dedo no baja 8px no hay arrastre, así que un
       toque normal sigue siendo un toque y elige su categoría. */
    var pendiente = false;
    var UMBRAL = 8;

    sheetPanel.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      /* Solo en movil. De 768 para arriba la hoja va centrada con un translate propio, y
         escribirle otro encima la descolocaria; ademas arrastrar con raton una hoja que
         tiene su boton de cerrar a la vista no aporta nada. */
      if (window.innerWidth >= 768) return;
      if (e.target.closest('input, [contenteditable]')) return;
      if (sheetPanel.scrollTop > 0) return;     // si hay scroll dentro, manda el scroll
      pendiente = true;
      arrastrando = false;
      dy = 0;
      y0 = e.clientY;
      t0 = e.timeStamp;
    });

    sheetPanel.addEventListener('pointermove', function (e) {
      if (!pendiente && !arrastrando) return;
      var d = e.clientY - y0;
      if (!arrastrando) {
        /* Hacia arriba, o sin llegar al umbral, no es un arrastre: es scroll o un toque. */
        if (d < UMBRAL) { if (d < -UMBRAL) pendiente = false; return; }
        if (sheetPanel.scrollTop > 0) { pendiente = false; return; }
        arrastrando = true;
        sheetPanel.setPointerCapture(e.pointerId);
        sheetPanel.style.transition = 'none';
      }
      dy = d > 0 ? d : elastico(d);
      sheetPanel.style.transform = 'translateY(' + dy + 'px)';
    });

    var soltar = function (e) {
      pendiente = false;
      if (!arrastrando) return;
      arrastrando = false;
      sheetPanel.style.transition = '';
      sheetPanel.style.transform = '';
      var v = Math.abs(dy) / Math.max(1, e.timeStamp - t0);
      if (dy > sheetPanel.offsetHeight * 0.35 || (dy > 24 && v > 0.11)) closeSheet();
    };
    sheetPanel.addEventListener('pointerup', soltar);
    sheetPanel.addEventListener('pointercancel', soltar);

    /* La barrita de arriba era sólo un dibujo. Un toque en su franja cierra: es donde la mano
       ya va a buscar el arrastre, y no hay nada más ahí con lo que chocar. */
    sheetPanel.addEventListener('click', function (e) {
      if (e.target !== sheetPanel) return;
      if (e.clientY - sheetPanel.getBoundingClientRect().top <= 22) closeSheet();
    });
  }

  window.addEventListener('popstate', function () {
    if (!sheet.hidden) closeSheet(true);
  });

  /* ---- tamaño del texto ----
     El valor vive en --escala y sólo lo leen las reglas del texto de plato. Se guarda como el
     tema, y como el tema se aplica en el <script> de la cabecera, antes de pintar: si se
     aplicara aquí, cada carga empezaría con la letra pequeña y daría un salto al llegar. */
  (function () {
    var caja = document.getElementById('txt-size');
    if (!caja) return;
    var botones = [].slice.call(caja.querySelectorAll('.txt-size-btn'));

    function poner(valor, guardar) {
      document.documentElement.style.setProperty('--escala', valor);
      botones.forEach(function (b) {
        b.setAttribute('aria-pressed', b.dataset.escala === valor ? 'true' : 'false');
      });
      if (guardar) { try { localStorage.setItem('${CLAVE('escala')}', valor); } catch (e) {} }
    }

    botones.forEach(function (b) {
      b.addEventListener('click', function () { poner(b.dataset.escala, true); });
    });

    /* El botón marcado tiene que coincidir con lo que ya aplicó la cabecera. */
    var guardado = '1';
    try { guardado = localStorage.getItem('${CLAVE('escala')}') || '1'; } catch (e) {}
    if (!botones.some(function (b) { return b.dataset.escala === guardado; })) guardado = '1';
    poner(guardado, false);
  })();

  document.addEventListener('keydown', function (e) {
    if (sheet.hidden) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key !== 'Tab') return;
    // keep focus inside the sheet while it is open
    var focusable = sheet.querySelectorAll('button, input');
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

})();
</script>

</body>
</html>
`;

if (missingTr.length) {
  throw new Error('missing translations (' + missingTr.length + '):\n  ' + missingTr.slice(0, 40).join('\n  '));
}
const tabsWithoutIcon = GROUPS.map(([l]) => l).filter((l) => !TAB_ICON[l]);
if (tabsWithoutIcon.length) {
  throw new Error('tabs with no icon in the index sheet: ' + tabsWithoutIcon.join(' | '));
}
/* Las cadenas del runtime no pasan por T(), así que el control de traducciones que hay más
   arriba no las ve: una que falte saldría como undefined en la carta sin avisar. Aquí sí. */
const runtimeSinTraducir = [];
for (const k of RUNTIME_STRINGS) {
  for (const l of LANGS) {
    if (typeof l.dicts.ui[k] !== 'string') runtimeSinTraducir.push(l.code + ' / ui: "' + k + '"');
  }
}
if (runtimeSinTraducir.length) {
  throw new Error('cadenas del runtime sin traducir:' + String.fromCharCode(10) + '  '
    + runtimeSinTraducir.join(String.fromCharCode(10) + '  '));
}

if (missingIcons.length) {
  throw new Error('subcategories with a heading but no icon:\n  ' + [...new Set(missingIcons)].join('\n  '));
}

writeFileSync(new URL('./index.html', import.meta.url), html);

/* Treinta bytes que dicen que compilacion es la buena. Se sube junto al index.html; si falta,
   la comprobacion falla en silencio y la carta funciona igual. */
writeFileSync(
  new URL('./version.json', import.meta.url),
  JSON.stringify({ build: BUILD }) + String.fromCharCode(10),
);

/* Chilli Rush. Página aparte para no cargarle 20 KB a los 580 de la carta, pero construida
   aquí para que comparta tokens, tipografías y diccionarios: un solo sitio donde vive el
   diseño y un solo sitio donde viven las traducciones. */
const juego = buildGame({
  T, TL, TOKENS, FONTS, LANGS, LANG_CODES: LANGS.map((l) => l.code), IDIOMAS, CLIENTE, CLAVE,
  TEMAS_SLUGS: [TEMA_POR_DEFECTO].concat(TEMAS.map((t) => t.slug).filter((s) => s !== TEMA_POR_DEFECTO)),
  TEMA_INK: derivar(TEMAS.find((t) => t.slug === TEMA_POR_DEFECTO))['--ink'],
  /* El mismo titulo en los tres idiomas: es el nombre del juego y el del restaurante. */
  titles: Object.fromEntries(['en'].concat(LANGS.map((l) => l.code))
    .map((c) => [c, CLIENTE.tituloJuego])),
});
writeFileSync(new URL('./juego.html', import.meta.url), juego);

/* El panel también bebe de aquí. Antes tenía su propia paleta y sus propias fuentes copiadas
   a mano, que es como se acaba con dos verdades: se cambia un color en la carta y el panel se
   queda con el viejo. Ahora el build le escribe los tokens y el link de las tipografías, y el
   PHP los enlaza. Un solo sitio donde vive el diseño. */
const NL = String.fromCharCode(10);
const avisoCss = [
  '/* Generado por gen.mjs. No editar a mano: se sobrescribe en cada build.',
  '   Los mismos tokens que la carta, para que el panel no parezca otra aplicación. */',
].join(NL);
writeFileSync(new URL('./server/admin/tokens.css', import.meta.url), avisoCss + NL + TOKENS + NL);
writeFileSync(
  new URL('./server/admin/fuentes.html', import.meta.url),
  '<!-- Generado por gen.mjs. Las mismas dos tipografías que la carta. -->' + NL + FONTS + NL,
);

/* The panel needs the dish list, and there must be exactly one source of truth for it, so it
   is emitted here rather than retyped in PHP. Keys match the data-key on every row. */
const catalogue = GROUPS.flatMap(([tab, subs]) =>
  subs.flatMap(([cat, sublabel]) =>
    categories[cat].items.map((it) => ({
      key: cat + ' :: ' + it.name,
      id: it.id,
      name: it.name,
      tab,
      group: sublabel || tab,
      cat,                                   // la categoría que forma la clave: la usan las ofertas
      price: /^included$/i.test(it.price) ? '' : String(it.price),
      /* Lo mismo que ve el cliente en la carta en español: el panel lo enseña tal cual, para
         que «56 · Cordero · Currys» sea igual en los dos sitios. El inglés sigue en name. */
      es: tr(it.name, 'names', LANGS[0]),
      tab_es: tr(tab, 'tabs', LANGS[0]),
      group_es: sublabel ? tr(sublabel, 'groups', LANGS[0]) : tr(tab, 'tabs', LANGS[0]),
    }))));
/* Los temas de marca, ya derivados, para que el panel pinte cada muestra con sus colores
   reales sin repetir en PHP la aritmética de contraste. Misma regla que platos.json: una
   sola verdad, escrita por el build. */
writeFileSync(
  new URL('./server/admin/temas.json', import.meta.url),
  JSON.stringify({ porDefecto: TEMA_POR_DEFECTO, temas: temasParaPanel() }, null, 1),
);

/* Directo a server/admin/, como temas.json: el catálogo se sube desde ahí y tenerlo en la
   raíz obligaba a un movimiento a mano que tarde o temprano se olvida. */
writeFileSync(new URL('./server/admin/platos.json', import.meta.url), JSON.stringify(catalogue, null, 1));

/* El panel comprueba los códigos del juego, así que necesita exactamente la misma sal que usa el
   JavaScript para firmarlos. Estaba escrita a mano en los dos sitios —juego.mjs y index.php— y
   con dos restaurantes eso significaba que un código ganado en uno se canjeaba en el otro.
   Ahora sale de cliente.mjs y el build la escribe aquí; config.php sólo la incluye.

   Va en su propio archivo y no dentro de config.php porque config.php se edita a mano (el modo
   demo, los minutos de sesión) y lo que genera el build no puede pisar lo que escribe una
   persona. Es la misma regla que tokens.css, temas.json y platos.json. */
writeFileSync(
  new URL('./server/admin/cliente.php', import.meta.url),
  [
    '<?php',
    '/* Generado por gen.mjs desde cliente.mjs. No editar a mano: se sobrescribe en cada build. */',
    "define('CLIENTE_SLUG', " + JSON.stringify(CLIENTE.slug) + ');',
    "define('CR_SECRETO', " + JSON.stringify(CLIENTE.secreto) + ');',
    '',
  ].join(NL),
);
/* Bytes de verdad, no `length`: el HTML va en UTF-8 y ahi una `a` con tilde ocupa dos, una raya
   larga tres. Contando caracteres el log decia 697226 y el fichero pesaba 699256, y esos 2030 de
   diferencia parecen contenido perdido cuando no lo son. */
console.log(
  'cliente', CLIENTE.slug, '|',
  'written', Buffer.byteLength(html), 'bytes | juego', Buffer.byteLength(juego), 'bytes |', catalogue.length, 'dishes |',
  GROUPS.length, 'tabs |',
  Object.keys(categories).filter((c) => categories[c].items.length).length, 'categories |',
  totalItems, 'items'
);

/* ---- el paquete que se sube ----
 * Hasta ahora el LEEME prometía que 2-subir se rehacía en cada compilación y no era verdad:
 * gen.mjs escribía dentro de 1-proyecto y el volcado se hacía a mano. Eso deja pasar el error
 * que más caro sale de todos: subir un index.html nuevo con el version.json viejo. Los dos
 * llevan la marca del build y el runtime los compara, así que descuadrados el móvil del
 * cliente se recarga una vez por sesión, para siempre, sin alcanzar nunca la marca que pide.
 *
 * Se rehace entero, no se sincroniza: copiar encima deja vivo lo que se borró del origen, y
 * un fichero que sobrevive a su fuente acaba subido al servidor sin que nadie sepa de dónde
 * salió. Por eso la carpeta se borra antes, y por eso el LEEME avisa de no guardar nada ahí.
 *
 * Lo que NO viaja: lo que escribe el panel en el servidor (contraseñas, intentos, canjes, el
 * registro de accesos) y assets/hero/. Si alguna vez aparece una copia local de esos ficheros,
 * subirla encima de la del hosting borraría la contraseña del restaurante o su historial. La
 * lista está aquí y no en la cabeza de nadie.
 */
const SUBIR = new URL('../2-subir/', import.meta.url);
if (!SUBIR.pathname.replace(/\/$/, '').endsWith('/2-subir')) {
  throw new Error('la carpeta de subida no es 2-subir: ' + SUBIR.pathname);
}

/* Nombres, no rutas: cualquiera de estos que aparezca en server/admin/ se queda en tierra. */
const NO_SUBIR = new Set([
  'SPEC.md',            // notas de diseño del panel; no pinta nada en el hosting
  'clave.php',          // la escribe el panel: contraseña del restaurante
  'superclave.php',     // ídem, superadministrador
  'intentos.json',      // control de fuerza bruta
  'accesos.log',        // registro de entradas
  'canjes.json',        // premios canjeados
]);

const copiar = (desde, hasta) => {
  mkdirSync(new URL('./', hasta), { recursive: true });
  copyFileSync(new URL(desde, import.meta.url), hasta);
};

/* Los ficheros sueltos, con el nombre que les toca al otro lado. estado.json va de EJEMPLO
   porque el del servidor lo escribe el panel y pisarlo borraría los agotados del día. */
const SUELTOS = [
  ['./index.html', 'index.html'],
  ['./juego.html', 'juego.html'],
  ['./version.json', 'version.json'],
  ['./server/.htaccess', '.htaccess'],
  ['./server/LEEME-SERVIDOR.txt', 'LEEME-SERVIDOR.txt'],
  ['./server/estado.json', 'estado-EJEMPLO.json'],
];

/* Carpetas enteras, sólo el primer nivel. Las subcarpetas que hay al otro lado las crea el
   panel en el servidor y no tienen original aquí: assets/hero/ con las fotos que sube el
   restaurante, y admin/copias/ con el historial de estado.json. Subir cualquiera de las dos
   encima de la del hosting borraría trabajo del cliente, así que el build no baja de nivel. */
const CARPETAS = [
  ['./assets/', 'assets/'],
  ['./server/admin/', 'admin/'],
];

rmSync(SUBIR, { recursive: true, force: true });
mkdirSync(SUBIR, { recursive: true });

let copiados = 0;
for (const [desde, nombre] of SUELTOS) {
  copiar(desde, new URL(nombre, SUBIR));
  copiados++;
}
const dejados = [];
for (const [desde, destino] of CARPETAS) {
  for (const e of readdirSync(new URL(desde, import.meta.url), { withFileTypes: true })) {
    if (!e.isFile()) continue;                     // assets/hero/ y compañía
    if (NO_SUBIR.has(e.name)) { dejados.push(e.name); continue; }
    copiar(desde + e.name, new URL(destino + e.name, SUBIR));
    copiados++;
  }
}

console.log(
  '2-subir rehecha |', copiados, 'ficheros | build', BUILD,
  dejados.length ? '| en tierra: ' + dejados.join(', ') : ''
);
