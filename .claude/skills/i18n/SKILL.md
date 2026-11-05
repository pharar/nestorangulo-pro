---
name: i18n
description: Keep the English and Spanish versions of the site in step — new talk or essay that needs a Spanish version, translations, new or renamed pages, UI strings, `/es/` routes, internal links in Spanish content. Use for "translate", "translation", "Spanish version", "i18n", "/es/", "new talk", "new essay", "add a page", "check:i18n fails". Spanish — traducir, traducción, versión en castellano, versión en español, nuevo artículo, nueva charla, nueva página, añadir cadena de texto.
---

# i18n (en / es)

English is the source of truth and lives at the root; Spanish lives under `/es/`.
`documentation/I18N.md` holds the design; this file is the checklist. The goal is that
nothing depends on remembering: links, sitemap and hreflang follow the content, and
`npm run check:i18n` fails when something was missed.

## Rules for any translation

- Spanish from Spain, `tú`. Keep the English terms Spanish tech people use (web, script,
  dev, firewall, backdoor, plugin, checklist, slides, webinar, spider, playbook, skimmer…).
  Never force a rare Spanish equivalent.
- Titles and named concepts stay in English (talk titles, product and event names).
- Write internal links in the **neutral form**, exactly as in English: `/speaking/<id>/`,
  `/writing/<id>/`, `/about/`, `/contact/`, `/`. Never write `/es/…` by hand: the build
  rewrites each link to `/es/…` when that Spanish page exists and leaves the English URL
  when it does not (`src/lib/hastLinksEs.mjs` for the HTML, `authored()` for the
  Markdown twin; both use `src/lib/i18nLinks.mjs`, which derives existence from the
  content folders).

## New talk

1. English entry `src/content/talks/<id>.md` (see the existing ones for the frontmatter).
2. Overlay `src/content/talks-es/<id>.md` with the same filename (frontmatter `title`,
   `summary`, `description` optional). Every talk needs one; the Spanish page exists
   only through it.
   - Delivered in **Spanish**: the overlay holds only the Spanish original.
   - Delivered in **English**: the Spanish translation, then an accessibility note, then
     `**Original (English)**` and the English original. Copy the shape of an existing
     English-delivered overlay (e.g. `geneva-2022-malicious-favicons.md`).
3. Nothing else: page, twins, `llms.txt` and sitemap follow the collections.

## New essay

1. `src/content/writing/<id>.md`.
2. Translation `src/content/writing-es/<id>.md` (`title` and `summary` required). Without
   it the essay is English-only: no hreflang, the language switch goes to `/writing/`
   in the other language, no `/es/` sitemap entry, and Spanish content links to the
   English URL. Add the file later and everything flips on its own.

## New or renamed page

1. Dictionary `src/i18n/ui/<page>.ts` (`defineDict`, all copy there).
2. View `src/views/<Page>.astro` taking `lang`; links through `localizePath`.
3. Two wrappers: `src/pages/<page>.astro` and `src/pages/es/<page>.astro`.
4. Markdown twins for both (`src/pages/<page>.md.ts`, `src/pages/es/<page>.md.ts`) and
   the builders in `src/lib/ai/registry.ts`: follow the `ai-readable-layer` skill.
5. Link from nav/footer. The page is picked up as a Spanish static page from
   `src/pages/es/<page>.astro` (`i18nLinks.mjs`), so links to it localise by themselves.
6. A rename: update the dictionaries, twins, registry and any link in `src/content/**`.

## New UI string

Add the key to `en` and `es` of the right dictionary in `src/i18n/ui/`; `npx astro check`
fails if one side is missing. If it is English text that must never appear on a Spanish
page, add it to `ENGLISH_UI` in `scripts/check-i18n.mjs`.

## Verify

```bash
npm run build && npm run check:ai && npm run check:urls && npm run check:csp && npm run check:i18n
npx astro check && npx prettier --check .
```

`check:i18n` fails on: a Spanish page linking to an English route that has a Spanish
counterpart (a missed rewrite), links to pages that were not built, wrong or missing
hreflang, English UI text on Spanish pages, and sitemap alternates for pages that exist
in one language only. Then open one Spanish page and read it: green checks do not judge
the translation.

## Record

If the mechanism changes (new locale, new rule), update `documentation/I18N.md` in the
same commit.
