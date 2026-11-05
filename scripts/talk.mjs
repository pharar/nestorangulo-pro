#!/usr/bin/env node
/**
 * Talk operations: everything mechanical about a talk card and its slide deck.
 *
 *   list [--missing slides|video]       talks newest first, with what each has
 *   shelf                               the featured shelf, as /speaking shows it
 *   feature <slug> [--swap <other>]     put a talk on the shelf (max six)
 *   unfeature <slug>                    take it off
 *   new <slug> --title … --event … --date YYYY-MM-DD --format … [--location …] [--language …]
 *                                       a draft card with only what the caller verified
 *   video <slug> <url>                  set videoUrl
 *   deck prepare <slug> <pdf> --event-short "…" [--out-dir <dir>]
 *                                       compress if worthwhile, write metadata, hash-name
 *   deck upload <file> [--yes]          plan only without --yes; with it, put the object in R2
 *   deck link <slug> <r2-url> [--ext <url>]
 *                                       point slidesUrl at R2, keeping the old link as slidesUrlExt
 *   deck verify [slug]                  HEAD every slidesUrl on the assets host
 *
 * Every verb that writes accepts --dry-run. --root <dir> points it at another
 * tree (the tests use a fixture).
 *
 * Why a script and not prose: the sequence compress -> metadata -> hash -> upload
 * -> verify has silent failure modes (a wrangler 4 upload without --remote prints
 * "Upload complete." and lands nowhere; metadata written before gs is stripped by
 * it; a hash computed before metadata names the wrong bytes). The judgement around
 * it lives in .claude/skills/talk/SKILL.md; the reasons for the rules, in
 * documentation/SLIDES-R2.md and documentation/SPEAKING.md.
 *
 * Frontmatter is only ever read and edited through scripts/lib/frontmatter.mjs,
 * so an edit changes the one line asked for. No dependencies of its own beyond
 * that library (`yaml`). The network and every child process go through `deps`,
 * which the tests replace.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readEntry, setField } from './lib/frontmatter.mjs';

export const SHELF = 6;
export const BUCKET = 'nestorangulo-assets';
export const ASSETS_HOST = 'assets.nestorangulo.pro';
export const ASSETS_BASE = `https://${ASSETS_HOST}`;
export const CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const AUTHOR = 'Nestor Angulo de Ugarte';
/** Compression is kept only when the result is at least this much smaller. */
export const MIN_SHRINK = 0.25;

export const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DECK_NAME = /^([a-z0-9]+(?:-[a-z0-9]+)*)-([0-9a-f]{10})\.pdf$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class UserError extends Error {}

// ── Pure helpers ───────────────────────────────────────────────────────────

/** `<slug>-<10 hex>.pdf` -> { slug, hash }, or null. */
export function parseDeckName(name) {
  const m = String(name).match(DECK_NAME);
  return m ? { slug: m[1], hash: m[2] } : null;
}

export const deckKey = (name) => `slides/${name}`;
export const deckUrl = (name) => `${ASSETS_BASE}/${deckKey(name)}`;
export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
export const hashPrefix = (buf) => sha256(buf).slice(0, 10);

/** The R2 URL a card may carry: exactly slides/<slug>-<10 hex>.pdf on the assets host. */
export function isDeckUrlFor(slug, url) {
  // Compared as strings: no pattern is built from the host or the slug.
  const prefix = `${ASSETS_BASE}/slides/${slug}-`;
  const s = String(url);
  return s.startsWith(prefix) && /^[0-9a-f]{10}\.pdf$/.test(s.slice(prefix.length));
}

export const isAssetsUrl = (url) => {
  try {
    return new URL(String(url)).hostname === ASSETS_HOST;
  } catch {
    return false;
  }
};

/** A Google Docs/Slides edit URL is private by nature; never a public slides link. */
export function isGoogleEditUrl(url) {
  try {
    const u = new URL(String(url));
    return u.hostname === 'docs.google.com' && /\/edit(?:$|[/?#])/.test(u.pathname + u.search);
  } catch {
    return false;
  }
}

function assertHttpUrl(url, what) {
  if (!/^https?:\/\/[^\s#]+$/.test(String(url)))
    throw new UserError(`${what} is not a plain http(s) URL: ${url}`);
}

function isoDate(d) {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

/** Single-quoted YAML scalar, the way the cards are written. */
function quote(v) {
  if (/[\r\n]/.test(v)) throw new UserError('multi-line values are not supported');
  return `'${v.replace(/'/g, "''")}'`;
}

/** Reads `<key>: z.enum([ 'a', 'b' ])` out of the talks schema, so the enum has one home. */
export function schemaEnum(root, key) {
  const file = join(root, 'src/content.config.ts');
  if (!existsSync(file)) throw new UserError(`cannot read the ${key} enum: ${file} does not exist`);
  const text = readFileSync(file, 'utf8');
  const m = text.match(new RegExp(`\\b${key}:\\s*z\\.enum\\(\\s*\\[([^\\]]*)\\]`));
  const values = m ? [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] ?? x[2]) : [];
  if (values.length === 0) {
    throw new UserError(`cannot read the ${key} enum from ${file}; refusing to guess it`);
  }
  return values;
}

// ── Cards ──────────────────────────────────────────────────────────────────

const talksDir = (root) => join(root, 'src/content/talks');
const cardPath = (root, slug) => join(talksDir(root), `${slug}.md`);

function loadTalks(root) {
  const dir = talksDir(root);
  if (!existsSync(dir)) throw new UserError(`no talks directory at ${dir}`);
  return readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => {
      const file = join(dir, f);
      const { data } = readEntry(file);
      return { slug: f.replace(/\.mdx?$/, ''), file, data, date: isoDate(data.date) };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

function requireTalk(root, slug) {
  if (!slug) throw new UserError('missing <slug>');
  if (!KEBAB.test(slug)) throw new UserError(`not a kebab-case slug: ${slug}`);
  const file = cardPath(root, slug);
  if (!existsSync(file)) throw new UserError(`no card ${relative(root, file)}`);
  return { slug, file, data: readEntry(file).data };
}

/** Published and featured, in the order /speaking renders them (date, newest first). */
export const shelfOf = (talks) =>
  talks.filter((t) => t.data.featured === true && t.data.draft !== true);

// ── Arg parsing ────────────────────────────────────────────────────────────

const VALUE_FLAGS = new Set([
  'root',
  'missing',
  'swap',
  'title',
  'event',
  'date',
  'format',
  'location',
  'language',
  'event-short',
  'out-dir',
  'ext',
]);
const BOOL_FLAGS = new Set(['dry-run', 'yes']);

export function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      pos.push(a);
      continue;
    }
    const [name, inline] = a.slice(2).split(/=(.*)/s);
    if (BOOL_FLAGS.has(name)) flags[name] = true;
    else if (VALUE_FLAGS.has(name)) {
      const v = inline ?? argv[++i];
      if (v === undefined) throw new UserError(`--${name} needs a value`);
      flags[name] = v;
    } else throw new UserError(`unknown flag --${name}`);
  }
  return { pos, flags };
}

// ── Default side effects (replaced by the tests) ───────────────────────────

export const realDeps = {
  out: (s) => console.log(s),
  err: (s) => console.error(s),
  /** Runs a program without a shell. Returns { status, stdout, stderr, error }. */
  run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
    return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error };
  },
  /** HEAD a URL. Never throws: a network failure is status 0 with `error`. */
  async head(url) {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
      return { status: res.status, headers: Object.fromEntries(res.headers) };
    } catch (error) {
      return {
        status: 0,
        headers: {},
        error: String(error?.cause?.code ?? error?.message ?? error),
      };
    }
  },
  tmp: () => tmpdir(),
};

function haveProgram(deps, cmd, args = ['--version']) {
  const r = deps.run(cmd, args);
  return !r.error && r.status !== null;
}

const shq = (s) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);

// ── Output helpers ─────────────────────────────────────────────────────────

function printEdit(ctx, file, r, label = '') {
  const rel = relative(ctx.root, file);
  if (!r.changed) return ctx.deps.out(`  ${rel}: already ${label || 'as wanted'}; no change`);
  ctx.deps.out(`  ${rel}${ctx.dry ? ' (dry run, nothing written)' : ''}`);
  if (r.before !== null) ctx.deps.out(`    - ${r.before}`);
  if (r.after !== null) ctx.deps.out(`    + ${r.after}`);
}

function shelfLines(talks) {
  return talks.map(
    (t, i) =>
      `  ${i + 1}. ${t.date}  ${t.data.language ?? 'en'}  ${t.slug}\n     ${t.data.event}  [${(t.data.themes ?? []).join(', ')}]`
  );
}

function printShelf(ctx, talks) {
  const { out } = ctx.deps;
  const shelf = shelfOf(talks);
  for (const l of shelfLines(shelf)) out(l);
  out(
    `Featured shelf: ${shelf.length}/${SHELF}${shelf.length > SHELF ? '  (OVER: check:content will fail)' : ''}`
  );
}

// ── Verbs: cards ───────────────────────────────────────────────────────────

function cmdList(ctx, { flags }) {
  const { out } = ctx.deps;
  const missing = flags.missing;
  if (missing && !['slides', 'video'].includes(missing)) {
    throw new UserError('--missing takes "slides" or "video"');
  }
  const rows = loadTalks(ctx.root).filter((t) => {
    if (missing === 'slides') return !t.data.slidesUrl && !t.data.slidesUrlExt;
    if (missing === 'video') return !t.data.videoUrl;
    return true;
  });
  const w = Math.max(4, ...rows.map((t) => t.slug.length));
  out(`${'slug'.padEnd(w)}  date        lang  flags  slides  video`);
  for (const t of rows) {
    const flagsCol = `${t.data.featured ? 'F' : '-'}${t.data.draft ? 'D' : '-'}`;
    const slides = t.data.slidesUrl
      ? isAssetsUrl(t.data.slidesUrl)
        ? 'r2'
        : 'ext'
      : t.data.slidesUrlExt
        ? 'ext'
        : '-';
    out(
      `${t.slug.padEnd(w)}  ${t.date}  ${(t.data.language ?? 'en').padEnd(4)}  ${flagsCol.padEnd(5)}  ${slides.padEnd(6)}  ${t.data.videoUrl ? 'yes' : '-'}`
    );
  }
  out(
    `${rows.length} talk(s)${missing ? ` without ${missing}` : ''}. flags: F featured, D draft. slides: r2 self-hosted, ext external only.`
  );
}

function cmdShelf(ctx) {
  printShelf(ctx, loadTalks(ctx.root));
}

function setFeatured(ctx, t, value) {
  const r = setField(t.file, 'featured', value, { dryRun: ctx.dry });
  printEdit(ctx, t.file, r, `featured: ${value}`);
}

function cmdFeature(ctx, { pos, flags }) {
  const t = requireTalk(ctx.root, pos[0]);
  const swap = flags.swap;
  const talks = loadTalks(ctx.root);
  const shelf = shelfOf(talks);
  if (t.data.draft === true) throw new UserError(`${t.slug} is a draft; it cannot be on the shelf`);
  const already = t.data.featured === true;

  let demote = null;
  if (!already && shelf.length >= SHELF) {
    if (!swap) {
      ctx.deps.out(
        `Refusing: the featured shelf is full (${shelf.length}/${SHELF}). Current shelf:`
      );
      for (const l of shelfLines(shelf)) ctx.deps.out(l);
      throw new UserError(
        `name the talk to demote in the same operation: feature ${t.slug} --swap <slug-on-the-shelf>`
      );
    }
  }
  if (swap) {
    if (swap === t.slug) throw new UserError('--swap cannot name the talk being featured');
    demote = shelf.find((s) => s.slug === swap);
    if (!demote) throw new UserError(`--swap ${swap} is not on the shelf; nothing changed`);
    if (already || shelf.length < SHELF) {
      ctx.deps.out(`note: the shelf has room; --swap ${swap} demotes it anyway because you asked`);
    }
  }

  if (demote) setFeatured(ctx, demote, false);
  setFeatured(ctx, t, true);
  ctx.deps.out(ctx.dry ? '\nShelf after this change (not applied):' : '\nShelf now:');
  printShelf(ctx, ctx.dry ? simulate(talks, t.slug, demote?.slug) : loadTalks(ctx.root));
}

/** The talks as they would stand after featuring `on` and demoting `off`. */
function simulate(talks, on, off) {
  return talks.map((x) =>
    x.slug === on
      ? { ...x, data: { ...x.data, featured: true } }
      : x.slug === off
        ? { ...x, data: { ...x.data, featured: false } }
        : x
  );
}

function cmdUnfeature(ctx, { pos }) {
  const t = requireTalk(ctx.root, pos[0]);
  setFeatured(ctx, t, false);
  ctx.deps.out(ctx.dry ? '\nShelf after this change (not applied):' : '\nShelf now:');
  const talks = loadTalks(ctx.root);
  printShelf(ctx, ctx.dry ? simulate(talks, null, t.slug) : talks);
}

/** The text of a new draft card. Only caller-supplied facts go in. */
export function draftCard({ title, event, location, date, language, format }) {
  const lines = ['---', `title: ${quote(title)}`, `event: ${quote(event)}`];
  if (location) lines.push(`location: ${quote(location)}`);
  lines.push(
    `date: ${date}`,
    `language: ${language}`,
    `format: ${format}`,
    'themes: []',
    'featured: false',
    'draft: true',
    '---',
    ''
  );
  return lines.join('\n');
}

function cmdNew(ctx, { pos, flags }) {
  const slug = pos[0];
  if (!slug) throw new UserError('missing <slug>');
  if (!KEBAB.test(slug)) throw new UserError(`not a kebab-case slug: ${slug}`);
  for (const k of ['title', 'event', 'date', 'format']) {
    if (!flags[k]?.trim()) {
      throw new UserError(
        `--${k} is required: it must be a verified fact, and this script invents nothing`
      );
    }
  }
  if (!ISO_DATE.test(flags.date) || isoDate(new Date(`${flags.date}T00:00:00Z`)) !== flags.date) {
    throw new UserError(`--date must be a real YYYY-MM-DD date, got ${flags.date}`);
  }
  const formats = schemaEnum(ctx.root, 'format');
  if (!formats.includes(flags.format)) {
    throw new UserError(`--format must be one of: ${formats.join(', ')}`);
  }
  const language = flags.language ?? 'en';
  const languages = schemaEnum(ctx.root, 'language');
  if (!languages.includes(language))
    throw new UserError(`--language must be one of: ${languages.join(', ')}`);

  const file = cardPath(ctx.root, slug);
  if (existsSync(file))
    throw new UserError(`${relative(ctx.root, file)} already exists; not overwriting`);

  const text = draftCard({ ...flags, language });
  ctx.deps.out(`${relative(ctx.root, file)}${ctx.dry ? ' (dry run, nothing written)' : ''}`);
  for (const l of text.trimEnd().split('\n')) ctx.deps.out(`    + ${l}`);
  if (!ctx.dry) {
    mkdirSync(talksDir(ctx.root), { recursive: true });
    writeFileSync(file, text);
  }
  ctx.deps.out(
    "Left as draft: themes, summary and body are the owner's to supply once the facts are verified."
  );
  ctx.deps.out(
    `Before un-drafting, add its Spanish page: src/content/talks-es/${slug}.md (the i18n skill; check:content requires it).`
  );
}

function cmdVideo(ctx, { pos }) {
  const t = requireTalk(ctx.root, pos[0]);
  if (!pos[1]) throw new UserError('missing <url>');
  assertHttpUrl(pos[1], 'video URL');
  printEdit(ctx, t.file, setField(t.file, 'videoUrl', pos[1], { dryRun: ctx.dry, as: 'url' }));
}

// ── Verbs: deck ────────────────────────────────────────────────────────────

const PIKEPDF_SCRIPT = `
import sys, pikepdf
path, title, subject, author = sys.argv[1:5]
with pikepdf.open(path, allow_overwriting_input=True) as pdf:
    with pdf.open_metadata(set_pikepdf_as_editor=False) as meta:
        meta['dc:title'] = title
        meta['dc:creator'] = [author]
        meta['dc:description'] = subject
        meta['xmp:CreatorTool'] = author
    pdf.docinfo['/Title'] = title
    pdf.docinfo['/Subject'] = subject
    pdf.docinfo['/Author'] = author
    pdf.docinfo['/Creator'] = author
    pdf.save(path, linearize=True)
`;

/** Which metadata writer is available: exiftool, else python3+pikepdf, else null. */
function metadataTool(deps) {
  if (haveProgram(deps, 'exiftool', ['-ver'])) return 'exiftool';
  if (
    haveProgram(deps, 'python3') &&
    deps.run('python3', ['-I', '-c', 'import pikepdf']).status === 0
  )
    return 'pikepdf';
  return null;
}

function writeMetadata(deps, tool, file, meta) {
  const r =
    tool === 'exiftool'
      ? deps.run('exiftool', [
          `-Title=${meta.title}`,
          `-Subject=${meta.subject}`,
          `-Author=${meta.author}`,
          `-Creator=${meta.author}`,
          '-overwrite_original',
          file,
        ])
      : deps.run('python3', [
          '-I',
          '-c',
          PIKEPDF_SCRIPT,
          file,
          meta.title,
          meta.subject,
          meta.author,
        ]);
  if (r.error || r.status !== 0) {
    throw new UserError(
      `${tool} failed writing metadata: ${(r.stderr || r.stdout || r.error?.message || '').trim()}`
    );
  }
}

function insideRepo(root, dir) {
  const rel = relative(resolve(root), resolve(dir));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function cmdDeckPrepare(ctx, { pos, flags }) {
  const { deps } = ctx;
  const t = requireTalk(ctx.root, pos[0]);
  const src = pos[1] ? resolve(pos[1]) : null;
  if (!src) throw new UserError('missing <pdf>');
  if (!flags['event-short']?.trim()) {
    throw new UserError(
      '--event-short is required (the short event name for the PDF title; see the talk skill)'
    );
  }
  if (!existsSync(src) || !statSync(src).isFile()) throw new UserError(`no such file: ${src}`);
  if (readFileSync(src).subarray(0, 5).toString('latin1') !== '%PDF-')
    throw new UserError(`${src} is not a PDF`);

  const outDir = resolve(flags['out-dir'] ?? join(deps.tmp(), 'nestorangulo-slides'));
  if (insideRepo(ctx.root, outDir)) {
    throw new UserError(
      `--out-dir ${outDir} is inside the repo; slide PDFs never go in git. Pick a directory outside it`
    );
  }

  const meta = {
    title: `${t.data.title} — ${flags['event-short']}`,
    subject: String(t.data.event),
    author: AUTHOR,
  };
  const tool = metadataTool(deps);
  if (!tool) {
    throw new UserError(
      'cannot write PDF metadata: install exiftool (apt install libimage-exiftool-perl / brew install exiftool) or python3 with pikepdf (pip install pikepdf)'
    );
  }
  const haveGs = haveProgram(deps, 'gs');
  const original = statSync(src).size;

  deps.out(`card      ${relative(ctx.root, t.file)}`);
  deps.out(`title     ${meta.title}`);
  deps.out(`subject   ${meta.subject}`);
  deps.out(`author    ${meta.author}`);
  deps.out(
    `metadata  via ${tool}; compression ${haveGs ? 'via gs /ebook' : 'skipped (gs not installed)'}`
  );
  deps.out(`out dir   ${outDir}`);
  if (ctx.dry) {
    deps.out(
      `dry run: would compress (keep only if >= ${MIN_SHRINK * 100}% smaller), write metadata, hash, and write ${deckKey(`${t.slug}-<hash>.pdf`)}. Nothing written.`
    );
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const work = join(outDir, `${t.slug}.work.pdf`);
  const gsOut = join(outDir, `${t.slug}.gs.pdf`);
  let kept = 'original';
  try {
    copyFileSync(src, work);
    if (haveGs) {
      const r = deps.run('gs', [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.5',
        '-dPDFSETTINGS=/ebook',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${gsOut}`,
        src,
      ]);
      if (r.status === 0 && existsSync(gsOut)) {
        const compressed = statSync(gsOut).size;
        const shrink = 1 - compressed / original;
        deps.out(
          `sizes     original ${original} B, ghostscript ${compressed} B (${(shrink * 100).toFixed(1)}% smaller)`
        );
        if (shrink >= MIN_SHRINK) {
          renameSync(gsOut, work);
          kept = 'compressed';
        } else {
          deps.out(
            `          under ${MIN_SHRINK * 100}% (or larger): discarding the compressed copy`
          );
        }
      } else {
        deps.out(
          `sizes     original ${original} B; ghostscript failed (${(r.stderr || '').trim().split('\n')[0] || `exit ${r.status}`}), keeping the original`
        );
      }
    } else {
      deps.out(`sizes     original ${original} B; no compression`);
    }
    deps.out(`kept      ${kept} bytes`);

    writeMetadata(deps, tool, work, meta);
    const finalBytes = readFileSync(work);
    const name = `${t.slug}-${hashPrefix(finalBytes)}.pdf`;
    const dest = join(outDir, name);
    renameSync(work, dest);
    deps.out(`final     ${finalBytes.length} B, sha256 ${sha256(finalBytes)}`);
    deps.out(`file      ${dest}`);
    deps.out(`R2 key    ${deckKey(name)}`);
    deps.out(`URL       ${deckUrl(name)}`);
    deps.out(
      `next      npm run talk -- deck upload ${shq(dest)}   (plan only; add --yes with the owner's go-ahead)`
    );
  } finally {
    rmSync(work, { force: true });
    rmSync(gsOut, { force: true });
  }
}

function uploadCommand(file, name) {
  return [
    'npx',
    'wrangler@latest',
    'r2',
    'object',
    'put',
    `${BUCKET}/${deckKey(name)}`,
    `--file=${file}`,
    '--content-type=application/pdf',
    `--cache-control=${CACHE_CONTROL}`,
    '--remote',
  ];
}

/** Checks a HEAD result against what an uploaded deck must look like. Returns problems. */
export function deckProblems(head, size) {
  const problems = [];
  if (head.status !== 200)
    problems.push(`status ${head.status}${head.error ? ` (${head.error})` : ''}, expected 200`);
  const ct = head.headers['content-type'] ?? '';
  if (head.status === 200 && !/^application\/pdf\b/i.test(ct))
    problems.push(`content-type "${ct}", expected application/pdf`);
  const cc = head.headers['cache-control'] ?? '';
  if (head.status === 200 && !/\bimmutable\b/i.test(cc))
    problems.push(`cache-control "${cc}", expected ...immutable`);
  if (
    size !== undefined &&
    head.status === 200 &&
    Number(head.headers['content-length']) !== size
  ) {
    problems.push(`content-length ${head.headers['content-length']}, local file is ${size}`);
  }
  return problems;
}

async function cmdDeckUpload(ctx, { pos, flags }) {
  const { deps } = ctx;
  if (!pos[0]) throw new UserError('missing <file>');
  const file = resolve(pos[0]);
  const name = basename(file);
  const parsed = parseDeckName(name);
  if (!parsed) throw new UserError(`file name must be <kebab-slug>-<10 hex>.pdf, got ${name}`);
  if (!existsSync(file)) throw new UserError(`no such file: ${file}`);
  const bytes = readFileSync(file);
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-')
    throw new UserError(`${file} is not a PDF`);
  const actual = hashPrefix(bytes);
  if (actual !== parsed.hash) {
    throw new UserError(
      `the name says ${parsed.hash} but the file's SHA-256 starts ${actual}; re-run deck prepare`
    );
  }

  const cmd = uploadCommand(file, name);
  deps.out(`bucket   ${BUCKET}`);
  deps.out(`key      ${deckKey(name)}`);
  deps.out(`URL      ${deckUrl(name)}`);
  deps.out(`size     ${bytes.length} B`);
  deps.out(`headers  content-type: application/pdf`);
  deps.out(`         cache-control: ${CACHE_CONTROL}`);
  deps.out(`command  ${cmd.map(shq).join(' ')}`);

  if (!flags.yes || ctx.dry) {
    deps.out(
      ctx.dry && flags.yes
        ? '\ndry run: nothing executed.'
        : "\nPlan only: nothing executed. Production write; run again with --yes on the owner's explicit go-ahead."
    );
    return;
  }

  const url = deckUrl(name);
  const before = await deps.head(url);
  if (before.status === 200) {
    deps.out(
      `\nAlready live at ${url}: keys are content-addressed and never overwritten, so nothing was uploaded.`
    );
    const problems = deckProblems(before, bytes.length);
    if (problems.length)
      throw new UserError(
        `the existing object is not right: ${problems.join('; ')}. Do not overwrite it; see SLIDES-R2.md`
      );
    deps.out('The existing object matches this file (200, application/pdf, immutable, same size).');
    return;
  }
  if (before.status !== 404) {
    throw new UserError(
      `HEAD ${url} gave ${before.status}${before.error ? ` (${before.error})` : ''}; refusing to upload blind`
    );
  }

  deps.out('\nNot there yet; uploading to R2 ...');
  const r = deps.run(cmd[0], cmd.slice(1));
  const combined = `${r.stdout}\n${r.stderr}`;
  if (r.error || r.status !== 0) {
    throw new UserError(
      `wrangler failed (${r.error?.message ?? `exit ${r.status}`}):\n${combined.trim()}\nIf it asks for auth, the owner runs: npx wrangler@latest login`
    );
  }
  const loc = combined.match(/Resource location:\s*(\S+)/i);
  if (!loc || loc[1].toLowerCase() !== 'remote') {
    throw new UserError(
      `wrangler did not report "Resource location: remote" (got ${loc ? `"${loc[1]}"` : 'no such line'}). The object most likely went to the local simulator and is NOT in R2. Remove any stray .wrangler/ directory and investigate`
    );
  }
  deps.out('wrangler reported Resource location: remote');

  const after = await deps.head(url);
  const problems = deckProblems(after, bytes.length);
  if (problems.length)
    throw new UserError(`uploaded, but verification failed: ${problems.join('; ')}`);
  deps.out(`verified ${url}: 200, application/pdf, immutable, ${bytes.length} B`);
  deps.out(`next     npm run talk -- deck link ${parsed.slug} ${url}`);
}

function cmdDeckLink(ctx, { pos, flags }) {
  const { deps } = ctx;
  const t = requireTalk(ctx.root, pos[0]);
  const r2 = pos[1];
  if (!r2) throw new UserError('missing <r2-url>');
  if (!isDeckUrlFor(t.slug, r2)) {
    throw new UserError(`${r2} is not ${ASSETS_BASE}/slides/${t.slug}-<10 hex>.pdf`);
  }
  const current = t.data.slidesUrl ? String(t.data.slidesUrl) : null;
  const existingExt = t.data.slidesUrlExt ? String(t.data.slidesUrlExt) : null;
  const currentExternal = current && !isAssetsUrl(current) ? current : null;

  if (flags.ext) {
    assertHttpUrl(flags.ext, '--ext');
    if (isGoogleEditUrl(flags.ext))
      throw new UserError('--ext is a Google Docs/Slides edit URL; never link a private edit URL');
    if (isAssetsUrl(flags.ext))
      throw new UserError(
        '--ext is the self-hosted copy; slidesUrlExt holds the official external one'
      );
  }
  const newExt = flags.ext ?? existingExt ?? currentExternal;
  if (currentExternal && currentExternal !== newExt) {
    throw new UserError(
      `slidesUrl is external (${currentExternal}) and slidesUrlExt is ${existingExt ? `already ${existingExt}` : `set to ${flags.ext}`}; linking would drop the first. Resolve by hand`
    );
  }
  if (newExt && isGoogleEditUrl(newExt))
    throw new UserError(
      `${newExt} is a Google Docs/Slides edit URL; never keep a private edit URL`
    );

  // Ext first, so a failure between the two edits cannot lose the original link.
  if (newExt && newExt !== existingExt) {
    printEdit(
      ctx,
      t.file,
      setField(t.file, 'slidesUrlExt', newExt, { dryRun: ctx.dry, as: 'url' })
    );
  }
  printEdit(ctx, t.file, setField(t.file, 'slidesUrl', r2, { dryRun: ctx.dry, as: 'url' }));
  deps.out(
    `next      npm run talk -- deck verify ${t.slug}   (the object must be live before the PR merges)`
  );
}

async function cmdDeckVerify(ctx, { pos }) {
  const { deps } = ctx;
  const talks = pos[0] ? [requireTalk(ctx.root, pos[0])] : loadTalks(ctx.root);
  let bad = 0;
  let checked = 0;
  for (const t of talks) {
    const url = t.data.slidesUrl ? String(t.data.slidesUrl) : null;
    if (!url || !isAssetsUrl(url)) {
      if (pos[0]) throw new UserError(`${t.slug} has no slidesUrl on ${ASSETS_HOST}`);
      continue;
    }
    checked++;
    const head = await deps.head(url);
    const problems = deckProblems(head);
    if (problems.length) bad++;
    deps.out(
      `${problems.length ? 'FAIL' : 'ok  '}  ${t.slug}  ${head.status}  ${head.headers['content-type'] ?? '-'}  ${head.headers['cache-control'] ?? '-'}${problems.length ? `\n      ${problems.join('; ')}` : ''}`
    );
  }
  deps.out(`${checked} deck(s) checked, ${bad} wrong`);
  if (bad) throw new UserError(`${bad} deck(s) not served correctly`);
}

// ── Dispatch ───────────────────────────────────────────────────────────────

const USAGE = `usage: npm run talk -- <verb>
  list [--missing slides|video]
  shelf
  feature <slug> [--swap <other-slug>] [--dry-run]
  unfeature <slug> [--dry-run]
  new <slug> --title "…" --event "…" --date YYYY-MM-DD --format <enum> [--location "…"] [--language en|es] [--dry-run]
  video <slug> <url> [--dry-run]
  deck prepare <slug> <pdf> --event-short "…" [--out-dir <dir>] [--dry-run]
  deck upload <file> [--yes]
  deck link <slug> <r2-url> [--ext <url>] [--dry-run]
  deck verify [slug]
common: --root <dir> (default: current directory)`;

/** Runs one invocation. Returns the exit code; never calls process.exit. */
export async function main(argv, deps = realDeps) {
  try {
    const parsed = parseArgs(argv);
    const [verb, ...rest] = parsed.pos;
    const ctx = {
      root: resolve(parsed.flags.root ?? process.cwd()),
      dry: Boolean(parsed.flags['dry-run']),
      deps,
    };
    const call = { pos: rest, flags: parsed.flags };
    switch (verb) {
      case 'list':
        cmdList(ctx, call);
        break;
      case 'shelf':
        cmdShelf(ctx);
        break;
      case 'feature':
        cmdFeature(ctx, call);
        break;
      case 'unfeature':
        cmdUnfeature(ctx, call);
        break;
      case 'new':
        cmdNew(ctx, call);
        break;
      case 'video':
        cmdVideo(ctx, call);
        break;
      case 'deck': {
        const [sub, ...more] = rest;
        const dcall = { pos: more, flags: parsed.flags };
        if (sub === 'prepare') cmdDeckPrepare(ctx, dcall);
        else if (sub === 'upload') await cmdDeckUpload(ctx, dcall);
        else if (sub === 'link') cmdDeckLink(ctx, dcall);
        else if (sub === 'verify') await cmdDeckVerify(ctx, dcall);
        else throw new UserError(`unknown deck verb "${sub ?? ''}"\n${USAGE}`);
        break;
      }
      default:
        throw new UserError(verb ? `unknown verb "${verb}"\n${USAGE}` : USAGE);
    }
    return 0;
  } catch (e) {
    if (!(e instanceof UserError)) throw e;
    deps.err(`talk: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
