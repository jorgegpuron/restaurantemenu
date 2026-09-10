/* Claro / oscuro del panel — SocialCard.
 *
 * A diferencia de la versión anterior (el producto tenía un solo modo, el oscuro), SocialCard
 * trae un interruptor de tema en la cabecera del panel: la preferencia vive en localStorage
 * (`socialcard-color-mode`), no viaja al servidor, y persiste al cambiar de pantalla y tras F5.
 * Aquí se comprueba, funcionalmente, que los dos temas se pintan y que la preferencia se recuerda.
 *
 * La carta pública es un producto aparte (el menú del restaurante) y conserva su propio aspecto;
 * este archivo sólo audita el tema del PANEL.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/* Se conserva el rastreador de residuos por compatibilidad con quien lo importe, pero SIN los
   patrones antiguos («modo claro», «cambiar tema»), que ahora son texto legítimo del panel. */
const PATRONES = [];
const EXTENSIONES = /\.(mjs|js|php|css|html|json)$/;
const SALTAR = new Set(['node_modules', '.git', 'tmp', 'informes', 'generado']);
export function residuosEnDisco(raices) {
  if (!PATRONES.length) return [];
  const hallazgos = [];
  const rec = (dir, raiz) => {
    let entradas;
    try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      if (SALTAR.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { rec(p, raiz); continue; }
      if (!EXTENSIONES.test(e.name)) continue;
      if (statSync(p).size > 8 * 1024 * 1024) continue;
      let texto; try { texto = readFileSync(p, 'utf8'); } catch { continue; }
      for (const re of PATRONES) if (re.test(texto)) hallazgos.push(`${path.relative(raiz, p)} :: ${re.source}`);
    }
  };
  for (const r of raices) rec(r, r);
  return hallazgos;
}

const bgClaro = (fondo) => /^rgb\((2[0-9]{2}|1[89][0-9]),/.test(fondo);

export async function pruebasOscuro(informe, { pagina, servidor, etiqueta = '' }) {
  const url = servidor.url;
  const suf = etiqueta ? ` (${etiqueta})` : '';
  informe.seccion('claro / oscuro del panel' + suf);

  const leer = () => pagina.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    light: document.documentElement.classList.contains('light'),
    sw: !!document.querySelector('.adm-tema-seg[data-tema-seg="barra"] .adm-tema-op'),
    /* Antes: el aria-checked del interruptor. Ahora: cual de los dos botones esta marcado.
       Se lee 'true' cuando el marcado es «Oscuro», para que el resto de la suite siga
       diciendo lo mismo con las mismas palabras. */
    aria: (() => {
      const ops = [...document.querySelectorAll('.adm-tema-seg[data-tema-seg="barra"] .adm-tema-op')];
      if (!ops.length) return null;
      const m = ops.filter((b) => b.getAttribute('aria-pressed') === 'true');
      return m.length === 1 ? String(m[0].dataset.tema === 'dark') : 'marcados:' + m.length;
    })(),
    guardado: (() => { try { return localStorage.getItem('socialcard-color-mode'); } catch { return null; } })(),
    fondo: getComputedStyle(document.body).backgroundColor,
  }));

  await pagina.goto(url + '/admin/?t=platos', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  const inicial = await leer();
  informe.comprueba('OSC-01', 'el panel trae interruptor de tema y arranca en claro sin preferencia guardada' + suf,
    inicial.sw && inicial.light && !inicial.dark && inicial.aria === 'false' && inicial.guardado === null && bgClaro(inicial.fondo), JSON.stringify(inicial));

  await pagina.click('.adm-tema-seg[data-tema-seg="barra"] .adm-tema-op[data-tema="dark"]');
  await pagina.waitForTimeout(150);
  const trasOscuro = await leer();
  informe.comprueba('OSC-02', 'el interruptor pasa a oscuro, lo anuncia (aria-checked) y lo recuerda; el fondo deja de ser claro' + suf,
    trasOscuro.dark && trasOscuro.aria === 'true' && trasOscuro.guardado === 'dark' && !bgClaro(trasOscuro.fondo), JSON.stringify(trasOscuro));

  await pagina.goto(url + '/admin/?t=marca', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  const otraPantalla = await leer();
  informe.comprueba('OSC-03', 'el oscuro se mantiene al cambiar de pantalla y tras F5' + suf,
    otraPantalla.dark && otraPantalla.guardado === 'dark', JSON.stringify({ dark: otraPantalla.dark, guardado: otraPantalla.guardado }));

  await pagina.click('.adm-tema-seg[data-tema-seg="barra"] .adm-tema-op[data-tema="light"]');
  await pagina.waitForTimeout(150);
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  const trasClaro = await leer();
  informe.comprueba('OSC-04', 'volver a claro también persiste tras F5' + suf,
    trasClaro.light && !trasClaro.dark && trasClaro.guardado === 'light' && bgClaro(trasClaro.fondo), JSON.stringify(trasClaro));

  /* La preferencia no viaja al servidor: cambiarla no dispara peticiones al panel. */
  pagina.limpiarRegistro();
  await pagina.click('.adm-tema-seg[data-tema-seg="barra"] .adm-tema-op[data-tema="dark"]');
  await pagina.waitForTimeout(120);
  await pagina.click('.adm-tema-seg[data-tema-seg="barra"] .adm-tema-op[data-tema="light"]');
  await pagina.waitForTimeout(120);
  const posts = pagina.registro.peticiones.filter((p) => p.metodo === 'POST').length;
  informe.comprueba('OSC-05', 'cambiar el tema no dispara ningún POST al servidor' + suf, posts === 0, `posts=${posts}`);
  return informe;
}
