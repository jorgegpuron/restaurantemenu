# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **4 sep 2026** · **Fase 8 cerrada en local — color de marca
> configurable — commiteada, sin pushear**

---

## Dónde estamos

**Fase 8 cerrada, un commit por delante de `a5380f8` en `main` local de Tinge — sin pushear
todavía.** El hash exacto es el que dé `git log -1 --oneline` en `tinge_of_turmeric/1-proyecto`;
no se fija aquí a propósito, porque este fichero forma parte de ese mismo commit.

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`) — `main` local por delante de
`origin/main` (que sigue en `5491a0b`) por **dos commits**: el cierre de Admin → Marca de la
sesión anterior y el de la Fase 8 de esta. Árbol limpio, nada sin commitear. Sigue habiendo un
`stash` aparcado de antes de la Fase 7 (auditoría vieja de `NUEVO_CLIENTE.md`) — **no tocado,
no es de esta fase.** En producción sigue el build **`1788483872209`**, el de antes de la Fase
8: nada de esto ha salido de este ordenador.

**Bar Restaurante Guaza** (`bar-restaurante-guaza/1-proyecto`, repo `bar-restaurante-guaza`) —
**sin tocar en toda la Fase 8**, a propósito. `main` local = `origin/main` = **`eaade01`**, árbol
limpio. En producción: build **`1788484550343`**. Sigue en el sistema de 5 temas antiguo — la
migración a color-de-marca-configurable está pensada pero no diseñada para Guaza todavía.

Los dos con **`DESPLIEGUE_REAL = false`**, sin tocar en esta fase. El motor de los dos clientes
**ya NO es idéntico**: Tinge tiene el sistema de color nuevo, Guaza el de 5 temas — divergencia
conocida y deliberada mientras Guaza no se migre.

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

---

## Qué queda pendiente

1. **Push de Tinge.** `main` local está dos commits por delante de `origin/main` — ni el cierre
   de Admin → Marca (nombre/rótulo) ni la Fase 8 (color) han salido de este ordenador. Push y
   despliegue exigen, cada uno, autorización expresa y separada — no asumir ninguna de las dos
   por venir después de una aprobación de diseño.
2. **Migrar Guaza al color de marca configurable.** Sigue en el sistema de 5 temas antiguo, sin
   tocar a propósito durante toda la Fase 8. Motor de los dos clientes divergente mientras esto
   no se haga — divergencia conocida, no un descuido.
3. **Prueba en vivo del color de marca contra producción, no hecha.** Igual que ya pasaba con
   Admin → Marca: no hay contraseña de admin real a mano en este ordenador. Cobertura actual es
   local, contra el motor real byte a byte.
4. **Sincronizar el motor entre Tinge y Guaza sigue siendo manual.** Sin herramienta que lo
   automatice — y ahora mismo, además, los dos motores ya no son iguales (punto 2).
5. **Icono de «Meat & Seafood» en Tinge**: usa `meat` desde antes de que existiera `seafood`. No
   urgente, sin tocar.

Ya no está pendiente, no hace falta repetirlo en el siguiente cierre: alérgenos de extremo a
extremo, la Fase 7 entera, la congelación del alta levantada, el botón de foto y Admin → Marca
(nombre/rótulo) en producción, **el sistema de color de marca configurable, diseñado,
implementado y probado en Tinge/local — commiteado, pendiente solo de push**.

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
