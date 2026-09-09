/* `npm --prefix qa run fast` — lo que se pasa en cada cambio, antes de nada.
 *
 * Nada de navegador aquí: son comprobaciones de fichero y de proceso, para que quepan en unos
 * minutos y se puedan ejecutar sin pensárselo. Lo que necesita Chrome vive en `full`.
 *
 * La compilación canónica se hace sobre un CLON en el temporal, nunca sobre el repositorio: un
 * `gen.mjs` en sitio rehace `2-subir` y cambia el sello del build, y entonces pasar las pruebas
 * dejaría el producto publicado distinto. Eso es justo lo que esta fase tiene que demostrar que
 * no pasa.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Informe } from '../lib/informe.mjs';
import { correr } from '../lib/proc.mjs';
import {
  CLIENTE, MOTOR, SALIDA, QA, NODE, PHP, carpetaTemporal, limpiarTemporales, versiones, commitActual,
} from '../lib/entorno.mjs';
import { clonarTinge, compilar, verificarBuild, lock, hashesDe, comparaHashes } from '../lib/clientes.mjs';
import * as inventario from './inventario.mjs';
import { normalizaEstadoParaHuella, CLAVES_ESQUEMA_TOLERADAS } from '../lib/fixtura-lh.mjs';

/* El mismo motivo en FAST-13, FAST-19 y FULL-93: una sola frase, y no tres que se
   desincronicen. */
export const MOTIVO_SIN_SALIDA = 'la carpeta de subida vive fuera del repositorio y en este arbol no existe: comparar hashes de una carpeta ausente seria un PASS vacio';

/* Lista relativa y ordenada de todos los ficheros de un arbol: la forma de comparar dos salidas
   sin que el orden del sistema de ficheros meta ruido. */
function listaRelativa(raiz) {
  const out = [];
  (function w(d, pre) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name);
      const rel = pre ? pre + '/' + e.name : e.name;
      if (e.isDirectory()) w(abs, rel); else out.push(rel);
    }
  })(raiz, '');
  return out.sort();
}

const ICONO_PESTANA = 'assets/titleIcon-accent.svg';
const shaCorto = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex').slice(0, 16);

export async function fast(informe = new Informe('QA rapida')) {
  informe.seccion('arbol y sintaxis');

  const dc = correr('git', ['diff', '--check'], { cwd: CLIENTE });
  informe.comprueba('FAST-01', 'git diff --check limpio', dc.ok && !dc.salida.trim(), dc.texto.trim());

  if (!PHP) {
    informe.blocked('FAST-02', 'sintaxis PHP', 'no hay binario de PHP en el PATH');
  } else {
    const phps = ['index.php', 'record.php', 'config.php', 'datos.php', 'vista.php', 'hash.php']
      .map((f) => path.join(MOTOR, 'server', 'admin', f)).filter(existsSync);
    const malos = phps.filter((f) => !correr(PHP, ['-l', f]).ok);
    informe.comprueba('FAST-02', `sintaxis PHP de los ${phps.length} ficheros del panel`,
      malos.length === 0, malos.join(', '));
  }

  const jsMotor = readdirSync(MOTOR).filter((f) => f.endsWith('.mjs')).map((f) => path.join(MOTOR, f));
  const jsRaiz = ['gen.mjs', 'importar.mjs', 'nuevo-cliente.mjs', 'cliente.mjs']
    .map((f) => path.join(CLIENTE, f)).filter(existsSync);
  const jsQa = [];
  const recorreQa = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'tmp' || e.name === 'informes') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) recorreQa(p); else if (e.name.endsWith('.mjs')) jsQa.push(p);
    }
  };
  recorreQa(QA);
  const jsMalos = [...jsMotor, ...jsRaiz, ...jsQa].filter((f) => !correr(NODE, ['--check', f]).ok);
  informe.comprueba('FAST-03', `sintaxis JavaScript (${jsMotor.length + jsRaiz.length} del producto, ${jsQa.length} de QA)`,
    jsMalos.length === 0, jsMalos.join(', '));

  informe.seccion('motor y build canonico (sobre un clon, nunca sobre el repositorio)');

  const lockRepo = lock(CLIENTE);
  informe.comprueba('FAST-04', 'motor.lock cuadra en el repositorio', lockRepo.ok, lockRepo.texto.trim().split('\n').pop());

  const antesRepo = hashesDe(SALIDA);
  const clon = clonarTinge();

  /* Sin hash de activacion: se compila igual que compila el despliegue de este cliente. Ponerlo
     escribiria un admin/activacion.php que Tinge no tiene, y entonces la comprobacion de ficheros
     obligatorios estaria mirando un build que no es el que se publica. */
  const c1 = compilar(clon.proyecto, { conActivacion: false });
  informe.comprueba('FAST-05', 'compilacion canonica del clon', c1.gen.ok,
    c1.gen.ok ? c1.gen.salida.trim().split('\n').pop() : c1.gen.texto.trim().slice(-400));

  const vb = verificarBuild(clon.proyecto);
  informe.comprueba('FAST-06', 'verificar-build.mjs', vb.ok, vb.texto.trim().split('\n').pop());

  const build1 = hashesDe(clon.salida);
  const c2 = compilar(clon.proyecto, { conActivacion: false });
  const build2 = hashesDe(clon.salida);
  const dif = comparaHashes(build1, build2);
  /* Tres ficheros llevan el sello del build y por eso cambian siempre; cualquier otro que cambie
     es una compilación que no es reproducible. */
  const conSello = new Set(['index.html', 'version.json', 'admin/cliente.php']);
  const inesperados = dif.cambiados.filter((f) => !conSello.has(f));
  informe.comprueba('FAST-07', 'dos builds seguidos solo difieren en los tres ficheros con sello',
    c2.gen.ok && inesperados.length === 0 && dif.nuevos.length === 0 && dif.perdidos.length === 0,
    `cambiados: ${dif.cambiados.join(', ')} | nuevos: ${dif.nuevos.join(', ')} | perdidos: ${dif.perdidos.join(', ')}`);

  const obligatorios = ['index.html', 'juego.html', '404.php', 'version.json', '.htaccess',
    'estado-EJEMPLO.json', 'admin/index.php', 'admin/cliente.php', 'admin/record.php', ICONO_PESTANA];
  const faltan = obligatorios.filter((f) => !existsSync(path.join(clon.salida, f)));
  informe.comprueba('FAST-08', 'los ficheros obligatorios estan en la salida', faltan.length === 0, faltan.join(', '));

  /* ---- el panel servido: sin comentarios, pero SOLO donde no hay PHP ----
   *
   * El panel se copia a la salida y hasta este release se iba al navegador con todos sus
   * comentarios de CSS y de JavaScript: 270.062 bytes que no ejecutan nada. Ahora el build los
   * quita, y con dos limites que hay que poder demostrar manana tambien:
   *
   *   - un bloque con PHP dentro NO se toca, sin juzgar si ese PHP parece inofensivo;
   *   - fuera de <style> y <script> no se toca ni un byte.
   *
   * Se mira el FUENTE contra lo COMPILADO, que es lo unico que importa. La idempotencia ya la
   * comprueba FAST-07 —dos builds seguidos solo difieren en los tres ficheros con sello, y el
   * panel no es uno de ellos—, asi que no se repite aqui. */
  {
    const fuentePanel = path.join(clon.proyecto, 'motor', 'server', 'admin', 'index.php');
    const salidaPanel = path.join(clon.salida, 'admin', 'index.php');
    const hayLosDos = existsSync(fuentePanel) && existsSync(salidaPanel);
    const src = hayLosDos ? readFileSync(fuentePanel, 'utf8') : '';
    const out = hayLosDos ? readFileSync(salidaPanel, 'utf8') : '';
    const BLOQUES = /<style\b[^>]*>([\s\S]*?)<\/style>|<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    const trocear = (t) => {
      const bloques = []; const fuera = []; let ultimo = 0;
      for (const m of t.matchAll(BLOQUES)) {
        fuera.push(t.slice(ultimo, m.index));
        const cuerpo = m[1] !== undefined ? m[1] : m[2];
        bloques.push({ cuerpo, css: m[1] !== undefined, php: cuerpo.includes('<?') || cuerpo.includes('?>') });
        ultimo = m.index + m[0].length;
      }
      fuera.push(t.slice(ultimo));
      return { bloques, fuera };
    };
    const A = trocear(src); const B = trocear(out);

    /* 1. Todo lo que NO es <style>/<script> sale byte a byte igual. */
    informe.comprueba('FAST-25', 'el panel servido es byte a byte el fuente en todo lo que no es <style> ni <script>',
      hayLosDos && A.fuera.length === B.fuera.length && A.fuera.every((x, i) => x === B.fuera[i]),
      hayLosDos ? `${A.fuera.length} tramos comparados` : 'no estan los dos ficheros');

    /* 2. Un bloque con PHP no se toca. Ni uno. */
    const mixtos = A.bloques.filter((b) => b.php).length;
    const mixtosIguales = A.bloques.every((b, i) => !b.php || (B.bloques[i] && B.bloques[i].cuerpo === b.cuerpo));
    informe.comprueba('FAST-26', 'todo bloque con PHP dentro sale del build byte a byte como entro',
      hayLosDos && A.bloques.length === B.bloques.length && mixtos > 0 && mixtosIguales,
      `${mixtos} bloques con PHP de ${A.bloques.length}`);

    /* 3. Los bloques puros pierden los comentarios y CONSERVAN lo que se ejecuta. Las tres
          trampas del recorrido son las URLs con //, las cadenas con // o con las marcas de
          comentario dentro, y las expresiones regulares literales: se cuentan antes y despues
          y tienen que salir igual. Si el limpiador se comiera una, aqui bajaria el numero. */
    const puros = A.bloques.map((b, i) => [b, B.bloques[i]]).filter(([a]) => !a.php);
    const cuenta = (t, re) => (t.match(re) || []).length;
    const urlsA = puros.reduce((n, [a]) => n + cuenta(a.cuerpo, /https?:\/\//g), 0);
    const urlsB = puros.reduce((n, [, b]) => n + cuenta(b.cuerpo, /https?:\/\//g), 0);
    const comentaBloque = puros.reduce((n, [, b]) => n + cuenta(b.cuerpo, /\/\*/g), 0);
    const menos = puros.reduce((n, [a, b]) => n + (a.cuerpo.length - b.cuerpo.length), 0);
    informe.comprueba('FAST-27', 'los bloques sin PHP salen sin comentarios y conservan las URLs y las expresiones regulares',
      hayLosDos && puros.length > 0 && menos > 0 && comentaBloque === 0 && urlsA === urlsB && urlsA > 0,
      `${puros.length} bloques puros · ${menos} bytes menos · ${urlsA}/${urlsB} URLs · ${comentaBloque} restos de /*`);

    /* 3b. Y la demostracion de verdad: el JavaScript servido SIGUE ANALIZANDOSE.
           Contar URLs es una pista; que el analizador de Node acepte cada bloque es otra cosa.
           Si el limpiador se hubiera comido el cierre de una cadena, el final de una expresion
           regular o el `${` de una plantilla, aqui saltaria — y ese es exactamente el fallo que
           un limpiador a base de buscar y reemplazar comete en silencio.
           Solo se analizan los bloques SIN PHP: los otros no son JavaScript valido y no se han
           tocado. */
    {
      const dir = carpetaTemporal('totm-panel-js-');
      const rotos = [];
      let analizados = 0;
      puros.filter(([a]) => !a.css).forEach(([, b], i) => {
        const ruta = path.join(dir, `bloque-${i}.mjs`);
        writeFileSync(ruta, b.cuerpo, 'utf8');
        const r = correr(NODE, ['--check', ruta]);
        analizados++;
        if (!r.ok) rotos.push(`bloque ${i}: ${r.texto.trim().split('\n')[0].slice(0, 120)}`);
      });
      informe.comprueba('FAST-29', 'el JavaScript servido del panel sigue analizandose despues de quitarle los comentarios',
        analizados > 0 && rotos.length === 0,
        rotos.length ? rotos.slice(0, 3).join(' | ') : `${analizados} bloques analizados sin un error`);
    }

    /* 4. Y el FUENTE no se toca: sus comentarios son la documentacion de este proyecto. */
    const comentaFuente = A.bloques.filter((b) => !b.php).reduce((n, b) => n + cuenta(b.cuerpo, /\/\*/g), 0);
    informe.comprueba('FAST-28', 'el fuente del panel conserva sus comentarios: el adelgazado es sobre la copia',
      hayLosDos && comentaFuente > 0, `${comentaFuente} comentarios de bloque en el fuente`);
  }

  /* ---- El manifiesto aprobado de la salida ----
   * La lista de arriba es un minimo escrito a mano; esto es la salida entera, fichero a fichero,
   * contra `qa/manifiesto-build.json`. Perder un fichero publicado es una regresion silenciosa: no
   * rompe ninguna pagina hasta que alguien la abre. Un fichero de mas tambien se dice, porque un
   * derivado que el build ya no produce y nadie borra se queda en el hosting para siempre. */
  const manifiesto = JSON.parse(readFileSync(path.join(QA, 'manifiesto-build.json'), 'utf8'));
  if (!existsSync(clon.salida)) {
    /* Si la compilacion abortó, aqui no hay nada que listar. Antes esto reventaba con un ENOENT y
       se llevaba por delante el proceso entero, asi que el log terminaba en una excepcion en vez de
       en un informe: el fallo de verdad —el de FAST-05— quedaba enterrado. */
    informe.fail('FAST-18', 'el build canonico entrega los ficheros del manifiesto aprobado',
      `no hay salida que comparar en ${clon.salida}: la compilacion no llego a producirla (ver FAST-05)`);
    return informe;
  }
  const generados = listaRelativa(clon.salida);
  const setGenerados = new Set(generados);
  const perdidosDelManifiesto = manifiesto.ficheros_obligatorios.filter((f) => !setGenerados.has(f));
  const opcionales = new Set((manifiesto.opcionales || []).map((o) => o.ruta || o));
  const setManifiesto = new Set(manifiesto.ficheros_obligatorios);
  const sobrantesDelBuild = generados.filter((f) => !setManifiesto.has(f) && !opcionales.has(f));
  informe.comprueba('FAST-18',
    `el build canonico entrega los ${manifiesto.total_obligatorios} ficheros del manifiesto aprobado`,
    perdidosDelManifiesto.length === 0 && sobrantesDelBuild.length === 0,
    `faltan: ${perdidosDelManifiesto.join(', ') || '(ninguno)'} | sobran: ${sobrantesDelBuild.join(', ') || '(ninguno)'}`);

  /* La carpeta publicada del repositorio, contra el mismo manifiesto. Aqui SI puede haber
     ficheros de mas, pero solo los declarados como obsoletos tolerados y con su explicacion:
     cualquier otro es un fichero que nadie sabe de donde salio. */
  const tolerados = new Map((manifiesto.obsoletos_tolerados_en_la_carpeta_publicada || [])
    .map((o) => [o.ruta, o.por_que]));
  if (existsSync(SALIDA)) {
    const publicados = listaRelativa(SALIDA);
    const setPub = new Set(publicados);
    const faltanEnPublicado = manifiesto.ficheros_obligatorios.filter((f) => !setPub.has(f));
    const extrasEnPublicado = publicados.filter((f) => !setManifiesto.has(f) && !opcionales.has(f));
    const extrasSinDeclarar = extrasEnPublicado.filter((f) => !tolerados.has(f));
    informe.comprueba('FAST-19',
      'la carpeta publicada trae el manifiesto completo y solo los sobrantes declarados',
      faltanEnPublicado.length === 0 && extrasSinDeclarar.length === 0,
      `publicados: ${publicados.length} | faltan: ${faltanEnPublicado.join(', ') || '(ninguno)'}`
        + ` | sobrantes declarados: ${extrasEnPublicado.filter((f) => tolerados.has(f)).join(', ') || '(ninguno)'}`
        + ` | sobrantes SIN declarar: ${extrasSinDeclarar.join(', ') || '(ninguno)'}`);
  } else {
    /* `2-subir` es la carpeta de subida y vive FUERA del repositorio, al lado de `1-proyecto`. En
       un checkout limpio —CI, o un clon recien hecho— sencillamente no existe, y eso no es un
       bloqueo de infraestructura: es que aqui no hay carpeta publicada que comparar. */
    informe.noAplica('FAST-19', 'la carpeta publicada contra el manifiesto',
      'no hay 2-subir en este arbol: la carpeta de subida vive fuera del repositorio');
  }

  const icono = path.join(clon.salida, ICONO_PESTANA);
  const iconoOk = existsSync(icono) && statSync(icono).size > 0
    && readFileSync(icono, 'utf8').trim().startsWith('<svg');
  informe.comprueba('FAST-09', 'el icono de pestana existe y es un SVG', iconoOk,
    existsSync(icono) ? `${statSync(icono).size} bytes` : 'no existe');

  informe.seccion('limpieza del motor y del publicado');

  /* El motor no puede llevar dentro datos de ningun restaurante. Las menciones en COMENTARIOS
     son historia del proyecto y no son datos: se descuentan mirando si la línea es comentario. */
  const conDatosDeCliente = [];
  const recorreMotor = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { recorreMotor(p); continue; }
      if (!/\.(mjs|php|css|html|js|json)$/.test(e.name)) continue;
      const texto = readFileSync(p, 'utf8');
      texto.split(/\r?\n/).forEach((linea, i) => {
        if (!/tinge_of_turmeric|socialcard\.es\/tinge|Tinge of Turmeric/i.test(linea)) return;
        const limpia = linea.trim();
        const esComentario = limpia.startsWith('*') || limpia.startsWith('//') || limpia.startsWith('/*')
          || limpia.startsWith('#') || limpia.startsWith('<!--');
        if (!esComentario) conDatosDeCliente.push(`${path.relative(CLIENTE, p)}:${i + 1}`);
      });
    }
  };
  recorreMotor(MOTOR);
  informe.comprueba('FAST-10', 'ninguna ruta ni nombre de Tinge dentro del motor fuera de comentarios',
    conDatosDeCliente.length === 0, conDatosDeCliente.join(', '));

  /* Secretos: ni en el motor, ni en lo que se publica, ni en la propia bateria. */
  const patronesSecreto = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bghp_[A-Za-z0-9]{20,}\b/,
    /password\s*=\s*["'][^"']{6,}["']/i,
    /FTP_PASSWORD\s*[:=]\s*["'][^"']+["']/,
  ];
  const conSecreto = [];
  const buscaSecretos = (raiz) => {
    const rec = (d) => {
      if (!existsSync(d)) return;
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (['node_modules', '.git', 'tmp', 'informes'].includes(e.name)) continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) { rec(p); continue; }
        if (!/\.(mjs|php|css|html|js|json|md|txt|yml)$/.test(e.name)) continue;
        let texto;
        try { texto = readFileSync(p, 'utf8'); } catch { continue; }
        for (const re of patronesSecreto) {
          if (re.test(texto)) conSecreto.push(`${path.relative(CLIENTE, p)} (${re.source.slice(0, 28)})`);
        }
      }
    };
    rec(raiz);
  };
  buscaSecretos(MOTOR);
  buscaSecretos(QA);
  buscaSecretos(clon.salida);
  informe.comprueba('FAST-11', 'sin secretos en el motor, en la bateria ni en lo publicado',
    conSecreto.length === 0, conSecreto.join(', '));

  /* Nada de QA puede acabar en lo que se sube. Se mira por nombre y por contenido. */
  const enSalida = [];
  const recSalida = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { recSalida(p); continue; }
      const rel = path.relative(clon.salida, p).split(path.sep).join('/');
      if (/^qa\//.test(rel) || /playwright|lighthouse/i.test(e.name)) enSalida.push(rel);
    }
  };
  recSalida(clon.salida);
  const carpetaQaEnSalida = existsSync(path.join(clon.salida, 'qa'));
  informe.comprueba('FAST-12', 'la bateria no aparece en 2-subir',
    enSalida.length === 0 && !carpetaQaEnSalida, enSalida.join(', '));

  /* Y el repositorio sigue exactamente igual que al empezar. Si no hay carpeta publicada —un
     checkout limpio no la tiene, porque vive fuera del repositorio— esto no es un PASS: no hay
     nada que comparar, y decirlo es mas honesto que dar por buena una comparacion de dos
     conjuntos vacios. */
  if (!existsSync(SALIDA)) {
    informe.noAplica('FAST-13', 'el 2-subir del repositorio no se ha tocado', MOTIVO_SIN_SALIDA);
  } else {
    const despuesRepo = hashesDe(SALIDA);
    const repo = comparaHashes(antesRepo, despuesRepo);
    /* Mismo arreglo que en FULL-93: `hashesDe` devuelve un Map y `Object.keys` sobre un Map
       da cero siempre. Y hay que nombrar los NUEVOS, que es lo que de verdad aparece aqui. */
    informe.comprueba('FAST-13', 'el 2-subir del repositorio no se ha tocado', repo.iguales,
      `${despuesRepo.size} ficheros | cambiados: ${repo.cambiados.join(', ') || '(ninguno)'}`
      + ` | nuevos: ${repo.nuevos.join(', ') || '(ninguno)'}`
      + ` | perdidos: ${repo.perdidos.join(', ') || '(ninguno)'}`);
  }

  /* La normalizacion semantica del estado para la huella de Lighthouse, con sus dos caras.
     Afinar una guarda es legitimo; debilitarla, no, y la diferencia entre las dos cosas hay que
     poder demostrarla manana tambien. Por eso los escenarios viven aqui y no en un cuaderno:
     lo unico que se tolera es «clave ausente» == «clave presente y EXACTAMENTE []», y solo para
     las siete claves nominadas. Todo lo demas —contenido dentro de esas claves, una octava
     clave aunque venga vacia, {} o null en lugar de [], o cualquier dato sembrado distinto—
     sigue bloqueando la comparacion. */
  {
    const sem = [];
    const h = (o) => shaCorto(normalizaEstadoParaHuella(JSON.stringify(o)));
    const base = { hero: ['a1'], ad: { on: true }, game: { on: true }, actualizado: 'x' };
    const siete = {};
    for (const k of CLAVES_ESQUEMA_TOLERADAS) siete[k] = [];
    const conSiete = { ...base, ...siete };
    const comprueba = (etq, iguales, esperado) => { if (iguales !== esperado) sem.push(etq); };

    comprueba('las siete vacias equivalen a ausentes', h(base) === h(conSiete), true);
    comprueba('una de las siete CON contenido bloquea', h(base) === h({ ...conSiete, orden: ['algo'] }), false);
    comprueba('{} no equivale a []', h(base) === h({ ...conSiete, orden: {} }), false);
    comprueba('null no equivale a []', h(base) === h({ ...conSiete, editados: null }), false);
    comprueba('una octava clave vacia bloquea', h(base) === h({ ...conSiete, inventada: [] }), false);
    comprueba('un dato sembrado distinto bloquea', h(base) === h({ ...conSiete, game: { on: false } }), false);
    comprueba('otra portada bloquea', h(base) === h({ ...conSiete, hero: ['otra'] }), false);
    comprueba('dos arboles nuevos siguen comparandose', h(conSiete) === h(conSiete), true);
    /* Y que no invente: con datos dentro, la clave sobrevive a la normalizacion. */
    const vivo = JSON.parse(normalizaEstadoParaHuella(JSON.stringify({ ...base, orden: { c1: ['d1'] } })));
    comprueba('una clave autorizada CON datos no se borra', vivo.orden !== undefined, true);

    informe.comprueba('FAST-24', 'la normalizacion del estado para Lighthouse tolera SOLO las siete claves de esquema vacias, y nada mas',
      sem.length === 0 && CLAVES_ESQUEMA_TOLERADAS.length === 7,
      sem.length ? sem.join(' | ') : `${CLAVES_ESQUEMA_TOLERADAS.length} claves: ${CLAVES_ESQUEMA_TOLERADAS.join(', ')}`);
  }

  informe.seccion('inventario y trazabilidad');
  inventario.comprueba(informe);

  informe.seccion('el workflow de calidad no puede publicar');
  const rutaWf = path.join(CLIENTE, '.github', 'workflows', 'quality.yml');
  if (!existsSync(rutaWf)) {
    informe.fail('FAST-14', 'existe el workflow de calidad', rutaWf);
  } else {
    const wf = readFileSync(rutaWf, 'utf8');
    const acciones = [...wf.matchAll(/uses:\s*(\S+)@(\S+)/g)];
    const sinFijar = acciones.filter(([, , ref]) => !/^[0-9a-f]{40}$/.test(ref)).map(([, a]) => a);
    informe.comprueba('FAST-14', 'el workflow de calidad no usa secretos ni escribe nada',
      /permissions:\s*\n\s*contents:\s*read/.test(wf) && !/\$\{\{\s*secrets\./.test(wf),
      'permisos y secretos');
    informe.comprueba('FAST-15', 'todas las acciones del workflow van fijadas por SHA',
      sinFijar.length === 0, sinFijar.join(', '));
    informe.comprueba('FAST-16', 'cada job del workflow tiene timeout',
      (wf.match(/timeout-minutes:/g) || []).length >= (wf.match(/runs-on:/g) || []).length,
      `${(wf.match(/timeout-minutes:/g) || []).length} timeouts para ${(wf.match(/runs-on:/g) || []).length} jobs`);
    /* Y no toca el de despliegue: son dos ficheros y siguen siendo dos. */
    const deploy = path.join(CLIENTE, '.github', 'workflows', 'deploy.yml');
    informe.comprueba('FAST-17', 'el workflow de despliegue sigue existiendo y aparte',
      existsSync(deploy) && !wf.includes('deploy.yml\n'));

    /* El encargo pedia «fast y pruebas funcionales esenciales» en cada pull request, y la
       primera version del workflow se quedo solo con fast, que no abre un navegador. */
    const jobPr = wf.slice(wf.indexOf('rapida:'), wf.indexOf('completa:'));
    informe.comprueba('FAST-20', 'cada pull request corre tambien el humo funcional',
      /npm --prefix qa run smoke/.test(jobPr),
      jobPr.includes('run smoke') ? 'smoke en el job de pull request' : 'el job de pull request no llama a smoke');

    /* Sin historial no se puede extraer el commit de control, y sin control no hay comparacion
       valida de Lighthouse en un runner que no es esta maquina. */
    const jobSemanal = wf.slice(wf.indexOf('completa:'));
    informe.comprueba('FAST-21', 'el job semanal se hace con el historial necesario para el control',
      /fetch-depth:\s*0/.test(jobSemanal) && /cat-file -e/.test(jobSemanal),
      'fetch-depth 0 y comprobacion del commit de control');

    /* Y Chrome no se da por supuesto: si el runner deja de traerlo, el job para en vez de dejar
       media bateria sin ejecutar y el check en verde. */
    const paradasChrome = (wf.match(/No hay Chrome/g) || []).length;
    informe.comprueba('FAST-22', 'los dos jobs fallan si el runner no trae Chrome',
      paradasChrome >= 2, paradasChrome + ' comprobaciones de Chrome');

  }

  return informe;
}

/* Ejecutado como programa. Importado por `full` y `weekly`, sólo exporta. */
if (process.argv[1] && process.argv[1].endsWith('fast.mjs')) {
  const informe = new Informe('QA rapida (fast)', 'fast');
  const v = versiones();
  console.log(`commit ${commitActual()} · node ${v.node} · php ${v.php}`);
  try {
    await fast(informe);
  } finally {
    limpiarTemporales();
  }
  informe.aplicaPolitica();
  informe.salir();
}
