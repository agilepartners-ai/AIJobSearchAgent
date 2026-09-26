/**
 * Make imported or previously-saved résumé data satisfy the schema.
 *
 * The schema is strict on purpose (the renderers rely on it), but AI output and
 * older saved documents are not: dates arrive as "04/2025", names run long, a
 * profile has ten links. Rejecting the whole document for one bad field is the
 * worst outcome — the résumé is silently dropped by every read — so this repairs
 * what can be repaired, loses as little as possible, and lets the schema stay
 * the single source of truth about what a valid document is.
 */
import { ResumeDocumentSchema, type ResumeDocument } from '../schema';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Any date a résumé plausibly contains → "YYYY", "YYYY-MM" or "".
 *
 *   04/2025  4-2025  2025-04  2025/4  Apr 2025  April 2025  Apr. '25?  → 2025-04
 *   2025                                                              → 2025
 *   Summer 2020 / Expected 2027 / 'Spring, 2019'                      → year only
 *   Present / ongoing / free text with no year                        → ""
 */
export function toPartialDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text) return '';

  let m = text.match(/^(\d{1,2})\s*[/.-]\s*((?:19|20)\d{2})$/); // 04/2025
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return `${m[2]}-${pad(Number(m[1]))}`;

  m = text.match(/^((?:19|20)\d{2})\s*[/.-]\s*(\d{1,2})$/); // 2025-04
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return `${m[1]}-${pad(Number(m[2]))}`;

  m = text.match(/^([A-Za-z]{3,9})\.?,?\s+((?:19|20)\d{2})$/); // Apr 2025
  if (m) {
    const index = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (index >= 0) return `${m[2]}-${pad(index + 1)}`;
  }

  // Anything else that still names a year keeps the year.
  m = text.match(/\b((?:19|20)\d{2})\b/);
  return m ? m[1] : '';
}

const clip = (value: unknown, max: number): string => {
  const s = typeof value === 'string' ? value : '';
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const asObject = (v: unknown): Loose => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Loose) : {});

/** Clamp and repair a document in place of rejecting it. Tolerates missing fields. */
export function coerceResume<T = ResumeDocument>(input: unknown): T {
  const doc = asObject(input);
  const personal = asObject(doc.personal);

  const coerced: Loose = {
    ...doc,
    title: clip(doc.title, 120),
    personal: {
      ...personal,
      fullName: clip(personal.fullName, 120),
      jobTitle: clip(personal.jobTitle, 120),
      email: clip(personal.email, 200),
      phone: clip(personal.phone, 60),
      location: clip(personal.location, 120),
      links: (Array.isArray(personal.links) ? personal.links : []).slice(0, 8).map((l: unknown, i: number) => {
        const link = asObject(l);
        return { id: clip(link.id, 40) || `l${i}`, label: clip(link.label, 80), url: clip(link.url, 500) };
      }),
    },
    sections: (Array.isArray(doc.sections) ? doc.sections : []).slice(0, 24).map((s: unknown) => {
      const section = asObject(s);
      return {
        ...section,
        title: clip(section.title, 80),
        entries: (Array.isArray(section.entries) ? section.entries : []).slice(0, 60).map((e: unknown) => {
          const entry = asObject(e);
          const level = Number(entry.level);
          return {
            ...entry,
            title: clip(entry.title, 200),
            subtitle: clip(entry.subtitle, 200),
            location: clip(entry.location, 120),
            url: clip(entry.url, 500),
            startDate: toPartialDate(entry.startDate),
            endDate: toPartialDate(entry.endDate),
            level: Number.isInteger(level) && level >= 1 && level <= 5 ? level : null,
          };
        }),
      };
    }),
  };
  return coerced as T;
}

/**
 * Parse stored data, repairing it if it does not validate as saved. Returns
 * null only for data that cannot be a résumé at all.
 */
export function healResume(raw: unknown): ResumeDocument | null {
  const direct = ResumeDocumentSchema.safeParse(raw);
  if (direct.success) return direct.data;
  const healed = ResumeDocumentSchema.safeParse(coerceResume(raw));
  return healed.success ? healed.data : null;
}
