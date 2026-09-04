/* Los 18 iconos que quedaron fuera del catalogo legal de alergenos (ver motor/alergenos.mjs)
 * al importar el set de 32 el 2026-09-04 -- sellos e indicadores de contenido general
 * (vegetariano, organico, kosher, picante, alcohol...), no alergenos del Reglamento UE
 * 1169/2011. NADIE los importa todavia: este modulo existe para tenerlos disponibles el
 * dia que se diseñe una funcion de indicadores, sin tocar el catalogo legal ni el HTML
 * generado hoy -- si esto nunca se importa, gen.mjs/importar.mjs no lo arrastran a ningun
 * build, y el build publico no crece ni un byte por su presencia aqui.
 *
 * Misma forma que ICONO/ETIQUETA de alergenos.mjs, a proposito: el dia que un consumidor
 * real lo necesite, se conecta igual (import { ICONO, ETIQUETA } from './indicadores.mjs').
 *
 * CATALOGO REAL, no lista copiada a mano: CLAVES sale de leer motor/iconos/indicadores-
 * adicionales/ con readdirSync, y cada ICONO[clave] se lee del .svg correspondiente al
 * cargar el modulo -- igual que alergenos.mjs. Anadir o quitar un fichero de esa carpeta
 * cambia CLAVES solo con eso, sin tocar este fichero: no hay una segunda lista que se
 * pueda desincronizar de lo que de verdad hay en disco. El orden es alfabetico porque
 * ningun consumidor existe todavia que necesite otro (a diferencia de las 14 legales,
 * que si tienen un orden con significado -- el del Anexo II -- y por eso alli CLAVES
 * sigue siendo literal).
 *
 * almonds no es "nuts" (esa es la categoria legal completa, con su propio icono en
 * alergenos.mjs) -- es una especie concreta, y vive aqui como indicador aparte, nunca
 * como sustituto de la categoria.
 *
 * clipboard y fork_knife: el nombre de archivo original no aclaraba una intencion de
 * negocio mas alla del dibujo (un portapapeles, unos cubiertos) -- la etiqueta se quedo
 * literal, sin inventar un significado que no consta. spicy y vegetarian pueden solapar
 * en concepto con el sistema de escala de picante y las marcas de dieta (vegan) que ya
 * existen en gen.mjs -- decision de diseño para cuando se conecte esto, no ahora. */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIR_ADICIONALES = join(AQUI, 'iconos', 'indicadores-adicionales');

function leerIcono(dir, clave) {
  const ruta = join(dir, clave + '.svg');
  let contenido;
  try {
    contenido = readFileSync(ruta, 'utf8');
  } catch {
    throw new Error('falta el SVG de "' + clave + '" en ' + ruta);
  }
  return contenido.trim();
}

/* readdirSync devuelve los ficheros en el orden que le da la gana el sistema de ficheros:
 * NTFS los da casi ordenados, ext4 los da por hash de nombre. Sin ordenar explicitamente,
 * este catalogo saldria en un orden en Windows, en otro en el segundo ordenador y en otro
 * en Linux (GitHub Actions), y cada cliente generado heredaria el orden de la maquina que
 * lo genero. Asi que: filtrar, normalizar el nombre (quitar la extension), COMPROBAR que
 * la clave normalizada es ASCII, y ordenar al final.
 *
 * .sort() sin comparador ordena por unidad de codigo UTF-16 ascendente -- determinista y
 * ciego al idioma del sistema. Es justo lo que se quiere aqui. localeCompare() NO valdria:
 * depende del locale del proceso, que no es el mismo en un Windows en espanol que en un
 * contenedor de CI en C/POSIX. Con las claves restringidas a [a-z0-9_] de abajo, el orden
 * por unidad de codigo es ademas el orden alfabetico que uno espera leyendo la lista. */
const CLAVES_SIN_ORDENAR = readdirSync(DIR_ADICIONALES)
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.slice(0, -4));

{
  const raras = CLAVES_SIN_ORDENAR.filter((k) => !/^[a-z0-9_]+$/.test(k));
  if (raras.length) {
    throw new Error('motor/iconos/indicadores-adicionales/: nombres de fichero fuera de '
      + '[a-z0-9_].svg: ' + raras.join(', ') + ' -- el nombre es la clave del catalogo, y '
      + 'con mayusculas o acentos el orden y la lectura dejan de ser iguales en Windows y '
      + 'en Linux. Renombra el fichero.');
  }
}

export const CLAVES = [...CLAVES_SIN_ORDENAR].sort();

export const ICONO = Object.fromEntries(CLAVES.map((k) => [k, leerIcono(DIR_ADICIONALES, k)]));

/* Etiquetas en ingles, mismo criterio que ETIQUETA de alergenos.mjs (nombre corto, sin
 * traducir aqui -- la traduccion, si algun dia se conecta esto, pasa por T()/TL() como
 * el resto del motor). Esto si es una tabla a mano (no geometria: es texto de negocio
 * que ningun fichero fisico lleva escrito) -- cada clave real en disco debe tener una
 * entrada, o el build aborta abajo en vez de dejar un indicador mudo. */
export const ETIQUETA = {
  gmo: 'GMO', alcohol: 'Alcohol', almonds: 'Almonds', chef_hat: "Chef's choice",
  chicken: 'Chicken', clipboard: 'Note', corn: 'Corn', fork_knife: 'Dish',
  fruit: 'Fruit', honey: 'Honey', kosher: 'Kosher', mushroom: 'Mushroom',
  organic: 'Organic', spicy: 'Spicy', sugar: 'Added sugar', vegetarian: 'Vegetarian',
  vitamins: 'Vitamins', weight: 'Portion size',
};

{
  const sinEtiqueta = CLAVES.filter((k) => ETIQUETA[k] === undefined);
  if (sinEtiqueta.length) {
    throw new Error('motor/indicadores.mjs: faltan ETIQUETA para: ' + sinEtiqueta.join(', '));
  }
}
