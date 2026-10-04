import { query } from './pool';

/** The shape the UI has always used (see services/jobApplicationService.ts). */
export interface ApplicationRecord {
  id: string;
  user_id: string;
  company_name: string;
  position: string;
  status: string;
  application_date: string;
  last_updated: string | null;
  location: string | null;
  job_posting_url: string | null;
  job_description: string | null;
  notes: string | null;
  resume_url: string | null;
  cover_letter_url: string | null;
  salary_range: string | null;
  employment_type: string | null;
  remote_option: boolean;
  contact_person: string | null;
  contact_email: string | null;
  interview_date: string | null;
  response_date: string | null;
  follow_up_date: string | null;
  priority: number;
  source: string | null;
  created_at: string;
  updated_at: string | null;
  resume_path?: string | null;
  cover_letter_path?: string | null;
}

export const APPLICATION_STATUSES = ['not_applied', 'applied', 'interviewing', 'offered', 'rejected', 'accepted', 'declined'] as const;

/** Fields a client may set. Ownership, ids and timestamps are never client-controlled. */
const WRITABLE = [
  'company_name', 'position', 'status', 'application_date', 'location', 'job_posting_url', 'job_description',
  'notes', 'salary_range', 'employment_type', 'remote_option', 'contact_person', 'contact_email',
  'interview_date', 'response_date', 'follow_up_date', 'priority', 'source', 'resume_url', 'cover_letter_url',
] as const;

const MAX_TEXT = 20_000;

interface Row extends Record<string, unknown> {
  id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

function toRecord(r: Row): ApplicationRecord {
  const out = { ...r } as Record<string, unknown>;
  out.created_at = r.created_at.toISOString();
  out.updated_at = r.updated_at.toISOString();
  out.last_updated = out.updated_at;
  out.remote_option = Boolean(r.remote_option);
  out.priority = Number(r.priority ?? 1);
  delete out.generated_at;
  delete out.generated_with;
  return out as unknown as ApplicationRecord;
}

export class ApplicationValidationError extends Error {}

function clean(input: Record<string, unknown>, requireCore: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE) {
    if (!(key in input)) continue;
    let v = input[key];
    if (key === 'remote_option') v = Boolean(v);
    else if (key === 'priority') v = Math.min(5, Math.max(1, Math.round(Number(v) || 1)));
    else if (v === '' || v === undefined) v = null;
    else if (v !== null) v = String(v).slice(0, MAX_TEXT);
    out[key] = v;
  }
  if (out.status !== undefined && !(APPLICATION_STATUSES as readonly string[]).includes(out.status as string)) {
    throw new ApplicationValidationError(`Unknown status "${String(out.status)}".`);
  }
  if (requireCore) {
    if (!out.company_name || !out.position) throw new ApplicationValidationError('Company and position are required.');
  } else {
    for (const k of ['company_name', 'position']) {
      if (k in out && !out[k]) throw new ApplicationValidationError(`${k} cannot be empty.`);
    }
  }
  return out;
}

export async function listApplications(userId: string): Promise<ApplicationRecord[]> {
  const { rows } = await query<Row>(
    `SELECT * FROM app.job_applications WHERE user_id = $1
     ORDER BY application_date DESC NULLS LAST, created_at DESC LIMIT 1000`,
    [userId],
  );
  return rows.map(toRecord);
}

export async function getApplication(userId: string, id: string): Promise<ApplicationRecord | null> {
  const { rows } = await query<Row>('SELECT * FROM app.job_applications WHERE user_id = $1 AND id = $2', [userId, id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function createApplication(userId: string, input: Record<string, unknown>): Promise<ApplicationRecord> {
  const data = clean(input, true);
  if (!data.application_date) data.application_date = new Date().toISOString();
  const cols = Object.keys(data);
  const { rows } = await query<Row>(
    `INSERT INTO app.job_applications (user_id, ${cols.join(', ')})
     VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING *`,
    [userId, ...cols.map((c) => data[c])],
  );
  return toRecord(rows[0]);
}

export async function updateApplication(userId: string, id: string, input: Record<string, unknown>): Promise<ApplicationRecord | null> {
  const data = clean(input, false);
  const cols = Object.keys(data);
  if (!cols.length) return getApplication(userId, id);
  const { rows } = await query<Row>(
    `UPDATE app.job_applications SET ${cols.map((c, i) => `${c} = $${i + 3}`).join(', ')}
     WHERE user_id = $1 AND id = $2 RETURNING *`,
    [userId, id, ...cols.map((c) => data[c])],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function deleteApplication(userId: string, id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM app.job_applications WHERE user_id = $1 AND id = $2', [userId, id]);
  return (rowCount ?? 0) > 0;
}

export interface DocumentLinks {
  resumeUrl: string;
  coverLetterUrl: string;
  resumePath: string;
  coverLetterPath: string;
  resumeTexPath: string;
  coverLetterTexPath: string;
}

/** Called by the generation pipeline; only touches the caller's own application. */
export async function attachDocumentLinks(userId: string, id: string, l: DocumentLinks): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE app.job_applications SET resume_url = $3, cover_letter_url = $4, resume_path = $5,
       cover_letter_path = $6, resume_tex_path = $7, cover_letter_tex_path = $8,
       generated_with = 'latex', generated_at = now()
     WHERE user_id = $1 AND id = $2`,
    [userId, id, l.resumeUrl, l.coverLetterUrl, l.resumePath, l.coverLetterPath, l.resumeTexPath, l.coverLetterTexPath],
  );
  return (rowCount ?? 0) > 0;
}
