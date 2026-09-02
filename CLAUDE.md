# restaurantemenu — carta multicliente

Este repositorio implementa un producto multicliente: motor (`motor/`) más cliente
(`cliente.mjs`, `carta.json`). Tinge of Turmeric es UN cliente, no el único: todo
comportamiento nuevo se diseña como multicliente cuando corresponda.

## Invariante de producto escalable

Este repositorio es la base de un producto multi-cliente, no una implementación específica
para Tinge of Turmeric.

Toda funcionalidad del motor debe ser reutilizable por futuros restaurantes sin modificar
el motor para cada cliente.

Reglas:
- datos, textos, imágenes y configuración específicos del restaurante → estado/cliente;
- comportamiento reutilizable → motor;
- prohibidos hardcodes, rutas, nombres o excepciones específicas de un cliente;
- nuevas funciones deben ser opcionales y retrocompatibles;
- un cliente que no use una función no debe romperse ni dejar huecos;
- evitar dependencias entre módulos que no sean necesarias;
- antes de aprobar un cambio, comprobar explícitamente que sigue siendo reutilizable
  para un cliente nuevo.

## Reglas permanentes

- `main` es la versión estable y publicable. No se implementa directamente en `main`.
- Nueva FEATURE, FIX o REFACTOR significativo → usar PRIMERO el skill `nueva-funcion`
  (`.claude/skills/nueva-funcion/`). No implementar nada antes del diseño y su allowlist.
- La allowlist de cada tarea es TAXATIVA: si parece necesario tocar algo fuera de ella,
  DETENERSE, REPORTAR y NO TOCAR. Nunca ampliarla en silencio.
- Un veredicto APTO nunca implica por sí solo commit, push ni deploy: cada uno de los
  tres exige autorización expresa y separada del propietario.
- PUSH ≠ PRODUCCIÓN. Publicar tiene su procedimiento propio y su propia autorización
  (ver el protocolo). El estado real de `DESPLIEGUE_REAL` se lee SIEMPRE de GitHub,
  nunca se asume.
- `RELEVO.md` solo se toca mediante orden expresa y separada.
- Nunca mostrar ni incorporar secretos a informes: ni claves, ni tokens, ni credenciales
  FTP, ni contenido de los datos del panel en producción.
