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
import {
  montarFixtura, huellaEntorno, huellasIncompatibles, comparaDocroots, condicionesIncomparables,
} from '../lib/fixtura-lh.mjs';

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
/* Una sola pasada de Lighthouse sobre una fixtura montada. Devuelve null si no salio, para que
   quien llame decida: repetir por muestra invalida es legitimo; repetir por resultado que no gusta,
   no, y por eso el reintento vive aqui y solo cubre el caso de que Lighthouse no escriba fichero. */
function unaPasada(fix, perfil, fichero) {
  const url = perfil.pagina === 'carta'
    ? fix.servidor.url + '/' + CONFIG_LIGHTHOUSE.paginaCarta
    : fix.servidor.url + '/' + CONFIG_LIGHTHOUSE.paginaAdmin;
  const r = correrLighthouse(url, {
    escritorio: perfil.escritorio, salida: fichero,
    cookie: perfil.pagina === 'admin' ? fix.cookie : null,
  });
  if (!existsSync(fichero)) return { ok: false, error: r.texto.trim().slice(-300) };
  return { ok: true, lh: JSON.parse(readFileSync(fichero, 'utf8')) };
}

const INTENTOS_EXTRA = 2;   // solo para reponer una muestra que no llego a escribirse

function resumen(m) {
  return `perf ${m.performance} · lcp ${Math.round(m.lcp)} · cls ${m.cls?.toFixed(3)}`
    + ` · ${m.peticiones} peticiones · ${m.bytesLocales} B locales · ${m.bytesExternos} B externos`;
}

function empaqueta(fix, medidas, manifiestos, cls) {
  return {
    medidas, manifiestos, cls,
    fixtura: fix.huella,
    docHuella: fix.docHuella,
    identidad: fix.identidad,
    etiqueta: fix.etiqueta,
    huella: huellaEntorno(),
    versiones: versiones(),
    configuracion: CONFIG_LIGHTHOUSE,
    perfiles: PERFILES.map((p) => ({ id: p.id, viewport: p.viewport, pagina: p.pagina })),
  };
}

/* Mide UNA fixtura: cuatro perfiles, cinco muestras validas, mediana. */
export async function medirFixtura(informe, fix) {
  const salidas = carpetaTemporal('totm-lh-');
  const medidas = {}; const manifiestos = {}; const cls = {};
  for (const perfil of PERFILES) {
    const pasadas = [];
    for (let i = 1; i <= PASADAS + INTENTOS_EXTRA && pasadas.length < PASADAS; i++) {
      const r = unaPasada(fix, perfil, path.join(salidas, `${fix.prefijo}-${perfil.id}-${i}.json`));
      if (!r.ok) continue;
      pasadas.push(metricasDe(r.lh, fix.servidor.url));
      if (pasadas.length === 1) {
        manifiestos[perfil.id] = manifiestoDe(r.lh, fix.servidor.url);
        cls[perfil.id] = elementosCls(r.lh);
      }
    }
    if (pasadas.length < PASADAS) {
      informe.fail(`${fix.prefijo}-${perfil.id}`, `cinco muestras validas de ${perfil.id} (${fix.etiqueta})`,
        `solo ${pasadas.length} de ${PASADAS}`);
      continue;
    }
    const m = {};
    for (const k of Object.keys(pasadas[0])) m[k] = mediana(pasadas.map((x) => x[k]));
    medidas[perfil.id] = m;
    informe.pass(`${fix.prefijo}-${perfil.id}`, `mediana de ${PASADAS} muestras de ${perfil.id} (${fix.etiqueta})`,
      resumen(m));
  }
  return empaqueta(fix, medidas, manifiestos, cls);
}

/* Mide DOS fixturas INTERCALADAS: control, candidato, control, candidato... dentro de cada perfil.
 *
 * Por que intercaladas (fase 17.4): medir las cinco del control y despues las cinco del candidato
 * mete la deriva de la maquina entera en el segundo. Con veinte minutos de por medio, un portatil
 * que se calienta convierte una diferencia de temperatura en una regresion aparente. Intercaladas,
 * la deriva le toca por igual a los dos. */
export async function medirIntercalado(informe, fixA, fixB) {
  const salidas = carpetaTemporal('totm-lh-');
  const acc = [fixA, fixB].map(() => ({ medidas: {}, manifiestos: {}, cls: {} }));
  for (const perfil of PERFILES) {
    const pasadas = [[], []];
    for (let i = 1; i <= PASADAS + INTENTOS_EXTRA; i++) {
      if (pasadas[0].length >= PASADAS && pasadas[1].length >= PASADAS) break;
      for (const [n, fix] of [fixA, fixB].entries()) {
        if (pasadas[n].length >= PASADAS) continue;
        const r = unaPasada(fix, perfil, path.join(salidas, `${fix.prefijo}-${perfil.id}-${i}.json`));
        if (!r.ok) continue;
        pasadas[n].push(metricasDe(r.lh, fix.servidor.url));
        if (pasadas[n].length === 1) {
          acc[n].manifiestos[perfil.id] = manifiestoDe(r.lh, fix.servidor.url);
          acc[n].cls[perfil.id] = elementosCls(r.lh);
        }
      }
    }
    for (const [n, fix] of [fixA, fixB].entries()) {
      if (pasadas[n].length < PASADAS) {
        informe.fail(`${fix.prefijo}-${perfil.id}`, `cinco muestras validas de ${perfil.id} (${fix.etiqueta})`,
          `solo ${pasadas[n].length} de ${PASADAS}`);
        continue;
      }
      const m = {};
      for (const k of Object.keys(pasadas[n][0])) m[k] = mediana(pasadas[n].map((x) => x[k]));
      acc[n].medidas[perfil.id] = m;
      informe.pass(`${fix.prefijo}-${perfil.id}`,
        `mediana de ${PASADAS} muestras intercaladas de ${perfil.id} (${fix.etiqueta})`, resumen(m));
    }
  }
  return [empaqueta(fixA, acc[0].medidas, acc[0].manifiestos, acc[0].cls),
    empaqueta(fixB, acc[1].medidas, acc[1].manifiestos, acc[1].cls)];
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
/* Las diferencias de un perfil contra una referencia, clasificadas. Es la unica aritmetica de
   comparacion que hay: `comparar` y el arbitraje llaman aqui, asi que no puede haber dos criterios.
   Las tolerancias son las del encargo y no se tocan. */
export function deltasDePerfil(hoy, base) {
  const d = [];
  for (const k of ['performance', 'accesibilidad', 'buenasPracticas', 'seo']) {
    if (base[k] - hoy[k] > TOLERANCIAS.puntuacion) {
      d.push({ metrica: k, clase: 'puntuacion', texto: `${k}: ${base[k]} -> ${hoy[k]}` });
    }
  }
  for (const k of ['fcp', 'lcp', 'speedIndex']) {
    if (base[k] && hoy[k] && hoy[k] > base[k] * (1 + TOLERANCIAS.tiempoRelativo)) {
      d.push({
        metrica: k,
        clase: 'tiempo',
        texto: `${k}: ${Math.round(base[k])} -> ${Math.round(hoy[k])} ms (+${((hoy[k] / base[k] - 1) * 100).toFixed(1)} %)`,
      });
    }
  }
  if (hoy.cls - base.cls > TOLERANCIAS.cls) {
    d.push({ metrica: 'cls', clase: 'estabilidad', texto: `cls: ${base.cls.toFixed(3)} -> ${hoy.cls.toFixed(3)}` });
  }
  if (hoy.tbt - base.tbt > TOLERANCIAS.tbtMs) {
    d.push({ metrica: 'tbt', clase: 'tiempo', texto: `tbt: ${Math.round(base.tbt)} -> ${Math.round(hoy.tbt)} ms` });
  }
  if (hoy.peticiones - base.peticiones > TOLERANCIAS.peticiones) {
    d.push({ metrica: 'peticiones', clase: 'carga', texto: `peticiones: ${base.peticiones} -> ${hoy.peticiones}` });
  }
  /* Bytes exactos y tolerancia cero, sobre lo que sirve ESTE producto. Las respuestas de
     fonts.googleapis.com y fonts.gstatic.com no entran: se midio una variacion de 643 bytes entre
     dos cargas del mismo contenido —la CDN negocia su propia compresion— y un gate de cero bytes
     sobre eso seria una moneda al aire. El NUMERO de peticiones externas si se compara. */
  if (base.bytesLocales != null && hoy.bytesLocales != null
      && hoy.bytesLocales - base.bytesLocales > TOLERANCIAS.bytes) {
    d.push({
      metrica: 'bytesLocales',
      clase: 'carga',
      texto: `bytes locales: ${base.bytesLocales} -> ${hoy.bytesLocales} (+${hoy.bytesLocales - base.bytesLocales} B)`,
    });
  }
  if (base.peticionesExternas != null && hoy.peticionesExternas != null
      && hoy.peticionesExternas !== base.peticionesExternas) {
    d.push({
      metrica: 'peticionesExternas',
      clase: 'carga',
      texto: `peticiones externas: ${base.peticionesExternas} -> ${hoy.peticionesExternas}`,
    });
  }
  return d;
}

/* Un delta es arbitrable cuando SOLO toca metricas de tiempo. Un byte de mas, una peticion de mas,
   un CLS peor o una puntuacion caida no se arbitran con nada: son rojos. */
export function soloTiempos(deltas) {
  return deltas.length > 0 && deltas.every((x) => x.clase === 'tiempo');
}

export function comparar(informe, medidas, baseline, { titulo = 'la linea base', prefijo = 'LH-CMP' } = {}) {
  informe.seccion(`lighthouse: comparacion con ${titulo}`);
  const regresiones = [];
  for (const perfil of Object.keys(medidas)) {
    const base = baseline.medidas[perfil];
    if (!base) {
      informe.fail(`${prefijo}-${perfil}`, `comparacion de ${perfil}`, `${titulo} no tiene este perfil`);
      continue;
    }
    const deltas = deltasDePerfil(medidas[perfil], base);
    const problemas = deltas.map((x) => x.texto);
    informe.comprueba(`${prefijo}-${perfil}`, `${perfil} dentro de las tolerancias`,
      problemas.length === 0, problemas.join(' | '));
    if (problemas.length) regresiones.push({ perfil, problemas, deltas });
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

/* Mira los deltas contra la linea base SIN emitir nada: sirve para decidir si hace falta arbitro
   antes de escribir un veredicto que luego habria que retirar. */
function necesitaArbitraje(medidas, base) {
  let algunSoloTiempos = false;
  for (const perfil of Object.keys(medidas)) {
    const b = base.medidas?.[perfil];
    if (!b) return false;
    const d = deltasDePerfil(medidas[perfil], b);
    if (!d.length) continue;
    if (soloTiempos(d)) algunSoloTiempos = true;
    else return false;   // hay algo que ningun arbitro puede salvar: no se gasta el tiempo
  }
  return algunSoloTiempos;
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
  const difHuella = huellasIncompatibles(base.huella, datos.huella);
  if (difHuella.length) {
    informe.fail('LH-HUELLA', 'la linea base es de este mismo entorno',
      `no comparable: ${difHuella.join(' | ')}. Usa \`node suites/pagespeed.mjs --control ${COMMIT_CONTROL}\`, `
      + 'que mide las dos versiones en esta misma maquina.');
    return { informe, datos, base, regresiones: null };
  }
  informe.pass('LH-BASE', 'linea base leida', `commit ${base.commit} · ${base.fecha}`);

  /* Si la unica pega contra la linea base son tiempos, se paga la medida contemporanea y arbitra
     ella. Si hay peticiones, bytes, CLS o puntuaciones de por medio, no se gasta: eso es rojo lo
     mida quien lo mida. */
  let arbitro = null;
  if (necesitaArbitraje(datos.medidas, base)) {
    informe.seccion('lighthouse: la diferencia historica es solo de tiempos, se mide el control para arbitrar');
    arbitro = await comparativa(informe, COMMIT_CONTROL);
  }
  const medidasFinales = arbitro?.candidato?.medidas || datos.medidas;
  const g = gateBaseline(informe, {
    medidas: medidasFinales, huellaCandidato: datos.huella, base, arbitro,
  });
  return { informe, datos, base, arbitro, regresiones: g.regresiones, modo: g.modo };
}

/* ---- Control contra candidato, en el mismo runner ----
 * Es la comparación que vale en CI: dos árboles, la misma máquina, el mismo Chrome, la misma
 * fixtura y las mismas cinco pasadas. Si el commit de control no está, esto falla. */
/* Los pesos de las carpetas de imagenes, tal y como los mira `LHC-FIX-04`. Se saca aparte para
   que la guarda se pueda ejercitar sin montar dos servidores. */
export function pesosDeFixtura(raiz) {
  return ['assets/hero', 'assets/publicidad', 'assets/banderas']
    .map((d) => `${d}:${pesoCarpeta(path.join(raiz, d))}`).join(' ');
}

/* La guarda que decide si dos arboles se pueden comparar.
 *
 * Igual: la FIXTURA —el estado sembrado, las fotos subidas, el marcador—, el entorno, la
 * configuracion de Lighthouse y los viewports. Eso es lo que hace comparable una medida con otra.
 *
 * Distinto: el PRODUCTO. Es lo que se esta midiendo. La primera version exigia docroots identicos
 * byte a byte y, en cuanto hubo un cambio de producto que medir, bloqueo la comparacion que existe
 * justo para eso. Las diferencias del producto se registran como evidencia y la medida sigue.
 *
 * Correccion 17.4.1: `LHC-FIX-03` contaba los ficheros del docroot ENTERO. Con eso, anadir o
 * retirar un fichero del producto —una plantilla nueva, un asset que deja de generarse— rompia
 * la comparacion aunque la fixtura fuera identica. Hoy cuenta solo los de la fixtura, y el numero
 * de ficheros del producto se ensena al lado como lo que es: evidencia.
 *
 * @param {Informe} informe
 * @param {{huella, docHuella, pesos:string}} control
 * @param {{huella, docHuella, pesos:string}} candidato
 * @returns {{medible:boolean, cambiosProducto:string[]}}
 */
export function guardaDeFixtura(informe, control, candidato) {
  const dDoc = comparaDocroots(control.docHuella, candidato.docHuella);
  informe.comprueba('LHC-FIX-01', 'control y candidato comparten la MISMA fixtura, fichero a fichero',
    dDoc.fixtura.iguales,
    `distintos: ${dDoc.fixtura.distintos.join(', ') || '(ninguno)'}`
    + ` | solo control: ${dDoc.fixtura.soloA.join(', ') || '(ninguno)'}`
    + ` | solo candidato: ${dDoc.fixtura.soloB.join(', ') || '(ninguno)'}`);
  informe.comprueba('LHC-FIX-02', 'coinciden el estado sembrado, el podio y el hash de la fixtura',
    control.huella.hashFixtura === candidato.huella.hashFixtura
    && control.huella.hashEstado === candidato.huella.hashEstado
    && JSON.stringify(control.huella.podio) === JSON.stringify(candidato.huella.podio),
    `fixtura ${control.huella.hashFixtura.slice(0, 12)} / ${candidato.huella.hashFixtura.slice(0, 12)}`
    + ` · estado ${control.huella.hashEstado.slice(0, 12)} / ${candidato.huella.hashEstado.slice(0, 12)}`);
  informe.comprueba('LHC-FIX-03', 'el numero de ficheros de la FIXTURA es el mismo',
    control.huella.ficherosFixtura === candidato.huella.ficherosFixtura,
    `fixtura ${control.huella.ficherosFixtura} / ${candidato.huella.ficherosFixtura}`
    + ` · producto ${control.huella.ficherosDocroot - control.huella.ficherosFixtura}`
    + ` / ${candidato.huella.ficherosDocroot - candidato.huella.ficherosFixtura} (puede diferir)`);
  informe.comprueba('LHC-FIX-04', 'portada, banner y banderas pesan y se llaman igual en los dos',
    control.pesos === candidato.pesos, `${control.pesos} || ${candidato.pesos}`);

  /* La evidencia: que ficheros del producto difieren. No es un fallo; es el motivo de medir. */
  const cambiosProducto = [...dDoc.producto.distintos, ...dDoc.producto.soloA, ...dDoc.producto.soloB];
  const detalla = (etiqueta, lista) => (lista.length ? ` | ${etiqueta}: ${lista.join(', ')}` : '');
  informe.pass('LHC-PROD-01', 'diferencias de producto entre control y candidato (evidencia)',
    cambiosProducto.length
      ? `${cambiosProducto.length} fichero(s)`
        + detalla('modificados', dDoc.producto.distintos)
        + detalla('solo en el control', dDoc.producto.soloA)
        + detalla('solo en el candidato', dDoc.producto.soloB)
      : 'ninguna: control y candidato sirven el mismo producto');

  if (!dDoc.fixtura.iguales) {
    informe.fail('LHC-FIX-05', 'no se mide: las dos fixturas no son la misma',
      'medir dos estados distintos y llamarlo comparacion es peor que no medir');
    return { medible: false, cambiosProducto };
  }
  return { medible: true, cambiosProducto };
}

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
    const guarda = guardaDeFixtura(informe, {
      huella: fControl.huella, docHuella: fControl.docHuella, pesos: pesosDeFixtura(fControl.docroot),
    }, {
      huella: fCandidato.huella, docHuella: fCandidato.docHuella, pesos: pesosDeFixtura(fCandidato.docroot),
    });
    if (!guarda.medible) return null;
    const { cambiosProducto } = guarda;

    /* ---- medicion INTERCALADA ---- */
    const [dControl, dCandidato] = await medirIntercalado(informe, fControl, fCandidato);

    /* Y todo lo que ademas tiene que coincidir para que la comparacion valga: entorno, navegador,
       parametros de Lighthouse, viewports, PHP y Node. */
    const incomparables = condicionesIncomparables(dControl, dCandidato);
    informe.comprueba('LHC-COND-01', 'entorno, configuracion, viewports y fixtura identicos en las dos medidas',
      incomparables.length === 0, incomparables.join(' | ') || JSON.stringify(dControl.huella));
    if (incomparables.length) {
      informe.fail('LHC-COND-02', 'no se compara: las condiciones de medida no son las mismas',
        incomparables.join(' | '));
      return null;
    }

    /* El número de peticiones, exigido igual antes de mirar tiempos. */
    for (const perfil of Object.keys(dControl.medidas)) {
      const a = dControl.medidas[perfil]; const b = dCandidato.medidas[perfil];
      informe.comprueba(`LHC-PET-${perfil}`, `${perfil}: mismo numero de peticiones`,
        a.peticiones === b.peticiones, `${a.peticiones} / ${b.peticiones}`);
    }

    const regresiones = comparar(informe, dCandidato.medidas, { medidas: dControl.medidas },
      { titulo: `el control ${commitControl}`, prefijo: 'LHC-CMP' });

    /* Los recursos pedidos. Si el producto es el MISMO, la lista tiene que ser identica: dos
       cargas de la misma pagina que piden cosas distintas son una fixtura que no es determinista.
       Si el producto cambio, la lista puede cambiar —es lo que hace un cambio de producto— y se
       registra como evidencia con su delta de bytes. Lo que no se mueve en ningun caso es el
       NUMERO de peticiones (`LHC-PET-*`) ni los bytes locales (`LHC-CMP-*`), los dos con
       tolerancia cero. */
    const productoIgual = cambiosProducto.length === 0;
    const difRec = diferenciaManifiestos(dControl.manifiestos, dCandidato.manifiestos);
    for (const perfil of Object.keys(difRec)) {
      const d = difRec[perfil];
      const iguales = d.soloEnA.length === 0 && d.soloEnB.length === 0;
      const detalle = `solo en el control: ${d.soloEnA.join(', ') || '(ninguno)'}`
        + ` | solo en el candidato: ${d.soloEnB.join(', ') || '(ninguno)'}`
        + ` | bytes ${d.bytesA} -> ${d.bytesB} (${d.bytesB - d.bytesA >= 0 ? '+' : ''}${d.bytesB - d.bytesA})`;
      if (productoIgual) {
        informe.comprueba(`LHC-REC-${perfil}`,
          `${perfil}: mismo producto, luego los recursos pedidos tienen que ser los mismos`,
          iguales, detalle);
      } else if (iguales) {
        informe.pass(`LHC-REC-${perfil}`, `${perfil}: los recursos pedidos son los mismos`, detalle);
      } else {
        informe.pass(`LHC-REC-${perfil}`,
          `${perfil}: los recursos cambian y los explica el cambio de producto (evidencia)`,
          `${detalle} | producto distinto en: ${cambiosProducto.join(', ')}`);
      }
    }
    return {
      control: dControl, candidato: dCandidato, regresiones, diferenciaRecursos: difRec,
      cambiosProducto, commitControl, identidadControl: idControl, identidadCandidato: idCandidato,
      /* La comparacion contemporanea es valida como arbitro solo si de verdad se hizo entera. */
      valida: regresiones.length === 0 && Object.keys(dControl.medidas).length === PERFILES.length,
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
export function gateBaseline(informe, { medidas, huellaCandidato, base, arbitro = null }) {
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

  /* ---- La comparacion historica, perfil a perfil ----
   *
   * La linea base se midio otro dia. Entre aquel dia y hoy la maquina ha cambiado de temperatura,
   * de carga y de version de todo lo que no esta en la huella, y eso mueve los TIEMPOS sin que el
   * producto haya cambiado. Lo que no se mueve solo es el numero de peticiones, los bytes, el CLS
   * ni las puntuaciones.
   *
   * Por eso: si la diferencia historica es SOLO de tiempos y existe una medida contemporanea del
   * control —hecha hoy, intercalada, en esta misma maquina— que sale limpia, manda la
   * contemporanea. El numero historico NO desaparece: se sigue enseñando entero, con su delta, y
   * la razon por la que no cuenta como gate. Cualquier otra diferencia sigue siendo roja. */
  informe.seccion('lighthouse: comparacion con la linea base guardada');
  const regresiones = [];
  let arbitradas = 0;
  for (const perfil of Object.keys(medidas)) {
    const b = base.medidas[perfil];
    if (!b) {
      informe.fail(`LHB-CMP-${perfil}`, `comparacion de ${perfil}`, 'la linea base no tiene este perfil');
      continue;
    }
    const deltas = deltasDePerfil(medidas[perfil], b);
    const problemas = deltas.map((x) => x.texto);
    if (!problemas.length) {
      informe.pass(`LHB-CMP-${perfil}`, `${perfil} dentro de las tolerancias frente a la linea base`);
      continue;
    }
    if (soloTiempos(deltas) && arbitro && arbitro.valida) {
      /* Ni PASS ni fallo escondido: se declara que este gate no aplica aqui, con el delta a la
         vista y diciendo quien arbitra. */
      informe.noAplica(`LHB-CMP-${perfil}`,
        `${perfil}: diferencia historica solo de tiempos, arbitrada por la medida contemporanea`,
        `${problemas.join(' | ')} — el control medido hoy e intercalado sale dentro de tolerancia`);
      arbitradas += 1;
      regresiones.push({ perfil, problemas, deltas, arbitrada: true });
      continue;
    }
    informe.fail(`LHB-CMP-${perfil}`, `${perfil} dentro de las tolerancias frente a la linea base`,
      problemas.join(' | ') + (soloTiempos(deltas) ? ' — sin medida contemporanea que lo arbitre' : ''));
    regresiones.push({ perfil, problemas, deltas, arbitrada: false });
  }
  if (arbitradas) {
    informe.pass('LHB-ARB', `${arbitradas} perfil(es) con diferencia historica solo de tiempos, arbitrados`,
      'el gate vigente es el control medido hoy, intercalado y en esta misma maquina');
  }
  return { modo: 'comparado', regresiones, arbitradas };
}
