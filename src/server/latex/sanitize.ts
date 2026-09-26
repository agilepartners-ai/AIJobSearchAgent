/**
 * Validation and repair for AI-generated LaTeX bodies.
 *
 * Why this is load-bearing: Texapi returns HTTP 422 with no compiler log on
 * failure (its docs claim otherwise — `outputFiles` is always null), so there
 * is no error output to feed back to the model. Correctness has to come from
 * refusing to send broken LaTeX in the first place.
 *
 * Three jobs, in order:
 *   1. reject() — commands that could read/write the filesystem or shell out
 *   2. escapeSpecials() — repair unescaped &, %, #, $, ^ inside macro arguments
 *   3. validate() — brace balance, environment balance, macro allowlist
 */

/** Commands that must never appear in a generated body. */
const FORBIDDEN_COMMANDS = [
  'write18', 'immediate', 'openout', 'openin', 'read', 'write',
  'input', 'include', 'includeonly', 'usepackage', 'RequirePackage',
  'documentclass', 'catcode', 'def', 'gdef', 'edef', 'xdef', 'let',
  'csname', 'expandafter', 'newwrite', 'newread', 'special', 'shipout',
  'directlua', 'latelua', 'pdfprimitive', 'ShellEscape',
] as const;

/** Environments the body is allowed to open. */
const ALLOWED_ENVIRONMENTS = new Set(['reslist', 'itemize', 'center']);

/**
 * Inline commands allowed inside macro arguments. Anything else that looks
 * like a command inside an argument is reported by validate().
 */
const ALLOWED_INLINE = new Set([
  'textbf', 'textit', 'emph', 'underline', 'texttt', 'textsc',
  'href', 'url', 'resdot', 'cldot', 'textbullet', 'LaTeX', 'TeX',
  '%', '&', '#', '$', '_', '{', '}', 'textasciicircum', 'textasciitilde',
  'textbackslash', 'ldots', 'dots', 'quad', 'qquad', ',', ';', ' ',
]);

/** Structural macros a resume body may call at top level. */
const RESUME_MACROS = new Set([
  'resheader', 'resrole', 'resedu', 'resproject', 'rescert',
  'resskills', 'resline', 'resitem', 'section', 'resdot',
]);

/** Structural macros a cover letter body may call at top level. */
const COVER_LETTER_MACROS = new Set([
  'clheader', 'clmeta', 'clgreeting', 'clpara', 'clsignoff', 'cldot',
]);

export type DocumentKind = 'resume' | 'coverLetter';

export class LatexValidationError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = 'LatexValidationError';
  }
}

/**
 * Strip markdown code fences. Models wrap LaTeX in ```latex ... ``` far more
 * often than they are told not to.
 */
export function stripCodeFences(input: string): string {
  const fenced = input.match(/```(?:latex|tex)?\s*\n?([\s\S]*?)```/);
  return (fenced ? fenced[1] : input).trim();
}

/**
 * Reject bodies containing filesystem or shell-escape commands.
 * Matches on the command token so `\inputs` or `\reader` are not false hits.
 */
function reject(body: string): void {
  for (const cmd of FORBIDDEN_COMMANDS) {
    const pattern = new RegExp(`\\\\${cmd}(?![a-zA-Z])`);
    if (pattern.test(body)) {
      throw new LatexValidationError(
        'Generated LaTeX contained a disallowed command.',
        `\\${cmd}`,
      );
    }
  }
  // The body must not redefine the document itself.
  if (/\\begin\s*\{document\}|\\end\s*\{document\}/.test(body)) {
    throw new LatexValidationError(
      'Generated LaTeX must be a body only, not a full document.',
      '\\begin{document}',
    );
  }
}

/**
 * Escape LaTeX specials that appear as literal text.
 *
 * This is the highest-value repair in the pipeline: models reliably write
 * "increased revenue 40%" or "R&D" or "C#" and each one is a hard compile
 * error (or, for %, silently swallows the rest of the line).
 *
 * We walk the string tracking whether each character is part of a command
 * token, and escape only characters sitting in text position. Characters that
 * are already escaped are left alone, so the function is idempotent.
 *
 * `~` is deliberately not escaped — a stray tilde renders as a non-breaking
 * space, which is harmless, and it is legitimately used for spacing.
 */
export function escapeSpecials(body: string): string {
  let out = '';
  let i = 0;

  while (i < body.length) {
    const ch = body[i];

    // A backslash starts either an escape or a command token; copy it and its
    // following token verbatim so we never double-escape.
    if (ch === '\\') {
      const next = body[i + 1];
      if (next === undefined) {
        out += '\\textbackslash{}';
        i += 1;
        continue;
      }
      if (/[a-zA-Z]/.test(next)) {
        // Command token: \foo
        let j = i + 1;
        while (j < body.length && /[a-zA-Z]/.test(body[j])) j += 1;
        out += body.slice(i, j);
        i = j;
        continue;
      }
      // Escaped special or control symbol (\%, \&, \\, \, etc.) — keep as is.
      out += ch + next;
      i += 2;
      continue;
    }

    switch (ch) {
      case '%': out += '\\%'; break;
      case '&': out += '\\&'; break;
      case '#': out += '\\#'; break;
      // Resumes contain dollar amounts far more often than math, so a bare
      // $ is much more likely to be currency than an opening math delimiter.
      case '$': out += '\\$'; break;
      case '^': out += '\\textasciicircum{}'; break;
      default: out += ch;
    }
    i += 1;
  }

  return out;
}

/** Brace balance, ignoring escaped \{ and \}. */
function checkBraces(body: string): void {
  let depth = 0;
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '\\') { i += 1; continue; }
    if (body[i] === '{') depth += 1;
    if (body[i] === '}') {
      depth -= 1;
      if (depth < 0) {
        throw new LatexValidationError('Generated LaTeX has an unmatched closing brace.');
      }
    }
  }
  if (depth !== 0) {
    throw new LatexValidationError(
      `Generated LaTeX has ${depth} unclosed brace${depth === 1 ? '' : 's'}.`,
    );
  }
}

/** Environments must be balanced, correctly nested, and on the allowlist. */
function checkEnvironments(body: string): void {
  const stack: string[] = [];
  const pattern = /\\(begin|end)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const [, kind, name] = match;
    if (!ALLOWED_ENVIRONMENTS.has(name)) {
      throw new LatexValidationError(
        'Generated LaTeX used an environment that is not available.',
        name,
      );
    }
    if (kind === 'begin') {
      stack.push(name);
    } else {
      const open = stack.pop();
      if (open !== name) {
        throw new LatexValidationError(
          `Mismatched environment: \\end{${name}} closes \\begin{${open ?? 'nothing'}}.`,
        );
      }
    }
  }

  if (stack.length > 0) {
    throw new LatexValidationError(`Unclosed environment: \\begin{${stack[stack.length - 1]}}.`);
  }
}

/** Every command used must be one we defined or explicitly allow inline. */
function checkMacros(body: string, kind: DocumentKind): void {
  const structural = kind === 'resume' ? RESUME_MACROS : COVER_LETTER_MACROS;
  const pattern = /\\([a-zA-Z]+)/g;
  const unknown = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const name = match[1];
    if (name === 'begin' || name === 'end') continue;
    if (structural.has(name) || ALLOWED_INLINE.has(name)) continue;
    unknown.add(name);
  }

  if (unknown.size > 0) {
    throw new LatexValidationError(
      'Generated LaTeX used commands that are not defined in the template.',
      Array.from(unknown).map((n) => `\\${n}`).join(', '),
    );
  }
}

/**
 * Full pipeline: fences off, reject dangerous input, repair specials, validate.
 * Throws LatexValidationError with a `detail` suitable for feeding back to the
 * model on a retry.
 */
export function sanitizeBody(raw: string, kind: DocumentKind): string {
  const body = stripCodeFences(raw);

  if (!body) {
    throw new LatexValidationError('The AI returned an empty document body.');
  }

  reject(body);
  const escaped = escapeSpecials(body);
  checkBraces(escaped);
  checkEnvironments(escaped);
  checkMacros(escaped, kind);

  return escaped;
}
