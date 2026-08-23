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
};

/* Se usa en todas partes como CLAVE('tema'), CLAVE('lang')... Una sola función y ni un literal
   'totm-' suelto en el código: el día que se añada una clave nueva, sale prefijada sin que nadie
   tenga que acordarse. */
export const CLAVE = (nombre) => CLIENTE.slug + '-' + nombre;
