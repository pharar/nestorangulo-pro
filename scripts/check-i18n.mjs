#!/usr/bin/env node
/**
 * Asserts the bilingual contract of the built site (en at `/`, es at `/es/`).
 *
 * Reads ./dist only (or the directory passed as the first argument). No
 * dependencies, no network. It checks that:
 *
 *  1. every page's language switch and `hreflang` links point at a built page,
 *     and hreflang pairs are reciprocal (the Spanish page names the English one
 *     and vice versa);
 *  2. every English page has a Spanish counterpart and vice versa, except the
 *     essays that are not translated (they carry no hreflang) and the 404s;
 *  3. a Spanish page links to an English route only when that route has no
 *     Spanish counterpart (otherwise the build missed a rewrite), and every
 *     internal link it has points at a built page (the language switch and
 *     `hreflang` links are exempt);
 *  4. no leftover English UI strings show in the visible text of Spanish pages;
 *  5. the sitemap lists no 404, gives `en`/`es` alternates to exactly the pages
 *     that exist in both languages, and lists every built page.
 *
 * Rule 4 is a heuristic: it looks for a short list of UI words. Prose that is
 * legitimately English (a talk given in English) is skipped via `lang="en"`
 * sections: only text outside elements marked `lang="en"` is scanned.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const ORIGIN = 'https://nestorangulo.pro';

/** UI strings that must not appear in Spanish pages' visible text. */
const ENGLISH_UI = [
  'Back to',
  'Read more',
  'Read the',
  'Speaking',
  'Writing',
  'Coming next',
  'Skip to content',
  'Themes',
  'Featured',
  'Footnotes',
  'Latest',
  'Watch',
  'Contact me',
  'Get in touch',
  'About me',
];

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
const uniq = (xs) => [...new Set(xs)];
function check(label, offenders) {
  offenders = uniq(offenders);
  if (offenders.length === 0) {
    console.log(`  ok    ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures.push({ label, detail: offenders.slice(0, 40).join('\n') });
  }
}

if (!existsSync(DIST)) {
  console.error(`${DIST}/ not found — run \`npm run build\` first.`);
  process.exit(1);
}

const files = walk(DIST);
/** Page route (`/about/`, `/es/`) for each `index.html`. */
const pages = new Map();
for (const f of files) {
  const rel = relative(DIST, f).replace(/\\/g, '/');
  if (rel === 'index.html') pages.set('/', f);
  else if (rel.endsWith('/index.html')) pages.set(`/${rel.slice(0, -'index.html'.length)}`, f);
}
const isEs = (route) => route === '/es/' || route.startsWith('/es/');
const toEs = (route) => (route === '/' ? '/es/' : `/es${route}`);
const toEn = (route) => (route === '/es/' ? '/' : route.slice(3));
const exists = (route) => pages.has(route);

const pathOf = (href) => href.replace(ORIGIN, '');

const badTargets = [];
const nonReciprocal = [];
const missingCounterpart = [];
const englishLinks = [];
const brokenLinks = [];
const englishText = [];
let spanishPages = 0;
let withAlternates = 0;

for (const [route, file] of pages) {
  const html = readFileSync(file, 'utf8');
  const where = relative(DIST, file);

  // 1. switch + hreflang targets exist.
  const switchHref =
    html.match(/<a\b[^>]*\bclass="lang-switch"[^>]*\bhref="([^"]+)"/)?.[1] ??
    html.match(/<a\b[^>]*\bhref="([^"]+)"[^>]*\bclass="lang-switch"/)?.[1];
  const alternates = [
    ...html.matchAll(
      /<link\b[^>]*\brel="alternate"[^>]*\bhreflang="([^"]+)"[^>]*\bhref="([^"]+)"/g
    ),
  ].map((m) => ({ lang: m[1], path: pathOf(m[2]) }));
  if (!switchHref) badTargets.push(`${where}: no language switch`);
  else if (!exists(switchHref)) badTargets.push(`${where}: switch -> ${switchHref} (not built)`);
  for (const a of alternates) {
    if (!exists(a.path)) badTargets.push(`${where}: hreflang ${a.lang} -> ${a.path} (not built)`);
  }

  // 2. counterpart + reciprocity. Pages with hreflang have both languages.
  if (alternates.length > 0) {
    withAlternates++;
    const en = isEs(route) ? toEn(route) : route;
    const es = toEs(en);
    if (!exists(en) || !exists(es)) missingCounterpart.push(`${where}: ${en} / ${es}`);
    const targets = new Map(alternates.map((a) => [a.lang, a.path]));
    if (targets.get('en') !== en || targets.get('es') !== es || targets.get('x-default') !== en) {
      nonReciprocal.push(`${where}: hreflang set is ${JSON.stringify([...targets])}`);
    }
    if (switchHref !== (isEs(route) ? en : es)) {
      nonReciprocal.push(`${where}: switch ${switchHref} is not the other language's page`);
    }
  } else if (isEs(route) && exists(toEn(route))) {
    // A Spanish page whose English twin exists must advertise it.
    missingCounterpart.push(`${where}: has an English page but declares no hreflang`);
  } else if (!isEs(route) && exists(toEs(route))) {
    missingCounterpart.push(`${where}: has a Spanish page but declares no hreflang`);
  }

  if (!isEs(route)) continue;
  spanishPages++;

  // 3. internal links on Spanish pages stay in Spanish.
  const anchors = [...html.matchAll(/<a\b([^>]*)>/g)].map((m) => m[1]);
  for (const attrs of anchors) {
    const href = attrs.match(/\bhref="([^"]*)"/)?.[1];
    if (!href || !href.startsWith('/') || href.startsWith('//')) continue;
    if (/\bclass="[^"]*\blang-switch\b/.test(attrs)) continue;
    if (/^\/(_astro|og|images|favicon|apple-touch)/.test(href)) continue;
    if (/\.(md|pdf|txt|xml|png|jpe?g|webp|svg|ico|woff2?|css|js)(#.*)?$/i.test(href)) continue;
    const target = href.replace(/[?#].*$/, '');
    if (!exists(target)) {
      brokenLinks.push(`${where}: ${href} (not built)`);
    } else if (!isEs(target) && exists(toEs(target))) {
      englishLinks.push(`${where}: ${href} (has a Spanish page: ${toEs(target)})`);
    }
  }

  // 4. English UI strings in visible text. Text inside `lang="en"` blocks is
  // legitimate (a quoted title, an English-language talk) and skipped.
  let body = html.replace(/<head>[\s\S]*?<\/head>/, '');
  body = body.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, ' ');
  body = body.replace(/<([a-z0-9]+)\b[^>]*\blang="en"[^>]*>[\s\S]*?<\/\1>/g, ' ');
  const visible = body
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((l) => l.replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim())
    .filter(Boolean);
  for (const line of visible) {
    for (const word of ENGLISH_UI) {
      if (new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'u').test(line)) {
        englishText.push(`${where}: "${line.slice(0, 90)}" (${word})`);
        break;
      }
    }
  }
}

// 5. sitemap.
const sitemapFiles = files.filter((f) => /sitemap-\d+\.xml$/.test(f));
const sitemap = sitemapFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
const sitemapProblems = [];
let esEntries = 0;
for (const entry of entries) {
  const loc = pathOf(entry.match(/<loc>([^<]+)<\/loc>/)[1]);
  if (/\/404\/?$/.test(loc)) sitemapProblems.push(`${loc}: a 404 must not be listed`);
  if (isEs(loc)) esEntries++;
  const alts = new Map(
    [...entry.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(
      (m) => [m[1], pathOf(m[2])]
    )
  );
  const en = isEs(loc) ? toEn(loc) : loc;
  if (exists(en) && exists(toEs(en))) {
    if (alts.size !== 2)
      sitemapProblems.push(`${loc}: ${alts.size} xhtml:link alternate(s), want 2`);
    else if (alts.get('en') !== en || alts.get('es') !== toEs(en)) {
      sitemapProblems.push(`${loc}: alternates ${JSON.stringify([...alts])}`);
    }
  } else if (alts.size > 0) {
    sitemapProblems.push(`${loc}: has no counterpart but declares alternates`);
  }
  for (const p of alts.values())
    if (!exists(p)) sitemapProblems.push(`${loc}: alternate ${p} not built`);
}
if (esEntries === 0) sitemapProblems.push('no /es/ URL in the sitemap');
const listed = new Set(entries.map((e) => pathOf(e.match(/<loc>([^<]+)<\/loc>/)[1])));
for (const route of pages.keys()) {
  if (/\/404\/$/.test(route)) continue;
  if (!listed.has(route)) sitemapProblems.push(`${route}: built but not in the sitemap`);
}

console.log(
  `\nchecked ${pages.size} pages (${spanishPages} Spanish, ${withAlternates} with hreflang), ` +
    `${entries.length} sitemap URL(s)\n`
);
check('language switch and hreflang links point at built pages', badTargets);
check('every page with hreflang has both languages, reciprocal', [
  ...missingCounterpart,
  ...nonReciprocal,
]);
check('Spanish pages link to Spanish routes where one exists (no missed rewrite)', englishLinks);
check('internal links on Spanish pages point at built pages', brokenLinks);
check('no English UI strings in the visible text of Spanish pages', englishText);
check('sitemap: alternates only where both languages exist, no 404', sitemapProblems);

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const f of failures) {
    console.error(`• ${f.label}`);
    if (f.detail) console.error(f.detail);
  }
  process.exit(1);
}
console.log('\nBilingual contract holds.');
