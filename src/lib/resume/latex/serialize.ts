/**
 * ResumeDocument → complete, standalone .tex.
 *
 * This is the PDF renderer, and its output is what "Open in Overleaf" imports.
 * It mirrors components/resume/ResumePreview.tsx: both consume the same view
 * model, flow blocks and metrics, and every length is emitted in `bp`, the
 * LaTeX unit equal to a CSS `pt`.
 *
 * How it stays in step with the browser preview:
 *   - Each flow block is an unbreakable \vbox, so pages can break only between
 *     blocks, exactly where the preview's paginator breaks them.
 *   - Struts on every line make a block exactly lines × line-height tall,
 *     which is how CSS measures line boxes.
 *   - \topskip is zero and \maxdepth unlimited, so TeX adds no hidden space at
 *     the top or bottom of a page; \vspace between blocks vanishes at a page
 *     break, as the preview drops a block's top gap.
 *   - Hyphenation is off and text is ragged-right: browsers do not hyphenate
 *     by default and break lines greedily.
 *   - No microtype: its protrusion and font expansion change line widths.
 */
import { HEADER, HEADING, ENTRY, GRID, LEVEL, LIST, SIDE_PADDING } from '../metrics';
import type { ResumeDocument } from '../schema';
import { tint } from '../tokens';
import {
  buildView,
  columnFlow,
  type FlowBlock,
  type InlineRun,
  type ListItemView,
  type ResumeView,
  type SectionView,
  type TimelineEntryView,
  type ViewBlock,
} from '../view';
import { escapeLatexText as esc, escapeLatexUrl } from './escape';

const r2 = (n: number) => Math.round(n * 100) / 100;
const bp = (n: number) => `${r2(n)}bp`;
const hex = (color: string) => color.replace('#', '').toUpperCase();

function uniqueFonts(v: ResumeView) {
  return v.fonts.body.id === v.fonts.heading.id ? [v.fonts.body] : [v.fonts.body, v.fonts.heading];
}

/** Font size command with an explicit line height, both in bp. */
const size = (pt: number, leading: number) => `\\fontsize{${bp(pt)}}{${bp(pt * leading)}}\\selectfont`;

function link(v: ResumeView, href: string, content: string, colored = true): string {
  const body = v.style.underlineLinks ? `\\underline{${content}}` : content;
  const inner = `\\href{${escapeLatexUrl(href)}}{${body}}`;
  return colored ? `\\textcolor{rflinks}{${inner}}` : inner;
}

function runs(rs: InlineRun[], v: ResumeView): string {
  return rs
    .map((r) => {
      let t = esc(r.text);
      if (r.bold) t = `\\textbf{${t}}`;
      if (r.italic) t = `\\textit{${t}}`;
      if (r.href) t = link(v, r.href, t);
      return t;
    })
    .join('');
}

/** A paragraph whose first and last lines carry struts, so its height is exact. */
const para = (content: string) => `\\strut ${content}\\strut\\par`;

/**
 * Suppress TeX's interline glue before a paragraph. Between paragraphs of
 * different sizes that glue is 0.3 × (difference in line height), which CSS
 * never adds; without this the PDF header came out ~4bp shorter than the
 * preview. Only valid in vertical mode, i.e. not as the first thing in \item.
 */
const NOSKIP = '\\nointerlineskip';

function blocks(bs: ViewBlock[], v: ResumeView, inItem = false): string {
  return bs
    .map((b, i) => {
      const skip = inItem && i === 0 ? '' : NOSKIP;
      if (b.type === 'paragraph') return `${skip}{\\rfbase ${para(runs(b.runs, v))}}`;
      const items = b.items.map((children) => `\\item ${blocks(children, v, true)}`).join('\n');
      return `${skip}{\\rfbase\\begin{itemize}\n${items}\n\\end{itemize}}`;
    })
    .join('\n');
}

function heading(s: SectionView, v: ResumeView): string {
  const h = v.tokens.font.heading;
  const lead = h * HEADING.leading;
  const font = `\\rfheadfont${size(h, HEADING.leading)}\\bfseries`;
  const text = `{${font}\\color{rfheadings}${para(esc(s.heading))}}`;
  const rule = (thickness: number, width?: number) =>
    `\\nointerlineskip{\\color{rfrules}\\hrule height ${bp(thickness)}${width ? ` width ${bp(width)}` : ''}}`;
  const gap = `\\nointerlineskip\\vspace{${bp(HEADING.ruleGap)}}`;

  switch (v.style.headingStyle) {
    case 'line':
      return `${text}${gap}${rule(HEADING.thinRule)}`;
    case 'underline':
      return `${text}${gap}${rule(HEADING.thickRule, HEADING.underlineWidth)}`;
    case 'topBottom':
      return `${rule(HEADING.thinRule)}${gap}${text}${gap}${rule(HEADING.thinRule)}`;
    case 'box': {
      // Fixed-height strut so the box does not grow or shrink with the letters
      // used, with its baseline where CSS puts it (see the selectfont hook).
      const k = (v.fonts.heading.ascent - v.fonts.heading.descent) / 2;
      const strut = `\\rule[${bp(-(lead / 2 - k * h))}]{0pt}{${bp(lead)}}`;
      return (
        `\\nointerlineskip{\\setlength{\\fboxsep}{0pt}\\colorbox{rfboxbg}{\\vbox{\\hsize=\\linewidth` +
        `\\vspace*{${bp(HEADING.boxPadY)}}\\nointerlineskip\\hbox to \\linewidth{\\hspace*{${bp(HEADING.boxPadX)}}${font}\\color{rfheadings}${strut}${esc(s.heading)}\\hfil}` +
        `\\nointerlineskip\\vspace*{${bp(HEADING.boxPadY)}}}}\\par}`
      );
    }
    case 'accentBar':
      return `{${font}\\strut{\\color{rfrules}\\rule[${bp(-lead * 0.2)}]{${bp(HEADING.barWidth)}}{${bp(lead * 0.9)}}}\\hspace{${bp(HEADING.barGap)}}\\color{rfheadings}${esc(s.heading)}\\strut\\par}`;
    case 'simple':
    default:
      return text;
  }
}

function subtitle(v: ResumeView, text: string): string {
  if (v.style.entries.subtitleStyle === 'italic') return `\\textit{${text}}`;
  if (v.style.entries.subtitleStyle === 'bold') return `\\textbf{${text}}`;
  return text;
}

function timelineEntry(e: TimelineEntryView, v: ResumeView): string {
  const t = v.tokens.font;
  const muted = (s: string) => `{\\rfsmall\\mdseries\\upshape\\color{rfmuted}${s}}`;
  const right = v.style.entries.datePosition === 'right';
  const lines: string[] = [];

  const title = e.title ? (e.titleHref ? link(v, e.titleHref, esc(e.title), false) : esc(e.title)) : '';
  if (title || (right && e.dates)) {
    lines.push(`${NOSKIP}{${size(t.entryTitle, t.lineHeight)}\\bfseries ${para(`${title}${right && e.dates ? `\\hfill${muted(esc(e.dates))}` : ''}`)}}`);
  }
  if (e.subtitle || (right && e.location)) {
    lines.push(`${NOSKIP}{\\rfbase ${para(`${e.subtitle ? subtitle(v, esc(e.subtitle)) : ''}${right && e.location ? `\\hfill${muted(esc(e.location))}` : ''}`)}}`);
  }
  if (!right) {
    const meta = [e.dates, e.location].filter(Boolean).map(esc).join(' · ');
    if (meta) lines.push(`${NOSKIP}{\\rfsmall\\color{rfmuted}${para(meta)}}`);
  }
  if (e.body.length) {
    lines.push(`\\vspace{${bp(ENTRY.beforeBody)}}`, blocks(e.body, v));
  }
  return lines.join('\n');
}

function levelBar(level: number): string {
  const seg = (on: boolean) =>
    `\\textcolor{${on ? 'rfaccent' : 'rftrack'}}{\\rule[${bp(LEVEL.height * 0.9)}]{${bp(LEVEL.width)}}{${bp(LEVEL.height)}}}`;
  return Array.from({ length: LEVEL.segments }, (_, i) => seg(i < level)).join(`\\hspace{${bp(LEVEL.gap)}}`);
}

function itemText(item: ListItemView): string {
  return item.detail ? `${esc(item.title)} {\\color{rfmuted}(${esc(item.detail)})}` : esc(item.title);
}

function listBody(s: SectionView): string {
  if (s.display === 'levels') {
    return s.items
      .map((item) => {
        const detail = item.detail ? ` {\\rfsmall\\color{rfmuted}${esc(item.detail)}}` : '';
        const bar = item.level ? `\\hfill${levelBar(item.level)}` : '';
        return `{\\rfbase ${para(`${esc(item.title)}${detail}${bar}`)}}`;
      })
      .join(`\n\\nointerlineskip\\vspace{${bp(GRID.rowGap)}}\n`);
  }

  if (s.display === 'grid') {
    const n = Math.max(1, s.gridColumns);
    const width = `\\dimexpr(\\linewidth-${bp((n - 1) * GRID.columnGap)})/${n}\\relax`;
    const rows: string[] = [];
    for (let i = 0; i < s.items.length; i += n) {
      const cells = s.items
        .slice(i, i + n)
        .map((item) => `\\begin{minipage}[t]{${width}}{\\rfbase ${para(`\\textbullet\\hspace{${bp(LIST.labelSep)}}${itemText(item)}`)}}\\end{minipage}`);
      rows.push(`\\nointerlineskip\\noindent${cells.join(`\\hspace{${bp(GRID.columnGap)}}`)}\\par`);
    }
    return rows.join(`\n\\vspace{${bp(GRID.rowGap)}}\n`);
  }

  return `{\\rfbase ${para(s.items.map(itemText).join(' \\textbullet{} '))}}`;
}

function flowBlock(block: FlowBlock, v: ResumeView): string {
  const parts: string[] = [];
  if (block.withHeading) parts.push(heading(block.section, v), `\\nointerlineskip\\vspace{${bp(v.tokens.spacing.afterHeading)}}`);
  if (block.entry) parts.push(timelineEntry(block.entry, v));
  else if (block.section.kind === 'paragraph') parts.push(blocks(block.section.body, v));
  else if (block.section.kind === 'list') parts.push(listBody(block.section));

  const gap = block.gapBefore ? `\\vspace{${bp(block.gapBefore)}}\n` : '';
  return `${gap}\\nointerlineskip\\vbox{\\hsize=\\linewidth\\rfbase\n${parts.join('\n')}\n}`;
}

function column(sections: SectionView[], v: ResumeView): string {
  return columnFlow(sections, v.tokens)
    .map((b) => flowBlock(b, v))
    .join('\n');
}

function header(v: ResumeView): string {
  const { name, title, contacts, separator } = v.header;
  const t = v.tokens.font;
  const align = v.style.header.align === 'center' ? '\\centering' : '\\raggedright';
  const parts: string[] = [];

  if (name) {
    parts.push(`${NOSKIP}{\\rfheadfont${size(t.name, HEADER.nameLeading)}\\bfseries\\color{rfname}${para(esc(name))}}`);
  }
  if (title) {
    if (parts.length) parts.push(`${NOSKIP}\\vspace{${bp(HEADER.afterName)}}`);
    parts.push(`${NOSKIP}{${size(t.title, HEADER.titleLeading)}\\color{rftext}${para(esc(title))}}`);
  }
  if (contacts.length) {
    if (parts.length) parts.push(`${NOSKIP}\\vspace{${bp(HEADER.afterTitle)}}`);
    const sep = `\\hspace{${bp(HEADER.separatorGap)}}${esc(separator)}\\hspace{${bp(HEADER.separatorGap)}}`;
    const items = contacts.map((c) => (c.href ? link(v, c.href, esc(c.text), false) : esc(c.text))).join(sep);
    parts.push(`${NOSKIP}{\\rfsmall\\color{rfmuted}${para(items)}}`);
  }
  if (!parts.length) return '';
  return `\\nointerlineskip\\vbox{\\hsize=\\linewidth${align}\n${parts.join('\n')}\n}\n\\vspace{${bp(v.tokens.spacing.afterHeader)}}`;
}

export function serializeResume(doc: ResumeDocument): string {
  const v = buildView(doc);
  const tk = v.tokens;
  const twoCol = tk.columns.count === 2;
  const tinted = twoCol && !!tk.columns.sideBackground;

  const preamble = [
    '% Generated by AIJobSearchAgent. Compile with pdflatex.',
    '\\documentclass{article}',
    '\\usepackage[T1]{fontenc}',
    '\\usepackage[utf8]{inputenc}',
    `\\usepackage[paperwidth=${bp(tk.page.width)},paperheight=${bp(tk.page.height)},left=${bp(tk.margin.x)},right=${bp(tk.margin.x)},top=${bp(tk.margin.y)},bottom=${bp(tk.margin.y)},footskip=${bp(tk.margin.y / 2)}]{geometry}`,
    '\\usepackage{xcolor}',
    '\\usepackage{enumitem}',
    ...(twoCol ? ['\\usepackage{paracol}'] : []),
    ...(tinted ? ['\\usepackage{changepage}'] : []),
    '\\usepackage[hidelinks]{hyperref}',
    '',
    `\\definecolor{rftext}{HTML}{${hex(tk.color.text)}}`,
    `\\definecolor{rfmuted}{HTML}{${hex(tk.color.muted)}}`,
    `\\definecolor{rfaccent}{HTML}{${hex(tk.color.accent)}}`,
    `\\definecolor{rfname}{HTML}{${hex(tk.color.name)}}`,
    `\\definecolor{rfheadings}{HTML}{${hex(tk.color.headings)}}`,
    `\\definecolor{rfrules}{HTML}{${hex(tk.color.rules)}}`,
    `\\definecolor{rflinks}{HTML}{${hex(tk.color.links)}}`,
    `\\definecolor{rfboxbg}{HTML}{${hex(tint(tk.color.accent, 0.88))}}`,
    `\\definecolor{rftrack}{HTML}{${hex(tint(tk.color.accent, 0.8))}}`,
    ...(tinted ? [`\\definecolor{rfsidebg}{HTML}{${hex(tk.columns.sideBackground!)}}`] : []),
    '',
    `\\renewcommand*{\\familydefault}{${v.fonts.body.nfss}}`,
    `\\newcommand*{\\rfheadfont}{\\fontfamily{${v.fonts.heading.nfss}}\\selectfont}`,
    `\\newcommand*{\\rfbase}{${size(tk.font.base, tk.font.lineHeight)}}`,
    `\\newcommand*{\\rfsmall}{${size(tk.font.small, tk.font.lineHeight)}}`,
    '\\setlength{\\parindent}{0pt}',
    '\\setlength{\\parskip}{0pt}',
    '\\setlength{\\topskip}{0pt}',
    '\\setlength{\\maxdepth}{\\textheight}',
    '\\setlength{\\lineskiplimit}{-\\maxdimen}',
    '\\hyphenpenalty=10000',
    '\\exhyphenpenalty=10000',
    // Word spaces behave like a browser's: fixed width, no extra space after a
    // full stop. TeX's default interword glue can shrink to fit one more word
    // on a line, which made PDF paragraphs wrap tighter than the preview.
    '\\frenchspacing',
    '\\AddToHook{selectfont}{\\spaceskip=\\fontdimen2\\font\\relax}',
    // Place baselines where a browser does. CSS puts a baseline at
    // L/2 + (ascent - descent) * size / 2 inside a line box of height L; the
    // default LaTeX strut puts it at 0.7 L. Resize \strutbox per family from
    // the same font metrics the preview uses.
    '\\makeatletter',
    ...uniqueFonts(v).map((f) => `\\@namedef{rfk@${f.nfss}}{${((f.ascent - f.descent) / 2).toFixed(4)}}`),
    '\\AddToHook{selectfont}{\\ifcsname rfk@\\f@family\\endcsname\\setbox\\strutbox\\hbox{\\vrule\\@height\\dimexpr0.5\\baselineskip+\\csname rfk@\\f@family\\endcsname\\dimexpr\\f@size\\p@\\relax\\relax\\@depth\\dimexpr0.5\\baselineskip-\\csname rfk@\\f@family\\endcsname\\dimexpr\\f@size\\p@\\relax\\relax\\@width\\z@}\\fi}',
    '\\makeatother',
    '\\raggedbottom',
    `\\setlist[itemize]{leftmargin=${bp(tk.spacing.listIndent)},labelsep=${bp(LIST.labelSep)},itemsep=${bp(LIST.itemGap)},topsep=${bp(LIST.outerGap)},parsep=0pt,partopsep=0pt,label={\\textbullet}}`,
    '\\makeatletter',
    v.style.pageNumbers
      ? '\\def\\ps@rfpage{\\def\\@oddhead{}\\def\\@evenhead{}\\def\\@oddfoot{\\hfil{\\rfsmall\\color{rfmuted}\\thepage}\\hfil}\\let\\@evenfoot\\@oddfoot}'
      : '\\def\\ps@rfpage{\\def\\@oddhead{}\\def\\@evenhead{}\\def\\@oddfoot{}\\def\\@evenfoot{}}',
    '\\makeatother',
    '\\pagestyle{rfpage}',
  ];

  if (twoCol) {
    const widths = tk.columns.sideFirst
      ? `${bp(tk.columns.side)}/${bp(tk.columns.gap)},${bp(tk.columns.main)}`
      : `${bp(tk.columns.main)}/${bp(tk.columns.gap)},${bp(tk.columns.side)}`;
    preamble.push(`\\setcolumnwidth{${widths}}`);
  }

  const body = ['\\begin{document}', '\\normalfont\\raggedright\\color{rftext}\\rfbase', header(v)];

  if (!twoCol) {
    body.push(column(v.main, v));
  } else {
    const main = column(v.main, v);
    const sideContent = column(v.side, v);
    const side = tinted
      ? `\\vspace*{${bp(SIDE_PADDING)}}\n\\begin{adjustwidth}{${bp(SIDE_PADDING)}}{${bp(SIDE_PADDING)}}\n${sideContent}\n\\end{adjustwidth}`
      : sideContent;
    if (tinted) body.push(`\\backgroundcolor{c[${tk.columns.sideFirst ? 0 : 1}](0bp,0bp)(0bp,0bp)}{rfsidebg}`);
    body.push('\\begin{paracol}{2}', tk.columns.sideFirst ? side : main, '\\switchcolumn', tk.columns.sideFirst ? main : side, '\\end{paracol}');
  }

  body.push('\\end{document}', '');
  return [...preamble, '', ...body].join('\n');
}
