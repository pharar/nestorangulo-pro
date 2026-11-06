# Brand

The visual identity of nestorangulo.pro: palette, type, logos and tagline. The site, the
social cards and any other branded output take their values from here.

## What is not in this repo

Identity facts, contact addresses, dates, and the voice and copy guidelines live in the
owner's **private brand reference**, outside every repository. Its location is in the
owner's private agent instructions on his machines, not here; a session that cannot find
it asks the owner. Read it before writing copy that states facts about him.

It holds personal data. Never write its location, its contents, or anything from it that
the site does not already publish into this public repo: not in files, commit messages
or pull requests.

## Palette

Extracted from the official logo SVGs. The hex values are exact; do not approximate.

| Colour     | Hex       | Use                                                   |
| ---------- | --------- | ----------------------------------------------------- |
| Ink        | `#2A2F32` | Primary text, the R+N letterforms of the mark         |
| Gold       | `#C08C50` | The `.pro` suffix, the mark's gold leg, accent rules  |
| Rule       | `#C8C4BC` | Subtle separators, the vertical divider in the lockup |
| Muted      | `#8C8F97` | Tagline, secondary text, captions                     |
| Background | `#FAF9F7` | Site and document background                          |

No pure black (`#000000`) or pure white (`#FFFFFF`): always the warm equivalents above.

### On the site

The light theme in `src/styles/tokens.css` uses the palette as `--clr-bg`, `--clr-text`
(ink), `--clr-border` (rule) and `--clr-accent` (gold). The dark theme has no counterpart
in the palette; its values are the site's own.

Text meets WCAG AA (4.5:1) in both themes, and that decides two deviations:

- **No brand muted for text.** `#8C8F97` is 3.07:1 on the background, so secondary and
  small text (`--clr-muted`) uses a darker warm grey, `#6B6663` (5.4:1 on the
  background, 5.0:1 on the surface). The brand muted stays in the logos and the social
  card.
- **Gold is not a text colour at rest.** `#C08C50` is 2.8:1 on the light background.
  Hover states, the title caret, drop caps and list bullets stay in it by design, though
  that is below AA; any other text in gold uses `--clr-accent-text`, darkened for AA, and
  text on gold uses `--clr-on-accent`.

`npm run check:contrast` (part of the gate and of CI) holds this: it computes every
text-on-background pairing, in every theme, from the tokens, and fails when a stylesheet
colours text with a token it does not check. A new pairing goes in `PAIRS` in
`scripts/check-contrast.mjs`. Lighthouse also fails any page with a contrast error, but
it only sees the light theme.

The background and ink are repeated outside the stylesheet, so a change to them must
reach these too: `public/favicon.svg`, `CREAM` in `scripts/build-favicon.mjs` (rerun it
and commit `favicon.ico` and `apple-touch-icon.png`), the `theme-color` metas in
`src/components/SEO.astro`, and `assets/og/og-default.svg` (`npm run og`).

## Typography

| Use                         | Family                            | Weight     | Notes                               |
| --------------------------- | --------------------------------- | ---------- | ----------------------------------- |
| Wordmark "nestorangulo.pro" | Montserrat                        | 300 Light  | Large display, in the lockup        |
| Tagline                     | Montserrat                        | 500 Medium | Uppercase, `letter-spacing: 10.5`   |
| Document body               | Calibri or Montserrat 300         | Regular    | One per document, consistently      |
| Fallback                    | Helvetica Neue, Arial, sans-serif | —          | Only when Montserrat is unavailable |

Montserrat is for brand assets: the logos and the social cards, which embed it from
`assets/fonts/` (`scripts/lib/og.mjs`). The site's text faces are its own, set in
`src/styles/tokens.css`: Fraunces for display, IBM Plex Sans for body, IBM Plex Mono for
code and metadata.

### The drop cap

Every page opens its text with a drop cap in the gold: the first letter in Fraunces light
italic, or the whole number when the text starts with one (the talk count that opens
Speaking). Home, About, Writing, Speaking, Contact and every essay and talk carry it; the
404 does not, nor a talk with no abstract. It marks where the reading starts, the same on
every page, so a page without it looks unfinished next to the others.

How it is built is in `src/lib/lead.mjs`: a page renders its first paragraph with
`<Lead>`, and Markdown gets it from the `hastLead` plugin, so a new essay or talk needs
nothing. `npm run check:dropcap` (part of the gate and of CI) fails a built page without
one, with two, or whose number would come out with only its first digit in gold.

## Logos and tagline

The logo files are in `public/images/`:

| File                                     | What                         | Use                               |
| ---------------------------------------- | ---------------------------- | --------------------------------- |
| `imagotipo-nestorangulo-pro-tagline.svg` | Full lockup with the tagline | Main branded artefact, full size  |
| `imagotipo-nestorangulo-pro.svg`         | Full lockup, no tagline      | Secondary or header use           |
| `isotipo-nestorangulo-pro.svg`           | The mark alone (NR monogram) | Constrained space, repeating mark |

The official tagline:

```text
SECURITY · ENGINEERING · LEADERSHIP
```

Always uppercase, tracked, in muted `#8C8F97`, Montserrat Medium 500. It is used in the
lockup with the tagline and in any formal branded output. "Builder of security programs
from zero" and "Building pragmatic security programs from zero" are **not** the tagline:
they are body copy from the site, fine in headlines and summaries but not part of the
lockup.
