---
name: housekeeping
description: Check and update everything this repo is built from — npm dependencies, overrides, the Node and npm pins, GitHub Actions, open Dependabot PRs — to the latest release that does not break the site, then prove it with the local gate and a diff of the built output. Use for "housekeeping", "check & update", "update dependencies", "review Dependabot", "are we up to date", "is TypeScript 7 supported yet". Spanish — housekeeping, mantenimiento, poner al día, actualizar dependencias, actualizar librerías, revisar dependabot.
---

# Housekeeping

Bring every piece of this repo to its latest release, as far as that goes without
breaking the site, and leave evidence that nothing broke.

The commands do the mechanical work. Read `documentation/HOUSEKEEPING.md` before
starting: it holds the rule for what "latest" means for each piece, the register of what
is held back and why, and the log of previous runs. This file is the order of operations
and the judgement calls the scripts cannot make.

## 1. Isolate

Work on a branch off `origin/main`, never on `main`. Other sessions may be working in the
main checkout, so do not switch its branch or touch its working tree — use a separate
worktree:

```bash
git fetch origin
git worktree add -b chore/housekeeping-YYYY-MM <path-outside-the-repo> origin/main
cd <that path> && npm ci
```

If `git fetch` over SSH hangs, the repo is public and HTTPS works without credentials:
`git fetch https://github.com/pharar/nestorangulo-pro.git '+refs/heads/*:refs/remotes/origin/*'`.

## 2. Baseline, then report

```bash
npm run housekeeping:baseline   # BEFORE any change — this is what verify diffs against
npm run housekeeping
```

Read the Dependabot PRs the report lists before changing anything: their checks tell you
which bumps CI has already seen green, and a failing one is a warning about that bump.
The report reads them through the public API, so it works without `gh` being logged in —
except for Dependabot alerts, which need a token. Log in (`gh auth login`) when you can:
that line says whether the lockfile in this checkout clears every open alert.

## 3. Update, in this order

Verify after each step (`npm run housekeeping:verify`), so a failure points at one change.

1. **Direct dependencies** — `npm install <name>@latest` for each one reported (`-D` for
   dev dependencies), so the range in `package.json` moves too.
2. **Transitive dependencies** — `npm update`, then `npm audit` must report zero.
3. **Overrides** — for each one the report questions, check whether its reason still
   holds (the register is in HOUSEKEEPING.md). If not, delete it, `npm install`, and
   confirm with `npm ls <name>` that nothing resolved below what its dependents ask for.
4. **GitHub Actions** — move any `@vN` the report flags.
5. **Node and npm pins** — only to the newest **LTS** line. Install that Node, re-run
   `npm ci` and the full gate on it, and follow "Moving the Node pin" in HOUSEKEEPING.md,
   which lists the docs to update.
6. **Held majors** — do not take them. Do check whether the hold still applies:
   `npm run housekeeping:probe-ts` (commit or stash `package.json` first; it restores
   both manifests from git when it finishes).

A new major of a direct dependency is not automatically in scope. Read its migration
notes; if it needs code changes, stop and propose a separate branch.

## 4. Verify

```bash
npm run housekeeping:verify -- --assets
```

`--assets` needs Chromium: `npx playwright install chromium` on first use.

- Any `FAIL` is a stop. Fix it or back the change out; do not carry it forward.
- Every `REVIEW` line must be explained, not dismissed. Find out _why_ the output
  changed — which upstream change, and whether the old or new form is the correct one —
  and write the explanation into the commit message. If a hash or a tag disappears,
  establish what it was for before calling it harmless.
- A green result that printed nothing is not evidence. When a check is new or its tool
  just changed, make it fail once on purpose to confirm it is really looking.

## 5. Record

- Add a row to the run log in `documentation/HOUSEKEEPING.md`.
- Update the "Held back" and "Overrides" sections if anything there changed, including
  the "last checked" date.
- Keep `README.md` and `documentation/DEPLOY.md` in step with any version they name.
- If a step of this run was done by hand and will come up again, add it to
  `scripts/housekeeping.mjs` instead of leaving it as prose.

## 6. Commit and hand over

Separate commits by kind, so any one can be reverted alone: dependencies, runtime pins,
tooling/docs. In the dependency commit, list the bumps and name the Dependabot PRs it
supersedes — they close themselves once `main` has the versions.

Do not push, open a PR, or merge unless asked. Do not change anything outside the repo —
in particular the `NODE_VERSION` variable in the Cloudflare dashboard — without explicit
confirmation: that is production configuration.

Finish by telling the user:

- what moved, and from which version to which;
- what was held, with the evidence from this run;
- every `REVIEW` item and its explanation;
- the manual steps left for them (see "Pieces that live outside the repo").
