#!/usr/bin/env node
/**
 * Asserts the URL contract of the built site.
 *
 * The site is served directory-style, so `/about/` is the real URL and `/about`
 * 308-redirects to it. Three surfaces have to agree on that shape — the
 * `<link rel="canonical">`, the generated sitemap, and every internal link —
 * and nothing in the type checker or the Lighthouse run can see when they drift.
 * They did drift: 37 of 41 canonicals once pointed at a URL that immediately
 * redirected, silently, for months.
 *
 * Reads ./dist only. No dependencies, no network.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';

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

const failures = [];
function check(label, ok, detail) {
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures.push({ label, detail });
  }
}

if (!existsSync(DIST)) {
  console.error(`${DIST}/ not found — run \`npm run build\` first.`);
  process.exit(1);
}

const ORIGIN = siteOrigin();
const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

// ── Collect ────────────────────────────────────────────────────────────────
const canonicals = new Map(); // url -> source file
const slashless = [];
const internalLinks = new Map(); // href -> source file

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');

  const canon = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  if (canon) {
    canonicals.set(canon[1], file);
    if (!canon[1].endsWith('/')) slashless.push(`${canon[1]}  (in ${relative(DIST, file)})`);
  }

  for (const m of html.matchAll(/<a\b[^>]*\shref="(\/[^"#]*)"/g)) {
    internalLinks.set(m[1], file);
  }
}

const sitemapFiles = files.filter((f) => /sitemap-\d+\.xml$/.test(f));
const sitemapUrls = new Set();
for (const file of sitemapFiles) {
  for (const m of readFileSync(file, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    sitemapUrls.add(m[1]);
  }
}

console.log(`\nchecked ${htmlFiles.length} pages, ${sitemapFiles.length} sitemap file(s)\n`);

// ── Assert ─────────────────────────────────────────────────────────────────

check('every canonical ends in a trailing slash', slashless.length === 0, slashless.join('\n'));

const canonSet = new Set(canonicals.keys());
const onlyCanon = [...canonSet].filter((u) => !sitemapUrls.has(u));
const onlySitemap = [...sitemapUrls].filter((u) => !canonSet.has(u));
check(
  'canonical set matches the sitemap exactly',
  onlyCanon.length === 0 && onlySitemap.length === 0,
  [
    ...onlyCanon.map((u) => `  canonical but not in sitemap: ${u}`),
    ...onlySitemap.map((u) => `  in sitemap but no canonical: ${u}`),
  ].join('\n')
);

// A canonical must name a page that was actually built, or it points visitors
// and crawlers at a 404.
const unbuilt = [...canonSet].filter((u) => {
  if (!u.startsWith(ORIGIN)) return true;
  const path = u.slice(ORIGIN.length);
  return !existsSync(join(DIST, path, 'index.html'));
});
check('every canonical resolves to a built page', unbuilt.length === 0, unbuilt.join('\n'));

// 404.html is served for every unmatched path, so it has no URL of its own.
const notFound = join(DIST, '404.html');
check(
  '404.html declares no canonical',
  !existsSync(notFound) || !/<link\s+rel="canonical"/.test(readFileSync(notFound, 'utf8')),
  'the 404 page self-canonicalises; it should pass canonical={null}'
);

// Internal links must already be the canonical form, or every click costs a 308.
const ASSET = /\.[a-z0-9]{2,5}$/i;
const badLinks = [...internalLinks.entries()].filter(
  ([href]) => !href.endsWith('/') && !ASSET.test(href)
);
check(
  'internal links use the trailing-slash form',
  badLinks.length === 0,
  badLinks.map(([href, file]) => `  ${href}  (in ${relative(DIST, file)})`).join('\n')
);

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

console.log('\nURL contract holds.\n');
