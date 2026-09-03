# Dar de alta un restaurante

**Procedimiento obligatorio.** Instrucciones para ejecutarlas en orden, no para leerlas por
encima. Cada paso tiene una comprobación; si una falla, se para ahí y se dice por qué.

> ### Estado de este documento
>
> Describe el procedimiento que de verdad ejecuta el motor hoy: las cinco herramientas de
> `nuevo-cliente.mjs`, el catálogo de alérgenos (`motor/alergenos.mjs`), el verificador de
> integridad del build (`motor/verificar-build.mjs`) y la activación del panel — todo lo que en
> su día llevaba 🔧 o 🔴 en este mismo documento. Validado de principio a fin con **Bar
> Restaurante Guaza**, primer cliente real nacido de este procedimiento: alta, carta con
> alérgenos declarados, activación del panel y despliegue real, todo hecho con las herramientas
> de aquí, no a mano.
>
> | Marca | Significado |
> |---|---|
> | ✅ | Funciona hoy, probado de punta a punta |
> | 🔧 | Falta una herramienta o un paso real |
> | 🔴 | Bloqueado por una decisión pendiente |
>
> Si un paso de más abajo lleva 🔧 o 🔴, es una tarea real, no una advertencia genérica que se
> arrastra. **Que la herramienta funcione es una cosa; que esté autorizado dar de alta un
> cliente nuevo ahora mismo es otra, y esa decisión vive en `CLAUDE.md`, no aquí.** Este
> documento no dice si el alta está congelada: dice si el procedimiento, cuando toque usarlo,
> hace lo que promete. El procedimiento antiguo de copiar carpetas se conserva sólo como
> referencia en `NUEVO-CLIENTE.LEGACY.md`, en la raíz de `socialcard_claudecode/`: **prohibido
> seguirlo** — copiaba carpetas de clientes en eliminación.

---

## 0. Antes de tocar nada

Sin estas respuestas no se empieza:

1. **El nombre**, tal y como quiere verlo el cliente en la carta. Corto: es un titular.
2. **La dirección pública**, con su carpeta. Por ejemplo `socialcard.es/restaurante_cubano/`.
   De ahí sale la carpeta local, el `slug` y la ruta FTP — los tres a la vez, no se deciden
   por separado.
3. **La carta**: fichero, PDF, foto o enlace. Es el trabajo de verdad.
4. **El impuesto** que se aplica: IGIC en Canarias, IVA en la península, otra cosa fuera de
   España. **No hay valor por defecto y el build revienta si falta**, a propósito.
5. **La zona horaria** (identificador IANA) y **la hora de corte del día de servicio**
   (0-23): a qué hora caducan los agotados de ayer. No es Canarias por defecto para nadie —
   depende de dónde está el restaurante y de cuándo cierra de verdad.
6. Los **idiomas**. Por defecto español o el que hable el restaurante — base y extras — y cada
   extra que no sea inglés son ~110 cadenas de interfaz que traducir. El código de cada idioma
   tiene que estar en el catálogo humano del script (más abajo, paso 7): uno que no esté ahí
   para el alta antes de escribir una sola línea.
7. **¿El restaurante declara alérgenos plato a plato?** Sí, no, o «todavía no lo sé». Es
   `alergenos.enOrigen` (paso 6) y el script **lo exige como argumento obligatorio** — no hay
   valor por defecto y «todavía no lo sé» es una respuesta legítima para arrancar el alta, pero
   bloquea cualquier build hasta que se decida de verdad. **Nunca se infiere un alérgeno del
   nombre de un plato ni de la receta.**
8. El **enlace de reseñas de Google**, si lo tiene. Si no, se deja vacío y lo pone él desde el
   panel.

---

## 1. Qué se conserva del motor ✅

Se copia **sin tocar una línea** (`--destino`, paso 5). Si te encuentras editando algo de esta
lista para que el cliente nuevo funcione, es que hay un dato escrito como código y hay que
sacarlo al cliente. El motor no lleva dentro ni un dato de restaurante: cocina, moneda, zona
horaria, corte del día, idiomas, leyenda de alérgenos y capacidades salen de `cliente.mjs`, y la
estructura de la carta (pestañas, categorías, metadatos de comportamiento) de `carta.json`
(esquema `carta/2`).

```
motor/gen.mjs                el compilador
motor/importar.mjs           carta → menu.md + diccionarios, y acuña dishId/categoryId
motor/entorno.mjs            las rutas y la verificación del lock
motor/lock.mjs               verificar/escribir motor.lock
motor/transaccion-motor.mjs  la transacción de actualización
motor/actualizar.mjs         actualizar el motor (misma época)
motor/migrar.mjs             el salto de época (carta/1 → carta/2)
motor/temas.mjs              los cinco temas de color
motor/juego.mjs              el juego
motor/error404.mjs           la página de error
motor/adelgazar.mjs          quita comentarios del HTML publicado
motor/banderas.mjs           las banderas y los países
motor/alergenos.mjs          el catálogo inmutable de los 14 alérgenos UE + alias legacy
motor/verificar-build.mjs    falla cerrado si 2-subir sale incompleta
motor/contrato-salida.mjs    de qué depende «completa» (motor.lock + cliente.mjs, nunca listar carpetas)
motor/server/admin/**        el panel
motor.lock                   versión y hashes del motor
```

## 2. Qué se sustituye entero

Nada de esto se hereda: se escribe nuevo para cada restaurante.

| Fichero | Qué lleva |
|---|---|
| `cliente.mjs` | Identidad, rótulos, URL, impuesto, cocina, moneda, zona horaria, corte del día, idiomas (con bandera), leyenda de alérgenos + `enOrigen`, funciones (datos, juego, publicidad), `activacionPanel: true` |
| `carta.json` | Platos y categorías, con sus identificadores auto-generados |
| `i18n.*.mjs` | Un diccionario por idioma, con su sección `ui` |
| `assets/` | La marca del restaurante (vacía al nacer: la sube el panel) |
| `.github/workflows/deploy.yml` | El despliegue, con su ruta y su grupo de concurrencia propios |

## 3. Qué se elimina ✅

De una copia recién hecha desaparecen, antes de nada (esto es lo que hacía el procedimiento
LEGACY manual — con `--destino` ni se llega a copiar):

```
.git/                    el historial del otro restaurante
generado/                los derivados volátiles del build
menu.md                  generado (versionado: la vista humana de la carta)
2-subir/                 generado entero
3-copias/                los puntos de restauración del otro
```

## 4. Qué NO se copia NUNCA ✅

**Ni para probar, ni «de momento», ni renombrado.** `--destino` nunca los escribe porque nunca
lee del cliente de origen para nada que no sea el propio motor (sección 1).

| | Por qué |
|---|---|
| `admin/clave.php` · `admin/superclave.php` | Contraseñas de otro negocio |
| `admin/intentos.json` · `admin/accesos.log` | Registros de acceso ajenos |
| `estado.json` | Agotados, precios y ofertas de otro restaurante |
| `record.json` · `admin/marcador.json` · `admin/canjes.json` | Partidas y premios ajenos (el marcador del juego, no la activación del panel) |
| `assets/hero/` · `assets/platos/` | **Fotografías de otro restaurante** |
| `admin/copias/` · `admin/datos/` | Historial y estadísticas ajenas |
| `carta.json` del origen | Su carta, sus alérgenos, sus fotos |
| Cualquier `dishId`, `categoryId` o `recipeId` del origen | Identificadores ajenos |
| El `slug` y el secreto del juego del origen | Un premio ganado en A se canjearía en B |
| `PANEL_ACTIVACION_HASH` del origen | Activaría el panel nuevo con el token de otro cliente |

**Los alérgenos son la peor de todas.** Copiar los de otro restaurante es publicar información
de seguridad alimentaria falsa. `--destino` empieza con `alergenos.leyenda: []` y
`carta.json` vacío; `--detectar` (paso 9) busca cualquier resto igualmente.

---

## 5. Las cinco herramientas, en el orden real

`nuevo-cliente.mjs` no es un asistente con banderas opcionales: son **cinco comandos
separados**, cada uno con su propio efecto y su propia comprobación, para poder parar entre
uno y el siguiente. Se ejecuta siempre desde la raíz de `1-proyecto` de **Tinge**, que actúa de
semilla y nunca se modifica — todo lo que escribe va al `--destino`, jamás a su propio origen.

### 5.1 `--destino` — crear el cliente en local ✅

```bash
node nuevo-cliente.mjs \
  --destino "C:/Users/sopor/OneDrive/socialcard_claudecode/<carpeta>" \
  --nombre  "<Nombre del restaurante>" \
  --url     "https://socialcard.es/<carpeta>/" \
  --idiomas es,en \
  --impuesto "<la frase del impuesto>" \
  --alergenos-en-origen si|no|desconocido \
  --zona-horaria "<IANA, p. ej. Europe/Madrid>" \
  --corte-hora <0-23> \
  [--juego true|false] [--publicidad true|false]
```

Todos los que no llevan corchetes son obligatorios; sin uno, el script lista exactamente cuál
falta y no escribe nada. Se niega a ejecutarse si el destino existe y contiene algo. **Nunca
toca la carpeta de origen.** Un idioma que no esté en el catálogo humano del script (paso 7)
aborta aquí mismo.

**Antes de escribir un solo fichero**, dos comprobaciones que reutilizan el contrato real de
`gen.mjs` (no son reglas nuevas, son las mismas leídas antes):
- `--url` tiene que contener el nombre de la carpeta de `--destino` — el mismo contrato que
  `motor/entorno.mjs::CARPETA_CLIENTE` comprueba después del hecho. Si no coincide, aquí falla
  al instante, sin haber creado nada; antes solo se descubría en `--build-local`, con medio
  cliente ya escrito.
- `--zona-horaria` tiene que ser un identificador IANA válido (`Intl.DateTimeFormat` real,
  igual que la comprobación de `gen.mjs`) y `--corte-hora` un entero 0-23.

Deja hecho, todo en local, nada en GitHub:

- El motor copiado (sección 1) y anclado con su propio `motor.lock` nuevo.
- `slug` nuevo, derivado del nombre de la carpeta.
- `cliente.mjs` con los rótulos, `alergenos: { leyenda: [], enOrigen: '<lo que se pasó>' }`,
  `zonaHoraria`/`servicio.corteHora` explícitos (nunca `Atlantic/Canary` por defecto — ver
  sección 6) y `activacionPanel: true`.
- `carta.json` vacío, marcado **no publicable**: mientras lleve la marca, el build aborta.
- Plantillas de idiomas (`i18n.<code>.mjs`), con el vocabulario **genérico del motor** ya
  relleno y **sin un solo texto del restaurante de origen** — las 7 claves de Tinge que sí
  mencionan el restaurante se quitan solas. Lo que NO rellena, a propósito, es la identidad de
  ESTE cliente (`impuesto`, `rotulo`, `titulo`, `descripcion` — los 4 campos que pasan por
  `T(x,'ui')`, ver sección 5.2): el idioma **base** los siembra consigo mismo (no hay nada que
  traducir, es el mismo idioma); cada idioma **extra** recibe en su lugar un aviso
  `FALTAN POR TRADUCIR` con las 4 claves exactas y su texto de origen al lado, de referencia
  — nunca el texto ya traducido, y nunca el del idioma base copiado tal cual dentro del extra.
- `server/estado.json` nuevo — nunca el de Tinge — que en el primer build se convierte en
  `2-subir/estado-EJEMPLO.json`.
- `.github/workflows/deploy.yml` sustituido (ruta y grupo de concurrencia propios), **sin**
  `DESPLIEGUE_REAL`.
- `.gitattributes` y `.gitignore` copiados tal cual. `.gitattributes` no es cosmético: sin él,
  el `core.autocrlf` del ordenador del operador reescribe los finales de línea de
  `motor/gen.mjs` (CRLF de origen) al hacer `git add`, y el blob que queda ya no es el que
  `motor.lock` certificó — CI lo ve como «el motor no cuadra» la primera vez que alguien haga
  un checkout limpio.
- `assets/.gitkeep` — ancla la carpeta vacía en git; sin fichero dentro, `assets/` desaparece en
  el primer commit y el primer `gen.mjs` en CI revienta con `ENOENT`. `gen.mjs` lo excluye
  explícitamente de lo que se publica: nunca llega a `2-subir/`.

**Aquí NO se genera ningún token de activación** — eso es el paso 5.4, `--publicar-github`, y
es la única vez que se muestra.

### 5.2 Configurar y traducir, a mano ✅

En `cliente.mjs`, los rótulos y el resto de campos obligatorios (detalle en la sección 6).

En cada `i18n.<code>.mjs` de un idioma **extra**, busca el bloque `FALTAN POR TRADUCIR` que
`--destino` dejó justo encima de `export const ui = {`: lista las 4 claves exactas
(`impuesto`, `rotulo`, `titulo`, `descripcion`) con su texto de origen al lado. Añade cada una
a `ui` con su clave literal y **la traducción real** a este idioma:

```js
export const ui = {
  "MwSt. inbegriffen": "IVA incluido",   // la clave es EL TEXTO DE ORIGEN, tal cual
  ...
};
```

**Nunca copies el texto de origen como si fuera la traducción** — ni el del idioma base
dentro de un extra, ni nada a medio traducir: `gen.mjs` no lo detecta como "falta" si la clave
existe, y publicaría el idioma a medias sin ningún aviso. El build sigue abortando
(`missing translations`) mientras falte una sola de las 4 claves en cualquier extra.

Después, la taxonomía de la carta: qué pestañas hay, qué grupos cuelgan de cada una y con qué
icono — detalle en la sección 7.

### 5.3 Escribir `carta.json` ✅

La carta se escribe con el idioma base como texto de partida. Cada plato y cada grupo llevan su
`dishId` / `categoryId`: **los acuña `motor/importar.mjs` la primera vez que corre sobre una
carta nueva** (UUID v4 sin guiones, prefijo `c_`/`d_`, comprobados contra los que ya existen en
el propio fichero) y reescribe `carta.json` en el sitio con los identificadores puestos. No se
escriben a mano y no se reutilizan de otro restaurante.

El número visible del plato (`numero`) es contenido: se puede cambiar y reordenar sin que nada
se rompa. **El `dishId` no cambia nunca**, ni al renombrar, ni al traducir, ni al cambiar el
precio, ni al mover de categoría. De él cuelgan fotos, precios, agotados, alérgenos y
estadísticas.

`recipeId` es opcional y se asigna a mano: une filas que son de verdad la misma receta.
Comparte fotografía y facilita sugerencias de alérgeno, pero **nunca copia alérgenos
verificados automáticamente**, ni comparte precios ni agotados, y toda propagación pide vista
previa y confirmación. No se unen platos veganos, sin gluten o con recetas distintas por
parecerse el nombre.

Cuando la carta esté escrita, **quita la marca de no publicable**.

### 5.4 `--build-local` — compilar y probar, todavía sin tocar GitHub ✅

```bash
node nuevo-cliente.mjs --build-local --destino "<carpeta>"
```

Corre `importar.mjs` y después `gen.mjs`, con un `PANEL_ACTIVACION_HASH` **temporal y
desechable** — un token aleatorio que sólo existe en memoria durante este comando, nunca se
imprime, nunca se guarda, nunca se reutiliza. Al terminar (éxito o fallo) borra
`2-subir/admin/activacion.php`, que es donde ese hash temporal habría quedado escrito. Repetible
tantas veces como haga falta mientras se ajusta la carta.

`gen.mjs` corre `motor/verificar-build.mjs` al final: si `2-subir` sale incompleta (falta un
fichero que `motor.lock` + `cliente.mjs` dicen que debía existir), el build no llega a decir
«compilado» — falla cerrado, sin necesitar un número fijo de ficheros por cliente.

Después, la batería de pruebas contra el servidor local. **Ninguna puede fallar.**

### 5.5 `--detectar` — comprobar que no quedan restos ✅

```bash
node nuevo-cliente.mjs --detectar --destino "<carpeta>"
```

Falla — no avisa — ante cualquier resto de Tinge. Puede correrse en cualquier momento desde el
paso 5.1, pero tiene más sentido justo antes de publicar. Cómo decide, y por qué no es un grep
ciego:

1. **Revisa TODOS los ficheros propiedad del cliente**, sin excepción: `cliente.mjs`,
   `carta.json`, los `i18n.*.mjs`, `assets/`, el workflow, y también lo generado —
   `menu.md`, `generado/` y `2-subir/` si ya existen (`2-subir` es la salida real que puede
   llegar a producción, no sólo fuente; vive fuera de `1-proyecto`, como hermana). Ahí,
   cualquier aparición del nombre, el slug, la URL, el secreto, los textos, las fotografías o
   los identificadores del restaurante de origen es un fallo.
2. **Los ficheros de `motor/` se validan por `motor.lock`**: si su hash coincide con el
   publicado, son bit a bit el motor y no pueden llevar datos del cliente de origen. Un
   fichero de `motor/` que no cuadre con su hash se revisa como si fuera del cliente — estar
   dentro de `motor/` no exime a nadie.

Como red de seguridad manual sobre los ficheros del cliente (no sobre `motor/`, que se
comprueba por hash):

```bash
grep -ril "tinge\|turmeric\|totm\|socialcard.es/tinge"   cliente.mjs carta.json i18n.*.mjs assets .github menu.md
```

**Cualquier resultado es un fallo.** No se sigue.

### 5.6 `--publicar-github` — la única que toca GitHub ✅

```bash
node nuevo-cliente.mjs --publicar-github --destino "<carpeta>" --repo <owner/repo>
```

Antes de correrlo, `SOCIALCARD_FTP_SERVER`, `SOCIALCARD_FTP_USERNAME` y
`SOCIALCARD_FTP_PASSWORD` tienen que existir como variables de entorno **en el ordenador del
operador** — se configuran una vez por máquina, nunca se escriben en código ni se copian de un
fichero del repositorio anterior. Sin las tres, el comando se niega a empezar.

Orden interno, y por qué importa el orden — **nunca `--push` en la creación del repo**:

1. `git init` (si hace falta) + `git add -A` + commit inicial, y comprueba que el árbol queda
   limpio.
2. `gh repo create --private`, **sin push todavía**.
3. `gh secret set`, los cinco, todos por STDIN (nunca por `--body` ni como argumento de línea de
   comandos — un argumento de proceso es visible para cualquier otro proceso de la máquina
   mientras `gh` corre; STDIN no):
   - `FTP_REMOTE_PATH` = `/<slug>/` — generada, no se escribe a mano ni se copia de otro cliente.
   - `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` — los del entorno del operador, reutilizados
     tal cual.
   - `PANEL_ACTIVACION_HASH` = el hash SHA-256 de un token real, generado aquí mismo.
4. **El token de activación se imprime en la consola, una sola vez.** No se repite, no se
   guarda en ningún sitio legible. Apúntalo en este momento.
5. `DESPLIEGUE_REAL` se pone explícitamente en `false`.
6. **Verificación antes de empujar**: lee de vuelta los cinco secrets y la variable. Si falta
   alguno o la variable no es `false`, para ahí — no empuja nada.
7. Sólo entonces, `git push -u origin main`.

Ese push ya dispara el workflow — con `DESPLIEGUE_REAL=false` corre en ensayo (dry-run), igual
que cualquier push posterior mientras la variable siga en `false`.

### 5.7 `--cerrar-activacion` — cerrar la puerta cuando ya se usó el token ✅

```bash
node nuevo-cliente.mjs --cerrar-activacion --repo <owner/repo>
```

Se corre **después** de confirmar que el restaurante activó su panel (paso 8). Sustituye el
Secret `PANEL_ACTIVACION_HASH` por 256 bits de aleatoriedad que no son el hash de ningún token
— nadie los generó a partir de uno conocido, así que ningún token puede volver a activar nada
con ese valor. **No lo borra**: `gen.mjs` exige `PANEL_ACTIVACION_HASH` no vacío en todo
cliente con `activacionPanel: true`, así que un build futuro sin este Secret simplemente no
llegaría a desplegarse. Detalle completo del porqué en la sección 8.

---

## 6. `cliente.mjs`, campo a campo

```js
nombre:        'Restaurante Cubano',
titulo:        'Restaurante Cubano — Carta',
tituloSocial:  'Restaurante Cubano — Cocina cubana',
rotulo:        'Cocina cubana',
descripcion:   'Restaurante Cubano — carta del restaurante.',
tituloJuego:   'Chilli Rush — Restaurante Cubano',
impuesto:      'Prices include IGIC',
cocina:        'Cuban',                            // opcional: sin ella no se publica el JSON-LD
moneda:        { simbolo: '€', iso: 'EUR' },
zonaHoraria:   'Atlantic/Canary',
servicio:      { corteHora: 6 },
alergenos:     { leyenda: [], enOrigen: 'si' },     // ver más abajo
funciones:     { datos: true, juego: true, publicidad: true },
activacionPanel: true,                              // lo escribe --destino; no se quita
```

**Todos obligatorios salvo `cocina`.** Ningún campo tiene valor por defecto en el motor: lo que
no se declare, no existe, y el build aborta nombrando el que falte.

`zonaHoraria` y `servicio.corteHora` los fija `--destino` a partir de `--zona-horaria` y
`--corte-hora` (sección 5.1) — **nunca `Atlantic/Canary` por defecto para todos.** `corteHora`
es política del restaurante, no un dato técnico con default seguro: una cafetería que abre a
las 05:00 necesita un corte más temprano que uno a medianoche, y equivocarse en silencio
caduca agotados de un servicio que todavía sigue abierto.

**El build aborta si `titulo`, `tituloSocial`, `tituloJuego` o `descripcion` no mencionan el
nombre.** Es la guarda que impide publicar con el `og:title` del restaurante anterior.

### Alérgenos: dos campos, dos preguntas distintas

- **`leyenda`**: qué iconos salen en el aviso genérico del pie. Selección del restaurante,
  `[]` es legal — quita la fila de iconos y deja sólo el aviso de texto. Las claves son las del
  catálogo canónico de `motor/alergenos.mjs` (14, los de la normativa UE):

  ```
  cereals_gluten · crustaceans · eggs · fish · peanuts · soybeans · milk · nuts ·
  celery · mustard · sesame · sulphites · lupin · molluscs
  ```

  Las 14 tienen icono dibujado en el motor (`motor/alergenos.mjs`) — catálogo completo, ninguna
  se queda sin icono al declararla en un plato.

  Tinge usa alias heredados (`wheat`, `nut`, `egg`...) que `motor/alergenos.mjs` resuelve a su
  canónica; un cliente nuevo usa las canónicas directamente, sin alias.

- **`enOrigen`**: `'si' | 'no' | 'desconocido'`. Dice si ESTE restaurante tiene el dato de
  alérgenos por plato, no si ya está cargado. **Obligatorio, sin valor por defecto.**
  - `'desconocido'` **bloquea el build**, a propósito — es el único estado legítimo para
    arrancar el alta sin haber decidido todavía, pero no publica nada mientras siga así.
  - `'si'` con cero platos declarando `alergenos` en `carta.json` **también bloquea el
    build** — la promesa de que el dato existe tiene que cumplirse antes de compilar.
  - `'no'` es la verdad de Tinge: no declara alérgenos plato a plato, y el build no lo exige.

  **Nunca se infiere un alérgeno** del nombre de un plato, de la receta ni de la fotografía. Se
  transcribe de lo que declara el propio restaurante (su carta impresa, su ficha de alérgenos),
  símbolo a símbolo.

---

## 7. Idiomas

En `cliente.mjs`:

```js
idiomas: {
  base:   { code: 'es', label: 'ES', dicts: ES, name: 'Español', bandera: 'es' },
  extras: [{ code: 'en', label: 'EN', name: 'English', bandera: 'gb' }],
},
```

El **base** es el idioma del texto del documento; cada idioma declara su **bandera** (fichero
de `motor/assets/banderas/`, sin extensión — una que no exista aborta el build) y su **nombre
en su propio idioma** (`name`), que es lo que lee el selector: un alemán busca «Deutsch», no
«DE». `--destino` rellena `name`/`bandera` solo, tomándolos de un catálogo humano fijo dentro
del propio script (`es, en, de, fr, it, pt` hoy — un código que no esté ahí aborta el alta
antes de escribir nada; añadirlo es una línea en `nuevo-cliente.mjs`, no una decisión por
cliente). El catálogo nativo del motor está en inglés: con base `en` no hace falta diccionario,
y un extra `en` tampoco. Cualquier otro idioma necesita su `i18n.<code>.mjs`; `--destino` crea
la plantilla con la sección `ui` genérica ya rellena y hay que revisarla.

**El build aborta si falta una traducción de interfaz.** No se publica una carta a medias.

---

## 8. Activar el panel ✅

**Sin contraseñas heredadas y sin panel reclamable por cualquiera.** Tres capas, cada una
independiente de las otras dos:

1. **En el build**: `activacionPanel: true` en `cliente.mjs` exige `PANEL_ACTIVACION_HASH` no
   vacío en el entorno — si falta, `gen.mjs` aborta. Lo aporta el Secret del repositorio en un
   despliegue real, o un hash temporal y desechable en `--build-local` (sección 5.4). Con ese
   hash presente, el build escribe `admin/activacion.php` con la definición; sin él, no se
   escribe nada — un cliente sin `activacionPanel` no pasa por ninguna de estas comprobaciones.
2. **Primera visita al panel**: `/<carpeta>/admin/` sólo pide el token de activación mientras
   no exista `admin/activacion.consumida` en el servidor. Con el token correcto, se crea la
   contraseña del restaurante.
3. **En cuanto se usa el token con éxito, tres cosas pasan en el mismo instante, en este
   servidor**:
   - Se escribe `admin/activacion.consumida` (marca de un solo uso; `index.php` la comprueba
     ANTES de mirar el token, así que en cuanto existe, la pantalla de activación deja de estar
     disponible para siempre, pase lo que pase con `clave.php` o con el Secret).
   - `admin/activacion.php` se reescribe con 256 bits de aleatoriedad que no son el hash de
     ningún token — cierre inmediato en ESTE servidor, sin esperar a un despliegue futuro.
   - La contraseña queda guardada en `admin/clave.php`.
4. **La tercera capa la cierra el operador a mano**: `--cerrar-activacion` (sección 5.7)
   sustituye también el Secret de GitHub por un valor muerto, para que el PRÓXIMO despliegue
   que se haga por cualquier motivo no traiga de vuelta el hash real desde el Secret y resucite
   un token ya gastado.

**No existe superadministrador común.** El rol es por cliente y opcional: si `activacionPanel`
no está a `true`, ninguna de estas tres capas se activa.

---

## 9. Taxonomía de la carta: pestaña vs grupo, e iconos

Una **pestaña** (`pestanas[]`) es una sección grande de la carta («Menú del día», «Pescados y
Marisco»). Un **grupo** (`pestanas[].grupos[]`) es una subcategoría dentro de una pestaña
(«Pescados», «Parrillada de Marisco»). Cada plato cuelga de un grupo, cada grupo de una
pestaña.

- **El icono de la pestaña es obligatorio siempre**, tenga uno o varios grupos dentro: el build
  aborta listando qué pestaña se quedó sin icono (`tabs with no icon in the index sheet`).
- **El icono del grupo es obligatorio en cuanto ese grupo lleva su propio subtítulo visible**
  (`subtitulo`/`sub`): el build aborta listando qué subcategoría se quedó con encabezado y sin
  icono (`subcategories with a heading but no icon`). Un grupo sin subtítulo no pinta
  encabezado y no necesita icono propio — es lo normal cuando una pestaña tiene un solo grupo,
  porque el nombre de la pestaña ya lo dice todo. **En la práctica, eso significa que en cuanto
  una pestaña tiene dos grupos o más hace falta poner subtítulo a cada uno para distinguirlos
  en pantalla, y con el subtítulo llega la obligación del icono.**

Iconos disponibles, y no hay más: `appetizers · soup · vegetarian · meat · salad · flame ·
leaf · lentils · rice · bread · fries · special · kids · bowl · drop · fish · seafood ·
dessert · drinks · coffee · cocktails · breakfast · pizza · burger`.

Los últimos nueve existen porque su falta era real, no anticipada: Bar Restaurante Guaza tenía
"Pescados" con el icono de `meat` y "Parrillada de Marisco" con el de `rice`, porque no había
nada mejor. Si una categoría nueva no encaja en ninguno de los 24, hace falta un icono nuevo —
no reutilizar el que se le parezca menos mal.

---

## 10. Dominio y ruta FTP ✅

Ya no se toca a mano: lo hace `--publicar-github` (sección 5.6), leyendo las credenciales del
entorno del operador y generando `FTP_REMOTE_PATH=/<slug>/` él solo. **Ruta nueva y propia
siempre** — nunca la de otro cliente, porque nace del slug del cliente que se está dando de
alta. Si `FTP_REMOTE_PATH` faltara, el workflow para antes de conectar: sin ruta, la subida
iría a la raíz del FTP, encima de las demás webs.

`DESPLIEGUE_REAL` la crea `--publicar-github`, explícita en `false`.

---

## 11. Primer despliegue en ensayo ✅

Con `DESPLIEGUE_REAL=false`, **cualquier push ya es un ensayo**. En el log, el paso «Comprobar
lo compilado» corre `motor/verificar-build.mjs` (el mismo código que en `--build-local`, sección
5.4) antes de que nada llegue al FTP. El paso «Subir por FTP» lista `dry-run: true` y termina
con algo como:

```
dry-run: true
Uploading: 0 B -- Deleting: 0 B -- Replacing: <lo que cambió de verdad>
```

`Uploading`/`Deleting` en 0 es la señal de que no hubo escritura real; `Replacing` sólo cuenta
lo que el propio contenido cambió — un alta nueva con carta completa mostrará ahí el peso real
de lo compilado, y eso es correcto, no una alarma. **Si en el listado aparece `estado.json`,
`clave.php`, `record.json`, `assets/hero/**` o `assets/platos/**`, hay un fallo en las
exclusiones: párate y revísalo antes de publicar.**

## 12. Publicar de verdad y verificar ✅

Sólo cuando el ensayo esté limpio, y con **autorización expresa y separada** del propietario:

```
gh variable set DESPLIEGUE_REAL --body "true"   → verificar leyendo de GitHub
push a main (o gh workflow run deploy.yml --ref main, sobre el commit aprobado)
seguir el run hasta success                     → dry-run: false · FTPS strict
verificación externa                            → version.json público = build nuevo
humo de producción SOLO LECTURA                 → carta, idiomas, alérgenos, 404, panel
                                                   protegido, juego, consola limpia
gh variable set DESPLIEGUE_REAL --body "false"  → verificar leyendo de GitHub
```

El primer despliegue real sube los ficheros completos; a partir del segundo sólo viajan las
diferencias. La variable **vuelve siempre a `false`**, también si el despliegue falla — ante
cualquier fallo, `DESPLIEGUE_REAL=false` primero, después parar y reportar exactamente qué
falló. Sin rollback automático.

Verificar en la URL pública:

- La carta abre y muestra todos los platos, con sus alérgenos si `enOrigen: 'si'`.
- El `<title>`, el `canonical` y el `og:title` llevan **este** restaurante.
- El buscador encuentra.
- Todos los idiomas configurados funcionan.
- El panel abre y **pide el token de activación** (todavía no la contraseña).
- `/<carpeta>/ruta-inventada` devuelve **404** con la página de la carta.
- `estado-EJEMPLO.json` responde, pero **nunca** se deja como `estado.json` real hasta
  renombrarlo a mano una sola vez en el servidor.

Después de esto: activar el panel (sección 8) y, confirmada la activación,
`--cerrar-activacion` (sección 5.7).

---

## 13. Lista final de comprobación

Antes de dar el alta por terminada, todo esto tiene que estar en verde:

- [ ] `--detectar` limpio: **cero resultados**
- [ ] `slug` y secreto del juego nuevos y aleatorios
- [ ] `dishId` y `categoryId` acuñados por `importar.mjs`; ninguno del origen
- [ ] Los seis rótulos con el nombre correcto
- [ ] Impuesto decidido y escrito
- [ ] `alergenos.enOrigen` decidido (`si`/`no`) — nunca se queda en `desconocido`
- [ ] Si `enOrigen: 'si'`: al menos un plato con `alergenos` declarados en `carta.json`
- [ ] `zonaHoraria` y `corteHora` decididos para ESTE restaurante, no heredados de Canarias
- [ ] Cero avisos `FALTAN POR TRADUCIR` en ningún `i18n.<extra>.mjs` (los 4 campos de
      identidad traducidos de verdad, nunca con el texto de origen copiado tal cual)
- [ ] Toda pestaña con icono; todo grupo con subtítulo, con icono
- [ ] `FTP_REMOTE_PATH` propia, generada por `--publicar-github`, distinta de la de cualquier
      otro cliente
- [ ] `carta.json` sin la marca de no publicable
- [ ] `motor/verificar-build.mjs` pasa sin problemas, en local y en el workflow
- [ ] Sin `clave.php`, `superclave.php`, `estado.json`, fotos ni logs del origen
- [ ] Ensayo de despliegue limpio, sin ficheros de servidor en el listado
- [ ] Panel pidiendo el token de activación, **no** ofreciendo poner contraseña
- [ ] Contraseña creada y `admin/activacion.consumida` presente en el servidor
- [ ] `--cerrar-activacion` ejecutado (Secret de GitHub también muerto)
- [ ] `estado-EJEMPLO.json` renombrado a `estado.json` en el servidor
- [ ] Batería de pruebas al 100 %
- [ ] `motor.lock` del cliente nuevo idéntico al de Tinge (mismo motor, byte a byte)

---

## Lo que hay que decirle al cliente

- Su carta está en `<URL>`.
- Su panel está en `<URL>admin/`, y **la contraseña la pone él** con el token de activación.
- Desde el panel cambia precios, agotados, ofertas, fotos y tema, y se ve **al instante**.
- Cambiar platos o categorías todavía **no** se hace desde el panel: se pide.
- Si `enOrigen: 'no'`, la carta no lleva información de alérgenos hasta que decida declararlos
  y se recompile con `enOrigen: 'si'` y la carta cargada. Nunca se inventa ni se deduce uno.
