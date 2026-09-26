/**
 * The generated cover letter, shown in the Studio's preview area with the same
 * actions the old results page offered: PDF, source, recompile, Overleaf.
 */
import { Code2, Download, FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { AiContext } from '../../../lib/resume/schema';
import { compileLatex, downloadText, refreshDocumentUrl } from '../../../services/documentService';
import LatexSourceViewer from '../../dashboard/documents/LatexSourceViewer';
import OpenInOverleafButton from '../../dashboard/documents/OpenInOverleafButton';
import PdfPreview from '../../dashboard/documents/PdfPreview';

export default function CoverLetterPane({ ai }: { ai: AiContext }) {
  const { coverLetter } = ai;
  const [view, setView] = useState<'preview' | 'source'>('preview');
  const [tex, setTex] = useState(coverLetter.tex);
  const [url, setUrl] = useState(coverLetter.url);

  // The stored link is signed and expires; mint a fresh one when the pane opens.
  // With no stored copy (Storage was unreachable when this was generated),
  // compile the LaTeX now instead.
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    const load = coverLetter.path
      ? refreshDocumentUrl(coverLetter.path)
      : compileLatex(coverLetter.tex).then((blob) => (objectUrl = URL.createObjectURL(blob)));
    load
      .then((fresh) => !cancelled && setUrl(fresh))
      .catch(() => !cancelled && !coverLetter.url && setError('Could not build the cover letter PDF. Try again in a moment.'));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [coverLetter.path, coverLetter.tex, coverLetter.url]);

  const seg = (active: boolean) =>
    `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
      active ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'
    }`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800">
          <button className={seg(view === 'preview')} onClick={() => setView('preview')}>
            <FileText size={13} /> Preview
          </button>
          <button className={seg(view === 'source')} onClick={() => setView('source')}>
            <Code2 size={13} /> LaTeX
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
          >
            <Download size={14} /> PDF
          </a>
          <button
            type="button"
            onClick={() => downloadText('cover_letter.tex', tex)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download size={14} /> .tex
          </button>
          <OpenInOverleafButton tex={tex} filename="cover_letter.tex" />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {view === 'preview' ? (
        url ? (
          <PdfPreview url={url} title="Cover letter preview" />
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">Building the cover letter PDF…</p>
        )
      ) : (
        <LatexSourceViewer
          tex={tex}
          filename="cover_letter.tex"
          onRecompiled={(newUrl, source) => {
            setUrl(newUrl);
            setTex(source);
          }}
        />
      )}
    </div>
  );
}
