"use client";
import React from 'react';
import type { UserProfileData } from '@/services/profileService';
import { useAppSelector } from '@/store/hooks';
import { TEMPLATE_REGISTRY } from '@/lib/templateRegistry';

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

const ResumePDFPreview: React.FC<ResumePDFPreviewProps> = ({
  profile,
  pdfUrl,
  fallbackPdfUrl,
  className = '',
  height = '100%',
}) => {
  const selectedTemplateId = useAppSelector((state) => state.resumeTemplateForm.selectedTemplateId);

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

  const SelectedTemplate = TEMPLATE_REGISTRY[selectedTemplateId ?? 'karlsson']?.fullComponent || TEMPLATE_REGISTRY.karlsson.fullComponent;

  return (
    <div className={`overflow-auto flex justify-center bg-gray-100 ${className}`} style={{ height }}>
      <div id="resume-preview-root" className="bg-white shadow-lg m-4 transform scale-90 origin-top">
        <SelectedTemplate data={profile} isPreview={false} />
      </div>
    </div>
  );
};

export default ResumePDFPreview;
