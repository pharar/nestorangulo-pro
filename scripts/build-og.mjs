import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const svg = readFileSync('assets/og/og-default.svg', 'utf8');
const light = readFileSync('assets/fonts/Montserrat-Light.ttf').toString('base64');
const medium = readFileSync('assets/fonts/Montserrat-Medium.ttf').toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Montserrat';font-style:normal;font-weight:300;
    src:url(data:font/ttf;base64,${light}) format('truetype');}
  @font-face{font-family:'Montserrat';font-style:normal;font-weight:500;
    src:url(data:font/ttf;base64,${medium}) format('truetype');}
  html,body{margin:0;padding:0;width:1200px;height:630px;background:#FAF9F7;}
  svg{display:block;width:1200px;height:630px;}
</style></head><body>${svg}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

// 2× screenshot → crisp downscale to exact 1200×630
await sharp(buf).resize(1200, 630).png({ compressionLevel: 9 }).toFile('public/og-default.png');
console.log('OG written: public/og-default.png');
