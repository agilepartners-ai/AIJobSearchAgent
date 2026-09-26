import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __setCompiler, LatexCompileError } from '../latex/compile';
import type { LatexCompiler } from '../latex/compile';
import { LatexValidationError } from '../latex/sanitize';

const generateTextMock = vi.fn();

// vi.mock is hoisted above the imports, so a static import of generateLatex
// still receives the mocked gemini module.
vi.mock('./gemini', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  GeminiError: class GeminiError extends Error {},
}));

// eslint-disable-next-line import/first
import { generateDocuments } from './generateLatex';

const FAKE_PDF = Buffer.from('%PDF-1.7\nfake\n');

const stubCompiler: LatexCompiler = {
  name: 'stub',
  compile: async () => ({ pdf: FAKE_PDF }),
};

function response({
  analysis = '{"match_score":82,"strengths":["Go"],"gaps":["Rust"],"suggestions":["Add metrics"],"present_keywords":["Go"],"missing_keywords":["Rust"]}',
  resume = '\\resheader{Jane Doe}{jane@example.com}\n\\section{Experience}\n\\resrole{Engineer}{Acme}{Remote}{2020 -- Present}',
  coverLetter = '\\clheader{Jane Doe}{jane@example.com}\n\\clgreeting{Dear Hiring Manager,}\n\\clpara{Hello.}',
} = {}) {
  return `<<<ANALYSIS>>>\n${analysis}\n<<<RESUME>>>\n${resume}\n<<<COVER_LETTER>>>\n${coverLetter}\n`;
}

describe('generateDocuments', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    __setCompiler(stubCompiler);
  });

  it('splits the delimited response into analysis and two documents', async () => {
    generateTextMock.mockResolvedValue(response());

    const result = await generateDocuments('a resume that is long enough to pass', 'a job');

    expect(result.analysis.match_score).toBe(82);
    expect(result.analysis.strengths).toEqual(['Go']);
    expect(result.resumeTex).toContain('\\resheader{Jane Doe}');
    expect(result.resumeTex).toContain('\\begin{document}');
    expect(result.coverLetterTex).toContain('\\clgreeting');
    expect(result.resumePdf).toEqual(FAKE_PDF);
  });

  it('repairs unescaped specials coming back from the model', async () => {
    generateTextMock.mockResolvedValue(
      response({ resume: '\\resline{Grew revenue 40% across R&D on a $2M budget.}' }),
    );

    const result = await generateDocuments('a resume that is long enough to pass', 'a job');

    expect(result.resumeTex).toContain('40\\%');
    expect(result.resumeTex).toContain('R\\&D');
    expect(result.resumeTex).toContain('\\$2M');
  });

  it('survives a malformed analysis block rather than losing the documents', async () => {
    // The analysis only drives score badges. Losing it must not cost the user
    // the documents they spent a daily generation on.
    generateTextMock.mockResolvedValue(response({ analysis: 'not json at all {{{' }));

    const result = await generateDocuments('a resume that is long enough to pass', 'a job');

    expect(result.analysis.match_score).toBe(0);
    expect(result.analysis.strengths).toEqual([]);
    expect(result.resumeTex).toContain('\\resheader');
  });

  it('clamps an out-of-range match score', async () => {
    generateTextMock.mockResolvedValue(response({ analysis: '{"match_score":9001}' }));

    const result = await generateDocuments('a resume that is long enough to pass', 'a job');
    expect(result.analysis.match_score).toBe(100);
  });

  it('retries once with a correction when the model uses an unknown macro', async () => {
    generateTextMock
      .mockResolvedValueOnce(response({ resume: '\\fancyBanner{Jane}' }))
      .mockResolvedValueOnce(response());

    const result = await generateDocuments('a resume that is long enough to pass', 'a job');

    expect(generateTextMock).toHaveBeenCalledTimes(2);
    expect(result.resumeTex).toContain('\\resheader{Jane Doe}');

    // The retry must tell the model what went wrong, otherwise it is just a
    // second roll of the dice.
    const retryPrompt = generateTextMock.mock.calls[1][0].userPrompt as string;
    expect(retryPrompt).toContain('previous attempt was rejected');
    expect(retryPrompt).toContain('\\fancyBanner');
  });

  it('gives up after the second rejection', async () => {
    generateTextMock.mockResolvedValue(response({ resume: '\\fancyBanner{Jane}' }));

    await expect(
      generateDocuments('a resume that is long enough to pass', 'a job'),
    ).rejects.toBeInstanceOf(LatexValidationError);
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a response missing the delimiters', async () => {
    generateTextMock.mockResolvedValue('Here is your resume!\n\\resline{hi}');

    await expect(
      generateDocuments('a resume that is long enough to pass', 'a job'),
    ).rejects.toBeInstanceOf(LatexValidationError);
  });

  it('passes profile contact details to the model as authoritative', async () => {
    generateTextMock.mockResolvedValue(response());

    await generateDocuments(
      'a resume that is long enough to pass',
      'a job',
      { company_name: 'Acme', position: 'Engineer' },
      { fullName: 'Jane Doe', email: 'jane@example.com', linkedin: 'linkedin.com/in/jane' },
    );

    const prompt = generateTextMock.mock.calls[0][0].userPrompt as string;
    expect(prompt).toContain('Verified contact details');
    expect(prompt).toContain('jane@example.com');
    expect(prompt).toContain('linkedin.com/in/jane');
    // Absent fields must not appear as empty labels.
    expect(prompt).not.toContain('Phone:');
  });

  it("supplies today's date so the cover letter is not misdated", async () => {
    // A model left to its own devices dated a 2026 letter "May 18, 2024".
    generateTextMock.mockResolvedValue(response());

    await generateDocuments('a resume that is long enough to pass', 'a job');

    const prompt = generateTextMock.mock.calls[0][0].userPrompt as string;
    expect(prompt).toContain("Today's date:");
    expect(prompt).toContain(String(new Date().getFullYear()));
  });

  it('omits the contact block entirely when no profile is supplied', async () => {
    generateTextMock.mockResolvedValue(response());

    await generateDocuments('a resume that is long enough to pass', 'a job');

    const prompt = generateTextMock.mock.calls[0][0].userPrompt as string;
    expect(prompt).not.toContain('Verified contact details');
  });
});

describe('generateDocuments when the compile service misbehaves', () => {
  const failWith = (error: Error): LatexCompiler => ({ name: 'down', compile: async () => { throw error; } });

  beforeEach(() => {
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue(response());
  });

  it.each([
    ['unreachable', new LatexCompileError('Could not reach the LaTeX compile service.')],
    ['a 5xx', new LatexCompileError('LaTeX compile service returned 503.', 503)],
  ])('still returns the LaTeX when the service is %s', async (_name, error) => {
    __setCompiler(failWith(error));
    const result = await generateDocuments('a resume that is long enough to pass', 'a job');
    expect(result.resumePdf).toBeNull();
    expect(result.coverLetterPdf).toBeNull();
    expect(result.resumeTex).toContain('\\resheader{Jane Doe}');
    expect(result.analysis.match_score).toBe(82);
  });

  it('still returns the résumé when the compiler rejects a document (Texapi reports rate limits as 422)', async () => {
    // The Studio renders the résumé itself, so PDFs only feed saved links. A 422
    // used to discard a finished, already-charged generation.
    __setCompiler(failWith(new LatexCompileError('The LaTeX document failed to compile.', 422)));
    const result = await generateDocuments('a resume that is long enough to pass', 'a job');
    expect(result.resumePdf).toBeNull();
    expect(result.compile.ok).toBe(false);
    expect(result.compile.note).toContain('422');
    expect(result.resumeTex).toContain(String.raw`\resheader{Jane Doe}`);
  });

  it('can skip compiling entirely, so the résumé can be saved before any PDF work', async () => {
    let compiled = 0;
    __setCompiler({ name: 'counting', compile: async () => { compiled += 1; return { pdf: Buffer.from('%PDF') }; } });
    const result = await generateDocuments('a resume that is long enough to pass', 'a job', {}, {}, { compile: false });
    expect(compiled).toBe(0);
    expect(result.resumePdf).toBeNull();
    expect(result.resumeTex).toContain(String.raw`\resheader{Jane Doe}`);
  });

  it('gives up waiting on a compiler that never answers', async () => {
    __setCompiler({ name: 'hung', compile: () => new Promise(() => undefined) });
    const { compileDocuments } = await import('./generateLatex');
    const out = await compileDocuments('a', 'b', 40);
    expect(out.compile.ok).toBe(false);
    expect(out.compile.note).toMatch(/longer than 40ms/);
  });
});
