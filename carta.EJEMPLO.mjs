/* PLANTILLA. Cópiala a carta.mjs y escribe dentro la carta del restaurante.
 *
 * Luego `node importar.mjs` la convierte en menu.md y en i18n.es.mjs, y te dice si la
 * estructura cuadra con cliente.mjs. Después `node gen.mjs` compila la carta.
 *
 * El texto base es INGLÉS: es lo que ve quien pone el idioma en English y lo que indexa
 * Google. El español es lo que publica el restaurante.
 *
 * Iconos disponibles, y no hay más:
 *   appetizers · soup · vegetarian · meat · salad · flame · leaf · lentils
 *   rice · bread · fries · special · kids · bowl · drop
 *
 * Dos cosas que se olvidan y rompen el build:
 *   - Un plato sin descripción lleva la cadena vacía, no null.
 *   - El precio va como texto y con punto decimal: '11.95', no 11,95.
 */
export const CARTA = [
  {
    /* [ nombre en inglés, nombre en español ] */
    pestana: ['Starters', 'Entrantes'],
    icono: 'appetizers',
    /* Opcional: una línea bajo el primer título de la pestaña. Quítala si no hace falta. */
    intro: ['To share, or to start.',
            'Para compartir, o para empezar.'],
    grupos: [
      {
        /* La categoría es lo que agrupa los platos. Con subtítulo, sale como encabezado
           dentro de la pestaña; con subtitulo:null, los platos van sueltos. */
        categoria: ['Starters - Cold', 'Entrantes fríos'],
        subtitulo: ['Cold', 'Fríos'],
        icono: 'salad',
        /* [ nombre en, nombre es, descripción en, descripción es, precio ] */
        platos: [
          ['House Salad', 'Ensalada de la casa',
           'Mixed leaves, tomato and a house vinaigrette.',
           'Hojas variadas, tomate y vinagreta de la casa.', '7.50'],
          ['Olives', 'Aceitunas', '', '', '3.00'],
        ],
      },
      {
        categoria: ['Starters - Hot', 'Entrantes calientes'],
        subtitulo: ['Hot', 'Calientes'],
        icono: 'flame',
        platos: [
          ['Croquettes', 'Croquetas',
           'Six of them, made in-house.',
           'Seis unidades, caseras.', '8.50'],
        ],
      },
    ],
  },
  {
    pestana: ['Mains', 'Principales'],
    icono: 'meat',
    grupos: [
      {
        categoria: ['Mains', 'Principales'],
        subtitulo: null,
        platos: [
          ['Grilled Chicken', 'Pollo a la parrilla',
           'With fries and salad.',
           'Con papas fritas y ensalada.', '14.00'],
        ],
      },
    ],
  },
];
