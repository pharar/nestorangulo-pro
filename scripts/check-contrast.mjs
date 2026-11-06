#!/usr/bin/env node
/**
 * Asserts that every colour token used for text meets WCAG AA contrast (1.4.3,
 * 4.5:1) against the backgrounds it sits on, in every theme.
 *
 * Lighthouse alone did not catch it: its accessibility category passes at 0.95,
 * it audits a handful of pages, and only in light mode. So a pale grey token
 * coloured small text (dates, labels, the footer) at 2.6:1 for months. This
 * reads the tokens instead of the pages:
 *
 * - `src/styles/tokens.css`: the light theme is the plain `:root` block; each
 *   dark block is laid over it. The two dark blocks must match.
 * - every `.css` and `.astro` file under `src/`: each token used as `color:`
 *   must be a foreground in PAIRS (checked in every theme) or listed in
 *   DECORATIVE with the reason it is exempt. A new grey cannot colour text
 *   without being checked.
 *
 * Every pair is held to 4.5:1, the normal-text threshold, whatever the size.
 * Reads src/ only, so it needs no build. No dependencies, no network.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MIN_RATIO = 4.5;

/** [text token, background token]: every pairing the stylesheet uses. */
export const PAIRS = [
  ['--clr-text', '--clr-bg'],
  ['--clr-text', '--clr-surface'],
  ['--clr-text', '--clr-accent-light'], // a card on hover
  ['--clr-muted', '--clr-bg'],
  ['--clr-muted', '--clr-surface'],
  ['--clr-muted', '--clr-accent-light'], // card metadata on hover
  ['--clr-accent-text', '--clr-bg'],
  ['--clr-accent-text', '--clr-surface'],
  ['--clr-accent-text', '--clr-accent-light'], // theme tags, filter chips
  ['--clr-on-accent', '--clr-accent'], // the pressed chip, the skip link
];

/** Tokens allowed as `color:` without a contrast check, and why. */
export const DECORATIVE = {
  '--clr-accent':
    'brand gold (2.8:1 on the light background), by design: hover states, the title caret, drop caps and list bullets; never the resting colour of running text',
};

/** WCAG relative luminance of `#rgb` or `#rrggbb`. */
export function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`not a hex colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours, 1 to 21. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `--clr-*` declarations of a block body, as { name: value }. */
function colourTokens(body) {
  const out = {};
  for (const m of body.matchAll(/(--clr-[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/**
 * The themes tokens.css defines: `{ light, 'dark (…)': … }`, each a full map of
 * colour tokens. Every block other than the plain `:root` that sets colour
 * tokens is a dark theme, laid over the light one.
 */
export function parseThemes(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const themes = {};
  let light = null;
  const overrides = [];
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    const tokens = colourTokens(m[2]);
    if (Object.keys(tokens).length === 0) continue;
    if (selector === ':root') light = { ...light, ...tokens };
    else overrides.push([selector, tokens]);
  }
  if (!light) throw new Error('tokens.css has no plain :root block with colour tokens');
  themes.light = light;
  for (const [selector, tokens] of overrides)
    themes[`dark (${selector})`] = { ...light, ...tokens };
  return { themes, overrides };
}

/** Every pair below MIN_RATIO, per theme, as readable lines. */
export function contrastFailures(themes, pairs = PAIRS) {
  const out = [];
  for (const [theme, tokens] of Object.entries(themes)) {
    for (const [fg, bg] of pairs) {
      if (!tokens[fg] || !tokens[bg]) {
        out.push(`${theme}: ${!tokens[fg] ? fg : bg} is not defined`);
        continue;
      }
      const ratio = contrast(tokens[fg], tokens[bg]);
      if (ratio < MIN_RATIO)
        out.push(
          `${theme}: ${fg} ${tokens[fg]} on ${bg} ${tokens[bg]} is ${ratio.toFixed(2)}:1, needs ${MIN_RATIO}:1`
        );
    }
  }
  return out;
}

/** The lowest ratio across every pair and theme, for the success line. */
export function lowestRatio(themes, pairs = PAIRS) {
  let low = Infinity;
  for (const tokens of Object.values(themes))
    for (const [fg, bg] of pairs)
      if (tokens[fg] && tokens[bg]) low = Math.min(low, contrast(tokens[fg], tokens[bg]));
  return low;
}

/** `color:` uses of a token that is neither checked nor declared decorative. */
export function uncheckedColourUses(files, pairs = PAIRS, decorative = DECORATIVE) {
  const allowed = new Set([...pairs.map(([fg]) => fg), ...Object.keys(decorative)]);
  const out = [];
  for (const [file, text] of files) {
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/(?<![-\w])color\s*:\s*var\((--clr-[\w-]+)/g))
        if (!allowed.has(m[1])) out.push(`${file}:${i + 1}: color: ${m[1]}`);
    });
  }
  return out;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(css|astro)$/.test(p)) out.push(p);
  }
  return out;
}

function main() {
  const { themes, overrides } = parseThemes(readFileSync('src/styles/tokens.css', 'utf8'));
  const files = walk('src').map((p) => [relative('.', p), readFileSync(p, 'utf8')]);

  const failures = [];
  const check = (label, offenders) => {
    console.log(`  ${offenders.length ? 'FAIL' : 'ok  '}  ${label}`);
    if (offenders.length) failures.push({ label, detail: offenders.join('\n') });
  };

  const dark = overrides.map(([, tokens]) => JSON.stringify(Object.entries(tokens).sort()));
  check(
    'the dark theme blocks in tokens.css carry the same values',
    new Set(dark).size > 1 ? overrides.map(([s, t]) => `${s}: ${JSON.stringify(t)}`) : []
  );
  check(
    `every text token is at least ${MIN_RATIO}:1 on its backgrounds in ${Object.keys(themes).length} themes` +
      ` (lowest ${lowestRatio(themes).toFixed(2)}:1)`,
    contrastFailures(themes)
  );
  check('every token used as color: is checked or declared decorative', uncheckedColourUses(files));

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed:\n`);
    for (const f of failures) console.error(`• ${f.label}\n${f.detail}\n`);
    console.error(
      'A new text pairing goes in PAIRS in scripts/check-contrast.mjs; see documentation/BRAND.md.'
    );
    process.exit(1);
  }
  console.log('\nContrast contract holds.\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
