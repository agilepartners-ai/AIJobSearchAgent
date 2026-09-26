/**
 * Template presets.
 *
 * A template is not code: it is a layout plus a style, applied over the same
 * renderer. Switching presets replaces layout and style and never touches the
 * user's content, so people can try every design without losing work.
 *
 * All designs, names and colour choices here are original.
 */
import type { HeadingStyle, Layout, ResumeStyle } from './schema';
import type { FontId } from './fonts';

export type PresetTag = 'simple' | 'modern' | 'creative' | 'compact' | 'two-column' | 'classic';

export interface Preset {
  id: string;
  name: string;
  description: string;
  tags: PresetTag[];
  layout: Layout;
  style: ResumeStyle;
}

interface PresetInput {
  id: string;
  name: string;
  description: string;
  tags: PresetTag[];
  font: FontId;
  headingFont?: FontId;
  accent: string;
  text?: string;
  headingStyle: HeadingStyle;
  uppercase?: boolean;
  align?: 'left' | 'center';
  columns?: 1 | 2;
  sideWidth?: number;
  sidePosition?: 'left' | 'right';
  sideBackground?: string | null;
  baseSize?: number;
  nameSize?: number;
  titleSize?: number;
  headingSize?: number;
  entryTitleSize?: number;
  lineHeight?: number;
  sectionGap?: number;
  entryGap?: number;
  margin?: number;
  accentOn?: Partial<ResumeStyle['accentOn']>;
  separator?: ResumeStyle['header']['separator'];
  datePosition?: ResumeStyle['entries']['datePosition'];
  subtitleStyle?: ResumeStyle['entries']['subtitleStyle'];
}

function preset(p: PresetInput): Preset {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    tags: p.tags,
    layout: {
      columns: p.columns ?? 1,
      sideWidth: p.sideWidth ?? 32,
      sidePosition: p.sidePosition ?? 'left',
      sideBackground: p.sideBackground ?? null,
      pageFormat: 'A4',
      marginX: p.margin ?? 16,
      marginY: p.margin ?? 14,
    },
    style: {
      fontBody: p.font,
      fontHeading: p.headingFont ?? p.font,
      sizes: {
        base: p.baseSize ?? 10,
        name: p.nameSize ?? 24,
        title: p.titleSize ?? 12,
        heading: p.headingSize ?? 11.5,
        entryTitle: p.entryTitleSize ?? 10.5,
      },
      lineHeight: p.lineHeight ?? 1.3,
      sectionGap: p.sectionGap ?? 12,
      entryGap: p.entryGap ?? 7,
      headingStyle: p.headingStyle,
      headingUppercase: p.uppercase ?? true,
      colors: { accent: p.accent, text: p.text ?? '#1f2328' },
      accentOn: {
        name: false,
        headings: true,
        rules: true,
        links: true,
        ...p.accentOn,
      },
      header: { align: p.align ?? 'left', separator: p.separator ?? 'bullet' },
      entries: {
        datePosition: p.datePosition ?? 'right',
        subtitleStyle: p.subtitleStyle ?? 'italic',
        dateFormat: 'MMM YYYY',
      },
      underlineLinks: false,
      pageNumbers: false,
    },
  };
}

export const PRESETS: Preset[] = [
  preset({
    id: 'meridian',
    name: 'Meridian',
    description: 'Centred serif classic with a hairline under each heading.',
    tags: ['classic', 'simple'],
    font: 'ebgaramond',
    accent: '#1f2328',
    headingStyle: 'line',
    align: 'center',
    baseSize: 10.5,
    nameSize: 26,
    accentOn: { headings: false, rules: false },
  }),
  preset({
    id: 'harbor',
    name: 'Harbor',
    description: 'Clean sans with a navy accent. Safe for any application.',
    tags: ['simple', 'modern'],
    font: 'sourcesans',
    accent: '#1e3a8a',
    headingStyle: 'line',
  }),
  preset({
    id: 'atlas',
    name: 'Atlas',
    description: 'Two columns with a tinted sidebar for skills and languages.',
    tags: ['modern', 'two-column'],
    font: 'inter',
    accent: '#0f766e',
    headingStyle: 'accentBar',
    columns: 2,
    sideWidth: 32,
    sidePosition: 'left',
    sideBackground: '#eef6f5',
    baseSize: 9.5,
    nameSize: 25,
    accentOn: { name: true },
  }),
  preset({
    id: 'linen',
    name: 'Linen',
    description: 'Soft serif headings over a readable sans body.',
    tags: ['creative', 'modern'],
    font: 'lato',
    headingFont: 'merriweather',
    accent: '#9a3412',
    headingStyle: 'underline',
    uppercase: false,
    headingSize: 12.5,
    accentOn: { name: true },
  }),
  preset({
    id: 'graphite',
    name: 'Graphite',
    description: 'Dense and efficient. Fits more on one page.',
    tags: ['compact', 'simple'],
    font: 'plexsans',
    accent: '#374151',
    headingStyle: 'topBottom',
    baseSize: 9.5,
    nameSize: 21,
    titleSize: 11,
    headingSize: 10.5,
    entryTitleSize: 10,
    lineHeight: 1.22,
    sectionGap: 9,
    entryGap: 5,
    margin: 12,
  }),
  preset({
    id: 'sequoia',
    name: 'Sequoia',
    description: 'Forest-green accents with generous spacing.',
    tags: ['modern'],
    font: 'opensans',
    accent: '#166534',
    headingStyle: 'box',
    baseSize: 9.5,
    sectionGap: 14,
    accentOn: { name: true },
  }),
  preset({
    id: 'aurora',
    name: 'Aurora',
    description: 'Violet sidebar on the right; bold, contemporary.',
    tags: ['creative', 'two-column'],
    font: 'nunito',
    accent: '#6d28d9',
    headingStyle: 'simple',
    columns: 2,
    sideWidth: 30,
    sidePosition: 'right',
    sideBackground: '#f3effd',
    baseSize: 9.5,
    nameSize: 27,
    accentOn: { name: true },
  }),
  preset({
    id: 'summit',
    name: 'Summit',
    description: 'Roboto with a strong accent bar and left-aligned header.',
    tags: ['modern'],
    font: 'roboto',
    accent: '#b91c1c',
    headingStyle: 'accentBar',
    baseSize: 9.5,
    nameSize: 25,
    accentOn: { name: false },
  }),
  preset({
    id: 'compass',
    name: 'Compass',
    description: 'Traditional serif body for academic and legal roles.',
    tags: ['classic'],
    font: 'sourceserif',
    accent: '#1f2328',
    headingStyle: 'line',
    uppercase: true,
    separator: 'bar',
    subtitleStyle: 'normal',
    accentOn: { headings: false, rules: false },
  }),
  preset({
    id: 'kestrel',
    name: 'Kestrel',
    description: 'Raleway display type with dates under each entry.',
    tags: ['creative'],
    font: 'raleway',
    accent: '#0369a1',
    headingStyle: 'underline',
    datePosition: 'below',
    nameSize: 26,
    accentOn: { name: true },
  }),
  preset({
    id: 'nordic',
    name: 'Nordic',
    description: 'Untinted two columns, lots of white space.',
    tags: ['simple', 'two-column'],
    font: 'sourcesans',
    accent: '#334155',
    headingStyle: 'simple',
    columns: 2,
    sideWidth: 30,
    sidePosition: 'left',
    sideBackground: null,
    separator: 'dot',
  }),
  preset({
    id: 'alder',
    name: 'Alder',
    description: 'Warm humanist serif with an amber rule.',
    tags: ['classic', 'creative'],
    font: 'alegreya',
    accent: '#b45309',
    headingStyle: 'line',
    uppercase: false,
    baseSize: 10.5,
    headingSize: 13,
    align: 'center',
  }),
];

export const DEFAULT_PRESET_ID = 'harbor';

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!;
}

/**
 * The same document in another template: layout and style are replaced, content
 * is untouched. Used by the editor's template switch and by the picker that
 * previews a generated resume in every template.
 */
export function withPreset<T extends { presetId: string; layout: Layout; style: ResumeStyle }>(doc: T, id: string): T {
  const preset = getPreset(id);
  return {
    ...doc,
    presetId: preset.id,
    layout: JSON.parse(JSON.stringify(preset.layout)) as Layout,
    style: JSON.parse(JSON.stringify(preset.style)) as ResumeStyle,
  };
}
