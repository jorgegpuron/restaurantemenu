# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **13 sep 2026, noche** · **producción sirve `d9072a6`, build
> `1789323369451`.** Diez commits desplegados hoy en siete tandas, cada una verificada desde
> fuera. `DESPLIEGUE_REAL` releída de GitHub: **`false`**. Árbol limpio salvo `.ai/`, que son
> encargos entre agentes escritos desde la OTRA máquina (rutas `C:\Users\info\…`): no se han
> tocado ni borrado.

---

## Lo que hace el panel hoy y no hacía ayer

1. **Etiquetar EN LOTE.** Con una búsqueda o un filtro puesto sale una tira que dice cuántos
   platos se ven y ofrece «Etiquetar» y «Quitar etiqueta» para todos ellos, en **un solo
   guardado**. Es lo que el propietario dijo que más hace al día.
2. **Mover una categoría o una sección no recarga**, y si el servidor rechaza el orden **se
   deshace solo**: vuelven la ficha, los chips y los 312 números.
3. **Arrastrar para ordenar** las categorías de una sección, desde el lápiz de la sección. Con
   teclado también, y el foco sigue a la fila.
4. **Un aviso de guardado que no se puede pasar por alto**: «Guardando…», «No se ha guardado»
   —que se queda hasta que lo cierras— y «Sin conexión». Los doce guardados del panel pasan
   por el mismo envoltorio.
5. **El Design System 2026** completo, con la columna de orden alineada y seis contrastes
   arreglados en tema claro, el anillo de foco incluido.
6. El panel **ya no descarga las dos tipografías de la carta**: 75,8 KB menos por carga en frío.
7. **La carta llega en ~0,14 s en vez de ~1 s** desde que el borde de Cloudflare la guarda.

## Nada está a medias en manos del propietario

Las dos cosas que estaban aquí el 13 sep por la tarde se cerraron esa misma noche:

- **El caché de borde**, que necesitaba una Cache Rule en Cloudflare y no era build. El
  propietario la creó: «cache del HTML de Tinge», la última de la lista, declara elegible todo
  `/tinge_of_turmeric/menu2/` **menos** `/admin/`, `estado.json` y `record.json`, y **sin Edge
  TTL propio** para que el TTL lo siga mandando el `.htaccess` y no viva en dos sitios. Medido
  al acabar: primer byte **0,138 · 0,153 · 0,141 · 0,127 · 0,143 s** contra 0,99-1,08 antes, con
  `cf-cache-status: HIT`. El panel sigue `DYNAMIC` con `no-store` y `estado.json` también.
  Si esa regla desaparece, esto vuelve solo a `DYNAMIC` **sin avisar de nada**.
- **`E2E-RS-TACTIL-44`, que llevaba en rojo desde antes de esta ronda, está verde.** Hicieron
  falta dos cosas y el orden confundió: estrechar el lápiz de la cabecera a 40×44 en punteros
  gruesos, y arreglar la sonda de la prueba, que medía también controles recortados por un
  scroller —los fantasmas de la tira de secciones tapaban un solape que sí era real—.

## Decisiones tomadas, para que nadie las reabra

- **Los iconos de estado del panel NO siguen la marca del cliente.** La marca manda en la carta
  y en la pestaña Marca. Si algún día se cambia de idea, no se hace a ojo: un amarillo
  `#FFC107` da 1,61:1 sobre la tarjeta clara.
- **Las flechas de la cabecera de categoría se quedan en 44×44.** Los bordes izquierdos ya
  coinciden con las del plato, que es lo que se pidió.
- **El área táctil de 44 no se puede dar en la tira de secciones.** Un halo no puede salir de un
  scroller horizontal, y la tira es demasiado densa: se probó subirla a 48 —funcionaba, 45 y
  44×44 medidos— y se retiró porque entonces los halos de dentro se pisan. Los suelos de la
  prueba están en lo medido, con el motivo al lado, y WCAG 2.5.8 (24×24) se cumple de sobra.
- **No hay sprite de iconos.** Quitaba 439.727 bytes sin comprimir, el 16% del documento, y con
  Brotli eran **807 bytes** reales sin mover el parseo. Se construyó, se midió y se tiró.
- **La carta no pide tipografías desde la cabecera.** Está medido con seis pasadas de Lighthouse
  por variante (ver `gen.mjs`): los `preconnect` en la cabecera costaban 10 puntos de mediana.
- **El panel entra en OSCURO**, y `prefers-color-scheme` queda **descartado** por decisión del
  propietario (13 sep). La puerta de acceso es oscura fija y encadenarla con un panel claro era
  un fogonazo en cada entrada. Quien quiera claro lo tiene a un toque y su elección manda para
  siempre. `COLORS.md` decía lo contrario con código que no existía: corregido.
- **«Ordenar sus categorías» se pinta en TODAS las secciones**, desactivado y con el motivo
  debajo donde hay una sola categoría. Antes se escondía, y como cuatro de las trece secciones
  tienen una sola, aparecía y desaparecía y se leía como un fallo.

## Lo que queda del encargo del Design System

Fases **7, 9 y 10** a medias. Fase **13** de limpieza: no vale la pena —medido, la duplicación
real son 14 bloques y 1.107 bytes, no «179 selectores»; esa cifra contaba fotogramas y bloques
por tema—. Fase **8**: la mitad no existe (tabla ordenable, paginación, breadcrumb, drawer,
«sin resultados») y eso es producto nuevo, no normalización. Las **acciones en lote** de esa
fase sí están hechas, y son las de etiquetar.

Deuda medida y pequeña: los 15 px sin migrar, cuatro `line-height` en píxeles que son centrado
a la antigua, lectores de pantalla sin probar, errores de formulario uno a uno.

## Riesgos vivos

- **Etiquetar tarda ~0,5 s** en verse: el repintado necesita el cuerpo entero de la respuesta
  (2,3 MB en crudo, 123 KB con Brotli). No es más lento que la recarga que sustituye, pero no
  hay pintado optimista. Dos pruebas esperan **al hecho** y no a un tiempo fijo por esto.
- **El arrastre de categorías no está probado en un teléfono real**, sólo emulado y con eventos
  de puntero sintéticos. Las flechas y el teclado sí son caminos completos.
- Los **12 `FAIL` de `admin-e2e`** (de 540 entradas) son de tareas ajenas y anteriores. Dos
  —`E2E-RH-SEM-01` y `E2E-OFR-02`— miden el diseño ANTERIOR de la ficha de oferta.
- **El formulario de «Borrar la sección» sólo sale en secciones creadas desde el panel**, y esta
  carta no tiene ninguna: su arreglo se verificó fabricando una a propósito en local, no en
  producción.

## Trampas pagadas

1. **Un `*/` dentro del texto de un comentario CSS** cierra el comentario antes de tiempo y se
   come las reglas de detrás. Lo cazó comparar una huella de estilo y geometría de 21.498
   elementos, no mirarlo.
2. **Un `var()` que apunta a un token declarado en un DESCENDIENTE no resuelve**: la declaración
   entera se cae. Los tokens del sistema van en `:root`.
3. **Contar reglas no dice si una regla pinta algo.**
4. **Una transición puede quedarse pegada**, y con la pestaña en segundo plano
   `requestAnimationFrame` no corre: toda limpieza de clase necesita además un `setTimeout`.
5. **Medir contraste**: `color(srgb …)` va de 0 a 1, y hay que **componer las capas
   translúcidas** antes de comparar.
6. **Los componentes ocultos no se miden si no se abren.** Cuatro de los seis contrastes
   arreglados vivían en pantallas cerradas.
7. **Un grep ingenuo confunde el CSS con una fuga de datos.** Acotar al marcado.
8. **`gen.mjs` rechaza compilar si `index.php` o `SPEC.md` cambian sin refirmar `motor.lock`.**
9. **La terminal del propietario es PowerShell**: `&&` no vale, se usa `;`.
10. **Imports ESM con ruta absoluta de Windows necesitan `file:///`**.
11. **Fijar SIEMPRE el viewport antes de medir en el navegador.** Y cuando el panel **escala** el
    viewport emulado, `getBoundingClientRect` devuelve píxeles escalados mientras
    `getComputedStyle` devuelve los de CSS: 44 px medían 43,1.
12. **Un heredoc puede comerse los `\\` dobles.** Una expresión regular entró como `[^"\]` y
    **tumbó el bloque `<script>` entero**; no se veía en el diff ni en `php -l`, se veía en la
    consola del navegador.
13. **`motor/lock.mjs` no puede refirmar un `motor.lock` en conflicto**: lo parsea como JSON.
    En un rebase, resolver primero y refirmar después.
14. **OneDrive bloquea `.git/rebase-merge` y `.git/worktrees/`**: `git rebase --abort` deja el
    directorio y git cree que sigue rebasando. Se borra con PowerShell.
15. **`offsetParent` NO sirve para saber si algo se puede enfocar.** Un panel escondido con
    `visibility` lo conserva y `focus()` no hace nada. Mirar `getClientRects()` y la
    `visibility` computada, y **comprobar después que el foco llegó**.
16. **Optimizar bytes SIN COMPRIMIR es optimizar un número que nadie paga.** El servidor sirve
    Brotli: el panel son 2,3 MB en crudo y **123 KB** de transferencia.
17. **Un halo táctil no puede salir de un scroller horizontal.** Si un eje del `overflow` es
    `auto`, el `visible` del otro se computa a `auto` y el `clip` a `hidden`. Probado con los dos.
18. **`s-maxage` no hace cacheable el HTML en Cloudflare.** Sólo pone el TTL de lo que ya es
    elegible; el HTML no lo es por defecto y hace falta una Cache Rule (ya creada, arriba).
19. **El mensaje de `E2E-RS-TACTIL-44` sólo enseña cuatro entradas.** Los fallos de tamaño
    pueden tapar solapes, que son peores. Si se corrige un suelo, mirar qué aparece detrás.
20. **Levantar una regla RE-DECLARANDO `display` pisa composiciones que viven en un
    `@container`.** Así salía la búsqueda descolocada en el móvil: una regla con cuatro clases
    devolvía las filas escondidas con `display:flex` y machacaba el `display:grid` de dos
    líneas. Para levantar una regla, que no se aplique; no re-declarar el valor.
21. **Un `<button>` puede pertenecer a un formulario que NO lo contiene**, con `form="id"`, y su
    `name`/`value` viaja igual por ser el que manda. Es la salida cuando hay que meter un botón
    dentro de otro formulario sin anidarlos. Funciona con el ayudante de confirmar **porque ese
    ayudante vuelve a pulsar el botón** en vez de llamar a `form.submit()`, que perdería el
    `name`/`value`.
22. **La caja flotante de renombrar una sección ES el `<form>`.** Cualquier cosa puesta detrás
    de `</form>` se dibuja FUERA de la caja, desbordando sobre la tira. Pasó dos veces.
23. **`entrarAlPanel()` no puede pasar la primera configuración de un panel recién compilado**:
    pide también el token de activación. Para una prueba de mano, escribir `admin/clave.php` en
    el docroot con un `password_hash` y entrar por `#clave`.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** y servir con `php -S 127.0.0.1:<puerto> -t <copia>
-d extension=gd -d extension=mbstring -d extension_dir=<ext de PHP de winget>`. **Nunca servir
`2-subir` directamente.** Para ver la PUERTA de acceso, la misma copia sin tocar
`DEMO_SIN_CLAVE`. Para simular un cliente con color de marca propio: copiar
`estado-EJEMPLO.json` a `estado.json` y ponerle `marca.colorPrincipal`. Para móvil de verdad,
Playwright con `isMobile` y `hasTouch`, no el panel de la app.

Quedan **dos ramas** en remoto: `main` y `ds2026-importado`, que es la única referencia al
historial del laboratorio antes del rebase —su contenido está en `main`, así que se puede
borrar—. Las once ramas de trabajo ya integradas se borraron el 13 sep; las dos de ese día
(`feat/lote-etiquetas-y-popover`, `fix/busqueda-y-popovers`) están contenidas en `main`. El
**laboratorio** (`4-laboratorio/`) ya no sirve para nada y se puede borrar cuando se quiera.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive; la clave conviene rotarla). `gh` conectado como `jorgegpuron`. Aviso por
voz para esperas largas: `SAPI.SpVoice` con «Microsoft Helena Desktop» por COM (`System.Speech`
falla con el dispositivo de audio); acepta SSML con `<pitch>` y `<rate>` pasando el flag `8`.
`.claude/launch.json` del workspace lleva entradas de vista previa que apuntan a copias
temporales de sesiones concretas: si no existen, se recrean o se borran.
