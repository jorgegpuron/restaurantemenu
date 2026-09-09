/* `npm --prefix qa run full` — la bateria completa.
 *
 * Orden pensado, no casual:
 *   1. lo rapido primero, para no montar un navegador si la sintaxis ya esta rota;
 *   2. un clon de Tinge compilado y servido, con GD y mbstring: la matriz del panel, los lotes,
 *      los anchos, el modo oscuro y la carta publica;
 *   3. el MISMO docroot servido sin mbstring y sin GD: es lo unico que distingue esos dos
 *      entornos, asi que cualquier diferencia es del interprete, no del contenido;
 *   4. clientes nuevos de verdad, aislamiento y actualizacion del motor;
 *   5. los defectos que siguen abiertos.
 *
 * Al final se apaga todo y se comprueba que el repositorio esta igual que al empezar.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Informe } from '../lib/informe.mjs';
import {
  CLIENTE, SALIDA, QA, MOTOR, carpetaTemporal, limpiarTemporales, temporalesVivos,
  versiones, commitActual, chromePath, PHP,
} from '../lib/entorno.mjs';
import { correr } from '../lib/proc.mjs';
import { abrir, cerrarTodos, capacidadesPhp } from '../lib/servidor.mjs';
import { abrirNavegador, nuevaPagina } from '../lib/navegador.mjs';
import { fabricarFixtures } from '../lib/fixtures.mjs';
import { clonarTinge, compilar, docrootDesde, hashesDe, comparaHashes, CLAVE_QA } from '../lib/clientes.mjs';
import { fast, MOTIVO_SIN_SALIDA } from './fast.mjs';
import { pruebasAdmin, pruebasSuperadmin, entrarAlPanel } from './admin.mjs';
import { pruebasResponsive } from './responsive.mjs';
import { pruebasOscuro } from './oscuro.mjs';
import { pruebasCarta } from './carta.mjs';
import { pruebasMulticliente } from './multicliente.mjs';
import { pruebasConocidos } from './conocidos.mjs';
import { bateriaE2E } from './admin-e2e.mjs';
import * as lotes from './lotes.mjs';

export async function full(informe = new Informe('QA completa (full)'), opciones = {}) {
  const { conFast = true } = opciones;
  const antesRepo = hashesDe(CLIENTE, (rel) => !rel.startsWith('qa/') && !rel.startsWith('.git/'));
  const antesSalida = hashesDe(SALIDA);

  if (conFast) await fast(informe);

  const caps = capacidadesPhp();
  if (!caps.hayPhp) {
    informe.blocked('FULL-00', 'toda la bateria funcional', 'no hay PHP en el PATH');
    return informe;
  }
  if (!chromePath()) {
    informe.blocked('FULL-00', 'toda la bateria funcional', 'no se encuentra Chrome; define CHROME_PATH');
    return informe;
  }

  const fixturesDir = carpetaTemporal('totm-fix-');
  const fixtures = fabricarFixtures(fixturesDir);
  informe.seccion('preparacion');
  informe.comprueba('FULL-01', 'fixtures de imagen fabricadas',
    Object.keys(fixtures).length >= 9, Object.keys(fixtures).join(', '));
  informe.comprueba('FULL-02', 'este PHP puede correr con y sin mbstring',
    caps.mbstring && caps.sinMbstring,
    `mbstring=${caps.mbstring} se_puede_quitar=${caps.sinMbstring} gd=${caps.gd}`);

  const clon = clonarTinge();
  const c = compilar(clon.proyecto, { conActivacion: false });
  informe.comprueba('FULL-03', 'clon de Tinge compilado', c.gen.ok, c.gen.texto.trim().split('\n').pop());
  if (!c.gen.ok) return informe;

  const docroot = docrootDesde(clon.salida, 'tinge_qa');
  /* CADA servidor PHP con su carpeta de sesiones. Sin esto usan la del sistema y la comparten:
     el recolector de sesiones de uno borra las del otro, y el panel devuelve al login a mitad
     de una prueba. El sintoma no se parecia en nada a la causa —«las ocho pantallas» decia
     cero pestañas— y fallaba dos veces de cada tres, que es lo peor que puede pasar. Las
     suites de e2e ya lo hacian asi; aqui faltaba. */
  const sesionesDe = (nombre) => path.join(carpetaTemporal('totm-sess-' + nombre + '-'), 's');
  const navegador = await abrirNavegador();

  try {
    /* ---------- entorno completo: GD + mbstring ---------- */
    const srv = await abrir(docroot, { gd: true, mbstring: true, subidaMax: '8M', postMax: '10M', sesionesDir: sesionesDe('principal') });
    const pagina = await nuevaPagina(navegador);
    const ctx = { pagina, servidor: srv, docroot, fixtures };
    await entrarAlPanel(pagina, srv.url);
    await pruebasAdmin(informe, ctx);
    await lotes.lote1(informe, ctx);
    await lotes.lote2(informe, ctx);
    await lotes.lote3(informe, ctx);
    await lotes.lote6(informe, ctx);
    await lotes.lote7(informe, ctx);
    await lotes.lote8(informe, ctx);
    await lotes.lote9(informe, ctx);
    await pruebasResponsive(informe, { pagina, servidor: srv });
    await pruebasOscuro(informe, { pagina, servidor: srv, raicesDisco: [MOTOR, docroot] });
    await pruebasCarta(informe, { pagina, servidor: srv, docroot });
    await pagina.contextoQa.close().catch(() => {});
    srv.parar();

    /* ---------- el mismo docroot con el tope de subida del hosting mas pequeno ---------- */
    const srvTope = await abrir(docroot, { gd: true, mbstring: true, subidaMax: '2M', postMax: '2M', sesionesDir: sesionesDe('tope') });
    const pagTope = await nuevaPagina(navegador);
    await entrarAlPanel(pagTope, srvTope.url);
    await lotes.lote4(informe, { pagina: pagTope, servidor: srvTope, docroot, fixtures });
    await pagTope.contextoQa.close().catch(() => {});
    srvTope.parar();

    /* ---------- sin mbstring: mismo contenido, otro interprete ---------- */
    if (caps.sinMbstring) {
      const srvSinMb = await abrir(docroot, { gd: true, mbstring: false, sesionesDir: sesionesDe('sinmb') });
      const pagSinMb = await nuevaPagina(navegador);
      const pest = await entrarAlPanel(pagSinMb, srvSinMb.url);
      informe.seccion('sin mbstring');
      informe.comprueba('E2-01', 'sin mbstring siguen estando las ocho pantallas',
        pest.length === 8, pest.join(','));
      informe.comprueba('E2-02', 'sin mbstring siguen renderizandose los ocho paneles',
        await pagSinMb.evaluate(() => document.querySelectorAll('section.pane').length) === 8);
      const dias = await pagSinMb.evaluate(async () => {
        await fetch('/admin/?t=ofertas').then((x) => x.text());
        return null;
      }).then(async () => {
        await pagSinMb.goto(srvSinMb.url + '/admin/?t=ofertas', { waitUntil: 'domcontentloaded' });
        await pagSinMb.waitForTimeout(250);
        return pagSinMb.evaluate(() => [...document.querySelectorAll('.adm-dia span[aria-hidden="true"]')].map((s) => s.textContent.trim()));
      });
      informe.comprueba('E2-03', 'sin mbstring las iniciales de los dias salen bien',
        dias.length === 7 && dias.every((d) => d.length === 1), dias.join(' '));
      await lotes.lote8(informe, { pagina: pagSinMb, servidor: srvSinMb, docroot, fixtures });
      await pruebasResponsive(informe, { pagina: pagSinMb, servidor: srvSinMb, etiqueta: 'sin mbstring' });
      const avisosSinMb = srvSinMb.avisos();
      informe.comprueba('E2-04', 'sin mbstring no hay ningun error fatal ni aviso de PHP',
        avisosSinMb.length === 0, avisosSinMb.slice(0, 3).join(' | '));
      await pagSinMb.contextoQa.close().catch(() => {});
      srvSinMb.parar();
    } else {
      informe.blocked('E2-01', 'panel sin mbstring', 'este PHP trae mbstring compilada y no se puede quitar');
    }

    /* ---------- sin GD: la portada tiene que rechazarse sin tocar el estado ---------- */
    const srvSinGd = await abrir(docroot, { gd: false, mbstring: true, sesionesDir: sesionesDe('singd') });
    const pagSinGd = await nuevaPagina(navegador);
    await entrarAlPanel(pagSinGd, srvSinGd.url);
    await lotes.lote1(informe, { pagina: pagSinGd, servidor: srvSinGd, docroot, fixtures });
    await pagSinGd.contextoQa.close().catch(() => {});
    srvSinGd.parar();

    /* ---------- superadministrador, en su propio docroot ---------- */
    const docSuper = docrootDesde(clon.salida, 'tinge_super');
    const claveSuper = 'clave-super-qa-4321';
    const hashSuper = correr(PHP, ['-r', `echo password_hash(${JSON.stringify(claveSuper)}, PASSWORD_DEFAULT);`]).salida.trim();
    const srvSuper = await abrir(docSuper, { gd: true, mbstring: true, sesionesDir: sesionesDe('super') });
    const { writeFileSync } = await import('node:fs');
    const pagSuper = await nuevaPagina(navegador);
    /* El orden importa: PRIMERO la contrasena del restaurante y DESPUES el superadministrador. Con
       superclave.php ya puesto, la pantalla de primera vez pide tambien la del super —es la guarda
       que impide que el primero que encuentre la URL se quede con el panel— y la prueba estaria
       montando un caso distinto del que quiere medir.
       El fichero define SUPERADMIN_HASH, que es el nombre que lee el panel; la variable de entorno
       del hosting se llama SUPERADMIN_PASSWORD_HASH y manda sobre el fichero cuando existe. */
    await entrarAlPanel(pagSuper, srvSuper.url);
    /* Comillas SIMPLES, como hace el propio panel al escribir este fichero. Un hash de bcrypt es
       `$2y$10$<sal><resumen>`, y entre comillas dobles PHP se come todo lo que parezca una
       variable: la constante se quedaba a medias y el super nunca entraba. */
    const enPhp = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    writeFileSync(path.join(docSuper, 'admin', 'superclave.php'),
      `<?php\ndefine('SUPERADMIN_HASH', ${enPhp(hashSuper)});\n`);
    await pruebasSuperadmin(informe, { pagina: pagSuper, servidor: srvSuper, docroot: docSuper, clave: claveSuper });
    await pagSuper.contextoQa.close().catch(() => {});
    srvSuper.parar();

    /* ---------- modo demo ---------- */
    const docDemo = docrootDesde(clon.salida, 'tinge_demo');
    const cfg = path.join(docDemo, 'admin', 'config.php');
    const { readFileSync } = await import('node:fs');
    writeFileSync(cfg, readFileSync(cfg, 'utf8').replace("define('DEMO_SIN_CLAVE', false);", "define('DEMO_SIN_CLAVE', true);"));
    const srvDemo = await abrir(docDemo, { gd: true, mbstring: true, sesionesDir: sesionesDe('demo') });
    const pagDemo = await nuevaPagina(navegador);
    informe.seccion('modo demo');
    await pagDemo.goto(srvDemo.url + '/admin/', { waitUntil: 'domcontentloaded' });
    await pagDemo.waitForTimeout(400);
    const enDemo = await pagDemo.evaluate(() => !document.querySelector('#clave')
      && document.querySelectorAll('#adm-sidebar [data-tab]').length > 0);
    informe.comprueba('DEMO-01', 'el modo demo entra sin contrasena', enDemo);
    if (enDemo) {
      const corta = await pagDemo.evaluate(async () => {
        const csrf = document.querySelector('input[name="csrf"]').value;
        const fd = new URLSearchParams();
        fd.set('csrf', csrf); fd.set('salir_demo', '1'); fd.set('clave_nueva', 'corta');
        const r = await fetch('/admin/index.php', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        return /al menos 8/.test(await r.text());
      });
      informe.comprueba('DEMO-02', 'salir del demo con una clave corta se rechaza', corta);
      await pagDemo.evaluate(async (clave) => {
        const csrf = document.querySelector('input[name="csrf"]').value;
        const fd = new URLSearchParams();
        fd.set('csrf', csrf); fd.set('salir_demo', '1'); fd.set('clave_nueva', clave);
        await fetch('/admin/index.php', { method: 'POST', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((x) => x.text());
      }, CLAVE_QA);
      await pagDemo.goto(srvDemo.url + '/admin/', { waitUntil: 'domcontentloaded' });
      await pagDemo.waitForTimeout(400);
      informe.comprueba('DEMO-03', 'con una clave valida el demo se cierra y el panel pide contrasena',
        await pagDemo.evaluate(() => !!document.querySelector('#clave')));
    }
    await pagDemo.contextoQa.close().catch(() => {});
    srvDemo.parar();

    /* ---------- clientes nuevos, aislamiento y actualizacion ---------- */
    const mc = await pruebasMulticliente(informe, { proyectoSemilla: clon.proyecto, navegador, nuevaPagina });

    /* ---------- auditoria E2E exhaustiva del administrador (Fase A) ---------- */
    informe.seccion('E2E exhaustiva del administrador');
    await bateriaE2E(informe, { clon, fixtures, navegador });

    /* ---------- defectos abiertos ---------- */
    /* Se mira el cliente VACIO y no el completo: el completo pasa por la prueba del actualizador y
       acaba con la version del motor de origen, que es un cambio legitimo. El vacio conserva el
       lock tal y como lo dejo el alta, que es lo que E3 describe. */
    pruebasConocidos(informe, { clienteNuevo: mc && mc.vacio ? mc.vacio.proyecto : null });
  } finally {
    await navegador.close().catch(() => {});
    const cerrados = cerrarTodos();
    informe.seccion('limpieza');
    informe.pass('FULL-90', `servidores PHP cerrados: ${cerrados}`);
    const borrados = limpiarTemporales();
    const vivos = temporalesVivos();
    informe.comprueba('FULL-91', 'todas las carpetas temporales se han borrado',
      vivos.length === 0, `borradas ${borrados.length}, vivas ${vivos.length}`);
  }

  informe.seccion('el repositorio sigue intacto');
  const dr = comparaHashes(antesRepo, hashesDe(CLIENTE, (rel) => !rel.startsWith('qa/') && !rel.startsWith('.git/')));
  informe.comprueba('FULL-92', 'ningun fichero del producto ha cambiado durante la bateria',
    dr.iguales, `cambiados: ${dr.cambiados.join(', ')} | nuevos: ${dr.nuevos.join(', ')}`);
  if (!existsSync(SALIDA)) {
    informe.noAplica('FULL-93', 'el 2-subir publicado no ha cambiado', MOTIVO_SIN_SALIDA);
  } else {
    const despuesSalida = hashesDe(SALIDA);
    const ds = comparaHashes(antesSalida, despuesSalida);
    /* `hashesDe` devuelve un Map: `Object.keys` sobre un Map siempre da cero, asi que el
       detalle decia «0 ficheros» pasara lo que pasara, y ademas solo nombraba los CAMBIADOS
       — cuando lo que suele pasar aqui es que APAREZCAN ficheros (los de ejecucion que deja
       el panel: clave.php, accesos.log, intentos.json, estado.json). El fallo era real y el
       mensaje lo tapaba: cinco pasadas seguidas achacandolo a un artefacto. */
    informe.comprueba('FULL-93', 'el 2-subir publicado no ha cambiado', ds.iguales,
      `${despuesSalida.size} ficheros | cambiados: ${ds.cambiados.join(', ') || '(ninguno)'}`
      + ` | nuevos: ${ds.nuevos.join(', ') || '(ninguno)'}`
      + ` | perdidos: ${ds.perdidos.join(', ') || '(ninguno)'}`);
  }
  const dc = correr('git', ['diff', '--check'], { cwd: CLIENTE });
  informe.comprueba('FULL-94', 'git diff --check sigue limpio', dc.ok && !dc.salida.trim(), dc.texto.trim());

  return informe;
}

if (process.argv[1] && process.argv[1].endsWith('full.mjs')) {
  const informe = new Informe('QA completa (full)', 'full');
  const v = versiones();
  console.log(`commit ${commitActual()} · node ${v.node} · php ${v.php} · ${v.navegador}`);
  try {
    await full(informe);
  } finally {
    cerrarTodos();
    limpiarTemporales();
  }
  informe.aplicaPolitica();
  informe.salir();
}
