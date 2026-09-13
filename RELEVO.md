# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **13 sep 2026, mediodía** · **`main` = `origin/main` = producción, los
> tres en `84ef17a`, build `1789304317182`. Todo lo trabajado está desplegado y verificado
> desde fuera. `DESPLIEGUE_REAL` releída de GitHub: `false`.**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`)

- **`main` = `origin/main` = producción**, los tres en **`84ef17a`** — build `1789304317182`.
  Tres despliegues reales el 13 de septiembre, los tres con el mismo perfil:
  `Uploading: 0 B · Deleting: 0 B · Replacing: 1,58 MB` (cero altas, cero bajas).
  Verificado desde fuera cada vez: `version.json`, carta con ES/EN/DE, 404 real, y el panel
  sin clave **no filtra nada** (0 botones `data-tab`, 0 filas, 0 nombres de plato, ningún hash
  en el marcado — comprobado sobre el marcado, quitando `<style>` y `<script>`).
- Árbol limpio salvo `.ai/`, sin versionar.

## Qué entró, y en qué orden

De abajo arriba, los seis commits del 13 de septiembre:

1. **`b92290c`** — mover una categoría o una sección y etiquetar un plato **dejan de recargar
   la página**. La regla de numeración («el número de un plato es su posición en la carta
   entera») vivía dos veces; ahora es una, `renumerarAmbito()`, y sirve a los tres
   movimientos. De paso cae un fallo que ya existía: el renumerado daba puesto a cualquier
   fila, con número o sin él, y en «A la plancha» eso corría los tres números de detrás.
2. **`f754cb1`** y **`3307c36`** — relevo y las dos decisiones del propietario, escritas donde
   viven las reglas.
3. **`67a9266` · `147b59f` · `350cc81`** — el **Design System 2026** entero, con la columna de
   orden y el naranja legible. Once documentos en `docs/design-system/`.
4. **`06b441c`** — **ordenar las categorías de una sección arrastrando**, en una hoja.
5. **`84ef17a`** — el panel **deja de descargar las dos tipografías de la carta**: −75,8 KB por
   carga en frío.

`admin-e2e` en cada tanda: **535 entradas**, comparadas **entrada por entrada** con el build
anterior. Las dos primeras, 520 PASS · 14 FAIL idénticas. Desde el Design System, **521 PASS ·
13 FAIL**: un FAIL *menos*, porque quitar el relleno de 14 px devuelve 28 px al nombre del
plato a 320 y `E2E-OFR-01-320` deja de fallar.

## Decisiones tomadas, para que nadie las reabra

- **Los iconos de estado del panel NO siguen la marca del cliente.** La marca manda en la carta
  y en la pestaña Marca; el panel es la herramienta y habla igual para todos. Si algún día se
  cambia de idea, no se hace a ojo: un amarillo `#FFC107` da 1,61:1 sobre la tarjeta clara.
- **Las flechas de la cabecera de categoría se quedan en 44×44.** Los bordes izquierdos ya
  coinciden con las del plato; unificar también los centros exigiría bajar ese objetivo táctil
  a 28×44.
- **El tema por defecto sigue siendo oscuro fijo.** El punto 15 del encargo pide preparar
  `prefers-color-scheme`: sigue abierto, y es del propietario.

## Lo que queda, por orden de valor

1. **Las fuentes de la carta.** La carta —lo que carga el comensal— sigue pidiéndolas a
   `fonts.googleapis.com` y `fonts.gstatic.com`: dos orígenes ajenos en el camino crítico y
   unos 95 KB, más que el HTML comprimido de la página entera (91,5 KB). **Es la mejora de
   rendimiento más valiosa que queda.** Ojo: el encargo dice *no modificar la carta pública*.
   En el PANEL ya está resuelto, y por Cloudflare: ahí las fuentes salen del propio dominio,
   en `/cf-fonts/`, con `max-age=31536000, immutable`.
2. **Fase 13**, limpieza de CSS: 179 selectores repetidos, 14 bloques idénticos.
3. **Fases 9 y 10**: formularios y estados (skeleton, vacío, error, offline).
4. **Fase 7**, componentes base, a medias.
5. **Fase 8: la mitad no existe** — tabla ordenable, paginación, acciones en lote, breadcrumb,
   drawer, «sin resultados». Eso es producto nuevo, no normalización.
6. **Deuda medida**: los 15 px sin migrar (el tamaño más frecuente de Platos y no está en la
   escala); cuatro `line-height` en píxeles que son centrado a la antigua; dos objetivos
   táctiles por debajo de 24 px; lectores de pantalla sin probar; errores de formulario uno a
   uno.
7. **Limpieza**: once ramas vivas y el laboratorio (`4-laboratorio/`), que ya no sirve — su
   rama se trajo con `git fetch <ruta-del-clon> <rama>:<rama>` y está integrada.

## Riesgos vivos

- **Si el servidor rechaza un orden**, lo que se ve (ficha movida, números repartidos) es
  optimista y ya no hay recarga que lo corrija. El aviso lo dice —«Recarga la página: lo que
  ves ya no es lo que está guardado»— pero no se deshace solo.
- **Etiquetar tarda ~0,5 s** en verse: el repintado necesita el cuerpo entero de la respuesta.
  No es más lento que la recarga que sustituye, pero no hay pintado optimista.
- **El arrastre de categorías no está probado en un teléfono real**, sólo emulado y con eventos
  de puntero sintéticos. Las flechas y el teclado sí son caminos completos.
- Los **13 `FAIL` de `admin-e2e`** son de tareas ajenas y anteriores. Dos —`E2E-RH-SEM-01` y
  `E2E-OFR-02`— miden el diseño ANTERIOR de la ficha de oferta.

## Trampas pagadas

1. **Un `*/` dentro del texto de un comentario CSS cierra el comentario antes de tiempo** y se
   come las reglas de detrás. Lo cazó comparar una huella de estilo y geometría de los 21.498
   elementos, no mirarlo.
2. **Un `var()` que apunta a un token declarado en un DESCENDIENTE no resuelve: la declaración
   entera se cae.** Los tokens del sistema van en `:root`.
3. **Contar reglas no dice si una regla pinta algo.** Preguntando «¿a qué afecta esto?» con
   `querySelector` aparecieron once reglas muertas.
4. **Una transición puede quedarse pegada**, y con la pestaña en segundo plano
   `requestAnimationFrame` no corre: toda limpieza de clase necesita además un `setTimeout`.
5. **Medir contraste tiene dos trampas**: `color(srgb …)` va de 0 a 1, y hay que **componer las
   capas translúcidas** antes de comparar.
6. **Los componentes ocultos no se miden si no se abren.** Cuatro de los seis contrastes
   arreglados vivían en pantallas cerradas: hay que montarlas a mano.
7. **Un grep ingenuo confunde el CSS con una fuga de datos.** Acotar al marcado, quitando
   `<style>` y `<script>`.
8. **`gen.mjs` rechaza compilar si `index.php` o `SPEC.md` cambian sin refirmar `motor.lock`**:
   `node motor/lock.mjs --escribir` primero, siempre.
9. **La terminal del propietario es PowerShell**: `&&` no es separador válido, hay que usar `;`.
10. **Imports ESM con ruta absoluta de Windows necesitan `file:///`**.
11. **Fijar SIEMPRE el viewport antes de medir en el navegador.** Sin fijarlo `innerWidth` es 0
    y las cifras de alto y desbordamiento no significan nada. Y cuando el panel **escala** el
    viewport emulado, `getBoundingClientRect` devuelve píxeles escalados mientras
    `getComputedStyle` devuelve los de CSS: 44 px medían 43,1.
12. **Un heredoc puede comerse los `\\` dobles.** Una expresión regular entró en el código como
    `[^"\]`, que no compila, y **eso tira el bloque `<script>` entero**. No se veía en el diff
    ni en `php -l`: se veía en la consola del navegador. Tras aplicar un parche a mano, **mirar
    la consola antes de dar nada por bueno**.
13. **`motor/lock.mjs` no puede refirmar un `motor.lock` en conflicto**: lo parsea como JSON y
    revienta. En un rebase, resolver primero (`git checkout --theirs motor.lock`) y refirmar
    después.
14. **OneDrive bloquea `.git/rebase-merge` y `.git/worktrees/`**: `git rebase --abort` deja el
    directorio puesto y git sigue creyendo que rebasa. Se borra con PowerShell. Siguen ahí
    `totm-main-commit` y `totm-main-commit2`, que hacen que git se queje en cada commit.
15. **`offsetParent` NO sirve para saber si algo se puede enfocar.** Un panel escondido con
    `visibility` conserva `offsetParent` y sigue midiendo, y `focus()` sobre él no hace nada.
    Hay que mirar `getClientRects()` y la `visibility` computada — y comprobar después que el
    foco llegó.
16. **Optimizar bytes SIN COMPRIMIR es optimizar un número que nadie paga.** El servidor sirve
    Brotli: el panel son 2,73 MB en crudo y **123 KB** de transferencia. Un sprite de iconos
    que quitaba 439.727 bytes (16% del documento) ahorró **807 bytes** reales y no movió el
    parseo. Se midió y se tiró.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** y servir con `php -S 127.0.0.1:<puerto> -t <copia>
-d extension=gd -d extension=mbstring -d extension_dir=<ext de PHP de winget>`. **Nunca servir
`2-subir` directamente.** Para ver la PUERTA de acceso, la misma copia sin tocar
`DEMO_SIN_CLAVE`. Para simular un cliente con color de marca propio: copiar
`estado-EJEMPLO.json` a `estado.json` y ponerle `marca.colorPrincipal`. Para móvil de verdad,
Playwright con `isMobile` y `hasTouch`, no el panel de la app.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive; la clave conviene rotarla). `gh` conectado como `jorgegpuron`. Aviso por
voz para esperas largas: `SAPI.SpVoice` con «Microsoft Helena Desktop» por COM (`System.Speech`
falla con el dispositivo de audio); acepta SSML con `<pitch>` y `<rate>` pasando el flag `8`.
`.claude/launch.json` del workspace lleva entradas de vista previa que apuntan a copias
temporales de sesiones concretas: si no existen, se recrean o se borran.
