/**
 * One of the user's resumes in the Studio list: a live thumbnail of the
 * document itself, what it was written for, and the two actions people reach
 * for — make a copy (one tailored resume per job) and delete.
 */
import { motion } from 'framer-motion';
import { Copy, Trash2 } from 'lucide-react';
import React from 'react';
import { getPreset } from '../../lib/resume/presets';
import type { ResumeDocument } from '../../lib/resume/schema';
import ResumePreview from './ResumePreview';

const SCALE = 0.22;
const PAGE_W = 595.28;
const PAGE_H = 841.89;

interface Props {
  resume: ResumeDocument;
  onOpen: (resume: ResumeDocument) => void;
  onDuplicate: (resume: ResumeDocument) => void;
  onDelete: (id: string) => void;
}

function ResumeCard({ resume, onOpen, onDuplicate, onDelete }: Props) {
  const forJob = resume.ai ? `${resume.ai.jobTitle} · ${resume.ai.company}` : null;
  const action =
    'rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-sm backdrop-blur transition-colors dark:bg-slate-900/90 dark:text-slate-300';

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <button type="button" onClick={() => onOpen(resume)} className="block w-full text-left">
        <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: PAGE_H * SCALE }}>
          <div
            className="pointer-events-none absolute left-1/2 top-0"
            style={{ width: PAGE_W * SCALE, marginLeft: -(PAGE_W * SCALE) / 2 }}
          >
            <ResumePreview document={resume} scale={SCALE} gap={0} firstPageOnly />
          </div>
        </div>
        <div className="px-3.5 py-3">
          <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{resume.title}</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {forJob ?? getPreset(resume.presetId).name} · {new Date(resume.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </button>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button onClick={() => onDuplicate(resume)} aria-label={`Duplicate ${resume.title}`} className={`${action} hover:text-indigo-600`}>
          <Copy size={14} />
        </button>
        <button onClick={() => onDelete(resume.id)} aria-label={`Delete ${resume.title}`} className={`${action} hover:text-rose-600`}>
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export default React.memo(ResumeCard);
