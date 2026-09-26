#!/usr/bin/env node
/**
 * Compare preview anchors against PDF anchors.
 *
 *   node scripts/parity/compare.mjs <pdf-anchors.json> <browser-anchors.json>
 *
 * Reports, per preset: page count match, page-assignment mismatches, and the
 * worst vertical drift of any anchor's baseline (pt). Exits non-zero when a
 * preset fails the gate.
 */
import fs from 'fs';

const [pdfFile, browserFile] = process.argv.slice(2);
const pdf = JSON.parse(fs.readFileSync(pdfFile, 'utf8'));
const browser = JSON.parse(fs.readFileSync(browserFile, 'utf8'));

/**
 * Parity gate. Measured worst case across all presets is 2.6pt (Atlas side
 * column); 3pt catches regressions while tolerating sub-point font-metric noise.
 */
const MAX_DRIFT_PT = 3;

let failed = false;
console.log('preset     pages(pdf/html)  wrong-page  max-drift  worst anchor');
for (const preset of Object.keys(pdf)) {
  const a = pdf[preset];
  const b = browser[preset];
  if (!b) {
    console.log(`${preset.padEnd(10)} missing from browser results`);
    failed = true;
    continue;
  }
  let wrongPage = 0;
  let worst = { drift: 0, anchor: '' };
  a.anchors.forEach((pa, i) => {
    const ba = b.anchors[i];
    if (!ba || pa.page === null || ba.page === null) return;
    if (pa.page !== ba.page) wrongPage += 1;
    else {
      const drift = Math.abs(pa.y - ba.y);
      if (drift > worst.drift) worst = { drift, anchor: `${pa.anchor} (pdf ${pa.y} / html ${ba.y})` };
    }
  });
  const ok = a.pages === b.pages && wrongPage === 0 && worst.drift <= MAX_DRIFT_PT;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${preset.padEnd(9)} ${`${a.pages}/${b.pages}`.padEnd(16)} ${String(wrongPage).padEnd(11)} ${worst.drift.toFixed(1).padStart(6)}pt  ${worst.anchor}`,
  );
}
process.exit(failed ? 1 : 0);
