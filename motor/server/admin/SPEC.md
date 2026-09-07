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
