# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **4 sep 2026** · **Tinge en producción, Guaza con commits sin subir**

---

## Dónde estamos

**Fase 7 cerrada y en `main`**, en los dos repos. La congelación del alta de clientes nuevos,
levantada (`CLAUDE.md`): `/nuevo-cliente` vuelve a estar autorizado, siguiendo siempre
`NUEVO_CLIENTE.md`.

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`) — `main` local = `origin/main`
= **`6a0e98c`**, árbol limpio, **desplegado en producción y validado**:
<https://socialcard.es/tinge_of_turmeric/menu2/>. Build público **`1788479782183`** (run
`33819699733`), verificado leyendo `version.json` en directo. Humo de producción en solo
lectura, todo limpio: carta sin errores de consola, 36 grupos con icono (0 sin icono), los tres
idiomas (EN/ES/DE) traducen de verdad, 404 real en ruta inventada, `/admin/` pide contraseña sin
enseñar nada de la carta, el juego carga sin errores. **Persistencia intacta**: `estado.json` en
vivo sigue con sus 6 etiquetas y 2 fotos reales (no una plantilla vacía), las fotos siguen
respondiendo 200 — nada de esto lo toca el despliegue, están en la exclusión del workflow.
`DESPLIEGUE_REAL = false`, verificado leyendo de GitHub antes y después del run.

**Bar Restaurante Guaza** (`bar-restaurante-guaza/1-proyecto`, repo `bar-restaurante-guaza`) —
`main` local en **`253327a`**, árbol limpio, **4 commits por delante de `origin/main`
(`2535ee3`), todavía sin push**:

```
253327a feat: ampliar iconos de categorias       (fish/seafood en Pescados/Parrillada de Marisco)
cdf4ac0 feat: completar iconos de alergenos       (14/14 con icono)
b9bf7d5 fix: unificar etiquetas de destacados
85309b8 fix: mb_strtolower sin mbstring no debe romper el panel
```

Producción de Guaza (<https://socialcard.es/bar-restaurante-guaza/>) sigue sirviendo el build
`1788452194890`, de antes de estos cuatro commits — nada de esto ha salido de local todavía.
`DESPLIEGUE_REAL = false` en su repo.

El **motor de los dos clientes es idéntico byte a byte** ahora mismo (`diff` limpio en
`motor/gen.mjs` y `motor/alergenos.mjs`), pero Guaza va cuatro commits por detrás de Tinge en
lo que ya tiene *desplegado* — su motor local ya está al día, lo que falta es publicarlo.

---

## Qué se hizo, resumido (el detalle está en `git log` de cada repo)

- Alta endurecida: valida destino/URL y zona horaria antes de escribir nada;
  `--zona-horaria`/`--corte-hora` obligatorios; admin funciona sin `mbstring`.
- Etiquetas de destacados unificadas entre admin y carta pública.
- Validación de traducciones consolidada: el idioma base aborta igual que los extras.
- Catálogo de alérgenos completo, 14/14 con icono.
- Catálogo de iconos de categoría ampliado con 9 nuevos (fish, seafood, dessert, drinks,
  coffee, cocktails, breakfast, pizza, burger).
- Tinge: push + despliegue real, verificado de punta a punta (ver arriba).
- Guaza: motor sincronizado y `carta.json` corregido (`fish`/`seafood` en vez de `meat`/`rice`
  para "Pescados"/"Parrillada de Marisco"), todo commiteado en local, sin publicar.

---

## Qué queda pendiente

1. **Push y despliegue de Guaza.** Los cuatro commits de arriba están solo en local. Mismo
   procedimiento que ya se siguió con Tinge: push → ensayo (`dry-run: true`, revisar el listado
   de ficheros) → autorización expresa → `DESPLIEGUE_REAL=true` sólo durante el run → humo de
   producción → `DESPLIEGUE_REAL=false`.
2. **Sincronizar el motor entre Tinge y Guaza sigue siendo manual.** No hay herramienta que lo
   automatice; cada cambio de motor se copia a mano y se verifica con `diff`.
3. **Icono de "Meat & Seafood" en Tinge** (grupo real de su carta): usa `meat` desde antes de
   que existiera `seafood`. No urgente, anotado como tarea aparte, no se ha tocado.

Ya no está pendiente, y no hace falta repetirlo en el siguiente cierre: alérgenos de extremo a
extremo, la Fase 7 entera integrada en `main`, la congelación del alta levantada, las etiquetas
de destacados unificadas, la validación de traducciones del idioma base, **el despliegue real de
Tinge**.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **Un icono no se juzga por el trazo vectorial ampliado ni con el zoom del navegador: hay que
  rasterizarlo al tamaño real.** A 14-18px un SVG legible cuando se mira grande puede fundirse
  en una mancha o un bloque gris. Técnica: dibujar el SVG en un `<canvas>` al tamaño real en
  píxeles, y sólo entonces volver a dibujarlo ampliado con `imageSmoothingEnabled = false` para
  inspeccionarlo — eso enseña el píxel real, no una reinterpretación vectorial. El `zoom` del
  panel de Chrome de esta herramienta no recorta región todavía.
- **Un servidor `php -S` con `2-subir` abierta bloquea su propio `rm` al recompilar.** Parar el
  servidor de pruebas antes de cualquier `node gen.mjs`. Comprobar con
  `Get-CimInstance Win32_Process -Filter "Name='php.exe'"` qué hay corriendo y qué sirve cada
  uno — puede haber más de uno de una sesión anterior.
- **El PHP de este ordenador (WinGet) no carga `mbstring` por defecto.** Para probar en local
  algo que dependa de él hace falta pasar
  `-d extension_dir=<ruta>\ext -d extension=php_mbstring.dll` a mano al arrancar `php -S`.
- **`gh run list` sin filtrar puede devolver el run anterior** en los primeros segundos tras un
  push o un dispatch. Filtrar siempre por SHA completo + evento + rama, y confirmar que el
  `databaseId` no existiera ya antes de la acción.
- **En el ensayo (`dry-run: true`), que `Uploading`/`Replacing` no sea 0 no es una alarma por sí
  solo** — leer SIEMPRE la lista de ficheros del log antes de aprobar el despliegue real. Sí es
  señal de fallo si aparece algo de la lista de exclusión (`estado.json`, `clave.php`,
  `record.json`, `assets/hero/**`, `assets/platos/**`).
- **El panel del navegador puede quedar "hidden" para el propio agente** y entonces `computer`
  (click, screenshot) hace timeout aunque la página siga viva. `read_page` y `javascript_tool`
  siguen funcionando — usarlos para interactuar y reintentar el screenshot después.
- **La consola del navegador acumula errores entre navegaciones dentro de la misma pestaña.** Un
  404 de prueba deliberado puede seguir apareciendo en `read_console_messages` varias
  navegaciones después, y parecer un fallo nuevo que no lo es. Para un veredicto limpio, probar
  en una pestaña nueva.
- **Las pruebas ancladas a un reloj de pared mienten.** La fecha de "servicio" de la carta se
  calcula con la hora de corte del cliente — anclar las pruebas a esa fecha calculada.

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
