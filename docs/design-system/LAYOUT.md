# Layout y densidad

## 1. El shell

```
┌──────────┬──────────────────────────────────────────┐
│ sidebar  │  topbar  (68px, sticky)                  │
│ 232px    ├──────────────────────────────────────────┤
│ (riel 68)│  .page  →  .card-main  (max 1580px)      │
│          │                                          │
│          │     .adm-f   .adm-f   .adm-f   ← fichas  │
└──────────┴──────────────────────────────────────────┘
       por debajo de 768px: barra inferior + hoja «Más»
```

| Pieza | Token | Valor |
|---|---|---|
| Barra lateral | `--sc-sidebar-w` | 232px |
| Barra lateral plegada (riel) | `--sc-rail-w` | 68px |
| Cabecera | `--sc-header-h` | 68px |
| Ancho máximo del contenido | `--sc-contenido-max` | 1580px |

La barra lateral **se pliega a riel** y el estado vive en
`localStorage['socialcard-barra-plegada']`, aplicado en el `<head>` antes de pintar: si se
plegara después, en cada carga se vería aparecer y desaparecer.

En el riel el tooltip propio **se desactiva** (`html.adm-riel .adm-nav-tooltip{display:none}`).
No es un descuido: el tooltip vive en `position:absolute` a `100% + 10px` para salirse de los
68 px, y eso engorda el área de desplazamiento de una caja con `overflow`, que es de donde salía
un scroll horizontal en la barra. En escritorio el `title` nativo lo dibuja el navegador fuera
del documento y no ensancha nada; el nombre accesible lo pone `aria-label`, que va siempre.

## 2. La tarjeta

`.card-main` es **el tablero de trabajo**, no una hoja de papel con márgenes. El relleno baja
con el ancho disponible:

| Ancho | `.page` | `.card-main` |
|---|---|---|
| < 700px, con sesión | `--space-2` a los lados | `--space-2` a los lados |
| ≥ 768px | `--s3` | `--space-5` (20) |

Dos trampas escritas en el código y que conviene no repetir:

- **Sin `overflow:hidden` en `.card-main`.** Recortar parecía lo correcto para las esquinas
  redondeadas, pero un ancestro con `overflow` oculto **anula el `position:sticky`** del
  buscador: deja de pegarse y se va con el scroll.
- **`min-height:0`** es obligatorio en los botones de icono: el reset general pone
  `min-height:48px` a todo `<button>`, y sin eso un botón de 32×32 sale de 32×48. «Es la tercera
  vez que aparece esta trampa en el panel», dice el comentario original.

## 3. Espaciado

Escala 4/8 completa: **2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80**
(`--space-0-5` … `--space-20`).

Convive con la escala **Fibonacci** de la carta (`--s1…--s7`: 8/13/21/34/55/89/144), que escribe
`gen.mjs` y **no se toca**. La regla: dentro del panel, lo nuevo va en `--space-…`; lo viejo se
migra cuando esa pantalla pase por revisión. No se hace un reemplazo masivo — el aire de una
pantalla no se cambia por simetría de nombres.

Equivalencias al migrar: 8→`--space-2` · 13→`--space-3` (12) · 21→`--space-5` (20) ·
34→`--space-8` (32) · 55→`--space-12` (48) · 89→`--space-20` (80).

## 4. Densidad

**El panel es una herramienta de trabajo, no una landing.** Se usa de pie, con prisa y a veces
con el móvil en una mano.

- Altura estándar de control: **40 px** (`.adm-btn`). Convivieron cuatro —40, 46, 52 y 54—
  repartidas por herencia de rondas distintas. La jerarquía de un botón la dan su color, su
  sitio y su aire, no su altura.
- Espacio muerto es una fila de plato menos. El hueco de más sobre el contenido se retiró por
  eso.
- La fila de plato tiene **tres formas** según el ancho: rejilla en escritorio, dos líneas en
  móvil, y una variante compacta en la lista de categoría.

## 5. Rejilla

No hay un sistema de columnas global. Las pantallas usan:

- **bento** (`.adm-f`, fichas de ancho variable en `grid`) para Datos, Precios, Ofertas, Marca;
- **listas** con `grid-template-columns` propias para Platos y categorías;
- `flex` con `gap` para toolbars y grupos de acción.

Es deliberado: un grid de 12 columnas no aporta nada a pantallas que son listas densas. Lo que
sí es obligatorio es que **los huecos salgan de `--space-…`**.

### La columna de orden: un solo eje

La cabecera de una categoría y las filas de sus platos llevan el mismo control —dos flechas
para mover— y **tenían que caer en la misma x, porque hacen lo mismo un nivel más arriba**. No
caían: había **14 px de desvío**, medidos iguales a 320, 375, 768 y 1440 px y en las cuarenta
fichas.

La causa no era el control sino un relleno: `.adm-cat-bento-lista` llevaba `padding:0 14px`.
Ese 14 valía dos cosas a la vez —meter las filas en la tarjeta y separarlas de su borde—, y la
segunda ya la hace cada fila con su propio relleno, que **es el mismo que el de la cabecera**
(16 en escritorio, 12 en móvil). Así que el 14 sólo desplazaba la lista. A cero, el desvío es
**0 en los cuatro anchos y en las cuarenta fichas**, sin tocar el alto de la fila (48 / 100) ni
provocar un píxel de desbordamiento. De paso se va el último valor a mano de esta rejilla: 14
no está en la escala de espaciado.

**El tamaño DIBUJADO de las flechas NO se unifica, y es decisión tomada.** Con el dedo, la de
la categoría mide 44×44 y la del plato 26 con su halo táctil de 28×44. Los bordes izquierdos
coinciden —que es lo que se pidió—, pero los centros de los dos dibujos no: 9 px. Alinearlos
exigiría que las dos cajas midieran lo mismo, y eso bajaría el objetivo táctil de la cabecera
de 44×44 a 28×44: sigue por encima del mínimo de WCAG 2.5.8 (24×24), pero por debajo del 44
que el encargo prefiere.

**El propietario eligió mantener los 44×44** (13 sep 2026). Nueve píxeles de desalineación
entre dos dibujos valen menos que un objetivo táctil generoso en una herramienta que se usa de
pie y con una mano. Queda escrito para que nadie lo "arregle" más adelante creyendo que se coló.

## 6. Pegajosos y scroll

- La cabecera es `sticky` con fondo translúcido.
- El buscador de Platos es `sticky` dentro de la tarjeta — y por eso ningún ancestro suyo puede
  tener `overflow` oculto.
- La tira de secciones tiene scroll horizontal propio con flechas; las flechas se desactivan
  cuando no hay a dónde ir.
- **Nunca scroll horizontal de página.** Medido: 0 px de desbordamiento a 1440, 375 y 320.
