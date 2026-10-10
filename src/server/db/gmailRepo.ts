import { query } from './pool';
import type { ExistingApp, Patch } from '../gmail/merge';

export interface GmailConnection {
  user_id: string;
  google_email: string;
  scope: string;
  refresh_token_enc: string;
  status: 'active' | 'revoked' | 'error';
  connected_at: string;
  last_sync_at: string | null;
  last_sync_summary: SyncSummary | null;
  last_error: string | null;
}

export interface SyncSummary {
  listed: number;
  newMessages: number;
  skipped: number;
  analysed: number;
  created: number;
  updated: number;
  needsReview: number;
  errors: number;
  truncated: boolean;
}

export async function getConnection(userId: string): Promise<GmailConnection | null> {
  const { rows } = await query<GmailConnection>('SELECT * FROM app.gmail_connections WHERE user_id = $1', [userId]);
  return rows[0] ?? null;
}

export async function saveConnection(userId: string, googleEmail: string, scope: string, refreshTokenEnc: string): Promise<void> {
  await query(
    `INSERT INTO app.gmail_connections (user_id, google_email, scope, refresh_token_enc, status, connected_at, last_error)
     VALUES ($1, $2, $3, $4, 'active', now(), NULL)
     ON CONFLICT (user_id) DO UPDATE SET google_email = $2, scope = $3, refresh_token_enc = $4, status = 'active',
       connected_at = now(), last_error = NULL`,
    [userId, googleEmail, scope, refreshTokenEnc],
  );
}

export async function setConnectionStatus(userId: string, status: 'active' | 'revoked' | 'error', error: string | null): Promise<void> {
  await query('UPDATE app.gmail_connections SET status = $2, last_error = $3 WHERE user_id = $1', [userId, status, error]);
}

export async function recordSync(userId: string, summary: SyncSummary): Promise<void> {
  await query('UPDATE app.gmail_connections SET last_sync_at = now(), last_sync_summary = $2::jsonb, status = \'active\', last_error = NULL WHERE user_id = $1', [userId, JSON.stringify(summary)]);
}

/** Removes the connection and the message ledger. The applications it created stay: they are the user's data. */
export async function deleteConnection(userId: string): Promise<void> {
  await query('DELETE FROM app.gmail_messages WHERE user_id = $1', [userId]);
  await query('DELETE FROM app.gmail_connections WHERE user_id = $1', [userId]);
}

export async function deleteImportedApplications(userId: string): Promise<number> {
  const { rowCount } = await query("DELETE FROM app.job_applications WHERE user_id = $1 AND source LIKE 'gmail%'", [userId]);
  return rowCount ?? 0;
}

export async function dueConnections(minAgeHours: number, limit: number): Promise<string[]> {
  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM app.gmail_connections
     WHERE status = 'active' AND (last_sync_at IS NULL OR last_sync_at < now() - make_interval(hours => $1))
     ORDER BY last_sync_at NULLS FIRST LIMIT $2`,
    [minAgeHours, limit],
  );
  return rows.map((r) => r.user_id);
}

export async function seenMessageIds(userId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { rows } = await query<{ message_id: string }>("SELECT message_id FROM app.gmail_messages WHERE user_id = $1 AND outcome <> 'error' AND message_id = ANY($2::text[])", [userId, ids]);
  return new Set(rows.map((r) => r.message_id));
}

export interface LedgerRow {
  messageId: string;
  threadId: string;
  receivedAt: Date;
  senderDomain: string;
  outcome: 'skipped' | 'not_job' | 'job' | 'low_confidence' | 'error';
  emailType?: string | null;
  confidence?: number | null;
  applicationId?: string | null;
}

export async function recordMessage(userId: string, r: LedgerRow): Promise<void> {
  await query(
    `INSERT INTO app.gmail_messages (user_id, message_id, thread_id, received_at, sender_domain, outcome, email_type, confidence, application_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id, message_id) DO UPDATE SET outcome = EXCLUDED.outcome, email_type = EXCLUDED.email_type,
       confidence = EXCLUDED.confidence, application_id = EXCLUDED.application_id, processed_at = now()`,
    [userId, r.messageId, r.threadId, r.receivedAt, r.senderDomain, r.outcome, r.emailType ?? null, r.confidence ?? null, r.applicationId ?? null],
  );
}

const MERGE_COLUMNS =
  'id, company_name, position, status, gmail_thread_id, status_history, application_date, interview_date, response_date, follow_up_date, location, job_posting_url, salary_range, employment_type, contact_person, contact_email, notes, remote_option, needs_review';

export async function appsForMerge(userId: string): Promise<ExistingApp[]> {
  const { rows } = await query<ExistingApp>(`SELECT ${MERGE_COLUMNS} FROM app.job_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 2000`, [userId]);
  return rows;
}

/** Columns the sync may write. Anything else in a patch is a bug and is rejected, never interpolated. */
const WRITABLE = new Set([
  'company_name', 'position', 'status', 'application_date', 'interview_date', 'response_date', 'follow_up_date', 'location',
  'job_posting_url', 'salary_range', 'employment_type', 'remote_option', 'contact_person', 'contact_email', 'notes', 'source',
  'priority', 'gmail_thread_id', 'status_history', 'confidence', 'needs_review',
]);

function checked(fields: Patch): string[] {
  const keys = Object.keys(fields);
  for (const k of keys) if (!WRITABLE.has(k)) throw new Error(`gmail sync tried to write column "${k}"`);
  return keys;
}

const param = (k: string, i: number) => (k === 'status_history' ? `$${i}::jsonb` : `$${i}`);
const val = (k: string, v: Patch[string]) => (k === 'status_history' ? JSON.stringify(v) : v);

export async function insertApplication(userId: string, fields: Patch, needsReview: boolean): Promise<string> {
  const keys = checked(fields);
  const all = [...keys.filter((k) => k !== 'needs_review'), 'needs_review'];
  const { rows } = await query<{ id: string }>(
    `INSERT INTO app.job_applications (user_id, ${all.join(', ')}) VALUES ($1, ${all.map((k, i) => param(k, i + 2)).join(', ')}) RETURNING id`,
    [userId, ...all.map((k) => (k === 'needs_review' ? needsReview : val(k, fields[k])))],
  );
  return rows[0].id;
}

export async function patchApplication(userId: string, id: string, fields: Patch): Promise<void> {
  const keys = checked(fields);
  if (!keys.length) return;
  await query(`UPDATE app.job_applications SET ${keys.map((k, i) => `${k} = ${param(k, i + 3)}`).join(', ')} WHERE user_id = $1 AND id = $2`, [userId, id, ...keys.map((k) => val(k, fields[k]))]);
}

export async function gmailStats(userId: string): Promise<{ imported: number; needsReview: number }> {
  const { rows } = await query<{ imported: number; needs_review: number }>(
    `SELECT count(*) FILTER (WHERE source LIKE 'gmail%')::int AS imported, count(*) FILTER (WHERE needs_review)::int AS needs_review
     FROM app.job_applications WHERE user_id = $1`,
    [userId],
  );
  return { imported: rows[0]?.imported ?? 0, needsReview: rows[0]?.needs_review ?? 0 };
}
