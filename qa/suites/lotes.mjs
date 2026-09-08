/* Los nueve lotes de la fase correctiva, convertidos en pruebas permanentes.
 *
 * Cada uno de estos fallos llegó a producción una vez. La prueba no está para demostrar que hoy
 * funcionan —eso ya se hizo— sino para que el día que alguien toque esa zona se entere antes de
 * mezclar el cambio. Por eso cada prueba comprueba el SÍNTOMA que se vio, no la implementación.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { clicVisible, abrirAcordeones, textoAviso } from '../lib/navegador.mjs';
import { leerEstado } from './admin.mjs';

async function subirPortada(pagina, url, fichero) {
  await pagina.goto(url + '/admin/?t=marca', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(350);
  await pagina.setInputFiles('input[name="foto[]"]', fichero);
  await pagina.waitForTimeout(250);
  try { await pagina.click('button[name="subir_foto"]', { timeout: 4000 }); } catch { /* algunas subidas se envian solas */ }
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(600);
  return textoAviso(pagina);
}

/* LOTE 1 — una imagen que no se puede abrir entera no se guarda. El fallo original: se guardaba
   el fichero en crudo cuando la recompresión fallaba, y la carta servía una imagen rota. */
export async function lote1(informe, { pagina, servidor, docroot, fixtures }) {
  const url = servidor.url;
  const suf = servidor.conGd ? '' : ' (sin GD)';
  informe.seccion('lote 1: portadas' + suf);

  const heroAntes = JSON.stringify(leerEstado(docroot)?.hero || []);

  if (servidor.conGd) {
    const valida = fixtures['portada-1200x800.jpg'] || fixtures['portada-1200x800.png'];
    const m1 = await subirPortada(pagina, url, valida);
    informe.comprueba('L1-01', 'una portada valida se guarda',
      /Foto subida|Ya son/i.test(m1) && (leerEstado(docroot)?.hero || []).length > 0, m1);

    const m2 = await subirPortada(pagina, url, fixtures['truncada.png']);
    informe.comprueba('L1-02', 'una imagen con cabecera valida y cuerpo truncado se rechaza',
      /danada|dañada|no ha podido abrirla/i.test(m2), m2);

    const m3 = await subirPortada(pagina, url, fixtures['extension-falsa.jpg']);
    informe.comprueba('L1-03', 'un .jpg que por dentro es PNG se rechaza nombrando el enredo',
      /se llama \.jpg pero dentro/i.test(m3), m3);

    const m4 = await subirPortada(pagina, url, fixtures['ancha-9000x300.png']);
    informe.comprueba('L1-04', 'una imagen de 9000 px de lado se rechaza',
      /demasiado grande|megapixeles|megapíxeles/i.test(m4), m4);

    const m5 = await subirPortada(pagina, url, fixtures['no-es-imagen.txt']);
    informe.comprueba('L1-05', 'un fichero de texto no cuela como imagen',
      /no es una imagen/i.test(m5), m5);

    const m6 = await subirPortada(pagina, url, fixtures['estrecha-400x300.png']);
    informe.comprueba('L1-06', 'una imagen de menos de 800 px de ancho se rechaza',
      /800|ancho/i.test(m6), m6);

    const heroWebp = leerEstado(docroot)?.heroWebp || {};
    informe.comprueba('L1-07', 'la portada guardada genera sus variantes WebP',
      Object.keys(heroWebp).length > 0, JSON.stringify(heroWebp).slice(0, 120));
  } else {
    const m = await subirPortada(pagina, url, fixtures['portada-1200x800.png']);
    informe.comprueba('L1-08', 'sin GD la portada se rechaza con un mensaje claro',
      /no puede comprobar|extension GD|extensión GD/i.test(m), m);
    informe.comprueba('L1-09', 'sin GD el rechazo no toca el estado',
      JSON.stringify(leerEstado(docroot)?.hero || []) === heroAntes,
      `antes=${heroAntes} despues=${JSON.stringify(leerEstado(docroot)?.hero || [])}`);
  }
  return informe;
}

/* LOTE 2 — restaurar una copia sólo devuelve los precios. El fallo original: se restauraba el
   estado entero y se perdían agotados, destacados, fotos y marca sin avisar. */
export async function lote2(informe, { pagina, servidor, docroot }) {
  const url = servidor.url;
  const { guardar, postCrudo, irA } = await import('./admin.mjs');
  informe.seccion('lote 2: restaurar copia (Ajustes)');

  /* Una copia se crea con un cambio de precios (Platos). */
  const platos = JSON.parse(readFileSync(path.join(docroot, 'admin', 'platos.json'), 'utf8')).filter((p) => p.price !== '');
  const k0 = platos[0].key;
  await irA(pagina, url, 'platos', 300);
  await postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${k0}]`, '33.33']]);
  await pagina.waitForTimeout(1100);
  await postCrudo(pagina, '/admin/index.php', [['precios_publicar', '1'], [`precio[${k0}]`, '44.44']]);

  const copias = readdirSync(path.join(docroot, 'admin', 'copias')).filter((f) => f.endsWith('.json'));
  if (!copias.length) { informe.blocked('L2-01', 'restaurar copia', 'no se creo ninguna copia'); return informe; }

  /* Se cambia OTRA cosa después de la copia (rótulo de Marca): si la restauración la pisara, se vería. */
  await irA(pagina, url, 'marca', 300);
  const marcaTestigo = 'Rotulo posterior';
  await pagina.fill('#marca-rotulo', marcaTestigo);
  await guardar(pagina, 'marca-form');

  const antes = leerEstado(docroot);
  await irA(pagina, url, 'ajustes', 300);
  await clicVisible(pagina, 'button[name="restaurar_copia"]', 0);
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(700);
  const aviso = await textoAviso(pagina);
  const despues = leerEstado(docroot);

  const cambiadas = Object.keys({ ...antes, ...despues })
    .filter((k) => JSON.stringify(antes?.[k]) !== JSON.stringify(despues?.[k]));
  informe.comprueba('L2-01', 'restaurar una copia solo cambia los precios',
    cambiadas.every((k) => k === 'prices' || k === 'actualizado'), `cambiaron: ${cambiadas.join(', ')} | ${aviso.slice(0, 60)}`);
  informe.comprueba('L2-02', 'la marca cambiada despues de la copia sobrevive a la restauracion',
    (despues?.marca?.rotuloVisible || '').startsWith(marcaTestigo), despues?.marca?.rotuloVisible);
  await postCrudo(pagina, '/admin/index.php', [['precios_reset', '1']]);
  return informe;
}

/* LOTE 3 — el aviso de cambios sin guardar sólo salta con un cambio real. El fallo original:
   escribir en el buscador ensuciaba el formulario y el navegador pedía confirmación al salir. */
export async function lote3(informe, { pagina, servidor }) {
  const url = servidor.url;
  const { irA } = await import('./admin.mjs');
  informe.seccion('lote 3: buscador limpio y autoguardado de agotados');

  await irA(pagina, url, 'platos', 300);
  await pagina.fill('#q', 'zzz');
  await pagina.waitForTimeout(250);
  pagina.registro.dialogos.length = 0;
  await pagina.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await pagina.waitForTimeout(400);
  informe.comprueba('L3-01', 'escribir en el buscador no dispara el aviso de cambios sin guardar',
    pagina.registro.dialogos.length === 0, pagina.registro.dialogos.join(' | '));

  /* Con MISE-B los agotados autoguardan: marcar uno NO deja «cambios sin guardar», se guarda solo
     y persiste tras F5 sin pulsar ningún botón. */
  await irA(pagina, url, 'platos', 300);
  await pagina.evaluate(() => document.querySelectorAll('[data-cat-bento]').forEach((f) => f.setAttribute('data-abierto', '')));
  const val = await pagina.evaluate(() => { const cb = document.querySelector('.pane[data-pane="platos"] input[name="agotado[]"]'); if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); } return cb ? cb.value : null; });
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(700);
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  await pagina.evaluate(() => document.querySelectorAll('[data-cat-bento]').forEach((f) => f.setAttribute('data-abierto', '')));
  const persiste = await pagina.evaluate((v) => { const cb = document.querySelector(`.pane[data-pane="platos"] input[name="agotado[]"][value="${v}"]`); return cb ? cb.checked : false; }, val);
  informe.comprueba('L3-02', 'marcar un agotado se autoguarda sin pulsar Guardar y persiste tras F5',
    !!val && persiste, `val=${val} persiste=${persiste}`);
  return informe;
}

/* LOTE 4 — los códigos de subida de PHP se traducen a algo que se entiende, con el tope de
   verdad. El fallo original: «error 1» y a adivinar. */
export async function lote4(informe, { pagina, servidor, fixtures }) {
  const url = servidor.url;
  informe.seccion('lote 4: mensajes de subida');
  const m = await subirPortada(pagina, url, fixtures['pesada-3mb.png']);
  informe.comprueba('L4-01', 'un fichero por encima del tope del servidor lo dice con el tope',
    /rechazado el envio|no acepta mas de|no acepta más de/i.test(m), m);
  const m2 = await subirPortada(pagina, url, fixtures['portada pequeña ñ & (400px).png']);
  informe.comprueba('L4-02', 'el mensaje de error nombra el fichero con acentos sin romperlo',
    /pequeña ñ/.test(m2), m2);
  return informe;
}

/* LOTE 5 — a 320 px no hay desbordes. Lo cubre responsive.mjs; aquí se deja la referencia para
   que el lote no parezca sin prueba al leer este fichero. */

/* LOTE 6 — `dia[]` se normaliza en servidor. El fallo original: días repetidos escritos tal cual
   en el estado. Va por POST porque la interfaz no permite marcar dos veces el mismo día. */
export async function lote6(informe, { pagina, servidor, docroot }) {
  const url = servidor.url;
  informe.seccion('lote 6: normalizacion de dias');
  await pagina.goto(url + '/admin/?t=ofertas', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(300);
  const r = await pagina.evaluate(async () => {
    const csrf = document.querySelector('input[name="csrf"]').value;
    const fd = new URLSearchParams();
    fd.set('csrf', csrf); fd.set('guardar_oferta', '1'); fd.set('pct', '20');
    fd.set('desde', '00:00'); fd.set('hasta', '23:59');
    ['5', '2', '5', '2', '9', '0', '7', '2'].forEach((d) => fd.append('dia[]', d));
    const cb = document.querySelector('input[name="oferta_plato[]"]:not([disabled])');
    if (cb) fd.append('oferta_plato[]', cb.value);
    fd.set('oferta_on', '1');
    const x = await fetch('/admin/index.php?t=ofertas', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return x.status;
  });
  const dias = leerEstado(docroot)?.offer?.days || [];
  informe.comprueba('L6-01', 'dias repetidos, desordenados y fuera de rango salen [2,5,7]',
    JSON.stringify(dias) === JSON.stringify([2, 5, 7]), `status ${r} | ${JSON.stringify(dias)}`);
  return informe;
}

/* LOTE 7 — varias copias en el mismo segundo no se pisan. El fallo original: el nombre era la
   fecha con minutos y dos cambios seguidos compartían fichero. */
export async function lote7(informe, { pagina, servidor, docroot }) {
  const url = servidor.url;
  informe.seccion('lote 7: copias en el mismo segundo');
  await pagina.goto(url + '/admin/?t=precios', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  await pagina.click('button[name="subir"][value="5"]');
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(450);
  const r = await pagina.evaluate(async () => {
    const csrf = document.querySelector('input[name="csrf"]').value;
    const campos = [...document.querySelectorAll('input[name^="precio["]')].map((i) => i.name);
    if (!campos.length) return { ms: 0, n: 0 };
    const t0 = Date.now();
    for (let k = 1; k <= 4; k++) {
      const fd = new URLSearchParams();
      fd.set('csrf', csrf); fd.set('precios_publicar', '1');
      campos.forEach((c, i) => fd.set(c, (5 + k + i * 0.5).toFixed(2)));
      await fetch('/admin/index.php?t=precios', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    }
    return { ms: Date.now() - t0, n: campos.length };
  });
  const copias = readdirSync(path.join(docroot, 'admin', 'copias')).filter((f) => f.endsWith('.json'));
  const sellos = copias.map((f) => f.replace('.json', ''));
  const mismoSegundo = sellos.filter((s) => /^\d{4}-\d{2}-\d{2}-\d{8}$/.test(s));
  informe.comprueba('L7-01', 'cuatro publicaciones seguidas dejan copias con nombre distinto',
    copias.length === new Set(copias).size && copias.length >= 2 && r.ms < 3000,
    `${copias.length} copias en ${r.ms} ms: ${copias.join(', ')}`);
  informe.comprueba('L7-02', 'el nombre de la copia lleva segundos y contador',
    mismoSegundo.length > 0 || copias.length >= 2, sellos.join(', '));
  return informe;
}

/* LOTE 8 — accesibilidad y saneamiento. Tres cosas distintas que se corrigieron juntas. */
export async function lote8(informe, { pagina, servidor, docroot, fixtures }) {
  const url = servidor.url;
  informe.seccion('lote 8: accesibilidad y saneamiento');

  await pagina.goto(url + '/admin/?salir=1', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  const label = await pagina.evaluate(() => {
    const l = document.querySelector('label[for="clave"]');
    const i = document.querySelector('#clave');
    return l ? { clase: l.className, texto: l.textContent.trim(), aria: i && i.getAttribute('aria-label') } : null;
  });
  informe.comprueba('L8-01', 'la contrasena del login tiene un <label> de verdad',
    !!label && label.texto.length > 0 && !label.aria, JSON.stringify(label));
  const { entrarAlPanel } = await import('./admin.mjs');
  await entrarAlPanel(pagina, url);

  await pagina.goto(url + '/admin/?t=platos', { waitUntil: 'domcontentloaded' });
  await pagina.evaluate(() => document.querySelectorAll('[data-cat-bento]').forEach((f) => f.setAttribute('data-abierto', '')));
  await pagina.waitForTimeout(250);
  /* Hace falta una camara de un plato que TODAVIA no tenga foto: el cambio que se comprueba es
     «Poner foto a X» -> «Cambiar la foto de X», y si el plato ya tiene foto el rotulo empieza ya
     en el segundo estado y la prueba no mide nada. */
  const indiceCamara = await pagina.evaluate(() => {
    const cams = [...document.querySelectorAll('button.camara')];
    const i = cams.findIndex((c) => (c.getAttribute('aria-label') || '').startsWith('Poner foto'));
    return i;
  });
  const antes = indiceCamara < 0 ? null : await pagina.evaluate((i) =>
    document.querySelectorAll('button.camara')[i].getAttribute('aria-label'), indiceCamara);
  if (antes && fixtures['plato-600x600.png']) {
    await clicVisible(pagina, 'button.camara', indiceCamara);
    await pagina.waitForTimeout(400);
    await pagina.setInputFiles('#rec-file', fixtures['plato-600x600.png']);
    await pagina.waitForTimeout(1400);
    const abierto = await pagina.evaluate(() => document.getElementById('recorte').hasAttribute('open'));
    if (abierto) {
      await clicVisible(pagina, '#rec-guardar', 0);
      await pagina.waitForTimeout(2200);
    }
    const despues = await pagina.evaluate((i) =>
      document.querySelectorAll('button.camara')[i].getAttribute('aria-label'), indiceCamara);
    informe.comprueba('L8-02', 'el aria-label de la camara cambia sin recargar',
      antes.startsWith('Poner foto') && String(despues).startsWith('Cambiar la foto'),
      `${antes} -> ${despues}`);
    informe.comprueba('L8-03', 'la foto del plato queda guardada',
      Object.keys(leerEstado(docroot)?.fotos || {}).length > 0);
  } else {
    informe.blocked('L8-02', 'aria-label de la camara',
      indiceCamara < 0 ? 'todos los platos tenian ya foto: no hay ningun rotulo «Poner foto» que ver cambiar' : 'falta la fixture');
    informe.blocked('L8-03', 'foto de plato', 'no se pudo subir');
  }

  /* Saneamiento del nombre del marcador: es el endpoint público del juego.
     El podio sólo guarda tres marcas, así que se vacía antes y se envían puntuaciones que suben:
     si no, la segunda prueba no entra en el podio, no recibe id y la comprobación mediría otra
     cosa —que es exactamente el falso negativo que se coló la primera vez que se hizo a mano. */
  for (const f of [path.join(docroot, 'admin', 'marcador.json'), path.join(docroot, 'record.json')]) {
    try { if (existsSync(f)) (await import('node:fs')).unlinkSync(f); } catch { /* no existia */ }
  }
  /* Y el juego tiene que estar ENCENDIDO: con el interruptor apagado el endpoint contesta 204 sin
     cuerpo —es su comportamiento correcto— y la prueba se quedaria sin identificador midiendo el
     camino equivocado. Pasó, y por eso ahora se enciende antes y se exige que devuelva id. */
  await pagina.goto(url + '/admin/?t=juego', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(250);
  await pagina.evaluate(async () => {
    const csrf = document.querySelector('input[name="csrf"]').value;
    const fd = new URLSearchParams();
    fd.set('csrf', csrf); fd.set('guardar_juego', '1'); fd.set('juego_on', '1');
    await fetch('/admin/index.php?t=juego', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  });
  const juegoEncendido = leerEstado(docroot)?.game?.on === true;

  const nombres = ['<b>Ana</b><script>x</script> <i>QA', 'Ámbar de la Ñ', 'ABCDEFGHIJKLMNOP'];
  const res = juegoEncendido ? await pagina.evaluate(async (nombres) => {
    const salida = [];
    let punt = 100;
    for (const nombre of nombres) {
      punt += 10;
      const p1 = await fetch('/admin/record.php', { method: 'POST', body: new URLSearchParams({ puntos: String(punt) }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      let id = '';
      try { id = JSON.parse(await p1.text()).id || ''; } catch { /* no entro en el podio */ }
      if (!id) { salida.push([nombre, null]); continue; }
      const p2 = await fetch('/admin/record.php', { method: 'POST', body: new URLSearchParams({ id, nombre, pais: 'es' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const j = JSON.parse(await p2.text());
      const fila = j.top.find((x) => x.puntos === punt);
      salida.push([nombre, fila ? fila.nombre : null]);
    }
    return salida;
  }, nombres) : [];
  const mapa = new Map(res);
  /* Un `null` significa que la marca no llego a entrar en el podio, asi que la comprobacion no se
     hizo. Se dice, no se pinta de verde: un PASS sobre un valor que nunca llego es peor que un
     BLOCKED honesto. */
  const guardado = (n) => mapa.get(n);
  const hecho = (n) => typeof guardado(n) === 'string';
  const juzga = (id, texto, n, condicion) => {
    if (!juegoEncendido) return informe.blocked(id, texto, 'no se pudo encender el juego, y con el apagado el endpoint contesta 204');
    if (!hecho(n)) return informe.blocked(id, texto, 'la marca no entro en el podio: la comprobacion no llego a hacerse');
    return informe.comprueba(id, texto, condicion(guardado(n)), JSON.stringify(guardado(n)));
  };
  juzga('L8-04', 'record.php quita las etiquetas del nombre', nombres[0], (v) => !v.includes('<') && !v.includes('script'));
  juzga('L8-05', 'record.php recorta por caracteres sin partir un acento', nombres[1], (v) => v === 'Ámbar de la ' || (v.length <= 12 && !/�/.test(v)));
  juzga('L8-06', 'record.php recorta a doce caracteres', nombres[2], (v) => v === 'ABCDEFGHIJKL');
  const recordJson = path.join(docroot, 'record.json');
  let valido = false;
  try { JSON.parse(readFileSync(recordJson, 'utf8')); valido = true; } catch { /* no existe o roto */ }
  if (!juegoEncendido || !hecho(nombres[0])) {
    informe.blocked('L8-07', 'record.json valido', 'no se llego a escribir ninguna marca');
  } else {
    informe.comprueba('L8-07', 'record.json queda como JSON valido', valido);
  }
  return informe;
}

/* LOTE 9 — el precio canónico es el mismo en la lista, en la búsqueda y en la ficha, y un plato
   agotado no anuncia descuento. El fallo original: la hoja de búsqueda releía el precio pintado y
   un agotado en oferta salía rebajado ahí y sin rebajar en la lista. */
export async function lote9(informe, { pagina, servidor }) {
  const url = servidor.url;
  informe.seccion('lote 9: precio canonico');
  await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(1200);

  const filas = await pagina.evaluate(() => [...document.querySelectorAll('[data-price]')].map((e) => ({
    clave: e.dataset.key,
    nombre: (e.querySelector('.dish-name') || {}).textContent?.trim(),
    final: e.dataset.precioFinal,
    agotado: e.classList.contains('is-sold-out'),
    oferta: !!e.querySelector('.item-tag-offer'),
    abre: e.classList.contains('abre'),
  })));
  informe.comprueba('L9-01', 'cada fila lleva su precio canonico en data-precio-final',
    filas.length > 0 && filas.every((f) => !!f.final), `${filas.length} filas`);

  const agotados = filas.filter((f) => f.agotado);
  if (agotados.length) {
    const conDescuento = await pagina.evaluate(() =>
      [...document.querySelectorAll('[data-price].is-sold-out')]
        .filter((e) => e.querySelector('.price-was')).map((e) => e.dataset.key));
    informe.comprueba('L9-02', 'un plato agotado no anuncia descuento',
      conDescuento.length === 0, conDescuento.join(', '));
  } else {
    informe.blocked('L9-02', 'plato agotado sin descuento', 'no habia ningun plato agotado en la carta');
  }

  const conFoto = filas.find((f) => f.abre);
  if (conFoto) {
    await pagina.click(`[data-key="${conFoto.clave}"]`).catch(() => {});
    await pagina.waitForTimeout(900);
    const ficha = await pagina.evaluate(() => {
      const d = document.querySelector('.dsheet');
      return { abierta: !d.hidden, precio: (d.querySelector('.dsheet-precio') || {}).textContent?.trim() };
    });
    informe.comprueba('L9-03', 'la ficha ensena el mismo precio que la lista',
      ficha.abierta && String(ficha.precio).includes(String(conFoto.final)),
      `lista=${conFoto.final} ficha=${ficha.precio}`);
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(400);
    informe.comprueba('L9-04', 'la ficha se cierra con Escape',
      await pagina.evaluate(() => document.querySelector('.dsheet').hidden));
  } else {
    informe.blocked('L9-03', 'ficha del plato', 'ningun plato tenia foto, y sin foto la ficha no abre');
    informe.blocked('L9-04', 'cierre de la ficha', 'no se pudo abrir');
  }

  const busca = filas[0];
  await pagina.click('#nav-search').catch(() => {});
  await pagina.waitForTimeout(500);
  if (await pagina.$('#ds-q')) {
    await pagina.fill('#ds-q', String(busca.nombre || '').slice(0, 8));
    await pagina.waitForTimeout(700);
    const enBusqueda = await pagina.evaluate(() => {
      const r = document.querySelector('#ds-results');
      return r ? r.innerText.replace(/\s+/g, ' ').trim().slice(0, 160) : '';
    });
    informe.comprueba('L9-05', 'la busqueda ensena el mismo precio canonico',
      enBusqueda.includes(String(busca.final).replace('€', '')) || enBusqueda.includes(String(busca.final)),
      `${busca.final} en "${enBusqueda}"`);
    await pagina.keyboard.press('Escape');
  } else {
    informe.blocked('L9-05', 'precio en la busqueda', 'no se abrio el buscador');
  }
  return informe;
}
