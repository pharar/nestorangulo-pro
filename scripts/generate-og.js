#!/usr/bin/env node
/**
 * Generates public/og-default.png from assets/og/og-default.svg.
 * Run once when the design changes: node scripts/generate-og.js
 * Requires: sharp (npm install --os=linux --cpu=x64 sharp)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');

// ── Font files ────────────────────────────────────────────────
const fonts = {
  frauncesItalic: fs.readFileSync(
    path.join(NM, '@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2'),
  ),
  ibmPlexSans400: fs.readFileSync(
    path.join(NM, '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2'),
  ),
  ibmPlexSans500: fs.readFileSync(
    path.join(NM, '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2'),
  ),
  ibmPlexMono400: fs.readFileSync(
    path.join(NM, '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'),
  ),
};

const fontCSS = `
@font-face {
  font-family: 'Fraunces Variable';
  font-style: italic;
  font-weight: 100 900;
  src: url('data:font/woff2;base64,${fonts.frauncesItalic.toString('base64')}') format('woff2');
}
@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  src: url('data:font/woff2;base64,${fonts.ibmPlexSans400.toString('base64')}') format('woff2');
}
@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 500;
  src: url('data:font/woff2;base64,${fonts.ibmPlexSans500.toString('base64')}') format('woff2');
}
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  src: url('data:font/woff2;base64,${fonts.ibmPlexMono400.toString('base64')}') format('woff2');
}
`;

// ── Build SVG with injected fonts ─────────────────────────────
const svgSource = fs.readFileSync(path.join(ROOT, 'assets/og/og-default.svg'), 'utf8');
const svgWithFonts = svgSource.replace(
  '<style id="font-styles">/* fonts injected at render time */</style>',
  `<style id="font-styles">${fontCSS}</style>`,
);

const svgBuffer = Buffer.from(svgWithFonts);

// ── Render isotipo at 138×128 ─────────────────────────────────
const isotipoSvg = fs.readFileSync(
  path.join(ROOT, 'public/images/isotipo-nestorangulo-pro.svg'),
);

// ── Composite: base + isotipo ─────────────────────────────────
const OUT = path.join(ROOT, 'public/og-default.png');

const base = sharp(svgBuffer, { density: 144 }).resize(1200, 630);

const isotipoBuffer = await sharp(isotipoSvg, { density: 144 })
  .resize(138, 128)
  .toBuffer();

const png = await base
  .composite([
    {
      input: isotipoBuffer,
      left: 994,
      top: 270,
    },
  ])
  .png({ compressionLevel: 9, palette: false })
  .toBuffer();

fs.writeFileSync(OUT, png);

const kb = (png.length / 1024).toFixed(1);
console.log(`✓ ${OUT} — ${kb} KB (${1200}×${630})`);
