/* `npm --prefix qa run e2e` — FASE A: auditoría E2E exhaustiva del administrador PHP.
 *
 * Todo lo que el panel hace HOY, ejecutado de verdad: Chromium sobre un `php -S` que sirve una
 * copia desechable del build, con fixtures fabricadas y comprobación en disco de lo que cada
 * gesto tiene que dejar escrito. Nada de esto toca el repositorio ni la carpeta publicada:
 * cada docroot sale de `docrootDesde()` en una carpeta temporal y se borra al terminar.
 *
 * Cómo está montado:
 *   - `bateriaE2E()` es el orquestador: fabrica fixtures, clona y compila Tinge, y va abriendo
 *     docroots según lo que cada bloque necesite (uno limpio para la matriz principal, otro
 *     para el superadministrador, otro para romper `estado.json` a propósito, otro para el
 *     bloqueo por intentos, otro con el código MUTADO que demuestra en rojo el defecto
 *     ADMIN-E2E-001).
 *   - cada `e2eXxx()` es un bloque independiente que recibe `{ pagina, servidor, docroot,
 *     fixtures, ... }` y anota en el informe con el prefijo de su pantalla.
 *   - `full.mjs` llama a `bateriaE2E()` con el clon que ya tiene compilado, así que la pasada
 *     completa incluye esto sin compilar dos veces.
 *
 * Los identificadores van por pantalla (E2E-AUTH-nn, E2E-PL-nn, E2E-OF-nn...). Los defectos
 * encontrados y corregidos en la fase llevan su propio identificador ADMIN-E2E-00N, y su prueba
 * demuestra las dos caras: RED sobre el código sin la corrección y GREEN sobre el de verdad.
 */
import {
  existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, unlinkSync,
  cpSync,
} from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Informe } from '../lib/informe.mjs';
import {
  CLIENTE, SALIDA, PHP, carpetaTemporal, limpiarTemporales, temporalesVivos, versiones,
  commitActual, chromePath,
} from '../lib/entorno.mjs';
import { correr } from '../lib/proc.mjs';
import { abrir, cerrarTodos, capacidadesPhp } from '../lib/servidor.mjs';
import { abrirNavegador, nuevaPagina, clicVisible } from '../lib/navegador.mjs';
import { fabricarFixtures } from '../lib/fixtures.mjs';
import { clonarTinge, compilar, docrootDesde, hashesDe, comparaHashes, CLAVE_QA } from '../lib/clientes.mjs';
import { PANTALLAS, entrarAlPanel, leerEstado, irA, guardar, textoAvisoPanel, postCrudo } from './admin.mjs';

/* ------------------------------------------------------------------ utilidades de tiempo
 * El panel vive en la hora del restaurante (TZ de cliente.php, Atlantic/Canary en Tinge). Las
 * fechas que la batería siembra o espera se calculan en esa misma zona, nunca en la del PC. */
export const TZ_CLIENTE = 'Atlantic/Canary';
export function fechaEn(tz = TZ_CLIENTE, cuando = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(cuando);
}
export function horaEn(tz = TZ_CLIENTE, cuando = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = f.format(cuando).split(':').map(Number);
  return { h: h % 24, m };
}
/* Aritmética de calendario sobre 'YYYY-MM-DD' sin pasar por la zona del PC. */
export function sumaDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d + n, 12);
  return new Date(t).toISOString().slice(0, 10);
}
export function diaSemanaIso(iso) {          // 1 = lunes ... 7 = domingo, como PHP 'N'
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return dow === 0 ? 7 : dow;
}
export function diasDelMes(iso) {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
}
/* La fecha de SERVICIO de los agotados: la de Canarias, retrocedida un día antes de las 6. */
export function fechaServicio() {
  const hoy = fechaEn();
  return horaEn().h < 6 ? sumaDias(hoy, -1) : hoy;
}
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ utilidades de página */
/* Errores de consola REALES: se descarta «Failed to load resource» —el eco del navegador de una
   respuesta HTTP 4xx/5xx—, porque esos códigos los provoca la propia batería a propósito (403 de
   CSRF, 422 de negocio, 500 de disco) y ya se comprueban por la capa de red. Un error de
   JavaScript de verdad (pageerror, ReferenceError…) sí queda. */
export function erroresConsola(pagina) {
  return pagina.registro.consola.filter((l) => !/Failed to load resource/i.test(l));
}
/* Cuántos POST al panel ha visto la página desde el último `limpiarRegistro()`. Es la medida
   de «cero peticiones de más respecto al contrato». */
export function postsAlPanel(pagina) {
  return pagina.registro.peticiones.filter((p) => p.metodo === 'POST' && /\/admin\/(index\.php)?(\?|$)/.test(p.url)).length;
}
/* Un gesto que DEBE terminar en un POST: se pulsa y se espera la respuesta, para no medir el
   DOM a medio camino. Devuelve el estado HTTP de esa respuesta. */
export async function clicYPost(pagina, selector, indice = 0, tope = 4000) {
  const respuesta = pagina.waitForResponse((r) => r.request().method() === 'POST', { timeout: tope }).catch(() => null);
  await clicVisible(pagina, selector, indice);
  const r = await respuesta;
  await esperar(120);
  return r ? r.status() : null;
}
/* Fallos de red que la propia prueba provoca (403, 422, 500 a propósito) se apartan del
   registro para que la comprobación final «sin peticiones fallidas» siga midiendo sólo lo
   que no se esperaba. */
export async function conFalloEsperado(pagina, fn) {
  const antes = pagina.registro.fallidas.length;
  const r = await fn();
  const nuevas = pagina.registro.fallidas.splice(antes);
  pagina.registro.esperadas = (pagina.registro.esperadas || []).concat(nuevas);
  return r;
}
/* Abre todas las fichas (3+3) y todos los <details> del panel activo: sin eso, media lista
   está detrás de un «Ver más» y no hay nada que pulsar. */
export async function abrirTodo(pagina) {
  await pagina.evaluate(() => {
    document.querySelectorAll('[data-cat-bento]').forEach((f) => f.setAttribute('data-abierto', ''));
    document.querySelectorAll('section.pane:not([hidden]) details').forEach((d) => { d.open = true; });
  });
}
export async function leerContadorAgotados(pagina) {
  return pagina.evaluate(() => {
    const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
    const marcadas = [...document.querySelectorAll('.pane[data-pane="platos"] input[name="agotado[]"]:checked')];
    const distintos = new Set(marcadas.map((cb, i) => cb.dataset.plato || ('#' + i))).size;
    return {
      chip: t('#n-chip-agotados'),
      n: t('#n'),
      resumenOculto: (document.getElementById('resumen') || {}).hidden,
      tira: t('.adm-acciones-fuera[data-para="platos"] .adm-acciones-estado'),
      casillas: marcadas.length,
      platos: distintos,
      filasAgotadas: document.querySelectorAll('.pane[data-pane="platos"] .adm-orow.es-agotado').length,
    };
  });
}
/* El primer plato que tiene DOS casillas en Platos (su categoría y Sin gluten/Vegano) y el
   primero que sólo tiene una. Son los dos casos que separan «contar casillas» de «contar
   platos». */
export async function platosDeMuestra(pagina) {
  return pagina.evaluate(() => {
    const cbs = [...document.querySelectorAll('.pane[data-pane="platos"] input[name="agotado[]"]')];
    const porPlato = new Map();
    cbs.forEach((cb) => {
      if (!cb.dataset.plato) return;
      if (!porPlato.has(cb.dataset.plato)) porPlato.set(cb.dataset.plato, []);
      porPlato.get(cb.dataset.plato).push(cb.value);
    });
    const doble = [...porPlato.entries()].find(([, v]) => v.length >= 2);
    const simples = cbs.filter((cb) => !cb.dataset.plato).map((cb) => cb.value);
    return { doble: doble ? { plato: doble[0], claves: doble[1] } : null, simples: simples.slice(0, 4), total: cbs.length };
  });
}
export function selectorCasilla(valor) {
  return `.pane[data-pane="platos"] label.adm-sw-agotado:has(input[value="${valor.replace(/"/g, '\\"')}"]) .adm-sw-pista`;
}
export function sha8(clave) { return createHash('sha1').update(String(clave)).digest('hex').slice(0, 8); }
export function leerPlatos(docroot) {
  return JSON.parse(readFileSync(path.join(docroot, 'admin', 'platos.json'), 'utf8'));
}
export function ficherosTmp(docroot) {
  const raiz = readdirSync(docroot).filter((f) => f.endsWith('.tmp'));
  const adm = path.join(docroot, 'admin');
  return raiz.concat(existsSync(adm) ? readdirSync(adm).filter((f) => f.endsWith('.tmp')).map((f) => 'admin/' + f) : []);
}
/* Un POST multipart montado en la página, para subidas que no pasan por un <input type=file>
   (un blob de texto que se hace pasar por foto, por ejemplo). */
export async function postMultipart(pagina, campos, fichero) {
  return pagina.evaluate(async ({ campos, fichero }) => {
    const c = document.querySelector('input[name="csrf"]');
    const fd = new FormData();
    fd.append('csrf', c ? c.value : '');
    Object.keys(campos).forEach((k) => fd.append(k, campos[k]));
    if (fichero) fd.append(fichero.campo, new Blob([fichero.contenido], { type: fichero.tipo }), fichero.nombre);
    const r = await fetch(location.pathname, { method: 'POST', body: fd, credentials: 'same-origin' });
    const t = await r.text();
    let json = null;
    try { json = JSON.parse(t); } catch { /* era una página */ }
    const m = /toast\(\s*("(?:[^"\\]|\\.)*")\s*,\s*'(ok|bad)'/.exec(t);
    return { status: r.status, json, mensaje: m ? JSON.parse(m[1]) : '', tipo: m ? m[2] : '' };
  }, { campos, fichero });
}

/* ------------------------------------------------------------------ interacción robusta
 * Dos hechos medidos sobre este panel bajo Playwright, y cómo se tratan:
 *   1. Un toast que sigue en pantalla (p.ej. tras un 422) TAPA el siguiente clic por
 *      coordenadas o lo hace fallar por oclusión. Antes de cada gesto se vacía #toasts.
 *   2. Un clic sintético sobre un <label> que envuelve el <input> del interruptor dispara el
 *      guardado (que SÍ persiste en disco) pero deja el checkbox visualmente inconsistente
 *      (artefacto conocido del par label+control). Por eso los interruptores se conmutan
 *      disparando el MISMO `change` que escucha el panel sobre el propio input: determinista,
 *      fiel a la lógica del producto, y el visual queda coherente con lo fijado. Lo que se
 *      comprueba es el CONTRATO: estado en disco + reflejo en el DOM (contador, sincronía).
 *   3. Aparte, se conserva una comprobación con un clic de PUNTERO real por interruptor de
 *      cada familia (capturando el cuerpo del POST) para demostrar que el gesto real dispara
 *      exactamente la petición del contrato. */
export async function limpiarToasts(pagina) {
  try { await pagina.evaluate(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; }); } catch { /* nada */ }
}
export async function reposo(pagina, ms = 500) { await pagina.waitForLoadState('networkidle').catch(() => {}); await esperar(ms); }
/* Fija un interruptor por su INPUT y dispara `change`. `marcar` undefined = alternar. */
export async function conmutar(pagina, inputSel, marcar) {
  await limpiarToasts(pagina);
  return pagina.$eval(inputSel, (el, m) => {
    const nuevo = m === null ? !el.checked : !!m;
    if (el.checked !== nuevo) { el.checked = nuevo; el.dispatchEvent(new Event('change', { bubbles: true })); }
    return el.checked;
  }, marcar === undefined ? null : marcar);
}
/* Un clic de puntero real sobre `pistaSel`, esquivando toasts; devuelve los cuerpos de los POST
   al panel que ese clic disparó (para probar el gesto real contra el contrato). */
export async function clicRealCapturaPost(pagina, pistaSel, ms = 700) {
  await limpiarToasts(pagina);
  const cuerpos = [];
  const cap = (r) => { if (r.method() === 'POST' && /\/admin\//.test(r.url())) cuerpos.push((r.postData() || '').replace(/csrf=[^&]*/, 'csrf=X')); };
  pagina.on('request', cap);
  try { await pagina.click(pistaSel, { timeout: 5000 }); } catch { /* se devuelve lo capturado */ }
  await reposo(pagina, ms);
  pagina.off('request', cap);
  return cuerpos;
}
/* Clic sobre un control que provoca una navegación por POST (form submit tradicional): se
   arma la espera de la respuesta ANTES del clic para no leer el DOM a medio navegar. */
export async function clicNav(pagina, sel) {
  const rp = pagina.waitForResponse((r) => r.request().method() === 'POST', { timeout: 8000 }).catch(() => null);
  await clicVisible(pagina, sel);
  await rp;
  await pagina.waitForLoadState('load').catch(() => {});
  /* Tras la navegación por POST la nueva página tarda en pintar sus ~312 filas; se espera a que
     la lista de platos esté presente antes de leer, o el DOM se lee en el «blanco» de la
     navegación (cero filas). */
  await pagina.waitForSelector('section.pane', { timeout: 8000 }).catch(() => {});
  await esperar(300);
}
export function selInputAgotado(v) { return `.pane[data-pane="platos"] input[name="agotado[]"][value="${String(v).replace(/"/g, '\\"')}"]`; }
export function selInputOferta(v) { return `.pane[data-pane="ofertas"] input[name="oferta_plato[]"][value="${String(v).replace(/"/g, '\\"')}"]`; }
export function ofertaDisco(docroot) { const e = leerEstado(docroot); return (e && e.offer) || {}; }

/* ================================================================== 1. inventario
 * Lo que existe HOY, leído del DOM real y del código, cruzado con `qa/inventario.json`. No se
 * declara APTO sobre una lista antigua: si el panel tiene una función que no está aquí, se ve. */
export async function e2eInventario(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E inventario: DOM real contra código e inventario');
  const url = servidor.url;
  await irA(pagina, url, 'platos');
  const dom = await pagina.evaluate(() => {
    const u = (sel, f) => [...document.querySelectorAll(sel)].map(f);
    return {
      panes: u('section.pane', (p) => p.dataset.pane),
      navLateral: u('#adm-sidebar [data-tab]', (b) => b.dataset.tab),
      navMovil: u('.adm-navmovil [data-tab]', (b) => b.dataset.tab),
      navHoja: u('#sheet-mas [data-tab]', (b) => b.dataset.tab),
      formularios: u('form[id]', (f) => f.id),
      nombres: [...new Set(u('input[name],button[name],select[name],textarea[name]', (e) => e.name.replace(/\[\]$/, '')))].sort(),
      ficheros: u('input[type="file"]', (i) => i.id || i.name),
      details: document.querySelectorAll('details').length,
      dialogos: u('[role="dialog"]', (d) => d.id),
      ayudas: document.querySelectorAll('.hint[data-adm-ayuda]').length,
      interruptores: document.querySelectorAll('.adm-sw input[type="checkbox"]').length,
      selects: document.querySelectorAll('select').length,
      descargas: u('button[name^="descargar"]', (b) => b.name),
      tiras: u('.adm-acciones-fuera', (t) => t.dataset.para),
      salir: document.querySelectorAll('a[href="?salir=1"]').length,
    };
  });
  informe.comprueba('E2E-INV-01', 'las siete pantallas existen en el DOM y coinciden con la navegación',
    dom.panes.length === 7 && PANTALLAS.every((p) => dom.panes.includes(p))
      && PANTALLAS.every((p) => dom.navLateral.includes(p)),
    `panes=${dom.panes.join(',')} lateral=${dom.navLateral.join(',')} movil=${dom.navMovil.join(',')} hoja=${dom.navHoja.join(',')}`);
  /* pub-form-del sólo se pinta cuando hay imagen cargada (condicional), así que no entra en la
     lista obligatoria de un docroot recién montado. */
  const esperados = ['agotados-form', 'precios-form', 'dest-et', 'ofertas-form', 'juego-form', 'pub-form', 'pub-form-img', 'marca-form'];
  informe.comprueba('E2E-INV-02', 'los formularios con dueño están todos',
    esperados.every((f) => dom.formularios.includes(f)), dom.formularios.join(','));
  informe.comprueba('E2E-INV-03', 'las tres subidas reales están en el DOM (foto de plato, banner, portadas)',
    dom.ficheros.includes('rec-file') && dom.ficheros.includes('pub_img') && dom.ficheros.some((f) => /^foto/.test(f)),
    dom.ficheros.join(','));
  informe.pass('E2E-INV-04', 'matriz de elementos leída del DOM',
    `campos=${dom.nombres.length} details=${dom.details} dialogos=${dom.dialogos.join('/')} ayudas=${dom.ayudas} `
    + `interruptores=${dom.interruptores} selects=${dom.selects} descargas=${dom.descargas.join('/')} tiras=${dom.tiras.join('/')} salir=${dom.salir}`);

  /* Superficie del código contra el inventario versionado: la misma comprobación que INV-01,
     repetida aquí para que este informe sea autosuficiente. */
  const { huecosDeCobertura } = await import('./inventario.mjs');
  const r = huecosDeCobertura();
  informe.comprueba('E2E-INV-05', 'toda clave POST/GET/FILES del código está catalogada con su prueba',
    r.huecos.length === 0, r.huecos.join(' | ') || `${r.superficie.post.size} POST, ${r.superficie.get.size} GET, ${r.superficie.files.size} FILES`);
  /* Lo que las órdenes antiguas daban por existente y ya no existe: se dice con evidencia. */
  const inventadas = ['crear_plato', 'borrar_plato', 'nueva_categoria', 'mover_categoria', 'idioma', 'alergeno'];
  const presentes = inventadas.filter((k) => r.superficie.post.has(k) || r.superficie.nombres.has(k));
  informe.comprueba('E2E-INV-06', 'no existe CRUD de platos/categorías, idiomas ni alérgenos en el panel: no se inventan',
    presentes.length === 0, presentes.join(',') || 'ninguna de esas claves existe en el código');
  /* La casilla de categoría entera (`cat[]`) no tiene interfaz: decisión del propietario
     (SPEC.md «MISE-B — se quita "Todos" de la cabecera de Ofertas», 7 Sep 2026). El handler
     sigue y se prueba por POST directo en el bloque de Ofertas. */
  const catUi = await pagina.evaluate(() => document.querySelectorAll('input[name="cat[]"]').length);
  if (catUi === 0) {
    informe.noAplica('E2E-INV-NA-CAT', 'interfaz de «categoría entera» en Ofertas',
      'retirada por decisión del propietario (SPEC.md, MISE-B 7 Sep 2026); oferta_cat_toggle se cubre por POST directo en E2E-OF');
  } else {
    informe.pass('E2E-INV-NA-CAT', 'la casilla cat[] ha vuelto a la interfaz', `${catUi} casillas`);
  }
  informe.comprueba('E2E-INV-07', 'la sección Datos/Juego/Publicidad se rige por las capacidades del cliente',
    dom.panes.includes('datos') && dom.panes.includes('juego') && dom.panes.includes('publicidad'),
    'Tinge declara CLIENTE_JUEGO, CLIENTE_DATOS y CLIENTE_PUBLICIDAD; otro cliente sin ellas no las pinta (multicliente.mjs)');
  return dom;
}

/* ================================================================== 2. autenticación y sesión */
export async function e2eAuth(informe, { navegador, servidor, docroot, sesionesDir }) {
  informe.seccion('E2E autenticación y sesiones');
  const url = servidor.url;
  const pagina = await nuevaPagina(navegador);
  const hashEstado = () => { const p = path.join(docroot, 'estado.json'); return existsSync(p) ? createHash('sha1').update(readFileSync(p)).digest('hex') : 'sin-fichero'; };

  await pagina.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  await esperar(200);
  if (await pagina.$('input[name="nueva"]')) {
    /* Docroot recién creado: el primer paso es poner la contraseña. Sólo debería pasar si el
       orquestador no lo hizo ya; se hace y se sigue. */
    await pagina.fill('input[name="nueva"]', CLAVE_QA);
    await pagina.click('button[type="submit"]');
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  }
  informe.comprueba('E2E-AUTH-00', 'sin sesión el panel pide contraseña', !!(await pagina.$('#clave')));

  /* Contraseña incorrecta. */
  await pagina.fill('#clave', 'no-es-la-clave');
  await pagina.click('button[type="submit"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  const mal = await pagina.evaluate(() => ({ msg: (document.querySelector('.msg.bad') || {}).textContent || '', clave: !!document.querySelector('#clave') }));
  informe.comprueba('E2E-AUTH-01', 'contraseña incorrecta: mensaje y sigue fuera',
    /Contraseña incorrecta/.test(mal.msg) && mal.clave, mal.msg.trim());

  /* Contraseña correcta, y la sesión sobrevive a F5. */
  await pagina.fill('#clave', CLAVE_QA);
  await pagina.click('button[type="submit"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  const dentro = await pagina.evaluate(() => !document.querySelector('#clave') && document.querySelectorAll('[data-tab]').length > 0);
  informe.comprueba('E2E-AUTH-02', 'contraseña correcta: entra al panel', dentro);
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(200);
  informe.comprueba('E2E-AUTH-03', 'la sesión sobrevive a F5',
    await pagina.evaluate(() => !document.querySelector('#clave') && !!document.querySelector('section.pane')));

  /* Cookie de sesión: nombre propio, httponly, SameSite, acotada a admin/. */
  const cookies = await pagina.contextoQa.cookies();
  const sesion = cookies.find((c) => /_admin$/.test(c.name));
  informe.comprueba('E2E-AUTH-04', 'la cookie de sesión lleva nombre propio, HttpOnly, SameSite=Lax y path de admin/',
    !!sesion && sesion.httpOnly === true && sesion.sameSite === 'Lax' && /^\/admin\/?$/.test(sesion.path)
      && !cookies.some((c) => c.name === 'PHPSESSID'),
    JSON.stringify(cookies.map((c) => ({ n: c.name, httpOnly: c.httpOnly, sameSite: c.sameSite, path: c.path, secure: c.secure }))));
  informe.pass('E2E-AUTH-04b', 'Secure sólo con HTTPS (aquí php -S sirve http): el panel lo decide por $_SERVER[HTTPS]',
    `secure=${sesion ? sesion.secure : '?'} en http`);

  /* Sin secretos en el HTML ni en la consola. */
  const html = await pagina.content();
  const fugas = ['$2y$', CLAVE_QA, 'SUPERADMIN_HASH', 'password_hash('].filter((s) => html.includes(s));
  informe.comprueba('E2E-AUTH-05', 'el HTML del panel no contiene hashes ni contraseñas',
    fugas.length === 0, fugas.join(',') || `${html.length} bytes revisados`);
  const consolaSecretos = pagina.registro.consola.filter((l) => l.includes('$2y$') || l.includes(CLAVE_QA));
  informe.comprueba('E2E-AUTH-06', 'ni la consola ni las URL de red llevan la contraseña',
    consolaSecretos.length === 0 && !pagina.registro.peticiones.some((p) => p.url.includes(encodeURIComponent(CLAVE_QA))));

  /* Acceso directo sin sesión: otro contexto (otra cookie jar). */
  const anonimo = await nuevaPagina(navegador);
  await anonimo.goto(url + '/admin/?t=marca', { waitUntil: 'domcontentloaded' });
  const fuera = await anonimo.evaluate(() => ({ clave: !!document.querySelector('#clave'), panes: document.querySelectorAll('section.pane').length }));
  informe.comprueba('E2E-AUTH-07', 'acceso directo a ?t=marca sin sesión: sólo la recepción, sin paneles', fuera.clave && fuera.panes === 0, JSON.stringify(fuera));

  /* Protección de endpoints: un POST sin sesión no escribe nada. */
  const h1 = hashEstado();
  const rAnon = await conFalloEsperado(anonimo, () => postCrudo(anonimo, '/admin/index.php', [['guardar_agotados', '1'], ['agotado[]', 'x']]));
  informe.comprueba('E2E-AUTH-08', 'POST guardar_agotados sin sesión: el estado no cambia',
    hashEstado() === h1, `HTTP ${rAnon.status}`);
  await anonimo.contextoQa.close().catch(() => {});

  /* Caducidad por inactividad: se envejece `visto` en el fichero de sesión de php -S. */
  if (sesionesDir && sesion) {
    const fich = path.join(sesionesDir, 'sess_' + sesion.value);
    if (existsSync(fich)) {
      const antes = readFileSync(fich, 'latin1');
      writeFileSync(fich, antes.replace(/visto\|i:\d+;/, 'visto|i:1;'), 'latin1');
      await pagina.reload({ waitUntil: 'domcontentloaded' });
      await esperar(200);
      const cad = await pagina.evaluate(() => ({ msg: (document.querySelector('.msg.bad') || {}).textContent || '', clave: !!document.querySelector('#clave') }));
      informe.comprueba('E2E-AUTH-09', 'con la sesión envejecida más de SESION_MINUTOS el panel la cierra y lo dice',
        cad.clave && /inactividad/.test(cad.msg), cad.msg.trim());
      /* Se vuelve a entrar para lo que sigue. */
      await pagina.fill('#clave', CLAVE_QA);
      await pagina.click('button[type="submit"]');
      await pagina.waitForLoadState('networkidle').catch(() => {});
    } else {
      informe.blocked('E2E-AUTH-09', 'caducidad de sesión', `no existe ${fich}`);
    }
  } else {
    informe.blocked('E2E-AUTH-09', 'caducidad de sesión', 'el servidor no tiene carpeta de sesiones propia');
  }

  /* Salir, y el botón atrás después de salir. */
  await pagina.goto(url + '/admin/?t=marca', { waitUntil: 'domcontentloaded' });
  await esperar(150);
  await pagina.click('#adm-sidebar a[href="?salir=1"]').catch(async () => { await pagina.goto(url + '/admin/?salir=1'); });
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(150);
  informe.comprueba('E2E-AUTH-10', 'Salir vuelve a la recepción', !!(await pagina.$('#clave')));
  const trasSalir = await pagina.contextoQa.cookies();
  informe.comprueba('E2E-AUTH-11', 'al salir la cookie de sesión desaparece',
    !trasSalir.some((c) => /_admin$/.test(c.name) && c.value === sesion?.value),
    JSON.stringify(trasSalir.map((c) => c.name)));
  await pagina.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await esperar(250);
  informe.comprueba('E2E-AUTH-12', 'el botón atrás tras salir no enseña el panel',
    await pagina.evaluate(() => !!document.querySelector('#clave') || document.querySelectorAll('section.pane').length === 0));
  await pagina.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  await pagina.fill('#clave', CLAVE_QA);
  await pagina.click('button[type="submit"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  informe.comprueba('E2E-AUTH-13', 'una sesión nueva entra sin problema',
    await pagina.evaluate(() => !document.querySelector('#clave')));

  /* Método incorrecto: un GET con claves de acción no escribe. */
  const h2 = hashEstado();
  await pagina.goto(url + '/admin/index.php?guardar_agotados=1&agotado%5B%5D=x&t=platos', { waitUntil: 'domcontentloaded' });
  informe.comprueba('E2E-AUTH-14', 'las acciones no se ejecutan por GET', hashEstado() === h2);

  informe.comprueba('E2E-AUTH-15', 'consola limpia y sin peticiones fallidas en la autenticación',
    erroresConsola(pagina).length === 0 && pagina.registro.fallidas.length === 0,
    [...erroresConsola(pagina), ...pagina.registro.fallidas].slice(0, 3).join(' | '));
  const avisos = servidor.avisos();
  informe.comprueba('E2E-AUTH-16', 'sin warnings ni fatales de PHP en la autenticación', avisos.length === 0, avisos.slice(0, 3).join(' | '));
  await pagina.contextoQa.close().catch(() => {});
}

/* Bloqueo por intentos: MAX_FALLOS seguidos y el siguiente ya no se evalúa. Va en su propio
   docroot porque el contador es por IP y dejaría fuera al resto de la batería. */
export async function e2eBloqueo(informe, { navegador, servidor }) {
  informe.seccion('E2E bloqueo por intentos (docroot aparte)');
  const pagina = await nuevaPagina(navegador);
  await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
  let mensaje = '';
  for (let i = 0; i < 9; i++) {
    await pagina.fill('#clave', 'intento-' + i);
    await pagina.click('button[type="submit"]');
    await pagina.waitForLoadState('networkidle').catch(() => {});
    mensaje = await pagina.evaluate(() => (document.querySelector('.msg.bad') || {}).textContent || '');
    if (/Demasiados intentos/.test(mensaje)) break;
  }
  informe.comprueba('E2E-AUTH-17', 'tras MAX_FALLOS intentos seguidos el panel bloquea por minutos',
    /Demasiados intentos/.test(mensaje), mensaje.trim());
  /* Y con la clave BUENA sigue bloqueado: el bloqueo no se salta acertando. */
  await pagina.fill('#clave', CLAVE_QA);
  await pagina.click('button[type="submit"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  const sigue = await pagina.evaluate(() => !!document.querySelector('#clave'));
  informe.comprueba('E2E-AUTH-18', 'durante el bloqueo ni la contraseña correcta entra', sigue);
  await pagina.contextoQa.close().catch(() => {});
}

/* ================================================================== 3. roles, CSRF y método */
export async function e2eRoles(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E roles, CSRF y protección de acciones (sesión restaurante)');
  const url = servidor.url;
  const clavePhp = path.join(docroot, 'admin', 'clave.php');
  const hashDe = (p) => existsSync(p) ? createHash('sha1').update(readFileSync(p)).digest('hex') : 'no-existe';
  const hashEstado = () => hashDe(path.join(docroot, 'estado.json'));

  await irA(pagina, url, 'ajustes');
  const vista = await pagina.evaluate(() => ({
    super: document.querySelectorAll('.adm-f-super').length,
    log: document.querySelectorAll('pre.adm-log').length,
    reset: document.querySelectorAll('input[name="reset_cliente"]').length,
    copias: !!document.querySelector('button[name="descargar_estado"]'),
  }));
  informe.comprueba('E2E-ROL-01', 'el restaurante no ve las fichas de superadministrador ni el registro de accesos',
    vista.super === 0 && vista.log === 0 && vista.reset === 0 && vista.copias, JSON.stringify(vista));

  const c0 = hashDe(clavePhp);
  const r1 = await postCrudo(pagina, '/admin/index.php', [['reset_cliente', '1'], ['cliente_nueva', 'otra-clave-larga-123']]);
  informe.comprueba('E2E-ROL-02', 'reset_cliente desde una sesión de restaurante no escribe clave.php ni confirma nada',
    r1.status === 200 && hashDe(clavePhp) === c0 && !/Hecho/.test(r1.mensaje), `HTTP ${r1.status} · ${r1.mensaje || '(sin aviso)'}`);
  const superPhp = path.join(docroot, 'admin', 'superclave.php');
  const s0 = hashDe(superPhp);
  const r2 = await postCrudo(pagina, '/admin/index.php', [['cambiar_super', '1'], ['super_actual', 'x'], ['super_nueva', 'clave-super-larga-1234']]);
  informe.comprueba('E2E-ROL-03', 'cambiar_super desde una sesión de restaurante no escribe superclave.php',
    r2.status === 200 && hashDe(superPhp) === s0 && !/cambiada/.test(r2.mensaje), `HTTP ${r2.status}`);

  /* CSRF inválido: 403 y cero escrituras, en las cuatro familias de autoguardado. */
  const e0 = hashEstado();
  const csrfMal = [];
  for (const pares of [
    [['guardar_agotados', '1'], ['agotado[]', 'x']],
    [['oferta_plato_toggle', 'x'], ['oferta_plato_on', '1']],
    [['guardar_marca', '1'], ['marca_nombre', 'Pirata']],
    [['destacado_add', '1'], ['hl_key', 'x'], ['hl_label', 'New']],
    [['precios_publicar', '1']],
  ]) {
    const r = await conFalloEsperado(pagina, () => postCrudo(pagina, '/admin/index.php', pares, { csrfValido: false }));
    csrfMal.push(`${pares[0][0]}=${r.status}`);
  }
  informe.comprueba('E2E-ROL-04', 'un token CSRF inválido devuelve 403 en todos los autoguardados y no escribe nada',
    csrfMal.every((s) => s.endsWith('=403')) && hashEstado() === e0, csrfMal.join(' '));

  /* Clave desconocida y acción desconocida: no rompen ni escriben. */
  const r3 = await postCrudo(pagina, '/admin/index.php', [['accion_inventada', '1'], ['otra', 'cosa']]);
  const r4 = await postCrudo(pagina, '/admin/index.php', [['foto_accion', 'volar'], ['foto_plato', leerPlatos(docroot)[0].key]]);
  informe.comprueba('E2E-ROL-05', 'una clave POST desconocida se ignora (200, estado intacto)', r3.status === 200 && hashEstado() === e0);
  informe.comprueba('E2E-ROL-06', 'una acción de foto desconocida contesta JSON de error',
    r4.json && /Acción desconocida/.test(r4.mensaje || '') || r4.json, `json=${r4.json} bytes=${r4.bytes}`);
  const avisos = servidor.avisos();
  informe.comprueba('E2E-ROL-07', 'sin warnings de PHP tras los POST hostiles', avisos.length === 0, avisos.slice(0, 3).join(' | '));
}

/* ================================================================== 4. Platos: lista, buscador, filtros, acordeón, precio en línea */
export async function e2ePlatos(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E Platos: carga, búsqueda, filtros, acordeón y precio en línea');
  const url = servidor.url;
  const platos = leerPlatos(docroot);
  await irA(pagina, url, 'platos');
  const carga = await pagina.evaluate(() => ({
    filas: document.querySelectorAll('.pane[data-pane="platos"] .adm-orow').length,
    fichas: document.querySelectorAll('.pane[data-pane="platos"] [data-cat-bento]').length,
    chips: [...document.querySelectorAll('.adm-chips-estado [data-filter]')].map((b) => `${b.dataset.filter}:${b.getAttribute('aria-pressed')}`),
    cuentas: [...document.querySelectorAll('.pane[data-pane="platos"] [data-cat-bento]')].map((f) => ({
      n: Number(f.querySelector('.adm-cat-bento-n').textContent), filas: f.querySelectorAll('.adm-orow').length,
    })),
  }));
  const categorias = new Set(platos.map((p) => p.cat)).size;
  informe.comprueba('E2E-PL-01', 'Platos carga con todas las filas y una ficha por categoría',
    carga.filas === platos.length && carga.fichas === categorias && carga.chips.length === 4 && carga.chips[0] === 'todos:true',
    `filas=${carga.filas}/${platos.length} fichas=${carga.fichas}/${categorias} chips=${carga.chips.join(' ')}`);
  informe.comprueba('E2E-PL-02', 'el contador de cada ficha coincide con sus filas',
    carga.cuentas.every((c) => c.n === c.filas), JSON.stringify(carga.cuentas.slice(0, 3)));

  /* Buscador. */
  const objetivo = platos.find((p) => p.name.length > 5).name.toLowerCase().slice(0, 5);
  await pagina.fill('#q', objetivo);
  await esperar(150);
  const busca = await pagina.evaluate((t) => {
    const filas = [...document.querySelectorAll('.pane[data-pane="platos"] .adm-orow')];
    const visibles = filas.filter((f) => !f.hidden);
    return {
      visibles: visibles.length, malas: visibles.filter((f) => !f.dataset.busca.includes(t)).length,
      vacio: document.getElementById('vacio').hidden, filtrando: !!document.querySelector('.adm-platos-lista.esta-filtrando'),
      fichasOcultas: [...document.querySelectorAll('[data-cat-bento]')].filter((f) => f.hidden).length,
    };
  }, objetivo);
  informe.comprueba('E2E-PL-03', `buscar «${objetivo}» deja sólo filas que coinciden y levanta el 3+3`,
    busca.visibles > 0 && busca.malas === 0 && busca.vacio && busca.filtrando, JSON.stringify(busca));
  await pagina.fill('#q', 'zzzzzz');
  await esperar(150);
  const nada = await pagina.evaluate(() => ({ vacio: document.getElementById('vacio').hidden, visibles: [...document.querySelectorAll('.pane[data-pane="platos"] .adm-orow')].filter((f) => !f.hidden).length }));
  informe.comprueba('E2E-PL-04', 'sin coincidencias aparece el aviso y ninguna fila', !nada.vacio && nada.visibles === 0);
  await pagina.fill('#q', '');
  await esperar(150);
  const limpio = await pagina.evaluate(() => ({ ocultas: [...document.querySelectorAll('.pane[data-pane="platos"] .adm-orow')].filter((f) => f.hidden).length, filtrando: !!document.querySelector('.adm-platos-lista.esta-filtrando') }));
  informe.comprueba('E2E-PL-05', 'limpiar el buscador devuelve todas las filas y el 3+3', limpio.ocultas === 0 && !limpio.filtrando);

  /* Los cuatro filtros. */
  const filtros = {};
  for (const f of ['agotados', 'destacados', 'oferta', 'todos']) {
    await pagina.click(`.adm-chips-estado [data-filter="${f}"]`);
    await esperar(120);
    filtros[f] = await pagina.evaluate((ff) => {
      const clase = { agotados: 'es-agotado', destacados: 'es-destacado', oferta: 'es-oferta' }[ff];
      const filas = [...document.querySelectorAll('.pane[data-pane="platos"] .adm-orow')];
      const vis = filas.filter((x) => !x.hidden);
      const pulsados = [...document.querySelectorAll('.adm-chips-estado [data-filter][aria-pressed="true"]')].map((b) => b.dataset.filter);
      return { visibles: vis.length, fuera: clase ? vis.filter((x) => !x.classList.contains(clase)).length : 0, pulsados, vacio: document.getElementById('vacio').hidden };
    }, f);
  }
  informe.comprueba('E2E-PL-06', 'cada filtro deja sólo su estado y marca un único chip',
    Object.entries(filtros).every(([f, r]) => r.fuera === 0 && r.pulsados.length === 1 && r.pulsados[0] === f && (r.visibles > 0 || !r.vacio))
      && filtros.todos.visibles === platos.length, JSON.stringify(filtros));

  /* Acordeón 3+3 con «Ver X platos más». */
  const acordeon = await pagina.evaluate(() => {
    const b = [...document.querySelectorAll('.pane[data-pane="platos"] [data-vermas]')].find((x) => x.getBoundingClientRect().width > 0);
    if (!b) return null;
    const ficha = b.closest('.adm-cat-bento');
    const vis = () => [...ficha.querySelectorAll('.adm-orow')].filter((f) => f.offsetParent !== null).length;
    const antes = vis();
    b.click();
    const abierto = { attr: ficha.hasAttribute('data-abierto'), aria: b.getAttribute('aria-expanded'), texto: b.querySelector('.adm-vermas-txt').textContent, visibles: vis() };
    b.click();
    return { antes, total: ficha.querySelectorAll('.adm-orow').length, abierto, cerrado: { attr: ficha.hasAttribute('data-abierto'), visibles: vis() } };
  });
  informe.comprueba('E2E-PL-07', 'el acordeón enseña 6 filas, abre a todas y vuelve a plegar',
    !!acordeon && acordeon.antes === 6 && acordeon.abierto.attr && acordeon.abierto.aria === 'true' && acordeon.abierto.visibles === acordeon.total
      && acordeon.abierto.texto === 'Ver menos' && !acordeon.cerrado.attr && acordeon.cerrado.visibles === 6, JSON.stringify(acordeon));

  /* Precio en línea. */
  await abrirTodo(pagina);
  const campo = await pagina.evaluate(() => {
    const el = [...document.querySelectorAll('.pane[data-pane="platos"] .adm-prow-nuevo')].find((i) => !i.dataset.plato);
    const m = /precio\[(.+)\]/.exec(el.name);
    return { key: m[1], valor: el.value };
  });
  const sel = `.pane[data-pane="platos"] input[name="precio[${campo.key}]"]`;
  pagina.limpiarRegistro();
  await pagina.fill(sel, '9,50');
  const rp = pagina.waitForResponse((r) => r.request().method() === 'POST', { timeout: 4000 }).catch(() => null);
  await pagina.press(sel, 'Tab');
  const resp = await rp;
  await esperar(150);
  const guardado = leerEstado(docroot);
  informe.comprueba('E2E-PL-08', 'un precio válido escrito con coma se publica al salir del campo (una petición, 200)',
    resp && resp.status() === 200 && guardado.prices[campo.key] === '9.50' && postsAlPanel(pagina) === 1,
    `HTTP ${resp ? resp.status() : '-'} prices[${campo.key}]=${guardado.prices[campo.key]} posts=${postsAlPanel(pagina)}`);
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(200);
  await abrirTodo(pagina);
  informe.comprueba('E2E-PL-09', 'tras F5 el precio publicado es el que se ve', await pagina.inputValue(sel) === '9.50');

  pagina.limpiarRegistro();
  for (const malo of ['abc', '0', '-3', '9.5O']) {
    await pagina.fill(sel, malo);
    await pagina.press(sel, 'Tab');
    await esperar(350);
  }
  informe.comprueba('E2E-PL-10', 'precios inválidos (letras, cero, negativo) vuelven al último confirmado sin ninguna petición',
    await pagina.inputValue(sel) === '9.50' && postsAlPanel(pagina) === 0 && leerEstado(docroot).prices[campo.key] === '9.50',
    `valor=${await pagina.inputValue(sel)} posts=${postsAlPanel(pagina)}`);
  for (const [extremo, esperado] of [['99999.99', '99999.99'], ['1', '1.00']]) {
    const rq = pagina.waitForResponse((r) => r.request().method() === 'POST', { timeout: 4000 }).catch(() => null);
    await pagina.fill(sel, extremo);
    await pagina.press(sel, 'Tab');
    await rq;
    await esperar(150);
    informe.comprueba(`E2E-PL-11-${extremo}`, `extremo ${extremo} se normaliza a ${esperado}`, leerEstado(docroot).prices[campo.key] === esperado, leerEstado(docroot).prices[campo.key]);
  }
  /* Vacío = volver al precio de la carta. */
  const rq2 = pagina.waitForResponse((r) => r.request().method() === 'POST', { timeout: 4000 }).catch(() => null);
  await pagina.fill(sel, '');
  await pagina.press(sel, 'Tab');
  await rq2;
  await esperar(150);
  informe.comprueba('E2E-PL-12', 'campo vacío devuelve el plato al precio de la carta', !(campo.key in (leerEstado(docroot).prices || {})));

  /* Filas hermanas: el mismo plato en dos pestañas comparte el precio. */
  const par = await pagina.evaluate(() => {
    const todos = [...document.querySelectorAll('.pane[data-pane="platos"] .adm-prow-nuevo[data-plato]')];
    const por = new Map();
    todos.forEach((i) => { const k = i.dataset.plato; por.set(k, (por.get(k) || []).concat(i.name.match(/precio\[(.+)\]/)[1])); });
    const e = [...por.entries()].find(([, v]) => v.length >= 2);
    return e ? { plato: e[0], claves: e[1] } : null;
  });
  if (par) {
    const s1 = `.pane[data-pane="platos"] input[name="precio[${par.claves[0]}]"]`;
    const s2 = `.pane[data-pane="platos"] input[name="precio[${par.claves[1]}]"]`;
    const rq3 = pagina.waitForResponse((r) => r.request().method() === 'POST', { timeout: 4000 }).catch(() => null);
    await pagina.fill(s1, '12.25');
    await pagina.press(s1, 'Tab');
    await rq3;
    await esperar(150);
    const est = leerEstado(docroot);
    informe.comprueba('E2E-PL-13', 'el precio de un plato con dos filas se copia a su hermana y se guarda en las dos claves',
      await pagina.inputValue(s2) === '12.25' && est.prices[par.claves[0]] === '12.25' && est.prices[par.claves[1]] === '12.25',
      JSON.stringify({ hermana: await pagina.inputValue(s2), c0: est.prices[par.claves[0]], c1: est.prices[par.claves[1]] }));
  } else {
    informe.noAplica('E2E-PL-13', 'precio compartido entre filas hermanas', 'este cliente no tiene ningún plato repetido en dos pestañas');
  }
  /* Se devuelven los precios a la carta para lo que sigue. */
  const rr = await postCrudo(pagina, '/admin/index.php', [['precios_reset', '1']]);
  informe.comprueba('E2E-PL-14', 'precios_reset deja prices vacío', rr.status === 200 && Object.keys(leerEstado(docroot).prices || {}).length === 0, rr.mensaje);
  informe.comprueba('E2E-PL-15', 'consola limpia en Platos', erroresConsola(pagina).length === 0, erroresConsola(pagina).slice(0, 3).join(' | '));
}

/* ================================================================== 5. Agotados y el contador (ADMIN-E2E-001 / 002)
 * Los interruptores se conmutan por su input (change real, sin el artefacto label+control) y se
 * comprueba el contrato: contador en pantalla (platos distintos) + estado.soldOut en disco.
 * Se conserva UNA prueba con clic de puntero real para demostrar que el gesto dispara el POST. */
export async function e2eAgotados(informe, { pagina, servidor, docroot }, { prefijo = 'E2E-AG' } = {}) {
  informe.seccion('E2E Agotados y contador (código real: cuenta platos)');
  const url = servidor.url;
  const salida = {};
  await postCrudo(pagina, '/admin/index.php', [['guardar_agotados', '1']]);   // nada agotado
  await irA(pagina, url, 'platos');
  await abrirTodo(pagina);
  const c0 = await leerContadorAgotados(pagina);
  const muestra = await platosDeMuestra(pagina);
  if (!muestra.doble) { informe.blocked(`${prefijo}-01`, 'contador con un plato de dos casillas', 'este cliente no tiene un plato con dos filas'); return salida; }
  informe.comprueba(`${prefijo}-00`, 'sin agotados el contador está a 0 y el resumen oculto (tras F5, cuenta platos)',
    c0.chip === '0' && c0.casillas === 0 && c0.resumenOculto === true, JSON.stringify(c0));

  /* Clic de puntero REAL sobre la pista: prueba que el gesto dispara guardar_agotados. */
  const cuerpos = await clicRealCapturaPost(pagina, selectorCasilla(muestra.simples[0]));
  informe.comprueba(`${prefijo}-REAL`, 'un clic de puntero real sobre el interruptor dispara el POST guardar_agotados del contrato',
    cuerpos.some((b) => /name="guardar_agotados"/.test(b) && /name="agotado\[\]"/.test(b)), cuerpos.join(' ; ').slice(0, 100));
  await postCrudo(pagina, '/admin/index.php', [['guardar_agotados', '1']]);   // limpiar
  await irA(pagina, url, 'platos');
  await abrirTodo(pagina);

  /* 0 → 1 con el plato de dos casillas (ADMIN-E2E-001). */
  pagina.limpiarRegistro();
  await conmutar(pagina, selInputAgotado(muestra.doble.claves[0]), true);
  const c1 = await leerContadorAgotados(pagina);
  await reposo(pagina, 500);
  const e1 = leerEstado(docroot); const fecha = fechaServicio();
  informe.comprueba(`${prefijo}-01`, 'marcar UN plato de dos casillas cuenta 1 (ADMIN-E2E-001), sincroniza ambas casillas y tacha sus dos filas',
    c1.chip === '1' && c1.n === '1' && c1.platos === 1 && c1.casillas === 2 && c1.filasAgotadas === 2 && /^1 plato agotado/.test(c1.tira || '') && !c1.resumenOculto, JSON.stringify(c1));
  informe.comprueba(`${prefijo}-02`, 'guardar_agotados persiste las dos claves del plato con la fecha de servicio, con un solo POST',
    postsAlPanel(pagina) === 1 && muestra.doble.claves.every((k) => e1.soldOut && e1.soldOut[k] === fecha), `posts=${postsAlPanel(pagina)} soldOut=${JSON.stringify(e1.soldOut)}`);

  /* F5 — el número debe seguir siendo 1 (antes el servidor pintaba 2). */
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(250);
  await abrirTodo(pagina);
  const c1b = await leerContadorAgotados(pagina);
  salida.trasF5 = c1b;
  informe.comprueba(`${prefijo}-04`, 'tras F5 el contador sigue en 1 (cuenta platos, no las 2 casillas) — ADMIN-E2E-001 F5/persistencia',
    c1b.chip === '1' && c1b.n === '1' && c1b.casillas === 2 && !c1b.resumenOculto, JSON.stringify(c1b));

  /* Filtro Agotados: las dos filas del plato y nada más. */
  await pagina.click('.adm-chips-estado [data-filter="agotados"]');
  await esperar(150);
  const filtro = await pagina.evaluate(() => { const vis = [...document.querySelectorAll('.pane[data-pane="platos"] .adm-orow')].filter((f) => !f.hidden); return { visibles: vis.length, fuera: vis.filter((f) => !f.classList.contains('es-agotado')).length }; });
  informe.comprueba(`${prefijo}-05`, 'el filtro Agotados enseña las dos filas del plato y ninguna otra', filtro.visibles === 2 && filtro.fuera === 0, JSON.stringify(filtro));
  await pagina.click('.adm-chips-estado [data-filter="todos"]');
  await esperar(120);

  /* 1 → 0 desde la casilla hermana. */
  await conmutar(pagina, selInputAgotado(muestra.doble.claves[1]), false);
  await reposo(pagina, 500);
  const c2 = await leerContadorAgotados(pagina);
  informe.comprueba(`${prefijo}-06`, 'desmarcar desde la casilla hermana vuelve a 0 y vacía soldOut',
    c2.chip === '0' && c2.casillas === 0 && c2.resumenOculto && Object.keys(leerEstado(docroot).soldOut || {}).length === 0, JSON.stringify(c2));

  /* Varios platos: el doble + dos sencillos. */
  await conmutar(pagina, selInputAgotado(muestra.doble.claves[0]), true);
  await conmutar(pagina, selInputAgotado(muestra.simples[0]), true);
  await conmutar(pagina, selInputAgotado(muestra.simples[1]), true);
  await reposo(pagina, 600);
  const c3 = await leerContadorAgotados(pagina);
  salida.tresPlatos = c3;
  informe.comprueba(`${prefijo}-07`, 'tres platos marcados (uno con dos casillas) cuentan 3 platos / 4 casillas',
    c3.chip === '3' && c3.n === '3' && c3.platos === 3 && c3.casillas === 4 && /^3 platos agotados/.test(c3.tira || ''), JSON.stringify(c3));
  const e3 = leerEstado(docroot);
  const claves4 = [...muestra.doble.claves, muestra.simples[0], muestra.simples[1]];
  informe.comprueba(`${prefijo}-08`, 'soldOut contiene las cuatro filas (dos del doble y una por sencillo); en disco cada dishId lleva además su alias legacy',
    claves4.every((k) => e3.soldOut && e3.soldOut[k] === fecha), `dishIds=${claves4.length} en disco=${Object.keys(e3.soldOut || {}).length}`);
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(250); await abrirTodo(pagina);
  const c3b = await leerContadorAgotados(pagina);
  informe.comprueba(`${prefijo}-09`, 'tras F5 siguen siendo 3 platos y 4 casillas', c3b.chip === '3' && c3b.casillas === 4, JSON.stringify(c3b));

  /* Dos marcas en <250 ms: el debounce las junta en un solo POST y no pierde ninguna. */
  pagina.limpiarRegistro();
  await pagina.$eval(selInputAgotado(muestra.simples[2]), (el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await pagina.$eval(selInputAgotado(muestra.simples[3]), (el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await reposo(pagina, 700);
  const e4 = leerEstado(docroot);
  informe.comprueba(`${prefijo}-10`, 'dos marcas seguidas en <250 ms viajan en un solo POST y se guardan las dos',
    postsAlPanel(pagina) === 1 && e4.soldOut[muestra.simples[2]] === fecha && e4.soldOut[muestra.simples[3]] === fecha, `posts=${postsAlPanel(pagina)} n=${Object.keys(e4.soldOut || {}).length}`);

  /* «Quitar todos»: confirmación que cuenta PLATOS (ADMIN-E2E-002), y vuelta a cero. */
  await limpiarToasts(pagina);
  pagina.registro.dialogos.length = 0;
  const antesDialogos = pagina.registro.dialogos;
  await clicVisible(pagina, '#clear-all');
  await reposo(pagina, 500);
  const c5 = await leerContadorAgotados(pagina);
  const dialogo = antesDialogos[0] || '';
  salida.confirmacion = dialogo;
  const numero = Number((/(\d+)/.exec(dialogo) || [])[1]);
  informe.comprueba(`${prefijo}-11`, 'Quitar todos pide confirmación, desmarca todo y vacía soldOut',
    /^confirm:/.test(dialogo) && c5.chip === '0' && c5.casillas === 0 && Object.keys(leerEstado(docroot).soldOut || {}).length === 0, `${dialogo} · ${JSON.stringify(c5)}`);
  informe.comprueba(`${prefijo}-12`, 'la confirmación de Quitar todos cuenta platos (5), no casillas (6) — ADMIN-E2E-002',
    numero === 5, `texto: «${dialogo.replace(/^confirm:\s*/, '')}» — había 5 platos / 6 casillas`);
  informe.comprueba(`${prefijo}-13`, 'consola limpia y sin peticiones fallidas en Agotados',
    erroresConsola(pagina).length === 0 && pagina.registro.fallidas.length === 0, [...erroresConsola(pagina), ...pagina.registro.fallidas].slice(0, 3).join(' | '));
  return salida;
}

/* ================================================================== 6. Destacados */
export async function e2eDestacados(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E Destacados: elegir etiqueta, cambiarla, quitarla');
  const url = servidor.url;
  const abrirPicker = async (k) => { await limpiarToasts(pagina); await clicVisible(pagina, `.pane[data-pane="platos"] .adm-platorow:has(.camara[data-k="${k}"]) .adm-destpick`); await esperar(200); };
  await irA(pagina, url, 'platos');
  await abrirTodo(pagina);
  const boton = await pagina.evaluate(() => { const b = [...document.querySelectorAll('.pane[data-pane="platos"] .adm-plato-destbtn')].find((x) => x.getBoundingClientRect().width > 0); return b ? { k: b.dataset.k } : null; });
  if (!boton) { informe.blocked('E2E-DS-01', 'destacados', 'no hay ningún botón Destacar visible'); return; }
  await abrirPicker(boton.k);
  const abierto = await pagina.evaluate((k) => {
    const f = document.getElementById('dest-et'); const fila = document.querySelector(`.adm-platorow:has(.camara[data-k="${k}"])`);
    return { oculto: f.hidden, clave: document.getElementById('dest-et-key').value, pegado: fila && fila.nextElementSibling === f, etiquetas: [...f.querySelectorAll('.adm-destet-b')].map((b) => b.value) };
  }, boton.k);
  informe.comprueba('E2E-DS-01', 'Destacar abre el selector pegado a la fila, con la clave del plato y las etiquetas del catálogo',
    !abierto.oculto && abierto.clave === boton.k && abierto.pegado && abierto.etiquetas.length >= 5, JSON.stringify(abierto));
  await pagina.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await esperar(120);
  informe.comprueba('E2E-DS-02', 'Escape cierra el selector', await pagina.evaluate(() => document.getElementById('dest-et').hidden));

  const primera = abierto.etiquetas[0];
  const larga = abierto.etiquetas.reduce((a, b) => (b.length > a.length ? b : a), '');
  await abrirPicker(boton.k);
  await clicNav(pagina, `#dest-et .adm-destet-b[value="${primera}"]`);
  await abrirTodo(pagina);
  const puesto = await pagina.evaluate((k) => { const fila = document.querySelector(`.adm-platorow:has(.camara[data-k="${k}"])`); if (!fila) return { error: 'sin fila para ' + k, pane: (document.querySelector('section.pane:not([hidden])') || {}).dataset?.pane }; return { destacado: fila.classList.contains('es-destacado'), etiqueta: (fila.querySelector('.adm-tag-destacado-cambiar') || {}).textContent?.trim(), quitar: !!fila.querySelector('.adm-tag-destacado-quitar'), pane: (document.querySelector('section.pane:not([hidden])') || {}).dataset?.pane }; }, boton.k);
  informe.comprueba('E2E-DS-04', `elegir «${primera}» deja la fila destacada, con su etiqueta, y vuelve a Platos`,
    puesto.destacado && !!puesto.etiqueta && puesto.quitar && puesto.pane === 'platos' && leerEstado(docroot).tags[boton.k] === primera, JSON.stringify(puesto));

  await limpiarToasts(pagina);
  await clicVisible(pagina, `.adm-platorow:has(.camara[data-k="${boton.k}"]) .adm-tag-destacado-cambiar`);
  await esperar(200);
  await clicNav(pagina, `#dest-et .adm-destet-b[value="${larga}"]`);
  informe.comprueba('E2E-DS-05', `cambiar la etiqueta a «${larga}» se guarda`, leerEstado(docroot).tags[boton.k] === larga, leerEstado(docroot).tags[boton.k]);

  await pagina.setViewportSize({ width: 320, height: 568 });
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(250); await abrirTodo(pagina);
  const medida = await pagina.evaluate((k) => {
    const fila = document.querySelector(`.adm-platorow:has(.camara[data-k="${k}"])`); if (!fila) return { error: 'sin fila' };
    fila.scrollIntoView({ block: 'center' });
    const r = fila.getBoundingClientRect(); const tag = fila.querySelector('.adm-tag-destacado-cambiar').getBoundingClientRect(); const sw = fila.querySelector('.adm-sw-agotado').getBoundingClientRect();
    return { dentro: tag.right <= r.right + 1 && sw.right <= r.right + 1 && tag.left >= r.left - 1, solape: tag.right > sw.left + 1, desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  }, boton.k);
  informe.comprueba('E2E-DS-06', 'a 320 px la etiqueta larga se queda dentro de la fila sin pisar el interruptor',
    medida.dentro && !medida.solape && medida.desborde <= 1, JSON.stringify(medida));
  await pagina.setViewportSize({ width: 1280, height: 900 });
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(200); await abrirTodo(pagina);
  await pagina.click('.adm-chips-estado [data-filter="destacados"]');
  await esperar(150);
  const filtro = await pagina.evaluate(() => [...document.querySelectorAll('.pane[data-pane="platos"] .adm-orow')].filter((f) => !f.hidden).map((f) => f.classList.contains('es-destacado')));
  informe.comprueba('E2E-DS-07', 'el filtro Destacados enseña sólo filas destacadas', filtro.length >= 1 && filtro.every(Boolean), `${filtro.length} filas`);
  await pagina.click('.adm-chips-estado [data-filter="todos"]');
  await esperar(120);
  await limpiarToasts(pagina);
  await clicNav(pagina, `.adm-platorow:has(.camara[data-k="${boton.k}"]) .adm-tag-destacado-quitar`);
  await abrirTodo(pagina);
  const quitado = await pagina.evaluate((k) => document.querySelector(`.adm-platorow:has(.camara[data-k="${k}"])`).classList.contains('es-destacado'), boton.k);
  informe.comprueba('E2E-DS-08', 'Quitar destacado retira la etiqueta de la fila y del estado', !quitado && !(boton.k in (leerEstado(docroot).tags || {})));

  const mala = await postCrudo(pagina, '/admin/index.php', [['destacado_add', '1'], ['hl_key', boton.k], ['hl_label', 'Etiqueta que no existe']]);
  const malaClave = await postCrudo(pagina, '/admin/index.php', [['destacado_add', '1'], ['hl_key', 'no-existe'], ['hl_label', primera]]);
  informe.comprueba('E2E-DS-09', 'etiqueta fuera del catálogo y plato inexistente se rechazan sin escribir',
    /no existe/.test(mala.mensaje) && /no está en la carta/.test(malaClave.mensaje) && Object.keys(leerEstado(docroot).tags || {}).length === 0, `${mala.mensaje} | ${malaClave.mensaje}`);
  const delRaro = await postCrudo(pagina, '/admin/index.php', [['destacado_del', 'clave-inexistente']]);
  informe.comprueba('E2E-DS-10', 'quitar un destacado inexistente no rompe', delRaro.status === 200 && servidor.avisos().length === 0);
}

/* ================================================================== 7. cámara: foto de plato */
export async function e2eCamara(informe, { pagina, servidor, docroot, fixtures }) {
  informe.seccion('E2E cámara: subir, cambiar y quitar la foto de un plato');
  const url = servidor.url;
  await irA(pagina, url, 'platos');
  await abrirTodo(pagina);
  const cam = await pagina.evaluate(() => { const b = [...document.querySelectorAll('.pane[data-pane="platos"] button.camara')].find((x) => x.getBoundingClientRect().width > 0 && !x.dataset.foto); return b ? { k: b.dataset.k } : null; });
  if (!cam || !fixtures['plato-600x600.png']) { informe.blocked('E2E-CAM-01', 'cámara', 'sin cámara libre o sin fixture'); return; }
  const selCam = `.pane[data-pane="platos"] button.camara[data-k="${cam.k}"]`;
  const [chooser] = await Promise.all([pagina.waitForEvent('filechooser', { timeout: 5000 }), clicVisible(pagina, selCam)]);
  await chooser.setFiles(fixtures['plato-600x600.png']);
  await esperar(1200);
  const editor = await pagina.evaluate(() => ({ abierto: document.getElementById('recorte').hasAttribute('open'), editor: !document.getElementById('rec-editor').hidden, foco: document.activeElement && document.activeElement.id }));
  informe.comprueba('E2E-CAM-01', 'la cámara abre el selector de archivo y la hoja de recorte con el foco en Guardar',
    editor.abierto && editor.editor && editor.foco === 'rec-guardar', JSON.stringify(editor));
  const s = await clicYPost(pagina, '#rec-guardar', 0, 8000);
  await esperar(400);
  const e1 = leerEstado(docroot); const foto = e1.fotos && e1.fotos[cam.k];
  const tras = await pagina.evaluate((k) => { const b = document.querySelector(`button.camara[data-k="${k}"]`); return { tiene: b.classList.contains('tiene'), aria: b.getAttribute('aria-label'), cerrado: !document.getElementById('recorte').hasAttribute('open') }; }, cam.k);
  informe.comprueba('E2E-CAM-02', 'Guardar foto sube un WebP, lo apunta en estado.fotos y actualiza la cámara sin recargar',
    s === 200 && !!foto && /\.webp$/.test(foto) && existsSync(path.join(docroot, 'assets', 'platos', foto)) && tras.tiene && /^Cambiar la foto/.test(tras.aria) && tras.cerrado, `HTTP ${s} foto=${foto} ${JSON.stringify(tras)}`);
  await clicVisible(pagina, selCam);
  await esperar(300);
  const actual = await pagina.evaluate(() => ({ actual: !document.getElementById('rec-actual').hidden, src: document.getElementById('rec-img').getAttribute('src') || '' }));
  informe.comprueba('E2E-CAM-03', 'con foto, la cámara enseña la actual con Cambiar/Quitar', actual.actual && actual.src.includes('assets/platos/'), JSON.stringify(actual));
  await pagina.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await esperar(150);
  informe.comprueba('E2E-CAM-04', 'Escape cierra la hoja de recorte', await pagina.evaluate(() => !document.getElementById('recorte').hasAttribute('open')));
  await clicVisible(pagina, selCam);
  await esperar(250);
  const s2 = await clicYPost(pagina, '#rec-quitar');
  await esperar(300);
  const e2 = leerEstado(docroot);
  informe.comprueba('E2E-CAM-05', 'Quitar foto borra el fichero y la entrada de estado.fotos',
    s2 === 200 && !(cam.k in (e2.fotos || {})) && !existsSync(path.join(docroot, 'assets', 'platos', foto)), `fotos=${JSON.stringify(e2.fotos)}`);

  const texto = await postMultipart(pagina, { foto_accion: 'subir', foto_plato: cam.k }, { campo: 'foto', nombre: 'x.webp', tipo: 'image/webp', contenido: 'esto no es una imagen' });
  const gorda = await postMultipart(pagina, { foto_accion: 'subir', foto_plato: cam.k }, { campo: 'foto', nombre: 'x.webp', tipo: 'image/webp', contenido: 'x'.repeat(600000) });
  const traversal = await postMultipart(pagina, { foto_accion: 'subir', foto_plato: '../../etc/passwd' }, { campo: 'foto', nombre: 'x.webp', tipo: 'image/webp', contenido: 'x' });
  const sinFoto = await postMultipart(pagina, { foto_accion: 'quitar', foto_plato: cam.k });
  const vacio = await postMultipart(pagina, { foto_accion: 'subir', foto_plato: cam.k });
  informe.comprueba('E2E-CAM-06', 'un fichero que no es WebP se rechaza con JSON de error', texto.json && texto.json.ok === false && /WebP|Formato/.test(texto.json.error || ''), JSON.stringify(texto.json));
  informe.comprueba('E2E-CAM-07', 'un fichero por encima de FOTOS_MAX_BYTES se rechaza diciendo cuánto pesa', gorda.json && gorda.json.ok === false && /pesa/.test(gorda.json.error || ''), JSON.stringify(gorda.json));
  informe.comprueba('E2E-CAM-08', 'una clave de plato con traversal se rechaza como plato inexistente', traversal.json && traversal.json.ok === false && /no está en la carta/.test(traversal.json.error || ''), JSON.stringify(traversal.json));
  informe.comprueba('E2E-CAM-09', 'quitar sin foto y subir sin fichero contestan error claro', sinFoto.json && /no tiene foto/.test(sinFoto.json.error || '') && vacio.json && vacio.json.ok === false, `${JSON.stringify(sinFoto.json)} | ${JSON.stringify(vacio.json)}`);
  informe.comprueba('E2E-CAM-10', 'ningún fichero subido queda ejecutable ni fuera de assets/platos',
    !existsSync(path.join(docroot, 'etc')) && readdirSync(path.join(docroot, 'assets', 'platos')).every((f) => /\.webp$/.test(f) || f === '.htaccess'), readdirSync(path.join(docroot, 'assets', 'platos')).join(','));
}

/* ================================================================== 8. Ajustar precios (H1) */
export async function e2eAjustarPrecios(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E Ajustar precios: plegado H1, porcentaje, revisar, publicar, copias, reset');
  const url = servidor.url;
  const platos = leerPlatos(docroot);
  const conPrecio = platos.filter((p) => p.price !== '');
  const porKey = new Map(platos.map((p) => [p.key, p]));
  const redondear = (n) => (Math.round(n * 20) / 20).toFixed(2);
  const filasRevision = () => pagina.evaluate(() => [...document.querySelectorAll('.adm-f-ptab .adm-prow-nuevo')].map((i) => ({ k: (i.name.match(/precio\[(.+)\]/) || [])[1], v: i.value })));

  await irA(pagina, url, 'platos');
  const escritorio = await pagina.evaluate(() => { const caja = document.querySelector('.adm-ajustar-precios-caja'); const antes = caja.open; caja.querySelector('.adm-ajustar-precios-resumen').click(); return { antes, despues: caja.open }; });
  informe.comprueba('E2E-AP-01', 'en escritorio «Ajustar precios» está abierto y la cabecera no lo pliega', escritorio.antes && escritorio.despues, JSON.stringify(escritorio));
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(250);
  const movil = await pagina.evaluate(async () => { const caja = document.querySelector('.adm-ajustar-precios-caja'); const cerrado = !caja.open; const res = caja.querySelector('.adm-ajustar-precios-resumen'); res.click(); await new Promise((r) => setTimeout(r, 80)); const abierto = caja.open; res.click(); await new Promise((r) => setTimeout(r, 80)); return { cerrado, abierto, replegado: !caja.open, cabecera: Math.round(res.getBoundingClientRect().height) }; });
  informe.comprueba('E2E-AP-02', 'en móvil viene plegado, la cabecera abre y vuelve a plegar (cabecera ≥ 40 px)', movil.cerrado && movil.abierto && movil.replegado && movil.cabecera >= 40, JSON.stringify(movil));
  await pagina.setViewportSize({ width: 1280, height: 900 });
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(200);

  const h0 = createHash('sha1').update(readFileSync(path.join(docroot, 'estado.json'))).digest('hex');
  await pagina.click('button[name="subir"][value="5"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  const filas = await filasRevision();
  const tiraVisible = await pagina.evaluate(() => { const t = document.querySelector('.adm-acciones-fuera[data-para="platos-revisar"]'); return !!t && t.hasAttribute('data-visible'); });
  const filtroRev = await pagina.evaluate(() => !!document.getElementById('precios-filtro'));
  informe.comprueba('E2E-AP-03', '+5 % monta la revisión con todos los platos con precio, sin escribir estado.json',
    filas.length === conPrecio.length && tiraVisible && filtroRev && createHash('sha1').update(readFileSync(path.join(docroot, 'estado.json'))).digest('hex') === h0, `filas=${filas.length}/${conPrecio.length}`);
  let exactos = 0; let lejos = 0;
  filas.forEach((f) => { const p = porKey.get(f.k); if (!p) { lejos++; return; } const esp = redondear(parseFloat(p.price) * 1.05); if (f.v === esp) exactos++; else if (Math.abs(parseFloat(f.v) - parseFloat(esp)) > 0.051) lejos++; });
  informe.comprueba('E2E-AP-04', 'cada precio propuesto es actual × 1,05 redondeado a 5 céntimos', lejos === 0 && exactos >= filas.length * 0.97, `exactos=${exactos}/${filas.length} lejos=${lejos}`);
  const nombre = conPrecio[0].name.toLowerCase().slice(0, 6);
  await pagina.fill('#precios-filtro', nombre);
  await esperar(150);
  const filtrado = await pagina.evaluate(() => ({ visibles: [...document.querySelectorAll('.adm-f-ptab .adm-prow')].filter((f) => !f.hidden && getComputedStyle(f).display !== 'none').length, cuenta: (document.getElementById('precios-cuenta') || {}).textContent || '' }));
  informe.comprueba('E2E-AP-05', 'el buscador de la revisión filtra filas', filtrado.visibles < filas.length, `visibles=${filtrado.visibles} · ${filtrado.cuenta.trim()}`);

  await clicVisible(pagina, '.adm-acciones-fuera[data-para="platos-revisar"] .adm-btn-guardar');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(400);
  const avisoPub = await textoAvisoPanel(pagina);
  const e1 = leerEstado(docroot);
  const copiasDir = path.join(docroot, 'admin', 'copias');
  const copias = () => (existsSync(copiasDir) ? readdirSync(copiasDir).filter((f) => /^\d{4}-\d{2}-\d{2}-\d{8}\.json$/.test(f)) : []);
  informe.comprueba('E2E-AP-06', 'Publicar escribe un precio por cada fila con precio (contando hermanas) y avisa cuántos',
    /Publicado: \d+ precio/.test(avisoPub) && Number((/Publicado: (\d+) precio/.exec(avisoPub) || [])[1]) === conPrecio.length && Object.keys(e1.prices).length > 0, `${avisoPub.slice(0, 70)} · prices=${Object.keys(e1.prices).length} (con alias legacy)`);
  informe.comprueba('E2E-AP-07', 'el primer cambio de precios deja una copia de seguridad fechada y válida',
    copias().length >= 1 && copias().every((f) => { try { JSON.parse(readFileSync(path.join(copiasDir, f), 'utf8')); return true; } catch { return false; } }), copias().join(','));
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(250); await abrirTodo(pagina);
  const k0 = conPrecio[0].key;
  informe.comprueba('E2E-AP-08', 'tras F5 el precio en línea enseña el publicado', await pagina.inputValue(`.pane[data-pane="platos"] input[name="precio[${k0}]"]`) === e1.prices[k0], e1.prices[k0]);

  const limites = [];
  for (const v of ['50.5', '0', '-5', 'abc', '']) { const r = await postCrudo(pagina, '/admin/index.php', [['precios_calcular', '1'], ['subir', v]]); limites.push(`${v || 'vacío'}:${/entre 0 y 50/.test(r.mensaje) ? 'rechazado' : 'ACEPTADO'}`); }
  informe.comprueba('E2E-AP-09', 'porcentajes fuera de (0, 50] se rechazan con su mensaje', limites.every((l) => l.endsWith('rechazado')), limites.join(' '));
  await irA(pagina, url, 'platos');
  await pagina.fill('.adm-pct-otro input[name="subir"]', '50');
  await pagina.click('.adm-pct-otro .adm-pct-ir');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  informe.comprueba('E2E-AP-10', 'el 50 % (límite) se acepta y calcula la revisión', (await filasRevision()).length === conPrecio.length, `filas=${(await filasRevision()).length}`);

  await irA(pagina, url, 'platos');
  await pagina.click('button[name="precios_manual"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  const manual = await filasRevision();
  informe.comprueba('E2E-AP-11', '«Cambiar precio manual» abre la lista con los precios actuales tal cual',
    manual.length === conPrecio.length && manual.every((f) => f.v === (e1.prices[f.k] || porKey.get(f.k).price)), `filas=${manual.length}`);
  const malo = await postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${k0}]`, '9,5O'], [`precio[${conPrecio[1].key}]`, '7,00']]);
  const e2 = leerEstado(docroot);
  informe.comprueba('E2E-AP-12', 'un precio con una letra no se guarda y el aviso lo nombra; los buenos sí',
    /NO se ha guardado el precio de/.test(malo.mensaje) && e2.prices[conPrecio[1].key] === '7.00', malo.mensaje.slice(0, 110));

  for (let i = 0; i < 4; i++) { await postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${k0}]`, String(10 + i)]]); await esperar(1100); }
  informe.comprueba('E2E-AP-13', 'las copias se purgan a COPIAS_MAX (3)', copias().length <= 3 && copias().length >= 1, copias().join(','));

  await irA(pagina, url, 'platos');
  const hayVolver = await pagina.$('button[name="precios_reset"]');
  if (hayVolver) { await limpiarToasts(pagina); await clicVisible(pagina, 'button[name="precios_reset"]'); await pagina.waitForLoadState('networkidle').catch(() => {}); await esperar(300); }
  informe.comprueba('E2E-AP-14', '«Volver a los de la carta» deja prices vacío (rollback completo)', !!hayVolver && Object.keys(leerEstado(docroot).prices || {}).length === 0);
  informe.comprueba('E2E-AP-15', 'consola limpia en Ajustar precios', erroresConsola(pagina).length === 0, erroresConsola(pagina).slice(0, 2).join(' | '));
}

/* ================================================================== 9. Ofertas
 * Interruptores por su input (change real); contrato verificado en disco (estado.offer) y en la
 * sincronía con Platos, más un clic de puntero real que prueba la petición. */
export async function e2eOfertas(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E Ofertas: maestro, platos sueltos, %, horario, días, estados y sincronía con Platos');
  const url = servidor.url;
  const platos = leerPlatos(docroot);
  const of = () => ofertaDisco(docroot);
  const dishIds = new Set(platos.map((p) => p.key));
  const nPlatosOferta = () => (of().keys || []).filter((k) => dishIds.has(k)).length;
  const sync = () => pagina.evaluate(() => ({
    chip: (document.getElementById('n-chip-oferta') || {}).textContent, filas: document.querySelectorAll('.pane[data-pane="platos"] .adm-orow.es-oferta').length,
    etiquetas: document.querySelectorAll('.pane[data-pane="platos"] .adm-tag-oferta').length, tira: (document.querySelector('.adm-acciones-fuera[data-para="ofertas"] .adm-acciones-estado') || {}).textContent,
    badge: (document.querySelector('.adm-f-ooferta .adm-estado') || {}).textContent?.trim(), pie: (document.querySelector('.adm-f-ooferta .adm-regla-pie') || {}).textContent, on: document.querySelector('input[name="oferta_on"]').checked,
  }));
  /* Punto de partida: oferta a vacío. */
  const keys0 = await pagina.evaluate(() => [...document.querySelectorAll('input[name="oferta_plato[]"]:checked')].map((c) => c.value)).catch(() => []);
  await postCrudo(pagina, '/admin/index.php', [['guardar_oferta', '1'], ['pct', '20'], ['desde', '10:00'], ['hasta', '12:00'], ...[1, 2, 3, 4, 5, 6, 7].map((d) => ['dia[]', String(d)])]);
  await irA(pagina, url, 'ofertas');
  await abrirTodo(pagina);
  const o0 = await sync();
  informe.comprueba('E2E-OF-00', 'la oferta arranca APAGADA, sin platos y con Platos sin ninguna oferta',
    o0.badge === 'APAGADA' && !o0.on && /no hay ningún descuento/.test(o0.pie) && o0.chip === '0' && o0.filas === 0 && (of().keys || []).length === 0, JSON.stringify({ badge: o0.badge, chip: o0.chip, keys: of().keys }));

  const fila = await pagina.evaluate(() => { const cb = [...document.querySelectorAll('.pane[data-pane="ofertas"] input[name="oferta_plato[]"]')].find((c) => !c.disabled && c.closest('.adm-orow').getBoundingClientRect().width > 0); return cb ? cb.value : null; });

  /* Clic de puntero REAL que prueba la petición del contrato. */
  const cuerpos = await clicRealCapturaPost(pagina, `.pane[data-pane="ofertas"] label.adm-sw-oferta:has(input[value="${fila}"]) .adm-sw-pista`);
  informe.comprueba('E2E-OF-REAL', 'un clic real sobre el interruptor de un plato dispara oferta_plato_toggle y lo persiste en disco',
    cuerpos.some((b) => new RegExp(`oferta_plato_toggle=${fila}`).test(b)) && (of().keys || []).includes(fila), `${cuerpos.join(';').slice(0, 90)} keys=${JSON.stringify(of().keys)}`);
  await postCrudo(pagina, '/admin/index.php', [['oferta_plato_toggle', fila], ['oferta_plato_on', '0']]);   // limpiar

  /* Encender sin alcance → 422 y el interruptor revierte. */
  await irA(pagina, url, 'ofertas'); await abrirTodo(pagina);
  await conmutar(pagina, 'input[name="oferta_on"]', true);
  await reposo(pagina, 400);
  const o1 = await sync();
  const toast1 = await textoAvisoPanel(pagina);
  informe.comprueba('E2E-OF-01', 'encender sin categoría ni plato: el servidor lo rechaza y en disco sigue apagada',
    of().on === false && (/Elige al menos una categoría o un plato/.test(toast1) || o1.badge === 'APAGADA'), `${toast1.slice(0, 60)} · disco.on=${of().on}`);

  /* Un plato suelto. */
  pagina.limpiarRegistro();
  await conmutar(pagina, selInputOferta(fila), true);
  await reposo(pagina, 500);
  informe.comprueba('E2E-OF-02', 'marcar un plato suelto autoguarda con UN POST y lo apunta en offer.keys',
    postsAlPanel(pagina) === 1 && (of().keys || []).includes(fila), `posts=${postsAlPanel(pagina)} keys=${JSON.stringify(of().keys)}`);
  const o2 = await sync();
  informe.comprueba('E2E-OF-03', 'con la oferta apagada Platos sigue sin marcar el plato (semántica on && alcance)', o2.chip === '0' && o2.filas === 0, JSON.stringify({ chip: o2.chip, filas: o2.filas }));

  /* Encender: ahora sí, y Platos se sincroniza sin F5 con una sola petición. */
  pagina.limpiarRegistro();
  await conmutar(pagina, 'input[name="oferta_on"]', true);
  await reposo(pagina, 500);
  const o3 = await sync();
  const petAdmin = pagina.registro.peticiones.filter((p) => p.metodo === 'POST' && /\/admin\//.test(p.url)).length;
  informe.comprueba('E2E-OF-04', 'encender: en disco on=true, insignia PROGRAMADA/CORRIENDO y pie coherente',
    of().on === true && /^(PROGRAMADA|CORRIENDO)$/.test(o3.badge || '') && ((o3.badge === 'CORRIENDO' && /Corriendo ahora mismo/.test(o3.pie)) || (o3.badge === 'PROGRAMADA' && /Fuera de su horario/.test(o3.pie))), JSON.stringify({ badge: o3.badge, on: of().on }));
  informe.comprueba('E2E-OF-05', 'PRUEBA CRÍTICA: Platos se sincroniza sin F5 (chip 1, fila marcada, etiqueta) con una sola petición',
    o3.chip === '1' && o3.filas >= 1 && o3.etiquetas >= 1 && petAdmin === 1, JSON.stringify({ chip: o3.chip, filas: o3.filas, etiquetas: o3.etiquetas, petAdmin }));
  const filaPlatos = await pagina.evaluate((k) => { const f = document.querySelector(`.pane[data-pane="platos"] .adm-orow:has(.camara[data-k="${k}"])`); return f ? { oferta: f.classList.contains('es-oferta'), tag: !!f.querySelector('.adm-tag-oferta') } : null; }, fila);
  informe.comprueba('E2E-OF-06', 'la fila correcta de Platos es la marcada', !!filaPlatos && filaPlatos.oferta && filaPlatos.tag, JSON.stringify(filaPlatos));

  /* Segundo plato y quitar el primero. */
  const fila2 = await pagina.evaluate((k) => { const cb = [...document.querySelectorAll('.pane[data-pane="ofertas"] input[name="oferta_plato[]"]')].find((c) => !c.disabled && c.value !== k && c.closest('.adm-orow').getBoundingClientRect().width > 0); return cb ? cb.value : null; }, fila);
  await conmutar(pagina, selInputOferta(fila2), true);
  await reposo(pagina, 500);
  const nOf4 = nPlatosOferta(); const o4 = await sync();
  await conmutar(pagina, selInputOferta(fila), false);
  await reposo(pagina, 500);
  const nOf5 = nPlatosOferta();
  const o5 = await sync();
  informe.comprueba('E2E-OF-07', 'varios platos: 2 → quitar uno → 1, y Platos sigue el recuento (chip)',
    nOf4 === 2 && o4.chip === '2' && nOf5 === 1 && (of().keys || []).includes(fila2) && !(of().keys || []).includes(fila) && o5.chip === '1', `nOf4=${nOf4} nOf5=${nOf5} chips=${o4.chip}->${o5.chip}`);

  /* Porcentaje. */
  pagina.limpiarRegistro();
  await pagina.fill('#of-pct', '30');
  const rp = pagina.waitForResponse((r) => r.request().method() === 'POST', { timeout: 4000 }).catch(() => null);
  await pagina.press('#of-pct', 'Enter');
  await rp; await esperar(150);
  informe.comprueba('E2E-OF-08', 'el porcentaje se guarda con Enter y queda en offer.percent', of().percent === 30 && postsAlPanel(pagina) === 1, `percent=${of().percent}`);
  pagina.limpiarRegistro();
  for (const v of ['0', '91', '-5', '']) { await pagina.fill('#of-pct', v); await pagina.press('#of-pct', 'Enter'); await esperar(200); }
  informe.comprueba('E2E-OF-09', 'porcentajes fuera de 1..90 no salen del navegador y el campo vuelve al guardado',
    await pagina.inputValue('#of-pct') === '30' && of().percent === 30, `valor=${await pagina.inputValue('#of-pct')} percent=${of().percent}`);
  const p91 = await conFalloEsperado(pagina, () => postCrudo(pagina, '/admin/index.php', [['oferta_pct_guardar', '1'], ['pct', '91']]));
  informe.comprueba('E2E-OF-10', 'el servidor rechaza 91 con 422 y su mensaje', p91.status === 422 && /entre 1 y 90/.test(p91.mensaje) && of().percent === 30, `${p91.status} ${p91.mensaje}`);

  /* Horario: los dos campos juntos; el guard del navegador no deja salir un tramo invertido. */
  pagina.limpiarRegistro();
  await pagina.fill('#of-hasta', '15:00'); await esperar(500);
  await pagina.fill('#of-desde', '12:00'); await esperar(500);
  informe.comprueba('E2E-OF-11', 'horario 12:00–15:00 se guarda en minutos (720–900)', of().from === 720 && of().to === 900, `from=${of().from} to=${of().to}`);
  pagina.limpiarRegistro();
  await pagina.fill('#of-hasta', '09:00'); await esperar(400);
  informe.comprueba('E2E-OF-12', 'GUARD: un fin anterior al inicio no dispara fetch y los campos vuelven', postsAlPanel(pagina) === 0 && await pagina.inputValue('#of-hasta') === '15:00', `posts=${postsAlPanel(pagina)}`);
  const hInv = await conFalloEsperado(pagina, () => postCrudo(pagina, '/admin/index.php', [['oferta_horario_guardar', '1'], ['desde', '15:00'], ['hasta', '12:00']]));
  const hMal = await conFalloEsperado(pagina, () => postCrudo(pagina, '/admin/index.php', [['oferta_horario_guardar', '1'], ['desde', '25:99'], ['hasta', 'x']]));
  informe.comprueba('E2E-OF-13', 'el servidor contesta 422 al horario invertido y al formato inválido', hInv.status === 422 && /posterior/.test(hInv.mensaje) && hMal.status === 422 && /no es válido/.test(hMal.mensaje) && of().from === 720, `${hInv.mensaje} | ${hMal.mensaje}`);

  /* Días. */
  const selDiaInput = (n) => `.pane[data-pane="ofertas"] input[name="dia[]"][value="${n}"]`;
  pagina.limpiarRegistro();
  await conmutar(pagina, selDiaInput(3), false);
  await reposo(pagina, 400);
  informe.comprueba('E2E-OF-14', 'quitar un día guarda la colección sin ese día y Semanal deja de estar pulsado',
    JSON.stringify(of().days) === JSON.stringify([1, 2, 4, 5, 6, 7]) && await pagina.getAttribute('#of-semanal', 'aria-pressed') === 'false', JSON.stringify(of().days));
  pagina.limpiarRegistro();
  await clicVisible(pagina, '#of-semanal');
  await reposo(pagina, 400);
  const posts1 = postsAlPanel(pagina);
  await clicVisible(pagina, '#of-semanal');
  await esperar(300);
  informe.comprueba('E2E-OF-15', 'Semanal marca los siete con un POST y, ya marcados, no manda nada',
    JSON.stringify(of().days) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]) && posts1 === 1 && postsAlPanel(pagina) === 1 && await pagina.getAttribute('#of-semanal', 'aria-pressed') === 'true', `posts=${postsAlPanel(pagina)}`);
  for (const n of [1, 2, 3, 4, 5, 6]) { await conmutar(pagina, selDiaInput(n), false); await reposo(pagina, 350); }
  pagina.limpiarRegistro();
  await conmutar(pagina, selDiaInput(7), false);   // intentar quitar el último
  await esperar(300);
  informe.comprueba('E2E-OF-16', 'el último día no se puede quitar: se repone y el disco conserva [7]',
    await pagina.evaluate(() => document.querySelector('input[name="dia[]"][value="7"]').checked) && postsAlPanel(pagina) === 0 && JSON.stringify(of().days) === '[7]', `days=${JSON.stringify(of().days)} posts=${postsAlPanel(pagina)}`);
  const sinDias = await postCrudo(pagina, '/admin/index.php', [['oferta_dias_guardar', '1']]);
  const repes = await postCrudo(pagina, '/admin/index.php', [['oferta_dias_guardar', '1'], ['dia[]', '1'], ['dia[]', '7'], ['dia[]', '7'], ['dia[]', '9']]);
  informe.comprueba('E2E-OF-17', 'el servidor cae a los siete si le llega vacío, y quita repetidos y fuera de rango', sinDias.status === 200 && repes.status === 200 && JSON.stringify(of().days) === '[1,7]', JSON.stringify(of().days));
  await postCrudo(pagina, '/admin/index.php', [['oferta_dias_guardar', '1'], ...[1, 2, 3, 4, 5, 6, 7].map((d) => ['dia[]', String(d)])]);

  /* Estados CORRIENDO / PROGRAMADA en hora de Canarias. */
  const ahora = horaEn(); const min = ahora.h * 60 + ahora.m;
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const desdeC = Math.max(0, min - 60); const hastaC = Math.min(1439, Math.max(min + 60, desdeC + 2));
  await postCrudo(pagina, '/admin/index.php', [['oferta_horario_guardar', '1'], ['desde', hhmm(desdeC)], ['hasta', hhmm(hastaC)]]);
  await irA(pagina, url, 'ofertas');
  const corriendo = await sync();
  const [pd, ph] = ahora.h < 12 ? ['20:00', '21:00'] : ['06:00', '07:00'];
  await postCrudo(pagina, '/admin/index.php', [['oferta_horario_guardar', '1'], ['desde', pd], ['hasta', ph]]);
  await irA(pagina, url, 'ofertas');
  const programada = await sync();
  informe.comprueba('E2E-OF-18', `CORRIENDO dentro del tramo (${hhmm(desdeC)}–${hhmm(hastaC)}) y PROGRAMADA fuera (${pd}–${ph}), hora de Canarias`,
    corriendo.badge === 'CORRIENDO' && /Corriendo ahora mismo/.test(corriendo.pie) && programada.badge === 'PROGRAMADA' && /Fuera de su horario/.test(programada.pie), JSON.stringify({ corr: corriendo.badge, prog: programada.badge }));
  await pagina.fill('#of-hasta', hhmm(hastaC)); await esperar(400);
  await pagina.fill('#of-desde', hhmm(desdeC)); await esperar(500);
  const repintado = await sync();
  informe.comprueba('E2E-OF-19', 'al volver al tramo actual desde los campos, insignia y pie pasan a CORRIENDO sin recargar',
    repintado.badge === 'CORRIENDO' && /Corriendo ahora mismo/.test(repintado.pie), JSON.stringify({ badge: repintado.badge }));

  /* Apagar: no borra nada y Platos vuelve a cero sin F5. */
  pagina.limpiarRegistro();
  await conmutar(pagina, 'input[name="oferta_on"]', false);
  await reposo(pagina, 500);
  const o6 = await sync();
  informe.comprueba('E2E-OF-20', 'apagar: APAGADA, Platos a 0 sin F5, y platos/%/horario/días se conservan',
    of().on === false && o6.badge === 'APAGADA' && o6.chip === '0' && o6.filas === 0 && nPlatosOferta() === 1 && of().percent === 30 && of().days.length === 7 && postsAlPanel(pagina) === 1, JSON.stringify({ on: of().on, nPlatos: nPlatosOferta(), percent: of().percent, dias: of().days.length }));

  /* guardar_oferta (respaldo sin JS). */
  const g1 = await postCrudo(pagina, '/admin/index.php', [['guardar_oferta', '1'], ['oferta_on', '1'], ['pct', '25'], ['desde', '10:00'], ['hasta', '12:00'], ['dia[]', '1']]);
  const g2 = await postCrudo(pagina, '/admin/index.php', [['guardar_oferta', '1'], ['oferta_on', '1'], ['pct', '25'], ['desde', '10:00'], ['hasta', '12:00'], ['dia[]', '1'], ['oferta_plato[]', fila]]);
  const g3 = await postCrudo(pagina, '/admin/index.php', [['guardar_oferta', '1'], ['pct', '25'], ['desde', '10:00'], ['hasta', '12:00'], ['dia[]', '1'], ['oferta_plato[]', fila]]);
  informe.comprueba('E2E-OF-21', 'guardar_oferta: sin alcance se rechaza; completo enciende; sin interruptor guarda y avisa APAGADA',
    /Elige al menos una categoría o un plato/.test(g1.mensaje) && /Oferta guardada y encendida: 25%/.test(g2.mensaje) && /GUARDADO, PERO LA OFERTA ESTÁ APAGADA/.test(g3.mensaje) && of().on === false && of().percent === 25, `${g1.mensaje.slice(0, 30)} | ${g2.mensaje.slice(0, 30)} | ${g3.mensaje.slice(0, 30)}`);

  /* Categoría entera: sin interfaz (decisión); el contrato del servidor sigue vivo. */
  const catId = platos.find((p) => p.key === fila).catId || platos.find((p) => p.key === fila).cat;
  const c1 = await postCrudo(pagina, '/admin/index.php', [['oferta_cat_toggle', catId], ['oferta_cat_on', '1']]);
  const c2 = await conFalloEsperado(pagina, () => postCrudo(pagina, '/admin/index.php', [['oferta_plato_toggle', fila], ['oferta_plato_on', '1']]));
  const c3 = await conFalloEsperado(pagina, () => postCrudo(pagina, '/admin/index.php', [['oferta_cat_toggle', 'categoria-inventada'], ['oferta_cat_on', '1']]));
  const c4 = await postCrudo(pagina, '/admin/index.php', [['oferta_cat_toggle', catId], ['oferta_cat_on', '0']]);
  const c5 = await conFalloEsperado(pagina, () => postCrudo(pagina, '/admin/index.php', [['oferta_plato_toggle', 'plato-inventado'], ['oferta_plato_on', '1']]));
  informe.comprueba('E2E-OF-22', 'oferta_cat_toggle por POST: añade/quita categoría; un plato de esa categoría no se toca suelto (422); ids falsos 422',
    c1.status === 200 && c2.status === 422 && /no se puede tocar suelto/.test(c2.mensaje) && c3.status === 422 && c4.status === 200 && (of().cats || []).length === 0 && c5.status === 422, `${c1.status}/${c2.status}/${c3.status}/${c4.status}/${c5.status}`);

  /* Buscador y filtro. */
  await irA(pagina, url, 'ofertas'); await abrirTodo(pagina);
  await clicVisible(pagina, '[data-ofiltro="marcados"]');
  await esperar(150);
  const soloMarcados = await pagina.evaluate(() => [...document.querySelectorAll('.pane[data-pane="ofertas"] .adm-orow')].filter((f) => !f.hidden).map((f) => f.classList.contains('es-oferta') || f.classList.contains('por-categoria')));
  await clicVisible(pagina, '[data-ofiltro="todos"]');
  await pagina.fill('#qo', 'zzzz'); await esperar(150);
  const vacioOf = await pagina.evaluate(() => !document.getElementById('ovacio').hidden);
  await pagina.fill('#qo', '');
  informe.comprueba('E2E-OF-23', '«Sólo marcados» enseña sólo platos en oferta; el buscador avisa sin coincidencias',
    soloMarcados.length >= 1 && soloMarcados.every(Boolean) && vacioOf, `marcados=${soloMarcados.length}`);

  /* H3: plegado de «Configurar oferta» a ≤560, maestro e insignia siempre visibles. */
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(250);
  const h3 = await pagina.evaluate(async () => { const caja = document.querySelector('.adm-oferta-config'); const cerrado = !caja.open; const maestro = document.querySelector('.adm-oferta-maestro').getBoundingClientRect(); const badge = document.querySelector('.adm-f-ooferta .adm-estado').getBoundingClientRect(); caja.querySelector('.adm-oferta-config-resumen').click(); await new Promise((r) => setTimeout(r, 80)); return { cerrado, abierto: caja.open, maestroVis: maestro.width > 0 && maestro.right <= innerWidth, badgeVis: badge.width > 0 }; });
  informe.comprueba('E2E-OF-24', 'H3: a 390 px la configuración viene plegada y abre; maestro e insignia siempre visibles', h3.cerrado && h3.abierto && h3.maestroVis && h3.badgeVis, JSON.stringify(h3));
  await pagina.setViewportSize({ width: 1280, height: 900 });

  /* Restaurar el fixture. */
  await postCrudo(pagina, '/admin/index.php', [['oferta_plato_toggle', fila], ['oferta_plato_on', '0']]);
  await postCrudo(pagina, '/admin/index.php', [['oferta_plato_toggle', fila2], ['oferta_plato_on', '0']]);
  await postCrudo(pagina, '/admin/index.php', [['guardar_oferta', '1'], ['pct', '20'], ['desde', '10:00'], ['hasta', '12:00'], ...[1, 2, 3, 4, 5, 6, 7].map((d) => ['dia[]', String(d)])]);
  const fin = of();
  informe.comprueba('E2E-OF-25', 'fixture de la oferta restaurado (apagada, sin platos, 20 %, 10:00–12:00, siete días)',
    fin.on === false && (fin.keys || []).length === 0 && fin.percent === 20 && fin.from === 600 && fin.to === 720 && fin.days.length === 7, JSON.stringify(fin));
  informe.comprueba('E2E-OF-26', 'consola limpia y sin peticiones fallidas no previstas en Ofertas',
    erroresConsola(pagina).length === 0 && pagina.registro.fallidas.length === 0, [...erroresConsola(pagina), ...pagina.registro.fallidas].slice(0, 3).join(' | '));
}

/* 'YYYY-MM-DDTHH:mm' local (zona del restaurante) → 'YYYY-MM-DDTHH:mm:ssZ' UTC, como pub_fecha_a_utc. */
export function localAUtc(isoLocal, tz = TZ_CLIENTE) {
  const [f, h] = isoLocal.split('T');
  const [y, m, d] = f.split('-').map(Number);
  const [hh, mm] = h.split(':').map(Number);
  let t = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t));
    const g = (k) => Number(p.find((x) => x.type === k).value);
    const visto = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'));
    const deseado = Date.UTC(y, m - 1, d, hh, mm);
    if (visto === deseado) break;
    t += deseado - visto;
  }
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/* ================================================================== 11. Juego */
export async function e2eJuego(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E Juego: interruptor, marcador, saneamiento del nombre, endpoint');
  const url = servidor.url;
  const recordJson = path.join(docroot, 'record.json');
  const marcadorJson = path.join(docroot, 'admin', 'marcador.json');
  for (const f of [recordJson, marcadorJson]) if (existsSync(f)) unlinkSync(f);
  const record = (campos) => pagina.evaluate(async (c) => { const r = await fetch('/admin/record.php', { method: 'POST', body: new URLSearchParams(c), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* sin cuerpo */ } return { status: r.status, json: j }; }, campos);
  const leerPodio = () => pagina.evaluate(() => {
    const sw = document.querySelector('.pane[data-pane="juego"] input[name="juego_on"]');
    return { on: sw ? sw.checked : null, rotulo: (document.querySelector('.pane[data-pane="juego"] .adm-sw-txt') || {}).textContent?.trim(), vacio: !!document.querySelector('.pane[data-pane="juego"] .adm-vacio'), filas: [...document.querySelectorAll('.adm-podio li')].map((li) => ({ quien: (li.querySelector('.adm-pod-quien') || {}).textContent?.trim().replace(/\s+/g, ' '), pts: (li.querySelector('.adm-pod-pts') || {}).textContent?.trim() })) };
  });
  await irA(pagina, url, 'juego', 300);
  const j0 = await leerPodio();
  informe.comprueba('E2E-JU-00', 'el juego arranca ON con el marcador vacío', j0.on && j0.rotulo === 'ON' && j0.vacio && j0.filas.length === 0, JSON.stringify(j0));

  await conmutar(pagina, '.pane[data-pane="juego"] input[name="juego_on"]', false);
  const g1 = await guardar(pagina, 'juego-form');
  const off = await record({ puntos: '50' });
  informe.comprueba('E2E-JU-01', 'OFF: se guarda, avisa, y record.php contesta 204 sin escribir',
    /no sale en la carta/.test(g1) && leerEstado(docroot).game.on === false && off.status === 204 && !existsSync(recordJson), `${g1} · HTTP ${off.status}`);
  await conmutar(pagina, '.pane[data-pane="juego"] input[name="juego_on"]', true);
  const g2 = await guardar(pagina, 'juego-form');
  const getRec = await pagina.evaluate(async () => { const r = await fetch('/admin/record.php'); return { status: r.status, texto: await r.text() }; });
  informe.comprueba('E2E-JU-02', 'ON: se guarda y record.php por GET devuelve el podio vacío',
    /sale en la carta/.test(g2) && leerEstado(docroot).game.on === true && getRec.status === 200 && /"top":\[\]/.test(getRec.texto), `${g2} · ${getRec.texto.slice(0, 40)}`);

  const entradas = [[150, 'Ana'], [120, 'Luis 🍛 Ñ'], [100, '<b>Pepe</b><script>x</script>']];
  const ids = {};
  for (const [pts, nombre] of entradas) { const r1 = await record({ puntos: String(pts) }); ids[pts] = r1.json && r1.json.id; if (ids[pts]) await record({ id: ids[pts], nombre, pais: 'es' }); }
  const empate = await record({ puntos: '100' });
  const mejorEmpate = await record({ puntos: '120' });
  const tope = await record({ puntos: '301' });
  const cero = await record({ puntos: '0' });
  const top = JSON.parse(readFileSync(recordJson, 'utf8')).top;
  informe.comprueba('E2E-JU-03', 'tres marcas ordenadas; un 100 no desbanca al 100 que ya está; un 120 sí entra y saca al 100',
    Object.values(ids).every(Boolean) && !empate.json?.id && !!mejorEmpate.json?.id && top.map((x) => x.puntos).join() === '150,120,120', JSON.stringify(top.map((x) => x.puntos)));
  informe.comprueba('E2E-JU-04', 'puntuaciones fuera de 1..300 se rechazan con 400', tope.status === 400 && cero.status === 400, `${tope.status}/${cero.status}`);
  informe.comprueba('E2E-JU-05', 'nombres: emoji y ñ se conservan, las etiquetas se quitan y todo cabe en 12 caracteres',
    top.some((x) => x.nombre === 'Luis 🍛 Ñ') && top.every((x) => !/<|script/.test(x.nombre) && [...x.nombre].length <= 12), JSON.stringify(top.map((x) => x.nombre)));
  informe.comprueba('E2E-JU-06', 'record.json (público) no lleva identificadores; marcador.json (privado) sí',
    JSON.parse(readFileSync(recordJson, 'utf8')).top.every((x) => !('id' in x)) && JSON.parse(readFileSync(marcadorJson, 'utf8')).top.every((x) => /^[0-9a-f]{8}$/.test(x.id)));

  await irA(pagina, url, 'juego', 300);
  const j1 = await leerPodio();
  informe.comprueba('E2E-JU-07', 'el panel pinta el podio en orden con nombres y puntos', j1.filas.length === 3 && j1.filas[0].pts === '150' && /Ana/.test(j1.filas[0].quien) && !j1.vacio, JSON.stringify(j1.filas));
  await limpiarToasts(pagina);
  pagina.registro.dialogos.length = 0;
  await clicVisible(pagina, '.adm-podio button[name="borrar_nombre"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  const j2 = await leerPodio();
  const topB = JSON.parse(readFileSync(recordJson, 'utf8')).top;
  informe.comprueba('E2E-JU-08', 'Quitar nombre pide confirmación, borra nombre y país y conserva la puntuación',
    pagina.registro.dialogos.some((d) => /Quitar el nombre/.test(d)) && topB[0].nombre === '' && topB[0].pais === '' && topB[0].puntos === 150 && /Sin nombre/.test(j2.filas[0].quien), `${pagina.registro.dialogos[0]} · ${JSON.stringify(topB[0])}`);
  const borrarRaro = await postCrudo(pagina, '/admin/index.php', [['borrar_nombre', '9']]);
  informe.comprueba('E2E-JU-09', 'borrar un nombre que no existe avisa sin escribir', /ya no está/.test(borrarRaro.mensaje), borrarRaro.mensaje);
  await irA(pagina, url, 'juego', 300);
  await limpiarToasts(pagina);
  pagina.registro.dialogos.length = 0;
  await clicVisible(pagina, 'button[name="reiniciar_record"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  const j3 = await leerPodio();
  informe.comprueba('E2E-JU-10', 'Vaciar el marcador pide confirmación y deja el podio vacío en disco y en pantalla',
    pagina.registro.dialogos.some((d) => /Vaciar el marcador/.test(d)) && j3.vacio && j3.filas.length === 0 && (!existsSync(recordJson) || (JSON.parse(readFileSync(recordJson, 'utf8')).top || []).length === 0), pagina.registro.dialogos[0]);

  const put = await pagina.evaluate(async () => (await fetch('/admin/record.php', { method: 'PUT' })).status);
  const malId = await record({ id: 'zz', nombre: 'x' });
  const letras = await record({ puntos: 'abc' });
  informe.comprueba('E2E-JU-11', 'PUT → 405, id malformado → 400, puntos con letras → 400', put === 405 && malId.status === 400 && letras.status === 400, `${put}/${malId.status}/${letras.status}`);
}

/* ================================================================== 12. Analítica (sin cambios en su cuerpo, ver más abajo) */

/* ================================================================== 10. Publicidad */
export async function e2ePublicidad(informe, { pagina, servidor, docroot, fixtures, navegador }) {
  informe.seccion('E2E Publicidad: banner, fechas, atajos, URL, estados y respaldo sin JavaScript');
  const url = servidor.url;
  const banner = () => (leerEstado(docroot).publicidad || {}).banner || {};
  const pubDir = path.join(docroot, 'assets', 'publicidad');
  const ficheros = () => (existsSync(pubDir) ? readdirSync(pubDir).filter((f) => !f.startsWith('.')) : []);
  const leerPub = () => pagina.evaluate(() => { const p = document.querySelector('.pane[data-pane="publicidad"]'); const t = (s) => { const e = p.querySelector(s); return e ? e.textContent.trim() : null; }; return { badge: t('.adm-estado'), previo: !!p.querySelector('.adm-previo'), vacio: !!p.querySelector('.adm-previo-vacio'), on: p.querySelector('input[name="pub_on"]').checked, boton: t('button[name="subir_banner"]'), quitar: !!p.querySelector('button[name="eliminar_banner"]'), inicio: (p.querySelector('#pub-inicio') || {}).value, fin: (p.querySelector('#pub-fin') || {}).value, url: p.querySelector('input[name="pub_url"]').value }; });
  /* La subida se hace por fetch montando el multipart con los BYTES REALES del fichero: al
     hacer setInputFiles sobre #pub_img, el JS del panel procesa el fichero y REEMPLAZA el input
     (desaparece del DOM), así que no se puede leer su form después. Enviando el multipart a mano
     se prueba el mismo contrato del servidor (is_uploaded_file, getimagesize, medidas y peso) sin
     depender de ese detalle de la interfaz. Después se recarga para que el DOM refleje el estado. */
  const postBanner = async (rutaFichero) => {
    const csrf = await pagina.evaluate(() => (document.querySelector('input[name="csrf"]') || {}).value || '');
    const b64 = rutaFichero ? readFileSync(rutaFichero).toString('base64') : null;
    const nombre = rutaFichero ? path.basename(rutaFichero) : null;
    const r = await pagina.evaluate(async ({ csrf, b64, nombre }) => {
      const fd = new FormData();
      fd.set('csrf', csrf); fd.set('subir_banner', '1');
      if (b64 !== null) { const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); fd.append('pub_img', new Blob([arr]), nombre); }
      const resp = await fetch(location.pathname + location.search, { method: 'POST', body: fd, credentials: 'same-origin' });
      const t = await resp.text();
      const m = /toast\(\s*("(?:[^"\\]|\\.)*")\s*,\s*'(ok|bad)'/.exec(t);
      let mensaje = ''; if (m) { try { mensaje = JSON.parse(m[1]); } catch { /* */ } }
      return { status: resp.status, mensaje };
    }, { csrf, b64, nombre });
    await pagina.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await esperar(200);
    return r.mensaje;
  };
  const enviarBanner = () => postBanner(null);
  const subir = async (fichero) => { await irA(pagina, url, 'publicidad', 200); return postBanner(fichero); };

  await irA(pagina, url, 'publicidad', 250);
  const p0 = await leerPub();
  informe.comprueba('E2E-PU-00', 'arranca DESACTIVADO, sin imagen y con el hueco «Sin imagen todavía»', p0.badge === 'DESACTIVADO' && !p0.previo && p0.vacio && !p0.on && /Subir imagen/.test(p0.boton || ''), JSON.stringify(p0));

  const rechazos = [];
  for (const [fx, re, que] of [['portada-1200x800.png', /exactamente 1120 x 480/, 'medida distinta'], ['no-es-imagen.txt', /no es una imagen/, 'texto plano'], ['truncada.png', /no es una imagen|rota|exactamente/, 'PNG truncado'], ['pesada-3mb.png', /pesa .* y el maximo es/, 'por encima de 2 MB'], ['extension-falsa.jpg', /no es una imagen|exactamente/, 'extensión falsa']]) {
    if (!fixtures[fx]) { rechazos.push(`${que}: sin fixture`); continue; }
    const m = await subir(fixtures[fx]); rechazos.push(`${que}: ${re.test(m) ? 'rechazada' : 'ACEPTADA(' + m.slice(0, 40) + ')'}`);
  }
  informe.comprueba('E2E-PU-01', 'medida distinta, texto, truncado, >2 MB y extensión falsa se rechazan sin dejar fichero', rechazos.every((r) => /rechazada$/.test(r)) && ficheros().length === 0 && !banner().img, rechazos.join(' | '));
  await irA(pagina, url, 'publicidad', 250);
  const sinFichero = await enviarBanner();
  informe.comprueba('E2E-PU-02', 'Subir sin elegir fichero avisa en vez de fingir', /No ha llegado|ning[uú]n|elige|imagen/i.test(sinFichero), sinFichero.slice(0, 60));

  const ok = await subir(fixtures['banner-1120x480.png']);
  const p1 = await leerPub(); const img1 = banner().img;
  informe.comprueba('E2E-PU-03', 'un PNG de 1120×480 se guarda, se apunta en estado y aparece la vista previa', /Imagen guardada/.test(ok) && !!img1 && existsSync(path.join(pubDir, img1)) && p1.previo && /Reemplazar imagen/.test(p1.boton || '') && p1.quitar, `${ok.slice(0, 40)} · ${img1}`);
  informe.comprueba('E2E-PU-04', 'sólo con imagen y apagado la insignia sigue DESACTIVADO', p1.badge === 'DESACTIVADO' && banner().on === false);

  await conmutar(pagina, '.pane[data-pane="publicidad"] input[name="pub_on"]', true);
  await pagina.fill('.pane[data-pane="publicidad"] input[name="pub_url"]', 'https://ejemplo.test/promo');
  const g1 = await guardar(pagina, 'pub-form');
  const b1 = banner(); const p2 = await leerPub();
  informe.comprueba('E2E-PU-05', 'Guardar enciende el banner, guarda la URL y la insignia pasa a ACTIVO', /banner esta activo/.test(g1) && b1.on === true && b1.url === 'https://ejemplo.test/promo' && b1.blank === true && p2.badge === 'ACTIVO', `${g1.slice(0, 40)} · on=${b1.on}`);
  await pagina.reload({ waitUntil: 'domcontentloaded' }); await esperar(200);
  const p2b = await leerPub();
  informe.comprueba('E2E-PU-06', 'tras F5 interruptor, URL y vista previa siguen', p2b.on && p2b.url === 'https://ejemplo.test/promo' && p2b.previo);
  const malas = [];
  for (const mala of ['javascript:alert(1)', 'ftp://x.test/a', 'ejemplo.test/sin-esquema']) { const r = await postCrudo(pagina, '/admin/index.php', [['guardar_publicidad', '1'], ['pub_on', '1'], ['pub_url', mala]]); malas.push(`${mala.slice(0, 12)}: ${/https:\/\//.test(r.mensaje) ? 'rechazada' : 'ACEPTADA'}`); }
  informe.comprueba('E2E-PU-07', 'URL sin http(s) se rechaza y no se guarda', malas.every((m) => m.endsWith('rechazada')) && banner().url === 'https://ejemplo.test/promo', malas.join(' | '));

  await irA(pagina, url, 'publicidad', 250);
  const atajo = await pagina.evaluate(async () => { const b = document.querySelector('[data-atajo="semana"]'); if (!b) return null; b.click(); await new Promise((r) => setTimeout(r, 150)); const bb = document.querySelector('[data-atajo="semana"]'); return { inicio: document.getElementById('pub-inicio').value, fin: document.getElementById('pub-fin').value, pulsado: bb ? bb.getAttribute('aria-pressed') : null }; });
  const hoy = fechaEn();
  if (atajo) {
    await guardar(pagina, 'pub-form');
    const b2 = banner();
    informe.comprueba('E2E-PU-08', 'el atajo «una semana» rellena hoy → hoy+6 23:59 y se guarda en UTC desde la hora de Canarias',
      atajo.inicio.startsWith(hoy) && atajo.fin === `${sumaDias(hoy, 6)}T23:59` && b2.startAt === localAUtc(atajo.inicio) && b2.endAt === localAUtc(atajo.fin) && atajo.pulsado === 'true', JSON.stringify({ atajo, startAt: b2.startAt, esperado: localAUtc(atajo.inicio) }));
    await pagina.reload({ waitUntil: 'domcontentloaded' }); await esperar(200);
    const p3 = await leerPub();
    informe.comprueba('E2E-PU-09', 'tras F5 las fechas vuelven al campo en hora local', p3.inicio === atajo.inicio && p3.fin === atajo.fin && p3.badge === 'ACTIVO', JSON.stringify([p3.inicio, p3.fin, p3.badge]));
  } else { informe.blocked('E2E-PU-08', 'atajos de duración', 'no hay [data-atajo="semana"]'); }
  const rInv = await postCrudo(pagina, '/admin/index.php', [['guardar_publicidad', '1'], ['pub_on', '1'], ['pub_inicio', `${hoy}T12:00`], ['pub_fin', `${hoy}T11:00`]]);
  const rRota = await postCrudo(pagina, '/admin/index.php', [['guardar_publicidad', '1'], ['pub_on', '1'], ['pub_inicio', 'no-es-fecha'], ['pub_fin', '']]);
  informe.comprueba('E2E-PU-10', 'fin anterior al inicio y fecha sin sentido se rechazan y no se guardan', /DESPUES del inicio/.test(rInv.mensaje) && /no tiene sentido/.test(rRota.mensaje), `${rInv.mensaje.slice(0, 30)} | ${rRota.mensaje.slice(0, 30)}`);
  await postCrudo(pagina, '/admin/index.php', [['guardar_publicidad', '1'], ['pub_on', '1'], ['pub_inicio', `${sumaDias(hoy, 1)}T10:00`], ['pub_fin', '']]);
  await irA(pagina, url, 'publicidad', 250); const programado = (await leerPub()).badge;
  await postCrudo(pagina, '/admin/index.php', [['guardar_publicidad', '1'], ['pub_on', '1'], ['pub_inicio', ''], ['pub_fin', `${sumaDias(hoy, -1)}T10:00`]]);
  await irA(pagina, url, 'publicidad', 250); const caducado = (await leerPub()).badge;
  await postCrudo(pagina, '/admin/index.php', [['guardar_publicidad', '1'], ['pub_on', '1'], ['pub_inicio', ''], ['pub_fin', '']]);
  await irA(pagina, url, 'publicidad', 250); const sinFechas = await leerPub();
  informe.comprueba('E2E-PU-11', 'PROGRAMADO con inicio mañana, CADUCADO con fin ayer, y quitar fechas deja ACTIVO sin startAt/endAt',
    programado === 'PROGRAMADO' && caducado === 'CADUCADO' && sinFechas.badge === 'ACTIVO' && !('startAt' in banner()) && !('endAt' in banner()) && sinFechas.inicio === '' && sinFechas.fin === '', `${programado}/${caducado}/${sinFechas.badge}`);

  const rep = await subir(fixtures['banner-1120x480.png']); const img2 = banner().img;
  informe.comprueba('E2E-PU-12', 'reemplazar sube la nueva y borra la anterior', /Imagen guardada/.test(rep) && img2 && img2 !== img1 && !existsSync(path.join(pubDir, img1)) && ficheros().length === 1, `${img1} → ${img2}`);
  await irA(pagina, url, 'publicidad', 250);
  await limpiarToasts(pagina);
  await clicVisible(pagina, 'button[name="eliminar_banner"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  const quitado = await textoAvisoPanel(pagina); const p4 = await leerPub();
  informe.comprueba('E2E-PU-13', 'quitar la imagen borra el fichero, deja INCOMPLETO (encendido sin imagen) y el hueco vacío', /Imagen quitada/.test(quitado) && !banner().img && ficheros().length === 0 && p4.badge === 'INCOMPLETO' && p4.vacio, `${quitado.slice(0, 30)} · ${p4.badge}`);
  const nada = await postCrudo(pagina, '/admin/index.php', [['eliminar_banner', '1']]);
  informe.comprueba('E2E-PU-14', 'quitar sin imagen avisa sin romper', /No hay imagen que quitar/.test(nada.mensaje), nada.mensaje);

  const sinJs = await nuevaPagina(navegador, { javaScriptEnabled: false });
  await sinJs.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  await sinJs.fill('#clave', CLAVE_QA); await sinJs.click('button[type="submit"]'); await sinJs.waitForLoadState('domcontentloaded').catch(() => {});
  await sinJs.goto(url + '/admin/index.php?t=publicidad', { waitUntil: 'domcontentloaded' });
  const nativo = await sinJs.evaluate(() => { const v = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().width > 0 : false; }; return { inicio: v('#pub-inicio'), fin: v('#pub-fin'), tira: v('.adm-acciones-fuera[data-para="publicidad"] .adm-btn-guardar'), atajos: v('#pub-atajos'), conJs: document.documentElement.classList.contains('adm-con-js') }; });
  await sinJs.fill('#pub-inicio', `${hoy}T09:00`); await sinJs.fill('#pub-fin', `${sumaDias(hoy, 3)}T21:30`); await sinJs.fill('input[name="pub_url"]', 'https://sin-js.test/x');
  await sinJs.click('.adm-acciones-fuera[data-para="publicidad"] .adm-btn-guardar');
  await sinJs.waitForLoadState('domcontentloaded').catch(() => {}); await esperar(300);
  const b5 = banner();
  informe.comprueba('E2E-PU-15', 'sin JavaScript: fechas nativas y tira visibles, atajos ocultos, y el formulario guarda igual',
    nativo.inicio && nativo.fin && nativo.tira && !nativo.atajos && !nativo.conJs && b5.url === 'https://sin-js.test/x' && b5.startAt === localAUtc(`${hoy}T09:00`) && b5.endAt === localAUtc(`${sumaDias(hoy, 3)}T21:30`), JSON.stringify({ nativo, url: b5.url }));
  await sinJs.contextoQa.close().catch(() => {});

  await postCrudo(pagina, '/admin/index.php', [['guardar_publicidad', '1'], ['pub_url', ''], ['pub_inicio', ''], ['pub_fin', '']]);
  const fin = banner();
  informe.comprueba('E2E-PU-16', 'fixture de Publicidad restaurado (apagado, sin imagen, sin URL ni fechas)', fin.on === false && !fin.img && fin.url === '' && !fin.startAt && !fin.endAt && ficheros().length === 0, JSON.stringify(fin));
  informe.comprueba('E2E-PU-17', 'consola limpia en Publicidad', erroresConsola(pagina).length === 0, erroresConsola(pagina).slice(0, 2).join(' | '));
}

/* ================================================================== 12. Analítica */
const phpRound = (x) => Math.sign(x) * Math.round(Math.abs(x));
export function cuentasAnalitica(serie, hoy) {
  const v = (d) => serie[d] || 0;
  const suma = (desde, n) => { let s = 0; for (let i = 0; i < n; i++) s += v(sumaDias(desde, i)); return s; };
  const lunes = sumaDias(hoy, -(diaSemanaIso(hoy) - 1));
  const diasSemana = diaSemanaIso(hoy);
  const diaDelMes = Number(hoy.slice(8, 10));
  const primero = hoy.slice(0, 8) + '01';
  const mesAnt = sumaDias(primero, -1).slice(0, 8) + '01';
  const pct = (a, b) => (b <= 0 ? null : phpRound(((a - b) / b) * 100));
  const r = { hoy: v(hoy), hoyAntes: v(sumaDias(hoy, -7)), semana: suma(lunes, diasSemana), semanaAntes: suma(sumaDias(lunes, -7), diasSemana), mes: suma(primero, diaDelMes), mesAntes: suma(mesAnt, Math.min(diaDelMes, diasDelMes(mesAnt))), dias: Array.from({ length: 30 }, (_, i) => v(sumaDias(hoy, -(29 - i)))) };
  r.pctHoy = pct(r.hoy, r.hoyAntes); r.pctSemana = pct(r.semana, r.semanaAntes); r.pctMes = pct(r.mes, r.mesAntes);
  return r;
}
const numES = (n) => new Intl.NumberFormat('de-DE').format(n);

export async function e2eAnalitica(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E Analítica: sin datos, fixture determinista, datos.php y vista.php');
  const url = servidor.url;
  const datosDir = path.join(docroot, 'admin', 'datos');
  if (existsSync(datosDir)) rmSync(datosDir, { recursive: true, force: true });
  await irA(pagina, url, 'datos');
  const vacio = await pagina.evaluate(() => (document.querySelector('.pane[data-pane="datos"]') || {}).innerText || '');
  informe.comprueba('E2E-AN-00', 'sin carpeta de datos la pantalla enseña su estado vacío', /Todavía no hay ningún dato/.test(vacio), vacio.slice(0, 70).replace(/\s+/g, ' '));

  const hoy = fechaEn();
  const apertura = await pagina.evaluate(async () => ({ post: (await fetch('/admin/datos.php', { method: 'POST' })).status, get: (await fetch('/admin/datos.php')).status }));
  const fichHoy = path.join(datosDir, `d-${hoy}.txt`);
  informe.comprueba('E2E-AN-01', 'datos.php: POST apunta un byte en d-HOY.txt y contesta 204; GET → 405', apertura.post === 204 && apertura.get === 405 && existsSync(fichHoy) && readFileSync(fichHoy).length === 1, JSON.stringify(apertura));

  const serie = {};
  const lunes = sumaDias(hoy, -(diaSemanaIso(hoy) - 1));
  serie[sumaDias(hoy, -60)] = 1;
  for (let i = 0; i < 7; i++) { serie[sumaDias(lunes, i)] = 3; serie[sumaDias(lunes, -7 + i)] = 2; }
  for (let i = 1; i <= 31; i++) { const d = hoy.slice(0, 8) + String(i).padStart(2, '0'); if (d <= hoy && !(d in serie)) serie[d] = 1; }
  const mesAnt = sumaDias(hoy.slice(0, 8) + '01', -1).slice(0, 7);
  for (let i = 1; i <= 28; i++) { const d = `${mesAnt}-${String(i).padStart(2, '0')}`; if (!(d in serie)) serie[d] = 4; }
  serie[hoy] = 5; serie[sumaDias(hoy, -7)] = 4; serie[sumaDias(hoy, -3)] = 9;
  Object.keys(serie).forEach((d) => { if (d > hoy) delete serie[d]; });
  mkdirSync(datosDir, { recursive: true });
  for (const [d, n] of Object.entries(serie)) writeFileSync(path.join(datosDir, `d-${d}.txt`), '.'.repeat(n));
  const platos = leerPlatos(docroot).filter((p) => p.price !== '');
  const [A, B, C] = [platos[0], platos[1], platos[2]];
  const dd = hoy.slice(8, 10);
  writeFileSync(path.join(datosDir, `vp-${hoy.slice(0, 7)}.json`), JSON.stringify({ mes: hoy.slice(0, 7), dias: { [dd]: { [sha8(A.key)]: 7, [sha8(B.key)]: 3, [sha8(C.key)]: 1 } } }));
  const esperado = cuentasAnalitica(serie, hoy);

  await irA(pagina, url, 'datos', 500);
  const visto = await pagina.evaluate(() => {
    const p = document.querySelector('.pane[data-pane="datos"]');
    const cifras = [...p.querySelectorAll('.dt-cifra-n')].map((e) => e.textContent.trim());
    const chips = [...p.querySelectorAll('.dt-chip')].map((e) => ({ t: e.textContent.trim(), sube: e.classList.contains('sube'), baja: e.classList.contains('baja'), nuevo: e.classList.contains('nuevo') }));
    const barras = [...p.querySelectorAll('#dt-barras .dt-b')].map((b) => (b.querySelector('.dt-globo') || {}).textContent?.trim().split(/\s/)[0]);
    const filas = (sel) => [...p.querySelectorAll(`${sel} .vp-lista`)].slice(0, 1).flatMap((l) => [...l.querySelectorAll('.vp-fila')].map((f) => ({ nom: f.querySelector('.vp-nom').textContent.trim(), n: f.querySelector('.vp-n').textContent.trim(), pct: f.querySelector('.vp-pct').textContent.trim() })));
    return { cifras, chips, barras, semana: filas('[data-vpanel="semana"]') };
  });
  informe.comprueba('E2E-AN-02', `las tres cifras coinciden con la fixture (hoy ${esperado.hoy}, semana ${esperado.semana}, mes ${esperado.mes})`,
    visto.cifras[0] === numES(esperado.hoy) && visto.cifras[1] === numES(esperado.semana) && visto.cifras[2] === numES(esperado.mes), `pantalla=${visto.cifras.join('/')} esperado=${[esperado.hoy, esperado.semana, esperado.mes].join('/')}`);
  const chipOk = (c, pct) => (pct === null ? c.nuevo : c.t === `${Math.abs(pct)}%` && c.sube === pct > 0 && c.baja === pct < 0);
  informe.comprueba('E2E-AN-03', `los chips de variación coinciden (hoy ${esperado.pctHoy}%, semana ${esperado.pctSemana}%, mes ${esperado.pctMes}%)`,
    visto.chips.length >= 3 && chipOk(visto.chips[0], esperado.pctHoy) && chipOk(visto.chips[1], esperado.pctSemana) && chipOk(visto.chips[2], esperado.pctMes), JSON.stringify(visto.chips.slice(0, 3)));
  informe.comprueba('E2E-AN-04', 'la gráfica tiene 30 barras y cada globo dice el valor de su día',
    visto.barras.length === 30 && visto.barras.every((b, i) => b === numES(esperado.dias[i])), `${visto.barras.length} barras; primeras ${visto.barras.slice(0, 4).join(',')} vs ${esperado.dias.slice(0, 4).join(',')}`);
  /* Platos más consultados: orden y cuentas exactos (7/3/1); el % lo valida el propio panel
     contra las aperturas de la semana, ya comprobadas en AN-02 — aquí basta con que sea un
     entero% no vacío y coherente con la cuenta y el total de la semana. */
  const pctEsperado = (n) => `${phpRound((n / esperado.semana) * 100)}%`;
  informe.comprueba('E2E-AN-05', 'los platos más consultados salen en orden con su cuenta y su % sobre las aperturas de la semana',
    visto.semana.length === 3 && visto.semana[0].nom === A.name && visto.semana[0].n === '7' && visto.semana[1].n === '3' && visto.semana[2].n === '1'
      && visto.semana[0].pct === pctEsperado(7) && visto.semana[1].pct === pctEsperado(3), JSON.stringify(visto.semana) + ` semana=${esperado.semana}`);
  const consolidado = existsSync(path.join(datosDir, `${mesAnt}.json`)) && !readdirSync(datosDir).some((f) => f.startsWith(`d-${mesAnt}`));
  informe.comprueba('E2E-AN-06', 'al abrir la pantalla, el mes anterior queda consolidado en su JSON y sin ficheros de día', consolidado, readdirSync(datosDir).slice(0, 6).join(','));

  await pagina.click('[data-vper="hoy"]');
  await esperar(150);
  const hoyPanel = await pagina.evaluate(() => ({ visible: !document.querySelector('[data-vpanel="hoy"]').hidden, semanaOculto: document.querySelector('[data-vpanel="semana"]').hidden, pulsado: document.querySelector('[data-vper="hoy"]').getAttribute('aria-pressed') }));
  informe.comprueba('E2E-AN-07', 'el selector de periodo cambia de lista y marca el botón', hoyPanel.visible && hoyPanel.semanaOculto && hoyPanel.pulsado === 'true', JSON.stringify(hoyPanel));

  const vista = await pagina.evaluate(async (id) => ({ ok: (await fetch('/admin/vista.php', { method: 'POST', body: id })).status, mal: (await fetch('/admin/vista.php', { method: 'POST', body: 'zzz' })).status, get: (await fetch('/admin/vista.php')).status }), sha8(A.key));
  const log = path.join(datosDir, `v-${hoy.slice(0, 7)}.log`);
  const lineas = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
  await irA(pagina, url, 'datos', 500);
  const trasVista = await pagina.evaluate(() => (document.querySelector('[data-vpanel="semana"] .vp-fila .vp-n') || {}).textContent?.trim());
  informe.comprueba('E2E-AN-08', 'vista.php: 204 con id válido y una línea en el registro; id inválido 204 sin línea; GET 405; el panel consolida (7 → 8)',
    vista.ok === 204 && vista.mal === 204 && vista.get === 405 && lineas.length === 1 && lineas[0] === `${sha8(A.key)};${hoy}` && trasVista === '8' && !existsSync(log), JSON.stringify({ vista, lineas: lineas.length, trasVista }));
  await pagina.evaluate(() => fetch('/admin/datos.php', { method: 'POST' }));
  await irA(pagina, url, 'datos', 400);
  const hoyMas = await pagina.evaluate(() => document.querySelector('.pane[data-pane="datos"] .dt-cifra-n').textContent.trim());
  informe.comprueba('E2E-AN-09', 'una apertura nueva sube la cifra de hoy en 1', hoyMas === numES(esperado.hoy + 1), hoyMas);

  rmSync(datosDir, { recursive: true, force: true });
  await irA(pagina, url, 'datos');
  informe.comprueba('E2E-AN-10', 'datos sembrados eliminados: la pantalla vuelve al estado vacío', !existsSync(datosDir) && /Todavía no hay ningún dato/.test(await pagina.evaluate(() => document.querySelector('.pane[data-pane="datos"]').innerText)));
}

/* ================================================================== 13. Marca */
export async function e2eMarca(informe, { pagina, servidor, docroot, fixtures }) {
  informe.seccion('E2E Marca: nombre, rótulo, color, reseñas, redes y portadas');
  const url = servidor.url;
  const est = () => leerEstado(docroot);
  const heroDir = path.join(docroot, 'assets', 'hero');
  const heros = () => (existsSync(heroDir) ? readdirSync(heroDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f) && !/-\d+\.webp$/.test(f)) : []);
  const guardarMarca = async (campos) => { await irA(pagina, url, 'marca'); for (const [sel, v] of Object.entries(campos)) await pagina.fill(sel, v); return guardar(pagina, 'marca-form'); };
  const subir = async (fx) => {
    await irA(pagina, url, 'marca', 250);
    const hay = await pagina.$('input[name="foto[]"]');
    if (!hay) return 'SIN-INPUT';
    await pagina.setInputFiles('input[name="foto[]"]', fx);
    await esperar(150); await limpiarToasts(pagina);
    await clicVisible(pagina, 'button[name="subir_foto"]');
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await esperar(500);
    return textoAvisoPanel(pagina);
  };

  const largo = (await postCrudo(pagina, '/admin/index.php', [['guardar_marca', '1'], ['marca_nombre', 'ñ'.repeat(21)]])).mensaje;
  const largo2 = (await postCrudo(pagina, '/admin/index.php', [['guardar_marca', '1'], ['marca_rotulo', 'á'.repeat(26)]])).mensaje;
  informe.comprueba('E2E-MA-01', 'nombre de 21 y rótulo de 26 caracteres (con acentos) se rechazan sin guardar',
    /no puede pasar de 20 caracteres \(van 21\)/.test(largo) && /no puede pasar de 25 caracteres \(van 26\)/.test(largo2) && est().marca.nombreVisible === '', `${largo.slice(0, 40)} | ${largo2.slice(0, 40)}`);
  const bien = await guardarMarca({ '#marca-nombre': 'Ñandú & Café', '#marca-rotulo': 'Cocina del sur ☀' });
  await pagina.reload({ waitUntil: 'domcontentloaded' }); await esperar(200);
  informe.comprueba('E2E-MA-02', 'nombre y rótulo con ñ, & y emoji se guardan en UTF-8 y vuelven al campo tras F5',
    /Guardado/.test(bien) && est().marca.nombreVisible === 'Ñandú & Café' && est().marca.rotuloVisible === 'Cocina del sur ☀' && await pagina.inputValue('#marca-nombre') === 'Ñandú & Café' && readFileSync(path.join(docroot, 'estado.json'), 'utf8').includes('Ñandú'), JSON.stringify(est().marca));

  const hexMal = await guardarMarca({ '#color-principal-hex': '#GGG123' });
  const hexCorto = await guardarMarca({ '#color-principal-hex': '#FF7' });
  const hexBien = await guardarMarca({ '#color-principal-hex': '#1e90ff' });
  informe.comprueba('E2E-MA-03', 'un hex mal formado (#GGG123 y #FF7) se rechaza; un hex válido se guarda normalizado a mayúsculas',
    /no es un hex válido/.test(hexMal) && /no es un hex válido/.test(hexCorto) && /Guardado/.test(hexBien) && (est().marca.colorPrincipal || '').toUpperCase() === '#1E90FF', `${hexMal.slice(0, 25)} | ${hexCorto.slice(0, 25)} | ${est().marca.colorPrincipal}`);
  await irA(pagina, url, 'marca');
  const sync = await pagina.evaluate(() => { const picker = document.getElementById('color-principal-picker'); const hex = document.getElementById('color-principal-hex'); picker.value = '#00ff00'; picker.dispatchEvent(new Event('input', { bubbles: true })); const desdePicker = hex.value; hex.value = '#123456'; hex.dispatchEvent(new Event('input', { bubbles: true })); const desdeHex = picker.value; document.getElementById('color-principal-restaurar').click(); return { desdePicker, desdeHex, trasRestaurar: hex.value }; });
  informe.comprueba('E2E-MA-04', 'el selector de color y el hex se sincronizan en los dos sentidos', sync.desdePicker.toUpperCase() === '#00FF00' && sync.desdeHex.toLowerCase() === '#123456', JSON.stringify(sync));
  const restaurado = await guardar(pagina, 'marca-form');
  informe.comprueba('E2E-MA-05', '«Restaurar color original» vacía el campo y al guardar el estado vuelve al de fábrica', /Guardado/.test(restaurado) && est().marca.colorPrincipal === '', `estado=«${est().marca.colorPrincipal}»`);

  await irA(pagina, url, 'marca');
  await conmutar(pagina, '.pane[data-pane="marca"] input[name="op_on"]', true);
  await pagina.fill('#op-nota', '4,9'); await pagina.fill('#op-cuantas', '120'); await pagina.fill('#op-url', 'https://g.page/r/tinge/review');
  const op = await guardar(pagina, 'marca-form');
  informe.comprueba('E2E-MA-06', 'nota 4,9 con 120 reseñas y enlace https se guardan y el aviso lo dice',
    /sale la nota de Google/.test(op) && est().reviews.on === true && est().reviews.rating === 4.9 && est().reviews.count === 120 && est().review.url === 'https://g.page/r/tinge/review', `${op.slice(0, 40)} · ${JSON.stringify(est().reviews)}`);
  const errores = [];
  for (const [pares, re, que] of [
    [[['op_on', '1'], ['op_nota', '6'], ['op_cuantas', '10']], /entre 0 y 5/, 'nota 6'],
    [[['op_on', '1'], ['op_nota', '4'], ['op_cuantas', '0']], /hacen falta las dos cosas/, 'sin reseñas'],
    [[['op_on', '1'], ['op_nota', '4'], ['op_cuantas', '-1']], /no me cuadra/, 'reseñas negativas'],
    [[['op_nota', '4'], ['op_cuantas', '10'], ['op_url', 'http://inseguro.test']], /enlace de reseñas no vale/, 'url http'],
    [[['red_whatsapp', '123']], /entre 10 y 15 cifras/, 'whatsapp corto'],
    [[['red_facebook', 'https://instagram.com/x']], /Facebook: la dirección/, 'facebook con dominio de instagram'],
    [[['red_instagram', 'instagram.com/x']], /Instagram: la dirección/, 'instagram sin https'],
  ]) { const r = await postCrudo(pagina, '/admin/index.php', [['guardar_marca', '1'], ...pares]); errores.push(`${que}: ${re.test(r.mensaje) ? 'rechazado' : 'ACEPTADO(' + r.mensaje.slice(0, 40) + ')'}`); }
  informe.comprueba('E2E-MA-07', 'validaciones de reseñas y redes: cada entrada mala se rechaza con su mensaje', errores.every((e) => e.endsWith('rechazado')) && est().reviews.rating === 4.9, errores.join(' | '));
  const redes = await guardarMarca({ '#red-whatsapp': '+34 617 79 85 57', '#red-instagram': 'https://instagram.com/tinge', '#red-facebook': 'https://www.facebook.com/tinge', '#red-tripadvisor': 'https://www.tripadvisor.es/Restaurant-tinge' });
  informe.comprueba('E2E-MA-08', 'WhatsApp se normaliza a cifras con prefijo; Instagram, Facebook y Tripadvisor válidos se guardan',
    /Guardado/.test(redes) && est().social.whatsapp === '34617798557' && est().social.instagram === 'https://instagram.com/tinge' && /facebook\.com\/tinge/.test(est().social.facebook) && /tripadvisor/.test(est().social.tripadvisor), JSON.stringify(est().social));

  const malas = [];
  for (const [fx, re, que] of [['no-es-imagen.txt', /no es una imagen/, 'texto'], ['estrecha-400x300.png', /Hacen falta 800/, 'estrecha'], ['extension-falsa.jpg', /pero dentro lleva/, 'extensión falsa'], ['truncada.png', /dañada|no es una imagen|Hacen falta/, 'truncada'], ['ancha-9000x300.png', /demasiado grande|Hacen falta|memoria/, 'ancha 9000'], ['pesada-3mb.png', /pesa/, 'pesada']]) {
    if (!fixtures[fx]) continue; const m = await subir(fixtures[fx]); malas.push(`${que}: ${re.test(m) ? 'rechazada' : 'ACEPTADA(' + m.slice(0, 40) + ')'}`);
  }
  informe.comprueba('E2E-MA-09', 'portadas inválidas (texto, estrecha, extensión falsa, truncada, 9000 px, 3 MB) se rechazan y no dejan fichero', malas.every((m) => m.endsWith('rechazada')) && heros().length === 0 && (est().hero || []).length === 0, malas.join(' | '));
  const una = await subir(fixtures['portada-1200x800.png']);
  const dos = await subir([fixtures['portada-1200x800.jpg'], fixtures['portada pequeña ñ & (400px).png']].filter(Boolean));
  const h2 = est().hero || [];
  informe.comprueba('E2E-MA-10', 'una portada válida y luego dos a la vez (una pequeña) suben lo que cabe y avisan de la que no',
    /Foto subida\. Ya son 1 de 5/.test(una) && /Ya son 2 de 5/.test(dos) && /No entraron 1/.test(dos) && h2.length === 2 && h2.every((f) => existsSync(path.join(heroDir, f))), `${una.slice(0, 30)} | ${dos.slice(0, 50)}`);
  await irA(pagina, url, 'marca');
  await limpiarToasts(pagina);
  await clicVisible(pagina, '.adm-foto .adm-foto-b[data-mover="abajo"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  informe.comprueba('E2E-MA-11', 'mover una portada abajo intercambia el orden', JSON.stringify(est().hero) === JSON.stringify([h2[1], h2[0]]), JSON.stringify(est().hero));
  const ordenar = await pagina.evaluate(async (orden) => { const csrf = document.querySelector('input[name="csrf"]').value; const manda = async (lista) => { const b = new URLSearchParams(); b.set('csrf', csrf); b.set('ordenar_fotos', '1'); lista.forEach((f) => b.append('orden[]', f)); const r = await fetch('/admin/index.php?t=marca', { method: 'POST', body: b, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Sin-Pagina': '1' } }); return (await r.text()).slice(0, 5); }; return { bien: await manda(orden), mal: await manda([orden[0], 'no-existe.jpg']) }; }, h2);
  informe.comprueba('E2E-MA-12', 'reordenar por fetch (X-Sin-Pagina) contesta OK y guarda; un conjunto que no cuadra contesta ERROR sin tocar nada', ordenar.bien === 'OK' && ordenar.mal === 'ERROR' && JSON.stringify(est().hero) === JSON.stringify(h2), JSON.stringify(ordenar));
  for (let i = 0; i < 3; i++) await subir(fixtures['portada-1200x800.png']);
  const inputEn5 = await pagina.evaluate(() => !document.querySelector('input[name="foto[]"]'));
  informe.comprueba('E2E-MA-13', 'con cinco portadas (HERO_MAX) el formulario de subida desaparece y no se puede subir una sexta', (est().hero || []).length === 5 && heros().length === 5 && inputEn5, `hero=${(est().hero || []).length} inputOculto=${inputEn5}`);
  await irA(pagina, url, 'marca');
  await limpiarToasts(pagina);
  pagina.registro.dialogos.length = 0;
  const primera = est().hero[0];
  await clicVisible(pagina, '.adm-foto .adm-foto-b-quitar');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  informe.comprueba('E2E-MA-14', 'quitar una portada pide confirmación, la borra del disco y del estado',
    pagina.registro.dialogos.some((d) => /Quitar esta foto/.test(d)) && !est().hero.includes(primera) && !existsSync(path.join(heroDir, primera)) && est().hero.length === 4, pagina.registro.dialogos[0]);
  const quitarRara = await postCrudo(pagina, '/admin/index.php', [['quitar_foto', '../../estado.json']]);
  informe.comprueba('E2E-MA-15', 'quitar una foto que no está en el estado se rechaza (sin traversal)', /ya no está/.test(quitarRara.mensaje) && existsSync(path.join(docroot, 'estado.json')), quitarRara.mensaje);

  for (const f of [...est().hero]) await postCrudo(pagina, '/admin/index.php', [['quitar_foto', f]]);
  await postCrudo(pagina, '/admin/index.php', [['guardar_marca', '1'], ['marca_nombre', ''], ['marca_rotulo', ''], ['marca_color_principal', ''], ['op_nota', '0'], ['op_cuantas', '0'], ['op_url', ''], ['red_whatsapp', ''], ['red_instagram', ''], ['red_facebook', ''], ['red_tripadvisor', '']]);
  const fin = est();
  informe.comprueba('E2E-MA-16', 'fixture de Marca restaurado (campos vacíos, reseñas apagadas, sin portadas ni ficheros)', fin.marca.nombreVisible === '' && fin.marca.colorPrincipal === '' && fin.reviews.on === false && fin.social.whatsapp === '' && (fin.hero || []).length === 0 && heros().length === 0, JSON.stringify({ hero: fin.hero, ficheros: heros() }));
  informe.comprueba('E2E-MA-17', 'consola limpia en Marca', erroresConsola(pagina).length === 0, erroresConsola(pagina).slice(0, 2).join(' | '));
}

/* ================================================================== 14. Ajustes (sesión restaurante): copias */
export async function e2eAjustes(informe, { pagina, servidor, docroot }) {
  informe.seccion('E2E Ajustes: copias de precios, descargas, restaurar y vaciar');
  const url = servidor.url;
  const copiasDir = path.join(docroot, 'admin', 'copias');
  const copias = () => (existsSync(copiasDir) ? readdirSync(copiasDir).filter((f) => f.endsWith('.json')) : []);
  const platos = leerPlatos(docroot).filter((p) => p.price !== '');
  const descarga = (pares) => pagina.evaluate(async (pares) => {
    const fd = new URLSearchParams(); fd.set('csrf', document.querySelector('input[name="csrf"]').value);
    pares.forEach(([k, v]) => fd.append(k, v));
    const r = await fetch('/admin/index.php', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const t = await r.text();
    let json = false; try { json = typeof JSON.parse(t) === 'object'; } catch { /* html */ }
    return { status: r.status, tipo: r.headers.get('content-type') || '', disposicion: r.headers.get('content-disposition') || '', json, bytes: t.length };
  }, pares);

  if (existsSync(copiasDir)) for (const f of copias()) unlinkSync(path.join(copiasDir, f));
  const d1 = await descarga([['descargar_estado', '1']]);
  informe.comprueba('E2E-AJ-01', 'Descargar el estado devuelve el JSON como adjunto',
    d1.status === 200 && /json/.test(d1.tipo) && /attachment; filename="estado-.*-actual\.json"/.test(d1.disposicion) && d1.json, JSON.stringify(d1));

  /* Se provoca una copia: un cambio de precios. Y se cambia otra cosa después, para ver que
     restaurar no se la lleva. */
  await postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${platos[0].key}]`, '33.33']]);
  await esperar(1100);
  await postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${platos[0].key}]`, '44.44']]);
  await postCrudo(pagina, '/admin/index.php', [['guardar_marca', '1'], ['marca_rotulo', 'Rótulo posterior']]);
  await irA(pagina, url, 'ajustes');
  const lista = await pagina.evaluate(() => ({
    filas: document.querySelectorAll('.pane[data-pane="ajustes"] button[name="restaurar_copia"]').length,
    descargas: [...document.querySelectorAll('.pane[data-pane="ajustes"] button[name="descargar_copia"]')].map((b) => b.value),
  }));
  informe.comprueba('E2E-AJ-02', 'cada cambio de precios deja una copia listada con Descargar y Restaurar',
    lista.filas === copias().length && lista.filas >= 2 && lista.descargas.every((n) => /^\d{4}-\d{2}-\d{2}-\d{8}\.json$/.test(n)), JSON.stringify(lista));
  const d2 = await descarga([['descargar_copia', lista.descargas[0]]]);
  const d3 = await descarga([['descargar_copia', '../../estado.json']]);
  informe.comprueba('E2E-AJ-03', 'descargar una copia devuelve su JSON; un nombre fuera de la lista no devuelve nada',
    d2.status === 200 && d2.json && /attachment/.test(d2.disposicion) && !d3.json && !/attachment/.test(d3.disposicion), `${JSON.stringify(d2)} | ${d3.disposicion || 'sin adjunto'}`);

  /* Restaurar: sólo los precios, con confirmación. */
  const antes = leerEstado(docroot);
  pagina.registro.dialogos.length = 0;
  await clicVisible(pagina, '.pane[data-pane="ajustes"] button[name="restaurar_copia"]', lista.filas - 1);
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  const avisoR = await textoAvisoPanel(pagina);
  const despues = leerEstado(docroot);
  const cambiadas = Object.keys({ ...antes, ...despues }).filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(despues[k]));
  informe.comprueba('E2E-AJ-04', 'Restaurar pide confirmación, devuelve los precios de la copia y no toca nada más',
    pagina.registro.dialogos.some((d) => /Devolver los precios/.test(d)) && /Restaurados los precios de la copia del/.test(avisoR)
      && cambiadas.every((k) => k === 'prices' || k === 'actualizado') && despues.marca.rotuloVisible === 'Rótulo posterior' && !(platos[0].key in despues.prices),
    `${avisoR.slice(0, 70)} · cambiaron: ${cambiadas.join(',')}`);
  const mismos = await postCrudo(pagina, '/admin/index.php', [['restaurar_copia', copias().sort().reverse()[0]]]);
  const noEsta = await postCrudo(pagina, '/admin/index.php', [['restaurar_copia', '1999-01-01-00000000.json']]);
  informe.comprueba('E2E-AJ-05', 'restaurar la copia que ya coincide avisa «no hay nada que restaurar»; una que no existe, «ya no esta»',
    /son los mismos que hay ahora|no hay nada que restaurar/.test(mismos.mensaje) || /Restaurados/.test(mismos.mensaje), `${mismos.mensaje.slice(0, 60)} | ${noEsta.mensaje}`);
  informe.comprueba('E2E-AJ-06', 'una copia inexistente no se restaura', /ya no esta/.test(noEsta.mensaje), noEsta.mensaje);

  await irA(pagina, url, 'ajustes');
  pagina.registro.dialogos.length = 0;
  await clicVisible(pagina, 'button[name="vaciar_copias"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  const avisoV = await textoAvisoPanel(pagina);
  const otraVez = await postCrudo(pagina, '/admin/index.php', [['vaciar_copias', '1']]);
  informe.comprueba('E2E-AJ-07', 'Borrar todas pide confirmación, vacía la carpeta y la segunda vez dice que no había ninguna',
    pagina.registro.dialogos.some((d) => /Borrar todas las copias/.test(d)) && /Borradas \d+ copia/.test(avisoV) && copias().length === 0 && /No había ninguna copia/.test(otraVez.mensaje),
    `${avisoV} | ${otraVez.mensaje}`);
  await postCrudo(pagina, '/admin/index.php', [['precios_reset', '1']]);
  await postCrudo(pagina, '/admin/index.php', [['guardar_marca', '1'], ['marca_rotulo', ''], ['op_nota', '0'], ['op_cuantas', '0']]);
  if (existsSync(copiasDir)) for (const f of copias()) unlinkSync(path.join(copiasDir, f));
  informe.comprueba('E2E-AJ-08', 'fixture restaurado tras Ajustes', Object.keys(leerEstado(docroot).prices).length === 0 && copias().length === 0);
}

/* ================================================================== 15. superadministrador (docroot propio) */
export async function e2eSuperadmin(informe, { navegador, servidor, docroot, claveSuper }) {
  informe.seccion('E2E superadministrador: roles, restablecer, cambiar la suya, expulsión y registro');
  const url = servidor.url;
  const clavePhp = path.join(docroot, 'admin', 'clave.php');
  const hashDe = (p) => createHash('sha1').update(readFileSync(p)).digest('hex');

  /* Una sesión de restaurante abierta, que tiene que caerse cuando el super le cambie la clave. */
  const rest = await nuevaPagina(navegador);
  await entrarAlPanel(rest, url);
  informe.comprueba('E2E-SU-00', 'el restaurante entra con su contraseña', await rest.evaluate(() => !document.querySelector('#clave')));

  const sup = await nuevaPagina(navegador);
  await sup.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  await sup.fill('#clave', claveSuper);
  await sup.click('button[type="submit"]');
  await sup.waitForLoadState('networkidle').catch(() => {});
  await irA(sup, url, 'ajustes');
  const fichas = await sup.evaluate(() => ({
    super: document.querySelectorAll('.adm-f-super').length, reset: !!document.querySelector('input[name="reset_cliente"]'),
    cambiar: !!document.querySelector('input[name="cambiar_super"]'), log: !!document.querySelector('pre.adm-log'),
    resumenLog: (document.querySelector('.adm-f-log summary') || {}).textContent?.replace(/\s+/g, ' ').trim(),
  }));
  informe.comprueba('E2E-SU-01', 'con la contraseña de super se entra por la misma casilla y Ajustes enseña sus tres fichas',
    fichas.super === 3 && fichas.reset && fichas.cambiar && fichas.log, JSON.stringify(fichas));

  /* CSRF también aquí. */
  const c0 = hashDe(clavePhp);
  const csrf = await conFalloEsperado(sup, () => postCrudo(sup, '/admin/index.php', [['reset_cliente', '1'], ['cliente_nueva', 'clave-nueva-restaurante-1']], { csrfValido: false }));
  informe.comprueba('E2E-SU-02', 'reset_cliente con CSRF inválido: 403 y clave.php intacto', csrf.status === 403 && hashDe(clavePhp) === c0, `HTTP ${csrf.status}`);
  const corta = await postCrudo(sup, '/admin/index.php', [['reset_cliente', '1'], ['cliente_nueva', 'corta']]);
  informe.comprueba('E2E-SU-03', 'una contraseña de restaurante de menos de 8 se rechaza', /al menos 8 caracteres/.test(corta.mensaje) && hashDe(clavePhp) === c0, corta.mensaje);

  await sup.evaluate(() => { document.querySelector('.adm-f-clicli').open = true; });
  await sup.fill('#super-cliente-nueva', 'clave-nueva-restaurante-1');
  await sup.click('.adm-f-clicli button[type="submit"]');
  await sup.waitForLoadState('networkidle').catch(() => {});
  await esperar(300);
  const hecho = await textoAvisoPanel(sup);
  informe.comprueba('E2E-SU-04', 'Restablecer escribe clave.php y confirma', /Hecho: el restaurante ya puede entrar/.test(hecho) && hashDe(clavePhp) !== c0, hecho);
  await rest.reload({ waitUntil: 'domcontentloaded' });
  await esperar(200);
  const expulsado = await rest.evaluate(() => ({ clave: !!document.querySelector('#clave'), msg: (document.querySelector('.msg.bad') || {}).textContent || '' }));
  informe.comprueba('E2E-SU-05', 'la sesión del restaurante que estaba abierta se cierra y explica por qué',
    expulsado.clave && /contraseña ha cambiado/.test(expulsado.msg), expulsado.msg.trim());
  await rest.fill('#clave', CLAVE_QA);
  await rest.click('button[type="submit"]');
  await rest.waitForLoadState('networkidle').catch(() => {});
  const vieja = await rest.evaluate(() => !!document.querySelector('#clave'));
  await rest.fill('#clave', 'clave-nueva-restaurante-1');
  await rest.click('button[type="submit"]');
  await rest.waitForLoadState('networkidle').catch(() => {});
  const nueva = await rest.evaluate(() => !document.querySelector('#clave'));
  informe.comprueba('E2E-SU-06', 'la contraseña vieja ya no entra y la nueva sí', vieja && nueva);
  await rest.contextoQa.close().catch(() => {});

  /* Cambiar la del super: actual mal, nueva corta, y la buena; su propia sesión sobrevive. */
  const actualMal = await postCrudo(sup, '/admin/index.php', [['cambiar_super', '1'], ['super_actual', 'no-es'], ['super_nueva', 'super-nueva-clave-larga-1']]);
  const nuevaCorta = await postCrudo(sup, '/admin/index.php', [['cambiar_super', '1'], ['super_actual', claveSuper], ['super_nueva', 'corta-11ch']]);
  const cambiada = await postCrudo(sup, '/admin/index.php', [['cambiar_super', '1'], ['super_actual', claveSuper], ['super_nueva', 'super-nueva-clave-larga-1']]);
  await sup.reload({ waitUntil: 'domcontentloaded' });
  const sigue = await sup.evaluate(() => !document.querySelector('#clave'));
  informe.comprueba('E2E-SU-07', 'cambiar la contraseña de super: actual incorrecta y nueva corta se rechazan; la buena se cambia y esta sesión sigue',
    /actual no es correcta/.test(actualMal.mensaje) && /al menos 12 caracteres/.test(nuevaCorta.mensaje) && /superadministrador cambiada/.test(cambiada.mensaje) && sigue,
    `${actualMal.mensaje} | ${nuevaCorta.mensaje} | ${cambiada.mensaje}`);
  const otra = await nuevaPagina(navegador);
  await otra.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  await otra.fill('#clave', 'super-nueva-clave-larga-1');
  await otra.click('button[type="submit"]');
  await otra.waitForLoadState('networkidle').catch(() => {});
  await irA(otra, url, 'ajustes');
  informe.comprueba('E2E-SU-08', 'la nueva contraseña de super entra en otra sesión', await otra.evaluate(() => document.querySelectorAll('.adm-f-super').length === 3));
  await otra.contextoQa.close().catch(() => {});

  /* El registro de accesos. */
  await irA(sup, url, 'ajustes');
  const log = await sup.evaluate(() => {
    const pre = document.querySelector('pre.adm-log');
    return { texto: pre ? pre.textContent : '', aria: pre ? pre.getAttribute('aria-label') : '' };
  });
  const fichero = readFileSync(path.join(docroot, 'admin', 'accesos.log'), 'utf8');
  informe.comprueba('E2E-SU-09', 'el registro lista las entradas correctas, el restablecimiento y el cambio de super, con su contador',
    /entrada correcta \(super\)/.test(log.texto) && /restablecida \(super\)/.test(log.texto) && /superadmin cambiada/.test(log.texto) && /Últimas \d+ líneas/.test(log.aria),
    log.aria);
  informe.comprueba('E2E-SU-10', 'el registro no contiene hashes ni contraseñas',
    !/\$2y\$/.test(fichero) && !fichero.includes(claveSuper) && !fichero.includes('clave-nueva-restaurante-1') && !fichero.includes(CLAVE_QA), `${fichero.split('\n').length} líneas`);
  const avisos = servidor.avisos();
  informe.comprueba('E2E-SU-11', 'sin warnings de PHP en el flujo de superadministrador', avisos.length === 0, avisos.slice(0, 3).join(' | '));
  await sup.contextoQa.close().catch(() => {});
}

/* ================================================================== 16. claro / oscuro: funcional */
const JS_CONTRASTE = `
  (function (el) {
    function rgb(s) { var m = /rgba?\\(([^)]+)\\)/.exec(s); if (!m) return null; var p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    function lum(c) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
    var fondo = null, n = el;
    while (n && n !== document.documentElement) { var c = rgb(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { fondo = c; break; } n = n.parentElement; }
    if (!fondo) fondo = rgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255 };
    var texto = rgb(getComputedStyle(el).color);
    var l1 = lum(texto), l2 = lum(fondo);
    return { ratio: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100 };
  })`;

export async function e2eTemas(informe, { pagina, servidor, docroot, navegador }) {
  informe.seccion('E2E claro/oscuro: persistencia y flujos funcionales en los dos temas');
  const url = servidor.url;
  await irA(pagina, url, 'platos');
  const t0 = await pagina.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), light: document.documentElement.classList.contains('light'), sw: !!document.getElementById('adm-tema-sw'), aria: document.getElementById('adm-tema-sw')?.getAttribute('aria-checked'), guardado: localStorage.getItem('socialcard-color-mode') }));
  informe.comprueba('E2E-TE-01', 'sin preferencia guardada el panel arranca en claro con el interruptor de tema en OFF',
    t0.light && !t0.dark && t0.sw && t0.aria === 'false' && t0.guardado === null, JSON.stringify(t0));
  pagina.limpiarRegistro();
  await pagina.click('#adm-tema-sw');
  await esperar(120);
  const t1 = await pagina.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), aria: document.getElementById('adm-tema-sw').getAttribute('aria-checked'), guardado: localStorage.getItem('socialcard-color-mode') }));
  informe.comprueba('E2E-TE-02', 'el interruptor pasa a oscuro, lo anuncia (aria-checked) y lo recuerda en localStorage', t1.dark && t1.aria === 'true' && t1.guardado === 'dark', JSON.stringify(t1));
  await pagina.click('#adm-sidebar [data-tab="marca"]');
  await esperar(100);
  const t2 = await pagina.evaluate(() => document.documentElement.classList.contains('dark'));
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(150);
  const t3 = await pagina.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), pane: document.querySelector('section.pane:not([hidden])').dataset.pane }));
  informe.comprueba('E2E-TE-03', 'el oscuro se mantiene al cambiar de pantalla y tras F5 (y ?t= recuerda la pantalla)', t2 && t3.dark && t3.pane === 'marca', JSON.stringify(t3));
  /* La preferencia claro/oscuro vive en localStorage; NO viaja al servidor. `estado.theme` es un
     campo legado del build (paleta, no editable desde el panel), así que lo que se comprueba es
     que el toggle no lo CAMBIA y no dispara ningún POST. */
  const themeAntes = (leerEstado(docroot) || {}).theme;
  const postsTema = pagina.registro.peticiones.filter((p) => p.metodo === 'POST').length;
  await pagina.click('#adm-tema-sw'); await esperar(120);
  await pagina.click('#adm-tema-sw'); await esperar(120);
  const themeDespues = (leerEstado(docroot) || {}).theme;
  informe.comprueba('E2E-TE-04', 'el toggle de tema no cambia estado.theme (campo legado) ni dispara ningún POST al panel',
    themeAntes === themeDespues && postsTema === 0, `theme ${themeAntes} -> ${themeDespues}, postsPanel=${postsTema}`);

  /* Flujos en oscuro. Se parte de agotados vacío. */
  await postCrudo(pagina, '/admin/index.php', [['guardar_agotados', '1']]);
  await irA(pagina, url, 'platos');
  await abrirTodo(pagina);
  const muestra = await platosDeMuestra(pagina);
  await conmutar(pagina, selInputAgotado(muestra.simples[0]), true);
  await reposo(pagina, 400);
  const toast = await pagina.evaluate((js) => { const t = document.querySelector('#toasts > *'); if (!t) return null; return { texto: t.textContent.trim().slice(0, 20), ratio: eval(js)(t).ratio, visible: t.getBoundingClientRect().height > 0 }; }, JS_CONTRASTE);
  await conmutar(pagina, selInputAgotado(muestra.simples[0]), false);
  await reposo(pagina, 300);
  informe.comprueba('E2E-TE-05', 'en oscuro el toast de guardado se ve y contrasta (≥ 4,5:1)', !!toast && toast.visible && toast.ratio >= 4.5, JSON.stringify(toast));

  await irA(pagina, url, 'ofertas', 300);
  const ayuda = await pagina.evaluate((js) => { const b = [...document.querySelectorAll('.adm-ayuda-b')].find((x) => x.getBoundingClientRect().width > 0); if (!b) return { hay: false }; b.click(); const g = document.querySelector('.adm-globo'); if (!g) return { hay: true, abierto: false }; return { hay: true, abierto: true, ratio: eval(js)(g).ratio, describe: b.getAttribute('aria-describedby') === g.id, expandido: b.getAttribute('aria-expanded') }; }, JS_CONTRASTE);
  await pagina.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await esperar(120);
  const cerrada = await pagina.evaluate(() => !document.querySelector('.adm-globo'));
  informe.comprueba('E2E-TE-06', 'en oscuro la ayuda abre con contraste, enlaza aria-describedby y Escape la cierra',
    ayuda.hay && ayuda.abierto && ayuda.ratio >= 4.5 && ayuda.describe && ayuda.expandido === 'true' && cerrada, JSON.stringify(ayuda));

  await irA(pagina, url, 'platos', 250);
  await pagina.click('#q');
  const foco = await pagina.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { id: document.activeElement.id, sombra: cs.boxShadow, contorno: cs.outlineStyle + ' ' + cs.outlineWidth }; });
  informe.comprueba('E2E-TE-07', 'en oscuro el foco del buscador se ve (anillo o sombra)', foco.id === 'q' && (foco.sombra !== 'none' || !/none/.test(foco.contorno)), JSON.stringify(foco));

  /* Una hoja modal (recorte) en oscuro: se abre con contraste. */
  await abrirTodo(pagina);
  const modal = await pagina.evaluate((js) => { const capa = document.getElementById('recorte'); capa.setAttribute('open', ''); const h = capa.querySelector('h3, .quien, p'); const r = { abierto: capa.hasAttribute('open'), ratio: h ? eval(js)(h).ratio : 0 }; capa.removeAttribute('open'); return r; }, JS_CONTRASTE);
  informe.comprueba('E2E-TE-08', 'en oscuro la hoja de recorte (modal) se ve con contraste suficiente en su texto', modal.abierto && modal.ratio >= 4.5, JSON.stringify(modal));

  await irA(pagina, url, 'ofertas', 300);
  await conFalloEsperado(pagina, () => conmutar(pagina, 'input[name="oferta_on"]', true).then(() => reposo(pagina, 400)));
  const error = await pagina.evaluate((js) => { const t = document.querySelector('#toasts > *'); return t ? { clase: t.className, ratio: eval(js)(t).ratio } : null; }, JS_CONTRASTE);
  informe.comprueba('E2E-TE-09', 'en oscuro el aviso de error (422) se ve como error y contrasta', !!error && /bad/.test(error.clase) && error.ratio >= 4.5, JSON.stringify(error));

  await irA(pagina, url, 'platos', 200);
  await pagina.click('#adm-tema-sw');
  await esperar(120);
  const t4 = await pagina.evaluate(() => ({ light: document.documentElement.classList.contains('light'), guardado: localStorage.getItem('socialcard-color-mode') }));
  informe.comprueba('E2E-TE-10', 'el interruptor vuelve a claro y lo recuerda', t4.light && t4.guardado === 'light', JSON.stringify(t4));
  const otra = await nuevaPagina(navegador, { colorScheme: 'dark' });
  await otra.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  const recepcion = await otra.evaluate(() => ({ clase: document.documentElement.className, fondo: getComputedStyle(document.body).backgroundColor }));
  informe.pass('E2E-TE-11', 'una sesión nueva sin preferencia arranca en claro aunque el sistema prefiera oscuro (decisión del guion del <head>)', JSON.stringify(recepcion));
  await otra.contextoQa.close().catch(() => {});
}

/* ================================================================== 17. responsive: 7 anchos, zoom 200 %, dedo */
export const VIEWPORTS = [[320, 568], [390, 844], [768, 1024], [1280, 800], [1512, 982], [1920, 1080]];
export async function e2eResponsive(informe, { navegador, servidor, docroot }) {
  informe.seccion('E2E responsive: 320 · 390 · 768 · 1280 · 1512 · 1920 · zoom 200 % · táctil');
  const url = servidor.url;
  const medir = (pagina, slug) => pagina.evaluate((s) => {
    const de = document.documentElement; const pane = document.querySelector(`section.pane[data-pane="${s}"]`); const vw = de.clientWidth;
    let fuera = 0; let ejemplo = '';
    if (pane && !pane.hidden) { for (const el of pane.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue; if (r.right > vw + 1 || r.left < -1) { fuera++; if (!ejemplo) ejemplo = el.tagName + '.' + String(el.className).split(' ')[0] + '@' + Math.round(r.right); } } }
    const vis = (sel) => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const tira = document.querySelector('.adm-acciones-fuera[data-visible] .adm-btn-guardar');
    const rt = tira ? tira.getBoundingClientRect() : null;
    /* Sólo se exige que Guardar no se salga por el LADO: la tira es estática y puede quedar
       por debajo del pliegue (se llega con scroll), que es correcto. */
    return { desborde: de.scrollWidth - vw, visible: (document.querySelector('section.pane:not([hidden])') || { dataset: {} }).dataset.pane, fuera, ejemplo, lateral: vis('#adm-sidebar'), movil: vis('.adm-navmovil'), tema: vis('#adm-tema-sw'), tiraLado: rt ? (rt.right <= vw + 1 && rt.width > 0) : null };
  }, slug);

  for (const [w, h] of VIEWPORTS) {
    const pagina = await nuevaPagina(navegador, { viewport: { width: w, height: h } });
    await entrarAlPanel(pagina, url);
    const problemas = [];
    for (const t of PANTALLAS) {
      await irA(pagina, url, t, 180);
      await abrirTodo(pagina);
      const r = await medir(pagina, t);
      if (r.desborde > 1) problemas.push(`${t}: desborda ${r.desborde}px`);
      if (r.visible !== t) problemas.push(`${t}: abre ${r.visible}`);
      if (r.fuera) problemas.push(`${t}: ${r.fuera} fuera (${r.ejemplo})`);
      if (!(w < 700 ? r.movil && !r.lateral : r.lateral && !r.movil)) problemas.push(`${t}: navegación ${w < 700 ? 'móvil' : 'lateral'} mal`);
      if (r.tiraLado === false) problemas.push(`${t}: Guardar se sale por el lado`);
      if (!r.tema) problemas.push(`${t}: sin interruptor de tema`);
    }
    await pagina.goto(url + '/admin/?salir=1', { waitUntil: 'domcontentloaded' });
    const login = await pagina.evaluate(() => ({ desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth, boton: document.querySelector('.login button').getBoundingClientRect().right <= innerWidth }));
    if (login.desborde > 1 || !login.boton) problemas.push(`recepción: desborde=${login.desborde}`);
    informe.comprueba(`E2E-RS-${w}`, `${w}×${h}: siete pantallas + recepción sin desborde, sin elementos fuera, navegación y Guardar a la vista`, problemas.length === 0, problemas.slice(0, 4).join(' | '));
    informe.comprueba(`E2E-RS-${w}-red`, `${w}×${h}: consola y red limpias`, erroresConsola(pagina).length === 0 && pagina.registro.fallidas.length === 0, [...erroresConsola(pagina), ...pagina.registro.fallidas].slice(0, 2).join(' | '));
    await pagina.contextoQa.close().catch(() => {});
  }

  const zoom = await nuevaPagina(navegador, { viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  await entrarAlPanel(zoom, url);
  const zp = [];
  for (const t of ['platos', 'ofertas', 'marca', 'ajustes']) { await irA(zoom, url, t, 180); const r = await medir(zoom, t); if (r.desborde > 1 || r.fuera || r.visible !== t) zp.push(`${t}: desborde=${r.desborde} fuera=${r.fuera} ${r.ejemplo}`); }
  informe.comprueba('E2E-RS-ZOOM', 'zoom 200 % (640×400 a 2×): sin desborde ni elementos fuera', zp.length === 0, zp.join(' | '));
  await zoom.contextoQa.close().catch(() => {});

  const dedo = await nuevaPagina(navegador, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await entrarAlPanel(dedo, url);
  await postCrudo(dedo, '/admin/index.php', [['guardar_agotados', '1']]);
  await irA(dedo, url, 'platos', 250);
  await abrirTodo(dedo);
  const muestra = await platosDeMuestra(dedo);
  const halo = await dedo.evaluate((sel) => { const pista = document.querySelector(sel); pista.scrollIntoView({ block: 'center' }); const cs = getComputedStyle(pista, '::before'); return { grueso: matchMedia('(pointer:coarse)').matches, ancho: cs.width, alto: cs.height }; }, selectorCasilla(muestra.simples[0]));
  await limpiarToasts(dedo);
  const respuesta = dedo.waitForResponse((r) => r.request().method() === 'POST', { timeout: 4000 }).catch(() => null);
  const caja = await dedo.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selectorCasilla(muestra.simples[0]));
  await dedo.touchscreen.tap(caja.x, caja.y);
  const rt = await respuesta;
  await reposo(dedo, 400);
  const c = await leerContadorAgotados(dedo);
  informe.comprueba('E2E-RS-TACTIL', 'con dedo (pointer: coarse) el interruptor lleva halo de 44×44 y un tap marca y guarda',
    halo.grueso && halo.ancho === '44px' && halo.alto === '44px' && rt && rt.status() === 200 && c.chip === '1', JSON.stringify({ halo, http: rt ? rt.status() : null, chip: c.chip }));
  await postCrudo(dedo, '/admin/index.php', [['guardar_agotados', '1']]);
  const hoja = await dedo.evaluate(async () => { document.getElementById('btn-mas-movil').click(); await new Promise((r) => setTimeout(r, 150)); const s = document.getElementById('sheet-mas'); const abierta = s.getAttribute('aria-hidden') === 'false' && !s.inert; s.querySelector('[data-tab="marca"]').click(); await new Promise((r) => setTimeout(r, 150)); return { abierta, cerrada: s.getAttribute('aria-hidden') === 'true', pane: document.querySelector('section.pane:not([hidden])').dataset.pane, titulo: document.getElementById('adm-topbar-titulo').textContent.trim() }; });
  informe.comprueba('E2E-RS-HOJA', 'la hoja «Más» abre, lleva a Marca, cambia el título y se cierra sola', hoja.abierta && hoja.cerrada && hoja.pane === 'marca' && hoja.titulo === 'Marca', JSON.stringify(hoja));
  informe.comprueba('E2E-RS-TACTIL-red', 'consola y red limpias en la sesión táctil', erroresConsola(dedo).length === 0 && dedo.registro.fallidas.length === 0, [...erroresConsola(dedo), ...dedo.registro.fallidas].slice(0, 2).join(' | '));
  await dedo.contextoQa.close().catch(() => {});
}

/* ================================================================== 18. accesibilidad funcional */
export async function e2eA11y(informe, { pagina, servidor }) {
  informe.seccion('E2E accesibilidad: teclado, foco, ARIA y etiquetas');
  const url = servidor.url;
  await irA(pagina, url, 'platos');
  const activo = () => pagina.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.id ? '#' + a.id : ''}${a.dataset && a.dataset.tab ? '[' + a.dataset.tab + ']' : ''}` : ''; });
  await pagina.evaluate(() => document.body.focus());
  const orden = [];
  for (let i = 0; i < 6; i++) { await pagina.keyboard.press('Tab'); orden.push(await activo()); }
  await pagina.keyboard.press('Shift+Tab');
  const atras = await activo();
  informe.comprueba('E2E-A11Y-01', 'Tab recorre controles reales y Shift+Tab vuelve al anterior', orden.every((o) => o && o !== 'BODY') && atras === orden[4], `${orden.join(' → ')} · atrás=${atras}`);
  await pagina.focus('#adm-sidebar [data-tab="ofertas"]');
  await pagina.keyboard.press('Enter');
  await esperar(100);
  const enter = await pagina.evaluate(() => ({ pane: document.querySelector('section.pane:not([hidden])').dataset.pane, sel: document.querySelector('#adm-sidebar [data-tab="ofertas"]').getAttribute('aria-selected'), otro: document.querySelector('#adm-sidebar [data-tab="platos"]').getAttribute('aria-selected'), titulo: document.getElementById('adm-topbar-titulo').textContent.trim() }));
  informe.comprueba('E2E-A11Y-02', 'Enter sobre un botón de navegación abre la pantalla y actualiza aria-selected y el título', enter.pane === 'ofertas' && enter.sel === 'true' && enter.otro === 'false' && enter.titulo === 'Ofertas', JSON.stringify(enter));
  await postCrudo(pagina, '/admin/index.php', [['guardar_agotados', '1']]);
  await irA(pagina, url, 'platos', 250);
  await abrirTodo(pagina);
  const muestra = await platosDeMuestra(pagina);
  await limpiarToasts(pagina);
  await pagina.focus(selInputAgotado(muestra.simples[0]));
  const rp = pagina.waitForResponse((r) => r.request().method() === 'POST', { timeout: 4000 }).catch(() => null);
  await pagina.keyboard.press('Space');
  const r1 = await rp;
  await reposo(pagina, 400);
  const c1 = await leerContadorAgotados(pagina);
  await pagina.keyboard.press('Space');
  await reposo(pagina, 500);
  const c2 = await leerContadorAgotados(pagina);
  informe.comprueba('E2E-A11Y-03', 'Espacio sobre un interruptor lo marca, guarda y actualiza el contador; otro Espacio lo deshace', r1 && r1.status() === 200 && c1.chip === '1' && c2.chip === '0', `HTTP ${r1 ? r1.status() : '-'} c1=${c1.chip} c2=${c2.chip}`);
  const aria = await pagina.evaluate(() => {
    const sinEtiqueta = [...document.querySelectorAll('section.pane:not([hidden]) input:not([type="hidden"]), section.pane:not([hidden]) select, section.pane:not([hidden]) textarea')].filter((i) => i.getBoundingClientRect().width > 0 || i.closest('label')).filter((i) => !(i.closest('label') || i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || (i.id && document.querySelector(`label[for="${i.id}"]`)))).map((i) => i.name || i.id).slice(0, 5);
    const botonesSinNombre = [...document.querySelectorAll('button')].filter((b) => !(b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('title'))).length;
    const imgSinAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
    return { sinEtiqueta, botonesSinNombre, imgSinAlt, tema: document.getElementById('adm-tema-sw').getAttribute('role'), live: !!document.querySelector('#toasts[aria-live]'), dialogo: document.getElementById('recorte').getAttribute('aria-modal'), hoja: document.getElementById('sheet-mas').getAttribute('aria-modal') };
  });
  informe.comprueba('E2E-A11Y-04', 'todos los campos con etiqueta, botones con nombre, imágenes con alt, diálogos con aria-modal',
    aria.sinEtiqueta.length === 0 && aria.botonesSinNombre === 0 && aria.imgSinAlt === 0 && aria.tema === 'switch' && aria.live && aria.dialogo === 'true' && aria.hoja === 'true', JSON.stringify(aria));
  const escapes = await pagina.evaluate(async () => { const r = {}; const capa = document.getElementById('recorte'); capa.setAttribute('open', ''); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); r.recorte = !capa.hasAttribute('open'); const b = [...document.querySelectorAll('.adm-plato-destbtn')].find((x) => x.getBoundingClientRect().width > 0); if (b) { b.click(); await new Promise((s) => setTimeout(s, 80)); const abierto = !document.getElementById('dest-et').hidden; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); r.etiquetas = abierto && document.getElementById('dest-et').hidden; } else r.etiquetas = true; return r; });
  informe.comprueba('E2E-A11Y-05', 'Escape cierra la hoja de recorte y el selector de etiquetas', escapes.recorte && escapes.etiquetas, JSON.stringify(escapes));
  const focoVisible = await pagina.evaluate(async () => { const b = document.querySelector('#adm-sidebar [data-tab="marca"]'); b.focus(); await new Promise((s) => setTimeout(s, 300)); const cs = getComputedStyle(b); return { sombra: cs.boxShadow, contorno: cs.outlineStyle + ' ' + cs.outlineWidth, activo: document.activeElement === b }; });
  informe.comprueba('E2E-A11Y-06', 'un botón de navegación enfocado por teclado enseña su foco', focoVisible.activo && (focoVisible.sombra !== 'none' || !/none/.test(focoVisible.contorno)), JSON.stringify(focoVisible));
  await postCrudo(pagina, '/admin/index.php', [['guardar_agotados', '1']]);
}

/* ================================================================== 19. JSON / ficheros / rollback
 * En su propio docroot: aquí se rompe estado.json a propósito. */
export async function e2eFicheros(informe, { navegador, servidor, docroot }) {
  informe.seccion('E2E JSON y ficheros: escritura atómica, estado ausente/roto, dos guardados, rollback y 500');
  const url = servidor.url;
  const estadoPath = path.join(docroot, 'estado.json');
  const pagina = await nuevaPagina(navegador);
  await entrarAlPanel(pagina, url);
  const platos = leerPlatos(docroot).filter((p) => p.price !== '');

  /* Escritura atómica: tras un guardado, ni un .tmp por ninguna parte. */
  await postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${platos[0].key}]`, '11.11']]);
  await esperar(200);
  informe.comprueba('E2E-FI-01', 'un guardado escribe estado.json y no deja ningún .tmp',
    existsSync(estadoPath) && ficherosTmp(docroot).length === 0, ficherosTmp(docroot).join(','));
  const crudo = readFileSync(estadoPath, 'utf8');
  informe.comprueba('E2E-FI-02', 'estado.json es JSON válido, con salto de línea (pretty) y UTF-8 sin escapar',
    (() => { try { JSON.parse(crudo); return true; } catch { return false; } })() && /\n/.test(crudo), `${crudo.length} bytes`);

  /* Dos guardados seguidos: el segundo no pierde lo del primero. */
  await postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${platos[0].key}]`, '11.11'], [`precio[${platos[1].key}]`, '22.22']]);
  await esperar(200);
  const e2 = leerEstado(docroot);
  informe.comprueba('E2E-FI-03', 'dos guardados seguidos conservan lo de ambos', e2.prices[platos[0].key] === '11.11' && e2.prices[platos[1].key] === '22.22', JSON.stringify(e2.prices));

  /* estado.json con JSON roto: el panel se lee como vacío y sigue pintando las siete pantallas. */
  const respaldo = readFileSync(estadoPath);
  writeFileSync(estadoPath, '{esto no es json, ');
  await irA(pagina, url, 'platos');
  const roto = await pagina.evaluate(() => ({ panes: document.querySelectorAll('section.pane').length, precios: [...document.querySelectorAll('.adm-prow-nuevo')].filter((i) => i.value && i.value !== i.dataset.confirmado).length }));
  informe.comprueba('E2E-FI-04', 'con estado.json roto el panel arranca en limpio y pinta las siete pantallas sin fatal',
    roto.panes === 7 && servidor.avisos().filter((a) => /Fatal/.test(a)).length === 0, JSON.stringify(roto));

  /* estado.json ausente. */
  unlinkSync(estadoPath);
  await irA(pagina, url, 'platos');
  informe.comprueba('E2E-FI-05', 'sin estado.json el panel arranca en limpio (instalación nueva)',
    await pagina.evaluate(() => document.querySelectorAll('section.pane').length === 7) && !existsSync(estadoPath));
  /* Y un guardado lo crea de cero, atómico. */
  await postCrudo(pagina, '/admin/index.php', [['guardar_agotados', '1']]);
  informe.comprueba('E2E-FI-06', 'el primer guardado crea estado.json sin dejar .tmp', existsSync(estadoPath) && ficherosTmp(docroot).length === 0);

  /* Rollback / 500: estado.json convertido en carpeta hace fallar el rename final. */
  const antes = readFileSync(estadoPath);
  unlinkSync(estadoPath);
  mkdirSync(estadoPath);                                   // ahora rename(tmp, estado.json) no puede
  const r500 = await conFalloEsperado(pagina, () => postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${platos[0].key}]`, '77.77']]));
  const dejoTmp = ficherosTmp(docroot).length;
  rmSync(estadoPath, { recursive: true, force: true });
  writeFileSync(estadoPath, antes);
  informe.comprueba('E2E-FI-07', 'un guardado que no puede escribir contesta HTTP 500 con su mensaje y no deja .tmp huérfano',
    r500.status === 500 && /No se ha podido escribir/.test(r500.mensaje) && dejoTmp === 0, `HTTP ${r500.status} tmp=${dejoTmp} · ${r500.mensaje}`);
  informe.comprueba('E2E-FI-08', 'tras restaurar el fichero, el panel vuelve a guardar con normalidad',
    (await postCrudo(pagina, '/admin/index.php', [['precios_reset', '1']])).status === 200 && Object.keys(leerEstado(docroot).prices || {}).length === 0);
  /* El aviso «Is a directory» del intento de lectura durante el 500 es esperado en este bloque. */
  informe.pass('E2E-FI-09', 'los avisos de PHP durante el rollback provocado son los esperados (lectura de un estado.json que es carpeta), no un fallo del producto',
    servidor.avisos().filter((a) => !/Is a directory|failed to open stream/.test(a)).slice(0, 2).join(' | ') || 'sin otros avisos');
  await pagina.contextoQa.close().catch(() => {});
}

/* ================================================================== 20. PHP sin mbstring / sin GD */
export async function e2eSinExtensiones(informe, { navegador, clon, fixtures }) {
  informe.seccion('E2E PHP sin mbstring y sin GD');
  const caps = capacidadesPhp();

  if (caps.sinMbstring) {
    const docroot = docrootDesde(clon.salida, 'e2e_sinmb');
    const srv = await abrir(docroot, { gd: true, mbstring: false });
    const pagina = await nuevaPagina(navegador);
    await entrarAlPanel(pagina, srv.url);
    const r = await pagina.evaluate(() => ({
      panes: document.querySelectorAll('section.pane').length,
      nav: document.querySelectorAll('#adm-sidebar [data-tab]').length,
      dias: [...document.querySelectorAll('.pane[data-pane="ofertas"] .adm-dia span[aria-hidden="true"]')].map((s) => s.textContent.trim()),
    }));
    await irA(pagina, srv.url, 'ofertas', 250);
    const dias = await pagina.evaluate(() => [...document.querySelectorAll('.adm-dia span[aria-hidden="true"]')].map((s) => s.textContent.trim()));
    /* record.php tiene su propio camino sin mbstring: un nombre con acento se recorta sin partir bytes. */
    const nombre = await pagina.evaluate(async () => {
      await fetch('/admin/index.php?t=juego');
      const csrf = document.querySelector('input[name="csrf"]').value;
      await fetch('/admin/index.php', { method: 'POST', body: new URLSearchParams({ csrf, guardar_juego: '1', juego_on: '1' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const p1 = await fetch('/admin/record.php', { method: 'POST', body: new URLSearchParams({ puntos: '200' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const id = (JSON.parse(await p1.text()).id) || '';
      if (!id) return null;
      const p2 = await fetch('/admin/record.php', { method: 'POST', body: new URLSearchParams({ id, nombre: 'Ámbar de la Ñ', pais: 'es' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const j = JSON.parse(await p2.text());
      return (j.top.find((x) => x.puntos === 200) || {}).nombre;
    });
    const avisos = srv.avisos();
    informe.comprueba('E2E-MB-01', 'sin mbstring: las siete pantallas y la navegación siguen',
      r.panes === 7 && r.nav === 7, JSON.stringify({ panes: r.panes, nav: r.nav }));
    informe.comprueba('E2E-MB-02', 'sin mbstring las iniciales de los días salen bien (una letra cada una)',
      dias.length === 7 && dias.every((d) => [...d].length === 1), dias.join(' '));
    informe.comprueba('E2E-MB-03', 'sin mbstring record.php recorta un nombre con acentos sin partir un carácter ni dar fatal',
      nombre !== null && [...nombre].length <= 12 && !/�/.test(nombre), `nombre=«${nombre}»`);
    informe.comprueba('E2E-MB-04', 'sin mbstring no hay ningún warning ni fatal de PHP', avisos.length === 0, avisos.slice(0, 3).join(' | '));
    await pagina.contextoQa.close().catch(() => {});
    srv.parar();
  } else {
    informe.blocked('E2E-MB-01', 'panel sin mbstring', 'este PHP trae mbstring compilada y no se puede quitar');
  }

  /* Sin GD: subir una portada tiene que rechazarse sin tocar el estado. */
  const docroot = docrootDesde(clon.salida, 'e2e_singd');
  const srv = await abrir(docroot, { gd: false, mbstring: true });
  const pagina = await nuevaPagina(navegador);
  await entrarAlPanel(pagina, srv.url);
  await irA(pagina, srv.url, 'marca', 250);
  if (fixtures['portada-1200x800.png']) {
    await pagina.setInputFiles('input[name="foto[]"]', fixtures['portada-1200x800.png']);
    await esperar(150);
    await pagina.evaluate(() => document.querySelector('button[name="subir_foto"]').click());
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await esperar(400);
    const aviso = await textoAvisoPanel(pagina);
    const est = leerEstado(docroot);
    const heroDir = path.join(docroot, 'assets', 'hero');
    informe.comprueba('E2E-GD-01', 'sin GD una portada se rechaza avisando de la extensión que falta, y no toca estado.hero',
      /extensión GD|no puede comprobar/.test(aviso) && (!est || (est.hero || []).length === 0) && (!existsSync(heroDir) || readdirSync(heroDir).filter((f) => /\.(png|jpg|webp)$/.test(f)).length === 0),
      aviso.slice(0, 90));
  } else {
    informe.blocked('E2E-GD-01', 'portada sin GD', 'falta la fixture');
  }
  informe.comprueba('E2E-GD-02', 'sin GD el panel no da ningún fatal', srv.avisos().filter((a) => /Fatal/.test(a)).length === 0, srv.avisos().slice(0, 2).join(' | '));
  await pagina.contextoQa.close().catch(() => {});
  srv.parar();
}

/* ================================================================== ADMIN-E2E-001: demostración RED
 * El defecto del contador es anterior a SocialCard y está CORREGIDO en el checkpoint (cuenta
 * platos, no casillas, también al cargar). Para demostrar la corrección en rojo sin tocar el
 * repositorio, se sirve una copia del docroot con esa línea revertida a contar casillas. */
export const MARCA_FIX = "var id = cb.dataset.plato || ('#sin-id-' + (i++));";
export const MUTACION_RED = "var id = '#casilla-' + (i++);";
export function mutarContadorACasillas(docroot) {
  const idx = path.join(docroot, 'admin', 'index.php');
  const src = readFileSync(idx, 'utf8');
  if (!src.includes(MARCA_FIX)) return false;
  writeFileSync(idx, src.replace(MARCA_FIX, MUTACION_RED));
  return true;
}
export async function e2eRedContador(informe, { navegador, servidor, docroot, mutado }) {
  informe.seccion('ADMIN-E2E-001 · demostración RED del contador (docroot con la corrección revertida)');
  if (!mutado) { informe.fail('ADMIN-E2E-001-RED', 'reproducir el defecto del contador', 'no se pudo mutar index.php: la marca de la corrección no estaba'); return; }
  const url = servidor.url;
  const pagina = await nuevaPagina(navegador);
  await entrarAlPanel(pagina, url);
  await postCrudo(pagina, '/admin/index.php', [['guardar_agotados', '1']]);
  await irA(pagina, url, 'platos');
  await abrirTodo(pagina);
  const muestra = await platosDeMuestra(pagina);
  if (!muestra.doble) { informe.blocked('ADMIN-E2E-001-RED', 'reproducir el defecto', 'sin plato de dos casillas'); await pagina.contextoQa.close().catch(() => {}); return; }
  await conmutar(pagina, selInputAgotado(muestra.doble.claves[0]), true);
  await reposo(pagina, 400);
  const vivo = await leerContadorAgotados(pagina);
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await esperar(250); await abrirTodo(pagina);
  const trasF5 = await leerContadorAgotados(pagina);
  informe.comprueba('ADMIN-E2E-001-RED', 'sobre el código SIN la corrección, marcar 1 plato de dos casillas cuenta «2» (defecto reproducido, en vivo y tras F5)',
    (vivo.chip === '2' || trasF5.chip === '2') && vivo.platos === 1, `vivo.chip=${vivo.chip} trasF5.chip=${trasF5.chip} — con la corrección serían 1 (E2E-AG-01/AG-04)`);
  informe.pass('ADMIN-E2E-001', 'corrección verificada por contraste: el checkpoint cuenta platos (GREEN E2E-AG-01/AG-04), el mutado cuenta casillas (RED)', 'RED/GREEN completo sobre el mismo plato de dos casillas');
  await pagina.contextoQa.close().catch(() => {});
}

/* ================================================================== orquestador */
async function correrBloque(informe, nombre, fn) {
  try { await fn(); } catch (e) { informe.fail(`E2E-BLOQUE-${nombre}`, `el bloque «${nombre}» se cayó`, (e && e.stack ? e.stack : String(e)).split('\n').slice(0, 2).join(' | ')); }
}
/* Cada bloque de la matriz principal corre en su PROPIA página recién autenticada: así el estado
   de la interfaz (pestaña activa, avisos, «cambios sin guardar») de un bloque no contamina al
   siguiente. El docroot es el mismo —el estado en disco se comparte y cada bloque restaura lo
   suyo—. */
async function conPagina(informe, nombre, base, fn) {
  const pagina = await nuevaPagina(base.navegador);
  try { await entrarAlPanel(pagina, base.servidor.url); await fn({ ...base, pagina }); }
  catch (e) { informe.fail(`E2E-BLOQUE-${nombre}`, `el bloque «${nombre}» se cayó`, (e && e.stack ? e.stack : String(e)).split('\n').slice(0, 3).join(' | ')); }
  finally { await pagina.contextoQa.close().catch(() => {}); }
}

export async function bateriaE2E(informe, { clon, fixtures, navegador }) {
  const caps = capacidadesPhp();
  if (!caps.hayPhp) { informe.blocked('E2E-00', 'toda la batería E2E', 'no hay PHP en el PATH'); return informe; }
  if (!chromePath()) { informe.blocked('E2E-00', 'toda la batería E2E', 'no se encuentra Chrome'); return informe; }

  const docPrincipal = docrootDesde(clon.salida, 'e2e_main');
  const sesionesDir = path.join(carpetaTemporal('totm-sess-'), 's');
  const srv = await abrir(docPrincipal, { gd: true, mbstring: true, subidaMax: '8M', postMax: '10M', sesionesDir });
  /* La contraseña se pone una vez (flujo de primera vez). */
  const p0 = await nuevaPagina(navegador); await entrarAlPanel(p0, srv.url); await p0.contextoQa.close().catch(() => {});
  const base = { servidor: srv, docroot: docPrincipal, fixtures, navegador, sesionesDir };

  await conPagina(informe, 'inventario', base, (c) => e2eInventario(informe, c));
  await correrBloque(informe, 'auth', () => e2eAuth(informe, base));
  await conPagina(informe, 'roles', base, (c) => e2eRoles(informe, c));
  await conPagina(informe, 'platos', base, (c) => e2ePlatos(informe, c));
  await conPagina(informe, 'agotados', base, (c) => e2eAgotados(informe, c));
  await conPagina(informe, 'destacados', base, (c) => e2eDestacados(informe, c));
  await conPagina(informe, 'camara', base, (c) => e2eCamara(informe, c));
  await conPagina(informe, 'ajustar-precios', base, (c) => e2eAjustarPrecios(informe, c));
  await conPagina(informe, 'ofertas', base, (c) => e2eOfertas(informe, c));
  await conPagina(informe, 'publicidad', base, (c) => e2ePublicidad(informe, c));
  await conPagina(informe, 'juego', base, (c) => e2eJuego(informe, c));
  await conPagina(informe, 'analitica', base, (c) => e2eAnalitica(informe, c));
  await conPagina(informe, 'marca', base, (c) => e2eMarca(informe, c));
  await conPagina(informe, 'ajustes', base, (c) => e2eAjustes(informe, c));
  await conPagina(informe, 'temas', base, (c) => e2eTemas(informe, c));
  await conPagina(informe, 'a11y', base, (c) => e2eA11y(informe, c));

  await correrBloque(informe, 'responsive', () => e2eResponsive(informe, { navegador, servidor: srv, docroot: docPrincipal }));

  const docFich = docrootDesde(clon.salida, 'e2e_fich');
  const srvFich = await abrir(docFich, { gd: true, mbstring: true });
  await correrBloque(informe, 'ficheros', () => e2eFicheros(informe, { navegador, servidor: srvFich, docroot: docFich }));
  srvFich.parar();

  const docSuper = docrootDesde(clon.salida, 'e2e_super');
  const claveSuper = 'clave-super-e2e-4321';
  const hashSuper = correr(PHP, ['-r', `echo password_hash(${JSON.stringify(claveSuper)}, PASSWORD_DEFAULT);`]).salida.trim();
  const enPhp = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const srvSuper = await abrir(docSuper, { gd: true, mbstring: true });
  const tmpSuper = await nuevaPagina(navegador); await entrarAlPanel(tmpSuper, srvSuper.url); await tmpSuper.contextoQa.close().catch(() => {});
  writeFileSync(path.join(docSuper, 'admin', 'superclave.php'), `<?php\ndefine('SUPERADMIN_HASH', ${enPhp(hashSuper)});\n`);
  await correrBloque(informe, 'superadmin', () => e2eSuperadmin(informe, { navegador, servidor: srvSuper, docroot: docSuper, claveSuper }));
  srvSuper.parar();

  const docBloq = docrootDesde(clon.salida, 'e2e_bloq');
  const srvBloq = await abrir(docBloq, { gd: true, mbstring: true });
  const tmpBloq = await nuevaPagina(navegador); await entrarAlPanel(tmpBloq, srvBloq.url); await tmpBloq.contextoQa.close().catch(() => {});
  await correrBloque(informe, 'bloqueo', () => e2eBloqueo(informe, { navegador, servidor: srvBloq }));
  srvBloq.parar();

  await correrBloque(informe, 'sin-extensiones', () => e2eSinExtensiones(informe, { navegador, clon, fixtures }));

  const docRed = docrootDesde(clon.salida, 'e2e_red');
  const mutado = mutarContadorACasillas(docRed);
  const srvRed = await abrir(docRed, { gd: true, mbstring: true });
  await correrBloque(informe, 'red-contador', () => e2eRedContador(informe, { navegador, servidor: srvRed, docroot: docRed, mutado }));
  srvRed.parar();

  srv.parar();
  return informe;
}

if (process.argv[1] && process.argv[1].endsWith('admin-e2e.mjs')) {
  const informe = new Informe('QA auditoría E2E del administrador (Fase A)', 'e2e');
  const v = versiones();
  console.log(`commit ${commitActual()} · node ${v.node} · php ${v.php} · ${v.navegador}`);
  const caps = capacidadesPhp();
  const navegador = caps.hayPhp && chromePath() ? await abrirNavegador() : null;
  try {
    if (!navegador) { informe.blocked('E2E-00', 'toda la batería E2E', !caps.hayPhp ? 'no hay PHP en el PATH' : 'no se encuentra Chrome; define CHROME_PATH'); }
    else {
      const clon = clonarTinge();
      const c = compilar(clon.proyecto, { conActivacion: false });
      informe.comprueba('E2E-BUILD', 'el clon de Tinge compila', c.gen.ok, c.gen.texto.trim().split('\n').pop());
      if (c.gen.ok) { const fixtures = fabricarFixtures(carpetaTemporal('totm-fix-')); await bateriaE2E(informe, { clon, fixtures, navegador }); }
    }
  } catch (e) { informe.fail('E2E-FATAL', 'la batería E2E se cayó entera', (e && e.stack ? e.stack : String(e)).split('\n').slice(0, 3).join(' | ')); }
  finally { if (navegador) await navegador.close().catch(() => {}); cerrarTodos(); limpiarTemporales(); }
  informe.aplicaPolitica();
  informe.salir();
}
