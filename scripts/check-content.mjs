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

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { readEntry } from './lib/frontmatter.mjs';

const args = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const ROOT = resolve(rootFlag === -1 ? '.' : (args[rootFlag + 1] ?? '.'));

/** The featured shelf at the top of /speaking holds this many talks. */
const SHELF = 6;
/** Longest `summary` that still makes a sensible meta description. */
const DESCRIPTION_MAX = 160;

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

/**
 * True when `url` is exactly `slides/<stem>-<10 hex>.pdf` on the assets host.
 * Compared as strings: the stem comes from a file name, and building a pattern
 * out of it would let a name with regex syntax in it change what is matched.
 */
function isDeckUrlFor(stem, url) {
  const prefix = `https://${SLIDES_HOST}/slides/${stem}-`;
  const s = String(url);
  return s.startsWith(prefix) && /^[0-9a-f]{10}\.pdf$/.test(s.slice(prefix.length));
}

const where = (e) => `${e.collection}/${e.name}`;
const blank = (v) => typeof v !== 'string' || v.trim() === '';

/** Width and height from a PNG's IHDR chunk, or null when it is not a PNG. */
function pngSize(file) {
  const b = readFileSync(file);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length < 24 || !b.subarray(0, 8).equals(signature)) return null;
  if (b.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

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
    .filter((e) => e.data.cover && !existsSync(resolve(dirname(e.file), String(e.data.cover))))
    .map((e) => `${where(e)}: ${e.data.cover} not found`)
);

// ── Essays ─────────────────────────────────────────────────────────────────

check(
  'ogImage is /-rooted, exists under public/, and is a 1200x630 PNG',
  writing
    .filter((e) => e.data.ogImage)
    .flatMap((e) => {
      const og = String(e.data.ogImage);
      if (!og.startsWith('/')) return [`${where(e)}: ogImage "${og}" must start with /`];
      const file = join(ROOT, 'public', og);
      if (!existsSync(file)) return [`${where(e)}: public${og} does not exist`];
      const size = pngSize(file);
      if (!size) return [`${where(e)}: public${og} is not a PNG`];
      if (size.width !== 1200 || size.height !== 630) {
        return [`${where(e)}: public${og} is ${size.width}x${size.height}, expected 1200x630`];
      }
      return [];
    })
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
    .filter((e) => !isDeckUrlFor(e.stem, e.data.slidesUrl))
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
