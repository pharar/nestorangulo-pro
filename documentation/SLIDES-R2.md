# Hosting talk slides on Cloudflare R2

Every deck linked from `/speaking` is served from **Cloudflare R2**, not from this
repo. `public/` is copied verbatim into `dist/` and shipped through Pages, so a PDF
placed there would be committed to git, versioned forever, and counted against the
build. Decks live in R2 instead and are referenced by absolute URL from the talk card.

- Bucket: `nestorangulo-assets`
- Public base: `https://assets.nestorangulo.pro`
- Object key: `slides/<slug>-<hash>.pdf`
- Cache: `public, max-age=31536000, immutable`

`<slug>` is the talk card's filename stem (`src/content/talks/<slug>.md`); `<hash>`
is the **first 10 hex characters of the SHA-256 of the final file**, computed after
metadata is written.

## Why the hash is in the filename

Two reasons, and both matter:

1. **Anti-enumeration.** Keys are not guessable, so the bucket cannot be walked by
   trying `slides/wordcamp-madrid-2019.pdf` and friends. The bucket has no listing.
2. **Safe immutable caching.** Because the key changes whenever the bytes change, the
   object can be served with a one-year immutable cache with no risk of a stale copy.
   Re-uploading a corrected deck produces a *new* key; update `slidesUrl` in the talk
   card and the old object can be deleted at leisure.

Never overwrite an existing key with different bytes — that is the one thing the
cache header makes unrecoverable for anyone who already fetched it.

## Preparing the PDF

Work outside the repo. Order matters: compress first (Ghostscript strips metadata),
then write metadata, then hash.

```bash
SLUG=kozhikode-2026-ai-finds-vulnerabilities
SRC="/path/to/exported-deck.pdf"
mkdir -p /tmp/slides-build

# 1. Try compressing. KEEP THE ORIGINAL if the result is bigger or barely smaller —
#    Google Slides and Keynote exports are usually already optimised, and Ghostscript
#    re-encodes them upward.
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH -sOutputFile="/tmp/slides-build/$SLUG.pdf" "$SRC"
ls -l "$SRC" "/tmp/slides-build/$SLUG.pdf"   # compare before deciding

# 2. Metadata. Author/Creator carry the name; the Title carries talk — short event.
exiftool -Title="<talk title> — <short event>" \
         -Subject="<frontmatter event>" \
         -Author="Nestor Angulo de Ugarte" \
         -Creator="Nestor Angulo de Ugarte" \
         -overwrite_original "/tmp/slides-build/$SLUG.pdf"

# 3. Hash and rename.
HASH=$(shasum -a 256 "/tmp/slides-build/$SLUG.pdf" | cut -c1-10)
mv "/tmp/slides-build/$SLUG.pdf" "/tmp/slides-build/$SLUG-$HASH.pdf"
echo "slides/$SLUG-$HASH.pdf"
```

No `exiftool`? Python `pikepdf` does the same job — set `/Title`, `/Subject`,
`/Author`, `/Creator` in `docinfo` **and** `dc:title`, `dc:creator`,
`dc:description`, `xmp:CreatorTool` in the XMP, then `pdf.save(..., linearize=True)`.

## Uploading

Requires an authenticated `wrangler` (`wrangler login` once; `wrangler whoami` to
check). This is the one step that cannot be delegated to a sandbox — the Cloudflare
credential lives on this machine only.

```bash
wrangler r2 object put "nestorangulo-assets/slides/$SLUG-$HASH.pdf" \
  --file="/tmp/slides-build/$SLUG-$HASH.pdf" \
  --content-type=application/pdf \
  --cache-control="public, max-age=31536000, immutable"
```

Then verify before merging the talk card:

```bash
curl -I "https://assets.nestorangulo.pro/slides/$SLUG-$HASH.pdf"
# expect: HTTP/2 200, content-type: application/pdf, cache-control: ...immutable
```

## Wiring it into the talk card

In `src/content/talks/<slug>.md`:

- `slidesUrl` — always the R2 copy. This is the canonical link and the one the
  "View slides ↗" button uses.
- `slidesUrlExt` — the official event / Slideshare / Drive copy, **only if it is
  public**. It renders as a provenance note under the button, never as a second
  button. Never point it at a private edit URL.

The R2 object lives on a different origin, so it is deliberately absent from the
site's sitemap. It is crawlable through its link; that is enough.

## Replacing or removing a deck

```bash
# list what is there
wrangler r2 object get nestorangulo-assets/slides/<key>.pdf --file=/tmp/check.pdf

# delete an object superseded by a new hash
wrangler r2 object delete nestorangulo-assets/slides/<old-key>.pdf
```

Update `slidesUrl` in the same PR that changes the object, so a deployed page never
points at a key that no longer exists.
