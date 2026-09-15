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
> | Banco de pruebas | `jorgegpuron/restaurantemenu` | **`cccea65`** | `1789492325801` | **1.4.1** |
> | Bar Restaurante Guaza | `jorgegpuron/bar-restaurante-guaza` | `47ba07e` | `1789464755724` | 1.2.1 |
>
> `DESPLIEGUE_REAL` del banco de pruebas en **`false`**, leído de GitHub después de desplegar.
> **Una sola rama**, `main`, local y remota en el mismo commit: ni una de trabajo sin borrar.
> Árbol limpio salvo `.ai/`, que es basura del 12 sep de un trabajo ya cerrado y se puede borrar.
>
> **Guaza no se tocó hoy**: su fila es la del relevo anterior y su `DESPLIEGUE_REAL` no se ha
> vuelto a leer. No darlo por sabido.

---

## ⚠️ Los dos motores siguen divergidos, y ahora más

El banco de pruebas va por **1.4.1** y Guaza sigue en **1.2.1**. Guaza **no tiene** la licencia,
ni la llave maestra, ni el cierre del `.htaccess`, ni el cron de vencimiento.

Llevárselo exige su propia autorización **y** dos Secrets en **su** repositorio:
`SUPERADMIN_PASSWORD_HASH` (el mismo hash para todos los clientes) y `LICENCIA_TOKEN` (propio).
Y **`licencia.yml` no se copia tal cual**: este repositorio es público y sus issues los ve
cualquiera; en un cliente real el aviso tiene que abrirse en su repositorio privado.

## Lo que se publicó hoy

Cuatro commits, los cuatro en producción, verificados contra el servidor con `curl`.

1. **`52c48c0` — la bolsa de «para llevar» se muda junto a la cámara.** Vivía en `.item-tags`,
   que en el móvil va con `display:none` salvo que la enciendan oferta, destacado o dieta: un
   plato marcado **sólo** para llevar se quedaba sin badge en el teléfono. Ahora es la gemela de
   la cámara en la línea del nombre. Motor 1.3.3 -> 1.3.4.
2. **`b34be7e` — el cron diario del vencimiento.** `admin/licencia-estado.php` (lo hornea
   `gen.mjs` desde `LICENCIA_TOKEN`) y `licencia.yml`, que abre **un issue por vencimiento**, no
   por día. Motor 1.3.4 -> 1.4.0.
3. **`c8f0db1` — `CAR-40` medía mal.** Ver abajo.
4. **`cccea65` — el cron salía verde sin mirar nada.** Ver abajo. Motor 1.4.0 -> 1.4.1.

## Las dos trampas de hoy, y las dos son de método

**1. Una prueba pedía empeorar el producto.** `CAR-40` comparaba la caja de `.price` con la del
nombre, y la caja **incluye el `padding-top`** que es lo que empuja al texto: su centro se mueve
la mitad. Con los 4,5 px correctos el texto queda a **0,00** y las cajas a −1,75; cuadrando las
cajas —8 px— el texto se va **3,5 px abajo**. Una prueba que pide cambiar un CSS hay que
comprobarla **a ella** primero, sobre todo si lo que pide se ve peor.

**2. La alarma salía en verde sin mirar nada.** El cron preguntaba `if .licencia == null` y la
respuesta **con** contrato no traía esa clave: `jq` no distingue «ausente» de «null», así que
daba siempre la rama de «este cliente no se factura». `MC-59..65` pasaban las siete: comprueban
el PHP por un lado y el workflow por el otro, y **lo que falla es la junta**. `MC-66` es lo único
que la mira. **Dos ficheros correctos no hacen un sistema correcto**, y una pieza que sólo se
prueba de verdad disparándola contra producción hay que **dispararla** antes de darla por buena.

## Lo comprobado

- `qa full` **810 PASS · 15 FAIL**, con los 15 fallos **idénticos uno por uno** a la pasada de
  referencia (comparados con `comm`, no a ojo). `qa fast` 37/0 · `qa smoke` 17/0.
- Las nueve pruebas nuevas —`CAR-39`, `CAR-40`, `MC-59..66`— **todas verdes**. `MC-66` probada por
  los dos lados: FAIL sobre la forma vieja, PASS sobre la nueva.
- Medido **contra producción**: build `1789492325801`, los seis ficheros de estado en 403, el
  endpoint en 404 sin token y con token malo, el panel en 200, y el cron disparado a mano
  devolviendo `{"licencia":true,...,"dias":370}` y entrando en la rama del aviso.
- **`L7-01` es sensible a la carga de la máquina**: su presupuesto es `ms < 3000` y con dos
  baterías a la vez dio 3081. En reposo, 1754. Si sale FAIL, repetir antes de investigar nada.

## Lo que espera una decisión del propietario

- **Llevar el motor 1.4.1 a Guaza**, con sus dos Secrets y sin copiar `licencia.yml` tal cual.
- **El panel no dice de dónde lee la llave.** Es lo que costó una hora el 15 sep: `superclave.php`
  (manual) gana a `superadmin.php` (build) **en silencio**.
- **Los 15 fallos conocidos.** Tres (`OSC-01/02/03`) son sólo una decisión: el panel arranca en
  **oscuro** siguiendo el sistema y la prueba exige claro. Otros son contratos que el diseño ya
  superó. `E2E-SEC-06×2` es el único que molesta al usar: la tira de secciones no pagina.
- **El cartel de migración** hardcodea `#fff6e0`; ya existe `.msg.avisa` con tokens.
- `nuevo-cliente.mjs` pone **cinco** secrets: `SUPERADMIN_PASSWORD_HASH` y `LICENCIA_TOKEN` van
  a mano.
- **La contraseña maestra se rotó** el 15 sep y la nueva quedó escrita en una conversación con
  riesgo aceptado. Conviene rotarla otra vez.

## Trampas del entorno ya pagadas

- **UN ORDENADOR A LA VEZ — y una sola sesión.** El 15 sep hubo **tres sesiones escribiendo en el
  mismo working tree**. Ninguna commiteó, las tres mezclaron su trabajo en los mismos ficheros,
  el `motor.lock` quedó escrito para un `gen.mjs` intermedio y **el árbol no compilaba**. Una de
  ellas, ya «parada», siguió viva y borró de `gen.mjs` un bloque que ya estaba commiteado.
  Cerrar las ventanas no basta: hay que ver `isRunning: false`.
- **Un ordenador a la vez.** El `.git` vive en OneDrive. Antes de cambiar de máquina: terminar,
  hacer push, y esperar al ✓ de OneDrive.
- **Editar el panel obliga a regenerar `motor.lock`** antes de compilar, o `FAST-04` tumba la
  batería en cinco segundos sin medir nada.
- **No se toca NINGÚN fichero del repositorio mientras corre la batería**, ni la documentación:
  `FULL-92` lo caza y tira la pasada entera.
- **Un secreto va al PHP entre comillas SIMPLES**, nunca con `JSON.stringify`: un `$` seguido de
  letras interpola y trunca la constante. Le pasó al hash bcrypt el 15 sep por la mañana y estuvo
  a punto de repetirse esa tarde con `LICENCIA_TOKEN`.
- **El desplegador se fía de su inventario** (`.ftp-deploy-sync-state.json`), no del servidor. Un
  fichero borrado a mano **no vuelve con un despliegue** y el run dice `success`.
- **Python escribe CRLF donde el repositorio tiene LF** y convierte un cambio de 25 líneas en uno
  de 1315. Comparar `git diff` con `git diff --ignore-cr-at-eol`.
- **Un 403 no prueba que un fichero exista**: `Require all denied` se evalúa antes de la
  reescritura, así que responde igual exista o no.
- **Nunca jugar automatizado contra producción**: un navegador con ventana pasa el filtro de
  `record.php` y deja marcas reales.
