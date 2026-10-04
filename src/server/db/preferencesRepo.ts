import { query } from './pool';

type Prefs = Record<string, unknown>;

const MAX_BYTES = 100_000;

export async function getPreferences(userId: string): Promise<Prefs | null> {
  const { rows } = await query<{ preferences: Prefs }>('SELECT preferences FROM app.job_preferences WHERE user_id = $1', [userId]);
  return rows[0]?.preferences ?? null;
}

/** Replace the user's saved preferences. */
export async function savePreferences(userId: string, preferences: Prefs): Promise<Prefs> {
  const body = JSON.stringify(preferences);
  if (body.length > MAX_BYTES) throw new Error('Preferences are too large.');
  const { rows } = await query<{ preferences: Prefs }>(
    `INSERT INTO app.job_preferences (user_id, preferences) VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences RETURNING preferences`,
    [userId, body],
  );
  return rows[0].preferences;
}

export async function deletePreferences(userId: string): Promise<void> {
  await query('DELETE FROM app.job_preferences WHERE user_id = $1', [userId]);
}
