/* La carta pública, el juego y la página de error.
 *
 * La regla dura de esta sección: NINGUNA petición 404, salvo la que devuelve a propósito la
 * propia página de error. Un 404 silencioso es exactamente el defecto E1, que vivió meses sin que
 * nadie lo viera porque nadie miraba la pestaña de red.
 */
import { existsSync, renameSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

export async function pruebasCarta(informe, { pagina, servidor, docroot, etiqueta = '' }) {
  const url = servidor.url;
  const suf = etiqueta ? ` (${etiqueta})` : '';

  informe.seccion('carta publica' + suf);
  pagina.limpiarRegistro();
  await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(1300);

  const inicio = await pagina.evaluate(() => ({
    titulo: document.title,
    idioma: document.documentElement.lang,
    platos: document.querySelectorAll('[data-price]').length,
    icono: (document.querySelector('link[rel="icon"]') || {}).getAttribute?.('href'),
    hero: !!document.querySelector('.hero, [class*="hero"]'),
    banner: !!document.querySelector('[class*="banner"], .pub-banner'),
    destacados: document.querySelectorAll('.item-tag-high, .item-tag').length,
    agotados: document.querySelectorAll('.is-sold-out').length,
    ofertas: document.querySelectorAll('.item-tag-offer').length,
  }));
  informe.comprueba('CAR-01', 'la carta carga con platos y titulo' + suf,
    inicio.platos > 0 && inicio.titulo.length > 0, JSON.stringify(inicio));
  informe.comprueba('CAR-02', 'sin errores de consola en la carga' + suf,
    pagina.registro.consola.length === 0, pagina.registro.consola.slice(0, 3).join(' | '));
  informe.comprueba('CAR-03', 'sin ninguna peticion fallida en la carga' + suf,
    pagina.registro.fallidas.length === 0, pagina.registro.fallidas.slice(0, 3).join(' | '));

  const icono = inicio.icono;
  if (icono) {
    const r = await pagina.evaluate(async (href) => {
      const x = await fetch(href, { cache: 'no-store' });
      return { estado: x.status, bytes: (await x.text()).length };
    }, icono);
    informe.comprueba('CAR-04', 'el icono de pestana responde 200' + suf,
      r.estado === 200 && r.bytes > 0, `${icono} -> ${r.estado} ${r.bytes}B`);
  } else {
    informe.fail('CAR-04', 'la carta declara un icono de pestana' + suf, 'no hay <link rel="icon">');
  }

  /* Suelo tipografico de la carta: 12 px, sin excepciones.
     Esta comprobacion tiene dos trampas y las dos se han pagado ya.

     La primera: puede pasar SIN MIRAR NADA. El clon de QA no trae ningun plato con etiqueta
     puesta, asi que un barrido a secas no encuentra `.item-tag` con texto y da verde con el
     defecto dentro — fue exactamente asi como se colo que las etiquetas iban a 11. Por eso
     aqui se FABRICA el caso: se enciende una de las etiquetas que el runtime deja ocultas.
     Si no se pudiera encender ninguna, esto FALLA: una comprobacion que no ha mirado nada
     no es un PASS.

     La segunda: depende del ESTADO de la pagina, y esta pagina se comparte con las suites
     que corren antes. A ancho de movil `.item-tags` es `display:none`, asi que destapar el
     span no lo hace visible y la muestra sale vacia. De ahi que aqui se fije el viewport y
     se recargue la carta limpia, y que al terminar se devuelva como estaba.

     Y la etiqueta se mide leyendo SU font-size, no como hoja del barrido: el runtime de
     idiomas envuelve el texto en un `span.i18n`, con lo que la etiqueta deja de ser hoja y
     no se mediria nunca. */
  const vpPrevio = pagina.viewportSize();
  await pagina.setViewportSize({ width: 1280, height: 900 });
  await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(900);
  const suelo = await pagina.evaluate(() => {
    const cadena = (el) => {
      const t = [];
      for (let a = el; a && a !== document.body && t.length < 4; a = a.parentElement) {
        t.push(a.tagName.toLowerCase() + (a.className ? '.' + String(a.className).trim().split(/\s+/).join('.') : ''));
      }
      return t.join(' < ');
    };
    /* la primera etiqueta que de verdad se vea al destaparla, no la primera a secas */
    let muestra = null;
    for (const t of document.querySelectorAll('.item-tag[hidden]')) {
      t.removeAttribute('hidden');
      t.textContent = 'Hay que probarlo';
      if (t.getBoundingClientRect().width > 1) { muestra = t; break; }
      t.setAttribute('hidden', '');
      t.textContent = '';
    }
    if (!muestra) return { sinMuestra: true };
    const etiqueta = parseFloat(getComputedStyle(muestra).fontSize);
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length || !el.textContent.trim()) continue;
      const b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (!(fs > 0 && fs < 12)) continue;
      offenders.push(`${fs}px «${el.textContent.trim().slice(0, 20)}» ${cadena(el)}`);
    }
    muestra.setAttribute('hidden', '');
    muestra.textContent = '';
    return { etiqueta, bajo12: [...new Set(offenders)] };
  });
  if (vpPrevio) await pagina.setViewportSize(vpPrevio);
  informe.comprueba('CAR-23', 'ningun texto visible de la carta baja de 12 px, etiqueta de plato incluida' + suf,
    !suelo.sinMuestra && suelo.etiqueta >= 12 && suelo.bajo12.length === 0,
    suelo.sinMuestra
      ? 'ninguna .item-tag se hace visible al destaparla: la comprobacion no ha podido mirar nada'
      : JSON.stringify({ etiqueta: suelo.etiqueta, bajo12: suelo.bajo12.slice(0, 4) }));

  informe.seccion('idiomas, buscador y ficha' + suf);
  const { idiomas, actual } = await pagina.evaluate(() => ({
    idiomas: [...document.querySelectorAll('[data-lang]')].map((e) => e.dataset.lang),
    actual: document.documentElement.lang,
  }));
  if (idiomas.length > 1) {
    const otro = idiomas.find((l) => l !== actual) || idiomas[1];
    await pagina.click('button.lang-trigger').catch(() => {});
    await pagina.waitForTimeout(400);
    await pagina.click(`[data-lang="${otro}"]`).catch(() => {});
    await pagina.waitForTimeout(900);
    const tras = await pagina.evaluate(() => ({
      idioma: document.documentElement.lang,
      titulo: document.title,
      primer: (document.querySelector('[data-price] .dish-name') || {}).textContent?.trim(),
      alergeno: (document.querySelector('.alergeno') || {}).getAttribute?.('aria-label'),
    }));
    informe.comprueba('CAR-05', 'el selector de idioma cambia la carta' + suf,
      tras.idioma === otro, JSON.stringify(tras));
  } else {
    informe.blocked('CAR-05', 'cambio de idioma' + suf, 'este cliente solo tiene un idioma');
  }

  await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(900);
  const hayBuscador = await pagina.$('#nav-search');
  if (hayBuscador) {
    await pagina.click('#nav-search');
    await pagina.waitForTimeout(500);
    const abierto = await pagina.evaluate(() => !!document.querySelector('#ds-q'));
    const termino = await pagina.evaluate(() => {
      const n = document.querySelector('[data-price] .dish-name');
      return n ? n.textContent.trim().slice(0, 6) : 'a';
    });
    await pagina.fill('#ds-q', termino);
    await pagina.waitForTimeout(700);
    const resultados = await pagina.evaluate(() => {
      const r = document.querySelector('#ds-results');
      return r ? r.innerText.replace(/\s+/g, ' ').trim().slice(0, 140) : '';
    });
    informe.comprueba('CAR-06', 'el buscador de escritorio abre y filtra' + suf,
      abierto && resultados.length > 0, resultados);
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(400);
    informe.comprueba('CAR-07', 'el buscador se cierra con Escape' + suf,
      await pagina.evaluate(() => {
        const q = document.querySelector('#ds-q');
        return !q || !q.offsetParent;
      }));
  } else {
    informe.blocked('CAR-06', 'buscador de escritorio' + suf, 'no existe #nav-search');
    informe.blocked('CAR-07', 'cierre del buscador' + suf, 'no existe #nav-search');
  }

  /* Buscador en movil: el mismo panel, abierto desde el boton flotante. */
  await pagina.setViewportSize({ width: 375, height: 812 });
  await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(900);
  /* En movil no hay lupa en la cabecera: el buscador vive dentro de la hoja que abre el boton
     flotante, junto a la lista de categorias. Se busca el control por LO QUE ABRE
     (`aria-controls`), no por su clase ni por su texto: la clase cambia con cualquier retoque de
     estilo y el texto cambia con el idioma. */
  const fab = await pagina.evaluate(() => {
    const b = document.querySelector('[aria-controls="category-sheet"]')
      || document.querySelector('#menu-fab');
    if (!b || b.getBoundingClientRect().width === 0) return false;
    b.click();
    return true;
  });
  await pagina.waitForTimeout(700);
  const buscadorMovil = await pagina.evaluate(() => {
    const q = document.querySelector('#ds-q');
    const hoja = document.querySelector('#category-sheet');
    return { hayCampo: !!q && !!q.offsetParent, hojaAbierta: !!hoja && !hoja.hidden };
  });
  informe.comprueba('CAR-08', 'el buscador movil se abre desde el boton flotante' + suf,
    fab && buscadorMovil.hayCampo && buscadorMovil.hojaAbierta,
    `boton=${fab} ${JSON.stringify(buscadorMovil)}`);
  if (buscadorMovil.hayCampo) {
    await pagina.fill('#ds-q', 'a');
    await pagina.waitForTimeout(600);
    const hayResultados = await pagina.evaluate(() => {
      const r = document.querySelector('#ds-results');
      return r ? r.innerText.trim().length > 0 : false;
    });
    informe.comprueba('CAR-08b', 'el buscador movil filtra' + suf, hayResultados);
  } else {
    informe.blocked('CAR-08b', 'filtrado en el buscador movil' + suf, 'no se abrio el campo');
  }
  await pagina.keyboard.press('Escape').catch(() => {});
  await pagina.setViewportSize({ width: 1280, height: 900 });

  informe.seccion('alergenos' + suf);
  await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(1000);
  const alerg = await pagina.evaluate(() => {
    const filas = [...document.querySelectorAll('[data-price]')];
    return {
      conAlergenos: filas.filter((f) => f.querySelectorAll('.alergeno').length > 0).length,
      sinAlergenos: filas.filter((f) => f.querySelectorAll('.alergeno').length === 0).length,
      etiquetas: [...document.querySelectorAll('.alergeno')].slice(0, 4).map((a) => a.getAttribute('aria-label')),
      avisoPie: /alérgen|alergen/i.test(document.body.innerText),
    };
  });
  if (alerg.conAlergenos > 0) {
    informe.comprueba('CAR-09', 'los platos con alergenos los pintan con su etiqueta' + suf,
      alerg.etiquetas.every((e) => e && e.length > 0), JSON.stringify(alerg));
    informe.comprueba('CAR-10', 'los platos sin alergenos no pintan ninguno' + suf,
      alerg.sinAlergenos > 0 || alerg.conAlergenos === 0, JSON.stringify(alerg));
  } else {
    /* No es infraestructura bloqueada: es que Tinge no declara alergenos por plato, asi que aqui
       no hay nada que medir. La funcionalidad general del motor SI se prueba, sobre un cliente
       nuevo que si los declara (MC-23, nueve iconos en pantalla), y por eso esto es NO APLICA y
       no un BLOCKED que ensuciaria la politica de bloqueos. */
    informe.noAplica('CAR-09', 'alergenos por plato' + suf,
      'Tinge no declara alergenos por plato; la funcionalidad se cubre en MC-23 sobre un cliente que si los declara');
    informe.noAplica('CAR-10', 'plato sin alergenos' + suf,
      'Tinge no declara alergenos por plato; la funcionalidad se cubre en MC-23 sobre un cliente que si los declara');
  }
  informe.comprueba('CAR-11', 'el aviso general de alergenos sale siempre en el pie' + suf, alerg.avisoPie);

  informe.seccion('juego, marcador y 404' + suf);
  pagina.limpiarRegistro();
  await pagina.goto(url + '/juego.html', { waitUntil: 'domcontentloaded' });
  await pagina.waitForLoadState('networkidle').catch(() => {});
  await pagina.waitForTimeout(1200);
  const juego = await pagina.evaluate(() => ({
    bytes: document.documentElement.outerHTML.length,
    lienzo: !!document.querySelector('canvas'),
  }));
  informe.comprueba('CAR-12', 'juego.html carga sin errores' + suf,
    pagina.registro.consola.length === 0 && pagina.registro.fallidas.length === 0,
    `${JSON.stringify(juego)} consola=${pagina.registro.consola.join('|')} red=${pagina.registro.fallidas.join('|')}`);

  const marcador = await pagina.evaluate(async () => {
    const r = await fetch('/admin/record.php', { method: 'POST', body: new URLSearchParams({ puntos: '7' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const t = await r.text();
    let json = null;
    try { json = JSON.parse(t); } catch { /* 204 o 400 no traen cuerpo */ }
    const malo = await fetch('/admin/record.php', { method: 'POST', body: new URLSearchParams({ puntos: '999999' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return { estado: r.status, json: !!json, invalido: malo.status };
  });
  /* Con el juego apagado el endpoint contesta 204 a todo, y eso es lo CORRECTO: un restaurante que
     apago el juego no sigue apuntando marcas. Entonces la prueba del rechazo no se puede hacer, y
     se dice — no se pinta de verde aprovechando que 204 no es un error. */
  if (marcador.estado === 204) {
    informe.blocked('CAR-13', 'rechazo de una puntuacion imposible' + suf,
      'el juego esta apagado en este estado: el endpoint contesta 204 a todo, que es su comportamiento correcto');
  } else {
    informe.comprueba('CAR-13', 'el endpoint del marcador contesta y rechaza una puntuacion imposible' + suf,
      marcador.estado === 200 && marcador.invalido === 400, JSON.stringify(marcador));
  }

  pagina.limpiarRegistro();
  const r404 = await pagina.goto(url + '/404.php', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(800);
  const otras404 = pagina.registro.fallidas.filter((f) => !/404\.php/.test(f));
  informe.comprueba('CAR-14', 'la pagina de error responde 404 y pinta la carta de error' + suf,
    r404.status() === 404 && (await pagina.evaluate(() => document.body.innerText.length > 20)),
    `status ${r404.status()}`);
  informe.comprueba('CAR-15', 'la pagina de error no arrastra ninguna otra peticion fallida' + suf,
    otras404.length === 0, otras404.join(' | '));

  informe.seccion('estado ausente e imagen rota' + suf);
  const estadoPath = path.join(docroot, 'estado.json');
  const guardado = existsSync(estadoPath) ? readFileSync(estadoPath) : null;
  if (guardado) {
    unlinkSync(estadoPath);
    pagina.limpiarRegistro();
    await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.waitForTimeout(1200);
    const sinEstado = await pagina.evaluate(() => document.querySelectorAll('[data-price]').length);
    /* Sin estado.json la carta tiene que seguir sirviendo los precios de la propia carta. La
       peticion a estado.json fallando es esperada y no cuenta como rotura. */
    const fallidasReales = pagina.registro.fallidas.filter((f) => !/estado\.json/.test(f));
    informe.comprueba('CAR-16', 'sin estado.json la carta sigue funcionando' + suf,
      sinEstado > 0 && fallidasReales.length === 0,
      `${sinEstado} platos | fallidas: ${fallidasReales.join(' | ')}`);
    writeFileSync(estadoPath, guardado);
  } else {
    informe.blocked('CAR-16', 'carta sin estado.json' + suf, 'el docroot no tenia estado.json');
  }

  /* Imagen rota: se estropea una foto de plato ya publicada y se mira que la carta aguante. */
  const dirPlatos = path.join(docroot, 'assets', 'platos');
  if (existsSync(dirPlatos)) {
    const fotos = (await import('node:fs')).readdirSync(dirPlatos).filter((f) => /\.(webp|png|jpg)$/.test(f));
    if (fotos.length) {
      const foto = path.join(dirPlatos, fotos[0]);
      const original = readFileSync(foto);
      writeFileSync(foto, Buffer.from('esto ya no es una imagen'));
      pagina.limpiarRegistro();
      await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
      await pagina.waitForTimeout(1200);
      const platos = await pagina.evaluate(() => document.querySelectorAll('[data-price]').length);
      informe.comprueba('CAR-17', 'una foto de plato rota no tumba la carta' + suf,
        platos > 0 && pagina.registro.consola.filter((c) => !/decode|image/i.test(c)).length === 0,
        `${platos} platos`);
      writeFileSync(foto, original);
    } else {
      informe.blocked('CAR-17', 'foto de plato rota' + suf, 'no hay fotos de plato publicadas');
    }
  } else {
    informe.blocked('CAR-17', 'foto de plato rota' + suf, 'no existe assets/platos');
  }

  informe.seccion('endpoints publicos y fugas' + suf);
  const fugas = await pagina.evaluate(async () => {
    const mirar = async (ruta) => {
      const r = await fetch(ruta, { cache: 'no-store' });
      const t = await r.text();
      return { ruta, estado: r.status, bytes: t.length, php: t.includes('<?php') };
    };
    return [await mirar('/admin/config.php'), await mirar('/admin/cliente.php'), await mirar('/admin/hash.php')];
  });
  informe.comprueba('CAR-18', 'ningun .php del panel devuelve codigo fuente' + suf,
    fugas.every((f) => !f.php), JSON.stringify(fugas));
  informe.comprueba('CAR-19', 'config.php y cliente.php no devuelven cuerpo' + suf,
    fugas[0].bytes === 0 && fugas[1].bytes === 0, JSON.stringify(fugas.slice(0, 2)));

  const contador = await pagina.evaluate(async () => {
    const r = await fetch('/admin/datos.php', { method: 'POST', body: new URLSearchParams({ v: '1' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return r.status;
  });
  informe.comprueba('CAR-20', 'el contador de aperturas contesta' + suf,
    contador === 200 || contador === 204 || contador === 400, `status ${contador}`);

  const vista = await pagina.evaluate(async () => {
    const r = await fetch('/admin/vista.php', { method: 'POST', body: new URLSearchParams({ k: 'x' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return r.status;
  });
  informe.comprueba('CAR-21', 'el contador de vistas de plato contesta' + suf,
    vista >= 200 && vista < 500, `status ${vista}`);

  const avisos = servidor.avisos();
  informe.comprueba('CAR-22', 'sin avisos de PHP durante la bateria publica' + suf,
    avisos.length === 0, avisos.slice(0, 3).join(' | '));
  return informe;
}
