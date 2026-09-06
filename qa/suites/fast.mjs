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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { Informe } from '../lib/informe.mjs';
import { correr } from '../lib/proc.mjs';
import {
  CLIENTE, MOTOR, SALIDA, QA, NODE, PHP, limpiarTemporales, versiones, commitActual,
} from '../lib/entorno.mjs';
import { clonarTinge, compilar, verificarBuild, lock, hashesDe, comparaHashes } from '../lib/clientes.mjs';
import * as inventario from './inventario.mjs';

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

  /* ---- El manifiesto aprobado de la salida ----
   * La lista de arriba es un minimo escrito a mano; esto es la salida entera, fichero a fichero,
   * contra `qa/manifiesto-build.json`. Perder un fichero publicado es una regresion silenciosa: no
   * rompe ninguna pagina hasta que alguien la abre. Un fichero de mas tambien se dice, porque un
   * derivado que el build ya no produce y nadie borra se queda en el hosting para siempre. */
  const manifiesto = JSON.parse(readFileSync(path.join(QA, 'manifiesto-build.json'), 'utf8'));
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
    informe.blocked('FAST-19', 'la carpeta publicada contra el manifiesto', 'no existe 2-subir en esta copia');
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

  /* Y el repositorio sigue exactamente igual que al empezar. */
  const despuesRepo = hashesDe(SALIDA);
  const repo = comparaHashes(antesRepo, despuesRepo);
  informe.comprueba('FAST-13', 'el 2-subir del repositorio no se ha tocado', repo.iguales,
    `cambiados: ${repo.cambiados.join(', ')}`);

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
