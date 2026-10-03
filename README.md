# popcorn

Search movies **and** TV series, check age ratings, seasons and runtimes, rate what you watch, and keep a personal list.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4** and the **TMDB API**.
The UI follows the "Shop" style reference: white canvas, one violet accent (`#5433eb`), 28px cards, pill controls, tight negative tracking.

## Quick start

```bash
npm install
cp .env.example .env.local     # then paste your TMDB key
npm run dev                    # http://localhost:3000
```

Get a free key at <https://www.themoviedb.org/settings/api> (use a desktop browser).
Both the v3 **API Key** and the v4 **API Read Access Token** work in `TMDB_API_KEY`.
The key is only read on the server; it is never sent to the browser.

| Variable | Required | Purpose |
|---|---|---|
| `TMDB_API_KEY` | yes | v3 key or v4 read token |
| `TMDB_REGION` | no (default `US`) | Country for age ratings and "where to watch" |
| `NEXT_PUBLIC_SITE_URL` | before deploy | Public origin (`https://example.com`, no trailing slash) for canonical URLs, hreflang, Open Graph, sitemap and robots |

Without a key the app shows a setup screen instead of crashing.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run typecheck` · `npm run check:seo` (needs the site running; see the header of `scripts/check-seo.mjs`)

## What is in it

| Route | What it does |
|---|---|
| `/` | Floating hero, search, category pills, featured title, rails (trending, popular, top rated, kids, on the air) |
| `/movies`, `/tv` | Browse with filters: a Filters button (age group, genre) with removable chips, a sort menu, pagination |
| `/search?q=` | Combined movie and TV search with All / Movies / TV tabs |
| `/movie/[id]` | Back button, rating, synopsis, age rating (Kids / Teens / Adults), runtime, cast, trailer, where to watch, recommendations |
| `/tv/[id]` | Same, plus seasons, episode count, episode length, status, next episode, and a season tab panel that loads episodes on demand, 20 per page with episode-range chips (E1–20, E21–40 ...) |
| `/watched` | Your rated list (stored in `localStorage`) with averages and a Movies / TV filter |
| `/api/suggest?q=` | Top 6 live suggestions for the search bar (cached 5 min) |

## Motion and interaction

- **Navbar:** sticky top bar. On screens below 1024px the language and theme controls are two always-visible buttons (language: one tap switches EN/ID; theme: one tap cycles Light, Dark, System) instead of a menu; nav labels show from 768px and the "My list" label from 1024px. The highlight slides to the hovered link, the bar hides while scrolling down and returns on scroll up, and the My list badge pops when the count changes.
- **Search bar:** live suggestions (poster, type, year, score) with arrow-key navigation, Enter, Escape and a "see all results" row; rotating placeholder hints; clear button; spinner while loading. Pressing Enter with nothing focused jumps to the field.
- **Home hero:** cards drop in, float, drift with the pointer and straighten on hover; each letter of the wordmark pops on hover.
- **Cards:** lift, image zoom and a corner arrow on hover; images fade in when loaded.
- **Every page:** the page eases in on navigation (`src/app/template.tsx`); sections, rails and grids reveal as they scroll into view (`Reveal`); filter pills, badges and episode rows stagger.
- **Detail pages:** the backdrop settles in and drifts slower than the page; season panel cross-fades; ratings pop.
- **My list:** stats count up; removing an item slides it out.
- **Accessibility:** all motion is disabled under `prefers-reduced-motion`. Reveals only hide content when JavaScript is running, so nothing is lost without it.

Timing tokens and keyframes live at the bottom of `src/app/globals.css`.

## Browse filters, back button, long seasons

- **Filters** (`components/browse-filters.tsx`, used by `browse.tsx`): one row with a **Filters** button (count of active filters), removable chips for the active age group and genre, and a **sort** dropdown on the right. Age and genre live in a panel under that row; genres show the 8 most common first and "Show N more" reveals the rest. Every option is still a real link in the HTML, only hidden by CSS once JavaScript runs (`.filter-panel`, `.pill-group` in `globals.css`), so genre pages stay crawlable and the filters work without JavaScript. Genre labels come from our own dictionaries (`genre.*`), because TMDB repeats some names in some languages; options are keyed by URL, not label.
- **Back button** (`components/back-button.tsx`): in the detail hero. It goes back in history when the visitor came from another page of the site, and otherwise links to `/movies` or `/tv` (direct visit, search engine, reload). `NavTracker` in the layout counts in-app page changes to tell the two cases apart.
- **Season episodes** (`components/season-panel.tsx`): `PAGE_SIZE = 20` episodes are rendered at a time, with range chips (shown only when a season has more than one page), previous/next buttons and a "Showing 21–40 of 99" line. TMDB returns a whole season in one response, so paging happens in the browser.
- **Boot script:** the theme/`js` script is rendered by `components/boot-script.tsx`. It is in the server HTML (so it runs before first paint) and renders nothing once the browser takes over, because React 19 warns whenever client rendering creates a `<script>` element. `next/script` does not avoid that warning.

## Age ratings

The detail pages read the certification for `TMDB_REGION` (falling back to US, GB, ID, then any country) and map it to **Kids**, **Teens** or **Adults**. The mapping table lives in `src/lib/certification.ts`.

Limits worth knowing:

- TMDB list endpoints (trending, discover, search) do not include certifications, so cards do not show an age badge. It appears on the detail page and in your list.
- The **movie** age filter uses TMDB's certification filter (US scale): Kids = G/PG, Teens = PG-13, Adults = R and up.
- TMDB has no such filter for **TV**, so "Kids and family" uses the Kids and Family genres.
- `include_adult` is always `false`.

## Themes and languages

**Theme.** Light, Dark, or System (the default, follows the OS). The choice is stored in `localStorage` and applied by a tiny inline script before first paint, so there is no flash. Colors are the tokens in `src/app/globals.css`; the dark palette overrides the same tokens under `html[data-theme="dark"]`. Use `bg-ink text-on-ink` (not `text-white`) for anything drawn on an `ink` surface, since `ink` flips to a light color in dark mode.

The switch fades gradually (about 0.9 s). The color tokens are registered with `@property`, and only those tokens are animated on `<html>`, so every element follows without a per-element transition (much cheaper on the home page). It is disabled under `prefers-reduced-motion`.

**Language.** English and Indonesian, each on its own URL: English at `/` (`/movies`, `/movie/603`), Indonesian under `/id` (`/id/movies`, `/id/movie/603`). Google recommends one URL per language rather than a cookie or browser setting, and Googlebot sends neither, so nothing is decided by cookies or `Accept-Language` any more.

- `src/proxy.ts` rewrites unprefixed paths to `app/[locale]/...` with locale `en` (the URL stays `/movies`) and 308-redirects `/en/...` to `/...`.
- There is **no automatic redirect by browser language**. A small dismissible banner (`locale-banner.tsx`) offers the browser's language once.
- The EN | ID switch is two real links with `hreflang`. A plain click plays the page transition (the page dims, then its sections rise back in); modified clicks open normally.
- Internal links go through `components/locale-link.tsx` (`import Link from "@/components/locale-link"`), which adds the `/id` prefix. In code, use `localizeHref(locale, path)` from `lib/i18n/path.ts`.
- The locale is read from the route param. The layout and every page call `setRequestLocale(locale)` first; server code then uses `getI18n()` as before. Because nothing reads cookies, pages can be static and cached (home refreshes hourly, titles every six hours).
- If TMDB has no translated synopsis, the English one is used.

- UI strings: `src/lib/i18n/en.ts` is the source; `id.ts` is typed against it, so a missing key fails `npm run typecheck`.
- Server components: `const { t, tp, locale } = await getI18n()` (`lib/i18n/server.ts`).
- Client components: `const { t, tp, locale } = useI18n()` (`components/i18n-provider.tsx`).
- Plurals use `key.one` / `key.other` with `tp("key", count)`.
- Numbers, dates, durations and languages go through `lib/format.ts`, which takes the locale.
- API routes (not under `[locale]`) take `?lang=`, so their cached responses stay separate per language.

To add a language: create `src/lib/i18n/<code>.ts`, register it in `LOCALES`/`LOCALE_META` (`config.ts`) and in `DICTIONARIES` (`index.ts`).

Known limit: titles saved to "My list" keep the language they were saved in.

## Fonts, type and responsive layout

- **Fonts.** Titles use **Young Serif** (one weight, so hierarchy comes from size; the display utilities set `font-weight: 400` and `font-synthesis-weight: none` so the browser never fakes a bold). UI text uses **Instrument Sans** (variable). Both come from Fontsource (`@fontsource/young-serif`, `@fontsource-variable/instrument-sans`, OFL), self-hosted, no request to Google. The stacks end in system fonts so CJK, Cyrillic and other scripts in TMDB titles still render.
- **Type scale.** All sizes are `rem` (`t-headline`, `t-display`, `t-lead`, `t-body`, `t-strong`, `t-meta`, `t-caption`, `t-wordmark` in `globals.css`); the fluid ones use `clamp()` with a `rem` term so they follow the user's font-size setting and zoom. Smallest text is 12px, body is 15px+.
- **Layout.** Media queries for page structure, container queries (`@container`, `cqi`) for the hero stage, `auto-fill` grids for the card grid (no breakpoint jumps), swipeable chip rows for filters on phones, a two-column sidebar on tablets, `dvh` instead of `vh`, `viewport-fit=cover` with safe-area insets, and a wider container plus a larger root font size from 1920px up.
- **Touch targets.** On `pointer: coarse` devices every control is 44px or has its tap area grown to 44px (`.tap-target` pseudo-element, or `min-h-11` / `pointer-coarse:`); on any device nothing is below 24px. Hover effects only apply on devices that can hover (Tailwind v4 default); `prefers-reduced-motion` is respected.

## SEO

- **Metadata** for every page comes from `buildMetadata()` (`lib/seo.ts`): unique title and description, absolute canonical, hreflang cluster (`en`, `id`, `x-default`) with self-referencing canonicals, robots, Open Graph and Twitter tags. `metadataBase` comes from `NEXT_PUBLIC_SITE_URL`.
- **Indexing rules.**

| Page | Indexed | Notes |
|---|---|---|
| `/`, `/movies`, `/tv` | yes | filter and sort variants canonicalize to the base page; `?genre=X` alone canonicalizes to its genre page |
| `/movies/genre/<slug>`, `/tv/genre/<slug>` | yes | 14 movie and 10 TV genres (`lib/genres.ts`) |
| page 2 and up of any list | `noindex, follow` | still crawlable |
| `/movie/<id>`, `/tv/<id>` | yes | title, synopsis-based description, dynamic Open Graph image, breadcrumbs |
| `/search`, `/watched` | `noindex` | meta tag, not robots.txt (a blocked page can never show its noindex) |
| 404 | `noindex` | HTTP status stays 404 |

- **Structured data** (JSON-LD): `WebSite` + `ItemList` (home), `ItemList` (lists and genre pages), `Movie` / `TVSeries` + `BreadcrumbList` (details). `aggregateRating` is only added when the score is shown on the page. Google may still choose not to show rich results.
- **Files:** `app/robots.ts`, `app/sitemap.ts` (home, lists, genre pages, and about 200 popular and top rated titles per type, both languages, with alternates; refreshed daily), `app/manifest.ts`, icons (`app/icon.svg`, `app/favicon.ico` with 16/32/48 px, `app/apple-icon.png`, and `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` for the web app manifest; a violet tile with a popcorn bucket), `opengraph-image.tsx` (brand card and per-title cards with the backdrop and Young Serif).
- **After deploying**, run the Rich Results Test and PageSpeed Insights on a few pages and submit `/sitemap.xml` in Search Console.

## Project layout

```
src/
├── proxy.ts        language routing (rewrite / redirect, no cookies)
├── app/            robots, sitemap, manifest, icon, /api routes
│   └── [locale]/   every page: home, movies, tv, genre pages, movie/[id], tv/[id], search, watched
├── components/     UI (cards, rail, hero, detail view, season panel, watched list, locale link ...)
└── lib/
    ├── tmdb.ts           server-only TMDB client and normalizers
    ├── certification.ts  age rating -> audience mapping
    ├── i18n/             en/id dictionaries, locale config, path helpers, server helper
    ├── seo.ts, jsonld.ts, browse-metadata.ts, og.tsx, genres.ts   SEO building blocks
    ├── browse.ts         filter parsing and URL building
    ├── images.ts         TMDB image URLs and Unsplash photo ids
    └── format.ts         locale-aware runtime, date, number, money helpers
```

Design tokens (colors, radii, shadows, type scale) are in `src/app/globals.css`.

## Images and credits

- Posters, backdrops and cast photos come from TMDB.
- Empty states, the avatar and the fallback backdrop use free Unsplash photos:
  Toni Pomar (theater), Geoffrey Moffett (seats), Jason Dent (projector), Denise Jans (film reel), GR Stocks (clapperboard), Krists Luhaers (viewer).
- "Where to watch" data is provided by JustWatch through TMDB.

TMDB requires attribution: *This product uses the TMDB API but is not endorsed or certified by TMDB.* It is in the footer. TMDB's guidelines also ask for their logo next to that text; add it from their brand assets if you publish the site.

## Deploy

Works on Vercel or any Node host. Set `TMDB_API_KEY`, `NEXT_PUBLIC_SITE_URL` (and optionally `TMDB_REGION`) in the environment **at build time** (pages are statically generated and refreshed on a schedule), then `npm run build && npm start`.
# pop-corn-2.0
# pop-corn-2.0
