/**
 * Trim a pasted job description before it is sent to the model.
 *
 * Scraped postings carry paragraphs that cost tokens and tell the model nothing
 * about the role: equal-opportunity boilerplate, "apply now" chrome. Dropping
 * them is deterministic and free, unlike asking a model to summarise. The job's
 * real requirements are never touched.
 */

const BOILERPLATE = new RegExp(
  [
    'equal opportunity',
    'equal employment',
    '\\bEEO\\b',
    'does not discriminate',
    'do not discriminate',
    'reasonable accommodations?',
    'protected (?:veteran|class)',
    'e-verify',
    'without regard to (?:race|color|religion)',
    'affirmative action',
  ].join('|'),
  'i',
);

const CHROME = /^\s*(?:apply(?: now| here| for this job)?|share(?: this job)?|save job|report (?:this )?job|back to (?:jobs|search)|sign in)\s*$/i;

/** Paragraphs longer than this are real content that merely mention a keyword. */
const MAX_BOILERPLATE_PARAGRAPH = 900;

export const DEFAULT_MAX_JD_CHARS = 8_000;

export function condenseJobDescription(text: string, maxChars = DEFAULT_MAX_JD_CHARS): string {
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').filter((line) => !CHROME.test(line)).join('\n').trim())
    .filter((p) => p && !(p.length <= MAX_BOILERPLATE_PARAGRAPH && BOILERPLATE.test(p)));

  const kept: string[] = [];
  let total = 0;
  for (const p of paragraphs) {
    if (total + p.length > maxChars) {
      // Keep as much of the first overflowing paragraph as fits, then stop.
      const room = maxChars - total;
      if (room > 200) kept.push(`${p.slice(0, room).trim()}…`);
      break;
    }
    kept.push(p);
    total += p.length + 2;
  }
  return kept.join('\n\n');
}
