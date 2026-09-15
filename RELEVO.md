# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> ### Lo primero: esto NO es un cliente
>
> `tinge_of_turmeric/` es el **banco de pruebas** del producto, y tiene que estar vivo y
> desplegado porque ahí es donde el propietario prueba cada cambio en condiciones reales. Lo que
> funciona aquí y le convence **viaja dentro del motor** a las copias.
>
> **El cliente de verdad es `bar-restaurante-guaza/`**, en su propio repositorio.
>
> Consecuencia práctica: el orden natural de una mejora es **banco de pruebas primero, cliente
> después**. Nunca al revés.

> ### Estado, 15 sep 2026, cierre
>
> | | Repo | `main` = remoto | Producción sirve | Motor |
> |---|---|---|---|---|
> | Banco de pruebas | `jorgegpuron/restaurantemenu` | **`dbc9de9`** | `1789508281131` | **1.4.3** |
> | Bar Restaurante Guaza | `jorgegpuron/bar-restaurante-guaza` | `47ba07e` | `1789464755724` | 1.2.1 |
>
> `DESPLIEGUE_REAL` del banco de pruebas en **`false`**, leído de GitHub después de desplegar.
> **Una sola rama**, `main`, local y remota en el mismo commit. `git status` no devuelve ni una
> línea: ni `.ai/` ni temporales.
>
> **Guaza no se tocó hoy**: su fila es la del relevo anterior y su `DESPLIEGUE_REAL` no se ha
> vuelto a leer. No darlo por sabido.

---

## ⚠️ Los dos motores siguen divergidos, y ahora mucho

El banco de pruebas va por **1.4.3** y Guaza sigue en **1.2.1**. Guaza **no tiene** la licencia,
ni la llave maestra, ni el cierre del `.htaccess`, ni el cron de vencimiento, ni nada de lo de hoy.

Llevárselo exige su propia autorización **y** dos Secrets en **su** repositorio:
`SUPERADMIN_PASSWORD_HASH` (el mismo hash para todos los clientes) y `LICENCIA_TOKEN` (propio).
Y **`licencia.yml` no se copia tal cual**: este repositorio es público y sus issues los ve
cualquiera; en un cliente real el aviso tiene que abrirse en su repositorio privado.

## Lo que se publicó hoy

Ocho commits. Los seis de producto, en orden:

1. **`52c48c0`** — «para llevar» pasa de `.item-tags` a un icono redondo junto a la cámara, para
   arreglar que en el móvil no se veía. **Superado por el 7**: el icono no convenció al verlo.
2. **`b34be7e`** — el cron diario del vencimiento: `admin/licencia-estado.php` + `licencia.yml`,
   un issue por vencimiento y no por día.
3. **`c8f0db1`** — `CAR-40` medía la caja del precio, que incluye el relleno que empuja al texto.
4. **`cccea65`** — el cron salía **en verde sin mirar nada**: `jq` no distingue clave ausente de
   clave nula.
5. **`f26ef2a`** — «para llevar» vuelve a ser una pastilla de **texto**, en negro (`--solid` /
   `--solid-ink`), delante de vegano y sin gluten, y **también en la ficha** de la foto.
6. **`dbc9de9`** — el selector de tema también se pliega en el **riel de escritorio**.

## Las cuatro lecciones del día, y las cuatro son de método

1. **Una prueba puede pedir que empeores el producto.** `CAR-40` comparaba la caja de `.price`
   con la del nombre, y esa caja **incluye el `padding-top`** que empuja al texto: su centro se
   mueve la mitad. Con los 4,5 px correctos el texto queda a **0,00** y las cajas a −1,75;
   cuadrando las cajas —8 px— el texto se va **3,5 px abajo**. Antes de cambiar un CSS porque lo
   pide una prueba, **comprueba la prueba**.
2. **Dos ficheros correctos no hacen un sistema correcto.** El endpoint de licencia y su cron
   pasaban sus siete pruebas cada uno; lo que fallaba era **la junta**. `MC-66` es lo único que
   la mira. Y una pieza que sólo se prueba de verdad disparándola contra producción hay que
   **dispararla** una vez, a mano, mirando el log.
3. **Lo que se publica hay que mirarlo.** El icono de «para llevar» pasó todas las medidas y se
   descartó al verlo. La batería dice si algo está roto, no si está bien.
4. **`git merge` auto-fusiona `motor.lock` como texto.** 101 hashes fusionados línea a línea
   pueden salir correctos o Frankenstein, y por fuera no se distingue. **Rebasar** —este
   historial es lineal— y **regenerar** el lock con `motor/lock.mjs --escribir --version`, nunca
   resolverlo a mano ni darlo por bueno.

## Lo comprobado

- `qa full` sobre `main` con las dos tareas dentro: **813 PASS · 15 FAIL**, con los 15 fallos
  **idénticos uno por uno** a la referencia (comparados con `comm`, no a ojo). `qa fast` 37/0 ·
  `qa smoke` 17/0 · suite del panel 570/12.
- Las **ocho** pruebas nuevas del día —`CAR-39`, `CAR-40`, `CAR-41`, `MC-59..66`, `E2E-TE-12/13`—
  todas verdes. `MC-66` y `CAR-41` probadas por los dos lados.
- Medido **contra producción**: build `1789508281131`, `item-tag-llevar` en las 312 filas y
  `has-llevar` en cero, la regla del riel servida en el panel, los seis ficheros de estado en
  403, el endpoint en 404 sin token, y el cron devolviendo `{"licencia":true,…,"dias":370}` y
  entrando en la rama del aviso.
- **`L7-01` es sensible a la carga de la máquina**: su presupuesto es `ms < 3000` y con dos
  baterías a la vez dio 3081. En reposo, 1754. Si sale FAIL, **repetir antes de investigar nada**.

## Lo que espera una decisión del propietario

- **C — el activador de idiomas en Ajustes.** Diseñado y aprobado a medias: el idioma **base no
  se desactiva** (así «siempre queda 1» es imposible de romper, ni por POST). Faltan dos
  decisiones: (a) apagar un idioma **esconde** sus campos sin borrar las traducciones —
  recomendado—; (b) ¿interruptor de panel, que esconde pero **no adelgaza** el HTML, o
  configuración de build, que adelgaza pero exige recompilar y desplegar para cambiarlo?
- **Llevar el motor 1.4.3 a Guaza**, con sus dos Secrets y sin copiar `licencia.yml` tal cual.
- **El panel no dice de dónde lee la llave.** `superclave.php` (manual) gana a `superadmin.php`
  (build) **en silencio**. Es lo que costó una hora el 15 sep.
- **Rotar otra vez la contraseña maestra**: la de hoy quedó escrita en una conversación.
- **Los 15 fallos conocidos.** Tres (`OSC-01/02/03`) son sólo una decisión: el panel arranca en
  **oscuro** siguiendo el sistema y la prueba exige claro. `E2E-SEC-06×2` es el único que molesta
  al usar: la tira de secciones no pagina.

## Trampas del entorno ya pagadas

- **UNA SOLA SESIÓN A LA VEZ sobre el árbol.** El 15 sep hubo **tres escribiendo a la vez**.
  Ninguna commiteó, el `motor.lock` quedó escrito para un `gen.mjs` intermedio, **el árbol no
  compilaba**, y una sesión ya «parada» siguió viva y borró un bloque ya commiteado. Cerrar la
  ventana **no** la para: hay que verla en `isRunning: false`.
- **Un ordenador a la vez.** El `.git` vive en OneDrive. Antes de cambiar de máquina: terminar,
  hacer push, y esperar al ✓ de OneDrive.
- **Nada de backticks en los comentarios del runtime de `gen.mjs`**: ese bloque vive dentro de una
  template literal y un backtick la cierra. `SyntaxError` y el build no arranca.
- **Una excepción dentro de `page.evaluate` tira la pasada ENTERA**, no sólo su comprobación. Un
  selector sin acotar —`.item-tag-llevar` cogía también el clonado en la ficha— costó 25 minutos.
- **Editar el panel obliga a regenerar `motor.lock`** antes de compilar, o `FAST-04` tumba la
  batería en cinco segundos sin medir nada.
- **No se toca NINGÚN fichero del repositorio mientras corre la batería**: `FULL-92` lo caza y
  tira la pasada entera.
- **Un secreto va al PHP entre comillas SIMPLES**, nunca con `JSON.stringify`: un `$` seguido de
  letras interpola y trunca la constante. Le pasó al hash bcrypt y estuvo a punto de repetirse
  con `LICENCIA_TOKEN`.
- **El desplegador se fía de su inventario** (`.ftp-deploy-sync-state.json`), no del servidor. Un
  fichero borrado a mano **no vuelve con un despliegue** y el run dice `success`.
- **Python escribe CRLF donde el repositorio tiene LF** y convierte un cambio de 25 líneas en uno
  de 1315. Comparar `git diff` con `git diff --ignore-cr-at-eol`.
- **Un 403 no prueba que un fichero exista**: `Require all denied` se evalúa antes de la
  reescritura, así que responde igual exista o no.
- **Nunca jugar automatizado contra producción**: un navegador con ventana pasa el filtro de
  `record.php` y deja marcas reales.
