/* Matriz de anchos del panel — DOM de SocialCard/MISE-B (siete pantallas, navegación por
 * `[data-tab]`, panes por `data-pane`). Lo que se mira no es «se ve bien» —eso no lo dice una
 * máquina— sino lo objetivo: que no haya barra horizontal, que la pantalla pedida sea la que se
 * abre, que sigan existiendo los siete paneles, y que no aparezcan errores de consola ni
 * peticiones rotas por el camino.
 *
 * El modo oscuro y su persistencia viven en `oscuro.mjs`, que se llama desde aquí para que una
 * sola pasada cubra las dos cosas.
 */
const ANCHOS = [320, 390, 768, 1280, 1920];
const PANTALLAS = ['platos', 'ofertas', 'juego', 'publicidad', 'datos', 'marca', 'ajustes'];

export async function pruebasResponsive(informe, { pagina, servidor, etiqueta = '' }) {
  const url = servidor.url;
  const suf = etiqueta ? ` (${etiqueta})` : '';
  informe.seccion('anchos del panel' + suf);

  pagina.limpiarRegistro();
  for (const ancho of ANCHOS) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const problemas = [];
    for (const t of PANTALLAS) {
      await pagina.goto(`${url}/admin/index.php?t=${t}`, { waitUntil: 'domcontentloaded' });
      await pagina.waitForTimeout(140);
      const r = await pagina.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        cliente: document.documentElement.clientWidth,
        paneles: document.querySelectorAll('section.pane').length,
        visible: (document.querySelector('section.pane:not([hidden])') || { dataset: {} }).dataset.pane,
        navegacion: document.querySelectorAll('#adm-sidebar [data-tab]').length,
        tema: !!document.getElementById('adm-tema-sw'),
      }));
      if (r.scroll > r.cliente + 1) problemas.push(`${t}: desborda ${r.scroll}>${r.cliente}`);
      if (r.paneles !== 7) problemas.push(`${t}: ${r.paneles} paneles`);
      if (r.visible !== t) problemas.push(`${t}: abre ${r.visible}`);
      if (r.navegacion !== 7) problemas.push(`${t}: ${r.navegacion} destinos en la barra lateral`);
      if (!r.tema) problemas.push(`${t}: sin interruptor de tema`);
    }
    informe.comprueba(`RSP-${ancho}`, `${ancho} px: sin desborde y con las siete pantallas${suf}`,
      problemas.length === 0, problemas.join(' | '));
  }
  await pagina.setViewportSize({ width: 1280, height: 900 });

  informe.seccion('interaccion, foco y teclado' + suf);

  /* Foco visible: el anillo tiene que verse. Se mide tras la transición. */
  await pagina.goto(url + '/admin/?t=marca', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  const foco = await pagina.evaluate(async () => {
    const el = document.querySelector('#marca-nombre') || document.querySelector('input[type="text"]');
    if (!el) return null;
    el.focus();
    await new Promise((r) => setTimeout(r, 600));
    const cs = getComputedStyle(el);
    return { sombra: cs.boxShadow, contorno: `${cs.outlineStyle} ${cs.outlineWidth}`, activo: document.activeElement === el };
  });
  informe.comprueba('RSP-FOCO', 'el foco de un campo se ve' + suf,
    !!foco && foco.activo && (foco.sombra !== 'none' || !/none/.test(foco.contorno)), JSON.stringify(foco));

  /* Teclado: el tabulador llega a un control. */
  await pagina.evaluate(() => document.body.focus());
  await pagina.keyboard.press('Tab');
  await pagina.waitForTimeout(150);
  const focoTras = await pagina.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.id ? '#' + a.id : ''}` : 'ninguno'; });
  informe.comprueba('RSP-TAB', 'el tabulador mueve el foco a un control' + suf, focoTras !== 'ninguno' && focoTras !== 'BODY', focoTras);

  /* Ayudas: abren y cierran con Escape (en Ofertas hay una). */
  await pagina.goto(url + '/admin/?t=ofertas', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  const ayuda = await pagina.evaluate(() => {
    const b = [...document.querySelectorAll('.adm-ayuda-b')].find((x) => x.getBoundingClientRect().width > 0);
    if (!b) return null;
    b.click();
    return !!document.querySelector('.adm-globo');
  });
  if (ayuda !== null) {
    await pagina.waitForTimeout(200);
    await pagina.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await pagina.waitForTimeout(200);
    const cerrada = await pagina.evaluate(() => !document.querySelector('.adm-globo'));
    informe.comprueba('RSP-AYUDA', 'las ayudas abren y cierran con Escape' + suf, ayuda && cerrada, `abierta=${ayuda} cerrada=${cerrada}`);
  } else {
    informe.blocked('RSP-AYUDA', 'ayudas del panel' + suf, 'no habia ningun boton de ayuda visible');
  }

  /* Control deshabilitado: que exista y se distinga (si aparece alguno). */
  const deshabilitado = await pagina.evaluate(() => {
    const d = document.querySelector('button[disabled], input[disabled]');
    if (!d) return null;
    const cs = getComputedStyle(d);
    return { opacidad: cs.opacity, cursor: cs.cursor };
  });
  if (deshabilitado) {
    informe.comprueba('RSP-DIS', 'un control deshabilitado se distingue' + suf,
      Number(deshabilitado.opacidad) < 1 || deshabilitado.cursor !== 'pointer', JSON.stringify(deshabilitado));
  } else {
    informe.blocked('RSP-DIS', 'control deshabilitado' + suf, 'no habia ninguno en pantalla');
  }

  informe.seccion('consola, red y avisos de PHP' + suf);
  const consola = pagina.registro.consola.filter((l) => !/Failed to load resource/i.test(l));
  informe.comprueba('RSP-CONSOLA', 'sin errores de consola en toda la matriz' + suf, consola.length === 0, consola.slice(0, 3).join(' | '));
  informe.comprueba('RSP-RED', 'sin peticiones fallidas en toda la matriz' + suf,
    pagina.registro.fallidas.length === 0, pagina.registro.fallidas.slice(0, 3).join(' | '));
  const avisos = servidor.avisos();
  informe.comprueba('RSP-PHP', 'sin avisos de PHP en toda la matriz' + suf, avisos.length === 0, avisos.slice(0, 3).join(' | '));
  return informe;
}
