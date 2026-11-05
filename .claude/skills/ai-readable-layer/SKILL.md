---
name: ai-readable-layer
description: Keep the machine-readable side of the site — Markdown twins, llms.txt, llms-full.txt, the JSON-LD @graph, robots.txt and _headers — in step with the HTML. Use whenever a change adds, edits, renames or removes a page, a talk, an essay, a content collection or its schema, a route (including localised `/es/…` routes), person/config data (`src/config.ts`, `src/lib/person.ts`, `src/data/*`), copy on a page that has a twin, or `public/robots.txt` / `public/_headers`. Also for "AI layer", "llms.txt", "Markdown twin", "structured data", "JSON-LD", "schema.org", "check:ai fails". Spanish — capa para IA, gemelo Markdown, datos estructurados, nueva página, nueva charla, nuevo artículo, nueva ruta, traducción.
---

# AI-readable layer

Every HTML page has a Markdown twin and a JSON-LD `@graph`; `llms.txt` and
`llms-full.txt` are built from the twins. None of it is visible in a browser, so a page
change that forgets this layer ships silently broken or silently stale. Read
`documentation/AI-READABLE.md` for the design; this file is the checklist.

## 1. Find what the change touches

| You changed…                                                 | Update                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy on home, about, contact, speaking or writing (`.astro`) | The matching builder in `src/lib/ai/pages/*.ts`. Each has a `DUPLICATION:` comment naming what it copies — edit both sides together.                                                                                                                                                                |
| A talk or essay (Markdown entry)                             | Nothing by hand: twins, registry and `llms.txt` follow the collection. Check the frontmatter fields the builder reads (`talkPage`, `writingPostPage`) still exist.                                                                                                                                  |
| A collection schema (`src/content.config.ts`)                | The builder that reads it, and its JSON-LD node (`src/lib/talkSchema.ts`, `src/lib/writingSchema.ts`). Only emit facts the page shows.                                                                                                                                                              |
| A new collection                                             | A `<x>Page(entry)` + lister in `src/lib/ai/pages/`, appended in `src/lib/ai/registry.ts`; a `src/pages/<x>/[id].md.ts` endpoint with the same draft filter as the HTML route; a section in `llms.txt.ts` if it deserves one; its schema node passed via `structuredData`.                           |
| A new page or route                                          | A builder + `src/pages/<path>.md.ts`, registered in `registry.ts`; pass `structuredData` (type, breadcrumbs, `mainEntity`, `nodes`) to `BaseLayout`. Every page except the 404 needs a twin, or `check:ai` fails (`NO_MARKDOWN` in `src/lib/ai/paths.ts` and the checker both exempt only the 404). |
| Localised routes (`/es/…`)                                   | Twins follow the same path rule (`/es/about/` → `/es/about.md`); pass `lang` to `makePage` and to `BaseLayout`; `/es/` is `/es/index.md`. Append the `('es')` builder to `registry.ts`; `llms.txt` lists all `/es/` twins in its `## Español` section automatically. See `documentation/I18N.md`.   |
| `src/config.ts`, `src/lib/person.ts`, `src/data/*`           | Usually flows through on its own (`personNode`, `llms.txt` facts paragraph, about twin). Re-read the generated `llms.txt` and `/about.md`.                                                                                                                                                          |
| `public/robots.txt`                                          | Keep the `Sitemap:` line, the `/llms.txt` comment, the named AI-crawler group and the `Content-Signal` line on every group.                                                                                                                                                                         |
| `public/_headers`                                            | Keep the `text/markdown` rules for `/llms.txt`, `/llms-full.txt`, `/*.md`, and `noindex` on `/*.md` only.                                                                                                                                                                                           |

## 2. Structured data rules

- One `@graph` per page, emitted by `SEO.astro` from the `structuredData` prop. Never add
  a second `<script type="application/ld+json">` in a page — add a node to `nodes`.
- Link nodes by `@id` (`ref(id)`); every `{"@id": …}` reference must be declared in the
  same page's graph, or `check:ai` fails.
- Use the shared ids: `PERSON_ID`, `WEBSITE_ID`, `<url>#webpage`, `<url>#breadcrumb`,
  `talkEventId()`, `essayPostingId()`.

## 3. Verify

```bash
npm run build && npm run check:ai && npm run check:urls && npm run check:csp
npx astro check && npx prettier --check .
```

Then read what changed: the twin (`dist/<path>.md`), its JSON-LD
(`dist/<path>/index.html`), and `dist/llms.txt`. Green checks prove the links resolve,
not that the copy is current.

## 4. Record

If the change alters how the layer works (a new collection, a new section in
`llms.txt`, a new rule), update `documentation/AI-READABLE.md` in the same commit.
