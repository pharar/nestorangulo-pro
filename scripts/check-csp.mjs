#!/usr/bin/env node
/**
 * Asserts the Content Security Policy contract of the built site.
 *
 * The policy is `'self'`-only and Astro emits it per page as a `<meta>` tag,
 * hashing the inline scripts it knows about. Nothing else checks that the two
 * halves still match: a page whose inline script has no matching hash builds,
 * type-checks and passes Lighthouse, then fails silently in the browser. An
 * Astro upgrade is exactly when that can drift — 7.4 changed what goes into
 * `style-src` — so this runs as part of the housekeeping gate.
 *
 * Reads ./dist only. No dependencies, no network.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const sha256 = (text) => `sha256-${createHash('sha256').update(text).digest('base64')}`;

/** The sources a directive allows, e.g. `["'self'", "'sha256-…'"]`. */
function sources(csp, directive) {
  const m = csp.match(new RegExp(`(?:^|;)\\s*${directive}\\s+([^;]*)`));
  return new Set(m ? m[1].trim().split(/\s+/) : []);
}

const failures = [];
function check(label, offenders) {
  if (offenders.length === 0) {
    console.log(`  ok    ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures.push({ label, detail: offenders.join('\n') });
  }
}

if (!existsSync(DIST)) {
  console.error(`${DIST}/ not found — run \`npm run build\` first.`);
  process.exit(1);
}

const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));

const noPolicy = [];
const unhashedScripts = [];
const unhashedStyles = [];
const styleAttributes = [];
let inlineScripts = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const name = relative(DIST, file);

  const csp = html.match(/<meta\s+http-equiv="content-security-policy"\s+content="([^"]*)"/i)?.[1];
  if (!csp) {
    noPolicy.push(`  ${name}`);
    continue;
  }

  const scriptSrc = sources(csp, 'script-src');
  const styleSrc = sources(csp, 'style-src');

  // Tag matching is case-insensitive and tolerant of `</script >`, the way a
  // browser is. This is a checker, so a variant it fails to recognise is a
  // violation it reports as fine.
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)) {
    const [, attrs, body] = m;
    if (/\ssrc\s*=/i.test(attrs)) continue; // external: covered by 'self'
    // Data blocks are never executed, so script-src does not apply to them.
    if (/\stype\s*=\s*["']?application\/(ld\+)?json\b/i.test(attrs)) continue;
    inlineScripts++;
    if (!scriptSrc.has(`'${sha256(body)}'`)) {
      unhashedScripts.push(`  ${name}: ${body.trim().slice(0, 70)}…`);
    }
  }

  if (!styleSrc.has("'unsafe-inline'")) {
    for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\b[^>]*>/gi)) {
      if (!styleSrc.has(`'${sha256(m[1])}'`)) {
        unhashedStyles.push(`  ${name}: ${m[1].trim().slice(0, 70)}…`);
      }
    }
    // A style attribute cannot be allowed by hash without 'unsafe-hashes', so
    // under this policy any of them is dropped by the browser. This is what
    // Astro's "Shiki uses inline styles" build warning turns into.
    const attr = html.match(/<[a-z][^>]*\sstyle\s*=/i);
    if (attr) styleAttributes.push(`  ${name}: ${attr[0].slice(0, 90)}…`);
  }
}

console.log(`\nchecked ${htmlFiles.length} pages, ${inlineScripts} inline script(s)\n`);

check('every page declares a Content-Security-Policy', noPolicy);
check('every inline script is allowed by a script-src hash', unhashedScripts);
check('every inline <style> is allowed by a style-src hash', unhashedStyles);
check('no element relies on a style attribute the policy blocks', styleAttributes);

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const f of failures) {
    console.error(`• ${f.label}`);
    console.error(f.detail);
    console.error('');
  }
  process.exit(1);
}

console.log('\nCSP contract holds.\n');
