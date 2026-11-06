# The AI-readable layer

`nestorangulo.pro` is a personal authority site: its job is to be found, read, cited and
summarised — by people, by search engines, and by AI assistants. Alongside the HTML it
publishes a set of files meant for machines. None of them is visible to a human visitor,
which is exactly why `npm run check:ai` exists: a broken template here ships silently.

The project skill in `.claude/skills/ai-readable-layer/` is the checklist for keeping this
layer in step when a page, talk, essay, collection, route or config data changes.

## The pieces

| Piece            | URL                         | What it is                                                                                     |
| ---------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| `llms.txt`       | `/llms.txt`                 | Curated index per [llmstxt.org](https://llmstxt.org/): `# ` H1, `> ` summary, then link lists. |
| `llms-full.txt`  | `/llms-full.txt`            | The site's content concatenated into one Markdown file, for single-fetch ingestion.            |
| Markdown twins   | `/index.md`, `/about.md`, … | A clean Markdown rendering of every page, without navigation or chrome.                        |
| JSON-LD graph    | in every `<head>`           | One `@graph` per page; always includes the `WebSite` node `https://nestorangulo.pro/#website`. |
| `robots.txt`     | `/robots.txt`               | Allows everything, names the AI crawlers explicitly, declares content signals.                 |
| `_headers` rules | (HTTP only)                 | Correct `Content-Type` for the Markdown files, `noindex` on the twins.                         |

### Markdown twin URL convention

The twin lives at the page path with the trailing slash replaced by `.md`:

| HTML page                | Markdown twin                |
| ------------------------ | ---------------------------- |
| `/`                      | `/index.md`                  |
| `/about/`                | `/about.md`                  |
| `/speaking/`             | `/speaking.md`               |
| `/speaking/<id>/`        | `/speaking/<id>.md`          |
| `/writing/<id>/`         | `/writing/<id>.md`           |
| `/contact/`, `/writing/` | `/contact.md`, `/writing.md` |

Each HTML page advertises its twin with
`<link rel="alternate" type="text/markdown" href="…">`, so an agent that lands on the HTML
can switch to the cheaper representation.

## `llms.txt` and `llms-full.txt`

Both are built from the Markdown registry, `getMarkdownPages()` in
`src/lib/ai/registry.ts` (core pages, then talks newest first, then essays newest first), so neither can list a page
that has no twin. Endpoints: `src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts`;
both answer `text/markdown; charset=utf-8`.

`llms.txt` follows [llmstxt.org](https://llmstxt.org/):

1. `# Nestor Angulo de Ugarte`, then a `> ` summary built from `DEFAULT_DESCRIPTION` in
   `src/config.ts`;
2. one plain paragraph of facts taken from the Person schema (`src/lib/person.ts`: job
   title, credential, ISC2 chapter role, alma mater, `knowsAbout`), the talk count, and
   how to use the links (cite the HTML, read the `.md`);
3. `## Core pages`, `## Speaking` (every published talk, newest first, with ISO date and
   language) and `## Writing` (every published essay, newest first); each line is
   `- [label](absolute .md URL): description`;
4. `## Optional`: `llms-full.txt`, the sitemap, the RSS feed and the HTML home page.

`llms-full.txt` is a short preamble followed by every twin verbatim, each preceded by a
`---` rule and an `<!-- Page n of N: <md url> -->` comment, so pages stay separable even
when a talk body contains its own `---`.

New collections appear in both files by being appended to `getMarkdownPages()`.

Essay twins (`src/lib/ai/pages/writing.ts`) keep the authored body as-is: root-relative
links become absolute, and the relative figure paths the HTML build resolves
(`../../images/writing/…`) are pointed at the asset Astro emitted for the same file.
Essays and their twins share one source of truth for what is published,
`getPublishedEssays()` in `src/lib/writing.ts` (no drafts, newest first).

### Spanish pages

Spanish twins live at `/es/index.md`, `/es/about.md`, … (see `markdownPathFor`). They are in
the registry (`lang`-specific builders, e.g. `homePage('es')`) and therefore in
`llms-full.txt`. `llms.txt` keeps its English sections unchanged and adds one `## Español`
section listing every twin under `/es/` (`getMarkdownPagesByLang('es')`): home, about,
speaking, writing, contact, every talk (newest first), then the translated essays. A new
Spanish page appears there by being added to `buildMarkdownPages()`. `/es/404/` has no twin
(`NO_MARKDOWN`), and `check:ai` skips it like the root 404. See [I18N.md](./I18N.md).

### The `rel="alternate"` link

`src/components/SEO.astro` emits
`<link rel="alternate" type="text/markdown" href="https://nestorangulo.pro/<path>.md">`
next to the canonical, using `markdownPathFor(Astro.url.pathname)`. It is skipped when
`canonical` is `null` (the 404) and when the registry does not build that `.md` file, so
it can never point at a missing twin. There is no `<link>` to `/llms.txt`: llmstxt.org
defines only the well-known path, and no `rel` value for it is a recognised convention.

## `robots.txt` and content signals

`User-agent: *` is allowed everywhere, and the main AI search, assistant and training
crawlers are additionally named in their own group (OpenAI, Anthropic, Perplexity, Google,
Apple, Meta, Amazon, DuckDuckGo, Mistral, Common Crawl). A crawler that matches a named
group ignores the `*` group, so that group repeats the `Allow: /` and the signal.

Both groups carry Cloudflare's [Content Signals](https://contentsignals.org/) line:

```
Content-Signal: search=yes, ai-input=yes, ai-train=yes
```

To keep AI answers but opt out of model training, change `ai-train=yes` to `ai-train=no`
on **every** `Content-Signal` line.

Bytespider (ByteDance) is deliberately not named: it is widely reported to ignore
`robots.txt`, so a named group would promise nothing. It is still covered by `*` like any
other crawler.

### Cloudflare dashboard caveat — check this

The file in `public/` is not necessarily what Cloudflare serves. Two zone settings can
change it at the edge, and either would silently contradict this policy:

- **Security → Settings → Bot traffic → AI Crawler and Agent access policies** with
  **Bot Preference Sync** ("managed `robots.txt`"): when any policy is set to _Block_ or
  _Disallow_, Cloudflare **prepends** its own block — including `Disallow: /` groups for
  GPTBot, ClaudeBot, Google-Extended, CCBot and others, and `ai-train=no` — to this file.
- **Block AI bots** / **AI Crawl Control** blocks: these refuse the crawlers at the edge
  (HTTP 403) regardless of what `robots.txt` says.

Keep all of these on _Allow_ (or off). After any change, fetch
`https://nestorangulo.pro/robots.txt` and confirm it matches `public/robots.txt` byte for
byte — there should be no `# BEGIN Cloudflare Managed content` block.

## `_headers`

| Path             | Headers                                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| `/llms.txt`      | `Content-Type: text/markdown; charset=utf-8`, day-then-revalidate `Cache-Control` |
| `/llms-full.txt` | same                                                                              |
| `/*.md`          | same, plus `X-Robots-Tag: noindex`                                                |

Pages splats match greedily across `/`, so `/*.md` also covers `/speaking/<id>.md`.

The twins are `noindex` so they never compete with the canonical HTML in search results;
they stay crawlable, which is all an agent needs. `llms.txt` is **not** `noindex` — it is
meant to be discovered. No `Link: rel="canonical"` header is set: the HTML already points
at the twin via `rel="alternate"`, `noindex` already settles which URL ranks, and a
`:splat`-based canonical would map `/index.md` to `/index/` with no way to override it
(matching `_headers` rules stack rather than replace each other).

`npm run preview` does not apply `_headers`; verify on a Pages preview deploy with
`curl -sI https://<preview>.pages.dev/about.md`.

## `npm run check:ai`

`scripts/check-ai-layer.mjs` runs against the build output (`dist/` by default, or a
directory passed as the first argument) and runs in CI right after `npm run build`. It
fails when:

- `robots.txt` lacks the `Sitemap:` line or a reference to `/llms.txt`, or any group
  carries a blanket `Disallow: /`;
- `llms.txt` is missing, or does not open with a `# ` H1 followed by a `> ` summary;
- any `nestorangulo.pro` link in `llms.txt`, `llms-full.txt` or a Markdown twin
  (including its `Canonical:` line) does not resolve to a file in `dist/` in its
  canonical form — `/about` without the slash counts as broken, since Cloudflare
  answers it with a redirect;
- `llms-full.txt` is missing or empty;
- any built page (except `404`) lacks a parseable JSON-LD `@graph` containing the
  `WebSite` node, has an `{"@id": …}` reference that no node in its own graph declares,
  or lacks a `rel="alternate" type="text/markdown"` link whose target exists in `dist/`;
- any Markdown file contains `undefined`, `[object Object]` or raw HTML tags such as
  `<div` outside code spans and fenced blocks — the signatures of a template leak.

HTML parsing is regex-based but tolerant of attribute order, single, double or no quotes,
and absolute or root-relative `href`s.
