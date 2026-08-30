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

export function buildError404({ TOKENS, FONTS, CLIENTE, CLAVE, LANGS }) {
  /* Los textos, uno por idioma. Cortos a propósito: quien está perdido no lee un párrafo.
     El inglés es el original y el que se queda si algo falla. */
  const TEXTOS = {
    en: {
      titulo: 'This page does not exist',
      cuerpo: 'The link you followed does not lead anywhere. The menu is still where it was.',
      boton: 'See the menu',
      pestana: 'Page not found',
    },
    es: {
      titulo: 'Esta página no existe',
      cuerpo: 'El enlace que has seguido no lleva a ninguna parte. La carta sigue en su sitio.',
      boton: 'Ver la carta',
      pestana: 'Página no encontrada',
    },
    de: {
      titulo: 'Diese Seite gibt es nicht',
      cuerpo: 'Der Link führt ins Leere. Die Speisekarte ist weiterhin da.',
      boton: 'Zur Speisekarte',
      pestana: 'Seite nicht gefunden',
    },
  };

  /* La dirección de la carta, entera y desde la raíz del dominio. Ver la decisión 1 de arriba.
     De CLIENTE.base salen las dos: la ruta para los enlaces y la de los ficheros del build. */
  const ruta = new URL(CLIENTE.base).pathname;

  const idiomas = LANGS.map((l) => l.code);
  /* El de la casa manda en el marcado que sale del build: es lo que ve quien navegue sin
     JavaScript, y también lo primero que se pinta mientras el script decide. */
  const casa = idiomas[0] || 'en';
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
<meta name="theme-color" content="#17382C">
<link rel="icon" type="image/svg+xml" href="${ruta}assets/titleIcon-accent.svg">
<title>${base.pestana} · ${CLIENTE.nombre}</title>
<!-- El tema que el visitante ya estaba viendo, antes del primer pintado. Sin esto, quien viene
     de una carta en ciruela ve un error en verde y parece otro sitio. -->
<script>try{var _t=localStorage.getItem('${CLAVE('tema')}');if(_t)document.documentElement.dataset.tema=_t}catch(e){}</script>
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
  /* El navy de la carta, NO el --base del juego. Es la misma relación que la carta y que el
     panel: fondo profundo y papel crema encima. Quien llega aquí desde un QR tiene que
     reconocer el sitio antes de leer una palabra. */
  background:var(--ink);
  color:var(--ink);
  font-family:var(--body-font);
  -webkit-font-smoothing:antialiased;
}

/* Lo que el navegador pinta y nadie diseña: la selección de texto y el anillo de foco salen de
   la paleta, no del gris del sistema. Es lo mismo que hace la carta. */
::selection{background:var(--accent);color:var(--surface)}

.hoja{
  width:min(560px,100%);
  background:var(--surface);
  border-radius:var(--r-card);
  box-shadow:var(--lift-card);
  padding:var(--s5) var(--s4);
  text-align:center;
}

/* El número, en el mismo sitio y con el mismo aire que el de un plato: alineado a la derecha,
   con cifras tabulares y en el gris de las descripciones. No es adorno — es el código de
   error, que es la información exacta de lo que ha pasado. Lo que hace es enseñarlo en el
   idioma visual de la casa en vez de en el de un servidor. */
.numero{
  display:block;
  /* Pegado al titular: el numero y la frase son una sola cosa, no dos. El aire de verdad va
     despues, antes de la explicacion. */
  margin:0 0 var(--s1);
  color:var(--muted);
  font-family:var(--title-font);
  font-variant-numeric:tabular-nums;
  font-size:clamp(52px,16vw,86px);
  font-weight:800;
  line-height:1;
  letter-spacing:-0.04em;
}

h1{
  margin:0 0 var(--s3);
  color:var(--ink);
  font-family:var(--title-font);
  font-size:clamp(24px,6.4vw,34px);
  font-weight:800;
  font-optical-sizing:auto;
  line-height:1.15;
  letter-spacing:-0.02em;
  text-wrap:balance;
}

.cuerpo{
  /* 46ch y no 65: son dos frases centradas, y una medida de lectura larga las convierte en una
     línea sola que hay que barrer de lado a lado. */
  max-width:46ch;
  margin:0 auto var(--s4);
  color:var(--muted);
  font-size:17px;
  line-height:1.55;
  text-wrap:pretty;
}

/* El mismo botón que el del juego: pastilla en tinta, texto crema, y la pulsación se hunde.
   Es un enlace de verdad y no un div con un click: se puede abrir en otra pestaña, se anuncia
   como enlace y funciona sin JavaScript. */
.boton{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:var(--s1);
  min-height:56px;
  padding:0 var(--s4);
  border-radius:var(--r-pill);
  background:var(--ink);
  color:var(--surface);
  font-family:var(--title-font);
  font-size:18px;
  font-weight:700;
  letter-spacing:.02em;
  text-decoration:none;
  box-shadow:var(--lift-fab);
  transition:transform var(--t-press) var(--ease-out);
}
.boton:active{transform:scale(.96)}
.boton:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
@media (hover:hover) and (pointer:fine){
  .boton:hover{transform:translateY(-1px)}
}
.boton svg{flex:0 0 auto}

/* La entrada: la hoja sube un poco y aparece. Un solo momento, y sólo uno. Quien llega aquí ya
   ha tenido un contratiempo; lo último que necesita es una página que se mueva.
   Sale de un estado ya visible: si el script no llega a correr, la hoja está donde tiene que
   estar y no en blanco. */
@media (prefers-reduced-motion:no-preference){
  .hoja{animation:entra .5s var(--ease-out) both}
}
@keyframes entra{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:none}
}
</style>
</head>
<body>
<main class="hoja">
  <span class="numero" aria-hidden="true">404</span>
  <h1 id="t">${base.titulo}</h1>
  <p class="cuerpo" id="c">${base.cuerpo}</p>
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
  if (!lang) lang = 'en';
  /* La barra del navegador, del color del fondo real. El valor que sale del build es el del
     tema de la casa; si el visitante trae otro guardado, aquí se corrige. Es lo mismo que hace
     la carta al aplicar un tema. */
  try {
    var m = document.querySelector('meta[name="theme-color"]');
    var fondo = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    if (m && fondo) m.content = fondo;
  } catch (e) {}

  var t = T[lang] || T.en;
  document.documentElement.lang = lang;
  document.getElementById('t').textContent = t.titulo;
  document.getElementById('c').textContent = t.cuerpo;
  document.getElementById('b').querySelector('span').textContent = t.boton;
  document.title = t.pestana + ' \\u00b7 ' + ${JSON.stringify(CLIENTE.nombre)};
})();
</script>
</body>
</html>`;
}
