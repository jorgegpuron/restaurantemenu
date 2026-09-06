# qa — batería automática de calidad

Siete comandos. Se ejecutan desde la raíz de `1-proyecto`:

```bash
npm --prefix qa run fast         # cada cambio: sintaxis, build, manifiesto, inventario  (~6 s)
npm --prefix qa run smoke        # humo funcional con navegador real                     (~10 s)
npm --prefix qa run full         # panel, carta y multicliente                           (~4 min)
npm --prefix qa run pagespeed    # Lighthouse contra la línea base de ESTA máquina       (~5 min)
npm --prefix qa run comparativa  # Lighthouse: commit de control contra candidato        (~11 min)
npm --prefix qa run weekly       # full + comparativa + informe Markdown                 (~15 min)
npm --prefix qa run autoprueba   # siembra fallos y comprueba que la batería los ve      (~20 s)
```

Todos devuelven `0` si el verde es real y distinto de `0` si no. **Verde real** quiere decir: sin
`FAIL`, sin bloqueos que nadie aprobó y —en CI— sin `UNEXPECTED PASS`.

| Estado | Qué significa | ¿Rompe la suite? |
|---|---|---|
| `PASS` | se comprobó y salió bien | no |
| `FAIL` | se comprobó y salió mal | **sí** |
| `BLOCKED` | **no se pudo comprobar** | **sí, salvo los de `qa/blocked-aprobados.json`** |
| `NO APLICA` | la funcionalidad no existe en este cliente; se cubre en otro sitio, y se nombra | no |
| `KNOWN OPEN` | defecto conocido y aceptado por orden expresa (E3, E4, E5) | no |
| `UNEXPECTED PASS` | un `KNOWN OPEN` que ya no se reproduce | en CI **sí** |

### La política de bloqueos

Un `BLOCKED` ya no es un salvoconducto. Sólo son no bloqueantes los identificadores de
`qa/blocked-aprobados.json`, que hoy son dos: `MC-32` (los dos comandos remotos del alta) y `MC-33`
(`motor/migrar.mjs`, que no tiene contra qué migrar). **Cualquier otro rompe el gate**: Chrome
ausente, PHP ausente, GD o `mbstring` que no cargan, Lighthouse no ejecutable, servidor que no
arranca, sesión no abierta, fixture ausente, permisos, timeout, línea base incompatible o commit de
control no disponible.

La regla vieja —«todo `BLOCKED` devuelve 0»— habría dejado media batería sin ejecutar y el workflow
en verde el día que una ruta de extensiones mal detectada hizo desaparecer GD y `mbstring`. Pasó de
verdad, y por eso la regla cambió.

Si un aprobado deja de aparecer, `POL-02` lo marca como `UNEXPECTED PASS`: la lista se ha quedado
atrás y hay que revisarla a mano, no dejarla envejecer.

### Comparar Lighthouse entre máquinas distintas: no se hace

`pagespeed` compara contra `qa/baseline/lighthouse.json`, que guarda la **huella** del entorno donde
se midió (plataforma, versión de Chrome, versión de Lighthouse). Si la huella no coincide con la de
la máquina actual, `LH-HUELLA` **falla**: una línea base de Windows con Chrome 152 frente a un
runner de Linux no es una comparación.

Para CI está `comparativa`, que extrae el commit de control con `git archive`, lo mide **en la misma
máquina** con la misma fixtura y el mismo navegador, mide después el candidato y compara las
medianas entre sí. Es lo que corre `weekly`, y por eso el workflow hace el checkout con
`fetch-depth: 0`.


## Lo que no hace

- **No compila nunca dentro del repositorio.** Cada build va a una carpeta temporal. Compilar en
  sitio rehace `2-subir` y cambia el sello, y entonces pasar las pruebas dejaría el producto
  publicado distinto. `fast` y `full` comprueban al terminar que ni un fichero del producto ha
  cambiado.
- **No toca producción, ni FTP, ni GitHub.** El alta de clientes usa sólo los tres comandos
  locales; `--publicar-github` y `--cerrar-activacion` están declarados BLOCKED en el inventario.
- **No actualiza la línea base de Lighthouse sola.** Hace falta `npm --prefix qa run
  baseline:escribir` y autorización expresa.
- **No entra en la carta ni en el panel.** Nada de `qa/` llega a `2-subir`: hay una comprobación
  dedicada a eso.

### Un punto ciego del servidor de pruebas, dicho aquí para que no sorprenda

El servidor embebido de PHP (`php -S`), cuando no encuentra un fichero, **sube por el árbol
buscando un `index.php` o un `index.html`** y sirve el que encuentre con un `200`. Consecuencia
medida en esta máquina con PHP 8.4.24:

| Petición | Respuesta de `php -S` | Respuesta de un Apache de verdad |
|---|---|---|
| `/assets/no-existe.svg` (con `assets/` existiendo) | `404` | `404` |
| `/no-existe.png` (colgando de la raíz del docroot) | `200` con el `index.html` | `404` |
| `/carpeta-inexistente/x.svg` | `200` con el `index.html` | `404` |

Por eso las comprobaciones que siembran un recurso ausente lo siembran **dentro de `assets/`**, que
es además donde viven los ficheros de verdad. Y por eso «la carta no tiene ninguna petición
fallida» hay que leerlo con esta letra pequeña: cubre lo que la carta pide, que cuelga de
`assets/`, y no cubriría un fichero ausente colocado directamente en la raíz. En producción, con
Apache, los tres casos son `404`.

## Cómo está montado

```
qa/
  package.json          las dos herramientas, con version exacta y lockfile
  inventario.json       el catalogo de TODA la superficie, con su prueba
  baseline/             la linea base de Lighthouse (se versiona; no se toca sola)
  lib/                  entorno, procesos, servidores PHP, navegador, fixtures, clientes
  suites/               fast, full, pagespeed, weekly y las piezas que usan
  informes/             lo que genera cada pasada (fuera de git)
```

`playwright-core` en vez de `playwright`: el segundo se descarga sus propios navegadores. Aquí se
usa el Chrome que ya hay en la máquina, que además es el mismo que mide Lighthouse — así lo que se
prueba y lo que se mide son el mismo motor. Si no lo encuentra, define `CHROME_PATH`.

Los servidores PHP arrancan con `-n` (sin `php.ini`) y las extensiones que pide cada prueba. Sin
eso no se podría probar «sin mbstring» en una máquina cuyo `php.ini` la cargue, y la prueba diría
PASS sin haber probado nada.

## El inventario

`inventario.json` cataloga cada acción, campo, subida, endpoint, manejador, clave de estado,
página pública, comando de alta y paso de actualización, con su prueba, su caso positivo, su
entrada inválida, su persistencia y su reflejo en la carta.

`suites/inventario.mjs` vuelve a extraer esa superficie **del código** y falla si aparece algo que
no esté catalogado. Es lo que impide que la cobertura se quede atrás: añadir un `$_POST` nuevo sin
tocar el inventario pone la suite en rojo.

## Las fixtures se fabrican

No hay ni un binario de prueba en el repositorio. Los PNG se escriben con `zlib`, que viene en
Node, y el JPEG y el WebP los dibuja GD cuando está. Una imagen «corrupta» guardada como fichero
acaba pareciendo un fichero roto por accidente y alguien la arregla; generada, con su comentario
al lado, se ve que la corrupción es el propósito.

## En CI

`.github/workflows/quality.yml`: `fast` en cada pull request, `weekly` los lunes y a mano. Permisos
de sólo lectura, sin secretos, con timeout, dependencias cacheadas y acciones fijadas por SHA. El
informe se sube como artefacto **también cuando la suite falla**, que es cuando hace falta.
