/* La prueba de la prueba: sembrar fallos y comprobar que la batería los ve.
 *
 * Una suite que nunca ha fallado no demuestra nada: puede estar mirando donde no hay nada que
 * mirar. Aquí se siembran cinco fallos de los que de verdad han pasado en este proyecto, se
 * comprueba que cada uno pone la suite en rojo, se retiran y se comprueba que vuelve a verde.
 *
 * SIEMPRE sobre copias temporales. Sembrar un fallo en el repositorio original, aunque fuera un
 * segundo, es exactamente la clase de cosa que se queda puesta.
 */
import { cpSync, existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Informe } from '../lib/informe.mjs';
import {
  CLIENTE, QA, NODE, carpetaTemporal, limpiarTemporales, chromePath, versiones, commitActual,
} from '../lib/entorno.mjs';
import { correr } from '../lib/proc.mjs';
import { abrir, cerrarTodos, capacidadesPhp } from '../lib/servidor.mjs';
import { abrirNavegador, nuevaPagina } from '../lib/navegador.mjs';
import { clonarTinge, compilar, verificarBuild, docrootDesde } from '../lib/clientes.mjs';
import { comparar, compararConBaseline, comparativa, gateBaseline, TOLERANCIAS } from './pagespeed.mjs';
import { problemasDeTotales } from './inventario.mjs';

const ICONO = 'assets/titleIcon-accent.svg';

/* Corre el comprobador de inventario apuntado a otra raíz, en un proceso aparte: es la única
   forma de que `entorno.mjs` resuelva las rutas de la copia y no las del repositorio. */
function inventarioSobre(raiz) {
  const codigo = `import { huecosDeCobertura } from ${JSON.stringify(pathToFileURL(path.join(QA, 'suites', 'inventario.mjs')).href)};
const r = huecosDeCobertura();
console.log(JSON.stringify({ huecos: r.huecos, sobrantes: r.sobrantes }));`;
  const fichero = path.join(raiz, 'qa-autoprueba-inventario.mjs');
  writeFileSync(fichero, codigo, 'utf8');
  const r = correr(NODE, [fichero], { env: { ...process.env, QA_RAIZ_CLIENTE: raiz } });
  try { unlinkSync(fichero); } catch { /* la copia se borra igual al final */ }
  try { return JSON.parse(r.salida.trim().split('\n').pop()); } catch { return { huecos: ['(no se pudo leer)'], sobrantes: [], error: r.texto.slice(-300) }; }
}

export async function autoprueba(informe = new Informe('Autoprueba de la bateria')) {
  const caps = capacidadesPhp();
  if (!caps.hayPhp || !chromePath()) {
    informe.blocked('SEM-00', 'autoprueba', 'hacen falta PHP y Chrome');
    return informe;
  }

  informe.seccion('preparacion de la copia con fallos');
  const clon = clonarTinge();
  const c = compilar(clon.proyecto, { conActivacion: false });
  informe.comprueba('SEM-00', 'copia limpia compilada para sembrar sobre ella', c.gen.ok,
    c.gen.texto.trim().split('\n').pop());
  if (!c.gen.ok) return informe;

  const navegador = await abrirNavegador();
  try {
    /* ---------- 1. favicon ausente ---------- */
    informe.seccion('fallo sembrado 1: falta el icono de pestana');
    const iconoRuta = path.join(clon.salida, ICONO);
    const iconoOriginal = readFileSync(iconoRuta);
    const antes = verificarBuild(clon.proyecto);
    informe.comprueba('SEM-1a', 'con el icono puesto, verificar-build pasa', antes.ok,
      antes.texto.trim().split('\n').pop());
    unlinkSync(iconoRuta);
    const conFallo = verificarBuild(clon.proyecto);
    informe.comprueba('SEM-1b', 'sin el icono, verificar-build FALLA', !conFallo.ok,
      conFallo.texto.trim().split('\n').find((l) => /falta/.test(l)) || conFallo.texto.slice(-160));

    /* Y la carta servida sin el icono deja una peticion fallida, que es el sintoma que se vio. */
    const docFallo = docrootDesde(clon.salida, 'tinge_sin_icono');
    const srvFallo = await abrir(docFallo, { gd: true, mbstring: true });
    const pagFallo = await nuevaPagina(navegador);
    await pagFallo.goto(srvFallo.url + '/', { waitUntil: 'domcontentloaded' });
    await pagFallo.waitForLoadState('networkidle').catch(() => {});
    await pagFallo.waitForTimeout(1000);
    informe.comprueba('SEM-1c', 'sin el icono, la carta deja una peticion 404 que la bateria ve',
      pagFallo.registro.fallidas.some((f) => /titleIcon/.test(f)),
      pagFallo.registro.fallidas.join(' | ') || '(ninguna)');
    await pagFallo.contextoQa.close().catch(() => {});
    srvFallo.parar();
    rmSync(docFallo, { recursive: true, force: true });

    writeFileSync(iconoRuta, iconoOriginal);
    const restaurado = verificarBuild(clon.proyecto);
    informe.comprueba('SEM-1d', 'devuelto el icono, verificar-build vuelve a pasar', restaurado.ok,
      restaurado.texto.trim().split('\n').pop());

    /* ---------- 2. accion administrativa nueva sin prueba ---------- */
    informe.seccion('fallo sembrado 2: accion nueva sin prueba en el inventario');
    const panel = path.join(clon.proyecto, 'motor', 'server', 'admin', 'index.php');
    const panelOriginal = readFileSync(panel, 'utf8');
    cpSync(path.join(QA, 'inventario.json'), path.join(clon.proyecto, 'qa-inventario.json'));
    /* La copia necesita su propio qa/ para que el comprobador encuentre el inventario. */
    mkdirSync(path.join(clon.proyecto, 'qa'), { recursive: true });
    cpSync(path.join(QA, 'inventario.json'), path.join(clon.proyecto, 'qa', 'inventario.json'));
    const limpio = inventarioSobre(clon.proyecto);
    informe.comprueba('SEM-2a', 'sobre la copia limpia el inventario no tiene huecos',
      limpio.huecos.length === 0, JSON.stringify(limpio).slice(0, 200));
    writeFileSync(panel, panelOriginal.replace(
      '<?php',
      "<?php\n/* fallo sembrado por la autoprueba */\nif (isset($_POST['accion_sembrada_qa'])) { /* sin prueba a proposito */ }"), 'utf8');
    const conAccion = inventarioSobre(clon.proyecto);
    informe.comprueba('SEM-2b', 'una accion POST nueva sin prueba pone el inventario en rojo',
      conAccion.huecos.some((h) => /accion_sembrada_qa/.test(h)), conAccion.huecos.join(' | '));
    writeFileSync(panel, panelOriginal, 'utf8');
    const trasQuitar = inventarioSobre(clon.proyecto);
    informe.comprueba('SEM-2c', 'quitada la accion, el inventario vuelve a verde',
      trasQuitar.huecos.length === 0, JSON.stringify(trasQuitar).slice(0, 160));
    rmSync(path.join(clon.proyecto, 'qa'), { recursive: true, force: true });
    rmSync(path.join(clon.proyecto, 'qa-inventario.json'), { force: true });

    /* ---------- 3. desborde horizontal a 320 px ---------- */
    informe.seccion('fallo sembrado 3: desborde horizontal');
    const doc = docrootDesde(clon.salida, 'tinge_desborde');
    const panelServido = path.join(doc, 'admin', 'index.php');
    const servidoOriginal = readFileSync(panelServido, 'utf8');
    const srv = await abrir(doc, { gd: true, mbstring: true });
    const pag = await nuevaPagina(navegador);
    const { entrarAlPanel } = await import('./admin.mjs');
    await entrarAlPanel(pag, srv.url);
    const mideDesborde = async () => {
      await pag.setViewportSize({ width: 320, height: 900 });
      await pag.goto(srv.url + '/admin/?t=agotados', { waitUntil: 'domcontentloaded' });
      await pag.waitForTimeout(400);
      return pag.evaluate(() => ({
        s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth,
      }));
    };
    const sano = await mideDesborde();
    informe.comprueba('SEM-3a', 'a 320 px el panel no desborda antes de sembrar',
      sano.s <= sano.c + 1, JSON.stringify(sano));
    writeFileSync(panelServido, servidoOriginal.replace('</head>',
      '<style>/* fallo sembrado por la autoprueba */ body{min-width:2000px}</style></head>'), 'utf8');
    const roto = await mideDesborde();
    informe.comprueba('SEM-3b', 'un desborde sembrado se detecta a 320 px',
      roto.s > roto.c + 1, JSON.stringify(roto));
    writeFileSync(panelServido, servidoOriginal, 'utf8');
    const curado = await mideDesborde();
    informe.comprueba('SEM-3c', 'quitado el desborde, vuelve a verde',
      curado.s <= curado.c + 1, JSON.stringify(curado));

    /* ---------- 4. peticion 404 en la carta ---------- */
    informe.seccion('fallo sembrado 4: peticion 404 en la carta');
    const indexServido = path.join(doc, 'index.html');
    const indexOriginal = readFileSync(indexServido, 'utf8');
    await pag.setViewportSize({ width: 1280, height: 900 });
    pag.limpiarRegistro();
    await pag.goto(srv.url + '/', { waitUntil: 'domcontentloaded' });
    await pag.waitForLoadState('networkidle').catch(() => {});
    await pag.waitForTimeout(900);
    informe.comprueba('SEM-4a', 'la carta no tiene peticiones fallidas antes de sembrar',
      pag.registro.fallidas.length === 0, pag.registro.fallidas.join(' | '));
    /* La imagen sembrada va bajo `assets/`, que es donde viven las fotos de verdad. No es un
       detalle: el servidor embebido de PHP, cuando no encuentra un fichero, sube por el árbol
       buscando un `index.html`, así que un fichero inexistente colgando de la raíz del docroot se
       sirve con 200 y ninguna batería podría verlo. Dentro de un directorio que existe —y
       `assets/` existe— el 404 es un 404. Un Apache de verdad devuelve 404 en los dos casos. */
    writeFileSync(indexServido, indexOriginal.replace('</body>',
      '<img src="assets/no-existe-esta-imagen-qa.png" alt="" width="1" height="1"></body>'), 'utf8');
    pag.limpiarRegistro();
    await pag.goto(srv.url + '/', { waitUntil: 'domcontentloaded' });
    await pag.waitForLoadState('networkidle').catch(() => {});
    await pag.waitForTimeout(900);
    informe.comprueba('SEM-4b', 'una peticion 404 sembrada se detecta',
      pag.registro.fallidas.some((f) => /no-existe-esta-imagen-qa/.test(f)),
      pag.registro.fallidas.join(' | ') || '(ninguna)');
    writeFileSync(indexServido, indexOriginal, 'utf8');
    pag.limpiarRegistro();
    await pag.goto(srv.url + '/', { waitUntil: 'domcontentloaded' });
    await pag.waitForLoadState('networkidle').catch(() => {});
    await pag.waitForTimeout(900);
    informe.comprueba('SEM-4c', 'quitada la imagen, la carta vuelve a estar limpia',
      pag.registro.fallidas.length === 0, pag.registro.fallidas.join(' | '));
    await pag.contextoQa.close().catch(() => {});
    srv.parar();

    /* ---------- 5. regresion de Lighthouse contra la linea base ---------- */
    informe.seccion('fallo sembrado 5: regresion de Lighthouse');
    const baseFalsa = {
      commit: 'ficticio', fecha: new Date().toISOString(),
      medidas: {
        'carta-movil': {
          performance: 90, accesibilidad: 97, buenasPracticas: 100, seo: 92,
          fcp: 1000, lcp: 2000, cls: 0.010, tbt: 10, speedIndex: 1000, peticiones: 13, kb: 900,
        },
      },
    };
    const igual = { 'carta-movil': { ...baseFalsa.medidas['carta-movil'] } };
    const sinRegresion = new Informe('interna');
    comparar(sinRegresion, igual, baseFalsa);
    informe.comprueba('SEM-5a', 'medidas identicas a la base no producen regresion',
      sinRegresion.cuenta().FAIL === 0, sinRegresion.resumen());

    const peor = {
      'carta-movil': {
        ...baseFalsa.medidas['carta-movil'],
        performance: 80,          // 10 puntos por debajo
        lcp: 2600,                // +30 %
        cls: 0.040,               // +0,030
        tbt: 90,                  // +80 ms
        peticiones: 15, kb: 950,  // mas peticiones y mas bytes
      },
    };
    const conRegresion = new Informe('interna');
    const regs = comparar(conRegresion, peor, baseFalsa);
    informe.comprueba('SEM-5b', 'una regresion de Lighthouse hace fallar la comparacion',
      conRegresion.cuenta().FAIL > 0 && regs.length > 0,
      regs.map((r) => r.problemas.join('; ')).join(' | '));

    /* Y el ruido normal NO puede disparar un falso positivo: un punto de Performance y un 3 % de
       LCP estan dentro de lo que se mueve entre dos series identicas. */
    const ruido = {
      'carta-movil': {
        ...baseFalsa.medidas['carta-movil'],
        performance: 89, lcp: 2060, cls: 0.012, tbt: 25,
      },
    };
    const conRuido = new Informe('interna');
    comparar(conRuido, ruido, baseFalsa);
    informe.comprueba('SEM-5c', 'el ruido normal de medicion no dispara un falso positivo',
      conRuido.cuenta().FAIL === 0,
      `tolerancias: ${JSON.stringify(TOLERANCIAS)}`);
  } finally {
    await navegador.close().catch(() => {});
    cerrarTodos();
  }

  /* ---------- 6. el total del inventario, alterado a proposito ---------- */
  informe.seccion('fallo sembrado 6: el inventario deja de cuadrar');
  const invOriginal = JSON.parse(readFileSync(path.join(QA, 'inventario.json'), 'utf8'));
  informe.comprueba('SEM-6a', 'el inventario de verdad cuadra por bloques y por estados',
    problemasDeTotales(invOriginal).cuadra, problemasDeTotales(invOriginal).resumen.linea());

  const invBloqueNuevo = JSON.parse(JSON.stringify(invOriginal));
  invBloqueNuevo.bloque_que_nadie_conto = [{ id: 'XX-SEMBRADO', estado: 'cubierto' }];
  const rBloque = problemasDeTotales(invBloqueNuevo);
  informe.comprueba('SEM-6b', 'un bloque nuevo sin clasificar rompe el total',
    !rBloque.cuadra && /bloque_que_nadie_conto/.test(rBloque.detalle), rBloque.detalle);

  const invEstadoRaro = JSON.parse(JSON.stringify(invOriginal));
  invEstadoRaro.endpoints[0] = { ...invEstadoRaro.endpoints[0], estado: 'estado_inventado_qa' };
  const rEstado = problemasDeTotales(invEstadoRaro);
  informe.comprueba('SEM-6c', 'un estado inventado se detecta y no desaparece del total',
    rEstado.estadosRaros.some((x) => /estado_inventado_qa/.test(x)), rEstado.estadosRaros.join(' | '));

  informe.comprueba('SEM-6d', 'quitada la alteracion, el inventario vuelve a cuadrar',
    problemasDeTotales(JSON.parse(readFileSync(path.join(QA, 'inventario.json'), 'utf8'))).cuadra);

  /* ---------- 7. la politica de bloqueos ---------- */
  informe.seccion('fallo sembrado 7: la politica de bloqueos');
  const aprobado = new Informe('interna', 'full');
  aprobado.blocked('MC-32', 'bloqueo aprobado de prueba', 'efecto remoto');
  aprobado.blocked('MC-33', 'bloqueo aprobado de prueba', 'no hay motor con otro esquema');
  informe.comprueba('SEM-7a', 'un BLOCKED de la allowlist no rompe la suite',
    aprobado.verdeReal() === true, JSON.stringify(aprobado.cuenta()));

  const inesperado = new Informe('interna', 'full');
  inesperado.blocked('MC-32', 'bloqueo aprobado de prueba', 'efecto remoto');
  inesperado.blocked('MC-33', 'bloqueo aprobado de prueba', 'no hay motor con otro esquema');
  inesperado.blocked('LH-00', 'medicion Lighthouse', 'no se encuentra Chrome');
  const pol = inesperado.politicaBlocked();
  informe.comprueba('SEM-7b', 'un BLOCKED que nadie aprobo SI rompe la suite',
    inesperado.verdeReal() === false && pol.inesperados.some((i) => i.id === 'LH-00'),
    pol.inesperados.map((i) => i.id).join(', '));

  const perdido = new Informe('interna', 'full');
  perdido.blocked('MC-32', 'bloqueo aprobado de prueba', 'efecto remoto');
  informe.comprueba('SEM-7c', 'un aprobado que deja de aparecer pide revision',
    perdido.politicaBlocked().ausentes.some((a) => a.id === 'MC-33'),
    perdido.politicaBlocked().ausentes.map((a) => a.id).join(', '));

  const conUnexpected = new Informe('interna', 'full');
  conUnexpected.unexpected('E9', 'un defecto conocido que ya no se reproduce');
  const antesCi = process.env.QA_CI;
  process.env.QA_CI = '0';
  const verdeLocal = conUnexpected.verdeReal();
  process.env.QA_CI = '1';
  const verdeCi = conUnexpected.verdeReal();
  if (antesCi === undefined) delete process.env.QA_CI; else process.env.QA_CI = antesCi;
  informe.comprueba('SEM-7d', 'un UNEXPECTED PASS avisa en local y rompe la suite en CI',
    verdeLocal === true && verdeCi === false, `local=${verdeLocal} ci=${verdeCi}`);

  /* ---------- 8. herramientas ausentes ---------- */
  informe.seccion('fallo sembrado 8: sin Chrome, sin PHP y con una linea base de otro entorno');
  const sinChrome = correr(NODE, [path.join(QA, 'suites', 'smoke.mjs')],
    { env: { ...process.env, QA_FINGIR_SIN_CHROME: '1' }, cwd: QA });
  informe.comprueba('SEM-8a', 'sin Chrome la suite NO sale en verde',
    sinChrome.codigo !== 0 && /no se encuentra Chrome/.test(sinChrome.texto),
    `codigo=${sinChrome.codigo}`);

  const sinPhp = correr(NODE, [path.join(QA, 'suites', 'smoke.mjs')],
    { env: { ...process.env, QA_FINGIR_SIN_PHP: '1' }, cwd: QA });
  informe.comprueba('SEM-8b', 'sin PHP la suite NO sale en verde',
    sinPhp.codigo !== 0 && /no hay PHP/.test(sinPhp.texto), `codigo=${sinPhp.codigo}`);

  const baseOtroEntorno = {
    commit: 'aaaaaaa', fecha: '2020-01-01T00:00:00.000Z',
    huella: { plataforma: 'linux x64', navegador: 'Chrome 999.0.0.0', lighthouse: '13.4.1' },
    medidas: { 'carta-movil': { performance: 90, accesibilidad: 100, buenasPracticas: 100, seo: 100, fcp: 1, lcp: 1, cls: 0, tbt: 0, speedIndex: 1, peticiones: 1, kb: 1 } },
  };
  const iBase = new Informe('interna', 'pagespeed');
  compararConBaseline(iBase, {
    huella: { plataforma: 'win32 x64', navegador: 'Chrome 152.0.0.0', lighthouse: '13.4.1' },
    medidas: baseOtroEntorno.medidas,
  }, baseOtroEntorno);
  informe.comprueba('SEM-8c', 'una linea base de otro entorno NO produce verde',
    iBase.verdeReal() === false && iBase.items.some((i) => i.id === 'LH-HUELLA' && i.estado === 'FAIL'),
    iBase.items.map((i) => `${i.id}:${i.estado}`).join(' '));

  const iMismo = new Informe('interna', 'pagespeed');
  const huellaIgual = { plataforma: 'win32 x64', navegador: 'Chrome 152.0.0.0', lighthouse: '13.4.1' };
  compararConBaseline(iMismo, { huella: huellaIgual, medidas: baseOtroEntorno.medidas },
    { ...baseOtroEntorno, huella: huellaIgual });
  informe.comprueba('SEM-8d', 'con la misma huella la comparacion si se hace',
    iMismo.verdeReal() === true && iMismo.items.some((i) => i.id === 'LH-HUELLA' && i.estado === 'PASS'),
    iMismo.items.map((i) => `${i.id}:${i.estado}`).join(' '));


  /* ---------- 9. el gate de bytes, con enteros exactos ---------- */
  informe.seccion('fallo sembrado 9: un solo byte de mas');
  const perfilBase = {
    performance: 90, accesibilidad: 100, buenasPracticas: 100, seo: 100,
    fcp: 1000, lcp: 1200, cls: 0.01, tbt: 0, speedIndex: 1000,
    peticiones: 13, peticionesLocales: 10, peticionesExternas: 3,
    bytes: 1003878, bytesLocales: 874138, bytesExternos: 129740, kb: 980,
  };
  const mide = (cambios) => ({ 'carta-movil': { ...perfilBase, ...cambios } });
  const corre = (candidato) => {
    const i = new Informe('interna', 'pagespeed');
    const regresiones = comparar(i, candidato, { medidas: mide({}) }, { titulo: 'el control', prefijo: 'X' });
    return { verde: i.verdeReal(), regresiones, i };
  };

  const igual = corre(mide({}));
  informe.comprueba('SEM-9a', 'medidas identicas: sin regresion de bytes',
    igual.verde === true && igual.regresiones.length === 0, JSON.stringify(igual.regresiones));

  const unByte = corre(mide({ bytesLocales: 874139, bytes: 1003879, kb: 980 }));
  informe.comprueba('SEM-9b', 'UN byte local de mas hace fallar el gate',
    unByte.verde === false && /bytes locales: 874138 -> 874139/.test(JSON.stringify(unByte.regresiones)),
    JSON.stringify(unByte.regresiones).slice(0, 200));

  const menos = corre(mide({ bytesLocales: 874000, bytes: 1003740, kb: 980 }));
  informe.comprueba('SEM-9c', 'menos bytes no es una regresion',
    menos.verde === true && menos.regresiones.length === 0, JSON.stringify(menos.regresiones));

  const kbIgual = corre(mide({ bytesLocales: 874639, bytes: 1004379, kb: 980 }));
  informe.comprueba('SEM-9d', 'medio kilobyte de mas tambien falla, aunque los KB redondeados no cambien',
    kbIgual.verde === false, JSON.stringify(kbIgual.regresiones).slice(0, 160));

  const externos = corre(mide({ bytesExternos: 130383, bytes: 1004521 }));
  informe.comprueba('SEM-9e', 'los bytes de las fuentes externas no disparan el gate, pero su numero si se compara',
    externos.verde === true, JSON.stringify(externos.regresiones));

  const unaExterna = corre(mide({ peticionesExternas: 4, peticiones: 14 }));
  informe.comprueba('SEM-9f', 'una peticion externa de mas SI falla',
    unaExterna.verde === false, JSON.stringify(unaExterna.regresiones).slice(0, 160));

  /* ---------- 10. las cuatro situaciones de entorno ---------- */
  informe.seccion('fallo sembrado 10: Windows, Linux, control y linea base');
  const HUELLA_AQUI = { plataforma: 'win32 x64', navegador: 'Chrome 152.0.0.0', lighthouse: '13.4.1' };
  const HUELLA_OTRA = { plataforma: 'linux x64', navegador: 'Chrome 141.0.0.0', lighthouse: '13.4.1' };
  const baseOtra = { commit: 'aaaaaaa', fecha: '2020-01-01T00:00:00.000Z', huella: HUELLA_OTRA, medidas: mide({}) };
  const baseAqui = { ...baseOtra, huella: HUELLA_AQUI };

  /* (1) huella distinta + control disponible + comparativa verde -> salida 0 y baseline NO APLICA */
  const i1 = new Informe('interna', 'weekly');
  comparar(i1, mide({}), { medidas: mide({}) }, { titulo: 'el control', prefijo: 'LHC-CMP' });
  const g1 = gateBaseline(i1, { medidas: mide({}), huellaCandidato: HUELLA_AQUI, base: baseOtra });
  informe.comprueba('SEM-10a', 'huella distinta + control verde: salida 0 y linea base NO APLICA',
    g1.modo === 'no-aplica' && i1.verdeReal() === true
      && i1.items.some((x) => x.id === 'LH-HUELLA' && x.estado === 'NO APLICA'),
    `${g1.modo} · verde=${i1.verdeReal()}`);

  /* (2) huella distinta + control ausente -> salida distinta de cero */
  const i2 = new Informe('interna', 'weekly');
  await comparativa(i2, 'deadbee');
  gateBaseline(i2, { medidas: mide({}), huellaCandidato: HUELLA_AQUI, base: baseOtra });
  informe.comprueba('SEM-10b', 'sin el commit de control la pasada NO sale en verde',
    i2.verdeReal() === false && i2.items.some((x) => x.estado === 'FAIL' && /control/.test(x.texto)),
    i2.items.filter((x) => x.estado === 'FAIL').map((x) => x.id).join(', '));

  /* (3) huella igual + regresion contra la linea base -> salida distinta de cero */
  const i3 = new Informe('interna', 'weekly');
  const g3 = gateBaseline(i3, {
    medidas: mide({ performance: 80, bytesLocales: 900000 }), huellaCandidato: HUELLA_AQUI, base: baseAqui,
  });
  informe.comprueba('SEM-10c', 'huella igual + regresion contra la linea base: rojo',
    g3.modo === 'comparado' && i3.verdeReal() === false && g3.regresiones.length > 0,
    JSON.stringify(g3.regresiones).slice(0, 160));

  /* (4) mismo runner + regresion candidato contra control -> salida distinta de cero */
  const i4 = new Informe('interna', 'weekly');
  const r4 = comparar(i4, mide({ lcp: 1800, performance: 80 }), { medidas: mide({}) },
    { titulo: 'el control', prefijo: 'LHC-CMP' });
  informe.comprueba('SEM-10d', 'regresion del candidato contra el control en el mismo runner: rojo',
    i4.verdeReal() === false && r4.length > 0, JSON.stringify(r4).slice(0, 160));

  /* Y lo mismo con CI=true, que es donde de verdad importa. */
  const antesCi2 = process.env.QA_CI;
  process.env.QA_CI = '1';
  const i5 = new Informe('interna', 'weekly');
  comparar(i5, mide({}), { medidas: mide({}) }, { titulo: 'el control', prefijo: 'LHC-CMP' });
  const g5 = gateBaseline(i5, { medidas: mide({}), huellaCandidato: HUELLA_OTRA, base: baseAqui });
  const verdeEnCi = i5.verdeReal();
  const i6 = new Informe('interna', 'weekly');
  comparar(i6, mide({ bytesLocales: 874139 }), { medidas: mide({}) }, { titulo: 'el control', prefijo: 'LHC-CMP' });
  const rojoEnCi = i6.verdeReal();
  if (antesCi2 === undefined) delete process.env.QA_CI; else process.env.QA_CI = antesCi2;
  informe.comprueba('SEM-10e', 'en CI: una linea base de otro sistema no condena la pasada, un byte de mas si',
    verdeEnCi === true && rojoEnCi === false, `linux con base de windows=${verdeEnCi} · un byte=${rojoEnCi}`);


  informe.seccion('el repositorio original no se ha tocado');
  const dc = correr('git', ['diff', '--check'], { cwd: CLIENTE });
  const st = correr('git', ['status', '--short'], { cwd: CLIENTE });
  const sucios = st.salida.trim().split('\n').filter(Boolean)
    .filter((l) => !/qa\/|\.gitignore|quality\.yml|auditorias\//.test(l));
  informe.comprueba('SEM-90', 'ningun fichero del producto quedo tocado por los fallos sembrados',
    dc.ok && sucios.length === 0, sucios.join(' | '));
  return informe;
}

if (process.argv[1] && process.argv[1].endsWith('autoprueba.mjs')) {
  const informe = new Informe('Autoprueba de la bateria', 'autoprueba');
  console.log(`commit ${commitActual()} · ${versiones().navegador}`);
  try {
    await autoprueba(informe);
  } finally {
    cerrarTodos();
    limpiarTemporales();
  }
  informe.aplicaPolitica();
  informe.salir();
}
