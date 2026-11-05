#!/usr/bin/env node
/**
 * Asserts the AI-readable layer of the built site.
 *
 * The layer is a set of files no human visitor ever looks at — robots.txt,
 * llms.txt, llms-full.txt, the Markdown twin of every page, and the JSON-LD
 * graph in each <head>. A broken template there ships silently: the build
 * succeeds, the pages render, and an agent reads `undefined` or follows a
 * `rel="alternate"` link into a 404. This script is the only thing that looks.
 *
 * Usage: node scripts/check-ai-layer.mjs [dir]   (dir defaults to ./dist)
 *
 * See documentation/AI-READABLE.md. No dependencies, no network.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, posix } from 'node:path';

const DIST = process.argv[2] ?? 'dist';

/** The canonical origin, read from astro.config.mjs so there is one source of truth. */
function siteOrigin() {
  const cfg = readFileSync('astro.config.mjs', 'utf8');
  const m = cfg.match(/site:\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error('could not read `site` from astro.config.mjs');
  return m[1].replace(/\/$/, '');
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Escape every RegExp metacharacter (backslash included) for literal use. */
const escapeRegExp = (value) => value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');

const failures = [];
function check(label, ok, detail) {
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures.push({ label, detail });
  }
}

const read = (rel) => {
  const p = join(DIST, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
};

/** Minimal entity decoding — enough for attribute values and JSON-LD bodies. */
const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Attributes of a tag, tolerant of order, quoting style and minified output. */
function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  )) {
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

const ORIGIN = siteOrigin();

/**
 * Maps a URL (absolute on our origin, root-relative, or relative to `base`)
 * to the file in dist that would serve it, or null when nothing would.
 * Returns undefined for URLs on another origin.
 *
 * Strict about the trailing slash: `/about` is not accepted for
 * `about/index.html`, because Cloudflare answers it with a 308, and a link an
 * agent is told to cite should be the canonical form.
 */
function resolveToFile(href, base = '/') {
  let url;
  try {
    url = new URL(href, ORIGIN + base);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return undefined;
  const path = decodeURIComponent(url.pathname);
  const p = join(DIST, path.endsWith('/') ? posix.join(path, 'index.html') : path);
  return existsSync(p) && statSync(p).isFile() ? p : null;
}

/** Every link target in a Markdown document: inline, autolinks and bare URLs. */
function markdownLinks(md) {
  const hrefs = new Set();
  for (const m of md.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) hrefs.add(m[1]);
  for (const m of md.matchAll(/<(https?:\/\/[^>\s]+)>/g)) hrefs.add(m[1]);
  // Bare URLs, minus trailing sentence punctuation (as GFM's autolinker does):
  // `see https://x/llms.txt; cite …` links to `llms.txt`, not `llms.txt;`.
  for (const m of md.matchAll(/(?<![(<])\bhttps?:\/\/[^\s)<>\]"']+/g))
    hrefs.add(m[0].replace(/[.,;:!?*_~]+$/, ''));
  return hrefs;
}

/** The links of `md` on our origin (or root-relative) that no built file serves. */
const brokenLinks = (md) =>
  [...markdownLinks(prose(md))]
    .filter((h) => h.startsWith(ORIGIN) || h.startsWith('/'))
    .filter((h) => resolveToFile(h) === null);

/** Drops fenced and inline code, where `undefined` or `<div` can be legitimate. */
const prose = (md) => md.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');

if (!existsSync(DIST)) {
  console.error(`${DIST}/ not found — run \`npm run build\` first.`);
  process.exit(1);
}

const files = walk(DIST).map((f) => relative(DIST, f).split('\\').join('/'));
const pages = files.filter((f) => /(^|\/)index\.html$/.test(f) && !/(^|\/)404(\/|\.html$)/.test(f));
const twins = files.filter((f) => f.endsWith('.md'));

console.log(`\nchecked ${DIST}/: ${pages.length} pages, ${twins.length} Markdown file(s)\n`);

// ── robots.txt ─────────────────────────────────────────────────────────────
const robots = read('robots.txt');
check('robots.txt exists', robots !== null, `${DIST}/robots.txt is missing`);
if (robots !== null) {
  check(
    'robots.txt declares the sitemap',
    new RegExp(`^\\s*sitemap:\\s*${escapeRegExp(ORIGIN)}/\\S+`, 'im').test(robots),
    `  no \`Sitemap: ${ORIGIN}/...\` line`
  );
  // A stray `Disallow: /` (or an empty-path `Allow:` turned Disallow) in any
  // group silently hides the whole site from that crawler.
  const blanket = robots.split(/\r?\n/).filter((l) => /^\s*disallow:\s*\/\*?\s*(#.*)?$/i.test(l));
  check(
    'robots.txt has no blanket `Disallow: /`',
    blanket.length === 0,
    blanket.map((l) => `  ${l.trim()}`).join('\n')
  );
  check(
    'robots.txt points at /llms.txt',
    /\/llms\.txt\b/.test(robots),
    '  add a comment referencing /llms.txt'
  );
}

// ── llms.txt / llms-full.txt ──────────────────────────────────────────────
// llmstxt.org: the file opens with an H1 (the site name), then a blockquote
// summary. Blank lines between them are allowed; anything else is not.
const llms = read('llms.txt');
check('llms.txt exists', llms !== null, `${DIST}/llms.txt is missing`);
if (llms !== null) {
  const lines = llms.split(/\r?\n/).filter((l) => l.trim() !== '');
  check(
    'llms.txt opens with a `# ` H1',
    /^# \S/.test(lines[0] ?? ''),
    `  first line is: ${JSON.stringify(lines[0] ?? '')}`
  );
  check(
    'llms.txt follows the H1 with a `> ` summary',
    /^> \S/.test(lines[1] ?? ''),
    `  second non-blank line is: ${JSON.stringify(lines[1] ?? '')}`
  );
}

const full = read('llms-full.txt');
check(
  'llms-full.txt exists and is not empty',
  full !== null && full.trim() !== '',
  full === null ? `${DIST}/llms-full.txt is missing` : `${DIST}/llms-full.txt is empty`
);

// ── Every page: JSON-LD graph + Markdown alternate ─────────────────────────
const WEBSITE_ID = `${ORIGIN}/#website`;
const noGraph = [];
const danglingRefs = [];
const noTwin = [];

/** Every `{ "@id": … }` reference (an object with no other keys) under `value`. */
function refsIn(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => refsIn(v, out));
  else if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === '@id') out.push(value['@id']);
    else for (const v of Object.values(value)) refsIn(v, out);
  }
  return out;
}

/** Every `@id` a node in the graph declares (including nested ones). */
function idsIn(value, out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => idsIn(v, out));
  else if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (typeof value['@id'] === 'string' && keys.length > 1) out.add(value['@id']);
    for (const v of Object.values(value)) idsIn(v, out);
  }
  return out;
}

for (const page of pages) {
  const html = readFileSync(join(DIST, page), 'utf8');
  const urlPath = '/' + page.replace(/index\.html$/, '');

  // JSON-LD
  const nodes = [];
  const errors = [];
  // Tag matching is case-insensitive and tolerant of `</script >` and
  // `</script foo>`, the way a browser ends a script element (as check-csp does).
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)) {
    if ((attrs(m[1]).type ?? '').toLowerCase() !== 'application/ld+json') continue;
    try {
      const data = JSON.parse(m[2]);
      for (const block of Array.isArray(data) ? data : [data]) {
        if (Array.isArray(block?.['@graph'])) nodes.push(...block['@graph']);
      }
    } catch (e) {
      errors.push(`unparseable JSON-LD (${e.message})`);
    }
  }
  const hasWebsite = nodes.some((n) => {
    const types = [n?.['@type']].flat();
    return types.includes('WebSite') && n['@id'] === WEBSITE_ID;
  });
  if (!hasWebsite) {
    const why =
      errors[0] ??
      (nodes.length ? `@graph has no WebSite node with @id ${WEBSITE_ID}` : 'no JSON-LD @graph');
    noGraph.push(`  ${page}: ${why}`);
  }
  // A reference that no node in the same graph declares is a dangling edge:
  // the consumer sees `performer: <some IRI>` and nothing about it.
  const declared = idsIn(nodes);
  for (const id of new Set(refsIn(nodes))) {
    if (!declared.has(id)) danglingRefs.push(`  ${page}: ${id}`);
  }

  // <link rel="alternate" type="text/markdown" href="...">
  const alternates = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => attrs(m[0]))
    .filter(
      (a) =>
        (a.rel ?? '').toLowerCase().split(/\s+/).includes('alternate') &&
        (a.type ?? '').toLowerCase().split(';')[0].trim() === 'text/markdown'
    );
  if (alternates.length === 0) {
    noTwin.push(`  ${page}: no <link rel="alternate" type="text/markdown">`);
  } else {
    for (const a of alternates) {
      if (!a.href) noTwin.push(`  ${page}: markdown alternate has no href`);
      else if (!resolveToFile(a.href, urlPath))
        noTwin.push(`  ${page}: ${a.href} is not in ${DIST}/`);
    }
  }
}

check(
  'every page carries a JSON-LD @graph with the WebSite node',
  noGraph.length === 0,
  noGraph.join('\n')
);
check(
  'every JSON-LD `@id` reference resolves within its page graph',
  danglingRefs.length === 0,
  danglingRefs.join('\n')
);
check('every page links a Markdown twin that exists', noTwin.length === 0, noTwin.join('\n'));

// ── Markdown hygiene ───────────────────────────────────────────────────────
// Template leaks: a missing frontmatter field renders `undefined`, an object
// interpolated into a string renders `[object Object]`, and an HTML component
// rendered into the Markdown path leaves its tags behind.
const LEAKS = [
  [/\bundefined\b/, '`undefined`'],
  [/\[object Object\]/, '`[object Object]`'],
  [
    /<\/?(?:div|span|section|article|header|footer|nav|main|script|style|img|svg|astro-[\w-]+)\b/i,
    'raw HTML tag',
  ],
];
const markdownFiles = [...twins, 'llms.txt', 'llms-full.txt'].filter((f) =>
  existsSync(join(DIST, f))
);

// Every link on our origin, in every Markdown file (llms.txt, llms-full.txt and
// each twin, including its `Canonical:` line), must land on a built file in
// its canonical form. lychee only crawls the HTML, so nothing else looks here.
const broken = [];
let linkCount = 0;
for (const f of markdownFiles) {
  const md = readFileSync(join(DIST, f), 'utf8');
  linkCount += markdownLinks(prose(md)).size;
  for (const h of brokenLinks(md)) broken.push(`  ${f}: ${h}`);
}
check(
  `every ${new URL(ORIGIN).host} link in the Markdown files resolves (${linkCount} link(s))`,
  broken.length === 0,
  broken.join('\n')
);

const leaks = [];
for (const f of markdownFiles) {
  const lines = prose(readFileSync(join(DIST, f), 'utf8')).split('\n');
  lines.forEach((line, i) => {
    for (const [re, what] of LEAKS) {
      if (re.test(line)) leaks.push(`  ${f}:${i + 1}: ${what} — ${line.trim().slice(0, 100)}`);
    }
  });
}
check('Markdown files contain no template leaks or raw HTML', leaks.length === 0, leaks.join('\n'));

// ── Report ─────────────────────────────────────────────────────────────────
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const f of failures) {
    console.error(`• ${f.label}`);
    if (f.detail) console.error(f.detail);
    console.error('');
  }
  process.exit(1);
}

console.log('\nAI-readable layer holds.\n');
