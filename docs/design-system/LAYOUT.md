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

## 6. Pegajosos y scroll

- La cabecera es `sticky` con fondo translúcido.
- El buscador de Platos es `sticky` dentro de la tarjeta — y por eso ningún ancestro suyo puede
  tener `overflow` oculto.
- La tira de secciones tiene scroll horizontal propio con flechas; las flechas se desactivan
  cuando no hay a dónde ir.
- **Nunca scroll horizontal de página.** Medido: 0 px de desbordamiento a 1440, 375 y 320.
