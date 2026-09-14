# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **14 sep 2026, noche.** `main` = `origin/main` = `57d51c7`. Producción
> sirve `1789414949096` (badges con texto OSCURO, precio rebajado en pastilla). **Hay una rama
> `fix/marca-badges-claros` con UN commit sin integrar**, preparada por decisión del propietario:
> los badges vuelven a texto crema sobre el naranja literal (excepción de fábrica de
> `--badge-ink` repuesta en las cuatro capas), el precio rebajado vuelve a texto plano naranja,
> y las pastillas de dieta pasan a huecas: sin fondo, filete y texto naranja (ya no cuelgan de
> `--badge-ink`), y la cámara de la foto igual: hueca, filete y dibujo naranja, y ya no se
> mueve delante y detrás de los alérgenos (los alérgenos editados se insertan delante de ella,
> no al final del h3). Y número, alérgenos y cámara centrados con el badge en los tres anchos
> (`vertical-align` medido; fila 0,8 px más baja en escritorio). Coste asumido a sabiendas:
> Accesibilidad 97 en PageSpeed;
> Buenas prácticas y SEO siguen en 100. `motor.lock` refirmado; `fast` 37, `smoke` 17, contrato
> de tintas en verde; réplica local: 97/100/100. **Falta la orden de integrar y desplegar.**
>
> Antes, hoy: `3dcde48` (los tres 100 y el CLS del runtime, desplegado como `1789413900535`) y
> `cc6bf42` (`estado.json` a 20 s de borde y HTML a 300 s, desplegado como `1789414949096`, con
> la Cache Rule de Cloudflare cambiada por el propietario). Medido: la caché del borde ayuda a
> los comensales (0,88 s → 0,21 s desde Europa) y NO estabiliza PageSpeed móvil (89, 87, 89, 94:
> Lighthouse mide desde EE. UU. con el PoP frío). Lo que lo estabilizaría es la «portada
> estática» (última entrada de `SPEC.md` sobre caché).
>
> **Después:** el podio del juego (ver abajo: se publicó el juego nuevo SIN vaciarlo antes;
> hay que ponerlo a cero desde el panel cuanto antes), el nombre de Guaza en la carta de Tinge, y
> el alta del restaurante nuevo (`/nuevo-cliente`, fotos en `socialcard_claudecode/0-altas/`).

---

## Lo que se publicó hoy (`3dcde48`)

El propietario pasó PageSpeed y quería recuperar **Accesibilidad, Buenas prácticas y SEO en
100** y mejorar el rendimiento si se podía. Medido con la API de PageSpeed (clave en
`socialcard_claudecode/apligoogle.txt`) sobre producción: 95/97/96/100 en móvil y
99/97/100/100 en escritorio. La entrada nueva de `SPEC.md` («PageSpeed: los tres 100…») tiene
las medidas y las razones; esto es el resumen:

- **Accesibilidad 97 → 100.** Eran las **dos excepciones de contraste pedidas el 4 sep**:
  crema sobre el naranja de fábrica en los badges (`--badge-ink`) y el precio rebajado en
  naranja plano. Las dos a 2,45:1; axe las marcaba en cuatro sitios. **Se retiran las dos**:
  `--badge-ink` = `--accent-ink` para todo color (badges con texto OSCURO sobre naranja,
  6,97:1; la pastilla de dieta vuelve a fondo oscuro con naranja encima), y el precio rebajado
  vuelve a la pastilla de antes del 4 sep. Cambiado en las cuatro capas (temas.mjs, runtime de
  gen.mjs, PHP del panel, contrato de tintas). **La excepción de «Rush» en el juego se queda.**
  **Duró unas horas: el propietario lo vio en producción y pidió los badges claros de vuelta
  (rama `fix/marca-badges-claros`, arriba). Prefiere la marca a esos tres puntos.**
- **Buenas prácticas 96 → 100 (móvil).** La bandera del círculo que pliega la barra se
  estiraba de 4:3 a un cuadrado: `object-fit:cover`.
- **SEO:** ya estaba en 100 en producción. Nada que hacer.
- **Rendimiento (CLS 0,084 en móvil).** La barra de la portada se pliega ya en el primer
  pintado por CSS (`html.js`), el botón del círculo **ya no lleva `hidden` en el HTML** y trae
  la bandera del idioma base; y el hueco de la banda de oferta se reserva antes de montarla
  (memoria en `localStorage` como `has-hero`, más `estado.json` cuando llega). Medido con
  Chrome real: CLS de 0,107 a 0,005. **Lighthouse con perfil limpio seguirá viendo el salto de
  la banda (0,059)** mientras `estado.json` llegue del origen después del primer pintado: eso
  sólo lo arregla una Cache Rule de Cloudflare para `estado.json` (infra del propietario, no
  se ha tocado). Lo demás del rendimiento es el origen (TTFB de 1 s con la regla caducada) y
  el beacon de Cloudflare: fuera del código.

Ficheros tocados: `motor/temas.mjs`, `motor/gen.mjs`, `motor/server/admin/index.php`,
`motor/tests/contrato-tintas.mjs`, `motor.lock`, `SPEC.md`, este `RELEVO.md`. `2-subir/`
rehecha por el build (fuera del repo). Nada más.

## Lo comprobado

- `fast` 37 PASS · `smoke` 17 PASS · contrato de tintas pasa en las cuatro capas.
- `full`: 762 PASS · 18 FAIL. **17 son del panel y ya fallaban** (ver el punto de abajo sobre
  la comparación con `main`); el 18.º, `FULL-92`, es porque `SPEC.md` se editó mientras la
  batería corría: no es del producto.
- Réplica local de producción (build + `estado.json` real + fotos reales, `php -S`):
  Lighthouse 13.4.1 da **Accesibilidad 100 y Buenas prácticas 100** en móvil y escritorio.
  SEO 92 en local es el `robots.txt` que `php -S` sirve como `index.html`; en producción es 100.
- Sin JavaScript: barra entera y sin círculo. Escritorio: sin círculo. Memoria «oferta» con
  estado «sin oferta»: la reserva se deshace y la memoria se corrige a `0`.
- **El 100 real en producción sólo se confirma con PageSpeed después de desplegar.**

## Hallazgo colateral, NO tocado: la carta de Tinge lleva el nombre de Guaza

El `estado.json` público de Tinge tiene `marca.nombreVisible = "Bar / Restaurante Guaza"` y
`rotuloVisible = "Comida casaera canaria"`. **La carta de Tinge en producción muestra el
nombre de otro restaurante** (se ve en la captura de PageSpeed). Se corrige desde Admin →
Marca de Tinge, y es cosa del propietario decidir cuándo. No se ha tocado producción.

## Lo que sigue esperando una decisión del propietario (de sesiones anteriores)

- **`NO_SON_DEL_BUILD`** (`motor/contrato-salida.mjs:44`): export sin consumidor.
- **`fuentes.html`**: se genera, se publica, el `.htaccess` lo deniega y nadie lo lee.
- **`qa/manifiesto-build.json` se mantiene A MANO** y su `como_se_regenera` cita un script
  que no existe.
- **`TINGE_CLIENTE.md:125`** describe un premio del juego que ya no existe.
- **El podio del juego sigue con las marcas del juego viejo** (59 anónima, 49 JORGE, 39 Abel)
  y el juego nuevo YA está en producción: el propietario ordenó desplegar sin pasar antes por el
  panel. Ponerlo a cero desde la pestaña Juego cuanto antes (combo: techo 161; `RECORD_MAX` =
  300).
- **La puerta de Tinge** sigue con la imagen genérica hasta que alguien quite `acceso.jpg`
  por FTP (`deploy.yml` lo excluye).

## Riesgos vivos

- **Producción está al día** (`1789413900535` = `main`). Publicar sigue exigiendo
  `workflow_dispatch` Y `DESPLIEGUE_REAL=true`; la variable está en `false`.
- **Las seis fotos del cliente nuevo** están sueltas en `socialcard_claudecode/0-altas/`, sin
  subcarpeta, hasta que haya nombre.
- **El arrastre de categorías sigue sin probarse en un teléfono real.**
- Los FAIL del panel en `full` (RSP-320, OSC-01..03, E2E-DS-06, E2E-RH-SEM-01, E2E-REJ-01,
  E2E-MOV-01-320, E2E-OFR-02/04, E2E-SEC-06, E2E-SU-01) son anteriores a hoy y de tareas
  ajenas; `E2E-OFR-02` está caducada (techos calculados antes del 13 sep).

## Trampas pagadas (las de hoy, arriba; las de siempre, debajo)

0. **El `[hidden]` global de la carta lleva `!important`.** Ninguna regla de CSS puede
   destapar un elemento con `hidden`: o se quita el atributo desde JavaScript, o el elemento
   no lo lleva y lo esconde una clase. Costó dos vueltas de medir.
0. **En Lighthouse el CLS se OBSERVA, no se simula**, y se observa con perfil limpio y red sin
   estrangular: una reserva que dependa de `estado.json` llega después del primer pintado si
   el estado tarda más que el HTML. Medir con Playwright y red lenta da otro número, y los dos
   son verdad para escenarios distintos.
0. **Los heredocs con comillas simples dentro del texto revientan en la herramienta de
   Bash de esta sesión.** Escribir el script a fichero y ejecutarlo.
0. **`gen.mjs` es CRLF; `temas.mjs`, `index.php` y los tests son LF.** Un reemplazo de texto
   con `\n` no casa en `gen.mjs`; normalizar al leer y devolver al escribir.
0. **`qa full` marca `FULL-92` si se edita cualquier fichero del producto mientras corre**,
   `SPEC.md` incluido. No escribir en el repo durante la batería.
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
18. **`s-maxage` no hace cacheable el HTML en Cloudflare.** Hace falta la Cache Rule; hoy se
    midió `EXPIRED` con 1 s de primer byte: la regla vive, pero 60 s se agotan rápido.
19. **El mensaje de `E2E-RS-TACTIL-44` sólo enseña cuatro entradas.**
20. **Levantar una regla RE-DECLARANDO `display` pisa composiciones de un `@container`.**
21. **Un `<button>` puede pertenecer a un formulario que NO lo contiene**, con `form="id"`.
22. **La caja flotante de renombrar una sección ES el `<form>`.**
23. **`entrarAlPanel()` no puede pasar la primera configuración de un panel recién compilado.**
24. **Enumerar ramas NO es enumerar trabajo sin confirmar.** Mirar `git stash list` también.
25. **Los rangos de cobertura de V8 están ANIDADOS.**
26. **El panel tiene TRES navegaciones con los mismos `data-tab`.**
27. **NUNCA abrir el juego con un navegador automatizado contra PRODUCCIÓN.** Un navegador
    con ventana pasa el filtro de `record.php` y deja marcas reales. Medir contra copia local.
28. **`RECORD_MAX` = 300** y el techo del juego nuevo es **161**.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, `define('DEMO_SIN_CLAVE', true)` en
`admin/config.php` **de la copia** y servir con `php -S`. **Nunca servir `2-subir`
directamente.** Para medir como producción: copiar además el `estado.json` público y las
fotos de `assets/hero/` de producción (son públicas) en la copia; con eso Lighthouse local
reproduce lo que ve PageSpeed salvo la red. La batería (`qa/lib/clientes.mjs`,
`qa/lib/servidor.mjs`, `qa/lib/fixtura-lh.mjs`) ya hace la copia y arranca PHP con `gd` y
`mbstring`.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace. `gh` conectado como
`jorgegpuron`. **Clave de la API de PageSpeed** en `socialcard_claudecode/apligoogle.txt`
(raíz del workspace, dentro de OneDrive: es una clave de API de Google restringible desde su
consola; conviene restringirla a la API de PageSpeed si no lo está). Aviso por voz:
`SAPI.SpVoice` con «Microsoft Helena Desktop». `.claude/launch.json` del workspace lleva
entradas de vista previa a copias temporales: si no existen, se recrean o se borran.
**`.claude/settings.local.json` del workspace lleva desde hoy reglas de permiso** para `git switch`,
`git merge --ff-only`, `git push origin main`, `gh variable set/get`, `gh workflow run` y `gh run
*`: el modo automático bloqueaba merge y despliegue y el propietario las autorizó. La regla del
protocolo no cambia: cada uno sigue exigiendo su orden expresa.
