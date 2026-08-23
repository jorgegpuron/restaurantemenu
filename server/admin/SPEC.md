
## Alérgenos en escritorio, y por qué se veía torcido (21 Aug 2026)

Eran dos columnas con dos centros distintos: el rótulo centrado en su columna de 240px y el texto
centrado en los 879 restantes. Cada mitad estaba centrada en su sitio y el conjunto no lo estaba
en ninguno. Además 879px son unos 120 caracteres por línea, el doble de lo que se lee cómodo.

Ahora es una sola columna centrada, como en móvil, con la medida del texto acotada a 62ch.
Medido a 1280: rótulo, iconos y texto comparten centro en 633, el texto ocupa 487px y sale a 54
caracteres por línea en tres líneas.

## La fecha con su día, y las pestañas al centro (21 Aug 2026)

La cabecera pasa a **Viernes, 21/08/26** — el día de la semana en un peso menos y la cifra en
grande. Por debajo de 400px el día salta a su propia línea. PHP escribe los días en inglés salvo
que el servidor tenga `intl` con el locale bien puesto, y en un hosting compartido eso no se da
por hecho: se traduce con una tabla y se acabó.

Las pestañas se centran mientras caben y se pegan al borde en cuanto desbordan, con
`margin-left:auto` en la primera y `margin-right:auto` en la última. `justify-content:center` no
sirve: al desbordar deja el primer botón fuera de alcance por la izquierda. Es el mismo truco que
la barra de categorías de la carta. Medido: a 1280 hay 60px iguales a cada lado; a 375 desborda y
el primer botón sigue siendo alcanzable con el scroll a cero.
