#!/usr/bin/env node
/**
 * Asserts the content contract of the Markdown sources.
 *
 * The Zod schema in `src/content.config.ts` knows the *shape* of a card — a
 * `summary` is a string, a `cover` is an image. It cannot know what the rest of
 * the site assumes about it: that a published talk has a blurb to show, that the
 * featured shelf holds six, that a slides URL names the file it was built from,
 * that an essay's social card really is 1200×630. Each of those breaks quietly
 * (a blank card, a seventh talk silently cut, a slide link that 404s) and the
 * build, the type check and Lighthouse all stay green.
 *
 * Reads `src/content/` and `public/` directly — no build needed, so it runs
 * first in the gate and in its own CI job. `--root <dir>` points it at another
 * tree; the tests use that to feed it deliberately broken fixtures.
 *
 * Dependencies: `yaml`, through scripts/lib/frontmatter.mjs. No network.
 */

import { existsSync, readdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { readEntry } from './lib/frontmatter.mjs';
import { blank, coverMissing, DESCRIPTION_MAX, ogImageProblem } from './lib/content.mjs';

const args = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const ROOT = resolve(rootFlag === -1 ? '.' : (args[rootFlag + 1] ?? '.'));

/** The featured shelf at the top of /speaking holds this many talks. */
const SHELF = 6;

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLIDES_HOST = 'assets.nestorangulo.pro';

function entries(collection) {
  const dir = join(ROOT, 'src/content', collection);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .sort()
    .map((f) => {
      const file = join(dir, f);
      return { collection, name: f, stem: basename(f, extname(f)), file, ...readEntry(file) };
    });
}

const talks = entries('talks');
const writing = entries('writing');
const all = [...talks, ...writing];

const failures = [];
const warnings = [];

/** One labelled check; `offenders` are the human-readable lines that broke it. */
function check(label, offenders) {
  if (offenders.length === 0) {
    console.log(`  ok    ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures.push({ label, detail: offenders.map((o) => `  ${o}`).join('\n') });
  }
}

const where = (e) => `${e.collection}/${e.name}`;

console.log(`\nchecked ${talks.length} talk(s), ${writing.length} essay(s) in ${ROOT}\n`);

// ── Both collections ───────────────────────────────────────────────────────

check(
  'filenames are lowercase kebab-case',
  all.filter((e) => !KEBAB.test(e.stem)).map((e) => `${where(e)}`)
);

check(
  'cover set => coverAlt is non-empty',
  all
    .filter((e) => e.data.cover && blank(e.data.coverAlt))
    .map((e) => `${where(e)}: cover without coverAlt`)
);

// `cover` is a path relative to the card, resolved by Astro's image() helper.
check(
  'cover file exists',
  all
    .filter((e) => e.data.cover && coverMissing(e.file, e.data.cover))
    .map((e) => `${where(e)}: ${coverMissing(e.file, e.data.cover)}`)
);

// ── Essays ─────────────────────────────────────────────────────────────────

check(
  'ogImage is /-rooted, exists under public/, and is a 1200x630 PNG',
  writing
    .filter((e) => e.data.ogImage && ogImageProblem(ROOT, e.data.ogImage))
    .map((e) => `${where(e)}: ${ogImageProblem(ROOT, e.data.ogImage)}`)
);

check(
  'published essays have a summary',
  writing
    .filter((e) => !e.data.draft && blank(e.data.summary))
    .map((e) => `${where(e)}: empty summary`)
);

// ── Talks ──────────────────────────────────────────────────────────────────

check(
  'published talks have a summary',
  talks
    .filter((e) => !e.data.draft && blank(e.data.summary))
    .map((e) => `${where(e)}: empty summary`)
);

const featured = talks.filter((e) => e.data.featured && !e.data.draft);
check(
  `at most ${SHELF} featured, published talks`,
  featured.length > SHELF
    ? [`${featured.length} featured: ${featured.map((e) => e.stem).join(', ')}`]
    : []
);

check(
  'slidesUrl on the assets host is slides/<file-stem>-<10 hex>.pdf',
  talks
    .filter((e) => e.data.slidesUrl && new URL(String(e.data.slidesUrl)).hostname === SLIDES_HOST)
    .filter(
      (e) =>
        !new RegExp(
          `^https://${SLIDES_HOST.replace(/\./g, '\\.')}/slides/${e.stem}-[0-9a-f]{10}\\.pdf$`
        ).test(String(e.data.slidesUrl))
    )
    .map((e) => `${where(e)}: ${e.data.slidesUrl}`)
);

check(
  'slidesUrlExt is not a Google Docs/Slides edit URL',
  talks
    .filter((e) => {
      if (!e.data.slidesUrlExt) return false;
      const u = new URL(String(e.data.slidesUrlExt));
      return u.hostname === 'docs.google.com' && /\/edit(?:$|[/?#])/.test(u.pathname + u.search);
    })
    .map((e) => `${where(e)}: ${e.data.slidesUrlExt}`)
);

// ── Warnings: worth a look, never a failure ────────────────────────────────

for (const e of all) {
  const s = e.data.summary;
  if (typeof s === 'string' && s.length > DESCRIPTION_MAX && blank(e.data.description)) {
    warnings.push(
      `${where(e)}: summary is ${s.length} chars and there is no description; it may be truncated as a meta description`
    );
  }
}

// ── Report ─────────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  warn  ${w}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const f of failures) {
    console.error(`• ${f.label}`);
    console.error(f.detail);
    console.error('');
  }
  process.exit(1);
}

console.log('\nContent contract holds.\n');
