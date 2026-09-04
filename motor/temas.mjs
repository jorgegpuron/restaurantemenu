/* ------------------------------------------------------------------ *
 * Color de marca
 * ------------------------------------------------------------------ *
 *
 * Un solo color es de cliente: `colorPrincipal`, declarado en `cliente.mjs`
 * (`marca.colorPrincipal`) y editable despues, en runtime, desde Admin -> Marca. Los
 * otros tres son constantes del MOTOR, iguales para cualquier cliente que exista o que
 * se dé de alta mañana -- SECUNDARIO, OSCURO y NEUTRO, mas abajo. No viven en
 * cliente.mjs, no se piden en `/nuevo-cliente`, no se editan en el panel.
 *
 * Ajuste sobre la version anterior de este fichero, que sí tenia tres colores de
 * cliente (colorPrincipal/colorSecundario/colorOscuro): con tres colores editables la
 * combinatoria de "que paleta pasa el contraste" crecia con cada alta, y en la practica
 * solo colorPrincipal es lo que un restaurante reconoce como "mi color" -- el resto es
 * ya el lenguaje visual del producto. Reducirlo a uno solo simplifica el contrato (una
 * alta ya no puede fallar el contraste salvo por su unico color variable) y hace
 * trivial el override en caliente: cambiar un color en `estado.json` sin recompilar es
 * mucho mas seguro que cambiar tres a la vez sin que el motor los verifique en el
 * momento.
 *
 * REGLA DE ORO (se mantiene intacta): colorPrincipal se conserva SIEMPRE literal en
 * --accent. Oscurecerlo para que sirva de texto sobre la superficie clara resuelve el
 * contraste y mata la identidad -- el naranja de marca dejaria de aparecer en pantalla,
 * sustituido por un naranja quemado en todas partes. La resolucion de contraste NUNCA
 * toca el valor visible del acento; cambia, por este orden, A QUIEN se le pide que sea
 * el texto:
 *
 *   1. colorPrincipal se queda exactamente como se declaro (o como se guardo desde el
 *      panel -- el mismo valor, sin tocar, en los dos casos).
 *   2. el texto/icono que va ENCIMA de un fondo --accent se elige, no se fabrica:
 *      OSCURO si lee sobre el acento, si no NEUTRO (--accent-ink).
 *   3. donde ese texto encima del acento no vale (fondos claros con el acento como
 *      color de TEXTO en vez de FONDO, ej. un rotulo naranja de 13px), el uso del color
 *      cambia de tipo: el naranja pasa a icono/indicador/borde/fondo de una pastilla, y
 *      el texto de verdad se queda en OSCURO. Nunca naranja como texto pequeño sobre
 *      superficie clara si no pasa 4.5:1 -- ahi 100% de las veces pierde.
 *   4. solo si ni OSCURO ni NEUTRO leen sobre un fondo dado, --accent-ink devuelve null
 *      y el color se rechaza (build: aborta: panel: mensaje claro, no se guarda) -- la
 *      unica situacion en la que tocaria fabricar una variante ad-hoc, y seria para ESE
 *      fondo concreto, nunca para sustituir el acento visible.
 *
 * Regla explicita (un colorPrincipal CLARO -- amarillo, beige, naranja pastel -- no se
 * rechaza por ser claro): inkSobre() prueba OSCURO primero SIEMPRE, sea cual sea
 * colorPrincipal. Si colorPrincipal es oscuro, OSCURO no lee sobre si mismo y la funcion
 * cae sola a NEUTRO -- "acento oscuro, texto claro". Si colorPrincipal es claro, OSCURO
 * si lee, y se queda -- "acento claro, texto oscuro". Nunca hay que mirar si el acento
 * es claro u oscuro a mano: el bucle ya lo resuelve, y el unico rechazo real es el del
 * punto 4 -- ni OSCURO ni NEUTRO leen ahi, contra los dos a la vez. Hubo una guardia
 * extra en una version anterior de este fichero (--accent contra --surface, para que el
 * acento no fuera invisible como icono/borde) que en la practica rechazaba colores
 * claros perfectamente legibles como texto/fondo (un amarillo o un beige normal ya
 * quedaban por debajo de su umbral) -- retirada: el unico criterio de rechazo es este
 * punto 4, sobre los usos donde el acento hace de FONDO con texto encima.
 *
 * Los cuatro colores, de que sirve cada uno:
 *
 *   colorPrincipal (cliente, editable)   el acento vivo: iconos de categoria,
 *                      precios/ofertas destacadas, indicadores, bordes y foco, badges,
 *                      elementos graficos de marca. --accent es el color TAL CUAL.
 *                      --accent-ink es el texto/icono que va encima cuando --accent
 *                      hace de FONDO (nunca blanco por defecto: primero se prueba
 *                      OSCURO). Aparte, --metal es la variante -- con su propio bucle de
 *                      aclarado, sin tocar a --accent -- pensada para leerse sobre un
 *                      fondo YA oscuro (el pie de pagina, la placa del juego): con el
 *                      naranja de fabrica ya coincide con --accent porque se lee tal
 *                      cual sobre negro.
 *   SECUNDARIO (motor, fijo, '#2C2626')   el color de accion solida: botones/CTA,
 *                      pestaña o chip activo, controles solidos. --solid es el valor TAL
 *                      CUAL; --solid-ink es su texto (primero NEUTRO, si no OSCURO).
 *                      Ademas pinta --base, el fondo del tablero del juego -- un uso
 *                      propio y distinto, aclarado contra NEUTRO para que el texto
 *                      (OSCURO) se lea encima. Los dos son SIEMPRE el mismo calculo,
 *                      para cualquier cliente: no hay nada que verificar aqui por alta.
 *   OSCURO (motor, fijo, '#121212')   el mas oscuro. Es el fondo de la pagina, todo el
 *                      texto de cuerpo, y el texto que va encima del acento cuando este
 *                      es fondo.
 *   NEUTRO (motor, fijo, '#F6F4F4')   la superficie (la tarjeta, el papel). Es lo que
 *                      garantiza que el contraste de titulares (7:1) se cumple siempre,
 *                      pase lo que pase con colorPrincipal.
 *
 * Con SECUNDARIO/OSCURO/NEUTRO fijos, la unica combinacion que puede fallar contraste es
 * colorPrincipal contra ellos -- `verificarPaleta()` solo tiene ya una cosa que
 * verificar, y el build (o el panel, al guardar un color nuevo) revienta con el mensaje
 * exacto si no llega. Es la razon por la que no hace falta pedir tres colores en
 * `/nuevo-cliente` para poder garantizar nada: con uno solo variable, la superficie de
 * fallo es minima y facil de explicar.
 *
 * Un color NO se deriva del cliente a proposito: los del juego (fuego, agua, hielo), que
 * son semanticos. El rojo de oferta si se ajusta, pero solo en luminosidad y solo lo
 * justo para que se lea sobre NEUTRO -- que es fijo, asi que --offer es el mismo valor
 * exacto para cualquier cliente, siempre. Sigue siendo rojo siempre.
 */

/* ---- color, lo minimo ---- */

const aRGB = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const dos = (n) => (n < 16 ? '0' : '') + n.toString(16);
const aHex = (rgb) => '#' + rgb.map((c) => dos(Math.round(Math.min(255, Math.max(0, c))))).join('');

/** `a` al `t` por ciento sobre `b`. */
const mezcla = (a, b, t) => aHex(aRGB(a).map((c, i) => c * t + aRGB(b)[i] * (1 - t)));

/** El mismo color multiplicado: oscurecer sin virar de tono. */
const oscurecer = (hex, f) => aHex(aRGB(hex).map((c) => c * f));

const canal = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luz = (hex) => {
  const [r, g, b] = aRGB(hex).map(canal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contraste = (a, b) => {
  const x = luz(a), y = luz(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const rgbaDe = (hex, alfa) => 'rgba(' + aRGB(hex).join(',') + ',' + alfa + ')';

/** Un `#RRGGBB` de 6 cifras hex, con o sin `#` por delante. Cualquier otra cosa, null --
 *  nunca se adivina ni se completa. */
export function normalizarHex(valor) {
  const s = String(valor || '').trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  return m ? '#' + m[1].toUpperCase() : null;
}

/* ---- las tres constantes fijas del motor ----
 * Iguales para todo cliente, siempre. No se piden, no se declaran, no se editan --
 * ver el porque en el bloque de arriba. */
export const SECUNDARIO = '#2C2626';
export const OSCURO = '#121212';
export const NEUTRO = '#F6F4F4';

/** El color de un cliente que no aporta el suyo -- naranja de fabrica. No es un tema,
 *  es un valor de partida: `/nuevo-cliente` lo escribe tal cual en cliente.mjs si no se
 *  da `--color-principal`, y `derivar()`/`gen.mjs` caen aqui si cliente.mjs no declara
 *  `marca.colorPrincipal` en absoluto. */
export const PRINCIPAL_DEFECTO = '#FF7517';

/* ---- la derivacion ---- */

/* El texto/icono que va ENCIMA de un fondo dado, eligiendo entre los DOS colores fijos
   del sistema -- nunca fabricando uno nuevo. `preferido` se prueba primero porque asi lo
   pide el proyecto (OSCURO antes que NEUTRO, siempre): un naranja vivo con texto
   grafito encima lee mejor que el mismo naranja apagado para poder llevar texto blanco.
   Si NINGUNO de los dos lee sobre `fondo`, null -- ver verificarPaleta(). */
const inkSobre = (fondo, preferido, alternativo) => {
  if (contraste(preferido, fondo) >= 4.5) return preferido;
  if (contraste(alternativo, fondo) >= 4.5) return alternativo;
  return null;
};

/* SECUNDARIO, el fondo del juego. Se aclara contra NEUTRO lo justo para que el texto
   --que siempre va en OSCURO-- se lea encima. Constante siempre: SECUNDARIO/OSCURO/
   NEUTRO son fijos, asi que --base es el mismo valor para cualquier cliente. Uso propio
   y distinto de --solid (mas abajo): el tablero ocupa la pantalla entera, y el
   secundario solido de un boton pintado ahi encima seria demasiado peso. */
const fondoLegible = () => {
  for (let t = 100; t >= 0; t -= 2) {
    const c = mezcla(SECUNDARIO, NEUTRO, t / 100);
    if (contraste(OSCURO, c) >= 4.5) return c;
  }
  return null;
};

/* colorPrincipal, sobre los fondos oscuros (el pie de pagina, la placa del juego). Se
   aclara contra NEUTRO lo justo para llegar al umbral: si colorPrincipal ya es claro
   (caso tipico, un acento vivo), no se toca y se usa tal cual -- el mismo naranja de
   --accent, sin aclarar, ya se lee sobre negro. Bucle propio, no --accent: este SI puede
   apartarse del valor literal si un cliente trae un principal oscuro, porque aqui el
   fondo detras tambien es oscuro y no hay eleccion fija que lo resuelva. */
const metalLegible = (principal) => {
  for (let t = 100; t >= 40; t -= 1) {
    const c = mezcla(principal, NEUTRO, t / 100);
    if (contraste(c, OSCURO) >= 4.5) return c;
  }
  return null;
};

/* El rojo de la oferta es el mismo para cualquier cliente -- NEUTRO es fijo, asi que
   este valor tambien lo es. Sigue siendo rojo: se multiplica, no se vira. Constante
   siempre, igual que --base: no depende de colorPrincipal. */
const ROJO_BASE = '#C62828';
const rojoLegible = () => {
  for (let f = 100; f > 30; f--) {
    const c = oscurecer(ROJO_BASE, f / 100);
    if (contraste(c, NEUTRO) >= 4.5) return c;
  }
  return null;
};

/** Deriva los 19 tokens CSS a partir del unico color de cliente. `null` en --accent-ink,
 *  --metal o --metal-ink significa "ni OSCURO ni NEUTRO -- o ninguna variante aclarada --
 *  leen sobre este colorPrincipal": ver verificarPaleta(). --badge-ink nunca es null por
 *  si solo (hereda de --accent-ink, salvo la excepcion de fabrica) -- si --accent-ink lo
 *  es, --badge-ink tambien, y el color ya se rechazo antes de llegar aqui. --solid/
 *  --solid-ink/--base/--offer NUNCA son null: no dependen de colorPrincipal, son el mismo
 *  calculo fijo siempre.
 *
 *  --metal-ink y no --accent-ink sobre --metal: metal es una variante ACLARADA de accent
 *  (metalLegible mezcla hacia NEUTRO hasta leerse sobre --ink), asi que con un
 *  colorPrincipal oscuro puede acabar bastante mas claro que accent -- el ink calculado
 *  para accent (que en ese caso es NEUTRO, pensado para el accent oscuro original) ya no
 *  lee encima del metal aclarado. Cada fondo lleva su propio ink calculado sobre su propio
 *  valor, nunca uno prestado de otro fondo -- mismo criterio que --solid-ink sobre --solid.
 *
 *  --badge-ink: la tinta de los badges/etiquetas de producto (item-tag, dsheet-flag,
 *  aviso-badge, el boton Buscar, los badges del admin) que van rellenos con --accent.
 *  Excepcion visual consciente, pedida expresamente: con el naranja de fabrica exacto
 *  (PRINCIPAL_DEFECTO), NEUTRO fijo -- 2.45:1, por debajo de 4.5, aceptado a proposito
 *  (NEUTRO y no blanco puro: es la misma superficie clara que usa el resto del sistema,
 *  nunca un #fff aparte -- blanco puro daria 2.69:1, tampoco pasa, pero no es el color
 *  que de verdad se pinta). Con cualquier otro colorPrincipal, sin excepcion:
 *  --badge-ink es --accent-ink, calculado y validado por contraste como el resto. */
export function derivar(colorPrincipal) {
  const accent = colorPrincipal;
  const accentInk = inkSobre(accent, OSCURO, NEUTRO);
  const metal = metalLegible(colorPrincipal);
  const metalInk = metal === null ? null : inkSobre(metal, OSCURO, NEUTRO);
  const badgeInk = accent.toUpperCase() === PRINCIPAL_DEFECTO.toUpperCase() ? NEUTRO : accentInk;
  return {
    '--accent': accent,
    '--accent-ink': accentInk,
    '--metal': metal,
    '--metal-ink': metalInk,
    '--badge-ink': badgeInk,
    '--solid': SECUNDARIO,
    '--solid-ink': inkSobre(SECUNDARIO, NEUTRO, OSCURO),
    '--ink': OSCURO,
    '--muted': mezcla(OSCURO, NEUTRO, 0.72),
    '--surface': NEUTRO,
    '--base': fondoLegible(),
    '--border': mezcla(OSCURO, NEUTRO, 0.22),
    '--chip': mezcla(OSCURO, NEUTRO, 0.08),
    '--surface-0': rgbaDe(NEUTRO, 0),
    '--scrim': rgbaDe(OSCURO, '.55'),
    '--hairline': mezcla(OSCURO, NEUTRO, 0.12),
    '--offer': rojoLegible(),
    '--lift-card': '0 2px 6px ' + rgbaDe(OSCURO, '.10') + ',0 40px 70px -36px ' + rgbaDe(OSCURO, '.45'),
    '--lift-fab': '0 1px 2px ' + rgbaDe(OSCURO, '.12') + ',0 12px 28px -10px ' + rgbaDe(OSCURO, '.32'),
    '--lift-sheet': '0 -8px 40px -12px ' + rgbaDe(OSCURO, '.28'),
  };
}

/* ---- la guardia ----
 *
 * Las parejas que de verdad ocurren en pantalla. Texto normal 4.5:1, titulares 7:1,
 * filetes lo justo para verse. Si una falla -- o si colorPrincipal no daba para una
 * variante legible y derivar() devolvio null -- no se guarda ni se compila: mas vale no
 * entregar que entregar una carta que no se lee. */
const PAREJAS = [
  { a: '--ink', b: '--surface', min: 7, que: 'titulares y precios sobre la tarjeta' },
  { a: '--muted', b: '--surface', min: 4.5, que: 'descripciones sobre la tarjeta' },
  { a: '--accent-ink', b: '--accent', min: 4.5, que: 'el texto/icono sobre un fondo del acento' },
  { a: '--surface', b: '--ink', min: 4.5, que: 'el pie sobre el fondo de la pagina' },
  { a: '--metal', b: '--ink', min: 4.5, que: 'el metal sobre el fondo de la pagina' },
  { a: '--metal-ink', b: '--metal', min: 4.5, que: 'el texto/icono sobre el metal (boton Jugar, bandas del marcador)' },
  { a: '--ink', b: '--base', min: 4.5, que: 'el texto del juego sobre su fondo' },
  { a: '--solid-ink', b: '--solid', min: 4.5, que: 'el texto de un boton/chip solido sobre su relleno' },
  { a: '--offer', b: '--surface', min: 4.5, que: 'el rojo de oferta sobre la tarjeta' },
  { a: '--surface', b: '--offer', min: 4.5, que: 'el texto de la etiqueta de oferta sobre el rojo' },
  { a: '--border', b: '--surface', min: 1.3, que: 'los filetes sobre la tarjeta' },
];

/** Verifica un colorPrincipal cualquiera -- el de fabrica, el de un cliente, el que
 *  alguien acabe de escribir en Admin -> Marca. Revienta (lanza) con mensaje exacto de
 *  que pareja falla y cuanto falta si el contraste no llega, o si el color no daba para
 *  ninguna variante legible (derivar() devolvio null en --accent-ink, --metal o
 *  --metal-ink). `nombre` solo es para el mensaje -- llamadores no-Node (el panel, en PHP)
 *  hacen esta misma comprobacion con su propia implementacion: ver `derivarPrincipal()` en
 *  motor/server/admin/index.php, deliberadamente la misma aritmetica. */
export function verificarPaleta(colorPrincipal, nombre = 'el color') {
  const NL = String.fromCharCode(10);
  const t = derivar(colorPrincipal);
  const fallos = [];
  for (const k of ['--accent-ink', '--metal', '--metal-ink']) {
    if (t[k] === null) {
      fallos.push('ninguna variante de ' + k + ' se lee -- prueba con un color mas alejado de negro o blanco puro');
    }
  }
  if (!fallos.length) {
    for (const p of PAREJAS) {
      const r = contraste(t[p.a], t[p.b]);
      if (r < p.min) {
        fallos.push(p.que + ' = ' + r.toFixed(2) + ':1, hace falta ' + p.min + ':1 (' + p.a + ' vs ' + p.b + ')');
      }
    }
  }
  if (fallos.length) {
    throw new Error('contraste insuficiente en ' + nombre + ':' + NL + '  ' + fallos.join(NL + '  '));
  }
}

/** Autocomprobacion del motor: el color de fabrica tiene que pasar siempre, para
 *  cualquier cliente que no traiga el suyo. */
export function verificar() {
  verificarPaleta(PRINCIPAL_DEFECTO, 'el color por defecto');
}

/** El :root de un cliente concreto -- un unico bloque, nada de [data-tema]: ya no hay
 *  nada entre lo que conmutar. */
export function cssMarca(colorPrincipal) {
  const NL = String.fromCharCode(10);
  const t = derivar(colorPrincipal);
  const lineas = Object.keys(t).map((k) => '  ' + k + ':' + t[k] + ';');
  return ':root{' + NL + lineas.join(NL) + NL + '}' + NL;
}
