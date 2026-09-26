/**
 * Fixed layout measurements shared by both renderers, in points.
 *
 * Anything drawn by the LaTeX serializer and the HTML preview reads its size
 * from here, so a design tweak cannot land in one renderer and not the other.
 */

export const LEVEL = { segments: 5, width: 7, height: 2.6, gap: 1.5 } as const;

export const HEADING = {
  /** Heading line box as a multiple of the heading size. */
  leading: 1.2,
  thinRule: 0.6,
  thickRule: 1.6,
  underlineWidth: 22,
  ruleGap: 2,
  boxPadX: 4,
  boxPadY: 2.5,
  barWidth: 2.5,
  barGap: 5,
} as const;

export const HEADER = {
  nameLeading: 1.15,
  titleLeading: 1.25,
  afterName: 2,
  afterTitle: 3,
  separatorGap: 5,
} as const;

export const ENTRY = {
  /** Space between an entry's header lines and its description. */
  beforeBody: 2,
} as const;

export const LIST = {
  /** Space between a bullet and its text. */
  labelSep: 4,
  itemGap: 1,
  /** Space above and below a bulleted list. */
  outerGap: 1,
} as const;

export const GRID = { columnGap: 10, rowGap: 2 } as const;

/** Inner padding of a tinted side column. */
export const SIDE_PADDING = 10;
