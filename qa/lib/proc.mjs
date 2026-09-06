/* Ejecutar procesos sin depender de un shell.
 *
 * Todo va con array de argumentos y `shell: false`: ni comillas que escapar, ni diferencias entre
 * cmd.exe y bash, ni un valor con un espacio que rompa la línea. Es lo que hace que la misma
 * suite corra igual en Windows y en un runner de Linux.
 */
import { spawn, spawnSync } from 'node:child_process';

export function correr(cmd, args, opciones = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    ...opciones,
  });
  return {
    codigo: r.status,
    salida: (r.stdout || '').toString(),
    error: (r.stderr || '').toString(),
    ok: r.status === 0,
    texto: ((r.stdout || '') + (r.stderr || '')).toString(),
  };
}

/* Lanza un proceso en segundo plano y devuelve un manejador con `parar()`. Se usa para los
   servidores PHP: cada uno vive lo que dura su prueba y se cierra siempre, también si la prueba
   revienta (los llamadores lo hacen en un finally). */
export function lanzar(cmd, args, opciones = {}) {
  const hijo = spawn(cmd, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'], ...opciones });
  const registro = { salida: '', error: '' };
  hijo.stdout.on('data', (d) => { registro.salida += d.toString(); });
  hijo.stderr.on('data', (d) => { registro.error += d.toString(); });
  let cerrado = false;
  hijo.on('exit', () => { cerrado = true; });
  return {
    hijo,
    registro,
    get vivo() { return !cerrado && hijo.exitCode === null; },
    parar() {
      if (cerrado) return;
      try { hijo.kill(); } catch { /* ya estaba muerto */ }
      cerrado = true;
    },
  };
}

export function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* Espera a que una URL conteste, con tope. Devuelve true si contestó. */
export async function esperaHttp(url, msTope = 15000) {
  const hasta = Date.now() + msTope;
  while (Date.now() < hasta) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      if (r.status > 0) return true;
    } catch { /* todavia no escucha */ }
    await esperar(150);
  }
  return false;
}
