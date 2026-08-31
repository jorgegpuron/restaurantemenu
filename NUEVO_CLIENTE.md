# Dar de alta un restaurante

**Procedimiento obligatorio.** Instrucciones para ejecutarlas en orden, no para leerlas por
encima. Cada paso tiene una comprobación; si una falla, se para ahí y se dice por qué.

> ### ⚠️ Estado de este documento
>
> Describe el procedimiento **de destino**, con las herramientas que crean las fases 2 a 7 del
> plan de migración. Cada paso lleva su marca:
>
> | Marca | Significado |
> |---|---|
> | ✅ | Funciona hoy |
> | 🔧 | Necesita una fase de la migración que aún no está hecha |
> | 🔴 | Bloqueado por una decisión pendiente |
>
> **Mientras queden pasos 🔧, el alta no se puede completar siguiendo sólo este documento.**
> Hasta entonces sigue vigente `NUEVO-CLIENTE.md`, en la raíz de `socialcard_claudecode/`,
> que describe el método de copiar una carpeta existente. **Ese documento queda obsoleto en
> cuanto este esté completo, y hay que retirarlo**: dos procedimientos vivos para lo mismo es
> exactamente el problema que este plan viene a resolver.

---

## 0. Antes de tocar nada

Sin las cuatro primeras respuestas no se empieza:

1. **El nombre**, tal y como quiere verlo el cliente en la carta. Corto: es un titular.
2. **La dirección pública**, con su carpeta. Por ejemplo `socialcard.es/restaurante_cubano/`.
3. **La carta**: fichero, PDF, foto o enlace. Es el trabajo de verdad.
4. **El impuesto** que se aplica: IGIC en Canarias, IVA en la península, otra cosa fuera de
   España. **No hay valor por defecto y el build revienta si falta**, a propósito.
5. Los **idiomas**. Por defecto inglés —texto base— y español. Cada idioma más son ~110 cadenas
   de interfaz que hay que traducir.
6. El **enlace de reseñas de Google**, si lo tiene. Si no, se deja vacío y lo pone él desde el
   panel.

---

## 1. Qué se conserva del motor 🔧

Se copia **sin tocar una línea**. Si te encuentras editando algo de esta lista para que el
cliente nuevo funcione, es que hay un dato escrito como código y hay que sacarlo al cliente.

> 🔧 **Hoy `motor/`, `motor.lock` y `alergenos.mjs` no existen**: los ficheros del motor viven
> sueltos en la raíz del proyecto. Esta lista describe el destino tras la fase de separación.

```
motor/gen.mjs          el compilador
motor/importar.mjs     carta → menu.md + diccionarios
motor/temas.mjs        los cinco temas de color
motor/juego.mjs        el juego
motor/error404.mjs     la página de error
motor/adelgazar.mjs    quita comentarios del HTML publicado
motor/banderas.mjs     las banderas de los idiomas
motor/alergenos.mjs    el catálogo inmutable de los 14
motor/server/admin/**  el panel
motor.lock             versión y hashes del motor
```

## 2. Qué se sustituye entero 🔧

Nada de esto se hereda: se escribe nuevo para cada restaurante.

| Fichero | Qué lleva |
|---|---|
| `cliente.mjs` | Identidad, rótulos, URL, idiomas, impuesto, tema, funciones, alérgenos, sinónimos, taxonomía |
| `carta.json` | Platos y categorías, con sus identificadores 🔧 |
| `i18n.*.mjs` | Un diccionario por idioma, con su sección `ui` |
| `assets/` | La marca del restaurante |
| `.github/workflows/deploy.yml` | El despliegue, con su ruta |

## 3. Qué se elimina ✅

De una copia recién hecha desaparecen, antes de nada:

```
.git/                    el historial del otro restaurante
index.html juego.html    generados
404.php version.json     generados
menu.md                  generado
2-subir/                 generado entero
3-copias/                los puntos de restauración del otro
```

## 4. Qué NO se copia NUNCA ✅

**Ni para probar, ni «de momento», ni renombrado.**

| | Por qué |
|---|---|
| `admin/clave.php` · `admin/superclave.php` | Contraseñas de otro negocio |
| `admin/intentos.json` · `admin/accesos.log` | Registros de acceso ajenos |
| `estado.json` | Agotados, precios y ofertas de otro restaurante |
| `record.json` · `admin/marcador.json` · `admin/canjes.json` | Partidas y premios ajenos |
| `assets/hero/` · `assets/platos/` | **Fotografías de otro restaurante** |
| `admin/copias/` · `admin/datos/` | Historial y estadísticas ajenas |
| `admin/alergenos.json` 🔧 | **Borradores y alérgenos de otro restaurante** |
| `carta.json` del origen 🔧 | Su carta |
| Cualquier `dishId`, `categoryId` o `recipeId` del origen 🔧 | Identificadores ajenos |
| El `slug` y el `secreto` del origen | Un premio ganado en A se canjearía en B |

**Los alérgenos son la peor de todas.** Copiar los de otro restaurante es publicar información
de seguridad alimentaria falsa. El script se niega, y el detector de restos lo busca.

---

## 5. Crear el cliente 🔧

```bash
node nuevo-cliente.mjs \
  --destino "C:/Users/sopor/OneDrive/socialcard_claudecode/<carpeta>" \
  --nombre  "<Nombre del restaurante>" \
  --url     "https://socialcard.es/<carpeta>/" \
  --idiomas es
```

El script **se niega a ejecutarse** si el destino existe o contiene archivos. **Nunca toca la
carpeta de origen.**

Deja hecho:

- El motor copiado y anclado, con su `motor.lock`.
- `slug` y secreto de juego **aleatorios y nuevos**.
- Plantillas neutras de los idiomas pedidos, **con su sección `ui` completa** y sin un solo texto
  del restaurante de origen.
- `carta.json` de ejemplo, **marcada como no publicable**: mientras lleve la marca, el build
  aborta.
- `allergens.coverage: 'none'`.
- El workflow **sin** `DESPLIEGUE_REAL`.
- El token de activación del panel, mostrado **una sola vez** en la consola.

> **Apunta el token de activación en ese momento.** No se vuelve a mostrar y no se guarda en
> ningún sitio legible.

## 6. Configurar el cliente ✅

En `cliente.mjs`, los seis rótulos y el impuesto:

```js
nombre:        'Restaurante Cubano',
titulo:        'Restaurante Cubano — Carta',
tituloSocial:  'Restaurante Cubano — Cocina cubana',
rotulo:        'Cocina cubana',
descripcion:   'Restaurante Cubano — carta del restaurante.',
tituloJuego:   'Chilli Rush — Restaurante Cubano',
impuesto:      'Prices include IGIC',
```

**El build aborta si `titulo`, `tituloSocial`, `tituloJuego` o `descripcion` no mencionan el
nombre.** Es la guarda que impide publicar con el `og:title` del restaurante anterior — lo que ve
el cliente al pegar su enlace en WhatsApp, y que nadie mira hasta que lo mira él.

Después, la taxonomía: qué pestañas hay, qué categorías cuelgan de cada una y con qué icono.
Iconos disponibles, y no hay más: `appetizers · soup · vegetarian · meat · salad · flame · leaf ·
lentils · rice · bread · fries · special · kids · bowl · drop`.

## 7. Idiomas ✅ (a mano) · 🔧 (las plantillas del script)

En `cliente.mjs`:

```js
export const IDIOMAS_CLIENTE = [
  { code: 'es', label: 'ES', dicts: ES, name: 'Español' },
];
```

El inglés es el texto base del documento y siempre está: no se declara. Cada idioma necesita su
`i18n.<code>.mjs`. El script crea las plantillas; hay que traducir la sección `ui`.

**El build aborta si falta una traducción de interfaz.** No se publica una carta a medias.

## 8. Importar la carta 🔧

La carta se escribe en `carta.json`, con el inglés como texto base. Cada plato lleva su
`dishId`; cada categoría, su `categoryId`. **Los genera el script, no se escriben a mano y no se
reutilizan de otro restaurante.**

El número visible del plato (`numero`) es contenido: se puede cambiar y reordenar sin que nada se
rompa. **El `dishId` no cambia nunca**, ni al renombrar, ni al traducir, ni al cambiar el precio,
ni al mover de categoría. De él cuelgan fotos, precios, agotados, alérgenos y estadísticas.

`recipeId` es opcional y **se asigna a mano**: une filas que son de verdad la misma receta.
Comparte fotografía y facilita sugerencias de alérgeno. **Nunca copia alérgenos verificados
automáticamente, ni comparte precios ni agotados**, y toda propagación pide vista previa y
confirmación. No se unen platos veganos, sin gluten o con recetas distintas por parecerse el
nombre.

Cuando la carta esté escrita, **quita la marca de no publicable**.

## 9. Dominio y ruta FTP ✅

En el repositorio nuevo, Settings → Secrets and variables → Actions → **Secrets**:

| Secreto | Valor |
|---|---|
| `FTP_SERVER` | El nombre del servidor del hosting, **no el dominio** |
| `FTP_USERNAME` | Usuario FTP |
| `FTP_PASSWORD` | Contraseña |
| `FTP_REMOTE_PATH` | `/<carpeta>/` — con barra al principio y al final |

**Ruta nueva y propia. Nunca la de otro cliente.** Si `FTP_REMOTE_PATH` faltara, el workflow para
antes de conectar: sin ruta, la subida iría a la raíz del FTP, encima de las demás webs.

`DESPLIEGUE_REAL` **no se crea todavía**.

## 10. Inicializar el panel 🔴

**Sin contraseñas heredadas y sin panel reclamable por cualquiera.**

1. El script generó un token de activación **aleatorio, temporal y único de este cliente**. Su
   hash se inyecta en el build desde el secreto `PANEL_ACTIVACION_HASH`; **el token en claro no
   entra en git ni se muestra en ninguna página**.
2. Tras el primer despliegue, entra en `/<carpeta>/admin/`. El panel **sólo pide el token de
   activación**: no ofrece configurar nada más.
3. Con el token válido, se crea la contraseña del restaurante.
4. Hecho eso, **la activación queda invalidada**, aunque el hash siga desplegado.
5. Si caduca o se gasta, se genera otro cambiando el secreto y volviendo a desplegar.

**No se crea superadministrador común.** El rol es por cliente y opcional: si no hay hash, no
existe.

> Este paso está marcado 🔴 porque el mecanismo de activación es una fase pendiente. **Hasta que
> esté implementado, no se despliega ningún panel nuevo a una URL pública.**

---

## 11. Comprobar que no quedan restos 🔧

```bash
node nuevo-cliente.mjs --detectar --destino "<carpeta>"
```

Cómo decide, y por qué no es un grep ciego:

1. **Los ficheros propiedad del cliente se revisan TODOS**, sin excepción: `cliente.mjs`,
   `carta.json`, los `i18n.*.mjs`, `assets/`, el workflow, y también los generados (`menu.md`,
   `2-subir/` si existe). Ahí, cualquier aparición del **nombre**, el **slug**, la **URL**, el
   **secreto**, los **textos**, las **fotografías** o los **identificadores** del restaurante de
   origen es un fallo.
2. **Los ficheros del motor se validan por `motor.lock`**: si su hash coincide con el de la
   versión publicada del motor, son bit a bit el motor y no pueden llevar datos del cliente de
   origen. Un fichero de `motor/` **que no cuadre con su hash se revisa como si fuera del
   cliente** — estar dentro de `motor/` no exime a nadie.
3. Mientras el motor conserve referencias históricas legítimas en comentarios, el punto 2 es lo
   que evita el falso positivo sin taparlas. Las referencias **funcionales** —hoy, el nombre de
   evento `totm:lang` en `gen.mjs`— se generalizan en la fase de separación del motor, con su
   verificación de HTML, y hasta entonces cuentan como deuda del motor, no del cliente.

A mano, como red de seguridad sobre los ficheros del cliente (no sobre `motor/`, que se
comprueba por hash):

```bash
grep -ril "tinge\|turmeric\|totm\|socialcard.es/tinge"   cliente.mjs carta.json i18n.*.mjs assets .github menu.md
```

**Cualquier resultado es un fallo.** No se sigue.

## 12. Importar, compilar y probar ✅ (comandos) · 🔧 (carta.json)

```bash
node importar.mjs   # carta.json -> menu.md + diccionarios
node gen.mjs        # compila y rehace 2-subir/
```

**Estos dos comandos no cambian nunca, ni siquiera cuando el motor viva en `motor/`.** La fase
de separación deja en la raíz dos envoltorios de una línea que cargan el motor; así este
documento, el workflow y la memoria de quien ya trabajó con el proyecto siguen valiendo. Si un
día ves documentación que diga `node motor/gen.mjs`, es que está mal.

`gen.mjs` aborta si: hay `menu.md` sin carta, un rótulo no menciona al restaurante, la URL no
contiene el nombre de la carpeta, o falta el impuesto.

Después, la batería de pruebas contra el servidor local. **Ninguna puede fallar.**

## 13. Primer despliegue en ensayo ✅

`DESPLIEGUE_REAL` no existe todavía, así que **cualquier push ya es un ensayo**. En el log, el
paso «Subir por FTP» lista lo que subiría:

```
📄 Upload: index.html
📄 Upload: admin/index.php
...
Time spent deploying: 1 millisecond    <-- no hubo transferencia
```

**Si en ese listado aparece `estado.json`, `clave.php`, `record.json`, `assets/hero/**` o
`assets/platos/**`, hay un fallo en las exclusiones: párate y revísalo antes de publicar.**

## 14. Publicar y verificar ✅

Sólo cuando el ensayo esté limpio: Settings → Variables → `DESPLIEGUE_REAL` = `true`, y push.

El primer despliegue real sube los ficheros completos; a partir del segundo sólo viajan las
diferencias.

Verificar en la URL pública:

- La carta abre y muestra todos los platos.
- El `<title>`, el `canonical` y el `og:title` llevan **este** restaurante.
- El buscador encuentra.
- Todos los idiomas configurados funcionan.
- El panel abre y **pide el token de activación**.
- `/<carpeta>/ruta-inventada` devuelve **404** con la página de la carta.
- `estado-EJEMPLO.json` devuelve **403**.
- Renombrar la carpeta `estado-EJEMPLO.json` a `estado.json` en el servidor, **una sola vez**.

---

## 15. Lista final de comprobación

Antes de dar el alta por terminada, todo esto tiene que estar en verde:

- [ ] `grep` de restos del restaurante de origen: **cero resultados**
- [ ] `slug` y secreto del juego **nuevos y aleatorios**
- [ ] `dishId` y `categoryId` **nuevos**; ninguno del origen
- [ ] Los seis rótulos con el nombre correcto
- [ ] Impuesto decidido y escrito
- [ ] `FTP_REMOTE_PATH` propia, distinta de la de cualquier otro cliente
- [ ] `carta.json` sin la marca de no publicable
- [ ] `allergens.coverage: 'none'`
- [ ] **Cero alérgenos, borradores y reglas heredados**
- [ ] Sin `clave.php`, `superclave.php`, `estado.json`, fotos ni logs del origen
- [ ] Ensayo de despliegue limpio, sin ficheros de servidor en el listado
- [ ] Panel pidiendo el token de activación, **no** ofreciendo poner contraseña
- [ ] Contraseña creada y activación invalidada
- [ ] `estado.json` renombrado en el servidor
- [ ] Batería de pruebas al 100 %
- [ ] `TINGE_CLIENTE.md` equivalente escrito **para este cliente**

---

## Lo que hay que decirle al cliente

- Su carta está en `<URL>`.
- Su panel está en `<URL>admin/`, y **la contraseña la pone él** con el token de activación.
- Desde el panel cambia precios, agotados, ofertas, fotos y tema, y se ve **al instante**.
- Cambiar platos o categorías todavía **no** se hace desde el panel: se pide.
- La carta no lleva información de alérgenos hasta que él la verifique plato a plato.
