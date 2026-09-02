# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **2 sep 2026** · build publicado `1788352026761`

---

## Dónde estamos

`main` sincronizado con `origin/main` (`28cb0ba`). Motor **1.1.7**, esquemas `carta/2` /
`estado 2`.

La carta está publicada y verificada en <https://socialcard.es/tinge_of_turmeric/menu2/>.
`DESPLIEGUE_REAL = false` (se activa solo durante un despliegue y se devuelve al instante).

---

## Qué se hizo en la última sesión

**Migración multicliente, fases 1 a 6** (`git log 4d3ee71..f2178f4`, seis commits
`feat(fase-N)`/`refactor`, el último cierra las rutas de migración). Motor separado del
cliente, `generado/` para los derivados volátiles, matriz de actualización y migración:
documentado en `SPEC.md`.

**Instalado el protocolo permanente `/nueva-funcion` y `/nuevo-cliente`**, versionado en
`.claude/skills/` del propio repo (y con router en el workspace): diseño → allowlist →
implementación → auditoría → commit → push seguro → producción, cada paso con autorización
propia. Playwright MCP también quedó versionado (`.mcp.json`) para auditorías con navegador
real.

**Feature nueva: banner publicitario en la carta**, diseñada, implementada y desplegada por
fases:
- Hueco entre la tarjeta del juego y la nota de Google, independiente del juego, solo en
  móvil, con proporción **1120×480** responsive (no una altura fija).
- Panel: pestaña Publicidad — subir/reemplazar/quitar, URL, fechas, `rel=sponsored`.
- Última vuelta: la creatividad debe medir **exactamente 1120×480 px** (ni un mínimo, ni la
  proporción, exacto), validado en backend antes de escribir nada en disco; límite 2 MiB con
  fuente única; texto del panel corregido para dejar de anunciar los 180 px fijos de una
  versión anterior.
- **Desplegado en producción**: commit `28cb0ba`, run `33629967021` → success, build público
  `1788352026761`, 0 borrados. Verificado con Playwright MCP: banner móvil intacto (creatividad
  ya publicada sigue funcionando), escritorio sin hueco ni petición, consola/red limpias.

---

## Qué queda pendiente

1. **El interior del panel, autenticado, sigue sin poder auditarse**: introducir la
   contraseña real es lo único que el asistente no hace. Esta sesión no pudo confirmar en
   pantalla, ya en producción, el texto «Tamaño obligatorio: 1120 × 480 px» — sí se verificó
   en local con Playwright MCP antes de desplegar.
2. **Comentario desactualizado en `motor/gen.mjs` (líneas ~1645-1648)**: sigue diciendo «el
   alto es contrato: 180px», de antes de que la altura del banner se hiciera responsive.
   Detectado y reportado dos veces, no corregido aún porque `gen.mjs` quedó fuera de la
   allowlist de esos dos fixes. Es solo un comentario, sin efecto en CSS ni comportamiento.
3. No hay bebidas ni postres y nada se lo dice al comensal.
4. El pie termina en el anuncio del proveedor. Decisión tomada y consciente — se queda.

**No son pendientes.** Los 63 platos con el mismo nombre y distinto precio según pestaña son
a propósito. El error rojo de consola cuando `estado.json` da 500 no tiene arreglo posible.
Razonadas en `SPEC.md`.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **El PHP local (winget) quedó sin `php.ini` tras una actualización**, y por tanto sin
  `mbstring` — rompe el panel en un `mb_strtolower` normal del buscador. Servidor de pruebas:
  añadir `-d extension_dir=<ruta>\ext -d extension=mbstring` (y `-d upload_max_filesize=8M
  -d post_max_size=9M` si se prueban subidas grandes).
- **Playwright MCP con la MISMA pestaña reutilizada y redimensionada muchas veces da una
  selección de `srcset` incorrecta** (se queda pegado al candidato más grande que esa pestaña
  haya necesitado alguna vez). Para medir responsive de verdad: pestaña nueva, tamaño fijado
  ANTES de navegar, nunca redimensionar una página ya cargada.
- **`is_writable()` da un falso negativo intermitente en esta carpeta de OneDrive** cuando la
  crea otro proceso. Si el panel dice que no puede escribir en `assets/publicidad/` sin motivo
  aparente, reintentar antes de sospechar del código.
- **Clonar el repo dentro de rutas largas de `scratchpad` rompe en Windows** (`Filename too
  long` en objetos de git). Usar una ruta corta, p. ej. `/tmp/xxx`.
- **`node gen.mjs` con `EPERM` sobre `2-subir`**: es el servidor local. Parar → compilar →
  arrancar. El lanzador está en la raíz del repo, `.claude\servidor.cmd`, **no** dentro de
  `tinge_of_turmeric/`.
- **`gen.mjs` borra `2-subir` entera**, y con ella `estado.json`, `assets/hero/` y
  `assets/publicidad/`. Resembrar antes de dar por roto un fallo de suite.
- **`gh run list` sin filtrar devuelve el despliegue ANTERIOR** durante los primeros segundos.
  Coger el `databaseId` cuyo `headSha` sea el del commit recién empujado.
- **Las pruebas ancladas a un reloj de pared mienten.** Anclar a un estado, no a un tiempo.

---

## Cómo ponerse al día en dos minutos

```
Continúo el trabajo en la carta de Tinge desde el otro PC. Lee 1-proyecto/RELEVO.md,
los últimos commits y el final de SPEC.md, y dime qué encuentras antes de tocar nada.
```

Y la regla que no se salta: **un ordenador a la vez.** El `.git` vive dentro de OneDrive; con
los dos tocándolo se corrompe, y cada push publica en la carta de un cliente real. Antes de
cambiar de máquina: terminar, hacer push, esperar al ✓ de OneDrive.
