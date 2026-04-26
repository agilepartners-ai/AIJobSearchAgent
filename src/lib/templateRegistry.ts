import React from 'react';
import { ResumeTemplateProps, type TemplateId } from '@/components/resume-templates/types';
export type { TemplateId };
import { KarlssonTemplate } from '@/components/resume-templates/KarlssonTemplate';
import { CampbellTemplate } from '@/components/resume-templates/CampbellTemplate';
import { ElorriagaTemplate } from '@/components/resume-templates/ElorriagaTemplate';
import { BareseTemplate } from '@/components/resume-templates/BareseTemplate';

export interface TemplateMetadata {
  id: TemplateId;
  name: string;
  description: string;
  previewComponent: React.ComponentType<ResumeTemplateProps>;
  fullComponent: React.ComponentType<ResumeTemplateProps>;
  accentColor: string;
  tags: string[];
}

export const TEMPLATE_REGISTRY: Record<TemplateId, TemplateMetadata> = {
  karlsson: {
    id: 'karlsson',
    name: 'Karlsson',
    description: 'Two-Column, Dark Accent Left Panel',
    previewComponent: KarlssonTemplate,
    fullComponent: KarlssonTemplate,
    accentColor: '#1F2937', // dark gray/slate
    tags: ['two-column', 'modern', 'accent-panel'],
  },
  campbell: {
    id: 'campbell',
    name: 'Campbell',
    description: 'Minimal Left-Heavy, Sidebar Contact',
    previewComponent: CampbellTemplate,
    fullComponent: CampbellTemplate,
    accentColor: '#000000',
    tags: ['minimal', 'sidebar', 'clean'],
  },
  elorriaga: {
    id: 'elorriaga',
    name: 'Elorriaga',
    description: 'ATS-Clean, Single Column, Left-Aligned',
    previewComponent: ElorriagaTemplate,
    fullComponent: ElorriagaTemplate,
    accentColor: '#2563EB', // blue
    tags: ['ats-friendly', 'single-column', 'traditional'],
  },
  barese: {
    id: 'barese',
    name: 'Barese',
    description: 'Structured Table, Warm Minimal',
    previewComponent: BareseTemplate,
    fullComponent: BareseTemplate,
    accentColor: '#4B5563',
    tags: ['structured', 'table-layout', 'corporate'],
  },
};
