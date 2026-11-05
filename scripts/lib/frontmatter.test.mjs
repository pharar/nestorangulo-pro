import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { readEntry, removeField, setField } from './frontmatter.mjs';

const CARD = `---
title: 'It''s a "test"'
event: 'WordCamp Madrid 2023'
date: 2023-10-21 # ⚠ check
language: es

# a comment between keys
themes:
  - Web Security
  - Malware
summary: 'Short.'
draft: true
slidesUrl: https://assets.nestorangulo.pro/slides/x-0123456789.pdf
---

Body text with --- inside? no, but:

---

a rule above.
`;

function fixture(text = CARD) {
  const file = join(mkdtempSync(join(tmpdir(), 'fm-')), 'card.md');
  writeFileSync(file, text);
  return file;
}
const read = (f) => readFileSync(f, 'utf8');

test('readEntry parses data, body and raw frontmatter', () => {
  const { data, body, frontmatter } = readEntry(fixture());
  assert.equal(data.title, `It's a "test"`);
  assert.deepEqual(data.themes, ['Web Security', 'Malware']);
  assert.equal(data.draft, true);
  assert.ok(body.startsWith('\nBody text'));
  assert.ok(body.includes('a rule above.'));
  assert.ok(frontmatter.startsWith("title: 'It''s"));
});

test('setField flips a boolean and touches only that line', () => {
  const f = fixture();
  const r = setField(f, 'draft', false);
  assert.equal(r.changed, true);
  assert.equal(r.before, 'draft: true');
  assert.equal(r.after, 'draft: false');
  assert.equal(read(f), CARD.replace('draft: true', 'draft: false'));
});

test('setField keeps a trailing comment', () => {
  const f = fixture();
  setField(f, 'date', '2024-01-02');
  assert.equal(read(f), CARD.replace('2023-10-21 # ⚠ check', '2024-01-02 # ⚠ check'));
});

test('setField quotes strings with single quotes and escapes apostrophes', () => {
  const f = fixture();
  setField(f, 'summary', "Don't panic: it's fine");
  assert.equal(readEntry(f).data.summary, "Don't panic: it's fine");
  assert.ok(read(f).includes("summary: 'Don''t panic: it''s fine'"));
});

test('setField writes URLs and dates unquoted, and `as` forces quoting', () => {
  const f = fixture();
  setField(f, 'videoUrl', 'https://example.com/v?a=1');
  setField(f, 'updated', '2026-11-05');
  setField(f, 'subtitle', '2026-11-05', { as: 'string' });
  const text = read(f);
  assert.ok(text.includes('videoUrl: https://example.com/v?a=1\n'));
  assert.ok(text.includes('updated: 2026-11-05\n'));
  assert.ok(text.includes("subtitle: '2026-11-05'\n"));
});

test('setField appends a missing key at the end of the block', () => {
  const f = fixture();
  const r = setField(f, 'featured', true);
  assert.equal(r.before, null);
  assert.equal(r.after, 'featured: true');
  assert.equal(read(f), CARD.replace('\n---\n\nBody', '\nfeatured: true\n---\n\nBody'));
});

test('setField refuses a block value', () => {
  const f = fixture();
  assert.throws(() => setField(f, 'themes', 'Malware'), /block or multi-line/);
  assert.equal(read(f), CARD);
});

test('dryRun reports the change and writes nothing', () => {
  const f = fixture();
  const r = setField(f, 'draft', false, { dryRun: true });
  assert.equal(r.changed, true);
  assert.equal(read(f), CARD);
});

test('setting the same value is a no-op', () => {
  const f = fixture();
  assert.equal(setField(f, 'draft', true).changed, false);
  assert.equal(read(f), CARD);
});

test('removeField deletes one scalar line, refuses blocks, tolerates absence', () => {
  const f = fixture();
  const r = removeField(f, 'slidesUrl');
  assert.equal(r.changed, true);
  assert.equal(read(f), CARD.replace(/slidesUrl: .*\n/, ''));
  assert.equal(removeField(f, 'nope').changed, false);
  assert.throws(() => removeField(f, 'themes'), /block or multi-line/);
});

test('set then restore is byte-identical (quoted original included)', () => {
  const f = fixture();
  setField(f, 'title', 'Something else');
  setField(f, 'title', `It's a "test"`);
  setField(f, 'draft', false);
  setField(f, 'draft', true);
  assert.equal(read(f), CARD);
});

test('CRLF files keep their line endings', () => {
  const crlf = CARD.replace(/\n/g, '\r\n');
  const f = fixture(crlf);
  setField(f, 'draft', false);
  assert.equal(read(f), crlf.replace('draft: true', 'draft: false'));
});

test('a file without frontmatter is an error', () => {
  const f = fixture('no frontmatter here\n');
  assert.throws(() => readEntry(f), /no frontmatter/);
});
