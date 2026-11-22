/**
 * Mirrors JobWing's src/core/latexText.ts (the same converter, so the website and the desktop app read a résumé the same way).
 * Turns the generator's fixed LaTeX macros into plain markdown-like lines for the checks in resumeReview.ts. Read only.
 */

/** Read `n` brace-balanced arguments after a macro name starting at `from`. Returns the arguments and the index after the last one. */
function args(src: string, from: number, n: number): { values: string[]; end: number } {
  const values: string[] = [];
  let i = from;
  for (let k = 0; k < n; k += 1) {
    while (i < src.length && /\s/.test(src[i]!)) i += 1;
    if (src[i] !== '{') break;
    let depth = 0;
    const start = i + 1;
    for (; i < src.length; i += 1) {
      const c = src[i];
      if (c === '\\') i += 1;
      else if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    values.push(src.slice(start, i));
    i += 1;
  }
  return { values, end: i };
}

const ARITY: Record<string, number> = { resheader: 2, resskills: 2, resrole: 4, resedu: 4, resproject: 3, rescert: 3, resitem: 1, resline: 1, section: 1 };

/** Strip formatting commands inside a text fragment: \textbf{x} -> x, \href{u}{t} -> t, \resdot -> " | ", escapes removed. */
function plain(s: string): string {
  return s
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\(?:resdot|cldot)\b/g, ' | ')
    .replace(/\\(?:textbf|textit|emph|underline|texttt)\{([^{}]*)\}/g, '$1')
    .replace(/\\([%&$#_{}])/g, '$1')
    .replace(/\\textbackslash\{?\}?/g, '\\')
    .replace(/\\[a-zA-Z]+\*?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function latexToMarkdown(tex: string): string {
  const begin = tex.indexOf('\\begin{document}');
  const end = tex.lastIndexOf('\\end{document}');
  const body = begin >= 0 ? tex.slice(begin + '\\begin{document}'.length, end > begin ? end : undefined) : tex;
  const out: string[] = [];
  const re = /\\(resheader|resskills|resrole|resedu|resproject|rescert|resitem|resline|section)\*?(?![a-zA-Z])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const name = m[1]!;
    const { values, end: next } = args(body, m.index + m[0].length, ARITY[name]!);
    re.lastIndex = next;
    const v = values.map(plain);
    switch (name) {
      case 'resheader':
        out.push(`# ${v[0] ?? ''}`, v[1] ?? '', '');
        break;
      case 'section':
        out.push('', `## ${v[0] ?? ''}`);
        break;
      case 'resline':
        out.push(v[0] ?? '');
        break;
      case 'resskills':
        out.push(`${v[0] ?? ''}: ${v[1] ?? ''}`);
        break;
      case 'resrole':
      case 'resedu': {
        out.push(`### ${[v[0], v[1]].filter(Boolean).join(' - ')}`);
        const meta = [v[3], v[2]].filter(Boolean).join(', ');
        if (meta) out.push(`*${meta}*`);
        break;
      }
      case 'resproject':
        out.push(`### ${[v[0], v[1]].filter(Boolean).join(' - ')}`);
        if (v[2]) out.push(`*${v[2]}*`);
        break;
      case 'rescert':
        out.push(`- ${[v[0], v[1], v[2]].filter(Boolean).join(', ')}`);
        break;
      case 'resitem':
        out.push(`- ${v[0] ?? ''}`);
        break;
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** The prose of a cover letter (the paragraphs and the greeting), for the wording checks. The header and sign-off are not prose. */
export function coverLetterToText(tex: string): string {
  const begin = tex.indexOf('\\begin{document}');
  const body = begin >= 0 ? tex.slice(begin) : tex;
  const out: string[] = [];
  const re = /\\(clpara|clgreeting)(?![a-zA-Z])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const { values, end } = args(body, m.index + m[0].length, 1);
    re.lastIndex = end;
    if (values[0]) out.push(plain(values[0]));
  }
  return out.join('\n');
}
