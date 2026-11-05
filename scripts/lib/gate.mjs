/**
 * The local gate: every check that has to pass before work is handed over.
 *
 * One list, used by `npm run gate` and by `housekeeping:verify`, so the two can
 * never disagree about what "green" means. CI runs the same checks as separate
 * jobs (so one failure does not hide another); this is the single command that
 * runs them all in one place, in an order that fails fast.
 *
 * Order: checks that need nothing but the sources come first (format, content
 * contract, script tests, types), then the build, then the contracts that read
 * `dist/` and so can only follow it. A step marked `needs` is skipped, not run,
 * when the step it depends on failed.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** `[label, npm script, label of the step it needs]`. */
const BASE_STEPS = [
  ['Format', 'format:check'],
  ['Content contract', 'check:content'],
  ['Script tests', 'test:scripts'],
  ['Type check', 'check'],
  ['Build', 'build'],
  ['URL contract', 'check:urls', 'Build'],
  ['CSP contract', 'check:csp', 'Build'],
  ['AI-readable layer', 'check:ai', 'Build'],
  ['Bilingual contract', 'check:i18n', 'Build'],
];

/** The ordered steps for the package.json in `cwd`. */
export function gateSteps(cwd = process.cwd()) {
  const scripts = JSON.parse(readFileSync(`${cwd}/package.json`, 'utf8')).scripts ?? {};
  // A step whose npm script is missing is a broken gate, not a step to skip quietly.
  for (const [label, script] of BASE_STEPS) {
    if (!scripts[script]) throw new Error(`gate step "${label}" needs npm script "${script}"`);
  }
  return BASE_STEPS.map(([label, script, needs]) => ({ label, script, needs }));
}

const say = (tag, msg) => console.log(`  ${tag.padEnd(8)}${msg}`);

/**
 * Runs every step, printing PASS/FAIL per step; never throws on a failing step.
 * Returns `{ failed }`, the set of labels that failed or were skipped.
 */
export function runGate({ cwd = process.cwd() } = {}) {
  const failed = new Set();
  for (const { label, script, needs } of gateSteps(cwd)) {
    if (needs && failed.has(needs)) {
      say('skip', `${label} (needs a successful ${needs})`);
      failed.add(label);
      continue;
    }
    const started = Date.now();
    const r = spawnSync('npm', ['run', script], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if ((r.status ?? 1) === 0) {
      say('PASS', `${label} (${seconds}s)`);
    } else {
      failed.add(label);
      say('FAIL', `${label} (npm run ${script}, ${seconds}s)`);
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
      console.log(out.trimEnd().split('\n').slice(-30).join('\n').replace(/^/gm, '          '));
    }
  }
  return { failed };
}
