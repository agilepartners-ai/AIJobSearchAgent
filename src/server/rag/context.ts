/**
 * Retrieval for one generation.
 *
 * Every résumé and job description an account submits is embedded once and
 * kept in that account's own store. For each new generation this does three
 * things with it:
 *
 *  1. Ingest  – embed the résumé and the job (skipped when the identical text
 *               was embedded before, so re-tailoring costs no embedding calls).
 *  2. Compress – if the résumé is long, send only its chunks most relevant to
 *               this job (plus the header), instead of all of it. This is the
 *               token saving.
 *  3. Supplement – surface facts from the account's *other* saved résumés that
 *               bear on this job and are not already in the current one, so an
 *               older project or skill that the current file dropped can come
 *               back. They are the candidate's own facts, so the prompt's
 *               no-invention rule still holds.
 *
 * Retrieval is an enhancement, never a dependency: with no NVIDIA key, an
 * outage, or a timeout, this returns the résumé and job untouched and
 * generation carries on exactly as it would without RAG.
 */
import { createHash } from 'crypto';
import { condenseJobDescription } from '../ai/condense';
import { chunkText } from './chunker';
import { embedTexts, embeddingModel, isEmbeddingConfigured, type InputType } from './embedder';
import { firestoreStore, type KnowledgeSource, type VectorStore } from './store';
import { cosine, dequantise, quantise } from './vector';

export interface RagTuning {
  /** Résumés longer than this are compressed to their relevant chunks. */
  compressAboveChars: number;
  /** Size the compressed résumé is filled up to. */
  compressToChars: number;
  supplementChunks: number;
  /** Minimum cosine similarity to the job for a supplemental fact. */
  minScore: number;
  /** A chunk this similar to one already in the résumé is a duplicate. */
  duplicateScore: number;
  supplementMaxChars: number;
  keepResumes: number;
  keepJobs: number;
  timeoutMs: number;
}

const num = (name: string, fallback: number): number => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/**
 * Thresholds come from the environment because they depend on the embedding
 * model's score distribution and should be tuned against real résumés, not
 * hard-wired. The defaults are conservative starting points.
 */
export function tuningFromEnv(): RagTuning {
  return {
    compressAboveChars: num('RAG_COMPRESS_ABOVE_CHARS', 7_000),
    compressToChars: num('RAG_COMPRESS_TO_CHARS', 5_000),
    supplementChunks: num('RAG_SUPPLEMENT_CHUNKS', 4),
    minScore: num('RAG_MIN_SCORE', 0.4),
    duplicateScore: num('RAG_DUPLICATE_SCORE', 0.9),
    supplementMaxChars: num('RAG_SUPPLEMENT_MAX_CHARS', 1_600),
    keepResumes: num('RAG_KEEP_RESUMES', 20),
    keepJobs: num('RAG_KEEP_JOBS', 40),
    timeoutMs: num('RAG_TIMEOUT_MS', 12_000),
  };
}

export interface RagDeps {
  enabled: () => boolean;
  embed: (texts: string[], type: InputType) => Promise<number[][]>;
  store: VectorStore;
  model: () => string;
  tuning: () => RagTuning;
}

const defaultDeps: RagDeps = {
  enabled: isEmbeddingConfigured,
  embed: embedTexts,
  store: firestoreStore,
  model: embeddingModel,
  tuning: tuningFromEnv,
};

export interface PreparedContext {
  /** Résumé text to send: whole, or compressed to what matters for this job. */
  resumeText: string;
  jobDescription: string;
  /** Extra facts from the account's other résumés; empty when none apply. */
  supplement: string;
  stats: {
    mode: 'plain' | 'rag';
    resumeChars: number;
    sentResumeChars: number;
    jobChars: number;
    embeddedChunks: number;
    reusedSources: number;
    supplementChunks: number;
    ms: number;
    /** Why RAG stood down, when it did. */
    reason?: string;
  };
}

const digest = (text: string) => createHash('sha1').update(text.replace(/\s+/g, ' ').trim().toLowerCase()).digest('hex').slice(0, 20);

/** Fetch a source's vectors, embedding and saving them first if they are new. */
async function ingest(
  deps: RagDeps,
  uid: string,
  kind: 'resume' | 'job',
  text: string,
  label: string,
): Promise<{ source: KnowledgeSource; vectors: number[][]; embedded: number; reused: boolean }> {
  const id = `${kind === 'resume' ? 'r' : 'j'}_${digest(text)}`;
  const existing = await deps.store.getSource(uid, kind, id);
  if (existing && existing.model === deps.model()) {
    return { source: existing, vectors: existing.chunks.map((c) => dequantise(c.v, c.s)), embedded: 0, reused: true };
  }

  const texts = chunkText(text).slice(0, 60);
  const vectors = await deps.embed(texts, 'passage');
  const source: KnowledgeSource = {
    id,
    kind,
    label: label.slice(0, 120),
    model: deps.model(),
    createdAt: Date.now(),
    chunks: texts.map((t, i) => {
      const q = quantise(vectors[i]);
      return { t, v: q.b64, s: q.scale };
    }),
  };
  await deps.store.putSource(uid, source);
  return { source, vectors, embedded: texts.length, reused: false };
}

/** Keep the header plus the chunks most relevant to the job, in original order. */
export function compressResume(chunks: string[], scores: number[], budget: number): string {
  const chosen = new Set<number>([0]);
  let used = chunks[0]?.length ?? 0;
  const ranked = scores.map((s, i) => [s, i] as const).filter(([, i]) => i !== 0).sort((a, b) => b[0] - a[0]);
  for (const [, i] of ranked) {
    if (used + chunks[i].length + 2 > budget) continue;
    chosen.add(i);
    used += chunks[i].length + 2;
  }
  return Array.from(chosen).sort((a, b) => a - b).map((i) => chunks[i]).join('\n\n');
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * The lines of a chunk that the current résumé does not already say.
 *
 * Chunk-level similarity is not enough: a short résumé is one chunk, so an
 * older version of it looks "different" while repeating almost every line.
 * Checking line by line removes the repeats and keeps only what is new.
 */
export function novelLines(chunk: string, currentText: string): string {
  const current = squash(currentText);
  return chunk
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 3 && !current.includes(squash(line)))
    .join('\n');
}

/** Facts from other saved résumés that fit this job and are not already covered. */
export function pickSupplement(
  others: KnowledgeSource[],
  query: number[],
  currentVectors: number[][],
  tuning: RagTuning,
  currentText = '',
): string[] {
  const scored: { text: string; score: number }[] = [];
  for (const source of others) {
    for (const chunk of source.chunks) {
      const vector = dequantise(chunk.v, chunk.s);
      const score = cosine(query, vector);
      if (score < tuning.minScore) continue;
      if (currentVectors.some((v) => cosine(v, vector) >= tuning.duplicateScore)) continue;
      const text = novelLines(chunk.t, currentText);
      // Nothing left once the repeats are gone: there is no new fact to offer.
      if (text.length < 25) continue;
      scored.push({ text, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  const out: string[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const { text } of scored) {
    const key = text.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) continue;
    if (out.length >= tuning.supplementChunks || total + text.length > tuning.supplementMaxChars) break;
    seen.add(key);
    out.push(text);
    total += text.length;
  }
  return out;
}

export async function prepareContext(
  input: { uid: string; resumeText: string; jobDescription: string; label?: string },
  deps: RagDeps = defaultDeps,
): Promise<PreparedContext> {
  const started = Date.now();
  const jobDescription = condenseJobDescription(input.jobDescription);
  const plain = (reason: string): PreparedContext => ({
    resumeText: input.resumeText,
    jobDescription,
    supplement: '',
    stats: {
      mode: 'plain',
      resumeChars: input.resumeText.length,
      sentResumeChars: input.resumeText.length,
      jobChars: jobDescription.length,
      embeddedChunks: 0,
      reusedSources: 0,
      supplementChunks: 0,
      ms: Date.now() - started,
      reason,
    },
  });

  if (!deps.enabled()) return plain('not configured');
  if (!jobDescription.trim()) return plain('no job description');

  const tuning = deps.tuning();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`retrieval timed out after ${tuning.timeoutMs}ms`)), tuning.timeoutMs);
  });

  const work = async (): Promise<PreparedContext> => {
    const label = input.label || 'Resume';

    const [resume, job, queryVectors] = await Promise.all([
      ingest(deps, input.uid, 'resume', input.resumeText, label),
      // The job is stored for the account's history; a failure here must not
      // cost the résumé side its retrieval.
      ingest(deps, input.uid, 'job', jobDescription, label).catch(() => null),
      deps.embed([jobDescription.slice(0, 2_000)], 'query'),
    ]);

    const query = queryVectors[0];
    const resumeChunks = resume.source.chunks.map((c) => c.t);
    const scores = resume.vectors.map((v) => cosine(query, v));

    const compress = input.resumeText.length > tuning.compressAboveChars && resumeChunks.length > 1;
    const resumeText = compress ? compressResume(resumeChunks, scores, tuning.compressToChars) : input.resumeText;

    const others = (await deps.store.listSources(input.uid, 'resume', tuning.keepResumes)).filter((s) => s.id !== resume.source.id);
    const supplement = pickSupplement(others, query, resume.vectors, tuning, input.resumeText);

    // Housekeeping is best effort and off the critical path.
    void Promise.all([
      deps.store.prune(input.uid, 'resume', tuning.keepResumes),
      deps.store.prune(input.uid, 'job', tuning.keepJobs),
    ]).catch(() => undefined);

    return {
      resumeText,
      jobDescription,
      supplement: supplement.map((t) => `- ${t.replace(/\n+/g, ' ')}`).join('\n'),
      stats: {
        mode: 'rag',
        resumeChars: input.resumeText.length,
        sentResumeChars: resumeText.length,
        jobChars: jobDescription.length,
        embeddedChunks: resume.embedded + (job?.embedded ?? 0),
        reusedSources: Number(resume.reused) + Number(job?.reused ?? 0),
        supplementChunks: supplement.length,
        ms: Date.now() - started,
      },
    };
  };

  try {
    return await Promise.race([work(), timeout]);
  } catch (error) {
    console.warn('[rag] Falling back to plain generation:', error instanceof Error ? error.message : error);
    return plain(error instanceof Error ? error.message : 'unknown error');
  } finally {
    clearTimeout(timer);
  }
}
