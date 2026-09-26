/**
 * Live, paginated HTML preview of a resume.
 *
 * Two passes: every flow block is first rendered off-screen at true size and
 * measured, then paginate.ts distributes blocks across pages using the same
 * rule TeX applies to the serializer's output. The page count shown here is
 * therefore a prediction of the PDF's; the export compile is authoritative.
 *
 * Re-measures when the document changes or web fonts finish loading, since
 * either changes line wraps.
 */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ResumeDocument } from '../../lib/resume/schema';
import { SIDE_PADDING } from '../../lib/resume/metrics';
import { buildView, columnFlow, type FlowBlock, type ResumeView } from '../../lib/resume/view';
import { Block, Header } from './blocks';
import { paginateColumn, type MeasuredBlock } from './paginate';

const PX_TO_PT = 0.75;
const pt = (n: number) => `${Math.round(n * 100) / 100}pt`;

export interface PreviewLayout {
  pageCount: number;
  /** Flow block keys on each page, main and side columns combined. */
  pages: { main: string[]; side: string[] }[];
  /** Height available and used per page (pt); the parity harness reads this. */
  fill: { capacity: number; main: number; side: number }[];
}

interface Props {
  document: ResumeDocument;
  /** CSS scale applied to rendered pages (measurement is always at 1). */
  scale?: number;
  gap?: number;
  onLayout?: (layout: PreviewLayout) => void;
  className?: string;
  /** Render only the first page, e.g. for template thumbnails. */
  firstPageOnly?: boolean;
}

interface Measurements {
  header: number;
  main: MeasuredBlock[];
  side: MeasuredBlock[];
}

function pageStyle(view: ResumeView): React.CSSProperties {
  const { tokens, fonts } = view;
  return {
    position: 'relative',
    width: pt(tokens.page.width),
    height: pt(tokens.page.height),
    background: '#ffffff',
    color: tokens.color.text,
    fontFamily: fonts.bodyCss,
    fontVariantNumeric: fonts.body.numeric,
    fontSize: pt(tokens.font.base),
    lineHeight: pt(tokens.font.base * tokens.font.lineHeight),
    fontKerning: 'normal',
    fontVariantLigatures: 'common-ligatures no-contextual',
    textAlign: 'left',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };
}

export default function ResumePreview({ document: doc, scale = 1, gap = 16, onLayout, className, firstPageOnly }: Props) {
  const view = useMemo(() => buildView(doc), [doc]);
  const { tokens } = view;
  const twoCol = tokens.columns.count === 2;
  const tinted = twoCol && !!tokens.columns.sideBackground;

  const mainFlow = useMemo(() => columnFlow(view.main, tokens), [view, tokens]);
  const sideFlow = useMemo(() => columnFlow(view.side, tokens), [view, tokens]);
  const byKey = useMemo(() => new Map<string, FlowBlock>([...mainFlow, ...sideFlow].map((b) => [b.key, b])), [mainFlow, sideFlow]);

  const measureRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measurements | null>(null);
  const [fontEpoch, setFontEpoch] = useState(0);

  // Web fonts change line wraps when they arrive; measure again when they do.
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let cancelled = false;
    const bump = () => !cancelled && setFontEpoch((n) => n + 1);
    document.fonts.ready.then(bump);
    document.fonts.addEventListener?.('loadingdone', bump);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener?.('loadingdone', bump);
    };
  }, []);

  const measure = useCallback(() => {
    const root = measureRef.current;
    if (!root) return;
    const read = (col: 'main' | 'side', flow: FlowBlock[]): MeasuredBlock[] =>
      flow.map((b) => {
        const el = root.querySelector<HTMLElement>(`[data-col="${col}"] [data-key="${CSS.escape(b.key)}"]`);
        // Measured with the top gap removed; the paginator adds it back when needed.
        return { key: b.key, gapBefore: b.gapBefore, height: (el?.getBoundingClientRect().height ?? 0) * PX_TO_PT };
      });
    const headerEl = root.querySelector<HTMLElement>('[data-header]');
    setMeasured({
      header: (headerEl?.getBoundingClientRect().height ?? 0) * PX_TO_PT,
      main: read('main', mainFlow),
      side: read('side', sideFlow),
    });
  }, [mainFlow, sideFlow]);

  useLayoutEffect(() => {
    measure();
  }, [measure, view, fontEpoch]);

  const layout = useMemo(() => {
    if (!measured) return null;
    const headerSpace = measured.header > 0 ? measured.header + tokens.spacing.afterHeader : 0;
    const capacity = tokens.text.height;
    const first = capacity - headerSpace;
    const main = paginateColumn(measured.main, first, capacity);
    const side = twoCol ? paginateColumn(measured.side, first - (tinted ? SIDE_PADDING : 0), capacity) : [];
    const count = Math.max(main.length, side.length, 1);
    return {
      headerSpace,
      capacities: Array.from({ length: count }, (_, i) => (i === 0 ? first : capacity)),
      pages: Array.from({ length: count }, (_, i) => ({
        main: main[i]?.keys ?? [],
        side: side[i]?.keys ?? [],
        mainUsed: main[i]?.used ?? 0,
        sideUsed: side[i]?.used ?? 0,
      })),
    };
  }, [measured, tokens, twoCol, tinted]);

  const lastReported = useRef('');
  useLayoutEffect(() => {
    if (!layout || !onLayout) return;
    const report: PreviewLayout = {
      pageCount: layout.pages.length,
      pages: layout.pages.map((p) => ({ main: p.main, side: p.side })),
      fill: layout.pages.map((p, i) => ({
        capacity: Math.round(layout.capacities[i] * 100) / 100,
        main: Math.round(p.mainUsed * 100) / 100,
        side: Math.round(p.sideUsed * 100) / 100,
      })),
    };
    const signature = JSON.stringify(report);
    if (signature !== lastReported.current) {
      lastReported.current = signature;
      onLayout(report);
    }
  }, [layout, onLayout]);

  const sideCol = (keys: string[], firstPage: boolean) => (
    <div
      style={{
        width: pt(tokens.columns.side),
        padding: tinted ? `${firstPage ? pt(SIDE_PADDING) : 0} ${pt(SIDE_PADDING)} 0` : 0,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {keys.map((k, i) => (
        <Block key={k} block={byKey.get(k)!} view={view} showGap={i > 0} />
      ))}
    </div>
  );
  const mainCol = (keys: string[]) => (
    <div style={{ width: pt(tokens.columns.main) }}>
      {keys.map((k, i) => (
        <Block key={k} block={byKey.get(k)!} view={view} showGap={i > 0} />
      ))}
    </div>
  );

  const pages = layout ? (firstPageOnly ? layout.pages.slice(0, 1) : layout.pages) : [];

  return (
    <div className={className}>
      {/* Measurement pass: true size, invisible, out of flow. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{ position: 'absolute', left: -100000, top: 0, visibility: 'hidden', pointerEvents: 'none' }}
      >
        <div style={{ ...pageStyle(view), height: 'auto', overflow: 'visible' }}>
          <div data-header style={{ width: pt(tokens.text.width) }}>
            <Header view={view} />
          </div>
          <div data-col="main" style={{ width: pt(tokens.columns.main) }}>
            {mainFlow.map((b) => (
              <div key={b.key} data-key={b.key}>
                <Block block={b} view={view} showGap={false} />
              </div>
            ))}
          </div>
          {twoCol && (
            <div data-col="side" style={{ width: pt(tinted ? tokens.columns.side - 2 * SIDE_PADDING : tokens.columns.side) }}>
              {sideFlow.map((b) => (
                <div key={b.key} data-key={b.key}>
                  <Block block={b} view={view} showGap={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>
        {pages.map((page, index) => {
          const isFirst = index === 0;
          const isLast = index === layout!.pages.length - 1;
          const columnsTop = isFirst ? layout!.headerSpace : 0;
          // paracol tints the full column on pages it continues past, and only
          // down to the end of the columns on its last page.
          const tintHeight = isLast
            ? Math.max(page.mainUsed, page.sideUsed + (isFirst && tinted ? SIDE_PADDING : 0))
            : tokens.text.height - columnsTop;
          const sideLeft = tokens.columns.sideFirst ? 0 : tokens.columns.main + tokens.columns.gap;

          return (
            <div
              key={index}
              style={{ width: `calc(${pt(tokens.page.width)} * ${scale})`, height: `calc(${pt(tokens.page.height)} * ${scale})` }}
            >
              <div
                data-page={index + 1}
                style={{ ...pageStyle(view), transform: `scale(${scale})`, transformOrigin: 'top left' }}
              >
                <div style={{ position: 'absolute', left: pt(tokens.margin.x), top: pt(tokens.margin.y), width: pt(tokens.text.width) }}>
                  {isFirst && layout!.headerSpace > 0 && (
                    <div style={{ height: pt(layout!.headerSpace) }}>
                      <Header view={view} />
                    </div>
                  )}
                  {twoCol ? (
                    <div style={{ position: 'relative', display: 'flex', gap: pt(tokens.columns.gap) }}>
                      {tinted && (
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: pt(sideLeft),
                            top: 0,
                            width: pt(tokens.columns.side),
                            height: pt(tintHeight),
                            background: tokens.columns.sideBackground!,
                          }}
                        />
                      )}
                      {tokens.columns.sideFirst ? (
                        <>
                          {sideCol(page.side, isFirst)}
                          {mainCol(page.main)}
                        </>
                      ) : (
                        <>
                          {mainCol(page.main)}
                          {sideCol(page.side, isFirst)}
                        </>
                      )}
                    </div>
                  ) : (
                    mainCol(page.main)
                  )}
                </div>
                {view.style.pageNumbers && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: pt(tokens.page.height - tokens.margin.y + tokens.margin.y / 2 - tokens.font.small),
                      textAlign: 'center',
                      fontSize: pt(tokens.font.small),
                      lineHeight: pt(tokens.font.small * tokens.font.lineHeight),
                      color: tokens.color.muted,
                    }}
                  >
                    {index + 1}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
