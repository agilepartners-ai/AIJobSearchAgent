"use client";
import React from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import { PerfectHTMLToPDF } from './ResumeTemplate';
import type { UserProfileData } from '../../services/profileService';

interface ResumePDFPreviewProps {
  resumeHtml: string;
  profile: UserProfileData;
  jobKeywords?: string[];
  emphasizeMetrics?: boolean;
  twoColumnSkills?: boolean;
  /** If provided we skip on-the-fly generation and just embed the stored PDF. */
  pdfUrl?: string;
  /** If inline generation fails, try this fallback signed PDF URL. */
  fallbackPdfUrl?: string;
  className?: string;
  height?: number | string;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

/**
 * Unified PDF preview component.
 * - If a previously generated pdfUrl is given (e.g. fetched from Firestore Storage), it is embedded directly.
 * - Otherwise we generate a Blob on the client using @react-pdf/renderer (BlobProvider) and show it in an iframe.
 * This avoids issues where <PDFViewer> sometimes renders blank in Next.js / dark mode containers.
 */
const ResumePDFPreview: React.FC<ResumePDFPreviewProps> = ({
  resumeHtml,
  profile,
  jobKeywords = [],
  emphasizeMetrics = true,
  twoColumnSkills = true,
  pdfUrl,
  fallbackPdfUrl,
  className = '',
  height = '100%',
  loadingFallback = <div className="flex items-center justify-center h-full text-sm text-gray-500">Generating PDF…</div>,
  errorFallback = <div className="flex items-center justify-center h-full text-sm text-red-500">Failed to render PDF</div>
}) => {
  if (pdfUrl) {
    return (
      <iframe
        title="Stored Resume PDF"
        src={pdfUrl}
        className={"w-full rounded border " + className}
        style={{ height, background: '#fff' }}
      />
    );
  }

  return (
    <BlobProvider
      document={
        <PerfectHTMLToPDF
          htmlContent={resumeHtml}
          profile={profile}
          jobKeywords={jobKeywords}
          twoColumnSkills={twoColumnSkills}
          emphasizeMetrics={emphasizeMetrics}
        />
      }
    >
      {({ url, loading, error }) => {
        if (loading) return loadingFallback;
        if (error || !url) {
          if (error) {
            // eslint-disable-next-line no-console
            console.error('[ResumePDFPreview] Failed to render PDF', error);
          }
          if (fallbackPdfUrl) {
            return (
              <iframe
                title="Fallback Resume PDF"
                src={fallbackPdfUrl}
                className={"w-full rounded border " + className}
                style={{ height, background: '#fff' }}
              />
            );
          }
          return errorFallback;
        }
        return (
          <iframe
            title="Resume PDF Preview"
            src={url + '#toolbar=0'}
            className={"w-full rounded border " + className}
            style={{ height, background: '#fff' }}
          />
        );
      }}
    </BlobProvider>
  );
};

export default ResumePDFPreview;
