/**
 * Regenerates the default social card, `public/og-default.png`, from
 * `assets/og/og-default.svg`. The output is committed; deploy does not run this.
 * The rendering itself (fonts, Chromium, 2× downscale) is in lib/og.mjs, shared
 * with the per-essay card (`npm run post -- og`).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fontFaces, renderPng } from './lib/og.mjs';

const svg = readFileSync('assets/og/og-default.svg', 'utf8');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFaces()}
  html,body{margin:0;padding:0;width:1200px;height:630px;background:#FAF9F7;}
  svg{display:block;width:1200px;height:630px;}
</style></head><body>${svg}</body></html>`;

writeFileSync('public/og-default.png', await renderPng(html));
console.log('OG written: public/og-default.png');
