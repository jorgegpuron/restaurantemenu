/* La matriz funcional del panel, con interacciones reales.
 *
 * Nada de POST a pelo cuando existe el control: se pulsa donde pulsaría una persona. Sólo se
 * baja a `fetch` para lo que un navegador no puede montar por la interfaz —un CSRF inventado, un
 * `dia[]` repetido— y eso está dicho en cada sitio donde pasa.
 *
 * Cada prueba deja el estado como lo encontró en lo que importa, o lo declara: el orden de las
 * pruebas no puede cambiar el resultado de la siguiente.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { clicVisible, abrirAcordeones, textoAviso } from '../lib/navegador.mjs';
import { CLAVE_QA } from '../lib/clientes.mjs';

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
  return pagina.evaluate(() => [...document.querySelectorAll('#tabs button')].map((b) => b.dataset.tab));
}

export function leerEstado(docroot) {
  const p = path.join(docroot, 'estado.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

async function guardar(pagina, formulario) {
  await pagina.click(`button[form="${formulario}"]`);
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(350);
  return textoAviso(pagina);
}

/* POST directo desde la propia página, con su cookie de sesión. Se usa sólo para lo que la
   interfaz no permite montar. Devuelve el estado leído del servidor después. */
async function postCrudo(pagina, ruta, pares, { csrfValido = true } = {}) {
  return pagina.evaluate(async ({ ruta, pares, csrfValido }) => {
    const csrf = csrfValido ? document.querySelector('input[name="csrf"]').value : 'csrf-inventado-por-la-bateria';
    const fd = new URLSearchParams();
    fd.set('csrf', csrf);
    for (const [k, v] of pares) fd.append(k, v);
    const r = await fetch(ruta, {
      method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return { status: r.status };
  }, { ruta, pares, csrfValido });
}

export async function pruebasAdmin(informe, ctx) {
  const { pagina, servidor, docroot, fixtures, etiqueta = '' } = ctx;
  const url = servidor.url;
  const suf = etiqueta ? ` (${etiqueta})` : '';

  informe.seccion('panel: acceso y sesion' + suf);
  const pestanas = await entrarAlPanel(pagina, url);
  informe.comprueba('ADM-01', 'se entra al panel y estan las ocho pestanas' + suf,
    pestanas.length === 8, pestanas.join(','));
  informe.comprueba('ADM-02', 'los ocho paneles existen en el HTML' + suf,
    await pagina.evaluate(() => document.querySelectorAll('section.pane').length) === 8);

  /* La sesión sobrevive a una recarga: si no, cada guardado pediría la clave otra vez. */
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  informe.comprueba('ADM-03', 'la sesion sobrevive a una recarga' + suf,
    await pagina.evaluate(() => !document.querySelector('#clave')));

  informe.seccion('panel: agotados' + suf);
  await pagina.goto(url + '/admin/', { waitUntil: 'domcontentloaded' });
  await abrirAcordeones(pagina, 'section.pane[data-pane="agotados"]');
  await pagina.waitForTimeout(200);
  const claves = await pagina.evaluate(() =>
    [...document.querySelectorAll('label.adm-agrow-marca input')].slice(0, 2).map((i) => i.value));
  await clicVisible(pagina, 'label.adm-agrow-marca', 0);
  await pagina.waitForTimeout(120);
  await clicVisible(pagina, 'label.adm-agrow-marca', 1);
  await pagina.waitForTimeout(120);
  const avisoAgotados = await guardar(pagina, 'agotados-form');
  const estadoAgotados = leerEstado(docroot);
  const marcados = Object.keys(estadoAgotados?.soldOut || {});
  informe.comprueba('ADM-04', 'guardar agotados avisa y persiste' + suf,
    /agotado/i.test(avisoAgotados) && claves.every((k) => marcados.includes(k)),
    `${avisoAgotados} | estado: ${marcados.length} claves`);
  informe.comprueba('ADM-05', 'el estado guarda la doble clave (id y legado)' + suf,
    marcados.length >= claves.length * 2 || marcados.some((k) => k.includes(' :: ')),
    marcados.slice(0, 4).join(' | '));

  informe.seccion('panel: destacados' + suf);
  await pagina.goto(url + '/admin/?t=destacados', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  const primerPlato = await pagina.evaluate(() => {
    const n = document.querySelector('section.pane[data-pane="agotados"] label.adm-agrow-marca input');
    return n ? n.value : '';
  });
  await pagina.fill('#hl-q', await pagina.evaluate(() => {
    const h = document.querySelector('section.pane[data-pane="agotados"] .dish-name, section.pane[data-pane="agotados"] h4, section.pane[data-pane="agotados"] .adm-agrow-nombre');
    return h ? h.textContent.trim().split('\n')[0].slice(0, 12) : 'a';
  }));
  await pagina.waitForTimeout(450);
  let anadido = false;
  const haySugerencia = await pagina.evaluate(() => !!document.querySelector('.adm-dest-add li'));
  if (haySugerencia) {
    await clicVisible(pagina, '.adm-dest-add li', 0);
    await pagina.waitForTimeout(200);
    await pagina.selectOption('#hl-label', { index: 2 }).catch(() => {});
    await pagina.click('button[name="destacado_add"]');
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.waitForTimeout(300);
    anadido = Object.keys(leerEstado(docroot)?.tags || {}).length > 0;
  }
  informe.comprueba('ADM-06', 'anadir destacado por el buscador' + suf, anadido,
    haySugerencia ? await textoAviso(pagina) : 'el buscador no ofrecio sugerencias');

  /* Etiqueta fuera del catálogo: la interfaz sólo ofrece las válidas, así que esto va por POST. */
  const antesTags = JSON.stringify(leerEstado(docroot)?.tags || {});
  await postCrudo(pagina, '/admin/index.php?t=destacados',
    [['destacado_add', '1'], ['hl_key', primerPlato || 'x'], ['hl_label', 'Etiqueta inventada por QA']]);
  informe.comprueba('ADM-07', 'una etiqueta fuera del catalogo no se guarda' + suf,
    JSON.stringify(leerEstado(docroot)?.tags || {}) === antesTags);

  if (anadido) {
    await pagina.goto(url + '/admin/?t=destacados', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(250);
    const hayQuitar = await pagina.$('button[name="destacado_del"]');
    if (hayQuitar) {
      await hayQuitar.click();
      await pagina.waitForLoadState('networkidle').catch(() => {});
      await pagina.waitForTimeout(300);
      informe.comprueba('ADM-08', 'quitar destacado' + suf,
        Object.keys(leerEstado(docroot)?.tags || {}).length === 0, await textoAviso(pagina));
    } else {
      informe.blocked('ADM-08', 'quitar destacado' + suf, 'no aparecio el boton de quitar');
    }
  } else {
    informe.blocked('ADM-08', 'quitar destacado' + suf, 'no se llego a anadir ninguno');
  }

  informe.seccion('panel: ofertas' + suf);
  await pagina.goto(url + '/admin/?t=ofertas', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  await pagina.fill('#of-pct', '20');
  await pagina.fill('#of-desde', '00:00');
  await pagina.fill('#of-hasta', '23:59');
  await pagina.evaluate(() => {
    document.querySelectorAll('input[name="dia[]"]').forEach((c) => { c.checked = true; });
    const cat = document.querySelector('input[name="cat[]"]');
    if (cat) cat.checked = true;
    const on = document.querySelector('input[name="oferta_on"]');
    if (on) on.checked = true;
  });
  const avisoOferta = await guardar(pagina, 'ofertas-form');
  const oferta = leerEstado(docroot)?.offer || {};
  informe.comprueba('ADM-09', 'guardar oferta encendida' + suf,
    oferta.on === true && oferta.percent === 20 && (oferta.cats || []).length > 0,
    `${avisoOferta} | ${JSON.stringify(oferta).slice(0, 140)}`);

  await pagina.goto(url + '/admin/?t=ofertas', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  await pagina.fill('#of-pct', '95');
  const avisoPct = await guardar(pagina, 'ofertas-form');
  informe.comprueba('ADM-10', 'un descuento fuera de 1-90 se rechaza con la oferta encendida' + suf,
    (leerEstado(docroot)?.offer?.percent) === 20,
    `${avisoPct} | percent=${leerEstado(docroot)?.offer?.percent}`);

  informe.seccion('panel: precios' + suf);
  await pagina.goto(url + '/admin/?t=precios', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  await pagina.click('button[name="subir"][value="5"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(400);
  const hayCampos = await pagina.evaluate(() => document.querySelectorAll('input[name^="precio["]').length);
  informe.comprueba('ADM-11', 'el atajo +5% abre la lista con los precios propuestos' + suf, hayCampos > 0, `${hayCampos} campos`);
  const avisoPrecios = await guardar(pagina, 'precios-form');
  const precios = leerEstado(docroot)?.prices || {};
  informe.comprueba('ADM-12', 'publicar precios persiste' + suf,
    Object.keys(precios).length > 0, `${avisoPrecios} | ${Object.keys(precios).length} claves`);

  /* «A mano, uno a uno»: abre la misma lista sin aplicar porcentaje. */
  await pagina.goto(url + '/admin/?t=precios', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  const manual = await pagina.$('button[name="precios_manual"]');
  if (manual) {
    await manual.click();
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.waitForTimeout(350);
    informe.comprueba('ADM-13', 'el modo manual abre la lista sin aplicar porcentaje' + suf,
      await pagina.evaluate(() => document.querySelectorAll('input[name^="precio["]').length) > 0);
  } else {
    informe.blocked('ADM-13', 'modo manual de precios' + suf, 'no se encontro el boton');
  }

  informe.seccion('panel: juego, publicidad y marca' + suf);
  await pagina.goto(url + '/admin/?t=juego', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  const juegoAntes = leerEstado(docroot)?.game?.on;
  await clicVisible(pagina, 'input[name="juego_on"] ~ *, label:has(input[name="juego_on"])', 0).catch(async () => {
    await pagina.evaluate(() => { const c = document.querySelector('input[name="juego_on"]'); c.checked = !c.checked; });
  });
  const avisoJuego = await guardar(pagina, 'juego-form');
  informe.comprueba('ADM-14', 'el interruptor del juego cambia y persiste' + suf,
    leerEstado(docroot)?.game?.on !== juegoAntes, `${avisoJuego} | antes=${juegoAntes}`);

  await pagina.goto(url + '/admin/?t=publicidad', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  if (fixtures['banner-1120x480.png']) {
    await pagina.setInputFiles('#pub_img', fixtures['banner-1120x480.png']);
    await pagina.waitForTimeout(900);
    const img = leerEstado(docroot)?.publicidad?.banner?.img;
    informe.comprueba('ADM-15', 'subir la imagen del banner' + suf, !!img, String(img));
  } else {
    informe.blocked('ADM-15', 'subir la imagen del banner' + suf, 'sin fixture');
  }
  await pagina.goto(url + '/admin/?t=publicidad', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  await pagina.fill('input[name="pub_url"]', 'https://ejemplo.invalido/promo-qa');
  await pagina.fill('#pub-inicio', '2026-01-01T00:00');
  await pagina.fill('#pub-fin', '2030-12-31T23:59');
  await pagina.evaluate(() => { const c = document.querySelector('input[name="pub_on"]'); if (c) c.checked = true; });
  const avisoPub = await guardar(pagina, 'pub-form');
  informe.comprueba('ADM-16', 'guardar publicidad con fechas' + suf,
    leerEstado(docroot)?.publicidad?.banner?.on === true, avisoPub);

  await pagina.goto(url + '/admin/?t=publicidad', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  await pagina.fill('#pub-inicio', '2030-12-01T10:00');
  await pagina.fill('#pub-fin', '2030-11-01T10:00');
  const avisoFechas = await guardar(pagina, 'pub-form');
  informe.comprueba('ADM-17', 'fin anterior al inicio se rechaza' + suf,
    /DESPUES del inicio/i.test(avisoFechas), avisoFechas);

  await pagina.goto(url + '/admin/?t=marca', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
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

  informe.seccion('panel: analitica, copias y marcador' + suf);
  await pagina.goto(url + '/admin/?t=datos', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(400);
  const textoDatos = await pagina.evaluate(() =>
    (document.querySelector('section.pane[data-pane="datos"]') || document.body).innerText.trim().slice(0, 120));
  informe.comprueba('ADM-19', 'la pestana Analitica pinta algo coherente' + suf,
    textoDatos.length > 10, textoDatos.replace(/\n+/g, ' '));

  await pagina.goto(url + '/admin/?t=marca', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(400);
  const copias = await pagina.evaluate(() =>
    [...document.querySelectorAll('button[name="restaurar_copia"]')].map((b) => b.value));
  informe.comprueba('ADM-20', 'las copias de precios aparecen listadas' + suf, copias.length > 0, copias.join(', '));
  const descarga = await pagina.evaluate(async () => {
    const b = document.querySelector('button[name="descargar_copia"]');
    if (!b) return 'sin copias';
    const csrf = document.querySelector('input[name="csrf"]').value;
    const fd = new URLSearchParams(); fd.set('csrf', csrf); fd.set('descargar_copia', b.value);
    const r = await fetch('/admin/index.php', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const t = await r.text();
    return r.status + ':' + (t.trim().startsWith('{') ? 'json' : t.slice(0, 40));
  });
  informe.comprueba('ADM-21', 'descargar una copia devuelve su JSON' + suf, /:json$/.test(descarga), descarga);
  const descargaEstado = await pagina.evaluate(async () => {
    const csrf = document.querySelector('input[name="csrf"]').value;
    const fd = new URLSearchParams(); fd.set('csrf', csrf); fd.set('descargar_estado', '1');
    const r = await fetch('/admin/index.php', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const t = await r.text();
    return r.status + ':' + (t.trim().startsWith('{') ? 'json' : t.slice(0, 40));
  });
  informe.comprueba('ADM-22', 'descargar el estado devuelve su JSON' + suf, /:json$/.test(descargaEstado), descargaEstado);

  informe.seccion('panel: CSRF' + suf);
  const juegoPrevio = leerEstado(docroot)?.game?.on;
  await pagina.goto(url + '/admin/?t=juego', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  await postCrudo(pagina, '/admin/index.php?t=juego',
    [['guardar_juego', '1']], { csrfValido: false });
  informe.comprueba('ADM-23', 'un POST con csrf invalido no cambia el estado' + suf,
    leerEstado(docroot)?.game?.on === juegoPrevio, `antes=${juegoPrevio} despues=${leerEstado(docroot)?.game?.on}`);

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
    await pagina.evaluate(() => !!document.querySelector('#clave')
      && /incorrecta/i.test(document.body.innerText)));
  await entrarAlPanel(pagina, url);

  informe.seccion('panel: avisos de PHP' + suf);
  const avisos = servidor.avisos();
  informe.comprueba('ADM-26', 'ningun aviso ni error de PHP durante la bateria' + suf,
    avisos.length === 0, avisos.slice(0, 3).join(' | '));

  return informe;
}

/* Superadministrador: entra por la variable de entorno del hosting, que es lo que documenta el
   LEEME. Se prueba en su propio servidor para no dejar una sesión con más permisos abierta. */
export async function pruebasSuperadmin(informe, { pagina, servidor, docroot, clave }) {
  informe.seccion('panel: superadministrador');
  await pagina.goto(servidor.url + '/admin/?salir=1', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(200);
  await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(200);
  /* Un docroot recien copiado no tiene clave.php, asi que el panel ofrece PONER contrasena en vez
     de pedirla. Se pone una de cliente primero y despues se entra con la del super, que es el
     camino real: el super entra por la misma casilla que el restaurante. */
  if (await pagina.$('input[name="nueva"]')) {
    await pagina.fill('input[name="nueva"]', CLAVE_QA);
    await pagina.click('button[type="submit"]');
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(250);
  }
  if (!(await pagina.$('#clave'))) {
    informe.blocked('ADM-30', 'entrar como superadministrador', 'el panel no pidio contrasena');
    return informe;
  }
  await pagina.fill('#clave', clave);
  await pagina.click('button[type="submit"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(350);
  const esSuper = await pagina.evaluate(() => !!document.querySelector('input[name="reset_cliente"]'));
  informe.comprueba('ADM-30', 'la clave del super abre la sesion de superadministrador', esSuper);
  if (!esSuper) return informe;

  const claveNueva = 'clave-cliente-qa-9876';
  const r = await pagina.evaluate(async (nueva) => {
    const f = document.querySelector('input[name="reset_cliente"]').form;
    const csrf = f.querySelector('input[name="csrf"]').value;
    const fd = new URLSearchParams();
    fd.set('csrf', csrf); fd.set('reset_cliente', '1'); fd.set('cliente_nueva', nueva);
    const x = await fetch('/admin/index.php', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return x.status;
  }, claveNueva);
  const clavePhp = path.join(docroot, 'admin', 'clave.php');
  informe.comprueba('ADM-31', 'el super restablece la contrasena del restaurante',
    r === 200 && existsSync(clavePhp), `status ${r}`);

  const corta = await pagina.evaluate(async () => {
    const f = document.querySelector('input[name="reset_cliente"]');
    if (!f) return 'ya no hay formulario';
    const csrf = f.form.querySelector('input[name="csrf"]').value;
    const fd = new URLSearchParams();
    fd.set('csrf', csrf); fd.set('reset_cliente', '1'); fd.set('cliente_nueva', 'corta');
    const x = await fetch('/admin/index.php', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const t = await x.text();
    return /8 caracteres|al menos 8/.test(t) ? 'rechazada' : 'sin aviso';
  });
  informe.comprueba('ADM-32', 'una contrasena corta se rechaza tambien desde el super',
    corta === 'rechazada', corta);

  /* Cambiar la clave del propio super. Sólo se puede cuando el hash vive en `superclave.php` —si
     viniera de la variable de entorno del hosting, el panel dice que se cambie allí— y aquí vive
     ahí, así que la prueba se hace de verdad en vez de declararse bloqueada. */
  const claveSuperNueva = 'clave-super-qa-nueva-8765';
  const cambio = await pagina.evaluate(async ({ actual, nueva }) => {
    const i = document.querySelector('input[name="cambiar_super"]');
    if (!i) return { hay: false };
    const csrf = i.form.querySelector('input[name="csrf"]').value;
    const mal = new URLSearchParams();
    mal.set('csrf', csrf); mal.set('cambiar_super', '1');
    mal.set('super_actual', 'esta-no-es-la-actual'); mal.set('super_nueva', nueva);
    const r1 = await fetch('/admin/index.php', { method: 'POST', body: mal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const t1 = await r1.text();
    const bien = new URLSearchParams();
    bien.set('csrf', csrf); bien.set('cambiar_super', '1');
    bien.set('super_actual', actual); bien.set('super_nueva', nueva);
    const r2 = await fetch('/admin/index.php', { method: 'POST', body: bien, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return { hay: true, rechazada: /no es correcta|incorrecta/i.test(t1), estado: r2.status };
  }, { actual: clave, nueva: claveSuperNueva });

  if (!cambio.hay) {
    informe.blocked('ADM-33', 'cambiar la clave del propio superadministrador',
      'no aparece el formulario: el hash vive en la variable de entorno del hosting');
  } else {
    informe.comprueba('ADM-33', 'una clave actual equivocada no cambia la del super', cambio.rechazada,
      JSON.stringify(cambio));
    /* Y la prueba de verdad: entrar con la nueva. Cambiar la contrasena expulsa la sesion abierta
       —es lo que hace el panel a proposito— asi que hay que volver a entrar. */
    await pagina.goto(servidor.url + '/admin/?salir=1', { waitUntil: 'domcontentloaded' });
    await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(250);
    if (await pagina.$('#clave')) {
      await pagina.fill('#clave', claveSuperNueva);
      await pagina.click('button[type="submit"]');
      await pagina.waitForLoadState('networkidle').catch(() => {});
      await pagina.waitForTimeout(350);
    }
    informe.comprueba('ADM-34', 'la clave nueva del super abre su sesion',
      await pagina.evaluate(() => !!document.querySelector('input[name="reset_cliente"]')));
  }
  return informe;
}
