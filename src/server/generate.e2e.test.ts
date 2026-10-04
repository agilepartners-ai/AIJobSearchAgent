/**
 * Live end-to-end test of POST /api/documents/generate, gated on E2E_GENERATE=1
 * (kept out of src/pages: every file there becomes a public route in production)
 * because it spends real Gemini and Texapi quota and writes to the real
 * the database configured in .env.local.
 *
 *   E2E_GENERATE=1 pnpm vitest run generate.e2e
 *
 * Only the ID-token check is stubbed. Everything it writes lives under a
 * throwaway uid and is deleted afterwards, so no real account is touched.
 */
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

// A fixed UUID reserved for this probe; every row it creates is deleted afterwards.
const TEST_UID = '00000000-0000-4000-8000-00000e2e0be1';
const REQUEST_ID = 'e2eRequest0001';

vi.mock('./auth/verify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./auth/verify')>();
  return { ...actual, verifyAccessToken: async () => ({ userId: TEST_UID, email: null }) };
});

// eslint-disable-next-line import/first
import handler from '../pages/api/documents/generate';
// eslint-disable-next-line import/first
import { closePool, query } from './db/pool';
// eslint-disable-next-line import/first
import { ResumeDocumentSchema } from '../lib/resume/schema';
// eslint-disable-next-line import/first
import { healResume } from '../lib/resume/import/coerce';

const RESUME = `Priya Raman
priya.raman@example.com | +91 98765 43210 | Bengaluru, India

SUMMARY
Frontend engineer with 4 years building React and TypeScript applications for fintech products.

EXPERIENCE
Frontend Engineer, Finlytics, Bengaluru - Jun 2022 to Present
- Rebuilt the onboarding flow in React and TypeScript, cutting drop-off by 18%.
- Introduced Jest and React Testing Library, raising coverage from 22% to 71%.
Junior Developer, Webcraft, Pune - Jul 2020 to May 2022
- Built REST integrations in Node.js and Express for 12 client sites.

EDUCATION
B.Tech Computer Science, VIT Vellore, 2016 - 2020

SKILLS
React, TypeScript, Next.js, Node.js, GraphQL, Jest, Tailwind CSS, Git`;

const JOB = 'Senior React Developer at Acme Payments. 3+ years React and TypeScript, GraphQL, automated testing, performance work.';

function fakeResponse() {
  const out: { status: number; body: any } = { status: 0, body: undefined };
  const res = {
    setHeader: () => res,
    status: (code: number) => {
      out.status = code;
      return res;
    },
    json: (body: unknown) => {
      out.body = body;
      return res;
    },
    end: () => res,
  };
  return { res: res as unknown as NextApiResponse, out };
}

const cleanup = async () => {
  for (const table of ['resumes', 'usage_daily', 'rag_sources', 'documents', 'job_applications']) {
    await query(`DELETE FROM app.${table} WHERE user_id = $1`, [TEST_UID]);
  }
};

describe.runIf(process.env.E2E_GENERATE === '1')('POST /api/documents/generate (live)', () => {
  afterAll(async () => {
    await cleanup().catch(() => undefined);
    await closePool();
  });

  it('saves a valid Studio résumé on the server and returns its id', async () => {
    const { res, out } = fakeResponse();
    const req = {
      method: 'POST',
      body: { idToken: 'stubbed', requestId: REQUEST_ID, resumeText: RESUME, jobDescription: JOB, position: 'Senior React Developer', company_name: 'Acme Payments' },
    } as unknown as NextApiRequest;

    // Capture the request-scoped log so the exact stage sequence can be asserted.
    const captured: string[] = [];
    const capture = (...args: unknown[]) => void captured.push(args.map(String).join(' '));
    const spies = [
      vi.spyOn(console, 'info').mockImplementation(capture),
      vi.spyOn(console, 'warn').mockImplementation(capture),
      vi.spyOn(console, 'error').mockImplementation(capture),
    ];
    await handler(req, res);
    spies.forEach((spy) => spy.mockRestore());
    const pipeline = captured.filter((l) => l.includes(`rid=${REQUEST_ID}`));
    process.stderr.write(`\nE2E PIPELINE LOG\n${pipeline.map((l) => '  ' + l.slice(0, 210)).join('\n')}\n`);
    const steps = pipeline.map((l) => l.match(/ms (\S+)/)?.[1]);
    expect(steps).toEqual([
      'received', 'authenticated', 'slot-acquired', 'quota-reserved', 'rag', 'llm',
      'studio-saved', 'compile', 'storage', 'responding', 'done',
    ]);
    process.stderr.write(`\nE2E status=${out.status} resumeId=${out.body?.resumeId} storageOk=${out.body?.storageOk} pdf=${Boolean(out.body?.resumeUrl)}\n`);

    expect(out.status).toBe(200);
    expect(typeof out.body.resumeId).toBe('string');

    const saved = await query<{ document: unknown }>('SELECT document FROM app.resumes WHERE user_id = $1 AND id = $2', [TEST_UID, out.body.resumeId]);
    expect(saved.rows).toHaveLength(1);

    const parsed = ResumeDocumentSchema.safeParse(saved.rows[0].document);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const resume = parsed.data;
    process.stderr.write(`E2E sections=${resume.sections.map((s) => `${s.title}(${s.entries.length})`).join(' | ')} name=${resume.personal.fullName} match=${resume.ai?.analysis.match_score}\n`);

    expect(resume.personal.fullName).toMatch(/Priya/);
    expect(resume.sections.length).toBeGreaterThanOrEqual(3);
    // No phantom section from the preamble.
    expect(resume.sections.filter((s) => s.type === 'experience')).toHaveLength(1);
    expect(resume.ai?.coverLetter.tex).toContain('clheader');

    // The token ledger recorded the call.
    const readUsage = async () => (await query('SELECT * FROM app.usage_daily WHERE user_id = $1', [TEST_UID])).rows[0];
    const day = await readUsage();
    process.stderr.write(`E2E usage=${JSON.stringify({ calls: day?.llm_calls, prompt: day?.prompt_tokens, out: day?.output_tokens, gens: day?.generations })}\n`);
    expect(day?.llm_calls).toBeGreaterThanOrEqual(1);
    expect(day?.prompt_tokens).toBeGreaterThan(0);
    expect(out.body.requestId).toBe(REQUEST_ID);

    // The résumé is readable by the client-side reader (healResume) as saved.
    expect(healResume(saved.rows[0].document)?.id).toBe(resume.id);
    expect(resume.generationId).toBe(REQUEST_ID);

    // Replaying the SAME request id (a retry, a reload that re-sent it) must return
    // the same résumé: no second model call and no second charge.
    const callsBefore = day?.llm_calls;
    const gensBefore = day?.generations;
    const replay = fakeResponse();
    await handler(req, replay.res);
    process.stderr.write(`E2E replay status=${replay.out.status} reused=${replay.out.body?.reused} resumeId=${replay.out.body?.resumeId}\n`);
    expect(replay.out.status).toBe(200);
    expect(replay.out.body.reused).toBe(true);
    expect(replay.out.body.resumeId).toBe(out.body.resumeId);

    const after = await readUsage();
    expect(after?.llm_calls).toBe(callsBefore);
    expect(after?.generations).toBe(gensBefore);
    const all = await query('SELECT 1 FROM app.resumes WHERE user_id = $1', [TEST_UID]);
    expect(all.rows).toHaveLength(1);
  }, 240_000);
});
