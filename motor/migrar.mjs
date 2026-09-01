/* Migrar la pareja motor+carta cuando cambia la epoca del esquema de la carta.
 *
 *   node motor/migrar.mjs --desde <carpeta-con-motor-y-lock>
 *
 * actualizar.mjs se niega, y con razon, a instalar un motor cuyo esquemaCarta no sea el de
 * carta.json: cambiar solo una mitad deja una pareja que no compila. Este script hace el
 * salto ENTERO como una operacion transaccional superior: motor nuevo, carta convertida al
 * esquema nuevo, re-importacion y recompilacion — o todo, o nada.
 *
 * El unico salto que entiende hoy es carta/1 -> carta/2 (motor 1.0.x -> 1.1.x): los campos
 * multiidioma dejan de ser arrays posicionales y pasan a objetos por codigo de idioma, segun
 * CLIENTE.idiomas de cliente.mjs. Los metadatos estructurales del esquema nuevo (especial /
 * selector / aviso / escala / copiaDe / escalas) NO se inventan: lo que la carta no tenga se
 * queda ausente y, si el cliente lo necesita, se anade a mano y se re-importa.
 *
 * Flujo, numerado igual que en el codigo:
 *
 *    1. git limpio o no se empieza.
 *    2. transaccion del motor preparada (todas las validaciones + staging, nada tocado) y
 *       salto de esquema confirmado: sin salto se remite a actualizar.mjs; con esquemas
 *       desconocidos se aborta.
 *    3. carta convertida y validada en .carta.nueva-<rand>, junto a carta.json y SIN tocarlo.
 *    4. respaldo fisico del RECINTO DE SALIDAS en .migrar.respaldo-<rand>/ (mismo volumen),
 *       huella inicial del recinto y bytes de carta.json en memoria. El recinto es CERRADO:
 *       lo que reescriben importar.mjs y gen.mjs, ni un fichero mas. El contrato de la
 *       huella es existencia + rutas + bytes; permisos y fechas quedan fuera.
 *    5. motor aplicado (transaccion).       6. motor verificado contra el lock nuevo.
 *    7. carta.json sustituido por la carta convertida.
 *    8. node importar.mjs (proceso hijo).   9. node gen.mjs (proceso hijo).
 *   10. verificaciones conjuntas: el motor cuadra con su lock y la pareja motor/carta
 *       coincide (esquema de carta.json === esquemaCarta del lock nuevo).
 *   11. PUNTO DE NO RETORNO: commit de la transaccion y borrado de temporales. Un fallo aqui
 *       es SOLO de limpieza: se reintenta una vez y, si persiste, se informa la ruta exacta
 *       y se sale con 0. Jamas rollback despues del commit.
 *   12. Un fallo capturable en 5-10 deshace TODO best-effort y AGREGANDO errores sin
 *       interrumpirse: transaccion del motor, bytes de carta.json, recinto entero (bytes de
 *       los existentes, borrados recreados, creados eliminados, 2-subir/ borrado y
 *       restaurado entero), temporales. Despues verifica el resultado completo (huella final
 *       === inicial, motor cuadra con el lock ANTIGUO, pareja antigua coincide, git limpio)
 *       e imprime ROLLBACK_OK solo si TODO pasa; si no, ROLLBACK_FALLIDO con el detalle.
 *       git es SOLO verificacion: aqui esta prohibido git clean.
 *
 * La prueba de fallo a mitad esta automatizada con MIGRAR_FALLO_PRUEBA: 'tras-carta',
 * 'tras-importar', 'tras-gen', 'tras-verificaciones' y 'en-limpieza' lanzan un error en ese
 * punto exacto. Solo existe para eso. */
import { execSync, spawnSync } from 'node:child_process';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync, renameSync,
  readdirSync, cpSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RAIZ_CLIENTE, cliente, sha256, verificarMotor } from './entorno.mjs';
import { crearTransaccionMotor } from './transaccion-motor.mjs';

const NL = String.fromCharCode(10);
const args = process.argv.slice(2);
const dIdx = args.indexOf('--desde');
if (dIdx === -1 || !args[dIdx + 1]) {
  console.error('Uso: node motor/migrar.mjs --desde <carpeta con motor/ y motor.lock>');
  process.exit(1);
}
const rutaDesde = args[dIdx + 1];
const ORIGEN = pathToFileURL(rutaDesde.replace(/[\\/]+$/, '') + '/');

const marca = Math.random().toString(16).slice(2, 8);
const CARTA_NUEVA = cliente('.carta.nueva-' + marca);
const RESPALDO = cliente('.migrar.respaldo-' + marca + '/');

/* Los campos que en carta/1 son arrays posicionales y en carta/2 objetos por codigo. */
const MULTIIDIOMA = ['pestana', 'intro', 'subtitulo', 'nota', 'nombre', 'descripcion'];

const gancho = (punto) => {
  if ((process.env.MIGRAR_FALLO_PRUEBA || '') === punto) {
    throw new Error('FALLO SIMULADO ' + punto + ' (prueba)');
  }
};

/* ---- el recinto de salidas: cerrado, y sus rutas se resuelven en un solo sitio ---- */
function urlDeRuta(ruta) {
  if (ruta === '2-subir/' || ruta.startsWith('2-subir/')) return new URL('../' + ruta, RAIZ_CLIENTE);
  return cliente(ruta);
}
function rutasRecintoFijas(idiomas) {
  const codigos = idiomas.extras.map((i) => i.code);
  if (idiomas.base.code !== 'en') codigos.unshift(idiomas.base.code);
  return [
    'menu.md',
    ...codigos.map((c) => 'i18n.' + c + '.mjs'),
    'index.html',
    'juego.html',
    '404.php',
    'version.json',
    'server/admin/tokens.css',
    'server/admin/temas.json',
    'server/admin/platos.json',
    'server/admin/paises.php',
    'server/admin/fuentes.html',
    'server/admin/cliente.php',
  ];
}

/* La huella: una lista ordenada de registros y el sha256 de su texto. Detecta cualquier
   diferencia de existencia, ruta o bytes; permisos y fechas quedan fuera del contrato. */
function registrosDelRecinto(rutasFijas) {
  const regs = [];
  for (const ruta of rutasFijas) {
    const u = urlDeRuta(ruta);
    regs.push(existsSync(u) ? 'FICH ' + ruta + ' ' + sha256(u) : 'AUSENTE ' + ruta);
  }
  const raizSubir = urlDeRuta('2-subir/');
  if (!existsSync(raizSubir)) {
    regs.push('AUSENTE 2-subir/');
  } else {
    const anda = (dir, prefijo) => {
      regs.push('DIR ' + prefijo);
      for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (e.isDirectory()) anda(new URL(e.name + '/', dir), prefijo + e.name + '/');
        else regs.push('FICH ' + prefijo + e.name + ' ' + sha256(new URL(e.name, dir)));
      }
    };
    anda(raizSubir, '2-subir/');
  }
  regs.sort();
  return regs;
}
const huellaDelRecinto = (rutasFijas) => createHash('sha256')
  .update(registrosDelRecinto(rutasFijas).join(NL)).digest('hex');

/* Copia fisica de bytes del recinto al respaldo, registrando por ruta si existia: lo ausente
   tambien es estado, y en el rollback se vuelve a borrar. */
function tomarRespaldo(rutasFijas) {
  const manifiesto = [];
  mkdirSync(RESPALDO, { recursive: true });
  for (const ruta of rutasFijas) {
    const u = urlDeRuta(ruta);
    const existia = existsSync(u);
    manifiesto.push({ ruta, existia });
    if (existia) {
      const destino = new URL(ruta, RESPALDO);
      mkdirSync(new URL('./', destino), { recursive: true });
      copyFileSync(u, destino);
    }
  }
  const raizSubir = urlDeRuta('2-subir/');
  const existiaSubir = existsSync(raizSubir);
  manifiesto.push({ ruta: '2-subir/', existia: existiaSubir });
  if (existiaSubir) {
    cpSync(fileURLToPath(raizSubir), fileURLToPath(new URL('2-subir/', RESPALDO)), { recursive: true });
  }
  return manifiesto;
}
function restaurarEntrada({ ruta, existia }) {
  if (ruta === '2-subir/') {
    const raizSubir = urlDeRuta('2-subir/');
    rmSync(raizSubir, { recursive: true, force: true });
    if (existia) cpSync(fileURLToPath(new URL('2-subir/', RESPALDO)), fileURLToPath(raizSubir), { recursive: true });
    return;
  }
  const u = urlDeRuta(ruta);
  if (!existia) { rmSync(u, { force: true }); return; }
  mkdirSync(new URL('./', u), { recursive: true });
  copyFileSync(new URL(ruta, RESPALDO), u);
}

/* ---- la conversion carta/1 -> carta/2, generica y validada aparte ---- */
function convertirNodo(nodo, idiomas) {
  if (Array.isArray(nodo)) return nodo.map((x) => convertirNodo(x, idiomas));
  if (nodo && typeof nodo === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(nodo)) {
      if (MULTIIDIOMA.includes(k) && Array.isArray(v)
        && v.length === 1 + idiomas.extras.length && v.every((t) => typeof t === 'string')) {
        const obj = {};
        obj[idiomas.base.code] = v[0];
        idiomas.extras.forEach((i, ix) => { obj[i.code] = v[ix + 1]; });
        out[k] = obj;
      } else {
        out[k] = convertirNodo(v, idiomas);
      }
    }
    return out;
  }
  return nodo;
}
function recogerIds(nodo, acc) {
  if (Array.isArray(nodo)) { nodo.forEach((x) => recogerIds(x, acc)); return acc; }
  if (nodo && typeof nodo === 'object') {
    for (const [k, v] of Object.entries(nodo)) {
      if ((k === 'dishId' || k === 'categoryId') && typeof v === 'string') acc.push(k + ':' + v);
      recogerIds(v, acc);
    }
  }
  return acc;
}
/* Recorrido en paralelo: la UNICA diferencia admitida entre la carta vieja y la nueva es el
   valor de esquema en la raiz y los arrays multiidioma convertidos a objeto con los mismos
   textos por codigo. Todo lo demas, identico. */
function compararArboles(viejo, nuevo, idiomas, ruta, errores) {
  if (Array.isArray(viejo)) {
    if (!Array.isArray(nuevo) || nuevo.length !== viejo.length) {
      errores.push('ESTRUCTURA distinta en ' + ruta);
      return;
    }
    viejo.forEach((x, i) => compararArboles(x, nuevo[i], idiomas, ruta + '[' + i + ']', errores));
    return;
  }
  if (viejo && typeof viejo === 'object') {
    if (!nuevo || typeof nuevo !== 'object' || Array.isArray(nuevo)) {
      errores.push('ESTRUCTURA distinta en ' + ruta);
      return;
    }
    const clavesV = Object.keys(viejo);
    const clavesN = Object.keys(nuevo);
    if (clavesV.join(',') !== clavesN.join(',')) {
      errores.push('CLAVES distintas en ' + ruta + ': [' + clavesV + '] vs [' + clavesN + ']');
      return;
    }
    for (const k of clavesV) {
      const sub = ruta ? ruta + '.' + k : k;
      if (ruta === '' && k === 'esquema') continue; /* cambia a proposito */
      const a = viejo[k];
      const b = nuevo[k];
      if (MULTIIDIOMA.includes(k) && Array.isArray(a)
        && a.length === 1 + idiomas.extras.length && a.every((t) => typeof t === 'string')) {
        const codigos = [idiomas.base.code, ...idiomas.extras.map((i) => i.code)];
        if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).join(',') !== codigos.join(',')) {
          errores.push('CONVERSION mal formada en ' + sub);
          continue;
        }
        codigos.forEach((c, ix) => {
          if (b[c] !== a[ix]) errores.push('TEXTO distinto en ' + sub + '.' + c);
        });
      } else {
        compararArboles(a, b, idiomas, sub, errores);
      }
    }
    return;
  }
  if (viejo !== nuevo) errores.push('VALOR distinto en ' + ruta);
}
function arraysResiduales(nodo, ruta, errores) {
  if (Array.isArray(nodo)) {
    nodo.forEach((x, i) => arraysResiduales(x, ruta + '[' + i + ']', errores));
    return;
  }
  if (nodo && typeof nodo === 'object') {
    for (const [k, v] of Object.entries(nodo)) {
      const sub = ruta ? ruta + '.' + k : k;
      if (MULTIIDIOMA.includes(k) && Array.isArray(v)) errores.push('ARRAY RESIDUAL en ' + sub);
      arraysResiduales(v, sub, errores);
    }
  }
}

/* Aborta ANTES de la primera mutacion: aqui no hay nada que deshacer, solo staging y
   temporales propios que retirar. */
function abortar(mensaje) {
  console.error(mensaje);
  try { if (tx.estado() === 'PREPARADA') tx.rollback(); } catch (e) {
    console.error('  (y la limpieza del staging fallo: ' + e.message + ')');
  }
  try { rmSync(CARTA_NUEVA, { force: true }); } catch (e) { /* mejor esfuerzo */ }
  try { rmSync(RESPALDO, { recursive: true, force: true }); } catch (e) { /* mejor esfuerzo */ }
  process.exit(1);
}

/* ---- 1. git limpio o no se empieza ---- */
const sucio = execSync('git status --porcelain', { cwd: fileURLToPath(RAIZ_CLIENTE) }).toString().trim();
if (sucio) {
  console.error('El arbol de git no esta limpio. Guarda o descarta antes de migrar:');
  console.error(sucio.split(NL).slice(0, 8).map((l) => '  ' + l).join(NL));
  process.exit(1);
}

/* ---- 2. transaccion preparada y salto de esquema confirmado ---- */
const tx = crearTransaccionMotor({ origen: ORIGEN });
try {
  tx.preparar();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const bytesCarta = readFileSync(cliente('carta.json'));
const esquemaViejo = JSON.parse(bytesCarta.toString('utf8')).esquema;
const esquemaNuevo = tx.lockOrigen.esquemaCarta;
if (esquemaViejo === esquemaNuevo) {
  abortar('No hay salto de esquema: la carta y el motor del origen ya hablan ' + String(esquemaViejo) + '.' + NL
    + 'Eso es una actualizacion normal: node motor/actualizar.mjs --desde ' + rutaDesde);
}
if (esquemaViejo !== 'carta/1' || esquemaNuevo !== 'carta/2') {
  abortar('Salto de esquema desconocido: carta ' + String(esquemaViejo) + ' -> motor ' + String(esquemaNuevo) + '.' + NL
    + 'Este migrador solo sabe hacer carta/1 -> carta/2; no se adivina.');
}

/* ---- 3. la carta convertida, junto a carta.json y sin tocarlo ---- */
const modCliente = await import(cliente('cliente.mjs').href);
if (modCliente.IDIOMAS_CLIENTE) {
  abortar('cliente.mjs todavia exporta IDIOMAS_CLIENTE (el formato viejo).' + NL
    + 'Antes de migrar la carta, cliente.mjs tiene que declarar CLIENTE.idiomas' + NL
    + '({ base: { code, ... }, extras: [{ code, ... }] }); la conversion sale de ahi.');
}
const idiomas = modCliente.CLIENTE && modCliente.CLIENTE.idiomas;
if (!idiomas || !idiomas.base || typeof idiomas.base.code !== 'string'
  || !Array.isArray(idiomas.extras) || idiomas.extras.some((i) => !i || typeof i.code !== 'string')) {
  abortar('cliente.mjs no declara CLIENTE.idiomas con la forma esperada' + NL
    + '({ base: { code, ... }, extras: [{ code, ... }] }): sin eso no hay conversion.');
}
const cartaVieja = JSON.parse(bytesCarta.toString('utf8'));
const cartaNueva = convertirNodo(cartaVieja, idiomas);
cartaNueva.esquema = 'carta/2';
{
  const errores = [];
  const idsViejos = recogerIds(cartaVieja, []).join(NL);
  const idsNuevos = recogerIds(cartaNueva, []).join(NL);
  if (idsViejos !== idsNuevos) errores.push('IDS: no son los mismos o no estan en el mismo orden');
  compararArboles(cartaVieja, cartaNueva, idiomas, '', errores);
  arraysResiduales(cartaNueva, '', errores);
  if (errores.length) {
    abortar('LA CONVERSION NO VALIDA y carta.json no se ha tocado:' + NL
      + errores.slice(0, 10).map((m) => '  ' + m).join(NL)
      + (errores.length > 10 ? NL + '  ... y ' + (errores.length - 10) + ' mas' : ''));
  }
}
writeFileSync(CARTA_NUEVA, JSON.stringify(cartaNueva, null, 2) + NL);

/* ---- 4. respaldo del recinto de salidas + huella inicial ---- */
const rutasFijas = rutasRecintoFijas(idiomas);
let huellaInicial = null;
let manifiesto = null;
try {
  huellaInicial = huellaDelRecinto(rutasFijas);
  manifiesto = tomarRespaldo(rutasFijas);
} catch (e) {
  abortar('NO SE PUDO RESPALDAR EL RECINTO y nada se ha tocado: ' + e.message);
}

/* ---- 12. el rollback best-effort, definido antes de usarse en 5-10 ---- */
function rollbackBestEffort(e) {
  console.error(NL + 'LA MIGRACION FALLO: ' + e.message);
  console.error('deshaciendo TODO (best-effort, agregando errores)...');
  const fallos = [];
  const intenta = (nombre, fn) => {
    try { fn(); } catch (er) { fallos.push(nombre + ': ' + er.message); }
  };
  /* (a) el motor y sus tres ficheros de la raiz */
  intenta('restauracion de la transaccion del motor', () => tx.rollback());
  /* (b) los bytes de carta.json */
  intenta('restauracion de carta.json', () => writeFileSync(cliente('carta.json'), bytesCarta));
  /* (c) el recinto de salidas, entrada a entrada */
  for (const entrada of manifiesto) {
    intenta('restauracion del recinto (' + entrada.ruta + ')', () => restaurarEntrada(entrada));
  }
  /* (d) los temporales */
  intenta('limpieza de ' + fileURLToPath(CARTA_NUEVA), () => rmSync(CARTA_NUEVA, { force: true }));
  intenta('limpieza de ' + fileURLToPath(RESPALDO), () => rmSync(RESPALDO, { recursive: true, force: true }));
  /* Y despues, TODAS las verificaciones, pase lo que pase con las restauraciones. */
  intenta('verificacion de la huella del recinto', () => {
    const huellaFinal = huellaDelRecinto(rutasFijas);
    if (huellaFinal !== huellaInicial) {
      throw new Error('la huella final no es la inicial ('
        + huellaFinal.slice(0, 12) + ' vs ' + huellaInicial.slice(0, 12) + ')');
    }
  });
  intenta('verificacion del motor contra el lock antiguo', () => {
    const lock = verificarMotor();
    if (lock.version !== tx.lockActual.version
      || lock.esquemaCarta !== tx.lockActual.esquemaCarta
      || lock.esquemaEstado !== tx.lockActual.esquemaEstado) {
      throw new Error('el lock en disco no es el antiguo: version ' + lock.version
        + ', esquemaCarta ' + lock.esquemaCarta + ', esquemaEstado ' + lock.esquemaEstado);
    }
  });
  intenta('verificacion de la pareja motor/carta antigua', () => {
    const esquema = JSON.parse(readFileSync(cliente('carta.json'), 'utf8')).esquema;
    if (esquema !== tx.lockActual.esquemaCarta) {
      throw new Error('carta ' + String(esquema) + ' vs lock ' + tx.lockActual.esquemaCarta);
    }
  });
  intenta('verificacion de git', () => {
    const tras = execSync('git status --porcelain', { cwd: fileURLToPath(RAIZ_CLIENTE) }).toString().trim();
    if (tras) {
      throw new Error('git status no sale limpio:' + NL
        + tras.split(NL).slice(0, 8).map((l) => '    ' + l).join(NL));
    }
  });
  if (!fallos.length) {
    console.error('ROLLBACK_OK');
  } else {
    console.error('ROLLBACK_FALLIDO');
    fallos.forEach((f) => console.error('  ' + f));
  }
  process.exit(1);
}

/* ---- 5-10. el salto entero, o rollback de todo ---- */
console.log('migrando: motor', tx.lockActual.version, '->', tx.lockOrigen.version,
  '| carta', esquemaViejo, '->', esquemaNuevo);
const correr = (script) => {
  const r = spawnSync(process.execPath, [script], { cwd: fileURLToPath(RAIZ_CLIENTE), stdio: 'inherit' });
  if (r.error) throw new Error('node ' + script + ' no arranco: ' + r.error.message);
  if (r.status !== 0) throw new Error('node ' + script + ' devolvio ' + r.status);
};
try {
  /* 5 */ tx.aplicar();
  /* 6 */ tx.verificar();
  /* 7 */ renameSync(CARTA_NUEVA, cliente('carta.json'));
  gancho('tras-carta');
  /* 8 */ correr('importar.mjs');
  gancho('tras-importar');
  /* 9 */ correr('gen.mjs');
  gancho('tras-gen');
  /* 10 */
  const lockNuevo = verificarMotor();
  const esquemaTras = JSON.parse(readFileSync(cliente('carta.json'), 'utf8')).esquema;
  if (esquemaTras !== lockNuevo.esquemaCarta) {
    throw new Error('la pareja no cuadra tras compilar: carta ' + String(esquemaTras)
      + ' vs lock ' + lockNuevo.esquemaCarta);
  }
  gancho('tras-verificaciones');
} catch (e) {
  rollbackBestEffort(e);
}

/* ---- 11. punto de no retorno: commit y limpieza; jamas rollback a partir de aqui ---- */
let resultado = tx.commit();
if (resultado.limpiezaPendiente.length) resultado = tx.commit(); /* un reintento */
const pendientes = [...resultado.limpiezaPendiente];
const borrarTemporal = (url) => {
  if (!existsSync(url)) return null;
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      gancho('en-limpieza');
      rmSync(url, { recursive: true, force: true });
      return null;
    } catch (e) { /* se reintenta una vez; si persiste, se informa la ruta */ }
  }
  return fileURLToPath(url);
};
for (const url of [RESPALDO, CARTA_NUEVA]) {
  const pendiente = borrarTemporal(url);
  if (pendiente) pendientes.push(pendiente);
}
pendientes.forEach((ruta) => console.log('MIGRACION CONFIRMADA; LIMPIEZA PENDIENTE: ' + ruta));

console.log(NL + 'migracion aplicada: motor ' + tx.lockActual.version + ' -> ' + tx.lockOrigen.version
  + ' | carta ' + esquemaViejo + ' -> ' + esquemaNuevo + ', re-importada y recompilada.');
console.log('Los metadatos estructurales (especial/selector/aviso/escala/copiaDe/escalas) NO se');
console.log('inventan: si el cliente los necesita, se anaden a mano en carta.json y se re-importa.');
console.log(NL + 'AHORA: pasa la bateria entera, y solo entonces decide el commit.');
