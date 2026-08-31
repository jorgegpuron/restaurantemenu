# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **31 ago 2026** · desde **PC 1** · build publicado `1788169742791`

---

## Dónde estamos

Repositorio limpio y sincronizado con `origin/main`. Nada a medias, nada sin desplegar.

La carta está publicada y verificada en <https://socialcard.es/tinge_of_turmeric/menu2/>.

---

## Qué se hizo en la última sesión

- **El buscador tolera erratas.** `nan` encuentra `Naan`, y con él `tika`, `tanduri`, `paner`,
  `biriani`, `vindalu`, `corma` y `papadam`. Distancia de edición, pero **sólo cuando la
  búsqueda normal da cero**: mientras haya resultados exactos nada cambia de orden ni de
  contenido. La tolerancia crece con la palabra —una letra hasta seis caracteres, dos a partir
  de siete— porque con dos en palabras cortas «vino» devolvía vindaloo, pollo y mango. El
  porqué y la prueba en seco están en `SPEC.md`.
- **La prueba del diferido de portadas se ancló a la foto, no al reloj.** `extra.py` esperaba
  700 ms fijos; con la red frenada esa ventana se cruzaba con el giro del carrusel y acusaba un
  fallo que no existía. Ahora espera a que la primera foto esté pintada. Medido: la segunda
  arranca a 5,15 s, la primera termina a 1,45 s.

Verificado **online, no sólo en local**: final 27/27, erratas 26/26, y las tres portadas se ven
en escritorio y en móvil.

---

## Qué queda pendiente

Por orden de lo que más duele:

1. **El interior del panel no se ha auditado nunca.** Está tras un alta de contraseña, y
   introducir credenciales es algo que el asistente no hace. Todo lo que hay detrás del login
   sigue sin revisar en las dos pasadas de crítica.
2. **`chili` no encuentra nada en español**, porque en la carta esos platos se llaman
   `guindilla`. No es una errata —eso ya está resuelto—, es un sinónimo. Haría falta un
   diccionario de equivalencias, y hay que decidir si merece la pena.
3. **Source Serif carga un eje óptico que no se usa:** 122.360 bytes donde bastan 50.824.
   Son 71 KB de regalo en cada visita nueva. Ofrecido y sin decidir.
4. **El juego tiene los dos únicos colores fuera de token** del proyecto (`#CFE9F2`, `#F2C14E`)
   y no se sabe si es deliberado: no está en `SPEC.md`.
5. **No hay bebidas ni postres** en la carta, y nada se lo dice al comensal: quien busca «vino»
   recibe el mismo cero que quien teclea cualquier cosa.
6. **El pie termina en el anuncio del proveedor.** Decisión tomada y consciente — se queda.

El LCP en móvil está donde puede estar: lo que queda es TTFB del alojamiento (~830 ms), no
código. Cloudflare se valoró y se descartó. No volver a tocar rendimiento sin un dato nuevo.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **`node gen.mjs` con `EPERM` sobre `2-subir`**: es el servidor local. Aunque el docroot es la
  carpeta padre, al servir `2-subir/admin/index.php` PHP mueve ahí su directorio de trabajo y
  bloquea la carpeta. Parar el servidor → compilar → arrancar.
- **`gen.mjs` borra `2-subir` entera**, y con ella `estado.json` **y `assets/hero/`**. Sin
  fotos, tres comprobaciones de `final.py` fallan sin que nada esté roto. Resembrar con
  `scripts/fixtures.php <ruta a 2-subir> si` antes de dar por buena ninguna medida de portada.
- **`gh run list` sin filtrar devuelve el despliegue ANTERIOR** durante los primeros segundos.
  Coger el `databaseId` de la ejecución cuyo `headSha` sea el del commit recién empujado, o se
  mide contra lo que había antes.
- **El panel del navegador se reporta `hidden` o con viewport 0×0** a menudo. Entonces las
  transiciones se congelan y `getBoundingClientRect` devuelve basura. Comprobar `innerWidth`
  antes de fiarse de cualquier medida.
- **`color-mix` resuelve a `color(srgb 0.87 0.84 0.78)`**, no a `rgb()`. Un lector de contraste
  que asuma 0–255 dará números falsos.
- **Buscar `font-size:10px` no encuentra `font-size:calc(10px * var(--escala))`.** Ya costó un
  arreglo que fue a las insignias equivocadas.
- **Las medidas de Lighthouse en local son bimodales** (89 y 99 con el mismo código). Tres
  pasadas como mínimo y quedarse con la mediana, o no se está midiendo nada.

---

## Cómo ponerse al día en dos minutos

```
Continúo el trabajo en la carta de Tinge desde el otro PC. Lee 1-proyecto/RELEVO.md,
los últimos commits y el final de SPEC.md, y dime qué encuentras antes de tocar nada.
```

Y la regla que no se salta: **un ordenador a la vez.** El `.git` vive dentro de OneDrive; con
los dos tocándolo se corrompe, y cada push publica en la carta de un cliente real. Antes de
cambiar de máquina: terminar, hacer push, esperar al ✓ de OneDrive.
