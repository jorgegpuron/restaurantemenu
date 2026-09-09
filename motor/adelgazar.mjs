/* Quita de lo COMPILADO los comentarios y el sangrado del CSS y del JavaScript que van dentro
 * del documento. No toca el fuente: aquí se sigue escribiendo con todas las explicaciones, que
 * son la mitad del valor de este proyecto; lo que viaja al móvil no las necesita.
 *
 * Son unos 90 KB de 780. No es tanto por lo que se ahorra en la descarga —comprimido son 15 KB—
 * como por lo que se ahorra en LEERLO: en un móvil de gama media el análisis del documento es
 * parte de lo que retrasa la primera pintada, y esos 90 KB se analizan siempre.
 *
 * NO es un minificador: no renombra variables, no reordena, no toca la sintaxis. Sólo borra lo
 * que no se ejecuta. Un minificador de verdad haría más y traería una dependencia; este build
 * no tiene ninguna y no la va a tener por 15 KB.
 *
 * El JavaScript se recorre como una máquina de estados y no con expresiones regulares, porque
 * en este código hay expresiones regulares literales (/\.[^.]+$/), cadenas con // dentro
 * (https://...) y plantillas con ${} anidados: un limpiador a base de buscar y reemplazar los
 * rompe en silencio, que es la peor manera de romper algo.
 */

/* Devuelve true si, en la posición i, una barra abre una expresión regular y no una división.
   Se mira el último carácter con significado que hay detrás: después de un valor —un nombre, un
   número, un paréntesis o un corchete que cierran— la barra es división; después de cualquier
   otra cosa, es una expresión regular. */
function esRegex(js, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(js[j])) j--;
  if (j < 0) return true;
  const c = js[j];
  if (c === ')' || c === ']') return false;
  if (/[A-Za-z0-9_$]/.test(c)) {
    /* Una palabra: si es una palabra clave, lo que sigue es una expresión regular
       (return /x/), y si es un identificador, es una división (a / b). */
    let k = j;
    while (k >= 0 && /[A-Za-z0-9_$]/.test(js[k])) k--;
    const palabra = js.slice(k + 1, j + 1);
    return ['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
            'case', 'do', 'else', 'yield', 'await'].includes(palabra);
  }
  return true;
}

/* El NUCLEO: recorre el JavaScript y devuelve lo mismo SIN los comentarios. No toca nada
   mas —ni el sangrado, ni los blancos, ni la sintaxis—, y por eso lo puede usar tanto el
   adelgazado completo de los documentos publicos como el del panel, que solo puede quitar
   comentarios. Un solo recorrido, un solo sitio donde equivocarse. */
export function sinComentariosJS(js) {
  let out = '';
  let i = 0;
  const n = js.length;
  /* Pila de plantillas: dentro de `...` un ${ abre código normal otra vez, y hay que saber
     cuándo su } vuelve a la plantilla. */
  const plantillas = [];
  let llaves = 0;

  while (i < n) {
    const c = js[i];
    const d = js[i + 1];

    // comentario de línea
    if (c === '/' && d === '/') {
      while (i < n && js[i] !== '\n') i++;
      continue;
    }
    // comentario de bloque
    if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(js[i] === '*' && js[i + 1] === '/')) i++;
      i += 2;
      /* Un comentario entre dos cosas no puede desaparecer sin dejar rastro: `a/*c* /b` es
         `a b`, no `ab`. Se deja un espacio y ya lo recoge el aplastado de blancos. */
      out += ' ';
      continue;
    }
    // cadena
    if (c === '"' || c === "'") {
      out += c; i++;
      while (i < n) {
        if (js[i] === '\\') { out += js[i] + (js[i + 1] || ''); i += 2; continue; }
        out += js[i];
        if (js[i] === c) { i++; break; }
        i++;
      }
      continue;
    }
    // plantilla
    if (c === '`') {
      out += c; i++;
      plantillas.push(llaves);
      while (i < n) {
        if (js[i] === '\\') { out += js[i] + (js[i + 1] || ''); i += 2; continue; }
        if (js[i] === '`') { out += js[i]; i++; plantillas.pop(); break; }
        if (js[i] === '$' && js[i + 1] === '{') { out += '${'; i += 2; llaves++; break; }
        out += js[i]; i++;
      }
      continue;
    }
    if (c === '}' && plantillas.length && llaves === plantillas[plantillas.length - 1] + 1) {
      /* Se cierra el ${...} y se vuelve a la plantilla */
      out += c; i++; llaves--;
      while (i < n) {
        if (js[i] === '\\') { out += js[i] + (js[i + 1] || ''); i += 2; continue; }
        if (js[i] === '`') { out += js[i]; i++; plantillas.pop(); break; }
        if (js[i] === '$' && js[i + 1] === '{') { out += '${'; i += 2; llaves++; break; }
        out += js[i]; i++;
      }
      continue;
    }
    if (c === '{') { llaves++; out += c; i++; continue; }
    if (c === '}') { llaves--; out += c; i++; continue; }
    // expresión regular literal
    if (c === '/' && esRegex(js, i)) {
      out += c; i++;
      let enClase = false;
      while (i < n) {
        if (js[i] === '\\') { out += js[i] + (js[i + 1] || ''); i += 2; continue; }
        if (js[i] === '[') enClase = true;
        else if (js[i] === ']') enClase = false;
        else if (js[i] === '/' && !enClase) { out += js[i]; i++; break; }
        out += js[i]; i++;
      }
      while (i < n && /[a-z]/.test(js[i])) { out += js[i]; i++; }   // banderas
      continue;
    }
    out += c; i++;
  }
  return out;
}

/* Y el adelgazado de siempre: el nucleo mas el aplastado del sangrado. Byte a byte lo que
   daba antes de separarlo. */
export function adelgazarJS(js) {
  return aplastar(sinComentariosJS(js));
}

/* Aplasta el sangrado y las líneas en blanco SIN juntar líneas: en JavaScript, unir dos líneas
   puede cambiar lo que hace el programa por culpa del punto y coma automático. Se conserva un
   salto de línea por cada grupo, y se quita todo lo demás. */
function aplastar(js) {
  return js
    .split('\n')
    .map((l) => l.replace(/[\t ]+$/, '').replace(/^[\t ]+/, ''))
    .filter((l) => l !== '')
    .join('\n');
}

/* El CSS no tiene ni expresiones regulares ni punto y coma automático: se puede aplastar más.
   Lo único que hay que respetar son las cadenas —content:"..."— y las url(). */
/* El NUCLEO del CSS, con el mismo criterio que el del JavaScript.
   `espacio` decide que se deja donde habia un comentario. El adelgazado completo NO deja nada
   —es lo que hacia antes, y detras viene el aplastado de blancos que lo arreglaria igual—; el
   del panel SI, porque ahi no viene ningun aplastado detras: un comentario metido en medio de
   un valor —«margin:1px», comentario, «2px»— se convertiria en `margin:1px2px` si no se deja
   nada donde estaba, que es romper una hoja de estilos en silencio. */
export function sinComentariosCSS(css, { espacio = false } = {}) {
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      i += 2;
      while (i < n && !(css[i] === '*' && css[i + 1] === '/')) i++;
      i += 2;
      if (espacio) out += ' ';
      continue;
    }
    if (c === '"' || c === "'") {
      out += c; i++;
      while (i < n) {
        if (css[i] === '\\') { out += css[i] + (css[i + 1] || ''); i += 2; continue; }
        out += css[i];
        if (css[i] === c) { i++; break; }
        i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/* El adelgazado completo del CSS: el nucleo mas los blancos. Lo de siempre. */
export function adelgazarCSS(css) {
  const out = sinComentariosCSS(css);
  /* Blancos: uno solo donde hacen falta —entre selectores y dentro de valores— y ninguno
     alrededor de la puntuación. El espacio SÍ importa en los combinadores descendentes
     (.a .b) y dentro de calc(), así que no se quita entre palabras. */
  return out
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    /* Los dos puntos: sólo se aprieta el de las declaraciones, no el de :hover ni :not(). Se
       reconoce porque va seguido de un valor y precedido de una propiedad dentro de un bloque;
       más barato y más seguro es dejarlos como están. */
    .replace(/;\}/g, '}')
    .trim();
}

/* ------------------------------------------------------------------ el panel del admin
 *
 * El panel se sirve tal cual se escribe: `motor/server/admin/index.php` se copia a
 * `2-subir/admin/index.php` sin pasar por ningun adelgazado, y con el se van al navegador
 * TODOS sus comentarios de CSS y de JavaScript. Medido sobre el arbol de este release:
 * 270.062 bytes que viajan y no ejecutan nada.
 *
 * Aqui se quitan, y SOLO eso. No es el adelgazado de los documentos publicos:
 *
 *   - no se aplasta el sangrado;
 *   - no se tocan los blancos;
 *   - no se toca la sintaxis, ni un punto y coma;
 *   - no se renombra ni se reordena nada;
 *   - todo lo que esta FUERA de <style> y <script> se devuelve byte a byte.
 *
 * Y la regla que manda sobre todas: **un bloque con PHP dentro no se toca.** Ni se interpreta,
 * ni se analiza, ni se decide si "ese PHP parece inofensivo". Basta con que aparezca `<?` o
 * `?>` en el cuerpo para que el bloque salga igual que entro. De los diecisiete bloques del
 * panel, seis lo llevan; esos seis son intocables y sus comentarios se quedan.
 *
 * Se aplica SOBRE LA COPIA que va a 2-subir, nunca sobre el fuente: los comentarios del fuente
 * son documentacion y se quedan donde estan.
 */
const BLOQUES_PANEL = /<style\b[^>]*>([\s\S]*?)<\/style>|<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

export function tienePhp(cuerpo) {
  return cuerpo.includes('<?') || cuerpo.includes('?>');
}

export function adelgazarPanel(html) {
  let tocados = 0;
  let intocables = 0;
  let ahorro = 0;
  const salida = html.replace(BLOQUES_PANEL, (entero, css, js) => {
    const esCss = css !== undefined;
    const cuerpo = esCss ? css : js;
    if (tienePhp(cuerpo)) { intocables++; return entero; }
    const limpio = esCss ? sinComentariosCSS(cuerpo, { espacio: true }) : sinComentariosJS(cuerpo);
    if (limpio === cuerpo) return entero;
    tocados++;
    ahorro += cuerpo.length - limpio.length;
    /* Se reconstruye con la MISMA etiqueta de apertura y de cierre que traia: lo unico que
       cambia del documento es el cuerpo de este bloque. */
    const abre = entero.slice(0, entero.indexOf('>') + 1);
    const cierra = esCss ? '</style>' : entero.slice(entero.lastIndexOf('</'));
    return abre + limpio + cierra;
  });
  return { salida, tocados, intocables, ahorro };
}
