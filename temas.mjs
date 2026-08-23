/* ------------------------------------------------------------------ *
 * Temas de marca
 * ------------------------------------------------------------------ *
 *
 * El mismo producto en cinco locales de la misma calle no puede verse igual, o deja de ser
 * «su carta» y pasa a ser «una carta de esas». Aqui viven los juegos de color: cada tema son
 * CUATRO semillas y el resto —quince valores atados entre si— se calcula.
 *
 * Las cuatro semillas, de oscura a clara, tal y como vienen las paletas de referencia:
 *
 *   ink      la mas oscura. Es el fondo de la pagina Y cada palabra sobre la tarjeta. La
 *            regla del proyecto es esa: el texto siempre en el color mas oscuro del juego.
 *   deep     la media profunda (bordeaux, oliva, ardosia, ciruela, taupe). Pinta el fondo
 *            del juego; si con ella el texto no llegara a leerse, se aclara sola contra la
 *            tarjeta hasta que llegue.
 *   metal    la metalica (bronce, laton, oro viejo, plata, estano). Es el caracter del tema.
 *            Se usa TAL CUAL sobre los fondos oscuros (--metal) y OSCURECIDA hasta poder
 *            leerse sobre la tarjeta (--accent). Un mismo color, dos versiones, porque un
 *            dorado que se lee sobre crema ya no es un dorado.
 *   surface  la mas clara. La tarjeta: es el papel.
 *
 * Lo que se deriva —muted, border, chip, hairline, el velo, el rojo de oferta y las tres
 * sombras— no se elige: es ink a distintas opacidades sobre surface. Si se eligiera a mano,
 * cada tema seria un rediseno; asi, anadir un tema son cuatro lineas.
 *
 * Y nada de esto sale a produccion sin pasar verificar(): el build revienta si una sola de
 * las parejas reales baja de su umbral WCAG. Es la razon por la que el panel ofrece temas
 * cerrados y no un selector libre de color.
 *
 * Un color NO se tematiza a proposito: los del juego (fuego, agua, hielo), que son
 * semanticos. El rojo de oferta si se ajusta, pero solo en luminosidad y solo lo justo para
 * que se lea sobre la tarjeta de cada tema: sigue siendo rojo en todos.
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

/* ---- los temas ----
 *
 * Cinco paletas de sastreria: oscuro profundo, un tono medio con cuerpo, un metal y un papel.
 * Ninguna trae un color vivo, y es deliberado: el unico color saturado de la carta pasa a ser
 * el rojo de la oferta, que es informacion, no decoracion.
 */
export const TEMAS = [
  {
    slug: 'laurel',
    nombre: 'Laurel',
    nota: 'Verde botella, oliva y oro viejo sobre lino. Cocina de siempre, mantel de hilo.',
    ink: '#17382C',
    deep: '#727A63',
    metal: '#B49A67',
    surface: '#E7DECD',
  },
  {
    slug: 'onice',
    nombre: 'Ónice',
    nota: 'Piedra negra, taupe y bronce champán sobre marfil. Sobrio y caro.',
    ink: '#151411',
    deep: '#8C8173',
    metal: '#B59A70',
    surface: '#EEE8DD',
  },
  {
    slug: 'caoba',
    nombre: 'Caoba',
    nota: 'Burdeos y caoba con latón envejecido sobre papiro. Bodega y sobremesa.',
    ink: '#4B1822',
    deep: '#33211F',
    metal: '#A78655',
    surface: '#E9DDCC',
  },
  {
    slug: 'mar',
    nombre: 'Mar',
    nota: 'Azul de medianoche, pizarra y plata cepillada sobre perla. Puerto de noche.',
    ink: '#101E2C',
    deep: '#A9A7A0',
    metal: '#536271',
    surface: '#E1E0DA',
  },
  {
    slug: 'ciruela',
    nombre: 'Ciruela',
    nota: 'Berenjena y ciruela ahumada con estaño sobre rosa piedra. Cálido y distinto.',
    ink: '#2A1928',
    deep: '#8E8789',
    metal: '#67495D',
    surface: '#D0B9B4',
  },
];

export const TEMA_POR_DEFECTO = 'laurel';

/* ---- la derivacion ---- */

/* El metal, oscurecido en pasos de un uno por ciento hasta que se lee sobre la tarjeta. El
   objetivo es 5:1 y no 4.5:1 a proposito: 4.5 es el aprobado raspado y estos colores acaban
   en un movil, en una terraza y a pleno sol. */
const acentoLegible = (metal, surface) => {
  for (let f = 100; f > 20; f--) {
    const c = oscurecer(metal, f / 100);
    if (contraste(c, surface) >= 5) return c;
  }
  return '#000000';
};

/* El fondo del juego. Se parte del tono medio y se aclara contra la tarjeta lo justo para que
   el texto —que siempre va en ink— se lea encima. En las paletas claras no se toca nada. */
const fondoLegible = (deep, surface, ink) => {
  for (let t = 100; t >= 0; t -= 2) {
    const c = mezcla(deep, surface, t / 100);
    if (contraste(ink, c) >= 4.5) return c;
  }
  return surface;
};

/* El metal, sobre los fondos oscuros. Se aclara contra la tarjeta lo justo para llegar al
   umbral: en la mayoria de las paletas no se toca, y en las que el metal es casi tan oscuro
   como el fondo sube un punto y se lee. */
const metalLegible = (metal, ink, surface) => {
  for (let t = 100; t >= 40; t -= 1) {
    const c = mezcla(metal, surface, t / 100);
    if (contraste(c, ink) >= 4.5) return c;
  }
  return surface;
};

/* El rojo de la oferta es el mismo en todos los temas; lo unico que cambia es cuanto hay que
   bajarlo para que se lea sobre ESA tarjeta. Sigue siendo rojo: se multiplica, no se vira. */
const ROJO_BASE = '#C62828';
const rojoLegible = (surface) => {
  for (let f = 100; f > 30; f--) {
    const c = oscurecer(ROJO_BASE, f / 100);
    if (contraste(c, surface) >= 4.5) return c;
  }
  return '#000000';
};

export function derivar(tema) {
  const { ink, surface, deep, metal } = tema;
  const accent = acentoLegible(metal, surface);
  return {
    '--accent': accent,
    '--accent-ink': accent,
    /* El metal sin oscurecer. Solo vale sobre los fondos oscuros —el pie de la carta, el
       fondo de la pagina— donde el acento oscuro se apagaria del todo. */
    '--metal': metalLegible(metal, ink, surface),
    '--ink': ink,
    '--muted': mezcla(ink, surface, 0.72),
    '--surface': surface,
    '--base': fondoLegible(deep, surface, ink),
    /* El tono medio tal cual, para los rellenos que no llevan texto encima. */
    '--deep': deep,
    '--border': mezcla(ink, surface, 0.22),
    '--chip': mezcla(ink, surface, 0.08),
    '--surface-0': rgbaDe(surface, 0),
    '--scrim': rgbaDe(ink, '.55'),
    '--hairline': mezcla(ink, surface, 0.12),
    '--offer': rojoLegible(surface),
    '--lift-card': '0 2px 6px ' + rgbaDe(ink, '.10') + ',0 40px 70px -36px ' + rgbaDe(ink, '.45'),
    '--lift-fab': '0 1px 2px ' + rgbaDe(ink, '.12') + ',0 12px 28px -10px ' + rgbaDe(ink, '.32'),
    '--lift-sheet': '0 -8px 40px -12px ' + rgbaDe(ink, '.28'),
  };
}

/* ---- la guardia ----
 *
 * Las parejas que de verdad ocurren en pantalla. Texto normal 4.5:1, titulares 7:1, filetes
 * lo justo para verse. Si una falla, el build no escribe nada: mas vale no entregar que
 * entregar una carta que no se lee.
 */
const PAREJAS = [
  { a: '--ink', b: '--surface', min: 7, que: 'titulares y precios sobre la tarjeta' },
  { a: '--muted', b: '--surface', min: 4.5, que: 'descripciones sobre la tarjeta' },
  { a: '--accent', b: '--surface', min: 4.5, que: 'el acento sobre la tarjeta, en los dos sentidos' },
  { a: '--surface', b: '--ink', min: 4.5, que: 'el pie sobre el fondo de la pagina' },
  { a: '--metal', b: '--ink', min: 4.5, que: 'el metal sobre el fondo de la pagina' },
  { a: '--ink', b: '--base', min: 4.5, que: 'el texto del juego sobre su fondo' },
  { a: '--surface', b: '--accent', min: 4.5, que: 'el texto del boton de categorias sobre su relleno' },
  { a: '--offer', b: '--surface', min: 4.5, que: 'el rojo de oferta sobre la tarjeta' },
  { a: '--surface', b: '--offer', min: 4.5, que: 'el texto de la etiqueta de oferta sobre el rojo' },
  { a: '--border', b: '--surface', min: 1.3, que: 'los filetes sobre la tarjeta' },
];

export function verificar() {
  const fallos = [];
  const NL = String.fromCharCode(10);
  for (const tema of TEMAS) {
    const t = derivar(tema);
    for (const p of PAREJAS) {
      const r = contraste(t[p.a], t[p.b]);
      if (r < p.min) {
        fallos.push(tema.slug + ': ' + p.que + ' = ' + r.toFixed(2) + ':1, hace falta ' + p.min + ':1');
      }
    }
  }
  if (fallos.length) {
    throw new Error('contraste insuficiente en los temas:' + NL + '  ' + fallos.join(NL + '  '));
  }
}

/** El tema por defecto va en :root; los demas cuelgan de data-tema en el html. */
export function cssTemas() {
  const NL = String.fromCharCode(10);
  const bloque = (tema, selector) => {
    const t = derivar(tema);
    const lineas = Object.keys(t).map((k) => '  ' + k + ':' + t[k] + ';');
    return selector + '{' + NL + lineas.join(NL) + NL + '}';
  };
  const def = TEMAS.find((t) => t.slug === TEMA_POR_DEFECTO);
  const otros = TEMAS.filter((t) => t.slug !== TEMA_POR_DEFECTO)
    .map((t) => bloque(t, '[data-tema="' + t.slug + '"]'));
  return [bloque(def, ':root'), ...otros].join(NL) + NL;
}

/** Lo que necesita el panel para pintar las muestras sin repetir la derivacion en PHP. */
export function temasParaPanel() {
  return TEMAS.map((t) => ({ slug: t.slug, nombre: t.nombre, nota: t.nota, tokens: derivar(t) }));
}
