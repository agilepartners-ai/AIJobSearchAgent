/**
 * Live test of the forwarding channel against the real database, with a scripted model (opt-in):
 *   RUN_DB_TESTS=1 pnpm exec vitest run src/server/db/inboundRepo.int.test.ts
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { handleInbound, realInboundDeps } from '../gmail/inbound';
import { FIXTURES } from '../gmail/fixtures';
import * as repo from './inboundRepo';
import { closePool, query } from './pool';

const live = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const USER = randomUUID();
const enc = (s: string) => new TextEncoder().encode(s);

function raw(from: string, subject: string, text: string, id: string, to: string, extra = '') {
  return enc(`From: <${from}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nMessage-ID: <${id}@t.example>\r\nDate: Thu, 01 Oct 2026 09:00:00 +0000\r\n${extra}Content-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n`);
}

describe.skipIf(!live)('forwarded mail (live database)', { timeout: 60_000 }, () => {
  afterAll(async () => {
    await query('DELETE FROM app.gmail_messages WHERE user_id = $1', [USER]);
    await query('DELETE FROM app.job_applications WHERE user_id = $1', [USER]);
    await query('DELETE FROM app.inbound_confirmations WHERE user_id = $1', [USER]);
    await query('DELETE FROM app.inbound_addresses WHERE user_id = $1', [USER]);
    await closePool();
  });

  it('creates one stable address per user, and rotating it kills the old one', async () => {
    const a = await repo.getOrCreateAddress(USER);
    expect(a).toMatch(/^[a-z2-7]{26}$/);
    expect(await repo.getOrCreateAddress(USER)).toBe(a);
    expect(await repo.userForToken(a)).toBe(USER);
    const b = await repo.rotateAddress(USER);
    expect(b).not.toBe(a);
    expect(await repo.userForToken(a)).toBeNull();
    expect(await repo.userForToken(b)).toBe(USER);
  });

  it('runs the whole flow with the real repository: confirmation, application, follow-up, duplicate, counters', async () => {
    const token = await repo.getOrCreateAddress(USER);
    const to = `jobs+${token}@in.agilepartners-ai.com`;
    const model = (extraction: object) => ({ ...realInboundDeps, extract: async () => ({ extraction: extraction as never }) });
    const base = { is_job_related: true, summary: 'ok', confidence: 0.95, company: null, position: null, location: null, work_mode: null, employment_type: null, salary: null, application_date: null, event_date: null, deadline: null, job_url: null, portal_url: null, recruiter_name: null, recruiter_email: null };

    // 1. Gmail's forwarding confirmation: code stored, no application
    const conf = await handleInbound(token, raw('forwarding-noreply@google.com', 'Gmail Forwarding Confirmation - Receive Mail from me@gmail.com', 'Confirmation code: 112233445\nhttps://mail-settings.google.com/mail/vf-%5Bx%5D-y', 'conf-1', to), model({ ...base, email_type: 'other' }));
    expect(conf.status).toBe('confirmation');
    expect((await repo.inboundStatus(USER)).confirmation).toMatchObject({ code: '112233445' });

    // 2. the application confirmation creates a row
    const f = FIXTURES[0].mail;
    const first = await handleInbound(token, raw(f.fromAddress, f.subject, f.text, 'app-1', to), model({ ...base, email_type: 'application_received', company: 'Northwind Labs', position: 'Data Analyst' }));
    expect(first.status).toBe('created');

    // 3. a reply in the same thread updates it
    const second = await handleInbound(token, raw(f.fromAddress, 'Interview with Northwind Labs', 'We would like to interview you.', 'app-2', to, 'In-Reply-To: <app-1@t.example>\r\n'), model({ ...base, email_type: 'interview_invite', company: 'Northwind Labs', position: 'Data Analyst', event_date: '2026-10-15' }));
    expect(second.status).toBe('updated');

    // 4. the same message again is a duplicate
    expect((await handleInbound(token, raw(f.fromAddress, f.subject, f.text, 'app-1', to), model({ ...base, email_type: 'application_received', company: 'Northwind Labs', position: 'Data Analyst' }))).status).toBe('duplicate');

    const { rows } = await query<Record<string, unknown>>('SELECT * FROM app.job_applications WHERE user_id = $1', [USER]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ company_name: 'Northwind Labs', status: 'interviewing', interview_date: '2026-10-15' });
    expect(rows[0].status_history).toHaveLength(2);
    const ledger = await query<{ channel: string }>('SELECT channel FROM app.gmail_messages WHERE user_id = $1', [USER]);
    expect(ledger.rows.length).toBeGreaterThanOrEqual(2);
    expect(ledger.rows.every((r) => r.channel === 'forwarded')).toBe(true);

    const s = await repo.inboundStatus(USER);
    expect(s.receivedTotal).toBe(4);
    expect(await repo.receivedToday(USER)).toBe(4);
  });
});
