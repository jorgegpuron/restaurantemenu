# Accesibilidad — WCAG 2.2 AA

Objetivo mínimo: **WCAG 2.2 nivel AA**. Lo que sigue está medido en navegador sobre las ocho
pestañas del panel, en los dos temas, a 1440, 375 y 320 px. Donde no se ha medido, se dice.

## 1. Contraste

Umbrales: **4,5:1** texto normal · **3:1** texto grande (≥24 px, o ≥18,66 px en peso ≥700) ·
**3:1** elementos gráficos e interactivos relevantes.

**Resultado: cumple todo salvo una excepción aprobada.**

| Pieza | Claro | Oscuro | Veredicto |
|---|---|---|---|
| Botón primario naranja (`.save`, `.adm-btn-guardar`, `.adm-alta-si`) | 2,65:1 | 2,31:1 | **KNOWN EXCEPTION — OWNER APPROVED** |
| Todo lo demás, ocho pestañas × dos temas | ≥ 4,5:1 | ≥ 4,5:1 | pasa |

### Corrección: el naranja como TINTA también fallaba, en seis sitios

Esa tabla sólo mira el naranja como **relleno**. Barriendo el documento por color computado
—todo elemento cuyo `color` resuelve al primario, con las capas compuestas y el fondo efectivo
de su ancestro pintado— aparecieron **seis usos del naranja como tinta, y los seis por debajo
del umbral en tema claro**. Ninguno estaba en la auditoría anterior porque la tabla se hizo por
piezas y no por barrido, y cuatro de los seis viven en pantallas que hay que abrir.

| Pieza | Antes (claro) | Pide | Después |
|---|---|---|---|
| Icono de la barra móvil activa (`.adm-navmovil-item.on svg`) | **2,25:1** | 3:1 | 3,15:1 |
| Icono de la cámara encendida (`.camara.tiene`) | 2,65:1 | 3:1 | 3,72:1 |
| …el mismo, con el puntero encima (fondo apagado) | **2,15:1** | 3:1 | 3,02:1 |
| Su punto indicador (`.camara.tiene::after`) | 2,65:1 | 3:1 | 3,72:1 |
| Icono de «A mano, uno a uno» | 2,65:1 | 3:1 | 3,72:1 |
| Ruta de categoría del alta (`.adm-alta-ruta-cat`, texto 12 px) | 2,65:1 | 4,5:1 | 5,61:1 |
| «Obligatorio» y su marca (`.adm-alta-obl`, `.adm-alta-req`, texto 12 y 13 px) | 2,65:1 | 4,5:1 | 5,61:1 |
| **El anillo de foco** (`--focus-color`) | 2,65:1 | 3:1 | 3,72:1 |

El arreglo no es retocar ocho reglas: son **dos tokens nuevos**, `--sc-primary-grafico` (3:1) y
`--sc-primary-texto` (4,5:1), y las ocho reglas apuntan a ellos. Ver
[COLORS.md](COLORS.md) y [TOKENS.md](TOKENS.md).

**En oscuro no hacía falta tocar nada** y no se ha tocado: los dos tokens apuntan al propio
primario, y lo peor medido allí es 7,29:1.

Y el anillo de foco importa aparte: un indicador de foco entra en 1.4.11, así que su 2,65:1 en
claro era un fallo AA en el control de accesibilidad más usado del panel. Es el mismo anillo que
en septiembre se unificó para que no dependiera del color de marca; ahora también se lee.

Sobre la excepción: es **decisión expresa del propietario**, con el coste medido y aceptado. La
alternativa que sí cumplía —hundir el relleno a `#B44A08` y quedarse la crema en 4,76— se
descartó porque ese naranja quemado es el que esta paleta vino a sustituir. La carta pública
hace lo mismo en sus insignias, así que panel y carta dicen lo mismo. La prueba
`E2E-TE-CONTRASTE` la registra como excepción, **no como PASS**: una decisión documentada con un
número equivocado deja de proteger de nada.

### Cómo se mide, para que el número sea verdad

Dos errores fáciles, los dos cometidos y corregidos durante esta auditoría:

1. **`color(srgb r g b / a)` no se parsea como `rgb()`.** Sus componentes van de 0 a 1, no de 0
   a 255, y no hay número delante de `srgb`. Una lectura ingenua da ratios inventados — llegó a
   marcar un falso fallo de 1,16:1 en un título que estaba perfectamente.
2. **Hay que componer las capas translúcidas.** Un texto sobre un fondo al 14 % sobre otro fondo
   no se compara contra el 14 %: se compara contra el resultado de apilarlos.

Con las dos cosas mal, la auditoría daba tres fallos que no existían. Con las dos bien, da uno
y es el aprobado.

### Un fallo real que sólo aparece con los componentes ocultos

El modal, los avisos flotantes y las hojas **no están en pantalla** mientras no se abren, así
que un barrido normal no los ve. Montándolos a mano en un banco de pruebas apareció esto:

> `.adm-modal[data-tono="peligro"] .adm-modal-si` — el botón **«Retirar»** del cuadro de
> confirmación destructiva — iba en `color:#fff` fijo. En oscuro, blanco sobre `#FF8D87`:
> **2,23:1**. Corregido con `--sc-bad-on` (tinta carbón en oscuro, crema en claro): **8,43:1**
> en oscuro y 5,54:1 en claro.

**Todo barrido de contraste tiene que incluir los estados ocultos.** Lo que no se abre, no se
mide, y es justo donde se esconden los fallos.

## 2. Foco

- **54 reglas `:focus-visible`.** Ningún `outline:none` queda sin sustituto: los ocho que hay
  están emparejados con un anillo de `box-shadow` o con el `:focus-within` del contenedor.
- **Un solo anillo**, `outline:var(--focus-anillo)` = `2px solid var(--sc-primary)`. Antes había
  seis variantes (2 px y 2,5 px, con `--sc-primary`, `--accent` y `--p-accent-stroke`).
- El anillo usa el color de **producto**, no el de marca del cliente. Doce reglas usaban
  `--accent`: con un restaurante de marca pastel, el foco del panel se quedaba invisible. Es un
  fallo de 2.4.7 que no se veía en Tinge y aparecía en el cliente siguiente.
- El **desvío** no se unifica (2, 1 y −2 px): cada uno está dimensionado al hueco real de su
  pieza, y unificarlos haría que un anillo pisara al vecino.

## 3. Objetivo táctil

Criterio 2.5.8 (AA) pide **24×24 px**. La preferencia del proyecto es **44×44** donde el layout
lo permita sin riesgo de solapamiento.

- Con dedo (`pointer:coarse`) se activan **halos `::before`** invisibles que agrandan sólo la
  zona que responde al toque: ni el dibujo ni el layout se mueven un píxel.
- Cada halo está dimensionado al **hueco libre real hasta el vecino tocable más cercano**,
  tomando el mínimo sobre las 271 instancias de las ocho pantallas y dejando 1 px de margen.
- **Un halo que invade al vecino manda el toque al control equivocado, y eso es peor que un
  objetivo pequeño.** Por eso `.adm-retirar-b` —que RETIRA un plato de la carta— se queda en
  34×35 a propósito, con la cifra escrita al lado: tiene un vecino a 4 px.
- Sólo `.adm-btn` llega a 44×44. En el resto el techo lo pone el layout; subir de ahí exige
  separar los grupos, que es un cambio de densidad y decisión del propietario.

Quedan tres objetivos por debajo de 24 px, pendientes: `input.adm-pct-num` (16 px de alto, en
Ofertas y Precios), un botón de 15 px de alto en Publicidad y un `input` de 18×18 en Publicidad.

## 4. Teclado

- Navegación completa por teclado en las ocho pestañas; los destinos son `<button>` reales con
  `aria-controls` y `aria-current`.
- La hoja «Más» y los modales **bloquean el fondo** con `inert` y devuelven el foco al elemento
  que los abrió.
- `Esc` cierra hojas y modales.
- El orden de foco sigue el orden del documento; no hay `tabindex` positivos.

## 5. Semántica y ARIA

- HTML semántico primero: `<nav>`, `<header>`, `<button>`, `<ol>` para el podio,
  `<details>`/`<summary>` para lo plegable.
- ARIA sólo donde hace falta: `aria-label` en botones de icono, `aria-current="page"` en el
  destino activo, `aria-pressed` en el selector de tema, `aria-controls` en las pestañas.
- Los iconos decorativos van `aria-hidden="true"`.

## 6. Movimiento

`prefers-reduced-motion` respetado en 14 bloques: se apagan las entradas, el `scale(.98)` de
pulsación y la animación de subida de foto. El movimiento del panel sólo existe para explicar un
cambio de estado; no hay animación decorativa.

## 7. Estados que no se dicen sólo con color

- Éxito, aviso y error llevan **fondo, tinta y texto**, no sólo un color.
- El plato agotado se marca con interruptor **y** rótulo.
- Pendiente: los errores de formulario deberían decir siempre **qué pasó, dónde y cómo
  arreglarlo**, y hoy no todos lo hacen. Ver [COMPONENTS.md](COMPONENTS.md).

## 8. Zoom

A 400 % (equivalente a 320 px) el contenido sigue disponible sin scroll en dos ejes: 0 px de
desbordamiento horizontal medido. Con la escala en `rem`, la preferencia de tamaño de letra del
navegador ya afecta al panel.

## 9. Lo que falta por comprobar

- Lectores de pantalla reales (NVDA / VoiceOver): **no se ha probado**. Las medidas de aquí son
  de contraste, geometría y semántica del DOM.
- Recorrido completo de teclado en los formularios largos de alta de plato.
- Los tres objetivos por debajo de 24 px.
- Mensajes de error de formulario, uno a uno.
