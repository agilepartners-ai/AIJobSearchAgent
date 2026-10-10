import { describe, expect, it } from 'vitest';
import type { Extraction } from './extract';
import { findMatch, normCompany, normRole, planMerge, tokenSetRatio, type ExistingApp } from './merge';
import type { ParsedMail } from './messages';

function x(over: Partial<Extraction> = {}): Extraction {
  return {
    is_job_related: true, email_type: 'application_received', company: 'Northwind Labs', position: 'Data Analyst', location: null, work_mode: null,
    employment_type: null, salary: null, application_date: null, event_date: null, deadline: null, job_url: null, portal_url: null,
    recruiter_name: null, recruiter_email: null, summary: 'We got your application.', confidence: 0.95, ...over,
  };
}
function m(over: Partial<ParsedMail> = {}): ParsedMail {
  return { id: 'm1', threadId: 't1', receivedAt: new Date('2026-10-01T09:00:00Z'), fromName: '', fromAddress: 'a@b.c', fromDomain: 'b.c', replyTo: '', subject: '', text: '', links: [], ...over };
}
function app(over: Partial<ExistingApp> = {}): ExistingApp {
  return {
    id: 'a1', company_name: 'Northwind Labs', position: 'Data Analyst', status: 'applied', gmail_thread_id: 't1', status_history: [{ status: 'applied', at: '2026-10-01T09:00:00.000Z', messageId: 'm0', type: 'application_received' }],
    application_date: '2026-10-01', interview_date: null, response_date: null, follow_up_date: null, location: null, job_posting_url: null, salary_range: null,
    employment_type: null, contact_person: null, contact_email: null, notes: null, remote_option: null, needs_review: false, ...over,
  };
}

describe('normalisation and matching', () => {
  it('strips legal suffixes, punctuation and accents from company names', () => {
    expect(normCompany('Northwind Labs, Inc.')).toBe('northwind labs');
    expect(normCompany('Müller & Söhne GmbH')).toBe('muller and sohne');
    expect(normCompany('Acme Pvt. Ltd')).toBe('acme');
  });

  it('strips locations, brackets and abbreviations from roles', () => {
    expect(normRole('Sr. Data Analyst (m/f/d) - Remote')).toBe('senior data analyst');
    expect(normRole('Software Engineer II, USA')).toBe('software engineer ii');
  });

  it('token set ratio ignores word order and extra words', () => {
    expect(tokenSetRatio('senior data analyst', 'data analyst senior')).toBe(1);
    expect(tokenSetRatio('data analyst', 'senior data analyst')).toBeGreaterThanOrEqual(0.85);
    expect(tokenSetRatio('data analyst', 'chief marketing officer')).toBeLessThan(0.5);
    expect(tokenSetRatio('', 'x')).toBe(0);
  });

  it('matches by thread first, then by company and role', () => {
    const apps = [app({ id: 'a1' }), app({ id: 'a2', gmail_thread_id: null, company_name: 'Orbit Analytics', position: 'BI Analyst' })];
    expect(findMatch(apps, 't1', 'Whatever', 'Whatever').match?.app.id).toBe('a1');
    expect(findMatch(apps, 'tx', 'Orbit Analytics Inc', 'BI Analyst (Hybrid)').match?.app.id).toBe('a2');
    expect(findMatch(apps, 'tx', 'Other Co', 'BI Analyst').match).toBeNull();
    expect(findMatch(apps, 'tx', 'Orbit Analytics', 'Chief Financial Officer').match).toBeNull();
  });

  it('does not guess between two equally good matches', () => {
    const apps = [app({ id: 'a1', gmail_thread_id: null }), app({ id: 'a2', gmail_thread_id: null })];
    const r = findMatch(apps, 'tz', 'Northwind Labs', 'Data Analyst');
    expect(r.match).toBeNull();
    expect(r.ambiguous).toBe(true);
  });
});

describe('planMerge', () => {
  it('ignores alerts, other mail and non-job mail', () => {
    for (const t of ['job_alert', 'other'] as const) expect(planMerge([], m(), x({ email_type: t }), null).action).toBe('ignore');
    expect(planMerge([], m(), x({ is_job_related: false }), null).action).toBe('ignore');
  });

  it('ignores a job email with no company', () => {
    expect(planMerge([], m(), x({ company: null }), null).action).toBe('ignore');
  });

  it('creates an application from a confirmation email with every field it can fill', () => {
    const plan = planMerge([], m({ threadId: 'tz' }), x({ location: 'Bengaluru', work_mode: 'hybrid', salary: 'INR 18 LPA', job_url: 'https://jobs.example/1', recruiter_name: 'Priya', recruiter_email: 'p@x.example', employment_type: 'Full-time' }), 'greenhouse');
    expect(plan.action).toBe('create');
    if (plan.action !== 'create') return;
    expect(plan.fields).toMatchObject({
      company_name: 'Northwind Labs', position: 'Data Analyst', status: 'applied', application_date: '2026-10-01', location: 'Bengaluru', remote_option: false,
      salary_range: 'INR 18 LPA', job_posting_url: 'https://jobs.example/1', contact_person: 'Priya', contact_email: 'p@x.example', employment_type: 'Full-time',
      source: 'gmail:greenhouse', gmail_thread_id: 'tz', priority: 1,
    });
    expect(plan.fields.status_history).toHaveLength(1);
    expect(plan.needsReview).toBe(false);
  });

  it('puts a low-confidence or position-less result in review but still saves it', () => {
    const low = planMerge([], m(), x({ confidence: 0.5 }), null);
    expect(low.action === 'create' && low.needsReview).toBe(true);
    const noRole = planMerge([], m(), x({ position: null }), null);
    expect(noRole.action === 'create' && noRole.fields.position).toBe('Unknown position');
    expect(noRole.action === 'create' && noRole.needsReview).toBe(true);
  });

  it('moves status forward and records history on an interview invite', () => {
    const plan = planMerge([app()], m({ id: 'm2', receivedAt: new Date('2026-10-02T09:00:00Z') }), x({ email_type: 'interview_invite', event_date: '2026-10-08', recruiter_name: 'Priya' }), null);
    expect(plan.action).toBe('update');
    if (plan.action !== 'update') return;
    expect(plan.fields).toMatchObject({ status: 'interviewing', interview_date: '2026-10-08', response_date: '2026-10-02', contact_person: 'Priya' });
    expect((plan.fields.status_history as unknown[]).length).toBe(2);
  });

  it('never moves status backward: a late "application received" does not undo an interview', () => {
    const interviewing = app({ status: 'interviewing', status_history: [{ status: 'interviewing', at: '2026-10-05T00:00:00.000Z', messageId: 'm5', type: 'interview_invite' }] });
    const plan = planMerge([interviewing], m({ receivedAt: new Date('2026-10-06T00:00:00Z') }), x({ email_type: 'application_received' }), null);
    expect(plan.action === 'update' && plan.fields.status).toBeUndefined();
  });

  it('ignores a status change from mail older than the last change', () => {
    const rejected = app({ status: 'rejected', status_history: [{ status: 'rejected', at: '2026-10-09T00:00:00.000Z', messageId: 'm9', type: 'rejection' }] });
    const plan = planMerge([rejected], m({ receivedAt: new Date('2026-10-03T00:00:00Z') }), x({ email_type: 'interview_invite' }), null);
    expect(plan.action === 'update' && plan.fields.status).toBeUndefined();
  });

  it('records a rejection after an interview', () => {
    const interviewing = app({ status: 'interviewing', status_history: [{ status: 'interviewing', at: '2026-10-05T00:00:00.000Z', messageId: 'm5', type: 'interview_invite' }] });
    const plan = planMerge([interviewing], m({ id: 'm6', receivedAt: new Date('2026-10-12T00:00:00Z') }), x({ email_type: 'rejection' }), null);
    expect(plan.action === 'update' && plan.fields.status).toBe('rejected');
  });

  it('leaves a status the user set by hand (accepted, declined) alone', () => {
    const accepted = app({ status: 'accepted' });
    const plan = planMerge([accepted], m({ receivedAt: new Date('2026-10-20T00:00:00Z') }), x({ email_type: 'rejection' }), null);
    expect(plan.action === 'update' && plan.fields.status).toBeUndefined();
  });

  it('fills gaps but never overwrites what is already there', () => {
    const existing = app({ location: 'Pune', salary_range: null, contact_person: 'Existing Person' });
    const plan = planMerge([existing], m({ receivedAt: new Date('2026-10-02T00:00:00Z') }), x({ email_type: 'status_update', location: 'Mumbai', salary: 'INR 20 LPA', recruiter_name: 'New Person' }), null);
    expect(plan.action).toBe('update');
    if (plan.action !== 'update') return;
    expect(plan.fields.location).toBeUndefined();
    expect(plan.fields.contact_person).toBeUndefined();
    expect(plan.fields.salary_range).toBe('INR 20 LPA');
  });

  it('appends a dated note and keeps earlier notes', () => {
    const plan = planMerge([app({ notes: 'Added by hand' })], m({ receivedAt: new Date('2026-10-02T00:00:00Z') }), x({ email_type: 'status_update', summary: 'Still under review.' }), null);
    expect(plan.action === 'update' && plan.fields.notes).toBe('Added by hand\n[Gmail 2026-10-02] Still under review.');
  });

  it('adopts the thread id on a row that had none, and promotes "Unknown position"', () => {
    const plan = planMerge([app({ gmail_thread_id: null, position: 'Unknown position', company_name: 'Northwind Labs' })], m({ threadId: 'tnew', receivedAt: new Date('2026-10-02T00:00:00Z') }), x({ email_type: 'status_update', position: 'Unknown position' }), null);
    expect(plan.action).toBe('update');
  });
});
