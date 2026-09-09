/* Servidores PHP de usar y tirar, con las extensiones que pida cada prueba.
 *
 * La clave de todo esto es `-n`: PHP arranca SIN leer ningún php.ini, así que lo único activo es
 * lo que se le pasa por `-d extension=`. Sin eso no se podría probar "sin mbstring" en una
 * máquina cuyo php.ini la cargue, y la prueba diría PASS sin haber probado nada.
 *
 * Cada servidor escribe su propio error_log: los avisos de PHP son una comprobación más, no ruido
 * que se pierde por la consola.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PHP, phpExtensionDir } from './entorno.mjs';
import { correr, lanzar, esperaHttp } from './proc.mjs';

/* El primer puerto depende del proceso: dos suites lanzadas a la vez (o una pasada que se quedó
   con un servidor colgado) chocarían siempre en el mismo número si se empezara fijo. */
let siguientePuerto = 5730 + (process.pid % 300) * 10;
export function puertoLibre() { return siguientePuerto++; }

/* Qué extensiones puede ofrecer este PHP arrancado con -n. Se pregunta una vez y se guarda: si
   una prueba pide algo que esta máquina no puede dar, el llamador lo marca BLOCKED en vez de
   fingir que lo probó. */
let capacidadesCache = null;
export function capacidadesPhp() {
  if (capacidadesCache) return capacidadesCache;
  if (!PHP) return (capacidadesCache = { hayPhp: false, dir: null, gd: false, mbstring: false, sinMbstring: false });
  const dir = phpExtensionDir();
  const prueba = (ext) => {
    const args = ['-n'];
    if (dir) args.push('-d', `extension_dir=${dir}`);
    args.push('-d', `extension=${ext}`, '-r', `echo extension_loaded(${JSON.stringify(ext)}) ? 'si' : 'no';`);
    return correr(PHP, args).salida.trim() === 'si';
  };
  /* Sin cargar nada, ¿mbstring sigue ahí? Si está compilada estáticamente no hay forma de
     quitarla y la mitad de las pruebas de E2 no se pueden hacer en esta máquina. */
  const sinNada = correr(PHP, ['-n', '-r', "echo function_exists('mb_strlen') ? 'si' : 'no';"]).salida.trim();
  capacidadesCache = {
    hayPhp: true,
    dir,
    gd: prueba('gd'),
    mbstring: prueba('mbstring'),
    sinMbstring: sinNada === 'no',
  };
  return capacidadesCache;
}

/* Arranca `php -S` sobre un docroot. Devuelve { url, parar(), avisos() }.
 *
 * Reintenta una vez en otro puerto. No es tapar un fallo: en una pasada larga —`weekly` abre nueve
 * servidores y un navegador antes de llegar a Lighthouse— el sistema puede tardar mas de la cuenta
 * en dar el puerto, y eso aparecia como «el servidor PHP no arranco» en el octavo servidor de la
 * pasada y en ninguno de los siete anteriores. Si el segundo intento tambien falla, se lanza con
 * los dos errores: un arranque que no sale dos veces seguidas es un problema de verdad. */
export async function servidorPhp(docroot, opciones = {}) {
  const { intentos = 4 } = opciones;
  let ultimo = null;
  for (let i = 1; i <= intentos; i++) {
    try {
      return await arrancaUnaVez(docroot, opciones);
    } catch (e) {
      ultimo = e;
      if (i < intentos) await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw ultimo;
}

async function arrancaUnaVez(docroot, opciones = {}) {
  const { gd = true, mbstring = true, subidaMax = '8M', postMax = '10M', logDir, sesionesDir } = opciones;
  const caps = capacidadesPhp();
  if (!caps.hayPhp) throw new Error('no hay binario de PHP en el PATH');

  const puerto = puertoLibre();
  const dirLog = logDir || docroot;
  mkdirSync(dirLog, { recursive: true });
  const log = path.join(dirLog, `php-${puerto}.log`);

  const args = ['-n'];
  if (caps.dir) args.push('-d', `extension_dir=${caps.dir}`);
  if (gd && caps.gd) args.push('-d', 'extension=gd');
  if (mbstring && caps.mbstring) args.push('-d', 'extension=mbstring');
  /* FASE A: una carpeta de sesiones propia. Sirve para dos cosas: que una pasada no lea las
     sesiones de otra, y que la prueba de caducidad pueda envejecer el `visto` de una sesion a
     mano en vez de esperar treinta minutos. Sin opcion, PHP usa su temporal de siempre. */
  if (sesionesDir) {
    mkdirSync(sesionesDir, { recursive: true });
    args.push('-d', `session.save_path=${sesionesDir}`);
  }
  args.push(
    '-d', `error_log=${log}`,
    '-d', 'log_errors=1',
    '-d', 'display_errors=0',
    '-d', `upload_max_filesize=${subidaMax}`,
    '-d', `post_max_size=${postMax}`,
    '-S', `127.0.0.1:${puerto}`,
    '-t', docroot,
  );

  const proc = lanzar(PHP, args);
  const url = `http://127.0.0.1:${puerto}`;
  const arrancado = await esperaHttp(url + '/', 30000);
  if (!arrancado) {
    proc.parar();
    throw new Error(`el servidor PHP no arrancó en ${url}: ${proc.registro.error.slice(0, 300)}`);
  }
  /* Que ese puerto conteste NO significa que conteste el servidor que acabamos de lanzar. Si el
     puerto ya estaba cogido —un servidor de una pasada anterior que se quedo colgado, o el de
     revision— `php -S` muere con «Address already in use» y quien contesta es el de antes, con
     OTRO docroot. La bateria entonces prueba contra una carpeta que no es la suya: se veia como
     «contraseña incorrecta» al entrar al panel, y detras venian ocho comprobaciones en rojo que
     no tenian nada que ver. Se comprueba que el proceso sigue vivo y, si no, se reintenta en
     otro puerto. */
  if (!proc.vivo) {
    proc.parar();
    throw new Error(`el puerto ${puerto} ya estaba ocupado: ${proc.registro.error.slice(0, 200).trim()}`);
  }
  /* Y en Windows ni siquiera muere: `php -S` vuelve a coger un puerto ocupado y quien contesta
     sigue siendo el de antes. Asi que no se pregunta por el proceso, se pregunta por el
     CONTENIDO: version.json esta en todos los builds y trae el sello de este. Si lo que llega
     por HTTP no es lo que hay en el disco de ESTE docroot, se esta hablando con otro servidor.
     Es la comprobacion que faltaba, y su ausencia costo dos pasadas enteras en rojo. */
  const sello = path.join(docroot, 'version.json');
  if (existsSync(sello)) {
    let servido = null;
    try { servido = await (await fetch(url + '/version.json', { cache: 'no-store' })).text(); } catch { servido = null; }
    const enDisco = readFileSync(sello, 'utf8');
    if (servido === null || servido.trim() !== enDisco.trim()) {
      proc.parar();
      throw new Error(`en ${url} contesta OTRO servidor (version.json no cuadra con ${docroot})`);
    }
  }
  return {
    url,
    puerto,
    docroot,
    conGd: gd && caps.gd,
    conMbstring: mbstring && caps.mbstring,
    rutaLog: log,
    sesionesDir: sesionesDir || null,
    /* Los avisos de PHP de este servidor. Se filtra el ruido de arranque de una extensión que la
       máquina no tiene: eso ya lo dice `capacidadesPhp()` y no es un fallo del producto. */
    avisos() {
      if (!existsSync(log)) return [];
      return readFileSync(log, 'utf8')
        .split(/\r?\n/)
        .filter((l) => /PHP (Warning|Notice|Fatal|Deprecated|Parse)/.test(l))
        .filter((l) => !/Unable to load dynamic library/.test(l));
    },
    parar() { proc.parar(); },
  };
}

/* Todos los servidores que se han abierto, para poder cerrarlos de golpe al final. */
const abiertos = new Set();

export async function abrir(docroot, opciones) {
  const s = await servidorPhp(docroot, opciones);
  abiertos.add(s);
  return s;
}

export function cerrarTodos() {
  const n = abiertos.size;
  for (const s of abiertos) s.parar();
  abiertos.clear();
  return n;
}

export function servidoresVivos() {
  return [...abiertos].filter((s) => s && s.parar);
}
