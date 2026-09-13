/**
 * Daily generation quota.
 *
 * The previous implementation had two holes:
 *   - /api/enhance-with-ai only *read* the counter and the client called it
 *     before opening the modal. The actual Gemini call then ran in the browser,
 *     so skipping the check cost nothing.
 *   - The counter was only incremented in save-generated-pdfs, which ran after
 *     a successful upload tied to a job application. Generations that failed,
 *     or that had no application attached, were free.
 *
 * Now: reserve before the work, refund if the work fails, inside a transaction
 * so concurrent requests cannot both pass the check at 24/25.
 */
import { admin, getFirestore } from './admin';

export const DAILY_GENERATION_LIMIT = 25;

export class QuotaExceededError extends Error {
  constructor(readonly used: number, readonly limit: number) {
    super(`Daily generation limit of ${limit} reached.`);
    this.name = 'QuotaExceededError';
  }
}

/** Server-side date key, so a client cannot shift its own day boundary. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function usageDoc(userId: string) {
  return getFirestore().collection('users').doc(userId).collection('usage').doc(todayKey());
}

/**
 * Atomically claim one generation.
 * @throws QuotaExceededError when the user is already at the limit.
 */
export async function reserveGeneration(userId: string): Promise<{ used: number; limit: number }> {
  const ref = usageDoc(userId);

  return getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used: number = snap.exists ? snap.data()?.total_generations ?? 0 : 0;

    if (used >= DAILY_GENERATION_LIMIT) {
      throw new QuotaExceededError(used, DAILY_GENERATION_LIMIT);
    }

    tx.set(
      ref,
      {
        total_generations: used + 1,
        last_updated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { used: used + 1, limit: DAILY_GENERATION_LIMIT };
  });
}

/**
 * Hand back a reservation when generation failed, so a Gemini outage does not
 * silently burn the user's daily allowance. Best-effort: a failure to refund
 * must never mask the original error.
 */
export async function refundGeneration(userId: string): Promise<void> {
  try {
    await usageDoc(userId).set(
      {
        total_generations: admin.firestore.FieldValue.increment(-1),
        last_updated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    // Intentionally swallowed — see above.
  }
}

/** Read-only check, for showing remaining quota in the UI. */
export async function getUsage(userId: string): Promise<{ used: number; limit: number }> {
  const snap = await usageDoc(userId).get();
  return {
    used: snap.exists ? snap.data()?.total_generations ?? 0 : 0,
    limit: DAILY_GENERATION_LIMIT,
  };
}
