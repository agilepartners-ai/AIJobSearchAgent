/**
 * View model: the document reduced to exactly what gets drawn.
 *
 * Both renderers consume this, never the raw document. Every decision that
 * affects visible text happens here, once: hiding, sorting, date formatting,
 * upper-casing, contact ordering, removing characters the PDF cannot render.
 * The renderers only lay things out, so they cannot disagree about content.
 */
import { formatDateRange, recencyKey } from './dates';
import { normaliseRichText } from './richtext';
import type {
  Entry,
  ListDisplay,
  ResumeDocument,
  RichBlock,
  RichMark,
  RichText,
  SectionType,
} from './schema';
import { SECTION_REGISTRY, type SectionKind } from './sections';
import { renderableText, upper } from './text';
import { computeTokens, type Tokens } from './tokens';
import { cssFontStack, getFont, type FontSpec } from './fonts';

export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

export type ViewBlock =
  | { type: 'paragraph'; runs: InlineRun[] }
  | { type: 'list'; items: ViewBlock[][] };

export interface ContactItem {
  text: string;
  href: string | null;
}

export interface TimelineEntryView {
  id: string;
  title: string;
  titleHref: string | null;
  subtitle: string;
  location: string;
  dates: string;
  body: ViewBlock[];
}

export interface ListItemView {
  id: string;
  title: string;
  detail: string;
  level: number | null;
}

export interface SectionView {
  id: string;
  type: SectionType;
  kind: SectionKind;
  heading: string;
  /** paragraph kind */
  body: ViewBlock[];
  /** timeline kind */
  entries: TimelineEntryView[];
  /** list kind */
  items: ListItemView[];
  display: ListDisplay;
  gridColumns: number;
}

export interface ResumeView {
  tokens: Tokens;
  fonts: { body: FontSpec; heading: FontSpec; bodyCss: string; headingCss: string };
  style: ResumeDocument['style'];
  header: {
    name: string;
    title: string;
    contacts: ContactItem[];
    separator: string;
  };
  /** One-column layouts use `main` only. */
  main: SectionView[];
  side: SectionView[];
}

const SEPARATORS = { bullet: '•', bar: '|', dot: '·' } as const;

/** Only http(s), mailto and tel links survive; bare domains get https://. */
export function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(url)) return `https://${url}`;
  return null;
}

const clean = (s: string) => renderableText(s).trim();

function runsFromText(content: RichBlock & { type: 'paragraph' }): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const node of content.content ?? []) {
    const text = renderableText(node.text);
    if (!text) continue;
    const marks: RichMark[] = node.marks ?? [];
    const link = marks.find((m): m is Extract<RichMark, { type: 'link' }> => m.type === 'link');
    runs.push({
      text,
      bold: marks.some((m) => m.type === 'bold') || undefined,
      italic: marks.some((m) => m.type === 'italic') || undefined,
      href: link ? safeHref(link.attrs.href) ?? undefined : undefined,
    });
  }
  return runs;
}

function blocksFromRich(doc: RichText): ViewBlock[] {
  const toBlock = (block: RichBlock): ViewBlock | null => {
    if (block.type === 'paragraph') {
      const runs = runsFromText(block);
      return runs.length ? { type: 'paragraph', runs } : null;
    }
    const items = block.content
      .map((item) => item.content.map(toBlock).filter((b): b is ViewBlock => b !== null))
      .filter((children) => children.length > 0);
    return items.length ? { type: 'list', items } : null;
  };
  return normaliseRichText(doc).content.map(toBlock).filter((b): b is ViewBlock => b !== null);
}

function sortEntries(entries: Entry[], sort: 'manual' | 'dateDesc'): Entry[] {
  const visible = entries.filter((e) => !e.hidden);
  if (sort !== 'dateDesc') return visible;
  // Stable: entries with equal dates keep their manual order.
  return visible
    .map((e, i) => ({ e, i, k: recencyKey(e) }))
    .sort((a, b) => (a.k === b.k ? a.i - b.i : a.k < b.k ? 1 : -1))
    .map((x) => x.e);
}

export function buildView(doc: ResumeDocument): ResumeView {
  const { style, layout } = doc;
  const tokens = computeTokens(layout, style);
  const bodyFont = getFont(style.fontBody);
  const headingFont = getFont(style.fontHeading);

  const contacts: ContactItem[] = [];
  const p = doc.personal;
  if (clean(p.email)) contacts.push({ text: clean(p.email), href: `mailto:${p.email.trim()}` });
  if (clean(p.phone)) contacts.push({ text: clean(p.phone), href: `tel:${p.phone.replace(/[^\d+]/g, '')}` });
  if (clean(p.location)) contacts.push({ text: clean(p.location), href: null });
  for (const link of p.links) {
    const text = clean(link.label) || clean(link.url.replace(/^https?:\/\//, ''));
    if (text) contacts.push({ text, href: safeHref(link.url) });
  }

  const sections: SectionView[] = [];
  for (const section of doc.sections) {
    if (section.hidden) continue;
    const spec = SECTION_REGISTRY[section.type];
    const entries = sortEntries(section.entries, spec.sortable ? section.sort : 'manual');
    const heading = clean(section.title) || spec.defaultTitle;

    const view: SectionView = {
      id: section.id,
      type: section.type,
      kind: spec.kind,
      heading: style.headingUppercase ? upper(heading) : heading,
      body: [],
      entries: [],
      items: [],
      display: section.display,
      gridColumns: section.gridColumns,
    };

    if (spec.kind === 'paragraph') {
      view.body = entries.flatMap((e) => blocksFromRich(e.description));
      if (!view.body.length) continue;
    } else if (spec.kind === 'timeline') {
      view.entries = entries
        .map((e) => ({
          id: e.id,
          title: clean(e.title),
          titleHref: 'url' in spec.fields ? safeHref(e.url) : null,
          subtitle: clean(e.subtitle),
          location: 'location' in spec.fields ? clean(e.location) : '',
          dates: 'dates' in spec.fields ? formatDateRange(e, style.entries.dateFormat) : '',
          body: 'description' in spec.fields ? blocksFromRich(e.description) : [],
        }))
        .filter((e) => e.title || e.subtitle || e.body.length);
      if (!view.entries.length) continue;
    } else {
      view.items = entries
        .map((e) => ({
          id: e.id,
          title: clean(e.title),
          detail: 'subtitle' in spec.fields ? clean(e.subtitle) : '',
          level: 'level' in spec.fields ? e.level : null,
        }))
        .filter((i) => i.title);
      if (!view.items.length) continue;
    }

    sections.push(view);
  }

  const twoCol = layout.columns === 2;
  const byId = new Map(doc.sections.map((s) => [s.id, s]));

  return {
    tokens,
    fonts: {
      body: bodyFont,
      heading: headingFont,
      bodyCss: cssFontStack(bodyFont.id),
      headingCss: cssFontStack(headingFont.id),
    },
    style,
    header: {
      name: clean(p.fullName),
      title: clean(p.jobTitle),
      contacts,
      separator: SEPARATORS[style.header.separator],
    },
    main: twoCol ? sections.filter((s) => byId.get(s.id)?.column !== 'side') : sections,
    side: twoCol ? sections.filter((s) => byId.get(s.id)?.column === 'side') : [],
  };
}

/**
 * A column broken into unbreakable blocks: the unit of pagination.
 *
 * Both renderers iterate exactly this list. A page break may only fall between
 * blocks, and a block's `gapBefore` is dropped when it starts a page (LaTeX
 * discards \vspace at a page break; the HTML paginator does the same). Sharing
 * the segmentation is what lets the preview predict the PDF's page breaks.
 */
export interface FlowBlock {
  key: string;
  gapBefore: number;
  section: SectionView;
  /** Heading drawn at the top of this block. */
  withHeading: boolean;
  /** Timeline entry drawn in this block, or null when the block is a whole section. */
  entry: TimelineEntryView | null;
}

export function columnFlow(sections: SectionView[], tokens: Tokens): FlowBlock[] {
  const blocks: FlowBlock[] = [];
  sections.forEach((section, sectionIndex) => {
    const sectionGap = sectionIndex === 0 ? 0 : tokens.spacing.section;
    if (section.kind !== 'timeline') {
      blocks.push({ key: section.id, gapBefore: sectionGap, section, withHeading: true, entry: null });
      return;
    }
    section.entries.forEach((entry, i) => {
      blocks.push({
        key: `${section.id}:${entry.id}`,
        gapBefore: i === 0 ? sectionGap : tokens.spacing.entry,
        section,
        withHeading: i === 0,
        entry,
      });
    });
  });
  return blocks;
}

/** Every visible string in reading order; the parity tests compare this against the PDF. */
export function viewPlainText(view: ResumeView): string[] {
  const out: string[] = [];
  const blocks = (bs: ViewBlock[]) => {
    for (const b of bs) {
      if (b.type === 'paragraph') out.push(b.runs.map((r) => r.text).join(''));
      else b.items.forEach(blocks);
    }
  };
  const section = (s: SectionView) => {
    out.push(s.heading);
    blocks(s.body);
    for (const e of s.entries) {
      out.push(e.title, e.subtitle, e.location, e.dates);
      blocks(e.body);
    }
    for (const i of s.items) out.push(i.title, i.detail);
  };
  out.push(view.header.name, view.header.title, ...view.header.contacts.map((c) => c.text));
  view.side.forEach(section);
  view.main.forEach(section);
  return out.filter(Boolean);
}
