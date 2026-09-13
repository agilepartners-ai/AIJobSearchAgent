import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildDocument } from './buildDocument';
import { LatexValidationError } from './sanitize';

const exampleBody = fs.readFileSync(
  path.join(process.cwd(), 'src/server/latex/templates/example-body.tex'),
  'utf8',
);

describe('buildDocument', () => {
  it('produces a complete, standalone document', () => {
    const tex = buildDocument('\\resline{Hello}', 'resume');

    expect(tex).toContain('\\documentclass');
    expect(tex).toContain('\\begin{document}');
    expect(tex).toContain('\\end{document}');
    expect(tex).toContain('\\resline{Hello}');

    // Exactly one of each — a duplicated \begin{document} was a real failure
    // mode when the model emitted a full document and we appended a preamble.
    expect(tex.match(/\\begin\{document\}/g)).toHaveLength(1);
    expect(tex.match(/\\end\{document\}/g)).toHaveLength(1);
  });

  it('includes the macros for the requested document kind only', () => {
    const resume = buildDocument('\\resline{a}', 'resume');
    expect(resume).toContain('\\newcommand{\\resrole}');
    expect(resume).not.toContain('\\newcommand{\\clpara}');

    const letter = buildDocument('\\clpara{a}', 'coverLetter');
    expect(letter).toContain('\\newcommand{\\clpara}');
    expect(letter).not.toContain('\\newcommand{\\resrole}');
  });

  it('contains no stray control characters', () => {
    // A build script once turned `\\begin` into a literal backspace (U+0008)
    // via a JS string escape, and pdflatex failed with a baffling Unicode
    // error. Control characters must never reach the compiler.
    const tex = buildDocument(exampleBody, 'resume');
    const control = Array.from(tex).filter(
      (c) => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t',
    );
    expect(control).toEqual([]);
  });

  it('emits LF line endings only', () => {
    // The templates are edited on Windows; CRLF reaching TeX shows up as ^^M.
    expect(buildDocument(exampleBody, 'resume')).not.toContain('\r');
  });

  it('rejects a body that is already a full document', () => {
    expect(() =>
      buildDocument('\\documentclass{article}\\begin{document}x\\end{document}', 'resume'),
    ).toThrow(LatexValidationError);
  });
});

describe('the example body is a valid golden fixture', () => {
  // It is shipped as the reference the prompt describes, so it must itself
  // satisfy every rule we impose on generated output.
  it('passes validation unchanged', () => {
    expect(() => buildDocument(exampleBody, 'resume')).not.toThrow();
  });

  it('exercises every resume macro', () => {
    for (const macro of [
      '\\resheader',
      '\\resline',
      '\\resskills',
      '\\resrole',
      '\\resedu',
      '\\resproject',
      '\\rescert',
      '\\resitem',
      '\\resdot',
      '\\begin{reslist}',
    ]) {
      expect(exampleBody, `example-body.tex should demonstrate ${macro}`).toContain(macro);
    }
  });
});
