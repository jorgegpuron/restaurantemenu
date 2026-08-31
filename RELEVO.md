# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **31 ago 2026** · desde **PC 1** · build publicado `1788174305124`

---

## Dónde estamos

Repositorio limpio y sincronizado con `origin/main`. Nada a medias, nada sin desplegar.

La carta está publicada y verificada en <https://socialcard.es/tinge_of_turmeric/menu2/>.

---

## Qué se hizo en la última sesión

Una pasada de QA a fondo sobre la carta publicada —navegador real, entradas hostiles, red
caída, estado corrupto, cinco anchos— y los cinco arreglos que salieron de ella.

- **Muerto el bucle de recargas.** Con el almacenamiento del navegador bloqueado y una build
  recién publicada, la carta se recargaba sola cada 2,5 s para siempre: 8 cargas en 20 s.
  Ahora, 2, las mismas que en una sesión normal.
- **El buscador dejó de dar resultados incoherentes.** Agrupa el mismo plato en un resultado
  —un plato ocupa varias filas porque además de su pestaña está en Vegano y en Sin gluten— y
  separa en dos bloques: «Platos» y «También en estas secciones». sopa 14→12, biryani 34→28,
  papadum 4→2, curry 49 intacto. INP 136→104 ms.
- **Un plato agotado lo está en todas sus filas.** Antes, agotar el Papadum de Aperitivos lo
  dejaba disponible y al precio viejo en Vegano. Lo expande el panel al guardar, y las
  casillas hermanas se mueven juntas en pantalla —sin eso, desmarcar sería imposible.
- **La carta dice por qué el sin gluten y el vegano cuestan más.** Aviso en las dos pestañas,
  en los tres idiomas.
- **Un precio mal escrito ya no se pierde en silencio** en el panel: se guarda lo que vale y
  el aviso nombra el plato que falló.

Verificado en producción: carta 27/27, buscador 35/35, aviso 10/10, panel 14/14.

---

## Qué queda pendiente

1. **El primer tabulador no llega al enlace de saltar al contenido.** `scrollIntoView` sobre
   el chip activo (`gen.mjs:4929`) desplaza la página 23 px al cargar y mueve el punto desde
   el que el navegador empieza a tabular. Se arregla moviendo la barra a mano, como ya se hace
   en `gen.mjs:3719`. Aislado con una prueba: sin ese `scrollIntoView`, el primer Tab cae donde
   debe.
2. **El interior del panel no se ha auditado nunca.** Está tras un alta de contraseña, y
   introducir credenciales es lo único que el asistente no hace. Lo que sí se puede probar son
   sus funciones sueltas: `panel-test.php` y `hermanas-test.php` lo hacen sacándolas del
   fichero con una expresión regular, sin levantar el panel.
3. **Source Serif pide un eje óptico que no se usa.** La petición lleva `opsz@8..60`; sin él,
   122.360 bytes pasan a 50.824. **71 KB en cada visita nueva.**
4. **`chili` no encuentra nada en español**: aquí esos platos se llaman `guindilla`. No es
   errata —eso ya está resuelto—, es sinónimo, y pide un diccionario de equivalencias.
5. **No hay bebidas ni postres** y nada se lo dice al comensal: `vino` devuelve 0.
6. **Menores del QA:** los puntos del carrusel miden 22 px (mínimo 24); `/admin/<ruta rota>`
   da el 404 de Apache y no el de la carta; `estado.json` en 500 deja un error rojo en consola;
   `estado-EJEMPLO.json` se publica sin necesidad; las anclas `#pills-...` no abren su pestaña;
   el botón «atrás» sale de la carta.
7. **El pie termina en el anuncio del proveedor.** Decisión tomada y consciente — se queda.

El LCP en móvil está donde puede estar: lo que queda es TTFB del alojamiento (~830 ms), no
código. Cloudflare se valoró y se descartó. No volver a tocar rendimiento sin un dato nuevo.

**Y una que ya no es pregunta:** los 63 platos con el mismo nombre y distinto precio según la
pestaña **son a propósito** —el sin gluten y el vegano se preparan aparte—. Está en `SPEC.md`.
Quien los iguale estará bajando precios que el restaurante ha subido a propósito.

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
