#!/usr/bin/env node
/**
 * `npm run gate` — run every local check and say which passed.
 *
 * The steps live in scripts/lib/gate.mjs. Run this before handing anything
 * over: CI will run the same checks, but a red CI run on `main` is already live
 * (Cloudflare deploys regardless), so the failure belongs here, first.
 *
 * Exits non-zero if any step failed. No dependencies.
 */

import { runGate } from './lib/gate.mjs';

console.log(`Gate — node ${process.version}\n`);
const { failed } = runGate();

if (failed.size > 0) {
  console.error(`\nGate FAILED: ${[...failed].join(', ')}\n`);
  process.exit(1);
}
console.log('\nGate PASSED.\n');
