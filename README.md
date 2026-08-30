# Carta de Tinge of Turmeric — despliegue

La carta pública vive en <https://socialcard.es/tinge_of_turmeric/menu2/>.
Este repositorio es la carpeta `1-proyecto/`: lo que se edita a mano.

## Cómo funciona el despliegue

Cada push a `main` lanza [el workflow](.github/workflows/deploy.yml), que hace cuatro cosas:

1. Descarga el repositorio en `tinge_of_turmeric/1-proyecto`.
2. Compila con `node gen.mjs`, que genera `2-subir/` entera desde cero.
3. Comprueba que el resultado no esté roto.
4. Sube `2-subir/` por FTPS a `/tinge_of_turmeric/menu2/`.

`2-subir/` **no está en git**: se regenera en cada compilación. Lo que se versiona es la
fuente, no el resultado.

Manda un único interruptor: la variable de repositorio **`DESPLIEGUE_REAL`**.

| `DESPLIEGUE_REAL` | Qué pasa en cada push |
|---|---|
| no existe, o no vale `true` | **Ensayo.** Calcula y lista los cambios. No escribe nada en el servidor |
| `true` | **Publica** de verdad |

## Cómo hacer un cambio normal

La carta se edita en `carta.mjs`; quién es el restaurante, en `cliente.mjs`.

```bash
node importar.mjs   # reescribe menu.md y los i18n desde carta.mjs
node gen.mjs        # compila y rehace 2-subir/
```

`menu.md` y los `i18n.*.mjs` **los escribe el importador**: editarlos a mano se pierde en la
siguiente pasada. La única parte que se mantiene a mano es la sección `ui` de cada i18n.

Después, lo de siempre:

```bash
git add -A && git commit -m "..." && git push
```

Antes de tocar nada visual, lee `SPEC.md`: es el registro de decisiones de diseño con sus
medidas.

## Cómo comprobar un ensayo

Mientras `DESPLIEGUE_REAL` no exista, **cualquier push ya es un ensayo**. También se puede
lanzar a mano desde la pestaña Actions → «Desplegar carta a socialcard.es» → Run workflow.

En el log, el paso «Subir por FTP» lista lo que subiría:

```
📄 Upload: index.html
📄 Upload: admin/index.php
...
Time spent deploying: 1 millisecond    <-- no hubo transferencia
```

Si en ese listado aparece alguno de los ficheros de la tabla de abajo, **hay un fallo en las
exclusiones**: párate y revísalo antes de publicar.

## Cómo activar el despliegue real

Settings → Secrets and variables → Actions → pestaña **Variables** → New repository variable:

```
Nombre:  DESPLIEGUE_REAL
Valor:   true
```

A partir de ahí, cada push a `main` publica.

## Cómo volver al modo ensayo

Borra la variable `DESPLIEGUE_REAL`, o cámbiale el valor a cualquier cosa que no sea `true`.
Vuelve a ser ensayo en el run siguiente.

## Lo que nunca se despliega

Estos ficheros **son del servidor, no del proyecto**. Los escribe el panel de administración
y contienen datos reales del negocio. El workflow ni los sube ni los borra:

| Fichero o carpeta | Qué contiene |
|---|---|
| `estado.json` | Agotados del día, precios, ofertas, tema, fotos activas |
| `record.json` | Récords del juego |
| `assets/hero/` | Fotos de portada que sube el restaurante |
| `assets/platos/` | Foto de cada plato |
| `admin/clave.php` | Hash de la contraseña del panel |
| `admin/superclave.php` | Hash del superadministrador |
| `admin/intentos.json` | Control de fuerza bruta |
| `admin/accesos.log` | Registro de entradas al panel |
| `admin/canjes.json` | Premios canjeados |
| `admin/marcador.json` | Marcador del juego |
| `admin/permitir-hash.txt` | Permiso temporal para generar hashes |
| `admin/copias/` | Historial de `estado.json` |
| `admin/datos/` | Contadores de visitas |
| `admin/acceso*.jpg` | Imágenes de la pantalla de acceso, por si se cambiaron en el servidor |
| `LEEME-SERVIDOR.txt` | Notas internas: no tienen por qué ser públicas |

Subir encima de `clave.php` dejaría al restaurante fuera de su panel. Pisar `estado.json`
borraría los agotados del día.

## Secretos que hacen falta

En Settings → Secrets and variables → Actions → **Secrets**:

| Secreto | Valor |
|---|---|
| `FTP_SERVER` | Host FTP del hosting |
| `FTP_USERNAME` | Usuario FTP |
| `FTP_PASSWORD` | Contraseña |
| `FTP_REMOTE_PATH` | `/tinge_of_turmeric/menu2/` — con barra al principio y al final |

Si `FTP_REMOTE_PATH` faltara, el workflow **para antes de conectar**: sin ruta, la subida
iría a la raíz del FTP, encima de las demás webs de la cuenta.

## Detalles que sorprenden

**El checkout va a `tinge_of_turmeric/1-proyecto`, no a la raíz.** `gen.mjs` comprueba que el
nombre de la carpeta que contiene `1-proyecto` aparezca en `cliente.mjs → base`, como
detector de restos de otro restaurante. Con un checkout normal la carpeta sería el nombre del
repositorio y el build fallaría siempre.

**El primer despliegue real sube los 62 ficheros completos.** El action guarda su estado en
`.ftp-deploy-sync-state.json` dentro de la carpeta remota; hasta que ese fichero exista, cree
que el servidor está vacío. A partir del segundo despliegue solo viajan las diferencias.

**Las tres actions van fijadas por SHA**, no por etiqueta: una etiqueta se puede reescribir
para que apunte a otro código, y una de ellas recibe las credenciales FTP. Al actualizar, se
cambian SHA y comentario a la vez.
