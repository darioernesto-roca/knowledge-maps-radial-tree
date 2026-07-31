# Deployment Guide & Pre-Launch Checklist

Status of this document: **planning only**. Nothing in here has been implemented yet — pick what you want and I'll apply it.

The app is a pure static site (HTML + CSS + one ES module + JSON data). No build step, no server, no backend. That makes hosting trivial, but it also means a few things that a framework would normally handle for you (meta tags, headers, dead-file pruning) have to be done by hand.

---

## Repository

- **Remote (`origin`)**: `https://github.com/darioernesto-roca/knowledge-maps-radial-tree.git` (same URL for fetch and push)
- **Branch**: `main`, tracking `origin/main`
- **Local state at time of writing**: `main` is **2 commits behind** `origin/main`. Working tree is clean apart from this file.
- **Incoming commits not yet in your local copy**:
  - `c59dcaf` — Harden external link handling in topic metadata
  - `bcafbb3` — Merge PR #8 (`rocadev/evaluate-cybersecurity-risks-in-repository`)

  Those two add a `sanitizeExternalUrl()` guard in `app.js` that rejects any node `url` that isn't `http:`/`https:`, and add `referrerpolicy="no-referrer"` to generated links. **This is a security fix and should be in whatever you deploy.**

I ran `git fetch origin` (read-only) to determine the above. No commit, push, merge, or pull has been made.

---

## Hosting recommendation

| Option | Fit | Notes |
|---|---|---|
| **GitHub Pages** | Best fit for now | Repo is already on GitHub, site is fully static, zero config, free, custom domain supported. **Limitation:** cannot set HTTP response headers, so CSP/security headers must go in a `<meta http-equiv>` tag instead. |
| **Cloudflare Pages** | Best if you want headers | Free, global CDN, supports a `_headers` file for real CSP/HSTS/`X-Content-Type-Options`, and gives you brotli compression for the large JSON files. Slightly more setup. |
| **Netlify** | Equivalent alternative | Same `_headers` capability, `_redirects` for a 404 page. |
| Vercel | Works, overkill | Static-only project doesn't benefit from its serverless features. |

**Suggestion:** GitHub Pages if you want it live today; Cloudflare Pages if you care about the security-header and compression items below. Both deploy from the same repo with no code change.

---

## ✅ Required — do these before going live

These are correctness, security, or "the site is visibly broken" issues.

- [ ] **Merge `origin/main` into local `main`** so the `sanitizeExternalUrl()` security fix is included. (Needs your authorization — I have not run it.)

- [ ] **Add a viewport meta tag.** `index.html` has no `<meta name="viewport" content="width=device-width, initial-scale=1">`. Without it every mobile browser renders the page at a ~980px virtual width and zooms out, which makes an already-dense 1152×1152 radial tree unreadable on a phone. This is the single most visible defect on launch.

- [ ] **Add `<html lang="en">`.** `index.html` currently has no `<html>` element at all (it opens straight into `<meta charset>`). Browsers recover, but screen readers get no language hint and validators will flag it.

- [ ] **Fix or remove the 124 placeholder links.** These are live, clickable, and point at domains that do not exist:
  - `data/nodejs-urls.json` — 89 × `https://example-nodejs.com`
  - `data/python-urls.json` — 29 × `https://example-python.com`
  - `data/java-urls.json` — 3 × `https://example-java.com`
  - `data/javascript-urls.json` — 3 × `https://example-javascript.com`

  `placeholder-links.md` already inventories them all by node. Two acceptable resolutions: replace with real documentation URLs, or strip the `url` key so the node renders as plain non-clickable text. Shipping dead links on a "knowledge map" undermines the whole point of the site.

- [ ] **Delete the dead Observable notebook export.** None of these are referenced by `index.html` or `app.js`, but all of them ship to every visitor's repo checkout and bloat the deploy:
  - `runtime.js` (69 KB)
  - `608289addb874ed7@278.js` (6.5 KB)
  - `7a9e12f9fb3d8e06@517.js` (8.8 KB)
  - `index.js` (re-exports the notebook file above — dead)
  - `files/` — 4 JSON files (~21 KB) that are **stale duplicates** of `data/java.json`, `data/node.json`, `data/python.json` plus one hash-named blob

  Around 105 KB of dead weight, and the stale copies in `files/` are a real trap: someone will eventually edit the wrong one.

- [ ] **Rewrite `package.json`.** It is still Observable's generated manifest: `"name": "608289addb874ed7"`, `"main"` pointing at the notebook file you're deleting, `"homepage": "https://observablehq.com/d/608289addb874ed7"`, and a `peerDependency` on `@observablehq/runtime` that the app does not use. Replace with real project metadata (name, description, repository URL, license, `"private": true` if you're not publishing).

- [ ] **Resolve the license mismatch.** `LICENSE.txt` reads `Copyright 2017–2023 Observable, Inc.` (the ISC license that shipped with the notebook export), while the site header states "Developed by RocaDev — This is an Open Source Project." Add your own license (MIT is the usual pick) and, if any Observable-derived code remains, keep their notice in a separate `NOTICE` or attribution section rather than as the project's sole license.

- [ ] **Add a favicon.** No `favicon.ico` and no `<link rel="icon">` — every page load produces a 404 in the network tab, and the browser tab shows a blank sheet.

- [ ] **Add `.gitignore`.** The repo has none. At minimum `node_modules/`, `.DS_Store`, `.env*`.

- [ ] **Add `.nojekyll`** (GitHub Pages only). Without it Pages runs the files through Jekyll, which ignores paths beginning with `_` and adds needless build latency.

---

## 🔶 Recommended — should do, but won't break the launch

- [ ] **Pin the d3 CDN version and add SRI.** `app.js:1` imports `https://cdn.jsdelivr.net/npm/d3@7/+esm` — a floating major-version range, resolved fresh on every page load from a third party. Any compromised or breaking publish under `d3@7` lands directly in your users' browsers. Two options: pin exactly (`d3@7.9.0`) or vendor d3 locally into the repo. Vendoring also removes a third-party runtime dependency entirely. This mirrors your own standing rule in `CLAUDE.md` about pinning exact versions instead of caret ranges.

- [ ] **Add a Content-Security-Policy.** With d3 vendored locally it can be as tight as `default-src 'self'; img-src 'self' data:; style-src 'self'`. With the CDN you'd need `script-src 'self' https://cdn.jsdelivr.net`. On GitHub Pages this goes in a `<meta http-equiv="Content-Security-Policy">`; on Cloudflare/Netlify use a `_headers` file (stronger — meta-tag CSP can't set frame-ancestors).

- [ ] **Add the standard security headers** (Cloudflare Pages / Netlify only, via `_headers`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), camera=(), microphone=()`, `Strict-Transport-Security`.

- [ ] **Add SEO meta tags.** Currently there is no `<meta name="description">`, no Open Graph tags, no Twitter card, no canonical URL. Since the page title is set by JavaScript per topic, crawlers and link-preview bots that don't run JS see only the static `<title>Knowledge Map</title>` and no description. A single set of static OG tags (title, description, `og:image` with a screenshot of a map) makes shared links look like a real product instead of a bare URL.

- [ ] **Cache the fetched JSON in memory.** `initializeTheme()` in `app.js:83-85` calls `render(currentTopic)` on every theme toggle, and `render()` unconditionally re-fetches *both* JSON files (`app.js:328-331`). Toggling dark mode on the Node.js map re-downloads 91 KB for no reason. Keep a `Map` of already-parsed topic data keyed by topic name. Same win when switching back to a previously viewed topic.

- [ ] **Strip the unused Observable inspector CSS.** `inspector.css:165-251` — roughly 90 lines of `.observablehq--*` rules and the `--syntax_*` custom properties above them are for a notebook inspector widget that no longer exists in this app.

- [ ] **Add a `404.html`.** Static hosts serve their own generic page otherwise; a branded one that links back to the default map is a two-minute job.

- [ ] **Decide what to do with `resources`.** `mergeUrlsIntoTree()` copies a `resources` array onto each node (`app.js:302-304`), and `buildUrlLookup()` reads it — but `Tree()` never renders it anywhere. It's a half-built feature: either surface it (e.g. in the hover `<title>` tooltip, or a side panel on node click) or drop the code so it stops looking like a bug.

- [ ] **Respect `prefers-reduced-motion`.** The zoom buttons animate via `d3.transition()` (`app.js:255-263`). Users with motion sensitivity should get instant transforms; check the media query and use duration 0.

- [ ] **Add visible focus styles.** `.topic-button`, `.theme-toggle`, `.zoom-button` in `inspector.css` style `:hover` but never `:focus-visible`, so keyboard users get only the browser default outline — which is nearly invisible against the dark-theme button background.

---

## 💡 Nice to have — polish and future-proofing

- [ ] **Mobile legibility pass.** The SVG is a fixed `1152×1152` viewBox at `font-size: 10`, scaled to `width: 100%`. On a 390px-wide phone that's effectively ~3.4px text before the user pinches. Pinch-zoom works (`touch-action: none` is correctly set), but the *initial* view is unusable on small screens. Consider a larger base font, a mobile-specific initial zoom transform, or a collapsible/drill-down mode for narrow viewports.

- [ ] **Node search / filter.** With a few hundred nodes per map, a text input that highlights and centres matching nodes would be the highest-value feature you could add.

- [ ] **Collapsible branches.** Click a category node to fold/unfold its subtree — the standard fix for radial-tree density.

- [ ] **Deep-linkable nodes.** Extend the URL scheme beyond `?topic=` to something like `?topic=python&node=Testing>pytest` so a specific branch can be shared.

- [ ] **Persist last-viewed topic** in `localStorage` the way the theme already is (`THEME_STORAGE_KEY`, `app.js:40`).

- [ ] **Compress the data files.** `data/nodejs-urls.json` is 76 KB, `python-urls.json` 60 KB, `java-urls.json` 51 KB. Every decent host gzips/brotlis automatically, so this is mostly free — but verify it's actually happening on whichever host you pick, since these dominate page weight.

- [ ] **CI on pull requests.** A GitHub Actions workflow that validates every `data/*.json` parses, that every `*-urls.json` path resolves to a real node in its companion map, and that no `example-*.com` URLs have crept back in. Cheap, and it prevents exactly the class of bug you already have.

- [ ] **Linting/formatting.** No ESLint or Prettier config. For a single 370-line module it's optional, but it pays off once someone else contributes.

- [ ] **Privacy-friendly analytics.** Plausible/Umami/Cloudflare Web Analytics if you want to know which maps people actually use — no cookie banner required. Skip Google Analytics unless you're prepared to add consent handling.

- [ ] **More language maps.** `README.md` already documents the process; the data model supports it with no code change beyond a `TOPICS` entry.

- [ ] **`sitemap.xml` + `robots.txt`.** Marginal for a 1-page app, but cheap. Note that the four topics live behind a query param, so they're one URL to a crawler regardless.

- [ ] **A README deploy section** pointing at this file and recording the live URL once it exists.

---

## Suggested order

1. Merge `origin/main` (security fix).
2. Delete dead files, fix `package.json`, fix the license.
3. Add viewport / `lang` / favicon / `.gitignore` / `.nojekyll`.
4. Resolve the 124 placeholder links.
5. Deploy to GitHub Pages, verify on a real phone.
6. Then work through the Recommended list — CDN pinning and CSP first.

Steps 1–4 are one focused session. Everything after step 5 can ship incrementally without downtime, since each deploy is just a static file swap.
