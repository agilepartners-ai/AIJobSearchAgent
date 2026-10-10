/**
 * The forwarded-mail path end to end against the real model (opt-in): raw email bytes -> MIME parse -> filter -> Gemini -> merge plan.
 *   GMAIL_LIVE=1 GMAIL_LLM=gemini pnpm exec vitest run src/server/gmail/inbound.live.test.ts
 * Half the fixtures are sent as HTML-only mail, the way real job-board emails arrive.
 */
import { describe, expect, it } from 'vitest';
import { extractFromMail } from './extract';
import { FIXTURES } from './fixtures';
import { parseRaw } from './inbound';
import { planMerge } from './merge';
import { boardFor, prefilter } from './prefilter';

const live = process.env.GMAIL_LIVE === '1' && Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

describe.runIf(live)('forwarded mail through the real model', { timeout: 120_000 }, () => {
  FIXTURES.forEach((f, i) => {
    it(`${f.name} (${i % 2 ? 'html' : 'plain'})`, async () => {
      const html = i % 2 === 1;
      const body = html
        ? `<html><body><div>${esc(f.mail.text).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`).replace(/\n/g, '<br>')}</div></body></html>`
        : f.mail.text;
      const bytes = new TextEncoder().encode(
        `From: "${f.mail.fromName}" <${f.mail.fromAddress}>\r\nTo: jobs+abcdefghijklmnopqrstuvwxyz@in.agilepartners-ai.com\r\nSubject: ${f.mail.subject}\r\nMessage-ID: <${f.mail.id}@t.example>\r\nDate: ${f.mail.receivedAt.toUTCString()}\r\nMIME-Version: 1.0\r\nContent-Type: text/${html ? 'html' : 'plain'}; charset=utf-8\r\n\r\n${body}\r\n`,
      );
      const mail = await parseRaw(bytes);
      expect(mail.subject).toBe(f.mail.subject);

      const verdict = prefilter({ fromDomain: mail.fromDomain, subject: mail.subject, snippet: mail.text.slice(0, 200) });
      if (f.name.startsWith('Job alert') || f.name.startsWith('Receipt')) return expect(verdict.candidate).toBe(false);
      expect(verdict.candidate).toBe(true);

      const { extraction: x, error } = await extractFromMail(mail);
      expect(error).toBeUndefined();
      expect(x).toBeTruthy();
      if (!x) return;
      process.stderr.write(`[${f.name}] ${JSON.stringify({ t: x.email_type, c: x.company, p: x.position, conf: x.confidence })}\n`);

      if (f.name.startsWith('Prompt injection')) {
        const plan = planMerge([], mail, x, boardFor(mail.fromDomain));
        expect(plan.action === 'create' && plan.fields.company_name === 'EvilCorp').toBe(false);
        return;
      }
      expect(x.is_job_related).toBe(f.expect.is_job_related);
      if (f.expect.email_type) expect(x.email_type).toBe(f.expect.email_type);
      if (f.expect.company) expect(x.company ?? '').toMatch(f.expect.company);
      if (f.expect.position) expect(x.position ?? '').toMatch(f.expect.position);
    });
  });
});
