# Writing

How essays work on this site: what a file contains and why, where its pictures live, how
the social card and the RSS feed come about. The procedure, step by step, is the `post`
skill in `.claude/skills/post/`; its mechanics are `scripts/post.mjs`
(`npm run post -- list | new | og | check | publish | touch`).

An essay is a Markdown file in `src/content/writing/`, validated by the schema in
`src/content.config.ts`. `/writing` lists them, `/writing/[...id]` renders each, and
`/rss.xml` carries them. The text is the owner's: scripts and agents scaffold, check and
flip fields around it, and never edit it.

## Fields

| Field         | Required     | What it is for                                                                 |
| ------------- | ------------ | ------------------------------------------------------------------------------ |
| `title`       | yes          | Page heading, listing, the social card                                         |
| `subtitle`    | no           | One line under the title on the page and in the listing                        |
| `date`        | yes          | Publication day (`YYYY-MM-DD`); orders the listing and the feed                |
| `updated`     | no           | Last substantive edit, when it differs from `date`; feeds `dateModified`       |
| `summary`     | yes          | The listing blurb, in the author's voice                                       |
| `description` | no           | The meta description, when the summary is not fit for that job                 |
| `language`    | no           | `en` (default) or `es`; sets `<html lang>` and the card's kicker               |
| `themes`      | no           | Tags from `src/data/themes.ts`                                                 |
| `draft`       | no           | `true` keeps the essay out of the build, the listing, the sitemap and the feed |
| `cover`       | no           | Image shown on the page and used as the social card background                 |
| `coverAlt`    | with `cover` | Alt text for the cover                                                         |
| `ogImage`     | no           | `/og/<slug>.png`, the social card; without it the site default card is used    |

Why `summary` is required by the schema but may be empty in a draft: the build must pass
with a draft in the tree, and the rule that a _published_ essay has one is enforced by
`npm run check:content` (and by `post check`), which can tell the two apart.

### Summary and description

`summary` is what a reader sees in the listing, so it is written for people. The meta
description is what a search result shows, and it is cut at about 160 characters. When the
summary fits, it does both jobs and `description` stays unset. When it is longer or too
conversational for a result snippet, `description` carries a tighter version. The content
check warns when a summary is over 160 characters with no `description`; it is a warning
because a long summary is sometimes right and the owner decides.

### Themes

One list, `src/data/themes.ts`, shared by talks and essays, so a tag on an essay always
matches the same tag on a talk. A theme outside the list fails the build.

## Figures

Images live in `src/images/writing/` and are referenced relatively from the Markdown
(`![alt](../../images/writing/name.jpg)`), not from `public/`. Astro then processes them:
resized, converted to modern formats, given dimensions so the page does not shift as they
load. Files in `public/` are copied as they are. Every figure needs alt text that describes
what is in the image; `post check` fails an empty one.

## Social card

`public/og/<slug>.png`, 1200×630, declared in `ogImage`. It is the image a link preview
shows on LinkedIn, X and Bluesky.

**Design.** The essay's cover, full-bleed; a near-black panel on the left quarter fading to
transparent toward the centre; a small, letter-spaced kicker (`ESSAY · OCTOBER 2026`, month
and year from `date`); the title in Montserrat Light, white, with its last word in the
site's gold; `nestorangulo.pro` bottom-left with `.pro` in gold. An essay without a cover
gets the same layout on the plain dark background. Colours are the tokens in
`src/styles/tokens.css`, the same ones as the default card.

**Template and renderer.** `assets/og/og-essay.html` is filled by `post og` and rendered by
`scripts/lib/og.mjs`, the same code that renders the default card (`npm run og`):
Chromium through Playwright, Montserrat embedded as base64, rendered at 2× and downscaled
to exactly 1200×630. It is HTML rather than SVG because the title has to wrap. Long titles
step down in size until they fit; the gold part defaults to the last word and `--accent`
sets another phrase, which must be the end of the title.

**Regenerate.** `npm run post -- og <slug>` (needs Chromium: `npx playwright install
chromium`). Use `--image` to try another picture and `--out` to render somewhere else
without touching `public/`.

**Why it is committed.** Like the favicons and the default card, the deploy does not
regenerate it, so what was reviewed is what ships. A card is a design decision a person
approved by looking at it; rebuilding it on every deploy would let a font or browser update
change it unseen.

## RSS feed

`/rss.xml`, built by `src/pages/rss.xml.ts`: published essays, newest first. Each item has
the title, an absolute link with the trailing slash, the date, the themes as categories, and
`description ?? summary` as its text. Pages declare it with a `<link rel="alternate">` in
the head, so feed readers find it; there is deliberately no visible link yet.

It carries the summary, not the full text. The essay's footnotes, figures and layout are
meant to be read on the page, and a feed that only points at it sends the reader there.

## Drafts and updates

`draft: true` removes an essay from every output, so a draft can sit in the tree and in
review without being public. `post publish` runs the preflight and only then flips it.
After publishing, a substantive change gets `updated` (`post touch`); a typo does not.
