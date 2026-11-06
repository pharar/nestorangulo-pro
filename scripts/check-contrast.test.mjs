import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { contrast, contrastFailures, parseThemes, uncheckedColourUses } from './check-contrast.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-contrast.mjs');

const TOKENS = `
:root {
  --font-body: sans-serif; /* not a colour token */
  --clr-bg: #ffffff;
  --clr-text: #000;
  --clr-muted: #595959;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --clr-bg: #000000;
    --clr-text: #ffffff;
  }
}
:root[data-theme='dark'] {
  --clr-bg: #000000;
  --clr-text: #ffffff;
}
`;

test('contrast matches the WCAG reference values', () => {
  assert.equal(contrast('#000', '#fff'), 21);
  assert.equal(contrast('#ffffff', '#ffffff'), 1);
  assert.equal(contrast('#767676', '#ffffff').toFixed(2), '4.54');
  assert.throws(() => contrast('red', '#fff'), /not a hex colour/);
});

test('parseThemes lays each dark block over the light one', () => {
  const { themes } = parseThemes(TOKENS);
  assert.deepEqual(Object.keys(themes), [
    'light',
    "dark (:root:not([data-theme='light']))",
    "dark (:root[data-theme='dark'])",
  ]);
  assert.equal(themes.light['--clr-text'], '#000');
  assert.equal(themes["dark (:root[data-theme='dark'])"]['--clr-text'], '#ffffff');
  assert.equal(themes["dark (:root[data-theme='dark'])"]['--clr-muted'], '#595959');
  assert.equal(themes.light['--font-body'], undefined);
});

test('contrastFailures names the theme, the pair and the ratio', () => {
  const { themes } = parseThemes(TOKENS);
  const pairs = [
    ['--clr-text', '--clr-bg'],
    ['--clr-muted', '--clr-bg'],
  ];
  const failures = contrastFailures(themes, pairs);
  // #595959 passes on white (7:1) but not on black (3:1), in both dark blocks.
  assert.equal(failures.length, 2);
  assert.match(
    failures[0],
    /^dark .*--clr-muted #595959 on --clr-bg #000000 is 3\.\d\d:1, needs 4\.5:1$/
  );
  assert.deepEqual(contrastFailures(themes, [['--clr-gone', '--clr-bg']]).length, 3);
});

test('uncheckedColourUses flags text colours nobody checks, not other properties', () => {
  const files = [
    [
      'a.css',
      [
        '.a { color: var(--clr-text); }',
        '.b { color: var(--clr-pale); }',
        '.c { border-color: var(--clr-pale); background-color: var(--clr-pale); }',
        '.d:hover { color: var(--clr-accent); }',
      ].join('\n'),
    ],
  ];
  const out = uncheckedColourUses(files, [['--clr-text', '--clr-bg']], { '--clr-accent': 'hover' });
  assert.deepEqual(out, ['a.css:2: color: --clr-pale']);
});

function fixture(tokens, css) {
  const dir = mkdtempSync(join(tmpdir(), 'contrast-'));
  mkdirSync(join(dir, 'src/styles'), { recursive: true });
  writeFileSync(join(dir, 'src/styles/tokens.css'), tokens);
  writeFileSync(join(dir, 'src/styles/global.css'), css);
  return spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' });
}

const SITE = `
:root {
  --clr-bg: #faf9f7; --clr-surface: #f3f1ee; --clr-text: #2a2f32; --clr-muted: #6b6663;
  --clr-accent: #c08c50; --clr-accent-light: #f5ead9; --clr-accent-text: #8a5c1a; --clr-on-accent: #1c1917;
}
:root[data-theme='dark'] {
  --clr-bg: #1a1815; --clr-surface: #232019; --clr-text: #f0ede8; --clr-muted: #a8a29a;
  --clr-accent-light: #2e2418; --clr-accent-text: #d9a86a;
}
`;

test('the script passes a site whose text tokens all meet AA', () => {
  const r = fixture(SITE, '.x { color: var(--clr-muted); }');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Contrast contract holds/);
});

test('the script fails on a grey below AA and on an unchecked text token', () => {
  const pale = SITE.replace('--clr-muted: #6b6663', '--clr-muted: #a09d9a');
  const r = fixture(pale, '.x { color: var(--clr-subtle); }');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /light: --clr-muted #a09d9a on --clr-bg #faf9f7 is 2\.56:1/);
  assert.match(r.stderr, /global\.css:1: color: --clr-subtle/);
});

test('the script fails when the two dark blocks drift apart', () => {
  const twoDark = `${SITE}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --clr-bg: #1a1815; --clr-surface: #232019; --clr-text: #f0ede8; --clr-muted: #b0aaa2;
    --clr-accent-light: #2e2418; --clr-accent-text: #d9a86a;
  }
}`;
  const r = fixture(twoDark, '');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /dark theme blocks in tokens\.css carry the same values/);
});
