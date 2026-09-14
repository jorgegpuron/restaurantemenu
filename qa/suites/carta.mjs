/* La carta pública, el juego y la página de error.
 *
 * La regla dura de esta sección: NINGUNA petición 404, salvo la que devuelve a propósito la
 * propia página de error. Un 404 silencioso es exactamente el defecto E1, que vivió meses sin que
 * nadie lo viera porque nadie miraba la pestaña de red.
 */
import { existsSync, readdirSync, renameSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
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

  /* ---------------------------------------------------------------- la ficha, como carrusel
   * Pulsar un nombre en «Combina con» ya no cierra la ficha ni salta a la fila: la ficha PASA a
   * ese plato, y del plato abierto a sus compañeros se puede ir con el dedo, con las flechas o
   * con los puntos. Aquí se contrata lo que se ve, no cómo está hecho: cuántas diapositivas
   * hay, cuál está activa, qué dice la línea de «Combina con» y cuánto mide la ventana.
   *
   * El gesto del dedo no se prueba aquí —esta página es de escritorio y sin toque— sino en el
   * banco de gestos, con toque real. Lo que sí se prueba aquí son las flechas, que son el
   * mando equivalente en escritorio.
   *
   * Los emparejamientos se siembran en estado.json y se devuelve el fichero como estaba: esta
   * batería no puede dejar la carta con platos emparejados que nadie pidió. */
  informe.seccion('la ficha, con su pista de platos' + suf);
  const estadoCarrusel = existsSync(estadoPath) ? readFileSync(estadoPath, 'utf8') : null;
  const fotosDePlato = existsSync(path.join(docroot, 'assets', 'platos'))
    ? readdirSync(path.join(docroot, 'assets', 'platos')).filter((f) => /\.(webp|png|jpg)$/.test(f))
    : [];
  const sinPista = (motivo) => {
    for (const id of ['CAR-24', 'CAR-25', 'CAR-26', 'CAR-27', 'CAR-28', 'CAR-29', 'CAR-30', 'CAR-31', 'CAR-32', 'CAR-33', 'CAR-34', 'CAR-35']) {
      informe.blocked(id, 'la pista de la ficha' + suf, motivo);
    }
  };
  if (!estadoCarrusel) {
    sinPista('el docroot no tenia estado.json');
  } else if (!fotosDePlato.length) {
    sinPista('no hay ninguna foto de plato publicada, y sin foto la ficha no abre');
  } else {
    await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(900);
    const platos = await pagina.evaluate(() => [...document.querySelectorAll('.single-menu-items[data-key]')]
      .map((r) => ({ k: r.dataset.key, nombre: ((r.querySelector('.dish-name') || {}).textContent || '').trim() }))
      .filter((p) => p.k && p.nombre));
    if (platos.length < 4) {
      sinPista(`la carta solo tiene ${platos.length} platos con nombre`);
    } else {
      /* Dos con foto y uno sin ella: el tercero prueba que una diapositiva sin foto se pinta
         sobre papel y que la ventana encoge hasta su alto en vez de dejar el hueco del 4:5. */
      const est = JSON.parse(estadoCarrusel);
      est.fotos = Object.assign({}, est.fotos);
      est.fotos[platos[0].k] = fotosDePlato[0];
      est.fotos[platos[1].k] = fotosDePlato[0];
      delete est.fotos[platos[2].k];
      est.combina = Object.assign({}, est.combina);
      est.combina[platos[0].k] = [platos[1].k, platos[2].k];
      delete est.combina[platos[3].k];
      /* El primero lleva ADEMÁS etiqueta y «para llevar»: es el caso que hace falta para medir
         si el círculo de la moto se apoya en la misma base que la pastilla de al lado.
         El segundo lleva moto y oferta pero NO etiqueta, que es el caso que descubrió el hueco
         de 8 px: con la ranura del destacado vacía, la regla escrita con «+» no llegaba. Sin
         esta fila, CAR-35 pasaría sin haber mirado el caso que falla. */
      est.tags = Object.assign({}, est.tags, { [platos[0].k]: 'Popular' });
      est.paraLlevar = [platos[0].k, platos[1].k];
      est.offer = Object.assign({}, est.offer, {
        on: true, pct: 35, keys: [platos[1].k], cats: [],
        from: '00:00', to: '23:59', days: [1, 2, 3, 4, 5, 6, 7], weekly: true,
      });
      writeFileSync(estadoPath, JSON.stringify(est));

      pagina.limpiarRegistro();
      await pagina.goto(url + '/', { waitUntil: 'domcontentloaded' });
      await pagina.waitForTimeout(1100);

      const mirar = () => pagina.evaluate(() => {
        const f = document.getElementById('dish-sheet');
        const tira = document.getElementById('dsheet-tira');
        const via = document.getElementById('dsheet-via');
        const cartas = [...tira.children];
        const activa = cartas.find((c) => c.classList.contains('es-activa')) || null;
        const flechas = [...f.querySelectorAll('.dsheet-flecha')];
        return {
          abierta: !f.hidden,
          diapositivas: cartas.length,
          activa: cartas.indexOf(activa),
          nombre: activa ? activa.querySelector('.dsheet-nombre').textContent.trim() : '',
          combina: activa ? [...activa.querySelectorAll('.dsheet-ir')].map((b) => b.textContent.trim()) : [],
          puntos: document.getElementById('dsheet-puntos').children.length,
          conPuntos: !document.getElementById('dsheet-puntos').hidden,
          flechasVisibles: flechas.filter((x) => !x.hidden).length,
          izqApagada: flechas.length ? flechas[0].disabled : null,
          derApagada: flechas.length ? flechas[1].disabled : null,
          inertes: cartas.filter((c) => c.hasAttribute('inert')).length,
          rotulos: f.querySelectorAll('#dsheet-nombre').length,
          altoVia: Math.round(via.getBoundingClientRect().height),
          altoActiva: activa ? Math.round(activa.getBoundingClientRect().height) : 0,
          fotosPedidas: cartas.filter((c) => !!c.querySelector('.dsheet-foto img').getAttribute('src')).length,
        };
      });

      await pagina.evaluate((k) => document.querySelector(`.single-menu-items[data-key="${k}"]`).click(), platos[0].k);
      await pagina.waitForTimeout(900);
      const abierta = await mirar();

      /* El síntoma que pidió el propietario: la línea decía «#141». Un número es la POSICIÓN
         del plato en la carta y cambia sola; además obliga a ir a buscarlo. */
      informe.comprueba('CAR-24', 'Combina con nombra a los platos, nunca con su numero' + suf,
        abierta.combina.length === 2
        && abierta.combina.every((t) => t.length > 1 && t.charAt(0) !== '#')
        && abierta.combina[0] === platos[1].nombre,
        JSON.stringify(abierta.combina));
      informe.comprueba('CAR-25', 'la pista monta una diapositiva por plato, con sus puntos' + suf,
        abierta.abierta && abierta.diapositivas === 3 && abierta.puntos === 3 && abierta.conPuntos
        && abierta.activa === 0, JSON.stringify(abierta));
      informe.comprueba('CAR-29', 'las fotos son perezosas: al abrir solo se piden la del plato y la de su vecina' + suf,
        abierta.fotosPedidas <= 2, `${abierta.fotosPedidas} de ${abierta.diapositivas}`);

      /* Pulsar un nombre: la ficha se queda abierta y enseña ese plato. Antes cerraba la ficha
         y saltaba a la fila de la lista. */
      await pagina.evaluate(() => document.querySelectorAll('.dsheet-carta.es-activa .dsheet-ir')[1].click());
      await pagina.waitForTimeout(800);
      const saltado = await mirar();
      informe.comprueba('CAR-26', 'pulsar un companero lleva la ficha a ese plato sin cerrarla' + suf,
        saltado.abierta && saltado.activa === 2 && saltado.nombre.indexOf(platos[2].nombre) === 0,
        JSON.stringify({ activa: saltado.activa, nombre: saltado.nombre }));
      informe.comprueba('CAR-27', 'solo la diapositiva que se ve esta activa: las demas inertes y un unico rotulo' + suf,
        saltado.inertes === saltado.diapositivas - 1 && saltado.rotulos === 1,
        JSON.stringify({ inertes: saltado.inertes, rotulos: saltado.rotulos }));
      /* El tercer plato no tiene foto: su diapositiva es sólo texto y la ventana tiene que
         encoger hasta ahí. Sin esto mandaría la más alta y la ficha se quedaría medio vacía. */
      informe.comprueba('CAR-28', 'la ventana mide lo que mide el plato que se ve, no el mas alto de la pista' + suf,
        saltado.altoVia === saltado.altoActiva && saltado.altoVia < abierta.altoVia,
        JSON.stringify({ conFoto: abierta.altoVia, sinFoto: saltado.altoVia }));

      /* Las flechas son el mando de escritorio, y se apagan en los extremos. */
      await pagina.evaluate(() => document.querySelector('.dsheet-flecha.es-izq').click());
      await pagina.waitForTimeout(700);
      const atras = await mirar();
      informe.comprueba('CAR-30', 'las flechas recorren la pista y se apagan en los extremos' + suf,
        atras.flechasVisibles === 2 && atras.activa === 1 && !atras.izqApagada && !atras.derApagada
        && abierta.izqApagada === true,
        JSON.stringify({ activa: atras.activa, izq: atras.izqApagada, der: atras.derApagada, alPrincipio: abierta.izqApagada }));

      /* La foto ES la ficha: ni banda de papel debajo ni hueco arriba. La primera versión de
         los puntos iba en el flujo con su propio fondo, y le colgaba a la tarjeta 31 px de
         blanco; el propietario lo vio en producción. Se contrata la geometría —el panel
         empieza y acaba donde la foto— y que los puntos queden DENTRO de ella.
         Se mide AQUÍ y no más abajo: hace falta la ficha con pista, que es la que tiene
         puntos. Con un solo plato van ocultos y su caja mide cero, con lo que la
         comprobación pasaría sin mirar nada. */
      /* De vuelta al plato que ancla la pista: es el único que tiene «Combina con», y sin esa
         línea no hay renglón contra el que medir. Sin este paso la comprobación se quedaba a
         medias y daba null, que es otra forma de pasar sin mirar. */
      await pagina.evaluate(() => document.querySelector('.dsheet-punto[data-dpunto="0"]').click());
      await pagina.waitForTimeout(700);
      const sinBanda = await pagina.evaluate(() => {
        const panel = document.getElementById('dsheet-panel');
        const carta = document.querySelector('.dsheet-carta.es-activa');
        const foto = carta.querySelector('.dsheet-foto');
        const puntos = document.getElementById('dsheet-puntos');
        const p = panel.getBoundingClientRect();
        const f = foto.getBoundingClientRect();
        const d = puntos.getBoundingClientRect();
        /* El renglón de «Combina con», medido con un Range: el rectángulo del párrafo da el
           bloque entero y con dos líneas caería en medio. */
        const combina = carta.querySelector('.dsheet-combina');
        let renglon = null;
        if (combina && !combina.hidden) {
          const r = document.createRange();
          r.selectNodeContents(combina);
          const rs = r.getClientRects();
          renglon = rs.length ? rs[rs.length - 1] : null;
        }
        const punto = document.querySelector('.dsheet-punto');
        return {
          arriba: Math.round((f.top - p.top) * 10) / 10,
          abajo: Math.round((p.bottom - f.bottom) * 10) / 10,
          fondoPuntos: getComputedStyle(puntos).backgroundColor,
          altoPuntos: Math.round(d.height * 10) / 10,
          puntosDentro: d.height > 0 && d.bottom <= f.bottom + 1 && d.top >= f.top,
          desnivelRenglon: renglon && punto
            ? Math.round((((punto.getBoundingClientRect().top + punto.getBoundingClientRect().bottom) / 2)
              - ((renglon.top + renglon.bottom) / 2)) * 100) / 100
            : null,
          holgura: renglon && punto ? Math.round(punto.getBoundingClientRect().left - renglon.right) : null,
        };
      });
      /* Tres cosas en una: que la tarjeta sea la foto, que los puntos compartan renglón con
         «Combina con» —iban 40 px por debajo, flotando— y que el texto de esa línea no se les
         meta debajo. Con dos platos emparejados el texto los cruzaba 111 px: por eso los
         puntos van al final de la línea y no centrados. */
      informe.comprueba('CAR-33', 'la ficha es la foto, y los puntos comparten renglón con «Combina con» sin cruzarse con su texto' + suf,
        Math.abs(sinBanda.arriba) <= 1 && Math.abs(sinBanda.abajo) <= 1
        && /rgba\(0, 0, 0, 0\)|transparent/.test(sinBanda.fondoPuntos) && sinBanda.puntosDentro
        && sinBanda.desnivelRenglon !== null && Math.abs(sinBanda.desnivelRenglon) <= 1
        && sinBanda.holgura !== null && sinBanda.holgura > 0,
        JSON.stringify(sinBanda));

      await pagina.keyboard.press('Escape');
      await pagina.waitForTimeout(500);

      /* Un plato SIN companeros: ni puntos ni flechas. La ficha de siempre, sin un pixel de mas. */
      await pagina.evaluate((k) => document.querySelector(`.single-menu-items[data-key="${k}"]`).click(), platos[1].k);
      await pagina.waitForTimeout(800);
      const solo = await mirar();
      informe.comprueba('CAR-31', 'un plato sin companeros abre la ficha de siempre: una diapositiva, sin puntos ni flechas' + suf,
        solo.abierta && solo.diapositivas === 1 && !solo.conPuntos && solo.flechasVisibles === 0,
        JSON.stringify(solo));
      informe.comprueba('CAR-32', 'ni un error de consola en todo el recorrido de la ficha' + suf,
        pagina.registro.consola.length === 0, pagina.registro.consola.slice(0, 3).join(' | '));

      /* La moto de «para llevar» se apoya en la misma base que la pastilla de al lado. Iba con
         vertical-align:middle y caía por debajo del renglón; se veía en producción. Las dos
         cajas miden 18, así que si los bordes inferiores coinciden, están alineadas. */
      const moto = await pagina.evaluate((k) => {
        const fila = document.querySelector('.single-menu-items[data-key="' + k + '"]');
        if (!fila) return { error: 'sin fila' };
        const m = fila.querySelector('.item-tag-llevar:not([hidden])');
        const otra = fila.querySelector('.item-tag-high:not([hidden]), .item-tag-diet:not([hidden])');
        if (!m || !otra) return { error: 'faltan etiquetas', moto: !!m, otra: !!otra };
        const a = m.getBoundingClientRect();
        const b = otra.getBoundingClientRect();
        return {
          abajo: Math.round((a.bottom - b.bottom) * 100) / 100,
          arriba: Math.round((a.top - b.top) * 100) / 100,
          altoMoto: Math.round(a.height * 10) / 10, altoOtra: Math.round(b.height * 10) / 10,
        };
      }, platos[0].k);
      informe.comprueba('CAR-34', 'el icono de «para llevar» se apoya en la misma base que la etiqueta de al lado' + suf,
        !moto.error && Math.abs(moto.abajo) <= 0.6 && Math.abs(moto.arriba) <= 0.6,
        JSON.stringify(moto));

      /* Los huecos a los lados de la moto son los 4 px de la casa, también cuando la ranura
         del destacado va vacía. La fila emite SIEMPRE las tres ranuras —oferta, destacado,
         moto— y las que no van se quedan ocultas: con el destacado apagado, el hermano
         inmediato de la oferta es esa ranura vacía y no la moto, así que la regla escrita con
         «+» no llegaba y se heredaban los 8 px genéricos, que son para separar del NOMBRE del
         plato. Medido antes de corregirlo: 8 a la izquierda y 4 a la derecha. */
      const huecos = await pagina.evaluate(() => {
        const salida = [];
        document.querySelectorAll('.item-tag-llevar:not([hidden])').forEach((m) => {
          if (!m.getBoundingClientRect().width) return;
          const tira = m.parentElement;
          const visibles = [...tira.children].filter((el) => el.getBoundingClientRect().width > 0);
          const i = visibles.indexOf(m);
          const corto = (el) => String(el.className).split(' ').filter((c) => c !== 'item-tag')[0] || el.tagName;
          const entre = (a, b) => Math.round((b.getBoundingClientRect().left - a.getBoundingClientRect().right) * 100) / 100;
          if (i > 0) salida.push({ par: corto(visibles[i - 1]) + '>moto', px: entre(visibles[i - 1], m) });
          if (i < visibles.length - 1) salida.push({ par: 'moto>' + corto(visibles[i + 1]), px: entre(m, visibles[i + 1]) });
        });
        return salida;
      });
      informe.comprueba('CAR-35', 'los huecos a los lados de la moto son los 4 px de etiqueta a etiqueta, no los 8 de separar del nombre' + suf,
        huecos.length > 0 && huecos.every((h) => Math.abs(h.px - 4) <= 0.6),
        JSON.stringify(huecos.slice(0, 6)));

      writeFileSync(estadoPath, estadoCarrusel);
    }
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
