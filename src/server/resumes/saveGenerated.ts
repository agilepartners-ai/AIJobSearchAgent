/**
 * Save a generation as a Resume Studio document, from the server.
 *
 * "Generation finished" and "the résumé exists" are one step: the response
 * carries the résumé's id and the client just opens it. (It used to be a
 * client-side write after the response arrived, whose failure was swallowed and
 * left the user on a results screen with no explanation.)
 */
import { resumeFromGenerated, type GeneratedInput } from '../../lib/resume/import/fromGenerated';
import { coerceResume } from '../../lib/resume/import/coerce';
import { ResumeDocumentSchema } from '../../lib/resume/schema';
import * as resumes from '../db/resumesRepo';

export async function saveGeneratedResume(
  userId: string,
  documents: GeneratedInput,
  job: { title: string; company: string; jobApplicationId?: string | null; generationId?: string },
): Promise<string> {
  const resume = resumeFromGenerated(documents, job);
  if (job.generationId) resume.generationId = job.generationId;

  // Never write something the Studio cannot read back.
  const parsed = ResumeDocumentSchema.safeParse(coerceResume(resume));
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 6).map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Generated résumé failed validation: ${issues.join('; ')}`);
  }

  // A JSON round trip drops `undefined` so every stored value is plain JSON.
  const clean = JSON.parse(JSON.stringify(parsed.data)) as Record<string, unknown>;
  await resumes.saveResume(userId, resume.id, clean);
  return resume.id;
}

/**
 * The résumé an earlier attempt of this same generation already produced, if
 * any. A retry, a double submit, or a page reload that re-sends the request
 * must not run (and be charged for) the model twice.
 */
export async function findGeneratedResume(userId: string, generationId: string): Promise<{ id: string; ai: unknown } | null> {
  const doc = await resumes.findByGenerationId(userId, generationId);
  return doc ? { id: String(doc.id), ai: doc.ai ?? null } : null;
}

/** Attach the PDF links once they exist. The résumé is already saved by then. */
export const attachCoverLetterPdf = resumes.attachCoverLetterPdf;
