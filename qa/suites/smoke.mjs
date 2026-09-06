/* `npm --prefix qa run smoke` — el humo funcional que corre en cada pull request.
 *
 * El encargo de la fase 17 pedía «`fast` y pruebas funcionales esenciales» en cada pull request y
 * el workflow se quedó sólo con `fast`, que no abre un navegador ni entra al panel. Esto es lo que
 * faltaba: lo mínimo que, si se rompe, hace que no merezca la pena mirar nada más.
 *
 * Criterio para que algo entre aquí: que su rotura sea evidente para cualquiera que abra el
 * producto —el panel no abre, la carta no carga, el icono da 404, la consola escupe errores— y que
 * se pueda comprobar en menos de un minuto. Lo demás es de `full`.
 *
 * Ni un selector de prueba en el producto: todo se localiza por rol, etiqueta accesible, `name` o
 * texto visible, igual que en el resto de la batería.
 */
import { Informe } from '../lib/informe.mjs';
import { chromePath, limpiarTemporales, versiones, commitActual } from '../lib/entorno.mjs';
import { abrir, cerrarTodos, capacidadesPhp } from '../lib/servidor.mjs';
import { abrirNavegador, nuevaPagina } from '../lib/navegador.mjs';
import { clonarTinge, compilar, docrootDesde } from '../lib/clientes.mjs';
import { entrarAlPanel } from './admin.mjs';
import { residuosEnDisco } from './oscuro.mjs';

const PESTANAS = ['agotados', 'destacados', 'ofertas', 'precios', 'juego', 'publicidad', 'datos', 'marca'];

export async function smoke(informe = new Informe('QA humo funcional (smoke)', 'smoke')) {
  const caps = capacidadesPhp();
  if (!caps.hayPhp) { informe.fail('SMK-00', 'humo funcional', 'no hay PHP en el PATH'); return informe; }
  if (!chromePath()) { informe.fail('SMK-00', 'humo funcional', 'no se encuentra Chrome; define CHROME_PATH'); return informe; }

  informe.seccion('humo: build');
  const clon = clonarTinge();
  const c = compilar(clon.proyecto, { conActivacion: false });
  informe.comprueba('SMK-01', 'el build canonico sale bien', c.gen.ok, c.gen.texto.trim().split('\n').pop());
  if (!c.gen.ok) return informe;

  const docroot = docrootDesde(clon.salida, 'tinge_smoke');
  const servidor = await abrir(docroot, { gd: true, mbstring: true });
  const navegador = await abrirNavegador();
  const url = servidor.url;

  try {
    /* ---------- panel ---------- */
    informe.seccion('humo: panel');
    const pagina = await nuevaPagina(navegador);
    const pestanas = await entrarAlPanel(pagina, url);
    informe.comprueba('SMK-02', 'se entra al panel', !(await pagina.evaluate(() => !!document.querySelector('#clave'))));
    informe.comprueba('SMK-03', 'estan las ocho pestanas', pestanas.length === 8, pestanas.join(','));
    informe.comprueba('SMK-04', 'los ocho paneles existen en el HTML',
      await pagina.evaluate(() => document.querySelectorAll('section.pane').length) === 8);

    /* Cambiar de pestaña de verdad, no sólo comprobar que el HTML las tiene: el panel es una sola
       página y el cambio lo hace su JavaScript. Si eso se rompe, el panel está roto entero. */
    const cambios = [];
    for (const t of ['ofertas', 'juego', 'marca']) {
      await pagina.goto(`${url}/admin/index.php?t=${t}`, { waitUntil: 'domcontentloaded' });
      await pagina.waitForTimeout(200);
      cambios.push(await pagina.evaluate((tt) => {
        const pane = document.querySelector(`section.pane[data-pane="${tt}"]`);
        return pane ? getComputedStyle(pane).display !== 'none' : false;
      }, t));
    }
    informe.comprueba('SMK-05', 'se cambia de pestana y el panel de destino se ve',
      cambios.every(Boolean), JSON.stringify(cambios));

    informe.comprueba('SMK-06', 'el panel no deja errores de consola',
      pagina.registro.consola.length === 0, pagina.registro.consola.slice(0, 3).join(' | '));
    informe.comprueba('SMK-07', 'el panel no deja ninguna peticion fallida',
      pagina.registro.fallidas.length === 0, pagina.registro.fallidas.slice(0, 3).join(' | '));

    /* ---------- carta publica ---------- */
    informe.seccion('humo: carta publica');
    const pub = await nuevaPagina(navegador);
    await pub.goto(url + '/', { waitUntil: 'domcontentloaded' });
    await pub.waitForLoadState('networkidle').catch(() => {});
    await pub.waitForTimeout(900);
    const carta = await pub.evaluate(() => ({
      titulo: document.title,
      platos: document.querySelectorAll('[data-price]').length,
      icono: (document.querySelector('link[rel~="icon"]') || {}).getAttribute?.('href') || null,
    }));
    informe.comprueba('SMK-08', 'la carta carga con platos', carta.platos > 0, JSON.stringify(carta));
    informe.comprueba('SMK-09', 'la carta no deja errores de consola',
      pub.registro.consola.length === 0, pub.registro.consola.slice(0, 3).join(' | '));
    informe.comprueba('SMK-10', 'la carta no deja ninguna peticion fallida',
      pub.registro.fallidas.length === 0, pub.registro.fallidas.slice(0, 3).join(' | '));

    const rIcono = await fetch(url + '/' + String(carta.icono || '').replace(/^\.?\//, ''));
    informe.comprueba('SMK-11', 'el icono de pestana responde 200', rIcono.status === 200,
      `${carta.icono} -> ${rIcono.status}`);

    /* Precio canónico: cada fila tiene que llevar su precio ya resuelto. Es la comprobación que
       destapa un cálculo de precios roto sin tener que recorrer la carta a mano. */
    const precios = await pub.evaluate(() => {
      const filas = [...document.querySelectorAll('[data-price]')];
      return { total: filas.length, conFinal: filas.filter((e) => !!e.dataset.precioFinal).length };
    });
    informe.comprueba('SMK-12', 'cada plato lleva su precio canonico',
      precios.total > 0 && precios.conFinal === precios.total, JSON.stringify(precios));

    /* ---------- modo oscuro y residuos del claro ---------- */
    informe.seccion('humo: modo oscuro');
    const oscuro = await pub.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return {
        fondo: cs.backgroundColor,
        dataTema: document.documentElement.getAttribute('data-tema'),
        interruptores: document.querySelectorAll('[data-tema-toggle], .tema, input[name="tema"]').length,
      };
    });
    const claro = /rgb\((2[0-9]{2}|1[89][0-9]), *(2[0-9]{2}|1[89][0-9]), *(2[0-9]{2}|1[89][0-9])\)/.test(oscuro.fondo);
    informe.comprueba('SMK-13', 'la carta es oscura y no trae interruptor de tema',
      !claro && oscuro.interruptores === 0 && !oscuro.dataTema, JSON.stringify(oscuro));

    const residuos = residuosEnDisco([clon.proyecto, docroot]);
    informe.comprueba('SMK-14', 'sin residuos del modo claro en fuentes ni en lo compilado',
      residuos.length === 0, residuos.slice(0, 4).join(' | '));

    await pagina.contextoQa.close().catch(() => {});
    await pub.contextoQa.close().catch(() => {});
  } finally {
    await navegador.close().catch(() => {});
    servidor.parar();
  }
  return informe;
}

if (process.argv[1] && process.argv[1].endsWith('smoke.mjs')) {
  const informe = new Informe('QA humo funcional (smoke)', 'smoke');
  const v = versiones();
  console.log(`commit ${commitActual()} · ${v.navegador} · php ${v.php}`);
  try {
    await smoke(informe);
  } finally {
    cerrarTodos();
    limpiarTemporales();
  }
  informe.aplicaPolitica();
  informe.salir();
}
