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
  'Play', 'Play again', 'Back to the menu',
  /* Los rotulos de las cuatro fichas. No se pintan: son el aria-label de cada una, para
     quien no ve los iconos. Lo que se ve es el icono y su numero, que no hay que traducir. */
  'Chilli, one point', 'Golden chilli, three points',
  'Ice, minus two points', 'Bomb, back to zero',
  'Score', 'Time', 'Streak', 'Ready?',
  'Best today', 'Your score', 'New record!', 'Record',
  'Your name', 'Where are you from?', 'Other', 'Save', 'Skip',
];

/* Los tres iconos del juego. Tabler (MIT), el mismo trazo 1.75 del resto del proyecto.
   El chile normal y el dorado comparten silueta a propósito: se distinguen por color y
   tamaño, no por forma, así nadie tiene que aprender un dibujo nuevo a mitad de partida.
   El copo de nieve es lo que todo el mundo lee como frío sin que se lo expliquen; el primer
   dibujo que puse parecía un reloj de arena y en un juego de 30 segundos eso confunde. */
const PEPPER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 11c0 2.21 -2.239 4 -5 4s-5 -1.79 -5 -4a8 8 0 1 0 16 0a3 3 0 0 0 -6 0"/><path d="M16 8c0 -2 2 -4 4 -4"/></svg>';
/* La bomba. El circulo relleno abajo y la mecha con su chispa arriba: a 36px se lee de un
   vistazo, que es todo el tiempo que hay para decidir no tocarla. */
const BOMB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="15" r="6.4" fill="currentColor" stroke="none"/><path d="M14.7 10.4l2.3 -2.7"/><path d="M18.4 7.2l.7 -2.4M21.2 8l-2.4 -.6M20.1 10.6l-1.5 -3"/></svg>';

const ICE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4l2 1l2 -1"/><path d="M12 2v6.5l3 1.72"/><path d="M17.928 6.268l.134 2.232l1.866 1.232"/><path d="M20.66 7l-5.629 3.25l.01 3.458"/><path d="M19.928 14.268l-1.866 1.232l-.134 2.232"/><path d="M20.66 17l-5.629 -3.25l-2.99 1.738"/><path d="M14 20l-2 -1l-2 1"/><path d="M12 22v-6.5l-3 -1.72"/><path d="M6.072 17.732l-.134 -2.232l-1.866 -1.232"/><path d="M3.34 17l5.629 -3.25l-.01 -3.458"/><path d="M4.072 9.732l1.866 -1.232l.134 -2.232"/><path d="M3.34 7l5.629 3.25l2.99 -1.738"/></svg>';

export function buildGame({ T, TL, TL_TXT, TOKENS, FONTS, LANG_CODES, LANGS, titles,
  TEMAS_SLUGS, TEMA_INK, CLIENTE, CLAVE, PAISES }) {
  /* Las opciones del selector de pais.

     Un <option> NO admite un <span> dentro: el navegador se lo come y el texto se queda en
     ingles para siempre. Asi que traducen como traduce el resto del proyecto pero sin envoltura,
     por atributo data-<idioma> sobre el propio <option>, que es lo que el conmutador ya busca.

     PAISES trae [codigo, es, en, de] y aqui se reparte por el codigo de cada idioma. */
  const IDX_PAIS = { es: 1, en: 2, de: 3 };
  const nombrePais = (fila, code) => fila[IDX_PAIS[code] === undefined ? 2 : IDX_PAIS[code]];
  const opcionesPais = [['', 'Otro', 'Other', 'Andere']].concat(PAISES).map((fila) => {
    const datos = LANGS.map((l) => ` data-${l.code}="${nombrePais(fila, l.code)}"`).join('');
    return `<option value="${fila[0]}"${datos}>${fila[2]}</option>`;
  }).join('');

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

/* Una sola regla para todas las banderas —el selector de idioma y el podio—, porque desde que
   salen de assets/banderas/ son el mismo fichero. 20x15 es su proporcion; con la 3:2 de antes
   salian aplastadas. */
.bandera{width:20px;height:15px;border-radius:2px;flex:0 0 auto;
  box-shadow:0 0 0 1px rgba(0,0,0,.22)}
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

/* ---------- los puntos de cada ficha ----------
   Sustituyen a la frase «Toca los chiles. Esquiva el hielo y la bomba.», que decia que hacer
   pero no cuanto valia cada cosa. Aqui se ve lo uno y lo otro de un vistazo y sin leer: el
   dibujo es EL MISMO que sale en el tablero y el color tambien, asi que la portada ensena
   exactamente lo que se va a tocar.

   Los numeros van en la tipografia de titulos y con cifras tabulares para que +1, +3 y -2
   ocupen lo mismo y la fila no baile. */
.puntos{
  display:flex;align-items:stretch;justify-content:center;gap:var(--s1);
  margin:var(--s3) 0 0;width:min(330px,100%);
}
.punto{
  flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:9px 2px 8px;border-radius:14px;
  background:color-mix(in srgb,var(--surface) 46%,transparent);
}
.punto .ficha{
  width:34px;height:34px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
}
.punto .ficha svg{width:21px;height:21px}
.punto .val{
  font-family:var(--title-font);font-size:14px;font-weight:800;
  font-variant-numeric:tabular-nums;letter-spacing:-.01em;color:var(--ink);
}
/* Cada ficha con el color que tiene en el tablero, y no uno decorativo: el chile normal sobre
   la tinta, el dorado en su amarillo, el hielo en su azul y la bomba en el rojo con su aro. */
.punto[data-t='chilli'] .ficha{background:var(--ink);color:var(--surface)}
.punto[data-t='gold'] .ficha{background:#f2c14e;color:#7a4a06}
.punto[data-t='ice'] .ficha{background:#cfe9f2;color:#0d5b73}
.punto[data-t='bomb'] .ficha{
  background:var(--offer);color:var(--surface);
  box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--surface) 88%,transparent);
}
.punto[data-t='ice'] .val,.punto[data-t='bomb'] .val{color:var(--offer)}
/* Entran una detras de otra, despues del cartel: 40ms de diferencia, lo justo para que se lea
   como una fila que se monta y no como cuatro cosas sueltas. */
.punto{animation:sube 240ms var(--ease-out) both}
.punto:nth-child(1){animation-delay:120ms}
.punto:nth-child(2){animation-delay:160ms}
.punto:nth-child(3){animation-delay:200ms}
.punto:nth-child(4){animation-delay:240ms}

/* ---------- el marcador colgado ----------
   El record estaba debajo de las reglas en crema al 80% sobre el fondo, y no se leia. Sube al
   borde de arriba y se convierte en un cartel colgado de dos cables, como la pizarra de un bar.

   Va absoluto y fuera del centrado de .screen: la portada sigue centrada y el cartel cuelga del
   marco. Con el juego recien puesto no hay record y no se pinta nada; entonces la portada queda
   exactamente como estaba. */
.marcador{
  /* El top es la barra de estado del movil: sin el inset, en un iPhone los cables salen de
     debajo del reloj. Donde no hay muesca, env() vale 0 y no cambia nada. */
  position:absolute;top:env(safe-area-inset-top,0px);left:0;right:0;z-index:2;
  display:flex;flex-direction:column;align-items:center;
  pointer-events:none;
}
.marcador[hidden]{display:none}
.cables{display:flex;gap:118px;height:26px}
.cables span{width:1.5px;background:color-mix(in srgb,var(--ink) 45%,transparent)}
.placa{
  transform-origin:top center;
  background:var(--ink);color:var(--surface);
  border-radius:13px;padding:9px var(--s3) 10px;
  display:flex;align-items:center;gap:10px;max-width:calc(100vw - var(--s4));
  box-shadow:0 10px 22px -10px rgba(0,0,0,.5),
             inset 0 0 0 2px color-mix(in srgb,var(--metal) 55%,transparent);
  animation:colgar 620ms cubic-bezier(.28,1.2,.5,1) both;
}
.placa .rot{
  font-family:var(--title-font);font-size:10px;font-weight:800;letter-spacing:.2em;
  text-transform:uppercase;color:var(--metal);white-space:nowrap;
}
.placa .n{
  font-family:var(--title-font);font-size:25px;font-weight:800;line-height:1;
  font-variant-numeric:tabular-nums;letter-spacing:-.02em;
}
.placa .quien{
  display:flex;align-items:center;gap:6px;min-width:0;
  font-family:var(--title-font);font-size:14px;font-weight:600;opacity:.85;
}
.placa .quien span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Cuelga y se mece una vez. El origen esta arriba, en los cables, que es de donde colgaria. */
@keyframes colgar{
  0%{opacity:0;transform:translateY(-14px) rotate(-3deg)}
  55%{opacity:1;transform:translateY(0) rotate(1.6deg)}
  80%{transform:rotate(-.7deg)}
  100%{opacity:1;transform:rotate(0)}
}

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
/* El logo se sale del disco por arriba y por abajo a proposito: asi el chile se planta ENCIMA
   del circulo en vez de quedar encerrado dentro. Se sale 11 por lado y debajo hay 21 de aire
   hasta el titulo, asi que no llega a tocarlo.

   El disco no recorta y la imagen no ocupa sitio de mas: la caja que cuenta para el hueco de
   la columna sigue siendo la del circulo, 104. */
.mascota img{width:auto;height:126px;display:block;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,.28))}
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
/* Los 21 de aire se midieron con un icono dentro del disco. Ahora el logo se sale 11 por abajo
   y se los come: el titulo se aparta esos 11 para que el hueco que se ve siga siendo 21. */
#s-intro h1{margin-top:calc(var(--s3) + 11px);font-size:clamp(44px,13vw,72px);line-height:.9}
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
@media (prefers-reduced-motion:reduce){ .mascota,.record,.eyebrow-record,.punto,.placa{animation:none} }
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
/* La bomba es un 5% mas grande que cualquier otra ficha: 67,2 contra 64. Que el peligro sea el
   blanco mas facil de acertar es la gracia — se acierta sin querer.

   Roja maciza con el dibujo en crema, y un aro de crema alrededor. El aro no es adorno: el rojo
   sobre el tablero de tinta no llega a 3:1 en todos los temas y el circulo se perderia contra el
   fondo. Con el aro, el borde se lee en los cinco.

   Y el color no decide solo: la forma es una bomba y el tamano es distinto. Nadie tiene que
   distinguir un rojo de un crema a toda velocidad para no perderlo todo. */
.spot.bomb{
  width:67.2px;height:67.2px;margin:-33.6px 0 0 -33.6px;   /* 64 x 1.05, el 5% exacto */
  background:var(--offer);color:var(--surface);
  box-shadow:inset 0 0 0 3px color-mix(in srgb,var(--surface) 88%,transparent);
}
.spot.bomb svg{width:36px;height:36px}
.spot:focus-visible{outline:3px solid var(--surface);outline-offset:2px}
.spot.hit{opacity:0;transition:opacity 120ms var(--ease-out)}

/* El marcador entero parpadea en rojo cuando revienta la bomba. El numero que sube dice cuanto,
   pero se pierde entre las fichas; esto dice QUE HA PASADO desde el rabillo del ojo. */
.hud-val.boom{animation:boom 420ms var(--ease-out)}
@keyframes boom{
  0%{color:var(--offer);transform:scale(1.25)}
  60%{color:var(--offer);transform:scale(1)}
  100%{color:inherit;transform:scale(1)}
}
.float.boom{font-size:24px}
@media (prefers-reduced-motion:reduce){
  .hud-val.boom{animation:none}
}

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
/* El podio. Tres filas y ya: es un marcador de bar, no una liga. */
.podio{width:100%;max-width:340px;margin:var(--s3) 0 0;display:grid;gap:4px;text-align:left}
.podio[hidden]{display:none}
.fila{
  display:flex;align-items:center;gap:9px;
  padding:7px 11px;border-radius:var(--r-pill);
  background:color-mix(in srgb,var(--surface) 10%,transparent);
  font-family:var(--title-font);font-size:15px;
}
/* El puesto en curso, marcado. Sin esto, en una pantalla con tres filas iguales hay que leer
   los numeros para saber cual es la tuya. */
.fila.tuya{background:var(--offer);color:var(--surface)}
.fila .pos{width:1.1em;opacity:.55;font-weight:600;font-variant-numeric:tabular-nums}
.fila .pts{font-weight:800;font-variant-numeric:tabular-nums;min-width:2.4em}
.fila .quien{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font-weight:600}
.fila .quien.anon{opacity:.5;font-weight:400}

/* El formulario de quien acaba de entrar en el podio. */
.fichar{width:100%;max-width:340px;margin:var(--s3) 0 0;display:grid;gap:var(--s2)}
.fichar[hidden]{display:none}
.fichar input,.fichar select{
  width:100%;min-height:48px;padding:0 14px;
  border-radius:var(--r-pill);border:0;
  background:var(--surface);color:var(--ink);
  font-family:var(--title-font);font-size:16px;font-weight:600;
}
.fichar select{appearance:none;padding-right:38px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6l6 -6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 13px center;background-size:17px}
.fichar .par{display:flex;gap:var(--s2)}
.fichar .par button{flex:1}
.saltar{background:none;border:0;color:var(--surface);opacity:.6;
  font-family:var(--title-font);font-size:15px;font-weight:600;min-height:48px;cursor:pointer}

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
  <!-- El record de la casa, colgado del marco. Lo rellena pintarRecord(); mientras no haya
       marca no se pinta y la portada queda como si esto no existiera. -->
  <div class="marcador" id="marcador" hidden aria-hidden="true"></div>

  <!-- 1. portada -->
  <section class="screen" id="s-intro">
    <div class="mascota" aria-hidden="true">
      <img src="assets/chilirush.webp" width="89" height="126" alt="" decoding="async">
    </div>
    <h1>Chilli <em>Rush</em></h1>

    <!-- Lo que vale cada ficha. Sustituye a la frase de las reglas: el mismo dibujo y el mismo
         color que en el tablero, y al lado lo que suma o resta. El numero no se traduce; el
         rotulo hablado de cada una va en su aria-label. -->
    <div class="puntos">
      <span class="punto" data-t="chilli"${TL('Chilli, one point')}>
        <span class="ficha">${PEPPER}</span><span class="val">+1</span></span>
      <span class="punto" data-t="gold"${TL('Golden chilli, three points')}>
        <span class="ficha">${PEPPER}</span><span class="val">+3</span></span>
      <span class="punto" data-t="ice"${TL('Ice, minus two points')}>
        <span class="ficha">${ICE}</span><span class="val">&#8722;2</span></span>
      <span class="punto" data-t="bomb"${TL('Bomb, back to zero')}>
        <span class="ficha">${BOMB}</span><span class="val">0</span></span>
    </div>
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
        <!-- Los otros dos numeros llevan su rotulo escrito encima; este va solo porque es el
             que se mira de reojo. Sin aria-label, un lector de pantalla lee un numero suelto. -->
        <span class="hud-val" id="score"${TL('Score')}>0</span>
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

    <!-- quien acaba de entrar en el podio se pone nombre. Sale ya con la marca guardada:
         si cierra la pestana sin rellenarlo, la marca esta y sale sin nombre. -->
    <form class="fichar" id="fichar" hidden>
      <input id="f-nombre" type="text" maxlength="12" autocomplete="off"
             placeholder="${TL_TXT('Your name')}"${TL('Your name')}>
      <select id="f-pais"${TL('Where are you from?')}>
        ${opcionesPais}
      </select>
      <div class="par">
        <button class="big-btn" type="submit">${T('Save', 'ui')}</button>
        <button class="saltar" id="f-saltar" type="button">${T('Skip', 'ui')}</button>
      </div>
    </form>

    <div class="podio" id="podio" hidden></div>

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
  /* ---- idioma ----
     El juego NO tiene selector: hereda el de la carta y no se puede cambiar aqui. Ver setLang
     y el arranque del final del fichero. */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-es]').forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.textContent;
      el.textContent = el.dataset[lang] !== undefined ? el.dataset[lang] : el.dataset.en;
    });
    /* Los aria-label tambien viajan. TL() deja el ingles en el atributo y las traducciones en
       data-<idioma>-label; sin esto, quien juega en aleman con lector de pantalla oye las
       etiquetas del formulario en ingles. */
    document.querySelectorAll('[data-es-label]').forEach(function (el) {
      if (el.dataset.enLabel === undefined) {
        el.dataset.enLabel = el.getAttribute('aria-label') || '';
      }
      var v = el.dataset[lang + 'Label'];
      el.setAttribute('aria-label', v !== undefined ? v : el.dataset.enLabel);
    });
    document.title = TITLE[lang] || TITLE.en;
    try { localStorage.setItem('${CLAVE('lang')}', lang); } catch (e) {}
    pintarTextosDinamicos();
  }

  /* ---- estado del restaurante ----
     El mismo estado.json que la carta, y aparte el récord de la casa, que vive en su propio
     record.json. Si no llega ninguno de los dos se juega igual: entretener al que espera no
     depende de que el servidor conteste. */
  var CFG = { on: false, top: [] };   // top: [{puntos, nombre, pais}], ya ordenado

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

  /* El récord va en su propia petición y no dentro de estado.json: ahí están los agotados y los
     precios, y el endpoint público que escribe el récord no puede tocar eso ni por accidente.

     Dos sitios y un orden. Primero el fichero plano, que no cuesta PHP; si no trae marca -no
     existe, o la raiz del servidor no deja escribirlo- se pregunta al endpoint, que lee el
     marcador de dentro de admin/. Sin este segundo intento, un restaurante con record en el
     panel abria la portada sin cartel y la marca solo salia al acabar una partida, que es
     cuando llega en la respuesta del POST. */
  function pedirRecord() {
    return fetch('record.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return leerTop(j); })
      .catch(function () { return []; })
      .then(function (top) {
        if (top.length) return top;
        return fetch('admin/record.php?t=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { return leerTop(j); })
          .catch(function () { return []; });
      })
      .then(function (top) { CFG.top = top; pintarRecord(); });
  }
  pedirRecord();

  /* El marcador que viene del servidor. Un record.json de la version de un solo record se lee
     como un podio de uno, asi que el restaurante que ya tenia marca no la pierde. */
  function leerTop(j) {
    if (!j) return [];
    if (+j.puntos > 0) return [{ puntos: +j.puntos, nombre: '', pais: '' }];
    return (j.top || []).filter(function (x) { return x && +x.puntos > 0; })
      .map(function (x) {
        return { puntos: +x.puntos, nombre: String(x.nombre || ''),
                 pais: String(x.pais || '') };
      }).slice(0, 3);
  }

  /* El cartel colgado del marco. Solo el numero uno: en la portada no cabe un podio y tampoco
     hace falta — lo que se quiere saber antes de jugar es contra cuanto se juega. Se rehace entero cada vez —no se parchea— para que llamarlo
     dos veces de el mismo resultado; es la misma regla que sigue render() en la carta.

     Sin marca todavia no se pinta nada: un cartel que dijera «Record: 0» se lee como una averia,
     y ademas la portada sin el queda exactamente como estaba antes de que existiera. */
  function pintarRecord() {
    var el = document.getElementById('marcador');
    if (!el) return;
    var uno = CFG.top[0];
    if (!uno) { el.hidden = true; el.innerHTML = ''; return; }
    /* Se pinta siempre, pero solo se ensena en la portada. Sin esto, la llamada que hace
       mandarMarca() al acabar una partida lo colgaria encima de la pantalla del resultado,
       justo sobre el podio. */
    var enPortada = !document.getElementById('s-intro').hidden;
    el.innerHTML =
      '<span class="cables"><span></span><span></span></span>'
      + '<span class="placa">'
      +   '<span class="rot">' + escapar(tr('Record')) + '</span>'
      +   '<span class="n">' + uno.puntos + '</span>'
      +   (uno.nombre || uno.pais
            ? '<span class="quien"><span>' + escapar(uno.nombre) + '</span>'
              + bandera(uno.pais) + '</span>'
            : '')
      + '</span>';
    el.hidden = !enPortada;
  }

  /* Un nombre lo escribe un desconocido: aqui se pinta como TEXTO y nunca como HTML. El
     servidor ya lo limpia, pero el que pinta es el ultimo que puede evitar un <script>. */
  function escapar(t) {
    var d = document.createElement('span');
    d.textContent = t;
    return d.innerHTML;
  }

  function bandera(cod) {
    if (!cod) return '';
    return ' <img class="bandera" src="assets/banderas/' + encodeURIComponent(cod)
      + '.webp" width="20" height="15" alt="" decoding="async">';
  }

  /* El podio de la pantalla de fin. «mio» es el puesto que acaba de hacer quien esta mirando,
     o -1: sin eso, tres filas iguales obligan a leer los numeros para encontrarse. */
  function pintarPodio(mio) {
    var caja = document.getElementById('podio');
    if (!caja) return;
    if (!CFG.top.length) {
      caja.hidden = true;
      return;
    }
    caja.innerHTML = CFG.top.map(function (x, i) {
      var quien = x.nombre
        ? '<span class="quien">' + escapar(x.nombre) + '</span>'
        : '<span class="quien anon">—</span>';
      return '<div class="fila' + (i === mio ? ' tuya' : '') + '">'
        + '<span class="pos">' + (i + 1) + '</span>'
        + '<span class="pts">' + x.puntos + '</span>'
        + quien + bandera(x.pais) + '</div>';
    }).join('');
    caja.hidden = false;
  }

  function pintarTextosDinamicos() {
    pintarRecord();
    /* El placeholder no admite ni span ni atributo traducible, asi que se reescribe aqui. El
       HTML estatico lo lleva en el idioma de la casa, que es lo que ve quien no tiene JS. */
    var inNombre = document.getElementById('f-nombre');
    if (inNombre) inNombre.placeholder = tr('Your name');
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

  /* ---- el marcador de la casa ----

     Se manda al acabar y SIN nombre: si el jugador cierra la pestana mientras piensa como se
     llama, la marca ya esta guardada. Si ha entrado en el podio, la respuesta trae un «id» y
     con el se le pone nombre despues, en una segunda llamada.

     Con una sola llamada al pulsar «Guardar», el que cierra la pestana pierde el record. */
  var miId = '';
  var miPuesto = -1;                 // el puesto que dio el servidor al mandar la marca

  function mandarMarca(p) {
    if (!CFG.on || !(p > 0)) return Promise.resolve(-1);
    var fd = new FormData();
    fd.append('puntos', String(p));
    return fetch('admin/record.php', { method: 'POST', body: fd,
                                          cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return -1;
        CFG.top = leerTop(j);
        miId = j.id || '';
        pintarRecord();
        /* El puesto lo dice el servidor, que es el unico que sabe cual de las filas es la de
           esta partida. Buscarlo por puntuacion senalaba la fila equivocada cuando el podio
           tiene dos marcas iguales, y el empate no desbanca: pasa a menudo. */
        if (!miId) return -1;
        return typeof j.pos === 'number' ? j.pos : -1;
      })
      .catch(function () { return -1; });
  }

  /* La segunda llamada, la del nombre. Si falla no se avisa: la marca ya esta puesta y lo unico
     que se pierde es el nombre, que no vale una pantalla de error en mitad de un juego. */
  function fichar(nombre, pais) {
    if (!miId) return Promise.resolve();
    var fd = new FormData();
    fd.append('id', miId);
    fd.append('nombre', nombre);
    fd.append('pais', pais);
    return fetch('admin/record.php', { method: 'POST', body: fd,
                                          cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) { CFG.top = leerTop(j); pintarRecord(); } })
      .catch(function () {});
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
    /* El cartel del record cuelga del marco y no de la portada, asi que hay que bajarlo a mano:
       si no, se queda colgado encima del tablero durante la partida, justo en la esquina por
       donde salen los chiles. Vuelve solo al volver a la portada, y solo si hay marca. */
    var cartel = document.getElementById('marcador');
    if (cartel) cartel.hidden = (id !== 's-intro') || !CFG.top[0];
  }

  function limpiarTablero() {
    vivos.forEach(function (o) { clearTimeout(o.t); if (o.el.parentNode) o.el.remove(); });
    vivos = [];
    [].slice.call(board.querySelectorAll('.float')).forEach(function (f) { f.remove(); });
  }

  /* Dificultad: el ritmo sube y la vida de cada chile baja a lo largo de los 30 segundos.
     Empieza regalado —el primer toque tiene que ocurrir sin pensar— y acaba apretando. */
  /* Un 10% mas lento que la primera version: sale mas suelto y aprieta igual al final. Las dos
     curvas se estiran a la vez — solo el hueco entre fichas dejaria la pantalla llena, y solo la
     vida las haria salir igual de rapido pero durar mas. */
  function intervalo(prog) { return 682 - 330 * prog; }        // 682ms -> 352ms
  function vida(prog) { return 1650 - 715 * prog; }            // 1.65s -> 0.94s

  /* El nombre hablado de cada ficha. Son las mismas cuatro frases que la portada pone bajo el
     titulo, asi que quien no ve los iconos oye en el tablero lo mismo que leyo antes de jugar.
     Antes decia 'gold' o 'bomb' a secas: ingles, y ademas sin decir lo que valen. */
  var ETIQUETA = {
    chilli: 'Chilli, one point', gold: 'Golden chilli, three points',
    ice: 'Ice, minus two points', bomb: 'Bomb, back to zero',
  };

  function tipo(prog) {
    var r = Math.random();
    /* La bomba, primera y con banda propia. Un 5% al principio y un 8% al final: en una partida
       salen dos o tres. No hace falta mas, porque no es mala suerte — se ve venir, es la ficha
       mas grande de todas, y tocarla es una decision. */
    if (r < 0.05 + 0.03 * prog) return 'bomb';
    if (r < 0.13 + 0.08 * prog) return 'gold';                 // raro, y algo menos raro al final
    if (r < 0.31 + 0.17 * prog) return 'ice';                  // el hielo aparece más según aprieta
    return 'chilli';
  }

  function soltar() {
    if (!seEstaJugando) return;
    var prog = 1 - restante / DURACION;
    var t = tipo(prog);
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'spot' + (t === 'chilli' ? '' : ' ' + t);
    el.innerHTML = t === 'ice' ? ${JSON.stringify(ICE)}
                 : t === 'bomb' ? ${JSON.stringify(BOMB)}
                 : ${JSON.stringify(PEPPER)};
    el.setAttribute('aria-label', tr(ETIQUETA[t] || ETIQUETA.chilli));
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
    /* La bomba no resta: vacia. El delta que se ensena es lo que se acaba de perder, que es la
       unica cifra que importa en ese momento — un '-2' generico no diria nada. */
    var delta = t === 'bomb' ? -puntos : t === 'gold' ? 3 : t === 'ice' ? -2 : 1;
    puntos = Math.max(0, puntos + delta);
    elScore.textContent = puntos;
    elScore.classList.remove('pop', 'boom');
    void elScore.offsetWidth;
    elScore.classList.add(t === 'bomb' ? 'boom' : 'pop');

    /* La bomba corta la racha siempre. Con la puntuacion a cero el delta sale -0, que no es
       menor que cero, y la racha seguia subiendo despues de tocar una bomba. */
    racha = (delta < 0 || t === 'bomb') ? 0 : racha + 1;
    elRacha.textContent = racha;
    if (delta > 0) { elRacha.classList.remove('pop'); void elRacha.offsetWidth; elRacha.classList.add('pop'); }

    /* La ficha está en movimiento: el +1 sale de donde está ahora, no de donde nació. */
    var rb = board.getBoundingClientRect(), re = o.el.getBoundingClientRect();
    var f = document.createElement('span');
    f.className = 'float' + (delta < 0 ? ' bad' : '') + (t === 'bomb' ? ' boom' : '');
    f.textContent = t === 'bomb' && delta === 0 ? '0' : (delta > 0 ? '+' : '') + delta;
    f.style.left = (re.left - rb.left + re.width / 2) + 'px';
    f.style.top = (re.top - rb.top + re.height / 2) + 'px';
    board.appendChild(f);
    setTimeout(function () { f.remove(); }, 560);

    o.el.classList.add('hit');
    clearTimeout(o.t);
    var i = vivos.indexOf(o);
    if (i >= 0) vivos.splice(i, 1);
    setTimeout(function () { if (o.el.parentNode) o.el.remove(); }, 140);

    /* Tres golpes para la bomba. Es lo unico que se puede sentir sin mirar, y perderlo todo
       merece enterarse aunque se este mirando otra ficha. */
    if (navigator.vibrate) {
      try { navigator.vibrate(t === 'bomb' ? [40, 60, 40] : delta < 0 ? 30 : 8); } catch (e) {}
    }
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

    var ceja = document.getElementById('end-eyebrow');
    var form = document.getElementById('fichar');
    ceja.textContent = tr('Your score');
    ceja.classList.remove('eyebrow-record');
    document.getElementById('end-score').textContent = puntos;
    form.hidden = true;
    miId = '';
    miPuesto = -1;
    pintarTextosDinamicos();
    pintarPodio(-1);
    pantalla('s-end');

    /* La pantalla ya esta puesta y la marca viaja despues: primero se ve la puntuacion y luego,
       si toca, aparece el formulario. Al reves el jugador espera al servidor mirando el tablero
       vacio. */
    mandarMarca(puntos).then(function (puesto) {
      if (seEstaJugando) return;                 // ya ha empezado otra: no se pisa la pantalla
      miPuesto = puesto;
      pintarPodio(puesto);
      if (puesto < 0) return;
      ceja.textContent = tr('New record!');
      ceja.classList.add('eyebrow-record');
      form.hidden = false;
      document.getElementById('f-nombre').focus({ preventScroll: true });
    });
  }
  var tCuenta = null;

  function cuentaAtras() {
    pantalla('s-count');
    var el = document.getElementById('count');
    var n = 3;
    el.textContent = n;
    el.classList.add('tick');
    clearInterval(tCuenta);
    var iv = tCuenta = setInterval(function () {
      n -= 1;
      if (n <= 0) { clearInterval(iv); tCuenta = null; empezar(); return; }
      el.textContent = n;
      el.classList.remove('tick');
      void el.offsetWidth;
      el.classList.add('tick');
    }, 700);
  }

  document.getElementById('btn-play').addEventListener('click', cuentaAtras);

  /* El formulario del podio. Guardar y Saltar hacen lo mismo con la pantalla —esconderla— y
     solo se diferencian en si mandan el nombre. */
  function cerrarFichar() {
    document.getElementById('fichar').hidden = true;
  }
  document.getElementById('fichar').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = document.getElementById('f-nombre').value;
    var c = document.getElementById('f-pais').value;
    cerrarFichar();
    fichar(n, c).then(function () {
      /* Se repinta buscando el nombre recien puesto: el puesto pudo cambiar mientras escribia.
         El servidor puede devolver otro nombre —lo recorta a doce y vacia los feos—, y entonces
         no hay nada que casar: se cae al puesto que ya dio al guardar la marca. */
      var mio = -1;
      for (var i = 0; i < CFG.top.length; i++) {
        if (CFG.top[i].nombre === n.trim() && CFG.top[i].puntos === puntos) mio = i;
      }
      if (mio < 0 && miPuesto >= 0 && CFG.top[miPuesto]
          && CFG.top[miPuesto].puntos === puntos) mio = miPuesto;
      pintarPodio(mio);
    });
  });
  document.getElementById('f-saltar').addEventListener('click', cerrarFichar);
  document.getElementById('btn-again').addEventListener('click', cuentaAtras);

  // salir de la pestaña a mitad de partida no debe dejar el marcador corriendo solo
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) return;
    if (seEstaJugando) { terminar(); return; }
    /* Y si se va durante el 3-2-1, la cuenta se cancela y se vuelve a la portada. Dejandola
       correr, la partida empezaba con la pestana escondida y el jugador volvia a un tablero
       a medias o a una pantalla de resultado que no habia jugado. */
    if (tCuenta) { clearInterval(tCuenta); tCuenta = null; pantalla('s-intro'); }
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
