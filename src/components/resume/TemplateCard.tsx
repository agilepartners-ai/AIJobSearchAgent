/**
 * A template tile in the gallery. The thumbnail is the real renderer at a
 * small scale, not a picture, so a template can never look different from
 * what it produces.
 */
import { motion } from 'framer-motion';
import React, { useMemo } from 'react';
import { createSampleResume } from '../../lib/resume/defaults';
import { withPreset, type Preset } from '../../lib/resume/presets';
import type { ResumeDocument } from '../../lib/resume/schema';
import ResumePreview from './ResumePreview';

const THUMB_SCALE = 0.26;
const PAGE_W = 595.28;
const PAGE_H = 841.89;

interface Props {
  preset: Preset;
  /** Render this document in the template instead of the sample content. */
  document?: ResumeDocument;
  selected?: boolean;
  onSelect: (presetId: string) => void;
}

function TemplateCard({ preset, document, selected, onSelect }: Props) {
  const sample = useMemo(
    () => (document ? withPreset(document, preset.id) : createSampleResume(preset.id)),
    [document, preset.id],
  );

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(preset.id)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border text-left transition-colors ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
      } bg-white dark:bg-slate-900`}
    >
      <div
        className="relative overflow-hidden bg-slate-100 dark:bg-slate-800"
        style={{ height: PAGE_H * THUMB_SCALE }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0"
          style={{ width: PAGE_W * THUMB_SCALE, marginLeft: -(PAGE_W * THUMB_SCALE) / 2 }}
        >
          <ResumePreview document={sample} scale={THUMB_SCALE} gap={0} firstPageOnly />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{preset.name}</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{preset.description}</div>
        </div>
        {selected && (
          <span className="mt-0.5 shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">
            Selected
          </span>
        )}
      </div>
    </motion.button>
  );
}

// Rendering twelve live documents is not cheap; only re-render when the tile
// itself changes.
export default React.memo(TemplateCard);
