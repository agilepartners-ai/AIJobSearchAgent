/**
 * Per-account vector store.
 *
 * One Firestore document per source (a résumé or a job description) holding
 * all of its chunks and their int8 vectors:
 *
 *   users/{uid}/ragResumes/{sourceId}
 *   users/{uid}/ragJobs/{sourceId}
 *
 * Everything is namespaced under the user, so an account can only ever
 * retrieve its own material — there is no shared index to leak across users.
 * One document per *source* (not per chunk) keeps a retrieval to a handful of
 * reads instead of hundreds. The scoring is done in memory: an account holds
 * tens of chunks, where a brute-force scan is faster and cheaper than an index.
 *
 * `VectorStore` is the seam. If accounts ever hold thousands of chunks, swap
 * in Firestore vector search or pgvector behind the same interface.
 */
import { getFirestore } from '../firebase/admin';

export type SourceKind = 'resume' | 'job';

export interface StoredChunk {
  /** The text. */
  t: string;
  /** Int8 vector, base64. */
  v: string;
  /** Dequantisation scale. */
  s: number;
}

export interface KnowledgeSource {
  id: string;
  kind: SourceKind;
  label: string;
  model: string;
  createdAt: number;
  chunks: StoredChunk[];
}

export interface VectorStore {
  getSource(uid: string, kind: SourceKind, id: string): Promise<KnowledgeSource | null>;
  putSource(uid: string, source: KnowledgeSource): Promise<void>;
  /** Most recent first. */
  listSources(uid: string, kind: SourceKind, limit: number): Promise<KnowledgeSource[]>;
  /** Delete everything older than the newest `keep`. */
  prune(uid: string, kind: SourceKind, keep: number): Promise<void>;
}

const collectionFor = (kind: SourceKind) => (kind === 'resume' ? 'ragResumes' : 'ragJobs');

const col = (uid: string, kind: SourceKind) => getFirestore().collection('users').doc(uid).collection(collectionFor(kind));

export const firestoreStore: VectorStore = {
  async getSource(uid, kind, id) {
    const snap = await col(uid, kind).doc(id).get();
    return snap.exists ? ({ id, ...(snap.data() as Omit<KnowledgeSource, 'id'>) } as KnowledgeSource) : null;
  },

  async putSource(uid, source) {
    const { id, ...data } = source;
    await col(uid, source.kind).doc(id).set(data);
  },

  async listSources(uid, kind, limit) {
    const snap = await col(uid, kind).orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<KnowledgeSource, 'id'>) }) as KnowledgeSource);
  },

  async prune(uid, kind, keep) {
    // Field-masked (ids only) so old sources are deleted without downloading their vectors.
    const stale = await col(uid, kind).orderBy('createdAt', 'desc').offset(keep).select().get();
    await Promise.all(stale.docs.map((d) => d.ref.delete()));
  },
};
