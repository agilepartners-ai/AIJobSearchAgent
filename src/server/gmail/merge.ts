/**
 * Decides what an extracted email does to the Applications board: create a row, update one, or leave it for review.
 * Pure functions, no I/O, so the rules can be tested exhaustively. Ideas (not code) from the open-source trackers listed in
 * docs/GMAIL_JOB_SYNC_SCOPE.md: fuzzy company + role match, status never moves backward, low confidence goes to review.
 */
import type { EmailType, Extraction } from './extract';
import type { ParsedMail } from './messages';

export const REVIEW_THRESHOLD = 0.7;
const COMPANY_MATCH = 0.9;
const ROLE_MATCH = 0.85;

export type AppStatus = 'not_applied' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'accepted' | 'declined';

/** The part of a job_applications row the merge needs to see. */
export interface ExistingApp {
  id: string;
  company_name: string;
  position: string;
  status: AppStatus;
  gmail_thread_id: string | null;
  status_history: HistoryEntry[];
  application_date: string | null;
  interview_date: string | null;
  response_date: string | null;
  follow_up_date: string | null;
  location: string | null;
  job_posting_url: string | null;
  salary_range: string | null;
  employment_type: string | null;
  contact_person: string | null;
  contact_email: string | null;
  notes: string | null;
  remote_option: boolean | null;
  needs_review: boolean;
}

export interface HistoryEntry {
  status: AppStatus;
  at: string;
  messageId: string;
  type: EmailType;
}

export const STATUS_FOR_TYPE: Partial<Record<EmailType, AppStatus>> = {
  application_received: 'applied',
  assessment_invite: 'interviewing',
  interview_invite: 'interviewing',
  offer: 'offered',
  rejection: 'rejected',
};

const RANK: Record<AppStatus, number> = { not_applied: 0, applied: 1, interviewing: 2, offered: 3, rejected: 3, accepted: 9, declined: 9 };

// ── fuzzy matching ──────────────────────────────────────────────────────────
const LEGAL = /\b(inc|incorporated|llc|ltd|limited|pvt|private|corp|corporation|gmbh|plc|co|company|llp|pte|sa|ag|bv|oy)\b/g;

function strip(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function normCompany(s: string): string {
  return strip(s).replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(LEGAL, ' ').replace(/\s+/g, ' ').trim();
}

export function normRole(s: string): string {
  return strip(s)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(sr)\b\.?/g, 'senior')
    .replace(/\b(jr)\b\.?/g, 'junior')
    .replace(/\b(remote|hybrid|onsite|on-site|usa|us|india|uk|emea)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const ratio = (a: string, b: string) => (!a.length && !b.length ? 1 : 1 - levenshtein(a, b) / Math.max(a.length, b.length));

/** Word order and extra words do not matter: "senior data analyst" ~ "data analyst senior". 0 to 1. */
export function tokenSetRatio(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  const common = Array.from(ta).filter((t) => tb.has(t)).sort();
  const onlyA = Array.from(ta).filter((t) => !tb.has(t)).sort();
  const onlyB = Array.from(tb).filter((t) => !ta.has(t)).sort();
  const sect = common.join(' ');
  const c1 = [sect, ...onlyA].filter(Boolean).join(' ');
  const c2 = [sect, ...onlyB].filter(Boolean).join(' ');
  return Math.max(sect ? ratio(sect, c1) : 0, sect ? ratio(sect, c2) : 0, ratio(c1, c2));
}

export interface Match {
  app: ExistingApp;
  score: number;
  how: 'thread' | 'company+role' | 'company';
}

export function findMatch(apps: ExistingApp[], threadId: string, company: string | null, position: string | null): { match: Match | null; ambiguous: boolean } {
  const byThread = apps.find((a) => a.gmail_thread_id && a.gmail_thread_id === threadId);
  if (byThread) return { match: { app: byThread, score: 1, how: 'thread' }, ambiguous: false };
  if (!company) return { match: null, ambiguous: false };

  const c = normCompany(company);
  const r = position ? normRole(position) : '';
  const hits: Match[] = [];
  for (const app of apps) {
    const cs = tokenSetRatio(c, normCompany(app.company_name));
    if (cs < COMPANY_MATCH) continue;
    if (r) {
      const rs = tokenSetRatio(r, normRole(app.position));
      if (rs >= ROLE_MATCH) hits.push({ app, score: (cs + rs) / 2, how: 'company+role' });
    } else {
      hits.push({ app, score: cs * 0.9, how: 'company' });
    }
  }
  if (!hits.length) return { match: null, ambiguous: false };
  hits.sort((x, y) => y.score - x.score);
  // Two applications that look equally right: do not guess which one the email belongs to.
  if (hits.length > 1 && hits[0].score - hits[1].score < 0.05) return { match: null, ambiguous: true };
  return { match: hits[0], ambiguous: false };
}

// ── the plan ────────────────────────────────────────────────────────────────
export type Patch = Record<string, string | number | boolean | null | HistoryEntry[]>;

export type Plan =
  | { action: 'create'; fields: Patch; needsReview: boolean }
  | { action: 'update'; id: string; fields: Patch; needsReview: boolean }
  | { action: 'ignore'; reason: string };

const day = (d: Date) => d.toISOString().slice(0, 10);

function appendNote(existing: string | null, line: string): string {
  const next = existing ? `${existing}\n${line}` : line;
  return next.length > 4000 ? next.slice(next.length - 4000) : next;
}

export function planMerge(existing: ExistingApp[], mail: ParsedMail, x: Extraction, board: string | null): Plan {
  if (!x.is_job_related || x.email_type === 'job_alert' || x.email_type === 'other') return { action: 'ignore', reason: 'not about a specific application' };
  if (!x.company && !existing.some((a) => a.gmail_thread_id === mail.threadId)) return { action: 'ignore', reason: 'no company found' };

  const newStatus = STATUS_FOR_TYPE[x.email_type] ?? null;
  const received = day(mail.receivedAt);
  const lowConfidence = x.confidence < REVIEW_THRESHOLD;
  const note = `[Gmail ${received}] ${x.summary || x.email_type.replace('_', ' ')}${x.portal_url ? ` Portal: ${x.portal_url}` : ''}`;

  const { match, ambiguous } = findMatch(existing, mail.threadId, x.company, x.position);

  if (!match) {
    const remote = x.work_mode === 'remote' ? true : x.work_mode ? false : null;
    const status = newStatus ?? 'applied';
    const entry: HistoryEntry = { status, at: mail.receivedAt.toISOString(), messageId: mail.id, type: x.email_type };
    return {
      action: 'create',
      needsReview: lowConfidence || ambiguous || !x.position,
      fields: {
        company_name: x.company as string,
        position: x.position ?? 'Unknown position',
        status,
        application_date: x.application_date ?? received,
        location: x.location,
        job_posting_url: x.job_url,
        salary_range: x.salary,
        employment_type: x.employment_type,
        remote_option: remote,
        contact_person: x.recruiter_name,
        contact_email: x.recruiter_email,
        interview_date: newStatus === 'interviewing' ? x.event_date : null,
        response_date: x.email_type === 'application_received' ? null : received,
        follow_up_date: x.deadline,
        notes: note,
        source: board ? `gmail:${board}` : 'gmail',
        priority: 1,
        gmail_thread_id: mail.threadId,
        status_history: [entry],
        confidence: x.confidence,
      },
    };
  }

  const app = match.app;
  const fields: Patch = {};
  const history = [...(app.status_history ?? [])];
  const lastAt = history.length ? history[history.length - 1].at : '';

  // Status only moves forward, only on newer mail, and never over a status the user set by hand (accepted/declined).
  if (newStatus && RANK[app.status] < 9 && mail.receivedAt.toISOString() >= lastAt) {
    const forward = RANK[newStatus] > RANK[app.status] || (newStatus === 'rejected' && app.status !== 'rejected');
    if (forward && newStatus !== app.status) {
      fields.status = newStatus;
      history.push({ status: newStatus, at: mail.receivedAt.toISOString(), messageId: mail.id, type: x.email_type });
      fields.status_history = history;
    }
  }
  if (!app.gmail_thread_id) fields.gmail_thread_id = mail.threadId;
  // Fill gaps only: values the user typed or an earlier email set are not overwritten.
  const fill = (key: keyof ExistingApp, value: string | boolean | null) => {
    if (value !== null && (app[key] === null || app[key] === '')) fields[key as string] = value;
  };
  fill('location', x.location);
  fill('job_posting_url', x.job_url);
  fill('salary_range', x.salary);
  fill('employment_type', x.employment_type);
  fill('contact_person', x.recruiter_name);
  fill('contact_email', x.recruiter_email);
  if (app.remote_option === null && x.work_mode) fields.remote_option = x.work_mode === 'remote';
  if (!app.application_date && x.application_date) fields.application_date = x.application_date;
  if (x.event_date && (newStatus === 'interviewing' || !app.interview_date)) fields.interview_date = x.event_date;
  if (x.deadline) fields.follow_up_date = x.deadline;
  if (x.email_type !== 'application_received') fields.response_date = received;
  if (app.position === 'Unknown position' && x.position) fields.position = x.position;
  fields.notes = appendNote(app.notes, note);

  const needsReview = app.needs_review || lowConfidence;
  if (needsReview) fields.needs_review = true;
  fields.confidence = Math.min(x.confidence, 1);
  return { action: 'update', id: app.id, fields, needsReview };
}
