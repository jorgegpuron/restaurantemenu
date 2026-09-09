# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **9 sep 2026** · **Sesión larga de panel. Árbol sucio A PROPÓSITO: nada
> confirmado, nada desplegado. La batería completa está PENDIENTE de una pasada limpia.**

---

## Dónde estamos

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`)

- Rama **`feature/qa-e2e-admin`**, HEAD **`ced3f95`**.
- **Quince ficheros modificados y sin confirmar.** Es el trabajo de la sesión entera, y está
  así porque el propietario mantiene en vigor la orden: **NO COMMIT · NO PUSH · NO MERGE ·
  NO DEPLOY · NO FTP · parar para revisión humana.** No confirmar nada sin orden expresa.
- `motor.lock` cuadra. `2-subir` está reconstruida con todo lo de la sesión.
- Producción **no se ha tocado** y sigue sirviendo lo de siempre.

Ficheros tocados: `motor/server/admin/index.php`, `motor/gen.mjs`, `motor/alergenos.mjs`,
`motor/importar.mjs`, `motor/server/admin/SPEC.md`, `carta.json`, `motor.lock`,
`qa/inventario.json`, `qa/lib/servidor.mjs` y cinco suites de `qa/`.

## Qué se hizo, y qué falta

Todo está descrito con sus medidas en **`motor/server/admin/SPEC.md`** (últimas seis
secciones). En una línea cada cosa:

- Editar un plato de la carta (lápiz por fila, `estado.editados` disperso).
- Los catorce alérgenos con su icono, y **alérgenos sugeridos por el texto del plato** — se
  resaltan, **nunca se marcan solos**.
- La hoja de alta/edición rehecha: cabecera y pie fijos, un idioma cada vez, foto a toda la
  columna. Cabe entera sin desplazamiento interior a 1512, 1280 y 1024.
- **Mover categorías** (`estado.ordenCats`) y **mover secciones** (`estado.ordenPestanas`) con
  el mismo manejador de dos flechas que los platos.
- El autoguardado ya no recibe 2,4 MB que nadie lee (`X-Sin-Pagina` genérico).

**LO ÚNICO QUE FALTA: una pasada limpia de `npm --prefix qa run full`.** La última completa dio
**656 PASS · 5 FAIL**; los cinco se diagnosticaron y se corrigieron, y las dos pasadas
siguientes se perdieron por el fallo de entorno de más abajo, ya arreglado. No hay ningún fallo
conocido abierto — sólo falta ejecutarla y leerla. Con nada más corriendo y **sin editar ningún
fichero mientras corre** (eso invalidó tres pasadas hoy).

## Trampas pagadas en esta sesión

1. **Un `fetch` cuyo cuerpo no se lee deja al servidor escribiendo.** El panel devuelve 2,4 MB;
   el navegador deja de vaciar el socket y `php -S`, que es de un solo proceso, se queda ciego
   diez segundos. Se veía como «el panel no responde» al marcar un agotado.
2. **`php -S` en Windows vuelve a coger un puerto ocupado sin morir**, y quien contesta es el
   servidor de antes, con otro docroot. La batería probaba contra la carpeta equivocada y decía
   «contraseña incorrecta». Ya se comprueba el `version.json` servido contra el del disco.
3. **El paginador de la tira mide el ancho de los chips una vez.** Cualquier cosa que el
   JavaScript añada a un chip después le deja la medida vieja.
4. Constantes declaradas dentro de otro IIFE no existen fuera: referenciarlas corta el script
   de la pantalla entera **sin ruido en la consola** (es `pageerror`, no `console.error`).
5. El recortador de fotos estaba en `z-index:60`, debajo de la hoja (88): subir una foto desde
   el alta parecía no hacer nada.

## Servidor de revisión

No vive en el repositorio (es de usar y tirar). Sirve una **copia** de `2-subir` en el temporal,
le escribe su propia `clave.php` en cada arranque y la contraseña es `revisionlocal2026`. Si
hace falta otra vez, se rehace: copiar `2-subir`, escribir `clave.php` con un hash bcrypt y
levantar `php -S` con `qa/lib/servidor.mjs`. **Nunca servir `2-subir` directamente**: entrar al
panel escribe dentro y la batería detecta ese cambio como un fallo real.

## Herramientas

`stitch` (MCP de Google, HTTP) añadido en ámbito **local de este workspace**, conectado. Vive en
`C:\Users\sopor\.claude.json`, que **no viaja por OneDrive**: en la otra máquina hay que volver a
añadirlo. La clave está guardada en claro ahí y además pasó por el chat — conviene rotarla.
