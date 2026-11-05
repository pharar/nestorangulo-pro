---
name: post
description: Write and publish an essay on nestorangulo.pro — scaffold a draft, set its frontmatter, make its social card, preflight it, publish it and verify it live, including the RSS feed. Use for "new essay", "publish a post", "write-up", "social card", "RSS", "add an article to /writing". Spanish — nuevo post, nuevo ensayo, publicar un ensayo, publicar un artículo, artículo, tarjeta social, imagen para redes, feed RSS.
---

# Post

Take an essay from a title to a live page, with a social card and a feed entry. The
commands are in `scripts/post.mjs` (`npm run post -- <verb>`; `list`, `new`, `og`,
`check`, `publish`, `touch`, all with `--dry-run` where they write). The why and the
schema are in `documentation/WRITING.md`. This file is the order and the judgement calls.

## 1. Isolate

Work in a worktree on a `content/<slug>` branch, per `AGENTS.md` (Session isolation).
Do not restate or shortcut it.

## 2. Scaffold

`npm run post -- new "<title>"` (add `--language es` for Spanish). It refuses to overwrite
and creates a `draft: true` file that builds. Use `--dry-run` first when unsure of the slug.

## 3. The text is the owner's

Place the text exactly as given. Do not rewrite, tighten, reorder or "improve" it unasked;
if something reads wrong, say so in the conversation as a suggestion and let him decide.
Never invent facts, quotes, figures, dates or links to make a paragraph land. If a claim
needs a source you do not have, leave it and ask.

## 4. Frontmatter

Fields are listed in WRITING.md. The judgement calls:

- `summary` is the listing blurb, in his voice. If he has not given one, ask; do not write
  it. A published essay must have one.
- `description` is the meta tag text, only for when the summary is too long (over 160
  characters) or too conversational for a search result. Ask rather than write it for him.
- `themes` come from `src/data/themes.ts` and nowhere else. If none fits, ask; adding a
  theme is a separate decision (it is shared with the talks).
- `subtitle` is optional; leave it empty rather than inventing one.
- `updated` is for a substantive edit after publishing: `npm run post -- touch <slug>`.
- When the text mentions a talk of his, link it as `/speaking/<id>/` with the trailing
  slash, and confirm the talk exists under `src/content/talks/`.

## 5. Figures

Put images in `src/images/writing/` and reference them relatively from the Markdown
(`../../images/writing/x.jpg`) so Astro processes them. Alt text says what is actually in
the image, as seen, not what it is meant to illustrate. Look at the file before writing it.
`cover` and `coverAlt` follow the same two rules.

## 6. Social card

```bash
npm run post -- og <slug>            # the cover is the background
npm run post -- og <slug> --accent "two words"   # last word is gold unless told otherwise
```

Open the PNG and look at it before accepting it: the title must read, the gold part must
make sense as emphasis, and the crop must not cut anything important. If the default
accent looks wrong, choose another phrase with `--accent` and say what you chose. Then add
the `ogImage: /og/<slug>.png` line the command prints. The PNG is committed, so it goes in
the commit.

## 7. Check, gate, look

```bash
npm run post -- check <slug>
npm run gate
npm run build && npm run preview
```

Fix every `FAIL` in the file's metadata; a `FAIL` in the text itself (alt text, a link,
a placeholder) goes to the owner, since the text is his. Read a `warn` rather than
dismissing it. Preview the built site, not `npm run dev`: the CSP and headers differ. A
draft is not built, so run `publish` (step 8) first to see the page; until you commit it
is only a working-tree change, and `draft: true` puts it back.

## 8. Publish and hand over

`npm run post -- publish <slug>` runs the check again and flips `draft` (pass `--date` if
the day is not today). Commit. Do not push, open a PR or merge without confirmation.
Tell him: the files changed, the check output, any `warn`, and what you chose (accent,
alt text).

## 9. After the merge

Once Cloudflare has deployed, verify on the live site: the page at
`https://nestorangulo.pro/writing/<slug>/`, the card with
`curl -I https://nestorangulo.pro/og/<slug>.png` (200, `image/png`), and that
`https://nestorangulo.pro/rss.xml` lists the essay with an absolute, trailing-slash link.

## 10. Announcing

Posting to LinkedIn, X or Bluesky is not automated yet. Say so; do not improvise it or
draft posts in his name unasked.
