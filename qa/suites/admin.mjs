/* La matriz funcional del panel, con interacciones reales.
 *
 * Nada de POST a pelo cuando existe el control: se pulsa donde pulsaría una persona. Sólo se
 * baja a `fetch` para lo que un navegador no puede montar por la interfaz —un CSRF inventado, un
 * `dia[]` repetido, un plato que la interfaz no deja tocar— y eso está dicho en cada sitio.
 *
 * FASE A (2026-09-08): reescrita contra el panel MISE-B + SocialCard. La versión anterior
 * buscaba `#tabs button`, ocho pestañas, `label.adm-agrow-marca`, `#hl-q` y un botón «Guardar»
 * por formulario: nada de eso existe desde MISE-B (7 pantallas, navegación `[data-tab]`,
 * interruptores `.adm-sw`, autoguardado). La suite estaba en rojo sin que nadie lo supiera —
 * defecto de la propia batería, no del producto.
 *
 * Este fichero se queda con lo que otras suites importan (`entrarAlPanel`, `leerEstado`,
 * `pruebasAdmin`, `pruebasSuperadmin`) y con la matriz corta; la batería exhaustiva de la Fase A
 * vive en `admin-e2e.mjs` y usa estos mismos ayudantes.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { CLAVE_QA } from '../lib/clientes.mjs';

/* Las siete pantallas del panel, en el orden del catálogo de destinos ($PESTANAS). Juego,
   Publicidad y Analítica dependen de la capacidad del cliente; Tinge las tiene todas. */
export const PANTALLAS = ['platos', 'ofertas', 'juego', 'publicidad', 'datos', 'marca', 'ajustes'];

/* Entra al panel. Devuelve las pantallas que ofrece la navegación (sin repetir: el mismo destino
   está en la barra lateral, en la barra inferior y en la hoja «Más»). */
export async function entrarAlPanel(pagina, url, clave = CLAVE_QA) {
  await pagina.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  /* Cliente sin activacionPanel (Tinge): la primera visita ofrece poner contraseña. */
  if (await pagina.$('input[name="nueva"]')) {
    await pagina.fill('input[name="nueva"]', clave);
    await pagina.click('button[type="submit"]');
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(200);
  }
  if (await pagina.$('#clave')) {
    await pagina.fill('#clave', clave);
    await pagina.click('button[type="submit"]');
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.waitForTimeout(250);
  }
  return pestanasVisibles(pagina);
}

export function pestanasVisibles(pagina) {
  return pagina.evaluate(() => {
    const vistas = new Set();
    document.querySelectorAll('[data-tab]').forEach((b) => vistas.add(b.dataset.tab));
    return [...vistas];
  });
}

export function leerEstado(docroot) {
  const p = path.join(docroot, 'estado.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

/* Abre una pantalla por URL, que es lo que decide en el servidor qué tira de acciones se enseña
   (`[data-tab].on` -> tiraDe()). Cambiar de pantalla por JavaScript sin recargar es otra prueba
   distinta y se hace aparte. */
export async function irA(pagina, url, pantalla, espera = 300) {
  await pagina.goto(`${url}/admin/index.php?t=${pantalla}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(espera);
}

/* El botón «Guardar cambios» de la tira de acciones de esa pantalla. Pulsa el que se ve; si la
   tira no está visible (pantalla abierta por JavaScript) lo pulsa igualmente por DOM: es el mismo
   <button form="..."> y el navegador envía el mismo formulario. */
export async function guardar(pagina, formulario) {
  /* Se envía el formulario por fetch construyendo su payload igual que un submit nativo
     (FormData del propio <form> —incluye los campos enganchados por form="..."— más el nombre
     del botón que dispara la acción). Se hace así por dos razones medidas:
       · el toast de la página lo pinta un <script> al cargar y se disuelve solo, leerlo del DOM
         es una carrera; la RESPUESTA del POST trae ese mismo `toast("...", 'ok'|'bad')`;
       · un submit nativo lo bloquea la validación HTML5 de un `type="url"` con valor inválido
         (marca-form), sin dar aviso; el fetch envía exactamente lo que el usuario dejó escrito.
     Después se recarga la página para que el DOM refleje lo guardado (el fetch no navega). */
  const r = await pagina.evaluate(async (formId) => {
    const form = document.getElementById(formId);
    const fd = form ? new FormData(form) : new FormData();
    const btn = document.querySelector(`.adm-btn-guardar[form="${formId}"][name]`) || document.querySelector(`button[form="${formId}"][name][type="submit"]`);
    if (btn && btn.name && !fd.has(btn.name)) fd.set(btn.name, btn.value || '1');
    const resp = await fetch(location.pathname + location.search, { method: 'POST', body: fd, credentials: 'same-origin' });
    const t = await resp.text();
    const m = /toast\(\s*("(?:[^"\\]|\\.)*")\s*,\s*'(ok|bad)'/.exec(t);
    let mensaje = '';
    if (m) { try { mensaje = JSON.parse(m[1]); } catch { /* sin mensaje */ } }
    return { status: resp.status, mensaje };
  }, formulario);
  await pagina.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await pagina.waitForTimeout(200);
  return r.mensaje;
}

/* El último aviso: el toast si lo hay, si no el mensaje del servidor pintado en la página. */
export async function textoAvisoPanel(pagina) {
  return pagina.evaluate(() => {
    const t = document.querySelector('#toasts');
    if (t && t.innerText.trim()) return t.innerText.trim().split('\n').filter(Boolean).slice(0, 3).join(' | ');
    const m = document.querySelector('.msg');
    if (m && m.innerText.trim()) return m.innerText.trim().slice(0, 240);
    /* El servidor deja el mensaje escrito en el <script> que sigue a #toasts. */
    const s = t ? t.nextElementSibling : null;
    if (s && s.tagName === 'SCRIPT') {
      const x = /toast\(\s*("(?:[^"\\]|\\.)*")/.exec(s.textContent);
      if (x) { try { return JSON.parse(x[1]); } catch { /* sigue */ } }
    }
    return '';
  });
}

/* POST directo desde la propia página, con su cookie de sesión. Se usa sólo para lo que la
   interfaz no permite montar. Devuelve estado HTTP y el mensaje que trae la respuesta. */
export async function postCrudo(pagina, ruta, pares, { csrfValido = true, cabeceras = {} } = {}) {
  return pagina.evaluate(async ({ ruta, pares, csrfValido, cabeceras }) => {
    const c = document.querySelector('input[name="csrf"]');
    const csrf = csrfValido && c ? c.value : 'csrf-inventado-por-la-bateria';
    const fd = new URLSearchParams();
    fd.set('csrf', csrf);
    for (const [k, v] of pares) fd.append(k, v);
    const r = await fetch(ruta, {
      method: 'POST', body: fd,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...cabeceras },
      credentials: 'same-origin',
    });
    const t = await r.text();
    let mensaje = '';
    const m = /toast\(\s*("(?:[^"\\]|\\.)*")\s*,\s*'(ok|bad)'/.exec(t);
    if (m) { try { mensaje = JSON.parse(m[1]); } catch { /* sin mensaje */ } }
    return { status: r.status, mensaje, bytes: t.length, json: t.trim().startsWith('{') };
  }, { ruta, pares, csrfValido, cabeceras });
}

/* ---------------------------------------------------------------------------- la matriz corta
 * Lo que `full` y `weekly` ejecutan desde siempre. La cobertura exhaustiva es admin-e2e.mjs. */
export async function pruebasAdmin(informe, ctx) {
  const { pagina, servidor, docroot, etiqueta = '' } = ctx;
  const url = servidor.url;
  const suf = etiqueta ? ` (${etiqueta})` : '';

  informe.seccion('panel: acceso y sesion' + suf);
  const pestanas = await entrarAlPanel(pagina, url);
  informe.comprueba('ADM-01', 'se entra al panel y estan las siete pantallas en la navegacion' + suf,
    pestanas.length === 7 && PANTALLAS.every((p) => pestanas.includes(p)), pestanas.join(','));
  informe.comprueba('ADM-02', 'los siete paneles existen en el HTML' + suf,
    await pagina.evaluate(() => document.querySelectorAll('section.pane').length) === 7);
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  informe.comprueba('ADM-03', 'la sesion sobrevive a una recarga' + suf,
    await pagina.evaluate(() => !document.querySelector('#clave')));

  informe.seccion('panel: agotados (autoguardado)' + suf);
  await irA(pagina, url, 'platos');
  const claves = await pagina.evaluate(() =>
    [...document.querySelectorAll('input[name="agotado[]"]')].slice(0, 2).map((i) => i.value));
  for (const k of claves) {
    await pagina.evaluate((v) => {
      const cb = document.querySelector(`input[name="agotado[]"][value="${CSS.escape(v)}"]`);
      cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    }, k);
    await pagina.waitForTimeout(700);
  }
  await pagina.waitForTimeout(600);
  const marcados = Object.keys(leerEstado(docroot)?.soldOut || {});
  informe.comprueba('ADM-04', 'marcar agotado autoguarda y persiste' + suf,
    claves.every((k) => marcados.includes(k)), `estado: ${marcados.length} claves`);
  informe.comprueba('ADM-05', 'el estado guarda tambien las filas hermanas del mismo plato' + suf,
    marcados.length >= claves.length, marcados.slice(0, 4).join(' | '));
  /* Se deja como se encontró: los dos desmarcados. */
  for (const k of claves) {
    await pagina.evaluate((v) => {
      const cb = document.querySelector(`input[name="agotado[]"][value="${CSS.escape(v)}"]`);
      cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true }));
    }, k);
    await pagina.waitForTimeout(700);
  }
  await pagina.waitForTimeout(600);

  informe.seccion('panel: destacados' + suf);
  await irA(pagina, url, 'platos');
  const platoDest = await pagina.evaluate(() => {
    const b = document.querySelector('.adm-plato-destbtn');
    if (!b) return null;
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return b.dataset.k;
  });
  await pagina.waitForTimeout(300);
  let anadido = false;
  if (platoDest) {
    const hayEtiquetas = await pagina.evaluate(() => {
      const f = document.getElementById('dest-et');
      return f && !f.hidden && f.querySelectorAll('.adm-destet-b').length > 0;
    });
    if (hayEtiquetas) {
      await pagina.evaluate(() => document.querySelector('#dest-et .adm-destet-b').click());
      await pagina.waitForLoadState('networkidle').catch(() => {});
      await pagina.waitForTimeout(400);
      anadido = !!(leerEstado(docroot)?.tags || {})[platoDest];
    }
  }
  informe.comprueba('ADM-06', 'destacar un plato desde su fila guarda la etiqueta' + suf, anadido,
    platoDest ? `plato ${platoDest}` : 'no habia boton Destacar');

  const antesTags = JSON.stringify(leerEstado(docroot)?.tags || {});
  await postCrudo(pagina, '/admin/index.php?t=platos',
    [['destacado_add', '1'], ['hl_key', platoDest || 'x'], ['hl_label', 'Etiqueta inventada por QA']]);
  informe.comprueba('ADM-07', 'una etiqueta fuera del catalogo no se guarda' + suf,
    JSON.stringify(leerEstado(docroot)?.tags || {}) === antesTags);

  if (anadido) {
    await irA(pagina, url, 'platos');
    const quitado = await pagina.evaluate((k) => {
      const b = document.querySelector(`button[name="destacado_del"][value="${CSS.escape(k)}"]`);
      if (!b) return false;
      b.click();
      return true;
    }, platoDest);
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.waitForTimeout(400);
    informe.comprueba('ADM-08', 'quitar destacado' + suf,
      quitado && !(leerEstado(docroot)?.tags || {})[platoDest]);
  } else {
    informe.fail('ADM-08', 'quitar destacado' + suf, 'no se llego a anadir ninguno');
  }

  informe.seccion('panel: ofertas (autoguardado)' + suf);
  await irA(pagina, url, 'ofertas');
  const antesOferta = leerEstado(docroot)?.offer || {};
  const r1 = await postCrudo(pagina, '/admin/index.php?t=ofertas', [['oferta_pct_guardar', '1'], ['pct', '20']]);
  const r2 = await postCrudo(pagina, '/admin/index.php?t=ofertas', [['oferta_pct_guardar', '1'], ['pct', '95']]);
  const oferta = leerEstado(docroot)?.offer || {};
  informe.comprueba('ADM-09', 'el porcentaje autoguarda con 200 y persiste' + suf,
    r1.status === 200 && oferta.percent === 20, `status ${r1.status} | percent=${oferta.percent}`);
  informe.comprueba('ADM-10', 'un descuento fuera de 1-90 devuelve 422 y no se guarda' + suf,
    r2.status === 422 && oferta.percent === 20, `status ${r2.status} | ${r2.mensaje}`);
  if (antesOferta.percent && antesOferta.percent !== 20) {
    await postCrudo(pagina, '/admin/index.php?t=ofertas', [['oferta_pct_guardar', '1'], ['pct', String(antesOferta.percent)]]);
  }

  informe.seccion('panel: precios' + suf);
  await irA(pagina, url, 'platos');
  await pagina.click('button.adm-pct[name="subir"][value="5"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(400);
  const hayCampos = await pagina.evaluate(() => document.querySelectorAll('.adm-f-ptab input[name^="precio["]').length);
  informe.comprueba('ADM-11', 'el atajo +5% abre la lista con los precios propuestos' + suf, hayCampos > 0, `${hayCampos} campos`);
  const avisoPrecios = await guardar(pagina, 'precios-form');
  const precios = leerEstado(docroot)?.prices || {};
  informe.comprueba('ADM-12', 'publicar precios persiste' + suf,
    Object.keys(precios).length > 0, `${avisoPrecios} | ${Object.keys(precios).length} claves`);

  await irA(pagina, url, 'platos');
  const manual = await pagina.$('button[name="precios_manual"]');
  if (manual) {
    await manual.click();
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.waitForTimeout(350);
    informe.comprueba('ADM-13', 'el modo manual abre la lista sin aplicar porcentaje' + suf,
      await pagina.evaluate(() => document.querySelectorAll('.adm-f-ptab input[name^="precio["]').length) > 0);
  } else {
    informe.fail('ADM-13', 'modo manual de precios' + suf, 'no se encontro el boton');
  }
  /* Se devuelven los precios a los de la carta: las pruebas de despues cuentan con ello. */
  await postCrudo(pagina, '/admin/index.php?t=platos', [['precios_reset', '1']]);

  informe.seccion('panel: juego, publicidad y marca' + suf);
  await irA(pagina, url, 'juego');
  const juegoAntes = leerEstado(docroot)?.game?.on;
  await pagina.evaluate(() => { const c = document.querySelector('input[name="juego_on"]'); c.checked = !c.checked; });
  const avisoJuego = await guardar(pagina, 'juego-form');
  informe.comprueba('ADM-14', 'el interruptor del juego cambia y persiste' + suf,
    leerEstado(docroot)?.game?.on !== juegoAntes, `${avisoJuego} | antes=${juegoAntes}`);

  await irA(pagina, url, 'publicidad');
  if (ctx.fixtures && ctx.fixtures['banner-1120x480.png']) {
    await pagina.setInputFiles('#pub_img', ctx.fixtures['banner-1120x480.png']);
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.waitForTimeout(900);
    const img = leerEstado(docroot)?.publicidad?.banner?.img;
    informe.comprueba('ADM-15', 'subir la imagen del banner' + suf, !!img, String(img));
  } else {
    informe.fail('ADM-15', 'subir la imagen del banner' + suf, 'sin fixture');
  }
  await irA(pagina, url, 'publicidad');
  await pagina.fill('input[name="pub_url"]', 'https://ejemplo.invalido/promo-qa');
  await pagina.evaluate(() => {
    document.getElementById('pub-inicio').value = '2026-01-01T00:00';
    document.getElementById('pub-fin').value = '2030-12-31T23:59';
    const c = document.querySelector('input[name="pub_on"]'); if (c) c.checked = true;
  });
  const avisoPub = await guardar(pagina, 'pub-form');
  informe.comprueba('ADM-16', 'guardar publicidad con fechas' + suf,
    leerEstado(docroot)?.publicidad?.banner?.on === true, avisoPub);
  await irA(pagina, url, 'publicidad');
  await pagina.evaluate(() => {
    document.getElementById('pub-inicio').value = '2030-12-01T10:00';
    document.getElementById('pub-fin').value = '2030-11-01T10:00';
  });
  const avisoFechas = await guardar(pagina, 'pub-form');
  informe.comprueba('ADM-17', 'fin anterior al inicio se rechaza' + suf,
    /DESPUES del inicio/i.test(avisoFechas), avisoFechas);

  await irA(pagina, url, 'marca');
  await pagina.fill('#marca-rotulo', 'Ñandú, José y Müller');
  await pagina.fill('#color-principal-hex', '#4FA3D1');
  await pagina.fill('#op-url', 'https://ejemplo.invalido/resenas');
  await pagina.fill('#op-nota', '4,6');
  await pagina.fill('#op-cuantas', '128');
  await pagina.fill('#red-whatsapp', '+34600111222');
  await pagina.fill('#red-instagram', 'https://instagram.com/qa');
  await pagina.evaluate(() => { const c = document.querySelector('input[name="op_on"]'); if (c) c.checked = true; });
  const avisoMarca = await guardar(pagina, 'marca-form');
  const marca = leerEstado(docroot) || {};
  informe.comprueba('ADM-18', 'guardar marca con acentos, color, resenas y redes' + suf,
    marca.marca?.colorPrincipal === '#4FA3D1'
    && /Ñandú/.test(marca.marca?.rotuloVisible || '')
    && marca.reviews?.on === true
    && marca.social?.whatsapp === '34600111222',
    `${avisoMarca} | ${JSON.stringify(marca.marca)} ${JSON.stringify(marca.social).slice(0, 80)}`);

  informe.seccion('panel: analitica, copias y descargas' + suf);
  await irA(pagina, url, 'datos', 400);
  const textoDatos = await pagina.evaluate(() =>
    (document.querySelector('section.pane[data-pane="datos"]') || document.body).innerText.trim().slice(0, 120));
  informe.comprueba('ADM-19', 'la pantalla Analitica pinta algo coherente' + suf,
    textoDatos.length > 10, textoDatos.replace(/\n+/g, ' '));

  await irA(pagina, url, 'ajustes', 400);
  const copias = await pagina.evaluate(() =>
    [...document.querySelectorAll('button[name="restaurar_copia"]')].map((b) => b.value));
  informe.comprueba('ADM-20', 'las copias de precios aparecen listadas en Ajustes' + suf, copias.length > 0, copias.join(', '));
  const descarga = copias.length
    ? await postCrudo(pagina, '/admin/index.php', [['descargar_copia', copias[0]]])
    : { status: 0, json: false };
  informe.comprueba('ADM-21', 'descargar una copia devuelve su JSON' + suf, descarga.status === 200 && descarga.json, JSON.stringify(descarga));
  const descargaEstado = await postCrudo(pagina, '/admin/index.php', [['descargar_estado', '1']]);
  informe.comprueba('ADM-22', 'descargar el estado devuelve su JSON' + suf, descargaEstado.status === 200 && descargaEstado.json, JSON.stringify(descargaEstado));

  informe.seccion('panel: CSRF' + suf);
  const juegoPrevio = leerEstado(docroot)?.game?.on;
  await irA(pagina, url, 'juego');
  const rc = await postCrudo(pagina, '/admin/index.php?t=juego', [['guardar_juego', '1']], { csrfValido: false });
  informe.comprueba('ADM-23', 'un POST con csrf invalido devuelve 403 y no cambia el estado' + suf,
    rc.status === 403 && leerEstado(docroot)?.game?.on === juegoPrevio,
    `status ${rc.status} | antes=${juegoPrevio} despues=${leerEstado(docroot)?.game?.on}`);

  informe.seccion('panel: salida' + suf);
  await pagina.goto(url + '/admin/?salir=1', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  informe.comprueba('ADM-24', 'salir devuelve a la pantalla de acceso' + suf,
    await pagina.evaluate(() => !!document.querySelector('#clave')));
  await pagina.fill('#clave', 'esta-no-es-la-clave');
  await pagina.click('button[type="submit"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(300);
  informe.comprueba('ADM-25', 'una clave incorrecta no entra' + suf,
    await pagina.evaluate(() => !!document.querySelector('#clave') && /incorrecta/i.test(document.body.innerText)));
  await entrarAlPanel(pagina, url);

  informe.seccion('panel: avisos de PHP' + suf);
  const avisos = servidor.avisos();
  informe.comprueba('ADM-26', 'ningun aviso ni error de PHP durante la bateria' + suf,
    avisos.length === 0, avisos.slice(0, 3).join(' | '));

  return informe;
}

/* Superadministrador: entra por la misma casilla que el restaurante. Se prueba en su propio
   servidor para no dejar una sesión con más permisos abierta. */
export async function pruebasSuperadmin(informe, { pagina, servidor, docroot, clave }) {
  informe.seccion('panel: superadministrador');
  await pagina.goto(servidor.url + '/admin/?salir=1', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(200);
  await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(200);
  if (await pagina.$('input[name="nueva"]')) {
    await pagina.fill('input[name="nueva"]', CLAVE_QA);
    await pagina.click('button[type="submit"]');
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(250);
  }
  if (!(await pagina.$('#clave'))) {
    informe.fail('ADM-30', 'entrar como superadministrador', 'el panel no pidio contrasena');
    return informe;
  }
  await pagina.fill('#clave', clave);
  await pagina.click('button[type="submit"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(350);
  await irA(pagina, servidor.url, 'ajustes');
  const esSuper = await pagina.evaluate(() => !!document.querySelector('input[name="reset_cliente"]'));
  informe.comprueba('ADM-30', 'la clave del super abre la sesion de superadministrador', esSuper);
  if (!esSuper) return informe;

  const claveNueva = 'clave-cliente-qa-9876';
  const r = await postCrudo(pagina, '/admin/index.php', [['reset_cliente', '1'], ['cliente_nueva', claveNueva]]);
  const clavePhp = path.join(docroot, 'admin', 'clave.php');
  informe.comprueba('ADM-31', 'el super restablece la contrasena del restaurante',
    r.status === 200 && existsSync(clavePhp), `status ${r.status}`);

  const corta = await postCrudo(pagina, '/admin/index.php', [['reset_cliente', '1'], ['cliente_nueva', 'corta']]);
  informe.comprueba('ADM-32', 'una contrasena corta se rechaza tambien desde el super',
    /8 caracteres|al menos 8/.test(corta.mensaje), corta.mensaje);

  const claveSuperNueva = 'clave-super-qa-nueva-8765';
  const hayCambio = await pagina.evaluate(() => !!document.querySelector('input[name="cambiar_super"]'));
  if (!hayCambio) {
    informe.fail('ADM-33', 'cambiar la clave del propio superadministrador',
      'no aparece el formulario: el hash vive en la variable de entorno del hosting');
  } else {
    const mal = await postCrudo(pagina, '/admin/index.php',
      [['cambiar_super', '1'], ['super_actual', 'esta-no-es-la-actual'], ['super_nueva', claveSuperNueva]]);
    const bien = await postCrudo(pagina, '/admin/index.php',
      [['cambiar_super', '1'], ['super_actual', clave], ['super_nueva', claveSuperNueva]]);
    informe.comprueba('ADM-33', 'una clave actual equivocada no cambia la del super',
      /no es correcta|incorrecta/i.test(mal.mensaje) && bien.status === 200, JSON.stringify({ mal, bien }));
    await pagina.goto(servidor.url + '/admin/?salir=1', { waitUntil: 'domcontentloaded' });
    await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(250);
    if (await pagina.$('#clave')) {
      await pagina.fill('#clave', claveSuperNueva);
      await pagina.click('button[type="submit"]');
      await pagina.waitForLoadState('networkidle').catch(() => {});
      await pagina.waitForTimeout(350);
    }
    await irA(pagina, servidor.url, 'ajustes');
    informe.comprueba('ADM-34', 'la clave nueva del super abre su sesion',
      await pagina.evaluate(() => !!document.querySelector('input[name="reset_cliente"]')));
  }
  return informe;
}
