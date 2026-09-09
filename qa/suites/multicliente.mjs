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
import { NODE, CLIENTE, MOTOR, carpetaTemporal } from '../lib/entorno.mjs';
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
    const pestanas = await pagina.evaluate(() => [...document.querySelectorAll('#adm-sidebar [data-tab]')].map((b) => b.dataset.tab));
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

  /* ================================================================= GATE MULTICLIENTE
   * Tinge es el MODELO BASE del que se replican los demas restaurantes, y `MC-07` ya comprueba
   * que el motor se copia byte a byte. Las dos cosas juntas tienen una consecuencia que hay que
   * vigilar: cualquier rastro de Tinge dentro de `motor/**` viaja a TODOS los clientes.
   *
   * Y nadie lo miraba. `buscaTerminos` salta la carpeta `motor` —mira los ficheros DEL cliente—,
   * `MC-09` filtra ademas `server/**`, y `--detectar` tampoco entra ahi: eso ultimo es el
   * defecto conocido `E4`. Este bloque cierra el hueco desde el otro lado.
   *
   * Encontro algo la primera vez que corrio: la hoja de alta de este mismo release traia
   * `placeholder="Ej. Papadum de la casa"`. Un plato de Tinge, en texto visible, dentro del
   * motor. Una cafeteria habria visto un papadum de ejemplo en su panel. */
  informe.seccion('gate multicliente: el motor no puede ser de Tinge');
  {
    /* Solo CODIGO servido. La prosa de los comentarios nombra a Tinge a menudo, y hace bien:
       explica de donde viene cada decision. Lo que no puede haber es un dato del restaurante
       semilla en lo que se ejecuta o se ve. Asi que se quitan los comentarios antes de buscar. */
    const sinComentarios = (t) => t
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
      .replace(/<!--[\s\S]*?-->/g, ' ');

    const ficherosDelMotor = [];
    const recMotor = (dir) => {
      if (!existsSync(dir)) return;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { recMotor(p); continue; }
        if (/\.(mjs|php|html|css|js)$/.test(e.name)) ficherosDelMotor.push(p);
      }
    };
    recMotor(MOTOR);
    const codigo = new Map();
    for (const p of ficherosDelMotor) {
      try { codigo.set(path.relative(MOTOR, p), sinComentarios(readFileSync(p, 'utf8'))); } catch { /* ilegible */ }
    }
    const buscaEnCodigo = (terminos) => {
      const out = [];
      for (const [rel, t] of codigo) for (const re of terminos) if (re.test(t)) out.push(`${rel} :: ${re.source}`);
      return out;
    };

    /* 1. Ni el nombre del restaurante semilla, ni sus platos, ni su dominio. */
    const rastros = buscaEnCodigo(TERMINOS_TINGE);
    informe.comprueba('MC-40', 'el motor no lleva el nombre, los platos ni el dominio del restaurante semilla en codigo servido',
      rastros.length === 0, rastros.slice(0, 5).join(' | ') || `${codigo.size} ficheros del motor revisados`);

    /* 2. Ni los nombres de SUS categorias y secciones: la estructura viene de carta.json, no del
          motor, asi que el panel no puede reconocer ninguna por su nombre. */
    let nombresCarta = [];
    try {
      const carta = JSON.parse(readFileSync(path.join(CLIENTE, 'carta.json'), 'utf8'));
      const vistos = new Set();
      const recCarta = (o) => {
        if (Array.isArray(o)) { o.forEach(recCarta); return; }
        if (!o || typeof o !== 'object') return;
        for (const [k, v] of Object.entries(o)) {
          if (typeof v === 'string' && v.length >= 6
              && /^(tab|tabName|pestana|seccion|category|categoria|cat|catName)$/.test(k)) vistos.add(v);
          recCarta(v);
        }
      };
      recCarta(carta);
      nombresCarta = [...vistos];
    } catch { nombresCarta = []; }
    const conNombres = [];
    for (const [rel, t] of codigo) for (const n of nombresCarta) if (t.includes(n)) conNombres.push(`${rel} :: «${n}»`);
    informe.comprueba('MC-41', 'el motor no reconoce ninguna categoria ni seccion concreta de la carta semilla',
      conNombres.length === 0,
      conNombres.slice(0, 5).join(' | ') || `${nombresCarta.length} nombres de la carta buscados en ${codigo.size} ficheros`);

    /* 3. Ni sus cantidades: 312 platos, 13 secciones y 40 categorias son de ESTA carta. Si el
          motor las diera por supuestas, otro restaurante se romperia en silencio. */
    const cifras = buscaEnCodigo([/\b312\b/, /\b13\s*(pestanas|secciones)\b/i, /\b40\s*categorias\b/i]);
    informe.comprueba('MC-42', 'el motor no da por supuestas las cantidades de la carta semilla (312 platos, 13 secciones, 40 categorias)',
      cifras.length === 0, cifras.slice(0, 5).join(' | ') || 'ninguna cifra de la carta semilla en codigo servido');

    /* 4. Las siete colecciones nuevas del estado son del ESQUEMA, no de este cliente: un cliente
          recien creado nace con la misma plantilla. Se mira el panel DEL CLIENTE NUEVO. */
    const panelNuevo = path.join(completo.proyecto, 'motor', 'server', 'admin', 'index.php');
    const SIETE = ['orden', 'retirados', 'categorias', 'pestanas', 'nuevos', 'editados', 'secciones'];
    let plantilla = [];
    if (existsSync(panelNuevo)) {
      const t = readFileSync(panelNuevo, 'utf8');
      plantilla = SIETE.filter((k) => new RegExp("'" + k + "'\\s*=>").test(t));
    }
    informe.comprueba('MC-43', 'las siete colecciones nuevas del estado son del esquema generico: un cliente recien creado nace con las mismas',
      plantilla.length === SIETE.length, plantilla.join(', ') || 'no se encontro la plantilla del estado en el cliente nuevo');

    /* 5. `pestanaId` no es de Tinge: `importar.mjs` lo acuña para cualquier carta. Se comprueba
          sobre la del cliente COMPLETO, que es otra carta, otros idiomas y otra cocina. */
    const ids = { pestanas: 0, conId: 0, formato: true };
    try {
      const c = JSON.parse(readFileSync(path.join(completo.proyecto, 'carta.json'), 'utf8'));
      const lista = Array.isArray(c.tabs) ? c.tabs : (Array.isArray(c.pestanas) ? c.pestanas : []);
      ids.pestanas = lista.length;
      for (const p of lista) {
        const v = p && (p.pestanaId || p.tabId);
        if (v) { ids.conId++; if (!/^t_[0-9a-f]{32}$/.test(v)) ids.formato = false; }
      }
    } catch { /* se ve en el detalle */ }
    informe.comprueba('MC-44', 'pestanaId se acuña igual en la carta de otro cliente, con el mismo formato',
      ids.pestanas > 0 && ids.conId === ids.pestanas && ids.formato, JSON.stringify(ids));

    /* 6. Los alergenos los decide la CONFIGURACION del cliente: el vacio declara 'no' y el
          completo 'si'. Que los del completo se pinten ya lo comprueba `MC-23`. */
    const leyendas = {};
    for (const [etq, cli] of [['vacio', vacio], ['completo', completo]]) {
      try {
        const t = readFileSync(path.join(cli.proyecto, 'cliente.mjs'), 'utf8');
        /* El alta escribe la linea con `JSON.stringify`, o sea con comillas DOBLES:
           `alergenos: { leyenda: [], enOrigen: "si" },`. La semilla las lleva simples. Se
           admiten las dos, que es lo unico que cambia entre un fichero escrito a mano y uno
           generado. */
        const m = /alergenos:\s*\{[\s\S]*?enOrigen:\s*["'](si|no)["']/.exec(t);
        leyendas[etq] = m ? m[1] : '?';
      } catch { leyendas[etq] = '?'; }
    }
    informe.comprueba('MC-45', 'los alergenos los decide la configuracion de cada cliente, no el motor',
      leyendas.vacio === 'no' && leyendas.completo === 'si', JSON.stringify(leyendas));

    /* 7. Y que el panel del cliente nuevo es EXACTAMENTE el del motor: sin esto, todo lo
          anterior valdria solo para Tinge. `MC-07` lo dice del conjunto; aqui se nombra el
          fichero donde aparecio el papadum. */
    let mismoPanel = false;
    try {
      mismoPanel = readFileSync(panelNuevo, 'utf8')
        === readFileSync(path.join(MOTOR, 'server', 'admin', 'index.php'), 'utf8');
    } catch { mismoPanel = false; }
    informe.comprueba('MC-46', 'el panel del cliente nuevo es exactamente el del motor: lo que se arregle aqui llega a todos',
      mismoPanel, mismoPanel ? 'identico' : 'el panel del cliente nuevo NO coincide con el del motor');
  }

  informe.blocked('MC-32', '--publicar-github y --cerrar-activacion',
    'efecto remoto inevitable: la fase 17 prohibe cualquier operacion remota');

  /* El inventario declara tres BLOCKED y la pasada tiene que enseñar los tres. Uno que estuviera
     sólo en el catálogo y nunca en la salida sería una deuda invisible: quien lee el log vería una
     cobertura mejor de la que hay. */
  informe.blocked('MC-33', 'motor/migrar.mjs: salto de esquema de datos',
    'no hay hoy un motor con otro esquemaCarta contra el que migrar; se probara cuando exista');

  return { informe, raiz, vacio, completo };
}
