import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAuthUrl, emailFromIdToken, exchangeCode, GMAIL_SCOPE, gmailEnabled, GoogleAuthError, refreshAccessToken } from './oauth';

const ENV = {
  GMAIL_SYNC_ENABLED: '1', GEMINI_PAID_TIER: '1', GOOGLE_OAUTH_CLIENT_ID: 'cid', GOOGLE_OAUTH_CLIENT_SECRET: 'csecret',
  GMAIL_TOKEN_KEY: 'k', GMAIL_STATE_SECRET: 's', GMAIL_REDIRECT_URI: 'https://agilepartners-ai.com/api/gmail/callback',
};

describe('gmailEnabled', () => {
  it('needs the switch, a paid Gemini key, and every secret', () => {
    expect(gmailEnabled(ENV)).toBe(true);
    for (const key of Object.keys(ENV)) expect(gmailEnabled({ ...ENV, [key]: undefined }), key).toBe(false);
  });

  it('refuses to run on the free Gemini tier, which trains on prompts and lets humans read them', () => {
    expect(gmailEnabled({ ...ENV, GEMINI_PAID_TIER: '0' })).toBe(false);
    expect(gmailEnabled({ ...ENV, GEMINI_PAID_TIER: undefined })).toBe(false);
  });
});

describe('Google OAuth calls', () => {
  beforeEach(() => { for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('asks for read-only Gmail, offline, with a fresh consent, and carries the state', () => {
    const url = new URL(buildAuthUrl('STATE', 'me@gmail.com'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const p = url.searchParams;
    expect(p.get('scope')).toBe(`openid email ${GMAIL_SCOPE}`);
    expect(GMAIL_SCOPE).toBe('https://www.googleapis.com/auth/gmail.readonly'); // never modify, send or full access
    expect(p.get('access_type')).toBe('offline');
    expect(p.get('prompt')).toBe('consent');
    expect(p.get('state')).toBe('STATE');
    expect(p.get('login_hint')).toBe('me@gmail.com');
    expect(p.get('redirect_uri')).toBe(ENV.GMAIL_REDIRECT_URI);
    expect(url.toString()).not.toContain('csecret');
  });

  const fakeToken = (body: object, ok = true) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status: ok ? 200 : 400, json: async () => body })));
  const idToken = `x.${Buffer.from(JSON.stringify({ email: 'me@gmail.com' })).toString('base64url')}.y`;

  it('exchanges a code for a refresh token and reads the Google address', async () => {
    fakeToken({ access_token: 'a', refresh_token: 'r', scope: `openid email ${GMAIL_SCOPE}`, id_token: idToken });
    expect(await exchangeCode('code')).toEqual({ refreshToken: 'r', scope: `openid email ${GMAIL_SCOPE}`, googleEmail: 'me@gmail.com' });
  });

  it('explains when the user unticked the Gmail permission (granular consent)', async () => {
    fakeToken({ access_token: 'a', refresh_token: 'r', scope: 'openid email', id_token: idToken });
    await expect(exchangeCode('code')).rejects.toThrow(/Tick the Gmail permission/);
  });

  it('explains when Google returned no refresh token', async () => {
    fakeToken({ access_token: 'a', scope: GMAIL_SCOPE });
    await expect(exchangeCode('code')).rejects.toThrow(/refresh token/);
  });

  it('flags invalid_grant as a revoked or expired grant', async () => {
    fakeToken({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, false);
    const err = await refreshAccessToken('r').catch((e) => e);
    expect(err).toBeInstanceOf(GoogleAuthError);
    expect(err.revoked).toBe(true);
  });

  it('does not call another error a revoked grant', async () => {
    fakeToken({ error: 'server_error' }, false);
    expect((await refreshAccessToken('r').catch((e) => e)).revoked).toBe(false);
  });

  it('reads the address from an id token, and tolerates junk', () => {
    expect(emailFromIdToken(idToken)).toBe('me@gmail.com');
    expect(emailFromIdToken('junk')).toBe('');
    expect(emailFromIdToken(undefined)).toBe('');
  });
});
