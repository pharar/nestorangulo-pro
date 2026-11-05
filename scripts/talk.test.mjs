import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readEntry } from './lib/frontmatter.mjs';
import {
  deckProblems,
  draftCard,
  isDeckUrlFor,
  isGoogleEditUrl,
  main,
  parseDeckName,
  schemaEnum,
} from './talk.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const CONFIG = `
const talks = defineCollection({
  schema: z.object({
    format: z.enum([
      'conference-talk',
      'webinar',
    ]),
    language: z.enum(['en', 'es']).default('en'),
  }),
});
`;

const card = (extra = {}) => {
  const f = {
    title: "'A talk'",
    event: "'Somewhere 2024'",
    date: '2024-05-01',
    format: 'conference-talk',
    themes: '[]',
    summary: "'S.'",
    featured: 'false',
    draft: 'false',
    ...extra,
  };
  return `---\n${Object.entries(f)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n\nBody.\n`;
};

/** A fixture tree. `talks` maps slug -> frontmatter overrides. */
function tree(talks) {
  const root = mkdtempSync(join(tmpdir(), 'talk-'));
  mkdirSync(join(root, 'src/content/talks'), { recursive: true });
  writeFileSync(join(root, 'src/content.config.ts'), CONFIG);
  for (const [slug, extra] of Object.entries(talks)) {
    writeFileSync(join(root, `src/content/talks/${slug}.md`), card(extra));
  }
  return root;
}

/** Every file under a directory with a content hash, to prove nothing was written. */
function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else out[p] = createHash('sha1').update(readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

/** Runs the CLI with process and network stubbed. */
async function talk(root, args, over = {}) {
  const out = [];
  const err = [];
  const calls = { run: [], head: [] };
  const deps = {
    out: (s) => out.push(s),
    err: (s) => err.push(s),
    run: (cmd, a) => {
      calls.run.push([cmd, ...a]);
      return (over.run ?? (() => ({ status: 0, stdout: '', stderr: '' })))(cmd, a);
    },
    head: async (url) => {
      calls.head.push(url);
      return (over.head ?? (() => ({ status: 404, headers: {} })))(url);
    },
    tmp: () => over.tmp ?? tmpdir(),
  };
  const code = await main([...args, '--root', root], deps);
  return { code, out: out.join('\n'), err: err.join('\n'), calls };
}

const read = (root, slug) => readFileSync(join(root, `src/content/talks/${slug}.md`), 'utf8');
const dataOf = (root, slug) => readEntry(join(root, `src/content/talks/${slug}.md`)).data;

// ── Validation ─────────────────────────────────────────────────────────────

test('deck names must be <kebab>-<10 hex>.pdf', () => {
  assert.deepEqual(parseDeckName('vienna-2024-x-0123456789.pdf'), {
    slug: 'vienna-2024-x',
    hash: '0123456789',
  });
  for (const bad of [
    'x-012345678.pdf',
    'x-0123456789a.pdf',
    'X-0123456789.pdf',
    'x-0123456789.PDF',
    'x.pdf',
    'x-ABCDEF0123.pdf',
  ]) {
    assert.equal(parseDeckName(bad), null, bad);
  }
});

test('an R2 URL must name the same slug, the assets host and a 10 hex hash', () => {
  const ok = 'https://assets.nestorangulo.pro/slides/a-1-b-0123456789.pdf';
  assert.equal(isDeckUrlFor('a-1-b', ok), true);
  assert.equal(isDeckUrlFor('a-1', ok), false);
  assert.equal(isDeckUrlFor('a-1-b', ok.replace('assets.', 'cdn.')), false);
  assert.equal(isDeckUrlFor('a-1-b', ok.replace('0123456789', '012345678')), false);
  assert.equal(isDeckUrlFor('a-1-b', ok.replace('https', 'http')), false);
});

test('Google edit URLs are recognised, view/export URLs are not', () => {
  assert.equal(isGoogleEditUrl('https://docs.google.com/presentation/d/abc/edit#slide=1'), true);
  assert.equal(isGoogleEditUrl('https://docs.google.com/presentation/d/abc/pub'), false);
  assert.equal(isGoogleEditUrl('https://example.com/edit'), false);
});

test('deckProblems accepts a good HEAD and names each wrong thing', () => {
  const good = {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'cache-control': 'public, max-age=31536000, immutable',
      'content-length': '10',
    },
  };
  assert.deepEqual(deckProblems(good, 10), []);
  assert.equal(deckProblems({ ...good, status: 404 }, 10).length, 1);
  assert.match(
    deckProblems({ ...good, headers: { ...good.headers, 'content-type': 'text/html' } }, 10)[0],
    /content-type/
  );
  assert.match(
    deckProblems({ ...good, headers: { ...good.headers, 'cache-control': 'max-age=60' } }, 10)[0],
    /immutable/
  );
  assert.match(deckProblems(good, 11)[0], /content-length/);
});

test('the format enum is read from the schema, and the real schema parses', () => {
  assert.deepEqual(schemaEnum(tree({}), 'format'), ['conference-talk', 'webinar']);
  assert.ok(schemaEnum(REPO, 'format').includes('conference-talk'));
  assert.deepEqual(schemaEnum(REPO, 'language'), ['en', 'es']);
  const bare = mkdtempSync(join(tmpdir(), 'talk-'));
  assert.throws(() => schemaEnum(bare, 'format'), /cannot read/);
});

// ── Shelf ──────────────────────────────────────────────────────────────────

const six = () => {
  const talks = {};
  for (let i = 1; i <= 6; i++) talks[`t${i}`] = { date: `2024-0${i}-01`, featured: 'true' };
  talks.extra = { date: '2023-01-01' };
  talks['a-draft'] = { date: '2025-01-01', draft: 'true', featured: 'true' };
  return talks;
};

test('shelf lists featured published talks newest first and ignores drafts', async () => {
  const root = tree(six());
  const r = await talk(root, ['shelf']);
  assert.equal(r.code, 0);
  assert.ok(r.out.indexOf('t6') < r.out.indexOf('t1'));
  assert.doesNotMatch(r.out, /a-draft/);
  assert.match(r.out, /Featured shelf: 6\/6/);
});

test('feature refuses when the shelf is full and changes nothing', async () => {
  const root = tree(six());
  const before = snapshot(root);
  const r = await talk(root, ['feature', 'extra']);
  assert.equal(r.code, 1);
  assert.match(r.out, /shelf is full \(6\/6\)/);
  assert.match(r.err, /--swap/);
  assert.deepEqual(snapshot(root), before);
});

test('feature --swap demotes and promotes in one operation', async () => {
  const root = tree(six());
  const r = await talk(root, ['feature', 'extra', '--swap', 't1']);
  assert.equal(r.code, 0);
  assert.equal(dataOf(root, 'extra').featured, true);
  assert.equal(dataOf(root, 't1').featured, false);
  assert.match(r.out, /- featured: true/);
  assert.match(r.out, /\+ featured: false/);
  assert.match(r.out, /Featured shelf: 6\/6/);
});

test('--swap must name a talk that is on the shelf', async () => {
  const root = tree(six());
  const before = snapshot(root);
  const r = await talk(root, ['feature', 'extra', '--swap', 'a-draft']);
  assert.equal(r.code, 1);
  assert.deepEqual(snapshot(root), before);
});

test('feature below six just sets the flag; unfeature clears it', async () => {
  const root = tree({ a: {}, b: { featured: 'true' } });
  assert.equal((await talk(root, ['feature', 'a'])).code, 0);
  assert.equal(dataOf(root, 'a').featured, true);
  assert.equal((await talk(root, ['unfeature', 'a'])).code, 0);
  assert.equal(dataOf(root, 'a').featured, false);
});

test('a draft cannot be featured', async () => {
  const root = tree({ d: { draft: 'true' } });
  const r = await talk(root, ['feature', 'd']);
  assert.equal(r.code, 1);
  assert.match(r.err, /draft/);
});

test('--dry-run on feature/unfeature/video writes nothing and still prints the change', async () => {
  const root = tree(six());
  const before = snapshot(root);
  const a = await talk(root, ['feature', 'extra', '--swap', 't1', '--dry-run']);
  const b = await talk(root, ['unfeature', 't2', '--dry-run']);
  const c = await talk(root, ['video', 't2', 'https://example.com/v', '--dry-run']);
  assert.deepEqual([a.code, b.code, c.code], [0, 0, 0]);
  assert.match(a.out, /dry run/);
  assert.match(c.out, /\+ videoUrl: https:\/\/example\.com\/v/);
  assert.deepEqual(snapshot(root), before);
});

test('list --missing slides finds cards with no slides at all', async () => {
  const root = tree({
    a: { slidesUrl: 'https://x.test/a.pdf' },
    b: {},
    c: { slidesUrlExt: 'https://x.test/c.pdf' },
  });
  const r = await talk(root, ['list', '--missing', 'slides']);
  assert.match(r.out, /^b /m);
  assert.doesNotMatch(r.out, /^a /m);
  assert.doesNotMatch(r.out, /^c /m);
});

// ── new ────────────────────────────────────────────────────────────────────

const NEW = [
  'new',
  'osaka-2027-x',
  '--title',
  "It's a talk",
  '--event',
  'WordCamp Osaka 2027',
  '--date',
  '2027-03-02',
  '--format',
  'webinar',
];

test('new writes a draft card that parses with only the supplied facts', async () => {
  const root = tree({});
  const r = await talk(root, [...NEW, '--location', 'Osaka, Japan', '--language', 'es']);
  assert.equal(r.code, 0);
  const { data, body } = readEntry(join(root, 'src/content/talks/osaka-2027-x.md'));
  assert.equal(data.title, "It's a talk");
  assert.equal(data.event, 'WordCamp Osaka 2027');
  assert.equal(data.location, 'Osaka, Japan');
  assert.equal(isoDay(data.date), '2027-03-02');
  assert.equal(data.language, 'es');
  assert.equal(data.format, 'webinar');
  assert.deepEqual(data.themes, []);
  assert.equal(data.featured, false);
  assert.equal(data.draft, true);
  assert.equal(data.summary, undefined);
  assert.equal(body.trim(), '');
});

const isoDay = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d));

test('the draft card passes the repo content contract', () => {
  const root = tree({});
  mkdirSync(join(root, 'src/content/writing'), { recursive: true });
  writeFileSync(
    join(root, 'src/content/talks/d.md'),
    draftCard({ title: 'T', event: 'E', date: '2027-01-01', language: 'en', format: 'webinar' })
  );
  const r = spawnSync('node', [join(HERE, 'check-content.mjs'), '--root', root], {
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('new refuses bad slugs, missing facts, bad dates, bad formats and existing files', async () => {
  const root = tree({ taken: {} });
  const without = (flag) => {
    const i = NEW.indexOf(flag);
    return [...NEW.slice(0, i), ...NEW.slice(i + 2)];
  };
  for (const flag of ['--title', '--event', '--date', '--format']) {
    const r = await talk(root, without(flag));
    assert.equal(r.code, 1, flag);
    assert.match(r.err, new RegExp(`${flag} is required`));
  }
  const bad = [
    [['new', 'Not_Kebab', ...NEW.slice(2)], /kebab/],
    [[...NEW.slice(0, 7), '2027-02-30', ...NEW.slice(8)], /real YYYY-MM-DD/],
    [[...NEW.slice(0, 9), 'keynote'], /one of: conference-talk, webinar/],
    [[...NEW, '--language', 'fr'], /--language must be one of/],
    [['new', 'taken', ...NEW.slice(2)], /already exists/],
  ];
  for (const [args, re] of bad) {
    const r = await talk(root, args);
    assert.equal(r.code, 1, args.join(' '));
    assert.match(r.err, re);
  }
  assert.equal(existsSync(join(root, 'src/content/talks/osaka-2027-x.md')), false);
});

test('new --dry-run writes nothing', async () => {
  const root = tree({});
  const before = snapshot(root);
  const r = await talk(root, [...NEW, '--dry-run']);
  assert.equal(r.code, 0);
  assert.match(r.out, /dry run/);
  assert.deepEqual(snapshot(root), before);
});

// ── deck link ──────────────────────────────────────────────────────────────

const R2 = (slug) => `https://assets.nestorangulo.pro/slides/${slug}-0123456789.pdf`;

test('deck link moves an external slidesUrl to slidesUrlExt before pointing at R2', async () => {
  const ext = 'https://geneve.wordcamp.org/files/slides.pdf';
  const root = tree({ a: { slidesUrl: ext } });
  const r = await talk(root, ['deck', 'link', 'a', R2('a')]);
  assert.equal(r.code, 0, r.err);
  const d = dataOf(root, 'a');
  assert.equal(d.slidesUrl, R2('a'));
  assert.equal(d.slidesUrlExt, ext);
  assert.match(r.out, /\+ slidesUrlExt: /);
});

test('deck link on a fresh card sets only slidesUrl; --ext sets the official copy', async () => {
  const root = tree({ a: {}, b: {} });
  await talk(root, ['deck', 'link', 'a', R2('a')]);
  assert.equal(dataOf(root, 'a').slidesUrlExt, undefined);
  await talk(root, ['deck', 'link', 'b', R2('b'), '--ext', 'https://example.org/b.pdf']);
  assert.equal(dataOf(root, 'b').slidesUrlExt, 'https://example.org/b.pdf');
});

test('deck link never drops a provenance link or accepts a private one', async () => {
  const root = tree({
    a: { slidesUrl: 'https://one.test/a.pdf', slidesUrlExt: 'https://two.test/a.pdf' },
    b: {},
  });
  const before = snapshot(root);
  const clash = await talk(root, ['deck', 'link', 'a', R2('a')]);
  assert.equal(clash.code, 1);
  assert.match(clash.err, /would drop/);
  const edit = await talk(root, [
    'deck',
    'link',
    'b',
    R2('b'),
    '--ext',
    'https://docs.google.com/presentation/d/x/edit',
  ]);
  assert.equal(edit.code, 1);
  assert.match(edit.err, /edit URL/);
  const wrong = await talk(root, ['deck', 'link', 'b', R2('other')]);
  assert.equal(wrong.code, 1);
  assert.deepEqual(snapshot(root), before);
});

test('deck link --dry-run writes nothing', async () => {
  const root = tree({ a: { slidesUrl: 'https://one.test/a.pdf' } });
  const before = snapshot(root);
  const r = await talk(root, ['deck', 'link', 'a', R2('a'), '--dry-run']);
  assert.equal(r.code, 0);
  assert.match(r.out, /dry run/);
  assert.deepEqual(snapshot(root), before);
});

// ── deck prepare ───────────────────────────────────────────────────────────

const PDF = (n, tag = 'x') => Buffer.from(`%PDF-1.4\n${tag.repeat(n)}\n%%EOF\n`);
const sha10 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);

/**
 * Stub toolchain: `gs` writes `gsBytes` to its output file (or is missing),
 * `exiftool` appends a marker so the final bytes differ from the input.
 */
function toolchain({ gsBytes, haveGs = true, haveExif = true } = {}) {
  return (cmd, args) => {
    if (cmd === 'gs') {
      if (!haveGs)
        return {
          status: null,
          error: Object.assign(new Error('x'), { code: 'ENOENT' }),
          stdout: '',
          stderr: '',
        };
      if (args[0] === '--version') return { status: 0, stdout: '10', stderr: '' };
      const outFile = args.find((a) => a.startsWith('-sOutputFile=')).slice('-sOutputFile='.length);
      writeFileSync(outFile, gsBytes);
      return { status: 0, stdout: '', stderr: '' };
    }
    if (cmd === 'exiftool') {
      if (!haveExif)
        return {
          status: null,
          error: Object.assign(new Error('x'), { code: 'ENOENT' }),
          stdout: '',
          stderr: '',
        };
      if (args[0] === '-ver') return { status: 0, stdout: '12', stderr: '' };
      const file = args.at(-1);
      writeFileSync(file, Buffer.concat([readFileSync(file), Buffer.from(`%meta ${args[0]}\n`)]));
      return { status: 0, stdout: '', stderr: '' };
    }
    if (cmd === 'python3') return { status: 1, stdout: '', stderr: 'no pikepdf' };
    return { status: 0, stdout: '', stderr: '' };
  };
}

function deckFixture(srcBytes) {
  const root = tree({ 'k-2026-x': { title: "'Big talk'", event: "'Conclave 2026: Tagline'" } });
  const work = mkdtempSync(join(tmpdir(), 'deck-'));
  const src = join(work, 'in.pdf');
  writeFileSync(src, srcBytes);
  return { root, src, out: join(work, 'out') };
}

test('deck prepare keeps the original when ghostscript saves under 25%, and hashes after metadata', async () => {
  const original = PDF(1000);
  const { root, src, out } = deckFixture(original);
  const r = await talk(
    root,
    ['deck', 'prepare', 'k-2026-x', src, '--event-short', 'Conclave 2026', '--out-dir', out],
    {
      run: toolchain({ gsBytes: PDF(900) }),
    }
  );
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /kept\s+original/);
  const [name] = readdirSync(out);
  const final = readFileSync(join(out, name));
  assert.ok(
    final.includes(Buffer.from('%meta -Title=Big talk — Conclave 2026')),
    'metadata written to the kept file'
  );
  assert.equal(name, `k-2026-x-${sha10(final)}.pdf`, 'hash is of the final bytes, after metadata');
  assert.notEqual(sha10(final), sha10(original));
  assert.equal(readdirSync(out).length, 1, 'temporary files are cleaned up');
  assert.ok(r.out.includes(`slides/${name}`), r.out);
  assert.ok(r.out.includes(`https://assets.nestorangulo.pro/slides/${name}`), r.out);
});

test('deck prepare keeps the compressed copy when it is at least 25% smaller', async () => {
  const { root, src, out } = deckFixture(PDF(1000));
  const r = await talk(
    root,
    ['deck', 'prepare', 'k-2026-x', src, '--event-short', 'E', '--out-dir', out],
    {
      run: toolchain({ gsBytes: PDF(500, 'g') }),
    }
  );
  assert.match(r.out, /kept\s+compressed/);
  assert.ok(readFileSync(join(out, readdirSync(out)[0])).includes(Buffer.from('ggg')));
});

test('deck prepare continues without compression when gs is missing, and says so', async () => {
  const { root, src, out } = deckFixture(PDF(100));
  const r = await talk(
    root,
    ['deck', 'prepare', 'k-2026-x', src, '--event-short', 'E', '--out-dir', out],
    {
      run: toolchain({ haveGs: false }),
    }
  );
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /gs not installed/);
});

test('deck prepare sets Subject from the card and refuses without a metadata tool', async () => {
  const { root, src, out } = deckFixture(PDF(100));
  const r = await talk(
    root,
    ['deck', 'prepare', 'k-2026-x', src, '--event-short', 'E', '--out-dir', out],
    {
      run: toolchain({ haveExif: false }),
    }
  );
  assert.equal(r.code, 1);
  assert.match(r.err, /install exiftool/);
  assert.equal(existsSync(out), false, 'failed before writing anything');
  const ok = await talk(
    root,
    ['deck', 'prepare', 'k-2026-x', src, '--event-short', 'E', '--out-dir', out, '--dry-run'],
    {
      run: toolchain({ gsBytes: PDF(1) }),
    }
  );
  assert.match(ok.out, /subject\s+Conclave 2026: Tagline/);
});

test('deck prepare refuses an out dir inside the repo, a missing card, a non-PDF and a missing --event-short', async () => {
  const { root, src } = deckFixture(PDF(100));
  const run = toolchain({ gsBytes: PDF(1) });
  const inside = await talk(
    root,
    ['deck', 'prepare', 'k-2026-x', src, '--event-short', 'E', '--out-dir', join(root, 'public')],
    { run }
  );
  assert.match(inside.err, /inside the repo/);
  const nocard = await talk(root, ['deck', 'prepare', 'nope', src, '--event-short', 'E'], { run });
  assert.match(nocard.err, /no card/);
  const txt = join(dirname(src), 'x.pdf');
  writeFileSync(txt, 'hello');
  const notpdf = await talk(root, ['deck', 'prepare', 'k-2026-x', txt, '--event-short', 'E'], {
    run,
  });
  assert.match(notpdf.err, /not a PDF/);
  const noshort = await talk(root, ['deck', 'prepare', 'k-2026-x', src], { run });
  assert.match(noshort.err, /--event-short is required/);
});

test('deck prepare --dry-run writes nothing', async () => {
  const { root, src, out } = deckFixture(PDF(100));
  const r = await talk(
    root,
    ['deck', 'prepare', 'k-2026-x', src, '--event-short', 'E', '--out-dir', out, '--dry-run'],
    {
      run: toolchain({ gsBytes: PDF(1) }),
    }
  );
  assert.equal(r.code, 0);
  assert.equal(existsSync(out), false);
});

// ── deck upload ────────────────────────────────────────────────────────────

function hashed(slug = 'k-2026-x') {
  const bytes = PDF(300, 'u');
  const dir = mkdtempSync(join(tmpdir(), 'up-'));
  const file = join(dir, `${slug}-${sha10(bytes)}.pdf`);
  writeFileSync(file, bytes);
  return { file, bytes, name: `${slug}-${sha10(bytes)}.pdf` };
}

const GOOD_HEAD = (size) => ({
  status: 200,
  headers: {
    'content-type': 'application/pdf',
    'cache-control': 'public, max-age=31536000, immutable',
    'content-length': String(size),
  },
});
const REMOTE_OUT = 'Resource location: remote\nUpload complete.';
const LOCAL_OUT = 'Resource location: local\nUpload complete.';

test('deck upload without --yes prints the plan and executes nothing, not even a HEAD', async () => {
  const root = tree({});
  const { file, name } = hashed();
  const r = await talk(root, ['deck', 'upload', file]);
  assert.equal(r.code, 0);
  assert.deepEqual(r.calls.run, []);
  assert.deepEqual(r.calls.head, []);
  assert.match(r.out, /bucket\s+nestorangulo-assets/);
  assert.match(r.out, new RegExp(`key\\s+slides/${name}`));
  assert.match(r.out, /--remote/);
  assert.match(r.out, /cache-control: public, max-age=31536000, immutable/);
  assert.match(r.out, /Plan only/);
});

test('deck upload --yes --dry-run is still only a plan', async () => {
  const root = tree({});
  const { file } = hashed();
  const r = await talk(root, ['deck', 'upload', file, '--yes', '--dry-run']);
  assert.deepEqual([r.calls.run, r.calls.head], [[], []]);
});

test('deck upload checks the file name and that the hash matches the bytes', async () => {
  const root = tree({});
  const { file, bytes } = hashed();
  const dir = mkdtempSync(join(tmpdir(), 'up-'));
  const misnamed = join(dir, 'deck.pdf');
  writeFileSync(misnamed, bytes);
  assert.match(
    (await talk(root, ['deck', 'upload', misnamed, '--yes'])).err,
    /<kebab-slug>-<10 hex>\.pdf/
  );
  const wrong = join(dir, 'k-0000000000.pdf');
  writeFileSync(wrong, bytes);
  const r = await talk(root, ['deck', 'upload', wrong, '--yes']);
  assert.match(r.err, /SHA-256 starts/);
  assert.deepEqual(r.calls.run, []);
  assert.ok(file);
});

test('deck upload --yes does not touch an object that already exists', async () => {
  const root = tree({});
  const { file, bytes, name } = hashed();
  const r = await talk(root, ['deck', 'upload', file, '--yes'], {
    head: () => GOOD_HEAD(bytes.length),
  });
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.calls.run, [], 'wrangler never ran');
  assert.match(r.out, /Already live/);
  assert.deepEqual(r.calls.head, [`https://assets.nestorangulo.pro/slides/${name}`]);
});

test('deck upload --yes runs wrangler with --remote, then verifies by HEAD', async () => {
  const root = tree({});
  const { file, bytes, name } = hashed();
  let uploaded = false;
  const r = await talk(root, ['deck', 'upload', file, '--yes'], {
    run: () => ((uploaded = true), { status: 0, stdout: REMOTE_OUT, stderr: '' }),
    head: () => (uploaded ? GOOD_HEAD(bytes.length) : { status: 404, headers: {} }),
  });
  assert.equal(r.code, 0, r.err);
  const [cmd, ...args] = r.calls.run[0];
  assert.equal(cmd, 'npx');
  assert.deepEqual(args.slice(0, 5), [
    'wrangler@latest',
    'r2',
    'object',
    'put',
    `nestorangulo-assets/slides/${name}`,
  ]);
  assert.ok(args.includes('--remote'));
  assert.ok(args.includes('--content-type=application/pdf'));
  assert.ok(args.includes('--cache-control=public, max-age=31536000, immutable'));
  assert.match(r.out, /verified/);
});

test('deck upload fails when wrangler reports a local resource location', async () => {
  const root = tree({});
  const { file } = hashed();
  const r = await talk(root, ['deck', 'upload', file, '--yes'], {
    run: () => ({ status: 0, stdout: LOCAL_OUT, stderr: '' }),
  });
  assert.equal(r.code, 1);
  assert.match(r.err, /Resource location: remote/);
  assert.match(r.err, /local simulator/);
  assert.equal(r.calls.head.length, 1, 'no verification pretended after a local upload');
});

test('deck upload fails when wrangler prints no resource location at all', async () => {
  const root = tree({});
  const { file } = hashed();
  const r = await talk(root, ['deck', 'upload', file, '--yes'], {
    run: () => ({ status: 0, stdout: 'Upload complete.', stderr: '' }),
  });
  assert.equal(r.code, 1);
  assert.match(r.err, /no such line/);
});

test('deck upload fails verification on a wrong size, and refuses to upload blind on a 5xx', async () => {
  const root = tree({});
  const { file, bytes } = hashed();
  let uploaded = false;
  const bad = await talk(root, ['deck', 'upload', file, '--yes'], {
    run: () => ((uploaded = true), { status: 0, stdout: REMOTE_OUT, stderr: '' }),
    head: () => (uploaded ? GOOD_HEAD(bytes.length + 1) : { status: 404, headers: {} }),
  });
  assert.match(bad.err, /content-length/);
  const blind = await talk(root, ['deck', 'upload', file, '--yes'], {
    head: () => ({ status: 503, headers: {} }),
  });
  assert.equal(blind.code, 1);
  assert.deepEqual(blind.calls.run, []);
});

// ── deck verify ────────────────────────────────────────────────────────────

test('deck verify checks every assets-host slidesUrl and fails when one is wrong', async () => {
  const root = tree({
    a: { slidesUrl: R2('a') },
    b: { slidesUrl: R2('b') },
    c: { slidesUrl: 'https://elsewhere.test/c.pdf' },
    d: {},
  });
  const r = await talk(root, ['deck', 'verify'], {
    head: (url) => (url === R2('b') ? { status: 404, headers: {} } : GOOD_HEAD(1)),
  });
  assert.equal(r.code, 1);
  assert.deepEqual(r.calls.head.sort(), [R2('a'), R2('b')]);
  assert.match(r.out, /FAIL {2}b /);
  assert.match(r.out, /ok {4}a /);
  assert.match(r.out, /2 deck\(s\) checked, 1 wrong/);
  const one = await talk(root, ['deck', 'verify', 'a'], { head: () => GOOD_HEAD(1) });
  assert.equal(one.code, 0);
});
