/**
 * Build a Resume Studio document from a generation result: the résumé body
 * becomes editable sections, and the analysis and cover letter ride along so
 * the Studio can show them next to the résumé they were written for.
 *
 * Shared by the server (which saves the document) and the client, so it takes
 * a plain input shape rather than either side's response type.
 */
import type { ResumeDocument } from '../schema';
import { resumeFromMacroBody } from './fromMacros';

export interface GeneratedInput {
  resumeTex: string;
  coverLetterTex: string;
  analysis: {
    match_score: number;
    strengths?: string[];
    gaps?: string[];
    suggestions?: string[];
    present_keywords?: string[];
    missing_keywords?: string[];
  };
  /** Empty when Storage was unavailable; the Studio then compiles on demand. */
  coverLetterUrl?: string;
  coverLetterPath?: string;
}

export function resumeFromGenerated(
  documents: GeneratedInput,
  job: { title: string; company: string; jobApplicationId?: string | null },
): ResumeDocument {
  const resume = resumeFromMacroBody(documents.resumeTex, {
    title: `${job.title} – ${job.company}`.slice(0, 120),
    jobTitle: job.title,
  });
  resume.jobApplicationId = job.jobApplicationId ?? null;
  resume.ai = {
    jobTitle: job.title,
    company: job.company,
    analysis: {
      match_score: documents.analysis.match_score,
      strengths: documents.analysis.strengths ?? [],
      gaps: documents.analysis.gaps ?? [],
      suggestions: documents.analysis.suggestions ?? [],
      present_keywords: documents.analysis.present_keywords ?? [],
      missing_keywords: documents.analysis.missing_keywords ?? [],
    },
    coverLetter: {
      tex: documents.coverLetterTex,
      url: documents.coverLetterUrl ?? '',
      path: documents.coverLetterPath ?? '',
    },
  };
  return resume;
}
