# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **12 sep 2026, noche** · **Producción lleva `18759d8`: la puerta nueva
> del login, el panel en oscuro por defecto y cuatro arreglos medidos del panel. El Design
> System 2026 del panel está construido pero NO integrado: vive en una copia de laboratorio.**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`)

- **`main` = `origin/main` = producción**, los tres en **`18759d8`** — build `1789239532932`,
  FTPS real, `Uploading: 0 B · Deleting: 0 B · Replacing: 1.56 MB`. Verificado desde fuera:
  `version.json` público, carta con ES/EN/DE, juego, 404 real, y el panel sin clave **no filtra
  nada** (0 botones `data-tab`, 0 filas de plato, 0 nombres de plato; sólo el formulario).
  `DESPLIEGUE_REAL` releída de GitHub al terminar: **`false`**.
- Lo que entró hoy, por dos manos distintas:
  - **La puerta del login** (`feature/login-bienvenida` y cuatro commits más): pantalla partida
    en oscuro fijo, campo sin caja con la línea de acento, favicon nuevo.
  - **`4095a46`**: el panel entra en **oscuro por defecto** (`var m = 'dark'`) y el botón de
    peligro pasa a rojo fijo `#C62828` con texto blanco (5,62:1 en los dos temas).
  - **`18759d8`**: cuatro arreglos del panel, ver abajo.
- Árbol limpio salvo `.ai/`, sin versionar. Ramas viejas sin borrar:
  `feature/carta-qr-escritorio`, `feature/login-bienvenida`, `feature/ofertas-una-linea`,
  `fix/login-puerta-titular-tipografia`, `fix/ofertas-dias-320`,
  `refactor/badge-vegano-sin-gluten`.

## Qué se hizo, y qué falta

**Los cuatro arreglos de `18759d8`**, cada uno medido antes y después:

1. Cambiar de tema **sin recargar** dejaba el fondo del tema anterior en los controles con
   `transition:background`, mientras el texto sí cambiaba. Con el panel entrando en oscuro, el
   primer gesto de quien lo quiera claro dejaba «Añadir plato» **carbón sobre carbón, ~1,05:1**,
   hasta recargar. Se apagan las transiciones durante el cambio (clase `adm-cambiando-tema`,
   reflujo forzado, y **dos** vías de retirada: con la pestaña en segundo plano el navegador no
   ejecuta `requestAnimationFrame` y la clase se quedaba puesta).
2. Seis sombras eran `color-mix` sobre `--sc-canvas`: en claro, **crema sobre crema, o sea
   ninguna sombra**. Entra una escala de tres niveles (`--e-1/-3/-4`) declarada por tema.
3. El anillo de foco tenía seis variantes y nueve reglas usaban **`--accent`, el color de marca
   del cliente**: un restaurante de marca pastel se queda sin foco visible. 42 reglas a un solo
   `--focus-anillo` con el color de producto.
4. «Quitar las fechas» medía 102×15, por debajo del mínimo 24×24 de WCAG 2.5.8. Halo `::before`
   sin media query: 102×24 de zona tocable sin mover el dibujo.

`admin-e2e` sobre la rama: **520 PASS · 14 FAIL**, y comparado **entrada por entrada** con el
informe del mismo build sin tocar: `diff` sin diferencias. Cero regresiones.

**Falta, y es lo grande: el Design System 2026 del panel NO está integrado.**

Está construido y probado en una **copia de laboratorio**:
`tinge_of_turmeric/4-laboratorio/tinge_of_turmeric/1-proyecto`, clon con `.git` propio y **sin
remoto**, rama `feature/admin-ds2026`, **nueve commits** rebasados sobre `91e48f5`.
Incluye diez documentos en `docs/design-system/` (auditoría medida, `DESIGN-SYSTEM-2026.md`,
FOUNDATIONS, TOKENS, COLORS, TYPOGRAPHY, LAYOUT, RESPONSIVE, COMPONENTS, ACCESSIBILITY y el
plan de las fases 4 y 11). Lo que tiene dentro: capa primitiva de color, escala de elevación,
token de foco, espaciado 4/8 completo, radios sin decimales, tipografía en `rem` con jerarquía
nombrada, nombre de plato a 16 sin crecer la fila, hover de fila, 22→15 anchuras de viewport y
once reglas muertas retiradas.

**Decisiones abiertas, que son del propietario:**

- **El tema por defecto.** Hoy es **oscuro fijo** por decisión de `4095a46`. El punto 15 del
  encargo del Design System pide que manden los tokens y que se prepare `prefers-color-scheme`.
  El arreglo estaba escrito y se **retiró a propósito** para no pisar esa decisión.
- **Los rótulos a 10 y 11 px** (once reglas) contradicen el suelo de 12 px que el propio panel
  declara. Es legibilidad para quien usa el panel: decide el propietario.
- **Fases 6 a 10** del encargo (layout, componentes base, componentes SaaS, formularios,
  estados) sin empezar. Y de la 8, la mitad **no existe** en el panel: tabla ordenable,
  paginación, acciones en lote, breadcrumb, avatar, drawer de escritorio, skeletons, estado de
  error de pantalla, «sin resultados» y offline. Eso es producto nuevo, no normalización.
- Los **14 `FAIL` de `admin-e2e`** son de tareas ajenas y están en el build sin tocar. Dos
  —`E2E-RH-SEM-01` y `E2E-OFR-02`— miden el diseño ANTERIOR de la ficha de oferta y no pueden
  cumplirse desde que se pidieron los días circulares.

## Trampas pagadas hoy

1. **Un `*/` dentro del texto de un comentario CSS cierra el comentario antes de tiempo** y se
   come las reglas que vienen detrás. Pasó con `--adm-*/--ui-*` escrito en una explicación: el
   fondo del `<body>` se quedó transparente y la página cambió de aspecto en sitios sin
   relación. Lo cazó comparar una huella de estilo y geometría de los 21.498 elementos contra el
   build sin tocar, no mirarlo.
2. **Un `var()` que apunta a un token declarado en un DESCENDIENTE no resuelve: la declaración
   entera se cae.** Los tokens de tipografía vivían dentro de `.card-main`, y `body` —que es su
   ancestro— usa `--tb` y el interlineado: 2.219 elementos perdieron su `line-height` de golpe.
   El tamaño de `body` se salvaba por casualidad. **Los tokens del sistema van en `:root`.**
3. **Contar reglas, selectores y `!important` no dice si una regla pinta algo.** Preguntando «¿a
   qué afecta esto?» con `querySelector` sobre el documento real aparecieron **once reglas
   muertas y dos breakpoints** que sólo las vestían (`.dt-bento`, `.dt-baldosa`, `.adm-4col`).
4. **Una transición puede quedarse pegada.** Al cambiar de tema, y también al arrancar: la
   flecha desactivada de la tira de secciones se queda a `opacity:1` con `disabled` puesto.
   Mismo mecanismo, mismo arreglo.
5. **Medir contraste tiene dos trampas**: `color(srgb r g b / a)` no se parsea como `rgb()` —sus
   componentes van de 0 a 1— y hay que **componer las capas translúcidas** antes de comparar.
   Con las dos mal, la auditoría dio tres fallos que no existían.
6. **Los componentes ocultos no se miden si no se abren.** El botón «Retirar» del cuadro
   destructivo llevaba quién sabe cuánto a 2,23:1 en oscuro porque ningún barrido abre el modal.
   Hay que montarlos a mano en un banco de pruebas.
7. **Un grep ingenuo confunde el CSS con una fuga de datos.** El panel sin clave trae 51
   apariciones de sus propias clases… todas dentro del `<style>`. Acotar la búsqueda al marcado.
8. **`gen.mjs` rechaza compilar si `index.php` o `SPEC.md` cambian sin refirmar `motor.lock`**:
   `node motor/lock.mjs --escribir` primero, siempre.
9. **La terminal del propietario es PowerShell**: `&&` no es separador válido, hay que usar `;`.
10. **Imports ESM con ruta absoluta de Windows necesitan `file:///`**.
11. **`git push` está bloqueado por el clasificador de permisos del entorno**, no por el
    protocolo. No hay regla de permisos en `settings.json`: o lo lanza el propietario, o se
    añade `"permissions": {"allow": ["Bash(git push origin main)"]}`.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** y servir con `php -S 127.0.0.1:<puerto> -t <copia>
-d extension=gd -d extension=mbstring -d extension_dir=<ext de PHP de winget>`. **Nunca servir
`2-subir` directamente.** Para simular un cliente con color de marca propio: copiar
`estado-EJEMPLO.json` a `estado.json` en la copia y ponerle `marca.colorPrincipal`. Para móvil
de verdad, Playwright con `isMobile` y `hasTouch`, no el panel de la app.

En el laboratorio, `qa/node_modules` es un **junction** al del repositorio real: si se mueve el
original, la batería del laboratorio deja de arrancar.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive; la clave conviene rotarla). `gh` conectado como `jorgegpuron`. Aviso por
voz para esperas largas: `SAPI.SpVoice` con «Microsoft Helena Desktop» por COM (`System.Speech`
falla con el dispositivo de audio); acepta SSML con `<pitch>` y `<rate>` pasando el flag `8`.
`.claude/launch.json` del workspace lleva entradas de vista previa que apuntan a copias
temporales de sesiones concretas: si no existen, se recrean o se borran.
