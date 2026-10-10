import { describe, expect, it } from 'vitest';
import type { Extraction } from './extract';
import { FIXTURES } from './fixtures';
import type { ExistingApp, Patch } from './merge';
import { GmailApiError, type MessageMeta, type ParsedMail } from './messages';
import { GoogleAuthError } from './oauth';
import { LIMITS, NotConnectedError, ReconnectNeededError, syncUser, TooSoonError, type SyncDeps } from './sync';
import type { GmailConnection, LedgerRow } from '../db/gmailRepo';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const USER = 'user-1';

function ex(over: Partial<Extraction>): Extraction {
  return {
    is_job_related: true, email_type: 'application_received', company: null, position: null, location: null, work_mode: null, employment_type: null, salary: null,
    application_date: null, event_date: null, deadline: null, job_url: null, portal_url: null, recruiter_name: null, recruiter_email: null, summary: 'ok', confidence: 0.95, ...over,
  };
}

/** What a correct model says about each fixture. */
const MODEL: Record<string, Extraction> = {
  f1: ex({ email_type: 'application_received', company: 'Northwind Labs', position: 'Data Analyst', job_url: 'https://boards.greenhouse.io/northwindlabs/jobs/4412345' }),
  f2: ex({ email_type: 'interview_invite', company: 'BrightCart', position: 'Senior Business Intelligence Developer', work_mode: 'remote', event_date: '2026-10-08', recruiter_name: 'Priya Nair', recruiter_email: 'priya.nair@brightcart.example' }),
  f3: ex({ email_type: 'rejection', company: 'Hartwell Systems', position: 'Software Engineer II' }),
  f4: ex({ email_type: 'assessment_invite', company: 'Zenith Retail', position: 'Junior Data Engineer', deadline: '2026-10-11' }),
  f5: ex({ email_type: 'application_received', company: 'Orbit Analytics', position: 'BI Analyst', location: 'Bengaluru', work_mode: 'hybrid' }),
  f6: ex({ email_type: 'offer', company: 'Lumen Health', position: 'Analytics Engineer', salary: 'INR 18,00,000 per year', employment_type: 'Full-time', recruiter_name: 'Maya Chen' }),
  f7: ex({ is_job_related: false, email_type: 'job_alert' }),
  f8: ex({ is_job_related: false, email_type: 'other' }),
  f9: ex({ is_job_related: false, email_type: 'other', confidence: 0.9 }),
  f10: ex({ email_type: 'status_update', company: 'Fieldstone', position: 'Product Analyst', deadline: '2026-10-20' }),
};

interface Fake {
  deps: SyncDeps;
  apps: ExistingApp[];
  ledger: Map<string, LedgerRow>;
  conn: { value: GmailConnection | null };
  calls: { extract: number; full: number; meta: number };
  mail: Map<string, { meta: MessageMeta; mail: ParsedMail }>;
}

function fake(opts: { fixtures?: boolean; accessToken?: SyncDeps['accessToken']; last?: string | null } = {}): Fake {
  const mail = new Map<string, { meta: MessageMeta; mail: ParsedMail }>();
  const add = (m: ParsedMail) => mail.set(m.id, { mail: m, meta: { id: m.id, threadId: m.threadId, receivedAt: m.receivedAt, from: `${m.fromName} <${m.fromAddress}>`, fromDomain: m.fromDomain, subject: m.subject, snippet: m.text.slice(0, 160) } });
  if (opts.fixtures !== false) FIXTURES.forEach((f) => add(f.mail));

  const apps: ExistingApp[] = [];
  const ledger = new Map<string, LedgerRow>();
  const conn = { value: { user_id: USER, google_email: 'me@gmail.com', scope: 's', refresh_token_enc: 'enc', status: 'active', connected_at: '', last_sync_at: opts.last ?? null, last_sync_summary: null, last_error: null } as GmailConnection | null };
  const calls = { extract: 0, full: 0, meta: 0 };
  let n = 0;

  const deps: SyncDeps = {
    repo: {
      getConnection: async () => conn.value,
      setConnectionStatus: async (_u, status, err) => { if (conn.value) Object.assign(conn.value, { status, last_error: err }); },
      recordSync: async (_u, summary) => { if (conn.value) Object.assign(conn.value, { last_sync_at: new Date(NOW).toISOString(), last_sync_summary: summary }); },
      seenMessageIds: async (_u, ids) => new Set(ids.filter((id) => ledger.has(id) && ledger.get(id)!.outcome !== 'error')),
      recordMessage: async (_u, row) => { ledger.set(row.messageId, row); },
      appsForMerge: async () => structuredClone(apps),
      insertApplication: async (_u, fields: Patch, needsReview: boolean) => {
        n += 1;
        const id = `app-${n}`;
        apps.push({ id, ...(fields as object), needs_review: needsReview } as unknown as ExistingApp);
        return id;
      },
      patchApplication: async (_u, id, fields) => { Object.assign(apps.find((a) => a.id === id)!, fields); },
    },
    decrypt: async () => 'refresh',
    accessToken: opts.accessToken ?? (async () => 'access'),
    list: async () => Array.from(mail.values()).map((v) => ({ id: v.mail.id, threadId: v.mail.threadId })).reverse(), // newest-first like Gmail
    meta: async (_t, id) => { calls.meta += 1; return mail.get(id)!.meta; },
    full: async (_t, id) => { calls.full += 1; return mail.get(id)!.mail; },
    extract: async (m) => { calls.extract += 1; const x = MODEL[m.id] ?? MODEL[m.id.replace(/^g/, 'f')]; return x ? { extraction: x } : { extraction: null, error: 'no model answer' }; },
    now: () => NOW,
  };
  return { deps, apps, ledger, conn, calls, mail };
}

describe('syncUser: first run over ten realistic emails', () => {
  it('skips alerts and receipts without a model call, and builds the board from the rest', async () => {
    const f = fake();
    const s = await syncUser(USER, { deps: f.deps });

    expect(s).toMatchObject({ listed: 10, newMessages: 10, skipped: 2, analysed: 8, created: 7, updated: 0, errors: 0, truncated: false });
    expect(f.calls.extract).toBe(8); // not 10: two never reached the model
    expect(f.ledger.get('f7')?.outcome).toBe('skipped');
    expect(f.ledger.get('f8')?.outcome).toBe('skipped');
    expect(f.ledger.get('f9')?.outcome).toBe('not_job'); // the prompt-injection email produced no row

    const byCompany = Object.fromEntries(f.apps.map((a) => [a.company_name, a]));
    expect(Object.keys(byCompany).sort()).toEqual(['BrightCart', 'Fieldstone', 'Hartwell Systems', 'Lumen Health', 'Northwind Labs', 'Orbit Analytics', 'Zenith Retail']);
    expect(byCompany['Northwind Labs']).toMatchObject({ status: 'applied', position: 'Data Analyst', job_posting_url: 'https://boards.greenhouse.io/northwindlabs/jobs/4412345', source: 'gmail:greenhouse' });
    expect(byCompany['BrightCart']).toMatchObject({ status: 'interviewing', interview_date: '2026-10-08', contact_person: 'Priya Nair', remote_option: true });
    expect(byCompany['Hartwell Systems'].status).toBe('rejected');
    expect(byCompany['Zenith Retail']).toMatchObject({ status: 'interviewing', follow_up_date: '2026-10-11' });
    expect(byCompany['Orbit Analytics']).toMatchObject({ location: 'Bengaluru', remote_option: false, source: 'gmail:linkedin' });
    expect(byCompany['Lumen Health']).toMatchObject({ status: 'offered', salary_range: 'INR 18,00,000 per year', employment_type: 'Full-time' });
    expect(f.apps.every((a) => !a.needs_review)).toBe(true);
    expect(f.conn.value?.last_sync_summary).toEqual(s);
  });

  it('a second run does nothing: every message is already in the ledger', async () => {
    const f = fake();
    await syncUser(USER, { deps: f.deps });
    const before = f.calls.extract;
    const s = await syncUser(USER, { deps: f.deps, force: true });
    expect(s).toMatchObject({ newMessages: 0, analysed: 0, created: 0, updated: 0 });
    expect(f.calls.extract).toBe(before);
    expect(f.apps).toHaveLength(7);
  });

  it('a follow-up in the same thread updates the existing row instead of adding a new one', async () => {
    const f = fake();
    await syncUser(USER, { deps: f.deps });
    const base = FIXTURES[0].mail; // Northwind, thread t-f1
    const followUp: ParsedMail = { ...base, id: 'g1', receivedAt: new Date('2026-10-09T10:00:00Z'), subject: 'Interview with Northwind Labs', text: 'We would like to schedule an interview next week.' };
    f.mail.set('g1', { mail: followUp, meta: { id: 'g1', threadId: base.threadId, receivedAt: followUp.receivedAt, from: 'x', fromDomain: base.fromDomain, subject: followUp.subject, snippet: followUp.text } });
    MODEL.g1 = ex({ email_type: 'interview_invite', company: 'Northwind Labs', position: 'Data Analyst', event_date: '2026-10-15' });

    const s = await syncUser(USER, { deps: f.deps, force: true });
    expect(s).toMatchObject({ newMessages: 1, created: 0, updated: 1 });
    const row = f.apps.find((a) => a.company_name === 'Northwind Labs')!;
    expect(row.status).toBe('interviewing');
    expect(row.interview_date).toBe('2026-10-15');
    expect(row.status_history.map((h) => h.status)).toEqual(['applied', 'interviewing']);
    expect(f.apps).toHaveLength(7);
    delete MODEL.g1;
  });

  it('processes mail oldest-first even though Gmail lists newest-first', async () => {
    const f = fake({ fixtures: false });
    const t = (id: string, iso: string, type: Extraction['email_type']): ParsedMail => ({ id, threadId: 'T', receivedAt: new Date(iso), fromName: 'Acme', fromAddress: 'jobs@greenhouse.io', fromDomain: 'greenhouse.io', replyTo: '', subject: 'Your application to Acme', text: 'Update on your application', links: [] });
    for (const [id, iso, type] of [['h1', '2026-10-01T00:00:00Z', 'application_received'], ['h2', '2026-10-03T00:00:00Z', 'interview_invite'], ['h3', '2026-10-06T00:00:00Z', 'rejection']] as const) {
      const m = t(id, iso, type);
      f.mail.set(id, { mail: m, meta: { id, threadId: 'T', receivedAt: m.receivedAt, from: 'Acme', fromDomain: m.fromDomain, subject: m.subject, snippet: m.text } });
      MODEL[id] = ex({ email_type: type, company: 'Acme', position: 'Analyst' });
    }
    const s = await syncUser(USER, { deps: f.deps });
    expect(s).toMatchObject({ created: 1, updated: 2 });
    expect(f.apps[0].status).toBe('rejected');
    expect(f.apps[0].status_history.map((h) => h.status)).toEqual(['applied', 'interviewing', 'rejected']);
    ['h1', 'h2', 'h3'].forEach((id) => delete MODEL[id]);
  });
});

describe('syncUser: failure and limits', () => {
  it('refuses when Gmail is not connected', async () => {
    const f = fake();
    f.conn.value = null;
    await expect(syncUser(USER, { deps: f.deps })).rejects.toBeInstanceOf(NotConnectedError);
  });

  it('asks to reconnect when Google says the grant is gone, and remembers it', async () => {
    const f = fake({ accessToken: async () => { throw new GoogleAuthError('invalid_grant', true); } });
    await expect(syncUser(USER, { deps: f.deps })).rejects.toBeInstanceOf(ReconnectNeededError);
    expect(f.conn.value?.status).toBe('revoked');
    await expect(syncUser(USER, { deps: f.deps })).rejects.toBeInstanceOf(ReconnectNeededError); // and does not try again
  });

  it('treats a 401 from the Gmail API mid-run as a revoked grant', async () => {
    const f = fake();
    f.deps.list = async () => { throw new GmailApiError('Gmail API 401', 401); };
    await expect(syncUser(USER, { deps: f.deps })).rejects.toBeInstanceOf(ReconnectNeededError);
    expect(f.conn.value?.status).toBe('revoked');
  });

  it('lets a manual sync run only every five minutes, but not the daily timer', async () => {
    const f = fake({ last: new Date(NOW - 60_000).toISOString() });
    await expect(syncUser(USER, { deps: f.deps })).rejects.toBeInstanceOf(TooSoonError);
    await expect(syncUser(USER, { deps: f.deps, force: true })).resolves.toBeTruthy();
  });

  it('retries a message whose model call failed, instead of losing it', async () => {
    const f = fake();
    delete (MODEL as Record<string, Extraction | undefined>).f1;
    const first = await syncUser(USER, { deps: f.deps });
    expect(first.errors).toBe(1);
    expect(f.ledger.get('f1')?.outcome).toBe('error');
    MODEL.f1 = ex({ email_type: 'application_received', company: 'Northwind Labs', position: 'Data Analyst' });
    const second = await syncUser(USER, { deps: f.deps, force: true });
    expect(second).toMatchObject({ newMessages: 1, created: 1 });
  });

  it('caps how much one run reads, and says so', async () => {
    const f = fake();
    const old = { ...LIMITS };
    LIMITS.messages = 4;
    try {
      const s = await syncUser(USER, { deps: f.deps });
      expect(s.truncated).toBe(true);
      expect(s.skipped + s.analysed + s.errors).toBeLessThanOrEqual(4);
    } finally {
      Object.assign(LIMITS, old);
    }
  });

  it('caps model calls per run', async () => {
    const f = fake();
    const old = { ...LIMITS };
    LIMITS.ai = 3;
    try {
      const s = await syncUser(USER, { deps: f.deps });
      expect(s.analysed).toBe(3);
      expect(s.truncated).toBe(true);
      expect(f.calls.extract).toBe(3);
    } finally {
      Object.assign(LIMITS, old);
    }
  });
});
