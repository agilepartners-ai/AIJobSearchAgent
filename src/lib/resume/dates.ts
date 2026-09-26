import type { DateFormat, Entry } from './schema';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format a partial date ("2024" or "2024-03"). Unknown input is returned unchanged. */
export function formatPartialDate(value: string, format: DateFormat): string {
  const match = value.match(/^(\d{4})(?:-(\d{2}))?$/);
  if (!match) return value;
  const [, year, month] = match;
  if (!month || format === 'YYYY') return year;

  const m = Number(month) - 1;
  switch (format) {
    case 'MMM YYYY':
      return `${MONTHS_SHORT[m]} ${year}`;
    case 'MMMM YYYY':
      return `${MONTHS_LONG[m]} ${year}`;
    case 'MM/YYYY':
      return `${month}/${year}`;
    default:
      return year;
  }
}

/**
 * The date range shown on an entry, or "" when there is nothing to show.
 * Uses an en dash, which both renderers emit as the same glyph.
 */
export function formatDateRange(entry: Pick<Entry, 'startDate' | 'endDate' | 'current'>, format: DateFormat): string {
  const start = entry.startDate ? formatPartialDate(entry.startDate, format) : '';
  const end = entry.current ? 'Present' : entry.endDate ? formatPartialDate(entry.endDate, format) : '';
  if (start && end) return start === end ? start : `${start} – ${end}`;
  return start || end;
}

/** Sort key for "most recent first": current roles win, then by end, then start. */
export function recencyKey(entry: Pick<Entry, 'startDate' | 'endDate' | 'current'>): string {
  const pad = (d: string) => (d.length === 4 ? `${d}-00` : d || '0000-00');
  return `${entry.current ? '1' : '0'}${pad(entry.endDate)}${pad(entry.startDate)}`;
}
