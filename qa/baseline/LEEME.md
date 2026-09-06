# La línea base de Lighthouse

`lighthouse.json` es la medición de referencia **de esta máquina**. No es PageSpeed de producción y
no pretende serlo: mide un servidor local con red simulada, que es lo que hace falta para comparar
dos versiones del producto en las mismas condiciones.

## Qué guarda, y por qué cada cosa

| Campo | Para qué |
|---|---|
| `medidas` | las medianas de cinco pasadas por perfil |
| `manifiestos` | la lista completa de recursos de cada perfil: URL, tipo, código y bytes |
| `cls` | los elementos que provocan el desplazamiento, con su aporte |
| `fixtura` | hashes de la carta, del estado y del build (sin sellos), pasos montados y podio |
| `huella` | plataforma, Chrome, Lighthouse, Node y PHP: decide si una comparación es válida |
| `configuracion` | categorías, throttling, flags, pasadas, agregación y páginas medidas |
| `perfiles` | los cuatro perfiles con su viewport |
| `tolerancias` | las del encargo, escritas aquí y en un solo sitio |

## Lo que se mide, exactamente

La fixtura de `qa/lib/fixtura-lh.mjs` monta **siempre** el mismo docroot: build canónico de un clon,
una portada determinista subida por el formulario de Marca, un banner determinista subido por el de
Publicidad y encendido, el juego encendido y dos marcas en el podio (`es` y `de`), que son las dos
banderas que pinta el panel. Cada paso comprueba su efecto y **lanza si no sale**.

Por qué importa: la línea base de la fase 17 se midió sobre el estado de ejemplo —sin portada, sin
banner y con el marcador vacío— y por eso pedía 11/11/7/7 recursos donde la referencia de §15.7
pedía 13/12/11/11. No era ruido ni una regresión: era otra página. Con la fixtura, los recursos
vuelven a cuadrar.

## Dos reglas que no se saltan

**No se actualiza sola.** Hace falta `npm --prefix qa run baseline:escribir` y autorización expresa.
Una línea base automática compara siempre contra el estado ya degradado, así que no detecta nunca
una caída lenta, que es justamente la que se cuela.

**No se compara entre entornos.** Si la `huella` guardada no coincide con la de la máquina actual,
`LH-HUELLA` falla y remite a `npm --prefix qa run comparativa`, que mide el commit de control y el
candidato en la misma máquina. Comparar tiempos de Linux contra una medición de Windows no es una
comparación: es ruido con formato de tabla, y su final previsible es un check que todo el mundo
ignora.

## El ruido de medición, y de dónde salen las tolerancias

Entre dos series idénticas en la misma máquina se observó:

| Métrica | Ruido típico | Tolerancia |
|---|---|---|
| Performance | ±1 punto | −1 punto |
| CLS | ±0,002 | +0,005 |
| FCP, LCP, Speed Index | ±3 % | +5 % |
| TBT | pocos ms | +20 ms |
| Peticiones | 0 | **0: cualquier aumento falla** |
| Bytes | 0 | **0: cualquier aumento falla** |

Las cuatro primeras están puestas justo por encima del ruido: una tolerancia por debajo convierte la
suite en un detector que salta solo, y una muy por encima deja pasar lo que se quiere detectar. Las
dos últimas son de tolerancia cero a propósito: una petición nueva o un kilobyte nuevo no son ruido,
son la decisión de alguien, y esa decisión tiene que aparecer y justificarse.
