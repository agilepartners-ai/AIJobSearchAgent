/**
 * Client-side persistence for resume documents.
 *
 * One Firestore document per resume at users/{uid}/resumes/{id}, holding the
 * ResumeDocument exactly as the schema defines it, so the editor, the preview
 * and the LaTeX serializer all read the same shape with no translation layer.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createResume, createSampleResume } from '../lib/resume/defaults';
import { newId } from '../lib/resume/ids';
import { healResume } from '../lib/resume/import/coerce';
import type { ResumeDocument } from '../lib/resume/schema';

const resumesPath = (uid: string) => `users/${uid}/resumes`;

export async function listResumes(uid: string): Promise<ResumeDocument[]> {
  const snap = await getDocs(query(collection(db, resumesPath(uid)), orderBy('updatedAt', 'desc')));
  const out: ResumeDocument[] = [];
  for (const d of snap.docs) {
    // Repaired if it does not validate as saved. A document is only skipped
    // when it cannot be a résumé at all, and that is logged, never silent.
    const healed = healResume(d.data());
    if (healed) out.push(healed);
    else console.warn('[resumes] Skipping unreadable document', d.id);
  }
  return out;
}

export async function getResume(uid: string, id: string): Promise<ResumeDocument | null> {
  const snap = await getDoc(doc(db, `${resumesPath(uid)}/${id}`));
  if (!snap.exists()) return null;
  const healed = healResume(snap.data());
  if (!healed) console.warn('[resumes] Document is unreadable', id);
  return healed;
}

/** The résumé a generation produced, found by the request id the browser sent. */
export async function findByGenerationId(uid: string, generationId: string): Promise<ResumeDocument | null> {
  const snap = await getDocs(query(collection(db, resumesPath(uid)), where('generationId', '==', generationId), limit(1)));
  return snap.empty ? null : healResume(snap.docs[0].data());
}

export async function saveResume(uid: string, document: ResumeDocument): Promise<void> {
  const next = { ...document, updatedAt: new Date().toISOString() };
  // Firestore rejects `undefined` anywhere in a document. A JSON round trip
  // drops it, so no caller can crash a save by leaving an optional field unset.
  const clean = JSON.parse(JSON.stringify(next)) as ResumeDocument;
  await setDoc(doc(db, `${resumesPath(uid)}/${document.id}`), clean);
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

export async function deleteResume(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `${resumesPath(uid)}/${id}`));
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
