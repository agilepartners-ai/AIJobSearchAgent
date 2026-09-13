import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Code2,
  Download,
  FileText,
  Lightbulb,
  RefreshCw,
  Target,
} from 'lucide-react';
import PdfPreview from './PdfPreview';
import LatexSourceViewer from './LatexSourceViewer';
import {
  OpenInOverleafButton,
  OpenProjectInOverleafButton,
} from './OpenInOverleafButton';
import { downloadText, type GeneratedDocuments } from '../../../services/documentService';

interface DocumentResultsProps {
  documents: GeneratedDocuments;
  jobDetails: { title: string; company: string };
  onBack: () => void;
  onRegenerate: () => void;
}

type DocumentTab = 'resume' | 'coverLetter';
type ViewMode = 'preview' | 'source';

const scoreTone = (score: number) =>
  score >= 80
    ? 'text-green-600 dark:text-green-400'
    : score >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

const DocumentResults: React.FC<DocumentResultsProps> = ({
  documents,
  jobDetails,
  onBack,
  onRegenerate,
}) => {
  const [tab, setTab] = useState<DocumentTab>('resume');
  const [view, setView] = useState<ViewMode>('preview');

  // A recompile from the source editor produces a local object URL that should
  // win over the stored one until the next regenerate.
  const [overrides, setOverrides] = useState<Partial<Record<DocumentTab, { url: string; tex: string }>>>({});

  const isResume = tab === 'resume';
  const override = overrides[tab];

  const tex = override?.tex ?? (isResume ? documents.resumeTex : documents.coverLetterTex);
  const pdfUrl = override?.url ?? (isResume ? documents.resumeUrl : documents.coverLetterUrl);
  const filename = isResume ? 'resume.tex' : 'cover_letter.tex';
  const { analysis } = documents;

  const handleRecompiled = (url: string, source: string) => {
    setOverrides((prev) => ({ ...prev, [tab]: { url, tex: source } }));
    setView('preview');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your tailored documents
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {jobDetails.title} at {jobDetails.company}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw size={17} />
            Regenerate
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
                {(['resume', 'coverLetter'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      tab === value
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {value === 'resume' ? 'Resume' : 'Cover letter'}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
                {([
                  ['preview', 'Preview', FileText],
                  ['source', 'LaTeX', Code2],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setView(value)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      view === value
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view === 'preview' ? (
              <PdfPreview url={pdfUrl} title={isResume ? 'Resume preview' : 'Cover letter preview'} />
            ) : (
              <LatexSourceViewer tex={tex} filename={filename} onRecompiled={handleRecompiled} />
            )}

            <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Download size={18} />
                Download PDF
              </a>

              <button
                type="button"
                onClick={() => downloadText(filename, tex)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Download size={18} />
                Download .tex
              </button>

              <OpenInOverleafButton tex={tex} filename={filename} />

              <OpenProjectInOverleafButton
                mainDocument="resume.tex"
                files={[
                  { name: 'resume.tex', content: overrides.resume?.tex ?? documents.resumeTex },
                  {
                    name: 'cover_letter.tex',
                    content: overrides.coverLetter?.tex ?? documents.coverLetterTex,
                  },
                ]}
              />
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Opening in Overleaf creates a new project in your Overleaf account, where you can edit
              and recompile it. You will be asked to sign in if you are not already.
            </p>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-1 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <Target size={16} />
                Match score
              </div>
              <p className={`text-4xl font-bold ${scoreTone(analysis.match_score)}`}>
                {analysis.match_score}
                <span className="text-xl">%</span>
              </p>
            </div>

            <AnalysisCard
              icon={<CheckCircle size={16} className="text-green-600 dark:text-green-400" />}
              title="Strengths"
              items={analysis.strengths}
            />
            <AnalysisCard
              icon={<AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />}
              title="Gaps"
              items={analysis.gaps}
            />
            <AnalysisCard
              icon={<Lightbulb size={16} className="text-blue-600 dark:text-blue-400" />}
              title="Suggestions"
              items={analysis.suggestions}
            />

            <KeywordCard
              title="Keywords matched"
              items={analysis.present_keywords}
              tone="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
            />
            <KeywordCard
              title="Keywords missing"
              items={analysis.missing_keywords}
              tone="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

const AnalysisCard: React.FC<{ icon: React.ReactNode; title: string; items: string[] }> = ({
  icon,
  title,
  items,
}) => {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        {icon}
        {title}
      </h2>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm leading-snug text-gray-600 dark:text-gray-300">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const KeywordCard: React.FC<{ title: string; items: string[]; tone: string }> = ({
  title,
  items,
  tone,
}) => {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default DocumentResults;
