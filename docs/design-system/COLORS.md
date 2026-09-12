# Color

## 1. La identidad

El panel viste la **misma marca que la carta, en otro registro**. La carta vende; el panel se
opera. Misma familia —naranja `#FF7517`, tinta carbón cálido, neutros beige— con menos
saturación, más superficie y más densidad.

Lo que **no** es el panel: gris azulado. La paleta anterior (`#F2F4F7` / `#DCE1E8` / `#202631`)
no tenía nada que ver con la carta que administra. Si aparece un gris frío en una pantalla
nueva, es un resto: se corrige.

## 2. Los dos temas

Se eligen con una clase en `<html>`: `light` o `dark`. La decide, por este orden:

1. lo que el usuario haya elegido en el selector, guardado en
   `localStorage['socialcard-color-mode']`;
2. si no ha elegido nada, **`prefers-color-scheme` del sistema**;
3. si el navegador no lo soporta, claro.

El script va **en el `<head>`, antes de que se pinte nada**. Si viajara al final del documento
se vería el parpadeo del tema por defecto en cada carga.

```js
var m = null;
try { var g = localStorage.getItem('socialcard-color-mode');
      if (g === 'dark' || g === 'light') m = g; } catch (e) {}
if (m === null) {
  try { m = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  catch (e) { m = 'light'; }
}
document.documentElement.classList.add(m);
```

**Los dos temas usan los mismos tokens semánticos. No hay ni un componente duplicado por tema**,
y no debe haberlo: si una pieza necesita una regla `.dark` propia, casi siempre es que está
usando un color que debería ser un token.

### El cambio de tema apaga las transiciones

```js
raiz.classList.add('adm-cambiando-tema');   // html.adm-cambiando-tema * { transition:none }
raiz.classList.toggle('dark', oscuro);
void raiz.offsetWidth;                       // reflujo forzado, ya sin transiciones
requestAnimationFrame(() => requestAnimationFrame(quitar));
setTimeout(quitar, 120);                     // por si la pestaña esta en segundo plano
```

No es un adorno. **Medido:** con `transition:background` viva, cambiar de tema dejaba el
`background-color` de los controles en el valor del tema anterior **y no lo recuperaba nunca**,
mientras el `color` del texto sí cambiaba: «Añadir plato» quedaba crema sobre crema, **1,13:1**,
hasta recargar. Forzando `transition:none` sobre el elemento, el fondo salta al valor correcto
al instante — la transición era la causa.

El mismo fallo, en otra pieza: la flecha desactivada de la tira de secciones se quedaba a
`opacity:1` con `disabled` puesto. El apagado de transiciones del arranque también lo cura.

Las dos vías para quitar la clase (rAF y temporizador) son necesarias: con la pestaña en segundo
plano el navegador **no ejecuta `requestAnimationFrame`**, y la clase se quedaría puesta dejando
el panel sin transiciones el resto de la sesión.

## 3. Superficies: cinco escalones, no sombras

La profundidad en el panel la da la **luminancia**, no la sombra:

```
claro   canvas #F5F1EC  <  nav #EFEAE3  <  apagado #EBE5DD  <  hover #E9E2D9  <  tarjeta #FFFDFB
oscuro  canvas #14110F  <  nav #1A1613  <  superficie #1F1B18 < apagado #262119 < hover #2B241D
```

La sombra sólo marca lo que **flota** (ver `--e-…` en [TOKENS.md](TOKENS.md)). En oscuro casi no
se ve, y por eso los escalones de luminancia son la herramienta principal.

## 4. Estados

| Estado | Fondo | Tinta | Tinta **sobre** el relleno |
|---|---|---|---|
| Éxito | `--sc-ok-bg` | `--sc-ok-ink` | — |
| Aviso | `--sc-warn-bg` | `--sc-warn-ink` | — |
| Error / destructivo | `--sc-bad-bg` | `--sc-bad-ink` | **`--sc-bad-on`** |

`--sc-bad-on` existe porque el rojo **cambia de claridad entre temas**: en claro es `#C62828` y
pide tinta crema; en oscuro se aclara a `#FF8D87` y pide tinta carbón. Escribir `#fff` en los
dos daba **2,23:1** en el botón «Retirar» del cuadro de confirmación — el botón más
consecuente del panel, ilegible en oscuro.

**Falta un `info`.** Hoy `--ui-state-danger`, `-error`, `-depleted`, `-inactive`,
`--ui-badge-promo` y `--ui-trend-negative` son **seis alias del mismo rojo**: seis nombres, un
color, ninguna diferencia semántica. Pendiente.

## 5. El color de marca del cliente

`--accent` es el color **del restaurante**. Lo declara `cliente.mjs`, se edita en la pestaña
Marca, viaja a la carta pública y **puede ser cualquier cosa**.

- En el panel, `--accent` sólo se usa donde se está enseñando o editando la marca.
- Todo lo demás —incluido el anillo de foco— usa `--sc-primary`, que es el color del producto.
- Con la marca de Tinge los dos salen casi iguales por casualidad. Con un cliente verde, el
  panel entero se volvía verde. Ya pasó.

## 6. Contraste

Objetivo WCAG 2.2 AA: 4,5:1 texto normal, 3:1 texto grande y elementos gráficos.

Medido sobre las ocho pestañas en los dos temas, con composición de capas translúcidas:
**cumple todo salvo el botón primario naranja**, que es una excepción expresa del propietario
(2,65:1 en claro, 2,31:1 en oscuro) registrada por la prueba `E2E-TE-CONTRASTE` como *KNOWN
EXCEPTION — OWNER APPROVED*. La alternativa que sí cumplía —hundir el naranja a `#B44A08`— se
descartó porque ese es el quemado que esta paleta vino a sustituir.

### El naranja como relleno y el naranja como tinta son dos cosas

La excepción de arriba es sobre el **relleno**: naranja de fondo, crema encima. Cuando el
naranja es la **tinta** —el dibujo de un icono, una letra, el anillo de foco— no hay excepción
que valga, porque lo que se mide es el naranja contra la crema, y ahí sale 2,65:1.

Así que hay tres naranjas y cada uno tiene su trabajo:

| Token | Claro | Oscuro | Para qué |
|---|---|---|---|
| `--sc-primary` | `#FF7517` | `#FF8A3D` | **relleno**: el botón primario, la pista del interruptor |
| `--sc-primary-grafico` | `#D36316` | = primary | **dibujo**: iconos, el anillo de foco. ≥3:1 |
| `--sc-primary-texto` | `#A34F16` | = primary | **letra pequeña**. ≥4,5:1 |

Los dos derivados salen de acercar el primario a la tinta oscura **hasta el primer valor que
cumple sobre los tres fondos claros del panel** (tarjeta `#FFFDFB`, tablero `#F5F1EC`, apagado
`#EBE5DD`), no de elegir un tono a ojo. Medido: `#D36316` da 3,72 / 3,36 / 3,02 y `#A34F16` da
5,61 / 5,06 / 4,55.

En oscuro los dos apuntan al primario porque ya cumple de sobra: 7,29 / 8,02 / 6,52. **Un tema
no estrena un color que no necesita.**

**Y la regla que queda escrita:** si mañana el icono de la cámara —o cualquier otro— tuviera que
seguir el color de marca del cliente, no puede usar `--accent` a pelo. Con la marca de Tinge se
ve, pero un amarillo `#FFC107` da 1,61:1 sobre la tarjeta clara y un verde `#8BC34A` da 2,07:1:
invisibles los dos. Haría falta derivar el equivalente de `--accent` por la misma regla, con las
funciones de color que el panel ya tiene en PHP (`color_luz`, `color_contraste`,
`color_mezcla`) — las mismas que ya derivan `--badge-ink`. **No está hecho, porque hoy ningún
icono sigue la marca.** Está escrito aquí para que el día que se pida no se haga a ojo.

Detalle en [ACCESSIBILITY.md](ACCESSIBILITY.md).
