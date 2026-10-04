/**
 * Generated documents (PDF and LaTeX source) stored in Postgres, addressed by a
 * per-user path, and handed out as time-limited signed links.
 *
 * Links look like /api/documents/file?p=<path>&u=<user>&e=<expiry>&s=<hmac>.
 * They work in an <iframe> or a plain download link (no Authorization header
 * needed), expire, and cannot be forged or edited without DOCUMENT_SIGNING_SECRET.
 * The *path* is what gets persisted: it never expires, and /api/documents/url
 * mints a fresh link from it for the signed-in owner.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { query } from '../db/pool';

const LINK_TTL_MS = 6.5 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 10 * 1024 * 1024;

export interface StoredDocument {
  /** Persist this; it does not expire. */
  path: string;
  /** Signed link for immediate display. Expires; re-sign from `path`. */
  url: string;
}

export interface DocumentBundle {
  resumePdf: StoredDocument;
  resumeTex: StoredDocument;
  coverLetterPdf: StoredDocument;
  coverLetterTex: StoredDocument;
}

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigError';
  }
}

let devSecret: string | null = null;

function secret(): string {
  const s = process.env.DOCUMENT_SIGNING_SECRET;
  if (s && s.length >= 24) return s;
  if (process.env.NODE_ENV === 'production') throw new StorageConfigError('DOCUMENT_SIGNING_SECRET is not set');
  // Development only: a per-process secret, so links work but do not survive a restart.
  devSecret ??= randomBytes(32).toString('hex');
  return devSecret;
}

const sign = (userId: string, path: string, expires: number) =>
  createHmac('sha256', secret()).update(`${userId}\n${path}\n${expires}`).digest('base64url');

/** A fresh signed link for a document the caller owns. */
export function signLink(userId: string, path: string, ttlMs = LINK_TTL_MS): string {
  const expires = Date.now() + ttlMs;
  const q = new URLSearchParams({ p: path, u: userId, e: String(expires), s: sign(userId, path, expires) });
  return `/api/documents/file?${q.toString()}`;
}

export type LinkCheck = { ok: true; userId: string; path: string } | { ok: false; reason: 'malformed' | 'expired' | 'forged' };

export function verifyLink(params: { p?: unknown; u?: unknown; e?: unknown; s?: unknown }): LinkCheck {
  const { p, u, e, s } = params;
  if (typeof p !== 'string' || typeof u !== 'string' || typeof e !== 'string' || typeof s !== 'string') return { ok: false, reason: 'malformed' };
  const expires = Number(e);
  if (!Number.isFinite(expires)) return { ok: false, reason: 'malformed' };
  const want = Buffer.from(sign(u, p, expires));
  const got = Buffer.from(s);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: 'forged' };
  if (Date.now() > expires) return { ok: false, reason: 'expired' };
  return { ok: true, userId: u, path: p };
}

export interface FilePayload {
  data: Buffer;
  mime: string;
  filename: string;
}

async function put(userId: string, path: string, body: Buffer | string, mime: string): Promise<StoredDocument> {
  const data = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  if (data.length > MAX_BYTES) throw new Error(`Document too large (${data.length} bytes).`);
  const filename = path.split('/').pop() || 'document';
  // Regenerating overwrites in place, as the object store did.
  await query(
    `INSERT INTO app.documents (user_id, path, filename, mime, size_bytes, sha256, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, path) DO UPDATE SET
       filename = EXCLUDED.filename, mime = EXCLUDED.mime, size_bytes = EXCLUDED.size_bytes,
       sha256 = EXCLUDED.sha256, data = EXCLUDED.data, created_at = now()`,
    [userId, path, filename, mime, data.length, createHash('sha256').update(data).digest('hex'), data],
  );
  return { path, url: signLink(userId, path) };
}

export async function readDocument(userId: string, path: string): Promise<FilePayload | null> {
  const { rows } = await query<{ data: Buffer; mime: string; filename: string }>(
    'SELECT data, mime, filename FROM app.documents WHERE user_id = $1 AND path = $2',
    [userId, path],
  );
  return rows[0] ?? null;
}

export async function objectExists(userId: string, path: string): Promise<boolean> {
  const { rows } = await query('SELECT 1 FROM app.documents WHERE user_id = $1 AND path = $2', [userId, path]);
  return rows.length > 0;
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

/** Applications keep one prefix per application; other generations get their own namespace. */
function prefixFor(jobApplicationId?: string, documentId?: string): string {
  return jobApplicationId ? `ApplicationDocuments/${jobApplicationId}` : `UserDocuments/${documentId ?? Date.now()}`;
}

export async function uploadDocuments(input: UploadInput): Promise<DocumentBundle> {
  const prefix = prefixFor(input.jobApplicationId, input.documentId);
  const [resumePdf, resumeTex, coverLetterPdf, coverLetterTex] = await Promise.all([
    put(input.userId, `${prefix}_resume.pdf`, input.resumePdf, 'application/pdf'),
    put(input.userId, `${prefix}_resume.tex`, input.resumeTex, 'application/x-tex'),
    put(input.userId, `${prefix}_coverletter.pdf`, input.coverLetterPdf, 'application/pdf'),
    put(input.userId, `${prefix}_coverletter.tex`, input.coverLetterTex, 'application/x-tex'),
  ]);
  return { resumePdf, resumeTex, coverLetterPdf, coverLetterTex };
}
