# Tokens

Catálogo completo. Si un valor no está aquí, no se usa.

Hoy hay **150 definiciones** en la hoja del panel. Las que siguen son las del sistema; el resto
son parches heredados en retirada, listados al final.

---

## Color primitivo · `--c-…`

**Neutros cálidos.** Numerados por luminancia, 0 el más claro.

| Token | Valor | Token | Valor |
|---|---|---|---|
| `--c-n-0` | `#FFFDFB` | `--c-n-600` | `#605245` |
| `--c-n-25` | `#F5EFE8` | `--c-n-620` | `#5C5450` |
| `--c-n-50` | `#F5F1EC` | `--c-n-700` | `#3A322E` |
| `--c-n-100` | `#EFEAE3` | `--c-n-750` | `#332C26` |
| `--c-n-150` | `#EBE5DD` | `--c-n-800` | `#2B241D` |
| `--c-n-200` | `#E9E2D9` | `--c-n-820` | `#262119` |
| `--c-n-250` | `#E2DAD0` | `--c-n-850` | `#1F1B18` |
| `--c-n-300` | `#DCD3CA` | `--c-n-900` | `#1A1614` |
| `--c-n-350` | `#CABDAB` | `--c-n-910` | `#1A1613` |
| `--c-n-400` | `#B8ADA3` | `--c-n-950` | `#14110F` |

**Naranja** — `--c-naranja-50` `#FFE9D6` · `-300` `#FFB877` · `-400` `#FF8A3D` · `-500`
`#FF7517` · `-800` `#8A3F08` · `-900` `#33231A`

**Estados** — verde `50 #E6F2EC · 300 #6FD3A6 · 700 #20624A · 900 #1B3A2C` · ámbar
`50 #FBEFD9 · 300 #EFC578 · 700 #84540A · 900 #3A3020` · rojo
`50 #FAE7E7 · 300 #FF8D87 · 600 #C62828 · 900 #3B2320`

---

## Color semántico · `--sc-…`

| Token | Claro | Oscuro | Para qué |
|---|---|---|---|
| `--sc-canvas` | `n-50` | `n-950` | el tablero, detrás de la tarjeta |
| `--sc-surface` | `n-0` | `n-850` | la tarjeta y todo lo que se levanta |
| `--sc-nav` | `n-100` | `n-910` | la barra lateral y la de abajo |
| `--sc-text` | `n-900` | `n-25` | texto principal |
| `--sc-text-medio` | `n-700` | `n-300` | seleccionado que no es acción principal |
| `--sc-text-2` | `n-620` | `n-400` | texto secundario y apuntes |
| `--sc-border` | `n-250` | `n-750` | filetes |
| `--sc-input-border` | `n-350` | `n-600` | pista del interruptor apagado, borde fuerte |
| `--sc-muted-bg` | `n-150` | `n-820` | fondo apagado (chip, contador) |
| `--sc-hover-bg` | `n-200` | `n-800` | hover |
| `--sc-primary` | `naranja-500` | `naranja-400` | **color de producto** |
| `--sc-primary-ink` | `n-0` | `n-0` | tinta sobre el primario |
| `--sc-selected-bg` | `naranja-50` | `naranja-900` | pastilla del destino activo |
| `--sc-selected-text` | `naranja-800` | `naranja-300` | su texto |
| `--sc-ok-bg` / `-ink` | `verde-50` / `-700` | `verde-900` / `-300` | éxito |
| `--sc-warn-bg` / `-ink` | `ámbar-50` / `-700` | `ámbar-900` / `-300` | aviso |
| `--sc-bad-bg` / `-ink` | `rojo-50` / `-600` | `rojo-900` / `-300` | error |
| `--sc-bad-on` | `n-0` | `n-950` | tinta **encima** del rojo relleno (confirmar borrado) |
| `--sc-input-bg` | = canvas | = canvas | fondo de campo |
| `--sc-scrim` | `rgba(26,22,20,.45)` | `rgba(10,8,7,.62)` | velo de modal |

## Elevación · `--e-…`

Cuatro niveles: 0 es «no se levanta» y no tiene token.

| Token | Claro | Oscuro | Para qué |
|---|---|---|---|
| `--e-1` | `0 1px 2px rgba(26,22,20,.08)` | `0 1px 2px rgba(0,0,0,.5)` | apoyado: KPI, chapa |
| `--e-3` | `0 12px 32px -8px rgba(26,22,20,.18)` | `… rgba(0,0,0,.6)` | flotante: popover, toast |
| `--e-4` | `0 24px 64px -16px rgba(26,22,20,.24)` | `… rgba(0,0,0,.7)` | superpuesto: modal, hoja |

Se declaran por tema y no se derivan de una tinta común: la sombra en oscuro no es la misma
sombra más fuerte, es otra cosa.

Siguen vivos `--sc-sombra-card`, `--sc-sombra-menu` y `--sc-sombra-hoja`, que describen piezas
concretas y ya tenían valor correcto en los dos temas.

## Foco · `--focus-…`

```css
--focus-grosor:2px;
--focus-color:var(--sc-primary);
--focus-anillo:var(--focus-grosor) solid var(--focus-color);
--focus-desvio:2px;
```

Uso: `outline:var(--focus-anillo);outline-offset:2px`. El **desvío no se unifica**: los tres
valores en uso (2, 1, −2) están dimensionados al hueco real de cada pieza, igual que los halos
táctiles, y unificarlos solaparía anillos con el vecino.

## Espaciado · `--space-…`

El número por cuatro son los píxeles.

`--space-0-5` 2 · `-1` 4 · `-1-5` 6 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-8` 32
· `-10` 40 · `-12` 48 · `-16` 64 · `-20` 80

## Radio · `--radius-…`

`-sm` 6 · `-md` 8 · `-lg` 10 · `-xl` 14 · `-card` 16 · `-pill` 999

Antes eran 6,4 / 8,4 / 10,4 / 14,4: decimales heredados de un prototipo escalado. Llevarlos al
entero es una diferencia máxima de 0,4 px que no se ve, y a cambio la escala se puede decir de
memoria. Alias en uso: `--ui-radius-control` (= `--radius-xl`), `--ui-radius-modal` y
`--p-radius-card` (16, declarados aparte a propósito).

## Tipografía · `--t…`

`--t0` 1.5rem · `--t1` 1.25rem · `--tb` 1rem · `--t2` 0.875rem · `--t3` 0.8125rem · `--t4`
0.75rem. Detalle y uso en [TYPOGRAPHY.md](TYPOGRAPHY.md).

## Movimiento · `--t-…` / `--ease-…`

Los escribe `gen.mjs` y los comparte con la carta: `--t-press` 140ms · `--t-fast` 180ms ·
`--t-sheet-in` 340ms · `--ease-out` · `--ease-drawer`. El panel no añade curvas propias.

## Shell

`--sc-sidebar-w` 232px · `--sc-rail-w` 68px · `--sc-header-h` 68px · `--sc-contenido-max` 1580px

---

## En retirada

| Token | Problema |
|---|---|
| `--radius` | duplica `--radius-lg` |
| `--p-accent-*` | alias de `--sc-primary`, de una ronda anterior |
| `--ui-state-danger` · `-error` · `-depleted` · `-inactive` · `--ui-badge-promo` · `--ui-trend-negative` | **seis nombres para un solo color** (`--offer`). No hay `info` |
| `--s1…--s7` (dentro del panel) | escala Fibonacci de la carta; en el panel debe ser `--space-…` |
