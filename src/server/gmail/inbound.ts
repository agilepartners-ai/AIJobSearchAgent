/**
 * Forwarded-mail channel. A raw email arrives from the Cloudflare Email Worker; this turns it into a board update using the
 * same filter, extractor and merge rules as the Gmail API sync. Nothing here talks to Google.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import PostalMime from 'postal-mime';
import { defaultGenerate, extractFromMail, type ExtractResult } from './extract';
import { MAX_SUGGESTIONS_PER_DAY, readDigest, type DigestRead } from './digest';
import { findMatch, planMerge, REVIEW_THRESHOLD, type ExistingApp, type Patch } from './merge';
import { htmlToText, type ParsedMail } from './messages';
import { boardFor, prefilter } from './prefilter';
import * as repo from '../db/inboundRepo';

/** One email, or one "forward as attachment" bundle of many (Gmail lets a user select up to 100 and forward them together). */
export const MAX_RAW_BYTES = 8_000_000;
/** Emails read from one bundle. */
export const MAX_BUNDLE = 100;
/** Mail accepted per address per day, whatever it is: stops a leaked address being used to flood the board or the model. */
export const MAX_PER_DAY = 200;
/** Model calls per user per day, the same budget as the Gmail API sync. */
export const AI_PER_DAY = 150;

export { ADDRESS_LOCAL, addressFor, newToken, tokenFromAddress } from './tokens';

export function secretsMatch(given: string | undefined, expected: string | undefined): boolean {
  if (!given || !expected || expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export interface Confirmation {
  code: string | null;
  link: string | null;
}

/** Gmail's "Gmail Forwarding Confirmation" mail: sent by Google, carries a numeric code and a confirmation link. */
export function detectForwardingConfirmation(mail: Pick<ParsedMail, 'fromAddress' | 'subject' | 'text'> & { links?: string[] }): Confirmation | null {
  const fromGoogle = /(^|@)(forwarding-noreply|mail-noreply|noreply)@google\.com$/i.test(mail.fromAddress);
  if (!fromGoogle || !/forwarding confirmation|confirmation code|confirm.*forward/i.test(mail.subject + ' ' + mail.text.slice(0, 400))) return null;
  const code = mail.text.match(/\b(\d{6,12})\b/)?.[1] ?? null;
  // The confirmation link lives on a Google mail host and carries a "vf-" token. Match any such link rather than one exact host.
  const link = ((mail.links ?? []).concat(mail.text.match(/https:\/\/[^\s)<>"]+/g) ?? [])).find((u) => /^https:\/\/(mail-settings|mail)\.google\.com\/.*vf-/i.test(u)) ?? null;
  return code || link ? { code, link } : null;
}

type Email = Awaited<ReturnType<PostalMime['parse']>>;

export async function parseRaw(raw: Uint8Array, receivedAt = new Date()): Promise<ParsedMail> {
  return toParsedMail(await new PostalMime().parse(raw), raw, receivedAt);
}

/** The attached emails (message/rfc822) of a bundle, each as raw bytes. */
export function attachedMessages(e: Email): Uint8Array[] {
  return e.attachments
    .filter((a) => /^message\/rfc822$/i.test(a.mimeType) || /\.eml$/i.test(a.filename ?? ''))
    .map((a) => (typeof a.content === 'string' ? new TextEncoder().encode(a.content) : new Uint8Array(a.content)))
    .slice(0, MAX_BUNDLE);
}

function toParsedMail(e: Email, raw: Uint8Array, receivedAt: Date): ParsedMail {
  const fromAddress = (e.from?.address ?? '').toLowerCase();
  const text = e.html ? htmlToText(e.html) : (e.text ?? '').trim();
  const links = Array.from(new Set(text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [])).filter((u) => !/unsubscribe|optout|opt-out|pixel|open\.gif|track\./i.test(u)).slice(0, 12);
  // A forwarded message keeps the original Message-ID, which makes a stable key. Fall back to a hash of the content.
  const key = e.messageId?.trim() || createHash('sha256').update(raw).digest('hex');
  const thread = (e.inReplyTo || e.references?.split(/\s+/)[0] || e.messageId || key).trim();
  return {
    id: `fw:${createHash('sha256').update(key).digest('hex').slice(0, 32)}`,
    threadId: `fw:${createHash('sha256').update(thread).digest('hex').slice(0, 32)}`,
    receivedAt: e.date ? new Date(e.date) : receivedAt,
    fromName: e.from?.name ?? '',
    fromAddress,
    fromDomain: fromAddress.split('@')[1] ?? '',
    replyTo: e.replyTo?.[0]?.address ?? '',
    subject: (e.subject ?? '').trim(),
    text,
    links,
  };
}

export interface InboundDeps {
  repo: Pick<typeof repo, 'userForToken' | 'receivedToday' | 'aiCallsToday' | 'suggestionsToday' | 'knownJobUrls' | 'noteReceived' | 'saveConfirmation' | 'seen' | 'recordMessage' | 'appsForMerge' | 'insertApplication' | 'patchApplication'>;
  extract: (mail: ParsedMail) => Promise<ExtractResult>;
  /** Reads a recommended-jobs email into suggested jobs. */
  digest: (mail: ParsedMail) => Promise<DigestRead>;
  now: () => Date;
}

export const realInboundDeps: InboundDeps = { repo, extract: (m) => extractFromMail(m), digest: (m) => readDigest(m, defaultGenerate()), now: () => new Date() };

export type InboundResult =
  | { status: 'unknown_address' }
  | { status: 'too_large' }
  | { status: 'rate_limited' }
  | { status: 'confirmation' }
  | { status: 'duplicate' }
  | { status: 'skipped'; reason: string }
  | { status: 'not_job' }
  | { status: 'error'; reason: string }
  | { status: 'created' | 'updated'; applicationId: string; needsReview: boolean }
  | { status: 'suggested'; added: number; known: number; links: number }
  | { status: 'accepted'; total: number }
  | { status: 'bundle'; total: number; created: number; updated: number; skipped: number; notJob: number; duplicate: number; errors: number; rateLimited: number };

/** One parsed email to a board update. Used for a single forwarded mail and for each mail of a bundle. */
async function processMail(userId: string, mail: ParsedMail, deps: InboundDeps): Promise<InboundResult> {
  if (await deps.repo.seen(userId, mail.id)) return { status: 'duplicate' };

  const ledger = { messageId: mail.id, threadId: mail.threadId, receivedAt: mail.receivedAt, senderDomain: mail.fromDomain };
  // A forwarded email's sender is the original sender (the job board), so the same cheap filter applies.
  const verdict = prefilter({ fromDomain: mail.fromDomain, subject: mail.subject, snippet: mail.text.slice(0, 200) });
  if (verdict.digest) return processDigest(userId, mail, ledger, deps);
  if (!verdict.candidate) {
    await deps.repo.recordMessage(userId, { ...ledger, outcome: 'skipped' });
    return { status: 'skipped', reason: verdict.reason };
  }
  if ((await deps.repo.aiCallsToday(userId)) >= AI_PER_DAY) return { status: 'rate_limited' };

  const result = await deps.extract(mail);
  if (!result.extraction) {
    await deps.repo.recordMessage(userId, { ...ledger, outcome: 'error' });
    return { status: 'error', reason: result.error ?? 'extraction failed' };
  }
  const x = result.extraction;
  const apps: ExistingApp[] = await deps.repo.appsForMerge(userId);
  const plan = planMerge(apps, mail, x, boardFor(mail.fromDomain));
  if (plan.action === 'ignore') {
    await deps.repo.recordMessage(userId, { ...ledger, outcome: 'not_job', emailType: x.email_type, confidence: x.confidence });
    return { status: 'not_job' };
  }
  const lowConfidence = x.confidence < REVIEW_THRESHOLD;
  let applicationId: string;
  if (plan.action === 'create') applicationId = await deps.repo.insertApplication(userId, plan.fields as Patch, plan.needsReview);
  else {
    await deps.repo.patchApplication(userId, plan.id, plan.fields);
    applicationId = plan.id;
  }
  await deps.repo.recordMessage(userId, { ...ledger, outcome: lowConfidence ? 'low_confidence' : 'job', emailType: x.email_type, confidence: x.confidence, applicationId });
  return { status: plan.action === 'create' ? 'created' : 'updated', applicationId, needsReview: plan.needsReview };
}

/**
 * `background`: when given, a bundle is answered at once ("accepted") and read afterwards, because 100 emails take minutes and the
 * mail system waiting on us would time out and send them again. Without it the bundle is read first (used by tests).
 */
/**
 * A recommended-jobs email: every job link becomes a "Suggested" row (status "To apply"), unless that job, or the same
 * company and role, is already on the board. These are not applications, so they never change an existing row's status.
 */
async function processDigest(userId: string, mail: ParsedMail, ledger: { messageId: string; threadId: string; receivedAt: Date; senderDomain: string }, deps: InboundDeps): Promise<InboundResult> {
  if ((await deps.repo.suggestionsToday(userId)) >= MAX_SUGGESTIONS_PER_DAY) return { status: 'rate_limited' };
  if ((await deps.repo.aiCallsToday(userId)) >= AI_PER_DAY) return { status: 'rate_limited' };

  const read = await deps.digest(mail);
  const known = await deps.repo.knownJobUrls(userId, read.jobs.map((j) => j.url));
  const apps: ExistingApp[] = await deps.repo.appsForMerge(userId);
  let added = 0;
  let skippedKnown = 0;
  const day = mail.receivedAt.toISOString().slice(0, 10);
  for (const job of read.jobs) {
    if (known.has(job.url) || findMatch(apps, '', job.company, job.title).match) {
      skippedKnown += 1;
      continue;
    }
    const fields: Patch = {
      company_name: job.company,
      position: job.title,
      status: 'not_applied',
      application_date: day,
      location: job.location,
      job_posting_url: job.url,
      notes: `Suggested by ${job.board} in an email on ${day}. Open the link to read and apply.`,
      source: `suggestion:${job.board}`,
      priority: 1,
      confidence: read.usedFallback ? 0.5 : 0.85,
    };
    const id = await deps.repo.insertApplication(userId, fields, read.usedFallback);
    apps.unshift({ id, ...(fields as object), needs_review: read.usedFallback, status_history: [], gmail_thread_id: null } as unknown as ExistingApp);
    added += 1;
  }
  await deps.repo.recordMessage(userId, { ...ledger, outcome: 'job', emailType: 'job_alert' });
  return { status: 'suggested', added, known: skippedKnown, links: read.jobs.length };
}

export async function handleInbound(token: string, raw: Uint8Array, deps: InboundDeps = realInboundDeps, background?: (work: Promise<unknown>) => void): Promise<InboundResult> {
  if (raw.byteLength > MAX_RAW_BYTES) return { status: 'too_large' };
  const userId = await deps.repo.userForToken(token);
  if (!userId) return { status: 'unknown_address' };
  if ((await deps.repo.receivedToday(userId)) >= MAX_PER_DAY) return { status: 'rate_limited' };
  await deps.repo.noteReceived(userId);

  const parsed = await new PostalMime().parse(raw);
  const mail = toParsedMail(parsed, raw, deps.now());

  const confirmation = detectForwardingConfirmation(mail);
  if (confirmation) {
    await deps.repo.saveConfirmation(userId, confirmation);
    return { status: 'confirmation' };
  }

  // Gmail's "Forward as attachment" with many emails selected arrives as one mail carrying each as an .eml. Read them oldest
  // first, so a rejection never lands before the application it answers.
  const bundle = attachedMessages(parsed);
  if (bundle.length === 0) return processMail(userId, mail, deps);

  const mails = await Promise.all(bundle.map((b) => parseRaw(b, deps.now())));
  mails.sort((x, y) => x.receivedAt.getTime() - y.receivedAt.getTime());
  const run = () => processBundle(userId, mails, deps);
  if (background) {
    background(run().catch((e) => console.error('[inbound] bundle failed:', e instanceof Error ? e.message : e)));
    return { status: 'accepted', total: mails.length };
  }
  return run();
}

async function processBundle(userId: string, mails: ParsedMail[], deps: InboundDeps): Promise<InboundResult> {
  const out = { status: 'bundle' as const, total: mails.length, created: 0, updated: 0, skipped: 0, notJob: 0, duplicate: 0, errors: 0, rateLimited: 0 };
  for (const m of mails) {
    const r = await processMail(userId, m, deps);
    if (r.status === 'created') out.created += 1;
    else if (r.status === 'updated') out.updated += 1;
    else if (r.status === 'skipped') out.skipped += 1;
    else if (r.status === 'not_job') out.notJob += 1;
    else if (r.status === 'duplicate') out.duplicate += 1;
    else if (r.status === 'rate_limited') out.rateLimited += 1;
    else out.errors += 1;
  }
  return out;
}
