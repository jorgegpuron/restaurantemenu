/* El acumulador de resultados y el único sitio que decide el código de salida.
 *
 * Seis estados, y cada uno significa una cosa distinta:
 *
 *   PASS            la comprobación se hizo y salió bien.
 *   FAIL            la comprobación se hizo y salió mal. Rompe la suite.
 *   BLOCKED         la comprobación NO se pudo hacer. No se disfraza de PASS: se dice que no se
 *                   probó. **Sólo los identificadores de la allowlist versionada
 *                   (`qa/blocked-aprobados.json`) son no bloqueantes; cualquier otro rompe la
 *                   suite.**
 *   NO APLICA       la funcionalidad no existe en ESTE cliente y por eso no hay nada que probar
 *                   aquí. No es infraestructura bloqueada: la funcionalidad general se cubre en
 *                   otro sitio, y ese sitio se nombra en el motivo.
 *   KNOWN OPEN      defecto conocido y aceptado por orden expresa (E3, E4, E5). La suite
 *                   comprueba que SIGUE ahí, pero no lo convierte en el comportamiento deseado.
 *   UNEXPECTED PASS un KNOWN OPEN que ya no se reproduce. En local avisa; **en CI rompe la
 *                   suite**, para obligar a revisarlo y retirarlo de la lista a sabiendas.
 *
 * Por qué la política de BLOCKED cambió en la fase 17.1: la propia fase 17 descubrió que una ruta
 * de extensiones equivocada dejaba GD y mbstring como no disponibles, y con la regla vieja —«todo
 * BLOCKED devuelve 0»— media batería se habría saltado sola y el workflow habría salido verde. Un
 * bloqueo que nadie aprobó es un fallo de la batería, no una excepción.
 */
import { writeSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QA_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const RUTA_BLOCKED_APROBADOS = path.join(QA_DIR, 'blocked-aprobados.json');

/* Se escribe con writeSync(1, ...) y no con console.log a proposito: cuando la salida va a un
   fichero o a un log de CI, Node la guarda en un buffer y no se ve nada hasta que el proceso
   termina. Una bateria que tarda veinte minutos y no dice ni una linea por el camino es
   indistinguible de una colgada, y eso ya paso una vez montando esto. */
const SALTO = String.fromCharCode(10);

function linea(texto) {
  if (process.env.QA_SILENCIO) return;
  try { writeSync(1, texto + SALTO); } catch { process.stdout.write(texto + SALTO); }
}

/* CI de verdad (GitHub Actions pone CI=true) o forzado a mano para probar la política. */
export function enCI() {
  return process.env.QA_CI === '1' || (!!process.env.CI && process.env.QA_CI !== '0');
}

export function leerBlockedAprobados() {
  if (!existsSync(RUTA_BLOCKED_APROBADOS)) return { aprobados: [] };
  return JSON.parse(readFileSync(RUTA_BLOCKED_APROBADOS, 'utf8'));
}

const ICONO = {
  PASS: 'PASS   ',
  FAIL: 'FAIL   ',
  BLOCKED: 'BLOCKED',
  'NO APLICA': 'N/A    ',
  'KNOWN OPEN': 'KNOWN  ',
  'UNEXPECTED PASS': 'UNEXP  ',
};

export const ESTADOS = Object.keys(ICONO);

export class Informe {
  /* `suite` es el nombre corto con el que la allowlist declara qué bloqueos se esperan en esta
     pasada: sin él no se puede saber si un aprobado que no aparece es que no tocaba o que se
     perdió por el camino. */
  constructor(titulo, suite = null) {
    this.titulo = titulo;
    this.suite = suite;
    this.inicio = Date.now();
    this.items = [];
    this.seccionActual = 'general';
  }

  seccion(nombre) {
    this.seccionActual = nombre;
    if (!process.env.QA_SILENCIO) linea(`\n--- ${nombre} ---`);
    return this;
  }

  anota(estado, id, texto, detalle) {
    const item = { estado, id, texto, detalle, seccion: this.seccionActual, ms: Date.now() - this.inicio };
    this.items.push(item);
    if (!process.env.QA_SILENCIO) {
      const d = detalle ? `  ${String(detalle).replace(/\s+/g, ' ').slice(0, 200)}` : '';
      linea(`  ${ICONO[estado] || estado}  ${id}  ${texto}${d}`);
    }
    return item;
  }

  pass(id, texto, detalle) { return this.anota('PASS', id, texto, detalle); }
  fail(id, texto, detalle) { return this.anota('FAIL', id, texto, detalle); }
  blocked(id, texto, detalle) { return this.anota('BLOCKED', id, texto, detalle); }
  noAplica(id, texto, detalle) { return this.anota('NO APLICA', id, texto, detalle); }
  known(id, texto, detalle) { return this.anota('KNOWN OPEN', id, texto, detalle); }
  unexpected(id, texto, detalle) { return this.anota('UNEXPECTED PASS', id, texto, detalle); }

  /* Azúcar para el patrón de siempre: una condición, un texto y el detalle que explica por qué
     ha salido lo que ha salido. El detalle se imprime SIEMPRE que hay fallo, nunca se pierde. */
  comprueba(id, texto, condicion, detalle) {
    return condicion ? this.pass(id, texto, detalle) : this.fail(id, texto, detalle);
  }

  /* Envuelve una prueba que puede lanzar: una excepción es un FAIL con su mensaje, nunca un
     proceso que se cae y deja la suite a medias. */
  async intenta(id, texto, fn) {
    try {
      const r = await fn();
      if (r === false) return this.fail(id, texto, 'la prueba devolvio false');
      if (r && r.estado) return this.anota(r.estado, id, texto, r.detalle);
      return this.pass(id, texto, typeof r === 'string' ? r : undefined);
    } catch (e) {
      return this.fail(id, texto, e && e.message ? e.message : String(e));
    }
  }

  cuenta() {
    const c = { PASS: 0, FAIL: 0, BLOCKED: 0, 'NO APLICA': 0, 'KNOWN OPEN': 0, 'UNEXPECTED PASS': 0 };
    for (const i of this.items) c[i.estado] = (c[i.estado] || 0) + 1;
    return c;
  }

  get duracionMs() { return Date.now() - this.inicio; }

  fusiona(otro) {
    for (const i of otro.items) this.items.push(i);
    return this;
  }

  /* ---- la política de BLOCKED, en un solo sitio ----
   * Devuelve qué bloqueos estaban aprobados, cuáles aparecieron sin estarlo y cuáles se esperaban
   * en esta suite y no aparecieron. Es una función pura: la usan la salida por consola, el informe
   * Markdown y las autopruebas, y las tres ven exactamente lo mismo. */
  politicaBlocked(lista = leerBlockedAprobados()) {
    const aprobados = lista.aprobados || [];
    const porId = new Map(aprobados.map((a) => [a.id, a]));
    const vistos = this.items.filter((i) => i.estado === 'BLOCKED');
    const idsVistos = new Set(vistos.map((i) => i.id));

    const inesperados = vistos.filter((i) => !porId.has(i.id));
    const esperadosAqui = this.suite
      ? aprobados.filter((a) => Array.isArray(a.suites) && a.suites.includes(this.suite))
      : [];
    const ausentes = esperadosAqui.filter((a) => !idsVistos.has(a.id));
    return {
      aprobadosVistos: vistos.filter((i) => porId.has(i.id)),
      inesperados,
      ausentes,
      total: vistos.length,
    };
  }

  /* Escribe el veredicto de la política como comprobaciones de pleno derecho, para que salgan en
     el log, en el JSON y en el informe igual que cualquier otra. */
  aplicaPolitica(lista = leerBlockedAprobados()) {
    /* Idempotente a proposito: la llaman la suite y el arranque de linea de ordenes, y dos
       POL-01 en la misma pasada descuadrarian los totales del informe. */
    if (this._politicaAplicada) return this._politicaAplicada;
    const p = this.politicaBlocked(lista);
    this.seccion('politica de bloqueos');
    this.comprueba('POL-01', 'ningun BLOCKED fuera de la allowlist aprobada',
      p.inesperados.length === 0,
      p.inesperados.map((i) => `${i.id}: ${i.texto}${i.detalle ? ' — ' + i.detalle : ''}`).join(' | '));
    if (p.ausentes.length) {
      this.unexpected('POL-02', 'un bloqueo aprobado ha dejado de aparecer: revisar la lista',
        p.ausentes.map((a) => a.id).join(', '));
    } else {
      this.pass('POL-02', 'los bloqueos aprobados que tocaban en esta suite han aparecido',
        p.aprobadosVistos.map((i) => i.id).join(', ') || '(ninguno esperado)');
    }
    this._politicaAplicada = p;
    return p;
  }

  resumen() {
    const c = this.cuenta();
    return `${c.PASS} PASS · ${c.FAIL} FAIL · ${c.BLOCKED} BLOCKED · ${c['NO APLICA']} NO APLICA · ${c['KNOWN OPEN']} KNOWN OPEN`
      + (c['UNEXPECTED PASS'] ? ` · ${c['UNEXPECTED PASS']} UNEXPECTED PASS` : '');
  }

  imprimeFinal() {
    const c = this.cuenta();
    const seg = (this.duracionMs / 1000).toFixed(1);
    linea(`\n===== ${this.titulo} =====`);
    linea(this.resumen() + `  ·  ${seg} s`);
    if (c.FAIL) {
      linea('\nFallos:');
      for (const i of this.items.filter((x) => x.estado === 'FAIL')) {
        linea(`  ${i.id}  ${i.texto}${i.detalle ? `\n      ${i.detalle}` : ''}`);
      }
    }
    if (c.BLOCKED) {
      const p = this.politicaBlocked();
      linea('\nSin probar (BLOCKED aprobados):');
      for (const i of p.aprobadosVistos) {
        linea(`  ${i.id}  ${i.texto}${i.detalle ? ` — ${i.detalle}` : ''}`);
      }
      if (p.inesperados.length) {
        linea('\nBLOCKED NO APROBADOS (rompen la suite):');
        for (const i of p.inesperados) {
          linea(`  ${i.id}  ${i.texto}${i.detalle ? ` — ${i.detalle}` : ''}`);
        }
      }
    }
    if (c['NO APLICA']) {
      linea('\nNO APLICA en este cliente:');
      for (const i of this.items.filter((x) => x.estado === 'NO APLICA')) {
        linea(`  ${i.id}  ${i.texto}${i.detalle ? ` — ${i.detalle}` : ''}`);
      }
    }
    if (c['UNEXPECTED PASS']) {
      linea(`\nUNEXPECTED PASS (${enCI() ? 'rompe la suite en CI' : 'revisar y retirar de la lista'}):`);
      for (const i of this.items.filter((x) => x.estado === 'UNEXPECTED PASS')) {
        linea(`  ${i.id}  ${i.texto}${i.detalle ? ` — ${i.detalle}` : ''}`);
      }
    }
    return this.verdeReal();
  }

  /* Verde de verdad: sin FAIL, sin bloqueos no aprobados y —en CI— sin UNEXPECTED PASS. */
  verdeReal() {
    const c = this.cuenta();
    if (c.FAIL) return false;
    if (this.politicaBlocked().inesperados.length) return false;
    if (enCI() && c['UNEXPECTED PASS']) return false;
    return true;
  }

  /* El código de salida de todo el proceso: 0 si el verde es real, 1 si no. */
  salir() {
    const ok = this.imprimeFinal();
    process.exitCode = ok ? 0 : 1;
    return ok;
  }

  aJSON() {
    return {
      titulo: this.titulo,
      suite: this.suite,
      duracionMs: this.duracionMs,
      cuenta: this.cuenta(),
      politicaBlocked: this.politicaBlocked(),
      verde: this.verdeReal(),
      items: this.items,
    };
  }
}
