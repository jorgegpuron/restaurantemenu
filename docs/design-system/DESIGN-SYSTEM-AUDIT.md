# Auditoría del panel — punto de partida del Tinge Admin Design System 2026

> **Dónde se hizo esto.** En una copia de trabajo
> (`tinge_of_turmeric/4-laboratorio/tinge_of_turmeric/1-proyecto`), clonada del repositorio real
> en el commit `a5c6d8b` y con el remoto retirado para que no pueda empujar nada. El proyecto
> original no se ha tocado.
>
> **Qué se midió y cómo.** El panel compilado por `node gen.mjs`, servido con `php -S` desde una
> copia temporal con `DEMO_SIN_CLAVE`, y medido en un navegador real con `getComputedStyle` sobre
> las ocho pestañas, en claro y en oscuro, a 1440, 375 y 320 px. Las cifras de este documento son
> mediciones, no estimaciones. Donde no se ha medido, se dice.

---

## 1. Resumen: el panel no es el caso que el encargo supone

El encargo describe un admin con deuda visual acumulada: colores sueltos, sin dark mode, sin
tokens, componentes que cambian de cara de una página a otra. **Eso no es lo que hay.** Medido:

| Lo que se esperaba encontrar | Lo que hay realmente |
|---|---|
| Sin dark mode | Dos temas completos (`:root.light` / `:root.dark`), 24 tokens semánticos cada uno |
| Colores a pelo por todas partes | 371 declaraciones de `color`, casi todas por token; **30 hex sueltos** en 5 681 líneas |
| Sin tokens | Cuatro capas de tokens conviviendo (ese *es* el problema, pero por exceso, no por defecto) |
| Contraste roto | **1 fallo de contraste en 8 pestañas × 2 temas**, y es una excepción aprobada y documentada |
| Desbordes en móvil | **0 px de desbordamiento horizontal** en 320, 375 y 1440 |
| `!important` por todas partes | **4** en total |
| Foco eliminado sin sustituto | 54 reglas `:focus-visible`; los 8 `outline:none` tienen todos anillo sustituto |

El panel ya pasó por siete rondas de rediseño («SocialCard V1…V7») con las decisiones escritas en
`motor/server/admin/SPEC.md` (362 KB de registro). **La deuda real no es de apariencia: es de
arquitectura de tokens y de disciplina de escala.** Cuatro sistemas de medida solapados, una
escala tipográfica que se salta en diez sitios, quince breakpoints distintos y ningún token de
foco ni de elevación.

Este documento lista lo que hay, lo que está mal, y en qué orden conviene tocarlo.

---

## 2. Arquitectura actual

### 2.1 Dónde vive el CSS del panel

| Pieza | Dónde | Tamaño |
|---|---|---|
| Tokens compartidos con la carta | `2-subir/admin/tokens.css`, **generado** por `gen.mjs` | 3,4 KB, 77 líneas |
| Hoja principal del panel | Bloque `<style>` **incrustado** en `motor/server/admin/index.php`, líneas 5041-10722 | 5 681 líneas fuente · ~410 KB servidos |
| Hoja condicional de marca | Bloque `<style>` en `index.php` 4984-5039, sólo si el cliente tiene `colorPrincipalOverride` | 54 líneas |
| Estilos en línea en el marcado | 3 (`background:#…` de las muestras de color fijas) | despreciable |

Consecuencias medidas:

- El HTML del panel en la pestaña Platos pesa **2,72 MB** sin comprimir y **186 KB** con gzip. Los
  ~410 KB de CSS **viajan en cada petición** y no son cacheables por separado (`tokens.css`, que sí
  lo es, son 3,4 KB).
- `index.php` tiene **17 180 líneas**: PHP hasta la 4936, CSS hasta la 10722, marcado hasta la
  15822, JavaScript hasta el final. Cualquier cambio de diseño toca el mismo fichero que la lógica.
- `gen.mjs` **rechaza compilar** si `index.php` o `SPEC.md` cambian sin refirmar `motor.lock`
  (`node motor/lock.mjs --escribir`). Es una compuerta real, no un aviso.

### 2.2 Las cuatro capas de tokens que conviven

Este es el hallazgo central de la auditoría. Hay **109 definiciones de custom properties** en la
hoja del panel, repartidas en cuatro vocabularios que no comparten criterio:

| Capa | Prefijo | Origen | Ejemplos |
|---|---|---|---|
| **A. Carta** | `--s1…--s7`, `--r-chip/-pill/-sheet/-card`, `--accent`, `--ease-*`, `--t-*` | `gen.mjs` → `tokens.css` | `--s3:21px`, `--r-card:34px` (escala **Fibonacci**) |
| **B. SocialCard semántica** | `--sc-*` | hoja del panel, dos temas | `--sc-surface`, `--sc-text-2`, `--sc-ok-bg` |
| **C. Prototipo** | `--space-1…8`, `--radius`, `--radius-sm/md/lg/xl/card/pill` | hoja del panel | `--space-3:12px` (escala **4/8**), `--radius-lg:10.4px` |
| **D. Parches locales** | `--p-*`, `--ui-*` | hoja del panel, «Mise» | `--p-radius-card:16px`, `--ui-radius-control:var(--radius-xl)` |

Los conflictos concretos:

1. **Dos escalas de espaciado incompatibles.** Fibonacci (8/13/21/34/55/89/144) de la carta y
   4/8 (4/8/12/16/20/24/32) del prototipo, ambas en uso en el mismo fichero. El encargo pide la
   segunda; la primera es la identidad de la carta y **no se puede tocar sin tocar la carta
   pública**, que está fuera de alcance.
2. **Tres familias de radios.** `--r-*` (13/21/34), `--radius-*` (6,4 / 8,4 / 10,4 / 14,4 / 16) y
   `--p-radius-card` / `--ui-radius-modal` (16 los dos, declarados por separado a propósito).
   Los valores con decimal —**10,4 px, 8,4 px, 14,4 px, 6,4 px**— son herencia de un prototipo
   escalado y no pertenecen a ninguna escala; medidos en pantalla: 8,4 px aparece 1 119 veces,
   14,4 px 583, 10,4 px 390.
3. **Ninguna capa primitiva.** Los tokens semánticos llevan el hex escrito dentro
   (`--sc-surface:#FFFDFB`). No existe `--color-neutral-100`. Cambiar la familia neutra obliga a
   editar 24 valores a mano, dos veces (claro y oscuro).
4. **`--accent` significa dos cosas.** Es el color de marca **del cliente** (viaja a la carta
   pública) y a la vez el color del **anillo de foco** en 12 reglas del panel. Con un cliente de
   marca pálida, el foco del panel se vuelve ilegible. El código ya separó `--p-accent-*` de
   `--accent` para el relleno de botones por este mismo motivo; el foco se quedó atrás.

### 2.3 Tipografía

Escala declarada (en `.card-main`, en **px**, no en `rem`):

```
--t0:24px   título de pantalla
--t1:20px   cifra grande
--tb:16px   contenido / nombre de plato
--t2:14px   navegación, botones, campos  ← tamaño base del panel
--t3:13px   descripción y apunte
--t4:12px   metadatos (suelo declarado: «nada por debajo de 12»)
```

Medido en pantalla, pestaña Platos a 1440 px:

```
15px:3860   14px:2464   13px:1034   0px:203   12px:69   16px:5   26px:4   24px:1
```

- **15 px no existe en la escala** y es el tamaño más frecuente de la pestaña. Sale de 10 reglas
  (`.combo-txt`, `.cats span`, `.prow .nm`, `.vp-n`, `.vp-vacio`…) que lo escriben a mano, casi
  siempre junto a `font-family:var(--title-font)`. Es la escala vieja de tres tamaños que la V1
  dejó sin migrar.
- **26 px** y **21 px** aparecen sueltos (4 y 4 elementos), tampoco en la escala.
- **13,3333 px** es el tamaño por defecto del navegador para controles de formulario: hay
  `<input>` que no heredan la tipografía del panel (3 visibles en Publicidad, 1 en Marca).
- No hay jerarquía nombrada: no existe Display / Heading / Body / Label / Caption, sólo seis
  números. Los pesos se escriben sueltos (600 en 12 234 elementos, 400 en 8 169, 500 en 1 043,
  **700 en 49** y **650 en 3** — estos dos últimos, fuera de sistema).
- `line-height` sin token: 12 valores computados distintos, con decimales (19,5 / 16,2 / 15,6 /
  18,2 / 17,55 px).

### 2.4 Color y temas

- Dos temas completos por clase en `<html>`: `light` y `dark`, elegidos por
  `localStorage['socialcard-color-mode']`, con script bloqueante en `<head>` para evitar el
  parpadeo. **No se consulta `prefers-color-scheme` en ningún sitio** (0 apariciones): quien tenga
  el sistema en oscuro entra en claro la primera vez.
- 24 tokens semánticos por tema, con la identidad de Tinge (naranja `#FF7517`, tinta carbón
  cálido, neutros beige).
- **30 hex sueltos** fuera de los bloques de tokens, entre ellos `#F2F4F7`, `#DCE1E8` y `#202631`
  —restos del gris azulado que la paleta de marca vino a sustituir— y `#fff` (11 usos).
- Los estados (`--sc-ok-*`, `--sc-warn-*`, `--sc-bad-*`) existen y son correctos, pero **no hay
  token de `info`**, y `--ui-state-danger` / `--ui-state-error` / `--ui-state-depleted` /
  `--ui-badge-promo` / `--ui-trend-negative` / `--ui-state-inactive` son **seis alias del mismo
  `--offer`**: seis nombres, un color, ninguna diferencia semántica real.

### 2.5 Elevación y sombras

- 12 sombras distintas computadas en pantalla; 3 tokenizadas (`--sc-sombra-card/-menu/-hoja`),
  el resto escritas a mano.
- **Defecto medido:** dos piezas usan
  `box-shadow:0 12px 32px color-mix(in srgb, var(--sc-canvas) 55%, transparent)` — el renombrado de
  categoría (línea 4084) y el toast (línea 2815). `--sc-canvas` en claro es **`#F5F1EC`**, un
  crema: la sombra es **crema sobre crema, invisible**. En oscuro sí funciona (canvas `#14110F`).
  Resultado: en claro, un popover y los avisos flotantes no se separan del fondo por elevación,
  sólo por su borde.
- No hay escala de elevación nombrada (nivel 0/1/2/3), sólo tres sombras con nombre de pieza.

### 2.6 Layout y responsive

- Shell propio: barra lateral de 232 px con modo riel de 68 px (`--sc-sidebar-w`, `--sc-rail-w`),
  cabecera de 68 px (`--sc-header-h`), ancho máximo de contenido 1 580 px, barra inferior y hoja
  «Más» por debajo de 768 px. Todo tokenizado y funcionando.
- **Veintidós anchuras de viewport distintas** en la misma hoja: 359, 360, 400, 460, 480, 520,
  560, 640, 699, 700, 760, 767, **767.98**, 900 y 1023 por arriba; 700, 720, 768, 901, 1000,
  1024 y 1200 por abajo.

  > **Corrección a una cifra de la primera versión de este documento**, que decía quince. El
  > recuento de entonces mezclaba cosas que no son breakpoints: cinco `@container` —239, 419,
  > 519, 520 y 1099— que miden la caja de la rejilla de categorías y no la ventana, y dos
  > `max-height` —760 y 880— que miden el alto para que la hoja de alta quepa en pantallas
  > bajas. Los siete están bien usados y no entran en la cuenta.

  Hay pares que describen la misma frontera con dos números (`max-width:699` / `min-width:700`,
  `max-width:1023` / `min-width:1024`), tres que describen la de 768 con tres redondeos
  distintos (`767`, `767.98`, `760`), **un solape** —`max-width:700` y `min-width:700` se
  cumplen los dos a 700 px exactos— y **un hueco**: entre `max-width:900` y `min-width:901` no
  se cumple ninguna a 900,5 px.
- `@media` por capacidad —`pointer:coarse` (10), `hover:hover and pointer:fine` (4)— bien usados.
- `prefers-reduced-motion` respetado en 14 bloques.
- **Desbordamiento horizontal: 0 px** en las ocho pestañas a 1440, y en Platos / Ofertas / Marca /
  Ajustes a 375 y 320. El trabajo de septiembre sobre los 320 px se nota.

### 2.7 Accesibilidad — medido, no supuesto

**Contraste** (WCAG 2.2 AA, 4.5:1 texto normal / 3:1 texto grande), ocho pestañas × dos temas:

| Hallazgo | Ratio | Veredicto |
|---|---|---|
| `button.save`, `.adm-btn-guardar`, `.adm-alta-si` (crema sobre naranja de marca) | 2,65 claro / 2,31 oscuro | **Excepción aprobada por el propietario**, documentada en el CSS y medida por la prueba `E2E-TE-CONTRASTE` como *KNOWN EXCEPTION*, no como PASS |
| `.adm-modal[data-tono="peligro"] .adm-modal-si` — el botón **«Retirar»** | 5,54 claro / **2,23 oscuro** | **Fallo real.** Sólo aparece montando el modal a mano: oculto, ningún barrido lo ve |

Todo lo demás pasa. Es un resultado muy por encima de lo habitual.

> **Dos correcciones a este documento, de la propia auditoría.** Una primera pasada marcó tres
> fallos más (`span.n`, `.adm-btn-txt`, `.adm-vermas-txt`) que **no existían**: el medidor
> parseaba mal `color(srgb r g b / a)` —componentes de 0 a 1, no de 0 a 255— y no componía las
> capas translúcidas antes de comparar. Corregido el medidor, esos tres pasan. Queda escrito
> porque el error es fácil de repetir y porque un número inventado en un informe de
> accesibilidad es peor que no tenerlo.

**Defecto de tema reproducible** (el más grave que ha aparecido):

> Al cambiar de tema con el selector del propio panel **sin recargar**, el `background-color` de
> los controles con `transition:background` **se queda con el valor del tema anterior**, mientras
> que el `color` del texto sí cambia. Resultado medido: el botón «Añadir plato» de la cabecera
> queda con texto `#F5EFE8` sobre fondo `#FFFDFB` → **1,13:1**, ilegible, hasta que se recarga.
> Verificado que la causa es la transición: forzando `transition:none` sobre el elemento, el
> fondo salta de inmediato al valor correcto. Afecta también a `.adm-vermas-txt` y al propio
> selector de tema.

**Objetivo táctil.** El criterio 2.5.8 (24×24 px) se cumple salvo tres casos:
`input.adm-pct-num` (16 px de alto, Ofertas y Precios), un `<button>` de 15 px de alto en
Publicidad y un `<input>` de 18×18 en Publicidad. La preferencia de 44 px está trabajada aparte,
con halos `::before` sólo en `pointer:coarse`, dimensionados uno a uno al hueco real del vecino y
con la cifra escrita al lado de cada regla; el techo lo pone el layout, y está documentado.

**Foco.** 54 reglas `:focus-visible`. Ningún `outline:none` queda sin sustituto. Pero el anillo
está escrito seis veces distinto:

```
27×  outline:2px solid var(--sc-primary)
 9×  outline:2px solid var(--accent)        ← color de MARCA del cliente, no del producto
 3×  outline:2.5px solid var(--accent)
 2×  outline:2.5px solid var(--sc-primary)
 1×  outline:2.5px solid var(--p-accent-stroke)
```

con tres offsets (2px ×21, 1px ×11, -2px ×10). No hay token de foco.

### 2.8 Salud del CSS

| Métrica | Valor |
|---|---|
| Bloques de reglas | 1 518 |
| Declaraciones | 5 570 |
| Selectores repetidos (mismo texto, más de un bloque) | 179 |
| Bloques **idénticos verbatim** (mismo selector y mismo cuerpo) | 14 |
| `!important` | 4 (2 de ellos en el parche de días de Ofertas del 11 sep) |
| Selectores con `#id` | 6 |
| Especificidad | 718 reglas de una clase, 509 de dos, 200 de tres, 60 de cuatro o más |
| **Reglas muertas encontradas después** | **11**, y dos breakpoints que sólo existían para vestirlas |

La especificidad está sana. Lo que no lo está es la **repetición**: el mismo selector redefinido
en cuatro sitios distintos del fichero es exactamente la trampa que el relevo del 11 de septiembre
documenta («el último `@media` gana siempre es una simplificación falsa»).

### Código muerto, que esta auditoría no vio y apareció al trabajar

Ninguna de las métricas de arriba detecta una regla que **no puede aplicarse a nada**. Aparecieron
tres casos, los tres al ir a mover un breakpoint y preguntarse a qué afectaba:

| Qué | Cómo se comprobó | Qué se hizo |
|---|---|---|
| `.dt-bento` y `.dt-baldosa` (9 reglas) | cero apariciones en el HTML servido; ningún PHP del motor las emite. El comentario del propio código ya decía que Analítica había dejado de usar su rejilla propia | borradas, y con ellas el breakpoint de **720 px**, que existía sólo para ponerlas a tres columnas |
| `.adm-4col` (2 reglas) | `querySelector` no la encuentra en ninguna pestaña; ningún PHP la emite | borradas, y con ellas el umbral de **480 px** |
| `@media (max-width:400px){.head h1 .dia{…}}` | medido a 399 px con la media query cumpliéndose: la regla **no** se aplica. La pisa `.card-main .head h1 .dia`, con más especificidad y sin condición de ancho | se queda: sólo gobierna la pantalla de acceso, que no se ha revisado. Anotado |

**La lección, para la próxima auditoría:** contar reglas, selectores y `!important` no dice nada
sobre si una regla pinta algo. La pregunta «¿a qué afecta esto?» —resuelta con `querySelector`
sobre el documento real, no leyendo el CSS— encontró en una tarde once reglas y dos breakpoints
que llevaban ahí sin hacer nada.

---

## 3. Inventario de componentes detectados

Del marcado y de las 68 secciones comentadas de la hoja:

**Shell** · barra lateral (completa / riel) · cabecera con título de pantalla y acciones · barra
inferior móvil · hoja «Más» · selector de tema segmentado · tooltips de navegación.

**Controles** · `.adm-btn` (+ `-fino`, `-guardar`, `-quitar`, `-ver`, `-archivo`) · botón de icono
(`.camara`, `.adm-foto-b`, `.adm-mas-b`) · `.adm-campo` (input/select/textarea) · interruptor
(`.adm-sw`, «SocialCard V5: EL interruptor») · casilla píldora (`.tick`) · chips (`.adm-chip`,
`.adm-kpi`) · `.adm-pct` (porcentaje con atajos) · buscador combo (`.combo`) · píldoras de día
(`.adm-dia`) · calendario · campo de fichero · selector de color.

**Composición** · tarjeta `.card-main` · fichas `.adm-f` (bento) · rejilla de platos (fila en
escritorio, dos líneas en móvil) · lista de categorías · baldosas de cifra y barras (Analítica) ·
podio del juego · registro de accesos.

**Retroalimentación** · toast (`.toast`) · modal (`.adm-modal-caja`) · hoja de alta
(`.adm-alta-hoja`) · confirmación única para todo el panel · avisos de acción sensible · insignia
de demo · estados vacíos (`.vp-vacio`, `.adm-*-vacio`).

**Lo que NO existe como componente** y el encargo pide: tabla de datos propiamente dicha (hay
listas y rejillas, no `<table>` con cabecera fija ni orden por columna), paginación, acciones en
lote, breadcrumb, avatar, drawer lateral (la hoja «Más» es móvil), skeletons de carga, estado de
error de pantalla, estado «sin resultados» diferenciado del vacío, y estado offline.

---

## 4. Lista de problemas, ordenada por lo que cuesta y lo que da

### Bloque A — defectos reales, verificados, baratos de arreglar

| # | Problema | Evidencia | Riesgo del arreglo |
|---|---|---|---|
| A1 | Cambiar de tema sin recargar deja fondos del tema anterior; «Añadir plato» queda a 1,13:1 | medido en navegador, causa aislada (la transición) | bajo |
| A2 | Sombra crema sobre crema: popover de renombrar y toast sin elevación en claro | `color-mix(… var(--sc-canvas) 55% …)` líneas 2815 y 4084 | bajo |
| A3 | El botón «Retirar» del cuadro de confirmación destructiva, a 2,23:1 en oscuro | medido montando el modal a mano | bajo |
| A3b | La flecha desactivada de la tira de secciones se queda a `opacity:1`: parece activa | misma causa que A1, transición pegada al arrancar | bajo |
| A4 | Sin `prefers-color-scheme`: el sistema en oscuro entra en claro | 0 apariciones en la hoja | bajo, pero **cambia el estreno** para usuarios actuales |
| A5 | Controles de formulario que no heredan tipografía (13,3333 px) | 4 visibles | bajo |
| A6 | 3 objetivos por debajo de 24 px | `.adm-pct-num` y dos de Publicidad | medio (layout apretado) |

### Bloque B — deuda de sistema (lo que el encargo pide de verdad)

| # | Problema | Alcance |
|---|---|---|
| B1 | No hay capa primitiva de color; los semánticos llevan el hex dentro | 48 valores (24 × 2 temas) |
| B2 | Cuatro vocabularios de token solapados sin regla de cuál usar | 109 definiciones |
| B3 | Tres escalas de radio, cuatro valores con decimal fuera de escala | 194 declaraciones `border-radius` |
| B4 | Dos escalas de espaciado (Fibonacci de la carta vs 4/8 del prototipo) | 191 `gap` + 232 `padding` + 125 `margin` |
| B5 | 15 px fuera de escala en 10 reglas; sin jerarquía tipográfica nombrada; px en vez de rem | 235 `font-size` |
| B6 | Sin token de foco; seis variantes de anillo; 12 usan el color de MARCA del cliente | 42 reglas |
| B7 | Sin escala de elevación; 12 sombras, 3 con nombre | 12 |
| B8 | 22 anchuras de viewport, tres redondeos para la frontera de 768, un solape en 700 y un hueco en 900 | 96 `@media` |
| B9 | Seis alias `--ui-state-*` para un solo color; falta `info` | 6 |
| B10 | 30 hex sueltos, entre ellos restos del gris azulado retirado | 30 |
| B11 | 179 selectores repetidos, 14 bloques idénticos verbatim | 1 518 bloques |
| B12 | ~410 KB de CSS en línea, no cacheables, en cada carga del panel | 1 fichero |

### Bloque C — lo que el encargo pide y hoy no existe

Tabla de datos con cabecera y orden · paginación · acciones en lote · breadcrumb · avatar ·
drawer de escritorio · skeletons · estado de error de pantalla · «sin resultados» ·
offline · documentación de sistema.

---

## 5. Propuesta de normalización

**Principio rector, y se sostiene todo sobre él:** el panel es **producto de SocialCard**, la
carta es **del cliente**. Lo que cambia por cliente son datos (`cliente.mjs`, `carta.mjs`, el
color de marca); lo que no cambia nunca es el comportamiento del motor. El Design System del
panel tiene que ser **igual para los tres restaurantes y para el que venga**.

De ahí salen las decisiones:

1. **Capa primitiva nueva, sin tocar la de la carta.** Se añade `--color-neutral-*`,
   `--color-orange-*`, etc., y los `--sc-*` existentes pasan a **apuntar** a ellos. Ni un nombre
   de token semántico cambia: las 5 570 declaraciones del panel siguen diciendo lo que decían.
   Es la misma maniobra que ya hizo la V1 cuando redirigió los ocho tokens de `.card-main`.
2. **Una sola escala de espaciado para el panel**, 4/8 como pide el encargo, construida sobre
   `--space-*`, que ya existe y ya es 4/8. Se **completa** (faltan 2, 6, 40, 48, 64, 80) y se
   migra Fibonacci → `--space-*` **sólo dentro del panel**. `--s1…--s7` se quedan donde están
   porque son de la carta y la carta está fuera de alcance.
3. **Una sola escala de radio**, con los decimales redondeados a la escala (6,4→6; 8,4→8;
   10,4→10; 14,4→14; 16 se queda). Es un cambio visual **de menos de 1 px** en cada pieza.
4. **Jerarquía tipográfica nombrada** encima de la escala actual, sin inventar tamaños: Display
   (24) · Heading L (20) · Heading M (16) · Body (14) · Body S (13) · Caption (12), en `rem`, con
   `line-height` y `weight` fijados por token. El 15 px de las 10 reglas se resuelve a 14 o 16
   caso por caso, midiendo antes y después.
5. **Token de foco único**, con el color de PRODUCTO (`--sc-primary`), no con el de marca.
6. **Escala de elevación** de cuatro niveles, y arreglo del crema sobre crema.
7. **Breakpoints nombrados**: 560 / 700 / 768 / 1024 / 1200, y las fronteras duplicadas resueltas
   a un solo número.
8. **Nada de esto se hace de una vez.** Cada bloque entra por separado, con la batería `fast`
   verde antes y después, y con las ocho pestañas medidas en los dos temas.

**Lo que NO se va a hacer, y por qué:**

- No se reescribe la hoja de 5 681 líneas. El riesgo es enorme y la ganancia visual, ninguna.
- No se toca `tokens.css` ni `gen.mjs` en lo que afecta a la carta.
- No se migra a React ni se instala Atlaskit (lo dice el encargo, y además rompería el build).
- No se cambia el naranja de marca ni la excepción de contraste del botón primario: es una
  decisión del propietario, medida y aprobada, y protegida por una prueba.

---

## 6. Ficheros afectados

| Fichero | Qué se toca |
|---|---|
| `motor/server/admin/index.php` | El bloque `<style>` 5041-10722. Ni el PHP, ni el marcado, ni el JS, salvo que un arreglo de accesibilidad lo exija, y entonces se dice |
| `motor.lock` | Refirmar tras cada cambio de `index.php` o `SPEC.md` (`node motor/lock.mjs --escribir`) — lo exige el build |
| `motor/server/admin/SPEC.md` | Registro de decisiones, como siempre en este repo |
| `docs/design-system/*.md` | Documentación nueva |
| `qa/inventario.json` | **Sólo si** aparece superficie nueva: `INV-01` exige que todo elemento del panel esté inventariado |

**Prohibidos:** `carta.mjs` · `cliente.mjs` · `carta.json` · todo lo que compile la carta pública ·
`2-subir/` (lo rehace el build) · el runtime de producción · cualquier carpeta de otro cliente.

---

## 7. Línea base para medir regresiones

Tomada en la copia, commit `a5c6d8b`, build `1789165714499`:

| Métrica | Valor |
|---|---|
| `npm --prefix qa run fast` | **37 PASS · 0 FAIL · 0 BLOCKED**, 6,4 s |
| `npm --prefix qa run smoke` | **17 PASS · 0 FAIL** |
| `node qa/suites/admin-e2e.mjs` | **520 PASS · 14 FAIL · 1 KNOWN · 1 NO APLICA** (535 entradas) |
| HTML servido (pestaña Platos) | 2 720 100 B · **185 940 B** con gzip |
| CSS en línea | ~410 KB en 2 bloques `<style>` |
| Elementos del DOM (Platos, 312 platos) | 21 498 |
| Desbordamiento horizontal (1440 / 375 / 320) | 0 px |
| Fallos de contraste (8 pestañas × 2 temas) | 1 aprobado + 1 real (`span.n`) |
| Bloques de reglas CSS | 1 518 |

Cualquier cambio que empeore una de estas cifras sin una razón escrita es una regresión.

### Los 14 `FAIL` de la línea base, que NO son de este trabajo

`E2E-DS-06` · `E2E-RS-TACTIL-44` · `E2E-RH-SEM-01` · `E2E-REJ-01-768` · `E2E-REJ-01-1024` ·
`E2E-MOV-01-320` · `E2E-OFR-01-320` · `E2E-OFR-02-390` · `E2E-OFR-02-768` · `E2E-OFR-04-320` ·
`E2E-OFR-04-390` · `E2E-SEC-06-1512` · `E2E-SEC-06-390` · `E2E-SU-01`

Están en el build **sin tocar** y son de tareas ajenas: dos de ellos —`E2E-RH-SEM-01` y
`E2E-OFR-02`— miden el diseño ANTERIOR de la ficha de oferta y no pueden cumplirse desde que el
propietario pidió los días circulares y «Semanal» en la misma línea, según deja escrito el
relevo del 11 de septiembre.

### Veredicto de regresión de todo el trabajo DS-2026

Comparados los dos informes completos —el build sin tocar (`a5c6d8b`) y el laboratorio con las
nueve tandas de cambios— entrada por entrada:

```
base: 535 entradas   ·   laboratorio: 535 entradas   ·   diff: sin diferencias
```

**Los mismos 520 PASS, los mismos 14 FAIL, el mismo KNOWN y el mismo NO APLICA.** Ni una
regresión, y tampoco ninguno de los 14 arreglado — que es lo esperable: ninguno depende de lo
que se ha tocado.
