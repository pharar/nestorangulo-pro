/**
 * The pure parts of the `post` workflow: slugs, the scaffold, the card's text,
 * and the preflight rules. `scripts/post.mjs` is the CLI over these; they live
 * here so `node:test` can exercise them without a browser or a CLI round-trip.
 *
 * The preflight (`checkEssay`) reuses the rules in lib/content.mjs that
 * `check-content.mjs` also applies, so "a valid social card" and "a cover that
 * exists" have one definition. What is added here is stricter and per-essay:
 * things that are fine in a draft but must not ship (empty summary, a missing
 * social card, an image without alt text, placeholders left in the text).
 *
 * Dependencies: `yaml`, through lib/frontmatter.mjs. No network.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { blank, coverMissing, DESCRIPTION_MAX, ogImageProblem } from './content.mjs';
import { readEntry } from './frontmatter.mjs';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isSlug = (s) => KEBAB.test(s);
export const isIsoDay = (s) => {
  if (!ISO_DAY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** Today as YYYY-MM-DD in local time (the day the owner is living, not UTC's). */
export function today(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** A frontmatter `date` as YYYY-MM-DD, whether the YAML parser gave a string or a Date. */
export const isoDay = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ''));

// ── Slugs ──────────────────────────────────────────────────────────────────

const LETTERS = { ß: 'ss', ø: 'o', æ: 'ae', œ: 'oe', đ: 'd', ł: 'l', þ: 'th', ı: 'i' };
const SLUG_MAX = 80;

/** Lowercase kebab-case ASCII from a title: diacritics stripped, punctuation dropped. */
export function slugify(title) {
  const ascii = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[ßøæœđłþı]/g, (c) => LETTERS[c])
    .replace(/['’‘`]/g, '');
  let slug = ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length > SLUG_MAX) {
    slug = slug.slice(0, SLUG_MAX);
    const cut = slug.lastIndexOf('-');
    slug = (cut > 0 ? slug.slice(0, cut) : slug).replace(/-+$/, '');
  }
  return slug;
}

// ── Scaffold ───────────────────────────────────────────────────────────────

export const SCAFFOLD_COMMENT = "<!-- Write the essay here. The text is the owner's to write. -->";

const quote = (s) => `'${s.replace(/'/g, "''")}'`;

/** A new draft, in the field order and quoting of the published essays. Schema-valid as it stands. */
export function scaffold({ title, date, language = 'en' }) {
  if (/[\r\n]/.test(title)) throw new Error('the title must be one line');
  return `---
title: ${quote(title)}
subtitle: ''
date: ${date}
summary: ''
language: ${language}
themes: []
draft: true
---

${SCAFFOLD_COMMENT}
`;
}

// ── Social card text ───────────────────────────────────────────────────────

const MONTHS = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  es: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
};

/** `ESSAY · OCTOBER 2026` (Spanish essays: `ENSAYO · OCTUBRE 2026`). Month and year come from the date. */
export function kicker(date, language = 'en') {
  const day = isoDay(date);
  if (!isIsoDay(day)) throw new Error(`not a valid date: ${day}`);
  const lang = language === 'es' ? 'es' : 'en';
  const month = MONTHS[lang][Number(day.slice(5, 7)) - 1];
  return `${lang === 'es' ? 'ENSAYO' : 'ESSAY'} · ${month} ${day.slice(0, 4)}`.toUpperCase();
}

/**
 * Splits a title into the plain part and the accent (set in the site's gold).
 * The accent defaults to the last word and must be a suffix of the title.
 */
export function splitAccent(title, accent) {
  const wanted = accent ?? title.trim().split(/\s+/).at(-1) ?? '';
  if (wanted === '' || !title.endsWith(wanted)) {
    throw new Error(`the accent "${wanted}" must be the end of the title "${title}"`);
  }
  return { plain: title.slice(0, title.length - wanted.length), accent: wanted };
}

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The title as HTML for the card: escaped, with the accent in `<em>`. */
export function titleHtml(title, accent) {
  const { plain, accent: a } = splitAccent(title, accent);
  return `${esc(plain)}<em>${esc(a)}</em>`;
}

/** Fills assets/og/og-essay.html. `cover` is a data: URI, or null for the plain dark background. */
export function fillTemplate(template, { fonts, kicker: k, title, cover }) {
  const img = cover ? `<img class="cover" alt="" src="${cover}" />` : '';
  // Function replacers: a `$` in a title or a base64 payload must not be read as a pattern.
  return template
    .replace('/*{{FONTS}}*/', () => fonts)
    .replace('{{COVER}}', () => img)
    .replace('{{KICKER}}', () => esc(k))
    .replace('{{TITLE}}', () => title);
}

// ── Finding essays ─────────────────────────────────────────────────────────

export const essayFile = (root, slug) => join(root, 'src/content/writing', `${slug}.md`);

export function loadEssay(root, slug) {
  if (!isSlug(slug)) throw new Error(`"${slug}" is not a slug (lowercase kebab-case)`);
  const file = essayFile(root, slug);
  if (!existsSync(file)) throw new Error(`no essay at ${file}`);
  return { slug, file, ...readEntry(file) };
}

// ── Preflight ──────────────────────────────────────────────────────────────

/** Fenced and inline code, blanked out so a `](/x)` in a code sample is not read as a link. */
const withoutCode = (md) => md.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '').replace(/`[^`\n]*`/g, '');

/** Markdown images in a body: `{ alt, target }`. */
export function imagesIn(md) {
  return [
    ...withoutCode(md).matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^)]*["'])?\s*\)/g),
  ].map((m) => ({ alt: m[1], target: m[2] }));
}

/** Internal link targets (`](/…)` and `[x]: /…`) in a body. */
export function internalLinksIn(md) {
  const text = withoutCode(md);
  const inline = [...text.matchAll(/\]\((\/(?!\/)[^)\s]*)/g)].map((m) => m[1]);
  const defs = [...text.matchAll(/^\[[^\]]+\]:\s*(\/(?!\/)\S*)/gm)].map((m) => m[1]);
  return [...inline, ...defs];
}

/** A page path must end in `/`; a file path (last segment has an extension) is not a page. */
export function isSlashlessPage(href) {
  const path = href.split(/[?#]/)[0];
  if (path.endsWith('/')) return false;
  return !/\.[a-z0-9]{1,6}$/i.test(path.split('/').at(-1));
}

const PLACEHOLDERS = [
  [/\bTODO\b/, 'TODO'],
  [/\bTBD\b/, 'TBD'],
  [/lorem ipsum/i, 'lorem ipsum'],
  [/the text is the owner's to write/i, 'the scaffold comment'],
];

/**
 * Preflight for one essay. Returns `{ failures, warnings }`, each a list of
 * messages; the essay may ship only when `failures` is empty.
 */
export function checkEssay(root, slug, { now = new Date() } = {}) {
  const e = loadEssay(root, slug);
  const { data, body, file } = e;
  const failures = [];
  const warnings = [];

  if (blank(data.summary)) failures.push('summary is empty');
  if (!Array.isArray(data.themes) || data.themes.length === 0) failures.push('no themes');

  if (blank(data.ogImage)) {
    failures.push('ogImage is not set (run `npm run post -- og` and add the line it prints)');
  } else {
    const problem = ogImageProblem(root, data.ogImage);
    if (problem) failures.push(problem);
  }

  if (data.cover) {
    if (blank(data.coverAlt)) failures.push('cover is set without coverAlt');
    const missing = coverMissing(file, data.cover);
    if (missing) failures.push(`cover: ${missing}`);
  }

  for (const { alt, target } of imagesIn(body)) {
    if (blank(alt)) failures.push(`image ${target} has no alt text`);
    if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(target)) continue; // remote: not ours to check
    const path = target.split(/[?#]/)[0];
    const resolved = path.startsWith('/')
      ? join(root, 'public', path)
      : resolve(dirname(file), path);
    if (!existsSync(resolved)) failures.push(`image ${target} does not exist`);
  }

  for (const href of internalLinksIn(body)) {
    if (isSlashlessPage(href)) failures.push(`internal link ${href} lacks the trailing slash`);
  }

  for (const [re, name] of PLACEHOLDERS) {
    if (re.test(body)) failures.push(`placeholder left in the text: ${name}`);
  }

  if (
    typeof data.summary === 'string' &&
    data.summary.length > DESCRIPTION_MAX &&
    blank(data.description)
  ) {
    warnings.push(
      `summary is ${data.summary.length} chars and there is no description; the meta tag may be truncated`
    );
  }
  if (isoDay(data.date) > today(now)) warnings.push(`date ${isoDay(data.date)} is in the future`);

  return { failures, warnings };
}
