/**
 * One sync run for one user: Gmail Updates tab -> cheap filter -> Gemini -> merge into the Applications board.
 * All I/O comes in through `deps` so the whole flow is testable with fakes.
 */
import { decryptToken } from './crypto';
import { extractFromMail, type ExtractResult } from './extract';
import { getMessage, getMetadata, listMessages, buildQuery, parseMessage, GmailApiError, type MessageMeta, type MessageRef, type ParsedMail } from './messages';
import { planMerge, REVIEW_THRESHOLD, type ExistingApp, type Patch } from './merge';
import { GoogleAuthError, refreshAccessToken } from './oauth';
import { prefilter } from './prefilter';
import * as repo from '../db/gmailRepo';
import type { GmailConnection, LedgerRow, SyncSummary } from '../db/gmailRepo';

export const LIMITS = {
  /** Gmail ids examined per run. */
  list: 300,
  /** Messages whose headers are fetched per run. */
  messages: 120,
  /** Model calls per run. */
  ai: 60,
  /** Model calls per user per day: bounds cost whatever the user does. */
  aiPerDay: 150,
  /** First sync looks this far back. */
  backfillDays: 30,
  /** Minimum gap between manual syncs. */
  minGapMs: 5 * 60_000,
  concurrency: 4,
};

export class NotConnectedError extends Error {
  constructor() {
    super('Gmail is not connected.');
    this.name = 'NotConnectedError';
  }
}
export class ReconnectNeededError extends Error {
  constructor() {
    super('Google access expired or was removed. Connect Gmail again.');
    this.name = 'ReconnectNeededError';
  }
}
export class TooSoonError extends Error {
  constructor(readonly retryAfterSec: number) {
    super(`Synced a moment ago. Try again in ${Math.ceil(retryAfterSec / 60)} min.`);
    this.name = 'TooSoonError';
  }
}

export interface SyncDeps {
  repo: Pick<typeof repo, 'getConnection' | 'setConnectionStatus' | 'recordSync' | 'aiCallsToday' | 'seenMessageIds' | 'recordMessage' | 'appsForMerge' | 'insertApplication' | 'patchApplication'>;
  decrypt: (stored: string) => Promise<string>;
  accessToken: (refreshToken: string) => Promise<string>;
  list: (token: string, q: string, max: number) => Promise<MessageRef[]>;
  meta: (token: string, id: string) => Promise<MessageMeta>;
  full: (token: string, id: string) => Promise<ParsedMail>;
  extract: (mail: ParsedMail) => Promise<ExtractResult>;
  now: () => number;
}

export const realDeps: SyncDeps = {
  repo,
  decrypt: decryptToken,
  accessToken: refreshAccessToken,
  list: listMessages,
  meta: getMetadata,
  full: async (token, id) => parseMessage(await getMessage(token, id)),
  extract: (mail) => extractFromMail(mail),
  now: Date.now,
};

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** Keep the in-memory copy of the board current so a second email in the same run matches the row the first one made. */
function applyLocally(apps: ExistingApp[], id: string, fields: Patch, created: boolean): void {
  if (created) {
    apps.unshift({
      id, company_name: '', position: '', status: 'applied', gmail_thread_id: null, status_history: [], application_date: null, interview_date: null,
      response_date: null, follow_up_date: null, location: null, job_posting_url: null, salary_range: null, employment_type: null, contact_person: null,
      contact_email: null, notes: null, remote_option: null, needs_review: false, ...(fields as Partial<ExistingApp>),
    } as ExistingApp);
    return;
  }
  const app = apps.find((a) => a.id === id);
  if (app) Object.assign(app, fields);
}

export async function syncUser(userId: string, opts: { force?: boolean; deps?: SyncDeps } = {}): Promise<SyncSummary> {
  const deps = opts.deps ?? realDeps;
  const conn: GmailConnection | null = await deps.repo.getConnection(userId);
  if (!conn) throw new NotConnectedError();
  if (conn.status === 'revoked') throw new ReconnectNeededError();
  const last = conn.last_sync_at ? new Date(conn.last_sync_at).getTime() : null;
  if (!opts.force && last && deps.now() - last < LIMITS.minGapMs) throw new TooSoonError((LIMITS.minGapMs - (deps.now() - last)) / 1000);

  let token: string;
  try {
    token = await deps.accessToken(await deps.decrypt(conn.refresh_token_enc));
  } catch (e) {
    if (e instanceof GoogleAuthError && e.revoked) {
      await deps.repo.setConnectionStatus(userId, 'revoked', 'Google access expired or was removed');
      throw new ReconnectNeededError();
    }
    await deps.repo.setConnectionStatus(userId, 'error', e instanceof Error ? e.message.slice(0, 200) : 'token error');
    throw e;
  }

  const summary: SyncSummary = { listed: 0, newMessages: 0, skipped: 0, analysed: 0, created: 0, updated: 0, needsReview: 0, errors: 0, truncated: false, tokensIn: 0, tokensOut: 0 };
  try {
    const refs = await deps.list(token, buildQuery(last, LIMITS.backfillDays, deps.now()), LIMITS.list);
    summary.listed = refs.length;
    const seen = await deps.repo.seenMessageIds(userId, refs.map((r) => r.id));
    let fresh = refs.filter((r) => !seen.has(r.id));
    summary.newMessages = fresh.length;
    if (fresh.length > LIMITS.messages) {
      fresh = fresh.slice(0, LIMITS.messages);
      summary.truncated = true;
    }

    // 1. Headers only, then the cheap filter.
    const metas = await pool(fresh, LIMITS.concurrency, async (ref) => {
      try {
        return { ref, meta: await deps.meta(token, ref.id) };
      } catch (e) {
        if (e instanceof GmailApiError && (e.status === 401 || e.status === 403)) throw e;
        return { ref, meta: null as MessageMeta | null };
      }
    });
    const candidates: { meta: MessageMeta; board: string | null }[] = [];
    for (const { ref, meta } of metas) {
      if (!meta) {
        summary.errors += 1;
        continue;
      }
      const verdict = prefilter(meta);
      if (verdict.candidate) {
        candidates.push({ meta, board: verdict.board });
      } else {
        summary.skipped += 1;
        await deps.repo.recordMessage(userId, { messageId: meta.id, threadId: meta.threadId, receivedAt: meta.receivedAt, senderDomain: meta.fromDomain, outcome: 'skipped' });
      }
    }
    candidates.sort((a, b) => a.meta.receivedAt.getTime() - b.meta.receivedAt.getTime());
    const budget = Math.max(0, Math.min(LIMITS.ai, LIMITS.aiPerDay - (await deps.repo.aiCallsToday(userId))));
    if (candidates.length > budget) {
      candidates.length = budget;
      summary.truncated = true;
    }

    // 2. Read the survivors in full and ask the model, a few at a time.
    const read = await pool(candidates, LIMITS.concurrency, async (c) => {
      try {
        const mail = await deps.full(token, c.meta.id);
        return { c, mail, result: await deps.extract(mail) };
      } catch (e) {
        if (e instanceof GmailApiError && (e.status === 401 || e.status === 403)) throw e;
        return { c, mail: null as ParsedMail | null, result: { extraction: null, error: 'fetch failed' } as ExtractResult };
      }
    });
    summary.analysed = read.length;
    for (const { result } of read) {
      summary.tokensIn = (summary.tokensIn ?? 0) + (result.usage?.input ?? 0);
      summary.tokensOut = (summary.tokensOut ?? 0) + (result.usage?.output ?? 0);
    }

    // 3. Merge in the order the mail arrived, so a rejection never lands before the interview invite.
    const apps = await deps.repo.appsForMerge(userId);
    for (const { c, mail, result } of read) {
      const ledger: LedgerRow = { messageId: c.meta.id, threadId: c.meta.threadId, receivedAt: c.meta.receivedAt, senderDomain: c.meta.fromDomain, outcome: 'error' };
      if (!mail || !result.extraction) {
        summary.errors += 1;
        await deps.repo.recordMessage(userId, ledger);
        continue;
      }
      const x = result.extraction;
      ledger.emailType = x.email_type;
      ledger.confidence = x.confidence;
      const plan = planMerge(apps, mail, x, c.board);
      if (plan.action === 'ignore') {
        ledger.outcome = 'not_job';
        await deps.repo.recordMessage(userId, ledger);
        continue;
      }
      if (plan.action === 'create') {
        const id = await deps.repo.insertApplication(userId, plan.fields, plan.needsReview);
        applyLocally(apps, id, { ...plan.fields, needs_review: plan.needsReview }, true);
        ledger.applicationId = id;
        summary.created += 1;
      } else {
        await deps.repo.patchApplication(userId, plan.id, plan.fields);
        applyLocally(apps, plan.id, plan.fields, false);
        ledger.applicationId = plan.id;
        summary.updated += 1;
      }
      if (plan.needsReview) summary.needsReview += 1;
      ledger.outcome = x.confidence < REVIEW_THRESHOLD ? 'low_confidence' : 'job';
      await deps.repo.recordMessage(userId, ledger);
    }
  } catch (e) {
    if (e instanceof GmailApiError && (e.status === 401 || e.status === 403)) {
      await deps.repo.setConnectionStatus(userId, 'revoked', `Gmail API ${e.status}`);
      throw new ReconnectNeededError();
    }
    throw e;
  }
  await deps.repo.recordSync(userId, summary);
  return summary;
}
