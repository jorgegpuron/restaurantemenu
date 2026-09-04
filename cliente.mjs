import * as ES from './i18n.es.mjs';
import * as DE from './i18n.de.mjs';

/* Lo que distingue a ESTE restaurante de cualquier otro que use el mismo motor.
 *
 * Desde la fase 5 este archivo es el CONTRATO entero de configuración: identidad, mercado
 * (moneda, zona horaria, cocina), idiomas con su bandera, la selección de la leyenda de
 * alérgenos y las capacidades. Ningún campo tiene valor por defecto en el motor: lo que
 * falte y sea obligatorio revienta el build con su mensaje. La ESTRUCTURA de la carta
 * (pestañas, categorías, metadatos de comportamiento) no vive aquí: vive en carta.json,
 * que es su fuente única.
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

  /* El único color de marca que declara un cliente. OPCIONAL: sin él, el build usa el
   * naranja de fábrica ('#FF7517', el mismo valor de aquí abajo). Si se declara, tiene
   * que superar el contraste contra las constantes fijas del motor (ver verificarPaleta()
   * en motor/temas.mjs) -- Secundario, Oscuro y Neutro NO se declaran aquí: son
   * constantes del motor, iguales para cualquier cliente.
   *
   * De aquí se deriva --accent/--accent-ink/--metal -- nunca se elige un token suelto a
   * mano. Editable después, en caliente, desde Admin -> Marca (estado.json), sin
   * recompilar: este valor es el de partida/restaurar, no el único que puede estar activo.
   *
   * Tinge estrena aquí la paleta por defecto del motor (Fase 8): no es una réplica del tema
   * "onice" que llevaba antes, es la nueva identidad de fábrica puesta a prueba primero en
   * el cliente de referencia. */
  marca: { colorPrincipal: '#FF7517' },

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

  /* La cocina que publica el JSON-LD de Google (servesCuisine). OPCIONAL: si no se declara,
     la propiedad no se emite — no se inventa una cocina, y desde luego no se hereda la de
     otro restaurante. */
  cocina: 'Indian',

  /* La moneda de los precios. OBLIGATORIA, sin valor por defecto: el símbolo va delante de
     cada precio y el ISO en el JSON-LD. Un restaurante fuera de la zona euro cambia esto y
     nada más. */
  moneda: { simbolo: '€', iso: 'EUR' },

  /* La zona horaria del restaurante (identificador IANA). OBLIGATORIA. Manda sobre la fecha
     de servicio de la carta, el día del premio del juego y el reloj del panel: un
     restaurante peninsular pone 'Europe/Madrid' y los tres relojes se mueven juntos. */
  zonaHoraria: 'Atlantic/Canary',

  /* La política del día de servicio. corteHora (0-23, OBLIGATORIA): hora a la que caducan
     los agotados del día anterior y cambia el día del premio. Es política del restaurante,
     no del motor: una cafetería que abre a las 05:00 necesita un corte más temprano; un
     corte a medianoche es corteHora: 0. */
  servicio: { corteHora: 6 },

  /* Los idiomas de ESTA carta. OBLIGATORIO, y cada idioma declara su bandera (fichero de
     motor/assets/banderas/, sin extensión): el motor ya no adivina banderas y un idioma sin
     ella no compila — jamás un 'undefined' en el selector.
     - base: el idioma del TEXTO del documento. El catálogo nativo del motor está en inglés;
       con base 'en' no hace falta diccionario. Un base distinto exige su i18n.<code>.mjs
       con la sección ui completa, y el build lo hornea como texto del documento.
     - extras: los demás, en el orden del selector. Cada uno trae su diccionario; el inglés
       puede ir como extra SIN diccionario (el catálogo nativo lo cubre). */
  idiomas: {
    base: { code: 'en', label: 'EN', name: 'English', bandera: 'gb' },
    extras: [
      { code: 'es', label: 'ES', dicts: ES, name: 'Español', bandera: 'es' },
      { code: 'de', label: 'DE', dicts: DE, name: 'Deutsch', bandera: 'de' },
    ],
  },

  /* La leyenda genérica de alérgenos del pie (solo aparece mientras ningún plato declara
     los suyos). SELECCIÓN del restaurante, OBLIGATORIA — [] es legal y quita la fila de
     iconos dejando el aviso de texto. Las claves son las del catálogo de iconos del motor:
     wheat, milk, nut, fish, egg, sesame, mustard, sulphites. Esta selección es de Tinge
     —lo que de verdad se pregunta en una cocina del sur de la India— y por eso vive aquí
     y no en el motor: otro restaurante elige la suya. */
  alergenos: {
    leyenda: ['wheat', 'milk', 'nut', 'fish', 'egg', 'sesame', 'mustard', 'sulphites'],
    /* Tinge no declara alergenos plato a plato en carta.json: 'no' es la verdad de este
       cliente, no un placeholder. Cambiar a 'si' exige antes cargar el dato real. */
    enOrigen: 'no',
  },

  /* Capacidades. OBLIGATORIAS y explícitas, sin defaults del motor:
     - datos: el contador anónimo de aperturas. Apagado significa apagado: la carta sale sin
       una sola línea de medición y el endpoint no apunta.
     - juego: Chilli Rush. Con false no se emite juego.html (sale una lápida que sustituye a
       cualquier copia vieja desplegada), no hay tarjeta en la carta, el arte del juego no
       viaja y el endpoint del marcador rechaza toda actividad.
     - publicidad (Fase 7): el hueco publicitario de la carta. true conserva exactamente el
       comportamiento de siempre — es lo único que existía antes de que este interruptor
       existiera. */
  funciones: { datos: true, juego: true, publicidad: true },
};

/* Se usa en todas partes como CLAVE('tema'), CLAVE('lang')... Una sola función y ni un literal
   'totm-' suelto en el código: el día que se añada una clave nueva, sale prefijada sin que nadie
   tenga que acordarse. */
export const CLAVE = (nombre) => CLIENTE.slug + '-' + nombre;

/* ------------------------------------------------------------------ *
 * Palabras que quieren decir lo mismo, para el buscador.
 *
 * Media carta esta en indio transcrito, y el comensal de aqui busca por el ingrediente que
 * conoce: escribe «chili» donde la carta dice «guindilla», «nata» donde dice «malai», «carne
 * picada» donde dice «kheema». No es una errata —eso ya lo perdona el buscador— son dos
 * nombres para la misma cosa, y un buscador que devuelve cero cuando el plato existe es lo
 * peor que puede hacer.
 *
 * Cada linea es un grupo: escribir cualquiera de sus palabras busca todas. Va en los dos
 * sentidos y no hace falta repetir el par al reves.
 *
 * NO se inventan: cada grupo salio de medir la carta. A la izquierda, palabras que devolvian
 * cero o casi; a la derecha, lo que si esta escrito en los platos. Antes de anadir una linea,
 * buscar las dos palabras en la carta y comprobar que hace falta — un sinonimo hacia una
 * palabra que no existe no arregla nada y ensucia el buscador para siempre.
 *
 * Se compara la consulta ENTERA contra el grupo, no por trozos: «carne picada» funciona,
 * «carne» a secas no, y esta bien que no: a secas no quiere decir kheema.
 * ------------------------------------------------------------------ */
export const SINONIMOS = [
  ['chili', 'chilli', 'guindilla', 'picante'],   // chili daba 0, picante 1; guindilla da 8
  ['okra', 'quimbombo', 'bhindi'],               // los dos primeros daban 0; bhindi da 4
  ['carne picada', 'kheema', 'keema'],           // «carne picada» daba 0; kheema da 6
  ['nata', 'crema', 'malai'],                    // nata y crema daban 0; malai da 8
  ['brasa', 'plancha'],                          // brasa daba 0; plancha da 22
  ['espinacas', 'saag', 'palak'],                // sueltos daban 4, 3 y 6: juntos son uno
  ['garbanzos', 'chana'],                        // 3 y 2
  ['coliflor', 'gobhi'],                         // 3 y 2
  ['queso', 'paneer'],                           // 10 y 14
];
