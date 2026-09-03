# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **3 sep 2026** · **cierre definitivo de la Fase 7**

---

## Dónde estamos

**Fase 7 cerrada.** `NUEVO_CLIENTE.md` describe hoy el procedimiento real, probado de punta a
punta contra un cliente real. Quedan dos cosas sueltas, las dos de logística, ninguna de
producto — ver «Qué queda pendiente».

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`) — rama
`feature/alta-automatica` en `789c595`, árbol limpio, **todavía sin push**. `main` local sigue
en `origin/main` (`46adad8`); esta rama no se ha integrado.

**Bar Restaurante Guaza** (`bar-restaurante-guaza/1-proyecto`, repo `bar-restaurante-guaza`) —
primer cliente real nacido de `/nuevo-cliente`, **en producción**:
<https://socialcard.es/bar-restaurante-guaza/>. `main` local = `origin/main` = `2535ee3`,
árbol limpio. Build público **`1788452194890`**, desplegado y verificado con Playwright real
(humo de producción: alérgenos, ficha con foto, idiomas EN/DE, 404, panel protegido, consola
limpia). `DESPLIEGUE_REAL = false` en el repo de Guaza, verificado leyendo de GitHub.

El **motor de los dos clientes es idéntico byte a byte** (`diff -r` limpio en `motor/gen.mjs` y
`motor.lock`), pero viven en ramas/repos distintos: sincronizar el motor entre uno y otro sigue
siendo manual, no hay herramienta que lo automatice todavía.

---

## Qué se hizo en la última sesión

**Alérgenos, el campo que faltaba: `alergenos.enOrigen`.** El diseño de cierre de Fase 7 pedía
que un cliente pudiera declarar si tiene el dato de alérgenos o no, sin inventarlo nunca.
Implementado genérico en el motor: `si | no | desconocido`, obligatorio en `cliente.mjs`,
obligatorio también como argumento de `nuevo-cliente.mjs --destino`. `desconocido` bloquea el
build sin condiciones; `si` con cero platos declarados también lo bloquea. Tinge queda en
`'no'` (su verdad: no declara alérgenos), Guaza en `'si'` (sus 20 platos con alérgenos reales).

**Ficha de plato con foto, corregida genéricamente.** Bloque de alérgenos nuevo en la ficha
(antes sólo estaba en la fila de la lista): junto al título cuando caben enteros, medido con
`Range.getClientRects()` contra la última línea real del título — la primera versión, que
comparaba contra el `top` del `<h2>` entero, fallaba siempre a «no cabe» por el desplazamiento
natural de `vertical-align` dentro de la línea, y se corrigió en la misma sesión tras verlo en
la propia prueba. Si no caben, bajan enteros (nunca partidos) a un bloque propio, después de la
línea de descripción y precio. Badge de «Agotado hoy» centrado (antes vivía pegado a la
izquierda). Dos defectos que el propietario devolvió por no reproducidos, y sí lo eran:
- **`Incluido`**: confirmado por coordenadas DOM que ya compartía posición, alineación y
  jerarquía con un precio numérico — comparación rigurosa con la misma descripción inyectada en
  ambos platos, cifra a cifra idéntica. No hizo falta ningún cambio.
- **Hueco inferior**: real, pero no era de CSS. `admin/index.php` guarda las fotos como JPEG
  *baseline* (sin `imageinterlace()`); en red lenta, el texto de la ficha ya está pintado
  mientras la foto sigue cargando, y el relleno claro de `.dsheet-foto` se veía como un hueco
  pálido encima del degradado oscuro. Reproducido con red estrangulada (CDP, Slow 3G) sobre un
  JPEG baseline real. Arreglado con un cambio de un color: el relleno de espera pasa a ser el
  mismo tono que el pico del degradado (`#09120e`) — durante la carga no hay costura que ver.
  No se tocó `admin/index.php` (fuera de la allowlist de esta tarea); si algún día se quiere
  progressive JPEG en el origen, es tarea aparte.

**`NUEVO_CLIENTE.md`, reescrito de cabo a rabo.** El documento describía un diseño futuro con
media docena de pasos en 🔧/🔴 que ya estaban implementados y probados, y al menos un campo
(`allergens.coverage`) que nunca llegó a existir en el código — se llamó `enOrigen` al
implementarlo de verdad. Reescrito para reflejar exactamente lo que hace hoy: las cinco
herramientas de `nuevo-cliente.mjs` en su orden real de uso, el catálogo de 14 alérgenos UE, el
verificador de integridad del build, la regla de iconos de pestaña/grupo, y las tres capas de
la activación del panel (marca `activacion.consumida` en el servidor, hash local muerto al
instante, `--cerrar-activacion` para que el Secret de GitHub no resucite un token gastado en un
despliegue futuro). Validado contra el propio historial de Guaza, no contra la teoría.

**Cierre de la tanda**: commit local en los dos clientes (`fix: cerrar alergenos y ficha
visual`), sin push en Tinge. En Guaza: push, dry-run auditado (`dry-run: true`,
`Uploading: 0 B · Deleting: 0 B`), y con autorización expresa, despliegue real
(`dry-run: false`, `security: strict`), verificado en producción, `DESPLIEGUE_REAL` devuelto a
`false`.

---

## Qué queda pendiente

1. **`feature/alta-automatica` de Tinge sin integrar.** Todo el trabajo del motor de esta fase
   —incluida la sesión de hoy— vive en esa rama, sin push. Falta decidir cuándo se sube y se
   mezcla en `main`.
2. **La congelación del alta de clientes nuevos sigue en pie en `CLAUDE.md`**, sin tocar hoy a
   propósito (fuera de la allowlist de la tarea). Tensión a resolver en otra sesión: la
   herramienta ya funciona de punta a punta —Guaza es la prueba— pero la política de si está
   *autorizado* darla de alta a un cliente nuevo vive aparte, en `CLAUDE.md`, y `NUEVO_CLIENTE.md`
   ya no dice que esté bloqueada por falta de herramienta.

Ya no está pendiente, y no hace falta repetirlo en el siguiente cierre: pestañas múltiples,
ofertas por categoría, alérgenos de extremo a extremo (icono, build, panel y ficha), pie de
versión del admin, verificador de integridad del build, activación del panel — los cinco,
probados contra Guaza en producción real.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **Un servidor `php -S` con `2-subir` abierta bloquea su propio `rm` al recompilar.**
  `gen.mjs` borra y rehace `2-subir/` entero en cada build; en Windows, si hay un `php -S`
  sirviendo esa carpeta en ese momento, el borrado revienta con `EPERM`. Parar el servidor de
  pruebas antes de cualquier `node gen.mjs`, no después de que falle.
- **Un hueco o defecto visual que no se reproduce en local con `getBoundingClientRect()` no es
  necesariamente mentira del que lo reporta.** El hueco de la ficha era real y no era de
  layout: era una foto JPEG *baseline* pintándose de golpe tras cargar en red lenta, invisible
  en cualquier prueba local (todo carga en milisegundos). Antes de aceptar "no reproducible",
  probar también con la red estrangulada (CDP `Network.emulateNetworkConditions`) y con
  imágenes en el mismo formato que produce el panel real, no una imagen de prueba cualquiera.
- **`gen.mjs` puede terminar con `exit 0` tras una copia parcial**, si algún día
  `motor/verificar-build.mjs` faltara o se saltara — no confiar nunca en el recuento de "N
  ficheros" del log por sí solo.
- **El servidor PHP local no lee `.htaccess`.** Para probar `admin/activacion.consumida` o el
  fallback de `record.json` hace falta un router PHP que interprete esas reglas a mano.
- **`gh run list` sin filtrar puede devolver el run anterior** en los primeros segundos tras un
  push o un dispatch. Nunca coger "el último": filtrar por SHA completo + evento + rama, y
  descartar cualquier `databaseId` que ya existiera antes de la acción.
- **Las pruebas ancladas a un reloj de pared mienten.** La fecha de "servicio" de la carta se
  calcula con hora de corte en Canarias — anclar las pruebas a esa fecha calculada, nunca a una
  fija.

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
