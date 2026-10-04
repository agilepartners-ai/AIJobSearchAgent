/**
 * Client-side persistence for résumé documents, over /api/resumes.
 *
 * One row per résumé in Postgres, holding the ResumeDocument exactly as the
 * schema defines it, so the editor, the preview and the LaTeX serializer all read
 * the same shape with no translation layer. The `uid` arguments are kept so call
 * sites did not change; the server scopes everything to the signed-in user.
 */
import { authedFetch } from '../lib/api/authedFetch';
import { createResume, createSampleResume } from '../lib/resume/defaults';
import { newId } from '../lib/resume/ids';
import { healResume } from '../lib/resume/import/coerce';
import type { ResumeDocument } from '../lib/resume/schema';

const isNotFound = (error: unknown) => (error as { status?: number }).status === 404;

export async function listResumes(_uid: string): Promise<ResumeDocument[]> {
  const { resumes } = await authedFetch<{ resumes: unknown[] }>('/api/resumes');
  const out: ResumeDocument[] = [];
  for (const raw of resumes) {
    // Repaired if it does not validate as saved. A document is only skipped
    // when it cannot be a résumé at all, and that is logged, never silent.
    const healed = healResume(raw);
    if (healed) out.push(healed);
    else console.warn('[resumes] Skipping unreadable document', (raw as { id?: string } | null)?.id);
  }
  return out;
}

export async function getResume(_uid: string, id: string): Promise<ResumeDocument | null> {
  try {
    const raw = await authedFetch<unknown>(`/api/resumes/${encodeURIComponent(id)}`);
    const healed = healResume(raw);
    if (!healed) console.warn('[resumes] Document is unreadable', id);
    return healed;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** The résumé a generation produced, found by the request id the browser sent. */
export async function findByGenerationId(_uid: string, generationId: string): Promise<ResumeDocument | null> {
  const { resume } = await authedFetch<{ resume: unknown | null }>(`/api/resumes?generationId=${encodeURIComponent(generationId)}`);
  return resume ? healResume(resume) : null;
}

export async function saveResume(_uid: string, document: ResumeDocument): Promise<void> {
  const next = { ...document, updatedAt: new Date().toISOString() };
  await authedFetch(`/api/resumes/${encodeURIComponent(document.id)}`, { method: 'PUT', body: JSON.stringify(next) });
}

/** A copy under a new id: one base resume, one tailored copy per job. */
export async function duplicateResume(uid: string, source: ResumeDocument): Promise<ResumeDocument> {
  const now = new Date().toISOString();
  const copy: ResumeDocument = {
    ...(JSON.parse(JSON.stringify(source)) as ResumeDocument),
    id: newId(20),
    title: `${source.title} (copy)`.slice(0, 120),
    basedOnId: source.id,
    createdAt: now,
    updatedAt: now,
  };
  await saveResume(uid, copy);
  return copy;
}

export async function deleteResume(_uid: string, id: string): Promise<void> {
  await authedFetch(`/api/resumes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Start a new resume in a template. `withSample` fills it with the sample
 * content so the first thing the user sees is a finished-looking page.
 */
export async function createFromPreset(uid: string, presetId: string, withSample = true): Promise<ResumeDocument> {
  const base = withSample ? createSampleResume(presetId) : createResume({ presetId });
  const document: ResumeDocument = {
    ...base,
    id: newId(20),
    title: withSample ? 'My resume' : 'Untitled resume',
  };
  await saveResume(uid, document);
  return document;
}
