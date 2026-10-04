#!/usr/bin/env node
/**
 * Regenerates the icon set, the manifest and the social-share image from the master icon.
 *
 *     node scripts/build-brand-assets.mjs
 *
 * Master: design/brand/app-icon.png (square, 1024px). The site never serves it directly; it is far
 * too heavy for a favicon (it was 1 MB), so every size the browser can ask for is cut from it here.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const MASTER = path.join(ROOT, 'design', 'brand', 'app-icon.png');
const PUBLIC = path.join(ROOT, 'public');
const BG = '#0D0D0D';

if (!fs.existsSync(MASTER)) {
  console.error(`Missing ${path.relative(ROOT, MASTER)}`);
  process.exit(1);
}
fs.mkdirSync(path.join(PUBLIC, 'icons'), { recursive: true });

const icon = (size) => sharp(MASTER).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9, palette: true });

// PNG sizes the browsers, iOS and the web manifest ask for.
const sizes = { 'icon-32.png': 32, 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };
for (const [name, size] of Object.entries(sizes)) {
  await icon(size).toFile(path.join(PUBLIC, 'icons', name));
}

// favicon.ico: an ICO container holding PNG images (valid since Windows Vista, accepted by every browser).
const ico = async (list) => {
  const images = await Promise.all(list.map((s) => icon(s).toBuffer()));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const dir = images.map((buf, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(list[i] >= 256 ? 0 : list[i], 0);
    e.writeUInt8(list[i] >= 256 ? 0 : list[i], 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });
  return Buffer.concat([header, ...dir, ...images]);
};
fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), await ico([16, 32, 48]));

// Web manifest.
fs.writeFileSync(
  path.join(PUBLIC, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'AIJobSearchAgent',
      short_name: 'JobAgent',
      description: 'AI résumé tailoring, cover letters, application tracking and interview practice.',
      start_url: '/',
      display: 'standalone',
      background_color: BG,
      theme_color: BG,
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ) + '\n',
);

// Social share image, 1200x630: icon on the left, the pitch on the right.
const W = 1200;
const H = 630;
const iconBuf = await sharp(MASTER).resize(420, 420, { fit: 'cover' }).png().toBuffer();
const text = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C4A5FF"/><stop offset="1" stop-color="#7C9CFF"/>
    </linearGradient>
  </defs>
  <style>
    .h { font: 700 60px Arial, Helvetica, sans-serif; fill: #FFFFFF; }
    .s { font: 400 30px Arial, Helvetica, sans-serif; fill: #B8B8C6; }
    .t { font: 700 26px Arial, Helvetica, sans-serif; fill: url(#g); letter-spacing: 2px; }
  </style>
  <text x="560" y="205" class="t">AIJOBSEARCHAGENT</text>
  <text x="560" y="290" class="h">Tailor your résumé</text>
  <text x="560" y="360" class="h">to every job.</text>
  <text x="560" y="435" class="s">Résumé, cover letter and ATS keyword</text>
  <text x="560" y="475" class="s">analysis from the job description.</text>
  <text x="560" y="548" class="s" fill="#8f8fa3">agilepartners-ai.com</text>
</svg>`);
// The canvas matches the icon's own background (rgb 0,5,9) so the square does not show as a box.
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 5, b: 9, alpha: 1 } } })
  .composite([
    { input: iconBuf, left: 90, top: 105 },
    { input: text, left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(path.join(PUBLIC, 'og.png'));

for (const f of ['favicon.ico', 'og.png', 'manifest.webmanifest', ...Object.keys(sizes).map((n) => `icons/${n}`)]) {
  console.log(String(Math.round(fs.statSync(path.join(PUBLIC, f)).size / 1024)).padStart(5), 'KB', f);
}
