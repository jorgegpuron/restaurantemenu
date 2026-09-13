# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **13 sep 2026, tarde** · **producción sirve `b6b15b0`, build
> `1789312187368`.** Ocho commits desplegados hoy en cinco tandas, cada una verificada desde
> fuera. `DESPLIEGUE_REAL` releída de GitHub: **`false`**. Árbol limpio salvo `.ai/`.

---

## Lo que hace el panel hoy y no hacía ayer

1. **Mover una categoría o una sección no recarga**, y si el servidor rechaza el orden **se
   deshace solo**: vuelven la ficha, los chips y los 312 números.
2. **Etiquetar no recarga**, y el filtro «Destacados» se queda puesto.
3. **Arrastrar para ordenar** las categorías de una sección, desde el lápiz de la sección. Con
   teclado también, y el foco sigue a la fila.
4. **Un aviso de guardado que no se puede pasar por alto**: «Guardando…», «No se ha guardado»
   —que se queda hasta que lo cierras— y «Sin conexión». Los doce guardados del panel pasan
   por el mismo envoltorio.
5. **El Design System 2026** completo, con la columna de orden alineada y seis contrastes
   arreglados en tema claro, el anillo de foco incluido.
6. El panel **ya no descarga las dos tipografías de la carta**: 75,8 KB menos por carga en frío.

## Las dos cosas que están a medias y son tuyas

**1. El caché de borde de la carta.** La cabecera ya está puesta y desplegada:
`public, max-age=0, s-maxage=60, must-revalidate`. Pero **no basta, y se comprobó después de
desplegarla**: Cloudflare sólo considera cacheable una lista fija de extensiones estáticas y el
HTML no está en ella. Medido en la misma tanda: `/assets/logo.svg` da `HIT` y `/` da `DYNAMIC`.

Para que esos 60 s hagan algo hay que **declarar el HTML elegible con una Cache Rule en el
panel de Cloudflare** («Eligible for cache» + «Respect origin TTL»). Eso no es build, es
configuración, y es del propietario. La cabecera se queda porque es la declaración correcta y
el requisito previo: con la regla puesta funciona sin tocar nada más.

Lo que está en juego, medido: **~1 s de primer byte** para cada comensal —cinco muestras:
0,99 · 1,06 · 0,99 · 1,02 · 1,08 s, con conexión y TLS en 0,13— contra unos 100 ms desde el
borde. Es la mejora de rendimiento más grande que queda en todo el producto.

**2. Dos controles que le quitan el toque a otro.** `E2E-RS-TACTIL-44` sigue en rojo, y ahora
por el motivo de verdad:

```text
390  BUTTON.adm-secciones-flecha  le quita el toque a  BUTTON.adm-orden-b
768  SUMMARY.adm-cat-nombre-b     le quita el toque a  BUTTON.adm-btn
```

Llevaban escondidos: el mensaje de esa prueba sólo enseña cuatro entradas y los tres fallos de
tamaño los tapaban. «Responde otro control» es peor que un objetivo pequeño, así que es lo
siguiente que hay que mirar de accesibilidad.

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
- **El tema por defecto sigue siendo oscuro fijo.** El punto 15 del encargo pide preparar
  `prefers-color-scheme`: sigue abierto y es del propietario.

## Lo que queda del encargo del Design System

Fases **7, 9 y 10** a medias. Fase **13** de limpieza: no vale la pena —medido, la duplicación
real son 14 bloques y 1.107 bytes, no «179 selectores»; esa cifra contaba fotogramas y bloques
por tema—. Fase **8**: la mitad no existe (tabla ordenable, paginación, acciones en lote,
breadcrumb, drawer, «sin resultados») y eso es producto nuevo, no normalización.

Deuda medida y pequeña: los 15 px sin migrar, cuatro `line-height` en píxeles que son centrado
a la antigua, lectores de pantalla sin probar, errores de formulario uno a uno.

## Riesgos vivos

- **Etiquetar tarda ~0,5 s** en verse: el repintado necesita el cuerpo entero de la respuesta
  (2,3 MB en crudo, 123 KB con Brotli). No es más lento que la recarga que sustituye, pero no
  hay pintado optimista.
- **El arrastre de categorías no está probado en un teléfono real**, sólo emulado y con eventos
  de puntero sintéticos. Las flechas y el teclado sí son caminos completos.
- Los **13 `FAIL` de `admin-e2e`** son de tareas ajenas y anteriores. Dos —`E2E-RH-SEM-01` y
  `E2E-OFR-02`— miden el diseño ANTERIOR de la ficha de oferta.

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
    elegible; el HTML no lo es por defecto y hace falta una Cache Rule.
19. **El mensaje de `E2E-RS-TACTIL-44` sólo enseña cuatro entradas.** Los fallos de tamaño
    pueden tapar solapes, que son peores. Si se corrige un suelo, mirar qué aparece detrás.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** y servir con `php -S 127.0.0.1:<puerto> -t <copia>
-d extension=gd -d extension=mbstring -d extension_dir=<ext de PHP de winget>`. **Nunca servir
`2-subir` directamente.** Para ver la PUERTA de acceso, la misma copia sin tocar
`DEMO_SIN_CLAVE`. Para simular un cliente con color de marca propio: copiar
`estado-EJEMPLO.json` a `estado.json` y ponerle `marca.colorPrincipal`. Para móvil de verdad,
Playwright con `isMobile` y `hasTouch`, no el panel de la app.

Quedan **dos ramas**: `main` y `ds2026-importado`, que es la única referencia al historial del
laboratorio antes del rebase —su contenido está en `main`, así que se puede borrar—. Las once
ramas de trabajo ya integradas se borraron el 13 sep. El **laboratorio** (`4-laboratorio/`) ya
no sirve para nada y se puede borrar cuando se quiera.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive; la clave conviene rotarla). `gh` conectado como `jorgegpuron`. Aviso por
voz para esperas largas: `SAPI.SpVoice` con «Microsoft Helena Desktop» por COM (`System.Speech`
falla con el dispositivo de audio); acepta SSML con `<pitch>` y `<rate>` pasando el flag `8`.
`.claude/launch.json` del workspace lleva entradas de vista previa que apuntan a copias
temporales de sesiones concretas: si no existen, se recrean o se borran.
