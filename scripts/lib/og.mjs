/**
 * Renders an HTML string to a 1200×630 PNG.
 *
 * Shared by `build-og.mjs` (the default card, from an SVG) and `post.mjs og`
 * (the per-essay card, from `assets/og/og-essay.html`). Both need the same
 * three things done the same way, so the same code does them: Montserrat
 * embedded as base64 (the render must not depend on fonts installed on the
 * machine, nor on the network), Chromium via Playwright so text really wraps,
 * and a 2× render downscaled to exactly 1200×630 so edges are crisp.
 *
 * Dependencies: playwright (Chromium: `npx playwright install chromium`), sharp.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTS = join(dirname(fileURLToPath(import.meta.url)), '../../assets/fonts');

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** `@font-face` rules for Montserrat Light (300) and Medium (500), data-URI embedded. */
export function fontFaces() {
  const face = (weight, file) => {
    const b64 = readFileSync(join(FONTS, file)).toString('base64');
    return `@font-face{font-family:'Montserrat';font-style:normal;font-weight:${weight};
    src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
  };
  return `${face(300, 'Montserrat-Light.ttf')}\n  ${face(500, 'Montserrat-Medium.ttf')}`;
}

/** Renders `html` (a full document) to PNG bytes, exactly 1200×630. */
export async function renderPng(html) {
  const { chromium } = await import('playwright');
  const { default: sharp } = await import('sharp');

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: OG_WIDTH, height: OG_HEIGHT },
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    // A template may set <html data-fit="pending"> while a script lays text out
    // (og-essay.html fits the title); wait for it to say "done".
    await page.waitForFunction(() => document.documentElement.dataset.fit !== 'pending');
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT } });
    // 2× screenshot → crisp downscale to exact 1200×630
    return await sharp(buf).resize(OG_WIDTH, OG_HEIGHT).png({ compressionLevel: 9 }).toBuffer();
  } finally {
    await browser.close();
  }
}
