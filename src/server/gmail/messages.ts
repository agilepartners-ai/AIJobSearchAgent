/**
 * Gmail REST access and message parsing. Plain fetch, no googleapis package (keeps the bundle small).
 */
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'GmailApiError';
  }
}

/** Updates tab, recent, excluding chats and sent mail. `after:` takes epoch seconds, which avoids the PST midnight quirk. */
export function buildQuery(sinceMs: number | null, backfillDays = 30, now = Date.now()): string {
  const from = sinceMs ?? now - backfillDays * 86_400_000;
  // A small overlap catches mail that landed while the last sync was running; the ledger drops repeats.
  const after = Math.floor((from - 2 * 3_600_000) / 1000);
  return `category:updates -in:chats -from:me after:${after}`;
}

async function gmailFetch<T>(accessToken: string, path: string, attempt = 0): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(25_000) });
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 600 * 2 ** attempt + Math.random() * 300));
    return gmailFetch<T>(accessToken, path, attempt + 1);
  }
  if (!res.ok) throw new GmailApiError(`Gmail API ${res.status}`, res.status);
  return (await res.json()) as T;
}

export interface MessageRef {
  id: string;
  threadId: string;
}

export async function listMessages(accessToken: string, q: string, max: number): Promise<MessageRef[]> {
  const out: MessageRef[] = [];
  let pageToken = '';
  while (out.length < max) {
    const params = new URLSearchParams({ q, maxResults: String(Math.min(100, max - out.length)) });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await gmailFetch<{ messages?: MessageRef[]; nextPageToken?: string }>(accessToken, `/messages?${params}`);
    out.push(...(page.messages ?? []));
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }
  return out.slice(0, max);
}

interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}
export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailPart;
}

export interface MessageMeta {
  id: string;
  threadId: string;
  receivedAt: Date;
  from: string;
  fromDomain: string;
  subject: string;
  snippet: string;
}

/** Headers and snippet only: 5 quota units, no body. Used to decide whether a message is worth reading in full. */
export async function getMetadata(accessToken: string, id: string): Promise<MessageMeta> {
  const msg = await gmailFetch<GmailMessage>(accessToken, `/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`);
  const from = header(msg.payload, 'From');
  const addr = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
  return {
    id: msg.id,
    threadId: msg.threadId,
    receivedAt: new Date(Number(msg.internalDate) || Date.now()),
    from,
    fromDomain: addr.split('@')[1] ?? '',
    subject: header(msg.payload, 'Subject'),
    snippet: msg.snippet ?? '',
  };
}

export const getMessage = (accessToken: string, id: string) => gmailFetch<GmailMessage>(accessToken, `/messages/${encodeURIComponent(id)}?format=full`);

export interface ParsedMail {
  id: string;
  threadId: string;
  receivedAt: Date;
  fromName: string;
  fromAddress: string;
  fromDomain: string;
  replyTo: string;
  subject: string;
  /** Plain text, links kept inline as "text (url)". */
  text: string;
  /** Distinct http(s) links found in the body, tracking-free where we can tell. */
  links: string[];
}

function header(part: GmailPart | undefined, name: string): string {
  return part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function b64urlToText(data: string): string {
  const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return label ? `${label} (${href})` : ` ${href} `;
    })
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e] ?? m)
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function findPart(part: GmailPart | undefined, mime: string): string | null {
  if (!part) return null;
  if (part.mimeType === mime && part.body?.data && !part.filename) return b64urlToText(part.body.data);
  for (const child of part.parts ?? []) {
    const hit = findPart(child, mime);
    if (hit) return hit;
  }
  return null;
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

export function parseMessage(msg: GmailMessage): ParsedMail {
  const root = msg.payload;
  const from = header(root, 'From');
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const fromName = (m ? m[1] : '').trim();
  const fromAddress = (m ? m[2] : from).trim().toLowerCase();
  const html = findPart(root, 'text/html');
  const plain = findPart(root, 'text/plain');
  // Prefer HTML converted with link targets kept: confirmation emails put the job link behind a button.
  const text = html ? htmlToText(html) : plain ?? msg.snippet ?? '';
  const links = Array.from(new Set(text.match(URL_RE) ?? [])).filter((u) => !/unsubscribe|optout|opt-out|pixel|open\.gif|track\./i.test(u)).slice(0, 12);
  return {
    id: msg.id,
    threadId: msg.threadId,
    receivedAt: new Date(Number(msg.internalDate) || Date.now()),
    fromName,
    fromAddress,
    fromDomain: fromAddress.split('@')[1] ?? '',
    replyTo: header(root, 'Reply-To'),
    subject: header(root, 'Subject'),
    text,
    links,
  };
}
