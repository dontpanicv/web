// Redraws public/brand/logo.svg (the thumb in the ringed planet) on a pixel grid and writes it as SVG:
// public/brand/mark.svg for the header and public/favicon.svg for the browser tab.
//
//   node scripts/pixel-mark.mjs [grid=32] [--preview out.png]
//
// Needs Chrome (CHROME=... if not at the usual path): the browser does the rasterizing.
import { readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const grid = Number(process.argv[2]) || 32;
const preview = process.argv.includes('--preview') ? process.argv[process.argv.indexOf('--preview') + 1] : null;
const logo = readFileSync(new URL('../public/brand/logo.svg', import.meta.url), 'utf8');

const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
/** One string per row, '#' where at least half of the cell is ink. */
const rows = await page.evaluate(
  async (svg, n) => {
    const image = new Image();
    image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
    await image.decode();
    // Drawn large first and averaged per cell, which keeps thin strokes (the ring) better than scaling straight down.
    const cell = 16;
    const size = n * cell;
    const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
    const ctx = canvas.getContext('2d');
    const scale = Math.min(size / image.width, size / image.height); // the logo is not square: centre it
    ctx.drawImage(image, (size - image.width * scale) / 2, (size - image.height * scale) / 2, image.width * scale, image.height * scale);
    const alpha = ctx.getImageData(0, 0, size, size).data;
    const out = [];
    for (let y = 0; y < n; y++) {
      let row = '';
      for (let x = 0; x < n; x++) {
        let sum = 0;
        for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) sum += alpha[((y * cell + dy) * size + x * cell + dx) * 4 + 3];
        row += sum / (cell * cell * 255) >= 0.5 ? '#' : '.';
      }
      out.push(row);
    }
    return out;
  },
  logo,
  grid,
);

// One path, a rectangle per horizontal run of ink.
const d = rows
  .flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`))
  .join('');
const svg = (extra) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" shape-rendering="crispEdges">${extra}<path fill="#1A1A17" d="${d}"/></svg>\n`;

if (preview) {
  const img = `data:image/svg+xml;base64,${Buffer.from(svg('')).toString('base64')}`;
  await page.setViewport({ width: 760, height: 300, deviceScaleFactor: 2 });
  await page.setContent(
    `<body style="margin:0;background:#F5F3EC;display:flex;gap:36px;padding:28px;align-items:center;font:12px monospace">` +
      [grid * 8, 64, 32, 16].map((w) => `<div><img src="${img}" width="${w}" style="display:block;margin-bottom:6px">${w}px</div>`).join('') +
      `<div>${grid} × ${grid}</div></body>`,
  );
  await page.screenshot({ path: preview });
} else {
  writeFileSync(new URL('../public/brand/mark.svg', import.meta.url), svg(''));
  // A tab can be dark: the favicon turns light there. (The header copy must not, the page is always light.)
  writeFileSync(new URL('../public/favicon.svg', import.meta.url), svg('<style>@media (prefers-color-scheme: dark){path{fill:#F5F3EC}}</style>'));
  console.log(`${grid} × ${grid} mark written to public/brand/mark.svg and public/favicon.svg`);
}
await browser.close();
