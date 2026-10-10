/**
 * Encryption for the Gmail refresh token, and signing for the OAuth `state` value.
 *
 * Web Crypto only (no Node `crypto`), so the same code runs on Workers and on the VM.
 * The key lives in GMAIL_TOKEN_KEY (32 random bytes, base64). A database leak alone does not expose mailboxes.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

export class GmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailConfigError';
  }
}

export function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function aesKey(secret: string | undefined): Promise<CryptoKey> {
  if (!secret) throw new GmailConfigError('GMAIL_TOKEN_KEY is not set');
  const raw = fromBase64Url(secret.trim());
  if (raw.length !== 32) throw new GmailConfigError('GMAIL_TOKEN_KEY must be 32 bytes, base64 encoded');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(plain: string, secret = process.env.GMAIL_TOKEN_KEY): Promise<string> {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain)));
  return `v1.${toBase64Url(iv)}.${toBase64Url(ct)}`;
}

export async function decryptToken(stored: string, secret = process.env.GMAIL_TOKEN_KEY): Promise<string> {
  const [version, iv, ct] = stored.split('.');
  if (version !== 'v1' || !iv || !ct) throw new GmailConfigError('Unrecognised token format');
  const key = await aesKey(secret);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(iv) }, key, fromBase64Url(ct));
  return dec.decode(plain);
}

async function hmacKey(secret: string | undefined): Promise<CryptoKey> {
  if (!secret) throw new GmailConfigError('GMAIL_STATE_SECRET is not set');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export interface OAuthState {
  uid: string;
  nonce: string;
  exp: number;
}

/** A tamper-proof, short-lived value that carries the user id through Google's redirect. */
export async function signState(uid: string, now = Date.now(), ttlMs = 10 * 60_000, secret = process.env.GMAIL_STATE_SECRET): Promise<string> {
  const payload: OAuthState = { uid, nonce: toBase64Url(crypto.getRandomValues(new Uint8Array(12))), exp: now + ttlMs };
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

/** Returns the state, or null when it is forged, malformed or expired. */
export async function verifyState(token: string, now = Date.now(), secret = process.env.GMAIL_STATE_SECRET): Promise<OAuthState | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64Url(sig), enc.encode(body));
    if (!ok) return null;
    const state = JSON.parse(dec.decode(fromBase64Url(body))) as OAuthState;
    if (typeof state.uid !== 'string' || typeof state.exp !== 'number' || state.exp < now) return null;
    return state;
  } catch {
    return null;
  }
}
