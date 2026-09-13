import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildDocument } from '../buildDocument';
import { TexapiCompiler } from './texapi';
import { LatexCompileError } from './types';

/**
 * Live compile against Texapi. Skipped unless TEXAPI_KEY is set, so CI and
 * ordinary `pnpm test` runs stay offline and fast:
 *
 *   TEXAPI_KEY=... pnpm test
 *
 * These are slow on purpose. Texapi disguises rate limiting as HTTP 422, so
 * TexapiCompiler pauses 20s and re-checks before reporting a compile failure —
 * the invalid-document case therefore takes ~25s by design.
 */
const key = process.env.TEXAPI_KEY;
const suite = key ? describe : describe.skip;

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

/** Pull the text layer out of a PDF — this is roughly what an ATS sees. */
async function extractText(pdf: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;

  let text = '';
  for (let i = 1; i <= doc.numPages; i += 1) {
    const content = await (await doc.getPage(i)).getTextContent();
    text += content.items.map((item: any) => item.str).join(' ') + ' ';
  }
  return text.replace(/\s+/g, ' ').trim();
}

suite('Texapi live compilation', () => {
  // Built lazily: describe.skip still evaluates the suite body, so constructing
  // this at suite level threw "TEXAPI_KEY is not configured" during collection
  // and failed the whole offline run.
  const compiler = () => new TexapiCompiler(key!);

  it('compiles the resume template and preserves its content', async () => {
    const tex = buildDocument(read('src/server/latex/templates/example-body.tex'), 'resume');
    const { pdf } = await compiler().compile(tex);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

    const text = await extractText(pdf);

    // Every section heading must survive into the text layer.
    for (const heading of [
      'Professional Summary',
      'Technical Skills',
      'Experience',
      'Education',
      'Projects',
      'Certifications',
    ]) {
      expect(text).toContain(heading);
    }

    // Content from each macro type.
    expect(text).toContain('Jane Q. Developer');
    expect(text).toContain('Staff Software Engineer');
    expect(text).toContain('Stanford University');
    expect(text).toContain('OpenTrace');
    expect(text).toContain('Certified Kubernetes Administrator');

    // Escaped specials must render as themselves, not vanish or break.
    // A stray unescaped % silently swallows the rest of its line, so this
    // assertion is what proves escapeSpecials survived the round trip.
    expect(text).toContain('43%');
    expect(text).toContain('99.99%');
    expect(text).toContain('$1.2M');
    expect(text).toContain('Kafka & Flink');

    // No macro name should ever leak into rendered output.
    expect(text).not.toMatch(/\\res|resifempty|resentryline/);
  }, 120_000);

  it('compiles the cover letter template', async () => {
    const body = [
      '\\clheader{Jane Q. Developer}{jane@example.com \\cldot (555) 010-2030}',
      '\\clmeta{1 March 2026}{Acme Corp}{San Francisco, CA}',
      '\\clgreeting{Dear Hiring Manager,}',
      '\\clpara{I am applying for the Staff Engineer role at Acme Corp, where I cut p99 latency 43%.}',
      '\\clpara{My work on Kafka & Flink pipelines maps directly onto what the role needs.}',
      '\\clpara{Thank you for your consideration.}',
      '\\clsignoff{Sincerely,}{Jane Q. Developer}',
    ].join('\n');

    const { pdf } = await compiler().compile(buildDocument(body, 'coverLetter'));
    const text = await extractText(pdf);

    expect(text).toContain('Acme Corp');
    expect(text).toContain('Dear Hiring Manager,');
    expect(text).toContain('43%');
    expect(text).toContain('Kafka & Flink');
  }, 120_000);

  it('reports a genuine compile failure', async () => {
    // Bypasses our sanitizer deliberately: this is about the compiler's own
    // error signalling, not our validation.
    const broken = '\\documentclass{article}\n\\begin{document}\n\\undefinedmacro\n';

    await expect(compiler().compile(broken)).rejects.toBeInstanceOf(LatexCompileError);
  }, 180_000);
});
