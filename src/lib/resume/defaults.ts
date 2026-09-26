/**
 * Factories for new documents, sections and entries, plus the sample résumé
 * used by template previews. The sample persona and all of its content are
 * fictional and original.
 */
import { newId } from './ids';
import { DEFAULT_PRESET_ID, getPreset } from './presets';
import { bulletsFromStrings, richTextFromPlain } from './richtext';
import {
  emptyRichText,
  RESUME_SCHEMA_VERSION,
  type Entry,
  type Personal,
  type ResumeDocument,
  type Section,
  type SectionType,
} from './schema';
import { SECTION_REGISTRY } from './sections';

export function createEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: newId(),
    hidden: false,
    title: '',
    subtitle: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    url: '',
    level: null,
    description: emptyRichText(),
    ...overrides,
  };
}

export function createSection(type: SectionType, overrides: Partial<Section> = {}): Section {
  const spec = SECTION_REGISTRY[type];
  return {
    id: newId(),
    type,
    title: spec.defaultTitle,
    hidden: false,
    column: spec.defaultColumn,
    sort: 'manual',
    display: spec.defaultDisplay,
    gridColumns: 2,
    entries: spec.kind === 'paragraph' ? [createEntry()] : [],
    ...overrides,
  };
}

export const emptyPersonal = (): Personal => ({
  fullName: '',
  jobTitle: '',
  email: '',
  phone: '',
  location: '',
  links: [],
});

export function createResume(input: {
  title?: string;
  presetId?: string;
  personal?: Partial<Personal>;
  sections?: Section[];
} = {}): ResumeDocument {
  const preset = getPreset(input.presetId ?? DEFAULT_PRESET_ID);
  const now = new Date().toISOString();
  return {
    id: newId(20),
    schemaVersion: RESUME_SCHEMA_VERSION,
    title: input.title ?? 'Untitled resume',
    presetId: preset.id,
    basedOnId: null,
    jobApplicationId: null,
    personal: { ...emptyPersonal(), ...input.personal },
    sections: input.sections ?? [
      createSection('summary'),
      createSection('experience'),
      createSection('education'),
      createSection('skills'),
    ],
    layout: structuredCloneSafe(preset.layout),
    style: structuredCloneSafe(preset.style),
    createdAt: now,
    updatedAt: now,
  };
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * A multi-page variant of the sample, used by the parity checks to exercise
 * page breaks. Entry titles are unique so each can be located in the PDF.
 */
export function createLongSampleResume(presetId = DEFAULT_PRESET_ID): ResumeDocument {
  const doc = createSampleResume(presetId);
  const experience = doc.sections.find((s) => s.type === 'experience')!;
  const bullets = [
    'Led a cross-functional squad of designers, engineers and analysts through quarterly discovery and delivery.',
    'Cut support tickets for the billing flow by a third after reworking error states and copy.',
    'Shipped an accessible component library adopted by four product teams.',
    'Ran moderated usability sessions every sprint and fed findings straight into the backlog.',
    'Partnered with legal and compliance to simplify consent screens without adding risk.',
  ];
  experience.entries = Array.from({ length: 14 }, (_, i) =>
    createEntry({
      id: `e-long-${i}`,
      title: `Design Role ${String.fromCharCode(65 + i)}`,
      subtitle: `Company ${i + 1}`,
      location: i % 2 ? 'Remote' : 'London, UK',
      startDate: `${2023 - i}-0${(i % 9) + 1}`,
      endDate: `${2024 - i}-0${(i % 9) + 1}`,
      description: bulletsFromStrings(bullets.slice(0, 2 + (i % 4))),
    }),
  );
  return doc;
}

/** Stable ids keep template thumbnails from re-rendering needlessly. */
export function createSampleResume(presetId = DEFAULT_PRESET_ID): ResumeDocument {
  const doc = createResume({ presetId, title: 'Sample' });
  doc.id = 'sample';
  doc.personal = {
    fullName: 'Maya Okonkwo',
    jobTitle: 'Senior Product Designer',
    email: 'maya.okonkwo@example.com',
    phone: '+44 20 7946 0321',
    location: 'Manchester, UK',
    links: [
      { id: 'l1', label: 'mayaokonkwo.design', url: 'https://mayaokonkwo.design' },
      { id: 'l2', label: 'linkedin.com/in/mayaokonkwo', url: 'https://linkedin.com/in/mayaokonkwo' },
    ],
  };
  doc.sections = [
    createSection('summary', {
      id: 's-summary',
      entries: [
        createEntry({
          id: 'e-summary',
          description: richTextFromPlain(
            'Product designer with eight years shaping fintech and health products. Led the redesign of a savings app used by 1.2M people, lifting weekly retention 18%. Comfortable owning research, interaction design and design systems end to end.',
          ),
        }),
      ],
    }),
    createSection('experience', {
      id: 's-exp',
      entries: [
        createEntry({
          id: 'e-exp-1',
          title: 'Senior Product Designer',
          subtitle: 'Lumen Savings',
          location: 'Manchester, UK',
          startDate: '2021-04',
          current: true,
          description: bulletsFromStrings([
            'Redesigned onboarding and goals flows, raising weekly retention 18% across 1.2M users.',
            'Built the Tide design system (140 components), cutting UI build time by a third.',
            'Ran fortnightly research with customers in arrears to shape the hardship support journey.',
          ]),
        }),
        createEntry({
          id: 'e-exp-2',
          title: 'Product Designer',
          subtitle: 'Northwell Health',
          location: 'Leeds, UK',
          startDate: '2018-02',
          endDate: '2021-03',
          description: bulletsFromStrings([
            'Designed appointment booking used by 40 clinics; no-shows fell 22% after launch.',
            'Partnered with clinicians to simplify prescription renewals from nine steps to four.',
          ]),
        }),
        createEntry({
          id: 'e-exp-3',
          title: 'Junior Designer',
          subtitle: 'Fieldnote Studio',
          location: 'Leeds, UK',
          startDate: '2016-09',
          endDate: '2018-01',
          description: bulletsFromStrings([
            'Delivered web and brand work for 15 small businesses and two local charities.',
          ]),
        }),
      ],
    }),
    createSection('education', {
      id: 's-edu',
      entries: [
        createEntry({
          id: 'e-edu-1',
          title: 'BA (Hons) Graphic Design',
          subtitle: 'University of Leeds',
          location: 'Leeds, UK',
          startDate: '2013',
          endDate: '2016',
          description: richTextFromPlain('First-class honours. Dissertation on accessible data visualisation.'),
        }),
      ],
    }),
    createSection('skills', {
      id: 's-skills',
      entries: ['Interaction design', 'Design systems', 'User research', 'Figma', 'Prototyping', 'Accessibility (WCAG 2.2)'].map(
        (title, i) => createEntry({ id: `e-skill-${i}`, title, level: 5 - (i % 3) }),
      ),
    }),
    createSection('languages', {
      id: 's-lang',
      entries: [
        createEntry({ id: 'e-lang-1', title: 'English', subtitle: 'Native', level: 5 }),
        createEntry({ id: 'e-lang-2', title: 'Yoruba', subtitle: 'Fluent', level: 4 }),
      ],
    }),
  ];
  return doc;
}
