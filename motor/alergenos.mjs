/* Catalogo inmutable de los 14 alergenos del Reglamento UE 1169/2011, Anexo II. Unica
 * fuente para todo el motor: gen.mjs pinta los iconos de la leyenda del pie con esto,
 * importar.mjs valida las etiquetas por plato contra esto. Antes habia dos catalogos
 * por separado (CONOCIDOS en importar.mjs, en espanol; ALERGENO/ALERGENO_LABEL en
 * gen.mjs, en ingles) que no coincidian entre si ni con el nombre legal de la categoria
 * (wheat no es una de las 14, cereals_gluten si). Quedan aqui unificados, con ALIAS
 * cubriendo exactamente las claves heredadas que ya pudieran estar escritas en el
 * carta.json y el cliente.mjs de un cliente existente, para que ninguno de los dos
 * ficheros tenga que cambiar ni un byte.
 *
 * Las claves canonicas son las 14, en ingles, con el nombre de la categoria legal:
 *   cereals_gluten  crustaceans  eggs  fish  peanuts  soybeans  milk  nuts
 *   celery  mustard  sesame  sulphites  lupin  molluscs
 *
 * De esas 14, ocho ya tenian icono dibujado en gen.mjs bajo una clave heredada (wheat,
 * nut, egg con nombre distinto al canonico; milk, fish, sesame, mustard, sulphites ya
 * coincidian letra por letra). Las seis que faltaban (crustaceans, soybeans, celery,
 * peanuts, lupin, molluscs) se dibujaron a mano despues, en la misma gramatica. Con esas
 * seis el catalogo quedo completo: 14/14 con icono -- historia de como se llego a la
 * primera version. El dibujo de las 14 se sustituyo despues por un set importado (ver
 * el comentario de ICONO): las CLAVES no se tocaron, solo el trazo de cada una.
 *
 * FUENTE UNICA DE LA GEOMETRIA (2026-09-04): el <svg> de cada clave YA NO vive escrito
 * a mano aqui. Vive, una sola vez, en motor/iconos/alergenos-oficiales/<clave>.svg -- este
 * modulo lo lee de disco al cargar. Antes habia dos copias identicas (el fichero fisico y
 * un literal de plantilla en este mismo bloque): cualquier retoque futuro del dibujo solo
 * tenia que acordarse de arreglar UNA de las dos para que la carta generada se saliera de
 * lo que el fichero fisico decia, sin que ningun error avisara. La lectura ocurre en Node,
 * durante `node gen.mjs` -- el HTML generado sigue llevando el <svg> como texto plano
 * incrustado, igual que antes: cero peticiones nuevas en produccion, cero cambio para
 * quien consume ICONO/ICONO_POR_CLAVE. */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* Relativo al propio fichero, nunca a process.cwd() ni a una ruta absoluta escrita a mano:
 * funciona igual da igual en que carpeta del disco (o de que ordenador de los dos que
 * sincronizan este repo por OneDrive) viva el proyecto. */
const AQUI = dirname(fileURLToPath(import.meta.url));
const DIR_OFICIALES = join(AQUI, 'iconos', 'alergenos-oficiales');

export const CANONICAS = [
  'cereals_gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk', 'nuts',
  'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
];

/* Claves heredadas -> canonica legal. Cubre las 8 claves inglesas de gen.mjs (las 5 que
 * ya coincidian no necesitan entrada) y las 11 claves espanolas de importar.mjs. No se
 * anaden mas: un cliente nuevo usa las canonicas directamente, sin alias. */

/* ---------------------------------------------------------------- pistas por el texto
 * Palabras que, si aparecen en el nombre o en la descripcion de un plato, hacen SOSPECHAR
 * que lleva ese alergeno. Es un diccionario, no un analisis: encuentra lo que el texto
 * NOMBRA, no lo que la receta lleva. Si la descripcion no menciona el anacardo de la base
 * del curry, esto no lo puede adivinar, y por eso el panel las usa para SUGERIR —resaltar la
 * casilla— y jamas para marcarla.
 *
 * Por que eso no es timidez: declarar un alergeno es una afirmacion legal (Reglamento UE
 * 1169/2011). Un falso negativo puede mandar a alguien al hospital y un falso positivo es
 * mentir sobre el plato. El sistema senala; el restaurante decide.
 *
 * Van en el motor y no en el cliente porque son datos de IDIOMA, no de restaurante: las
 * mismas palabras sirven a los tres clientes y a los que vengan.
 */
export const PISTAS = {
  cereals_gluten: {
    es: ['harina', 'trigo', 'pan', 'panes', 'naan', 'chapati', 'roti', 'paratha', 'puri', 'samosa',
      'pakora', 'rebozado', 'rebozada', 'empanado', 'empanada', 'cebada', 'centeno', 'espelta',
      'avena', 'cuscus', 'semola', 'pasta', 'galleta', 'masa', 'hojaldre', 'bulgur', 'seitan'],
    en: ['flour', 'wheat', 'bread', 'naan', 'chapati', 'roti', 'paratha', 'puri', 'samosa',
      'pakora', 'batter', 'battered', 'breaded', 'barley', 'rye', 'spelt', 'oats', 'couscous',
      'semolina', 'pasta', 'biscuit', 'dough', 'pastry', 'bulgur', 'seitan'],
    de: ['mehl', 'weizen', 'brot', 'gerste', 'roggen', 'dinkel', 'hafer', 'griess', 'nudeln',
      'teig', 'paniert', 'panierte', 'couscous', 'seitan'],
  },
  crustaceans: {
    es: ['gamba', 'gambas', 'langostino', 'camaron', 'cangrejo', 'langosta', 'cigala',
      'bogavante', 'necora', 'marisco'],
    en: ['prawn', 'prawns', 'shrimp', 'crab', 'lobster', 'langoustine', 'crayfish'],
    de: ['garnele', 'garnelen', 'krabbe', 'hummer', 'languste', 'krebs'],
  },
  eggs: {
    es: ['huevo', 'huevos', 'mayonesa', 'merengue', 'tortilla', 'alioli'],
    en: ['egg', 'eggs', 'mayonnaise', 'meringue', 'omelette', 'aioli'],
    de: ['ei', 'eier', 'mayonnaise', 'baiser', 'omelett'],
  },
  fish: {
    es: ['pescado', 'atun', 'salmon', 'bacalao', 'anchoa', 'boqueron', 'merluza', 'lubina',
      'dorada', 'sardina', 'anguila', 'tilapia', 'rape'],
    en: ['fish', 'tuna', 'salmon', 'cod', 'anchovy', 'anchovies', 'hake', 'bass', 'sardine',
      'eel', 'tilapia', 'monkfish'],
    de: ['fisch', 'thunfisch', 'lachs', 'kabeljau', 'sardelle', 'seehecht', 'sardine', 'aal'],
  },
  peanuts: {
    es: ['cacahuete', 'cacahuetes', 'cacahuate', 'mani'],
    en: ['peanut', 'peanuts', 'groundnut'],
    de: ['erdnuss', 'erdnuesse'],
  },
  soybeans: {
    es: ['soja', 'tofu', 'edamame', 'miso', 'tamari'],
    en: ['soy', 'soya', 'soybean', 'tofu', 'edamame', 'miso', 'tamari'],
    de: ['soja', 'tofu', 'edamame', 'miso'],
  },
  milk: {
    es: ['leche', 'nata', 'queso', 'mantequilla', 'yogur', 'yogurt', 'crema', 'ghee', 'paneer',
      'kefir', 'requeson', 'cuajada', 'mozzarella', 'parmesano', 'lassi', 'raita', 'kulfi',
      'malai', 'mantequilla'],
    en: ['milk', 'cream', 'cheese', 'butter', 'yogurt', 'yoghurt', 'ghee', 'paneer', 'kefir',
      'curd', 'mozzarella', 'parmesan', 'lassi', 'raita', 'kulfi', 'malai'],
    de: ['milch', 'sahne', 'kaese', 'butter', 'joghurt', 'ghee', 'paneer', 'quark', 'rahm'],
  },
  nuts: {
    es: ['almendra', 'almendras', 'avellana', 'nuez', 'nueces', 'anacardo', 'anacardos',
      'pistacho', 'macadamia', 'pecana', 'pinon', 'pinones'],
    en: ['almond', 'almonds', 'hazelnut', 'walnut', 'cashew', 'cashews', 'pistachio',
      'macadamia', 'pecan', 'pine'],
    de: ['mandel', 'mandeln', 'haselnuss', 'walnuss', 'cashew', 'pistazie', 'macadamia',
      'pekannuss', 'pinienkern'],
  },
  celery: { es: ['apio', 'apionabo'], en: ['celery', 'celeriac'], de: ['sellerie'] },
  mustard: { es: ['mostaza'], en: ['mustard'], de: ['senf'] },
  sesame: { es: ['sesamo', 'ajonjoli', 'tahini', 'tahina'], en: ['sesame', 'tahini'], de: ['sesam', 'tahini'] },
  sulphites: {
    es: ['sulfito', 'sulfitos', 'vino', 'vinagre', 'jerez', 'mosto', 'orejones'],
    en: ['sulphite', 'sulphites', 'sulfite', 'wine', 'vinegar', 'sherry'],
    de: ['sulfit', 'sulfite', 'wein', 'essig'],
  },
  lupin: { es: ['altramuz', 'altramuces', 'lupino'], en: ['lupin', 'lupine'], de: ['lupine'] },
  molluscs: {
    es: ['mejillon', 'mejillones', 'almeja', 'calamar', 'chipiron', 'pulpo', 'sepia', 'ostra',
      'vieira', 'berberecho', 'caracol'],
    en: ['mussel', 'mussels', 'clam', 'squid', 'calamari', 'octopus', 'cuttlefish', 'oyster',
      'scallop', 'cockle', 'snail'],
    de: ['muschel', 'muscheln', 'tintenfisch', 'krake', 'auster', 'jakobsmuschel', 'schnecke'],
  },
};

/* Las palabras de esas 14 en los idiomas que pida quien llame, sin repetir y sin acentos:
   el panel compara contra texto ya normalizado. */
export function pistasDe(idiomas) {
  const fuera = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const out = {};
  for (const clave of CANONICAS) {
    const vistas = new Set();
    for (const code of idiomas) for (const w of (PISTAS[clave] || {})[code] || []) vistas.add(fuera(w));
    out[clave] = [...vistas];
  }
  return out;
}

export const ALIAS = {
  wheat: 'cereals_gluten',
  nut: 'nuts',
  egg: 'eggs',
  trigo: 'cereals_gluten',
  leche: 'milk',
  huevo: 'eggs',
  soja: 'soybeans',
  mostaza: 'mustard',
  apio: 'celery',
  sulfitos: 'sulphites',
  sesamo: 'sesame',
  frutos_secos: 'nuts',
  pescado: 'fish',
  crustaceos: 'crustaceans',
};

/* Lee el SVG normalizado de una clave canonica. Aborta el build con un mensaje que nombra
 * la clave y la ruta exacta si el fichero falta -- igual de fuerte que el resto de guardas
 * del motor (esValida/build), nunca un icono en blanco en produccion. */
function leerIcono(dir, clave) {
  const ruta = join(dir, clave + '.svg');
  let contenido;
  try {
    contenido = readFileSync(ruta, 'utf8');
  } catch {
    throw new Error('falta el SVG de "' + clave + '" en ' + ruta);
  }
  return contenido.trim();
}

/* Los 14, importados el 2026-09-04 de un set nuevo de 32 iconos (14 alergenos + 18
 * indicadores adicionales -- ver motor/indicadores.mjs para estos ultimos). Sustituyen
 * al dibujo anterior a mano (Tabler + 6 propios, trazo/outline): estilo glyph solido,
 * fill="currentColor" en vez de stroke, sin relleno de la version vieja -- el color
 * sigue heredando de --ink/--accent-ink/--muted segun donde se pinte, igual que antes.
 * Fuente normalizada en motor/iconos/alergenos-oficiales/<clave>.svg (viewBox original
 * de cada uno conservado, sin xlink/scripts, un solo <svg> plano). La clave de archivo
 * de origen no siempre coincidia con la canonica -- ver la tabla de correspondencia:
 *   cereals_gluten <- gluten.svg          milk       <- dairy.svg
 *   crustaceans    <- crustacean_shellfish.svg        nuts       <- tree_nuts.svg
 *   eggs           <- egg.svg             sulphites  <- sulfate.svg (renombrado: el
 *   lupin          <- lupins.svg             archivo original decia "sulfato", que no
 *   molluscs       <- mollusk.svg            es el alergeno -- el dibujo es un matraz
 *   fish, peanuts, soybeans, celery, mustard, sesame: mismo nombre.  de laboratorio,
 *                                              igual que el sulphites anterior)
 * almonds.svg (una almendra concreta, no la categoria) NO sustituye a nuts -- queda
 * como indicador adicional. Ver el informe de importacion para el resto del criterio. */
export const ICONO = Object.fromEntries(CANONICAS.map((k) => [k, leerIcono(DIR_OFICIALES, k)]));

/* La carpeta fisica debe tener exactamente estas 14 -- ni una de menos (leerIcono ya
 * aborta arriba si falta) ni una de mas colada sin pasar por CANONICAS/ALIAS/ETIQUETA:
 * un SVG extra en alergenos-oficiales/ nunca debe convertirse en un alergeno legal por
 * accidente de que alguien lo dejo caer en la carpeta. */
{
  const enDisco = readdirSync(DIR_OFICIALES).filter((f) => f.endsWith('.svg'));
  const sobran = enDisco.filter((f) => !CANONICAS.includes(f.slice(0, -4)));
  if (sobran.length) {
    throw new Error('motor/iconos/alergenos-oficiales/ tiene ficheros fuera de las 14 '
      + 'claves canonicas: ' + sobran.join(', '));
  }
}

export const ETIQUETA = {
  cereals_gluten: 'Gluten', milk: 'Dairy', nuts: 'Nuts', fish: 'Fish',
  eggs: 'Egg', sesame: 'Sesame', mustard: 'Mustard', sulphites: 'Sulphites',
  crustaceans: 'Crustaceans', soybeans: 'Soybeans', celery: 'Celery',
  peanuts: 'Peanuts', lupin: 'Lupin', molluscs: 'Molluscs',
};

/* Las mismas catorce en espanol, con el nombre del anexo II del reglamento europeo y no una
 * traduccion libre: «frutos de cascara» y no «nueces», «altramuces» y no «lupino». Vive aqui
 * y no en el cliente porque las catorce son las mismas para todos: lo que cada restaurante
 * elige es cuales declara, no como se llaman.
 *
 * Hace falta porque el PANEL trabaja en el idioma de quien lleva el restaurante, no en el
 * idioma base de la carta: ofrecerle catorce casillas rotuladas en ingles a quien escribe la
 * carta en espanol es pedirle que traduzca para poder marcar una casilla. */
export const ETIQUETA_ES = {
  cereals_gluten: 'Gluten', milk: 'Lácteos', nuts: 'Frutos de cáscara', fish: 'Pescado',
  eggs: 'Huevos', sesame: 'Sésamo', mustard: 'Mostaza', sulphites: 'Sulfitos',
  crustaceans: 'Crustáceos', soybeans: 'Soja', celery: 'Apio',
  peanuts: 'Cacahuetes', lupin: 'Altramuces', molluscs: 'Moluscos',
};

/* Resuelve una clave heredada o canonica a su canonica. Clave desconocida -> undefined:
 * quien llama decide si eso es un error (importar.mjs, clave que no es ninguna de las 14
 * ni un alias suyo). */
export function resolver(clave) {
  if (CANONICAS.includes(clave)) return clave;
  return ALIAS[clave];
}

/* Todo lo que importar.mjs debe aceptar como etiqueta valida por plato: las 14
 * canonicas mas las claves heredadas de ALIAS. */
export function esValida(clave) {
  return resolver(clave) !== undefined;
}

/* Vistas planas de ICONO/ETIQUETA que responden tambien a las claves heredadas (wheat,
 * nut, egg, y las once en espanol), no solo a la canonica -- para que gen.mjs pueda
 * seguir indexando ALERGENO[k]/ALERGENO_LABEL[k] con el mismo k heredado que
 * CLIENTE.alergenos.leyenda ya pudiera traer, sin tener que resolver en cada sitio que
 * lo usa. Las 14 canonicas tienen icono, asi que la vista plana las cubre todas. */
function vistaPlana(mapaCanonico) {
  const plano = { ...mapaCanonico };
  for (const [heredada, canonica] of Object.entries(ALIAS)) {
    if (mapaCanonico[canonica] !== undefined) plano[heredada] = mapaCanonico[canonica];
  }
  return plano;
}

export const ICONO_POR_CLAVE = vistaPlana(ICONO);
export const ETIQUETA_POR_CLAVE = vistaPlana(ETIQUETA);
export const ETIQUETA_ES_POR_CLAVE = vistaPlana(ETIQUETA_ES);
