# Relevo

**Lo que hay que leer al abrir el proyecto en el otro ordenador.** Una sola pantalla, siempre
el estado de AHORA. No es un registro: el registro es `git log` y las decisiones son `SPEC.md`.

Se **reescribe entero** al terminar cada sesión. Si empieza a crecer, es que se está usando mal.

> Última actualización: **31 ago 2026, 09:15** · desde **PC 2** · build publicado `1788167491269`

---

## Dónde estamos

Repositorio limpio y sincronizado con `origin/main`. Nada a medias, nada sin desplegar.

La carta está publicada y verificada en <https://socialcard.es/tinge_of_turmeric/menu2/>.

Los últimos ocho commits son de una tanda larga de calidad: dos pasadas de
`/impeccable critique` (29/40 las dos) y los arreglos que salieron de ellas.

---

## Qué se hizo en la última sesión

Por si el título del commit no basta:

- **La búsqueda encuentra.** Indexa el rótulo de pestaña y de grupo, no sólo el nombre del
  plato: «biryani» pasó de 0 resultados a 34, «curry» de 2 a 49. Ordena poniendo delante las
  coincidencias en el nombre, y entiende plurales quitando la ese final a partir de cuatro
  letras — sin eso, «sopas» devolvía papadums.
- **El botón del móvil cumple lo que promete.** Dice «Buscar platos», abre con el foco en el
  campo y la hoja se titula igual. Esto **invierte una decisión de `SPEC.md`**, y el motivo
  está escrito allí: la decisión de no levantar el teclado era correcta cuando el botón decía
  «Categorías».
- **La nota fiscal es obligatoria y la decide el cliente**, en `cliente.mjs`. El build revienta
  si falta. No hay valor por defecto a propósito: un «IGIC» de fábrica acabaría publicado en un
  restaurante de Madrid.
- Chapa del panel legible, insignias a 11px, `alt` de portada numerados, el par de color del
  juego separado, Currys sin sus 14 descripciones repetidas, `aria-live` en el buscador,
  etiquetas en los campos de contraseña, contraste del hover del idioma, y `--r-chip`.

---

## Qué queda pendiente

Por orden de lo que más duele:

1. **El interior del panel no se ha auditado nunca.** Está tras un alta de contraseña, y
   introducir credenciales es algo que el asistente no hace. Todo lo que hay detrás del login
   sigue sin revisar en las dos pasadas de crítica.
2. **`nan` no encuentra `naan`.** El buscador entiende plurales pero no erratas; haría falta
   distancia de edición.
3. **El juego tiene los dos únicos colores fuera de token** del proyecto (`#CFE9F2`, `#F2C14E`)
   y no se sabe si es deliberado: no está en `SPEC.md`.
4. **No hay bebidas ni postres** en la carta, y nada se lo dice al comensal: quien busca «vino»
   recibe el mismo cero que quien teclea cualquier cosa.
5. **El pie termina en el anuncio del proveedor.** Decisión tomada y consciente — se queda.

---

## Trampas del entorno, aprendidas a base de perder tiempo

- **`node gen.mjs` con `EPERM` sobre `2-subir`**: es el servidor local. Aunque el docroot es la
  carpeta padre, al servir `2-subir/admin/index.php` PHP mueve ahí su directorio de trabajo y
  bloquea la carpeta. Parar el servidor → compilar → arrancar.
- **`gen.mjs` borra `2-subir` entera**, y con ella `estado.json`. Hay que resembrarlo:
  `cp 2-subir/estado-EJEMPLO.json 2-subir/estado.json`. Sin él, el servidor de PHP devuelve
  **200 con el `index.html` dentro** en vez de 404, y la carta se queda muda sin avisar.
- **El panel del navegador se reporta `hidden` o con viewport 0×0** a menudo. Entonces las
  transiciones se congelan y `getBoundingClientRect` devuelve basura. Comprobar `innerWidth`
  antes de fiarse de cualquier medida.
- **`color-mix` resuelve a `color(srgb 0.87 0.84 0.78)`**, no a `rgb()`. Un lector de contraste
  que asuma 0–255 dará números falsos.
- **Buscar `font-size:10px` no encuentra `font-size:calc(10px * var(--escala))`.** Ya costó un
  arreglo que fue a las insignias equivocadas.

---

## Cómo ponerse al día en dos minutos

```
Continúo el trabajo en la carta de Tinge desde el otro PC. Lee 1-proyecto/RELEVO.md,
los últimos commits y el final de SPEC.md, y dime qué encuentras antes de tocar nada.
```

Y la regla que no se salta: **un ordenador a la vez.** El `.git` vive dentro de OneDrive; con
los dos tocándolo se corrompe, y cada push publica en la carta de un cliente real. Antes de
cambiar de máquina: terminar, hacer push, esperar al ✓ de OneDrive.
