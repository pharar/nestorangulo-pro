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

The day-to-day path is the `npm run talk -- deck …` verbs (`prepare`, `upload`, `link`,
`verify`), driven by the `talk` skill; this document is the why, and the raw `wrangler`
commands for the few things no verb does. Card conventions (the two slides links, how
the detail page renders them) are in [SPEAKING.md](./SPEAKING.md).

## Why the hash is in the filename

Two reasons, and both matter:

1. **Anti-enumeration.** Keys are not guessable, so the bucket cannot be walked by
   trying `slides/wordcamp-madrid-2019.pdf` and friends. The bucket has no listing.
2. **Safe immutable caching.** Because the key changes whenever the bytes change, the
   object can be served with a one-year immutable cache with no risk of a stale copy.
   Re-uploading a corrected deck produces a _new_ key; update `slidesUrl` in the talk
   card and the old object can be deleted at leisure.

Never overwrite an existing key with different bytes — that is the one thing the
cache header makes unrecoverable for anyone who already fetched it.

## Getting wrangler

Wrangler is **not** a dependency of this project and must not become one: the site
deploys through the Cloudflare Pages ↔ GitHub integration, so `wrangler` in
`devDependencies` would add packages to every CI install for a tool CI never runs.
`deck upload` runs it on demand with `npx wrangler@latest`. The one thing to do by hand
is to log in, once per machine:

```bash
npx wrangler@latest login   # browser OAuth; credentials land in ~/.config/.wrangler/
npx wrangler whoami         # confirm the account before uploading
```

## The path

```bash
npm run talk -- deck prepare <slug> <pdf> --event-short "<short event>"
npm run talk -- deck upload <the hash-named file>          # prints the plan
npm run talk -- deck upload <the hash-named file> --yes    # production write
npm run talk -- deck link <slug> <public URL>
npm run talk -- deck verify <slug>
```

What each does, and why it is built that way:

- **prepare** works outside the repo (it refuses an `--out-dir` inside it). Order
  matters: compress first, because Ghostscript strips metadata; then write metadata;
  then hash, so the name describes the bytes that will be served. Compression is kept
  only if the result is at least 25% smaller: Google Slides and Keynote exports are
  usually already optimised and Ghostscript re-encodes them upward. Metadata comes from
  `exiftool`, else `python3` with `pikepdf` (docinfo and XMP, linearized). The Title is
  `<talk title> — <short event>`, the Subject is the card's `event`, and Author and
  Creator carry the name, not the Title.
- **upload** without `--yes` only prints the plan, because it is a production write.
  With `--yes` it first looks at the public URL: keys are content-addressed, so an
  object that is already there is left alone, never overwritten. It checks that the file
  name matches the file's real hash, runs the `put` with `--remote`, and then refuses to
  call it done unless wrangler printed `Resource location: remote` and a `HEAD` of the
  public URL shows 200, `application/pdf`, `immutable` and the local file's size.
- **link** points `slidesUrl` at the R2 URL. A previous external `slidesUrl` moves to
  `slidesUrlExt` first so its provenance survives; nothing is overwritten.
- **verify** is a `HEAD` of every `slidesUrl` on the assets host; it exits non-zero if
  any is wrong. Run it on the PR branch before merging: a `404` means the object is not
  in the bucket, whatever wrangler said.

> **`--remote` is not optional.** Wrangler 4 inverted the default for the R2 commands:
> without it, the object is written to a local simulator under `.wrangler/state/` in
> the current directory and never reaches Cloudflare. It still prints
> `Upload complete.`, so the success message proves nothing. The `Resource location:`
> line must say `remote`, and the public URL must answer. If a stray `.wrangler/`
> appears next to the deck, that upload went nowhere; delete it and re-run. Every R2
> command in this document carries `--remote` for that reason.

Without Cloudflare auth on the machine (a sandboxed shell, a fresh box), the upload is
the owner's step: leave the hash-named file ready and hand over the command that
`deck upload` prints.

The R2 object lives on a different origin, so it is deliberately absent from the
site's sitemap. It is crawlable through its link; that is enough.

## Replacing or removing a deck

No verb covers these, so use wrangler directly. Both need `--remote`.

```bash
# fetch an object back
npx wrangler@latest r2 object get nestorangulo-assets/slides/<key>.pdf --file=/tmp/check.pdf --remote

# delete an object superseded by a new hash
npx wrangler@latest r2 object delete nestorangulo-assets/slides/<old-key>.pdf --remote
```

A corrected deck is a new `deck prepare` and a new key, never an overwrite. Update
`slidesUrl` in the same PR that changes the object (`deck link`), so a deployed page never
points at a key that no longer exists; the old object can then be deleted at leisure.
