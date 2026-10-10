/**
 * Live test of the Gmail sync against the real database, with a fake Gmail and a scripted model (opt-in):
 *   RUN_DB_TESTS=1 pnpm exec vitest run src/server/db/gmailRepo.int.test.ts
 * Proves the SQL (jsonb history, review flag, ledger, merge into job_applications) and one full sync end to end.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, toBase64Url } from '../gmail/crypto';
import { extractionSchema } from '../gmail/extract';
import { FIXTURES } from '../gmail/fixtures';
import { syncUser, type SyncDeps } from '../gmail/sync';
import * as repo from './gmailRepo';
import { closePool, query } from './pool';

const live = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const USER = randomUUID();
const KEY = toBase64Url(new Uint8Array(Array.from({ length: 32 }, (_, i) => i + 7)));

const ANSWER: Record<string, Record<string, unknown>> = {
  f1: { email_type: 'application_received', company: 'Northwind Labs', position: 'Data Analyst', job_url: 'https://boards.greenhouse.io/northwindlabs/jobs/4412345' },
  f2: { email_type: 'interview_invite', company: 'BrightCart', position: 'Senior Business Intelligence Developer', work_mode: 'remote', event_date: '2026-10-08', recruiter_name: 'Priya Nair', recruiter_email: 'priya.nair@brightcart.example' },
  f3: { email_type: 'rejection', company: 'Hartwell Systems', position: 'Software Engineer II' },
  f6: { email_type: 'offer', company: 'Lumen Health', position: 'Analytics Engineer', salary: 'INR 18,00,000 per year', confidence: 0.55 },
};

describe.skipIf(!live)('gmail sync (live database)', { timeout: 60_000 }, () => {
  afterAll(async () => {
    await query('DELETE FROM app.gmail_messages WHERE user_id = $1', [USER]);
    await query('DELETE FROM app.gmail_connections WHERE user_id = $1', [USER]);
    await query('DELETE FROM app.job_applications WHERE user_id = $1', [USER]);
    await closePool();
  });

  it('stores the refresh token encrypted and reads it back', async () => {
    const enc = await encryptToken('1//real-looking-refresh-token', KEY);
    await repo.saveConnection(USER, 'me@gmail.com', 'gmail.readonly', enc);
    const row = await repo.getConnection(USER);
    expect(row).toMatchObject({ google_email: 'me@gmail.com', status: 'active' });
    expect(row!.refresh_token_enc).not.toContain('real-looking');
    expect(await decryptToken(row!.refresh_token_enc, KEY)).toBe('1//real-looking-refresh-token');
  });

  it('runs one full sync: skips noise, creates rows, flags the low-confidence one, writes history', async () => {
    const byId = new Map(FIXTURES.map((f) => [f.mail.id, f]));
    const deps: SyncDeps = {
      repo,
      decrypt: async () => 'refresh',
      accessToken: async () => 'access',
      list: async () => FIXTURES.map((f) => ({ id: f.mail.id, threadId: f.mail.threadId })),
      meta: async (_t, id) => {
        const m = byId.get(id)!.mail;
        return { id, threadId: m.threadId, receivedAt: m.receivedAt, from: m.fromName, fromDomain: m.fromDomain, subject: m.subject, snippet: m.text.slice(0, 160) };
      },
      full: async (_t, id) => byId.get(id)!.mail,
      extract: async (m) => {
        const a = ANSWER[m.id];
        const base = { is_job_related: Boolean(a), email_type: 'other', summary: 'test', confidence: 0.95 };
        return { extraction: extractionSchema.parse({ ...base, ...(a ?? {}) }) };
      },
      now: () => Date.now(),
    };
    const s = await syncUser(USER, { deps, force: true });
    expect(s).toMatchObject({ created: 4, updated: 0, errors: 0 });

    const { rows } = await query<Record<string, unknown>>('SELECT * FROM app.job_applications WHERE user_id = $1 ORDER BY company_name', [USER]);
    expect(rows.map((r) => r.company_name)).toEqual(['BrightCart', 'Hartwell Systems', 'Lumen Health', 'Northwind Labs']);
    const bright = rows.find((r) => r.company_name === 'BrightCart')!;
    expect(bright).toMatchObject({ status: 'interviewing', interview_date: '2026-10-08', contact_person: 'Priya Nair', remote_option: true, source: 'gmail:lever', needs_review: false });
    expect(bright.status_history).toHaveLength(1); // jsonb came back as an array
    const lumen = rows.find((r) => r.company_name === 'Lumen Health')!;
    expect(lumen).toMatchObject({ status: 'offered', needs_review: true, confidence: 0.55 });
    expect(await repo.gmailStats(USER)).toMatchObject({ imported: 4, needsReview: 1 });
  });

  it('does not process the same messages twice, and a follow-up updates in place', async () => {
    const before = (await query('SELECT count(*)::int AS n FROM app.job_applications WHERE user_id = $1', [USER])).rows[0].n;
    const ids = FIXTURES.map((f) => f.mail.id);
    expect((await repo.seenMessageIds(USER, ids)).size).toBe(10);
    expect(before).toBe(4);

    const conn = await repo.getConnection(USER);
    expect(conn!.last_sync_summary).toMatchObject({ created: 4 });
  });

  it('refuses to write a column outside the allow-list', async () => {
    await expect(repo.patchApplication(USER, randomUUID(), { user_id: 'someone-else' })).rejects.toThrow(/tried to write column/);
  });

  it('disconnect removes the connection and ledger but keeps the applications', async () => {
    await repo.deleteConnection(USER);
    expect(await repo.getConnection(USER)).toBeNull();
    expect((await repo.seenMessageIds(USER, ['f1'])).size).toBe(0);
    expect((await query('SELECT count(*)::int AS n FROM app.job_applications WHERE user_id = $1', [USER])).rows[0].n).toBe(4);
    expect(await repo.deleteImportedApplications(USER)).toBe(4);
  });
});
