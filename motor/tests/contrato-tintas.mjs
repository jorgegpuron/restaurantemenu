/* ------------------------------------------------------------------ *
 * Contrato del motor de color: la tinta que va ENCIMA de cada fondo
 * ------------------------------------------------------------------ *
 *
 * El mismo calculo vive en cuatro sitios que no comparten codigo, porque son cuatro
 * runtimes distintos:
 *
 *   1. Node          motor/temas.mjs::derivar()                 -- el build
 *   2. carta         derivarPrincipal()/aplicarMarca() de motor/gen.mjs   -- en caliente
 *   3. juego         derivarPrincipal()/aplicarColorPrincipal() de motor/juego.mjs
 *   4. PHP Admin     derivar_principal() de motor/server/admin/index.php
 *
 * Que den lo mismo para el mismo hex no es algo que se pueda mirar leyendo: hay que
 * ejecutarlo. Esta prueba lo ejecuta. No reimplementa nada -- extrae el TEXTO REAL de las
 * funciones de cada fichero y lo evalua, asi que si alguien toca una capa y se olvida de
 * otra, esto falla y el build se para (ver motor/verificar-build.mjs).
 *
 * Ademas de la DERIVACION comprueba la APLICACION: que el token que se calcula bien
 * llegue de verdad al DOM. Un bug real de esta familia ya ocurrio -- --rush-ink se
 * calculaba y se emitia en el build, pero el runtime del juego no lo reescribia al
 * cambiar el color desde el panel, asi que Rush se quedaba en el valor compilado.
 *
 * Sin npm y sin dependencias: solo node:fs, node:path, node:url y node:child_process.
 * PHP es opcional: si no hay binario `php` (GitHub Actions no lo necesita para compilar),
 * se salta esa capa y se dice en el informe, en vez de romper el build.
 *
 * Ejecutar suelto:  node motor/tests/contrato-tintas.mjs
 * Desde cualquier directorio: las rutas salen de import.meta.url, nunca del cwd.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { derivar, PRINCIPAL_DEFECTO, OSCURO, NEUTRO } from '../temas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const MOTOR = join(AQUI, '..');
const NL = String.fromCharCode(10);

/* ---- contraste: copia local, a proposito ----
   Las aserciones no deben usar la misma aritmetica que lo que verifican: si el motor se
   equivocara al calcular contraste, una prueba que reutilice su funcion diria que todo
   esta bien. Estas cuatro lineas son la definicion de WCAG 2.x, escritas aparte. */
const aRGB = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const canal = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const luz = (h) => { const c = aRGB(h).map(canal); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contraste = (a, b) => { const x = luz(a), y = luz(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const UMBRAL = 4.5;
const NEGRO = '#000000';
const BLANCO = '#FFFFFF';
const igual = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();

/* ---- extraer una funcion del fichero fuente y poder ejecutarla ----
   gen.mjs y juego.mjs son plantillas: el JS del navegador vive dentro de un literal. Se
   corta la funcion por llaves equilibradas y se resuelven las interpolaciones que usa. */
function textoFuncion(src, firma) {
  const i = src.indexOf(firma);
  if (i < 0) throw new Error('no encuentro "' + firma + '"');
  let prof = 0, visto = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { prof++; visto = true; }
    else if (src[j] === '}') { prof--; if (visto && prof === 0) return src.slice(i, j + 1); }
  }
  throw new Error('llaves sin cerrar en "' + firma + '"');
}

function resolverInterpolaciones(txt) {
  const fuera = txt.replace(/\$\{JSON\.stringify\(PRINCIPAL(?:_DEFECTO)?\)\}/g, JSON.stringify(PRINCIPAL_DEFECTO));
  if (/\$\{/.test(fuera)) {
    throw new Error('quedan interpolaciones sin resolver: ' + (fuera.match(/\$\{[^}]*\}/) || [''])[0]);
  }
  return fuera;
}

/* Un DOM de mentira que apunta lo que le escriben. Es todo lo que estas funciones
   necesitan del navegador: leer dos tokens y escribir varios. */
function domFalso() {
  const escrito = {};
  const style = { setProperty: (k, v) => { escrito[k] = v; } };
  const raiz = { style };
  const doc = {
    documentElement: raiz,
    querySelector: () => null,
  };
  const cs = () => ({
    getPropertyValue: (n) => (n === '--ink' ? OSCURO : (n === '--surface' ? NEUTRO : '')),
  });
  return { escrito, doc, cs };
}

/* Carga las dos funciones de una capa (derivar + aplicar) ya ejecutables. */
function cargarCapa({ fichero, firmaDerivar, firmaAplicar, extra = '' }) {
  const src = readFileSync(join(MOTOR, fichero), 'utf8');
  const cuerpo = resolverInterpolaciones(
    textoFuncion(src, firmaDerivar) + NL + textoFuncion(src, firmaAplicar),
  );
  const nombreDerivar = firmaDerivar.match(/function (\w+)/)[1];
  const nombreAplicar = firmaAplicar.match(/function (\w+)/)[1];
  const fabrica = new Function('document', 'getComputedStyle', extra + NL + cuerpo + NL
    + 'return { derivar: ' + nombreDerivar + ', aplicar: ' + nombreAplicar + ' };');
  return (dom) => fabrica(dom.doc, dom.cs);
}

/* Que tokens de tinta USA de verdad el CSS de cada pagina. Si una pagina consume un token
   que su runtime no reescribe, el color cambiado desde el panel se queda a medias -- ese
   es el bug que esta comprobacion existe para cazar. */
function tokensUsados(fichero) {
  const src = readFileSync(join(MOTOR, fichero), 'utf8');
  const usados = new Set();
  for (const t of ['--accent-ink', '--badge-ink', '--metal-ink', '--rush-ink']) {
    if (src.includes('var(' + t + ')')) usados.add(t);
  }
  return usados;
}

function tokensEscritos(fichero, firmaAplicar) {
  const src = readFileSync(join(MOTOR, fichero), 'utf8');
  const txt = textoFuncion(src, firmaAplicar);
  return new Set([...txt.matchAll(/setProperty\('(--[a-z-]+)'/g)].map((m) => m[1]));
}

/* ---- PHP: la funcion real del panel, no una copia ----
   index.php arranca el panel entero al incluirlo, asi que se extraen solo las funciones de
   color y se evaluan con `php -r`. */
function phpDisponible() {
  try { execFileSync('php', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; }
}

function phpDerivar(hex) {
  const src = readFileSync(join(MOTOR, 'server/admin/index.php'), 'utf8');
  const trozos = [];
  for (const n of ['color_aRGB', 'color_canal', 'color_luz', 'color_contraste', 'color_mezcla', 'derivar_principal']) {
    const m = src.match(new RegExp('function ' + n + '\\s*\\([\\s\\S]*?' + NL + '\\}', 'm'));
    if (!m) throw new Error('no encuentro la funcion PHP ' + n);
    trozos.push(m[0]);
  }
  const script = trozos.join(NL) + NL
    + "$r = derivar_principal('" + hex.replace(/'/g, '') + "');"
    + 'echo $r === null ? "null" : json_encode($r);';
  const salida = execFileSync('php', ['-r', script], { encoding: 'utf8' }).trim();
  return salida === 'null' ? null : JSON.parse(salida);
}

/* ---- los casos ---- */
const CASOS = [
  { hex: PRINCIPAL_DEFECTO, nota: 'naranja de fabrica (el de cliente.mjs)' },
  { hex: PRINCIPAL_DEFECTO, nota: 'naranja de fabrica escrito a mano en estado.json', desdeEstado: true },
  { hex: '#F2C744', nota: 'amarillo claro' },
  { hex: '#1A2E1A', nota: 'verde muy oscuro' },
  { hex: '#2E5AAC', nota: 'azul medio' },
  { hex: '#777777', nota: 'gris medio: las dos tintas del sistema fallan' },
];

/* Rejilla reproducible: 6 valores por canal (216 colores) mas un barrido fino del gris,
   que es donde vive el hueco en el que ninguna tinta del sistema llega. Rapido y
   determinista -- ni aleatorio ni los 16 millones. */
function coloresDelBarrido() {
  const dos = (n) => (n < 16 ? '0' : '') + n.toString(16);
  const fuera = [];
  const paso = [0, 51, 102, 153, 204, 255];
  for (const r of paso) for (const g of paso) for (const b of paso) fuera.push('#' + dos(r) + dos(g) + dos(b));
  for (let v = 96; v <= 160; v += 1) fuera.push('#' + dos(v) + dos(v) + dos(v));
  return fuera;
}

/* ------------------------------------------------------------------ *
 * La prueba
 * ------------------------------------------------------------------ */
export function contratoTintas({ verboso = false, exigirPHP = true } = {}) {
  const fallos = [];
  const lineas = [];
  const di = (s) => { if (verboso) console.log(s); lineas.push(s); };
  const mal = (s) => { fallos.push(s); di('  FALLO  ' + s); };
  const ok = (etiqueta, detalle) => di('  ok     ' + etiqueta + (detalle ? '  ' + detalle : ''));
  const comprobar = (cond, etiqueta, detalle) => (cond ? ok(etiqueta, detalle) : mal(etiqueta + ' -- ' + detalle));

  const conPHP = phpDisponible();

  /* PHP NO es opcional por defecto. El panel es una de las cuatro capas que calculan la
     tinta, y es la unica que ademas RECHAZA colores al guardar: si diverge, el
     restaurante puede guardar desde Admin un color que el build considera ilegible (o al
     reves) y nadie se entera hasta que la carta esta publicada. Saltarse esa capa "porque
     no hay binario" convertiria la puerta en un aviso, y en CI un aviso no para nada.
     Asi que sin php: fallo, y el verificador corta el despliegue.
     El escape manual (exigirPHP:false, o --sin-php por linea de comandos) existe solo
     para diagnosticar en un portatil sin PHP instalado: verificar-build NUNCA lo usa. */
  if (!conPHP) {
    const queja = 'no se ha podido comprobar la capa PHP del panel: no hay binario `php` '
      + 'en el PATH. El contrato de las cuatro capas no se puede dar por bueno sin ella '
      + '-- instala PHP o, SOLO para diagnostico local, ejecuta la prueba suelta con '
      + '--sin-php (el verificador y el despliegue no admiten esa via).';
    if (exigirPHP) mal(queja);
    else di('  AVISO  modo diagnostico --sin-php: ' + queja);
  }

  const carta = cargarCapa({
    fichero: 'gen.mjs',
    firmaDerivar: 'function derivarPrincipal(hex)',
    firmaAplicar: 'function aplicarMarca(marca)',
    /* aplicarMarca toca el rotulo y el nombre; sin panel real, vacios. */
    extra: 'var MARCA_DEF_NOMBRE = null, MARCA_DEF_ROTULO = null, IDIOMAS = [];',
  });
  const juego = cargarCapa({
    fichero: 'juego.mjs',
    firmaDerivar: 'function derivarPrincipal(hex)',
    firmaAplicar: 'function aplicarColorPrincipal(marca)',
  });

  di('');
  di('CONTRATO DE TINTAS -- Node + carta + juego'
    + (conPHP ? ' + PHP' : (exigirPHP ? ' + PHP  <-- FALTA: sin binario php, contrato NO verificable'
      : ' (PHP omitido a mano: modo diagnostico)')));
  di('='.repeat(76));

  /* ---- 1. cobertura: lo que cada pagina USA, su runtime lo ESCRIBE ---- */
  di('');
  di('COBERTURA -- que cada token consumido se reescriba al cambiar el color');
  for (const [nombre, fichero, firma] of [
    ['carta', 'gen.mjs', 'function aplicarMarca(marca)'],
    ['juego', 'juego.mjs', 'function aplicarColorPrincipal(marca)'],
  ]) {
    const usa = tokensUsados(fichero);
    const escribe = tokensEscritos(fichero, firma);
    const huerfanos = [...usa].filter((t) => !escribe.has(t));
    comprobar(huerfanos.length === 0,
      nombre + ': todo token de tinta que usa, lo reescribe',
      'usa {' + [...usa].join(', ') + '} escribe {' + [...escribe].filter((t) => t.endsWith('-ink')).join(', ') + '}'
      + (huerfanos.length ? ' -- SIN REESCRIBIR: ' + huerfanos.join(', ') : ''));
  }

  /* ---- 2. los casos, capa a capa ---- */
  for (const { hex, nota, desdeEstado } of CASOS) {
    const t = derivar(hex);
    const esFabrica = igual(hex, PRINCIPAL_DEFECTO);

    di('');
    di(hex + '  -- ' + nota);
    di('  acento contra las dos tintas del sistema:  ' + OSCURO + ' = ' + contraste(OSCURO, hex).toFixed(4)
      + '   ' + NEUTRO + ' = ' + contraste(NEUTRO, hex).toFixed(4));

    /* 2a. DERIVACION: las capas coinciden */
    const domC = domFalso(), domJ = domFalso();
    const capaC = carta(domC), capaJ = juego(domJ);
    const dC = capaC.derivar(hex);
    const dJ = capaJ.derivar(hex);
    const dP = conPHP ? phpDerivar(hex) : null;

    const filas = [
      ['accent-ink', t['--accent-ink'], dC && dC.accentInk, dJ && dJ.accentInk, dP && dP['--accent-ink']],
      ['metal', t['--metal'], dC && dC.metal, dJ && dJ.metal, dP && dP['--metal']],
      ['metal-ink', t['--metal-ink'], undefined, dJ && dJ.metalInk, dP && dP['--metal-ink']],
      ['badge-ink', t['--badge-ink'], dC && dC.badgeInk, undefined, dP && dP['--badge-ink']],
      /* rush-ink NO se calcula en PHP a proposito: el panel no pinta Rush. */
      ['rush-ink', t['--rush-ink'], undefined, dJ && dJ.rushInk, undefined],
    ];
    for (const [token, vNode, vCarta, vJuego, vPHP] of filas) {
      const vistos = [['Node', vNode], ['carta', vCarta], ['juego', vJuego], ['PHP', vPHP]]
        .filter(([, v]) => v !== undefined && !(v === null && !conPHP));
      const valores = [...new Set(vistos.map(([, v]) => String(v).toUpperCase()))];
      comprobar(valores.length === 1, token + ': misma respuesta en las capas que lo calculan',
        vistos.map(([k, v]) => k + '=' + v).join(' '));
    }

    /* 2b. APLICACION: lo calculado llega al DOM.
       Se llama a la funcion REAL de cada pagina con un objeto con la forma de
       estado.json -- que es lo que el panel escribe y lo que la pagina recibe por
       fetch. No se simula el fetch: se prueba desde el objeto ya parseado en adelante. */
    const marca = { colorPrincipal: hex };
    capaC.aplicar(marca);
    capaJ.aplicar(marca);

    const usaCarta = tokensUsados('gen.mjs');
    const usaJuego = tokensUsados('juego.mjs');
    for (const [nombre, escrito, usa, esperado] of [
      ['carta', domC.escrito, usaCarta, { '--accent-ink': t['--accent-ink'], '--badge-ink': t['--badge-ink'] }],
      ['juego', domJ.escrito, usaJuego, { '--metal-ink': t['--metal-ink'], '--rush-ink': t['--rush-ink'] }],
    ]) {
      comprobar(igual(escrito['--accent'], hex), nombre + ': aplica --accent literal',
        'escrito=' + escrito['--accent']);
      for (const [token, valor] of Object.entries(esperado)) {
        if (!usa.has(token)) continue;
        comprobar(igual(escrito[token], valor), nombre + ': aplica ' + token + ' con el valor derivado',
          'escrito=' + escrito[token] + ' derivado=' + valor);
      }
    }
    if (desdeEstado) {
      ok('recorrido desde estado.json',
        'objeto {marca:{colorPrincipal}} pasado a aplicarMarca()/aplicarColorPrincipal() reales; el fetch HTTP no entra en esta prueba');
    }

    /* 2c. las reglas del contrato, color a color */
    if (esFabrica) {
      comprobar(igual(t['--badge-ink'], NEUTRO), 'excepcion de fabrica: badge-ink = NEUTRO',
        t['--badge-ink'] + ' a ' + contraste(t['--badge-ink'], hex).toFixed(4) + ':1, excepcion visual consciente');
      comprobar(igual(t['--rush-ink'], NEUTRO), 'excepcion de fabrica: rush-ink = NEUTRO',
        t['--rush-ink'] + ' a ' + contraste(t['--rush-ink'], t['--metal']).toFixed(4) + ':1 sobre el metal');
      comprobar(igual(t['--accent-ink'], OSCURO), 'la excepcion no contamina accent-ink', t['--accent-ink']);
      comprobar(igual(t['--metal-ink'], OSCURO), 'la excepcion no contamina metal-ink', t['--metal-ink']);
    } else {
      comprobar(igual(t['--badge-ink'], t['--accent-ink']), 'badge-ink = accent-ink (sin excepcion)',
        t['--badge-ink'] + ' vs ' + t['--accent-ink']);
      comprobar(igual(t['--rush-ink'], t['--metal-ink']), 'rush-ink = metal-ink (sin excepcion)',
        t['--rush-ink'] + ' vs ' + t['--metal-ink']);
      comprobar(contraste(t['--badge-ink'], hex) >= UMBRAL, 'badge-ink llega a 4.5:1 sobre el acento',
        contraste(t['--badge-ink'], hex).toFixed(4) + ':1');
      comprobar(contraste(t['--rush-ink'], t['--metal']) >= UMBRAL, 'rush-ink llega a 4.5:1 sobre el metal',
        contraste(t['--rush-ink'], t['--metal']).toFixed(4) + ':1');
    }
    comprobar(contraste(t['--accent-ink'], hex) >= UMBRAL, 'accent-ink llega a 4.5:1 sobre el acento',
      contraste(t['--accent-ink'], hex).toFixed(4) + ':1');
    comprobar(contraste(t['--metal-ink'], t['--metal']) >= UMBRAL, 'metal-ink llega a 4.5:1 sobre el metal',
      contraste(t['--metal-ink'], t['--metal']).toFixed(4) + ':1');
    comprobar(igual(t['--accent'], hex), 'colorPrincipal intacto en --accent', t['--accent']);

    const puro = (v) => igual(v, NEGRO) || igual(v, BLANCO);
    const ningunaLlega = contraste(OSCURO, hex) < UMBRAL && contraste(NEUTRO, hex) < UMBRAL;
    comprobar(puro(t['--accent-ink']) === ningunaLlega,
      'el respaldo puro aparece si y solo si fallan las dos tintas del sistema',
      'accent-ink=' + t['--accent-ink'] + ' fallan las dos=' + ningunaLlega);
  }

  /* ---- 3. el caso critico, con sus cifras ---- */
  di('');
  di('#777777 -- el caso que antes se rechazaba entero');
  {
    const hex = '#777777';
    const t = derivar(hex);
    const cO = contraste(OSCURO, hex), cN = contraste(NEUTRO, hex);
    comprobar(Math.abs(cO - 4.1834) < 0.001, 'contra ' + OSCURO + ' ~ 4.1834:1, insuficiente', cO.toFixed(4) + ':1');
    comprobar(Math.abs(cN - 4.0868) < 0.001, 'contra ' + NEUTRO + ' ~ 4.0868:1, insuficiente', cN.toFixed(4) + ':1');
    comprobar(igual(t['--accent-ink'], NEGRO), 'el respaldo elegido es ' + NEGRO, t['--accent-ink']);
    comprobar(Math.abs(contraste(t['--accent-ink'], hex) - 4.6895) < 0.001, 'y llega a ~ 4.6895:1',
      contraste(t['--accent-ink'], hex).toFixed(4) + ':1');
  }

  /* ---- 4. barrido: cualquier color personalizado sale legible ---- */
  di('');
  const colores = coloresDelBarrido();
  let sinMetal = 0, conRespaldo = 0, peorAcento = Infinity, peorMetal = Infinity;
  const rotos = [];
  for (const hex of colores) {
    const t = derivar(hex);
    if (t['--metal'] === null) { sinMetal++; continue; }
    const esFabrica = igual(hex, PRINCIPAL_DEFECTO);
    const cAcento = contraste(t['--accent-ink'], hex);
    const cMetal = contraste(t['--metal-ink'], t['--metal']);
    peorAcento = Math.min(peorAcento, cAcento);
    peorMetal = Math.min(peorMetal, cMetal);
    if (igual(t['--accent-ink'], NEGRO) || igual(t['--accent-ink'], BLANCO)) conRespaldo++;
    if (cAcento < UMBRAL) rotos.push(hex + ' accent-ink ' + cAcento.toFixed(4));
    else if (cMetal < UMBRAL) rotos.push(hex + ' metal-ink ' + cMetal.toFixed(4));
    else if (!esFabrica && !igual(t['--badge-ink'], t['--accent-ink'])) rotos.push(hex + ' badge-ink != accent-ink');
    else if (!esFabrica && !igual(t['--rush-ink'], t['--metal-ink'])) rotos.push(hex + ' rush-ink != metal-ink');
    else if (!esFabrica && contraste(t['--badge-ink'], hex) < UMBRAL) rotos.push(hex + ' badge-ink ' + contraste(t['--badge-ink'], hex).toFixed(4));
    else if (!esFabrica && contraste(t['--rush-ink'], t['--metal']) < UMBRAL) rotos.push(hex + ' rush-ink bajo');
    if (!igual(t['--accent'], hex)) rotos.push(hex + ' colorPrincipal tocado');
  }
  di('BARRIDO -- ' + colores.length + ' colores (rejilla de 6 por canal + gris fino 96..160)');
  comprobar(rotos.length === 0, 'todos los colores con --metal legible cumplen el contrato',
    'evaluados=' + (colores.length - sinMetal) + ' sin --metal legible=' + sinMetal
    + ' con respaldo puro=' + conRespaldo
    + ' peor accent-ink=' + peorAcento.toFixed(4) + ':1 peor metal-ink=' + peorMetal.toFixed(4) + ':1'
    + (rotos.length ? ' -- ROTOS: ' + rotos.slice(0, 5).join(' | ') : ''));

  di('');
  di('='.repeat(76));
  di(fallos.length === 0 ? 'CONTRATO CUMPLIDO: 0 fallos' : 'CONTRATO ROTO: ' + fallos.length + ' fallo(s)');

  return { fallos, lineas, conPHP };
}

/* Ejecutado como programa: informe completo y codigo de salida. Importado: solo exporta.
   Mismo idioma que motor/verificar-build.mjs.

   --sin-php: unica via para saltarse la capa del panel, y existe solo para poder
   diagnosticar en una maquina sin PHP instalado. verificar-build.mjs llama a
   contratoTintas() sin argumentos, asi que alli PHP es obligatorio siempre y esta bandera
   no le llega -- el despliegue no tiene forma de usarla. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exigirPHP = !process.argv.includes('--sin-php');
  const { fallos } = contratoTintas({ verboso: true, exigirPHP });
  process.exit(fallos.length ? 1 : 0);
}
