/**
 * Save a generation as a Resume Studio document, from the server.
 *
 * This used to happen in the browser after the response arrived: a client-side
 * Firestore write that depends on security rules for a collection the rules
 * may not cover, and whose failure was swallowed — leaving the user on the old
 * results screen with no explanation. Doing it here, with the Admin SDK, makes
 * "generation finished" and "the résumé exists" one step: the response carries
 * the resume's id, and the client just opens it.
 */
import { resumeFromGenerated, type GeneratedInput } from '../../lib/resume/import/fromGenerated';
import { coerceResume } from '../../lib/resume/import/coerce';
import { ResumeDocumentSchema } from '../../lib/resume/schema';
import { getFirestore } from '../firebase/admin';

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

  // Firestore rejects `undefined` anywhere; a JSON round trip removes it.
  const clean = JSON.parse(JSON.stringify(parsed.data)) as Record<string, unknown>;
  await getFirestore().collection('users').doc(userId).collection('resumes').doc(resume.id).set(clean);
  return resume.id;
}

const resumes = (userId: string) => getFirestore().collection('users').doc(userId).collection('resumes');

/**
 * The résumé an earlier attempt of this same generation already produced, if
 * any. A retry, a double submit, or a page reload that re-sends the request
 * must not run (and be charged for) the model twice.
 */
export async function findGeneratedResume(userId: string, generationId: string): Promise<{ id: string; ai: unknown } | null> {
  const snap = await resumes(userId).where('generationId', '==', generationId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ai: doc.data().ai ?? null };
}

/** Attach the PDF links once they exist. The résumé is already saved by then. */
export async function attachCoverLetterPdf(userId: string, resumeId: string, link: { url: string; path: string }): Promise<void> {
  await resumes(userId).doc(resumeId).update({ 'ai.coverLetter.url': link.url, 'ai.coverLetter.path': link.path });
}
