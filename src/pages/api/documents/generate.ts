/**
 * POST /api/documents/generate
 *
 * The single entry point for document generation. Everything that used to be
 * spread across the browser (Gemini call), /api/enhance-with-ai (quota read)
 * and /api/save-generated-pdfs (upload + quota increment) happens here, behind
 * one authenticated, quota-enforced request.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { compileDocuments, generateDocuments, type ContactProfile } from '../../../server/ai/generateLatex';
import { GeminiError, type TokenUsage } from '../../../server/ai/gemini';
import { acquireGenerationSlot, BusyError } from '../../../server/ai/limiter';
import { recordUsage } from '../../../server/ai/usageLedger';
import { prepareContext } from '../../../server/rag/context';
import { query } from '../../../server/db/pool';
import { DbConfigError } from '../../../server/db/pool';
import { attachDocumentLinks } from '../../../server/db/applicationsRepo';
import { StorageConfigError } from '../../../server/storage/documents';
import { forwardIfWorkers } from '../../../server/proxy';
import { attachCoverLetterPdf, findGeneratedResume, saveGeneratedResume } from '../../../server/resumes/saveGenerated';
import { cleanRequestId, createRequestLog, type RequestLog } from '../../../server/log';
import { newId } from '../../../lib/resume/ids';
import { LatexValidationError } from '../../../server/latex/sanitize';
import { LatexCompileError } from '../../../server/latex/compile';
import { verifyAccessToken, AuthConfigError } from '../../../server/auth/verify';
import { uploadDocuments } from '../../../server/storage/documents';
import {
  QuotaExceededError,
  refundGeneration,
  reserveGeneration,
} from '../../../server/db/usage';

export const config = {
  api: {
    // Resume text plus a job description; generous but bounded.
    bodyParser: { sizeLimit: '2mb' },
    // Gemini plus two compiles; Texapi may pause for its rate-limit re-check.
    responseLimit: false,
  },
};

const MIN_RESUME_CHARS = 50;
const MAX_RESUME_CHARS = 60_000;
const MAX_JOB_DESCRIPTION_CHARS = 40_000;

interface GenerateBody {
  idToken?: string;
  /** Created by the browser; the same id appears in both consoles and makes retries idempotent. */
  requestId?: string;
  resumeText?: string;
  jobDescription?: string;
  jobApplicationId?: string;
  documentId?: string;
  company_name?: string;
  position?: string;
  location?: string;
  profile?: ContactProfile;
}

/**
 * Identify the caller from a Supabase access token. The previous flow trusted a
 * `userId` field straight from the request body, so any client could spend
 * another user's quota or write into their storage prefix.
 */
async function authenticate(idToken: string | undefined): Promise<string> {
  if (!idToken) throw new Error('unauthenticated');
  return (await verifyAccessToken(idToken)).userId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Development warm-up: the dashboard calls this once so Next compiles the
  // route (and the database opens its first connection) before the user's first
  // generation, not during it. Does nothing else, and does not exist in production.
  if (req.method === 'GET' && process.env.NODE_ENV !== 'production') {
    void query('SELECT 1').catch(() => undefined);
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // On Cloudflare Workers this route is forwarded to the VM (see server/proxy.ts); on Node it runs here.
  if (await forwardIfWorkers(req, res)) return;

  const body: GenerateBody = req.body ?? {};
  const resumeText = (body.resumeText ?? '').trim();
  const jobDescription = (body.jobDescription ?? '').trim();

  // The browser's id when it sent one (so both consoles share it), else our own.
  const clientRequestId = cleanRequestId(body.requestId);
  const log = createRequestLog('generate', clientRequestId ?? newId(10));
  res.setHeader('X-Request-Id', log.id);
  const reject = (status: number, error: string, extra: Record<string, unknown> = {}) => {
    log.warn('rejected', { status, error });
    return res.status(status).json({ error, requestId: log.id, ...extra });
  };
  log.step('received', {
    resumeChars: resumeText.length,
    jobChars: jobDescription.length,
    position: body.position,
    company: body.company_name,
    fromApplication: Boolean(body.jobApplicationId),
    hasProfile: Boolean(body.profile),
  });

  let userId: string;
  try {
    userId = await authenticate(body.idToken);
    log.step('authenticated');
  } catch (error) {
    log.warn('auth-failed', { reason: error instanceof Error ? error.message : String(error) });
    return reject(401, 'You must be signed in to generate documents.');
  }

  if (resumeText.length < MIN_RESUME_CHARS) {
    return reject(400, 'Your resume text is too short. Upload a resume or paste its contents.');
  }
  if (resumeText.length > MAX_RESUME_CHARS || jobDescription.length > MAX_JOB_DESCRIPTION_CHARS) {
    return reject(413, 'That resume or job description is too large to process.');
  }

  let reserved = false;
  let release: (() => void) | null = null;
  try {
    // Idempotency: this exact generation already produced a résumé (a retry, a
    // double submit, or a reload that re-sent the request). Return it: no
    // second model call, no second charge against the daily quota.
    if (clientRequestId) {
      const prior = await findGeneratedResume(userId, clientRequestId);
      if (prior) {
        log.step('idempotent-hit', { resumeId: prior.id });
        return res.status(200).json({ resumeId: prior.id, reused: true, requestId: log.id });
      }
    }

    // One generation per user, and a cap across the server, before any paid work.
    release = await acquireGenerationSlot(userId);
    log.step('slot-acquired');
    const quota = await reserveGeneration(userId);
    reserved = true;
    log.step('quota-reserved', { used: quota.used, limit: quota.limit });

    // Retrieval: embed and remember this résumé and job for the account, trim
    // what gets sent, and pull relevant facts from the account's other résumés.
    // It never blocks generation: on any problem it returns the input as is.
    const context = await prepareContext({
      uid: userId,
      resumeText,
      jobDescription,
      label: [body.position, body.company_name].filter(Boolean).join(' – ') || undefined,
    });
    log.step('rag', { ...context.stats });

    const usages: TokenUsage[] = [];
    // PDFs are compiled later, after the résumé is safely saved: the Studio
    // document is the deliverable, the PDFs only feed saved links.
    const documents = await generateDocuments(
      context.resumeText,
      context.jobDescription,
      { company_name: body.company_name, position: body.position, location: body.location },
      body.profile ?? {},
      { supplement: context.supplement, onUsage: (u) => usages.push(u), compile: false },
    );
    log.step('llm', {
      calls: usages.length,
      model: usages[0]?.model,
      promptTokens: usages.reduce((n, u) => n + u.promptTokens, 0),
      outputTokens: usages.reduce((n, u) => n + u.outputTokens, 0),
      cachedTokens: usages.reduce((n, u) => n + u.cachedTokens, 0),
      keys: usages.map((u) => u.keyId),
      matchScore: documents.analysis.match_score,
      resumeTexChars: documents.resumeTex.length,
    });
    void recordUsage(userId, usages, {
      ragMode: context.stats.mode,
      charsSaved: Math.max(0, context.stats.resumeChars - context.stats.sentResumeChars),
    });

    // 1. Save the résumé for the Studio FIRST. Everything after this is optional.
    const job = { title: body.position || 'Position', company: body.company_name || 'Company', jobApplicationId: body.jobApplicationId };
    const studioInput = {
      resumeTex: documents.resumeTex,
      coverLetterTex: documents.coverLetterTex,
      analysis: documents.analysis,
    };
    let resumeId: string | null = null;
    for (let attempt = 1; attempt <= 2 && !resumeId; attempt += 1) {
      try {
        resumeId = await saveGeneratedResume(userId, studioInput, { ...job, generationId: clientRequestId ?? log.id });
        log.step('studio-saved', { resumeId, attempt });
      } catch (saveError) {
        log.error('studio-save-failed', saveError, { attempt });
      }
    }

    // 2. PDFs and saved links: best effort, bounded, never fatal.
    const compiled = await compileDocuments(documents.resumeTex, documents.coverLetterTex);
    log.step('compile', { ok: compiled.compile.ok, note: compiled.compile.note });

    let stored: Awaited<ReturnType<typeof uploadDocuments>> | null = null;
    if (compiled.resumePdf && compiled.coverLetterPdf) {
      try {
        stored = await withTimeout(
          uploadDocuments({
            userId,
            jobApplicationId: body.jobApplicationId,
            documentId: body.documentId,
            resumePdf: compiled.resumePdf,
            resumeTex: documents.resumeTex,
            coverLetterPdf: compiled.coverLetterPdf,
            coverLetterTex: documents.coverLetterTex,
          }),
          STORAGE_TIMEOUT_MS,
          'Document storage',
        );
        if (body.jobApplicationId) await persistToApplication(userId, body.jobApplicationId, stored);
        if (resumeId) {
          await attachCoverLetterPdf(userId, resumeId, { url: stored.coverLetterPdf.url, path: stored.coverLetterPdf.path });
        }
        log.step('storage', { ok: true });
      } catch (storageError) {
        log.error('storage-failed', storageError);
        stored = null;
      }
    } else {
      log.step('storage', { ok: false, reason: 'no PDFs to store' });
    }

    log.step('responding', { resumeId, pdfs: stored !== null });
    return res.status(200).json({
      // The Studio document to open. Null only if saving it failed twice.
      resumeId,
      requestId: log.id,
      analysis: documents.analysis,
      // Source is returned so the UI can offer "Open in Overleaf" and
      // "Download .tex" without a second round trip.
      resumeTex: documents.resumeTex,
      coverLetterTex: documents.coverLetterTex,
      // Empty strings when Storage was unavailable; the client compiles from
      // the LaTeX instead. `storageOk` says which case this is.
      storageOk: stored !== null,
      resumeUrl: stored?.resumePdf.url ?? '',
      coverLetterUrl: stored?.coverLetterPdf.url ?? '',
      resumePath: stored?.resumePdf.path ?? '',
      coverLetterPath: stored?.coverLetterPdf.path ?? '',
      resumeTexUrl: stored?.resumeTex.url ?? '',
      coverLetterTexUrl: stored?.coverLetterTex.url ?? '',
    });
  } catch (error) {
    log.error('failed', error, { refunded: reserved });
    if (reserved) await refundGeneration(userId);
    return respondToError(error, res, log);
  } finally {
    release?.();
    log.step('done');
  }
}

async function persistToApplication(
  userId: string,
  jobApplicationId: string,
  stored: Awaited<ReturnType<typeof uploadDocuments>>,
): Promise<void> {
  // Paths do not expire, unlike the signed URLs. Keeping them is what lets
  // /api/documents/url revive a stale link. Only the caller's own application is touched.
  await attachDocumentLinks(userId, jobApplicationId, {
    resumeUrl: stored.resumePdf.url,
    coverLetterUrl: stored.coverLetterPdf.url,
    resumePath: stored.resumePdf.path,
    coverLetterPath: stored.coverLetterPdf.path,
    resumeTexPath: stored.resumeTex.path,
    coverLetterTexPath: stored.coverLetterTex.path,
  });
}

/**
 * Map internal failures to user-facing messages. Details go to the server log;
 * users see something actionable rather than a LaTeX or API error.
 */
const STORAGE_TIMEOUT_MS = 20_000;

/** Reject after `ms`; the underlying work keeps running but no longer blocks the response. */
function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

function respondToError(error: unknown, res: NextApiResponse, log: RequestLog) {
  const send = (status: number, payload: Record<string, unknown>) => res.status(status).json({ ...payload, requestId: log.id });

  if (error instanceof BusyError) {
    return send(429, { error: error.message, busy: error.scope });
  }

  if (error instanceof QuotaExceededError) {
    return send(429, {
      error: `You have reached your daily limit of ${error.limit} generations. Please try again tomorrow.`,
      used: error.used,
      limit: error.limit,
    });
  }

  if (error instanceof DbConfigError || error instanceof StorageConfigError || error instanceof AuthConfigError) {
    console.error('[documents/generate] Misconfigured:', error.message);
    return send(500, { error: 'Server configuration error. Please contact support.' });
  }

  if (error instanceof LatexValidationError) {
    console.error('[documents/generate] LaTeX rejected:', error.message, error.detail);
    return send(502, {
      error: 'The AI produced a document we could not format. Please try generating again.',
    });
  }

  if (error instanceof LatexCompileError) {
    console.error('[documents/generate] Compile failed:', error.message, error.status, error.log);
    return send(502, {
      error: 'We could not render your documents. Please try generating again.',
    });
  }

  if (error instanceof GeminiError) {
    console.error('[documents/generate] Gemini failed:', error.message);
    return send(502, {
      error: 'The AI service is unavailable right now. Please try again in a moment.',
    });
  }

  console.error('[documents/generate] Unexpected error:', error);
  return send(500, { error: 'Something went wrong. Please try again.' });
}
