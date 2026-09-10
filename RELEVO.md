# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **10 sep 2026, noche** · **Siete cambios en producción en un día, tres
> sesiones de Claude sobre un solo árbol, la batería `full` limpia y nada pendiente de confirmar.**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`)

- **`main` = `origin/main` = el commit que lleva este RELEVO**, encima de **`0c1eada`**, que es lo
  que **sirve producción** (build `1789077974161`, run 34535710843, FTPS real, «Deleting 0 B»,
  verificado desde fuera: `version.json`, carta, juego, panel con login, 404). El RELEVO no se
  sirve. `DESPLIEGUE_REAL` está en `false`.
- Lo que entró hoy, en orden, cada paso con orden expresa del propietario en el chat de la
  sesión que lo hizo: `8466389` el movimiento del panel (ocho ajustes) · `2389f41` responsive
  R1/R2 · `7e1ab56` la fila de Platos en columnas fijas en tablet, con menú «⋯» · `3800774`
  dos esperas fijas de QA · `8d183a1` responsive R3/R4, KPI a cuatro columnas en tablet y la
  nota fiscal a 12 px · `53c853a` **la fila de Platos en móvil en dos líneas** (nombre hasta
  dos líneas, cabecera de categoría en una y pegada con `overflow:clip`, fila de 88/98 frente a
  105) · `0c1eada` **el suelo tipográfico de la carta a 12 px** (etiquetas y marca de agotado)
  con la prueba `CAR-23`, que fabrica el caso y no puede pasar en vacío.
- Última `full` completa, sobre `0c1eada`: **731 PASS · 0 FAIL · 2 BLOCKED aprobados (MC-32,
  MC-33) · 3 NO APLICA · 4 KNOWN OPEN · 0 UNEXPECTED**.
- Árbol limpio. Queda la rama local `fix/item-tag-12px` (integrada; se borra con OK) y las diez
  ramas antiguas `feature/*`, `fix/*`, todas sin commits que `main` no tenga.
- `motor.lock` cuadra. `2-subir` es un build local de `0c1eada` (otro sello que el de producción:
  el runner compila el suyo; contenido idéntico).

## Qué se hizo, y qué falta

Medidas y razones en **`motor/server/admin/SPEC.md`** (movimiento, responsive R1-R4, rejilla de
tablet, fila de móvil) y en el **`SPEC.md` de la raíz** (suelo de 12 px de la carta, nota fiscal).
Los planes de movimiento y su herramienta viven en `tinge_of_turmeric/plans/`, fuera del repo.

**Falta (nada bloquea; cada cosa pide su orden):**

- **El clon de QA no se parece a producción en los estados que importan** (sin platos con
  etiqueta, sin agotados): causa raíz de que tres veces hoy se afirmara «éste es el único caso»
  y hubiera otro. Poblarlo con esos estados. Un `SPAN.i18n @11px` visto una vez y no reproducido
  saldrá por `CAR-23` con nombre y ancestros si vuelve.
- Auditoría móvil del panel (13/20, en el temporal de la sesión coordinadora): contraste no
  textual (botón de peligro, anillo de foco, pista del interruptor), `viewport-fit=cover`,
  `<main>`, tira de secciones de un chip por página, sheet «Más» (75vh, sin bloqueo de scroll).
- Anchos táctiles del panel por debajo de 44 (cada uno con su tope medido en SPEC); el
  `white-space:nowrap` de la etiqueta de la carta se sale a 320 desde ~19 caracteres (Tinge
  llega a 16); seis esperas fijas más en `admin-e2e.mjs`; CSS sin marcado (`.tabs*`, `.switch*`,
  `.foto-btn`, `.combo*`, `.marca`); hallazgos LOW de movimiento en `plans/README.md`.

## Trampas pagadas hoy

1. **Tres sesiones sobre UN árbol.** Una implementa, las otras sólo leen; integrar moviendo la
   referencia (`git fetch . rama:main`) si hay batería corriendo; cada sesión exige la orden del
   propietario **en su propio chat** (un aviso transmitido por otra sesión no vale, y está bien).
2. **Editar un fichero con finales de línea mixtos (`motor/gen.mjs`) en modo texto lo normaliza
   a LF**: 8.496 líneas de diff falso que `git diff --check` no ve. Escribir en binario y
   comprobar con `git ls-files --eol` y `git diff --ignore-all-space --stat`.
3. **«Éste es el único caso» medido sobre un estado que no contiene el caso.** La prueba tiene
   que fabricar el caso y fallar si la muestra está vacía (`CAR-23`).
4. **OneDrive hace desaparecer ficheros de `2-subir` un instante durante la batería**
   (`FAST-13` rojo con `version.json` intacto). Repetir la pasada antes de creerlo.
5. **Una prueba con espera fija o con igualdad exacta caduca sola.** Medir cuando pasa algo
   (`esperarA()`, `getAnimations().finished`) y afirmar suelos, no valores declarados.
6. **Filas de dos líneas: los halos táctiles de la línea 1 se comen los de la 2** con 6 px de
   hueco; hacen falta 12. Y la cabecera pegada no funciona con `overflow:hidden`, sólo con `clip`.
7. **El panel «Browser» de la app congela animaciones si está oculto**; `php -S` muere si se
   borra su raíz; el build quita los comentarios CSS de `index.php` (anclar por código).

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** y servir con `php -S 127.0.0.1:<puerto> -t <copia>
-d extension=gd -d extension=mbstring` (más `-d extension_dir=<ext de PHP>` con el PHP de winget).
**Nunca servir `2-subir` directamente.** Receta completa en `plans/README.md`. Para móvil de
verdad, Playwright con `isMobile` y `hasTouch`, no el panel de la app.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive; la clave conviene rotarla). `gh` conectado como `jorgegpuron`.
`.claude/launch.json` del workspace lleva entradas de vista previa (`tinge-admin-base`, `-planes`,
`-tablet`, `-old`, `-movil`) que apuntan a copias temporales de sesiones concretas: si no
existen, se recrean o se borran. Aviso por voz para esperas largas: `SAPI.SpVoice` con la voz
«Microsoft Helena Desktop» (por COM; `System.Speech` falla con el dispositivo de audio).
