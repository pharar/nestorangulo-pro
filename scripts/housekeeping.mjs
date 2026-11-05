#!/usr/bin/env node
/**
 * Housekeeping: find what has fallen behind, and prove an update broke nothing.
 *
 *   report     What is behind — runtime, dependencies, overrides, advisories,
 *              Dependabot alerts, CI actions, open Dependabot PRs. Read-only.
 *              The default.
 *   baseline   Build the site as it stands and keep a copy to compare against.
 *              Run it BEFORE changing anything.
 *   verify     The local gate: format, types, build, URL and CSP contracts,
 *              audit — then a diff of the built site against the baseline.
 *              `--assets` also regenerates the committed favicons and OG card
 *              and fails if their bytes changed.
 *   probe-ts   Install a newer TypeScript, run `astro check`, put everything
 *              back. Takes a version or dist-tag; defaults to `latest`.
 *
 * The procedure these fit into is documentation/HOUSEKEEPING.md.
 *
 * No dependencies. `report` needs the network (npm registry, nodejs.org, the
 * GitHub API); everything else runs offline.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

/**
 * Majors deliberately not taken. `report` lists these as held rather than as
 * work to do, and says when the reason stops applying. Each one is explained in
 * documentation/HOUSEKEEPING.md — add the entry there before adding one here.
 */
const HELD = {
  typescript: '`astro check` does not run on it yet',
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Runs a command and captures its output; never throws on a non-zero exit. */
function run(cmd, args, { inherit = false } = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
    maxBuffer: 64 * 1024 * 1024,
  });
  // `out` is for showing to a person; anything parsed must read `stdout` alone,
  // or a warning on stderr turns valid JSON into a parse error.
  const stdout = r.stdout ?? '';
  return { status: r.status ?? 1, stdout, out: `${stdout}${r.stderr ?? ''}` };
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': `${pkg.name}-housekeeping`, ...headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

const registry = (name) => getJson(`https://registry.npmjs.org/${name}/latest`);

/**
 * The GitHub API allows 60 anonymous requests an hour, which one report can use
 * a third of. A token lifts that; `gh` supplies one when it is logged in.
 */
function githubHeaders() {
  const token =
    process.env.GH_TOKEN || process.env.GITHUB_TOKEN || run('gh', ['auth', 'token']).stdout.trim();
  const headers = { Accept: 'application/vnd.github+json' };
  if (token && !/\s/.test(token)) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const major = (v) =>
  Number(
    String(v)
      .replace(/^[^\d]*/, '')
      .split('.')[0]
  );
const minor = (v) =>
  Number(
    String(v)
      .replace(/^[^\d]*/, '')
      .split('.')[1] ?? 0
  );

let attention = 0;
const say = (tag, msg) => console.log(`  ${tag.padEnd(8)}${msg}`);
const ok = (msg) => say('ok', msg);
const todo = (msg) => (attention++, say('TODO', msg));
const section = (title) => console.log(`\n${title}`);

/** One section failing (offline, rate-limited) must not hide the others. */
async function guarded(title, fn) {
  section(title);
  try {
    await fn();
  } catch (err) {
    say('skip', `could not check: ${err.message}`);
  }
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// ── report ─────────────────────────────────────────────────────────────────

async function reportRuntime() {
  const pinned = readFileSync('.nvmrc', 'utf8').trim();
  const lts = (await getJson('https://nodejs.org/dist/index.json')).filter((r) => r.lts);
  const newestMajor = Math.max(...lts.map((r) => major(r.version)));
  const newest = lts.find((r) => major(r.version) === newestMajor);
  const label = `newest LTS is ${newestMajor} "${newest.lts}" (${newest.version}, ships npm ${newest.npm})`;
  if (major(pinned) < newestMajor) todo(`Node: .nvmrc pins ${pinned}; ${label}`);
  else ok(`Node: .nvmrc pins ${pinned}; ${label}`);

  const pinnedNpm = (pkg.packageManager ?? '').replace(/^npm@/, '');
  const npm = await registry('npm');
  if (pinnedNpm !== npm.version) {
    todo(
      `npm: packageManager pins ${pinnedNpm}; latest is ${npm.version} (needs node ${npm.engines?.node})`
    );
  } else {
    ok(`npm: packageManager pins ${pinnedNpm}, the latest`);
  }
}

async function reportDependencies() {
  // `npm outdated` exits 1 when anything is outdated; the JSON is still valid.
  const outdated = JSON.parse(run('npm', ['outdated', '--json']).stdout || '{}');
  const names = Object.keys(outdated);
  if (names.length === 0) ok('every direct dependency is on its latest release');

  for (const name of names) {
    const { current, wanted, latest } = outdated[name];
    const heldMajor = HELD[name] && major(latest) > major(current) && wanted === current;
    if (heldMajor) say('held', `${name} ${current} — ${latest} exists, but ${HELD[name]}`);
    else todo(`${name} ${current} → ${latest}`);
  }

  if (HELD.typescript) await reportTypeScriptHold();
}

/**
 * TypeScript is held because of the type checker, not because of this site's
 * code, so the hold lifts when the checker's situation changes. Two ways out:
 * `@astrojs/check` starts accepting the new major, or TypeScript 7.1 — the first
 * release with content mappers, which let plain `tsc` read `.astro` files — goes
 * stable.
 */
async function reportTypeScriptHold() {
  const [check, ts] = await Promise.all([registry('@astrojs/check'), registry('typescript')]);
  const installed = major(pkg.devDependencies?.typescript ?? '0');
  if (major(ts.version) <= installed) return;

  const peer = check.peerDependencies?.typescript ?? '';
  const peerAccepts = peer.split('||').some((range) => major(range) === major(ts.version));
  const mapperReady = major(ts.version) > 7 || (major(ts.version) === 7 && minor(ts.version) >= 1);

  say(
    '',
    `@astrojs/check ${check.version} accepts typescript "${peer}"; latest typescript is ${ts.version}`
  );
  if (peerAccepts) todo('@astrojs/check now accepts it — run `npm run housekeeping:probe-ts`');
  if (mapperReady) todo('TypeScript ≥ 7.1 is stable — the content-mapper route is open');
  if (!peerAccepts && !mapperReady) say('', 'neither way out is open yet; nothing to do');
}

async function reportOverrides() {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')).packages;
  const leaves = [];
  (function collect(node, path) {
    for (const [key, value] of Object.entries(node ?? {})) {
      if (typeof value === 'string') leaves.push({ path: [...path, key], spec: value });
      else collect(value, [...path, key]);
    }
  })(pkg.overrides, []);

  if (leaves.length === 0) ok('no overrides');
  for (const { path, spec } of leaves) {
    const name = path.at(-1) === '.' ? path.at(-2) : path.at(-1);
    const where = path.join(' › ');
    // `$name` is a reference to the root dependency's version, not a pin of its own.
    if (spec.startsWith('$')) {
      ok(`${where} = ${spec} (follows the root version)`);
      continue;
    }
    const installed = lock[`node_modules/${name}`]?.version ?? '?';
    const latest = (await registry(name)).version;
    todo(`${where} pinned to "${spec}" (installed ${installed}, latest ${latest}) — still needed?`);
  }
}

async function reportSecurity() {
  const audit = JSON.parse(run('npm', ['audit', '--json']).stdout || '{}');
  const counts = audit.metadata?.vulnerabilities;
  if (!counts) throw new Error('npm audit returned no summary');
  if (counts.total === 0) return ok('npm audit: 0 vulnerabilities');
  const breakdown = ['critical', 'high', 'moderate', 'low']
    .filter((level) => counts[level])
    .map((level) => `${counts[level]} ${level}`)
    .join(', ');
  todo(`npm audit: ${counts.total} vulnerabilities (${breakdown})`);
}

const repoSlug = () => {
  const slug = pkg.repository?.url?.match(/github\.com[:/](.+?)(?:\.git)?$/)?.[1];
  if (!slug) throw new Error('no GitHub repository in package.json');
  return slug;
};

/** Negative when `a` is older than `b`. Numeric x.y.z only; pre-release tags are ignored. */
function compareVersions(a, b) {
  const parts = (v) => String(v).split(/[.+-]/).slice(0, 3).map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
}

/**
 * GitHub's Dependabot alerts, checked against THIS checkout's lockfile.
 *
 * `npm audit` counts vulnerable packages; GitHub counts advisories, and keeps
 * counting them against the default branch until a fix is merged. So on an
 * update branch the two disagree — 9 against 40 on the first run — and the
 * useful question is neither number but "does this lockfile clear them all?".
 * Alerts are private even on a public repo, so this needs a token.
 */
async function reportAlerts() {
  const headers = githubHeaders();
  if (!headers.Authorization) {
    return say('skip', 'Dependabot alerts need a GitHub token — `gh auth login` provides one');
  }
  const alerts = await getJson(
    `https://api.github.com/repos/${repoSlug()}/dependabot/alerts?state=open&per_page=100`,
    headers
  );
  if (alerts.length === 0) return ok('no open Dependabot alerts');

  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')).packages;
  const installed = (name) =>
    Object.entries(lock)
      .filter(([path]) => path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`))
      .map(([, entry]) => entry.version);

  const unresolved = new Map(); // package -> { needs, have, count }
  for (const alert of alerts) {
    const name = alert.dependency.package.name;
    const patched = alert.security_vulnerability.first_patched_version?.identifier;
    const have = installed(name);
    // No patched version means there is nothing to update to: always unresolved.
    if (patched && have.every((v) => compareVersions(v, patched) >= 0)) continue;
    const entry = unresolved.get(name) ?? { needs: patched, have, count: 0 };
    if (patched && entry.needs && compareVersions(patched, entry.needs) > 0) entry.needs = patched;
    entry.count++;
    unresolved.set(name, entry);
  }

  const total = `${alerts.length}${alerts.length === 100 ? '+' : ''} open Dependabot alert(s) on the default branch`;
  if (unresolved.size === 0) return ok(`${total} — all cleared by this checkout's lockfile`);
  say('', `${total}; this checkout's lockfile still has:`);
  for (const [name, { needs, have, count }] of unresolved) {
    const fix = needs ? `needs ≥ ${needs}` : 'no patched release yet';
    todo(`${name} ${have.join(', ')} — ${fix} (${count} alert(s))`);
  }
}

async function reportActions() {
  const dir = '.github/workflows';
  const used = new Map(); // "owner/repo" -> Set of refs
  for (const file of existsSync(dir) ? readdirSync(dir) : []) {
    const text = readFileSync(join(dir, file), 'utf8');
    for (const m of text.matchAll(/uses:\s*([\w.-]+\/[\w.-]+)[^@\s]*@(\S+)/g)) {
      if (!used.has(m[1])) used.set(m[1], new Set());
      used.get(m[1]).add(m[2]);
    }
  }
  const headers = githubHeaders();
  for (const [repo, refs] of used) {
    const { tag_name: latest } = await getJson(
      `https://api.github.com/repos/${repo}/releases/latest`,
      headers
    );
    for (const ref of refs) {
      if (!/^v?\d/.test(ref)) todo(`${repo}@${ref} is not a version tag; latest is ${latest}`);
      else if (major(ref) < major(latest)) todo(`${repo}@${ref} → ${latest}`);
      else ok(`${repo}@${ref} (latest ${latest})`);
    }
  }
}

async function reportDependabot() {
  const slug = repoSlug();
  const headers = githubHeaders();
  const pulls = (
    await getJson(`https://api.github.com/repos/${slug}/pulls?state=open&per_page=100`, headers)
  ).filter((pr) => pr.user?.login === 'dependabot[bot]');

  if (pulls.length === 0) return ok('no open Dependabot pull requests');
  for (const pr of pulls) {
    const { check_runs: runs } = await getJson(
      `https://api.github.com/repos/${slug}/commits/${pr.head.sha}/check-runs?per_page=100`,
      headers
    );
    // A run with no conclusion yet is still going, which is not the same as failing.
    const running = runs.some((r) => r.conclusion === null);
    const failing = runs
      .filter((r) => r.conclusion && !['success', 'neutral', 'skipped'].includes(r.conclusion))
      .map((r) => r.name);
    const checks = failing.length
      ? `FAILING: ${failing.join(', ')}`
      : running
        ? 'checks still running'
        : 'checks green';
    todo(`#${pr.number} ${pr.title} (opened ${pr.created_at.slice(0, 10)}, ${checks})`);
  }
}

async function report() {
  console.log(`Housekeeping report — ${pkg.name} ${pkg.version}`);
  await guarded('Runtime', reportRuntime);
  await guarded('Direct dependencies', reportDependencies);
  await guarded('Overrides', reportOverrides);
  await guarded('Security advisories', reportSecurity);
  await guarded('Dependabot alerts', reportAlerts);
  await guarded('GitHub Actions', reportActions);
  await guarded('Open Dependabot pull requests', reportDependabot);
  console.log(
    attention === 0 ? '\nEverything is current.\n' : `\n${attention} item(s) need attention.\n`
  );
}

// ── baseline / verify ──────────────────────────────────────────────────────

// Outside the repo on purpose: `npm ci` wipes node_modules, and `dist/` is what
// is being compared. Keyed by checkout path so worktrees do not collide.
const STATE = join(
  tmpdir(),
  `${pkg.name}-housekeeping`,
  createHash('sha1').update(process.cwd()).digest('hex').slice(0, 8)
);
const BASELINE = join(STATE, 'baseline');

function baseline() {
  if (run('npm', ['run', 'build'], { inherit: true }).status !== 0) process.exit(1);
  rmSync(STATE, { recursive: true, force: true });
  mkdirSync(STATE, { recursive: true });
  cpSync('dist', BASELINE, { recursive: true });
  const head = run('git', ['rev-parse', '--short', 'HEAD']).out.trim();
  writeFileSync(join(STATE, 'meta.json'), JSON.stringify({ head, taken: new Date() }));
  console.log(`\nBaseline of ${head} saved to ${BASELINE}\n`);
}

/** Strips what legitimately changes on every build or upgrade. */
const normalise = (text) =>
  text
    .replace(/Astro v[\d.]+/g, 'Astro vX')
    .replace(/sha(256|384|512)-[A-Za-z0-9+/=]+/g, 'sha$1-HASH')
    .replace(/\.[A-Za-z0-9_-]{8}(?:_[A-Za-z0-9_-]+)?\.([a-z0-9]{2,5})\b/g, '.HASH.$1');

const fileSet = (dir) =>
  walk(dir)
    .map((f) => normalise(relative(dir, f)))
    .sort();

/**
 * Diffs the built HTML against the baseline. A difference is not a failure —
 * upgrades are allowed to change output — but it has to be looked at, and pages
 * that changed the same way are folded together so 43 identical diffs read as
 * one.
 */
function compareWithBaseline() {
  if (!existsSync(BASELINE)) {
    say('skip', 'no baseline to compare with — `npm run housekeeping:baseline` takes one');
    return;
  }
  const { head } = JSON.parse(readFileSync(join(STATE, 'meta.json'), 'utf8'));
  console.log(`\nBuilt site vs baseline of ${head}`);

  const before = fileSet(BASELINE);
  const after = fileSet('dist');
  const gone = before.filter((f) => !after.includes(f));
  const added = after.filter((f) => !before.includes(f));
  if (gone.length + added.length === 0 && before.length === after.length) {
    ok(`same ${after.length} files`);
  } else {
    say('REVIEW', `file set changed (${before.length} → ${after.length})`);
    for (const f of gone) console.log(`          - ${f}`);
    for (const f of added) console.log(`          + ${f}`);
  }

  const groups = new Map(); // diff signature -> pages
  let same = 0;
  const pages = walk('dist').filter((f) => f.endsWith('.html'));
  for (const file of pages) {
    const name = relative('dist', file);
    const old = join(BASELINE, name);
    if (!existsSync(old)) continue; // already reported as an added file
    const a = normalise(readFileSync(old, 'utf8')).split(/(?=<)/);
    const b = normalise(readFileSync(file, 'utf8')).split(/(?=<)/);
    const removed = a.filter((t) => !b.includes(t));
    const inserted = b.filter((t) => !a.includes(t));
    if (removed.length + inserted.length === 0 && a.length === b.length) {
      same++;
      continue;
    }
    const signature = JSON.stringify([removed, inserted]);
    if (!groups.has(signature)) groups.set(signature, { removed, inserted, pages: [] });
    groups.get(signature).pages.push(name);
  }

  if (groups.size === 0) {
    ok(`all ${same} pages match (ignoring version strings and hashes)`);
    return;
  }
  say('', `${same} of ${pages.length} pages match (ignoring version strings and hashes)`);
  const clip = (t) => (t.length > 400 ? `${t.slice(0, 400)}…` : t).replace(/\s+/g, ' ');
  for (const { removed, inserted, pages: changed } of groups.values()) {
    say('REVIEW', `${changed.length} page(s) changed alike, e.g. ${changed[0]}`);
    for (const t of removed.slice(0, 4)) console.log(`          - ${clip(t)}`);
    for (const t of inserted.slice(0, 4)) console.log(`          + ${clip(t)}`);
    const more = removed.length + inserted.length - 8;
    if (more > 0) console.log(`          … and ${more} more changed element(s)`);
  }
}

function verify(flags) {
  const steps = [
    ['Format', 'npm', ['run', 'format:check']],
    ['Type check', 'npm', ['run', 'check']],
    ['Build', 'npm', ['run', 'build']],
    ['URL contract', 'npm', ['run', 'check:urls'], 'Build'],
    ['CSP contract', 'npm', ['run', 'check:csp'], 'Build'],
    ['AI-readable layer', 'npm', ['run', 'check:ai'], 'Build'],
    ['Audit', 'npm', ['audit']],
  ];
  if (flags.includes('--assets')) {
    steps.push(['Favicons', 'node', ['scripts/build-favicon.mjs']]);
    steps.push(['OG card', 'npm', ['run', 'og']]);
  }

  console.log(`Housekeeping verify — node ${process.version}\n`);
  const assetsBefore = run('git', ['status', '--porcelain', '--', 'public']).out;
  const failed = new Set();
  for (const [label, cmd, args, needs] of steps) {
    if (needs && failed.has(needs)) {
      say('skip', `${label} — needs a successful ${needs}`);
      failed.add(label);
      continue;
    }
    const { status, out } = run(cmd, args);
    if (status === 0) {
      ok(label);
    } else {
      failed.add(label);
      say('FAIL', label);
      console.log(out.trimEnd().split('\n').slice(-30).join('\n').replace(/^/gm, '          '));
    }
  }

  if (flags.includes('--assets')) {
    // The generators' output is committed, so a toolchain bump that changes a
    // single byte shows up as a dirty tree. Whether to commit it is a human call.
    const assetsAfter = run('git', ['status', '--porcelain', '--', 'public']).out;
    if (assetsAfter === assetsBefore) {
      ok('Generated assets are byte-identical to the committed ones');
    } else {
      failed.add('assets');
      say('FAIL', 'Generated assets differ from the committed ones:');
      console.log(assetsAfter.replace(/^/gm, '          '));
    }
  }

  if (!failed.has('Build')) compareWithBaseline();

  if (failed.size > 0) {
    console.error(`\n${failed.size} step(s) failed.\n`);
    process.exit(1);
  }
  console.log('\nGate is green.\n');
}

// ── probe-ts ───────────────────────────────────────────────────────────────

function probeTypeScript(target = 'latest') {
  const manifests = ['package.json', 'package-lock.json'];
  if (run('git', ['status', '--porcelain', '--', ...manifests]).out.trim()) {
    console.error('package.json / package-lock.json have uncommitted changes.');
    console.error('The probe restores both from git when it finishes — commit or stash first.');
    process.exit(1);
  }

  let verdict;
  try {
    console.log(`Installing typescript@${target}…`);
    const install = run('npm', ['install', '--save-dev', `typescript@${target}`]);
    if (install.status !== 0) throw new Error(`install failed:\n${install.out}`);
    const version = run('npx', ['tsc', '--version']).out.trim();

    console.log(`Running astro check on ${version}…\n`);
    const { status, out } = run('npx', ['astro', 'check']);
    console.log(out.trimEnd().replace(/^/gm, '    '));
    // Exit 0 is not enough: an unsupported compiler has also been seen to
    // produce no diagnostics at all. Supported means it checked files.
    const files = Number(out.match(/Result \((\d+) files?\)/)?.[1] ?? 0);
    verdict =
      status === 0 && files > 0
        ? `SUPPORTED — astro check passed on ${version} (${files} files).`
        : `NOT SUPPORTED — astro check exited ${status} on ${version}.`;
  } catch (err) {
    verdict = `INCONCLUSIVE — ${err.message}`;
  } finally {
    console.log('\nRestoring package.json, package-lock.json and node_modules…');
    run('git', ['checkout', '--', ...manifests]);
    const restore = run('npm', ['ci']);
    if (restore.status !== 0) {
      console.error('`npm ci` failed while restoring — run it by hand:\n' + restore.out);
    }
  }
  console.log(`\n${verdict}\n`);
}

// ── Entry point ────────────────────────────────────────────────────────────

const [command = 'report', ...args] = process.argv.slice(2);
switch (command) {
  case 'report':
    await report();
    break;
  case 'baseline':
    baseline();
    break;
  case 'verify':
    verify(args);
    break;
  case 'probe-ts':
    probeTypeScript(args[0]);
    break;
  default:
    console.error(`Unknown command "${command}". Use: report | baseline | verify | probe-ts`);
    process.exit(1);
}
