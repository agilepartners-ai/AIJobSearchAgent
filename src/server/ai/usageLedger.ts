/**
 * Token and cost accounting.
 *
 * Every model call reports how many tokens it used. They are summed per user
 * per day (next to the generation quota, in app.usage_daily) and per model per
 * day for the whole app (app.usage_system_daily), so spend can be read with SQL
 * instead of estimated from a bill.
 *
 * Prices are not hard-coded because they change: set GEMINI_PRICE_INPUT_PER_M
 * and GEMINI_PRICE_OUTPUT_PER_M (USD per million tokens, from
 * https://ai.google.dev/pricing) and cost is computed; leave them unset and
 * only tokens are recorded. Recording is best effort: it never blocks or fails
 * a generation.
 */
import { query } from '../db/pool';
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
    const model = usages[0].model;
    const rag = context.ragMode === 'rag' ? 1 : 0;
    const saved = rag ? context.charsSaved ?? 0 : 0;
    const cost = priced ? totals.cost : 0;
    // $1 calls, $2 prompt, $3 output, $4 cached, $5 cost, $6 rag generations, $7 chars saved, $8 user or model
    const args = [usages.length, totals.prompt, totals.output, totals.cached, cost, rag, saved];

    await Promise.all([
      query(
        `INSERT INTO app.usage_daily (user_id, day, llm_calls, prompt_tokens, output_tokens, cached_tokens, cost_usd, rag_generations, rag_chars_saved)
         VALUES ($8, (now() AT TIME ZONE 'utc')::date, $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, day) DO UPDATE SET
           llm_calls = app.usage_daily.llm_calls + $1, prompt_tokens = app.usage_daily.prompt_tokens + $2,
           output_tokens = app.usage_daily.output_tokens + $3, cached_tokens = app.usage_daily.cached_tokens + $4,
           cost_usd = app.usage_daily.cost_usd + $5, rag_generations = app.usage_daily.rag_generations + $6,
           rag_chars_saved = app.usage_daily.rag_chars_saved + $7, updated_at = now()`,
        [...args, userId],
      ),
      query(
        `INSERT INTO app.usage_system_daily (day, llm_calls, prompt_tokens, output_tokens, cached_tokens, cost_usd, rag_generations, rag_chars_saved, by_model)
         VALUES ((now() AT TIME ZONE 'utc')::date, $1, $2, $3, $4, $5, $6, $7,
                 jsonb_build_object($8::text, jsonb_build_object('llm_calls', $1::int, 'prompt_tokens', $2::bigint, 'output_tokens', $3::bigint)))
         ON CONFLICT (day) DO UPDATE SET
           llm_calls = app.usage_system_daily.llm_calls + $1, prompt_tokens = app.usage_system_daily.prompt_tokens + $2,
           output_tokens = app.usage_system_daily.output_tokens + $3, cached_tokens = app.usage_system_daily.cached_tokens + $4,
           cost_usd = app.usage_system_daily.cost_usd + $5, rag_generations = app.usage_system_daily.rag_generations + $6,
           rag_chars_saved = app.usage_system_daily.rag_chars_saved + $7,
           by_model = app.usage_system_daily.by_model || jsonb_build_object($8::text, jsonb_build_object(
             'llm_calls', COALESCE((app.usage_system_daily.by_model->$8::text->>'llm_calls')::int, 0) + $1::int,
             'prompt_tokens', COALESCE((app.usage_system_daily.by_model->$8::text->>'prompt_tokens')::bigint, 0) + $2::bigint,
             'output_tokens', COALESCE((app.usage_system_daily.by_model->$8::text->>'output_tokens')::bigint, 0) + $3::bigint))`,
        [...args, model],
      ),
    ]);
  } catch (error) {
    console.warn('[usage] Could not record token usage:', error instanceof Error ? error.message : error);
  }
}
