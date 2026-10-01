# LUCIA

**A table between the sea and the city.**

A complete identity and menu project for a fictional Modern Mediterranean restaurant in Porto Selva:
a five-page editorial website with a full interactive menu, and a twelve-page A4 print menu generated
from the same data. Static files, no build step, no backend.

LUCIA does not exist. The address, telephone number, email, staff and wine labels are invented for
portfolio purposes, and the site and PDF both say so plainly.

---

## What's in it

```
index.html          Homepage — hero, signature dishes (rendered from data), the room, wine, visit
menu.html           The full menu, rendered from data.js at runtime
about.html           Our Table — the story, the seasons, hospitality
table.html           The Table — cinematic gallery with lightbox
wine.html            The wine list — expandable rows, tasting notes
visit.html            Hours, hand-drawn map, reservation form (validated, see below)

assets/css/lucia.css     The design system — tokens, light/dark theme, type, motion, components
assets/js/data.js        MENU, WINE, RESTAURANT, STORY, and LUCIA_FACTS — the single source of truth
assets/js/images.js      Photograph manifest — id, alt text, credit, plus the USE_LOCAL switch
assets/js/app.js         Rendering, motion, modals, gallery, filters, reservation, theme toggle

tools/build_pdf.py       Generates the PDF from assets/js/data.js, and refuses to write one that
                          has drifted out of sync with it (see "Keeping things in sync" below)
tools/qa.mjs             Automated checks — run before you consider a change finished
tools/fetch-images.sh    Downloads the photographs locally for offline serving
menu/LUCIA-Menu.pdf      The print menu — 12 pages, A4 portrait
IMAGE_SOURCES.md         Every photograph, photographer, source URL and license
```

## One source of truth

Everything the site or the PDF says about the restaurant — every dish, price, wine, opening hour,
reservation rule, and every number the copy says out loud ("eleven courses", "nineteen bottles") —
comes from `assets/js/data.js`. Nothing is typed a second time anywhere else:

- **Counts.** `LUCIA_FACTS` at the bottom of `data.js` computes course count, dish count, wine count
  and the list of featured dishes from `MENU`/`WINE` themselves. The menu page marquee, the wine
  page's "nineteen bottles", and the homepage wine teaser all read `LUCIA_FACTS` at render time
  (`applyFacts()` in `app.js`) rather than containing a written-out number. This project previously
  shipped with those numbers hard-coded and wrong ("Twelve courses · Forty-one dishes" when the data
  actually had eleven courses and sixty-three dishes) — that class of bug is what this exists to
  prevent.
- **Homepage signature dishes.** Rendered by `renderSignatures()` from whichever menu items carry
  `featured: true`, not duplicated as a second hand-written block of HTML. Change a name, price or
  photo on a featured dish in `data.js` and the homepage follows on its own.
- **Reservation rules.** Closed weekdays, the bookable time slots, the maximum party size for an
  online request, and the "write to us instead" policy for larger groups all live in
  `RESTAURANT.reservation`. The form builds its own date and time options from that object and
  enforces it — it doesn't re-encode the rule.
- **Hours and contact details.** `RESTAURANT.hours`, `.phone`, `.phoneHref` and `.email` are read by
  the footer, the reservation copy and the PDF alike.

`tools/qa.mjs` (see below) checks that this stays true — it fails the build if it finds a hard-coded
count anywhere that doesn't match what `data.js` actually contains.

## Dietary marks vs. allergens

`DIETARY_LEGEND` (V / VG / GF / DF / SP) describes how a dish is cooked, and a dietary key is only
applied when it's true of the dish exactly as served. The cheese course is the reason this note
exists: the cheeses are gluten free on their own, but the course is served with bread, so the items
no longer carry a `GF` tag — the course instead carries a plain note explaining that the cheese itself
is gluten free and it can be asked for without the bread. Marking the whole plate `GF` while serving
bread with it would have been a false and unsafe claim.

`ALLERGEN_LEGEND` is a separate, more detailed list (gluten, milk, eggs, fish, shellfish, tree nuts,
peanuts, sesame, sulphites) that exists as a data model but is deliberately **not populated per dish**
— this project has no verified allergen data for a fictional kitchen, and inventing it would be
unsafe. If this were a real menu, allergens would be filled in per item using exactly this field, with
no rendering changes required. Until then, both the site and the PDF point guests to the general
allergy notice instead of implying any dish is guaranteed free of something nobody has actually
checked.

## The reservation form

The form on `visit.html` is a static, client-side demo — nothing is ever sent, stored or booked
anywhere, and the confirmation screen says so in plain language rather than implying a real request
was received. Within that, it behaves like a real form:

- Required fields (date, time, name, email) are validated on submit, with inline error text tied to
  each field via `aria-describedby`, and `aria-invalid` set on the field itself.
- Monday can't be booked. The date input's default value skips forward past Monday automatically, and
  choosing Monday by hand is caught on change with an inline error — both directions read
  `RESTAURANT.reservation.closedWeekdays`, so if the restaurant's closed day ever changed in the data,
  this would change with it.
- Bookable times are generated from `RESTAURANT.reservation.lunchTimes` / `.dinnerTimes`, not
  hand-typed into the `<select>`.
- Guests are real chips 1 through `maxPartySize` (5), plus a distinct "6+" option that does **not**
  submit as a party size — choosing it disables the submit button and shows the site's own stated
  policy ("write to us instead") with a phone and email link, matching what the Visit page already
  says about large parties.
- Guest count is a genuine form field (a hidden input kept in sync with the chip selection), so it's
  actually present in the submitted `FormData` — previously it only existed as a JS variable.
- The confirmation panel writes every value with `textContent`, never `innerHTML`, so nothing typed
  into the form can be interpreted as markup.

## Light / dark mode

A theme toggle sits in the nav (and in the mobile drawer, since the nav's own copy is hidden under
900px). It defaults to the visitor's OS preference, can be switched either way, and is remembered
across visits via `localStorage`.

The toggle swaps the site's *reading surface* — background, ink, rules — between a warm ivory paper
and a dark charcoal one. It deliberately does **not** touch the sections that are dark by brand design
regardless of theme: the hero, the footer, the mobile drawer, the wine pages, the lightbox, and the
dark editorial sections. Those already read as a considered dark passage in the layout in either mode,
the way a printed piece might use a black page on purpose — inverting them with the visitor's OS
setting would undermine the design rather than serve it. They're pinned to fixed `--cream`/`--charcoal`
constants in the CSS so they hold steady while the rest of the page moves around them.

## Nav behaviour

The nav hides while you scroll down to read and reappears the moment you scroll back up, rather than
staying pinned on screen throughout. Earlier it reappeared on every scroll *pause*, not just on
scrolling up, which made it feel like it never actually left — that's fixed.

## Keeping things in sync

Two tools exist specifically to stop this project from quietly drifting the way it had before:

- **`tools/build_pdf.py`** tracks, as it lays out every page, which courses, which individual dishes
  and which wines actually got drawn. At the end of the build it compares that against every course,
  dish and wine `data.js` actually defines, and **refuses to write the PDF** if anything is missing —
  so adding a twelfth course to the menu and forgetting to add its page to the PDF script is now a
  build failure, not a silent gap in the printed menu.
- **`tools/qa.mjs`** is a small, dependency-free check you can run any time (see below). It verifies
  the shape of `data.js` (required fields, valid dietary/allergen keys, no duplicate ids), scans every
  HTML/CSS/JS file for a hard-coded count that contradicts `LUCIA_FACTS`, checks that every internal
  link and every `menu.html#section` fragment actually resolves, checks the image manifest, and runs
  `build_pdf.py` to confirm the PDF itself is in sync.

## Photography

Real photographs from Pexels, under the Pexels License. No AI food images. The site loads them from
the Pexels image CDN with responsive `srcset` widths and lazy loading below the fold; the hero is
preloaded. Run `tools/fetch-images.sh` and set `USE_LOCAL = true` in `assets/js/images.js` to serve
them yourself instead — the script downloads every photograph in the manifest into `assets/img/`.
Credits, licenses and source links for all 33 photographs are in `IMAGE_SOURCES.md`. If an image fails
to load for any reason, `guardImages()` in `app.js` replaces it with a designed tonal plate rather than
a broken-image icon.

## The print menu

Twelve pages, A4 portrait, drawn with reportlab rather than printed from the browser. A measured
layout engine chooses the tightest type setting that fits each page and distributes the remaining
space across the gaps, so short pages still read as composed. Text is live and selectable; margins,
running heads, folios and prices are consistent throughout and come from the same `data.js` the
website reads. See "Keeping things in sync" above for how the build guards against a section quietly
going missing.

## Motion and accessibility

Parallax, Ken Burns, masked reveals and hover zoom are all gated behind
`prefers-reduced-motion: no-preference`; with reduced motion on, everything resolves to its final
state with no movement. The dish modal, the mobile drawer and the photo lightbox all trap focus while
open, return focus to whatever opened them on close, close on Escape, and are marked `aria-hidden`
while closed rather than only being hidden visually. The wine accordion reflects its own open/closed
state via `aria-expanded` on the button and `aria-hidden` on the panel. Deep links like
`menu.html#desserts` or a shared link into a specific wine section scroll to the right place even
though the target section is built by JavaScript after the page loads, which the browser's own
same-page anchor handling can't do on its own.

This was reasoned through by reading the CSS and JS rather than click-tested in a live browser (this
project was built in a sandboxed environment with no browser available) — see "Limitations" below.

---

## RUN THE PROJECT

Static files, no build step. From the project folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (On Windows, if `python3` isn't recognized, try `py` or `python`
instead.)

Optional:

```bash
bash tools/fetch-images.sh     # download the photographs locally (then set USE_LOCAL = true)
python3 tools/build_pdf.py     # regenerate menu/LUCIA-Menu.pdf after editing data.js
node tools/qa.mjs              # run the automated checks — data shape, stale counts, links, PDF sync
```

## Limitations

- **No live browser testing.** Every fix in this pass — focus trapping, the reservation form,
  responsive behaviour at various widths, the theme toggle — was verified by reading the rendered
  HTML/CSS/JS carefully and, where possible, by running the underlying JavaScript logic directly in
  Node. None of it was clicked through in an actual browser, because this project was built in a
  sandboxed environment without one. It should be opened and exercised by hand before being called
  fully production-ready.
- **Allergen data is not populated.** See "Dietary marks vs. allergens" above — the field exists, the
  data doesn't, because inventing it would be unsafe.
- **`app.js` and `lucia.css` are large, single files** covering several distinct systems (chrome,
  menu rendering, gallery, reservation, wine, theme). They're organised with clearly labelled
  sections and kept dependency-light on purpose rather than split into a build-tooled module system,
  which felt like the wrong trade-off for a project this size — but a future pass could split them by
  concern if the project grows.
- **The PDF is typographic**, not photographic, by design — it has photo slots on the cover and on
  four section pages that populate automatically once `tools/fetch-images.sh` has been run, but ships
  without photography until then.
