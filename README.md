# Cesia’s Truck

> **Your favorite taco.** A bilingual (EN/ES), mobile-first marketing + menu site
> for Cesia’s Truck — a family-owned Mexican birria food truck in Irvine, CA,
> known for quesatacos, birria pizza, and consomé.

There is **no online checkout**. The site’s job is to show the menu and make it
one tap to **call or text an order** — built to work one-handed, on a phone, in
the sun.

Implemented from the [Claude Design](https://claude.ai/design) handoff for the
*Cesia’s Truck Design System*.

---

## Stack

- **[Astro 6](https://astro.build)** — static output, zero framework runtime.
- **`astro:assets` + sharp** — the heavy source photos (1–2.7 MB PNGs) ship as
  resized, responsive WebP (18–195 KB).
- **One vanilla-JS island** (`src/scripts/app.js`, ~7.5 KB) for everything the
  static page can’t do alone: language switching, build-your-order, the order
  sheet, the pickup-time → SMS flow, and the owner-editable location.
- **CSS custom properties** for the whole design system — no CSS framework.

The page is server-rendered HTML; JavaScript only *enhances* it. With JS off,
the menu still reads and the Call/Text buttons still work.

## Getting started

```bash
npm install
npm run dev        # local dev server (http://localhost:4321)
npm run build      # static build → dist/
npm run preview    # serve the production build
npm run check      # Astro + TypeScript diagnostics
npm test           # jsdom smoke test of the order/language island
```

Node 18.20+ / 20.3+ / 22+ recommended (built and tested on Node 24).

## Project structure

```
src/
├─ data/
│  ├─ content.js        EN/ES copy, the full menu, hours, gallery, catering, social
│  └─ images.js         astro:assets image map (keys → optimized images)
├─ styles/
│  ├─ tokens/           colors · typography · spacing · fonts  (the foundations)
│  ├─ global.css        token imports + reset + brand helpers + motion
│  ├─ components.css     the 7 primitives as global classes
│  └─ site.css          section + order-sheet layout (global; the island injects here)
├─ components/
│  ├─ ui/               Button · Badge · Input · SectionHeading · MenuRow ·
│  │                    DishCard · LangToggle  (+ Icon)
│  └─ site/             Header(nav) · Hero(halo) · Menu(board) · Story ·
│                       Gallery · Catering · FindUs · Social · Footer · OrderUI
├─ scripts/app.js       the client island
├─ layouts/BaseLayout.astro
└─ pages/
   └─ index.astro        the website
```

## Editing the content (no code required)

Almost everything the owner would change lives in **`src/data/content.js`**:

- **Menu** — `categories[]`: each item is `{ id, name, price, tag?, desc:{en,es} }`.
  `name` stays in Spanish in both languages (brand rule); only `desc` translates.
  Tags: `keto` and `veg` (vegetarian) show dietary pills.
- **Hours / address / phone / socials** — the `site` and `hours` objects.
- **Copy** — the `ui.en` / `ui.es` strings (keyed by `data-i18n` in the markup).

To swap a **photo**, drop a file in `src/assets/images/` and point the right key
in `src/data/images.js` at it. Astro re-optimizes it on build.

The **“Where we are today”** block on the live site is editable in the browser by
the owner (tap *Owner: tap to edit*); it saves to that device’s `localStorage`.

## How the bilingual + order flow works

- **Language** auto-detects the browser language on first visit (defaults to EN),
  is switchable any time, and persists. The toggle swaps `data-i18n` UI strings
  and `data-en`/`data-es` data nodes in place — one page, no reload.
- **Menu board** — the dark chalkboard panel has category tabs (Tacos,
  Especiales, Antojos, Consomés, Drinks); tapping a tab swaps the visible rows.
- **Build Your Order** — tapping a board row (or a featured dish card’s **Add**)
  adds it to your order; the header **Order** button shows a running count and
  opens a **right-side drawer** with quantity steppers, a **pickup-time** picker
  (ASAP + live clock times), and a clearly-labelled estimate. **Send Order by
  Text** opens the phone’s SMS app with a pre-filled message to the truck. Prices
  and availability are confirmed by phone — the site never takes payment.

## Notes & substitutions

This implementation follows the design system’s documented foundations. A few
deliberate reconciliations, all flagged in the handoff:

- **Fonts** are the closest Google Fonts to the truck’s hand-painted lettering —
  **Anton** (display), **Yellowtail** (script), **Barlow** / **Barlow Condensed**
  (body & menu). Swap in real brand faces by editing `tokens/fonts.css` and the
  `<link>` in `BaseLayout.astro`.
- **Icons** are inline **Lucide-style** line marks at a 2px stroke (per the brand
  guide, which rules out emoji). The original single-file mock used emoji pins;
  those were unified to SVG icons here.
- **Palette** is the single canonical token set (marigold · chalkboard · lime ·
  chile · tortilla), with **chile-red + chalkboard-black + marigold-gold** carried
  forward as the dominant trio the final brief asked for.

## Deploying

`npm run build` emits a fully static `dist/` — host it anywhere (Netlify, Vercel,
Cloudflare Pages, GitHub Pages, S3, a plain web server). Set the real domain in
`astro.config.mjs` (`site`) so canonical URLs and the structured data resolve.

---

*Cesia’s Truck · 2500 Alton Pkwy, Irvine, CA 92606 · (714) 710-6159 · Prices + tax.*
