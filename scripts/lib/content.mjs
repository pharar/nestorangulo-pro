/**
 * Content-contract rules shared by `check-content.mjs` (every card, in the gate)
 * and `post.mjs check` (one essay, before it is published). One definition of
 * "a valid social card" and "a cover that exists", so the two cannot disagree.
 *
 * Each rule returns a message tail, or null when it holds; callers add the
 * "where" prefix. No dependencies, no side effects.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Longest `summary` that still makes a sensible meta description. */
export const DESCRIPTION_MAX = 160;

export const blank = (v) => typeof v !== 'string' || v.trim() === '';

/** Width and height from a PNG's IHDR chunk, or null when it is not a PNG. */
export function pngSize(file) {
  const b = readFileSync(file);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length < 24 || !b.subarray(0, 8).equals(signature)) return null;
  if (b.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** Why an essay's `ogImage` is unusable (it must be a /-rooted 1200×630 PNG under public/), or null. */
export function ogImageProblem(root, ogImage) {
  const og = String(ogImage);
  if (!og.startsWith('/')) return `ogImage "${og}" must start with /`;
  const file = join(root, 'public', og);
  if (!existsSync(file)) return `public${og} does not exist`;
  const size = pngSize(file);
  if (!size) return `public${og} is not a PNG`;
  if (size.width !== 1200 || size.height !== 630) {
    return `public${og} is ${size.width}x${size.height}, expected 1200x630`;
  }
  return null;
}

/** `cover` is a path relative to the card, resolved by Astro's image() helper. */
export function coverMissing(cardFile, cover) {
  return existsSync(resolve(dirname(cardFile), String(cover))) ? null : `${cover} not found`;
}
