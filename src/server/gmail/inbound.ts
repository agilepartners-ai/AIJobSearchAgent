/**
 * Forwarded-mail channel. A raw email arrives from the Cloudflare Email Worker; this turns it into a board update using the
 * same filter, extractor and merge rules as the Gmail API sync. Nothing here talks to Google.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import PostalMime from 'postal-mime';
import { extractFromMail, type ExtractResult } from './extract';
import { planMerge, REVIEW_THRESHOLD, type ExistingApp, type Patch } from './merge';
import { htmlToText, type ParsedMail } from './messages';
import { boardFor, prefilter } from './prefilter';
import * as repo from '../db/inboundRepo';

export const MAX_RAW_BYTES = 1_500_000;
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

export async function parseRaw(raw: Uint8Array, receivedAt = new Date()): Promise<ParsedMail> {
  const e = await new PostalMime().parse(raw);
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
  repo: Pick<typeof repo, 'userForToken' | 'receivedToday' | 'aiCallsToday' | 'noteReceived' | 'saveConfirmation' | 'seen' | 'recordMessage' | 'appsForMerge' | 'insertApplication' | 'patchApplication'>;
  extract: (mail: ParsedMail) => Promise<ExtractResult>;
  now: () => Date;
}

export const realInboundDeps: InboundDeps = { repo, extract: (m) => extractFromMail(m), now: () => new Date() };

export type InboundResult =
  | { status: 'unknown_address' }
  | { status: 'too_large' }
  | { status: 'rate_limited' }
  | { status: 'confirmation' }
  | { status: 'duplicate' }
  | { status: 'skipped'; reason: string }
  | { status: 'not_job' }
  | { status: 'error'; reason: string }
  | { status: 'created' | 'updated'; applicationId: string; needsReview: boolean };

export async function handleInbound(token: string, raw: Uint8Array, deps: InboundDeps = realInboundDeps): Promise<InboundResult> {
  if (raw.byteLength > MAX_RAW_BYTES) return { status: 'too_large' };
  const userId = await deps.repo.userForToken(token);
  if (!userId) return { status: 'unknown_address' };
  if ((await deps.repo.receivedToday(userId)) >= MAX_PER_DAY) return { status: 'rate_limited' };
  await deps.repo.noteReceived(userId);

  const mail = await parseRaw(raw, deps.now());

  const confirmation = detectForwardingConfirmation(mail);
  if (confirmation) {
    await deps.repo.saveConfirmation(userId, confirmation);
    return { status: 'confirmation' };
  }
  if (await deps.repo.seen(userId, mail.id)) return { status: 'duplicate' };

  const ledger = { messageId: mail.id, threadId: mail.threadId, receivedAt: mail.receivedAt, senderDomain: mail.fromDomain };
  // A forwarded email's sender is the original sender (the job board), so the same cheap filter applies.
  const verdict = prefilter({ fromDomain: mail.fromDomain, subject: mail.subject, snippet: mail.text.slice(0, 200) });
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
