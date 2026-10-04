/**
 * Daily generation quota.
 *
 * Reserve before the work, refund if the work fails. The reservation is a single
 * conditional upsert, so concurrent requests cannot both pass the check at 24/25.
 */
import { query } from './pool';

export const DAILY_GENERATION_LIMIT = 25;

export class QuotaExceededError extends Error {
  constructor(readonly used: number, readonly limit: number) {
    super(`Daily generation limit of ${limit} reached.`);
    this.name = 'QuotaExceededError';
  }
}

/** The database's UTC date, so a client cannot shift its own day boundary. */
const TODAY = "(now() AT TIME ZONE 'utc')::date";

/** @throws QuotaExceededError when the user is already at the limit. */
export async function reserveGeneration(userId: string): Promise<{ used: number; limit: number }> {
  const { rows } = await query<{ generations: number }>(
    `INSERT INTO app.usage_daily (user_id, day, generations) VALUES ($1, ${TODAY}, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET generations = app.usage_daily.generations + 1, updated_at = now()
       WHERE app.usage_daily.generations < $2
     RETURNING generations`,
    [userId, DAILY_GENERATION_LIMIT],
  );
  if (!rows.length) throw new QuotaExceededError(DAILY_GENERATION_LIMIT, DAILY_GENERATION_LIMIT);
  return { used: rows[0].generations, limit: DAILY_GENERATION_LIMIT };
}

/** Hand back a reservation when generation failed. Best effort: never masks the original error. */
export async function refundGeneration(userId: string): Promise<void> {
  try {
    await query(
      `UPDATE app.usage_daily SET generations = GREATEST(generations - 1, 0), updated_at = now()
       WHERE user_id = $1 AND day = ${TODAY}`,
      [userId],
    );
  } catch {
    // Intentionally swallowed.
  }
}

export async function getUsage(userId: string): Promise<{ used: number; limit: number }> {
  const { rows } = await query<{ generations: number }>(
    `SELECT generations FROM app.usage_daily WHERE user_id = $1 AND day = ${TODAY}`,
    [userId],
  );
  return { used: rows[0]?.generations ?? 0, limit: DAILY_GENERATION_LIMIT };
}

/** Mock interviews spend paid third-party credits, so each account gets a small daily cap. */
export const INTERVIEW_DAILY_LIMIT = 5;

export async function reserveInterview(userId: string): Promise<{ ok: boolean; limit: number }> {
  const { rows } = await query<{ interviews: number }>(
    `INSERT INTO app.usage_daily (user_id, day, interviews) VALUES ($1, ${TODAY}, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET interviews = app.usage_daily.interviews + 1, updated_at = now()
       WHERE app.usage_daily.interviews < $2
     RETURNING interviews`,
    [userId, INTERVIEW_DAILY_LIMIT],
  );
  return { ok: rows.length > 0, limit: INTERVIEW_DAILY_LIMIT };
}

export async function refundInterview(userId: string): Promise<void> {
  try {
    await query(
      `UPDATE app.usage_daily SET interviews = GREATEST(interviews - 1, 0), updated_at = now()
       WHERE user_id = $1 AND day = ${TODAY}`,
      [userId],
    );
  } catch {
    // Never mask the original error.
  }
}
