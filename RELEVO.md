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
> | Banco de pruebas | `jorgegpuron/restaurantemenu` | **`8670ebf`** | `1789484936635` | **1.3.3** |
> | Bar Restaurante Guaza | `jorgegpuron/bar-restaurante-guaza` | **`47ba07e`** | `1789464755724` | **1.2.1** |
>
> `DESPLIEGUE_REAL` en **`false`** en los dos, leído de GitHub después de desplegar. Árboles
> limpios salvo `.ai/`.

---

## ⚠️ Los dos motores siguen divergidos

El banco de pruebas va por **1.3.3** y Guaza sigue en **1.2.1**. Guaza **no tiene** la licencia,
ni la llave maestra, ni el cierre del `.htaccess` para los ficheros de estado.

Llevárselo exige su propia autorización **y** crear el Secret `SUPERADMIN_PASSWORD_HASH` en **su**
repositorio con **el mismo hash**: la llave es una sola para todos los clientes.

## Lo que se publicó hoy

Cuatro commits, los cuatro en producción.

1. **`b8f6c9a` — licencia de 370 días y una sola llave maestra.** `admin/licencia.php` lo escribe
   el panel; nace al poner la PRIMERA contraseña y sólo ahí (`guardar_clave()` tiene tres
   llamadores y sólo dos son altas). `admin/superadmin.php` lo hornea `gen.mjs` desde el Secret.
   Precedencia: entorno > `superclave.php` (manual, **gana al build**) > `superadmin.php`.
2. **`f29aa03` — el segundo cierre del `.htaccess`** para `superadmin` y `activacion`.
3. **`065b40e` — la fecha al pie y el aviso a 7 días.** El contador estaba en la barra lateral,
   que sólo rotula a partir de 1024 px: en un portátil no existía. Ahora la **fecha** va siempre
   en la chapa de versión del pie y el **aviso** sólo los últimos 7 días, arriba y para los dos
   roles.
4. **`8670ebf` — `licencia.php`, el sexto que le faltaba el cierre.**

**La licencia nunca corta nada.** Vencida, el aviso dice «La carta y el panel siguen
funcionando». Sin licencia escrita no se pinta nada: un molde no tiene plazo.

## Cuatro trampas que costó pagar, y cómo se encontraron

Ninguna la detectó la batería: **las cuatro viven en el servidor o en el despliegue**.

1. **El `$` de bcrypt.** El hash se escribía con `JSON.stringify` → cadena PHP de comillas
   dobles → `$2y$10$<sal>` interpola y la constante se queda en `$2y$10`. Va con comillas
   simples. La activación no lo sufría: su hash es SHA-256 hexadecimal.
2. **`generado/` no se vaciaba.** Viaja entera a `2-subir`, así que lo que un build ya no escribe
   pero seguía ahí se publicaba igual. Ahora se vacía en cada build.
3. **El desplegador se fía de su inventario** (`.ftp-deploy-sync-state.json`), no del servidor.
   Un fichero borrado a mano **no vuelve con un despliegue** y el run dice `success`. Sólo volvió
   al cambiar el CONTENIDO (rotando el Secret).
4. **`licencia.php` devolvía 200** mientras sus cinco vecinos daban 403. Se encontró **midiendo
   producción con `curl` después de desplegar**, no leyendo el código: la auditoría había dado
   por hecho que «va en `admin/`, que el `.htaccess` no sirve», y ese `.htaccess` deniega **por
   nombre**.

## La hora que el propietario pasó fuera de su propio panel

Vale la pena tenerlo presente, porque es un fallo de diseño y no de uso:

- `superclave.php` (manual) **gana** a `superadmin.php` (build), **en silencio**. Un fichero
  olvidado de hace meses dejó fuera la llave nueva y el panel no da ninguna pista de dónde lee.
- Los dos nombres se diferencian en tres letras: al pedir renombrarlos a mano se movió el
  equivocado dos veces.
- El bloqueo por intentos (8 fallos, 15 min) **rechaza aunque la clave sea correcta**, así que un
  intento fallido no prueba nada. Se limpia borrando `admin/intentos.json`.

Se resolvió con un `.php` temporal en `admin/` que imprime `SUPERADMIN_ORIGEN` y qué ficheros
existen, sin imprimir ningún hash. **Ese diagnóstico se borró del servidor.**

## Lo comprobado

- `qa full` **800 PASS · 15 FAIL**, con los 15 fallos **idénticos uno por uno** a la referencia
  (comparados con `comm`, no a ojo). `qa fast` 37/0 · `qa smoke` 17/0.
- `E2E-LIC-01..18`, `MC-50..58`, `ADM-33..36`: todas verdes.
- Medido **contra producción**: los seis ficheros de estado en 403, el pie con `licencia hasta
  20/09/2027` a cualquier ancho, y el contraste del aviso en los dos temas (5,67:1 y 7,96:1).

## Lo que espera una decisión del propietario

- **El cron del aviso de vencimiento.** Acordado el diseño: un workflow diario que pregunta a
  cada cliente sus días restantes y **abre un issue de GitHub**, que ya manda correo. Falta que
  el propietario diga **a qué dirección** (tiene que estar verificada en su cuenta de GitHub, o
  montar SMTP aparte). Sin esto, **nadie se entera de un vencimiento salvo que abra el panel**.
- **Llevar el motor 1.3.3 a Guaza**, con su Secret.
- **El panel no dice de dónde lee la llave.** Es lo que causó la hora perdida. Dos candidatos:
  enseñarlo en Ajustes, o replantear que el fichero manual gane siempre al del build.
- **Tres ramas sin borrar**: `feature/licencia-y-superadmin`, `feature/licencia-al-pie`,
  `fix/licencia-htaccess`.
- **Los 14 fallos conocidos.** Tres (`OSC-01/02/03`) son sólo una decisión: el panel arranca en
  **oscuro** siguiendo el sistema y la prueba exige claro. Tres más son contratos que el diseño
  ya superó. `E2E-SEC-06×2` es el único que molesta al usar: la tira de secciones no pagina.
- **El cartel de migración** hardcodea `#fff6e0`; ya existe `.msg.avisa` con tokens que cambia en
  oscuro.
- `nuevo-cliente.mjs` pone **cinco** secrets: `SUPERADMIN_PASSWORD_HASH` se pone a mano.
- **La contraseña maestra se rotó** (15 sep, tarde) y la nueva quedó escrita en la conversación
  con riesgo aceptado. Conviene rotarla otra vez.

## Trampas del entorno ya pagadas

- **Un ordenador a la vez.** El `.git` vive en OneDrive. Antes de cambiar de máquina: terminar,
  hacer push, y esperar al ✓ de OneDrive.
- **Editar el panel obliga a regenerar `motor.lock`** antes de compilar, o `FAST-04` tumba la
  batería en cinco segundos sin medir nada.
- **No se toca NINGÚN fichero del repositorio mientras corre la batería**, ni la documentación:
  `FULL-92` lo caza y tira la pasada entera.
- **Python escribe CRLF donde el repositorio tiene LF** y convierte un cambio de 25 líneas en uno
  de 1315. Comparar `git diff` con `git diff --ignore-cr-at-eol`.
- **Un 403 no prueba que un fichero exista**: `Require all denied` se evalúa antes de la
  reescritura, así que responde igual exista o no.
- **Nunca jugar automatizado contra producción**: un navegador con ventana pasa el filtro de
  `record.php` y deja marcas reales.
