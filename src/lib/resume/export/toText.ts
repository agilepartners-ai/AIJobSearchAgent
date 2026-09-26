/**
 * A resume as plain text, in reading order. This is what the AI is given when
 * you tailor a resume you already have in the Studio instead of uploading a PDF,
 * so it carries the same content the preview shows and nothing hidden.
 */
import { formatDateRange } from '../dates';
import { richTextToPlain } from '../richtext';
import type { ResumeDocument } from '../schema';

export function resumeToPlainText(doc: ResumeDocument): string {
  const p = doc.personal;
  const lines: string[] = [
    p.fullName,
    p.jobTitle,
    [p.email, p.phone, p.location, ...p.links.map((l) => l.url || l.label)].filter(Boolean).join(' | '),
  ];

  for (const section of doc.sections) {
    if (section.hidden) continue;
    const entries = section.entries.filter((e) => !e.hidden);
    if (!entries.length) continue;
    lines.push('', section.title.toUpperCase());
    for (const e of entries) {
      const head = [e.title, e.subtitle, e.location, formatDateRange(e, 'MMM YYYY')].filter(Boolean).join(' | ');
      if (head) lines.push(head);
      const body = richTextToPlain(e.description);
      if (body) lines.push(...body.split('\n').map((l) => (section.type === 'summary' ? l : `- ${l}`)));
    }
  }
  // Collapse runs of blank lines left by empty header fields.
  return lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n').trim();
}
