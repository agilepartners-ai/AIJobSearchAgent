/**
 * Text embeddings from NVIDIA's hosted API (OpenAI-compatible /v1/embeddings).
 *
 * Default model: nvidia/nemotron-3-embed-1b. Override with NVIDIA_EMBED_MODEL.
 * Keys: NVIDIA_API_KEYS (comma separated, rotated by keyPool.ts) or
 * NVIDIA_API_KEY. With no key configured, RAG switches itself off and
 * generation carries on without it.
 *
 * Retrieval models embed questions and passages differently; `input_type`
 * ('query' | 'passage') tells the model which it is looking at. A model that
 * does not accept the field gets the request again without it.
 */
import { getKeyPool, withKey, type AttemptResult } from '../ai/keyPool';
import { normalise } from './vector';

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'nvidia/nemotron-3-embed-1b';
const BATCH_SIZE = 16;
const REQUEST_TIMEOUT_MS = 30_000;

export class EmbeddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

export type InputType = 'query' | 'passage';

export const embeddingModel = (): string => process.env.NVIDIA_EMBED_MODEL || DEFAULT_MODEL;

/** RAG runs only when there is a key for it and it has not been switched off. */
export function isEmbeddingConfigured(): boolean {
  return process.env.RAG_ENABLED !== 'false' && getKeyPool('nvidia').size > 0;
}

async function embedBatch(texts: string[], inputType: InputType): Promise<number[][]> {
  const pool = getKeyPool('nvidia');
  const base = (process.env.NVIDIA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  let sendInputType = true;

  const attempt = async (key: { id: string; secret: string }): Promise<AttemptResult<number[][]>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${base}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.secret}` },
        body: JSON.stringify({
          model: embeddingModel(),
          input: texts,
          ...(sendInputType ? { input_type: inputType } : {}),
          encoding_format: 'float',
          truncate: 'END',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const status = response.status;
        if ((status === 400 || status === 422) && sendInputType && /input_type/i.test(text)) {
          sendInputType = false;
          return { ok: false, kind: 'server', error: new EmbeddingError('Model rejected input_type; retrying without it.') };
        }
        if (status === 429) {
          const wait = Number(response.headers.get('retry-after'));
          return {
            ok: false,
            kind: 'rate_limited',
            retryAfterMs: Number.isFinite(wait) && wait > 0 ? wait * 1_000 : undefined,
            error: new EmbeddingError(`NVIDIA rate limit on key ${key.id}.`),
          };
        }
        if (status === 401 || status === 403) {
          return { ok: false, kind: 'auth', error: new EmbeddingError(`NVIDIA rejected key ${key.id}.`) };
        }
        if (status >= 500) {
          return { ok: false, kind: 'server', error: new EmbeddingError(`NVIDIA returned ${status}.`) };
        }
        return { ok: false, kind: 'fatal', error: new EmbeddingError(`NVIDIA returned ${status}: ${text.slice(0, 200)}`) };
      }

      const json = (await response.json()) as { data?: { index?: number; embedding?: number[] }[] };
      const rows = (json.data ?? []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      if (rows.length !== texts.length || rows.some((r) => !Array.isArray(r.embedding) || !r.embedding.length)) {
        return { ok: false, kind: 'fatal', error: new EmbeddingError('NVIDIA returned an unexpected embeddings payload.') };
      }
      return { ok: true, value: rows.map((r) => normalise(r.embedding as number[])) };
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      return { ok: false, kind: 'server', error: new EmbeddingError(aborted ? 'Embedding request timed out.' : 'Could not reach NVIDIA.') };
    } finally {
      clearTimeout(timer);
    }
  };

  return withKey(pool, attempt, { maxWaitMs: 8_000 });
}

/** Embed any number of texts, in batches. Vectors come back unit-length. */
export async function embedTexts(texts: string[], inputType: InputType): Promise<number[][]> {
  if (!texts.length) return [];
  if (!isEmbeddingConfigured()) throw new EmbeddingError('Embeddings are not configured.');
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    out.push(...(await embedBatch(texts.slice(i, i + BATCH_SIZE), inputType)));
  }
  return out;
}
