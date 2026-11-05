#!/usr/bin/env node
/**
 * `npm run post -- <verb>`: the mechanics of writing and publishing an essay.
 *
 * Why a script: an essay goes through the same steps every time (scaffold a
 * draft, make its social card, check it is fit to ship, flip it to published),
 * and each has a way to go wrong silently: a blank summary, a card that is the
 * wrong size, an image with no alt text, a link that costs a redirect. The
 * script does the mechanical part and refuses when something is off; the
 * `post` skill (.claude/skills/post/) holds the order and the judgement calls,
 * and documentation/WRITING.md holds the why.
 *
 *   list                         essays, newest first
 *   new "<title>" [--slug s] [--date YYYY-MM-DD] [--language en|es]
 *   og <slug> [--accent "words"] [--image path] [--out path]
 *   check <slug>                 preflight; exit 1 on any failure
 *   publish <slug> [--date D]    check, then draft: false
 *   touch <slug> [--date D]      set `updated` (default today)
 *
 * Every verb that writes accepts --dry-run (print, write nothing). --root <dir>
 * points at another tree (the tests use it). Frontmatter is only ever edited
 * through lib/frontmatter.mjs, one field at a time. The essay's text is never
 * touched: it is the owner's.
 *
 * Dependencies: `yaml`; playwright and sharp for `og` only (see lib/og.mjs).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntry, setField } from './lib/frontmatter.mjs';
import {
  checkEssay,
  essayFile,
  fillTemplate,
  isIsoDay,
  isoDay,
  isSlug,
  kicker,
  loadEssay,
  scaffold,
  slugify,
  titleHtml,
  today,
} from './lib/essay.mjs';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '../assets/og/og-essay.html');
const VALUE_FLAGS = new Set(['slug', 'date', 'language', 'accent', 'image', 'out', 'root']);

class Usage extends Error {}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const name = a.slice(2);
    if (name === 'dry-run') flags.dryRun = true;
    else if (VALUE_FLAGS.has(name)) {
      if (argv[i + 1] === undefined) throw new Usage(`--${name} needs a value`);
      flags[name] = argv[++i];
    } else throw new Usage(`unknown option --${name}`);
  }
  return { positional, flags };
}

const log = (s = '') => console.log(s);
const wouldWrite = (dry, what) => log(dry ? `dry run: would ${what}; nothing written` : what);

function requireDate(value) {
  if (value !== undefined && !isIsoDay(value))
    throw new Usage(`--date must be YYYY-MM-DD, got "${value}"`);
  return value;
}

function slugArg(positional) {
  const slug = positional[1];
  if (!slug) throw new Usage('which essay? give its slug');
  return slug;
}

// ── Verbs ──────────────────────────────────────────────────────────────────

function list(root) {
  const dir = join(root, 'src/content/writing');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /\.mdx?$/.test(f)) : [];
  const rows = files
    .map((f) => {
      const { data } = readEntry(join(dir, f));
      return {
        slug: f.replace(/\.mdx?$/, ''),
        date: isoDay(data.date),
        status: data.draft ? 'draft' : 'published',
        og: data.ogImage ? 'og' : '-',
        title: data.title ?? '',
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  if (rows.length === 0) return log('no essays');
  for (const r of rows) {
    log(`${r.date}  ${r.status.padEnd(9)}  ${r.og.padEnd(2)}  ${r.slug}  ${r.title}`);
  }
  log('\n(columns: date, status, ogImage set, slug, title)');
}

function create(root, { positional, flags }) {
  const title = positional[1]?.trim();
  if (!title) throw new Usage('give the title: post new "<title>"');
  const slug = flags.slug ?? slugify(title);
  if (!isSlug(slug)) {
    throw new Usage(
      flags.slug
        ? `--slug "${slug}" is not lowercase kebab-case`
        : `could not make a slug from "${title}"; pass --slug`
    );
  }
  const language = flags.language ?? 'en';
  if (!['en', 'es'].includes(language)) throw new Usage('--language must be en or es');
  const date = requireDate(flags.date) ?? today();

  const file = essayFile(root, slug);
  if (existsSync(file)) throw new Error(`${file} already exists; choose another --slug`);

  const text = scaffold({ title, date, language });
  if (flags.dryRun) {
    log(`dry run: would create ${file}; nothing written\n`);
    log(text);
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text, { flag: 'wx' });
  log(`created ${file} (draft)`);
  log('next: write the text, fill summary and themes, then `npm run post -- og ' + slug + '`');
}

async function card(root, { positional, flags }) {
  const e = loadEssay(root, slugArg(positional));
  const { title, date, language, cover, ogImage } = e.data;
  const out = flags.out ? resolve(flags.out) : join(root, 'public/og', `${e.slug}.png`);

  const imagePath = flags.image
    ? resolve(flags.image)
    : cover
      ? resolve(dirname(e.file), String(cover))
      : null;
  if (imagePath && !existsSync(imagePath)) throw new Error(`image not found: ${imagePath}`);

  const html = titleHtml(String(title), flags.accent);
  const kick = kicker(date, language);
  if (flags.dryRun) {
    log(`dry run: would render ${out}; nothing written`);
    log(`  kicker  ${kick}`);
    log(`  title   ${html}`);
    log(`  image   ${imagePath ?? '(none: plain dark background)'}`);
  } else {
    const { default: sharp } = await import('sharp');
    const { fontFaces, renderPng } = await import('./lib/og.mjs');
    let coverUri = null;
    if (imagePath) {
      // A card is 1200×630 at 2× in the render: more than 2400px of source is wasted.
      const jpeg = await sharp(imagePath)
        .resize({ width: 2400, withoutEnlargement: true })
        .flatten({ background: '#1a1815' })
        .jpeg({ quality: 90 })
        .toBuffer();
      coverUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    }
    const filled = fillTemplate(readFileSync(TEMPLATE, 'utf8'), {
      fonts: fontFaces(),
      kicker: kick,
      title: html,
      cover: coverUri,
    });
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, await renderPng(filled));
    log(`card written: ${out}`);
  }

  if (!flags.out) {
    const line = `ogImage: /og/${e.slug}.png`;
    if (!ogImage) log(`\nadd to the frontmatter of ${e.file}:\n  ${line}`);
    else if (ogImage !== `/og/${e.slug}.png`)
      log(`\nnote: the frontmatter says ogImage: ${ogImage}`);
  }
}

function report({ failures, warnings }, slug) {
  for (const w of warnings) log(`  warn  ${w}`);
  for (const f of failures) log(`  FAIL  ${f}`);
  if (failures.length === 0) log(`  ok    ${slug} is fit to publish`);
}

function check(root, { positional }) {
  const slug = slugArg(positional);
  const result = checkEssay(root, slug);
  report(result, slug);
  return result.failures.length === 0 ? 0 : 1;
}

function publish(root, { positional, flags }) {
  const slug = slugArg(positional);
  const date = requireDate(flags.date);
  const result = checkEssay(root, slug);
  report(result, slug);
  if (result.failures.length > 0) {
    log('\nnot published: fix the failures above');
    return 1;
  }
  const e = loadEssay(root, slug);
  const changes = [];
  if (e.data.draft === true)
    changes.push(setField(e.file, 'draft', false, { dryRun: flags.dryRun }));
  if (date) changes.push(setField(e.file, 'date', date, { dryRun: flags.dryRun }));
  printChanges(e.file, changes, flags.dryRun, 'already published; nothing to change');
  return 0;
}

function touch(root, { positional, flags }) {
  const e = loadEssay(root, slugArg(positional));
  const date = requireDate(flags.date) ?? today();
  const change = setField(e.file, 'updated', date, { dryRun: flags.dryRun });
  printChanges(e.file, [change], flags.dryRun, `updated is already ${date}`);
  return 0;
}

function printChanges(file, changes, dry, none) {
  const real = changes.filter((c) => c.changed);
  if (real.length === 0) return log(none);
  log(dry ? `dry run: would change ${file}; nothing written` : `changed ${file}`);
  for (const c of real) {
    if (c.before !== null) log(`  - ${c.before}`);
    log(`  + ${c.after}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

const USAGE = `usage: npm run post -- <verb>
  list
  new "<title>" [--slug s] [--date YYYY-MM-DD] [--language en|es] [--dry-run]
  og <slug> [--accent "words"] [--image path] [--out path] [--dry-run]
  check <slug>
  publish <slug> [--date YYYY-MM-DD] [--dry-run]
  touch <slug> [--date YYYY-MM-DD] [--dry-run]
  (all verbs: --root <dir> to work on another tree)`;

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const root = resolve(flags.root ?? '.');
  const args = { positional, flags };
  switch (positional[0]) {
    case 'list':
      return list(root);
    case 'new':
      return create(root, args);
    case 'og':
      return card(root, args);
    case 'check':
      return check(root, args);
    case 'publish':
      return publish(root, args);
    case 'touch':
      return touch(root, args);
    default:
      throw new Usage(positional[0] ? `unknown verb "${positional[0]}"` : 'which verb?');
  }
}

try {
  process.exitCode = (await main()) ?? 0;
} catch (err) {
  console.error(`post: ${err.message}`);
  if (err instanceof Usage) console.error(`\n${USAGE}`);
  process.exitCode = 1;
}
