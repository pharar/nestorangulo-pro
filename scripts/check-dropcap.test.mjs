import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { dropcapProblem } from './check-dropcap.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-dropcap.mjs');

const page = (main) =>
  `<html><body><header><p class="lead-dropcap">outside main</p></header><main id="main-content">${main}</main></body></html>`;

test('a page whose text opens with a lead paragraph holds', () => {
  assert.equal(
    dropcapProblem(page('<h1>Writing</h1><p class="lead-dropcap">Essays on…</p>')),
    null
  );
});

test('extra classes on the lead paragraph are fine', () => {
  const html = page(
    '<p class="lead-dropcap lead-dropcap--figure talks-intro"><span class="lead-dropcap-figure">37</span> appearances</p>'
  );
  assert.equal(dropcapProblem(html), null);
});

test('a page without a lead paragraph fails; one outside <main> does not count', () => {
  assert.match(dropcapProblem(page('<h1>Contact</h1><p>Professional inquiries</p>')), /no lead/);
});

test('the figure span alone is not a lead paragraph', () => {
  const html = page('<p class="intro"><span class="lead-dropcap-figure">37</span> talks</p>');
  assert.match(dropcapProblem(html), /no lead/);
});

test('two lead paragraphs fail', () => {
  const html = page('<p class="lead-dropcap">One</p><p class="lead-dropcap">Two</p>');
  assert.match(dropcapProblem(html), /2 lead paragraphs/);
});

test('a lead opening with a number needs the figure form', () => {
  assert.match(dropcapProblem(page('<p class="lead-dropcap">37 appearances</p>')), /number/);
  assert.match(
    dropcapProblem(page('<p class="lead-dropcap"><a href="/x/">120</a> talks</p>')),
    /number/
  );
});

test('an essay or talk with an empty body is exempt', () => {
  assert.equal(
    dropcapProblem(page('<h1>A webinar</h1><div class="talk-detail-body"></div>')),
    null
  );
  assert.equal(dropcapProblem(page('<div class="talk-detail-body essay-body">\n</div>')), null);
});

test('a page with no <main> fails', () => {
  assert.match(dropcapProblem('<html><body><p class="lead-dropcap">x</p></body></html>'), /<main>/);
});

function runIn(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-dropcap-'));
  for (const [path, html] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, 'dist', path)), { recursive: true });
    writeFileSync(join(dir, 'dist', path), html);
  }
  return spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' });
}

test('the CLI passes a good dist and skips the 404 pages', () => {
  const r = runIn({
    'index.html': page('<p class="lead-dropcap">Security programs…</p>'),
    '404.html': page('<h1>Page not found</h1><p>Nothing here.</p>'),
    'es/404.html': page('<h1>Página no encontrada</h1><p>Nada.</p>'),
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /checked 1 pages/);
});

test('the CLI fails and names the page without a drop cap', () => {
  const r = runIn({
    'index.html': page('<p class="lead-dropcap">Security programs…</p>'),
    'contact/index.html': page('<p>Professional inquiries</p>'),
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /contact\/index\.html: no lead/);
});

test('the CLI fails without a build', () => {
  const r = runIn({});
  assert.equal(r.status, 1);
  assert.match(r.stderr, /run `npm run build` first/);
});
