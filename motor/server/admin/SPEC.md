## Lo marcado va en gris; el naranja se guarda (5 Sep 2026)

Regla de color para todo el panel, y la razón no es de gusto: **con veinte platos elegidos,
veinte pastillas naranjas no destacan nada. Destacan todas, que es no destacar ninguna.**

El acento queda para dos sitios y ninguno más:

- **los detalles** — el icono de cada ficha, el punto que late de Analítica, el aro de foco;
- **el botón que cierra la faena** — Guardar, Publicar, y el interruptor que enciende la
  oferta, que es la misma clase de decisión.

Todo lo que es **elegir o marcar** va en el gris de los textos secundarios, el mismo con el
que ya se pintan las barras de Analítica: los siete días, las categorías enteras, la casilla
de un plato en oferta, la fila elegida en Destacados, sus etiquetas y las insignias de los
acordeones. Cuatro tokens nuevos en `.adm-board` —`--marca-fondo`, `--marca-ink`,
`--marca-velo` y `--marca-borde`— para no repetir el valor en catorce reglas.

El efecto se ve al entrar en Ofertas con media carta marcada: antes la pantalla era naranja
de arriba abajo y el botón de guardar se perdía dentro; ahora lo único naranja de la pantalla
es ese botón, que es donde hay que ir.

## Destacados, y la capa de transición se retira: las ocho migradas (5 Sep 2026)

Octava y última. Es la pestaña más pequeña —una lista corta y un formulario de tres
controles—, así que va en **una sola ficha**: lo que hay puesto arriba y, debajo de un
filete, la fila para añadir. Dos cajas para tres controles habría sido inventarse estructura.
Es también la única pestaña **sin tira de acciones**, junto con Analítica: cada destacado se
añade y se quita con su propio botón, al momento, y no hay nada que «guardar» después.

**Dos caminos para elegir el plato, y uno solo donde se decide.** El buscador es el camino
rápido cuando ya sabes cuál quieres; debajo van los 312 platos plegados por categoría, como
en Agotados y Ofertas, para el que llega sin nombre en la cabeza. Antes destacar algo
obligaba a acordarse del nombre antes de escribirlo.

**Al tocar un plato, las etiquetas se abren debajo de ÉL.** En pleno servicio, mandar la vista
de vuelta al campo de arriba para elegir la etiqueta y luego volver a bajar era el paso que
sobraba: la decisión que falta se toma donde se está mirando. Se pulsa la etiqueta y queda
destacado, sin más pasos.

El formulario de etiquetas es **uno solo para las 312 filas**: el JavaScript lo mueve debajo
de la que se toca y le escribe la clave del plato. Repetirlo por fila serían 312 formularios
y 1.872 botones metidos en el HTML para usar uno. Sin JavaScript no se mueve de su sitio y
sigue sirviendo: se elige el plato con el buscador de arriba, que es como funcionaba antes.

Y una trampa de orden: ese formulario se pinta **después** del `<script>` que lo usa —está en
la lista de abajo, no en la ficha—, así que al parsear todavía no existe y
`getElementById` en el arranque devolvía `null` sin decir nada. Se busca cuando hace falta, no
al arrancar.

El campo de arriba se rellena igual al tocar un plato: los dos caminos acaban en el mismo
sitio y se ve cuál está elegido mires donde mires. Lo que ya está destacado no se puede volver
a elegir —lo dice su etiqueta— y lleva su propio Quitar, para no tener que subir a la lista de
arriba.

El buscador de plato traía `background:#fff` escrito a mano y la tipografía de la carta:
sobre la tarjeta oscura era una caja blanca. Ahora usa los tokens como todo lo demás, y el
`<select>` de la etiqueta pierde la flecha de fábrica y lleva la misma que los acordeones —
con el color escrito, porque un `data:` URI no hereda `currentColor`.

**Y con esto se retira la capa de transición.** Era la regla que devolvía la paleta clara a
las pestañas sin migrar y las dibujaba como isla:
`.pane:not([data-pane="publicidad"])…` con siete `:not()` encadenados. Ya no queda ninguna
sin migrar, así que se ha ido entera: el oscuro se hereda de `.card-main` y ninguna pestaña
necesita excepción. Medido en el navegador con las ocho abiertas: fondo transparente,
`color: #EDEBEB`, `padding: 0` en las ocho, y **cero componentes del sistema viejo** —ni una
`.card`, `.sec-body`, `.bar`, `.tools` ni `.chips`— en ninguna.

Si algún día se añade una pantalla nueva sin migrar, el sitio de esa regla está señalado con
un comentario para volver a ponerla y quitarla cuando toque.

## Agotados en bento, y por qué el marcado no lleva el acento (5 Sep 2026)

Séptima pestaña. Es la que se usa **de pie y con prisa**, a media faena: «se ha acabado la
sopa de lentejas». Por eso lo primero y más grande es el buscador, y lo segundo la fila que
dice cuántos hay marcados ahora mismo con su botón de quitarlos todos —que no existe hasta
que hay algo marcado: una fila que dice «0» es ruido.

Los 312 platos van plegados **por categoría**, como en Ofertas, y con la misma regla: el
acordeón con resultados se abre solo al buscar y se vuelve a cerrar al vaciar. La insignia
del resumen dice «N agotado(s)» para que un acordeón cerrado no esconda una baja.

**Marcado NO se pinta con el naranja de la marca.** En las demás pestañas el acento dice
«esto está elegido»; aquí decir «elegido» con el color de la marca es celebrar una baja. Un
agotado se tacha —como en la carta— y se pinta con el rojo de aviso, que es lo que es. El
`tick` marcado también va en rojo.

Dos cosas que había que rehacer al mover los controles fuera del `<form>`:

- El oyente de cambios pasa al pane, como en Ofertas: con `form="agotados-form"` los
  controles ya no cuelgan del formulario.
- **El recortador de fotos leía el csrf de `document.getElementById('f')`**, el formulario
  viejo. Al desaparecer ese id, el script moría con `ReferenceError: form is not defined` y
  se llevaba por delante la cámara de los 312 platos. Ahora lo lee de `agotados-form`. La
  foto se sigue subiendo sola, sin pasar por el Guardar de la pestaña: son cosas distintas y
  mezclarlas obligaría a guardar los agotados para cambiar una foto.

Comprobado guardando: marcar Papadum deja en `estado.json` sus cuatro claves —la del plato,
la de su gemelo vegano y las dos heredadas— con la fecha de hoy, y no toca oferta, precios
ni marca. El aviso de «sin guardar» del `beforeunload` sigue saltando al salir con cambios
sin publicar.

## Ofertas en bento: los días son parte del «cuándo» (5 Sep 2026)

Sexta pestaña, y la más grande del panel: un interruptor, un descuento, una franja horaria,
siete días, cuarenta categorías y 312 platos. En una columna era un rollo de papel.

Arriba, **una sola ficha**: el chip de estado, la frase del reloj, y en una fila el
interruptor, el descuento y las dos horas, con los siete días debajo. Empezó en tres fichas
—Estado, Cuánto y cuándo, Días— y se fueron fundiendo por la misma razón las dos veces: una
oferta del 25% de 17:00 a 19:00 los lunes y martes es **una sola frase**, y repartirla en
cajas obliga a leerla a saltos. Ahora se lee de izquierda a derecha como se dice. El
interruptor lleva rótulo como los otros tres, o sería el único control sin nombre de la fila.

Debajo, las categorías, y los platos agrupados por pestaña de la carta, una ficha por
pestaña, igual que en Precios.

**Las categorías se quedan sueltas y a la vista; lo que se pliega son los platos.** Se
probó al revés —categorías en acordeón, platos en fichas por pestaña— y era el reparto
equivocado: cuarenta categorías son cuarenta decisiones de una pulsación y hay que verlas
todas de golpe para comparar; los 312 platos son lo que de verdad hacía scroll.

Los platos van en **acordeones cerrados, uno por categoría**, con la pestaña de la carta
debajo del nombre —los nombres de categoría se repiten: hay «Sopas» en más de una—. Lo único
que un acordeón cerrado no puede esconder es que dentro haya algo en oferta: por eso el
resumen lleva su insignia «N en oferta» y el borde se tiñe, y la insignia se recalcula al
marcar. Y al buscar se abren solos los que tienen resultados y se vuelven a cerrar al vaciar
la búsqueda: un buscador que encuentra algo y lo deja plegado no ha encontrado nada.
Comprobado guardando con los cuarenta cerrados: `<details>` cerrado esconde, no saca del
formulario.

**Los días son siete círculos con la inicial y, al final, «Semanal».** Una semana entera cabe
de un vistazo, cada círculo es un blanco de 46 px, y la oferta de todos los días —que es la
mitad de los casos— deja de costar siete toques. «Semanal» enciende los siete o los apaga los
siete, y se apaga solo en cuanto se quita un día.

**La regla entera va en una fila y en el orden en que se dice**: descuento, horario, días y,
al final, encendida o no. Encender es lo último que se hace, no lo primero, y así se lee de
corrido: «un 25%, de 17:00 a 19:00, lunes y martes, encendida». Las dos horas son UN dato y
van juntas con una flecha en medio: separadas por el mismo hueco que todo lo demás se leían
como dos campos sin relación.

**La frase del reloj cierra la ficha a todo el ancho, con su filete.** Es un dato de lo que
está pasando, no el pie de ningún control, y hace juego con el chip de la cabecera, que dice
lo mismo en una palabra. Colgada debajo del interruptor —que fue el paso anterior— estiraba
esa columna y dejaba las otras tres cojas.

**La fila entera es la etiqueta.** Antes la casilla era un cuadrado de 20 px dentro de la
fila; ahora el `<label>` envuelve todo y se marca tocando donde sea. En el móvil de una
cocina, acertar en 20 px es el motivo por el que nadie marca nada.

Dos trampas del mismo día, las dos de flexbox y las dos medidas:

- La casilla del descuento reutiliza la del porcentaje libre de Precios, que vive en una fila.
  Dentro de la ficha, que es un flex en **columna**, `flex-basis` mide el ALTO: la casilla se
  estiraba a 140 px de alto. Ancho explícito y `flex:none`.
- El subtítulo del plato iba en un flex en columna y, como item flex, no bajaba de su
  contenido mínimo: «Especialidades · Mango Chicken» se recortaba a 84 px. En bloque envuelve
  solo. Y por debajo de 700 la fila entera envuelve, el precio baja a su línea y el nombre se
  lleva el ancho — más `overflow-wrap:anywhere` por si aparece una palabra imposible.

Los controles viajan con `form="ofertas-form"`, así que **el oyente de cambios va en el pane
y no en el formulario**: los controles ya no cuelgan de él y un listener en el `<form>` no
vería ni un cambio.

Y la trampa cara del día, que va aquí para que no se repita: en el bucle de los acordeones
se llamó `$dentro` a la variable que cuenta los platos en oferta. **`$dentro` es el flag de
sesión del panel** (`$dentro = !empty($_SESSION['ok'])`). Al pisarlo, el `<?php if ($dentro) ?>`
del final del fichero pasó a evaluar un entero y la página se quedó sin su último bloque —la
capa de ayudas y el script del sistema— **sin dar ni un error**: PHP no avisa, `php -l` pasa,
y lo que se ve es que los globos de ayuda y las tiras dejan de funcionar. Cuando algo del
final de la página desaparezca sin error, buscar quién ha reutilizado el nombre de una
variable global. Es la misma familia que `function top()` pisando `window.top`. El filtro «Todos / Sólo marcados» reutiliza el selector de periodo de
Analítica, que es el segmentado del sistema.

Comprobado guardando: encendida, 25%, 17:00–19:00, lunes y martes, dos categorías y un plato
suelto quedaron en `estado.json` sin tocar marca, juego ni precios. Marcar una categoría sigue
atenuando y desactivando sus seis platos.

## Precios: bento, +1% y +3%, y la lista a mano (5 Sep 2026)

Quinta pestaña migrada, y la primera del rediseño que además **añade función**. Por eso ésta
sí pasó por el protocolo: diseño, allowlist y autorización antes de tocar nada.

**Dos pantallas, las mismas piezas.** *Elegir* —de dónde sale el cambio— en dos fichas:
«Cambiar precios», con los dos caminos dentro, y la lista de lo que ya está fuera del precio
de la carta con su fila roja de volver atrás. *Revisar* —los 293 platos con precio, agrupados
por pestaña de la carta, una ficha por pestaña—. Al entrar en Revisar la botonera se esconde
(eso ya lo hacía): es un modo de tarea del que se sale por Cancelar, no por descuido.

**Los dos caminos viven en la MISMA ficha**, uno al lado del otro y separados por un filete,
no por una caja. Empezaron en dos fichas y eso los contaba como dos cosas distintas: no lo
son, son dos formas de llegar a la misma lista. Por eso lo primero que se lee, encima de los
dos, es a dónde llevan los dos: «las dos abren la misma lista para revisar; en la carta no
cambia nada hasta que pulses Publicar». Cada camino lleva su rótulo con icono —«A todos, un
porcentaje» y «A mano, uno a uno»— y su botón al mismo alto, para que se vean como dos
opciones y no como un formulario con apéndice. Por debajo de 820 px se apilan y el filete
pasa de vertical a horizontal.

**Los atajos son cuatro: +3, +5, +10 y +15.** El +1% se probó y se quitó: el motor redondea a
múltiplos de 5 céntimos, así que un plato de 1,00 € sube a 1,01 y vuelve a 1,00. Un atajo que
en media carta no hace nada no es un atajo, es una duda. Quien de verdad quiera un 1% lo
escribe en «Otro porcentaje» y ve en la lista lo que se mueve y lo que no.

**El precio a mano es una rama nueva del servidor, no una validación relajada.** Cambiar UN
precio obligaba a aplicar antes un porcentaje a los 293 platos y deshacer 292: la lista
editable ya existía, lo que no había era forma de abrirla sin subir nada. `precios_manual`
monta la misma propuesta con `'pct' => null` y `'nuevo' => $actual`. **`precios_calcular` se
queda exactamente igual**, con su `0 < pct <= 50`, y `precios_publicar` no se toca: mismo
guardado, misma extensión a las filas hermanas, mismo trato del campo vacío como «vuelve al
precio de la carta». El esquema de `estado.json` no cambia.

`pct === null` es la señal de «aquí no se ha calculado nada»: la ficha cambia el rótulo, el
icono —lápiz en vez de flecha— y no habla de redondeo, porque no ha redondeado nada.

**Con 293 platos, el buscador no es un extra: es lo que hace usable la función.** Filtra por
nombre o por número, y esconde la ficha entera cuando no le queda ninguna fila, para que no
queden trece cabeceras vacías. Es sólo JavaScript: sin él la lista se ve completa y el
servidor sigue completando las filas hermanas al publicar, como ya hacía.

Dos detalles de forma. En pantalla ancha las listas van a dos columnas —326 filas en una sola
dejaban medio panel vacío—, y esa regla, que colgaba de `.card`, ahora cuelga de
`.adm-precios`. En estrecho la fila se parte en dos líneas —número y nombre arriba, los dos
precios debajo— porque en una sola el nombre se quedaba en 42 px y «Salsa o encurtido a
elegir» salía como «Sal…». Es la misma forma de partir una fila que ya usaban el podio del
juego y la lista de platos de Analítica: una sola, no tres.

Y un icono que se cambió por multicliente: la ficha de precios cambiados llevaba un símbolo
del dólar. La moneda la pone el cliente (`CLIENTE_MONEDA`), así que va una etiqueta de precio,
que no habla de ninguna divisa.

## Analítica en bento, y por qué el naranja al 26% no vale sobre negro (5 Sep 2026)

Cuarta pestaña migrada. Ésta ya venía con rejilla propia —`dt-bento`, `dt-baldosa`— porque
nació después que las demás, así que migrarla no ha sido rediseñar: ha sido **quitarle** su
rejilla y sus baldosas y dejar que use las del panel, que hacen lo mismo. Lo de dentro —las
barras, el globo que sigue al dedo, el chip de variación y las filas de platos— se queda tal
cual: es de esta pantalla y de ninguna otra.

Cinco fichas: la gráfica cruzando el ancho, las tres cifras a tercios iguales debajo —son el
mismo dato en tres ventanas y ninguna manda sobre otra— y los platos otra vez a todo el
ancho, que es una lista. **Es la única pestaña sin tira de acciones**: aquí no se guarda
nada, así que no hay formulario ni botón de guardar.

Dos bloques dejaron de ocupar caja y pasaron a un globo de ayuda: «son móviles, no clientes»
y la letra pequeña de los porcentajes. Los tres datos del pie —desde cuándo se cuenta, cuánto
va contado y cuántos meses se guardan— sí siguen a la vista, debajo del eje.

**Las barras van en gris, no en el naranja de la marca.** Dos pasos y los dos aprendidos
midiendo. Estaban en `color-mix(in srgb, var(--accent) 26%, transparent)`, que sobre la
tarjeta crema daba un melocotón claro; sobre negro, naranja al 26% **no es naranja claro: es
marrón** —es exactamente lo que sale de mezclar naranja con negro— y treinta barras marrones
son una textura, no un dato. Pero subir el naranja tampoco valía: treinta barras a todo color
son mucho acento para una pantalla que sólo se lee. Se pintan con `var(--base)`, el gris de
los textos secundarios, que es lo que son: información, no aviso.

El acento se guarda para donde dice algo: el punto que late, el chip de variación y **la
barra que se está leyendo**, que es la única naranja del gráfico. Ésa iba en `var(--ink)`,
blanco, porque sobre crema el blanco era el máximo contraste posible; sobre un gráfico gris
apagado, lo que la separa de las otras veintinueve es el color. Al recorrer, el resto baja a
`rgba(237,235,235,.14)` y las dos vecinas a `.34`. La barra de la fila de un plato lleva el
nombre encima, así que se queda en `.10`: es un fondo que mide, no un bloque que compite.

La cifra de cada ventana va a `--t1`, sin inventar un cuarto tamaño. Una ficha con un
título, un chip y un número no necesita más para que se sepa cuál de los tres es el dato.

Y dos arreglos de estrecho, medidos a 375: el selector de periodo medía 265 px dentro de una
ficha de 250 y sacaba 13 px de scroll a toda la página; y el nombre del plato se quedaba en
89 px —«Arroz basmati hervido» recortado a «Arroz bas…»—. Ahora la fila se parte en **dos
líneas fijas** —puesto y nombre arriba, consultas y porcentaje abajo a la derecha— y no
«donde caiga»: dejándolo al azar del flex, el 125 se quedaba junto al nombre y el 21% bajaba
solo, y ninguna de las diez filas quedaba igual que la anterior.

Nota de método, que ya ha costado tres vueltas: **`getComputedStyle` leído justo después de
cambiar una clase devuelve el valor viejo** si la propiedad tiene `transition`. Las barras,
el globo y la pastilla del periodo parecían no aplicar su regla y aplicaban. Para estados con
transición, la comprobación buena es la captura, no la medida instantánea.

## Juego en bento, y la fila con acción como pieza del sistema (5 Sep 2026)

Tercera pestaña migrada, y la más pequeña. **Una sola ficha, a todo el ancho.** Empezó con
dos —Estado a la izquierda, el marcador a la derecha— y sobraba: una caja con borde para un
interruptor solo es marco sin cuadro. El interruptor vive ahora arriba del marcador, en su
propia fila, y dice **ON** u **OFF** y nada más: la frase larga la cuenta la línea de abajo
de la misma fila, y repetirla al lado del interruptor era decirlo dos veces. Encender el
juego y mirar quién va ganando son la misma pantalla.

Esa fila va **sin fondo**, al contrario que las del podio: con el mismo chip se leía como
una cuarta entrada de la lista, y es el control, no un dato.

Con dos fichas hizo falta durante un rato `align-items:start` sólo en este pane, porque
estirar Estado hasta el alto del marcador dejaba 204 px vacíos dentro de una caja con
borde. Al fundirlas, la excepción se cayó sola: **todos los panes vuelven a igualar
alturas**, que es la regla del sistema.

**La fila con acción deja de llamarse copia.** `.adm-copia*` nació para las copias de
seguridad de Marca y resultó ser la forma que pedían también el podio y el «vaciar el
marcador»: una línea que dice algo y trae uno o dos botones al final. Pasa a `.adm-fila`,
`.adm-fila-txt`, `.adm-fila-que`, `.adm-fila-dato`, `.adm-fila-peligro` y `.adm-filas`. El
podio es una `.adm-fila` con dos cosas más: el puesto delante y la puntuación al final.

Dos detalles de la columna de puntuaciones, los dos medidos:

- El botón «Quitar nombre» sólo sale si hay nombre que quitar. Sin reservarle el hueco, la
  puntuación de la fila anónima se iba **129 px** a la derecha y la columna de números
  dejaba de ser una columna. Se reserva con
  `.adm-podio > li:not(:has(button))::after{flex:0 0 128px}`.
- Por debajo de 700 px la fila envuelve sola, así que ahí el hueco reservado sólo añadiría
  una línea vacía: se quita, y la puntuación pierde su `margin-left:auto` para quedarse
  pegada a la izquierda de la línea de abajo, con botón o sin él. Medido a 375: las tres
  puntuaciones empiezan en 70 y acaban en 150.

Y dos confirmaciones que sí se hicieron guardando de verdad: el interruptor viaja con
`form="juego-form"` y deja `game.on` en `false` sin tocar `marca` ni `publicidad`; y con el
marcador vacío la ficha enseña su estado vacío, el contador dice «0 de 3» y la fila roja de
vaciar **no se pinta** — no se ofrece borrar lo que no hay.

Quedan por migrar Agotados, Destacados, Ofertas, Precios y Datos (la pestaña que se rotula
«Analítica»). Y queda CSS muerto de lo ya migrado: `.podio-admin`, `.pod-*`, `.foto-btn`,
`.foto-vacio`, `.colores-fila`, `.color-fijo*`, `.fila-accion` y las reglas de `.copias`.

## Marca en bento, y tres cosas que dejaron de ser de Publicidad (5 Sep 2026)

Segunda pestaña migrada, y la que prueba que esto es un sistema: **no lleva ni una clase
propia**. Las fichas, la cabecera con su icono, el interruptor, los campos, los botones y
la tira de acciones son los que estrenó Publicidad. Lo único nuevo es lo que aquí existe y
allí no —la galería de portadas, la muestra de color y la lista de copias—, y también va
con prefijo `adm-`.

Seis fichas: portadas, redes, color, la nota de Google, nombre y copias. **Se emparejan
por alto, no por tema.** La rejilla iguala las dos fichas de una fila, así que juntar una
alta con una baja deja un hueco muerto en la baja. Medido con el pane lleno: portadas 347,
redes 455, color 311, Google 296, nombre 271, copias 270. Emparejadas por ese orden, el
hueco total del pane baja de 211 px a 46. El primer intento —portadas+color arriba,
Google+redes debajo— dejaba a Google con 160 px vacíos, que se leen como un fallo y no
como aire.

Cuatro fichas guardan con el mismo botón y sus controles viven en fichas distintas, así que
se enganchan con `form="marca-form"`. El formulario ya no dibuja (`display:contents`) y
sólo lleva el csrf. Portadas y copias tienen los suyos: cada acción se manda sola.

**Tres piezas salieron del script de Publicidad al del panel**: la tira de acciones de
fuera de la caja, el rótulo de los interruptores y la ayuda en globo. Estaban dentro de un
`<?php if (CLIENTE_PUBLICIDAD) ?>` y detrás de un `return` que comprobaba `#pub-inicio`: un
cliente sin Publicidad se quedaba sin las tres, y Marca no las habría tenido nunca. Los dos
textos del interruptor van ahora en `data-on`/`data-off` del propio rótulo — el de
Publicidad dice «Encendido» y el de la nota de Google dice otra cosa, y el código no tiene
por qué saberlo. La capa de globos pasó de `#pub-ayudas` a `#adm-ayudas`.

Y un fallo que no era de diseño: los tres controles de Publicidad —`pub_on`, `pub_url` y
`pub_blank`— llevaban `form="adm-form"` y el formulario tiene `id="pub-form"`. El atributo
apuntaba a un id que no existe, así que **no viajaban**: el interruptor del banner llegaba
siempre apagado. Comprobado guardando de verdad, no leyendo el HTML.

El botón de guardar tampoco se veía. `--ok` estaba definido en `.adm-board`, que vive
DENTRO de la tarjeta; la tira de acciones vive fuera y no lo heredaba, así que
`background:var(--ok)` quedaba en transparente sobre el fondo negro de la página. Los
tokens de la tira son suyos y ahora los lleva escritos. De paso, `.adm-btn-ver` y
`.adm-btn-guardar` nacieron con `width:100%` para ocupar una ficha: fuera de la caja eso
los estiraba hasta el borde de la página.

**«En línea» vuelve a ser verde.** Es lo único verde que queda en el panel, y a propósito:
no dice nada del restaurante, dice que la sesión está conectada. El naranja es de la marca.

## El panel pasa a bento oscuro, y empieza por Publicidad (5 Sep 2026)

Decisión del propietario: **esto deja de ser el estilo de una pestaña y pasa a ser la línea de
diseño del panel entero**. Se migra pestaña a pestaña, empezando por Publicidad.

El sistema: fichas sobre un tablero oscuro, cada una con su icono y su rótulo; los atajos como
tarjetas con título, apunte e indicador de elegido; los campos con su icono dentro; y la barra
de acciones al final. Publicidad queda en seis fichas — Estado y Horario en la columna
estrecha, Vista previa cruzando esas dos filas para igualar altura, Duración a todo el ancho, y
Enlace y Acciones abajo. Ninguna altura está fijada a mano: la rejilla las iguala.

**Las clases del sistema llevan prefijo `adm-`**, no `pub-`, porque las van a usar las ocho
pestañas. Los `id` sí se quedan con `pub-`: los ocho panes conviven en el DOM a la vez y un
`id="adm-form"` chocaría en cuanto la segunda pestaña tuviera el suyo.

**El panel entero pasó a oscuro el mismo día.** La forma: los tokens de color se redefinen en
`.card-main`, así que la cabecera, las pestañas y todo lo que cuelga heredan el oscuro sin
tocar ni una de sus reglas. **La capa de transición** es una sola regla:
`.pane:not([data-pane="publicidad"])` se devuelve la paleta clara y se dibuja como isla con su
propio fondo y su radio. Cada pestaña que se migre pierde su isla al salir de ese `:not()`.

Tres superficies y no dos, para que haya profundidad sin sombras: página `#08090A`, tarjeta
`#101114`, fichas `#191B1F`. Y el aire de la tarjeta baja de 89 a 34 px en pantalla grande: el
tablero ya no necesita márgenes propios porque la tarjeta ES el tablero.

## Las fechas de Publicidad, por duración y no por calendario (5 Sep 2026)

Eran dos `<input type="datetime-local">` desnudos. En Windows salen pequeños, con la letra del
sistema y un desplegable que no se parece a nada del resto del panel. Y pedían lo que nadie
piensa: una fecha exacta. Quien pone un banner piensa «este fin de semana» o «un mes».

Ahora hay siete atajos de duración —hoy · este fin de semana · una semana · quince días · hasta
fin de mes · 365 días · sin fin—, un calendario de dos meses que sólo aparece al pedir «Otras
fechas», dos horas y una tira que dice el periodo en cristiano con su número de días.

**La decisión que importa: el calendario no sustituye al input, lo pilota.** `pub_fecha_a_local()`
ya devuelve `Y-m-d\TH:i` en hora del restaurante, que es exactamente lo que escribe el calendario,
así que los dos `datetime-local` siguen ahí con su `name` y su `value`; el JavaScript los oculta
—con la clase `.pub-js`, que añade él mismo— y les escribe encima. Sin JavaScript no hay clase,
no se oculta nada y el pane funciona igual que antes de este cambio: los cuatro contenedores
nuevos nacen con `hidden` puesto desde el servidor. El servidor no se entera de nada, recibe los
mismos dos campos en el mismo formato.

El pane pasó a **dos columnas**: la creatividad a la izquierda, con su ancho de 380, y «Cuándo se
ve» ocupando el hueco que antes quedaba vacío a su derecha — ahí caben los atajos y el calendario
de dos meses sin apretarlos. Lo que se mueve es sólo presentación: los dos `datetime-local` se
quedan dentro de su formulario, porque son los que viajan. Por debajo de 1000 px se apila.

Dos cosas más, del mismo cambio. El estado dejó de ser una palabra suelta: los cinco valores de
`pub_estado_banner()` se pintan con su color y una frase que dice qué significan — un
administrador leía «CADUCADO» y tenía que deducir el resto. Y los dos botones de la imagen
pasaron a estar juntos, en la misma fila y debajo de la creatividad, que es donde se mira al
decidir cambiarla; son dos formularios hermanos, no anidados.

Al hacerlo aparecieron dos trampas que conviene no repetir. La primera: `form.submit()` **no**
incluye el `name`/`value` del botón, así que la subida viajaba sin `subir_banner=1` y el servidor
no entraba en su rama — la imagen se iba al limbo sin decir nada. Se pulsa el botón, no se envía
el formulario. La segunda: un botón escondido con `width:1px` sigue midiendo su relleno y empuja
la fila; hay que anularle también `padding`, `border` y `min-height`. Otra, cara: un `replace`
lanzado a la ligera sobre el fichero dejó escrito `X{background:...}` en mitad de la hoja, se
llevó por delante el cierre de una regla y el navegador **abandonó las 99 reglas siguientes** —
el CSS estaba en el fichero y no se aplicaba. Cuando algo del CSS no surta efecto, contar las
reglas de la hoja ya parseada (`document.styleSheets[n].cssRules.length`) antes de buscar
culpables en la especificidad. Y una tercera, de la
segunda vuelta: en una rejilla, `1fr` **no** encoge por debajo del contenido mínimo del item, así
que los dos meses empujaban su columna y sacaban scroll horizontal a toda la página. Se pone
`minmax(0,1fr)` y `min-width:0`.

El campo del enlace usa el mismo patrón que los de Redes en Marca —`label.fld` con `type="url"`,
`inputmode="url"` y `maxlength="300"`—: un campo de enlace es un campo de enlace, se llame como
se llame la pantalla. Comprobado midiendo: tamaño, radio, borde, fondo y relleno idénticos.

## Alérgenos en escritorio, y por qué se veía torcido (21 Aug 2026)

Eran dos columnas con dos centros distintos: el rótulo centrado en su columna de 240px y el texto
centrado en los 879 restantes. Cada mitad estaba centrada en su sitio y el conjunto no lo estaba
en ninguno. Además 879px son unos 120 caracteres por línea, el doble de lo que se lee cómodo.

Ahora es una sola columna centrada, como en móvil, con la medida del texto acotada a 62ch.
Medido a 1280: rótulo, iconos y texto comparten centro en 633, el texto ocupa 487px y sale a 54
caracteres por línea en tres líneas.

## La fecha con su día, y las pestañas al centro (21 Aug 2026)

La cabecera pasa a **Viernes, 21/08/26** — el día de la semana en un peso menos y la cifra en
grande. Por debajo de 400px el día salta a su propia línea. PHP escribe los días en inglés salvo
que el servidor tenga `intl` con el locale bien puesto, y en un hosting compartido eso no se da
por hecho: se traduce con una tabla y se acabó.

Las pestañas se centran mientras caben y se pegan al borde en cuanto desbordan, con
`margin-left:auto` en la primera y `margin-right:auto` en la última. `justify-content:center` no
sirve: al desbordar deja el primer botón fuera de alcance por la izquierda. Es el mismo truco que
la barra de categorías de la carta. Medido: a 1280 hay 60px iguales a cada lado; a 375 desborda y
el primer botón sigue siendo alcanzable con el scroll a cero.

## Fase correctiva de la auditoría de calidad (5 Sep 2026)

Nueve lotes, cada uno con su prueba, salidos del informe `auditorias/auditoria-calidad-2026-09-05.md`.
Las decisiones que conviene no volver a discutir:

**La subida de portada falla cerrada.** `hero_guardar()` guardaba en crudo lo que GD no podía
abrir «porque ya había pasado las comprobaciones», y las comprobaciones eran leer una cabecera:
así entró en la portada un PNG de 4 KB con una anchura inventada de mil millones de píxeles.
Ahora el orden es fijo y barato-antes-que-caro: peso, tipo real por contenido (con `finfo` si
existe), extensión que cuadre con el contenido, anchura mínima, tope de lado y de píxeles
(`IMG_LADO_MAX` 8000, `IMG_PIXELES_MAX` 20 MP —por encima GD pide más memoria de la que da un
hosting compartido—), memoria disponible, y SOLO entonces se decodifica. Si el servidor no trae
GD para ese formato no se guarda nada y se dice por qué: una foto sin comprobar no se publica.
Un JPEG cortado se abre «bien» por defecto porque libjpeg rellena de gris; se pone
`gd.jpeg_ignore_warning=0` al decodificar para que una foto a medias sea una foto rota.

**Restaurar una copia restaura SOLO los precios.** La ficha se llama copias de precios, cada fila
dice «Precios de antes del cambio» y la confirmación pregunta por los precios; restaurar el
estado entero se llevaba en silencio los agotados, destacados, ofertas, banner, fotos y marca
posteriores a la copia. Las claves de la copia pasan por `estado_vista()`, así que una copia
anterior a los identificadores permanentes sigue valiendo. Si los precios de la copia son los de
ahora no se escribe nada y se dice. La copia preventiva la sigue escribiendo `guardar_estado()`.

**Las copias llevan segundos y contador.** `AAAA-MM-DD-HHMMSSnn.json`: dos cambios en el mismo
minuto —o una restauración justo después de un cambio— ya no se pisan. El listado sigue
reconociendo los nombres viejos (`-HHMM` y solo fecha) y el orden textual sigue siendo el
temporal porque un nombre nuevo del mismo día compara mayor que uno viejo.

**Sólo las casillas ensucian Agotados.** El oyente `change` del pane ignora todo lo que no sea
`agotado[]`: el buscador al perder el foco y el selector de foto del recortador —que vive dentro
del pane— hacían saltar el aviso de «cambios sin guardar» sin haber tocado ninguna casilla.

**Los códigos de subida de PHP se traducen.** `subida_error_texto()` dice qué ha pasado y el tope
que aplica DE VERDAD (`subida_tope_bytes()`: el del panel o el del hosting, el menor), en MB y
sin exponer nada más de la configuración. Lo usan la portada, el banner y las fotos de plato.

**320 px.** Un `@media (max-width:359px)` y nada más: las dos horas de la oferta se reparten el
ancho en vez de medir 120 px fijos, y el grupo de periodos de «Platos más consultados» baja a
su propia línea. Medido: a 375, 768, 1280 y 1920 las cajas no se mueven un píxel.

**`dia[]` se normaliza en servidor:** válidos, sin repetidos y ordenados.

**Accesibilidad:** el botón de cámara cambia su `aria-label` a la vez que su `title`; la
contraseña del login tiene un `<label>` de verdad (oculto con `.sr`); el nombre del récord pasa
por `strip_tags()` antes de quitar ángulos sueltos.

**El precio canónico de la carta** se calcula una vez por fila en `render()` y se deja en
`data-precio-final`: el precio vigente (el del panel o, si no hay, el de la carta) con la oferta
aplicada SOLO si el plato se puede pedir. Un plato agotado no tiene descuento que anunciar y su
precio es el vigente sin rebaja. La lista pinta desde ahí, la hoja de búsqueda lo lee de ahí y
la ficha copia el marcado de la lista: tres sitios, un cálculo. Antes la hoja releía
`.price-now` y un agotado en oferta salía rebajado allí y sin rebajar en la lista. Consecuencia
asumida: el filtro «En oferta» de la hoja ya no cuenta los agotados, que es lo que dice la banda.

## mbstring deja de ser un requisito del panel (6 Sep 2026)

La auditoría multicliente encontró que en un PHP **sin `mbstring`** el panel moría a media
página: `mb_strtoupper()` en las iniciales de los días de la oferta lanzaba «Call to undefined
function» y el HTML se cortaba ahí. Llegaban las ocho pestañas de la barra pero **sólo tres de
los ocho paneles** —Precios, Juego, Publicidad, Analítica y Marca no existían— y sin ningún
mensaje a la vista. `record.php` caía igual al guardar un nombre: error fatal, sin JSON de
vuelta y con la partida perdida.

Lo curioso es que este mismo fichero ya sabía que la extensión puede faltar: dos de sus llamadas
—`minuscula()` y `caracteres()`— llevaban `function_exists()` desde el principio, con su
comentario explicándolo. Faltaban las otras tres, y una sola de ellas bastaba para tirar la
página.

**No se convierte `mbstring` en requisito.** En hosting compartido no se puede dar por hecha, y
el arreglo no necesita ninguna dependencia nueva:

- **Cuatro funciones y ni una llamada suelta.** `minuscula()`, `mayuscula()`, `recorte()` y
  `caracteres()` viven juntas y son el ÚNICO sitio del fichero donde se nombra una `mb_*`. Todas
  siguen la misma regla: mbstring si está —comportamiento idéntico al de siempre— y si no, un
  camino equivalente.
- **El recorte, por caracteres y nunca por bytes.** Sin mbstring se parten puntos de código con
  `preg_split('//u')`, la misma técnica que ya usaba `caracteres()`. Cortar a la brava dejaría
  media tilde en pantalla y en el JSON.
- **La caja, con `strtr()` sobre las 26 letras ASCII más un mapa de acentos latinos.** No con
  `strtolower()`: en algunas versiones y locales toca bytes por encima de 0x7F y parte un
  carácter UTF-8. El mapa cubre las lenguas del producto, no Unicode entero — eso es justo lo que
  hace mbstring y por eso se prefiere cuando está.
- `record.php` repite las tres que necesita porque es un punto de entrada propio: el juego lo
  llama sin pasar por el panel, y no hay un fichero común donde ponerlas sin inventar uno.

Medido con el mismo cliente servido por dos PHP, uno con la extensión y otro sin ella: **8 de 8
pestañas** en los dos, mismas iniciales de día (`L M M J V S D`), y `record.json` **idéntico byte
a byte** tras guardar once nombres con acentos, eñes, diéresis, CJK, emoji y una etiqueta
`<script>`. Cero errores fatales, cero warnings, cero errores de consola. El HTML servido por el
panel pesa **exactamente lo mismo** que antes del cambio: el código PHP añadido no viaja al
navegador.

Lo que sigue dependiendo del hosting es **GD**, y ahí la política no se toca: sin GD la portada
se rechaza con su mensaje y el estado no se modifica.

## MISE-A R1: siete tokens locales, radio y pestañas accesibles (6 Sep 2026)

Primera ronda del sistema de diseño Mise sobre este panel. Capa `--p-*`, sin tocar ni un token
de `gen.mjs` ni de `temas.mjs`: seis tokens en `:root` — `--p-radius-card` (16px, propio del
admin) y cinco alias/derivados de `--accent`/`--accent-ink`/`--metal` ya garantizados por
`verificarPaleta()` (`--p-accent-fill`, `--p-accent-ink`, `--p-accent-stroke`, `--p-accent-glow`,
`--p-accent-select`). `--p-fg` NO vive en `:root`: depende de `--ink`, que el panel redefine
localmente en `.card-main` y en `.adm-acciones-fuera` (fuera de la tarjeta), así que `--p-fg`
se declara en esos dos mismos sitios, no arriba.

**Radio.** Los 6 usos de `var(--r-card)` en este fichero pasan a `var(--p-radius-card)`.
`--r-card` sigue en 34px en `gen.mjs`, sin cambios: es el radio de la carta pública y del
juego, y este panel ya no depende de él.

**Base tipográfica.** Se ratifican los 15px de `--t2` como base del panel. La provisión de
Fase 6 (14px) queda superada por el rediseño de `d903dfe` y por esta revisión sobre el panel
real.

**Color de marca: nunca como texto.** El naranja crudo (`rgba(255,117,23,...)`) no puede
viajar a un cliente con otro color. Regla aplicada en todo lo tocado esta ronda:
- relleno sólido → `--p-accent-fill` + `--p-accent-ink` (ya lo hacía bien `.adm-btn-guardar`,
  no se tocó);
- trazo, foco, icono, caret → `--p-accent-stroke`;
- texto normal → `--p-fg`, nunca el acento;
- halo de foco → `--p-accent-glow`; selección de texto → `--p-accent-select`.
- Los tres fondos tintados de intensidad distinta (9%/15%/18%) se quedan como `color-mix()`
  explícito en su selector: no hay semántica común entre ellos, un token único sería postizo.

**Pestañas accesibles.** Patrón completo: `id` estable y `aria-controls` en cada tab,
`role="tabpanel"`/`id`/`aria-labelledby` en cada panel, relación 1:1 por slug, `tabindex`
0/-1 según la pestaña activa, flechas izquierda/derecha y Home/End mueven el foco y activan
—mismo modelo que el click—. `abrir(slug)` no cambió de firma ni de lógica.

**Queda para MISE-A R2**, expresamente fuera de esta ronda: alturas de control (hoy 19
valores de `min-height` distintos, sin escala), densidad compact/comfortable/touch, y la
formalización sistemática de objetivo táctil.

## MISE-A R2: cierra la deuda visual de `.fld`/`.combo-q` (7 Sep 2026)

`.fld` (contraseñas) y `.combo-q` (buscador de Destacados) traían fondo blanco, borde falso
por `box-shadow` y tipografía de la carta — restos de antes del panel oscuro. Pasan al mismo
lenguaje que `.adm-campo`: fondo `--chip`, borde real `1px solid var(--border)`, radio 12px,
tipografía heredada de `.card-main` (Inter), foco con `:focus-visible` +
`--p-accent-stroke`/`--p-accent-glow`. Suelo tipográfico a 13px en `.fld`, `.combo-num` y
`.combo-txt small`. Cero cambio de `name`/`id`/`autocomplete`/validación/JS.

Sobre targets táctiles: se evaluaron `.adm-foto-b`, `.vp-per`, `.adm-sw`, `.adm-check`,
`.adm-orow-tick` y `.adm-btn-fino` — todos superan el mínimo funcional de 24px en su área
real. 44px queda documentado como objetivo ergonómico táctil, no como mínimo obligatorio, y
se aplica solo donde el layout lo permite sin arriesgar solapamiento; ninguno de estos
controles se tocó en R2. No se añadió ningún token nuevo. Los `accent-color` nativos
(`.recorte .zoom`, `.cats input`, `.orow .tick input`, `.adm-check input`) siguen
dependientes de marca, sin cambio.

## Corrección: días seleccionados en Ofertas (7 Sep 2026)

En los días seleccionados de Ofertas, el estado activo utiliza el color de marca y su tinta
calculada; el estado apagado conserva el tratamiento neutro del panel.

## MISE-B Fase 1: shell, navegación y Platos (7 Sep 2026)

Rediseño de la información: la barra de pestañas horizontal (ocho destinos, todos al mismo
nivel) se sustituye por un sidebar persistente en escritorio, un riel de iconos en tablet y
una barra inferior + hoja «Más» en móvil, con los destinos agrupados por lo que administran
(Platos · Operación/Ofertas · Marketing/Publicidad+Juego · Negocio/Analítica ·
Configuración/Marca+Ajustes). Cero cambio de persistencia, de contrato POST ni de handler:
es reubicación y recomposición de interfaz (categorías A/B), no una función nueva. Base:
prototipo scratchpad MISE-B v2.1, aprobado por el propietario como especificación
arquitectónica — no se copió su código, sólo su forma; los datos y el comportamiento salen de
`index.php` real, auditado línea a línea antes de tocar nada.

**Aclaración sobre el estado de MISE-A**: no es correcto decir que «MISE-A está en
producción». Lo demostrado hasta ahora es que MISE-A está integrada en `main`, publicada en
`origin/main`, y que el workflow de despliegue se ha ejecutado en modo normal con el paso de
FTP en `skipped` — nunca con `dry-run:false` sobre el commit de MISE-A. Esta fase hereda sus
tokens (`--p-*`, `--t1/2/3`) tal cual, sin volver a abrir esa decisión.

**Agotados + Destacados + Precios se funden en «Platos»** (nuevo slug; los tres antiguos
dejan de existir como destinos de navegación). Los cuatro handlers siguen siendo
`guardar_agotados`, `destacado_add`/`destacado_del` y
`precios_calcular`/`precios_manual`/`precios_publicar`/`precios_reset` — ninguno cambia de
nombre, campo ni forma de `estado.json`. Cada plato es ahora una única fila con: casilla de
Agotado, botón de cámara (foto, ya existía en Agotados y no estaba contemplado en el
prototipo), precio editable, un indicador de Oferta de solo lectura (enlace a `?t=ofertas`;
la regla se sigue editando sólo allí, porque es un objeto propio —categorías + platos +
horario + días—, no un booleano por plato) y un botón «Destacar» que reutiliza el selector de
seis etiquetas de siempre (`ETIQUETAS`/`hl_label`) — Destacado nunca fue un interruptor
on/off, y no se ha simulado como tal.

**Agotado y precio se guardan solos.** `guardar_agotados` sustituye el array `soldOut`
entero y `precios_publicar` sustituye el mapa `prices` entero — los dos ya exigían mandar el
estado completo, no sólo lo tocado. Con las 312 filas siempre en el DOM (el buscador sólo
filtra con CSS, nunca las quita), el mismo truco que ya usaba Agotados
(`form="agotados-form"` en cada casilla) se extiende a los precios
(`form="precios-form"` en cada campo) y un `fetch` en `change` reenvía el formulario
completo — incluye lo que no se tocó, así que nada se pierde. Sin JavaScript, las dos tiras
«Guardar agotados» / «Guardar precios» de fuera de la tarjeta siguen ahí y hacen exactamente
lo mismo en una vuelta de página: es respaldo, no una ruta nueva.

**La subida global por porcentaje no se ha quitado.** Vive ahora dentro de un
`<details>` «Subir precios a la vez» en la cabecera de Platos: los mismos cinco formularios
de siempre (`precios_calcular` × 4 porcentajes fijos + libre, `precios_manual`,
`precios_reset`), la misma pantalla de revisar/publicar a pantalla completa cuando hay una
propuesta en curso (`$previsua`), reubicada tal cual dentro del mismo pane en vez de en una
pestaña aparte.

**Ajustes es nuevo.** Agrupa la ficha de copias de seguridad (antes colgada de Marca, y
lógicamente ligada a los cambios de precio, no a la identidad del restaurante) y el bloque de
superadministrador (antes suelto tras Marca, visible sólo con `$super`). `reiniciar_record`
se queda en Juego a propósito: el objeto que administra es el marcador, no la cuenta — la
arquitectura sigue al dato, no a quién antes lo enseñaba cerca.

**Capacidades.** El sidebar, la barra inferior y la hoja «Más» leen las mismas tres
constantes de siempre (`CLIENTE_JUEGO`, `CLIENTE_PUBLICIDAD`, `DATOS_ACTIVO`) — no hay una
segunda fuente de verdad. Un cliente con alguna en `false` no deja hueco vacío: el grupo
entero (rótulo incluido) desaparece.

**`motor.lock`** se regenera al final de esta fase con `node motor/lock.mjs --escribir`,
autorización ya dada por el propietario para este ciclo — no hace falta pedirla de nuevo cada
vez que se toque `index.php` dentro de esta misma tarea.

## MISE-B Fase 1 — corrección de paridad con el prototipo v2.1 (7 Sep 2026)

La primera implementación de Platos reutilizó el acordeón por categoría que ya tenía
Agotados (`<details data-cat-acordeon>`, ficha con borde por categoría) en vez de la
arquitectura del prototipo v2.1 aprobado (categoría como separador, todo visible por
defecto). Fue una decisión tomada durante la implementación, sin plantearla como punto de
decisión; revisión visual del propietario la rechazó. Corregido:

- **Sin acordeón.** Cada categoría es un `<div data-cat-grupo>` siempre expandido — nunca un
  `<details>` que haya que abrir. El filtro (buscador, chips, categoría) oculta filas y, si
  una categoría se queda sin ninguna visible, oculta el grupo entero — nunca al revés.
- **Categoría como filtro real**, no sólo separador: `<select id="filtro-cat">` nuevo,
  poblado desde el mismo `$porCategoria` que ya agrupaba las filas. Sigue sin existir CRUD de
  categorías — esto es sólo una vista distinta del mismo dato derivado de la carta.
- **Sin fichas anidadas.** La cabecera de Platos y el separador de categoría dejan de usar
  `.adm-f` (ficha con fondo y borde): son texto y un filete, no una caja dentro de otra caja.
- **Ancho real.** `.page{max-width:1570px}` — pensado para antes de que existiera el
  sidebar— deja de aplicar con sesión iniciada (`body:not(.sin-entrar) .page{max-width:none}`
  desde 768px); el contenido usa el ancho que deja el sidebar, no un tope heredado de la
  carta pública.
- **Corregido de paso**: la reserva de sitio del sidebar en el `<body>` (`padding-left`,
  `padding-bottom`) se colaba también en la pantalla de login, que no tiene sidebar. Ahora
  sólo aplica con sesión (`body:not(.sin-entrar)`).
- **Cabecera superior compacta.** `TINGE OF TURMERIC` / fecha / aviso de sesión pasan de
  cuatro líneas centradas a una franja alineada a la izquierda — con sidebar, no antes de él.
  Es cambio compartido por todas las pestañas, no sólo Platos: coherente con minimizar texto
  administrativo permanente en toda la superficie operativa, no sólo en la nueva.
- **Guardar agotados / Guardar precios deja de verse con JavaScript activo.** Agotado y
  precio ya se guardan solos (autosubmit); esa tira era el respaldo sin JavaScript de
  siempre, pero `tiraDe()` la trataba como la de cualquier otra pestaña y la enseñaba también
  con JS. Ahora se excluye explícitamente mientras el script corre — sigue existiendo igual,
  sin protagonismo visual, y cubre el caso sin JavaScript exactamente como antes. La tira de
  «Publicar precios» (revisar/publicar el ajuste global) es distinta y se mantiene siempre
  visible mientras esa pantalla está en curso — no es un respaldo, es la única vía.
- **«Subir precios a la vez» → «Ajustar precios %»**, reubicado en la cabecera de Platos como
  acción secundaria en vez de enterrado al final de una ficha. Mismos cinco formularios,
  mismo flujo calcular → revisar → publicar, sin tocar el backend.

Handlers, campos y `estado.json` sin cambio. Verificado tras la corrección: cero acordeón,
312 filas siempre visibles, filtro de categoría real, cero overflow en los 8 anchos de
siempre, agotado/precio/destacado/oferta funcionando igual que antes de este ajuste.

## MISE-B Fase 1 — segunda ronda UX: grupo operativo y plegado opcional (7 Sep 2026)

Dos ajustes sobre lo ya corregido, sin tocar nada resuelto en la ronda anterior.

**Grupo operativo único, al final de la fila.** Agotado vivía suelto al principio (junto a
cámara y nombre) mientras precio/oferta/destacado ya estaban agrupados al final. Se reubica
el mismo `<input name="agotado[]" form="agotados-form">` — mismo campo, misma key, mismo
`data-plato`, mismo autosubmit, mismo `guardar_agotados` — dentro de `.adm-plato-acciones`,
después de Destacado. El orden final es **Precio · Oferta · Destacado · Agotado**, un solo
bloque alineado a la derecha. Cero campo nuevo, cero handler tocado.

**Agotado, aspecto de interruptor compacto.** El checkbox real se envuelve ahora en el mismo
patrón `.adm-sw` (interruptor) que ya usan Juego/Publicidad, en una variante `.adm-sw-agotado`
más pequeña (36×21px de pista) — con un matiz importante: en rojo (`--offer`) al marcar, no en
verde (`--ok`): agotado es una baja, no un "encendido", y el verde ya significa "activo y
bien" en el resto del panel.

**Destacado, un control percibido, dos formularios reales.** Cuando ya hay etiqueta, se
enseña un pill de dos zonas: el texto (p. ej. «Bestseller») reabre el mismo selector real de
seis etiquetas para *cambiarla* — es el mismo botón `.adm-destpick` que ya abría el selector
para destacar por primera vez, con otro rótulo—, y una × pequeña la quita. Van en DOS
`<form>` separados a propósito: si compartieran uno solo, la × heredaría también el campo
oculto `destacado_add=1` del selector y el servidor procesaría un alta fallida (sin
`hl_label`) a la vez que la baja real — un error espurio en cada «Quitar». Verificado que no
ocurre: `tags` queda limpio, sin aviso de error, tras quitar.

**Separadores de categoría, plegado opcional minimalista.** `.adm-cat-sep` pasa de `<div>` a
`<button>` con chevron, `aria-expanded` y `aria-controls` — teclado nativo (Enter/Espacio),
sin `tabindex` que gestionar a mano. Plegar es una clase (`.plegado`) sobre `.adm-cat-grupo`
que hace `display:none` sobre `.adm-cat-filas` — ninguna fila ni input se desmonta, se
verificó contando `input[name="agotado[]"]` dentro de una categoría plegada. Por defecto,
todas expandidas; el estado no se guarda en `estado.json` ni sobrevive a un recargo (es
explícitamente sólo de sesión, como se pidió).

**Filtro gana al plegado.** Buscar, un chip de estado o elegir categoría fuerza visualmente
abierta cualquier categoría con resultados (`.forzado-abierto`, otra clase, no toca
`.plegado`) sin importar si el usuario la había plegado a mano. Al vaciar el filtro,
`.forzado-abierto` se quita y `.plegado` — intacto todo el rato — vuelve a mandar solo.
Verificado con un caso real: "Sopas" plegada a mano, buscar "tomate" la abre mostrando sólo
la fila que coincide, limpiar el buscador la vuelve a plegar exactamente como estaba.

**Error propio, encontrado y corregido en esta misma ronda**: `.adm-prow-nuevo`/`.adm-prow-fijo`
traen `order:3;margin-left:auto` desde la fila de Precios en estrecho (pensado para partir
*esa* fila en dos), y esas dos clases se reutilizan dentro de `.adm-plato-acciones` — el
precio saltaba a su propia línea, después de oferta/destacado, rompiendo el orden. Se
neutraliza con un selector más específico dentro del grupo de acciones.

## MISE-B Fase 1 — tercera ronda: «Ajustar precios %» sin desplegable (7 Sep 2026)

Era un `<details>`: un clic para verlo, y al abrirse desplazaba el resto de la pantalla —tres
filas (banda de porcentajes, aviso, «volver a los de la carta»)—. Pasa a ser una única fila
siempre visible, justo debajo del título de Platos, con los mismos cinco formularios y
handlers de siempre (`precios_calcular`/`precios_manual`/`precios_reset`, sin tocar ninguno).
«Volver a los de la carta» se integra en la misma fila (a la derecha, con el contador de
cuántos precios difieren) en vez de en su propia fila de aviso aparte; en viewports muy
estrechos (≤560px) baja a su propia línea dentro de la misma barra, no a una ficha distinta.

## MISE-B Fase 1 — cuarta ronda: revisión visual (7 Sep 2026)

Cuatro correcciones puntuales sobre la revisión en vivo del preview, ninguna toca handlers,
persistencia ni contratos POST — visual/CSS y una reclasificación de un botón.

**«A mano» deja de ser un botón de porcentaje.** Compartía clase (`.adm-pct`) con
+3/+5/+10/+15%, mismo tamaño (54px) y mismo peso visual: parecía una quinta opción de "cuánto
subir" cuando en realidad abre otra pantalla (revisión plato a plato), no contesta la misma
pregunta que las otras cuatro. Pasa a `.adm-btn.adm-btn-fino` — el botón estándar del panel
(40px), el mismo que "Descargar"/"Restaurar" en Ajustes — y se separa al final de la fila.
Con eso la banda de ajuste de precio pasa de leerse como cinco botones iguales a cuatro
porcentajes más una acción secundaria distinta. Mismo `name="precios_manual"`, mismo
formulario, sin tocar el handler. La regla `.adm-pct-mano` (y su variante ≤699px) se retira
por no tener ya ningún uso; la sustituye `.adm-ajustar-precios-mano`, sólo posición.

**Separadores de categoría, más presencia visual.** Seguían leyéndose como un filete plano.
El chevron pasa a su propia píldora circular (24px, como cualquier icono de acción del panel)
y el contador de platos pasa de número suelto a badge (`background:var(--chip)`, forma de
píldora) — el mismo lenguaje que ya llevan los chips Todos/Agotados/Con oferta de la fila de
filtros, justo encima. Toda la fila gana fondo (`var(--chip)`) y esquinas redondeadas al
pasar el ratón o el foco. Sigue sin ser una ficha: sin fondo en reposo, sin sombra, 40px de
alto — sólo cambia lo que pasa al interactuar. Cero cambio de estructura: el `<button>`, sus
atributos ARIA y el mecanismo de plegado (`.plegado`/`.forzado-abierto`) intactos.

**Ajustes: la ficha de copias dejaba media pantalla vacía.** `.adm-bento` es la rejilla de
Marca (6 columnas ≥1000px, pensada para repartir 6 fichas), pero Ajustes sólo tiene una
(copias de seguridad) desde que se mudó aquí. Sin ninguna columna asignada, la ficha caía en
1 de 6 columnas — ~170px de ancho — y `align-items:stretch` la estiraba a la altura de las
filas vacías de al lado: una ficha real flotando sobre un hueco negro de cientos de píxeles a
los lados y debajo. `.pane[data-pane="ajustes"] .adm-bento{display:block}` la vuelve a lo que
ya era en móvil — una columna, ancho completo — sin tocar la rejilla de Marca, que sigue
usándola tal cual.

**Chapa de versión: deja de usar el color de marca.** `.chapa` usaba `--metal` (el acento del
cliente, naranja en este caso) para una nota técnica de pie de página — fecha de build e IDs
de compilación —, que se leía como una acción o un aviso, no como una nota al pie. No vuelve
a `--muted`: ese color ya se midió ilegible sobre esta tinta en una ronda anterior (1,9–2,3:1
según tema). En su lugar, un gris mezclado a partir de tokens ya verificados —
`color-mix(in srgb, var(--surface) 65%, var(--ink))`—, medido en 7,6:1 de contraste sobre
`--ink` en este cliente. `.chapa strong` (la fecha, el dato que de verdad se compara al
comprobar una subida) se queda en `--surface` — blanco — sin cambios: la jerarquía queda
gris para el cuerpo, blanco para lo que importa comparar.

## MISE-B Fase 1 — quinta ronda: interruptor de Oferta por plato (7 Sep 2026)

Petición explícita: un modo de meter o quitar un plato de la oferta de un toque desde
Platos, con el mismo aspecto que el interruptor mini de Agotado — pero **sólo cuando la
oferta ya está encendida** (apagada, no hay regla a la que meter o quitar nada). Categoría C
— toca persistencia — implementada sólo tras el ok explícito del propietario a la opción
recomendada, con la causa raíz explicada antes de programar.

**Por qué no se reutiliza `guardar_oferta`.** Ese manejador reemplaza `estado['offer']`
entero de una tacada y exige `pct`/`horas`/`días` válidos en el mismo POST — campos que la
fila de Platos no lleva ni debería llevar. Reutilizarlo habría significado acompañar el
interruptor con inputs ocultos duplicando pct/from/to/days/cats en cada fila (312 copias de
la misma regla) sólo para poder reenviarla intacta en cada toque — frágil y fácil de
desincronizar si la regla cambia entre carga de página y toque.

**Por qué tampoco se duplica la casilla `oferta_plato[]` de la pestaña Ofertas.** Comparte
`name` y `form="ofertas-form"` — que también es de reemplazo total. Dos casillas del mismo
plato en dos sitios del documento, sin sincronizar entre sí, y un "quitar" desde Platos
puede no hacer nada si la gemela de Ofertas se quedó marcada de una carga anterior: la
gemela también viaja en el POST y basta que UNA de las dos esté marcada para que el plato
se guarde dentro.

**La solución.** Dos manejadores nuevos y mínimos, `oferta_meter`/`oferta_quitar` (mismo
patrón de dos-botones-dos-acciones que `destacado_add`/`destacado_del`), que sólo tocan
`estado['offer']['keys']` — leen la oferta actual, comprueban que está encendida y que el
plato no es de los que se editan desde Ofertas (categoría entera marcada, o sin precio), y
escriben la lista con ese único plato añadido o quitado. `pct`/`from`/`to`/`days`/`cats` no
se tocan ni se releen: quedan exactamente como estaban. Verificado en vivo contra
`estado.json`: activar y desactivar el interruptor añade y quita sólo la clave de ESE
plato (y su espejo legacy vía `estado_claves_al_guardar()`, el mismo paso de migración que
ya usan todos los demás manejadores), sin alterar el resto de la regla.

**Cada fila lleva su propio `<form>`**, ajeno a `agotados-form`/`precios-form`/
`ofertas-form` — cero colisión de nombres posible. Los campos `oferta_meter`/`oferta_quitar`
viven siempre en el DOM pero `disabled`; el cambio del checkbox habilita exactamente el que
corresponde al nuevo estado antes de enviar (`enviarFormulario`, el mismo fetch+toast que ya
usan Agotado y Precio), así que el fetch manda siempre uno de los dos, nunca ambos ni
ninguno.

**Tres estados, calcados de la lista de Ofertas.** Plato normal → interruptor activo,
verde (`--ok`, el de por defecto de `.adm-sw`: entrar en oferta es un alta, no una baja
como Agotado, que se quedó en rojo). Categoría entera ya marcada → encendido y
`disabled` (se edita desde Ofertas). Sin precio → apagado y `disabled` (nunca puede llevar
un % de descuento). Los tres, con `title` explicando por qué. El tag "Oferta" enlazando a
`?t=ofertas` que había antes se retira — sin uso ya, sustituido por el interruptor cuando
la oferta está encendida y por el mismo guión "—" de siempre cuando está apagada.

## MISE-B Fase 1 — sexta ronda: revisión visual (7 Sep 2026)

Cuatro correcciones sobre la revisión en vivo del preview.

**"Ajustar precios": bloque de porcentajes más compacto, "A mano" más botón.**
`.adm-pct` crecía (`flex:1 1 92px`) para repartirse el hueco sobrante de la fila junto a
"A mano" — con viewport de sobra, "+15%" acababa en una losa de ~300px. Pasa a
`flex:0 0 auto;min-width:72px`: cada porcentaje ocupa lo que pide su texto. El hueco que
sueltan se lo lleva `.adm-ajustar-precios-mano` (antes 106×40px) ahora en 212×54px — el
doble de ancho y el mismo alto que el bloque de porcentajes, para que se lea como un botón
de la misma familia y no como una tira delgada al final de cuatro losetas grandes.

**Ofertas pierde "Platos sueltos" — categoría C, con ok explícito del propietario tras
explicar la causa raíz.** La lista de platos sueltos (`oferta_plato[]`, un acordeón por
categoría, 312 casillas) quedó redundante en cuanto el interruptor por plato de la quinta
ronda cubrió exactamente lo mismo desde Platos. Se retira entera: markup del acordeón,
su buscador/filtro, y el JS que los gobernaba (`aplicar()`, `contar()`, el trozo de
`change` que tocaba `oferta_plato[]`/`cat[]` sobre las filas). Se queda "Semanal" —ajeno a
sueltos, enciende/apaga los 7 días— y la sección de Categorías enteras, intacta.

El cambio de verdad está en `guardar_oferta`: antes reconstruía `offer['keys']` desde
`$_POST['oferta_plato']` en cada guardado — con la lista retirada, ese campo ya no viaja
nunca, así que cualquier guardado de horario o de categorías habría mandado un array vacío
y borrado en silencio todo lo que Platos hubiera guardado. Ahora `guardar_oferta` lee
`estado['offer']['keys']` tal cual está en disco y lo deja igual; sólo escribe
`on`/`cats`/`percent`/`from`/`to`/`days`. Verificado en vivo: marcar una categoría y
encender la oferta, ir a Platos y meter un plato suelto, volver a Ofertas y cambiar sólo un
día de la semana (sin tocar categorías) — los dos platos sueltos siguen en `estado.json`
después del tercer guardado. El texto de la tira de acciones deja de contar "N platos
sueltos" (ya no hay de dónde leerlo) y pasa a contar categorías marcadas.

**Marca: la ficha del nombre dejaba un hueco muerto a la derecha.** Emparejada con Copias
en la rejilla de 6 columnas desde el diseño original, pero Copias se mudó a Ajustes en la
segunda ronda y nadie ocupó su sitio: nombre se quedó sola en la fila 3, a 2 de 6 columnas,
con las otras 4 en negro. Pasa a `grid-column:1 / span 6` — los dos campos (`.adm-campo` ya
es `width:100%`) se estiran con la ficha, sin hueco que rellenar a mano.

**El interruptor de Agotado, encontrado: el problema era de contraste, no de posición.**
Reportado varias veces ("sigo sin verlo") sin que las rondas anteriores lo resolvieran
porque el control SÍ estaba — el fallo era que su pista, apagada, medía 1,39:1 contra el
fondo de la tarjeta (`--border` #2C2E33 sobre `--surface` #101114): dos grises casi
idénticos, prácticamente invisible a simple vista, sobre todo en la versión mini (36×21,
sin la palabra "Encendida/Apagada" al lado que sí lleva el interruptor grande de Ofertas y
que es lo que de verdad lo hace visible ahí). Se añade un borde de 1,5px en `--muted`
(6,39:1 contra el mismo fondo, medido) a `.adm-sw-pista` — la regla base, así beneficia a
los tres interruptores del panel (Ofertas grande, Agotado mini, Oferta mini), no sólo al
reportado. Verificado que la bola sigue cabiendo dentro de la pista con el borde añadido
(`box-sizing:border-box`), en reposo y en la posición marcada, sin desbordar ni en la
versión de 54px ni en la mini de 36px.

## MISE-B Fase 1 — séptima ronda: revisión visual (7 Sep 2026)

**Acordeón de categorías, más presencia.** `.adm-cat-grupo{margin-bottom:2px}` leía las 41
categorías como una sola lista continua, sin separación real entre una y la siguiente —
sube a 8px. La cabecera sólo se pintaba (con `--chip`) al pasar el ratón: en reposo, una
lista sin tocar se veía plana, ninguna categoría destacada de la de al lado. Ahora lleva un
tinte apenas perceptible en reposo (`--marca-velo`, el mismo de una fila seleccionada en
otras pantallas) y el nombre de la categoría pasa a `--ink` (antes heredaba el `--base` gris
de todo el botón) — jerarquía clara: el nombre es lo primero que se lee, el chevron y el
contador quedan en gris de apoyo. Sigue sin ser una ficha: sin sombra, 40px de alto, mismo
`<button>`/ARIA/mecanismo de plegado de siempre.

**Cabecera del panel, cerrada en una barra de verdad.** Marca, fecha y aviso de sesión
("Servicio en curso · la sesión se cierra sola...· Salir") flotaban como texto suelto, sin
límite propio — nada los distinguía del contenido de debajo salvo el margen. `.head` gana
un `border-bottom:1px solid var(--hairline)` (misma línea que ya usa `.chapa` al pie de
página, mismo criterio) con su `padding-bottom`: ahora es una barra con borde, no tres
líneas de texto que flotan. Verificado que no choca con las insignias de sesión (En línea /
Usuario), que van ancladas arriba a la derecha por su cuenta: en 1512px y en 375px quedan
por encima del bloque de cabecera, sin solaparse con la nueva línea.

**Corrección: el `border-bottom` de `.head` de esta misma ronda se revierte.** El
propietario aclaró que "la barra" de la petición original era la barra lateral, no la
cabecera — queda documentado abajo, en la octava ronda, con el sitio correcto.

## MISE-B Fase 1 — octava ronda: revisión visual (7 Sep 2026)

**Acordeón de Platos: recogido de inicio salvo la primera categoría.** Cuarenta categorías
abiertas de golpe eran media pantalla de scroll antes de tocar un plato. Ahora sólo
"Aperitivos" (la primera, la que se ve sin desplazar) arranca abierta; el resto nace con
`.plegado`. Mecanismo sin tocar: el plegado sigue siendo la misma clase CSS de siempre, así
que buscar/filtrar las sigue abriendo igual (`.forzado-abierto`) y, al limpiar, cada una
vuelve exactamente al estado con que nació — verificado con "Vegetarianos" (nace plegada,
un resultado de búsqueda la abre, limpiar la vuelve a plegar) y con un plegado/desplegado
manual real de "Sopas".

**Líneas del acordeón: dejan de parecer óvalos cortados.** `.adm-cat-sep` llevaba a la vez
`border-radius:9px` (para el tinte redondeado al pasar el ratón) y `border-bottom:1px`
(el separador entre categorías) — un borde recto sobre un elemento con las esquinas
redondeadas se curva justo en esas esquinas, y una línea horizontal se ve como el filo de
un óvalo. El separador pasa al `.adm-cat-grupo` contenedor (sin radio propio, así que el
filete queda recto de punta a punta) y `.adm-cat-sep` se queda sólo con su radio para el
tinte de hover — cada regla, una responsabilidad. `.adm-cat-grupo:last-child` no lleva
línea, para no dejar un filete suelto después de la última categoría.

**Badge de Destacado: ya no mide 48px.** Las dos mitades del pill (cambiar/quitar) son
`<button>`, y la regla `button{min-height:48px}` genérica del panel —pensada para botones
de formulario normales— se colaba sin que nada la pisara: la etiqueta salía tan alta como
un botón entero, con el texto descolocado dentro de esa caja de más. Fix de la misma
familia que el de `.adm-orow input{position:absolute}` filtrándose sobre el precio (ronda
1) o `order:3` sobre las acciones de plato (ronda 2) — una regla genérica pensada para otro
contexto, colándose por reutilizar `<button>`/una clase común. Ahora `height:26px` fijo en
las dos mitades, con `letter-spacing` algo más cerrado para que el texto en mayúsculas no
se lea suelto a ese tamaño.

**El aviso de sesión se muda a la barra lateral — sólo donde cabe.** Petición del
propietario, con causa raíz explicada antes de tocar nada: "Servicio en curso · se cierra
en 30 min" pasa al pie de la barra (`.adm-sidebar-pie`), justo encima de Salir, bajo la
línea divisoria que ese pie ya llevaba desde antes — se integra en un elemento que ya
existía, no se inventa uno nuevo. Pero la barra sólo rotula con texto a partir de 1024px
(por debajo, o es un riel de iconos o está oculta del todo en móvil): el aviso se sigue
viendo en el `<header>` por debajo de 1024px (`.sub-sesion`) y se apaga ahí sólo a partir
de esa anchura, cuando ya se ve en la barra. Nunca desaparece, sólo cambia de sitio según
haya donde ponerlo. Nombre del restaurante y fecha se quedan en el `<header>` sin tocar, en
todas las anchuras — sólo se mudó el aviso de sesión, tal como se pidió.

## MISE-B Fase 1 — novena ronda: revisión visual (7 Sep 2026)

**Nombre y fecha se suman al pie de la barra lateral.** Viendo el resultado de la octava
ronda en el preview, el propietario pidió sumar ahí también lo que se había quedado en el
`<header>` (`.head-eyebrow`/`h1`) — señalado con una flecha directa al pie de la barra en
la captura. Mismo criterio que ya llevaba el aviso de sesión: `.adm-sidebar-marca` y
`.adm-sidebar-fecha`, nuevos, sólo se ven a partir de 1024px (cuando la barra rotula con
texto); por debajo, `.head-eyebrow`/`h1` se quedan visibles tal cual estaban. El aviso de
madrugada (`.sub-servicio`) NO se muda — es información del servicio en curso, no identidad
del restaurante, y se lee mejor junto al contenido que cambia con el reloj. Verificado en
1512px (los tres datos —marca, fecha, sesión— en la barra; `.head` vacío salvo por un aviso
de madrugada si lo hay) y en 900px (los tres de vuelta en el `<header>`, la barra sin ellos).

**Filas de plato: mismo fallo de línea que el separador de categoría, sin corregir en la
octava ronda.** Señalado por segunda vez, con círculos directos sobre las filas en la
captura: `.adm-orow` (la fila de cada plato, reutilizada en Platos/Destacados/lo que
quede de listas con casilla) llevaba `border-radius:11px` Y `border-bottom:1px` a la vez —
la misma combinación que ya se identificó como causa del efecto "óvalo cortado" en el
separador de categoría, pero esta vez en cada una de las filas, no en la cabecera. Se
corrige quitando el `border-radius` de `.adm-orow`: el resalte al pasar el ratón pasa de
pastilla redondeada a resalte cuadrado (como una fila de tabla), y el filete entre filas
queda recto de punta a punta. Verificado con `getComputedStyle`: `border-radius:0px`,
`border-bottom` intacto.

## MISE-B Fase 1 — décima ronda: insignias de sesión y línea del pie (7 Sep 2026)

**"En línea" retirada: no comprobaba nada.** Preguntado explícitamente qué verificaba de
verdad. Auditado: texto fijo, escrito por PHP en cuanto la página carga con sesión, sin un
solo listener ni fetch en todo el archivo que la tocara — ni un latido, ni una
reconexión. Es cierto por definición (si no hubiera "línea" no habría página que ver) y no
informa de nada que el usuario no supiera ya. Se retira entera: markup, las dos reglas CSS
(`.insignia.is-online` en sus dos scopes) y la mención en el comentario de cabecera.

**"Usuario" retirada; "Superadmin" se queda.** Mismo razonamiento que dio el propietario:
el caso normal (entrar como el restaurante) no necesita insignia — avisar de lo de siempre
no avisa de nada. Superadmin sí es una sesión con más alcance que merece notarse. La
condición pasa de "siempre, con el rol que sea" a `$demo || $super`: sin ninguna de las dos,
el `<div class="insignias">` ni se pinta (antes se pintaba vacío hacia el markup mental,
ahora ni eso). Verificado en vivo con una sesión de superadmin real: sólo aparece
"Superadmin", nada de "En línea" ni "Usuario".

**La línea del pie de la barra lateral, pegada a Salir.** Estaba en `.adm-sidebar-pie`
(encima del bloque entero: marca, fecha, aviso de sesión, Salir), separando el pie del
resto de la barra. El propietario pidió dejar el contenido donde está pero mover la línea
a encima de Salir en concreto — Salir es la única ACCIÓN del pie, lo demás es identidad y
estado, y es esa acción la que necesita quedar separada visualmente de lo que la precede.
El borde se quita de `.adm-sidebar-pie` y pasa a `.adm-sidebar-pie .adm-nav-item`
(selector que hoy sólo alcanza a Salir, el único nav-item de ese pie), con su propio
`padding-top`/`margin-top` para que la línea no quede pegada al texto de arriba.

**Corrección, misma ronda: ese border-top reprodujo el fallo recién corregido.**
`.adm-nav-item` también lleva `border-radius:11px` (el mismo redondeo de cualquier botón
de la barra) — un `border-top` suelto sobre un elemento con las esquinas redondeadas se
curva justo ahí, el mismo "óvalo cortado" que ya se corrigió en el separador de categoría
y en las filas de plato, esta vez en Salir. Señalado por el propietario antes de que
llegara a auditoría.

Se revierte a la solución que ya funcionaba: la línea recta vuelve a `.adm-sidebar-pie`
(sin radio propio), encima de todo el bloque — empezando por el nombre del restaurante,
como se pidió. Salir dejar de compartir esa línea: se le da un borde COMPLETO
(`border:1px solid var(--border)`, el gris neutro de cualquier botón/campo del panel, no
un color de marca) en vez de un solo lado — las cuatro esquinas curvan igual alrededor de
todo el contorno, así que no hay una arista recta chocando contra una curva. Se lee como un
botón propio, distinto de la lista de navegación de arriba. Verificado con
`getComputedStyle`: `.adm-sidebar-pie` en `border-radius:0px` (línea recta garantizada);
Salir con `border:1px solid rgb(44,46,51)` en las cuatro esquinas, y sigue cabiendo en el
riel de iconos de tablet (900px, 59×46px dentro de un carril de 76px).

## MISE-B Fase 1 — auditoría correctiva (7 Sep 2026)

El propietario auditó el `index.php` de trabajo tras la novena/décima ronda y aprobó la
dirección visual general, con una corrección funcional y tres ajustes de comportamiento.
Nada de esto toca sidebar, header, filtros, Ajustar precios, Marca, Ajustes, Juego,
Publicidad ni Analítica — quedan exactamente como estaban.

**1. Oferta vuelve a ser read-only en Platos — revertida la desviación de la
cuarta/quinta ronda.** El interruptor por plato (`oferta_meter`/`oferta_quitar`,
`.adm-oferta-check`, `.adm-oferta-swform`) y el cambio de `guardar_oferta` para
preservar `keys` en vez de reconstruirlo desde el formulario, NO estaban en el contrato
aprobado. Se revierte a lo que había antes de la cuarta ronda, restaurado con el diff
local contra el punto de partida de la rama (`git diff 5da59c7`) donde el diff lo
conservaba, y con el texto exacto de mis propias ediciones anteriores en esta misma
sesión donde el diff en dos puntos no bastaba (un add-y-quita dentro de la misma rama sin
commits intermedios no deja rastro en un diff de dos puntos) — nada inventado de nuevo:

- Handlers `oferta_meter`/`oferta_quitar`: eliminados enteros.
- `guardar_oferta`: vuelve a reconstruir `keys` desde `$_POST['oferta_plato']`
  (`$keysSel`), con su validación original ("Elige al menos una categoría o un plato").
- Platos: la celda de Oferta vuelve a ser `<a class="adm-tag adm-tag-oferta"
  href="?t=ofertas">Oferta</a>` si el plato entra, o el guión `.adm-plato-sinoferta` si
  no — sin switch, sin formulario, sin POST posible desde esta pantalla.
- Ofertas: la sección "Platos sueltos" (buscador, filtro Todos/Sólo marcados, acordeón
  de 40 categorías con casilla `oferta_plato[]` por plato) vuelve a existir tal como
  estaba, con su JS de búsqueda/filtro/contador y el aviso "N platos sueltos en oferta"
  en la tira de acciones.
- CSS: `.adm-sw-oferta` (el interruptor mini que ya no existe) se retira;
  `.adm-tag-oferta`, `.adm-orow-tick`, `.adm-acordeon*`, `.por-categoria`/`.sin-precio` y
  las filas de grid `.adm-f-osueltos`/`.adm-f-otab` vuelven, porque la sección que los usa
  también vuelve. El fix de `border-radius` en `.adm-orow` (línea recta entre filas,
  novena ronda) se conserva tal cual: es un fix de estética no relacionado con el
  interruptor revertido, no algo que la cuarta/quinta ronda introdujera.
- Comentarios que documentaban el interruptor revertido (los de "MISE-B, cuarta ronda" /
  "quinta ronda" sobre `oferta_meter`, el buscador de sueltos retirado, etc.) se quitan
  junto con el código que describían. Esta entrada de SPEC.md no borra las de la cuarta y
  quinta ronda — quedan como registro de lo que se intentó y por qué se deshizo — pero
  queda dicho aquí, explícito, que están **superadas**.

Verificado en vivo: marcar una categoría y un plato suelto desde la pestaña Ofertas
persiste correctamente en `estado.json` vía el `guardar_oferta` original; el enlace
"Oferta" en Platos es un `<a>` plano (`isForm:false`) que nunca dispara un POST.

**2. Categorías abiertas por defecto — vuelve al contrato de la segunda ronda.** La
octava ronda había introducido "sólo la primera categoría abierta" para acortar el
scroll inicial; el propietario pide volver a TODAS abiertas de inicio. Revertido: cada
`.adm-cat-grupo` nace sin `.plegado`, cada `.adm-cat-sep` con `aria-expanded="true"`. El
mecanismo de plegado (clase, `aria-controls`, `.adm-cat-filas`, `.forzado-abierto`) no se
toca — sigue siendo el mismo de siempre, y el usuario puede plegar lo que quiera después.
Verificado: 40/40 categorías sin `.plegado` y con `aria-expanded="true"` al cargar.

**3. `aria-expanded` durante filtros — ya no miente.** `aplicarFiltro()` ya movía
`.forzado-abierto` para enseñar visualmente una categoría plegada con resultados, pero
nunca tocaba el `aria-expanded` del botón: un lector de pantalla seguía oyendo
"contraído" sobre una lista que un usuario vidente veía perfectamente abierta. Se añade
un cálculo de "expandido efectivo" (`!plegado || forzado-abierto`) dentro del mismo bucle
que ya recorre cada ficha en cada tecla del buscador — sin nueva estructura, sin guardar
nada aparte. Verificado con "Vegetarianos": plegada a mano (`aria-expanded="false"`),
buscar "Pakora" la fuerza abierta (`aria-expanded="true"`, filas visibles), limpiar el
buscador la devuelve exactamente a como estaba (`aria-expanded="false"`, plegada).

**4. Área táctil ampliada en `pointer:coarse`/`hover:none`, sin tocar el tamaño
visual.** Agotado (36×21) y Destacado (pastilla de 26px) se quedan exactamente con las
medidas de siempre — lo que crece es sólo la zona que responde al toque, y sólo en
dedo/sin hover: un `::before` invisible y absoluto, con offsets negativos por lado
(asimétricos en Destacado, para no comerle sitio a su vecino inmediato dentro del mismo
grupo de acciones), ronda los ~44px sin mover ni un píxel el layout ni el alto de la
fila. En escritorio (`pointer:fine`) la media query ni se evalúa: `content` computado da
`none`, cero coste, cero cambio. Verificado con `getComputedStyle(el,'::before')` en
ambos anchos: 375px con emulación táctil dispara la regla (offsets `-11px`/`-4px` en
Agotado, tamaño visual intacto en 36×21); escritorio no la dispara en absoluto.

## MISE-B Fase 1 — Ofertas: autoguardado de categorías y platos (7 Sep 2026)

Principio explícito del propietario, sin ambigüedad: Ofertas sigue siendo el único sitio
que escribe `estado['offer']` — esto no reabre la puerta que se cerró en la auditoría
correctiva. Es una mejora de UX dentro de la propia pantalla de Ofertas: marcar una
categoría o un plato suelto obligaba a bajar hasta «Guardar cambios», y ese botón manda
`pct`/`horas`/`días`/`on` a la vez — un guardado a medio escribir el porcentaje se
publicaba entero sólo por tocar una casilla no relacionada.

**Dos manejadores nuevos, cada uno con una sola responsabilidad.** `oferta_cat_toggle`
toca únicamente `offer['cats']`; `oferta_plato_toggle` únicamente `offer['keys']`. Ninguno
de los dos lee ni escribe `pct`/`from`/`to`/`days`/`on`, ni la colección `cats`/`keys` que
no le corresponde — se leen del `estado.json` de disco tal cual están, se muta un único
campo, se escribe. `oferta_plato_toggle` rechaza el plato si su categoría entera ya está
marcada o si no tiene precio (mismo criterio que ya aplicaba el checkbox `disabled` del
lado del cliente — comprobado también en servidor, por si llega un POST directo). Ninguno
de los dos exige que la oferta esté encendida: igual que `guardar_oferta`, se puede dejar
todo preparado con el interruptor apagado.

**Cliente: fetch aislado, nunca el formulario completo.** Cada checkbox (`cat[]`,
`oferta_plato[]`) sigue llevando `form="ofertas-form"` (por si algún día hace falta el
botón), pero su `change` ya no espera a ese botón: construye un `URLSearchParams` con
sólo su propio campo + csrf y lo manda por `fetch` directo. `guardar_oferta` no se toca.

**Cola en vez de fetch suelto.** Marcar varias filas muy rápido podía lanzar dos
`fetch` en paralelo, cada uno con su propio read-modify-write sobre `estado.offer`
leído del disco en el mismo instante — el que terminara después pisaría los cambios del
otro. `encolarOferta()` es una promesa que se re-encadena en cada llamada: el siguiente
guardado no se manda hasta que el anterior termina, éxito o fallo. Verificado marcando 3
platos sueltos casi a la vez: los 3 aparecen en `estado.json`, ninguno se pierde.

**UX: optimista, con reversión exacta, sin infraestructura de aviso nueva.** El check
visual (clase `es-oferta`/`por-categoria`, `disabled` de los platos de una categoría) se
aplica ANTES de saber si el guardado sale bien — es la respuesta inmediata que pide la
tarea. Si el `fetch` falla, se revierte exactamente lo que se aplicó (mismo par de
funciones, llamadas con el estado contrario) y la propia casilla volviendo a su sitio ES
el aviso — no se añadió toast, banner ni mensaje: verificado que `#toasts` sigue vacío
tras un fallo simulado. El checkbox se deshabilita mientras su petición viaja (impide una
segunda pulsación sobre él mismo) y se rehabilita al terminar, salga bien o mal.

**Ayuda actualizada.** El texto de "Categorías enteras" dice ahora que categorías y
platos sueltos se guardan al momento, y que «Guardar cambios» sólo hace falta para
descuento/horario/días. El comentario de cabecera de la sección también se corrigió —
antes decía "todo guarda con el mismo botón", ya no es cierto.

Verificado en vivo, contra `estado.json` real: marcar/desmarcar plato persiste y
desaparece sin tocar `percent`/`from`/`to`/`days`/`on` (se dejaron cambios sin guardar en
esos campos a propósito antes de cada prueba, y sobrevivieron intactos); marcar/desmarcar
categoría igual, sin tocar `keys`; los platos de una categoría marcada quedan
`disabled` + `.por-categoria` y se liberan al desmarcarla; 3 guardados casi simultáneos no
pierden ninguno; un fallo de red simulado (`fetch` sustituido) revierte el checkbox, la
clase visual y el `disabled`, sin dejar rastro en `#toasts`. Platos sigue exactamente
como quedó en la auditoría correctiva: sin `oferta_meter`/`oferta_quitar`, sin switch, el
indicador es un `<a>` a `?t=ofertas`.

## MISE-B Fase 1 — Ofertas: autoguardado fase 2 (7 Sep 2026)

Extiende la fase 1 (categoría/plato) a los cuatro campos que quedaban: porcentaje,
horario, días y encendida/apagada. Mismo principio explícito: Ofertas sigue siendo el
único sitio que escribe `estado['offer']`; esto es UX dentro de esa misma pantalla, no
una reapertura de lo que se cerró en la auditoría correctiva.

**Cuatro manejadores, cada uno una sola responsabilidad.** `oferta_pct_guardar` toca sólo
`percent` (1-90). `oferta_horario_guardar` toca sólo `from`+`to` juntos, nunca por
separado — validar uno sin el otro no tiene sentido cuando la regla es "hasta > desde".
`oferta_dias_guardar` toca sólo `days`, con el mismo criterio que ya tenía
`guardar_oferta`: una colección vacía nunca se persiste, cae a los siete días
(`$dias ?: [1..7]`) — "Semanal" pulsado con los siete ya encendidos los desmarca en el
navegador, pero el servidor los conserva. `oferta_estado_toggle` toca sólo `on`: apagar
nunca borra nada; encender exige —contra lo que YA está en disco, no contra el
formulario— categoría o plato, al menos un día, porcentaje 1-90 y horario válido.
Ninguno de los cuatro reconstruye `offer` entero ni relee los campos de los otros tres.

**Misma cola de la fase 1, reutilizada tal cual.** `encolarOferta`/`autoguardarOferta` no
se tocan en su forma — se les enseña a serializar valores array (`datos.append` en vez de
`new URLSearchParams(objeto)`, que aplanaría `dia[]` a una cadena con comas) para que
`oferta_dias_guardar` pueda mandar la colección completa de días de una vez, con el mismo
mecanismo de "el siguiente guardado espera a que el anterior termine" que ya usan
categoría y plato. Las dos llamadas de la fase 1 seguían funcionando sin tocarlas: la
extensión es compatible hacia atrás.

**Respuestas del backend, ahora inequívocas.** `http_response_code(422)` en cada rechazo
de negocio (porcentaje fuera de rango, horario invertido, encender sin alcance/día/
horario/porcentaje válidos) y `500` en un fallo real de escritura en disco — antes TODO
devolvía 200 aunque `$error` estuviera puesto, y un `fetch` que sólo mirase `r.ok` no
podía distinguir "guardado" de "rechazado".

**Se encontró y se corrigió el mismo hueco en los dos manejadores de la fase 1**
(`oferta_cat_toggle`/`oferta_plato_toggle`): tampoco marcaban 422 en sus rechazos ("esa
categoría no existe", "ese plato no se puede tocar suelto"), así que un plato ya cubierto
por su categoría se podía "marcar" en el cliente y el servidor lo rechazaba en silencio
con un 200 — el checkbox se quedaba marcado aunque `keys` nunca cambiara. Encontrado
mientras se probaba la concurrencia de esta ronda (categoría + uno de sus propios platos
casi a la vez) y corregido con el mismo patrón que ya se estaba aplicando aquí: no es
rehacer la fase 1, es añadirle el código de estado que le faltaba a un `$error` que ya
existía. Reproducido con `fetch` crudo antes y después del arreglo: 200/`keys` sin tocar
→ 422/`keys` sin tocar, y con eso el cliente ya revierte la casilla como toca.

**Corrección adicional de revertido.** El manejador de plato de la fase 1 rehabilitaba el
checkbox con `disabled = false` a ciegas al terminar su propio guardado — si una
categoría se marcó mientras ese guardado viajaba, esto deshacía el bloqueo que le
correspondía por pertenecer a ella. Pasa a recalcular `disabled` desde
`fila.classList.contains('por-categoria')` en vez de asumir `false`.

**Verificado en vivo, contra `estado.json` real:** porcentaje 20→30 con reload;
inválido no persiste y el campo vuelve a 30; Enter guarda igual que el blur. Horario
09:00/14:30 persiste junto; una combinación inválida (18:00/10:00) revierte los DOS
campos. Un día suelto persiste; "Semanal" usa la misma función (verificado que activa
los 7 y que, pulsado con los 7 ya activos, el servidor conserva los 7 aunque el
checkbox visual de "Semanal" quede en 0 — el mismo `$dias ?: [1..7]` de siempre, ahora
visible por primera vez porque ya no hace falta recargar para comprobarlo). Apagar
conserva cats/keys/percent/horario/días; encender con esa configuración funciona;
encender con alcance vacío se rechaza (422) y el interruptor revierte solo. Cuatro
cambios de tipo distinto (día + plato + porcentaje + categoría) lanzados casi a la vez
persisten los cuatro sin perder ninguno. `ofertas-form`/«Guardar cambios» siguen
existiendo, visibles, y un guardado tradicional por ese camino se probó y sigue
funcionando de punta a punta.

## MISE-B — prueba: platos sueltos sin acordeón, en bento de 3 columnas (7 Sep 2026)

Prueba explícita, sólo en Ofertas: "si queda bien lo trasladamos a Platos". Se retira el
acordeón (`<details>`/`<summary>`, `.adm-acordeon*`) y cada categoría pasa a ser su
propia ficha del bento (`.adm-cat-bento`), TODAS visibles a la vez, tres por fila
(`grid-column:span 2` de 6) — nada que abrir ni cerrar. Cada ficha lleva su propia lista
con scroll interno (`.adm-cat-bento-lista{max-height:570px;overflow-y:auto}`) para que
una categoría de 40 platos no empuje a las demás fuera de la vista. `data-cat-acordeon`
pasa a `data-cat-bento`; el buscador/filtro (`aplicar()`) ya no necesita abrir nada
(`ficha.open` no existía en un `<div>`), sólo esconde filas y, si a una ficha no le
queda ninguna, la ficha entera — más simple que antes, no sólo distinto. Checkbox,
autoguardado, handlers y contrato de datos: sin tocar, verificado que un plato se marca
y persiste igual que antes del cambio.

**Hallazgo real, no cosmético: a tres columnas, una fila no cabe en una línea.** El
objetivo pedía "hasta 15 platos visibles"; medido en vivo, cada ficha mide ~365px a
1512px de viewport, y una fila (casilla + número + nombre + subtítulo + precio) en ese
ancho envuelve a dos líneas de forma desigual entre filas — descubierto midiendo
`getBoundingClientRect()` de verdad, no asumido. Se corrige la desigualdad con una
media query de CONTENEDOR (`@container adm-cat-bento (max-width: 480px)`, no de
viewport: una ficha estrecha en escritorio se trata como una fila estrecha de móvil,
sea cual sea el ancho de la ventana) reutilizando el mismo partido en dos líneas que ya
tenía esta lista para pantallas pequeñas — filas ahora consistentes, todas a 101px. Pero
101px × fila deja sólo ~5-6 visibles en 570px, no 15: el objetivo de "15 platos" y el de
"tres columnas" chocan con el contenido real de la fila a este ancho. No se ha tocado el
contenido de la fila (ninguna de las CONSERVAR de la auditoría) para forzar el número —
eso ya sería una decisión de diseño nueva, no parte de esta prueba. Queda así para que
se vea el resultado real antes de decidir: aceptar el scroll con menos filas a la vista,
bajar a dos columnas (más ancho por fila, menos envoltura), o simplificar el contenido de
la fila a este ancho — de las tres, ninguna se ha tomado por cuenta propia.

Verificado en vivo: 40 fichas, tres por fila a 1512px (viewport confirmado por
`getBoundingClientRect`, misma fila superior para las tres primeras); sin overflow
horizontal en 375px (una columna, fichas a 305px, `container query` sigue aplicando el
partido en dos líneas ahí también, igual que ya hacía el `@media` de antes); marcar un
plato autoguarda igual que antes de la prueba; buscar "lentejas" filtra filas y fichas
correctamente y, al limpiar, las 40 fichas vuelven a verse (0 ocultas). Sin tocar Platos,
sidebar, cabecera, filtros, Ajustar precios, Marca, Ajustes, Juego, Publicidad ni
Analítica.

## MISE-B — prueba bento, segunda pasada: categoría en la ficha + precio fijo (7 Sep 2026)

Dos ajustes sobre la prueba anterior, misma sesión.

**"Categorías enteras" desaparece; su interruptor se muda a la cabecera de cada ficha.**
Antes había dos sitios para la misma decisión — una rejilla aparte con las cuarenta
categorías, y debajo las mismas cuarenta como fichas con sus platos — y había que
relacionar una fila de la rejilla con la ficha de abajo a ojo. Ahora cada ficha lleva su
propio interruptor de "categoría entera" en la cabecera (mismo interruptor mini que
Agotado/Oferta, verde), con el mismo `cat[]`/`oferta_cat_toggle`/autoguardado de
siempre — sólo cambia dónde vive. Se retira la sección `adm-f-ocats` entera y, con ella,
`$catsVisibles` (sin más consumidores) y las clases `.adm-cats`/`.adm-cat`/`.adm-cat-nm`/
`.adm-cat-n` (sin más usos). Verificado: marcar el interruptor de una ficha persiste en
`cats`, bloquea los platos sueltos de esa categoría exactamente igual que antes.

**El precio deja de poder caer a una segunda línea — no se acorta la ficha, se acorta el
texto.** La ronda anterior, al medir, encontró filas de alto desigual (112px / 74px) a
tres columnas; el apaño fue dejar que la fila envolviera en dos líneas
(`flex-wrap:wrap`), pero eso es precisamente lo que dejaba caer el precio a su propia
línea cuando el conjunto no cabía — el precio (`.adm-prow-fijo`) siempre fue
`flex:0 0 auto;white-space:nowrap`, nunca fue él quien envolvía: era la FILA quien
reordenaba sus piezas. Se revierte ese `flex-wrap` y se aplica la regla contraria: la
fila nunca envuelve, y el nombre/descripción —el único elemento elástico— se recorta con
`text-overflow:ellipsis` cuando no cabe. Medido tras el cambio: pista de casilla y precio
comparten exactamente la misma línea vertical (17-39px dentro de la fila, idénticos los
dos), la fila queda en 57px consistentes en las seis primeras filas medidas (antes:
112/74/…, desigual), y el nombre trunca de verdad (`scrollWidth` 156px sobre
`clientWidth` 126px disponibles). Con el alto de fila ya fijo y conocido, el "hasta 15
platos visibles" del objetivo original —que la ronda anterior no alcanzaba, sólo daba
para 5-6— se recalcula con el dato real: `max-height` pasa de 570px (una estimación a
ciegas) a 855px (57px × 15, medido). Verificado: 15 filas visibles antes de que el
scroll interno de la ficha entre en juego.

Sin tocar Platos, sidebar, cabecera, filtros, Ajustar precios, Marca, Ajustes, Juego,
Publicidad ni Analítica.

## MISE-B — prueba bento, tercera pasada: pule el "marcar todos" (7 Sep 2026)

Tres retoques sobre el interruptor de categoría entera y el límite de la ficha.

**El interruptor de "toda la categoría" cambia de sitio y gana una palabra.** Iba
DELANTE del nombre, desnudo (sin texto, sólo `title`/`aria-label`) — se leía como un
control suelto sin decir qué hacía hasta pasar el ratón. Pasa a ir DETRÁS de nombre,
insignia y contador (se lee la fila entera antes de llegar a la acción) y lleva la
palabra "Todos" visible al lado del interruptor, no sólo accesible. Mismo `cat[]`/
autoguardado, mismo interruptor mini verde — sólo cambia el orden y que ahora se ve.

**El contador "N en oferta" pasa a naranja de marca.** Antes `--marca-velo-mas`/`--ink`,
un gris apenas teñido igual que el resto de la cabecera — la única cifra que dice "aquí
hay algo encendido" no se distinguía de las que sólo informan (nombre, total de platos).
Pasa a `--accent`/`--accent-ink`, el naranja real del cliente. Verificado tras recargar
(esta insignia es de servidor, no la pinta JS): `rgb(255, 117, 23)` de fondo.

**El límite baja de 15 a 10 platos visibles por ficha.** Mismo cálculo que la ronda
anterior (57px por fila, medidos), `max-height` de 855px a 570px. Verificado: 10 filas
visibles antes de que entre el scroll interno de la ficha.

Sin tocar Platos, sidebar, cabecera, filtros, Ajustar precios, Marca, Ajustes, Juego,
Publicidad ni Analítica.

## MISE-B — prueba bento, cuarta pasada: 8 filas, adyacencia, casilla naranja (7 Sep 2026)

**Límite a 8 platos visibles** (antes 10). Mismo cálculo (57px medidos × 8 = 456px).

**Scroll interno: ya heredaba el fino/oscuro de `.card-main`.** `.card-main
::-webkit-scrollbar*`/`scrollbar-color` son reglas DESCENDIENTES, así que ya alcanzaban a
`.adm-cat-bento-lista` sin repetir nada — verificado, no hacía falta una regla nueva.

**La insignia "N en oferta" no quedaba pegada al título.** `.adm-cat-bento-nm` era
`flex:1 1 auto`: aunque el texto («Sopas») fuera corto, la CAJA se estiraba a todo el
hueco sobrante, y la insignia —que va justo después en el marcado— aparecía pegada al
BORDE de esa caja, lejos del texto. Pasa a `flex:0 1 auto` (encoge a su contenido, con su
propio `text-overflow:ellipsis` por si el nombre es largo) y es el contador
(`.adm-cat-bento-n`) quien se empuja al extremo derecho (`margin-left:auto`) — nombre e
insignia quedan juntos a la izquierda, contador e interruptor "Todos" juntos a la
derecha. Verificado: 11px de hueco entre el borde del texto y la insignia, el mismo
`gap` de toda la cabecera — ya no una franja vacía de más.

**Los platos sin precio se retiran de la lista — "no aplica", tal cual.** Se filtran a
la entrada, al construir `$porCategoria`: una categoría que sólo tuviera platos sin
precio no llega a tener ficha (nunca se le añade ni un plato). Con eso, `$sinPrecio`
deja de poder ser verdadero en este bucle — se retira la variable y sus tres usos (clase
`.sin-precio`, el `disabled` que aportaba, el texto "· sin precio"), y con ellos la regla
CSS `.adm-orow.sin-precio` (se deja `.por-categoria`, que sigue en uso) y el guardián
homónimo en `marcarPorCategoria()`. El guardián de servidor en
`oferta_plato_toggle` (comprueba `$porKey[$k]['price']` contra un POST directo) NO se
toca: es una defensa de otra capa, no depende de qué se liste aquí. Verificado: cero
filas `.sin-precio` en el DOM tras el cambio.

**Casilla marcada, en naranja — y un intento de arreglar un rojo que no se pudo
reproducir del todo.** Dos cosas en la misma captura del propietario:

1. El tick de "marcado" (`.adm-orow-tick`) usaba `--marca-fondo`/`--marca-ink` —tokens
   pensados para la selección de Publicidad, no para esto— y salía gris. Pasa a
   `--accent`/`--accent-ink`, el naranja real. Verificado tras el cambio: `rgb(255, 117,
   23)` de fondo.
2. La captura mostraba una marca roja junto a las filas marcadas, con el ratón encima.
   Auditado el HTML de una fila marcada real: no hay ningún elemento de más — ni una
   "x", ni un icono, nada que lo explique desde el marcado propio de la fila. Descartados
   también los sospechosos obvios del resto de la página: `#dest-et` y `#recorte`
   (los formularios flotantes compartidos de Platos) están en `display:none` en Ofertas,
   y `#toasts` está vacío y con `pointer-events:none`. Lo único fuera de sitio
   encontrado: la casilla nativa oculta llevaba `appearance:auto` pese a estar en 1×1px
   y opacity:0 — el navegador seguía tratándola como un control vivo. Se añade
   `appearance:none` (a `.adm-orow input` y, por la misma razón, a `.adm-sw input`): es
   lo correcto para una casilla que ya se sustituye entera por su propio tick, se sepa o
   no si era la causa exacta de lo visto. Queda pendiente que el propietario confirme si
   el rojo desapareció con esto.

Sin tocar Platos, sidebar, cabecera, filtros, Ajustar precios, Marca, Ajustes, Juego,
Publicidad ni Analítica.

## MISE-B — quinta pasada: sin reacción al ratón en fila ya marcada (7 Sep 2026)

El propietario aclaró lo del rojo de la ronda anterior: era el propio hover, y una vez
marcada la fila no hace falta que reaccione al ratón — la casilla naranja ya basta como
aviso.

`.adm-orow.es-oferta:hover{background:var(--marca-velo-mas)}` aclaraba el fondo al
pasar el ratón por una fila ya en oferta, distinto de su reposo (`--marca-velo`). Pasa a
`background:var(--marca-velo)`, igual que en reposo: la fila no cambia nada al pasar el
ratón por encima.

Mismo criterio para Platos, donde la misma clase `.adm-orow` sirve de base a los
indicadores de agotado y destacado (`.adm-platorow`, de sólo lectura desde la auditoría
correctiva): sin una regla `:hover` propia, esas filas heredaban el hover genérico
`.adm-orow:hover{background:var(--chip)}` y perdían su tinte (rojo de agotado, naranja
de destacado) al pasar el ratón. Se añade `.adm-orow.es-agotado:hover` y
`.adm-orow.es-destacado:hover`, cada uno con el mismo fondo que su propio reposo — misma
solución que en Ofertas, no una nueva.

`.adm-agrow`/`.adm-agrow-marca` (una fila de agotado de un diseño anterior a
`.adm-platorow`) siguen sin usarse en ningún marcado del fichero — código muerto, ya
detectado antes de este cambio y fuera de alcance; no se toca aquí.

Sin tocar la lógica de agotado/destacado/oferta, sólo el fondo en `:hover`. Sin tocar
sidebar, cabecera, filtros, Ajustar precios, Marca, Ajustes, Juego, Publicidad ni
Analítica.

## MISE-B — limpieza: código muerto `.adm-agrow` (7 Sep 2026)

Pendiente de la ronda anterior: `.adm-agrow`, `.adm-agrow-marca` y `.adm-agrow .camara`
(seis reglas en total, de un diseño de la fila de agotado previo a `.adm-platorow`) no
tenían ningún `class="adm-agrow..."` en el HTML del fichero — confirmado por grep antes
de tocar nada. Se retiran las seis reglas. El comentario de cabecera ("la fila de
agotado...") se conserva: sigue describiendo las reglas `.adm-orow.es-agotado` que van
justo debajo, esas sí en uso.

De paso, se comprobó que `.adm-agrow .camara{margin-left:auto}` tampoco encajaba con el
`.adm-platorow` actual: la cámara es el PRIMER elemento de la fila (antes del nombre),
no el último — esa regla era de una disposición anterior, no de la vigente. Confirma
que la retirada es segura, no sólo "sin selector que la alcance".

Verificado: `grep -n "adm-agrow"` sobre el fichero, cero resultados. `php -l` limpio.

Sin tocar nada más.

## MISE-B — la prueba bento queda bien: se traslada a Platos (7 Sep 2026)

La prueba en Ofertas quedó bien y el propietario pidió trasladarla a Platos. Mismo
mecanismo (`.adm-bento`/`.adm-cat-bento`/`.adm-cat-bento-cab`/`.adm-cat-bento-lista`, ya
en la hoja de estilos), sustituyendo al separador+lista de la corrección de paridad
anterior — sin volver al acordeón que el propietario ya había rechazado, y cumpliendo
igual de bien (mejor, de hecho) su misma regla: nunca una puerta que abrir.

**Qué cambia.** `<div class="adm-platos-lista">` con cuarenta `<div class="adm-cat-grupo">`
(separador `<button class="adm-cat-sep">` + lista `<div class="adm-cat-filas">`) pasa a
`<div class="adm-bento adm-platos-lista">` con cuarenta `<section class="adm-f
adm-cat-bento" data-cat-bento data-cat="…">`: cabecera fija (nombre, pestaña, contador) y
lista con scroll propio (`.adm-cat-bento-lista`). Ni una fila (`.adm-orow.adm-platorow`) ni
un handler tocados — cámara, precio, oferta (aviso), destacado y agotado son exactamente
los mismos elementos, mismos `name`, mismos `form`. Se retira el código que sólo servía al
plegado: `.adm-cat-grupo`, `.adm-cat-sep*`, `.plegado`/`.forzado-abierto` (CSS) y el
`aplicarFiltro()`/listener de plegado (JS) — confirmado sin más usos por grep antes de
borrar.

**Sin el interruptor "Todos" de Ofertas.** Ese interruptor mete la categoría ENTERA en la
oferta — una acción que en Platos no tiene equivalente (no hay "marcar toda la categoría"
de nada): la cabecera de Platos lleva sólo nombre y contador, sin ningún control nuevo.

**La fila de Platos es mucho más ancha que la de Ofertas** (cámara, número, nombre, precio,
aviso de oferta, destacar y agotado, todo en la misma fila) y una ficha de tres columnas
le deja unos 340px en escritorio normal — bastante menos de lo que esa fila necesita en
una línea. Se reutiliza el mismo tratamiento que ya tenía para móvil estrecho (≤699px de
VIEWPORT: `flex-wrap` en la fila y en el grupo de acciones), pero disparado por el ANCHO DE
LA FICHA vía container query (`@container adm-cat-bento (max-width:620px)`), no por el
viewport — una ficha estrecha en un monitor grande es el mismo problema que una fila en un
móvil. Dos ajustes propios de la ficha, medidos en vivo:
- El sangrado `margin-left:calc(2.6em + 11px)` de la versión móvil (para alinear el grupo
  de acciones bajo el nombre en una fila a todo el ancho de pantalla) se quita aquí: en
  340px ese hueco es media ficha. Con el sangrado fuera, precio+aviso+destacar+agotado
  pasan de necesitar dos líneas a caber en una casi siempre.
- El guión "—" de "sin oferta" (`aria-hidden`, sólo alineaba esta columna con la de al
  lado en la lista de una sola columna) se oculta dentro de la ficha: no alinea nada en un
  grid y le quitaba al interruptor de agotado los 20-30px que le faltaban para caber en la
  misma línea que el resto.

Medido en vivo (1440px, tres columnas, ficha de 341px): fila normal 151px (cámara+número,
nombre, acciones — tres líneas cortas); fila con el aviso "Oferta" (más ancho que el
guión que sustituye) sube a 193px al no caberle todo en una línea de acciones. Con eso,
`.adm-cat-bento-lista` de Platos NO hereda el tope de 8 filas de Ofertas (456px — saldría
una ficha de más de metro y medio): tope propio de 610px, cuatro filas visibles antes del
scroll interno (`.adm-platos-lista .adm-cat-bento-lista{max-height:610px}`, más específico
que la regla compartida y la gana sin tocarla).

**Verificado en vivo**, con las 312 filas reales:
- Buscador (`#q`): "papadum" deja 2 fichas y 4 filas visibles, el resto oculto, `#vacio`
  sigue oculto.
- Filtro de categoría (`#filtro-cat` → Aperitivos): 1 sola ficha visible.
- Chips de estado (Con oferta): 1 ficha, 2 filas, las dos con `.es-oferta`; Todos
  devuelve las 312.
- Precio: cambiar el campo y salir (blur) autoguarda por fetch — confirmado en
  `estado.json`, con el espejo de siempre a la clave legacy y a la hermana de Vegano.
- Agotado: casilla y clase `.es-agotado` se sincronizan al cambiar, igual que antes.
- Destacar: el combobox se inserta bien DENTRO de la ficha con scroll (`.adm-cat-bento-lista`
  sigue siendo su ancestro), no fuera de ella.
- Cámara: el manejador delegado sigue enganchando el botón y abre el editor o el selector
  de fichero según si el plato ya tiene foto.
- Móvil (375px): la rejilla cae a una columna (`.adm-bento` por defecto es
  `minmax(0,1fr)`, el bento de 3 sólo entra a partir de 1000px) — 40 fichas y 312 filas
  intactas, la ficha se comporta como la lista de siempre.

Sin tocar Ofertas, sidebar, cabecera, Ajustar precios (fuera del ajuste de layout de la
fila), Marca, Ajustes, Juego, Publicidad ni Analítica. Estado de prueba del navegador
(precio de Papadum a 99,99, un agotado marcado y desmarcado) limpiado del `estado.json`
del entorno aislado antes de cerrar la ronda — no toca datos reales.

## MISE-B — una sola línea de verdad, y el interruptor de Ofertas se hace igual que Platos (7 Sep 2026)

El propietario, con captura: la fila de Platos en bento se apilaba en tres pisos (cámara+
número, nombre, precio+oferta+destacar+agotado) — "eso así no es admitible". Pidió una
sola línea de verdad. Encima, dos cosas más en el mismo turno: llevar a Ofertas el mismo
interruptor que ya usa Platos por plato (quitando la casilla con tick de toda la vida) con
aviso al marcar, y aprovechar mejor el hueco a la izquierda de la fila de Platos (cámara
pegada al borde, no a mitad de camino).

**Una sola línea, de verdad (Platos).** Cámara, número, precio/"Incluido", oferta,
destacar y agotado no caben ni de lejos en ~340px (tres columnas) si cada uno pide el
hueco de siempre — bastaba con el aviso "Oferta" para superar el ancho de la ficha entera.
Recorte, no apilado, dentro del `@container adm-cat-bento (max-width:620px)` que ya existía
(antes hacía `flex-wrap`, ahora fuerza `nowrap` de verdad):
- El nombre trunca con "…" (antes se apilaba en su propia línea); el subtítulo
  (ingredientes/inglés) se esconde del todo — se conserva en un `title` nuevo sobre el
  nombre, un vistazo con el ratón lo sigue dando.
- "Destacar" (el botón para abrir el selector, NO la etiqueta ya puesta) pierde la palabra
  y se queda en un icono de estrella — el texto (`<span class="txt">`) sigue en el marcado
  y se ve en cualquier otro sitio donde quepa de sobra; sólo se apaga aquí dentro.
- La insignia "Oferta" pasa de palabra a icono de "%" — mismo enlace, mismo destino,
  `aria-label` nuevo con el nombre del plato para que no se pierda información al quitar
  el texto visible.
- El precio se estrecha a 46px (lo que pide un importe con coma), la cámara a 32px (el
  área táctil de dedo/sin hover NO se reduce igual: `::before` propio que simula el hueco
  de 44px de siempre, mismo patrón que ya llevaba Agotado/Destacado).
- La etiqueta YA puesta (Bestseller, Veggie favourite…) es información real, no
  decoración — se queda en texto, con tope de 60px y "…" si no le cupiera entera, más un
  `title` nuevo con la etiqueta completa para el que pase el ratón.
- El guión "sin oferta" (alineaba una columna que ya no existe en un grid) se esconde
  dentro de la ficha.

Medido en vivo (1440px, tres columnas): fila normal 59px (antes 151-193 según llevara
aviso de oferta o no) — prácticamente la misma altura que una fila de Ofertas (57px).
Probado con el nombre más largo de las 312 filas («Naan Kheema especial (cordero picado y
queso)», 45 caracteres): sigue en 58px, trunca, no se apila. Con eso, el tope de altura
propio de Platos (610px, pensado para la fila de tres pisos) sobra: se retira y hereda el
de 8 filas compartido con Ofertas (456px), que ya le vale con la fila del mismo alto.

**Aprovechar el hueco: la cámara al borde.** `.adm-cat-bento` heredaba `padding:21px` de
`.adm-f` (el margen de cualquier ficha del panel) DE MÁS: la cabecera y la lista ya llevan
el suyo propio (`0 14px` cada una), así que ese heredado sólo sumaba un cerco extra sin
usar — 21+14+10=33px antes de que la cámara empezara. Se apaga con `.adm-cat-bento
{padding:0}`: ahora el hueco es 14(lista)+10(fila)=24px, el mismo que ya tenía Ofertas de
toda la vida (verificado: 25px en ambas, la fila de Ofertas nunca dio ese problema). Un
fix del componente bento en general, no un parche sólo de Platos — beneficia a las dos
pestañas por igual, sin tocar `.adm-f` (el margen de cualquier otra ficha del panel se
queda exactamente igual).

**Ofertas: el mismo interruptor que Platos, por plato.** La fila de "platos sueltos" en
Ofertas usaba una casilla con un tick propio (`.adm-orow-tick`) dentro de un `<label>` que
envolvía la fila entera — clic en cualquier parte de la fila marcaba. Pasa al mismo
patrón que ya usa Platos: la fila deja de ser `<label>` (pasa a `<div>`, como en Platos) y
lleva su propio interruptor mini al final (`<label class="adm-sw adm-sw-oferta">`, mismo
tamaño 36×21 que "Todos"/Agotado) — sólo se marca tocando el interruptor, no la fila. El
POST no cambia ni una coma: mismo `name="oferta_plato[]"`, mismo `form="ofertas-form"`,
mismo `oferta_plato_toggle` de siempre — un interruptor y un tick son el mismo
`<input type="checkbox">` por dentro, sólo cambia el disfraz. Verde al marcar sin escribir
ni una regla de color: `--ok` ya es un alias de `--accent` en este cliente
(`rgb(255,117,23)`, confirmado en vivo), la misma familia "esto está elegido" que el resto
del panel. `.adm-orow-tick` (CSS y comentario que la explicaba) se retira entera —
confirmado por grep que no queda ni un uso.

**Aviso al marcar.** "Puesto en oferta." por `window.toast` (la misma función global que ya
usa Platos para "Guardado.", ninguna infraestructura nueva) — sólo tras confirmar el
guardado, no en el pintado optimista de antes (que podría acabar revertido), y sólo al
marcar: quitar de la oferta no lo pidió el propietario y ya se ve solo con el interruptor
volviendo a su sitio.

**Verificado en vivo:** las 312 filas de Platos sin ni una con `scrollWidth > clientWidth`
(cero desbordes); precio, agotado, destacar y cámara siguen funcionando igual que antes del
recorte; en Ofertas, marcar un plato suelto autoguarda y dispara el toast, la categoría
"Todos" sigue deshabilitando/rehabilitando los interruptores sueltos de sus 38 fichas al
marcar/desmarcar (293 filas comprobadas), búsqueda y filtro de categoría de Platos intactos.

Sin tocar `oferta_plato_toggle`/`oferta_cat_toggle`/`guardar_agotados`/`guardar_oferta` ni
ningún otro handler — sólo marcado y CSS. Sin tocar sidebar, cabecera, Ajustar precios,
Marca, Ajustes, Juego, Publicidad ni Analítica.

## MISE-B — se quita "Todos" de la cabecera de Ofertas (7 Sep 2026)

El propietario, en el mismo turno: "esto nunca va a pasar" — meter una categoría entera
en la oferta no es un caso real de su negocio. Se retira el interruptor "Todos"
(`<label class="adm-sw adm-sw-cat">`, con su `input[name="cat[]"]`) de la cabecera de
cada ficha; queda sólo nombre, pestaña y contador — la misma cabecera, ahora, que Platos.

Se retira también toda la CSS que sólo servía a ese interruptor (`.adm-sw-cat`,
`.adm-sw-cat-txt` y sus estados — seis reglas, confirmado por grep que no queda ni un uso
fuera de la ficha borrada). El handler `oferta_cat_toggle` en PHP y el campo `cats` de
`estado.json` NO se tocan: sin nada en la interfaz que los dispare quedan inertes, y tocar
el contrato del backend no era parte de este encargo — sólo la interfaz. Si algún día se
retira también eso, es una tarea aparte con su propio encargo.

Sin tocar el interruptor por plato (`adm-sw-oferta`, de la ronda anterior en esta misma
sesión) ni ningún otro handler. Sin tocar Platos, sidebar, cabecera, Ajustar precios,
Marca, Ajustes, Juego, Publicidad ni Analítica.

## FIX — la barra lateral desaparecía en "Precios a mano" (7 Sep 2026)

Reportado por el propietario: al entrar en Precios a mano (el paso 2 de "Ajustar
precios") la barra lateral desaparecía entera. Confirmado en el marcado: tanto
`<nav id="adm-sidebar">` como `<nav class="adm-navmovil">` (la barra inferior de móvil)
llevaban `<?= $previsua ? ' hidden' : '' ?>` — se ocultaban a propósito en cuanto se
entraba en la pantalla de precios a mano/subida. No hay ninguna otra pieza (CSS ni JS) que
dependa de que la barra esté oculta ahí: el `.adm-board` de al lado no tiene una regla que
se active con `#adm-sidebar[hidden]`, así que reaparece y empuja el contenido con el
layout normal, sin nada que ajustar aparte.

Se retira el `hidden` condicional de las dos barras. Verificado en vivo: con "A mano"
pulsado, `#adm-sidebar` sigue con `display:flex` (248px, sin solaparse con el contenido),
"Platos" se sigue marcando como la sección activa, y en 375px la barra inferior fija sigue
en su sitio (mismo `position:fixed;z-index:20` de siempre, igual que en cualquier otra
pantalla del panel). "Cancelar" sigue devolviendo a la lista normal de Platos.

Sin tocar la lógica de precios (`precios_calcular`/`precios_manual`/`precios_publicar`/
`precios_reset`) ni el resto de la pantalla de precios a mano. Sin tocar Ofertas, cabecera,
Marca, Ajustes, Juego, Publicidad ni Analítica.

## MISE-B — la ficha de categoría, a todo el ancho y a dos columnas (7 Sep 2026)

El propietario pidió llevar a Platos y Ofertas el mismo aprovechamiento horizontal que ya
tiene Precios a mano (`.adm-f-ptab`, una ficha por pestaña a todo el ancho, nunca varias
por fila) — y, dentro de cada categoría, repartir sus platos en dos columnas, la cantidad
partida en dos mitades iguales (no por altura calculada).

**La ficha, a todo el ancho.** `.adm-cat-bento{grid-column:span 2}` (tres por fila) pasa a
`grid-column:1 / span 6` — una categoría, una fila, igual que ya hacía `.adm-f-ptab`. Con
eso deja de competir en alto con las fichas vecinas de su misma fila (ya no las hay), así
que el tope de altura + scroll interno (456px / 8 filas, pensado justamente para que una
categoría de 40 no empujara a las de al lado) deja de hacer falta — se retira, y la ficha
crece lo que necesite, apilada como cualquier otra del panel. Es el mismo motivo, por
cierto, por el que Precios a mano nunca fue a dos columnas de fichas: un comentario ya
antiguo en el propio fichero lo explica — pestañas de 4 y de 60 platos forzarían la misma
altura entre sí en una rejilla de verdad. Aquí no hay ese problema: una ficha por fila no
iguala nada con nadie.

**Dos columnas dentro, repartidas por cantidad.** `.adm-cat-bento-lista` pasa de lista
vertical única a `display:grid;grid-template-columns:1fr 1fr` — y los platos ya llegan
partidos en dos mitades desde PHP (`$columnasPlatos`, `ceil(n/2)` a la izquierda, el resto
a la derecha; el impar de sobra cae en la izquierda), no repartidos por CSS a lo que quepa.
Verificado en las 40 categorías reales de Platos y las 38 de Ofertas: la diferencia entre
columnas nunca pasa de 1 plato, ninguna categoría se queda con una columna vacía.

**Colapso a una columna en ficha estrecha.** Por debajo de 820px de ancho de FICHA
(`@container adm-cat-bento`, no el viewport: es el ancho real de la ficha lo que decide,
la misma ficha puede ser de un ancho o de otro según haya sidebar visible o no) las dos
columnas quedarían más estrechas que la fila de tres de antes — se colapsa a una sola con
`grid-template-columns:1fr`, y esa columna única se lleva todo el ancho de la ficha.
Verificado en vivo a 800px y 650px de viewport: una sola columna, fila en una línea, sin
que ninguna se parta en dos pisos.

**El corte de la fila (icono en vez de palabra, precio estrecho…) ya no mide la ficha:
mide la COLUMNA.** El contenedor de tamaño (`container-type:inline-size`) que antes vivía
en `.adm-cat-bento` (la ficha entera, ahora casi siempre ancha de sobra) se muda a
`.adm-cat-bento-col` (cada columna, que sigue siendo tan estrecha como antes la ficha de
tres por fila — verificado: 504px de columna a 1440px de viewport, contra 341px de ficha
antes del cambio). Los dos `@container adm-cat-bento (…)` que ya existían (el recorte de
Platos a 620px y el de "sólo elipsis" de Ofertas a 480px) pasan a `@container
adm-cat-bento-col (…)`, mismos umbrales, mismas reglas — sólo cambia DE QUÉ se mide el
ancho. Comprobado el hueco entre ese umbral (620px) y el de la vieja regla de viewport
(699px, aún viva para pantallas pequeñas de una sola columna): a 699px de viewport la
columna mide 599px — sigue entrando en el recorte, ninguna fila queda sin cubrir por
ninguno de los dos.

**Verificado en vivo, con datos reales:** 312 filas de Platos y 293 de Ofertas repartidas
correctamente; buscador, filtro de categoría, precio (autoguardado confirmado), agotado y
el interruptor de oferta (con su aviso "Puesto en oferta.") siguen funcionando igual que
antes del cambio — la única diferencia es el envoltorio (`.adm-cat-bento-col` de más,
alrededor de las mismas filas), y el código de filtro ya recorre `.adm-orow`/`.adm-platorow`
sin que le importen los envoltorios intermedios.

Sin tocar ningún handler ni contrato POST. Sin tocar cabecera, sidebar, Ajustar precios,
Marca, Ajustes, Juego, Publicidad ni Analítica.

## Auditoría UX/UI, Fase 1 — H1: "Ajustar precios" se pliega en móvil (7 Sep 2026)

Único hallazgo implementado en esta ronda: H1 de la auditoría. Nada de H2 (selector de
categoría), H3 (ficha de Ofertas) ni H4 (alto de las chips) — quedan para fases propias,
con su propia aprobación.

**El cambio.** El `<div class="adm-ajustar-precios">` de siempre (mismos cinco
formularios/handlers — `precios_calcular`, `precios_manual`, `precios_reset`, ninguno
tocado) pasa a vivir dentro de un `<details class="adm-ajustar-precios-caja" open>`, con
un `<summary>` que lleva el rótulo "Ajustar precios" que antes iba suelto dentro de la
fila. Sin JavaScript, `open` deja esto exactamente como estaba: todo visible, todo
funcionando, cero controles perdidos — es la garantía de progressive enhancement que pedía
el encargo, gratis por usar el elemento nativo en vez de un imitador con JS.

**El corte: 699px, medido, no inventado.** El desbordamiento sólo puede pasar por debajo de
768px (la barra inferior fija, `.adm-navmovil`, no existe por encima de ese ancho — así que
por encima no hay con qué solaparse). Medido en vivo, ancho a ancho, dónde empezaba el
solape real entre la primera fila y esa barra: 700px → 0px de solape; 560px → 0px (33px de
margen); 520px → 0px (33px de margen); 480px → 48px de solape ya real. El corte real está
entre 480 y 520px. Se elige 699px — el mismo que ya usa el resto del panel para "estrecho"
(`.adm-orow`, `.adm-plato-acciones`, ya en el fichero) — en vez de inventar un número nuevo
pegado al filo: dejaba margen de sobra por encima de la zona de peligro medida, y reutiliza
un corte que el propio fichero ya trata como "aquí es donde el móvil es de verdad móvil".

**Un script mínimo, no un imitador de `<details>`.** El JavaScript no reimplementa el
plegado — sólo decide el estado inicial y lo mantiene si el ancho cruza el corte:
`matchMedia('(max-width:699px)')` pone `caja.open = false` por debajo del corte y `true`
por encima, con un listener de `change` (no sólo al cargar) para que redimensionar la
ventana o girar una tablet lo reajuste solo. En escritorio/tablet, un guardián de un
renglón en el `click` del `<summary>` evita que un toque en la cabecera la cierre por
accidente — ahí sigue siendo un rótulo fijo, "sin añadir interacción innecesaria", tal
como pedía el encargo.

**Coste medido en escritorio/tablet — transparente, no escondido.** Sacar el rótulo de la
fila de botones a su propio `<summary>` (necesario para que sea un `<details>` de verdad,
no cosmético) añade una línea propia incluso donde el plegado no hace falta. Con el
`<summary>` ajustado a la altura natural del texto (20px) en vez de un mínimo de tacto
que ahí no pinta nada, el coste queda en +20px exactos, medido en los tres anchos que el
encargo pedía proteger:

| Ancho | Antes (auditoría) | Después | Diferencia |
|---|---|---|---|
| 1512px | 68px | 88px | +20px |
| 1024px | 130px | 150px | +20px |
| 768px | 130px | 150px | +20px |

Nada se oculta, nada salta de forma rara, ningún control cambia de sitio — una línea de
rótulo fija, siempre la misma altura, en la misma posición. Se reporta con las cifras
exactas para que el propietario juzgue si ese coste es aceptable; no se ha intentado
esconderlo con un `min-height:0` forzado que dejara el texto apretado.

**El resultado que pedía el encargo, medido:**

| Ancho | Antes: primera fila vs. barra inferior | Después |
|---|---|---|
| 390px | fila en y=767–826; barra en y=778 → 48px (81%) tapados | plegada por defecto; fila en y=563–622; barra en y=778 → **0px de solape, 0px de scroll para llegar** |
| 320px | fila en y=827; barra en y=778 → fila entera (100%) por debajo del borde de la barra | plegada por defecto; fila en y=631–690; barra en y=778 → **0px de solape, 0px de scroll para llegar** |

En ambos anchos, la primera fila de plato es ahora visible de inmediato, sin tocar nada,
sin desplazarse ni un píxel.

**Verificado en vivo, los cinco anchos pedidos:**
- 1512, 1024, 768px: `caja.open === true` (igual que siempre), clic en la cabecera NO la
  cierra (guardián confirmado), +3% lleva a "SUBIDA DEL 3%" y "A mano" lleva a "PRECIOS A
  MANO" exactamente como antes.
- 390, 320px: `caja.open === false` al cargar; un clic la abre (controles visibles y
  operables), un segundo clic la cierra; dentro, +3% y "A mano" llevan a las mismas
  pantallas de siempre.
- Teclado: el foco llega al `<summary>` (confirmado, es nativamente enfocable) y ningún
  listener del fichero llama `preventDefault()` sobre Enter/Espacio en ese elemento
  (confirmado por inspección de los seis `keydown` del fichero y por un despacho de
  prueba). La activación por Enter/Espacio en sí es comportamiento nativo del navegador
  para `<summary>`, no código de esta implementación — no se ha podido confirmar
  visualmente en este entorno por la misma limitación de siempre ("la ventana de Claude
  está minimizada", ya documentada) que impide usar capturas o clics por coordenada; no
  hay ninguna razón para que falle en un navegador real, y nada en el código lo bloquea.
- Regresión, Platos: buscador (4 de 312 con "papadum"), precio inline (autoguardado
  confirmado), agotado, destacar (abre el selector), cámara (abre el editor/selector de
  foto), oferta de sólo lectura, dos columnas internas intactas.
- Regresión, responsive: sidebar completo en escritorio, sólo iconos en tablet, barra
  inferior + hoja "Más" en móvil (confirmado que sigue abriendo) — ninguno tocado.
- Regresión, Ofertas: `.adm-f-ooferta` sigue midiendo exactamente 712px en 320px (H3, sin
  tocar); Ofertas no tiene `.adm-ajustar-precios-caja` en absoluto — el cambio no sale de
  Platos.

Sin tocar `precios_calcular`/`precios_manual`/`precios_reset` ni ningún otro handler. Sin
tocar H2, H3, H4, Ofertas, sidebar, barra móvil, sistema de ayuda, sistema de toast,
diseño de fila de Platos, categorías ni sistema visual general.

## Se quita el filtro de categoría de Platos; cabecera de ficha a una sola línea (7 Sep 2026)

Dos pedidos en el mismo turno, los dos sobre la cabecera de Platos y de Ofertas.

**Fuera el `<select>` de categoría.** Con las 40 categorías siempre a la vista en bento
(sin acordeón desde hace varias rondas), saltar a una sola por un desplegable dejó de
aportar nada — es exactamente la razón que dio el propietario. Se retira `<select
id="filtro-cat">` entero de Platos (Ofertas nunca tuvo uno) y su lógica en JS
(`selCat`/`filtroCat`, la rama del `aplicarFiltro()` que ocultaba fichas por categoría).
Con eso, `.adm-select` (el `<select>` estilizado sin flecha nativa) se quedó sin ni un uso
en todo el fichero — confirmado por grep antes de retirar también esa CSS y la regla
`.adm-platos-filtros .adm-select` que la ajustaba aquí. El atributo `data-cat` en la ficha
y en cada fila de Platos, que sólo existía para que ese filtro supiera a qué categoría
pertenecía cada una, también queda sin uso — retirado de las dos (la versión de Ofertas,
que SÍ sigue en uso por `marcarPorCategoria()`, no se toca).

**Cabecera de ficha, una sola línea, sin repetir palabra.** Antes: nombre de categoría en
grande («Aperitivos») y, debajo, en pequeño y apagado, la pestaña de la carta a la que
pertenece («Aperitivos y sopas») — dos líneas que además comparten la misma palabra
inicial, así que se leían como una redundancia aunque fueran datos distintos. Nueva
función `etiqueta_categoria($nombre, $tab)` (junto a `mayuscula()`/`minuscula()`, que ya
existían) funde las dos en una sola cadena, con una sola regla:

- si son idénticas, una vez;
- si la pestaña ya EMPIEZA por el nombre de la categoría (el caso de "Aperitivos" en
  "Aperitivos y sopas"), se enseña sólo la pestaña — repetir la palabra no añadía nada;
- en cualquier otro caso, las dos, separadas por «·».

Se usa igual en Platos y en Ofertas (mismo `$grupo['nombre']`/`$grupo['tab']`, misma
función, sin duplicar la lógica) y el resultado hereda el mismo tamaño y peso de
`.adm-cat-bento-nm` que antes tenía sólo el nombre — ya no hay un `<small>` con su propio
tamaño/color aparte, así que sale "con el mismo tamaño y estilo" sin necesidad de tocar
ninguna otra regla.

**Por qué hacía falta comprobar colisiones antes de tocar nada.** El nombre de categoría
NO es único por sí solo: "Sopas" es tres fichas distintas (su pestaña normal,
"Aperitivos y sopas"; y otra vez suelta dentro de "Sin gluten" y de "Vegano"), y lo mismo
"Ensaladas", "A la plancha" y otros seis nombres más — 10 nombres repetidos de 40 fichas
en total. Es justamente la pestaña la que hoy distingue esas fichas entre sí; fundir mal
las dos cadenas podía dejar dos fichas con la etiqueta idéntica y sin forma de saber cuál
es cuál. Verificado en código, con las 40 combinaciones reales de Platos y las 38 de
Ofertas: cero colisiones con la regla de arriba — cada ficha sigue teniendo una etiqueta
que no comparte con ninguna otra.

**Verificado en vivo:** 40 fichas en Platos, 38 en Ofertas, cero etiquetas repetidas en
ninguna de las dos pestañas; el `<select>` ya no existe en el DOM; buscador y chips de
estado siguen filtrando igual (312→4→312 con "papadum"); marcar un plato suelto en Ofertas
sigue autoguardando igual que antes (la insignia "N en oferta" de la cabecera es un
cálculo de servidor de siempre, no se actualiza sin recargar — así era ya antes de este
cambio, no es parte de esta ronda).

Sin tocar ningún handler, ningún contrato POST, ni la lógica de agotado/destacado/precio/
oferta. Sin tocar Ajustar precios (Fase 1 de la auditoría, ronda anterior), sidebar,
barra móvil, Marca, Ajustes, Juego, Publicidad ni Analítica.

## FASE 0 — cierre funcional MISE-B (7 Sep 2026)

Ronda puramente funcional: cero cambio visual. Precondición comprobada antes de tocar
nada — `offer.cats` en el `estado.json` real está vacío (`[]`), así que no había nada que
proteger de una migración accidental. Oferta sigue siendo por plato individual; no se
crea ningún checkbox, botón ni selector de categoría para `offer.cats` en esta ronda.

**1) Días/Semanal — dejaba de coincidir navegador y disco.** "Semanal" era un
interruptor de verdad: con los siete días encendidos, un clic los apagaba los siete en el
navegador aunque el servidor (que nunca persiste una oferta sin días) los devolviera a
los siete en el disco — hasta el siguiente recargado, la pantalla mentía. Se cambia
`semanal.addEventListener('click', …)`: si ya están los siete, no hace nada y no manda
petición; si no, los marca los siete y guarda. Se añade además una guarda en el listener
de cada casilla suelta (`dia[]`): si quitar ÉSTA dejaría el conjunto en cero, se repone
en el momento y no sale ni una petición con `dia[]` vacío. `diasPersistidos` ya sólo se
movía en el `.then()` de un guardado confirmado — no hacía falta tocar eso, sólo
documentarlo. El *fallback* del servidor (`$dias ?: [1..7]`) se conserva como red de
seguridad, con el comentario actualizado para no seguir describiendo un "Semanal como
interruptor" que ya no existe en el navegador.

**2) CSRF inválido devolvía HTTP 200 — arreglado en el único sitio que hacía falta.**
Todos los autoguardados (Ofertas, Agotados, precio en línea, destacado, foto…) viven
dentro del mismo `if ($csrfOk)`; el `elseif` que pone "La sesión ha caducado" es la
puerta compartida de los dos. Se añade `http_response_code(403)` ahí — un solo sitio,
un solo cambio, cubre a todos ellos de golpe. La navegación tradicional (sin
JavaScript) ve exactamente el mismo aviso de siempre; sólo cambia el código de estado,
invisible para quien mira la pantalla. Verificado en vivo: CSRF válido → 200 (guarda);
CSRF inválido → 403, `estado.json` sin tocar. Login, sesión, cookies y generación del
CSRF, sin tocar.

**3) Agotados — faltaba el 500, y el fallo no deshacía nada en pantalla.** `guardar_agotados`
no marcaba `http_response_code(500)` si `guardar_estado()` fallaba (mismo hueco que ya
se había corregido en Ofertas en una ronda anterior). Corregido. En el navegador,
`enviarFormulario()` gana dos parámetros opcionales (`alGuardarBien`/`alFallar`; las
llamadas de siempre, con dos argumentos, no cambian) y un nuevo
`agotadosConfirmados`/`restaurarAgotados()`: el conjunto que el servidor confirmó la
última vez, y una función que repone casillas + `.es-agotado` + contador + resumen +
chip a ESE conjunto si el guardado falla — nunca el optimista a medio camino. Verificado
en vivo rompiendo el CSRF a propósito: al fallar, la casilla que se acababa de marcar
(y su hermana, marcada a la vez) vuelven las dos a desmarcadas, el contador vuelve a 0 y
el resumen se oculta — nada se queda diciendo "agotado" en pantalla mientras el disco
dice lo contrario. El contrato de `guardar_agotados` no cambia: sigue reemplazando el
conjunto completo, no hay endpoint parcial nuevo.

**4) Precio en línea — validación antes de mandar, no se toca `precios_publicar`.**
`precios_publicar` NO se modifica (orden expresa) — sigue siendo la autoridad y sigue
revalidando por su cuenta. Delante de él, en el navegador: `precioValido()` normaliza
(recorta espacios, coma→punto) y sólo deja pasar vacío (comportamiento de precio base,
sin cambios) o un número mayor que cero; "9,5O" con letra, "0" o cualquier otro valor
ambiguo se rechaza SIN mandar nada, y el campo vuelve al `dataset.confirmado` (el
último valor que el servidor sí confirmó, inicializado al cargar la página con lo que
el propio PHP acaba de pintar). Igual que en Agotados, un guardado que falla restaura
el mismo `dataset.confirmado`, no lo que se acababa de escribir. Verificado en vivo:
10,50 guarda y persiste (con su hermana); 9,5O y 0 nunca llegan a mandarse (cero
peticiones nuevas, campo repuesto); vacío sigue quitando el precio de `estado.json`
igual que siempre; un guardado roto a propósito (CSRF inválido) repone el campo al
último confirmado.

**Aviso explícito — hueco que queda, a propósito, sin tocar.** `precios_publicar`
(la misma ruta que ya usaba "Guardar cambios" y que ahora recibe también el autoguardado
en línea) sigue sin `http_response_code(500)` si `guardar_estado()` falla ahí dentro —
el mismo hueco que ya se cerró en Agotados y en todos los handlers de Ofertas. El punto 5
del encargo pide que NINGÚN autoguardado de precio pueda dar un falso éxito, y el punto 4
pide expresamente no tocar `precios_publicar`: las dos cosas, tal cual, no son
compatibles del todo. Se ha priorizado la orden explícita de no tocarlo. Con eso, el
único caso que sigue sin cubrir es el más raro de todos — que el DISCO falle al escribir
justo en el momento de guardar un precio válido (permisos, disco lleno...); no cubre "el
usuario escribe algo mal" (eso ya lo bloquea la validación de arriba, sin llegar a
mandarse). Si se quiere cerrar también este hueco, es una línea
(`http_response_code(500);` antes de `$error = 'No se ha podido escribir estado.json.';`,
línea ~2813) — no se ha tocado a la espera de una orden expresa que sí lo autorice.

**5) Auditoría de códigos de respuesta — ya estaba prácticamente hecho.** Con el punto 2
cerrado (la puerta compartida) y el punto 3 (Agotados), se repasaron TODOS los handlers
de Ofertas (`oferta_cat_toggle`, `oferta_plato_toggle`, `oferta_pct_guardar`,
`oferta_horario_guardar`, `oferta_dias_guardar`, `oferta_estado_toggle`): los seis ya
tenían 422 (dato/regla rechazada) y 500 (fallo de escritura) de rondas anteriores de
esta misma sesión — no hacía falta tocar ninguno. El único hueco real que queda es el de
`precios_publicar`, arriba, dejado así a propósito.

**6) Estado visual de Oferta — la insignia ESTADO ya no se queda desactualizada.**
Encender/apagar, cambiar el horario o los días podían dejar el interruptor diciendo una
cosa y la insignia ESTADO (APAGADA/CORRIENDO/PROGRAMADA) diciendo otra hasta el
siguiente recargado — el ejemplo exacto que preocupaba (interruptor Encendida, insignia
APAGADA) era reproducible. La respuesta de un guardado con éxito YA es la página entera
recién repintada con el estado nuevo (nunca se leía, sólo se comprobaba `r.ok`); nueva
`repintarEstadoOferta(html)` le saca sólo esa insignia (`DOMParser`, sin regex frágil) y
la copia a la que se ve — cero lógica de fechas/horario duplicada en JavaScript, cero
insignias o tarjetas nuevas. Se engancha en los tres guardados que pueden mover si la
oferta está corriendo ahora mismo: estado on/off, horario, días. Verificado en vivo:
con los siete días y un horario de 00:00 a 23:59, encender el interruptor cambia la
insignia de "APAGADA" (`adm-e-desactivado`) a "CORRIENDO" (`adm-e-activo`) al instante,
sin recargar la página.

**7) Concurrencia — auditado, NO implementado, se explica por qué.** `guardar_estado()`
escribe atómico (temporal + `rename`), pero `estado` se lee UNA sola vez por petición,
muy arriba del fichero (`estado_vista()`, antes de saber qué handler va a disparar), y
esa misma variable la comparten después una decena de bloques `if (isset($_POST[...]))`
repartidos en miles de líneas — cada uno mutando su propio trozo sobre esa copia y
llamando a `guardar_estado()` por su cuenta. Un candado que proteja de verdad el ciclo
"leer → mutar → guardar" (dos pestañas, cada una guardando un campo distinto, una
pisando a la otra) no se puede colgar en un sitio pequeño y centralizado sin más: haría
falta que CADA uno de esos ~10 bloques, dentro de un `flock()`, releyera el estado FRESCO
del disco (no la copia de arriba) y volviera a aplicar sólo su propia mutación antes de
guardar — y que, al tener éxito, esa relectura sustituya a la variable compartida para
que el resto de la página (que se renderiza con los mismos datos) no enseñe algo ya
desactualizado. Es un cambio mecánico pero real en unos diez sitios distintos del
fichero, en la parte más sensible a datos que tiene el panel — exactamente el tipo de
"refactorización importante" que la orden pedía NO implementar sin permiso explícito.
No se ha tocado ni un guardado por este punto.

**Verificado en vivo, la batería completa del punto 9:** días (A/B/C/D, con recargado
entre pasos), CSRF válido/inválido (403 real, `estado.json` sin tocar), agotados (marcar,
desmarcar, fallo simulado con rollback completo), precios (10,50 · 9,5O · 0 · vacío ·
fallo simulado · hermana), oferta (plato individual, porcentaje, horario, días, Semanal,
estado on con repintado de insignia). Regresión visual: sin el `<select>` de categoría,
Ajustar precios plegable intacto, buscador y chips de Platos intactos,
`etiqueta_categoria()` intacta, bento de Platos y de Ofertas intactos (40 fichas/80
columnas, 38 fichas de Ofertas).

Confirmado expresamente: Oferta sigue siendo por plato individual, sin reintroducir
categoría; no se tocó H1, H3 ni H4; no volvió el selector de categoría; no se modificó
`etiqueta_categoria()`; sin Design System; sin commit, push, deploy, FTP ni producción.

## Se quita la descripción del plato en la fila, Platos y Ofertas (7 Sep 2026)

Pedido: quitar la descripción (ingredientes/nombre en inglés) que colgaba en pequeño
debajo del nombre de cada plato en la fila — "no es necesario".

**Platos.** El `<small>` (`$p['sub']` + nombre en inglés si difiere) se retira del
marcado; el nombre se queda solo. La información no desaparece del todo: ya llevaba un
`title` en el propio `<span>` desde la ronda de "una sola línea" — sigue ahí, así que un
vistazo con el ratón la sigue dando. Limpieza en cascada: `.adm-cat-bento-lista
.adm-platorow .adm-orow-nm small{display:none}` (ya no hay nada que esconder, la fila de
Platos nunca vuelve a llevar un `<small>`) y `.adm-orow.es-agotado .adm-orow-nm
small{...}` (mismo motivo, `es-agotado` es exclusivo de Platos) — confirmado sin más
usos por grep antes de retirar las dos.

**Ofertas — con un matiz.** Aquí el `<small>` no era sólo descripción: cuando la
categoría entera ya estaba en la oferta, la misma etiqueta llevaba también "· toda la
categoría", el único aviso visible de por qué esa fila concreta aparece atenuada y con
el interruptor bloqueado. Quitar el `<small>` entero se habría llevado por delante ese
aviso, que no es decorativo. Se separan las dos cosas: el grupo/nombre en inglés
desaparece, y "Toda la categoría" se queda, ahora en un `<small>` propio que sólo se
imprime cuando `$porCat` es cierto (antes era un tramo más de la misma cadena). El resto
de filas —la inmensa mayoría— quedan sin ningún `<small>`.

**Verificado en vivo:** nombre solo en las filas normales de Platos (312) y Ofertas
(293), `title` de Platos intacto en el hover; forzada una categoría entera a oferta por
la ruta de siempre (`oferta_cat_toggle`, aún viva en el servidor aunque el interruptor ya
no esté en la interfaz) para comprobar que "Toda la categoría" se sigue viendo en esa
fila — confirmado, y revertido después de comprobarlo. Altura de fila sin cambios
relevantes (Platos 59px, igual que antes).

Sin tocar precio, agotado, destacado, oferta (el dato, no el texto), cámara, bento a dos
columnas, `etiqueta_categoria()` de la cabecera, ni ningún handler o contrato POST.

## FASE 0.1 — dos remates de cierre (7 Sep 2026)

Dos puntos concretos, los dos ya señalados como huecos explícitos en la Fase 0 anterior.

**1) `precios_publicar`, el 500 que quedó pendiente a propósito.** La Fase 0 ya lo había
detectado y lo dejó sin tocar por el choque directo con "no modificar precios_publicar";
ahora, con permiso expreso, es literalmente la línea que ya estaba escrita en el propio
informe: `http_response_code(500);` antes de `$error = 'No se ha podido escribir
estado.json.';`. Nada más de ese handler se toca — validación, `$malos`, `$choque`,
precios hermanos, normalización y mensajes, exactamente igual que antes.

Verificado en vivo forzando un fallo real de escritura (estado.json puesto en sólo
lectura con `attrib +R`, no un simulacro): `fetch` devuelve `status:500, ok:false`;
`estado.json` se queda sin el precio que se intentó guardar; en la interfaz, el campo
pasa por el valor optimista y vuelve solo al último confirmado; el aviso que se ve es
"No se ha podido guardar. Comprueba la conexión." (tipo "bad") — nunca "Guardado.".
Restaurado el permiso de escritura después de comprobarlo.

**2) `repintarEstadoOferta` — le faltaba la mitad de la frase.** Ya copiaba la insignia
(`APAGADA`/`CORRIENDO`/`PROGRAMADA`), pero no la frase de debajo (`.adm-regla-pie`: "En
la carta no hay ningún descuento." / "Corriendo ahora mismo…" / "Fuera de su horario…",
con la hora de Canarias) — las dos cuentan lo mismo, así que un guardado podía dejar la
insignia diciendo una cosa y la frase la de antes. Se amplía la función para sacar
también ese párrafo de la misma respuesta ya recibida (mismo `DOMParser`, cero petición
nueva, cero lógica de fechas en JavaScript) y copiarlo tal cual.

Verificado en vivo, los cinco casos pedidos: (A) encender con configuración válida →
interruptor, texto "Encendida", insignia CORRIENDO y frase, los cuatro a la vez; (B)
apagar → los cuatro a APAGADA a la vez; (C) cambiar el horario de uno que no cubre ahora
a uno que sí → insignia y frase pasan juntas de PROGRAMADA a CORRIENDO; (D) quitar el
día de hoy de la lista → insignia y frase pasan juntas a PROGRAMADA; (E) recargar la
página → coincide exactamente con lo que ya se veía antes de recargar.

**3) Comentarios obsoletos.** Dos sitios seguían describiendo "Semanal" como un
interruptor de verdad ("los enciende... y los apaga igual", "enciende los siete o los
apaga los siete") — el comportamiento real, desde la Fase 0, es que sólo enciende.
Corregidos los dos comentarios; cero cambio de lógica (ya estaba bien desde la ronda
anterior, esto era sólo que el comentario no se había actualizado entonces).

**Regresión confirmada:** Semanal con los siete puestos no hace nada y no manda
petición; con menos de siete, los pone los siete y guarda; CSRF inválido sigue
devolviendo 403; precio inválido ("9,5O", "0") sigue sin mandarse; precio válido
("10,50") sigue guardando; no hay selector de categoría en Platos; `etiqueta_categoria()`
sin tocar; Ajustar precios sigue abierto en escritorio (H1) y la caja de chips sigue a
36px (H4 sin implementar, a propósito).

Sin concurrencia (deuda técnica documentada en la Fase 0, no se toca aquí). Sin H1, H2,
H3 ni H4. Sin Design System. Sin cambios de layout en ninguna pantalla.

## FASE 2 — H3, "la oferta" se pliega en móvil (7 Sep 2026)

Mismo patrón que H1 (Ajustar precios, Platos): un `<details>` de verdad alrededor de la
configuración detallada, forzado abierto por JS fuera de móvil, con un guardián que
impide cerrarlo ahí por accidente. El estado (icono, insignia, frase) nunca se pliega.

**Qué se pliega y qué no.** `<details class="adm-oferta-config" open>` envuelve
exactamente el `<div class="adm-regla">` de siempre (descuento, horario, días+Semanal,
interruptor Encendida/Apagada) — mismos `#of-pct`/`#of-desde`/`#of-hasta`/`dia[]`/
`#of-semanal`/`oferta_on`, mismo `form="ofertas-form"`, ni un input recreado. La cabecera
(icono + "La oferta" + insignia) y `.adm-regla-pie` (la frase canónica) quedan FUERA del
`<details>`, en su sitio de siempre — `repintarEstadoOferta()` no se toca porque no hacía
falta: sigue encontrando `.adm-f-ooferta .adm-estado` y `.adm-f-ooferta .adm-regla-pie`
exactamente donde ya estaban.

**Orden en móvil, sin mover el HTML.** La jerarquía pedida (estado → frase canónica →
acceso "Configurar oferta" → Platos sueltos) se consigue con `order` de flexbox sobre
`.adm-f-ooferta` (ya es `display:flex;flex-direction:column` de fábrica) dentro del
propio `@media` de móvil — la frase pasa a `order:2`, el `<details>` a `order:3`. Fuera
de ese ancho no se toca ningún `order`: el HTML nunca cambia de sitio, sólo el orden de
PINTADO, y sólo por debajo del corte.

**El corte: 560px, medido — no 699 "porque ya existe".** Medida la altura real de
`.adm-f-ooferta` en 1512/1200/1024/900/768/699/600/560/390/320: mesetea en 427px desde
1024 hasta 699 (el mismo alto que tablet/escritorio ya toleran sin queja) y es
exactamente entre 600 (todavía 427) y 560 (ya 501) donde empieza a subir de verdad —
597 a 390, 712 a 320, con la primera categoría de "Platos sueltos" en y=1115. A 699px la
ficha mide lo mismo que a 1024: ese corte no habría hecho nada aquí. Se usa
`max-width:560px` — un corte que el propio fichero ya usa en otro sitio, pero elegido
porque la medición lo confirma, no al revés.

**El resto, igual que H1:** sin JavaScript, `open` dejaba esto exactamente como estaba
— todos los controles visibles y funcionando, ni uno recreado. Con JavaScript,
`matchMedia('(max-width:560px)')` decide el estado inicial y lo reajusta si la ventana
cruza el corte (no sólo al cargar). Un guardián de un renglón en el `click` del
`<summary>` evita que un toque en la cabecera la cierre fuera de móvil — ahí ni siquiera
se ve (`display:none` salvo dentro del `@media`), así que la ficha se ve y se comporta
exactamente igual que antes de esta fase en cualquier ancho que no sea el móvil de abajo.

**Medido en vivo, antes/después:**

| Ancho | `.adm-f-ooferta` antes | `.adm-f-ooferta` después | Primera ficha antes → después |
|---|---|---|---|
| 320 | 712px | **279px** | y=1115 → **y=682** |
| 390 | 597px | **259px** | y=982 → **y=644** |
| 560/699/768/1024/1512 | 501/427/427/427/242 | **sin cambio** | — |

En 320px, la primera FILA de plato empieza en y=761 — antes de que la barra móvil
empiece en y=778, dentro del primer viewport. Su borde inferior (y=824) sí queda unos
46px detrás de esa barra — el dato real, no maquillado: la ficha entera y la mayor parte
de esa fila ya son visibles sin tocar nada, pero no el 100% de su alto. En 390px la
mejora es mayor: la fila cabe casi entera, sólo 8px de su borde inferior quedan detrás de
la barra. Ninguno de los dos casos toca nada fuera de H3 — es la mejor posición que da
plegar sólo la configuración autorizada, tal como pedía el encargo si el resultado no
llegaba al 100%.

**Verificado en vivo:** los cinco anchos "sin cambio" (560 incluido) miden exactamente lo
mismo que antes de esta fase; en móvil, clic abre/cierra, teclado enfoca el `<summary>`,
sin overflow horizontal con la ficha abierta (días, horario y el interruptor caben los
tres); porcentaje/horario/días/Semanal/Encendida-Apagada siguen autoguardando y
`repintarEstadoOferta()` sigue sincronizando insignia y frase tras cada uno; secuencia
abrir→modificar→plegar→reabrir→recargar mantiene siempre el valor persistido. Regresión:
H1 (caja de Platos sigue plegada en móvil), H2 (sigue sin `<select>`), sidebar, rail de
tablet, barra inferior, hoja "Más" y ayuda contextual, todos intactos.

Sin tocar handlers, contratos POST/GET, CSRF, códigos HTTP, `guardar_estado()`,
concurrencia, ni ningún control de Platos. Sin Design System.

---

## DS-1 — Foundations: alias semánticos de `--offer` y `--ui-radius-modal`

Primera fase del Design System real (auditoría previa en
`design-system-admin-2026-09-07.md`, aprobada con correcciones). Invariante único:
**computed style visual antes = computed style visual después**, cero cambio funcional.
No se toca ningún primitivo (`--s1`…`--s7`, `--ink`, etc.), no se renombra ningún token
consumido (`--p-radius-card`, `--r-sheet`), no se toca `tokens.css`/`gen.mjs`/`temas.mjs`.

**Inventario antes de escribir nada.** Los 13 tokens pedidos (`--offer`, `--ok`,
`--aviso`, `--surface`, `--ficha`, `--chip`, `--base`, `--ink`, `--muted`, `--border`,
`--marca-borde`, `--p-radius-card`, `--r-sheet`) se listaron consumidor a consumidor,
clasificando por lo que representan de verdad, no por el nombre de la clase. Resultado
completo en `ds1-inventario-tokens-2026-09-07.md` (entregado antes de tocar código).
Dos hallazgos del inventario cambiaron el plan inicial:

1. **`--offer` tiene 25 consumidores, no un reparto limpio en 3 grupos.** 6 son código
   muerto confirmado (`.tick input`, `.row.is-out` ×3, `.count.dirty`,
   `.foto-btn.quitar`, `.foto-aviso-mal` a secas, `.colores-fila input:invalid`) — cero
   HTML los usa, así que no se tocan, no se migran, no se limpian. Los 19 restantes
   representan **7 significados reales**, no los 3 de la propuesta inicial
   (`danger`/`depleted`/`promo`): hacía falta también error de formulario, tendencia
   negativa de Analítica, insignia de modo demo y estado inactivo/incompleto de una
   entidad de negocio. Reportado y aprobado por el propietario antes de nombrar nada.
2. **`--r-sheet` no respalda ni el modal ni el tooltip reales**, pese al nombre: el
   modal de recorte usa `--p-radius-card`, la hoja inferior y el tooltip llevan el radio
   escrito a mano (`18px`/`8px`). Documentado, no se toca — queda para una fase
   posterior si interesa.

**Los siete alias, con un único significado cada uno:**

| Grupo semántico | Token | Consumidores migrados |
|---|---|---|
| Acción destructiva | `--ui-state-danger` | `.adm-tag-destacado-quitar:hover`, `.adm-btn-quitar` (+hover), `.adm-foto-b-quitar:hover` |
| Plato agotado | `--ui-state-depleted` | `.adm-sw-agotado` pista (checked), `.adm-orow.es-agotado .adm-orow-nm`/`.adm-prow-n` |
| Promoción / "En oferta" | `--ui-badge-promo` | `.adm-tag-oferta` (+hover) |
| Error de formulario / fallo operativo | `--ui-state-error` | `.msg.bad`, `.recorte .err`, `.toast.bad`, `.adm-foto-aviso-mal` |
| Tendencia negativa (Analítica) | `--ui-trend-negative` | `.dt-chip.baja` |
| Insignia "Modo demo" | `--ui-badge-demo` | `.insignia.is-demo` |
| Estado no activo / incompleto / desactivado | `--ui-state-inactive` | `.adm-e-incompleto`, `.adm-e-desactivado` |

`inactive` describe estado de negocio (campaña incompleta, oferta apagada a mano), no un
control HTML `disabled` — ese será otro token, `--ui-control-disabled-*`, cuando toque.

**Ámbito: cada alias vive donde vive su consumidor real, igual que `--offer`.**
`--offer` vale una cosa dentro de `.adm-board`/`.adm-acciones-fuera` (`#ff6b6b`) y otra
fuera, por la cascada normal hasta el `:root` de `tokens.css` (`#c62828`) — `.card-main`
nunca lo redefine. Como el valor computado de un alias se fija donde se declara, no donde
se consume, cada token se declaró en **todos los ámbitos donde tiene un consumidor real**,
nunca por comodidad:

- `--ui-state-error` y `--ui-badge-demo` se declaran dentro de `.card-main` (cubre login
  y los avisos/toast antes de entrar en una pestaña) **y se redeclaran dentro de
  `.adm-board`** (cubre el aviso de Analítica, el error del recorte en Platos, el aviso
  de subida en Marca) — son los únicos dos grupos con consumidores a ambos lados.
- Los otros cinco (`--ui-state-danger`, `--ui-state-depleted`, `--ui-badge-promo`,
  `--ui-trend-negative`, `--ui-state-inactive`) sólo tienen consumidores dentro de
  `.adm-board`, así que sólo se declaran ahí.
- Ninguno se declaró en `.adm-acciones-fuera`: no tiene consumidor real de estos siete
  grupos hoy. Añadirlo sin uso habría sido inventar, no documentar.
- `--p-fg:var(--ink)` no se tocó — sigue exactamente en los mismos dos sitios
  (`.card-main`, `.adm-acciones-fuera`) con el mismo valor.

**La inconsistencia de `.msg.bad` se conserva a propósito.** Hoy ya pinta dos rojos
distintos según dónde aparece — `#c62828` fuera de `.adm-board` (login, avisos previos a
entrar), `#ff6b6b` dentro (Analítica). Es una incoherencia visual real (tipo B, P2), pero
corregirla no es DS-1: `--ui-state-error` se declaró en los mismos dos ámbitos con el
mismo valor de cada uno, así que sigue pintando los mismos dos rojos, en los mismos
sitios, sin excepción.

**`--ui-radius-modal:16px`**, declarado en `:root` junto a `--p-radius-card` (que no se
toca, sigue siendo el único que usa `.card-main`) — alias independiente, no un renombrado.
No se conecta a ningún selector todavía: ni el modal de recorte ni la hoja ni el tooltip
cambian en esta fase.

**Verificación de píxel cero, en el propio panel, no adivinada.** Reconstruido
`2-subir` (`node motor/lock.mjs --escribir` + `node gen.mjs`) y montado un servidor
`php -S` aislado sobre `1-proyecto` (puerto local propio, con `mbstring`/`gd`/
`session.save_path` — no toca ninguno de los servidores que ya hubiera abiertos) para
poder cargar `index.php` de verdad. En la página real (no una copia, no una suposición)
se inyectaron elementos de prueba dentro de `.card-main` y dentro de un `.adm-board`
sintético, leyendo `getComputedStyle` de `var(--offer)` contra cada alias nuevo en su
mismo ámbito:

| Ámbito | `--offer` | los alias que viven ahí |
|---|---|---|
| Dentro de `.card-main`, fuera de `.adm-board` | `rgb(198,40,40)` | `--ui-state-error` y `--ui-badge-demo`: **`rgb(198,40,40)`**, los dos |
| Dentro de `.adm-board` | `rgb(255,107,107)` | los seis (`error`/`danger`/`depleted`/`promo`/`trend`/`inactive`): **`rgb(255,107,107)`**, los seis |

Coincide exactamente en los dos ámbitos, y los dos ámbitos siguen dando valores
*distintos* entre sí — la prueba de que ni se igualó lo que debía seguir diferente ni se
desvió lo que debía coincidir. `--p-radius-card` y el nuevo `--ui-radius-modal` se leyeron
también en vivo: `16px` los dos, `.card-main` sigue midiendo `16px` de radio real. Los
ficheros generados que hicieron falta para levantar el servidor de prueba
(`tokens.css`, `paises.php`, `cliente.php`, `fuentes.html`, `platos.json`, `temas.json`,
copiados desde `generado/admin/`, nunca editados) se borraron de
`motor/server/admin/` al terminar; el servidor de prueba, detenido.

**Confirmado expresamente:** cero cambio visual, cero cambio funcional. H1, H2 y H3
intactos. H4 no implementado. Los 6 consumidores muertos de `--offer`, sin tocar. Sin
tocar `tokens.css`, `gen.mjs` ni `temas.mjs` (sólo leídos, y una copia de sus salidas ya
generadas usada y borrada para poder probar en local). Sin commit, sin push, sin deploy.
Producción intacta.

Sin Design System más allá de esto: superficies, texto, bordes, tipografía y spacing
como alias quedan para las siguientes fases DS. **DS-2 no empieza sin autorización.**

---

## DS-2 — Component System: chips, botones, botón-icono, disabled

Primera fase del Design System con cambio visual intencionado. Parte del estado exacto
post DS-1. Cambios pequeños y por componente, no limpieza general del CSS.

**H4 — `.adm-chip`: 36px → 40px.** Nivel COMPACT del sistema, no el TOUCH de 44 — es un
filtro de repaso (Todos/Agotados/Destacados/Con oferta, único sitio del panel que usa
esta clase), no la fila de trabajo. Un solo cambio de propiedad (`min-height`); padding,
radius (999px, pill), colores, `aria-pressed` y la lógica JS, intactos.

**Botones: las dos densidades ya existían, medidas, no inventadas.** `.adm-btn` ya media
`min-height:46px` (STANDARD) y `.adm-btn-fino` ya media `40px` (COMPACT) antes de esta
fase — se confirma con el sistema, sin tocar una sola cifra. `.foto-btn` (40px, con
radio pill) es código muerto: cero HTML lo usa, sustituido hace tiempo por el bloque
`adm-foto-*` de Marca — no se migra, no se limpia, fuera de alcance de esta fase.

**Los cuatro botones-icono, clasificados uno a uno:**

| Botón | Antes | Categoría | Después | Motivo |
|---|---|---|---|---|
| `.camara` | 44×44 | TOUCH | 44×44 (sin cambio) | Acción táctil primaria por plato. Ya tiene su propia excepción a ≤620px de contenedor (32×32 con hit-area de 44 restaurada por `::before`), deliberada y de una fase anterior — no se toca. |
| `.foto-btn` | 40×40 | — | — | Código muerto (ver arriba). Excluido de la clasificación. |
| `.adm-pct-ir` | 40×40 nominal | COMPACT | sin cambio | Ver hallazgo debajo — no se edita esta ronda. |
| `.adm-foto-b` | 32×32 | COMPACT | **40×40** | Fila con hueco de sobra medido en vivo a 390/320 (ver validación) — sin riesgo de layout. |

**Hallazgo no buscado, reportado, no forzado a corregir aquí:** el fichero tiene una
regla genérica `button{min-height:48px}` (reset de base). `.camara` ya se defiende de
ella con `min-height:0` en su propia regla — pero `.adm-pct-ir` no lo hacía, así que pese
a su `height:40px` explícito **medía 40×48 de verdad**, no 40×40, desde antes de esta
fase. Como no se toca `.adm-pct-ir` en DS-2 (su tamaño ya era el correcto sobre el papel,
solo que el CSS no lo conseguía), se deja así y se reporta para una fase futura — no se
edita algo que no estaba en el encargo de esta ronda. `.adm-foto-b` sí se toca en esta
misma fase, así que a ese se le añadió el mismo `min-height:0` que ya lleva `.camara`:
sin eso, el 32→40 de la tabla de arriba habría terminado en 40×48, no en el 40×40 que
pide el sistema. Verificado en vivo, antes y después del añadido (40×48 → 40×40).

**`.adm-pct` (54px): se reporta, no se toca.** No es un olvido — el propio código ya
explica por qué (comentario junto a `.adm-ajustar-precios-mano`, de una fase anterior):
`.adm-pct`, `.adm-pct-otro` y `.adm-ajustar-precios-mano` comparten los 54px a propósito,
para que la fila "+3/+5/+10/+15%/otro%/A mano" se lea como un solo grupo. Normalizar a
46 STANDARD exige tocar los tres a la vez por una diferencia de 8px que hoy no rompe
nada — más cerca de rediseñar la fila que de aplicarle la densidad del sistema. Punto 4
del encargo autoriza explícitamente no hacerlo si no aporta y aquí no aporta.

**Inputs: `.adm-campo` (50px) y `.fld input` (56px), sin tocar, con motivo real.**
`.fld input` no vive en login (eso es `.login input`, otra clase) sino en las contraseñas
de "Salir del modo demo" y las dos de superadministrador en Ajustes — configuración
excepcional y poco frecuente, no un campo del día a día: motivo de contexto propio, se
conserva tal cual pide el encargo.

**Disabled, un token y una regla para los cuatro.** Nuevo `--ui-control-disabled-opacity:
.45` (no confundir con el `.3` que ya usan los botones-icono sueltos como `.adm-foto-b`
— ahí no hace falta que quede tan legible porque no hay etiqueta de texto que leer).
Una sola regla combinada, `.adm-btn:disabled,.adm-pct:disabled,.adm-chip:disabled,
.adm-campo:disabled{opacity:var(--ui-control-disabled-opacity);cursor:default}` — sin
usar `--ui-state-danger` ni `--ui-state-inactive` (ese es estado de negocio, no de
control HTML). Ninguno de los cuatro tiene hoy un elemento real marcado `disabled`, así
que el efecto es inerte hasta que lo necesiten — verificado con una prueba sintética por
componente (opacidad 1 sin el atributo, 0.45 con él).

**Radio: `--ui-radius-control:12px`, sólo donde el literal ya era 12px.** Migrados
`.adm-btn`, `.adm-campo`/`.adm-horas input[type=time]`, `.fld input/select/textarea`,
`.adm-pct` y `.adm-pct-otro` — puro alias, mismo valor, cero cambio visual. Deliberadamente
fuera: `.adm-pct-ir`/`.adm-foto-b` (9px, otra familia, aliasarlos aquí les cambiaría el
valor) y otros `border-radius:12px` reales del fichero no nombrados en el encargo
(`.adm-sheet-item` — navegación, fuera de alcance; `.combo-q` base y `.adm-nativo input`
—familia input no nombrada; `.adm-color-muestra`, `.adm-cal-nav` — widgets propios sin
mencionar) — se listan aquí para que quede localizado, no se tocan.

**Focus-visible: sólo se quitó lo que era duplicado real, no lo parecido.** Eliminadas
`.adm-chip:focus-visible` y `.adm-plato-destbtn:focus-visible` — confirmado que ambas
son `<button>` reales, así que la regla general `button:focus-visible` (ya existente)
les daba exactamente el mismo contorno; quitar la copia no cambia nada pintado. Se
localizaron otros tres grupos de duplicados exactos (`.adm-ajustar-precios-resumen` /
`.adm-oferta-config-resumen`, que son los `<summary>` de H1/H3; `.adm-navmovil-item` /
`.adm-sheet-item` / `.camara`, navegación de por medio; `.adm-tag-destacado-cambiar` /
`.adm-tag-destacado-quitar`) — **deliberadamente sin tocar**: fusionarlos no cambia nada
pintado tampoco, pero dos de los tres grupos tocan justo lo que el encargo pide no tocar
(H1/H3, navegación), y el tercero no compensa el riesgo por una línea de ahorro. Se
listan para una futura pasada de limpieza real, no se actúa sobre ellos aquí.

**Verificado en el panel real, con sesión de verdad, no con sondas sintéticas sueltas.**
Reconstruido el entorno de prueba igual que en DS-1 (generados de `generado/admin/`
copiados a `motor/server/admin/`, servidor `php -S` propio) y esta vez completado el
arranque en frío del panel (contraseña local nueva, sólo para esta verificación,
`clave.php` nunca subido a git) para entrar de verdad y medir sobre Platos/Ofertas/Marca
reales, no sobre un DOM sintético aislado. Medido en vivo en 1512/1024/768/560/390/320:

- Chips: 40px de alto en los seis anchos, sin overflow horizontal en ningún caso.
- H1 ("Ajustar precios"): abierto en 1512/1024/768, cerrado en 560/390/320 — exactamente
  el corte de la fase H1, intacto.
- H3 ("Configurar oferta"): cerrado a 320, abierto a 768 — intacto.
- Fila de plato (cámara+nombre+precio+acciones): sin overflow horizontal real en ningún
  ancho — a 320px el nombre trunca por elipsis como está diseñado desde antes (eso hace
  que `scrollWidth` del contenedor sea mayor que su `clientWidth`, pero no pinta scroll:
  medido el rectángulo real, su borde derecho cae dentro del viewport con margen).
- Marca, fila de fotos: con una tarjeta de prueba insertada en el punto real del DOM (el
  panel no tenía fotos subidas en este entorno), la columna de foto mide 206px a 320px y
  los tres botones a 40×40 caben en la fila sin desbordar (204px de contenido en 204px
  disponibles).
- `--ui-radius-control` resuelto en vivo a `12px` sobre un campo real de Ofertas
  (`of-desde`), igual que antes del alias.

Entorno de prueba limpiado al terminar: generados copiados, `clave.php`, `accesos.log`,
`intentos.json` y `estado.json` de esta sesión de pruebas, borrados; servidor de prueba,
parado.

**Confirmado expresamente:** DS-1 intacto. H4 implementado únicamente como chip a 40px
— sin 44px, sin tocar comportamiento/aria-pressed/filtros/JS. Cero cambios funcionales.
Sin tocar shell, navegación, cards, modal, tooltip ni responsive estructural (los únicos
anchos que cambian de comportamiento, H1 y H3, ya cambiaban así desde antes de DS-2).
Sin `tokens.css`, sin `gen.mjs` (sólo leídos y sus salidas ya generadas, usadas y
borradas para poder probar). Sin commit, sin push, sin deploy, sin FTP. Producción
intacta. **DS-3 no empieza sin autorización.**

---

## FIX — Ofertas↔Platos: sincronización sin F5 y error visible del interruptor

Dos fallos reales de uso, detectados y auditados aparte (ver
`auditoria-ofertas-sync-2026-09-08.md`), resueltos sin tocar Design System, H1-H4 ni la
semántica de "Con oferta" — que sigue siendo exactamente `on && (categoría o plato)`,
igual que antes de este fix.

**Causa 1 — el chip "Con oferta" no se enteraba de nada.** `#n-chip-oferta` nace `0` en
el HTML y sólo lo rellena un script que corre una vez al cargar la página
(`pane.querySelectorAll('.adm-orow.es-oferta').length`). Ningún autoguardado de Ofertas
tocaba nunca la Platos ya pintada — `repintarEstadoOferta()` sólo llega a `.adm-estado`/
`.adm-regla-pie`, ambos dentro de Ofertas. Arreglo: **`repintarPlatosDesdeOferta(html)`**,
mismo patrón que `repintarEstadoOferta` — cero petición nueva, usa el HTML que el propio
autoguardado ya trae (`r.text()`), lo parsea con `DOMParser` y, por cada `.adm-orow` vivo
de Platos, busca su gemelo fresco por la clave real del plato (`data-k` de `.camara` —
no `data-busca`, porque un plato puede repetirse en más de una categoría/pestaña y las
dos filas tienen que actualizarse igual). De cada gemelo copia sólo dos cosas: la clase
`es-oferta` y el nodo `.adm-tag-oferta`/`.adm-plato-sinoferta` (se reemplaza uno por el
otro completo, cubre los dos sentidos del cambio). Al final, recuenta
`#n-chip-oferta` sobre las filas ya parcheadas — mismo cálculo de siempre, no uno nuevo.
Nada más de la fila se toca: precio, agotado, destacado, buscador, filtro activo y scroll
quedan exactamente como estaban. Conectado a los dos autoguardados reales que pueden
cambiar quién está "en oferta": el interruptor por plato (`oferta_plato_toggle`) y el
maestro (`oferta_estado_toggle`). **`oferta_cat_toggle` no se tocó**: sigue existiendo en
el JS pero cero HTML usa `name="cat[]"` hoy — no hay UI real que dispare esa rama, así
que engancharla ahí no habría movido nada; queda anotado, no implementado, tal como
autorizaba el encargo ("sólo si sigue existiendo como compatibilidad real"). Horario y
días no se tocan tampoco: bajo la semántica actual no cambian `$enOferta` para ningún
plato, así que no pueden desincronizar Platos.

**Causa 2 — el interruptor fallaba en silencio.** El servidor ya manda, en cada
respuesta, el mismo `$error` exacto que usaría un formulario normal —
`<?php if ($error): ?>toast(...)<?php endif; ?>` en la línea 6540 de siempre— pero el
`.catch()` del interruptor nunca leía el cuerpo de la respuesta fallida: sólo revertía la
casilla y la palabra Encendida/Apagada. Arreglo, en el único sitio que hacía falta —
**`autoguardarOferta()`**, el helper que usan los seis autoguardados de Ofertas—:
ahora, si la respuesta no es `ok`, se lee `r.text()` (antes se descartaba), se le saca
el mensaje real con la nueva `mensajeErrorDeRespuesta(html)` (busca el
`<script>` que sigue a `#toasts` y extrae el string ya escrito por PHP con una expresión
regular — no reinterpreta el HTML entero, no repite ninguna validación) y se llama al
`toast()` que ya existe con ese texto exacto, con `'bad'`. Como el arreglo vive dentro
del propio helper, los **seis** autoguardados que lo usan (porcentaje, horario, días,
maestro, plato suelto y categoría) reciben el mismo tratamiento sin tocar sus `.catch()`
uno a uno — ninguno cambia su lógica de revertido, sólo dejan de ser mudos cuando fallan.
El servidor sigue siendo el único que decide qué es válido: nada de esto duplica una
regla en JavaScript, sólo deja de tirar a la basura el texto que el servidor ya manda.

**Un tropiezo real durante la implementación, para que quede escrito:** el primer intento
de `mensajeErrorDeRespuesta` llevaba, en su propio comentario explicativo, la cadena
literal `<script>toast(...)</script>` como referencia a la línea 6540 — el HTML la lee
como el CIERRE de verdad de la etiqueta `<script>` que la contenía, cortando en seco todo
el bloque de Ofertas justo ahí. Sin una sola línea de JS mal escrita, el navegador
truncaba el script a la mitad; nada de Ofertas —ni lo nuevo ni lo que ya llevaba semanas
funcionando— se ejecutaba, y la consola sólo decía "SyntaxError: Invalid or unexpected
token" sin más pista. Detectado probando en vivo (los interruptores no hacían nada en
absoluto, ni la pintura optimista de Ofertas sobre sí misma), diagnosticado comparando el
JS tal cual lo sirve el navegador contra el fichero fuente, y corregido reescribiendo el
comentario sin la secuencia literal `</script>`. Queda para la memoria del proyecto: esa
cadena, dentro de un `<script>` inline, nunca se escribe entera, ni siquiera en un
comentario.

**Probado en vivo, los ocho casos, sesión real, sin F5 salvo donde lo pide la prueba:**

| Caso | Paso | Resultado |
|---|---|---|
| A | 0 → marcar 1 plato → encender → Platos sin F5 | chip **1**, fila con `.es-oferta` y etiqueta, filtro "Con oferta" deja sólo ese plato |
| B | + segundo plato → Platos sin F5 | chip **2** |
| C | quitar uno → Platos sin F5 | chip **1**, la fila quitada pierde `.es-oferta` |
| D | apagar maestro → Platos sin F5 | chip **0** — semántica congelada, igual que tras F5 de siempre |
| E | encender sin platos | **422**, interruptor revierte, toast visible: *"Elige al menos una categoría o un plato antes de encenderla."* |
| F | horario inválido forzado (hasta ≤ desde) | **422**, revierte, toast: *"El horario no es válido: revisa desde y hasta antes de encenderla."* |
| G | configuración válida | enciende al primer intento, badge PROGRAMADA, **cero** toast de error nuevo |
| H | F5 tras A-D | chip idéntico (**1**) al que ya mostraba sin recargar |

Entorno de prueba igual que en rondas anteriores: `php -S` aislado sobre `1-proyecto`,
generados de `generado/admin/` copiados y borrados al terminar, `clave.php`/
`estado.json` de la sesión de pruebas, borrados.

**Confirmado expresamente:** cero cambio visual deliberado. Cero cambio de negocio — la
semántica de "Con oferta" es exactamente la de antes. `tiene-oferta`/`es-oferta`: NO
implementado, sigue pendiente de una ronda de diseño aparte. DS-1, DS-2, H1, H2, H3, H4:
intactos, ninguno de sus ficheros/reglas tocado. Sin commit, sin push, sin deploy, sin
FTP. Producción intacta.

**DETENER PARA REVISIÓN HUMANA.**

---

## SocialCard V1 + V2 — Cimientos y shell

**2026-09-08.** Primera ronda de la migración visual al lenguaje SocialCard. Sustituye a
DS-3/DS-4/DS-5, cancelados. La autoridad visual pasa a ser el prototipo aprobado
(`SocialCard — Administrador.html`, copia local de sólo lectura, guardada el 2026-09-08).
DS-1 y DS-2 se conservan enteros como base técnica: sus siete tokens semánticos, sus alias
de radio y su token de opacidad de disabled siguen en pie y son justamente el enganche del
que cuelga todo lo de abajo.

### Cómo se hizo abordable: redirigir el origen, no reescribir los consumidores

El panel tiene ~10.200 líneas y su paleta oscura vivía **dentro de `.card-main`**, en ocho
tokens (`--ink`, `--muted`, `--base`, `--surface`, `--border`, `--chip`, `--hairline`,
`--offer`) de los que cuelgan todas sus reglas. Esa capa de indirección, que MISE-A creó por
otro motivo, es lo que ha permitido meter dos temas sin tocar los mil sitios que consumen
esos nombres: se han **redirigido los ocho a la capa nueva** (`--sc-*`) y cada regla del
panel cambia de tema sola, sin que ninguna cambie de texto.

De ahí que el diff sea de cientos de líneas y no de miles, y que el riesgo de regresión esté
acotado: lo que se ha tocado es el origen del color, no su uso.

### V1 — Cimientos

- **Tipografía: Arimo sustituye a Inter.** El prototipo está dibujado sobre Nimbus Sans, que
  es una Helvetica; Arimo comparte esas métricas (es la Liberation Sans de Google,
  métrica-compatible con Helvetica/Arial), así que el dibujo se conserva sin licencia que
  gestionar ni fichero que alojar. Cuatro pesos reales servidos por Google —400, 500, 600,
  700—, que es exactamente lo que pide la escala: **nada se sintetiza**. Verificado en vivo:
  `document.fonts` reporta los cuatro pesos en estado `loaded`.
  Se retiran los `font-feature-settings` `cv05`/`cv08`: eran alternativas propias de Inter y
  en Arimo no existen.
- **Dos temas completos**, declarados en `:root`/`:root.light` y `:root.dark`, con los
  valores del encargo. Se añaden tres tokens que el encargo no nombra pero el prototipo sí
  usa: `--sc-nav` (tercera superficie: en claro coincide con la tarjeta, en oscuro **no**,
  `#1A1F27`), `--sc-input-border` (borde de campo, más oscuro que el borde general, si no un
  campo sobre tarjeta blanca desaparece) y `--sc-scrim`.
- **Escala tipográfica.** Dos de los tres tamaños viejos ya coincidían con el sistema nuevo
  (20 y 13); sólo se mueve uno y se añaden tres: `--t0` 24, `--t1` 20, `--tb` 16, `--t2`
  **14** (era 15), `--t3` 13, `--t4` 12. Suelo de 12, no de 13.
- **Spacing y radios** como tokens (`--space-1..8`, `--radius-sm..pill`). **No** se ha hecho
  reemplazo masivo: la escala Fibonacci de `gen.mjs` (`--s1..--s6`) sigue viva debajo y las
  dos conviven hasta que cada pantalla pase por su versión.
- **Estados** con pareja fondo+tinta por tema (ok / warning / error). Los siete grupos
  semánticos de DS-1 **siguen separados**: sólo cambia el origen de `--offer`, que pasa a ser
  `var(--sc-bad-ink)` y por tanto sigue al tema.
- **El acento de la herramienta deja de ser el color del restaurante.** `--p-accent-fill`
  apuntaba a `--accent` (la marca del cliente). Ahora apunta a `--sc-primary`. Son dos cosas
  distintas que compartían token por comodidad: con la marca de Tinge (`#FF7517`) el naranja
  del panel salía casi igual por casualidad, pero con un cliente de marca verde el panel
  entero se volvía verde. `--accent` no se ha tocado y sigue mandando en la carta pública y
  en la pestaña Marca. **Invariante multicliente: el comportamiento es del motor, el dato es
  del cliente.**
- **Fugas de la paleta oscura, cerradas.** Se eliminan los colores escritos a mano que no
  habrían seguido al tema: `--ficha:#191B1F` (la tercera superficie de las fichas, ahora
  `var(--sc-muted-bg)`, que invierte sola el escalón en cada tema), los `#2a2c31`/`#3a3d44`
  de hover de `.adm-btn`/`.adm-pct`/`.adm-dia`/`file-selector-button`, `#0B0B0C`, `#1E2025`,
  los `background:#fff` de `.search`/`.pnuevo`/`.login input`/`.colores-fila`, y todos los
  `rgba(255,107,107,·)` y `rgba(237,235,235,·)`, sustituidos por `color-mix` sobre el token
  semántico que les corresponde — así el matiz sale de una sola fuente de verdad.
- **Toast** a las medidas del sistema: radio 12 (usaba `--r-sheet`, 21px, que es un radio de
  la **carta pública**, no del panel) y cuerpo 14. El mecanismo funcional no se toca.
- **Interruptores.** La pista pasa de `--border` a `--sc-input-border`: sobre tarjeta blanca
  un track del color del borde con bola blanca era invisible. Encendido pasa a `--sc-primary`
  (naranja de acción, como el prototipo); el verde de `--ok` se reserva para la insignia
  ACTIVA, que sí es un estado de éxito.

### V2 — Shell

Medidas tomadas **del prototipo con el navegador**, no a ojo, y verificadas contra el admin
real a 1512px. Coinciden píxel a píxel:

| Pieza | Prototipo | Admin |
|---|---|---|
| Sidebar | 232x900 @0,0 | 232x900 @0,0 |
| Cabecera | 1265x68 @232,0 | 1265x68 @232,0 |
| Item de navegación | 207x40 | 207x40 |
| Rótulo de grupo | 207x32 | 207x32 |
| Selector de tema | 102x40 | 102x40 |
| Cuadro de marca | 36x36 | 36x36 |

- **Sidebar** 232 (era 248) / riel 68 (era 76), sobre `--sc-nav`. Item de 40 (era 46), radio
  12 (era 11), padding 12 (era 14), hueco 8 (era 12), 14/500. **Seleccionado deja de ser
  relleno naranja sólido** y pasa a la pastilla suave del prototipo (`selected-bg` +
  `selected-text` + peso 600): veinte destinos en naranja no destacan ninguno.
- **Cabecera de 68px**, que el panel no tenía: título y fecha vivían dentro de la tarjeta y
  se iban con el scroll. Va en `position:fixed` con el hueco reservado por `padding-top` en el
  `body` — el mismo patrón que ya usaba el sidebar, y por la misma razón: no hace falta abrir
  ningún `div` nuevo alrededor del contenido. El título sale de `$PESTANAS`, el mismo catálogo
  que rotula la navegación, y lo actualiza el propio `abrir(slug)` leyendo el `aria-label` del
  botón: **no hay una segunda lista de nombres en JavaScript** que se pueda quedar vieja.
- **Selector claro/oscuro** con la pieza del prototipo (sol 16 · interruptor 32x18 · luna 16,
  contenedor 40 de alto y radio 12). Persistencia en `localStorage`, clave
  `socialcard-color-mode`, valores `light`/`dark`, por defecto `light`. La clase se pone en
  `html` desde un guión **en la cabecera del documento, antes de que se pinte nada**: sin eso
  el navegador dibujaría primero el tema por defecto y luego el guardado, y se vería el
  parpadeo. Preferencia puramente visual: no viaja al servidor, no toca `estado.json`, no
  añade ninguna petición.
- **Iconografía Lucide.** Seis de los siete destinos llevan **el mismo icono que el prototipo**
  usa para ese destino, copiado de su DOM y no dibujado de nuevo: `utensils` (Platos),
  `megaphone` (Publicidad), `sparkles` (Juego), `chart-column` (Analítica), `paintbrush`
  (Marca) y `settings` (Ajustes). Ofertas no existe en el prototipo: lleva `badge-percent`,
  Lucide también, que es literalmente el descuento del que va la pantalla. Todos a
  `viewBox 24`, `stroke-width 2`, cabos y uniones redondos — se acabaron los ocho grosores de
  trazo distintos que había. Migración por componente: **los iconos de dentro de las pantallas
  se cambian cuando esas pantallas migren**, no ahora.
- **Barra inferior y hoja «Más»** repintadas con el sistema nuevo. Item de hoja a 48 con radio
  12 e icono 17; activo de la barra inferior en `selected-text` con el icono en primario. La
  navegación móvil aprobada **no cambia de comportamiento**.
- **Cabecera vieja apagada** cuando hay sesión: decía lo mismo que la nueva. Se conserva el
  aviso de madrugada (`.sub-servicio`), que no es identidad sino información del servicio en
  curso y se lee mejor pegada al contenido. `.adm-sidebar-marca`/`-fecha` se apagan por la
  misma razón; el aviso de sesión se queda junto a Salir.

### Un fallo pagado dos veces, y su lección

`.adm-tema-sw` salía de **32x48** en vez de 32x18. Causa: el reset general del panel pone
`min-height:48px` a **todo** `button`, y un `height` de clase no gana a un `min-height`
heredado. Es **exactamente** la misma trampa que se pagó con `.adm-foto-b` en DS-2, y se
resuelve igual: `min-height:0` explícito. Queda anotado aquí porque es la segunda vez: en este
panel, **cualquier `button` que deba medir menos de 48 necesita apagar ese `min-height` a
mano**.

### Un hueco muerto que venía de MISE-B

`body:not(.sin-entrar){padding-bottom:64px}` reserva sitio para la barra inferior, y el reset
de 768 decía `body` a secas: perdía por especificidad y dejaba **64px muertos al final de cada
pantalla en escritorio**, con la barra ya oculta. Venía de MISE-B y no se había visto; con la
cabecera nueva sumando 68 arriba ya se notaba. Corregido.

### Diferencias deliberadas respecto al prototipo

Todas son casos en que el **encargo escrito** da un valor y el prototipo otro. Manda el
encargo, y la diferencia se anota aquí en vez de resolverse en silencio:

| Punto | Prototipo | Encargo (aplicado) |
|---|---|---|
| Radio de item de nav / campo / tema | 14.4px (`rounded-xl` sobre `--radius:.65rem`) | 12px (§10, §12) |
| Icono de navegación | 16px | **17px** (§4, §12) |
| Peso del item de nav en reposo | 400 | **500** (§12) |
| `line-height` del título | 32px | 30px (1.25, §8) |
| `--muted-bg` claro / oscuro | `#EDF0F4` / `#28313D` | `#F6F7F9` / `#252C36` (§5, §6) |
| Fondo de campo | canvas | `--input-bg` (§17) |
| Chips | 36px, radio 10.4, sin borde | 40px, pastilla, con borde (§18) — **pendiente de V3** |

El sistema de radios del prototipo es `--radius:.65rem` con derivados calculados (`md` = r−2,
`lg` = r, `xl` = r+4); el del encargo es una escala redonda 6/8/12/16/999. Se ha implementado
la del encargo.

### Fuera de alcance en esta ronda, a propósito

Los **contenidos** de las pantallas siguen con su geometría anterior: chips, filas de plato,
bento, botones y campos heredan los colores y la tipografía nuevos por token, pero **no se han
recompuesto**. Eso es V3 (Platos) en adelante. En concreto, el chip pulsado sigue siendo la
pastilla invertida de DS-2 (`--ink` de fondo) en vez de la de `selected-bg` que pide §18: es
legible y coherente en los dos temas, pero no es todavía la del sistema nuevo.

### Verificación

- **Contraste**: barrido automático de las 7 pantallas en los **dos temas**, midiendo texto
  real contra su fondo real compuesto. **Cero elementos por debajo de 3,2:1**, en claro y en
  oscuro. Antes de cerrar las fugas había 31 fallos en claro sólo en Publicidad.
- **Responsive**: 1512 · 1024 · 768 · 560 · 390 · 320. **Cero desbordamiento horizontal** en
  los seis. Sidebar 232 en ≥1024, riel 68 en 768-1023, barra inferior por debajo.
- **Regresiones críticas, todas en verde**: sync Ofertas→Platos sin F5 (chip 0→1, clase
  `.es-oferta` y etiqueta, con la semántica congelada: maestro apagado + plato configurado
  sigue contando 0); toast 422 con el texto exacto del servidor («Elige al menos una categoría
  o un plato antes de encenderla.») y el interruptor revertido; H1 plegado en móvil y abierto
  en escritorio; H2 sin selector de categoría (cero elementos); H3 plegado en móvil. Consola
  limpia en pestaña nueva. Login y recepción verificados en los dos temas.
- **Capturas**: no ha sido posible generarlas. La captura de pantalla no funciona en este
  entorno («window minimized or hidden»), trampa ya documentada en `RELEVO.md`. En su lugar se
  entrega la tabla de medidas comparadas de arriba, tomada con `getBoundingClientRect` y
  `getComputedStyle` sobre los dos documentos.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

**DETENER PARA REVISIÓN HUMANA. NO EMPEZAR V3.**

---

## SocialCard V3 — Platos, y corrección de las seis diferencias de V1/V2

**2026-09-08.** Segunda ronda de la migración. Cambia la regla de fidelidad: ahora que el
HTML+CSS del prototipo se puede **ejecutar y medir**, el valor medido manda sobre el valor
estimado. Las seis diferencias que V1/V2 había dejado anotadas se cierran con el número real.

### Las seis, corregidas con su medida

| # | Punto | Antes (estimado) | Ahora (medido en el prototipo) |
|---|---|---|---|
| 1 | Radio de nav / campo / selector de tema | 12px | **14.4px** |
| 2 | Icono de navegación | 17px | **16px** |
| 3 | Peso del item de nav en reposo | 500 | **400** (activo sigue 600) |
| 4 | `line-height` del título | 30px | **32px** |
| 5 | `--muted-bg` claro / oscuro | `#F6F7F9` / `#252C36` | **`#EDF0F4` / `#28313D`** |
| 6 | Fondo de campo | blanco propio | **el canvas** (`#F2F4F7` / `#15191F`) |

Sobre la 1: el prototipo no escribe radios sueltos, los **deriva** de `--radius:.65rem`
(10.4px) — `sm` = r−4, `md` = r−2, `lg` = r, `xl` = r+4, y la tarjeta con un 16 fijo aparte.
Se ha adoptado ese sistema entero, no sólo el 14.4 suelto, para que los escalones queden
relacionados como allí.

Sobre la 2: las clases del prototipo dicen `size-[17px]`, pero una regla más específica de la
propia biblioteca lo deja en **16px computados**. Manda el píxel dibujado, no la clase
escrita.

Sobre la 6: `--input` del prototipo (`#BDC6D2`) **no es** el fondo del campo — es el gris
fuerte de la **pista de los interruptores apagados**. El campo va sobre el canvas. Los dos
usos se han separado en tokens distintos para no volver a confundirlos.

Tokens nuevos tomados del prototipo: `--sc-text-medio` (`--secondary-foreground`: la tinta de
lo seleccionado que no es acción principal) y `--sc-sombra-card` (`0 2px 5px #18273a06`). Los
estados pasan a los valores exactos del prototipo (`#166448`/`#E4F4EC` éxito,
`#815000`/`#FFF3CC` aviso, `#BD2031` error).

**Se conserva** `--p-accent-fill` apuntando a `--sc-primary`: el color del restaurante no tiñe
el panel. `--accent` sigue reservado a carta pública, Marca e identidad.

### V3 — Platos

Medido contra el prototipo ejecutado, a 1512px:

| Pieza | Prototipo | Admin |
|---|---|---|
| Barra de trabajo | `1217x66`, radio 16, borde, superficie, relleno 12 | `1153x66`, radio 16, borde, superficie, relleno 12 |
| Buscador | `448x40`, radio 14.4, fondo canvas, lupa 16 | `448x40`, radio 14.4, fondo canvas, lupa 16 |
| Chip | 36 alto, radio 10.4, relleno 12, 13/500, sin borde | idéntico |
| Tarjeta de categoría | radio 16, superficie, borde, sombra `0 2px 5px` | idéntico |
| Cabecera de categoría | 56 alto, fondo `muted`, filete abajo, relleno 16, nombre 14/600 | idéntico |
| Contador de categoría | 12px tabular, radio 8.4 | idéntico |
| Fila | separador **arriba**, primera sin él, relleno 16 | idéntico |
| Nombre de plato | 14/600 | idéntico |
| Precio | 14/600 tabular, a la derecha | idéntico |
| Botón de icono | 32x32, radio 10.4, icono 16 | idéntico |

**Chips:** dejan los 40px que decidió DS-2 y bajan a los **36 medidos**, con radio 10.4 y sin
borde. En reposo no llevan pastilla; el fondo aparece al pasar el ratón y se queda cuando el
filtro está activo — así es como el prototipo distingue lo elegido. El contador sube a la
superficie de la tarjeta cuando el chip está activo: un gris sobre el mismo gris no se lee.

**Cámara:** pasa de 44px a los **32 del botón de icono del prototipo**, con el icono a 16. El
área táctil **no** se reduce: un `::before` de 44x44 la mantiene, ahora de forma
incondicional. Con eso se han podido retirar dos excepciones que existían sólo para encoger la
cámara dentro de la ficha estrecha y para parchear su área táctil en pantalla de dedo.

### Adaptaciones respecto al prototipo, y por qué

- **La fila NO pasa a la tabla de 72px del prototipo.** Allí la fila es una tabla de una sola
  columna con tirador, idiomas, precio y estado, a 72px por plato y 5 platos por categoría.
  Aquí hay **312 platos**: a 72px son 22.000px de scroll. El punto 10 de la orden dice
  conservar el bento actual y el 18 dice no convertir Platos en una landing. Se conserva el
  bento de dos columnas y se aplica el **lenguaje** de la fila del prototipo —separador
  arriba, relleno 16, nombre 14/600, apunte 13 apagado, precio 14/600 tabular a la derecha—,
  no su geometría de tabla. La fila queda en 58px.
- **Columna de idiomas: no se trae.** Es del mock; el admin no tiene ese control.
- **Contador de categoría sobre la superficie y no sobre `muted`.** El prototipo usa el mismo
  tono para la cabecera y para el contador, con lo que allí el contador desaparece. Aquí la
  cifra importa, así que sube un escalón.
- **`.adm-campo` conserva sus 50px** en todo el panel; sólo el buscador de Platos —lo que
  migra V3— baja a los 40 del prototipo. El resto bajará cuando migre su pantalla, igual que
  se acordó para los iconos.

### Tres errores míos, encontrados midiendo

1. **Barra de filtros pegada arriba.** La hice `position:sticky`. Medido a 560px, envuelve
   hasta **158px de alto** y, fijada, se comía una quinta parte de la pantalla de forma
   permanente. Ni el prototipo ni la versión anterior la fijan. Retirada.
2. **`flex-wrap:wrap` en dirección columna.** Un contenedor flex en columna que envuelve
   reparte los hijos en varias **columnas**, y `align-items:stretch` los estira al ancho de su
   línea, no al del contenedor: buscador y chips salían a **470px dentro de una caja de 320**
   a viewport 390. Resuelto con `flex-wrap:nowrap`.
3. **`flex-basis` midiendo alto.** Con la barra en columna, el `flex:1 1 260px` del buscador
   dejaba de medir ancho y pasaba a medir **alto**: la etiqueta salía de 260px y la barra
   entera de 334. Es la misma trampa que `.adm-dto` ya tenía documentada en Ofertas. Resuelto
   con `flex:0 0 auto` en esa media query. La barra queda en **114px** a 390 y **66** a 1512.

En estrecho los filtros **ruedan en horizontal** en vez de envolver, como en el prototipo.

### Contraste — ahora con umbrales WCAG reales

Se abandona el umbral único de 3.2:1 y se mide con los de la norma: **4.5:1** para texto
normal y **3:1** para texto grande (≥24px, o ≥18.66px con peso ≥700). El medidor compone el
fondo real capa a capa, con alfa, y entiende tanto `rgb()` como `color(srgb …)` — la versión
anterior no leía la segunda notación y daba falsos positivos en todo lo que colgaba de la
cabecera translúcida.

**Resultado: cero fallos, en los dos temas, en las siete pantallas.**

Un único fallo real apareció y se corrigió: `.adm-e-desactivado` medía **4.30:1** con texto de
13px. **No era un token del prototipo**: era un fondo derivado propio, un `color-mix` al 14%
contra `transparent` que se sumaba a lo que hubiera debajo. Pasa a mezclarse al 10% contra la
superficie, con lo que el fondo es siempre el mismo y mide **5.25:1**. `--ui-state-inactive`
no se ha tocado.

### Responsive

| Ancho | Barra de filtros | Fila | Desborde horizontal |
|---|---|---|---|
| 1512 | 1153x66, en línea | 548x58, dos columnas | no |
| 1024 | 665x114 | 635x58, una columna | no |
| 768 | 573x114, riel 68 | 543x58 | no |
| 560 | 490x114 | 460x58 | no |
| 390 | 320x114, chips en scroll | 290x58 | no |
| 320 | 250x114, chips en scroll | 220x58 | no |

### Regresiones funcionales — todas verdes

Buscador (312 → 3 con «samosa» → 312) · filtros por chip · agotado (interruptor, clase
`.es-agotado`, contador 0→2→0, «Guardado.») · precio inline (1,00 → 9,99 → 1,00, dos
autoguardados) · destacado (abre su selector, `aria-expanded`) · cámara · **sync
Ofertas→Platos sin F5** (chip 0 con maestro apagado, 1 al encender, fila con `.es-oferta` y
etiqueta) · **toast 422** con el texto exacto y el interruptor revertido · H1 abierto en
escritorio y plegado en móvil · H2 sin selector de categoría. Consola limpia en pestaña nueva.

### Nota sobre CSS muerto

`.tools`, `.search` y `.chip` **no los usa ningún elemento del HTML** — son de la maquetación
anterior a MISE-B. Se han dejado coherentes con el sistema nuevo por si se reviven, pero
**nada de lo que se ve en Platos pasa por ellos**: la barra real es `.adm-platos-filtros`, el
buscador es `#q.adm-campo` y los filtros son `.adm-chip`. No se han borrado: limpiar código
muerto no es parte de esta fase.

### Capturas

Siguen sin poder generarse: el entorno responde «window minimized or hidden». En su lugar van
las tablas de medidas de arriba, tomadas con `getBoundingClientRect`/`getComputedStyle` sobre
los dos documentos.

Aviso sobre el método, por si se repite: el emulador de viewport de este entorno llegó a
devolver `innerWidth` y `document.documentElement.clientWidth` **distintos** (518 contra 390),
con los elementos `position:fixed` midiendo contra el primero. Las medidas fiables salen de
recargar la página **después** de fijar el ancho y de comparar `document.body.scrollWidth`
contra `clientWidth`, nunca `innerWidth`.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

**DETENER PARA REVISIÓN HUMANA. NO EMPEZAR V4.**

---

## SocialCard V4 — Ofertas

**2026-09-08.** Tercera ronda. Misma regla de fidelidad que V3: el píxel medido en el
prototipo ejecutado manda; donde Ofertas tiene un componente que el prototipo no tiene, se
construye con los patrones ya medidos y aprobados, sin inventar un sistema nuevo.

### La tarjeta genérica migra, y con ella medio panel

`.adm-f` es la ficha que usa Ofertas — y también Publicidad, Juego, Analítica, Marca y
Ajustes. Migrarla sólo dentro de Ofertas habría dejado dos tarjetas distintas conviviendo,
así que migra entera: superficie (antes el gris de `--ficha`), radio **16**, borde de
tarjeta y la sombra mínima del prototipo (`0 2px 5px #18273a06`), relleno 16. Usaba
`--r-sheet` (21px), que es un radio de la **carta pública**, no del panel.

Las pantallas que aún no migran heredan la caja correcta desde ya; su composición interna
sigue pendiente de V5/V6. Es la misma caja que el bento de Platos desde V3.

### Medidas — prototipo contra admin, a 1512px

| Pieza | Prototipo | Admin |
|---|---|---|
| Tarjeta | radio 16, superficie, borde, sombra `0 2px 5px` | idéntico |
| Cuadro de icono | 36x36, radio 10.4, icono 16 | idéntico |
| Título de ficha | 14/600 | idéntico |
| Insignia de estado | radio 8.4, relleno 2/8, 12/600, pareja fondo+tinta | idéntico |
| Campo | 40 alto, radio 14.4, fondo canvas, borde de tarjeta | idéntico |
| Interruptor | 32x18 (pista) / bola 16 | el del panel, ya migrado en V1 |
| Botón de icono | 32x32, radio 8.4, icono 16 | idéntico |

**Insignia de estado.** Era una pastilla de 30px de alto, radio 999, 13/700 con
`letter-spacing .05em`. Pasa a la insignia medida del prototipo: radio 8.4, relleno 2/8,
**12px peso 600**, sin tracking. Los tres estados reales —APAGADA · PROGRAMADA ·
CORRIENDO— conservan su significado y usan la pareja fondo+tinta de su color semántico.

**Etiquetas** (`.adm-lbl`): 13/500 apagado. Acompañan al control, no compiten con él.

### Los días: no hay medida que copiar

El prototipo **no tiene selector de días**, así que se construyen con el sistema de
selección ya medido y aprobado —el del chip y el del item de navegación—, como pide el
punto 1 del encargo.

- **36x36, radio 10.4**, no círculos de 46.
- Reposo `muted-bg` + texto secundario · hover `hover-bg` + tinta media · elegido la
  **pastilla suave** (`selected-bg` + `selected-text` + peso 600), la misma que marca el
  destino activo del sidebar.
- Elegido **no** es naranja sólido: con los siete días puestos —el caso normal— serían siete
  bloques naranjas seguidos, exactamente el «si todo es naranja nada destaca» del punto 7.
- Se dibujan a 36 pero se **tocan a 44**: un `::before` invisible mantiene el área táctil,
  igual que la cámara desde V3.
- «Semanal» pasa a botón compacto del sistema (36, radio 10.4), no una pastilla aparte.

### El hallazgo de la ronda: el interruptor maestro estaba dentro del plegado

`.adm-regla-sw` vivía **dentro del `<details>` de «Configurar oferta»**. En móvil, donde ese
bloque se pliega, **encender o apagar la oferta exigía desplegar la configuración entera** —
siendo la acción más frecuente de la pantalla y la segunda en la jerarquía del punto 6,
justo detrás del estado.

Sale del `<details>` a una fila propia inmediatamente debajo del título y la insignia:
rótulo a la izquierda, interruptor y su palabra a la derecha, sobre el gris apagado. Es el
mismo patrón «etiqueta + switch» de la fila de plato del prototipo.

**Es un cambio de sitio en el marcado, no de control.** Mismo `<input>`, mismo
`name="oferta_on"`, mismo `form="ofertas-form"`, mismo `.adm-sw` alrededor. El JS lo busca
por `input[name="oferta_on"]` y sube con `closest('.adm-sw')`, así que sigue encontrándolo
igual; `repintarEstadoOferta` sigue apuntando dentro de `.adm-f-ooferta`. Cero cambios de
contrato, de handler o de persistencia.

Efecto medido: la ficha de oferta a 560px baja de **501px a 253px** de alto, y en 390/320 el
maestro es alcanzable sin desplegar nada.

### Contraste — un fallo real, y no era del prototipo

Barrido de 7 pantallas × 2 temas con los umbrales de la norma (4.5 normal / 3 grande).

Apareció **un fallo consistente en las siete pantallas**: `.adm-btn-guardar` medía
**3.62:1**. La tinta era `--accent-ink` (`#121212`), que se calcula para el naranja del
**restaurante**; desde V1 el fondo de ese botón es el primario de SocialCard (`#C2410C`), y
esa pareja mal casada no llegaba al 4.5 con texto de 14.

No se ha tocado ningún token del prototipo: **estaban mal emparejados**. La pareja correcta
del sistema es `primary` + `primary-ink`, que es la que usa el prototipo — **5.9:1**. Se
corrigió también en los otros dos sitios con el mismo desajuste (`.adm-cal-d.extremo` y el
primer puesto de `.adm-podio`).

**Resultado tras la corrección: cero fallos, dos temas, siete pantallas.**

### La tercera vez de la misma trampa

`.adm-pct-ir` (el botón de aplicar porcentaje) baja a 32x32 y necesitó `min-height:0`: el
reset general pone `min-height:48px` a **todo** `<button>` y sin eso sale de 32x48. Es la
**tercera** aparición —`.adm-foto-b` en DS-2, `.adm-tema-sw` en V2— y confirma la regla ya
anotada: en este panel, cualquier botón por debajo de 48 la necesita.

### Iconos

Ofertas pasa a Lucide con el estándar del sistema (viewBox 24, `stroke-width 2`, cabos y
uniones redondos): `badge-percent` para «La oferta» —el mismo icono que su destino en el
sidebar—, `list-checks` para «Platos sueltos», `move-right` para la flecha del rango horario
y `chevron-down` para el plegado.

El **trazo** de las fichas que aún no migran se normaliza con una sola regla
(`.adm-f-ico svg{stroke-width:2}`): `stroke-width` en CSS gana al atributo de presentación,
así que Publicidad, Juego, Marca y Ajustes dejan de mezclar 1.6/1.75/2 desde ya. Sus
**rutas** se cambiarán cuando migre su pantalla.

### Adaptaciones deliberadas

- **`.adm-pct` baja de 54 a 40.** No es Ofertas: es el «Ajustar precios» de Platos (H1). Al
  bajar el campo del porcentaje libre a los 40 medidos del prototipo, dejar los cuatro
  botones de al lado en 54 partía la fila en dos alturas. Se igualan.
- **El buscador de «Platos sueltos» baja a 40**, la altura de campo del sistema. **No** se le
  añade una barra de filtros: Ofertas no tiene chips de estado y no se inventa una que no
  existe (punto 14).
- **La fila de plato de Ofertas se queda en su densidad** (37px en escritorio). Hereda el
  lenguaje visual de la fila de Platos —separador arriba, relleno, nombre, apunte— sin
  copiar su geometría: aquí la fila lleva menos controles y estirarla sólo la haría más
  larga de recorrer.
- **`.adm-btn-guardar` conserva sus 52px.** Vive en la tira de acciones flotante, que es
  compartida y aún no ha migrado; sólo se corrigió su contraste. Su altura bajará al
  estándar cuando migre esa tira.

### La prueba B, y por qué no es alcanzable desde la interfaz

«Encender con horario inválido» **no se puede provocar tocando los campos**: `guardarHorario()`
tiene un guard de cliente **preexistente** (no introducido en esta ronda) que, si
`hasta <= desde`, revierte los dos campos y **no envía ninguna petición** — verificado
interceptando `fetch`: cero peticiones.

Para probar el camino del servidor se forzó `to == from` directamente en el `estado.json` de
pruebas y se pulsó el maestro: **HTTP 422**, interruptor revertido, palabra «Apagada»,
insignia APAGADA y toast con el texto exacto del servidor — «El horario no es válido: revisa
desde y hasta antes de encenderla.» El estado se restauró después.

Queda anotado porque es información de producto: hoy ese 422 sólo puede dispararlo un
`estado.json` que ya venga con un horario inválido, no el uso normal.

### Responsive

| Ancho | Ficha de oferta | Config | Fila de plato | H3 | Maestro | Desborde |
|---|---|---|---|---|---|---|
| 1512 | 1153x272 | 1119x66 | 548x37 | abierto | fuera, visible | no |
| 1024 | 665x350 | 631x143 | 635x37 | abierto | fuera, visible | no |
| 768 | 573x350 | 539x143 | 543x37 | abierto | fuera, visible | no |
| 560 | 490x253 | plegada | 460x62 | **plegado** | fuera, visible | no |
| 390 | 320x272 | 286x269 al abrir | 290x62 | **plegado** | fuera, visible | no |
| 320 | 250x330 | 216x269 al abrir | 220x62 | **plegado** | fuera, visible | no |

La insignia de estado y el maestro quedan **fuera del plegado** en los seis anchos.

### Pruebas funcionales — todas verdes

Master ON/OFF · porcentaje (20→35→20, persistido) · horario (guard de cliente + 422 del
servidor con estado forzado) · días (7→6 al quitar uno, `aria-pressed` de Semanal a false) ·
Semanal (vuelve a 7, `aria-pressed` true) · selección y deselección de plato · autoguardado
(«Puesto en oferta.») · **sync Ofertas→Platos sin F5** (chip 0 con maestro apagado → 1 al
encender, fila `.es-oferta` + etiqueta, badge PROGRAMADA, pie actualizado; al apagar vuelve a
0) · **toast 422** en los dos casos con el texto exacto · rollback · H3 · navegación
Platos↔Ofertas con el título de la cabecera siguiendo al panel. Consola limpia en pestaña
nueva.

Semántica de «Con oferta» **congelada**. Sin `tiene-oferta`/`es-oferta`. Sin ofertas por
categoría en la interfaz; `offer.cats` intacto en el esquema.

### Capturas

Siguen sin poder generarse en este entorno. Van las tablas de medidas.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

**DETENER PARA REVISIÓN HUMANA. NO EMPEZAR V5.**

---

## SocialCard V5 — Normalización global de controles + Publicidad, Juego y Analítica

**2026-09-08.** Cuarta ronda. Antes de migrar las tres pantallas que faltaban se cerró una
carencia global: los controles del panel no formaban un sistema, sino la suma de las
decisiones de cinco rondas distintas.

### El interruptor: de tres geometrías a una

Inventario medido por DOM antes de tocar nada:

| Contexto | Selector | Antes | Después |
|---|---|---|---|
| Agotado (fila de Platos) | `.adm-sw-agotado` | **36×21**, bola 15 | **40×22**, bola 18 |
| Plato en oferta (fila de Ofertas) | `.adm-sw-oferta` | **36×21**, bola 15 | **40×22**, bola 18 |
| Maestro de Oferta | `.adm-sw-alto` (`oferta_on`) | **54×30**, bola 24 | **40×22**, bola 18 |
| Publicidad | `.adm-sw` (`pub_on`) | **54×30**, bola 24 | **40×22**, bola 18 |
| Juego | `.adm-sw` (`juego_on`) | **54×30**, bola 24 | **40×22**, bola 18 |
| Marca · nota en la carta | `.adm-sw` (`op_on`) | **54×30**, bola 24 | **40×22**, bola 18 |
| Selector de tema | `.adm-tema-sw` | **32×18**, bola 16 | **40×22**, bola 18 |

**Resultado verificado por DOM: 616 interruptores, todos 40×22, en los seis breakpoints.**

Detalles del componente:

- Holgura interior 2px, recorrido 18px, radio pastilla, transición **160ms** con la curva
  del sistema. Sin rebote, sin brillo, sin efecto.
- **El filete del contorno va como `inset box-shadow` y no como `border`.** Un borde real
  come de los 22px de alto (`box-sizing`) y descuadra la holgura de 2; la sombra interior
  dibuja el mismo filete sin tocar la geometría. Hace falta porque el gris apagado del
  prototipo (`--sc-input-border`) mide **1,7:1** contra la tarjeta blanca: sin filete el
  control apagado no se ve. Con él, su contorno mide **5,7:1**.
- **Área táctil 44×44** en `.adm-sw-pista::before`, incondicional. Verificada por
  `elementFromPoint` en las cuatro esquinas del cuadrado de 44.
- Estados: OFF neutro · ON `--sc-primary` · hover sube el filete a `--sc-text` · focus
  anillo de 2px del sistema · disabled con `--ui-control-disabled-opacity`.

**La única excepción de color, y es semántica:** el interruptor de **Agotado** sigue
poniéndose rojo (`--ui-state-depleted`) y no naranja al marcarse. Un agotado no es un
«encendido», es una baja; pintarlo del color de la acción principal lo leería como un
logro. Geometría idéntica al resto, sólo cambia el color de ON.

Se retiró el parche táctil que `.adm-sw-agotado` tenía en `@media (pointer:coarse)`: el
componente ya lleva su 44×44 siempre, y para todos.

### Otras dos inconsistencias globales, cerradas

Medidas por DOM recorriendo las siete pantallas:

| Control | Antes | Después |
|---|---|---|
| `.adm-campo` | **tres alturas**: 40 (buscadores migrados), 42 (los 293 precios de fila), 50 (todo lo demás) | **40** — 308 instancias |
| `.adm-btn` | **cuatro alturas**: 40, 46, 52, 54 | **40** — 19 instancias |

40 es la altura de campo y de botón estándar medida en el prototipo. La jerarquía de un
botón la dan su color, su sitio y su aire — el mismo argumento que unificó los
interruptores. Con eso se retiraron también los dos overrides por pantalla que V3 y V4
habían tenido que poner (`.adm-platos-filtros .adm-campo`, `.adm-f-osueltos .adm-campo`):
la regla base ya mide 40 en todo el panel.

`.adm-btn-guardar` baja de 52 a 40 y `.adm-ajustar-precios-mano` de 54 a 40 — este último
tenía 54 para igualar a los `.adm-pct` de su fila, que ya habían bajado a 40 en V4, así que
era el único botón del panel con altura propia. Sigue teniendo más presencia que sus
vecinos por **ancho**, no por alto.

### Componentes compartidos migrados — y qué pantallas lo heredan

- **`.msg`** (aviso de resultado): radio 12 en vez de `--r-sheet` (21px, de la carta
  pública) y cuerpo 14. `ok` y `bad` pasan a la pareja fondo+tinta de su estado; el `ok`
  deja de derivarse del color del restaurante y pasa a verde de éxito. **Lo heredan las
  siete pantallas.**
- **`.adm-vacio`** (estado vacío): filete de 1px discontinuo del sistema, radio 12, icono
  16, más aire vertical. Lo heredan Analítica, Juego y Marca.
- **`.adm-check`**: `accent-color` pasa del color del restaurante al del panel.
- **Trazo de iconos**: `.adm-btn svg` a 16px con `stroke-width:2`.

### V5 — Publicidad

- Vista previa (`.adm-previo`/`.adm-previo-vacio`) separada de la configuración: radio de
  tarjeta, sobre el gris apagado, estado vacío con filete discontinuo del sistema.
  `--r-chip` era otro radio de la carta pública.
- **Atajos de duración**: son una selección, así que usan el lenguaje de selección del
  sistema —la pastilla suave— en lugar del naranja de la marca del restaurante. Bordes de
  1px, radio 12, icono 16, altura 96.
- Todos sus campos a 40 y sus botones a 40. Sin funciones inventadas.

### V5 — Juego

- **Podio**: el puesto pasa a insignia del sistema (24×24, radio 8.4, 12 tabular); el
  primero lleva la pastilla suave de selección, no un relleno macizo. Nombres 14/600,
  anónimos en 14/400 apagado, puntuaciones 14/600 tabulares.
- El destructivo («Vaciar el marcador») ya usaba `--ui-state-danger`: se confirma que **no**
  es naranja, y se verificó a 40 de alto como el resto.
- Toggle del juego: el interruptor global.

### V5 — Analítica

- Barras del gráfico en el gris de los textos; **la única barra en color es la que se está
  leyendo**, y pasa del color del restaurante al primario del panel.
- Cifra principal a `--t1` con peso 600 y cifras tabulares. Pie de gráfico con el borde y
  el gris del sistema.
- Sólo datos reales: no se añadió ninguna métrica ni ningún gráfico.

Para poder verla poblada se sembraron **70 días de datos de prueba** en `admin/datos/`
(el formato es el tamaño en bytes de cada `d-YYYY-MM-DD.txt`) y tres registros en
`record.json` para el podio. Ambos se borraron al cerrar la ronda.

### Contraste

Barrido de 7 pantallas × 2 temas con los umbrales de la norma (4.5 normal / 3 grande),
**con Analítica y el podio poblados**. **Cero fallos.**

### Responsive

616 interruptores medidos por DOM en **1512 · 1024 · 768 · 560 · 390 · 320**: todos 40×22,
en todas las anchuras, y **cero desbordamiento horizontal** en las siete pantallas.

Nota sobre el área táctil en listas densas: en escritorio la fila de Ofertas mide 38px, así
que los cuadrados de 44 de dos filas contiguas se solapan 6px y gana el de abajo. En las
anchuras donde se usa el dedo la separación entre filas es de **63px**, así que no hay
solape. El solape sólo existe con ratón, donde el puntero es preciso.

### Regresiones — todas verdes

Buscador (312 → 3 → 312) · agotado (interruptor, clase, contador 0→2→0, pista roja,
«Guardado.») · precio inline (1,00 → 7,77 → 1,00) · H1 · H2 sin selector · H3 ·
**sync Ofertas→Platos sin F5** (chip 0 con maestro apagado → 1 al encender, fila
`.es-oferta` + etiqueta, badge PROGRAMADA; al apagar vuelve a 0) · **toast 422** con el
texto exacto · Publicidad (interruptor + atajo de duración) · Juego (interruptor + podio) ·
Analítica (gráficos poblados). Consola limpia en pestaña nueva.

### V5 — tres ajustes de revisión

**2026-09-08**, pedidos tras ver el panel en vivo.

**1. Un solo ritmo de fila.** El relleno y el filete ya eran idénticos en Platos y en
Ofertas; lo que las separaba era el **contenido**: la fila de Platos la estira su campo de
precio de 40 (56px en total) y la de Ofertas se quedaba en 38 con sólo un interruptor de 22.
Con `min-height:56px` en `.adm-orow` las dos respiran igual — **56 en las dos pantallas**,
medido.

**2. Los interruptores pierden la sombra.** Se retira el `box-shadow` de la bola en el
componente único y en el selector de tema. El contorno de la pista (el `inset box-shadow`)
se queda: es el que hace visible el control apagado, y sin él baja a 1,7:1.

**3. El destacado lo dice su etiqueta, no la fila.**

- Se retira el **fondo de la fila** para `.es-destacado` (`--marca-velo`, un velo gris al
  6%). Competía con el agotado y con la oferta —que sí necesitan teñir la fila— y además se
  confundía con el hover.
- Se retiran **todos los hover de fila**: el de `.adm-orow` y los tres que existían sólo
  para cancelarlo (`.por-categoria`, `.es-oferta`, `.es-agotado`). Verificado por
  `document.styleSheets`: **cero reglas `:hover` sobre `.adm-orow`**.
- La etiqueta pasa a la **pastilla de selección** del sistema (`selected-bg` +
  `selected-text`) y **encoge**: 22px de alto en vez de 26, 12px en vez de 13, peso 600 en
  vez de 700 y sin el `letter-spacing` que la ensanchaba. De 26px de alto y ~120 de ancho a
  **104x22**.

**Dos trampas pagadas al hacerlo:**

- La mitad de «quitar» salía de **42px** en vez de 20: el reset general de `<button>` pone
  `padding:0 21px` y con `box-sizing:border-box` se comía el ancho. Se apaga con
  `padding:0` explícito. Es la misma familia que el `min-height:48` — en este panel, un
  botón pequeño necesita apagar **las dos** cosas.
- Subir el tope de ancho de la etiqueta de 60 a 84 sacó **18px de scroll horizontal a
  320px**: el grupo de acciones de la fila (precio + etiqueta + interruptor) no encoge, y
  con 84 sumaba 198px dentro de una fila de 220. Se añade un `@container` a 260px que baja
  el tope a 48 sólo en columna muy estrecha. Verificado: **cero desbordamiento en los seis
  breakpoints**.

Contraste tras los cambios: **cero fallos, 7 pantallas × 2 temas**.

### Ajustes de revisión — segunda tanda

**2026-09-08.** Pedidos tras ver el panel en vivo.

**Interruptores, sin borde.** Lo que se veía no era la sombra de la bola —retirada en la
tanda anterior— sino el **`inset box-shadow` de la pista**. Fuera los dos, en el componente
único y en el selector de tema. Queda anotado el motivo por el que ese filete existía: el
gris apagado del prototipo (`#BDC6D2`) mide **1,7:1** contra la tarjeta blanca, así que el
apagado se distingue ahora por su relleno y por la bola, no por un contorno. Es lo que hace
el prototipo. Si algún día se ve poco, la salida es oscurecer ese gris, no devolver el borde.

**Fila agotada, sin fondo.** Retirado el tinte rojo al 8% de `.adm-orow.es-agotado`. El
nombre tachado en rojo y el interruptor encendido ya lo dicen.

**Los cuatro filtros pasan a rejilla de tarjetas.** Medida en el prototipo ejecutado, no
estimada:

```
article  flex items-center gap-3  min-h-82  rounded-2xl  px-4
  div    size-9 (36x36)  rounded-xl (14.4px)  bg-accent  text-[--orange-ink]
    svg  size-4 (16px)
  div    p 20/600 tracking-[-.03em]  ·  p 13px muted
```

Es decir: **pastilla de icono a la izquierda**, 36x36 con radio **14.4** —ni cuadrado con
borde ni círculo, el mismo radio que ya usan el item del sidebar, los campos y el selector de
tema—, fondo melocotón y el icono a 16 en la tinta naranja oscura; al lado la cifra a 20/600
con tracking -.03em y el rótulo a 13 apagado.

Dos diferencias deliberadas respecto al prototipo:

- **Cada tarjeta lleva su propia explicación** (12px, dos líneas como mucho). Por eso mide
  102 de alto y no 82. Sustituye al botón de ayuda único que había encima de la rejilla.
- **La pastilla se invierte cuando el filtro está activo** (relleno sólido, icono en claro).
  En el prototipo la pastilla es siempre melocotón porque allí sólo hay una tarjeta; aquí la
  tarjeta pulsada también se pone melocotón y la pastilla se fundiría con ella.

Se retira el título «Platos 312»: la cabecera fija ya dice en qué pantalla estás y el total
vive ahora en la tarjeta «Todos», donde además se puede pulsar. La ayuda general se muda
junto al buscador.

**Son los mismos botones**: mismo `data-filter`, mismo contenedor `.adm-chips-estado` del
que cuelga su JavaScript y los mismos `id` de contador (`#n-chip-agotados`, `#n-chip-oferta`)
que actualiza la sincronización con Ofertas.

**«Ajustar precios» se reubica** debajo del buscador, antes de la lista. Es una acción
ocasional y en bloque. Su plegado H1 no cambia.

**El cajón de precio baja a 32**, la altura del botón «Destacar» que tiene al lado.

**Acordeón 3+3.** Tres platos por columna, seis visibles, y al pie «Ver X platos más» con el
número real que sobra. En Platos y en Ofertas. El recorte es **CSS puro** —las 312 filas
siguen en el documento—, y por eso **buscando o filtrando se levanta solo y el botón
desaparece**: si no, un plato que coincide quedaría escondido detrás de un «Ver más» y
parecería que no existe.

**Cinco trampas pagadas en estas dos tandas**, todas de la misma familia —una regla genérica
que gana a la específica— y todas encontradas midiendo, no leyendo:

1. La mitad «quitar» de la etiqueta salía de **42px** en vez de 20: el reset de `<button>`
   pone `padding:0 21px` y `box-sizing:border-box` se comía el ancho.
2. Subir el tope de la etiqueta de 60 a 84 sacó **18px de scroll a 320**: el grupo de
   acciones de la fila no encoge. Tope de 48 en columna muy estrecha.
3. La rejilla salía de **47px de alto en vez de 82**: `.adm-chip` está definido *después* y
   con la misma especificidad, así que ganaba. Selector subido a `.adm-kpis .adm-kpi`.
4. La explicación **no envolvía**: 300px de texto en una tarjeta de 120 y 162px de scroll.
   `.adm-chip` trae `white-space:nowrap` y la tarjeta lo heredaba.
5. A 320 el grupo de acciones **se salía de su tarjeta** (337 contra 307) y la tarjeta lo
   recortaba con `overflow:hidden`, cortando el interruptor. Añadido un `@container` a 260px
   donde la fila vuelve a envolver.

**La ayuda general de Platos se retira entera.** El botón ⓘ suelto —primero encima de la
rejilla, después junto al buscador— no tenía nada al lado que lo explicara. Su contenido está
repartido donde se usa: cada tarjeta de filtro cuenta lo suyo, y el aviso de que la regla se
cambia en Ofertas vive en la tarjeta «Con oferta». Con el marcado fuera, se retiran también
las reglas de `.adm-platos-cab` y `.adm-platos-titulo`, que ya no aplican a nada.

Contraste tras todo ello: **cero fallos, 7 pantallas × 2 temas**. Cero desbordamiento en
320/390/1512, y comprobado además que **ningún elemento se sale de su caja**, no sólo que el
documento no tenga scroll.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

**DETENER PARA REVISIÓN HUMANA. NO EMPEZAR V6.**

---

## SocialCard V6 — Marca y Ajustes

**2026-09-08.** Cierra la migración visual: eran las dos últimas pantallas cuyo interior no
se había recompuesto. Sólo A/B —recolocación y recomposición—: ni un `name`, ni un `value`,
ni un manejador, ni un contrato POST cambian.

### Qué quedaba sin migrar, medido y no supuesto

**Marca** ya heredaba la caja: `.adm-f`, `.adm-campo`, `.adm-btn` y `.adm-sw` eran los del
sistema desde V4. Lo que faltaba era **composición e iconos**:

- las cinco fichas se ordenaban por ALTO, no por tarea. «Nombre en la carta» —lo que define
  la identidad del restaurante— quedaba la última, sola en la fila 3;
- los cinco iconos de cabecera eran rutas dibujadas a mano con trazo 1,6 y 1,75. El trazo ya
  lo normalizaba el CSS a 2; las rutas seguían sin ser de Lucide;
- el `input[type=file]` iba desnudo: **38 px** de alto contra los 40 del resto de campos;
- la muestra de color medía **54x50** con radio 12 literal, al lado de un campo de 40 con
  radio 14,4;
- «Restaurar color original» ocupaba el **ancho completo** de la ficha, con el mismo peso
  visual que Guardar.

**Ajustes** era el caso grave. La ficha de copias sí estaba migrada; el bloque de
superadministrador **no se había tocado nunca**:

| Elemento | Antes | Ahora |
|---|---|---|
| Contenedor | `<details class="card">` x3 | `.adm-f.adm-f-plega` x3, dentro del bento |
| Resumen | `style="cursor:pointer;font-weight:600"` | `<summary>` con icono Lucide, rótulo y galón |
| Campos | `.fld input[type=password]` a **56 px** | `.adm-lbl` + `.adm-campo` a **40** |
| Botón principal | `button.save`, **48 px**, fondo `--ink` | `.adm-btn` a 40 |
| Botón «Cambiar» | `<button>` pelado, gris del navegador | `.adm-btn` a 40 |
| Registro | `<pre style="font:12px/1.6 …">` sin caja | `.adm-log`, caja del sistema, scroll propio |
| Título de grupo | `<h2 style="margin-top:var(--s5)">` | `.adm-seccion` |
| Estilos en atributo | **9** | **0** |

### Composición nueva de Marca

El orden ya no es el que minimiza el hueco de la rejilla sino el de la tarea: primero **quién
es** (nombre y color), luego **cómo se ve** (las portadas), y al final **lo que sale en el
pie** (la nota de Google y las redes).

```
fila 1   nombre (3/6)      color (3/6)
fila 2   portadas (6/6)
fila 3   Google (3/6)      redes (3/6)
```

Las portadas cruzan el ancho porque son una rejilla de miniaturas: a 566 px entraban dos por
fila; a 1153 entran **cinco**. Y las tres direcciones de Redes pasan a `.adm-2col` por encima
de 1200 px, con lo que la ficha baja de 383 a 294 y se empareja con la de Google, que mide
294: el escalón de 90 px de la fila 3 desaparece.

Medido a 1512: el alto total del panel de Marca baja de **948 a 871**.

### Marca es la excepción donde SÍ se ve el color del restaurante

Se mantiene la separación que rige desde V1: la **interfaz** usa tokens SocialCard y el
**contenido** usa la identidad del cliente. En esta pantalla el contenido es el color, y por
eso la muestra, el hexadecimal y los tres chips del motor enseñan colores reales del
restaurante — dentro de controles que son del sistema. No hay vista previa de la carta en
Marca, así que no hay nada más que separar entre «configuración» y «resultado».

`--accent` no se toca: se sigue calculando igual y se sigue aplicando en vivo a la carta.

### La ficha plegable

`.adm-f-plega` es la misma `.adm-f` con la cabecera dentro del `<summary>`. Tres decisiones
que conviene dejar escritas:

1. **`display:block`, no el `flex` de `.adm-f`.** Sobre un `<details>`, el flex reparte
   resumen y cuerpo como items y el plegado nativo se comporta distinto según navegador.
2. **El rótulo es un `<span class="adm-f-tit">`, no un `<h2>`.** El contenido de `<summary>`
   es contenido de frase; un encabezado sólo vale si es el único hijo. Quien lo ve lee el
   mismo título; quien lo escucha oye un botón que despliega, que es lo que hace. La
   estructura la mantiene el `<h2>` de `.adm-seccion`.
3. **`align-self:start`.** La rejilla iguala alturas de fila; con un plegable abierto y otro
   cerrado, el cerrado se quedaría con 300 px de caja vacía.

### Trampas pagadas en V6

**Sexta de la familia «regla genérica declarada después gana a la específica».** El indicador
de oferta de la fila de Platos salía como una **mancha gris** en vez del círculo con filete
rojo: `.adm-tag` declara `background:var(--marca-velo-mas)` **después** de `.adm-tag-oferta`,
que pide `transparent`, y con la misma especificidad. Ya había pasado con `.adm-chip` contra
`.adm-kpi` y con `button{min-height:48px}`. Se paga igual: subiendo el selector, nunca
reordenando el fichero.

**Séptima, nueva de tipo:** `transform` **no se aplica a un elemento en línea no
reemplazado**. El galón del plegable era un `<span>` y no giraba al abrir — medido,
`matrix(1,0,0,1,0,0)` con `[open]` puesto. Con `display:grid` gira.

Y una **trampa de medición**, no de CSS: `getComputedStyle` leído en el mismo tick en que se
abre un `<details>` dentro de un panel oculto devuelve el valor viejo. Dos lecturas dieron
identidad antes de que la tercera, con el panel visible, diera `matrix(-1,0,0,-1,0,0)`.

### Ajustes de revisión pedidos sobre la marcha

Tres cosas vistas en Platos y Ofertas mientras corría V6:

1. **El velo gris de la fila en oferta.** `.adm-orow.es-oferta` seguía con
   `background:var(--marca-velo)` — un 6 %. En la ronda anterior cayeron el de agotada y el
   de destacada; éste se quedó, y como la clase es la misma en las dos pantallas, el tinte de
   Ofertas se arrastraba a Platos y volvía a pintar allí el fondo que se había quitado.
   Retirado. Lo dice el indicador en Platos y la casilla marcada en Ofertas.
2. **El indicador de oferta, a la altura del badge.** 22x22 —el badge de destacado mide 22—,
   círculo, fondo transparente, icono a 13. Y su filete sube del 45 % al **70 %**: al 45 %
   medía **2,23:1** contra la tarjeta y WCAG 1.4.11 pide 3 para el contorno de un control.
   Ahora 3,67 en claro y 4,04 en oscuro; el icono ya iba a 6,15 y 6,82.
3. **La etiqueta de destacado deja de cortarse donde hay sitio.** El tope base sube de
   `14ch` a `20ch` —«HAY QUE PROBARLO» son 16 caracteres— y el tope de 84 px de la columna
   de categoría se levanta con `@container adm-cat-bento-col (min-width:420px)`. Medido a
   1512: la columna mide 560 y la etiqueta más larga 139, sin recorte. El tope de 48 px de
   la columna muy estrecha (320) **se queda**: es lo que evita el scroll horizontal.

### Radios antiguos alineados

`.adm-foto` (14 literal) y `.adm-fila` (13) pasan a `--radius-xl`; `.adm-color-fijo` y
`.adm-tag`, de `999px` a `--radius-pill`; `.adm-color-muestra` y `.adm-archivo`, a
`--ui-radius-control` (el mismo 14,4 de `.adm-campo`).

### Medido, no supuesto: `.adm-btn-guardar`

La auditoría arrastraba referencias contradictorias (40 y 52 px según la ronda). **Medido en
el DOM de esta ronda: 40 px**, igual que «Ver la carta» y que el resto de `.adm-btn`. No hay
excepción que resolver ni nada que aplazar por este motivo.

### Lo que se ha visto y NO se toca en V6

- **El contador de agotados cuenta filas, no platos.** `refrescar()` hace
  `pane.querySelectorAll('input[name="agotado[]"]:checked').length`, y un plato que aparece
  en la lista principal y en la de agotados tiene DOS casillas —`marcarHermanas` las
  sincroniza a propósito—. Marcando un plato el contador pone **2**. Está así en `main` desde
  antes de la migración: es corrección funcional, no visual, y V6 no la hace.
- **La tira flotante de acciones** sigue compartida y sin migrar del todo: su icono de
  Guardar es una ruta a trazo 1,9, no Lucide. Contraste correcto y funcionamiento correcto.
  Su normalización es V7.
- **CSS muerto** (`.card`, `.fld`, `.save`, `.tools`, `.search`, `.chip`): al quedarse
  Ajustes sin `<details class="card">`, sin `.fld` y sin `.save`, esas tres reglas ya no las
  usa ninguna pantalla del panel. **No se borran en V6** —la limpieza va al final, en su
  propia ronda— pero quedan anotadas como retirables.
- Las cuatro decisiones de producto congeladas (`tiene-oferta` frente a `es-oferta`, guard de
  horario, rojo del agotado, filete del interruptor apagado) siguen sin tocarse.

### Verificación

**Contraste WCAG**: cero fallos, **7 pantallas x 2 temas**, en las dos direcciones
(claro, oscuro y vuelta a claro).

**Responsive**: cero desbordamiento y **cero elementos fuera de su ficha** en 1512, 1024,
768, 560, 390 y 320 — comprobado elemento a elemento, no sólo el `scrollWidth` del documento.

**Funcional en Marca**: nombre, rótulo, color (hexadecimal, selector, restaurar), interruptor
de la nota, nota, número de reseñas, enlace, WhatsApp (normaliza `+34 600 00 00 00` a
`34600000000`), Instagram, Facebook, Tripadvisor, y reordenar portadas por fetch sin recargar.
Todo devuelto a su valor de partida.

**Funcional en Ajustes**: descargar el estado y descargar una copia (200 con
`Content-Disposition` correcto), restablecer la contraseña del restaurante, cambiar la del
superadministrador —la sesión propia sobrevive, como está documentado— y el registro de
accesos con las dos entradas nuevas.

**Regresiones globales**: buscador (312 a 3 y vuelta a 312), filtros por tarjeta, agotado,
precio en línea, destacado con su selector de etiqueta, cámara, acordeón, H1, oferta ON/OFF,
porcentaje, horario, días, Semanal, sincronización Ofertas a Platos sin F5, 422 del horario
invertido y del porcentaje fuera de rango, Publicidad, Juego y Analítica.

**Consola limpia** en pestaña nueva recorriendo las siete pantallas.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

**DETENER PARA REVISIÓN HUMANA. NO EMPEZAR V7.**

---

## SocialCard V7 — cierre global

**2026-09-08.** Cierra la migración. V7 no rediseña ninguna pantalla: quita lo que quedaba
del panel anterior, normaliza lo compartido y borra lo que ya no usa nadie.

### 1. La regla genérica de `<button>` pierde la geometría

`button{min-height:48px;padding:0 var(--s3)}` venía de la primera versión del panel, cuando
todos sus botones eran pastillas de 48. Hoy no queda ni uno: cada componente declara su
altura —40 en `.adm-btn`, 36 en `.adm-chip`, 32 en `.adm-destpick` y `.adm-pct-ir`, 30 en
`.vp-per`, 26 en `.adm-ayuda-b`, 22 en la etiqueta—. La regla ya no vestía a nadie; sólo
esperaba a que alguien se olvidara de anularla, y ha mordido **siete veces**:

| # | Componente | Salía | Debía |
|---|---|---|---|
| 1 | `.adm-tema-sw` | 32x48 | 32x32 |
| 2 | `.adm-pct-ir` | 32x48 | 32x32 |
| 3 | `.adm-foto-b` | 40x48 | 40x40 |
| 4 | `.adm-tag-destacado-quitar` | 42 de ancho | 20 |
| 5 | `.adm-kpi` | 47 de alto (por `.adm-chip`) | 82 |
| 6 | «Quitar las fechas» | 48 de alto | 15, es un enlace |
| 7 | aspa de la hoja «Más» | 32x48 | 32x32 |

**Primer intento, descartado y anotado para que nadie lo repita:** apagarla con
`.card-main button{min-height:0;padding:0}` parece lo natural y es exactamente el mismo error
que se quiere arreglar. `.card-main button` pesa (0,1,1) y `.adm-btn` pesa (0,1,0): la regla
«de limpieza» **gana** a los componentes. Medido en vivo antes de retirarla: `.adm-btn` cayó
de 40 a 18, `.adm-vermas` a 17, `.adm-pct` a 18, `.adm-atajo` de 96 a 70 y `.adm-destpick` de
32 a 28.

Lo correcto es quitarle las dos declaraciones **al propio `button`**, que es el selector de
menor peso posible (0,0,1) y por definición no puede ganarle a ninguna clase. Antes de
tocarlo se midió quién dependía de ellas: en todo el panel, **cuatro** botones del
`min-height` y **uno** del `padding` —los dos del recorte de foto, el enlace «Quitar las
fechas» (que quiere 0) y el de entrar—. Los dos primeros pasan a la geometría del sistema; la
recepción declara la suya (`.login button{min-height:48px;padding:0 var(--s3)}`) porque esa
pantalla no se migra y no debe cambiar de aspecto.

### 2. Los dos botones del lenguaje antiguo que aún se veían

`.save` y `.ghost` visten la hoja de recortar la foto, que se abre desde **cualquiera** de las
312 filas de Platos y desde Marca: pastilla negra de 48 con radio 999 al lado de controles de
40 con radio 14,4. Pasan a la geometría del sistema —40, `--ui-radius-control`, `--sc-primary`
con `--sc-primary-ink` la principal, superficie y borde la secundaria—.

Siguen llamándose `.save` y `.ghost` a propósito: los usan también el banner de migración de
estado, el envío sin JavaScript de Publicidad y la salida del modo demo. Renombrarlos sería
refactor y V7 no hace refactor.

### 3. Iconos: cero fuera del estándar

Inventario completo del panel: **49 SVG** declaraban un trazo distinto de 2 (1,5 · 1,6 · 1,75
· 1,9 · 2,1 · 2,2 · 2,4). De ellos, **42 rutas** eran dibujos a mano y pasan a las de Lucide:
`check`, `x`, `search`, `camera`, `star`, `image`, `arrow-right`, `trash-2`, `clock`,
`log-out`, `menu`, `align-left`, `ellipsis`, `eye`, `pencil`, `trending-up`, `chart-column`,
`volume-2`, `link`, `target`, `credit-card`, `toggle-left`, `calendar`, `calendar-days`,
`list`, `trophy` y `sun`. Los siete restantes ya eran formas correctas y sólo se les normaliza
el trazo.

Las dos más visibles: la **cámara** de las 312 filas y la **estrella** de los 311 botones de
Destacar.

Comprobado por DOM en las siete pantallas más cabecera, barra lateral, barra inferior, hoja
«Más», tira de acciones y hoja de recorte: **cero SVG renderizando con trazo distinto de 2**.

### 4. CSS muerto: borrado con prueba, no con sospecha

Se borra sólo lo que tiene **cero consumidores demostrados**: cero `class=` en el marcado y
cero construcción dinámica (ni `classList`, ni `className =`, ni concatenación de cadenas en
JavaScript o PHP).

| Selector | Qué era | Lo sustituyó | Prueba |
|---|---|---|---|
| `.tools` | barra de trabajo | `.adm-buscar` + `.adm-kpi` (V3) | 0 marcado / 0 dinámico |
| `.search` | buscador (+2 data URI) | `.adm-campo` (V3) | 0 / 0 |
| `.chips` · `.chip` | filtros | rejilla `.adm-kpi` (V3) | 0 / 0 |
| `.row` (+ `.is-out`, `:hover`) | fila de lista | `.adm-orow` (V3) | 0 / 0 |
| `.bar` (+ `.acciones`, `.ver`) | barra fija de acción | `.adm-acciones-fuera` (V2) | 0 / 0 |
| `.count` | contador de la barra | `.adm-acciones-estado` (V2) | 0 / 0 |
| `.tick` | casilla de la fila vieja | `.adm-sw` (V5) | 0 / 0 |

**83 líneas** menos. En cada hueco queda un comentario que dice qué vivía ahí y qué lo
sustituyó: quien busque `.tools` dentro de un año encuentra la respuesta donde la busca.

**Lo que NO se borra, y por qué**, aunque la auditoría lo tenía en la lista:

- **`.card` y `.fld`** — los usa el bloque de salida del **modo demo**, que sólo se dibuja
  cuando el panel no tiene contraseña. No está muerto: está condicionado.
- **`.save` y `.ghost`** — vivos y ahora migrados (punto 2).
- **`.sec-body`, `.prow`, `.nm`, `.num`** — huérfanos también, pero fuera de la lista
  documentada. Borrarlos sería la limpieza indiscriminada que la orden prohíbe. Quedan
  anotados.

### 5. Área táctil de los interruptores

El dibujo no cambia: **40x22, bola 18, recorrido 18**, y el rojo del agotado sigue siendo la
única excepción de color. Lo que cambia es cuándo existe la zona invisible de 44x44:

- `@media (pointer:coarse)` — 44x44 centrada, como hasta ahora.
- `@media (pointer:fine)` — la zona no pasa de 2 px alrededor del dibujo. En un ratón el 44 no
  compra nada, porque el interruptor vive dentro de un `<label>` que ya se pulsa entero
  —rótulo incluido—, y una zona invisible más alta que la fila es justo lo que hace pulsar el
  interruptor del plato de al lado.

**Medido antes de tocarlo, por honestidad:** las filas de Platos van a **56-57 px** de paso y
la zona de 44 se queda en 22 arriba y 22 abajo, así que **no había solape** ni con puntero
fino. `elementFromPoint` en los cuatro bordes de la zona de tres interruptores contiguos
devuelve siempre el mismo interruptor. La regla se escribe para que el problema no aparezca el
día que una fila baje de 44 px, no para arreglar algo roto.

### 6. Un agujero responsive que ninguna ronda había visto

Comprobando Platos **pantalla a pantalla a 390** —no sólo el `scrollWidth` del documento—
aparece esto: la columna de una categoría mide **290 px**, el grupo de acciones suma **224** y
el interruptor sale **9 px fuera de su tarjeta**, que lo recorta con `overflow:hidden`. El
documento no saca scroll, y por eso ninguna ronda anterior lo vio.

La causa: el `@container adm-cat-bento-col` que cierra el caso cerraba a **260 px**, medido en
móvil de 320. Entre 260 y 300 quedaba un hueco. El umbral sube a **300** —medido, no estimado:
a 290 se sale 9 px y a 322 (portátil de 1024) cabe—. Por debajo, la etiqueta cede a 48 y la
fila envuelve, exactamente igual que ya hacía a 320.

### 7. Geometría global, medida

| Componente | Altura | Instancias | Nota |
|---|---|---|---|
| Interruptor | **40x22** | 398 | cero excepciones |
| `.adm-btn` y variantes | **40** | 9 | incluida la tira flotante |
| `.adm-campo` | **40** | 18 | |
| `.adm-campo` de precio en fila | **32** | 191 | igualado a «Destacar» por petición expresa |
| `.adm-nativo input` | **40** | 2 | antes 48; sólo se ve sin JavaScript |
| `.adm-chip` / `.adm-kpi` | 36 / 102 | 4 | tarjeta de filtro, no botón |
| `.adm-destpick` · `.camara` · `.adm-pct-ir` | 32 | 406 | botón de icono compacto |
| `.vp-per button` | 30 | 2 | control segmentado, no botón suelto |
| `.adm-ayuda-b` | 26 | 12 | con halo táctil propio de 44 |
| Etiqueta de destacado | 22 | 2 mitades | |
| «Quitar las fechas» | 15 | 1 | es un enlace subrayado |
| `.login button` | 48 | 1 | recepción, lenguaje antiguo, sin migrar |

`.adm-btn-guardar` **medido: 40**, igual que el resto. La contradicción 40/52 que arrastraba
la auditoría queda cerrada.

### 8. La tira flotante de acciones

Auditada y ya dentro del sistema: contenedor transparente y estático —no fija—, sin borde ni
sombra, relleno `0 var(--s2)`, hueco 13; el estado a 13 px en `--sc-text-2` con
`flex-basis:100%` para que se lea centrado encima; `.adm-btn-ver` y `.adm-btn-guardar` a 40
con radio de control. Idéntica en las cuatro pantallas que la usan. Lo único que le faltaba
era su icono de Guardar, que iba a trazo 1,9 con una ruta a mano: ahora es `check` de Lucide a
2. Sus tokens propios se quedan como están: vive **fuera** de `.card-main` y no hereda los
suyos, por eso se los declara ella.

### 9. Verificación

- **Contraste WCAG**: cero fallos, **siete pantallas x dos temas**, incluyendo la hoja de
  recorte, el toast, los globos de ayuda y la hoja «Más». Más la **recepción**, en los dos
  temas, también cero.
- **Responsive**: 1512, 1024, 768, 560, 390 y 320, las siete pantallas en cada uno. Cero
  desbordamiento, **cero elementos fuera de su tarjeta** —comprobado caja por caja— y cero
  controles deformados. Barra lateral 232, riel 68, barra inferior 65, cabecera 68.
- **Funcional**: buscador (312→3→312), filtros por tarjeta, agotado, precio en línea
  (1,00→8,88→1,00 con confirmación del servidor), selector de etiqueta de destacado (9
  opciones), acordeón, H1, oferta ON/OFF, porcentaje, horario, días, Semanal, sincronización
  Ofertas→Platos sin F5 (1→2→1), **422** del horario invertido y del porcentaje fuera de
  rango, Publicidad, Juego con su podio y su acción destructiva en rojo —no ejecutada—, y
  Analítica con 74 barras y tres cifras tabulares. Todo devuelto a su estado inicial.
- **Consola limpia** en pestaña nueva.

**Una trampa de medición, otra vez:** leer `getComputedStyle` en el mismo tick en que se
cambia la clase de tema devuelve el valor viejo. Dio un falso «1,09:1» en el botón de la
recepción que desapareció recargando. Se anota porque ya es la segunda vez.

### 10. Lo que se ha visto y NO se toca

- **El contador de agotados cuenta casillas, no platos.** Confirmado y **no tocado**: es un
  fallo funcional, va a Operaciones.
- Las cuatro decisiones de producto congeladas siguen congeladas.
- **Marca y Publicidad usan dos patrones distintos para subir imagen** —`.adm-archivo` (campo
  que enseña el fichero elegido) y `.adm-btn-archivo` (botón)—. Los dos miden 40 y los dos son
  del sistema; la diferencia es semántica, no deuda. Anotado.
- La **recepción** (login, activación, cambio de contraseña) sigue en el lenguaje antiguo. No
  entraba en el encargo de V1-V7, pasa contraste en los dos temas y su geometría queda
  explícita desde V7 en vez de heredada.

### V7 — cuatro correcciones de revisión

**2026-09-08**, pedidas tras ver el panel en vivo. Cierran V7.

**1. El contador de agotados cuenta PLATOS, no casillas.** Era el fallo funcional que estaba
aparcado para Operaciones; el propietario pide arreglarlo aquí. `refrescar()` hacía
`pane.querySelectorAll('input[name="agotado[]"]:checked').length`, y un plato puede tener DOS
casillas en la misma pantalla —una en su categoría y otra en la lista de agotados—, que
`marcarHermanas` sincroniza a propósito: marcar un plato ponía «2 platos agotados». Se cuentan
identificadores distintos (`data-plato`); una casilla sin identificador cuenta como suya y no
se pierde del recuento. Verificado: **dos casillas marcadas → 1** en el contador, en el
resumen y en la tira. Los tres recuentos del servidor ya eran correctos (`count($agotados)`,
que está indexado por plato); sólo mentía el del navegador.

**2. La recepción entra en el sistema.** Era la última pantalla en el lenguaje anterior:
tipografía de títulos distinta, campos de 52 y 56 con radio de pastilla y un botón negro de
48. Ahora hereda Arimo de `.card-main`, el campo mide **40** con `--ui-radius-control`, y el
botón es el primario del panel a 40. Lo que la sigue distinguiendo no es la geometría sino la
foto de la puerta, el antetítulo, el nombre grande y el filete; el texto del campo se queda
centrado, que es lo único que de verdad la separaba. El fondo del hueco de la foto pasa de
`--ink` a `--sc-muted-bg`: en claro, un rectángulo negro de 3:2 durante la carga era lo más
oscuro de la pantalla. Contraste: **cero fallos en los dos temas**.

**3. «Ajustar precios» deja de ser un renglón suelto.** El rótulo colgaba solo encima de los
botones, sin nada a la derecha, y se leía como un título de sección que no es —en escritorio
la cabecera del `<details>` ni siquiera se puede pulsar—. Ahora va **delante de los botones,
en la misma línea**. Y se retira el **filete inferior** de la caja: debajo viene el aviso de
agotados, que es su propia caja gris, y después las categorías, que son tarjetas; era una raya
de más.

Dos cosas que costó acertar, y se anotan:

- El `<details>` pasa a `display:flex` sólo por encima de 700, donde está forzado abierto
  siempre. En móvil sigue en bloque y plegando de verdad, con su cabecera de 44 y su galón.
- **Los navegadores nuevos meten el contenido de un `<details>` en `::details-content`**, así
  que el item del flex no era la fila de botones sino ese envoltorio: la fila se quedaba en
  **695 de los 1035 disponibles** y «Cambiar precio manual» caía a una segunda línea con 364
  px libres al lado. Se aplana con `::details-content{display:contents}`; donde el
  pseudo-elemento no existe, la regla se ignora y el resultado ya era el correcto. Medido
  después: caja de **40 px de alto, una sola línea**, fila de 1047.
- `flex:1 1 0` y no `auto`: con `auto` la base es el ancho del contenido y la fila no crecía.

**4. «A mano» pasa a «Cambiar precio manual».** El botón abre otra pantalla —la revisión plato
a plato—, y «A mano» no decía a mano *qué*. 212x40.

Comprobado tras las cuatro: cero desbordamiento y cero elementos fuera de su tarjeta en 1512,
390 y 320, las siete pantallas; contraste **cero fallos, 7 pantallas x 2 temas**, más la
recepción en los dos; y el plegado de móvil sigue funcionando.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

**DETENER PARA REVISIÓN HUMANA. QA FINAL Y CHECKPOINT SON FASE APARTE.**

---

# Corrección posterior a Fase A — revisión humana (8 Sep 2026)

Seis cosas que la auditoría automática dio por buenas y que se vieron mal usando el panel con
las manos. Ninguna cambia arquitectura, contratos ni datos: es presentación y un autoguardado
que faltaba. Las medidas de aquí están tomadas en el navegador, antes y después.

**1. «Ver N platos más» no hacía nada en Ofertas.** El escuchador se enganchaba recorriendo
`document.querySelectorAll('[data-vermas]')` desde el script de Platos, que corre mientras se
parsea la página — las fichas de Ofertas aún no existían. Medido: en Ofertas 6 filas visibles
antes del clic y 6 después, sin `data-abierto` y sin cambiar el rótulo; en Platos, 6 → 11.
Ahora es un delegado en `document`, que además sirve para cualquier ficha que llegue después.

**2. La barra inferior del móvil tapaba el final del contenido.** La barra mide
`6 + 52 + 6 + 1 = 65px` **más `env(safe-area-inset-bottom)`**, y el hueco de abajo del
documento era el número fijo `64px`. Medido: falta **1 px** en un móvil corriente y el inset
entero (unos 34) en uno con indicador de inicio. El hueco pasa a
`calc(65px + env(safe-area-inset-bottom))`, la misma cuenta que la barra. La barra en sí
estaba bien: fija, pegada abajo, sin solapes y sin desborde a 320.

**3. Las cuatro tarjetas de Platos no medían lo mismo.** Medido a 320: las dos de arriba a
**102 px** y las dos de abajo a **119**, porque cada fila del grid se ajustaba a su propio
texto. Con `grid-auto-rows:1fr` las cuatro miden igual en cualquier ancho (comprobado 1512,
768, 390 y 320: 102 px las cuatro). Y por debajo de **480** pasan a una sola columna: a 390 la
tarjeta salía de 155 y a 320 de 120, y descontando relleno, pastilla del icono y hueco quedaban
75 y 40 px para la cifra, el rótulo y la explicación. A todo el ancho miden 320 y 250 y se leen
enteras. Legibilidad por delante de «cuatro en una fila».

**4. «Semanal» no parecía un botón.** Sin filete, mismo alto, mismo radio y mismo cuerpo que un
día, y con el gris que ahí significa «día sin marcar»: se leía como un octavo día apagado.
Ahora lleva filete propio (1 px), un separador que lo saca del grupo, y mide **100** frente a
los **36** de un día. Con los siete puestos —donde el botón no hace nada— se dice con el filete
discontinuo y una marca, no rellenándolo: un botón relleno invita a pulsarlo otra vez. El grupo
de días no cambia de medida ni de estados.

**5. Con la oferta apagada, la configuración se leía como activa.** La insignia decía APAGADA y
justo debajo los siete días estaban pintados con el naranja de «esto está corriendo». La ficha
declara `data-apagada` y, con ella, los días marcados pasan al gris de «guardado» con un anillo
que los sigue distinguiendo de los sueltos. Debajo, una línea que separa lo configurado de lo
activo. Nada se desactiva: la configuración se sigue tocando, que es como se prepara una oferta
antes de encenderla. El atributo se sincroniza desde la respuesta del guardado, igual que ya se
hacía con la insignia y el pie.

**6. Los avisos flotantes salían en mitad de la pantalla.** Con una capa a pantalla completa por
encima de todo: el aviso de un guardado que ya había salido bien tapaba justo lo que se acababa
de tocar. Ahora viven en la esquina inferior derecha, apilados de tres en tres con 10 px, con
entrada de 180 ms, sin transformación con «menos movimiento», y por encima de la barra inferior
y del indicador de inicio. La capa no recibe el puntero. Cuatro variantes con significado
(correcto, error, aviso, dato). Los buenos se van a los **3 s**; los errores **se quedan** —un
error que se borra solo es un error que nadie ha leído, y esa decisión ya estaba tomada.

**Y el contrato de botones, tal como se auditó.** Ofertas y Juego autoguardan cada control:
su «Guardar cambios» se esconde **con JavaScript** y sigue en el documento, con su formulario y
su handler (`guardar_oferta`, `guardar_juego`) intactos, de modo que sin JavaScript vuelve a
verse y sigue siendo el único camino para guardar. Se esconde el BOTÓN, no la tira: el recuento
y «Ver la carta» siguen a la vista. El interruptor del juego pasa a autoguardar reutilizando
`guardar_juego` — no hay endpoint nuevo — con vuelta atrás completa y aviso si el servidor lo
rechaza. Platos, Publicidad, Marca, Analítica y Ajustes no cambian.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

---

# Fase 1: reordenar platos dentro de su categoría (8 Sep 2026)

La primera clave del estado que define **estructura** en vez de decorarla. Hasta hoy
`estado.json` sólo decía cosas *sobre* platos que ya existían —agotado, precio, foto,
etiqueta, oferta—; ahora también dice en qué orden se leen.

**Dónde vive.** `orden: { "<categoryId>": ["dishId", ...] }`, **disperso**: sólo aparecen las
categorías que alguien ha tocado. Una categoría ausente se pinta en el orden compilado, que
es exactamente lo de siempre, así que un `estado.json` anterior a esto se comporta igual sin
migración de ninguna clase. Y cuando un orden vuelve a coincidir con el compilado, la
categoría **se borra** del estado en lugar de guardarse igual: deshacer no deja rastro.

**La regla que lo sostiene todo.** El servidor sólo acepta una **permutación exacta** de los
platos que el catálogo compilado asigna a esa categoría. No es una validación más entre
varias: es la que hace imposible *por construcción* lo que hay que impedir. Un plato de otra
categoría no está en el conjunto esperado; uno repetido rompe el recuento; uno que falte,
también. No hay que acordarse de comprobar cada caso: o es la misma baraja en otro orden, o no
se escribe nada. Los cinco rechazos —ajeno, repetido, corto, largo, categoría inexistente—
devuelven 422 y dejan el disco intacto.

**El número no se toca.** En esta carta los números saltan (del 67 al 69), se desdoblan (24a,
24b, 24c) y algunos están vacíos, y los clientes y los camareros piden **por número**.
Renumerar al mover cambiaría lo que un cliente dice en voz alta y separaría la carta impresa
de la digital. El número es identidad comercial; la posición es otra cosa. Medido en la
prueba: 21, 22, 23 pasa a 22, 21, 23 y cada plato se lleva el suyo.

**En la carta pública no se fabrica marcado.** Son las mismas filas horneadas, movidas:
`appendChild` mueve el nodo, así que recorrer la lista en orden y adjuntar a la columna que
toca deja ese orden. Se reparte mitad y mitad igual que en el build (`renderSub`), o las dos
columnas quedarían cojas. La pasada es **idempotente** —si ya están en su sitio no toca el
DOM—, que es obligatorio: `render()` vuelve a pasar cada treinta segundos. Sin JavaScript se
ve el orden compilado: peor, pero nunca datos equivocados.

**Punteros, no arrastre HTML5.** El arrastre nativo no existe en táctil y esta pantalla se usa
en móvil. Con eventos de puntero el mismo código vale para ratón, dedo y lápiz. El nodo se
mueve durante el gesto en vez de dibujar una línea de destino: lo que se ve durante el
arrastre **es** el resultado. El asa se dibuja a 18 y se toca a 44, y `touch-action:none` evita
que el dedo haga scroll en vez de arrastrar. Con teclado: Enter agarra, flechas mueven, Enter
confirma, Escape deshace, y una región viva canta la posición.

**No se reordena mientras se filtra.** Con media lista escondida, «subir una posición» no
querría decir nada, así que el asa desaparece.

**Ofertas lee el mismo orden.** No cambia de función: es que el restaurante no puede ver la
misma categoría en dos órdenes distintos según la pantalla en la que esté.

**Copia de seguridad, y su límite.** Reordenar quince platos y arrepentirse no se deshace a
mano, así que dispara el mismo mecanismo que ya usaban los precios. **Lo que el botón
«Restaurar» sigue restaurando es sólo los precios**, por la decisión ya tomada de no llevarse
por delante en silencio agotados, destacados y ofertas posteriores a la copia. La copia con el
orden de antes existe y se puede descargar; extender el botón a restaurar el orden es una
decisión aparte, no se ha tomado aquí.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

---

# Las cuatro tarjetas KPI, acabado bento (8 Sep 2026)

Sobre especificación del propietario. Cambia el **acabado**; los cuatro KPI, sus cifras, su
fuente de datos y su papel de filtro no se tocan: siguen siendo los mismos `<button>` con su
`aria-pressed`, su `data-filter` y los mismos identificadores de contador.

**Lo que se movió en el marcado**, y es lo único: el rótulo pasa **delante** de la cifra. Es la
etiqueta del dato, así que va encima, en versalitas pequeñas y apagadas; la cifra queda debajo
con la mayor jerarquía tipográfica de la tarjeta. Medido: rótulo 11 px contra cifra 30 en
escritorio, 9,5 contra 22 en móvil.

**El icono sube a protagonista.** Pastilla de 44 con el trazo a 22 y grosor 1,9, sobre un
degradado del naranja del panel al 18 y al 8 por ciento. En móvil 38 y 20; a 360 px, 36 y 19.
Los cuatro iconos ya eran de la misma familia lineal y comparten grosor — comprobado, un solo
valor de `stroke-width` en los cuatro.

**El naranja es acento, no masa.** Vive en la pastilla del icono; el fondo de la tarjeta no
lleva ni degradado ni naranja. Y es `--sc-primary`, el que ya tiene el panel: dos naranjas
distintos a diez centímetros se ven.

**En móvil se quedan DOS columnas.** Cuatro tarjetas apiladas empujaban la lista de platos
fuera de la primera pantalla, que es justo lo contrario de para lo que sirven. Para que quepan,
la tarjeta baja a 88 y la explicación se retira: a 122–156 px de ancho salía cortada y no
explicaba nada. Medido, el bloque entero: **184 px a 390 y 183 a 320**, por debajo de los 200
que pedía la especificación. Y a 320 se aprieta el hueco, el relleno y el icono antes que
romper la rejilla.

**El corte de las cuatro columnas no es 980.** La especificación lo daba para una rejilla a
pantalla completa, y ésta vive dentro de la columna de contenido con 232 px de barra lateral
por delante y 34+34 de relleno. Despejando, la fila baja de 980 por debajo de **1280** de
ventana. Con el corte a 980 —medido— a 1024 salían cuatro tarjetas de 161 px, con el rótulo
envolviendo y la tarjeta estirada a 120 en vez de 108.

**Profundidad casi imperceptible:** una línea de luz de un 3 % arriba y una sombra ancha y
suave. Ni sombra dura, ni halo naranja fuerte, ni tarjeta flotando. Y el hover sólo donde hay
puntero: en táctil se quedaría pegado.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

## Corrección sobre lo anterior: manda la captura, no el texto

El propietario mandó primero una especificación escrita (icono a la izquierda, tarjeta
horizontal de 44 px, sin filete) y después una captura con otra composición. **Vale la
captura**, que es lo último y lo más concreto: rótulo arriba a la izquierda, pastilla del
icono a la derecha, cifra grande debajo, un filete y un pie corto. La tarjeta elegida **no se
rellena**: se queda blanca y lo dicen el filete naranja y la pastilla en sólido. Rellenarla
apagaba la cifra, que es lo que se viene a leer.

Los pies se acortan a los de la captura: «Carta completa», «Se restablecen a las 6:00», «Con
etiqueta en la carta», «Gestionar desde Ofertas».

Medido: tarjeta de 136 px en escritorio y **83 en móvil**, con el bloque entero en **175 px** a
390 y **164** a 320 — por debajo del tope de 200. El pie y su filete se retiran por debajo de
640, donde salían cortados.

Y una trampa que costó ver: `.adm-chip[aria-pressed="true"]`, del que la tarjeta hereda,
rellena el chip de gris. Sin decir el fondo a mano, la tarjeta elegida salía **gris** en vez de
blanca.

## El arrastre, y por qué no funcionaba

Se sujetaba el puntero al asa con `setPointerCapture`, y **el asa viaja dentro de la fila**: en
cuanto la fila cambia de sitio en el DOM el navegador suelta la captura. La traza lo decía
entero — `pointerdown`, `gotpointercapture`, tres movimientos, `lostpointercapture` — y a
partir de ahí no llegaba un movimiento más. Con ratón no se podía reordenar nada. Con teclado
sí, y por eso las pruebas lo daban por bueno: **el agujero era no haber probado nunca el
arrastre de verdad**. Ahora los movimientos se escuchan en el documento, que no se mueve nunca.

Segundo fallo del mismo gesto: la fila de destino se buscaba con `elementFromPoint`, y bastaba
arrastrar cerca del borde superior para que el punto cayera en la cabecera fija —esos 68 px— y
el destino se perdiera. Ahora se calcula por geometría dentro de la propia ficha: la columna
cuyo carril horizontal contiene el puntero, y dentro de ella la fila cuya banda vertical lo
contiene, o la más cercana. No puede devolver una fila de otra categoría porque sólo mira las
de esa ficha.

Y el asa deja de ser invisible en reposo. Estaba a `opacity:0` y sólo aparecía al pasar el
puntero: con 312 filas eso evitaba 312 manchas, pero un asa que no se ve no es un asa clara.

## Rectificación: los números SÍ se reparten por posición

Lo anterior de este documento decía que el número no se toca nunca. **Ya no es así**, y la
decisión la tomó el propietario el 8 de septiembre de 2026 con la consecuencia delante.

**La regla.** Se reparte la **misma baraja** de números que ya tiene la categoría, en su orden
natural, a las filas en el orden en que se ven. No se inventa ningún número y no se pierde
ninguno: es una permutación, igual que el orden. Los platos sin número se quedan sin número —
los números sólo se reparten entre las filas que ya tenían uno. Veintitrés de las cuarenta
categorías no numeran nada y una mezcla numerados con sin numerar; así ninguna de las dos se
rompe.

**Por qué es exacto.** Comprobado sobre la carta real: las cuarenta categorías vienen numeradas
de menor a mayor, así que «orden natural» y «orden compilado» son la misma cosa. Y como el
conjunto no cambia, repartirlo dos veces da el mismo resultado: sigue siendo idempotente, que
es lo que necesita un repintado que pasa cada treinta segundos.

**Lo que esto cambia en la sala, dicho a propósito.** Cambia **qué plato es «el 2»**. Un cliente
que pida por número recibe otro plato, y una carta impresa deja de coincidir con la digital. Se
planteó como la primera de tres opciones, con esa consecuencia escrita, y se eligió.

**Dónde se aplica.** En las dos caras y con la misma regla: el panel lo hace al pintar la página
(PHP) **y en caliente** al mover, porque si no el número nuevo no aparecía hasta recargar; y la
carta pública lo hace en los **dos** sitios donde se pinta el número, la columna de escritorio y
la chapa de delante del nombre en móvil.

Ningún dato cambia de sitio: el número sigue viviendo en `carta.json` y nadie lo reescribe. Lo
que se reparte es lo que se **enseña**, derivado del orden. La identidad de un plato sigue
siendo su `dishId`, que es por donde van su foto, su precio y su agotado.

## Del arrastre a las flechas

Se cambia por petición del propietario: el mismo control que el panel ya usa para reordenar
las fotos de portada. Dos flechas por fila, apagadas en los extremos, dibujadas a 20×28 y
tocables a 44×44.

El arrastre llegó a funcionar, pero costó dos fallos llegar ahí —la captura del puntero se
perdía al mover el nodo, y la fila de destino se perdía bajo la cabecera fija— y el argumento
del propietario es el bueno: es el mismo gesto en dos sitios del mismo panel, funciona igual
con ratón, dedo y teclado, y no hay nada que se pueda soltar a medias. El precio, dicho: mover
un plato quince puestos son quince pulsaciones.

**Una ráfaga, un guardado.** Bajar un plato cinco puestos son cinco clics; mandar cinco
peticiones sería castigar a quien usa bien la herramienta. Se espera medio segundo desde la
última pulsación y se manda el orden final. Si el servidor rechaza, se vuelve al orden de antes
de la ráfaga entera, no a medio camino.

**El foco se queda en la flecha pulsada** aunque la fila cambie de columna: sin eso, pulsar
cinco veces seguidas con teclado es imposible. Y la fila movida se enciende un momento, porque
con 312 filas iguales si no no se sabe cuál se ha movido.

Se retira todo el código del arrastre: nada de captura de puntero, nada de buscar la fila bajo
el cursor. Menos superficie, y la que queda es la que ya estaba probada en otra pantalla.

---

# Retirar un plato de la carta (8 Sep 2026)

**No es un borrado, y la diferencia es todo.** El panel no sabe escribir `carta.json` —la
estructura se compila— así que aquí no se puede borrar un plato: lo que se hace es **dejar de
servirlo**. Una clave nueva en el estado, `retirados: [dishId, ...]`, y el plato desaparece de
la carta conservando intactas su foto, su precio y su etiqueta, que van todas por identificador.
Devolverlo lo restaura entero.

Que sea reversible no es un detalle: es lo único responsable en algo que se pulsa por error. Y
responde al caso real del negocio, que es «esto no está esta temporada», no «esto no ha existido
nunca». Un agotado dice «hoy no queda»; esto dice «ya no lo servimos».

**No se reutiliza la clave `hidden`** que el estado arrastra. Viene del escaparate antiguo, no
la lee nadie, y puede traer valores viejos de otra cosa: heredar su contenido sería retirar
platos que nadie mandó retirar.

**La única regla dura: una categoría no se puede quedar vacía.** Saldría en la carta como un
título con nada debajo, y arreglarlo después es peor que impedirlo ahora. Mismo criterio que el
último día de una oferta: 422 y no se escribe nada.

**En la carta pública sale gratis lo que más costaba.** El plato retirado se oculta con el
atributo `hidden`, que es exactamente lo que el buscador de la carta ya mira para saltarse una
fila —lo hace en los cinco sitios donde recorre su índice—, así que desaparece también de la
búsqueda y de los contadores de los chips sin tocar ni una línea de esa parte. Y como se oculta
antes de repartir las dos columnas, no deja hueco: 311 filas servidas de 312, sin ningún grupo
vacío.

**El número.** Un plato retirado sale del reparto y se queda sin número, y los que quedan se
renumeran entre ellos. Si entrara, el panel y la carta dirían números distintos, porque la carta
sólo reparte entre lo que se ve.

**En el panel la fila se queda.** Apagada, con el nombre tachado, sin número y con las flechas
escondidas —su sitio da igual si no está en la carta—, pero visible: hay que poder devolverla, y
su botón de devolver se ve siempre. Confirmación al retirar; ninguna al devolver, que es la que
deshace.

**Ofertas deja de verlo.** Un plato que no está en la carta no puede entrar en una oferta: se
cae de esa lista igual que los que no tienen precio, y una categoría que se quede sin ninguno
tampoco aparece allí.

---

# Renombrar categorías, idioma a idioma (8 Sep 2026)

**Un campo por idioma, no uno solo**, y es la decisión que da forma a todo lo demás. La carta
habla tres idiomas y el rótulo de la categoría sale de los diccionarios: con un único texto, la
categoría renombrada dejaría de traducirse y un alemán vería español. Los idiomas los publica
ahora el build en `CLIENTE_IDIOMAS` — no se adivinan en el panel, o un cliente con dos vería
tres campos y uno con cuatro se quedaría sin el último.

**El idioma base es obligatorio; los demás pueden ir vacíos** y entonces caen al nombre
compilado. Lo que no se hace nunca es rellenarlos con el texto del base: media carta traducida
y media no parece un fallo, y una sin traducir no lo parece.

**Disperso, como el orden.** Sólo aparecen las categorías que alguien ha tocado, y escribir de
nuevo los nombres de la carta borra la entrada en vez de guardarla igual.

**Las cuatro categorías sin rótulo propio no se pueden renombrar**, y el panel no ofrece el
control. En la carta esas cuatro enseñan el rótulo de su PESTAÑA, que comparten con otros
grupos: cambiarlo ahí cambiaría la pestaña entera. Es mejor no ofrecer un cambio que no se
puede cumplir que ofrecerlo y explicarlo después.

**En la carta, el mismo mecanismo que ya usa el rótulo de la marca.** Se apuntan una vez los
nombres compilados —antes de que nada los toque, para poder volver a ellos— y después se
reescriben los `data-<idioma>` del `<span class="i18n">` del título. El selector de idioma lee
justo esos atributos, así que la categoría renombrada sigue traduciéndose sola.

Dos trampas que costaron encontrarlas y conviene no repetir:

- **`IDIOMAS` se asigna setecientas líneas más abajo que `render()`.** Usarla aquí daba un
  `undefined` y tiraba el repintado entero, con lo que también se caían el orden y los
  retirados. Los idiomas salen ahora del propio elemento: el título ya trae un `data-<idioma>`
  por cada uno.
- **El idioma base no viaja en un `data-`: es el propio texto del span.** Sin contemplarlo, el
  nombre nuevo en el idioma base no se escribía en ningún sitio y el título se quedaba en
  blanco al volver a ese idioma.

**Lo que el build publica ahora, y es nuevo:** `CLIENTE_IDIOMAS` y `CLIENTE_IDIOMA_BASE` en
`cliente.php`, y en cada plato de `platos.json` el rótulo de su grupo en **todos** los idiomas
(`grupoI18n`) más si ese grupo tiene rótulo propio (`grupoPropio`). `group_es` y `group_en` se
quedan donde estaban por compatibilidad.

## Dos remates del renombrado y de los números

**La hoja del nombre no la puede recortar la tarjeta.** `.adm-cat-bento` lleva `overflow:hidden`
—lo necesita para sus esquinas redondeadas— y una hoja absoluta dentro salía cortada: el
último idioma quedaba partido por el borde. Pasa a `position:fixed`, colocada por el script
debajo del lápiz, volteada arriba si no cabe, y **acotada a la pantalla en los dos sentidos**.
Se cierra al pulsar fuera y con Escape, y cerrar sin guardar devuelve los campos a lo que
había. **Un solo botón Guardar**, no dos: el contrato de botones de este panel dice que los
interruptores autoguardan y el texto libre conserva su Guardar, porque un nombre a medio
escribir no puede llegar a la carta.

**Los números compactan sin huecos.** Decisión del propietario del 8 de septiembre de 2026,
tomada con la consecuencia delante: retirar el 03 de una categoría 01..05 deja **01, 02, 03,
04**, no 01, 02, 04, 05. Mientras ese plato esté retirado, el número más alto de la categoría
deja de aparecer, y vuelve al devolverlo. Es lo coherente con repartir los números por
posición: si el número es la posición, un salto se lee como un error de la carta. La baraja
sale de la categoría **entera**, retirados incluidos; el reparto, sólo entre los que se sirven.

## Y una lección sobre las esperas de la batería

Seis comprobaciones de Ofertas empezaron a fallar, y **no era una regresión**: cada pasada
fallaba con números distintos. Eran esperas de reloj —«espera 500 ms y mira»— que se quedaron
cortas en cuanto la página engordó: 312 filas ganaron dos flechas y un botón de retirar, y el
repintado parsea la respuesta entera con `DOMParser`. Se cambian por esperas a la CONDICIÓN
(`esperarA`), que es lo que había que haber hecho desde el principio: si la condición no llega,
el assert falla igual y con el último valor leído.

---

# Renombrar las secciones de la carta (8 Sep 2026)

Las **pestañas** —lo que el comensal ve como categoría principal arriba— pasan a poder
renombrarse, con un campo por idioma, igual que las categorías.

**Con identidad propia, y esa fue la decisión.** Las pestañas no tenían id: sólo su texto y su
icono. Guardar el cambio bajo su rótulo habría sido atarlo a lo único que se sabe que va a
cambiar — el día que alguien renombre esa pestaña en `carta.json`, el renombrado se queda
huérfano sin avisar. Se acuña un **`pestanaId`** en `importar.mjs`, con la misma maquinaria y
el mismo formato que ya acuñan `dishId` y `categoryId`, y `carta.json` se reescribe con los
trece. Un id que ya existe no se toca nunca.

**El rótulo sale en dos sitios y los dos cambian juntos:** el botón de la barra de arriba y la
entrada de la lista de secciones del móvil.

**Se creyó que había un tercero y la prueba lo desmontó.** Cuatro de los cuarenta grupos no
tienen rótulo propio, y se dio por hecho que enseñaban el de su pestaña. No es así: **no tienen
título ninguno**, sus platos cuelgan directamente de la sección. El marcador
`data-titulo-prestado` se queda porque dice algo cierto y útil —este grupo se pinta sin
cabecera— pero no hay nada que reescribir en él. Dos mensajes del panel decían lo contrario y
se han corregido, y hay una prueba que fija el hecho para que nadie vuelva a buscar un rótulo
que no existe.

**En el panel, una tira compacta**, no una pantalla nueva: los trece rótulos que ya existen,
puestos donde se pueden cambiar, y cada uno abre la misma hoja de idiomas que las categorías,
porque es el mismo problema. Ruedan en horizontal antes que envolver y empujar la lista de
platos fuera de la primera pantalla.

**Lo que el build publica ahora, y es nuevo:** `pestanaId` en `carta.json`, `data-tabid` en la
barra, en la hoja del móvil y en cada grupo, `data-titulo-prestado` en los grupos sin cabecera,
y en cada plato de `platos.json` su `tabId` con el rótulo de la sección en todos los idiomas
(`tabI18n`).

## Y otra lección sobre las esperas

Volvieron a fallar cuatro comprobaciones de Ofertas, y otra vez no era una regresión. Dos
causas, las dos de la misma familia: esperas de reloj donde hacía falta esperar a una
condición, y —la que costó ver— **un clic contra un botón deshabilitado**. Mientras un guardado
de días viaja, `guardarDias()` deja las siete casillas y «Semanal» apagados; un clic ahí no
hace nada y se pierde sin ruido, así que la prueba contaba una petición donde había dos clics.
Se espera a que el control vuelva a estar vivo antes de pulsarlo.

Y `abrirTodo()`, el ayudante que destapa lo plegado, abría **también** las treinta y seis hojas
de renombrar: treinta y seis ventanas flotantes apiladas fuera de la pantalla, que la
comprobación responsive denunciaba con razón. Ahora abre todo menos ésas: destapar contenido
plegado es su trabajo, abrir ventanas no.

## La tira de secciones: página, no rueda (9 Sep 2026)

Tres defectos que el propietario señaló en la misma frase —«esto no está alineado, y evita ese
corte bruto»— y que resultaron ser dos causas.

**El rótulo «Secciones de la carta» se va.** Trece chips con su nombre dentro no necesitan que
nadie diga lo que son, y ese rótulo se comía la mitad del ancho útil de la tira.

**Se pagina en vez de rodar.** Un carrusel deja siempre una sección cortada por el borde, y un
rótulo partido por la mitad se lee como un fallo, no como «hay más». Ahora se enseñan sólo las
que caben **enteras** desde la primera de la página, las demás se apagan, y los dos manejadores
pasan de página. De paso desaparece la barra de desplazamiento horizontal, que era la que metía
36 px de alto de más. Medido a 1512 / 1024 / 768 / 390 px: **cero secciones cortadas** en las
tres páginas de cada ancho, y una sola visible a 390 px, que es el caso límite aceptado —una
tira vacía sería peor que una sección cortada.

**El desnivel de 6 px era una colisión de nombres, no un problema de alineación.** El chip
nuevo se llamaba `.adm-seccion`, y ese nombre ya lo tenía el rótulo que separa las fichas del
superadministrador: `margin:var(--space-6) 0 var(--space-3)` —24 px arriba, 12 abajo— más un
`::after` que estira una línea. De ahí salían los 66 px de alto de la tira y el centro del chip
en 500 contra el del manejador en 494. Se renombra a **`.adm-pestana`**, y con eso se caen las
dos muletas que se habían puesto para tapar el síntoma (`height:fit-content` en la tira y
`align-self:center` en cada chip). Medido después: tira 30 px, tarjeta 48 px (antes 66 y 84),
**desnivel 0**.

**Y una circularidad en el paginador.** Se medía cuántas caben con los manejadores todavía
ocultos, salían nueve, y al encenderlos la tira se estrechaba 72 px y la última se quedaba
cortada — el corte era exactamente el que se quería evitar. Ahora se decide **primero** si los
manejadores hacen falta —comparando el ancho total de los chips con el de la tira— y sólo
después se mide cuántas caben.

---

# La confirmación deja de ser del navegador (9 Sep 2026)

El propietario, viendo el cuadro de retirar un plato: «el toast no parece del sistema, y este
sí debe cargar al centro de pantalla». Tenía razón dos veces. `confirm()` pinta el cuadro del
**navegador**: sale pegado a la barra de direcciones, arriba y a la izquierda, con la
tipografía del sistema operativo y un «127.0.0.1 dice» por título. Ni se parece a esta
pantalla ni aparece donde está mirando quien acaba de pulsar.

**Se cambian los diez, no sólo el que se vio.** Uno solo distinto habría sido peor que
ninguno: la pregunta de retirar un plato con una cara y la de vaciar el marcador con otra.
En el fichero ya no queda ningún `confirm()`.

**Cuelga del BOTÓN, no del formulario**, y eso no es un detalle de estilo. El botón que
retira un plato lleva su `name` y su `value` (`retirar_plato=d_…`), y ese par sólo viaja si
el envío lo dispara ese botón: reenviar el formulario a mano lo perdería. Así que se para el
clic, se pregunta, y si dicen que sí se vuelve a pulsar el mismo botón con un pestillo puesto.
De respaldo se vigila también el `submit`, por si alguien manda el formulario con Enter.

**El foco arranca en Cancelar cuando lo que se pregunta quita algo.** Un Enter de más no puede
ser lo que retire un plato.

**Sin JavaScript no se pierde nada**, y conviene decirlo porque parece que sí: el `confirm()`
vivía en un `onsubmit`, que también era JavaScript. Sin JS no se preguntaba antes y no se
pregunta ahora.

Un tropiezo que costó una pasada: la capa vive al final del documento, **después** del script
que la usa, así que buscarla al arrancar devolvía `null` y el módulo se rendía sin enganchar
nada — el botón de retirar mandaba el formulario sin preguntar. Se busca la primera vez que
hace falta.

En la batería, seis comprobaciones leían `pagina.registro.dialogos`, que es donde Playwright
apunta los cuadros nativos. Ahora pasan por `confirmarEnPanel()` y, además, **comprueban que
no queda ni un diálogo nativo**: antes se verificaba que se preguntaba; ahora, dónde.

---

# Las cuatro categorías sin lápiz (9 Sep 2026)

El propietario: «hay categorías que no tienen el poder cambiar nombre». No era que faltara
aplicar nada. Cuatro de las cuarenta —Salads, Sizzlers, House Specialities, Kids Menu— no
tienen `subtitulo` en `carta.json`: **no tienen nombre propio**. Lo que se ve en su cabecera
es el rótulo de su *sección*.

Y de paso salía **un segundo defecto que nadie había pedido mirar**: esas cuatro se pintaban
desde el diccionario ESPAÑOL (`$catsEs`) y las otras treinta y seis desde el idioma base
(inglés), así que en la misma columna convivían «Appetizers» y «Ensaladas». Ahora las cuarenta
salen de una sola función, `rotulo_categoria()`, y en el mismo idioma — el que ve el comensal.

**Las cuatro se pueden renombrar**, por la puerta que les corresponde: su lápiz manda
`pestana_nombre` en vez de `categoria_nombre`, y la nota del formulario dice lo único que no
es obvio — que eso cambia la sección entera. La respuesta a «¿por qué éstas no?» no podía ser
«no se puede», porque sí se puede: por otra puerta.

**El contador y los botones se traen al lado del nombre.** El contador llevaba
`margin-left:auto` y se iba al borde derecho de la ficha; con la ficha a todo el ancho eso son
1010 px entre un título y el número que lo cuenta. Medido después: 12 px.

---

# Dar de alta un plato (9 Sep 2026)

Lo primero que este panel **añade** a la carta en vez de taparla. Todo lo demás que escribe
—precio, agotado, foto, orden, retirados, nombres— es una capa encima de algo que ya existe en
`carta.json`; esto existe sólo en `estado.json`.

**El identificador se acuña con el MISMO formato que los de la carta** (`d_` + diez hex), y no
con uno propio tipo `nuevo_1`. Es la decisión que ahorra el resto del trabajo: el plato nuevo
entra de serie en todo lo que ya funciona por `dishId` —foto, precio, agotado, destacado,
oferta, orden, retirar— sin una sola línea de «y si es de los nuevos». Un formato aparte habría
obligado a tocar las ocho.

**Un campo por idioma**, como al renombrar una categoría, y por el mismo motivo: la carta habla
tres y guardar un solo texto dejaría al alemán viendo inglés. La diferencia es qué pasa con un
idioma vacío: al renombrar cae al **compilado**, aquí cae al **base**, porque debajo no hay
nada.

**El precio es obligatorio.** Un plato sin precio en la carta es un «Incluido», y el panel no
deja tocar el precio de ésos: nacer sin precio sería nacer sin poder ponérselo nunca.

**El número es opcional y no se inventa.** El número de plato es identidad comercial del
restaurante (decisión del 8 Sep 2026): o lo escribe, o el plato sale sin número. Si lo escribe,
no puede chocar con ninguno de la carta, y entra en la baraja de su categoría como uno más —
`renumerar_por_posicion()` lo reparte igual que a los demás, sin una línea de excepción.

**Se borra, no se retira.** Retirar existe porque un plato de la carta compilada volvería en la
siguiente compilación y lo único que se puede hacer con él es dejar de servirlo. Éste no existe
en ningún otro sitio: esconderlo para siempre sería dejar basura en el estado con cara de
plato. Borrarlo se lleva por delante todo lo indexado por su identificador.

**El catálogo se arma dos veces por petición.** `catalogo()` junta `platos.json` con
`estado.nuevos`; se llama al entrar y otra vez después de los manejadores, porque un plato
recién creado tiene que salir en la pantalla que lo crea, no en la siguiente recarga.

## Y en la carta pública: se clona una fila, no se escribe una

La decisión que importa de todo el bloque. La fila de un plato tiene columna de número, chapa
de móvil, hueco de etiquetas, aviso de foto, marcas de dieta y de alérgenos, y todo eso lo
decide el build según el cliente. Una plantilla escrita a mano en el runtime sería una copia
que se queda vieja el día que cambie el build, y nadie se entera. **El clon, por definición, no
puede quedarse viejo.** Se clona una fila de su misma categoría, se le quita lo que era del
plato copiado —el nombre, las marcas, la clave vieja— y se le pone lo suyo.

`data-legacy` se borra del clon y esto no es cosmética: `render()` cae a la clave vieja cuando
no encuentra el `dishId`, así que dejarla puesta le habría dado al plato nuevo el precio y el
agotado del plato del que se copió.

`vid` —el identificador corto del contador de consultas— lo calcula el PHP y lo guarda. Sacar
un sha1 en el navegador es asíncrono y no hacía falta pasar por ahí.

**Dos cosas que aparecieron al probar y que no estaban en el plan:**

- **El buscador no lo encontraba.** Arma su índice recorriendo el DOM una vez al cargar, y la
  fila nueva no estaba. Ahora el índice se puede rearmar y `aplicarNuevos()` avisa cuando crea
  filas. Un plato que se ve en la carta pero no se encuentra al buscarlo se lee como que no
  existe.
- **`renumerar()` del runtime repartía número a las filas SIN número.** El panel ya se las
  saltaba (`renumerar_por_posicion`) y el runtime no: una fila sin número pedía sitio en una
  baraja que no la contaba y el reparto salía corrido de uno. Se ve en cuanto alguien da de
  alta un plato sin número, que es una respuesta perfectamente válida.

Las columnas del grupo se reparten otra vez sólo donde ha entrado algo: dejar la fila nueva
pegada al final de la primera columna dejaría el grupo cojo.

---

# Crear una categoría principal (9 Sep 2026)

Una sección de la carta —lo que el comensal ve como pestaña arriba— creada desde el panel.

**Nace con DOS identificadores, no con uno.** Una sección no puede tener platos colgando
directamente: los platos viven en categorías, y las categorías dentro de una sección. Así que
se acuña también su categoría, en el mismo acto. Dejar la sección sin categoría habría sido
crear algo donde no se puede poner nada — y el desplegable del alta de plato la habría ofrecido
vacía.

**El nombre vive en `secciones`, no en `pestanas`.** `pestanas` es un *override*: dice «esta
sección de la carta se llama distinto». Aquí no hay nada debajo que corregir, así que el nombre
es el dato, no la corrección. Renombrarla después sí escribe en `pestanas`, encima de éste, y
así el mecanismo de renombrar sigue siendo uno solo — la misma puerta para las trece de la
carta y para las creadas aquí.

**No se admiten dos con el mismo nombre.** No es un error del sistema, es un problema del
comensal: dos pestañas con el mismo rótulo arriba no se distinguen.

**Se borra sólo si está vacía**, y sólo si nació aquí. Una de la carta compilada volvería en la
siguiente compilación; una con platos dentro se los llevaría de rebote, y eso es una decisión
que no se toma escondida dentro de otra. El mensaje dice cuántos hay.

**El `+` va al final de la tira, fuera de la parte que pagina.** Si entrara en ella, la página
que le tocara lo escondería: una acción que aparece y desaparece según por dónde vaya la tira
no se encuentra cuando hace falta. Y va detrás de los dos manejadores, no entre ellos, o la
fila se leería «pasa página / crea / pasa página».

## Dos sitios donde el panel daba por hecho que todo sale de un plato

El catálogo del panel se arma **recorriendo platos**. Una sección recién creada no tiene
ninguno, así que dos cosas fallaban en silencio y las dos se vieron al probarlas de punta a
punta:

- **No se le podía dar el primer plato.** El alta comprobaba que la categoría existiera
  buscándola entre los platos: la de una sección vacía no estaba. Se habría creado una sección
  a la que no se puede llegar.
- **No se podía renombrar la que se acababa de crear**, por lo mismo. Ahora sus nombres de
  partida salen del propio estado.

## Y en la carta: tres sitios, y los tres clonados

Una sección es el botón de la barra de arriba, la entrada de la hoja del móvil y el panel con
sus platos. Los tres se fabrican clonando los que ya hay, por el mismo motivo que la fila de un
plato: el marcado lo decide el build y una copia escrita a mano en el runtime se queda vieja sin
que nadie se entere.

Del panel clonado se conserva **sólo el esqueleto**: un grupo, su título y sus dos columnas,
vacías. Notas del grupo, escalas de picante y avisos eran de la sección de la que se copió y
aquí no dicen nada cierto.

## Un fallo del cuadro de confirmación que sólo salió con la batería entera

Ocho comprobaciones cayeron a la vez con la misma causa, y el síntoma era desconcertante: la
pregunta salía con el texto correcto y, al aceptar, no pasaba nada. El pestillo que deja pasar
el segundo clic se quitaba **dentro** del propio clic, y el vigilante del `submit` —que se
dispara en esa misma tanda— ya no lo veía: volvía a preguntar, y el formulario no se mandaba
nunca. Ahora se quita después. Una prueba que sólo mire el texto de la pregunta no ve esto: hay
que mirar el disco.

---

# Ofertas, precios y la cabecera (9 Sep 2026)

## Ofertas: el estado se decía tres veces

La insignia de la cabecera, el texto del interruptor y la frase del pie decían lo mismo. Y de
las tres, sólo la insignia distingue **APAGADA** de **PROGRAMADA** de **CORRIENDO**, que es lo
único que hay que saber. Manda ella; el interruptor —que es la acción, no el estado— sube a su
lado y se queda sin rótulo. Se va con él la caja gris de 56 px que existía para repetir una
palabra. La nota de los días decía otra vez lo mismo y además estiraba su columna 21 px por
encima de las otras dos, dejando la fila coja. Medido: la ficha pasa de **293 a 208 px** y la
primera categoría de y=583 a **y=448**.

## El horario no estaba mal: el mensaje sí

«Parece no coger la hora indicada.» Guardaba bien —12:00 a 14:00 son 720 y 840 en disco— pero
el aviso contestaba «12:00 a 13:59»: restaba un minuto porque el final es **exclusivo**. Es
correcto y es como se habla, pero decirle 13:59 a quien acaba de escribir 14:00 parece que el
sistema no lo ha cogido. Ahora el aviso repite lo que escribió, y lo que hace el final
exclusivo lo explica **una vez** la frase de la ficha, que es donde toca.

## «Platos sueltos» no tenía contenido

Era la barra de trabajo de la lista de abajo —buscar y filtrar— ocupando tres pisos y 124 px
para dos controles. En una línea: **74 px**.

## Ajustar precios se muda a su propia pantalla

Vivía empotrado arriba de Platos, empujando la lista hacia abajo en cada visita para una acción
que se hace de vez en cuando. Y su paso 2, la revisión, **secuestraba Platos entera**: mientras
había una propuesta sin publicar no se podía ni mirar un plato. Ahora son ocho pantallas y los
dos pasos viven juntos en la suya. Ni un handler, ni un `name`, ni un formulario cambian.

**Y ahí salió un fallo propio de la mudanza:** la rejilla de un pane tiene **seis columnas**, y
una ficha que no declara cuántas ocupa cae en una sexta parte. La de precios medía 177 px sobre
un tablero de 1168 y sus seis controles se apilaban en columna.

## «Ver la carta» estaba cinco veces

Una por tira de acción, y en cada pantalla había que bajar a buscarlo. No es la acción de
ninguna pantalla: es la salida a la carta, y es la misma desde todas. Una sola, arriba, junto a
«Añadir plato».

## La cabecera se queda con la fecha

El rótulo de la pantalla lo dice ya la barra lateral con su destino encendido: repetirlo en la
cabecera era decir dos veces lo mismo a dos dedos de distancia. Se queda en el documento —un
lector de pantalla necesita saber dónde está— y fuera de la vista. El filete de abajo se retira:
separaba una cabecera que ya se separa sola (fondo translúcido y desenfoque) de un tablero que
empieza con sus propias fichas enmarcadas.

## La barra lateral se pliega

232 px de barra son 232 px que no son carta, y quien ya sabe dónde está cada cosa no necesita
verla siempre. Se hace **con el token del ancho**, no moviendo cajas: el relleno del cuerpo y el
borde izquierdo de la cabecera ya salen de `--sc-sidebar-w`. La elección se recuerda, y la clase
se pone arriba del documento junto al tema — si se pusiera al final, la barra aparecería y
desaparecería en cada carga.

## La sesión, en cuenta atrás

«Se cierra en 30 min» era un número fijo que decía lo mismo al entrar que veintinueve minutos
después. Una barra que baja dice lo que un número fijo no puede: cuánto queda **ahora**, y en
rojo los últimos cinco minutos.

**Y una cosa que sin pensarla habría mentido:** el servidor cierra la sesión tras 30 minutos
**sin actividad**, y los autoguardados del panel van por `fetch` sin recargar. Una barra que
sólo contara desde la carga habría llegado a cero mientras el restaurante trabaja. Se envuelve
`fetch` una vez para reiniciar la cuenta con cada petición que sale de la página.

## Cambiar un plato de la carta

Se podía crear un plato y borrarlo, pero no corregirle una tilde. El lápiz de cada fila abre
**la misma hoja** que el alta, en modo cambio: mismos campos, otro título, otro botón y otra
puerta (`plato_editar`).

Tres decisiones que no se ven pero sostienen el resto:

- **`estado.editados` es disperso.** Guarda sólo lo que difiere del texto compilado, idioma a
  idioma. Vaciar un campo no guarda vacío: **borra** ese cambio y el plato vuelve a decir lo que
  dice la carta. Sin esa regla, editar el español congelaba el inglés y el alemán en el texto
  del día que se editó, y la siguiente compilación de la carta no se vería nunca.
- **`platos.json` publica `nombreI18n` y `descI18n`.** El panel recibía el nombre sólo en dos
  idiomas y la descripción en ninguno: se podía enseñar el plato pero no corregirlo — *nadie
  puede corregir un texto que no ve*. La hoja se abre **rellena con lo que el comensal está
  leyendo hoy**.
- **Los valores los trae un endpoint (`plato_datos`), no el marcado.** Nombre y descripción en
  tres idiomas por fila serían unos cientos de kilobytes en cada carga del panel para rellenar
  un formulario que se abre de uno en uno.

Lo que **no** hace: mover un plato de categoría. Eso toca el orden de dos categorías y la
numeración entera; el desplegable se enseña y se bloquea hasta que esa decisión se tome.

Y una trampa ya conocida que volvió a morder: `h3 .i18n` **también** casa con la etiqueta de
agotado. Reescribir el nombre con ese selector renombraba «Sold out today». Es `h3 > .i18n`.

## Los catorce alérgenos, con su dibujo

Los del anexo II del Reglamento (UE) 1169/2011, los catorce, siempre y en el orden del
reglamento — no alfabético: es el que tienen las cartas y las fichas técnicas de toda la vida.
Ni buscador ni desplegable: caben, y quien cocina los reconoce de un vistazo.

**Queda dicho lo que esto no arregla:** `cliente.mjs` de Tinge declara que *«Tinge no declara
alérgenos plato a plato en carta.json»*. Los iconos saldrán en la carta sólo en los platos que
alguien toque desde el panel; los otros 312 no enseñarán ninguno, y un comensal puede leer eso
como «no lleva». Se avisó y se hizo igual, que es lo que se pidió.

## La hoja del plato ya no se sale de la pantalla

Medía 949 px de alto en una columna, y después 857 en dos: seguía sin caber en un portátil, y
para llegar al botón de guardar había que desplazarla por dentro. Tres cambios, en este orden
de importancia:

1. **Un idioma cada vez.** Seis campos de texto seguidos eran el grueso del alto, y además
   ponían al mismo nivel el idioma que hay que rellenar y los dos que se pueden dejar en
   blanco. Con pestañas se ve uno —el obligatorio, primero— y los otros están a un clic. Los
   campos escondidos **se mandan igual**: siguen dentro del formulario, que es lo que separa
   unas pestañas de un formulario recortado.
2. **Cabecera y pie fijos.** Lo único que se desplaza es el cuerpo; el botón de guardar no
   puede irse debajo del borde. En el pie va también «Cancelar», porque cerrar pulsando fuera
   es invisible: quien no lo sabe, no lo descubre.
3. **Más ancha (760 → 920) y apretada por altura.** Los alérgenos pasan a todo el ancho, cinco
   por fila en tres filas, y en ventanas bajas se aprieta lo que se puede apretar sin quitar
   nada. Lo primero que se cae, por debajo de 760 px de alto, es la caja que repite lo que ya
   dicen la pestaña «(oblig.)» y el rótulo «Obligatorio».

Medido a 1512x982: **802 px de alto y cero desplazamiento interior**. A 1280x800 y a 1024x700,
también cero. En móvil el cuerpo se desplaza y el pie se queda: ahí no hay alto que repartir.

La zona de la foto deja de ser un botón de 44 px al lado de la palabra «Foto» y pasa a ocupar
lo que le sobra a la columna derecha. Un botón de 44 px no decía que ahí cabe una foto; una
zona de puntos del alto de la columna, sí — y además se le puede **soltar el archivo encima**,
que entra al mismo recortador de 1000x1000 en WebP que el clic.

## El autoguardado devolvía 2,4 MB que nadie leía

Marcar un plato agotado manda un `fetch` y el servidor contestaba **la página entera**. El
JavaScript sólo miraba el código de estado y nunca leía el cuerpo; el navegador, al ver que no
se va a leer, deja de vaciar el socket, PHP se queda escribiéndolo, y un servidor de un solo
proceso —el de desarrollo y el de la batería— se queda **ciego** hasta que el navegador suelta
la conexión.

Se veía como «el panel no responde» diez segundos después de marcar un agotado, y no se parecía
en nada a su causa: la batería fallaba en `ADM-04` y moría tres bloques más abajo con un
`page.goto` agotado. Diez segundos clavados eran la pista, y aun así apuntaban a un timeout de
red que no existía en el código.

Dos mitades del arreglo, y hacen falta las dos: la petición pide **respuesta corta**
(`X-Sin-Pagina: 1`, que ya existía para el alta y para reordenar fotos) y ahora el servidor la
contesta para cualquier POST del panel — `{ok, aviso, error}` en vez de la pantalla; y el
navegador **lee** ese cuerpo, que es lo que cierra la conexión. Sin cabecera no cambia nada,
que es lo que hace que un `<form>` sin JavaScript siga recibiendo su página entera.

## Mover categorías y secciones de sitio

Se podía reordenar los platos dentro de una categoría, pero no las categorías ni las secciones.
Ahora las tres cosas usan **el mismo manejador**: dos flechas. En la cabecera de cada categoría
van tumbadas arriba/abajo; en la tira de secciones van izquierda/derecha, porque la tira es
horizontal y ahí subir y bajar no significan nada.

Dos estados nuevos, hermanos del que ya ordenaba los platos:

- `estado.ordenCats` — `pestanaId => [categoryId, ...]`
- `estado.ordenPestanas` — `[pestanaId, ...]`

Los dos se guardan con la regla que ya usaba `orden_guardar`: **la permutación exacta** de lo que
hay hoy, o no se guarda nada. Así es imposible por construcción que una categoría cambie de
sección por aquí, que se pierda una o que se cuele la de otra. Y mandar el orden compilado
**borra** la entrada en vez de guardarla: un estado que dice lo mismo que la carta no debe
existir — congelaría ese orden el día que la carta cambie.

Tres decisiones que no se ven:

1. **Una categoría se mueve dentro de su sección; una sección, dentro de su bloque.** Sacar una
   categoría de su sección cambia el rótulo que la encabeza; sacar una sección de las «cartas
   especiales» la saca de su rótulo en la barra y de su lista en el índice del móvil. Ninguna de
   las dos cosas es reordenar. La comprobación del bloque se hace hueco a hueco contra el orden
   compilado, y `platos.json` publica `tabEspecial` para que el panel sepa cuál es cuál — Tinge
   hoy no tiene ninguna especial, pero el motor es de todos los clientes.
2. **Al guardar se recarga.** El número de un plato es su posición en la carta entera: mover una
   categoría corre los números de todo lo que va detrás. Los platos sí se renumeran en el
   navegador porque una categoría se lleva su propia baraja; esto no, y repetir la regla en
   JavaScript sería tener dos verdades de lo mismo.
3. **En la carta se recoloca en los huecos que ya había.** El rótulo «cartas especiales» es un
   `<li>` más entre las pestañas de la barra: reordenar los nodos moviéndolos a otro contenedor
   lo habría dejado encabezando otro grupo. Se coloca cada nodo en el hueco que ocupaba uno de
   los suyos, contenedor a contenedor, así que ni el rótulo se mueve ni una sección salta de una
   lista del índice a la otra.

**Y un fallo que costó tres pruebas en rojo:** el paginador de la tira mide el ancho de los chips
una vez y lo guarda. Las flechas las añade el JavaScript *después*, así que el paginador seguía
creyendo que caben trece chips estrechos; los sobrantes no se escondían, se salían por el borde
derecho de la página —20 elementos fuera a 1512— y la tira dejaba una sección cortada por la
mitad. Se le pide volver a medir por donde ya sabe hacerlo, que es el `resize`.

---

# El servidor decide al cargar, el cliente navega después (10 Sep 2026)

Un fallo del release del 9 de septiembre, **encontrado por el propietario en producción** y no
por las 706 comprobaciones que aquel release pasó en verde.

El panel lo pinta PHP de una vez y luego se navega en el cliente: `abrir(slug)` enseña un
`.pane` y esconde los otros. Dos piezas se habían quedado en medio, decididas por el servidor
al cargar y nunca revisadas después.

**«Añadir plato» salía de `if ($pestana === 'platos')`**, con `$pestana = $_GET['t'] ?? 'platos'`.
Entrando por Ofertas y pulsando Platos no se había impreso nunca: **la única acción del panel que
crea algo, inalcanzable**. Y al revés, entrando por Platos se quedaba visible en las otras siete
pantallas, donde no hace nada. Desde fuera parecía intermitente; dependía de por dónde entraras.

Ahora se imprime siempre —con la carta cargada— y nace `hidden` si la pantalla inicial no es
Platos; quien lo enciende y lo apaga es `abrir()`, por `data-solo-en`. Se busca por atributo y no
por identificador para que añadir mañana otra pieza así no obligue a tocar el interruptor. **Sin
JavaScript no cambia nada**: allí se navega con `?t=` y carga completa, así que el `hidden` que
pone PHP es exactamente el correcto en cada página.

**La tira de secciones medía una vez.** Con Platos oculto medía todo a cero —`tira.clientWidth` 0,
cada chip 0— y el reparto dejaba **una sección de trece** a la vista, con el paginador encendido.
Al hacerse visible la tira pasaba a medir 1062 px, pero nadie volvía a preguntar: `medir()` sólo
se rehacía con el `resize` de ventana, y ahí no hay ninguno. La tira se quedaba coja hasta que
alguien tocaba el borde de la ventana.

Se le pone un `ResizeObserver` sobre la propia tira. Coge el caso por donde toca: no le importa
QUIÉN la hizo visible —cambiar de pantalla, plegar la barra lateral, una fuente que termina de
cargar—, sólo que su caja ya no mide lo que medía. Guarda el último ancho pintado para no entrar
en bucle.

**Por qué la batería no lo vio, que es la lección.** Las 706 comprobaciones entraban TODAS por
`?t=<pantalla>` con carga completa, que es el único camino por el que el fallo no aparece.
`E2E-NAV-01` recorre ahora los **ocho** puntos de entrada y exige que la tira enseñe exactamente
lo mismo que entrando directo —no «algo», lo mismo—; `E2E-NAV-02` exige que el botón no se cuele
donde no pinta nada; y `E2E-NAV-03` provoca el `resize` que antes hacía falta y exige que **no
cambie nada**, porque si cambiara sería que la tira no se arregla sola.

Demostrado en rojo sobre `4d22d1a`, que es lo que estaba en producción: 3 FAIL, con
`sin resize 1/13 · con resize 6/13`.

---

# Las flechas que no se veían, y el tema en dos botones (10 Sep 2026)

## Un control que no se ve no es un control

El propietario miró la pantalla y dijo «no tiene manejadores». Tenía razón como usuario y el
código decía otra cosa: las cuarenta fichas llevaban sus dos flechas. Lo que fallaba era la
**visibilidad**, medida en el panel real:

    .adm-orden-b            opacity .6     en reposo
    .adm-orden-b:disabled   opacity .25    invisible sobre el crema
    :hover / :focus-visible opacity 1      solo entonces
    @media (pointer:coarse) opacity 1/.3   EN TÁCTIL YA ESTABA RESUELTO

Alguien ya había visto el problema y lo había arreglado **para el dedo**. El ratón se quedó
atrás. Ahora la apagada sube a `.45` —se ve, pero sigue leyéndose como apagada— y en las
cabeceras de categoría y en la tira de secciones el reposo pasa a opacidad plena: son 40 + 13
controles, no 312, así que ahí no aplica el argumento de las «312 manchas» que justificó el
reposo bajo en las filas de plato.

`:not(:disabled)` es la parte que importa y costó una corrección: sin él la regla pisaba a la
de `:disabled` por igual especificidad y orden posterior, y **los extremos de cada lista
parecían pulsables**. La flecha apagada es el borde de la lista y tiene que leerse como tal.

Es la misma decisión que este panel ya tomó una vez con el asa de arrastre: *«un asa que no se
ve no es un asa clara»*.

**Y las cuatro secciones de una sola categoría** —Ensaladas, A la plancha, Especialidades y
Niños— dejan de callarse. Antes se escondía la caja entera y el hueco no explicaba nada:
cuatro fichas de cuarenta parecían rotas. Ahora las flechas se quedan, apagadas, y dicen por
qué: «Única categoría de su sección: no hay dónde moverla».

`E2E-ORD-40b` mide **opacidad en reposo**, no presencia en el DOM. Medir presencia no habría
cazado esto nunca: los controles estaban ahí, sólo que no se veían.

## El tema, en dos botones con nombre

El interruptor de la cabecera —sol, bola, luna— pasa a **dos botones segmentados** al pie de la
barra lateral, encima de Salir. Es lo aprobado del mockup de Stitch, y sólo eso: la paleta
templada de ese mockup se descartó, porque compite con «Crema & Carbón» sin aportar idea nueva.

Dos botones y no un interruptor porque **los dos estados tienen nombre**. Un interruptor obliga
a deducir cuál es cuál por la posición de la bola; dos botones lo dicen.

**Hay dos copias, y no es un descuido.** `.adm-sidebar{display:none}` por debajo de 768 px: la
barra lateral no existe en móvil. Con una sola copia, en móvil no habría forma de cambiar de
tema. La segunda vive dentro de la hoja «Más», y el mismo guion mantiene las dos en sintonía —
una copia que dijera lo contrario que la otra sería peor que no tenerla.

**La semántica cambia y se rehace, no se afloja.** De `role="switch"` con `aria-checked` a un
`role="group"` con dos `aria-pressed`. Diecisiete afirmaciones en tres suites referenciaban
`#adm-tema-sw`; ninguna se ha relajado. La de responsive es la que más cambia, y a propósito:
antes exigía que el selector **se viera** en los ocho anchos, y eso ahora sería exigir que el
diseño fuera otro. Ahora exige poder **llegar** a él —en la barra cuando la hay, en la hoja
cuando no—, que es lo que de verdad importa, y además comprueba las dos mitades por separado.

Lo que no se toca: `localStorage['socialcard-color-mode']`, el guion del `<head>` que decide el
tema antes de pintar, y que cambiar de tema **no dispara ni una petición**.

# El movimiento del panel, ocho ajustes (10 Sep 2026)

Auditoría de movimiento del panel contra el catálogo de Emil Kowalski (frecuencia, curva y
duración, físico y origen, interrumpibilidad, rendimiento, accesibilidad, cohesión). Los ocho
planes viven en `tinge_of_turmeric/plans/` (fuera del repositorio) y se ensayaron sobre una
copia de `2-subir` antes de tocar nada aquí. Ninguno cambia marcado, datos ni comportamiento
funcional: sólo cómo se mueve lo que ya se movía, y qué pasa cuando alguien pide «menos
movimiento». Tokens de partida, los de siempre: `--t-press` 140, `--t-fast` 180,
`--t-sheet-in` 340, `--t-sheet-out` 240, `--ease-out`, `--ease-drawer`.

## La barra de sesión se mueve con `transform`

Era la única animación perpetua del panel y animaba `width`: el JS escribía el ancho cada
segundo y la CSS lo interpolaba durante 1 s, o sea layout y pintado en cada fotograma mientras
el panel estuviera abierto. Ahora el relleno mide siempre el 100 % y se desplaza a la
izquierda el porcentaje consumido (`translateX(-N%)`); la pista, que ya recortaba con
`overflow:hidden`, esconde lo que sale. Con `translateX` y no con `scaleX` la punta derecha
conserva su redondeo. `transition:transform 1s linear`, la misma cadencia que el reloj. Con
«menos movimiento» sigue sin interpolar, como antes.

## «Menos movimiento» conserva los fundidos

Había un comodín `*{transition-duration:1ms;animation-duration:1ms}` que aplastaba todo,
incluido el fundido del toast que la regla de al lado conservaba a propósito: el aviso se
volvía invisible en 1 ms y seguía 199 ms en pantalla recibiendo el puntero. Ahora la
preferencia se atiende por componente: sin escala de pulsación, sin recorrido en interruptores
y galones, el tooltip del riel y la hoja «Más» se funden en su sitio, el globo de ayuda y la
foto del login sólo cambian de opacidad, y los velos de modal y hoja siguen fundiéndose —son
opacidad pura— mientras la caja pierde el desplazamiento y la escala. Menos y más suave, no
cero. Los tres bucles infinitos ya tenían su apagado propio y se quedan.

## La hoja «Más» entra como la hoja de la carta

Entraba y salía a `--t-fast` (180 ms) con `--ease-out`, la duración de un cambio de color, y
los tres tokens de cajón que ya llegaban en `tokens.css` no los usaba nadie. Ahora: **340 ms**
de entrada y **240 ms** de salida con `--ease-drawer`, igual que `.dsheet-panel` en la carta.
Y el velo retrasa `visibility` hasta que acaba el fundido: antes, al cerrar, desaparecía de
golpe y el fundido de salida nunca se veía.

## Las hojas y el modal salen como entran

La hoja de alta, la de sección y el cuadro de confirmar entraban animados y salían con
`hidden = true` en seco. Dos tokens nuevos en `gen.mjs`: `--t-modal-in: 220ms` (la entrada
iba a 180, por debajo de la banda de 200–500 de un modal) y `--t-modal-out: 140ms`, más
deprisa que entra. El cierre pone `data-cerrando`, la CSS anima la salida —el mismo camino a la
inversa, con la misma curva `--ease-out` y `forwards`; no se usa `animation-direction:reverse`
porque invertiría también la curva—, la capa no recibe el puntero mientras se va, y `hidden`
llega con `animationend` o con un respaldo de 300 ms. Abrir a mitad de salida cancela el
cierre. El foco vuelve en el acto. Medido en el navegador: `hidden` a los 234 ms del clic.

## La pila de avisos se recoloca deslizando

Con tres avisos, el cuarto borraba el más viejo en seco; y al retirar uno, los que quedaban
saltaban de sitio. Ahora el desalojado sale por la misma puerta (`fuera()`), y cada retirada
va envuelta en un FLIP con la transición de 180 ms que ya tenía cada aviso: se apunta dónde
estaba cada uno, se quita el que se va, se devuelve a los demás a su sitio con una
transformación sin transición y en el siguiente cuadro se retira. Sólo los `is-in` ocupan
plaza. El `200` del JS es respaldo, no duración; el `180ms` literal de la CSS pasa a
`--t-fast`.

## El FLIP de reordenar aguanta la ráfaga

El remate del FLIP era un `setTimeout` de 220 ms sin cancelar: con dos pulsaciones seguidas,
el temporizador de la primera caía en mitad de la transición de la segunda y las filas
saltaban a unos 5 px del final. Ahora el temporizador es por fila y se cancela en cuanto esa
fila vuelve a moverse —también en la fase de escritura, no sólo en el `requestAnimationFrame`,
o el viejo podía disparar entre las dos—; y todas las medidas se toman antes de escribir nada
(antes se alternaban lectura y escritura fila a fila). Medido: dos pulsaciones a 90 ms, tres
filas siguen en vuelo a los 230 ms y están limpias a los 400. Los 180 ms y la curva no
cambian.

## Plegado instantáneo y tooltips sólo con puntero fino

Al plegar la barra sólo su `width` transicionaba: el relleno del cuerpo, la cabecera, el
padding de los ítems y sus rótulos cambiaban en seco, y la barra llegaba tarde, deslizándose
sobre un contenido que ya se había recolocado. Es una acción rara y `width` es layout: se
quita la transición y todo cambia a la vez. El tooltip del riel sólo existe entre 768 y 1023,
que es tablet: su `:hover` va ahora dentro de `(hover:hover) and (pointer:fine)` —un toque ya
no deja el rótulo pegado—, el `:focus-visible` lo enseña en cualquier dispositivo, y
`visibility` se retrasa a la salida para que se vea el fundido.

## Pulsación con transición en todos los controles; duraciones al token

Ocho controles pisaban la transición base de `button` sin listar `transform`, así que la
escala de pulsación entraba y salía a 0 ms: flechas de reordenar, navegación lateral, cubo de
retirar, cámara, flechas y «+» de la tira de secciones, botones de foto e ítems de la hoja
«Más»; y los dos botones de tema del pie de la barra, que llegaron en la sesión anterior con
el mismo patrón. Todos llevan ya `transform var(--t-press) var(--ease-out)`. Los dos enlaces de
«Salir» responden como sus hermanos `<button>` (`.97`). `.adm-atajo` pulsaba a `.99` —1 px en
96—: ahora `.97`. Y los literales se van al token: la única `cubic-bezier` escrita a mano
(`.16,1,.3,1`, casi `--ease-out`), los `200ms ease-out` de la pestaña Datos, el `160ms` del
hover de KPI (con un `box-shadow` en la transición que ninguna regla cambiaba), el galón de los
plegables a `--t-fast` como el de «Ver más», y el latido del botón de subir con `ease-in-out`
como los otros dos pulsos. Los 160 ms de los interruptores siguen siendo decisión aparte y no
se tocan.

Lo que se ha visto y NO se toca: CSS sin marcado en el panel (`.tabs*`, `.switch*`,
`.foto-btn`, `.combo*`, `.marca`), que se retirará aparte y con prueba; el asa de la hoja «Más»,
que se dibuja y no arrastra; y el globo de ayuda, que entra siempre desde abajo aunque se
coloque encima de su botón.

## Responsive R1 y R2: el hueco de 404-460 y el área táctil real (10 Sep 2026)

Dos defectos que salieron de la auditoría responsive, los dos medidos caja por caja.

**R1 — la fila de plato se salía de su tarjeta entre 404 y 460 px de pantalla.** No sacaba
barra horizontal en el documento, por eso ninguna ronda anterior lo vio: se salía de
`.adm-f`, que recorta con `overflow:hidden`. A 404 el interruptor de agotado quedaba 58 px
fuera y el nombre del plato se aplastaba a los 30 px de su `min-width`; a 460 aún salía 2.
El rango incluye 412 (Pixel) y 428 (iPhone Pro Max).

La causa es la de siempre en esta fila: `.adm-plato-acciones` es `flex:none` y el nombre es
lo único elástico, así que por debajo de lo que cuesta la composición de una línea la fila
no encoge — se sale. El escape ya existía (`@container adm-cat-bento-col (max-width:300px)`
devuelve la fila a `flex-wrap:wrap`), pero su umbral estaba por debajo del coste real. Es la
segunda vez: V7 ya lo subió de 260 a 300 por este mismo fallo un escalón más abajo.

**Y no se ha subido por tercera vez, porque la medida dice que no se puede.** La composición
de una línea no cabe hasta los 392 de columna, y la columna más estrecha de ESCRITORIO es
395 (viewport 1000, bento de 6). Entre lo roto y el escritorio quedan 7 px: cualquier número
que tape el agujero deja el escritorio pegado al mismo fallo, y con un cliente de etiquetas
más largas lo cruza. Así que la vuelta a envolver se condiciona al DEDO, no al ancho a
secas: `@media (pointer:coarse)` + `@container (max-width:400px)`. Con puntero fino la regla
ni se evalúa. Verificado: recorte 0 de 320 a 560 con dedo, y en escritorio (700 a 1920) el
mismo `nowrap`, los mismos anchos de nombre y el mismo alto de fila de 48 que antes.

**R2 — diez controles se dibujaban por debajo de 44 px sin halo táctil.** Se les pone el
mismo `::before` invisible que ya llevaban `.camara` y `.adm-sw-pista`: crece la zona que
responde al toque, no el dibujo ni el layout.

Lo que cambia respecto a cómo se venía haciendo es de dónde salen los números. Cada halo se
dimensiona al hueco libre real hasta el vecino tocable más cercano —botón, enlace, campo o
etiqueta—, tomando el **mínimo sobre las 271 instancias de las ocho pantallas** y dejando
1 px de margen. Midiendo una instancia salían 44x44 por todas partes; midiendo todas, no.

Y hay una segunda lección, más importante, que sólo apareció al verificar: **una cosa es el
área que el CSS declara y otra la que el layout entrega**. Un `::before` no puede salir de un
ancestro con `overflow:hidden`. Preguntando con `elementFromPoint` quién recibe de verdad el
toque en cada punto —que es lo único que le pasa al usuario— sale esto, sobre la peor
instancia de cada clase:

| control | dibujo | declarado | ENTREGADO (peor) | qué pone el techo |
|---|---|---|---|---|
| `.adm-btn` | 38x40 | 44x44 | **44x44** | nada: 8 px libres por los cuatro lados |
| `.adm-pct-atajo` | 67x30 | 67x44 | **67x44** | — |
| `.adm-dia-semanal` | 100x36 | 100x44 | **81x44** | — |
| `.adm-plato-destbtn` | 28x32 | 32x44 | **32x44** | 4 px por cada lado |
| `.adm-prow-editar` | 26x26 | 38x44 | **38x44** | 6 y 8 px de hueco lateral |
| `.adm-retirar-b` | 28x28 | 34x35 | **33x35** | encajonado por los cuatro lados |
| `.adm-tema-op` | 30x32 | 44x33 | **44x33** | el borde de la propia barra |
| `.adm-nav-item` | 43x40 | 43x42 | **43x40** | 2 px entre destinos |
| `.adm-cat-nombre-b` | 24x24 | 28x44 | **24x30** | la tira de secciones lo recorta |
| `.adm-orden-b` | 24x24 | 26x44 | **26x30** | la tira de secciones lo recorta |

Los dos últimos merecen su párrafo. `.adm-secciones-tira` es un carrusel horizontal con
`overflow:hidden`, así que **los halos de los controles que viven dentro se cortan en el
borde de la tira**: las mismas flechas entregan 45 de alto en la cabecera de una categoría
y 30 dentro de la tira. Y no es culpa de esta ronda: la regla de 44 de alto de
`.adm-orden-b` es anterior, y dentro de la tira nunca entregó 44. Sacarlas de ahí pide más
alto en la tira, que es cambio de composición y va aparte. Al interruptor le pasa algo
parecido dentro de su tarjeta: 45 en el mejor sitio, 40 en el peor.

**`.adm-retirar-b` se queda corto a propósito, y conviene que conste por qué.** Retira un
plato de la carta y tiene vecinos a 4 px por los dos lados: un halo de 44 los pisaría, y un
halo solapado sobre un control destructivo convierte un fallo de puntería en una retirada
accidental. Eso es peor que un objetivo pequeño. Llevarlo a 44 exige separar el grupo, que
es cambio de densidad y no de área táctil — decisión aparte.

Con esto se ratifica la regla de SPEC:602 en vez de contradecirla: 44 es objetivo
ergonómico y se aplica **donde el layout lo permite sin arriesgar solapamiento**. Lo nuevo
es que ahora hay una cifra medida para cada caso, y una prueba que la sostiene.

**Un defecto anterior, encontrado al verificar.** `.adm-orden-b::before` medía 32 de ancho
sobre un botón de 24 «para no pisar al de al lado» — pero el hueco entre flechas gemelas
baja a 2 px, así que se metía 4 px por lado y las dos zonas se solapaban 6. Un toque en esa
banda lo cogía la flecha pintada después, la contraria a la que se apuntaba, en un control
de «subir / bajar». Pasa a 26 (28 en <=560, donde el botón mide 26 y el hueco 4): las dos
zonas se tocan en la mitad del hueco, lo cubren entero y cada mitad va a su flecha.

**Dos pruebas nuevas, y dos errores míos por el camino que conviene dejar escritos.**
`E2E-RS-RECORTE` barre 404, 412, 428, 440 y 460 con dedo y exige que ninguna fila se salga de
su tarjeta y que el nombre siga siendo legible. `E2E-RS-TACTIL-44` contrata el área efectiva
de cada control y comprueba que ninguna zona le quita el toque a otra.

La primera versión de esa segunda prueba deducía el área del tamaño del `::before` dándolo
por centrado; como estos halos son asimétricos, denunciaba solapes que no existían. Y la
segunda medía con `elementFromPoint` pero **sin destapar lo plegado**: en Ofertas los atajos
de porcentaje y los días viven dentro de un `<details>` que en móvil viene cerrado, sus cajas
quedan donde no se pinta nada, y la prueba los daba por tapados por la cabecera de la ficha.
No lo estaban. Con lo plegado abierto y descontando la barra inferior fija —que tapa lo que
le queda debajo, y eso no es un halo invadiendo a nadie— no queda ni un control cuyo toque se
lleve otro.

Fuera de alcance y sin tocar, anotado midiendo: en escritorio el nombre del plato se queda
en 30 px a viewport 1000 y en 34 a 1180, porque por encima de 420 de columna la etiqueta de
destacado pierde su tope y se come el hueco. No recorta nada —por eso no es R1— pero es el
mismo nombre ilegible, y merece su propia medición.

# La fila de Platos como rejilla (10 Sep 2026)

El propietario, con cuatro mockups de Stitch (claro y oscuro, vertical y horizontal): al poner
etiquetas, ofertas y agotados «los datos no tienen orden, la alineación de izquierda a derecha
hace que se vean rotos». Medido antes de tocar nada, con un agotado, dos etiquetas y cuatro
ofertas sembrados:

| Fila (768, columna de 586) | x del precio | Ancho del nombre |
|---|---|---|
| Sin nada | 526 | 202 |
| Con oferta | 500 | 176 |
| Oferta + etiqueta «Popular» | 436 | 111 |
| Etiqueta «Favorito veggie» | 411 | 86 |
| Etiqueta «Hay que probarlo» | 395 | 71 |

Y a 1024 (columna de 678, por encima del corte compacto de 620) entraba la fila «ancha» —precio
de 84, «Destacar» con texto, guión «—»— que ya no cabía: el nombre se partía en dos y tres
líneas y las filas medían 48, 51, 71, 72 y 93. Con flex y un grupo de acciones pegado a la
derecha, cada control mide lo suyo y nada cae en la misma x dos veces. Sólo el interruptor de
agotado se quedaba quieto.

## La rejilla

Desde **520 px de columna** (`@container adm-cat-bento-col (min-width:520px)`) la fila es una
rejilla de columnas fijas con áreas con nombre:

```text
orden 62 · foto 32 · num 24 · nombre 1fr · precio 52 · oferta 24 · etiqueta 84 · agotado 40 · mas 28
hueco 6 · relleno 4 16 · alto mínimo 48
```

Cada dato tiene su columna aunque esté vacío: sin oferta, el hueco lleva un punto de 6 px en
vez del guión; sin etiqueta, una pastilla fantasma con la estrella y un «+» del ancho del
hueco. Con áreas con nombre y no autocolocación, si falta un elemento (las flechas se quitan
al filtrar, la fila retirada las esconde) su hueco queda vacío y nada se corre. El grupo de
acciones pasa a `display:contents`: sus hijos son celdas de la fila.

**La columna de orden mide 62 y no 56**, que era lo que decía el mockup: son las dos flechas de
28 con su hueco de 6 de siempre, y R2 acaba de ajustar el halo de cada una (26, y 28 en ≤560)
a ese hueco exacto para que las dos zonas se toquen sin solaparse. Estrecharlas o quitar el
hueco desharía esa medida. Presupuesto fijo: 346 + 48 de huecos + 32 de relleno = **426** con
dedo; **454** con ratón, que lleva lápiz y papelera en línea (26 + 2 + 28) en la columna `mas`.

Medido en la copia local tras el cambio, con el mismo estado sembrado. La x es la del precio,
igual en todas las filas de cada columna:

| Ventana | Puntero | Columnas | Ancho de columna | x del precio | Nombre mínimo |
|---|---|---|---|---|---|
| 768 | dedo | 1 | 586 | 443 | 160 |
| 1024 | dedo | 1 | 678 | 699 | 252 |
| 1024 | ratón | 1 | 678 | 671 | 224 |
| 1280 | ratón | 1 | 934 | 927 | 480 |
| 1366 | ratón | 1 | 1020 | 1013 | 566 |
| 1440 | ratón | 2 | 533 | 526 · 1087 | 79 |
| 1512 | ratón | 2 | 569 | 562 · 1159 | 115 |
| 1920 | ratón | 2 | 773 | 766 · 1567 | 319 |

Alto de fila 48 en todas, cero desborde, consola limpia. La columna más justa es la de 1440:
79 px de nombre con ratón. Es lo que da el presupuesto con dos columnas de 533; si algún día
molesta, el corte de dos columnas (abajo) puede subir a 1180 y esa ventana pasa a una columna.

**Las dos columnas de escritorio: 820 → 1099.** Con 426-454 de presupuesto, una columna de
395-519 no da nombre (a 453 quedaban 33 px). Sólo hay dos columnas cuando cada una llega a 522
(2 × 522 + 56 de huecos). Medido: de 1180 a 1366 de ventana la ficha pasa a UNA columna de
834-1020 con nombre de 480-566; desde 1440 (ficha de 1124) vuelven las dos, ya con rejilla.

**El bloque compacto de `max-width:620px` pasa a `max-width:519px`.** Era la composición de
toda columna de hasta 620; ahora es la de móvil y columnas estrechas. Cambio de rango, no de
reglas.

## Qué conserva y qué sustituye de R1 y R2

- **R1**, la envoltura con dedo (`@media (pointer:coarse)` + `@container adm-cat-bento-col
  (max-width:400px)`) y la regla de 300: **intactas**. La rejilla entra desde 520; por debajo
  la fila es la de antes. `E2E-RS-RECORTE` (404-460) no se toca.
- **R2**, los halos `::before`: **todos se conservan**. Los del lápiz y la papelera valen donde
  van en línea (ratón); dentro del menú «⋯» (dedo) **se sustituyen** por filas de 44 px a
  todo el ancho del menú (`::before{content:none}` allí, porque el del lápiz sube 18 px y
  pisaría a la otra fila). El de `.adm-plato-destbtn` se conserva: en la rejilla sus vecinos
  están a 6 px y no se solapa.
- Nuevo halo, con la regla de R2: el «⋯» de la fila, 28×28 → 39×44 (3 px por la izquierda,
  que es lo que deja el interruptor a 6; 8 por la derecha, que sólo tiene relleno; 8 arriba y
  abajo, y dos halos de 44 en filas de 48 no se tocan).

## El menú «⋯», sólo con dedo

Con puntero grueso el lápiz y la papelera se recogen en un «⋯» al final de la fila, con dos
filas de 44 con rótulo: «Cambiar» y «Retirar de la carta» (o «Devolver a la carta» / «Borrar»).
Con ratón siguen en línea y revelados al pasar por la fila, como siempre: el «⋯» nació para el
dedo, que los tenía encendidos siempre y eran 54 px de ruido por fila; el ratón nunca tuvo ese
problema. Mismos botones, mismos `name`, `data-editar`, `data-confirmar` y `data-retirar`; los
manejadores son delegados y siguen colgando de la fila.

**Consecuencia en móvil, dicha:** lápiz y papelera dejan de ir tras el nombre y tras el precio
y pasan al final de la fila (dentro del «⋯» con dedo). Medido con dedo de 320 a 640 contra el
build anterior: 320, 390, 404 y 412 idénticos (filas de 105-106, la envoltura de R1); a 428 y
440 la fila corta pasa de tres líneas a dos en algunas filas (67-68); a 560 la fila ya no se
sale 33 px de su tarjeta; a 640 entra la rejilla y el nombre pasa de 40 a 114. Ninguna peor.

**Popover nativo** (`popover` + `popovertarget`): va a la capa superior y no lo recorta el
`overflow:hidden` de la ficha, que es la trampa que R2 documentó con los halos. Los estilos de
fábrica del popover (inset:0, margin:auto, borde y fondo del sistema) se anulan y el JS lo
coloca bajo su botón alineado a su borde derecho, hacia arriba si no cabe (`data-arriba`).
Suelo: Safari 17, Chrome 114, Firefox 125. Por debajo, `html.sin-popover` y la misma caja
absoluta dentro de la ficha, por clase. Sin JavaScript, con ratón todo va en línea y con dedo
el popover abre igual, centrado por el navegador.

**Cómo entra y cómo sale**, con el vocabulario de «El movimiento del panel, ocho ajustes»:
entra en `--t-fast` (180 ms) con `--ease-out` desde `opacity:0; transform:scale(.97)`, con
`transform-origin` en la esquina del botón (arriba-derecha; abajo-derecha si abre hacia
arriba). Sale como hojas y modal: el JS pone `data-cerrando`, la CSS anima a `--t-modal-out`
(140 ms) con la misma curva y `forwards`, y `hidePopover()` llega con `animationend` —sólo el
de SU animación de salida: el de la entrada podía llegar justo después de pedir el cierre y
cerraba en seco, medido— o con el respaldo de 300 ms. Aplica a los cierres propios: pulsar una
de sus filas (antes de que salga el cuadro de confirmar) y el scroll. El cierre por *light
dismiss* del navegador (toque fuera, Escape, volver a pulsar «⋯») es instantáneo: su
`beforetoggle` no se puede cancelar y no se va a fingir. Con «menos movimiento», sólo opacidad,
reutilizando `adm-modal-fondo` y `adm-modal-fondo-fuera` en el bloque por componente. Medido:
por scroll, `adm-mas-fuera` corre y cierra a los 168 ms; pulsando «Cambiar», a los 179 y la
hoja de edición se abre.

Sombra nueva para lo que flota: `--sc-sombra-menu` (claro `0 8px 24px -8px rgba(26,22,20,.28)`,
oscuro `rgba(0,0,0,.7)`), junto a las dos que ya había.

## Dos errores míos, encontrados midiendo

1. La etiqueta recortada salía a cuchillo («FAVORITC») en vez de con «…»: el botón de la
   pastilla es `inline-flex`, y sobre un contenedor flex el texto vive en una caja anónima
   donde `text-overflow` no actúa. Dentro de la rejilla pasa a `display:block` con
   `line-height:22px`. Era latente en el modo compacto de antes (tope de 84 en columnas de
   menos de 420) y nadie lo vio porque la etiqueta cabía.
2. La primera salida del menú cerraba en seco a los 20 ms: `animationend` de la ENTRADA
   llegaba justo después de pedir el cierre y disparaba el `hidePopover()`. Ahora sólo se
   atiende al de la animación de salida.

## Pruebas

`E2E-RS-TACTIL-44` cambia de contrato en dos entradas: el lápiz y la papelera ya no van en
línea con dedo; se contrata el «⋯» (39×44) y, con el menú abierto, sus dos filas. Nuevas:
`E2E-REJ-01` (768 y 1024 con dedo: misma x de precio, oferta, etiqueta e interruptor en todas
las filas, alto 48, sin recorte), `E2E-REJ-02` (1440 y 1512 con ratón: dos columnas, cada una
alineada, lápiz y papelera en línea), `E2E-REJ-03` (el «⋯» abre junto a su botón, entra con
`adm-mas-dentro`, lleva Cambiar y Retirar de 44, cierra animado con `adm-mas-fuera` por scroll
y en seco al tocar fuera, y «Cambiar» abre la hoja), `E2E-REJ-04` (1280 con ratón: una columna
y nombre ≥ 200). Las esperas son a `getAnimations().finished`, nunca a N ms.

Fuera de alcance y anotado: de 520 a 560 de ventana con dedo (columna de 460-500) la fila
sigue en el modo compacto de una línea con el nombre a 30-34 px, como antes. No recorta (a 560
antes se salía 33 px y ahora no), pero es el mismo nombre ilegible que R2 dejó apuntado en
escritorio; merece su propia medición.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

## Responsive R3 y R4, y lo que quedaba de R2 (10 Sep 2026)

Cinco correcciones que salieron de remedir los pendientes contra la fila en rejilla, no
contra la de la mañana. Dos de ellas cambian el diagnóstico que yo mismo había escrito.

**1. La tira de secciones dejaba a sus controles sin área táctil.** `.adm-secciones-tira`
recortaba con `overflow:hidden`, y el recorte que quiere es sólo el horizontal —lo que no
cabe entero se apaga y se pasa de página—. En vertical no sobra nada, y ahí se comía los
halos: las flechas de reordenar y el rótulo de renombrar entregaban **31 px de alto**
dentro de la tira contra los **45** que entregan esas mismas flechas en la cabecera de una
categoría, y están a 3 px del borde por arriba y por abajo. Pasa a
`overflow-x:clip; overflow-y:visible` — `clip` recorta igual de bien en su eje y, a
diferencia de `hidden`, deja poner `visible` en el otro sin sacar barra de desplazamiento.
Medido después: **44-45 de alto**. Cero cambio de dibujo; lo único que sale por arriba y
por abajo son halos invisibles.

**2. Destacar y el interruptor, cortos en la rejilla de tablet.** A 768 con dedo,
`.adm-plato-destbtn` entregaba 38 y `.adm-sw` 40.

- Destacar: **no lo topaba ningún vecino.** Medido punto a punto, debajo no hay nada y
  encima sólo está la propia fila. Lo topaba mi propio halo de R2, calculado sobre una caja
  de 32 que en la rejilla mide **26**. De `-8/-6` a `-10/-10`: 46 en la rejilla, 52 en la
  fila ancha, y sigue sin pisar a nadie.
- El interruptor: su halo se centra en la **pista**, y la etiqueta que la envuelve lleva
  relleno arriba (`padding:var(--s1) 0 0`), así que los dos centros no coinciden. Medido
  desde el centro del interruptor —que es donde cae el dedo— los 44 daban 40. El halo pasa
  a **48 de alto** y entrega 44 largos, lejos todavía del interruptor de la fila siguiente,
  que está a 27.

**3. El «⋯» se queda en 37 de ancho, medido.** Por la izquierda tiene el interruptor de
agotado a 4 px (6 desde 640 de ficha), y el halo de 44 del interruptor ya se come 2 de
esos: quedan 1-3 px reales. Por la derecha no hay vecino, pero ahí el techo lo pone el
recorte de la ficha — por eso la regla declara 39 y entrega 37. De alto entrega 44-45. No
se toca.

**4. La nota fiscal de la carta, de 11 a 12 px.** El registro de esta decisión **se ha
movido al `SPEC.md` de la raíz**, que es donde van las de la carta: éste es el del panel.
Se quedó aquí por venir en la misma ronda que las otras cuatro, y era el sitio equivocado.
Ver «El suelo tipográfico de la carta» en el SPEC de la raíz.

**5. Los KPI, a cuatro columnas desde tablet.** El corte estaba en 1280 de ventana porque
una ronda anterior midió que a 1024 las cuatro tarjetas salían de 161 px «con el rótulo
envolviendo». **Eso ya no pasa**: desde entonces el rótulo salió del flujo y se ancla
arriba a la derecha. Remedido ahora, ninguno de los cuatro —«Todos», «Agotados»,
«Destacados», «Con oferta»— envuelve ni se recorta a cuatro columnas en ningún ancho desde
768, con tarjetas de 147 a 234 y los mismos 66 de alto. Con el corte en 1280, un iPad en
vertical enseñaba dos columnas teniendo 616 de rejilla. El corte baja a **767**.

Sigue siendo una consulta de ventana y no de contenedor, a propósito y contra lo que la
orden pedía: los KPI no viven dentro de ningún `container-type`, y declarar uno nuevo en la
columna de contenido traería contención —y con ella los `position:fixed` de dentro— por un
cambio que se resuelve con un número medido.

**6. La composición de dos columnas de categorías en tablet no se toca**, y conviene decir
por qué se descartó en vez de dejarlo en «no procede». Si en tablet se ponen dos columnas
de categorías, cada ficha baja de 586-652 a unos 290 — por debajo de los 520 que la rejilla
necesita — y las filas **vuelven a envolver**. Aprovechar el ancho a lo ancho costaría
perder la rejilla. Lo que quedaba del hallazgo «tablet desaprovecha el sitio» se lo comió
la propia rejilla: a 768 el nombre del plato pasó de 30 px a 160, y a 834 a 226.

**Y un agujero que dejé yo.** `E2E-RS-TACTIL-44` medía sólo a 390, y por eso pasaba en
verde con destacar a 38 y el interruptor a 40 en la rejilla de tablet. Ahora barre **390 y
768**. Es exactamente el mismo error que R1 tenía entre 390 y 560: el defecto no estaba
escondido, estaba donde nadie miraba.

# La fila de Platos en móvil: dos líneas (10 Sep 2026)

El propietario, con el panel abierto en su teléfono: «mira este desastre». Medido a 320, 360 y
390 sobre lo que había:

| | 320 | 360 | 390 |
|---|---|---|---|
| Ancho de columna | 220 | 260 | 290 |
| Alto de fila | 105-106 | 105-106 | 105-106 |
| x del precio | 66 y 100 | 100 y 140 | 130 y 170 |
| x de la etiqueta | 116 y 150 | 150 y 190 | 180 y 220 |
| Cabecera de categoría | 110 (tres líneas) | 110 | 110 |
| Alto de la página | 28.425 | 28.407 | 28.420 |

Tres pisos por fila, dos x distintas para el mismo dato según lo que llevara la fila, la
etiqueta cortada a cuchillo («NUEVC», «EL FAV») y la cabecera de la categoría ocupando tanto
como una fila entera. La rejilla de columnas fijas de tablet no llega aquí: entra a partir de
520 px de columna y un móvil de 390 tiene 290.

## Dos líneas, y cada una una rejilla

Por debajo de 520 px de columna una sola línea no cabe —lo fijo pide 340— así que la fila pasa
a dos líneas con áreas con nombre:

```text
línea 1:  cámara 32 · nº 24 · NOMBRE (elástico, hasta dos líneas) · ⋯ 28
línea 2:  flechas 56 (ocupan las dos primeras columnas) · precio 56 · oferta 24 · etiqueta · agotado 40
```

Relleno lateral 12 y hueco 4, en vez de los 16 y 6 de tablet: son 12 px más de nombre y 12 más
de etiqueta en una columna de 290, y ahí eso es la diferencia entre que la etiqueta se lea o no.

**Las flechas miden 56 y no los 62 de tablet, y no es un descuido.** Por debajo de 560 px de
ventana ya se dibujan a 26 con hueco de 4 (26 + 4 + 26 = 56), medida que fijó R2 junto con su
halo de 28. Las dos cifras salen de lo mismo: lo que ocupan las flechas de verdad a cada tamaño.

**El nombre, hasta dos líneas**, por decisión del propietario y con la medida delante. De los
312 nombres reales caben enteros:

| Ancho del nombre | Una línea | Dos líneas |
|---|---|---|
| 86 px | 28 % | 78 % |
| 126 px | 64 % | 95 % |
| 156 px | 82 % | 99 % |
| 196 px | 89 % | 100 % |

**El precio se dibuja a 16 px** (`--tb`) y su columna mide 56. Medido en Arimo: «12,95» ocupa
41 px de texto y `.adm-campo` suma 14 de relleno y borde; el precio más largo de la carta real
es «21,95». No es un capricho tipográfico: por debajo de 16 px Safari en iOS amplía la página al
enfocar un campo y no la devuelve. Con 16 no hace falta tocar el `viewport`, que sigue dejando
ampliar al usuario (WCAG 1.4.4) — el mockup de referencia traía `user-scalable=no` y eso no se
copia.

**Nada por debajo de 12 px.** El HTML del mockup usaba 9, 10 y 11 px en 48 sitios. El suelo del
panel es `--t4` (12) desde MISE-A y aquí se respeta entero: nombre a `--t2`, precio a `--tb`,
etiqueta y «Incluido» a `--t4`.

## Medido después, en el panel de verdad

| Ventana | Columna | Alto de fila | x precio | x oferta | x etiqueta | Nombre | Etiqueta |
|---|---|---|---|---|---|---|---|
| 320 | 220 | 88 / 98 | 126 | 186 | — | 100 | no se dibuja |
| 360 | 260 | 88 / 98 | 126 | 186 | 214 | 140 | 40 |
| 390 | 290 | 88 | 126 | 186 | 214 | 170 | 70 |
| 430 | 330 | 88 | 126 | 186 | 214 | 210 | 84 |
| 560 | 460 | 88 | 126 | 186 | 214 | 340 | 84 |

Una sola x por dato en todas las filas y en todos los anchos; el interruptor y el «⋯» comparten
borde derecho; cero elementos fuera de la tarjeta y cero desbordamiento. La fila mide **88 px
con el nombre en una línea y 98 con dos**, contra los 105-106 de antes, y **la página de Platos
baja de 28.420 a 22.567 px** a 390: casi seis mil píxeles menos de recorrido.

**Lo que no cabe a 320, y por qué la etiqueta no se dibuja allí.** La columna elástica la
comparten el nombre (línea 1) y la etiqueta (línea 2), y con 220 px de columna, después de
flechas 56, precio 56, oferta 24 e interruptor 40, a la etiqueta le quedan 0. La primera versión
la dejó ahí con esos 0 px, y **la batería cazó lo que eso significaba de verdad**: la «×» de
quitar la etiqueta es `flex:none` de 20 px, no encoge, se salía de su celda y se ponía **encima
del interruptor de agotado** (E2E-DS-06, `solape:true`). Un control encima del que marca un
plato agotado es exactamente lo que R1 y R2 estuvieron persiguiendo, así que por debajo de 240
px de columna la etiqueta y el botón fantasma **no se dibujan**.

El umbral es 239 y está medido: a la celda le tocan `columna − 220` px, así que los 20 de la «×»
entran justo a partir de 240 de columna, que es una pantalla de 340. Se ha preferido darle esos
píxeles al nombre —100 px a 320, el 78 % de los 312 nombres enteros en dos líneas— antes que a
una pastilla que no cabe. Consecuencia asumida y dicha: **en un teléfono de 320 px no se pone ni
se quita una etiqueta desde la fila**. Las dos salidas medidas, si algún día molesta: subir la
etiqueta a la línea 1, que deja el nombre en 40 px; o llevar «Destacar» al menú «⋯», que es
funcionalidad nueva. Ninguna se ha hecho aquí.

A 390 la etiqueta muestra unos seis caracteres y el resto con «…» («POPULAR» sale «PO…»), con
su `title` completo; a 430 entra entera. El propietario lo aceptó expresamente.

## La cabecera de categoría: una línea y pegada

Pasa de envolver en tres líneas de 110 px a **una sola de 44**, y se queda pegada bajo la
cabecera del panel (`position:sticky; top:var(--sc-header-h)`) mientras se recorre su categoría.
Con la página en 21.350 px, a media categoría ya no se sabía de qué categoría eran las filas.

**Y el detalle que lo hace posible:** el `overflow` de la ficha pasa de `hidden` a `clip`.
Medido: con `hidden` la cabecera **no se pega** —al recorrer 260 px bajaba de 68 a −191, o sea
se iba con la ficha—, porque `hidden` crea un puerto de desplazamiento y la cabecera se pega a
él. `clip` recorta exactamente igual las esquinas redondeadas pero no crea puerto, y con él la
cabecera se queda clavada en 68. Es la misma lección que R3 acababa de pagar con la tira de
secciones, en el mismo día.

## Qué sustituye y qué conserva

- **R1 se retira, entero.** Las dos reglas que devolvían la fila a `flex-wrap:wrap` —la de
  `max-width:300px` y la de `pointer:coarse` + `max-width:400px`— existían para que el grupo de
  acciones no se saliera de la tarjeta cuando no cabía en una línea. Una rejilla no envuelve y
  no se sale: la garantía se cumple por construcción y en todos los anchos, no sólo en el rango
  parcheado. Lo comprueba `E2E-RS-RECORTE`, que se queda y se endurece.
- **R2, R3 y R4 se conservan enteros**, y sus áreas efectivas se vuelven a medir con los vecinos
  nuevos. Ahí salió el segundo hallazgo de la batería, y es de los que sólo aparecen midiendo:
  con dos líneas a 6 px una de otra, **los halos de la línea 1 se comían los de la línea 2**. Cada
  línea mide 32 y sus controles quieren 44 de alto de zona tocable —88 entre las dos—, así que el
  halo de la cámara se metía 6 px en el de las flechas y el del «⋯» en el del interruptor, y quien
  pierde es el de abajo: entregaban **38 donde se contratan 44** (`E2E-RS-TACTIL-44`). El hueco
  entre líneas sube a **12** y cada uno tiene los suyos justos, 0-44 la línea 1 y 44-88 la línea 2.
  Cuesta 6 px por fila y no se discute: es área táctil, no aire.

  Dos ajustes más, del mismo hallazgo. El halo del interruptor vuelve a **44** de alto en móvil
  (R3 lo puso en 48 para la fila de una línea de tablet, donde encima y debajo sólo está el borde
  de la fila; aquí encima tiene el «⋯» y esos 4 de más se los quitaba). Y **el número del plato
  sale del reparto de impactos** (`pointer-events:none`): no es un control, pero es un `<span>`
  con texto y el navegador le entregaba el toque, comiéndole 2 px de halo a la cámara —42
  entregados donde se contratan 44—. Medido después: cámara 44×44, interruptor 44×44, flechas
  28×44, «⋯» 37×44, y ninguna zona le quita el toque a otra.
- **La rejilla de tablet (≥520 de columna) no se toca.** Verificado a 768 y 1440: mismas x,
  mismo alto de 48, mismo nombre, precio a 13 px, cabecera estática y ficha en `hidden`.

## Un cambio de marcado, uno solo

`.adm-mas` (el menú «⋯») sale de `.adm-plato-acciones` y pasa a ser hijo directo de la fila. En
móvil el grupo de acciones es la rejilla de la línea 2 y el «⋯» vive en la línea 1: un hijo no
puede salirse de la rejilla de su padre. En tablet y escritorio es neutro —el grupo es
`display:contents` y sus hijos ya eran celdas de la fila, como ahora lo es el «⋯»—, y así se ha
medido. Ni un `name`, ni un `data-*`, ni un manejador cambian.

## Pruebas

`E2E-DS-06` se reescribe: mide en **dos** anchos, porque el contrato es distinto en cada uno. A
360 la etiqueta se dibuja y lo que se exige es lo de siempre —dentro de la fila y sin pisar el
interruptor—; a 320 lo que se exige es que **no** se dibuje y que el interruptor siga dentro.
Medir a 320 el solape de algo que ya no se pinta sería dar por buena la composición vieja.

`E2E-RS-RECORTE` se endurece: sigue barriendo 404-460 con dedo y ahora exige además que la fila
sea rejilla, que no pase de dos líneas y que el nombre no baje de 90 px (antes 60, que era el
mínimo técnico de la composición vieja). Nuevas `E2E-MOV-01..04`: la alineación y el alto a 320,
360, 390 y 430; el precio a 16 px y ningún texto por debajo de 12; la cabecera de 44 pegada de
verdad, medida por posición y no por CSS declarado; y el «⋯» abriendo con sus dos filas de 44.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

# Ofertas: la fila en una línea y la regla a todo el ancho (10 Sep 2026)

El propietario, con la pantalla delante: la fila «no está bien» y la regla «deja mucho aire en el
grid». Medido antes:

| | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Fila de plato suelto | **dos pisos** de 55 px, interruptor en x=151 **antes** del precio (x=289) | una línea, 48 | 48 | 48 |
| Ficha «La oferta» | 675 px | 490 | 320 | 291 |
| Rejilla de la regla | 1 columna | 1 columna | 3 columnas | 3 columnas |

## La regla ya repartía el ancho… por encima de 900

El comentario de `.adm-regla` dice literalmente lo que el propietario pidió hoy: «los tres
controles se apelotonaban a la izquierda y media ficha quedaba vacía… Ahora es una rejilla que
reparte el ancho entero». El fallo estaba en una línea: `@media (max-width:900px){
.adm-regla{grid-template-columns:1fr} }`. Por debajo de 900 se apilaba todo, y de ahí salían los
490 de tablet y los 675 de móvil. No se rehace la rejilla: se le quita la rendición, y para que
quepa sin apilarse cambian tres componentes.

## Tres componentes

1. **Los cuatro atajos de descuento** dejan de ser cuatro pastillas sueltas y se pegan a la caja
   del número formando un segmentado: `[ 20 % │ 10 │ 15 │ 25 │ 30 ]`.
2. **Los siete días** dejan de ser siete cuadrados de 36 con hueco de 8 y pasan a un segmentado
   que se estira a todo el ancho de su línea: medido, **67 px por día a 1440 y 51 a 768**, contra
   los 36 fijos de antes. El botón «Semanal» se queda, al final de esa línea.
3. **Las dos horas** dejan de ser dos cajas con un guión suelto entre ellas y pasan a UNA caja con
   el guión dentro.

Ni un selector, ni un `id`, ni un `name`, ni un handler cambian.

## La fila, cinco columnas fijas

`nº 24 · nombre 1fr · origen 24 · precio 56 · interruptor 40`, hueco 8, alto 48. El
`<small>Toda la categoría</small>` que colgaba bajo el nombre —y que era lo que partía la fila—
pasa a la columna «origen»: pastilla «CAT» cuando la oferta le viene de la categoría, punto gris
cuando no, con el hueco reservado siempre. El texto completo se conserva para quien no ve la
pastilla.

Todo acotado a `.adm-ofertas`: `.adm-orow`, `.adm-prow-n`, `.adm-orow-nm` y `.adm-prow-fijo` son
de Platos y de Precios también.

## Tres trampas de herencia, las tres medidas

0. **`.adm-ofertas` no es Ofertas.** Esa clase envuelve también la lista de PLATOS —viene del
   nombre que tenía la lista antes de que Platos existiera como pantalla— así que acotar con ella
   la rejilla nueva se la aplicaba a la fila de Platos entera. Medido: su fila pasaba a cinco
   columnas `24px 82px 24px 56px 40px` y el nombre se quedaba en 24 px; la batería lo cantó con
   trece fallos de golpe, todos de Platos y ninguno de Ofertas. Misma especificidad y ésta llega
   después, así que ganaba. Se acota por el panel: `.pane[data-pane="ofertas"]`.

1. **`order:3` viajando desde Precios.** `.adm-prow-fijo` es compartido y la fila de Precios lo
   reordena en móvil (`@media (max-width:699px){.adm-prow-nuevo,.adm-prow-fijo{order:3}}`). En una
   rejilla `order` sí manda: a 390 el precio saltaba a x=284 **detrás** del interruptor (236), que
   es exactamente el desorden que se venía a arreglar. Se anula con `order:0`.
2. **El rótulo delante no cabe en un móvil.** Con el rótulo inline, a 390 «Descuento» (68) + la
   caja (92) + los cuatro atajos (176) piden 348 en una ficha de 286, y eso sacaba 42 px de
   desplazamiento horizontal a la página entera. Por debajo de 700 el rótulo vuelve encima y el
   control se lleva el ancho completo; de 700 a 900 va delante, que es donde cabe.

## Medido después

| | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Fila | 48, una línea, precio antes del interruptor | 48 | 48 | 48 |
| Alto de la regla | 272 (era 372) | **92** (era 328) | 110 (era 158) | 110 (era 148) |
| Ficha «La oferta» | 575 (era 675) | **254** (era 490) | 272 (era 320) | 253 (era 291) |
| Ancho de un día | 41 | 51 | 38 | 67 |
| Desborde | 0 | 0 | 0 | 0 |

La ficha de móvil sigue en 575 porque ahí dentro hay dos cosas que el mockup no tenía: el párrafo
de ayuda y la cabecera plegable «Configurar oferta». Lo que se rediseñaba —la regla— baja de 372
a 272.

## Lo que NO se hace, y consta

El mockup traía de vuelta un interruptor de «categoría entera» en la cabecera de cada ficha. Se
retiró el 7 de septiembre por decisión expresa del propietario —«esto nunca va a pasar»— y no
vuelve. La pastilla «CAT» de la fila sí se queda: no mete nada, sólo enseña lo que `estado.cats`
ya pueda traer.

## Y una decisión ajena que casi se pierde

Poner la regla en fila subió el botón «Semanal» al lado de los días, y ahí volvía a leerse como un
octavo día apagado — que es exactamente lo que la décima ronda de MISE-B arregló dándole su propia
línea bajo «Frecuencia». Lo guarda `E2E-RH-SEM-01`, y por eso el grupo de días envuelve y
«Semanal» conserva su línea.

## Pruebas

`E2E-OFR-01` (320, 390, 768 y 1440): la fila es rejilla de una línea de 48, cada dato en su x, el
precio siempre antes del interruptor, nada fuera de la tarjeta. `E2E-OFR-02` (390 y 768): los
siete días son un segmentado de segmentos iguales y pegados que no se sale de la ficha, «Semanal»
sigue ahí y la regla no se apila. `E2E-OFR-03`: los atajos van pegados a la caja del número.

Sin commit, sin push, sin deploy, sin FTP. Producción intacta.

## El segmentado de días, y por qué el filete NO puede ir en el día (11 Sep 2026)

Los siete días se estiran a todo el ancho de su línea, y para que se lean como un mando y no como
siete cuadrados sueltos hacen falta un marco y seis separadores. El primer dibujo fue el evidente
—`border:1px` en cada día, `margin-left:-1px` para solapar los filetes— y se veía bien. Estaba mal
por tres razones distintas, y las tres se descubrieron midiendo, no mirando:

1. **Un día no puede llevar borde propio.** `E2E-RH-SEM-01` lee `borderWidth` del día y exige cero,
   y `1px` en «Semanal». No es una formalidad de la prueba: el filete es precisamente una de las
   tres cosas que la décima ronda de MISE-B le dio a «Semanal» para que dejara de leerse como un
   octavo día apagado. Poniéndoselo también al día, se devuelve el defecto que esa ronda cerró.
2. **El filete tampoco puede ir en cada segmento con `box-shadow`.** Con la oferta apagada,
   `.adm-f-ooferta[data-apagada] .adm-dia:has(input:checked)` pone su propio aro de 1,5 px y gana
   por especificidad: los separadores desaparecían justo en ese estado, que es el que trae la
   batería. Medido: `box-shadow` computado del día = `inset 0 0 0 1.5px`, no el separador escrito.
3. **La caja no puede recortar con `overflow` para redondear las esquinas.** Se lleva por delante
   el halo táctil de 44 px, que es lo único que hace tocable un segmento de 41 de ancho. Medido con
   `elementFromPoint`: **40×41 con recorte, 40×45 sin él.** Misma familia que la trampa de la
   cabecera pegada, donde `overflow:hidden` creaba contenedor de desplazamiento y mataba el
   `sticky`: `overflow` nunca es sólo un recorte.

Lo que queda: el marco y los separadores los pone **la caja**. Su fondo es el color del filete, con
1 px de relleno y 1 px de hueco, y los siete días se apoyan encima. Lo que se ve como separación es
el contenedor asomando, así que no depende del estado del día, ningún día tiene borde, y nada
recorta el halo. Medido a 390 / 768 / 1440: hueco 1, `borderWidth` del día 0, halo 40×45, 51×45 y
67×45, cero desbordamiento.

## Ofertas móvil: una tarea continua (11 Sep 2026)

La configuración detallada permanece siempre visible. El mando de encendido, la insignia y la
frase de estado quedan arriba, seguidos por descuento, horario y días sin un desplegable que
oculte una tarea de configuración habitual. No cambia ningún `name`, identificador ni petición de
autoguardado.

Las filas de **Platos sueltos** pasan de cinco columnas rígidas a cuatro: número, nombre, precio e
interruptor. La etiqueta `CAT` sólo aparece cuando explica que el plato ya viene de una categoría;
se coloca sobre el extremo del nombre y reserva espacio dentro de él. Para las filas normales no se
dibuja un punto sin significado. A 320–390 px el nombre conserva al menos 108 px, el precio queda
antes del interruptor y la fila mantiene 48 px de alto, sin desbordamiento.

`E2E-OFR-01` verifica esa composición en 320, 390, 768 y 1440 px. `E2E-OFR-02` conserva la
comprobación del segmentado de días y los límites de alto existentes. No hay commit, push,
despliegue ni cambio de datos.

En 320–390 px la cabecera de **La oferta** comparte una sola línea: título a la izquierda, estado
y activación al borde derecho. En **Platos sueltos**, título y búsqueda ocupan la primera fila y
los dos filtros llenan la segunda a partes iguales; no queda una columna sin función. `E2E-OFR-04`
mide que los mandos estén en la misma línea, alcancen el borde útil y mantengan 40 px de alto.

El título visible de esa barra es **Platos**: se elimina «sueltos» para dejar aire junto a la
búsqueda. La distancia entre ambos conserva el paso amplio del sistema, y el texto de estado de la
oferta usa una altura de línea de 1,5 y separación superior media para que la fecha final no quede
pegada al resto del mensaje.

La configuración de la oferta deja de ser un desplegable. Descuento, horario y días permanecen
visibles en móvil, tablet y escritorio; la separación media después del mensaje de estado conserva
la jerarquía antes de esos controles. `E2E-OF-24` verifica que no exista resumen plegable y que la
regla, la insignia y el interruptor se vean a 390 px.

El aviso nocturno sobre platos agotados solo se muestra en **Platos**. Informa de qué servicio se
está gestionando y cuándo se limpia, por lo que no aparece en Ofertas ni en las demás pantallas.

## Menú móvil: apariencia visible (11 Sep 2026)

En la hoja **Más**, el tema no se comporta como una entrada de navegación. Se sitúa al final,
debajo de **Salir**, separado por un filete y con dos opciones segmentadas de igual ancho, icono y
nombre visibles: **Claro** y **Oscuro**. Cada opción mide al menos 44 px de alto. La disposición
vertical de iconos queda limitada al riel lateral estrecho; nunca afecta a la hoja móvil.
`E2E-RS-HOJA-TEMA` lo comprueba a 390 px.

## Sesión de superadministrador: indicador compacto (11 Sep 2026)

La sesión normal no muestra ningún indicador. Al entrar con la clave de superadministrador,
el rótulo grande deja de ocupar una línea y aparece un icono de escudo de 40 × 40 px en la esquina
superior derecha del panel, con fondo naranja y símbolo beige. Conserva su nombre accesible y un
`title`; no es una acción ni abre una pantalla. El modo demo mantiene su aviso textual porque
explica una condición funcional distinta. `E2E-SU-00` verifica su ausencia en la sesión normal y
`E2E-SU-01` su presencia y tamaño en la sesión de superadministrador.

## Marca: Google y color con jerarquía compacta (11 Sep 2026)

En móvil, los datos de la nota de Google se muestran como campos apilados y legibles; el campo se
rotula «Enlace», conserva su valor completo y queda contenido dentro de la ficha sin scroll
horizontal. La ficha de Color de marca mantiene una composición simple: el selector, hexadecimal
y restauración usan el ancho de la ficha, y las referencias fijas del motor aparecen debajo en
tres chips iguales de una sola fila cuando caben. Estas últimas llevan su rótulo y aclaración
secundarios, y no se confunden con controles editables.

Los rótulos y textos opcionales de las fichas de Marca permiten salto de línea seguro y los
campos no pueden crecer más allá del ancho de su tarjeta en móvil.

En la ficha de Nombre, el campo visible se rotula «Texto pequeño» con su límite breve. En Fotos,
el selector y «Subir» permanecen en una sola fila flexible en móvil para evitar una acción aislada
debajo del selector.

En móvil con sesión, el tablero reduce el relleno horizontal exterior a 8 px por capa (página y
tarjeta), dejando unos 17 px por lado hasta el grid. El relleno interno de cada ficha y el aire
vertical se mantienen; el login y el escritorio no cambian.

La tira de secciones de Platos conserva todas las pestañas en el DOM y usa desplazamiento
horizontal nativo con el dedo, rueda, teclado y flechas. Los controles solo aparecen cuando el
contenido desborda y nunca se ocultan pestañas para fabricar páginas o huecos.
