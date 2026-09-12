# Tipografía

## 1. La familia

**Arimo** para todo el panel (`Arial`, `system-ui`, `sans-serif` de respaldo). La pareja de la
carta —Bricolage Grotesque para lo que se mira, Source Serif para lo que se lee— **se queda en
la carta**: ahí se lee, aquí se opera.

Sin `font-feature-settings` heredados de Inter (`cv05`, `cv08`): son alternativas de aquella
familia y en Arimo no existen. Las cifras tabulares, que sí importan en una tabla de precios, se
piden donde se usan: `font-variant-numeric:tabular-nums`.

## 2. La escala: seis tamaños, cerrada

En `rem` sobre una raíz de 16 px. **El dibujo es idéntico a la escala anterior en px**; lo que
cambia es que ahora responde a quien sube el tamaño de letra del navegador sin tocar el zoom
— una preferencia que en px se ignora, y que en un panel usado por personas de más de 45 años
no es un detalle.

| Token | rem | px | Papel | Peso habitual | Uso |
|---|---|---|---|---|---|
| `--t0` | 1.5 | 24 | **Display** | 600 | El título de pantalla. **Uno por página** |
| `--t1` | 1.25 | 20 | **Título L** | 600 | La cifra que se mira de lejos (KPI) |
| `--tb` | 1 | 16 | **Título M / cuerpo largo** | 600 / 400 | Nombre de plato, texto que se lee seguido |
| `--t2` | 0.875 | 14 | **Cuerpo** | 400 / 500 | Navegación, botones, campos, etiquetas. **El tamaño base** |
| `--t3` | 0.8125 | 13 | **Cuerpo S** | 400 | Descripción, apunte, ayuda |
| `--t4` | 0.75 | 12 | **Etiqueta / pie** | 500 / 600 | Metadatos, contadores, rótulos de campo |

**12 px es el suelo. Nada baja de ahí**, y no es una preferencia estética: es quién usa esto.

El encargo pedía diez niveles (Display, Heading XL/L/M/S, Body L/M/S, Label, Caption). **No se
inventan cuatro tamaños para rellenar la tabla.** Seis cubren el panel entero hoy; un nivel
nuevo se añade cuando haya una pantalla que lo necesite y con la razón escrita, no antes.

## 3. Pesos

| Peso | Uso |
|---|---|
| 400 | texto corrido, descripciones |
| 500 | etiquetas de control, botón secundario |
| 600 | títulos, cifras, lo que se escanea |

**Cerrado.** Había 23 declaraciones en `700` y `800`; 21 han bajado a **600** y quedan **dos
excepciones, las dos escritas en el código**:

| Excepción | Por qué se queda |
|---|---|
| `.adm-sidebar-logo`, peso **800** | es el logotipo de SocialCard: marca, no interfaz |
| `.adm-alergeno[data-sugerido]`, peso **700** | aquí el peso **es información**: es lo único que distingue un alérgeno sugerido por el motor de uno cualquiera de la lista. Bajarlo sin darle otro indicador sería perder un dato. Tarea aparte: decir ese estado con algo más que el grosor de la letra |

Comprobado después de bajarlos: contraste de las ocho pestañas en los dos temas **sin ningún
fallo nuevo**. Importaba medirlo, porque WCAG cuenta como «texto grande» sólo lo que pasa de
18,66 px **y** peso 700: al bajar a 600, dos textos de 19 y 22 px pasaron a exigir 4,5:1 en vez
de 3:1. Los dos lo cumplen de sobra.

## 4. Altura de línea

Cinco tokens, y **cerrado**:

| Token | Valor | Absorbió | Para qué |
|---|---|---|---|
| `--lh-corrido` | 1.5 | 1.45 · 1.55 | texto que se lee seguido: ayudas, descripciones, avisos |
| `--lh-compacto` | 1.35 | 1.3 · 1.4 | dos líneas en poco alto: apunte de plato, pie de KPI |
| `--lh-titulo` | 1.25 | 1.2 | títulos y nombres |
| `--lh-cifra` | 1.05 | 1.1 | cifras grandes, donde el interlineado sólo estorba |
| `--lh-control` | 1 | — | una sola línea dentro de un control |

Eran dieciséis valores distintos; **51 declaraciones** pasaron a token. Coste medido: el
documento crece **1 px** en siete de las ocho pestañas y 3 px en Analítica, sin desbordamiento
en ningún ancho, y las cajas de alto conocido no se mueven (fila 48, KPI 64, botón 40, campo 40).

**Cuatro `line-height` NO se han tocado, y no son interlineado:** `40`, `32`, `22` y `20` en
píxeles son la forma vieja de centrar un texto en una caja de alto fijo. Su sustituto no es un
token sino `place-items:center`, que es lo que el resto del panel ya hace. Tarea aparte. El `0`
que queda apaga el hueco de un contenedor que sólo lleva iconos.

### Una trampa que costó un rebote, y queda escrita

Los tokens `--t0…--t4` vivían **dentro de `.card-main`**. Al añadir ahí también los `--lh-*`,
`body{line-height:var(--lh-corrido)}` dejó de resolver —`body` es **ancestro** de `.card-main`, y
un `var()` que apunta a un token declarado en un descendiente **no resuelve: la declaración
entera se cae**— y 2.219 elementos perdieron su interlineado de golpe. El tamaño de `body` se
salvaba por casualidad: `--tb` vale 16 y 16 es también el valor que hereda del navegador.

Los tokens del sistema van en `:root`. Ahí están ahora los seis de tamaño y los cinco de altura.

## 5. La deuda conocida: los 15 px

**15 px no está en la escala y es el tamaño más frecuente de la pestaña Platos**: 3 860
elementos a 1440 px. Sale de diez reglas que lo escriben a mano, casi siempre junto a
`font-family:var(--title-font)`:

```
.combo-txt · .cats span · .prow .nm · .vp-n · .vp-vacio · .adm-secciones-flecha
.tabs-*  ·  y tres rótulos de ficha
```

Es la escala vieja de tres tamaños que la V1 dejó sin migrar.

**No se ha resuelto en esta ronda, a propósito**, y esta es la razón: las dos salidas posibles
tienen consecuencias distintas y visibles, y la decisión no es técnica.

| Salida | Consecuencia |
|---|---|
| 15 → **14** (`--t2`) | El nombre del plato pierde jerarquía frente a su descripción (13). Gana densidad: más filas por pantalla |
| 15 → **16** (`--tb`) | El nombre del plato gana jerarquía. Cuesta altura en 312 filas: menos filas por pantalla, justo lo contrario de lo que pidió la FASE 2 de densidad |

Lo razonable es **16 para el nombre de plato y de categoría** (son títulos de contenido) y
**14 para el resto** (son chrome), pero eso cambia la altura de la pantalla más usada del panel
y lo tiene que ver el propietario antes, no después.

## 6. Reglas

1. Ningún `font-size` en píxeles sueltos. Si hace falta un tamaño, es un token.
2. Ningún tamaño nuevo sin justificación escrita en este documento.
3. La jerarquía la dan **tamaño y peso**, no el color: un texto gris no es un título pequeño.
4. Un `--t0` por página. Si hacen falta dos, la página son dos páginas.
5. Los controles de formulario **heredan** la tipografía (`font-family:inherit`). Quedan cuatro
   `<input>` visibles que no lo hacen y salen a 13,3333 px, el tamaño por defecto del navegador:
   pendiente.
