# Responsive

## 1. Se trabaja por comportamiento, no por dispositivo

No hay parches «para iPhone» ni «para iPad». Hay tres formas de trabajar y dos capacidades que
las cruzan.

| Forma | Desde | Qué cambia |
|---|---|---|
| **Estrecha** | < 768 px | Sin barra lateral: barra inferior con cuatro destinos y hoja «Más» para el resto. Fila de plato en dos líneas. Rellenos al mínimo |
| **Media** | 768 – 1023 px | Barra lateral en riel (68 px). Fila de plato en rejilla de una columna, alto 48 |
| **Ancha** | ≥ 1024 px | Barra lateral completa (232 px), tooltips nativos, contenido hasta 1580 px |

Cruzadas con la capacidad del puntero:

- `@media (pointer:coarse)` — con dedo: se activan los **halos táctiles** (`::before` invisibles
  que agrandan el área que responde al toque sin mover el dibujo ni un píxel).
- `@media (hover:hover) and (pointer:fine)` — con ratón: estados `:hover` y `title` nativo.

Esta separación es la que permite que una tablet de 768 con dedo y un portátil de 768 con ratón
se comporten distinto sin duplicar el layout.

## 2. Los breakpoints

**Objetivo del sistema** — siete fronteras y nada más:

```
360   560   700   768   900   1024   1200
```

Fueron cinco en la primera versión de este documento. El código demostró que faltaban dos: la
banda de 320-360, que estrenó el trabajo de septiembre, y la de 900, donde los días de la oferta
pasan a una sola línea — una decisión deliberada del 11 de septiembre con 36 reglas colgando.

**Lo que hay hoy** — **22 anchuras de viewport** distintas. La cifra de 27 que se dio antes
mezclaba cinco `@container` (que miden la caja, no la ventana) y dos `max-height` (que miden el
alto): no son breakpoints. El mapa completo, con las reglas que cuelgan de cada uno y el riesgo
de moverlo, está en [PLAN-FASE-4-11.md](PLAN-FASE-4-11.md).

| Frontera | Valores en uso hoy | Reglas que cuelgan |
|---|---|---|
| 360 | `max-width:359` · `max-width:360` · `max-width:400` | 8 |
| 560 | `max-width:460` · `max-width:480` · `max-width:520` · `max-width:560` | 35 |
| 700 | `max-width:640` · `max-width:699` · `max-width:700` · `min-width:700` | 58 |
| 768 | `max-width:760` · `max-width:767` · `max-width:767.98` · `min-width:720` · `min-width:768` | 15 |
| 900 | `max-width:900` · `min-width:901` | 36 |
| 1024 | `min-width:1000` · `max-width:1023` · `min-width:1024` | 54 |
| 1200 | `min-width:1200` | 5 |

Tres redondeos distintos describen la misma frontera de 768, y el par `max-width:700` /
`min-width:700` **se pisa en los 700 px exactos**. **No se han unificado todavía, y la razón es
la prudencia, no el olvido:** cambiar `max-width:760` por `max-width:767.98` mueve el layout
entre 761 y 767 px, y `min-width:1000` a `1024` mueve 31 reglas de la rejilla de Ofertas. Eso se
ve pantalla por pantalla, no con un buscar-y-reemplazar. El plan por grupos de riesgo, con las
19 anchuras que hay que medir en cada uno, está en [PLAN-FASE-4-11.md](PLAN-FASE-4-11.md).

Regla para lo nuevo: **usar sólo las siete fronteras**, y la pareja correcta
—`max-width:N-0.02px` / `min-width:Npx`— para no dejar ni solape ni hueco de un píxel
fraccionario.

## 3. Lo que está verificado

Medido en navegador, ocho pestañas, tema claro y oscuro:

| Ancho | Desbordamiento horizontal |
|---|---|
| 1440 | **0 px** |
| 375 | **0 px** |
| 320 | **0 px** |

No debe existir scroll horizontal de página en ningún ancho. Si aparece, es un fallo, no un
efecto secundario aceptable.

Las piezas que **sí** tienen scroll propio, a propósito y con sus manejadores: la tira de
secciones y la fila de pestañas de idioma.

## 4. Qué revisar siempre que se toque el ancho

1. **Barra lateral**: completa → riel → barra inferior. Y el tooltip, que en riel se desactiva.
2. **Fila de plato**: rejilla → una columna → dos líneas. Es la pantalla más densa del panel.
3. **Filtros y buscador**: el buscador es `sticky`; ningún ancestro puede recortar.
4. **Fichas bento**: se apilan, no se estrangulan.
5. **Formularios**: los bloques de idioma pasan de tres columnas a una.
6. **Modales y hojas**: la hoja «Más» sólo existe en estrecho; el modal se centra en todos.
7. **La ficha de oferta a 320**: es el caso límite conocido del panel. Los siete días son
   círculos de diámetro **elástico** (`flex:1 1 0; max-width:40px; aspect-ratio:1`) y no de
   ancho fijo, precisamente para que quepan por construcción.

## 5. Zoom y reflow

WCAG 2.2 pide que a **400 % de zoom** (equivalente a 320 px de ancho) el contenido siga
disponible sin scroll en dos ejes. El panel lo cumple hoy: a 320 px no hay desbordamiento y
todas las pestañas son alcanzables por la barra inferior y la hoja «Más».

Con la escala tipográfica en `rem`, subir el tamaño de letra del navegador **sin** tocar el zoom
ahora también agranda el texto del panel. Antes, en px, esa preferencia se ignoraba.
