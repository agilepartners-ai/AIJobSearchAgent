import React from 'react';
import { FileText } from 'lucide-react';

/**
 * Renders a PDF with the browser's built-in viewer.
 *
 * The old pipeline shipped @react-pdf/renderer and react-pdf to the client to
 * re-render the resume in the browser. Now that the server returns a real
 * compiled PDF there is nothing to re-render — an <iframe> displays it with no
 * JavaScript PDF stack at all.
 */

interface PdfPreviewProps {
  url: string | null;
  title: string;
  heightClass?: string;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ url, title, heightClass = 'h-[70vh]' }) => {
  if (!url) {
    return (
      <div
        className={`flex ${heightClass} flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400`}
      >
        <FileText size={32} />
        <p className="text-sm">Preview unavailable</p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title={title}
      className={`w-full ${heightClass} rounded-lg border border-gray-200 bg-white dark:border-gray-700`}
    />
  );
};

export default PdfPreview;
