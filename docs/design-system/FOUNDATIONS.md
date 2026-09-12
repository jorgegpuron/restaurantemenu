# Foundations

Las tres capas del sistema, dónde vive cada una y quién puede usarla.

## 1. Dónde está el CSS

| Pieza | Fichero | Quién la escribe |
|---|---|---|
| Tokens compartidos con la carta | `2-subir/admin/tokens.css` | **`gen.mjs`**. Generado: editarlo a mano se pierde |
| Hoja del panel | bloque `<style>` dentro de `motor/server/admin/index.php` | a mano |
| Hoja condicional de marca | segundo `<style>` de `index.php`, sólo si el cliente tiene color propio | a mano |

Dos consecuencias prácticas:

- **`gen.mjs` aborta si `index.php` cambió sin refirmar el lock.** Antes de compilar:
  `node motor/lock.mjs --escribir`.
- **Un cliente con color de marca propio corre una hoja distinta.** Probar sólo el estado por
  defecto no basta: copiar `estado-EJEMPLO.json` a `estado.json` y ponerle `marca.colorPrincipal`.

## 2. Las tres capas

### Capa 1 — primitiva (`--c-…`)

Un color con nombre y sin significado. **No cambia entre temas.** Vive en un único `:root` al
principio de la hoja.

```css
:root{
  --c-n-0:#FFFDFB;      /* crema papel */
  --c-n-850:#1F1B18;    /* carbon superficie */
  --c-naranja-500:#FF7517;
  --c-rojo-600:#C62828;
}
```

La rampa neutra va de `--c-n-0` (el más claro) a `--c-n-950` (el más oscuro), numerada por
luminancia y con huecos libres para que quepan escalones nuevos sin renumerar. Los saltos
irregulares (25, 620, 910) son pares de colores casi idénticos que el panel ya distinguía.

**Nadie fuera de la capa semántica referencia una primitiva.** `--c-n-850` no significa «el
fondo de la tarjeta»; significa «este carbón».

### Capa 2 — semántica (`--sc-…`, `--e-…`, `--focus-…`, `--space-…`, `--radius-…`, `--t…`)

Qué papel juega la cosa. **Es la única capa que se redefine por tema.**

```css
:root, :root.light{ --sc-surface:var(--c-n-0);   --sc-text:var(--c-n-900); }
:root.dark       { --sc-surface:var(--c-n-850);  --sc-text:var(--c-n-25);  }
```

Cambiar la familia neutra del panel entero es hoy editar la rampa; antes era editar 24 valores
a mano, dos veces, sin saber cuáles eran el mismo color.

### Capa 3 — componente

Consume semánticas y nada más.

```css
.adm-btn{
  min-height:40px;
  padding:0 var(--space-3);
  border-radius:var(--ui-radius-control);
  border:1px solid var(--sc-border);
  background:var(--sc-surface);
  color:var(--sc-text);
  font-size:var(--t2);
}
.adm-btn:focus-visible{ outline:var(--focus-anillo); outline-offset:2px }
```

## 3. Excepciones, y por qué son excepciones

Tres sitios escapan a la regla, a propósito y con la razón escrita al lado:

1. **Sombras y velos en `rgba()`** (`--sc-scrim`, `--sc-sombra-card`). Expresarlos con la rampa
   obliga a `color-mix`, que el navegador computa como `color(srgb …)` en vez de `rgba(…)`:
   cambia el valor calculado sin cambiar el dibujo, y rompe cualquier comparación byte a byte.
2. **El QR de la carta** (`.adm-qr-actual img{background:#fff}`). Un código QR necesita su zona
   de silencio blanca en los dos temas: no es una superficie del panel, es parte del código.
3. **El botón primario naranja**, crema sobre `--sc-primary`, 2,65:1 en claro y 2,31:1 en
   oscuro. Es una **decisión expresa del propietario** con el coste medido y aceptado, y la
   prueba `E2E-TE-CONTRASTE` la registra como *KNOWN EXCEPTION — OWNER APPROVED*, no como PASS.
   Ver [ACCESSIBILITY.md](ACCESSIBILITY.md).

## 4. Lo que todavía convive y hay que ir retirando

| Vocabulario | Qué es | Qué hacer |
|---|---|---|
| `--s1…--s7` | escala **Fibonacci** de la carta (8/13/21/34/55/89/144), la escribe `gen.mjs` | no tocar: es de la carta. En el panel, migrar sus usos a `--space-…` |
| `--p-…` | parches locales de rondas anteriores («Mise») | absorber en `--sc-…`/`--ui-…` |
| `--ui-state-*` | seis alias del mismo `--offer` | colapsar; falta un `info` de verdad |
| `--radius` (sin sufijo) | base histórica, hoy igual a `--radius-lg` | retirar |
