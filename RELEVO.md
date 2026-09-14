# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **14 sep 2026, cierre** · `main` = `origin/main`, **una sola rama** aquí
> y en GitHub, árbol limpio salvo `.ai/`, sin stashes. **`motor.lock` cuadra**, versión 1.1.8.
> **`DESPLIEGUE_REAL` leída de GitHub: `false`.** Producción sirve **`1789398047116`**, que NO
> lleva nada de hoy: el build local es `1789405975651`. Nada de lo de hoy está publicado, y es
> deliberado.
>
> **Lo siguiente es dar de alta un restaurante nuevo**, y se hace **en una conversación nueva**,
> empezando por `/nuevo-cliente`. Sus fotos están en `socialcard_claudecode/0-altas/`. Lo único
> que falta para arrancar: **el nombre del restaurante y su destino en `socialcard.es/<algo>/`**.

---

## Lo que cambió hoy

Tres commits, en este orden, los tres ya en GitHub:

1. **`0448080` — el juego.** Combo con multiplicador, tramo final Rush y golpe de acierto.
2. **`206d212` — diez símbolos muertos fuera.** `datoTexto`, `GROUPS`, `TAB_ICON`, `TAB_INTRO` y
   `slug` de `gen.mjs`; `ETIQUETA_ES_POR_CLAVE` de `alergenos.mjs`; `numeros_de_categoria` y
   `renumerar_por_posicion` del panel; `diferenciaDocroots`, `tamanoDe` y `servidoresVivos` de la
   batería. 85 líneas menos, y **lo compilado sale byte a byte idéntico**.
3. **`9b8fee0` — el aviso de alérgenos.** Listaba ocho claves en vocabulario legado y **seis
   alérgenos de la UE no salían en ninguna forma**: crustáceos, cacahuetes, soja, apio,
   altramuces y moluscos. Ahora nombra las catorce canónicas. Los alias siguen aceptándose.

Además, fuera del repositorio: se pasó de **19 ramas locales y 5 remotas a una sola rama**, aquí
y en GitHub; se borraron dos worktrees huérfanos que rompían cada `fetch`, el stash del 2 sep
—una corrección a `NUEVO_CLIENTE.md` que daba por inexistentes cuatro piezas que hoy existen— y
cuatro ficheros sueltos de la raíz del workspace (`api.txt` y `Nuevo Documento de texto.txt`,
vacíos; `logo.svg` y una copia byte a byte de `ANALISIS-DIVERGENCIAS.md`). Se cerró el token de
Cloudflare, y las fotos del cliente nuevo salieron de la carpeta de Tinge.

**Hay un informe de auditoría completo de esta sesión** —ramas, código muerto medido con
cobertura de navegador, duplicación, arquitectura y dependencias— que **no vive en el
repositorio**: se entregó al propietario como fichero. Lo que de aquí importa está resumido
abajo; si hace falta el detalle con sus medidas, pedírselo.

## Nada está a medias

- **Árbol limpio, sin stashes, tres ramas locales**: `main`, `ds2026-importado` (histórico previo
  al rebase, borrable) y `feature/chilli-rush-combo` (ya fusionada en `main`, borrable).
- `fast` 37 PASS y `smoke` 17 PASS al cierre. `verificar-build`: 62 ficheros obligatorios.
- `.ai/` sigue sin tocar: son encargos del 12 sep escritos desde la OTRA máquina.

## Lo que está esperando una decisión del propietario

- ~~El token de Cloudflare~~ **CERRADO.** Había un `apitokenflare.txt` en la raíz del workspace
  con un token de API en texto plano dentro de OneDrive. Se usó en su día para optimizar el
  perfil del dominio raíz `socialcard.es`, tarea ya terminada y cuya configuración vive en
  Cloudflare, no en el token. **El propietario lo borró en Cloudflare y después se borró el
  fichero**, en ese orden. Puede quedar rastro en la papelera y el historial de versiones de
  OneDrive: inofensivo, porque la llave ya no vale. **Lección: un secreto no se arregla borrando
  el fichero; el secreto es la cadena, y hay que invalidarla primero.**
- ~~La foto de la puerta~~ **CERRADO, y con una corrección al diagnóstico.** Era verdad que
  `acceso.jpg` y `motor-acceso.jpg` eran byte a byte idénticas, pero **NO** que un cliente nuevo
  la heredara en producción: `deploy.yml:192` excluye `admin/acceso*.jpg`, así que esa imagen
  nunca sube. El diseño era correcto. Lo único anómalo era que el hueco de «foto de ESTE
  restaurante» estuviera ocupado por la genérica, con lo que el respaldo no se ejecutaba jamás.
  **Se borró `acceso.jpg` del motor** (`b721c97`) y se comprobó en un servidor de revisión que la
  puerta cae al respaldo: `motor-acceso.jpg`, 900×600, sin fallos. **Ojo:** la producción de
  Tinge ya tiene ese fichero subido y el exclude impide que se actualice o se borre solo — la
  puerta de Tinge seguirá con la imagen genérica hasta que alguien la quite por FTP.
- **`NO_SON_DEL_BUILD`** (`motor/contrato-salida.mjs:44`): export sin consumidor, citado en
  `SPEC.md`. O el gate de «sobrantes» nunca se construyó, o se perdió.
- **`fuentes.html`**: se genera, se publica y el `.htaccess` lo deniega por HTTP, y **nadie lo
  lee**. Su comentario dice «lo lee el PHP del disco» y eso ya no es cierto.
- **`qa/manifiesto-build.json` se mantiene A MANO.** Su propio campo `como_se_regenera` dice
  `npm --prefix qa run manifiesto:escribir`, y **ese script no existe** en `qa/package.json`:
  nada en `qa/` lo escribe, sólo lo leen `fast.mjs` y `fixtura-lh.mjs`. Corregir ese campo, o
  escribir el generador que promete.
- ~~La duda del premio del juego~~ **RESUELTA.** El encargo **sí se ejecutó**: `SPEC.md:3386`
  dice que el premio «se ha quitado entero —objetivo, texto del premio, minutos, el código
  `CR-DDMM-…`, la pantalla del camarero, el reloj, los canjes y el salto a la reseña— y en su
  lugar queda **el récord de la casa**». En el panel sólo queda el interruptor. Lo que está mal
  es **`TINGE_CLIENTE.md:125`**, que sigue describiendo «objetivo 10, 1 minuto, premio ¡1 BEBIDA
  GRATIS! 🥤 en los tres idiomas». **Es documentación caducada y conviene corregirla**: describe
  una configuración que ya no existe.

### Atado al despliegue del juego, y sólo entonces

- **Poner el podio a cero desde el panel ANTES de desplegar el juego nuevo** (pestaña Juego;
  poner a cero borra `record.json`). Producción tiene hoy tres marcas —**59 anónima del 14 sep,
  49 JORGE, 39 Abel**, verificadas leyendo `record.json` público— y **son del juego anterior**,
  cuyo techo medido era ~62 puntos. Con el combo, un toque perfecto da **161** y un jugador
  bueno pasa de 100: el podio viejo se batiría en la primera partida y dejaría de servir como
  referencia. **No vaciarlo antes de tiempo**: si se vacía hoy, producción sigue con el juego
  viejo y se vuelve a llenar de marcas viejas. Es lo último antes de publicar.

## Riesgos vivos

- **Producción está dos builds por detrás y a propósito.** Publicar exige `workflow_dispatch` Y
  `DESPLIEGUE_REAL` en `true` a la vez: un push nunca despliega, ni de ensayo. Los dos runs de
  hoy salieron con «Subir por FTP» en `skipped`.
- **Las seis fotos del cliente nuevo ya NO están dentro de Tinge.** Se movieron a
  `socialcard_claudecode/0-altas/` —huellas md5 verificadas antes y después— y la carpeta
  `tinge_of_turmeric/0-alta/` se eliminó. **Quedan sueltas, sin subcarpeta**: la convención es
  `0-altas/<nombre-slugificado>/` y todavía no se sabe cómo se llama el restaurante. En cuanto
  haya nombre, meterlas en su subcarpeta. **No está confirmado si faltan páginas de la carta**
  (en las seis no hay bebidas ni postres); el propietario lo está consultando.
- **El arrastre de categorías sigue sin probarse en un teléfono real**, sólo emulado.
- **Los 12 `FAIL` de `admin-e2e`** (de 540) son de tareas ajenas y anteriores. `E2E-OFR-02`
  (línea 4478) fija techos de altura calculados ANTES del cambio de contrato del 13 sep y está
  caducada. **`E2E-RH-SEM-01` NO lo está**, al contrario de lo que se venía diciendo: el CSS la
  cita por nombre en `index.php:10696` y `10729` como algo que implementa a propósito.

## Lo medido, para que nadie lo vuelva a proponer

- **Adelgazar la CARTA quitando CSS no compensa**: los 16.334 bytes crudos que ningún escenario
  pinta son **2.217 bytes** transferidos con Brotli.
- **En el PANEL sí compensa**: el 49,7% de su CSS no se pinta y son **8.867 bytes** transferidos,
  el 35% de su CSS. Pero **no hay lista de borrado todavía**: la medición se hizo dentro del
  panel y `.page-login`, los avisos y las pantallas de error salen «sin usar» porque no se
  visitaron. Y lo que Tinge no pinta puede pintarlo el siguiente cliente.
- **Los 57 manejadores del panel no se repiten**: cero grupos con la misma secuencia de llamadas.
- **No hay endpoints ni campos de formulario huérfanos**: los 28 candidatos son claves
  compuestas (`$_POST['red_' . $k]`, `name="<?= $catCampo ?>"`) o llegan por `$_FILES`.
- **La hoja de fuentes de Google al 0% es un falso positivo**: la cobertura no marca `@font-face`,
  y la red confirma que las dos familias se descargan.

## Trampas pagadas

1. **Un `*/` dentro del texto de un comentario CSS** cierra el comentario antes de tiempo.
2. **Un `var()` que apunta a un token declarado en un DESCENDIENTE no resuelve.** Los tokens van
   en `:root`.
3. **Contar reglas no dice si una regla pinta algo.** Medir con coverage de navegador.
4. **Una transición puede quedarse pegada**, y con la pestaña en segundo plano
   `requestAnimationFrame` no corre: toda limpieza de clase necesita además un `setTimeout`.
5. **Medir contraste**: `color(srgb …)` va de 0 a 1, y hay que componer las capas translúcidas.
6. **Los componentes ocultos no se miden si no se abren.**
7. **Un grep ingenuo confunde el CSS con una fuga de datos.** Acotar al marcado.
8. **`gen.mjs` rechaza compilar si algo del motor cambia sin refirmar `motor.lock`.** Bajo el lock
   están los 100 ficheros de `motor/` —`gen.mjs`, `alergenos.mjs`, `index.php` y el `SPEC.md` del
   panel incluidos— más los dos envoltorios de la raíz. `qa/**` y el `SPEC.md` de la raíz, no.
9. **La terminal del propietario es PowerShell**: `&&` no vale, se usa `;`.
10. **Imports ESM con ruta absoluta de Windows necesitan `file:///`**.
11. **Fijar SIEMPRE el viewport antes de medir.** Con el panel escalando el viewport emulado,
    `getBoundingClientRect` da píxeles escalados y `getComputedStyle` los de CSS.
12. **Un heredoc puede comerse los `\\` dobles.** Una expresión regular entró como `[^"\]` y
    tumbó el bloque `<script>` entero.
13. **`motor/lock.mjs` no puede refirmar un `motor.lock` en conflicto**: lo parsea como JSON.
14. **OneDrive bloquea `.git/rebase-merge` y `.git/worktrees/`.** Hoy dejó dos worktrees que git
    no podía podar y que rompían cada `fetch`: **se borran con PowerShell, no con git.**
15. **`offsetParent` NO sirve para saber si algo se puede enfocar.**
16. **Optimizar bytes SIN COMPRIMIR es optimizar un número que nadie paga.** El servidor sirve
    Brotli.
17. **Un halo táctil no puede salir de un scroller horizontal.**
18. **`s-maxage` no hace cacheable el HTML en Cloudflare.** Hace falta la Cache Rule, ya creada.
    Si desaparece, el caché vuelve a `DYNAMIC` **sin avisar**.
19. **El mensaje de `E2E-RS-TACTIL-44` sólo enseña cuatro entradas.**
20. **Levantar una regla RE-DECLARANDO `display` pisa composiciones de un `@container`.**
21. **Un `<button>` puede pertenecer a un formulario que NO lo contiene**, con `form="id"`.
22. **La caja flotante de renombrar una sección ES el `<form>`.**
23. **`entrarAlPanel()` no puede pasar la primera configuración de un panel recién compilado.**
24. **Enumerar ramas NO es enumerar trabajo sin confirmar.** Hoy había un stash que no salía en
    `git status` ni en `git branch`. Un stash caído se pierde con un `gc`, a diferencia de una
    rama. Mirar también `git stash list`, `git fsck --lost-found` y el `reflog`.
25. **Los rangos de cobertura de V8 están ANIDADOS**: sumarlos da más que el total y el JS sale
    al 100%. Hay que pintar un mapa de bytes donde el rango más interno manda.
26. **El panel tiene TRES navegaciones con los mismos `data-tab`** —barra lateral, barra móvil y
    hoja «Más»— y las que no tocan están ocultas: `page.click` se queda esperando a una invisible.
27. **NUNCA abrir el juego con un navegador automatizado contra PRODUCCIÓN.** La marca anónima de
    59 puntos del 14 sep que hay en el podio la dejó una sesión de agente jugando contra la carta
    real. Y **no es un fallo de `record.php`**: su filtro (línea 37) corta `headless`, `bot`,
    `curl`, `python`… y lo hace bien. El problema es que **hay dos formas de pasarlo sin querer,
    y las dos son normales aquí**:
    - **Un navegador automatizado CON VENTANA** —Playwright MCP, el panel de vista previa de la
      app— anuncia el user-agent de un Chrome corriente. Comprobado: `HeadlessChrome/152` lo
      corta el filtro; `Chrome/152` **pasa igual que una persona**. Esto es lo que dejó la marca.
    - **La batería de QA**, que en `qa/lib/navegador.mjs:27` pone el agente de un Chrome normal
      **a propósito**, porque sin eso el marcador contesta 204 y la prueba del récord no mide nada.

    O sea: **por diseño, un navegador conducido por un agente es indistinguible de un cliente del
    bar.** Se juega siempre contra una copia local de `2-subir`: sin `estado.json` ni
    `record.json` el juego funciona y no envía nada.
28. **`RECORD_MAX` = 300** (`config.php:260`) y el techo perfecto medido del juego nuevo es
    **161**. Por encima de `RECORD_MAX` el servidor da por inexistente la partida. Si algún
    release sube la densidad o la puntuación, **recalcular el techo ANTES de publicar** o se
    rechazarán con 400 partidas legítimas.

## Servidor de revisión

No vive en el repositorio. Copiar `2-subir` al temporal, poner `define('DEMO_SIN_CLAVE', true)`
en `admin/config.php` **de la copia** y servir con `php -S`. **Nunca servir `2-subir`
directamente.** Más cómodo: reutilizar la batería —`qa/lib/clientes.mjs` (`docrootDesde`),
`qa/lib/servidor.mjs` (`servidorPhp`) y `qa/lib/navegador.mjs`—, que ya hace la copia, arranca
PHP con `gd` y `mbstring` y trae Chrome con recolectores de consola y de peticiones fallidas.

## Herramientas

`stitch` (MCP de Google, HTTP) en ámbito local de este workspace, en `C:\Users\sopor\.claude.json`
(no viaja por OneDrive; la clave conviene rotarla). `gh` conectado como `jorgegpuron`. Aviso por
voz para esperas largas: `SAPI.SpVoice` con «Microsoft Helena Desktop» por COM; acepta SSML con
`<pitch>` y `<rate>` pasando el flag `8`. `.claude/launch.json` del workspace lleva entradas de
vista previa que apuntan a copias temporales de sesiones concretas: si no existen, se recrean o
se borran.
