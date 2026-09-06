/* Playwright con el Chrome que ya hay en la máquina.
 *
 * Se usa `playwright-core` y no `playwright` a propósito: el segundo se descarga sus propios
 * navegadores (cientos de megas) y aquí no hace falta — el mismo Chrome que mide Lighthouse es el
 * que pulsa los botones, así que lo que se mide y lo que se prueba es el mismo motor.
 *
 * Cada página trae de serie dos recolectores que se consultan al final de cada prueba: errores de
 * consola y peticiones con código >= 400. Sin eso, un 404 silencioso pasa desapercibido — que es
 * exactamente cómo vivió E1 hasta que alguien lo miró.
 */
import { chromium } from 'playwright-core';
import { chromePath } from './entorno.mjs';

export async function abrirNavegador() {
  const executablePath = chromePath();
  if (!executablePath) throw new Error('no se encuentra Chrome; define CHROME_PATH');
  const navegador = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  return navegador;
}

/* Una página con sus recolectores. `vigilar()` devuelve un objeto que acumula desde ese momento;
   `limpiar()` lo reinicia entre pruebas. */
/* El agente de usuario de un Chrome normal. Sin esto, Playwright anuncia «HeadlessChrome» y el
 * endpoint del marcador —que filtra robots por user-agent, y hace bien— contesta 204 a todo: la
 * prueba del récord se quedaba sin identificador y no medía nada. Se pone el agente de un
 * visitante real porque eso es lo que la batería quiere imitar, no un rastreador. */
const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

export async function nuevaPagina(navegador, opciones = {}) {
  const contexto = await navegador.newContext({
    viewport: opciones.viewport || { width: 1280, height: 900 },
    userAgent: opciones.userAgent || AGENTE,
    ignoreHTTPSErrors: true,
  });
  const pagina = await contexto.newPage();
  const registro = { consola: [], fallidas: [], paginas404: [] };
  pagina.on('console', (m) => {
    if (m.type() === 'error') registro.consola.push(m.text().slice(0, 200));
  });
  pagina.on('response', (r) => {
    if (r.status() >= 400) registro.fallidas.push(`${r.status()} ${r.url()}`);
  });
  pagina.on('pageerror', (e) => registro.consola.push('pageerror: ' + String(e.message).slice(0, 200)));
  pagina.registro = registro;
  pagina.limpiarRegistro = () => { registro.consola = []; registro.fallidas = []; };
  /* Los diálogos nativos (confirm, beforeunload, file chooser) bloquean la página si nadie
     contesta. Se acepta por defecto y se apunta, que es lo que hace falta para el lote 3. */
  registro.dialogos = [];
  pagina.on('dialog', async (d) => {
    registro.dialogos.push(`${d.type()}: ${d.message().slice(0, 120)}`);
    try { await d.accept(); } catch { /* ya se cerro */ }
  });
  pagina.contextoQa = contexto;
  return pagina;
}

/* Clic real por coordenadas: el panel esconde muchos controles detrás de una etiqueta con el
   input a cero píxeles, y `locator.click()` los ve como invisibles. Se hace lo mismo que haría un
   dedo: llevarlo al centro de la pantalla y pulsar donde se ve. */
export async function clicVisible(pagina, selector, indice = 0) {
  const caja = await pagina.evaluate(([sel, i]) => {
    const el = document.querySelectorAll(sel)[i];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }, [selector, indice]);
  if (!caja || caja.w === 0) throw new Error(`no se pudo situar ${selector}[${indice}]`);
  await pagina.mouse.click(caja.x, caja.y);
  return caja;
}

/* Abre todos los <details> de un panel: en Agotados las filas viven dentro y sin abrirlos no hay
   nada que pulsar. */
export async function abrirAcordeones(pagina, dentroDe = 'section.pane') {
  await pagina.evaluate((sel) => {
    document.querySelectorAll(`${sel} details`).forEach((d) => { d.open = true; });
  }, dentroDe);
}

export async function textoAviso(pagina) {
  return pagina.evaluate(() => {
    const t = document.querySelector('.toasts');
    const fuente = t && t.innerText.trim() ? t : document.body;
    return fuente.innerText.trim().split('\n').filter(Boolean).slice(0, 3).join(' | ');
  });
}
