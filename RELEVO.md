# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> ### Lo primero: esto NO es un cliente
>
> `tinge_of_turmeric/` es el **banco de pruebas** del producto, y tiene que estar vivo y
> desplegado porque ahí es donde el propietario prueba cada cambio en condiciones reales. Lo que
> funciona aquí y le convence **viaja dentro del motor** a las copias. Confirmado por él el 15
> sep 2026. El `CLAUDE.md` del workspace todavía lo lista en una tabla de «clientes»: no lo es.
>
> **El cliente de verdad es `bar-restaurante-guaza/`**, en su propio repositorio, con su propia
> carta viva y sus propios comensales.
>
> Consecuencia práctica: el orden natural de una mejora es **banco de pruebas primero, cliente
> después**. Nunca al revés. Y su marca dice «Bar / Restaurante Guaza» y su podio tiene marcas
> viejas: son **residuos de pruebas**, no incidencias.

> ### Estado, 15 sep 2026, cierre
>
> | | Repo | `main` = remoto | Producción sirve | Motor |
> |---|---|---|---|---|
> | Banco de pruebas | `jorgegpuron/restaurantemenu` | **`f29aa03`** | `1789471771718` | **1.3.1** |
> | Bar Restaurante Guaza | `jorgegpuron/bar-restaurante-guaza` | **`47ba07e`** | `1789464755724` | **1.2.1** |
>
> `DESPLIEGUE_REAL` en **`false`** en los dos, leído de GitHub después de desplegar. Árboles
> limpios salvo `.ai/`.

---

## ⚠️ Lo primero que hay que decidir: los dos motores YA NO son iguales

Hasta hoy los 101 ficheros del motor eran **byte a byte idénticos** en los dos repositorios. Han
dejado de serlo: el banco de pruebas va por **1.3.1** y Guaza sigue en **1.2.1**.

Guaza **no tiene** la licencia, ni la llave maestra, ni el segundo cierre del `.htaccess`. Su
`/admin/superadmin.php` devuelve 404 porque ese fichero no existe allí.

Llevárselo es una tarea con su propia autorización, y exige además crear el Secret
`SUPERADMIN_PASSWORD_HASH` en **su** repositorio con **el mismo hash** que el banco de pruebas —
la llave es una sola para todos los clientes.

## Lo que se publicó hoy: licencia de 370 días y una sola llave maestra

Dos commits, los dos en producción.

**`b8f6c9a` — la licencia y la llave.** El servicio se vende por un año y ese contrato no
existía en el producto; y el acceso de superadministrador exigía una contraseña por cliente.

- `admin/licencia.php` lo escribe **el panel** en producción, como `clave.php`: el build no lo
  genera y el FTP lo excluye. Nace al poner la PRIMERA contraseña, y **sólo ahí**:
  `guardar_clave()` tiene tres llamadores y sólo dos son altas — restablecer la contraseña del
  restaurante es un rescate, no un alta.
- **La licencia NUNCA corta nada.** Ni la carta, ni el panel, ni una sola acción. El contador
  vive en la barra del panel, ámbar bajo 30 días y rojo al vencer. Renovar suma al vencimiento
  si sigue vigente y a hoy si ya venció; el alta no cambia nunca.
- `admin/superadmin.php` lo hornea `gen.mjs` desde el Secret `SUPERADMIN_PASSWORD_HASH` y **sí**
  sube por FTP. Precedencia: variable de entorno > `superclave.php` (manual, **gana al build**) >
  `superadmin.php`. El manual gana a propósito: aísla un cliente sin esperar a un despliegue.
- Se **retira** cambiar la superclave desde el panel: con una llave para todos, cambiarla en un
  panel deja ese cliente con una llave distinta en silencio.

**`f29aa03` — el segundo cierre.** `/admin/superadmin.php` devolvía 200 y `/admin/clave.php`
devolvía 403. No filtraba nada (PHP lo ejecuta, 0 bytes), pero el fichero con la llave de TODOS
los clientes se había quedado con un solo cierre. Ahora los cuatro con secreto dentro
—`clave`, `superclave`, `superadmin`, `activacion`— dan 403.

## Dos trampas que costaron medirlas

1. **El `$` que se comía media llave.** El hash se escribía con `JSON.stringify`, como hace la
   activación. Eso da una cadena PHP de comillas **dobles**, y en un bcrypt `$2y$10$<sal><hash>`
   ese tercer `$` es interpolación: la constante llegaba valiendo `$2y$10`. La activación no lo
   sufre porque su hash es SHA-256 hexadecimal. **Va con comillas simples.**
2. **`generado/` no se vaciaba.** Viaja entera a `2-subir`, así que lo que un build ya no escribe
   pero seguía ahí se publicaba igual: quitar el Secret no quitaba la llave. En CI no pasaba
   (checkout limpio), sólo en la máquina de quien compila. **Ahora se vacía en cada build.**

## Lo comprobado

- `qa full` **795 PASS · 15 FAIL**, sin un solo fallo nuevo sobre los 766/16 de referencia — y
  uno menos, porque `FAST-13` no volvió a salir. `qa fast` 37/0 · `qa smoke` 17/0.
- Pruebas nuevas: `E2E-LIC-01..16`, `MC-50..58`, `ADM-33..36`, `E2E-SU-07/08/12`. Todas verdes.
- Medido **contra producción**, no sólo en local: los cuatro ficheros con secreto en 403, carta
  y panel en 200, y el aviso del Secret desaparecido del log del despliegue.

## Lo que espera una decisión del propietario

- **Llevar el motor 1.3.1 a Guaza**, con su Secret. Ver el aviso de arriba.
- **Los 14 fallos conocidos de la batería.** Tres son sólo una decisión tuya: `OSC-01/02/03`
  fallan porque el panel arranca en **oscuro** siguiendo el sistema y la prueba exige claro. Hay
  que elegir una de las dos. Tres más (`E2E-DS-06`, `E2E-OFR-02×2`) son contratos viejos que el
  diseño ya superó. `E2E-SEC-06×2` es el único que molesta de verdad: la tira de secciones no
  pagina.
- **La rama `feature/licencia-y-superadmin`**, sin borrar.
- **`SUPERADMIN_PASSWORD_HASH` del banco de pruebas está puesto**, y su contraseña quedó escrita
  en la conversación del 15 sep con riesgo aceptado por el propietario. Conviene rotarla.
- En el panel de producción del banco de pruebas: el podio del juego a cero y el nombre de marca,
  que dice «Bar / Restaurante Guaza». Residuos de pruebas.
- **`qa/manifiesto-build.json`** declara `total_obligatorios: 63` y su lista tiene 62 entradas.
  Desfasado desde antes; cosmético, porque la prueba compara la lista y no el número.
- `nuevo-cliente.mjs` pone **cinco** secrets: `SUPERADMIN_PASSWORD_HASH` hay que ponerlo a mano.
  Documentado en `NUEVO_CLIENTE.md` con el comando y marcado 🔧.
- **`NO_SON_DEL_BUILD`** (`motor/contrato-salida.mjs`): export sin consumidor.
- **`fuentes.html`**: se genera, se publica, el `.htaccess` lo deniega y nadie lo lee.

## Trampas del entorno ya pagadas

- **Un ordenador a la vez.** El `.git` vive en OneDrive. Antes de cambiar de máquina: terminar,
  hacer push, y esperar al ✓ de OneDrive.
- **Las capturas de pantalla no funcionan.** Para enseñar algo: levantar el servidor y comprobar
  por JavaScript lo que se afirme.
- **Nunca jugar automatizado contra producción**: un navegador con ventana pasa el filtro de
  `record.php` y deja marcas reales. Medir siempre contra una copia local de `2-subir`.
- **Editar el panel obliga a regenerar `motor.lock`** antes de compilar, o `FAST-04` tumba la
  batería entera en cinco segundos sin medir nada.
- **Cuidado con Python en estos ficheros**: escribe CRLF donde el repositorio tiene LF y convierte
  un cambio de 25 líneas en uno de 1315. Comparar siempre `git diff` con
  `git diff --ignore-cr-at-eol`.
