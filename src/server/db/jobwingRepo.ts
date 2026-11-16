/**
 * JobWing link: a personal code the plugin uses instead of a login (a Supabase session expires within the hour, a scheduled
 * run at 21:30 cannot sign in). The code only reaches the sync route, and only ever touches the owner's own rows.
 */
import { createHash, randomBytes } from 'node:crypto';
import { query, withTransaction } from './pool';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export const DAILY_ROW_LIMIT = 2000;

/** Make (or replace) the user's link code. Shown once; only its hash is kept. */
export async function createLinkCode(userId: string): Promise<string> {
  const code = `jwk_${randomBytes(32).toString('base64url')}`;
  await query(
    `INSERT INTO app.jobwing_links (user_id, token_hash) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, created_at = now(), last_used_at = NULL`,
    [userId, sha(code)],
  );
  return code;
}

export async function revokeLinkCode(userId: string): Promise<void> {
  await query('DELETE FROM app.jobwing_links WHERE user_id = $1', [userId]);
}

export async function linkInfo(userId: string): Promise<{ linked: boolean; createdAt: string | null; lastUsedAt: string | null; synced: number }> {
  const l = await query<{ created_at: Date; last_used_at: Date | null }>('SELECT created_at, last_used_at FROM app.jobwing_links WHERE user_id = $1', [userId]);
  const n = await query<{ n: number }>('SELECT COUNT(*) n FROM app.job_applications WHERE user_id = $1 AND external_key IS NOT NULL', [userId]);
  const row = l.rows[0];
  return { linked: !!row, createdAt: row?.created_at.toISOString() ?? null, lastUsedAt: row?.last_used_at?.toISOString() ?? null, synced: Number(n.rows[0]?.n ?? 0) };
}

/** The user a code belongs to, or null. */
export async function userForCode(code: string | undefined | null): Promise<string | null> {
  if (!code || !/^jwk_[A-Za-z0-9_-]{20,100}$/.test(code)) return null;
  const { rows } = await query<{ user_id: string }>('UPDATE app.jobwing_links SET last_used_at = now() WHERE token_hash = $1 RETURNING user_id', [sha(code)]);
  return rows[0]?.user_id ?? null;
}

export const STATUSES = ['not_applied', 'applied', 'interviewing', 'offered', 'rejected', 'accepted', 'declined'] as const;
const RANK: Record<string, number> = { not_applied: 0, applied: 1, interviewing: 2, offered: 3, accepted: 4, rejected: 4, declined: 4 };

export interface SyncItem {
  external_key: string;
  company_name: string;
  position: string;
  status: string;
  location?: string | null;
  job_posting_url?: string | null;
  job_description?: string | null;
  salary_range?: string | null;
  employment_type?: string | null;
  remote_option?: boolean;
  source?: string | null;
  priority?: number;
  notes?: string | null;
}

const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.slice(0, max) : null);

/** Parse and bound one pushed item; null if it is not usable. */
export function cleanItem(raw: unknown): SyncItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const key = text(r.external_key, 200);
  const company = text(r.company_name, 300);
  const position = text(r.position, 300);
  if (!key || !company || !position) return null;
  const status = typeof r.status === 'string' && (STATUSES as readonly string[]).includes(r.status) ? r.status : 'not_applied';
  const url = text(r.job_posting_url, 2000);
  return {
    external_key: key,
    company_name: company,
    position,
    status,
    location: text(r.location, 300),
    job_posting_url: url && /^https?:\/\//i.test(url) ? url : null,
    job_description: text(r.job_description, 20_000),
    salary_range: text(r.salary_range, 200),
    employment_type: text(r.employment_type, 100),
    remote_option: Boolean(r.remote_option),
    source: text(r.source, 120),
    priority: Math.min(5, Math.max(1, Math.round(Number(r.priority) || 1))),
    notes: text(r.notes, 5000),
  };
}

/**
 * Upsert the items. The status only moves forward from the plugin's side: if the user (or Gmail sync) has already moved a row
 * further on the website, their status is kept and returned in `changes` so the plugin can adopt it.
 */
export async function syncApplications(userId: string, items: SyncItem[]): Promise<{ upserted: number; changes: { external_key: string; status: string; interview_date: string | null }[] }> {
  const day = new Date().toISOString().slice(0, 10);
  const used = await query<{ day_date: Date | null; day_count: number }>('SELECT day_date::text AS day_date, day_count FROM app.jobwing_links WHERE user_id = $1', [userId]);
  const today = String(used.rows[0]?.day_date) === day ? Number(used.rows[0]?.day_count ?? 0) : 0;
  if (today + items.length > DAILY_ROW_LIMIT) throw new Error('Daily sync limit reached.');

  return withTransaction(async (tx) => {
    const keys = items.map((i) => i.external_key);
    const { rows: existing } = await tx.query<{ external_key: string; status: string; interview_date: Date | null }>(
      'SELECT external_key, status, interview_date FROM app.job_applications WHERE user_id = $1 AND external_key = ANY($2::text[])',
      [userId, keys],
    );
    const have = new Map(existing.map((e) => [e.external_key, e]));
    const changes: { external_key: string; status: string; interview_date: string | null }[] = [];
    for (const i of items) {
      const cur = have.get(i.external_key);
      let status = i.status;
      if (cur && (RANK[cur.status] ?? 0) > (RANK[i.status] ?? 0)) {
        status = cur.status;
        changes.push({ external_key: i.external_key, status: cur.status, interview_date: cur.interview_date ? cur.interview_date.toISOString().slice(0, 10) : null });
      }
      await tx.query(
        `INSERT INTO app.job_applications
           (user_id, external_key, company_name, position, status, application_date, location, job_posting_url, job_description, salary_range, employment_type, remote_option, source, priority, notes)
         VALUES ($1,$2,$3,$4,$5, CASE WHEN $5 = 'not_applied' THEN NULL ELSE now() END, $6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (user_id, external_key) WHERE external_key IS NOT NULL DO UPDATE SET
           company_name = EXCLUDED.company_name, position = EXCLUDED.position, status = $5,
           application_date = COALESCE(app.job_applications.application_date, EXCLUDED.application_date),
           location = EXCLUDED.location, job_posting_url = EXCLUDED.job_posting_url,
           job_description = COALESCE(EXCLUDED.job_description, app.job_applications.job_description),
           salary_range = EXCLUDED.salary_range, employment_type = EXCLUDED.employment_type, remote_option = EXCLUDED.remote_option,
           source = EXCLUDED.source, priority = EXCLUDED.priority, notes = COALESCE(app.job_applications.notes, EXCLUDED.notes)`,
        [userId, i.external_key, i.company_name, i.position, status, i.location, i.job_posting_url, i.job_description, i.salary_range, i.employment_type, i.remote_option, i.source, i.priority, i.notes],
      );
    }
    await tx.query('UPDATE app.jobwing_links SET day_date = $2, day_count = $3 WHERE user_id = $1', [userId, day, today + items.length]);
    return { upserted: items.length, changes };
  });
}
