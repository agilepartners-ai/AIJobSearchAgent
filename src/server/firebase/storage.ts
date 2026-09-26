/**
 * Uploads generated documents and hands back viewable URLs.
 *
 * Note on URL lifetime: v4 signed URLs cap out at 7 days, and the previous
 * implementation stored one directly on the job application. Anything older
 * than that stopped loading on the Saved Resumes page. We now also persist the
 * storage *path*, so a fresh URL can be minted on demand — see
 * signUrlForPath() and /api/documents/url.
 */
import { getBucket } from './admin';

/** Safe margin under the 7-day v4 signed-URL maximum. */
const SIGNED_URL_TTL_MS = 6.5 * 24 * 60 * 60 * 1000;

export interface StoredDocument {
  /** Storage object path — persist this; it does not expire. */
  path: string;
  /** Signed URL for immediate display. Expires; re-sign from `path`. */
  url: string;
}

export interface DocumentBundle {
  resumePdf: StoredDocument;
  resumeTex: StoredDocument;
  coverLetterPdf: StoredDocument;
  coverLetterTex: StoredDocument;
}

/**
 * Path prefix for a generation. Job applications keep their historical layout
 * so existing documents stay reachable; generations without an application get
 * their own namespace.
 */
function prefixFor(userId: string, jobApplicationId?: string, documentId?: string): string {
  return jobApplicationId
    ? `ApplicationDocuments/${jobApplicationId}`
    : `UserDocuments/${userId}/${documentId ?? Date.now()}`;
}

async function upload(
  path: string,
  body: Buffer | string,
  contentType: string,
): Promise<StoredDocument> {
  const file = getBucket().file(path);

  await file.save(body, {
    contentType,
    resumable: false,
    // Regenerating overwrites in place, so a cached copy would show stale output.
    metadata: { cacheControl: 'no-store' },
  });

  return { path, url: await signUrlForPath(path) };
}

/** Mint a fresh signed URL for an already-stored object. */
export async function signUrlForPath(path: string): Promise<string> {
  const [url] = await getBucket()
    .file(path)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: new Date(Date.now() + SIGNED_URL_TTL_MS),
    });
  return url;
}

export async function objectExists(path: string): Promise<boolean> {
  const [exists] = await getBucket().file(path).exists();
  return exists;
}

export interface UploadInput {
  userId: string;
  jobApplicationId?: string;
  documentId?: string;
  resumePdf: Buffer;
  resumeTex: string;
  coverLetterPdf: Buffer;
  coverLetterTex: string;
}

export async function uploadDocuments(input: UploadInput): Promise<DocumentBundle> {
  const prefix = prefixFor(input.userId, input.jobApplicationId, input.documentId);

  const [resumePdf, resumeTex, coverLetterPdf, coverLetterTex] = await Promise.all([
    upload(`${prefix}_resume.pdf`, input.resumePdf, 'application/pdf'),
    upload(`${prefix}_resume.tex`, input.resumeTex, 'application/x-tex'),
    upload(`${prefix}_coverletter.pdf`, input.coverLetterPdf, 'application/pdf'),
    upload(`${prefix}_coverletter.tex`, input.coverLetterTex, 'application/x-tex'),
  ]);

  return { resumePdf, resumeTex, coverLetterPdf, coverLetterTex };
}
