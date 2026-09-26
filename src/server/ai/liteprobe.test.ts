/**
 * Live probe, not a regression test: runs one real generation on the configured
 * model and reports tokens, latency and whether the output survives our own
 * parser. Runs only with LITE_PROBE=1 (it spends real quota):
 *
 *   LITE_PROBE=1 GEMINI_MODEL=gemini-flash-lite-latest pnpm vitest run liteprobe
 */
import { describe, expect, it } from 'vitest';
import { resumeFromGenerated } from '../../lib/resume/import/fromGenerated';
import { generateDocuments } from './generateLatex';
import type { TokenUsage } from './gemini';

const RESUME = `Priya Raman
priya.raman@example.com | +91 98765 43210 | Bengaluru, India | linkedin.com/in/priyaraman

SUMMARY
Frontend engineer with 4 years building React and TypeScript applications for fintech products.

EXPERIENCE
Frontend Engineer, Finlytics, Bengaluru — Jun 2022 to Present
- Rebuilt the onboarding flow in React and TypeScript, cutting drop-off by 18%.
- Introduced Jest and React Testing Library, raising coverage from 22% to 71%.
- Led migration of a legacy Angular dashboard to Next.js, improving load time by 40%.
Junior Developer, Webcraft, Pune — Jul 2020 to May 2022
- Built REST integrations in Node.js and Express for 12 client sites.

EDUCATION
B.Tech Computer Science, VIT Vellore, 2016 - 2020

SKILLS
React, TypeScript, Next.js, Node.js, GraphQL, Jest, Tailwind CSS, Git`;

const JOB = `Senior React Developer at Acme Payments (Remote).
We need 3+ years of React and TypeScript, experience with GraphQL, automated testing (Jest, Cypress) and performance work. Kubernetes is a plus.
Acme is an equal opportunity employer.`;

describe.runIf(process.env.LITE_PROBE === '1')('live generation probe', () => {
  it('produces parseable output on the configured model', async () => {
    const usages: TokenUsage[] = [];
    const started = Date.now();
    const result = await generateDocuments(RESUME, JOB, { position: 'Senior React Developer', company_name: 'Acme Payments' }, {}, {
      onUsage: (u) => usages.push(u),
    });
    const ms = Date.now() - started;

    const studio = resumeFromGenerated(result, { title: 'Senior React Developer', company: 'Acme Payments' });
    const summary = {
      model: usages[0]?.model,
      calls: usages.length,
      promptTokens: usages.reduce((n, u) => n + u.promptTokens, 0),
      outputTokens: usages.reduce((n, u) => n + u.outputTokens, 0),
      cachedTokens: usages.reduce((n, u) => n + u.cachedTokens, 0),
      seconds: Math.round(ms / 100) / 10,
      pdfs: Boolean(result.resumePdf),
      matchScore: result.analysis.match_score,
      sections: studio.sections.map((s) => `${s.title}(${s.entries.length})`),
      name: studio.personal.fullName,
      email: studio.personal.email,
      inventedNumbers: (result.resumeTex.match(/\d+%/g) ?? []).filter((p) => !RESUME.includes(p)),
    };
    process.stderr.write(`\nPROBE ${JSON.stringify(summary, null, 2)}\n`);

    expect(usages.length).toBeGreaterThanOrEqual(1);
    expect(studio.sections.length).toBeGreaterThanOrEqual(3);
    expect(studio.personal.fullName).toMatch(/Priya/);
  }, 180_000);
});
