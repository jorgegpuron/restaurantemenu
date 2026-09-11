# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **11 sep 2026, tarde** · **Los días de Ofertas ya caben a 320px,
> desplegado y verificado en producción. Dos pruebas quedan documentadas en tensión con el
> diseño nuevo, a la espera de que alguien las actualice.**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`)

- **`main` = `origin/main` = producción**, los tres en **`f5700ea`** — build `1789147237565`,
  FTPS real, `Uploading: 0 B · Deleting: 0 B · Replacing: 1.6 MB`, verificado desde fuera:
  `version.json`, carta, ES/EN/DE, juego, panel con login (no filtra nada sin clave), 404 real.
  `DESPLIEGUE_REAL` en `false`.
- Lo que entró hoy: siete commits de sesiones anteriores (movimiento del panel, responsive
  R1-R4, rejilla de tablet, fila de móvil, suelo tipográfico a 12px, alineación de destacados y
  días circulares) y, al cierre de esta sesión, **`f5700ea` fix: los días de Ofertas caben a
  320px** — ver «Qué se hizo» abajo.
- Árbol limpio salvo `.ai/`, sin versionar: relevo entre agentes de la sesión de hoy (Codex +
  Claude Code en el otro ordenador). No es del producto; se queda hasta que se decida borrarlo.
- Queda la rama `fix/ofertas-dias-320` sin borrar (ya integrada en `main` por fast-forward): no
  se borró por no tener un OK expreso para eso en concreto.

## Qué se hizo, y qué falta

Al abrir la sesión había un cambio **sin commit** en `main` mismo (sin rama): un encargo del
propietario a Codex —el wrapper de Claude Code falló ahí con `Connection refused`— para
arreglar la ficha «La oferta» (bloque Descuento montándose, días que debían ser círculos en una
sola fila). Codex lo dejó funcionando en apariencia pero con **CSS apilado en vez de corregido
en el origen**, con dos defectos reales: un bloque `@media(901px)` duplicado dos veces
verbatim, y los siete días con diámetro **fijo** de 36px — cabía de sobra en tablet/escritorio
pero desbordaba la ficha 18px a 320px (`E2E-OFR-01-320`, y ese desborde de página arrastraba
otras 16 pruebas no relacionadas).

Se pasó por `nueva-funcion` completo: DISEÑO → IMPLEMENTACIÓN → AUDITORÍA → COMMIT →
INTEGRACIÓN → PUSH SEGURO/ensayo → PRODUCCIÓN → CERRADA, con autorización expresa del
propietario en cada compuerta. La corrección mantiene el círculo pedido pero con diámetro
**elástico** (`flex:1 1 0; max-width:40px; aspect-ratio:1`, tope igualado a la altura de
«Semanal»): cabe en cualquier ancho por construcción. Medidas y razones completas en
`motor/server/admin/SPEC.md`, sección «Los días vuelven a ser círculos, pero con diámetro
elástico».

**Falta, con dueño distinto de esta tarea:**

- **`E2E-OFR-02` (diasPegados) y `E2E-RH-SEM-01` (filaPropia) miden el diseño ANTERIOR**
  (segmentado que se toca borde con borde, Semanal siempre debajo de los días). Con círculos
  separados y días+Semanal en la misma línea en escritorio —las dos cosas pedidas hoy por el
  propietario— esas dos aserciones ya no pueden cumplirse por definición, no por descuido.
  Actualizarlas toca `qa/suites/admin-e2e.mjs`, fuera de la allowlist de hoy: tarea aparte, con
  su propia autorización.
- **Dos fallos ajenos a esta tarea**, de commits de hoy anteriores a `84dcaca` (grids/iconos de
  categorías, objetivos táctiles): `E2E-OFR-01-320` con el nombre del plato suelto a 86px
  (exige 108) y `E2E-OFR-04-320/390` con objetivos táctiles insuficientes en los filtros de
  «Platos sueltos». Ninguno de los dos toca `.adm-dia`; no se tocaron hoy.
- Lo ya conocido de sesiones previas sigue igual: clon de QA sin estados con etiqueta/agotados,
  auditoría móvil del panel (13/20), anchos táctiles bajo 44, seis esperas fijas más en
  `admin-e2e.mjs`, CSS sin marcar (`.tabs*`, `.switch*`, `.foto-btn`, `.combo*`, `.marca`).

## Trampas pagadas hoy

1. **`DESPLIEGUE_REAL` estaba en `true` al llegar** —de un despliegue manual anterior de la
   misma sesión de hoy, no de esta tarea—. El protocolo obliga a comprobarlo SIEMPRE antes de
   empujar y nunca asumir `false`; si no lo está, parar y pedir instrucciones antes de tocarla.
2. **«El último `@media` gana siempre» es una simplificación falsa.** Un mismo selector de días
   estaba definido en tres sitios del fichero con especificidades distintas (una con
   `.adm-regla >` de más, dos sin ella) y un bloque duplicado verbatim de otro. Reconstruir la
   cascada a mano llevó a una conclusión equivocada dos veces; lo que la sacó de dudas fue medir
   `getComputedStyle` en un navegador real, con y sin las reglas sospechosas.
3. **El mismo bloque de días existe DOS VECES**: una vez sin condición y otra dentro de
   `<?php if ($colorPrincipalOverride !== null): ?>` —el camino de CSS que se activa cuando el
   restaurante tiene un color de marca guardado en el panel—. Un cliente con ese override activo
   corre una hoja de estilos distinta; probar solo el estado por defecto no basta.
4. **Un cambio de Codex puede ser una petición legítima del propietario, no un capricho.**
   `84dcaca` (el commit de partida de hoy) ya pedía «días circulares» explícitamente, y
   `.ai/CLAUDE_MISSION.txt` lo repetía. La primera propuesta de diseño de esta sesión iba a
   deshacer eso sin darse cuenta; se corrigió a tiempo preguntando, no asumiendo.
5. **`gen.mjs` rechaza compilar si `index.php` o `SPEC.md` cambian sin refirmar `motor.lock`
   antes**: `node motor/lock.mjs --escribir` primero, siempre.
6. **Imports ESM con ruta absoluta de Windows necesitan `file:///`**, no la ruta pelada
   (`C:/...` a secas falla con `ERR_UNSUPPORTED_ESM_URL_SCHEME`).

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** y servir con `php -S 127.0.0.1:<puerto> -t <copia>
-d extension=gd -d extension=mbstring -d extension_dir=<ext de PHP de winget>`. **Nunca servir
`2-subir` directamente.** Para simular un cliente con color de marca propio: copiar
`estado-EJEMPLO.json` a `estado.json` en la copia y ponerle `marca.colorPrincipal`. Para móvil
de verdad, Playwright con `isMobile` y `hasTouch`, no el panel de la app.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive; la clave conviene rotarla). `gh` conectado como `jorgegpuron`.
`.claude/launch.json` del workspace lleva entradas de vista previa que apuntan a copias
temporales de sesiones concretas: si no existen, se recrean o se borran. Aviso por voz para
esperas largas: `SAPI.SpVoice` con la voz «Microsoft Helena Desktop» (por COM; `System.Speech`
falla con el dispositivo de audio).
