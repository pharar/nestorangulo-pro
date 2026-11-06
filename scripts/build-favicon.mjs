/*
 * Rasterises the NR mark into the committed fallback icons: public/favicon.ico
 * (16/32/48) and public/apple-touch-icon.png (180). Browsers with SVG favicon
 * support use public/favicon.svg instead; these match its light variant.
 *
 * The mark is 186×173, not square. Resizing it straight to a square crops its
 * sides (sharp's default fit is `cover`), so it is first set on a 206×206
 * cream square at the same size and offset as favicon.svg: scaled to 174×162
 * and centred. The square stays opaque and unrounded — iOS applies its own
 * mask, and turns transparency black.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const CREAM = '#FAF9F7'; // site background; also replaces the mark's #fbfafb backing

const mark = readFileSync('public/images/isotipo-nestorangulo-pro.svg', 'utf8')
  .replace(/<\?xml[^>]*\?>|<!DOCTYPE[^>]*>/g, '')
  .replace(/#fbfafb/gi, CREAM)
  .replace('<svg ', '<svg x="16" y="22" width="174" height="162" ');

if (!mark.includes('<svg x="16"')) {
  throw new Error('isotipo SVG no longer starts with <svg …>; update build-favicon.mjs');
}

const svgSrc = `<svg xmlns="http://www.w3.org/2000/svg" width="206" height="206" viewBox="0 0 206 206"><rect width="206" height="206" fill="${CREAM}"/>${mark}</svg>`;

async function rasterize(size) {
  return sharp(Buffer.from(svgSrc)).resize(size, size).png().toBuffer();
}

// Build ICO file with embedded PNG images (Vista+ format, universally supported)
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffset = headerSize + dirEntrySize * count;
  const totalSize = dataOffset + pngBuffers.reduce((sum, buf) => sum + buf.length, 0);
  const ico = Buffer.alloc(totalSize);

  ico.writeUInt16LE(0, 0); // reserved
  ico.writeUInt16LE(1, 2); // type = icon
  ico.writeUInt16LE(count, 4); // image count

  let offset = dataOffset;
  pngBuffers.forEach((buf, i) => {
    const entry = headerSize + i * dirEntrySize;
    // Read dimensions from PNG IHDR chunk (bytes 16-23)
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    ico.writeUInt8(w >= 256 ? 0 : w, entry);
    ico.writeUInt8(h >= 256 ? 0 : h, entry + 1);
    ico.writeUInt8(0, entry + 2); // color count
    ico.writeUInt8(0, entry + 3); // reserved
    ico.writeUInt16LE(1, entry + 4); // planes
    ico.writeUInt16LE(32, entry + 6); // bit depth
    ico.writeUInt32LE(buf.length, entry + 8); // image size
    ico.writeUInt32LE(offset, entry + 12); // image offset
    buf.copy(ico, offset);
    offset += buf.length;
  });

  return ico;
}

const [px16, px32, px48] = await Promise.all([16, 32, 48].map(rasterize));

writeFileSync('public/favicon.ico', buildIco([px16, px32, px48]));
console.log('favicon.ico written: public/favicon.ico');

const touchIcon = await rasterize(180);
writeFileSync('public/apple-touch-icon.png', touchIcon);
console.log('apple-touch-icon.png written: public/apple-touch-icon.png');
