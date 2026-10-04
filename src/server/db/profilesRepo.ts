import { query } from './pool';

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
  // Free-form profile fields (location, bio, skills, links, …) live in `extras`.
  [extra: string]: unknown;
}

const COLUMNS = new Set(['email', 'full_name', 'phone']);

interface Row {
  user_id: string;
  email: string | null;
  full_name: string;
  phone: string;
  extras: Record<string, unknown>;
  created_at: Date;
}

function toProfile(r: Row): ProfileRow {
  return {
    ...r.extras,
    id: r.user_id,
    email: r.email ?? '',
    full_name: r.full_name,
    ...(r.phone ? { phone: r.phone } : {}),
    created_at: r.created_at.toISOString(),
  };
}

const SELECT = 'SELECT user_id, email, full_name, phone, extras, created_at FROM app.profiles WHERE user_id = $1';

/** First sign-in creates the row; later calls never overwrite what the user has edited. */
export async function getOrCreateProfile(userId: string, email: string | null, fullName: string): Promise<ProfileRow> {
  await query(
    `INSERT INTO app.profiles (user_id, email, full_name) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
    [userId, email, fullName.slice(0, 200)],
  );
  const { rows } = await query<Row>(SELECT, [userId]);
  return toProfile(rows[0]);
}

export async function updateProfile(userId: string, patch: Record<string, unknown>): Promise<ProfileRow> {
  const cols: Record<string, string> = {};
  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'id' || k === 'created_at') continue;
    if (COLUMNS.has(k) && typeof v === 'string') cols[k] = v.slice(0, 500);
    else if (!COLUMNS.has(k)) extras[k] = v;
  }
  await query(
    `INSERT INTO app.profiles (user_id, email, full_name, phone, extras)
     VALUES ($1, NULLIF($2, ''), COALESCE($3, ''), COALESCE($4, ''), $5::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET
       email     = COALESCE(NULLIF($2, '')::citext, app.profiles.email),
       full_name = COALESCE($3, app.profiles.full_name),
       phone     = COALESCE($4, app.profiles.phone),
       extras    = app.profiles.extras || $5::jsonb`,
    [userId, cols.email ?? '', cols.full_name ?? null, cols.phone ?? null, JSON.stringify(extras)],
  );
  const { rows } = await query<Row>(SELECT, [userId]);
  return toProfile(rows[0]);
}
