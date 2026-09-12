# Tinge Admin Design System 2026

**La fuente oficial para cualquier desarrollo futuro del ADMIN.** Si algo de aquí choca con lo
que hay en el código, gana este documento y el código se corrige; si algo de aquí está mal, se
corrige aquí primero y después el código. No se resuelve en silencio en una hoja de estilos.

- Ámbito: **sólo el panel** (`motor/server/admin/`). La carta pública tiene su propio sistema y
  no se toca desde aquí.
- Referencia de arquitectura: Atlassian Design System —jerarquía, capas de token, estados,
  accesibilidad—. **No** de identidad visual: la identidad es Tinge.
- Punto de partida medido: [DESIGN-SYSTEM-AUDIT.md](DESIGN-SYSTEM-AUDIT.md).

| Documento | Qué resuelve |
|---|---|
| [FOUNDATIONS.md](FOUNDATIONS.md) | Las tres capas, y la regla de qué puede usar cada quien |
| [TOKENS.md](TOKENS.md) | El catálogo completo, con su valor y su dueño |
| [COLORS.md](COLORS.md) | Paleta, temas claro y oscuro, estados |
| [TYPOGRAPHY.md](TYPOGRAPHY.md) | Jerarquía cerrada, tamaños, pesos, uso |
| [LAYOUT.md](LAYOUT.md) | Shell, rejilla, densidad, espaciado |
| [RESPONSIVE.md](RESPONSIVE.md) | Breakpoints y comportamiento por ancho |
| [COMPONENTS.md](COMPONENTS.md) | Inventario, estados obligatorios, lo que falta |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | WCAG 2.2 AA: qué se cumple, qué se mide, qué se excepciona |

---

## 1. El principio del que cuelga todo

> **El panel es producto de SocialCard. La carta es del restaurante.**

`restaurantemenu` es un motor multicliente. El panel que administra la carta de Tinge es
**exactamente el mismo** que administrará la del restaurante siguiente: mismo shell, mismos
botones, mismos colores de producto. Lo único que cambia por cliente son los datos y la marca
que aparece **dentro** de la carta.

De ahí salen dos reglas que no se negocian:

1. **El color de producto es `--sc-primary`.** El color de marca del cliente es `--accent`, vive
   en `cliente.mjs`, se edita en la pestaña Marca y viaja a la carta pública. Un componente del
   panel que se pinte con `--accent` cambia de aspecto según el restaurante, y eso ya ha dado
   un fallo real: el anillo de foco iba en `--accent` en doce reglas, de modo que un cliente con
   marca pastel se quedaba sin foco visible.
2. **Comportamiento al motor, dato al cliente.** Ninguna regla de este sistema puede depender de
   que el restaurante se llame Tinge, tenga 312 platos o trabaje en Canarias.

## 2. Las tres capas

```
    primitiva            semantica              componente
    --c-n-850            --sc-surface           .adm-btn { background: var(--sc-surface) }
    "este carbon"        "la superficie"        "el boton usa la superficie"
```

- **Primitiva (`--c-`)**: un color con nombre, sin significado. No cambia entre temas.
- **Semántica (`--sc-`, `--e-`, `--focus-`, `--space-`, `--radius-`, `--t`)**: qué papel juega.
  **Es la única capa que cambia entre claro y oscuro.**
- **Componente**: consume semánticas. **Nunca** escribe un hex, **nunca** referencia una
  primitiva, **nunca** inventa un valor que ya tenga token.

La regla operativa, para no pensarlo cada vez:

| Si estás escribiendo… | Usa |
|---|---|
| un color | `var(--sc-…)` |
| un hueco, un relleno, un margen | `var(--space-…)` |
| una esquina | `var(--radius-…)` |
| un tamaño de letra | `var(--t0…--t4)` / `var(--tb)` |
| una sombra | `var(--e-1/3/4)` o `var(--sc-sombra-…)` |
| un foco | `outline:var(--focus-anillo)` |

## 3. Qué se ha hecho ya, y qué queda

**Implementado y verificado en el laboratorio** (copia `4-laboratorio`, rama
`feature/admin-ds2026`, sin remoto):

| Fase | Estado |
|---|---|
| 1 · Auditoría | **hecha**, medida en navegador |
| 2 · Foundations | **hecha**: capa primitiva de 29 colores; los 24 semánticos la referencian |
| 3 · Tokens | **hecha en color, elevación, foco, radio y espaciado**; queda migrar consumidores |
| 4 · Tipografía | **escala a `rem` y jerarquía nombrada**; queda resolver los 15 px fuera de escala |
| 5 · Color / claro / oscuro | **hecha**, más `prefers-color-scheme` y el fallo de transición |
| 6 · Layout | pendiente |
| 7-8 · Componentes | pendiente |
| 9 · Formularios | pendiente |
| 10 · Estados | pendiente (y parte no existe: ver COMPONENTS.md) |
| 11 · Responsive | auditado, 0 desbordes; normalización de breakpoints pendiente |
| 12 · WCAG 2.2 AA | **4 defectos reales corregidos**; el resto ya cumplía |
| 13 · Limpieza CSS | parcial |
| 14 · QA | `fast` y `smoke` verdes en cada paso |
| 15 · Documentación | **este juego de documentos** |

**Defectos reales corregidos** (los cuatro, medidos antes y después):

1. Cambiar de tema sin recargar dejaba el fondo del tema anterior en los controles con
   `transition:background`: «Añadir plato» quedaba a **1,13:1**. Causa aislada (la transición),
   arreglo: apagar transiciones durante el cambio.
2. Seis sombras escritas como `color-mix(… var(--sc-canvas) …)` eran **crema sobre crema** en
   claro — es decir, ninguna sombra. Toast, modal, hoja de alta y popover no se despegaban.
3. El botón «Retirar» del cuadro de confirmación destructiva iba a **2,23:1 en oscuro** (blanco
   sobre rojo claro). Ahora tinta carbón, 8,43:1.
4. El panel entraba siempre en claro aunque el sistema estuviera en oscuro.

## 4. La regla para todo lo que venga después

**Ninguna pantalla ni componente nuevo del panel puede introducir** un color, un espaciado, un
tamaño de letra, un radio o una sombra que no esté en este sistema. Antes de crear algo:

1. ¿Existe ya el componente? Úsalo.
2. ¿Existe el token? Úsalo.
3. ¿No existe y hace falta? **Se añade al sistema primero**, con su razón escrita, y después se
   usa. Un valor suelto «por esta vez» es exactamente cómo se llegó a tener cuatro escalas de
   espaciado.

Y dos cosas del entorno que no son opcionales:

- Tocar `index.php` obliga a `node motor/lock.mjs --escribir` antes de compilar, o `gen.mjs`
  aborta.
- Superficie nueva en el panel obliga a inventariarla en `qa/inventario.json`, o `INV-01` falla.
