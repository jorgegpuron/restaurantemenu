/* Los paises del marcador.
 *
 * Treinta y seis y no doscientos: son los que de verdad aparecen en una carta de Canarias.
 * Quien no este elige «Otro», que no lleva bandera. Anadir uno son dos lineas aqui y un fichero
 * en assets/banderas/ — como se hace esta escrito en la licencia de esa carpeta.
 *
 * NO es una lista politica: es ISO 3166-1 recortada a lo que pasa en la puerta del local.
 *
 * Las banderas son FICHEROS y no SVG dentro del HTML. Los originales de flag-icons pesan 198 KB
 * entre las 36, y solo Espana y Mexico son 166 de esos: sus escudos son ilustraciones que a
 * veinte pixeles no se ven. Rasterizadas a 60x45 en WebP las 36 pesan 35 KB, y el comensal se
 * descarga UNA, la que se le ensene. Dentro del HTML se las descargaria todas siempre.
 */

/* codigo -> nombre en cada idioma. El ingles es la clave con la que traduce el resto del motor. */
export const PAISES = [
  ['es', 'España', 'Spain', 'Spanien'],
  ['gb', 'Reino Unido', 'United Kingdom', 'Vereinigtes Königreich'],
  ['de', 'Alemania', 'Germany', 'Deutschland'],
  ['fr', 'Francia', 'France', 'Frankreich'],
  ['it', 'Italia', 'Italy', 'Italien'],
  ['pt', 'Portugal', 'Portugal', 'Portugal'],
  ['nl', 'Países Bajos', 'Netherlands', 'Niederlande'],
  ['be', 'Bélgica', 'Belgium', 'Belgien'],
  ['ie', 'Irlanda', 'Ireland', 'Irland'],
  ['pl', 'Polonia', 'Poland', 'Polen'],
  ['se', 'Suecia', 'Sweden', 'Schweden'],
  ['no', 'Noruega', 'Norway', 'Norwegen'],
  ['dk', 'Dinamarca', 'Denmark', 'Dänemark'],
  ['fi', 'Finlandia', 'Finland', 'Finnland'],
  ['is', 'Islandia', 'Iceland', 'Island'],
  ['ch', 'Suiza', 'Switzerland', 'Schweiz'],
  ['at', 'Austria', 'Austria', 'Österreich'],
  ['cz', 'Chequia', 'Czechia', 'Tschechien'],
  ['ro', 'Rumanía', 'Romania', 'Rumänien'],
  ['hu', 'Hungría', 'Hungary', 'Ungarn'],
  ['gr', 'Grecia', 'Greece', 'Griechenland'],
  ['ru', 'Rusia', 'Russia', 'Russland'],
  ['ua', 'Ucrania', 'Ukraine', 'Ukraine'],
  ['us', 'Estados Unidos', 'United States', 'Vereinigte Staaten'],
  ['ca', 'Canadá', 'Canada', 'Kanada'],
  ['mx', 'México', 'Mexico', 'Mexiko'],
  ['ar', 'Argentina', 'Argentina', 'Argentinien'],
  ['br', 'Brasil', 'Brazil', 'Brasilien'],
  ['co', 'Colombia', 'Colombia', 'Kolumbien'],
  ['ve', 'Venezuela', 'Venezuela', 'Venezuela'],
  ['cu', 'Cuba', 'Cuba', 'Kuba'],
  ['ma', 'Marruecos', 'Morocco', 'Marokko'],
  ['cn', 'China', 'China', 'China'],
  ['jp', 'Japón', 'Japan', 'Japan'],
  ['in', 'India', 'India', 'Indien'],
  ['au', 'Australia', 'Australia', 'Australien'],
];

export const CODIGOS = PAISES.map(function (p) { return p[0]; });

/* El idioma de la carta lleva bandera en su selector, y desde la fase 5 la DECLARA el
   cliente idioma a idioma (cliente.mjs -> idiomas.*.bandera), validada contra los ficheros
   de assets/banderas/: aqui ya no vive ningun mapa idioma->bandera. */
/* La etiqueta de una bandera. Sin alt: al lado va siempre el nombre del pais o del idioma en
   texto, asi que repetirlo aqui seria decirlo dos veces a quien usa lector de pantalla. */
export const imgBandera = (cod, clase) =>
  !cod ? '' :
  '<img class="' + clase + '" src="assets/banderas/' + cod
  + '.webp" width="20" height="15" alt="" decoding="async">';
