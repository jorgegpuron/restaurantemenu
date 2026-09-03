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
 * peanuts, lupin, molluscs) se dibujaron a mano despues, en la misma gramatica -- ver
 * el comentario de ICONO para el porque de cada silueta. Con esas seis el catalogo
 * queda completo: 14/14 con icono. */

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

/* Los 8 SVG que ya existian en gen.mjs, con su clave puesta a la canonica que les toca.
 * El dibujo no cambia; solo la clave bajo la que vive. Seis salen de Tabler (MIT); dos
 * (cereals_gluten, mustard) no existian en ningun set decente y estan dibujados a mano,
 * en la misma gramatica: rejilla de 24, trazo 1.75, extremos redondeados, sin relleno,
 * mirados a 84px y a 21px antes de aceptarlos -- el mismo cuidado que despues se repitio
 * con los 6 dibujados a mano mas abajo. */
export const ICONO = {
  cereals_gluten: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.014 21.514v-3.75" /> <path d="M5.93 9.504l-.43 1.604c-.712 2.659 .866 5.391 3.524 6.105c.997 .268 1.993 .535 2.99 .801v-3.44c-.164 -2.105 -1.637 -3.879 -3.676 -4.426l-2.408 -.644" /> <path d="M13.744 11.164c.454 -.454 .815 -.994 1.061 -1.587c.246 -.594 .372 -1.23 .372 -1.873c0 -.643 -.126 -1.279 -.372 -1.872c-.246 -.594 -.606 -1.133 -1.061 -1.588l-1.73 -1.73l-1.73 1.73c-.454 .454 -.815 .994 -1.06 1.588c-.246 .594 -.372 1.23 -.373 1.872c0 .643 .127 1.279 .373 1.873c.246 .594 .606 1.133 1.06 1.587" /> <path d="M18.099 9.504l.43 1.604c.712 2.659 -.866 5.391 -3.525 6.105c-.997 .268 -1.994 .535 -2.99 .801v-3.44c.164 -2.105 1.637 -3.879 3.677 -4.426l2.408 -.644" /></svg>`,
  milk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h8v-2a1 1 0 0 0 -1 -1h-6a1 1 0 0 0 -1 1v2" /> <path d="M16 6l1.094 1.759a6 6 0 0 1 .906 3.17v8.071a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8.071a6 6 0 0 1 .906 -3.17l1.094 -1.759" /> <path d="M10 16a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /> <path d="M10 10h4" /></svg>`,
  nuts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4c-4 0 -7 3 -7 7c0 4 3 8 7 9c4 -1 7 -5 7 -9c0 -4 -3 -7 -7 -7z"/><path d="M12 4v16"/><path d="M9 8c1 1.5 1 3.5 0 5"/><path d="M15 8c-1 1.5 -1 3.5 0 5"/></svg>`,
  fish: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571" /> <path d="M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504" /> <path d="M18 11v.01" /> <path d="M11.5 10.5c-.667 1 -.667 2 0 3" /></svg>`,
  eggs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14.083c0 4.154 -2.966 6.74 -7 6.917c-4.2 0 -7 -2.763 -7 -6.917c0 -5.538 3.5 -11.09 7 -11.083c3.5 .007 7 5.545 7 11.083" /></svg>`,
  sesame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M8.5 4.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M8.5 14.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M3.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M13.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M18.5 4.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M13.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M18.5 14.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>`,
  mustard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3h4v3h-4z"/><path d="M9 6h6l1.5 3v10a2 2 0 0 1 -2 2h-5a2 2 0 0 1 -2 -2v-10z"/><path d="M9 12h6"/></svg>`,
  sulphites: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21l8 0" /> <path d="M12 15l0 6" /> <path d="M17 3l1 7c0 3.012 -2.686 5 -6 5s-6 -1.988 -6 -5l1 -7h10" /> <path d="M6 10a5 5 0 0 1 6 0a5 5 0 0 0 6 0" /></svg>`,
  /* Los dos que faltaban y ya hacen falta: el primer cliente que declara alergenos plato a
   * plato marca langostinos y calamares. Dibujados a mano en la misma gramatica que los ocho
   * de arriba -- rejilla de 24, trazo 1.75, sin relleno, extremos redondeados -- y mirados a
   * 84px y a 21px antes de aceptarlos, que es como se revisaron cereals_gluten y mustard.
   *
   * El crustaceo es la gamba de perfil: lomo curvo, vientre, cola en abanico a la izquierda,
   * dos antenas y dos patas. El molusco es la concha de vieira: cupula con la charnela abajo
   * y tres estrias que salen de ella; es el dibujo que usan las cartas y el que se reconoce
   * sin leer nada al lado. */
  /* La gamba. Dibujada mirando el tamano REAL, no el ampliado: en la carta se ve a 14px, y a
   * 14px un icono con muchas patas y varias antenas es una mancha. Cinco elementos y ni uno
   * mas -- cuerpo curvo, ojo, una antena y la cola en horquilla abierta -- porque a ese tamano
   * lo unico que separa una gamba de una hoja es la horquilla de la cola: es lo primero que se
   * reconoce y por eso se lleva casi un tercio de la caja.
   *
   * Se descartaron por ilegibles a 14px: la voluta cerrada (se lee como hoja), el cuerpo con
   * segmentos (oruga) y las versiones con dos antenas y patas (mancha). A 14px este no se
   * confunde con pescado —que es una lente horizontal con aleta— ni con molusco, que es una
   * cupula. Trazo 1.75 como los demas: a ese tamano 2 no aporta nada y rompia la familia. */
  crustaceans: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.4 12.6c2.2 -5 6.8 -7.4 11.4 -6.2c1.2 5.2 -2.4 9.6 -8 9.8c-2.6 .1 -3.8 1.7 -3.4 4.2z" /> <path d="M17.6 9.2v.01" /> <path d="M21.6 5.8l1.4 -1.2" /> <path d="M9.4 12.6l-8 -3.4" /> <path d="M9.4 12.6l-7 5.4" /></svg>`,
  molluscs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.6 16.4c0 -5.4 3.8 -9.4 8.4 -9.4s8.4 4 8.4 9.4z" /> <path d="M12 7v9.4" /> <path d="M7.5 8.9l1.7 7.5" /> <path d="M16.5 8.9l-1.7 7.5" /></svg>`,
  /* Los cuatro ultimos, los que cierran 14/14: peanuts, soybeans, celery, lupin. Mismo
   * metodo que crustaceans/molluscs -- rejilla de 24, trazo 1.75, sin relleno, mirados a
   * 14px real (rasterizados de verdad, no el trazo vectorial ampliado, que a ese tamano
   * miente) y despues a 21px y 88px de inspeccion. Ninguno copia un set externo.
   *
   * Los primeros intentos de los tres ultimos fallaron por la misma razon que las primeras
   * gambas: soybeans era una vaina curva fina con dos puntos diminutos dentro, celery eran
   * tres lineas verticales paralelas para las estrias del tallo, lupin era una espiga de
   * tres pisos de florecillas -- las tres, a 14px real, se funden en una mancha o un bloque
   * solido en cuanto el trazo de 1.75 tiene que convivir con lineas fluidas o repetidas muy
   * juntas. La correccion fue la misma en los tres: una silueta unica, gruesa y cerrada, sin
   * lineas finas sueltas.
   *
   * peanuts es un contorno continuo en forma de ocho -- dos lobulos con cintura, mas una
   * linea corta marcando la cintura -- y no se confunde con nuts (una almendra sola, sin
   * cintura). soybeans es una vaina abultada asimetrica, un contorno cerrado con dos bultos
   * arriba, distinta de molluscs (cupula lisa y simetrica) y de eggs (ovalo liso sin bultos).
   * celery es un tallo solido -- un contorno cerrado, no lineas sueltas -- rematado por un
   * pico central que hace de hoja, distinto de mustard (tarro con tapa ancha y plana) y de
   * sulphites (frasco con base y pie). lupin son dos ovalos separados por un hueco claro,
   * distinto de peanuts (un contorno sin cortes) y de sesame (ocho puntos diminutos
   * dispersos, no dos bultos grandes juntos). */
  peanuts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.75c-2.9 0 -4.9 2.1 -4.75 4.75c.08 1.4 .75 2.5 1.75 3.25c-1 .75 -1.67 1.85 -1.75 3.25c-.15 2.65 1.85 4.75 4.75 4.75s4.9 -2.1 4.75 -4.75c-.08 -1.4 -.75 -2.5 -1.75 -3.25c1 -.75 1.67 -1.85 1.75 -3.25c.15 -2.65 -1.85 -4.75 -4.75 -4.75z" /> <path d="M9.5 12c.9 .55 2.1 .55 3 0" /></svg>`,
  soybeans: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 14.5Q6.5 5 11 8Q14 4 18 7Q20.5 9 20.5 11Q12.5 17.5 3.5 14.5Z" /></svg>`,
  celery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21L9 10Q9 8 11 8L12 4.5L13 8Q15 8 15 10L15 21Z" /></svg>`,
  lupin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12Q7 8.5 10 12Q7 15.5 4 12Z" /> <path d="M14 12Q17 8.5 20 12Q17 15.5 14 12Z" /></svg>`,
};

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
