/* Los defectos que siguen abiertos por decisión expresa: E3, E4 y E5.
 *
 * No se corrigen y no se esconden. La bateria comprueba que SIGUEN AHÍ, y hay un motivo para eso
 * que no es burocracia: si mañana alguien los arregla sin decirlo, aquí sale un UNEXPECTED PASS y
 * se retiran de la lista a sabiendas. Y si alguien escribe una prueba que dé por bueno el
 * comportamiento defectuoso, el defecto se habría convertido en contrato sin que nadie lo
 * decidiera. Un KNOWN OPEN no es un PASS: no cuenta como cobertura y no rompe la suite.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { CLIENTE, ADMIN_FUENTE } from '../lib/entorno.mjs';

export function pruebasConocidos(informe, { clienteNuevo, docroot, pagina, servidor }) {
  informe.seccion('defectos abiertos (E3, E4, E5)');

  /* E3 — el motor.lock de un cliente nuevo declara 1.0.0 aunque copie el motor de otra version. */
  if (clienteNuevo && existsSync(path.join(clienteNuevo, 'motor.lock'))) {
    const lockCliente = JSON.parse(readFileSync(path.join(clienteNuevo, 'motor.lock'), 'utf8'));
    const lockSemilla = JSON.parse(readFileSync(path.join(CLIENTE, 'motor.lock'), 'utf8'));
    const sigue = lockCliente.version !== lockSemilla.version;
    if (sigue) {
      informe.known('E3', 'el motor.lock de un cliente nuevo no hereda la version del motor',
        `cliente=${lockCliente.version} semilla=${lockSemilla.version}`);
    } else {
      informe.unexpected('E3', 'el motor.lock del cliente nuevo ya hereda la version: revisar y retirar de la lista',
        `cliente=${lockCliente.version}`);
    }
  } else {
    informe.blocked('E3', 'version del motor.lock de un cliente nuevo', 'no se creo ningun cliente en esta pasada');
  }

  /* E4 — --detectar no revisa server/**, y ahi quedan menciones a la carpeta del cliente semilla. */
  const herramienta = readFileSync(path.join(CLIENTE, 'nuevo-cliente.mjs'), 'utf8');
  const rutas = /const RUTAS_EN_PROYECTO = \[([^\]]*)\]/.exec(herramienta);
  const miraServer = rutas ? /['"]server['"]/.test(rutas[1]) : false;
  if (!miraServer) {
    informe.known('E4', '--detectar no incluye server/** entre las rutas que revisa',
      rutas ? rutas[1].replace(/\s+/g, ' ').trim() : '(no se pudo leer la lista)');
  } else {
    informe.unexpected('E4', '--detectar ya revisa server/**: revisar y retirar de la lista');
  }

  /* E5 — un porcentaje imposible se guarda si la oferta esta apagada. Se comprueba leyendo la
     guarda en el codigo: reproducirlo escribiendo un 950 en el estado seria dejar el defecto
     sembrado en el docroot de la siguiente prueba. */
  const panel = readFileSync(path.join(ADMIN_FUENTE, 'index.php'), 'utf8');
  const guardaCondicionada = /elseif \(\$on && \(\$pct < 1 \|\| \$pct > 90\)\)/.test(panel);
  if (guardaCondicionada) {
    informe.known('E5', 'el rango del descuento solo se valida con la oferta encendida',
      'elseif ($on && ($pct < 1 || $pct > 90))');
  } else {
    informe.unexpected('E5', 'el rango del descuento ya se valida siempre: revisar y retirar de la lista');
  }

  return informe;
}
