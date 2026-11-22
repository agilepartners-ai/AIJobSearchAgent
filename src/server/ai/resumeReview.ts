/**
 * The gate every generated résumé passes before it is saved: nothing new, and nothing that reads as machine-written or names a machine.
 *
 * The model is told these rules in prompts/system.md; this is the check that does not rely on the model obeying. When a first attempt
 * fails, the generator asks once more with the exact problems listed. These are rules, not a trained detector: they cut the habits
 * that make a text read as machine-written. They cannot promise how any outside detector will judge a text.
 */
import { aiMarkers, checkText, invisibleCharacters } from './humanize';
import { coverLetterToText, latexToMarkdown } from '../latex/toText';

export interface ResumeReview {
  ok: boolean;
  /** One plain sentence per problem, written so it can be handed back to the model as a correction. */
  problems: string[];
  aiLikeness: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.%]+/g, ' ').trim();

/** Numbers and tool-like names in the new text that the candidate's own text never mentions (each is a possible invention). */
export function newFacts(original: string, tailored: string): string[] {
  const base = ` ${norm(original)} `;
  const found = new Set<string>();
  for (const m of Array.from(tailored.matchAll(/\b\d[\d,.]*\s?(?:%|\+|k\b|x\b|lpa\b)?|\b[A-Z][a-z]+[A-Z][A-Za-z0-9]*\b|\b[A-Z]{2,}[0-9]*\b|\b[A-Za-z]+(?:\.js|\+\+|#)\b/g))) {
    const token = m[0].trim();
    if (token.length < 2) continue;
    const n = norm(token);
    if (!n || /^(19|20)\d\d$/.test(n)) continue;
    if (!base.includes(` ${n} `) && !base.includes(n.replace(/\s+/g, ''))) found.add(token);
  }
  return Array.from(found).slice(0, 20);
}

/**
 * @param original  everything the candidate gave us: their résumé text, extra facts from their other résumés, and their contact details.
 * @param resumeTex the generated résumé (a complete .tex document).
 */
export function reviewResume(original: string, resumeTex: string, coverLetterTex = ''): ResumeReview {
  const text = latexToMarkdown(resumeTex);
  const problems: string[] = [];
  const invented = newFacts(original, text);
  if (invented.length) problems.push(`These numbers or names are not in the candidate's résumé, so remove them: ${invented.slice(0, 12).join(', ')}.`);
  const wording = checkText(text);
  if (wording.aiLikeness >= 35) problems.push(`It reads machine-written (${wording.aiLikeness}/100). ${wording.edits.slice(0, 3).join(' ')}`.trim());
  const markers = aiMarkers(text, original);
  if (markers.length) problems.push(`It contains wording that points to a machine or a template: ${markers.join(', ')}. Remove it.`);
  if (invisibleCharacters(text)) problems.push('It contains hidden characters. Use plain visible text only.');
  if (/—/.test(text) && !/—/.test(original)) problems.push('It contains em dashes. Use a comma, a full stop or a plain hyphen instead.');
  // The cover letter: wording only. A letter narrates, so "new numbers" is not asked of it, but it must not read machine-written
  // or name a machine either.
  if (coverLetterTex) {
    const letter = coverLetterToText(coverLetterTex);
    const lw = checkText(letter);
    if (lw.aiLikeness >= 35) problems.push(`The cover letter reads machine-written (${lw.aiLikeness}/100). ${lw.edits.slice(0, 3).join(' ')}`.trim());
    const lm = aiMarkers(letter, original);
    if (lm.length) problems.push(`The cover letter contains wording that points to a machine or a template: ${lm.join(', ')}. Remove it.`);
    if (invisibleCharacters(letter)) problems.push('The cover letter contains hidden characters. Use plain visible text only.');
    if (/—/.test(letter) && !/—/.test(original)) problems.push('The cover letter contains em dashes. Use a comma, a full stop or a plain hyphen instead.');
  }
  return { ok: problems.length === 0, problems, aiLikeness: wording.aiLikeness };
}
