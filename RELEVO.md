# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **4 sep 2026** · **Paleta oscura, contraste garantizado, iconos de
> alérgenos y Rush claro, en producción real de Tinge — Guaza sin tocar**

---

## Dónde estamos

**Todo lo de esta ronda está en `main`, pusheado y DESPLEGADO REALMENTE en producción de
Tinge.** Último commit desplegado **`ae4d044`**, build servido **`1788559421753`**, en
**https://socialcard.es/tinge_of_turmeric/menu2/** — comprobada y funcional.

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`) — `main` local =
`origin/main` = GitHub `main` = `ae4d044dced42840e878edf124deb8628844aaaa`. **Sin trabajo
técnico abierto de esta tanda** (lo único sin confirmar es este propio `RELEVO.md`). Sigue
habiendo un `stash` aparcado de antes de la Fase 7 (auditoría vieja de `NUEVO_CLIENTE.md`)
— **no tocado en ninguna de estas sesiones, no es de esta ronda.**

**Los cuatro despliegues de esta ronda**, los cuatro con el procedimiento seguro completo:

**1 — `2e80955`, build `1788554415766`** (paleta, contraste e iconos de alérgenos):

- Ensayo, evento `push`: run **`33917053413`** — `completed` / `success`, `dry-run: true`.
- Despliegue real, `workflow_dispatch`: run **`33917362409`** — `completed` / `success`,
  `dry-run: false`, build completo y 61 ficheros obligatorios verificados.
- FTP: **7 reemplazos, 0 altas, 0 borrados** (`Uploading: 0 B — Deleting: 0 B`). Los siete:
  `404.php`, `admin/cliente.php`, `admin/index.php`, `admin/tokens.css`, `index.html`,
  `juego.html`, `version.json`.

**2 — `9004f69`, build `1788555907133`** (`fix: muestra Rush claro con el tema de fábrica`):

- Ensayo, evento `push`: run **`33919309924`** — `completed` / `success`, `dry-run: true`.
- Despliegue real, `workflow_dispatch`: run **`33919402411`** — `completed` / `success`,
  `dry-run: false`, build completo y 61 ficheros obligatorios verificados.
- FTP: **6 reemplazos, 0 altas, 0 borrados** (`Uploading: 0 B — Deleting: 0 B`). Los seis:
  `404.php`, `admin/cliente.php`, `admin/tokens.css`, `index.html`, `juego.html`,
  `version.json`. (`admin/index.php` no entra: el panel no pinta Rush y su CSS no cambió.)
- Comprobado en producción: «Rush» en **`#F6F4F4`** en las dos cápsulas — la de la carta
  (`.game-card-word--badge`) y la del juego (`#s-intro h1 em`) —, con «Chilli» y el botón
  Jugar intactos en `#121212`.

**3 — `7c2a69d`, build `1788556944831`** (`fix: sincroniza rush-ink desde Admin`):

- Ensayo, evento `push`: run **`33920683216`** — `completed` / `success`, `dry-run: true`.
- Despliegue real, `workflow_dispatch`: run **`33920776617`** — `completed` / `success`,
  `dry-run: false`, build completo y 61 ficheros obligatorios verificados.
- FTP: **4 reemplazos, 0 altas, 0 borrados**: `admin/cliente.php`, `index.html`,
  `juego.html`, `version.json`.
- Arregla un hueco de propagación del despliegue anterior: `--rush-ink` se emitía bien en el
  build, pero el runtime del juego (`aplicarColorPrincipal` en `motor/juego.mjs`) no lo
  reescribía al cambiar el Primario desde el panel. Con un Primario azul, Rush se quedaba en
  el `#F6F4F4` COMPILADO sobre un metal ya recalculado — **3,74:1**. Ahora recalcula y da
  `#121212`, **4,57:1**. Reproducido y verificado con `estado.json` local antes y después.

**4 — `ae4d044`, build `1788559421753`** (`fix: garantiza contraste para cualquier color de marca`):

- Ensayo, evento `push`: run **`33923754173`** —
  https://github.com/jorgegpuron/restaurantemenu/actions/runs/33923754173 — `completed` /
  `success`, `dry-run: true`.
- Despliegue real, `workflow_dispatch`: run **`33923867766`** —
  https://github.com/jorgegpuron/restaurantemenu/actions/runs/33923867766 — `completed` /
  `success`, `dry-run: false`.
- FTP: **5 reemplazos, 0 altas, 0 borrados**: `admin/cliente.php`, `admin/index.php`,
  `index.html`, `juego.html`, `version.json`.
- **Endurecimiento del contraste.** Antes, si ninguna de las dos tintas del sistema llegaba
  a 4.5:1 sobre el color de marca, el color se rechazaba entero. Un gris medio cae justo en
  ese hueco: **`#777777`** da 4.1834:1 contra `#121212` y 4.0868:1 contra `#F6F4F4`, las dos
  cortas. Ahora la tinta cae a negro o blanco puro, la que más contraste dé: **`#777777` →
  `#000000`, 4.6895:1**. El peor caso posible de ese respaldo es 4.5826:1, así que siempre
  pasa el umbral. `colorPrincipal` no se toca nunca. La excepción del naranja de fábrica
  sigue intacta.
- **El contrato de color es ya una puerta del despliegue, con PHP obligatorio.**
  `motor/tests/contrato-tintas.mjs` compara las cuatro capas que calculan la tinta (Node,
  runtime de carta, runtime de juego y `derivar_principal()` del panel) y además comprueba
  que lo calculado se APLICA al DOM. Corre dentro de `motor/verificar-build.mjs`, así que un
  desajuste corta el despliegue. **Si falta el binario `php`, es un fallo, no un aviso**: sin
  esa capa el contrato no se puede dar por bueno, y es la única que además rechaza colores al
  guardar. `deploy.yml` lleva un paso `php -v` antes de compilar; el runner trae **PHP
  8.3.6**, confirmado en este run.
- Contrato en los dos runs: **0 fallos**, con PHP dentro.

En los cuatro: `DESPLIEGUE_REAL` verificado `false` antes, puesto a `true` sin BOM, run
identificado por SHA + evento + rama + `databaseId` nuevo, esperado hasta `completed`, y
**restaurado y verificado en `false`** al terminar. **Mutables e imágenes, protegidos e
intactos** en los cuatro: `estado.json`, `record.json`, `admin/clave.php`,
`admin/superclave.php`, `assets/hero/**` y `assets/platos/**` — ninguno escrito ni borrado.
Doble garantía: 0 altas y 0 borrados en cada run, y todos ellos en la lista de exclusión del
workflow.

**Bar Restaurante Guaza** (`bar-restaurante-guaza/1-proyecto`, repo `bar-restaurante-guaza`) —
**sin tocar**, a propósito, ni en la Fase 8 ni en esta ronda. Comprobado en solo lectura:
`main` local = `origin/main` = **`609e3af`**, árbol limpio. Su build de producción no se
recomprobó en esta sesión; el último anotado aquí fue `1788484550343`. Sigue en el sistema de
5 temas antiguo — la migración a color-de-marca-configurable está pensada pero no diseñada
para Guaza todavía. `dedos_las_americas` y `reginacafe`, también intactos y limpios.

Los dos con **`DESPLIEGUE_REAL = false`**. El motor de los dos clientes **ya NO es idéntico**:
Tinge tiene el sistema de color nuevo, la paleta oscura y los iconos de alérgenos importados;
Guaza, el de 5 temas — divergencia conocida y deliberada mientras Guaza no se migre.

---

## Qué se desplegó en esta ronda (commits `2e80955`, `9004f69`, `7c2a69d` y `ae4d044`)

- **Paleta oscura nueva**: Oscuro **`#121212`** y Secundario **`#2C2626`**, las dos constantes
  del motor en `motor/temas.mjs`. Todo lo demás sigue derivándose sola de ahí, sin recolorear
  nada a mano.
- **Excepción visual de badges**: con el naranja de fábrica **`#FF7517`** exacto, el texto de
  los badges es `--badge-ink` = **`#F6F4F4`**. Con cualquier otro `colorPrincipal`, se adapta
  solo por `--accent-ink`. Un solo criterio para todo badge con fondo `--accent`.
- **Degradado inferior de la ficha y placeholder de la foto, ligados a `var(--ink)`**: el
  degradado sale de `--ink` por `color-mix`, sin un negro propio, así que funde con el fondo
  real de la página en vez de dejar costura.
- **«Rush» con contraste automático según el fondo real de cada cápsula**, y **claro con el
  tema de fábrica** (`9004f69`): con `#FF7517` exacto las dos cápsulas pintan `#F6F4F4` — la
  de la carta por `--badge-ink`, la del juego por **`--rush-ink`**, un token nuevo. Con
  cualquier otro `colorPrincipal`, `--badge-ink` ES `--accent-ink` y `--rush-ink` ES
  `--metal-ink`: cada cápsula vuelve a calcular su tinta sobre SU propio fondo. La excepción
  es un token aparte, no un cambio en `--metal-ink`, precisamente para que el botón Jugar, la
  fila del marcador y las bandas —que comparten `--metal-ink`— NO la hereden. Fuera de
  `PAREJAS` a propósito, igual que `--badge-ink`: baja de 4.5:1 a sabiendas.
  El token se propaga en las **tres** capas que lo necesitan: el build (`cssMarca()`, que
  recorre `derivar()` genéricamente, así que también lo lleva `admin/tokens.css`), el runtime
  de la carta (por `--badge-ink`, que `aplicarMarca` ya reescribía) y el runtime del juego
  (`aplicarColorPrincipal`, añadido en `7c2a69d`). El PHP del panel **no** lo necesita: no
  pinta Rush por ninguna parte — comprobado, cero apariciones de `game-card-word`.
- **14 SVG oficiales de alérgenos como fuente única**: viven en
  `motor/iconos/alergenos-oficiales/<clave>.svg` y `motor/alergenos.mjs` los lee de disco al
  compilar. No hay una segunda copia de la geometría dentro del módulo. Las 14 claves y su
  orden legal (Anexo II del Reglamento UE 1169/2011) no se tocaron; solo cambió el dibujo.
  El build los incrusta en el HTML: no se despliegan como ficheros públicos.
- **18 indicadores adicionales, aislados**: `motor/indicadores.mjs` + los SVG de
  `motor/iconos/indicadores-adicionales/`. Catálogo real derivado del directorio, con orden
  determinista (`.sort()` sobre claves ASCII, no `localeCompare`). **Sin ningún importador:
  no entran en el build público** — verificado en el `2-subir` desplegado.
- **Cobertura ES/DE completa para los 14 alérgenos**: faltaban seis traducciones
  (`Crustaceans`, `Soybeans`, `Celery`, `Peanuts`, `Lupin`, `Molluscs`) en la sección `ui` de
  `i18n.es.mjs` e `i18n.de.mjs`. Con ellas, un cliente nuevo puede declarar cualquiera de las
  14 sin romper el build. Tinge sigue mostrando las 8 suyas de siempre.
- **`motor.lock` v1.1.8**: 99 ficheros + 2 envoltorios.

---

## Qué se hizo (Fase 8 — el detalle está en `git log` y en `SPEC.md`)

Sustituye el sistema de 5 temas fijos (`laurel`/`onice`/`caoba`/`mar`/`ciruela`) por un color de
marca configurable por cliente. Pasó por tres vueltas de ajuste en la misma sesión, cada una
sobre lo aprobado en la anterior — el contrato que queda cerrado es el de la última:

- **Contrato final**: un solo color de cliente, `colorPrincipal` (por defecto `#FF7517`),
  declarado en `cliente.mjs` y editable después, en caliente, desde **Admin → Marca**, sin
  recompilar. Secundario (`#3E3939`), Oscuro (`#2C2727`) y Neutral (`#F6F4F4`) son constantes
  **del motor** (`motor/temas.mjs`) — iguales para cualquier cliente, no se piden en
  `/nuevo-cliente`, no se declaran en `cliente.mjs`, no se editan en el panel.
  *(Los dos hex de esta línea son los de la Fase 8 y ya no son los vigentes: la ronda del 4
  sep 2026 los cambió a Secundario `#2C2626` y Oscuro `#121212`. El contrato —quién es
  constante del motor y quién del cliente— no cambió.)*
- **Identidad del acento respetada**: `colorPrincipal` se conserva literal en `--accent` — nunca
  se oscurece para forzar texto blanco encima. El texto/icono sobre un fondo del acento elige
  entre Oscuro y Neutral (el que lea), nunca fabrica un tono nuevo.
- **Fallback de tres niveles, igual en los tres sitios que lo calculan** (Node en el build, PHP
  en el panel, JS en la carta y el juego — mismA aritmética, verificada bit a bit idéntica):
  `estado.json.marca.colorPrincipal` → `cliente.mjs` (`CLIENTE_COLOR_PRINCIPAL`) → `#FF7517`.
- **Admin → Marca**: picker + campo hex sincronizados, botón «Restaurar color original»,
  Secundario/Oscuro/Neutral solo lectura. Formato validado en frontend (HTML5 `pattern`),
  contraste validado en backend (PHP, mensaje claro si no se lee bien) — probado con un color
  sin contraste suficiente: rechazado, nada persistido.
- **`/nuevo-cliente`**: `--color-principal` opcional, sin él usa `#FF7517`. Las banderas
  `--color-secundario`/`--color-oscuro` de una vuelta intermedia de esta misma sesión se
  retiraron en el ajuste final — no existen en la versión que queda.
- **Sistema de 5 temas, eliminado entero de Tinge**: `TEMAS`, el selector del panel, `data-tema`,
  `admin/temas.json`, las 10 imágenes `acceso-<tema>.jpg`/`motor-acceso-<tema>.jpg` — sin
  sistema paralelo, sin resto.
- **Probado de punta a punta, en vivo, no solo en cálculo**: cambiar el Primario desde el panel
  y verlo reflejado sin recompilar en carta, ficha con foto, badges de destacado y juego;
  refresh (persiste); restaurar (vuelve a `cliente.mjs`); rechazo de color inválido en frontend
  y backend; consola limpia. `node gen.mjs` y `motor/verificar-build.mjs` en verde,
  `git diff --check` limpio, Guaza confirmado intacto en cada tanda.

**Ajuste visual posterior, mismo día, pedido expreso sobre la Fase 8 ya en producción**:
- Botón «Buscar platos» (`.menu-fab`): pasó de sólido (`--solid`) + filete del acento a
  fondo `--accent` liso + texto `--accent-ink` — coincide con el resto de acentos de marca.
- Badge de descuento (`.item-tag-offer`), etiqueta «OFERTA» de la ficha (`.dsheet-flag`, las
  dos variantes) y precio rebajado (`.price-now`, que pasó a pastilla porque el acento como
  texto suelto no llega a 4.5:1): los tres, del rojo semántico fijo (`--offer`) al acento de
  marca — **decisión consciente que sustituye la de la Fase 8**, que documentaba justo lo
  contrario («un descuento que no es rojo no se lee como descuento»). De paso corrigió un
  contraste que llevaba roto en producción desde la Fase 8 sin que nadie lo notara: el badge
  de descuento heredaba `color:var(--accent-ink)` de `.item-tag` con fondo `--offer` —
  2.62:1, por debajo de 4.5.
- Fondo general (`body{background:var(--ink)}`) ya estaba en `#2C2727` desde la Fase 8 —
  solo se confirmó, no cambió. *(Superado: hoy es `#121212`, ver la ronda del 4 sep 2026.)*
- El rojo de las ofertas se mantiene igual en: la marquesina de aviso (`.offer-banner`, que
  nunca usó `--offer`, usa `--ink` tenue), y los elementos decorativos del juego (bomba de
  la tarjeta promocional, el «%» del logo) — ninguno de los dos es un badge/precio de la
  carta y ninguno se tocó.

---

## Qué queda pendiente

1. **Migrar Guaza al color de marca configurable.** Sigue en el sistema de 5 temas antiguo, sin
   tocar a propósito durante toda la Fase 8 y su ajuste posterior. Motor de los dos clientes
   divergente mientras esto no se haga — divergencia conocida, no un descuido.
2. **Prueba en vivo del cambio de color desde Admin → Marca, contra producción real, no hecha.**
   Igual que ya pasaba con el nombre/rótulo: no hay contraseña de admin real de Tinge a mano en
   este ordenador. Todo lo demás (color visible, badges, botón Buscar, precio de oferta) sí está
   confirmado en vivo contra producción — ver `git log` para el detalle de cada smoke test.
3. **Sincronizar el motor entre Tinge y Guaza sigue siendo manual.** Sin herramienta que lo
   automatice — y ahora mismo, además, los dos motores ya no son iguales (punto 1).
4. **Icono de «Meat & Seafood» en Tinge**: usa `meat` desde antes de que existiera `seafood`. No
   urgente, sin tocar.
5. **Evaluar mejoras visuales con 21st MCP**, usándolo como fuente de referencias y
   componentes. Condición dura al hacerlo: **no introducir React, Tailwind, shadcn ni ninguna
   dependencia sin autorización expresa** — cualquier componente que se elija se adapta a
   HTML, CSS y JavaScript nativos, que es como está hecho el motor entero.

Ya no está pendiente, no hace falta repetirlo en el siguiente cierre: alérgenos de extremo a
extremo, la Fase 7 entera, la congelación del alta levantada, el botón de foto y Admin → Marca
(nombre/rótulo) en producción, **el sistema de color de marca configurable y su ajuste visual
posterior**, y **la paleta oscura, el contraste de badges y los iconos de alérgenos de la ronda
del 4 sep 2026 — todo diseñado, implementado, probado y DESPLEGADO EN PRODUCCIÓN de Tinge**.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **Un icono no se juzga por el trazo vectorial ampliado ni con el zoom del navegador: hay que
  rasterizarlo al tamaño real.** Técnica: dibujar el SVG en un `<canvas>` al tamaño real en
  píxeles, y sólo entonces volver a dibujarlo ampliado con `imageSmoothingEnabled = false`. El
  `zoom` del panel de Chrome de esta herramienta no recorta región todavía.
- **Un `<span class="i18n">` puede vivir DENTRO de otro elemento que no lleva sus propios
  `data-<idioma>`.** Si algo necesita leer o escribir la traducción de verdad, hay que apuntar
  al span que lleva `class="i18n"`, no al contenedor — `.textContent` del contenedor "funciona"
  por accidente (agrega el de sus hijos) pero `.dataset` no, y sólo se nota al intentar volver
  atrás.
- **Un servidor `php -S` con `2-subir` abierta bloquea su propio `rm` al recompilar.** Parar el
  servidor de pruebas antes de cualquier `node gen.mjs`. Comprobar con
  `Get-CimInstance Win32_Process -Filter "Name='php.exe'"` (o `tasklist`) qué hay corriendo y
  qué sirve cada uno — puede haber más de uno de una sesión anterior.
- **`session.save_path` de un `php -S` de prueba tiene que existir ANTES de arrancar el
  servidor, o las sesiones no persisten y cada petición ve un CSRF distinto** — el síntoma es
  "La página ha caducado" en bucle, aunque el formulario esté bien. `mkdir` la carpeta primero.
- **El PHP de este ordenador (WinGet) no carga `mbstring` por defecto.** Para probar en local
  algo que dependa de él hace falta pasar
  `-d extension_dir=<ruta>\ext -d extension=php_mbstring.dll` a mano al arrancar `php -S` — la
  ruta real de esta máquina es
  `C:\Users\sopor\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\ext`,
  no `C:\php\ext` (esa carpeta no existe aquí).
- **Un cliente con `activacionPanel: true` (nacido de `/nuevo-cliente`) pide token de
  activación, no sólo contraseña, la primera vez.** Para probarlo en local hace falta generar
  un token + su SHA-256 a mano, compilar con `PANEL_ACTIVACION_HASH` puesto a ese hash, y
  activar con el token (nunca con el hash). Tinge en sí usa el bootstrap simple ("Configurar
  acceso"), no token: no aplica al probar Tinge, sólo a un cliente nacido de `/nuevo-cliente`.
- **`gh run list` sin filtrar puede devolver el run anterior** en los primeros segundos tras un
  push o un dispatch. Filtrar siempre por SHA completo + evento + rama.
- **En el ensayo (`dry-run: true`), que `Uploading`/`Replacing` no sea 0 no es una alarma por sí
  sola** — leer siempre la lista de ficheros del log antes de aprobar el despliegue real.
- **El panel del navegador puede quedar "hidden" para el propio agente**, o `read_page` devolver
  "(empty page)" con viewport 0x0 sin motivo aparente, y entonces `computer` (click, screenshot)
  falla o da falsos vacíos aunque la página siga viva y el DOM esté correcto. `get_page_text`,
  `javascript_tool` y `getComputedStyle()` siguen siendo fiables en ese estado — apoyarse en
  ellos, y para clicks fiables cuando el `computer` por coordenada falla, disparar el evento por
  JS directamente (`el.click()`, o `nativeInputValueSetter.call(el, valor)` +
  `dispatchEvent(new Event('input', {bubbles:true}))` para rellenar un campo controlado).
- **La consola del navegador acumula errores entre navegaciones dentro de la misma pestaña.**
  Para un veredicto limpio, probar en una pestaña nueva. Ojo también con falsos positivos: la
  petición a `404.php` sale con status HTTP 404 a propósito (`http_response_code(404)`), y eso
  aparece en consola como "error" aunque la página se sirva y renderice bien — no es un fallo.
- **Las pruebas ancladas a un reloj de pared mienten.** Anclar las pruebas a la fecha de
  servicio calculada, nunca a una fija.
- **Node en Windows NO entiende las rutas `/c/Users/...` de Git Bash.** Dentro de un
  `node -e "..."`, esa ruta se resuelve como relativa y acaba en `C:\c\Users\...` → `ENOENT`.
  El shell sí las entiende (`ls`, `cd`, `rm` funcionan), por eso despista. Dentro del código
  JS hay que escribirla con letra de unidad: `C:/Users/...`.
- **`motor.lock` revienta el build si se edita código del motor después de haber re-lockeado.**
  Es el sistema funcionando, no un bug: cualquier edición de motor posterior a
  `node motor/lock.mjs --escribir` exige repetir el lock antes de `node gen.mjs`, aunque sea un
  cambio mínimo de un comentario o un texto.
- **Un `<input type=color>` + campo de texto hex sincronizados por JS son el patrón correcto
  para un color editable en el panel** — el picker garantiza formato válido nativamente, el
  campo de texto es el que de verdad viaja en el POST. Validación de formato en el propio
  `pattern` del input (frontend); validación de contraste, en el servidor.
- **La lógica de derivar un color de marca (WCAG, `--accent-ink`, `--metal`) vive por triplicado
  a propósito** (Node en el build, PHP en el panel, JS en la carta/juego) porque son tres
  runtimes que no comparten código — lo que importa es que las tres implementaciones den el
  mismo resultado bit a bit para el mismo hex, no que compartan fichero. Verificarlo con un
  mismo color de prueba en los tres antes de dar por bueno el conjunto.

---

## Cómo ponerse al día en dos minutos

```
Continúo el trabajo multicliente desde el otro PC. Lee tinge_of_turmeric/1-proyecto/RELEVO.md,
el estado de los dos repos (Tinge y bar-restaurante-guaza) y el final de SPEC.md, y dime qué
encuentras antes de tocar nada.
```

Y la regla que no se salta: **un ordenador a la vez.** El `.git` de cada cliente vive dentro de
OneDrive; con los dos tocándolo se corrompe, y cada push publica en la carta de un cliente
real. Antes de cambiar de máquina: terminar, hacer push (el que corresponda autorizar), esperar
al ✓ de OneDrive.
