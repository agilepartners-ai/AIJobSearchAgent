/**
 * Escaping for plain user text going into LaTeX.
 *
 * Unlike server/latex/sanitize.ts (which repairs AI-written LaTeX and leaves
 * commands alone), everything here is literal text: every special character is
 * escaped, including backslashes and braces.
 *
 * It also defeats TeX's input ligatures. In T1 encoding, "--" silently becomes
 * an en dash, "''" a closing quote, "<<" a guillemet and "!`" an inverted
 * exclamation mark. The browser shows those characters literally, so without
 * this the PDF would quietly differ from the preview.
 */

const SPECIALS: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '&': '\\&',
  '#': '\\#',
  '^': '\\textasciicircum{}',
  _: '\\_',
  '~': '\\textasciitilde{}',
  '%': '\\%',
  '<': '\\textless{}',
  '>': '\\textgreater{}',
  '|': '\\textbar{}',
};

export function escapeLatexText(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (SPECIALS[ch]) {
      out += SPECIALS[ch];
      continue;
    }

    out += ch;
    // Break ligature pairs with an empty group, which renders as nothing.
    if ((ch === '-' && next === '-') || (ch === "'" && next === "'") || (ch === '`' && next === '`')) {
      out += '{}';
    }
    if ((ch === '!' || ch === '?') && next === '`') out += '{}';
    if (ch === ',' && next === ',') out += '{}';
  }
  return out.replace(/\n/g, ' ');
}

/**
 * Escape a URL for hyperref's \href. Inside another command's argument, raw
 * # and % break the compile, and ~ becomes a non-breaking space.
 */
export function escapeLatexUrl(url: string): string {
  return url
    .replace(/\\/g, '%5C')
    .replace(/[{}]/g, (c) => (c === '{' ? '%7B' : '%7D'))
    .replace(/ /g, '%20')
    .replace(/%(?![0-9A-Fa-f]{2})/g, '%25')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/~/g, '\\string~');
}
