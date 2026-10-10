import { describe, expect, it } from 'vitest';
import { buildQuery, htmlToText, parseMessage, type GmailMessage } from './messages';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

describe('buildQuery', () => {
  const now = Date.parse('2026-10-10T12:00:00Z');

  it('first sync looks back 30 days on the Updates tab, with an epoch-second bound', () => {
    const q = buildQuery(null, 30, now);
    expect(q).toContain('category:updates');
    expect(q).toContain('-from:me');
    const after = Number(q.match(/after:(\d+)/)?.[1]);
    expect(after).toBe(Math.floor((now - 30 * 86_400_000 - 2 * 3_600_000) / 1000));
  });

  it('later syncs start just before the last one, so nothing falls in a gap', () => {
    const last = now - 6 * 3_600_000;
    expect(Number(buildQuery(last, 30, now).match(/after:(\d+)/)?.[1])).toBe(Math.floor((last - 2 * 3_600_000) / 1000));
  });
});

describe('htmlToText', () => {
  it('keeps link targets next to their text, drops scripts and styles, decodes entities', () => {
    const text = htmlToText('<style>p{}</style><p>Hello&nbsp;Yatharth &amp; team</p><p><a href="https://jobs.example/apply/1">View job</a></p><script>x()</script>');
    expect(text).toContain('Hello Yatharth & team');
    expect(text).toContain('View job (https://jobs.example/apply/1)');
    expect(text).not.toContain('x()');
    expect(text).not.toContain('p{}');
  });
});

describe('parseMessage', () => {
  const message: GmailMessage = {
    id: 'm1',
    threadId: 't1',
    internalDate: String(Date.parse('2026-10-02T11:30:00Z')),
    snippet: 'snippet text',
    payload: {
      mimeType: 'multipart/alternative',
      headers: [
        { name: 'From', value: '"Priya Nair via Lever" <Priya@hire.lever.co>' },
        { name: 'Subject', value: 'Interview with BrightCart' },
        { name: 'Reply-To', value: 'priya.nair@brightcart.example' },
      ],
      parts: [
        { mimeType: 'text/plain', body: { data: b64('plain version') } },
        { mimeType: 'text/html', body: { data: b64('<p>Confirm: <a href="https://hire.lever.co/schedule/x">pick a slot</a> <a href="https://x.example/unsubscribe?u=1">unsubscribe</a></p>') } },
        { mimeType: 'application/pdf', filename: 'offer.pdf', body: { data: b64('%PDF') } },
      ],
    },
  };

  it('reads sender, subject, date and prefers the HTML body with its links', () => {
    const mail = parseMessage(message);
    expect(mail).toMatchObject({ id: 'm1', threadId: 't1', fromName: 'Priya Nair via Lever', fromAddress: 'priya@hire.lever.co', fromDomain: 'hire.lever.co', subject: 'Interview with BrightCart', replyTo: 'priya.nair@brightcart.example' });
    expect(mail.receivedAt.toISOString()).toBe('2026-10-02T11:30:00.000Z');
    expect(mail.text).toContain('pick a slot (https://hire.lever.co/schedule/x)');
  });

  it('drops unsubscribe and tracking links, and never reads attachments', () => {
    const mail = parseMessage(message);
    expect(mail.links).toEqual(['https://hire.lever.co/schedule/x']);
    expect(mail.text).not.toContain('%PDF');
  });

  it('falls back to plain text, then the snippet', () => {
    const plainOnly: GmailMessage = { ...message, payload: { ...message.payload!, parts: [{ mimeType: 'text/plain', body: { data: b64('just plain') } }] } };
    expect(parseMessage(plainOnly).text).toBe('just plain');
    const none: GmailMessage = { ...message, payload: { ...message.payload!, parts: [] } };
    expect(parseMessage(none).text).toBe('snippet text');
  });

  it('copes with a bare address and no display name', () => {
    const bare: GmailMessage = { ...message, payload: { ...message.payload!, headers: [{ name: 'From', value: 'jobs@acme.example' }, { name: 'Subject', value: 'Hi' }] } };
    const mail = parseMessage(bare);
    expect(mail.fromAddress).toBe('jobs@acme.example');
    expect(mail.fromDomain).toBe('acme.example');
  });
});
