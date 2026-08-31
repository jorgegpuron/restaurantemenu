import * as ES from './i18n.es.mjs';
import * as DE from './i18n.de.mjs';

/* Lo que distingue a ESTE restaurante de cualquier otro que use el mismo motor.
 *
 * Nace pequeño a propósito. Hoy sólo lleva las tres cosas que la fase 1 necesita para que dos
 * cartas puedan convivir en el mismo dominio sin pisarse. El nombre, la carta, los diccionarios
 * y la taxonomía siguen dentro del motor y salen en la fase 3: sacarlos ahora, sin los ID
 * estables hechos, sería mover dos veces las mismas 500 líneas.
 *
 * Cuando el motor viva fuera de la carpeta del cliente, este archivo es lo que el build recibirá
 * como `config`. Por eso está aquí y no repartido en constantes por gen.mjs.
 */
export const CLIENTE = {
  /* Prefijo de todo lo que la carta guarda en el navegador.
   *
   * localStorage es por ORIGEN, no por carpeta: dos restaurantes en socialcard.es comparten el
   * mismo almacén aunque estén en carpetas distintas. Sin prefijo propio, el comensal que entra
   * en los dos se lleva de uno a otro el tema, el idioma y el tamaño de letra — y el premio del
   * juego, que la carta sólo comprueba por fecha.
   *
   * Para Tinge of Turmeric se queda en 'totm', que es literalmente lo que ya había. Cambiarlo
   * por algo más bonito le borraría a cada cliente que ya tiene la carta abierta su tema, su
   * idioma y, si ha ganado hoy, su premio sin canjear. No hay ninguna razón para cobrar eso. */
  slug: 'totm',

  /* La dirección pública de esta carta, con la barra final. De aquí salen el canonical y el
   * og:url. Estaban escritos a mano en gen.mjs, así que dos restaurantes emitían el mismo y
   * competían entre ellos en Google por ser el original. */
  base: 'https://socialcard.es/tinge_of_turmeric/menu2/',

  /* La sal con la que se firman los códigos del juego. NO es seguridad y nunca lo fue: viaja en
   * el JavaScript de la página y cualquiera con la consola abierta fabrica uno. Sirve para lo
   * que pasa en una mesa, que es alguien enseñando la captura de ayer, y por eso el código lleva
   * la fecha dentro.
   *
   * Lo que sí arregla tenerla aquí: hasta ahora era el mismo literal en los once restaurantes
   * que vinieran, así que un código ganado en A se canjeaba en B. Cada cliente lleva la suya.
   * La de Tinge no se toca por la misma razón que el slug: cambiarla invalida los códigos que
   * alguien pueda tener en el móvil ahora mismo. */
  secreto: 'totm-chilli',

  /* Los rotulos. Cada uno sale en un sitio distinto y no son intercambiables:
     nombre        el titular grande de la portada
     titulo        la pestana del navegador y el titulo que ensena Google
     tituloSocial  el que sale al pegar el enlace en WhatsApp o Facebook
     rotulo        la linea pequena sobre el titular
     descripcion   la frase de Google, debajo del titulo
     tituloJuego   la pestana del navegador en la pagina del juego

     titulo, rotulo y descripcion se traducen: tienen que existir como clave en la
     seccion ui de cada diccionario de idioma. */
  nombre: 'Tinge of Turmeric',
  titulo: 'Tinge of Turmeric — Indian Restaurant Menu.',
  tituloSocial: 'Tinge of Turmeric — South Indian Restaurant Menu',
  rotulo: 'South Indian Restaurant Menu',
  descripcion: 'Tinge of Turmeric — Indian restaurant menu.',
  tituloJuego: 'Chilli Rush — Tinge of Turmeric',

  /* La imagen que sale al pegar el enlace en WhatsApp, Facebook o iMessage. Ruta relativa a
     `base`; si se deja vacía, el build no emite og:image y el enlace se comparte como texto
     pelado, que es lo que hacía hasta ahora.
     Open Graph pide 1200x630 como mínimo: ésta es 1620x1080.
     OJO: apunta a assets/hero/, que NO viaja en el build — las fotos de portada las sube el
     restaurante desde el panel. Si cambia las fotos, este nombre deja de existir y el enlace
     vuelve a compartirse sin imagen. Se comprueba abriendo la URL en el navegador. */
  imagenSocial: 'assets/hero/13e8475aef8d2630.jpg',

  /* La nota fiscal del pie de los precios. OBLIGATORIA: el build revienta si falta.
   *
   * Va aquí y no en el motor porque el impuesto no es el mismo en todas partes. En Canarias
   * es el IGIC; en la península sería el IVA, y fuera de España otra cosa con otro nombre.
   * Un cliente nuevo que copie esta carpeta tiene que decidirlo, y la guarda del build está
   * para que no se le olvide: es exactamente el mismo mecanismo que impide publicar con el
   * nombre o la dirección del restaurante anterior.
   *
   * Es la frase entera y no sólo las siglas, porque se lee sola al pie de la columna de
   * precios y no hay ningún asterisco arriba al que remitirse.
   *
   * Se traduce: tiene que existir como clave en la sección ui de cada diccionario. */
  impuesto: 'Prices include IGIC',
};

/* Se usa en todas partes como CLAVE('tema'), CLAVE('lang')... Una sola función y ni un literal
   'totm-' suelto en el código: el día que se añada una clave nueva, sale prefijada sin que nadie
   tenga que acordarse. */
export const CLAVE = (nombre) => CLIENTE.slug + '-' + nombre;

/* Los idiomas de ESTA carta, ademas del ingles, que es el texto del documento y siempre
   esta. Cada uno trae su diccionario. Anadir uno es anadir una linea aqui y su fichero;
   quitarlo, borrar la linea. El motor pone las banderas. */
export const IDIOMAS_CLIENTE = [
  { code: 'es', label: 'ES', dicts: ES, name: 'Español' },
  { code: 'de', label: 'DE', dicts: DE, name: 'Deutsch' },
];

/* ------------------------------------------------------------------ *
 * La estructura de la carta
 *
 * Que pestanas hay, que categorias de menu.md cuelgan de cada una y con que icono. Es lo
 * unico que hay que escribir a mano para un restaurante nuevo, y son datos: ninguna de
 * estas lineas es codigo del motor.
 *
 * Iconos disponibles, y no hay mas: appetizers, soup, vegetarian, meat, salad, flame,
 * leaf, lentils, rice, bread, fries, special, kids, bowl, drop.
 * ------------------------------------------------------------------ */
/* An optional line under the tab's first heading. Written by importar.mjs from carta.mjs. */
export const TAB_INTRO = {
  'Gluten Free': 'Cooked separately to avoid gluten. Some of these dishes cost a little more than in their original section.',
  'Vegan': 'Prepared using vegan alternatives such as plant-based butter, cream, yoghurt and milk. Some of these dishes cost a little more than in their original section.',
};

/* ------------------------------------------------------------------ *
 * 2. Group the 41 categories into 13 tabs
 *    [tab label, [[md category, subheading label (null = no subheading)], ...]]
 * ------------------------------------------------------------------ */


export const GROUPS = [
  ['Appetizers & Soups', [
    ['Appetizers', 'Appetizers'],
    ['Soups', 'Soups'],
  ]],
  ['Starters', [
    ['Starters - Vegetarian', 'Vegetarian'],
    ['Starters - Meat & Seafood', 'Meat & Seafood'],
  ]],
  ['Salads', [
    ['Salads', null],
  ]],
  ['Sizzlers', [
    ['Sizzlers', null],
  ]],
  /* La carta original repetía los catorce ingredientes: una vez para las salsas clásicas y
     otra, idénticos en nombre, descripción y precio, para las del sur de la India. Aquí se
     listan una sola vez y luego se elige salsa de una de las dos familias. No se ha quitado
     ningún plato: se ha quitado una copia. */
  ['Curries', [
    ['Curries - Ingredients', 'Choose Your Ingredient'],
    ['Curries - Sauces', 'Classic sauces'],
    ['South Indian Curries - Sauces', 'South Indian sauces'],
  ]],
  ['Specialities', [
    ['House Specialities', null],
  ]],
  ['Vegetables & Lentils', [
    ['Vegetable Dishes', 'Vegetable Dishes'],
    ['Indian Lentil Dishes', 'Indian Lentil Dishes'],
  ]],
  ['Biryani', [
    ['Classic Biryani', 'Classic Biryani'],
    ['Butter Masala Biryani', 'Butter Masala Biryani'],
  ]],
  ['Breads', [
    ['Naan Bread', 'Naan Bread'],
    ['Flat Breads', 'Flat Breads'],
  ]],
  ['Rice & Fries', [
    ['Indian Rice', 'Indian Rice'],
    ['Fries', 'Fries'],
  ]],
  ['Kids', [
    ['Kids Menu', null],
  ]],
  ['Gluten Free', [
    ['Gluten Free - Soups', 'Soups'],
    ['Gluten Free - Salads', 'Salads'],
    ['Gluten Free - Starters', 'Starters'],
    ['Gluten Free - Curries', 'Curries'],
    ['Gluten Free - Sizzlers', 'Sizzlers'],
    ['Gluten Free - Biryani', 'Biryani'],
    ['Gluten Free - Vegetable & Lentil Dishes', 'Vegetable & Lentil Dishes'],
    ['Gluten Free - Rice, Fries & Breads', 'Rice, Fries & Breads'],
    ['Gluten Free - Special Dishes', 'Special Dishes'],
  ]],
  ['Vegan', [
    ['Vegan - Appetizers', 'Appetizers'],
    ['Vegan - Soups', 'Soups'],
    ['Vegan - Salads', 'Salads'],
    ['Vegan - Starters', 'Starters'],
    ['Vegan - Curries', 'Curries'],
    ['Vegan - Vegetable Dishes', 'Vegetable Dishes'],
    ['Vegan - Indian Lentil Dishes', 'Indian Lentil Dishes'],
    ['Vegan - Special Biryani', 'Special Biryani'],
    ['Vegan - Butter Masala Biryani', 'Butter Masala Biryani'],
    ['Vegan - Rice & Fries', 'Rice & Fries'],
    ['Vegan - Sizzlers', 'Sizzlers'],
    ['Vegan - Flat Breads', 'Flat Breads'],
  ]],
];

/* The index sheet lists tabs, not subcategories, so it needs its own map. Same twelve
   shapes plus a face for the kids menu — no new family, no new stroke. */
export const TAB_ICON = {
  'Appetizers & Soups': 'soup',
  'Starters': 'appetizers',
  'Salads': 'salad',
  'Sizzlers': 'flame',
  'Curries': 'bowl',
  'Specialities': 'special',
  'Vegetables & Lentils': 'leaf',
  'Biryani': 'rice',
  'Breads': 'bread',
  'Rice & Fries': 'fries',
  'Kids': 'kids',
  'Gluten Free': 'gf',
  'Vegan': 'vegetarian',
};

export const GROUP_ICON_BY_CAT = {
  'Appetizers': 'appetizers',
  'Soups': 'soup',
  'Starters - Vegetarian': 'vegetarian',
  'Starters - Meat & Seafood': 'meat',
  'Curries - Ingredients': 'bowl',
  'Curries - Sauces': 'drop',
  'South Indian Curries - Ingredients': 'bowl',
  'South Indian Curries - Sauces': 'drop',
  'Vegetable Dishes': 'leaf',
  'Indian Lentil Dishes': 'lentils',
  'Classic Biryani': 'rice',
  'Butter Masala Biryani': 'rice',
  'Naan Bread': 'bread',
  'Flat Breads': 'bread',
  'Indian Rice': 'rice',
  'Fries': 'fries',
  'Gluten Free - Soups': 'soup',
  'Gluten Free - Salads': 'salad',
  'Gluten Free - Starters': 'meat',
  'Gluten Free - Curries': 'bowl',
  'Gluten Free - Sizzlers': 'flame',
  'Gluten Free - Biryani': 'rice',
  'Gluten Free - Vegetable & Lentil Dishes': 'lentils',
  'Gluten Free - Rice, Fries & Breads': 'rice',
  'Gluten Free - Special Dishes': 'special',
  'Vegan - Appetizers': 'appetizers',
  'Vegan - Soups': 'soup',
  'Vegan - Salads': 'salad',
  'Vegan - Starters': 'vegetarian',
  'Vegan - Curries': 'bowl',
  'Vegan - Vegetable Dishes': 'leaf',
  'Vegan - Indian Lentil Dishes': 'lentils',
  'Vegan - Special Biryani': 'special',
  'Vegan - Butter Masala Biryani': 'rice',
  'Vegan - Rice & Fries': 'rice',
  'Vegan - Sizzlers': 'flame',
  'Vegan - Flat Breads': 'bread',
};

/* Categorías que la carta impresa repite y aquí se muestran una sola vez. La clave es la
   copia; el valor, el original.

   Vacío desde que la carta se escribe en carta.mjs. Antes hacía falta: menu.md se mantenía a
   mano y llevaba dos veces los catorce ingredientes de los currys —una para las salsas
   clásicas y otra para las del sur de la India—, así que el build comparaba las dos listas y
   reventaba si alguien subía el precio del cordero en una sola. Ahora los catorce
   ingredientes están escritos UNA vez en carta.mjs, no hay segunda lista que pueda
   desviarse, y la comprobación se quedó sin nada que comparar.

   Lo que ve el comensal no cambió: la copia nunca se enseñaba, porque no colgaba de ninguna
   pestaña. Se sigue eligiendo salsa de una familia o de la otra.

   Si algún día vuelve a haber dos categorías que deban ser idénticas, se declaran aquí. */
export const CATEGORIAS_DUPLICADAS = {};
