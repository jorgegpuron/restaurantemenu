/* La fixtura determinista de Lighthouse.
 *
 * Por qué existe (fase 17.1). La línea base de la fase 17 se midió sobre el docroot recién
 * compilado con el **estado de ejemplo**: sin foto de portada, sin banner y con el marcador vacío.
 * La referencia de §15.7 de la auditoría anterior se midió sobre un docroot que sí tenía portada,
 * banner y dos jugadores en el podio. Las dos mediciones son correctas y no son comparables: no
 * miden la misma página. De ahí venían las diferencias de peticiones (13/12/11/11 frente a
 * 11/11/7/7), de bytes y, sobre todo, de CLS.
 *
 * Lo que hace este módulo es dejar de improvisar el contenido medido: monta SIEMPRE el mismo
 * docroot, con las mismas imágenes byte a byte (fabricadas, no guardadas) y el mismo marcador, y
 * si algún paso no sale como se espera **lanza**. Una fixtura a medias mediría otra página y
 * devolvería un número con aspecto de bueno, que es la peor de las salidas posibles.
 *
 * Todo pasa por los endpoints del producto —el mismo formulario de subida, el mismo `record.php`—
 * y no escribiendo `estado.json` a mano: si el panel cambia la forma de guardar, la fixtura se
 * entera.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { abrir } from './servidor.mjs';
import { docrootDesde, CLAVE_QA } from './clientes.mjs';
import { fabricarFixtures } from './fixtures.mjs';
import { QA, carpetaTemporal, versiones } from './entorno.mjs';

/* Un agente normal: `record.php` rechaza por User-Agent lo que huela a robot, y con el agente por
   defecto de Node la fixtura se quedaría sin podio sin decir por qué. */
const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

/* Las dos marcas del podio. Fijas y con país, porque cada una pinta su bandera y por lo tanto
   cada una es una petición: el podio del panel es parte de lo que se mide. */
export const PODIO = [
  { nombre: 'QA Uno', pais: 'es', puntos: 120 },
  { nombre: 'QA Dos', pais: 'de', puntos: 130 },
];

const cabeceras = (cookie, extra = {}) => ({ 'User-Agent': AGENTE, ...(cookie ? { Cookie: cookie } : {}), ...extra });

function csrfDe(html) {
  return (/name="csrf" value="([^"]+)"/.exec(html) || [])[1];
}

/* Sesión de panel de verdad. Devuelve la cookie, o lanza: medir la pantalla de acceso y llamarlo
   «el panel» sería mentira, y una mentira que además pasaría todas las tolerancias. */
export async function abrirSesion(url) {
  let r = await fetch(url + '/admin/', { headers: cabeceras(null) });
  let cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
  let html = await r.text();
  const enviar = async (cuerpo) => {
    const res = await fetch(url + '/admin/', {
      method: 'POST', redirect: 'manual',
      headers: cabeceras(cookie, { 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: new URLSearchParams(cuerpo),
    });
    const nuevas = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]);
    if (nuevas.length) cookie = nuevas.join('; ');
    return res;
  };
  if (/name="nueva"/.test(html)) {
    await enviar({ csrf: csrfDe(html), nueva: CLAVE_QA });
    r = await fetch(url + '/admin/', { headers: cabeceras(cookie) });
    html = await r.text();
  }
  if (/id="clave"/.test(html)) await enviar({ csrf: csrfDe(html), clave: CLAVE_QA });
  const dentro = await (await fetch(url + '/admin/', { headers: cabeceras(cookie) })).text();
  if (/id="clave"/.test(dentro)) throw new Error('no se pudo abrir sesion en el panel para la fixtura');
  return { cookie, enviar, csrf: csrfDe(dentro) };
}

async function postForm(url, ruta, cookie, campos) {
  const html = await (await fetch(url + ruta, { headers: cabeceras(cookie) })).text();
  const cuerpo = new URLSearchParams({ csrf: csrfDe(html), ...campos });
  return fetch(url + ruta, {
    method: 'POST', redirect: 'manual',
    headers: cabeceras(cookie, { 'Content-Type': 'application/x-www-form-urlencoded' }),
    body: cuerpo,
  });
}

async function subirFichero(url, ruta, cookie, campoBoton, campoFichero, fichero) {
  const html = await (await fetch(url + ruta, { headers: cabeceras(cookie) })).text();
  const fd = new FormData();
  fd.set('csrf', csrfDe(html));
  fd.set(campoBoton, '1');
  fd.set(campoFichero, new Blob([readFileSync(fichero)]), path.basename(fichero));
  return fetch(url + ruta, { method: 'POST', redirect: 'manual', headers: cabeceras(cookie), body: fd });
}

function leerEstado(docroot) {
  const f = path.join(docroot, 'estado.json');
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; }
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

/* Hash de un árbol neutralizando los sellos de build: `index.html`, `version.json` y
   `admin/cliente.php` llevan la marca de tiempo de la compilación, así que dos builds idénticos
   dan hashes distintos si no se quita. Se quita SOLO el número, no el fichero: un cambio real
   dentro de esos tres sigue viéndose. */
export function hashBuildSinSellos(raiz) {
  const partes = [];
  (function w(d, pre) {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const abs = path.join(d, e.name);
      const rel = pre ? pre + '/' + e.name : e.name;
      if (e.isDirectory()) { w(abs, rel); continue; }
      let buf = readFileSync(abs);
      if (['index.html', 'version.json', 'admin/cliente.php'].includes(rel)) {
        buf = Buffer.from(buf.toString('utf8').replace(/\b17\d{11}\b/g, 'SELLO'), 'utf8');
      }
      partes.push(rel + ':' + sha(buf));
    }
  })(raiz, '');
  return sha(Buffer.from(partes.join('\n'), 'utf8'));
}

/**
 * Monta el docroot que se mide. Lanza en cuanto un paso no sale: la fixtura o está entera o no
 * está, nunca a medias.
 *
 * @param {string} salida  carpeta `2-subir` recién compilada de un clon
 * @returns {{docroot, servidor, cookie, huella}}
 */
export async function montarFixtura(salida) {
  const docroot = docrootDesde(salida, 'tinge_lh');
  const servidor = await abrir(docroot, { gd: true, mbstring: true });
  const url = servidor.url;
  const pasos = [];

  const { cookie } = await abrirSesion(url);
  pasos.push('sesion abierta');

  const fixturas = fabricarFixtures(carpetaTemporal('totm-fixlh-'));
  const portada = fixturas['portada-1200x800.jpg'] || fixturas['portada-1200x800.png'];
  const banner = fixturas['banner-1120x480.png'];
  if (!portada || !banner) throw new Error('faltan las imagenes de la fixtura de Lighthouse');

  await subirFichero(url, '/admin/index.php?t=marca', cookie, 'subir_foto', 'foto[]', portada);
  const conPortada = (leerEstado(docroot)?.hero || []).length;
  if (!conPortada) throw new Error('la fixtura no consiguio guardar la portada: se mediria una carta sin foto');
  pasos.push(`portada guardada (${conPortada})`);

  await subirFichero(url, '/admin/index.php?t=publicidad', cookie, 'subir_banner', 'pub_img', banner);
  const est1 = leerEstado(docroot) || {};
  const banderaBanner = JSON.stringify(est1.publicidad?.banner || {});
  if (!/\.(webp|jpg|jpeg|png)/i.test(banderaBanner)) {
    throw new Error('la fixtura no consiguio guardar el banner: ' + banderaBanner.slice(0, 160));
  }
  pasos.push('banner guardado');

  await postForm(url, '/admin/index.php?t=publicidad', cookie, { guardar_publicidad: '1', pub_on: '1', pub_url: 'https://ejemplo.invalido/qa' });
  pasos.push('banner encendido');

  await postForm(url, '/admin/index.php?t=juego', cookie, { guardar_juego: '1', juego_on: '1' });
  if (leerEstado(docroot)?.game?.on !== true) throw new Error('la fixtura no pudo encender el juego, y sin juego no hay podio');
  pasos.push('juego encendido');

  for (const marca of PODIO) {
    const r1 = await fetch(url + '/admin/record.php', {
      method: 'POST', headers: cabeceras(null, { 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: new URLSearchParams({ puntos: String(marca.puntos) }),
    });
    let id = '';
    try { id = JSON.parse(await r1.text()).id || ''; } catch { /* no entro en el podio */ }
    if (!id) throw new Error(`la marca ${marca.nombre} no entro en el podio: la fixtura mediria un panel sin banderas`);
    await fetch(url + '/admin/record.php', {
      method: 'POST', headers: cabeceras(null, { 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: new URLSearchParams({ id, nombre: marca.nombre, pais: marca.pais }),
    });
  }
  const marcador = path.join(docroot, 'record.json');
  const top = existsSync(marcador) ? (JSON.parse(readFileSync(marcador, 'utf8')).top || []) : [];
  if (top.length < PODIO.length) throw new Error(`el podio tiene ${top.length} marcas y hacen falta ${PODIO.length}`);
  pasos.push(`podio con ${top.length} marcas`);

  /* Y la comprobación que de verdad importa: que el panel PINTA las dos banderas. Si el podio
     existe pero no se pinta, las peticiones medidas no serían las esperadas. */
  const panel = await (await fetch(url + '/admin/index.php?t=agotados', { headers: cabeceras(cookie) })).text();
  const banderas = (panel.match(/adm-pod-bandera/g) || []).length;
  if (banderas < PODIO.length) throw new Error(`el panel pinta ${banderas} banderas del podio y se esperaban ${PODIO.length}`);
  pasos.push(`${banderas} banderas en el podio`);

  /* Y ahora se canonicaliza: nombres de fichero, marcas de tiempo y sello de build. A partir de
     aquí dos montajes de la misma fixtura son iguales byte a byte, y por eso se puede exigir que
     el control y el candidato midan exactamente lo mismo. */
  const mapa = canonicalizaDocroot(docroot);
  pasos.push(`canonicalizado (${mapa.size} identificadores)`);

  const carta = path.join(docroot, 'index.html');
  const estado = path.join(docroot, 'estado.json');
  const docHuella = huellaDocroot(docroot);
  const huella = {
    pasos,
    hashDocroot: docHuella.hash,
    hashFixtura: docHuella.fixtura.hash,
    hashProductoServido: docHuella.producto.hash,
    ficherosDocroot: docHuella.ficheros,
    ficherosFixtura: docHuella.fixtura.ficheros,
    hashCarta: sha(readFileSync(carta)),
    /* Mismo criterio que el hash por fichero: si no, `LHC-FIX-01` diria que la fixtura cuadra
       y `LHC-FIX-02` diria que no, sobre el mismo fichero y en la misma pasada. */
    hashEstado: sha(Buffer.from(normalizaEstadoParaHuella(readFileSync(estado, 'utf8')), 'utf8')),
    hashBuildSinSellos: hashBuildSinSellos(salida),
    bytesCarta: statSync(carta).size,
    podio: PODIO.map((p) => `${p.nombre}/${p.pais}`),
    identificadoresCanonicos: [...mapa.values()],
    entorno: versiones(),
    plataforma: `${process.platform} ${process.arch}`,
  };
  return { docroot, servidor, cookie, huella, docHuella };
}

/* La huella de entorno que decide si dos medidas son comparables. Windows con Chrome 152 y un
   runner Linux con otro Chrome y otro hardware no lo son, por buena que sea la intención. */
export function huellaEntorno() {
  const v = versiones();
  return {
    plataforma: `${process.platform} ${process.arch}`,
    navegador: v.navegador || null,
    lighthouse: v.lighthouse || null,
    node: v.node || null,
    php: v.php || null,
  };
}

/* Compara dos huellas y devuelve las diferencias que impiden comparar. Node y PHP no entran: no
   cambian lo que Lighthouse mide en el navegador. */
export function huellasIncompatibles(a, b) {
  const claves = ['plataforma', 'navegador', 'lighthouse'];
  return claves.filter((k) => String(a?.[k] ?? '') !== String(b?.[k] ?? ''))
    .map((k) => `${k}: ${a?.[k] ?? '?'} != ${b?.[k] ?? '?'}`);
}

/* ------------------------------------------------------------------ canonicalización
 * Dos montajes de la misma fixtura no son idénticos byte a byte, y no por culpa del producto:
 *
 *   - el panel guarda cada foto subida con un identificador de 16 hexadecimales que NO deriva del
 *     contenido, así que la misma imagen tiene un nombre distinto en cada montaje;
 *   - `estado.json` guarda la hora del guardado y `record.json` la fecha de cada marca;
 *   - `index.html`, `version.json` y `admin/cliente.php` llevan el sello de la compilación.
 *
 * Nada de eso cambia lo que el navegador carga, pero sí cambia los hashes y —lo importante— hace
 * imposible exigir igualdad exacta entre el control y el candidato. Esto lo canonicaliza **sólo en
 * el docroot temporal que se mide**: el producto no se toca, y las sustituciones **conservan la
 * longitud**, así que el número de bytes servidos es el mismo que serviría el original.
 */
const ID_HEX = /^[0-9a-f]{16}(?=[-.])/;
const TEXTO = /\.(json|html|php|css|js|txt|svg|webmanifest|log)$/i;
const SELLO_CANONICO = '1700000000000';                    // 13 dígitos, como el real
const FECHA_HORA_CANONICA = '2026-01-01T00:00:00+00:00';   // 25 caracteres, como el real
const FECHA_CANONICA = '2026-01-01';                       // 10 caracteres, como el real
const FECHA_LOG_CANONICA = '2026-01-01 00:00:00Z';         // 20 caracteres, como el real
const FECHA_BUILD_CANONICA = '01/01/2026 · 00:00';        // misma longitud que BUILD_FECHA
const RE_FECHA_BUILD = new RegExp(String.raw`\b\d{2}/\d{2}/\d{4} . \d{2}:\d{2}\b`, 'g');

/* Lo unico que no se puede canonicalizar sin romperlo: la contrasena del panel es un bcrypt con
   sal aleatoria, y sustituirla dejaria el fichero sin ser un hash valido. No se sirve al navegador
   —`admin/clave.php` devuelve cuerpo vacio— asi que no entra en la huella del docroot; lo que si se
   comprueba es que existe y tiene forma de bcrypt. Se declara aqui, con nombre, para que no sea una
   exclusion silenciosa. */
export const FUERA_DE_LA_HUELLA = [
  { ruta: 'admin/clave.php', motivo: 'bcrypt con sal aleatoria; no se sirve al navegador' },
];

function ficherosDe(raiz) {
  const out = [];
  (function w(d, pre) {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const abs = path.join(d, e.name);
      const rel = pre ? pre + '/' + e.name : e.name;
      if (e.isDirectory()) w(abs, rel); else out.push({ abs, rel });
    }
  })(raiz, '');
  return out;
}

/* Los identificadores aleatorios que ha inventado el panel, en orden estable, con su sustituto de
   la misma longitud. La letra del sustituto dice de qué carpeta salió, para que un volcado se lea. */
function mapaDeIdentificadores(raiz) {
  const porCarpeta = new Map();
  for (const f of ficherosDe(raiz)) {
    const m = ID_HEX.exec(path.basename(f.rel));
    if (!m) continue;
    const carpeta = path.dirname(f.rel);
    if (!porCarpeta.has(carpeta)) porCarpeta.set(carpeta, new Set());
    porCarpeta.get(carpeta).add(m[0]);
  }
  const mapa = new Map();
  for (const [carpeta, ids] of [...porCarpeta.entries()].sort()) {
    const letra = /publicidad/.test(carpeta) ? 'b' : /hero/.test(carpeta) ? 'a' : 'c';
    [...ids].sort().forEach((id, i) => {
      mapa.set(id, letra.repeat(15) + String(i + 1));  // 16 caracteres, igual que el original
    });
  }
  return mapa;
}

export function canonicalizaDocroot(raiz) {
  const mapa = mapaDeIdentificadores(raiz);

  /* 1. Renombrar los ficheros subidos. */
  for (const f of ficherosDe(raiz)) {
    const base = path.basename(f.rel);
    const m = ID_HEX.exec(base);
    if (!m || !mapa.has(m[0])) continue;
    renameSync(f.abs, path.join(path.dirname(f.abs), base.replace(m[0], mapa.get(m[0]))));
  }

  /* 2. Sustituir en el texto: los identificadores en todas partes, y las marcas de tiempo sólo
        donde son marcas de tiempo. Un reemplazo global de fechas podría tocar el contenido de la
        carta, y eso sí sería falsear lo que se mide. */
  for (const f of ficherosDe(raiz)) {
    if (!TEXTO.test(f.rel)) continue;
    let texto;
    try { texto = readFileSync(f.abs, 'utf8'); } catch { continue; }
    const antes = texto;
    for (const [viejo, nuevo] of mapa) texto = texto.split(viejo).join(nuevo);
    if (['index.html', 'version.json', 'admin/cliente.php'].includes(f.rel)) {
      texto = texto.replace(/\b17\d{11}\b/g, SELLO_CANONICO);
      /* `BUILD_FECHA` es la misma marca en formato legible, con minutos: dos compilaciones a un
         lado y otro de un cambio de minuto daban ficheros distintos, y la igualdad exigida al
         control y al candidato fallaba una de cada tantas veces sin patron aparente. */
      texto = texto.replace(RE_FECHA_BUILD, FECHA_BUILD_CANONICA);
    }
    if (f.rel === 'estado.json') {
      texto = texto.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/g, FECHA_HORA_CANONICA);
    }
    if (/(^|\/)(record|marcador)\.json$/.test(f.rel)) {
      /* La fecha de cada marca y el identificador de ocho hexadecimales que el marcador inventa
         por marca. Los dos se sustituyen conservando la longitud. */
      texto = texto.replace(/\d{4}-\d{2}-\d{2}/g, FECHA_CANONICA);
      let n = 0;
      texto = texto.replace(/"id":"[0-9a-f]{8}"/g, () => `"id":"${String(++n).padStart(8, '0')}"`);
    }
    if (/accesos\.log$/.test(f.rel)) {
      texto = texto.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z/g, FECHA_LOG_CANONICA);
    }
    if (texto !== antes) writeFileSync(f.abs, texto, 'utf8');
  }

  /* 3. El registro de errores del servidor lleva el puerto en el nombre y la hora dentro: no es
        contenido servido y no puede entrar en la huella. */
  for (const f of ficherosDe(raiz)) {
    if (/^php-\d+\.log$/.test(path.basename(f.rel))) rmSync(f.abs, { force: true });
  }
  return mapa;
}

/* La huella del docroot ya canonicalizado: hash por fichero y hash del conjunto. Con esto, exigir
   que el control y el candidato midan exactamente lo mismo deja de ser una declaración de
   intenciones y pasa a ser una comprobación que nombra el fichero culpable. */
/* Los ficheros que produce el BUILD, leidos del manifiesto aprobado. Todo lo demas que haya en el
   docroot lo ha puesto la fixtura: el estado, las fotos subidas, el marcador y los registros. */
function ficherosDelProducto() {
  try {
    const m = JSON.parse(readFileSync(path.join(QA, 'manifiesto-build.json'), 'utf8'));
    return new Set([
      ...(m.ficheros_obligatorios || []),
      ...(m.opcionales || []).map((o) => o.ruta || o),
      ...(m.obsoletos_tolerados_en_la_carpeta_publicada || []).map((o) => o.ruta || o),
    ]);
  } catch {
    return new Set();
  }
}

/* ------------------------------------------------------------ normalizacion semantica del estado
 *
 * El problema, con nombre y apellidos. El release que anade reordenar, retirar, dar de alta y
 * editar desde el panel mete SIETE colecciones nuevas en la plantilla del estado por defecto. En
 * la fixtura de Lighthouse las siete estan VACIAS: nadie ha reordenado nada, nadie ha retirado
 * nada. El arbol de control es anterior y no las escribe. Resultado: dos `estado.json` con
 * distinto numero de bytes que siembran EXACTAMENTE el mismo escenario —la misma portada, el
 * mismo banner, el mismo juego, el mismo podio—, y la guarda bloqueaba la comparacion que existe
 * justo para medir ese release.
 *
 * Lo que se corrige es CONCEPTUAL, no el rigor: la guarda comparaba la REPRESENTACION DEL
 * ESQUEMA cuando lo que tiene que comparar es la FIXTURA FUNCIONAL QUE LIGHTHOUSE MIDE. Una clave
 * ausente y la misma clave presente y vacia describen el mismo escenario; nada de lo que el
 * navegador carga cambia entre las dos.
 *
 * Y lo que NO es, porque la diferencia es todo:
 *
 *   - NO es «ignorar arrays vacios». Es esta lista de siete nombres y ninguno mas.
 *   - NO es «ignorar claves nuevas». Una octava clave nueva, aunque venga vacia, rompe.
 *   - NO es «ignorar diferencias de esquema». Cualquier otra diferencia de esquema rompe.
 *   - NO tolera contenido: `"orden": ["algo"]` frente a `orden` ausente rompe. La equivalencia
 *     es con el valor EXACTAMENTE `[]`, no con «vacio» en sentido amplio: ni `{}`, ni `null`,
 *     ni `""`, ni `[]` anidado en otra clave.
 *   - NO toca portada, banner, juego, podio, marca ni ningun otro dato sembrado.
 *
 * Esta lista es un registro de una evolucion de esquema CONOCIDA y fechada. No se amplia sin
 * decidirlo: anadir un nombre aqui es aceptar que esa clave puede faltar en un lado de una
 * comparacion, y eso se decide mirando, no de pasada. */
export const CLAVES_ESQUEMA_TOLERADAS = [
  'orden', 'retirados', 'categorias', 'pestanas', 'nuevos', 'editados', 'secciones',
];

/* Devuelve el texto del estado sin las claves autorizadas QUE ESTEN VACIAS. Si el fichero no es
   JSON valido no se toca: un estado ilegible es un fallo de la fixtura y tiene que verse como
   tal, no convertirse en «equivalente» por la puerta de atras. */
export function normalizaEstadoParaHuella(texto) {
  let obj;
  try { obj = JSON.parse(texto); } catch { return texto; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return texto;
  for (const k of CLAVES_ESQUEMA_TOLERADAS) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const v = obj[k];
    /* EXACTAMENTE []: array, y sin un solo elemento. Un objeto vacio no vale, y con datos
       dentro tampoco: ahi la diferencia es funcional y tiene que romper. */
    if (Array.isArray(v) && v.length === 0) delete obj[k];
  }
  /* Se vuelve a serializar SIEMPRE, se haya quitado algo o no.
     La primera version devolvia el texto original cuando no tocaba nada y `JSON.stringify`
     cuando si, y con eso el lado antiguo (sin las siete claves) salia con el sangrado del
     fichero y el nuevo compacto: la normalizacion metia una diferencia suya en vez de quitar
     una. El gate lo canto en la primera comparativa, que es justo para lo que esta.
     Lo que esto anade, dicho sin rodeos: el sangrado del JSON deja de contar para la huella de
     ESTE fichero. El orden de las claves NO —`JSON.stringify` lo conserva—, los valores tampoco,
     y el contrato de formato del estado (pretty, UTF-8 sin escapar) lo sigue guardando
     `E2E-FI-02`, que es su sitio. */
  return JSON.stringify(obj);
}

/* La huella del docroot, separada en dos.
 *
 * Por que separada (fase 17.4): exigir que el control y el candidato tuvieran docroots identicos
 * byte a byte tenia sentido mientras el producto no cambiaba, y dejo de tenerlo en cuanto hubo un
 * cambio de producto que medir, que es justo para lo que existe la comparacion. Lo que tiene que
 * ser identico es la FIXTURA: el estado sembrado, las fotos, el marcador y los registros. Las
 * diferencias del PRODUCTO son la razon de medir y se registran como evidencia. */
export function huellaDocroot(raiz) {
  const fuera = new Set(FUERA_DE_LA_HUELLA.map((x) => x.ruta));
  const delProducto = ficherosDelProducto();
  const porFichero = {};
  const producto = {};
  const fixtura = {};
  const partes = [];
  for (const f of ficherosDe(raiz)) {
    if (fuera.has(f.rel)) continue;
    /* Solo `estado.json` pasa por la normalizacion semantica, y solo por la de arriba. Todo lo
       demas —fotos, marcador, registros, producto— sigue hasheandose byte a byte. */
    const h = f.rel === 'estado.json'
      ? sha(Buffer.from(normalizaEstadoParaHuella(readFileSync(f.abs, 'utf8')), 'utf8'))
      : sha(readFileSync(f.abs));
    porFichero[f.rel] = h;
    (delProducto.has(f.rel) ? producto : fixtura)[f.rel] = h;
    partes.push(f.rel + ':' + h);
  }
  const hashDe = (o) => sha(Buffer.from(
    Object.keys(o).sort().map((k) => k + ':' + o[k]).join(String.fromCharCode(10)), 'utf8'));
  return {
    hash: sha(Buffer.from(partes.join(String.fromCharCode(10)), 'utf8')),
    porFichero,
    ficheros: partes.length,
    producto: { porFichero: producto, hash: hashDe(producto), ficheros: Object.keys(producto).length },
    fixtura: { porFichero: fixtura, hash: hashDe(fixtura), ficheros: Object.keys(fixtura).length },
  };
}

/* Qué ficheros difieren entre dos huellas de docroot, dicho con nombre y apellidos. */
export function diferenciaDocroots(a, b) {
  const claves = new Set([...Object.keys(a.porFichero || {}), ...Object.keys(b.porFichero || {})]);
  const soloA = []; const soloB = []; const distintos = [];
  for (const k of [...claves].sort()) {
    const x = a.porFichero?.[k]; const y = b.porFichero?.[k];
    if (x && !y) soloA.push(k);
    else if (!x && y) soloB.push(k);
    else if (x !== y) distintos.push(k);
  }
  return { soloA, soloB, distintos, iguales: !soloA.length && !soloB.length && !distintos.length };
}

/* Diferencias entre dos docroots, separando lo que tiene que ser igual de lo que puede cambiar.
 * `fixtura` es el veredicto: si no coincide, no se mide. `producto` es la evidencia: se enseña. */
export function comparaDocroots(a, b) {
  const dif = (x = {}, y = {}) => {
    const claves = new Set([...Object.keys(x), ...Object.keys(y)]);
    const soloA = []; const soloB = []; const distintos = [];
    for (const k of [...claves].sort()) {
      if (x[k] && !y[k]) soloA.push(k);
      else if (!x[k] && y[k]) soloB.push(k);
      else if (x[k] !== y[k]) distintos.push(k);
    }
    return { soloA, soloB, distintos, iguales: !soloA.length && !soloB.length && !distintos.length };
  };
  return {
    fixtura: dif(a.fixtura?.porFichero, b.fixtura?.porFichero),
    producto: dif(a.producto?.porFichero, b.producto?.porFichero),
  };
}

/* Todo lo que tiene que ser idéntico para que dos medidas se puedan comparar: el entorno, la
   configuración de Lighthouse, los viewports y la fixtura. El producto NO entra: es lo que se
   mide. Devuelve la lista de diferencias, vacía cuando la comparación es válida. */
export function condicionesIncomparables(a, b) {
  const fallos = [];
  const igual = (etiqueta, x, y) => {
    const sx = JSON.stringify(x); const sy = JSON.stringify(y);
    if (sx !== sy) fallos.push(`${etiqueta}: ${sx} != ${sy}`);
  };
  igual('entorno', a.huella, b.huella);
  igual('configuracion de lighthouse', a.configuracion, b.configuracion);
  igual('perfiles y viewports', a.perfiles, b.perfiles);
  igual('php', a.versiones?.php, b.versiones?.php);
  igual('node', a.versiones?.node, b.versiones?.node);
  igual('hash de la fixtura', a.fixtura?.hashFixtura, b.fixtura?.hashFixtura);
  igual('podio sembrado', a.fixtura?.podio, b.fixtura?.podio);
  igual('estado sembrado', a.fixtura?.hashEstado, b.fixtura?.hashEstado);
  return fallos;
}
