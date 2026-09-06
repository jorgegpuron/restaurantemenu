/* Clientes de usar y tirar: copias de Tinge y altas nuevas hechas con la herramienta real.
 *
 * REGLA QUE NO SE SALTA: la suite nunca compila dentro del repositorio. `gen.mjs` rehace
 * `2-subir` entera y cambia el sello de build, así que compilar en sitio dejaría el producto
 * publicado distinto sólo por haber pasado las pruebas — que es exactamente lo que la fase 17
 * tiene que demostrar que NO ocurre. Todo build vive en una carpeta temporal.
 *
 * El alta de clientes nuevos usa `nuevo-cliente.mjs` de verdad, nunca una imitación: si la
 * herramienta se rompe, la suite tiene que enterarse.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { CLIENTE, CARPETA_CLIENTE, NODE, carpetaTemporal } from './entorno.mjs';
import { correr } from './proc.mjs';

/* Token de activación de las pruebas. Es deliberadamente falso y sólo vive en un docroot
   temporal que se borra al terminar; nunca sale de aquí ni se parece a uno real. */
export const TOKEN_QA = 'token-de-pruebas-qa-no-es-real';
export const CLAVE_QA = 'clave-de-pruebas-qa-1234';
export function hashActivacion(token = TOKEN_QA) {
  return createHash('sha256').update(token).digest('hex');
}

const NO_COPIAR = new Set(['.git', 'node_modules', 'generado', '2-subir', 'qa']);

/* La línea `base: 'https://...'` de `cliente.mjs`. Se lee con una expresión, y no importando el
   módulo, porque el módulo que hay que mirar es el del clon o el del árbol de control, no el de
   esta máquina. */
const RE_BASE = /\bbase:\s*['"]([^'"]+)['"]/;

/* Cómo se tiene que llamar la carpeta que contiene al cliente.
 *
 * `gen.mjs` aborta si `CLIENTE.base` no contiene el nombre de la carpeta contenedora: es su forma
 * de detectar que alguien copió el proyecto de otro restaurante y se dejó la dirección pública del
 * anterior. La batería tiene que reproducir ese nombre al clonar, y **no puede sacarlo del disco**:
 * en el ordenador del propietario la carpeta padre se llama `tinge_of_turmeric`, pero en un
 * checkout de CI se llama como el repositorio (`/home/runner/work/restaurantemenu/restaurantemenu`)
 * y el build abortaba. Era un supuesto de la batería sobre el disco, no un defecto del producto.
 *
 * Se saca del contrato, que es lo único que viaja con el cliente: los segmentos de la ruta de
 * `CLIENTE.base`. Si el nombre de la carpeta local es uno de ellos, se respeta —así en local no
 * cambia nada—; si no, se usa el primer segmento, que es lo que el motor va a exigir. */
export function carpetaDelCliente(proyecto = CLIENTE) {
  const local = path.basename(path.dirname(proyecto));
  let base = '';
  try {
    const texto = readFileSync(path.join(proyecto, 'cliente.mjs'), 'utf8');
    base = (RE_BASE.exec(texto) || [])[1] || '';
  } catch { /* sin cliente.mjs no hay contrato que respetar */ }
  if (!base) return local;
  let segmentos = [];
  try {
    segmentos = new URL(base).pathname.split('/').filter(Boolean);
  } catch {
    segmentos = base.split('/').filter(Boolean);
  }
  if (!segmentos.length) return local;
  return segmentos.includes(local) ? local : segmentos[0];
}

/* Copia de Tinge fuera del repositorio, con la carpeta contenedora bien nombrada: `gen.mjs`
   aborta si el nombre de la carpeta del cliente no aparece en `CLIENTE.base`. */
export function clonarTinge() {
  const raiz = carpetaTemporal('totm-clon-');
  const destino = path.join(raiz, carpetaDelCliente(CLIENTE), '1-proyecto');
  mkdirSync(destino, { recursive: true });
  for (const e of readdirSync(CLIENTE, { withFileTypes: true })) {
    if (NO_COPIAR.has(e.name)) continue;
    cpSync(path.join(CLIENTE, e.name), path.join(destino, e.name), { recursive: true });
  }
  return { raiz, proyecto: destino, salida: path.join(path.dirname(destino), '2-subir') };
}

/* Un árbol de Tinge tal y como estaba en un commit concreto, fuera del repositorio.
 *
 * Lo pide la comparación control-contra-candidato: medir dos versiones en el MISMO runner, con el
 * mismo Chrome y la misma fixtura, es la única forma de que una diferencia de milisegundos
 * signifique algo. Comparar Windows contra un runner de Linux no lo es.
 *
 * Se usa `git archive`, que no toca el árbol de trabajo ni el índice ni crea worktrees: escribe un
 * tar del commit y ya. Si el commit no está —un checkout superficial de CI, por ejemplo— esto
 * lanza, y quien llama lo convierte en fallo. Nunca en verde. */
export function checkoutCommit(commit) {
  const raiz = carpetaTemporal('totm-ctrl-');
  const destino = path.join(raiz, carpetaDelCliente(CLIENTE), '1-proyecto');
  mkdirSync(destino, { recursive: true });
  /* El tar se escribe DENTRO del destino y se extrae con nombre relativo: el `tar` de GNU
     interpreta un `C:\...` como «maquina remota C» y falla con «resolve failed». Con cwd en el
     destino y nombre corto funcionan igual el tar de GNU y el bsdtar de Windows. */
  const tar = path.join(destino, 'control.tar');

  const existe = correr('git', ['cat-file', '-e', commit + '^{commit}'], { cwd: CLIENTE });
  if (!existe.ok) {
    throw new Error(`el commit de control ${commit} no esta en este clon `
      + '(un checkout superficial no lo trae: hace falta fetch-depth: 0)');
  }
  const arch = correr('git', ['archive', '--format=tar', '--output=' + tar, commit], { cwd: CLIENTE });
  if (!arch.ok || !existsSync(tar)) throw new Error('git archive fallo: ' + arch.texto.slice(-200));
  const ext = correr('tar', ['-xf', 'control.tar'], { cwd: destino });
  if (!ext.ok) throw new Error('no se pudo extraer el control con tar: ' + ext.texto.slice(-200));
  rmSync(tar, { force: true });
  if (!existsSync(path.join(destino, 'gen.mjs'))) {
    throw new Error('el arbol de control no tiene gen.mjs: la extraccion no dejo lo que se esperaba');
  }
  return { raiz, proyecto: destino, salida: path.join(path.dirname(destino), '2-subir'), commit };
}

/* Alta real de un cliente nuevo. `carpeta` es el nombre de la carpeta y a la vez el que tiene que
   aparecer en la URL: el mismo contrato que comprueba el motor. */
export function altaCliente(desdeProyecto, raizDestino, carpeta, opciones = {}) {
  const destino = path.join(raizDestino, carpeta);
  const args = [
    'nuevo-cliente.mjs',
    '--destino', destino,
    '--nombre', opciones.nombre || `Cliente ${carpeta}`,
    '--url', opciones.url || `https://socialcard.es/${carpeta}/`,
    '--idiomas', opciones.idiomas || 'es',
    '--impuesto', opciones.impuesto || 'IVA incluido',
    '--alergenos-en-origen', opciones.alergenos || 'no',
    '--zona-horaria', opciones.zona || 'Europe/Madrid',
    '--corte-hora', String(opciones.corte ?? 5),
  ];
  if (opciones.juego !== undefined) args.push('--juego', String(opciones.juego));
  if (opciones.publicidad !== undefined) args.push('--publicidad', String(opciones.publicidad));
  if (opciones.color) args.push('--color-principal', opciones.color);
  const r = correr(NODE, args, { cwd: desdeProyecto });
  return { ...r, destino, proyecto: path.join(destino, '1-proyecto'), salida: path.join(destino, '2-subir') };
}

export function detectar(desdeProyecto, destino) {
  return correr(NODE, ['nuevo-cliente.mjs', '--detectar', '--destino', destino], { cwd: desdeProyecto });
}

export function buildLocal(desdeProyecto, destino) {
  return correr(NODE, ['nuevo-cliente.mjs', '--build-local', '--destino', destino], { cwd: desdeProyecto });
}

/* Compilación canónica de un proyecto cualquiera (Tinge clonado o cliente nuevo), con un hash de
   activación conocido para poder activar el panel en las pruebas. */
export function compilar(proyecto, { conActivacion = true } = {}) {
  const env = { ...process.env };
  if (conActivacion) env.PANEL_ACTIVACION_HASH = hashActivacion();
  const importar = correr(NODE, ['importar.mjs'], { cwd: proyecto, env });
  const gen = correr(NODE, ['gen.mjs'], { cwd: proyecto, env });
  return { importar, gen };
}

export function verificarBuild(proyecto) {
  return correr(NODE, ['motor/verificar-build.mjs'], { cwd: proyecto });
}

export function lock(proyecto, escribir = false) {
  return correr(NODE, escribir ? ['motor/lock.mjs', '--escribir'] : ['motor/lock.mjs'], { cwd: proyecto });
}

/* Un docroot servible a partir de una carpeta 2-subir ya compilada: se copia (para que el
   servidor escriba en la copia y no en la salida del build) y se renombra el estado de ejemplo,
   que es exactamente lo que dice el procedimiento de despliegue. */
export function docrootDesde(salida, nombre = 'docroot') {
  const raiz = carpetaTemporal('totm-doc-');
  const destino = path.join(raiz, nombre);
  cpSync(salida, destino, { recursive: true });
  const ejemplo = path.join(destino, 'estado-EJEMPLO.json');
  const estado = path.join(destino, 'estado.json');
  if (existsSync(ejemplo) && !existsSync(estado)) renameSync(ejemplo, estado);
  return destino;
}

/* Hashes de todo un árbol, para las pruebas de aislamiento y de «el repositorio no se toca». */
export function hashesDe(raiz, filtro = () => true) {
  const salida = new Map();
  const recorrer = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (NO_COPIAR.has(e.name)) continue;
        recorrer(p);
      } else if (e.isFile()) {
        const rel = path.relative(raiz, p).split(path.sep).join('/');
        if (!filtro(rel)) continue;
        salida.set(rel, createHash('sha256').update(readFileSync(p)).digest('hex'));
      }
    }
  };
  recorrer(raiz);
  return salida;
}

export function comparaHashes(antes, despues) {
  const cambiados = [];
  const nuevos = [];
  const perdidos = [];
  for (const [k, v] of antes) {
    if (!despues.has(k)) perdidos.push(k);
    else if (despues.get(k) !== v) cambiados.push(k);
  }
  for (const k of despues.keys()) if (!antes.has(k)) nuevos.push(k);
  return { cambiados, nuevos, perdidos, iguales: cambiados.length === 0 && nuevos.length === 0 && perdidos.length === 0 };
}

/* Escribe una carta mínima o completa en un cliente ya creado. No toca el motor: sólo
   `carta.json`, que es dato del cliente. */
export function escribirCarta(proyecto, carta) {
  writeFileSync(path.join(proyecto, 'carta.json'), JSON.stringify(carta, null, 2) + '\n', 'utf8');
}

export function cartaVacia() {
  return {
    esquema: 'carta/2',
    pestanas: [{
      pestana: { es: 'Cafetería' },
      icono: 'coffee',
      grupos: [{
        categoria: 'Cafes',
        platos: [{ numero: '01', nombre: { es: 'Café solo' }, descripcion: { es: 'Café de tueste natural.' }, precio: '1.30' }],
      }],
    }],
  };
}

export function cartaCompleta() {
  const t = (es, en) => ({ es, en });
  return {
    esquema: 'carta/2',
    pestanas: [
      {
        pestana: t('Entrantes', 'Starters'), icono: 'appetizers',
        grupos: [{
          categoria: 'Entrantes', subtitulo: t('Entrantes de la casa', 'House starters'), icono: 'appetizers',
          platos: [
            { numero: '01', nombre: t('Croquetas de ámbar', 'Amber croquettes'), descripcion: t('Croquetas cremosas de la casa.', 'Creamy house croquettes.'), precio: '6.50', alergenos: ['cereals_gluten', 'milk', 'eggs'] },
            { numero: '02', nombre: t('Ensalada de temporada', 'Seasonal salad'), descripcion: t('Hoja verde, tomate y aceite.', 'Green leaves, tomato and oil.'), precio: '7.20' },
            { numero: '03', nombre: t('Tabla de quesos', 'Cheese board'), descripcion: t('Selección de tres quesos.', 'Three cheeses.'), precio: '9.80', alergenos: ['milk', 'nuts'] },
          ],
        }],
      },
      {
        pestana: t('Principales', 'Mains'), icono: 'meat',
        grupos: [{
          categoria: 'Carnes y pescados', subtitulo: t('Carnes y pescados', 'Meat and fish'), icono: 'fish',
          platos: [
            { numero: '04', nombre: t('Lubina al horno', 'Baked sea bass'), descripcion: t('Lubina entera con patata.', 'Whole sea bass with potato.'), precio: '18.00', alergenos: ['fish'] },
            { numero: '05', nombre: t('Solomillo QA', 'QA sirloin'), descripcion: t('Solomillo a la brasa.', 'Grilled sirloin.'), precio: '21.50' },
            { numero: '06', nombre: t('Arroz de marisco', 'Seafood rice'), descripcion: t('Arroz caldoso del día.', "Soupy rice of the day."), precio: '16.90', alergenos: ['crustaceans', 'molluscs', 'sulphites'] },
          ],
        }],
      },
    ],
  };
}

/* Las cuatro claves de interfaz que un idioma extra tiene que traducir. Sin esto el build aborta
   por «missing translations», que es la guarda correcta y no un fallo. */
export function traducirInterfaz(proyecto, codigo, nombre, impuesto, traducciones) {
  const ruta = path.join(proyecto, `i18n.${codigo}.mjs`);
  if (!existsSync(ruta)) return false;
  let texto = readFileSync(ruta, 'utf8');
  texto = texto.replace(/\/\* =+ FALTAN POR TRADUCIR[\s\S]*?=+ \*\/\n/, '');
  const guion = '—';
  const filas = [
    [impuesto, traducciones.impuesto],
    [nombre, traducciones.rotulo],
    [`${nombre} ${guion} Carta`, traducciones.titulo],
    [`${nombre} ${guion} carta del restaurante.`, traducciones.descripcion],
  ].map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  texto = texto.replace('export const ui = {\n};', `export const ui = {\n${filas}\n};`);
  writeFileSync(ruta, texto, 'utf8');
  return true;
}

export function tamanoDe(raiz) {
  let bytes = 0;
  const recorrer = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p); else if (e.isFile()) bytes += statSync(p).size;
    }
  };
  recorrer(raiz);
  return bytes;
}

/* ------------------------------------------------------------------ identidad del producto
 * «Control 54ed519 · candidato 54ed519» no dice nada: el árbol de trabajo puede tener cambios sin
 * confirmar y seguir enseñando el mismo commit. Esto identifica lo que de verdad se ha medido: el
 * commit, si el árbol está limpio o sucio, y un hash del PRODUCTO —no del repositorio— calculado
 * con exclusiones declaradas, para que tocar `qa/**` o un informe no cambie el hash del producto.
 */
export const FUERA_DEL_HASH_DE_PRODUCTO = [
  '.git/',        // el repositorio, no el producto
  'qa/',          // la bateria: cambiarla no cambia lo que se mide
  'auditorias/',  // informes
  '.github/',     // workflows: no entran en el build
  '.claude/',     // herramientas del asistente
  '.gitignore',   // idem
  'node_modules/',
  'generado/',    // derivados regenerables
  '2-subir/',     // la salida, no la fuente
  '3-copias/',
];

export function hashProducto(raiz = CLIENTE) {
  const partes = [];
  (function w(dir, pre) {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const rel = pre ? pre + '/' + e.name : e.name;
      const relDir = rel + '/';
      if (FUERA_DEL_HASH_DE_PRODUCTO.some((x) => relDir === x || rel === x.replace(/\/$/, ''))) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { w(abs, rel); continue; }
      partes.push(rel + ':' + createHash('sha256').update(readFileSync(abs)).digest('hex'));
    }
  })(raiz, '');
  return {
    hash: createHash('sha256').update(partes.join('\n')).digest('hex').slice(0, 16),
    ficheros: partes.length,
    exclusiones: FUERA_DEL_HASH_DE_PRODUCTO,
  };
}

/* La identidad completa de un árbol medido, lista para imprimir: `54ed519+dirty · producto <hash>`. */
export function identidadArbol(raiz = CLIENTE, { commit } = {}) {
  const rev = commit || (correr('git', ['rev-parse', '--short', 'HEAD'], { cwd: raiz }).salida || '').trim();
  const estado = correr('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: raiz });
  const sucias = (estado.salida || '').split('\n').map((l) => l.trim()).filter(Boolean);
  /* Sucio SÓLO si lo sucio es producto: cambiar `qa/**` o un informe no ensucia el producto. */
  const sucioProducto = sucias.filter((l) => {
    const ruta = l.replace(/^[^\s]+\s+/, '');
    return !FUERA_DEL_HASH_DE_PRODUCTO.some((x) => ruta.startsWith(x));
  });
  const p = hashProducto(raiz);
  return {
    commit: rev || '(sin git)',
    sucio: sucioProducto.length > 0,
    sucioProducto: sucioProducto.slice(0, 10),
    hashProducto: p.hash,
    ficherosProducto: p.ficheros,
    exclusiones: p.exclusiones,
    etiqueta: `${rev || '(sin git)'}${sucioProducto.length ? '+dirty' : ''} · producto ${p.hash}`,
  };
}
