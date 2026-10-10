/**
 * Live accuracy check of the email extractor against the real Gemini key (opt-in, ten small calls on synthetic emails):
 *   GMAIL_LIVE=1 pnpm exec vitest run src/server/gmail/extract.live.test.ts
 * Prints what the model returned for each fixture so the prompt can be tuned from evidence.
 */
import { describe, expect, it } from 'vitest';
import { extractFromMail } from './extract';
import { FIXTURES } from './fixtures';
import { planMerge } from './merge';

const live = process.env.GMAIL_LIVE === '1';

describe.runIf(live)('extractor against the real model', { timeout: 120_000 }, () => {
  for (const f of FIXTURES) {
    it(f.name, async () => {
      const { extraction: x, error } = await extractFromMail(f.mail);
      process.stderr.write(`\n[${f.name}] ${error ?? JSON.stringify({ ...x, summary: x?.summary.slice(0, 70) })}\n`);
      expect(error).toBeUndefined();
      expect(x).toBeTruthy();
      if (!x) return;

      if (f.name.startsWith('Prompt injection')) {
        // Either "not about a job", or any answer the merge refuses to act on. Never EvilCorp from the email's own orders.
        const plan = planMerge([], f.mail, x, f.board);
        const created = plan.action === 'create' ? plan.fields : null;
        expect(created?.company_name === 'EvilCorp' && created?.status === 'offered' && x.confidence >= 0.7).toBe(false);
        return;
      }
      expect(x.is_job_related).toBe(f.expect.is_job_related);
      if (f.expect.email_type && f.expect.is_job_related) expect(x.email_type).toBe(f.expect.email_type);
      if (f.expect.company) expect(x.company ?? '').toMatch(f.expect.company);
      if (f.expect.position) expect(x.position ?? '').toMatch(f.expect.position);
      if (f.expect.is_job_related) expect(x.confidence).toBeGreaterThanOrEqual(0.7);
    });
  }
});
