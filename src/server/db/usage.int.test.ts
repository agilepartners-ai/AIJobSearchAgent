/**
 * Live test of the daily limit against the real database (opt-in):
 *   RUN_DB_TESTS=1 pnpm exec vitest run src/server/db/usage.int.test.ts
 * Uses random user ids and deletes their rows afterwards.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { closePool, query } from './pool';
import { DAILY_GENERATION_LIMIT, INTERVIEW_DAILY_LIMIT, QuotaExceededError, getUsage, refundGeneration, reserveGeneration, reserveInterview } from './usage';

const live = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const users = [randomUUID(), randomUUID()];

describe.skipIf(!live)('daily limits (live database)', { timeout: 30_000 }, () => {
  afterAll(async () => {
    for (const u of users) await query('DELETE FROM app.usage_daily WHERE user_id = $1', [u]);
    await closePool();
  });

  it('is 5 generations per account per day', () => {
    expect(DAILY_GENERATION_LIMIT).toBe(5);
  });

  it('allows exactly the limit, then refuses the next', async () => {
    for (let i = 1; i <= DAILY_GENERATION_LIMIT; i += 1) {
      expect((await reserveGeneration(users[0])).used).toBe(i);
    }
    await expect(reserveGeneration(users[0])).rejects.toBeInstanceOf(QuotaExceededError);
    expect((await getUsage(users[0])).used).toBe(DAILY_GENERATION_LIMIT);
  });

  it('counts each account separately', async () => {
    expect((await reserveGeneration(users[1])).used).toBe(1);
  });

  it('gives a failed generation its slot back', async () => {
    await refundGeneration(users[0]);
    expect((await getUsage(users[0])).used).toBe(DAILY_GENERATION_LIMIT - 1);
    await expect(reserveGeneration(users[0])).resolves.toMatchObject({ used: DAILY_GENERATION_LIMIT });
  });

  it('cannot be beaten by firing every request at once', async () => {
    const racer = randomUUID();
    users.push(racer);
    const results = await Promise.allSettled(Array.from({ length: DAILY_GENERATION_LIMIT + 6 }, () => reserveGeneration(racer)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(DAILY_GENERATION_LIMIT);
    expect((await getUsage(racer)).used).toBe(DAILY_GENERATION_LIMIT);
  });

  it('caps mock interviews separately', async () => {
    const u = randomUUID();
    users.push(u);
    for (let i = 0; i < INTERVIEW_DAILY_LIMIT; i += 1) expect((await reserveInterview(u)).ok).toBe(true);
    expect((await reserveInterview(u)).ok).toBe(false);
  });
});
