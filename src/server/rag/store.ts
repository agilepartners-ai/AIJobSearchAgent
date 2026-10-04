/**
 * Per-account vector store.
 *
 * One row per source (a résumé or a job description) in app.rag_sources,
 * holding all of its chunks and their int8 vectors as jsonb.
 *
 * Every query is keyed by user_id, so an account can only ever retrieve its own
 * material: there is no shared index to leak across users. One row per
 * *source* (not per chunk) keeps a retrieval to a handful of reads instead of
 * hundreds. The scoring is done in memory: an account holds tens of chunks,
 * where a brute-force scan is faster and cheaper than an index.
 *
 * `VectorStore` is the seam. If accounts ever hold thousands of chunks, swap
 * in pgvector behind the same interface.
 */
import { query } from '../db/pool';

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

interface Row {
  id: string;
  kind: SourceKind;
  label: string;
  model: string;
  created_ms: number;
  chunks: StoredChunk[];
}

const toSource = (r: Row): KnowledgeSource => ({
  id: r.id,
  kind: r.kind,
  label: r.label,
  model: r.model,
  createdAt: r.created_ms,
  chunks: r.chunks,
});

export const postgresStore: VectorStore = {
  async getSource(uid, kind, id) {
    const { rows } = await query<Row>(
      'SELECT id, kind, label, model, created_ms, chunks FROM app.rag_sources WHERE user_id = $1 AND kind = $2 AND id = $3',
      [uid, kind, id],
    );
    return rows[0] ? toSource(rows[0]) : null;
  },

  async putSource(uid, source) {
    await query(
      `INSERT INTO app.rag_sources (user_id, kind, id, label, model, created_ms, chunks)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (user_id, kind, id) DO UPDATE SET
         label = EXCLUDED.label, model = EXCLUDED.model, created_ms = EXCLUDED.created_ms, chunks = EXCLUDED.chunks`,
      [uid, source.kind, source.id, source.label ?? '', source.model, source.createdAt, JSON.stringify(source.chunks)],
    );
  },

  async listSources(uid, kind, limit) {
    const { rows } = await query<Row>(
      `SELECT id, kind, label, model, created_ms, chunks FROM app.rag_sources
       WHERE user_id = $1 AND kind = $2 ORDER BY created_ms DESC LIMIT $3`,
      [uid, kind, limit],
    );
    return rows.map(toSource);
  },

  async prune(uid, kind, keep) {
    await query(
      `DELETE FROM app.rag_sources WHERE user_id = $1 AND kind = $2 AND id NOT IN (
         SELECT id FROM app.rag_sources WHERE user_id = $1 AND kind = $2 ORDER BY created_ms DESC LIMIT $3)`,
      [uid, kind, keep],
    );
  },
};
