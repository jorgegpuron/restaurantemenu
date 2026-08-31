# Tinge of Turmeric — carta de restaurante indio

Registro de decisiones de diseño de **esta** carta, con sus medidas. Se lee antes de tocar nada
visual: casi todo lo que hay aquí se decidió midiendo, y volver a decidirlo a ojo suele deshacerlo.

El diseño partió de una plantilla («Getting You Hungry»), y de ahí salen las tres primeras
secciones. Lo demás es de aquí.

Source: https://fresheat-react.vercel.app/home3 (SPA route; direct URL 404s on Vercel, reachable only via in-app nav)
Target node: `section.food-menu-section > .food-menu-wrapper.style3 > .container > .food-menu-tab-wrapper.style3`
Scope: white rounded card only. The sibling `.marquee-wrapper` band (240px, below the card) is out of scope by user decision.
Interaction model: click-driven Bootstrap pills (7 tabs, all 7 panes present in DOM, instant switch, no fade class).

## Design tokens — "Jade" (2026-08-21)

Same three brand colours, different hierarchy: the teal is promoted from detail to room. It is
now the page the card sits on, which changes which pairs are legal — the page and the card
stopped being the same surface.

| Token | Value | Role |
|---|---|---|
| `--base` | `#2bbfa9` | brand teal — the page the card floats on |
| `--surface` | `#faf5e8` | brand cream — the menu card |
| `--ink` | `#021b31` | brand navy — headings, prices, and every word on the page itself |
| `--accent` / `--accent-ink` | `#1a7365` | teal darkened 40% — text-safe on the cream card |
| `--muted` | `#475864` | navy 72% over cream — body copy, **card only** |
| `--hairline` | `#dcdcd6` | item rules |
| `--chip` | `#e6e4d9` | idle chips, badges, the language pill |
| `--title-font` | `"Bricolage Grotesque"` | 400 / 600 / 800, variable with an optical-size axis |
| `--body-font` | `"Source Serif 4"` | 400 / 600, variable with an optical-size axis |

Sans display over serif body — the inverse of the usual pairing, and what gives this direction
its voice: the name reads as signage, the dish copy as a printed page. Weights top out at 800.
Bricolage carries tabular figures, verified by measuring all ten digits, so the price column
stays square.

**What the flip costs.** On the teal page only navy is legible: `--muted` falls to 3.2:1 there
and `--accent-ink` to 2.3:1. Both failures were caught by measuring during the prototype, not
by eye. The footer — the only text outside the card — is therefore navy, brand included.
`::selection` had to move to cream-on-teal (5.2:1); navy on it was 3.3.

Measured on the rendered page — 21 text pairs, worst 5.24:1:

| Element | Ratio |
|---|---|
| title, dish names, prices, idle tabs, footer (ink) | 7.6–16.0:1 |
| eyebrow, active tab, group titles, diet marks (accent) | 5.2:1 |
| descriptions, notes, numbers (muted, on the card) | 6.8:1 |

## Computed styles (getComputedStyle @1440px)
.container                 max-width 1570px; padding 0 12px
.food-menu-tab-wrapper.style3  background #fff; border-radius 32px; padding 120px 0; position relative; z-index 1
  @<=1199px padding 90px 0 ; @<=991px padding 80px 0   (.section-padding)
  (.shape1/.shape2/.shape3 de la plantilla: medidas del original, retiradas el 30 Aug 2026.
   Ver «Fuera las tres fotos de las esquinas».)
.title-area              position relative; z-index 5
.title-area .sub-title   Epilogue 16px/normal 700; #FC791A; uppercase; text-align center; margin-bottom 15px
  inner icons: titleIcon.svg 20x20, me-1 (margin-right 4px) / ms-1 (margin-left 4px)
.title-area .title (h2)  Epilogue 40px/50px 900; #010F1C; capitalize; text-align center; margin-bottom 10px
.food-menu-tab.style2    padding 0 120px
  @<=1600px 0 70px ; @<=1199px 0 50px ; @<=767px 0 40px
.nav-pills               display flex; flex-wrap wrap; justify-content center; margin-top 30px; border-bottom 0; padding-bottom 0
.nav-pills .nav-link     Epilogue 20px/30px 600; #010F1C; padding 5px 24px 0 0; margin 10px 24px 10px 0; border-radius 0; border-right 0; background transparent; cursor pointer
.nav-pills .nav-link.active  color #EB0029; background transparent
  (transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out)
.tab-content             margin-top 0
.row                     bootstrap row, margin 0 -12px, flex-wrap wrap
.col-lg-6                width 50%, padding 0 12px  (stacks to 100% below 992px)
.single-menu-items       display flex; align-items center; justify-content space-between; margin-top 30px
  @<=1399px margin-top 25px ; @<=470px flex-wrap wrap; gap 25px
.single-menu-items .details          display flex; align-items center; gap 16px
.menu-content            padding-bottom 10px; border-bottom 1px solid #D2D2D1
.menu-content h3         Epilogue 20px/30px 700; #010F1C; capitalize; margin-bottom 5px; transition .4s ease-in-out
  @<=1399px font-size 21px/30px; margin-bottom 0
.menu-content h3.active  color #FC791A !important
.menu-content p          Roboto 14px/24px 400; #5C6574; max-width 350px; margin-top -0.3em
.single-menu-items h6    Epilogue 18px/28px 600; #010F1C; text-align right

## Animations
float-bob-y: 3s linear infinite — 0% translateY(-30px), 50% translateY(-10px), 100% translateY(-30px)
float-bob-x: 3s linear infinite — 0% translateX(30px),  50% translateX(10px),  100% translateX(30px)
WOW.js fadeInUp on `.sub-title` (data-wow-delay .5s) and `.title` (data-wow-delay .7s):
  from { opacity 0; translate3d(0,100%,0) } to { opacity 1; none } — 1s, fires on viewport entry.
  Cloned with IntersectionObserver; disabled under prefers-reduced-motion.

## Content

Source data: `menu.md` (Tinge of Turmeric, 41 categories, 326 dishes, EUR).
`gen.mjs` parses that file and renders `index.html` — edit the Markdown, re-run the generator, never hand-edit the HTML.

The 41 categories are grouped into 13 tabs; subcategories become an orange uppercase
heading (`.menu-group-title`) with a hairline, inside the pane:

| Tab | Categories |
|---|---|
| Appetizers & Soups | Appetizers, Soups |
| Starters | Vegetarian, Meat & Seafood |
| Salads | Salads |
| Sizzlers | Sizzlers |
| Curries | Choose Your Ingredient, Choose Your Sauce, South Indian ingredient, South Indian sauce |
| Specialities | House Specialities |
| Vegetables & Lentils | Vegetable Dishes, Indian Lentil Dishes |
| Biryani | Classic Biryani, Butter Masala Biryani |
| Breads | Naan Bread, Flat Breads |
| Rice & Fries | Indian Rice, Fries |
| Gluten Free | 9 gluten-free categories |
| Vegan | 12 vegan categories |
| Kids | Kids Menu |

Additions to the cloned structure, all agreed with the client:
- `.menu-group-title` — subcategory heading (Epilogue 16px/700 uppercase, `--theme2`, hairline under).
- `.menu-group-note` — the source blockquote notes (spice levels, "All naans are egg-free",
  "Only served for children under 9"). 9 notes in total.
- `.item-id` — dish number, sits in the 16px gap that `.details` already had. Rendered per tab:
  a tab shows the column only if any of its dishes carry a number (Gluten Free and Vegan have none).
- Price `included` renders as the word `Included` (19 curry sauces).

Deviations from the cloned CSS, and why:
- `.menu-content` gets `width:100%;max-width:350px` and `.details` gets `flex:1` so the hairline
  is a constant 350px. The source section had one identical description for every dish, so
  shrink-to-fit happened to look uniform; with real copy of varying length it did not.
- `h3` `text-transform` changed from `capitalize` to `none`, so names read as written in the
  source ("Pick Any Individual Sauce or Pickle", not "...Sauce Or Pickle").
- Below 767px the pill bar becomes a horizontal scroller. 13 wrapped pills were 495px tall
  on a 390px phone.
- The first dish of the first tab keeps the source's orange `.active` highlight.

## 2026-08-20 client changes

- Eyebrow "DELICIOUS DISHES" → "Indian Restaurant Menu"; H2 "Getting You Hungry" → "Tinge of Turmeric".
  `text-transform:capitalize` removed from the H2 (it rendered "Tinge Of Turmeric").
- Dish names are plain `<h3>`; the `<a href="#">` wrappers and `cursor:pointer` are gone.
- Tabs reordered to menu course order: Appetizers & Soups, Starters, Salads, Sizzlers, Curries,
  Specialities, Vegetables & Lentils, Biryani, Breads, Rice & Fries, Kids, Gluten Free, Vegan.
  (Kids moved ahead of the two dietary tabs, which now close the menu.)
- `.food-menu-section` gets `margin:90px 0`.
- Navy `<footer>` band: "SocialCard <year> — All rights reserved", year written by
  `new Date().getFullYear()` on load, with 2026 in the markup as the no-JS fallback.
- Active tab now also carries a 2px teal underline, animated with `transform:scaleX()`.
  Colour still carries the state on its own — the rule is decoration, not the only cue.
- `titleIcon-accent.svg` is the eyebrow icon recoloured from `#FC791A` to `--accent-ink`;
  the original orange `titleIcon.svg` is kept untouched.
- Prices and dish numbers use `font-variant-numeric:tabular-nums`.

Known off-palette: the three decorative PNGs (fries line drawing, green vegetables, garlic and
salad) are the original Fresheat artwork and are not part of the three-colour system.

## 2026-08-20 mobile navigation pass

The site is ~95% phone traffic and the 13-tab bar was hard to navigate. What was wrong at 390px:
chips were 35px tall (44 is the touch minimum), only 2 of 13 were visible with no cue that the
row continued, the bar was not sticky so changing category meant scrolling back past up to 76
dishes, switching a tab left you at the previous scroll depth, and the 13 mixed courses with
dietary menus and a kids menu on one level.

What it does now:

- **One row at every width.** The bar never wraps: it is a horizontal scroller on phone,
  tablet and desktop alike. Auto margins on the first and last item centre the row while it
  fits and collapse once it overflows — `justify-content:center` would have made the left end
  unreachable. From 768px up, arrow buttons appear at both ends (mouse users cannot swipe);
  they hide when the row fits and each disables at its end. On touch the row is swiped.
- **Two levels in the bar.** Ten course tabs, then an inline `Special menus` separator, then
  Kids / Gluten Free / Vegan.
- **Sticky bar (≤767px).** `.tab-nav` is `position:sticky; top:0`. It must be a direct child of
  `.food-menu-tab` — an intermediate wrapper is only as tall as the bar and kills the stick.
  `.tab-nav-sentinel` (zero height, static, before the bar) drives both the stuck shadow, via
  IntersectionObserver, and the scroll-alignment maths, since the bar's own rect reads 0 once stuck.
- **Chips.** 44px minimum height, 8px gap, filled `--chip`; active is `--accent-ink` with cream
  text (5.2:1). Edge fades on both sides, each hidden when the scroller reaches that end.
- **Switching a category** scrolls back to the top of the list (only when you are below it) and
  centres the chosen chip in the scroller.
- **Category index sheet.** A floating `Categories` button (48px, ink) opens a bottom sheet
  listing all 13 with their dish counts, split Menu / Special menus. Current category is marked
  with both colour and a dot. Backdrop is ink at 55%. Escape, backdrop tap and the close button
  all dismiss; focus is trapped while open, body scroll is locked, and focus returns to the button.
- **Keyboard.** Arrow keys, Home and End move between tabs, as a `tablist` should.
- Footer background removed — text sits on the page, brand in `--accent-ink` (4.8:1); raw teal
  would have been 2.0:1 there.

- **Dish numbers on phones** drop the left column and ride as a pill badge in front of the
  name (`.item-badge`, 11px on `--chip`, 5.8:1). The desktop column (`.item-id`) and the badge
  are both in the markup and each is `display:none` at the other breakpoint, so no duplicate
  reaches the accessibility tree. Removing the column hands ~46px of width back to the name.
- **Phone type scale.** Dish name 16px/22px, description 14px/21px, price 16px. Measured across
  all 326 names at 390px: 278 fit one line, 46 two, 2 three — 99.4% within two lines.
  (17px left 9 names on three lines; 15px cleared them all but read too small.)
- **The H2 is `clamp(26px, 7.6vw, 40px)`** so "Tinge of Turmeric" holds one line from 320px up
  — 40px wrapped it in two on every phone. Desktop still resolves to 40px.

Measured at 390px: smallest touch target 44px, worst text contrast 4.79:1, no horizontal overflow.

## 2026-08-20 design + motion pass

Worked as one brief through apple-design, emil-design-eng, find-animation-opportunities,
animate and improve-animations. (`review-animations` is referenced by the others but is not
installed here; its bar was applied via the "Never Ship" table in `animate`.)

### System
- **Tokens.** Spacing is now Fibonacci (`--s1`..`--s7` = 8/13/21/34/55/89/144) and every gap
  resolves to one — the page previously mixed 10/12/15/16/20/24/25/30/48/50/60/70/80/90/120.
  Radii collapse to three (`--r-pill`, `--r-sheet` 21, `--r-card` 34). Motion has one
  vocabulary: `--ease-out: cubic-bezier(.23,1,.32,1)`, `--ease-drawer: cubic-bezier(.32,.72,0,1)`,
  `--t-press` 140ms, `--t-fast` 180ms, `--t-sheet-in` 340ms, `--t-sheet-out` 240ms.
- **Type.** Tracking is size-specific now: the display H2 tightens to `-0.02em` with `1.08`
  leading (it was `normal`/`1.25` — body spacing on a display line), dish names `-0.01em`,
  small caps open to `.1em`. Nothing shares one `letter-spacing`.
- **Depth.** The card is cream on cream — a 1.05:1 edge that was effectively invisible. It now
  carries `--lift-card`, so it reads as a sheet lying on the page.

### Composition
- The item rule runs the full column width and stops at the price, instead of dying at 350px
  and leaving a 220px gap between a dish and its cost. The description keeps a `46ch` measure.
- The price sits on the dish name's first baseline (`align-items:flex-start` + matching
  `line-height`) rather than floating against the vertical centre of a two-line block.
- Subcategory rules went from 2px of full-bleed teal — 37 of them down the page, the most
  template-like mark on the screen — to a 1px hairline, with the accent kept in the word.
- Item hairlines moved to `--hairline` (navy 12%), quieter under 326 repetitions.
- The three decorative PNGs are held at `opacity:.55` and no longer bob forever.

### Motion
- **Removed:** the infinite `float-bob` loops (perpetual decoration, no function) and the
  WOW-style load reveal (see the `entrance` block in the stylesheet for the full reasoning).
- **Added:** press feedback on every pressable — chips `scale(.95)`, arrows and close `.92`,
  FAB `.96` composed with its centring translate, sheet rows `.985` from `left center`.
  140ms, `--ease-out`.
- **Fixed:** the sheet was a keyframe in and a teleport out. It is now a `transform` transition
  in both directions — enters 340ms, leaves 240ms the way it came, stays mounted until
  `transitionend` (with a 400ms fallback for background tabs), and retargets if reopened mid-exit.
  The scrim fades with it.
- **Added:** a 180ms fade on the incoming tab pane, so swapping 9 dishes for 76 has a bridge.
  A keyframe here is deliberate — panes toggle `display`, which no transition can bridge — and
  re-selecting the open tab is now a no-op so it never replays.
- **Rejected, on purpose:** stagger on the 326 dish rows and scroll-reveal on the menu groups
  (prices are read, not watched), parallax on the shapes, and a sliding shared tab indicator
  (fragile inside a horizontal scroller; colour already carries the state).
- Hover shifts are gated behind `@media (hover:hover) and (pointer:fine)`.

### Accessibility
`prefers-reduced-motion` keeps presses, colour and the sheet fade but drops all travel;
`prefers-reduced-transparency` makes the sticky bar opaque; `prefers-contrast:more` darkens
the rules. Contrast is unchanged — 15 text pairs, worst 4.79:1. Smallest touch target 44px.

## 2026-08-20 icons + Spanish

### Sauce / ingredient marks
Sauce and ingredient lists are choosers, not numbered dishes. Where the source carries no dish
number the slot now holds a mark instead — a bowl for the base you pick, a drop for what goes
on it — in the same column as the numbers on desktop and the same badge on phones.
`SAUCE_CATS` / `INGREDIENT_CATS` in `gen.mjs` decide it from the category name; 48 rows get one
(19 sauce, 29 ingredient). They are `aria-hidden`: the group heading already says which list
you are in, so a screen reader would otherwise hear "sauce" nineteen times.

Dish numbers win the slot wherever they exist — people order by number, so `Curries — Choose
Your Ingredient` keeps 55–69 and shows no icon. That leaves the Curries tab mixing numbers and
marks between its groups; the alternative was dropping real menu numbers, which is worse.

### Spanish
`i18n.es.mjs` holds every string: 187 dish names, 271 descriptions, 8 notes, 13 tab labels,
26 group labels and the interface copy. `gen.mjs` throws if any string reaches the page without
an entry, so a missing translation is a build failure rather than an English word sitting in
the Spanish menu.

Translated by intent, not literally:
- Indian culinary nouns stay — Papadum, Pakora, Biryani, Naan, Tikka, Korma, Paneer, Kathal.
  Translating them makes the dish unrecognisable and unorderable at the table.
- Generic English is translated: Chicken → Pollo, King Prawns → Langostinos, Chips → Patatas
  fritas, Aubergine → Berenjena, Sizzler → a la plancha, Kids → Niños.
- Where a gloss helps, it is rewritten rather than transliterated: "Paneer (Indian Cottage
  Cheese)" → "Paneer (queso fresco indio)", "Kathal (Raw Jackfruit)" → "Kathal (yaca verde)".

Both languages ship in one DOM: English is the document text, Spanish rides in `data-es`, and
the switch swaps `textContent`. That keeps the open category, the scroll position and even an
open sheet across a language change, and the page still reads in English if the script never
runs. `aria-label`s swap through `data-es-label`; `<title>` and the meta description swap too.
The choice is remembered in `localStorage`, and a first visit from a Spanish browser opens in
Spanish. Cost: the file grew from 200KB to 288KB.

The switch sits between the restaurant name and the category bar — language is a page-level
choice, so it does not belong inside a row of categories that scrolls sideways. 44px targets on
phones, 5.8:1 idle and 16:1 active.

## 2026-08-20 group icons + diet marks

Per-dish icons were measured and rejected: the 326 dishes resolve to about 16 shapes, and
inside a single tab it collapses — Breads is 23 dishes and 1 shape, Rice & Fries is 15 dishes
and 2, with 13 of those identical. In those tabs the icon only repeats what the heading
already said, 23 times down one column. Two layers were built instead.

**Group icons** — one mark per subcategory heading, 37 in total (the 4 groups with no heading
get none). Mapped by category name in `GROUP_ICON_BY_CAT`; the build throws if a labelled group
has no icon. Twelve shapes: snack, soup, leaf, skewer, flame, rice, bread, fries, lentil, pot,
star, plus the bowl and drop already used for the ingredient and sauce choosers. `accent-ink`,
17px — raw `--accent` was 2.1:1 on cream and the shape stopped reading.

**Diet marks** — derived, never invented. A main-menu dish is marked only when a dish of the
same normalised name also appears in the restaurant's own Gluten Free or Vegan list: 59 vegan,
67 gluten-free, 35 both. The two lists carry different prices, so the mark reads "there is a
version of this", not "this is" — `Available vegan` / `Hay versión vegana`. For an allergy that
distinction is the whole point, and nothing the source does not state gets marked. Dishes
already inside the Gluten Free and Vegan tabs are not marked; the tab says it.

The marks carry `aria-label` rather than `aria-hidden` because they are information, and a
legend at the foot of the card names both, alongside a line asking guests to check allergies
with staff. Spot-checked against the source: Bombay Aloo vegan+GF, Malai Kofta GF only,
Chicken Tikka and Seekh Kebab unmarked, Papadum vegan only.

## 2026-08-21 allergen notice

The diet marks are not allergen information and must never be read as such: "vegan" is not an
allergen, and "available gluten free" says nothing about the dish on that line. The 14 allergens
of Regulation (EU) 1169/2011 are simply not in `menu.md` — the 92 lines that mention something
allergen-shaped are dish names ("Soy Shashlik", "Gluten Free Chapati"), not declarations — and
they cannot be inferred from a dish name without inventing food-safety data.

Per-dish declaration was costed and deferred: 326 rows × 14 allergens, needing the kitchen to
fill it. The structure would help — the curry lists are ingredient × sauce, so 47 rows cover
266 combinations — but the data has to come from the restaurant, not from here.

What ships instead is the route the regulation contemplates for non-prepackaged food: staff
provide the information, and a written notice tells the guest they can ask. The legend now has
two halves with deliberately inverted weight:

- **The marks** stay quiet — muted 13px — and carry a caveat saying in as many words that they
  are not an allergen declaration.
- **The notice** is the half the restaurant leans on, so it gets a `--chip` panel and
  full-strength ink at 13.7:1. Its heading is `--ink`, not `--accent`: accent on that panel
  measured 4.47:1 and this is the one line on the page that must not be borderline. Hierarchy
  comes from size, weight and tracking instead.

Both halves translate. Two things remain outside the code and were flagged to the client: the
notice reduces friction but not the obligation — staff still have to answer accurately — and
whether this exact wording satisfies RD 126/2015 is for whoever owns food safety at the
restaurant to confirm, not for this build.

## 2026-08-21 four languages, stacked number, full-width notice

**Number on its own line (phones).** `.item-badge` becomes `display:block; width:max-content`
inside the `h3`, so a row reads 01 / name / description down three lines instead of the number
riding in front of the name. Desktop keeps the left column.

**German and Russian.** `i18n.de.mjs` and `i18n.ru.mjs`, 524 strings each. `T()` and `TL()` now
emit one `data-<code>` per language from a `LANGS` list, so adding a fifth is a file plus a line.
German keeps the Latin dish nouns (Papadum, Biryani, Naan); Russian changes script, so they are
transliterated into Cyrillic — пападум, бирьяни, наан, панир — which is what Russian menus do.
Generic English still translates outright in both.

The build guard earned itself again: it caught `Salads` and `Biryani` missing from the German and
Russian group tables, and the meta-description key missing from Spanish. Three strings that would
have shipped in English inside a Russian menu.

The switch is four buttons; `navigator.language` picks the opening language on a first visit, and
`localStorage` remembers it after that. **Neither DE nor RU has been read by a native speaker —
both files say so at the top.** Get one to read them before this reaches a table.

**Size.** Four languages in one document is 432KB raw but **50KB gzipped** — the repetition
compresses away. That only holds if the server sends it compressed; without gzip it is the full
432KB over mobile data.

**The allergen notice** spans the full column from 768px up: a flex row with a 180px label column
and the text filling the rest at 15px, so the width is used without stretching two sentences into
a 130-character line.

## 2026-08-21 client round: copy, Vegan intro, Tabler icons, Russian removed

**Russian dropped.** `i18n.ru.mjs` deleted and removed from `LANGS`. Switch is EN / ES / DE.

**Four platter descriptions** rewritten in `menu.md` with the client's copy, and the matching
keys replaced in the Spanish and German dictionaries. The client supplied EN and ES only;
German was written here and carries the same caveat as the rest of that file.

**Vegan intro.** A new optional `TAB_INTRO` map puts one line under a tab's heading; only Vegan
has an entry. Rendered as `.tab-intro` — secondary text at 14px `--muted`, capped at 70ch, no
box and no new component.

**Subtitle** "Indian Restaurant Menu" → "South Indian Restaurant Menu" / "Cocina del Sur de
India" / "Südindische Küche". Same element, same type, same position.

**Icons: one family.** Every icon on the page is now Tabler Icons (MIT), outline set,
`stroke-width 1.75`, `viewBox 0 0 24 24`, `fill none`, `stroke currentColor`. Verified on the
rendered page: 217 icons, one stroke width, one viewBox, one fill, one stroke value, and the
group icons all render at 17×17.

The brief asked for `npm install @tabler/icons-react`. That package is React components and
this project is static HTML generated by `gen.mjs` — no React, no bundler, no TypeScript — so
installing it would have added a dependency nothing could import. Instead `@tabler/icons` (the
plain SVG package) was installed in a scratch directory, the exact paths for the icons in use
were extracted verbatim, inlined, and the scratch install deleted. Same source of truth, same
visual family, and inlining only the shapes in use *is* the tree-shaking the brief asked for.

| Group | Tabler icon |
|---|---|
| Appetizers | `tools-kitchen-2` |
| Soups | `soup` |
| Starters — Vegetarian, Vegan Starters | `plant` |
| Starters — Meat & Seafood, GF Starters | `meat` |
| Choose Your Ingredient, GF/Vegan Curries | `bowl` |
| Choose Your Sauce | `droplet` |
| Salads | `salad` |
| Sizzlers | `flame` |
| Vegetable Dishes | `leaf` |
| Lentil dishes | `bowl-spoon` |
| Biryani, Indian Rice, Rice & Fries | `cooker` |
| Naan Bread, Flat Breads | `bread` |
| Fries | `tools-kitchen-3` |
| Special Dishes, Special Biryani | `sparkles` |
| Diet: vegan / gluten free | `leaf` / `wheat-off` |
| Nav: arrows, menu button, close | `chevron-left`, `chevron-right`, `menu-2`, `x` |

Tabler has no rice, fries or pulse icon, so those three fall back to the nearest legible
concept — a cooker for rice dishes, cutlery for the fries side, a bowl-and-spoon for lentils.

## 2026-08-21 highlight tags

Eight marketing flags, in `TAGS` in `gen.mjs`, keyed by **category + dish name**. The compound
key matters: Katori Chaat and Chana Masala each appear three times (main, gluten free, vegan)
and only the main-menu row is meant to carry the flag. The build throws on a key matching no
row, so renaming a dish cannot silently drop its badge.

Three of the eight names the client sent do not exist verbatim on the menu, and were resolved:
- **Chicken Biryani** → `Classic Biryani :: Chicken` (nº 87), the biryani made with chicken.
- **Madras** and **Kashmiri Chicken** → these are *sauces*, not dishes. Applied to the `Madras`
  row in the South Indian sauces and the `Kashmiri` row in the classic sauces.

Rendered as `.item-tag` inside the `h3`, wrapped with the number in `.item-tags` so the flag
reads as following the number: inline before the name on desktop (where the number has its own
column), and sharing the line above the name on phones. Filled `--accent-ink` with `--surface`
text at 5.2:1 — the only filled element in the list, which is the point for 8 rows out of 326.
Accent-ink on the chip background would have been 4.47:1 at 10px.

Measured: the badge adds no height — a tagged row and an untagged row with the same description
length are both 86px, and the dish name never wraps because of it. The longest label, German
"Unbedingt probieren", is 192px inside 296px of phone column.

## 2026-08-21 price aligned to the dish name on phones

On phones the number (and the highlight flag) take the line above the name, so the price — which
aligns to the top of the row — was sitting beside the number instead of beside the dish. Two
fixes, both measured rather than eyeballed:

- Rows that carry a `.item-tags` line get the class `has-tags` **from the generator**, and their
  price is offset by `calc(var(--tags-line) + 5px)`. A `:has()` selector would have done the same
  without the class, but this way the alignment does not depend on selector support.
- The price kept `line-height:30px` on phones while the dish name uses 22px, which left the two
  text centres 4px apart even once the boxes lined up. The price now shares the name's line box.

Verified across numbered rows, flagged rows, sauce/ingredient icon rows and rows with no slot at
all: every price is within 1px of its dish name's first line. Desktop is untouched — the number
has its own column there, so the price already aligned and the offset does not apply.

## 2026-08-21 timed offer — 20% off appetizers, 10:00–11:59 Canary

Config lives in `OFFER` in `gen.mjs`: the category set, the percentage, the timezone and the
window. Both prices are written into the HTML at build time and a class on `<html>` decides
which one shows, so the static file never goes stale, a CDN can cache it forever, and a page
left open crosses 10:00 and 12:00 on its own (re-checked every 30s).

**The clock is the restaurant's, not the visitor's.** The hour is read through
`Intl.DateTimeFormat` in `Atlantic/Canary` whatever the device is set to — otherwise a phone in
Madrid would flip the discount an hour early. If `Intl` cannot resolve the zone, the offer stays
off. With JS disabled the menu shows its usual prices: nothing is ever discounted by default.

Layout, as specified: discounted price on top in the offer red, the usual price struck through
underneath, and a red `20% OFF` flag beside the dish number. The flag reuses the highlight-tag
component, so it sits next to the number on phones and inline before the name on desktop.

**A fourth colour, deliberately.** `--offer:#C62828` is outside the three-colour system, because
a discount that is not red does not read as a discount — this is a functional signal, not
decoration. Cream on it is 5.2:1; the red on cream is 5.2:1 for the price and the note.

Measured with the clock stubbed to 10:30 Canary: all six appetizer rows show both prices, the
strike renders, and the discounted price still lines up with its dish name to 0px on phone and
desktop alike.

Two things worth knowing: the exact 20% lands on odd cents for two dishes (€1.10 → €0.88,
€3.95 → €3.16), and the till has to apply the same rule — the page cannot be the only place
the discount exists.

## 2026-08-21 offer preview toggle (staff)

A clock button in the card's top-right corner lets the sales rep show the 20% offer outside its
window, so a demo at 16:00 does not require lying about the hours — the note under the heading
still reads "10:00 to 11:59", which is what stops it being a fake discount.

`offerOverride` starts `null`, meaning follow the clock; a tap sets it true/false and the 30s
sync respects it. **Deliberately not persisted.** A stray tap cannot leave the live menu showing
prices that are not running, because a refresh hands control straight back to the clock —
verified: forced on, reloaded, back to off at 01:47 Canary.

Faint on purpose: `opacity .28` in `--muted`, an 18px Tabler `clock` inside a 44px hit area, and
it goes solid `--offer` red with `aria-pressed="true"` while active so nobody leaves it running
without noticing. It reaches full opacity on hover and on keyboard focus. This is the one control
on the page that intentionally fails the 3:1 contrast guidance for UI components — it is a staff
affordance and being hard to spot is the requirement.

## 2026-08-21 icons in the index sheet, and the last English string

The sheet lists tabs, not subcategories, so it needed its own `TAB_ICON` map — the same twelve
shapes plus Tabler `mood-smile` for the kids menu, and `wheat-off` reused for Gluten Free. Same
family, same 1.75 stroke, 18px. The build throws if a tab has no icon.

The floating **Categories** button was the one string still hard-coded in English: it read
"Categories" in the Spanish and German menus. Now `Categorías` / `Kategorien`.

## 2026-08-21 Agotado hoy (sold out today)

The first thing on this menu that is not static. The HTML stays a cached file; a 43-byte
`estado.json` carries what changes during service, and the page applies it on load. That split
is what keeps the feature cheap: one small file unlocks sold-out, and later the same file can
carry the daily special, the price multiplier and the offer windows.

**The unit is the service date, not the calendar day.** A dish marked at 22:00 must stay marked
at 02:00 — same service — and clear when the morning delivery arrives. So the stored value is
the Canary date rolled back one day before 06:00, and a dish shows as out only when its stored
date equals today's service date. The file therefore **expires itself**: nobody has to clear it
in the morning, and a stale entry from January is simply ignored (verified).

**Failure mode is availability.** If `estado.json` is missing, malformed or the request fails,
nothing is marked — the menu never hides food because a request failed. Verified by removing
the file: 0 rows marked, menu fully functional.

Sold out is **dimmed and struck, never hidden**: a guest who came for that dish needs to see it
exists and is off today. The label is translated (Agotado hoy / Sold out today / Heute
ausverkauft), and the strike is scoped to the direct child so the label itself stays readable —
it was crossed out on the first pass.

**Server side** (`server/` in the source, `admin/` on the host): `index.php` is a password panel
listing all 326 dishes with a search box, writing `estado.json` atomically (temp + rename, so a
crash mid-write leaves the previous file intact rather than truncated JSON). Session login with
`password_verify`, CSRF token on save, and keys validated against the catalogue before writing.
`ADMIN_HASH` ships empty: the first visit shows a setup screen that generates the hash to paste
into `config.php`. The panel never writes its own code — on shared hosting that is exactly the
permission you do not want open.

`gen.mjs` now also emits `platos.json`, the dish catalogue the panel reads, so the dish list has
one source of truth instead of being retyped in PHP. 326 keys, all unique.

## Responsive
1440px: 2 columns, card padding 120px 0, tab padding 0 120px
768px : 1 column (col-lg-6 stacks at <992px), card padding 80px 0, tab padding 0 50px
390px : 1 column, item wraps so price drops under the text (gap 25px), tab padding 0 40px, container no max-width

## Sold out today — final visual pass (21 Aug 2026)

The flag moved out of the dish-name line into `.item-tags`, so a sold-out row now reads
`01  AGOTADO HOY` with the flag immediately after the number badge, which is where the eye
already is. The wrapper is always emitted and revealed by either `.has-tags` or `.is-sold-out`,
so a dish with no highlight badge still gets the slot.

The dimming is **0.45 opacity, not 0.20**. At 0.20 the dish name measures 1.32:1 against the cream
card — below the 1.5:1 floor where text stops being text and starts being a smudge, and a customer
scanning the card would not be able to read *what* is unavailable. At 0.45 it measures 1.93:1:
clearly recessed next to the 13.7:1 of an available dish, still legible. It is a single value in
one rule (`.is-sold-out .menu-content h3 > .i18n, …{opacity:.45}`) if a different balance is wanted.

Opacity is applied per element rather than to the row, because opacity creates a stacking context:
a child can never be more opaque than its parent, and putting `.45` on `.details` washed out the
AGOTADO HOY flag along with everything else. On a sold-out row the offer badge and the discounted
price are hidden outright — a 20% discount on something you cannot order is noise.

Panel session: `SESION_MINUTOS = 30`, idle-based (the clock resets on every save). Long enough not
to interrupt a service, short enough that a kitchen tablet left on the counter locks itself.

## Plato del día (21 Aug 2026)

A band above the tabs: eyebrow `HOY SUGERIMOS`, one line of text, price at the end. It is not a
dish row and deliberately does not look like one — no number, no badge, no diet marks. The kitchen
writes it in free text, so it can be something that is not on the carta at all, which is the point
of a daily special.

Same `estado.json`, same service date, same 06:00 expiry as the sold-out list: whoever marks the
agotados publishes the special in the same screen and neither has to be undone the next morning.
Spanish is the only required field; leaving it empty removes the band. English and German are
optional and fall back to Spanish rather than showing an empty line — a restaurant that does not
write the English version still gets a working menu in English.

The text lives in a JS variable, not in `data-es`/`data-en`/`data-de` on the element. The language
switch rewrites the `textContent` of everything carrying `data-es`, so storing the translations
there made the switch eat the entire band. A `totm:lang` CustomEvent re-renders it instead.

Contrast on the cream card: eyebrow 5.24:1, body 16.03:1, price 5.24:1 — all above AA.

## Where the password lives (21 Aug 2026)

The hash moved out of `config.php` into `admin/clave.php`, written by the panel itself. The
reason is boring and important: `config.php` is part of what I hand over, so a routine "upload
the admin folder again" after a menu change silently overwrote the hash and locked the restaurant
out. `clave.php` does not exist in the deploy folder at all, so there is nothing to overwrite by
accident.

It is written the same way as `estado.json` — temp file plus `rename`, which is atomic. A
half-written `clave.php` would be a lockout, not a glitch. `opcache_invalidate()` runs after the
rename because otherwise the server can keep serving the previous (empty) version from the opcode
cache and the new password appears not to work.

If `admin/` is not writable the panel says so and prints the exact file to create by hand — the
old flow, kept as the fallback rather than the default. And the panel now has a change-password
form (asks for the current one), so the restaurant is not dependent on me for it.

`.htaccess` denies `clave.php` and `config.php` as well as the JSON files. Neither would leak its
contents over HTTP anyway — PHP files execute rather than being served — but the deny costs
nothing.

## Demo mode (21 Aug 2026)

`define('DEMO_SIN_CLAVE', true)` in `config.php` opens the panel with no password, so it can be
shown to a prospect without handing over a credential. CSRF is still enforced, so another site
cannot write to the state from the viewer's browser, but anyone who finds the URL can edit the
menu state — that is the whole trade, and it is why the panel carries a permanent red banner
while the flag is on and sends `X-Robots-Tag: noindex, nofollow`.

Turning it off is one line back to `false`. The hash in `clave.php` is untouched by the flag, so a
panel that already had a password gets it back with nothing to redo.

## Recomendación de hoy (21 Aug 2026)

The daily special stopped being free text and became a dish the restaurant marks in the carta.
The state file stores one key and nothing else — `{"date": "...", "key": "Curries - Sauces :: Kashmiri"}` —
and the band reads the name, the number and the price off that dish's own row in the page.

Three things fall out of that, and they are the reason for the change. The three languages come
for free, because the row is already translated and re-reading it on a language change keeps the
band in step. The price can never contradict the carta, including during the 20% offer hour: the
band quotes whatever the row is showing, so €1.00 becomes €0.80 and back on its own. And the
kitchen types nothing, which was the actual complaint — four text fields in three languages is a
form, not a two-second action before a service.

A dish cannot be sold out and recommended at once. The panel releases whichever mark you did not
just touch, the server refuses the combination on save and says so, and the band hides itself if
a hand-edited state file manages it anyway. Three layers for one contradiction is not excessive:
the failure mode is sending a customer to order the one thing there isn't.

**The block**: the only inverted thing on the page — page teal as the field, card cream as the
type, same `--r-card` radius as the menu card, with a 45° hairline hatch at 7.5% for texture.
The teal is `--accent`, not the raw brand `--base`: cream on `#2bbfa9` measures 2.11:1, a colour
you can see but not read. `--accent` is the same hue darkened and gives 5.24:1. The eyebrow lost
its `opacity:.82` (4.09:1, under AA at 12px) and the dish number sits at .93 (4.77:1) — hierarchy
from size and letter-spacing, not from fading text below the legibility floor.

## Panel: la carta de hoy (21 Aug 2026)

Both actions now live on the same row: a checkbox on the left for sold out, a star on the right
for the recommendation. One list, one pass, no scrolling to a separate form. Search matches name,
number and group, because staff think in numbers as often as in names, and a "sólo marcados"
filter gives a one-tap review of what is marked before saving.

The summary at the top answers the only two questions worth asking on arrival — what is
recommended, how many are out — and carries the two clear-out actions, since a radio cannot be
unticked by tapping it again.

Two states the previous version did not have: a live counter (marking twenty dishes and watching
the number stay at zero leaves you unsure anything registered) and an unsaved warning, both in
the bar and as a `beforeunload` prompt. Marking ten dishes and closing the tab was the expensive
mistake this screen could produce.

Touch targets are 44px everywhere — the checkbox is drawn at 24px and padded to 44, the star the
same. Sold out is red plus a strikethrough, recommended is brand teal plus a filled star and a
tinted row: neither state depends on colour alone. The resting star is `--muted` at 70% (3.4:1);
at `--line` it measured 1.26:1, which is not a control anyone can see.

Verified in the browser against a mock that inlines the panel's real CSS and JS over the real 326
dishes: search by number and by name, empty-result notice, filter, both mutual-exclusion paths,
counters, dirty flag, target sizes and text contrast (lowest 4.79:1). The PHP itself is not
linted — there is no PHP on this machine.

## El recuadro, segunda pasada (21 Aug 2026)

Fuera el número y el precio: los dos están una pantalla más abajo, en la fila del plato, y aquí
competían con lo único que el recuadro tiene que decir, que es qué plato es. Queda el rótulo y el
nombre.

En móvil el recuadro deja a la tarjeta los mismos 13px que la tarjeta deja al navegador, así que
el mismo aire se repite hacia dentro en vez de ir a sangre. En tablet y escritorio sigue alineado
con la sangría de los tabs. Altura: 108px en móvil y 143px de 768 en adelante (antes 165 y 185).

**El nombre siempre a un tamaño y en una línea, con una excepción medida.** El tamaño base es el
mismo para todos los platos; sólo si un nombre no cabe se reduce lo justo. Con el ancho de un
móvil de 375px, 854 de los 978 nombres (87%, contando los tres idiomas) caben a tamaño completo,
y unos 20 (2%) no caben en una línea a ningún tamaño legible — casi todos alemanes con paréntesis,
del tipo "Aloo Paratha (gefüllt mit gewürzten Kartoffeln)". Para esos el suelo es 15px y el texto
pasa a dos líneas en vez de cortarse: un nombre partido se lee, uno cortado no. Ese suelo y ese
comportamiento están en `fitOneLine`.

## El recuadro, tercera pasada (21 Aug 2026)

Tres líneas: rótulo, nombre y descripción. La descripción sale de la misma fila del plato, así
que viene traducida sin trabajo extra, igual que el nombre. Los 326 platos tienen descripción,
pero la regla `:empty` quita la línea entera si alguna vez falta una — sin dejar el hueco.

El aire lo lleva el `gap` del contenedor, no los márgenes de cada línea, y el recuadro es un flex
centrado: así el bloque queda ópticamente centrado tenga dos líneas o cuatro. El ritmo es 21 entre
rótulo y nombre, 8 entre nombre y descripción — el nombre y su descripción son una sola cosa y se
leen juntos; el rótulo es otra. Aire arriba y abajo, iguales.

Radio 6px. En porcentaje literal el radio sería elíptico: un 4% de 1221px de ancho son 49px
contra 6px de alto, y la esquina saldría estirada. 6px es ese 4% medido sobre la altura de la
caja y aplicado por igual en las cuatro esquinas.

La descripción va a crema entera (5.24:1). Atenuarla sobre este verde la sacaría de AA, así que
la jerarquía frente al nombre la dan el tamaño y el peso, no la opacidad. Medida máxima 60ch: la
descripción más larga de la carta son 102 caracteres y ocupa tres líneas en móvil, dos en
escritorio, sin desbordar.

## Fuera la recomendación, dentro destacados, ofertas y precios (21 Aug 2026)

La recomendación del día se ha quitado entera — banda, CSS y runtime. Queda AGOTADO HOY, que es
la función que obliga a abrir el panel todos los días.

**El cambio de fondo es que el build ya no decide nada del día a día.** Antes los destacados
estaban en una constante `TAGS`, la oferta en una constante `OFFER` con Aperitivos/20%/10:00–11:59
clavados, y los dos precios de cada plato en oferta se emitían en el HTML. Ahora la fila sale del
build con su precio de carta y con los huecos vacíos, y un solo `render()` la recalcula entera
leyendo `estado.json`. Cada fila se recompone desde cero en cada pasada, así que llamar dos veces
a `render()` da lo mismo que llamar una — no hay estado acumulado que se desincronice.

Sin JS, o con `estado.json` caído, la carta sigue siendo correcta: precios de siempre, nada
agotado, ninguna oferta. Nunca se esconde comida porque una petición haya fallado.

**Destacados (punto 3).** El vocabulario es cerrado: seis etiquetas, las mismas que ya estaban
traducidas. El panel elige entre ellas, no escribe texto libre — una etiqueta inventada saldría en
inglés en los tres idiomas. Los textos que el JS compone (un porcentaje, una hora) viajan en un
diccionario `TR` de tres idiomas emitido en el build, porque `T()` sólo sirve para lo que ya está
en el HTML.

**Ofertas (punto 5).** Cualquier categoría, cualquier porcentaje, cualquier franja y cualquier
combinación de días. La hora se lee en `Atlantic/Canary` y se revisa cada medio minuto, así que
una página abierta cruza el principio y el final de la franja sola. El botón del reloj para la
comercial ahora se oculta cuando no hay ninguna oferta configurada: no tiene sentido previsualizar
lo que no existe.

**Precios, en dos pasos.** Pulsar +5% no escribe nada: calcula y enseña la carta entera con el
precio nuevo ya redondeado al múltiplo de 5 céntimos — 4,50 sube a 4,75, no a 4,73 — con cada
valor editable. Sólo "Publicar precios" escribe. Se guarda únicamente lo que difiere del precio de
carta, así que "volver a los precios originales" es vaciar un objeto. Los 19 platos marcados
"Incluido" no entran: no tienen precio que subir.

El orden de aplicación importa y es uno solo: primero el precio que haya puesto el panel, y encima
la oferta. Un plato con precio corregido a 1,20 y un 20% de descuento sale a 0,96.

**Verificación.** El runtime está probado en navegador en los tres idiomas: destacado, oferta con
su etiqueta y su nota, precio corregido, y los tres apilados. El PHP no está pasado por `php -l`
—no hay PHP en esta máquina— pero sí por un verificador de plantillas escrito para esto, que
comprueba cadenas sin cerrar, llaves/paréntesis/corchetes descuadrados y la sintaxis alternativa
(`if:`/`endif;`) mal cerrada. El verificador se ha probado contra cuatro roturas deliberadas de
ese mismo archivo y las detecta todas.

## El fallo de las ofertas (21 Aug 2026)

Las ofertas se calculaban bien y no se veían. El runtime ponía el precio rebajado, el badge y la
nota en el DOM, con el texto correcto y en el idioma correcto — pero el CSS seguía escondiéndolo
todo detrás de `html.offer-on`, la clase que ponía el motor viejo y que el nuevo `render()` ya no
pone. Cuatro reglas huérfanas de su interruptor.

**El error de método, que importa más que el bug:** al verificar el refactor comprobé
`:not([hidden])` y `textContent` — el dato — y no `getComputedStyle().display` — lo que ve el
cliente. Un elemento con el atributo correcto y `display:none` pasa esa prueba y falla en la mesa.
Desde aquí, cualquier cosa que dependa de mostrar u ocultar se verifica por display calculado.

La corrección es de fondo, no un parche: la visibilidad de la oferta la decide ahora sólo el
runtime, con `hidden` y con `.has-offer`. Un único dueño del estado. Y un `[hidden]{display:none
!important}` global, porque `.item-tag-offer{display:inline-block}` empata en especificidad con el
`[hidden]` del navegador y gana por orden — sin esa regla, ocultar por atributo no oculta.

## La carta se refresca sola (21 Aug 2026)

Segundo motivo por el que una oferta podía "no actualizarse": `estado.json` se pedía una sola vez,
al cargar. La cocina guardaba un cambio y una pestaña ya abierta —la del cliente sentado en la
mesa— no se enteraba nunca. Ahora se vuelve a pedir cada minuto y al volver a la pestaña, que es
justo lo que hace quien acaba de guardar en el panel. Son 200 bytes por vuelta. Si la petición
falla se conserva el estado anterior en vez de vaciarlo: un corte de red no debe borrar los
agotados de la pantalla.

También: el reloj canario pasa a `hourCycle: 'h23'` con un `% 24` de respaldo. Con `hour12: false`
hay motores que devuelven "24" a medianoche, y con ese 24 la fecha de servicio no retrocedía y los
agotados de la noche se limpiaban a las 00:00 en vez de a las 06:00.

## La línea que salía detrás de cada número (21 Aug 2026)

Era una pastilla vacía. Al pasar los destacados a runtime, cada fila salió del build con un
`<span class="item-tag item-tag-high" hidden>` esperando su etiqueta. El atributo `hidden` del
navegador vale `display:none` con especificidad (0,1,0) — y `.item-tag{display:inline-block}`
empata y va después, así que ganaba. Resultado: 326 pastillas vacías de 14×14 en color
`--accent-ink`, con su radio de píldora, justo detrás del badge del número. Medido: sin la regla
de abajo el elemento mide 14×14 con fondo `rgb(26,115,101)`; con ella, 0×0.

Se arregló sin querer, y eso es lo interesante: la regla `[hidden]{display:none !important}` que
metí para que la oferta pudiera ocultarse por atributo mató también estas pastillas. Un mismo
fallo de especificidad con dos síntomas — algo que debía verse y no se veía, y algo que no debía
verse y se veía.

## Alérgenos con iconos (21 Aug 2026)

El rótulo pasa de "Información sobre alérgenos" a **Alérgenos** con cuatro iconos debajo: trigo,
lácteos, frutos secos y pescado. Son cuatro de los catorce, elegidos por lo que de verdad se
pregunta en esta cocina — el trigo de los panes, los lácteos del paneer y el ghee, el anacardo de
los korma y kashmiri, y el pescado de los currys de gambas.

**No son una declaración de lo que lleva cada plato**, y la frase de al lado sigue diciendo que el
personal informa de cualquiera de los 14. Los iconos dicen de qué va el aviso, que es lo que hace
que alguien lo lea; el dato sigue estando donde estaba, en el personal. Un cliente alérgico al
sésamo no debe leer "aquí no hay sésamo" en la ausencia de un icono, y por eso la frase de los 14
se queda entera y en el mismo bloque.

Tabler Icons (MIT), trazo 1.75 como el resto. Cada uno lleva su nombre en un span sólo para
lectores de pantalla, traducido: Gluten / Lácteos / Frutos secos / Pescado. En `--muted` (5.78:1
sobre el chip) para acompañar al rótulo sin competir con él; el rótulo y el texto siguen en
`--ink` a 13.68:1. En móvil el bloque mide 232px de alto; en escritorio la palabra y los iconos
ocupan la columna de 180px y el texto los 939 restantes.

## Chilli Rush (21 Aug 2026)

Un minijuego de 30 segundos para el cliente que ya ha pedido y está esperando.

**Página aparte, no una sección de la carta**, y la razón es medible: la carta pesa 581 KB de
HTML y la abre todo el mundo; el juego lo abrirá una parte. Metido dentro, todos pagarían el
peso. Fuera, la carta no engorda ni un byte y el juego son 29 KB (10 KB comprimidos) que sólo
descarga quien pulsa. Se construye desde `gen.mjs` con `juego.mjs`, así que comparte los mismos
tokens, las mismas dos tipografías —ya en caché al llegar desde la carta— los mismos diccionarios
y la misma clave `totm-lang` de localStorage: el juego se abre en el idioma que el cliente ya
eligió, y volver a la carta no lo pierde.

**Reglas.** Chile +1, chile dorado +3, copo de hielo −2. El ritmo sube de 620 ms a 320 ms entre
apariciones y la vida de cada ficha baja de 1,5 s a 0,85 s a lo largo de los 30 segundos: empieza
regalado, porque el primer toque tiene que ocurrir sin pensar, y acaba apretando. El reloj se
calcula del tiempo transcurrido, no restando uno por vuelta, así que la partida dura 30 segundos
aunque el navegador ralentice los temporizadores. Salir de la pestaña a mitad termina la partida
en vez de dejar el marcador corriendo solo.

**El premio.** Objetivo, texto del premio y encendido salen de `estado.json`, del mismo panel que
todo lo demás. Con el juego apagado el enlace desaparece de la carta y la partida sigue siendo
jugable, sin premio: entretener al que espera no depende de que haya promoción.

Al ganar sale un código `CR-DDMM-PUNTOS-XXX` que el cliente enseña al camarero, y el panel tiene
una casilla para comprobarlo. **No es seguridad**: el secreto viaja en el JavaScript de la página
y cualquiera con la consola abierta puede fabricar uno. Sirve para lo que de verdad pasa en una
mesa —que alguien enseñe la captura de ayer— porque el código lleva dentro la fecha de servicio y
el panel la contrasta con la de hoy. El control real es el camarero mirando el móvil. La suma de
comprobación se ha verificado dando el mismo número en JavaScript y en la cuenta de PHP.

**Contraste, y un error que cometí.** El juego nació con texto crema sobre el teal vivo de la
marca: 2,11:1, un color que se ve pero no se lee — la página entera era ilegible. Ahora el texto
es navy sobre ese mismo teal, 7,58:1, que es el criterio con el que el pie de la carta ya había
acabado en navy. Y el tablero es navy sólido, no un velo sobre el teal: con el velo, la ficha
crema medía 2,61:1 contra el fondo, la dorada 1,69 y la de hielo 2,24 — piezas que hay que
encontrar y tocar en un segundo y que se confundían con el suelo. Sobre navy miden 16, 10,4 y
13,8. El "−2" usa el rojo de la oferta aclarado con la propia crema hasta 7,65:1, y el signo hace
de segunda señal para que nadie dependa del color.

El primer icono de hielo lo dibujé a mano y parecía un reloj de arena, que en un juego de 30
segundos es justo la confusión que no quieres. Ahora es el copo de nieve de Tabler, que todo el
mundo lee como frío sin que se lo expliquen.

**Fichas de 64 px (48 la dorada)**, por encima del mínimo táctil, y responden a `pointerdown`, no
a `click`: el toque tiene que contestar al apoyar el dedo, no al levantarlo. Sin canvas y sin
bucle de render — sólo `transform` y `opacity`, que es lo único que este proyecto se permite
animar, con `prefers-reduced-motion` quitando escalas y rebotes y dejando las opacidades.

**El juego se entrega APAGADO.** Encenderlo compromete al restaurante a pagar el premio, y esa
decisión no la toma el build.

## Ocho alérgenos, y una tuerca que llevaba una hora publicada (21 Aug 2026)

Los cuatro iconos pasan a ocho: gluten, lácteos, frutos secos, pescado, huevo, sésamo, mostaza y
sulfitos. Los ocho que de verdad se preguntan en esta cocina — el trigo de los panes, los lácteos
del paneer y el ghee, el anacardo de los korma, el pescado de los currys, el huevo de algunos
panes y postres, el sésamo del aceite de gingelly, la mostaza del tempering (que está en casi
todo) y los sulfitos del vino.

**El icono de frutos secos que publiqué hace una hora era una tuerca de tornillo.** El `nut` de
Tabler no es un fruto seco: es una tuerca hexagonal con su agujero. Lo extraje por el nombre sin
mirar el dibujo. Ahora es una nuez partida dibujada a mano en la misma gramática.

De los ocho, seis salen de Tabler (MIT) y dos están dibujados —frutos secos y mostaza— porque no
existen en el set. **Los diez candidatos se renderizaron a 84px y a 21px y se miraron antes de
elegir**, que es el paso que me faltó la primera vez. De ahí salieron tres descartes:

- La **almendra** para frutos secos se parecía demasiado a la hoja de la marca vegana, que está
  cuatro líneas más arriba en el mismo bloque. Ganó la nuez partida.
- La **gamba** no se lee a 21px en ninguna de las tres versiones que probé: es una raya curva con
  cosas alrededor. Un **cangrejo** aguantaba a 84px y se deshacía a 21.
- Por eso **faltan los crustáceos**, que es el hueco importante de la lista y lo digo en vez de
  taparlo con un dibujo que nadie descifra. Un icono que no se lee a su tamaño real no es un
  icono, es ruido. Si hace falta, habría que traer un glifo de otro set con licencia compatible.

Ocho a 21px con hueco de 8px son 224px: caben en una línea tanto en los 281 de un móvil de 375
como en la columna de 240 del escritorio. Contraste 5.78:1, por encima del 3:1 de un elemento
gráfico. Siguen sin ser una declaración por plato: la frase de los 14 y el «pregunta al personal»
no se han tocado.

## El panel, vestido como la carta (21 Aug 2026)

El panel tenía su propia paleta (`--base:#efebe0`), su propio `system-ui` y ningún contenedor.
Ahora es la carta puesta del revés: **la misma tarjeta crema, pero flotando sobre el navy de la
marca en vez de sobre el teal.** Mismo radio de 34px, misma sombra `--lift-card`, mismo juego
tipográfico —Bricolage para lo que se mira, Source Serif para lo que se lee—, misma escala
Fibonacci y la misma curva de movimiento.

**Los tokens y las tipografías ya no se copian: se comparten.** `gen.mjs` escribe
`server/admin/tokens.css` y `server/admin/fuentes.html`, y el PHP los enlaza. Antes había dos
verdades, que es como se acaba cambiando un color en la carta y dejando el panel con el viejo.
Ahora un cambio de token llega al panel en el siguiente build. `fuentes.html` se lee del disco
con `include`, así que el `.htaccess` lo deniega por HTTP; `tokens.css` sí se sirve, porque lo
pide el navegador.

Las pestañas son la barra de categorías de la carta: una fila con desplazamiento lateral y la
activa rellena en teal. Las filas de platos son las filas de la carta: nombre en Bricolage 600,
grupo en serif apagado, filete de 1px. La barra de guardar flota abajo como el botón de
categorías flota sobre el teal.

**Un fallo que me hice yo y que la maqueta cazó:** puse `overflow:hidden` en la tarjeta para que
nada se saliera de las esquinas redondeadas, y eso anula el `position:sticky` del buscador — un
ancestro con overflow oculto deja de ser el contenedor de scroll de referencia y el elemento se
va con la página. Medido: el buscador acababa en `top:-808` tras bajar 1200px. Sin la regla se
queda en `top:0`, y no se sale nada igualmente porque `.tools` lleva los márgenes negativos justos
del padding y la fila de pestañas se recorta ella sola.

Contraste medido sobre la crema: título 16:1, subtítulo 6.8, pestaña activa 5.2, inactiva 5.8,
rótulos 5.2, nombre de plato 16:1, grupo 6.8, agotado 5.2, contador 6.8. Objetivos táctiles de 44
en casillas y pestañas, filas de 60px.

## Por qué el panel parecía otra web al cambiar de pestaña (21 Aug 2026)

Porque lo era. Cada pestaña era un enlace `?t=ofertas`: una petición nueva, PHP volviendo a
montar la página entera con sus 326 filas, parpadeo en blanco, scroll al principio y medio
segundo de espera. La carta no hace eso — sus trece categorías están en el mismo documento y el
JavaScript sólo enseña una.

Ahora el panel hace lo mismo: los cinco paneles se renderizan siempre y un conmutador de treinta
líneas muestra el que toca. Medido en la maqueta: **13 ms por cambio y una sola navegación en
todo el recorrido** (`performance.getEntriesByType('navigation').length === 1` tras pasar por
cuatro pestañas). La URL se actualiza con `replaceState`, así que recargar cae en la misma
pestaña y el servidor sigue entendiendo `?t=` cuando vuelve de un guardado.

El único sitio donde se mantiene la recarga es la previsualización de precios, y ahí es lo
correcto: no es una pestaña, es un modo de confirmación. Mientras está abierta, la barra de
pestañas se oculta.

Coste: el documento pasa de ~40 KB a ~55 KB porque ahora viaja también el `<select>` de 326
platos y las 41 casillas de categoría. Es un panel privado que se abre desde el mostrador; el
cambio instantáneo entre pestañas vale más que esos 15 KB.

## La retícula de los formularios (21 Aug 2026)

Los campos eran cajas de 46px con borde gris y rótulo en minúsculas: un formulario de 2010 dentro
de una carta editorial. Ahora un campo es un rótulo pequeño en versales teal y una caja blanca de
56px sin borde — el blanco sobre la crema ya separa lo editable de lo que sólo se lee, y el filete
queda para el foco, que entra por dentro con `box-shadow` para no mover nada de sitio. Los
`<select>` llevan su propia flecha en SVG en vez de la del sistema.

Los días de la semana y los interruptores pasan a píldoras: la casilla del sistema desaparece y la
píldora entera es el objetivo, 46px de alto, con el estado en el relleno y un tick dentro. Las 41
categorías van en dos columnas con el mismo filete que las filas de plato, y el número de platos
baja a su propia línea en serif apagado.

Los tres porcentajes son ahora tres cifras de 24px en cajas de 72px de alto, en una sola fila: es
lo que se toca, y lo que se toca se hace grande.

Tres fallos que la maqueta cazó de un vistazo: al convertir las pestañas de `<a>` a `<button>` se
quedaron sin ninguno de sus estilos —el selector seguía siendo `.tabs a`— y la activa dejó de
distinguirse; el rótulo nuevo de la cabecera no tenía CSS y salía en serif; y los porcentajes se
partían en dos filas por un `flex-basis` de 90px que no cabía en 281.

## La fecha en la cabecera (21 Aug 2026)

"La carta de hoy" pasa a ser la fecha en cifras: **21/08/26**, con el nombre del restaurante encima
como rótulo pequeño. Es el dato que importa cuando abres el panel a mitad de servicio — saber de
qué día son los agotados que estás viendo. En cifras tabulares, para que no baile de ancho al
cambiar de día.

## El texto de alérgenos a ancho completo en tablet y PC (21 Aug 2026)

De 768px en adelante el texto usa el ancho entero del bloque con 18px a cada lado, y la
guionación se apaga. La medida acotada a 62ch dejaba el texto en una columna estrecha en medio de
un bloque ancho, y con la línea corta el navegador partía palabras —«perso-nal», «declara-dos»—
que es lo que se veía cortado. A ancho completo son 81 caracteres por línea y dos líneas, sin
partir ninguna.

Es una medida larga, más de lo que recomienda cualquier manual de tipografía. Se acepta porque
son tres frases que se leen una vez, no un párrafo en el que uno se instala.

En móvil no cambia nada: 21px de padding, 239px de texto, seis líneas y la guionación encendida,
que ahí sí hace falta.

Detalle de CSS que costó un intento: la regla base `.allergen-text` estaba escrita *después* del
bloque `@media (min-width:768px)`. Misma especificidad, gana la última, así que el
`hyphens:none` de dentro del media query no se aplicaba nunca. La corrección es un segundo media
query colocado después de la regla base, no subir la especificidad.

## Centrado y huecos de 24 (21 Aug 2026)

De 768px arriba el texto pasa a centrado y el hueco entre iconos de 8 a 24px. Con la línea a
ancho completo la última cae corta, y centrada equilibra el bloque; justificar ahí sólo servía
para estirar huecos entre palabras.

En móvil el hueco se queda en 10px, no en 24. Ocho iconos de 21px son 168px de dibujo y el bloque
deja 239px por dentro: con 24 de hueco harían 336 y la tira se partiría en 5+3, que queda
ranguada. 10px es el hueco más ancho que mantiene los ocho en una línea. El texto sigue
justificado ahí, que en una columna de seis líneas es lo que se veía bien.

**Tercera vez con el mismo error de orden en este bloque**, y ya van dos seguidas en la misma
sesión: escribí el `@media (min-width:768px)` antes de la regla base de `.allergen-icons`. Misma
especificidad, manda el orden, y la base lo pisaba — el hueco seguía midiendo 10 en escritorio.
El media query está ahora al final, después de las dos reglas base, y así se queda.

## La carta sobre navy (21 Aug 2026)

La página deja de ser el teal de marca y pasa al navy. La tarjeta crema flotando sobre oscuro
tiene más presencia, y es la misma relación que ya tenía el panel: fondo profundo, papel encima.

Dos cosas se rompieron al cambiarlo y hubo que medirlas:

- **El pie** iba en navy porque el fondo era teal. Sobre navy desaparece. Pasa a crema: 16:1.
- **El botón de Categorías** era navy con texto crema: sobre la página navy el botón se volvía
  invisible y sólo flotaba su texto. Pasa a crema con texto navy — el mismo papel que la tarjeta,
  en pequeño. El anillo de foco pasa de crema a teal por lo mismo.

El juego se queda de momento sobre el teal. Si la carta va en navy, lo coherente es que él también
vaya, pero eso es rehacerle la paleta entera y no se ha pedido.

## Traducir el premio mientras se escribe (21 Aug 2026)

Al teclear el premio en castellano, el inglés y el alemán se rellenan solos.

**Sin API y sin red.** Es un diccionario local: veinte frases completas de premio, veinticinco
sustantivos de carta y dos patrones — «X gratis / de regalo / invita la casa» y «N% de descuento».
Un traductor de verdad necesitaría un servicio externo, una clave y una petición por pulsación, y
este proyecto no tiene ninguna de las tres.

Lo que no reconoce **deja los dos campos en blanco y lo dice**, en vez de inventar una traducción
aproximada. Un premio mal traducido en la carta de un cliente es peor que uno sin traducir, porque
nadie se entera hasta que un alemán pide otra cosa.

Nunca pisa lo escrito a mano: en cuanto se toca el inglés o el alemán, ese campo deja de
rellenarse solo. Verificado — con «Free pint!» escrito a mano en inglés, el alemán siguió
actualizándose y el inglés no.

Dos fallos de composición que salieron al probar:

- «un helado de regalo» daba **«An ice cream free»**. En inglés *free* va detrás del artículo, no
  al final: ahora sale «A free ice cream», y el artículo lo decide *free*, así que «an» pasa a «a».
- «una copa de vino gratis» no encontraba nada. En la alternancia `un|una` el regex probaba `un`
  primero y se comía el principio de «una», dejando «a copa de vino». Se arregla exigiendo el
  artículo entero con su espacio y ordenando la alternancia de más largo a más corto.

## Fuera la traducción del premio (21 Aug 2026)

Retirada entera: el script, el aviso y su CSS. Los tres campos vuelven a escribirse a mano, con
la caída al castellano si inglés y alemán se dejan vacíos.

## estado.json ya no puede pisarse por descuido (21 Aug 2026)

En la carpeta de subida el archivo pasa a llamarse `estado-EJEMPLO.json`. Se renombra a mano en el
servidor la primera vez y después no se toca.

El motivo es una pregunta que se hizo en el momento justo: con una promoción corriendo, ¿sobrevive
a volver a subirlo todo? Sí — salvo que se suba `estado.json`, que es exactamente lo que hace un
FTP cuando se arrastra la carpeta entera. Ese archivo lleva dentro los agotados de hoy, los
destacados, la oferta en marcha y los precios cambiados, y el que salía del build los traía todos
vacíos y la oferta apagada. Con los nombres distintos, el accidente ya no es posible.

## Salir del demo es poner la contraseña (21 Aug 2026)

Antes había que editar `config.php`, subirlo y luego configurar la contraseña: tres pasos, dos de
ellos por FTP, y el primero fácil de olvidar. Ahora es un botón dentro del propio aviso rojo.

La regla cabe en una frase: **si hay contraseña, no hay demo.** `$demo` pasa a ser
`DEMO_SIN_CLAVE && ADMIN_HASH === ''`, así que en cuanto existe `clave.php` el modo demo se apaga
solo aunque `config.php` siga diciendo `true`. Poner contraseña y cerrar el demo dejan de ser dos
acciones que pueden desincronizarse. Volver al demo es borrar `clave.php`.

## El panel al ancho de la carta (21 Aug 2026)

`.page` pasa de 860px a los mismos 1570 con 13px de aire que usa `.container` en la carta. En 860
el panel dejaba media pantalla vacía en un portátil mientras las 326 filas se apretaban en 800px.
Medido a 1440: tarjeta de 1383 con 21px a cada lado, igual que la carta.

Con esa anchura, de 1200px arriba la lista de platos y la de precios van en dos columnas, como los
platos de la carta, con `break-inside:avoid` para que ninguna fila se parta entre columnas.
Verificado: filas en 110..685 y 740..1315.

## Ofertas por plato, y por qué «activa» y «no se ve» no se contradicen (21 Aug 2026)

La oferta ya no va sólo por categorías. La pestaña lleva ahora la misma lista de 326 platos que
agotados, con su buscador y su filtro, y guarda las claves sueltas en `offer.keys`. En la carta un
plato entra si su categoría está marcada **o** si su clave está en la lista. Los platos de una
categoría ya marcada salen atenuados y con la casilla bloqueada: ya están dentro, y dejar las dos
casillas vivas invita a pensar que hay que marcar las dos. Los 19 platos «Incluido» también, que
no tienen precio que rebajar.

Los días se centran.

**Y lo importante: la pestaña dice ahora en voz alta qué está pasando.** Arriba del todo, antes de
cualquier ajuste, hay una línea con la hora de Canarias, el día, la franja configurada y una de
tres frases: apagada / corriendo ahora mismo / guardada pero fuera de horario. Sin eso, «la oferta
está activa» en el panel y «no se ve nada» en la web parecen contradecirse, cuando casi siempre es
que la franja no está abierta o el día no está marcado. Un panel que no dice lo que el cliente
está viendo obliga a adivinar.

## Un archivo mío colado en el servidor (21 Aug 2026)

`_panel.html` es la maqueta con la que pruebo el CSS del panel sin PHP. La escribía dentro de la
carpeta de entrega para poder abrirla con el servidor de pruebas, y se me quedó ahí: acabó subida
al servidor del cliente. No hace daño —es una maqueta muerta, sin conexión con nada— pero es
público, confunde, y no tenía por qué estar. Borrado de la carpeta y hay que borrarlo del
servidor.

## El interruptor que no se veía (21 Aug 2026)

`estado.json` en el servidor traía la oferta entera bien guardada —categorías, 50%, franja
10:00-11:59, los siete días— y `"on": false`. Todo correcto y en la carta nada, que es justo el
fallo silencioso que una pantalla no debería permitir.

La causa es de diseño, no de código: encender y apagar se distinguían por el relleno de una
píldora entre otras cinco píldoras iguales, en medio de un formulario largo. Se puede guardar una
oferta completa sin registrar que el interruptor está en off.

Ahora es un interruptor de 64px con **tres señales a la vez**: la palabra («La oferta está
ENCENDIDA» / «APAGADA»), la posición de la bola y el color. Ninguna de las tres es sólo color.

Y al guardar con el interruptor apagado, el panel ya no lo cuenta como un aviso verde más: sale en
rojo y con todas las letras — «GUARDADO, PERO LA OFERTA ESTÁ APAGADA: en la carta no se ve ningún
descuento». Lo mismo con el juego.

Nota de método: al medirlo, la bola y el color parecían no cambiar. Era la transición — leer
`getComputedStyle` justo después del cambio devuelve el valor a mitad de animación. Con 400 ms de
espera, `matrix(1,0,0,1,24,0)` y teal encendido, `none` y gris apagado.

## Premio activo y reseña después (21 Aug 2026)

El encargo daba por hecho un contador de 5 minutos y unos estados «premio activo» y «premio
finalizado» que **no existían**: hasta ahora, ganar enseñaba el código y ahí acababa todo. Así que
esa pieza se ha construido, porque sin ella no hay dónde enganchar la reseña.

**Ganar y usar son dos cosas distintas.** Se gana jugando y se activa al pedir, con un botón por
medio: nadie quiere que el contador corra mientras el cliente sigue jugando. Al activar aparece la
pantalla que ve el camarero — qué premio es, el código y el reloj.

**El contador se guarda como una hora de fin absoluta, no como «quedan N segundos».** Con segundos
restantes, recargar o abrir otra pestaña regalaría tiempo nuevo. Con una hora de fin, todas las
pestañas leen el mismo instante. Verificado con dos pestañas reales: la segunda mostró 04:51 y el
mismo `fin` en milisegundos, no un 05:00 fresco. Recargar retoma donde estaba y un premio agotado
sigue agotado.

**La reseña no condiciona nada.** El premio ya está ganado y consumido cuando se pide la opinión;
no hay estrellas que elegir, ni captura que subir, ni vuelta desde Google que validar nada. Al
llegar a 00:00 se marca usado, se enseñan tres líneas de agradecimiento durante 3,2 s y se navega
con `location.assign`. Sin popups.

**El enlace es configuración del restaurante, no código.** Vive en `estado.json` bajo `review`
—`enabled`, `provider`, `url`, `redirectAfterReward`— y se edita desde el panel, con validación de
que sea una URL completa y `https`. La lógica del juego no menciona a este restaurante, ni bebidas,
ni chiles: el nombre del premio y el enlace salen del estado. Los minutos del premio también son
configurables.

Con las reseñas apagadas o sin enlace, al acabarse el premio sólo se ve «Premio finalizado» y no
se navega. Comprobados los dos casos, sin errores de consola.

Y una decisión que el encargo no cubría: si el cliente vuelve a abrir el juego horas después con
un premio ya agotado, se le enseña «Premio finalizado» y **no** se le manda a Google. Redirigir a
alguien que vuelve al día siguiente sería secuestrarle la visita, no pedirle una opinión.

**Tercer tropiezo con el mismo bache:** `/^https:\/\//i` dentro del template literal perdió las
barras invertidas y quedó como una regex rota que devolvía la cadena `^https:` — el navegador
acabó en `localhost:5188/%5Ehttps:/`. Ya había pasado con `{pct}` y con la guionación. Sustituido
por `u.slice(0,8) === 'https://'`, sin escapes, y añadido `scratchpad/audita.py`, que revisa el
JavaScript emitido en busca de barras invertidas supervivientes. Ahora mismo: cero en las dos
páginas.

## La nota de oferta, con prisa (21 Aug 2026)

«50% off, every day from 10:00 to 11:59 (Canary time)» pasa a «Por tiempo limitado: 50% de
descuento hasta las 11:59. ¡Aprovecha!».

Se van la hora de inicio, los días y la zona horaria. Era información correcta y aquí inútil: la
nota sólo existe mientras la oferta está corriendo, así que quien la lee ya está dentro de la
franja — no necesita saber cuándo empezó ni qué días se repite. Lo único que le sirve es cuándo se
acaba, y da la casualidad de que es también lo que empuja a pedir ahora.

**La hora de fin se queda**, y no por prudencia tipográfica: sin ella, un cliente que ve «50%» a
las 11:58 y pide a las 12:05 tiene una discusión con el camarero. Con ella, no.

Dos plantillas pasan a ser una, y el diccionario del runtime pierde los siete nombres de día que
sólo servían para la variante que ya no existe.

Detalle: la clave llevaba un apóstrofo («Don't miss it») dentro de una cadena con comillas
simples y rompía el módulo de traducciones. Se quedó sin apóstrofo en la clave —«Hurry!»— que es
sólo el identificador; el texto que lee el cliente es el traducido.

## Una sola banda de oferta, y que diga a qué se aplica (21 Aug 2026)

La nota iba bajo el título de cada categoría en oferta. Con dos o tres categorías repetía la misma
frase tres veces, y con platos sueltos aparecía bajo un epígrafe que no gobernaba los platos
rebajados — se veía en una captura: el aviso bajo SOPAS mientras había platos con descuento en
APERITIVOS.

Ahora es una banda roja, una sola, encima de las pestañas: se lee una vez y antes de elegir
sección, que es cuando todavía puede cambiar lo que alguien pide.

**Y nombra su alcance**, que es lo que la hace honesta: «50% de descuento en Aperitivos y Sopas
hasta las 11:59». Un «50% de descuento» a secas encima de la carta entera promete lo que no hay
cuando la oferta cubre dos categorías de trece. Con más de tres categorías, o con platos sueltos
por medio, enumerarlas deja de leerse y pasa a «platos seleccionados».

Los nombres de categoría salen traducidos: el build recoge el rótulo visible de cada una y lo
emite con sus tres idiomas. «Aperitivos y Sopas» / «Appetizers and Soups» / «Kleinigkeiten und
Suppen».

**Guard nuevo, a raíz de un fallo propio.** Las cadenas del runtime no pasan por `T()`, así que el
control de traducciones no las veía: añadí la frase nueva a los dos diccionarios pero olvidé
declararla en `RUNTIME_STRINGS`, y la banda salió en inglés en los tres idiomas sin que nada
avisara. Ahora el build recorre `RUNTIME_STRINGS` y revienta si a alguna le falta traducción.
Probado metiendo una cadena inventada: falla con «cadenas del runtime sin traducir: es / ui».

## Un botón por pestaña (21 Aug 2026)

La pestaña Juego tenía dos formularios con dos botones: uno para el juego y el premio, otro para
las reseñas. Cambiabas las dos cosas, pulsabas uno, y lo del otro se perdía sin decir nada — el
formulario que no se envía simplemente no llega al servidor.

Ahora es un solo formulario y un solo botón en la barra fija, como en las demás pestañas. Los dos
bloques se validan antes de escribir: o entran los dos o no entra ninguno, que es lo que espera
quien ha tocado las dos cosas y pulsa una vez. Verificado sobre el formulario real: un único envío
lleva `juego_on`, `objetivo`, `minutos`, los tres textos del premio, `resena_on` y `resena_url`.

El formulario de comprobar un código sigue aparte, y debe seguir: no guarda nada, sólo pregunta.

## El agujero del contador: nadie espera cinco minutos (21 Aug 2026)

El cliente gana, activa, el camarero valida el código al minuto dos… y a partir de ahí no va a
quedarse mirando un reloj tres minutos más. Se va a la carta o vuelve a jugar, y el momento de
pedirle la opinión se pierde. El contador está pensado para el camarero, no para el cliente.

Ahora hay dos caminos a la reseña, y el importante es el nuevo: un botón **«Ya me lo han dado»**
en la pantalla del premio. Cuando le traen la bebida es exactamente cuando tiene sentido preguntar
qué tal la experiencia. El reloj llegando a cero se queda como respaldo automático.

**Ese botón no consume el premio**, sólo lleva a la reseña. Si alguien lo toca antes de que le
sirvan, el código sigue vivo con su tiempo y volver al juego lo enseña otra vez — verificado: tras
pasar por la reseña y volver, el premio seguía en 04:34 con su código. Un botón que quita por un
toque de más algo que ya se ha ganado no merece la pena.

**La reseña se pide una vez por premio.** Al ir a las reseñas se marca `resena: true`; después el
botón deja de aparecer y, cuando el reloj llegue a cero, sólo se ve «Premio finalizado». Que te
pregunten dos veces por lo mismo es peor que no preguntar.

Queda un caso sin cubrir a propósito: si el premio expira mientras el cliente está en la carta,
la reseña no se pide. Un vencimiento en segundo plano no es un momento para preguntar nada.

## La escala de picante (21 Aug 2026)

«Niveles de picante: suave, ligero, medio, Madras, Vindaloo y Phall» era una frase donde los seis
nombres pesan lo mismo. Nada en ella dice que del tercero al sexto hay un salto que decide si
alguien cena o suda, y eso es justo lo que hay que saber antes de pedir un Phall.

Ahora es una escala: una barra que va del crema al granate y seis peldaños con sus chiles —cero,
uno, dos, tres, cuatro, cinco—. El número de chiles es la información; el color la acompaña pero
no la sustituye, porque entre el peldaño tres y el cuatro la diferencia de tono es la que es y hay
quien no la distingue.

El «suave» lleva el chile tachado de Tabler, no cero chiles: la ausencia se dibuja, no se deja en
blanco. Va en gris de texto secundario, porque no es un nivel de calor sino su falta.

El rojo de cada peldaño sale de una sola interpolación entre `--offer` y un granate, la misma que
pinta la barra. No es una paleta nueva: es el rojo que ya existía, estirado. Contrastes sobre la
crema: 3.51 el más claro y 9.94 el más oscuro, todos por encima del 3:1 de un elemento gráfico.

Se aplica sola a las cuatro categorías cuya nota empezaba por esa frase, y lo que venía detrás
—«Elige después una salsa…»— se queda como texto debajo. Para la nota que además enumeraba las
salsas clásicas, la traducción se ha reaprovechado de la que ya existía en vez de traducir otra
vez: dos versiones distintas del mismo texto es como se acaba con una carta que se contradice.

Seis columnas de tablet arriba, dos en móvil.

## Currys: los platos estaban repetidos (21 Aug 2026)

Lo estaban. La carta listaba los catorce ingredientes dos veces —una para las salsas clásicas y
otra para las del sur de la India— y las dos listas son idénticas: comprobado plato a plato,
**14 de 14 coinciden en nombre, descripción y precio**. Las salsas, en cambio, no se solapan en
nada: doce clásicas y siete del sur, sin un nombre repetido.

Así que la sección pasa a leerse como lo que es, una elección en dos tiempos:

    PASO 1 · Elige el ingrediente      14 platos
    PASO 2 · Elige la salsa            12 clásicas
    PASO 2 · Sur de la India           7 del sur

**No se ha quitado ningún plato: se ha quitado una copia.** Y para que eso no se convierta en un
agujero, la copia se declara en `CATEGORIAS_DUPLICADAS` y el build comprueba en cada compilación
que sigue siendo idéntica al original. Si algún día suben el precio del cordero sólo en una de las
dos listas, el build revienta con el nombre de la categoría. Enterarse ahí es barato; enterarse en
la mesa, no.

El guard que ya existía —«categorías con platos sin pestaña»— fue el que impidió que las catorce
desaparecieran en silencio al reagrupar. Hizo exactamente su trabajo.

La escala de picante baja al final del bloque de ingredientes, debajo de los platos 61 y 69, sin
filete que la separe: es la leyenda de lo que se acaba de leer, no una advertencia previa. Y se va
el «Elige después una salsa de la lista siguiente», que ahora lo dicen los pasos.

La carta baja de 326 a 312 platos y de 627 a 584 KB.

## El pie ficha clientes (21 Aug 2026)

«Todos los derechos reservados» pasa a «Si quieres tu carta **escríbenos** y te visitamos (Zona
Sur)», con la palabra enlazada a WhatsApp: `wa.me/34617798557`.

**El enlace lleva el mensaje ya escrito**, y en el idioma en que se está leyendo la carta: quien
pulsa no tiene que pensar qué poner, y eso es la mitad de un contacto. «Hola, me interesa una
carta digital como esta para mi restaurante» / la versión inglesa / la alemana.

El prefijo va en el número (+34) porque `wa.me` lo exige en internacional; sin él, un móvil
alemán no abre la conversación. Abre en pestaña nueva con `rel="noopener"`, subrayado, 32px de
zona pulsable sin romper la línea, y 16:1 sobre el navy.

«Zona Sur» no se traduce en ningún idioma: es un topónimo.

## El paso, dentro del título (21 Aug 2026)

`Paso 1 · Elige el ingrediente`, en la misma línea y con exactamente la misma tipografía que el
título —Bricolage 13px 600 con su tracking—, separados por un punto medio. Sólo cambia el color:
el paso en rojo, el título en teal, para que el ojo encuentre el orden sin que parezca un rótulo
de otra familia. Como eyebrow encima parecía una sección distinta.

## Dos «Paso 2» no eran dos pasos (21 Aug 2026)

Eran un paso con dos familias. Elegir salsa clásica o del sur de la India es la misma decisión;
lo que cambia es de qué lista.

Ahora el número se anuncia una vez, con lo que hay que hacer, y las familias van debajo:

    PASO 1 · ELIGE EL INGREDIENTE
      …14 platos…
      escala de picante

    PASO 2 · ELIGE LA SALSA
      SALSAS CLÁSICAS            12
      SALSAS DEL SUR DE LA INDIA  7

**Y la regla se deduce contando, no se configura.** El build agrupa por número de paso: si un paso
tiene un solo grupo, se anuncia dentro de su propio título («Paso 1 · Elige el ingrediente»); si
tiene varios, se anuncia en una línea propia y cada grupo enseña sólo el nombre de su familia.
Ningún restaurante tiene que numerar nada a mano ni acordarse de no repetir un número.

Sobre lo de que sirva para cualquier restaurante: el mecanismo no sabe nada de currys. Una
pizzería declara «Paso 1 · Elige la masa» y «Paso 2 · Elige los ingredientes» con dos familias
—vegetales y carnes— y sale igual. Un kebab, lo mismo con carne y salsa. Lo que sigue siendo de
cada restaurante es su carta: qué categorías tiene y cómo se agrupan. Eso no se puede genericizar
porque *es* el producto que vende.

El panel, en cambio, ya es genérico: lee `platos.json`, no menciona a este restaurante en ninguna
parte y funciona igual con 40 platos que con 326.

## Las salsas también se marcan (21 Aug 2026)

Sí: las 19 salsas están en `platos.json` y aparecen en el panel igual que cualquier plato.
Comprobado de punta a punta —marcar Korma como agotada y Tikka Masala como destacada— y en la
carta salen la bandera AGOTADO HOY con el nombre tachado al 45%, y la etiqueta EL FAVORITO junto
al icono. Es útil: «hoy no hay Korma» es exactamente el tipo de cosa que pasa en una cocina.

En Ofertas y Precios aparecen pero con la casilla bloqueada y el motivo escrito —«sin precio»—
porque son «Incluido» y no hay nada que rebajar.

**Un problema que salió al comprobarlo:** en el desplegable de Destacados, «Navratan Korma» salía
tres veces idéntico —está en verduras, en sin gluten y en vegano— y no había forma de saber cuál
se estaba destacando. En una lista de 313 opciones eso no es un detalle. Ahora, a los nombres que
se repiten se les añade su grupo; a los únicos no, para no alargar la lista sin motivo. Son 70
nombres repetidos de 187 distintos, así que el problema era la norma y no la excepción.

## La escala sin barra, y un filete corto entre familias (21 Aug 2026)

Fuera la barra de degradado del medidor de picante. Los chiles y el color de cada peldaño ya
cuentan la progresión; la barra a lo ancho, con la escala al final del bloque, se leía como un
separador de sección más que como parte de la escala.

Cada peldaño queda centrado sobre su propio eje: los chiles y el nombre comparten centro exacto
—desvío 0 en los seis, medido a 375 y a 1280—. En móvil son tres filas de dos; en escritorio, una
de seis.

Entre las dos familias de salsas, un filete de 96px centrado. Uno de lado a lado partiría la
sección en dos, y no son dos secciones: son dos listas de lo mismo dentro del mismo paso. A 1280
ocupa el 8% del ancho de la tarjeta; en móvil, algo más de un cuarto, que es donde tiene que
notarse.

## Un premio por móvil y día, y códigos de un solo uso (21 Aug 2026)

Dos agujeros distintos, cerrados por separado.

**En el móvil.** El premio se apunta al GANAR, no al activar. Antes «Activar premio» y «Otra vez»
estaban uno al lado del otro: se podía seguir jugando hasta que saliera bien y activar cuando
conviniera. Ahora ganar cierra el día — el botón de reintentar desaparece, la pantalla dice «Ya
has jugado hoy», y recargar devuelve a la misma pantalla con el premio pendiente de activar.
Perder no cuenta: se puede reintentar todo lo que se quiera hasta ganar una vez.

Verificado: tras ganar, la pantalla de resultado sólo ofrece «Activar premio» y «Volver a la
carta», y el premio queda guardado con `fin: null` a la espera de activarse.

**En el panel.** Comprobar un código es canjearlo. Se hace en el mismo gesto porque el camarero
lo comprueba justo cuando va a dar la bebida, y pedirle dos toques en el mostrador es pedirle que
no lo use. El segundo intento contesta «Este código YA SE CANJEÓ hoy a las 13:42», con la hora. La
lista de canjeados del día sale debajo, y se limpia sola: el código lleva el día dentro y los que
no son de hoy se tiran al guardar.

**Lo que sigue abierto, y es a propósito:** el modo incógnito, otro navegador o un segundo móvil
dan premio nuevo el mismo día. Cerrar eso exige identificar al cliente, y nadie va a dar su
teléfono por una bebida. El filtro ahí es el camarero, que ve quién está sentado en la mesa. Lo
que se ha quitado es la tentación de un toque, que es lo que ocurre de verdad.

## La escala, con el formato de la leyenda (21 Aug 2026)

Cada nivel pasa a ser icono + nombre en horizontal, alineado a la izquierda, con exactamente el
mismo formato que la línea de «Hay versión vegana»: Source Serif 13px en gris apagado y el icono a
14px. Lo único que cambia es que los chiles van en rojo, porque aquí el color **es** el dato.
Verificado comparando los estilos computados con los de `.legend-item`: misma familia, mismo
tamaño, mismo icono. Una fila en escritorio, tres en móvil.

**Y el «suave» deja de llevar el chile tachado.** Tenía razón el cliente: un chile tachado dice
«no lleva picante», y suave es poco, no nada. La escala va ahora de uno a seis chiles. Quien no
quiere picante no elige un nivel: elige otro plato.

## Fuera los pasos y el filete (21 Aug 2026)

El sistema de «Paso 1 / Paso 2» se retira entero: la marca en GROUPS, la lógica que contaba
grupos por paso, el rótulo dentro del título y su CSS. También el filete de 96px entre familias.

La sección de currys queda con tres títulos y nada más:

    ELIGE EL INGREDIENTE
    SALSAS CLÁSICAS
    SALSAS DEL SUR DE LA INDIA

El motivo es escalar: cada mecanismo que hay que configurar a mano es trabajo por cada
restaurante nuevo, y el orden ya lo dice el propio rótulo del primer grupo. Un título que se
explica solo vale más que una numeración que hay que mantener.

Comprobado: cero rótulos de paso, cero filetes generados, y el CSS muerto retirado —quedaban dos
reglas huérfanas después del primer barrido—.

## Temas de marca (selector de colores en el panel)

`temas.mjs` es ahora la fuente de los colores. Cada tema son **tres semillas** —`ink` (fondo
de pagina y texto sobre la tarjeta), `surface` (la tarjeta) y `seed` (el unico color
saturado; pinta la pagina del juego y de el se oscurece `accent` hasta que se lee sobre la
tarjeta)— y los otros doce valores se derivan: `muted`, `border`, `chip` y `hairline` son
`ink` a distintas opacidades sobre `surface`, y el velo y las tres sombras, `ink` con alfa.

Seis temas: marino (el de produccion), terracota, bosque, carbon, vino y arena. `marino`
lleva `accent` y `hairline` fijos a los valores que ya estaban publicados, para que la carta
en produccion no se mueva ni un punto por la refactorizacion; el resto de sus tokens los
reproduce la derivacion exactamente.

`verificar()` corre al principio del build y lanza si una sola pareja real baja de su umbral
—titulares 7:1, texto y acento 4.5:1, filetes 1.3:1, mas el rojo de oferta contra cada
tarjeta—. Por eso el panel ofrece temas cerrados y no un `input type=color`: con hex libre no
se puede garantizar que la carta se lea.

Dos colores no se tematizan: el rojo `#C62828` (oferta y picante) y los del minijuego, porque
son semanticos. De paso desaparecieron los tres navy escritos a mano que quedaban
(`rgba(2,27,49,...)` en la barra pegada de la carta y en dos fondos del juego): ahora salen
del tema con `color-mix` y una regla de respaldo delante.

El tema elegido viaja en `estado.json` como `theme`. Como `estado.json` llega por fetch —es
decir, despues de pintar— se guarda ademas en `localStorage` y un script de dos lineas en el
`<head>` lo aplica antes del primer pintado; si no, se veria medio segundo de los colores de
la casa en la primera pantalla del restaurante. La primera visita de todas sigue viendo ese
instante: evitarlo del todo obligaria a reescribir el HTML en cada cambio.

En el panel es la pestana **Marca**, la ultima a proposito: se toca una vez y las otras cuatro
cada dia. Cada opcion es una carta en miniatura con los colores reales del tema —un cuadrado
de color no dice nada de como va a quedar— y al marcar una, el panel entero se repinta al
momento mientras el contador de la barra avisa en rojo de que aun no esta guardado.

`gen.mjs` escribe `server/admin/temas.json` con los temas ya derivados para que el PHP no
repita la aritmetica de contraste. Anadir un tema nuevo para un cliente son tres colores y
una entrada en `TEMAS`.

## La nota de Google al final de la carta

Ultimo bloque de la tarjeta, encima del pie: la nota grande, cinco estrellas macizas en el acento
del tema y debajo el texto "+180 resenas positivas en Google". Va al final y no arriba a proposito: quien lee esto ya esta
sentado, asi que la prueba social no le sirve para elegir restaurante — le recuerda que puede
dejar una resena. Si hay enlace de resenas configurado en la pestana Juego, el bloque lleva a
el; si no, deja de ser un enlace en vez de quedarse como un enlace roto.

Todo sale de `estado.json` (`reviews`: `on`, `rating`, `count`, `names`) y nada del build. Una
carta recien montada arranca apagada y a cero: no puede heredar la nota de otro restaurante.
El separador decimal se formatea por idioma (4.9 en ingles, 4,9 en castellano y aleman).

**No se pide a Google en vivo.** La Places API necesita clave con facturacion y un proxy en el
servidor, porque el navegador no puede llamarla directamente; para un dato que se mueve dos
veces al ano no compensa. Queda como ampliacion: un PHP que cachee la respuesta un dia.

Sin circulos de caras: se probaron con la inicial de cada resenante y se quitaron. Poner
fotos de banco de imagenes junto a "resenas reales" seria inventarse clientes, y mantener a
mano una lista de nombres por restaurante es trabajo recurrente que no paga lo que aporta.

En el panel, dentro de la pestana **Marca** y con **un solo boton de guardar** para colores y
opiniones. Dos formularios en la misma pantalla ya hicieron perder datos una vez (juego y
resenas): no se repite.

## Buscador de platos, filtros y gestos (auditoria 21st.dev)

Cinco cambios, todos portados a mano: el catalogo de 21st.dev es React + Tailwind + shadcn y
aqui no hay ni React ni bundler. Instalar uno solo obligaria a meter los tres y a convertir
61 KB de gzip en mas de 200 KB de JS sobre la wifi de un restaurante. Lo que se ha tomado de
alli es el patron, no el paquete.

**1. Buscador** (referencia: `originui/command`). Vive dentro de la hoja de categorias, no en
una pantalla propia: la hoja ya es el sitio al que se va cuando no sabes donde esta algo y ya
se abre con un gesto conocido. No hay indice ni copia de la carta — las 312 filas ya estan en
el DOM con su numero, su precio, sus marcas y su estado, asi que buscar es recorrerlas: cero
peticiones y cero datos anadidos. Busca por nombre y por numero, sin tildes y sin mayusculas.
Tope de 60 resultados; el resto se anuncia en vez de truncarse en silencio. Tocar uno abre su
pestana, cierra la hoja y deja el plato centrado con un destello de 1,4 s.

**2. Filtros con contador** (referencia: `cnippet.dev/v-toggle-10`). Tres chips: vegano, sin
gluten, en oferta. El numero de cada uno **no es el total de la carta**: es cuantos platos
anadiria ese chip dentro de lo que ya esta filtrado por los otros. Un contador que promete 53
y entrega 10 es peor que no ponerlo. Un resultado vacio distingue sus dos causas —no existe,
o lo escondio un filtro— y en el segundo caso ofrece quitarlos.

No hay chip de "suave": el nivel de picante no esta por plato en los datos, es una leyenda de
seccion. Ponerlo obligaria a marcar 312 platos a mano y a repetirlo en cada restaurante.

**3. Arrastre de la hoja** (referencia: `coss.com/drawer`, que va sobre vaul). Sin importar
vaul: seguimiento 1:1 del dedo, cierre por velocidad ademas de por distancia —un golpe seco
basta— y resistencia elastica al tirar hacia arriba en vez de una pared invisible. Solo por
debajo de 768 y solo sin `prefers-reduced-motion`: ahi la hoja aparece con opacidad y sin
desplazarse, y arrastrarla seria justo el movimiento que se ha pedido no tener.

**4. Pulgar en el selector de idioma** (referencia: `ddoemonn/segmented-control`). El fondo
del idioma activo se desliza en vez de saltar. Es un elemento aparte porque un `background` no
se puede animar de un elemento a otro; los botones llevan `position:relative` para pintarse
por encima —sin eso la etiqueta activa desaparece debajo del pulgar— y sin JS el color vuelve
al boton, asi que el control sigue leyendose.

**5. Peso variable en las pestanas** (referencia: `micka_design/tabs-subtle`). Antes la
pestana activa y las demas pesaban lo mismo y solo cambiaban de color y subrayado. Ahora 500
en reposo y 800 activa, recorriendo el eje. Hizo falta cambiar la peticion de fuentes de tres
instancias sueltas (`400;600;800`) al eje continuo (`400..800`): una variable pesa menos que
tres estaticas. La diferencia de ancho medida es de 5 px sobre 188, absorbida por el
autocentrado del chip.

**La lupa de escritorio.** Por encima de 767 no existe el boton flotante —ahi las pestanas se
ven todas— pero buscar hace falta a cualquier ancho. Se anadio una lupa a la derecha de la
barra de pestanas, que es la que se queda pegada arriba. Icono solo: un rotulo cambia de ancho
en cada idioma y arrastraria con el los tres desplazamientos que le hacen sitio
(`nav-arrow-next`, el degradado y el padding del scroller). Abierta desde la lupa se enfoca el
campo; abierta desde el boton flotante NO, porque en un movil eso levanta el teclado y tapa
media hoja antes de que nadie haya pedido escribir.

De paso, la hoja se limita a 520 px y se centra por encima de 768: hasta ahora solo existia en
el movil y ocupar 1570 px de ancho no es una hoja.

Coste: +25 KB en el HTML, +8,6 KB en gzip. Sin dependencias.

**Descartados con nombre y motivo**: `ravikatiyar162/menu-item-card` (tarjeta con foto y boton
ADD: no hay fotos de 312 platos ni pedido online), `originui/stepper` (es el sistema de pasos
que se quito a proposito para escalar), `ruixen.ui/rating-scale-group` (NPS de encuesta; la
escala de chiles dice mas), `ddoemonn/scroll-spy` y `inference-sh/table-of-contents` (las
categorias son paneles, no secciones de un scroll), `ruixen.ui/capsule-tabs` (pagina con
flechas: peor que el scroll nativo para 13 categorias en un movil), `sshahaider/floating-header`
(la barra ya es sticky con backdrop-filter).

## Prioridad 3 y arreglo de la lupa

**La lupa se superponia a las pestanas.** Flotarla encima con un hueco de padding no bastaba:
el scroller seguia pasando por debajo y las pestanas asomaban alrededor del boton, porque el
degradado que deberia taparlas se quedaba a su izquierda. Por encima de 768 la barra pasa a
ser una fila —`display:flex`— y el scroller termina de verdad antes del boton. Las flechas si
siguen superpuestas, que es lo que son: un control sobre el scroller, no un vecino; se corren
a `calc(40px + var(--s2))` para caer justo en su borde derecho. Medido: scroller hasta 888,
flecha acabando en 888, lupa desde 901. Trece pixeles de aire por los dos lados.

**El filete de seccion, editorial** (referencia: `reshaped/reshaped-divider`). El rotulo ya no
lleva una raya debajo de punta a punta: la raya sale de el y llega al margen, a la altura de la
linea, como en una revista o en una carta impresa. Es un `::after` que es un item flex mas, asi
que se estira solo. Devuelve peso al rotulo, que lo perdia bajo una raya de lado a lado
repetida 37 veces en la misma pagina.

**La banda de oferta entra en vez de aparecer.** La franja se abre y se cierra sola con el reloj
del restaurante, asi que una carta abierta desde hace rato ve materializarse la banda encima
del texto a mitad de lectura. Ahi una entrada tiene trabajo: no adorna, evita el salto. Opacidad
y 6px de desplazamiento, 340 ms, una sola vez — `render()` pasa cada treinta segundos y se
comprueba si la banda ya estaba visible antes de reiniciar nada.

**El punto con pulso, descartado.** Era la otra sugerencia de Prioridad 3 (`edwinvakayil/status-dot`).
La banda ya es una franja roja centrada a todo lo ancho con un reloj al lado: un punto no anade
informacion, compite con el icono que ya hay, y un pulso que no para es movimiento perpetuo,
que este proyecto no se permite. La entrada de arriba resuelve lo mismo —que se note que algo
esta corriendo— sin dejar nada moviendose mientras se lee.

### El chip de oferta se esconde solo

Los tres chips no salen del mismo sitio y eso se notaba. Vegano y sin gluten son una propiedad
del plato, derivada en el build de las cartas Vegan y Gluten Free del propio restaurante: se
normaliza el nombre de cada plato de esas dos listas y se marca el gemelo de la carta principal
si existe. Nunca se inventa nada, y la marca dice "hay version de este plato", no "este plato
es" — son elaboraciones distintas y con precios distintos, y para una alergia esa distincion es
lo unico que importa.

La oferta, en cambio, es un estado de la hora que enciende y apaga el panel. Fuera de su franja
el chip marcaba cero y no hacia nada. Ahora se esconde cuando no hay ninguna oferta viva y
vuelve solo cuando la hay. Se comprueba si existe ALGUNA oferta, no cuantas quedan dentro de
los otros filtros: con "vegano" puesto y ningun vegano rebajado, la oferta sigue existiendo y el
chip tiene que seguir ahi. Y si la franja se acaba con el filtro puesto, el filtro se quita solo
— si no, la lista se quedaria vacia sin nada en pantalla que explicara por que.

`display:inline-flex` gana al `[hidden]` del navegador, asi que hizo falta la regla explicita.
Es la segunda vez en este proyecto: la primera dejo 326 pildoras vacias detras de cada numero
de plato.

## La cabecera: un racimo de controles arriba a la derecha

El idioma era una fila de tres pildoras centrada bajo el titulo: unos 65 px de alto en un
movil para un control que se toca **una vez por visita** y no se vuelve a mirar. Ahora es un
`<select>` nativo en la esquina, junto al reloj de previsualizacion y —de 768 para arriba— la
lupa. Esos 65 px son platos.

El `<select>` es nativo a proposito: en el movil abre la rueda del sistema, que nadie tiene que
aprender, y en escritorio el menu del navegador. Uno propio serian mas lineas, peor teclado y
peor lector de pantalla a cambio de nada. Las opciones llevan **cada idioma escrito en su
idioma** —English, Espanol, Deutsch— y no codigos de dos letras: un aleman busca "Deutsch", no
"DE". La flecha va como imagen de fondo porque un select no admite pseudoelementos, y es el
unico sitio del proyecto donde un color esta escrito a mano en vez de salir de una variable.

Con esto desaparece el pulgar deslizante que se habia montado hace unas horas. Era una mejora
sobre tres pildoras; un desplegable que no ocupa fila es una mejora sobre las tres pildoras y
sobre el pulgar.

**La lupa se muda de la barra de pestanas a este racimo.** Se gana coherencia —los tres
controles de la carta en el mismo sitio— y se deja de pelear con el scroller. No se pierde
nada: la barra solo es sticky por debajo de 768, y ahi la lupa no sale, porque el boton
flotante de categorias ya abre la misma hoja y esta siempre a un dedo.

**Mismo aire por arriba que el panel.** La carta empezaba a 13 px en movil y 89 en escritorio;
el panel, a 34 y 55. Dos pantallas de la misma marca empezando a alturas distintas. La carta
adopta las del panel.

**El juego se queda con sus pildoras.** Alli el selector comparte fila con el enlace de volver,
asi que no cuesta ni un pixel de alto, y un control de un toque gana a un desplegable de dos.
La regla no es "el mismo widget en todas partes", es "el widget que corresponde al sitio".

## Imagen de cabecera

Hueco opcional y autodetectado: el build busca en `assets/` un archivo llamado `hero` con
extension avif, webp, jpg, jpeg o png, en ese orden. Si existe, la carta abre con el; si no, no
hay bloque, ni hueco vacio, ni imagen rota. Un restaurante sin foto no arrastra un placeholder
y uno con foto no toca una linea de codigo.

Caja **2:1 fija** con `object-fit:cover`. Reservar el hueco antes de que llegue la foto es lo
que evita que la carta entera de un salto al cargar, y de paso deja que el original venga en la
proporcion que sea: recorta el navegador. En movil son 150 px de alto; a 1570, unos 730.

El margen lateral sale de la **misma regla** que el de los platos: la figura comparte la clase
`.food-menu-tab` con el contenido, asi que los cuatro breakpoints no pueden separarse cuando
alguien toque uno. Medido: 34 px en movil y 55 en escritorio, identicos a los de la primera
fila de platos.

Va **debajo** del racimo de controles, no detras: reloj, lupa e idioma son cremas y grises
pensados para papel y sobre una foto que no controlo no se puede garantizar que se lean. Con
foto, la tarjeta baja su relleno superior de 89 px a los 56 justos para que el racimo no se le
eche encima — con doble clase, `.food-menu-tab-wrapper.has-hero`, porque la regla de los
breakpoints va mas abajo en el archivo y con la misma especificidad ganaria por orden de
origen.

Un solo archivo, no un `srcset`: aqui no hay pipeline de imagenes que genere los tamanos, y
prometer tres fuentes que en realidad sirven el mismo archivo es peor que no prometerlas.

Entra con un fundido; se comprueba `complete` por si el navegador ya la tenia en cache y el
`load` no llega a dispararse, que dejaria la foto invisible para siempre. Si falla la carga, el
bloque se oculta en vez de dejar el icono roto.

El `alt` es generico y traducido —"Foto del restaurante"— a proposito: describir cada foto
obligaria a escribir y traducir un texto por cliente, y en una carta la informacion son los
platos, no la fotografia.

## Carrusel de portada, con subida desde el panel

La foto de cabecera pasa de una sola detectada en el build a **hasta cinco que sube el
restaurante**. El cambio de fondo no es el numero: es de donde salen. Antes eran un archivo en
assets que solo yo podia poner; ahora viajan en `estado.json` y las gestiona el cliente, que es
lo unico que escala a mas restaurantes.

**El desplazamiento es scroll nativo con scroll-snap.** Sin libreria y sin JS para el gesto: en
un movil eso da la inercia del sistema, que ninguna implementacion propia iguala, y en un
navegador viejo degrada a una tira que se arrastra. El JS solo pinta las fotos, mueve los
puntos y atiende a las flechas —que aparecen solo con raton, porque con el dedo estorban.

**No se pasa solo.** Un carrusel automatico es movimiento perpetuo en la primera pantalla de
algo que se lee durante minutos, y ademas roba el control: la foto que te interesaba se va
sola. Se pasa con el dedo o no se pasa.

La primera foto lleva `fetchpriority="high"` —es el elemento mas grande de la primera
pantalla— y las otras cuatro `loading="lazy"`: nadie paga por descargar cuatro fotos que quiza
no mire. La caja es 3:2 fija, asi que el hueco esta reservado antes de que llegue nada y la
carta no da un salto al cargar.

### La subida

Una carpeta que acepta archivos de fuera es la puerta clasica de entrada a un servidor, asi que
no se confia en nada de lo que llega:

- **El tipo no sale del nombre ni de la cabecera que manda el navegador**, que las escribe quien
  sube. Sale de mirar los bytes con `getimagesize()`, que de paso confirma que el archivo es una
  imagen y no un `.php` disfrazado.
- **La extension la pone el panel** a partir de ese tipo. El nombre original se tira entero:
  puede traer barras, puntos o nombres reservados de Windows.
- **El nombre nuevo es aleatorio** (`random_bytes`), asi que no se puede adivinar una URL ni
  pisar un archivo existente.
- **Un `.htaccess` en la carpeta apaga la ejecucion**, por si algo de lo anterior fallara algun
  dia. Todo dentro de `<IfModule>`: `php_flag` solo existe con mod_php y suelto devolveria un
  500 en toda la carpeta de imagenes en un servidor con PHP-FPM. Un guardian que tumba el sitio
  no es un guardian.
- Borrar comprueba que el nombre este en la lista del estado antes de tocar el disco. Sin eso,
  un `../../` borra lo que quiera.

**Limite de 1 MB por foto**, comprobado en PHP y no solo en el `MAX_FILE_SIZE` del formulario,
que es un aviso al navegador y no una defensa. Tambien se rechazan las de menos de 800 px de
ancho: en una pantalla grande se verian borrosas.

Y se detecta el caso en que **el servidor tira el envio entero** por superar `post_max_size`:
ahi PHP deja `$_POST` y `$_FILES` vacios, el token de sesion tampoco llega, y sin esta
comprobacion el panel diria "la sesion ha caducado" y el cliente no entenderia nada.

### En el panel

Pestana Marca, encima de los colores. Una fila por foto con su miniatura, su posicion y tres
botones: subir, bajar y quitar. **Sin boton de guardar**: subir y quitar son acciones que pasan
al momento, no ajustes que se editan y se confirman, asi que no hay nada que se pueda olvidar
de pulsar. Es la diferencia con el caso de juego y resenas, donde si habia dos formularios
editando ajustes y guardar uno perdia el otro.

## El selector de idioma y los controles sobre la foto

El `<select>` nativo dura poco: se sustituye por un desplegable propio, puerto del componente
`language-selector-dropdown` de 21st.dev (@samsiavoshian2009). Alli es React + Tailwind +
lucide + shadcn; aqui es el mismo dibujo sin ninguna de las cuatro cosas, porque instalarlas
costaria mas JS que toda la carta junta. Solo los tres idiomas del proyecto.

Lo que se gana: el mismo control en los tres sistemas, con la letra, los radios y los colores
de la carta. Lo que se paga: abrir, cerrar al elegir, cerrar al tocar fuera, cerrar con Escape,
recorrer con flechas y devolver el foco al boton hay que escribirlo — el nativo lo daba gratis.
Sin JS, el desplegable se convierte en la lista entera visible: los tres idiomas siguen siendo
alcanzables aunque el script no llegue nunca.

El cierre al tocar fuera escucha `pointerdown`, no `click`: con `click`, arrastrar la carta con
el menu abierto lo dejaba abierto hasta soltar el dedo.

Las banderas son un atajo discutible —un idioma no es un pais— pero en un selector de tres, con
el nombre escrito al lado en su propio idioma, el nombre manda y la bandera solo ayuda a
encontrarlo de un vistazo. Ingles lleva la del Reino Unido: en una terraza de Canarias el
turista que lee ingles es britanico casi siempre. **Windows no dibuja banderas emoji** y las
enseña como dos letras (ES, GB, DE); es un fallback razonable y solo lo ve el 2% que entra
desde un ordenador.

### Los controles, encima de la foto

Con fotos, el racimo se mete 13 px dentro de la esquina superior derecha de la imagen.
Alinearlo con el margen del contenido lo dejaria pegado al borde de la foto, que no es "mismo
margen": es tocarse. Y como debajo puede haber cualquier cosa, dejan de ser cremas planas y
pasan a ser vidrio —fondo al 78% mas desenfoque—, que es como se resuelve un control sobre una
foto que no controlas. Con `prefers-reduced-transparency` se sirve solido.

### Una calle, una variable

El margen lateral de la tarjeta vivia repetido en cuatro breakpoints. En cuanto algo mas quiso
alinearse con el —la foto primero, los controles despues— empezaron a descuadrarse por turnos:
a 1024 el racimo se salia 8 px de la foto porque su regla saltaba en 1200 y la del contenido en
1199. Ahora la calle es `--gutter`, los breakpoints solo la cambian, y todo lo que se alinea la
lee. Medido a 375 y a 1024: foto, platos y racimo cuadran en los dos.

## Ajustes de portada

**Fuera el reloj de previsualizacion.** Servia para enseñar la oferta fuera de su franja cuando
no habia panel; ahora las ofertas se encienden, se apagan y se previsualizan desde admin, asi
que era un boton en la esquina de la carta del cliente que solo entendia el comercial. Se fue
entero: marcado, CSS, el `offerOverride` que forzaba el estado y la rama que lo leia. `offerOn()`
vuelve a ser lo que dice su nombre: el reloj del restaurante y nada mas.

**La foto ya no usa la calle del contenido.** Usa el mismo aire que deja la tarjeta por arriba
—13— y lo mismo por los lados: un marco igual por los tres. Una portada tiene mas presencia
pegada al borde que metida en la columna de texto. Por eso perdio la clase `.food-menu-tab`,
que es justamente la que da la calle del contenido.

**El paginador, dentro de la foto.** Fuera se comia una franja de tarjeta para tres puntos y
separaba la portada del titulo. Dentro no cuesta un pixel de alto. Sobre una imagen que no
controlo hacen falta las dos cosas: punto claro y sombra suave debajo, porque un punto crema
sobre un cielo blanco no existe.

**Las banderas, dibujadas y no emoji.** Windows no incluye NINGUNA bandera en su fuente de
emoji: donde iOS y Android pintan la bandera, Windows enseña las dos letras del codigo de pais.
No es un fallo del navegador ni se arregla con otra fuente; es una decision de Microsoft desde
hace años. Tres SVG de 200 bytes se ven igual en los cinco sistemas. Sus colores son la unica
excepcion a la regla de no meter colores fuera del tema: una bandera con los colores de la
marca deja de ser una bandera. Llevan un borde de un pixel porque las que tienen blanco en el
canto —la del Reino Unido— se derraman sobre la crema sin el.

## La barra de desplazamiento

La esquina superior derecha de la hoja parecia cortada, y no era el radio: la barra del sistema
se dibuja pegada al borde derecho y tapa justo esa esquina. El radio siempre estuvo ahi —21 px,
medido— pero no se veia.

Ahora la barra es del tema. La canaleta, transparente, deja pasar el fondo del panel con su
radio; la pastilla va metida hacia dentro con el truco del borde transparente mas
`background-clip:content-box`, asi que nunca llega a la esquina. Color: el texto al 24%, y al
42% con el raton encima.

Se declara dos veces a proposito: `scrollbar-width`/`scrollbar-color` para Firefox y
`::-webkit-scrollbar` para Chrome y Safari. Cada navegador coge la suya.

La barra de la pagina lleva el mismo tratamiento en crema al 30%: sobre el navy, la gris del
sistema era lo unico en pantalla que no habia elegido nadie. Es el punto de "scrollbar
coherente" que pedia el pliego.

### Subida de varias fotos a la vez

El selector acepta ahora varias de golpe, hasta llenar las cinco plazas. Si se eligen mas de
las que caben, **entran las que quepan y se dice cuantas se han quedado fuera**: rechazar el
envio entero porque sobra una es peor, porque el cliente ya ha esperado toda la subida.

Con varios archivos PHP no da una lista de archivos: da un archivo cuyos campos son listas
—`$_FILES['foto']['name']` es un array, `['size']` es otro— y hay que recomponerlos por indice.
Es una de las formas mas raras de la biblioteca estandar y la fuente de la mitad de los fallos
de subida multiple. `hero_archivos()` normaliza las dos formas, la simple y la multiple.

Un selector vacio manda igualmente una entrada con `UPLOAD_ERR_NO_FILE`; se descarta antes de
contar nada, o una plaza libre se convertiria en un error inventado.

El resultado es un solo mensaje con todo: cuantas entraron, cuantas se quedaron fuera por falta
de sitio, y el motivo de cada una que fallo con su nombre delante.

Y una advertencia en el panel: cinco fotos de 1 MB son 5 MB en un solo envio, y hay hosting
compartido con `post_max_size` por debajo de eso. Si el servidor lo rechaza, la comprobacion de
POST descartado ya dice el limite real; el texto ademas sugiere subirlas de dos en dos.

### El panel en blanco tras subir o borrar una foto

Los tres manejadores de fotos hacian `$lista = ...` para la lista de fotos. `$lista` es el
**catalogo de platos** y lo lee el panel entero: `if (!$lista)`, y siete `foreach ($lista as $p)`
repartidos por las pestanas. Despues de cualquier accion sobre fotos, el panel intentaba pintar
312 filas recorriendo nombres de archivo, y la pagina se cortaba justo detras de las pestanas.

Es un fallo que PHP no puede avisar —asignar una variable es legal— y cuyo sintoma aparece
lejos del sitio: el error esta en un manejador y lo que se rompe es la plantilla que se pinta
despues. Renombrada a `$hero` en los tres, y el catalogo lleva ahora un comentario que dice que
ese nombre no se toca.

Y una comprobacion nueva, `globales.py`, que recorre el bloque `if ($csrfOk) { ... }` —
delimitado contando llaves, no por un marcador de texto que se mueve— y avisa si un manejador
asigna cualquiera de las variables que lee la plantilla. Probada reintroduciendo el fallo a
proposito: lo caza en la linea exacta.

### El pie, centrado en su hueco

Debajo de la tarjeta hay tres cosas en movil: el borde de la tarjeta, el pie y el boton
flotante de categorias. El pie tenia 89 px por arriba y unos 25 por abajo, asi que se leia
pegado al boton.

La causa: el relleno inferior del pie se mide contra el final de la pagina, pero el boton no
esta al final — flota 64 px por encima, que son sus 48 de alto mas los 16 que lo separan del
borde. Ese descuadre de 64 px era exactamente lo que faltaba.

Ahora el hueco de abajo se calcula como el de arriba mas lo que ocupa el boton, y los dos
salen de `var(--s5)`: si un dia cambia, cambian los dos a la vez. Medido con la pagina al
final: 55 por arriba y 55 por abajo, diferencia 0.

## La carta vieja en un movil que ya la tenia

El sintoma: se sube una carta nueva y en un movil que ya la habia abierto sigue saliendo la
vieja. Con esta carta duele mas que en otras webs, porque **todo el diseno viaja dentro de
index.html**: un HTML viejo en cache no es una hoja de estilos desfasada, es la carta entera
—colores, medidas, proporciones— de hace dos dias.

Dos piezas, y hacen falta las dos.

**1. Cabeceras (`.htaccess`).** El HTML va con `no-cache, must-revalidate`, que NO es lo mismo
que no guardar nada: el navegador guarda, pero pregunta siempre si ha cambiado. Si no ha
cambiado el servidor contesta 304 y no se descarga nada —unos cientos de bytes en vez de 77 KB—
y si ha cambiado se ve al momento. `no-store` daria exactamente la misma frescura descargando
77 KB cada vez que alguien abre la carta, que en la wifi de un restaurante lleno son segundos
regalados a cambio de nada. `estado.json` y `version.json` si van con `no-store`. Las imagenes,
un mes: las que sube el panel llevan nombre aleatorio, asi que una foto nueva es una URL nueva.

**2. La marca de compilacion.** Las cabeceras solo mandan sobre la proxima descarga, y un movil
que ya tiene la carta guardada **no va a hacer ninguna**, precisamente porque cree que la suya
vale. Ese caso —el que se describe arriba— no lo arregla ninguna cabecera.

Asi que cada build estampa un numero dentro del HTML y lo escribe tambien en un `version.json`
de veintiseis bytes. El runtime los compara al abrir y al volver a la pestana; si no coinciden,
se recarga. Un movil con la carta de anteayer se pone al dia solo, sin que nadie le pida nada
—y a un cliente sentado en una mesa no se le puede pedir que recargue.

Una sola recarga por sesion, guardada en `sessionStorage`. Si el `.htaccess` no estuviera
subido, recargar devolveria otra vez la version vieja y el movil entraria en bucle; con el tope,
en el peor caso se queda como estaba. Probado con las dos ramas: con las marcas iguales no hace
nada, y con una marca mas nueva en el servidor recarga una vez y se detiene.

## El enlace de resenas se muda a Marca

Estaba en la pestana Juego porque nacio ahi, con el flujo de resena posterior al premio. Pero
un enlace de resenas no es una regla del juego: es la ficha del restaurante, y **lo usan dos
sitios** —el bloque de la nota al final de la carta y el premio del juego—. Un dato compartido
que se edita desde una de las dos pantallas acaba mal en la otra tarde o temprano.

Ahora vive en **Marca**, junto a la nota y el numero de resenas, que son de la misma ficha. En
Juego se queda solo el interruptor, que si es una regla del juego —"se pide resena al acabar el
premio"— y ademas se enseña a donde apunta y donde se cambia. Si no hay enlace puesto, Juego
avisa en rojo en vez de dejar encender algo que no llevaria a ningun sitio.

`review.enabled` y `review.url` quedan asi separados de verdad, y eso obligo a corregir algo:
el bloque de la nota al final de la carta enlazaba solo si `enabled` estaba encendido. Es decir,
un restaurante sin juego no podia tener enlace en su nota. Ahora el bloque enlaza si hay url, y
`enabled` manda unicamente sobre el juego.

Para escalar, el campo no dice "Google" en ningun sitio obligatorio: vale cualquier direccion
donde se deje opinion —Google, TripAdvisor, El Tenedor, la que use el negocio— y el texto lo
explica. Lo unico que sigue nombrando a Google es la frase del final de la carta, que se traduce
desde los diccionarios.

## El selector de idioma salia vacio

En cualquier telefono que no estuviera en español ni en aleman, el desplegable se abria **sin
bandera y sin nombre**. La causa era una linea que se salto la migracion:

    if (saved !== 'en') setLang(saved);

Con las tres pildoras eso era correcto: el marcado ya venia con el ingles marcado, asi que
llamar a setLang para el ingles no habria hecho nada. El desplegable, en cambio, pinta su
bandera y su nombre **desde el JS**, y sin esa llamada se quedaban en blanco. Un caso de
"esta rama ya no hace falta" que dejo de ser cierto al cambiar el control debajo.

Ahora se llama siempre, y la deteccion se recorre `navigator.languages` entera en vez de mirar
solo la primera: un movil en catalan con ingles detras abre en ingles y no en el idioma de la
casa. Si ninguno de los del telefono es de los tres, ingles — es el que mas turistas comparten.
Y una preferencia guardada que no sea de los tres se descarta en vez de dejar el selector
descuadrado.

El mismo criterio en el juego, que comparte la clave `totm-lang`.

Probado simulando `navigator.languages`: `fr-FR` da ingles, `de-DE` da aleman, `ca-ES,ca,en-GB`
da ingles cogiendolo del tercer puesto de la lista, y `es-ES` da castellano.

### La portada, mas plana en escritorio

3:2 en una pantalla ancha es demasiado alto: a 1570 son 1029 px de foto y la carta empieza por
debajo del pliegue. En un movil, en cambio, 3:2 es justo lo que le da presencia. Asi que la
proporcion cambia con el ancho: **3:2 hasta 1023 y 2:1 de 1024 para arriba**.

No genera ningun conflicto, y por como estaba montado no hizo falta tocar nada mas:

- **Las fotos no se tocan.** El recorte lo hace el navegador con `object-fit:cover` sobre una
  caja fija; el archivo es el mismo en las dos proporciones. Cambiar de idea otra vez es
  cambiar un numero.
- **Lo que va encima sigue solo.** Controles y puntos estan posicionados contra el marco, no
  contra medidas fijas, asi que se recolocan con la caja.
- **No hay salto de layout.** La caja sigue teniendo proporcion declarada en los dos casos, asi
  que el hueco se reserva antes de que llegue la imagen.

Medido: 1023 da 1.500 y 641 px de alto; 1024 da 2.000 y 481. Margenes intactos, 13 por los tres
lados en ambos.

### El marco de la portada baja a 8

De 13 a 8 por los tres lados. La portada gana casi diez pixeles de ancho y se pega mas al
borde de la tarjeta, que es lo que hace que se lea como portada y no como una foto metida en
una columna.

Los controles que van encima **se quedan a 13 de la foto**. Son dos medidas distintas a
proposito: 8 es cuanto respira la portada contra el borde de la tarjeta, y 13 es cuanto se
separan los botones de una esquina que tiene 21 de radio. Con 8 tambien ahi, se montarian
sobre la curva.

## Redes al final de la carta

Hasta cinco iconos debajo de la nota; de momento cuatro. Salen del panel: los que se dejen en
blanco no aparecen, asi que un restaurante con solo WhatsApp ensena un icono y no cuatro huecos.

Van **fuera** del enlace de la nota: un enlace dentro de otro no existe en HTML y cada motor lo
desmonta a su manera. Dibujo de 22 y area de dedo de 46, con la separacion en el padding del
enlace y no en un margen, para que no queden zonas muertas entre iconos. Sin pastilla de color:
una fila de circulos de marca ahi abajo competiria con la nota, que es lo que importa.

Los iconos son Tabler menos el de Tripadvisor, que se dibujo aqui: se probaron cinco variantes
a 84, 24 y 19 px y cuatro de ellas se leian como unas gafas de bucear. La que quedo es la unica
que se lee como el buho —cara redonda, dos ojos y pico— tambien a 19.

### El numero de WhatsApp

Se guarda **solo el numero, en digitos**, y la direccion la monta la carta con `wa.me`, que es
la forma oficial y la unica que abre la aplicacion si esta instalada y la web si no. Guardar el
enlace entero seria guardar dos veces el mismo dato y dejar que se separen.

El panel normaliza lo que se escriba: quita el mas, los espacios, los guiones y el 00 de
delante. Y exige entre 10 y 15 cifras, que es lo que hay con codigo de pais — un movil español
suelto son 9 y se rechaza con el motivo, en vez de guardar un enlace que no llama a nadie.

### Las otras tres

Se comprueba **el dominio**, no solo que sea una URL: Instagram tiene que ser de instagram.com,
Facebook de facebook.com/fb.com/fb.me y Tripadvisor de cualquier tripadvisor.*, que cambia de
pais. Pegar la direccion de Instagram en la casilla de Facebook es el error mas comun de todos
y asi no pasa. Se validan las cuatro antes de guardar ninguna: guardar dos buenas y rechazar la
tercera dejaria al cliente sin saber que se ha guardado y que no.

## Reordenar fotos sin recargar

Cada flecha era un formulario, y cada formulario una peticion POST con su pagina entera de
vuelta: el navegador se iba, volvia y repintaba 312 filas de platos para mover una miniatura dos
centimetros. Funcionaba, pero se sentia como un parpadeo por cada toque — que es exactamente lo
que era.

Ahora la fila se mueve en el sitio y el guardado va por detras. Lo que se manda es **el orden
que ha quedado en pantalla**, no "sube esta una posicion": si alguien pulsa tres veces seguidas,
al servidor llega el resultado final y no tres ordenes que puedan cruzarse.

El servidor comprueba que la lista que llega sea exactamente el mismo conjunto que hay guardado
—mismos nombres, misma cantidad— antes de tocar nada, asi que una peticion vieja o manipulada no
puede colar un archivo que no existe ni perder uno. Responde `OK` en texto plano cuando la
peticion trae la cabecera que la marca como de fondo.

Los formularios se han dejado puestos: sin `fetch`, el JS no se engancha y las flechas siguen
funcionando como antes. Y el foco se queda en el boton pulsado despues de mover, que ahora esta
en otra fila — sin eso, quien navega con teclado pierde el hilo en cada movimiento.

### Abrir la aplicacion en vez del navegador

Cada red se comporta distinto y no hay una forma que valga para las cuatro.

**WhatsApp no se toca.** `wa.me` ya abre la aplicacion: es un enlace normal que el sistema
reconoce como suyo. Cambiarlo por `whatsapp://` seria un retroceso, porque en un movil sin
WhatsApp el toque no haria absolutamente nada, y con `wa.me` se abre la web.

**Instagram y Facebook** si necesitan su esquema propio para saltar a la app desde dentro de un
navegador. El problema del esquema es que si la app no esta instalada el toque muere en
silencio. Asi que se intenta el esquema y se arma un temporizador: si a los 900 ms la pagina
sigue delante —senal de que no ha saltado a ninguna parte— se va a la web.

La comprobacion es que la pestana se haya escondido, que es lo que ocurre cuando el sistema abre
otra aplicacion encima. Si se escondio, se cancela la vuelta a la web: sin eso, al volver de
Instagram el navegador habria abierto ademas la pagina web por detras.

De Facebook se usa `fb://facewebmodal/f?href=`, el unico esquema que funciona sin conocer el
identificador numerico de la pagina. Meta lo ha roto y arreglado varias veces, asi que aqui la
vuelta a la web importa mas que en Instagram.

**Tripadvisor va a la web**, como se pidio.

En escritorio no se intenta nada: no hay apps que abrir y el esquema solo consigue que el
navegador enseñe un dialogo. Se detecta con `pointer: coarse`, no con el nombre del navegador.

Y el `href` se queda siempre con la direccion web: es lo que se copia al mantener pulsado, lo
que ve un buscador y lo que funciona si el JS no llega. El salto a la app es un anadido encima,
nunca un sustituto.

### Los iconos, en disco

Antes eran contornos sueltos sobre la crema y a 32 px se perdian. Ahora cada uno va en un disco
lleno del color del texto con el logo en el color del papel: 16:1 el logo contra el disco y
16:1 el disco contra la tarjeta, que es lo que hace falta para verlos desde el otro lado de la
mesa y con la pantalla al sol de una terraza.

Y la separacion pasa a ser un hueco de verdad —8 px— en vez de padding: con discos llenos, dos
circulos pegados se leen como una mancha. El foco tambien sale fuera del disco, porque dentro de
uno oscuro no se veria.

Los colores salen del tema, asi que los discos cambian con el juego de marca igual que todo lo
demas.

## La banda de oferta, en marquesina

Referencia: `uilayout.contact/text-marque` de 21st.dev. Como el resto del catalogo es React con
Tailwind, se porta el patron: contenido duplicado, `translateX(-50%)`, `linear infinite`.

**Rompe la regla de no tener movimiento perpetuo, y hace falta decirlo.** La excepcion se
sostiene por una razon concreta: esta banda solo existe mientras corre la franja de la oferta,
no esta ahi siempre, y su mensaje entero ES la urgencia. Fuera de su horario no hay nada
moviendose en la pantalla. No es lo mismo que un carrusel que se pasa solo en la portada o un
punto que late en el pie, que si estan siempre y por eso se rechazaron.

Lo que se gana ademas: la banda pasa de cuatro lineas envueltas a **una sola**. De unos 90 px de
alto a 46.

**Velocidad constante, no duracion constante.** Se mide una copia del mensaje y de ahi sale la
duracion, para que siempre avance a 60 px por segundo con un texto corto o largo, en castellano
o en aleman. Con una duracion fija, el aleman —mas largo— pasaria disparado. Medido en el
navegador: 60 px/s exactos.

**El bucle no se ve.** El carril lleva el mensaje repetido hasta cubrir el doble del ancho
visible, y luego el conjunto entero otra vez; la animacion recorre justo la mitad, asi que al
acabar esta exactamente donde empezo.

**Solo se anima `transform`**, que va en la GPU y no toca el hilo principal mientras alguien lee
312 platos.

**Se para con el raton encima**: si algo se mueve y quieres leerlo entero, tienes que poder
pararlo. En movil no aplica y no hace falta, porque el mensaje pasa entero en cada vuelta.

**Con `prefers-reduced-motion` no se mueve nada**: el mensaje vuelve a salir quieto y centrado,
como estaba. Ahi la regla de la casa manda entera.

Un fallo por el camino que valia la pena anotar: la primera version medía el ancho con la banda
todavia en `hidden`. Un elemento oculto no tiene ancho, el calculo de cuantas copias caben
dividia por uno y el carril salia con **1280 copias** moviendose a 32.000 px por segundo. Ahora
se mide despues de quitar el `hidden`, y si aun asi no hay medidas se reintenta en el siguiente
fotograma en vez de inventarse un numero. Con tope de doce copias, por si acaso.

### La marquesina, sin caja

De lado a lado de la tarjeta, texto en el color del texto y mayusculas, sin fondo rojo y sin
margenes. Una franja roja con esquinas redondeadas era un cartel pegado encima de la carta; una
linea que la cruza entera se lee como parte de ella. Y deja de competir con la etiqueta roja que
ya llevan los precios rebajados: **el rojo se queda donde importa, en el precio**.

Las mayusculas piden interletrado abierto —.08em— o se leen como un bloque; en una linea que
pasa de largo, ademas, la caja alta se reconoce antes que la palabra entera. Contraste medido:
16:1.

### El texto de alergenos

Nuevo y mas corto, y partido en dos cadenas traducibles para que la pregunta vaya en negrita sin
meter HTML en un diccionario: la entradilla por un lado y el resto por otro.

Al ponerla en negrita salio un fallo heredado: la regla del rotulo era `.legend-allergens strong`
a secas, asi que la pregunta se pintaba en mayusculas y con interletrado, repitiendo el titulo
justo debajo del titulo. Ahora la regla apunta al rotulo y solo a el, y la entradilla es lo que
tiene que ser: la misma linea, el mismo cuerpo, mas peso.

### La marquesina, ajustes finales

Dos lineas grandes en sentidos contrarios, con **filete arriba y abajo a 4 px del texto**.

Los filetes obligaron a partir el bloque en dos: una mascara afecta a todo lo que pinta el
elemento, bordes incluidos, asi que con la mascara puesta en el bloque las lineas se
desvanecian en las puntas junto con el texto. Ahora el recorte vive en una capa de dentro y los
filetes llegan enteros de lado a lado.

**El mensaje se acorta**: solo el porcentaje. Antes enumeraba las categorias en oferta y decia
la hora de fin. En una marquesina que pasa de largo eso era demasiada frase para leerla de un
vistazo, y encima cambiaba de longitud segun cuantas categorias hubiera marcadas, con lo que la
velocidad aparente cambiaba de un dia para otro. **Que plato esta rebajado ya lo dice cada
plato con su etiqueta**; la marquesina anuncia, no detalla.

El porcentaje sale del panel:
`¡Hoy te lo ponemos facil! Disfruta de un {pct} % de descuento en platos seleccionados.`

Con eso quedaron sin uso las cadenas 'selected dishes' y 'and', y toda la logica que unia
nombres de categoria con comas y una "y" final.

**Valores**: opacidad 0.48 (3.14:1, el suelo de AA para texto grande), tamano
`clamp(26px,7.2vw,40px)`, peso 800, interletrado 0.02em, interlineado 0.94, aire exterior 21,
distancia al filete 4, velocidad 60 px/s.

## Auditoría de seguridad y calidad (22 Aug 2026)

Auditoría completa (seguridad, lógica, limpieza, rendimiento) con corrección. Lo esencial:

**Superadministrador.** Rol independiente del restaurante: mismo formulario de entrada, y el
panel prueba primero el hash del cliente y después el del superadmin. El hash del superadmin
vive en la variable de entorno `SUPERADMIN_PASSWORD_HASH` o en `admin/superclave.php` (la
variable manda), archivo que NO forma parte del build: ninguna subida lo pisa y ninguna acción
del rol restaurante lo lee ni lo escribe. Se genera con `admin/hash.php`, que sólo funciona
mientras exista `admin/permitir-hash.txt` (creado y borrado por FTP: el cerrojo es tener FTP).
Desde su sesión, el superadmin restablece la contraseña del restaurante —el rescate que
motiva el rol—, cambia la suya (sólo en modo archivo) y ve el registro de accesos.

**Autenticación endurecida.** `DEMO_SIN_CLAVE` sale de fábrica en `false` (era `true`: el
panel se desplegaba abierto). La primera configuración y la salida del demo exigen la
contraseña del superadmin si está configurada — cierra la carrera del "primero que llega pone
la clave"; sin superadmin, el LEEME avisa del residual. Fuerza bruta: 8 fallos por IP → 15
min de espera (`admin/intentos.json`, caduca solo). Registro de accesos en `admin/accesos.log`
(UTC + IP + evento, jamás contraseñas; rota a los 256 KB). Sesión: `use_strict_mode`, nombre
propio `totm_admin`, cookie acotada a `admin/`, `gc_maxlifetime` alineado con los 30 min, y
ligada a la fecha de `clave.php`/`superclave.php`: cambiar una contraseña expulsa las sesiones
abiertas con la anterior (la del que la cambió sigue). CSRF también en primera configuración y
salir-del-demo (el token existe desde la primera petición; tras destruir sesión se regenera —
un token vacío empataría con un POST vacío). Cabeceras: `X-Frame-Options DENY`, `nosniff`,
`Referrer-Policy no-referrer`; `.htaccess` de admin fuerza HTTPS y deniega también
`superclave.php`, `.log` y `.txt`. Escrituras atómicas con temporal ÚNICO por proceso: el
`.tmp` fijo dejaba que dos guardados concurrentes publicaran un archivo a medias.

**Canjes fuera del estado público.** `redeemed` viajaba en `estado.json`, público: cualquiera
listaba cuántos premios se dan y a qué hora. Ahora en `admin/canjes.json` (denegado por
.htaccess), con migración de lectura y limpieza al guardar. El panel además rechaza códigos
con el juego apagado y con puntos por debajo del objetivo: la suma es falsificable (aceptado),
así que las señales de sentido común pesan más que ella.

**El código del premio lleva azar.** Era determinista (fecha+puntos+secreto): dos ganadores
con los mismos puntos el mismo día recibían EL MISMO código y al segundo —honesto— el panel
le decía "ya se canjeó". Con las puntuaciones ganadoras apiñadas en 25-35, cuestión de días.
Ahora `CR-DDMM-PTS-RR-SSS` con dos caracteres al azar por victoria dentro de la suma; el
formato viejo se acepta durante la transición (un premio vive un día) y puede retirarse en la
siguiente subida. Paridad JS↔PHP verificada con las funciones reales extraídas del build.
También: las claves de localStorage llevan año (`totm-cr-YYYYDDMM`) — con DDMM a secas la
mejor marca y un premio sin activar resucitaban al año exacto — y un corte de red ya no borra
la pantalla-justificante de un premio activo (`retomarPremio()` en el catch del fetch).

**Runtime de la carta.** El precio en oferta se calcula en céntimos enteros: el float pintaba
un céntimo de menos en algunos precios (4,35 −20% daba 3,47). `offerCfg()` revalida el
porcentaje (1-90): un `estado.json` corrupto degrada a "sin oferta", no a €NaN en 326 filas.
Head completado: favicon (titleIcon-accent, que estaba huérfano), `theme-color`, `canonical`
y Open Graph — la carta se comparte por WhatsApp y salía sin tarjeta. Los tres PNG
decorativos van `loading="lazy"`: sólo existen de 1200px en adelante y el móvil pagaba ~60 KB
por nada. Accesibilidad: roving tabindex en la barra de categorías (una parada de Tab, no
trece), el foco vuelve a quien abrió la hoja (lupa o FAB), y los puntos del carrusel dejan de
ser `role=tab` sin panel — `role=group` + `aria-current`.

**Limpieza (verificada con grep + rebuild; la guarda del build habría reventado con un falso
muerto):** `CAT_TR`/`trCat`/`hhmm`/`LANG_CODES` del runtime (~3,5 KB por visita), 40+ claves
i18n de features quitadas (recomendación del día, oferta fija vieja), 3 cadenas de
`GAME_STRINGS`, `review.provider`/`redirectAfterReward` (nadie los leía), `export` sin
importador en `temas.mjs`, `var(--line)` que no existía. `platos.json` se emite directo a
`server/admin/` (antes raíz + copia a mano). `server/.htaccess` (gzip + caché) pasa al repo:
existía sólo en el hosting y una migración lo habría perdido en silencio.

**Pendiente, decisión de negocio o de hosting:** auto-alojar las dos fuentes (Google Fonts es
el único tercero: render-blocking + IP a Google sin consentimiento, sentencia LG München);
recompresión GD de las fotos hero YA implementada pero sin probar en el servidor (no hay PHP
local); la redirección automática a la reseña tras el premio roza las políticas de
Google/TripAdvisor — recomendado convertirla en botón opcional, no cambiado por ser flujo
aprobado con el cliente; passkeys/TOTP para el superadmin, viable sin dependencias si algún
día se quiere.

## Toasts, pastilla de estado y el botón de categorías muerto (22 Aug 2026)

**Avisos flotantes en el panel.** Cada guardado dejaba una franja fija bajo la cabecera que
empujaba el contenido y había que leer. Ahora `toast(texto, 'ok'|'bad')`: flota arriba
centrado, con icono, botón de cerrar (40px) y `aria-live`. Los buenos se van solos a los 4,5 s;
los errores (`role=alert`) se quedan hasta que se cierran — un error que desaparece solo no se
ha leído. Sin dependencias: ~40 líneas sobre los tokens del panel. Las pantallas de entrada y
de alta conservan el mensaje inline (no dependen de JS). Los mensajes de reordenar fotos pasan
por el mismo toast. El estado de la oferta («Corriendo ahora mismo…») NO es un toast: es
estado, no notificación, y se queda donde estaba.

**Pastilla EN LÍNEA / MODO DEMO** junto al nombre del restaurante. El cuadro rojo del demo
pasa a un desplegable discreto con el mismo formulario de salida; la pastilla roja ya dice lo
que hay que saber.

**El botón «Categorías» no respondía tras buscar.** Reproducido: al saltar a un plato desde el
buscador, la hoja (`z-index:50`) seguía recibiendo punteros durante sus 240-400 ms de salida y
tapaba el botón (`z-index:40`); cada toque ahí volvía a llamar a `closeSheet()`, que
reiniciaba el temporizador de 400 ms — de ahí "hasta que hago scroll". Arreglo:
`.sheet:not(.is-open){pointer-events:none}`. Verificado por `elementFromPoint` justo tras el
salto: antes devolvía un resultado de la hoja, ahora el propio botón.

## Insignias de sesión y la contraseña del restaurante sólo la toca el superadmin (22 Aug 2026)

Arriba a la derecha, fijas, como las etiquetas de oferta y destacados de la carta: `EN LÍNEA` +
`USUARIO` (acento) o `SUPERADMIN` (navy), o `MODO DEMO` (rojo) a solas. Siempre a la vista, con
el scroll donde esté; los toasts bajan a 48px para no pisarlas. La pastilla central y el texto
«Sesión de superadministrador» desaparecen: ya lo dicen las insignias.

**El restaurante ya no cambia su contraseña.** Fuera el formulario «Cambiar la contraseña» y su
manejador (`cambiar`): sólo el superadministrador la restablece, desde su sección. Motivo: una
contraseña que el cliente cambia a solas es una contraseña que acaba perdida, y el rescate
volvía a ser el FTP. Verificado: un POST `cambiar` forjado por un usuario no hace nada.

## Buscador y filtros en una línea (22 Aug 2026)

En el panel, de 768px en adelante el cajón de búsqueda y los dos filtros (Todos / Sólo
marcados) comparten línea: el cajón estira (`flex:1 1 auto`) y los botones quedan a su ancho
a la derecha. En móvil siguen apilados. Medido: a 1280, cajón 799px y filtros 233px centrados
en la misma línea; a 375, apilados y sin desbordamiento horizontal. Vale para Agotados y Ofertas,
que comparten `.tools`.

## Toasts centrados e invertidos (22 Aug 2026)

El aviso sale en el centro de la pantalla, no arriba: el contenedor es `position:fixed; inset:0`
con flex centrado, que mide siempre el alto real del navegador (también en móvil con la barra
que aparece y desaparece) sin calcular nada en JS. Colores invertidos respecto a la tarjeta:
tinta del tema sobre el texto crema (el error, en el rojo de aviso). Medido a 375x812: centro
del toast 406/406 px, color de fondo = `--ink` del tema activo.

## Portada del juego a medida de app (22 Aug 2026)

El selector de idioma vive dentro de la portada, centrado justo sobre «MIENTRAS ESPERAS», y no aparece en las pantallas de juego (un toque accidental re-pintaría etiquetas a mitad de partida); «Volver a la carta» deja la
cabecera y pasa a ser un botón fantasma (sin relleno, borde al 45% de la tinta) justo debajo de
«Jugar», mismo ancho. Lo mismo en las pantallas de fin de partida y de premio terminado: el
`.link-btn` subrayado desaparece. Medidas: acción principal 56px de alto y 320px de ancho (o el
que haya), secundaria 52px, botones de idioma 52x44; el bloque de botones lleva un escalón más
de aire que las líneas de texto. El idioma se toma primero del enlace (`juego.html?lang=xx`,
que la carta escribe al cambiar de idioma), después de localStorage y por último del
navegador: así el juego abre en el idioma con el que se estaba mirando la carta también en modo
privado.

## Portada «Arcade» (22 Aug 2026)

Elegida entre tres direcciones prototipadas con selector (Sereno / Cartel / Arcade) sobre los
tokens reales. El premio vende la partida antes del primer toque: mascota (el chile de Tabler en
un círculo de tinta, entrada «pop» 260 ms con ligero rebote), «Rush» en el rojo de aviso
inclinado −3°, y un ticket con el objetivo y el premio de hoy leídos de `estado.json` —
`pintarTextosDinamicos()` lo rellena y lo oculta con el juego apagado. «Jugar» 64 px en rojo con
el icono; «Volver a la carta» fantasma debajo. Dos cadenas nuevas en los diccionarios: `points`
y `Today's prize`. Decisión consciente: el rojo, que en la carta sólo significa oferta o
agotado, aquí es también personalidad — sólo en esta pantalla. El prototipo se borró al promover.

## El juego hereda el selector de idioma de la carta (22 Aug 2026)

Fuera la fila de pastillas EN/ES/DE de la portada: el juego usa el mismo control que la carta —
bandera, nombre del idioma escrito en su idioma y chevron, arriba a la derecha en una pastilla
translúcida, con el desplegable propio (teclado, Escape, cierre al tocar fuera)— y en la misma
posición, para que quien lo acaba de usar en la carta lo encuentre donde lo dejó. `gen.mjs` le
pasa `IDIOMAS` (banderas incluidas) al build del juego. El icono de «Jugar» baja a 20px y sube
1px: el chile pesa abajo-izquierda en su caja y a tamaño nominal se veía caído.

El selector de idioma sólo existe en la portada: `pantalla()` lo oculta en cualquier otra
pantalla (y cierra el desplegable si estaba abierto). En la partida estorbaba justo en la esquina
donde aparecen los chiles.

## Partida: tablero «Carril» con cabecera «Horno» (22 Aug 2026)

Elegido entre tres partidas prototipadas (Lienzo / Horno / Carril), combinando dos. **Tablero**:
las fichas ya no aparecen en cualquier punto; nacen bajo el borde y suben por uno de tres
carriles en exactamente su vida (`--vida`, transición lineal: llegar arriba y caducar son lo
mismo) — se sabe por dónde vienen y se juega con el pulgar sin mover la mano. Con
`prefers-reduced-motion` no viajan: aparecen quietas en el carril y se van al caducar. El +1
sale de donde está la ficha en ese instante (getBoundingClientRect), no de donde nació.
**Cabecera**: marcador grande (56px) con «de 25» debajo, tiempo a la izquierda, racha de toques
sin hielo a la derecha (se reinicia con el hielo); la barra se pone roja en los últimos 5 s.
Cadenas nuevas: `Streak`, `of`. Las reglas de ritmo y vida no cambian, pero el modelo cambia la
dificultad percibida: conviene re-medir el objetivo de 25 con partidas reales.

## Insignias dentro de la tarjeta (22 Aug 2026)

Las insignias EN LÍNEA / USUARIO / SUPERADMIN dejan de flotar: absolutas en la esquina superior
derecha de la tarjeta del panel (`.card-main{position:relative}`), quietas con el scroll.
En móvil no hay esquina libre (pisaban el rótulo): ahí van en fila centrada, quietas, encima del
rótulo; de 768px en adelante, absolutas en la esquina. Medido: 375px sin solape (insignias
acaban en 91px, rótulo empieza en 104px); 1280px a 21px de la esquina.

## El panel enseña lo mismo que la carta, y busca como ella (22 Aug 2026)

Los números ya coincidían clave a clave (312 platos, 0 diferencias, mismo orden); lo que no
coincidía era lo de al lado: el panel enseñaba el nombre inglés y el subgrupo («Lamb — Choose
Your Ingredient») y la carta el español y la pestaña («Cordero · Currys»). `platos.json` lleva
ahora `es`, `tab_es` y `group_es` (del build, con las mismas traducciones que la carta) y el panel
pinta «56 · Cordero · Currys · Elige el ingrediente · Lamb»: español primero, pestaña y grupo
como en la carta, inglés en pequeño para quien conozca el plato por él. Secciones y categorías de
ofertas también en español (la clave que viaja no cambia).

**«Plato» en Destacados** deja de ser un `<select>` de 313 opciones: un buscador en tiempo real
(combobox accesible: listbox, flechas, Enter, Escape, cierre al tocar fuera) que filtra por número
(prefijo), nombre en español, en inglés o pestaña, sin tildes; 12 resultados como mucho, los ya
destacados atenuados. Lo que viaja es la clave del plato en un campo oculto y el servidor la
valida como antes; sin plato elegido el formulario no se envía y un toast dice qué falta.
Verificado: «corder» devuelve exactamente la lista de la carta (46, 47, 56, 57, 61, 73…); «56»
uno solo; elegir rellena la clave y el alta sale en el toast.

## Chips de etiqueta en los filtros rápidos (22 Aug 2026)

Junto a Vegano / Sin gluten / En oferta, un chip por etiqueta de destacado en uso («Más vendido»,
«Hay que probarlo»…): existe sólo mientras algún plato la lleve —el panel las pone y quita—,
igual que el de oferta. Excluyentes entre sí (un plato lleva una sola etiqueta): tocar uno suelta
el otro. El contador es cuántos añadiría dentro de lo ya filtrado; si el panel retira la etiqueta
que estaba filtrando, el filtro se suelta solo. La pastilla de cada fila guarda su clave inglesa
en `data-tag` y el chip se rotula con `tr()`, así cambia con el idioma. Se crean en
`dsCuentas()`, que ya corre tras cada `render()` y al cambiar de idioma.

## Ocultos: platos, grupos y pestañas que dejan de existir (22 Aug 2026)

`estado.json` lleva `hidden: {tabs, cats, keys}` — claves inglesas de pestaña (`Kids`), de grupo
(`Butter Masala Biryani`, la misma que usan las ofertas) y de plato. **No caduca**: sólo vuelve
cuando el panel lo desmarca. En la carta `aplicarOcultos()` corre al principio de cada `render()`:
pone `hidden` a las filas, a los grupos sin filas visibles y a las pestañas sin platos (barra,
hoja de categorías y sus contadores), oculta el separador «Menús especiales» si no queda ninguna,
y si la pestaña abierta se queda vacía salta a la primera visible; `selectTab()` no abre una
pestaña vacía. Buscador, contadores y chips no cuentan lo oculto. Ganchos de build: `data-tab` en
pestañas y barra, `data-cat` en grupos. Sin estado o sin JS, todo visible (fallar abierto, como
siempre).

**Panel**: «Agotados» pasa a «Agotados hoy» (caduca a las 06:00) y nace «Ocultos» (no caduca):
pestañas enteras y grupos enteros como casillas, platos sueltos con el buscador y el filtro «sólo
ocultos»; un plato dentro de una pestaña o grupo marcado sale bloqueado («ya está dentro»).
**Lo oculto desaparece de todas las demás pantallas del panel** — Agotados hoy, Destacados (lista y
buscador), Ofertas (categorías y platos) y Precios (propuesta y lista) trabajan sobre `$visibles`.
Validación en servidor contra el catálogo (pestañas, grupos y claves existentes), guardado
atómico, toast. Verificado con Kids (pestaña) + Butter Masala Biryani (grupo) + Papadum (plato):
barra 13→12 pestañas, hoja sin Kids, Biryani 17→12, Aperitivos 9→8, buscador sin el 01, chip
vegano 53→51; en el panel 312→299 filas y el grupo fuera de las categorías de oferta.

## Esquinas del hero (22 Aug 2026)

Las dos esquinas superiores del marco de fotos pasan a ser concéntricas con la tarjeta: el marco
va 8px por dentro de un radio de 34, así que el radio que se ve igual es el de la tarjeta menos 8 (`--radio-tarjeta − --s1`: 26 en escritorio, 13 en móvil, donde la tarjeta baja a 21),
no 34 — con 34 el canalillo crema se engordaba en la esquina. Las inferiores siguen a 21.

## Ocultos, segunda pasada: sin grupos, dos fugas cerradas, pestañas del panel que se mueven (22 Aug 2026)

«Grupos enteros» sale de la pestaña Ocultos por decisión del cliente: quedan pestañas enteras y
platos sueltos (`hidden.cats` se guarda vacío; el runtime lo sigue entendiendo). Dos fugas
cerradas con pestañas ocultas: la banda de oferta sólo sale si hay al menos un plato VISIBLE
rebajado, y los rótulos de la hoja («Carta», «Cartas especiales») se van con sus listas si se
quedan sin entradas. Verificado con Menú infantil + Sin gluten + Vegano ocultos y una oferta sólo
sobre Menú infantil: banda oculta, rótulo oculto, separador oculto, 10 pestañas.

La fila de pestañas del panel se cortaba por la derecha («Marca» a medias) sin forma de llegar con
ratón. Ahora es la misma barra que las categorías de la carta: fundidos en los bordes que se
apagan en cada extremo, flechas de 768px en adelante (sólo cuando desborda; cada una se
deshabilita en su extremo), y la pestaña activa queda centrada a la vista al cargar. Medido a 557:
desborda (988/516), sin flechas, activa visible; a 800: flechas visibles, la derecha avanza
0→286 y se deshabilita al final.

## Aviso IMPORTANTE al final del menú infantil; Ocultos apagado y comentado (22 Aug 2026)

La nota «Solo para menores de 9 años» deja de ser una nota de cabecera que se salta: va al FINAL
del grupo, después de los platos, con el distintivo IMPORTANTE (acento relleno, 10px versales),
en los tres idiomas (`Important` → Importante / Wichtig). Generalizable: `AVISOS_AL_FINAL` en
`gen.mjs` lista las notas de `menu.md` que son condición de pedido y no descripción.

**Ocultos, apagado.** El cliente no quiere en producción una función que aún no tiene clara.
Queda escrita, probada y explicada en comentarios largos (cabecera de `aplicarOcultos()` en
`gen.mjs` y de `ocultos_de()` en `index.php`: qué guarda, dónde, qué hace en cada pasada, cómo
interactúa con oferta, agotados, precios y buscador), detrás de un interruptor doble:
`OCULTOS_ACTIVO = false` en `gen.mjs` (la carta ignora `hidden`) y `OCULTOS_ACTIVO` en
`config.php` (la pestaña no aparece, su guardado se ignora y nada se filtra en el panel).
Encender = los dos en true y regenerar. «Agotados hoy» se queda como está.

## Tres avisos más al final con distintivo (22 Aug 2026)

«Todos los arroces se preparan con basmati indio» (Arroz basmati), «Todos los naan se elaboran
sin huevo» (Panes) y la línea vegana «Preparado utilizando alternativas veganas…» van al final de
su grupo o pestaña con el distintivo IMPORTANTE, como el del menú infantil. La línea vegana era
`TAB_INTRO` bajo el título de la pestaña; ahora cierra la pestaña (`.tab-aviso`) y la clase
`.tab-intro` desaparece.

## Sin filete en el último plato de cada grupo (22 Aug 2026)

El último plato de cada grupo deja de llevar raya: el rótulo del grupo siguiente ya trae la
suya y quedaban dos seguidas. En móvil (columnas apiladas) «último» es el de la columna derecha,
o el de la izquierda si la derecha va vacía (`:has`); de 992px en adelante, el último de cada
columna. El caso de los grupos con escala de picante ya lo hacía.

## Panel: pestañas, buscador y filtros a la misma altura (22 Aug 2026)

Las pestañas (44), el buscador (52) y los chips de filtro (44) tenían tres alturas distintas en
la misma pantalla. Ahora los tres miden 48px en móvil, tablet y escritorio — el mismo alto que
el botón Guardar de la barra fija. Medido a 375 y 1024.

## Cinco paletas de sastrería, de cuatro colores (22 Aug 2026)

Fuera los seis temas anteriores (marino, terracota, bosque, carbón, vino, arena). Entran cinco
paletas de referencia del cliente, y con ellas un cambio de fondo: cada tema pasa de TRES
semillas a CUATRO.

| Tema | ink (más oscuro) | deep (medio) | metal | surface (papel) |
|---|---|---|---|---|
| **Laurel** *(por defecto)* | #17382C | #727A63 | #B49A67 | #E7DECD |
| **Ónice** | #151411 | #8C8173 | #B59A70 | #EEE8DD |
| **Caoba** | #33211F | #4B1822 | #A78655 | #E9DDCC |
| **Mar** | #101E2C | #536271 | #A9A7A0 | #E1E0DA |
| **Ciruela** | #2A1928 | #67495D | #8E8789 | #D0B9B4 |

**El texto siempre en el color más oscuro** (regla del cliente): `ink` es a la vez el fondo de la
página y cada palabra sobre la tarjeta. El metal es el carácter del tema y se emite en DOS
versiones porque un dorado que se lee sobre crema ya no es un dorado: `--accent` (oscurecido hasta
5:1 sobre la tarjeta) para todo lo que va sobre el papel, y `--metal` (aclarado sólo lo justo para
llegar a 4.5:1) para lo que va sobre el fondo oscuro — hoy, la marca del pie. `--deep` pinta el
fondo del juego, aclarándose contra la tarjeta hasta que el texto se lee encima (en Caoba y
Ciruela el tono medio era casi tan oscuro como la tinta).

**El rojo de oferta pasa a ser del tema.** Era un `#C62828` global que ganaba por orden de cascada.
Ahora cada tema emite el suyo: el mismo rojo multiplicado lo justo para llegar a 4.5:1 sobre SU
papel — en Ciruela, con la tarjeta rosa piedra, el rojo plano medía 3.7:1. Sigue siendo rojo en
los cinco.

**El botón «Categorías»** era crema flotando sobre una tarjeta crema: se perdía. Pasa al acento del
tema con texto papel (5:1 medido en los cinco).

Medido en el navegador, los cinco temas, ocho pares reales cada uno: peor caso 4.50:1 (el rojo de
oferta en Heritage), nombres y precios entre 8.9 y 15.1:1. El build sigue reventando si un solo par
baja del umbral, y ahora comprueba también el metal sobre el fondo, el texto del botón sobre su
relleno y el rojo en los dos sentidos.

**Al subir**: el `estado.json` de producción trae `theme: "vino"`, que ya no existe; la carta y el
panel caen al tema por defecto (Laurel) sin romperse. Hay que elegir el definitivo en
Panel → Marca.

## Panel: aire y resumen (22 Aug 2026)

El aire de arriba de la tarjeta era 34px contra 21 de los lados en móvil (89 contra 55 en tablet):
espacio muerto sobre el contenido. Ahora es el mismo en los tres tamaños. Y el bloque «AGOTADOS HOY
0» no se pinta si no hay nada agotado: aparece en cuanto se marca el primer plato, sin esperar a
guardar, y se va al desmarcarlos.

**Nombres**: Laurel, Ónice, Caoba, Mar y Ciruela — una palabra, del material o del sitio, no de
la marca de la paleta original. Los slugs siguen a los nombres (`laurel`, `onice`, `caoba`, `mar`,
`ciruela`); un `theme` guardado que ya no exista cae al por defecto sin romper nada.

## La banda de la barra pegada, y los últimos colores escritos a mano (22 Aug 2026)

La barra de categorías, al quedarse pegada arriba en el móvil, salía de `rgba(250,245,232,.82)`:
la crema del tema viejo, escrita a mano. Con cualquier paleta nueva eso era una banda de otro
color cruzando la tarjeta. Ahora es `--surface` del tema (respaldo sólido + `color-mix` al 82
**Nombres**: Laurel, Ónice, Caoba, Mar y Ciruela — una palabra, del material o del sitio, no de
la marca de la paleta original. Los slugs siguen a los nombres (`laurel`, `onice`, `caoba`, `mar`,
`ciruela`); un `theme` guardado que ya no exista cae al por defecto sin romper nada.

## La banda de la barra pegada, y los últimos colores escritos a mano (22 Aug 2026)

La barra de categorías, al quedarse pegada arriba en el móvil, salía de `rgba(250,245,232,.82)`:
la crema del tema viejo, escrita a mano. Con cualquier paleta nueva eso era una banda de otro
color cruzando la tarjeta. Ahora es `--surface` del tema (respaldo sólido + `color-mix` al 82%
para el cristal). Medido: móvil, barra 231,222,205 igual que la tarjeta; de 768 en adelante la
barra no es pegajosa y va transparente, con los fundidos del color de la tarjeta.

De paso, los demás colores del tema viejo que quedaban escritos a mano: `theme-color` de la carta
y del juego (eran el navy y el teal de la marca vieja; ahora salen del tema y se actualizan al
cambiarlo, como ya hacía el juego) y los quince velos del panel (`rgba(2,27,49,…)` y
`rgba(250,245,232,…)`, que teñían de azul los temas cálidos) más los verdes y rojos de sus avisos.
Comprobado: cero apariciones de los colores viejos en `gen.mjs`, `juego.mjs`, `index.php`,
`index.html` y `juego.html`.

## La foto de portada en el móvil, y el aviso de cierre alineado (22 Aug 2026)

La foto mantiene su margen de 8px contra la tarjeta y sus dos esquinas de arriba llevan el radio
**concéntrico**: el de la tarjeta menos ese margen (21 → 13 en móvil, 34 → 26 de 768 en adelante;
abajo, 21 de siempre). Se probó primero con el mismo número en las dos y no funciona: dos curvas
de igual radio separadas 8px no son paralelas — el hueco pasa de 8px en los lados a 11,3 (8·√2)
en la diagonal de la esquina, y ese ensanchamiento se lee como que la foto está menos redondeada.
Restando el margen, el hueco mide 8 en todo el recorrido.

En móvil, además, el aire de arriba de la tarjeta baja de 34 a 13: el mismo que deja a cada lado.

El aviso de cierre de grupo («IMPORTANTE …») llevaba margen lateral propio y quedaba 21px metido
hacia dentro respecto a los nombres de plato. Ahora comparte eje: medido, aviso y nombre de plato
empiezan los dos en x=47.

**La barra de categorías se queda pegada a 0px del borde superior de la ventana** y mide 64px de
alto, con los chips (44px) centrados: 10 de aire arriba y 10 abajo, medido. Sólo se pega por
debajo de 768px; de ahí en adelante va en su sitio con el resto del contenido.

## Los cuatro colores, en su sitio (22 Aug 2026)

Primera colocación: el más oscuro a tinta, el metálico a acento, el medio al fondo del juego. En
tres paletas funcionaba; en dos dejaba fuera justo el color que le da nombre a la paleta.

- **Caoba** (Bordeaux Privé): el protagonista de la referencia es el burdeos #4B1822, y estaba de
  fondo del juego porque el caoba #33211F es un punto más oscuro. Ahora el burdeos es el fondo y
  la tinta (10,8:1 sobre su papel) y el caoba pasa al juego. La paleta vuelve a llamarse por lo
  que se ve.
- **Ciruela**: el metal era el estaño #8E8789, un gris, así que el acento salía gris casi negro
  (3% de saturación) y la ciruela #67495D se perdía en el fondo del juego. Intercambiados: el
  acento es ciruela de verdad (17%) y el estaño pinta el juego.
- **Mar**: el mismo caso con la plata #A9A7A0 — acento al 3% de saturación, o sea gris. Ahora el
  acento sale de la pizarra #536271 (15%) y la plata pinta el fondo del juego.

Regla que sale de esto y que vale para la siguiente paleta: **el metal no es «el color metálico»,
es el que tenga color**. Si el metálico de la paleta es un gris o una plata, el acento se saca del
otro tono medio; si no, el acento acaba siendo un gris oscuro sin identidad. Medido: los cinco
acentos están ahora entre 15 % y 33 % de saturación (antes, dos por debajo del 5 %).

Contrastes tras el cambio, medidos en el navegador (5 temas × 8 pares reales): peor caso 4,50:1
—el rojo de oferta en Laurel—, platos y precios entre 8,9 y 15,1:1.

## El número, en la línea del nombre (22 Aug 2026)

En el móvil el número del plato ocupaba una línea entera para él solo: 312 platos × una fila. Pasa
a ser el prefijo del nombre —«01 Papadum»— y con él se va la píldora: número en `--muted`, 13px,
tabular, 8px de aire. El escritorio no cambia (allí el número tiene su columna).

Medido sobre los 312 platos a 375px: la carta pasa de **28.086 a 23.554 px** de alto, de 90 a 75
por plato. Son **4.532 px menos: 5,6 pantallas de móvil de scroll**. El coste es real y pequeño:
seis nombres más se parten en dos líneas (de 40 a 46), porque el número les come 28px de ancho.
Los precios siguen alineados con la primera línea del nombre en las 312 filas (0 desalineados).

El orden dentro del `h3` importa y costó una pasada: con el número delante de la línea de
etiquetas, una fila con «AGOTADO HOY» gastaba TRES líneas (número / etiqueta / nombre). Va detrás:
la etiqueta —cuando la hay, que son un puñado de filas al día— se queda arriba en su línea, y el
número siempre pegado al nombre. `.has-tags`, que desplaza el precio, ya sólo se pone cuando hay
etiqueta de verdad; el número dejó de contar para eso.

## La calle del contenido, y la barra que se salió con ella (22 Aug 2026)

En el móvil la calle interior de la tarjeta baja de 34 a 21: en 349px de tarjeta, cada píxel de
margen se lo quita al nombre del plato. Medido sobre los 312 platos: los nombres partidos en dos
líneas bajan de 46 a 34 y la carta pasa de 23.554 a **21.308px** de alto — 2,8 pantallas menos,
que sumadas al número en línea hacen **8,3 pantallas** desde donde estaba esta mañana (−24%).
Quedan dos escalones de aire: 13 de la pantalla a la tarjeta, 21 de la tarjeta al texto. Tablet y
escritorio no se tocan (55 y 89): allí sobra ancho y apretar el texto contra el borde no gana nada.

Y el fallo que trajo: la barra de categorías sangra hasta el borde de la tarjeta tirando de sí
misma lo que mide la calle, pero ese tirón estaba escrito a mano (34). Al bajar la calle a 21, la
barra se quedó 13px más ancha que la tarjeta por cada lado y se salía por los dos. Ahora lee
`--gutter`, igual que el resto: medido, tarjeta y barra empiezan y acaban en el mismo píxel
(13 → 362 en un móvil de 375) y los chips arrancan en la misma calle que los platos. La lección
es la de siempre en este archivo: un valor que copia a otro se escribe una vez y se lee, no se
duplica — es la tercera vez que un número duplicado se queda atrás cuando cambia su pareja.

## Los puntos de la portada, con píldora (22 Aug 2026)

Portado el patrón «morphing page dots» (21st.dev) al vanilla de este proyecto: el punto de la
foto que se está viendo no crece, se **estira** hasta una píldora de 22px y los demás se quedan
redondos de 7. Dice de un vistazo cuál miras y cuántas hay sin depender sólo de la opacidad, que
sobre una foto clara casi no se ve. Al llegar, un halo sale del punto y se desvanece hacia fuera
(620ms, sólo en el activo: nada animándose en bucle).

Dos decisiones al traducirlo desde React:
- El original usa framer-motion con un spring; aquí es una transición CSS con rebote corto
  —`cubic-bezier(.34,1.56,.64,1)`, 320ms— que hace el mismo gesto sin 30KB de librería.
- **Se anima el ancho**, y es la excepción consciente a la regla de animar sólo `transform` y
  `opacity`: un `scaleX` a 7px de alto y radio de píldora deforma los dos extremos en óvalos, y
  el coste real aquí es nulo — cinco elementos de 7px en un flex aislado, sin texto alrededor
  que rehacer. Con `prefers-reduced-motion` el ancho cambia de golpe y el halo no se dibuja: el
  estado lo sigue diciendo la forma.

El área táctil sigue siendo la de antes (26×32 por punto, muy por encima del punto visible) y el
`aria-current` y el `aria-label` («Foto 3 de 5») no cambian. Medido: al cargar, 22/7/7/7/7; tras
tocar el tercero, 7/7/22/7/7.

## La barra no decía que se desliza (22 Aug 2026)

El dato que lo explica todo: en un móvil de 375 se ven **2 de las 13 categorías**, el chip
siguiente asomaba 8px —que se lee como el borde de la tarjeta, no como un chip cortado— y quedan
1.612px fuera de pantalla. Las flechas sólo existen de 768 para arriba. Es decir, el 82 % de la
barra era invisible y nada invitaba a buscarlo.

Tres señales que se refuerzan, ninguna añade un elemento nuevo a la pantalla:

- **Calle derecha a 8.** Los 21 de la izquierda se quedan (alinean con el contenido); por la
  derecha se recortan para que el chip siguiente entre más en pantalla.
- **Fundido de 21 a 34.** Ahora cubre de sobra lo que asoma, así que el corte se ve como un
  desvanecido y no como un tajo.
- **Empujón de bienvenida.** A los 700ms de abrir, la fila avanza 16px y vuelve en 900 (medido:
  0 → 16 → 0, media senoidal, sin frenazo). El ojo ve moverse los chips y entiende el gesto. Una
  vez por pestaña —`sessionStorage`, no `localStorage`: la siguiente visita real vuelve a verlo—,
  sólo si de verdad hay algo fuera, y nunca con `prefers-reduced-motion`.

Descartado en el camino: `scroll-snap`, que enganchaba la fila 21px desplazada en reposo —cortando
el primer chip— y se comía el empujón. Y las flechas en móvil: dos botones sobre 349px se comen
el ancho de un chip entero.

Lo que sigue siendo el camino real para quien no quiere deslizar es el botón **Categorías**, que
abre las 13 en vertical con sus cuentas.

## Cerrar la hoja de categorías sin buscar la cruz (22 Aug 2026)

La hoja ya tenía cuatro salidas —cruz, tocar el fondo, Escape y arrastrar— pero en un móvil, con
el dedo sobre la lista, sólo se acertaba la cruz. Dos motivos, los dos medidos:

- El arrastre se descartaba en cuanto el dedo caía sobre un `<button>`… y la lista entera son
  botones. En la práctica sólo se podía arrastrar desde la barrita de arriba.
- El fondo oscuro deja 146px arriba y el panel ocupa los otros 666: poca superficie que tocar.

Tres salidas nuevas, ninguna añade un elemento a la pantalla:

- **Arrastrar desde cualquier punto de la hoja**, lista incluida. El truco es esperar: hasta que
  el dedo no baja 8px no hay arrastre, así que un toque sigue siendo un toque y elige su
  categoría. Y sólo si la lista está en su tope (`scrollTop 0`); a media lista manda el scroll.
- **El botón atrás del móvil.** Al abrir se mete una entrada en el historial y se retira al
  cerrar por cualquier vía. Antes, el atrás sacaba al cliente de la carta entera.
- **La barrita de arriba, tocable** — era sólo un dibujo.

Verificado sobre la hoja real: arrastre desde la lista cierra · atrás cierra · barrita cierra ·
tocar una categoría **no** cierra por arrastre sino que abre su pestaña (Breads) y deja el
historial limpio.

La barra pegada pasa de 64 a **72px**, con los chips en 44 y centrados.

## La cabecera de la hoja se quedaba atrás (22 Aug 2026)

Quien hace scroll es el panel entero, así que la cabecera —el título y la cruz— se iba con la
lista: bastaba bajar un poco para que la cruz desapareciera, y de ahí la sensación de que la hoja
«se corta abajo» y de que sólo se cierra volviendo arriba. Ahora la cabecera y la barrita son
`sticky`: se quedan pegadas al borde del panel con el papel del tema detrás y un desvanecido de
13px para que las filas pasen por debajo sin línea dura. Medido con la lista al final: la cruz
sigue a 4px del borde superior del panel y a 11 del derecho.

Y el final: la última categoría quedaba a 21px del canto y parecía que la lista seguía. Ahora
deja 55 (medido) más el `safe-area`, y se ve que ahí se acaba.

## La cruz de la hoja, en la esquina (22 Aug 2026)

Estaba a 26px del borde superior y a 11 del derecho: con su área táctil de 44 se leía descolgada
hacia dentro en vez de anclada a la esquina. Ahora mide **13 y 13**, el mismo aire por los dos
lados.

Dos cosas la desplazaban, y hacía falta arreglar las dos:

- **El asa** —la barrita gris— era un bloque *antes* de la cabecera, así que empujaba título y
  cruz 16px hacia abajo. Pasa a dibujarse **dentro** de la cabecera, superpuesta en absoluto: se
  ve igual y no ocupa alto.
- **La cabecera pegada** llevaba `top:-6px` para compensar el relleno del panel. Ese negativo
  hacía que la cruz cambiara de sitio 6px entre «recién abierta» y «lista bajada». Anclada a
  `top:0` se pega al borde del área de scroll —que ya está 6 dentro por el relleno— y no se
  mueve.

Medido en la hoja real a 375px, los dos estados: recién abierta `{arriba:13, derecha:13}`, con la
lista al final `{arriba:13, derecha:13}`.

## El buscador de la hoja se montaba con la cabecera (23 Aug 2026)

Del botón de cerrar al cuadro de búsqueda había **8px**, y el cuadro empezaba exactamente donde
acababa la cabecera: cero separación. El desvanecido de 13px que separa la cabecera de la lista
caía entonces sobre el borde del campo en vez de sobre papel, que es lo que se veía montado.

`.dish-search` pasa a llevar 13 de margen arriba. Medido: cabecera→campo **13**, cruz→campo
**21**, sin solape (`rf.top < rh.bottom` = false).

## Carta y panel arrancan a la misma altura (23 Aug 2026)

En tablet y en pantalla partida los dos se miran juntos, así que el aire sobre la tarjeta tiene
que ser el mismo. No lo era:

| ancho | carta | panel |
|---|---|---|
| 375 | 13 | 13 |
| 768+ | 55 | 21 |

El móvil ya coincidía. De 768 en adelante manda el valor del panel —21—, que es el que se ve
bien con el panel abierto: `.food-menu-section` pasa de `var(--s5)` a `var(--s3)` de margen
superior. El margen inferior se queda en 89: ahí no hay nada con lo que cuadrar.

Medido a 940/910: tarjeta de la carta **21**, tarjeta del panel **21**. A 375, las dos a 13.

Queda un desfase inherente de 8px si lo que se compara es la **foto** y no el borde de la
tarjeta: la tarjeta de la carta lleva 8 de relleno por encima del hero, así que la foto arranca
a 29. El borde de las dos tarjetas sí está a la misma altura.

## La puerta del panel es la tarjeta de la carta (23 Aug 2026)

La pantalla de entrada era un formulario suelto: título, subtítulo y un campo. Ahora es la misma
pieza que ve el cliente —la portada metida 8px dentro de la tarjeta con **radio concéntrico**
(34 − 8 = 26 arriba, 21 de hoja abajo, medido `26px 26px 21px 21px` contra una tarjeta de 34), el
bloque de título centrado y el filete corto de 34 que en la carta separa los platos.

La imagen es **siempre la misma** y no sale de `estado.json`: no es una portada de la carta, es el
fondo del panel, y no tiene por qué cambiar cuando el restaurante cambia sus fotos. Vive en
`admin/acceso.jpg` y se sustituye a mano por FTP — el panel no la escribe, no la borra y no la
lista. Al `src` se le cuelga `?v=<filemtime>`: al reemplazar el archivo la dirección cambia sola y
nadie se queda viendo la anterior por la caché. Si el archivo no está, la tarjeta vuelve a sus
rellenos normales (`.sin-foto`) en vez de enseñar un hueco gris.

La que va en el build es un marcador generado, no una foto: un fondo cálido con foco, viñeta y
grano fino en los tonos de la marca, 900x600 y 49 KB. Se generó con GD (el script vive en el
scratchpad de la sesión) para no meter en el repo una imagen de terceros con su licencia detrás. La pantalla de **primera configuración** no lleva foto: es texto largo y de un solo
uso, así que se queda con la tarjeta lisa — por eso lo nuevo cuelga de `.is-recepcion` y no de
`.login` a secas.

`.page` gana `page-login` mientras no hay sesión: los 151px que reserva abajo son para la barra de
acciones del panel, y en la puerta no hay barra. La tarjeta se centra con `margin:auto` dentro de
un flex, no con `align-items:center` — centrando, una tarjeta más alta que la pantalla se recorta
por arriba sin poder llegar a ella. Medido: 1280×800 → 58 arriba y 58 abajo, sin scroll;
375×667 → 27 y 27, sin scroll.

### Asteriscos en vez de puntos

El navegador pinta puntos y CSS no deja cambiar el carácter: `-webkit-text-security` sólo ofrece
`disc`, `circle` y `square`. La solución habitual —cambiar el campo a `type="text"` y enmascarar
en JavaScript— rompe los gestores de contraseñas y mete el valor real en una variable.

Aquí el campo **sigue siendo `type="password"`**: se le vuelve el texto transparente y se dibuja
encima un `<span aria-hidden>` con un asterisco por carácter. Del valor sólo se lee la longitud.
El gestor de contraseñas y el llavero del móvil siguen funcionando, y la selección y el cursor son
los nativos.

El detalle que lo hace funcionar es el avance: el punto del navegador (U+2022) y el asterisco no
miden lo mismo, así que el script mide los dos con la tipografía real del campo y le pone al input
el `letter-spacing` que iguala uno con otro. Sin eso el cursor se va separando del último
carácter. Medido con 10 caracteres: `letter-spacing: 2.45px`, desfase acumulado **0,02px**.

La máscara se enciende desde JavaScript (`.con-mascara`), no desde el CSS: sin JavaScript el texto
transparente dejaría el campo pareciendo vacío mientras se escribe.

El rótulo pasa de «Panel de servicio» a **«Acceso privado»**.

## El primer plato de cada pestaña salía de otro color (23 Aug 2026)

`renderItem` le ponía `class="active"` al primer plato, y `.menu-content h3.active` lo pintaba
con el acento. Era herencia de la plantilla original —allí marcaba un plato como destacado— y
aquí no significaba nada: Papadum se veía en verde/latón y los otros 311 en tinta, sin motivo.

Fuera la clase, fuera la regla y fuera los parámetros que ya sólo servían para calcularla
(`isFirst` en `renderItem`, `isFirstOfPane` en `renderSub`). Comprobado en el HTML generado: los
**312** `<h3>` son idénticos.

## Marcha atrás con el vídeo de la puerta (23 Aug 2026)

Se llegó a montar la ventana de entrada con vídeo: el original de diseño era ProRes 4444 con alfa
(1920×1080, 7,2 s, 26 MB), y como ningún navegador reproduce ProRes —ni existe un formato con
transparencia que funcione en todos— hacían falta seis archivos: un `acceso.webm` VP9 con alfa
real para Chrome/Firefox/Edge y un `acceso-<tema>.mp4` por cada uno de los cinco temas para
Safari, con el fondo del tema pintado detrás porque Safari sólo admite alfa en HEVC, que no se
codifica fuera de macOS.

**Se ha quitado entero, a petición del cliente.** La puerta vuelve a `acceso.jpg`, una sola imagen
fija. Fuera los seis archivos y fuera `hacer-acceso.mjs`, el script que los generaba.

Lo que sobrevive del episodio, porque no dependía del vídeo:

- El hueco de la foto sigue en **3:2** con el radio concéntrico de siempre.
- Su fondo pasó de `--chip` a **`--ink`**, el mismo del `body`: mientras carga se ve el color de la
  página en vez de un gris que aparece y se va.
- El arreglo del autorrelleno que hay justo debajo.

## El autorrelleno rompía la máscara de asteriscos (23 Aug 2026)

Chrome repinta el texto autorrellenado con `-webkit-text-fill-color`, que se salta el
`color:transparent`: volvían a verse **los puntos del navegador debajo de los asteriscos**, y de
paso teñía el campo de azul. Se añade `-webkit-text-fill-color:transparent` (también en
`:-webkit-autofill`) y un `box-shadow` interior de 100px para tapar el fondo azul.

## Tamaño de texto ajustable en la carta (23 Aug 2026)

Una carta de restaurante la lee gente que no siempre ve bien, de pie y con poca luz. El zoom del
navegador ya funcionaba —no hay `user-scalable=no`, y al 200% la página se recoloca sin scroll
horizontal— pero obliga a pelearse con el gesto mientras se desplaza.

Tres botones `A A A` en la barra del hero, junto al idioma. Cada uno dice su tamaño con su propia
letra: no hay palabra que traducir ni icono que descifrar. **El de partida es el mínimo**, que es
exactamente lo que había antes: quien no toque nada ve la carta igual que siempre.

### Alcance corto, a propósito

Un token `--escala` (1 / 1,15 / 1,3) que sólo leen ocho reglas, todas del texto de los platos:
nombre, descripción, número, etiquetas, marca de agotado, badge de aviso y la escala de picante.
La barra de categorías, los chips, los botones y el cajón **no escalan**: son áreas de dedo, no
texto que leer, y crecerlas rompería los 44px de área táctil sin que nadie gane legibilidad.

`--tags-line` pasa a `calc(22px * var(--escala))`: reserva el hueco de la línea de número y
etiquetas en el móvil, y sin escalarlo el nombre del plato se le monta encima.

### Medido a 390px, en los tres niveles

| | normal | A+ (1,15) | A++ (1,3) |
|---|---|---|---|
| nombre de plato | 16px | 18,4 | 20,8 |
| descripción | 14 | 16,1 | 18,2 |
| número | 13 | 15 | 16,9 |
| etiqueta | 10 | 11,5 | 13 |
| alto de una fila | 86 | 95 | 105 |
| alto de la pestaña | 2188 | 2269 | 2415 |

La carta crece **+10,4%**, no el tercio que parecía: sólo se pinta una pestaña a la vez y buena
parte del alto es portada y cabecera, que no escalan. Comprobado en las 312 filas y a los tres
niveles: **cero colisiones** entre el precio y el nombre, y cero desbordamiento horizontal en 375,
390 y 768.

### Dos detalles que no son opcionales

- **Se aplica antes de pintar.** El valor se guarda en `localStorage` y se lee en el `<script>` de
  la cabecera, junto al tema. Aplicándolo al final del cuerpo, cada carga empezaba con la letra
  pequeña y daba un salto al llegar.
- **44px de alto, no 40.** Es el control que va a usar quien peor apunta con el dedo. El selector
  de idioma sube a 44 también: dos píldoras de alto distinto en la misma fila se leen como un
  descuadre.

## Una foto de puerta por tema (23 Aug 2026)

La ventana de entrada del panel tenía una sola imagen, y con el tema en Ciruela seguía saliendo
verde. Ahora hay cinco —`acceso-laurel.jpg`, `acceso-onice.jpg`, `acceso-caoba.jpg`,
`acceso-mar.jpg`, `acceso-ciruela.jpg`— y el PHP sirve la del tema en uso.

Tres escalones: el tema puesto, el tema de la casa, y `acceso.jpg` como último recurso. Si no hay
ninguna, la tarjeta se queda sin foto (`.sin-foto`) en vez de enseñar un hueco gris.

Siguen siendo archivos fijos: no salen de `estado.json`, el panel no los escribe ni los borra, y
se sustituyen a mano por FTP. Los originales venían a 1536×1024 y 1,7 MB cada uno; van al build
recortados a 900×600 —el hueco mide 424 CSS px— y entre **26 y 37 KB**. Los originales del cliente
no se tocan.

## El juego: selector de idioma y el aire de la portada (23 Aug 2026)

### El selector no era el mismo control

El de la carta se había ajustado a Bricolage 16 y 44 de alto; el del juego seguía en **13px y 40**,
y sus opciones en **Source Serif 15** en vez de Bricolage 16. Es el mismo control, se toca igual y
tiene que leerse igual: ahora los dos comparten número.

El marcado del idioma elegido pasa a decirse **sólo con el color** (`--accent-ink`) y con la
palomita: la base ya es peso 600, así que el `font-weight:600` del estado marcado no distinguía
nada. Es exactamente lo que hace la carta.

### La portada sumaba gaps y márgenes

Los huecos salían de sumar el `gap:21` de `.screen` con márgenes sueltos de cada bloque, y medían
**29 · 21 · 21 · 29 · 42**: cinco separaciones distintas sin que ninguna dijera nada. Y el eyebrow
del premio, vacío cuando no hay premio encendido, seguía gastando su hueco: entre la frase y el
ticket había **50px repartidos en dos gaps alrededor de algo invisible**.

`#s-intro` apaga el gap y declara cada separación, con la escala y con un motivo:

| de → a | ahora | por qué |
|---|---|---|
| mascota → título | 21 | se tocan pero no se pegan |
| título → frase | 13 | son un bloque: el nombre y lo que promete |
| frase → ticket | 34 | cambia de objeto, eso ya es una tarjeta |
| ticket → botones | 34 | el mismo salto antes de la zona de acción |

Y `#s-intro .eyebrow:empty{display:none}`: sin premio, fuera del flujo.

Medido en la portada real a 390px: **21 · 13 · 34 · 34**, eyebrow en `display:none`, selector a 44
de alto con Bricolage 16, y sus tres opciones en Bricolage 16 peso 600.

## El banner del juego (23 Aug 2026)

La entrada a Chilli Rush desde la carta iba en el acento de latón y se leía como una sección más
del menú. El trabajo de ese bloque es el contrario: decir «esto es otra cosa». Queda en fondo de
tinta —la portada del juego—, el nombre con «Rush» en el rojo inclinado, y un botón: **Jugar ▶**.

### Todo en una línea, a cualquier ancho

El nombre a la izquierda y el botón a la derecha con `margin-left:auto`, sin envolver y sin una
sola media query. Lo que lo sostiene es el `clamp` del nombre:

`font-size:clamp(21px, 6.4vw, 34px)` con `white-space:nowrap`

El suelo de 21 no es decorativo: el nombre no puede partirse, así que si no cabe **desborda** en
vez de envolver. Medido en el ancho más estrecho que hay que soportar:

| ancho | nombre | holgura entre nombre y botón |
|---|---|---|
| 320 | 21px | 13 |
| 360 | 23px | 21 |
| 375 | 24px | 31 |
| 1280 | 34px | de sobra |

La tarjeta mide **90px** en todos ellos y el botón queda a 21 del borde derecho. Sin
desbordamiento en ninguno.

### Un solo botón

La palabra y el triángulo van dentro de la misma píldora. Estuvieron un rato como dos piezas
seguidas —píldora + círculo, como la referencia que trajo el cliente— y se leían como dos
acciones cuando siempre fueron una.

Crema con texto de tinta (**10,8:1**) y el triángulo en el rojo del juego (**4,55:1**, y al ser
icono le basta con 3:1). La píldora en rojo con el texto en crema se quedaba en 4,48 y no llegaba
al mínimo del texto normal: aquí el rojo sólo puede ser el icono y «Rush», que a 34px en negrita
cuenta como texto grande.

### Lo que se probó y se cayó

- **El rótulo «MIENTRAS ESPERAS»** y el pie **«30 segundos, un dedo»**. Fuera, con sus claves de
  i18n.
- **Una píldora con el premio del día** leído de `estado.game.prize`. La lección que deja: el
  premio no se puede prefijar. Ponía «Gana» delante del texto que escribe el restaurante y salía
  «Gana Una bebida gratis» — se escribe con mayúscula inicial y no hay forma limpia de arreglarlo
  en tres idiomas sin romper nombres propios.
- **El logo del chile en un medallón de 48, flotando** con un `translateY` de 5px cada 5,4s,
  encendido sólo dentro del viewport por un `IntersectionObserver`. Se cayó por espacio: con él
  delante, a 375 el nombre y el botón sumaban 353 de los 265 disponibles y el botón se descolgaba
  a una segunda fila. Era exactamente lo que el cliente vio en local y pidió arreglar.

## El build ya hace la carpeta de subida (23 Aug 2026)

El LEEME prometía que `2-subir` se rehacía en cada compilación y no era cierto: `gen.mjs`
escribía sus siete ficheros dentro de `1-proyecto` y el volcado a la carpeta de subida se hacía
a mano, fichero a fichero. Un paso manual que nadie apunta en ningún sitio es un paso que
tarde o temprano se hace a medias.

Y aquí hacerlo a medias tiene un coste concreto. El sello del build viaja en dos sitios —dentro
del `index.html` y solo en `version.json`— y el runtime los compara para saber si el móvil del
cliente tiene la carta vieja. Subir uno sin el otro los descuadra, y entonces **cada visita se
recarga una vez y nunca alcanza la marca que pide**, porque el HTML que descarga sigue llevando
la anterior. El fallo no se ve en local: hace falta el hosting para notarlo.

Ahora la copia la hace el propio `gen.mjs`, al final y con los ficheros que acaba de escribir.

### Se rehace entera, no se sincroniza

`rmSync` y a empezar. Copiar encima deja vivo lo que se borró del origen, y un fichero que
sobrevive a su fuente acaba subido al servidor sin que nadie recuerde de dónde salió — que es
exactamente la regla de oro del LEEME al revés. Antes de borrar, una comprobación de que la ruta
termina en `2-subir`: es la única línea destructiva del build.

### Qué viaja y qué se queda en tierra

| origen | destino |
|---|---|
| `index.html`, `juego.html`, `version.json` | raíz |
| `assets/*` | `assets/` |
| `server/.htaccess`, `server/LEEME-SERVIDOR.txt` | raíz |
| `server/estado.json` | `estado-EJEMPLO.json` |
| `server/admin/*` | `admin/` |

`estado.json` cambia de nombre a propósito: el del servidor lo escribe el panel y subirlo encima
borraría los agotados del día.

En tierra se quedan, por nombre y no por ruta, los ficheros que **escribe el panel en el
servidor**: `clave.php`, `superclave.php`, `intentos.json`, `accesos.log` y `canjes.json`. Hoy
ninguno existe en local, y precisamente por eso la lista tiene que estar escrita: el día que
alguien copie uno para depurar, subirlo encima borraría la contraseña del restaurante o su
historial de accesos. Con ellos se va `server/admin/SPEC.md`, que son notas de diseño. Sólo el
primer nivel de cada carpeta: `assets/hero/` la crea el panel en el hosting con las fotos que
sube el restaurante y no tiene original aquí.

Salida del build: `2-subir rehecha | 25 ficheros | build <marca> | en tierra: SPEC.md`.
Comprobado fichero a fichero con `cmp`: los 25 idénticos a su origen, y el sello dentro del
`index.html` igual al de `version.json`.

### Nota de método: los bytes del log no son los del disco

El `console.log` del build dice «written 697226 bytes» y el fichero pesa 699256. No falta nada:
`html.length` cuenta caracteres de JavaScript, y la carta va en UTF-8, donde no todos los
caracteres ocupan un byte. Contados: **1612 caracteres no ASCII**, de los que 1194 gastan dos
bytes (`á`, `ñ`, `·`) y 418 gastan tres (`—`, `▶`, las comillas tipográficas). 1194 + 418×2 =
**2030 bytes de exceso**, que es justo la diferencia. No falta nada; son dos unidades distintas
leídas como si fueran la misma.

## El panel ya tiene vuelta atrás (23 Aug 2026)

Guardar en el panel no modificaba el estado: lo **reconstruía entero**. Los agotados en
`index.php:1067-1073` y los precios en `:1179-1189` se rehacen desde cero en cada guardado y se
descarta lo que no valide. Con el botón de «Volver a los precios de la carta» al lado, un clic se
llevaba por delante semanas de ajustes. No había ninguna copia, ninguna exportación y ninguna
forma de recuperarlo: en las 8.400 líneas del proyecto no existía la palabra copia.

Con un solo restaurante ya era grave, y con más de uno se multiplica: cada carta tiene su panel y
su `estado.json`, y el error que borre el trabajo de uno no avisa en los demás.

### Dos copias, porque son dos preguntas distintas

| Fichero | Qué contesta |
|---|---|
| `admin/copias/anterior.json` | Cómo estaba justo antes del último guardado |
| `admin/copias/<fecha-servicio>.json` | Cómo estaba al empezar ese servicio, 30 días atrás |

La primera es la que se usa de verdad: el error que pasa es el de hace un minuto, no el del mes
pasado. La segunda se escribe **una sola vez al día**, en el primer guardado, y es la que cubre
«esto se rompió la semana pasada y nadie dijo nada». La fecha es la de servicio, no la natural:
un cambio a las 02:00 sigue perteneciendo al servicio de la noche anterior, igual que los
agotados.

Se escriben desde `copia_de_seguridad()`, llamada como primera instrucción de `guardar_estado()`,
con el fichero anterior todavía en disco. Si falla no dice nada y el guardado sigue: no poder
copiar es malo, pero impedir que el restaurante marque un plato agotado en plena cena es peor.

### Restaurar también se deshace

Restaurar pasa por `guardar_estado()`, así que lo primero que hace es copiar el estado de ahora a
`anterior.json`. Deshacer una restauración es otra restauración. Nadie se queda sin salida por
haber pulsado el botón equivocado, que es la diferencia entre un botón que se usa y uno que da
miedo tocar.

### Por qué dentro de admin/ y no en la raíz

`estado.json` es público —lo lee la carta en cada visita— pero su historial no tiene por qué:
diría a qué hora se agota cada plato y cada cuánto se tocan los precios. `admin/copias/` hereda
el `.htaccess` de `admin/`, que ya deniega todo `.json`, y además el panel le escribe el suyo
propio al crear la carpeta, por si algún día se mueve de sitio.

Como están denegadas por HTTP, la descarga la sirve el PHP con la sesión ya comprobada. El nombre
que llega del formulario **no se concatena nunca con una ruta**: se busca en `copias_listar()`, que
sólo devuelve lo que casa con `anterior.json` o `AAAA-MM-DD.json`, y lo que no esté en esa lista no
existe para el panel. Comprobado: `descargar_copia=../config.php` devuelve la página con un error,
sin cabecera de descarga.

### Medido en el panel real, con PHP 8.4

- Primer guardado: se crea `copias/` con su `.htaccess`, `anterior.json` y el del día. Cero `.tmp`
  sueltos — se escriben con el mismo temporal + `rename` que el resto del panel.
- Segundo guardado del mismo día: `anterior.json` pasa a `onice`, el del día **sigue** en `laurel`.
- Restaurar `anterior.json`: el estado vuelve a `laurel` y `anterior.json` pasa a `onice`. La
  vuelta atrás de la vuelta atrás funciona.
- Purga con 35 copias sembradas: quedan **30**, de la más nueva a la más vieja, `anterior.json`
  intacto.
- Descarga: `application/json`, `Content-Disposition` con nombre, contenido JSON válido.

La purga sólo corre el día que se crea una copia nueva, así que el historial puede llegar a 31
ficheros durante unas horas. Es la diferencia entre recorrer la carpeta una vez al día y hacerlo
en cada guardado de cada servicio; a 30 días de unos pocos KB, el fichero de más no molesta a
nadie.

### Dónde vive

En **Marca**, debajo de los colores, fuera del `<form>` del tema y fuera del `if` de `temas.json`:
las copias tienen que estar ahí aunque falte el catálogo de temas, que es justo cuando algo ha ido
mal. La alternativa era una octava pestaña en una barra que a 375px ya desborda.

El rótulo de la pestaña decía «se elige una vez y no hay que volver aquí», que ya era falso desde
que las fotos de portada viven ahí. Ahora nombra las tres cosas y dice de cuál de ellas es verdad
que se toca una sola vez.

### La fecha de una copia sale de su nombre, no de su fecha de fichero

Primera versión: la fila se anunciaba con el `filemtime`. Salió en la prueba con 35 copias
sembradas —todas escritas el mismo día— y las treinta y cinco decían ser de hoy.

El caso de sembrado es artificial, pero el fallo no lo es: la copia del servicio del 22 se escribe
en el **primer guardado de ese servicio**, y ese servicio llega hasta las 06:00 del 23. Un
guardado a las 02:30 le pone al fichero fecha del 23 y la fila habría anunciado el día que no era
—justo la clase de detalle por el que alguien restaura la copia equivocada—. Ahora la fecha sale
de los diez primeros caracteres del nombre, que es lo que decidió `fecha_servicio()` al crearla.

De `anterior.json` sí interesa la hora, porque es la de hace un rato y sirve para reconocerla. De
las del día no: su fecha ya está en el título, y la hora a la que se escribió no dice nada.

## Lo que es de este restaurante, en un solo archivo (23 Aug 2026)

Cada restaurante nuevo es una copia entera de esta carpeta: se duplica, se le mete su carta y se
le cambian los nombres. Es una forma de trabajar deliberada — tocar una copia no puede romper otra,
que es la garantía más fuerte que hay y ningún motor compartido la da.

Lo que la copia **no** arregla sola es que dos cartas en el mismo dominio se pisan, y por eso
existe `cliente.mjs`: tres campos al principio del proyecto, en vez de ocho literales repartidos
por dos ficheros que hay que acordarse de buscar en cada alta.

| Campo | Qué arregla |
|---|---|
| `slug` | Prefija las siete claves que la carta guarda en el navegador |
| `base` | El `canonical` y el `og:url`, que estaban escritos a mano |
| `secreto` | La sal con la que se firman los códigos del juego |

Nace pequeño a propósito. El nombre, la carta, los diccionarios y la taxonomía siguen dentro del
motor: sacarlos ahora, sin los ID estables hechos, sería mover dos veces las mismas 500 líneas.

### `localStorage` es por origen, no por carpeta

Es el detalle que hace falta entender para que lo demás tenga sentido. Dos restaurantes en
`socialcard.es/uno/` y `socialcard.es/dos/` **comparten almacén**: el navegador no separa por
carpeta, separa por dominio. Sin prefijo propio, el comensal que entra en los dos se lleva de uno
a otro el tema, el idioma, el tamaño de letra y el premio del juego, que la carta sólo comprueba
por fecha.

Siete claves —`cr-`, `empujon`, `escala`, `lang`, `premio`, `recargada`, `tema`— y ni un literal
suelto: todas pasan por `CLAVE('tema')`, así que la que se añada mañana sale prefijada sin que
nadie tenga que acordarse.

### El secreto del juego, escrito una vez y leído en dos

`totm-chilli` estaba a mano en `juego.mjs` y otra vez en `index.php`. Con dos restaurantes eso
significa que **un código ganado en A se canjea en B**, porque la firma es la misma.

Ahora sale de `cliente.mjs`, y el build escribe `admin/cliente.php` con el mismo valor para que lo
lea el panel. Es el patrón que ya usaban `tokens.css`, `temas.json` y `platos.json`: el build
escribe, el panel lee, una sola verdad. Va en su archivo y no dentro de `config.php` porque
`config.php` se edita a mano y lo que genera el build no puede pisar lo que escribe una persona.

**Si `cliente.php` falta, no valida ningún código.** Es a propósito. Un valor por defecto haría que
la carta de un restaurante aceptase los premios de otro, que es justo lo que este archivo viene a
evitar. Fallar cerrado se ve el mismo día y se arregla subiendo el archivo; fallar abierto no se ve
nunca. El panel lo dice en la pestaña Juego, con el nombre del archivo que falta.

### Para Tinge no cambia absolutamente nada, y está medido

`slug` se queda en `totm` y el secreto en `totm-chilli` — literalmente lo que ya había. Ponerle un
nombre más bonito le habría borrado a cada cliente con la carta abierta su tema, su idioma y, si
había ganado hoy, su premio sin canjear. No hay ninguna razón para cobrar eso.

Comprobado compilando el commit anterior y el nuevo y comparando los dos `index.html`: **idénticos
salvo el sello del build**, y `juego.html` idéntico byte a byte. El refactor no toca una coma de lo
que ve el comensal.

### Y comprobado que sí separa, con un segundo cliente de mentira

Compilando con `slug: 'pizzoni'` y `secreto: 'pizzoni-brasa'`: las siete claves salen
`pizzoni-*`, el `canonical` y el `og:url` apuntan a su carpeta, y `admin/cliente.php` lleva su
firma.

Contra el panel real, con PHP 8.4:

| Código | Respuesta del panel |
|---|---|
| Firmado con el secreto propio | «Válido y canjeado» |
| Firmado con el de otro restaurante | «Los números no cuadran: el código no lo ha dado el juego» |
| Propio, pero sin `cliente.php` subido | Rechazado, y el panel avisa de qué archivo falta |

El segundo caso es el que importa: **antes de este cambio, las dos primeras filas decían lo
mismo**, porque la firma era el mismo literal en las dos copias. Un premio ganado en un
restaurante se canjeaba en el de al lado.

## El motor deja de llevar dentro el restaurante (23 Aug 2026)

Después de dar de alta al segundo cliente —Dedos Las Américas— se pudo medir lo que costaba de
verdad: **176 de 4.752 líneas de `gen.mjs` diferían** entre los dos. El 96% idéntico. Y las que
cambiaban no eran lógica: la taxonomía, el nombre, la lista de idiomas y dos botones. Ni una línea
del render, del CSS ni del JavaScript del cliente.

El problema no era que hubiera que copiar un motor. Era que **había datos escritos como código
dentro de él**, y por eso había que abrirlo.

### Qué se movió a `cliente.mjs`

`TAB_INTRO`, `GROUPS`, `TAB_ICON`, `GROUP_ICON_BY_CAT`, `CATEGORIAS_DUPLICADAS`, la lista de
idiomas y los seis rótulos —nombre, título, título social, rótulo, descripción y título del
juego—. Ninguna función. El movimiento es puro traslado.

Los rótulos eran seis y no uno, que es la clase de cosa que se descubre buscando: el `<title>` y
el `og:title` no dicen lo mismo, y el rótulo pequeño de la portada es una tercera cadena. Con uno
solo, cualquiera de los otros dos se queda con el nombre del restaurante anterior.

Las banderas de los idiomas **no** se movieron. El restaurante dice qué idiomas quiere; cómo se
dibuja cada bandera es del motor. `IDIOMAS` se deriva ahora del inglés más lo que declare el
cliente.

### Medido: los dos motores son el mismo fichero

```
gen.mjs    IDENTICO
juego.mjs  IDENTICO
temas.mjs  IDENTICO
```

Y las dos cartas compiladas antes y después del traslado son idénticas salvo el sello del build y
un comentario del CSS que nombraba a Tinge y ahora no nombra a nadie. En el juego de Dedos hay
además una diferencia que es un arreglo: ya no emite un título en alemán para un idioma que esa
carta no ofrece — antes estaba escrito a mano con las tres claves.

### `importar.mjs`: la carta como datos

Lo que quedaba caro era el catálogo: 500 claves de diccionario y una tabla de 60 filas escritas a
mano, donde una sola errata rompe el build con un error que no señala la línea.

Ahora la carta de un restaurante vive en `carta.mjs` —pestañas, categorías y platos, en inglés y
en español— y `node importar.mjs` escribe `menu.md` y las cinco secciones de catálogo de
`i18n.es.mjs`. La sección `ui` no se toca: es interfaz y se mantiene a mano.

Tres cosas que hace y que no son adorno:

- **Avisa si el mismo texto lleva dos traducciones distintas.** Un nombre repetido en dos
  categorías comparte traducción a propósito; dos traducciones distintas para el mismo nombre son
  un error, y sin esto ganaba la primera en silencio.
- **Comprueba que `carta.mjs` y `cliente.mjs` digan lo mismo**, y si no, escupe el bloque exacto
  que hay que pegar. La alternativa era que el build reventara más tarde y peor.
- **Escribe las líneas de intro también en `ui`.** Salió probando la plantilla con un cliente
  inventado: la intro de una pestaña vive en `TAB_INTRO` pero el build la traduce por `ui`, así
  que el importador la escribía en un sitio y no en el otro y el build pedía una cadena que nadie
  había escrito a mano en ningún lado.

Tinge no usa `carta.mjs`: su `menu.md` es anterior y se mantiene a mano. El importador está en su
carpeta porque es la que se copia, y con `carta.EJEMPLO.mjs` al lado.

### Probado con un cliente inventado, de principio a fin

Copiar la carpeta, renombrar `carta.EJEMPLO.mjs`, `node importar.mjs`, pegar el bloque que dijo,
`node gen.mjs`. Compila: 4 platos, 2 pestañas, 3 categorías. **Sin abrir `gen.mjs` ni una vez.**

Y después, las dos cartas de verdad recompiladas y comparadas contra su versión anterior: Tinge
intacta, Dedos intacta.

### El botón de Guardar de Marca se quedó debajo de la fila de descarga

`.bar` no es una fila de botones: es **la barra fija del fondo de la pantalla**, y hay
exactamente una por pestaña. La fila «El estado de ahora · Descargar» de las copias de
seguridad la reutilizó por parecido visual, y al ir después en el HTML se pintó encima de la
del formulario de Marca. Resultado: al elegir un tema, el botón que se veía abajo decía
**Descargar** y el de **Guardar** estaba debajo, invisible y sin poder pulsarse.

Lo encontró el cliente en el servidor, no una prueba. La comprobación que lo habría cazado es
de una línea y ahora está hecha: contar `.bar` por pestaña y que dé uno.

| pestaña | barras fijas |
|---|---|
| agotados · ocultos · ofertas · precios · juego · marca | 1 cada una |

La fila de descarga pasa a `.fila-accion`, que es `position:static` y vive dentro de la tarjeta.
Medido con `elementFromPoint` sobre el centro del botón de Guardar: devuelve el propio botón, no
hay nada encima.

## Elegir categoría desde la hoja no llevaba al principio (23 Aug 2026)

Dos síntomas, uno solo era el que se veía: al elegir una categoría en la hoja, la carta cambiaba
de pestaña pero se quedaba a media lista; y el botón de categorías no respondía hasta dar un
pequeño scroll.

### La causa: `closeSheet` se ejecutaba dos veces

La hoja mete una entrada en el historial al abrirse, para que el botón atrás del móvil la cierre
en vez de sacar al cliente de la carta. Al cerrarla, `closeSheet` deshace esa entrada con
`history.back()` — y eso dispara un `popstate` que vuelve a llamar a `closeSheet`.

La segunda llamada llega **dentro de los 400 ms de la animación de salida**, cuando la hoja
todavía no está `hidden`, así que no la para el `if (sheet.hidden) return`. Y como llega sin
destino, devolvía la página exactamente a donde estaba antes de abrir la hoja: deshacía el salto
que se acababa de hacer.

Un pestillo de una línea —`fondoBloqueado`— y se acabó: el fondo se suelta una vez.

Se descartaron por el camino, midiendo, tres sospechosos razonables: el scroll suave, la
restauración de scroll del historial y el `focus()` al cerrar. Los tres eran problemas reales
pero ninguno era **el** problema.

### Tres cosas más que sí estaban mal y ahora no

- **`overflow:hidden` en el body no congela el fondo en iOS.** Deja seguir el scroll por debajo y
  recoloca la página al soltar. Ahora es `position:fixed` con `top` negativo, que sí lo clava, y
  al soltar se devuelve a mano al píxel exacto. Es también lo que explica el «no responde hasta
  que hago scroll»: ese pequeño scroll era iOS resincronizando.
- **`focus()` sin `preventScroll`** arrastraba la página hasta la lupa de la barra, justo después
  de haberla puesto donde tocaba.
- **Dos desplazamientos suaves a la vez.** `scrollIntoView` centraba el chip con `block:'nearest'`,
  que también mueve la página en vertical, y competía con el salto que venía detrás. Ahora el
  chip se centra tocando `scrollLeft` de la barra, que no puede mover nada más.

### El suave se declara en CSS, no se pide en JavaScript

`behavior:'smooth'` en `scrollTo` es una sugerencia. Hay entornos —esta misma prueba, sin ir más
lejos— donde **no hace nada en absoluto**: ni anima ni salta, y la carta se queda donde estaba.
Con `scroll-behavior` en el CSS el movimiento siempre ocurre y lo único que decide el navegador
es si lo anima.

La barra de pestañas no lo lleva a propósito: centrar el chip es un ajuste dentro de una barra, y
ahí importa que ocurra, no que se vea ocurrir.

### Comprobado con la carta corriendo, a 375px

Cinco categorías elegidas desde la hoja: las cinco aterrizan en **141**, que es el arranque de la
lista, con desfase **0**. El chip queda dentro de la barra en las cinco. El botón responde al
toque siguiente sin necesidad de scroll. El botón atrás cierra la hoja y no saca de la carta. La
lupa sigue abriendo con el foco en el campo y el buscador sigue encontrando. Y al final no queda
ni un estilo suelto en el `body`.


## La analítica llega de Dedos (24 Aug 2026)

Contador de aperturas y pestaña **Analítica**. No se escribió aquí: se portó desde
`dedos_las_americas`, donde se hizo, se auditó y se arregló. Llega ya con los ocho arreglos de esa
auditoría, así que Tinge no repite ninguno de ellos.

### Qué cuenta y qué no

Aperturas de la carta, y **una por móvil y día**: el mismo teléfono cuenta una vez aunque abra la
carta cinco veces, y en una mesa de cuatro donde sólo mira uno, cuenta uno. No guarda IP, ni
cookie, ni identificador de ninguna clase — por eso la carta no necesita aviso de cookies.

El día es el **natural de Canarias**, de 00:00 a 00:00. No es la fecha de servicio de los agotados,
que corre el corte a las 6:00: eso vale para la cocina y no para contar gente. Entre medianoche y
las seis las dos fechas difieren y la pestaña lo dice, sólo en esas horas.

### Cómo está montado

| | |
|---|---|
| `admin/datos.php` | Añade **un byte** al fichero del día. Las aperturas son su tamaño |
| `admin/datos/` | Un `.txt` por día del mes en curso, un `.json` por mes cerrado |
| El medidor | En la carta: 4 segundos a la vista, marca en `localStorage`, `sendBeacon` |
| La pestaña | Gráfica de 30 días recorrible + tres cifras con su tira de barras |

Un byte y no un JSON a propósito: con veinte mesas abriendo la carta a la vez, leer un JSON,
sumarle uno y reescribirlo es corrupción garantizada. Un append con `LOCK_EX` de un byte es
atómico también en hosting compartido, y entonces no hay nada que corromper.

### Comprobado en el panel de Tinge, no en el de Dedos

Con 40 días de datos de prueba: las siete pestañas sin un aviso de PHP, la gráfica con sus 30
barras, las tres tiras con 7, 7 y 31, y el aviso del reloj saliendo a la 01:33. El endpoint apunta
con POST, devuelve 405 a un GET, rechaza a Googlebot y se escribe su propio `.htaccess`.

El medidor de la carta no se pudo disparar aquí —exige la pestaña a la vista y el navegador de
este entorno no compone fotogramas—, pero el bloque que viaja en el HTML es **idéntico byte a byte**
al de Dedos, donde sí se vio contar; lo único que cambia es la marca, `totm-contada` en vez de
`dedos-contada`, que es justo lo que evita que las dos cartas compartan cuenta en un mismo móvil.

### Encendido

`DATOS_ACTIVO` en dos sitios que tienen que decir lo mismo: `gen.mjs` y `admin/config.php`.
Encendido en uno y apagado en el otro deja a la carta llamando a un 404 en cada visita. Es el mismo
par que `OCULTOS_ACTIVO`.

## Fuera los premios, dentro los récords (24 Aug 2026)

El premio obligaba al restaurante a validar un código y entregar algo. Eso rompe el producto: el
juego tiene que funcionar solo. Se ha quitado entero —objetivo, texto del premio, minutos, el
código `CR-DDMM-…`, la pantalla del camarero, el reloj, los canjes y el salto a la reseña— y en su
lugar queda **el récord de la casa**.

### Lo que ya estaba hecho

Medio encargo no había que construirlo. **El botón de «Jugar otra vez» ya existía**: se escondía
en dos sitios porque «ganar cerraba el día». Quitado el premio, se ve siempre. Y ya había una
mejor marca personal en `localStorage`, que se queda: es el pique consigo mismo y no compite con
el récord de la casa.

### El récord vive en su propio fichero

`record.json`, en la raíz, con dos campos: puntos y fecha. **No dentro de `estado.json`**, donde
están los agotados, los precios, el tema y las fotos: quien escribe el récord es un endpoint
público, y un endpoint público no toca el trabajo del restaurante. Es la misma decisión que ya se
tomó con el contador de aperturas.

Va en la raíz y no en `admin/` por obligación: el `.htaccess` de `admin/` deniega todo `.json` y el
juego, que es público, tiene que leerlo. Y se añadió al `no-store` de la raíz, con `estado.json` y
`version.json`, o se serviría cacheado.

### La validación, y hasta dónde llega

En 30 segundos, con el ritmo de 620 a 320 ms, caben unas 64 fichas; si todas fueran doradas (+3) y
no fallara ninguna, 192. El tope se puso en **300**. Comprobado contra el endpoint: `250` y `300`
entran, `301`, `9999`, `-5`, `abc` y `0` se rechazan con 400, un GET da 405 y Googlebot se queda
en 204. Con el juego apagado devuelve 204 y no escribe.

**Y sólo se escribe si supera.** Eso no es sólo lógica de récord: es lo que limita la frecuencia
de escritura sin tener que contar peticiones de nadie.

Lo que esto NO impide: alguien con la consola abierta puede mandar un 250. Sin sesiones ni
seguimiento no hay forma, y este proyecto no los quiere. Es un marcador de bar, no una liga.

### Un fallo de producción que apareció de paso

`juego.mjs` llevaba el título escrito a mano — `<title>Chilli Rush — Tinge of Turmeric</title>` —
y el fichero es idéntico en los dos proyectos, así que **el juego de Dedos se publicaba con el
nombre de Tinge**. Sólo se corregía por JavaScript al cargar, de modo que el primer pintado, el
HTML estático y lo que ve un rastreador llevaban el restaurante equivocado. Ahora sale de
`CLIENTE.tituloJuego`.

### Dos cosas que casi se cuelan

**`CLIENTE_SLUG` se fue con el secreto.** La línea que escribía `CR_SECRETO` en `admin/cliente.php`
tenía el slug justo encima, y la limpieza se llevó las dos. El panel habría arrancado con el
prefijo vacío. Se vio mirando el fichero generado, no el código.

**El diccionario de runtime de la carta no llevaba las palabras nuevas.** La tarjeta del juego
pinta el récord desde JavaScript con `tr()`, y lo que no está en `RUNTIME_STRINGS` sale en inglés
sin que nada avise. Añadidas `Record` y `points`; el build ya tenía un control que revienta si una
cadena del runtime no está traducida, y ahora las cubre.

### La tarjeta de la carta creció menos de lo temido

El récord no puede ir en la misma línea que el nombre: a 320px el nombre y el botón se reparten el
ancho con 13px de holgura y el nombre no puede partirse. Va debajo, en una columna. Medido con el
viewport de verdad y no falseando el ancho del `body` —el `clamp` del nombre usa `vw`, así que
cambiar el body no cambia nada—:

| ancho | alto de la tarjeta | nombre | holgura |
|---|---|---|---|
| 320 | 94 | 21px | 13 |
| 375 | 97 | 24px | 31 |

Se temían 112px y son 94. Sin desbordes en ninguno.

> Esta medida es de cuando el récord era un número suelto. Con nombre y bandera la línea ya no
> cabe al lado y la tarjeta pasa a rejilla: 121px. Ver «Un podio de tres», al final.

### La pestaña Juego, en tres cosas

Interruptor, el récord con su fecha, y un botón de poner a cero. Fuera los campos de objetivo y
minutos, la tarjeta del premio, la de reseñas, «Comprobar un código» y «Canjeados hoy»: de 143
líneas a 62.

Poner a cero **borra** `record.json` en vez de escribir un cero: un fichero con `puntos: 0` y una
fecha diría que alguien hizo cero puntos ese día. Y va en su propio formulario, no en el Guardar
de la pestaña, porque borra algo que no se recupera.

### El juego se entrega encendido

Venía apagado porque encenderlo comprometía al restaurante a pagar un premio. Sin premio no
compromete a nada. El interruptor se queda para quien no quiera juego.

### Comprobado jugando, no leyendo

Partida completa tocando fichas por JavaScript: 69 puntos contra un récord de 34 → ceja «¡Nuevo
récord!», `record.json` en 69, y la línea de «Récord de la casa» **oculta** en esa pantalla porque
el número grande ya es el récord. Segunda partida de 2 puntos → «Tu puntuación», el récord intacto
y la línea visible. «Jugar otra vez» reinicia sin recargar (`navigation.startTime` sin cambiar).
La carta enseña «Récord: 69 puntos». Las ocho pestañas del panel sin un aviso de PHP.

Un detalle que sólo se ve corriendo: la línea del récord se repintaba encima al volver la
respuesta del servidor, que llega después de pintar la pantalla. Hizo falta una bandera.

### Lo propio de Tinge

`juego.mjs` era **byte a byte idéntico** al de Dedos, así que el trabajo se hizo allí, se verificó
jugando, y aquí se copió el fichero entero. El panel y el build llevaron el mismo parche; sólo dos
trozos hubo que poner a mano, y los dos por divergencias que no eran del juego: `admin/cliente.php`
aquí no escribe las etiquetas de destacado, y el `LEEME-SERVIDOR.txt` todavía no mencionaba
`datos.php` ni la carpeta `datos/` —se quedó fuera al portar la analítica— así que se añadieron las
dos cosas de una vez.

**Tres idiomas y no uno.** Las cuatro cadenas nuevas van en `i18n.es.mjs` y en `i18n.de.mjs`; el
inglés es la propia clave. Comprobado en el juego cambiando de idioma en caliente:

| | |
|---|---|
| es | Récord de la casa: 51 puntos |
| en | House record: 51 points |
| de | Hausrekord: 51 Punkte |

Partida completa en alemán: 42 puntos contra un récord de 51 → «Dein Ergebnis», el récord intacto.
La tarjeta de la carta a 320px mide 94 de alto con 13 de holgura y «Rekord: 51 Punkte» cabe. Las
ocho pestañas del panel sin un aviso de PHP.

Y el `<title>` estático del juego aquí siempre estuvo bien — era el de Dedos el que salía con este
nombre.

## Más lento, y una bomba (24 Aug 2026)

Dos cambios en la partida, pedidos juntos.

### Un 10% más lento

Las dos curvas del ritmo se estiran a la vez:

| | antes | ahora |
|---|---|---|
| Hueco entre fichas | 620 → 320 ms | 682 → 352 ms |
| Vida de cada ficha | 1,50 → 0,85 s | 1,65 → 0,94 s |

Las dos y no una: sólo el hueco dejaría la pantalla llena de fichas viejas, y sólo la vida las
haría salir igual de rápido pero quedarse más. Estirando ambas, la partida sale más suelta y
aprieta igual al final, que es la forma que tenía.

### La bomba

Cuarta ficha. Se toca y **el marcador se va a cero** — no resta, vacía. La racha también.

**Un 5% más grande que cualquier otra: 67,2 contra 64.** Que el peligro sea el blanco más fácil de
acertar es la gracia; se acierta sin querer. Medido en el navegador: chile, dorado y hielo miden
64, la bomba 67,2, la razón exacta 1,05.

Roja maciza con el dibujo en crema y un aro de crema alrededor. El aro no es adorno: el rojo sobre
el tablero de tinta no llega a 3:1 en los cinco temas y el círculo se perdería contra el fondo.

Y el color no decide solo — la regla de siempre en este juego. La forma es una bomba, el tamaño es
distinto, el número que sube dice **−42** en vez de un `−2` genérico, el marcador entero parpadea
en rojo y el móvil vibra tres veces en vez de una. Nadie tiene que distinguir un rojo de un crema a
toda velocidad para no perderlo todo.

### Cuántas salen

Un 5% al principio y un 8% al final, en su propia banda del sorteo: dos o tres por partida. No hace
falta más, porque **no es mala suerte**: se ve venir, es la ficha más grande de todas y tocarla es
una decisión. Las bandas de dorado y hielo se recolocaron para que su proporción real no cambie al
meter una cuarta.

### Comprobado jugando

Con 42 puntos y una racha de 30, tocar la bomba deja el marcador en 0, la racha en 0, el número
flotante en «−42» y la clase `boom` en el marcador. En Tinge, lo mismo en alemán con 6 puntos.

Y la regla de la portada cambia de clave: «Toca los chiles. Esquiva el hielo **y la bomba**». En
alemán se corrigió el tratamiento — el diccionario del juego trata de usted y la primera versión
tuteaba.

### La tarjeta del juego, al ancho de la portada (24 Aug 2026)

Se veía metida hacia dentro respecto a la foto de cabecera. El motivo: vive dentro de
`.food-menu-tab`, que es quien da la calle del contenido con `padding:0 var(--gutter)`, y la
portada no — está un nivel más arriba a propósito, «pegada al borde tiene más presencia que metida
en la columna de texto».

Se saca de la calle con el mismo recurso que ya usaba `.legend-allergens`, y por la misma razón:

```css
margin-left:calc(var(--s1) - var(--gutter));
margin-right:calc(var(--s1) - var(--gutter));
```

Tirar hacia fuera lo que mide la calle y devolverle los 8 que la portada deja por los lados. Al
leer `--gutter` cuadra sola en los cuatro breakpoints, sin una sola media query nueva.

Medido contra `.hero-frame`, que es la caja que se ve:

| ancho | portada | tarjeta |
|---|---|---|
| 1270 | 1228 (21 → 1249) | 1228 (21 → 1249) |
| 375 | 333 (21 → 354) | 333 (21 → 354) |
| 320 | 278 (21 → 299) | 278 (21 → 299) |

A 320 no cambia nada porque allí la calle ya medía 8 y la resta da cero: el desajuste sólo se veía
de tablet para arriba, que es donde se vio.

## La carta de Tinge deja de escribirse a mano (25 Aug 2026)

Tinge era el último cliente con `menu.md` a mano. Los otros dos escriben `carta.mjs` y dejan que
`node importar.mjs` genere `menu.md` y los diccionarios. Se ha migrado.

**La carta publicada no cambia.** El `2-subir` regenerado es idéntico byte a byte al que estaba en
producción salvo el sello del build, que cambia en cada compilación por diseño. Se comprobó
recompilando el proyecto de antes y el de después y comparando los 29 ficheros: sólo difieren
`version.json` y la línea de `index.html` que lleva ese mismo sello.

### Lo que había que resolver antes de poder migrar

El importador que traían Dedos y Regina no valía tal cual para Tinge. Tres cosas:

**Los idiomas.** El importador sólo sabía escribir `i18n.es.mjs`. Tinge tiene alemán además de
español, así que el alemán se habría quedado fuera del flujo: la carta se generaría desde
`carta.mjs` y el diccionario alemán seguiría a mano, desincronizándose al primer plato nuevo.
Ahora los idiomas salen de `IDIOMAS_CLIENTE` en `cliente.mjs` y se escribe un fichero por idioma.
Con un solo idioma se comporta exactamente igual que antes, así que Dedos y Regina no se enteran.

**El número del plato.** El importador numeraba solo: 01, 02, 03. Los números de Tinge no son
correlativos y no se pueden deducir de nada.

| | |
|---|---|
| platos en la carta | 312 |
| con número impreso | 149 |
| sin número | 163 (salsas, ingredientes, y las pestañas Sin gluten y Vegano enteras) |
| saltos | del 67 al 69 |
| desdobles | 24a · 24b · 24c |
| último número | 148, con 149 filas numeradas |

El número se imprime a la izquierda del plato y el buscador busca por él, así que inventarlo
cambiaba lo que ve el comensal. Va escrito en `carta.mjs`, en la última columna de cada fila, y el
importador lo copia tal cual. Un plato sin número lleva la cadena vacía, que es un valor y no un
olvido. Si la columna no está, se cae al contador de antes.

**Las notas de categoría.** La frase que vale para todo un grupo —«Todos los naan se elaboran sin
huevo»— ya la sabía pintar `gen.mjs`, pero el importador la dejaba siempre vacía. Tinge tiene
nueve. La solución ya existía en Café Regina y se ha traído.

### Lo que se quitó: la categoría duplicada

`South Indian Curries - Ingredients` era una copia literal de `Curries - Ingredients` —catorce
platos idénticos en nombre, descripción y precio— que la carta impresa repetía y que aquí no
colgaba de ninguna pestaña: **no se enseñaba**. Existía porque `menu.md` se escribía a mano y
`CATEGORIAS_DUPLICADAS` comparaba las dos listas para reventar el build si alguien subía el precio
del cordero en una sola.

Con `carta.mjs` no hay segunda lista que pueda desviarse: los catorce ingredientes están escritos
una vez. Mantener la copia habría sido reintroducir a mano el problema que la comprobación
vigilaba. Así que la copia sale de la carta y `CATEGORIAS_DUPLICADAS` se queda vacío, con el
comentario que explica cuándo volvería a hacer falta.

Efecto medido en la salida: ninguno. El único rastro es una clave menos en `notes` —la nota de esa
categoría, que nadie leía porque la categoría no se pintaba— y el contador del build, que ahora
dice 40 categorías y 312 filas en vez de 41 y 326.

### Un fallo que el build no habría cazado

La primera versión guardaba en el diccionario sólo las traducciones, sin el inglés, y el índice
del idioma se desplazaba en uno: **`i18n.es.mjs` se escribió con el texto alemán y `i18n.de.mjs`
con `undefined`**. El build compiló sin una sola queja, porque las claves estaban todas ahí y
`tr()` sólo protesta cuando falta una clave, no cuando el valor está en otro idioma.

Lo cazó comparar `platos.json` contra el anterior: 262 pestañas y 241 nombres «en español» que
decían *Kleinigkeiten & Suppen*. De ahí la regla que ahora está escrita en el importador: el mapa
guarda la fila entera con el inglés en la posición 0, para que el índice de un idioma sea el mismo
en el diccionario que en `carta.mjs`.

Y de ahí también la comprobación que se hace ahora al migrar: no basta con que el build pase.
Se compara diccionario por diccionario, clave por clave, contra el de antes.

| | antes | ahora |
|---|---|---|
| `names` | 187 | 187, valores idénticos en es y de |
| `descriptions` | 271 | 272, valores idénticos · la de más es la cadena vacía |
| `notes` | 8 | 7 · la que falta es la de la categoría que no se pintaba |
| `tabs` | 13 | 13, valores idénticos |
| `groups` | 25 | 25, valores idénticos |
| `ui` | 92 | 92, intacta — el importador no la toca |

## La guardia del alta (25 Aug 2026)

`NUEVO-CLIENTE.md` prometía que `node gen.mjs` recién copiada la carpeta «revienta y te dice qué
queda del restaurante anterior». **No reventaba.** Se copiaba, se borraba lo que manda el
procedimiento, se compilaba, y salía la carta entera del restaurante de origen —con su nombre, su
dirección y su `og:title`— sin un solo aviso.

El paso de seguridad era el que engañaba. Ahora existe, y comprueba tres cosas antes de leer nada:

| | Qué caza |
|---|---|
| `menu.md` huérfano | `gen.mjs` no lee `carta.mjs`: lee `menu.md`. Borrar la fuente no quita el menú viejo, lo deja listo para publicarse |
| Los rótulos | `titulo`, `tituloSocial`, `tituloJuego` y `descripcion` tienen que mencionar a **este** restaurante |
| La dirección | `base` tiene que contener el nombre de esta carpeta |

### Por qué la guardia de traducciones no bastaba

Se creía que `titulo` y `descripcion` estaban protegidos porque se traducen. **Es al revés.** Esa
guardia comprueba que la cadena *tenga* traducción, no que sea de este restaurante — y una cadena
heredada del anterior viene traducida, así que pasa limpia. Sólo salta si la cambias a medias.

Medido montando un «Restaurante Cubano» desde Dedos: con la descripción sin tocar, el build
compilaba y publicaba «Dedos Las Américas — grill, burgers and sharing plates in Tenerife» dentro
de la carta del cubano.

`rotulo` se queda fuera de la regla a propósito: es sólo la especialidad —«American Grill &
Burgers»— y no lleva el nombre en ninguno de los tres clientes. Exigírselo sería un aviso falso
cada vez.

### Comprobado, en los dos sentidos

Que salta: copia de Dedos + la lista de borrado del §2 → «Hay un menu.md pero no hay carta.mjs».
Cambiando sólo el nombre → «tituloSocial no menciona a "Restaurante Cubano"». Y con la descripción
heredada → la caza también.

Que **no** salta cuando no debe: los tres clientes compilan igual que antes, y el alta correcta del
cubano llega hasta el final. Cada mensaje lleva su línea de «Cómo se arregla».

### Y la comprobación de orden, que aquí faltaba

`importar.mjs` preguntaba «¿está esta línea en `cliente.mjs`?», una por una, sin mirar dónde. Mover
una pestaña de sitio no daba error: el importador decía «cuadra», los números de plato se corrían y
la carta salía con las categorías en otro orden.

Se trae la versión que ya tenían los otros dos: recorre las líneas esperadas de arriba abajo
exigiendo que aparezcan **en ese orden**. Es la misma función haciendo más comprobación por el
mismo precio.

Aquí es donde más duele que faltara: 13 pestañas, 40 categorías y 149 platos con número impreso que
el comensal usa para pedir. Probado moviendo la última pestaña de `GROUPS` al principio en una copia
desechable — antes callaba, ahora avisa. Y comprobado que sigue siendo idempotente: `menu.md` e
`i18n.es.mjs` no cambian al volver a pasarlo.

## Nada vacío, y fuera «Ocultos» (25 Aug 2026)

Tres cosas que el motor emitía sin que hubiera nada detrás.

### La leyenda de vegano y sin gluten, sólo si hay marcas

La carta decía «Hay versión vegana · Hay versión sin gluten» y explicaba unas marcas que **no
existían en ninguna página**. Le pedía al comensal que buscara un símbolo que no está.

Ahora se calcula: `hayMarcasDieta` mira si el restaurante tiene alguna categoría Vegan o Gluten
Free con platos dentro. Sin ellas, la leyenda no se emite.

### La leyenda de alérgenos, sólo si nadie los declara

La otra mitad, por la regla contraria: con platos declarados cada uno lleva sus iconos y repetir
«pregunte por los 14» debajo es ruido; sin ninguno, esa frase es lo único que la carta dice sobre
alergias.

Las dos mitades se arman **fuera de la plantilla del HTML** y entran con un `${leyenda}`. Dentro
habría que anidar plantillas dentro de ternarios dentro de la plantilla, y ahí es donde se cuelan
los errores que no se ven hasta que Node se queja — pasó al escribirlo.

### Ningún rótulo sobre una lista vacía

`sheetGroup` emitía siempre su `<p class="sheet-label">`, tuviera entradas o no. Un restaurante sin
cartas especiales terminaba la hoja de categorías con «CARTAS ESPECIALES» y debajo nada. Ahora
devuelve cadena vacía si no hay entradas.

### Y «Ocultos», fuera entera

Estaba apagada desde siempre y **viajaba igual**: `aplicarOcultos()` son 84 líneas que empiezan por
`if (!OCULTOS_ACTIVO) return;` y no hacen nada nunca. El comentario del contador, dos bloques más
arriba, dice literalmente lo contrario:

> «Apagado significa apagado: la carta sale SIN UNA SOLA LINEA de medicion, no con el bloque
> envuelto en un if(false). Codigo muerto viajando en el HTML de cada cliente es peso que paga el
> movil del comensal para nada.»

El contador cumplía esa regla; Ocultos no. Se quita del build, del panel y de `config.php`: la
constante, la función, el manejador de guardado, la pestaña entera, el bloque `hidden` de
`estado.json` y el CSS de sus filas. `$visibles` pasa a ser `$lista`, que es lo que era con la
función apagada — dejar un alias habría sido la línea por gusto que se venía a quitar.

Si algún día hace falta, se vuelve a poner. Está en el historial.

### Lo que pesa menos

| | index.html | index.php del panel |
|---|---|---|
| Tinge | −5.055 bytes | 4.400 → 4.016 líneas |
| Dedos | −5.054 bytes | 4.400 → 4.015 |
| Regina | −6.967 bytes | 4.400 → 4.016 |

Regina pierde más porque además se va la leyenda vegana y el rótulo vacío.

### Comprobado

El panel de Regina levantado: siete pestañas, ninguna «Ocultos», los siete paneles en el HTML, los
60 platos listándose en Agotados —o sea que `$lista` sustituye bien a `$visibles`— y ni un aviso de
PHP en las nueve direcciones probadas, incluida `?t=ocultos`, que ya no existe y no rompe.

En las cartas, el diff contra la referencia recompilada desde git no trae nada más que lo dicho:
`aplicarOcultos`, la var `OCULTOS_ACTIVO`, y en Regina la leyenda y el rótulo. Tinge conserva sus
dos leyendas y sus dos rótulos; Dedos, sus dos rótulos y ninguna leyenda.

## Un solo importador para los tres (25 Aug 2026)

Había tres `importar.mjs` distintos con cinco mejoras repartidas, y ninguno las tenía todas:

| | Tinge | Dedos | Regina |
|---|:--:|:--:|:--:|
| Comprueba el orden de pestañas y categorías | ✅ | ✅ | ✅ |
| Multiidioma: un `i18n.<código>.mjs` por idioma | ✅ | ❌ | ❌ |
| Número de plato escrito en `carta.mjs` | ✅ | ❌ | ❌ |
| Notas de categoría | ✅ | ❌ | ✅ |
| Alérgenos, premio y medalla por plato | ❌ | ✅ | ❌ |

Copiar Dedos daba un cliente que no podía escribir notas de categoría; copiar Tinge, uno que no
podía declarar alérgenos. Ahora es **el mismo fichero en los tres**, con las cinco.

### El choque estaba después del precio

Tinge escribe ahí el número de plato y Dedos la lista de alérgenos. La misma posición, dos cosas.

Se resuelve **por forma y no por posición**: un array son los alérgenos, y lo que aparezca antes es
el número. Detrás de los alérgenos van el premio y la medalla.

```
[.., precio]                                 el número lo pone el contador
[.., precio, '07']                           con número escrito a mano
[.., precio, ['trigo'], '', '']              con alérgenos
[.., precio, '07', ['trigo'], '1ª', 'oro']   con las cuatro cosas
```

Ninguna de las tres cartas que existen cambia una coma, y una nueva puede llevar lo que quiera.

### Y `menu.md` sale con cuatro columnas o con siete

Según haya algo que escribir. Una carta que no declara nada sale exactamente igual que antes de que
las columnas existieran, y `gen.mjs` las lee si están y las ignora si no.

### Comprobado

`node importar.mjs` en los tres: `menu.md` **idéntico byte a byte** en los tres, y las cartas
compiladas sin una línea de diferencia. En los `i18n` sólo cambian dos comentarios de cabecera —el
del idioma, que ahora sale con mayúscula, y el de las notas de categoría en Dedos, que pasa de «hoy
no hay ninguna» a la frase genérica porque ahora sí puede haberlas.

Una lección de paso: la lista de alérgenos válidos me la inventé en vez de copiarla, y el importador
de Dedos paró en seco con «alergenos que no existen: frutos_secos». La validación que Dedos ya
tenía se cazó a sí misma.

## Un podio de tres, con nombre y bandera (26 Aug 2026)

El récord dejaba un número suelto y nada más. Ahora guarda **los tres mejores**, y quien entra
puede firmar con un nombre de hasta doce letras y un país de una lista cerrada. En la carta sale el
primero; al acabar una partida, los tres.

### Dos llamadas y no una

Al acabar, el juego manda **la puntuación sola**. Si ha entrado en el podio, la respuesta trae un
`id` y una segunda llamada le pone nombre y país. Con una sola llamada, el que cierra la pestaña
mientras piensa cómo se llama pierde la marca.

El empate **no** desbanca: quien ya está lo hizo antes.

### Dos ficheros, y el que manda no se sirve

| fichero | quién lo lee | qué lleva |
|---|---|---|
| `admin/marcador.json` | sólo el servidor | los tres, **con su `id`** |
| `record.json` (raíz) | la carta y el juego | los tres, sin `id` |

El primero es el que manda y se escribe primero; el segundo es una copia suya. El `.htaccess` de
`admin/` deniega todo `.json`, así que el privado no se sirve.

**Por qué separados:** con el `id` dentro del fichero público, cualquiera podía leerlo y renombrar la
marca de otro. El `id` es lo único que autoriza a firmar una puntuación, y no puede estar a la vista.

### El nombre lo escribe un desconocido

Cuatro filtros en `record.php`: fuera los caracteres de control y los ángulos, fuera lo que parezca
un enlace, una lista de palabrotas con los cambios de letra por número deshechos, y doce caracteres.

El orden importa: **se filtra entero y se recorta al final**. Recortando primero, `gil1poll4s`
quedaba en `gil1po` y colaba, porque la palabra desaparecía con el recorte.

La lista nunca está completa, y por eso el panel tiene **Quitar nombre** por fila: borra el nombre
y el país y deja la puntuación donde estaba. La lista quita el 90%; el botón es lo que protege.

### Las banderas: de dibujarlas a usarlas

Había tres SVG dibujados a mano aquí dentro para el selector de idioma, y la de España era
rojo-amarillo-rojo sin escudo. Ahora las 36 salen de [flag-icons](https://flagicons.lipis.dev/)
(MIT), rasterizadas a WebP de 60×45 en `assets/banderas/`: **34,7 KB las 36**, y la de España pasa de
80.958 bytes en SVG a 1.014 en WebP. `banderas.mjs` es la única lista, y de ahí salen el selector de
idioma, el del juego, el podio del panel y `admin/paises.php`, que es lo que valida el endpoint.

La caja pasa de 21×14 a **20×15**: el fichero es 4:3 y con la 3:2 de antes salía aplastado.

### La tarjeta de la carta, en rejilla

La línea del récord no cabe al lado del nombre: a 390 pedía 200px y tenía 185, y se cortaba con
puntos suspensivos en casi cualquier móvil. La tarjeta pasa a `grid` de dos columnas y el récord
ocupa una fila entera debajo.

| ancho | alto | la línea del récord |
|---|---|---|
| 320 | 121 | 236 disponibles, cabe |
| 390 | 121 | 306 disponibles, cabe |

Y **la bandera va delante del nombre**. Detrás, en el caso extremo (nombre de doce y cuatro
cifras, que se pasa por 11px a 320) los puntos suspensivos se comen la bandera y queda media
imagen cortada. Delante, lo que se recorta es el nombre, que es lo correcto.

### Lo que se arregló de paso

Los `aria-label` del juego **nunca** cambiaban de idioma: `setLang()` traducía `textContent` y no
los atributos. Ahora también, y el `placeholder` del nombre se reescribe al cambiar de idioma
(un `placeholder` no admite ni `span` ni atributo traducible).

### Comprobado en los tres, corriendo

Endpoint: `GET` — 405, `puntos=9999` — 400, `-5` — 400, un robot — 204. Cuatro marcas seguidas se
ordenan solas y la quinta, peor que la tercera, se rechaza sin `id`. Filtro: `M4r14 gil1poll4s`
· `<script>alert(1)</script>` — vacío o sin ángulos; `Jean-Luc` intacto; `XX` como país — vacío.
Panel: las tres filas con su bandera, **Quitar nombre** deja la puntuación y borra el nombre en los
dos ficheros, **Vaciar** borra los dos. Las siete pestañas sin un aviso de PHP.

La tarjeta de la carta mide 278 de ancho a 320px de pantalla, izquierda en 21: **el mismo ancho y
la misma izquierda que `.hero-frame`**, que es lo que se pedía.

Las cadenas nuevas del formulario están en los 2 catálogos de este restaurante.

## El logo del juego, y fuera su selector de idioma (26 Aug 2026)

### El chile, encima del disco

La portada del juego llevaba el icono de línea de Tabler dentro de un disco de 104 en el color de
la casa. Ahora lleva el logo de Chilli Rush, y **se sale del disco por arriba y por abajo**: así
el chile se planta encima del círculo en vez de quedar encerrado dentro.

| | |
|---|---|
| el disco | 104×104, sin recortar |
| el logo | 89×126 en pantalla, se sale 11 por lado |
| el fichero | `assets/chilirush.webp`, 267×378, **20.884 bytes** |

El original es un PNG de 1659×2352 y 317 KB. Se rasteriza a 3× del tamaño en pantalla, que es lo
que pide un móvil denso, y se guarda en WebP con alfa: 20,9 KB, un 6,6% del original.

La caja que ocupa en la columna sigue siendo la del círculo, 104, así que el logo no empuja nada.
Lo que sí hacía era comerse 11 de los 21 de aire hasta el título, y el título se aparta esos 11 para
que el hueco que se ve siga siendo el declarado.

### El juego se queda sin selector de idioma

Sobraba. El juego **ya hereda** el idioma de la carta por tres vías, en este orden:

1. el `?lang=` del enlace de la carta, que `setLang()` reescribe en cada cambio;
2. `localStorage`, con **la misma clave** que la carta (`<slug>-lang`);
3. `navigator.languages` entera, y si ninguno de los suyos está, inglés.

El primero cubre el modo privado, donde `localStorage` no sobrevive. Un segundo selector dentro
del juego sólo podía desincronizarse del de la carta, y el camino de vuelta · **Volver a la carta**
· está a un toque.

Se van con él: la plantilla del desplegable, 72 líneas de CSS, 63 de JavaScript, la tabla `IDIOMAS`
—que `gen.mjs` ya no le pasa— y el trozo de `pantalla()` que lo escondía durante la partida.
**`juego.html` baja de 57,8 KB a 50,6.** Las banderas siguen: las usan el podio y el selector de
país, que no son lo mismo.

### Comprobado corriendo, no leyendo

Con `localStorage` vacío y el navegador en `["es","es-ES"]`, la carta abre en español y el enlace del
juego dice `juego.html?lang=es`. Eligiendo inglés a mano: `?lang=en`, y el juego abre en inglés
(`Play`, `Tap the chillies...`). Abriendo `juego.html` **sin** `?lang`, coge el `en` de
`localStorage`. Partida entera hasta el final sin un error de consola, con el podio y su bandera
en la pantalla de resultado.

## La cabecera dice de qué día es su fecha (26 Aug 2026)

A la 01:34 del miércoles 26 el panel ponía **Martes, 25/08/26** y parecía ir atrasado. No lo iba:
la fecha de la cabecera es la **de servicio**, que retrocede un día antes de las 6:00 para que un
plato marcado a las 22:00 siga marcado a las 02:00. El reloj estaba bien —`Atlantic/Canary`,
offset +01:00 en agosto—; lo que faltaba era decirlo.

Entre las 00:00 y las 6:00, y sólo entonces, debajo de la fecha sale:

> Son las **01:36** del **miércoles 26/08** en Canarias, y aquí arriba sigue el servicio del martes
> hasta las 6:00: lo que marcaste anoche sigue marcado.

La pestaña Analítica ya tenía un aviso parecido, porque ahí el día va de 00:00 a 00:00 y no por
servicio. Pero había que entrar a verlo, y la cabecera es lo primero que se lee.

Comprobado con el corte movido a las 0:00: el aviso desaparece. Con el corte en 6, sale.

## Dos relojes con nombre: el panel y los agotados (26 Aug 2026)

La cabecera del panel fechaba con la **fecha de servicio**, la que retrocede un día antes de las
6:00. De madrugada eso ponía «Martes, 25/08» a la 01:34 del miércoles y parecía que el panel iba
atrasado. El reloj estaba bien; el error era de quien fechaba qué.

Ahora son dos cosas separadas y con nombre:

| | qué fecha | cómo se calcula |
|---|---|---|
| `$hoyReal` | la **cabecera** y el contador de Analítica | el reloj de Canarias, de 00:00 a 00:00 |
| `$hoy` | los **agotados** | igual, pero retrocede un día antes de `CORTE_HORA` |

Coinciden 18 horas de cada 24. En las otras seis, debajo de la fecha sale una línea:

> Son las **01:42** en Canarias. Los agotados que veas son los del servicio del **martes 25/08**
> y se limpian solos a las 6:00.

Y la pista de la pestaña Agotados añade en esas horas de qué servicio es lo que hay marcado. El
aviso que tenía Analítica —14 líneas para explicar que arriba y allí decían días distintos— se cae:
ya dicen el mismo. `$hoyC` era otro nombre para `$hoyReal` y se queda uno.

### El 6 está escrito dos veces

En `CORTE_HORA` de `config.php`, que es lo que ve el restaurante, y en `serviceDate()` dentro de
la carta, que es lo que ve el comensal. **No se puede leer uno del otro**: `config.php` se edita a
mano y la carta la genera el build. Si se cambia uno hay que cambiar el otro, o la carta tacharía
un plato que el panel ya da por bueno. Queda avisado en los dos sitios.

### Comprobado

Marcando un plato a la 01:42 del miércoles 26, `estado.json` guarda `"2026-08-25"` —la fecha de
servicio, no la del reloj— y la carta lo pinta tachado. Moviendo el corte a las 0:00 la casilla
sale sin marcar sin tocar el estado, que es lo que pasará sola a las 6:00. Las ocho pestañas sin
un aviso de PHP.

## La chapa de versión, y las copias sólo por precios (26 Aug 2026)

### Saber qué versión corre

Al pie del panel, en pequeño: **Versión 26/08/2026 · 02:19**, y debajo los dos identificadores
de compilación que deberían ser el mismo:

| | de dónde sale |
|---|---|
| `panel` | `BUILD_ID`, que el build escribe dentro de `admin/cliente.php` |
| `carta` | el `build` de `version.json`, en la carpeta de al lado |

Si no coinciden sale en rojo **«la carta de al lado es de otra compilación: la subida se quedó
a medias»**. Es el caso real de una subida por FTP que se corta: el panel nuevo y la carta vieja,
o al revés.

El tercer número, el que lleva dentro el `index.html` que un móvil tenga cacheado, no se puede
ver desde aquí. Pero teniendo éste a mano ya se sabe contra qué comparar.

`BUILD_FECHA` se calcula en `gen.mjs` con `Intl.DateTimeFormat` en `Atlantic/Canary`, no en PHP:
la hora que interesa es la de cuando se compiló. Y el panel define las dos constantes vacías si
no están, para que un `cliente.php` de una versión anterior no tire el panel — dice
«Versión desconocida» y sigue.

### Las copias, sólo cuando cambian los precios

`copia_de_seguridad()` se llamaba en **cada** guardado. Marcar un plato agotado dejaba una copia,
y otra al desmarcarlo, y la carpeta se llenaba de fotos idénticas que sólo estorbaban para
encontrar la que importa.

Ahora recibe el estado nuevo y compara `prices` con el de disco: si son iguales, se va sin tocar
nada. Un cambio de precios es lo único que no se deshace a mano —una subida del 10% toca
cientos de platos—; un agotado o un destacado se deshacen desmarcando la casilla.

La comparación es `==` y no `===`: en PHP `==` entre arrays mira los pares clave-valor sin
importar el orden. Con `===` bastaría con que el formulario devolviera las claves en otro orden
para que pareciera un cambio de precios.

### Comprobado corriendo

Chapa: con todo cuadrado, «panel 1787707162422 · carta 1787707162422» y sin aviso. Falseando el
`version.json` a otro número, sale el aviso rojo; devolviéndolo, desaparece.

Copias: con la carpeta vacía, guardar un agotado deja **0 copias**. Publicar una subida del 10%
crea `anterior.json` y `2026-08-25.json`. Y guardar otro agotado después **no** vuelve a
copiar: los dos ficheros conservan su hora.

## Las copias: las tres últimas, una por cambio (26 Aug 2026)

Con la regla de «sólo cuando cambian los precios» recién puesta, el resto del diseño dejaba de
encajar. Se rehace entero:

| antes | ahora |
|---|---|
| una por **fecha de servicio**, la primera del día | una por **cada cambio de precios** |
| `anterior.json` aparte, sin caducar | no existe: la más nueva de la lista ya es esa |
| `COPIAS_DIAS`, 30 | `COPIAS_MAX`, **3** |
| `2026-08-25.json` | `2026-08-26-0307.json`, con hora |

**Por qué la hora en el nombre.** Con una copia por día, el segundo cambio de precios de la
misma jornada no dejaba rastro: la copia ya estaba escrita y no se tocaba. Y `anterior.json` era,
por definición, la más reciente de la lista — dos nombres para el mismo fichero.

La fecha se lee del **nombre** y nunca de `filemtime`: una copia se puede bajar y volver a subir,
y ahí su fecha de sistema deja de decir cuándo se hizo el cambio, que es lo único que interesa
saber de ella.

Dos cambios en el mismo minuto se pisan. Está bien: es el mismo arrepentimiento.

### Un botón para vaciarlas

Hizo falta el día del cambio: lo que había guardado eran fotos de cualquier guardado —un
agotado, un destacado— y no sirven para lo único que ahora se quiere revertir. Va en su propio
formulario, como «Vaciar el marcador», porque borra algo que no se recupera.

`copias_listar()` sigue reconociendo los dos nombres viejos (`anterior.json` y el de sólo fecha)
para poder listarlos y borrarlos desde el panel. En el orden van al final, así que la purga los
barre primero.

### Comprobado corriendo

Con 7 copias sembradas —5 del formato nuevo, 2 del viejo— un cambio de precios deja exactamente
**3**: las dos más nuevas de las sembradas y la recién hecha. Las dos del formato viejo caen.
«Borrar todas las copias» deja la carpeta vacía **y conserva su `.htaccess`**, que no es una
copia y no se lista.

## El récord colgado, los puntos a la vista, y la descripción entera (26 Aug 2026)

### El récord sube al marco

Estaba debajo de las reglas en **crema al 80% sobre el fondo**, que es casi el mismo color: no se
leía. Ahora cuelga del borde de arriba en un cartel de dos cables, con la tinta de fondo y el
número a 25px. Elegido entre tres prototipos —Cinta, Colgado, Ficha— sobre la portada de hoy.

Va **absoluto dentro de `.wrap`**, no dentro de la portada, y por eso hizo falta bajarlo a mano en
dos sitios:

- `pantalla()` lo esconde fuera de `s-intro`. Sin eso se quedaba colgado sobre el tablero, justo
  en la esquina por donde salen los chiles.
- `pintarRecord()` mira si la portada está visible antes de enseñarlo. Sin eso, la llamada que
  hace `mandarMarca()` al acabar una partida lo colgaba **encima del podio** de la pantalla final.

Sin marca no se pinta nada y la portada queda exactamente como antes de que esto existiera. Y
lleva `env(safe-area-inset-top)`: en un iPhone los cables salían de debajo del reloj.

### «Toca los chiles. Esquiva el hielo y la bomba.» se cae

En su sitio van las **cuatro fichas con lo que vale cada una**:

| ficha | | 
|---|---|
| chile | **+1** |
| chile dorado | **+3** |
| hielo | **−2** |
| bomba | **0** — te deja a cero |

La frase decía qué hacer pero no cuánto valía cada cosa. El dibujo y el color son **los mismos
que en el tablero**, así que la portada enseña exactamente lo que se va a tocar. Y como lo único
escrito son cifras, **no hay nada que traducir**: los cuatro rótulos hablados viajan en el
`aria-label` de cada ficha, que es lo que oye un lector de pantalla.

Entran escalonadas 40ms detrás del cartel, para que se lean como una fila que se monta.

### La descripción usa la columna entera

`.menu-content p` tenía `max-width:46ch` por legibilidad. A 900px de pantalla la columna mide 641
y el párrafo se quedaba en 341: **300px sin usar**, y descripciones que caben de sobra en una
línea partidas dejando una palabra sola debajo — «Café de filtro preparado en Chemex para 3» y,
en la siguiente, «personas.».

En una carta la descripción es una línea de apoyo, no un párrafo de lectura larga, así que la
medida corta no compensaba la palabra huérfana. Fuera el tope, y además `text-wrap:pretty` para
que el navegador evite la última línea de una sola palabra cuando pueda, y `hyphens:none`: un
nombre de plato cortado por la mitad se lee peor que una línea con hueco.

| a 900px | antes | ahora |
|---|---|---|
| ancho del párrafo | 341 de 641 | **641 de 641** |
| de más de una línea | 12 de 60 | **2 de 60** |

Las cinco de la captura —las tres de Chemex y las dos de French Press— pasan a **una línea**.
En móvil la columna mide 256 y siguen partiendo, que es lo correcto: ahí no sobra ancho.

## El récord sale al cargar, no al acabar la partida (26 Aug 2026)

El cartel del récord aparecía en la portada sólo después de jugar. No era la portada: era el
fichero. El juego pide `record.json` al arrancar, y en el servidor ese fichero **no existía**
(404 en `socialcard.es/tinge_of_turmeric/menu2/record.json`). Al acabar una partida el podio
llega dentro de la respuesta del POST a `admin/record.php`, y sólo entonces había algo que
colgar del marco.

`record.json` es una copia pública del marcador que vive en `admin/marcador.json`. Se escribe
sola al entrar alguien en el podio, así que puede faltar por dos motivos: nadie ha marcado
todavía, o la raíz del servidor no deja escribir en ella. El segundo caso no avisaba de nada:

```php
function marcador_escribir(array $top): bool {
  if (!escribir_json(MARCADOR_PATH, ...)) return false;
  escribir_json(RECORD_PATH, ...);   // el resultado se tiraba
  return true;
}
```

El panel enseñaba el podio, el juego no, y así para siempre.

### El juego deja de depender de que ese fichero exista

`record.php` acepta ahora **GET** además de POST, y contesta lo mismo que un POST: el podio sin
identificadores, `no-store`, sin escribir nada. Los dos filtros de siempre siguen delante — el de
robots y el del juego apagado, que devuelve 204.

En el arranque el juego pregunta en dos sitios y en este orden:

1. `record.json`, que es un fichero plano y no cuesta PHP;
2. si eso no trae marca, `admin/record.php`, que lee el marcador de dentro de `admin/`.

Con récord publicado se hace **una sola petición**: la segunda sólo sale cuando la primera vuelve
vacía. Y `leerTop()` es el mismo para las tres entradas (fichero, endpoint y respuesta del POST),
así que no hay dos formas de leer un podio.

### Y un respaldo que estaba muerto

`marcador_leer()` decía mirar `record.json` cuando no hay `marcador.json` —el caso de un
restaurante que ya tenía marca antes de la versión del podio— pero volvía antes de llegar:

```php
$j = $raw === false ? null : json_decode($raw, true);
if (!is_array($j)) return [];     // ← esto dejaba muerto el respaldo de abajo
if (!is_array($j)) { ...RECORD_PATH... }
```

Fuera la primera línea. Sin ella, la marca antigua se recupera.

### Comprobado corriendo

Con PHP 8.4 sirviendo una copia de `2-subir`, `marcador.json` sembrado con tres marcas y **sin**
`record.json` en la raíz:

| | resultado |
|---|---|
| GET a `admin/record.php` | `{"top":[{"puntos":47,"nombre":"Jorge",...}]}` |
| portada del juego, sin jugar | cartel visible, «Récord 47 Jorge» con bandera, 496×70 en y0 |
| peticiones | `record.json` y después `admin/record.php` |
| con `record.json` ya publicado | **sólo** `record.json`; el endpoint no se llama |
| juego apagado | endpoint 204, cartel oculto, cero errores en consola |
| sin `marcador.json` y con `record.json` | `{"top":[{"puntos":29,"nombre":"Lola",...}]}` (antes: vacío) |
| PUT a `admin/record.php` | 405 |

## Auditoría del juego: siete cosas (26 Aug 2026)

Repaso entero de `juego.mjs` y `admin/record.php` buscando fallos, incoherencias y restos. Lo que
salió, y lo que se ha hecho con cada cosa.

### 1. La bomba no cortaba la racha si ya estabas a cero

`racha = delta < 0 ? 0 : racha + 1`. La bomba no resta: **vacía**, así que su delta es `-puntos`.
Con la puntuación ya a cero eso es `-0`, que **no** es menor que cero: la racha subía. Tocando
bombas seguidas la racha crecía sola. Ahora la bomba corta siempre, mire el delta lo que mire.

### 2. Las fichas del tablero hablaban en inglés técnico

`aria-label` era `'chilli'`, `'gold'`, `'ice'` o `'bomb'`: sin traducir, y sin decir lo que vale
cada una. Ahora usan **las mismas cuatro frases** que la portada pone bajo el título, que ya
estaban traducidas: quien no ve los iconos oye en el tablero lo mismo que leyó antes de jugar.
Comprobado en alemán: «Bombe, alles auf null».

### 3. Con dos marcas iguales, el podio señalaba la fila equivocada

El puesto propio se buscaba **por puntuación**: la primera fila con esos puntos y sin nombre. Y el
empate no desbanca, así que dos marcas iguales en el podio pasan a menudo. Ahora el puesto lo dice
el servidor —`responder()` añade `pos` junto al `id`—, que es el único que sabe cuál de las filas
es la de esta partida.

Comprobado: con dos 55 ya en el podio, una tercera marca de 55 devuelve `"pos":2`.

### 4. El servidor contestaba como si hubiera guardado aunque no guardase

```php
if ($dentro) marcador_escribir($top);
responder($top, $dentro ? $nuevo['id'] : '');   // se respondía pasara lo que pasara
```

El juego colgaba un récord que al recargar la página no existía, y era imposible distinguir «no se
puede escribir» de «no ha jugado nadie». Ahora, si la escritura falla, se contesta **el podio que
hay en disco**, sin la marca nueva y sin `id`.

Comprobado poniendo un directorio donde va `marcador.json`: la respuesta es `{"top":[]}`, el juego
no enseña récord y no aparece el formulario del nombre. Quitando el directorio, la misma llamada
guarda y persiste.

### 5. La cuenta atrás seguía corriendo con la pestaña escondida

`visibilitychange` terminaba la partida en curso, pero no el 3-2-1: la partida arrancaba con la
pestaña en segundo plano y se volvía a un tablero a medias o a un resultado que nadie había
jugado. Ahora la cuenta se cancela y se vuelve a la portada.

### 6. Un nombre recortado perdía el subrayado de tu fila

Al guardar el nombre, el podio se repintaba buscando la fila **cuyo nombre coincidiera con el que
se escribió**. Pero el servidor lo limpia: recorta a doce, vacía los que llevan enlace o palabrota.
Escribiendo «Jorgeeeeeeeeeeee» el servidor devuelve «Jorgeeeeeeee» y no casaba nada, así que la
fila propia se quedaba sin marcar. Ahora, si no casa, se usa el puesto que ya dio el servidor.

Comprobado: nombre de 16, el podio enseña «Jorgeeeeeeee» con la fila propia marcada y su bandera.

### 7. Restos

- `fill()` y `esc()`: definidas y sin usar. Fuera. Con ellas, el parámetro `imgBandera`, que
  tampoco usaba nadie.
- Cinco cadenas en el diccionario que no pintaba nadie —`Chilli Rush`, `points`, `Top scores`,
  `No one has played yet`— y una que sí hacía falta: **`Score`**. Los otros dos números del
  marcador llevan su rótulo escrito encima; el grande va solo, y sin `aria-label` un lector de
  pantalla leía un número suelto. Ahora dice «Puntos».
- Tres comentarios apilados de dos en dos, de ediciones anteriores. Unificados.

### Lo que se deja como está

Si `estado.json` no carga, `CFG.on` se queda en `false` y **no se manda ninguna marca**. Es el
interruptor del juego y tiene que fallar hacia apagado: un restaurante que apagó el juego no puede
seguir acumulando récords porque un fichero no conteste.

## El fondo del juego, en movimiento (26 Aug 2026)

`assets/chilli-rush-fondo-alpha.webm`: 1080×1920, VP9 con canal alfa, 8 segundos en bucle, 20
fotogramas por segundo, **253 KB**. Chiles, copos y bombas subiendo despacio, en blanco y
recortados sobre transparencia.

Va **debajo de todo y encima del color**, que sigue siendo el fondo de verdad: `position:fixed`,
`object-fit:cover`, `opacity:.6`, sin sonido, en bucle, `playsinline` y `pointer-events:none`. Si
el vídeo no carga, la pantalla queda exactamente como estaba.

### No sale durante la partida

Las siluetas del vídeo son **los mismos dibujos que las fichas** que hay que tocar. Detrás del
tablero se leen como fichas que no responden, así que en `s-play` el vídeo se esconde y se pausa
—medio minuto descodificándose para nadie— y vuelve al acabar. Se ve en la portada, en el 3-2-1
y en el resultado.

### El canal alfa se comprueba, no se supone

Hay navegadores que reproducen WebM y **se saltan su canal alfa**; Safari es el caso. Ahí esto no
sería un fondo: sería un rectángulo negro tapando el juego, porque el color del vídeo es negro y
lo que dibuja la silueta es el alfa.

No hay forma de preguntarlo, así que se mira. Un fotograma a un canvas de 32×57 y a contar
transparencias: el vídeo es casi todo hueco, de modo que con alfa de verdad hay píxeles a cero.
Si **todos** salen opacos, el navegador no lo respeta y el vídeo se quita. Si algo falla por el
camino, se quita también — mejor el fondo de color que un negro encima del juego.

Comprobado en Chrome: la transparencia mínima del fotograma es **0**, el vídeo se queda y las
siluetas se ven sobre el verde de la marca.

### Lo que se probó y no valía

`mix-blend-mode:screen` como red de seguridad, que borra el negro él solo y evitaría la
comprobación. No sirve aquí: el fondo del juego es un **tono medio claro** (`--base` va de
`#8c8173` a `#a9a7a0` según el tema) y screen sobre claro no pinta nada. Las siluetas
desaparecían del todo — con la opacidad al 100% la pantalla era idéntica a no tener vídeo.

### Con «menos movimiento» no se descarga

`prefers-reduced-motion: reduce` lo oculta por CSS, y además el arranque **borra el elemento**:
son 253 KB que no se van a ver.

## «Cinta»: la cuenta atrás y el resultado (26 Aug 2026)

Las dos pantallas que no son la portada ni el tablero estaban vacías: un rótulo de doce píxeles y
un número. Elegida entre tres direcciones prototipadas —**Marcador** (la cifra dentro de una placa
de tinta), **Cinta** (banda roja y tipografía) y **Termómetro** (la cifra comparada con el récord
en una barra)— gana **Cinta**.

El rótulo va en una **banda roja inclinada 3°**, que es el mismo gesto que «Rush» en la portada, y
debajo la cifra, enorme y en tinta. Así las tres pantallas se leen como el mismo cartel.

| | antes | ahora |
|---|---|---|
| cuenta atrás | `clamp(64px,26vw,120px)` | `clamp(96px,44vw,172px)`, y tres rayas que se apagan una por segundo |
| resultado | `clamp(30px,9vw,44px)` | `clamp(72px,32vw,132px)` |
| «Mejor de hoy» | 15px al 85% | 16px, sin apagar |

La banda se limita a `#s-count` y `#s-end`. El eyebrow de la portada lleva **el premio**, y eso no
es un rótulo sino una promesa: en rojo y torcido parecería otra oferta de la carta.

### «¡Nuevo récord!» ya no puede ir en rojo

`.eyebrow-record` pintaba el rótulo de rojo. Sobre una banda roja eso es texto invisible. Ahora el
rótulo se queda en crema y **lo que cambia es la cifra**, que se pinta de rojo: se ve desde mucho
más lejos que un rótulo de doce píxeles.

### Dos restos que salieron por el camino

- El bloque `.record` —la línea del récord en la portada, antes de que subiera al marco— llevaba
  sin dueño desde entonces: no hay ningún `class="record"` en el HTML. Además colisionaba con el
  `.tally.record` nuevo, y le habría metido su `opacity:.8`.
- «Saltar» iba en `var(--surface)` al 60% sobre el fondo del juego, que es un tono medio: no se
  leía. Pasa a tinta al 65%.

## «Ver menú» en la barra del panel (26 Aug 2026)

Al lado de Guardar, en las cuatro pestañas que guardan algo —agotados y precios, oferta, juego y
marca—. No en la barra de **publicar precios**: ésa es una confirmación de dos pasos y ahí un
enlace a otro sitio es una trampa.

Tres decisiones pequeñas:

- **Abre en otra pestaña.** En la misma se perdería lo que estuviera sin guardar, y la barra ya
  avisa «sin guardar» precisamente porque eso pasa.
- **Lleva la hora en la dirección** (`../index.html?v=<time()>`). Sin eso el navegador puede
  enseñar la carta de antes del guardado, que es justo lo que se va a comprobar.
- **Ruta relativa**, no `CLIENTE.base`: así funciona igual en el hosting y en el servidor local, y
  no hay una dirección del restaurante escrita dos veces.

Estilo `.ver`: el mismo fantasma que los demás secundarios del panel —borde, sin relleno— para que
no compita con Guardar. Comprobado a 375 px: la barra no desborda; el contador se parte en dos
líneas y los dos botones caben enteros.

## Foto por plato · Fase 1: subirla desde el panel (26 Aug 2026)

Primera de las cinco fases de «foto por plato, ficha emergente y contador de consultas». Ésta
sólo hace una cosa: que el restaurante pueda poner una foto a un plato desde el panel. La carta
todavía no las enseña.

### Dónde vive una foto, y por qué ahí

La carta de este proyecto **no la edita el panel**: los platos están en `carta.mjs` y se compilan.
Una foto guardada en la carta se perdería en la siguiente compilación, y además el panel no sabe
escribir la carta. Así que va en `estado.json`, que es lo que el panel sí escribe:

```json
"fotos": { "Appetizers :: Papadum": "appetizers-papadum-d17995e5.webp" }
```

Se identifica al plato **por su clave** —`Categoría :: Nombre en inglés`—, la misma que ya usan
precios, agotados y destacados. El precio de esto, asumido y decidido: renombrar un plato en la
carta le quita la foto, igual que hoy le quita el precio. La alternativa era darle un id fijo a
los 312 platos y migrar también precios y agotados; no compensa por una foto.

Los archivos van a **`assets/platos/`**, que es del servidor y no del build: `gen.mjs` sólo copia
el primer nivel de `assets/`, así que subir la carta por FTP no las pisa. Es la misma regla que
ya protege a `assets/hero/`, y está anotada en el LEEME.

### El navegador hace el trabajo pesado

El dueño sube **la foto tal y como sale del móvil** y el navegador la deja en 1000×1000 WebP por
debajo de 500 KB antes de enviarla. Al servidor le llegan 30 KB ya hechos.

- `createImageBitmap()` para cargarla, que respeta la orientación EXIF: sin eso, las fotos
  verticales de móvil salen tumbadas.
- Recorte cuadrado: arrastrar para encuadrar, rueda o pellizco para acercar, y una barra de zoom
  para quien no tenga ni rueda ni dedos. El cuadrado **siempre queda cubierto** —el zoom no baja
  del mínimo que lo llena— así que no hay bordes blancos posibles.
- El zoom deja quieto el centro del cuadrado. Sin eso, acercar echa la foto a una esquina y hay
  que recolocarla a mano cada vez.
- La compresión baja la calidad de 0,82 a 0,52 hasta entrar en 500 KB. Si el navegador no sabe
  escribir WebP, se dice y se para: subir cuatro megas para que el servidor los rechace no ayuda.
- Por encima de 25 MB de original se avisa antes de intentar decodificar: los móviles viejos se
  quedan sin memoria.

### Lo que comprueba el servidor

No se cree nada de lo que llega: peso, tipo **real** con `finfo` —no la extensión ni lo que diga
el navegador— y que mida exactamente 1000×1000. Un `.php` renombrado a `.webp` se cae en la
segunda comprobación. Además el plato tiene que existir en la carta de ahora, o el estado se
llenaría de claves que no pinta nadie.

La carpeta lleva el mismo guardián `.htaccess` que `assets/hero/`, con todo dentro de `<IfModule>`
porque `php_flag` suelto tumba la carpeta entera en un servidor con PHP-FPM.

Y el orden importa: **primero se guarda el estado y después se borra la foto anterior**. Al revés,
un guardado que falla deja al plato apuntando a un archivo que ya no existe.

### En el panel

Cada fila de la lista de platos gana un botón de cámara de 44×44 al final, apagado si no hay foto
y en el acento de la marca si la hay. Sin foto abre el selector de archivos directamente; con
foto abre una tarjeta con la que hay, **Cambiar** y **Quitar foto**.

Sube sola, sin pasar por el Guardar de la pestaña: son cosas distintas, y mezclarlas obligaría a
guardar los agotados para cambiar una foto. Con 312 filas, recargar la página tras cada foto sería
perder el sitio y lo escrito en el buscador.

### Una trampa que costó un rato

`$fotos` **ya existía** en el panel: son las fotos de la portada, diecinueve líneas más abajo. La
lista de platos se pintaba entera sin fotos y sin dar un solo error. Ahora es `$fotosPlato`.

### Comprobado corriendo

| | resultado |
|---|---|
| foto vertical de 3024×4032 | llega 1000×1000, 36 KB, sin girar |
| cambiar la foto de un plato | la anterior desaparece de `assets/platos/` |
| `.php` renombrado a `.webp` | «Formato no permitido: la foto tiene que llegar en WebP» |
| plato que no está en la carta | «Ese plato ya no está en la carta» |
| quitar la foto | archivo borrado, entrada fuera del estado, botón apagado |
| vista previa en el panel | 1000 px, servida desde `../assets/platos/` |

Lo único que **no** se puede comprobar en local: que el `.htaccess` de `assets/platos/` impida
ejecutar un `.php` colado ahí. El servidor de PHP de desarrollo no lee `.htaccess`. Hay que
probarlo en el hosting, subiendo un archivo de prueba a esa carpeta y pidiéndolo por URL.

## Ficha de plato, icono y contador de consultas · Fases 2 a 5 (26 Aug 2026)

### La ficha (fase 2)

Se abre **en todos los platos, tengan foto o no**. No es un visor de fotos: es la ficha del plato,
y de eso dependen tres cosas — que el contador mida *interés* y no *tiene foto*, que quepa un día
el filtro de alérgenos, y que la descripción larga tenga sitio sin ensuciar la lista.

En móvil es una hoja que sube desde abajo, con su asa y su arrastre; de 768 para arriba, una
tarjeta centrada de 520 con el fondo oscurecido. Lleva `history.pushState` al abrirse, así que el
**botón atrás del móvil la cierra** en vez de sacar al comensal de la carta, y bloquea el scroll
del fondo con el mismo `position:fixed` con top negativo que ya usaba la hoja de categorías —
`overflow:hidden` no congela iOS.

**Todo sale de la fila**: nombre, descripción, precio del día y marca de agotado se copian del
DOM que ya está pintado y traducido. No hay una segunda copia de la carta que pueda quedarse
vieja, y el precio con oferta —el de hoy y el de antes tachado— se copia con su marcado en vez de
volver a calcularse, que sería un segundo sitio donde equivocarse con un céntimo.

Cambiar de idioma con la ficha abierta la repinta sola: escucha el evento `totm:lang` que ya
emitía la carta.

**La foto se pide al abrir la ficha, nunca con la carta.** Con cuarenta fotos, precargarlas serían
cuatro o cinco megas en el wifi de un restaurante lleno. El hueco va con `aspect-ratio:1/1` desde
el principio para que no salte el maquetado cuando llega la imagen. Sin foto, la ficha empieza por
el nombre: **nada de placeholder gris**, porque no falta nada.

### El icono (fase 3)

Una cámara de 14 px al final del nombre, sólo si el plato tiene foto, en `currentColor` al 50%.
La pone y la quita `render()`, que ya se ejecuta cada vez que llega el estado: una foto subida a
mediodía aparece en la carta sin recargar.

**Toda la fila abre la ficha**, no sólo el icono: en un móvil, apuntar a catorce píxeles es pedir
puntería. La fila tiene ya 60 px de alto, y gana cursor, un velo al 5% al tocarla y `role="button"`
con `tabindex` — **puestos por JS y no en el HTML**: escritos en el HTML, un lector de pantalla
anunciaría «botón» en 312 filas que sin JS no hacen nada.

El CSS del icono está escrito para poder cambiarlo por una miniatura de 44 px: se toca una regla.

### El contador (fase 4)

Se apunta **al abrir la ficha**. Ni al pasar el ratón, ni al hacer scroll: eso mediría la carta y
no el interés. Una vez por plato y visita, con una marca en `sessionStorage` que muere al cerrar la
pestaña — no es una cookie ni un identificador, y si `sessionStorage` falla se cuenta igual: mejor
un duplicado que perder el dato.

Viaja con `sendBeacon` a `admin/vista.php`, que apunta **una línea** en `datos/v-YYYY-MM.log`:

```
54b7fdde;2026-08-26
```

Ocho caracteres son `substr(sha1(clave), 0, 8)`, y la clave es la misma que ya identifica al plato
en precios y agotados. Así el panel rehace la equivalencia desde la carta de ahora y **no hay
ninguna tabla que mantener**; un plato que se va de la carta desaparece de la tabla y deja de
contar. Va el hash y no la clave porque la clave lleva espacios y dos puntos.

**Una línea al final y no un JSON**, por lo mismo que `datos.php` cuenta con el tamaño del
fichero: treinta comensales a la vez sobre un JSON con `flock` se serializan y algún incremento se
pierde. El día es el natural de Canarias, **el mismo que cuenta las aperturas** — si las dos cifras
salen en la misma pantalla, tienen que estar contadas con el mismo reloj o el porcentaje miente.

La suma se hace al abrir la pestaña Analítica, no en cada consulta: el trabajo lo paga quien mira
los números una vez al día, no el comensal sentado en la mesa. El registro **se renombra antes de
leerlo** —renombrar es atómico— así que las consultas que llegan mientras se suma empiezan un
registro limpio. Si el proceso se cae a mitad queda un `.procesando`, y lo primero que hace la
vuelta siguiente es terminarlo: nunca se descarta.

### La tabla (fase 5)

Debajo de las tarjetas de aperturas, con los mismos tres periodos y contados igual: hoy, esta
semana y el mes. Por fila: puesto, nombre, consultas y **porcentaje sobre las aperturas del mismo
periodo**, con una barra detrás del nombre proporcional al primero.

El porcentaje es la métrica que vale. «El 17% de quienes abren la carta miran el Pollo Korma» dice
algo; «20» no dice nada. Y al pie, la advertencia honesta: **los platos con foto reciben más
consultas**, así que el ranking no compara platos, compara platos-con-foto contra platos-sin-foto.

Los tres periodos se pintan de una vez y el botón sólo enseña uno: son tres listas de diez filas,
y no vale la pena una petición al servidor para cambiar de una a otra.

### Dos trampas que costaron un rato

- **El nombre del plato dentro del `h3`.** La ficha cogía el primer `.i18n` que encontraba, y el
  primero es la etiqueta «Agotado hoy», que también es traducible. La ficha se abría titulada
  «Agotado hoy». Ahora el nombre lleva su propia clase, `.dish-name`.
- **`.vp-fila > *{position:relative}`.** Esa regla alcanzaba también a la barra del fondo, que es
  `position:absolute`: al devolverla al flujo se comía la fila entera y el nombre se quedaba en
  cero de ancho. La fila se leía «1 · 20 · 17%», sin plato.
- Y una más pequeña: el velo del fondo estaba escrito para `.sheet`, así que la ficha se abría con
  la carta sin oscurecer.

### Comprobado corriendo

| | resultado |
|---|---|
| carta cargada, peso | **cero peticiones** a `assets/platos/`; el HTML pasa de 707 a 734 KB (105 KB con gzip) |
| ficha con foto | foto 1:1 a sangre, nombre, precio, descripción; imagen de 1000 px |
| ficha sin foto | empieza por el nombre, sin hueco gris; panel de 169 px |
| botón atrás | cierra la ficha, suelta el scroll y deja la carta donde estaba |
| mismo plato dos veces | una sola línea en el registro |
| cambio de idioma con la ficha abierta | nombre y descripción traducidos al vuelo; el icono también |
| teclado | la fila coge el foco y Enter abre la ficha |
| escritorio | tarjeta de 520 centrada, con el fondo al 55% |
| consolidación | 116 consultas del registro pasan a `vp-2026-08.json` y el registro desaparece |
| consolidación cortada a mitad | el `.procesando` huérfano se termina en la vuelta siguiente: 4 y 3, sin perder ninguna |
| tabla | diez filas con barra, consultas y % sobre aperturas; «Ver los 16 platos» y los tres periodos |

## La ficha, con la forma de la fila y sólo donde hay foto (26 Aug 2026)

Dos cambios pedidos sobre la fase 2, y el segundo cambia lo que mide el contador.

### Nombre y precio en la misma línea

La ficha ponía el precio debajo del nombre, en su propia línea. La carta no se lee así: nombre a
la izquierda, precio a la derecha, descripción debajo a todo el ancho. Ahora la ficha lo cuenta
igual — `display:flex` con `align-items:baseline`, para que las dos cifras compartan la línea base
como en la fila. Comprobado a 375 y a 1000: nombre en x=21 y precio en x=301 en móvil, misma línea.

### Sólo abre el plato que tiene foto

Antes se abría en todos. Ahora la fila se ofrece a abrirse —cursor, velo al tocar, `role="button"`
y `tabindex`— **sólo si el estado le da una foto**, y lo pone y lo quita `render()`, así que subir
una foto desde el panel hace que ese plato empiece a abrirse sin recargar la carta.

**Lo que esto le hace al contador, dicho claro:** ya no mide interés por un plato, mide interés
por *los platos que tienen foto*. Un plato sin foto no puede aparecer en la tabla porque no hay
manera de consultarlo. La nota del panel se cambió en consecuencia: donde decía «los platos con
foto suelen recibir más consultas, tenlo en cuenta», ahora dice que **ahí sólo salen los platos
con foto** y que la tabla los compara entre sí. Y el estado vacío avisa de lo mismo.

Comprobado: un plato sin foto no abre nada al tocarlo y no lleva `role`; el que la tiene, sí.

## La ficha, en «Escaparate» (26 Aug 2026)

Elegida entre tres direcciones prototipadas sobre la carta de verdad y en móvil —**Escaparate**
(la foto es la ficha), **Etiqueta** (la foto enmarcada dentro del papel) y **Compacta** (foto de
108 al lado del texto)—. Punto de restauración antes del cambio en
`3-copias/2026-08-26_antes-de-escaparate/`.

La foto pasa de cuadrada a **4:5**, la vertical del móvil, y llena la hoja entera. El nombre, el
precio y la descripción van **encima de la foto**, en blanco, en el pie.

### El degradado va en el bloque de texto, no en una capa aparte

Una capa de altura fija —62% de la foto, por ejemplo— deja una línea sin fondo debajo en cuanto la
descripción crece. Aquí el degradado es el `background` del propio bloque de texto, así que **crece
con lo que haya escrito** y nunca hay una línea flotando sobre la foto pelada. Va de
`rgba(9,18,14,.94)` abajo a transparente arriba.

Es lo único que hace legible un nombre blanco sobre una foto que puede ser clara. Probado con la
misma foto aclarada a propósito: el nombre y el precio se siguen leyendo.

### Lo que hubo que cambiar de color

- **La cruz de cerrar** iba en crema translúcido, y sobre una foto clara desaparecía. Ahora es un
  disco oscuro al 55% con desenfoque detrás.
- **El asa** era tinta al 28%: invisible sobre una foto oscura. Ahora es blanca con una sombra.
- **«Agotado hoy»** era texto rojo, que sobre una foto no se lee. Ahora es una pastilla roja con
  el texto en blanco.
- Nombre y precio llevan una sombra suave (`0 1px 12px rgba(0,0,0,.35)`) para despegarse de las
  zonas claras de la foto sin que se note el truco.

### Sin foto, la ficha vuelve a ser papel

Hoy no se abre ninguna ficha sin foto —sólo abren los platos que la tienen— pero la regla está
escrita: si algún día se abre una, el bloque de texto pierde el degradado, deja de ser absoluto y
vuelve a la tinta sobre crema. Blanco sobre crema no se lee, y eso no puede depender de que nadie
cambie una condición.

### El texto entra después que la foto

La hoja sube, y 110 ms más tarde entran el nombre y el precio, y 60 ms después la descripción. Al
revés se lee el nombre antes que aquello que nombra. Con `prefers-reduced-motion` no entra nada:
está todo puesto desde el principio.

### Comprobado corriendo

Móvil 440 de ancho: hoja de 550 de alto con la foto entera, pastilla de agotado legible sobre la
foto, nombre y precio en la misma línea base. Escritorio 1000: la misma ficha dentro de la tarjeta
de 520 centrada. Cero errores en consola.

## Fuera las tres fotos de las esquinas (30 Aug 2026)

Las tres imágenes decorativas de las esquinas de la tarjeta —`.shape1` arriba a la izquierda,
`.shape2` arriba a la derecha, `.shape3` abajo a la derecha— se eliminan. No se sustituyen por
otras: ahí no vuelve a cargar ninguna foto.

Eran arte de la plantilla original («Getting You Hungry»): unas patatas fritas a lápiz, unas
hierbas y una ensalada, las tres ajenas al sistema de tres colores de la carta. Ya se habían ido
apagando por fases —primero se les quitó el balanceo perpetuo, luego se bajaron a opacidad 0,55 y
se escondieron por debajo de 1200px— y la conclusión de ese camino es que sobran. Un adorno que
hay que ir atenuando para que no moleste no está aportando nada.

### Qué se ha quitado, exactamente

- El bloque de HTML con los tres `<div>` y sus `<img>`, y el comentario del `loading="lazy"`.
- Las cinco reglas de CSS: el `position:absolute` compartido, la media query de 1200px y las
  tres de posición.
- Los tres PNG de `assets/`: `foodmenuShape3_1.png`, `foodmenuShape3_2.png` y
  `foodmenuShape3_3.png`.

Los ficheros se borran, no se dejan huérfanos. El build copia `assets/` entera al hosting, así
que un PNG que se quede aquí se sigue subiendo aunque nadie lo pida, y dentro de un año nadie
sabe si hace falta.

### Lo que cambia y lo que no

`.food-menu-tab-wrapper.style3` sigue siendo `position:relative` con `z-index:1`: de él cuelgan
los controles de cabecera y el `z-index:5` del título, que no se tocan. La tarjeta conserva su
relleno de 120px arriba y abajo a 1440px, así que el aire de las esquinas se queda igual; lo
único que desaparece es el dibujo que había dentro de ese aire.

Por debajo de 1200px no cambia nada en pantalla: ahí ya estaban ocultas. Lo que sí cambia en
móvil es que ya no viajan al hosting esos ~60 KB de PNG, que se subían siempre aunque el móvil
nunca los descargara.

## Auditoría de calidad web y arreglos (30 Aug 2026)

Pasada completa con Lighthouse 13.4 sobre la carta y sobre el juego, y una prueba de uso real
con Playwright: las trece pestañas, el buscador, el selector de idioma, el tamaño de texto, el
carrusel, el teclado, tres anchos de pantalla y la consola. Lo que salió y lo que se ha hecho.

### El salto de la portada: 0,316 de CLS

El peor resultado con diferencia, y el único que suspendía un umbral de Core Web Vitals.

Las fotos de portada las sube el restaurante desde el panel, así que la lista no está en el HTML:
llega en `estado.json`, ya con la carta pintada. Al llegar, la portada aparecía de golpe y
empujaba la carta entera hacia abajo. Dos movimientos en el mismo instante, además: la portada
ocupando su sitio, y la tarjeta cambiando su relleno superior de 89px a 8 —`.has-hero`— porque
con foto los controles van sobre ella y la imagen empieza donde empieza la tarjeta.

Medido en móvil con CPU a un cuarto y red 4G lenta, tomando la mediana de tres pasadas y
descartando los saltos con `hadRecentInput`, que es como lo mide el campo: **0,316**. El límite
son 0,1.

**El hueco se reserva antes de saber si hay foto.** El marco ya sale del build con su proporción
—3:2 en móvil, 2:1 en escritorio— y con su gris de fondo, así que reservarlo es reservar
exactamente lo que la foto va a ocupar. La decisión se toma en el arranque de la cabecera, antes
del primer pintado, con la clase `has-hero` en el `<html>`; de ahí cuelgan tanto el hueco como el
relleno corto de la tarjeta. Cuando llega `estado.json`, `pintarHero()` confirma o corrige.

Se reserva **por defecto**, y sólo se deja de reservar cuando ya se sabe que no hay fotos. La
visita típica de una carta es la primera —alguien que acaba de escanear el QR en la mesa— y ahí
no hay nada guardado que consultar; acertar en esa visita vale más que acertar en la segunda.
Quien ya ha estado lleva el número de fotos en `localStorage` y entonces se acierta siempre.

Sin JavaScript no se reserva nada: la lista de fotos vive en `estado.json` y ahí no va a llegar
ninguna, así que la carta empieza en el título, que es lo correcto.

**La trampa, y costó encontrarla.** `render()` da una primera pasada *antes* de que llegue
`estado.json`. En esa pasada «no hay fotos» todavía no significa que no las haya, y el primer
intento de este arreglo recogía el hueco recién reservado para volver a abrirlo medio segundo
después: dos saltos de 231px en lugar de uno, el doble de CLS que al empezar, y encima un cero
falso apuntado en `localStorage` que estropeaba la visita siguiente. Por eso existe
`estadoLeido`: distingue «todavía no sé» de «sé que no hay». `null` es lo mismo en los dos casos
y la portada necesita esa diferencia.

Se vio porque los dos saltos aparecían en la traza como un par que se anulaba —376 arriba, 376
abajo— y porque llevaban `had_recent_input`, que los escondía de la medición de campo. La
comprobación buena fue comparar el mismo código antes y después con el mismo método, no fiarse de
la nota global.

Resultado: **0,316 → 0,031**. Lo que queda es el cambio de tipografía al cargar la fuente, y está
diez veces por debajo del límite.

### La hoja de tipografías bloqueaba el primer pintado

`<link rel="stylesheet">` a secas: el navegador no pinta nada hasta tenerla. Medido, 2,6 s de
retraso en móvil, y con ellos se iban el FCP y el LCP. Ahora se pide con `media="print"` y el
`onload` la devuelve a `all`, que es el modo de bajarla sin bloquear. No se pierde nada: ya venía
con `display=swap`, así que el texto siempre se pintaba antes en la de respaldo. El `<noscript>`
cubre a quien navegue sin JavaScript, donde el `onload` no se dispara nunca.

### `estado.json` se pide desde la cabecera

Se pedía desde el script grande, que ocupa 88 KB y hay que leerlo entero antes de llegar a su
primera línea. Ahora sale de la cabecera, mientras el navegador sigue montando la página, y la
respuesta se recoge abajo en vez de volver a pedirla. La portada —el elemento más grande de la
primera pantalla— se descubre antes. Se consume una sola vez: el refresco de cada minuto vuelve a
preguntar de verdad y no revive la respuesta vieja.

### El botón de idioma se llamaba distinto de como se lee

`aria-label="Idioma"` mientras en pantalla ponía «Español». Es el criterio 2.5.3 de las WCAG,
nivel A, y no es una formalidad: quien maneja el móvil por voz dice lo que lee —«pulsa Español»—
y el mando no encontraba ningún botón con ese nombre. El `aria-label` se ha quitado y la palabra
«Idioma» está ahora dentro del botón, escondida a la vista con `.a11y` pero no al lector. El
nombre accesible es «Idioma Español», y en inglés «Language English»: se traduce con el resto.

### El juego no tenía región principal

Su envoltorio era un `div`. Ahora es `<main>`, misma clase y mismo CSS. Sin ninguna región
marcada, un lector de pantalla no ofrece el salto al contenido.

### Lo que se ha medido y no se toca

- **Las fotos de portada pesan 1,5 MB de más.** El panel ya las reduce a 1600px y las guarda a
  calidad 80, pero un móvil que enseña la foto a 370px se descarga igualmente los 1600. La
  solución es que el panel guarde varios tamaños y la carta los pida con `srcset`, y eso es una
  función nueva del panel, no un ajuste: queda propuesta, sin hacer.
- **`is-crawlable` suspende en el juego.** Lleva `noindex` a propósito.
- **Sin comprimir y sin caché en local.** El servidor de desarrollo de PHP no aplica ni `gzip` ni
  cabeceras de caché; las dos cosas están en el `.htaccess` y sólo se ven en producción. Cualquier
  medida de peso o de latencia hecha contra `localhost` cuenta de más por esto.

## Rendimiento en móvil: la portada dejaba de ser una foto y pasaba a ser el problema (30 Aug 2026)

Segunda pasada, ahora sobre rendimiento. La anterior había dejado la carta en 100 de
accesibilidad, 100 de SEO y el CLS resuelto; faltaba lo que tardaba en aparecer.

### Primero, medir donde se parece a producción

El servidor de desarrollo de PHP no comprime ni pone cabeceras de caché. Medida contra él,
Lighthouse acusaba 524 KiB de «documento sin comprimir» y una caché inexistente que en el
hosting sí están, en el `.htaccess`. Con eso la nota salía 64 y dos de los tres peores avisos
eran mentira.

Las medidas de este trabajo están hechas contra un servidor de laboratorio que aplica lo mismo
que el `.htaccess`: gzip —y sólo gzip, que es lo que hace `mod_deflate`; con brotli habría un
20% de ventaja que el hosting no tiene— y las mismas cabeceras de caché. Y con cinco fotos de
portada del peso real de las de producción, no con fotos de prueba de un kilobyte. Sobre esa
base la nota de partida era **75**, no 64, y el diagnóstico ya era uno solo:

| | valor | veredicto |
|---|---|---|
| TTFB | 10 ms | bien |
| FCP | 1,3 s | bien |
| Speed Index | 1,3 s | bien |
| TBT | 12 ms | bien |
| CLS | 0,024 | bien |
| **LCP** | **8,1 s** | **el problema entero** |

Todo lo demás estaba en verde. El LCP es la foto de portada, y valía por sí solo los 25 puntos
que faltaban.

### Por qué tardaba

Tres cosas, en este orden de tamaño:

1. **La foto que se bajaba no era la que se veía.** El panel guardaba una sola versión de 1600
   px. Un móvil enseña la portada en unos 370: se bajaba 348 KB para pintar un hueco de 370.
2. **Se bajaban las cinco.** `loading="lazy"` no servía: el carrusel se desliza en horizontal, y
   las cinco fotos entran en el alto de la pantalla, así que el navegador las daba por visibles
   y las pedía todas. Más de un mega y medio, en una carta que se abre con datos móviles.
3. **La petición salía tarde.** La lista de fotos llega en `estado.json`, y la foto no se pedía
   hasta que el script de 88 KB se había leído entero.

### Lo que se ha hecho

**El panel guarda una escalera de anchos, en WebP.** 480, 640, 800, 1000, 1200 y 1600, con el
original intacto al lado. Es `HERO_ANCHOS`, y está escrito dos veces —`config.php` y `gen.mjs`—
porque lo escribe uno y lo pide el otro; si cambia en un sitio tiene que cambiar en el otro.
Sobre las fotos de prueba: 347 KB el original, 61 KB el escalón de 800, 84 KB el de 1000.

La carta las pide con `<picture>` y `srcset`, no con un `srcset` suelto: quien no entienda WebP
—un 3%— ignora el `<source>` y se queda con el original del `<img>`. Con `srcset` a secas
elegiría un WebP que no sabe pintar.

**Nunca se pide un fichero que no exista.** El panel apunta en `estado.json`, en `heroWebp`, qué
fotos tienen la escalera completa, y la carta sólo pide variantes de ésas. Eso cubre los tres
casos que si no dejarían la portada rota: el rato entre subir una foto y generarle las
variantes, un hosting sin WebP en GD, y las fotos que ya estaban subidas antes de todo esto.
`heroWebp` no es una preferencia que se configure: se recalcula mirando el disco en cada
guardado, porque es el disco quien manda.

**Las fotos viejas se ponen al día solas, de una en una.** Una foto por visita al panel, no las
cinco: cada una son seis decodificaciones y seis codificaciones de GD, y las cinco de golpe se
pueden pasar del tiempo máximo de una petición en un hosting compartido. En dos o tres visitas
están todas, y mientras tanto la carta sirve el original y se ve igual.

**De las cinco fotos sólo se pide una.** La que se ve. En reposo, y sólo cuando la página ya no
tiene nada mejor que hacer, entra la siguiente —la única que se puede alcanzar con un gesto—. El
resto, en cuanto alguien toca el carrusel: ahí ya está claro que las quiere. Quien nunca desliza,
que son casi todos, se ahorra 180 KB.

**La foto se pide desde la cabecera y se pinta antes del resto de la carta.** Dos cambios que van
juntos: un `<link rel=preload>` con `imagesrcset` que sale en cuanto responde `estado.json`, y un
`<script>` de veinte líneas colocado justo detrás del marco de la portada. En ese punto del
documento ya existe el carril y no se ha leído todavía ni el primer plato; abajo, en cambio, hay
que haber leído las 780 KB enteras —312 platos por tres idiomas— antes de ejecutar nada. El
runtime reconoce después esa foto por `window.__heroYa` y la deja donde está en vez de montarla
otra vez, que sería quitar de la pantalla una imagen ya pintada para poner otra idéntica.

El `sizes` está escrito una sola vez, en `HERO_SIZES`, porque lo usan el preload y el `<source>`
y tienen que decir lo mismo: si no coincidieran, el navegador elegiría un escalón en el preload y
otro al pintar, y se bajaría la foto dos veces.

**El récord del juego ya no se pide siempre.** `record.json` no existe en un restaurante que no
usa el juego, así que cada visita gastaba una petición para recibir un 404 y dejar un error en la
consola. Ahora se pide después del estado y sólo si el juego está encendido. La chapa del récord
cuelga de la tarjeta del juego, que tampoco se enseña si está apagado.

### Antes y después

Medido alternando las dos versiones contra el mismo servidor, en la misma sesión y con las
mismas fotos, tres pasadas cada una, mediana:

| | antes | después |
|---|---|---|
| Lighthouse móvil, rendimiento | 76 | **88** |
| LCP (Lighthouse, simulado) | 7,2 s | **4,0 s** |
| **LCP (medido de verdad)** | **10,9 s** | **1,24 s** |
| Peso total | 2054 KB | **441 KB** |
| Peticiones | 16 | **12** |
| FCP | 1,28 s | 1,29 s |
| CLS | 0,024 | 0,022 |
| Accesibilidad | 100 | 100 |
| SEO | 100 | 100 |
| Buenas prácticas | 96 | **100** |

Las dos cifras de LCP no se contradicen: la de Lighthouse no es una medida sino una simulación
—reconstruye el tiempo a partir del grafo de dependencias con la CPU multiplicada— y castiga el
trabajo de hilo principal, que aquí es leer un documento de 780 KB con 312 platos. La medida de
verdad, con `PerformanceObserver` y la misma red y CPU frenadas, es la que ve el cliente: la
portada pasa de aparecer a los once segundos a aparecer a poco más de uno.

El juego, de propina: 69 a 92, por la hoja de tipografías que dejó de bloquear en la pasada
anterior.

### Lo que se ha medido y se ha decidido NO hacer

- **Minificar el CSS y el JavaScript en línea.** Son 15 KiB comprimidos y unos 90 KB de
  comentarios sin comprimir. El CSS se podría hacer sin dependencias; el JavaScript no, sin un
  parser de verdad —hay expresiones regulares y cadenas con `//` dentro, y un limpiador a base de
  expresiones regulares lo rompe—. Meter un minificador cambia lo que este proyecto es: un build
  sin dependencias. Queda propuesto, no hecho.
- **Bajar más el escalón que se pide.** Lighthouse sigue pidiendo 96 KiB menos porque compara con
  los 370 px de CSS y no con los píxeles reales de la pantalla. En un móvil de densidad 2,6 eso
  significaría servir una foto de 480 para un hueco de 370: se vería blanda. No se cambia calidad
  visible por puntos.
- **Las tipografías, 195 KB en dos ficheros de Google.** Ya no bloquean el pintado y no retrasan
  el LCP —la foto llega antes—, pero son el segundo bloque de peso. Servirlas desde el propio
  dominio y recortarlas a los caracteres que usan tres idiomas bajaría bastante y quitaría un
  tercero de en medio. Es un cambio con su propio riesgo visual y va aparte.

## Tercera pasada: los tres pendientes, medidos uno a uno (30 Aug 2026)

Los tres puntos que la pasada anterior dejó escritos como «propuestos, no hechos» se han probado
de verdad. Uno se queda, uno se ha deshecho con la medida delante, y el tercero se rechaza otra
vez y por escrito. Ninguno cambia una sola línea del diseño.

### 1. Los comentarios no viajan al móvil. SE QUEDA

El fuente sigue escrito con todas sus explicaciones —son la mitad del valor de este proyecto—
pero el documento compilado no las necesita: son 123 KB de 810 que el teléfono lee antes de
poder pintar nada, y no ejecutan nada.

Lo hace `adelgazar.mjs`, que **no es un minificador**: no renombra variables, no reordena, no
toca la sintaxis. Sólo borra lo que no se ejecuta. Esa distinción es la que permite hacerlo sin
dependencias y sin miedo.

El JavaScript se recorre con una máquina de estados y no con expresiones regulares, porque en
este código hay expresiones regulares literales (`/\.[^.]+$/`), cadenas con `//` dentro
(`https://`) y plantillas con `${}` anidados. Un limpiador a base de buscar y reemplazar los
rompe en silencio, que es la peor forma de romper algo. El CSS se puede aplastar más, porque no
tiene ni expresiones regulares ni punto y coma automático; en el JavaScript se conserva un salto
de línea por sentencia justamente por el punto y coma automático.

Se prueba con once casos que tumban a un limpiador ingenuo —comillas dentro de comentarios,
comentarios dentro de comillas, división contra expresión regular, plantillas— más, sobre el
JavaScript de verdad de la carta, que sigue compilando y que aplicarlo dos veces da lo mismo que
aplicarlo una.

| | antes | después |
|---|---|---|
| index.html en crudo | 810 KB | **707 KB** |
| index.html comprimido | 114 KB | **77 KB** |
| FCP real | 412 ms | **288 ms** |
| LCP real | 1240 ms | **1112 ms** |
| CLS real | 0,024 | **0,012** |

### 2. Las tipografías desde el propio dominio. SE DESHACE

Se hizo entero: los cuatro woff2 bajados a `assets/fuentes/`, las declaraciones `@font-face`
escritas a mano con sus `unicode-range`, el build copiando la carpeta. Y luego se midió.

**Sale peor.** El LCP real subió de 1,24 a 1,40 s. El motivo no es el peso —los ficheros son los
mismos— sino que **el hosting habla HTTP/1.1**. Comprobado con `curl` contra socialcard.es: sin
multiplexado, las fuentes servidas desde el propio dominio hacen cola con el documento, con
`estado.json` y con la foto de portada, que es justo lo que marca el LCP. Desde Google iban por
otra conexión y no estorbaban.

Es exactamente al revés de lo que suele recomendarse, y por una razón concreta de este hosting.
Si algún día el servidor pasa a HTTP/2, esta decisión hay que volver a mirarla: con multiplexado
el reparto cambia y traerlas aquí probablemente gane.

De paso quedó una trampa apuntada: dentro de una hoja de estilos externa, las `url()` son
relativas **a la hoja**, no al documento. Con las rutas del documento el navegador pedía
`assets/fuentes/assets/fuentes/...`, y como las fuentes no cargaban, la página se veía con las
de respaldo y todas las medidas salían mejor. Una medición que mejora sin explicación es una
medición rota.

### 3. Servir una foto más pequeña de la que se ve. SE RECHAZA

Lighthouse pide un escalón menor porque compara con los 370 px de CSS y no con los píxeles
reales de la pantalla. En un móvil de densidad 2,6 eso significa servir una foto de 480 para un
hueco de 370: se ve blanda. Y ya no arregla nada — la foto llega en 120 ms; la red dejó de ser
el cuello hace dos pasadas.

### Lo que se probó y no aportó nada

- **`content-visibility:hidden` en las pestañas cerradas.** Cero. Ya están en `display:none`, que
  se salta el diseño igual. El «estilo y diseño» se quedó en los mismos 280 ms.
- **Medir el carril de categorías en el siguiente fotograma** en vez de en la misma tarea. Peor:
  un fotograma más de trabajo y el TBT subiendo.
- **HTTP/2 en el laboratorio.** El LCP simulado baja mucho en algunas pasadas, pero no de forma
  estable. No es algo que se pueda cambiar desde el proyecto: es del hosting.

### Sobre la nota de Lighthouse, y por qué no se persigue más

La nota de rendimiento en móvil oscila entre 88 y 99 **en el mismo build y contra el mismo
servidor**. Doce pasadas seguidas: cuatro en 99, ocho en 88. No es ruido térmico: son dos
resultados discretos, y la diferencia está entera en el `elementRenderDelay` observado —149 ms
contra 285— que el simulador de Lighthouse multiplica hasta convertirlo en 1,7 s de LCP.

Por eso este registro da siempre las dos cifras. La de Lighthouse sirve para comparar auditorías;
la real, con `PerformanceObserver` y la red y la CPU frenadas, es la que ve quien escanea el QR:

| | valor real | umbral |
|---|---|---|
| LCP | 1,11 s | 2,5 s |
| FCP | 0,29 s | 1,8 s |
| CLS | 0,012 | 0,1 |
| TBT | ~10 ms | 200 ms |

Las cuatro en verde y con holgura. Perseguir los puntos que faltan en la nota simulada exigiría
tocar lo que de verdad queda debajo —un documento de 707 KB con 312 platos en trece pestañas y
sus tres idiomas en atributos— y eso ya no es un ajuste de rendimiento: es rehacer cómo se
guardan las traducciones. No se hace por una nota.

## PageSpeed sobre la URL de verdad: 79, y lo que faltaba (30 Aug 2026)

Las medidas anteriores eran contra un servidor local. PageSpeed sobre socialcard.es dio 79 en
móvil, y su desglose de LCP señalaba algo que en local no se ve, porque en local no hay latencia:

| Subparte del LCP | antes |
|---|---|
| Time to First Byte | 190 ms |
| **Retraso de carga de recursos** | **1.710 ms** |
| Duración de la carga del recurso | 1.070 ms |
| Retraso de renderizado | 380 ms |

1.710 ms esperando para *empezar* a pedir la foto. La causa es una fila de tres viajes: el
navegador baja el documento entero (76 KB comprimidos, 1.217 ms), dentro encuentra la petición
de `estado.json` (1.901 ms) para saber qué foto toca, y sólo entonces pide la foto. Y el hosting
habla HTTP/1.1, así que no hay nada que solape esos viajes por su cuenta.

### La cabecera Link: los dos primeros viajes dejan de ir en fila

El `.htaccess` anuncia `estado.json` en la respuesta del propio HTML:

```
Header set Link "<estado.json>; rel=preload; as=fetch; crossorigin"
```

Esa cabecera viaja **antes que la primera línea del documento**, así que el navegador empieza a
bajar `estado.json` mientras todavía está recibiendo el HTML. Va en el servidor y no en una
etiqueta del documento a propósito: dentro del documento no se descubre antes que el documento,
que es justo el problema que resuelve.

De paso desaparece el `?t=` del fetch. El anuncio pide la dirección pelada; con un rompecachés
serían dos direcciones distintas y dos descargas. Comprobado que no pasa: una sola petición,
iniciada por el `link`, y ni un aviso de «preload sin usar» en consola. La frescura la garantiza
el `no-store` que ya estaba puesto para ese fichero.

**Resultado, medido en producción: el retraso de carga baja de 1.710 ms a 249 ms.**

### La segunda foto espera a la primera

En la traza de producción se veía que la segunda foto empezaba a bajar 19 ms después de la
primera. El disparador era el evento `load` de la página, y en una conexión rápida el navegador
ya estaba ocioso: las dos peticiones se repartían el ancho de banda y la que se ve —la que marca
el LCP— tardaba el doble. Ahora la segunda espera a que la primera haya terminado, además de a
que la página esté en calma, con un tope de ocho segundos por si la primera no llega nunca.

Comprobado con la red frenada de verdad: primera foto 951→4.235 ms, `load` a 4.237, segunda a
4.243. En la traza de Lighthouse seguían pareciendo simultáneas, y esa es una lección para la
próxima: Lighthouse carga la página **sin frenar** y simula después, así que dos peticiones que
en la simulación se solapan pueden estar perfectamente ordenadas en la realidad.

### El panel convierte por reloj, no de una en una

Antes convertía una foto de portada por visita al panel. Ahora convierte mientras le quede
presupuesto: ocho segundos. Lo que hay que evitar es pasarse del máximo de una petición en un
hosting compartido —suelen ser treinta segundos—, no hacer pocas. El reloj se mira DESPUÉS de
cada foto: un servidor rápido termina las cinco en una visita y uno lento hace la que le cabe y
no se queda a medias.

### Lo que queda, y no depende del código

Con todo lo anterior desplegado, la nota sigue en 74 y el LCP simulado en 7,9 s **porque las
variantes WebP todavía no existen en el servidor**: la portada se sirve como el JPG original de
407 KB. Es el camino de respaldo previsto —nada roto—, pero es ahora el único término grande que
queda:

| Subparte del LCP | antes | ahora | con variantes (estimado) |
|---|---|---|---|
| TTFB | 190 ms | 782 ms | 782 ms |
| Retraso de carga | 1.710 ms | **249 ms** | 249 ms |
| Carga del recurso | 1.070 ms | 551 ms | ~110 ms |
| Retraso de renderizado | 380 ms | 398 ms | 398 ms |

Las variantes las genera el panel al abrirlo, y el panel pide contraseña: es el restaurante
quien tiene que entrar una vez. Hasta entonces la carta funciona igual, sólo que pesada.

## De 79 a 94 en móvil, y por qué los cinco que faltan no están en el código (30 Aug 2026)

Con las variantes WebP ya generadas por el panel, PageSpeed subió de 79 a 89. Lo que quedaba
estaba en dos avisos suyos que hasta entonces se perdían entre el ruido de las fotos.

### Las tipografías le quitaban ancho de banda a la portada

En la traza de producción: fuentes 992→1102 y 992→1118 ms, foto 996→1185. Las dos tipografías
son 194 KB y se bajaban a la vez que la portada, que son 54 KB y tardaba 189 ms por compartir la
línea con ellas.

Quién manda entre las dos no admite discusión: la portada es lo que Google mide como LCP, y el
texto entretanto ya se está viendo —`font-display:swap` lo pinta desde el primer momento en la
de respaldo—. Así que la carta ya no pide la hoja de estilos de entrada: sólo deja abiertos los
`preconnect`, que no cuestan ancho de banda, y la pide el script de detrás del marco en cuanto
la foto ha terminado. O a los 2,5 s si no llega, o de inmediato si resulta que no hay portada.

El juego se queda como estaba: allí no hay foto con la que competir.

### El empujón de bienvenida medía en el peor momento

`empujon()` —la señal que avanza y devuelve la barra de categorías para que se entienda que hay
más— empieza leyendo `scrollWidth` y `clientWidth`. Hacerlo en mitad del arranque obliga al
navegador a rehacer el diseño en ese instante: 17 ms de redistribución forzada, que PageSpeed
señala con nombre y línea, justo en la ventana en la que se está pintando la portada.

Ahora espera al `load`. No se pierde nada: ya tenía 700 ms de retraso propio y es una señal de
bienvenida, no algo que nadie esté esperando.

**Las dos cosas juntas: el «retraso de renderizado de elementos» pasó de 409 ms a 101.**

### Y un fallo de verdad, escondido en buenas prácticas

El `<meta charset>` estaba en el byte 3.382, detrás del comentario del traductor y del arranque
de JavaScript. El límite son 1.024: si el navegador no encuentra la codificación ahí, la adivina,
y cuando luego se la encuentra **vuelve a empezar el análisis del documento desde el principio**.
Con acentos y eñes en cada plato, adivinar mal no es un detalle de formulario. Ahora está en el
byte 81, que es donde tenía que haber estado siempre.

### Dónde está ahora, y qué falta

| | inicio | ahora |
|---|---|---|
| Rendimiento móvil | 74 | **94** (cuatro pasadas seguidas) |
| LCP | 7,9 s | **2,77 s** |
| FCP | 2,03 s | 2,01 s |
| Speed Index | 2,54 s | 2,43 s |
| TBT | 21 ms | 8 ms |
| CLS | 0,022 | 0,024 |
| Peso total | 1.039 KB | **389 KB** |
| Buenas prácticas | 96 | **100** |

Accesibilidad 100 y SEO 100, sin moverse en ningún momento.

**Los cinco puntos que faltan son TTFB, y el TTFB no está en el código.** Medido con `curl`
contra socialcard.es, cinco veces:

| Tramo | Tiempo |
|---|---|
| Conexión TCP | ~200 ms |
| Negociación TLS | ~370 ms |
| El servidor piensa | ~190 ms |
| **Total hasta el primer byte** | **~760 ms** |

Ese TTFB entra entero en el LCP y en el FCP, y las dos métricas puntúan hoy 0,84. Son las dos
únicas que no están en verde, y las dos mejoran con lo mismo.

Dos cosas concretas, las dos del hosting:

1. **TLS 1.3.** El servidor negocia **TLS 1.2**, comprobado con `openssl s_client`. La 1.2
   necesita dos idas y vueltas para el saludo; la 1.3, una. A la latencia medida, eso son unos
   185 ms menos en cada primera visita. Suele ser un interruptor en el panel del hosting.
2. **Una CDN por delante** (Cloudflare tiene plan gratuito). Termina el TLS cerca de quien
   escanea el QR en vez de al otro lado del país: los ~570 ms de TCP más TLS se quedarían en
   50-100. Eso son ~450 ms menos en el FCP y en el LCP a la vez, y con eso las dos métricas
   entran en verde.

Tampoco ofrece HTTP/3 (`alt-svc` vacío), que es lo que la CDN traería de propina.

Lo que sí se aclaró por el camino: **el hosting SÍ habla HTTP/2**. La nota anterior de este
registro decía lo contrario porque lo comprobé con un `curl` que no negocia h2; Lighthouse lo
registra como `h2`. La decisión de dejar las tipografías en Google se tomó con ese dato
equivocado y habría que volver a mirarla —aunque hoy importa menos, porque ya no se piden hasta
que la portada está.

## La página que ve quien se pierde (30 Aug 2026)

Hasta hoy, una dirección mal escrita dentro de la carta devolvía la pantalla en blanco de
Apache: «404 Not Found», trece bytes, sin marca y sin salida. Quien escanea un QR viejo sentado
a la mesa se quedaba ahí.

### La idea

La carta ya tiene un lenguaje propio: cada plato lleva su número delante, `01`, `02`, `07`. La
página de error enseña **404 en ese mismo sitio y con ese mismo aire**, como el número de un
plato que no está. No es un chiste a costa de la claridad —el titular dice «Esta página no
existe» en palabras llanas— y no es adorno: el 404 es el código exacto de lo que ha pasado,
contado en el idioma visual de la casa en vez de en el de un servidor.

Sin rótulo encima del titular. El titular se sostiene solo y el nombre del restaurante ya está
en el botón, que es donde hace falta.

### Cómo está hecha

Tarjeta crema sobre el navy de la carta —la misma relación de fondo profundo y papel encima—,
centrada, con el número, el titular, dos frases y un botón. Nada más. Un solo momento de
movimiento: la hoja sube diez píxeles al entrar, y con `prefers-reduced-motion` ni eso.

Comparte con la carta los tokens y las tipografías, y nada más: ni platos, ni estado, ni
carrusel, ni el motor de idiomas. **3,3 KB comprimidos.**

### Cuatro decisiones que no se ven

**Los enlaces son absolutos.** Apache sirve el fichero pero la dirección de la barra sigue
siendo la que el visitante escribió: desde `/menu2/carpeta/inventada/`, un enlace relativo
apuntaría a `/menu2/carpeta/inventada/index.html`, que tampoco existe.

**Sigue siendo un 404 de verdad.** `ErrorDocument` cambia el cuerpo, no el código. Un 404 que
respondiera 200 —un «soft 404»— le diría a Google que la página existe y merece indexarse, y
acabaría compitiendo con la carta buena. Lleva además `noindex,follow`.

**El idioma se elige en el navegador, no en el servidor.** Los tres textos viajan en el HTML
—son cuatro frases— y el script escoge: primero el idioma que el visitante ya eligió en la
carta, si no el de su teléfono, si no inglés. Sin JavaScript se queda el de la casa, que se lee
igual.

**Hereda el tema.** Se lee de `localStorage` antes del primer pintado, igual que hace el juego.
Quien venía de una carta en ciruela ve un error en ciruela, no en verde. La barra del navegador
acompaña.

### Este hosting ignora ErrorDocument

Y no lo dice. La página se hizo, se desplegó, y la dirección inventada seguía devolviendo los
trece bytes de siempre. El fichero estaba subido y accesible, y el resto del .htaccess se estaba
aplicando —se comprobó con una cabecera que sólo existe en la versión nueva—, así que la
directiva se estaba leyendo y no ejecutando.

Se resolvió con una prueba en vez de con una teoría: se desplegó `ErrorDocument 404
"PRUEBA-ERRORDOCUMENT-VIVE"`. Si la cadena aparecía, la directiva funcionaba y el problema era
la ruta. No apareció. **El hosting acepta ErrorDocument y no lo aplica**, sin error ni aviso.

El que hace el trabajo es `mod_rewrite`: lo que no corresponde a un fichero ni a una carpeta de
verdad va a `404.php`. El `ErrorDocument` se deja puesto de todas formas, porque es lo correcto
y en cualquier servidor sensato basta con él.

**Y por eso la página es .php y no .html.** Una regla de reescritura sirve el fichero con código
200, y eso es un soft 404: peor que no tener página de error, porque le dice a Google que la
dirección inventada existe. La primera línea del fichero pone el 404 a mano.

Las dos condiciones `!-f` y `!-d` no son adorno: sin ellas la regla se come el sitio entero.
Comprobado después de desplegar que la carta, el juego, las fotos, estado.json y el panel siguen
respondiendo 200 con su tamaño de siempre.

Una nota de método, porque costó una hora: entre el despliegue y la comprobación hay que esperar
a que el despliegue TERMINE. Dos de las medidas que llevaron a pensar que la reescritura tampoco
funcionaba se hicieron contra la versión anterior, porque el vigilante del despliegue se había
quedado con el identificador del anterior.

### Dos trampas más del .htaccess

**Las rutas del `ErrorDocument` y del `RewriteBase` son absolutas y están escritas a mano**, porque es lo único que Apache
acepta ahí y ese fichero se sube tal cual. Es la única dirección del proyecto que vive en dos
sitios, así que el build las compara con `cliente.mjs` y **aborta si alguna deja de coincidir**: sin
esa guardia, mover la carta de carpeta dejaría un 404 que devuelve la pantalla en blanco de
Apache sin que nadie se entere.

**El anuncio de `estado.json` pasa a `<Files "index.html">`.** Estaba en el `<FilesMatch>` de
todos los `.html`, así que la página de error y el juego anunciaban un fichero que no leen: una
petición que nadie recoge y un aviso en consola. Y se usa `<Files>` y no `<If>` a propósito:
`<If>` necesita Apache 2.4 con `mod_authz_core`, y en un hosting compartido donde falte no da un
aviso, da un error 500 y se lleva la carta por delante.

### Comprobado

28 comprobaciones: un solo `h1`, el 404 oculto al lector de pantalla, el botón como enlace de
verdad, contrastes (titular 9,6:1 · cuerpo 4,63:1 · botón 9,6:1), el foco visible en el primer
Tab, los tres idiomas, la preferencia guardada por delante del idioma del teléfono, el tema
heredado, sin JavaScript, y a 320, 390, 768 y 1440 sin desbordes y siempre centrada. Cero
errores de consola.

## Auditoría de LCP: dónde está el tiempo, y qué no lo mueve (31 Aug 2026)

Pasada dirigida al LCP, con el elemento identificado y no supuesto.

### El elemento LCP, medido

Es la foto de portada: `<img>` de 370×247 px de CSS. Las tres comprobaciones de descubrimiento,
en verde:

| | |
|---|---|
| `fetchpriority="high"` aplicado | sí |
| Se descubre en el documento inicial | sí |
| No lleva `loading="lazy"` | correcto |

Y además: WebP, escalón de 800 px para un hueco de 370, 54 KB, `decoding="sync"`, anunciada por
cabecera desde el servidor. **No queda nada que arreglarle a la imagen.**

### Dónde se va el LCP

Desglose medido en producción (mediana de tres pasadas):

| Subparte | Tiempo | Cuota |
|---|---|---|
| **Time to First Byte** | **771 ms** | **59%** |
| Retraso de carga | 237 ms | 18% |
| Descarga del recurso | 186 ms | 14% |
| Retraso de renderizado | 119 ms | 9% |

Y el TTFB, desglosado con `curl` sobre seis medidas:

| Tramo | Tiempo |
|---|---|
| DNS | ~10 ms |
| Conexión TCP | ~180 ms |
| **Negociación TLS** | **~365 ms** |
| El servidor piensa | ~188 ms |

**El 73% del TTFB es abrir la conexión.** El servidor tarda 188 ms en responder, que para un
fichero estático está bien. La negociación TLS son 365 ms porque el servidor habla **TLS 1.2**,
que necesita dos idas y vueltas; la 1.3 necesita una. A la latencia medida eso son unos 180 ms
que se ahorrarían en cada primera visita, y entran dos veces: en el LCP y en el FCP.

Ninguna línea de código toca eso.

### Lo que sí se arregló: record.json competía con la portada

Medido en producción: la portada se bajaba de 1.007 a 1.193 ms, y `record.json` salía a 1.022
—dentro de la ventana— con **prioridad alta**, que es la que `fetch` pone por defecto. Dos
peticiones de prioridad alta repartiéndose la línea, y una de las dos es la que Google mide.

Ahora se cuelga del `load` de la propia foto, igual que ya hacían las tipografías. Comprobado
con la red y la CPU frenadas: **antes salía a 744 ms con la portada acabando en 888; ahora sale
a 929 con la portada acabada en 925.**

Se cuelga de la FOTO y no del evento `load` de la página, y esa distinción costó encontrarla:
son unos milisegundos de diferencia real, pero el simulador de Lighthouse trata muy distinto a
las dos. Con la petición colgada de `load`, el FCP **simulado** subía 350 ms mientras el FCP
**observado** no se movía —209 ms contra 203—. La nota simulada es la que ve todo el mundo.

Y una guarda en `heroSoltar()`: no suelta nada mientras la primera foto siga bajando. El oyente
de scroll del carril las soltaba todas, y un carril con ajuste por deslizamiento puede
dispararlo solo al recibir cinco diapositivas.

### Lo que no era un problema

**version.json a los 3,5 segundos.** No bloquea nada: se pide con un temporizador, mucho después
de que la carta esté pintada, y sólo sirve para que un móvil que dejó la carta abierta ayer se
entere de que hay versión nueva. Aparece en el árbol de peticiones críticas de PageSpeed porque
ese árbol dibuja todo lo que cuelga del documento, no sólo lo que estorba. Se probó a moverlo al
`load` y el simulador lo penalizó igual que a `record.json`: se queda en el temporizador.

**Los 22 ms de redistribución forzada.** Es `syncScroller()` leyendo `scrollWidth` justo después
de que el cambio de idioma reescriba mil nodos. Ya se probó a aplazarlo un fotograma en la pasada
anterior y salió peor: un fotograma más de trabajo y el TBT subiendo. Se queda como está.

### Las tipografías, con números

Dos familias, las dos variables, 194 KB en total, `font-display:swap`, y ya no se piden hasta que
la portada ha terminado.

- **Bricolage Grotesque** (titulares, 33 usos), 76 KB. El eje de peso variable **hace falta de
  verdad**: las pestañas animan `font-variation-settings:"wght"` de 500 a 800 con una transición.
  Con pesos sueltos ese recorrido no existe.
- **Source Serif 4** (cuerpo, 13 usos), 120 KB — la mitad del peso de las dos juntas.

Los pesos que usa el CSS son cuatro: 400, 600, 700 y 800.

**Y aquí hay 71 KB sobre la mesa.** Source Serif se pide con el eje óptico
(`opsz,wght@8..60,400..600`). Los dos únicos `font-optical-sizing:auto` del proyecto están sobre
Bricolage, no sobre ella. Pedida sin ese eje, el mismo tramo latino pasa de **122.360 a 50.824
bytes**.

No se ha hecho, y por una razón: `font-optical-sizing` vale `auto` por defecto en cuanto la
fuente trae el eje, así que quitarlo **sí cambia cómo se dibuja el texto del cuerpo**, poco pero
de verdad. El encargo decía que la tipografía visual no se toca. Queda medido y propuesto: 71 KB,
el 18% del peso de la página, a cambio de un cambio sutil en el dibujo de la letra a 16-17 px. Y
no movería la nota: las fuentes ya no se piden hasta después del LCP.

### INP, que no se había medido nunca

Lighthouse no da INP —da TBT, que es otra cosa—, así que se midió interactuando de verdad con la
CPU a un cuarto: trece pestañas, buscador, hoja de categorías, cambio de idioma, tamaño de texto
y carrusel. **32 interacciones, la peor de 104 ms.** El umbral bueno son 200. La más cara es el
cambio de idioma, que reescribe mil nodos.

### Sobre lo que este ordenador puede medir y lo que no

La nota de Lighthouse en local oscila **entre 89 y 99 con el mismo código**, y esa oscilación se
tragó buena parte de esta sesión: se llegó a señalar un cambio como culpable de una caída de 98 a
89 que después resultó ser la misma moneda al aire. Cuatro pasadas alternando la versión de antes
y la de después dieron 89 las dos.

Lo que sí se puede afirmar, porque se midió y no oscila:

| | antes | después |
|---|---|---|
| FCP observado | 209 ms | 203 ms |
| LCP observado | 388 ms | 380 ms |
| LCP real, red y CPU frenadas | 1.108 ms | 1.108 ms |
| Trabajo de hilo principal | 766 ms | 777 ms |
| CLS | 0,024 | 0,024 |
| INP | — | 104 ms |
| record.json frente a la portada | **dentro** de la ventana | **fuera** |

El cambio es correcto en el orden y neutro en lo medido. No hay en el código otra palanca del
tamaño que haría falta: **la que queda es el TTFB, y es del hosting.**

### El 404, rehecho: la señal y la marca de agua (31 Aug 2026)

La primera versión —tarjeta crema con el 404 en el estilo del número de un plato— duró un día.
Se probaron cuatro direcciones en un selector y ganó la contraria: **sin tarjeta**.

**La página entera es el navy de la marca**, con el mensaje en crema encima y un único botón
claro. Es la relación invertida respecto a la carta, y a propósito: quien llega aquí no está
mirando un menú, está mirando un aviso. La tarjeta crema es el lenguaje de «esto es contenido»;
aquí no hay contenido que enmarcar.

**El 404 pasa a ser marca de agua**: enorme, centrado, detrás de todo, al 7% del crema. Sigue
siendo el dato exacto de lo que ha pasado —no es adorno— pero deja de competir por la atención
con la única frase que hay que leer. Y desaparece el icono de aviso que llevaba la versión
«Señal» del selector: con el número gigante detrás, un triángulo encima del titular era decir
dos veces lo mismo.

**Lo que costó medir.** Con el número detrás, el texto ya no cae sobre el fondo limpio sino
sobre los trazos, y ahí es donde hay que medir el contraste. El párrafo estaba al 68% del crema
y en el peor caso se quedaba en 4,57:1, rozando el mínimo; subido al 76% queda en 5,40. Medido
en los seis temas, texto sobre trazo:

| Tema | Titular | Cuerpo |
|---|---|---|
| de la casa | 8,05 | 5,40 |
| caoba | 9,17 | 5,99 |
| ciruela | 7,75 | **5,14** |
| laurel | 8,05 | 5,40 |
| mar | 10,81 | 6,90 |
| ónice | 12,91 | 8,03 |

El peor caso de los seis está en 5,14, por encima de 4,5. La marca de agua se queda en 1,15-1,19
frente al fondo en todos: se distingue, no compite.

**Tres detalles que no se ven.** La marca lleva `aria-hidden` —el titular ya dice en palabras lo
que pasa, y nadie necesita oír «cuatrocientos cuatro» antes de la frase—, no se puede seleccionar
ni recibe clics, y el `<body>` corta el desbordamiento horizontal: a 320 px de ancho el glifo es
más ancho que la pantalla y sin eso la página tendría barra horizontal por un adorno.

**El movimiento, uno solo.** El mensaje sube diez píxeles y aparece; la marca de agua se revela
detrás, 120 ms más tarde y sin moverse, que es lo que hace que se lea como fondo. Con
`prefers-reduced-motion`, ninguna de las dos.

Pesa **3,4 KB comprimidos**. 29 comprobaciones en verde, incluidas las de contraste sobre el
trazo, los tres idiomas, el tema heredado, sin JavaScript y cuatro anchos de pantalla.

### El texto del 404 cambia de voz (31 Aug 2026)

De «Esta página no existe» a «¡Ups! Este enlace se ha quedado sin mesa 🍽️». Es una decisión del
restaurante, no de diseño: el registro pasa de sobrio a cálido, y con él el botón, que ahora
dice «Volver a la carta» en vez de «Ver la carta» — «volver» reconoce que el visitante venía de
algún sitio, y eso es lo que ha pasado.

**El cuerpo va partido en dos.** La segunda mitad —«la carta sigue en su sitio y está llena de
cosas deliciosas»— va destacada, porque es lo único que hace falta llevarse si sólo se lee media
frase. El peso lo pone el color, no el trazo: sube al crema entero mientras la primera mitad se
queda al 76%. Sobre fondo oscuro, subir el brillo separa mejor que engordar la letra.

Partirlo en dos `<span>` en vez de escribir la negrita con HTML tiene una razón concreta: el
cambio de idioma escribe con `textContent`, que no interpreta etiquetas. Con el párrafo entero
en una sola pieza habría que pasar a `innerHTML`, que es la costumbre que acaba metiendo marcado
donde no toca. Dos trozos y cada uno con su `id`.

**El emoji lleva `aria-hidden`.** Un lector de pantalla lo lee en voz alta —«plato con tenedor y
cuchillo»— y sería lo primero que oye alguien ciego justo después de enterarse de que se ha
perdido. La frase funciona igual sin él, que es exactamente la prueba de que para quien no lo ve
sobra. Va además en su propio `<span>` con su tamaño y su interlineado: es el único glifo de la
página que no dibuja nuestra tipografía —lo pone el sistema operativo y se ve distinto en cada
teléfono—, así que se le da una caja para que no descoloque la línea base del titular.

**El título de la ventana se queda sobrio.** Sigue siendo «Página no encontrada · Tinge of
Turmeric»: una pestaña con «¡Ups!» y un emoji es ruido en una lista de veinte pestañas.

Las traducciones al inglés y al alemán llevan el mismo chiste, no una traducción literal:
«Oops! This link could not get a table» y «Hoppla! Für diesen Link war kein Tisch frei». Están
escritas aquí y **conviene que las mire alguien del restaurante**, que es la regla de esta carta
con todo lo que se traduce.

La medida del párrafo sube de 36 a 40 caracteres: son dos frases y no una, y a 36 la negrita se
partía en demasiados trozos. 31 comprobaciones en verde, contrastes incluidos.

## Dos A/B sobre el LCP, y un comentario de este archivo que era falso (31 Aug 2026)

Tres pruebas, un solo cambio cada vez, seis a diez pasadas de Lighthouse por variante y siempre
alternando A y B contra el mismo servidor para que la deriva de la máquina afecte a las dos por
igual.

### Prueba 1: `estado.json` se pide una vez. No se toca nada

Se contó por tres vías independientes en producción, con la red y la CPU frenadas: los eventos
de red del navegador, la API de rendimiento de la página y los avisos de consola.

**Una sola petición**, con `initiatorType: link` —la arranca el preload de la cabecera y el
`fetch` la reutiliza— y ni un aviso de «preload sin usar». El mecanismo funciona como se diseñó.
No había nada que arreglar y no se tocó.

### Prueba 2: los `preconnect` de las tipografías estaban costando dinero

Aquí arriba ponía, escrito por mí, que «abrir las conexiones no cuesta ancho de banda y las deja
listas para cuando toque». **Es falso**, y la medida lo dice sin ambigüedad:

| | pasadas | mediana | LCP |
|---|---|---|---|
| A · preconnect en la cabecera | 99 89 89 88 89 89 | **89** | 3,72 s |
| B · preconnect diferidos | 99 99 99 99 99 99 | **99** | **2,18 s** |

Seis de seis en 99 contra una de seis. No es ruido: es la diferencia entre las dos ramas en las
que llevaba oscilando la nota toda la semana, y resulta que la rama lenta la provocaban los
`preconnect`.

Dos apretones de manos TLS contra dos dominios ajenos, arrancados en el instante en que el
navegador está pidiendo el documento, el estado y la foto de portada, compiten por las mismas
conexiones y por el mismo hilo justo en la ventana que decide el LCP. Y no adelantan nada,
porque la hoja de estilos no se va a pedir hasta un segundo más tarde: para entonces la conexión
ya se habría abierto igual.

Ahora los abre el mismo script que pide la hoja, un instante antes de pedirla, que es cuando
sirven de algo. **La lección, más general que el caso: un `preconnect` a un recurso que no vas a
pedir todavía no es gratis.**

### Prueba 3: la portada aparece sin fundido

Todas las fotos del carrusel entran con `opacity 0 → 1` en 340 ms. Una imagen a opacidad 0 no
cuenta como pintada, así que el fundido retrasaba el LCP por su propia duración.

Sólo la primera —la que marca el LCP— pierde la transición. Las otras cuatro la conservan, y se
comprobó en el navegador: la primera con `transition: none`, las demás con sus 0,34 s.

| | mediana de 10 | rango |
|---|---|---|
| A · con fundido | 2.177 ms | 2.177-2.178 |
| B · sin fundido | **1.878 ms** | 1.877-2.103 |

−299 ms, y en ninguna pasada peor que A. La nota no se mueve —99 en las dos— porque a estas
alturas el LCP ya está dentro de la parte plana de la curva; el que gana es el cliente, no el
marcador.

El TBT de B salió con una mediana peor (30 contra 16), pero era **una** pasada: quitando ese
único valor de 232 ms, la media de B es 20 ms y la de A 23. Quitar una transición no puede
añadir trabajo de hilo principal, y las dos están muy por debajo del umbral de 200.

### Lo que dan las dos juntas

Medido como lo mide el campo —`PerformanceObserver`, red y CPU frenadas—, que es lo que ve quien
escanea el QR:

| | antes | después |
|---|---|---|
| **LCP real** | 1.080 ms | **768 ms** (−29%) |
| FCP real | 272 ms | 292 ms |
| CLS real | 0,0119 | 0,0119 |
| INP | 128 ms | 128 ms |

Y en Lighthouse: móvil de 89 a 99, **escritorio 100**. Accesibilidad, buenas prácticas, SEO y
navegación agéntica en 100 en las dos plataformas, antes y después. 47 pruebas funcionales en
verde y cero errores de consola.

### Corrección: aquellos 1,5 s eran del laboratorio, no de producción (31 Aug 2026)

El apartado de arriba dice que los `preconnect` costaban 1,5 s de LCP. **Es una cifra de
laboratorio y no vale como cifra de producción.** Medido en socialcard.es, cuatro pasadas antes
y cuatro después del despliegue:

| | laboratorio | producción |
|---|---|---|
| LCP antes | 3.718 ms | 2.762 ms |
| LCP después | 1.878 ms | **2.601 ms** |
| diferencia | **−1.840 ms** | **−161 ms** |
| nota antes / después | 89 → 99 | 94 → 95 |

El cambio es el mismo y va en la misma dirección; lo que cambia es cuánto pesa. El laboratorio
no tiene latencia —el TTFB son 10 ms— así que la competencia entre peticiones era casi todo el
LCP y quitarla movía casi todo. En producción el TTFB son 830 ms, el 63% del LCP observado, y
eso no lo toca ninguno de los dos cambios.

El mecanismo sí funciona, y se ve en la traza de producción: la portada acaba a 1.253 ms y la
hoja de tipografías empieza a 1.256. Ya no compiten. Pero lo que se gana con ello, aquí, son 161
ms y no 1,8 s.

**La lección, para la próxima vez que este registro dé una cifra:** un laboratorio sin latencia
exagera todo lo que arregla contención de red, y en la misma proporción en que el TTFB real es
grande. Las cifras de laboratorio sirven para decidir entre A y B —que es para lo que se usaron,
y bien— pero no para prometer un resultado.

### Y una tercera cifra, que tampoco es ninguna de las dos

PageSpeed, medido por el cliente desde su navegador, da **89** donde yo mido **95** contra la
misma URL el mismo día. Las dos son correctas: PageSpeed mide desde los servidores de Google y
yo desde aquí, y a este hosting no se llega igual desde los dos sitios. La diferencia estaba
entera en el LCP —3,8 s en su medida contra 2,6 en la mía—, o sea en el viaje.

Lo que las tres mediciones dicen a la vez, y es lo único que hay que retener: **el LCP de esta
carta lo manda el TTFB, y el TTFB lo manda el hosting.** Del código ya no queda ninguna palanca
de ese tamaño.

## Dos de las tres fotos desaparecían en escritorio (31 Aug 2026)

Lo encontró la suite de pruebas contra producción, no una medición de rendimiento: tres 404 en
la consola que en local no salían.

```
404 .../assets/hero/444ec7dad88c5e4a-1600.webp
404 .../assets/hero/c148c5b104481ea8-1600.webp
```

Y el síntoma, comprobado a 1440 px:

| | foto 1 | foto 2 | foto 3 |
|---|---|---|---|
| escritorio | ok | **OCULTA** | **OCULTA** |
| móvil | ok | ok | ok |

### La causa

El panel reduce las subidas a **1600 px como máximo**. Una foto que llegó con 1565 no genera la
variante de 1600, y hace bien: ampliarla sería inventar píxeles y pesar más por una imagen que
no mejora. `hero_con_variantes()` la daba por completa, y con razón — tiene todos los anchos que
le corresponden.

Pero **la carta anunciaba siempre la escalera entera**, los seis anchos, para cualquier foto que
estuviera en `heroWebp`. En una pantalla ancha el navegador pedía el de 1600, recibía un 404, y
el manejador de error escondía la diapositiva. En silencio.

En móvil no se veía nunca, porque ahí no se pide el escalón grande. Por eso ni PageSpeed ni las
pruebas de móvil lo cazaron: **el fallo vivía justo donde no estábamos mirando.**

### El arreglo, en dos capas

**En origen.** `heroWebp` deja de ser una lista de nombres y pasa a ser un mapa nombre → anchos
que esa foto tiene de verdad. La carta anuncia exactamente eso. Los tres sitios que montan una
foto —el preload de la cabecera, el script que va detrás del marco y el runtime— leen los anchos
de la misma función, `window.__anchos`, escrita una vez en la cabecera en lugar de tres veces.

**Y una red debajo.** Si una foto falla igualmente, ya no se esconde: se tira la variante WebP y
se reintenta con el original. Sólo si eso también falla se recoge la diapositiva.

La red no es adorno: cubre el rato entre desplegar esto y la primera vez que alguien abra el
panel, porque hasta entonces el estado sigue trayendo la lista vieja. Comprobado con el formato
antiguo puesto a mano: las dos fotos que antes desaparecían ahora caen al original y se ven.

### Lo que se comprueba ahora y antes no

Una suite nueva que carga la carta a **seis anchos y densidades** —1440, 1440 a 2x, 768, 390 a
3x, el móvil de Lighthouse y 320— y exige dos cosas en cada uno: que ninguna diapositiva quede
oculta o sin pintar, y que no haya ni un 404 de foto. Doce comprobaciones.

Con un juego de pruebas hecho a propósito para el caso: tres fotos con originales de 1620, 1565
y 1400 px, o sea una con los seis anchos y dos sin el grande. Antes del arreglo, ese juego
reproduce el fallo; después, las tres se ven en los seis tamaños.

## La nota fiscal, y por qué la decide el cliente y no el motor (31 Aug 2026)

Una carta que enseña 312 precios sin decir si llevan impuesto está incompleta. Se añade al pie
de la columna de precios, a la derecha y en el mismo borde: medido a 375, el canto derecho de la
nota y el de la columna coinciden en el mismo píxel; en escritorio, también.

**11px y `--muted`.** 4,63:1 sobre la tarjeta en el tema por defecto, 6,69:1 en onice. Es el
suelo del proyecto y no se baja de ahí: por debajo de 11 no es discreción, es letra que no se
puede leer, y una nota de impuestos tiene que poder leerse aunque no llame.

**Una vez y no en las 312 filas.** Repetirla por plato sería justo lo contrario de discreta.

**Empezó con un asterisco y se lo quitó.** «* IGIC incluido» era una llamada al pie que no
llamaba a nada: ninguno de los 312 precios lleva asterisco arriba, así que el lector lo busca y
no lo encuentra. Peor aún, en la pestaña de currys «Incluido» ya significa otra cosa —la salsa
no cuesta extra— a una pantalla de distancia. Ahora dice la frase entera: «Precios con IGIC
incluido», que se explica sola y no remite a nada.

**Vive en `cliente.mjs`, no aquí, y el build revienta si falta.** El impuesto no es el mismo en
todas partes: en Canarias es el IGIC, en la península el IVA. Un cliente nuevo que copie esta
carpeta tiene que decidirlo, y la guarda está para que no se le olvide — el mismo mecanismo que
impide publicar con el nombre del restaurante anterior. No hay valor por defecto a propósito: un
«IGIC incluido» de fábrica acabaría publicado tal cual en un restaurante de Madrid, y una nota
fiscal equivocada es peor que ninguna.

---

## El buscador tolera erratas, pero sólo cuando no encuentra nada (31 Aug 2026)

`nan` no encontraba `Naan`. El buscador entendía plurales desde la última tanda, pero no una
letra de menos, y en una carta india el comensal escribe lo que oyó: `tika`, `tanduri`,
`paner`, `biriani`, `vindalu`, `corma`, `papadam`. Ninguna de esas siete devolvía un plato.

**Distancia de edición, con dos guardas.** Se compara la consulta contra cada palabra del
nombre y del contexto —pestaña y grupo— y se acepta si difieren en pocas letras. Las guardas
son las que hacen que esto no estropee lo que ya funcionaba:

1. **Sólo se activa si la búsqueda normal da cero.** Mientras haya resultados exactos, el
   buscador se comporta exactamente igual que antes: mismas coincidencias, mismo orden. Una
   errata no puede colarse por delante de una palabra que sí está en la carta.
2. **La tolerancia depende de la longitud.** Una letra hasta seis caracteres, dos a partir de
   siete. Se probó en seco contra el vocabulario real —157 palabras— antes de tocar el
   proyecto: con dos letras de margen para palabras cortas, `vino` devolvía seis platos
   (`vindaloo`, `pollo`, `mango`...). Un comensal que busca vino y recibe pollo al vindaloo
   está peor que recibiendo cero.

**Coste.** El algoritmo es cuadrático, pero corta en cuanto la fila entera supera el margen, y
descarta por longitud antes de empezar. Sobre 312 platos y sólo en el caso de cero resultados:
577 ms por vuelta completa, tecleo incluido. No se nota.

**Lo que sigue sin encontrarse, y está bien.** `chili` no devuelve nada en español porque en la
carta española esos platos se llaman `guindilla`: no es una errata, es otra palabra. En inglés,
donde `chilli` sí existe, `chili` devuelve ocho. Esto es un problema de sinónimos y se resuelve
—si se resuelve— con un diccionario, no con distancia de edición.

**La prueba del diferido de portadas se ancló a la foto, no al reloj.** Al comprobar que esto no
rompía nada apareció un fallo que no era del buscador: la comprobación «al cargar sólo se pide
una foto» esperaba 700 ms fijos, y con la red frenada el `domcontentloaded` llega tan tarde que
la ventana se cruzaba con el giro del carrusel a los cinco segundos. Ahora espera a que la
primera foto esté pintada y cuenta entonces. Medido: la segunda foto arranca a 5,15 s, la
primera termina a 1,45 s — el diferido nunca estuvo roto, la regla lo estaba.

---

## El buscador deja de repetir platos y separa el ruido de sección (31 Aug 2026)

Buscar «sopa» devolvía catorce resultados: ocho sopas y seis aperitivos. Y de esos catorce,
sólo nueve eran platos distintos —«Sopa de lentejas» salía tres veces seguidas—. Dos problemas
con la misma cara.

**De filas a platos.** Un plato ocupa varias filas de la carta: además de su pestaña de comida
está en Vegano y en Sin gluten, y algunos salen en cinco sitios. Son 312 filas y 183 nombres.
El buscador recorría filas. Ahora agrupa por **nombre y precio**, y enseña una entrada por
plato con todas sus secciones debajo: «Papadum — Aperitivos y sopas · Vegano».

El precio entra en la identidad a propósito. «Pollo Tikka» vale 8,00 € de entrante y 19,95 € en
el biryani: son dos platos distintos con el mismo nombre, y juntarlos enseñaría un precio que no
es el de ninguno. El efecto secundario está medido y se asume: **63 platos figuran con el mismo
nombre y distinto precio según la pestaña** —la sopa de lentejas vale 7,00 € en Aperitivos y
8,00 € en Sin gluten— y ésos siguen saliendo dos veces. Con dos precios delante, enseñar uno
solo sería mentir. Si esa diferencia de precio es deliberada, lo que falta no es código: es que
la carta lo diga.

**Agotado sólo si lo están todas sus filas.** Mientras quede una copia disponible el plato se
puede pedir; tacharlo sería quitarle al comensal algo que la cocina tiene.

**Dos bloques con rótulo.** Lo que casa en el NOMBRE va arriba bajo «Platos»; lo que casa sólo
por el rótulo de su pestaña o su grupo va debajo, bajo «También en estas secciones». Ponerlo
detrás sin decir nada —que es lo que se hacía— seguía siendo una lista de catorce en la que seis
no eran sopa y nada explicaba por qué estaban ahí.

No se pueden quitar y ya está, que es lo primero que uno piensa: **«curry» casa en el nombre de
dos platos de los cuarenta y nueve que devuelve, y «biryani» de ninguno de los treinta y cuatro**.
Ésa es exactamente la búsqueda que arregló mirar el contexto. Por eso el rótulo aparece **sólo
cuando hay de las dos clases**: si todo viene del contexto, la lista ES la respuesta y un rótulo
que la separe de nada sólo estorba. Medido después: «sopa» 6 + 6 con rótulos, «biryani» 28 sin
ninguno, «curry» 49 intacto.

**El rótulo comparte selector con `.sheet-label`** en vez de copiar sus medidas. Es el mismo
rótulo, en la misma hoja, a la misma distancia de lo que encabeza; dos reglas gemelas se separan
a la tercera vez que alguien toca una sola.

**Los contadores de los chips también cuentan platos.** El propio código dice que un contador que
promete 53 y entrega 10 es peor que no poner contador; con la lista agrupada y el chip contando
filas, ese descuadre se lo habría hecho él solo. Comprobado: promete 53, entrega 53.

**Coste.** INP de 136 ms a 104 ms: agrupar cuesta menos que crear los nodos que sobraban.

---

## El bucle de recargas cuando el navegador no deja escribir (31 Aug 2026)

La carta compara su marca con `version.json` y se recarga una vez cuando hay carta nueva. Para no
repetir, apuntaba en `sessionStorage` que ya lo había hecho.

Hay navegadores que no dejan escribir ahí: Safari en privado, Chrome con las cookies bloqueadas,
la carta abierta dentro de otra app. Allí el `try` se tragaba el fallo, la nota no se guardaba
nunca, y como `version.json` seguía diciendo que hay carta nueva, **esto recargaba cada dos
segundos y medio para siempre**. Medido con el almacenamiento bloqueado: **ocho cargas de página
en veinte segundos**. Y ocurría justo después de publicar un cambio, que es cuando más se mira.

**Segundo cerrojo, y no necesita permiso de nadie:** el navegador sabe si esta carga ha sido ella
misma una recarga (`PerformanceNavigationTiming.type`). Si venimos de recargar y la versión sigue
sin cuadrar, es que recargar no ha servido —el servidor está dando la página vieja— y no va a
servir la próxima vez tampoco. Se deja estar: en el peor caso el comensal ve la carta de hace un
rato, que es infinitamente mejor que no ver ninguna.

Se descartó apagar la recarga cuando no hay almacenamiento: con eso, quien navega en privado no
vería nunca un cambio de precio. Y se descartó marcar la recarga en la URL (`?v=`), que funciona
pero ensucia la dirección de todo el mundo para arreglar el caso de unos pocos.

Medido después: 2 cargas en veinte segundos con el almacenamiento bloqueado, las mismas que en
una sesión normal. La recarga útil sigue ocurriendo; la novena, la décima y la infinita, no.

---

## Que la versión sin gluten o vegana cueste más es a propósito (31 Aug 2026)

**Decisión del restaurante, tomada el 31 de agosto de 2026.** 63 platos figuran con el mismo
nombre y distinto precio según la pestaña: la sopa de lentejas vale 7,00 € en Aperitivos y
8,00 € en Sin gluten; la pakora de cebolla, 5,50 € en Entrantes y 6,50 € en Vegano. **No es un
error de datos.** Esas versiones se preparan aparte y cuestan más.

Queda escrito aquí para que nadie vuelva a «arreglarlas»: quien las iguale estará bajando
precios que el restaurante ha subido a propósito.

**Lo que sí faltaba era decírselo al comensal.** Veía dos precios para lo que parece el mismo
plato y no tenía manera de saber por qué, y el buscador —que ahora junta el mismo plato en un
solo resultado— los deja uno debajo del otro, que es donde peor se ve. Las pestañas Sin gluten
y Vegano llevan ya su línea de aviso:

> **Importante** · Se cocinan aparte para evitar el gluten. Algunos de estos platos cuestan un
> poco más que en su sección original.

Va por el mecanismo que ya existía —`intro` de la pestaña en `carta.mjs`, que `importar.mjs`
lleva a `TAB_INTRO` y a las tres traducciones—, no por una excepción escrita a mano en el
motor. Dice **«algunos»** y no «todos» a propósito: de los 63, hay 9 que existen a varios
precios en las dos partes y no se puede afirmar la regla entera sin mentir en esos.

---

## El mismo plato, agotado en una pestaña y disponible en otra (31 Aug 2026)

Un plato ocupa varias filas: además de su pestaña de comida está en Sin gluten y en Vegano.
Cada fila tiene su clave y `estado.json` va por clave. Comprobado antes del arreglo: marcado
`Papadum` agotado y a 1,50 €, su copia en Vegano seguía **disponible y a 1,00 €**, y el
buscador enseñaba «Papadum [AGOTADO]» y «Papadum [disponible]» en la misma lista. 23 platos con
filas espejo.

**Se arregla donde se escribe, no donde se lee.** El panel expande a todas las filas del plato
lo que se marca en una: `plato_hermanas()` agrupa por **nombre y precio de carta**. El precio
tiene que entrar —«Pollo Tikka» vale 8,00 € de entrante y 19,95 € en el biryani, y no es el
mismo plato— y tiene que ser el de la CARTA y no el de ahora, porque si fuera el de ahora,
cambiarle el precio a una fila la separaría de sus hermanas justo cuando más falta hace que
sigan juntas.

Se descartó arreglarlo en la carta, al leer: habría que escribir la misma regla de identidad
dos veces, en PHP y en JavaScript, y dos reglas gemelas se separan. Y no hacía falta: el estado
publicado tenía cero agotados y cero precios cambiados, así que no hay nada viejo que curar, y
la lista de agotados se vacía sola cada día a las 6:00.

**Las casillas hermanas se marcan juntas en el navegador, y esto no es adorno.** Si sólo se
expandiera al guardar, DESmarcar sería imposible: al quitar una casilla, la hermana seguiría
marcada y el servidor volvería a tachar el plato. Con las dos moviéndose juntas, quitar una las
quita todas — y además el que guarda ve lo que va a pasar antes de que pase.

**Los precios se extienden igual, pero no se pisan.** Si alguien ha escrito a mano dos precios
distintos para el mismo plato, se guardan los dos y se avisa por su nombre: quien decide si eso
es un error es el restaurante, no el panel.

De paso muere `$repetidos`, que contaba los nombres repetidos desde hacía meses y no usaba el
resultado para nada. Alguien vio el problema y se quedó a mitad.

---

## Un precio mal escrito ya no se pierde en silencio (31 Aug 2026)

`precios_publicar` descartaba con `continue` lo que no fuera un número y el mensaje seguía
diciendo «Publicado: N precios». Quien escribe `9,5O` con una letra O en vez de un cero veía el
aviso verde, se iba, y el plato se quedaba al precio de la carta sin que nada se lo dijera.

Ahora se guarda igual todo lo que vale —no se pierde el trabajo bueno por una casilla mala— y
el aviso nombra el plato que ha fallado. **La casilla vacía sigue siendo válida y silenciosa:**
es la manera de decir «vuelve al precio de la carta», y avisar de eso sería regañar a alguien
por hacer justo lo que quería.

---

## El primer tabulador vuelve a ser «saltar al contenido» (31 Aug 2026)

Al abrir la carta, la página bajaba 23 píxeles sola y el primer `Tab` de quien navega con
teclado caía en una flecha del carrusel, en mitad del documento. El enlace de saltar al
contenido quedaba **el quinto**, después de recorrer la página entera y dar la vuelta. Un
enlace para saltar al que hay que llegar saltando no sirve para nada.

**La causa, aislada con una prueba:** el cambio de idioma recentraba el chip activo con
`scrollIntoView({block:'nearest', inline:'center'})`, y eso se ejecuta también al arrancar.
`scrollIntoView` no sólo mueve el contenedor: mueve la página si hace falta, y de paso mueve el
punto desde el que el navegador empieza a tabular. Neutralizándolo, `scrollY` se queda en 0 y
el primer `Tab` cae donde debe. Medido antes y después:

```
tal cual            scrollY=23   tab1=flecha carrusel, tab2=juego, tab3=WhatsApp
sin scrollIntoView  scrollY= 0   tab1=saltar al contenido, tab2..4=tamaño de texto
```

**El arreglo ya estaba escrito 1.200 líneas más arriba.** `selectTab` movía la barra a mano
—`nav.scrollLeft`— justo por este motivo, y su comentario lo explicaba. Se saca a
`centrarChip()` y lo llaman los dos sitios: la regla es la misma y dos copias se separan.

Comprobado además que no se pierde lo que hacía: al elegir una pestaña lejana la barra sigue
moviéndose (scrollLeft 0 → 1.472), y al cambiar de idioma el chip activo sigue a la vista sin
que la página dé ningún salto.

---

## Source Serif viaja con el tamaño óptico fijo: 70 KB menos (31 Aug 2026)

El subconjunto latino pesaba **122.360 bytes** y ahora **50.824**. Son casi 70 KB en cada
visita nueva, la mitad de toda la tipografía de la carta.

El eje óptico hace que la letra cambie de forma según el tamaño al que se pinte —más abierta en
pequeño, más fina en grande— y para poder hacerlo la fuente viaja con todas las formas dentro.

**Lo primero que se probó fue recortar el rango, y no sirve.** La carta usa Source Serif entre
11 y 18,2 px, así que pedir `opsz@11..19` en vez de `8..60` parecía gratis. Medido: Google
**no recorta el eje**. Los dos pesan exactamente 122.360 bytes. O se fija en un valor o no hay
ahorro.

**Y de los valores, sólo sirven los que la fuente tiene definidos.** Medido uno a uno:

| se pide | se recibe |
|---|---|
| `opsz@12` | 52.416 bytes |
| `opsz@13` | **122.360** — la variable entera, sin avisar |
| `opsz@14` | 50.824 bytes |
| `opsz@15` | **122.360** — igual |
| `opsz@16` | 52.212 bytes |

Se elige **14** porque es el tamaño del texto de los platos, que es casi toda la letra de la
carta: ahí el dibujo es idéntico, 0,00 % de diferencia medida. A 13 y 15 px se mueve un 1 %, y
en el tamaño de letra más grande —18,2 px— un 4,7 %, que es texto que alguien ha agrandado a
propósito y donde una letra un pelo más ancha no es un defecto.

**Y en la carta de verdad no se mueve nada.** Comparadas las dos fuentes sobre la página
compilada, con una sonda que comprueba que la fuente ha cambiado de verdad —408 px contra 390 px
en la misma frase— y midiendo después 250 descripciones a dos anchos de pantalla y con los dos
tamaños de letra: **cero líneas cambian de sitio y la página mide exactamente lo mismo**.

**Bricolage se queda con su rango.** Sus títulos van de 20 a 44 px, tiene `font-optical-sizing:
auto` puesto a mano en dos sitios y ahí el eje sí está haciendo su trabajo. Recortarle el rango
tampoco ahorraría nada: medido, 76.888 bytes pida lo que se pida.

---

## El buscador entiende sinónimos (31 Aug 2026)

`chili` daba cero con ocho platos de guindilla en la carta. No es una errata —eso ya lo perdona
la distancia de edición— son **dos nombres para la misma cosa**, y media carta está en indio
transcrito: el comensal de aquí busca por el ingrediente que conoce.

**La lista vive en `cliente.mjs`, no en el motor**, porque es vocabulario de este restaurante.
Cada línea es un grupo y escribir cualquiera de sus palabras busca todas, en los dos sentidos.

**Ninguna se inventó.** Se midieron 36 palabras que un comensal español teclearía y sólo se
añadió grupo donde había un agujero de verdad, comprobando además que la palabra de destino
existe en la carta. La mayoría no hacía falta: `patata` ya daba 36 resultados y `lentejas` 29,
porque las descripciones las llevan escritas. Los nueve grupos que quedaron:

| se escribe | daba | ahora |
|---|---|---|
| `chili`, `picante` | 0 y 1 | 9 |
| `okra`, `quimbombo` | 0 | 4 |
| `carne picada` | 0 | 6 |
| `nata`, `crema` | 0 | 8 |
| `brasa` | 0 | 22 |
| `espinacas` + `saag` + `palak` | 4 sueltos | 11 |
| `garbanzos` + `chana` | 3 y 2 | 5 |
| `coliflor` + `gobhi` | 3 y 2 | 5 |
| `queso` + `paneer` | 10 y 14 | 23 |

**Se compara la consulta ENTERA contra el grupo, no por trozos.** «carne picada» funciona,
«carne» a secas no, y está bien que no: a secas no quiere decir kheema.

**Y no es un respaldo como las erratas, sino parte de la búsqueda normal.** Un sinónimo es un
nombre de verdad del mismo plato, no un error de tecleo: si casa en el nombre, cuenta como
coincidencia en el nombre y va en el primer bloque. Comprobado que no estropea lo que había:
`guindilla` 9, `naan` 15, `curry` 49 y `sopa` 12, iguales que antes, y `vino` sigue en cero.

---

## La categoría abierta va en la dirección, y «atrás» ya no saca de la carta (31 Aug 2026)

Dos cosas que faltaban y que todo el mundo da por hechas.

**Compartir.** Quien mandaba «mira los panes de este sitio» mandaba una dirección que abría los
aperitivos: la categoría no estaba escrita en ningún sitio. Ahora la carta lee la almohadilla al
abrir y va a esa pestaña. Una almohadilla inventada no rompe nada: se queda en la primera.

**El botón de atrás.** Antes sacaba de la carta de un golpe, porque nadie había apuntado los
cambios de pestaña en el historial. Ahora atrás vuelve a la categoría anterior. **El precio está
asumido:** salir cuesta tantas vueltas como pestañas se hayan abierto. El navegador ya tiene su
remedio —mantener pulsado el botón enseña la lista entera— y confundir «atrás» con «salir» es
peor que la molestia.

**`replaceState` la primera vez y `pushState` después:** entrar en la carta no tiene por qué
dejar dos entradas en el historial antes de haber tocado nada.

**Y con una hoja abierta se reemplaza, no se apila.** Esto no es un detalle: la hoja pone su
propia entrada al abrirse y la quita con `history.back()` al cerrarse. Si elegir una categoría
desde la hoja apilara otra entrada encima, ese `back()` se llevaría la de la categoría y dejaría
la de la hoja colgando. Comprobado en móvil: atrás cierra la hoja **sin** cambiar de categoría, y
elegir categoría desde la hoja cierra, cambia, y el siguiente atrás sigue dentro de la carta.

---

## Tres arreglos pequeños y uno que no tiene arreglo (31 Aug 2026)

**El punto del carrusel mide 24 y no 22.** Lo que se ve son 8 píxeles; lo que se toca es la caja,
y el mínimo de la WCAG 2.5.8 son 24×24. Con 22 se salvaba por la excepción de separación, pero
salvarse por dos píxeles y una excepción no es cumplir. El dibujo no cambia: sólo crece la zona
sensible.

**`/admin/<ruta inventada>` ya da la página de la carta.** Daba el «404 Not Found» pelado de
Apache, en Times New Roman. El motivo: **encender `RewriteEngine` en una carpeta hace que
mod_rewrite deje de heredar las reglas de la de arriba**, y el panel tiene su propio `.htaccess`
para forzar https. Se repite la regla allí en vez de heredarla con `RewriteOptions
InheritDownBefore`, que también valdría: heredar metería las reglas de arriba en la única carpeta
del sitio que pide contraseña, y esa carpeta se toca lo justo.

**`estado-EJEMPLO.json` deja de servirse por HTTP.** Sigue subiendo con la carta —es la semilla
que se renombra a mano la primera vez que se instala, y por eso no se puede quitar del build—
pero un fichero de instalación no tiene por qué poder leerse desde fuera. `Require all denied`
en el `.htaccess`; en el disco sigue estando para quien entre por FTP.

**Y el que no tiene arreglo: el error rojo de consola cuando `estado.json` devuelve 500.**
Comprobado de quién es: el mensaje aparece con la URL del recurso como origen, no con una línea
de JavaScript. Lo escribe el navegador al fallar la petición, y una promesa atendida con `catch`
no lo calla. No hay nada que arreglar en la página: es el navegador contando un fallo real del
servidor, en un escenario que sólo ocurre si el alojamiento se rompe. Queda escrito aquí para que
nadie vuelva a intentarlo.

---

## Identificadores permanentes en la carta, el panel y el estado (31 Aug 2026)

La identidad de un plato era la cadena «categoría :: nombre»: renombrarlo le quitaba su foto,
su precio y su agotado sin un solo aviso. Ahora la identidad es el `dishId` de `carta.json`
(y `categoryId` para las categorías), y todo lo demás cuelga de ella.

**Cómo viaja.** Cada fila lleva `data-key` (dishId), `data-catid`, y —sólo mientras dure la
compatibilidad— `data-legacy` con la clave vieja y `data-cat` con el nombre de categoría.
`platos.json` lleva `key` (dishId), `legacy` y `catId`: ese fichero es también **el mapa
verificable clave vieja → ID**, y no es público (el `.htaccess` de admin/ deniega los .json).
El contador de consultas pasa a `sha1(dishId)`; las líneas históricas se resuelven por el hash
de la clave vieja y `vista.php` acepta ambos durante la compatibilidad.

**La migración del estado es EXPLÍCITA, nunca silenciosa.** El panel detecta un estado de la
época 1, enseña la vista previa (renombres, consolidaciones, desconocidas, heredados), guarda
copia, pide confirmación, migra y verifica releyendo. Hasta que una persona confirme, **el
fichero conserva su época**: un guardado normal del panel convierte todo de vuelta a claves
viejas al escribir. Restaurar `anterior.json` deshace la migración entera, y una copia antigua
restaurada se detecta como época 1 y vuelve a ofrecer la migración.

**Colisiones: se bloquea todo y no se pierde nada.** Si la clave vieja y su dishId conviven
con valores IDÉNTICOS, se consolidan sin conflicto. Con valores DISTINTOS, la migración se
niega a existir **y los guardados quedan bloqueados** —elegir un valor a ciegas perdería el
otro—. El panel enseña las colisiones en rojo; se resuelven a mano y todo se desbloquea solo.
Probado con `guardar_estado` de verdad: con la colisión viva devuelve false y el fichero queda
intacto byte a byte.

**Alias de compatibilidad al guardar en esquema 2.** Cada entrada dishId se escribe con su
gemela de clave vieja al lado (mismo valor), y las ofertas llevan id y nombre. Es lo que hace
que las cuatro combinaciones funcionen igual — probadas las cuatro, fila a fila:

| | estado viejo | estado nuevo |
|---|---|---|
| **HTML viejo** (caché) | ✓ base | ✓ por los alias |
| **HTML nuevo** | ✓ por data-legacy | ✓ por dishId |

Y el panel viejo (despliegue parcial) ve todo por los alias; su guardado deja un esquema 1
limpio y re-migrable, sin perder valores. Un `platos.json` viejo con panel nuevo degrada a
mapas vacíos: las claves viejas se reconocen y nada se pierde.

**`hidden` es un campo HEREDADO, no un conflicto.** Resto del escaparate antiguo, sin lector
ni escritor (verificado). Viaja intacto, se enseña como heredado, no bloquea nada. Su limpieza
será otra decisión explícita.

### Caducidad de la compatibilidad — condiciones, y son CONJUNTAS

`data-legacy`, `data-cat`, los alias del estado y la doble validación de `vista.php` se
retiran sólo cuando se cumpla TODO esto a la vez:

1. Producción lleva **al menos 30 días** con el estado en esquema 2.
2. Se han desplegado **al menos dos versiones** posteriores a la migración.
3. El `estado.json` real está **confirmado** como esquema 2 (visto, no supuesto).
4. Las copias antiguas de `admin/copias/` **se restauran y re-migran** correctamente.

La retirada será **otra migración explícita**, con su copia y sus pruebas. Nada de esto caduca
solo por fecha: una carta cacheada no sabe qué día es.

### gen.mjs es CRLF, y es la excepción documentada

Medido: todo el proyecto es LF salvo `gen.mjs`, CRLF desde su origen y así guardado en el
historial. No se normaliza a propósito —serían miles de líneas de diff mecánico tapando los
cambios de verdad—. `.gitattributes` declara `whitespace=cr-at-eol` para que `git diff
--check` señale los espacios colgantes reales sin acusar al retorno de carro; comprobado
empíricamente que un espacio real sigue saltando.
