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
> | | Repo | `main` = remoto | Producción sirve |
> |---|---|---|---|
> | Banco de pruebas | `jorgegpuron/restaurantemenu` | **`7c8fc72`** | `1789464561800` |
> | Bar Restaurante Guaza | `jorgegpuron/bar-restaurante-guaza` | **`47ba07e`** | `1789464755724` |
>
> `DESPLIEGUE_REAL` en **`false`** en los dos, leído de GitHub después de desplegar. Árboles
> limpios salvo `.ai/`. Una sola rama en cada repo. `motor.lock` **1.2.1**, 101 ficheros del
> motor + 2 envoltorios, **byte a byte iguales en los dos**. Nada a medias.

---

## Lo que se publicó hoy (cinco cosas, en los dos repos)

1. **El móvil de SocialCard del pie: 617798557 → 647744457.** Estaba escrito dos veces a pelo;
   ahora es `SOCIALCARD_WA`, una constante del motor. No es el teléfono del restaurante —ése lo
   pone él en la pestaña Marca— es el único dato de SocialCard que la carta publica.

2. **El buscador ya no levanta el teclado en el móvil.** El foco entra siempre en la hoja —es un
   diálogo con `aria-modal`— pero cae en el campo **sólo con puntero fino**. Una sola puerta,
   dentro de `openSheet()`, reusando el `esTactil()` que ya existía.

3. **El motor deja de nombrar a ningún restaurante, y el build lo vigila.**
   `motor/tests/contrato-multicliente.mjs`, enganchado en `verificar-build.mjs`: si el motor cita
   el rótulo, el slug, la ruta o el `vocabulario` del cliente desde el que se compila, **el build
   se para**. Se limpiaron 50 citas. `--detectar` reescrito: revisa `motor/` y `server/` sin
   exención de hash, saca los términos del propio `cliente.mjs`, e informa fichero:LÍNEA.

4. **Una copia nueva nace con la marca de SocialCard**, no con un dibujo anónimo.
   `motor/iconos/marca-socialcard.svg`. Y el `?v=` del icono pasa a hashear el fichero que de
   verdad se publica: antes valía `'motor'` fijo y Cloudflare habría servido la marca vieja 30
   días.

5. **El paginado de la ficha deja de moverse.** El hueco de la foto va siempre —sin foto, el
   marco 4/5 con la cámara— así que todas las diapositivas miden lo mismo, y los puntos se fijan
   a `--s3` por arriba y por abajo. `colocarPuntos()` desaparece entera, 45 líneas.

## Lo comprobado

- `qa full` **766 PASS · 16 FAIL** · `qa fast` 37/0 · `qa smoke` 17/0 · `FULL-92` PASS.
- **De los 16 FAIL, 15 son los del panel**, anteriores y de tareas ajenas (OSC-01..03, E2E-DS-06,
  E2E-RH-SEM-01, E2E-REJ-01, E2E-MOV-01-320, E2E-OFR-02/04, E2E-SEC-06, E2E-SU-01). El 16.º fue
  `FAST-13` y es la trampa 29 de abajo, no un defecto.
- **Medido contra las dos producciones**, no sólo en local: pie con el número nuevo, el teclado
  que no sube con el dedo, las cuatro diapositivas a 469 px con aire 21/21,3, y la cámara de
  83 px en el plato sin foto. Consola limpia en las dos.
- `E4` **cerrado** (`--detectar` ya revisa `server/`): la batería lo cantó sola como
  `UNEXPECTED PASS`. La comprobación se queda como guardia.

## Lo que sigue esperando una decisión del propietario

- **En el panel de producción del banco de pruebas:** el podio del juego a cero, y el nombre de
  marca, que dice «Bar / Restaurante Guaza». Residuos de pruebas; se limpian cuando estorben.
- **`cliente.mjs` de Guaza no declara `vocabulario`.** Es opcional y la puerta le protege igual
  con nombre, slug y ruta. Conviene ponérselo.
- **`NO_SON_DEL_BUILD`** (`motor/contrato-salida.mjs`): export sin consumidor.
- **`fuentes.html`**: se genera, se publica, el `.htaccess` lo deniega y nadie lo lee.
- **`qa/manifiesto-build.json` se mantiene A MANO** y su `como_se_regenera` cita un script que no
  existe.
- **`TINGE_CLIENTE.md:125`** describe un premio del juego que ya no existe.
- **La puerta del banco de pruebas** sigue con la imagen genérica hasta que alguien quite
  `acceso.jpg` por FTP (`deploy.yml` lo excluye).
- **En el servidor de Guaza, `admin/superclave.php` lleva el texto de ejemplo dentro.** No es un
  agujero —ese valor no valida ninguna contraseña— sólo enseña la puerta de superadministrador
  sin que se pueda cruzar. El propietario lo descartó: va a cambiar el mecanismo.
- **CI cuenta 62 ficheros en `2-subir` y aquí salen 63.** Anterior a todo esto.

## Riesgos vivos

- **Las dos producciones están al día.** Publicar sigue exigiendo `workflow_dispatch` Y
  `DESPLIEGUE_REAL=true`, y la variable está en `false` en los dos repos.
- **El arrastre de categorías sigue sin probarse en un teléfono real.**

## Trampas pagadas (las de hoy, arriba; las de siempre, debajo)

29. **Un cambio del MOTOR pide `qa full` ANTES de desplegar, no sólo `fast` y `smoke`.** El 15 sep
    el cambio del favicon subió a las dos producciones con `fast` y `smoke` en verde: `MC-13` y
    `MC-14` llevaban rotas y nadie lo supo hasta correr `full`, que tarda 22 minutos. No hubo
    defecto en producción, pero la batería estuvo roja a ciegas.
29. **No lanzar `qa full` recién salido de `gen.mjs`.** Su foto inicial de `2-subir` puede pillarla
    a medio escribir —OneDrive sincroniza esa carpeta— y `FAST-13` sale FAIL con
    `cambiados: (ninguno)` y una lista de «nuevos». Sobre el árbol quieto pasa. Dejar respirar.
29. **`qa full` marca `FULL-92` si se edita CUALQUIER fichero del producto mientras corre**,
    `SPEC.md` incluido. Redactar fuera del repo y pegarlo al terminar.
29. **El clasificador del modo automático corta `gh variable set DESPLIEGUE_REAL`** con
    `[Production Deploy]`, aunque la regla esté en la allowlist de `settings.local.json`. Va por
    encima de la allowlist: hay que pedírselo al propietario o salir del modo automático.
29. **`--detectar` apuntado contra el propio banco de pruebas encuentra su nombre en su casa** y
    da ocho «restos» que son el dato correcto. Desde hoy se niega a ejecutarse así.
29. **Una suposición puede ser verdad en una puerta y mentira en otra.** «Aquí no se abre ninguna
    ficha sin foto» era cierto para `abrirFicha()`, que exige `data-foto`, y falso llegando por
    «Combina con». Ahí vivía el bug del paginado.
29. **Los heredocs de `bash` se comen las barras invertidas de un regex.** `/^i18n\..*\.mjs$/`
    salió como `/^i18n..*.mjs$/` y ni `node --check` ni la batería lo vieron: seguía funcionando,
    sólo que aceptando de más. Lo cazó leer el diff antes de integrar. Para parches con escapes,
    la herramienta de edición, no un script por heredoc.
0. **El `[hidden]` global de la carta lleva `!important`.** Ninguna regla de CSS puede destapar un
   elemento con `hidden`: o se quita el atributo desde JavaScript, o el elemento no lo lleva y lo
   esconde una clase.
0. **En Lighthouse el CLS se OBSERVA, no se simula**, y con perfil limpio y red sin estrangular.
0. **`gen.mjs` es CRLF; `temas.mjs`, `index.php` y los tests son LF.** Un reemplazo con `\n` no
   casa en `gen.mjs`; normalizar al leer y devolver al escribir.
1. **Un `*/` dentro del texto de un comentario CSS** cierra el comentario antes de tiempo.
2. **Un `var()` que apunta a un token declarado en un DESCENDIENTE no resuelve.**
3. **Contar reglas no dice si una regla pinta algo.** Medir con coverage de navegador.
4. **Una transición puede quedarse pegada**; toda limpieza de clase necesita un `setTimeout`.
5. **Medir contraste**: `color(srgb …)` va de 0 a 1, y hay que componer las capas.
6. **Los componentes ocultos no se miden si no se abren.**
7. **Un grep ingenuo confunde el CSS con una fuga de datos.** Acotar al marcado.
8. **`gen.mjs` rechaza compilar si algo del motor cambia sin refirmar `motor.lock`.**
9. **La terminal del propietario es PowerShell**: `&&` no vale, se usa `;`.
10. **Imports ESM con ruta absoluta de Windows necesitan `file:///`**.
11. **Fijar SIEMPRE el viewport antes de medir.**
12. **Un heredoc puede comerse los `\\` dobles.**
13. **`motor/lock.mjs` no puede refirmar un `motor.lock` en conflicto.**
14. **OneDrive bloquea `.git/rebase-merge` y `.git/worktrees/`.** Se borran con PowerShell.
15. **`offsetParent` NO sirve para saber si algo se puede enfocar.**
16. **Optimizar bytes SIN COMPRIMIR es optimizar un número que nadie paga.**
17. **Un halo táctil no puede salir de un scroller horizontal.**
18. **`s-maxage` no hace cacheable el HTML en Cloudflare.** Hace falta la Cache Rule.
19. **El mensaje de `E2E-RS-TACTIL-44` sólo enseña cuatro entradas.**
20. **Levantar una regla RE-DECLARANDO `display` pisa composiciones de un `@container`.**
21. **Un `<button>` puede pertenecer a un formulario que NO lo contiene**, con `form="id"`.
22. **La caja flotante de renombrar una sección ES el `<form>`.**
23. **`entrarAlPanel()` no puede pasar la primera configuración de un panel recién compilado.**
24. **Enumerar ramas NO es enumerar trabajo sin confirmar.** Mirar `git stash list` también.
25. **Los rangos de cobertura de V8 están ANIDADOS.**
26. **El panel tiene TRES navegaciones con los mismos `data-tab`.**
27. **NUNCA abrir el juego con un navegador automatizado contra PRODUCCIÓN.** Un navegador con
    ventana pasa el filtro de `record.php` y deja marcas reales. Medir contra copia local.
28. **`RECORD_MAX` = 300** y el techo del juego nuevo es **161**.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, `define('DEMO_SIN_CLAVE', true)` en
`admin/config.php` **de la copia** y servir con `php -S`. **Nunca servir `2-subir`
directamente.** Para medir como producción: copiar además el `estado.json` público y las fotos
de `assets/hero/` y `assets/platos/` de producción (son públicas) en la copia. **Sin las fotos
de platos no se puede abrir ninguna ficha**: `abrirFicha()` exige `data-foto`, y ahí viven los
fallos del carrusel. La batería (`qa/lib/clientes.mjs`, `qa/lib/servidor.mjs`,
`qa/lib/fixtura-lh.mjs`) ya hace la copia y arranca PHP con `gd` y `mbstring`.

## Propagar el motor a un cliente

Desde DENTRO del cliente, nunca de servidor a servidor y nunca una copia suelta por fuera:

```
cd <cliente>/1-proyecto
node motor/actualizar.mjs --desde <ruta del banco de pruebas>/1-proyecto
node importar.mjs && node gen.mjs      (o --build-local si el panel pide activación)
```

Es transaccional: exige git limpio, comprueba los dos locks y hace rollback si algo falla antes
del commit. Después, comprobar que los 101 ficheros del motor quedan byte a byte iguales — a
mano, no fiándose del lock. **Lo que NO es motor no viaja**: `server/**` y `.gitignore` son del
cliente y hay que corregirlos en su sitio.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace. `gh` conectado como
`jorgegpuron`. **Clave de la API de PageSpeed** en `socialcard_claudecode/apligoogle.txt`.
Aviso por voz: `SAPI.SpVoice` con «Microsoft Helena Desktop». `.claude/launch.json` del workspace
lleva entradas de vista previa a copias temporales: si no existen, se recrean o se borran.
`.claude/settings.local.json` del workspace lleva reglas de permiso para `git switch`,
`git merge --ff-only`, `git push origin main`, `gh variable set/get`, `gh workflow run` y
`gh run *` — pero ver la trampa 29 sobre el clasificador. La regla del protocolo no cambia:
commit, push, merge y despliegue exigen cada uno su orden expresa.
