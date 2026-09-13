/**
 * Orchestrates: prompt -> LaTeX -> validate -> compile -> PDF.
 *
 * One Gemini call produces all three outputs, separated by delimiters rather
 * than nested in JSON. That is deliberate: LaTeX is backslash-dense, and
 * embedding it in JSON means every `\` has to survive as `\\`. Models get that
 * wrong constantly, and it was a major source of breakage in the old pipeline.
 * Delimiters sidestep the escaping problem entirely.
 */
import fs from 'fs';
import path from 'path';
import { buildDocument } from '../latex/buildDocument';
import { LatexValidationError } from '../latex/sanitize';
import { getCompiler, LatexCompileError } from '../latex/compile';
import { generateText } from './gemini';

const PROMPT_PATH = path.join(process.cwd(), 'src', 'server', 'ai', 'prompts', 'system.md');

let cachedPrompt: string | null = null;
function systemPrompt(): string {
  if (cachedPrompt === null) {
    cachedPrompt = fs.readFileSync(PROMPT_PATH, 'utf8').replace(/\r\n/g, '\n');
  }
  return cachedPrompt;
}

export interface JobContext {
  company_name?: string;
  position?: string;
  location?: string;
}

/**
 * Authoritative contact details from the user's saved profile.
 *
 * Parsed resume text frequently loses the header — PDF extraction mangles
 * multi-column contact lines, and some resumes put them in an image. The old
 * pipeline worked around this by preferring the profile over anything parsed,
 * so the profile is passed to the model as ground truth for \resheader.
 */
export interface ContactProfile {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface Analysis {
  match_score: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  present_keywords: string[];
  missing_keywords: string[];
}

export interface GeneratedDocuments {
  analysis: Analysis;
  resumeTex: string;
  coverLetterTex: string;
  resumePdf: Buffer;
  coverLetterPdf: Buffer;
}

const EMPTY_ANALYSIS: Analysis = {
  match_score: 0,
  strengths: [],
  gaps: [],
  suggestions: [],
  present_keywords: [],
  missing_keywords: [],
};

function formatProfile(profile: ContactProfile): string[] {
  const fields: [string, string | undefined][] = [
    ['Name', profile.fullName],
    ['Email', profile.email],
    ['Phone', profile.phone],
    ['Location', profile.location],
    ['LinkedIn', profile.linkedin],
    ['GitHub', profile.github],
    ['Portfolio', profile.portfolio],
  ];

  const present = fields.filter(([, value]) => value?.trim());
  if (present.length === 0) return [];

  return [
    '## Verified contact details',
    'These come from the candidate\'s account and are authoritative. Use them in',
    '\\resheader and \\clheader even if the resume text below says something',
    'different or omits them. Include only the ones listed here.',
    ...present.map(([label, value]) => `${label}: ${value!.trim()}`),
    '',
  ];
}

function buildUserPrompt(
  resumeText: string,
  jobDescription: string,
  job: JobContext,
  profile: ContactProfile,
  correction?: string,
): string {
  // Models have no reliable sense of the current date and will invent one for
  // the cover letter — an observed run dated a 2026 letter "May 18, 2024".
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const parts = [
    '## Job application context',
    `Today's date: ${today}`,
    `Position: ${job.position || '(not specified)'}`,
    `Company: ${job.company_name || '(not specified)'}`,
    `Location: ${job.location || '(not specified)'}`,
    '',
    ...formatProfile(profile),
    '## Job description',
    jobDescription.trim() || '(none provided — optimise the resume generally)',
    '',
    "## Candidate's current resume",
    resumeText.trim(),
  ];

  if (correction) {
    parts.push(
      '',
      '## Your previous attempt was rejected',
      correction,
      '',
      'Reproduce the full output, using only the documented macros this time.',
    );
  }

  return parts.join('\n');
}

/** Split the delimited response. Missing sections are an error, not a silent empty. */
function splitSections(raw: string): { analysis: string; resume: string; coverLetter: string } {
  const resumeIdx = raw.indexOf('<<<RESUME>>>');
  const coverIdx = raw.indexOf('<<<COVER_LETTER>>>');

  if (resumeIdx === -1 || coverIdx === -1 || coverIdx < resumeIdx) {
    throw new LatexValidationError(
      'The AI response did not contain the expected sections.',
      'missing <<<RESUME>>> or <<<COVER_LETTER>>> delimiter',
    );
  }

  const analysisIdx = raw.indexOf('<<<ANALYSIS>>>');
  const analysis =
    analysisIdx === -1
      ? ''
      : raw.slice(analysisIdx + '<<<ANALYSIS>>>'.length, resumeIdx).trim();

  return {
    analysis,
    resume: raw.slice(resumeIdx + '<<<RESUME>>>'.length, coverIdx).trim(),
    coverLetter: raw.slice(coverIdx + '<<<COVER_LETTER>>>'.length).trim(),
  };
}

/**
 * The analysis block is cosmetic — it drives score badges and keyword chips.
 * A malformed one must never cost the user their documents, so this degrades
 * to an empty analysis rather than throwing.
 */
function parseAnalysis(block: string): Analysis {
  if (!block) return EMPTY_ANALYSIS;

  const start = block.indexOf('{');
  const end = block.lastIndexOf('}');
  if (start === -1 || end <= start) return EMPTY_ANALYSIS;

  try {
    const parsed = JSON.parse(block.slice(start, end + 1));
    const strings = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

    const score = Number(parsed.match_score);
    return {
      match_score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
      strengths: strings(parsed.strengths),
      gaps: strings(parsed.gaps),
      suggestions: strings(parsed.suggestions),
      present_keywords: strings(parsed.present_keywords),
      missing_keywords: strings(parsed.missing_keywords),
    };
  } catch {
    return EMPTY_ANALYSIS;
  }
}

/**
 * Generate both documents and compile them.
 *
 * Retries once when the model produces LaTeX we reject. Note there is no
 * compiler-driven repair: Texapi never returns a log (see compile/texapi.ts),
 * so a compile failure gives us nothing to correct with. That is why
 * validation happens locally and up front.
 */
export async function generateDocuments(
  resumeText: string,
  jobDescription: string,
  job: JobContext = {},
  profile: ContactProfile = {},
): Promise<GeneratedDocuments> {
  const compiler = getCompiler();
  let correction: string | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await generateText({
      systemPrompt: systemPrompt(),
      userPrompt: buildUserPrompt(resumeText, jobDescription, job, profile, correction),
    });

    let resumeTex: string;
    let coverLetterTex: string;
    let analysis: Analysis;

    try {
      const sections = splitSections(raw);
      analysis = parseAnalysis(sections.analysis);
      // buildDocument sanitizes; it throws LatexValidationError on bad input.
      resumeTex = buildDocument(sections.resume, 'resume');
      coverLetterTex = buildDocument(sections.coverLetter, 'coverLetter');
    } catch (error) {
      if (error instanceof LatexValidationError && attempt === 0) {
        correction = error.detail
          ? `${error.message} Problem: ${error.detail}`
          : error.message;
        continue;
      }
      throw error;
    }

    const [resumePdf, coverLetterPdf] = await Promise.all([
      compiler.compile(resumeTex),
      compiler.compile(coverLetterTex),
    ]);

    return {
      analysis,
      resumeTex,
      coverLetterTex,
      resumePdf: resumePdf.pdf,
      coverLetterPdf: coverLetterPdf.pdf,
    };
  }

  // Unreachable: the loop either returns or throws.
  throw new LatexCompileError('Document generation failed.');
}
