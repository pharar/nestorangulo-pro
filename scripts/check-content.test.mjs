import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-content.mjs');

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

const card = (fields, body = 'Body.') =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n\n${body}\n`;

const GOOD_TALK = {
  title: "'A talk'",
  event: "'Somewhere 2024'",
  date: '2024-05-01',
  format: 'conference-talk',
  themes: '[]',
  summary: "'A short blurb.'",
  slidesUrl: 'https://assets.nestorangulo.pro/slides/good-talk-0123456789.pdf',
};
const GOOD_ESSAY = {
  title: "'An essay'",
  date: '2024-05-01',
  summary: "'A short blurb.'",
  cover: '../../images/writing/pic.jpg',
  coverAlt: "'A picture.'",
  ogImage: '/og/good-essay.png',
};

/** Builds a content tree; `talks` and `essays` map filename => frontmatter fields (or raw text). */
function tree({
  talks = { 'good-talk.md': GOOD_TALK },
  essays = { 'good-essay.md': GOOD_ESSAY },
  og,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cc-'));
  const put = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  for (const [name, f] of Object.entries(talks))
    put(`src/content/talks/${name}`, typeof f === 'string' ? f : card(f));
  for (const [name, f] of Object.entries(essays))
    put(`src/content/writing/${name}`, typeof f === 'string' ? f : card(f));
  put('src/images/writing/pic.jpg', 'x');
  put('public/og/good-essay.png', og ?? png(1200, 630));
  return root;
}

function run(root) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

function assertFails(root, label, detail) {
  const { status, out } = run(root);
  assert.equal(status, 1, out);
  assert.ok(out.includes(`FAIL  ${label}`), out);
  // A string is looked for as-is; a RegExp is matched. Never build one from the other.
  if (typeof detail === 'string') assert.ok(out.includes(detail), out);
  else if (detail) assert.match(out, detail, out);
}

test('a clean tree passes', () => {
  const { status, out } = run(tree());
  assert.equal(status, 0, out);
  assert.match(out, /Content contract holds\./);
});

test('ogImage must start with /', () => {
  const essay = { ...GOOD_ESSAY, ogImage: 'og/good-essay.png' };
  assertFails(tree({ essays: { 'good-essay.md': essay } }), 'ogImage', /must start with \//);
});

test('ogImage must exist under public/', () => {
  const essay = { ...GOOD_ESSAY, ogImage: '/og/missing.png' };
  assertFails(tree({ essays: { 'good-essay.md': essay } }), 'ogImage', /does not exist/);
});

test('ogImage must be 1200x630', () => {
  assertFails(tree({ og: png(1200, 600) }), 'ogImage', /is 1200x600, expected 1200x630/);
});

test('ogImage must be a PNG', () => {
  assertFails(
    tree({ og: Buffer.from('not a png at all, just text padding') }),
    'ogImage',
    /is not a PNG/
  );
});

test('cover without coverAlt fails (essay)', () => {
  const { coverAlt, ...essay } = GOOD_ESSAY;
  assertFails(tree({ essays: { 'good-essay.md': essay } }), 'cover set', /cover without coverAlt/);
});

test('cover without coverAlt fails (talk)', () => {
  const talk = { ...GOOD_TALK, cover: '../../images/writing/pic.jpg' };
  assertFails(tree({ talks: { 'good-talk.md': talk } }), 'cover set', /talks\/good-talk\.md/);
});

test('cover file must exist', () => {
  const essay = { ...GOOD_ESSAY, cover: '../../images/writing/gone.jpg' };
  assertFails(
    tree({ essays: { 'good-essay.md': essay } }),
    'cover file exists',
    /gone\.jpg not found/
  );
});

test('published talk without summary fails; a draft may omit it', () => {
  const { summary, ...bare } = GOOD_TALK;
  assertFails(
    tree({ talks: { 'good-talk.md': bare } }),
    'published talks have a summary',
    /empty summary/
  );
  const draft = { ...bare, draft: 'true' };
  assert.equal(run(tree({ talks: { 'good-talk.md': draft } })).status, 0);
});

test('published essay without summary fails; a draft may leave it empty', () => {
  const essay = { ...GOOD_ESSAY, summary: "''" };
  assertFails(
    tree({ essays: { 'good-essay.md': essay } }),
    'published essays have a summary',
    /writing\/good-essay\.md: empty summary/
  );
  const draft = { ...essay, draft: 'true' };
  assert.equal(run(tree({ essays: { 'good-essay.md': draft } })).status, 0);
});

test('more than six featured talks fails', () => {
  const talks = {};
  for (let i = 0; i < 7; i++) {
    talks[`t${i}.md`] = {
      ...GOOD_TALK,
      featured: 'true',
      slidesUrl: `https://assets.nestorangulo.pro/slides/t${i}-0123456789.pdf`,
    };
  }
  assertFails(tree({ talks }), 'at most 6 featured', /7 featured/);
  talks['t6.md'].draft = 'true';
  assert.equal(run(tree({ talks })).status, 0);
});

test('slidesUrl must carry the card stem and 10 hex characters', () => {
  for (const url of [
    'https://assets.nestorangulo.pro/slides/other-name-0123456789.pdf',
    'https://assets.nestorangulo.pro/slides/good-talk-0123456789ab.pdf',
    'https://assets.nestorangulo.pro/slides/good-talk-0123456XYZ.pdf',
    'https://assets.nestorangulo.pro/slides/good-talk.pdf',
  ]) {
    assertFails(
      tree({ talks: { 'good-talk.md': { ...GOOD_TALK, slidesUrl: url } } }),
      'slidesUrl on the assets host',
      url
    );
  }
});

test("slidesUrl on another host is not this rule's business", () => {
  const talk = { ...GOOD_TALK, slidesUrl: 'https://example.com/whatever.pdf' };
  assert.equal(run(tree({ talks: { 'good-talk.md': talk } })).status, 0);
});

test('slidesUrlExt must not be a Google Docs edit URL', () => {
  const talk = {
    ...GOOD_TALK,
    slidesUrlExt: 'https://docs.google.com/presentation/d/abc123/edit?usp=sharing',
  };
  assertFails(tree({ talks: { 'good-talk.md': talk } }), 'slidesUrlExt', /docs\.google\.com/);
  const ok = { ...GOOD_TALK, slidesUrlExt: 'https://docs.google.com/presentation/d/abc123/pub' };
  assert.equal(run(tree({ talks: { 'good-talk.md': ok } })).status, 0);
});

test('filenames must be lowercase kebab-case', () => {
  const root = tree({
    talks: { 'Bad_Name.md': { ...GOOD_TALK, slidesUrl: 'https://example.com/x.pdf' } },
  });
  assertFails(root, 'filenames are lowercase kebab-case', /talks\/Bad_Name\.md/);
});

test('a long summary without description only warns', () => {
  const talk = { ...GOOD_TALK, summary: `'${'x'.repeat(170)}'` };
  const { status, out } = run(tree({ talks: { 'good-talk.md': talk } }));
  assert.equal(status, 0, out);
  assert.match(out, /warn .*summary is 170 chars/);
});
