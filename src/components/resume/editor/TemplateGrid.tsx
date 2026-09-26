/**
 * Template gallery inside the editor. Each tile is the user's own résumé
 * rendered in that design, so choosing a template is choosing between real
 * outcomes rather than between sample pages.
 *
 * Twelve live previews are only affordable because tiles depend on content and
 * template alone: dragging a font-size slider changes the document's style but
 * not what a tile shows, so no tile re-measures while the user tunes the page.
 */
import { motion } from 'framer-motion';
import React, { useCallback, useMemo, useRef } from 'react';
import { PRESETS, getPreset, withPreset, type Preset } from '../../../lib/resume/presets';
import type { ResumeDocument } from '../../../lib/resume/schema';
import ResumePreview from '../ResumePreview';
import type { ResumeEditor } from './useResumeEditor';

const SCALE = 0.27;
const PAGE_W = 595.28;
const PAGE_H = 841.89;

interface ThumbProps {
  preset: Preset;
  /** Changes only when what the tile would show changes. */
  contentKey: string;
  getDocument: () => ResumeDocument;
  selected: boolean;
  onChoose: (id: string) => void;
}

const Thumb = React.memo(
  function Thumb({ preset, contentKey, getDocument, selected, onChoose }: ThumbProps) {
    // contentKey stands in for the document: it is what invalidates this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const document = useMemo(() => withPreset(getDocument(), preset.id), [contentKey, preset.id]);

    return (
      <motion.button
        type="button"
        onClick={() => onChoose(preset.id)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        aria-pressed={selected}
        aria-label={`${preset.name} template`}
        className={`overflow-hidden rounded-xl border text-left transition-colors ${
          selected
            ? 'border-indigo-500 ring-2 ring-indigo-500/30'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
        } bg-white dark:bg-slate-900`}
      >
        <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: PAGE_H * SCALE }}>
          <div
            className="pointer-events-none absolute left-1/2 top-0"
            style={{ width: PAGE_W * SCALE, marginLeft: -(PAGE_W * SCALE) / 2 }}
          >
            <ResumePreview document={document} scale={SCALE} gap={0} firstPageOnly />
          </div>
        </div>
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">{preset.name}</span>
          {selected && <span className="ml-1 rounded-full bg-indigo-600 px-1.5 py-px text-[9px] font-medium text-white">Using</span>}
        </div>
      </motion.button>
    );
  },
  (a, b) => a.contentKey === b.contentKey && a.selected === b.selected && a.preset.id === b.preset.id,
);

export default function TemplateGrid({ editor }: { editor: ResumeEditor }) {
  const { document: doc, update } = editor;

  const latest = useRef(doc);
  latest.current = doc;
  const getDocument = useCallback(() => latest.current, []);

  const contentKey = useMemo(() => JSON.stringify([doc.personal, doc.sections]), [doc.personal, doc.sections]);

  const choose = useCallback(
    (id: string) => {
      const preset = getPreset(id);
      update((d) => {
        d.presetId = preset.id;
        d.layout = JSON.parse(JSON.stringify(preset.layout));
        d.style = JSON.parse(JSON.stringify(preset.style));
      });
    },
    [update],
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5">
        {PRESETS.map((preset) => (
          <Thumb
            key={preset.id}
            preset={preset}
            contentKey={contentKey}
            getDocument={getDocument}
            selected={doc.presetId === preset.id}
            onChoose={choose}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-400">
        Switching template replaces the design only. Your content is never touched.
      </p>
    </div>
  );
}
