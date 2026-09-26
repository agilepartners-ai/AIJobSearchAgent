/**
 * Distribute measured flow blocks across pages the way TeX's page builder
 * does for our serializer's output:
 *   - blocks never split;
 *   - a block goes on the current page if its gap plus height still fits;
 *   - otherwise it starts the next page and its gap is dropped
 *     (LaTeX discards \vspace at a page break);
 *   - a block taller than a whole page is placed alone and allowed to overflow.
 *
 * Pure function so it can be unit-tested without a browser.
 */

/**
 * Height (pt) kept free at the bottom of every page.
 *
 * Block heights here are read from the DOM, which resolves to whole device
 * pixels, so a column the browser believes fills its page exactly may be a
 * fraction taller in TeX. Measured across every preset, the disagreement is
 * bounded: a page with 0.22pt to spare breaks earlier in the PDF, while one
 * with 1.45pt to spare does not. One CSS pixel (0.75pt) — the resolution of
 * the measurement itself — sits between the two.
 */
export const PAGE_FIT_RESERVE = 0.75;

export interface MeasuredBlock {
  key: string;
  gapBefore: number;
  height: number;
}

export interface ColumnPage {
  keys: string[];
  /** Height used on this page, including gaps (pt). */
  used: number;
}

export function paginateColumn(blocks: MeasuredBlock[], firstPageCapacity: number, pageCapacity: number): ColumnPage[] {
  const pages: ColumnPage[] = [{ keys: [], used: 0 }];
  let capacity = firstPageCapacity;
  const RESERVE = PAGE_FIT_RESERVE;

  for (const block of blocks) {
    const page = pages[pages.length - 1];
    const gap = page.keys.length ? block.gapBefore : 0;
    if (page.keys.length === 0 || page.used + gap + block.height <= capacity - RESERVE) {
      page.keys.push(block.key);
      page.used += gap + block.height;
    } else {
      pages.push({ keys: [block.key], used: block.height });
      capacity = pageCapacity;
    }
  }
  return pages;
}
