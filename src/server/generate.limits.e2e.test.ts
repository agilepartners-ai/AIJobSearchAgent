/**
 * Live test of the per-account limit through the real /api/documents/generate route (opt-in, a few small model calls):
 *   E2E_GENERATE=1 pnpm exec vitest run src/server/generate.limits.e2e.test.ts
 *
 * Proves, end to end: a regular account is stopped at its daily limit with a clear message and is not charged for the
 * refused request, and an admin account is never counted or stopped. The limit is set to 2 here only to keep it cheap;
 * production uses 5.
 */
import { randomUUID } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { afterAll, describe, expect, it, vi } from 'vitest';

const ADMIN_EMAIL = 'owner@example.com';
const USERS: Record<string, { userId: string; email: string; emailVerified: boolean }> = {
  regular: { userId: randomUUID(), email: 'someone@example.com', emailVerified: true },
  admin: { userId: randomUUID(), email: ADMIN_EMAIL, emailVerified: true },
  // Same address as the admin, but the provider has not verified it: must NOT be treated as an admin.
  impostor: { userId: randomUUID(), email: ADMIN_EMAIL, emailVerified: false },
};

vi.hoisted(() => {
  process.env.DAILY_GENERATION_LIMIT = '2';
  process.env.ADMIN_EMAILS = 'owner@example.com';
});

vi.mock('./auth/verify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./auth/verify')>();
  return {
    ...actual,
    verifyAccessToken: async (token: string) => {
      const who = USERS[token];
      if (!who) throw new actual.UnauthenticatedError();
      return who;
    },
  };
});

// eslint-disable-next-line import/first
import handler from '../pages/api/documents/generate';
// eslint-disable-next-line import/first
import { closePool, query } from './db/pool';

const RESUME = `Priya Raman
priya.raman@example.com | +91 98765 43210 | Bengaluru, India

SUMMARY
Frontend engineer with 4 years building React and TypeScript applications for fintech products.

EXPERIENCE
Frontend Engineer, Finlytics, Bengaluru - Jun 2022 to Present
- Rebuilt the onboarding flow in React and TypeScript, cutting drop-off by 18%.
- Introduced Jest and React Testing Library, raising coverage from 22% to 71%.

EDUCATION
B.Tech Computer Science, VIT Vellore, 2016 - 2020

SKILLS
React, TypeScript, Next.js, Node.js, GraphQL, Jest, Tailwind CSS, Git`;

const JOB = 'Senior React Developer at Acme Payments. 3+ years React and TypeScript, GraphQL, automated testing.';

function call(token: string) {
  const out: { status: number; body: any } = { status: 0, body: undefined };
  const res = {
    setHeader: () => res,
    status: (code: number) => ((out.status = code), res),
    json: (body: unknown) => ((out.body = body), res),
    end: () => res,
  };
  const req = {
    method: 'POST',
    headers: {},
    body: { idToken: token, requestId: `lim${randomUUID().replace(/-/g, '').slice(0, 12)}`, resumeText: RESUME, jobDescription: JOB, position: 'Senior React Developer', company_name: 'Acme Payments' },
  } as unknown as NextApiRequest;
  return handler(req, res as unknown as NextApiResponse).then(() => out);
}

const used = async (who: string) =>
  Number((await query('SELECT generations FROM app.usage_daily WHERE user_id = $1 AND day = (now() AT TIME ZONE $2)::date', [USERS[who].userId, 'utc'])).rows[0]?.generations ?? 0);

describe.runIf(process.env.E2E_GENERATE === '1')('daily limit through the real route (live)', () => {
  afterAll(async () => {
    for (const u of Object.values(USERS)) {
      for (const t of ['resumes', 'usage_daily', 'rag_sources', 'documents']) await query(`DELETE FROM app.${t} WHERE user_id = $1`, [u.userId]).catch(() => undefined);
    }
    await closePool();
  });

  it('stops a regular account at its limit, with a clear message, and does not charge the refused request', async () => {
    const results: number[] = [];
    let refused: { error?: string; used?: number; limit?: number } | undefined;
    for (let i = 0; i < 3; i += 1) {
      const r = await call('regular');
      results.push(r.status);
      if (r.status === 429) refused = r.body;
    }
    process.stderr.write(`\nregular account responses: ${results.join(', ')}  | refused: ${JSON.stringify(refused)}\n`);
    expect(results).toEqual([200, 200, 429]);
    expect(refused?.limit).toBe(2);
    expect(refused?.error).toMatch(/daily limit of 2/);
    expect(await used('regular')).toBe(2);
  }, 360_000);

  it('never counts or stops an admin account', async () => {
    const results: number[] = [];
    for (let i = 0; i < 4; i += 1) results.push((await call('admin')).status);
    process.stderr.write(`admin account responses: ${results.join(', ')}  | counted: ${await used('admin')}\n`);
    expect(results).toEqual([200, 200, 200, 200]);
    expect(await used('admin')).toBe(0);
  }, 480_000);

  it('does not treat an unverified address as an admin', async () => {
    // Uses up the two allowed generations, then the third must be refused: no admin bypass without verification.
    expect((await call('impostor')).status).toBe(200);
    expect((await call('impostor')).status).toBe(200);
    expect((await call('impostor')).status).toBe(429);
    expect(await used('impostor')).toBe(2);
  }, 360_000);
});
