import { describe, expect, it } from 'vitest';
import type { Extraction } from './extract';
import { FIXTURES, type Fixture } from './fixtures';
import { AI_PER_DAY, detectForwardingConfirmation, handleInbound, MAX_PER_DAY, MAX_RAW_BYTES, parseRaw, secretsMatch, type InboundDeps } from './inbound';
import type { ExistingApp } from './merge';
import { addressFor, newToken, tokenFromAddress } from './tokens';

const enc = (s: string) => new TextEncoder().encode(s);
const TOKEN = 'abcdefghijklmnopqrstuvwxyz'; // 26 chars, base32 alphabet

/** A raw RFC 822 message like the one a forwarding mailbox delivers. */
function raw(f: { from: string; name?: string; subject: string; text: string; id: string; date?: string; inReplyTo?: string; html?: boolean }): Uint8Array {
  const headers = [
    `From: ${f.name ? `"${f.name}" ` : ''}<${f.from}>`,
    `To: jobs+${TOKEN}@aitoolsfordoctor.com`,
    `Subject: ${f.subject}`,
    `Message-ID: <${f.id}@mail.example>`,
    `Date: ${f.date ?? 'Thu, 01 Oct 2026 09:00:00 +0000'}`,
    ...(f.inReplyTo ? [`In-Reply-To: <${f.inReplyTo}@mail.example>`] : []),
    'MIME-Version: 1.0',
    `Content-Type: text/${f.html ? 'html' : 'plain'}; charset=utf-8`,
  ];
  return enc(`${headers.join('\r\n')}\r\n\r\n${f.html ? `<html><body><p>${f.text.replace(/\n/g, '<br>')}</p></body></html>` : f.text}\r\n`);
}
const rawOf = (fx: Fixture, over: Partial<Parameters<typeof raw>[0]> = {}) => raw({ from: fx.mail.fromAddress, name: fx.mail.fromName, subject: fx.mail.subject, text: fx.mail.text, id: fx.mail.id, date: fx.mail.receivedAt.toUTCString(), ...over });

describe('forwarding address', () => {
  it('makes 26-character base32 tokens that never repeat', () => {
    const t = Array.from({ length: 200 }, newToken);
    expect(new Set(t).size).toBe(200);
    expect(t.every((x) => /^[a-z2-7]{26}$/.test(x))).toBe(true);
  });

  it('builds the address and reads the token back, with or without a display name and with any letter case', () => {
    const a = addressFor(TOKEN, 'aitoolsfordoctor.com');
    expect(a).toBe(`jobs+${TOKEN}@aitoolsfordoctor.com`);
    expect(tokenFromAddress(a)).toBe(TOKEN);
    expect(tokenFromAddress(`Job Board <${a.toUpperCase()}>`)).toBe(TOKEN);
  });

  it('rejects other local parts, short tokens and no token', () => {
    for (const bad of ['jobs@aitoolsfordoctor.com', 'info+abcdefghijklmnopqrstuvwxyz@x.com', 'jobs+short@x.com', 'jobs+ABC!defghijklmnopqrstuvwxyz@x.com', '', 'nonsense']) {
      expect(tokenFromAddress(bad), bad).toBeNull();
    }
  });

  it('compares the shared secret in constant time and refuses short or missing ones', () => {
    const s = 'a-long-shared-secret-0123456789';
    expect(secretsMatch(s, s)).toBe(true);
    expect(secretsMatch(s + 'x', s)).toBe(false);
    expect(secretsMatch('wrong-secret-of-same-length-!!!', s)).toBe(false);
    expect(secretsMatch(undefined, s)).toBe(false);
    expect(secretsMatch('short', 'short')).toBe(false); // an unset or weak secret never authenticates
  });
});

describe('Gmail forwarding confirmation', () => {
  const body = 'user@gmail.com has requested to automatically forward mail to your email address jobs+x@aitoolsfordoctor.com.\n\nConfirmation code: 482913607\n\nTo allow user@gmail.com to automatically forward mail to your address, please click the link below to confirm the request:\nhttps://mail-settings.google.com/mail/vf-%5BANGjdJ8abc%5D-xyz\n\nThanks, The Gmail Team';

  it('finds the code and the link', () => {
    expect(detectForwardingConfirmation({ fromAddress: 'forwarding-noreply@google.com', subject: 'Gmail Forwarding Confirmation - Receive Mail from user@gmail.com', text: body })).toEqual({ code: '482913607', link: 'https://mail-settings.google.com/mail/vf-%5BANGjdJ8abc%5D-xyz' });
  });

  it('finds the link on either Google mail host and ignores other links', () => {
    const t = (url: string) => detectForwardingConfirmation({ fromAddress: 'forwarding-noreply@google.com', subject: 'Gmail Forwarding Confirmation', text: `Confirmation code: 184973
Click: ${url}
Or https://support.google.com/mail/answer/10957` });
    expect(t('https://mail.google.com/mail/vf-%5BABC%5D-xyz')?.link).toBe('https://mail.google.com/mail/vf-%5BABC%5D-xyz');
    expect(t('https://mail-settings.google.com/mail/vf-%5BABC%5D-xyz')?.link).toBe('https://mail-settings.google.com/mail/vf-%5BABC%5D-xyz');
    expect(detectForwardingConfirmation({ fromAddress: 'forwarding-noreply@google.com', subject: 'Gmail Forwarding Confirmation', text: 'Confirmation code: 184973' })).toEqual({ code: '184973', link: null });
  });

  it('ignores the same words from anyone but Google, so a stranger cannot plant a fake code', () => {
    expect(detectForwardingConfirmation({ fromAddress: 'scammer@evil.example', subject: 'Gmail Forwarding Confirmation', text: body })).toBeNull();
    expect(detectForwardingConfirmation({ fromAddress: 'forwarding-noreply@google.com.evil.example', subject: 'Gmail Forwarding Confirmation', text: body })).toBeNull();
  });

  it('ignores ordinary mail from Google', () => {
    expect(detectForwardingConfirmation({ fromAddress: 'no-reply@accounts.google.com', subject: 'Security alert', text: 'New sign-in' })).toBeNull();
  });
});

describe('parseRaw', () => {
  it('reads sender, subject, date and text from a plain message', async () => {
    const m = await parseRaw(rawOf(FIXTURES[0]));
    expect(m).toMatchObject({ fromAddress: 'no-reply@us.greenhouse-mail.io', fromDomain: 'us.greenhouse-mail.io', subject: 'Thank you for applying to Northwind Labs' });
    expect(m.text).toContain('Data Analyst role at Northwind Labs');
    expect(m.receivedAt.toISOString()).toBe('2026-10-01T09:00:00.000Z');
    expect(m.links).toContain('https://boards.greenhouse.io/northwindlabs/jobs/4412345');
  });

  it('converts an HTML-only message to text and keeps link targets', async () => {
    const m = await parseRaw(raw({ from: 'jobs@lever.co', subject: 'Hi', id: 'h1', html: true, text: 'Open <a href="https://jobs.lever.co/acme/1">the posting</a>' }));
    expect(m.text).toContain('the posting (https://jobs.lever.co/acme/1)');
  });

  it('gives the same id to the same message and a different one to another', async () => {
    const a = await parseRaw(rawOf(FIXTURES[0]));
    const b = await parseRaw(rawOf(FIXTURES[0]));
    const c = await parseRaw(rawOf(FIXTURES[1]));
    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(c.id);
    expect(a.id.startsWith('fw:')).toBe(true);
  });

  it('puts a reply in the same thread as the message it answers', async () => {
    const first = await parseRaw(raw({ from: 'a@x.com', subject: 'Application', text: 't', id: 'root1' }));
    const reply = await parseRaw(raw({ from: 'a@x.com', subject: 'Re: Application', text: 't2', id: 'reply1', inReplyTo: 'root1' }));
    expect(reply.threadId).toBe(first.threadId);
    expect(reply.id).not.toBe(first.id);
  });
});

// ── the whole flow, against in-memory fakes ───────────────────────────────────
const ex = (over: Partial<Extraction>): Extraction => ({
  is_job_related: true, email_type: 'application_received', company: null, position: null, location: null, work_mode: null, employment_type: null, salary: null,
  application_date: null, event_date: null, deadline: null, job_url: null, portal_url: null, recruiter_name: null, recruiter_email: null, summary: 'ok', confidence: 0.95, ...over,
});

function world(opts: { received?: number; ai?: number; model?: Extraction | null; modelError?: string } = {}) {
  const apps: ExistingApp[] = [];
  const ledger = new Map<string, { outcome: string; channel?: string }>();
  const log = { confirmation: null as null | { code: string | null; link: string | null }, noted: 0, extractCalls: 0, rows: 0 };
  const deps: InboundDeps = {
    repo: {
      userForToken: async (t) => (t === TOKEN ? 'user-1' : null),
      receivedToday: async () => opts.received ?? 0,
      aiCallsToday: async () => opts.ai ?? 0,
      noteReceived: async () => { log.noted += 1; },
      saveConfirmation: async (_u, c) => { log.confirmation = c; },
      seen: async (_u, id) => ledger.has(id) && ledger.get(id)!.outcome !== 'error',
      recordMessage: async (_u, r) => { ledger.set(r.messageId, { outcome: r.outcome }); },
      appsForMerge: async () => structuredClone(apps),
      insertApplication: async (_u, fields, needsReview) => { log.rows += 1; const id = `app-${log.rows}`; apps.push({ id, ...(fields as object), needs_review: needsReview } as unknown as ExistingApp); return id; },
      patchApplication: async (_u, id, fields) => { Object.assign(apps.find((a) => a.id === id)!, fields); },
    },
    extract: async () => { log.extractCalls += 1; return opts.model ? { extraction: opts.model } : { extraction: null, error: opts.modelError ?? 'bad' }; },
    now: () => new Date('2026-10-10T00:00:00Z'),
  };
  return { deps, apps, ledger, log };
}

/** A bundle like Gmail's "Forward as attachment": one outer mail carrying each email as an .eml. */
function bundle(parts: Uint8Array[]): Uint8Array {
  const b = 'BOUNDARY-xyz';
  const CRLF = String.fromCharCode(13, 10);
  const head = [
    'From: <me@gmail.com>', `To: jobs+${TOKEN}@aitoolsfordoctor.com`, 'Subject: Fwd: attachments', `Message-ID: <bundle-${parts.length}@gmail.example>`,
    'Date: Sat, 10 Oct 2026 12:00:00 +0000', 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${b}"`, '', `--${b}`, 'Content-Type: text/plain', '', 'Forwarded messages attached.', '',
  ].join(CRLF);
  const body = parts
    .map((p, i) => [`--${b}`, `Content-Type: message/rfc822; name="m${i}.eml"`, `Content-Disposition: attachment; filename="m${i}.eml"`, '', new TextDecoder().decode(p), ''].join(CRLF))
    .join('');
  return enc(`${head}${CRLF}${body}--${b}--${CRLF}`);
}

describe('bulk forwarding (a bundle of emails in one message)', () => {
  const app1 = () => raw({ from: 'no-reply@us.greenhouse-mail.io', subject: 'Thank you for applying to Acme', text: 'You applied for the Analyst role at Acme.', id: 'b-app', date: 'Mon, 05 Oct 2026 09:00:00 +0000' });
  const rej = () => raw({ from: 'no-reply@us.greenhouse-mail.io', subject: 'Update on your application to Acme', text: 'Unfortunately we are moving forward with others.', id: 'b-rej', inReplyTo: 'b-app', date: 'Fri, 09 Oct 2026 09:00:00 +0000' });
  const receipt = () => raw({ from: 'billing@shop.example', subject: 'Your receipt for October', text: 'Invoice 1', id: 'b-rec' });

  it('reads every attached email, oldest first, as separate mails', async () => {
    const w = world();
    let n = 0;
    w.deps.extract = async (m) => {
      n += 1;
      return { extraction: ex(m.id === (await parseRaw(app1())).id ? { email_type: 'application_received', company: 'Acme', position: 'Analyst' } : { email_type: 'rejection', company: 'Acme', position: 'Analyst' }) };
    };
    // the rejection is listed first on purpose: order in the bundle must not matter
    const r = await handleInbound(TOKEN, bundle([rej(), app1(), receipt()]), w.deps);
    expect(r).toMatchObject({ status: 'bundle', total: 3, created: 1, updated: 1, skipped: 1 });
    expect(w.apps).toHaveLength(1);
    expect(w.apps[0]).toMatchObject({ company_name: 'Acme', status: 'rejected' });
    expect(w.apps[0].status_history.map((h) => h.status)).toEqual(['applied', 'rejected']);
    expect(n).toBe(2); // the receipt never reached the model
  });

  it('is safe to send twice: the second bundle changes nothing', async () => {
    const w = world({ model: ex({ company: 'Acme', position: 'Analyst' }) });
    await handleInbound(TOKEN, bundle([app1(), rej()]), w.deps);
    const again = await handleInbound(TOKEN, bundle([app1(), rej()]), w.deps);
    expect(again).toMatchObject({ status: 'bundle', duplicate: 2, created: 0, updated: 0 });
    expect(w.apps).toHaveLength(1);
  });

  it('with a background hook it answers at once and finishes the reading afterwards', async () => {
    const w = world({ model: ex({ company: 'Acme', position: 'Analyst' }) });
    const jobs: Promise<unknown>[] = [];
    const r = await handleInbound(TOKEN, bundle([app1(), rej()]), w.deps, (p) => jobs.push(p));
    expect(r).toEqual({ status: 'accepted', total: 2 });
    expect(w.apps).toHaveLength(0); // not finished yet when the answer is given
    await Promise.all(jobs);
    expect(w.apps).toHaveLength(1);
  });

  it('stops using the model at the daily budget but keeps filtering, and leaves the rest to be sent again', async () => {
    const w = world({ model: ex({ company: 'Acme', position: 'Analyst' }), ai: AI_PER_DAY });
    const r = await handleInbound(TOKEN, bundle([app1(), receipt()]), w.deps);
    expect(r).toMatchObject({ status: 'bundle', rateLimited: 1, skipped: 1, created: 0 });
    expect(w.log.extractCalls).toBe(0);
  });
});

describe('handleInbound', () => {
  const greenhouse = () => rawOf(FIXTURES[0]);
  const model = ex({ company: 'Northwind Labs', position: 'Data Analyst' });

  it('turns a forwarded confirmation email into a new application', async () => {
    const w = world({ model });
    const r = await handleInbound(TOKEN, greenhouse(), w.deps);
    expect(r).toMatchObject({ status: 'created', needsReview: false });
    expect(w.apps[0]).toMatchObject({ company_name: 'Northwind Labs', position: 'Data Analyst', status: 'applied', source: 'gmail:greenhouse' });
    expect(w.log.noted).toBe(1);
  });

  it('a later email in the same thread updates the row instead of adding one', async () => {
    const w = world({ model });
    await handleInbound(TOKEN, greenhouse(), w.deps);
    w.deps.extract = async () => ({ extraction: ex({ email_type: 'interview_invite', company: 'Northwind Labs', position: 'Data Analyst', event_date: '2026-10-15' }) });
    const reply = raw({ from: 'no-reply@us.greenhouse-mail.io', subject: 'Interview with Northwind Labs', text: 'We would like to interview you next week.', id: 'reply-9', inReplyTo: FIXTURES[0].mail.id, date: 'Fri, 09 Oct 2026 10:00:00 +0000' });
    const r = await handleInbound(TOKEN, reply, w.deps);
    expect(r.status).toBe('updated');
    expect(w.apps).toHaveLength(1);
    expect(w.apps[0]).toMatchObject({ status: 'interviewing', interview_date: '2026-10-15' });
  });

  it('is idempotent: the same email twice changes nothing and costs no second model call', async () => {
    const w = world({ model });
    await handleInbound(TOKEN, greenhouse(), w.deps);
    const again = await handleInbound(TOKEN, greenhouse(), w.deps);
    expect(again.status).toBe('duplicate');
    expect(w.log.extractCalls).toBe(1);
    expect(w.apps).toHaveLength(1);
  });

  it('catches the Gmail forwarding confirmation, stores the code, and never sends it to the model', async () => {
    const w = world({ model });
    const r = await handleInbound(TOKEN, raw({ from: 'forwarding-noreply@google.com', subject: 'Gmail Forwarding Confirmation - Receive Mail from user@gmail.com', id: 'conf1', text: 'Confirmation code: 482913607\nhttps://mail-settings.google.com/mail/vf-%5Babc%5D-xyz' }), w.deps);
    expect(r.status).toBe('confirmation');
    expect(w.log.confirmation).toEqual({ code: '482913607', link: 'https://mail-settings.google.com/mail/vf-%5Babc%5D-xyz' });
    expect(w.log.extractCalls).toBe(0);
    expect(w.apps).toHaveLength(0);
  });

  it('answers an unknown address, an oversize message and a flooded address without any work', async () => {
    const w = world({ model });
    expect((await handleInbound('x'.repeat(26), greenhouse(), w.deps)).status).toBe('unknown_address');
    expect((await handleInbound(TOKEN, new Uint8Array(MAX_RAW_BYTES + 1), w.deps)).status).toBe('too_large');
    const flooded = world({ model, received: MAX_PER_DAY });
    expect((await handleInbound(TOKEN, greenhouse(), flooded.deps)).status).toBe('rate_limited');
    expect(w.log.extractCalls + flooded.log.extractCalls).toBe(0);
  });

  it('filters receipts and alert digests before the model, and records them so they are not re-read', async () => {
    const w = world({ model });
    const alert = FIXTURES.find((f) => f.name.startsWith('Job alert'))!;
    const receipt = FIXTURES.find((f) => f.name.startsWith('Receipt'))!;
    expect((await handleInbound(TOKEN, rawOf(alert), w.deps)).status).toBe('skipped');
    expect((await handleInbound(TOKEN, rawOf(receipt), w.deps)).status).toBe('skipped');
    expect(w.log.extractCalls).toBe(0);
    expect(Array.from(w.ledger.values()).every((l) => l.outcome === 'skipped')).toBe(true);
  });

  it('stops calling the model once the per-user daily budget is spent', async () => {
    const w = world({ model, ai: AI_PER_DAY });
    expect((await handleInbound(TOKEN, greenhouse(), w.deps)).status).toBe('rate_limited');
    expect(w.log.extractCalls).toBe(0);
  });

  it('reports a model failure, and retries that message next time', async () => {
    const w = world({ model: null, modelError: 'quota' });
    expect(await handleInbound(TOKEN, greenhouse(), w.deps)).toEqual({ status: 'error', reason: 'quota' });
    expect(w.ledger.size).toBe(1);
    w.deps.extract = async () => ({ extraction: model });
    expect((await handleInbound(TOKEN, greenhouse(), w.deps)).status).toBe('created'); // error rows do not count as seen
  });

  it('does not create a row when the model says it is not a job email', async () => {
    const w = world({ model: ex({ is_job_related: false, email_type: 'other' }) });
    expect((await handleInbound(TOKEN, greenhouse(), w.deps)).status).toBe('not_job');
    expect(w.apps).toHaveLength(0);
  });

  it('flags a low-confidence read for review but still saves it', async () => {
    const w = world({ model: ex({ company: 'Northwind Labs', position: 'Data Analyst', confidence: 0.5 }) });
    const r = await handleInbound(TOKEN, greenhouse(), w.deps);
    expect(r).toMatchObject({ status: 'created', needsReview: true });
    expect(w.apps[0].needs_review).toBe(true);
  });
});
