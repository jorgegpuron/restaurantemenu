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
import { NODE, PHP, CLIENTE, MOTOR, carpetaTemporal } from '../lib/entorno.mjs';
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

  /* El icono de pestana de un cliente que NO trae el suyo.
   *
   * Hasta el 15 sep 2026 esto contrataba que el respaldo llevara el color de marca DEL
   * CLIENTE: el motor dibujaba una tarjeta de carta con tres renglones en su Primario.
   * Correcta, y anonima -- una copia salia con un generico que no dice de quien es el
   * producto. El propietario lo vio en la primera copia real y pidio lo contrario: que las
   * copias nazcan con la marca de SocialCard.
   *
   * Asi que ahora se contrata la IDENTIDAD, no el color: byte a byte el mismo fichero que el
   * motor lleva dentro. Comparar bytes y no buscar un color es lo que hace que esto siga
   * valiendo el dia que la marca cambie de dibujo. */
  const marcaDelMotor = readFileSync(path.join(proyectoSemilla, 'motor', 'iconos', 'marca-socialcard.svg'));
  for (const [id, cliente, nombre] of [['MC-13', vacio, 'vacio'], ['MC-14', completo, 'completo']]) {
    const icono = path.join(cliente.salida, 'assets', 'titleIcon-accent.svg');
    const existe = existsSync(icono);
    const bytes = existe ? readFileSync(icono) : Buffer.alloc(0);
    informe.comprueba(id, `el cliente ${nombre}, que no trae icono propio, nace con la marca de SocialCard`,
      existe && bytes.equals(marcaDelMotor),
      existe ? `${bytes.length} bytes · identico al del motor: ${bytes.equals(marcaDelMotor)}` : 'no existe');
  }

  /* La otra mitad, que no miraba nadie: un cliente que SI trae el suyo se queda con el suyo.
     Sin esto, un respaldo que pisara el icono del restaurante pasaria las dos de arriba y
     nadie se enteraria hasta verlo en la pestana del navegador. */
  {
    const propio = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
      + '<rect width="16" height="16" fill="#123456"/></svg>\n';
    const destinoAssets = path.join(completo.proyecto, 'assets');
    mkdirSync(destinoAssets, { recursive: true });
    writeFileSync(path.join(destinoAssets, 'titleIcon-accent.svg'), propio);
    const b = buildLocal(proyectoSemilla, completo.destino);
    const icono = path.join(completo.salida, 'assets', 'titleIcon-accent.svg');
    const servido = existsSync(icono) ? readFileSync(icono, 'utf8') : '';
    informe.comprueba('MC-13b', 'un cliente que trae su propio icono conserva el suyo, no el del motor',
      b.ok && servido === propio,
      `build ${b.ok ? 'ok' : 'falla'} · ${servido.length} bytes · propio: ${servido === propio}`);
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

  /* ============================================ licencia y llave maestra del propietario
   * Las dos son multicliente y las dos van por caminos OPUESTOS a proposito, asi que el sitio
   * de vigilarlas es aqui y no en la bateria del panel:
   *
   *   - admin/superadmin.php  lo GENERA el build desde un Secret y TIENE que subir por FTP.
   *     Es la misma llave en todos los clientes: por eso un alta nueva nace con el acceso del
   *     propietario puesto.
   *   - admin/licencia.php    lo escribe el PANEL en produccion, el build no lo genera jamas
   *     y el FTP lo excluye. Es el contrato de ese cliente, y pisarlo lo devolveria atras.
   *
   * Confundirlos es el fallo caro: generar licencia.php borraria contratos en cada despliegue,
   * y excluir superadmin.php dejaria al propietario sin llave en los clientes nuevos. */
  informe.seccion('licencia y llave maestra: dos ficheros con caminos opuestos');
  {
    const sinSecret = { ...process.env };
    delete sinSecret.SUPERADMIN_PASSWORD_HASH;
    sinSecret.PANEL_ACTIVACION_HASH = hashActivacion();
    const g0 = correr(NODE, ['gen.mjs'], { cwd: completo.proyecto, env: sinSecret });
    const hay0 = existsSync(path.join(completo.salida, 'admin', 'superadmin.php'));
    informe.comprueba('MC-50', 'sin el Secret no se escribe la llave maestra y el build NO se aborta: avisa y sigue',
      g0.ok && !hay0 && /::warning::.*SUPERADMIN_PASSWORD_HASH/.test(g0.texto),
      `codigo ${g0.codigo} | superadmin.php ${hay0 ? 'presente' : 'ausente'}`);

    /* Un hash bcrypt de verdad, no una cadena cualquiera: lleva `$` y es justo lo que rompia
       la primera version de esto. En una cadena PHP de comillas dobles, `$2y$10$abc...` se
       interpola y la constante se queda en `$2y$10`. Se comprueba leyendolo CON PHP y
       verificando la contrasena, que es lo unico que demuestra que llego entero. */
    const claveMaestra = 'llave-maestra-qa-1234';
    const hashMaestra = correr(PHP, ['-r', `echo password_hash(${JSON.stringify(claveMaestra)}, PASSWORD_DEFAULT);`]).salida.trim();
    const conSecret = { ...sinSecret, SUPERADMIN_PASSWORD_HASH: hashMaestra };
    const g1 = correr(NODE, ['gen.mjs'], { cwd: completo.proyecto, env: conSecret });
    const fSuper = path.join(completo.salida, 'admin', 'superadmin.php');
    const leido = existsSync(fSuper)
      ? correr(PHP, ['-r', `require ${JSON.stringify(fSuper)}; var_dump(password_verify(${JSON.stringify(claveMaestra)}, SUPERADMIN_HASH));`])
      : { texto: 'no se genero el fichero' };
    informe.comprueba('MC-51', 'con el Secret, la llave maestra se genera y llega INTACTA a PHP: el hash con $ no se interpola',
      g1.ok && existsSync(fSuper) && /bool\(true\)/.test(leido.texto), leido.texto.trim().split('\n').slice(-1)[0]);

    /* Y el reves, que es el fallo que de verdad se pago: compilar CON el Secret y despues SIN
       el tiene que DEJAR DE PUBLICAR la llave, no conservar la vieja. generado/ es la carpeta
       intermedia y viaja entera a 2-subir, asi que lo que un build ya no escribe pero sigue ahi
       se publica igual. Quitar el Secret no quitaba la llave, y en CI no se veia porque cada
       run es un checkout limpio: solo pasaba en la maquina de quien compila. */
    const g2 = correr(NODE, ['gen.mjs'], { cwd: completo.proyecto, env: sinSecret });
    informe.comprueba('MC-58', 'quitar el Secret quita la llave de la salida: generado/ se vacia en cada build',
      g2.ok && !existsSync(fSuper)
      && !existsSync(path.join(completo.proyecto, 'generado', 'admin', 'superadmin.php')),
      existsSync(fSuper) ? 'la llave VIEJA sigue publicada' : 'la salida ya no la lleva');

    /* Lo que el build NO puede generar nunca. licencia.php aqui es lo importante: si un dia
       el build lo escribiera, cada despliegue devolveria el contrato del cliente a cero. */
    const prohibidos = ['admin/licencia.php', 'admin/clave.php', 'admin/superclave.php', 'estado.json', 'record.json']
      .filter((f) => existsSync(path.join(completo.salida, f)));
    informe.comprueba('MC-52', 'el build no genera ningun dato de produccion, y el contrato del cliente el primero',
      prohibidos.length === 0, prohibidos.length ? 'GENERADOS: ' + prohibidos.join(', ') : 'ninguno');

    informe.comprueba('MC-53', 'un cliente recien dado de alta nace SIN contrato: no es facturable hasta que alguien lo inicie',
      !existsSync(path.join(completo.proyecto, 'server', 'admin', 'licencia.php'))
      && !existsSync(path.join(vacio.proyecto, 'server', 'admin', 'licencia.php')));

    /* El workflow: las dos guardias y la lista de exclusion, leidas del fichero real. Es la
       unica forma de que un `exclude` mal editado salte aqui y no en el primer despliegue. */
    const wf = readFileSync(path.join(CLIENTE, '.github', 'workflows', 'deploy.yml'), 'utf8');
    const guardia = (wf.match(/for f in ([^;]+); do/) || [])[1] || '';
    const exclude = ((wf.match(/exclude:\s*\|([\s\S]*?)\n\s*(?:#|-\s|\w+:)/) || [])[1] || '')
      .split('\n').map((l) => l.trim()).filter(Boolean);
    informe.comprueba('MC-54', 'el workflow aborta el build si genera licencia.php, y NO vigila superadmin.php (ese si es del build)',
      /admin\/licencia\.php/.test(guardia) && !/admin\/superadmin\.php/.test(guardia), guardia.trim());
    informe.comprueba('MC-55', 'el FTP excluye licencia.php y SUBE superadmin.php',
      exclude.includes('admin/licencia.php') && exclude.includes('admin/superclave.php')
      && !exclude.includes('admin/superadmin.php'),
      exclude.filter((l) => /licencia|super/.test(l)).join(' | ') || `(${exclude.length} patrones leidos)`);
    informe.comprueba('MC-56', 'el Secret llega al paso que compila', /SUPERADMIN_PASSWORD_HASH:\s*\$\{\{\s*secrets\.SUPERADMIN_PASSWORD_HASH\s*\}\}/.test(wf));

    /* El endpoint de licencia, que es lo que convierte el contrato en una alarma. Tiene que
       comportarse como superadmin.php: solo con Secret, y SUBIENDO por FTP (el cron lo llama
       desde fuera, asi que excluirlo lo dejaria inservible). */
    const fEnd = path.join(completo.salida, 'admin', 'licencia-estado.php');
    const g3 = correr(NODE, ['gen.mjs'], { cwd: completo.proyecto, env: { ...sinSecret, LICENCIA_TOKEN: 'tok-qa-0123456789' } });
    informe.comprueba('MC-59', 'con el Secret se genera el endpoint de licencia, y sin el no existe',
      g3.ok && existsSync(fEnd), existsSync(fEnd) ? 'generado' : 'NO se genero');
    const codigoEnd = existsSync(fEnd) ? readFileSync(fEnd, 'utf8') : '';
    informe.comprueba('MC-60', 'el endpoint compara el token con hash_equals y lee la CABECERA, no la URL',
      /hash_equals\(/.test(codigoEnd) && /HTTP_X_LICENCIA_TOKEN/.test(codigoEnd)
      && !/\$_GET/.test(codigoEnd),
      'un token en la query acaba en el log del servidor; y == permite adivinarlo por tiempos');
    informe.comprueba('MC-61', 'sin token responde 404 y no 403: un 403 confirmaria que el endpoint existe',
      /http_response_code\(404\)/.test(codigoEnd) && !/http_response_code\(403\)/.test(codigoEnd));
    informe.comprueba('MC-62', 'el endpoint no publica nada del restaurante: ni nombre, ni carta, ni precios',
      !/CLIENTE_NOMBRE|CLIENTE_SLUG|platos|precio/i.test(codigoEnd),
      'solo vencimiento, alta y dias');
    const g4 = correr(NODE, ['gen.mjs'], { cwd: completo.proyecto, env: sinSecret });
    informe.comprueba('MC-63', 'quitar el Secret quita el endpoint de la salida',
      g4.ok && !existsSync(fEnd), existsSync(fEnd) ? 'el endpoint VIEJO sigue publicado' : 'ya no esta');
    informe.comprueba('MC-64', 'el FTP SUBE el endpoint: excluirlo lo dejaria inservible para el cron',
      !exclude.includes('admin/licencia-estado.php'),
      exclude.filter((l) => /licencia/.test(l)).join(' | ') || 'no excluido');
    informe.comprueba('MC-65', 'el Secret del endpoint llega al paso que compila',
      /LICENCIA_TOKEN:\s*\$\{\{\s*secrets\.LICENCIA_TOKEN\s*\}\}/.test(wf));

    /* Y las dos piezas hablando el MISMO idioma, que es donde vivio el fallo que ninguna de
       las de arriba podia ver. El cron preguntaba `.licencia == null` y la respuesta CON
       contrato no traia esa clave: jq no distingue «ausente» de «null», asi que salia siempre
       la rama de «este cliente no se factura», el aviso no se abria nunca y el run quedaba en
       VERDE — la peor forma de fallar que tiene una alarma. Se vio disparando el cron a mano
       contra produccion el 15 sep 2026, no leyendo ninguno de los dos ficheros.
       Comprobar la forma del PHP por un lado y la del workflow por otro NO basta: lo que
       falla es la junta, y esto es lo unico que la mira. */
    const cron = readFileSync(path.join(CLIENTE, '.github', 'workflows', 'licencia.yml'), 'utf8');
    const leidas = [...new Set([...cron.matchAll(/jq -r '[^']*'/g)]
      .flatMap((m) => [...m[0].matchAll(/\.([a-z]+)\b/g)].map((k) => k[1])))];
    /* La rama CON contrato es el ultimo json_encode del fichero generado. */
    const bloque = codigoEnd.slice(codigoEnd.lastIndexOf('json_encode(['));
    const emitidas = [...new Set([...bloque.matchAll(/'([a-z]+)'\s*=>/g)].map((m) => m[1]))];
    const huerfanas = leidas.filter((k) => !emitidas.includes(k));
    informe.comprueba('MC-66', 'el cron solo pregunta por claves que el endpoint emite CUANDO hay contrato',
      leidas.length > 0 && emitidas.length > 0 && huerfanas.length === 0,
      `lee: ${leidas.join(', ') || '(ninguna)'} | emite: ${emitidas.join(', ') || '(ninguna)'}`
      + (huerfanas.length ? ` | HUERFANAS: ${huerfanas.join(', ')}` : ''));

    const gi = readFileSync(path.join(CLIENTE, '.gitignore'), 'utf8').split('\n').map((l) => l.trim());
    informe.comprueba('MC-57', 'el repositorio ignora el contrato y la llave maestra: ni un secreto compartido versionado',
      gi.includes('server/admin/licencia.php') && gi.includes('server/admin/superadmin.php'),
      gi.filter((l) => /licencia|superadmin/.test(l)).join(' | '));
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
