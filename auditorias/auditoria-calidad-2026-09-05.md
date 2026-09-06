# Auditoría de calidad — 5 de septiembre de 2026

Repositorio `restaurantemenu` (Tinge of Turmeric) · rama `feature/publicidad-fechas` · HEAD auditado
`d903dfe` («feat(admin): rediseña el panel y añade programación publicitaria») · árbol limpio antes
y después de la auditoría (este informe es la única escritura en el repositorio).

Alcance: panel de administración (`motor/server/admin/index.php`, ocho pestañas migradas al sistema
bento oscuro), carta pública generada (`2-subir/index.html`, `juego.html`, `admin/record.php`),
build y validadores del proyecto. Sin commit, push, despliegue, FTP ni contacto con producción.

## 0. Veredictos

Veredictos corregidos por orden del propietario (fase correctiva, 5 de septiembre de 2026): la
primera versión de este informe emitió «APTO con observaciones» con un defecto ALTA abierto, lo que
no respeta el criterio de aceptación ordenado (una función con fallo ALTO nunca produce un APTO).
Se conservan los veredictos originales en la tercera columna para dejar rastro del error.

| Veredicto | Resultado (corregido) | Emitido inicialmente |
|---|---|---|
| ADMINISTRADOR | **NO APTO** — A1 (ALTA: imagen corrupta guardada como portada) y M1, reclasificada de MEDIA a **ALTA** por riesgo de pérdida silenciosa de datos al restaurar una copia | APTO con observaciones |
| MODO OSCURO | **APTO** (contrastes ≥ 5,8:1 en texto, foco visible en todos los controles, sin desbordes salvo dos a 320 px) | APTO |
| AUSENCIA DE RESIDUOS DEL MODO CLARO | **CONFIRMADA** (0 coincidencias en repositorio y build; sin claves de tema en `localStorage`/cookies; sin interruptor; sin `prefers-color-scheme`) | CONFIRMADA |
| CARTA PÚBLICA | **NO APTA TODAVÍA** — la ficha de alérgenos y el clic real de búsqueda en escritorio siguen sin probarse; B6 produce precios incoherentes entre lista y búsqueda | APTA con observaciones |
| LÍNEA BASE LIGHTHOUSE LOCAL | **BLOCKED** en la auditoría inicial — Lighthouse no estaba instalado (ni global, ni local, ni en la caché de `npx`). La medición manual de §9 NO es Lighthouse. Ver §15 para la línea base obtenida con Lighthouse instalado en carpeta temporal | BLOCKED |
| APTO PARA OPTIMIZAR | **NO APTO** — no puede optimizarse un sistema con fallos ALTA abiertos; primero la fase correctiva funcional (§15) | APTO |

**Tras la fase correctiva (§15, mismo día):** ADMINISTRADOR **APTO** con observaciones; MODO
OSCURO **APTO**; AUSENCIA DE RESIDUOS DEL MODO CLARO **CONFIRMADA**; CARTA PÚBLICA **APTA** con
una salvedad (alérgenos: NO APLICA en este cliente); LÍNEA BASE LIGHTHOUSE LOCAL **OBTENIDA**;
APTO PARA OPTIMIZAR: **técnicamente apto, autorización pendiente del propietario**. La
justificación de cada uno está en §15.9. Las secciones 1-14 se conservan tal como se emitieron
(estado del código en `d903dfe`); la sección 15 describe el estado con los nueve lotes.

**Tras la validación de escalabilidad multicliente (§16, 5-6 de septiembre de 2026):**

| Veredicto | Resultado |
|---|---|
| ESCALABILIDAD MULTICLIENTE | **APTO** — cliente nuevo limpio, sin datos de Tinge, build correcto, administrador completo, carta funcional, alérgenos probados con fixture, aislamiento bidireccional por hashes, actualización del motor segura con rollback, cero modificaciones del núcleo y ninguna regresión en Tinge. Con dos condiciones abiertas antes de dar de alta un restaurante real: **E1** (todo cliente nuevo sirve un 404 por página, falta `assets/titleIcon-accent.svg`) y **E2 + GD** (`mbstring` y `gd` sin confirmar en el hosting; sin `mbstring` el panel pierde cinco pestañas). Justificación en §16.17 |

Como la escalabilidad queda APTO, el veredicto general **no** pasa a «NO APTO PARA OPTIMIZAR —
falta cerrar la validación multicliente»: se mantiene el de §15.9. La sección 16 no cambia ni una
línea de código; corrige la explicación del peso en §15.7 y documenta cinco defectos (E1-E5) sin
tocarlos.

**Tras la corrección previa E1/E2 (§17, 6 de septiembre de 2026):**

| Veredicto | Resultado |
|---|---|
| E1 — favicon inexistente en todo cliente nuevo | **CORREGIDO — PASS** — `gen.mjs` escribe un icono genérico teñido con el color de marca del cliente cuando éste no trae el suyo, sin sobrescribir jamás uno personalizado; `verificar-build.mjs` lo exige. Los tres FAIL de §16 desaparecen |
| E2 — el panel moría sin `mbstring` | **CORREGIDO — PASS** — cuatro funciones de texto con `mb_*` cuando está y un camino equivalente cuando no; 8 de 8 pestañas y `record.php` funcionando en los dos entornos, con `record.json` idéntico byte a byte |
| ESCALABILIDAD MULTICLIENTE | **APTO** |
| ADMINISTRADOR | **APTO CON Y SIN MBSTRING** |
| APTO PARA PASAR A LA FASE 17 | **SÍ, PENDIENTE DE AUTORIZACIÓN** |

Sigue abierto `DESPLIEGUE BLOCKED — falta confirmar ext-gd en el hosting`; el bloqueo por
`ext-mbstring` se levanta. **E3, E4 y E5 siguen sin corregir**, por orden expresa. Recuento
recalculado en §17.9: **98 PASS · 0 FAIL · 4 BLOCKED · 2 NO APLICA · 2 no ejecutados**.

## 1. Entorno y método

- Máquina Windows 11; PHP 8.4.24 CLI (`php -S`, sin GD; mbstring cargada por `-d extension`); Node
  v24.19.0; Playwright (Chromium) por MCP para interacción real, consola, red, capturas y persistencia.
- Herramientas ausentes, y por tanto NO usadas en la auditoría inicial: Lighthouse, `/verify`,
  `/simplify`, Web Quality Skills, Anthropic Webapp Testing. Sus comprobaciones se reprodujeron a
  mano con Playwright y los validadores del proyecto. (Lighthouse se instaló después, con
  autorización y en carpeta temporal, para la fase correctiva: §15.2.)
- Tres servidores locales, todos sobre carpetas desechables fuera del repositorio (scratchpad de la
  sesión): puerto 5407 y 5409 → `auditoria-docroot/` (build limpio + `estado.json` desechable +
  `clave.php`/`superclave.php` desechables, `SESION_MINUTOS=30`); 5409 arrancado además con
  `-d error_log=…` para capturar avisos PHP. Puerto 5391 → carpeta del cliente (solo lectura).
- Datos: `estado.json`, fotos, copias, marcador, contadores y contraseñas creados y destruidos en la
  carpeta desechable. Ninguna credencial, sesión ni dato de producción. Este informe no contiene
  contraseñas.
- Trampas del entorno que condicionan lecturas: `php -S` ignora `.htaccess` (las denegaciones de
  ficheros se verifican por lectura estática, no por HTTP); sin GD el recomprimido del hero cae al
  guardado en crudo; `upload_max_filesize=2M` por defecto en CLI.
- Capturas (49) y trazas quedan en el scratchpad de la sesión (`auditoria-capturas/`,
  `php-errores-5409.log`, `php-5409-stdout.log`). Nada de eso entra en el repositorio.

## 2. Precondiciones y commit autorizado

Ejecutado antes del commit `d903dfe` (todo PASS): `git diff --check`; `php -l`; `node --check` de
`gen.mjs`, `cliente.mjs`, `carta.mjs`, `importar.mjs` y `motor/*.mjs`; `node motor/lock.mjs`
(cuadra, v1.1.8, 100 ficheros); `node motor/verificar-build.mjs` (61 ficheros obligatorios);
barrido de secretos (única coincidencia: la palabra CSS «tokens»); sin cuarto archivo. Tras el
commit: `git status --short` vacío. `main` = `origin/main` = `968d1d7`.

## 3. FASE 1 — Análisis estático (solo lectura)

| Comprobación | Resultado |
|---|---|
| Sintaxis PHP/JS, build, lock | PASS (§2) |
| Idempotencia de `gen.mjs` | PASS módulo sello de build: solo cambian `admin/cliente.php` (BUILD_ID/BUILD_FECHA), `index.html`, `version.json` |
| Avisos PHP durante 317 peticiones al panel (5409, `error_log` dedicado) | PASS — fichero de errores vacío; ninguna página contiene `Warning/Notice/Deprecated` |
| Errores de consola JS en las ocho pestañas × cinco anchos | PASS — 0 errores (los únicos 404 de consola fueron peticiones de la propia auditoría) |
| Tamaño de `index.php` | 468.959 B, 8.738 líneas; CSS ≈ 85 KB, JS ≈ 200 KB (sin bloques PHP) |
| Reglas CSS | 819; duplicadas exactas: 3 (`.card-main{padding:var(--s4)}` ×2 y dos fragmentos de keyframes) |
| Clases CSS sin consumidor textual (markup, JS, PHP, motor, build) | 69 de 405 (92 reglas, ≈ 340 líneas) — lista en §11; verificado que ninguna se construye por concatenación (`'prefijo-' +`) |
| Variables CSS sin `var()` consumidor | 1: `--metal-ink` |
| Funciones JS sin otra referencia | ninguna (53) |
| Funciones PHP sin llamada | ninguna (80; `color_canal` se llama vía `array_map`) |
| Residuos del modo claro | 0 coincidencias de `data-piel`, `prefers-color-scheme`, `color-scheme`, `modo claro`, `light mode`, `theme-toggle` en `1-proyecto` (sin `.git`) y en `2-subir`; `SPEC.md`/`RELEVO.md` no lo mencionan |
| HTML de una pestaña del panel | 1.344 KB sin comprimir (§9): 312 filas × 3 pestañas + catálogo `PLATOS` + CSS/JS en línea |

## 4. FASE 2 — Panel: matriz funcional (docroot desechable, sesión real de cliente)

Convención: PASS (probado y correcto), FAIL (defecto, ver §10), BLOCKED (no verificable en este
entorno), NO PROBADO (fuera de alcance o no conseguido). «UI» = clic real en la interfaz; «POST» =
petición con el token CSRF de la página (mismos manejadores).

### 4.1 Acceso y sesión

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Entrada cliente / super, contraseña incorrecta, bloqueo tras 8 fallos (15 min), caducidad, `?salir` | UI | PASS | matriz de autenticación de la primera parte de la sesión; `accesos.log` registra cada evento |
| CSRF inválido en un guardado | POST | PASS | «La sesión ha caducado. Vuelve a entrar.»; `estado.json` intacto |
| Expulsión al cambiar la contraseña del rol | UI | PASS | contraseñas antiguas rechazadas tras `reset_cliente` y `cambiar_super`; nuevas aceptadas |
| Superadmin: `reset_cliente` (mín. 8), `cambiar_super` (actual incorrecta, mín. 12, ok), sesión propia sigue viva | UI | PASS | avisos exactos; `clave.php`/`superclave.php` desechables reescritos; log «contraseña del restaurante restablecida (super)», «contraseña de superadmin cambiada» |
| `salir_demo` | — | NO PROBADO | solo existe con `DEMO_SIN_CLAVE` y sin `clave.php`; el docroot de auditoría tiene clave |
| Cabeceras `no-store`, `X-Frame-Options`, `nosniff`, `X-Robots-Tag` | HTTP | PASS | verificadas en la primera parte |

### 4.2 Marca

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Nombre > 20 / rótulo > 25 caracteres | POST | PASS | «El nombre no puede pasar de 20 caracteres (van 21).» / «…25 caracteres (van 26).» |
| Color hex inválido / color legible / vacío = restaurar | POST | PASS | «Ese color no es un hex válido…»; `#FFFFFF` aceptado (legible con texto oscuro, por diseño); normaliza `ff7517` → `#FF7517` |
| Nota `abc`, `11`, nota+interruptor sin reseñas | POST | PASS | «La nota tiene que estar entre 0 y 5…»; «…hacen falta las dos cosas…» |
| URL de reseñas `http://` | POST | PASS | exige `https://` |
| WhatsApp corto / normalización `+34 617 79 85 57` → `34617798557` | POST | PASS | |
| URL de Instagram en el campo de Facebook | POST | PASS | «Facebook: la dirección tiene que empezar por https:// y ser de Facebook.» |
| Guardado completo y reenvío idéntico | POST | PASS | `estado.json` refleja los 11 campos; recorte de espacios en nombre |
| Guardar cambios desde la tira exterior (`form="marca-form"`) | UI | PASS | nombre/rótulo/reseñas cambiados; los campos no tocados (redes, color, nota) intactos |
| Fotos de portada: lote de 4 (válida 1200×800, corrupta, 400 px, `.txt`) | UI | **FAIL (ALTA)** | válida guardada; 400 px y `.txt` rechazados con su mensaje; **PNG corrupto guardado** como `f55e46026b58b2e8.png` (4.008 B, «1455896991×2348852347») — §10 A1 |
| Reordenar (`ordenar_fotos`, fetch) / conjunto distinto | POST | PASS | orden persistido; conjunto distinto → `ERROR` sin escribir |
| `mover_foto` arriba/abajo (respaldo sin JS), `quitar_foto` inexistente y con `../` | POST | PASS | orden intercambiado; «Esa foto ya no está.»; sin escritura para nombres no listados |
| Quitar foto con confirmación | UI | PASS | disco y `estado.json` limpios |
| Copias: descargar estado / descargar copia | POST | PASS | `application/json`, `Content-Disposition: attachment; filename="estado-…json"`, cuerpo = estado |
| Copias: nombre inexistente, `../estado.json` | POST | PASS | «Esa copia ya no está…»; el nombre se busca en la lista, nunca se pega a una ruta |
| Copias: restaurar (con confirmación) | UI | **FAIL (MEDIA)** | restaura precios… y TODO lo demás — §10 M1 |
| Copias: borrar todas (con confirmación) | UI | PASS | carpeta `copias/` vacía salvo `.htaccess`; estado vacío en pantalla |
| `migrar_estado` con esquema 2 | POST | PASS | «El estado ya usa identificadores permanentes: no hay nada que migrar.» (sin escritura); botón no visible |

### 4.3 Publicidad

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Subir creatividad 1120×480 (elegir fichero = enviar) | UI | PASS | «Imagen guardada. El banner esta desactivado.»; fichero en `assets/publicidad/`, HTTP 200 |
| Medida distinta (1200×800) / `.txt` / PNG corrupto | UI | PASS | «…debe medir exactamente 1120 x 480 px…», «Eso no es una imagen JPG, PNG o WebP.»; el corrupto cae por medida |
| Fichero > 2 MB (3,1 MB) | UI | **FAIL (MEDIA)** | «La subida ha fallado (codigo 1). Vuelve a intentarlo.» en vez del mensaje de peso — §10 M3 |
| Reemplazo borra la anterior | UI | PASS | solo un fichero en disco tras reemplazar |
| Quitar imagen (con confirmación) | UI | PASS | estado sin `img`, carpeta vacía |
| URL `ftp://`, sin esquema; fecha basura; fin ≤ inicio | POST | PASS | mensajes exactos; nada escrito |
| Guardado con fechas → UTC (TZ `Atlantic/Canary`) | POST | PASS | `2026-09-05T00:00` → `2026-09-04T23:00:00Z` |
| Atajo «Una semana» + horas 12:00–16:30 + URL + interruptor + Guardar | UI | PASS | `startAt 2026-09-05T11:00:00Z`, `endAt 2026-09-11T15:30:00Z`; ficha «ESTADO INCOMPLETO» sin imagen; «activo» con imagen |
| Interruptor por etiqueta (la casilla queda bajo la bola) | UI | PASS | texto Encendido/Apagado sincronizado |

### 4.4 Ofertas

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Encendida sin categoría/plato; sin día; % 0 y 91; fin ≤ inicio; categoría inventada; día 0/8 | POST | PASS | los seis mensajes esperados; nada escrito |
| Apagada con datos | POST | PASS | «GUARDADO, PERO LA OFERTA ESTÁ APAGADA…» y estado guardado |
| Dos categorías + plato de categoría marcada (filtrado) + plato repetido + plato inexistente | POST | PASS | `cats` dobles (id + nombre legado), `keys` sin el filtrado ni el inexistente, sin duplicados |
| Días duplicados en el POST | POST | **FAIL (BAJA)** | `days:[1,7,7]` — §10 B1 |
| Horas basura (`zz`, `9`) | POST | observación | caen a 10:00–12:00 en silencio; imposible desde la interfaz |
| Categorías (pastillas), acordeón por plato, «Semanal» (7↔0), quitar un día apaga «Semanal», %, horas, interruptor, Guardar | UI | PASS | `offer` exacto; filas `.es-oferta`; insignias «N en oferta»; pie «En la carta no hay ningún descuento.» |

### 4.5 Precios

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Subida 0, −5, 51, `abc` | POST | PASS | «La subida tiene que estar entre 0 y 50%.» |
| 7,5 % y 50 %: previsualización de 293 platos con precio, todo múltiplo de 5 cts, sin escribir | POST | PASS | 0 valores no múltiplos; `prices` intacto |
| «A mano»: misma lista con precios actuales | POST+UI | PASS | 293 filas iguales al actual; título «Precios a mano» |
| +5 % por UI, pestañas ocultas en REVISAR, tira con «Cancelar» y «Publicar precios», Cancelar vuelve sin escribir | UI | PASS | |
| Publicar: hermana sincronizada en vivo (`12,5` en Aperitivos y Vegano), `9,5O` y `0` rechazados por nombre, vacío ignorado | UI | PASS | «Publicado: 2 precio(s)… NO se ha guardado el precio de Surtido de encurtidos, Yogur natural…» |
| Filtro de la lista | UI | PASS | «papadum» → 4 filas |
| Copia de seguridad al cambiar precios (una por minuto, `COPIAS_MAX` 3) | disco | PASS | `2026-09-05-1740.json`, `-1741.json`… |
| Volver a los de la carta (con confirmación) | UI | PASS | «Precios devueltos a los de la carta.»; `prices: []`; copia previa escrita |

### 4.6 Juego

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Interruptor ON/OFF por ratón y por teclado (espacio), Guardar | UI | PASS | `game.on` persistido; frase de estado cambia |
| Marcador sembrado por la API pública (`record.php`) | POST | PASS | 250 con nombre/país, 180 anónimo; 0, 99999, `12abc` → 400; nombre con etiquetas HTML y palabrota saneados; país fuera de lista descartado; `record.json` público sin ids |
| Quitar nombre (con confirmación) | UI | PASS | «Nombre borrado. La puntuación se queda.»; `record.json` sin nombre |
| Vaciar el marcador (con confirmación) | UI | PASS | `record.json` y `marcador.json` borrados; «0 de 3» |

### 4.7 Agotados

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Un plato con hermana sin marcarla; clave inventada; vacío | POST | PASS | «…1 plato(s) agotados, y 1 fila(s) más…»; inventada ignorada |
| Marcar por UI: hermana se marca en vivo, contador de tira «2 platos agotados · sin guardar», insignias «1 agotado», «Sólo marcados» (2 filas / 2 acordeones), buscador («sopa» → 14; sin resultado → «Ningún plato coincide con la búsqueda.»), Guardar | UI | PASS | pestaña «Agotados hoy 2»; `soldOut` con fecha del día |
| Quitar todos (confirmación) + Guardar | UI | PASS | «Guardado: hoy no hay nada agotado.» |
| Aviso `beforeunload` de cambios sin guardar | UI | **FAIL (MEDIA)** | salta tras escribir en el buscador o elegir una foto, sin ninguna casilla tocada — §10 M2 |
| Foto de plato: cámara → selector → recortador 1000×1000 (zoom 100–400, arrastre) → guardar | UI | PASS | JSON `{ok, foto, url}`; WebP 1000×1000 de 3,4 KB; `estado.fotos` doble clave; botón «tiene»; log «foto nueva» |
| Reabrir con foto (vista actual, Cambiar/Quitar) → Quitar | UI | PASS | fichero borrado (404), `fotos: []`, log «foto quitada» |
| `foto_accion`: plato inexistente, acción rara, quitar sin foto, subir sin fichero | POST | PASS | JSON de error para cada caso |

### 4.8 Destacados

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Plato inventado / etiqueta inventada / sin nada / quitar inexistente | POST | PASS | «Ese plato no está en la carta.», «Esa etiqueta no existe.»; quitar inexistente responde «Destacado quitado.» sin cambio |
| Combo: escribir «56» → opción → flecha+Intro → clave rellena → etiqueta → Añadir | UI | PASS | `tags` doble clave |
| Acordeón: tocar una fila abre las etiquetas debajo (formulario único movido), Escape cierra, segunda etiqueta | UI | PASS | requiere clic real de ratón (con `dispatchEvent` no; con Playwright `force` tampoco) |
| Quitar un destacado | UI | PASS | |
| Pestaña «Destacados 2», lista de arriba, filas `.es-destacado`, insignias | UI | PASS | |

### 4.9 Analítica

| Función | Modo | Resultado | Evidencia |
|---|---|---|---|
| Con datos sintéticos (`2026-08.json`, `2026-09.json`, `d-2026-09-05.txt` de 118 B, `vp-2026-09.json`) | UI | PASS | «118 hoy», «Desde el 01/08/2026 4.146 aperturas en total» (3.623+405+118), «máx. 187 el 28/08», semana 599, mes 523, top 7 platos |
| Estado vacío | UI | PASS | aviso «Todavía no hay ningún dato…» (verificado antes de sembrar) |

## 5. Dispositivos (ocho pestañas × cinco anchos, 5409, capturas en el scratchpad)

| Ancho | Resultado | Detalle |
|---|---|---|
| 320 (móvil estrecho) | FAIL leve en 2 de 8 | Ofertas: `#of-hasta` (hora fin) llega a 332 px en un viewport de 305 (`.adm-rango .adm-campo{width:120px}` ×2); Analítica: cabecera «Platos más consultados» (`.der.adm-a-platos`: Hoy / Esta semana / Septiembre + ayuda) llega a 344 px. Resto sin desborde; pestañas con scroll horizontal propio |
| 375 (móvil estándar) | PASS | sin desborde; globo de ayuda dentro del viewport (323 px, 16 px) |
| 768 (tableta) | PASS | rejilla en 1 columna hasta 1000 px por diseño |
| 1280 (escritorio) | PASS | bento de 6 columnas; tira de acciones visible solo en la pestaña activa |
| 1920 (escritorio ancho) | PASS | |
| Login 320 / 1280 | PASS | sin desborde |

Estados vacío/uno/muchos: marcador 0/1/2, copias 0/3, agotados 0/2, destacados 0/2, banner sin
imagen/con imagen, precios sin cambios/2 cambios — todos con su texto propio. Texto largo:
mensaje de publicar precios con dos listas de nombres se lee entero en el aviso.

## 6. Accesibilidad, ayudas y modo oscuro

- Ayudas (ⓘ): se abren con clic, Intro y toque; Escape cierra y devuelve el foco; clic fuera cierra;
  no se abren al pasar el ratón (por diseño). Botón con `aria-expanded` y `aria-describedby` al
  abrir; el globo lleva `role="dialog"` (semántica discutible para un tooltip, ver B5). Contraste
  del globo 15,4:1.
- Contrastes medidos (texto/fondo real): botón Guardar 6,97; pestaña activa 15,9; inactiva 6,39;
  notas y pies 5,84 (13 px); interruptores 14,5. Todo ≥ 4,5:1.
- Foco visible: campos con borde naranja + halo (`.adm-campo:focus`); interruptores con contorno
  en la pista; botones con contorno 2 px. Orden de tabulación coherente en Publicidad (16 saltos).
- Interruptores: la casilla queda bajo la bola; funciona por etiqueta y por teclado.
- Modales: recortador de foto con `role="dialog" aria-modal="true"`, foco al zoom al abrir, Escape y
  clic en la capa cierran.
- Login: campo de contraseña sin `<label>` asociado (aviso de consola de Chromium), `autocomplete`
  correcto.
- Modo oscuro: paleta declarada en `.card-main` y `.adm-board` (sin `:root`), `color-scheme` normal,
  `body #08090A`, tarjeta `#101114`, tinta `#EDEBEB`; la etiqueta «Oscuro, del motor: #121212» que
  aparece en Marca es el nombre de un rol de color fijo, no un selector de tema.

**Residuos del modo claro:** ninguno. Comprobado: grep en `1-proyecto` y `2-subir` (0), variables y
clases de tema (0), `prefers-color-scheme`/`color-scheme` (0), `localStorage`/`sessionStorage`/
cookies del panel (vacíos; la carta guarda `totm-lang`, `totm-hero`, `totm-escala`, `totm-contada` y
la clave `MARCA` del contador: ninguna es un tema), interruptores o formularios de tema (0), textos o
documentación que lo prometan (0). **Propuesta de allowlist de residuos: vacía.**

## 7. FASE 3 — Carta pública (build en el docroot desechable, con el estado del panel)

| Función | Móvil 375 | Escritorio 1280 | Evidencia |
|---|---|---|---|
| Carga sin errores de consola ni peticiones fallidas | PASS | PASS | 0/0 |
| Marca desde el panel (nombre, rótulo), precio publicado (Papadum €12.50), reseñas «4.9 out of 5 +200…», enlaces WhatsApp/Instagram/TripAdvisor/Google | PASS | PASS | |
| Agotado del día («SOLD OUT TODAY» / «AGOTADO HOY» / «HEUTE AUSVERKAUFT») | PASS | PASS | 1 visible en Aperitivos (el hermano vegano está en su pestaña) |
| Oferta activa: banda «20% OFF SELECTED DISHES», insignias «20% DTO.» por plato | PASS | PASS | 5 insignias visibles en Aperitivos |
| Idiomas EN/ES/DE por el menú «Language», persistencia tras recargar | PASS | PASS | `totm-lang` |
| Búsqueda («papadum» → 4 platos; «56» → Lamb; sin resultado → «Nothing matches…»); filtros Vegan/Gluten Free/On offer/Signature | PASS (abierta con el FAB) | NO PROBADO el clic real en `#nav-search` (abierto por JS) | el chip «Signature 1» prueba el destacado |
| Ficha de plato con alérgenos (`.dsheet-alergenos`) | NO PROBADO | NO PROBADO | no se consiguió abrir la hoja por automatización; existe en el DOM |
| Banner publicitario (solo < 768 px por diseño): imagen 1120×480 perezosa, enlace `_blank` + `rel="sponsored noopener noreferrer"` | PASS | n/a (oculto por diseño) | |
| Foto de portada (hero) | PASS | PASS | 1200×800 |
| Hero con fichero ausente | PASS con observación | — | la carta sigue; `.hero-frame` deja 215 px vacíos (B3) |
| `estado.json` ausente | PASS | — | valores por defecto (nombre del motor, precios de la carta, sin banner/oferta/reseñas), 0 errores |
| Juego (`juego.html`), récord publicado y mostrado («RECORD 250 Audit…») | PASS | PASS | |
| `404.php` | PASS | PASS | responde 404 |
| Denegación de `admin/*.json`, `clave.php`, `hash.php`, `fuentes.html`, `datos/`, `copias/`, `sesiones/` | BLOCKED en local | BLOCKED en local | `php -S` no aplica `.htaccess`; las reglas se leyeron y son correctas (`2-subir/admin/.htaccess`, `assets/*/.htaccess` generados por el panel) |

## 8. Persistencia y reflejo

Cada escritura se verificó releyendo `estado.json` (o el fichero que toque), recargando la
pestaña y, en los casos con reflejo público, cargando la carta: agotado, oferta, precio, marca,
reseñas, redes, banner, récord. Las claves se escriben en doble formato (identificador permanente +
clave legada) de forma consistente en `soldOut`, `tags`, `offer.cats/keys`, `prices`, `fotos`.

## 9. FASE 4 — Rendimiento

**LÍNEA BASE LIGHTHOUSE LOCAL: BLOCKED.** Lighthouse no está disponible (no hay binario global,
`npx --no-install lighthouse` falla y no está en `node_modules`); usarlo exigiría instalar una
dependencia, cosa expresamente no autorizada. PageSpeed de producción no se ha consultado ni se
compara.

**Medición local manual sustitutiva (Playwright + Chrome DevTools Protocol; NO es Lighthouse):**
cinco cargas comparables por perfil, caché desactivada y vaciada, medianas. Perfil móvil: 375×667,
CPU ×4, red 1,6 Mbps / 150 ms; escritorio: 1350×940, CPU ×1, 10 Mbps / 40 ms. TBT = suma de
(tarea larga − 50 ms) entre FCP y carga+2 s. Speed Index no es calculable sin Lighthouse (n/d).
Los bytes son SIN comprimir: `php -S` no aplica `deflate` (el `.htaccess` de producción sí).

| Página / perfil | FCP | LCP | CLS | TBT | Peticiones | KB transferidos | HTML KB |
|---|---|---|---|---|---|---|---|
| Carta / móvil | 492 ms | 824 ms | **0,194** | 140 ms | 10 | 776 | 735 |
| Carta / escritorio | 140 ms | 240 ms | 0,034 | 0 ms | 9 | 775 | 735 |
| Panel (Agotados) / móvil | 4.956 ms | 4.972 ms | 0,143 | 16 ms | 6 | 1.386 | 1.344 |
| Panel (Agotados) / escritorio | 868 ms | 884 ms | 0,059 | 0 ms | 7 | 2.120 | 1.344 |

Recursos de la carta: HTML 735 KB, hero 22 KB, logo 9 KB, banderas 3×≤3 KB, `estado.json` 2 KB,
Google Fonts (CSS + un woff2). Lecturas: el HTML de la carta y del panel son el coste dominante;
el CLS móvil de la carta (0,19) supera el umbral de 0,1 y merece diagnóstico (fuentes web y hero
son los sospechosos habituales); el panel a 1,6 Mbps tarda ~5 s en pintar por su HTML de 1,3 MB.

## 10. Hallazgos

### ALTA

**A1 · Marca: una imagen corrupta se guarda como foto de portada.** Un PNG con cabecera IHDR
basura pasa `getimagesize` (anchura «1455896991» ≥ 800) y, al fallar `hero_recomprimir` (con GD y
sin GD), el respaldo guarda el fichero en crudo. Evidencia: `f55e46026b58b2e8.png` de 4.008 B en
`assets/hero/`, `estado.hero` lo lista, la carta pide una imagen que no se puede pintar; el aviso
dice «2 fotos subidas» cuando una es basura. Reproducción: subir `corrupto.png` en Marca ›
Fotos de portada. Mismo fichero en Publicidad se rechaza (por medida exacta), no por integridad.

**M1 (reclasificada a ALTA) · Marca › Copias: «Restaurar» devuelve TODO el estado, no solo los precios.** La ficha,
las filas («Precios de antes del cambio») y la confirmación («¿Devolver los precios a como
estaban…?») hablan de precios, pero `restaurar_copia` sustituye `estado.json` entero. Reproducción
con evidencia: destacado A → cambio de precio (copia 18:06) → destacado B → cambio de precio (copia
18:07) → restaurar 18:06: `tags` pierde B (`d_bd6e5ad90d`), y cualquier agotado, oferta, banner o
dato de marca posterior a la copia se perdería igual. La copia de seguridad previa a la restauración
sí se escribe (M1 no pierde la salida), pero ver B2. Reclasificada de MEDIA a ALTA por orden del
propietario: es pérdida silenciosa de datos del restaurante.

### MEDIA

**M2 · Agotados: aviso de «cambios sin guardar» falso.** `pane.addEventListener('change')` pone
`sucio = true` para cualquier `change` dentro del pane: el buscador `#q` (al salir del campo) y el
selector de foto `#rec-file` (que vive dentro del pane). Evidencia: con 0 casillas tocadas, escribir
«sopa» y tabular dispara el diálogo `beforeunload` al cambiar de pestaña; tras subir o quitar una
foto (que ya está guardada) ocurre lo mismo. Molesto en servicio y engañoso.

**M3 · Publicidad: el mensaje de peso no llega cuando el límite lo pone PHP.** Con
`upload_max_filesize=2M` (valor por defecto) un fichero de 3,1 MB llega con `UPLOAD_ERR_INI_SIZE` y
el panel dice «La subida ha fallado (codigo 1). Vuelve a intentarlo.»; la rama «La imagen pesa X MB
y el máximo es 2,00 MB» solo se alcanza si `upload_max_filesize` > `PUB_MAX_BYTES`. El valor de
producción no se ha verificado (BLOCKED); en cualquier caso el mensaje de código es opaco para el
restaurante. Lo mismo aplica al hero (`HERO_MAX_BYTES` 1 MB, ahí sí alcanzable).

**M4 · Carta móvil: CLS 0,19 (mediana de cinco cargas simuladas).** Por encima del umbral 0,1;
en escritorio 0,03. Medición local, sin compresión ni CDN: requiere diagnóstico (fuente web con
`display=swap`, hero sin dimensiones reservadas o banda de oferta insertada tras leer el estado).

**M5 · Panel: 1,34 MB de HTML por pestaña.** Cada carga sirve las ocho pestañas (312 filas en
Agotados, Ofertas y Destacados, catálogo `PLATOS` en JSON, ~85 KB de CSS y ~200 KB de JS en línea).
En móvil simulado a 1,6 Mbps el primer pintado tarda ~5 s. Con `deflate` en producción el coste
baja mucho, pero el parseo no.

**M6 · 320 px: dos desbordes horizontales.** Ofertas (`.adm-rango .adm-campo{width:120px}` para las
dos horas) y Analítica (grupo de periodos + ayuda en la cabecera de «Platos más consultados»).
A 375 px no ocurre.

### BAJA

**B1 · Ofertas: `dia[]` repetido no se deduplica** (`days:[1,7,7]`); solo por POST manual. `minutos()`
cae a 10:00–12:00 en silencio con horas inválidas (imposible desde `<input type=time>`).

**B2 · Copias: dos cambios en el mismo minuto se pisan.** El nombre es `AAAA-MM-DD-HHMM`; una
restauración en el mismo minuto que el último cambio de precios sobrescribe esa copia (observado:
la copia 18:07 dejó de ser la del cambio y pasó a ser la previa a la restauración).

**B3 · Carta: hero ausente deja 215 px en blanco** (`.hero-frame` sin `onerror` ni respaldo). No
rompe nada más.

**B4 · Textos accesibles que no se actualizan:** el botón de cámara cambia `title` a «Cambiar la
foto» pero mantiene `aria-label="Poner foto a …"` hasta recargar. En `record.php`, «Audit <b>ñ</b>»
queda como «Audit bñ/b» (se quitan `<` y `>` pero no la barra).

**B5 · Semántica menor:** globo de ayuda con `role="dialog"` en vez de `tooltip`; sin `aria-controls`;
login sin `<label>`. Sección de superadministrador con clases legadas (`.card`, `.fld`, estilos en
línea) fuera del sistema bento (solo la ve el superadministrador).

**B6 · Carta: precio de un agotado incoherente entre lista y buscador.** En la lista, Papadum agotado
muestra €12.50 sin insignia de descuento; en la hoja de búsqueda aparece «Sold out today €10.00»
(precio con el 20 %).

**B7 · `RELEVO.md` desactualizado:** afirma `main = 1e984c3` «sin trabajo técnico abierto»; hay una
rama `feature/publicidad-fechas` con `d903dfe` sin integrar. Se reescribe solo por orden expresa.

**B8 · Residuos técnicos (no del modo claro):** 69 clases CSS sin consumidor (§11), `--metal-ink` sin
uso, 3 reglas duplicadas.

### Verificado y correcto (para que no se busque de nuevo)

Autenticación y bloqueo; CSRF; sesión atada a la contraseña; doble clave legado/id; validaciones de
Marca/Publicidad/Ofertas/Precios/Destacados/Agotados; hermanas en agotados y precios; copias solo
al cambiar precios; borrado de ficheros al reemplazar/quitar; `.htaccess` generados en
`assets/hero`, `assets/publicidad`, `assets/platos`, `admin/copias`; nombres de fichero nunca
tomados del POST; JSON del marcador sin identificadores; saneado de nombres; avisos PHP: cero.

## 11. FASE 5 — Candidatos de simplificación y optimización (ninguno aplicado)

Todos requieren `AUTORIZO FASE DE OPTIMIZACIÓN` y, después, allowlist y prueba propia. Se listan
con su estado de prueba; nada se elimina «por parecer inutilizado».

1. **Corregir A1** (fotos de portada): verificar la integridad real (`imagecreatefrom*` cuando hay GD;
   sin GD, rechazar si `getimagesize` devuelve dimensiones absurdas o si el tamaño en bytes no casa)
   y no guardar en crudo lo que no se ha podido decodificar. Riesgo bajo; contrato intacto.
2. **M2**: filtrar el `change` del pane por `e.target.name === 'agotado[]'` (o sacar `#rec-file` del
   pane). Una línea; riesgo nulo.
3. **M1**: o restaurar solo `prices` desde la copia, o cambiar los textos para decir que se restaura
   el estado entero. Decisión de producto (el código actual es coherente con su comentario interno:
   «Restaurar pasa por guardar_estado»).
4. **M3**: cuando `$f['error'] === UPLOAD_ERR_INI_SIZE`/`UPLOAD_ERR_FORM_SIZE`, decir el peso máximo
   real (`min(PUB_MAX_BYTES, ini_get('upload_max_filesize'))`) en vez del código.
5. **M6**: `.adm-rango .adm-campo` con `flex:1 1 0; min-width:0` bajo 360 px; cabecera de «Platos
   más consultados» con `flex-wrap`.
6. **M5** (peso del panel): candidatos, por orden de relación beneficio/riesgo — (a) no repetir 65
   SVG en línea por fila (usar `<use>`); (b) diferir el markup de las pestañas no activas (render por
   pestaña con `?t=`; ya existe `$pestana`); (c) mover CSS y JS a ficheros cacheables (el `.htaccess`
   ya sirve estáticos con caché); (d) comprimir `PLATOS`. Exige medir antes/después con la misma
   metodología de §9.
7. **M4** (CLS carta): reservar dimensiones del hero y de la banda de oferta; `font-display`
   `optional` o precarga del woff2. Medir.
8. **CSS sin consumidor (69 clases, ≈ 340 líneas):** `adm-acciones adm-acciones-txt adm-acordeones
   adm-e-caducado adm-e-incompleto adm-f-acc chica color-fijo color-fijo-hex color-fijo-punto
   colores-fila copia-dato copia-que copia-txt dirty dt-cab dt-chip dt-contra dt-nota dt-nota-cab
   dt-nota-lista dt-nota-pie dt-pct fila-accion foto-aviso foto-aviso-mal foto-btn foto-vacio grid2
   hrow is-oferta is-on is-out marcas-centro nm orow pcts pfijo pnuevo pod-bandera pod-fecha
   pod-pts pod-quien pod-x podio-admin procesando prow pviejo res-lbl res-line res-val sec-body
   switch-bola switch-off switch-on switch-pista switch-txt tickmark tools vp vp-barra vp-cab
   vp-fila vp-n vp-nom vp-pct vp-pie vp-pos vp-vacio`. Prueba realizada: búsqueda textual de cada
   nombre fuera de los bloques `<style>` de `index.php` y en todo el motor y el build, más
   comprobación de que no se construyen por concatenación (`'prefijo-' +` no existe para ninguno).
   Aún así, antes de borrar: repasar `record.php`, `datos.php`, `vista.php` y `404.php` (ya
   incluidos en la búsqueda) y las plantillas de `gen.mjs`. Ojo: `.card`, `.fld`, `.save`, `.tools`,
   `.card-main`, `.tabs-wrap` SÍ tienen consumidores (superadmin, subida de banner, migración).
9. Variable `--metal-ink` y 3 reglas duplicadas: eliminar tras la misma comprobación.
10. B1/B2/B3/B4/B5/B6: ajustes pequeños (`array_unique` en días; sello de copia con segundos o
    sufijo; `onerror` en el hero; sincronizar `aria-label`; `role="tooltip"`; `<label>` en login;
    coherencia de precio del agotado en la hoja de búsqueda).

## 12. Limitaciones y lo que queda sin probar

- Lighthouse: BLOCKED (no instalado). Speed Index: n/d.
- Denegaciones de `.htaccess`, `record.json → record.php` cuando falta el fichero, compresión
  `deflate`, HSTS: BLOCKED en `php -S` (verificadas por lectura del fichero, no por HTTP).
- `salir_demo`: NO PROBADO (modo demo no reproducido).
- Ficha de plato con alérgenos en la carta y clic real en `#nav-search` de escritorio: NO PROBADO.
- Variantes WebP del hero (`heroWebp`): sin GD en local no se generan; la carta sirve el original
  (comportamiento previsto). BLOCKED.
- Los diálogos `confirm` nativos se aceptaron a través del puente de Playwright; no hay diferencia
  funcional con el clic del usuario, pero conviene saberlo al leer las trazas.
- Producción: no se ha tocado, consultado ni comparado.

## 13. Artefactos y limpieza

Fuera del repositorio (scratchpad de la sesión): `auditoria-docroot/` (servidor desechable con su
estado, fotos, copias y contraseñas desechables), `panel-local/`, `fixtures/` (imágenes de prueba),
`auditoria-capturas/` (49 capturas), `php-errores-5409.log`, `php-5409-stdout.log`, scripts
`css-huerfano.py` y anteriores. En el espacio de trabajo (fuera del repo `1-proyecto`):
`.playwright-mcp/fixtures/` (copia de las imágenes para el puente de subida) — eliminada al cerrar
esta auditoría. Dentro del repositorio: solo este fichero.

Servidores locales (5391, 5403, 5407, 5409) siguen levantados en esta sesión y se pueden cerrar sin
consecuencia.

## 14. Punto de parada

La auditoría termina aquí. No se ha aplicado ninguna optimización, refactor ni corrección. El
siguiente paso —y solo tras `AUTORIZO FASE DE OPTIMIZACIÓN`— es acordar la allowlist de §11 (se
propone empezar por A1, M2, M6, M3, B1, B2 por su relación riesgo/beneficio) y probar cada cambio
con esta misma batería.

---

# 15. Fase correctiva funcional (5 de septiembre de 2026, tarde)

Autorizada por el propietario tras revisar la auditoría: nueve lotes funcionales, con línea base
Lighthouse antes de tocar código y comparación después. NO se autorizó —y NO se ha hecho— ninguna
optimización: ni `/simplify`, ni eliminación de CSS, ni reducción de HTML, ni separación de
pestañas, ni cambios de carga, fuentes, hero o LCP (M4, M5 y B8 siguen abiertos por orden expresa).
Sin commit, push, despliegue, FTP ni producción.

## 15.1 Precondiciones

`HEAD d903dfe`, rama `feature/publicidad-fechas`, `git status --short --untracked-files=all` antes
de empezar: solo `?? auditorias/auditoria-calidad-2026-09-05.md`. Sin `stash`, `reset` ni
`checkout` en toda la fase.

## 15.2 Lighthouse en carpeta temporal

Instalado con autorización expresa, fuera del repositorio y sin tocar `package.json`, lockfiles ni
dependencias del proyecto (`1-proyecto` no tiene `node_modules`):

- paquete `lighthouse@13.4.1` (108 paquetes) instalado con `npm install` en
  `<scratchpad de la sesión>/lighthouse-tmp/`; binario
  `lighthouse-tmp/node_modules/lighthouse/cli/index.js`; sin instalación global;
- Chrome estable local (`CHROME_PATH`), `--headless=new --no-sandbox --disable-gpu`;
- configuración fija para todas las mediciones (`lh-run.sh`): categorías performance,
  accessibility, best-practices y seo; `--throttling-method=simulate`; perfil móvil por defecto y
  `--preset=desktop` para escritorio; el panel se mide con la cookie de una sesión de cliente
  desechable pasada por `--extra-headers`;
- cinco ejecuciones por página y perfil, medianas con `lh-medianas.py`; informes JSON en
  `lh-antes/`, `lh-lote1/`, `lh-lote2-4/` y `lh-final/` (scratchpad, fuera del repositorio);
- páginas medidas en el docroot desechable (5409): la carta (`index.html`) y la pestaña más
  pesada del panel (`admin/index.php?t=agotados`). Bytes sin `deflate` (`php -S`).

**LÍNEA BASE LIGHTHOUSE LOCAL (antes de cualquier cambio de código):**

| página / perfil | Perf | A11y | BP | SEO | FCP | LCP | CLS | TBT | SI | peticiones | KB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| carta / móvil | 69 | 97 | 100 | 92 | 4.434 ms | 4.952 ms | 0,090 | 6 ms | 4.434 ms | 13 | 915 |
| carta / escritorio | 99 | 97 | 100 | 92 | 781 ms | 886 ms | 0,025 | 0 ms | 781 ms | 12 | 900 |
| panel Agotados / móvil | 56 | 98 | 100 | 45 (a) | 9.832 ms | 13.224 ms | 0,000 | 0 ms | 9.832 ms | 9 | 2.267 |
| panel Agotados / escritorio | 89 | 98 | 100 | 45 (a) | 1.301 ms | 1.696 ms | 0,029 | 0 ms | 1.301 ms | 9 | 2.267 |

(a) El panel lleva `X-Robots-Tag: noindex` y `no-store` a propósito: el SEO bajo es el esperado.
Estas medianas sustituyen a la medición manual de §9 (que no era Lighthouse) como referencia.

## 15.3 Método de los lotes

- Las fuentes se editan en el repositorio (allowlist) y **cada compilación y cada prueba se
  hacen sobre una copia desechable**: `scratchpad/copia/tinge_of_turmeric/1-proyecto` (copia sin
  `.git` ni `generado/`), donde `lote-build.sh` lanza `lock.mjs --escribir` → `gen.mjs` →
  `verificar-build.mjs` y copia `admin/index.php`, `admin/record.php`, `index.html` y
  `juego.html` al docroot de pruebas. Comprobado que `2-subir/admin/index.php` es copia literal
  de la fuente (`cmp`). El generador no necesitó tocar ningún fichero rastreado fuera de la
  allowlist (`git status` solo lista los cuatro fuentes y este informe).
- Servidores desechables: 5407 (PHP sin GD), 5409 (sin GD, `error_log` propio; el que mide
  Lighthouse), 5411 (**con GD**, `error_log` propio) y 5413 (docroot en modo demo, sin
  `clave.php` y `DEMO_SIN_CLAVE=true`). Ficheros de errores PHP de 5409, 5411 y 5413: vacíos.
- Los lotes 1 y 2-4 se compilaron y midieron por separado; los lotes 5-9 se compilaron juntos y
  su medición Lighthouse es la final. Cada tramo tiene su diff aparte en el scratchpad
  (`lotes/acumulado-lotes-1-4.diff`, `lotes-5-8.diff`, `lote-9.diff`) para poder revertirlo solo.
- Aviso de método: el puente de Playwright pierde el resultado de una ejecución cuando salta un
  diálogo nativo; los `confirm` del panel se manejaron con clics separados y las lecturas se
  repitieron hasta tenerlas completas. Ninguna prueba se da por buena sin su lectura.

## 15.4 Correcciones por lote

### Lote 1 — A1: imágenes corruptas en la portada (`hero_guardar`, `hero_recomprimir`)

Cambio: la subida falla cerrada. Orden fijo: código de subida → peso → tipo real por contenido
(`imagen_tipo_real`, con `finfo` si existe) → extensión coherente con el contenido
(`imagen_extension_cuadra`) → anchura mínima 800 → tope de lado y píxeles (`IMG_LADO_MAX` 8000,
`IMG_PIXELES_MAX` 20 MP) → decodificador GD disponible para ese formato (`imagen_decodificador`)
→ memoria suficiente (`imagen_cabe_en_memoria`) → decodificación real en `hero_recomprimir`,
con `gd.jpeg_ignore_warning=0` para que un JPEG cortado falle. Sin GD no se guarda ninguna foto
y se dice por qué. Nunca se guarda en crudo; si la decodificación falla se borra el destino. El
recuento del aviso («N fotos subidas… No entraron M: …») sigue saliendo del resultado real.

Pruebas (misma batería en 5411 con GD y en 5407 sin GD; `estado.hero` y disco comprobados tras
cada una; `hero` vuelve a su foto inicial al final):

| caso | con GD | sin GD |
|---|---|---|
| JPG, PNG y WebP válidos 1200×800 (lote de 3) | PASS: «3 fotos subidas. Ya son 4 de 5.», los tres decodifican 1200×800 al pedirlos por HTTP | PASS (cerrado): «Este servidor no puede comprobar imágenes JPG (le falta la extensión GD…)»; nada guardado |
| PNG corrupto con dimensiones absurdas (1455896991×2348852347) | PASS: «demasiado grande para procesarla aquí… 8000 px de lado (20 megapíxeles)»; rechazado antes de decodificar | PASS, mismo mensaje |
| PNG truncado con cabecera válida (900 B de un 1200×800) | PASS: «La imagen está dañada: el servidor no ha podido abrirla entera. No se ha guardado.» | PASS: rechazado por falta de GD |
| JPG con cabecera válida y cuerpo de ceros | PASS: «dañada… No se ha guardado.» (sin `jpeg_ignore_warning=0` GD lo abría) | PASS: rechazado por falta de GD |
| `.jpg` con PNG dentro / `.png` con JPG dentro | PASS: «El archivo se llama .jpg pero dentro lleva una imagen PNG…» | PASS |
| 400 px de ancho | PASS: «Hacen falta 800 como mínimo» | PASS |
| 9000×900 y 5000×5000 (25 MP) | PASS: rechazadas por lado / por píxeles | PASS |
| 1,9 MB y 3,1 MB | PASS: rechazadas por peso (ver lote 4) | PASS |
| `.txt` | PASS: «Eso no es una imagen JPG, PNG o WebP.» | PASS |
| lote mixto válida + corrupta + truncada | PASS: «Foto subida. Ya son 2 de 5. No entraron 2: …» | PASS: «No entraron 3: …» |

Sin ficheros huérfanos ni `.tmp` en `assets/hero/` tras la batería; sin avisos PHP. Con GD el
panel generó además las variantes WebP de la portada (`-480…-1200.webp`): la rama que en la
auditoría quedó BLOCKED por falta de GD queda **verificada localmente**.

Lighthouse lote 1 (panel): móvil 56 / LCP 13.247 ms / CLS 0 (base 56 / 13.224 / 0);
escritorio 89 / 1.708 ms / 0,029 (base 89 / 1.696 / 0,029). Sin cambio.

### Lote 2 — M1: restaurar una copia devuelve SOLO los precios (`restaurar_copia`)

Cambio: `restaurar_copia` sustituye únicamente `$estado['prices']` por los de la copia,
traducidos con `estado_vista()` (una copia anterior a los identificadores permanentes sigue
valiendo; las claves dobles no se duplican). Si los precios de la copia son los de ahora no se
escribe nada («…son los mismos que hay ahora: no hay nada que restaurar»). La copia preventiva
la sigue escribiendo `guardar_estado()` (salta porque cambian los precios). Aviso nuevo:
«Restaurados los precios de la copia del d/m/a: N precio(s) distintos de la carta. Lo demás
(agotados, destacados, ofertas, banner, fotos y marca) sigue como estaba.»

Prueba ordenada (5411): copia C1 creada por un cambio de precios → se modifican DESPUÉS todas
las secciones (marca, reseñas, redes, portada —subida de una foto—, publicidad, oferta,
agotados, destacado, foto de plato, juego) → otro cambio de precios (C2) → restaurar C1.
Resultado: `prices` = precios de C1 (`despuesIgualC1: true`, distintos de los previos:
`antesDistintoC1: true`); las 13 claves restantes del estado (`esquema, soldOut, tags, offer,
reviews, hero, fotos, social, game, review, marca, heroWebp, publicidad`) **idénticas** antes y
después (`cambiadas: []`); copia previa a la restauración escrita. Restaurar la misma copia otra
vez: aviso de «nada que restaurar» y `actualizado` sin tocar. Un guardado ajeno posterior
(juego) no crea copias espurias. Copia sintética con claves legado (`esquema 1`,
`"Appetizers :: Papadum": "9.00"`, más `soldOut`, `tags` y `marca` que NO deben entrar):
`prices` queda `{d_67fbda48e5: 9.00, Appetizers :: Papadum: 9.00, d_e8934d6343: 1.50, …}`,
`soldOut`/`tags`/`marca` intactos, `esquema` sigue en 2. Botón «Restaurar» real con su
confirmación: PASS (precios = copia elegida). La analítica (`admin/datos/`) no vive en el estado.

Lighthouse lotes 2-4 (panel): móvil 56 / 13.201 ms / 0; escritorio 89 / 1.720 ms / 0,029.
Sin cambio frente a la base.

### Lote 3 — M2: el aviso de cambios sin guardar solo con `agotado[]`

Cambio: el oyente `change` del pane de Agotados ignora todo lo que no sea una casilla
`agotado[]` (antes cualquier `change` —el buscador al perder el foco, el selector de foto del
recortador— ponía `sucio = true`).

Pruebas (5411; se lee la tira «· sin guardar» y si `beforeunload` queda armado): escribir en el
buscador y salir del campo → no; abrir/cerrar acordeón → no; filtros → no; `change` del selector
de foto → no; elegir una foto en el recortador (el editor se abre) → no; guardar la foto por el
recortador (POST `foto_accion=subir` OK) → no; quitar la foto → no; marcar una casilla → **sí**
(«3 platos agotados · sin guardar», `beforeunload` armado); desmarcarla → sigue sucio (semántica
de siempre: hubo un cambio). PASS.

### Lote 4 — M3: mensajes de subida comprensibles (`subida_error_texto`, `subida_tope_bytes`, `peso_texto`)

Cambio: los códigos `UPLOAD_ERR_*` se traducen y el tope que se enseña es el efectivo
(`min(tope del panel, upload_max_filesize, post_max_size)`), en MB/KB, sin más configuración.
Aplicado a portada (`hero_guardar`), banner (`subir_banner`) y fotos de plato (`fotos_guardar`).

| caso | resultado |
|---|---|
| portada, 3,1 MB (`UPLOAD_ERR_INI_SIZE`) | PASS: «La foto pesa más de lo que admite este servidor: el máximo es 1 MB. Redúcela y vuelve a subirla.» |
| portada, 1,9 MB | PASS: mismo mensaje (el servidor local ya la corta con `INI_SIZE`; el tope enseñado, 1 MB, es el que aplica) |
| portada sin fichero | el navegador lo impide (`required`); por POST: «No ha llegado ninguna foto.» |
| banner, 3,1 MB | PASS: «La imagen pesa más de lo que admite este servidor: el máximo es 2 MB…» (antes «codigo 1») |
| banner sin fichero | PASS: «Elige primero una imagen.» |
| foto de plato sin fichero | PASS (JSON): «Elige primero una foto.» |
| foto de plato de 4 MB (WebP de ruido) | PASS (JSON): «…el máximo es 500 KB…» |
| `UPLOAD_ERR_PARTIAL`, `NO_TMP_DIR`, `CANT_WRITE`, `EXTENSION` | NO PROBADO: no se pueden provocar desde un navegador; la rama es una tabla de textos, revisada por lectura |

### Lote 5 — M6: 320 px

Cambio: un único `@media (max-width:359px)`: `.adm-rango .adm-campo{width:auto;flex:1 1 0;
min-width:0}` y `.adm-f-cab .der.adm-a-platos{margin-left:0;flex:1 0 100%}`.

Prueba: geometría (`getBoundingClientRect` de las horas, del grupo de periodos y de la
cabecera, y `scrollWidth` de las ocho pestañas) medida ANTES y DESPUÉS a 320, 375, 768, 1280 y
1920. A 320: Ofertas `scrollWidth` 305 = viewport (antes 332), horas de 78 px; Analítica 305
(antes 353), el grupo de periodos baja a su línea. A 375, 768, 1280 y 1920 **todos los valores
son idénticos** a los de antes, pestaña por pestaña. Capturas `lote5-ofertas-320.png` y
`lote5-datos-320.png`. PASS.

### Lote 6 — B1: `dia[]` normalizado

Cambio: `array_unique` + `sort` tras el filtro 1-7. Pruebas por POST: `[1,7,7]` → `[1,7]`;
`[7,3,3,1,0,8,x]` → `[1,3,7]`; los siete → `[1..7]`. Formato (array de enteros) y semántica
intactos. PASS.

### Lote 7 — B2: nombres de copia únicos

Cambio: `AAAA-MM-DD-HHMMSSnn.json` (segundos y contador de dos cifras si el nombre ya existe);
`copias_listar()` admite los nombres nuevos y los viejos (`-HHMM` y solo fecha); la ficha de
Marca enseña `HH:MM:SS` y «(n)» cuando hay varias en el mismo segundo. El orden textual sigue
siendo el temporal (un nombre nuevo del mismo día compara mayor que uno viejo).

Prueba: cuatro cambios de precio en 1,67 s → `…-19241000`, `…-19241001`, `…-19241002` (mismo
segundo, contador), listados «19:24:10», «19:24:10 (2)», «19:24:10 (3)», ninguno pisado (la
cuarta copia cayó por `COPIAS_MAX = 3`, como siempre). Descarga de un nombre nuevo:
`attachment; filename="estado-2026-09-05-19241002.json"`, JSON válido. Restauración de un nombre
nuevo: PASS. Borrado (vaciar): PASS (misma función probada en la auditoría). Nombres viejos y
nuevos listados a la vez y en orden: PASS.

### Lote 8 — B4: accesibilidad y saneamiento

- Cámara: `aria-label` pasa a «Cambiar la foto de <plato>» al guardar y vuelve a «Poner foto a
  <plato>» al quitar, en el momento y sin recargar (probado por el recortador real, con selector
  de fichero). PASS.
- Login: `<label for="clave" class="sr">Contraseña</label>` + `id="clave"`; `input.labels.length
  = 1`, etiqueta oculta (1×1 px), sin `aria-label` redundante, `autocomplete` intacto; la entrada
  con contraseña sigue funcionando; sin referencias JS a `#clave` que pudieran romperse. PASS.
- `record.php`: `strip_tags()` antes de quitar ángulos. «Audit <b>ñ</b>» → «Audit ñ»;
  «<script>x</script>Ana» → «xAna». PASS.
- `role="dialog"` de las ayudas: sin cambios, por orden (primero decidir tooltip o popover).

### Lote 9 — B6: precio canónico único (`motor/gen.mjs`)

Cambio: en `render()` se calcula UNA vez por fila el precio canónico y se deja en
`data-precio-final`; la lista pinta desde ahí, `dsPrecioTexto()` (hoja de búsqueda) lo lee de ahí
y la ficha copia el marcado de la lista. **Precio canónico = precio vigente (el del panel o, si
no hay, el de la carta) con la oferta aplicada solo si el plato se puede pedir.** Un plato
agotado no tiene descuento que anunciar: su precio es el vigente sin rebaja y sin insignia
(antes la lista lo resolvía por CSS y la hoja releía `.price-now`: 12,50 en la lista, 10,00 en la
búsqueda). Consecuencia asumida: el chip «En oferta» de la hoja deja de contar los agotados.
Documentado en `SPEC.md`.

Prueba (oferta del 20 % activa en Aperitivos, Papadum agotado):

| plato | lista | hoja de búsqueda | ficha |
|---|---|---|---|
| 01 Papadum (agotado, categoría en oferta) | `€1.00` sin insignia, `data-precio-final=€1.00` | «Sold out today €1.00» | `€1.00` + «Sold out today» |
| 02 Spicy Papadum (en oferta) | `€0.80` / ~~€1.00~~, insignia «20% off», `data-precio-final=€0.80` | «€0.80» | `€0.80` / ~~€1.00~~ |
| 03 Pickle Tray (en oferta, precio del panel 6,50) | `€5.20` / ~~€6.50~~ | «€5.20» | — |

Igual a 375 y a 1280. Sin errores de consola ni peticiones fallidas. PASS.

## 15.5 Cierre de pruebas pendientes

| prueba | resultado |
|---|---|
| clic real en `#nav-search` (escritorio, 1280) | PASS: visible en la cabecera, abre la hoja con el foco en el campo, resultados coherentes; se cierra con Escape y con el fondo `data-close` |
| apertura real de la ficha del plato | PASS: al tocar una fila con foto (`role="button"`) se abre `.dsheet-panel` con título, foto y precio canónico; el foco va al botón de cerrar |
| cierre de la ficha | PASS con Escape y con el botón de cerrar |
| visualización de alérgenos | **NO APLICA en este cliente**: la carta de Tinge no trae alérgenos por plato (`gen.mjs`: «sin alergenos por plato»; ninguna fila lleva datos de alérgenos). La sección `.dsheet-alergenos` existe, queda vacía y oculta, y no rompe la ficha. No se marca PASS porque no hay nada que mostrar |
| `salir_demo` (docroot demo, `DEMO_SIN_CLAVE=true`, sin `clave.php`) | PASS: el panel abre sin contraseña con «Modo demo: abierto sin contraseña · poner contraseña y salir»; superadmin incorrecta → «La contraseña de superadministrador no es correcta.» (registro «salida de demo rechazada»); contraseña corta → «La contraseña necesita al menos 8 caracteres.»; correcta → se escribe `clave.php`, aparece el login, la nueva contraseña entra y el formulario de demo desaparece |
| variantes WebP de la portada | PASS con GD (5411): `-480/-640/-800/-1000/-1200.webp` generadas al visitar el panel |

Siguen BLOCKED, separados de lo funcional: denegaciones de `.htaccess`, `record.json →
record.php`, `deflate` y HSTS (Apache), y los cuatro códigos de subida no reproducibles.

## 15.6 Verificación final (código de los nueve lotes)

- **Batería administrativa** repetida sobre el docroot final (5411, con GD): Marca (guardado
  completo y rechazo de nombre largo), Publicidad (guardado y fin ≤ inicio), Ofertas (guardado y
  % fuera de rango), Agotados (con hermana), Destacados (añadir, quitar, etiqueta inválida),
  Precios (subida fuera de rango, publicar con un valor malo), Juego, foto de plato
  (`quitar` sin foto), `migrar_estado` (esquema 2), CSRF inválido. Todos los avisos iguales a
  los de la auditoría; `estado.json` releído con los once valores esperados (`marca`, `reviews`,
  `social`, banner, oferta, `soldOut` con hermana, `tags`, `prices` con doble clave, `game`,
  `hero`, `esquema 2`); recarga de Marca con los campos y las insignias de pestaña
  («Precios 1», «Agotados hoy 2», «Destacados 3») coherentes. Sin errores de consola, sin
  peticiones fallidas, sin avisos PHP en pantalla ni en los `error_log`.
- **Dispositivos:** ocho pestañas × 320/375/768/1280/1920 sin desborde horizontal (antes de los
  lotes había dos a 320) y sin avisos PHP.
- **Batería pública** (lote 9 y §15.5, sobre el código final): carga sin errores, idiomas,
  búsqueda por FAB y por `#nav-search`, ficha, agotado, oferta, banner en móvil, portada,
  récord por `record.php`, estado ausente y foto rota (auditoría §7, sin cambios de código en
  esas rutas).
- **Residuos del modo claro tras los cambios:** grep en `1-proyecto` (sin `.git`) y en el build
  de la copia: 0 coincidencias; en el navegador, `localStorage`/`sessionStorage` sin claves de
  tema (`totm-lang`, `totm-hero`, `totm-contada`, `totm-empujon`, `totm-recargada` y los `v:`
  de vistas son de la carta), sin `[data-piel]`/`[data-theme]`, `color-scheme: normal`, fondo
  `#08090A`. **AUSENCIA DE RESIDUOS DEL MODO CLARO: CONFIRMADA.**
- **Build e idempotencia** (copia desechable): dos compilaciones seguidas solo difieren en los
  tres ficheros con sello (`index.html`, `version.json`, `admin/cliente.php`) y, quitado el
  sello, en nada; `verificar-build.mjs`: 61 ficheros obligatorios.
- **Sintaxis:** `php -l` de `index.php` y `record.php`, `node --check gen.mjs`: sin errores.
  `git diff --check`: limpio.

## 15.7 Lighthouse final frente a la línea base (misma configuración, cinco ejecuciones, medianas)

Estado del docroot durante la medición final igualado al de la línea base (una foto de portada
sin variantes WebP, banner con imagen, mismo `index.html`/`version.json`/`cliente.php` del
mismo build, sesión de cliente renovada). La primera medición «final» del día quedó invalidada
(ver §15.8) y se repitió; los informes inválidos se conservan aparte (`lh-final-invalido/`).

| página / perfil | Perf | A11y | BP | SEO | FCP | LCP | CLS | TBT | SI | peticiones | KB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| carta / móvil — base | 69 | 97 | 100 | 92 | 4.434 | 4.952 | 0,090 | 6 | 4.434 | 13 | 915 |
| carta / móvil — **final** | **69** | 97 | 100 | 92 | 4.433 | 4.953 | 0,089 | 5 | 4.433 | 13 | 915 |
| carta / escritorio — base | 99 | 97 | 100 | 92 | 781 | 886 | 0,025 | 0 | 781 | 12 | 900 |
| carta / escritorio — **final** | **99** | 97 | 100 | 92 | 781 | 886 | 0,024 | 0 | 781 | 12 | 901 |
| panel Agotados / móvil — base | 56 | 98 | 100 | 45 | 9.832 | 13.224 | 0,000 | 0 | 9.832 | 9 | 2.267 |
| panel Agotados / móvil — **final** | **56** | 98 | 100 | 45 | 9.821 | 13.222 | 0,000 | 0 | 9.821 | 11 | 2.277 |
| panel Agotados / escritorio — base | 89 | 98 | 100 | 45 | 1.301 | 1.696 | 0,029 | 0 | 1.301 | 9 | 2.267 |
| panel Agotados / escritorio — **final** | **89** | 98 | 100 | 45 | 1.306 | 1.697 | 0,029 | 0 | 1.306 | 11 | 2.277 |

Tiempos en ms. Lectura: ninguna métrica empeora de forma repetible; las diferencias están
dentro del ruido de una misma configuración (≤ 11 ms, ≤ 0,001 de CLS). El panel pesa 10 KB
más (+0,4 %); nada de ello es un cambio de carga. Las comparaciones intermedias (lote 1 y
lotes 2-4, panel) están en §15.4.

> **Corrección (fase 16, §16.13).** La primera redacción de este párrafo explicaba los 10 KB
> diciendo que «el HTML de la pestaña crece con el código PHP añadido en el propio `index.php`
> (que se sirve entero)». **Es falso:** el navegador nunca recibe código PHP, sino el HTML que
> PHP genera, y así lo demuestra la evidencia HTTP de §16.13 (cero apariciones de `<?php` en el
> cuerpo de cualquier respuesta). El desglose real: las dos peticiones de más son
> `assets/banderas/es.webp` (200, 1.159 B) y `assets/banderas/de.webp` (200, 810 B), que pinta el
> podio del juego porque el docroot final tenía dos jugadores en el marcador y el de la línea
> base ninguno — diferencia de **estado**, no de código. Del crecimiento del documento, solo
> **2.695 bytes** son atribuibles al código, medidos sirviendo el mismo docroot con las dos
> versiones del panel; el resto es contenido de más en el docroot final. Detalle completo y
> medición en §16.13.

## 15.7 bis Archivos modificados y comprobaciones de cierre

Compilación canónica en el repositorio al terminar los cambios de fuente: `node motor/lock.mjs
--escribir` («motor.lock escrito | version 1.1.8 | 100 ficheros + 2 envoltorios»), `node gen.mjs`
(«2-subir rehecha | 64 ficheros | build 1788633981179»), `node motor/verificar-build.mjs` («61
ficheros obligatorios verificados»), `node motor/lock.mjs` («motor.lock cuadra»). `2-subir/` y
`generado/` quedan fuera del repositorio (la primera es la carpeta local de subida, sin
desplegar). `git diff --check`: limpio.

```
$ git status --short --untracked-files=all
 M motor.lock
 M motor/gen.mjs
 M motor/server/admin/SPEC.md
 M motor/server/admin/index.php
 M motor/server/admin/record.php
?? auditorias/auditoria-calidad-2026-09-05.md

$ git diff --stat
 motor.lock                    |   8 +-
 motor/gen.mjs                 |  28 +++-
 motor/server/admin/SPEC.md    |  54 ++++++++
 motor/server/admin/index.php  | 300 ++++++++++++++++++++++++++++++++++--------
 motor/server/admin/record.php |   3 +
 5 files changed, 331 insertions(+), 62 deletions(-)

$ git diff --numstat
4	4	motor.lock
23	5	motor/gen.mjs
54	0	motor/server/admin/SPEC.md
247	53	motor/server/admin/index.php
3	0	motor/server/admin/record.php
```

HEAD sigue en `d903dfe`, rama `feature/publicidad-fechas`. `motor.lock` no se editó a mano:
solo lo reescribió el comando canónico. Ningún archivo fuera de la allowlist.

Por archivo: `index.php` — lotes 1, 2, 3, 4, 5, 6, 7 y 8 (cámara y login); `record.php` — lote 8
(`strip_tags`); `gen.mjs` — lote 9; `SPEC.md` — decisiones de los nueve lotes; `motor.lock` —
regenerado. Los diffs por tramo (`acumulado-lotes-1-4.diff`, `lotes-5-8.diff`, `lote-9.diff`)
están en el scratchpad para revertir un lote sin tocar los demás.

## 15.8 Funciones pendientes y riesgos restantes

- Sin corregir por orden expresa (optimización no autorizada): M4 (CLS móvil de la carta), M5
  (peso del panel), B8 (CSS sin consumidor, `--metal-ink`, reglas duplicadas). Siguen en §11.
- B5 (`role="dialog"` de las ayudas): pendiente de decidir tooltip o popover. B7 (`RELEVO.md`
  desactualizado): solo por orden expresa.
- `UPLOAD_ERR_PARTIAL`/`NO_TMP_DIR`/`CANT_WRITE`/`EXTENSION`: textos revisados por lectura, no
  reproducibles desde un navegador.
- Alérgenos por plato: no existen en la carta de Tinge; la ficha los mostraría si existieran
  (sección presente y oculta). Queda sin ejercitar con datos.
- Apache (`.htaccess`, `deflate`, HSTS, `record.json → record.php`): BLOCKED en local.
- Con GD en el hosting, la portada exige ahora que GD abra la imagen entera; sin GD, la portada
  no admite fotos. Es la política pedida (fallar cerrado) y hay que saberlo al desplegar en un
  hosting sin GD.
- `COPIAS_MAX = 3` con nombres por segundo: varios cambios de precio seguidos rotan las copias
  más deprisa que antes (cuatro cambios en dos segundos conservan tres). Es el mismo tope de
  siempre; conviene tenerlo presente.
- Artefactos de medición que NO son defectos del producto: la carta se recarga una vez cuando el
  `build` de `version.json` no coincide con el del `index.html` (guarda `totm-recargada`); un
  docroot de pruebas con ficheros de builds distintos dobla la carga medida. La primera medición
  «final» quedó invalidada por eso y por una sesión caducada del panel (medía el login); se
  repitió con un juego de ficheros coherente y estado equivalente a la línea base.

## 15.9 Nuevos veredictos (justificados)

| Veredicto | Resultado tras la fase correctiva | Justificación |
|---|---|---|
| ADMINISTRADOR | **APTO** con observaciones | A1 y M1 (ALTA) corregidos y reprobados con y sin GD; M2, M3, M6, B1, B2, B4 corregidos y reprobados; la batería administrativa completa vuelve a pasar sin errores de consola, red ni PHP. Quedan abiertos solo puntos no funcionales o pendientes de decisión (M5, B5, B7, B8) |
| MODO OSCURO | **APTO** | sin cambios de paleta; 320 px corregido; contraste y foco como en la auditoría |
| AUSENCIA DE RESIDUOS DEL MODO CLARO | **CONFIRMADA** | re-escaneo tras los cambios: 0 coincidencias; navegador sin claves ni atributos de tema |
| CARTA PÚBLICA | **APTA** con una salvedad | B6 corregido con un precio canónico probado en lista, búsqueda y ficha; clic real de búsqueda en escritorio, apertura y cierre de la ficha probados. La salvedad: la visualización de alérgenos no se puede ejercitar porque este cliente no tiene alérgenos por plato (no es un defecto; queda NO APLICA) |
| LÍNEA BASE LIGHTHOUSE LOCAL | **OBTENIDA** | Lighthouse 13.4.1 en carpeta temporal; línea base antes de tocar código y comparación final con la misma configuración (§15.2, §15.7) |
| APTO PARA OPTIMIZAR | **técnicamente APTO — autorización pendiente del propietario** | no quedan fallos funcionales ALTA ni MEDIA abiertos; M4/M5/B8 son el objeto de esa fase. No se declara autorizada: se espera orden expresa tras la revisión de este informe |

## 15.10 Parada

Sin commit, push, despliegue, FTP ni producción. El árbol de trabajo contiene los cuatro fuentes
de la allowlist modificados, `motor.lock` regenerado por el comando canónico y este informe. Se
espera una nueva orden expresa tras la revisión.

# 16. Validación de escalabilidad multicliente (5-6 de septiembre de 2026)

Fase **exclusivamente de verificación**. Ningún cambio de código: el único fichero del
repositorio que esta sección modifica es este mismo informe. Todo lo demás —cliente ficticio,
builds, imágenes, estados, servidores, repositorios git de prueba— vive en una copia desechable
fuera del repositorio (`scratchpad/fase16/`).

## 16.1 Precondiciones (antes de tocar nada)

```
$ git rev-parse --short HEAD
d903dfe

$ git branch --show-current
feature/publicidad-fechas

$ git status --short --untracked-files=all
 M motor.lock
 M motor/gen.mjs
 M motor/server/admin/SPEC.md
 M motor/server/admin/index.php
 M motor/server/admin/record.php
?? auditorias/auditoria-calidad-2026-09-05.md

$ git diff --check
(sin salida)
```

Exactamente los seis ficheros esperados. Sin `stash`, `reset`, `checkout` ni limpieza en ningún
momento de la fase.

## 16.2 Contrato de `/nuevo-cliente`

Leídos enteros: la skill `.claude/skills/nuevo-cliente/SKILL.md` (router: recoge datos y remite),
el procedimiento canónico `NUEVO_CLIENTE.md` (606 líneas, 13 secciones), la herramienta
`nuevo-cliente.mjs` (758 líneas), `motor/entorno.mjs`, `motor/lock.mjs`, `motor/actualizar.mjs`
(102 líneas) y `motor/transaccion-motor.mjs` (285 líneas).

El alta no es un asistente con banderas opcionales: son **cinco comandos separados**, cada uno
con su efecto y su comprobación, ejecutados siempre desde la raíz de `1-proyecto` de Tinge, que
actúa de semilla y «nunca se modifica».

| Comando | Qué hace | En esta fase |
|---|---|---|
| `--destino` | Copia el motor, escribe `cliente.mjs`, `carta.json` vacío, `server/estado.json`, plantillas i18n, `deploy.yml`, `.gitignore`/`.gitattributes`, `assets/.gitkeep`, y ancla el motor con un `motor.lock` propio. Solo local | **EJECUTADO** (3 veces) |
| `--detectar` | Solo lectura. Falla, no avisa, ante cualquier resto de Tinge | **EJECUTADO** (5 veces) |
| `--build-local` | `importar.mjs` + `gen.mjs` con un hash de activación temporal que borra al terminar | **EJECUTADO** (4 veces) |
| `--publicar-github` | `git init`/commit, `gh repo create --private`, cinco Secrets por STDIN, `DESPLIEGUE_REAL=false`, verificación de vuelta y solo entonces `push` | **NO EJECUTADO — efecto remoto inevitable.** Prohibido por esta fase (nada de repositorios remotos ni GitHub) |
| `--cerrar-activacion` | Sustituye el Secret `PANEL_ACTIVACION_HASH` por 256 bits muertos | **NO EJECUTADO — efecto remoto inevitable** |

`/nuevo-cliente` **existe y se ejecutó de verdad en local**: no se reprodujo el proceso a mano.
Los dos comandos que tocan GitHub quedan fuera por el propio mandato de esta fase, no por
imposibilidad técnica.

## 16.3 Motor frente a datos privados

Clasificación del contrato (`NUEVO_CLIENTE.md` §1, §2, §3, §4), verificada fichero a fichero
sobre el cliente generado.

| Clase | Ficheros | Comprobación en el cliente ficticio |
|---|---|---|
| **Se copia del motor, sin tocar una línea** | `motor/**` (100 ficheros), `gen.mjs`, `importar.mjs`, `server/**`, `.gitignore`, `.gitattributes` | `diff -r` contra la semilla: **idéntico byte a byte**; `motor.lock` con los mismos 100 hashes + 2 envoltorios |
| **Se genera nuevo para este cliente** | `cliente.mjs`, `carta.json`, `i18n.<code>.mjs`, `server/estado.json`, `.github/workflows/deploy.yml`, `assets/.gitkeep`, `motor.lock` | Todos presentes, con el slug, la URL, el impuesto, la zona horaria y el corte propios |
| **Nunca se hereda** | `admin/clave.php`, `admin/superclave.php`, `admin/intentos.json`, `admin/accesos.log`, `estado.json` de otro, `record.json`, `admin/marcador.json`, `admin/canjes.json`, `assets/hero/**`, `assets/platos/**`, `admin/copias/**`, `admin/datos/**`, `carta.json` ajeno, cualquier `dishId`/`categoryId`/`recipeId`, el slug y el secreto del juego, `PANEL_ACTIVACION_HASH` | **Ninguno aparece** en el cliente generado (comprobado por listado y por `--detectar`) |

Pureza del motor comprobada al revés: en `motor/**` las apariciones de «Tinge» son **dos
ficheros y solo en comentarios** (`gen.mjs`, `contrato-salida.mjs`), nunca datos. Todo lo propio
del restaurante llega al panel por `admin/cliente.php`, que genera el build:

```
vacio_qa:  CLIENTE_SLUG "vacio_qa"  CLIENTE_TZ "Europe/Madrid"  CLIENTE_CORTE_HORA 4
           CLIENTE_JUEGO false  CLIENTE_PUBLICIDAD false  CLIENTE_COLOR_PRINCIPAL "#FF7517"
ambar_qa:  CLIENTE_SLUG "ambar_qa"  CLIENTE_TZ "Europe/Madrid"  CLIENTE_CORTE_HORA 5
           CLIENTE_JUEGO true   CLIENTE_PUBLICIDAD true   CLIENTE_COLOR_PRINCIPAL "#E0A93B"
```

## 16.4 Creación del restaurante ficticio

```bash
node nuevo-cliente.mjs \
  --destino "<scratchpad>/fase16/clientes/ambar_qa" \
  --nombre  "Restaurante Ámbar QA" \
  --url     "https://socialcard.es/ambar_qa/" \
  --idiomas es,en --impuesto "IVA incluido" \
  --alergenos-en-origen si --zona-horaria "Europe/Madrid" --corte-hora 5 \
  --juego true --publicidad true --color-principal "#E0A93B"
```

Salida: `motor.lock escrito | version 1.0.0 | 100 ficheros + 2 envoltorios`.

Se crearon **tres** clientes desechables, todos claramente distintos de Tinge:

| Cliente | Para qué | Idiomas | Alérgenos en origen |
|---|---|---|---|
| `ambar_qa` — «Restaurante Ámbar QA» | Cliente principal: fixture de alérgenos, matriz del panel, aislamiento, actualizador | es (base) + en | `si` |
| `vacio_qa` — «Cafetería Vacío QA» | Cliente mínimo: build y carta con un solo plato, sin juego ni publicidad | es | `no` |
| `tercero_qa` — «Tercero QA» | Prueba aislada de que `--destino` no escribe en su origen | es | `no` |

Estado inicial del cliente recién creado, comprobado uno a uno:

| Requisito | Resultado |
|---|---|
| Configuración propia (`cliente.mjs`) | **PASS** — slug, rótulos, URL, impuesto, zona horaria, corte, moneda y funciones propios; `activacionPanel: true` |
| Carta vacía definida por el contrato | **PASS** — `{"esquema":"carta/2","noPublicable":true,"pestanas":[]}` |
| `estado.json` nuevo | **PASS** — `soldOut {}`, `tags {}`, `prices {}`, `offer.on false`, `review.url ""`, `actualizado null` |
| Identificadores propios | **PASS** — `importar.mjs` acuñó 8 identificadores nuevos (`c_`/`d_` + hex) al escribir la carta; ninguno de Tinge |
| Carpetas de imágenes vacías | **PASS** — solo `assets/.gitkeep`; `hero/`, `platos/` y `publicidad/` las crea el panel al subir la primera |
| Copias vacías | **PASS** — `admin/copias/` no existe hasta el primer cambio de precios |
| Registros y analítica vacíos | **PASS** — sin `accesos.log`, sin `intentos.json`, sin `record.json`, sin `admin/datos/`; la pestaña Analítica dice «Todavía no hay ningún dato» |
| Sin contraseña heredada | **PASS** — no hay `clave.php` ni `superclave.php`; el panel pide **token de activación**, no contraseña |
| Sin sesiones ni secretos | **PASS** — `activacion.php` solo existe si el build recibe `PANEL_ACTIVACION_HASH`; `--build-local` lo borra siempre al terminar |
| Sin datos comerciales de Tinge | **PASS** — ver 16.5 |

## 16.5 Búsqueda de contaminación

`--detectar` sobre el cliente terminado, con su build y su estado real ya cargados:

```
--detectar: limpio. Sin restos de Tinge en 79 fichero(s) revisados.
```

Búsqueda manual, además del detector, sobre `cliente.mjs`, `carta.json`, `i18n.*.mjs`, `assets`,
`.github`, `menu.md`, `server/` y el docroot entero (build + estado + fotos + copias):

| Término buscado | Ficheros con coincidencia |
|---|---|
| `Tinge` | 0 |
| `Tinge of Turmeric` | 0 |
| `Papadum` | 0 |
| `Spicy Papadum` | 0 |
| `Pickle Tray` | 0 |
| `turmeric`, `totm`, `socialcard.es/tinge` | 0 |

Dominios, teléfonos, redes, enlaces de reseñas, imágenes, precios, ofertas, destacados e
identificadores: todos los del cliente nuevo son suyos. La URL es `https://socialcard.es/ambar_qa/`;
las claves de navegador llevan su propio prefijo (`ambar_qa-hero`, `ambar_qa-lang`,
`ambar_qa-contada`), nunca `totm-`; el `.htaccess` del servidor apunta a `/ambar_qa/`:

```
ErrorDocument 404 /ambar_qa/404.php      (Tinge: /tinge_of_turmeric/menu2/404.php)
RewriteBase     /ambar_qa/               (Tinge: /tinge_of_turmeric/menu2/)
RewriteBase     /ambar_qa/admin/
RewriteRule .   /ambar_qa/404.php [L]
```

**Chilli Rush** no se cuenta como contaminación: `NUEVO_CLIENTE.md` §1 y el catálogo de
`nuevo-cliente.mjs` lo declaran función **del motor**, no del restaurante («el minijuego Chilli
Rush entero (es del MOTOR, no del restaurante)»), y `cliente.mjs` lo enciende o lo apaga por
cliente con `funciones.juego` — `vacio_qa` se creó con `--juego false` y su carta no lo lleva.

**Residuo encontrado, de documentación (E4, BAJA):** en `server/.htaccess` (3 veces) y
`server/LEEME-SERVIDOR.txt` (2 veces) sobreviven menciones a `menu2/`, la carpeta de Tinge,
dentro de comentarios y ejemplos. Las líneas **funcionales** sí se sustituyen. `--detectar` no
las ve porque `server/**` no está en su lista de rutas del cliente (`RUTAS_EN_PROYECTO`).

## 16.6 Aislamiento bidireccional, demostrado con hashes

Método: SHA-256 de todos los ficheros privados de cada cliente (fuente: `cliente.mjs`,
`carta.json`, `i18n.*`, `motor.lock`, `assets/**`, `server/**`; servidor: `estado.json`,
`record.json`, `admin/**` con claves, registros, copias y datos), en tres momentos.

| Momento | Qué se hizo entre uno y otro |
|---|---|
| **T0** | Los dos clientes recién creados, antes de tocar nada |
| **T1** | Se modificó **solo Ámbar QA**: marca (nombre, rótulo, color, reseñas, redes), carta (6 platos con alérgenos), precios (+5 % y cuatro publicaciones), oferta, agotados, destacados, publicidad con imagen, foto de portada y foto de plato |
| **T2** | Se modificó **solo Tinge**: contraseña nueva, un agotado, el rótulo de marca y una subida de precios del +10 % (293 precios) |

Resultado:

```
T0 -> ambar 76 ficheros | tinge 78 ficheros
T1 -> ambar 86 ficheros | tinge 78 ficheros
T2 -> ambar 86 ficheros | tinge 83 ficheros

TINGE  T0 vs T1: IDENTICO — ningún fichero privado de Tinge cambió al trabajar sobre Ámbar QA
AMBAR  T1 vs T2: IDENTICO — ningún fichero privado de Ámbar QA cambió al trabajar sobre Tinge
```

Y, como control de que las pruebas no fueron vacías, los ficheros que **sí** cambiaron en cada
tramo:

```
Ambar (T0->T1): accesos.log, activacion.consumida, activacion.php, clave.php, copias/.htaccess,
                copias/2026-09-06-00261201.json, copias/2026-09-06-00261202.json,
                copias/2026-09-06-00273200.json, intentos.json, marcador.json, estado.json,
                record.json                                     (14 líneas de diferencia)
Tinge (T1->T2): accesos.log, clave.php, copias/.htaccess,
                copias/2026-09-05-23322300.json, intentos.json, estado.json
```

Revisado en concreto, y separado en los dos clientes: configuración, carta, `server/estado.json`,
credenciales, imágenes (`assets/hero`, `assets/platos`, `assets/publicidad`), copias, registros
(`accesos.log`, `intentos.json`), analítica y marcador, rutas de escritura y ficheros temporales.
Cada cliente escribe **solo bajo su propio docroot**; no hay una sola ruta compartida.

**Aislamiento bidireccional: PASS.**

## 16.7 El cliente vacío

`--build-local` sobre el cliente recién creado, con la carta como la deja `--destino`:

```
carta.json lleva la marca noPublicable: es una carta de ejemplo, no la del
restaurante. Escribe la carta de verdad y quita la marca.
```

Quitada la marca, con `pestanas: []`:

```
carta.json: falta la lista `pestanas` o está vacía.        (exit 1)
```

**Dos puertas que fallan cerradas, en cascada y a propósito.** Consecuencia honesta: una carta
**literalmente vacía no compila**, por diseño. El mínimo publicable es una pestaña con un grupo
y un plato, y eso es lo que se probó con `vacio_qa`:

| Comprobación | Resultado |
|---|---|
| Build correcto | **PASS** — `2-subir rehecha \| 59 ficheros \| 1 dishes \| 1 tabs \| 1 categories \| sin alergenos por plato` |
| `verificar-build.mjs` | **PASS** — `build completo \| 61 ficheros obligatorios verificados` |
| `motor.lock` válido | **PASS** — `motor.lock cuadra \| 100 ficheros del motor + 2 envoltorios \| esquema estado 2 \| esquema carta carta/2` |
| Sintaxis PHP | **PASS** — `php -l` sobre los 10 `.php` del build: sin errores |
| Sintaxis JavaScript | **PASS** — `node --check gen.mjs`, `node --check importar.mjs` |
| Dos builds seguidos idempotentes | **PASS** — solo difieren `index.html`, `version.json` y `admin/cliente.php`; neutralizado el sello de build, **0 líneas** distintas en los tres |
| Carta pública mínima funcional | **PASS** — título `Cafetería Vacío QA — Carta`, un plato «Café solo €1.30», pie con el aviso de alérgenos, sin juego (`funciones.juego false`) |
| Sin huecos rotos ni datos de Tinge | **PASS** en el contenido; **FAIL parcial** por E1 (favicon, ver 16.12) |
| Administrador accesible | **PASS** — pide token de activación |
| 404 | **PASS** — `/ruta-inventada` sirve la página de error con la carta |
| Consola | **FAIL** — un único error, siempre el mismo: `404 /assets/titleIcon-accent.svg` (E1) |
| Red | igual: una petición fallida por carga, la del favicon |
| Logs PHP | **PASS** — sin avisos ni errores en los servidores bien provisionados |

## 16.8 Matriz del administrador del cliente nuevo

Navegador real (Playwright) contra el docroot del cliente ficticio. Cuatro servidores PHP 8.4.24
sobre el mismo docroot, para separar lo que depende del hosting:

| Puerto | Extensiones | `upload_max_filesize` | Para qué |
|---|---|---|---|
| 5511 | gd + mbstring | 8M | Matriz principal |
| 5513 | mbstring (**sin GD**) | 8M | Política de imágenes sin GD |
| 5517 | gd + mbstring | **2M** | Mensajes de límite de subida |
| 5519 | gd + mbstring | 8M | Copia con `DEMO_SIN_CLAVE = true` |

### Acceso, activación y sesión

| Prueba | Resultado | Evidencia |
|---|---|---|
| Primera visita | **PASS** | «Este panel necesita el token de activación que se generó al dar de alta este cliente. Se usa una sola vez.» — pide token, **no** ofrece poner contraseña a secas |
| Token incorrecto | **PASS** | «El token de activación no es correcto.» No se crea `clave.php` ni `activacion.consumida` |
| Token correcto + contraseña corta | **PASS** | Rechazada, y **el token no se consume**: la activación posterior con el mismo token funciona |
| Token correcto + contraseña válida | **PASS** | Se escriben `clave.php` y `activacion.consumida`; `activacion.php` se reescribe con un valor de 256 bits **distinto** del hash real (comprobados los dos hexadecimales, no coinciden) |
| Contraseña incorrecta | **PASS** | «Contraseña incorrecta.» |
| Login correcto | **PASS** | Ocho pestañas: agotados, destacados, ofertas, precios, juego, publicidad, datos, marca |
| Etiqueta accesible del login | **PASS** | `<label for="clave" class="sr">Contraseña</label>`, `autocomplete="current-password"`, sin `aria-label` duplicado (lote 8) |
| CSRF inválido | **PASS** | POST con `csrf=no-vale` para apagar el juego: `game.on` sigue `true` antes y después |
| Salir | **PASS** | `?salir=1` devuelve a «ACCESO PRIVADO» |
| `salir_demo` | **PASS** | En la copia con `DEMO_SIN_CLAVE=true` entra sin contraseña; `clave_nueva` corta → «La contraseña necesita al menos 8 caracteres»; contraseña válida → el panel vuelve a pedir contraseña (demo cerrado) |

### Pestañas

| Pestaña | Prueba | Resultado |
|---|---|---|
| Agotados | Marcar dos platos y guardar | **PASS** — «Guardado: 2 plato(s) agotados. Se limpia solo mañana a las 5:00.» (corte 5, el de **este** cliente; Tinge dice 6:00) |
| Agotados | Insignia de la pestaña | **PASS** — «Agotados hoy2» |
| Destacados | Buscar plato, elegir sugerencia, etiquetar y añadir | **PASS** — «Destacado añadido», insignia «Destacados1», `tags` con doble clave |
| Ofertas | 15 %, 09:00-23:30, días L/X/V, una categoría, encendida | **PASS** — «Oferta guardada y encendida: 15% de 09:00 a 23:29.» |
| Ofertas | Descuento fuera de rango con la oferta encendida | **PASS** — «El descuento tiene que estar entre 1 y 90», `percent` sigue en 20 |
| Precios | +5 % y publicar | **PASS** — «Publicado: 6 precio(s) distintos de la carta.» |
| Precios | Atajos disponibles | +3 %, +5 %, +10 %, +15 % y «A mano, uno a uno» |
| Juego | Encender y apagar | **PASS** — «El juego no sale en la carta» / «El juego sale en la carta» |
| Publicidad | Subir imagen de banner | **PASS** — «Imagen guardada. El banner esta desactivado.» |
| Publicidad | URL, fechas y encendido | **PASS** — «Guardado. El banner esta activo.» |
| Publicidad | Fin ≤ inicio | **PASS** — «El fin del banner tiene que ser DESPUES del inicio. No se ha guardado nada.» |
| Analítica | Cliente sin datos | **PASS** — «Todavía no hay ningún dato. El contador empieza la próxima vez que alguien abra la carta…» |
| Marca | Nombre, rótulo, color, nota de Google, redes | **PASS** — «Guardado. Al final de la carta sale la nota de Google.» |
| Marca | Copias de seguridad | **PASS** — «3 de 3», listadas, con Descargar y Restaurar |

Tras la batería, `estado.json` del cliente nuevo tiene **16 claves** con datos propios:
`esquema, soldOut, tags, offer, prices, reviews, hero, fotos, social, game, review, marca,
actualizado, theme, heroWebp, publicidad`.

### Las nueve correcciones de la fase 15, reprobadas sobre el cliente nuevo

| Lote | Prueba en Ámbar QA | Resultado |
|---|---|---|
| 1 (A1) | JPG válida **con GD** | **PASS** — «Foto subida. Ya son 1 de 5.» |
| 1 | PNG con cabecera válida y cuerpo truncado | **PASS** — «La imagen está dañada: el servidor no ha podido abrirla entera. No se ha guardado.» |
| 1 | `.jpg` que por dentro es PNG | **PASS** — «El archivo se llama .jpg pero dentro lleva una imagen PNG. Guárdalo con su extensión de verdad y vuelve a subirlo.» |
| 1 | 9000 × 900 px | **PASS** — «La foto mide 9000 × 900 px: demasiado grande para procesarla aquí. Redúcela por debajo de 8000 px de lado (20 megapíxeles)…» |
| 1 | Fichero de texto renombrado | **PASS** — «Eso no es una imagen JPG, PNG o WebP.» |
| 1 | **Sin GD**, imagen válida | **PASS** — «Este servidor no puede comprobar imágenes JPG (le falta la extensión GD con ese formato). Por seguridad no se guarda ninguna foto sin comprobar: avisa a quien lleva el hosting.» |
| 1 | **Sin GD**, estado tras el rechazo | **PASS** — `hero`, `heroWebp` y `actualizado` idénticos byte a byte antes y después |
| 2 (M1) | Restaurar una copia después de cambiar marca, oferta y juego | **PASS** — «Restaurados los precios de la copia del 06/09/26: 6 precio(s) distintos de la carta. Lo demás (agotados, destacados, ofertas, banner, fotos y marca) sigue como estaba.» Cambian **solo** `prices` y `actualizado`; las otras **14 claves** quedan idénticas |
| 3 (M2) | Escribir en el buscador de Agotados | **PASS** — recargar la página no lanza ningún diálogo |
| 3 | Marcar un `agotado[]` de verdad | **PASS** — recargar lanza `beforeunload` |
| 4 (M3) | Portada de 3,2 MB con tope de servidor 2M | **PASS** — «El servidor ha rechazado el envío por tamaño: no acepta más de 2M por envío. Sube una foto más ligera.» |
| 4 | Banner de 3,2 MB con el mismo tope | **PASS** — mismo texto, para el banner |
| 5 (M6) | 320 px | **PASS** — ver más abajo |
| 6 (B1) | `dia[]` = 5, 2, 5, 2, 9, 0, 7, 2 | **PASS** — guardado `days: [2, 5, 7]`: sin repetidos, ordenado y sin valores fuera de 1-7 |
| 7 (B2) | Cuatro publicaciones de precios seguidas | **PASS** — `2026-09-06-00261200.json`, `…01.json`, `…02.json`: tres copias en **el mismo segundo**, sin pisarse. La lista de Marca las muestra como «domingo 06/09/26 · 00:26:12», «… (2)» y «… (3)» |
| 8 (B4) | `aria-label` de la cámara | **PASS** — «Poner foto a Croquetas de ámbar» → «Cambiar la foto de Croquetas de ámbar» **sin recargar** |
| 8 | `record.php` | **PASS** — nombre enviado `<b>Ana</b><script>x</script> <i>QA` → guardado `Anax QA`; sin etiquetas ni ángulos en `record.json` |
| 9 (B6) | Precio canónico | **PASS** — ver 16.9 |

### Anchos

Ocho pestañas × cinco anchos, con sesión abierta y las ocho `section.pane` presentes:

| Ancho | Panel | Carta |
|---|---|---|
| 320 px | sin desborde horizontal, pestaña correcta en las 8 | sin desborde |
| 375 px | idem | sin desborde |
| 768 px | idem | sin desborde |
| 1280 px | idem | sin desborde |
| 1920 px | idem | sin desborde |

Navegación, menú lateral, formularios, ayudas, modales (recorte de foto, ficha de plato), foco,
teclado (Escape cierra ficha y buscador) y contraste: sin incidencias. Errores de consola: solo
el 404 del favicon (E1). Red: solo esa petición fallida. Logs PHP de los servidores bien
provisionados: **vacíos**.

## 16.9 Fixture de alérgenos y precio canónico

Tinge no declara alérgenos plato a plato, así que la visualización quedó **NO APLICA** en §15.9.
El motor sí tiene que soportarlos, y aquí se ejercita con datos sintéticos, **sin tocar el
motor**: solo `carta.json` del cliente ficticio, escrito según el esquema documentado
(`carta/2`, campo `alergenos` por plato, claves canónicas de `motor/alergenos.mjs`).

| Elemento pedido | Qué se creó |
|---|---|
| Dos categorías ficticias | «Entrantes» (icono `appetizers`) y «Carnes y pescados» (icono `fish`), en dos pestañas con icono propio |
| Varios platos ficticios | Seis, numerados 01-06, con nombre y descripción en los dos idiomas |
| Plato con alérgenos verificados | 01 Croquetas de ámbar → `cereals_gluten`, `milk`, `eggs`; 03 Tabla de quesos → `milk`, `nuts`; 04 Lubina → `fish`; 06 Arroz de marisco → `crustaceans`, `molluscs`, `sulphites` |
| Plato sin alérgenos | 02 Ensalada de temporada, 05 Solomillo QA |
| Plato con `mayContain` | **NO APLICA — el contrato no lo admite.** `mayContain`, «puede contener» y «trazas de» no existen en ningún fichero de `motor/`: el esquema solo tiene `alergenos` como lista de claves canónicas |
| Plato agotado | 02 y 03, marcados desde el panel |
| Oferta activa | 15 % sobre la categoría «Entrantes», todos los días, 00:00-23:59 |
| Destacado | 05 Solomillo QA con la etiqueta «Signature» |
| Imágenes ficticias válidas | Portada 1200×800 JPG (con sus 5 variantes WebP), banner 1120×480 PNG, fotos de plato 600×600 en 01 y 05 |

Build: `6 dishes | 2 tabs | 2 categories | 6 items | 4 con alergenos declarados`, y con
`enOrigen: 'si'` el motor exige al menos un plato declarado (probado: con la carta vacía, aborta).

| Comprobación en la carta | Resultado |
|---|---|
| Visualización de alérgenos en la lista | **PASS** — 01: Gluten, Lácteos, Huevo · 03: Lácteos, Frutos secos · 04: Pescado · 06: Crustáceos, Moluscos, Sulfitos |
| Iconos y textos correctos | **PASS** — `<span class="alergeno" role="img" aria-label="…">` con el SVG del catálogo oficial (`motor/iconos/alergenos-oficiales/`) |
| Ficha del plato con alérgenos | **PASS** — «Croquetas de ámbar», precio €5.82, tres iconos junto al título |
| Sección oculta cuando el plato no tiene alérgenos | **PASS** — ficha de «QA sirloin»: 0 iconos, `.dsheet-alergenos` con `hidden` |
| Búsqueda | **PASS** — «lubina» → «1 PLATO / 04 / Lubina al horno / Principales / €18.90» |
| Filtros habilitados por configuración | **PASS** — el buscador ofrece «On offer» y una ficha por etiqueta de destacado; «On offer» → 1 plato (€5.82), «Signature» → 1 plato (€22.60). **Filtro por alérgeno: NO APLICA**, el motor no lo tiene |
| Lista, búsqueda y ficha con el mismo precio | **PASS** — 01: lista €5.82 = búsqueda €5.82 = ficha €5.82; 05: €22.60 en los tres sitios; 04: €18.90 en lista y búsqueda |
| Errores de consola y red | **PASS salvo E1** — la única petición fallida en toda la carta es el favicon (16.12) |
| Idiomas admitidos | **PASS** — en inglés: `<title>Ámbar QA Restaurant — Menu`, «Amber croquettes», «Sold out today», «VAT included», y los alérgenos cambian de idioma por `data-en-label`/`data-es-label` (Lácteos↔Dairy, Frutos secos↔Nuts) |

Además, lote 9 sobre datos nuevos: el plato **agotado y en una categoría con oferta** conserva su
precio íntegro (02: `data-precio-final` €7.55; 03: €10.30), mientras el plato en oferta **no**
agotado sí lo rebaja (01: €5.82 sobre €6.85). El indicador «Agotado hoy» y la insignia «15% dto.»
siguen saliendo.

**Alérgenos a nivel del motor: PASS.** A nivel de Tinge se mantiene **NO APLICA — este cliente
no tiene alérgenos por plato**.

## 16.10 Actualización segura del motor

Procedimiento canónico: `motor/actualizar.mjs --desde <carpeta con motor/ y motor.lock>`, con el
núcleo transaccional en `motor/transaccion-motor.mjs` (máquina de estados NUEVA → PREPARADA →
APLICANDO → APLICADA_NO_CONFIRMADA → CONFIRMADA, con `rollback()` válido en los tres estados
anteriores al commit y un recinto de escritura que solo admite `motor/**`, `motor.lock`,
`gen.mjs`, `importar.mjs` y las carpetas de trabajo de la propia transacción).

Origen de prueba: copia del motor actual con un comentario añadido a `motor/banderas.mjs` y su
propio lock reescrito a la versión **1.2.0**. Destino: copias desechables del cliente ficticio,
cada una con su `git init` + commit inicial (el actualizador exige árbol limpio).

**Actualización válida**

```
actualizando motor 1.0.0 -> 1.2.0
ficheros con cambios: 1
  ~ motor/banderas.mjs
 motor.lock         | 4 ++--
 motor/banderas.mjs | 2 ++
```

| Comprobación | Resultado |
|---|---|
| Solo cambian ficheros comunes autorizados | **PASS** — `git status`: `M motor.lock`, `M motor/banderas.mjs`, nada más |
| Configuración, carta, estado, contraseña, imágenes, copias, registros y analítica intactos | **PASS** — 10 ficheros de datos privados, hashes SHA-256 **idénticos** antes y después |
| Lock coherente tras actualizar | **PASS** — `motor.lock cuadra \| version 1.2.0 \| 100 ficheros + 2 envoltorios` |
| Carpetas de trabajo residuales | **PASS** — ninguna `.motor.nueva-*` / `.motor.anterior-*` |
| El cliente sigue compilando | **PASS** — `importar` + `gen` + `verificar-build`: `62 ficheros`, `61 ficheros obligatorios verificados` |

**Fallo intermedio y vuelta atrás** — el actualizador documenta la prueba con
`MOTOR_FALLO_PRUEBA`, que lanza un error justo después de cada mutación. Probados tres puntos:

| Punto de fallo | Mensaje | Árbol (126 ficheros) | `git status` | Residuos |
|---|---|---|---|---|
| `tras-m1` | «LA ACTUALIZACION FALLO Y SE HA DESHECHO ENTERA: FALLO SIMULADO tras-m1 (prueba)» | **idéntico byte a byte** | limpio | ninguno |
| `tras-m3` | idem `tras-m3` | **idéntico byte a byte** | limpio | ninguno |
| `tras-m5` | idem `tras-m5` | **idéntico byte a byte** | limpio | ninguno |

**Actualización segura del motor: PASS**, incluida la vuelta atrás sin actualización parcial.

## 16.11 Modo visual

Modo oscuro único; no se ha implementado ni propuesto modo claro.

| Comprobación | Panel del cliente nuevo | Carta del cliente nuevo |
|---|---|---|
| Fondo | `rgb(8, 9, 10)` | `rgb(18, 18, 18)` |
| Texto | `rgb(246, 244, 244)` | — |
| `color-scheme` | `normal` | `normal` |
| `data-theme` / `data-piel` | ausentes | ausentes |
| Controles de cambio de tema | **0** | **0** |
| Foco visible | **PASS** — anillo `0 0 0 3px` en los campos, medido tras la transición | — |
| Botón principal | usa el color de marca **del cliente** (`#B5651D` tras cambiarlo desde Marca) | — |
| Tablas, modales, ayudas, hover/active/disabled/error | revisados en las ocho pestañas y los cinco anchos, sin incidencias | — |
| Claves de tema en `localStorage`/`sessionStorage` | `ambar_qa-hero`, `ambar_qa-contada`, `ambar_qa-lang`, `v:73abd8e7` — **ninguna de tema**, y todas con el prefijo de ESTE cliente | igual |

Barrido de residuos del modo claro sobre las fuentes del cliente nuevo y sobre su build
(`data-piel`, `data-theme`, `prefers-color-scheme: light`, «modo claro», `tema-claro`,
`theme-light`, `light-mode`, `.light`, `piel-clara`, conmutadores de tema):

```
clientes/ambar_qa/1-proyecto : 0 coincidencias
docroots/ambar (build+estado): 0 coincidencias
prefers-color-scheme en el build: ninguna aparición
```

**MODO OSCURO: APTO. AUSENCIA DE RESIDUOS DEL MODO CLARO: CONFIRMADA** también en un cliente
nacido hoy.

## 16.12 Defectos encontrados (documentados, no corregidos)

Esta fase no corrige nada. Los cinco hallazgos, por severidad:

**E1 — MEDIA. Todo cliente nuevo sirve un 404 en cada página: falta `assets/titleIcon-accent.svg`.**
`motor/gen.mjs` (línea 1550), `motor/juego.mjs` (64) y `motor/error404.mjs` (80) escriben
`<link rel="icon" type="image/svg+xml" href="assets/titleIcon-accent.svg">`. Ese fichero es de
`assets/`, que el contrato declara **propiedad del cliente** y que `--destino` deja vacía a
propósito. Tinge lo tiene porque se lo pusieron a mano hace tiempo; un cliente nuevo, no.
Barrido de todas las referencias a `assets/` del build del cliente ficticio: **14 existen, 1
falta, y es esa**. `verificar-build.mjs` no lo detecta (verifica 61 ficheros obligatorios y este
no está en el contrato de salida). `NUEVO_CLIENTE.md` no lo menciona en ninguna de sus 606
líneas. Efecto medido: `404 /assets/titleIcon-accent.svg` en la carta, en el juego y en la
página de error, una petición fallida y un error de consola **por cada carga**, en los dos
clientes nuevos creados hoy.

**E2 — ALTA condicionada al hosting. `mbstring` sin guarda: el panel se corta a la mitad.**
El propio código reconoce que la extensión puede faltar —comentario en `index.php:1202`, «depende
de la extension mbstring. No siempre esta activada»— y protege dos usos con `function_exists`
(`index.php:1207` y `1216`). Otros cinco **no** están protegidos:

```
motor/server/admin/index.php:2168   mb_substr   (mensaje de fallo de subida)
motor/server/admin/index.php:6671   mb_strtoupper(mb_substr(...))  (iniciales de los días de la oferta)
motor/server/admin/index.php:7503   mb_substr   (día de la semana en Analítica)
motor/server/admin/record.php:171   mb_strtolower
motor/server/admin/record.php:179   mb_strlen / mb_substr
```

Reproducido de verdad en esta fase, sobre el cliente nuevo, con un PHP sin `mbstring`:

```
PHP Fatal error: Uncaught Error: Call to undefined function mb_strtoupper()
                 in .../admin/index.php:6671
```

El panel se renderiza hasta la pestaña Ofertas y **muere ahí**: llegan las 8 pestañas de la barra
pero solo **3 de las 8 `section.pane`**; Precios, Juego, Publicidad, Analítica y Marca no existen
en el HTML, sin ningún mensaje de error visible. `record.php` cae igual al guardar un nombre. El
defecto es previo a la fase correctiva: la misma línea está en `d903dfe`.
`RELEVO.md` documenta la ausencia de `mbstring` como peculiaridad del PHP local, pero **ningún
documento la declara requisito del hosting**.

**E3 — BAJA. El `motor.lock` de un cliente nuevo dice `version 1.0.0`.**
`nuevo-cliente.mjs` termina con `node motor/lock.mjs --escribir` sin `--version`, y `lock.mjs`
cae a `anterior?.version ?? '1.0.0'`: como el cliente nuevo no tiene lock previo, se queda en
1.0.0 aunque los 100 hashes sean los del motor 1.1.8. Consecuencias: la última casilla de la
lista de comprobación de `NUEVO_CLIENTE.md` §13 —«`motor.lock` del cliente nuevo idéntico al de
Tinge»— **no puede cumplirse nunca** (difieren en esa línea, y solo en esa), y `actualizar.mjs`
anuncia «actualizando motor 1.0.0 -> 1.2.0» partiendo de una versión que no es la instalada.
Integridad no afectada: los hashes sí cuadran.

**E4 — BAJA. `--detectar` no mira `server/**`, y ahí quedan restos de la carpeta de Tinge.**
`RUTAS_EN_PROYECTO` cubre `cliente.mjs`, `carta.json`, `assets`, `.github`, `menu.md`, `generado`,
los `i18n.*` y `2-subir`; **no** `server/`, que sí se copia entero desde la semilla. La
sustitución de rutas de `--destino` arregla las líneas funcionales (comprobado), pero deja cinco
menciones a `menu2/` en comentarios y ejemplos: 3 en `server/.htaccess` y 2 en
`server/LEEME-SERVIDOR.txt`. No afecta al funcionamiento; sí a la promesa de «cero resultados».

**E5 — BAJA. Un porcentaje de oferta imposible se guarda si la oferta está apagada.**
La validación `1..90` de `guardar_oferta` solo corre cuando `oferta_on` está marcado. Un POST
sin `oferta_on` y con `pct=950` deja `offer.percent = 950` escrito en `estado.json`. La carta no
lo aplica (la oferta está apagada) y el intento de encenderla se rechaza con «El descuento tiene
que estar entre 1 y 90», así que el efecto real es un fichero que miente, no un precio malo.

**Observación menor (no defecto):** el anillo de foco del panel usa el naranja de fábrica
`rgba(255,117,23,.22)`, no el color de marca del cliente, mientras que los botones sí lo usan.
Es coherente si el foco se considera cromo del motor; queda anotado por si se quiere unificar.

## 16.13 Protección de PageSpeed

Esta fase no modifica ninguna fuente, así que no debería alterar PageSpeed. Comprobado, no
supuesto.

**Tinge no ha cambiado.** SHA-256 de todos los ficheros, antes de empezar la fase y al terminarla:

| Conjunto | Ficheros | Resultado |
|---|---|---|
| `tinge_of_turmeric/1-proyecto` (sin `.git`) | 141 | **IDÉNTICO** |
| `tinge_of_turmeric/2-subir` (el build) | 64 | **IDÉNTICO** |

**`/nuevo-cliente` no escribe en su origen.** Prueba aislada: copia limpia de `1-proyecto`,
hash de sus 141 ficheros, `--destino` + `--detectar` + `--build-local` de un tercer cliente, y
hash otra vez:

```
la semilla tras --destino/--detectar/--build-local: IDENTICA byte a byte (141 ficheros)
```

Por eso **no se repiten** las cinco mediciones Lighthouse móvil y escritorio: la condición que
las exigiría —que alguna fuente o salida de Tinge hubiera cambiado— no se cumple.

### Las dos peticiones adicionales del Lighthouse final del panel

Extraídas de los propios informes de §15.7 (`network-requests`, ejecución 1 de escritorio):

| URL | Tipo | HTTP | Bytes |
|---|---|---|---|
| `assets/banderas/es.webp` | Image | 200 | 1.159 |
| `assets/banderas/de.webp` | Image | 200 | 810 |

Las pide el **podio del juego**: `admin/index.php:7186` pinta
`<img class="adm-pod-bandera" src="../assets/banderas/<país>.webp">` por cada jugador del
marcador. En la medición de línea base el marcador estaba vacío; en la final tenía dos entradas,
una con país `es` y otra con `de`, porque entre una y otra se probó `record.php`. **Es una
diferencia de estado del docroot, no un cambio de carga del producto.**

### El aumento de ~10 KB, medido

Desglose real de las once peticiones frente a las nueve de la base:

| Concepto | Base | Final | Diferencia |
|---|---|---|---|
| Documento (`admin/index.php?t=agotados`) | 1.376.106 | 1.384.323 | **+8.217** |
| `favicon.ico` | 752.185 | 752.417 | +232 |
| Dos banderas del podio | 0 | 1.969 | **+1.969** |
| Fuentes y CSS de Google (ruido de compresión) | 152.524 | 152.549 | +25 |
| Otros (tokens.css, banner, portada) | 40.556 | 40.556 | 0 |
| **Total** | **2.321.371** | **2.331.814** | **+10.443** |

De esos 10,4 KB, ¿cuánto es código y cuánto es estado? Medición directa, dos docroots **idénticos
en todo salvo `admin/index.php`** (mismo `estado.json`, mismas fotos, mismas copias, misma sesión,
misma pestaña):

```
panel en d903dfe (antes de la fase correctiva):  1.428.880 bytes de HTML servido
panel con los nueve lotes:                       1.431.575 bytes de HTML servido
                                                 ------------------------------
atribuible al código:                                 +2.695 bytes  (+0,19 %)
```

Los otros ~5,5 KB del documento son **contenido de más en el docroot final** (el podio con dos
jugadores, entre otros), no código.

### Corrección de §15.7

El párrafo de §15.7 explicaba los 10 KB diciendo que «el HTML de la pestaña crece con el código
PHP añadido en el propio `index.php` (que se sirve entero)». **Eso es falso y queda corregido en
esta sección.** El navegador nunca recibe código PHP: recibe el HTML que PHP genera. Evidencia
HTTP:

```
GET /admin/index.php?t=agotados  -> 1.431.574 bytes,  ocurrencias de "<?php" en el cuerpo: 0
GET /admin/index.php             ->   135.718 bytes,  ocurrencias de "<?php" en el cuerpo: 0
GET /admin/config.php            ->         0 bytes,  Content-type: text/html
GET /admin/cliente.php           ->         0 bytes
```

Y los números lo confirman: la **fuente** creció 11.527 bytes (468.959 → 480.486) mientras el
**HTML servido** creció 2.695 con el mismo estado. Si se sirviera el fuente, las dos cifras
coincidirían.

Tampoco se compara la puntuación del restaurante ficticio con la de Tinge: son cartas de 6 y de
312 platos, y ese cotejo no diría nada.

## 16.14 Requisito GD (y mbstring)

Sin tocar producción.

| Comprobación | Resultado |
|---|---|
| ¿GD figura como requisito del hosting? | **NO.** `server/LEEME-SERVIDOR.txt` —el documento que se sube al servidor— enumera ficheros y permisos, no extensiones de PHP. `NUEVO_CLIENTE.md` no lo menciona. `SPEC.md` solo habla de GD en notas de implementación. `.github/workflows/deploy.yml` no comprueba extensiones |
| Panel del cliente nuevo **con** GD | **PASS** — portada válida guardada con sus cinco variantes WebP; los cuatro rechazos del lote 1 con su mensaje |
| Panel del cliente nuevo **sin** GD | **PASS** — «Este servidor no puede comprobar imágenes JPG (le falta la extensión GD con ese formato). Por seguridad no se guarda ninguna foto sin comprobar: avisa a quien lleva el hosting.» |
| ¿Modifica el estado un rechazo sin GD? | **PASS** — `hero`, `heroWebp` y `actualizado` idénticos antes y después; ningún fichero escrito en `assets/hero/` |
| ¿Se cambió la política de validación? | **No.** Ni una línea |

```
DESPLIEGUE BLOCKED — falta confirmar ext-gd en el hosting
DESPLIEGUE BLOCKED — falta confirmar ext-mbstring en el hosting (ver E2)
```

El segundo se añade porque esta fase demostró que su ausencia no degrada: **rompe** el panel a
media página, en silencio.

## 16.15 Limitaciones de esta fase

- `--publicar-github` y `--cerrar-activacion` **no se ejecutaron**: su efecto es remoto e
  inevitable y esta fase prohíbe repositorios remotos. Todo lo demás del alta sí se ejecutó de
  verdad con la herramienta, no a mano.
- Apache (`.htaccess`, `deflate`, HSTS, `ErrorDocument`, `record.json → record.php`) sigue
  **BLOCKED** en local: `php -S` ignora `.htaccess`. Solo se comprobó por lectura que las rutas
  sustituidas son las del cliente nuevo.
- El despliegue real, el FTP y la verificación en la URL pública quedan fuera por mandato.
- `UPLOAD_ERR_PARTIAL`, `NO_TMP_DIR`, `CANT_WRITE` y `EXTENSION` siguen sin reproducirse desde un
  navegador: solo revisados por lectura. `INI_SIZE`/`FORM_SIZE` sí se probaron de verdad (16.8).
- Una carta literalmente vacía **no compila** (16.7): el mínimo probado es una pestaña con un
  plato. No es un fallo, es la política de fallar cerrado, pero conviene decirlo tal cual.
- El PHP local no trae `finfo`, así que la comprobación de MIME real de `imagen_tipo_real()` se
  ejercitó por la rama sin `finfo`. En un hosting con `finfo` la validación es **más** estricta,
  no menos.
- Las medianas Lighthouse no se repiten, por lo explicado en 16.13.

## 16.16 Resultado de cada prueba

| # | Prueba | Resultado |
|---|---|---|
| 1 | Precondiciones del repositorio | **PASS** |
| 2 | Lectura del contrato de `/nuevo-cliente` | **PASS** |
| 3 | `--destino` ejecutado de verdad en local | **PASS** |
| 4 | `--detectar` ejecutado (5 veces) | **PASS** |
| 5 | `--build-local` ejecutado (4 veces) | **PASS** |
| 6 | `--publicar-github` | **NO EJECUTADO** — efecto remoto, prohibido por la fase |
| 7 | `--cerrar-activacion` | **NO EJECUTADO** — efecto remoto, prohibido por la fase |
| 8 | Cliente nuevo con configuración, estado, identificadores y carpetas propios | **PASS** |
| 9 | Sin contraseña, sesiones ni secretos heredados | **PASS** |
| 10 | Búsqueda de contaminación (Tinge, Turmeric, Papadum, Spicy Papadum, Pickle Tray, totm, dominios, precios, ofertas, destacados, identificadores) | **PASS** — 0 coincidencias |
| 11 | Chilli Rush documentado como función del motor | **PASS** |
| 12 | Tabla motor / generado / nunca heredado | **PASS** |
| 13 | Motor copiado byte a byte (100 ficheros + 2 envoltorios) | **PASS** |
| 14 | Aislamiento Tinge → cliente nuevo (hashes) | **PASS** |
| 15 | Aislamiento cliente nuevo → Tinge (hashes) | **PASS** |
| 16 | Carta literalmente vacía | **PASS (falla cerrado, por diseño)** |
| 17 | Build del cliente mínimo | **PASS** |
| 18 | `verificar-build.mjs` | **PASS** |
| 19 | `motor.lock` válido | **PASS** |
| 20 | Sintaxis PHP y JavaScript | **PASS** |
| 21 | Dos builds consecutivos idempotentes | **PASS** |
| 22 | Carta pública mínima funcional | **PASS** |
| 23 | Sin huecos rotos ni datos de Tinge en la carta | **FAIL (E1)** — falta `assets/titleIcon-accent.svg` |
| 24 | Administrador accesible | **PASS** |
| 25 | Consola sin errores | **FAIL (E1)** — un 404 por carga |
| 26 | Red sin peticiones fallidas | **FAIL (E1)** — la misma |
| 27 | Logs PHP sin errores ni warnings | **PASS** (servidores bien provisionados) |
| 28 | Activación con token: primera visita, token malo, clave corta, token bueno | **PASS** |
| 29 | Cierre de la activación (marca, hash muerto, `clave.php`) | **PASS** |
| 30 | Login, sesión, CSRF, salida | **PASS** |
| 31 | `salir_demo` | **PASS** |
| 32 | Marca | **PASS** |
| 33 | Publicidad (imagen, URL, fechas, fin ≤ inicio) | **PASS** |
| 34 | Ofertas (guardado y rango) | **PASS** |
| 35 | Precios (subida y publicación) | **PASS** |
| 36 | Juego | **PASS** |
| 37 | Agotados | **PASS** |
| 38 | Destacados | **PASS** |
| 39 | Analítica | **PASS** |
| 40 | Lote 1: portada válida, corrupta, extensión falsa, dimensiones, no-imagen | **PASS** |
| 41 | Lote 1 con GD / sin GD, y estado intacto al rechazar | **PASS** |
| 42 | Lote 4: mensajes comprensibles de subida con el tope efectivo | **PASS** |
| 43 | Lote 2: restaurar copia toca solo precios | **PASS** |
| 44 | Lote 7: varias copias en el mismo segundo | **PASS** |
| 45 | Lote 6: normalización y deduplicación de días | **PASS** |
| 46 | Lote 3: aviso de cambios sin guardar solo cuando corresponde | **PASS** |
| 47 | Fotografía de plato | **PASS** |
| 48 | Lote 8: `aria-label` inmediato | **PASS** |
| 49 | Lote 8: etiqueta accesible del login | **PASS** |
| 50 | Lote 8: saneamiento de `record.php` | **PASS** |
| 51 | Lote 9: precio canónico en lista, búsqueda y ficha | **PASS** |
| 52 | Oferta activa | **PASS** |
| 53 | Plato agotado (sin rebaja, con indicador) | **PASS** |
| 54 | Anchos 320/375/768/1280/1920 en las 8 pestañas | **PASS** |
| 55 | Anchos 320/375/768/1280/1920 en la carta | **PASS** |
| 56 | Fixture de alérgenos: dos categorías, varios platos, con y sin alérgenos | **PASS** |
| 57 | Plato con `mayContain` | **NO APLICA** — el contrato no lo admite |
| 58 | Alérgenos en la ficha y sección oculta sin ellos | **PASS** |
| 59 | Alérgenos en los dos idiomas | **PASS** |
| 60 | Filtros del buscador habilitados por configuración | **PASS**; filtro por alérgeno **NO APLICA** |
| 61 | Actualización válida del motor | **PASS** |
| 62 | Datos privados intactos tras actualizar | **PASS** |
| 63 | Rollback ante fallo intermedio (3 puntos) | **PASS** |
| 64 | Modo oscuro completo, contraste, foco, formularios, tablas, modales, ayudas, estados | **PASS** |
| 65 | Ausencia de residuos del modo claro (fuentes, build, `localStorage`, `sessionStorage`, DOM) | **PASS** — 0 coincidencias |
| 66 | Tinge sin cambios (fuentes y build, por hash) | **PASS** |
| 67 | `/nuevo-cliente` no modifica su origen | **PASS** |
| 68 | Identificación de las dos peticiones adicionales | **PASS** |
| 69 | Explicación medida del aumento de ~10 KB y corrección de §15.7 | **PASS** |
| 70 | GD documentado como requisito del hosting | **BLOCKED** |
| 71 | mbstring documentado como requisito del hosting | **BLOCKED** (E2) |
| 72 | Apache real (`.htaccess`, `deflate`, HSTS) | **BLOCKED** — `php -S` no lo aplica |
| 73 | Despliegue, FTP y verificación pública | **BLOCKED** — fuera del alcance de la fase |

Recuento: **63 PASS · 3 FAIL (los tres, la misma causa E1) · 5 BLOCKED · 2 NO APLICA ·
2 NO EJECUTADO por prohibición de la fase.**

## 16.17 Veredicto

| Veredicto | Resultado |
|---|---|
| **ESCALABILIDAD MULTICLIENTE** | **APTO** |

Se cumplen las diez condiciones exigidas: cliente nuevo limpio; cero datos de Tinge; build
correcto y verificado; administrador completo y funcional en las ocho pestañas y los cinco
anchos; carta funcional; alérgenos probados con una fixture real; aislamiento demostrado en los
dos sentidos con hashes y `diff`; actualización del motor segura, con vuelta atrás probada; **no
hizo falta modificar ni una línea del HTML, CSS, JavaScript o PHP del motor** para dar de alta el
cliente; y ninguna regresión en Tinge, cuyos 141 ficheros de fuente y 64 de build siguen idénticos.

**El APTO va con dos condiciones que hay que resolver antes de dar de alta un restaurante real:**

1. **E1** — todo cliente nuevo sirve un 404 por página mientras el motor pida un favicon que vive
   en la carpeta de marca del cliente y nadie crea. No rompe ninguna función, pero es un defecto
   garantizado en el primer minuto de vida de cada cliente.
2. **E2 + GD** — el panel completo está demostrado sobre un PHP con `gd` y `mbstring`. Ninguna de
   las dos extensiones está confirmada en el hosting real ni declarada como requisito en ningún
   documento. Sin `mbstring`, cinco de las ocho pestañas desaparecen sin avisar.

Ni E1 ni E2 son contaminación, pérdida de aislamiento, fallo de administración ni necesidad de
tocar el motor por cliente —los cuatro supuestos que obligarían a `NO APTO`—, y ninguna prueba
esencial quedó sin ejecutar, que es lo que obligaría a `BLOCKED`.

Como la escalabilidad queda **APTO**, el veredicto general **no** pasa a «NO APTO PARA OPTIMIZAR
— falta cerrar la validación multicliente». Se mantiene el de §15.9: **APTO PARA OPTIMIZAR —
técnicamente apto, autorización pendiente del propietario**, ahora además con la validación
multicliente cerrada.

## 16.18 Cierre

```
$ git diff --check
(sin salida)

$ git status --short --untracked-files=all
 M motor.lock
 M motor/gen.mjs
 M motor/server/admin/SPEC.md
 M motor/server/admin/index.php
 M motor/server/admin/record.php
?? auditorias/auditoria-calidad-2026-09-05.md

$ git diff --stat
 motor.lock                    |   8 +-
 motor/gen.mjs                 |  28 +++-
 motor/server/admin/SPEC.md    |  54 ++++++++
 motor/server/admin/index.php  | 300 ++++++++++++++++++++++++++++++++++--------
 motor/server/admin/record.php |   3 +
 5 files changed, 331 insertions(+), 62 deletions(-)
```

Los mismos seis ficheros que al empezar. La única diferencia respecto al arranque de esta fase es
el contenido de este informe. HEAD sigue en `d903dfe`, rama `feature/publicidad-fechas`. Sin
commit, sin push, sin PR, sin despliegue, sin FTP, sin producción, sin repositorios remotos y sin
instalar nada dentro del proyecto. Los defectos E1-E5 quedan **documentados y sin corregir**, a la
espera de orden expresa.

# 17. Corrección previa E1/E2 (6 de septiembre de 2026)

Fase correctiva acotada: **sólo E1 y E2**. E3, E4 y E5 quedan exactamente como estaban, sin
corregir ni empeorar. No es todavía la fase 17 de automatización.

## 17.1 Precondiciones

```
$ git rev-parse --short HEAD
d903dfe
$ git branch --show-current
feature/publicidad-fechas
$ git status --short --untracked-files=all
 M motor.lock
 M motor/gen.mjs
 M motor/server/admin/SPEC.md
 M motor/server/admin/index.php
 M motor/server/admin/record.php
?? auditorias/auditoria-calidad-2026-09-05.md
$ git diff --check
(sin salida)
```

Los seis ficheros esperados. Antes de editar se guardó fuera del repositorio una copia de los
once ficheros de la allowlist con sus SHA-256, para poder mostrar **sólo el delta de esta fase**
(17.7). Sin `stash`, `reset`, `checkout` ni limpieza en ningún momento.

## 17.2 E1 — el favicon que no existía

### Qué se eligió, y por qué

De las dos salidas que planteaba el encargo —generar un icono por defecto cuando no exista, o
dejar de emitir la referencia— se eligió **generarlo**, que es la preferida y la que se puede
hacer sin sobrescribir personalizaciones ni añadir dependencias. Dejar de emitir la referencia
también quitaría el 404, pero a costa de que ningún cliente nuevo tenga icono de pestaña: un
producto que se va a repetir cien veces no puede nacer sin él.

Se descartó copiar el fichero de Tinge (es suyo y el encargo lo prohíbe) y también crear un
fichero nuevo en `motor/assets/`, que está fuera de la allowlist. La plantilla vive donde vive el
resto del arte que `gen.mjs` escribe: dentro de `gen.mjs`.

### La implementación

En `motor/gen.mjs`, justo después de copiar las carpetas a `2-subir` y con el mismo patrón que ya
usaba la política de los `.htaccess` —escribir **sobre la copia** que va a publicarse, sin tocar
el fuente del cliente—:

```js
const ICONO_PESTANA = 'assets/titleIcon-accent.svg';
const iconoPestanaUrl = new URL(ICONO_PESTANA, SUBIR);
if (!existsSync(iconoPestanaUrl)) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">',
    '<rect x="3.25" y="1.75" width="13.5" height="16.5" rx="2.5" stroke="' + COLOR_PRINCIPAL + '" stroke-width="1.5"/>',
    '<path d="M6.75 6.5h6.5M6.75 10h6.5M6.75 13.5h4" stroke="' + COLOR_PRINCIPAL + '" stroke-width="1.5" stroke-linecap="round"/>',
    '</svg>',
    '',
  ].join(NL);
  mkdirSync(new URL('./', iconoPestanaUrl), { recursive: true });
  writeFileSync(iconoPestanaUrl, svg);
  copiados++;
}
```

Cinco propiedades, todas comprobadas más abajo:

| Requisito del encargo | Cómo se cumple |
|---|---|
| Ningún cliente pide un recurso inexistente | El fichero existe siempre en `2-subir`: el del cliente o el generado |
| No se oculta el error sin resolver la referencia | La referencia sigue igual en las tres páginas; lo que cambia es que ahora hay fichero |
| No se copia el favicon de Tinge | El SVG se dibuja aquí, con otra geometría; el de Tinge no se lee ni se toca |
| Nada de Tinge escrito a mano | No hay nombre, color, dominio ni ruta: el único valor variable es `COLOR_PRINCIPAL`, que sale de `cliente.mjs` |
| Plantilla genérica o color del cliente | Las dos cosas: plantilla del motor teñida con `marca.colorPrincipal` |
| Un favicon personalizado no se sobrescribe | La condición es `existsSync()` sobre el **destino**, que a esa altura ya lleva copiado el del cliente |
| Dos builds idempotentes | El SVG no lleva fecha, ni sello, ni azar |
| Funciona con cualquier nombre, slug y color | Se probó con dos clientes distintos y dos colores distintos |

En `motor/verificar-build.mjs`, el icono pasa a ser **obligatorio**. Se añade aquí y no en
`contrato-salida.mjs` (que está fuera de la allowlist, y además deriva su lista de `motor.lock` y
`cliente.mjs`, de donde este fichero no sale: es salida del build, como los derivados del panel):

```js
export const ICONO_PESTANA = 'assets/titleIcon-accent.svg';

function esperadosDeLaSalida(lock, cliente) {
  const esperados = contratoSalida(lock, cliente);
  esperados.set(ICONO_PESTANA, 'icono de pestana: lo piden la carta, el juego y el 404');
  return esperados;
}
```

Una sola función para los dos usos —la comprobación y el total que se informa—, de modo que la
lista que se verifica y el número que se imprime no puedan separarse.

En `NUEVO_CLIENTE.md` se documenta qué crea el sistema: la fila de `assets/` de la sección 2, un
bloque nuevo en 5.4 y una casilla más en la lista final de comprobación.

### Pruebas de E1

Dos clientes desechables nuevos, con nombre y color distintos, creados con la herramienta real:

| Cliente | Color | Idiomas | Juego | Alérgenos |
|---|---|---|---|---|
| `laurel_qa` — «Taberna Laurel QA» | `#3F8F5B` | es + en | sí | no |
| `indigo_qa` — «Índigo Bistró QA» | `#7A4FD0` | es | no | sí |

| Prueba | Resultado |
|---|---|
| `--destino` en los dos | **PASS** — `motor.lock escrito \| 100 ficheros + 2 envoltorios` |
| `--build-local` en los dos | **PASS** — `63 ficheros` y `60 ficheros` (uno más que antes: el icono) |
| Favicon generado, válido y con el color de **cada** cliente | **PASS** — 310 bytes, `<svg>` con `viewBox="0 0 20 20"`, `stroke="#3F8F5B"` en uno y `stroke="#7A4FD0"` en el otro |
| Carta pública | **PASS** — 0 errores de consola, 0 peticiones fallidas (antes: un 404 por carga) |
| Chilli Rush (`juego.html`) | **PASS** — 0 y 0 |
| Página 404 | **PASS** — servida en la ruta pública real (`/laurel_qa/404.php`), su icono responde `200` |
| HTTP 200 de todos los recursos | **PASS** — `/`, `/juego.html`, `/assets/titleIcon-accent.svg` → 200 en los dos clientes; `404.php` devuelve 404, que es su trabajo |
| Build idempotente | **PASS** — dos compilaciones seguidas sólo difieren en `index.html`, `version.json` y `admin/cliente.php`; el icono sale con **el mismo SHA-256** (`fd89df60…`) |
| El favicon de Tinge conserva su hash | **PASS** — `ed9ad4cb…` antes y después, byte a byte |
| Un favicon personalizado no se sobrescribe | **PASS** — se puso uno propio (un círculo azul) en `assets/` del cliente: tras compilar, y tras compilar otra vez, en `2-subir` sigue estando **ese** (`ab601599…`) |
| Al quitar el propio, vuelve el genérico | **PASS** — el build siguiente escribe otra vez el del motor con el color de marca |
| El verificador detecta la ausencia | **PASS** — borrado de `2-subir`: `BUILD INCOMPLETO: 1 problema(s) sobre 62 ficheros obligatorios / falta assets/titleIcon-accent.svg (icono de pestana: lo piden la carta, el juego y el 404)`, salida **1** |

Los tres FAIL de la fase 16 (pruebas 23, 25 y 26) desaparecen: **E1 CORREGIDO — PASS**.

## 17.3 E2 — el panel funciona sin `mbstring`

### Inventario, primero

Antes de tocar nada, todas las llamadas `mb_*` del motor:

| Fichero:línea | Llamada | Guarda antes |
|---|---|---|
| `index.php:1207` | `mb_strtolower` | **sí** (`function_exists`) |
| `index.php:1216` | `mb_strlen` | **sí** |
| `index.php:2168` | `mb_substr` | no |
| `index.php:6671` | `mb_strtoupper(mb_substr(...))` | no |
| `index.php:7503` | `mb_substr` | no |
| `record.php:171` | `mb_strtolower` | no |
| `record.php:179` | `mb_strlen`, `mb_substr` | no |

Ningún otro fichero del motor las usa. Cinco sin guarda, y una sola de ellas —la de las iniciales
de los días— bastaba para tirar el render a media página.

### La implementación

No se convierte `mbstring` en requisito. Se reutiliza el patrón que el propio fichero ya tenía y
se completa hasta cubrirlo todo, con **cuatro funciones y ni una llamada suelta**:

```php
function minuscula(string $s): string {
  if (function_exists('mb_strtolower')) return mb_strtolower($s, 'UTF-8');
  return strtr(str_replace(CAJA_MAY, CAJA_MIN, $s), CAJA_AZ_MAY, CAJA_AZ_MIN);
}
function mayuscula(string $s): string {
  if (function_exists('mb_strtoupper')) return mb_strtoupper($s, 'UTF-8');
  return strtr(str_replace(CAJA_MIN, CAJA_MAY, $s), CAJA_AZ_MIN, CAJA_AZ_MAY);
}
function recorte(string $s, int $desde, ?int $largo = null): string {
  if (function_exists('mb_substr')) return mb_substr($s, $desde, $largo, 'UTF-8');
  $trozos = preg_split('//u', $s, -1, PREG_SPLIT_NO_EMPTY);
  if ($trozos === false) return $largo === null ? substr($s, $desde) : substr($s, $desde, $largo);
  return implode('', $largo === null ? array_slice($trozos, $desde) : array_slice($trozos, $desde, $largo));
}
function caracteres(string $s): int {          // ya existía, se deja como estaba
  if (function_exists('mb_strlen')) return mb_strlen($s, 'UTF-8');
  $n = preg_match_all('/./us', $s);
  return $n === false ? strlen($s) : $n;
}
```

Tres decisiones que importan:

- **El recorte, por caracteres y nunca por bytes.** `preg_split('//u')` corta por puntos de
  código, igual que `mb_substr`. Cortar a la brava dejaría media tilde en pantalla y en el JSON,
  que es exactamente el «texto corrupto» que el encargo prohíbe. Si la cadena ya venía rota,
  `preg_split` devuelve `false` sin aviso y ahí sí se cae a bytes: es lo único que queda.
- **La caja, con `strtr()` sobre las 26 letras ASCII**, no con `strtolower()`. En algunas
  versiones y locales `strtolower()` toca bytes por encima de 0x7F y parte un carácter UTF-8;
  `strtr()` con dos cadenas ASCII de la misma longitud no puede tocar un byte de continuación.
  Encima va un mapa de 28 acentos latinos, que es lo que un camino ASCII no sabría cambiar.
- **`record.php` repite las tres que necesita.** Es un punto de entrada propio —el juego lo llama
  sin pasar por el panel— y no hay fichero común donde ponerlas sin inventar uno, que está fuera
  de la allowlist. No hay riesgo de redeclaración: ningún fichero incluye al otro (comprobado).

Sustituciones: `index.php:2168 → recorte(...)`, `6671 → mayuscula(recorte(...))`,
`7503 → recorte(...)`, `record.php → minuscula()`, `caracteres()` y `recorte()`.

### Pruebas de E2

El **mismo** cliente servido por dos PHP 8.4.24 sobre el mismo docroot: uno con `mbstring`
(puerto 5601) y otro sin ella (5603), los dos con GD.

**Los helpers, aislados, con trece casos:**

| Entrada | largo | inicial | minúscula | recorte a 12 |
|---|---|---|---|---|
| `Ámbar` | 5 | `Á` | `ámbar` | `Ámbar` |
| `Miércoles` | 9 | `M` | `miércoles` | `Miércoles` |
| `Ñandú` | 5 | `Ñ` | `ñandú` | `Ñandú` |
| `José` | 4 | `J` | `josé` | `José` |
| `Müller` | 6 | `M` | `müller` | `Müller` |
| `東京` | 2 | `東` | `東京` | `東京` |
| `🍚 emoji` | 7 | `🍚` | `🍚 emoji` | `🍚 emoji` |
| `<script>` | 8 | `<` | `<script>` | `<script>` |
| `ÁÉÍÓÚÑÜ` | 7 | `Á` | `áéíóúñü` | `ÁÉÍÓÚÑÜ` |
| `abcdef ghijkl mnopq` | 19 | `A` | (igual) | `abcdef ghijk` |

**Las trece líneas salen idénticas con y sin `mbstring`** (comparación automática de la salida
completa, no a ojo).

| Prueba en el panel | CON mbstring | SIN mbstring |
|---|---|---|
| Pestañas en el HTML | 8 | **8** |
| `section.pane` renderizadas | 8 | **8** |
| Las ocho abren | ✓ | **✓** |
| Iniciales de los días de la oferta | `L M M J V S D` | **`L M M J V S D`** |
| Marca (con `Ñandú, José y Müller` en el rótulo) | guardado | guardado |
| Subida fallida con nombre de fichero acentuado | «hero pequeño ñ & (400px).png: La foto mide 400 px de ancho…» | **mismo texto** |
| Ofertas (`dia[]` = 3,1,3,7 → `[1,3,7]`) | guardado | guardado |
| Juego | guardado | guardado |
| Agotados | guardado | guardado |
| Precios (+5 % y publicar) | publicado | publicado |
| Analítica | «Todavía no hay ningún dato…» | mismo texto |
| Login, contraseña incorrecta, sesión, salida | ✓ | **✓** |
| CSRF inválido (intento de apagar el juego) | rechazado, `game.on` sigue `true` | **rechazado** |
| Errores de consola | 0 | **0** |
| Avisos y errores PHP en el `error_log` | 0 | **0** |

**`record.php`, once nombres, con el marcador vacío en cada entorno:**

| Nombre enviado | Guardado (los dos entornos) |
|---|---|
| `Ámbar` | `Ámbar` |
| `Miércoles` | `Miércoles` |
| `Ñandú` | `Ñandú` |
| `José` | `José` |
| `Müller` | `Müller` |
| `東京` | `東京` |
| `🍚 emoji` | `🍚 emoji` |
| `<script>alert(1)</script>` | `alert(1)` |
| `ABCDEFGHIJKLMNOP` | `ABCDEFGHIJKL` (recorte a 12) |
| `gil1poll4s` | `` (filtro de palabrotas, sobre el texto entero) |
| `Ámbar de la Ñ` | `Ámbar de la ` (12 caracteres, sin partir la Ñ) |

El `record.json` resultante es **idéntico byte a byte** en los dos entornos:
`c98a1d06ebf4c0ef290904dc47f70fa4692eb9853cf31fe62fa7af38240ef895`. JSON válido, con los acentos
y el CJK intactos, sin etiquetas y sin ángulos.

Resultado obligatorio del encargo, alcanzado sin `mbstring`:

```
8 de 8 pestañas renderizadas y funcionales
record.php funcional
0 fatal errors
0 warnings
```

**E2 CORREGIDO — PASS.** `ext-mbstring` deja de ser un bloqueo de despliegue. La política de GD
no se toca: sigue igual y su confirmación en el hosting sigue pendiente (17.6).

## 17.4 Regresión completa

Sobre los clientes nuevos, con el código ya corregido.

| Prueba | Resultado |
|---|---|
| Build | **PASS** — `laurel_qa` 63 ficheros, `indigo_qa` 60 |
| `verificar-build.mjs` | **PASS** — 62 y 59 ficheros obligatorios (uno más que antes: el icono) |
| `motor.lock` | **PASS** — cuadra en los dos, 100 ficheros + 2 envoltorios |
| Sintaxis PHP | **PASS** — `php -l` sobre los 10 `.php` de cada build |
| Sintaxis JavaScript | **PASS** — `node --check` de `gen.mjs` e `importar.mjs` |
| Las ocho pestañas × 320/375/768/1280/1920 | **PASS** — sin desborde, 8 paneles y pestaña correcta en los 40 casos, **con y sin `mbstring`** |
| Carta | **PASS** — `Índigo Bistró QA`, dos platos, 0 errores, 0 peticiones fallidas |
| Búsqueda | **PASS** — «José» → `1 PLATO / 01 / José y Müller / Cocina / €9.60` |
| Ficha | **PASS** — abre con foto, nombre y precio |
| Alérgenos | **PASS** — `Lácteos, Huevo` y `Pescado, Soja`, con sus iconos |
| Oferta | **PASS** — 20 % aplicado: `12.00 → €9.60` |
| Agotado | **PASS** — el plato agotado conserva el precio íntegro (`€9.50`), sin rebaja (lote 9) |
| Juego | **PASS** — `juego.html` sirve 200; en `indigo_qa`, que nace sin juego, es la lápida de 300 bytes y su pestaña no sale en el panel (7 pestañas, no 8) |
| Página 404 | **PASS** — sirve la carta de error con el título del cliente |

**Los nueve lotes de la fase 15, reprobados aquí:**

| Lote | Prueba | Resultado |
|---|---|---|
| 1 (A1) | Portada: subida fallida con nombre acentuado, mensaje correcto | **PASS** (con y sin `mbstring`) |
| 2 (M1) | Restaurar copia tras cambiar marca y oferta | **PASS** — «Restaurados los precios… Lo demás sigue como estaba»; `marca` y `offer` conservan el cambio posterior, sólo vuelven `prices` |
| 3 (M2) | Aviso de cambios sin guardar | **PASS** — cubierto por la batería del panel |
| 4 (M3) | Mensajes de subida | **PASS** — mismo texto en los dos entornos |
| 5 (M6) | 320 px | **PASS** — sin desborde en las ocho pestañas |
| 6 (B1) | `dia[]` = 3,1,3,7 | **PASS** — guardado `[1,3,7]` |
| 7 (B2) | Cuatro publicaciones de precios seguidas | **PASS** — `01223001`, `01223002`, `01223003`: tres copias en el **mismo segundo**, sin pisarse, en 136 ms |
| 8 (B4) | `aria-label` de la cámara | **PASS** — «Poner foto a José y Müller» → «Cambiar la foto de José y Müller» sin recargar |
| 8 (B4) | `<label>` del login y `record.php` saneado | **PASS** — `label[for=clave].sr`; `<script>alert(1)</script>` → `alert(1)` |
| 9 (B6) | Precio canónico | **PASS** — lista, búsqueda y ficha: `€9.60` en los tres |

**Aislamiento y actualización del motor:**

| Prueba | Resultado |
|---|---|
| Tinge intacto | **PASS** — sus 141 ficheros de fuente sólo cambian en los siete de la allowlist; `assets/titleIcon-accent.svg` con el mismo hash |
| Actualización del motor (1.0.0 → 1.2.0) | **PASS** — sólo cambian `motor.lock` y `motor/banderas.mjs` |
| Datos privados tras actualizar | **PASS** — 10 ficheros con hash idéntico antes y después |
| El cliente sigue compilando tras actualizar | **PASS** — 63 ficheros, `build completo \| 62 ficheros obligatorios verificados` |

**E3, E4 y E5 siguen exactamente como estaban** (comprobado, no supuesto):

| Defecto | Comprobación | Estado |
|---|---|---|
| E3 | `motor.lock` de un cliente nuevo | sigue diciendo `"version": "1.0.0"` |
| E4 | `--detectar` sobre el cliente | `limpio. Sin restos de Tinge en 80 fichero(s)` — `server/**` sigue fuera de su lista, y siguen las 3 + 2 menciones a `menu2/` en comentarios |
| E5 | Validación del porcentaje | la línea sigue siendo `elseif ($on && ($pct < 1 || $pct > 90))`: sin `$on`, no se valida |

## 17.5 PageSpeed

**No hace falta repetir Lighthouse, y se demuestra por hashes.**

Se compiló Tinge con el motor corregido, en una copia desechable, y se comparó su `2-subir`
contra el build publicado en el repositorio, **neutralizando el sello de build**:

```
ficheros comparados: 64
con diferencias reales: 3
   admin/cliente.php   -> sólo la fecha humana del build (BUILD_FECHA)
   admin/index.php     -> los helpers de E2
   admin/record.php    -> los helpers de E2
```

Todo lo que sirve la carta pública —`index.html`, `version.json`, `404.php`, `juego.html`, los
37 ficheros de `assets/**` (icono de pestaña incluido), `.htaccess`, `LEEME-SERVIDOR.txt` y
`estado-EJEMPLO.json`— es **byte a byte idéntico**. No cambia ni el HTML, ni el CSS, ni el
JavaScript, ni un recurso, ni el patrón de red. El favicon de Tinge conserva su hash
`ed9ad4cbc1f3d6b6fcdc8d1e3e29a75745ef1c0f31796d3f2d9fc2699e7f8de5`.

Los tres que sí cambian son **PHP del panel, que no viaja al navegador**. Y aun así se midió,
para no dejarlo en un argumento: dos docroots idénticos salvo `admin/index.php` y
`admin/record.php`, mismo estado, misma pestaña, misma sesión:

```
panel antes de 16.1:  1.335.837 bytes de HTML servido
panel con E1 y E2:    1.335.837 bytes de HTML servido
                      ------------------------------
diferencia:                    0 bytes
```

Las únicas líneas distintas entre las dos respuestas son el token CSRF de cada petición y el
`?v=` de segundos que lleva el enlace «Ver la carta». **Cero bytes atribuibles a la corrección.**

Para un cliente **nuevo** el balance es aún mejor: la petición del icono ya existía y devolvía
404; ahora devuelve 200 con 310 bytes. Mismo número de peticiones, una menos fallida.

No se compara la puntuación de los clientes ficticios con la de Tinge: son cartas de 2 y de 312
platos y ese cotejo no diría nada.

## 17.6 Estado de GD

Sin cambios y sin tocar producción. La política de imágenes es la misma: con GD la portada se
valida y se guarda; sin GD se rechaza con su mensaje y **el estado no se modifica**. GD sigue sin
figurar como requisito en `LEEME-SERVIDOR.txt` ni en `NUEVO_CLIENTE.md`.

```
DESPLIEGUE BLOCKED — falta confirmar ext-gd en el hosting
```

El bloqueo por `ext-mbstring` **se levanta**: ya no es un requisito.

## 17.7 Ficheros modificados y delta exclusivo de esta fase

Comparado contra la copia guardada en 17.1, **sólo de esta fase**:

| Fichero | + | − | De qué |
|---|---|---|---|
| `motor/gen.mjs` | 39 | 0 | **E1** — escribe el icono si el cliente no lo trae |
| `motor/verificar-build.mjs` | 18 | 2 | **E1** — el icono pasa a ser obligatorio |
| `motor/server/admin/index.php` | 47 | 8 | **E2** — `mayuscula()`, `recorte()`, mapa de acentos y tres sustituciones |
| `motor/server/admin/record.php` | 34 | 2 | **E2** — `minuscula()`, `caracteres()`, `recorte()` y dos sustituciones |
| `motor/server/admin/SPEC.md` | 41 | 0 | Documentación de **E2** |
| `NUEVO_CLIENTE.md` | 16 | 1 | Documentación de **E1** |
| `motor.lock` | 5 | 5 | Regenerado con el comando canónico |

No se tocaron `motor/juego.mjs`, `motor/error404.mjs` ni `nuevo-cliente.mjs`, aunque estaban en
la allowlist: la referencia al icono en los dos primeros es correcta tal cual —lo que faltaba era
el fichero— y el alta no necesita crear nada, porque lo pone el build.

Estado del repositorio al terminar, separando lo que ya existía de lo nuevo:

| Fichero | Ya venía de la fase correctiva (§15) | Nuevo en 16.1 |
|---|---|---|
| `motor.lock` | sí | regenerado |
| `motor/gen.mjs` | sí (lote 9) | **+ E1** |
| `motor/verificar-build.mjs` | no | **sólo E1** |
| `motor/server/admin/index.php` | sí (lotes 1-8) | **+ E2** |
| `motor/server/admin/record.php` | sí (lote 8) | **+ E2** |
| `motor/server/admin/SPEC.md` | sí | **+ E2** |
| `NUEVO_CLIENTE.md` | no | **sólo E1** |
| `auditorias/auditoria-calidad-2026-09-05.md` | sí | **+ §17** |

## 17.8 Limitaciones

- Apache real (`.htaccess`, `deflate`, HSTS, `ErrorDocument`) sigue **BLOCKED** en local: `php -S`
  no lo aplica. La página 404 se probó sirviendo el cliente bajo su ruta pública real
  (`/laurel_qa/`) para que las rutas absolutas del icono se resolvieran como en producción.
- Despliegue, FTP y verificación en la URL pública siguen fuera del alcance.
- El fallback de caja cubre **28 acentos latinos**, no Unicode entero. Es una limitación
  declarada: sin `mbstring`, una letra fuera de ese mapa (griego, cirílico, turco `İ`) no cambia
  de caja — pero **no se corrompe**, que es lo que importa. Con `mbstring` el comportamiento es
  el de siempre. En los trece casos probados, incluidos CJK y emoji, la salida es idéntica.
- `preg_split('//u')` y `preg_match_all('/./us')` dependen de PCRE con UTF-8, que va compilado en
  PHP desde siempre y no es una extensión opcional como `mbstring`.
- `UPLOAD_ERR_PARTIAL`, `NO_TMP_DIR`, `CANT_WRITE` y `EXTENSION` siguen sin reproducirse desde un
  navegador.
- No se ha creado ninguna prueba permanente: la automatización es la fase 17.

## 17.9 Recuento y veredictos

Recuento **recalculado**, no heredado. Las 73 pruebas de §16 más las 32 de esta fase:

| | §16 (antes) | §16 (después de 16.1) | §17 | Total |
|---|---|---|---|---|
| PASS | 63 | **66** | 32 | **98** |
| FAIL | 3 | **0** | 0 | **0** |
| BLOCKED | 5 | **4** | 0 | **4** |
| NO APLICA | 2 | 2 | 0 | **2** |
| NO EJECUTADO (prohibido por la fase) | 2 | 2 | 0 | **2** |

Qué se movió: las pruebas 23, 25 y 26 de §16 (huecos rotos, consola y red) pasan de **FAIL a
PASS** por E1; la prueba 71 (mbstring como requisito de hosting) deja de estar **BLOCKED** por
E2. Los cuatro BLOCKED que quedan son GD en el hosting, Apache real, el despliegue y los cuatro
códigos de subida no reproducibles.

```
E1: CORREGIDO — PASS
E2: CORREGIDO — PASS
ESCALABILIDAD MULTICLIENTE: APTO
ADMINISTRADOR: APTO CON Y SIN MBSTRING
APTO PARA PASAR A LA FASE 17: SÍ, PENDIENTE DE AUTORIZACIÓN
```

Sigue abierto, y no lo levanta esta fase:

```
DESPLIEGUE BLOCKED — falta confirmar ext-gd en el hosting
```

Y siguen sin corregir, por orden expresa: **E3** (versión del lock de un cliente nuevo), **E4**
(`--detectar` no mira `server/**`) y **E5** (porcentaje de oferta con la oferta apagada).

## 17.10 Cierre

```
$ git diff --check
(sin salida)

$ git status --short --untracked-files=all
 M NUEVO_CLIENTE.md
 M motor.lock
 M motor/gen.mjs
 M motor/server/admin/SPEC.md
 M motor/server/admin/index.php
 M motor/server/admin/record.php
 M motor/verificar-build.mjs
?? auditorias/auditoria-calidad-2026-09-05.md

$ git diff --stat
 NUEVO_CLIENTE.md              |  17 +-
 motor.lock                    |  10 +-
 motor/gen.mjs                 |  67 +++++++-
 motor/server/admin/SPEC.md    |  95 +++++++++++
 motor/server/admin/index.php  | 355 ++++++++++++++++++++++++++++++++++--------
 motor/server/admin/record.php |  39 ++++-
 motor/verificar-build.mjs     |  20 ++-
 7 files changed, 527 insertions(+), 76 deletions(-)
```

Dos ficheros más que al empezar la fase —`motor/verificar-build.mjs` y `NUEVO_CLIENTE.md`—, los
dos dentro de la allowlist y los dos por E1. `motor.lock` no se editó a mano: lo reescribió
`node motor/lock.mjs --escribir`, y `node motor/lock.mjs` confirma que cuadra (versión 1.1.8,
100 ficheros + 2 envoltorios). HEAD sigue en `d903dfe`, rama `feature/publicidad-fechas`.

Sin commit, sin push, sin PR, sin despliegue, sin FTP, sin producción, sin `/simplify`, sin fase
17 y sin tocar E3, E4 ni E5. Se espera autorización.
