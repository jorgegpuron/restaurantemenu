#!/usr/bin/env node
/* Alta automatica de un cliente nuevo. Fase 7 del plan multicliente.
 *
 * Cinco modos, cinco comandos separados -- nunca uno solo con banderas opcionales, para
 * que cada fase se pueda ejecutar, revisar y parar por su cuenta antes de la siguiente:
 *
 *   node nuevo-cliente.mjs --destino <ruta> --nombre <n> --url <u> --idiomas es,en
 *       --impuesto <texto> [--juego true|false] [--publicidad true|false]
 *     Solo local. Copia el motor, escribe cliente.mjs/carta.json/estado.json/i18n,
 *     sustituye deploy.yml. No toca GitHub. Para y espera revision.
 *
 *   node nuevo-cliente.mjs --detectar --destino <ruta>
 *     Solo lectura. Falla (no solo avisa) si encuentra restos de Tinge.
 *
 *   node nuevo-cliente.mjs --build-local --destino <ruta>
 *     Compila con un hash de activacion temporal y desechable. Lo borra siempre al
 *     terminar, exito o fallo.
 *
 *   node nuevo-cliente.mjs --publicar-github --destino <ruta> --repo <owner/repo>
 *     La unica que toca GitHub para el alta. Nunca --push en la creacion del repo:
 *     primero Secrets y Variables, verificados de vuelta, solo entonces push.
 *
 *   node nuevo-cliente.mjs --cerrar-activacion --repo <owner/repo>
 *     Sustituye PANEL_ACTIVACION_HASH por 256 bits muertos. No lo borra: el fallo
 *     cerrado de gen.mjs exige que siga existiendo para siempre.
 *
 * Nunca se copia al cliente nuevo: es herramienta de alta, no parte del producto. Se
 * ejecuta siempre desde la raiz de 1-proyecto de Tinge, que actua de semilla y nunca se
 * modifica -- todo lo que este fichero escribe va al DESTINO, jamas a su propio origen.
 *
 * Sin dependencias: node:fs, node:crypto, node:child_process, node:path. Igual que
 * gen.mjs/importar.mjs. */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync,
  rmSync, unlinkSync,
} from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url)); // raiz de 1-proyecto de Tinge

/* ---------------------------------------------------------------- utilidades de argv */
function args() { return process.argv.slice(2); }
function tiene(bandera) { return args().includes(bandera); }
function valor(bandera) {
  const i = args().indexOf(bandera);
  return i === -1 ? undefined : args()[i + 1];
}

/* ---------------------------------------------------------------------- utilidades fs */
function sha256Fichero(p) { return createHash('sha256').update(readFileSync(p)).digest('hex'); }

function copiarArbol(origen, destino, { excluir = () => false } = {}) {
  mkdirSync(destino, { recursive: true });
  for (const e of readdirSync(origen, { withFileTypes: true })) {
    const o = path.join(origen, e.name);
    const d = path.join(destino, e.name);
    if (excluir(o, e)) continue;
    if (e.isDirectory()) copiarArbol(o, d, { excluir });
    else if (e.isFile()) { mkdirSync(path.dirname(d), { recursive: true }); copyFileSync(o, d); }
  }
}

function listarFicheros(raiz) {
  const salida = [];
  const recorrer = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.isFile()) salida.push(p);
    }
  };
  recorrer(raiz);
  return salida;
}

/* -------------------------------------------------------------- ejecutar gh sin shell
 * Array de argumentos, nunca una cadena interpolada: el valor de un secreto no pasa por
 * ningun intérprete de shell ni por su historial. Cuando hay un valor sensible, viaja por
 * STDIN (opts.entrada) y nunca por --body ni por un argumento de la linea de comandos:
 * un argumento de proceso es visible para cualquier otro proceso de la maquina mientras
 * gh corre; STDIN no. */
function gh(argv, { entrada } = {}) {
  const r = spawnSync('gh', argv, {
    input: entrada !== undefined ? entrada : undefined,
    encoding: 'utf8',
  });
  return r;
}

/* ============================================================ CATALOGO DE UI GENERICA
 * Fase 7, correccion final: NO se decide por comparar strings contra CLIENTE.* en
 * tiempo de ejecucion (fragil: si un valor cambiara de forma, la exclusion lo perderia
 * en silencio). Esta lista es la clasificacion EXPLICITA, hecha leyendo entero
 * i18n.es.mjs de Tinge (111 claves en su `ui`) y confirmada programaticamente antes de
 * escribir este fichero: estas 7, y solo estas 7, mencionan el restaurante o su cocina.
 * Las otras 104 -- buscador, filtros, alergenos, insignias, resenas, el minijuego Chilli
 * Rush entero (es del MOTOR, no del restaurante) y el pie de SocialCard -- se copian
 * tal cual a cualquier cliente nuevo. */
const UI_DEL_RESTAURANTE = [
  'Indian Restaurant Menu',
  'Prices include IGIC',
  'Classic sauces: Butter Masala, Tikka Masala, Korma, Kashmiri, Madras, Balti, Jalfrezi, Bhuna, Dopiaza, Curry, Dhansak, Saag, Kashmiri Rogan Josh. South Indian sauces: Kadai, Madras, Garlic Chilli, Hyderabadi Handi, Chettinad, Malabar Curry, Goan Vindaloo.',
  'Select one South Indian sauce from the next section.',
  'Tinge of Turmeric — Indian restaurant menu.',
  'South Indian Restaurant Menu',
  'Tinge of Turmeric — Indian Restaurant Menu.',
];

/* Extrae el objeto `ui` de un fichero i18n.<code>.mjs ya escrito, como texto -- sin
 * import()ar el modulo (el destino no es un proyecto Node ejecutable todavia mientras se
 * escribe) -- y devuelve un nuevo bloque de texto con las claves de UI_DEL_RESTAURANTE
 * quitadas. Exportada para poder probarla aislada, sin tocar disco. */
export function filtrarUiGenerica(textoFichero) {
  const m = textoFichero.match(/export const ui = \{[\s\S]*?\n\};/);
  if (!m) throw new Error('no encuentro `export const ui = {...}` en el texto dado');
  let bloque = m[0];
  for (const clave of UI_DEL_RESTAURANTE) {
    // Las claves de `ui` van entre comillas simples en el fichero real -- JSON.stringify
    // pondria dobles y no encontraria nada. Ninguna de las 7 lleva una comilla simple.
    // El valor puede seguir en la MISMA linea o en la siguiente (las cadenas largas se
    // parten: clave y ':' en una linea, el valor indentado en la de abajo) -- por eso
    // [\s\S]*? hasta la primera ',' seguida de salto de linea, no solo '.*' de una linea.
    const claveEscapada = clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patron = new RegExp("^ {2}'" + claveEscapada + "':[\\s\\S]*?,\\n", 'm');
    bloque = bloque.replace(patron, '');
  }
  return textoFichero.slice(0, m.index) + bloque + textoFichero.slice(m.index + m[0].length);
}

/* ======================================================== PLANTILLA DE deploy.yml
 * Sustitucion literal, nada de plantillas con variables: el fichero de Tinge es la
 * fuente y solo cambian los dos puntos que la propia auditoria de esta fase encontro
 * (7 apariciones de la carpeta, 1 del slug en el grupo de concurrencia). Exportada para
 * poder probarla aislada. */
export function sustituirDeployYml(contenido, { carpetaVieja, carpetaNueva, slugViejo, slugNuevo }) {
  return contenido
    .split(carpetaVieja).join(carpetaNueva)
    .replace('group: deploy-ftp-' + slugViejo, 'group: deploy-ftp-' + slugNuevo);
}

/* ============================================================ VALOR DE 256 BITS MUERTO
 * Ni un hash de un token real ni algo que se imprima. No es que "no exista una preimagen
 * matematicamente" -- toda cadena tiene, en principio, infinitas preimagenes para una
 * funcion de hash. La propiedad correcta, y la unica que hace falta, es que NADIE generó
 * este valor a partir de un token conocido, y que encontrar uno por fuerza bruta es tan
 * inviable como romper SHA-256 al azar. Exportada para poder probar que nunca se
 * imprime, sin invocar gh. */
export function valorMuerto() {
  return randomBytes(32).toString('hex');
}

/* =============================================================== dishId / categoryId
 * Ya los genera motor/importar.mjs (regex `^c_[0-9a-f]{10,}$` / `^d_[0-9a-f]{10,}$`,
 * con comprobacion de unicidad antes de escribir) -- este fichero no repite esa logica.
 * `--destino` deja `carta.json` vacio; el generador entra en juego la primera vez que
 * se corre `node importar.mjs` con platos de verdad dentro. */

/* ============================================================================ --destino */
function comandoDestino() {
  const destino = valor('--destino');
  const nombre = valor('--nombre');
  const url = valor('--url');
  const idiomasArg = valor('--idiomas');
  const impuesto = valor('--impuesto');
  const juego = valor('--juego') !== 'false';
  const publicidad = valor('--publicidad') !== 'false';

  const faltan = [];
  if (!destino) faltan.push('--destino');
  if (!nombre) faltan.push('--nombre');
  if (!url) faltan.push('--url');
  if (!idiomasArg) faltan.push('--idiomas');
  if (!impuesto) faltan.push('--impuesto');
  if (faltan.length) {
    console.error('Faltan argumentos: ' + faltan.join(', '));
    process.exit(1);
  }

  const destinoProyecto = path.join(destino, '1-proyecto');
  if (existsSync(destino) && readdirSync(destino).length) {
    console.error('El destino existe y no esta vacio: ' + destino);
    console.error('nuevo-cliente.mjs nunca escribe encima de algo que ya hay.');
    process.exit(1);
  }

  const slug = path.basename(destino).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const idiomas = idiomasArg.split(',').map((s) => s.trim()).filter(Boolean);
  const BANDERA_POR_CODIGO = { es: 'es', en: 'gb', de: 'de', fr: 'fr', it: 'it', pt: 'pt' };

  mkdirSync(destinoProyecto, { recursive: true });

  /* 1. Copiar motor/ y server/ de Tinge, sin tocar una linea. clave.php/superclave.php
        no existen en el origen -- nunca se copian porque nunca estan ahi para copiar. */
  copiarArbol(path.join(AQUI, 'motor'), path.join(destinoProyecto, 'motor'));
  copiarArbol(path.join(AQUI, 'server'), path.join(destinoProyecto, 'server'));
  copyFileSync(path.join(AQUI, 'gen.mjs'), path.join(destinoProyecto, 'gen.mjs'));
  copyFileSync(path.join(AQUI, 'importar.mjs'), path.join(destinoProyecto, 'importar.mjs'));

  /* server/.htaccess (dos: el de la raiz y el de admin/) son las direcciones del
     proyecto que Apache exige en ruta absoluta, escritas a mano, sin pasar por ninguna
     plantilla del build (gen.mjs comprueba la del primero a proposito: linea ~6930,
     "server/.htaccess: ErrorDocument 404..."). LEEME-SERVIDOR.txt tambien la menciona,
     solo como documentacion. Barrido generico sobre TODO fichero de texto ya copiado
     bajo server/ -- no una lista fija de nombres, para no repetir este mismo fallo si
     algun dia aparece un cuarto fichero con la misma ruta escrita a mano. */
  {
    const rutaVieja = '/tinge_of_turmeric/menu2/';
    const rutaNueva = new URL(url).pathname;
    for (const f of listarFicheros(path.join(destinoProyecto, 'server'))) {
      let texto;
      try { texto = readFileSync(f, 'utf8'); } catch { continue; }
      if (texto.includes(rutaVieja)) writeFileSync(f, texto.split(rutaVieja).join(rutaNueva));
    }
  }

  /* 2. cliente.mjs nuevo. Todo idioma que no sea 'en' necesita su diccionario importado
        y puesto en `dicts` -- 'en' es el catalogo nativo del motor y es el UNICO que
        puede ir sin el (gen.mjs, lineas 120-130). */
  const rotulos = {
    nombre,
    titulo: nombre + ' — Carta',
    tituloSocial: nombre + ' — Carta',
    rotulo: nombre,
    descripcion: nombre + ' — carta del restaurante.',
    tituloJuego: 'Chilli Rush — ' + nombre,
  };
  const alias = (codigo) => 'I18N_' + codigo.toUpperCase();
  const necesitaDicts = (codigo) => codigo !== 'en';
  const importes = idiomas.filter(necesitaDicts)
    .map((c) => 'import * as ' + alias(c) + ' from \'./i18n.' + c + '.mjs\';');
  const idiomaObj = (codigo) =>
    '{ code: ' + JSON.stringify(codigo) + ', label: ' + JSON.stringify(codigo.toUpperCase())
    + ', name: ' + JSON.stringify(codigo) + ', bandera: ' + JSON.stringify(BANDERA_POR_CODIGO[codigo] || codigo)
    + (necesitaDicts(codigo) ? ', dicts: ' + alias(codigo) : '') + ' }';
  const clienteMjs = [
    ...importes,
    importes.length ? '' : null,
    '/* Generado por nuevo-cliente.mjs. Revisar antes de escribir la carta real. */',
    'export const CLIENTE = {',
    '  slug: ' + JSON.stringify(slug) + ',',
    '  nombre: ' + JSON.stringify(rotulos.nombre) + ',',
    '  titulo: ' + JSON.stringify(rotulos.titulo) + ',',
    '  tituloSocial: ' + JSON.stringify(rotulos.tituloSocial) + ',',
    '  rotulo: ' + JSON.stringify(rotulos.rotulo) + ',',
    '  descripcion: ' + JSON.stringify(rotulos.descripcion) + ',',
    '  tituloJuego: ' + JSON.stringify(rotulos.tituloJuego) + ',',
    '  impuesto: ' + JSON.stringify(impuesto) + ',',
    '  base: ' + JSON.stringify(url) + ',',
    '  moneda: { simbolo: \'€\', iso: \'EUR\' },',
    '  zonaHoraria: \'Atlantic/Canary\',',
    '  servicio: { corteHora: 6 },',
    '  alergenos: { leyenda: [] },',
    '  funciones: { datos: true, juego: ' + juego + ', publicidad: ' + publicidad + ' },',
    '  /* Fase 7: exige PANEL_ACTIVACION_HASH en todo build futuro. El cliente original',
    '     de este motor nunca declara esto -- es lo que distingue a un cliente nacido de',
    '     esta herramienta. */',
    '  activacionPanel: true,',
    '  idiomas: {',
    '    base: ' + idiomaObj(idiomas[0]) + ',',
    '    extras: [' + idiomas.slice(1).map(idiomaObj).join(', ') + '],',
    '  },',
    '};',
    '',
    'export const CLAVE = (nombre) => CLIENTE.slug + \'-\' + nombre;',
    '',
    '/* Palabras que el buscador trata como equivalentes. Vacio es valido: el buscador',
    '   funciona igual, solo sin expandir sinonimos. Se rellena a mano si hace falta. */',
    'export const SINONIMOS = [];',
    '',
  ].filter((l) => l !== null).join('\n');
  writeFileSync(path.join(destinoProyecto, 'cliente.mjs'), clienteMjs);

  /* 3. carta.json vacio, marcado no publicable. */
  writeFileSync(path.join(destinoProyecto, 'carta.json'), JSON.stringify({
    esquema: 'carta/2',
    noPublicable: true,
    pestanas: [],
  }, null, 2) + '\n');

  /* 4. server/estado.json nuevo -- NUNCA el de Tinge. */
  mkdirSync(path.join(destinoProyecto, 'server'), { recursive: true });
  writeFileSync(path.join(destinoProyecto, 'server', 'estado.json'), JSON.stringify({
    esquema: 2,
    soldOut: {}, tags: {},
    offer: { on: false, cats: [], percent: 20, from: 600, to: 720, days: [1, 2, 3, 4, 5, 6, 7], keys: [] },
    prices: {}, actualizado: null,
    game: { on: juego },
    review: { url: '' },
    theme: 'laurel',
  }, null, 2) + '\n');

  /* 5. Plantillas i18n para los idiomas extra, ui filtrada. */
  const idiomasExtra = idiomas.slice(1);
  for (const codigo of idiomasExtra) {
    const origenI18n = path.join(AQUI, 'i18n.' + codigo + '.mjs');
    const destinoI18n = path.join(destinoProyecto, 'i18n.' + codigo + '.mjs');
    if (existsSync(origenI18n)) {
      const textoOrigen = readFileSync(origenI18n, 'utf8');
      const soloUi = textoOrigen.match(/export const ui = \{[\s\S]*?\n\};/);
      const cabecera = [
        '/* Plantilla generada por nuevo-cliente.mjs. names/descriptions/notes/tabs/groups',
        '   los reescribe importar.mjs desde carta.json -- no editar esas cinco secciones a',
        '   mano, se sobrescriben. La ui de abajo SI es a mano. */',
        '',
        'export const names = {};',
        'export const descriptions = {};',
        'export const notes = {};',
        'export const tabs = {};',
        'export const groups = {};',
        '',
      ].join('\n');
      const uiFiltrada = soloUi ? filtrarUiGenerica('export const ui = {};\n\n' + soloUi[0])
        .split('\n\n').slice(1).join('\n\n') : 'export const ui = {\n};\n';
      writeFileSync(destinoI18n, cabecera + uiFiltrada);
    } else {
      writeFileSync(destinoI18n, [
        '/* El ingles es el catalogo nativo del motor: puede ir de extra sin traducir. */',
        'export const names = {};',
        'export const descriptions = {};',
        'export const notes = {};',
        'export const tabs = {};',
        'export const groups = {};',
        'export const ui = {',
        '};',
        '',
      ].join('\n'));
    }
  }

  /* 6. deploy.yml sustituido. */
  const carpetaVieja = 'tinge_of_turmeric';
  const carpetaNueva = path.basename(destino);
  const deployOrigen = readFileSync(path.join(AQUI, '.github', 'workflows', 'deploy.yml'), 'utf8');
  const deployNuevo = sustituirDeployYml(deployOrigen, {
    carpetaVieja, carpetaNueva, slugViejo: 'tinge', slugNuevo: slug,
  });
  mkdirSync(path.join(destinoProyecto, '.github', 'workflows'), { recursive: true });
  writeFileSync(path.join(destinoProyecto, '.github', 'workflows', 'deploy.yml'), deployNuevo);

  /* 7. .gitignore, copiado tal cual -- es comportamiento del motor, no dato del cliente. */
  copyFileSync(path.join(AQUI, '.gitignore'), path.join(destinoProyecto, '.gitignore'));

  /* assets/: la marca del restaurante. Vacia a proposito -- NUNCA se copia la de Tinge
     (es su marca, no la de nadie mas) -- pero gen.mjs necesita que la carpeta EXISTA para
     poder leerla, aunque este vacia. hero/, platos/ y publicidad/ las crea el panel solo
     la primera vez que alguien sube algo; no hace falta adelantarlas aqui. */
  mkdirSync(path.join(destinoProyecto, 'assets'), { recursive: true });

  /* 8. Ancla el motor copiado con su propio motor.lock -- sin esto, verificarMotor()
        (que gen.mjs e importar.mjs corren antes de nada) para el build en seco. */
  const lock = spawnSync('node', ['motor/lock.mjs', '--escribir'], { cwd: destinoProyecto, encoding: 'utf8' });
  if (lock.status !== 0) {
    console.error(lock.stderr || 'no se pudo escribir motor.lock');
    process.exit(1);
  }
  console.log(lock.stdout.trim());

  console.log('Destino local escrito: ' + destinoProyecto);
  console.log('Revisa cliente.mjs, escribe carta.json (Claude, desde la Carta proporcionada).');
  console.log('Luego: node nuevo-cliente.mjs --build-local --destino "' + destino + '"');
}

/* =========================================================================== --detectar
 * Solo lectura. Falla -- no avisa -- ante cualquier resto de Tinge. Amplia la seccion 11
 * de NUEVO_CLIENTE.md con generado/ y 2-subir/: ambos son salida real que puede llegar a
 * produccion, no solo fuente. */
const PATRONES_TINGE = [/tinge/i, /turmeric/i, /\btotm\b/i, /socialcard\.es\/tinge/i];
// Relativas a 1-proyecto (la raiz del cliente, donde vive motor.lock y cliente.mjs).
const RUTAS_EN_PROYECTO = ['cliente.mjs', 'carta.json', 'assets', '.github', 'menu.md', 'generado'];
// 2-subir NO esta dentro de 1-proyecto -- es su hermana, bajo el mismo destino (contrato
// de motor/entorno.mjs: RAIZ_SALIDA = RAIZ_CLIENTE/../2-subir/). Escanearla como si
// colgara de 1-proyecto nunca encontraria nada: es la salida real que puede llegar a
// produccion, y por eso la pide la correccion de esta fase.
const RUTA_2SUBIR = '2-subir';

function comandoDetectar() {
  const destino = valor('--destino');
  if (!destino) { console.error('Falta --destino'); process.exit(1); }
  const raiz = path.join(destino, '1-proyecto');
  if (!existsSync(raiz)) { console.error('No existe ' + raiz); process.exit(1); }

  const hallazgos = [];

  // i18n.*.mjs, por nombre de patron (no esta en RUTAS_EN_PROYECTO porque es un glob)
  const candidatos = readdirSync(raiz).filter((f) => /^i18n\..*\.mjs$/.test(f));
  const ficherosCliente = [
    ...RUTAS_EN_PROYECTO.flatMap((r) => {
      const p = path.join(raiz, r);
      if (!existsSync(p)) return [];
      return statSync(p).isDirectory() ? listarFicheros(p) : [p];
    }),
    ...candidatos.map((f) => path.join(raiz, f)),
    ...(() => {
      const p = path.join(destino, RUTA_2SUBIR);
      if (!existsSync(p)) return [];
      return statSync(p).isDirectory() ? listarFicheros(p) : [p];
    })(),
  ];

  for (const f of ficherosCliente) {
    let texto;
    try { texto = readFileSync(f, 'utf8'); } catch { continue; } // binario (assets/): se ignora el contenido
    for (const patron of PATRONES_TINGE) {
      if (patron.test(texto)) hallazgos.push(f + ' -- coincide con ' + patron);
    }
  }

  // motor.lock: cualquier fichero de motor/ que no cuadre con su hash se revisa igual
  // que si fuera del cliente -- estar dentro de motor/ no exime a nadie.
  const lockPath = path.join(raiz, 'motor.lock');
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    for (const [rel, hashEsperado] of Object.entries(lock.ficheros || {})) {
      const p = path.join(raiz, 'motor', rel);
      if (!existsSync(p)) continue;
      if (sha256Fichero(p) !== hashEsperado) {
        let texto;
        try { texto = readFileSync(p, 'utf8'); } catch { continue; }
        for (const patron of PATRONES_TINGE) {
          if (patron.test(texto)) hallazgos.push('motor/' + rel + ' (hash no coincide) -- coincide con ' + patron);
        }
      }
    }
  }

  if (hallazgos.length) {
    console.error('--detectar: FALLA. Restos de Tinge encontrados:');
    hallazgos.forEach((h) => console.error('  ' + h));
    process.exit(1);
  }
  console.log('--detectar: limpio. Sin restos de Tinge en ' + ficherosCliente.length + ' fichero(s) revisados.');
}

/* ======================================================================== --build-local */
function comandoBuildLocal() {
  const destino = valor('--destino');
  if (!destino) { console.error('Falta --destino'); process.exit(1); }
  const raiz = path.join(destino, '1-proyecto');
  const rutaActivacion = path.join(destino, '2-subir', 'admin', 'activacion.php');

  /* gen.mjs lee menu.md, que escribe importar.mjs -- sin correrlo antes, gen.mjs falla
     con un ENOENT que no dice nada del problema real (carta.json aun vacio, o marcado
     no publicable). El pipeline completo es importar -> gen, igual que para Tinge. */
  const previo = spawnSync('node', ['importar.mjs'], { cwd: raiz, encoding: 'utf8' });
  if (previo.stdout) console.log(previo.stdout.trim());
  if (previo.status !== 0) {
    console.error(previo.stderr || 'importar.mjs fallido');
    process.exit(1);
  }

  const tokenTemp = randomBytes(24).toString('base64url');
  const hashTemp = createHash('sha256').update(tokenTemp).digest('hex');

  let resultado;
  try {
    resultado = spawnSync('node', ['gen.mjs'], {
      cwd: raiz,
      env: { ...process.env, PANEL_ACTIVACION_HASH: hashTemp },
      encoding: 'utf8',
    });
    if (resultado.stdout) console.log(resultado.stdout.trim());
    if (resultado.status !== 0) {
      console.error(resultado.stderr || 'build local fallido');
    }
  } finally {
    if (existsSync(rutaActivacion)) unlinkSync(rutaActivacion);
    // tokenTemp y hashTemp: variables locales, mueren aqui. Nunca se devuelven, nunca se
    // escriben, nunca se reutilizan -- ni siquiera si el build fallo.
  }
  if (!resultado || resultado.status !== 0) process.exit(1);
  console.log('--build-local: OK. activacion.php temporal eliminado.');
}

/* =================================================================== --publicar-github */
function comandoPublicarGithub() {
  const destino = valor('--destino');
  const repo = valor('--repo');
  if (!destino || !repo) { console.error('Faltan --destino y/o --repo'); process.exit(1); }

  const FTP_SERVER = process.env.SOCIALCARD_FTP_SERVER;
  const FTP_USERNAME = process.env.SOCIALCARD_FTP_USERNAME;
  const FTP_PASSWORD = process.env.SOCIALCARD_FTP_PASSWORD;
  const faltan = [];
  if (!FTP_SERVER) faltan.push('SOCIALCARD_FTP_SERVER');
  if (!FTP_USERNAME) faltan.push('SOCIALCARD_FTP_USERNAME');
  if (!FTP_PASSWORD) faltan.push('SOCIALCARD_FTP_PASSWORD');
  if (faltan.length) {
    console.error('Faltan variables de entorno: ' + faltan.join(', '));
    console.error('Se configuran una vez por ordenador. No se toca git ni GitHub.');
    process.exit(1);
  }

  const raiz = path.join(destino, '1-proyecto');
  const slug = path.basename(destino).toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  // a. git init / add / commit / verificar arbol limpio
  const paso = (argv) => spawnSync('git', argv, { cwd: raiz, encoding: 'utf8' });
  if (!existsSync(path.join(raiz, '.git'))) paso(['init', '-b', 'main']);
  paso(['add', '-A']);
  paso(['commit', '-m', 'Alta: ' + slug]);
  const estado = paso(['status', '--short']);
  if (estado.stdout && estado.stdout.trim()) {
    console.error('Árbol no limpio tras el commit inicial. No se sigue.');
    process.exit(1);
  }

  // b. crear el repo SIN --push
  const creado = gh(['repo', 'create', repo, '--private', '--source=' + raiz, '--remote=origin']);
  if (creado.status !== 0) { console.error(creado.stderr); process.exit(1); }

  // c. FTP_REMOTE_PATH y las tres credenciales, todo por stdin
  gh(['secret', 'set', 'FTP_REMOTE_PATH', '--repo', repo], { entrada: '/' + slug + '/' });
  gh(['secret', 'set', 'FTP_SERVER', '--repo', repo], { entrada: FTP_SERVER });
  gh(['secret', 'set', 'FTP_USERNAME', '--repo', repo], { entrada: FTP_USERNAME });
  gh(['secret', 'set', 'FTP_PASSWORD', '--repo', repo], { entrada: FTP_PASSWORD });

  // d. token real de activacion, generado y consumido aqui mismo
  const token = randomBytes(24).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  gh(['secret', 'set', 'PANEL_ACTIVACION_HASH', '--repo', repo], { entrada: hash });
  console.log('TOKEN DE ACTIVACIÓN (apúntalo ahora, no se repite): ' + token);

  // e. DESPLIEGUE_REAL, explícito en false
  gh(['variable', 'set', 'DESPLIEGUE_REAL', '--repo', repo], { entrada: 'false' });

  // f. verificar antes de empujar
  const secretos = gh(['secret', 'list', '--repo', repo]);
  const variableFalse = gh(['variable', 'get', 'DESPLIEGUE_REAL', '--repo', repo]);
  const nombresEsperados = ['FTP_REMOTE_PATH', 'FTP_SERVER', 'FTP_USERNAME', 'FTP_PASSWORD', 'PANEL_ACTIVACION_HASH'];
  const faltanSecretos = nombresEsperados.filter((n) => !(secretos.stdout || '').includes(n));
  if (faltanSecretos.length || !(variableFalse.stdout || '').trim().startsWith('false')) {
    console.error('Verificación previa al push falló. No se empuja nada.');
    console.error('Secrets que faltan: ' + (faltanSecretos.join(', ') || 'ninguno'));
    process.exit(1);
  }

  // g. solo ahora, push
  const push = paso(['push', '-u', 'origin', 'main']);
  if (push.status !== 0) { console.error(push.stderr); process.exit(1); }

  console.log('--publicar-github: repositorio ' + repo + ' creado y publicado en ensayo.');
}

/* =================================================================== --cerrar-activacion */
function comandoCerrarActivacion() {
  const repo = valor('--repo');
  if (!repo) { console.error('Falta --repo'); process.exit(1); }
  const muerto = valorMuerto();
  const r = gh(['secret', 'set', 'PANEL_ACTIVACION_HASH', '--repo', repo], { entrada: muerto });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  console.log('--cerrar-activacion: PANEL_ACTIVACION_HASH sustituido por un valor muerto.');
  console.log('El Secret sigue existiendo -- los builds futuros de este cliente siguen compilando.');
}

/* -------------------------------------------------------------------------- despacho
 * Solo corre si este fichero es el punto de entrada real (node nuevo-cliente.mjs ...),
 * no cuando otro script hace `import { filtrarUiGenerica } from './nuevo-cliente.mjs'`
 * para probar una funcion aislada sin disparar ningun modo. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (tiene('--detectar')) comandoDetectar();
  else if (tiene('--build-local')) comandoBuildLocal();
  else if (tiene('--publicar-github')) comandoPublicarGithub();
  else if (tiene('--cerrar-activacion')) comandoCerrarActivacion();
  else if (tiene('--destino')) comandoDestino();
  else {
    console.error('Modo desconocido. Usa --destino, --detectar, --build-local, --publicar-github o --cerrar-activacion.');
    process.exit(1);
  }
}
