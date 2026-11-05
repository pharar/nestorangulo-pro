# Talk cards

Talks are an Astro Content Collection: one Markdown file per talk in
`src/content/talks/`, validated by the schema in `src/content.config.ts` (fields,
formats and languages live there and only there; themes in `src/data/themes.ts`).
`/speaking` lists them and `/speaking/[...id]` renders each one. Adding a talk is adding a
file; no code changes. The procedure, and the judgement about what to feature, is the
`talk` skill (`.claude/skills/talk/SKILL.md`); the mechanics are `npm run talk`. This file
holds the conventions and why they exist.

## Slug

The file name is the slug and the URL (`/speaking/<slug>/`): `<city-or-venue>-<year>-<short-topic>`,
or `webinar-<host>-<topic>`, kebab-case. It is also the stem of the deck's R2 key (see
[SLIDES-R2.md](./SLIDES-R2.md)), so renaming a card means a new URL (add a redirect in
`public/_redirects`) and a new key.

## Drafts

`draft: true` keeps a card out of the build, the listing, the sitemap and every count.
It is how an unverified talk is held: the honesty rule is that an empty field beats a
guessed one, so a card is a draft until each of its facts has a source. A draft needs
only the schema's required fields; a published card also needs a `summary`
(`npm run check:content` enforces it).

## Two slides links

`slidesUrl` is the canonical, self-hosted copy on R2. `slidesUrlExt` is the official
event, Slideshare or Drive copy, kept only when it is public. Having both preserves
provenance: the original link is not lost when the self-hosted copy becomes the
canonical one. A Google Slides `/edit` URL is private by nature and is never stored in
either field.

The detail page shows one primary button, "View slides ↗", for `slidesUrl` (or for
`slidesUrlExt` when that is all there is), and a muted note, "Slides also available on the
event site ↗", only when both exist. A second button would read as ambiguous, so there
is none. The listing page shows Video, Slides and Event links and takes its layout from
the same fields.

## The featured shelf

`featured: true` puts a published talk in the "Featured" section at the top of
`/speaking`, ordered by date, newest first. It holds six: the section is a shelf, not a
second archive, and `npm run check:content` fails on a seventh rather than letting the
page silently cut one. A featured talk with a `cover` renders as an image card; without
one it renders as the same text-only card as the archive. No card has a cover today, so
text-only is the house style. Covers live under `src/`, never `public/`, because Astro's
`image()` only processes assets under `src/`.

## Language

`language` is `en` or `es` and defaults to `en`; it drives the `lang` attribute on the
page and the language mix of the shelf. The body of a Spanish talk carries an English
translation of the abstract, the standard accessibility disclaimer, then the original,
so the page is useful to both audiences and honest about what was delivered. The Spanish
page under `/es/` comes from the talk's `src/content/talks-es/` overlay, which every
published talk needs; see [I18N.md](./I18N.md).

## Where the count comes from

The number of talks shown on `/speaking`, `/about`, `/` and the press page is derived
from the published cards by `getPublishedTalks()` in `src/lib/talks.ts`. It is never
typed into copy, so adding or un-drafting a card updates every surface and nothing else
needs touching.
