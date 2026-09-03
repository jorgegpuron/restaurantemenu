# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **4 sep 2026** · **catálogo de iconos ampliado, todo en local sin push**

---

## Dónde estamos

**Fase 7 cerrada y en `main`**, en los dos repos — ya no vive en ninguna rama aparte. La
congelación del alta de clientes nuevos, levantada (`CLAUDE.md`): `/nuevo-cliente` vuelve a
estar autorizado, siguiendo siempre `NUEVO_CLIENTE.md`.

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`) — `main` en **`a36854e`**,
árbol limpio, **todavía sin push** (`origin/main` sigue en `46adad8`).

**Bar Restaurante Guaza** (`bar-restaurante-guaza/1-proyecto`, repo `bar-restaurante-guaza`) —
`main` en **`253327a`**, árbol limpio, **todavía sin push** (`origin/main` sigue en `2535ee3`).
Producción (<https://socialcard.es/bar-restaurante-guaza/>) sigue sirviendo el build
`1788452194890`, el de antes de esta sesión — nada de lo de aquí abajo ha salido de local
todavía. `DESPLIEGUE_REAL = false`, verificado en su día leyendo de GitHub.

El **motor de los dos clientes es idéntico byte a byte** (`diff` limpio en `motor/gen.mjs`,
`motor/alergenos.mjs` y `motor.lock`), pero viven en repos distintos: sincronizarlo entre uno y
otro sigue siendo manual, copiando a mano y verificando con `diff`.

---

## Qué se hizo, resumido (el detalle está en `git log` de cada repo)

- **Alta endurecida**: `--destino` valida `--url`/carpeta y la zona horaria *antes* de escribir
  nada; `--zona-horaria`/`--corte-hora` son obligatorios (nunca Canarias por defecto); el admin
  ya no revienta si el PHP del servidor no trae `mbstring`.
- **Etiquetas de destacados unificadas**: admin y carta pública leen ahora el mismo vocabulario
  (antes había tres copias que podían divergir — «PLATO INSIGNIA» en admin llegó a salir como
  «DE LA CASA» en la carta ES). Añadidas Recomendado/Nuevo/Especialidad.
- **Validación de traducciones consolidada**: falta una clave obligatoria en el idioma base y el
  build aborta igual que si faltara en un extra — ya no hay una ruta que sólo cubra los extras.
- **Catálogo de alérgenos completo, 14/14 con icono** (`motor/alergenos.mjs`): dibujados a mano
  crustaceans, molluscs, peanuts, soybeans, celery y lupin. Ninguno copiado de un set externo;
  todos verificados rasterizados a 14px real, no al trazo vectorial ampliado.
- **Catálogo de iconos de categoría ampliado** (`motor/gen.mjs`, `GROUP_ICON`): 9 nuevos —
  `fish, seafood, dessert, drinks, coffee, cocktails, breakfast, pizza, burger` — también
  dibujados a mano, verificados a 17px real (el tamaño real de `.group-icon`, no 14px). Guaza
  ya usa `fish` y `seafood` en "Pescados" y "Parrillada de Marisco" — antes reutilizaban `meat`
  y `rice` porque no existía nada mejor.

---

## Qué queda pendiente

1. **Push de Tinge y Guaza.** Todo lo de arriba está commiteado en local, en los dos repos, y
   en ninguno de los dos se ha empujado todavía. Guaza además necesita su propio ciclo de
   ensayo → autorización → despliegue real antes de que `fish`/`seafood` lleguen a producción.
2. **Sincronizar el motor entre Tinge y Guaza sigue siendo manual.** No hay herramienta que lo
   automatice; cada cambio de motor se copia a mano y se verifica con `diff`.
3. **Icono de "Meat & Seafood" en Tinge** (grupo real de su carta): usa `meat` desde antes de
   que existiera `seafood`. Ahora que existe, vale la pena revisarlo — no es urgente, quedó
   anotado como tarea aparte, no se ha tocado.

Ya no está pendiente, y no hace falta repetirlo en el siguiente cierre: alérgenos de extremo a
extremo (icono, build, panel y ficha), la Fase 7 entera integrada en `main`, la congelación del
alta levantada, las etiquetas de destacados unificadas, la validación de traducciones del
idioma base.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **Un icono no se juzga por el trazo vectorial ampliado ni con el zoom del navegador: hay que
  rasterizarlo al tamaño real.** A 14-18px un SVG legible cuando se mira grande puede fundirse
  en una mancha o un bloque gris (pasó con varios intentos de alérgenos y de categorías). La
  técnica que funciona: dibujar el SVG en un `<canvas>` al tamaño real en píxeles (no en CSS
  ampliado), y sólo entonces volver a dibujar ese canvas ampliado con
  `imageSmoothingEnabled = false` para poder inspeccionarlo — eso enseña el píxel real, no una
  reinterpretación vectorial. El `zoom` del panel de Chrome de esta herramienta no recorta
  región todavía; para inspeccionar de cerca hay que usar esa técnica del canvas, no el zoom.
- **Un servidor `php -S` con `2-subir` abierta bloquea su propio `rm` al recompilar.**
  `gen.mjs` borra y rehace `2-subir/` entero en cada build; en Windows, si hay un `php -S`
  sirviendo esa carpeta en ese momento, el borrado revienta con `EPERM`. Parar el servidor de
  pruebas antes de cualquier `node gen.mjs`, no después de que falle. Comprobar con
  `Get-CimInstance Win32_Process -Filter "Name='php.exe'"` qué hay corriendo y qué sirve cada
  uno antes de recompilar — puede haber más de uno de una sesión anterior.
- **El PHP de este ordenador (WinGet) no carga `mbstring` por defecto.** Para probar en local
  algo que dependa de él hace falta pasar
  `-d extension_dir=<ruta>\ext -d extension=php_mbstring.dll` a mano al arrancar `php -S`.
- **El panel del navegador puede quedar "hidden" para el propio agente** (no para el usuario) y
  entonces `computer` (click, screenshot) hace timeout aunque la página siga viva. `read_page` y
  `javascript_tool` siguen funcionando en ese estado — usarlos para interactuar
  (`elemento.click()` por JS) y reintentar el screenshot después suele arreglarlo.
- **Un hueco o defecto visual que no se reproduce en local con `getBoundingClientRect()` no es
  necesariamente mentira del que lo reporta.** Antes de aceptar "no reproducible", probar
  también con la red estrangulada (CDP `Network.emulateNetworkConditions`) y con datos en el
  mismo formato que produce el sistema real, no un caso de prueba cualquiera.
- **`gh run list` sin filtrar puede devolver el run anterior** en los primeros segundos tras un
  push o un dispatch. Nunca coger "el último": filtrar por SHA completo + evento + rama.
- **Las pruebas ancladas a un reloj de pared mienten.** La fecha de "servicio" de la carta se
  calcula con la hora de corte del cliente — anclar las pruebas a esa fecha calculada, nunca a
  una fija.

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
