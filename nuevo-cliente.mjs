#!/usr/bin/env node
/* Alta automatica de un cliente nuevo. Fase 7 del plan multicliente.
 *
 * Cinco modos, cinco comandos separados -- nunca uno solo con banderas opcionales, para
 * que cada fase se pueda ejecutar, revisar y parar por su cuenta antes de la siguiente:
 *
 *   node nuevo-cliente.mjs --destino <ruta> --nombre <n> --url <u> --idiomas es,en
 *       --impuesto <texto> --alergenos-en-origen si|no|desconocido
 *       --zona-horaria <IANA> --corte-hora <0-23>
 *       [--juego true|false] [--publicidad true|false] [--color-principal '#RRGGBB']
 *     Solo local. Copia el motor, escribe cliente.mjs/carta.json/estado.json/i18n,
 *     sustituye deploy.yml. No toca GitHub. Para y espera revision.
 *
 *     --color-principal es del todo opcional -- sin el, el alta usa el naranja de
 *     fabrica del motor ('#FF7517'), nunca se aborta un alta solo por esto. Secundario,
 *     Oscuro y Neutro son constantes del motor (ver motor/temas.mjs): no se piden aqui,
 *     no se declaran en cliente.mjs, son iguales para cualquier cliente que exista.
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
import { normalizarHex, verificarPaleta, PRINCIPAL_DEFECTO } from './motor/temas.mjs';

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
  const alergenosEnOrigen = valor('--alergenos-en-origen');
  const zonaHoraria = valor('--zona-horaria');
  const corteHoraArg = valor('--corte-hora');
  const juego = valor('--juego') !== 'false';
  const publicidad = valor('--publicidad') !== 'false';
  const colorPrincipalArg = valor('--color-principal');

  const faltan = [];
  if (!destino) faltan.push('--destino');
  if (!nombre) faltan.push('--nombre');
  if (!url) faltan.push('--url');
  if (!idiomasArg) faltan.push('--idiomas');
  if (!impuesto) faltan.push('--impuesto');
  if (!alergenosEnOrigen) faltan.push('--alergenos-en-origen (si|no|desconocido)');
  if (!zonaHoraria) faltan.push('--zona-horaria (identificador IANA, p. ej. Europe/Madrid)');
  if (!corteHoraArg) faltan.push('--corte-hora (entero 0-23)');
  if (faltan.length) {
    console.error('Faltan argumentos: ' + faltan.join(', '));
    process.exit(1);
  }
  /* Igual que --impuesto: sin valor por defecto, para que el alta obligue a decidirlo en
     vez de heredar en silencio el 'no' de Tinge. 'desconocido' SI es un valor valido aqui
     -- es la unica forma de terminar el alta sin haber decidido todavia -- pero gen.mjs
     bloqueara cualquier build de este cliente hasta que cambie a 'si' o 'no'. */
  if (!['si', 'no', 'desconocido'].includes(alergenosEnOrigen)) {
    console.error('--alergenos-en-origen debe ser "si", "no" o "desconocido": ' + JSON.stringify(alergenosEnOrigen));
    process.exit(1);
  }
  /* Ni Canarias ni ninguna otra por defecto: motor/gen.mjs comprueba exactamente esto mismo
     (identificador IANA valido) en cuanto arranca el build -- se repite aqui, antes de
     escribir nada, para no descubrir una zona horaria invalida cuatro pasos mas tarde. */
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: zonaHoraria });
  } catch {
    console.error('--zona-horaria no es un identificador IANA valido: ' + JSON.stringify(zonaHoraria));
    console.error('ejemplos: Atlantic/Canary, Europe/Madrid, Europe/Berlin');
    process.exit(1);
  }
  /* corteHora es politica del restaurante, no un dato tecnico con default seguro: una
     cafeteria que abre a las 05:00 necesita un corte mas temprano que uno a medianoche, y
     equivocarse en silencio caduca agotados de un servicio que todavia esta abierto. Mismo
     rango que valida motor/gen.mjs (entero 0-23). */
  const corteHora = Number(corteHoraArg);
  if (!Number.isInteger(corteHora) || corteHora < 0 || corteHora > 23) {
    console.error('--corte-hora debe ser un entero 0-23: ' + JSON.stringify(corteHoraArg));
    process.exit(1);
  }
  /* El unico color de marca que se pide (Fase 8, ajuste final). Sin el, el naranja de
     fabrica -- nunca se aborta un alta solo por esto. Si se da, tiene que ser un hex
     valido Y tiene que leerse con la MISMA funcion que gen.mjs usara despues en cada
     build de este cliente, contra las constantes fijas del motor (Secundario/Oscuro/
     Neutral) -- si no da contraste suficiente, mejor saberlo aqui, sin haber escrito
     nada, que en el primer build. */
  let colorPrincipal;
  if (colorPrincipalArg === undefined) {
    colorPrincipal = PRINCIPAL_DEFECTO;
  } else {
    colorPrincipal = normalizarHex(colorPrincipalArg);
    if (colorPrincipal === null) {
      console.error('--color-principal no es un hex valido en formato #RRGGBB: ' + JSON.stringify(colorPrincipalArg));
      process.exit(1);
    }
    try {
      verificarPaleta(colorPrincipal, 'el color dado');
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }
  /* El mismo contrato que gen.mjs comprueba despues del hecho (motor/entorno.mjs,
     CARPETA_CLIENTE): la direccion publica tiene que mencionar el nombre de la carpeta que
     va a contener a este cliente. Comprobarlo AQUI, antes de escribir un solo fichero, evita
     descubrir la incoherencia recien en --build-local con medio cliente ya creado. No es una
     regla nueva -- es la de motor/gen.mjs, leida antes en vez de despues. */
  const carpetaDestino = path.basename(destino);
  if (!url.includes(carpetaDestino)) {
    console.error('--url no contiene el nombre de la carpeta de destino.');
    console.error('  carpeta: ' + JSON.stringify(carpetaDestino));
    console.error('  --url:   ' + JSON.stringify(url));
    console.error('gen.mjs abortara el build por lo mismo (cliente.mjs: base no contiene...) -- mejor ahora, sin haber escrito nada.');
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
  /* El nombre del idioma EN SU PROPIO IDIOMA, que es lo que se lee en el selector: un aleman
     busca "Deutsch", no "DE" ni "de". Se escribia el codigo tal cual como name y el selector
     de un cliente nuevo salia con "es / en / de" en pantalla, mientras Tinge -escrito a mano
     antes de que esta herramienta existiera- decia "Español / English / Deutsch". El codigo
     sigue siendo el de siempre para lang, localStorage y la logica; lo que cambia es solo la
     etiqueta que se ve. Un codigo que no este aqui aborta el alta: es preferible pedir el
     nombre a publicar una carta con un selector que dice "pt". */
  const NOMBRE_POR_CODIGO = {
    es: 'Español', en: 'English', de: 'Deutsch',
    fr: 'Français', it: 'Italiano', pt: 'Português',
  };
  const sinNombre = idiomas.filter((c) => !NOMBRE_POR_CODIGO[c]);
  if (sinNombre.length) {
    console.error('No se como se llama el idioma ' + sinNombre.join(', ') + ' en su propio idioma.');
    console.error('Anadelo a NOMBRE_POR_CODIGO y a BANDERA_POR_CODIGO en nuevo-cliente.mjs:');
    console.error('el selector ensena ese nombre y no puede quedarse con el codigo.');
    process.exit(1);
  }

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
  /* 'en' es el catalogo nativo del motor SOLO para el vocabulario de interfaz (T(x,'ui')
     cae a si mismo sin diccionario, motor/gen.mjs::tr). Eso nunca eximio a 'en' de llevar
     diccionario de CONTENIDO (nombres, descripciones...) cuando no es el idioma base: antes
     de este fix, un 'en' de extra con base != 'en' se quedaba sin dicts y sus lectores veian
     el texto del idioma base, en silencio, sin build roto -- nunca visto porque Tinge tiene
     base 'en' y ahi 'en' nunca es un extra. La unica combinacion que de verdad no necesita
     diccionario es 'en' siendo el propio base. */
  const necesitaDicts = (codigo) => !(codigo === 'en' && idiomas[0] === 'en');
  const importes = idiomas.filter(necesitaDicts)
    .map((c) => 'import * as ' + alias(c) + ' from \'./i18n.' + c + '.mjs\';');
  const idiomaObj = (codigo) =>
    '{ code: ' + JSON.stringify(codigo) + ', label: ' + JSON.stringify(codigo.toUpperCase())
    + ', name: ' + JSON.stringify(NOMBRE_POR_CODIGO[codigo]) + ', bandera: ' + JSON.stringify(BANDERA_POR_CODIGO[codigo] || codigo)
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
    '  marca: { colorPrincipal: ' + JSON.stringify(colorPrincipal) + ' },',
    '  impuesto: ' + JSON.stringify(impuesto) + ',',
    '  base: ' + JSON.stringify(url) + ',',
    '  moneda: { simbolo: \'€\', iso: \'EUR\' },',
    '  zonaHoraria: ' + JSON.stringify(zonaHoraria) + ',',
    '  servicio: { corteHora: ' + corteHora + ' },',
    '  alergenos: { leyenda: [], enOrigen: ' + JSON.stringify(alergenosEnOrigen) + ' },',
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

  /* Los UNICOS campos de CLIENTE que pasan por T(x, 'ui'|'ui-cliente') en motor/gen.mjs --
     verificado leyendo cada llamada a T()/attrs()/tr() contra CLIENTE.*, no supuesto:
     impuesto (nota fiscal), rotulo (subtitulo de portada), titulo (<title>, y el que cambia
     al elegir idioma), descripcion (meta description). `nombre` NO esta en esta lista aunque
     lo parezca: en cada sitio donde sale (portada, <title> del 404, JSON-LD) se escribe tal
     cual, sin pasar por T() -- el nombre propio del restaurante no se traduce. */
  const CAMPOS_UI_CLIENTE = {
    impuesto, rotulo: rotulos.rotulo, titulo: rotulos.titulo, descripcion: rotulos.descripcion,
  };

  /* 5. Plantillas i18n. 'en' es el unico catalogo nativo del motor y nunca necesita
        fichero -- ni de extra ni de base. Cualquier OTRO idioma si lo necesita, sea el
        base o un extra: cliente.mjs (arriba, idiomaObj/necesitaDicts) ya declara
        `dicts: I18N_<CODIGO>` para todo idioma != 'en', el base incluido -- este bucle
        tiene que crear el fichero para exactamente esos mismos idiomas, o el import que
        el propio script genera queda apuntando a un fichero que nunca se escribe. */
  const idiomasConFichero = idiomas.filter(necesitaDicts);
  for (const codigo of idiomasConFichero) {
    const origenI18n = path.join(AQUI, 'i18n.' + codigo + '.mjs');
    const destinoI18n = path.join(destinoProyecto, 'i18n.' + codigo + '.mjs');
    let texto;
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
      texto = cabecera + uiFiltrada;
    } else {
      texto = [
        '/* El ingles es el catalogo nativo del motor: puede ir de extra sin traducir. */',
        'export const names = {};',
        'export const descriptions = {};',
        'export const notes = {};',
        'export const tabs = {};',
        'export const groups = {};',
        'export const ui = {',
        '};',
        '',
      ].join('\n');
    }
    /* Aqui NO se copia el texto en español (ni en el que sea el idioma base) dentro de un
       extra: eso dejaria el build en verde con un idioma a medias publicado, que es
       precisamente lo que este mecanismo existe para impedir. En vez de eso, se deja un
       marcador imposible de no ver, con las claves EXACTAS que hacen falta y el texto de
       origen al lado como referencia -- se traduce a mano (o Claude lo hace durante el
       alta, antes del primer build), nunca copiando la columna de la derecha tal cual. */
    if (codigo !== idiomas[0]) {
      const pendientes = Object.entries(CAMPOS_UI_CLIENTE)
        .map(([campo, valor]) => '     ' + campo + ': ' + JSON.stringify(valor))
        .join('\n');
      const aviso = [
        '/* ============================================================ FALTAN POR TRADUCIR',
        ' * Estos 4 campos de cliente.mjs pasan por T(x, \'ui\'|\'ui-cliente\') y EXIGEN una',
        ' * entrada en el `ui` de abajo para este idioma -- gen.mjs aborta el build si falta',
        ' * una sola. Añade cada uno con SU CLAVE literal (el texto de origen, tal cual sale',
        ' * abajo) y como valor la traduccion real a este idioma. Nunca dejes el texto de',
        ' * origen como si fuera la traduccion: el build no lo detecta y publicaria este',
        ' * idioma a medias sin ningun aviso.',
        ' *',
        pendientes,
        ' *',
        ' * Formato esperado dentro de `ui`, una linea por campo:',
        '     ' + JSON.stringify(impuesto) + ': \'<traduccion real>\',',
        ' * ============================================================================= */',
        '',
      ].join('\n');
      texto = texto.replace('export const ui = {', aviso + 'export const ui = {');
    }
    writeFileSync(destinoI18n, texto);
  }

  /* 5b. El idioma base, cuando no es 'en', tambien necesita hablar de si mismo en su propio
        ui: en gen.mjs, BT() hornea los 4 campos de CAMPOS_UI_CLIENTE contra el diccionario
        ui del PROPIO base en cuanto el base no es ingles -- aunque el texto ya este en el
        idioma correcto, sin esa entrada el build aborta por "missing translations". Esto NO
        es el mismo caso que un extra: el base habla de si mismo, no hay nada que traducir,
        asi que sembrarlo aqui con identidad (valor: valor) es correcto y no oculta ninguna
        traduccion pendiente. Si se edita alguno de los 4 campos a mano despues, hay que
        actualizar tambien esta entrada a mano. */
  if (necesitaDicts(idiomas[0])) {
    const basePath = path.join(destinoProyecto, 'i18n.' + idiomas[0] + '.mjs');
    const identidad = [...new Set(Object.values(CAMPOS_UI_CLIENTE))]
      .map((v) => '  ' + JSON.stringify(v) + ': ' + JSON.stringify(v) + ',')
      .join('\n');
    const conIdentidad = readFileSync(basePath, 'utf8').replace(
      'export const ui = {',
      'export const ui = {\n'
        + '  /* impuesto, rotulo, titulo y descripcion del propio cliente, ya en el idioma base\n'
        + '     -- actualizar si cambia alguno de los 4 en cliente.mjs */\n'
        + identidad,
    );
    writeFileSync(basePath, conIdentidad);
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

  /* 7. .gitignore y .gitattributes, copiados tal cual -- comportamiento del motor, no dato
        del cliente. Sin .gitattributes (`* -text`, motor/gen.mjs es CRLF de origen y se
        guarda tal cual) el core.autocrlf de la maquina del operador reescribe los finales de
        linea al hacer git add/commit: el blob que queda en el repo ya no es el que
        motor.lock certifico en el disco, y CI (que hace checkout limpio) lo detecta como
        "motor no cuadra" -- un fallo real, en el primer cliente publicado de verdad, que
        nunca se vio en Tinge porque Tinge siempre tuvo su propio .gitattributes. */
  copyFileSync(path.join(AQUI, '.gitignore'), path.join(destinoProyecto, '.gitignore'));
  copyFileSync(path.join(AQUI, '.gitattributes'), path.join(destinoProyecto, '.gitattributes'));

  /* assets/: la marca del restaurante. Vacia a proposito -- NUNCA se copia la de Tinge
     (es su marca, no la de nadie mas) -- pero gen.mjs necesita que la carpeta EXISTA para
     poder leerla, aunque este vacia. hero/, platos/ y publicidad/ las crea el panel solo
     la primera vez que alguien sube algo; no hace falta adelantarlas aqui.
     Git no versiona carpetas vacias: sin un fichero dentro, `assets/` existe en ESTE disco
     pero desaparece en el primer commit -- y con ella cualquier checkout limpio (CI incluido)
     revienta con ENOENT en el mismo readdirSync que aqui funciona porque la carpeta la acaba
     de crear mkdirSync. .gitkeep la ancla; motor/gen.mjs lo excluye explicitamente de lo que
     se publica (NO_SUBIR), asi que nunca llega a 2-subir/. */
  mkdirSync(path.join(destinoProyecto, 'assets'), { recursive: true });
  writeFileSync(path.join(destinoProyecto, 'assets', '.gitkeep'), '');

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
