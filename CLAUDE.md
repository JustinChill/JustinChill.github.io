# justinchill.com

Hand-authored static site served by GitHub Pages from `main`. ~165 standalone
`*.html` pages at the repo root, one shared `style.css`, `data/` (CSV/JSON),
`imgs/`, `fonts/`, `js/`, `sitemap.xml`, `robots.txt`. **No build step, no
package.json, no templating**: every page carries its own full `<head>`, nav
and footer, so a shared change means editing every page.

## Before committing

```bash
python3 scripts/audit.py              # must print 0 findings (CI runs this)
python3 scripts/build_sitemap.py      # after adding, renaming or editing a page
python3 scripts/build_sitemap.py --check   # CI fails if sitemap.xml is stale
```

Both scripts are Python 3 stdlib only and run from the repo root.

## Page structure

Copy an existing article page (e.g. `Anscombe.html`) rather than starting blank.
In order:

1. `<html lang="en" class="no-js">`, charset, viewport.
2. **FOUC theme snippet**: inline `<script>` that reads `localStorage.theme`,
   sets `data-theme` on `<html>`, swaps `no-js` for `js`. Keep it first.
3. `<title>… | Justin Chill</title>`, `<meta name="description">`,
   `<meta name="author">`, `<meta name="robots" content="all">`
   (`noindex` / `noindex, nofollow` for drafts and client work).
4. OpenGraph + Twitter tags; `og:image` is `imgs/cover/*.webp` with an alt.
5. `<meta name="datePublished">` and `<meta name="dateModified">`, ISO
   `YYYY-MM-DD`. Bump `dateModified` (meta and JSON-LD) on content edits.
6. `<link rel="canonical" href="https://justinchill.com/<file>.html">`,
   `style.css` preload + stylesheet, favicon, `humans.txt`.
7. One or more `<script type="application/ld+json">` blocks.
8. `<body>`: `<nav class="nav">` (Home / Blog / Now, theme toggle,
   LinkedIn / Email), `<main role="main" id="content">`, then `<footer>`
   with Footnotes / Sources and the copyright + source-code line.

Every indexable page (`robots=all`) must have a canonical link and a meta
description; the audit enforces this.

## JSON-LD conventions

- `@context` is `https://schema.org`; article pages are `BlogPosting`, with
  `about` / `mentions` as `Thing` (not `Event`), and datasets nested under
  `isBasedOn` or listed as `Dataset` nodes.
- **`Dataset.creator` and `Dataset.funder` must have `@type` exactly
  `Person` or `Organization`.** Google rejects subtypes such as
  `NewsMediaOrganization` there (it caused a Search Console "Invalid object
  type for field creator" alert). Subtypes are fine on other fields.
- Set `license` on a `Dataset` only when it is actually known (e.g.
  `https://www.usa.gov/government-works` for US federal data). Never guess.
- Keep JSON-LD `dateModified` in sync with the meta tag. Every block must be
  valid JSON (no trailing commas, no comments).

## Scripts and CDN pins

Always pin a full `x.y.z` version on `cdn.jsdelivr.net/npm/` and
`unpkg.com/`; the audit rejects bare, `@latest` and major-only (`@7`) URLs.
Current pins:

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.2/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.19/dist/plot.umd.min.js"></script>
```

Use the `/dist/*.min.js` builds, not the package root. Library tags are loaded
synchronously (no `defer`) at the end of `<body>` because the chart code that
uses them is inline and runs immediately; only add `defer` if the dependent
code is also moved into a deferred external file. If a tag carries an
`integrity` attribute, recompute the hash whenever the URL changes.

Shared behaviour (theme toggle, obfuscated email link) lives in `js/site.js`,
loaded with `<script src="js/site.js" defer></script>` just before `</body>`.
It dispatches a `themechange` event on `document`; pages that must redraw
charts on theme change can listen for it instead of keeping an inline copy
of the toggle code.

## Images

- Prefer `.webp`; store under `imgs/` (covers under `imgs/cover/`).
- Every `<img>` has an `alt` attribute: `alt=""` plus `aria-hidden="true"`
  for decorative images, a real description otherwise.
- `loading="lazy" decoding="async"` on **below-the-fold** images only, never
  on the cover or anything in the first viewport.
- Add `width`/`height` when known. Local `src` paths must exist.

## Sitemap and robots

`sitemap.xml` lists every indexable root page (not `noindex`, not `404.html`,
`blank.html`), sorted case-insensitively by filename, with the homepage as
`https://justinchill.com/`. `lastmod` comes from the `dateModified` meta,
else the JSON-LD `dateModified`, else the last git commit. Regenerate it
with `scripts/build_sitemap.py` instead of editing by hand. `robots.txt`
blocks training crawlers (GPTBot, ClaudeBot, CCBot, …) and allows the rest.
