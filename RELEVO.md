# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **31 ago 2026** · desde **PC 1** · build publicado `1788172705714`

---

## Dónde estamos

Repositorio limpio y sincronizado con `origin/main`. Nada a medias, nada sin desplegar.

La carta está publicada y verificada en <https://socialcard.es/tinge_of_turmeric/menu2/>.

---

## Qué se hizo en la última sesión

Una pasada de QA a fondo sobre la carta publicada —navegador real, entradas hostiles, red
caída, estado corrupto, cinco anchos de pantalla— y los dos arreglos que salieron de ella.

- **Muerto el bucle de recargas.** Con el almacenamiento del navegador bloqueado (Safari en
  privado, cookies bloqueadas, la carta dentro de otra app) y una build recién publicada, la
  carta se recargaba sola cada 2,5 s **para siempre**: ocho cargas en veinte segundos, medidas.
  Ahora hay un segundo cerrojo que no depende de ningún permiso. Verificado en producción: 2
  cargas en 20 s, las mismas que en una sesión normal.
- **El buscador ya no da resultados incoherentes.** «sopa» devolvía 14 con 6 aperitivos dentro
  y «Sopa de lentejas» repetida 3 veces. Ahora agrupa por nombre y precio —un plato ocupa
  varias filas porque además de su pestaña está en Vegano y en Sin gluten— y separa en dos
  bloques con rótulo: «Platos» y «También en estas secciones». Los rótulos salen sólo cuando
  hay de las dos clases, porque «curry» y «biryani» viven enteros del segundo bloque.
  Medido: sopa 14→12, biryani 34→28, papadum 4→2, curry 49 intacto, INP 136→104 ms.

Verificado en línea, no sólo en local: final 27/27, erratas 35/35.

---

## Qué queda pendiente

Lo de arriba del todo salió del QA de esta sesión y no estaba visto antes.

1. **Agotar un plato no lo agota en Vegano ni en Sin gluten.** El mismo plato está en varias
   pestañas con claves distintas, y `estado.json` va por clave. Comprobado: marcado `Papadum`
   agotado y a 99,99 €, su copia en Vegano seguía disponible a 1,00 €. Son 27 filas espejo.
   El panel ya calcula los nombres repetidos en `index.php:1097` y **no usa el resultado**.
2. **63 platos con el mismo nombre y distinto precio según la pestaña.** La sopa de lentejas
   vale 7,00 € en Aperitivos y 8,00 € en Sin gluten. **No se sabe si es a propósito** —la
   versión sin gluten puede costar más— y en pantalla nada lo explica. Hasta decidirlo, el
   buscador los deja separados: juntarlos enseñaría un precio que no es el de ninguno.
3. **El primer tabulador no llega al enlace de saltar al contenido.** `scrollIntoView` sobre
   el chip activo (`gen.mjs:4929`) desplaza la página 23 px al cargar y mueve el punto desde
   el que el navegador empieza a tabular. Se arregla moviendo la barra a mano, como ya se hace
   en `gen.mjs:3719`.
4. **Un precio inválido en el panel se descarta en silencio** y el mensaje sigue diciendo
   «Publicado» (`index.php:1782`).
5. **El interior del panel no se ha auditado nunca.** Está tras un alta de contraseña, y
   introducir credenciales es algo que el asistente no hace.
6. **Menores:** los puntos del carrusel miden 22 px (mínimo WCAG, 24); `/admin/<ruta rota>` da
   el 404 de Apache y no el de la carta; `$repetidos` es código muerto en el panel;
   `estado-EJEMPLO.json` se publica sin necesidad; el botón «atrás» sale de la carta.
7. **Source Serif carga un eje óptico que no se usa:** 122.360 bytes donde bastan 50.824.
8. **No hay bebidas ni postres** y nada se lo dice al comensal.
9. **El pie termina en el anuncio del proveedor.** Decisión tomada y consciente — se queda.

El LCP en móvil está donde puede estar: lo que queda es TTFB del alojamiento (~830 ms), no
código. Cloudflare se valoró y se descartó. No volver a tocar rendimiento sin un dato nuevo.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **`node gen.mjs` con `EPERM` sobre `2-subir`**: es el servidor local. Parar → compilar →
  arrancar. El lanzador está en la raíz del repo, `.claude\servidor.cmd`, **no** dentro de
  `tinge_of_turmeric/`.
- **`gen.mjs` borra `2-subir` entera**, y con ella `estado.json` **y `assets/hero/`**. Sin
  fotos, tres comprobaciones de `final.py` fallan sin que nada esté roto. Resembrar con
  `fixtures.php <ruta a 2-subir> si` antes de dar por buena ninguna medida de portada.
- **`gh run list` sin filtrar devuelve el despliegue ANTERIOR** durante los primeros segundos.
  Coger el `databaseId` cuyo `headSha` sea el del commit recién empujado.
- **Las pruebas ancladas a un reloj de pared mienten.** La de portadas esperaba 700 ms fijos y
  con la red frenada se cruzaba con el giro del carrusel. Anclar a un estado, no a un tiempo.
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
