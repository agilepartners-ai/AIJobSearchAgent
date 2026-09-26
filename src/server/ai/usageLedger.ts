/**
 * Token and cost accounting.
 *
 * Every model call reports how many tokens it used. They are summed per user
 * per day (next to the generation quota, in users/{uid}/usage/{day}) and per
 * model per day for the whole app (system/usage_{day}), so spend can be read
 * off Firestore instead of estimated from a bill.
 *
 * Prices are not hard-coded because they change: set GEMINI_PRICE_INPUT_PER_M
 * and GEMINI_PRICE_OUTPUT_PER_M (USD per million tokens, from
 * https://ai.google.dev/pricing) and cost is computed; leave them unset and
 * only tokens are recorded. Recording is best effort: it never blocks or fails
 * a generation.
 */
import { admin, getFirestore } from '../firebase/admin';
import type { TokenUsage } from './gemini';

const today = () => new Date().toISOString().slice(0, 10);

const price = (name: string): number | null => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : null;
};

/**
 * USD for one call, or null when prices are not configured. Cached prompt
 * tokens bill at GEMINI_PRICE_CACHED_PER_M when set, else at the input rate
 * (an overestimate, which is the safe direction for a budget).
 */
export function estimateCostUsd(usage: Pick<TokenUsage, 'promptTokens' | 'outputTokens' | 'cachedTokens'>): number | null {
  const input = price('GEMINI_PRICE_INPUT_PER_M');
  const output = price('GEMINI_PRICE_OUTPUT_PER_M');
  if (input === null || output === null) return null;
  const cachedRate = price('GEMINI_PRICE_CACHED_PER_M') ?? input;
  const uncached = Math.max(0, usage.promptTokens - usage.cachedTokens);
  return (uncached * input + usage.cachedTokens * cachedRate + usage.outputTokens * output) / 1_000_000;
}

export interface UsageContext {
  ragMode?: 'plain' | 'rag';
  /** Characters removed from the résumé before sending. */
  charsSaved?: number;
}

export async function recordUsage(userId: string, usages: TokenUsage[], context: UsageContext = {}): Promise<void> {
  if (!usages.length) return;
  try {
    const inc = admin.firestore.FieldValue.increment;
    const totals = usages.reduce(
      (t, u) => ({
        prompt: t.prompt + u.promptTokens,
        output: t.output + u.outputTokens,
        cached: t.cached + u.cachedTokens,
        cost: t.cost + (estimateCostUsd(u) ?? 0),
      }),
      { prompt: 0, output: 0, cached: 0, cost: 0 },
    );
    const priced = usages.every((u) => estimateCostUsd(u) !== null);
    const model = usages[0].model.replace(/\./g, '_');

    const fields = {
      llm_calls: inc(usages.length),
      prompt_tokens: inc(totals.prompt),
      output_tokens: inc(totals.output),
      cached_tokens: inc(totals.cached),
      ...(priced ? { cost_usd: inc(totals.cost) } : {}),
      ...(context.ragMode === 'rag' ? { rag_generations: inc(1), rag_chars_saved: inc(context.charsSaved ?? 0) } : {}),
      last_updated: admin.firestore.FieldValue.serverTimestamp(),
    };
    const db = getFirestore();
    await Promise.all([
      db.collection('users').doc(userId).collection('usage').doc(today()).set(fields, { merge: true }),
      db
        .collection('system')
        .doc(`usage_${today()}`)
        .set({ ...fields, by_model: { [model]: { llm_calls: inc(usages.length), prompt_tokens: inc(totals.prompt), output_tokens: inc(totals.output) } } }, { merge: true }),
    ]);
  } catch (error) {
    console.warn('[usage] Could not record token usage:', error instanceof Error ? error.message : error);
  }
}
