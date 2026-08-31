/* Envoltorio estable: `node importar.mjs` reescribe menu.md y los diccionarios desde
 * carta.json. Verifica motor.lock ANTES de cargar el importador (import dinamico: con uno
 * estatico, un modulo alterado ejecutaba antes de la comprobacion). Sin logica y sin datos
 * del cliente; listado en motor.lock. */
import { verificarMotor } from './motor/entorno.mjs';
verificarMotor();
await import('./motor/importar.mjs');
