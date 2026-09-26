/**
 * Character policy shared by both renderers.
 *
 * pdflatex with T1 + utf8 can typeset Latin, Latin-1 and Latin Extended-A,
 * plus a handful of punctuation. Anything else (emoji, CJK, most symbols)
 * aborts the compile with "Unicode character not set up for use with LaTeX".
 *
 * Rather than let one emoji break a PDF, unsupported characters are removed,
 * and the preview removes the same ones, so what you see is what exports.
 */

const ALLOWED_PUNCTUATION = new Set([
  0x2013, // – en dash
  0x2014, // — em dash
  0x2018, // ‘
  0x2019, // ’
  0x201c, // “
  0x201d, // ”
  0x2022, // •
  0x2026, // …
  0x20ac, // €
]);

function isAllowed(code: number): boolean {
  if (code === 0x09 || code === 0x0a) return true;
  if (code >= 0x20 && code <= 0x7e) return true;
  if (code >= 0xa0 && code <= 0x17f) return true;
  return ALLOWED_PUNCTUATION.has(code);
}

/** Remove characters the PDF cannot render and collapse the gaps they leave. */
export function renderableText(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code === 0xa0) out += ' ';
    else if (code === 0x2212) out += '-'; // minus sign
    else if (isAllowed(code)) out += ch;
  }
  return out.replace(/[ \t]{2,}/g, ' ');
}

/** Upper-case once, here, so both renderers get the identical string. */
export const upper = (s: string): string => s.toLocaleUpperCase('en-US');
