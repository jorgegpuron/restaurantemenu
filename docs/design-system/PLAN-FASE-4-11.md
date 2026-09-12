# Plan para cerrar la FASE 4 (tipografía) y la FASE 11 (responsive)

**Qué es este documento.** El análisis completo de las tres deudas que quedan abiertas, con el
destino propuesto para cada valor y el riesgo de moverlo. **No se ha editado ni una línea de
`index.php` para escribirlo**: es el trabajo que se puede hacer sin tocar el fichero mientras
otra sesión lo tiene abierto.

Medido sobre el bloque `<style>` del panel en la copia de laboratorio (`a5c6d8b` más el trabajo
de DS-2026, que no tocó ningún breakpoint). Las referencias son **por selector**, no por número
de línea: las líneas se moverán cuando el fichero avance.

---

## 1. Breakpoints

### 1.1 Corrección de una cifra que di antes

Dije **27 breakpoints**. El número correcto es **22 anchuras de viewport**. Los cinco que
sobraban no son breakpoints:

| Valor | Qué es en realidad |
|---|---|
| `max-width:239px` · `max-width:519px` · `min-width:420px` · `min-width:520px` | **`@container`**, consultas de contenedor de la rejilla de categorías. Miden la caja, no la ventana: son otra herramienta y están bien usadas |
| `max-width:1099px` (una de las dos) | `@container` también |
| `max-height:760px` · `max-height:880px` | consultas de **alto**, no de ancho. Dimensionan la hoja de alta para que quepa en pantallas bajas |

Quedan **15 `max-width` y 7 `min-width`**.

### 1.2 El mapa, con peso real

Ordenado por cuántas reglas cuelgan de cada uno: eso es lo que mide el riesgo de moverlo.

| Actual | Reglas | Qué gobierna | Destino | Riesgo |
|---|---|---|---|---|
| `max-width:699px` | **42** | el panel estrecho entero: rellenos, rótulo de acciones, filtros | **700** (como `699.98`) | ninguno: ya es la frontera |
| `min-width:1000px` | **31** | la rejilla bento de Ofertas (estado, horas, enlace) | **1024** | **alto**: cambia el layout entre 1000 y 1023 px |
| `max-width:560px` | **30** | copia de seguridad, acciones de imagen, podio | **560** | ninguno: ya es la frontera |
| `min-width:901px` | **23** | los días de la oferta en su carril | **900** (pareja con `max-width:899.98`) | bajo: es una frontera propia y deliberada (11 sep) |
| `min-width:1024px` | **15** | barra lateral completa, tooltips nativos | **1024** | ninguno |
| `max-width:1023px` | 8 | contador de la barra, filtros de Platos | **1024** (como `1023.98`) | ninguno |
| `min-width:768px` | 9 | rellenos de página y tarjeta, pestañas | **768** | ninguno |
| `max-width:900px` | 6 (+7 en pareja con `min-width:700`) | la regla de la oferta apilada | **900** (`899.98`) | bajo |
| `max-width:640px` | 7 | rejilla de KPI a dos columnas | **700** | **medio**: cambia los KPI entre 641 y 699 |
| `min-width:700px` | 7 | ajuste de precios | **700** | ninguno |
| `max-width:360px` | 5 | KPI en el móvil más estrecho | **360** | ninguno: es la banda real de 320-360 |
| `min-width:1200px` | 5 | relleno de tarjeta y precios | **1200** | ninguno |
| `max-width:520px` | 3 | podio del juego | **560** | bajo |
| `max-width:359px` | 2 | rango de fechas y cabecera a 320 | **360** (`359.98`) | ninguno |
| `max-width:700px` | 2 | barra de platos sueltos | **700** (`699.98`) | **corrige un solape**: hoy `max-width:700` y `min-width:700` se pisan en 700 px exacto |
| `max-width:767.98px` | 2 | avisos flotantes | **768** | ninguno: ya está bien escrito |
| `max-width:760px` | 2 | calendario a un mes | **768** (`767.98`) | bajo |
| `max-width:480px` | 1 | rejilla de 4 columnas a una | **560** | **medio**: cambia entre 481 y 560 |
| `max-width:460px` | 1 | alérgenos a dos columnas | **560** | **medio**: cambia entre 461 y 560 |
| `max-width:400px` | 1 | el día en la cabecera | **360** o **560** | bajo, pero hay que decidir cuál |
| `max-width:767px` | 1 | rejilla de KPI | **768** (`767.98`) | ninguno |
| `min-width:720px` | 1 | baldosa ancha de Analítica | **768** | bajo |

### 1.3 Las fronteras propuestas

**Siete, no cinco.** Le di cinco en el documento anterior y el código demuestra que faltan dos:

```
360      el móvil estrecho real (320-360). Lo estrena el trabajo de los 320 px
560      móvil ancho
700      el corte grande: con barra lateral o sin ella
768      tablet
900      los días de la oferta en una línea (frontera propia, decidida el 11 sep)
1024     escritorio con barra lateral completa
1200     escritorio ancho
```

La pareja se escribe siempre igual: `max-width:N-0.02px` / `min-width:Npx`. Así no queda el
hueco de un píxel fraccionario que hoy tiene el par 700/700.

### 1.4 Cómo se hace, y en qué orden

No de una vez. Por grupos, del más seguro al más arriesgado, y **midiendo en la frontera**:

1. **Sin riesgo** (7 breakpoints): `699→699.98`, `700→699.98`, `1023→1023.98`, `767→767.98`,
   `359→359.98`, y los que ya coinciden. Verificar: nada cambia salvo el píxel del solape.
2. **Bajo** (5): `760→767.98`, `720→768`, `520→560`, `900/901` a `899.98/900`, `400`.
3. **Medio** (3): `640→700`, `480→560`, `460→560`. Cada uno exige mirar su pantalla en la banda
   que cambia — KPI entre 641-699, alérgenos entre 461-560, `adm-4col` entre 481-560.
4. **Alto** (1): `min-width:1000→1024`. Son 31 reglas de la rejilla de Ofertas. Hay que ver la
   pestaña completa entre 1000 y 1023 px, en los dos temas, antes y después. **Si no convence,
   se queda y se documenta como frontera propia**, igual que la de 900.

Medición obligatoria en cada grupo: las ocho pestañas, en los dos temas, a **359, 360, 460, 480,
520, 560, 640, 699, 700, 720, 760, 767, 768, 899, 900, 1000, 1023, 1024, 1200 px**, comprobando
desbordamiento horizontal, que ningún control se salga de su caja y que los objetivos táctiles
no se solapen.

---

## 2. Pesos fuera del sistema

El sistema son **400 · 500 · 600**. Hay **23 declaraciones** fuera: 20 en `700` y 3 en `800`.

### 2.1 Los tres `800` — decisión de identidad

| Selector | Contexto | Propuesta |
|---|---|---|
| `.adm-sidebar-logo` (aprox. 5681) | la marca «SocialCard» de la barra | **se queda.** Es un logotipo, no texto de interfaz |
| `.dt-baldosa .n` (7096, 26px) | la cifra grande de Analítica | **600**, y el tamaño a `--t0` |
| cabecera de la recepción (7370, `--t0`) | el título de la pantalla de acceso | **600** |

### 2.2 Los veinte `700`

Se reparten en tres grupos, y cada grupo tiene una respuesta distinta:

**a) Cifras con `tabular-nums`** — el peso extra les da presencia de dato:
`.pfijo` · `.vp-n`-vecinas (7574) · `.dt-cifra-n` (30px) · `.dt-pct` · `.dt-lectura` (19px).
→ **600**, y de paso los tamaños sueltos (19, 30) a `--t1`/`--t0`. El dato ya destaca por ser
la única cifra grande de su tarjeta.

**b) Versalitas con `letter-spacing`** — rótulos pequeños en mayúsculas:
6258 (`--t4`) · 7680 (`--t4`) · 8012 (10px) · 8562 (`--t3`) · 9717 (`--t3`).
→ **600**. En versalitas con letra ancha, la diferencia entre 600 y 700 no se lee; lo que la da
es el `letter-spacing`, que se queda.

**c) Énfasis dentro de texto** — «lo que está sugerido», «el globo», el combo validado:
7386 (22px) · 8574 · 8652 · 8680 · 9034 · 9143 · 9784 · 9806 · 10568.
→ **600**, salvo `.adm-alergeno[data-sugerido]` (9143), que usa el peso para **distinguir un
estado** y necesita un sustituto antes de bajarlo: ahí el peso no es decoración, es información.

**Riesgo del conjunto: bajo.** Ningún cambio de peso mueve el layout; sí cambia el color
aparente del texto, y por eso se comprueba contraste después (un 600 pesa menos que un 700 y en
gris claro puede bajar de umbral).

---

## 3. Altura de línea

**Dieciséis valores distintos**, ninguno con token:

```
1.5 (12)   1.4 (9)   1.45 (5)   1.3 (5)   1.25 (5)   1.35 (4)
1.1 (3)    1.05 (3)  1.2 (2)    1 (2)     1.55 (1)   0 (1)
40 (3)     22 (3)    20 (2)     32 (1)      ← en px, para centrar cajas de alto fijo
```

### 3.1 Los que son tipografía

Cinco tokens cubren los doce valores relativos:

| Token | Valor | Absorbe | Para qué |
|---|---|---|---|
| `--lh-corrido` | **1.5** | 1.45, 1.55 | texto que se lee seguido: ayudas, descripciones, avisos |
| `--lh-compacto` | **1.35** | 1.3, 1.4 | dos líneas en poco alto: apunte de plato, pie de KPI |
| `--lh-titulo` | **1.25** | 1.2 | títulos y nombres |
| `--lh-cifra` | **1.05** | 1.1, 1 | cifras grandes, donde el interlineado sólo estorba |
| `--lh-control` | **1** | — | el que va en una sola línea dentro de un control |

Las fusiones son las que hay que mirar: 1.45→1.5 y 1.4→1.35 mueven **una fracción de píxel por
línea**, que en un bloque de tres líneas se acumula a 1-2 px. Donde eso importe —una caja de
alto fijo— se verá al medir, y esa regla se queda con su valor y su razón escrita.

### 3.2 Los que no son tipografía

`line-height:40 · 32 · 22 · 20` y el `0` **no son interlineado**: son la forma vieja de centrar
un texto en una caja de alto conocido. No se tokenizan, se **sustituyen** por
`display:grid;place-items:center` o por `align-items:center`, que es lo que el resto del panel
ya hace. El `0` es un caso aparte: apaga el hueco de un contenedor que sólo lleva iconos.

---

## 3 bis. Estado: qué de este plan ya está hecho

| Paso | Estado |
|---|---|
| 1 · Tokens de `line-height` | **hecho** · 51 declaraciones, +1 px de documento en siete pestañas y +3 en Analítica |
| 2 · Pesos a 600 | **hecho** · 21 de 23; dos excepciones escritas (logotipo y alérgeno sugerido) |
| 3 · `line-height` en píxeles → centrado real | pendiente · quedan 10 declaraciones |
| 4 · Breakpoints, grupo sin riesgo | **hecho** · 7 valores, 35 declaraciones, y los dos defectos de cascada (el solape de 700 y el hueco de 900/901) |
| 5 · Breakpoints, grupo bajo | **hecho en 3 de 4** · `760→767.98`, `520→560` (podio) y `520→560` (atajos). El `720` **no se movió: se borró**, porque sólo existía para dos clases muertas |
| 6 · Grupo medio (`640`, `480`, `460`) | **resuelto** · uno movido, uno borrado por muerto, uno revertido con la medida |
| 7 · `min-width:1000` | **resuelto** · se queda, y pasa a ser frontera documentada |

### Lo que se midió en el grupo medio, y por qué sólo uno se movió

| Cambio | Medida | Resultado |
|---|---|---|
| `max-width:640 → 699.98` (KPI) | a 660 px: **dos columnas de 309 px**, versión compacta, pie oculto, 124 px de alto, cero desbordamiento. Antes: cuatro columnas de ~155 px | **aplicado.** Por debajo de 700 el panel ya es el diseño estrecho; los KPI ahora cambian donde cambia todo lo demás |
| `max-width:480 → 560` (`.adm-4col`) | `querySelector('.adm-4col')` **no encuentra nada** en ninguna pestaña, y ningún PHP del motor emite la clase | **borrado.** Las dos reglas eran código muerto, y con ellas el umbral de 480. Segundo breakpoint que desaparece por lo mismo, después del de 720 |
| `max-width:460 → 560` (alérgenos) | a 500 px: con el cambio salían **dos** columnas; sin él, **tres**. La rejilla base es `auto-fill minmax(152px,1fr)` y se ajusta sola | **revertido.** Ese umbral no reparte columnas: fuerza dos por debajo de donde 152 px ya no caben dos veces. Moverlo quitaba una columna y alargaba la lista sin ganar nada |
| `min-width:1000 → 1024` (Ofertas) | a 1010 px la rejilla caía a **una columna de 843 px** y las tres fichas de la izquierda se apilaban bajo la vista previa | **revertido.** 24 px de ventana con el doble de scroll a cambio de un número redondo. Las 31 reglas describen un reparto de seis columnas que a 930 px de contenido entra de sobra |

**Anchuras de viewport: 22 → 15.** Y de las siete que se han ido, **dos no se movieron: se
borraron**, porque sólo vestían clases muertas.

**Dos hallazgos del grupo bajo, que no estaban previstos:**

1. **`.dt-bento` y `.dt-baldosa` estaban muertas.** El comentario del propio código ya decía
   que Analítica había dejado de usar su rejilla propia, pero las reglas seguían ahí — y con
   ellas el breakpoint de **720 px, que existía sólo para ponerlas a tres columnas**.
   Comprobado: cero apariciones en el HTML servido y ningún PHP del motor las emite. Se han
   ido las nueve reglas y el breakpoint entero. Sus hijas —`.dt-cab`, `.dt-vivo`,
   `.dt-lectura`, `.dt-barras`, `.dt-cifra-n`— siguen vivas y se quedan.
2. **El `max-width:400px` del día de la cabecera no se aplica nunca dentro del panel.** Se
   movió a 560 por simetría y se deshizo al medirlo: `.card-main .head h1 .dia` dice
   `display:inline` con más especificidad y sin condición de ancho. Medido a 399 px, con la
   media query cumpliéndose, el día seguía en línea y a 14 px. Ese breakpoint sólo gobierna la
   **pantalla de acceso**, donde no hay `.card-main`. Se ha dejado como estaba, con la razón
   escrita: tocar un breakpoint que sólo afecta a una pantalla que no he mirado es
   exactamente lo que no toca hacer.

Anchuras de viewport: **22 → 18**.

## 4. Orden de ejecución propuesto

Cuando `main` esté limpio y se pueda volver a partir de él:

| Paso | Qué | Verificación |
|---|---|---|
| 1 | Tokens de `line-height` y los 12 valores relativos | huella de geometría de los 21.498 elementos: sólo deben moverse las líneas previstas |
| 2 | Pesos: 23 declaraciones a 600, menos el logotipo y el estado de alérgeno sugerido | contraste de los 8 paneles en los 2 temas |
| 3 | `line-height` en píxeles → centrado real (4 sitios) | alto de cada caja antes y después |
| 4 | Breakpoints, grupo «sin riesgo» (7) | las 19 anchuras de la lista |
| 5 | Breakpoints, grupo «bajo» (5) | ídem |
| 6 | Breakpoints, grupo «medio» (3) | ídem, mirando la banda que cambia en cada uno |
| 7 | `min-width:1000` → decisión: mover a 1024 o documentarlo como frontera propia | la pestaña Ofertas entre 1000 y 1023 px |

En cada paso: `qa fast` y `qa smoke` antes y después, y `admin-e2e` completo al cerrar cada
grupo. Y nada de esto entra en el repositorio sin autorización expresa, ni en producción sin la
suya aparte.
