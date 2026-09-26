import { describe, expect, it } from 'vitest';
import {
  LatexValidationError,
  escapeSpecials,
  sanitizeBody,
  stripCodeFences,
} from './sanitize';

describe('stripCodeFences', () => {
  it('unwraps a ```latex fence', () => {
    expect(stripCodeFences('```latex\n\\resline{hi}\n```')).toBe('\\resline{hi}');
  });

  it('unwraps a bare ``` fence', () => {
    expect(stripCodeFences('```\n\\resline{hi}\n```')).toBe('\\resline{hi}');
  });

  it('leaves unfenced input alone', () => {
    expect(stripCodeFences('\\resline{hi}')).toBe('\\resline{hi}');
  });
});

describe('escapeSpecials', () => {
  it('escapes the characters models actually get wrong', () => {
    // Every one of these is a real compile error, and % silently eats the
    // rest of the line rather than failing loudly.
    expect(escapeSpecials('grew revenue 40%')).toBe('grew revenue 40\\%');
    expect(escapeSpecials('R&D team')).toBe('R\\&D team');
    expect(escapeSpecials('C# and F#')).toBe('C\\# and F\\#');
    expect(escapeSpecials('saved $1.2M')).toBe('saved \\$1.2M');
    expect(escapeSpecials('2^10 scale')).toBe('2\\textasciicircum{}10 scale');
  });

  it('does not double-escape already-escaped characters', () => {
    expect(escapeSpecials('40\\% growth')).toBe('40\\% growth');
    expect(escapeSpecials('R\\&D')).toBe('R\\&D');
  });

  it('is idempotent', () => {
    const once = escapeSpecials('40% of R&D spend was $2M');
    expect(escapeSpecials(once)).toBe(once);
  });

  it('leaves command tokens untouched', () => {
    expect(escapeSpecials('\\textbf{bold} \\resdot text')).toBe('\\textbf{bold} \\resdot text');
  });

  it('preserves the line-break control sequence', () => {
    expect(escapeSpecials('line one \\\\ line two')).toBe('line one \\\\ line two');
  });

  it('leaves tilde alone — it renders as a harmless non-breaking space', () => {
    expect(escapeSpecials('approx ~5 years')).toBe('approx ~5 years');
  });
});

describe('sanitizeBody — rejection', () => {
  const rejects = (body: string, why: string) => {
    it(`rejects ${why}`, () => {
      expect(() => sanitizeBody(body, 'resume')).toThrow(LatexValidationError);
    });
  };

  rejects('\\resline{a}\\input{/etc/passwd}', 'file reads via \\input');
  rejects('\\resline{a}\\include{secrets}', '\\include');
  rejects('\\immediate\\write18{rm -rf /}', 'shell escape');
  rejects('\\openout15=/tmp/x', '\\openout');
  rejects('\\usepackage{shellesc}', 'loading extra packages');
  rejects('\\def\\x{bad}', 'macro redefinition');
  rejects('\\catcode`\\%=12', 'catcode changes');
  rejects('\\begin{document}\\resline{a}\\end{document}', 'a full document instead of a body');
  rejects('', 'an empty body');

  it('does not false-positive on commands that merely start the same way', () => {
    // \resitem starts with "res", \inputs would match a sloppy \input check.
    expect(() => sanitizeBody('\\resline{inputs and definitions}', 'resume')).not.toThrow();
  });
});

describe('sanitizeBody — structure', () => {
  it('rejects unbalanced braces', () => {
    expect(() => sanitizeBody('\\resline{unclosed', 'resume')).toThrow(/unclosed brace/i);
  });

  it('rejects a stray closing brace', () => {
    expect(() => sanitizeBody('\\resline{a}}', 'resume')).toThrow(/unmatched closing brace/i);
  });

  it('rejects an unclosed environment', () => {
    expect(() => sanitizeBody('\\begin{reslist}\\resitem{a}', 'resume')).toThrow(/unclosed environment/i);
  });

  it('rejects mismatched environments', () => {
    expect(() => sanitizeBody('\\begin{reslist}\\resitem{a}\\end{itemize}', 'resume'))
      .toThrow(/mismatched environment/i);
  });

  it('rejects environments outside the allowlist', () => {
    expect(() => sanitizeBody('\\begin{tabular}{ll}a\\end{tabular}', 'resume'))
      .toThrow(/not available/i);
  });

  it('rejects macros the template does not define', () => {
    expect(() => sanitizeBody('\\resline{a}\\fancyheader{b}', 'resume'))
      .toThrow(/not defined in the template/i);
  });

  it('keeps resume and cover-letter vocabularies separate', () => {
    expect(() => sanitizeBody('\\clpara{hello}', 'resume')).toThrow(/not defined/i);
    expect(() => sanitizeBody('\\resrole{a}{b}{c}{d}', 'coverLetter')).toThrow(/not defined/i);
  });
});

describe('sanitizeBody — happy path', () => {
  it('accepts a realistic resume body and repairs its specials', () => {
    const body = [
      '\\resheader{Jane Doe}{jane@example.com \\resdot 555-0100}',
      '\\section{Experience}',
      '\\resrole{Engineer}{Acme}{Remote}{2020 -- Present}',
      '\\begin{reslist}',
      '\\resitem{Cut costs 30% across R&D, saving $400K.}',
      '\\end{reslist}',
    ].join('\n');

    const out = sanitizeBody(body, 'resume');

    expect(out).toContain('30\\%');
    expect(out).toContain('R\\&D');
    expect(out).toContain('\\$400K');
    expect(out).toContain('\\resdot');
  });

  it('accepts a realistic cover letter body', () => {
    const body = [
      '\\clheader{Jane Doe}{jane@example.com}',
      '\\clmeta{1 March 2026}{Acme Corp}{Remote}',
      '\\clgreeting{Dear Hiring Manager,}',
      '\\clpara{I grew revenue 40% last year.}',
      '\\clsignoff{Sincerely,}{Jane Doe}',
    ].join('\n');

    expect(sanitizeBody(body, 'coverLetter')).toContain('40\\%');
  });

  it('strips a code fence before validating', () => {
    expect(sanitizeBody('```latex\n\\resline{hi}\n```', 'resume')).toBe('\\resline{hi}');
  });
});
