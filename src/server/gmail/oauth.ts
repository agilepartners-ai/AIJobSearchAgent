/**
 * Google OAuth for the "Connect Gmail" step. Separate from Supabase sign-in on purpose: Supabase does not keep the
 * provider refresh token, and email/password users must be able to connect too (docs/GMAIL_JOB_SYNC_SCOPE.md, section 2).
 */
import { GmailConfigError } from './crypto';

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export class GoogleAuthError extends Error {
  constructor(message: string, readonly revoked = false) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export type GmailLlm = 'workers-ai' | 'gemini';

/** Gemini (the same AI Studio key as résumé generation) unless GMAIL_LLM=workers-ai asks for the Cloudflare model. */
export function gmailLlm(env: Record<string, string | undefined> = process.env): GmailLlm {
  return env.GMAIL_LLM === 'workers-ai' ? 'workers-ai' : 'gemini';
}

/**
 * Mail text goes to a model, so only providers that do not train on it or let humans read it are allowed:
 *  - gemini (default, the key already used for résumés): GEMINI_PAID_TIER=1 is the owner's statement that the key is on a billed
 *    project. Unpaid-tier calls are used to improve Google products and can be read by reviewers, which the privacy text
 *    promises we do not allow, so the sync refuses to start without that statement.
 *  - workers-ai: Cloudflare does not use customer content for training; 10,000 neurons a day are free.
 */
/** Is the model that reads mail text configured, and one that does not train on it? */
export function llmReady(env: Record<string, string | undefined> = process.env): boolean {
  return gmailLlm(env) === 'gemini' ? env.GEMINI_PAID_TIER === '1' && Boolean(env.GEMINI_API_KEY || env.GEMINI_API_KEYS) : Boolean(env.CF_AI_ACCOUNT_ID && env.CF_AI_TOKEN);
}

/**
 * The browser-facing half (connect, callback, status) runs on the Worker, which must never hold the model key.
 * It only needs the switch and the Google client. Reading mail (sync) needs `gmailEnabled`, and runs on the VM.
 */
export function gmailConnectEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.GMAIL_SYNC_ENABLED === '1' && Boolean(env.GMAIL_GOOGLE_CLIENT_ID && env.GMAIL_GOOGLE_CLIENT_SECRET && env.GMAIL_TOKEN_KEY && env.GMAIL_STATE_SECRET && env.GMAIL_REDIRECT_URI);
}

export function gmailEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return gmailConnectEnabled(env) && llmReady(env);
}

/** The address and instructions shown in the dashboard (Worker side): the switch and the domain, no model key. */
export function inboundUiEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.INBOUND_ENABLED === '1' && Boolean(env.INBOUND_DOMAIN);
}

/** Forwarded-mail channel: needs no Google permission at all, only a model, a domain and a shared secret with the Email Worker. */
export function inboundEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.INBOUND_ENABLED === '1' && llmReady(env) && Boolean(env.INBOUND_DOMAIN && env.INBOUND_SECRET && env.INBOUND_SECRET.length >= 16);
}

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new GmailConfigError(`${name} is not set`);
  return v;
}

export function buildAuthUrl(state: string, loginHint?: string): string {
  const q = new URLSearchParams({
    client_id: need('GMAIL_GOOGLE_CLIENT_ID'),
    redirect_uri: need('GMAIL_REDIRECT_URI'),
    response_type: 'code',
    scope: `openid email ${GMAIL_SCOPE}`,
    access_type: 'offline', // a refresh token
    prompt: 'consent', // Google only returns the refresh token on a fresh consent
    include_granted_scopes: 'true',
    state,
  });
  if (loginHint) q.set('login_hint', loginHint);
  return `${AUTH_URL}?${q.toString()}`;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: need('GMAIL_GOOGLE_CLIENT_ID'), client_secret: need('GMAIL_GOOGLE_CLIENT_SECRET'), ...params }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok) {
    // invalid_grant = the user revoked access, or a Testing-mode token passed its 7 days.
    throw new GoogleAuthError(body.error_description || body.error || `Google token request failed (${res.status})`, body.error === 'invalid_grant');
  }
  return body;
}

export interface ConnectResult {
  refreshToken: string;
  scope: string;
  googleEmail: string;
}

export async function exchangeCode(code: string): Promise<ConnectResult> {
  const t = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: need('GMAIL_REDIRECT_URI') });
  if (!t.refresh_token) throw new GoogleAuthError('Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and connect again.');
  const scope = t.scope ?? '';
  // The user can untick the Gmail box on the consent screen (granular consent). Without it there is nothing to read.
  if (!scope.split(' ').includes(GMAIL_SCOPE)) throw new GoogleAuthError('Gmail access was not granted. Tick the Gmail permission to connect.');
  return { refreshToken: t.refresh_token, scope, googleEmail: emailFromIdToken(t.id_token) };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const t = await tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' });
  if (!t.access_token) throw new GoogleAuthError('Google returned no access token');
  return t.access_token;
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }), signal: AbortSignal.timeout(15_000) }).catch(() => undefined);
}

/** The id token came straight from Google over TLS, so its payload is read without re-verifying the signature. */
export function emailFromIdToken(idToken?: string): string {
  if (!idToken) return '';
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string };
    return payload.email ?? '';
  } catch {
    return '';
  }
}
