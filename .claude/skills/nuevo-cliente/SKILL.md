---
name: nuevo-cliente
description: Alta de un restaurante nuevo en el producto multicliente. Usar cuando el propietario pida dar de alta, crear o montar un cliente/restaurante nuevo («/nuevo-cliente», «alta de cliente», «nuevo restaurante»). PRIMERO recoge los datos mínimos con la plantilla; no crea nada hasta tenerlos y hasta que el propietario ordene empezar.
---

# nuevo-cliente — puerta de entrada del alta

Router ligero: recoge los datos y remite al procedimiento canónico. El procedimiento
completo NO vive aquí: vive en `NUEVO_CLIENTE.md`, en la raíz de este repositorio.

REGLA PRIMERA: si todavía no se han proporcionado TODOS los datos necesarios, NO empezar
a crear nada — ni repositorios, ni carpetas, ni configuración, ni despliegue. Responder
únicamente con la solicitud de datos, pidiendo SOLO los campos que falten (lo ya dado en
el mismo mensaje no se vuelve a pedir):

```text
Por favor, dame estos datos del nuevo cliente:

Nombre:
Slug:
Repo:
Destino:
Carta:
Idiomas:
Funciones:
- publicidad: sí/no
- juego: sí/no
```

Notas sobre los campos:
- `Carta` puede ser URL, PDF, fotos/capturas o archivo.
- NO pedir branding: ni logo, ni fotos corporativas, ni colores.

Con los datos completos: confirmarlos en una tabla y seguir `NUEVO_CLIENTE.md` (cada
paso marcado ✅ disponible / 🔧 pendiente de herramienta / 🔴 bloqueado), reportando qué
pasos siguen 🔧/🔴 antes de proponer nada. Cada paso del alta exige autorización expresa
del propietario, y todo lo creado cumple el invariante de producto escalable (datos al
cliente, comportamiento al motor, cero excepciones por cliente).
