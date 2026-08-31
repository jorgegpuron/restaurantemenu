# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **31 ago 2026** · desde **PC 1** · build publicado `1788176301627`

---

## Dónde estamos

Repositorio limpio y sincronizado con `origin/main`. Nada a medias, nada sin desplegar.

La carta está publicada y verificada en <https://socialcard.es/tinge_of_turmeric/menu2/>.

---

## Qué se hizo en la última sesión

Una pasada de QA a fondo sobre la carta publicada —navegador real, entradas hostiles, red
caída, estado corrupto, cinco anchos— y **todo lo que salió de ella, arreglado y desplegado**.

- **Muerto el bucle de recargas.** Con el almacenamiento del navegador bloqueado y una build
  recién publicada, la carta se recargaba sola cada 2,5 s para siempre: 8 cargas en 20 s.
  Ahora 2, las mismas que en una sesión normal.
- **El buscador ya no da resultados incoherentes.** Agrupa el mismo plato en un resultado,
  separa en «Platos» y «También en estas secciones», perdona erratas y **entiende sinónimos**:
  `chili` encuentra las guindillas, `nata` encuentra los malai, `carne picada` los kheema.
- **Un plato agotado lo está en todas sus filas**, no sólo en la pestaña donde se marcó.
- **La carta dice por qué el sin gluten y el vegano cuestan más.**
- **Un precio mal escrito ya no se pierde en silencio** en el panel.
- **El primer tabulador vuelve a ser el de saltar al contenido**, y la página no se mueve sola
  al cargar.
- **Source Serif adelgaza 70 KB** por visita nueva, sin mover una sola línea de la carta.
- **Y los menores:** la categoría abierta va en la dirección y «atrás» vuelve a la anterior en
  vez de salir; el punto del carrusel cumple el mínimo de 24 px; `/admin/<ruta rota>` da la
  página de la carta; `estado-EJEMPLO.json` deja de servirse por HTTP.

Verificado en producción, no sólo en local: carta 27/27, buscador 35/35, teclado 14/14,
menores 33/33, aviso 10/10, y las dos reglas nuevas del servidor comprobadas por HTTP.

---

## Qué queda pendiente

1. **El interior del panel no se ha auditado nunca.** Está tras un alta de contraseña, y
   introducir credenciales es lo único que el asistente no hace. Lo que sí se puede probar son
   sus funciones sueltas: `panel-test.php` y `hermanas-test.php` las sacan del fichero con una
   expresión regular y las ejecutan sin levantar el panel.
2. **No hay bebidas ni postres** y nada se lo dice al comensal: quien busca `vino` recibe el
   mismo cero que quien teclea cualquier cosa.
3. **El pie termina en el anuncio del proveedor.** Decisión tomada y consciente — se queda.

El LCP en móvil está donde puede estar: lo que queda es TTFB del alojamiento (~830 ms), no
código. Cloudflare se valoró y se descartó. No volver a tocar rendimiento sin un dato nuevo.

**Dos cosas que NO son pendientes y conviene no volver a abrir.** Los 63 platos con el mismo
nombre y distinto precio según la pestaña **son a propósito**: el sin gluten y el vegano se
preparan aparte. Y el error rojo de consola cuando `estado.json` devuelve 500 **no tiene
arreglo**: lo escribe el navegador al fallar la petición y no hay JavaScript que lo calle. Las
dos están razonadas en `SPEC.md`.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **`node gen.mjs` con `EPERM` sobre `2-subir`**: es el servidor local. Parar → compilar →
  arrancar. El lanzador está en la raíz del repo, `.claude\servidor.cmd`, **no** dentro de
  `tinge_of_turmeric/`.
- **`gen.mjs` borra `2-subir` entera**, y con ella `estado.json` **y `assets/hero/`**. Sin
  fotos, tres comprobaciones de `final.py` fallan sin que nada esté roto. Resembrar con
  `fixtures.php <ruta a 2-subir> si`.
- **Un texto de pestaña se edita en `carta.mjs`, no en `cliente.mjs`.** El `intro` de la
  pestaña lo lleva `importar.mjs` a `TAB_INTRO` y a las tres traducciones; `importar.mjs` **no
  escribe `cliente.mjs`**, imprime el bloque para pegarlo y avisa con «OJO» hasta que cuadra.
- **`importar.mjs` deja los diccionarios con saltos de línea unix.** La primera pasada tras un
  cambio los rescribe enteros y el `git diff` asusta: el contenido no cambia. Comprobar por
  claves, no por líneas.
- **`gh run list` sin filtrar devuelve el despliegue ANTERIOR** durante los primeros segundos.
  Coger el `databaseId` cuyo `headSha` sea el del commit recién empujado.
- **Las pruebas ancladas a un reloj de pared mienten.** Anclar a un estado, no a un tiempo.
- **El panel del navegador se reporta `hidden` o con viewport 0×0** a menudo. Comprobar
  `innerWidth` antes de fiarse de cualquier medida.
- **`color-mix` resuelve a `color(srgb 0.87 0.84 0.78)`**, no a `rgb()`.
- **Buscar `font-size:10px` no encuentra `font-size:calc(10px * var(--escala))`.**
- **Las medidas de Lighthouse en local son bimodales** (89 y 99 con el mismo código). Tres
  pasadas y la mediana, o no se está midiendo nada.

---

## Cómo ponerse al día en dos minutos

```
Continúo el trabajo en la carta de Tinge desde el otro PC. Lee 1-proyecto/RELEVO.md,
los últimos commits y el final de SPEC.md, y dime qué encuentras antes de tocar nada.
```

Y la regla que no se salta: **un ordenador a la vez.** El `.git` vive dentro de OneDrive; con
los dos tocándolo se corrompe, y cada push publica en la carta de un cliente real. Antes de
cambiar de máquina: terminar, hacer push, esperar al ✓ de OneDrive.
