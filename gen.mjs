/* Envoltorio estable: `node gen.mjs` compila la carta, viva el motor donde viva.
 *
 * EL ORDEN ES EL MECANISMO. Primero se carga SOLO el verificador (entorno.mjs, que no
 * importa nada funcional) y se comprueba motor.lock; el compilador se carga DESPUES, con un
 * import dinamico. Con un import estatico, un modulo del motor alterado —pero valido—
 * ejecutaba su codigo antes de que el lock lo cantara: medido, no teorico.
 *
 * Sin logica y sin datos del cliente a proposito: este fichero es interfaz del motor, va
 * listado en motor.lock y el build aborta si alguien lo toca sin registrar el cambio. */
import { verificarMotor } from './motor/entorno.mjs';
verificarMotor();
await import('./motor/gen.mjs');
