/**
 * "Continue with Google": the OAuth authorization-code flow with PKCE, run on the VM. The state and PKCE verifier travel in a
 * signed, short-lived cookie, so nothing is stored server-side for a sign-in that may never finish.
 *
 *   AUTH_GOOGLE_CLIENT_ID / AUTH_GOOGLE_CLIENT_SECRET   a Google "Web application" client whose authorized redirect URI is
 *   <site>/api/auth/google/callback
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_COOKIE = 'ajsa_g';
const TTL_SECONDS = 600;

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://agilepartners-ai.com').replace(/\/+$/, '');
export const googleRedirectUri = () => `${site()}/api/auth/google/callback`;

export function googleConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET);
}

/** A signing secret derived from the server's private key, so no second secret has to be set and kept. */
function stateKey(): Buffer {
  const root = process.env.AUTH_STATE_SECRET || process.env.AUTH_JWT_PRIVATE_KEY;
  if (!root) throw new Error('AUTH_JWT_PRIVATE_KEY is not set');
  return createHash('sha256').update(`ajsa-google-state:${root}`).digest();
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const sign = (payload: string) => createHmac('sha256', stateKey()).update(payload).digest('base64url');

export function startGoogle(): { url: string; cookieValue: string; maxAge: number } {
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const payload = b64(JSON.stringify({ s: state, v: verifier, e: Math.floor(Date.now() / 1000) + TTL_SECONDS }));
  const q = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_CLIENT_ID as string,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return { url: `${AUTH_URL}?${q}`, cookieValue: `${payload}.${sign(payload)}`, maxAge: TTL_SECONDS };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

/** Check the cookie and state, trade the code for tokens, and read who signed in. */
export async function finishGoogle(f: { code: string; state: string; cookie: string | undefined }, fetchFn: typeof fetch = fetch): Promise<GoogleProfile> {
  const [payload, mac] = (f.cookie ?? '').split('.');
  if (!payload || !mac) throw new Error('missing sign-in cookie');
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new Error('bad cookie signature');
  const { s, v, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { s: string; v: string; e: number };
  if (e < Date.now() / 1000) throw new Error('sign-in took too long');
  const a = Buffer.from(s);
  const b = Buffer.from(f.state);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('state mismatch');

  const res = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: f.code,
      client_id: process.env.AUTH_GOOGLE_CLIENT_ID as string,
      client_secret: process.env.AUTH_GOOGLE_CLIENT_SECRET as string,
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
      code_verifier: v,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`token exchange failed (${res.status})`);
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error('no id_token');
  // The id_token came straight from Google over TLS in answer to our own request, so its claims are read here; they are still checked.
  const claims = JSON.parse(Buffer.from(tokens.id_token.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };
  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') throw new Error('wrong issuer');
  if (claims.aud !== process.env.AUTH_GOOGLE_CLIENT_ID) throw new Error('wrong audience');
  if (!claims.exp || claims.exp < Date.now() / 1000) throw new Error('expired id_token');
  if (!claims.sub || !claims.email) throw new Error('missing claims');
  return { sub: claims.sub, email: claims.email, emailVerified: claims.email_verified === true || claims.email_verified === 'true', name: claims.name };
}
