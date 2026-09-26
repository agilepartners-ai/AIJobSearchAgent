/**
 * Style tokens: every numeric value either renderer needs, computed once.
 *
 * Units: all lengths here are PostScript points (1/72 in). CSS `pt` is exactly
 * that; LaTeX's matching unit is `bp`, not `pt` (a TeX point is 1/72.27 in,
 * about 0.37% smaller). The serializer must emit `bp`, or every size in the
 * PDF would come out slightly smaller than in the preview.
 */
import type { Layout, PageFormat, ResumeStyle } from './schema';

export const MM_TO_PT = 72 / 25.4;

export const PAGE_SIZE_PT: Record<PageFormat, { width: number; height: number }> = {
  A4: { width: 595.276, height: 841.89 },
  Letter: { width: 612, height: 792 },
};

/** Space between the two columns in a two-column layout. */
export const COLUMN_GAP_PT = 18;
/** Inner padding of a tinted side column. */
export const SIDE_PADDING_PT = 10;

export interface Tokens {
  page: { width: number; height: number };
  margin: { x: number; y: number };
  text: { width: number; height: number };
  columns: {
    count: 1 | 2;
    main: number;
    side: number;
    gap: number;
    sideFirst: boolean;
    sideBackground: string | null;
  };
  font: {
    base: number;
    name: number;
    title: number;
    heading: number;
    entryTitle: number;
    small: number;
    lineHeight: number;
  };
  spacing: {
    section: number;
    entry: number;
    /** Gap under a section heading before its first entry. */
    afterHeading: number;
    /** Gap between the header block and the first section. */
    afterHeader: number;
    listIndent: number;
  };
  color: {
    text: string;
    muted: string;
    accent: string;
    name: string;
    headings: string;
    rules: string;
    links: string;
  };
}

const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

/** Mix a hex colour toward white; used for secondary text. */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (255 - c) * amount);
  };
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

export function computeTokens(layout: Layout, style: ResumeStyle): Tokens {
  const page = PAGE_SIZE_PT[layout.pageFormat];
  const marginX = round(layout.marginX * MM_TO_PT);
  const marginY = round(layout.marginY * MM_TO_PT);
  const textWidth = round(page.width - 2 * marginX);
  const textHeight = round(page.height - 2 * marginY);

  const twoCol = layout.columns === 2;
  const gap = twoCol ? COLUMN_GAP_PT : 0;
  const side = twoCol ? round(((textWidth - gap) * layout.sideWidth) / 100) : 0;
  const main = twoCol ? round(textWidth - gap - side) : textWidth;

  const { accent, text } = style.colors;
  const pick = (on: boolean) => (on ? accent : text);

  return {
    page,
    margin: { x: marginX, y: marginY },
    text: { width: textWidth, height: textHeight },
    columns: {
      count: layout.columns,
      main,
      side,
      gap,
      sideFirst: layout.sidePosition === 'left',
      sideBackground: twoCol ? layout.sideBackground : null,
    },
    font: {
      base: style.sizes.base,
      name: style.sizes.name,
      title: style.sizes.title,
      heading: style.sizes.heading,
      entryTitle: style.sizes.entryTitle,
      small: round(style.sizes.base * 0.92, 1),
      lineHeight: style.lineHeight,
    },
    spacing: {
      section: style.sectionGap,
      entry: style.entryGap,
      afterHeading: round(Math.max(3, style.sectionGap * 0.45)),
      afterHeader: round(style.sectionGap * 0.6),
      listIndent: round(style.sizes.base * 1.1),
    },
    color: {
      text,
      muted: tint(text, 0.35),
      accent,
      name: pick(style.accentOn.name),
      headings: pick(style.accentOn.headings),
      rules: pick(style.accentOn.rules),
      links: pick(style.accentOn.links),
    },
  };
}
