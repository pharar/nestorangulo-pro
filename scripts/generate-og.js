#!/usr/bin/env node
/**
 * Generates public/og-default.png using Playwright/Chromium.
 * Fonts are loaded from the project's own node_modules woff2 files,
 * so the rendered image matches the site exactly.
 *
 * Run: node scripts/generate-og.js
 * Requires: playwright (devDep), Chromium (npx playwright install chromium)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const OUT = path.join(ROOT, 'public', 'og-default.png');

// Embed assets as base64 data URIs — avoids file:// cross-origin restrictions
// in headless Chromium when using setContent().
const b64 = (p) => fs.readFileSync(p).toString('base64');

const FONTS = {
  frauncesItalic: `data:font/woff2;base64,${b64(path.join(NM, '@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2'))}`,
  ibmPlexSans400: `data:font/woff2;base64,${b64(path.join(NM, '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2'))}`,
  ibmPlexSans500: `data:font/woff2;base64,${b64(path.join(NM, '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2'))}`,
  ibmPlexMono400: `data:font/woff2;base64,${b64(path.join(NM, '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'))}`,
};

const ISOTIPO_B64 = b64(path.join(ROOT, 'public/images/isotipo-nestorangulo-pro.svg'));
const ISOTIPO_URI = `data:image/svg+xml;base64,${ISOTIPO_B64}`;

const html = /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Fraunces Variable';
    font-style: italic;
    font-weight: 100 900;
    src: url('${FONTS.frauncesItalic}') format('woff2');
  }
  @font-face {
    font-family: 'IBM Plex Sans';
    font-style: normal;
    font-weight: 400;
    src: url('${FONTS.ibmPlexSans400}') format('woff2');
  }
  @font-face {
    font-family: 'IBM Plex Sans';
    font-style: normal;
    font-weight: 500;
    src: url('${FONTS.ibmPlexSans500}') format('woff2');
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    font-style: normal;
    font-weight: 400;
    src: url('${FONTS.ibmPlexMono400}') format('woff2');
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: #faf9f7;
  }

  .card {
    width: 1200px;
    height: 630px;
    background: #faf9f7;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .top-bar {
    width: 100%;
    height: 7px;
    background: #c08c50;
    flex-shrink: 0;
  }

  .body {
    flex: 1;
    padding: 0 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-bottom: 50px;
  }

  .name {
    font-family: 'Fraunces Variable', Georgia, serif;
    font-size: 68px;
    font-weight: 700;
    font-style: italic;
    color: #1c1917;
    letter-spacing: -0.5px;
    line-height: 1.05;
    margin-bottom: 20px;
    white-space: nowrap;
  }

  .subtitle {
    font-family: 'IBM Plex Sans', Arial, sans-serif;
    font-size: 27px;
    font-weight: 500;
    color: #6b6663;
    letter-spacing: 0.1px;
    white-space: nowrap;
  }

  .logo {
    position: absolute;
    right: 68px;
    /* vertically center in the body area (623px - 7px bar) */
    top: 240px;
    width: 130px;
    height: auto;
  }

  .footer {
    padding: 0 80px 50px;
    flex-shrink: 0;
  }

  .sep {
    height: 1.5px;
    background: #e8e4df;
    margin-bottom: 22px;
    width: 1040px;
  }

  .domain {
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    font-size: 21px;
    font-weight: 400;
    color: #c08c50;
    letter-spacing: 0.3px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="top-bar"></div>
    <div class="body">
      <p class="name">Nestor Angulo de Ugarte</p>
      <p class="subtitle">Head of Security &thinsp;&middot;&thinsp; Security Program Builder &thinsp;&middot;&thinsp; CISSP</p>
    </div>
    <img class="logo" src="${ISOTIPO_URI}" alt="">
    <div class="footer">
      <div class="sep"></div>
      <span class="domain">nestorangulo.pro</span>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const png = await page.screenshot({
  clip: { x: 0, y: 0, width: 1200, height: 630 },
  type: 'png',
});

await browser.close();

fs.writeFileSync(OUT, png);
const kb = (png.length / 1024).toFixed(1);
console.log(`✓ ${OUT} — ${kb} KB (1200×630, Playwright/Chromium)`);
