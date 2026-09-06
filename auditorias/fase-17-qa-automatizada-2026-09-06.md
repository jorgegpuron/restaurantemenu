# Batería automática permanente de calidad

**Documento consolidado · 6 de septiembre de 2026 · rama `feature/publicidad-fechas`**
**Commit de control: `54ed519` · candidato medido: `d0bcdf2` con el árbol sucio (`d0bcdf2+dirty`)**

Este informe sustituye por completo a las versiones anteriores (fases 17, 17.1, 17.2, 17.3 y 17.4).
Lo que aquí se afirma es lo que está vigente hoy; lo que se corrigió por el camino está contado,
como historia, en §20 — y sólo ahí.

> **Veredicto**
>
> **FASE 17 QA AUTOMATIZADA: APTO LOCAL CON UN `FAIL` ABIERTO EN `comparativa`**
> **VALIDACIÓN GITHUB ACTIONS: PENDIENTE DE UN RUN VERDE**
>
> Seis de las siete suites devuelven `0`. `comparativa` devuelve `1` por
> `LHC-CMP-carta-escritorio`: 866 → 939 ms de LCP con **la misma carta byte a byte** en los dos
> lados. Es ruido de medida de esta máquina contra una tolerancia relativa del 5 %, no una
> regresión —§15 lo demuestra con los bytes, las peticiones y una medida del propio candidato en
> 866 ms media hora antes—. No se ha tocado la tolerancia para taparlo.
>
> Todo lo que sigue se ha ejecutado en Windows 11 con Chrome 152.0.7977.82, PHP 8.4.24 y Node
> v24.19.0. El workflow **sí se ha disparado** en GitHub Actions, dos veces, y las dos en rojo:
> `34023665406` y `34024245556`. Las dos causas están identificadas y corregidas —§20— pero
> **todavía no existe una ejecución verde en un runner real**, y hasta que exista el veredicto de
> CI es ese y no otro.
>
> El candidato que se mide **no es el árbol limpio**: lleva la corrección del favicon del panel
> (fase 17.3) y la infraestructura de QA de las fases 17.4 y 17.4.1. La única diferencia de
> producto entre el control y el candidato es `admin/index.php`.

## 1. Qué es esto, y qué no

Es infraestructura de pruebas. No cambia ni una línea del producto, y hay tres comprobaciones
dedicadas a demostrarlo en cada pasada.

**No** es PageSpeed de producción, no mide el hosting real, no despliega, no publica y no conoce
las credenciales de FTP. Mide un servidor local con red simulada, que es exactamente lo que hace
falta para comparar dos versiones del producto entre sí.

## 2. Precondiciones y alcance

```
$ git rev-parse --short HEAD      54ed519
$ git branch --show-current       feature/publicidad-fechas
$ git diff --check                (limpio)
```

| Comprobación | Resultado |
|---|---|
| `motor.lock` | cuadra, versión 1.1.8, 100 ficheros + 2 envoltorios |
| Build canónico de Tinge | **63 ficheros** (ver §9) |
| `verificar-build.mjs` | 62 ficheros obligatorios |
| E1, E2 | corregidos en la fase 16.1 y vigilados |
| E3, E4, E5 | `KNOWN OPEN` por orden expresa |
| Rama | sin upstream; ninguna operación remota |

Todo lo que entra en el repositorio: `qa/`, `.github/workflows/quality.yml`, tres líneas de
`.gitignore` y este informe. Nada más.

## 3. Arquitectura

```
qa/
  package.json / package-lock.json   lighthouse 13.4.1, playwright-core 1.56.1, versiones exactas
  README.md                          cómo se usa
  inventario.json                    el catálogo de la superficie, con su prueba
  manifiesto-build.json              los 63 ficheros de la salida canónica
  blocked-aprobados.json             la allowlist de bloqueos aceptados
  baseline/lighthouse.json           la línea base, con manifiestos y huella de entorno
  lib/
    entorno.mjs        rutas, PHP, Chrome, temporales, versiones
    proc.mjs           procesos sin shell (Windows y Linux igual)
    servidor.mjs       php -S con las extensiones que pida cada prueba
    navegador.mjs      playwright-core con el Chrome del sistema
    fixtures.mjs       imágenes fabricadas al vuelo; ningún binario versionado
    fixtura-lh.mjs     la fixtura determinista de Lighthouse y su canonicalización
    clientes.mjs       clonar Tinge, altas reales, docroots, hashes, identidad del árbol
    informe.mjs        los seis estados y el único sitio que decide el código de salida
  suites/
    fast.mjs           comprobaciones estáticas (6 s)
    smoke.mjs          humo funcional con navegador real (10 s)
    full.mjs           la batería completa
    admin.mjs          matriz del panel
    lotes.mjs          los nueve lotes de la fase correctiva
    responsive.mjs     cinco anchos × ocho pestañas, foco, teclado, ayudas
    oscuro.mjs         modo oscuro y residuos del modo claro
    carta.mjs          carta pública, juego, 404 y endpoints
    multicliente.mjs   altas reales, aislamiento, actualizador y vuelta atrás
    conocidos.mjs      E3, E4 y E5 como KNOWN OPEN
    inventario.mjs     el comprobador de cobertura y LA fuente de los totales
    pagespeed.mjs      Lighthouse, medianas, línea base y control-contra-candidato
    weekly.mjs         full + comparativa + informe Markdown
    autoprueba.mjs     siembra fallos y comprueba que la batería los ve
  informes/            lo que genera cada pasada (fuera de git)
  node_modules/        fuera de git
```

Cuatro decisiones de fondo:

- **`playwright-core`, no `playwright`.** Se usa el Chrome que ya hay en la máquina, que además es
  **el mismo** que mide Lighthouse: lo que se prueba y lo que se mide son el mismo motor.
- **Los servidores PHP arrancan con `-n`**, sin leer ningún `php.ini`, con las extensiones que pide
  cada prueba. Sin eso, «sin `mbstring`» diría PASS sin haber probado nada.
- **La batería nunca compila dentro del repositorio.** Cada build va a una carpeta temporal.
- **Nada de bash.** Todo son scripts de Node con `spawn` y array de argumentos, así que corre igual
  en Windows y en un runner de GitHub.

## 4. Los comandos

```bash
npm --prefix qa run fast         # cada cambio                                   (~6 s)
npm --prefix qa run smoke        # humo funcional con navegador real             (~10 s)
npm --prefix qa run full         # panel, carta y multicliente                   (~4 min)
npm --prefix qa run pagespeed    # Lighthouse contra la línea base de ESTA máquina (~5 min)
npm --prefix qa run comparativa  # Lighthouse: commit de control contra candidato (~11 min)
npm --prefix qa run weekly       # full + comparativa + informe Markdown          (~15 min)
npm --prefix qa run autoprueba   # siembra fallos y comprueba que se detectan     (~20 s)
npm --prefix qa run baseline:escribir   # sólo con autorización expresa
```

Todos devuelven `0` si el verde es real y distinto de `0` si no. **Verde real** quiere decir: sin
`FAIL`, sin bloqueos que nadie aprobó y —en CI— sin `UNEXPECTED PASS`.

## 5. Los seis estados y la política de bloqueos

| Estado | Qué significa | ¿Rompe la suite? |
|---|---|---|
| `PASS` | se comprobó y salió bien | no |
| `FAIL` | se comprobó y salió mal | **sí** |
| `BLOCKED` | no se pudo comprobar | **sí, salvo los de la allowlist** |
| `NO APLICA` | la funcionalidad no existe en este cliente; se cubre en otro sitio, y se nombra | no |
| `KNOWN OPEN` | defecto conocido y aceptado por orden expresa | no |
| `UNEXPECTED PASS` | un `KNOWN OPEN` que ya no se reproduce | **sí en CI** |

Un `BLOCKED` no es un salvoconducto. Sólo son no bloqueantes los identificadores de
`qa/blocked-aprobados.json`, hoy dos:

| Id | Cubre | Por qué se acepta | Cuándo se retira |
|---|---|---|---|
| `MC-32` | `NC-PUBLICAR`, `NC-CERRAR` | crean un repositorio y escriben Secrets; ninguna fase ha autorizado una operación remota | cuando exista esa autorización |
| `MC-33` | `UP-MIGRAR` | no existe un motor con otro `esquemaCarta` contra el que migrar | cuando exista |

**Cualquier otro bloqueo rompe el gate**: Chrome ausente, PHP ausente, GD o `mbstring` que no
cargan, Lighthouse no ejecutable, servidor que no arranca, sesión no abierta, fixtura ausente,
permisos, timeout, línea base incompatible o commit de control no disponible.

Si un aprobado **deja de aparecer**, `POL-02` lo marca como `UNEXPECTED PASS`: la lista se ha
quedado atrás y hay que revisarla a mano.

`NO APLICA` no es lo mismo que `BLOCKED`. Los alérgenos de Tinge son el caso: el restaurante no los
declara, así que sobre Tinge no hay nada que medir, pero **la funcionalidad del motor sí se
prueba**, en `MC-23`, sobre un cliente nuevo que sí los declara y que pinta nueve iconos.

## 6. Inventario y trazabilidad

`qa/inventario.json` cataloga la superficie entera: cada entrada lleva identificador, prueba
asociada, resultado esperado, caso positivo, entrada inválida, persistencia y reflejo en la carta
cuando corresponde.

**Ninguna de estas cifras está escrita a mano.** Las calcula `resumenInventario()` y las enseñan
igual la consola, el JSON y el informe semanal:

| Bloque | Elementos |
|---|---|
| Acciones y campos del panel | 77 |
| Endpoints | 9 |
| Manejadores JavaScript del panel | 8 |
| Claves de `estado.json` que escribe el panel | 16 |
| Páginas públicas | 8 |
| Comandos de `/nuevo-cliente` | 5 |
| Pasos de actualización del motor | 4 |
| **Superficie inventariada** | **127** |
| Defectos conocidos (E3, E4, E5) | 3 |
| **Total catalogado** | **130** |

| Categoría | Cuántos | Cuáles |
|---|---|---|
| Con prueba ejecutable | 123 | |
| BLOCKED | 3 | `NC-PUBLICAR`, `NC-CERRAR`, `UP-MIGRAR` |
| NO APLICA en este cliente | 1 | `PP-ALERGENOS` |
| Defectos conocidos | 3 | `E3`, `E4`, `E5` |

Lo que importa no es el catálogo: es que **no se pueda quedar atrás**. `qa/suites/inventario.mjs`
vuelve a extraer la superficie **del código** y falla si aparece algo sin entrada en el inventario.
También al revés: una entrada que ya no existe en el código sale como sobrante, porque una lista con
elementos muertos da una falsa sensación de cobertura.

Superficie extraída del commit `54ed519`: **70 claves de `$_POST`**, 2 de `$_FILES`, 2 de `$_GET`,
67 `name=` de formulario, 9 formularios con `id` y 6 endpoints PHP. Huecos: **0**. Sobrantes: **0**.

Tres nombres están declarados como «no son superficie» y por eso no se reclaman: `csrf` (se prueba
una vez, en su propia comprobación), `viewport` y `google` (dos etiquetas `meta` del documento) y
`MAX_FILE_SIZE` (el campo estándar que PHP mira antes de recibir una subida).

Y tres comprobaciones impiden que los totales vuelvan a descuadrar:

- `INV-04` imprime el total calculado, nunca uno escrito;
- `INV-05` falla si un elemento usa un estado que no esté en `estados_validos`;
- `INV-06` exige que la suma cuadre **por dos caminos** —bloques y estados— y que no haya bloques
  del JSON sin clasificar.

## 7. La fixtura determinista de Lighthouse

Medir es fácil; medir **lo mismo** dos veces es lo que cuesta. `qa/lib/fixtura-lh.mjs` monta
siempre el mismo docroot, y lo monta **por los endpoints del producto**, no escribiendo
`estado.json` a mano:

1. compila un clon limpio;
2. abre sesión de panel de verdad;
3. sube una portada determinista (imagen fabricada, bytes fijos) por el formulario de Marca;
4. sube un banner determinista por el de Publicidad y lo enciende;
5. enciende el juego y mete dos marcas en el podio por `record.php`, una con país `es` y otra con
   `de`, que son las dos banderas que pinta el panel;
6. comprueba que el panel **pinta** esas banderas.

Cada paso verifica su efecto y **lanza si no sale**. Una fixtura a medias mediría otra página y
devolvería un número con aspecto de bueno, que es la peor salida posible.

### Canonicalización: por qué hace falta

Dos montajes de la misma fixtura **no** son idénticos byte a byte, y no por culpa del producto:

| Qué varía | Por qué |
|---|---|
| `assets/hero/<16 hex>-800.webp`, `assets/publicidad/<16 hex>.png` | el panel nombra cada foto subida con un identificador aleatorio que **no** deriva del contenido |
| `estado.json`, clave `actualizado` | la hora del guardado |
| `record.json` y `admin/marcador.json` | la fecha de cada marca y su identificador |
| `index.html`, `version.json`, `admin/cliente.php`: `BUILD_ID` | el sello de la compilación, 13 dígitos |
| `admin/cliente.php`: `BUILD_FECHA` | la misma marca en formato legible, **con minutos** |
| `admin/accesos.log` | la hora de cada acceso |

Nada de eso cambia lo que el navegador carga, pero hace imposible exigir igualdad exacta. La
canonicalización sustituye cada uno de esos valores **conservando la longitud** —13 dígitos por 13
dígitos, 16 hexadecimales por 16— y **sólo en el docroot temporal que se mide**. El producto no se
toca, y el número de bytes servidos es el que sería sin tocar nada.

Una sola cosa queda fuera de la huella, declarada por nombre en `FUERA_DE_LA_HUELLA`:
`admin/clave.php`, que es un bcrypt con sal aleatoria y sustituirlo lo dejaría sin ser un hash
válido. No se sirve al navegador —devuelve cuerpo vacío— y se comprueba aparte que existe.

Resultado: dos montajes cualesquiera, incluso a un lado y otro de un cambio de minuto, dan el mismo
`hashDocroot`, el mismo `hashEstado` y el mismo `hashCarta`.

### Lo que se exige antes de medir, y lo que puede cambiar

`comparativa` monta **las dos** fixturas antes de medir ninguna. Exigir igualdad después de medir
no serviría de nada: ya se habrían comparado dos páginas distintas.

Lo que tiene que ser idéntico es **la fixtura y las condiciones de medida**. Lo que puede —y suele—
cambiar es **el producto**: es lo que se está midiendo.

| Id | Qué exige |
|---|---|
| `LHC-FIX-01` | control y candidato comparten la misma **fixtura**, fichero a fichero |
| `LHC-FIX-02` | coinciden el hash de la fixtura, el del estado sembrado y el podio |
| `LHC-FIX-03` | el mismo número de ficheros **de la fixtura** |
| `LHC-FIX-04` | portada, banner y banderas se llaman igual y pesan igual |
| `LHC-FIX-05` | si la fixtura no coincide, **no se mide**: se para |
| `LHC-COND-01` | entorno, configuración de Lighthouse, viewports, PHP y Node idénticos |
| `LHC-PET-*` | el mismo número de peticiones por perfil, antes de mirar un solo tiempo |

Y dos que **registran** en vez de bloquear:

| Id | Qué registra |
|---|---|
| `LHC-PROD-01` | qué ficheros del producto difieren entre control y candidato |
| `LHC-REC-*` | qué recursos entran y salen, con su delta de bytes |

`LHC-REC-*` sólo falla cuando el producto es **idéntico** y aun así los recursos cambian: eso sería
una fixtura no determinista. Cuando el producto cambia, el cambio de recursos es la consecuencia
esperada y se enseña con su delta.

> **Por qué esto es así (corrección 17.4).** La primera versión de la guarda exigía que los dos
> docroots fueran idénticos byte a byte. Funcionó mientras no hubo ningún cambio de producto que
> medir, y bloqueó la comparación en cuanto lo hubo — es decir, se rompió exactamente el día en que
> hacía falta. La medida es del cambio; la fixtura es lo que hay que congelar.
>
> **Y lo que quedó a medias (corrección 17.4.1).** La 17.4 separó los hashes pero dejó `LHC-FIX-03`
> contando los ficheros del **docroot entero**. Con eso, un cambio de producto que sólo *modifique*
> ficheros —el del favicon, por ejemplo— pasaba, y uno que *añada* o *retire* un fichero seguía
> rompiendo la comparación con la fixtura intacta. Era la misma limitación, escondida detrás de una
> comprobación que ese día cuadraba por casualidad. Hoy `LHC-FIX-03` cuenta sólo los ficheros de la
> fixtura y enseña al lado, como evidencia, cuántos ficheros de producto tiene cada lado.

La guarda entera vive en una función, `guardaDeFixtura()`, y por eso se puede ejercitar en seco:
`SEM-12k`, `SEM-12l` y `SEM-12m` le pasan árboles fabricados y comprueban que añadir o retirar un
fichero de producto deja medir —registrándolo—, y que añadir, retirar o modificar uno de la fixtura
corta la comparación.

### Medición intercalada

Las cinco muestras de cada perfil se toman **alternando** control y candidato, no en dos bloques.
Medir cinco del control y después cinco del candidato mete la deriva de la máquina —temperatura,
carga, veinte minutos de diferencia— entera en el segundo. Intercaladas, la deriva le toca por
igual a los dos.

No es teórico: con medidas en bloque, la carta de escritorio del candidato salía 80 ms por encima
del control de forma repetible, con los mismos bytes y las mismas peticiones. Intercalada, la
diferencia desaparece y el control llega a salir el más lento de los dos.

Si una muestra no llega a escribirse, se repone hasta reunir cinco válidas. El reintento cubre
**sólo** el caso de que Lighthouse no produzca fichero; nunca se descarta una muestra por su valor.

### Arbitraje de la comparación histórica

La línea base guardada se midió otro día. Entre aquel día y hoy la máquina cambia de temperatura y
de carga, y eso mueve los **tiempos** sin que el producto haya cambiado. Lo que no se mueve solo es
el número de peticiones, los bytes, el CLS ni las puntuaciones.

Por eso, cuando la diferencia contra la línea base es **sólo de tiempos** y existe una medida
contemporánea del control —hecha hoy, intercalada, en esta misma máquina— que sale limpia, manda la
contemporánea. El delta histórico **no desaparece**: se sigue enseñando entero, con su número y con
la razón por la que no cuenta como gate.

| Situación | Qué pasa |
|---|---|
| Sin diferencias | `LHB-CMP-*` en verde |
| Diferencia sólo de tiempos, con árbitro limpio | `LHB-CMP-*` como `NO APLICA`, con el delta a la vista, y `LHB-ARB` explicando quién arbitra |
| Diferencia sólo de tiempos, sin árbitro | **falla** |
| Diferencia sólo de tiempos, con árbitro que a su vez tiene regresiones | **falla** |
| Peticiones, bytes, CLS o puntuaciones | **falla siempre**: no se arbitran nunca |

`pagespeed` paga la medida del control **sólo cuando hace falta**: si la única pega contra la línea
base son tiempos, mide el control y arbitra; si hay bytes o peticiones de por medio, no gasta veinte
minutos en algo que va a ser rojo lo mida quien lo mida.

## 8. Lighthouse: la regla, en un solo sitio

**La comparación obligatoria es control `54ed519` contra candidato, ambos medidos en el mismo
runner**, con la misma fixtura y el mismo Chrome, cinco pasadas por perfil y mediana.

La línea base versionada es un **segundo gate**, y sólo cuando su huella de entorno coincide con la
de la máquina que está midiendo:

| Situación | Qué pasa |
|---|---|
| Huella igual | se compara también contra la línea base (`LHB-CMP-*`) |
| Huella distinta | `LH-HUELLA` queda **`NO APLICA`**: no se compara y **no pone rojo la pasada** |
| No hay línea base | `NO APLICA`, con su motivo |
| Falta el commit de control | **`FAIL`** |
| Falta Chrome, PHP, Lighthouse, la fixtura o el servidor | **`FAIL`** |

Una ejecución en Linux no puede quedar condenada a fallar sólo porque la línea base versionada se
midiera en Windows. Lo que sí la condena es no poder medir.

El árbol de control se extrae con `git archive`, que no toca el árbol de trabajo, ni el índice, ni
escribe metadatos en `.git/`. Por eso el workflow hace el checkout con `fetch-depth: 0`.

### Identidad de lo que se mide

«Control `54ed519` · candidato `54ed519`» no dice nada: el árbol de trabajo puede tener cambios sin
confirmar y seguir enseñando el mismo commit. De cada árbol se registra el commit, si el producto
está limpio o `dirty`, un **hash del producto** —no del repositorio— y las exclusiones exactas con
las que se calculó.

Exclusiones: `.git/`, `qa/`, `auditorias/`, `.github/`, `.claude/`, `.gitignore`, `node_modules/`,
`generado/`, `2-subir/`, `3-copias/`. Ninguna entra en el build, así que tocar la batería o este
informe **no cambia el hash del producto**, que es justo lo que se quiere.

### Tolerancias

| Métrica | Tolerancia | Cómo se compara |
|---|---|---|
| Performance, accesibilidad, buenas prácticas, SEO | −1 punto | puntuación entera |
| CLS | +0,005 | absoluto |
| FCP, LCP, Speed Index | +5 % | relativo |
| TBT | +20 ms | absoluto |
| Peticiones totales | **0** | entero |
| Peticiones externas | **0** | entero |
| **Bytes locales** | **0** | **entero exacto, nunca kilobytes redondeados** |
| Bytes externos | no entran en el gate | se informan |

Las cuatro primeras están justo por encima del ruido medido: ±1 punto de Performance, ±0,002 de CLS
y ±3 % en los tiempos entre dos series idénticas.

**Por qué los bytes externos no entran en un gate de cero.** La carta y el panel piden dos hojas de
estilo y dos fuentes a `fonts.googleapis.com` y `fonts.gstatic.com`. Medido en esta máquina: **643
bytes de diferencia entre dos cargas del mismo contenido**, porque la CDN negocia su propia
compresión. Un gate de cero bytes sobre eso sería una moneda al aire, y a la tercera vez nadie
miraría el check. Lo que sí se compara con tolerancia cero es **cuántas** peticiones externas hay:
una nueva es una decisión de alguien, no ruido.

Los bytes **locales** —los que sirve este producto— se comparan como enteros y con tolerancia cero:
un solo byte de más falla.

## 9. El manifiesto de la salida: 63 ficheros, y uno de más en la carpeta publicada

El build canónico de Tinge produce **63 ficheros**. La carpeta publicada tiene **64**. La
diferencia, comparados los dos manifiestos fichero a fichero, es exactamente una:

```
solo en el publicado:  admin/temas.json (4.004 bytes)
solo en el generado:   (ninguno)
mismo nombre, distinto tamaño: (ninguno)
```

`admin/temas.json` es un huérfano del sistema de cinco temas fijos, retirado por el propio SPEC.
Hoy `gen.mjs` no lo escribe —y además limpia su ubicación legacy dentro del cliente—, el panel no lo
lee, y nada de lo publicado lo pide. Su fecha es del 4 de septiembre de 2026, mientras que
`index.html` es del 6. Sobrevive porque el build rehace la carpeta escribiendo los ficheros que
produce, pero **no borra los que dejó de producir**.

**No se ha tocado**: retirarlo es un cambio del producto publicado y necesita su propia
autorización. Lo que sí se hace es vigilarlo:

- `qa/manifiesto-build.json` lista los 63 obligatorios y declara `admin/temas.json` como obsoleto
  tolerado, con su explicación y con quién puede retirarlo;
- `FAST-18` compara el build canónico contra el manifiesto y **falla si pierde un fichero** o si
  aparece uno que nadie declaró;
- `FAST-19` compara la carpeta publicada contra el mismo manifiesto: acepta los sobrantes
  declarados y **falla ante cualquier otro**.

No queda ninguna diferencia sin explicar.

## 10. Qué cubre cada suite

### `fast` — lo que se pasa en cada cambio

| Id | Comprobación |
|---|---|
| FAST-01 | `git diff --check` limpio |
| FAST-02 | sintaxis PHP de los seis ficheros del panel |
| FAST-03 | sintaxis JavaScript del producto y de la propia batería |
| FAST-04 | `motor.lock` cuadra |
| FAST-05 | compilación canónica sobre un clon |
| FAST-06 | `verificar-build.mjs` |
| FAST-07 | dos builds seguidos sólo difieren en los tres ficheros con sello |
| FAST-08 | están los ficheros obligatorios mínimos |
| FAST-18 | el build entrega los 63 ficheros del manifiesto aprobado |
| FAST-19 | la carpeta publicada trae el manifiesto y sólo los sobrantes declarados |
| FAST-09 | el icono de pestaña existe y es un SVG |
| FAST-10 | ninguna ruta ni nombre de Tinge dentro del motor fuera de comentarios |
| FAST-11 | sin secretos en el motor, en la batería ni en lo publicado |
| FAST-12 | la batería no aparece en `2-subir` |
| FAST-13 | el `2-subir` del repositorio no se ha tocado |
| FAST-14..17 | el workflow no usa secretos, va fijado por SHA, tiene timeout y no toca el de despliegue |
| FAST-20 | cada pull request corre también el humo funcional |
| FAST-21 | el job semanal tiene historial para el commit de control |
| FAST-22 | los dos jobs fallan si el runner no trae Chrome |
| INV-01..06 | inventario completo, sin sobrantes, con motivo en cada BLOCKED y totales que cuadran |

### `smoke` — el humo funcional de cada pull request

| Id | Comprobación |
|---|---|
| SMK-01 | el build canónico sale bien |
| SMK-02 | se entra al panel |
| SMK-03, SMK-04 | las ocho pestañas y los ocho paneles |
| SMK-05 | se cambia de pestaña y el panel de destino se ve |
| SMK-06, SMK-07 | cero errores de consola y cero peticiones fallidas en el panel |
| SMK-08 | la carta pública carga con sus platos |
| SMK-09, SMK-10 | cero errores de consola y cero peticiones fallidas en la carta |
| SMK-11 | el icono de pestaña responde 200 |
| SMK-12 | cada plato lleva su precio canónico |
| SMK-13 | la carta es oscura y no trae interruptor de tema |
| SMK-14 | sin residuos del modo claro en fuentes ni en lo compilado |

Ni un selector de prueba en el producto: todo se localiza por rol, etiqueta accesible, `name`,
`aria-controls` y texto visible.

### `full` — la batería completa

Seis entornos sobre el mismo contenido, que es lo que hace que las diferencias signifiquen algo:

| Entorno | Para qué |
|---|---|
| GD + `mbstring`, tope 8M | matriz del panel, lotes 1, 2, 3, 6, 7, 8 y 9, anchos, modo oscuro y carta |
| GD + `mbstring`, tope 2M | lote 4: mensajes de subida con el tope de verdad |
| GD **sin `mbstring`** | las ocho pestañas, iniciales de días, lote 8 y anchos |
| **Sin GD** + `mbstring` | lote 1: la portada se rechaza y el estado no se toca |
| Docroot aparte con superadministrador | acciones que exigen rol de super |
| Docroot aparte en modo demo | `salir_demo` |

Y después: clientes nuevos de verdad, aislamiento por hashes, actualización del motor con vuelta
atrás, y los defectos abiertos.

### `pagespeed`, `comparativa` y `weekly`

`pagespeed` mide el candidato y lo compara con la línea base de esta máquina. `comparativa` mide
control y candidato en el mismo runner. `weekly` es `full` + `comparativa` + el informe Markdown en
`qa/informes/`, que está fuera de git y en CI se sube como artefacto incluso cuando la suite falla.

## 11. Multicliente

Es el bloque más grande (35 comprobaciones) porque es donde el producto deja de ser «la carta de
Tinge». Se dan de alta dos restaurantes ficticios con la herramienta real, uno vacío y uno completo,
y se ejercita el ciclo entero:

| Qué se demuestra | Cómo |
|---|---|
| El alta funciona con la herramienta de verdad | `MC-01`, `MC-02` |
| El cliente nuevo nace limpio | `MC-04` estado vacío, `MC-05` sin contraseñas ni marcador, `MC-06` marca vacía |
| El motor se copia byte a byte | `MC-07`: hashes idénticos en los 100 ficheros |
| Sin contaminación del restaurante semilla | `MC-08`, `MC-09` |
| La carta de ejemplo no se publica por descuido | `MC-10` |
| El icono de pestaña se genera con **su** color | `MC-13`, `MC-14` |
| El build del cliente nuevo es válido | `MC-11`, `MC-12`, `MC-15`, `MC-16` |
| La activación por token hace lo que promete | `MC-17` a `MC-20` |
| El panel y la carta del cliente nuevo funcionan | `MC-21`, `MC-22`, `MC-23` (nueve alérgenos) |
| El aislamiento es **bidireccional** | `MC-24` y `MC-25`, por hashes en las dos direcciones |
| El motor se actualiza sin tocar datos | `MC-26` a `MC-29` |
| Un fallo a mitad de actualización deja el árbol como estaba | `MC-30` en tres puntos distintos |
| Las pruebas de fallo no dejan basura | `MC-31` |
| Lo que hoy no se puede probar sale a la luz | `MC-32`, `MC-33`: BLOCKED con motivo |

La vuelta atrás se prueba en tres puntos y no en uno: un rollback que sólo funciona en el primer
paso da una confianza que no se sostiene, porque el paso peligroso siempre es el último.

## 12. Las fixtures de imagen se fabrican, no se guardan

No hay ni un binario de prueba en el repositorio. Los PNG se escriben con `zlib`; el JPEG y el WebP
los dibuja GD cuando está, y cuando no está la prueba que los necesita se marca BLOCKED —nunca se
sustituyen por un PNG renombrado, que es justo lo que otra prueba considera un fallo—.

| Fixture | Para qué |
|---|---|
| `portada-1200x800.png` / `.jpg` / `.webp` | portada válida |
| `banner-1120x480.png` | imagen del banner |
| `plato-600x600.png` | foto de plato |
| `estrecha-400x300.png` | por debajo del ancho mínimo |
| `portada pequeña ñ & (400px).png` | mensaje de error con acentos y paréntesis |
| `ancha-9000x300.png` | por encima del lado máximo |
| `truncada.png` | cabecera válida, cuerpo cortado |
| `extension-falsa.jpg` | un PNG con extensión mentirosa |
| `no-es-imagen.txt` | ni siquiera es una imagen |
| `pesada-3mb.png` | por encima del tope de subida del servidor |

Una imagen «corrupta» guardada como fichero acaba pareciendo un fichero roto por accidente y alguien
la arregla. Generada aquí, con su comentario al lado, se ve que la corrupción es el propósito.

## 13. Seguridad y limpieza

- **Nombres y credenciales claramente ficticios**: `token-de-pruebas-qa-no-es-real`,
  `clave-de-pruebas-qa-1234`, `clave-super-qa-4321`, `https://ejemplo.invalido/...`.
- **Ninguna escritura en producción**: la batería no conoce el FTP, no lee variables de despliegue y
  no llama a `--publicar-github`.
- **Ningún cliente ficticio dentro del repositorio**: todos viven en temporales que se borran, y
  `FULL-91` lo verifica.
- **Ningún servidor PHP vivo ni navegador huérfano** al terminar: `FULL-90` los cuenta.
- **El repositorio queda intacto**: `FULL-92` compara hashes de todo el producto antes y después,
  `FULL-93` los de `2-subir` y `FULL-94` repite `git diff --check`.

## 14. El workflow de calidad

`.github/workflows/quality.yml`, validado por `FAST-14` a `FAST-17` y `FAST-20` a `FAST-22`:

| Requisito | Cómo se cumple |
|---|---|
| Ejecución manual | `workflow_dispatch` |
| En pull requests | `pull_request` → `fast` **y** `smoke` |
| Semanal | `schedule: '17 5 * * 1'` (lunes; minuto raro a propósito) |
| Sin permisos de escritura | `permissions: contents: read` |
| Sin secretos | ni un `${{ secrets.* }}` en todo el fichero |
| Sin FTP ni despliegue | no invoca `deploy.yml` ni ninguna acción de subida |
| Con timeout | 25 min el job de pull request, 120 el semanal |
| Dependencias cacheadas | `setup-node` con `cache: npm` sobre `qa/package-lock.json`, e instalación con `npm ci` |
| Acciones fijadas | las cuatro por SHA de 40 caracteres |
| Chrome garantizado | los dos jobs lo localizan, **registran ruta y versión** y fallan si no está |
| Historial para el control | `fetch-depth: 0` y comprobación de `54ed519` antes de medir |
| Informe como artefacto | `upload-artifact` con `if: always()`, retención 30 días |

**El workflow no se ha disparado**: ninguna fase autoriza una operación remota.

## 15. Resultados de la pasada de hoy

Las siete suites, seguidas, el 6 de septiembre de 2026 entre las 19:48 y las 20:23, en esta máquina.
El control es el commit `54ed519`; el candidato es `d0bcdf2` con el árbol sucio —la corrección del
favicon de la fase 17.3 más la infraestructura de QA de las fases 17.4 y 17.4.1—, identificado por
su hash de producto `bfac5b6fa71d660f`.

| Comando | PASS | FAIL | BLOCKED | NO APLICA | KNOWN OPEN | Duración | Salida |
|---|---|---|---|---|---|---|---|
| `fast` | 30 | 0 | 0 | 0 | 0 | 6,4 s | `0` |
| `smoke` | 16 | 0 | 0 | 0 | 0 | 10,4 s | `0` |
| `full` | 196 | 0 | 2 | 2 | 3 | 216,0 s | `0` |
| `pagespeed` | 15 | 0 | 0 | 0 | 0 | 336,9 s | `0` |
| `comparativa` | 34 | **1** | 0 | 0 | 0 | 638,9 s | **`1`** |
| `weekly` | 236 | 0 | 2 | 2 | 3 | 839,8 s | `0` |
| `autoprueba` | 61 | 0 | 0 | 0 | 0 | 20,8 s | `0` |

Los dos BLOCKED son exactamente los dos de la allowlist (`MC-32`, `MC-33`). Los dos `NO APLICA` son
los alérgenos de Tinge (`CAR-09`, `CAR-10`). Los tres `KNOWN OPEN` son E3, E4 y E5. Ningún bloqueo
inesperado en ninguna de las siete pasadas, y ningún `NO APLICA` nuevo.

**`comparativa` está en rojo.** No por el producto: por el ruido de medida de esta máquina. El
detalle, con sus números, está al final de esta sección.

### Identidad de lo medido

```
control    54ed519            (árbol limpio, extraído con git archive)
candidato  d0bcdf2+dirty      producto bfac5b6fa71d660f
entorno    win32 x64 · Chrome 152.0.7977.82 · Lighthouse 13.4.1 · Node v24.19.0 · PHP 8.4.24
```

### Lo que se exigió igual antes de medir

| Id | Resultado |
|---|---|
| `LHC-FIX-01` | fixtura idéntica fichero a fichero: sin diferencias |
| `LHC-FIX-02` | `fixtura ced6b1cc3137` y `estado 0d5006c2913c` en los dos |
| `LHC-FIX-03` | **14 ficheros de fixtura en los dos**; 62 ficheros de producto en cada lado |
| `LHC-FIX-04` | portada, banner y banderas con el mismo nombre y el mismo peso |
| `LHC-COND-01` | mismo entorno, misma configuración de Lighthouse, mismos viewports |
| `LHC-PET-*` | 13, 12, 11 y 11 peticiones, iguales en los dos |

### Lo que se dejó cambiar, y quedó registrado

| Id | Evidencia |
|---|---|
| `LHC-PROD-01` | **1 fichero modificado: `admin/index.php`** |
| `LHC-REC-carta-movil` | mismos recursos · bytes 1.003.236 → 1.003.882 (+646, todo de la CDN de fuentes) |
| `LHC-REC-carta-escritorio` | mismos recursos · bytes 920.710 → 920.710 (+0) |
| `LHC-REC-admin-movil` | sale `/favicon.ico` (752.417 B), entra `/assets/titleIcon-accent.svg` (2.444 B) · **2.409.291 → 1.658.747 B (−750.544)** |
| `LHC-REC-admin-escritorio` | lo mismo · **2.409.267 → 1.659.372 B (−749.895)** |

Los 752 KB que sale a deber `/favicon.ico` no son un icono: son el `index.html` de la carta, que
`php -S` sirve con `200` cuando le piden un fichero que no existe en la raíz del docroot. En un
Apache de verdad eso es un `404`. En los dos casos el navegador se traía una página entera para
pintar el icono de una pestaña, y ese es el defecto que corrigió la fase 17.3 declarando el SVG que
el motor ya generaba: **el panel pide ahora 750 KB menos**.

### Control contra candidato — medianas de 5 muestras intercaladas

| Perfil | Control `54ed519` | Candidato `d0bcdf2+dirty` | Bytes locales |
|---|---|---|---|
| carta móvil | perf 71 · lcp 4.877 · cls 0,018 · 13 pet. | perf 71 · lcp 4.877 · cls 0,018 · 13 pet. | 874.138 = 874.138 |
| carta escritorio | perf 99 · lcp **866** · cls 0,006 · 12 pet. | perf 98 · lcp **939** · cls 0,006 · 12 pet. | 790.969 = 790.969 |
| panel móvil | perf 56 · lcp 13.385 · cls 0,000 · 11 pet. | perf 56 · lcp 9.820 · cls 0,000 · 11 pet. | 2.256.742 → 1.506.846 |
| panel escritorio | perf 89 · lcp 1.692 · cls 0,028 · 11 pet. | perf 89 · lcp 1.693 · cls 0,028 · 11 pet. | 2.256.742 → 1.506.846 |

El panel móvil baja de 13.385 a 9.820 ms de LCP y de 2,26 a 1,51 MB locales. Es el mismo cambio de
una línea, visto desde el otro lado.

### La línea base: sin tocar, y sin necesidad de arbitraje

`qa/baseline/lighthouse.json` **no se ha modificado** en las fases 17.4 ni 17.4.1 —hash
`4c1f9fc6…` antes y después— y **las tolerancias tampoco**. En esta pasada no hizo falta arbitrar
nada: `LH-HUELLA` reconoce el entorno y los cuatro `LHB-CMP-*` pasan contra la línea base guardada,
tanto en `pagespeed` como en `weekly`. El informe semanal lo dice con esas palabras: «Sin
arbitrajes: la comparacion historica cuadra por si sola.»

### El `FAIL` de `comparativa`

```
FAIL  LHC-CMP-carta-escritorio  carta-escritorio dentro de las tolerancias
      lcp: 866 -> 939 ms (+8.4 %)          tolerancia: +5 %
```

**No puede ser una regresión del producto.** La carta es byte a byte la misma en los dos árboles: la
única diferencia de producto es `admin/index.php`, que es el panel y no interviene en la carta.
`LHC-REC-carta-escritorio` lo confirma recurso a recurso: los mismos ficheros y **920.710 → 920.710
bytes, +0**. Doce peticiones en los dos. El CLS, idéntico. Lo único que se mueve es un tiempo.

Y se mueve dentro de la misma sesión: media hora antes, `pagespeed` midió **ese mismo árbol
candidato** en carta-escritorio y le salió una mediana de **866 ms** —exactamente la del control—.
El mismo código, la misma fixtura, la misma máquina, 866 y 939 con treinta minutos de diferencia.

El histórico apunta a lo mismo, con el signo cambiando de lado:

| Pasada | Control | Candidato | Diferencia |
|---|---|---|---|
| 17.4, primera | 948 ms | 866 ms | el **candidato** 82 ms más rápido |
| 17.4, segunda | 866 ms | 866 ms | ninguna |
| 17.4.1 (ésta) | 866 ms | 939 ms | el **candidato** 73 ms más lento |

La causa es aritmética: el 5 % de 866 ms son **43 ms**, y la dispersión de esta máquina entre
pasadas de la misma página es de **70–80 ms**. La mediana de cinco muestras intercaladas amortigua
la deriva lenta —por eso el panel, el perfil móvil y los bytes salen estables— pero no baja el ruido
por debajo de una tolerancia relativa tan estrecha en el perfil más rápido de los cuatro.

Clasificación: **supuesto local incorrecto de la batería**, no regresión del producto ni
incompatibilidad de entorno.

**No se ha tocado nada para ponerlo verde.** La fase 17.4.1 prohíbe expresamente cambiar
tolerancias, descartar muestras y repetir hasta que salga bien, y ninguna de las tres cosas se ha
hecho. Lo que haría falta —darle a las métricas de tiempo un suelo absoluto además del porcentaje,
o subir el número de muestras del perfil rápido— es un cambio de gate y necesita autorización
expresa. Queda anotado en §22.

### El informe semanal

`qa/informes/auditoria-semanal-2026-09-06.md`. Sus totales salen del mismo objeto que imprime la
consola: **236 PASS · 0 FAIL · 2 BLOCKED · 2 NO APLICA · 3 KNOWN OPEN · 243 en total**, y el total
de la tabla es la suma. La política de bloqueos y el cierre se anotan **antes** de escribir el
fichero, así que no puede haber dos números distintos. `weekly` no ejecuta la comparativa
intercalada contra el control —eso es `comparativa`, y son otros diez minutos—, así que su verde no
contradice el rojo de arriba: son dos gates distintos, y los dos están en este informe.

## 16. La prueba de la prueba: fallos sembrados

Una batería que nunca ha fallado no demuestra nada: puede estar mirando donde no hay nada que
mirar. `qa/suites/autoprueba.mjs` siembra fallos **de los que de verdad han pasado en este
proyecto**, comprueba que cada uno la pone en rojo, los retira y comprueba que vuelve a verde. Todo
sobre copias temporales: sembrar un fallo en el repositorio original, aunque fuera un segundo, es
exactamente la clase de cosa que se queda puesta.

| Familia | Qué siembra | Ids |
|---|---|---|
| 1 | falta el icono de pestaña | `SEM-1a` … `SEM-1d` |
| 2 | acción administrativa nueva sin prueba | `SEM-2a` … `SEM-2c` |
| 3 | desborde horizontal a 320 px | `SEM-3a` … `SEM-3c` |
| 4 | petición 404 en la carta | `SEM-4a` … `SEM-4c` |
| 5 | regresión de Lighthouse, y ruido que **no** dispara falso positivo | `SEM-5a` … `SEM-5c` |
| 6 | el inventario deja de cuadrar | `SEM-6a` … `SEM-6d` |
| 7 | la política de bloqueos | `SEM-7a` … `SEM-7d` |
| 8 | sin Chrome, sin PHP, línea base de otro entorno | `SEM-8a` … `SEM-8d` |
| 9 | **un solo byte de más** | `SEM-9a` … `SEM-9f` |
| 10 | **las cuatro situaciones de entorno, y con `CI=true`** | `SEM-10a` … `SEM-10e` |
| 11 | de dónde sale el nombre de la carpeta del cliente | `SEM-11` |
| 12 | **cuándo se puede medir y cuándo no**: fixtura, producto y arbitraje | `SEM-12a` … `SEM-12m` |
| — | el repositorio original no quedó tocado | `SEM-90` |

La familia 12 es la de las fases 17.4 y 17.4.1, y merece el detalle:

| Id | Qué demuestra |
|---|---|
| `SEM-12a` | una diferencia de producto deja medir y queda como evidencia |
| `SEM-12b` | una fixtura distinta bloquea la comparación |
| `SEM-12c` | entorno, configuración, viewports, PHP o fixtura distintos impiden comparar |
| `SEM-12d` | un byte de más **no** se arbitra: sigue siendo rojo |
| `SEM-12e` | una diferencia sólo de tiempos se arbitra sin ocultar el delta |
| `SEM-12f` | sin medida contemporánea, la diferencia de tiempos **no** se arbitra |
| `SEM-12g` | un árbitro con regresiones propias no sirve de árbitro |
| `SEM-12h` | una mejora y una medida idéntica no producen regresión |
| `SEM-12j` | la diferencia de recursos se calcula con su delta de bytes |
| `SEM-12k` | **añadir** un fichero de producto deja medir y queda registrado |
| `SEM-12l` | **retirar** un fichero de producto deja medir y queda registrado |
| `SEM-12m` | añadir, retirar o modificar un fichero de la **fixtura** bloquea la comparación |
| `SEM-12i` | la línea base no se ha modificado durante la autoprueba |

Dos de ellas merecen el detalle.

### El gate de bytes (familia 9)

| Id | Qué demuestra |
|---|---|
| `SEM-9a` | medidas idénticas: sin regresión |
| `SEM-9b` | **un** byte local de más hace fallar el gate, y lo nombra |
| `SEM-9c` | menos bytes no es una regresión |
| `SEM-9d` | medio kilobyte de más también falla, aunque los KB redondeados no cambien |
| `SEM-9e` | los bytes de las fuentes externas no disparan el gate |
| `SEM-9f` | una petición externa de más **sí** falla |

`SEM-9d` es el que cierra el agujero de verdad: con la comparación por kilobytes redondeados, 512
bytes de más daban el mismo número a los dos lados y pasaban con tolerancia cero.

### Las cuatro situaciones de entorno (familia 10)

| Id | Situación | Resultado exigido |
|---|---|---|
| `SEM-10a` | huella distinta + control disponible + comparativa verde | salida `0`, línea base `NO APLICA` |
| `SEM-10b` | huella distinta + **control ausente** | salida distinta de `0` |
| `SEM-10c` | huella igual + regresión contra la línea base | salida distinta de `0` |
| `SEM-10d` | mismo runner + regresión candidato contra control | salida distinta de `0` |
| `SEM-10e` | lo mismo con `CI=true` | una línea base de otro sistema no condena la pasada; un byte de más sí |

`SEM-10b` usa un commit que no existe (`deadbee`) y comprueba que la comparativa falla nombrando el
motivo, en vez de seguir adelante comparando contra nada.

## 17. Que QA no toca el producto

Es la comprobación central y está automatizada en cuatro sitios, no hecha una vez a mano:

| Id | Qué compara |
|---|---|
| `FAST-13` | los hashes de `2-subir` antes y después de la suite rápida |
| `FULL-92` | los hashes de **todo** `1-proyecto` (menos `qa/` y `.git/`) antes y después |
| `FULL-93` | los hashes de `2-subir` antes y después |
| `FULL-94` | `git diff --check` al terminar |

La razón de que funcione es de diseño, no de disciplina: **la batería nunca compila dentro del
repositorio**. `clonarTinge()` copia el proyecto a un temporal —sin `.git`, sin `node_modules`, sin
`generado`, sin `2-subir` y sin `qa`— y todo build ocurre allí.

Esto no es teoría: la comprobación saltó de verdad durante estas fases. Mientras una pasada de
`full` estaba en marcha se editó el informe de auditoría, que vive dentro del repositorio, y
`FULL-92` la puso en rojo nombrando el fichero. Se dejó como está: estrechar el conjunto vigilado
para que no moleste es exactamente la forma en que una comprobación de este tipo deja de servir.

## 18. Los defectos abiertos siguen abiertos

E3, E4 y E5 no se han corregido —no lo autoriza ninguna de estas fases— y la batería no los
convierte en el comportamiento deseado. `qa/suites/conocidos.mjs` comprueba que **siguen ahí**, y si
un día dejaran de reproducirse lo dice como `UNEXPECTED PASS`.

| Id | Qué se comprueba | Cómo |
|---|---|---|
| **E3** | el `motor.lock` de un cliente nuevo no hereda la versión del motor que copia | se compara la versión del lock del cliente recién creado con la de la semilla |
| **E4** | `--detectar` no incluye `server/**` entre las rutas que revisa | se lee `RUTAS_EN_PROYECTO` en la propia herramienta |
| **E5** | el rango del descuento sólo se valida con la oferta encendida | se lee la guarda `elseif ($on && ($pct < 1 || $pct > 90))` en el panel |

E5 se comprueba **leyendo el código y no reproduciéndolo** a propósito: escribir un `950` en el
estado dejaría el defecto sembrado en el docroot de la prueba siguiente.

Un `KNOWN OPEN` no cuenta como cobertura y no cambia el código de salida en local. En CI, un
`UNEXPECTED PASS` sí lo cambia.

## 19. Limitaciones

Lo que la batería **no** puede comprobar hoy, dicho y no escondido:

- **La validación en GitHub Actions está pendiente de un run verde.** El workflow se ha ejecutado
  ya en un runner real —`34023665406` y `34024245556`, los dos en rojo— y las dos causas están
  corregidas, pero **ninguna ejecución posterior está autorizada todavía**, así que a día de hoy no
  existe una pasada verde en Linux.
- **Apache de verdad.** `php -S` ignora `.htaccess`, así que `deflate`, HSTS, `ErrorDocument` y la
  regla de `record.json` no se ejercitan.
- **Un punto ciego del servidor de pruebas.** `php -S`, cuando no encuentra un fichero, sube por el
  árbol buscando un `index.html` y lo sirve con `200`. Medido: un fichero ausente **dentro de
  `assets/`** da `404` —y ahí cuelga todo lo que pide la carta—, pero uno ausente colgando de la
  raíz del docroot da `200`. Un Apache de verdad devuelve `404` en los dos casos. Está documentado
  en `qa/README.md`, y por eso las pruebas siembran los recursos ausentes bajo `assets/`.
- **Los bytes de las fuentes de Google** varían entre cargas idénticas (643 bytes medidos) y por eso
  no entran en el gate de cero bytes; su número de peticiones sí.
- **El hosting real.** GD sigue sin figurar como requisito documentado (`DESPLIEGUE BLOCKED` de la
  fase 16).
- **Los dos comandos remotos del alta** y **`motor/migrar.mjs`**, por las razones de la allowlist.
- **`admin/temas.json`** sigue en la carpeta publicada: declarado, vigilado y sin tocar.
- **E3, E4 y E5** siguen abiertos por orden expresa.
- **Lighthouse local no es PageSpeed de producción.** Sirve para comparar dos versiones en las
  mismas condiciones; no da una nota absoluta ni compara restaurantes distintos.

## 20. Historia: los errores encontrados en la propia batería, y cómo se corrigieron

Esta sección es **historia**. Nada de lo que aquí se describe sigue vigente: todos los defectos
están corregidos y las cifras válidas son las de las secciones anteriores. Se conserva porque un
montaje que dice «todo salió a la primera» normalmente es un montaje que no se probó, y porque cada
uno de estos fallos explica por qué la batería está hecha como está.

### Fallos de la batería, en orden de aparición

1. **`extension_dir` mentía.** El PHP de WinGet devuelve `C:\php\ext`, que en esta máquina no
   existe. Con ese dato, GD y `mbstring` salían como no disponibles y **media batería se habría
   saltado sola** marcando BLOCKED. Ahora se prueban dos candidatos y se queda con el que existe.
2. **`chrome --version` colgaba el arranque en Windows.** La batería se quedaba muda en su primera
   línea, indistinguible de una colgada. Ahora la versión se lee del propio fichero.
3. **La prueba del marcador medía otra cosa**: enviaba puntuaciones que no entraban en el podio.
4. **`document` en contexto de Node**, al elegir el idioma alternativo.
5. **Salida invisible**: `console.log` con la salida redirigida no escribe nada hasta el final.
   Ahora se usa `writeSync`.
6. **Puertos fijos**: dos pasadas a la vez chocaban. Ahora el primer puerto depende del proceso.
7. **El comprobador de inventario no arrancaba fuera del repositorio**: se le pasaba una ruta
   absoluta de Windows como especificador de módulo, y Node exige una URL.
8. **Un punto ciego del servidor de pruebas**, destapado por la propia autoprueba: `php -S` sirve
   `index.html` con `200` para un fichero ausente en la raíz del docroot. La imagen sembrada se
   mueve a `assets/`, y el punto ciego queda escrito en el README.
9. **El octavo servidor de una pasada larga no arrancaba** en los 20 segundos de espera. Ahora
   espera 30 y reintenta una vez en otro puerto; si el segundo intento falla, lanza con los dos
   errores.
10. **El nombre de una foto subida no es determinista**: el panel usa 16 hexadecimales que no
    derivan del contenido, así que dos montajes pedían URLs distintas para el mismo fichero.
11. **`clonarTinge()` daba por hecho el nombre de la carpeta del cliente.** En este ordenador la
    carpeta se llama como el cliente; en el checkout de GitHub Actions se llama `restaurantemenu`,
    que es el nombre del repositorio. El run **`34023665406`** murió por eso. Ahora el nombre se
    deriva del contrato del motor —la URL pública declarada en `cliente.mjs`— y `SEM-11` lo
    comprueba con bases de cliente distintas y sin nombres escritos a mano.
12. **La comparación exigía dos docroots idénticos byte a byte.** El run **`34024245556`** destapó
    el 404 real del favicon del panel (`SMK-06`), y al corregirlo —fase 17.3, una línea declarando
    el SVG que el motor ya genera— la comparativa se bloqueó a sí misma: el producto había
    cambiado, que es exactamente para lo que existe. La fase 17.4 separó la huella en fixtura y
    producto.
13. **`LHC-FIX-03` seguía contando el docroot entero.** La 17.4 arregló los hashes y se dejó el
    recuento sin tocar, así que la limitación seguía viva para cualquier cambio de producto que
    añada o retire un fichero; ese día no se vio porque el cambio del favicon sólo modificaba uno.
    Corregido en la 17.4.1, con `SEM-12k`, `SEM-12l` y `SEM-12m` cubriendo los tres casos.

### Afirmaciones que estuvieron en informes anteriores y hoy son falsas

| Lo que se dijo | Lo que es cierto hoy |
|---|---|
| «133 elementos catalogados» | **127 de superficie + 3 defectos = 130.** El 133 estaba escrito a mano y sumaba 81 acciones de panel donde hay 77 |
| «cuatro BLOCKED» | **dos bloqueos aprobados** (`MC-32`, `MC-33`) y **dos `NO APLICA`** (`CAR-09`, `CAR-10`), que no son lo mismo |
| «199 PASS en el informe frente a 200 en la consola» | **el mismo número en los dos.** El informe se escribía antes de anotarse a sí mismo; ahora la escritura es la última acción |
| «en pull request corre `fast`» | **corren `fast` y `smoke`.** El encargo pedía pruebas funcionales y el workflow se había quedado sólo con las estáticas |
| «línea base de 11/11/7/7 peticiones» | **13/12/11/11**, las mismas de la referencia anterior. Aquella línea base se midió sobre el estado de ejemplo: sin portada, sin banner y con el marcador vacío |
| «sólo un `FAIL` cambia el código de salida» | **también lo cambia un BLOCKED que nadie aprobó**, y en CI un `UNEXPECTED PASS` |
| «cinco fallos sembrados» | **doce familias**; el número de comprobaciones está en §15 |
| «FASE 17 QA AUTOMATIZADA: APTO» | **APTO LOCAL con un `FAIL` abierto en `comparativa`**, y la validación en GitHub Actions pendiente de un run verde |
| «el workflow no se ha disparado nunca» | **se ha disparado dos veces**, `34023665406` y `34024245556`, las dos en rojo. Lo que no existe todavía es un run verde |
| «control y candidato miden el mismo producto» | **ya no.** El candidato lleva la corrección del favicon: la diferencia de producto es `admin/index.php`, y está declarada en `LHC-PROD-01` |
| «`LHC-FIX-03`: el mismo número de ficheros en el docroot» | **el mismo número de ficheros de la fixtura.** El recuento del docroot entero volvía a prohibir lo que la 17.4 acababa de permitir |
| «la carpeta publicada conserva su hash» (en el sentido de que nada cambió nunca) | **la carpeta publicada no cambió durante las fases 17.4 y 17.4.1**, y sus 64 ficheros siguen ahí; pero no es byte a byte la de antes de la corrección del favicon, porque `admin/index.php` sí cambió en la 17.3 |
| «tolerancia de bytes: 0» comparando kilobytes | **enteros exactos.** Comparar `Math.round(bytes/1024)` con tolerancia cero dejaba pasar hasta 511 bytes de diferencia |

### El caso del byte que faltaba

El informe de la fase anterior enseñaba, en la misma página, esto:

```
carta-móvil: 1003878 → 1003879 bytes
tolerancia:  0 bytes
resultado:   PASS
```

Dos causas, no una:

1. **El gate comparaba kilobytes redondeados.** `Math.round(1003878/1024)` y
   `Math.round(1003879/1024)` son los dos 980, así que la diferencia era invisible para la
   comparación mientras la tabla de recursos la enseñaba en bytes. Corregido: se comparan enteros.
2. **El byte venía de fuera.** Medidas las dos cargas recurso a recurso, los bytes **locales** eran
   idénticos (874.138 en los dos lados) y toda la diferencia estaba en `fonts.gstatic.com`: 50.958
   frente a 51.484 y 76.905 frente a 77.022, 643 bytes en total. No era el nombre aleatorio de la
   portada, que era la sospecha inicial y resultó falsa.

Las dos correcciones son independientes y las dos hacían falta: sin la primera el gate no mide, y
sin entender la segunda el gate estaría rojo cada dos por tres por culpa de una CDN.

## 21. Cómo se usa esto a partir de ahora

```bash
npm --prefix qa run fast     # antes de cada commit
npm --prefix qa run smoke    # cuando se toca el panel o la carta
npm --prefix qa run full     # antes de una entrega
npm --prefix qa run weekly   # lo que corre el lunes en CI; también a mano antes de publicar
```

Tres cosas que conviene saber:

- **Un `FAIL` no se arregla relajando la prueba.** O el producto cambió a propósito —y entonces se
  cambia la prueba y se dice por qué— o hay un fallo. Las dos cosas son trabajo; bajar el listón no.
- **La línea base no se toca sin autorización.** `baseline:escribir` avisa antes de sobrescribirla.
  Una línea base que se actualiza sola compara siempre contra el estado ya degradado.
- **Un `BLOCKED` es una deuda, no un aprobado**, y desde la 17.1 uno que nadie haya aprobado además
  rompe la suite.

## 22. Lo que queda para otra fase

- **Conseguir un run verde en GitHub Actions.** El workflow ya se ha ejecutado dos veces y las dos
  causas están corregidas en el árbol; falta la autorización para volver a dispararlo.
- **Que el gate de tiempos aguante el perfil rápido.** El 5 % de la carta de escritorio son 43 ms y
  esta máquina se mueve 70–80 ms entre pasadas de la misma página. Las salidas posibles son un
  suelo absoluto además del porcentaje, más muestras en ese perfil, o declarar que las métricas de
  tiempo del control se arbitran igual que las de la línea base. Las tres cambian el gate y ninguna
  está autorizada: hoy el `FAIL` de `LHC-CMP-carta-escritorio` se queda a la vista.
- Cubrir Apache de verdad exigiría un contenedor con Apache y `mod_rewrite`.
- Confirmar `ext-gd` en el hosting real.
- Retirar `admin/temas.json` de la carpeta publicada, que es un cambio del producto.
- E3, E4 y E5 siguen abiertos por orden expresa.
- La batería no mide en producción y no debe hacerlo: mediría el hosting, la red y el momento del
  día, no el código.

## 23. Veredicto

Del producto ha cambiado **una sola cosa**, autorizada en la fase 17.3: `admin/index.php` declara el
icono de pestaña que el motor ya generaba. No hay ningún otro cambio de producto, `git diff --check`
sale limpio y todo lo demás del árbol es infraestructura de pruebas. La carpeta publicada sigue con
sus 64 ficheros y **no cambió durante las fases 17.4 ni 17.4.1**.

Seis de las siete suites corren en verde y devuelven `0`; `comparativa` devuelve `1` por un tiempo
que se mueve con la página idéntica en los dos lados —§15, con los números—. La cobertura de la
superficie inventariada es completa: 123 elementos con prueba ejecutable, 3 BLOCKED aprobados con su
motivo y 1 NO APLICA cubierto en otro sitio. Las doce familias de fallo sembrado se detectan y se
retiran. Los tres defectos abiertos por orden expresa siguen abiertos y vigilados. La línea base y
las tolerancias **no se han tocado** en las fases 17.4 ni 17.4.1.

**FASE 17 QA AUTOMATIZADA: APTO LOCAL CON UN `FAIL` ABIERTO EN `comparativa`**
**VALIDACIÓN GITHUB ACTIONS: PENDIENTE DE UN RUN VERDE**

El primer renglón se queda como está a propósito. El `FAIL` es de la batería, no del producto, y
arreglarlo pide un cambio de gate —un suelo absoluto en las métricas de tiempo, o más muestras en el
perfil rápido— que ninguna fase ha autorizado. Bajar el listón para que salga verde sería
exactamente lo que §21 prohíbe.

El segundo renglón tampoco es una formalidad. El workflow se ha ejecutado dos veces en GitHub Actions,
`34023665406` y `34024245556`, y las dos veces en rojo; las dos causas están identificadas y
corregidas en el árbol. Lo que falta es la autorización para volver a dispararlo. Hasta que exista
una ejecución real en verde, el veredicto de CI es ese y no otra cosa.

Ninguna de estas fases autoriza commit, push, PR, merge, workflow remoto, despliegue, FTP ni
escritura en producción, y ninguna de esas operaciones se ha ejecutado.
