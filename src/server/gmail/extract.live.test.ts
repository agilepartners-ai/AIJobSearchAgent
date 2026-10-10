/**
 * Live accuracy check of the email extractor against real models (opt-in, ten small calls per provider, synthetic emails):
 *   GMAIL_LIVE=1 pnpm exec vitest run src/server/gmail/extract.live.test.ts
 * Needs CF_AI_ACCOUNT_ID + CF_AI_TOKEN for Workers AI and/or GEMINI_API_KEY for Gemini. Prints what each model returned,
 * the tokens it used and, at the end, the neurons and dollars that implies, so the choice of provider rests on numbers.
 *   GMAIL_LIVE_MODELS="@cf/meta/llama-3.1-8b-instruct,@cf/meta/llama-3.3-70b-instruct-fp8-fast"   (optional list)
 */
import { afterAll, describe, expect, it } from 'vitest';
import { generateText } from '../ai/gemini';
import { generateWithWorkersAi } from '../ai/workersAi';
import { extractFromMail, type Generate } from './extract';
import { FIXTURES } from './fixtures';
import { planMerge } from './merge';

const live = process.env.GMAIL_LIVE === '1';
const hasCf = Boolean(process.env.CF_AI_ACCOUNT_ID && process.env.CF_AI_TOKEN);
const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS);

// neurons per million tokens (input, output) from Cloudflare's pricing page, and Gemini USD per million tokens
const NEURONS: Record<string, [number, number]> = {
  '@cf/meta/llama-3.1-8b-instruct': [25_608, 75_147],
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': [26_668, 204_805],
};
const GEMINI_USD: [number, number] = [0.3, 2.5];

const runs: { name: string; generate: Generate; model?: string }[] = [];
if (hasCf) for (const m of (process.env.GMAIL_LIVE_MODELS || '@cf/meta/llama-3.1-8b-instruct').split(',')) runs.push({ name: `workers-ai ${m}`, model: m.trim(), generate: ((o) => { process.env.WORKERS_AI_MODEL = m.trim(); return generateWithWorkersAi(o); }) as Generate });
if (hasGemini && process.env.GMAIL_LIVE_GEMINI !== '0') runs.push({ name: 'gemini', generate: generateText });

describe.runIf(live)('extractor against real models', { timeout: 180_000 }, () => {
  for (const run of runs) {
    describe(run.name, () => {
      const totals = { input: 0, output: 0, ok: 0, n: 0 };
      afterAll(() => {
        const n = totals.n || 1;
        const neurons = run.model && NEURONS[run.model] ? (totals.input / 1e6) * NEURONS[run.model][0] + (totals.output / 1e6) * NEURONS[run.model][1] : null;
        const usd = !run.model ? (totals.input / 1e6) * GEMINI_USD[0] + (totals.output / 1e6) * GEMINI_USD[1] : null;
        process.stderr.write(
          `\n== ${run.name}: ${totals.ok}/${totals.n} correct · avg ${Math.round(totals.input / n)} in + ${Math.round(totals.output / n)} out tokens per email` +
            (neurons !== null ? ` · ${(neurons / n).toFixed(1)} neurons per email (${Math.floor(10_000 / (neurons / n))} emails/day free)` : '') +
            (usd !== null ? ` · $${(usd / n).toFixed(5)} per email` : '') + '\n',
        );
      });

      for (const f of FIXTURES) {
        it(f.name, async () => {
          const { extraction: x, error, usage } = await extractFromMail(f.mail, { generate: run.generate });
          totals.n += 1;
          totals.input += usage?.input ?? 0;
          totals.output += usage?.output ?? 0;
          process.stderr.write(`[${run.name} | ${f.name}] ${error ?? JSON.stringify({ t: x?.email_type, c: x?.company, p: x?.position, conf: x?.confidence, rel: x?.is_job_related })}\n`);
          expect(error).toBeUndefined();
          expect(x).toBeTruthy();
          if (!x) return;

          if (f.name.startsWith('Prompt injection')) {
            const plan = planMerge([], f.mail, x, f.board);
            const created = plan.action === 'create' ? plan.fields : null;
            expect(created?.company_name === 'EvilCorp' && x.confidence >= 0.7).toBe(false);
            totals.ok += 1;
            return;
          }
          expect(x.is_job_related).toBe(f.expect.is_job_related);
          if (f.expect.email_type && f.expect.is_job_related) expect(x.email_type).toBe(f.expect.email_type);
          if (f.expect.company) expect(x.company ?? '').toMatch(f.expect.company);
          if (f.expect.position) expect(x.position ?? '').toMatch(f.expect.position);
          if (f.expect.is_job_related) expect(x.confidence).toBeGreaterThanOrEqual(0.7);
          totals.ok += 1;
        });
      }
    });
  }
});
