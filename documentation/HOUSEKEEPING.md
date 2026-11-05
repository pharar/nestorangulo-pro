# Housekeeping

Keeping every piece this site is built from on its latest release — as far as that goes
without breaking anything — and proving it afterwards.

Dependabot covers part of this on its own (see [Dependabot](#dependabot)). A housekeeping
run is for what it cannot see or decide: the Node and npm pins, overrides that have
outlived their reason, majors that are deliberately held, and the question Dependabot
never answers — _did the built site change?_

Run one when Dependabot PRs start to pile up, when an advisory lands, or about once a
month. The whole procedure is scripted in `scripts/housekeeping.mjs`; the Claude Code
skill in `.claude/skills/housekeeping/` drives the same commands.

---

## The procedure

```bash
git switch -c chore/housekeeping-YYYY-MM origin/main
nvm use && npm ci

npm run housekeeping:baseline            # 1. snapshot the site BEFORE touching anything
npm run housekeeping                     # 2. what is behind?

# 3. apply updates — see "What 'latest' means" below

npm run housekeeping:verify -- --assets  # 4. the gate, plus a diff against the snapshot
npm run housekeeping                     # 5. should now list only held items and the
                                         #    Dependabot PRs this branch supersedes
```

Then add a row to the [run log](#run-log), commit, push, and open a PR like any other
change. CI adds the two things the local gate does not run: the link check and Lighthouse.

Step 1 has to come first. The baseline is a copy of `dist/` built from the untouched
checkout, kept outside the repo (under the system temp directory, so neither `npm ci` nor
a rebuild disturbs it). Without it, step 4 can still tell you the site _builds_, but not
whether it still builds _the same site_.

### The commands

| Command                                   | What it does                                                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run housekeeping`                    | Read-only report: runtime pins, outdated dependencies, held majors, overrides, advisories, Dependabot alerts, CI action versions, open Dependabot PRs                                    |
| `npm run housekeeping:baseline`           | Builds and snapshots `dist/` for later comparison                                                                                                                                        |
| `npm run housekeeping:verify`             | The shared gate (`npm run gate`: format, content contract, script tests, types, build, URL, CSP and AI-readable-layer contracts), `npm audit`; then diffs the build against the baseline |
| `npm run housekeeping:verify -- --assets` | The same, and regenerates the favicons and OG card to confirm the committed files still come out byte-identical                                                                          |
| `npm run housekeeping:probe-ts`           | Installs the newest TypeScript, runs `astro check`, restores everything. Takes a version or dist-tag: `… -- beta`                                                                        |
| `npm run check:csp`                       | The CSP contract on its own: every inline script and style in `dist/` is allowed by the policy the page declares. Needs a build first.                                                   |

The report needs the network: the npm registry, nodejs.org, and the GitHub API. The
repository is public, so most of it works without a token, but anonymous GitHub access is
limited to 60 requests an hour and one report uses around fifteen. It picks up `GH_TOKEN`,
`GITHUB_TOKEN`, or a logged-in `gh` on its own if there is one. A section that cannot
reach its source says so and the rest still run.

The one part that does need a token is **Dependabot alerts**, which are private even on a
public repository; without one that line is skipped. It is worth having. `npm audit`
counts vulnerable _packages_ while GitHub counts _advisories_, and GitHub keeps counting
them against `main` until a fix is merged — the first run saw 9 from one and 40 from the
other for the same lockfile. Neither number is the useful one on an update branch, so the
report answers the question that is: does the lockfile in this checkout clear every open
alert, and if not, which packages are still short.

`--assets` renders the OG card through headless Chromium, so the first run on a machine
(or after a Playwright bump) needs `npx playwright install chromium`.

### Reading the verify output

Each gate step is `ok` or `FAIL`; a `FAIL` prints the tail of that command's output and
the run exits non-zero.

The comparison that follows is different — it never fails the run. It strips what is
expected to change on any upgrade (the `Astro vX.Y.Z` generator string, content hashes in
asset filenames, `sha256-…` values in the CSP) and reports what is left as `REVIEW`. Pages
that changed in the same way are folded into one entry, so a change to the shared layout
reads as one item rather than 43.

A `REVIEW` line is a question, not a verdict. Upgrades are allowed to change output; what
matters is that every change is understood. The first run is the example to follow: it
showed `style-src 'self' 'sha256-…'` becoming `style-src 'self'` on every page. That
looked like a lost hash until the hash turned out to be the SHA-256 of the empty string —
Astro 7.3 emitted it although the pages carry no inline styles, Astro 7.4 stopped. Nothing
was unprotected before or after, and `check:csp` confirmed it.

---

## What "latest" means for each piece

"Update everything" needs a different rule for each kind of thing.

| Piece                   | Pinned in                        | Target                                        | How to move it                                            |
| ----------------------- | -------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| Direct dependencies     | `package.json`                   | Latest release                                | `npm install <name>@latest` for each one the report lists |
| Transitive dependencies | `package-lock.json`              | Latest each range allows; `npm audit` at zero | `npm update`                                              |
| Overrides               | `package.json` → `overrides`     | None, unless one still has a reason           | Delete it, `npm install`, read `npm ls <name>`            |
| Node                    | `.nvmrc` **and** Cloudflare      | Newest **LTS** line — never the Current line  | [Below](#moving-the-node-pin)                             |
| npm                     | `package.json`→ `packageManager` | Latest release that supports the pinned Node  | [Below](#moving-the-npm-pin)                              |
| GitHub Actions          | `.github/workflows/*.yml`        | Latest major tag                              | Edit the `@vN`; Dependabot normally does this             |
| TypeScript major        | —                                | [Held](#typescript)                           | —                                                         |

`npm install <name>@latest` is used rather than `npm update` for direct dependencies
because it moves the range in `package.json` along with the lockfile. `npm update` alone
would leave `"astro": "^7.3.2"` in the manifest while 7.4.5 is installed, and the manifest
is where a reader looks.

A new **major** of a direct dependency is not automatically in scope. Read its migration
notes first; if it needs code changes, give it its own branch rather than burying it in a
housekeeping run.

Not pinned on purpose: `@lhci/cli` is installed fresh in CI (`npm install -g @lhci/cli`),
and CodeQL is GitHub's default setup. Both float to latest by themselves.

### Overrides

An override is a debt with a due date. Each one was added for a reason that upstream will
eventually fix, and nothing tells you when that has happened — Dependabot does not look at
overrides, and an override that has gone stale can end up holding a package _below_ what
its own dependent asks for. So every run re-justifies every one of them, and the report
lists each as a question.

Current:

| Override                                     | Why                                                                                                                                                                                                | Drop when                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `@astrojs/check` › `typescript: $typescript` | Makes the checker use the root TypeScript rather than resolving its own copy. Without it a TypeScript bump can leave two versions installed and `astro check` running on the one nobody looked at. | `astro check` is no longer the type check. |

Removed, and why they were there:

| Override          | Added      | Removed    | Story                                                                                                                                                                                                                                                                               |
| ----------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `satteri: 0.10.3` | 2026-08-19 | 2026-11-05 | 0.10.4 was published without its `darwin-arm64` and `linux-x64-musl` binaries, so the build died at runtime on Apple Silicon. 0.10.5 ships all nine platforms. By the time it was removed, Astro 7.4.5 required `^0.10.5` — the pin was holding satteri below what Astro asked for. |
| `yaml: ^2.8.3`    | 2026-08-19 | 2026-11-05 | A floor to clear an advisory. Every consumer now resolves 2.8.3 or newer unaided.                                                                                                                                                                                                   |

Adding one: put the reason and the removal condition in the table above in the same
commit. If the condition cannot be written down, it is not ready to be an override.

### Moving the Node pin

Target the newest LTS line. The report reads it from nodejs.org.

1. Change `.nvmrc`. CI follows it immediately (`node-version-file` in every job).
2. Re-run `npm ci` and `npm run housekeeping:verify -- --assets` **on the new version**
   (`nvm install <major> && nvm use`).
3. Update the version named in `README.md` and `documentation/DEPLOY.md`.
4. Change `NODE_VERSION` in Cloudflare — see
   [Pieces that live outside the repo](#pieces-that-live-outside-the-repo). Until this is
   done production keeps building on the old line.

`engines.node` is a floor — the oldest line the build is known to work on — not a copy of
the pin. Raise it only when an old line is actually dropped.

### Moving the npm pin

`packageManager` names the npm release the lockfile is known to work with. Take the
latest one whose `engines.node` accepts the pinned Node (the report prints it), then check
that it leaves the lockfile alone and passes the gate:

```bash
npx npm@<version> ci            # must succeed
git status --short              # package-lock.json must not be modified
npx npm@<version> run build
```

npm 11 and npm 12 both read and write this lockfile identically, so the pin can run ahead
of the npm that ships with Node.

---

## Held back

### TypeScript

**Held at 6.x. Last checked 2026-11-05, against TypeScript 7.0.2 and `@astrojs/check`
0.9.12.**

The hold has nothing to do with this site's code. `astro check` drives TypeScript through
its programmatic API; TypeScript 7 is the native rewrite and does not expose that API.
`@astrojs/check` 0.9.12 still declares `typescript: ^5.0.0 || ^6.0.0`, and on 7.0 it now
refuses outright:

> astro check does not currently support TypeScript 7.0. To continue using astro check,
> install TypeScript 6 instead.
>
> astro check will be deprecated in a future Astro release. Experimental support for
> type-checking Astro files with TypeScript 7.1+ is available through
> @astrojs/ts-content-mapper.

That message is also the roadmap. `astro check` is not going to gain TypeScript 7 support;
it is going to be replaced by plain `tsc` reading `.astro` files through a _content
mapper_, which is a TypeScript 7.1 feature. So there are two ways the hold can lift, and
`npm run housekeeping` watches both:

1. `@astrojs/check` widens its peer range to include the new major. Unlikely, given the
   deprecation notice, but cheap to check. Confirm with `npm run housekeeping:probe-ts`.
2. **TypeScript 7.1 reaches a stable release.** This is the real one.

#### The content-mapper route

Tried on 2026-11-05 with `typescript@7.1.0-beta` and `@astrojs/ts-content-mapper@0.2.0`.
It works: `tsc` picked up all 24 `.astro` files and reported zero errors, and — the part
that matters — it reported a deliberately planted type error in `src/pages/404.astro`. It
was not adopted because it needs a TypeScript beta and a package that describes itself as
experimental. When 7.1 is stable:

```bash
npm install -D typescript@latest @astrojs/ts-content-mapper@latest
```

`tsconfig.json`, alongside `compilerOptions`:

```json
"contentMappers": [{ "package": "@astrojs/ts-content-mapper", "extensions": [".astro"] }]
```

```bash
npx astro sync                        # regenerate .astro/types.d.ts
npx tsc --noEmit --runExternalCode    # the new type check
```

`--runExternalCode` is required: a content mapper is code from `node_modules` running
inside the compiler, and TypeScript wants that opted into explicitly.

**Do not trust a clean run until it has caught something.** Silence proves nothing here:
earlier TypeScript 7 attempts made `astro check` exit without printing a single
diagnostic, and a `tsc` that quietly skips `.astro` files prints nothing either — and
exits 0. Check both:

```bash
npx tsc --noEmit --runExternalCode --listFilesOnly | grep -c '\.astro$'   # expect > 0
# add `const probe: number = 'x';` to the frontmatter of any page, then:
npx tsc --noEmit --runExternalCode                                         # expect TS2322
```

Then finish the migration, all in one PR:

- `package.json`: `"check": "astro sync && tsc --noEmit --runExternalCode"`; remove
  `@astrojs/check` and its entry under `overrides`
- `.github/dependabot.yml`: delete the `typescript` entry under `ignore`
- `scripts/housekeeping.mjs`: delete `typescript` from `HELD`
- `README.md` and this file: the type-check description, and move this section into the
  run log

---

## Dependabot

`.github/dependabot.yml` opens PRs weekly for npm and for GitHub Actions. npm updates are
grouped so that related changes arrive together:

| Group              | What lands in it                                            |
| ------------------ | ----------------------------------------------------------- |
| `astro`            | `astro` and `@astrojs/*` — they release together            |
| `dev-dependencies` | Everything under `devDependencies`                          |
| `security`         | Every security update, direct or transitive, in a single PR |

The `security` group exists because security updates ignore the other groups. Before it
was added, six advisories in transitive packages (vite, zod, undici, devalue, fast-uri,
source-map-js) arrived as six separate PRs over four weeks, each needing its own CI run
and merge. `open-pull-requests-limit` does not apply to security updates either, which is
how eight PRs came to be open against a limit of five.

**A green Dependabot PR can simply be merged.** A housekeeping run is not a prerequisite
for each one; it is what you do when several have stacked up, or when the report shows
something Dependabot does not track.

**A housekeeping branch supersedes the open PRs** it overlaps with. Name them in the
commit message. Once the branch is merged, Dependabot notices that `main` already has the
version and closes each PR itself on its next run — there is no need to close them by
hand, and merging them afterwards would only produce conflicts in `package-lock.json`.

Dependabot does not see: `.nvmrc`, `packageManager`, `overrides`, or the `NODE_VERSION`
variable in Cloudflare. Those are the report's job.

---

## Pieces that live outside the repo

A change in the repo does not move these, and nothing in CI will tell you they have
drifted.

| Piece                     | Where                                                                       | When to touch it                                                                                    |
| ------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `NODE_VERSION`            | Cloudflare dashboard → the Pages project → Settings → Environment variables | Whenever `.nvmrc` changes major. Set it for **both** Production and Preview. It wins over `.nvmrc`. |
| Required status checks    | GitHub → Settings → Rules → Rulesets                                        | Whenever a CI job is renamed, added or removed — the ruleset matches jobs by name.                  |
| CodeQL                    | GitHub → Settings → Code security (default setup)                           | Nothing to maintain; it is not in `.github/workflows/` and updates itself.                          |
| Local Node                | Your machine                                                                | `nvm install` after `.nvmrc` moves, or `nvm use` fails.                                             |
| Chromium for `npm run og` | Your machine (`~/.cache/ms-playwright`)                                     | `npx playwright install chromium` after a Playwright bump.                                          |

To confirm which Node a deploy really used, open the deployment in the Cloudflare
dashboard and read the top of its build log.

---

## Run log

One row per run, newest first. The commit messages hold the detail; this is the index.

| Date       | Moved                                                                                                                                                                                                                                                                       | Held / left                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 2026-11-05 | astro 7.3.2 → 7.4.5; @astrojs/check, playwright, prettier, prettier-plugin-astro, sharp to latest; full transitive refresh, 9 advisories → 0; `satteri` and `yaml` overrides removed; Node 24 → 26 LTS; npm 11.12.1 → 12.2.2. Superseded Dependabot #35, #39, #41–#45, #48. | TypeScript 6.0.3 (7.0.2 unsupported by `astro check`). GitHub Actions already current. |
