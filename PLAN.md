# salzamt.vip — Implementation Plan and Work Packages

This document is the single source of truth for building out **salzamt.vip**. It is written so that
independent agents (or people) can each implement one work package (WP) without talking to each
other. Read sections 1–4 completely before starting any WP; they define the rules and the shared
contracts every package must follow. Then implement only your WP (section 5) and its acceptance
checks. All visible copy is provided in section 6 — use it verbatim (small wording polish is fine,
inventing different content is not).

---

## 1. Project brief

**What it is.** A satirical website for the "Salzamt". In Vienna, "Geh, beschwer di beim Salzamt!"
means "complain all you want, nobody will help you": the Salzamt is the office that exists to
accept complaints and do nothing with them. The site plays this completely straight, in the style
of a K.u.K. (kaiserlich und königlich, Austro-Hungarian) government office: parchment, burgundy,
gold, black Fraktur, stamps, forms, Aktenzeichen, and unfailingly polite Amtsdeutsch.

**Existing state.** GitHub Pages site, custom domain `salzamt.vip` (file `CNAME`). One page
(`index.html`) shows `salzamt_poster.png` full screen. Six artworks exist (originally at the repo
root, since moved to `originals/` together with the staff portrait sources):

| File                       | Size      | Content                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `salzamt_poster.png`       | 1240×1748 | Poster: "Salzamt", double eagle with salt-barrel shield, banner "Mit vorzüglicher Hochachtung, und ohne jede Absicht zu helfen.", "Seit 1848 folgenlos.", footer strip "Eingelangt · Geprüft · Nicht zuständig · Abgelegt · Eingesalzen"                                                                                         |
| `salzamt_circle.png`       | 1254×1254 | Round badge on white: crowned double eagle, "Salzamt", "Wünsche und Beschwerden aller Art", salt mine cart "Glück auf"                                                                                                                                                                                                           |
| `salzamt.png`              | 1254×1254 | Same badge as an oval with burgundy border                                                                                                                                                                                                                                                                                       |
| `salzamt_stamp.png`        | 1120×1320 | Postage stamp "ÖSTERREICH … 10 HELLER" with the round badge                                                                                                                                                                                                                                                                      |
| `Salzbug_Postkarte_A6.png` | 1536×1090 | Postkarte Nr. 1 „Salzamt an der Salzach": sunset view of Salzburg with the Festung Hohensalzburg, the Salzach and the Salzamt building on the riverbank, a 10-Kreuzer stamp top right, footer strip "Eingelangt · Geprüft · Nicht zuständig · Abgelegt · Eingesalzen" (the file name's typo "Salzbug" is the real name; keep it) |
| `Wappen-Postkarte-A6.png`  | 1240×1748 | Postkarte Nr. 2 „Doppeladler"; byte-identical to `salzamt_poster.png`                                                                                                                                                                                                                                                            |

**Target state.** Five pages sharing one design system:

1. `index.html` — full landing page.
2. `beschwerde.html` — an absurdly bureaucratic complaint form; on submit the complaint is visibly
   crumpled and thrown into a trash can, then a mock "Eingangsbestätigung" is shown. Nothing is
   sent anywhere.
3. `shop.html` — the "Amtsshop": two postcards, a Salzstreuer and other merchandise at ridiculous
   prices.
4. `kassa.html` — cart and checkout: no payment fields; instead detailed instructions to mail cash
   in small euro notes and coins to a fictitious Salzamt address, with delivery in exactly
   3 years and 4 months.
5. `team.html` — the three Bedienstete with circular photos and invented titles.

**Tone.** Dry, formal, ceremonious. The humour comes from taking bureaucracy seriously, never from
sarcasm or winking at the reader. Every paragraph should read as if a real official wrote it.

---

## 2. Ground rules (apply to every WP)

### 2.1 Technology

- Pure static site for GitHub Pages: **HTML5, CSS3, vanilla JavaScript**. No build step, no
  bundler, no package.json at runtime, no frameworks, no jQuery, no CSS preprocessors, no TypeScript.
- JavaScript: classic `<script>` files (not ES modules), ES2018 syntax, wrapped in an IIFE.
  Shared code lives on the `window.Salzamt` namespace (section 4.5). No inline `onclick=` handlers.
- CSS: custom properties, Grid, Flexbox, `clamp()`. Mobile-first. One committed look (parchment),
  **no dark mode**. Respect `prefers-reduced-motion`.
- No backend, no analytics, no cookies, no third-party requests of any kind. The three web fonts
  (UnifrakturCook, EB Garamond, Special Elite; OFL / Apache licensed) are self-hosted as woff2 files
  in `assets/fonts/` and declared with `@font-face` in `assets/style.css`, so pages need no font
  `<link>`. All user input stays in the browser (`localStorage`, section 4.6). Complaint texts are
  never stored anywhere, not even in `localStorage`.
- Node is used only as a development tool (image generation and QA with Playwright); it must never
  be needed to serve the site.
- Browser support: current evergreen browsers (last two versions of Chrome, Firefox, Safari, Edge),
  iOS Safari. No Internet Explorer.

### 2.2 Languages and naming

- **All visible text is German with Austrian vocabulary and formatting**: Jänner (not Januar),
  Kassa, Häferl, Parteienverkehr, Erlagschein, Stiege, Kronland. Dates `05.09.2026` or
  `5. Jänner 2030`; money `€ 1.848,00` (thin: "€ " then number, dot thousands, comma decimals).
  Use „…" style quotes in copy where quotes appear. `<html lang="de-AT">`.
- **Code is English**: file comments, JS identifiers, CSS class names, IDs, data attributes, commit
  messages. Page file names stay German because they are URLs (`beschwerde.html`, `kassa.html`).
- CSS naming: BEM-ish kebab-case (`.site-header__inner`, `.btn--gold`). Page-specific classes are
  prefixed with the page: `.home-…`, `.complaint-…`, `.shop-…`, `.checkout-…`, `.team-…`.
- Form field `name`/`id` attributes: English kebab-case (`family-name`, `complaint-category`).

### 2.3 Accessibility and quality

- Semantic HTML (`header`, `nav`, `main`, `section`, `footer`, `fieldset`/`legend` for form groups).
- Every form control has a `<label>`; every image has meaningful German `alt` text; decorative
  images use `alt=""`.
- Visible focus styles; the dialog is a native `<dialog>` opened with `showModal()`; keyboard
  operable throughout.
- Heading order without gaps (one `h1` per page).
- Images: explicit `width`/`height` attributes, `loading="lazy"` below the fold. Each derived image
  under ~200 KB (postcard/poster originals may be bigger but are never used in page markup).
- Format HTML/CSS/JS with Prettier defaults (`prettier --write`), 2-space indent, LF line endings,
  UTF-8.

### 2.4 Git workflow

- Base branch for this project: `claude/salzamt-vip-expansion-eltsk0` (already exists on origin).
- **WP0 lands directly on that branch first.** WP1–WP4 each work on their own branch created from
  it once WP0 is pushed (`claude/salzamt-wp1-home`, `…-wp2-complaint`, `…-wp3-shop`, `…-wp4-team`)
  and are merged back into the base branch (fast-forward or merge commit; no rebasing of shared
  history). WP5 runs on the base branch after all merges.
- When one orchestrator runs WP1–WP4 as parallel subagents in a single checkout (how the first
  build was done), the per-WP branches are skipped: the subagents only write their own files and
  never run git, and the orchestrator commits each WP separately on the base branch.
- Each WP touches **only the files it owns** (listed per WP). Never edit `assets/style.css` or
  `assets/site.js` outside WP0; if you need something shared that is missing, add it to your own
  page CSS/JS with your page prefix and note it in your final report.
- Commit messages: imperative English, prefixed with the WP, e.g. `WP2: add complaint form and trash animation`.
  Push with `git push -u origin <branch>`. Do not open pull requests unless asked.
- Do not touch `CNAME` or the source files in `originals/`.

### 2.5 Things that are out of scope

- No real personal data collection, no email sending, no real payment processing, no real address.
- No cookie banner, no Impressum with real data, no legal text beyond the jokes in the copy.
- No CMS, no i18n, no English version.

---

## 3. Target repository layout

```
CNAME
index.html                      WP1
beschwerde.html                 WP2
shop.html                       WP3
kassa.html                      WP3
team.html                       WP4
README.md                       WP0 (WP5 may extend)
PLAN.md                         this document
assets/
  style.css                     WP0  shared design system
  site.js                       WP0  shared runtime (window.Salzamt)
  home.css                      WP1
  home.js                       WP1
  complaint.css                 WP2
  complaint.js                  WP2
  shop.css                      WP3  (used by shop.html and kassa.html)
  shop.js                       WP3  (catalogue + cart rendering)
  checkout.js                   WP3  (kassa.html only)
  team.css                      WP4
  img/                          WP0 generates; user adds photos (see 4.7)
  fonts/                        WP0  self-hosted woff2 files and their licenses
tools/
  resize-images.js              WP0  Playwright script that generates assets/img/* (appendix A)
  qa.js                         WP5  Playwright smoke test (appendix B)
originals/                      source artworks and staff portraits (photo + sketch per person);
                                never referenced by pages, only by tools/resize-images.js
```

---

## 4. Shared contracts

Everything in this section is **normative**. WP0 implements it; WP1–WP4 rely on it exactly as
written. If WP0 has to deviate, it must update this section in the same commit.

### 4.1 Page skeleton (copy verbatim, adjust only title/description/body class/page scripts)

```html
<!DOCTYPE html>
<html lang="de-AT">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PAGE TITLE · Salzamt</title>
    <meta name="description" content="PAGE DESCRIPTION" />
    <meta property="og:title" content="PAGE TITLE · Salzamt" />
    <meta property="og:description" content="PAGE DESCRIPTION" />
    <meta
      property="og:image"
      content="https://salzamt.vip/assets/img/oval-600.jpg"
    />
    <link rel="icon" href="assets/img/badge-96.png" type="image/png" />
    <link rel="stylesheet" href="assets/style.css" />
    <link rel="stylesheet" href="assets/PAGE.css" />
  </head>
  <body class="page-PAGE">
    <!-- header (4.2) -->
    <main id="main">…</main>
    <!-- footer (4.3) -->
    <script src="assets/site.js"></script>
    <script src="assets/PAGE.js"></script>
  </body>
</html>
```

Body classes: `page-home`, `page-complaint`, `page-shop`, `page-checkout`, `page-team`.

### 4.2 Header (identical on every page)

```html
<a class="skip-link" href="#main">Zum Inhalt</a>
<header class="site-header">
  <div class="container site-header__inner">
    <a class="brand" href="index.html">
      <img
        src="assets/img/badge-96.png"
        width="48"
        height="48"
        alt="Amtssiegel des Salzamtes"
      />
      <span class="brand__text">
        <span class="brand__wordmark">Salzamt</span>
        <span class="brand__sub">Wünsche und Beschwerden aller Art</span>
      </span>
    </a>
    <button
      class="nav-toggle"
      type="button"
      aria-expanded="false"
      aria-controls="main-nav"
    >
      Menü
    </button>
    <nav id="main-nav" class="main-nav" aria-label="Hauptnavigation">
      <ul>
        <li><a href="index.html">Startseite</a></li>
        <li><a href="beschwerde.html">Beschwerde einreichen</a></li>
        <li><a href="shop.html">Amtsshop</a></li>
        <li><a href="team.html">Bedienstete</a></li>
        <li>
          <a href="kassa.html" class="cart-link"
            >Warenkorb <span class="cart-badge" data-cart-count>0</span></a
          >
        </li>
      </ul>
    </nav>
  </div>
</header>
```

`site.js` sets `aria-current="page"` on the matching link and wires the toggle (section 4.5).

### 4.3 Footer (identical on every page)

```html
<footer class="site-footer">
  <div class="container">
    <p class="site-footer__motto">
      Mit vorzüglicher Hochachtung, und ohne jede Absicht zu helfen.
    </p>
    <p class="site-footer__line">
      K.k. Salzamt · Wünsche und Beschwerden aller Art · Seit 1848 folgenlos.
    </p>
    <p class="site-footer__small">
      Für den Inhalt nicht verantwortlich: das Salzamt. Diese Seite speichert
      nichts, sendet nichts und hilft niemandem. Ihre Eingaben verbleiben
      ausschließlich in Ihrem Browser.
    </p>
  </div>
</footer>
```

### 4.4 Design system (`assets/style.css`)

**Tokens** (on `:root`):

```
--parchment: #f4e9d3;   --parchment-2: #e9dbbb;   --parchment-3: #d9c59c;
--salt: #fbf7ee;        --ink: #1c1712;           --ink-2: #4a3f33;
--burgundy: #6e1a1a;    --burgundy-2: #4b0f0f;    --gold: #b8892f;   --gold-2: #dcbd68;
--font-display: "UnifrakturCook", "Old English Text MT", serif;
--font-body: "EB Garamond", Garamond, "Times New Roman", serif;
--font-type: "Special Elite", "Courier New", Courier, monospace;
--container: 1120px;
```

Body: parchment background with a subtle noise texture (inline SVG `feTurbulence` data URI at
~8 % opacity) and a faint light radial gradient at the top; body text in `--font-body` at 18px/1.55.
Headings (`h1`–`h3`) in `--font-display`, `--ink`; `h1` = `clamp(2.6rem, 7vw, 4.5rem)`.

**Class catalogue** WP0 must provide (WP1–WP4 may rely on all of them):

| Class                                                                                                                                                                                    | Purpose                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.container`                                                                                                                                                                             | max-width `--container`, horizontal padding 1rem, centred                                                                                                                                        |
| `.section`, `.section--tight`                                                                                                                                                            | vertical padding 3.5rem / 1.5rem                                                                                                                                                                 |
| `.grid`, `.grid--2`, `.grid--3`, `.grid--4`                                                                                                                                              | responsive grids (collapse to 1 column ≤ 640px, `--4` to 2 columns ≤ 900px)                                                                                                                      |
| `.stack`                                                                                                                                                                                 | vertical flex with 1rem gap                                                                                                                                                                      |
| `.text-center`, `.visually-hidden`, `.no-print`, `.skip-link`                                                                                                                            | utilities                                                                                                                                                                                        |
| `.eyebrow`                                                                                                                                                                               | typewriter font, 0.75rem, letter-spacing .2em, uppercase, burgundy                                                                                                                               |
| `.lead`                                                                                                                                                                                  | 1.25rem body text, `--ink-2`                                                                                                                                                                     |
| `.typewriter`                                                                                                                                                                            | `--font-type`                                                                                                                                                                                    |
| `.ornament-rule`                                                                                                                                                                         | centred divider: thin gold lines with ❦ in the middle                                                                                                                                            |
| `.btn`                                                                                                                                                                                   | burgundy button: uppercase body font 600, 0.8rem 1.6rem padding, 2px `--gold-2` border plus outer rings via `box-shadow: 0 0 0 3px var(--burgundy), 0 0 0 4px var(--gold)`; hover `--burgundy-2` |
| `.btn--gold`, `.btn--ghost`, `.btn--lg`, `.btn--block`                                                                                                                                   | gold variant, outline variant, large, full width                                                                                                                                                 |
| `.frame`                                                                                                                                                                                 | parchment box with 1px gold border and `outline: 3px double var(--gold); outline-offset: 5px`; gold ✠ ornaments in top-left and bottom-right corners via pseudo-elements                         |
| `.card`, `.card__media`, `.card__body`, `.card__title`                                                                                                                                   | salt-white card, 1px gold border, soft shadow                                                                                                                                                    |
| `.stamp`, `.stamp--big`, `.stamp--gold`                                                                                                                                                  | rotated (-6deg) uppercase typewriter text with 3px double burgundy border, `mix-blend-mode: multiply`; `--big` is 2.4rem with 5px border                                                         |
| `.badge-tag`                                                                                                                                                                             | small burgundy label (e.g. "Amtlich", "Neu")                                                                                                                                                     |
| `.akte`                                                                                                                                                                                  | typewriter "document" block: salt background, dashed gold border, `white-space: pre-line` friendly                                                                                               |
| `.circle-photo`, `.circle-photo--lg`                                                                                                                                                     | 160px / 220px circle, `object-fit: cover`, 4px `--gold-2` border, outer 3px burgundy ring via box-shadow                                                                                         |
| `.photo-missing`                                                                                                                                                                         | circle in `--parchment-2` with centred typewriter text (used by the image fallback, 4.5)                                                                                                         |
| `.amtsweg`                                                                                                                                                                               | 5-step process list (`ol`): numbered burgundy circles connected by a gold line; `li.is-done` shows ✓ on burgundy; each `li` contains `<strong>` title and `<span>` one-liner                     |
| `.table`, `.table td.num`                                                                                                                                                                | bordered table with gold hairlines; `.num` right-aligned typewriter                                                                                                                              |
| `.notice`, `.notice--error`, `.notice--success`                                                                                                                                          | bordered info boxes                                                                                                                                                                              |
| `.toast`                                                                                                                                                                                 | fixed bottom-centre message, shown by adding `.is-visible`                                                                                                                                       |
| Form: `.form-section`, `.form-section__title`, `.field`, `.field__label`, `.field__hint`, `.field--required`, `.field--error`, `.check`, `.check-group`, `.radio-group`, `.form-actions` | see below                                                                                                                                                                                        |
| `dialog.dialog`, `.dialog__title`, `.dialog__actions`                                                                                                                                    | native dialog styled as a frame; `::backdrop` dark parchment                                                                                                                                     |
| `.site-header…`, `.brand…`, `.nav-toggle`, `.main-nav`, `.cart-link`, `.cart-badge`, `.site-footer…`                                                                                     | header/footer from 4.2/4.3                                                                                                                                                                       |

Form styling: labels in typewriter font, uppercase, 0.78rem, `--ink-2`; inputs/selects/textareas
full width, body font 1.05rem, `#fffdf7` background, 1px `--ink-2` border, no border radius; focus
= 2px gold outline; `.field--required .field__label::after` adds " \*" in burgundy;
`.field--error` gives the control a burgundy border and shows `.field__hint` in burgundy.
`.form-section__title` is a burgundy bar with salt text in typewriter font ("Abschnitt A – …").

Header: sticky, translucent salt background with `backdrop-filter: blur(6px)`, bottom border
`3px double var(--gold)`. Nav links in small caps with burgundy underline on hover/current.
`.cart-badge` is a small burgundy circle; hidden (`display:none`) when its text is `0`.
Below 760px the nav collapses; `.nav-toggle` is shown and toggles `.main-nav.is-open`.
`.brand__sub` is hidden below 600px.

Print: `@media print` hides header, footer, `.no-print`; white background; black text.
Reduced motion: `@media (prefers-reduced-motion: reduce)` sets all animation/transition durations
to 1ms.

### 4.5 Shared runtime (`assets/site.js`, namespace `window.Salzamt`)

```js
Salzamt.BASE_COMPLAINTS; // 3412876
Salzamt.STORAGE_KEYS; // { cart: "salzamt_warenkorb", complaints: "salzamt_beschwerden_lokal" }
Salzamt.MONTHS; // ["Jänner","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]

Salzamt.formatNumber(n, decimals); // 1848.5, 2 -> "1.848,50"; 3412876, 0 -> "3.412.876"  (manual formatting, no Intl)
Salzamt.formatEuro(cents); // 184880 -> "€ 1.848,80"
Salzamt.formatDateLong(date); // -> "5. Jänner 2030"
Salzamt.formatDateShort(date); // -> "05.09.2026"
Salzamt.formatTime(date); // -> "14:07 Uhr"
Salzamt.addYearsMonths(date, y, m); // new Date; day clamped to the target month's last day (31.10.2026 + 3y4m -> 28.02.2030)
Salzamt.newCaseNumber(); // "SA-2026/094.117-II/3-NB"  (year, 3 digits, ".", 3 digits)
Salzamt.newOrderNumber(); // "B-2026-NB-048115"          (year, 6 digits)

Salzamt.getCart(); // { [productId]: qty }   (safe: returns {} on any storage error)
Salzamt.setCartQty(id, qty); // qty <= 0 removes the line; persists; updates badge
Salzamt.addToCart(id, (qty = 1));
Salzamt.clearCart();
Salzamt.cartCount(); // sum of quantities
Salzamt.updateCartBadge(); // writes cartCount() into every [data-cart-count]

Salzamt.complaintsLocal(); // complaints submitted in this browser
Salzamt.registerComplaint(); // increments and returns the new local count
Salzamt.complaintsTotal(); // BASE_COMPLAINTS + complaintsLocal()

Salzamt.countUp(el, target, ms); // animates el.textContent from 0 to target (formatNumber); instant under reduced motion
Salzamt.showToast(text, (ms = 2600)); // uses/creates a .toast element
```

On `DOMContentLoaded`, `site.js` runs: `initNav()` (sets `aria-current`, wires `.nav-toggle`),
`initImageFallbacks()`, `updateCartBadge()`.

**Image fallback contract.** Any `<img data-fallback="…">`:

- if the value is a path, on `error` the `src` is replaced by that path (once);
- if the value is `lichtbild`, the `<img>` is replaced by
  `<div class="circle-photo photo-missing" role="img" aria-label="ALT"><span>Lichtbild<br>in Bearbeitung</span></div>`
  (keeps the img's other classes, e.g. `circle-photo--lg`).
- `initImageFallbacks()` must also handle images that already failed before the script ran
  (`img.complete && img.naturalWidth === 0`).

All `localStorage` access is wrapped in try/catch; the site must work with storage disabled
(cart simply empty, counters at base values).

### 4.6 Storage keys

| Key                         | Value                                         | Written by                            |
| --------------------------- | --------------------------------------------- | ------------------------------------- |
| `salzamt_warenkorb`         | JSON `{ "salzstreuer": 1, "postkarte-1": 2 }` | WP3 via `Salzamt` cart API            |
| `salzamt_beschwerden_lokal` | integer                                       | WP2 via `Salzamt.registerComplaint()` |

Nothing else is stored. Complaint form contents are never persisted.

### 4.7 Images (`assets/img/`)

Generated by WP0 with `tools/resize-images.js` (appendix A) from the originals:

| File              | From                       | Size                | Notes                                                        |
| ----------------- | -------------------------- | ------------------- | ------------------------------------------------------------ |
| `poster-900.jpg`  | `salzamt_poster.png`       | 900×1269            | landing hero                                                 |
| `poster-480.jpg`  | `salzamt_poster.png`       | 480×677             | teasers, shop                                                |
| `postkarte-1.jpg` | `Salzbug_Postkarte_A6.png` | 900 wide, landscape | Postkarte Nr. 1 „Salzamt an der Salzach"                     |
| `postkarte-2.jpg` | `Wappen-Postkarte-A6.png`  | 700×987             | Postkarte Nr. 2 „Doppeladler" (byte-identical to the poster) |
| `badge-320.png`   | `salzamt_circle.png`       | 320×320             | circular crop, transparent corners                           |
| `badge-96.png`    | `salzamt_circle.png`       | 96×96               | header, favicon                                              |
| `stamp-600.jpg`   | `salzamt_stamp.png`        | 600×707             | shop item                                                    |
| `oval-600.jpg`    | `salzamt.png`              | 600×600             | og:image, postcard-1 fallback                                |

Staff portraits: the owner supplied a photo and an ink sketch per person, kept as
`originals/team-<slug>-photo.jpg` and `originals/team-<slug>-sketch.jpg`. The same script renders
the variant selected by its `TEAM_VARIANT` constant (currently `sketch`, which matches the site's
illustrated artwork) with a per-person face crop:

| File                                        | Size    | Fallback                                                                   |
| ------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `assets/img/team-martin-gattermeier.jpg`    | 440×440 | `data-fallback="lichtbild"`                                                |
| `assets/img/team-alexander-fellner.jpg`     | 440×440 | `data-fallback="lichtbild"`                                                |
| `assets/img/team-katharina-gattermeier.jpg` | 440×440 | `data-fallback="lichtbild"`                                                |
| `assets/img/team-irmgard-gattermeier.jpg`   | 440×440 | `data-fallback="lichtbild"` (source not supplied yet; the script skips it) |

The fallback contract stays in the markup so a missing file degrades to the "Lichtbild in
Bearbeitung" circle without code changes.

### 4.8 Cross-page links

| From                                                   | To                         |
| ------------------------------------------------------ | -------------------------- |
| Landing CTA "Beschwerde einreichen"                    | `beschwerde.html`          |
| Landing CTA "Zum Amtsshop" / shop teaser               | `shop.html`                |
| Landing team teaser                                    | `team.html`                |
| Complaint confirmation "Weitere Beschwerde einreichen" | `beschwerde.html` (reload) |
| Complaint confirmation "Zum Amtsshop"                  | `shop.html`                |
| Shop "Zur Kassa" / header cart                         | `kassa.html`               |
| Kassa empty state "Zum Amtsshop"                       | `shop.html`                |
| Order confirmation "Weiter einkaufen"                  | `shop.html`                |
| Team "Beschwerde einreichen"                           | `beschwerde.html`          |

---

## 5. Work packages

Dependency graph: **WP0 → (WP1 ‖ WP2 ‖ WP3 ‖ WP4) → WP5**.

Each WP ends with a short written report: files changed, deviations from this plan, anything the
owner still has to do.

### WP0 — Scaffolding and design system (must be first)

**Owns:** `assets/style.css`, `assets/site.js`, `assets/img/*` (generated), `tools/resize-images.js`,
`README.md`, and a temporary `index.html` update (see step 5) that WP1 will replace.

Steps:

1. Create `tools/resize-images.js` from appendix A and run it
   (`NODE_PATH=/opt/node22/lib/node_modules node tools/resize-images.js` in the Claude remote
   environment, where Playwright 1.56 and Chromium are preinstalled; elsewhere `npm i -g playwright`
   and `npx playwright install chromium`). Verify the eight files from 4.7 exist with the listed
   dimensions and are each < 200 KB (the two postcards may be up to 300 KB).
2. Write `assets/style.css` implementing section 4.4 completely, including the header/footer/nav,
   forms, dialog, print and reduced-motion rules. Test every component on a scratch HTML page
   (not committed) at 390px and 1280px widths.
3. Write `assets/site.js` implementing section 4.5 exactly (names, signatures, behaviour).
   Unit-check the formatters and `addYearsMonths` in Node (`node -e`), including:
   `formatEuro(184880) === "€ 1.848,80"`, `formatNumber(3412876,0) === "3.412.876"`,
   `formatDateLong(new Date(2030,0,5)) === "5. Jänner 2030"`,
   `addYearsMonths(new Date(2026,8,5),3,4)` → 5 Jan 2030, `addYearsMonths(new Date(2026,9,31),3,4)` → 28 Feb 2030.
4. Write `README.md` (German is fine, short): what the site is, how to preview locally
   (`npx http-server .` or `python3 -m http.server`), how to replace the placeholder images
   (exact filenames from 4.7), how to regenerate derived images.
5. Update `index.html` minimally so the site is never broken while WP1 works: use the page
   skeleton (4.1), header (4.2), footer (4.3), and a `main` containing only the poster
   (`poster-900.jpg`) plus the two CTA buttons. WP1 replaces this file entirely.
6. Prettier, commit (`WP0: add design system, shared runtime and image derivatives`), push to
   `claude/salzamt-vip-expansion-eltsk0`.

Acceptance: opening `index.html` through a local server shows header, poster, buttons, footer in
the parchment style; fonts load; the nav toggle works at 390px; `Salzamt` API exists in the
console; no console errors; `git status` clean after push.

### WP1 — Landing page (`index.html`)

**Owns:** `index.html`, `assets/home.css`, `assets/home.js`.

Structure of `<main>` (copy in 6.1):

1. **Hero** `.home-hero`: two columns on desktop (poster image `poster-900.jpg`, max 420px wide,
   in a `.frame`; text column with `.eyebrow`, `h1` "Salzamt", subtitle
   "Wünsche und Beschwerden aller Art" in display font, `.lead` "Seit 1848 folgenlos.", the intro
   paragraph, then buttons: `.btn.btn--lg` "Beschwerde einreichen" → `beschwerde.html` and
   `.btn.btn--ghost` "Zum Amtsshop" → `shop.html`). Stacks on mobile with the image first.
2. **Über das Amt** `.home-about`: two paragraphs in a `.frame`, with a `.stamp` "Amtlich
   bestätigt" rotated in the corner.
3. **Der Amtsweg** `.home-process`: `h2` + `ol.amtsweg` with the five steps and one-liners.
4. **Amtsstatistik** `.home-stats`: four `.card`s; the first number is
   `Salzamt.complaintsTotal()` animated with `Salzamt.countUp` when scrolled into view
   (`IntersectionObserver`); the others are static text.
5. **Parteienverkehr** `.home-hours`: a `.table` with the opening hours and the note.
6. **Aus dem Amtsshop** `.home-shop-teaser`: three `.card`s (Salzstreuer with an inline SVG icon,
   Postkarte Nr. 1 with `postkarte-1.jpg`, Stempel „Nicht zuständig" with an inline SVG
   icon), each with name, price and a link "Zum Amtsshop". Prices must match 6.3.
7. **Die Bediensteten** `.home-team-teaser`: three `.circle-photo` images (paths and fallbacks
   from 4.7) with names and short titles, link "Alle Bediensteten" → `team.html`.

`home.js`: only the stats count-up and observer. Everything else is static.

Acceptance: sections render in order at 390px and 1280px; the hero image is `poster-900.jpg`
(never the 3.5 MB original); counter animates once; all seven links resolve; Lighthouse-style
sanity: no layout shift from images (width/height set); no console errors.

### WP2 — Complaint form and trash can (`beschwerde.html`)

**Owns:** `beschwerde.html`, `assets/complaint.css`, `assets/complaint.js`.

**Page structure.** `h1` "Beschwerde einreichen", `.eyebrow` "Formular SA-47/B", a `.notice`
with the preamble (6.2), a sticky `.complaint-progress` bar ("Ausfüllgrad: 37 %", updated on every
input from the ratio of filled required fields), then `<form id="complaint-form" novalidate>` with
six `fieldset.form-section`s A–F exactly as in 6.2, `.form-actions` with
`.btn` "Beschwerde einbringen" and `.btn--ghost` type=reset "Formular verwerfen". Below the form,
hidden until needed: `#complaint-errors` (`.notice--error` "Fehlerprotokoll"), the
`<dialog id="confirm-dialog">`, the `#trash-stage`, and `#confirmation` (the Eingangsbestätigung).

**Validation** (on submit, `novalidate` + custom checks in `complaint.js`):

- All fields marked required in 6.2 must be non-empty; the five declarations must be checked;
  the security question must be "Beim Salzamt"; if "Bereits beschwert = Ja" the previous case
  number is required; signature must be all uppercase (auto-uppercase on input, so this only
  guards empty); complaint text ≤ 1848 characters (counter "1234 / 1848 Zeichen").
- On failure: add `.field--error` to the offending `.field`s, fill the Fehlerprotokoll with one
  bureaucratic sentence per error (wording in 6.2), scroll to the protocol, focus the first bad
  field. Errors clear per field on input.
- On success: open the dialog (6.2 "Rückfrage gemäß § 12 Abs. 3"). Both buttons ("Ja" and
  "Ja, wirklich") continue; Escape/cancel returns to the form.

**Trash sequence** (`#trash-stage`, a fixed full-screen overlay, `hidden` until used). Phases are
CSS classes added by JS with `setTimeout`; timings are for normal motion. Under
`prefers-reduced-motion` skip straight to the confirmation.

| t (ms) | class on `#trash-stage` | What happens                                                                                                                                                                                                                           |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | `is-active`             | overlay fades in; a paper sheet `.trash-paper` (150×200, salt white, typewriter header "SA-47/B", grey text lines) sits top-centre; the SVG trash can `.trash-can` sits bottom-centre                                                  |
| 100    | `phase-crumple`         | paper crumples over 1000 ms: scale 1→0.35, rotate 0→40deg with skew keyframes, border-radius →50 %, background darkens to parchment-2                                                                                                  |
| 1100   | `phase-lid`             | can lid (SVG group, hinge at the back) rotates open −70deg over 400 ms                                                                                                                                                                 |
| 1300   | `phase-drop`            | paper ball drops into the can over 900 ms (translateY to the can opening with ease-in and a small sideways wobble). The ball is layered **between** `.trash-can-back` (rim) and `.trash-can-front` (body, lid) so it disappears inside |
| 2200   | `phase-close`           | lid closes (300 ms); can wobbles ±4deg (600 ms)                                                                                                                                                                                        |
| 2900   | `phase-stamp`           | `.stamp.stamp--big` "EINGESALZEN" slams in: scale 4→1, opacity 0→1, 350 ms, cubic-bezier(.2,1.4,.4,1)                                                                                                                                  |
| 4000   | —                       | overlay fades out (300 ms) and is hidden; form is hidden; `#confirmation` is shown and scrolled to                                                                                                                                     |

Trash can SVG: hand-written inline SVG, ~200×240 viewBox, stroke `--ink` 3px, fill `--parchment-2`
body with vertical ribs, a rim, a lid with knob as a separate `<g class="trash-lid">` with
`transform-box: fill-box; transform-origin: 10% 100%`, and a label "AKTEN" in typewriter font.

**Eingangsbestätigung** (`#confirmation`, a `.frame`): title, `.akte` block with Aktenzeichen
(`Salzamt.newCaseNumber()`), Eingangsdatum/-zeit (`formatDateShort`, `formatTime`),
"Zuständige Stelle: Referat Beschwerdevermeidung II/3", "Status: eingesalzen"; then `ol.amtsweg`
whose five steps get `.is-done` one after another 200 ms apart; the line
"Bearbeitungsdauer: 0,8 Sekunden – Amtsrekord."; the closing sentences from 6.2; a line
"Papierkorb-Füllstand: 3.412.877 Beschwerden" using `Salzamt.complaintsTotal()` **after**
`Salzamt.registerComplaint()`; buttons "Weitere Beschwerde einreichen" (reloads the page) and
"Zum Amtsshop". The submitted values are read only for validation and are discarded.

Acceptance: validation blocks with the protocol when a declaration is missing or the security
answer is wrong; a fully valid form → dialog → animation completes in ~4 s → confirmation shows a
case number in the specified format, five completed steps, and the counter incremented (verify
`localStorage.salzamt_beschwerden_lokal`). Works at 390px. No network requests on submit
(check the Network panel). With reduced motion enabled the confirmation appears immediately.

### WP3 — Amtsshop and Kassa (`shop.html`, `kassa.html`)

**Owns:** `shop.html`, `kassa.html`, `assets/shop.css`, `assets/shop.js`, `assets/checkout.js`.

**`shop.js`** exports `Salzamt.PRODUCTS` (array, data in 6.3, prices as integer cents) and
`Salzamt.ICONS` (object of inline SVG strings, `viewBox="0 0 100 100"`, `stroke="currentColor"`,
`stroke-width="3"`, `fill="none"` except small accents; drawn by hand: `salt-shaker`, `salt-grain`,
`stamp`, `ticket`, `folder`, `mug`, `postcard-set`), then renders the catalogue into
`#shop-grid` on `shop.html`. Each product is a `.card.shop-product`: media (image with
`data-fallback` where listed, or the icon in burgundy on parchment-2, square aspect), optional
`.badge-tag`, name (`h2`), subtitle, description, price (`.shop-price`, typewriter, burgundy),
button `.btn` "In den Warenkorb" (`data-add="<id>"`). Clicking adds one unit via
`Salzamt.addToCart` and shows the toast "Zum Warenkorb gelegt. Bearbeitung nicht vorgesehen."
Above the grid: `h1` "Amtsshop", `.eyebrow` "Amtliche Devotionalien", the intro from 6.3, and a
`.notice` with the general terms. Below the grid a button "Zur Kassa" → `kassa.html`.

**`kassa.html` + `checkout.js`** (also loads `shop.js` for the product data):

- Empty cart: `.notice` "Ihr Warenkorb ist leer. Das ist der Idealzustand." + link "Zum Amtsshop".
- Cart table (`.table`): Artikel, Einzelpreis, Menge (`−`/`+` buttons and a number input,
  `Salzamt.setCartQty`), Summe, Entfernen. Below: Zwischensumme; "Versandkosten: € 0,00";
  "Bearbeitungsgebühr für den kostenlosen Versand: € 118,48" (constant `HANDLING_FEE_CENTS = 11848`,
  applied once per order); Gesamtbetrag (bold). A `.notice` explains that no address is needed
  (6.4). Button `.btn.btn--lg` "Bestellung verbindlich aufgeben".
- On order: read the cart, compute totals, generate `Salzamt.newOrderNumber()`, compute the
  delivery date `Salzamt.addYearsMonths(new Date(), 3, 4)`, render the **Bestellbestätigung**,
  then `Salzamt.clearCart()`. The confirmation replaces the cart (no reload):
  1. `.frame` with `.akte`: Bestellnummer, Bestelldatum (`formatDateShort`), Gesamtbetrag,
     "Voraussichtliche Zustellung: {formatDateLong(delivery)} (durch Amtsboten zu Fuß)".
  2. "Zahlungsanweisung" as a numbered list (6.4).
  3. "Stückelungsvorschrift": the denomination table computed by the algorithm below, plus
     the coin weight line and the number of rolls.
  4. "Versandanschrift" as an `address` block in the `.akte` style (6.4).
  5. "Hinweise zur Lieferzeit" (6.4).
  6. Buttons: "Bestellung ausdrucken" (`window.print()`, print CSS hides everything but the
     confirmation) and "Weiter einkaufen" → `shop.html`.

**Denomination algorithm** (`checkout.js`, pure function `splitCash(totalCents)` returning
`{ notes: {10: n, 5: n}, coins: {200: n, 100: n, 50: n, 20: n, 10: n, 5: n, 2: n, 1: n}, coinWeightGrams, rolls }`):

```
coinsTarget = ceil(T / 3)                          // at least one third in coins
notesCents  = floor((T - coinsTarget) / 500) * 500 // notes only in 5-€ steps
coinsCents  = T - notesCents
pairs       = floor(notesCents / 1500)             // one 10-€ + one 5-€ per pair
tens        = pairs
fives       = pairs + (notesCents - pairs * 1500) / 500
coins       = greedy from 200,100,50,20,10,5,2,1 cents over coinsCents
weight      = Σ count × {200: 8.5, 100: 7.5, 50: 7.8, 20: 5.74, 10: 4.1, 5: 3.92, 2: 3.06, 1: 2.3} grams
rolls       = Σ ceil(count / 25) per coin denomination
```

Test vector (must be asserted in a `node -e` check before pushing): for T = 482 948
(Salzstreuer 4 711,00 + fee 118,48) → tens 214, fives 215, coins 2 € × 807, 20 c × 2, 5 c × 1,
2 c × 1, 1 c × 1; notes + coins = 482 948; weight 6 880,26 g (display "ca. 6,88 kg"); rolls 37.

Acceptance: add three different products, change a quantity on the Kassa, remove one; totals
update; place the order → order number `B-YYYY-NB-######`, fee shown once, denomination table
sums to the total (script assertion), delivery date is today + 3 years 4 months in long Austrian
format (on 05.09.2026 → "5. Jänner 2030"), header badge returns to hidden/0, print preview shows
only the confirmation. All at 390px and 1280px. No console errors; no network requests.

### WP4 — Bedienstete (`team.html`)

**Owns:** `team.html`, `assets/team.css`.

Structure: `h1` "Bedienstete des Salzamtes", `.eyebrow` "Personalstand · Stichtag 1848",
intro sentence (6.5), then `.grid.grid--3.team-grid` with three `.card.team-member`s in this order:
Martin Gattermeier, Alexander Fellner, Katharina Gattermeier. Each card: `.circle-photo--lg`
image (paths and `data-fallback="lichtbild"` from 4.7), name (`h2`), function line in burgundy
small caps, department/unit lines, a `dl.team-facts` (Zimmer, Durchwahl, Sprechstunde,
Zuständigkeit) and an italic motto in quotes. Below the grid: `h2` "Organigramm" with the nested
list from 6.5 styled as a tree (`ul` with gold left borders and horizontal ticks), and a closing
`.frame` with the note and a "Beschwerde einreichen" button → `beschwerde.html`.

Acceptance: three cards in one row at 1280px, one column at 390px; missing photos render as the
"Lichtbild in Bearbeitung" circles; when the owner drops `assets/img/team-*.jpg` in, the photos
appear without code changes (test by temporarily copying `badge-320.png` to one of the paths and
deleting it again before committing). No console errors.

### WP5 — Integration and QA (after WP1–WP4 are merged)

**Owns:** `tools/qa.js`, `README.md` (extend), small cross-page fixes in any file if needed.

1. Serve the repo root (`npx http-server -p 8080 .`) and run `tools/qa.js` (appendix B) with
   Playwright: for every page at 390px and 1280px, take a screenshot into `qa-screenshots/`
   (git-ignored, add `.gitignore` for it), collect console errors and failed requests (404s other
   than the five owner-supplied images are failures), and run the three flows (complaint, shop
   order, team fallbacks) with assertions.
2. Click through every link in 4.8 by script; check `aria-current` is set on each page.
3. Run `prettier --check` on all HTML/CSS/JS; fix formatting.
4. Check total transfer size per page < 1.5 MB with a cold cache.
5. Review copy for consistency with section 6 (prices, names, titles, fees, dates).
6. Commit `WP5: integration QA fixes`, push, report the screenshots' findings.

---

## 6. Content (German, use verbatim)

### 6.1 Landing page

Hero:

- Eyebrow: `K.k. Salzamt · Wünsche und Beschwerden aller Art`
- H1: `Salzamt`
- Subtitle: `Wünsche und Beschwerden aller Art`
- Lead: `Seit 1848 folgenlos.`
- Paragraph: `Sie haben ein Anliegen? Ausgezeichnet. Wir haben ein Formular. Das Salzamt nimmt Beschwerden aller Art entgegen, prüft sie mit der gebotenen Sorgfalt, befindet sich für nicht zuständig, legt sie ab und salzt sie ein. Verlässlich. Seit 1848.`
- Buttons: `Beschwerde einreichen` · `Zum Amtsshop`

Über das Amt (`h2`: `Über das Amt`):

- `„Geh, beschwer di beim Salzamt!" – wer diesen Satz in Wien hört, weiß: Hier hilft niemand mehr. Das Salzamt ist die letzte Anlaufstelle für alle Anliegen, die sonst niemand haben will. Wir nehmen sie. Wir tun nichts damit. Aber wir nehmen sie.`
- `Unser Haus vereint die Gründlichkeit einer k.k. Hofkanzlei mit der Erledigungsquote eines Fensterbretts. Jede Eingabe durchläuft den vollständigen Amtsweg in fünf Schritten und erreicht am Ende zuverlässig den Papierkorb – amtlich versiegelt, ordnungsgemäß abgelegt und mit vorzüglicher Hochachtung.`
- Stamp: `Amtlich bestätigt`

Der Amtsweg (`h2`: `Der Amtsweg`), steps with one-liners:

1. `Eingelangt` — `Ihre Beschwerde ist da. Das ist schon einmal etwas.`
2. `Geprüft` — `Ein Blick, ein Seufzer, ein Stempel.`
3. `Nicht zuständig` — `Waren wir nie. Werden wir nie.`
4. `Abgelegt` — `Ordnung muss sein. Hilfe nicht.`
5. `Eingesalzen` — `Haltbar gemacht für die Ewigkeit.`

Amtsstatistik (`h2`: `Amtsstatistik`):

- `Eingelangte Beschwerden` — animated `Salzamt.complaintsTotal()`
- `Davon erledigt` — `0`
- `Durchschnittliche Bearbeitungsdauer` — `∞`
- `Zufriedenheit der Parteien` — `k. A.`

Parteienverkehr (`h2`: `Parteienverkehr`), table rows:

- `Montag bis Freitag` — `09:00 – 09:15 Uhr`
- `Samstag, Sonntag` — `geschlossen`
- `Nachtdienst` — `geschlossen`
- `Telefonische Erreichbarkeit` — `Die Durchwahl ist nicht vergeben.`
- Note under the table: `Ausgenommen bei Regen, Sonne, Nebel, Föhn, an Feiertagen, Fenstertagen, im Fasching, in den Ferien, während Dienstreisen sowie während der Amtsstunden. Voranmeldung schriftlich erforderlich. Voranmeldungen werden nicht bearbeitet.`

Shop teaser (`h2`: `Aus dem Amtsshop`): Salzstreuer, Postkarte Nr. 1, Stempel „Nicht zuständig"
(names/prices from 6.3), link `Zum Amtsshop`.

Team teaser (`h2`: `Die Bediensteten`): the three names with the short titles `Präsident i.R.`,
`Vizepräsident`, `Abteilungsleiterin`; link `Alle Bediensteten`.

### 6.2 Complaint form

Eyebrow: `Formular SA-47/B · Ausgabe 1848/3 · Gültig bis auf Widerruf`
H1: `Beschwerde einreichen`
Preamble (`.notice`): `Bitte füllen Sie das Formular vollständig, wahrheitsgemäß und in Blockschrift aus. Unvollständige Anträge werden nicht bearbeitet. Vollständige Anträge werden ebenfalls nicht bearbeitet, jedoch ordnungsgemäß.`

**Abschnitt A – Beschwerdeführende Person**

- `salutation` select _(required)_: `Bitte wählen`, `Herr`, `Frau`, `Hofrat`, `Hofrätin`, `Kommerzialrat`, `Kommerzialrätin`, `Magister`, `Magistra`, `Durchlaucht`, `Sonstiges (bitte nicht angeben)`
- `title-before` text: label `Titel (vorangestellt)`, hint `z. B. Dipl.-Ing., Dr., Ing., Mag.`
- `title-after` text: label `Titel (nachgestellt)`, hint `z. B. MBA, BA, i.R.`
- `given-name` text _(required)_: `Vorname`
- `family-name` text _(required)_: `Familienname`
- `birth-name` text: `Geburtsname (falls abweichend, sonst gleich)`
- `birth-date` date _(required)_: `Geburtsdatum`, hint `Bitte das tatsächliche Datum, nicht das gefühlte.`
- `citizenship` text _(required)_: `Staatsbürgerschaft`, default value `Österreich`

**Abschnitt B – Zustelladresse**

- `street` text _(required)_: `Straße / Gasse / Platz`
- `street-number` text _(required)_: `Hausnummer`
- `stair` text: `Stiege`, hint `Auch in Einfamilienhäusern auszufüllen.`
- `floor` text: `Stock`
- `door` text: `Tür`
- `postal-code` text _(required)_: `Postleitzahl`, pattern 4 digits, hint `Vierstellig. Fünfstellige Postleitzahlen sind uns fremd.`
- `city` text _(required)_: `Ort`
- `crown-land` select _(required)_: `Bitte wählen`, `Wien`, `Niederösterreich`, `Oberösterreich`, `Salzburg`, `Steiermark`, `Kärnten`, `Tirol`, `Vorarlberg`, `Burgenland`, `Kronland Salzburg (historisch)`, `Ausland (nicht zuständig)`
- `district` text: `Bezirk`

**Abschnitt C – Gegenstand der Beschwerde**

- `complaint-category` select _(required)_: `Bitte wählen`, `Lärm`, `Nachbarn`, `Wetter`, `Amtswege`, `Gebühren`, `Das Salzamt selbst`, `Sonstiges`
- `complaint-subcategory` select _(required, options depend on category)_:
  - Lärm: `Kirchenglocken`, `Nachbarn (siehe auch Nachbarn)`, `Innere Stimme`, `Stille`
  - Nachbarn: `Zu laut`, `Zu leise`, `Zu freundlich`, `Grüßen nicht`
  - Wetter: `Zu heiß`, `Zu kalt`, `Regen`, `Föhn`, `Wetter allgemein`
  - Amtswege: `Zu lang`, `Zu kurz`, `Zu viele Stempel`, `Zu wenige Stempel`
  - Gebühren: `Zu hoch`, `Unverständlich`, `Bereits bezahlt`, `Noch nicht bezahlt`
  - Das Salzamt selbst: `Unzuständigkeit`, `Untätigkeit`, `Zuvorkommende Ablehnung`, `Öffnungszeiten`
  - Sonstiges: `Sonstiges`, `Anderes`, `Weiteres`
- `urgency` radio 1–5 _(required)_: label `Dringlichkeit`, hint `Stufe 1 bis 4 werden nicht bearbeitet. Stufe 5 ebenfalls nicht, jedoch schneller.`
- `complaint-text` textarea _(required, maxlength 1848)_: `Sachverhalt`, hint `Höchstens 1848 Zeichen. Bitte sachlich, in ganzen Sätzen und ohne Hoffnung.` Counter `0 / 1848 Zeichen`.
- `desired-outcome` radio _(required)_: `Gewünschte Erledigung`: `Keine`, `Ebenfalls keine`, `Sonstiges (wird nicht gelesen)`

**Abschnitt D – Vorakten**

- `previous-complaint` radio _(required)_: `Haben Sie sich bereits beschwert?` `Ja` / `Nein`
- `previous-case-number` text _(required if Ja)_: `Aktenzeichen der Vorbeschwerde`, hint `Sie haben kein Aktenzeichen erhalten? Dann kreuzen Sie bitte „Nein" an und beantworten Sie die Frage erneut.`
- `previous-attempts` number 0–999: `Anzahl bisheriger erfolgloser Versuche`, default `0`

**Abschnitt E – Beilagen** (checkboxes, none required)

- `Meldezettel (Original)`, `Geburtsurkunde (beglaubigt)`, `Reisepasskopie (beglaubigt, beidseitig)`, `Nachweis der Beschwerdefähigkeit`, `Stempelmarke zu 10 Heller`
- Note: `Beilagen sind im Original in dreifacher Ausfertigung persönlich vorzulegen. Elektronische Übermittlung ist nicht vorgesehen. Persönliche Vorlage ebenfalls nicht.`

**Abschnitt F – Erklärungen und Unterschrift**

- five checkboxes _(all required)_:
  1. `Ich bestätige, dass meine Angaben wahrheitsgemäß, vollständig und in Blockschrift erfolgt sind.`
  2. `Ich nehme zur Kenntnis, dass diese Beschwerde nicht bearbeitet wird.`
  3. `Ich verzichte auf sämtliche Rechtsmittel, auch auf jene, die ich nicht kenne.`
  4. `Ich habe die Datenschutzerklärung (§ 0) nicht gelesen und stimme ihr zu.`
  5. `Ich bin damit einverstanden, dass diese Beschwerde eingesalzen wird.`
- `security-question` select _(required)_: `Sicherheitsfrage: Wo beschwert man sich in Wien?` options `Bitte wählen`, `Beim Magistrat`, `Beim Bürgermeister`, `Beim Salzamt`, `Beim Nachbarn`, `Gar nicht` — only `Beim Salzamt` passes; error text `Die Sicherheitsfrage wurde unrichtig beantwortet. Denken Sie an den Namen dieses Amtes.`
- `place` text _(required)_: `Ort`
- `date` date _(required)_: prefilled today; hint `Das Datum darf weder in der Vergangenheit noch in der Zukunft liegen.`
- `signature` text _(required)_: `Unterschrift (in Blockschrift)`, auto-uppercased on input.

Buttons: `Beschwerde einbringen` · `Formular verwerfen`

Fehlerprotokoll: title `Fehlerprotokoll`, intro `Der Antrag konnte nicht entgegengenommen werden. Folgende Mängel wurden festgestellt:`, one line per field in the form `Abschnitt X, Feld „LABEL": Angabe fehlt.` / `… : Angabe unzulässig.` / for the declarations `Abschnitt F: Erklärung Nr. N wurde nicht abgegeben.`

Dialog: title `Rückfrage gemäß § 12 Abs. 3`, text `Möchten Sie diese Beschwerde wirklich einbringen? Eine Bearbeitung ist ausgeschlossen. Eine Rückmeldung erfolgt nicht. Ein Rechtsanspruch besteht nicht.`, buttons `Ja` · `Ja, wirklich`.

Eingangsbestätigung: title `Eingangsbestätigung`; akte lines `Aktenzeichen: …`, `Eingelangt am: … um …`,
`Zuständige Stelle: Abteilung für laufende Nichtbearbeitung, Referat Beschwerdevermeidung II/3`,
`Status: eingesalzen`; after the steps: `Bearbeitungsdauer: 0,8 Sekunden – Amtsrekord.`;
closing paragraph `Ihre Beschwerde wurde ordnungsgemäß dem Papierkorb zugeführt. Eine Rückmeldung erfolgt nicht. Wir danken für Ihr Vertrauen und bitten, von Rückfragen abzusehen. Rückfragen werden eingesalzen.`;
line `Papierkorb-Füllstand: N Beschwerden`; stamp text `EINGESALZEN`;
buttons `Weitere Beschwerde einreichen` · `Zum Amtsshop`.

### 6.3 Shop catalogue

Intro: `Amtliche Devotionalien für Parteien mit Geschmack und ohne Erwartung. Alle Preise in Euro, inklusive Nichtbearbeitung, exklusive Bearbeitungsgebühr für den kostenlosen Versand.`
Terms (`.notice`): `Zahlung ausschließlich in bar auf dem Postweg. Lieferzeit rund 3 Jahre und 4 Monate. Umtausch ausgeschlossen. Rückgabe ausgeschlossen. Erhalt nicht garantiert.`

| id               | name                                       | subtitle                                                | description                                                                                                                                                                               | price       | media                        | tag            |
| ---------------- | ------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------- | -------------- |
| `postkarte-1`    | `Postkarte Nr. 1 „Salzamt an der Salzach"` | `Ansichtskarte, A6, ungelaufen`                         | `Das Salzamt am Ufer der Salzach im Abendlicht, mit Festung, Kuppeln und dem Amtsgebäude, in dem nie ein Licht brennt. Rückseite unbeschrieben, damit Sie sich selbst beschweren können.` | € 184,80    | `assets/img/postkarte-1.jpg` | `Neu`          |
| `postkarte-2`    | `Postkarte Nr. 2 „Doppeladler"`            | `Ansichtskarte, A6, ungelaufen`                         | `Der Doppeladler mit Salzfass, Hammer und Schlägel, dazu unser Leitspruch: Mit vorzüglicher Hochachtung, und ohne jede Absicht zu helfen.`                                                | € 184,80    | `assets/img/postkarte-2.jpg` | —              |
| `postkarten-set` | `Postkarten-Set (beide Motive)`            | `2 Stück, einzeln kuvertiert, ohne Kuvert`              | `Beide Motive in einer Mappe. Sparen Sie nicht: Das Set kostet fünfmal so viel wie die Einzelkarten, enthält dafür aber eine Mappe.`                                                      | € 1.848,00  | icon `postcard-set`          | `Amtlich`      |
| `salzstreuer`    | `Amtlicher Salzstreuer`                    | `Geeicht, Streuöffnungen amtlich versiegelt`            | `Der einzige Salzstreuer mit Eichstempel des Salzamtes. Die Öffnungen sind zu Ihrer Sicherheit versiegelt. Salz nicht enthalten. Entsiegelung nicht vorgesehen.`                          | € 4.711,00  | icon `salt-shaker`           | `Bestseller`   |
| `salzkorn`       | `Salzamt-Salz, 1 Korn`                     | `Mit Echtheitszertifikat, Mindestabnahme 1 Korn`        | `Ein einzelnes Korn aus den Beständen des Amtes, nummeriert und in Seidenpapier gewickelt. Nicht zum Verzehr bestimmt. Zum Einsalzen ausreichend.`                                        | € 999,99    | icon `salt-grain`            | —              |
| `stempel`        | `Stempel „NICHT ZUSTÄNDIG"`                | `Holzgriff, Gummiplatte, ohne Stempelkissen`            | `Für den Hausgebrauch: Beenden Sie jedes Gespräch mit einem Handgriff. Stempelkissen separat erhältlich, jedoch nicht bei uns.`                                                           | € 1.848,00  | icon `stamp`                 | —              |
| `stempelmarke`   | `Stempelmarke zu 10 Heller`                | `Ungültig seit 1925, unverkäuflich, dennoch erhältlich` | `Die amtliche Stempelmarke des Salzamtes. Wird für Beilagen zu Formular SA-47/B benötigt und dort nicht anerkannt.`                                                                       | € 10.000,00 | `assets/img/stamp-600.jpg`   | `Sammlerstück` |
| `wartenummer`    | `Wartenummer`                              | `Gebraucht, bereits aufgerufen`                         | `Eine originale Wartenummer aus unserem Parteienverkehr. Bereits aufgerufen, daher ohne Wartezeit. Nummer nicht wählbar.`                                                                 | € 47,11     | icon `ticket`                | —              |
| `aktenordner`    | `Aktenordner „Erledigt"`                   | `Leer, vorgelocht, Rückenschild beschriftet`            | `Der Ordner, in dem beim Salzamt nichts abgelegt wird. Liefert das gute Gefühl der Erledigung ohne den Umweg über die Arbeit.`                                                            | € 380,00    | icon `folder`                | —              |
| `poster`         | `Poster „Seit 1848 folgenlos"`             | `DIN A2, gerollt, ohne Rahmen`                          | `Unser Wappen für Amtsstube, Vorzimmer und Wartezimmer. Gedruckt auf Papier, das sich nach drei Jahren von selbst einrollt.`                                                              | € 2.300,00  | `assets/img/poster-480.jpg`  | —              |
| `haeferl`        | `Häferl „Kein Parteienverkehr"`            | `Steingut, 0,3 l, spülmaschinenungeeignet`              | `Für Amtsstunden, in denen niemand kommen soll. Aufschrift auf beiden Seiten, damit auch Ihr Gegenüber Bescheid weiß.`                                                                    | € 612,00    | icon `mug`                   | —              |

Button per product: `In den Warenkorb`. Toast: `Zum Warenkorb gelegt. Bearbeitung nicht vorgesehen.`

### 6.4 Kassa and order confirmation

Page title: `Kassa`. Eyebrow: `Abteilung für Bareingang und Ratlosigkeit`.
Empty cart: `Ihr Warenkorb ist leer. Das ist der Idealzustand.` + link `Zum Amtsshop`.
Fee rows: `Versandkosten` `€ 0,00`; `Bearbeitungsgebühr für den kostenlosen Versand` `€ 118,48`; `Gesamtbetrag`.
Address notice: `Wir benötigen keine Anschrift. Legen Sie Ihre Adresse handschriftlich dem Kuvert bei; wir entnehmen sie bei Bareingang. Eine Bestätigung per E-Mail ist nicht vorgesehen, da das Amt über keine E-Mail verfügt.`
Order button: `Bestellung verbindlich aufgeben`.

Bestellbestätigung title: `Bestellbestätigung`. Akte lines: `Bestellnummer: …`, `Bestelldatum: …`,
`Gesamtbetrag: …`, `Voraussichtliche Zustellung: … (durch Amtsboten zu Fuß)`.

Zahlungsanweisung (`h2`), ordered list:

1. `Die Zahlung erfolgt ausschließlich in bar. Überweisungen, Erlagscheine, Schecks, Karten und Wertgegenstände werden ungeöffnet eingesalzen.`
2. `Zulässig sind Banknoten zu 5 und 10 Euro, zu gleichen Teilen nach Stückzahl. Größere Scheine gelten als Beilage und werden nicht angerechnet.`
3. `Mindestens ein Drittel des Betrags ist in Münzen zu entrichten, nach Prägejahr aufsteigend sortiert, in Papierrollen zu je 25 Stück, mit Bleistift beschriftet.`
4. `Der Betrag ist auf den Cent genau beizulegen. Überzahlungen werden nicht rückerstattet, Unterzahlungen nicht bemerkt.`
5. `Das Kuvert: gefüttert, Format C4, doppelt verklebt, mit Wachs versiegelt. Die Bestellnummer ist in Blockschrift auf allen vier Seiten anzubringen, die Rückseite zusätzlich mit dem Wort „Salz".`
6. `Die Sendung ist ausreichend zu frankieren. Als ausreichend gilt, was das Amt im Einzelfall als ausreichend befindet.`

Stückelungsvorschrift (`h2`): table columns `Stückelung`, `Anzahl`, `Betrag`; rows for
`Banknoten zu 10 Euro`, `Banknoten zu 5 Euro`, then coins `Münzen zu 2 Euro` … `Münzen zu 1 Cent`
(omit rows with count 0), sum row `Gesamt`. Below: `Gesamtgewicht der Münzen: ca. X kg in N Rollen. Bitte ausreichend frankieren.`

Versandanschrift (`h2`), `address` block:

```
K.k. Salzamt
Abteilung für Bareingang und Ratlosigkeit
Referat Stückelung
Hintere Amtsstube, Gang 3, Tür 3 (nicht 3a)
Salzstiege 1848
1000 Wien
Österreich
```

(Postal code 1000 does not exist in Austria; keep it that way.)

Hinweise zur Lieferzeit (`h2`): `Die Zustellung erfolgt voraussichtlich am {date} durch Amtsboten zu Fuß. Bei unsachgemäßer Kuvertfaltung verlängert sich die Lieferzeit um weitere drei Jahre. Lieferzeiten sind unverbindlich, Lieferungen ebenfalls.`

Buttons: `Bestellung ausdrucken` · `Weiter einkaufen`.

### 6.5 Bedienstete

Intro: `Das Salzamt beschäftigt ausschließlich Bedienstete mit langjähriger Erfahrung in der Nichtbearbeitung. Sprechstunden finden nach schriftlicher Voranmeldung statt. Voranmeldungen werden nicht bearbeitet.`

1. **Martin Gattermeier** — function `Präsident i.R.` — line `Präsident des Salzamtes in Ruhestand` —
   facts: Zimmer `ehemals 1, nunmehr keines`; Durchwahl `nicht vergeben`; Sprechstunde
   `entfällt seit Amtsantritt`; Zuständigkeit `ehemals keine, nunmehr auch keine` — motto
   `„Ich habe in 40 Dienstjahren nichts erledigt, aber alles abgelegt."`
   Photo `assets/img/team-martin-gattermeier.jpg`, alt `Lichtbild Martin Gattermeier`.
2. **Alexander Fellner** — function `Vizepräsident und Sachbearbeiter` — lines
   `Abteilung für laufende Nichtbearbeitung` / `Referat Beschwerdevermeidung II/3` — facts: Zimmer
   `3 (nicht 3a)`; Durchwahl `nicht vergeben`; Sprechstunde `Dienstag 14:00 – 14:05 Uhr, nur nach schriftlicher Voranmeldung`;
   Zuständigkeit `keine, jedoch laufend` — motto `„Was nicht bearbeitet wird, kann nicht falsch bearbeitet werden."`
   Photo `assets/img/team-alexander-fellner.jpg`, alt `Lichtbild Alexander Fellner`.
3. **Katharina Gattermeier** — function `Abteilungsleiterin` — lines
   `Amt für aussichtslose Anliegen` / `Referat für Kenntnisnahme ohne weitere Veranlassung` —
   facts: Zimmer `2, hinterer Trakt`; Durchwahl `nicht vergeben`; Sprechstunde
   `nach Vereinbarung, Vereinbarungen ausgeschlossen`; Zuständigkeit `Kenntnisnahme` — motto
   `„Zur Kenntnis genommen. Ohne weitere Veranlassung."`
   Photo `assets/img/team-katharina-gattermeier.jpg`, alt `Lichtbild Katharina Gattermeier`.
4. **Irmgard Gattermeier** — function `Kanzleidirektorin` — lines
   `Abteilung für Bedenkzeit und Nachfrist` / `Referat für unbefristete Vertagung` — facts: Zimmer
   `Vorzimmer, dahinter keines`; Durchwahl `nicht vergeben`; Sprechstunde `täglich, jedoch vertagt`;
   Zuständigkeit `Vertagung, auf Wunsch auch mehrfach` — motto
   `„Kommen Sie morgen wieder. Morgen sind wir auch nicht zuständig.“`
   Photo `assets/img/team-irmgard-gattermeier.jpg`, alt `Lichtbild Irmgard Gattermeier`.

Organigramm (nested list):

```
Präsidium (Präsident i.R. Martin Gattermeier · Vizepräsident Alexander Fellner)
├─ Abteilung für laufende Nichtbearbeitung
│  ├─ Referat Beschwerdevermeidung II/3 (Alexander Fellner)
│  └─ Referat Zuständigkeitsverneinung II/4 (unbesetzt, dauerhaft)
├─ Amt für aussichtslose Anliegen (Katharina Gattermeier)
│  ├─ Referat für Kenntnisnahme ohne weitere Veranlassung
│  └─ Referat für Ablage und Einsalzung
├─ Abteilung für Bedenkzeit und Nachfrist (Irmgard Gattermeier)
│  └─ Referat für unbefristete Vertagung
└─ Abteilung für Bareingang und Ratlosigkeit
   └─ Referat Stückelung
```

Closing note: `Stellenausschreibungen: keine. Bewerbungen werden eingesalzen.`
Button: `Beschwerde einreichen`.

---

## Appendix A — `tools/resize-images.js` (WP0)

Requires Playwright with Chromium. Run from the repo root. Generates all files of section 4.7
that are derived from the originals.

```js
// Generates web-sized derivatives of the original artworks in assets/img/.
// Usage: NODE_PATH=/opt/node22/lib/node_modules node tools/resize-images.js
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "assets/img");
fs.mkdirSync(out, { recursive: true });

const jobs = [
  {
    src: "salzamt_poster.png",
    name: "poster-900.jpg",
    w: 900,
    type: "jpeg",
    quality: 0.82,
  },
  {
    src: "salzamt_poster.png",
    name: "poster-480.jpg",
    w: 480,
    type: "jpeg",
    quality: 0.82,
  },
  {
    src: "Salzbug_Postkarte_A6.png",
    name: "postkarte-1.jpg",
    w: 900,
    type: "jpeg",
    quality: 0.84,
  },
  {
    src: "Wappen-Postkarte-A6.png",
    name: "postkarte-2.jpg",
    w: 700,
    type: "jpeg",
    quality: 0.84,
  },
  {
    src: "salzamt_circle.png",
    name: "badge-320.png",
    w: 320,
    type: "png",
    circle: true,
  },
  {
    src: "salzamt_circle.png",
    name: "badge-96.png",
    w: 96,
    type: "png",
    circle: true,
  },
  {
    src: "salzamt_stamp.png",
    name: "stamp-600.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.85,
  },
  {
    src: "salzamt.png",
    name: "oval-600.jpg",
    w: 600,
    type: "jpeg",
    quality: 0.82,
  },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  for (const job of jobs) {
    const b64 = fs.readFileSync(path.join(root, job.src)).toString("base64");
    const res = await page.evaluate(
      async ({ src, w, type, quality, circle }) => {
        const img = new Image();
        await new Promise((r) => {
          img.onload = r;
          img.src = src;
        });
        let sx = 0,
          sy = 0,
          sw = img.naturalWidth,
          sh = img.naturalHeight;
        if (circle) {
          // crop to the bounding box of non-white pixels, squared and centred
          const c = document.createElement("canvas");
          c.width = sw;
          c.height = sh;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, sw, sh).data;
          let minX = sw,
            minY = sh,
            maxX = 0,
            maxY = 0;
          for (let y = 0; y < sh; y++)
            for (let x = 0; x < sw; x++) {
              const i = (y * sw + x) * 4;
              if (d[i] < 225 || d[i + 1] < 225 || d[i + 2] < 225) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          const s = Math.max(maxX - minX + 1, maxY - minY + 1);
          sx = Math.round((minX + maxX) / 2 - s / 2);
          sy = Math.round((minY + maxY) / 2 - s / 2);
          sw = s;
          sh = s;
        }
        const h = circle ? w : Math.round((w * sh) / sw);
        // stepwise halving for smooth downscaling
        let cur = document.createElement("canvas");
        cur.width = sw;
        cur.height = sh;
        cur.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        let cw = sw,
          ch = sh;
        while (cw / 2 > w) {
          const nw = Math.round(cw / 2),
            nh = Math.round(ch / 2);
          const n = document.createElement("canvas");
          n.width = nw;
          n.height = nh;
          const nctx = n.getContext("2d");
          nctx.imageSmoothingQuality = "high";
          nctx.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
          cur = n;
          cw = nw;
          ch = nh;
        }
        const o = document.createElement("canvas");
        o.width = w;
        o.height = h;
        const octx = o.getContext("2d");
        octx.imageSmoothingQuality = "high";
        if (circle) {
          octx.beginPath();
          octx.arc(w / 2, h / 2, w / 2 - 0.5, 0, Math.PI * 2);
          octx.clip();
        } else {
          octx.fillStyle = "#fff";
          octx.fillRect(0, 0, w, h);
        }
        octx.drawImage(cur, 0, 0, cw, ch, 0, 0, w, h);
        return {
          data: o.toDataURL(
            type === "jpeg" ? "image/jpeg" : "image/png",
            quality,
          ),
          w,
          h,
        };
      },
      {
        src: "data:image/png;base64," + b64,
        w: job.w,
        type: job.type,
        quality: job.quality,
        circle: !!job.circle,
      },
    );
    const buf = Buffer.from(res.data.split(",")[1], "base64");
    fs.writeFileSync(path.join(out, job.name), buf);
    console.log(
      job.name.padEnd(18),
      `${res.w}x${res.h}`.padEnd(10),
      `${Math.round(buf.length / 1024)} KB`,
    );
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

## Appendix B — `tools/qa.js` skeleton (WP5)

```js
// Smoke test: screenshots, console errors, failed requests, and the three user flows.
// Usage: npx http-server -p 8080 . &  then  NODE_PATH=/opt/node22/lib/node_modules node tools/qa.js
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080/";
const PAGES = [
  "index.html",
  "beschwerde.html",
  "shop.html",
  "kassa.html",
  "team.html",
];
const OWNER_IMAGES = /team-.*\.jpg$/; // allowed to 404 until the owner adds the staff photos

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    for (const p of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on(
        "response",
        (r) =>
          r.status() >= 400 &&
          !OWNER_IMAGES.test(r.url()) &&
          errors.push(`${r.status()} ${r.url()}`),
      );
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      await page.screenshot({
        path: `qa-screenshots/${p.replace(".html", "")}-${width}.png`,
        fullPage: true,
      });
      if (errors.length) {
        failures++;
        console.log(p, width, errors);
      }
      await page.close();
    }
    await ctx.close();
  }
  // TODO flows: complaint (validation fail, then success -> case number regex /^SA-\d{4}\/\d{3}\.\d{3}-II\/3-NB$/),
  // shop (add 3 products, change qty, order -> /^B-\d{4}-NB-\d{6}$/, denomination sums to total, delivery date),
  // team (three .circle-photo or .photo-missing elements).
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
```
