# protocolo.md — el detalle de cada etapa

Complemento de `SKILL.md` (el mapa). Se lee la sección de la etapa al entrar en ella.
Todos los informes: en el chat, bloque markdown copiable. Nunca secretos.

## DISEÑO

Solo análisis: cero escrituras, cero ramas.

Estudiar lo que aplique a FUNCIONALIDAD: objetivo · arquitectura relevante · fuente de
verdad (carta.mjs → carta.json → importar → gen) · motor (`motor/`) · cliente
(`cliente.mjs`) · `carta.json` · configuración · `generado/` (derivados volátiles,
ignorados) · panel (`motor/server/admin/`) · runtime de producción (estado, records,
fotos — intocables) · actualización (`actualizar.mjs`) · migración (`migrar.mjs`,
esquemas de carta y estado) · lock (`motor.lock`, tríada de verificación) · SEO ·
accesibilidad · rendimiento · seguridad · compatibilidad hacia atrás · multicliente.

Entregar:

```text
DISEÑO vN
ALLOWLIST PROPUESTA
```

con las seis listas: MODIFICAR · CREAR · MOVER · ELIMINAR · GENERADOS · PROHIBIDOS.

Después DETENERSE: la implementación exige autorización expresa del diseño.

## IMPLEMENTACIÓN

Solo tras autorización expresa del diseño (de esta conversación o re-confirmada).

1. Crear la rama que corresponda: `feature/<nombre>` · `fix/<nombre>` ·
   `refactor/<nombre>`. Tareas DOCS/triviales: sin rama salvo tamaño.
2. Implementar EXCLUSIVAMENTE la allowlist aprobada.
3. Si aparece la necesidad de tocar cualquier fichero versionado fuera de ella:
   DETENERSE · REPORTAR · NO TOCAR. La ampliación solo puede autorizarla el propietario.
4. Terminar SIEMPRE: SIN COMMIT · SIN PUSH · SIN DEPLOY, y entregar el informe de
   implementación (qué se tocó, qué pruebas se pasaron, qué queda).

## AUDITORÍA PRE-COMMIT

Obligatorio:

```bash
git status --short
git diff --check
git diff --name-status
```

Más: comprobación PROGRAMÁTICA del `--name-status` contra la allowlist (FUERA=0,
FALTANTES justificados) · lectura completa del diff · las pruebas diseñadas para la
tarea · regresiones (byte-identidad de `2-subir/` cuando el cambio no deba alterar el
producto compilado; idempotencia de gen) · residuos (temporales, fixtures) · seguridad
(sin secretos en el diff) · compatibilidad (actualizar/migrar si se tocó el motor).

Veredicto: `APTO PARA COMMIT` o `NO APTO PARA COMMIT` con el detalle.
**Un APTO jamás ejecuta el commit por sí solo.**

## COMMIT

Solo con autorización expresa. Un único commit lógico cuando corresponda (mensaje en
español, tipo `feat:`/`fix:`/`refactor:`/`docs:`). Después verificar: árbol limpio ·
`git show --stat` del commit · allowlist exacta en su diff · SIN PUSH.

## INTEGRACIÓN

Auditar la rama contra `main` (`git log main..rama`, diff completo). Integración
preferida:

```bash
git switch main && git merge --ff-only <rama>
```

cuando el historial lo permita. PROHIBIDOS sin orden expresa: `rebase` · `squash` ·
`--force` · `--force-with-lease`. Tras integrar, borrar la rama solo con OK.

## PUSH SEGURO / DRY-RUN

El push a `main` dispara el workflow SIEMPRE; que despliegue o no lo decide la variable.

1. Leer REALMENTE desde GitHub: `gh variable get DESPLIEGUE_REAL`. Debe ser `false`;
   si no lo es, DETENERSE y pedir instrucciones (cambiarla exige autorización).
2. Precondición local (HEAD esperado, árbol limpio, remoto sin avanzar por
   `git ls-remote`).
3. `git push origin main` (nunca `--force`, nunca tags, nunca otras ramas).
4. Auditar el run disparado: `dry-run: true` en la configuración del paso FTP · build
   correcto («Compilado correcto», los mínimos presentes) · plan de ficheros esperado ·
   `Uploading: 0 B — Deleting: 0 B` (cero escrituras productivas).
5. Informe. La variable QUEDA en `false`.

## PRODUCCIÓN

Solo con autorización expresa y separada. Nunca provocar producción con un push.

```text
gh variable set DESPLIEGUE_REAL --body "true"   → verificar leyendo de GitHub
gh workflow run deploy.yml --ref main           → sobre el commit aprobado
seguir el run hasta success                     → dry-run: false · FTPS strict
verificación externa                            → version.json público = build nuevo
humo de producción SOLO LECTURA                 → carta, idiomas, anclas, juego, 404,
                                                  panel protegido, consola limpia
gh variable set DESPLIEGUE_REAL --body "false"  → verificar leyendo de GitHub
```

La variable vuelve SIEMPRE a `false`, también si el despliegue falla. Ante cualquier
fallo: `DESPLIEGUE_REAL=false` PRIMERO, después DETENERSE y reportar exactamente qué
falló. Sin rollback automático: ni segundo deploy, ni revert, ni FTP manual — la
estrategia de recuperación la decide el propietario aparte.

## CERRADA

Producción sirve el build aprobado, `main == origin/main`, árbol limpio, variable en
`false`. Informe final y fin de la tarea.
