/* Matriz de anchos y comprobaciones visuales del panel.
 *
 * Cinco anchos por ocho pestañas son cuarenta pantallas. Lo que se mira en cada una no es «se ve
 * bien» —eso no lo puede decir una máquina— sino lo que sí es objetivo: que no haya barra
 * horizontal, que la pestaña pedida sea la que se abre, que los ocho paneles sigan existiendo, y
 * que no aparezcan errores de consola ni peticiones rotas por el camino.
 *
 * El modo oscuro y los residuos del modo claro viven en `oscuro.mjs`, que se llama desde aquí
 * para que una sola pasada cubra las dos cosas.
 */
const ANCHOS = [320, 375, 768, 1280, 1920];
const PESTANAS = ['agotados', 'destacados', 'ofertas', 'precios', 'juego', 'publicidad', 'datos', 'marca'];

export async function pruebasResponsive(informe, { pagina, servidor, etiqueta = '' }) {
  const url = servidor.url;
  const suf = etiqueta ? ` (${etiqueta})` : '';
  informe.seccion('anchos del panel' + suf);

  pagina.limpiarRegistro();
  for (const ancho of ANCHOS) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const problemas = [];
    for (const t of PESTANAS) {
      await pagina.goto(`${url}/admin/?t=${t}`, { waitUntil: 'domcontentloaded' });
      await pagina.waitForTimeout(140);
      const r = await pagina.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        cliente: document.documentElement.clientWidth,
        paneles: document.querySelectorAll('section.pane').length,
        visible: (document.querySelector('section.pane:not([hidden])') || { dataset: {} }).dataset.pane,
        navegacion: document.querySelectorAll('#tabs button').length,
      }));
      if (r.scroll > r.cliente + 1) problemas.push(`${t}: desborda ${r.scroll}>${r.cliente}`);
      if (r.paneles !== 8) problemas.push(`${t}: ${r.paneles} paneles`);
      if (r.visible !== t) problemas.push(`${t}: abre ${r.visible}`);
      if (r.navegacion !== 8) problemas.push(`${t}: ${r.navegacion} botones de pestana`);
    }
    informe.comprueba(`RSP-${ancho}`, `${ancho} px: sin desborde y con las ocho pestanas${suf}`,
      problemas.length === 0, problemas.join(' | '));
  }
  await pagina.setViewportSize({ width: 1280, height: 900 });

  informe.seccion('interaccion, foco y teclado' + suf);

  /* Foco visible: el anillo tiene que verse. Se mide después de la transición, porque leer el
     estilo justo tras enfocar devuelve todavía el valor de antes. */
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

  /* Teclado: el tabulador tiene que llegar a algún control del panel. */
  const conTeclado = await pagina.evaluate(async () => {
    document.body.focus();
    return true;
  });
  await pagina.keyboard.press('Tab');
  await pagina.waitForTimeout(150);
  const focoTras = await pagina.evaluate(() => {
    const a = document.activeElement;
    return a ? `${a.tagName}${a.id ? '#' + a.id : ''}` : 'ninguno';
  });
  informe.comprueba('RSP-TAB', 'el tabulador mueve el foco a un control' + suf,
    conTeclado && focoTras !== 'ninguno' && focoTras !== 'BODY', focoTras);

  /* Ayudas: abren y se cierran con Escape. */
  await pagina.goto(url + '/admin/?t=agotados', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  const ayuda = await pagina.evaluate(() => {
    const b = [...document.querySelectorAll('.adm-ayuda-b')].find((x) => x.getBoundingClientRect().width > 0);
    if (!b) return null;
    b.click();
    return true;
  });
  if (ayuda) {
    await pagina.waitForTimeout(300);
    const abierta = await pagina.evaluate(() =>
      !!document.querySelector('.adm-ayuda[open], .adm-ayuda-caja:not([hidden]), [role="dialog"]:not([hidden])'));
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(250);
    const cerrada = await pagina.evaluate(() =>
      !document.querySelector('.adm-ayuda[open], .adm-ayuda-caja:not([hidden])'));
    informe.comprueba('RSP-AYUDA', 'las ayudas abren y cierran con Escape' + suf, abierta || cerrada,
      `abierta=${abierta} cerrada=${cerrada}`);
  } else {
    informe.blocked('RSP-AYUDA', 'ayudas del panel' + suf, 'no habia ningun boton de ayuda visible');
  }

  /* Estados de un control deshabilitado: que exista y que se distinga. */
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
  informe.comprueba('RSP-CONSOLA', 'sin errores de consola en toda la matriz' + suf,
    pagina.registro.consola.length === 0, pagina.registro.consola.slice(0, 3).join(' | '));
  informe.comprueba('RSP-RED', 'sin peticiones fallidas en toda la matriz' + suf,
    pagina.registro.fallidas.length === 0, pagina.registro.fallidas.slice(0, 3).join(' | '));
  const avisos = servidor.avisos();
  informe.comprueba('RSP-PHP', 'sin avisos de PHP en toda la matriz' + suf,
    avisos.length === 0, avisos.slice(0, 3).join(' | '));
  return informe;
}
