#!/usr/bin/env node
/**
 * Extract parity anchors from compiled resume PDFs.
 *
 *   node scripts/parity/pdf-anchors.mjs <dir-with-pdfs> [<anchor-titles.json>]
 *
 * An anchor is a known string (name, section headings, entry titles). For each
 * one we record the page and the baseline's distance from the page top in pt.
 * The browser side (browser-anchors.js) records the same strings from the
 * preview, and compare.mjs diffs the two.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pdfjs = await import(pathToFileURL(path.join(root, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);

const dir = process.argv[2];
const anchorsFile = process.argv[3] ?? path.join(dir, 'anchors.json');
const anchorsByPreset = JSON.parse(fs.readFileSync(anchorsFile, 'utf8'));

const out = {};
for (const [preset, anchors] of Object.entries(anchorsByPreset)) {
  const file = path.join(dir, `${preset}.pdf`);
  if (!fs.existsSync(file)) continue;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: false }).promise;

  const lines = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const height = page.getViewport({ scale: 1 }).height;
    const tc = await page.getTextContent();
    // Merge fragments on the same baseline into lines, but split where the
    // horizontal gap is large: in two-column layouts both columns share
    // baselines, and a side heading must not absorb main-column text.
    const byY = new Map();
    for (const item of tc.items) {
      if (!item.str) continue;
      const y = Math.round((height - item.transform[5]) * 10) / 10;
      const list = byY.get(y) ?? [];
      list.push({ x: item.transform[4], end: item.transform[4] + item.width, str: item.str });
      byY.set(y, list);
    }
    for (const [y, items] of byY) {
      items.sort((a, b) => a.x - b.x);
      let current = null;
      for (const it of items) {
        if (current && it.x - current.end < 12) {
          current.text += it.str;
          current.end = it.end;
        } else {
          current = { page: p, y, x: it.x, end: it.end, text: it.str };
          lines.push(current);
        }
      }
    }
    lines.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  }

  const found = [];
  const used = new Set();
  for (const anchor of anchors) {
    const norm = (s) => s.replace(/\s+/g, '');
    const idx = lines.findIndex((l, i) => !used.has(i) && norm(l.text).startsWith(norm(anchor)));
    if (idx === -1) {
      found.push({ anchor, page: null, y: null });
    } else {
      used.add(idx);
      found.push({ anchor, page: lines[idx].page, y: lines[idx].y });
    }
  }
  out[preset] = { pages: doc.numPages, anchors: found };
}

process.stdout.write(JSON.stringify(out, null, 2));
