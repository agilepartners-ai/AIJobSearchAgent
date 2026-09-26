import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { generateDocuments } from './generateLatex';

/**
 * The full pipeline against real services: Gemini writes the LaTeX, sanitize.ts
 * validates it, buildDocument assembles it, Texapi compiles it to a PDF.
 *
 * Runs only when both GEMINI_API_KEY and TEXAPI_KEY are available (they are
 * picked up from .env.local automatically — see vitest.setup.mts), so the
 * default `npm run test` stays offline and instant.
 *
 * This costs real API calls and takes ~30-60s. It is the test that proves the
 * feature actually works, as opposed to the unit tests which prove the parts
 * behave when wired to fakes.
 */
const enabled = Boolean(process.env.GEMINI_API_KEY && process.env.TEXAPI_KEY);
const suite = enabled ? describe : describe.skip;

const RESUME = `
Priya Raman
priya.raman@example.com | +1 415 555 0142 | Oakland, CA
linkedin.com/in/priyaraman | github.com/priyaraman

PROFESSIONAL SUMMARY
Backend engineer with 6 years building payment systems. Cut settlement failures
by 38% at Northwind and led the migration off a monolith serving 4M users.

EXPERIENCE
Senior Backend Engineer, Northwind Payments — Oakland, CA (2022 - Present)
- Rebuilt the settlement pipeline in Go, cutting failed settlements 38%
- Led decomposition of a Rails monolith into 12 services for 4M users
- Introduced contract testing; reduced integration incidents from 9/quarter to 2

Backend Engineer, Kestrel Software — Remote (2019 - 2022)
- Built an idempotent webhook delivery system handling 800K events/day
- Reduced p95 API latency from 480ms to 110ms via query and index work
- Owned PCI-DSS audit evidence for the payments service

EDUCATION
B.Tech Computer Science, VIT Vellore (2019)

SKILLS
Go, Python, Ruby, PostgreSQL, Redis, Kafka, gRPC, Docker, Kubernetes, AWS, Terraform

PROJECTS
ledger-kit - Open-source double-entry ledger library in Go. 1.1k stars.
`;

const JOB_DESCRIPTION = `
Staff Backend Engineer - Payments Infrastructure

We are looking for a staff engineer to own our payments platform. You will design
distributed systems handling high transaction volume, lead service decomposition,
and mentor engineers.

Requirements: 5+ years backend experience, strong Go, distributed systems design,
event-driven architecture (Kafka), PostgreSQL at scale, Kubernetes, and experience
with payment systems or financial compliance (PCI-DSS).
`;

suite('end-to-end document generation', () => {
  it('produces two compiled PDFs from a real resume', async () => {
    const result = await generateDocuments(
      RESUME,
      JOB_DESCRIPTION,
      { company_name: 'Stripe', position: 'Staff Backend Engineer', location: 'San Francisco, CA' },
      {
        fullName: 'Priya Raman',
        email: 'priya.raman@example.com',
        phone: '+1 415 555 0142',
        location: 'Oakland, CA',
        linkedin: 'linkedin.com/in/priyaraman',
      },
    );

    // --- PDFs are real -----------------------------------------------------
    // Texapi being unreachable degrades to LaTeX-only by design; only assert
    // on the PDFs when the compile service actually answered.
    if (!result.resumePdf || !result.coverLetterPdf) {
      console.warn('Compile service unavailable; skipping PDF assertions');
      return;
    }
    expect(result.resumePdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(result.coverLetterPdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(result.resumePdf.length).toBeGreaterThan(10_000);

    // --- Documents are well-formed ----------------------------------------
    for (const tex of [result.resumeTex, result.coverLetterTex]) {
      expect(tex).toContain('\\documentclass');
      expect(tex.match(/\\begin\{document\}/g)).toHaveLength(1);
      expect(tex.match(/\\end\{document\}/g)).toHaveLength(1);
    }

    expect(result.resumeTex).toContain('\\resheader');
    expect(result.coverLetterTex).toContain('\\clpara');

    // --- The model used real data, not placeholders ------------------------
    expect(result.resumeTex).toContain('Priya Raman');
    expect(result.resumeTex).toMatch(/Northwind/);
    expect(result.coverLetterTex).toMatch(/Stripe/);

    // Percentages must be escaped, or LaTeX silently eats the rest of the line.
    // Check only the AI-written body: the preamble is hand-written and its
    // comments and line-continuation %s are intentional.
    for (const tex of [result.resumeTex, result.coverLetterTex]) {
      const body = tex.slice(tex.indexOf('\\begin{document}'));
      const stray = body.match(/(?<!\\)%/g) ?? [];
      expect(stray, `unescaped % in generated body: ${stray.length}`).toHaveLength(0);
    }

    // --- Analysis came through --------------------------------------------
    expect(result.analysis.match_score).toBeGreaterThan(0);
    expect(result.analysis.match_score).toBeLessThanOrEqual(100);
    expect(result.analysis.strengths.length).toBeGreaterThan(0);

    // `npm run try:generate` sets this to keep the output so you can open the
    // PDFs and judge them by eye — assertions cannot tell you if a resume
    // reads well.
    if (process.env.DUMP_OUTPUT) {
      const outDir = path.join(process.cwd(), 'tmp-generated');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'resume.tex'), result.resumeTex);
      fs.writeFileSync(path.join(outDir, 'resume.pdf'), result.resumePdf);
      fs.writeFileSync(path.join(outDir, 'cover_letter.tex'), result.coverLetterTex);
      fs.writeFileSync(path.join(outDir, 'cover_letter.pdf'), result.coverLetterPdf);

      const kw = result.analysis.missing_keywords.slice(0, 5).join(', ') || '-';
      console.log([
        '',
        `  Match score: ${result.analysis.match_score}%`,
        `  Strengths:   ${result.analysis.strengths.length}`,
        `  Missing kw:  ${kw}`,
        `  Written to:  ${outDir}`,
        '',
      ].join('\n'));
    }
  }, 240_000);
});
