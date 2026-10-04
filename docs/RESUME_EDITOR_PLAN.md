# Resume Editor Plan

A structured resume and cover-letter editor with live customisation, built on the existing
LaTeX/Texapi/Overleaf pipeline. Informed by competitor research on FlowCV (captured
2026-09-13).

**Status:** plan only, nothing implemented yet.
**Decisions already made:** structured documents as the source of truth; instant HTML preview
with LaTeX used for the PDF.

---

## 1. TL;DR

- **The research covers FlowCV's *data*, not its *editor screen*.** The capture was logged out
  (`init_user → "user": null`), so the editor UI was never loaded. But the public template API
  returned FlowCV's **complete editor settings schema** for all 105 templates, and the JS bundle
  contains the editor's panel labels. Those two sources agree, so the feature inventory below is
  well evidenced even though no screenshot of the editor exists.
- **FlowCV's key architectural idea:** 105 templates are **one renderer plus 105 settings
  objects**. A template is data, not code. We adopt this; it is also the "one clean template"
  goal from the original rewrite.
- **Build order is risk-first.** The riskiest assumption is that an HTML preview can match the
  LaTeX PDF closely enough. That gets proven in Phase 2, *before* the editor is built on top of
  it, with an explicit stop-and-rethink gate if it fails.
- **Four constraints were found by testing, not assumed** (section 4): Texapi's rate limit is
  shared by all users, Texapi runs TeX Live 2025 (not 2026), only 12 fonts are verified to work
  there, and TeX and browsers break lines differently.
- **We build equivalent features, not copies.** No FlowCV templates, images, sample content or
  code (section 5). Also: the capture currently sits inside `public/`, which Next.js serves
  publicly. Phase 0 moves it.

---

## 2. What the research covers

### Evidence quality: read this before trusting any source

| Source | Reliability | What it tells us |
|---|---|---|
| `pages/*/network/xhr/*.json` (real API responses) | **High: observed** | Full document and customisation schema for 105 resume and 67 letter templates |
| `assets/js/index-*.js` (their shipped bundle) | **High: observed** | Editor panel names and control labels, confirming the schema is user-facing |
| `pages/*/screenshots/`, `content.txt` | **High: observed** | Template gallery, cover-letter gallery, job-tracker layout (all logged out) |
| `reports/*.md` | **Low: AI-generated** | Written by Gemini from the capture. Useful leads, but `03`/`07` invent file names and libraries (`KanbanBoard.tsx`, `@hello-pangea/dnd`) as a proposed *rebuild*, phrased like findings. None of the 8 reports cover the editor. |

### Captured

| Route | State | Content |
|---|---|---|
| `/resumes` | Logged out | Template gallery: ~100 named templates, filters (All / Simple / Modern / Creative), "Import existing resume", "Create resume now" |
| `/cover-letters` | Logged out | Letter gallery: "New blank", Classic Left / Split / Right layouts |
| `/job-tracker` | Logged out, Pro-gated | Kanban: Wishlist → Applied → Interview → Offer → Rejected, "Add job", "Add Column", search, board/list toggle |

### Not captured

The resume editor and customisation panel, drag-and-drop behaviour, rich-text editing,
export flow, and any logged-in state. Everything we know about the editor comes from the
schema and bundle evidence below.

---

## 3. What FlowCV's editor does: verified inventory

### 3.1 Document model (from the template API)

Content is structured, not free text:

- **Sections** keyed by type: `work`, `education`, `skill`, `language`, `profile` (summary),
  `certificate`, `award`, `interest`, `project`, plus **user-created custom sections** with
  generated IDs (e.g. `tQK7QckaGIMAU5EHDw5EZ`, present in 12 templates).
- Each section has a **renamable** `displayName`, an `iconKey`, and `entries[]`.
- Each entry has **`isHidden`**, so individual entries toggle on and off.
- Entry descriptions are **HTML** (`<ul><li><p>`), meaning a rich-text editor per entry.
- **`disableAutoSort`**: entries sort by date by default, with a manual-order override.
- **`schemaVersion: "3"`**: versioned documents, so they migrate schemas over time.

Section usage across 105 templates: work/education/skill/language ×105, summary ×102,
certificate ×68, award ×17, interest ×8, project ×1.

### 3.2 Customisation (schema and bundle agree)

The bundle's editor tabs: **Document · Templates · Layout · Spacing · Entries · Headings · Font ·
Colors · Header · Photo · Links · Footer · Sections · More.**

| Area | Controls (evidence) |
|---|---|
| **Font sizes** | Independent **Base Font Size · Full Name · Professional Title · Section Headings · Entry Header** (bundle labels). Schema stores name/title/heading/entry sizes in points (e.g. 21.5 / 15.5 / 13.5 / 10.5 pt). |
| **Spacing** | Line height, spacing factor, vertical and horizontal margins (step scales) |
| **Font** | Family (25 used), separate decorative name font, CJK/Arabic/Hebrew fallbacks |
| **Layout** | One column, two columns, or mixed; column width %; which sections sit in which column |
| **Entries** | Date/location placement (right, left, below, 3-column), subtitle style, date and month formats |
| **Headings** | Style (line, box, thick short underline, simple, top-bottom line, thin line), capitalisation, icons |
| **Colours** | Accent/text/background; accent **"Apply to"**: Title · Subtitle · Divider · Personal Details · Social Icons |
| **Header** | Alignment, name emphasis, job-title placement and style, contact-detail layout (icons, bars, bullets), photo |
| **Sections** | Per-type display, e.g. skills as grid, level bars, text or bubbles, in 1–4 columns |
| **Footer / Links** | Page numbers, name/email in footer; link underline, colour, icon |
| **Document** | Page format (A4 default on all 105), anonymous mode |

### 3.3 The architectural insight

The customisation leaves that actually **differ between templates** are the template:
section order (34 variants), font family (25), name size (28 values), heading style (8),
layout, column widths, and skill display. Everything else is shared.

So a template is a preset over one parametric renderer. Adding a template costs a JSON object,
not new rendering code. Switching templates keeps content, which is what FlowCV promises:
*"You can customize or switch it later."*

### 3.4 Cover letters

67 templates, separate model: structured `recipient` (name, company, department, address),
`subject`, `date` (today or custom), `sender` address, a `declaration` with a **signature
image**, rich-text body, and header layouts Left / Split / Right.

### 3.5 Job tracker

Five default stages, "Add job" per column, **custom columns**, search, board/list toggle.
Pro-gated.

---

## 4. Constraints found by testing

These shape the architecture. Each was measured against real services.

### 4.1 Texapi cannot drive a live preview

- 1.3–3 s per compile.
- **20 req/min per API key, and the app uses one server key for every user.** Our limiter
  targets 15/min.
- Rate limiting shows up as HTTP 422/500 rather than 429 (already handled in `texapi.ts`).

Recompiling on each slider change would exhaust the shared key within seconds under real use.
Hence the decision: HTML preview for editing, Texapi only for PDFs.

**Background "does it fit" checks share that budget.** 15 compiles/min supports roughly
**15 concurrent editors** doing one verification per minute. Past that, the scaling path is the
self-hosted compiler in `docs/self-hosted-latex-compiler.md`.

### 4.2 Texapi runs TeX Live 2025, not 2026

Typesetting `\pdftexbanner` on Texapi returned *pdfTeX 1.40.28 (TeX Live 2025)*, format
2025-06-01. Local `texlive/texlive:latest` is 2026. They are **not interchangeable**:

- Texapi embeds `SourceSansPro-*`; TeX Live 2026 embeds the renamed `SourceSans3-*`.
- **Nunito compiles on Texapi but fails on local 2026.**

Consequences: local test harnesses must pin `texlive/texlive:TL2025-historic`, and anything that
must match production has to be verified against Texapi itself.

### 4.3 Font support: 12 verified in production

Each tested by compiling on Texapi and reading the embedded `/BaseFont` names from the PDF.
A package can load yet silently fall back to Computer Modern, so a successful compile alone
proves nothing.

| Status | Fonts |
|---|---|
| **Verified on Texapi** (regular, bold, italic) | Source Sans Pro, Source Serif Pro, Alegreya, EB Garamond, Inter, Roboto, Lato, IBM Plex Sans, Nunito, Merriweather, Raleway, Open Sans |
| **Verified locally, pending a Texapi check** | Crimson Pro, Crimson Text, Fira Sans, PT Serif, Cormorant Garamond, Inconsolata, Libertinus, Noto Sans, Latin Modern |
| **Fail on Texapi pdflatex** | Work Sans, Lora, Jost, Mulish, Zilla Slab, Titillium Web, Aleo, Asap, Courier Prime |

The failures might work under xelatex/lualatex with `fontspec` if the OTF files exist on
Texapi. That is unverified and belongs in Phase 9.

**Web fonts must match TeX Live 2025's versions exactly.** Google Fonts serves newer releases
(Source Sans 3, not Pro), with different metrics, so a preview using Google's CDN would wrap
lines differently from the PDF. Serve web fonts extracted from the same OFL-licensed font
packages Texapi uses.

### 4.4 Points are not points

CSS `pt` is 1/72 in. TeX `pt` is 1/72.27 in, about 0.37% smaller. TeX's `bp` is 1/72 in.
**The LaTeX serializer must emit `bp`**, or every size in the PDF comes out slightly smaller
than the preview.

### 4.5 Line breaking will differ

TeX breaks paragraphs with Knuth-Plass, which optimises a whole paragraph at once. Browsers
break line by line. Same font and size, different wraps: occasionally a different line count,
and at a page boundary, a different page count.

"Does it fit on one page?" is a core resume question, so the preview cannot be the authority on
it. Mitigations:

- CSS `text-wrap: pretty` and `hyphens: auto` to narrow the gap.
- A throttled background compile gives the **authoritative page count**, shown as a
  "PDF: 1 page ✓ / spills onto page 2 ⚠" indicator.

### 4.6 Photos do not fit the current compile path

Texapi's JSON endpoint takes a single `.tex` string, which cannot carry an image. The multipart
endpoint accepts files, but reported success for a deliberately broken document during testing.
Photo support needs its own spike (Phase 9).

---

## 5. Boundaries

### 5.1 What we build, and what we don't copy

| ✅ Build (features and ideas, not protectable) | ❌ Don't copy (FlowCV's copyrighted work) |
|---|---|
| Independent font-size controls, spacing, margins | Their 105 resume and 67 letter template designs |
| Section add / rename / hide / reorder, custom sections | The 344 preview images |
| One- and two-column layouts, date placement options | Sample resume content (names, bullets, letters) |
| Heading styles, accent colours, date formats | Template names ("Atlantic Blue", "Mercury Flow"…) |
| Preset-based templates, gallery with filters | Brand styling, logo, copy |
| Kanban job tracker, structured cover letters | Their JS/CSS code |

Scraping FlowCV's app for reuse very likely breaches its Terms of Service as well. We design
**original presets** on our own parametric renderer. The architecture is the reusable part.

### 5.2 The capture is currently in `public/`

Next.js serves `public/` from the site root, so the capture would be reachable at
`/app.flowcv.com_20260913-175206/…`. It is **untracked**, so git-based deploys (Netlify, Cloud
Build) do not ship it today. A local build, a manual upload, or a stray `git add .` would.
It also adds 115 MB. **Phase 0 moves it out.**

---

## 6. Target architecture

### 6.1 One schema, three consumers

```
                    ┌──────────────────────────────┐
  AI import ───────►│      ResumeDocument (JSON)    │◄────── Editor forms
  AI tailor ───────►│  content · layout · style     │        (generated from the
  Template preset ─►│  schemaVersion · validated     │         section registry)
                    └──────┬───────────────┬────────┘
                           │               │
              Section registry + style tokens (single source)
                           │               │
                ┌──────────▼─────┐   ┌─────▼──────────────┐
                │ HTML preview    │   │ LaTeX serializer    │
                │ React, instant, │   │ escaping in one     │
                │ pt units        │   │ place, bp units     │
                └────────────────┘   └─────┬──────────────┘
                                           │
                              Texapi ──────┼────── Overleaf (zip)
                                           │
                                     PDF + page count
```

The old system had five renderers because nothing tied them together. Here, **every section
type is defined once** in the registry (fields, labels, validation, rendering hints) and **every
style value is computed once** in the token module. Both renderers read from those. Drift
becomes a failing test, not a silent bug.

### 6.2 Document schema (sketch)

Our own design, informed by the evidence and not copied field-for-field.

```ts
interface ResumeDocument {
  id: string;
  schemaVersion: 1;            // migrate forward, like FlowCV's "3"
  title: string;               // "Backend – Stripe"
  presetId: string;            // template this started from
  basedOnId?: string;          // set when tailored from a base resume
  jobApplicationId?: string;
  personal: PersonalDetails;
  sections: Section[];         // array order is display order
  layout: Layout;
  style: StyleSettings;
  updatedAt: string;           // optimistic concurrency across tabs
}

type SectionType =
  | 'summary' | 'experience' | 'education' | 'skills' | 'languages'
  | 'certifications' | 'awards' | 'projects' | 'interests' | 'custom';

interface Section {
  id: string;
  type: SectionType;
  title: string;               // renamable
  hidden: boolean;
  column: 'main' | 'side';     // ignored in one-column layouts
  sort: 'manual' | 'dateDesc';
  display?: ListDisplay;       // skills/languages: grid | bullets | levels | text
  entries: Entry[];            // shape defined per type in the registry
}

interface Layout {
  columns: 1 | 2;
  sideWidthPct: number;        // 25–45
  sidePosition: 'left' | 'right';
  pageFormat: 'A4' | 'Letter';
  marginsMm: { x: number; y: number };
}

interface StyleSettings {
  font: { body: FontId; name?: FontId };        // FontId = Texapi-verified registry only
  sizesPt: { base: number; name: number; title: number; heading: number; entryTitle: number };
  lineHeight: number;
  gaps: { section: Step; entry: Step };
  headings: { style: HeadingStyle; case: 'upper' | 'title' | 'asWritten'; icons: boolean };
  colors: { accent: Hex; text: Hex; background: Hex; accentTargets: AccentTarget[] };
  header: { align: 'left' | 'center' | 'right'; titlePlacement: 'below' | 'inline'; contactStyle: ContactStyle };
  entries: { dateLocation: 'right' | 'left' | 'below'; subtitle: 'normal' | 'italic' | 'bold'; dateFormat: DateFormat };
  links: { underline: boolean; accent: boolean };
  footer: { pageNumbers: boolean; name: boolean };
}

type RichText = ProseMirrorJSON;  // restricted: paragraph, bulletList, listItem, bold, italic, link

type Preset = { id: string; name: string; tags: string[]; layout: Partial<Layout>; style: StyleSettings };
```

Two deliberate simplifications versus FlowCV:

- **Column assignment lives on the section** (`column`), not in a separate order list per
  layout. Switching one column → two → one keeps assignments without three parallel orders.
- **Sizes are points everywhere**, with the UI snapping to 0.5 pt, rather than a mix of step
  scales and points.

`applyPreset(doc, preset)` replaces `layout` and `style` and never touches `sections` or
`personal`. That is the whole "switch template without losing content" feature.

### 6.3 Storage

- PostgreSQL: `app.resumes (user_id, id, document jsonb)`. Every query is scoped to the signed-in user.
- Autosave debounced ~1 s. `updatedAt` detects a stale write from a second tab.
- Resume JSON is a few tens of KB; the API caps a document at 2 MB.
- Generated PDFs and `.tex` keep the existing Storage paths and `/api/documents/url` re-signing.

### 6.4 Reused vs retired

| Reused as-is or extended | Retired |
|---|---|
| `escapeSpecials` → the serializer's only escaping path | AI writing LaTeX directly (delimited-response parsing in `generateLatex.ts`) |
| Texapi compiler, rate limiter, 422 re-check | Editable in-app LaTeX tab with recompile (see below) |
| Database access, document storage, daily quota, URL re-signing | |
| Overleaf single-file and zip export | |
| `PdfPreview`, golden text-layer tests | |
| `common.tex` / macros → become the parametric template | |
| Prompt rules: no fabrication, no invented dates, today's date, profile as ground truth | |
| `sanitize.ts` → kept as a safety net for raw LaTeX paths | |

**The consequence of choosing structured documents:** raw LaTeX edits cannot flow back into
the structured model. The LaTeX tab becomes **read-only "View LaTeX"**, alongside Download
.tex and Open in Overleaf. Overleaf is the path for raw LaTeX editing. An optional later
addition: "detach to raw LaTeX", turning a document into a LaTeX-only one that gives up
structured editing.

### 6.5 AI on the structured model

- **Import:** extracted PDF text → a valid `ResumeDocument`. This replaces today's upload step,
  and "Import existing resume" becomes the same pipeline.
- **Tailor:** base document + job description → a tailored **copy** linked to the application,
  plus the match analysis.
- **Structured output:** Gemini's `responseSchema` has the API enforce the JSON shape, rather
  than parsing free text. Your original objection to JSON came from the old implementation's
  brace-patching parser; schema-enforced output removes that failure class. **Unverified on
  `gemini-3.7-flash`: this is a Phase 1 spike and a gate for Phase 5.**
- Quota: import and tailor count toward the 25/day. Editing and preview are free. PDF exports
  are throttled separately because they spend the shared Texapi budget.

### 6.6 Dependencies to add

| Need | Choice | Why |
|---|---|---|
| Drag and drop | `@dnd-kit/core`, `@dnd-kit/sortable` | Accessible (keyboard dragging), maintained |
| Rich text | `@tiptap/react` with a restricted node set | ProseMirror JSON maps cleanly to both HTML and LaTeX |
| Colour picker | `react-colorful` | ~2 KB |
| Parity and E2E tests | `@playwright/test` | Screenshot the preview; drive full flows |

Already present and reused: `zod` (schema), Redux Toolkit (editor state and undo history, so
no Zustand).

---

## 7. Feature specification

### 7.1 Content editing (Phase 3)

- **Resumes list:** create, duplicate, rename, delete; mark one as "base".
- **Sections:** add from type list; add custom section; **rename**; **hide/show**; **drag to
  reorder**; move between main/side column; delete (with undo).
- **Entries:** type-specific form; **hide/show**; drag to reorder; toggle date auto-sort.
- **Rich text:** bold, italic, bullet lists, links only. That is what ATS parsers handle
  reliably and what LaTeX renders cleanly.
- **Undo/redo** (Ctrl+Z / Ctrl+Shift+Z) across all content and style changes.
- **Autosave** with a "Saved · Saving… · Offline" indicator.

### 7.2 Customisation panel (Phase 4)

Ordered by what you asked for first, then by user value:

| # | Panel | Controls |
|---|---|---|
| 1 | **Font sizes** | Base, name, job title, section headings, entry titles (pt sliders); reset to preset |
| 2 | **Spacing** | Line height, section gap, entry gap |
| 3 | **Font** | Body family and optional name family, Texapi-verified registry only, grouped serif/sans |
| 4 | **Document** | A4 / Letter, margins |
| 5 | **Layout** | One / two columns, side width, side left/right |
| 6 | **Headings** | 6 styles, capitalisation, icons |
| 7 | **Colours** | Accent, text, background; accent targets |
| 8 | **Header** | Alignment, title placement, contact style |
| 9 | **Entries** | Date/location placement, subtitle style, date format |
| 10 | **Links & footer** | Underline, colour; page numbers, footer name |

A persistent **"PDF: N pages"** badge from the throttled background compile (section 4.5).

### 7.3 Templates (Phase 6)

- **~12 original presets** at launch, chosen to cover the parameter space: one- and two-column,
  serif and sans, each heading style, compact and spacious. Each one is a JSON object, so more
  are cheap to add later.
- Gallery filters by tag (Simple / Modern / Creative / Compact / First job).
- **Thumbnails are rendered from our own presets** at build time, lazy-loaded and virtualised.
  FlowCV's capture shows the cost of not doing this: 210 image requests on first load.

### 7.4 Cover letters (Phase 7)

- Structured fields: recipient (name, title, company, department, address), subject, date
  (today or custom), greeting, rich-text body, closing, typed signature.
- Header layouts: left, split, right.
- **Matching set:** a letter can inherit a resume's font, colours and header, so both look like
  one application.
- AI draft from the tailored resume and job description (existing prompt rules carry over).
- Signature *image*: Phase 9, since it has the same compile constraint as photos.

### 7.5 Job tracker (Phase 8)

A **board view over the statuses you already have**, next to the existing table. No data
migration needed:

| Board column | Existing `status` |
|---|---|
| Wishlist | `not_applied` |
| Applied | `applied` |
| Interview | `interviewing` |
| Offer | `offered`, plus badges for `accepted` / `declined` |
| Rejected | `rejected` |

Drag between columns updates `status`. Cards link to their tailored resume and letter. Search
and board/table toggle.

**Custom columns are deferred:** they require migrating `status` from a fixed enum to
user-defined stages.

---

## 8. Phased delivery

Sizes are relative (S < M < L < XL), not calendar estimates. **The current generation flow stays
live until Phase 5 switches over**, so the app never loses its core feature mid-build.

### Phase 0: Hygiene · S

- Move the capture out of `public/` into `research/flowcv-2026-09-13/` and gitignore it.
- Replace the expired Gemini credential (currently a short-lived `AQ.` OAuth token).
- Pin local TeX tests to `texlive/texlive:TL2025-historic`.

**Exit:** nothing competitor-derived under `public/`; `npm run check:env` all green.

### Phase 1: Schema and registries · M

- `ResumeDocument` zod schema, `schemaVersion`, migration scaffold.
- Section-type registry, including custom sections.
- **Font registry of Texapi-verified fonts only**, with a paced CI test that compiles each on
  Texapi and checks the embedded `/BaseFont` (section 4.3).
- Style-token module (`pt` for CSS, `bp` for LaTeX).
- Database model and access rules.
- **Spike:** Gemini `responseSchema` on `gemini-3.7-flash`. Record the result.

**Exit:** schema and font CI pass; Gemini spike answered.

### Phase 2: Both renderers + parity gate · L · highest risk

- LaTeX serializer: parametric template grown from `common.tex`/macros, `escapeSpecials` for
  all text, `bp` units.
- HTML preview renderer at true page size, with page-boundary overlay.
- Web fonts extracted from the TeX Live 2025 packages.
- **Parity harness**, for 3 seed presets × sample documents:
  1. text-layer order identical in preview and PDF
  2. page count identical
  3. pixel diff under threshold

**Exit:** parity within threshold.

**Gate: if parity cannot be reached, stop.** Revisit the preview decision before building the
editor. The fallback is compile-only preview with a self-hosted compiler.

### Phase 3: Editor, content · L

Resumes list; editor shell (content panel | live preview); every section and entry operation in
7.1; TipTap feeding both renderers; undo/redo; autosave; stale-write detection.

**Exit:** each operation shows instantly in the preview and correctly in the exported PDF.

### Phase 4: Customisation panel · L

The panels in 7.2, **font sizes and spacing first**; background page-count badge.

**Exit:** every control is covered by a parity test.

### Phase 5: AI on structured documents + switchover · M

Import and tailor (section 6.5); carry over prompt rules; point the dashboard at the new editor;
**remove the AI-writes-LaTeX path**.

**Exit:** E2E import → tailor → edit → export passes; old path deleted.

### Phase 6: Template gallery · M

About 12 original presets, tag filters, build-time thumbnails, apply-without-losing-content.

**Exit:** switching presets never changes content; gallery lazy-loads.

### Phase 7: Cover-letter editor · M

Section 7.4.

**Exit:** letters export through the same serializer and parity harness.

### Phase 8: Job-tracker board · M

Section 7.5.

**Exit:** dragging updates status; existing table view unchanged.

### Phase 9: Extensions · varies, each needs its own spike

- **Photos and signature images:** multipart compile, with server-side validation that the PDF's
  text layer contains the expected name, which catches the silent failures seen in testing. Or
  defer.
- **More fonts:** xelatex/`fontspec` path for the 9 pdflatex failures; CJK/Arabic/Hebrew.
- **Custom Kanban columns:** status → stage migration.
- **Accessibility:** FlowCV's own capture logged 70 contrast failures (4.28:1 against the 4.5:1
  minimum) and no skip link. Don't inherit those.
- **Performance:** route-split the editor bundle. FlowCV ships one 769 KB bundle to every route.

---

## 9. Testing strategy

| Layer | What | Where it runs |
|---|---|---|
| Schema | zod validation; each migration upgrades old fixtures | Vitest, offline |
| Registry | Every section type renders in both renderers | Vitest, offline |
| Serializer | Golden `.tex` per preset; any valid document yields LaTeX that passes `sanitize.ts` | Vitest, offline |
| **Parity** | Text order + page count + pixel diff, preview vs PDF | Playwright + Texapi, paced |
| **Fonts** | Each registry font compiles on Texapi with the right `/BaseFont` | CI, paced, weekly |
| Rich text | ProseMirror → HTML and → LaTeX, including nested lists and links | Vitest, offline |
| Editor | Section/entry ops, undo/redo, autosave conflicts | Vitest + Testing Library |
| E2E | Import → tailor → edit → customise → export → Overleaf | Playwright |

Paced tests share the production Texapi key, so they must keep using the existing limiter, and
**must run against TeX Live 2025**, never local 2026 (section 4.2).

---

## 10. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Preview/PDF drift makes the preview untrustworthy | Medium | High | Shared tokens and registry; version-matched web fonts; `bp` units; **Phase 2 gate** |
| 2 | Texapi throughput under many editors | High at scale | High | Throttled checks; ~15 concurrent-editor ceiling measured; self-hosted compiler path documented |
| 3 | Gemini structured output unreliable on current model | Low–Med | High | Phase 1 spike gates Phase 5 |
| 4 | Font version or availability mismatch | Medium | Medium | Texapi-only registry; TL2025 pin; weekly font CI |
| 5 | Scope creep: FlowCV has 33 customisation groups | High | Medium | Ship font sizes and section editing first; each panel is its own increment |
| 6 | Rich-text → LaTeX edge cases | Medium | Medium | Restricted node set; property tests |
| 7 | Photos cannot compile reliably | Medium | Low | Deferred spike; text-layer validation |
| 8 | IP exposure from the capture | Low if Phase 0 done | High | Original presets; move the capture out of `public/` |

---

## 11. Verify first

1. **Gemini `responseSchema` on `gemini-3.7-flash`** (needs a permanent API key). Gates Phase 5.
2. **Parity on one preset:** build the smallest serializer and preview for a single one-column
   preset and measure drift before investing further. Gates Phase 3.
3. **The 9 locally-verified fonts on Texapi.** Cheap, and it widens the launch registry.
4. **Font file provenance:** confirm the OFL licence and exact version for each web font
   extracted from TeX Live 2025.

---

## Appendix: key evidence

| Claim | Source |
|---|---|
| Logged-out capture | `pages/resumes__*/network/xhr/GET_5d86e00160.json` → `"user": null, "currentPlan": "free"` |
| Customisation schema, 105 templates | `assets/documents/published-resume-templates__e7e587.json` |
| Cover-letter model, 67 templates | `assets/documents/published-letter-templates__0af91e.json` |
| Editor panel and control labels | `assets/js/index-315aef74__889198.js` ("Base Font Size", "Rearrange Content", "Apply to"…) |
| Texapi is TeX Live 2025 | `\pdftexbanner` typeset on Texapi, 2026-09-17 |
| Font availability | Compiled per font on Texapi; embedded `/BaseFont` read from uncompressed PDFs |
| Job-tracker stages | `pages/job-tracker__*/content.txt`, `screenshots/desktop_fold.png` |
