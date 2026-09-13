# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **13 sep 2026, madrugada** · **Producción lleva `b92290c`: el panel ya
> no recarga al mover categorías ni al etiquetar. El Design System 2026 está construido,
> rebasado sobre ese mismo `main` y probado, pero NO integrado: vive en la rama
> `feature/admin-ds2026` de ESTE repositorio.**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`)

- **`main` = `origin/main` = producción**, los tres en **`b92290c`** — build `1789263051893`,
  FTPS real, `Uploading: 0 B · Deleting: 0 B · Replacing: 1.57 MB` (cero altas, cero bajas).
  Verificado desde fuera: `version.json` público, carta con ES/EN/DE (3 `data-lang`, 44
  entradas `en` y 44 `de`), juego, 404 real, y el panel sin clave **no filtra nada** — 0
  botones `data-tab`, 0 filas de plato, 0 nombres, ningún hash en el marcado.
  `DESPLIEGUE_REAL` releída de GitHub al terminar: **`false`**.
- Árbol limpio salvo `.ai/`, sin versionar.

## Lo que entró en producción el 13 de septiembre (`b92290c`)

**Dos gestos del día a día dejaron de recargar la página.**

1. **Mover una categoría o una sección.** El número de un plato es su posición en la carta
   entera, y esa regla vivía dos veces: en PHP (`numeros_de_carta()`) y en JavaScript pero sólo
   para UNA ficha. Lo que quedaba fuera se resolvía recargando. Ahora la regla se escribe una
   vez —`renumerarAmbito()`— y sirve a los tres movimientos; mover una sección arrastra además
   sus fichas, que antes no se movían. Comprobado contra el servidor: **312 filas idénticas,
   entrada por entrada**, en los cuatro movimientos y en ráfaga.
2. **Etiquetar.** Poner, cambiar y quitar destacado van por `fetch`. No se fabrica marcado: la
   respuesta del guardado es la página del mismo PHP y se le copia lo que cambia. Ese repintado
   hace de deshacer. Con el filtro «Destacados» puesto, quitar una etiqueta saca la fila **y el
   filtro se queda**.
3. **Un fallo de numeración que ya existía:** el renumerado daba puesto a cualquier fila no
   retirada, con número o sin él. En «A la plancha» (13 con número, 1 sin) eso corría los tres
   números de detrás hasta recargar.
4. `E2E-DS-08` y `E2E-DS-04` pasan a esperar el repintado con `esperarA()` en vez de un plazo
   fijo: medían una recarga que ya no ocurre.

`admin-e2e` sobre esa rama: **535 entradas · 520 PASS · 14 FAIL**, idéntico entrada por entrada
al build sin tocar. Cero regresiones.

## Lo grande que está listo y NO integrado: el Design System 2026

Rama **`feature/admin-ds2026`** de este repositorio, **tres commits rebasados sobre `b92290c`**
(`2188c85`, `8bc1fac`, `8c1e834`). Diff contra `main`: **13 ficheros · 2.179 inserciones · 259
borrados**, con once documentos en `docs/design-system/`.

Lo que trae, además de la capa de tokens, la tipografía en `rem` y las once reglas muertas
retiradas de la ronda anterior:

- **La columna de orden.** Las flechas de mover categoría y las de mover plato tenían **14 px de
  desvío**, iguales a 320, 375, 768 y 1440 y en las cuarenta fichas. La causa era
  `.adm-cat-bento-lista{padding:0 14px}` —un valor fuera de la escala que sólo desplazaba la
  lista respecto de su cabecera—. A cero: **desvío 0 en los cuatro anchos y en las cuarenta**.
  Y devuelve 28 px de ancho al nombre del plato a 320: `E2E-OFR-01-320` **deja de fallar**.
- **El naranja como tinta.** Barriendo por color computado aparecieron seis usos por debajo del
  umbral en tema claro: barra móvil activa 2,25 · cámara encendida 2,65 (2,15 con el puntero) ·
  «A mano, uno a uno» 2,65 · ruta del alta 2,65 · «Obligatorio» 2,65 contra el 4,5 que le toca
  por ser texto · **y el anillo de foco 2,65 contra el 3:1 que 1.4.11 pide a un indicador de
  foco**. Se arregla con dos tokens derivados —`--sc-primary-grafico` (#D36316) y
  `--sc-primary-texto` (#A34F16)—, no retocando reglas sueltas. **En oscuro no se toca nada**:
  allí lo peor es 7,29.

Verificado sobre la rama ya rebasada: `fast` 37 PASS · `smoke` 17 PASS · `php -l` limpio · sin
marcadores de conflicto · `gen.mjs` compila (o sea, `motor.lock` cuadra) · a 1440 en claro,
desvío 0 en las 40 fichas, fila 48, cero desbordamiento, cámara encendida 3,72 · y los dos
arreglos de `b92290c` siguen vivos dentro (0 `location.reload`).

**Decisiones abiertas, que son del propietario:**

- **Las flechas de la cabecera**: 44×44 como están, con los bordes izquierdos ya alineados y los
  centros a 9 px, o bajarlas a 28×44 para alinear también los centros. Bajarlas cumple WCAG
  2.5.8 (24×24) pero se queda por debajo del 44 que el encargo prefiere.
- **El tema por defecto**: hoy oscuro fijo (`4095a46`). El punto 15 del encargo pide que manden
  los tokens y se prepare `prefers-color-scheme`. El arreglo estaba escrito y se retiró a
  propósito para no pisar esa decisión.
- **Los rótulos a 10 y 11 px** de la puerta del login, que contradicen el suelo de 12 px.
- **Fases 6 a 10** del encargo, sin empezar salvo la columna de orden. De la 8, la mitad **no
  existe** en el panel: tabla ordenable, paginación, acciones en lote, breadcrumb, drawer,
  skeletons, «sin resultados» y offline. Eso es producto nuevo, no normalización.
- **Los 14 `FAIL` de `admin-e2e`** son de tareas ajenas y están en el build sin tocar. Dos
  —`E2E-RH-SEM-01` y `E2E-OFR-02`— miden el diseño ANTERIOR de la ficha de oferta.

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
6. **Los componentes ocultos no se miden si no se abren.** Hay que montarlos a mano en un banco
   de pruebas: cuatro de los seis contrastes de arriba viven en pantallas cerradas.
7. **Un grep ingenuo confunde el CSS con una fuga de datos.** Acotar la búsqueda al marcado,
   quitando `<style>` y `<script>`.
8. **`gen.mjs` rechaza compilar si `index.php` o `SPEC.md` cambian sin refirmar `motor.lock`**:
   `node motor/lock.mjs --escribir` primero, siempre.
9. **La terminal del propietario es PowerShell**: `&&` no es separador válido, hay que usar `;`.
10. **Imports ESM con ruta absoluta de Windows necesitan `file:///`**.
11. **Al medir en el navegador, fijar SIEMPRE el viewport antes.** Sin fijarlo, `innerWidth` es
    0 y las cifras de alto y desbordamiento no significan nada.
12. **NUEVO — un heredoc puede comerse los `\\` dobles.** Una expresión regular entró en el
    código como `[^"\]`, que no compila, y **eso tira el bloque `<script>` entero**. No se veía
    en el diff ni en `php -l`: se veía en la consola del navegador. Después de aplicar un parche
    a mano, **mirar la consola antes de dar nada por bueno**.
13. **NUEVO — `motor/lock.mjs` no puede refirmar un `motor.lock` en conflicto**: lo parsea como
    JSON y revienta. En un rebase hay que resolver el conflicto primero (`git checkout --theirs
    motor.lock`) y refirmar después.
14. **OneDrive bloquea `.git/rebase-merge` y `.git/worktrees/`**: `git rebase --abort` deja el
    directorio puesto y git cree que sigue rebasando. Se borra con PowerShell. Siguen ahí
    `totm-main-commit` y `totm-main-commit2`, que hacen que git se queje en cada commit.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** y servir con `php -S 127.0.0.1:<puerto> -t <copia>
-d extension=gd -d extension=mbstring -d extension_dir=<ext de PHP de winget>`. **Nunca servir
`2-subir` directamente.** Para simular un cliente con color de marca propio: copiar
`estado-EJEMPLO.json` a `estado.json` en la copia y ponerle `marca.colorPrincipal`. Para móvil
de verdad, Playwright con `isMobile` y `hasTouch`, no el panel de la app.

El laboratorio (`4-laboratorio/`) ya **no hace falta**: su rama se trajo a este repositorio con
`git fetch <ruta-del-lab> <rama>:<rama>`. Se puede borrar cuando el Design System esté cerrado.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive; la clave conviene rotarla). `gh` conectado como `jorgegpuron`. Aviso por
voz para esperas largas: `SAPI.SpVoice` con «Microsoft Helena Desktop» por COM (`System.Speech`
falla con el dispositivo de audio); acepta SSML con `<pitch>` y `<rate>` pasando el flag `8`.
`.claude/launch.json` del workspace lleva entradas de vista previa que apuntan a copias
temporales de sesiones concretas: si no existen, se recrean o se borran.
