# Getting You Hungry — clone spec

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
.shape1  position absolute; top 40px; left 40px;  img 137x158; class float-bob-x
.shape2  position absolute; top 73px; right 20px; img 125x106; class float-bob-y
.shape3  position absolute; bottom 0; right 0;    img 131x172; class float-bob-y
  all three: `d-none d-xl-block` -> hidden below 1200px
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
1440px: 2 columns, shapes visible, card padding 120px 0, tab padding 0 120px
768px : 1 column (col-lg-6 stacks at <992px), shapes hidden, card padding 80px 0, tab padding 0 50px
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
