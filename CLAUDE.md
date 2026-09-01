# restaurantemenu — carta multicliente

Este repositorio implementa un producto multicliente: motor (`motor/`) más cliente
(`cliente.mjs`, `carta.json`). Tinge of Turmeric es UN cliente, no el único: todo
comportamiento nuevo se diseña como multicliente cuando corresponda.

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
