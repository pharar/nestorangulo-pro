import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from 'yaml';
import {
  imagesIn,
  internalLinksIn,
  isSlashlessPage,
  kicker,
  scaffold,
  slugify,
  splitAccent,
  titleHtml,
  fillTemplate,
} from './essay.mjs';

test('slugify: lowercase kebab ASCII', () => {
  assert.equal(slugify('The response is the product now'), 'the-response-is-the-product-now');
});

test('slugify: strips diacritics and Spanish punctuation', () => {
  assert.equal(slugify('Prueba de título — ¿función?'), 'prueba-de-titulo-funcion');
  assert.equal(slugify('Año nuevo, ñandú y pingüino'), 'ano-nuevo-nandu-y-pinguino');
  assert.equal(slugify('Straße & Øresund'), 'strasse-oresund');
});

test('slugify: apostrophes vanish rather than split words', () => {
  assert.equal(slugify("Don't panic — it's fine"), 'dont-panic-its-fine');
});

test('slugify: collapses runs, trims, and is idempotent', () => {
  assert.equal(slugify('  --Hello,   World!!  '), 'hello-world');
  assert.equal(slugify(slugify('A  B')), 'a-b');
});

test('slugify: nothing ASCII left gives an empty slug (the CLI then asks for --slug)', () => {
  assert.equal(slugify('日本語'), '');
});

test('slugify: long titles are cut at a word boundary', () => {
  const slug = slugify('word '.repeat(40));
  assert.ok(slug.length <= 80 && !slug.endsWith('-'), slug);
});

test('slugify: different titles can collide, which is why `new` refuses existing files', () => {
  assert.equal(slugify('Café!'), slugify('cafe'));
});

test('scaffold parses and has the schema fields in order', () => {
  const text = scaffold({ title: "It's a 'test': yes", date: '2026-11-05', language: 'es' });
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/)[1];
  const data = parse(fm);
  assert.deepEqual(Object.keys(data), [
    'title',
    'subtitle',
    'date',
    'summary',
    'language',
    'themes',
    'draft',
  ]);
  assert.equal(data.title, "It's a 'test': yes");
  assert.equal(data.date, '2026-11-05');
  assert.equal(data.summary, '');
  assert.deepEqual(data.themes, []);
  assert.equal(data.draft, true);
  assert.equal(data.language, 'es');
  assert.match(text, /^---\ntitle: 'It''s a ''test'': yes'\n/);
});

test('scaffold body is one comment and nothing else', () => {
  const body = scaffold({ title: 'T', date: '2026-11-05' }).split('\n---\n')[1].trim();
  assert.match(body, /^<!--[^]*owner's to write[^]*-->$/);
});

test('scaffold refuses a multi-line title', () => {
  assert.throws(() => scaffold({ title: 'a\nb', date: '2026-11-05' }), /one line/);
});

test('splitAccent: default is the last word', () => {
  assert.deepEqual(splitAccent('The response is the product now'), {
    plain: 'The response is the product ',
    accent: 'now',
  });
});

test('splitAccent: --accent may be several words but must be a suffix', () => {
  assert.deepEqual(splitAccent('The response is the product now', 'product now'), {
    plain: 'The response is the ',
    accent: 'product now',
  });
  assert.throws(
    () => splitAccent('The response is the product now', 'response'),
    /end of the title/
  );
  assert.throws(() => splitAccent('A title', ''), /end of the title/);
});

test('titleHtml escapes the title and wraps the accent', () => {
  assert.equal(titleHtml('R&D <now>'), 'R&amp;D <em>&lt;now&gt;</em>');
});

test('kicker: month and year from the date', () => {
  assert.equal(kicker('2026-10-30'), 'ESSAY · OCTOBER 2026');
  assert.equal(kicker(new Date('2027-01-02T00:00:00Z')), 'ESSAY · JANUARY 2027');
  assert.equal(kicker('2026-10-30', 'es'), 'ENSAYO · OCTUBRE 2026');
  assert.throws(() => kicker('2026-13-40'), /not a valid date/);
});

test('fillTemplate replaces every marker and treats $ literally', () => {
  const out = fillTemplate('/*{{FONTS}}*/{{COVER}}{{KICKER}}{{TITLE}}', {
    fonts: 'F',
    kicker: 'A & B',
    title: 'costs $& more',
    cover: null,
  });
  assert.equal(out, 'FA &amp; Bcosts $& more');
  assert.match(
    fillTemplate('{{COVER}}', { fonts: '', kicker: '', title: '', cover: 'data:x' }),
    /<img class="cover"[^>]*src="data:x"/
  );
});

test('imagesIn and internalLinksIn ignore code', () => {
  const md = [
    '![alt](a.png) and ![](b.png "title")',
    '[x](/speaking/foo/) [y](/about) [z](/og/x.png) [w](//cdn.example/x)',
    '`[c](/code)`',
    '```',
    '[d](/fenced)',
    '```',
    '[ref]: /writing',
  ].join('\n');
  assert.deepEqual(imagesIn(md), [
    { alt: 'alt', target: 'a.png' },
    { alt: '', target: 'b.png' },
  ]);
  assert.deepEqual(internalLinksIn(md), ['/speaking/foo/', '/about', '/og/x.png', '/writing']);
});

test('isSlashlessPage: pages need the slash, files do not', () => {
  assert.equal(isSlashlessPage('/about'), true);
  assert.equal(isSlashlessPage('/about#team'), true);
  assert.equal(isSlashlessPage('/about/#team'), false);
  assert.equal(isSlashlessPage('/rss.xml'), false);
  assert.equal(isSlashlessPage('/og/x.png?v=2'), false);
  assert.equal(isSlashlessPage('/'), false);
});
