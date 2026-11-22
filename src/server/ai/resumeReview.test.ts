import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __setCompiler } from '../latex/compile';
import type { LatexCompiler } from '../latex/compile';
import { latexToMarkdown } from '../latex/toText';
import { newFacts, reviewResume } from './resumeReview';
import { aiMarkers, checkText, invisibleCharacters, stripInvisible } from './humanize';

const generateTextMock = vi.fn();
vi.mock('./gemini', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  GeminiError: class GeminiError extends Error {},
}));
// eslint-disable-next-line import/first
import { generateDocuments } from './generateLatex';

const ORIGINAL = `Asha Rao
asha@example.com
Experience
Built a RAG chatbot with LangChain over 1,200 PDFs
Wrote FastAPI endpoints used by 3 interns
Trained an XGBoost model at 91% accuracy
Deployed on GCP with Docker
Skills: Python, SQL, Docker`;

const tex = (items: string[], summary = 'Python developer who shipped a RAG chatbot over 1,200 PDFs.') =>
  String.raw`\documentclass{article}\begin{document}
\resheader{Asha Rao}{asha@example.com}
\section{Summary}
\resline{${summary}}
\section{Experience}
\resrole{Intern}{Acme}{Noida}{2024 -- 2025}
\begin{reslist}
${items.map((i) => `\\resitem{${i}}`).join('\n')}
\end{reslist}
\section{Skills}
\resskills{Languages}{Python, SQL, Docker}
\end{document}`;

const GOOD_ITEMS = ['Shipped FastAPI endpoints that 3 interns used daily', 'Cut search time with a LangChain RAG chatbot over 1,200 PDFs', 'Reached 91\\% accuracy with an XGBoost model', 'Ran it on GCP in Docker'];

describe('résumé review (nothing new, nothing that reads machine-made)', () => {
  it('passes a clean rework of the candidate own facts', () => {
    const r = reviewResume(ORIGINAL, tex(GOOD_ITEMS));
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('catches an invented number or tool, naming it', () => {
    const r = reviewResume(ORIGINAL, tex([...GOOD_ITEMS, 'Cut costs by 47% using Kubernetes']));
    expect(r.ok).toBe(false);
    expect(r.problems.join(' ')).toMatch(/47%/);
    expect(newFacts(ORIGINAL, 'Cut costs by 47% with KubeFlow')).toEqual(expect.arrayContaining(['47%', 'KubeFlow']));
  });

  it('catches stock phrases and an em dash', () => {
    const r = reviewResume(ORIGINAL, tex(['Spearheaded and leveraged a robust RAG chatbot — seamlessly', 'Utilized FastAPI to deliver results', 'Orchestrated a dynamic XGBoost model']));
    expect(r.ok).toBe(false);
    expect(r.problems.join(' ')).toMatch(/machine-written/);
    expect(r.problems.join(' ')).toMatch(/em dash/i);
  });

  it('catches a mention of AI or a placeholder, unless the candidate really uses that tool', () => {
    expect(reviewResume(ORIGINAL, tex(GOOD_ITEMS, 'Summary written by ChatGPT for [Company].')).problems.join(' ')).toMatch(/points to a machine or a template/);
    const withGemini = `${ORIGINAL}\nBuilt a Gemini API wrapper`;
    expect(reviewResume(withGemini, tex([...GOOD_ITEMS, 'Built a Gemini API wrapper'])).ok).toBe(true);
  });

  it('finds and strips hidden characters', () => {
    const sneaky = 'Built​ a model­ with﻿ SQL';
    expect(invisibleCharacters(sneaky)).toBe(3);
    expect(stripInvisible(sneaky)).toBe('Built a model with SQL');
    expect(reviewResume(ORIGINAL, tex(['Shipped FastAPI endpoints​ that 3 interns used daily', ...GOOD_ITEMS.slice(1)])).problems.join(' ')).toMatch(/hidden characters/);
    expect(aiMarkers('Plain text about SQL', '')).toEqual([]);
    expect(checkText('I built it and it ran. Then I fixed three bugs, and shipped it on a Friday afternoon. It worked.').aiLikeness).toBeLessThan(35);
  });

  it('reads the generator macros as markdown', () => {
    const md = latexToMarkdown(tex(GOOD_ITEMS));
    expect(md).toContain('### Intern - Acme');
    expect(md).toContain('- Reached 91% accuracy with an XGBoost model');
    expect(md).not.toMatch(/\\|\{|\}/);
  });
});

describe('generateDocuments: the review gate', () => {
  const stub: LatexCompiler = { name: 'stub', compile: async () => ({ pdf: Buffer.from('%PDF-1.7\n') }) };
  const model = (items: string[], summary?: string) => {
    // The generator receives the body only (no preamble), exactly as the model writes it.
    const body = tex(items, summary).replace(/^[\s\S]*?\\begin\{document\}\s*/, '').replace(/\\end\{document\}\s*$/, '');
    return `<<<ANALYSIS>>>\n{"match_score":70,"strengths":[],"gaps":[],"suggestions":[],"present_keywords":[],"missing_keywords":[]}\n<<<RESUME>>>\n${body}\n<<<COVER_LETTER>>>\n\\clheader{Asha Rao}{asha@example.com}\n\\clgreeting{Dear team,}\n\\clpara{Hello.}\n`;
  };
  beforeEach(() => {
    generateTextMock.mockReset();
    __setCompiler(stub);
  });

  it('asks once more, with the exact problems, when the first attempt adds a fact', async () => {
    generateTextMock.mockResolvedValueOnce(model([...GOOD_ITEMS, 'Cut costs by 47% using Kubernetes'])).mockResolvedValueOnce(model(GOOD_ITEMS));
    const out = await generateDocuments(ORIGINAL, 'a data job', {}, {}, { compile: false });
    expect(generateTextMock).toHaveBeenCalledTimes(2);
    const retry = generateTextMock.mock.calls[1][0].userPrompt as string;
    expect(retry).toContain('previous attempt was rejected');
    expect(retry).toMatch(/47%/);
    expect(retry).toMatch(/never add a fact/);
    expect(out.resumeTex).not.toMatch(/47\\%|Kubernetes/);
  });

  it('does not call the model twice when the first attempt is clean', async () => {
    generateTextMock.mockResolvedValue(model(GOOD_ITEMS));
    await generateDocuments(ORIGINAL, 'a data job', {}, {}, { compile: false });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the better attempt when the second is no better, and never fails the user over it', async () => {
    generateTextMock
      .mockResolvedValueOnce(model([...GOOD_ITEMS, 'Cut costs by 47% using Kubernetes']))
      .mockResolvedValueOnce(model([...GOOD_ITEMS, 'Cut costs by 47% using Kubernetes'], 'Results-driven developer, summary written by ChatGPT.'));
    const out = await generateDocuments(ORIGINAL, 'a data job', {}, {}, { compile: false });
    expect(generateTextMock).toHaveBeenCalledTimes(2);
    // The first attempt had one problem; the second had more, so the first is the one returned.
    expect(out.resumeTex).not.toMatch(/ChatGPT|Results-driven/);
  });

  it('returns the first attempt when the second is unusable LaTeX', async () => {
    generateTextMock.mockResolvedValueOnce(model([...GOOD_ITEMS, 'Cut costs by 47% using Kubernetes'])).mockResolvedValueOnce('<<<RESUME>>>\n\\fancyBanner{x}\n<<<COVER_LETTER>>>\n\\clpara{x}');
    const out = await generateDocuments(ORIGINAL, 'a data job', {}, {}, { compile: false });
    expect(out.resumeTex).toContain('\\resheader{Asha Rao}');
  });

  it('strips hidden characters from what is kept, and leaves no tool name in the .tex source', async () => {
    generateTextMock.mockResolvedValue(model(['Shipped FastAPI​ endpoints that 3 interns used daily', ...GOOD_ITEMS.slice(1)]));
    const out = await generateDocuments(ORIGINAL, 'a data job', {}, {}, { compile: false });
    expect(invisibleCharacters(out.resumeTex)).toBe(0);
    expect(out.resumeTex).not.toMatch(/Generated by|AIJobSearchAgent|AI-generated/i);
    expect(out.coverLetterTex).not.toMatch(/Generated by|AIJobSearchAgent|AI-generated/i);
  });
});
