import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { richTextToPlain } from '../richtext';
import { ResumeDocumentSchema } from '../schema';
import { serializeResume } from '../latex/serialize';
import { parseContactLine, parseDateRange, parseInline, resumeFromMacroBody } from './fromMacros';

const EXAMPLE = fs.readFileSync(
  path.join(process.cwd(), 'src/server/latex/templates/example-body.tex'),
  'utf8',
);

describe('parseInline', () => {
  it('turns emphasis and links into marks', () => {
    expect(parseInline('plain \\textbf{bold} \\textit{it}')).toEqual([
      { type: 'text', text: 'plain' },
      { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      { type: 'text', text: 'it', marks: [{ type: 'italic' }] },
    ]);
    expect(parseInline('\\href{https://x.io}{x.io}')).toEqual([
      { type: 'text', text: 'x.io', marks: [{ type: 'link', attrs: { href: 'https://x.io' } }] },
    ]);
  });

  it('undoes the escaping the serializer applies', () => {
    expect(parseInline('43\\% of \\$1.2M R\\&D a\\_b \\{x\\}')[0].text).toBe('43% of $1.2M R&D a_b {x}');
    expect(parseInline('2019-{}-2021')[0].text).toBe('2019--2021');
  });
});

describe('parseDateRange', () => {
  it('reads ranges, open ranges and single dates', () => {
    expect(parseDateRange('2021 -- Present')).toEqual({ startDate: '2021', endDate: '', current: true });
    expect(parseDateRange('Apr 2018 -- Mar 2021')).toEqual({ startDate: '2018-04', endDate: '2021-03', current: false });
    expect(parseDateRange('2016')).toEqual({ startDate: '2016', endDate: '', current: false });
    expect(parseDateRange('')).toEqual({ startDate: '', endDate: '', current: false });
  });

  it('never keeps a date the schema would reject: unrecognised text keeps its year, or nothing', () => {
    // Keeping the raw text used to make the whole résumé fail validation and vanish.
    expect(parseDateRange('Summer 2020').startDate).toBe('2020');
    expect(parseDateRange('sometime').startDate).toBe('');
  });
});

describe('parseContactLine', () => {
  it('sorts the contact line into fields', () => {
    const contact = parseContactLine(
      'jane@example.com \\resdot (555) 010-2030 \\resdot San Francisco, CA \\resdot \\href{https://linkedin.com/in/jane}{linkedin.com/in/jane}',
    );
    expect(contact.email).toBe('jane@example.com');
    expect(contact.phone).toBe('(555) 010-2030');
    expect(contact.location).toBe('San Francisco, CA');
    expect(contact.links).toEqual([{ id: 'l3', label: 'linkedin.com/in/jane', url: 'https://linkedin.com/in/jane' }]);
  });
});

describe('resumeFromMacroBody', () => {
  const doc = resumeFromMacroBody(EXAMPLE, { title: 'Imported' });

  it('produces a document the schema accepts', () => {
    expect(ResumeDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it('recovers the header', () => {
    expect(doc.personal.fullName).toBe('Jane Q. Developer');
    expect(doc.personal.email).toBe('jane@example.com');
    expect(doc.personal.location).toBe('San Francisco, CA');
  });

  it('types each section from the macros it contains, keeping the original title', () => {
    expect(doc.sections.map((s) => [s.title, s.type])).toEqual([
      ['Professional Summary', 'summary'],
      ['Technical Skills', 'skills'],
      ['Experience', 'experience'],
      ['Education', 'education'],
      ['Projects', 'projects'],
      ['Certifications', 'certifications'],
    ]);
  });

  it('attaches each reslist to the entry above it', () => {
    const experience = doc.sections.find((s) => s.type === 'experience')!;
    expect(experience.entries).toHaveLength(2);
    expect(experience.entries[0].title).toBe('Staff Software Engineer');
    expect(experience.entries[0].subtitle).toBe('Acme Corp');
    expect(experience.entries[0].current).toBe(true);
    expect(richTextToPlain(experience.entries[0].description).split('\n')).toHaveLength(3);
    expect(richTextToPlain(experience.entries[1].description)).toContain('2M events/sec on Kafka & Flink');
  });

  it('keeps skill categories with their values', () => {
    const skills = doc.sections.find((s) => s.type === 'skills')!;
    expect(skills.entries.map((e) => e.title)).toEqual(['Languages', 'Infrastructure', 'Data']);
    expect(skills.entries[0].subtitle).toBe('Go, Rust, TypeScript, Python, SQL');
  });

  it('round-trips: the imported document serializes to LaTeX that carries the same content', () => {
    const tex = serializeResume(doc);
    expect(tex).toContain('Jane Q. Developer');
    expect(tex).toContain('Staff Software Engineer');
    // Escaping is reapplied on the way out, so specials survive the round trip.
    expect(tex).toContain('43\\%');
    expect(tex).toContain('Kafka \\& Flink');
  });

  it('survives a body with an unknown command instead of failing', () => {
    const doc2 = resumeFromMacroBody('\\resheader{A B}{a@b.co}\n\\section{X}\n\\unknownthing{y}\n\\resline{Hello}');
    expect(doc2.personal.fullName).toBe('A B');
    expect(richTextToPlain(doc2.sections[0].entries[0].description)).toBe('Hello');
  });
});

describe('JSON safety', () => {
  const hasUndefined = (value: unknown): boolean =>
    value === undefined ||
    (typeof value === 'object' && value !== null && Object.values(value).some(hasUndefined));

  it('never leaves an undefined field, even for a section with no title', () => {
    // A bare macro with no \section used to override the default title with
    // undefined, which does not survive JSON storage.
    const doc = resumeFromMacroBody(String.raw`\resheader{A}{a@b.co}
\resrole{Dev}{Co}{}{2020 -- Present}`);
    expect(hasUndefined(doc)).toBe(false);
    expect(doc.sections[0].title.length).toBeGreaterThan(0);
  });

  it('is undefined-free for the full example too', () => {
    expect(hasUndefined(resumeFromMacroBody(EXAMPLE))).toBe(false);
  });
});
