import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedPaths, SHIPPABLE, worktreePath } from './ship.mjs';

test('changedPaths reads modified, untracked and renamed entries from porcelain', () => {
  const porcelain = [
    ' M src/content/talks/a.md',
    '?? src/content/talks-es/b.md',
    'R  src/content/talks/old.md -> src/content/talks/new.md',
    '',
  ].join('\n');
  assert.deepEqual(changedPaths(porcelain), [
    'src/content/talks/a.md',
    'src/content/talks-es/b.md',
    'src/content/talks/new.md',
  ]);
  assert.deepEqual(changedPaths(''), []);
});

test('only paths under src/content/ are shippable', () => {
  assert.ok('src/content/talks/a.md'.startsWith(SHIPPABLE));
  assert.ok(!'package.json'.startsWith(SHIPPABLE));
  assert.ok(!'src/contentious.ts'.startsWith(SHIPPABLE));
});

test('the worktree path is one flat directory under the temp dir', () => {
  assert.equal(
    worktreePath('/tmp', 'content/vienna-2024-x'),
    '/tmp/nestorangulo-pro-wt/content-vienna-2024-x'
  );
  assert.equal(worktreePath('/tmp', 'a/../../b'), '/tmp/nestorangulo-pro-wt/a-..-..-b');
});
