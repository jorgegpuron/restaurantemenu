# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **5 sep 2026** · **Sesión de herramientas, cerrada en descarte: 21st.dev
> se probó y se retiró. Sin tocar código, sin desplegar.**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`) — `main` local =
`origin/main` = **`1e984c3`**, sin trabajo técnico abierto. En el árbol de trabajo sólo queda
este `RELEVO.md`, modificado y sin confirmar.

Cuidado con una diferencia que importa: **los dos últimos commits NO están desplegados, y no
hace falta que lo estén.** `ed6c5ef` y `1e984c3` sólo tocan `.mcp.json`, que es configuración de
herramientas del editor: no entra en el build ni en el sitio público, y el segundo deshace al
primero. Lo que sirve producción sigue siendo el build de **`ae4d044`**, build
**`1788559421753`**, en **https://socialcard.es/tinge_of_turmeric/menu2/** — comprobada y
funcional.

Los dos push dispararon el workflow por evento `push`, que **por ser evento `push` es ensayo
(`dry-run: true`) y no despliega**: runs `33927974773` y `33929116257`. **No se ha lanzado
ningún `workflow_dispatch`, así que no ha habido despliegue real en esta sesión.**

**Bar Restaurante Guaza** (`bar-restaurante-guaza/1-proyecto`, repo `bar-restaurante-guaza`) —
**sin tocar**. `main` local = `origin/main` = **`609e3af`**, árbol limpio. Sigue en el sistema
de 5 temas antiguo. `dedos_las_americas` y `reginacafe`, también intactos.

Los dos clientes con **`DESPLIEGUE_REAL = false`**. El motor de los dos **ya NO es idéntico**:
Tinge tiene el sistema de color de marca configurable, la paleta oscura y los iconos de
alérgenos; Guaza, el de 5 temas — divergencia conocida y deliberada.

---

## 21st.dev: probado y descartado. No volver a intentarlo

**Decisión tomada el 5 sep 2026, y es firme.** 21st.dev entrega componentes en **React, Tailwind
y shadcn**. El motor de este producto está escrito en **HTML, CSS y JavaScript nativos**, sin
build de framework y sin dependencias de terceros en el runtime. Aprovechar el catálogo exigiría
o bien introducir esas dependencias —que no se quieren— o bien reescribir a mano cada componente
hasta el punto de que la herramienta deja de aportar nada. No es un problema de configuración:
la configuración llegó a funcionar. Es incompatibilidad de lenguaje.

Por eso **desaparece también del listado de pendientes**: ya no es «evaluar mejoras visuales con
21st», es una vía cerrada.

Qué quedó hecho y deshecho, para que nadie reconstruya el rastro a ciegas:

- **Ámbito de proyecto**: la entrada `21st` de `.mcp.json` se añadió en `ed6c5ef` y se
  **revirtió en `1e984c3`**. El fichero vuelve a declarar sólo playwright, y así está en GitHub.
- **Ámbito de usuario y ámbito local** (`C:\Users\sopor\.claude.json`, fuera del repositorio):
  se dieron de alta y **se han eliminado los dos**. No queda ningún servidor `21st` en la
  configuración de Claude de este ordenador.
- **La clave `API_KEY_21ST`**: se definió como variable de entorno de usuario de Windows y **se
  ha borrado**. Nunca estuvo en ningún repositorio ni en ningún commit — en la configuración
  sólo viajaba el marcador literal `${API_KEY_21ST}`.
- **Pendiente en el otro ordenador**: si allí se llegó a definir `API_KEY_21ST`, **hay que
  borrarla también** (`setx API_KEY_21ST ""`, o desde Variables de entorno de Windows).
- **Pendiente fuera de aquí**: el conector **`claude.ai 21st.dev`** sigue activo y **no se
  gestiona desde este repositorio ni desde la línea de comandos** — se retira desde los ajustes
  de conectores de claude.ai.
- **Las skills de 21st** (`21st-ai`, `21st-cli-use`, `21st-registry`, `21st-ui-build`…) están
  instaladas como plugins del entorno, son independientes del MCP y **no se han tocado**. Si se
  quieren fuera, se desinstalan como plugins.

---

## Lo que se hizo en esta sesión

Configuración de herramientas y documentación. **Ni una línea de código del motor, del panel o
de la carta.**

- **`ed6c5ef`** — `chore: registra el MCP de 21st.dev en la configuracion del repositorio`.
- **`1e984c3`** — `revert: retira el MCP de 21st.dev de la configuracion del repositorio`.
  Revierte el anterior. Los dos tocan un único fichero, `.mcp.json`, y los dos están pusheados.
- Altas y bajas de servidor MCP y borrado de la variable de entorno, todo en
  `C:\Users\sopor\.claude.json` y en el entorno de Windows, **fuera del repositorio**.
- Reescritura de este `RELEVO.md`, por orden expresa.

**Después de `1e984c3` no hay ningún commit, ningún push y ningún despliegue nuevo.**

---

## Qué queda pendiente

1. **Migrar Guaza al color de marca configurable.** Sigue en el sistema de 5 temas antiguo, sin
   tocar a propósito. Motor de los dos clientes divergente mientras esto no se haga —
   divergencia conocida, no un descuido.
2. **Prueba en vivo del cambio de color desde Admin → Marca, contra producción real, no hecha.**
   No hay contraseña de admin real de Tinge a mano en este ordenador. Todo lo demás (color
   visible, badges, botón Buscar, precio de oferta) sí está confirmado en vivo contra
   producción.
3. **Sincronizar el motor entre Tinge y Guaza sigue siendo manual.** Sin herramienta que lo
   automatice — y ahora mismo, además, los dos motores ya no son iguales (punto 1).
4. **Icono de «Meat & Seafood» en Tinge**: usa `meat` desde antes de que existiera `seafood`. No
   urgente, sin tocar.
5. **Retirar el conector `claude.ai 21st.dev`** desde los ajustes de conectores de claude.ai, y
   **borrar `API_KEY_21ST` en el otro ordenador** si se llegó a definir allí.

Ya no está pendiente, no hace falta repetirlo en el siguiente cierre: alérgenos de extremo a
extremo, la Fase 7 entera, la congelación del alta levantada, el botón de foto, Admin → Marca,
el sistema de color de marca configurable con su ajuste visual posterior, y la paleta oscura,
el contraste garantizado y los iconos de alérgenos de la ronda del 4 sep 2026 — **todo
desplegado en producción de Tinge**. El detalle de aquella ronda (cuatro despliegues:
`2e80955`, `9004f69`, `7c2a69d` y `ae4d044`, cada uno con su ensayo, su `workflow_dispatch` y
su recuento FTP) está en `git log` y en `SPEC.md`; el contrato de tintas es ya una puerta del
despliegue, con PHP obligatorio, y en verde. **Y 21st.dev, descartado** — ver arriba.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **Antes de montar una herramienta externa, comprobar en qué lenguaje entrega.** Con 21st.dev se
  gastó una sesión entera en configurarla —ámbitos, clave, verificación— antes de mirar lo único
  que decidía: que sirve React/Tailwind/shadcn y aquí todo es HTML, CSS y JS nativos. La
  compatibilidad se mira primero; la configuración, después.
- **`setx` no llega a un proceso que ya estaba abierto.** Define la variable para procesos
  nuevos, así que Claude —y todo lo que Claude lance— sigue sin verla hasta reiniciarlo. El
  síntoma engaña: un servidor MCP con cabecera `${VAR}` aparece como *"Needs authentication"*
  aunque la configuración esté perfecta. Para comprobarlo sin reiniciar, inyectar la variable
  en el proceso hijo desde PowerShell
  (`$env:VAR = [Environment]::GetEnvironmentVariable('VAR','User')`) y volver a preguntar.
- **La precedencia de ámbitos de MCP es `local > project > user`.** Una entrada `local` vieja
  ensombrece silenciosamente a la de usuario, y `claude mcp get` responde por la que gana, no
  por la que uno cree tener. Mirar el ámbito que imprime la respuesta antes de dar nada por
  bueno.
- **Un icono no se juzga por el trazo vectorial ampliado ni con el zoom del navegador: hay que
  rasterizarlo al tamaño real.** Técnica: dibujar el SVG en un `<canvas>` al tamaño real en
  píxeles, y sólo entonces volver a dibujarlo ampliado con `imageSmoothingEnabled = false`.
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
  activar con el token (nunca con el hash). Tinge usa el bootstrap simple ("Configurar
  acceso"), no token: sólo aplica a un cliente nacido de `/nuevo-cliente`.
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
real. Antes de cambiar de máquina: terminar, hacer push (el que corresponda autorizar), y
**esperar al ✓ de sincronización de OneDrive** — con este relevo ya escrito y sincronizado,
porque si no, el otro ordenador arranca a ciegas.
