/**
 * Ships one content change as a pull request, the way AGENTS.md asks for it:
 * a fresh worktree outside Dropbox off `origin/main`, the change, its own
 * `npm ci`, the full gate, one commit with the owner's identity, push, PR.
 * It never merges: that stays the owner's call (AGENTS.md, Shipping).
 *
 * Why a script: the change itself is often one frontmatter line, and the
 * ceremony around it (worktree, install, gate, commit, push, PR) was being
 * retyped by hand each time, with the same ways to get it wrong: working in
 * the Dropbox checkout, branching off a stale `main`, committing a stray file.
 *
 * Order: the change runs before the install, because the verbs only need the
 * repo files and the running script's own modules; `npm ci` is paid only when
 * there is something to gate. Nothing changed means no PR, and the worktree and
 * the branch are removed. A failed gate, an edit outside `src/content/` or a
 * failed push keeps the worktree and says where it is.
 *
 * Every program runs through `deps.run(cmd, args, opts)`; git always gets
 * `-C <dir>` so the tests can stub git, npm and gh without a real repository.
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

export class ShipError extends Error {}

/** Only content edits are shipped this way; anything else is a reviewable code change. */
export const SHIPPABLE = 'src/content/';

/** `git status --porcelain` -> the paths it lists (renames give the new path). */
export function changedPaths(porcelain) {
  return porcelain
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
}

export const worktreePath = (tmp, branch) =>
  join(tmp, 'nestorangulo-pro-wt', branch.replace(/[^\w.-]+/g, '-'));

function inside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * The PR flow around `change(root, deps)`, which edits files under `root` and
 * may print through `deps.out`. Returns `{ url }`, or `{ url: null }` when the
 * change left nothing to commit.
 *
 * `repo` is any directory inside the checkout the command was started from.
 * `trailers` are appended to the commit message; `footer` to the PR body.
 */
export async function shipAsPr({
  repo,
  branch,
  title,
  summary,
  change,
  deps,
  dry = false,
  trailers = [],
  footer,
}) {
  const { out } = deps;
  const run = (cmd, args, opts) => deps.run(cmd, args, opts);
  const must = (what, r) => {
    if (r.error || r.status !== 0) {
      const detail = (r.stderr || r.stdout || r.error?.message || '').trim();
      throw new ShipError(`${what} failed${detail ? `:\n${detail}` : ''}`);
    }
    return r;
  };

  const top = must(
    'git rev-parse',
    run('git', ['-C', repo, 'rev-parse', '--show-toplevel'])
  ).stdout.trim();
  const wt = worktreePath(deps.tmp(), branch);
  if (inside(top, wt)) throw new ShipError(`worktree path ${wt} is inside the repo`);

  out(`ship      branch ${branch} off origin/main, worktree ${wt}`);
  out(`          then the change, npm ci, npm run gate, commit, push, PR (never a merge)`);
  if (dry) {
    out('dry run: no worktree, no commit, no push. The change, as it would apply here:');
    await change(repo, deps, { dry: true });
    return { url: null };
  }

  const fetched = run('git', ['-C', top, 'fetch', 'origin']);
  if (fetched.error || fetched.status !== 0) {
    throw new ShipError(
      `git fetch origin failed: ${(fetched.stderr || fetched.error?.message || '').trim()}\nIf SSH hangs, AGENTS.md has the HTTPS fetch.`
    );
  }
  if (
    run('git', ['-C', top, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]).status === 0
  ) {
    throw new ShipError(`branch ${branch} already exists locally; pass --branch <name>`);
  }
  const remote = run('git', ['-C', top, 'ls-remote', '--exit-code', '--heads', 'origin', branch]);
  if (remote.status === 0)
    throw new ShipError(`branch ${branch} already exists on origin; pass --branch <name>`);
  if (existsSync(wt))
    throw new ShipError(`${wt} already exists; remove it or pass --branch <name>`);

  must(
    'git worktree add',
    run('git', ['-C', top, 'worktree', 'add', '-b', branch, wt, 'origin/main'])
  );
  const discard = () => {
    run('git', ['-C', top, 'worktree', 'remove', '--force', wt]);
    run('git', ['-C', top, 'branch', '-D', branch]);
  };
  const keep = (why) => new ShipError(`${why}\nThe worktree is kept for a look: ${wt}`);

  const lines = [];
  const tee = { ...deps, out: (s) => (lines.push(s), out(s)) };
  try {
    await change(wt, tee, { dry: false });
  } catch (e) {
    discard();
    throw e;
  }

  const porcelain = must('git status', run('git', ['-C', wt, 'status', '--porcelain'])).stdout;
  const paths = changedPaths(porcelain);
  if (paths.length === 0) {
    discard();
    out('nothing changed: no commit, no PR; the worktree and the branch are gone');
    return { url: null };
  }
  const stray = paths.filter((p) => !p.startsWith(SHIPPABLE));
  if (stray.length)
    throw keep(
      `the change touched files outside ${SHIPPABLE}: ${stray.join(', ')}; refusing to ship it`
    );

  out('\nnpm ci ...');
  const ci = run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: wt });
  if (ci.error || ci.status !== 0)
    throw keep(`npm ci failed: ${(ci.stderr || '').trim().split('\n').slice(-5).join('\n')}`);
  out('npm run gate ...');
  const gate = run('npm', ['run', 'gate'], { cwd: wt });
  if (gate.error || gate.status !== 0) {
    throw keep(
      `the gate failed:\n${`${gate.stdout}${gate.stderr}`.trim().split('\n').slice(-30).join('\n')}`
    );
  }
  out('gate      passed');

  const author = JSON.parse(readFileSync(join(wt, 'package.json'), 'utf8')).author ?? {};
  if (!author.name || !author.email)
    throw keep('package.json has no author name and email to commit as');
  const message = ['-m', title, '-m', summary];
  if (trailers.length) message.push('-m', trailers.join('\n'));
  must('git add', run('git', ['-C', wt, 'add', '--', ...paths]));
  must(
    'git commit',
    run('git', [
      '-C',
      wt,
      '-c',
      `user.name=${author.name}`,
      '-c',
      `user.email=${author.email}`,
      'commit',
      '-q',
      ...message,
    ])
  );
  const pushed = run('git', ['-C', wt, 'push', '-u', 'origin', branch]);
  if (pushed.error || pushed.status !== 0)
    throw keep(`git push failed: ${(pushed.stderr || '').trim()}`);

  const body = [
    summary,
    '',
    '```text',
    ...lines,
    '```',
    '',
    '## Test plan',
    '',
    '- [x] `npm run gate` in a fresh worktree off `origin/main`',
    '- [ ] CI green',
    ...(footer ? ['', footer] : []),
  ].join('\n');
  const pr = run(
    'gh',
    ['pr', 'create', '--base', 'main', '--head', branch, '--title', title, '--body', body],
    {
      cwd: wt,
    }
  );
  if (pr.error || pr.status !== 0) throw keep(`gh pr create failed: ${(pr.stderr || '').trim()}`);
  const url = pr.stdout.trim().split('\n').pop();

  run('git', ['-C', top, 'worktree', 'remove', '--force', wt]);
  out(`\nPR        ${url}`);
  out("merge     the owner's call, once CI is green: gh pr merge <number> --merge");
  return { url };
}
