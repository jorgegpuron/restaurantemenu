/* `npm --prefix qa run weekly` — la pasada completa y su informe.
 *
 * Es lo que corre el lunes en CI y lo que se puede lanzar a mano antes de una entrega: `full` +
 * `pagespeed` + un Markdown con todo lo que hizo falta para diagnosticar sin volver a ejecutar
 * nada. El informe se escribe en `qa/informes/`, que está fuera de git: los informes locales no
 * ensucian el repositorio y en CI se suben como artefacto.
 */
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { Informe } from '../lib/informe.mjs';
import {
  QA, CLIENTE, versiones, commitActual, limpiarTemporales, temporalesVivos,
} from '../lib/entorno.mjs';
import { correr } from '../lib/proc.mjs';
import { cerrarTodos } from '../lib/servidor.mjs';
import { full } from './full.mjs';
import { comparativa, gateBaseline, leerBaseline, COMMIT_CONTROL, TOLERANCIAS } from './pagespeed.mjs';
import { resumenInventario } from './inventario.mjs';

export const DIR_INFORMES = path.join(QA, 'informes');

function fechaCorta(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function tabla(cabeceras, filas) {
  const l1 = `| ${cabeceras.join(' | ')} |`;
  const l2 = `|${cabeceras.map(() => '---').join('|')}|`;
  return [l1, l2, ...filas.map((f) => `| ${f.join(' | ')} |`)].join('\n');
}

/* Agrupa por seccion RESPETANDO EL ORDEN y sin fundir dos pasadas distintas de la misma seccion.
   La primera version usaba un Map por nombre, asi que «lote 8» con mbstring y «lote 8» sin
   mbstring acababan en la misma tabla: dos entornos distintos contados como uno, y una tabla con
   el doble de filas de las que su titulo prometia. */
function porSeccion(items) {
  const bloques = [];
  for (const i of items) {
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.nombre === i.seccion) { ultimo.items.push(i); continue; }
    bloques.push({ nombre: i.seccion, items: [i] });
  }
  const cuantas = new Map();
  for (const b of bloques) cuantas.set(b.nombre, (cuantas.get(b.nombre) || 0) + 1);
  const vistas = new Map();
  for (const b of bloques) {
    const n = (vistas.get(b.nombre) || 0) + 1;
    vistas.set(b.nombre, n);
    b.titulo = cuantas.get(b.nombre) > 1 ? b.nombre + ' (pasada ' + n + ')' : b.nombre;
  }
  return bloques;
}

export function escribirInforme(informe, { medidas, control, base, baselineComparable, regresiones, comparativa: comp, commitControl, duracionMs }) {
  mkdirSync(DIR_INFORMES, { recursive: true });
  const v = versiones();
  const commit = commitActual();
  const c = informe.cuenta();
  const fecha = fechaCorta();
  const ruta = path.join(DIR_INFORMES, `auditoria-semanal-${fecha}.md`);

  const bloques = porSeccion(informe.items).map((b) => {
    const filas = b.items.map((i) => [i.estado, i.id, i.texto.replace(/\|/g, '/'),
      (i.detalle || '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 120)]);
    return `### ${b.titulo}

${tabla(['Estado', 'Id', 'Prueba', 'Detalle'], filas)}`;
  });

  const filasLh = [];
  for (const perfil of Object.keys(medidas || {})) {
    const m = medidas[perfil];
    const b = control?.[perfil];
    const dif = (k, dec = 0) => (b ? `${Number(b[k]).toFixed(dec)} → ${Number(m[k]).toFixed(dec)}` : Number(m[k]).toFixed(dec));
    filasLh.push([perfil, dif('performance'), dif('accesibilidad'), dif('buenasPracticas'), dif('seo'),
      dif('fcp'), dif('lcp'), dif('cls', 3), dif('tbt'), dif('speedIndex'), dif('peticiones'), dif('kb')]);
  }

  /* Diferencias de recursos entre control y candidato, fichero a fichero: es lo que convierte
     «hay una peticion mas» en «es esta, y la pide esto». */
  const filasRecursos = [];
  for (const perfil of Object.keys(comp?.diferenciaRecursos || {})) {
    const d = comp.diferenciaRecursos[perfil];
    filasRecursos.push([perfil,
      d.soloEnA.join('<br>') || '—', d.soloEnB.join('<br>') || '—',
      `${d.bytesA} → ${d.bytesB}`]);
  }

  const inv = resumenInventario();

  const cambios = correr('git', ['status', '--short', '--untracked-files=all'], { cwd: CLIENTE });

  const md = `# Auditoría semanal — ${fecha}

| | |
|---|---|
| Commit | \`${commit}\` |
| Fecha | ${new Date().toISOString()} |
| Duración | ${(duracionMs / 1000 / 60).toFixed(1)} min |
| Node | ${v.node} |
| PHP | ${v.php} |
| Navegador | ${v.navegador} |
| Playwright | ${v.playwright} |
| Lighthouse | ${v.lighthouse} |
| Plataforma | ${v.plataforma} |

## Resumen

${tabla(['PASS', 'FAIL', 'BLOCKED', 'NO APLICA', 'KNOWN OPEN', 'UNEXPECTED PASS', 'Total'],
    [[c.PASS, c.FAIL, c.BLOCKED, c['NO APLICA'], c['KNOWN OPEN'], c['UNEXPECTED PASS'], informe.items.length]])}

**Veredicto:** ${informe.verdeReal() ? 'sin regresiones' : 'la suite falla'}.

> Estas cifras salen del mismo objeto que imprime la consola y ninguna esta escrita a mano. La
> politica de bloqueos y el cierre se anotan **antes** de escribir este fichero, asi que el total
> de aqui y el de la consola son el mismo numero.

## Inventario

${inv.linea()}

${tabla(['Bloque', 'Elementos'], inv.bloques.map((b) => [b.nombre, b.elementos]))}

- **BLOCKED del inventario:** ${inv.listaBlocked.join(', ') || '(ninguno)'}
- **NO APLICA en este cliente:** ${inv.listaNoAplica.join(', ') || '(ninguno)'}
- **Defectos conocidos:** ${inv.defectosConocidos}

${c['UNEXPECTED PASS'] ? `> **UNEXPECTED PASS:** ${informe.items.filter((i) => i.estado === 'UNEXPECTED PASS').map((i) => i.id).join(', ')}. Un defecto que se daba por abierto ya no se reproduce: hay que revisarlo y retirarlo de la lista a sabiendas, no dejarlo ahí.\n` : ''}
## Cobertura y resultados por bloque

${bloques.join('\n\n')}

## Lighthouse local — control contra candidato

> Lighthouse contra un servidor local con red simulada. **No es PageSpeed de produccion.** Cinco
> pasadas por perfil y mediana, sobre la fixtura determinista de \`qa/lib/fixtura-lh.mjs\`.
>
> Cada celda son **el control medido en esta misma maquina** y el candidato, no una linea base
> guardada de otro sitio: comparar tiempos de un runner de Linux contra una medicion hecha en
> Windows con otro Chrome no es una comparacion.

| Arbol | Commit | Producto | Estado |
|---|---|---|---|
| Control | \`${comp?.identidadControl?.commit || commitControl}\` | \`${comp?.identidadControl?.hashProducto || '?'}\` | ${comp?.identidadControl?.sucio ? '**dirty**' : 'limpio'} |
| Candidato | \`${comp?.identidadCandidato?.commit || commit}\` | \`${comp?.identidadCandidato?.hashProducto || '?'}\` | ${comp?.identidadCandidato?.sucio ? '**dirty**' : 'limpio'} |

Identidad completa: **${comp?.identidadControl?.etiqueta || commitControl}** contra
**${comp?.identidadCandidato?.etiqueta || commit}**. Ambos medidos en ${v.plataforma} con ${v.navegador}.

El hash de producto cubre ${comp?.identidadCandidato?.ficherosProducto || '?'} ficheros y excluye, por
declaracion: ${(comp?.identidadCandidato?.exclusiones || []).join(', ') || '(sin exclusiones)'}. Tocar la
bateria o este informe no lo cambia.

${filasLh.length ? tabla(
    ['Perfil', 'Perf', 'A11y', 'BP', 'SEO', 'FCP', 'LCP', 'CLS', 'TBT', 'SI', 'Peticiones', 'KB'], filasLh)
    : '_No se pudo medir en esta pasada._'}

${filasRecursos.length ? '### Recursos pedidos: diferencias entre control y candidato' + String.fromCharCode(10, 10) + tabla(['Perfil', 'Solo en el control', 'Solo en el candidato', 'Bytes'], filasRecursos) : ''}

${base ? (baselineComparable
    ? 'Linea base guardada: commit \`' + base.commit + '\`, ' + base.fecha + '. Es de este mismo entorno, asi que ademas se ha usado como segundo gate.'
    : 'Linea base guardada: commit \`' + base.commit + '\`, ' + base.fecha + '. **Medida en otro entorno** (' + JSON.stringify(base.huella || {}) + '), asi que aqui es informativa y NO se ha usado como gate.')
    : '_Sin linea base registrada._'}
${regresiones && regresiones.length
    ? String.fromCharCode(10) + '**Regresiones:**' + String.fromCharCode(10, 10) + regresiones.map((r) => '- ' + r.perfil + ': ' + r.problemas.join('; ')).join(String.fromCharCode(10))
    : String.fromCharCode(10) + 'Sin regresiones dentro de las tolerancias.'}

Tolerancias aplicadas: ${Object.entries(TOLERANCIAS).map(([k, x]) => k + ' ' + x).join(' · ')}.

## Consola, red y PHP

${(() => {
    const consola = informe.items.filter((i) => /consola/i.test(i.texto));
    const red = informe.items.filter((i) => /peticion|red/i.test(i.texto));
    const php = informe.items.filter((i) => /PHP/i.test(i.texto) && /aviso|error/i.test(i.texto));
    const linea = (items, etiqueta) => `- **${etiqueta}:** ${items.length ? items.map((i) => `${i.id} ${i.estado}`).join(', ') : 'sin comprobaciones en esta pasada'}`;
    return [linea(consola, 'errores de consola'), linea(red, 'peticiones fallidas'), linea(php, 'avisos de PHP')].join('\n');
  })()}

## Defectos abiertos por decisión expresa

${informe.items.filter((i) => i.estado === 'KNOWN OPEN' || i.estado === 'UNEXPECTED PASS')
    .map((i) => `- **${i.id}** (${i.estado}): ${i.texto}${i.detalle ? ` — ${i.detalle}` : ''}`).join('\n') || '_Ninguno registrado en esta pasada._'}

## Ficheros modificados durante la ejecución

\`\`\`
${cambios.salida.trim() || '(ninguno: el árbol quedó como estaba)'}
\`\`\`

Las carpetas temporales que la suite crea se borran al terminar; los servidores PHP se cierran
todos y el navegador también. Si algo de eso hubiera quedado vivo, saldría como FAIL arriba.
`;

  writeFileSync(ruta, md, 'utf8');
  return ruta;
}

export async function weekly({ commitControl = COMMIT_CONTROL } = {}) {
  const t0 = Date.now();
  const informe = new Informe('QA semanal (weekly)', 'weekly');
  let comp = null; let medidas = null; let control = null; let base = null;
  let regresiones = []; let baselineComparable = false;
  try {
    await full(informe);

    /* La comparación que vale en cualquier máquina: control y candidato medidos aquí mismo, con
       la misma fixtura y el mismo navegador. La línea base guardada sólo entra si es de este
       mismo entorno; si no, se dice y no se compara. */
    comp = await comparativa(informe, commitControl);
    medidas = comp?.candidato?.medidas || null;
    control = comp?.control?.medidas || null;
    regresiones = comp?.regresiones || [];

    base = leerBaseline();
    if (medidas) {
      const g = gateBaseline(informe, { medidas, huellaCandidato: comp.candidato.huella, base });
      baselineComparable = g.modo === 'comparado';
      regresiones = regresiones.concat(g.regresiones);
    }
  } finally {
    cerrarTodos();
    limpiarTemporales();
  }
  const vivos = temporalesVivos();
  informe.seccion('cierre');
  informe.comprueba('WK-01', 'no queda ninguna carpeta temporal', vivos.length === 0, vivos.join(', '));

  /* WK-02 comprueba que la carpeta de informes se puede escribir ANTES de escribir el informe, y
     no después. Así la última acción de la pasada es el propio informe, y los totales que enseña
     son exactamente los que enseña la consola: la fase 17 dejó un 199 frente a 200 justo por
     contar una comprobación emitida después de escribir el fichero. */
  let escribible = false;
  try {
    mkdirSync(DIR_INFORMES, { recursive: true });
    const sonda = path.join(DIR_INFORMES, '.sonda-escritura');
    writeFileSync(sonda, 'qa', 'utf8');
    rmSync(sonda, { force: true });
    escribible = true;
  } catch (e) {
    informe.fail('WK-02', 'la carpeta de informes se puede escribir', e.message);
  }
  if (escribible) informe.pass('WK-02', 'la carpeta de informes se puede escribir', path.relative(CLIENTE, DIR_INFORMES));

  /* La política se aplica aquí dentro, antes de escribir: si se aplicara fuera, POL-01 y POL-02
     saldrían en la consola y no en el informe, y los totales volverían a no cuadrar. */
  informe.aplicaPolitica();

  const ruta = escribirInforme(informe, {
    medidas, control, base, baselineComparable, regresiones,
    comparativa: comp, commitControl, duracionMs: Date.now() - t0,
  });
  return { informe, ruta };
}

if (process.argv[1] && process.argv[1].endsWith('weekly.mjs')) {
  const { informe, ruta } = await weekly();
  console.log(`\nInforme: ${ruta}`);
  informe.aplicaPolitica();
  informe.salir();
}
