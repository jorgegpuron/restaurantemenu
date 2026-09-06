/* La comprobación que impide que la cobertura se quede atrás.
 *
 * Vuelve a extraer la superficie del panel DEL CÓDIGO —no de una lista escrita a mano— y exige
 * que cada cosa encontrada esté en `qa/inventario.json` con su prueba o con un BLOCKED razonado.
 * Si mañana alguien añade un `$_POST['nueva_cosa']` y no toca el inventario, esto falla, y la
 * suite entera se pone en rojo antes de que nadie llegue a mezclar el cambio.
 *
 * Se mira lo que de verdad define superficie:
 *   - $_POST[...] y $_FILES[...] del panel y del endpoint del marcador (acciones y subidas);
 *   - $_GET[...] (parámetros que cambian lo que se pinta);
 *   - name="..." de formularios (lo que un navegador puede enviar);
 *   - id de <form> (cada formulario tiene que tener dueño);
 *   - los .php de admin/ (cada endpoint alcanzable);
 *   - las claves que el panel escribe en estado.json.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { QA, ADMIN_FUENTE } from '../lib/entorno.mjs';

export function leerInventario() {
  return JSON.parse(readFileSync(path.join(QA, 'inventario.json'), 'utf8'));
}

/* Nombres que aparecen en `name="..."` y no son superficie del panel: son metadatos del
   documento. Se declaran en el inventario para que esta lista no se convierta en un cajón. */
function ignorados(inv) {
  return new Set(inv.campos_sin_accion.claves);
}

export function superficieDelCodigo() {
  const index = readFileSync(path.join(ADMIN_FUENTE, 'index.php'), 'utf8');
  const record = readFileSync(path.join(ADMIN_FUENTE, 'record.php'), 'utf8');
  const juntos = index + '\n' + record;

  const saca = (re, texto) => {
    const s = new Set();
    let m;
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    while ((m = r.exec(texto)) !== null) s.add(m[1]);
    return s;
  };

  const post = saca(/\$_POST\[["']([a-z_]+)["']\]/, juntos);
  const files = saca(/\$_FILES\[["']([a-z_]+)["']\]/, juntos);
  const get = saca(/\$_GET\[["']([a-z_]+)["']\]/, juntos);
  /* name="x" sólo dentro de campos y botones: un <meta name="google"> no es superficie. */
  const nombres = new Set();
  const reNombre = /<(input|button|select|textarea)\b[^>]*\bname="([a-z_]+)(\[\])?"/gi;
  let m;
  while ((m = reNombre.exec(index)) !== null) nombres.add(m[2]);
  const formularios = saca(/<form\b[^>]*\bid="([a-z-]+)"/i, index);

  const endpoints = existsSync(ADMIN_FUENTE)
    ? readdirSync(ADMIN_FUENTE).filter((f) => f.endsWith('.php')).map((f) => 'admin/' + f)
    : [];

  return { post, files, get, nombres, formularios, endpoints };
}

/* Devuelve la lista de huecos: cosas del código sin entrada en el inventario. */
export function huecosDeCobertura() {
  const inv = leerInventario();
  const s = superficieDelCodigo();
  const fuera = ignorados(inv);

  const clavesInventariadas = new Set();
  for (const a of inv.acciones_panel) clavesInventariadas.add(a.clave);
  for (const c of inv.claves_estado) clavesInventariadas.add(c.clave);

  const rutasInventariadas = new Set(inv.endpoints.map((e) => e.ruta));

  const huecos = [];
  const revisa = (conjunto, etiqueta) => {
    for (const k of conjunto) {
      if (fuera.has(k)) continue;
      if (!clavesInventariadas.has(k)) huecos.push(`${etiqueta}: ${k}`);
    }
  };
  revisa(s.post, 'accion POST sin prueba en el inventario');
  revisa(s.files, 'subida sin prueba en el inventario');
  revisa(s.get, 'parametro GET sin prueba en el inventario');
  revisa(s.nombres, 'campo de formulario sin prueba en el inventario');

  for (const e of s.endpoints) {
    if (!rutasInventariadas.has(e)) huecos.push(`endpoint sin prueba en el inventario: ${e}`);
  }

  /* Y al revés: una entrada del inventario que ya no existe en el código es ruido que engorda la
     lista y da falsa sensación de cobertura. */
  const sobrantes = [];
  const todasLasClaves = new Set([...s.post, ...s.files, ...s.get, ...s.nombres]);
  for (const a of inv.acciones_panel) {
    if (!todasLasClaves.has(a.clave)) sobrantes.push(`${a.id} (${a.clave}) ya no existe en el codigo`);
  }

  const blocked = inv.acciones_panel.filter((a) => a.estado === 'blocked')
    .concat(inv.endpoints.filter((e) => e.estado === 'blocked'))
    .concat(inv.nuevo_cliente.filter((e) => e.estado === 'blocked'))
    .concat(inv.actualizacion_motor.filter((e) => e.estado === 'blocked'));

  return { huecos, sobrantes, blocked, superficie: s, inventario: inv };
}

/* ---- LA fuente unica de totales ----
 * Antes cada sitio sumaba por su cuenta y el informe principal decia 133 mientras el semanal
 * decia 126: una de las dos cifras estaba escrita a mano y era falsa. A partir de aqui NADIE
 * suma nada: consola, JSON e informe Markdown llaman a esta funcion y ensenan lo mismo.
 *
 * Los bloques de superficie estan declarados por nombre a proposito. Si manana se anade un bloque
 * nuevo al inventario y no se anade aqui, `INV-06` lo detecta y falla: un total que se calcula
 * solo sobre los bloques que alguien recordo listar no es un total. */
export const BLOQUES_SUPERFICIE = [
  ['acciones_panel', 'Acciones y campos del panel'],
  ['endpoints', 'Endpoints'],
  ['manejadores_js_panel', 'Manejadores JavaScript del panel'],
  ['claves_estado', 'Claves de estado.json que escribe el panel'],
  ['paginas_publicas', 'Paginas publicas'],
  ['nuevo_cliente', 'Comandos de /nuevo-cliente'],
  ['actualizacion_motor', 'Pasos de actualizacion del motor'],
];
const BLOQUES_NO_SUPERFICIE = ['defectos_abiertos'];
const NO_SON_BLOQUES = new Set(['version', 'descripcion', 'commit_de_referencia',
  'estados_validos', 'campos_sin_accion']);

export function resumenInventario(inv = leerInventario()) {
  const bloques = BLOQUES_SUPERFICIE.map(([clave, nombre]) => ({
    clave, nombre, elementos: (inv[clave] || []).length,
  }));
  const todos = BLOQUES_SUPERFICIE.flatMap(([c]) => inv[c] || []);
  const porEstado = (e) => todos.filter((x) => x.estado === e);

  const superficie = todos.length;
  const blocked = porEstado('blocked');
  const noAplica = porEstado('no_aplica');
  const cubiertos = porEstado('cubierto');
  const defectos = inv.defectos_abiertos || [];

  /* Bloques del JSON que no estan clasificados en ninguna de las dos listas: si aparece uno, el
     total deja de ser un total. */
  const conocidos = new Set([...BLOQUES_SUPERFICIE.map(([c]) => c), ...BLOQUES_NO_SUPERFICIE]);
  const sinClasificar = Object.keys(inv)
    .filter((k) => !NO_SON_BLOQUES.has(k) && !conocidos.has(k) && Array.isArray(inv[k]));

  return {
    bloques,
    superficie,
    cubiertos: cubiertos.length,
    blocked: blocked.length,
    noAplica: noAplica.length,
    ejecutables: cubiertos.length,
    defectosConocidos: defectos.length,
    totalCatalogado: superficie + defectos.length,
    listaBlocked: blocked.map((b) => b.id),
    listaNoAplica: noAplica.map((b) => b.id),
    sinClasificar,
    /* Una linea lista para pegar en cualquier informe, para que nadie la reescriba a mano. */
    linea() {
      return `${superficie} elementos de superficie (${cubiertos.length} con prueba ejecutable, `
        + `${blocked.length} BLOCKED, ${noAplica.length} NO APLICA) + ${defectos.length} defectos `
        + `conocidos = ${superficie + defectos.length} catalogados`;
    },
  };
}

/* Los problemas de coherencia del inventario, en una funcion pura: la usan las comprobaciones
   INV-05 e INV-06 y tambien la autoprueba que altera el total a proposito. Si esto viviera dentro
   de `comprueba`, la autoprueba tendria que reimplementarlo y comprobaria su propia copia. */
export function problemasDeTotales(inv) {
  const res = resumenInventario(inv);
  const validos = new Set(inv.estados_validos || []);
  const estadosRaros = BLOQUES_SUPERFICIE.flatMap(([c]) => inv[c] || [])
    .filter((x) => !validos.has(x.estado)).map((x) => `${x.id}: ${x.estado}`);
  const porBloques = res.bloques.reduce((n, b) => n + b.elementos, 0);
  const porEstados = res.cubiertos + res.blocked + res.noAplica;
  const cuadra = porBloques === res.superficie && porEstados === res.superficie
    && res.sinClasificar.length === 0;
  return {
    resumen: res,
    estadosRaros,
    cuadra,
    detalle: `bloques=${porBloques} estados=${porEstados} superficie=${res.superficie}`
      + (res.sinClasificar.length ? ` | sin clasificar: ${res.sinClasificar.join(', ')}` : ''),
  };
}

export function comprueba(informe) {
  const r = huecosDeCobertura();
  informe.comprueba('INV-01', 'toda la superficie del panel esta en el inventario',
    r.huecos.length === 0, r.huecos.join(' | '));
  informe.comprueba('INV-02', 'el inventario no lista nada que ya no exista',
    r.sobrantes.length === 0, r.sobrantes.join(' | '));
  const sinMotivo = r.blocked.filter((b) => !b.motivo_blocked);
  informe.comprueba('INV-03', 'todo BLOCKED del inventario dice por que lo esta',
    sinMotivo.length === 0, sinMotivo.map((b) => b.id).join(', '));

  const pr = problemasDeTotales(r.inventario);
  informe.pass('INV-04', 'totales del inventario, calculados de una sola fuente', pr.resumen.linea());

  /* Los estados que aparecen en el JSON tienen que ser los declarados: un estado inventado no
     entraria en ninguna cuenta y desapareceria del total sin que nadie lo notara. */
  informe.comprueba('INV-05', 'todos los elementos usan un estado declarado',
    pr.estadosRaros.length === 0, pr.estadosRaros.join(' | '));

  /* Y la suma tiene que cuadrar por dos caminos distintos: por bloques y por estados. */
  informe.comprueba('INV-06', 'el total cuadra por bloques y por estados, y no hay bloques sin clasificar',
    pr.cuadra, pr.detalle);

  return { ...r, resumen: pr.resumen };
}
