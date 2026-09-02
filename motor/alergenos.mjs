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
 * coincidian letra por letra). Las seis que faltan (crustaceans, soybeans, celery,
 * peanuts, lupin, molluscs) no tienen icono todavia -- tres de ellas (crustaceans,
 * soybeans, celery) ya eran una etiqueta valida por plato en espanol (crustaceos, soja,
 * apio), las otras tres (peanuts, lupin, molluscs) no tienen precedente de ningun tipo
 * en este proyecto. Dibujarlas es trabajo de diseno, no de este fichero. */

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
 * mirados a 84px y a 21px antes de aceptarlos -- ver gen.mjs si algun dia hace falta
 * repetir ese cuidado con los 6 que faltan. */
export const ICONO = {
  cereals_gluten: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.014 21.514v-3.75" /> <path d="M5.93 9.504l-.43 1.604c-.712 2.659 .866 5.391 3.524 6.105c.997 .268 1.993 .535 2.99 .801v-3.44c-.164 -2.105 -1.637 -3.879 -3.676 -4.426l-2.408 -.644" /> <path d="M13.744 11.164c.454 -.454 .815 -.994 1.061 -1.587c.246 -.594 .372 -1.23 .372 -1.873c0 -.643 -.126 -1.279 -.372 -1.872c-.246 -.594 -.606 -1.133 -1.061 -1.588l-1.73 -1.73l-1.73 1.73c-.454 .454 -.815 .994 -1.06 1.588c-.246 .594 -.372 1.23 -.373 1.872c0 .643 .127 1.279 .373 1.873c.246 .594 .606 1.133 1.06 1.587" /> <path d="M18.099 9.504l.43 1.604c.712 2.659 -.866 5.391 -3.525 6.105c-.997 .268 -1.994 .535 -2.99 .801v-3.44c.164 -2.105 1.637 -3.879 3.677 -4.426l2.408 -.644" /></svg>`,
  milk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h8v-2a1 1 0 0 0 -1 -1h-6a1 1 0 0 0 -1 1v2" /> <path d="M16 6l1.094 1.759a6 6 0 0 1 .906 3.17v8.071a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8.071a6 6 0 0 1 .906 -3.17l1.094 -1.759" /> <path d="M10 16a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /> <path d="M10 10h4" /></svg>`,
  nuts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4c-4 0 -7 3 -7 7c0 4 3 8 7 9c4 -1 7 -5 7 -9c0 -4 -3 -7 -7 -7z"/><path d="M12 4v16"/><path d="M9 8c1 1.5 1 3.5 0 5"/><path d="M15 8c-1 1.5 -1 3.5 0 5"/></svg>`,
  fish: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571" /> <path d="M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504" /> <path d="M18 11v.01" /> <path d="M11.5 10.5c-.667 1 -.667 2 0 3" /></svg>`,
  eggs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14.083c0 4.154 -2.966 6.74 -7 6.917c-4.2 0 -7 -2.763 -7 -6.917c0 -5.538 3.5 -11.09 7 -11.083c3.5 .007 7 5.545 7 11.083" /></svg>`,
  sesame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M8.5 4.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M8.5 14.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M3.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M13.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M18.5 4.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M13.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /> <path d="M18.5 14.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>`,
  mustard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3h4v3h-4z"/><path d="M9 6h6l1.5 3v10a2 2 0 0 1 -2 2h-5a2 2 0 0 1 -2 -2v-10z"/><path d="M9 12h6"/></svg>`,
  sulphites: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21l8 0" /> <path d="M12 15l0 6" /> <path d="M17 3l1 7c0 3.012 -2.686 5 -6 5s-6 -1.988 -6 -5l1 -7h10" /> <path d="M6 10a5 5 0 0 1 6 0a5 5 0 0 0 6 0" /></svg>`,
  /* crustaceans, soybeans, celery, peanuts, lupin, molluscs: sin icono todavia. */
};

export const ETIQUETA = {
  cereals_gluten: 'Gluten', milk: 'Dairy', nuts: 'Nuts', fish: 'Fish',
  eggs: 'Egg', sesame: 'Sesame', mustard: 'Mustard', sulphites: 'Sulphites',
  crustaceans: 'Crustaceans', soybeans: 'Soybeans', celery: 'Celery',
  peanuts: 'Peanuts', lupin: 'Lupin', molluscs: 'Molluscs',
};

/* Resuelve una clave heredada o canonica a su canonica. Clave desconocida -> undefined:
 * quien llama decide si eso es un error (importar.mjs) o simplemente "sin icono todavia"
 * (gen.mjs, para las 6 que aun no tienen dibujo). */
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
 * lo usa. Ausente si la canonica no tiene icono todavia (las 6 que faltan). */
function vistaPlana(mapaCanonico) {
  const plano = { ...mapaCanonico };
  for (const [heredada, canonica] of Object.entries(ALIAS)) {
    if (mapaCanonico[canonica] !== undefined) plano[heredada] = mapaCanonico[canonica];
  }
  return plano;
}

export const ICONO_POR_CLAVE = vistaPlana(ICONO);
export const ETIQUETA_POR_CLAVE = vistaPlana(ETIQUETA);
