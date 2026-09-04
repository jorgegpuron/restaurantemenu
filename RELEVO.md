# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **4 sep 2026** · **foto como acción + Admin → Marca, los dos en
> producción y verificados**

---

## Dónde estamos

**Fase 7 cerrada y en `main`**, en los dos repos, **y los dos publicados y al día**. La
congelación del alta de clientes nuevos, levantada (`CLAUDE.md`).

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`) — `main` local = `origin/main`
= **`5491a0b`**, árbol limpio salvo `RELEVO.md` (este propio fichero, sin commitear a
propósito). En producción: <https://socialcard.es/tinge_of_turmeric/menu2/>, build
**`1788483872209`**, verificado leyendo `version.json` en directo.

**Bar Restaurante Guaza** (`bar-restaurante-guaza/1-proyecto`, repo `bar-restaurante-guaza`) —
`main` local = `origin/main` = **`eaade01`**, árbol limpio. En producción:
<https://socialcard.es/bar-restaurante-guaza/>, build **`1788484550343`**, verificado leyendo
`version.json` en directo.

Los dos con **`DESPLIEGUE_REAL = false`**, verificado leyendo de GitHub antes y después de
cada run. El **motor de los dos clientes es idéntico byte a byte** (`diff` limpio en
`motor/gen.mjs`, `motor/server/admin/index.php` y `motor.lock`).

---

## Qué se hizo, resumido (el detalle está en `git log` de cada repo)

- **Botón de foto, rediseñado como acción clara**: círculo de 32px con borde y fondo propios
  (antes heredaba el mismo tratamiento plano que un alérgeno — se confundía con ellos).
  Validado en producción en los dos clientes, sobre platos reales con foto, junto a alérgenos
  y etiquetas destacadas sin que se confundan entre sí.
- **Admin → Marca**: dos campos nuevos, `nombreVisible` (máx. 20 caracteres reales) y
  `rotuloVisible` (máx. 25) — override que vive en `estado.json`, nunca escribe `cliente.mjs`
  y nunca toca el slug técnico, la URL, la carpeta, el repo ni el FTP. Validado en las tres
  capas (HTML, PHP contando caracteres reales no bytes, guardado). Se refleja sin recompilar,
  sobrevive a refresh y a un deploy futuro. Probado de punta a punta en local en los dos
  clientes (Tinge base inglés, Guaza base español) — incluido un bug real encontrado y
  corregido en el propio proceso: el texto pequeño de portada vive en un `<span class="i18n">`
  dentro de `.sub-title`, no en `.sub-title` mismo, y el primer intento leía/escribía el nodo
  equivocado — al borrar el override todos los idiomas se quedaban en inglés en vez de volver
  cada uno a su traducción real. Corregido y reverificado en los tres idiomas antes de darlo
  por bueno.
- Tinge y Guaza, cada uno con su ciclo completo: push → ensayo auditado → despliegue real →
  `DESPLIEGUE_REAL` de vuelta a `false` → humo de producción en solo lectura (alérgenos,
  destacados, iconos de categoría, ES/EN/DE, 404, admin protegido, consola limpia) — verificado
  de punta a punta, no dado por supuesto.

---

## Qué queda pendiente

1. **Próxima fase: sustituir los temas predefinidos por una identidad de 3 colores por
   cliente.** Hoy cada cliente elige uno de los 5 temas fijos (`motor/temas.mjs`); la idea es
   que cada restaurante declare sus propios 3 colores de marca en vez de elegir de una lista
   cerrada. Sin diseñar todavía.
2. **Sincronizar el motor entre Tinge y Guaza sigue siendo manual.** No hay herramienta que lo
   automatice; cada cambio de motor se copia a mano y se verifica con `diff`.
3. **Icono de "Meat & Seafood" en Tinge** (grupo real de su carta): usa `meat` desde antes de
   que existiera `seafood`. No urgente, anotado como tarea aparte, no se ha tocado.
4. **Prueba en vivo de Admin → Marca contra producción, no hecha.** No hay contraseña de admin
   de ninguno de los dos clientes a mano en este ordenador, y crear una nueva habría cerrado el
   acceso real sin autorización para eso en concreto. La cobertura que existe es local, contra
   el mismo motor byte a byte — si algún día hace falta la prueba en vivo, hace falta también
   la contraseña real o decidir crear una nueva a propósito.

Ya no está pendiente, y no hace falta repetirlo en el siguiente cierre: alérgenos de extremo a
extremo, la Fase 7 entera integrada en `main`, la congelación del alta levantada, las etiquetas
de destacados unificadas, la validación de traducciones del idioma base, el catálogo de iconos
de categoría, **el botón de foto y Admin → Marca, los dos en producción**, el despliegue real
de Tinge y de Guaza verificado dos veces cada uno.

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
  `Get-CimInstance Win32_Process -Filter "Name='php.exe'"` qué hay corriendo y qué sirve cada
  uno — puede haber más de uno de una sesión anterior.
- **`session.save_path` de un `php -S` de prueba tiene que existir ANTES de arrancar el
  servidor, o las sesiones no persisten y cada petición ve un CSRF distinto** — el síntoma es
  "La página ha caducado" en bucle, aunque el formulario esté bien. `mkdir` la carpeta primero.
- **El PHP de este ordenador (WinGet) no carga `mbstring` por defecto.** Para probar en local
  algo que dependa de él hace falta pasar
  `-d extension_dir=<ruta>\ext -d extension=php_mbstring.dll` a mano al arrancar `php -S`.
- **Un cliente con `activacionPanel: true` (nacido de `/nuevo-cliente`) pide token de
  activación, no sólo contraseña, la primera vez.** Para probarlo en local hace falta generar
  un token + su SHA-256 a mano, compilar con `PANEL_ACTIVACION_HASH` puesto a ese hash, y
  activar con el token (nunca con el hash). Un hash inventado sin token conocido no sirve para
  nada: no hay forma de "adivinar" el texto que lo produce.
- **`gh run list` sin filtrar puede devolver el run anterior** en los primeros segundos tras un
  push o un dispatch. Filtrar siempre por SHA completo + evento + rama.
- **En el ensayo (`dry-run: true`), que `Uploading`/`Replacing` no sea 0 no es una alarma por sí
  sola** — leer siempre la lista de ficheros del log antes de aprobar el despliegue real.
- **El panel del navegador puede quedar "hidden" para el propio agente** y entonces `computer`
  (click, screenshot) hace timeout o devuelve una captura en negro sólido, aunque la página siga
  viva y el DOM esté correcto. `read_page`, `javascript_tool` y `getComputedStyle()` siguen
  siendo fiables en ese estado — apoyarse en ellos en vez de insistir con la captura.
- **La consola del navegador acumula errores entre navegaciones dentro de la misma pestaña.**
  Para un veredicto limpio, probar en una pestaña nueva.
- **Las pruebas ancladas a un reloj de pared mienten.** Anclar las pruebas a la fecha de
  servicio calculada, nunca a una fija.

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
