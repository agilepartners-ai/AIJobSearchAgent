/**
 * Client-side wrapper around the document APIs.
 *
 * All generation now happens server-side. The browser sends the resume text
 * and a Firebase ID token; it never sees an AI or compiler API key.
 */
import { auth } from '../lib/firebase';
import { flowLog } from '../lib/flowLog';

export interface DocumentAnalysis {
  match_score: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  present_keywords: string[];
  missing_keywords: string[];
}

export interface GeneratedDocuments {
  /** The Resume Studio document the server saved; null only if that save failed. */
  resumeId?: string | null;
  analysis: DocumentAnalysis;
  resumeTex: string;
  coverLetterTex: string;
  /** False when Storage was unreachable; the URLs and paths are then empty. */
  storageOk?: boolean;
  resumeUrl: string;
  coverLetterUrl: string;
  resumePath: string;
  coverLetterPath: string;
  resumeTexUrl: string;
  coverLetterTexUrl: string;
}

export interface ContactProfile {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface GenerateRequest {
  /** Created per attempt; shared with the server's logs and used to make retries idempotent. */
  requestId?: string;
  resumeText: string;
  jobDescription: string;
  jobApplicationId?: string;
  documentId?: string;
  company_name?: string;
  position?: string;
  location?: string;
  /**
   * Authoritative contact details. PDF extraction often mangles or drops the
   * resume header, so the saved profile wins over whatever was parsed.
   */
  profile?: ContactProfile;
}

/** Carries the server's user-facing message plus the status for quota handling. */
export class DocumentServiceError extends Error {
  constructor(message: string, readonly status: number, readonly requestId?: string) {
    super(message);
    this.name = 'DocumentServiceError';
  }
}

async function idToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new DocumentServiceError('You must be signed in to generate documents.', 401);
  }
  return user.getIdToken();
}

async function readError(response: Response): Promise<never> {
  const payload = await response.json().catch(() => null);
  throw new DocumentServiceError(
    payload?.error ?? 'Something went wrong. Please try again.',
    response.status,
    payload?.requestId ?? response.headers.get('x-request-id') ?? undefined,
  );
}

/** A generation is one model call plus PDF work; anything past this is stuck. */
const GENERATE_TIMEOUT_MS = 170_000;

export async function generateDocuments(request: GenerateRequest): Promise<GeneratedDocuments> {
  const rid = request.requestId;
  const started = Date.now();
  flowLog(rid, 'client:submit', { resumeChars: request.resumeText.length, jobChars: request.jobDescription.length });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
  try {
    const token = await idToken();
    const response = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, idToken: token }),
      signal: controller.signal,
    });
    flowLog(rid, 'client:response', { status: response.status, ms: Date.now() - started, serverRid: response.headers.get('x-request-id') });

    if (!response.ok) await readError(response);
    const result = (await response.json()) as GeneratedDocuments;
    flowLog(rid, 'client:parsed', { resumeId: result.resumeId ?? null, storageOk: result.storageOk, reused: (result as { reused?: boolean }).reused ?? false });
    return result;
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      flowLog(rid, 'client:error', { status: error.status, message: error.message });
      throw error;
    }
    const aborted = error instanceof Error && error.name === 'AbortError';
    flowLog(rid, 'client:error', { aborted, message: error instanceof Error ? error.message : String(error) });
    throw new DocumentServiceError(
      aborted
        ? 'This is taking longer than expected. Your resume may still finish — check Resume Studio in a minute before trying again.'
        : 'Could not reach the server. Check your connection and try again.',
      aborted ? 504 : 0,
      rid,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Recompile edited source. Returns an object URL for the resulting PDF. */
export async function compileLatex(tex: string): Promise<Blob> {
  const response = await fetch('/api/documents/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tex, idToken: await idToken() }),
  });

  if (!response.ok) await readError(response);
  return response.blob();
}

/**
 * Mint a fresh URL for a stored document. Signed URLs expire after a week, so
 * anything loaded from a saved record should go through this rather than
 * reusing the URL captured at generation time.
 */
export async function refreshDocumentUrl(path: string): Promise<string> {
  const response = await fetch('/api/documents/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, idToken: await idToken() }),
  });

  if (!response.ok) await readError(response);
  return (await response.json()).url;
}

/** Trigger a browser download of a text file (used for .tex). */
export function downloadText(filename: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/x-tex' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
