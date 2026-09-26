import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Drift guard.
 *
 * The macro vocabulary lives in three places: the .tex templates that define
 * the macros, sanitize.ts which enforces the allowlist, and system.md which
 * tells the model what it may use. If they drift, the model writes macros the
 * sanitizer rejects and every generation fails the same way — with no compiler
 * log to explain it, because Texapi does not return one.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

const prompt = read('src/server/ai/prompts/system.md');
const resumeMacros = read('src/server/latex/templates/resume.macros.tex');
const letterMacros = read('src/server/latex/templates/coverletter.macros.tex');
const sanitizeSource = read('src/server/latex/sanitize.ts');

/** Macro names the model is expected to use, as declared in sanitize.ts. */
function allowlistedMacros(setName: string): string[] {
  const block = sanitizeSource.split(`const ${setName} = new Set([`)[1]?.split(']')[0] ?? '';
  return Array.from(block.matchAll(/'([a-zA-Z]+)'/g)).map((m) => m[1]);
}

describe('prompt and template stay in sync', () => {
  it.each(allowlistedMacros('RESUME_MACROS'))('resume macro \\%s is documented', (macro) => {
    expect(prompt).toContain(`\\${macro}`);
  });

  it.each(allowlistedMacros('COVER_LETTER_MACROS'))(
    'cover letter macro \\%s is documented',
    (macro) => {
      expect(prompt).toContain(`\\${macro}`);
    },
  );

  it('every documented resume macro actually exists in the template', () => {
    for (const macro of ['resheader', 'resline', 'resskills', 'resrole', 'resedu', 'resproject', 'rescert', 'resitem', 'resdot']) {
      expect(resumeMacros, `\\${macro} is promised to the model but not defined`).toContain(
        `\\${macro}`,
      );
    }
  });

  it('every documented cover letter macro actually exists in the template', () => {
    for (const macro of ['clheader', 'clmeta', 'clgreeting', 'clpara', 'clsignoff', 'cldot']) {
      expect(letterMacros, `\\${macro} is promised to the model but not defined`).toContain(
        `\\${macro}`,
      );
    }
  });

  it('tells the model not to escape specials itself', () => {
    // escapeSpecials() is idempotent, but the instruction keeps output cleaner
    // and avoids the model hedging with \\% inside \href arguments.
    expect(prompt).toMatch(/Never write `\\%`/);
  });

  it('specifies the delimiters generateLatex.ts splits on', () => {
    for (const delimiter of ['<<<ANALYSIS>>>', '<<<RESUME>>>', '<<<COVER_LETTER>>>']) {
      expect(prompt).toContain(delimiter);
    }
  });
});
