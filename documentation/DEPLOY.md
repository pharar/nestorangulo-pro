# Deploying to Cloudflare Pages

`nestorangulo.pro` is a fully static [Astro 7](https://astro.build) site (`output: 'static'`)
built to `dist/` and served by [Cloudflare Pages](https://pages.cloudflare.com) via its
GitHub integration. There is no server runtime, no database, and no build-time secrets.

**The site is already live and connected.** The [First-time setup](#first-time-setup)
section is kept for reference (rebuilding the project, or standing up a fork); day-to-day
you only need [Deployments](#deployments).

---

## How a deploy happens

Cloudflare Pages watches the GitHub repo directly — **GitHub Actions does not deploy**.
CI (`.github/workflows/ci.yml`) type-checks, builds, and audits; it is a quality gate, not
a delivery pipeline. The two run independently off the same push:

| Trigger | Result |
|---|---|
| Merge (or push) to `main` | Production deploy → `https://nestorangulo.pro` |
| Open/update a PR | Preview deploy on its own `*.pages.dev` URL |

A red CI run does **not** block the Cloudflare deploy — Cloudflare doesn't know or care
what Actions did. If CI fails on `main`, assume the broken build is live and revert or
fix forward.

This is why changes go through a pull request (see the README's *Workflow* section):
CI can't stop a bad deploy, but branch protection can stop the merge that would cause
one. Anything pushed straight to `main` is published unreviewed.

---

## Build settings

These are configured once in the Cloudflare Pages project and rarely change:

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(blank)* |
| `NODE_VERSION` | `24` |

Node 24 LTS is pinned in `.nvmrc` (which Pages does respect), but the explicit
`NODE_VERSION` environment variable — set for **both** Production and Preview — is the
reliable belt-and-braces version, since Pages otherwise defaults to an older Node.

`package.json` declares `engines.node >= 24.0.0` and `packageManager: npm@11.12.1`.

### Environment variables

None are required at build time. The site's canonical URL comes from `site` in
`astro.config.mjs` (read through `src/config.ts`, which throws if it is unset), not from
the environment.

---

## Files Cloudflare Pages consumes

Anything in `public/` is copied verbatim into `dist/`. Three of those files are
interpreted by Pages itself rather than served as-is — edit them with care, because a
mistake only shows up in production:

### `public/_headers`

Applies security headers to every route (`/*`):

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`

### `public/_redirects`

Legacy-path redirects. The `/talks` section was renamed to `/speaking`, so both the
index and its children are preserved with 301s:

```
/talks/*  /speaking/:splat  301
/talks    /speaking/        301
```

Add a line here — not an in-page redirect — whenever a route is renamed.

**Point targets at the trailing-slash form.** Pages serves this site directory-style,
so it 308-redirects `/speaking` to `/speaking/` on its own. A rule targeting the
slashless form therefore costs a second hop (`301` then `308`); targeting `/speaking/`
lands in one. The `:splat` rule preserves whatever form arrived, so `/talks/x/` →
`/speaking/x/` in a single hop.

### `public/robots.txt`

Allows everything and points at `https://nestorangulo.pro/sitemap-index.xml`, which is
generated at build time by `@astrojs/sitemap`.

### `dist/404.html` — the not-found status

Built from `src/pages/404.astro`. Cloudflare Pages gives this file special treatment:
when it exists, unmatched paths are served with a real **HTTP 404**. **Without it, Pages
falls back to serving `/index.html` with HTTP 200**, which makes every typo'd or dead URL
look to search engines like a duplicate of the homepage.

Keep the page in place. If you ever see unknown paths returning 200 again, check that
`dist/404.html` is still being emitted.

### Trailing slashes are the canonical URL form

`astro.config.mjs` sets `trailingSlash: 'always'`, matching how Pages actually serves a
directory-style build: `/about/` is the real URL and `/about` 308-redirects to it.

That declaration is what keeps the three URL surfaces agreeing — the `<link rel=canonical>`
(`SEO.astro` defaults it to `Astro.url.href`), the generated sitemap, and every internal
`<a href>`. They previously did not: three pages hardcoded a slashless `canonical`, so 37
of 41 pages pointed search engines at a URL that immediately redirected, while the sitemap
listed the slashed form.

**When adding a page or a link, keep the trailing slash.** Don't reintroduce a hardcoded
`canonical` prop — the default is already correct. `/404` is the one deliberate exception:
it passes `canonical={null}`, because it is served for every unmatched path and has no
URL of its own.

### Content Security Policy — not in `_headers`

The CSP is **not** in `public/_headers`. Astro 7 emits it from `security.csp` in
`astro.config.mjs`, which lets it hash the site's own inline styles and scripts instead
of requiring `unsafe-inline`. The policy is `'self'`-only across the board, with
`img-src` additionally allowing `data:` and `object-src 'none'`.

Consequence: **adding any third-party script, font, or embed requires editing
`astro.config.mjs`**, not the headers file. If an embed silently fails to load in
production, check the browser console for a CSP violation first.

---

## Custom domain

The project serves `nestorangulo.pro`. To attach a domain to a new Pages project:

1. Project → **Custom domains** → **Set up a custom domain**
2. Enter `nestorangulo.pro`
3. Follow the DNS instructions — if the domain's nameservers are already on Cloudflare,
   the record is created automatically; otherwise add the CNAME it shows you
4. Add `www.nestorangulo.pro` as well; Pages will redirect it to the apex

---

## First-time setup

For a fork, or if the Pages project is ever recreated.

### 1. Have the repo on GitHub

The canonical remote is `https://github.com/pharar/nestorangulo-pro.git` on branch `main`.

### 2. Connect to Cloudflare Pages

1. **Cloudflare dashboard** → **Workers & Pages** → **Create**
2. **Pages** → **Connect to Git**
3. Authorize GitHub and select the repository
4. Enter the [build settings](#build-settings) above
5. **Save and Deploy**

### 3. Set `NODE_VERSION`

Project → **Settings** → **Environment variables** → add `NODE_VERSION = 24` to both
Production and Preview.

### 4. Attach the [custom domain](#custom-domain).

---

## Deployments

Merge a green PR into `main`. That is the whole procedure — the merge commit is the
push that triggers the production build.

Build logs, deployment history, and preview URLs live in the Cloudflare Pages dashboard.

### Verifying a production deploy

Static hosting fails quietly, so it is worth spot-checking the platform-interpreted files
after any change to `public/`, the CSP, or routing:

```bash
# Security headers are present
curl -sI https://nestorangulo.pro | grep -iE 'strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy'

# Legacy /talks paths still 301 to /speaking
curl -sI https://nestorangulo.pro/talks | grep -iE '^(HTTP|location)'

# Sitemap and security.txt resolve
curl -sI https://nestorangulo.pro/sitemap-index.xml | head -1
curl -sI https://nestorangulo.pro/.well-known/security.txt | head -1

# Unknown paths return a real 404, not the homepage at 200
curl -s -o /dev/null -w '%{http_code}\n' https://nestorangulo.pro/no-such-page
```

Then load a page and confirm the console is free of CSP violations.

### Rollback

Cloudflare Pages dashboard → **Deployments** → pick a known-good deployment →
**Rollback to this deployment**. This is instant and does not require a git revert,
though you should still fix `main` afterwards so the next push doesn't re-deploy the
broken build.

---

## Generated assets are committed, not built on deploy

Two scripts produce binary assets locally. Cloudflare **does not** run them — their
output is committed to `public/`, so re-run them by hand and commit the result whenever
the source art or fonts change:

```bash
npm run og                        # assets/og/og-default.svg → public/og-default.png
node scripts/build-favicon.mjs    # public/images/isotipo-*.svg → favicon.ico + apple-touch-icon.png
```

Both need `playwright` / `sharp` from devDependencies, and `npm run og` renders through a
headless Chromium — so a first run may need `npx playwright install chromium`.

---

## Local verification before pushing

```bash
nvm use            # Node 24
npm ci
npm run check      # astro check — same as CI
npm run build      # static build to ./dist
npm run preview    # serve ./dist
```

`npm run preview` serves the built output but does **not** apply `_headers` or
`_redirects` — those are Cloudflare features. To exercise them locally, use
`npx wrangler pages dev dist`.
