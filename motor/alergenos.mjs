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
