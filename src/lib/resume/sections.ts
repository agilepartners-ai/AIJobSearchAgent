/**
 * Section registry: the one place a section type is defined.
 *
 * The editor builds its forms from `fields`, and both renderers pick a layout
 * from `kind`. Adding a section type means adding an entry here; neither
 * renderer needs a new code path.
 */
import type { Entry, ListDisplay, SectionType } from './schema';

export type SectionKind =
  /** One free-text block (summary). */
  | 'paragraph'
  /** Title, subtitle, dates, location, description (experience, education…). */
  | 'timeline'
  /** Short items shown inline, in a grid, or with levels (skills, languages…). */
  | 'list';

export type EntryField = 'title' | 'subtitle' | 'location' | 'dates' | 'url' | 'level' | 'description';

export interface FieldSpec {
  label: string;
  placeholder?: string;
}

export interface SectionSpec {
  type: SectionType;
  label: string;
  /** lucide-react icon name, resolved by the editor. */
  icon: string;
  defaultTitle: string;
  kind: SectionKind;
  /** Where the section goes when a layout switches to two columns. */
  defaultColumn: 'main' | 'side';
  defaultDisplay: ListDisplay;
  /** Summary allows one entry; everything else is unbounded. */
  maxEntries?: number;
  /** Date sorting makes sense only where entries have dates. */
  sortable: boolean;
  fields: Partial<Record<EntryField, FieldSpec>>;
  /** Short label for an entry in the editor list when its title is empty. */
  untitled: string;
}

export const SECTION_REGISTRY: Record<SectionType, SectionSpec> = {
  summary: {
    type: 'summary',
    label: 'Summary',
    icon: 'AlignLeft',
    defaultTitle: 'Summary',
    kind: 'paragraph',
    defaultColumn: 'main',
    defaultDisplay: 'inline',
    maxEntries: 1,
    sortable: false,
    fields: {
      description: { label: 'Summary', placeholder: 'Two or three sentences on what you do and the impact you have had.' },
    },
    untitled: 'Summary',
  },
  experience: {
    type: 'experience',
    label: 'Experience',
    icon: 'Briefcase',
    defaultTitle: 'Experience',
    kind: 'timeline',
    defaultColumn: 'main',
    defaultDisplay: 'inline',
    sortable: true,
    fields: {
      title: { label: 'Job title', placeholder: 'Senior Product Designer' },
      subtitle: { label: 'Employer', placeholder: 'Company name' },
      location: { label: 'Location', placeholder: 'City, Country or Remote' },
      dates: { label: 'Dates' },
      url: { label: 'Company link', placeholder: 'https://' },
      description: { label: 'Description', placeholder: 'Achievements, one per bullet. Lead with an action verb.' },
    },
    untitled: 'Untitled role',
  },
  education: {
    type: 'education',
    label: 'Education',
    icon: 'GraduationCap',
    defaultTitle: 'Education',
    kind: 'timeline',
    defaultColumn: 'main',
    defaultDisplay: 'inline',
    sortable: true,
    fields: {
      title: { label: 'Degree', placeholder: 'B.Sc. Computer Science' },
      subtitle: { label: 'Institution', placeholder: 'University name' },
      location: { label: 'Location' },
      dates: { label: 'Dates' },
      url: { label: 'Link', placeholder: 'https://' },
      description: { label: 'Details', placeholder: 'Honours, thesis, relevant coursework.' },
    },
    untitled: 'Untitled degree',
  },
  projects: {
    type: 'projects',
    label: 'Projects',
    icon: 'FolderKanban',
    defaultTitle: 'Projects',
    kind: 'timeline',
    defaultColumn: 'main',
    defaultDisplay: 'inline',
    sortable: true,
    fields: {
      title: { label: 'Project name' },
      subtitle: { label: 'Role or stack', placeholder: 'TypeScript, Postgres' },
      dates: { label: 'Dates' },
      url: { label: 'Link', placeholder: 'https://github.com/…' },
      description: { label: 'Description' },
    },
    untitled: 'Untitled project',
  },
  skills: {
    type: 'skills',
    label: 'Skills',
    icon: 'Sparkles',
    defaultTitle: 'Skills',
    kind: 'list',
    defaultColumn: 'side',
    defaultDisplay: 'inline',
    sortable: false,
    fields: {
      title: { label: 'Skill', placeholder: 'Figma' },
      subtitle: { label: 'Detail (optional)', placeholder: 'Advanced' },
      level: { label: 'Level' },
    },
    untitled: 'Skill',
  },
  languages: {
    type: 'languages',
    label: 'Languages',
    icon: 'Languages',
    defaultTitle: 'Languages',
    kind: 'list',
    defaultColumn: 'side',
    defaultDisplay: 'inline',
    sortable: false,
    fields: {
      title: { label: 'Language', placeholder: 'Spanish' },
      subtitle: { label: 'Proficiency', placeholder: 'Fluent' },
      level: { label: 'Level' },
    },
    untitled: 'Language',
  },
  certifications: {
    type: 'certifications',
    label: 'Certifications',
    icon: 'BadgeCheck',
    defaultTitle: 'Certifications',
    kind: 'timeline',
    defaultColumn: 'main',
    defaultDisplay: 'inline',
    sortable: true,
    fields: {
      title: { label: 'Certification' },
      subtitle: { label: 'Issuer' },
      dates: { label: 'Date' },
      url: { label: 'Credential link', placeholder: 'https://' },
    },
    untitled: 'Untitled certification',
  },
  awards: {
    type: 'awards',
    label: 'Awards',
    icon: 'Trophy',
    defaultTitle: 'Awards',
    kind: 'timeline',
    defaultColumn: 'main',
    defaultDisplay: 'inline',
    sortable: true,
    fields: {
      title: { label: 'Award' },
      subtitle: { label: 'Awarded by' },
      dates: { label: 'Date' },
      description: { label: 'Details' },
    },
    untitled: 'Untitled award',
  },
  interests: {
    type: 'interests',
    label: 'Interests',
    icon: 'Heart',
    defaultTitle: 'Interests',
    kind: 'list',
    defaultColumn: 'side',
    defaultDisplay: 'inline',
    sortable: false,
    fields: {
      title: { label: 'Interest', placeholder: 'Trail running' },
    },
    untitled: 'Interest',
  },
  custom: {
    type: 'custom',
    label: 'Custom section',
    icon: 'LayoutList',
    defaultTitle: 'Custom section',
    kind: 'timeline',
    defaultColumn: 'main',
    defaultDisplay: 'inline',
    sortable: true,
    fields: {
      title: { label: 'Title' },
      subtitle: { label: 'Subtitle' },
      location: { label: 'Location' },
      dates: { label: 'Dates' },
      url: { label: 'Link', placeholder: 'https://' },
      description: { label: 'Description' },
    },
    untitled: 'Untitled item',
  },
};

export const ADDABLE_SECTION_TYPES: SectionType[] = [
  'summary',
  'experience',
  'education',
  'projects',
  'skills',
  'languages',
  'certifications',
  'awards',
  'interests',
  'custom',
];

export function uses(type: SectionType, field: EntryField): boolean {
  return field in SECTION_REGISTRY[type].fields;
}

/** Label for an entry row in the editor. */
export function entryLabel(type: SectionType, entry: Pick<Entry, 'title' | 'subtitle'>): string {
  const spec = SECTION_REGISTRY[type];
  if (spec.kind === 'paragraph') return spec.label;
  return entry.title.trim() || entry.subtitle.trim() || spec.untitled;
}
