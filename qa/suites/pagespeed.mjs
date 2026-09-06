/* `npm --prefix qa run pagespeed` — Lighthouse local, cinco pasadas por perfil y mediana.
 *
 * Esto NO es PageSpeed de producción y en ningún sitio se le llama así: es Lighthouse corriendo
 * contra un servidor local, con red simulada. Sirve para comparar una versión con otra en las
 * mismas condiciones, no para dar una nota absoluta.
 *
 * Cinco reglas que hacen que la comparación signifique algo:
 *   - la línea base NUNCA se actualiza sola; hace falta `npm run baseline:escribir`;
 *   - se mide siempre la MISMA fixtura determinista (`lib/fixtura-lh.mjs`): mismo build, misma
 *     portada, mismo banner, mismo podio, misma pestaña y misma sesión. Improvisar el contenido
 *     medido fue justo lo que hizo incomparables la línea base de la fase 17 y la referencia de
 *     §15.7 de la auditoría anterior;
 *   - cinco pasadas y mediana, porque una sola medición no dice nada;
 *   - las tolerancias están escritas aquí y son las del encargo, no las que convengan;
 *   - **dos medidas de entornos distintos no se comparan.** Una línea base de Windows con Chrome
 *     152 frente a un runner de Linux con otro Chrome y otro hardware no es una comparación: es
 *     ruido con formato de tabla. Si las huellas no coinciden, esto falla; nunca sale verde.
 *
 * Para CI existe el modo control-contra-candidato (`--control <commit>`): se miden las dos
 * versiones en la MISMA máquina, con la misma fixtura y el mismo navegador, y se comparan las
 * medianas entre sí. Es la única comparación de tiempos que es válida fuera de esta máquina.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Informe } from '../lib/informe.mjs';
import {
  QA, CLIENTE, LIGHTHOUSE_CLI, NODE, chromePath, carpetaTemporal, limpiarTemporales,
  versiones, commitActual,
} from '../lib/entorno.mjs';
import { correr } from '../lib/proc.mjs';
import { cerrarTodos, capacidadesPhp } from '../lib/servidor.mjs';
import { clonarTinge, compilar, checkoutCommit, identidadArbol } from '../lib/clientes.mjs';
import { montarFixtura, huellaEntorno, huellasIncompatibles, diferenciaDocroots } from '../lib/fixtura-lh.mjs';

export const RUTA_BASELINE = path.join(QA, 'baseline', 'lighthouse.json');
export const COMMIT_CONTROL = '54ed519';
const PASADAS = 5;

/* Tolerancias del encargo. Subir cualquiera de estas cifras es una decisión, no un ajuste: por
   eso viven aquí, con nombre, y no repartidas por el código. */
export const TOLERANCIAS = {
  puntuacion: 1,        // puntos de caída admitidos (0-100)
  cls: 0.005,           // aumento absoluto
  tiempoRelativo: 0.05, // 5 % en FCP, LCP y Speed Index
  tbtMs: 20,            // milisegundos
  peticiones: 0,        // cualquier aumento hay que justificarlo
  bytes: 0,
};

export const PERFILES = [
  { id: 'carta-movil', pagina: 'carta', escritorio: false, viewport: '412x823 movil simulado' },
  { id: 'carta-escritorio', pagina: 'carta', escritorio: true, viewport: '1350x940 escritorio' },
  { id: 'admin-movil', pagina: 'admin', escritorio: false, viewport: '412x823 movil simulado' },
  { id: 'admin-escritorio', pagina: 'admin', escritorio: true, viewport: '1350x940 escritorio' },
];

export const CONFIG_LIGHTHOUSE = {
  categorias: 'performance,accessibility,best-practices,seo',
  throttling: 'simulate',
  chromeFlags: '--headless=new --no-sandbox --disable-gpu',
  pasadas: PASADAS,
  agregacion: 'mediana',
  paginaAdmin: 'admin/index.php?t=agotados',
  paginaCarta: 'index.html',
};

function mediana(valores) {
  const v = valores.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function metricasDe(informeLh, base = '') {
  const cat = informeLh.categories || {};
  const aud = informeLh.audits || {};
  const num = (k) => (aud[k] && typeof aud[k].numericValue === 'number' ? aud[k].numericValue : null);
  const peticiones = aud['network-requests']?.details?.items || [];
  const esLocal = (u) => (base ? String(u).startsWith(base) : !/^https?:\/\//.test(String(u)));
  const suma = (f) => peticiones.filter((x) => f(x)).reduce((n, x) => n + (x.transferSize || 0), 0);
  return {
    performance: Math.round((cat.performance?.score ?? 0) * 100),
    accesibilidad: Math.round((cat.accessibility?.score ?? 0) * 100),
    buenasPracticas: Math.round((cat['best-practices']?.score ?? 0) * 100),
    seo: Math.round((cat.seo?.score ?? 0) * 100),
    fcp: num('first-contentful-paint'),
    lcp: num('largest-contentful-paint'),
    cls: num('cumulative-layout-shift'),
    tbt: num('total-blocking-time'),
    speedIndex: num('speed-index'),
    peticiones: peticiones.length,
    peticionesLocales: peticiones.filter((x) => esLocal(x.url)).length,
    peticionesExternas: peticiones.filter((x) => !esLocal(x.url)).length,
    /* Bytes EXACTOS, nunca kilobytes redondeados. El gate de la fase 17 comparaba `kb`, así que
       una diferencia de 1.003.878 a 1.003.879 bytes daba 980 KB en los dos lados y pasaba con
       tolerancia cero. Aquí se comparan enteros. */
    bytes: suma(() => true),
    bytesLocales: suma((x) => esLocal(x.url)),
    bytesExternos: suma((x) => !esLocal(x.url)),
    kb: Math.round(peticiones.reduce((n, x) => n + (x.transferSize || 0), 0) / 1024),
  };
}

/* El manifiesto de recursos: qué pide exactamente la página, con su tipo y su peso. Es lo que
   convierte «hay dos peticiones más» en «son estas dos, y las pide esto». Sin él, una diferencia
   de peticiones sólo se puede mirar con cara de sorpresa. */
function manifiestoDe(informeLh, base) {
  const items = informeLh.audits['network-requests']?.details?.items || [];
  return items.map((x) => ({
    url: normalizaUrl(String(x.url).replace(base, '')),
    tipo: x.resourceType || null,
    estado: x.statusCode ?? null,
    bytes: x.transferSize ?? 0,
  })).sort((a, b) => (a.url < b.url ? -1 : 1));
}

/* Dos cosas del producto hacen que la MISMA carga pida URLs distintas en dos pasadas, y ninguna es
   un cambio de carga:
     - `version.json?t=<sello>` lleva la marca de tiempo del build;
     - una foto subida por el panel se guarda con un nombre de 16 hexadecimales que **no** deriva
       del contenido: subir dos veces el mismo fichero da dos nombres distintos.
   Se neutralizan las dos, y sólo esas. El tamaño y el número de peticiones siguen comparándose sin
   tocar, así que una imagen distinta de verdad —otro peso— se sigue viendo. */
export function normalizaUrl(url) {
  return url
    .replace(/([?&]t=)\d+/, '$1SELLO')
    .replace(/\/([0-9a-f]{16})(?=[-.])/g, '/HASH');
}

/* Los elementos que provocan el CLS, para poder decir cuál es sin abrir el informe a mano. */
function elementosCls(informeLh) {
  const items = informeLh.audits['layout-shift-elements']?.details?.items || [];
  return items.slice(0, 5).map((x) => ({
    nodo: x.node?.snippet || x.node?.selector || '(sin nodo)',
    aporte: x.score ?? null,
  }));
}

function correrLighthouse(url, { escritorio, salida, cookie }) {
  const args = [
    LIGHTHOUSE_CLI, url,
    '--quiet', '--output=json', `--output-path=${salida}`,
    `--only-categories=${CONFIG_LIGHTHOUSE.categorias}`,
    `--throttling-method=${CONFIG_LIGHTHOUSE.throttling}`,
    `--chrome-flags=${CONFIG_LIGHTHOUSE.chromeFlags}`,
  ];
  if (escritorio) args.push('--preset=desktop');
  if (cookie) args.push(`--extra-headers=${JSON.stringify({ Cookie: cookie })}`);
  return correr(NODE, args, { env: { ...process.env, CHROME_PATH: chromePath() || '' } });
}

/* Prepara un árbol para medirlo: compila y monta la fixtura canonicalizada. No mide todavía, para
   que quien llame pueda exigir que control y candidato sean idénticos ANTES de gastar veinte
   minutos de Lighthouse midiendo dos cosas distintas. */
export async function prepararArbol(informe, { proyecto, salida, etiqueta, prefijo = 'LH', identidad = null }) {
  const c = compilar(proyecto, { conActivacion: false });
  informe.comprueba(`${prefijo}-01`, `arbol compilado para medir (${etiqueta})`, c.gen.ok,
    c.gen.texto.trim().split('\n').pop());
  if (!c.gen.ok) return null;

  let fix;
  try {
    fix = await montarFixtura(salida);
  } catch (e) {
    informe.fail(`${prefijo}-02`, `fixtura determinista (${etiqueta})`, e.message);
    return null;
  }
  informe.pass(`${prefijo}-02`, `fixtura canonicalizada montada (${etiqueta})`,
    `${fix.huella.pasos.join(' · ')} · docroot ${fix.huella.hashDocroot.slice(0, 12)}`);
  if (identidad) informe.pass(`${prefijo}-03`, `identidad del arbol (${etiqueta})`, identidad.etiqueta);
  return { ...fix, etiqueta, prefijo, identidad };
}

/* Mide una fixtura ya montada: cuatro perfiles × cinco pasadas, medianas. */
export async function medirFixtura(informe, fix) {
  const { etiqueta, prefijo } = fix;
  const salidas = carpetaTemporal('totm-lh-');
  const medidas = {};
  const manifiestos = {};
  const cls = {};
  for (const perfil of PERFILES) {
    const url = perfil.pagina === 'carta'
      ? fix.servidor.url + '/' + CONFIG_LIGHTHOUSE.paginaCarta
      : fix.servidor.url + '/' + CONFIG_LIGHTHOUSE.paginaAdmin;
    const pasadas = [];
    for (let i = 1; i <= PASADAS; i++) {
      const fichero = path.join(salidas, `${prefijo}-${perfil.id}-${i}.json`);
      const r = correrLighthouse(url, {
        escritorio: perfil.escritorio, salida: fichero,
        cookie: perfil.pagina === 'admin' ? fix.cookie : null,
      });
      if (!existsSync(fichero)) {
        informe.fail(`${prefijo}-${perfil.id}`, `pasada ${i} de ${perfil.id} (${etiqueta})`, r.texto.trim().slice(-300));
        break;
      }
      const lh = JSON.parse(readFileSync(fichero, 'utf8'));
      pasadas.push(metricasDe(lh, fix.servidor.url));
      if (i === 1) {
        manifiestos[perfil.id] = manifiestoDe(lh, fix.servidor.url);
        cls[perfil.id] = elementosCls(lh);
      }
    }
    if (pasadas.length === PASADAS) {
      const m = {};
      for (const k of Object.keys(pasadas[0])) m[k] = mediana(pasadas.map((p) => p[k]));
      medidas[perfil.id] = m;
      informe.pass(`${prefijo}-${perfil.id}`, `mediana de ${PASADAS} pasadas de ${perfil.id} (${etiqueta})`,
        `perf ${m.performance} · lcp ${Math.round(m.lcp)} · cls ${m.cls?.toFixed(3)} · ${m.peticiones} peticiones · ${m.bytesLocales} B locales · ${m.bytesExternos} B externos`);
    }
  }
  return {
    medidas, manifiestos, cls,
    fixtura: fix.huella,
    identidad: fix.identidad,
    huella: huellaEntorno(),
    versiones: versiones(),
    configuracion: CONFIG_LIGHTHOUSE,
    perfiles: PERFILES.map((p) => ({ id: p.id, viewport: p.viewport, pagina: p.pagina })),
  };
}

/* Compatibilidad: preparar y medir de una vez, que es lo que hace la medición de un solo árbol. */
export async function medirArbol(informe, opciones) {
  const fix = await prepararArbol(informe, opciones);
  if (!fix) return null;
  try {
    return await medirFixtura(informe, fix);
  } finally {
    fix.servidor.parar();
  }
}

/* Mide el árbol de trabajo actual. */
export async function medir(informe) {
  const caps = capacidadesPhp();
  if (!caps.hayPhp) { informe.fail('LH-00', 'medicion Lighthouse', 'no hay PHP en el PATH'); return null; }
  if (!chromePath()) { informe.fail('LH-00', 'medicion Lighthouse', 'no se encuentra Chrome'); return null; }
  if (!existsSync(LIGHTHOUSE_CLI)) { informe.fail('LH-00', 'medicion Lighthouse', 'lighthouse no esta instalado en qa/'); return null; }

  informe.seccion('lighthouse: preparacion');
  const clon = clonarTinge();
  const identidad = identidadArbol(CLIENTE);
  const datos = await medirArbol(informe, {
    proyecto: clon.proyecto, salida: clon.salida,
    etiqueta: `candidato ${identidad.etiqueta}`, prefijo: 'LH', identidad,
  });
  if (!datos) return null;
  return { ...datos, commit: commitActual(), identidad, fecha: new Date().toISOString() };
}

export function leerBaseline() {
  if (!existsSync(RUTA_BASELINE)) return null;
  return JSON.parse(readFileSync(RUTA_BASELINE, 'utf8'));
}

export function escribirBaseline(datos) {
  mkdirSync(path.dirname(RUTA_BASELINE), { recursive: true });
  writeFileSync(RUTA_BASELINE, JSON.stringify({
    ...datos,
    nota: 'Linea base de Lighthouse LOCAL sobre la fixtura determinista de qa/lib/fixtura-lh.mjs. NO es PageSpeed de produccion y NO es comparable con una medida hecha en otro sistema operativo o con otro Chrome: para eso esta el modo control-contra-candidato. No se actualiza sola: hace falta `npm --prefix qa run baseline:escribir` y autorizacion expresa.',
    tolerancias: TOLERANCIAS,
  }, null, 2) + '\n', 'utf8');
  return RUTA_BASELINE;
}

/* Compara dos juegos de medidas con las tolerancias del encargo. `base` y `hoy` tienen que venir
   del MISMO entorno: quien llama es responsable de haberlo comprobado. */
export function comparar(informe, medidas, baseline, { titulo = 'la linea base', prefijo = 'LH-CMP' } = {}) {
  informe.seccion(`lighthouse: comparacion con ${titulo}`);
  const regresiones = [];
  for (const perfil of Object.keys(medidas)) {
    const hoy = medidas[perfil];
    const base = baseline.medidas[perfil];
    if (!base) {
      informe.fail(`${prefijo}-${perfil}`, `comparacion de ${perfil}`, `${titulo} no tiene este perfil`);
      continue;
    }
    const problemas = [];
    const puntuaciones = ['performance', 'accesibilidad', 'buenasPracticas', 'seo'];
    for (const k of puntuaciones) {
      if (base[k] - hoy[k] > TOLERANCIAS.puntuacion) problemas.push(`${k}: ${base[k]} -> ${hoy[k]}`);
    }
    for (const k of ['fcp', 'lcp', 'speedIndex']) {
      if (base[k] && hoy[k] && hoy[k] > base[k] * (1 + TOLERANCIAS.tiempoRelativo)) {
        problemas.push(`${k}: ${Math.round(base[k])} -> ${Math.round(hoy[k])} ms (+${((hoy[k] / base[k] - 1) * 100).toFixed(1)} %)`);
      }
    }
    if (hoy.cls - base.cls > TOLERANCIAS.cls) problemas.push(`cls: ${base.cls.toFixed(3)} -> ${hoy.cls.toFixed(3)}`);
    if (hoy.tbt - base.tbt > TOLERANCIAS.tbtMs) problemas.push(`tbt: ${Math.round(base.tbt)} -> ${Math.round(hoy.tbt)} ms`);
    if (hoy.peticiones - base.peticiones > TOLERANCIAS.peticiones) problemas.push(`peticiones: ${base.peticiones} -> ${hoy.peticiones}`);
    /* Bytes exactos y tolerancia cero, sobre lo que sirve ESTE producto. Las respuestas de
       fonts.googleapis.com y fonts.gstatic.com no entran: se midió una variación de 643 bytes
       entre dos cargas del mismo contenido —la CDN negocia su propia compresión— y un gate de cero
       bytes sobre eso sería una moneda al aire. Se informan aparte, y el NÚMERO de peticiones
       externas sí se compara con tolerancia cero. */
    if (base.bytesLocales != null && hoy.bytesLocales != null
        && hoy.bytesLocales - base.bytesLocales > TOLERANCIAS.bytes) {
      problemas.push(`bytes locales: ${base.bytesLocales} -> ${hoy.bytesLocales} (+${hoy.bytesLocales - base.bytesLocales} B)`);
    }
    if (base.peticionesExternas != null && hoy.peticionesExternas != null
        && hoy.peticionesExternas !== base.peticionesExternas) {
      problemas.push(`peticiones externas: ${base.peticionesExternas} -> ${hoy.peticionesExternas}`);
    }
    informe.comprueba(`${prefijo}-${perfil}`, `${perfil} dentro de las tolerancias`,
      problemas.length === 0, problemas.join(' | '));
    if (problemas.length) regresiones.push({ perfil, problemas });
  }
  return regresiones;
}

/* Diferencias de recursos entre dos manifiestos: qué falta, qué sobra y cuántos bytes. */
export function diferenciaManifiestos(a = {}, b = {}) {
  const salida = {};
  for (const perfil of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const ma = a[perfil] || [];
    const mb = b[perfil] || [];
    const ua = new Map(ma.map((x) => [x.url, x]));
    const ub = new Map(mb.map((x) => [x.url, x]));
    salida[perfil] = {
      soloEnA: ma.filter((x) => !ub.has(x.url)).map((x) => `${x.url} (${x.bytes} B)`),
      soloEnB: mb.filter((x) => !ua.has(x.url)).map((x) => `${x.url} (${x.bytes} B)`),
      bytesA: ma.reduce((n, x) => n + x.bytes, 0),
      bytesB: mb.reduce((n, x) => n + x.bytes, 0),
    };
  }
  return salida;
}

/* ---- El gate contra la línea base ----
 * Sólo es válido si la huella del entorno coincide. Si no, FALLA y lo dice: un verde obtenido
 * comparando Windows con Linux es peor que no medir, porque parece que se ha medido. */
export function compararConBaseline(informe, datos, base) {
  const dif = huellasIncompatibles(base.huella, datos.huella);
  if (dif.length) {
    informe.fail('LH-HUELLA', 'la linea base es de este mismo entorno',
      `no comparable: ${dif.join(' | ')}. Usa el modo control-contra-candidato `
      + '(`node suites/pagespeed.mjs --control ' + COMMIT_CONTROL + '`), que mide las dos versiones en esta misma maquina.');
    return null;
  }
  informe.pass('LH-HUELLA', 'la linea base es del mismo entorno', JSON.stringify(base.huella));
  informe.pass('LH-BASE', 'linea base leida', `commit ${base.commit} · ${base.fecha}`);
  return comparar(informe, datos.medidas, base);
}

export async function pagespeed(informe = new Informe('Lighthouse local', 'pagespeed'), { escribirBase = false } = {}) {
  const datos = await medir(informe);
  if (!datos) return { informe, datos: null };
  if (escribirBase) {
    const ruta = escribirBaseline(datos);
    informe.pass('LH-BASE', 'linea base escrita a peticion expresa', path.relative(CLIENTE, ruta));
    return { informe, datos };
  }
  const base = leerBaseline();
  if (!base) {
    informe.fail('LH-CMP', 'comparacion con la linea base',
      'no hay linea base: crearla con `npm --prefix qa run baseline:escribir`');
    return { informe, datos };
  }
  const regresiones = compararConBaseline(informe, datos, base);
  return { informe, datos, base, regresiones };
}

/* ---- Control contra candidato, en el mismo runner ----
 * Es la comparación que vale en CI: dos árboles, la misma máquina, el mismo Chrome, la misma
 * fixtura y las mismas cinco pasadas. Si el commit de control no está, esto falla. */
export async function comparativa(informe, commitControl = COMMIT_CONTROL) {
  const caps = capacidadesPhp();
  if (!caps.hayPhp) { informe.fail('LHC-00', 'comparativa', 'no hay PHP en el PATH'); return null; }
  if (!chromePath()) { informe.fail('LHC-00', 'comparativa', 'no se encuentra Chrome'); return null; }
  if (!existsSync(LIGHTHOUSE_CLI)) { informe.fail('LHC-00', 'comparativa', 'lighthouse no esta instalado en qa/'); return null; }

  informe.seccion(`lighthouse: control ${commitControl} contra el candidato, en esta misma maquina`);
  let control;
  try {
    control = checkoutCommit(commitControl);
  } catch (e) {
    informe.fail('LHC-00', `arbol de control ${commitControl}`, e.message);
    return null;
  }
  informe.pass('LHC-00', `arbol de control ${commitControl} extraido`, 'con git archive, sin tocar el arbol de trabajo');

  /* Se montan LAS DOS fixturas antes de medir ninguna: exigir que sean idénticas después de haber
     medido no serviría de nada, porque ya se habrían comparado dos páginas distintas. */
  const idControl = identidadArbol(control.proyecto, { commit: commitControl });
  const fControl = await prepararArbol(informe, {
    proyecto: control.proyecto, salida: control.salida,
    etiqueta: `control ${commitControl}`, prefijo: 'LHC', identidad: idControl,
  });
  if (!fControl) return null;

  const clon = clonarTinge();
  const idCandidato = identidadArbol(CLIENTE);
  const fCandidato = await prepararArbol(informe, {
    proyecto: clon.proyecto, salida: clon.salida,
    etiqueta: `candidato ${idCandidato.etiqueta}`, prefijo: 'LHD', identidad: idCandidato,
  });
  if (!fCandidato) { fControl.servidor.parar(); return null; }

  try {
    /* ---- igualdad exigida ANTES de medir ---- */
    const dDoc = diferenciaDocroots(fControl.docHuella, fCandidato.docHuella);
    informe.comprueba('LHC-FIX-01', 'control y candidato miden el MISMO docroot, fichero a fichero',
      dDoc.iguales,
      `distintos: ${dDoc.distintos.join(', ') || '(ninguno)'} | solo control: ${dDoc.soloA.join(', ') || '(ninguno)'} | solo candidato: ${dDoc.soloB.join(', ') || '(ninguno)'}`);
    informe.comprueba('LHC-FIX-02', 'los hashes de la fixtura coinciden',
      fControl.huella.hashDocroot === fCandidato.huella.hashDocroot
      && fControl.huella.hashEstado === fCandidato.huella.hashEstado
      && fControl.huella.hashCarta === fCandidato.huella.hashCarta,
      `docroot ${fControl.huella.hashDocroot.slice(0, 12)} / ${fCandidato.huella.hashDocroot.slice(0, 12)}`
      + ` · estado ${fControl.huella.hashEstado.slice(0, 12)} / ${fCandidato.huella.hashEstado.slice(0, 12)}`);
    informe.comprueba('LHC-FIX-03', 'el numero de ficheros del docroot es el mismo',
      fControl.huella.ficherosDocroot === fCandidato.huella.ficherosDocroot,
      `${fControl.huella.ficherosDocroot} / ${fCandidato.huella.ficherosDocroot}`);
    const pesos = (raiz) => ['assets/hero', 'assets/publicidad', 'assets/banderas']
      .map((d) => `${d}:${pesoCarpeta(path.join(raiz, d))}`).join(' ');
    informe.comprueba('LHC-FIX-04', 'portada, banner y banderas pesan y se llaman igual en los dos',
      pesos(fControl.docroot) === pesos(fCandidato.docroot),
      `${pesos(fControl.docroot)} || ${pesos(fCandidato.docroot)}`);
    if (!dDoc.iguales) {
      informe.fail('LHC-FIX-05', 'no se mide: las dos fixturas no son la misma',
        'medir dos docroots distintos y llamarlo comparacion es peor que no medir');
      return null;
    }

    const dControl = await medirFixtura(informe, fControl);
    const dCandidato = await medirFixtura(informe, fCandidato);

    /* Las dos medidas salen del mismo proceso, así que la huella es la misma por construcción. Se
       comprueba igualmente: si algún día se paralelizan, esto lo detecta antes que nadie. */
    const dif = huellasIncompatibles(dControl.huella, dCandidato.huella);
    informe.comprueba('LHC-HUELLA', 'control y candidato medidos en el mismo entorno',
      dif.length === 0, dif.join(' | ') || JSON.stringify(dControl.huella));

    /* Y el número de peticiones, exigido igual antes de mirar tiempos. */
    for (const perfil of Object.keys(dControl.medidas)) {
      const a = dControl.medidas[perfil]; const b = dCandidato.medidas[perfil];
      informe.comprueba(`LHC-PET-${perfil}`, `${perfil}: mismo numero de peticiones`,
        a.peticiones === b.peticiones, `${a.peticiones} / ${b.peticiones}`);
    }

    const regresiones = comparar(informe, dCandidato.medidas, { medidas: dControl.medidas },
      { titulo: `el control ${commitControl}`, prefijo: 'LHC-CMP' });

    const difRec = diferenciaManifiestos(dControl.manifiestos, dCandidato.manifiestos);
    for (const perfil of Object.keys(difRec)) {
      const d = difRec[perfil];
      informe.comprueba(`LHC-REC-${perfil}`, `${perfil}: los recursos pedidos son los mismos`,
        d.soloEnA.length === 0 && d.soloEnB.length === 0,
        `solo en el control: ${d.soloEnA.join(', ') || '(ninguno)'} | solo en el candidato: ${d.soloEnB.join(', ') || '(ninguno)'}`);
    }
    return {
      control: dControl, candidato: dCandidato, regresiones, diferenciaRecursos: difRec,
      commitControl, identidadControl: idControl, identidadCandidato: idCandidato,
    };
  } finally {
    fControl.servidor.parar();
    fCandidato.servidor.parar();
  }
}

/* El peso total de una carpeta, con sus nombres: dos fixturas con la misma foto tienen que dar la
   misma cadena. */
function pesoCarpeta(dir) {
  if (!existsSync(dir)) return '(no existe)';
  return readdirSync(dir).sort().map((n) => {
    const f = path.join(dir, n);
    return statSync(f).isFile() ? `${n}=${statSync(f).size}` : n;
  }).join(',');
}

if (process.argv[1] && process.argv[1].endsWith('pagespeed.mjs')) {
  const escribirBase = process.argv.includes('--escribir-baseline');
  const iControl = process.argv.indexOf('--control');
  const modoControl = iControl !== -1;
  const commitControl = modoControl ? (process.argv[iControl + 1] || COMMIT_CONTROL) : null;
  const informe = new Informe(
    escribirBase ? 'Lighthouse: escribir linea base'
      : modoControl ? 'Lighthouse: control contra candidato' : 'Lighthouse local (pagespeed)',
    'pagespeed');
  const v = versiones();
  console.log(`commit ${commitActual()} · lighthouse ${v.lighthouse} · ${v.navegador}`);
  if (escribirBase) console.log('AVISO: se va a SOBRESCRIBIR la linea base. Esto solo se hace con autorizacion expresa.');
  try {
    if (modoControl) await comparativa(informe, commitControl);
    else await pagespeed(informe, { escribirBase });
  } finally {
    cerrarTodos();
    limpiarTemporales();
  }
  informe.aplicaPolitica();
  informe.salir();
}

/* ---- La regla, en un solo sitio ----
 *
 * La comparación OBLIGATORIA es control contra candidato en el mismo runner. La línea base
 * versionada es un SEGUNDO gate, y sólo cuando su huella coincide con la de esta máquina.
 *
 * Si no coincide, queda `NO APLICA`: no se compara y **no pone rojo la pasada**. Una ejecución en
 * Linux no puede quedar condenada a fallar sólo porque la línea base versionada se midiera en
 * Windows; lo que sí la pone roja es que falte el commit de control, o Chrome, o PHP, o Lighthouse,
 * o la fixtura, o el servidor.
 *
 * Devuelve 'comparado' | 'no-aplica' | 'sin-base', y las regresiones que haya encontrado.
 */
export function gateBaseline(informe, { medidas, huellaCandidato, base }) {
  if (!base) {
    informe.noAplica('LH-HUELLA', 'la linea base guardada como segundo gate',
      'no hay linea base versionada todavia: el gate es el control medido aqui mismo');
    return { modo: 'sin-base', regresiones: [] };
  }
  const dif = huellasIncompatibles(base.huella, huellaCandidato);
  if (dif.length) {
    informe.noAplica('LH-HUELLA', 'la linea base guardada como segundo gate',
      `medida en otro entorno (${dif.join(' | ')}); el gate de esta pasada es el control medido aqui mismo`);
    return { modo: 'no-aplica', regresiones: [] };
  }
  informe.pass('LH-HUELLA', 'la linea base guardada es de este mismo entorno', JSON.stringify(base.huella));
  const regresiones = comparar(informe, medidas, base,
    { titulo: 'la linea base guardada', prefijo: 'LHB-CMP' });
  return { modo: 'comparado', regresiones };
}
