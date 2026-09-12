# Componentes

Inventario de lo que existe, con su nombre real de clase, y lista de lo que el sistema pide y
todavía no hay.

> **Antes de crear un componente nuevo:** comprobarlo aquí. Y si de verdad hace falta, recordar
> que `qa/inventario.json` tiene que incluirlo o la prueba `INV-01` falla — la batería exige que
> toda la superficie del panel esté catalogada.

## 1. Estados obligatorios

Todo componente interactivo define, como mínimo:

| Estado | Cómo se dice |
|---|---|
| **Reposo** | `--sc-surface` + `1px solid --sc-border` |
| **Hover** | `background:var(--sc-hover-bg)` + `border-color:var(--sc-input-border)`. Sólo bajo `@media (hover:hover) and (pointer:fine)` |
| **Activo** | `transform:scale(.98)` con `--t-press`. Se anula en `prefers-reduced-motion` |
| **Foco** | `outline:var(--focus-anillo)` + su desvío. **Nunca `outline:none` sin sustituto** |
| **Desactivado** | `opacity:var(--ui-control-disabled-opacity)` (.45) + `cursor:default`. Se apagan color, fondo y borde **juntos**, no uno a uno |
| **Cargando** | Sólo donde hay espera real (subida de foto). Animación propia, apagada con `prefers-reduced-motion` |

## 2. Lo que existe

### Shell
`.adm-sidebar` (completa / `html.adm-riel`) · `.adm-topbar` (sticky, 68px) · `.adm-nav-item`
(+`.on`, con contador `.n`) · `.adm-nav-tooltip` · `.adm-navmovil` · `.adm-sheet` («Más») ·
`.adm-tema-seg` (selector de tema: **dos botones, no un interruptor**, porque los dos estados
tienen nombre y un interruptor obliga a deducir cuál es cuál por la posición de la bola).

### Controles
| Clase | Qué es | Notas |
|---|---|---|
| `.adm-btn` | botón | altura estándar **40 px**. `-fino`, `-guardar` (primario), `-quitar` (destructivo), `-ver`, `-archivo` |
| `.camara`, `.adm-foto-b`, `.adm-mas-b` | botón de icono | 32×32 con radio 8 e icono 16. **`min-height:0` obligatorio** |
| `.adm-campo` | input / select / textarea | |
| `.adm-sw` | interruptor | pieza única del sistema desde la V5 |
| `.tick` | casilla en forma de píldora | |
| `.adm-chip` / `.adm-kpi` | chip y tarjeta de cifra | |
| `.adm-pct` | porcentaje con atajos | |
| `.combo` | buscador con sugerencias | |
| `.adm-dia` | píldora de día (círculo elástico) | |
| `.adm-cal-*` | calendario | |

### Composición
`.card-main` · `.adm-f` (ficha bento) · `.adm-platorow` (fila de plato, tres formas) ·
`.adm-cat-bento-lista` · `.vp-*` (barras de analítica) · `.adm-podio` · `.adm-secciones` (tira
con scroll y flechas).

### Retroalimentación
`.toast` (`ok` / `warn` / `bad`) · `.adm-modal` (+`[data-tono="peligro"]`) · `.adm-alta-caja` /
`.adm-alta-hoja` · `.insignia.is-demo` · avisos de acción sensible · vacíos (`.adm-vacio`,
`.vp-vacio`).

## 3. Lo que el sistema pide y NO existe

Esto no es deuda de estilo: es **producto que no está construido**. Ponerlo es una tarea con su
propio diseño y su propia autorización, no parte de una normalización visual.

| Pieza | Qué hay hoy en su lugar |
|---|---|
| **Tabla de datos** (cabecera fija, orden por columna) | listas y rejillas `grid`. No hay `<table>` ordenable |
| **Paginación** | «Ver N platos más» |
| **Acciones en lote** | nada: se actúa fila a fila |
| **Breadcrumb** | nada: la navegación es plana, ocho destinos |
| **Avatar** | nada |
| **Drawer de escritorio** | la hoja «Más» es sólo móvil |
| **Skeleton de carga** | nada: el panel se sirve renderizado por PHP |
| **Estado de error de pantalla** | toast `bad` |
| **«Sin resultados»** vs **«vacío»** | un solo vacío, sin distinguir |
| **Estado offline** | nada |

Dos observaciones honestas sobre esta lista:

- **Skeletons**: el panel no hace *fetch* para pintar la pantalla; llega ya montada desde PHP.
  Un skeleton sería decorado para una espera que no existe. Sólo tiene sentido donde sí hay
  espera: subir una foto, guardar un formulario.
- **Tabla ordenable y acciones en lote** sí serían una mejora real con 312 platos, y son la
  recomendación principal para la iteración siguiente.

## 4. Iconografía

Una sola familia: SVG en línea, trazo de 2, `currentColor`, tamaños 14 / 15 / 16 / 18. No se
cargan librerías de iconos.

- Icono **decorativo** (acompaña a un texto que ya lo dice): `aria-hidden="true"`.
- Icono **solo** (botón sin rótulo visible): `aria-label` obligatorio. Ya lo cumplen los
  destinos de la barra y los botones de fila.
- No se sustituyen iconos existentes salvo que mejore la coherencia.

## 5. Cómo se escribe un componente nuevo

```css
.adm-cosa{
  /* 1. caja */
  display:inline-flex; align-items:center; gap:var(--space-2);
  min-height:40px; padding:0 var(--space-3);
  /* 2. piel: SIEMPRE tokens semanticos */
  border:1px solid var(--sc-border);
  border-radius:var(--ui-radius-control);
  background:var(--sc-surface);
  color:var(--sc-text);
  /* 3. letra */
  font-size:var(--t2); font-weight:500;
  /* 4. movimiento, solo si aclara un cambio de estado */
  transition:background var(--t-press) var(--ease-out);
}
@media (hover:hover) and (pointer:fine){
  .adm-cosa:hover{background:var(--sc-hover-bg);border-color:var(--sc-input-border)}
}
.adm-cosa:focus-visible{outline:var(--focus-anillo);outline-offset:var(--focus-desvio)}
.adm-cosa:disabled{opacity:var(--ui-control-disabled-opacity);cursor:default}
```

Y después: dar de alta la clase en `qa/inventario.json`, o la batería falla.
