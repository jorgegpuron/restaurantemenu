# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **3 sep 2026** · cierre de Fase 7 (alta multicliente)

---

## Dónde estamos

Dos proyectos activos, dos repos, misma sesión:

**Tinge** (`tinge_of_turmeric/1-proyecto`, repo `restaurantemenu`) — rama
`feature/alta-automatica` en `80740cb`, árbol limpio, **todavía sin push**. `main` local sigue
en `origin/main` (`46adad8`); esta rama no se ha integrado.

**Bar Restaurante Guaza** (`bar-restaurante-guaza/1-proyecto`, repo `bar-restaurante-guaza`) —
**primer cliente real nacido de `/nuevo-cliente`, ya en producción**:
<https://socialcard.es/bar-restaurante-guaza/>. `main` local = `origin/main` = `8929344`,
árbol limpio. Build público **`1788443168785`**, desplegado y verificado con Playwright real
(11/11 PASS, consola limpia). `DESPLIEGUE_REAL = false` en el repo de Guaza.

El **motor de los dos clientes es idéntico byte a byte** (comprobado con `diff -r` y
`motor.lock`), pero viven en ramas/repos distintos: sincronizar el motor entre uno y otro sigue
siendo manual (copiar `motor/`, `gen.mjs`, `importar.mjs`, `motor.lock`), no hay herramienta que
lo automatice todavía.

---

## Qué se hizo en la última sesión

**Alta de Guaza de principio a fin**: digitalización de la carta (menú del día, 12 €, 31
platos en 2 categorías), corrección de una familia de bugs de "base de idioma no inglesa"
descubierta en el proceso, primera publicación real en GitHub y primer despliegue real a
producción.

**Auditoría funcional completa** del admin y de la carta pública con navegador real, y cuatro
tandas de defectos de aceptación corregidas genéricamente (nunca con parche específico de
Guaza): idioma del panel, imagen de login, selector de idioma tapado por la barra (una sola
causa raíz — slug con guiones sin comillar en JS generado — detrás de cuatro síntomas),
alcance de las 3 A (solo móvil, solo nombre/descripción de plato), `is_writable()` con falso
negativo en OneDrive bloqueando fotos de plato.

**Alérgenos, de extremo a extremo**: se detectó que `gen.mjs` descartaba en silencio la
columna `allergens` de `menu.md` — la ruta plato→HTML nunca había estado terminada, y con
0 clientes usándola nunca se notó. Conectada genéricamente (`resolver()` contra el catálogo
de `motor/alergenos.mjs`, aborta con clave desconocida o sin icono, nunca infiere nada).
Cargados los **16 platos con alérgenos reales de Guaza** (fuente: fotografía de la carta,
transcrita símbolo a símbolo, nunca deducida del nombre del plato ni de la receta) — **38
iconos en total, 6 tipos** (`cereals_gluten`, `fish`, `milk`, `eggs`, `crustaceans`,
`molluscs`). Dibujados a mano los dos iconos que faltaban (gamba, concha), iterando hasta que
se leyeran bien **a 14px real**, no ampliados. Aviso general del pie ahora **siempre visible**
(antes desaparecía con el primer plato declarado — inseguro con cobertura parcial).

**Pie de versión del admin** corregido: vivía en gris oscuro sobre fondo oscuro
(contraste ~2:1 en varios temas). Ahora usa `--metal`, el mismo tratamiento tipográfico que
el pie público, ≥4,5:1 en los 5 temas, probado en los dos anchos.

**Bloqueante de integridad del build, cerrado**: una compilación de prueba salió truncada
(18 ficheros en vez de 73 — faltaban las 37 banderas y media carpeta de admin) y terminó con
`exit 0` porque el workflow solo miraba 4 ficheros. Nuevo `motor/verificar-build.mjs` +
`motor/contrato-salida.mjs`: el contrato de "qué debe existir" se deriva de `motor.lock` y de
`cliente.mjs` (nunca de volver a listar las carpetas de origen, que es justo lo que falló).
Falla cerrado, sin número fijo de ficheros. Se ejecuta al final de `gen.mjs` y otra vez en
`deploy.yml`, antes del FTP. Probado con seis casos adversariales, incluida la reproducción
exacta del build truncado.

**Primer despliegue real de Guaza**, con el procedimiento de siempre: `DESPLIEGUE_REAL=true`
solo durante el run (bloque con `finally`), run identificado por SHA+evento+rama+databaseId
nuevo (nunca "el último"), verificado en el log que el paso del verificador corre antes del
FTP, y `DESPLIEGUE_REAL` devuelto a `false` al terminar.

---

## Qué queda pendiente

1. **`NUEVO_CLIENTE.md` sigue sin cierre definitivo.** El alta de Guaza ha demostrado el
   procedimiento de principio a fin, pero el documento en sí (el runbook de `/nuevo-cliente`)
   no se ha tocado ni actualizado con lo aprendido. Sigue prohibido tocarlo salvo orden expresa.
2. **`feature/alta-automatica` de Tinge sin integrar.** Todo el trabajo del motor de esta fase
   vive en esa rama, sin push. Falta decidir cuándo se sube y se mezcla en `main`.
3. **Guaza solo tiene una pestaña** (menú del día). No se ha probado navegación entre varias
   pestañas, ofertas por categoría en un cliente real, ni el buscador con un catálogo más
   grande — todo eso solo está probado en Tinge (312 platos) o en copias de scratch.
4. **Los iconos de alérgenos son nuevos y solo se han visto en Guaza.** Sin usar todavía en
   Tinge (0 platos declarados ahí, a propósito).

**Siguiente trabajo previsto**: ampliar la carta real de Guaza con **Pescados** y
**Parrillada** — pestañas nuevas, para validar en un cliente real la navegación entre
categorías, ofertas y lo que hoy solo está probado en scratch. Después, consolidar todo lo
aprendido de vuelta en Tinge y en el propio `/nuevo-cliente`, para que el siguiente alta
parta ya de esta versión endurecida del motor.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **`gen.mjs` puede terminar con `exit 0` tras una copia parcial.** Las dos carpetas que se
  copian por `readdirSync` (banderas, `server/admin/`) no llevan ninguna comprobación de que
  lo copiado sea lo esperado — ahora sí, ver `motor/verificar-build.mjs`. Si algún día ese
  verificador faltara o se saltara, no confiar en el recuento de "N ficheros" del log.
- **El servidor PHP local no lee `.htaccess`.** Para probar reglas de Apache (protección de
  `activacion.consumida`, el fallback de `record.json`) hace falta un router PHP que las
  interprete a mano — no vale con levantar `php -S` y mirar.
- **Un script de parcheo en modo texto puede convertir un fichero CRLF nativo a LF** (o al
  revés) sin que se note en el diff normal — usar `git diff --check` siempre, y si sale sucio,
  reescribir en modo binario respetando el final de línea original del fichero.
- **PowerShell antepone BOM UTF-8 a un `echo | comando`.** Para escribir secretos de GitHub
  byte-exactos (`DESPLIEGUE_REAL`, tokens), usar Bash con `printf '%s' 'valor' | gh …` y
  verificar en hex.
- **`gh run list` sin filtrar puede devolver el run anterior** en los primeros segundos tras
  un push o un dispatch. Nunca coger "el último": filtrar por SHA completo + evento + rama, y
  descartar cualquier `databaseId` que ya existiera antes de la acción.
- **`is_writable()` da falso negativo en esta carpeta de OneDrive.** Si un panel dice que no
  puede escribir sin motivo aparente, sondear con una escritura real antes de creer el veredicto
  del sistema de ficheros (patrón ya aplicado en `carpeta_escribible()`).
- **Clonar dentro de rutas largas de `scratchpad` rompe en Windows** (`Filename too long`).
  Usar una ruta corta.
- **Las pruebas ancladas a un reloj de pared mienten.** La fecha de "servicio" de la carta
  (agotados del día) se calcula con hora de corte en Canarias — anclar las pruebas a esa fecha
  calculada, nunca a una fecha fija.

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
