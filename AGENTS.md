# AGENTS.md

Rules for every agent session in this repo. `CLAUDE.md` imports this file.

`nestorangulo.pro` is a static Astro 7 personal site (talks and essays as Markdown
content collections), deployed by Cloudflare Pages straight from `main`. The truth
lives in [README.md](./README.md) and [documentation/](./documentation/); this file
only holds what a session must know before touching anything.

## Session isolation

Several agent sessions often run in parallel, and the main checkout lives in Dropbox,
shared between a Mac and a Linux box, so its `node_modules` may hold native bindings
for the other platform.

- Never switch the main checkout's branch. Never run `npm ci` / `npm install` in it.
- Work in a `git worktree` outside Dropbox, off `origin/main`, and `npm ci` there:
  `git fetch origin && git worktree add -b <branch> <path> origin/main`
- If `git fetch` over SSH hangs, the repo is public; HTTPS works without credentials:
  `git fetch https://github.com/pharar/nestorangulo-pro.git '+refs/heads/*:refs/remotes/origin/*'`

## Shipping

- Branch, then a PR to `main`. Never push to `main`: Cloudflare deploys it whether or
  not CI passed (see [DEPLOY.md](./documentation/DEPLOY.md)).
- Do not push, open a PR, merge, upload to R2, or change anything outside the repo
  (Cloudflare dashboard, DNS, buckets) without explicit confirmation from the owner.
- Run `npm run gate` before handing anything over. It runs every local check: format,
  content contract, script tests, types, build, URL, CSP and AI-readable-layer contracts.

## Invariants

- `trailingSlash: 'always'`. Canonicals come from `Astro.url.href`, never a hardcoded
  prop; internal links carry the slash.
- CSP is `'self'`-only. A third-party origin means editing `astro.config.mjs`.
- Generated assets under `public/` (favicons, OG cards) are committed; deploy does not
  regenerate them.
- Never hardcode the talk count; it is derived in `src/lib/talks.ts`.
- Slide PDFs never go in git or `public/`. They live in R2 ([SLIDES-R2.md](./documentation/SLIDES-R2.md)).
- `wrangler` is not a dependency. Do not add it.
- Themes come from one list, `src/data/themes.ts`, shared by talks and essays.

## Honesty rule for content

Never invent or approximate a talk's title, date, event or abstract. Never rewrite the
owner's prose unasked. If something cannot be verified, set `draft: true` and leave the
field empty rather than filling it with a guess. `src/content/` is authored material:
change it only when asked to.

## The convention

A repeatable action is codified as three things, each owning one thing:

- a **skill** in `.claude/skills/<name>/SKILL.md`: the order of operations and the
  judgement calls;
- a **script** in `scripts/` with `npm run` aliases: the mechanics, and the only place
  commands are defined;
- a **doc** in `documentation/`: the why, and any log.

Nothing is stated in two places; link instead. One skill per domain with verbs, not one
skill per verb. Scripts are dependency-light ESM `.mjs` with a header comment saying why.
Shared helpers go in `scripts/lib/` (`gate.mjs`, `frontmatter.mjs` for editing a card's
frontmatter field by field without reformatting it), with `node:test` tests beside them.

## Action index

| Action                       | Skill                       | Command                                                                | Doc                                                                  |
| ---------------------------- | --------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Update dependencies, runtime | `housekeeping`              | `npm run housekeeping`, `housekeeping:baseline`, `housekeeping:verify` | [HOUSEKEEPING.md](./documentation/HOUSEKEEPING.md)                   |
| Keep the AI-readable layer   | `ai-readable-layer`         | `npm run check:ai`                                                     | [AI-READABLE.md](./documentation/AI-READABLE.md)                     |
| Run every local check        | (none; part of every skill) | `npm run gate`                                                         | this file                                                            |
| Check content rules          | (none yet)                  | `npm run check:content`                                                | header of `scripts/check-content.mjs`; [README](./README.md#content) |

Add a row when a new repeatable action gains its skill, script and doc.
