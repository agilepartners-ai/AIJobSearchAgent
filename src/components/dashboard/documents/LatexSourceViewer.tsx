import React, { useEffect, useState } from 'react';
import { Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import { compileLatex, DocumentServiceError } from '../../../services/documentService';

/**
 * Shows the generated LaTeX and lets the user edit and recompile it in place.
 *
 * This is the half of the feature Overleaf does not cover: Overleaf is great
 * for a full editing session, but for a one-line tweak a round trip through
 * another site is friction.
 */

interface LatexSourceViewerProps {
  tex: string;
  filename: string;
  onRecompiled?: (pdfUrl: string, tex: string) => void;
}

const LatexSourceViewer: React.FC<LatexSourceViewerProps> = ({ tex, filename, onRecompiled }) => {
  const [source, setSource] = useState(tex);
  const [copied, setCopied] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A regenerate upstream replaces the document; drop any local edits.
  useEffect(() => {
    setSource(tex);
    setError(null);
  }, [tex]);

  const dirty = source !== tex;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  };

  const handleRecompile = async () => {
    setCompiling(true);
    setError(null);
    try {
      const blob = await compileLatex(source);
      onRecompiled?.(URL.createObjectURL(blob), source);
    } catch (err) {
      setError(
        err instanceof DocumentServiceError
          ? err.message
          : 'Could not compile that LaTeX. Please try again.',
      );
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{filename}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleRecompile}
            disabled={compiling || !dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            title={dirty ? 'Recompile your edits' : 'Edit the source to enable recompiling'}
          >
            {compiling ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {compiling ? 'Compiling…' : 'Recompile'}
          </button>
        </div>
      </div>

      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        className="h-[60vh] w-full resize-y rounded-lg border border-gray-300 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
};

export default LatexSourceViewer;
