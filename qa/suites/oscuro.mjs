/* Modo oscuro y ausencia de residuos del modo claro.
 *
 * El producto tiene un solo modo y es el oscuro. El modo claro se retiró por orden expresa, y la
 * regla es que no vuelva por la puerta de atrás: ni un `data-theme`, ni un `prefers-color-scheme:
 * light`, ni un interruptor, ni una clave de tema guardada en el navegador.
 *
 * Se mira en tres sitios, porque un residuo puede aparecer en cualquiera:
 *   - las fuentes del cliente y del motor;
 *   - lo compilado, que es lo que de verdad llega al navegador;
 *   - el navegador ya cargado: atributos del documento, localStorage y sessionStorage.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const PATRONES = [
  /data-piel/,
  /data-theme/,
  /prefers-color-scheme:\s*light/,
  /modo\s+claro/i,
  /tema-claro/,
  /theme-light/,
  /light-mode/,
  /piel-clara/,
  /toggle-tema/,
  /cambiar\s+tema/i,
];

const EXTENSIONES = /\.(mjs|js|php|css|html|json)$/;
const SALTAR = new Set(['node_modules', '.git', 'tmp', 'informes', 'generado']);

export function residuosEnDisco(raices) {
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
      let texto;
      try { texto = readFileSync(p, 'utf8'); } catch { continue; }
      for (const re of PATRONES) {
        if (re.test(texto)) hallazgos.push(`${path.relative(raiz, p)} :: ${re.source}`);
      }
    }
  };
  for (const r of raices) rec(r, r);
  return hallazgos;
}

export async function pruebasOscuro(informe, { pagina, servidor, raicesDisco = [], etiqueta = '' }) {
  const url = servidor.url;
  const suf = etiqueta ? ` (${etiqueta})` : '';
  informe.seccion('modo oscuro y residuos del modo claro' + suf);

  const enDisco = residuosEnDisco(raicesDisco);
  informe.comprueba('OSC-01', 'sin residuos del modo claro en fuentes ni en lo compilado' + suf,
    enDisco.length === 0, enDisco.slice(0, 5).join(' | '));

  const mirar = async (ruta, id, texto) => {
    await pagina.goto(url + ruta, { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(500);
    const r = await pagina.evaluate(() => {
      const raiz = document.documentElement;
      const cs = getComputedStyle(raiz);
      const cuerpo = getComputedStyle(document.body);
      const claves = (almacen) => { try { return Object.keys(almacen); } catch { return ['(sin acceso)']; } };
      return {
        dataTheme: raiz.getAttribute('data-theme'),
        dataPiel: raiz.getAttribute('data-piel'),
        colorScheme: cs.colorScheme,
        fondo: cuerpo.backgroundColor,
        color: cuerpo.color,
        controles: document.querySelectorAll('[data-tema],[class*="tema-claro"],[id*="tema-claro"],[aria-label*="tema"]').length,
        local: claves(localStorage),
        sesion: claves(sessionStorage),
      };
    });
    const claro = /^rgb\((2[0-9]{2}|1[89][0-9]),/.test(r.fondo);
    informe.comprueba(id, texto + suf,
      !r.dataTheme && !r.dataPiel && r.controles === 0 && !claro,
      JSON.stringify(r));
    const clavesTema = [...r.local, ...r.sesion].filter((k) => /tema|theme|piel|claro|dark|light/i.test(k));
    informe.comprueba(id + 'b', `sin claves de tema en el navegador${suf}`,
      clavesTema.length === 0, clavesTema.join(', '));
    return r;
  };

  await mirar('/admin/?t=marca', 'OSC-02', 'el panel es oscuro y no hay interruptor de tema');
  await mirar('/', 'OSC-03', 'la carta es oscura y no hay interruptor de tema');
  return informe;
}
