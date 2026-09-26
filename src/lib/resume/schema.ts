/**
 * The resume document: the single source of truth.
 *
 * Three consumers read this and nothing else:
 *   - the editor (forms generated from the section registry)
 *   - the HTML preview renderer (instant, in the browser)
 *   - the LaTeX serializer (PDF via Texapi, and Open in Overleaf)
 *
 * Shared by client and server, so this file must stay free of Node and DOM
 * imports.
 */
import { z } from 'zod';

export const RESUME_SCHEMA_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Rich text: a restricted ProseMirror document.
//
// Only what ATS parsers read reliably and LaTeX renders cleanly: paragraphs,
// bullet lists (nestable), bold, italic, links. The editor is configured to
// produce nothing else, and normaliseRichText() strips anything that slips in.
// ---------------------------------------------------------------------------

export const RichMarkSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  z.object({ type: z.literal('link'), attrs: z.object({ href: z.string() }) }),
]);

export const RichTextNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  marks: z.array(RichMarkSchema).optional(),
});

export const RichParagraphSchema = z.object({
  type: z.literal('paragraph'),
  content: z.array(RichTextNodeSchema).optional(),
});

export type RichMark = z.infer<typeof RichMarkSchema>;
export type RichTextNode = z.infer<typeof RichTextNodeSchema>;
export type RichParagraph = z.infer<typeof RichParagraphSchema>;
export interface RichListItem {
  type: 'listItem';
  content: Array<RichParagraph | RichBulletList>;
}
export interface RichBulletList {
  type: 'bulletList';
  content: RichListItem[];
}
export type RichBlock = RichParagraph | RichBulletList;
export interface RichText {
  type: 'doc';
  content: RichBlock[];
}

const RichListItemSchema: z.ZodType<RichListItem> = z.lazy(() =>
  z.object({
    type: z.literal('listItem'),
    content: z.array(z.union([RichParagraphSchema, RichBulletListSchema])),
  }),
);

const RichBulletListSchema: z.ZodType<RichBulletList> = z.lazy(() =>
  z.object({
    type: z.literal('bulletList'),
    content: z.array(RichListItemSchema),
  }),
);

export const RichTextSchema: z.ZodType<RichText> = z.object({
  type: z.literal('doc'),
  content: z.array(z.union([RichParagraphSchema, RichBulletListSchema])),
});

export const emptyRichText = (): RichText => ({ type: 'doc', content: [] });

// ---------------------------------------------------------------------------
// Personal details
// ---------------------------------------------------------------------------

export const LinkSchema = z.object({
  id: z.string(),
  label: z.string().max(80),
  url: z.string().max(500),
});

export const PersonalSchema = z.object({
  fullName: z.string().max(120),
  jobTitle: z.string().max(120),
  email: z.string().max(200),
  phone: z.string().max(60),
  location: z.string().max(120),
  links: z.array(LinkSchema).max(8),
});

export type ResumeLink = z.infer<typeof LinkSchema>;
export type Personal = z.infer<typeof PersonalSchema>;

// ---------------------------------------------------------------------------
// Sections and entries
//
// Every entry has the same shape. The section registry decides which fields a
// given section type uses and how they are labelled. One shape means one
// entry layout in each renderer, instead of a bespoke renderer per type, which
// is exactly the duplication that produced five drifting renderers before.
// ---------------------------------------------------------------------------

export const SECTION_TYPES = [
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
] as const;

export const SectionTypeSchema = z.enum(SECTION_TYPES);
export type SectionType = z.infer<typeof SectionTypeSchema>;

/** Partial dates only: "2024", "2024-03", or "" when unknown. */
export const PartialDateSchema = z.string().regex(/^$|^\d{4}(-(0[1-9]|1[0-2]))?$/, 'Use YYYY or YYYY-MM');

export const EntrySchema = z.object({
  id: z.string(),
  hidden: z.boolean(),
  title: z.string().max(200),
  subtitle: z.string().max(200),
  location: z.string().max(120),
  startDate: PartialDateSchema,
  endDate: PartialDateSchema,
  current: z.boolean(),
  url: z.string().max(500),
  /** 1–5 for skills and languages; null when not rated. */
  level: z.number().int().min(1).max(5).nullable(),
  description: RichTextSchema,
});

export type Entry = z.infer<typeof EntrySchema>;

export const ListDisplaySchema = z.enum(['inline', 'grid', 'levels']);
export type ListDisplay = z.infer<typeof ListDisplaySchema>;

export const SectionSchema = z.object({
  id: z.string(),
  type: SectionTypeSchema,
  title: z.string().max(80),
  hidden: z.boolean(),
  /** Which column in a two-column layout. Ignored in one-column layouts. */
  column: z.enum(['main', 'side']),
  sort: z.enum(['manual', 'dateDesc']),
  /** Only meaningful for list-style sections (skills, languages, interests). */
  display: ListDisplaySchema,
  gridColumns: z.number().int().min(1).max(4),
  entries: z.array(EntrySchema).max(60),
});

export type Section = z.infer<typeof SectionSchema>;

// ---------------------------------------------------------------------------
// Layout and style
// ---------------------------------------------------------------------------

export const PAGE_FORMATS = ['A4', 'Letter'] as const;
export type PageFormat = (typeof PAGE_FORMATS)[number];

export const LayoutSchema = z.object({
  columns: z.union([z.literal(1), z.literal(2)]),
  /** Side column width as a percentage of the text width. */
  sideWidth: z.number().min(22).max(45),
  sidePosition: z.enum(['left', 'right']),
  /** Tinted side column background, or null for none. */
  sideBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  pageFormat: z.enum(PAGE_FORMATS),
  marginX: z.number().min(8).max(30), // mm
  marginY: z.number().min(8).max(30), // mm
});

export type Layout = z.infer<typeof LayoutSchema>;

export const HEADING_STYLES = ['line', 'underline', 'box', 'simple', 'topBottom', 'accentBar'] as const;
export type HeadingStyle = (typeof HEADING_STYLES)[number];

export const DATE_FORMATS = ['MMM YYYY', 'MMMM YYYY', 'MM/YYYY', 'YYYY'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

const HexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const StyleSchema = z.object({
  fontBody: z.string(),
  fontHeading: z.string(),
  /** All sizes in points. The UI snaps to 0.5 pt. */
  sizes: z.object({
    base: z.number().min(8).max(13),
    name: z.number().min(14).max(40),
    title: z.number().min(9).max(22),
    heading: z.number().min(9).max(20),
    entryTitle: z.number().min(8).max(15),
  }),
  lineHeight: z.number().min(1).max(1.8),
  /** Vertical space before each section and between entries, in points. */
  sectionGap: z.number().min(2).max(28),
  entryGap: z.number().min(0).max(18),
  headingStyle: z.enum(HEADING_STYLES),
  headingUppercase: z.boolean(),
  colors: z.object({
    accent: HexSchema,
    text: HexSchema,
  }),
  accentOn: z.object({
    name: z.boolean(),
    headings: z.boolean(),
    rules: z.boolean(),
    links: z.boolean(),
  }),
  header: z.object({
    align: z.enum(['left', 'center']),
    separator: z.enum(['bullet', 'bar', 'dot']),
  }),
  entries: z.object({
    datePosition: z.enum(['right', 'below']),
    subtitleStyle: z.enum(['normal', 'italic', 'bold']),
    dateFormat: z.enum(DATE_FORMATS),
  }),
  underlineLinks: z.boolean(),
  pageNumbers: z.boolean(),
});

export type ResumeStyle = z.infer<typeof StyleSchema>;

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/**
 * What the AI produced alongside a resume: the fit analysis and the cover
 * letter. Present only on resumes generated for a job; optional so every
 * hand-made resume and every older document still validates.
 */
export const AiContextSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  analysis: z.object({
    match_score: z.number(),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
    suggestions: z.array(z.string()),
    present_keywords: z.array(z.string()),
    missing_keywords: z.array(z.string()),
  }),
  coverLetter: z.object({
    tex: z.string(),
    /** Signed URLs expire; the storage path is what lets us mint a fresh one. */
    url: z.string(),
    path: z.string(),
  }),
});

export type AiContext = z.infer<typeof AiContextSchema>;

export const ResumeDocumentSchema = z.object({
  id: z.string(),
  schemaVersion: z.literal(RESUME_SCHEMA_VERSION),
  title: z.string().max(120),
  presetId: z.string(),
  /** Set when this document was tailored from another resume. */
  basedOnId: z.string().nullable(),
  jobApplicationId: z.string().nullable(),
  personal: PersonalSchema,
  sections: z.array(SectionSchema).max(24),
  layout: LayoutSchema,
  style: StyleSchema,
  ai: AiContextSchema.nullable().optional(),
  /** The client's request id for the generation that produced this résumé; makes retries idempotent. */
  generationId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>;
