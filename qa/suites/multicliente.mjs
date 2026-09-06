/* Replicación multicliente: dar de alta clientes de verdad y comprobar que nacen limpios y
 * aislados.
 *
 * Todo pasa en carpetas temporales fuera del repositorio y se borra al terminar. Se usan sólo los
 * tres comandos locales del alta: `--destino`, `--detectar` y `--build-local`. Los dos que tocan
 * GitHub no se ejecutan nunca desde aquí — están declarados BLOCKED en el inventario con su
 * motivo, que es que su efecto es remoto e irreversible.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { NODE, carpetaTemporal } from '../lib/entorno.mjs';
import { correr } from '../lib/proc.mjs';
import {
  altaCliente, detectar, buildLocal, compilar, verificarBuild, lock, docrootDesde,
  hashesDe, comparaHashes, escribirCarta, cartaVacia, cartaCompleta, traducirInterfaz,
  hashActivacion, TOKEN_QA, CLAVE_QA,
} from '../lib/clientes.mjs';

const TERMINOS_TINGE = [/tinge/i, /turmeric/i, /\btotm\b/i, /papadum/i, /pickle tray/i, /socialcard\.es\/tinge/i];

function buscaTerminos(raiz, terminos) {
  const hallazgos = [];
  const rec = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'motor'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { rec(p); continue; }
      if (!/\.(mjs|json|php|html|css|txt|md|yml)$/.test(e.name)) continue;
      let texto;
      try { texto = readFileSync(p, 'utf8'); } catch { continue; }
      for (const re of terminos) if (re.test(texto)) hallazgos.push(`${path.relative(raiz, p)} :: ${re.source}`);
    }
  };
  rec(raiz);
  return hallazgos;
}

export async function pruebasMulticliente(informe, { proyectoSemilla, navegador, nuevaPagina }) {
  const raiz = carpetaTemporal('totm-clientes-');

  informe.seccion('alta de clientes nuevos con la herramienta real');

  const vacio = altaCliente(proyectoSemilla, raiz, 'vacio_qa', {
    nombre: 'Cafeteria Vacio QA', idiomas: 'es', impuesto: 'IVA incluido',
    alergenos: 'no', zona: 'Europe/Madrid', corte: 4, juego: false, publicidad: false,
    color: '#3F8F5B',
  });
  informe.comprueba('MC-01', 'alta del cliente vacio', vacio.ok, vacio.texto.trim().split('\n')[0]);

  const completo = altaCliente(proyectoSemilla, raiz, 'completo_qa', {
    nombre: 'Bistro Completo QA', idiomas: 'es,en', impuesto: 'IGIC incluido',
    alergenos: 'si', zona: 'Atlantic/Canary', corte: 6, juego: true, publicidad: true,
    color: '#7A4FD0',
  });
  informe.comprueba('MC-02', 'alta del cliente completo', completo.ok, completo.texto.trim().split('\n')[0]);
  if (!vacio.ok || !completo.ok) return { informe, raiz };

  /* Lo que el contrato promete de un cliente recien creado. */
  const clienteMjs = readFileSync(path.join(completo.proyecto, 'cliente.mjs'), 'utf8');
  informe.comprueba('MC-03', 'el cliente nuevo trae su propia configuracion',
    /slug: "completo_qa"/.test(clienteMjs) && /Atlantic\/Canary/.test(clienteMjs)
    && /corteHora: 6/.test(clienteMjs) && /activacionPanel: true/.test(clienteMjs),
    clienteMjs.split('\n').filter((l) => /slug|zonaHoraria|corteHora|activacionPanel/.test(l)).join(' | '));

  const estadoNuevo = JSON.parse(readFileSync(path.join(completo.proyecto, 'server', 'estado.json'), 'utf8'));
  informe.comprueba('MC-04', 'el estado nace vacio',
    Object.keys(estadoNuevo.soldOut || {}).length === 0
    && Object.keys(estadoNuevo.prices || {}).length === 0
    && estadoNuevo.actualizado === null,
    JSON.stringify(estadoNuevo).slice(0, 120));

  const privados = ['admin/clave.php', 'admin/superclave.php', 'admin/intentos.json',
    'admin/accesos.log', 'admin/marcador.json', 'record.json'];
  const heredados = privados.filter((f) => existsSync(path.join(completo.proyecto, 'server', f)));
  informe.comprueba('MC-05', 'no hereda contrasenas, registros ni marcador', heredados.length === 0, heredados.join(', '));

  const assets = readdirSync(path.join(completo.proyecto, 'assets'));
  informe.comprueba('MC-06', 'la carpeta de marca nace vacia',
    assets.length === 1 && assets[0] === '.gitkeep', assets.join(', '));

  /* El motor tiene que estar copiado byte a byte. */
  const motorSemilla = hashesDe(path.join(proyectoSemilla, 'motor'));
  const motorCliente = hashesDe(path.join(completo.proyecto, 'motor'));
  const dm = comparaHashes(motorSemilla, motorCliente);
  informe.comprueba('MC-07', 'el motor se copia byte a byte', dm.iguales,
    `cambiados: ${dm.cambiados.slice(0, 3).join(', ')} | ${motorSemilla.size} ficheros`);

  informe.seccion('contaminacion');
  const det = detectar(proyectoSemilla, completo.destino);
  informe.comprueba('MC-08', '--detectar limpio en el cliente recien creado', det.ok,
    det.texto.trim().split('\n').pop());
  const restos = buscaTerminos(completo.proyecto, TERMINOS_TINGE)
    .filter((h) => !h.startsWith('server' + path.sep) && !h.startsWith('server/'));
  informe.comprueba('MC-09', 'sin datos del restaurante semilla en los ficheros del cliente',
    restos.length === 0, restos.slice(0, 4).join(' | '));

  informe.seccion('carta, build y favicon del cliente nuevo');
  /* Con la carta como la deja el alta, el build tiene que fallar cerrado: es la guarda que
     impide publicar una carta de ejemplo. */
  const bloqueado = buildLocal(proyectoSemilla, completo.destino);
  informe.comprueba('MC-10', 'la carta de ejemplo no se puede publicar',
    !bloqueado.ok || /noPublicable/i.test(bloqueado.texto), bloqueado.texto.trim().split('\n')[0]);

  escribirCarta(vacio.proyecto, cartaVacia());
  escribirCarta(completo.proyecto, cartaCompleta());
  traducirInterfaz(completo.proyecto, 'en', 'Bistro Completo QA', 'IGIC incluido', {
    impuesto: 'IGIC included', rotulo: 'Completo QA Bistro',
    titulo: 'Completo QA Bistro — Menu', descripcion: 'Completo QA Bistro — restaurant menu.',
  });

  for (const [id, cliente, nombre] of [['MC-11', vacio, 'vacio'], ['MC-12', completo, 'completo']]) {
    const b = buildLocal(proyectoSemilla, cliente.destino);
    informe.comprueba(id, `build del cliente ${nombre}`, b.ok, b.texto.trim().split('\n').filter(Boolean).pop());
  }

  for (const [id, cliente, nombre, color] of [
    ['MC-13', vacio, 'vacio', '#3F8F5B'], ['MC-14', completo, 'completo', '#7A4FD0']]) {
    const icono = path.join(cliente.salida, 'assets', 'titleIcon-accent.svg');
    const existe = existsSync(icono);
    const texto = existe ? readFileSync(icono, 'utf8') : '';
    informe.comprueba(id, `el cliente ${nombre} tiene icono de pestana con SU color`,
      existe && texto.includes(color), existe ? `${texto.length} bytes` : 'no existe');
  }

  const vb = verificarBuild(completo.proyecto);
  informe.comprueba('MC-15', 'verificar-build del cliente nuevo', vb.ok, vb.texto.trim().split('\n').pop());
  const lk = lock(completo.proyecto);
  informe.comprueba('MC-16', 'el motor.lock del cliente nuevo cuadra', lk.ok, lk.texto.trim().split('\n').pop());

  informe.seccion('panel y carta del cliente nuevo');
  const { abrir } = await import('../lib/servidor.mjs');
  /* Se recompila con un hash de activacion conocido para poder activar el panel: es lo mismo que
     hace el despliegue real con su Secret. */
  compilar(completo.proyecto, { conActivacion: true });
  const docroot = docrootDesde(completo.salida, 'completo_qa');
  const servidor = await abrir(docroot, { gd: true, mbstring: true });
  const pagina = await nuevaPagina(navegador);
  try {
    await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(400);
    const pideToken = await pagina.evaluate(() => !!document.querySelector('input[name="token_activacion"]'));
    informe.comprueba('MC-17', 'el panel de un cliente nuevo pide el token de activacion', pideToken);

    if (pideToken) {
      await pagina.fill('input[name="token_activacion"]', 'token-que-no-es-el-bueno');
      await pagina.fill('input[name="nueva"]', CLAVE_QA);
      await pagina.click('button[type="submit"]');
      await pagina.waitForLoadState('networkidle').catch(() => {});
      await pagina.waitForTimeout(400);
      informe.comprueba('MC-18', 'un token equivocado no activa nada',
        !existsSync(path.join(docroot, 'admin', 'clave.php'))
        && /no es correcto/i.test(await pagina.evaluate(() => document.body.innerText)));

      await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
      await pagina.fill('input[name="token_activacion"]', TOKEN_QA);
      await pagina.fill('input[name="nueva"]', 'corta');
      await pagina.click('button[type="submit"]');
      await pagina.waitForLoadState('networkidle').catch(() => {});
      await pagina.waitForTimeout(400);
      informe.comprueba('MC-19', 'una clave corta no consume el token',
        !existsSync(path.join(docroot, 'admin', 'activacion.consumida')));

      await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
      await pagina.fill('input[name="token_activacion"]', TOKEN_QA);
      await pagina.fill('input[name="nueva"]', CLAVE_QA);
      await pagina.click('button[type="submit"]');
      await pagina.waitForLoadState('networkidle').catch(() => {});
      await pagina.waitForTimeout(500);
      const consumida = existsSync(path.join(docroot, 'admin', 'activacion.consumida'));
      const activacion = existsSync(path.join(docroot, 'admin', 'activacion.php'))
        ? readFileSync(path.join(docroot, 'admin', 'activacion.php'), 'utf8') : '';
      informe.comprueba('MC-20', 'el token correcto activa, se consume y el hash queda muerto',
        consumida && existsSync(path.join(docroot, 'admin', 'clave.php'))
        && !activacion.includes(hashActivacion()),
        `consumida=${consumida}`);
    }

    await pagina.goto(servidor.url + '/admin/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(300);
    if (await pagina.$('#clave')) {
      await pagina.fill('#clave', CLAVE_QA);
      await pagina.click('button[type="submit"]');
      await pagina.waitForLoadState('networkidle').catch(() => {});
      await pagina.waitForTimeout(400);
    }
    const pestanas = await pagina.evaluate(() => [...document.querySelectorAll('#tabs button')].map((b) => b.dataset.tab));
    informe.comprueba('MC-21', 'el panel del cliente nuevo abre con sus pestanas',
      pestanas.length >= 7, pestanas.join(','));

    pagina.limpiarRegistro();
    await pagina.goto(servidor.url + '/', { waitUntil: 'domcontentloaded' });
    await pagina.waitForLoadState('networkidle').catch(() => {});
    await pagina.waitForTimeout(1200);
    const carta = await pagina.evaluate(() => ({
      titulo: document.title,
      platos: document.querySelectorAll('[data-price]').length,
      alergenos: document.querySelectorAll('.alergeno').length,
    }));
    informe.comprueba('MC-22', 'la carta del cliente nuevo carga limpia',
      carta.platos > 0 && pagina.registro.consola.length === 0 && pagina.registro.fallidas.length === 0,
      `${JSON.stringify(carta)} consola=${pagina.registro.consola.join('|')} red=${pagina.registro.fallidas.join('|')}`);
    informe.comprueba('MC-23', 'los alergenos declarados salen en la carta del cliente nuevo',
      carta.alergenos > 0, `${carta.alergenos} iconos`);
  } finally {
    await pagina.contextoQa.close().catch(() => {});
    servidor.parar();
  }

  informe.seccion('aislamiento entre clientes');
  const privadosDe = (p) => hashesDe(p, (rel) => /^(cliente\.mjs|carta\.json|menu\.md|i18n\..*\.mjs|assets\/|server\/)/.test(rel));
  const antesVacio = privadosDe(vacio.proyecto);
  /* Se toca a fondo el cliente completo: carta, estado y marca. */
  const estadoCompleto = path.join(completo.proyecto, 'server', 'estado.json');
  const e = JSON.parse(readFileSync(estadoCompleto, 'utf8'));
  e.marca = { nombreVisible: 'Bistro Completo QA', rotuloVisible: 'Tocado por la bateria', colorPrincipal: '#7A4FD0' };
  e.soldOut = { d_falso: '2026-01-01' };
  writeFileSync(estadoCompleto, JSON.stringify(e, null, 2));
  appendFileSync(path.join(completo.proyecto, 'carta.json'), '\n');
  const despuesVacio = privadosDe(vacio.proyecto);
  const aislado1 = comparaHashes(antesVacio, despuesVacio);
  informe.comprueba('MC-24', 'tocar el cliente completo no toca al vacio', aislado1.iguales,
    `cambiados: ${aislado1.cambiados.join(', ')}`);

  const antesCompleto = privadosDe(completo.proyecto);
  const estadoVacio = path.join(vacio.proyecto, 'server', 'estado.json');
  const v = JSON.parse(readFileSync(estadoVacio, 'utf8'));
  v.marca = { nombreVisible: 'Cafeteria Vacio QA', rotuloVisible: 'Tambien tocado', colorPrincipal: '#3F8F5B' };
  writeFileSync(estadoVacio, JSON.stringify(v, null, 2));
  const despuesCompleto = privadosDe(completo.proyecto);
  const aislado2 = comparaHashes(antesCompleto, despuesCompleto);
  informe.comprueba('MC-25', 'tocar el cliente vacio no toca al completo', aislado2.iguales,
    `cambiados: ${aislado2.cambiados.join(', ')}`);

  informe.seccion('actualizacion del motor y vuelta atras');
  const origen = carpetaTemporal('totm-motor-');
  for (const f of ['motor', 'gen.mjs', 'importar.mjs', 'motor.lock', 'cliente.mjs', 'carta.json']) {
    cpSync(path.join(proyectoSemilla, f), path.join(origen, f), { recursive: true });
  }
  for (const f of readdirSync(proyectoSemilla).filter((x) => /^i18n\..*\.mjs$/.test(x))) {
    cpSync(path.join(proyectoSemilla, f), path.join(origen, f));
  }
  appendFileSync(path.join(origen, 'motor', 'banderas.mjs'),
    '\n/* marca de version de prueba de la bateria; sin efecto funcional */\n');
  const lockOrigen = correr(NODE, ['motor/lock.mjs', '--escribir', '--version', '9.9.9'], { cwd: origen });
  informe.comprueba('MC-26', 'se prepara un motor de origen con su propio lock', lockOrigen.ok,
    lockOrigen.texto.trim().split('\n').pop());

  /* El actualizador exige un arbol git limpio: se inicializa uno en la copia desechable. */
  const gitEn = (args) => correr('git', args, { cwd: completo.proyecto });
  gitEn(['init', '-q', '-b', 'main']);
  gitEn(['-c', 'user.email=qa@local', '-c', 'user.name=QA', 'add', '-A']);
  gitEn(['-c', 'user.email=qa@local', '-c', 'user.name=QA', 'commit', '-qm', 'estado inicial de la prueba']);

  const datosAntes = privadosDe(completo.proyecto);
  const arbolAntes = hashesDe(completo.proyecto, (rel) => !rel.startsWith('.git/'));
  const upd = correr(NODE, ['motor/actualizar.mjs', '--desde', origen], { cwd: completo.proyecto });
  informe.comprueba('MC-27', 'la actualizacion del motor termina bien', upd.ok, upd.texto.trim().split('\n')[0]);
  const datosDespues = privadosDe(completo.proyecto);
  const dd = comparaHashes(datosAntes, datosDespues);
  informe.comprueba('MC-28', 'la actualizacion no toca ningun dato privado', dd.iguales,
    `cambiados: ${dd.cambiados.join(', ')}`);
  const estadoGit = gitEn(['status', '--short']).salida.trim().split('\n').filter(Boolean);
  const fueraDelMotor = estadoGit.filter((l) => !/motor\.lock|motor\//.test(l));
  informe.comprueba('MC-29', 'solo cambian motor/** y motor.lock', fueraDelMotor.length === 0,
    estadoGit.join(' | '));

  for (const punto of ['tras-m1', 'tras-m3', 'tras-m5']) {
    const antes = hashesDe(completo.proyecto, (rel) => !rel.startsWith('.git/'));
    const r = correr(NODE, ['motor/actualizar.mjs', '--desde', origen],
      { cwd: completo.proyecto, env: { ...process.env, MOTOR_FALLO_PRUEBA: punto } });
    const despues = hashesDe(completo.proyecto, (rel) => !rel.startsWith('.git/'));
    const igual = comparaHashes(antes, despues);
    const residuos = readdirSync(completo.proyecto).filter((f) => f.startsWith('.motor.'));
    informe.comprueba(`MC-30-${punto}`, `un fallo en ${punto} deja el arbol byte a byte como estaba`,
      !r.ok && igual.iguales && residuos.length === 0,
      `salida=${r.codigo} cambiados=${igual.cambiados.join(',')} residuos=${residuos.join(',')}`);
  }

  informe.comprueba('MC-31', 'el arbol del cliente sigue teniendo los mismos ficheros que antes de las pruebas de fallo',
    comparaHashes(arbolAntes, hashesDe(completo.proyecto, (rel) => !rel.startsWith('.git/'))).perdidos.length === 0);

  informe.blocked('MC-32', '--publicar-github y --cerrar-activacion',
    'efecto remoto inevitable: la fase 17 prohibe cualquier operacion remota');

  /* El inventario declara tres BLOCKED y la pasada tiene que enseñar los tres. Uno que estuviera
     sólo en el catálogo y nunca en la salida sería una deuda invisible: quien lee el log vería una
     cobertura mejor de la que hay. */
  informe.blocked('MC-33', 'motor/migrar.mjs: salto de esquema de datos',
    'no hay hoy un motor con otro esquemaCarta contra el que migrar; se probara cuando exista');

  return { informe, raiz, vacio, completo };
}
