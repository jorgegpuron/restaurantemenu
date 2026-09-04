/* La página que ve quien llega a una dirección que no existe dentro de la carta.
 *
 * Hasta ahora Apache devolvía su pantalla en blanco: «404 Not Found», trece bytes, sin marca y
 * sin salida. Quien escanea un QR viejo en la mesa se quedaba ahí.
 *
 * Se construye aquí y no en gen.mjs porque no comparte nada con la carta salvo los tokens y las
 * tipografías: no hay platos, ni estado, ni idiomas en el marcado, ni carrusel. Son cuarenta
 * líneas de HTML y tiene que pesar lo que pesa una disculpa.
 *
 * TRES DECISIONES QUE NO SE VEN Y QUE IMPORTAN:
 *
 * 1. Los enlaces son ABSOLUTOS. Apache sirve este fichero pero la dirección de la barra sigue
 *    siendo la que el visitante escribió: desde /menu2/carpeta/inventada/ un enlace relativo
 *    apuntaría a /menu2/carpeta/inventada/index.html, que tampoco existe. Con la ruta completa
 *    da igual desde dónde se sirva.
 *
 * 2. La página NO se cachea y devuelve un 404 de verdad. Eso lo pone el ErrorDocument del
 *    .htaccess; aquí sólo hay que no estropearlo. Un 404 que responde 200 —lo que Google llama
 *    un «soft 404»— es lo que de verdad hace daño al posicionamiento: le dice al buscador que
 *    la página existe y merece indexarse. Con el 404 de verdad más el noindex, la carta buena
 *    no compite consigo misma.
 *
 * 3. El idioma se elige en el navegador y no en el servidor: los tres textos viajan en el
 *    HTML y el script escoge. Primero el que el visitante ya eligió en la carta —la misma
 *    clave de localStorage—, si no el de su teléfono, si no inglés, que es el idioma que más
 *    turistas comparten. Sin JavaScript se queda el que sale del build, que es el de la casa.
 */

export function buildError404({ TOKENS, FONTS, CLIENTE, CLAVE, LANGS, BASE, INK }) {
  /* Los textos, uno por idioma. El inglés es el original y el que se queda si algo falla.
     El cuerpo va partido en dos porque la segunda mitad va en negrita: es lo que se quiere que
     se lleve el que sólo lee media frase —que la carta sigue ahí—, y partirlo permite seguir
     escribiendo con textContent al cambiar de idioma en vez de inyectar HTML.
     La `pestana` es el título de la ventana y se queda sobrio a propósito: una pestaña del
     navegador con «¡Ups!» y un emoji es ruido en una lista de veinte pestañas. */
  const TEXTOS = {
    en: {
      titulo: 'Oops! This link could not get a table',
      cuerpoPlano: 'The page you are looking for is not available, but do not worry:',
      cuerpoFuerte: 'the menu is right where it was, and it is full of good things.',
      boton: 'Back to the menu',
      pestana: 'Page not found',
    },
    es: {
      titulo: '¡Ups! Este enlace se ha quedado sin mesa',
      cuerpoPlano: 'La página que buscas no está disponible, pero tranquilo:',
      cuerpoFuerte: 'la carta sigue en su sitio y está llena de cosas deliciosas.',
      boton: 'Volver a la carta',
      pestana: 'Página no encontrada',
    },
    de: {
      titulo: 'Hoppla! Für diesen Link war kein Tisch frei',
      cuerpoPlano: 'Die gesuchte Seite ist nicht verfügbar, aber keine Sorge:',
      cuerpoFuerte: 'die Speisekarte ist noch da – und voller guter Sachen.',
      boton: 'Zurück zur Speisekarte',
      pestana: 'Seite nicht gefunden',
    },
  };

  /* La dirección de la carta, entera y desde la raíz del dominio. Ver la decisión 1 de arriba.
     De CLIENTE.base salen las dos: la ruta para los enlaces y la de los ficheros del build. */
  const ruta = new URL(CLIENTE.base).pathname;

  const idiomas = LANGS.map((l) => l.code);
  /* El de la casa manda en el marcado que sale del build: es lo que ve quien navegue sin
     JavaScript, y también lo primero que se pinta mientras el script decide. */
  const casa = idiomas[0] || BASE;
  const base = TEXTOS[casa] || TEXTOS.en;

  return `<!doctype html>
<html lang="${casa}" translate="no" class="notranslate">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<!-- Una página de error no se indexa. El 404 de verdad ya lo dice, pero esto lo dice dos
     veces y no cuesta nada. -->
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="${INK}">
<link rel="icon" type="image/svg+xml" href="${ruta}assets/titleIcon-accent.svg">
<title>${base.pestana} · ${CLIENTE.nombre}</title>
${FONTS}
<style>
${TOKENS}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  min-height:100svh;
  margin:0;
  display:grid;
  place-items:center;
  padding:var(--s3) var(--s2);
  /* Sin tarjeta: aquí no hay carta que enmarcar. El navy de la marca a pantalla completa, con
     el texto en crema encima. Es la misma paleta que la carta, en la relación contraria —y a
     propósito: quien llega aquí no está mirando un menú, está mirando un aviso. */
  background:var(--ink);
  color:var(--surface);
  font-family:var(--body-font);
  -webkit-font-smoothing:antialiased;
  /* La marca de agua es más ancha que la pantalla en un móvil estrecho. Sin esto, la página
     tendría barra horizontal por un adorno. */
  overflow-x:hidden;
}

/* Lo que el navegador pinta y nadie diseña: la selección de texto sale de la paleta, no del
   azul del sistema. Es lo mismo que hace la carta. */
::selection{background:var(--accent);color:var(--accent-ink)}

/* ---- la marca de agua ----
   El código de error, enorme y detrás de todo. No es decoración: es el dato exacto de lo que ha
   pasado, puesto donde no estorba a lo que hay que leer.
   Va en el 7% del crema: medido, el titular sigue en 7,8:1 y el párrafo en 4,6:1 cuando el
   texto cae justo encima de un trazo, que es el peor caso. Por eso el párrafo subió del 68 al
   76% de crema — con la marca detrás, el 68 se quedaba rozando el mínimo.
   aria-hidden porque el titular ya dice en palabras lo que pasa; un lector de pantalla no
   necesita oír «cuatrocientos cuatro» antes de la frase. */
.marca{
  position:fixed;
  inset:0;
  display:grid;
  place-items:center;
  color:color-mix(in srgb,var(--surface) 7%,transparent);
  font-family:var(--title-font);
  font-variant-numeric:tabular-nums;
  font-size:clamp(200px,52vw,460px);
  font-weight:800;
  line-height:1;
  letter-spacing:-0.06em;
  /* No se selecciona ni se toca: está detrás, y quien arrastre para copiar el mensaje no
     debería llevarse un 404 pegado. */
  user-select:none;
  -webkit-user-select:none;
  pointer-events:none;
}

.caja{
  position:relative;   /* por delante de la marca de agua */
  width:min(420px,100%);
  text-align:center;
}

h1{
  margin:0 0 var(--s2);
  color:var(--surface);
  font-family:var(--title-font);
  font-size:clamp(21px,5.4vw,26px);
  font-weight:700;
  font-optical-sizing:auto;
  line-height:1.25;
  letter-spacing:-0.015em;
  text-wrap:balance;
}

.cuerpo{
  /* 40ch: dos frases, no una. Una medida de lectura larga las convertiría en líneas que hay
     que barrer de lado a lado, y una corta parte la negrita en demasiados trozos. */
  max-width:40ch;
  margin:0 auto var(--s4);
  color:color-mix(in srgb,var(--surface) 76%,transparent);
  font-size:16px;
  line-height:1.5;
  text-wrap:pretty;
}

/* La mitad que importa, en el crema entero: quien lea media frase se lleva lo único que hace
   falta saber —que la carta sigue ahí—. El peso lo pone el color, no una negrita de más:
   sobre fondo oscuro, subir el brillo separa mejor que engordar el trazo. */
.cuerpo strong{
  color:var(--surface);
  font-weight:600;
}

/* El emoji es el único glifo de la página que no dibuja nuestra tipografía: lo pone el sistema
   operativo y se ve distinto en cada teléfono. Se le da su propia caja para que no altere la
   línea base del titular ni su interlineado. */
.emoji{
  display:inline-block;
  font-size:.82em;
  line-height:1;
  vertical-align:baseline;
}

/* El botón, en crema sobre el fondo oscuro: es lo único claro y sólido de la pantalla, así que
   es lo primero que se mira. Sin sombra —no flota sobre nada— y con la pulsación hundiéndose.
   Es un enlace de verdad y no un div con un click: se puede abrir en otra pestaña, se anuncia
   como enlace y funciona sin JavaScript. */
.boton{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:var(--s1);
  min-height:52px;
  padding:0 var(--s4);
  border-radius:var(--r-pill);
  background:var(--surface);
  color:var(--ink);
  font-family:var(--title-font);
  font-size:17px;
  font-weight:700;
  letter-spacing:.02em;
  text-decoration:none;
  transition:transform var(--t-press) var(--ease-out);
}
.boton:active{transform:scale(.96)}
.boton:focus-visible{outline:3px solid var(--surface);outline-offset:3px}
@media (hover:hover) and (pointer:fine){
  .boton:hover{transform:translateY(-1px)}
}
.boton svg{flex:0 0 auto}

/* La entrada: un solo momento. El mensaje sube y aparece; la marca de agua se revela detrás,
   un poco después y sin moverse, que es lo que hace que se lea como fondo y no como otro
   elemento pidiendo atención.
   Las dos salen de un estado ya visible: si el script nunca corre, la página está entera. */
@media (prefers-reduced-motion:no-preference){
  .caja{animation:entra .42s var(--ease-out) both}
  .marca{animation:revela .6s var(--ease-out) .12s both}
}
@keyframes entra{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:none}
}
@keyframes revela{
  from{opacity:0}
  to{opacity:1}
}
</style>
</head>
<body>
<span class="marca" aria-hidden="true">404</span>
<main class="caja">
  <!-- El emoji va en su propio span y con aria-hidden. Un lector de pantalla lo lee en voz alta
       —«plato con tenedor y cuchillo»— y sería lo primero que oye alguien ciego después de
       enterarse de que se ha perdido. La frase funciona igual sin él, que es la prueba de que
       sobra para quien no lo ve. -->
  <h1><span id="t">${base.titulo}</span> <span class="emoji" aria-hidden="true">🍽️</span></h1>
  <p class="cuerpo"><span id="c">${base.cuerpoPlano}</span> <strong id="cf">${base.cuerpoFuerte}</strong></p>
  <a class="boton" id="b" href="${ruta}">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/></svg>
    <span>${base.boton}</span>
  </a>
</main>
<script>
(function () {
  var T = ${JSON.stringify(TEXTOS)};
  var CODIGOS = ${JSON.stringify(idiomas)};
  function soportado(c) { return CODIGOS.indexOf(c) !== -1; }
  var lang;
  /* Lo que eligió en la carta manda sobre lo que dice su teléfono: si un alemán se puso la
     carta en español, aquí también la quiere en español. */
  try { var g = localStorage.getItem('${CLAVE('lang')}'); if (g && soportado(g)) lang = g; } catch (e) {}
  if (!lang) {
    var lista = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < lista.length && !lang; i++) {
      var c = String(lista[i] || '').slice(0, 2).toLowerCase();
      if (soportado(c)) lang = c;
    }
  }
  if (!lang) lang = '${BASE}';

  var t = T[lang] || T.en;
  document.documentElement.lang = lang;
  document.getElementById('t').textContent = t.titulo;
  document.getElementById('c').textContent = t.cuerpoPlano;
  document.getElementById('cf').textContent = t.cuerpoFuerte;
  document.getElementById('b').querySelector('span').textContent = t.boton;
  document.title = t.pestana + ' \\u00b7 ' + ${JSON.stringify(CLIENTE.nombre)};
})();
</script>
</body>
</html>`;
}
