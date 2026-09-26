/**
 * HTML renderers for the pieces of a resume page.
 *
 * Each component mirrors a function in lib/resume/latex/serialize.ts. Sizes
 * come from the same tokens and metrics; lengths are CSS `pt`, which equals
 * LaTeX `bp`. When changing one side, change the other.
 */
import React from 'react';
import { ENTRY, GRID, HEADER, HEADING, LEVEL, LIST } from '../../lib/resume/metrics';
import { tint } from '../../lib/resume/tokens';
import { baselineOffset } from '../../lib/resume/fonts';
import type {
  FlowBlock,
  InlineRun,
  ListItemView,
  ResumeView,
  SectionView,
  TimelineEntryView,
  ViewBlock,
} from '../../lib/resume/view';

const pt = (n: number) => `${Math.round(n * 100) / 100}pt`;

function Runs({ runs, view }: { runs: InlineRun[]; view: ResumeView }) {
  return (
    <>
      {runs.map((r, i) => {
        let node: React.ReactNode = r.text;
        if (r.bold) node = <strong style={{ fontWeight: 700 }}>{node}</strong>;
        if (r.italic) node = <em style={{ fontStyle: 'italic' }}>{node}</em>;
        if (r.href) {
          node = (
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: view.tokens.color.links, textDecoration: view.style.underlineLinks ? 'underline' : 'none' }}
            >
              {node}
            </a>
          );
        }
        return <React.Fragment key={i}>{node}</React.Fragment>;
      })}
    </>
  );
}

export function RichBlocks({ blocks, view }: { blocks: ViewBlock[]; view: ResumeView }) {
  const { font, spacing } = view.tokens;
  const line = { fontSize: pt(font.base), lineHeight: pt(font.base * font.lineHeight) };
  return (
    <>
      {blocks.map((b, i) =>
        b.type === 'paragraph' ? (
          <div key={i} style={line}>
            <Runs runs={b.runs} view={view} />
          </div>
        ) : (
          <ul
            key={i}
            style={{
              ...line,
              listStyle: 'none',
              margin: 0,
              padding: `${pt(LIST.outerGap)} 0 ${pt(LIST.outerGap)} ${pt(spacing.listIndent)}`,
            }}
          >
            {b.items.map((children, j) => (
              <li key={j} style={{ position: 'relative', marginTop: j === 0 ? 0 : pt(LIST.itemGap) }}>
                <span aria-hidden style={{ position: 'absolute', right: '100%', marginRight: pt(LIST.labelSep) }}>
                  •
                </span>
                <RichBlocks blocks={children} view={view} />
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}

export function SectionHeading({ section, view }: { section: SectionView; view: ResumeView }) {
  const { tokens, style, fonts } = view;
  const h = tokens.font.heading;
  const lead = h * HEADING.leading;
  const text: React.CSSProperties = {
    fontFamily: fonts.headingCss,
    fontVariantNumeric: fonts.heading.numeric,
    fontSize: pt(h),
    lineHeight: pt(lead),
    fontWeight: 700,
    color: tokens.color.headings,
  };
  const rule = (height: number, width?: number) => (
    <div style={{ height: pt(height), width: width ? pt(width) : '100%', background: tokens.color.rules }} />
  );
  const gap = <div style={{ height: pt(HEADING.ruleGap) }} />;
  const label = <div style={text}>{section.heading}</div>;

  switch (style.headingStyle) {
    case 'line':
      return <>{label}{gap}{rule(HEADING.thinRule)}</>;
    case 'underline':
      return <>{label}{gap}{rule(HEADING.thickRule, HEADING.underlineWidth)}</>;
    case 'topBottom':
      return <>{rule(HEADING.thinRule)}{gap}{label}{gap}{rule(HEADING.thinRule)}</>;
    case 'box':
      return (
        <div
          style={{
            ...text,
            background: tint(tokens.color.accent, 0.88),
            padding: `${pt(HEADING.boxPadY)} ${pt(HEADING.boxPadX)}`,
          }}
        >
          {section.heading}
        </div>
      );
    case 'accentBar':
      return (
        <div style={text}>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: pt(HEADING.barWidth),
              height: pt(lead * 0.9),
              verticalAlign: pt(-lead * 0.2),
              marginRight: pt(HEADING.barGap),
              background: tokens.color.rules,
            }}
          />
          {section.heading}
        </div>
      );
    default:
      return label;
  }
}

function subtitleStyle(view: ResumeView): React.CSSProperties {
  const s = view.style.entries.subtitleStyle;
  return s === 'italic' ? { fontStyle: 'italic' } : s === 'bold' ? { fontWeight: 700 } : {};
}

export function TimelineEntry({ entry, view }: { entry: TimelineEntryView; view: ResumeView }) {
  const { font, color } = view.tokens;
  const right = view.style.entries.datePosition === 'right';
  const k = baselineOffset(view.fonts.body.id);
  const muted: React.CSSProperties = {
    fontSize: pt(font.small),
    fontWeight: 400,
    fontStyle: 'normal',
    color: color.muted,
  };
  // Baseline-aligning a large title with smaller dates pushes the smaller item
  // down and grows the row, which TeX's single line never does. Align tops
  // instead, then drop the smaller text onto the shared baseline explicitly.
  const onBaseline = (bigSize: number): React.CSSProperties => ({
    ...muted,
    position: 'relative',
    top: pt(k * (bigSize - font.small)),
  });
  const row: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  };

  const title = entry.titleHref ? (
    <a href={entry.titleHref} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: view.style.underlineLinks ? 'underline' : 'none' }}>
      {entry.title}
    </a>
  ) : (
    entry.title
  );

  return (
    <>
      {(entry.title || (right && entry.dates)) && (
        <div style={{ ...row, fontSize: pt(font.entryTitle), lineHeight: pt(font.entryTitle * font.lineHeight), fontWeight: 700 }}>
          <span>{title}</span>
          {right && entry.dates && <span style={onBaseline(font.entryTitle)}>{entry.dates}</span>}
        </div>
      )}
      {(entry.subtitle || (right && entry.location)) && (
        <div style={{ ...row, fontSize: pt(font.base), lineHeight: pt(font.base * font.lineHeight) }}>
          <span style={subtitleStyle(view)}>{entry.subtitle}</span>
          {right && entry.location && <span style={onBaseline(font.base)}>{entry.location}</span>}
        </div>
      )}
      {!right && (entry.dates || entry.location) && (
        <div style={{ ...muted, lineHeight: pt(font.small * font.lineHeight) }}>
          {[entry.dates, entry.location].filter(Boolean).join(' · ')}
        </div>
      )}
      {entry.body.length > 0 && (
        <div style={{ paddingTop: pt(ENTRY.beforeBody) }}>
          <RichBlocks blocks={entry.body} view={view} />
        </div>
      )}
    </>
  );
}

function ItemText({ item, view }: { item: ListItemView; view: ResumeView }) {
  return (
    <>
      {item.title}
      {item.detail && <span style={{ color: view.tokens.color.muted }}> ({item.detail})</span>}
    </>
  );
}

export function ListBody({ section, view }: { section: SectionView; view: ResumeView }) {
  const { font, color } = view.tokens;
  const line: React.CSSProperties = { fontSize: pt(font.base), lineHeight: pt(font.base * font.lineHeight) };

  if (section.display === 'levels') {
    return (
      <>
        {section.items.map((item, i) => (
          <div key={item.id} style={{ ...line, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', marginTop: i ? pt(GRID.rowGap) : 0 }}>
            <span>
              {item.title}
              {item.detail && (
                // Zero line-height: smaller inline text must not enlarge the line box.
                <span style={{ fontSize: pt(font.small), color: color.muted, lineHeight: 0 }}> {item.detail}</span>
              )}
            </span>
            {item.level && (
              <span aria-label={`Level ${item.level} of ${LEVEL.segments}`}>
                {Array.from({ length: LEVEL.segments }, (_, s) => (
                  <span
                    key={s}
                    style={{
                      display: 'inline-block',
                      width: pt(LEVEL.width),
                      height: pt(LEVEL.height),
                      marginLeft: s ? pt(LEVEL.gap) : 0,
                      verticalAlign: pt(LEVEL.height * 0.9),
                      background: s < item.level! ? color.accent : tint(color.accent, 0.8),
                    }}
                  />
                ))}
              </span>
            )}
          </div>
        ))}
      </>
    );
  }

  if (section.display === 'grid') {
    return (
      <div
        style={{
          ...line,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(1, section.gridColumns)}, minmax(0, 1fr))`,
          columnGap: pt(GRID.columnGap),
          rowGap: pt(GRID.rowGap),
        }}
      >
        {section.items.map((item) => (
          <div key={item.id}>
            •<span style={{ display: 'inline-block', width: pt(LIST.labelSep) }} />
            <ItemText item={item} view={view} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={line}>
      {section.items.map((item, i) => (
        <React.Fragment key={item.id}>
          {i > 0 && ' • '}
          <ItemText item={item} view={view} />
        </React.Fragment>
      ))}
    </div>
  );
}

/** One unbreakable flow block. `showGap` is false when the block starts a page. */
export function Block({ block, view, showGap }: { block: FlowBlock; view: ResumeView; showGap: boolean }) {
  return (
    <div style={{ paddingTop: showGap && block.gapBefore ? pt(block.gapBefore) : 0 }}>
      {block.withHeading && (
        <>
          <SectionHeading section={block.section} view={view} />
          <div style={{ height: pt(view.tokens.spacing.afterHeading) }} />
        </>
      )}
      {block.entry ? (
        <TimelineEntry entry={block.entry} view={view} />
      ) : block.section.kind === 'paragraph' ? (
        <RichBlocks blocks={block.section.body} view={view} />
      ) : block.section.kind === 'list' ? (
        <ListBody section={block.section} view={view} />
      ) : null}
    </div>
  );
}

export function Header({ view }: { view: ResumeView }) {
  const { tokens, fonts, header, style } = view;
  const { font, color } = tokens;
  if (!header.name && !header.title && !header.contacts.length) return null;

  return (
    <div style={{ textAlign: style.header.align }}>
      {header.name && (
        <div
          style={{
            fontFamily: fonts.headingCss,
            fontVariantNumeric: fonts.heading.numeric,
            fontSize: pt(font.name),
            lineHeight: pt(font.name * HEADER.nameLeading),
            fontWeight: 700,
            color: color.name,
          }}
        >
          {header.name}
        </div>
      )}
      {header.title && (
        <div
          style={{
            marginTop: header.name ? pt(HEADER.afterName) : 0,
            fontSize: pt(font.title),
            lineHeight: pt(font.title * HEADER.titleLeading),
            color: color.text,
          }}
        >
          {header.title}
        </div>
      )}
      {header.contacts.length > 0 && (
        <div
          style={{
            marginTop: header.name || header.title ? pt(HEADER.afterTitle) : 0,
            fontSize: pt(font.small),
            lineHeight: pt(font.small * font.lineHeight),
            color: color.muted,
          }}
        >
          {header.contacts.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <>
                  <wbr />
                  <span style={{ margin: `0 ${pt(HEADER.separatorGap)}` }}>{header.separator}</span>
                  <wbr />
                </>
              )}
              {c.href ? (
                <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                  {c.text}
                </a>
              ) : (
                c.text
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
