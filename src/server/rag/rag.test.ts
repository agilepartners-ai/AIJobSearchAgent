import { describe, expect, it } from 'vitest';
import { condenseJobDescription } from '../ai/condense';
import { chunkText } from './chunker';
import { compressResume, prepareContext, type RagDeps, type RagTuning } from './context';
import type { KnowledgeSource, SourceKind, VectorStore } from './store';
import { cosine, dequantise, normalise, quantise } from './vector';

// ---------------------------------------------------------------------------
// chunker
// ---------------------------------------------------------------------------
describe('chunkText', () => {
  it('returns nothing for empty input', () => {
    expect(chunkText('  \n\n ')).toEqual([]);
  });

  it('splits at section headings even when the PDF has no blank lines', () => {
    const text = [
      'Jane Doe',
      'jane@example.com',
      'EXPERIENCE',
      'Staff Engineer at Acme, led a migration of 200 services.',
      'EDUCATION',
      'BS Computer Science, State University.',
    ].join('\n');
    const chunks = chunkText(text, { minChars: 10, maxChars: 200 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.some((c) => c.startsWith('EXPERIENCE') && c.includes('Acme'))).toBe(true);
    expect(chunks.some((c) => c.startsWith('EDUCATION') && c.includes('State University'))).toBe(true);
    // The first chunk is the header, which retrieval always keeps.
    expect(chunks[0]).toContain('Jane Doe');
  });

  it('never exceeds the size limit and never drops text', () => {
    const long = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} about a project.`).join(' ');
    const chunks = chunkText(long, { maxChars: 300 });
    expect(chunks.every((c) => c.length <= 300 * 1.3)).toBe(true);
    for (let i = 0; i < 60; i += 1) expect(chunks.join(' ')).toContain(`Sentence number ${i} `);
  });

  it('cuts an unbroken run rather than losing its tail', () => {
    const chunks = chunkText('x'.repeat(2500), { maxChars: 900 });
    expect(chunks.join('').length).toBe(2500);
  });
});

// ---------------------------------------------------------------------------
// vectors
// ---------------------------------------------------------------------------
describe('vector helpers', () => {
  it('survives int8 quantisation with negligible loss', () => {
    const v = normalise(Array.from({ length: 512 }, (_, i) => Math.sin(i) * (i % 7)));
    const q = quantise(v);
    expect(cosine(v, dequantise(q.b64, q.scale))).toBeGreaterThan(0.999);
    // ~4x smaller than JSON floats.
    expect(q.b64.length).toBeLessThan(JSON.stringify(v).length / 3);
  });

  it('gives cosine 0 for mismatched or empty vectors', () => {
    expect(cosine([1, 2], [1])).toBe(0);
    expect(cosine([], [])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// job description trimming
// ---------------------------------------------------------------------------
describe('condenseJobDescription', () => {
  const jd = [
    'We need a Senior React engineer with 5+ years of TypeScript.',
    'Requirements: React, Next.js, GraphQL, testing with Jest.',
    'Acme is an equal opportunity employer and does not discriminate on the basis of race.',
    'Apply now',
    'Nice to have: Kubernetes.',
  ].join('\n\n');

  it('drops boilerplate and page chrome but keeps every requirement', () => {
    const out = condenseJobDescription(jd);
    expect(out).toContain('Senior React engineer');
    expect(out).toContain('GraphQL');
    expect(out).toContain('Kubernetes');
    expect(out).not.toMatch(/equal opportunity/i);
    expect(out).not.toMatch(/^Apply now$/m);
  });

  it('keeps a long paragraph that merely mentions a keyword', () => {
    const real = `Responsibilities include reasonable accommodations for on-call scheduling. ${'Own the checkout service end to end. '.repeat(40)}`;
    expect(condenseJobDescription(real)).toContain('checkout service');
  });

  it('respects the length cap', () => {
    const big = Array.from({ length: 80 }, (_, i) => `Requirement ${i}: ${'detail '.repeat(30)}`).join('\n\n');
    expect(condenseJobDescription(big, 2_000).length).toBeLessThanOrEqual(2_300);
  });
});

// ---------------------------------------------------------------------------
// retrieval, with a fake embedder and store
// ---------------------------------------------------------------------------
const DIM = 64;
/** Bag-of-words hashing: shared vocabulary means similar text, no network needed. */
const fakeEmbed = async (texts: string[]): Promise<number[][]> =>
  texts.map((text) => {
    const v = new Array<number>(DIM).fill(0);
    for (const word of text.toLowerCase().match(/[a-z]{3,}/g) ?? []) {
      let h = 0;
      for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) % DIM;
      v[h] += 1;
    }
    return normalise(v);
  });

function memoryStore(): VectorStore & { writes: number } {
  const data = new Map<string, KnowledgeSource>();
  const key = (uid: string, kind: SourceKind, id: string) => `${uid}/${kind}/${id}`;
  const store = {
    writes: 0,
    async getSource(uid: string, kind: SourceKind, id: string) {
      return data.get(key(uid, kind, id)) ?? null;
    },
    async putSource(uid: string, source: KnowledgeSource) {
      store.writes += 1;
      data.set(key(uid, source.kind, source.id), source);
    },
    async listSources(uid: string, kind: SourceKind, limit: number) {
      return Array.from(data.entries())
        .filter(([k]) => k.startsWith(`${uid}/${kind}/`))
        .map(([, v]) => v)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    },
    async prune() {},
  };
  return store;
}

const tuning: RagTuning = {
  compressAboveChars: 700,
  compressToChars: 500,
  supplementChunks: 3,
  minScore: 0.2,
  duplicateScore: 0.9,
  supplementMaxChars: 1_000,
  keepResumes: 20,
  keepJobs: 40,
  timeoutMs: 2_000,
};

const deps = (over: Partial<RagDeps> = {}): { deps: RagDeps; store: ReturnType<typeof memoryStore>; embedCalls: number[] } => {
  const store = memoryStore();
  const embedCalls: number[] = [];
  return {
    store,
    embedCalls,
    deps: {
      enabled: () => true,
      embed: async (texts) => {
        embedCalls.push(texts.length);
        return fakeEmbed(texts);
      },
      store,
      model: () => 'fake-model',
      tuning: () => tuning,
      ...over,
    },
  };
};

const JOB = 'Senior React engineer. Requirements: React, TypeScript, GraphQL and Jest testing.';
const RESUME = ['Jane Doe', 'jane@example.com', '', 'EXPERIENCE', 'Built React and TypeScript dashboards with GraphQL.', '', 'EDUCATION', 'BS Computer Science.'].join('\n');

describe('prepareContext', () => {
  it('stands down to the plain résumé when RAG is not configured', async () => {
    const { deps: d, embedCalls } = deps({ enabled: () => false });
    const out = await prepareContext({ uid: 'u1', resumeText: RESUME, jobDescription: JOB }, d);
    expect(out.stats.mode).toBe('plain');
    expect(out.resumeText).toBe(RESUME);
    expect(embedCalls).toHaveLength(0);
  });

  it('falls back to the plain résumé when embedding fails, instead of failing the generation', async () => {
    const { deps: d } = deps({ embed: async () => { throw new Error('NVIDIA down'); } });
    const out = await prepareContext({ uid: 'u1', resumeText: RESUME, jobDescription: JOB }, d);
    expect(out.stats.mode).toBe('plain');
    expect(out.stats.reason).toMatch(/NVIDIA down/);
    expect(out.resumeText).toBe(RESUME);
  });

  it('falls back when retrieval is too slow', async () => {
    const { deps: d } = deps({
      embed: () => new Promise(() => undefined),
      tuning: () => ({ ...tuning, timeoutMs: 50 }),
    });
    const out = await prepareContext({ uid: 'u1', resumeText: RESUME, jobDescription: JOB }, d);
    expect(out.stats.mode).toBe('plain');
  });

  it('embeds new text once and reuses it the next time', async () => {
    const { deps: d, embedCalls } = deps();
    const first = await prepareContext({ uid: 'u1', resumeText: RESUME, jobDescription: JOB }, d);
    expect(first.stats.embeddedChunks).toBeGreaterThan(0);
    const callsAfterFirst = embedCalls.length;

    const second = await prepareContext({ uid: 'u1', resumeText: RESUME, jobDescription: JOB }, d);
    expect(second.stats.embeddedChunks).toBe(0);
    expect(second.stats.reusedSources).toBe(2);
    // Only the job-description query is embedded again.
    expect(embedCalls.length - callsAfterFirst).toBe(1);
  });

  it('compresses a long résumé to the chunks relevant to the job, keeping the header', async () => {
    const filler = Array.from({ length: 8 }, (_, i) => `Hobby ${i}: gardening, pottery and baking sourdough loaves every weekend for friends.`).join('\n\n');
    const long = `Jane Doe\njane@example.com\n\nEXPERIENCE\nBuilt React and TypeScript dashboards with GraphQL and Jest.\n\n${filler}`;
    const { deps: d } = deps();
    const out = await prepareContext({ uid: 'u1', resumeText: long, jobDescription: JOB }, d);
    expect(out.stats.sentResumeChars).toBeLessThan(long.length);
    expect(out.resumeText).toContain('Jane Doe');
    expect(out.resumeText).toContain('GraphQL');
  });

  it('brings back relevant facts from the account’s other résumés, without repeating what is already there', async () => {
    const { deps: d } = deps();
    const older = ['Jane Doe', '', 'PROJECTS', 'Shipped a GraphQL gateway in TypeScript serving React clients.', '', 'EXPERIENCE', 'Built React and TypeScript dashboards with GraphQL.'].join('\n');
    await prepareContext({ uid: 'u1', resumeText: older, jobDescription: 'Other job about React.' }, d);

    const out = await prepareContext({ uid: 'u1', resumeText: RESUME, jobDescription: JOB }, d);
    expect(out.supplement).toContain('GraphQL gateway');
    // The line the current résumé already has must not come back as "new".
    expect(out.supplement).not.toContain('Built React and TypeScript dashboards');
  });

  it('never surfaces another account’s résumé', async () => {
    const { deps: d } = deps();
    const secret = ['Mallory', '', 'PROJECTS', 'Secret React TypeScript GraphQL Jest project for another person.'].join('\n');
    await prepareContext({ uid: 'other-user', resumeText: secret, jobDescription: JOB }, d);

    const out = await prepareContext({ uid: 'u1', resumeText: RESUME, jobDescription: JOB }, d);
    expect(out.supplement).not.toContain('Secret');
  });
});

describe('compressResume', () => {
  it('always keeps the first chunk and preserves original order', () => {
    const chunks = ['HEADER', 'low', 'HIGH', 'mid'];
    const out = compressResume(chunks, [0, 0.1, 0.9, 0.5], 20);
    expect(out.startsWith('HEADER')).toBe(true);
    expect(out.indexOf('HIGH')).toBeGreaterThan(out.indexOf('HEADER'));
  });
});
