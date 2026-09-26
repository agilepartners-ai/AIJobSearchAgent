import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildDocument } from '../../../server/latex/buildDocument';
import { extractBody, resumeFromMacroBody } from './fromMacros';

const BODY = fs.readFileSync(path.join(process.cwd(), 'src/server/latex/templates/example-body.tex'), 'utf8');

describe('importing a full generated document', () => {
  // buildDocument returns preamble + body. The preamble's comments and
  // \newcommand lines mention every macro, and used to be imported as content:
  // the résumé arrived with a phantom "Experience" section of preamble examples.
  const full = buildDocument(BODY, 'resume');
  const doc = resumeFromMacroBody(full);

  it('produces exactly the sections in the body, with no phantom ones', () => {
    expect(doc.sections.map((s) => s.title)).toEqual([
      'Professional Summary',
      'Technical Skills',
      'Experience',
      'Education',
      'Projects',
      'Certifications',
    ]);
  });

  it('takes the name from the real header, not the preamble example', () => {
    expect(doc.personal.fullName).toBe('Jane Q. Developer');
  });

  it('matches importing the bare body', () => {
    const bare = resumeFromMacroBody(BODY);
    expect(doc.sections.map((s) => s.entries.length)).toEqual(bare.sections.map((s) => s.entries.length));
  });
});

describe('extractBody', () => {
  it('drops comments but keeps escaped percent signs', () => {
    const out = extractBody(String.raw`\resline{Grew 40\% YoY} % a comment \resrole{X}{Y}{Z}{W}`);
    expect(out).toContain(String.raw`40\% YoY`);
    expect(out).not.toContain('a comment');
  });

  it('returns the source unchanged when there is no document wrapper', () => {
    expect(extractBody(String.raw`\section{A}`)).toBe(String.raw`\section{A}`);
  });
});

describe('the document the server saves for the Studio', () => {
  it('validates against the schema and carries the analysis and cover letter', async () => {
    const { resumeFromGenerated } = await import('./fromGenerated');
    const { ResumeDocumentSchema } = await import('../schema');
    const resume = resumeFromGenerated(
      {
        resumeTex: buildDocument(BODY, 'resume'),
        coverLetterTex: 'cover',
        analysis: { match_score: 71, strengths: ['a'] },
      },
      { title: 'Senior Engineer', company: 'Acme', jobApplicationId: null },
    );
    // Missing optional analysis lists and no stored PDF (Storage down) must still be valid.
    expect(ResumeDocumentSchema.safeParse(resume).success).toBe(true);
    expect(resume.ai?.analysis.gaps).toEqual([]);
    expect(resume.ai?.coverLetter).toMatchObject({ tex: 'cover', url: '', path: '' });
    expect(JSON.stringify(resume)).not.toContain('undefined');
    expect(resume.title).toBe('Senior Engineer – Acme');
  });
});
