# Tinge of Turmeric — configuración del cliente

Lo que este restaurante tiene de propio. **Nada de este documento es motor**: si al montar otro
restaurante te encuentras copiando algo de aquí, párate.

> **Este documento no contiene contraseñas, credenciales FTP, tokens ni secretos.** Cuando algo
> es secreto se dice dónde vive, no cuánto vale.

Estado retratado el **31 de agosto de 2026**, build `1788176301627`.

---

## Identidad

| | |
|---|---|
| Nombre | Tinge of Turmeric |
| Carpeta del cliente | `tinge_of_turmeric/` |
| `slug` | `totm` — prefija las siete claves que la carta guarda en el navegador |
| Repositorio | `jorgegpuron/restaurantemenu`, rama `main` |
| Raíz del repositorio | `tinge_of_turmeric/1-proyecto/` |

**El `slug` no se toca nunca.** `localStorage` es por dominio, no por carpeta: cambiarlo le borra
a cada comensal con la carta abierta su tema, su idioma, su tamaño de letra y, si ha ganado hoy,
su premio sin canjear.

## Dirección pública y despliegue

| | |
|---|---|
| URL de la carta | <https://socialcard.es/tinge_of_turmeric/menu2/> |
| Ruta de despliegue | `/tinge_of_turmeric/menu2/` — en el secreto `FTP_REMOTE_PATH` |
| Panel | `/tinge_of_turmeric/menu2/admin/` |
| Juego | `/tinge_of_turmeric/menu2/juego.html` |
| Método | FTPS con verificación estricta, desde GitHub Actions |

Los secretos del repositorio son `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` y
`FTP_REMOTE_PATH`. **Sus valores no se documentan aquí.**

El interruptor de publicación es la variable de repositorio `DESPLIEGUE_REAL`. Si no vale `true`,
todo despliegue es un ensayo.

## Rótulos

Los seis salen de `cliente.mjs` y **no son intercambiables**. Cada uno aparece en un sitio
distinto, y el build aborta si alguno no menciona el nombre del restaurante.

| Campo | Valor | Dónde sale |
|---|---|---|
| `nombre` | Tinge of Turmeric | El titular grande de la portada |
| `titulo` | Tinge of Turmeric — Indian Restaurant Menu. | Pestaña del navegador y Google |
| `tituloSocial` | Tinge of Turmeric — South Indian Restaurant Menu | Al pegar el enlace en WhatsApp o Facebook |
| `rotulo` | South Indian Restaurant Menu | La línea pequeña sobre el titular |
| `descripcion` | Tinge of Turmeric — Indian restaurant menu. | La frase de Google bajo el título |
| `tituloJuego` | Chilli Rush — Tinge of Turmeric | Pestaña del navegador en el juego |

`imagenSocial`: `assets/hero/13e8475aef8d2630.jpg`. **Ojo:** apunta a una foto que sube el
restaurante desde el panel y que **no viaja en el build**. Si cambia las portadas, ese nombre deja
de existir y el enlace se comparte sin imagen. Se comprueba abriendo la URL.

## Impuesto

`impuesto: 'Prices include IGIC'` — Canarias. **Obligatorio: el build revienta si falta**, y no
hay valor por defecto a propósito. Un «IGIC» de fábrica acabaría publicado en un restaurante de
Madrid.

Se traduce: existe como clave en la sección `ui` de cada diccionario.

## Idiomas

Inglés como texto base del documento —lo que indexa Google— más:

| Código | Etiqueta | Diccionario |
|---|---|---|
| `es` | ES · Español | `i18n.es.mjs` |
| `de` | DE · Deutsch | `i18n.de.mjs` |

604 claves por diccionario. Las secciones `names` y `descriptions` las escribe `importar.mjs`
desde la carta; la sección `ui` es **a mano** y es la única parte que no se regenera.

## Tema

Tema publicado ahora: **onice**. Lo elige el restaurante desde el panel, en `estado.json`.
La semilla del repositorio (`server/estado.json`) trae `laurel`, que es lo que vería una
instalación nueva antes de que nadie toque nada.

Temas disponibles en el motor: laurel, onice, caoba, mar, ciruela.

## La carta

| | |
|---|---|
| Filas de plato | 312 |
| Nombres distintos | 183 |
| Pestañas | 13 |
| Categorías | 40 |
| Fuente | `carta.mjs` → `importar.mjs` → `menu.md` + diccionarios |

Pestañas: Aperitivos y sopas · Entrantes · Ensaladas · A la plancha · Currys · Especialidades ·
Verduras y lentejas · Biryani · Panes · Arroces y patatas · Niños · Sin gluten · Vegano.

**Dos pestañas son transversales.** «Sin gluten» (67 filas) y «Vegano» (76 filas) repiten platos
que ya están en su pestaña de comida. De ahí salen dos particularidades que hay que conocer antes
de tocar nada:

1. **27 filas** son el mismo plato con el mismo precio en dos sitios. Un plato agotado lo está en
   todas sus filas: lo resuelve `plato_hermanas()` en el panel.
2. **63 platos tienen el mismo nombre y distinto precio** según la pestaña — la sopa de lentejas
   vale 7,00 € en Aperitivos y 8,00 € en Sin gluten. **Es deliberado:** esas versiones se preparan
   aparte y cuestan más. Está razonado en `SPEC.md`. **Quien las iguale estará bajando precios que
   el restaurante ha subido a propósito.**

Las pestañas Sin gluten y Vegano llevan su línea de aviso (`intro` en `carta.mjs`) explicando esa
diferencia de precio, en los tres idiomas.

### Sinónimos del buscador

Nueve grupos en `cliente.mjs → SINONIMOS`, medidos contra esta carta: chili/guindilla,
okra/bhindi, carne picada/kheema, nata/malai, brasa/plancha, espinacas/saag/palak,
garbanzos/chana, coliflor/gobhi, queso/paneer. Son vocabulario de **este** restaurante: media
carta está en indio transcrito.

## El juego

«Chilli Rush». Encendido. Configuración publicada: objetivo 10, 1 minuto, premio «¡1 BEBIDA
GRATIS! 🥤» en los tres idiomas.

La sal con la que se firman los códigos está en `cliente.mjs → secreto`. **No se documenta su
valor y no se cambia nunca**: cambiarla invalida los códigos que alguien pueda tener en el móvil
en este momento. El build la copia a `admin/cliente.php` para que el panel valide los canjes.

## Redes y reseñas

Configuradas desde el panel, viven en `estado.json`. Hay puestas: **WhatsApp, Instagram, Facebook
y TripAdvisor**. Del WhatsApp se guarda sólo el número; la carta monta el enlace.

Reseñas de Google: encendidas, **4,8 sobre 5 con 870 opiniones**. El enlace está en
`estado.json → review.url`. La nota y el número los escribe el restaurante desde el panel; no se
piden a Google en vivo.

## Alérgenos

**Estado actual: ningún plato declara alérgenos.** La carta muestra sólo la leyenda general del
pie, que es lo que aparece precisamente cuando nadie ha declarado nada.

Configuración de destino tras la migración:

```js
allergens: { coverage: 'none', showIcons: true, showFilter: false,
             showGeneralNotice: true, lastVerifiedAt: null, lastVerifiedBy: null }
```

**Tinge arranca en `coverage: 'none'`**, decidido y aprobado. Pasar a `partial` o `complete`
exige verificar plato por plato desde el panel.

## Datos que sólo existen en producción

**Nada de esto está en git, y ninguna subida lo pisa.** El workflow lo excluye y `.gitignore`
lo bloquea: doble cierre.

| Fichero o carpeta | Qué contiene | Estado hoy |
|---|---|---|
| `estado.json` | Agotados, precios, ofertas, tema, fotos activas, redes, reseñas | Actualizado 30 ago 2026 |
| `record.json` · `admin/marcador.json` | Récords y marcador del juego | — |
| `assets/hero/` | Portadas que sube el restaurante | **3 fotos** |
| `assets/platos/` | Foto por plato | **1 foto** |
| `admin/clave.php` | Hash de la contraseña del panel | Configurada |
| `admin/superclave.php` | Hash del superadministrador, opcional y por cliente | — |
| `admin/intentos.json` · `admin/accesos.log` | Fuerza bruta y registro de accesos | — |
| `admin/canjes.json` | Premios canjeados | — |
| `admin/copias/` | Historial de `estado.json` | — |
| `admin/datos/` | Contadores de visitas | — |
| `admin/permitir-hash.txt` | Permiso temporal para generar hashes | — |
| `LEEME-SERVIDOR.txt` | Notas internas | — |

Instantánea operativa del 31 ago 2026: 0 agotados · 0 precios cambiados · oferta apagada ·
3 etiquetas destacadas · 1 foto de plato · 3 portadas.

**Subir encima de `clave.php` deja al restaurante fuera de su panel. Pisar `estado.json` borra los
agotados del día.**

## Lo que no se toca nunca

`slug` · secreto del juego · `FTP_REMOTE_PATH` · contraseñas · fotografías · la estructura de las
URLs públicas · los 63 precios diferenciados.

---

## Pendiente, y por qué

| | |
|---|---|
| Identificadores estables | La identidad de un plato es hoy `"Pestaña :: Nombre"`. Renombrarlo le quita foto, precio y agotado |
| `carta.json` como fuente única | Hoy conviven `carta.mjs`, `menu.md`, diccionarios y `platos.json` |
| Motor en `motor/` con `motor.lock` | Hoy el motor está mezclado con el cliente en la misma carpeta |
| Edición de carta desde el panel | **Bloqueada** hasta resolver la publicación segura hacia GitHub |
| Alérgenos | Sólo existe un esbozo de 8 iconos, sin estado ni verificación |
| Bebidas y postres | La carta no los tiene y nada se lo dice al comensal |

El plan completo, con sus fases y condiciones, está aprobado en la conversación de migración.
