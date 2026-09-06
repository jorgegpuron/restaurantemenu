/* Dónde está todo y con qué herramientas se cuenta.
 *
 * Nada de rutas escritas a mano: la raíz del cliente se deduce de la posición de este fichero
 * (qa/ vive dentro de 1-proyecto) y las herramientas se buscan en el PATH. Así la misma suite
 * corre en Windows, en Linux y en un runner de GitHub sin tocar una línea.
 *
 * Este módulo NO importa nada del motor: la suite mira al producto desde fuera, como lo miraría
 * un tercero. Si un día hubiera que importar algo de motor/ para probarlo, sería señal de que la
 * prueba está mirando la implementación y no el comportamiento.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

export const QA = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* Normalmente el cliente es la carpeta que contiene a qa/. La excepcion es la autoprueba: para
   demostrar que la bateria detecta un fallo hay que APUNTARLA a una copia con el fallo sembrado,
   y sembrarlo en el repositorio original esta prohibido. Esa es la unica razon de esta variable;
   fuera de qa/suites/autoprueba.mjs no la pone nadie. */
export const CLIENTE = process.env.QA_RAIZ_CLIENTE
  ? path.resolve(process.env.QA_RAIZ_CLIENTE)
  : path.dirname(QA);
export const CARPETA_CLIENTE = path.dirname(CLIENTE); // tinge_of_turmeric
export const SALIDA = path.join(CARPETA_CLIENTE, '2-subir');
export const MOTOR = path.join(CLIENTE, 'motor');
export const ADMIN_FUENTE = path.join(MOTOR, 'server', 'admin');

export const esWindows = process.platform === 'win32';

/* ------------------------------------------------------------------ herramientas */

function primeroQueResponde(candidatos, args = ['--version']) {
  for (const c of candidatos) {
    if (!c) continue;
    const r = spawnSync(c, args, { encoding: 'utf8', timeout: 8000 });
    if (r.status === 0) return c;
  }
  return null;
}

export const NODE = process.execPath;

/* Dos interruptores que SOLO usa la autoprueba de la bateria, nunca el producto: sirven para
   demostrar que una herramienta ausente pone la suite en rojo y no la deja pasar en verde. Se
   comprueban aqui, en el unico sitio donde se localizan las herramientas, para que ninguna suite
   tenga que saber que existen. */
export const FINGIR_SIN_PHP = process.env.QA_FINGIR_SIN_PHP === '1';
export const FINGIR_SIN_CHROME = process.env.QA_FINGIR_SIN_CHROME === '1';

export const PHP = FINGIR_SIN_PHP ? null : primeroQueResponde([process.env.PHP_BIN, 'php']);

/* El directorio de extensiones del PHP que se va a usar. Se pregunta al propio binario en vez de
   suponerlo: en Windows con WinGet no es C:\php\ext, y en Linux cambia con cada versión. */
export function phpExtensionDir() {
  if (!PHP) return null;
  const candidatos = [];
  /* Lo que dice la configuracion. Puede ser mentira: un PHP de WinGet arrastra el
     `C:\php\ext` de fabrica aunque sus extensiones vivan al lado del ejecutable. */
  const cfg = spawnSync(PHP, ['-r', 'echo ini_get("extension_dir");'], { encoding: 'utf8' });
  if (cfg.status === 0 && cfg.stdout.trim()) candidatos.push(cfg.stdout.trim());
  /* Lo que de verdad suele haber: ext/ junto al binario. */
  const bin = spawnSync(PHP, ['-r', 'echo PHP_BINARY;'], { encoding: 'utf8' });
  if (bin.status === 0 && bin.stdout.trim()) candidatos.push(path.join(path.dirname(bin.stdout.trim()), 'ext'));
  /* Se queda el primero que exista y tenga algo dentro: un directorio vacio no sirve de nada y
     dejaria a las pruebas de GD y mbstring creyendo que esta maquina no puede cargarlas. */
  for (const c of candidatos) {
    try {
      if (existsSync(c) && readdirSync(c).length) return c;
    } catch { /* siguiente candidato */ }
  }
  return candidatos[0] || null;
}

/* Chrome para Playwright y para Lighthouse. El mismo binario en los dos, para que lo que mide
   Lighthouse y lo que pulsa Playwright sean el mismo navegador. */
export function chromePath() {
  if (FINGIR_SIN_CHROME) return null;
  const candidatos = [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/opt/google/chrome/chrome',
  ];
  for (const c of candidatos) if (c && existsSync(c)) return c;
  return null;
}

export const LIGHTHOUSE_CLI = path.join(QA, 'node_modules', 'lighthouse', 'cli', 'index.js');

/* ------------------------------------------------------------------ temporales
 * Todo lo que la suite escribe vive FUERA del repositorio, en el temporal del sistema. Se
 * registra para poder borrarlo entero al terminar, pase lo que pase. */
const temporales = new Set();

export function carpetaTemporal(prefijo = 'totm-qa-') {
  const d = mkdtempSync(path.join(os.tmpdir(), prefijo));
  temporales.add(d);
  return d;
}

export function limpiarTemporales() {
  const borrados = [];
  for (const d of temporales) {
    try { rmSync(d, { recursive: true, force: true, maxRetries: 5 }); borrados.push(d); } catch { /* se reporta abajo */ }
  }
  temporales.clear();
  return borrados;
}

export function temporalesVivos() {
  return [...temporales].filter((d) => existsSync(d));
}

/* La version del ejecutable, preguntandosela a Windows. En Linux no hace falta: alli
   `--version` siempre contesta la version. */
function versionDeFichero(ruta) {
  if (process.platform !== 'win32') return null;
  const r = spawnSync('powershell', ['-NoProfile', '-Command',
    `(Get-Item -LiteralPath '${ruta.replace(/'/g, "''")}').VersionInfo.ProductVersion`], { encoding: 'utf8', timeout: 10000 });
  const v = (r.stdout || '').trim();
  return /\d+\.\d+/.test(v) ? 'Chrome ' + v : null;
}

/* ------------------------------------------------------------------ versiones, para el informe */
export function versiones() {
  const v = { node: process.version, plataforma: `${process.platform} ${process.arch}` };
  if (PHP) {
    const r = spawnSync(PHP, ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8' });
    v.php = r.status === 0 ? r.stdout.trim() : '(desconocida)';
  } else {
    v.php = '(no encontrado)';
  }
  const chrome = chromePath();
  if (chrome) {
    /* En Windows NO se le pregunta a Chrome por la linea de comandos. `chrome --version` se
       comporta distinto segun haya o no una ventana abierta: unas veces contesta un aviso
       localizado y otras se queda esperando sin devolver nunca — y una bateria que se cuelga en su
       primera linea es peor que una que no sepa decir la version. Se lee del propio fichero, que
       siempre esta ahi. En Linux `--version` si es fiable, y aun asi va con tope de tiempo. */
    if (process.platform === 'win32') {
      v.navegador = versionDeFichero(chrome) || chrome;
    } else {
      const r = spawnSync(chrome, ['--version'], { encoding: 'utf8', timeout: 5000 });
      const dice = (r.stdout || '').trim();
      v.navegador = /\d+\.\d+\.\d+/.test(dice) ? dice : chrome;
    }
  } else {
    v.navegador = '(no encontrado)';
  }
  const leer = (rel) => {
    try { return JSON.parse(readFileSync(path.join(QA, 'node_modules', rel, 'package.json'), 'utf8')).version; }
    catch { return '(no instalado)'; }
  };
  v.playwright = leer('playwright-core');
  v.lighthouse = leer('lighthouse');
  return v;
}

/* El commit sobre el que se está midiendo. Sólo lectura; la suite nunca escribe en git. */
export function commitActual() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: CLIENTE, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '(sin git)';
}
