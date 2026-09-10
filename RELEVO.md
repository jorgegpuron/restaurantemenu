# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **10 sep 2026** · **El movimiento del panel está en producción. Queda
> por confirmar una rama pequeña de QA (tres pruebas que medían con supuestos viejos).**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`)

- **`main` = `origin/main` = `8466389`** («refactor(admin): el movimiento del panel, ocho
  ajustes»), integrado con avance rápido sobre `444d4df` (PR #3, tema y flechas). **Producción
  sirve ese commit**: build `1789032685309`, desplegado hoy con `workflow_dispatch` (run
  34461090323, FTPS real, «Replacing 1.62 MB», datos del panel excluidos) y verificado desde
  fuera (`version.json`, carta, juego, panel con login, 404). `DESPLIEGUE_REAL` está en `false`.
- Rama **`fix/qa-medidas-movimiento`** (desde `8466389`), **sin confirmar**: sólo
  `qa/suites/admin-e2e.mjs`. Corrige las tres pruebas que `full` dio en rojo tras el
  refactor —no era el producto, era la medida—: `E2E-RH-NAV-320-ir` y `-390-ir` esperaban
  220 ms fijos y la hoja «Más» ahora entra en 340 (se espera a `getAnimations().finished`);
  `E2E-UX-SESION-01` leía `style.width` y la barra se mueve ya con `transform` (se lee el
  objetivo del `translateX`, con `width` de respaldo). Este RELEVO va en esa misma rama.
- Rama local `refactor/movimiento-panel` (= `8466389`): ya integrada, se borra sólo con OK.
- Última `full` completa sobre `8466389`: **709 PASS · 3 FAIL (los tres de arriba) · 2 BLOCKED
  aprobados (MC-32, MC-33) · 0 UNEXPECTED**, 19 min. Tras el arreglo, `npm --prefix qa run e2e` sobre esta rama: **506 PASS · 0 FAIL · 0 BLOCKED · 1 NO APLICA · 1 KNOWN OPEN**, con las tres en verde.
- `motor.lock` cuadra (v1.1.8). `2-subir` es el build de `8466389`.

## Qué se hizo, y qué falta

Todo está en **`motor/server/admin/SPEC.md`**, sección «El movimiento del panel, ocho
ajustes». En una línea: barra de sesión con `transform`; «menos movimiento» sin comodín;
hoja «Más» con `--ease-drawer` 340/240; salida animada de hoja de alta, sección y modal
(`--t-modal-in` 220, `--t-modal-out` 140); FLIP en la pila de avisos; FLIP de reordenar que
aguanta la ráfaga; plegado instantáneo y tooltip del riel sólo con puntero fino; pulsación con
transición en todos los controles y literales al token.

Los planes, la auditoría y la herramienta que los aplica sobre una copia de `2-subir` viven en
**`tinge_of_turmeric/plans/`**, fuera del repo a propósito (`README.md` de esa carpeta).
Allí quedan también los hallazgos LOW sin plan y el CSS muerto detectado (`.tabs*`, `.switch*`,
`.foto-btn`, `.combo*`, `.marca`): retirarlo es tarea aparte, con prueba.

**Falta:** confirmar e integrar `fix/qa-medidas-movimiento` (orden expresa) y borrar las dos
ramas locales.

## Trampas pagadas en esta sesión

1. **El panel «Browser» de la app congela animaciones y `requestAnimationFrame` cuando está
   oculto** (`document.visibilityState === 'hidden'`): cualquier lectura de tiempos sale
   falseada. Lo que dependa de un fotograma se comprueba con Playwright (página visible).
2. **`php -S` de la vista previa muere si se borra su carpeta raíz** y también tras horas de
   pausa: antes de medir, `preview_logs`/reiniciar.
3. **El build quita los comentarios CSS de `index.php`**: los anclajes de texto para editar la
   copia compilada han de ser líneas de código, nunca comentarios. Los planes citan código.
4. **Una prueba con espera fija es una prueba con fecha de caducidad**: al alargar una
   animación, medir «cuando termina» (`getAnimations().finished`), no «a los N ms».
5. **`git switch` revierte ficheros en disco aunque el contenido acabe igual**: con `full`
   corriendo, integrar moviendo la referencia (`git fetch . rama:main`) y cambiar de rama al
   terminar. La batería marca como fallo cualquier fichero editado mientras corre.

## Servidor de revisión

Sigue sin vivir en el repositorio. La forma de hoy: copiar `2-subir` al temporal, poner
`define('DEMO_SIN_CLAVE', true)` en `admin/config.php` **de la copia** (entra sin contraseña y
sin escribir `clave.php`) y servir con `php -S 127.0.0.1:<puerto> -t <copia> -d extension=gd
-d extension=mbstring` (más `-d extension_dir=<ext de PHP>` con el PHP de winget). En demo la
cuenta atrás de sesión no arranca; para verla, «Poner contraseña» desde el aviso rojo de la
copia. **Nunca servir `2-subir` directamente.** Receta completa en `plans/README.md`.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive: en la otra máquina hay que volver a añadirlo; la clave conviene rotarla).
`gh` conectado como `jorgegpuron`. `.claude/launch.json` del workspace lleva, además de
`carta-tinge`, dos entradas (`tinge-admin-base`, `tinge-admin-planes`) que apuntan a copias
temporales de una sesión concreta: si no existen, se recrean o se borran.
