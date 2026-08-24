/* ------------------------------------------------------------------ *
 * Chilli Rush — el minijuego de la espera
 *
 * Página aparte, no una sección de la carta, por una razón medible: la carta pesa 580 KB de
 * HTML y la abre todo el mundo; el juego lo abrirá una parte. Metido dentro, todos pagarían
 * el peso. Fuera, la carta no engorda ni un byte y el juego sólo lo descarga quien lo pide.
 *
 * Comparte con la carta lo que hace que no parezca otra web: los tokens (mismo `TOKENS`),
 * las dos tipografías, el mismo mecanismo de idioma y la misma clave de localStorage, así
 * que se abre en el idioma que el cliente ya eligió en la carta.
 *
 * Sin dependencias, sin canvas, sin bucle de render. Los chiles son elementos del DOM que
 * entran y salen con transform y opacity — a diez elementos simultáneos eso va sobrado, y
 * es lo único que el resto del proyecto se permite animar.
 * ------------------------------------------------------------------ */

export const GAME_STRINGS = [
  'Chilli Rush', 'While you wait',
  'Tap the chillies. Dodge the ice.', 'Play', 'Play again', 'Back to the menu',
  'Score', 'Time', 'Streak', 'Ready?', 'points',
  'Best today', 'Your score', 'House record', 'New record!', 'Record',
];

/* Los tres iconos del juego. Tabler (MIT), el mismo trazo 1.75 del resto del proyecto.
   El chile normal y el dorado comparten silueta a propósito: se distinguen por color y
   tamaño, no por forma, así nadie tiene que aprender un dibujo nuevo a mitad de partida.
   El copo de nieve es lo que todo el mundo lee como frío sin que se lo expliquen; el primer
   dibujo que puse parecía un reloj de arena y en un juego de 30 segundos eso confunde. */
const PEPPER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 11c0 2.21 -2.239 4 -5 4s-5 -1.79 -5 -4a8 8 0 1 0 16 0a3 3 0 0 0 -6 0"/><path d="M16 8c0 -2 2 -4 4 -4"/></svg>';
const ICE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4l2 1l2 -1"/><path d="M12 2v6.5l3 1.72"/><path d="M17.928 6.268l.134 2.232l1.866 1.232"/><path d="M20.66 7l-5.629 3.25l.01 3.458"/><path d="M19.928 14.268l-1.866 1.232l-.134 2.232"/><path d="M20.66 17l-5.629 -3.25l-2.99 1.738"/><path d="M14 20l-2 -1l-2 1"/><path d="M12 22v-6.5l-3 -1.72"/><path d="M6.072 17.732l-.134 -2.232l-1.866 -1.232"/><path d="M3.34 17l5.629 -3.25l-.01 -3.458"/><path d="M4.072 9.732l1.866 -1.232l.134 -2.232"/><path d="M3.34 7l5.629 3.25l2.99 -1.738"/></svg>';

export function buildGame({ T, TL, TOKENS, FONTS, LANG_CODES, LANGS, IDIOMAS, titles, TEMAS_SLUGS, TEMA_INK, CLIENTE, CLAVE }) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  /* El mismo selector que la carta: bandera, nombre y chevron, arriba a la derecha. */
  const langMenu = `<div class="head-tools">
    <div class="lang" id="lang">
      <button type="button" class="lang-trigger" id="lang-trigger"
              aria-haspopup="true" aria-expanded="false" aria-controls="lang-menu"${TL('Language')}>
        <span class="lang-flag" id="lang-flag" aria-hidden="true"></span>
        <span class="lang-name" id="lang-name"></span>
        <svg class="lang-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6"/></svg>
      </button>
      <div class="lang-menu" id="lang-menu" role="menu" hidden>
${IDIOMAS.map((l) => `        <button type="button" class="lang-opt" role="menuitemradio" aria-checked="false" data-lang="${l.code}" lang="${l.code}">
          <span class="lang-flag" aria-hidden="true">${l.flag}</span>
          <span class="lang-name">${esc(l.name)}</span>
          <svg class="lang-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5l9 -9"/></svg>
        </button>`).join(String.fromCharCode(10))}
      </div>
    </div>
  </div>`;

  return `<!doctype html>
<html lang="en" translate="no" class="notranslate">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="${TEMA_INK}">
<link rel="icon" type="image/svg+xml" href="assets/titleIcon-accent.svg">
<title>${CLIENTE.tituloJuego}</title>
<script>try{var _t=localStorage.getItem('${CLAVE('tema')}');if(_t)document.documentElement.dataset.tema=_t}catch(e){}</script>
${FONTS}
<style>
${TOKENS}
*,*::before,*::after{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  /* El teal vivo de la marca con texto navy: 7.58:1. Al revés — crema sobre este teal — son
     2.11:1, un color que se ve pero no se lee. Es el mismo criterio con el que el pie de la
     carta acabó en navy en vez de en crema. */
  background:var(--base);
  color:var(--ink);
  font-family:var(--body-font);
  -webkit-font-smoothing:antialiased;
  /* el juego es a pantalla, no a scroll: nada de rebote al arrastrar sobre los chiles */
  overscroll-behavior:none;
  -webkit-user-select:none;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
}
.wrap{
  position:relative;
  display:flex;
  flex-direction:column;
  min-height:100dvh;                 /* nunca 100vh: en móvil la barra del navegador miente */
  max-width:560px;
  margin:0 auto;
  padding:calc(var(--s3) + env(safe-area-inset-top)) var(--s3)
          calc(var(--s3) + env(safe-area-inset-bottom));
}

/* ---------- idioma ----------
   El mismo control que la carta, en el mismo sitio: arriba a la derecha, bandera + nombre +
   chevron y un desplegable propio con los tres idiomas escritos cada uno en el suyo. Un
   cliente que acaba de usarlo en la carta lo encuentra aquí donde lo dejó. */
.head-tools{
  position:absolute;
  top:calc(var(--s1) + var(--s2) + env(safe-area-inset-top));
  right:calc(var(--s1) + var(--s2));
  z-index:6;
  display:flex;align-items:center;
  padding:4px;
  border-radius:var(--r-pill);
  /* 50 % y no el 78 % de la carta: allí hay una foto debajo y el cristal se nota; aquí el
     fondo es plano y al 78 % parecía opaco. La tinta sigue a más de 9:1 en los seis temas. */
  background:color-mix(in srgb,var(--surface) 50%,transparent);
  backdrop-filter:blur(12px) saturate(140%);
  -webkit-backdrop-filter:blur(12px) saturate(140%);
  box-shadow:var(--lift-fab);
}
.head-tools[hidden]{display:none}   /* display:flex pisa al hidden del navegador sin esto */
@media (prefers-reduced-transparency:reduce){
  .head-tools{background:var(--surface);backdrop-filter:none;-webkit-backdrop-filter:none}
}
.lang{position:relative}
/* El mismo control que en la carta, con los mismos números: 44 de alto y 16 de cuerpo. Se
   había quedado en 40 y 13, y el idioma elegido se leía más pequeño aquí que allí para un
   control que es el mismo y se toca igual. */
.lang-trigger{
  display:flex;align-items:center;gap:7px;
  height:44px;padding:0 10px 0 12px;
  border:1px solid transparent;border-radius:var(--r-pill);
  background:transparent;color:var(--ink);
  font-family:var(--title-font);font-size:16px;font-weight:600;
  cursor:pointer;
  transition:border-color var(--t-fast) ease,transform var(--t-press) var(--ease-out);
}
.lang-trigger:active{transform:scale(.96)}
.lang-trigger:focus-visible{outline:2px solid var(--accent-ink);outline-offset:2px}
.lang-flag{display:inline-flex;flex:0 0 auto}
.bandera{width:21px;height:14px;border-radius:3px;box-shadow:0 0 0 1px color-mix(in srgb,var(--ink) 14%,transparent)}
.lang-chevron{width:15px;height:15px;color:var(--muted);transition:transform var(--t-fast) var(--ease-out)}
.lang-trigger[aria-expanded="true"] .lang-chevron{transform:rotate(180deg)}
.lang-menu{
  position:absolute;top:calc(100% + 6px);right:0;z-index:20;
  min-width:172px;padding:5px;
  border:1px solid var(--border);border-radius:16px;
  background:var(--surface);box-shadow:var(--lift-fab);
  transform-origin:top right;
  transition:opacity var(--t-fast) var(--ease-out),transform var(--t-fast) var(--ease-out);
}
.lang-menu[hidden]{display:none}
.lang-menu.is-closed{opacity:0;transform:translateY(-2px) scale(.97)}
/* Bricolage a 16, como en la carta: las opciones son un control que se toca, no texto que se
   lee, y en serif a 15 no se parecían a los chips ni al idioma ya elegido. */
.lang-opt{
  display:flex;align-items:center;gap:9px;
  width:100%;min-height:42px;padding:0 9px;
  border:0;border-radius:11px;background:transparent;color:var(--ink);
  font-family:var(--title-font);font-size:16px;font-weight:600;
  text-align:left;cursor:pointer;
  transition:background-color var(--t-fast) ease;
}
.lang-opt .lang-name{flex:1 1 auto}
.lang-opt:focus-visible{outline:2px solid var(--accent-ink);outline-offset:-2px}
@media (hover:hover) and (pointer:fine){ .lang-opt:hover{background:var(--chip)} }
.lang-opt[aria-checked="true"]{color:var(--accent-ink)}
.lang-check{width:17px;height:17px;color:var(--accent-ink);opacity:0}
.lang-opt[aria-checked="true"] .lang-check{opacity:1}
@media (prefers-reduced-motion:reduce){
  .lang-menu,.lang-chevron{transition:none}
  .lang-menu.is-closed{transform:none}
}

/* ---------- pantallas ---------- */
.screen{
  flex:1 1 auto;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  gap:var(--s3);
  padding:var(--s3) 0;
}
.screen[hidden]{display:none}
.eyebrow{
  margin:0;
  font-family:var(--title-font);
  font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
}
h1{
  margin:0;
  font-family:var(--title-font);
  font-size:clamp(38px,12vw,64px);
  font-weight:800;
  line-height:.95;
  letter-spacing:-0.03em;
}
.rules{margin:0;max-width:30ch;font-size:clamp(16px,4.4vw,19px);line-height:1.4}

/* ---------- portada «Arcade» ----------
   Elegida entre tres direcciones prototipadas (Sereno / Cartel / Arcade). Vende la partida
   antes del primer toque: mascota con entrada «pop», «Rush» en el rojo de aviso inclinado, y
   debajo el récord de la casa, que es contra quien se juega. El rojo pasa a ser aquí también
   personalidad, no sólo aviso — decisión consciente, sólo en esta pantalla. */
.mascota{
  width:104px;height:104px;
  display:flex;align-items:center;justify-content:center;
  border-radius:50%;
  background:var(--ink);color:var(--surface);
  box-shadow:var(--lift-fab);
  animation:pop 260ms cubic-bezier(.34,1.56,.64,1) both;
}
.mascota svg{width:60px;height:60px;stroke-width:1.6}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
/* ---- el aire de la portada ----
   Los huecos salían de sumar el gap de .screen (21) con márgenes sueltos de cada bloque, y
   medían 29 · 21 · 21 · 29 · 42: cinco separaciones distintas sin que ninguna dijera nada.

   Aquí el gap se apaga y cada separación se declara, con la escala y con un motivo:
     mascota → título   21   se tocan pero no se pegan
     título  → frase    13   son un bloque, el nombre y lo que promete
     frase   → récord   21   la referencia, pegada a lo que promete
     récord  → botones  34   el salto antes de la zona de acción */
#s-intro{gap:0}
#s-intro h1{margin-top:var(--s3);font-size:clamp(44px,13vw,72px);line-height:.9}
#s-intro .rules{margin-top:var(--s2)}
#s-intro .eyebrow{margin-top:var(--s2)}
/* Un eyebrow vacío se sale del flujo, o gastaría su hueco por nada. */
#s-intro .eyebrow:empty{display:none}
#s-intro h1 em{
  font-style:normal;display:inline-block;
  transform:rotate(-3deg);
  color:var(--surface);background:var(--offer);
  padding:0 .18em;border-radius:.14em;
}
@keyframes sube{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
#s-intro .actions{margin-top:var(--s4)}
/* Flex de verdad: sin él el gap no existe y el SVG cae a la línea base del texto. */
#btn-play{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:64px;font-size:20px;background:var(--offer)}
#btn-play svg{width:21px;height:21px;flex:0 0 auto}
#btn-play .i18n{line-height:1}
@media (prefers-reduced-motion:reduce){ .mascota,.record,.eyebrow-record{animation:none} }
/* Botones a medida de app: la acción principal llena 320px (o el ancho que haya), 56px de
   alto; la secundaria debajo, misma anchura, sin relleno y con borde — se lee como opción,
   no como acción. Entre bloque de texto y botones, un escalón más de aire que entre líneas. */
.actions{display:flex;flex-direction:column;align-items:center;gap:var(--s2);width:min(320px,100%);margin-top:var(--s2)}
.big-btn{
  width:min(320px,100%);min-height:56px;
  padding:0 var(--s4);
  border:0;border-radius:var(--r-pill);
  background:var(--ink);color:var(--surface);
  font-family:var(--title-font);font-size:18px;font-weight:700;letter-spacing:.02em;
  cursor:pointer;
  box-shadow:var(--lift-fab);
  transition:transform var(--t-press) var(--ease-out);
}
.big-btn:active{transform:scale(.96)}
.big-btn:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
.ghost-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  width:min(320px,100%);min-height:52px;padding:0 var(--s3);
  border:1.5px solid var(--ink);
  border-color:color-mix(in srgb,var(--ink) 45%,transparent);
  border-radius:var(--r-pill);
  background:transparent;color:var(--ink);
  font-family:var(--title-font);font-size:16px;font-weight:600;letter-spacing:.01em;
  text-decoration:none;cursor:pointer;
  transition:border-color var(--t-fast) ease,transform var(--t-press) var(--ease-out);
}
.ghost-btn svg{width:18px;height:18px}
.ghost-btn:active{transform:scale(.97)}
.ghost-btn:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
@media (hover:hover) and (pointer:fine){ .ghost-btn:hover{border-color:var(--ink)} }

/* ---------- marcador ---------- */
/* Cabecera «Horno»: el marcador grande en el centro con el objetivo debajo, el tiempo a la
   izquierda y la racha a la derecha. Se lee de un vistazo a un metro, que es la distancia a
   la que está el móvil apoyado en la mesa. */
.hud{
  flex:0 0 auto;
  display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:var(--s2);
  margin-top:var(--s3);
}
.hud-item{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:64px}
.hud-item.der{align-items:flex-end}
.hud-item.centro{align-items:center;gap:0}
.hud-item.centro .hud-val{font-size:56px;letter-spacing:-.03em}
.hud-lbl{font-family:var(--title-font);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.hud-val{font-family:var(--title-font);font-size:26px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.hud-val.pop{animation:pop var(--t-press) var(--ease-out)}
@keyframes pop{from{transform:scale(1.28)}to{transform:scale(1)}}
.bar{
  flex:0 0 auto;height:6px;margin-top:var(--s2);
  border-radius:var(--r-pill);background:var(--chip);
  background:color-mix(in srgb,var(--ink) 16%,transparent);overflow:hidden;
}
.bar > i{
  display:block;height:100%;width:100%;
  transform-origin:left center;
  border-radius:inherit;background:var(--ink);
}
/* los últimos cinco segundos: la barra se pone crema, que sobre el teal es lo que más salta */
.bar.warn > i{background:var(--offer)}

/* ---------- tablero ---------- */
.board{
  position:relative;
  flex:1 1 auto;
  min-height:340px;
  margin-top:var(--s2);
  border-radius:var(--r-card);
  /* Navy sólido, no un velo sobre el teal. Con el teal transparente detrás, la ficha crema
     medía 2.61:1 contra el tablero, la dorada 1.69 y la de hielo 2.24 — piezas que hay que
     encontrar y tocar en un segundo y que se confundían con el suelo. Sobre navy miden 16,
     10.4 y 13.8. El tablero pasa a ser la pantalla del juego dentro de la página. */
  background:var(--ink);
  overflow:hidden;
  touch-action:manipulation;      /* sin doble-toque-zoom: aquí se toca muy rápido */
  /* Tres carriles. Las fichas ya no aparecen en cualquier punto: suben por un carril y hay
     que tocarlas antes de que salgan por arriba. Se sabe por dónde vienen y se juega con el
     pulgar sin mover la mano — para niños y mayores es la diferencia entre jugar y no. */
  background-image:
    linear-gradient(90deg,transparent calc(33.333% - .5px),color-mix(in srgb,var(--surface) 14%,transparent) calc(33.333% - .5px),color-mix(in srgb,var(--surface) 14%,transparent) calc(33.333% + .5px),transparent calc(33.333% + .5px)),
    linear-gradient(90deg,transparent calc(66.666% - .5px),color-mix(in srgb,var(--surface) 14%,transparent) calc(66.666% - .5px),color-mix(in srgb,var(--surface) 14%,transparent) calc(66.666% + .5px),transparent calc(66.666% + .5px));
}
.board .linea{position:absolute;left:0;right:0;top:56px;height:1px;background:color-mix(in srgb,var(--surface) 28%,transparent);pointer-events:none}
.spot{
  position:absolute;
  display:flex;align-items:center;justify-content:center;
  width:64px;height:64px;
  margin:-32px 0 0 -32px;          /* el punto que le paso es el centro */
  padding:0;border:0;
  border-radius:50%;
  background:var(--surface);
  color:var(--offer);
  cursor:pointer;
  opacity:1;
  transition:opacity var(--t-fast) var(--ease-out);
  will-change:transform,opacity;
}
/* El viaje dura exactamente la vida de la ficha (--vida, la pone el runtime): llegar arriba
   y caducar son lo mismo. Lineal a propósito: el ojo predice dónde va a estar. */
.spot.viaje{transition:transform var(--vida) linear,opacity var(--t-fast) var(--ease-out)}
.spot.out{opacity:0}
.spot svg{width:34px;height:34px}
.spot.gold{background:#f2c14e;color:#7a4a06}
.spot.ice{background:#cfe9f2;color:#0d5b73}
.spot:focus-visible{outline:3px solid var(--surface);outline-offset:2px}
.spot.hit{opacity:0;transition:opacity 120ms var(--ease-out)}

/* el +1 / -2 que sube desde donde se ha tocado */
.float{
  position:absolute;
  margin:-10px 0 0 -20px;
  width:40px;
  font-family:var(--title-font);font-size:18px;font-weight:800;
  text-align:center;
  /* Sobre el tablero navy: crema para el +, y para el − el rojo de la oferta aclarado con la
     propia crema hasta 7.65:1. No es un color nuevo, es el mismo aclarado — el #C62828 puro
     sobre navy no llegaba a leerse. El signo hace de segunda señal: nadie depende del color. */
  color:var(--surface);
  pointer-events:none;
  animation:floatup 520ms var(--ease-out) forwards;
}
.float.bad{color:#e39992}
@keyframes floatup{
  from{opacity:1;transform:translateY(0)}
  to{opacity:0;transform:translateY(-42px)}
}

/* ---------- resultado ---------- */
/* El récord de la casa: la referencia contra la que se juega. */
.record{
  margin:var(--s3) 0 0;
  font-family:var(--title-font);font-size:15px;font-weight:600;
  color:var(--surface);opacity:.8;
  font-variant-numeric:tabular-nums;
}
.record[hidden]{display:none}
.record b{font-weight:800;opacity:1}
/* Batir el récord: lo único que celebra, y no da nada. */
.eyebrow-record{color:var(--offer);animation:sube 240ms var(--ease-out) both}
.tally{margin:0;font-family:var(--title-font);font-size:clamp(30px,9vw,44px);font-weight:800;line-height:1}
.tally small{display:block;margin-top:6px;font-family:var(--body-font);font-size:15px;font-weight:400;opacity:.85}

/* ---------- cuenta atrás ---------- */
.count{font-family:var(--title-font);font-size:clamp(64px,26vw,120px);font-weight:800;line-height:1}
.count.tick{animation:pop 260ms var(--ease-out)}

@media (prefers-reduced-motion:reduce){
  .spot,.spot.viaje{transition:opacity var(--t-fast) ease}
  .spot,.spot.out,.spot.hit{transform:none}
  .hud-val.pop,.count.tick{animation:none}
  .float{animation:fadeout 520ms ease forwards}
  @keyframes fadeout{from{opacity:1}to{opacity:0}}
}
</style>
</head>
<body>
<div class="wrap">
  ${langMenu}

  <!-- 1. portada -->
  <section class="screen" id="s-intro">
    <div class="mascota" aria-hidden="true">${PEPPER}</div>
    <h1>Chilli <em>Rush</em></h1>
    <p class="rules">${T('Tap the chillies. Dodge the ice.', 'ui')}</p>
    <p class="record" id="intro-record" hidden></p>
    <div class="actions">
      <button class="big-btn" id="btn-play" type="button">${PEPPER}${T('Play', 'ui')}</button>
      <a class="ghost-btn" href="./index.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/></svg>${T('Back to the menu', 'ui')}</a>
    </div>
  </section>

  <!-- 2. cuenta atrás -->
  <section class="screen" id="s-count" hidden>
    <p class="eyebrow">${T('Ready?', 'ui')}</p>
    <p class="count" id="count">3</p>
  </section>

  <!-- 3. partida -->
  <section class="screen" id="s-play" hidden style="justify-content:flex-start;gap:0">
    <div class="hud" style="width:100%">
      <div class="hud-item">
        <span class="hud-lbl">${T('Time', 'ui')}</span>
        <span class="hud-val" id="clock">30</span>
      </div>
      <div class="hud-item centro">
        <span class="hud-val" id="score">0</span>
      </div>
      <div class="hud-item der">
        <span class="hud-lbl">${T('Streak', 'ui')}</span>
        <span class="hud-val" id="racha">0</span>
      </div>
    </div>
    <div class="bar" id="bar" style="width:100%"><i id="bar-fill"></i></div>
    <div class="board" id="board" style="width:100%"><span class="linea" aria-hidden="true"></span></div>
  </section>

  <!-- 4. resultado -->
  <section class="screen" id="s-end" hidden>
    <p class="eyebrow" id="end-eyebrow"></p>
    <p class="tally"><span id="end-score">0</span><small id="end-best"></small></p>
    <p class="record" id="end-record" hidden></p>
    <div class="actions">
      <button class="big-btn" id="btn-again" type="button">${T('Play again', 'ui')}</button>
      <a class="ghost-btn" href="./index.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/></svg>${T('Back to the menu', 'ui')}</a>
    </div>
  </section>

</div>

<script>
(function () {
  'use strict';

  var TR = ${JSON.stringify(Object.fromEntries(GAME_STRINGS.map((k) => [k, Object.assign(
    { en: k },
    Object.fromEntries(LANGS.map((l) => [l.code, l.dicts.ui[k]])),
  )])))};
  var TITLE = ${JSON.stringify(titles)};
  var LANG_CODES = ${JSON.stringify(LANG_CODES)};

  function tr(k) {
    var e = TR[k], l = document.documentElement.lang || 'en';
    return e ? (e[l] || e.en) : k;
  }
  function fill(t, d) {
    return t.replace(/[{]([a-z]+)[}]/g, function (m, k) { return d[k] !== undefined ? d[k] : m; });
  }

  /* ---- idioma ----
     Mismo mecanismo y misma clave que la carta, así que el juego se abre en el idioma que el
     cliente ya eligió y volver a la carta no lo pierde. */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IDIOMAS = ${JSON.stringify(IDIOMAS)};
  var langCaja = document.getElementById('lang');
  var langTrigger = document.getElementById('lang-trigger');
  var langMenu = document.getElementById('lang-menu');
  var langFlag = document.getElementById('lang-flag');
  var langName = document.getElementById('lang-name');
  var langOpts = [].slice.call(document.querySelectorAll('.lang-opt'));

  function langAbrir(abre) {
    langTrigger.setAttribute('aria-expanded', String(abre));
    if (abre) {
      langMenu.hidden = false;
      langMenu.classList.add('is-closed');
      void langMenu.offsetWidth;
      langMenu.classList.remove('is-closed');
      var marcado = langMenu.querySelector('[aria-checked="true"]') || langOpts[0];
      if (marcado) marcado.focus();
    } else {
      langMenu.classList.add('is-closed');
      if (reduce) { langMenu.hidden = true; return; }
      setTimeout(function () {
        if (langTrigger.getAttribute('aria-expanded') === 'false') langMenu.hidden = true;
      }, 180);
    }
  }

  langTrigger.addEventListener('click', function () {
    langAbrir(langTrigger.getAttribute('aria-expanded') !== 'true');
  });
  langOpts.forEach(function (o, i) {
    o.addEventListener('click', function () {
      setLang(o.dataset.lang);
      langAbrir(false);
      langTrigger.focus();
    });
    o.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var k = (i + (e.key === 'ArrowDown' ? 1 : -1) + langOpts.length) % langOpts.length;
        langOpts[k].focus();
      }
    });
  });
  document.addEventListener('pointerdown', function (e) {
    if (langTrigger.getAttribute('aria-expanded') !== 'true') return;
    if (langCaja.contains(e.target)) return;
    langAbrir(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || langTrigger.getAttribute('aria-expanded') !== 'true') return;
    langAbrir(false);
    langTrigger.focus();
  });

  function langPintar(lang) {
    var l = null;
    for (var i = 0; i < IDIOMAS.length; i++) if (IDIOMAS[i].code === lang) l = IDIOMAS[i];
    if (!l) return;
    langFlag.innerHTML = l.flag;
    langName.textContent = l.name;
    langOpts.forEach(function (o) { o.setAttribute('aria-checked', String(o.dataset.lang === lang)); });
  }

  function setLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-es]').forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.textContent;
      el.textContent = el.dataset[lang] !== undefined ? el.dataset[lang] : el.dataset.en;
    });
    document.title = TITLE[lang] || TITLE.en;
    langPintar(lang);
    try { localStorage.setItem('${CLAVE('lang')}', lang); } catch (e) {}
    pintarTextosDinamicos();
  }

  /* ---- estado del restaurante ----
     El mismo estado.json que la carta, y aparte el récord de la casa, que vive en su propio
     record.json. Si no llega ninguno de los dos se juega igual: entretener al que espera no
     depende de que el servidor conteste. */
  var CFG = { on: false, record: 0 };

  /* El mismo tema de marca que la carta, por la misma vía y con el mismo respaldo en el
     móvil para no parpadear. La barra del navegador se pinta del color del fondo del juego,
     que cambia con el tema, así que la meta se actualiza aquí y no en el HTML. */
  var TEMAS_OK = ${JSON.stringify(TEMAS_SLUGS)};
  var TEMA_DEF = ${JSON.stringify(TEMAS_SLUGS[0])};

  function aplicarTema(slug) {
    if (TEMAS_OK.indexOf(slug) === -1) slug = TEMA_DEF;
    var raiz = document.documentElement;
    if (slug === TEMA_DEF) delete raiz.dataset.tema;
    else raiz.dataset.tema = slug;
    try { localStorage.setItem('${CLAVE('tema')}', slug); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    var fondo = getComputedStyle(raiz).getPropertyValue('--base').trim();
    if (meta && fondo) meta.content = fondo;
  }
  aplicarTema(document.documentElement.dataset.tema);

  fetch('estado.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (s && s.theme) aplicarTema(s.theme);
      if (s && s.game) CFG.on = !!s.game.on;
      pintarTextosDinamicos();
    })
    .catch(function () { pintarTextosDinamicos(); });

  /* El récord va en su propia petición y no dentro de estado.json: ahí están los agotados y
     los precios, y el endpoint público que escribe el récord no puede tocar eso ni por
     accidente. Cuesta una petición de cuarenta bytes. */
  fetch('record.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && +j.puntos > 0) CFG.record = +j.puntos; })
    .catch(function () {})
    .then(function () { pintarRecord(); });

  /* El récord de la casa, en la portada y en el resultado. Sin récord todavía no se escribe
     «Récord: 0», que se lee como un fallo: sencillamente no aparece la línea. */
  /* Cuando se acaba de batir, la línea de «Récord de la casa» sobra en el resultado: el número
     grande de arriba YA es el récord, y repetirlo debajo se lee como si fueran dos cosas. Hace
     falta la bandera porque mandarRecord() contesta tarde y volvía a pintar la línea encima. */
  var recordRecien = false;

  function pintarRecord() {
    var txt = CFG.record > 0
      ? tr('House record') + ': <b>' + CFG.record + '</b> ' + tr('points')
      : '';
    ['intro-record', 'end-record'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = txt;
      el.hidden = !txt || (id === 'end-record' && recordRecien);
    });
  }

  function pintarTextosDinamicos() {
    pintarRecord();
    var best = mejorDeHoy();
    document.getElementById('end-best').textContent =
      best > 0 ? tr('Best today') + ': ' + best : '';
    if (!seEstaJugando) document.getElementById('score').textContent = puntos;
  }

  /* ---- el reloj del restaurante ----
     Manda la hora de Canarias, no la del móvil. El día "de servicio" empieza a las 06:00, así
     que la mejor marca de una cena que se alarga sigue siendo la de esa noche a la 01:00. */
  function fechaServicio() {
    try {
      var f = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Atlantic/Canary',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
      });
      var p = {};
      f.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
      if ((+p.hour) % 24 < 6) d.setUTCDate(d.getUTCDate() - 1);
      return d;
    } catch (e) { return new Date(); }
  }

  function ddmm(d) {
    var dd = ('0' + d.getUTCDate()).slice(-2), mm = ('0' + (d.getUTCMonth() + 1)).slice(-2);
    return dd + mm;
  }

  /* La clave de localStorage lleva el año. Con DDMM a secas, la mejor marca «resucitaba»
     exactamente un año después. */
  function fechaClave(d) {
    return d.getUTCFullYear() + ddmm(d);
  }

  /* ---- mejor marca del día, sólo para picarse consigo mismo ---- */
  function claveHoy() { return '${CLAVE('mejor')}-' + fechaClave(fechaServicio()); }
  function mejorDeHoy() {
    try { return parseInt(localStorage.getItem(claveHoy()) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function guardarMejor(p) {
    try { if (p > mejorDeHoy()) localStorage.setItem(claveHoy(), String(p)); } catch (e) {}
  }

  /* ---- el récord de la casa ----
     Se manda al acabar y sólo si hay algo que mandar. Decide el servidor: valida el tope y
     escribe únicamente si supera lo que había. Devuelve el récord que queda en pie, que puede
     no ser el nuestro si otra mesa lo ha batido mientras jugábamos. */
  function mandarRecord(p) {
    if (!CFG.on || !(p > 0)) return;
    try {
      var fd = new FormData();
      fd.append('puntos', String(p));
      fetch('admin/record.php', { method: 'POST', body: fd, cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && +j.puntos > 0) { CFG.record = +j.puntos; pintarRecord(); }
        })
        .catch(function () {});
    } catch (e) {}
  }

  /* ---- la partida ---- */
  var DURACION = 30;                 // segundos
  var board = document.getElementById('board');
  var elScore = document.getElementById('score');
  var elClock = document.getElementById('clock');
  var elBar = document.getElementById('bar');
  var elFill = document.getElementById('bar-fill');

  var puntos = 0, restante = DURACION, seEstaJugando = false;
  var racha = 0;                                              // toques seguidos sin hielo
  var elRacha = document.getElementById('racha');
  var tSpawn = null, tReloj = null, t0 = 0;
  var vivos = [];

  function pantalla(id) {
    ['s-intro', 's-count', 's-play', 's-end'].forEach(function (s) {
      document.getElementById(s).hidden = (s !== id);
    });
    /* El idioma se elige en la portada y ya no se toca: fuera de ella el selector sobra, y
       en la partida además estorba en la esquina donde salen los chiles. */
    var herramientas = document.querySelector('.head-tools');
    if (herramientas) {
      herramientas.hidden = (id !== 's-intro');
      if (herramientas.hidden && langTrigger.getAttribute('aria-expanded') === 'true') langAbrir(false);
    }
  }

  function limpiarTablero() {
    vivos.forEach(function (o) { clearTimeout(o.t); if (o.el.parentNode) o.el.remove(); });
    vivos = [];
    [].slice.call(board.querySelectorAll('.float')).forEach(function (f) { f.remove(); });
  }

  /* Dificultad: el ritmo sube y la vida de cada chile baja a lo largo de los 30 segundos.
     Empieza regalado —el primer toque tiene que ocurrir sin pensar— y acaba apretando. */
  function intervalo(prog) { return 620 - 300 * prog; }        // 620ms -> 320ms
  function vida(prog) { return 1500 - 650 * prog; }            // 1.5s  -> 0.85s

  function tipo(prog) {
    var r = Math.random();
    if (r < 0.08 + 0.05 * prog) return 'gold';                 // raro, y algo menos raro al final
    if (r < 0.26 + 0.14 * prog) return 'ice';                  // el hielo aparece más según aprieta
    return 'chilli';
  }

  function soltar() {
    if (!seEstaJugando) return;
    var prog = 1 - restante / DURACION;
    var t = tipo(prog);
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'spot' + (t === 'gold' ? ' gold' : t === 'ice' ? ' ice' : '');
    el.innerHTML = ${JSON.stringify(PEPPER)};
    if (t === 'ice') el.innerHTML = ${JSON.stringify(ICE)};
    el.setAttribute('aria-label', t === 'ice' ? 'ice' : 'chilli');
    if (t === 'ice') el.querySelector('svg').setAttribute('stroke-width', '1.6');

    /* Un carril al azar. La ficha nace bajo el borde inferior y sube hasta salir por arriba
       en exactamente su vida: el viaje ES la cuenta atrás. Con reduced-motion no viaja: se
       queda quieta en un punto del carril y desaparece al caducar. */
    var r = board.getBoundingClientRect();
    var carril = Math.floor(Math.random() * 3);
    var v = vida(prog);
    el.style.left = (r.width * (carril + 0.5) / 3) + 'px';
    if (reduce) {
      el.style.top = (44 + Math.random() * Math.max(1, r.height - 88)) + 'px';
      board.appendChild(el);
    } else {
      el.style.top = (r.height + 40) + 'px';
      el.style.setProperty('--vida', v + 'ms');
      board.appendChild(el);
      void el.offsetWidth;                                      // un frame abajo, y arranca
      el.classList.add('viaje');
      el.style.transform = 'translateY(' + (-(r.height + 80)) + 'px)';
    }

    var o = { el: el, t: null };
    o.t = setTimeout(function () { retirar(o); }, v);
    vivos.push(o);

    // pointerdown, no click: el toque tiene que responder al apoyar el dedo, no al levantarlo
    el.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      if (!seEstaJugando) return;
      tocado(o, t, ev);
    });

    tSpawn = setTimeout(soltar, intervalo(prog));
  }

  function retirar(o) {
    clearTimeout(o.t);
    var i = vivos.indexOf(o);
    if (i >= 0) vivos.splice(i, 1);
    o.el.classList.add('out');
    setTimeout(function () { if (o.el.parentNode) o.el.remove(); }, 200);
  }

  function tocado(o, t, ev) {
    var delta = t === 'gold' ? 3 : t === 'ice' ? -2 : 1;
    puntos = Math.max(0, puntos + delta);
    elScore.textContent = puntos;
    elScore.classList.remove('pop');
    void elScore.offsetWidth;
    elScore.classList.add('pop');

    racha = delta < 0 ? 0 : racha + 1;
    elRacha.textContent = racha;
    if (delta > 0) { elRacha.classList.remove('pop'); void elRacha.offsetWidth; elRacha.classList.add('pop'); }

    /* La ficha está en movimiento: el +1 sale de donde está ahora, no de donde nació. */
    var rb = board.getBoundingClientRect(), re = o.el.getBoundingClientRect();
    var f = document.createElement('span');
    f.className = 'float' + (delta < 0 ? ' bad' : '');
    f.textContent = (delta > 0 ? '+' : '') + delta;
    f.style.left = (re.left - rb.left + re.width / 2) + 'px';
    f.style.top = (re.top - rb.top + re.height / 2) + 'px';
    board.appendChild(f);
    setTimeout(function () { f.remove(); }, 560);

    o.el.classList.add('hit');
    clearTimeout(o.t);
    var i = vivos.indexOf(o);
    if (i >= 0) vivos.splice(i, 1);
    setTimeout(function () { if (o.el.parentNode) o.el.remove(); }, 140);

    if (navigator.vibrate) { try { navigator.vibrate(delta < 0 ? 30 : 8); } catch (e) {} }
  }

  function tic() {
    // el reloj se calcula del tiempo real transcurrido, no restando 1 por vuelta: si el
    // navegador ralentiza los timers en segundo plano, la partida sigue durando 30 segundos
    restante = Math.max(0, DURACION - (Date.now() - t0) / 1000);
    elClock.textContent = Math.ceil(restante);
    elFill.style.transform = 'scaleX(' + (restante / DURACION) + ')';
    elBar.classList.toggle('warn', restante <= 5);
    if (restante <= 0) terminar();
  }

  function empezar() {
    puntos = 0;
    racha = 0;
    elRacha.textContent = '0';
    restante = DURACION;
    elScore.textContent = '0';
    elClock.textContent = DURACION;
    elFill.style.transform = 'scaleX(1)';
    elBar.classList.remove('warn');
    limpiarTablero();
    pantalla('s-play');
    seEstaJugando = true;
    t0 = Date.now();
    tReloj = setInterval(tic, 100);
    soltar();
  }

  function terminar() {
    seEstaJugando = false;
    clearInterval(tReloj);
    clearTimeout(tSpawn);
    limpiarTablero();
    guardarMejor(puntos);

    /* Se compara ANTES de mandar: mandarRecord() actualiza CFG.record con lo que conteste el
       servidor, y entonces ya no habria forma de saber si acabamos de batirlo. */
    var nuevoRecord = puntos > 0 && puntos > CFG.record;
    recordRecien = nuevoRecord;
    mandarRecord(puntos);

    var ceja = document.getElementById('end-eyebrow');
    ceja.textContent = nuevoRecord ? tr('New record!') : tr('Your score');
    ceja.classList.toggle('eyebrow-record', nuevoRecord);
    document.getElementById('end-score').textContent = puntos;

    /* Si se acaba de batir, la linea de abajo ya no aporta: el numero grande ES el record.
       Y si no, dice contra que se juega la proxima. */
    if (nuevoRecord) CFG.record = puntos;
    pintarTextosDinamicos();

    pantalla('s-end');
  }
  function cuentaAtras() {
    recordRecien = false;
    pantalla('s-count');
    var el = document.getElementById('count');
    var n = 3;
    el.textContent = n;
    el.classList.add('tick');
    var iv = setInterval(function () {
      n -= 1;
      if (n <= 0) { clearInterval(iv); empezar(); return; }
      el.textContent = n;
      el.classList.remove('tick');
      void el.offsetWidth;
      el.classList.add('tick');
    }, 700);
  }

  document.getElementById('btn-play').addEventListener('click', cuentaAtras);
  document.getElementById('btn-again').addEventListener('click', cuentaAtras);

  // salir de la pestaña a mitad de partida no debe dejar el marcador corriendo solo
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && seEstaJugando) terminar();
  });

  /* El mismo criterio que la carta, y con la misma clave: se recorre navigator.languages
     entera, no solo la primera, para que un movil en catalan con ingles detras abra en ingles
     en vez de en el idioma de la casa. Si ninguno vale, ingles. */
  var TODOS = ['en'].concat(LANG_CODES);

  function soportado(c) { return TODOS.indexOf(c) >= 0; }

  /* Prioridad: el idioma con el que se estaba mirando la carta, que viaja en el enlace
     (?lang=es); después el guardado en el móvil; y si no hay nada, el del navegador. El
     enlace cubre el caso del modo privado, donde localStorage no sobrevive. */
  var saved = null;
  try { saved = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  if (!saved || !soportado(saved)) {
    try { saved = localStorage.getItem('${CLAVE('lang')}'); } catch (e) {}
  }
  if (!saved || !soportado(saved)) {
    var lista = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ''];
    saved = 'en';
    for (var li = 0; li < lista.length; li++) {
      var c2 = String(lista[li] || '').slice(0, 2).toLowerCase();
      if (soportado(c2)) { saved = c2; break; }
    }
  }
  setLang(saved);
})();
</script>
</body>
</html>
`;
}
