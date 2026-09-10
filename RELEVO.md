# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **10 sep 2026, tarde** · **Cuatro cambios del panel en producción en un
> día, la batería `full` limpia por primera vez, y nada pendiente de confirmar.**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`)

- **`main` = `origin/main` = el commit que lleva este RELEVO**, encima de **`3800774`**, que es lo
  que **sirve producción** (build `1789050596131`, run 34489435584, FTPS real, «Deleting 0 B»,
  verificado desde fuera: `version.json`, carta, juego, panel con login, 404). Ese commit
  y el RELEVO son la única diferencia con producción, y el RELEVO no se sirve.
  `DESPLIEGUE_REAL` está en `false`.
- Lo que entró hoy, en orden, cada paso con orden expresa del propietario:
  `8466389` el movimiento del panel (ocho ajustes) · `2389f41` la fila de plato entre 404 y
  460 px y diez áreas táctiles · `7e1ab56` la fila de Platos en columnas fijas con menú «⋯» con
  dedo · `3800774` dos pruebas de QA que esperaban 600 ms fijos.
- Última `full` completa, sobre ese mismo contenido: **722 PASS · 0 FAIL · 2 BLOCKED aprobados
  (MC-32, MC-33) · 3 NO APLICA · 4 KNOWN OPEN · 0 UNEXPECTED**. `e2e`: 516 PASS · 0 FAIL.
- Árbol limpio. Ramas de hoy borradas (todas integradas). Quedan las once ramas antiguas
  (`feature/*`, `fix/*`), todas sin commits que `main` no tenga; se borran sólo con OK.
- `motor.lock` cuadra. `2-subir` es el build de `3800774`.

## Qué se hizo, y qué falta

Todo con sus medidas en **`motor/server/admin/SPEC.md`**, últimas cuatro secciones: «El movimiento
del panel, ocho ajustes», «Responsive R1 y R2», «La fila de Platos como rejilla» y la nota de QA.
Los planes de movimiento, su auditoría y la herramienta que los aplica sobre una copia viven en
**`tinge_of_turmeric/plans/`**, fuera del repo (`README.md` de esa carpeta).

**Falta (nada bloquea; cada cosa pide su orden):**

- Responsive R3/R4: medir contra la fila nueva (rejilla), no contra la de antes; controles a
  44×44 de verdad, flechas fuera del recorte de la tira de secciones, nombre del plato a 30 px
  en escritorio con viewport 1000 (anotado en SPEC, sin tocar).
- Seis esperas fijas más en `qa/suites/admin-e2e.mjs` (`E2E-JU-01`, `E2E-RH-OFF-04`, líneas
  ~815, 2890, 2917, 3293): hoy pasan; misma familia que el fix de hoy, cambio a `esperarA()`.
- CSS sin marcado en el panel (`.tabs*`, `.switch*`, `.foto-btn`, `.combo*`, `.marca`): retirar
  con prueba, no con sospecha. Y los hallazgos LOW de movimiento sin plan, en `plans/README.md`.

## Trampas pagadas hoy

1. **Tres sesiones de Claude sobre UN solo árbol de trabajo.** Se pisan si dos tocan `git` o
   ficheros a la vez. Lo que funcionó: una implementa, las otras sólo leen; integrar moviendo la
   referencia (`git fetch . rama:main`) cuando hay una batería corriendo; y cada sesión exige la
   orden del propietario **en su propio chat** —un aviso transmitido por otra sesión no vale como
   autorización, y está bien que no valga.
2. **Una prueba con espera fija caduca sola.** Al alargar la hoja «Más» a 340 ms y mover la
   barra de sesión con `transform`, tres pruebas dejaron de medir lo que creían. Medir cuando
   pasa algo (`esperarA()`, `getAnimations().finished`), nunca a los N ms.
3. **El panel «Browser» de la app congela animaciones y `requestAnimationFrame` si está oculto**
   (`visibilityState === 'hidden'`). Lo que dependa de un fotograma se comprueba con Playwright.
4. **`php -S` de la vista previa muere si se borra su carpeta raíz** y tras horas de pausa.
5. **El build quita los comentarios CSS de `index.php`**: para editar la copia compilada, anclar
   por líneas de código, nunca por comentarios.
6. **Un `RELEVO` que se describe a sí mismo se queda viejo al confirmarse.** Hablar de «el
   commit que lleva este RELEVO», no de un hash que aún no existe.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** (entra sin contraseña y sin escribir `clave.php`) y servir
con `php -S 127.0.0.1:<puerto> -t <copia> -d extension=gd -d extension=mbstring` (más
`-d extension_dir=<ext de PHP>` con el PHP de winget). En demo la cuenta atrás de sesión no
arranca; para verla, «Poner contraseña» desde el aviso rojo de la copia. **Nunca servir `2-subir`
directamente.** Receta completa en `plans/README.md`.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive: en la otra máquina hay que volver a añadirlo; la clave conviene rotarla).
`gh` conectado como `jorgegpuron`. `.claude/launch.json` del workspace lleva, además de
`carta-tinge`, entradas de vista previa (`tinge-admin-base`, `tinge-admin-planes`,
`tinge-admin-tablet`) que apuntan a copias temporales de sesiones concretas: si no existen, se
recrean o se borran. Aviso por voz para esperas largas: `SAPI.SpVoice` con la voz «Microsoft
Helena Desktop» (`System.Speech` falla a veces con el dispositivo de audio; SAPI por COM no).
