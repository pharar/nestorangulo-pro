import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'post.mjs');

/** A minimal valid PNG of the given size (IHDR + empty IDAT + IEND; CRCs are not read). */
function png(width, height) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.alloc(0))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const GOOD = {
  title: "'An essay'",
  date: '2026-10-30',
  summary: "'A short blurb.'",
  language: 'en',
  themes: '\n  - Web Security',
  draft: 'true',
  cover: '../../images/writing/pic.jpg',
  coverAlt: "'A picture.'",
  ogImage: '/og/an-essay.png',
};
const GOOD_BODY =
  'Some text with [a talk](/speaking/foo/) and ![A chart](../../images/writing/pic.jpg).';

/** A repo-shaped tree with one essay, `an-essay`; `fields` override/remove (undefined) frontmatter keys. */
function tree({ fields = {}, body = GOOD_BODY, og = png(1200, 630) } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'post-'));
  const put = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const merged = { ...GOOD, ...fields };
  const fm = Object.entries(merged)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  put('src/content/writing/an-essay.md', `---\n${fm}\n---\n\n${body}\n`);
  put('src/images/writing/pic.jpg', 'x');
  if (og) put('public/og/an-essay.png', og);
  return root;
}

function post(root, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

const essay = (root) => readFileSync(join(root, 'src/content/writing/an-essay.md'), 'utf8');

function assertCheckFails(root, expected) {
  const { status, out } = post(root, 'check', 'an-essay');
  assert.equal(status, 1, out);
  assert.match(out, expected, out);
}

test('check passes on a good draft', () => {
  const { status, out } = post(tree(), 'check', 'an-essay');
  assert.equal(status, 0, out);
  assert.match(out, /fit to publish/);
});

test('check: empty summary', () => {
  assertCheckFails(tree({ fields: { summary: "''" } }), /summary is empty/);
});

test('check: no themes', () => {
  assertCheckFails(tree({ fields: { themes: ' []' } }), /no themes/);
  assertCheckFails(tree({ fields: { themes: undefined } }), /no themes/);
});

test('check: ogImage missing, absent file, wrong size, not a PNG', () => {
  assertCheckFails(tree({ fields: { ogImage: undefined } }), /ogImage is not set/);
  assertCheckFails(tree({ og: null }), /does not exist/);
  assertCheckFails(tree({ og: png(1200, 600) }), /is 1200x600, expected 1200x630/);
  assertCheckFails(
    tree({ og: Buffer.from('not a png at all, just text padding') }),
    /is not a PNG/
  );
});

test('check: cover needs coverAlt and an existing file', () => {
  assertCheckFails(tree({ fields: { coverAlt: undefined } }), /cover is set without coverAlt/);
  assertCheckFails(
    tree({ fields: { cover: '../../images/writing/gone.jpg' } }),
    /gone\.jpg not found/
  );
});

test('check: body images need alt text and an existing target', () => {
  assertCheckFails(tree({ body: '![](../../images/writing/pic.jpg)' }), /has no alt text/);
  assertCheckFails(
    tree({ body: '![A chart](../../images/writing/nope.png)' }),
    /nope\.png does not exist/
  );
});

test('check: internal page links need the trailing slash; files and external links do not', () => {
  assertCheckFails(tree({ body: 'See [about](/about).' }), /\/about lacks the trailing slash/);
  const ok = tree({ body: '[feed](/rss.xml) [x](https://example.com/a) [t](/speaking/foo/#s)' });
  assert.equal(post(ok, 'check', 'an-essay').status, 0);
});

test('check: leftover placeholders', () => {
  assertCheckFails(tree({ body: 'TODO write this' }), /placeholder.*TODO/);
  assertCheckFails(tree({ body: 'Figures: TBD.' }), /placeholder.*TBD/);
  assertCheckFails(tree({ body: 'Lorem ipsum dolor.' }), /placeholder.*lorem ipsum/);
  assertCheckFails(
    tree({ body: "<!-- Write the essay here. The text is the owner's to write. -->" }),
    /placeholder.*scaffold comment/
  );
});

test('check: a long summary and a future date only warn', () => {
  const root = tree({ fields: { summary: `'${'x'.repeat(170)}'`, date: '2999-01-01' } });
  const { status, out } = post(root, 'check', 'an-essay');
  assert.equal(status, 0, out);
  assert.match(out, /warn .*summary is 170 chars/);
  assert.match(out, /warn .*date 2999-01-01 is in the future/);
});

test('check: unknown slug is an error', () => {
  const { status, out } = post(tree(), 'check', 'nope');
  assert.equal(status, 1);
  assert.match(out, /no essay at/);
});

test('publish refuses when check fails and changes nothing', () => {
  const root = tree({ fields: { summary: "''" } });
  const before = essay(root);
  const { status, out } = post(root, 'publish', 'an-essay');
  assert.equal(status, 1, out);
  assert.match(out, /not published/);
  assert.equal(essay(root), before);
});

test('publish flips draft and sets the date, printing the lines it changed', () => {
  const root = tree();
  const { status, out } = post(root, 'publish', 'an-essay', '--date', '2026-11-06');
  assert.equal(status, 0, out);
  assert.match(out, /- draft: true/);
  assert.match(out, /\+ draft: false/);
  assert.match(out, /- date: 2026-10-30/);
  assert.match(out, /\+ date: 2026-11-06/);
  assert.match(essay(root), /^draft: false$/m);
  assert.match(essay(root), /^date: 2026-11-06$/m);
  assert.match(essay(root), /\n---\n\nSome text/);
});

test('publish on a published essay changes nothing', () => {
  const root = tree({ fields: { draft: 'false' } });
  const before = essay(root);
  const { status, out } = post(root, 'publish', 'an-essay');
  assert.equal(status, 0, out);
  assert.match(out, /already published/);
  assert.equal(essay(root), before);
});

test('publish --dry-run prints the change and writes nothing', () => {
  const root = tree();
  const before = essay(root);
  const { status, out } = post(root, 'publish', 'an-essay', '--dry-run');
  assert.equal(status, 0, out);
  assert.match(out, /dry run/);
  assert.match(out, /\+ draft: false/);
  assert.equal(essay(root), before);
});

test('touch sets updated; --dry-run does not', () => {
  const root = tree();
  const before = essay(root);
  assert.equal(post(root, 'touch', 'an-essay', '--date', '2026-11-07', '--dry-run').status, 0);
  assert.equal(essay(root), before);
  const { status, out } = post(root, 'touch', 'an-essay', '--date', '2026-11-07');
  assert.equal(status, 0, out);
  assert.match(out, /\+ updated: 2026-11-07/);
  assert.match(essay(root), /^updated: 2026-11-07$/m);
});

test('new creates a draft that then fails check only for what the owner has yet to do', () => {
  const root = mkdtempSync(join(tmpdir(), 'post-'));
  const { status, out } = post(root, 'new', 'Prueba de título — ¿función?', '--date', '2026-11-05');
  assert.equal(status, 0, out);
  const file = join(root, 'src/content/writing/prueba-de-titulo-funcion.md');
  assert.match(readFileSync(file, 'utf8'), /^draft: true$/m);
  const c = post(root, 'check', 'prueba-de-titulo-funcion');
  assert.equal(c.status, 1);
  assert.match(c.out, /summary is empty/);
  assert.match(c.out, /no themes/);
  assert.match(c.out, /scaffold comment/);
});

test('new refuses an existing file, whether by slug collision or --slug', () => {
  const root = tree();
  const before = essay(root);
  for (const args of [['An essay'], ['Anything', '--slug', 'an-essay'], ['AN ESSAY!']]) {
    const { status, out } = post(root, 'new', ...args);
    assert.equal(status, 1, out);
    assert.match(out, /already exists/);
  }
  assert.equal(essay(root), before);
});

test('new rejects bad input', () => {
  const root = mkdtempSync(join(tmpdir(), 'post-'));
  assert.match(post(root, 'new', 'T', '--slug', 'Not Kebab').out, /not lowercase kebab-case/);
  assert.match(post(root, 'new', 'T', '--date', '2026-02-30').out, /YYYY-MM-DD/);
  assert.match(post(root, 'new', 'T', '--language', 'fr').out, /en or es/);
  assert.match(post(root, 'new', '日本語').out, /pass --slug/);
  assert.equal(existsSync(join(root, 'src')), false);
});

test('new --dry-run prints the file and writes nothing', () => {
  const root = mkdtempSync(join(tmpdir(), 'post-'));
  const { status, out } = post(root, 'new', 'Hello there', '--dry-run');
  assert.equal(status, 0, out);
  assert.match(out, /would create .*hello-there\.md/);
  assert.match(out, /draft: true/);
  assert.deepEqual(readdirSync(root), []);
});

test('og --dry-run reports the plan and writes no card', () => {
  const root = tree({ fields: { ogImage: undefined }, og: null });
  const { status, out } = post(root, 'og', 'an-essay', '--dry-run');
  assert.equal(status, 0, out);
  assert.match(out, /kicker  ESSAY · OCTOBER 2026/);
  assert.match(out, /title   An <em>essay<\/em>/);
  assert.match(out, /ogImage: \/og\/an-essay\.png/);
  assert.equal(existsSync(join(root, 'public/og/an-essay.png')), false);
  assert.match(
    post(root, 'og', 'an-essay', '--accent', 'nope', '--dry-run').out,
    /end of the title/
  );
});

test('list shows date, status and whether a card is set', () => {
  const { status, out } = post(tree(), 'list');
  assert.equal(status, 0, out);
  assert.match(out, /2026-10-30\s+draft\s+og\s+an-essay\s+An essay/);
});
