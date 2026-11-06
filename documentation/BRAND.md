# Brand

The visual identity of nestorangulo.pro: palette, type, logos and tagline. The site, the
social cards and any other branded output take their values from here.

## What is not in this repo

Identity facts, contact addresses, dates, and the voice and copy guidelines live in the
owner's **private brand reference**, outside every repository:

```text
~/Dropbox/Business/nestorangulo.pro/Brand/BRAND/BRAND.md
```

It is on the owner's Mac and Linux machines; a cloud or sandboxed session will not have
it, so ask the owner for what you need. Read it before writing copy that states facts
about him. It holds personal data, so never copy it, or anything from it that the site
does not already publish, into this public repo.

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
(ink), `--clr-border` (rule), `--clr-subtle` (muted) and `--clr-accent` (gold), with one
deliberate exception: the brand muted is 3.07:1 on the background, below WCAG AA (4.5:1)
for body-size text, so secondary text (`--clr-muted`) uses a darker grey, `#6B6663`
(5.4:1), and the brand muted is kept for the faintest text. The dark theme has no
counterpart in the palette; its values are the site's own.

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
