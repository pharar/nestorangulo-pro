#!/usr/bin/env node
/**
 * Asserts that every page of the built site opens its text with the gold drop cap.
 *
 * Home and About had one; Writing, Speaking, Contact and every essay and talk did
 * not, and nothing noticed: a page without it builds, type-checks and passes every
 * other contract. The rule and its markup live in src/lib/lead.mjs (`<Lead>` for
 * pages, the `hastLead` plugin for Markdown); this holds it on the output, so a new
 * page cannot ship without it. See documentation/BRAND.md, "The drop cap".
 *
 * Per page, inside `<main>`:
 * - exactly one paragraph carries `.lead-dropcap`;
 * - when its text opens with a number, it is the figure form
 *   (`.lead-dropcap--figure`); otherwise `::first-letter` gilds only the first digit.
 *
 * Exempt: the 404 pages (an error message, not a page of text), and an essay or
 * talk whose Markdown body is empty (no text to open).
 *
 * Reads ./dist only. No dependencies, no network.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

/** An essay or talk page whose Markdown body rendered to nothing. */
const EMPTY_BODY = /<div class="talk-detail-body\b[^"]*">\s*<\/div>/;

const classList = (attrs) => (/\bclass="([^"]*)"/.exec(attrs)?.[1] ?? '').split(/\s+/);

/**
 * What is wrong with a page's drop cap, or null when it holds.
 * @param {string} html a built page
 * @returns {string | null}
 */
export function dropcapProblem(html) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  if (main === undefined) return 'no <main> element';
  if (EMPTY_BODY.test(main)) return null;

  const leads = [...main.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)].filter(([, attrs]) =>
    classList(attrs).includes('lead-dropcap')
  );
  if (leads.length === 0) return 'no lead paragraph (.lead-dropcap): see src/lib/lead.mjs';
  if (leads.length > 1) return `${leads.length} lead paragraphs; a page opens once`;

  const [[, attrs, inner]] = leads;
  const text = inner.replace(/<[^>]*>/g, '').trimStart();
  if (/^\d/.test(text) && !classList(attrs).includes('lead-dropcap--figure')) {
    return `opens with a number ("${text.slice(0, 20)}…") but is not the figure form: see src/lib/lead.mjs`;
  }
  return null;
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function main() {
  const DIST = 'dist';
  if (!existsSync(DIST)) {
    console.error(`${DIST}/ not found — run \`npm run build\` first.`);
    process.exit(1);
  }

  const pages = walk(DIST).filter((f) => f.endsWith('.html') && basename(f) !== '404.html');
  const failures = pages.flatMap((file) => {
    const problem = dropcapProblem(readFileSync(file, 'utf8'));
    return problem ? [`  ${relative(DIST, file)}: ${problem}`] : [];
  });

  console.log(`\nchecked ${pages.length} pages\n`);
  if (failures.length > 0) {
    console.log('  FAIL  every page opens with one gold drop cap');
    console.error(`\n${failures.join('\n')}\n`);
    process.exit(1);
  }
  console.log('  ok    every page opens with one gold drop cap');
  console.log('\nDrop-cap contract holds.\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
