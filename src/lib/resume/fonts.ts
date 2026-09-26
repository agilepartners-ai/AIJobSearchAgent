/**
 * Font registry: the only fonts a resume may use.
 *
 * Every entry was verified on Texapi, the production compiler (TeX Live 2025),
 * by compiling `\fontfamily{<nfss>}\selectfont` with regular, bold and italic
 * text and reading the embedded /BaseFont names back out of the PDF. A font
 * that merely compiles can still silently fall back to Computer Modern; for
 * example Raleway's `-LF` family has no italic, so `-OsF` is used instead.
 *
 * Do not add a font here without repeating that check against Texapi: local
 * TeX Live 2026 differs (Source Sans is renamed, Nunito is missing).
 *
 * The web files in /public/fonts/resume/ are taken from the same TeX Live 2025
 * font packages, so the preview uses identical glyph metrics to the PDF.
 */

export const FONT_IDS = [
  'sourcesans',
  'sourceserif',
  'alegreya',
  'ebgaramond',
  'inter',
  'roboto',
  'lato',
  'plexsans',
  'nunito',
  'merriweather',
  'raleway',
  'opensans',
] as const;

export type FontId = (typeof FONT_IDS)[number];

export interface FontSpec {
  id: FontId;
  label: string;
  category: 'sans' | 'serif';
  /** NFSS family name for \fontfamily{…} (T1 encoding), verified on Texapi. */
  nfss: string;
  /** CSS font-family name registered by fonts.css; prefixed to avoid system fonts. */
  cssFamily: string;
  fallback: string;
  /**
   * CSS font-variant-numeric matching the NFSS variant. "-TLF" families use
   * tabular lining figures and "-OsF" proportional oldstyle; browsers otherwise
   * use each font’s default digits and dates come out a different width.
   */
  numeric: string;
  /**
   * hhea ascent and descent in em. Browsers place a baseline inside its line
   * box from these; the serializer sizes TeX struts from the same numbers so
   * baselines land in the same place. (For every font here these agree with
   * the metrics a browser actually picks on each platform; Roboto differs by
   * 0.02 em.)
   */
  ascent: number;
  descent: number;
}

const SANS_FALLBACK = 'ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif';
const TLF = 'lining-nums tabular-nums';
const OSF = 'oldstyle-nums proportional-nums';
const SERIF_FALLBACK = 'ui-serif, Georgia, "Times New Roman", serif';

export const FONTS: Record<FontId, FontSpec> = {
  sourcesans: { id: 'sourcesans', label: 'Source Sans', category: 'sans', nfss: 'SourceSansPro-TLF', cssFamily: 'RF Source Sans', fallback: SANS_FALLBACK, numeric: TLF, ascent: 1.024, descent: 0.4 },
  sourceserif: { id: 'sourceserif', label: 'Source Serif', category: 'serif', nfss: 'SourceSerifPro-TLF', cssFamily: 'RF Source Serif', fallback: SERIF_FALLBACK, numeric: TLF, ascent: 1.036, descent: 0.335 },
  alegreya: { id: 'alegreya', label: 'Alegreya', category: 'serif', nfss: 'Alegreya-TLF', cssFamily: 'RF Alegreya', fallback: SERIF_FALLBACK, numeric: TLF, ascent: 1.016, descent: 0.345 },
  ebgaramond: { id: 'ebgaramond', label: 'EB Garamond', category: 'serif', nfss: 'EBGaramond-TLF', cssFamily: 'RF EB Garamond', fallback: SERIF_FALLBACK, numeric: TLF, ascent: 1.007, descent: 0.298 },
  inter: { id: 'inter', label: 'Inter', category: 'sans', nfss: 'Inter-TLF', cssFamily: 'RF Inter', fallback: SANS_FALLBACK, numeric: TLF, ascent: 0.9688, descent: 0.2412 },
  roboto: { id: 'roboto', label: 'Roboto', category: 'sans', nfss: 'Roboto-TLF', cssFamily: 'RF Roboto', fallback: SANS_FALLBACK, numeric: TLF, ascent: 0.928, descent: 0.244 },
  lato: { id: 'lato', label: 'Lato', category: 'sans', nfss: 'lato-TLF', cssFamily: 'RF Lato', fallback: SANS_FALLBACK, numeric: TLF, ascent: 0.987, descent: 0.213 },
  plexsans: { id: 'plexsans', label: 'IBM Plex Sans', category: 'sans', nfss: 'plxSans-TLF', cssFamily: 'RF IBM Plex Sans', fallback: SANS_FALLBACK, numeric: TLF, ascent: 1.025, descent: 0.275 },
  nunito: { id: 'nunito', label: 'Nunito', category: 'sans', nfss: 'Nunito-TLF', cssFamily: 'RF Nunito', fallback: SANS_FALLBACK, numeric: TLF, ascent: 1.011, descent: 0.353 },
  merriweather: { id: 'merriweather', label: 'Merriweather', category: 'serif', nfss: 'Merriwthr-TLF', cssFamily: 'RF Merriweather', fallback: SERIF_FALLBACK, numeric: TLF, ascent: 0.984, descent: 0.273 },
  raleway: { id: 'raleway', label: 'Raleway', category: 'sans', nfss: 'Raleway-OsF', cssFamily: 'RF Raleway', fallback: SANS_FALLBACK, numeric: OSF, ascent: 0.94, descent: 0.234 },
  opensans: { id: 'opensans', label: 'Open Sans', category: 'sans', nfss: 'opensans-TLF', cssFamily: 'RF Open Sans', fallback: SANS_FALLBACK, numeric: TLF, ascent: 1.0688, descent: 0.293 },
};

export const isFontId = (value: string): value is FontId => (FONT_IDS as readonly string[]).includes(value);

/** Unknown ids (e.g. from an older document) fall back to Source Sans rather than failing. */
export function getFont(id: string): FontSpec {
  return isFontId(id) ? FONTS[id] : FONTS.sourcesans;
}

/** Where a baseline sits inside a line box, as a multiple of font size from the box centre. */
export const baselineOffset = (id: string): number => {
  const f = getFont(id);
  return (f.ascent - f.descent) / 2;
};

export const cssFontStack = (id: string): string => {
  const f = getFont(id);
  return `"${f.cssFamily}", ${f.fallback}`;
};
