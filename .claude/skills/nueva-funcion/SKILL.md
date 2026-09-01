---
name: nueva-funcion
description: Protocolo del repo restaurantemenu para cambios de producto. Usar cuando el propietario pida añadir o incorporar una funcionalidad o función nueva (carta, panel, juego, motor), una feature, corregir un bug o fallo, o hacer un refactor significativo — «quiero añadir…», «añade una función…», «quiero incorporar…», «necesito una funcionalidad…», «nueva feature…», «quiero corregir…», «quiero refactorizar…». Las tareas documentales triviales (una errata, un retoque de texto) también se clasifican aquí pero salen por el camino corto, sin abrir el protocolo entero.
---

# nueva-funcion — protocolo de cambios del producto

FUNCIONALIDAD = $ARGUMENTS (o la petición natural del propietario si no vino por comando).

Los informes de CADA etapa van en el chat como bloque markdown copiable. Nunca secretos.

## 1. Clasificar, con proporcionalidad

FEATURE · FIX · REFACTOR · DOCS

- FEATURE relevante: protocolo completo, todas las etapas.
- FIX / REFACTOR: las mismas etapas comprimidas a su tamaño real (diseño de una
  pantalla, auditoría ligera). No fabricar «fases» numeradas para tareas pequeñas.
- DOCS / trivial (erratas, un texto): camino corto — proponer el cambio concreto,
  allowlist de un fichero, aplicar solo con OK, auditar el diff, commit autorizado.
  Sin rama salvo que el tamaño lo justifique.

## 2. Precondición (solo lectura, SIEMPRE antes de nada)

```bash
git rev-parse --short HEAD
git status --short
git branch --show-current
git ls-remote origin refs/heads/main
```

comparando el remoto real con la ref local. Árbol sucio o situación ambigua →
DETENERSE y reportar al propietario.

## 3. Situar la etapa (señales observables; jamás suposiciones)

| Señal (solo lectura) | Etapa |
|---|---|
| `main` limpio y `HEAD == origin/main` | tarea nueva → DISEÑO |
| rama de trabajo con working tree sucio | IMPLEMENTACIÓN o AUDITORÍA — determinar con evidencia: allowlist contra `git diff --name-status`, pruebas pasadas |
| rama de trabajo limpia + commits sin integrar en `main` | INTEGRACIÓN |
| `main` ahead de `origin/main` | PRE-PUSH |
| `main == origin/main` + run de ensayo auditado (`gh run list`) | PRE-DEPLOY |
| producción sirve el build aprobado (`version.json` público) | CERRADA |

«Diseño aprobado», «commit autorizado» o «deploy autorizado» de una conversación
anterior NO existen sin señal observable: primero reconstruir con verificaciones
baratas; si sigue ambiguo, pedir UNA confirmación mínima al propietario. Jamás asumir
una autorización.

## 4. Flujo y compuertas

```text
DISEÑO → IMPLEMENTACIÓN → AUDITORÍA PRE-COMMIT → COMMIT → INTEGRACIÓN
       → PUSH SEGURO / DRY-RUN → PRODUCCIÓN → CERRADA
```

NINGUNA flecha es automática: cada paso de etapa exige autorización expresa del
propietario en su propia orden. La rama se crea al empezar la implementación
(`feature/<nombre>` · `fix/<nombre>` · `refactor/<nombre>`), nunca en el diseño.

## 5. Reglas duras (siempre en vigor)

- Allowlist TAXATIVA: fuera de ella → DETENERSE, REPORTAR, NO TOCAR (lección real de
  la fase 5 de este repo). Nunca asumir que un fichero «parece relacionado».
- Sin secretos en informes. Sin `--force` ni `--force-with-lease`. Sin deploy implícito.
- Sin FTP manual salvo orden excepcional expresa. Sin tocar el runtime de producción
  (estado, records, claves, fotos del restaurante).
- No mezclar refactor con feature salvo necesidad demostrada. Lo que aparezca fuera de
  alcance no se arregla: se ofrece como tarea aparte.
- Diseño multicliente por defecto: Tinge es un cliente, no el único.

## 6. El detalle vive en protocolo.md

Al ENTRAR en cada etapa, leer SU sección de `protocolo.md` (este mismo directorio) y
seguirla al pie de la letra.
