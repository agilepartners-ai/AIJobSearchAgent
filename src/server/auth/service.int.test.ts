/**
 * Live test of the account service against a real PostgreSQL (opt-in):
 *   RUN_DB_TESTS=1 DATABASE_URL=postgres://… PGSSLMODE=disable pnpm exec vitest run src/server/auth
 * Every account it makes uses a random address and is deleted afterwards.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';
import { closePool, query } from '../db/pool';
import { __setTransport, type MailMessage } from './mailer';
import * as auth from './service';
import { AuthError } from './service';
import { __resetSigningKey } from './tokens';
import { __setKeys, verifyAccessToken } from './verify';

const live = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const mails: MailMessage[] = [];
const created: string[] = [];
let ipn = 0;
const info = () => ({ ip: `10.9.${Math.floor(++ipn / 250)}.${ipn % 250}`, userAgent: 'vitest' });
const email = () => {
  const e = `t${randomUUID().slice(0, 8)}@example.test`;
  created.push(e);
  return e;
};
const linkIn = (m: MailMessage) => (m.text.match(/token=([A-Za-z0-9_-]+)/) as RegExpMatchArray)[1] as string;
const lastMail = (to: string) => [...mails].reverse().find((m) => m.to === to);
const fail = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as AuthError | null;
const PW = 'correct horse battery';

describe.skipIf(!live)('account service (live database)', { timeout: 60_000 }, () => {
  beforeAll(async () => {
    const pair = await generateKeyPair('ES256', { extractable: true });
    process.env.AUTH_JWT_PRIVATE_KEY = (await exportPKCS8(pair.privateKey)).replace(/\n/g, '\\n');
    process.env.AUTH_JWT_PUBLIC_KEY = (await exportSPKI(pair.publicKey)).replace(/\n/g, '\\n');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
    __resetSigningKey();
    __setKeys(null);
    __setTransport(async (m) => void mails.push(m));
  });

  afterAll(async () => {
    __setTransport(null);
    for (const e of created) {
      await query('DELETE FROM app.auth_users WHERE email = $1::citext', [e]);
      await query('DELETE FROM app.auth_tokens WHERE email = $1::citext', [e]);
      await query('DELETE FROM app.profiles WHERE email = $1::citext', [e]);
      await query('DELETE FROM app.auth_events WHERE email = $1::citext', [e]);
    }
    await closePool();
  });

  async function register(e: string, pw = PW) {
    await auth.signUp({ email: e, password: pw, fullName: 'Test User' }, info());
    return auth.verifySignup(linkIn(lastMail(e) as MailMessage), info());
  }

  it('creates no account until the emailed link is used, then signs the person in', async () => {
    const e = email();
    expect(await auth.signUp({ email: e, password: PW, fullName: 'Asha' }, info())).toEqual({ status: 'check_email' });
    expect((await query('SELECT 1 FROM app.auth_users WHERE email = $1::citext', [e])).rowCount).toBe(0);
    const s = await auth.verifySignup(linkIn(lastMail(e) as MailMessage), info());
    expect(s.user).toMatchObject({ email: e, displayName: 'Asha', emailVerified: true });
    // The access token is genuine and carries the session.
    expect(await verifyAccessToken(s.accessToken)).toMatchObject({ userId: s.user.id, email: e, emailVerified: true });
    // The link works once.
    expect((await fail(auth.verifySignup(linkIn(lastMail(e) as MailMessage), info())))?.code).toBe('invalid_link');
    // The password is stored as a scrypt hash, never in the clear.
    const { rows } = await query<{ password_hash: string }>('SELECT password_hash FROM app.auth_users WHERE email = $1::citext', [e]);
    expect(rows[0]?.password_hash).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(rows[0]?.password_hash).not.toContain(PW);
  });

  it('refuses weak passwords, bad addresses and expired links', async () => {
    expect((await fail(auth.signUp({ email: email(), password: 'short' }, info())))?.code).toBe('weak_password');
    expect((await fail(auth.signUp({ email: email(), password: 'password123' }, info())))?.code).toBe('weak_password');
    expect((await fail(auth.signUp({ email: 'not-an-email', password: PW }, info())))?.code).toBe('invalid_email');
    const e = email();
    await auth.signUp({ email: e, password: PW }, info());
    await query("UPDATE app.auth_tokens SET expires_at = now() - interval '1 minute' WHERE email = $1::citext", [e]);
    expect((await fail(auth.verifySignup(linkIn(lastMail(e) as MailMessage), info())))?.code).toBe('invalid_link');
  });

  it('a second sign-up for the same address replaces the first link (nobody can register an address they do not own)', async () => {
    const e = email();
    await auth.signUp({ email: e, password: 'attacker password 1' }, info());
    const attackerLink = linkIn(lastMail(e) as MailMessage);
    await auth.signUp({ email: e, password: 'owner password 2' }, info());
    expect((await fail(auth.verifySignup(attackerLink, info())))?.code).toBe('invalid_link');
    const s = await auth.verifySignup(linkIn(lastMail(e) as MailMessage), info());
    expect((await fail(auth.signIn({ email: e, password: 'attacker password 1' }, info())))?.status).toBe(401);
    expect((await auth.signIn({ email: e, password: 'owner password 2' }, info())).user.id).toBe(s.user.id);
  });

  it('signing up with an address that already has an account tells nobody, and mails the owner instead', async () => {
    const e = email();
    await register(e);
    const before = mails.length;
    expect(await auth.signUp({ email: e, password: 'another password 3' }, info())).toEqual({ status: 'check_email' });
    expect(mails.length).toBe(before + 1);
    expect(lastMail(e)?.subject).toMatch(/already have/i);
    expect((await auth.signIn({ email: e, password: PW }, info())).user.email).toBe(e);
  });

  it('re-links an account that existed before: the new account takes the old profile id, so its data stays', async () => {
    const e = email();
    const oldId = randomUUID();
    await query('INSERT INTO app.profiles (user_id, email, full_name) VALUES ($1, $2, $3)', [oldId, e, 'Old Owner']);
    const s = await register(e);
    expect(s.user.id).toBe(oldId);
  });

  it('signs in with the right password; a wrong password and an unknown address get the same answer', async () => {
    const e = email();
    await register(e);
    const ok = await auth.signIn({ email: e.toUpperCase(), password: PW }, info());
    expect(ok.user.email).toBe(e);
    const wrong = await fail(auth.signIn({ email: e, password: 'not the password' }, info()));
    const unknown = await fail(auth.signIn({ email: email(), password: 'not the password' }, info()));
    expect([wrong?.status, wrong?.message]).toEqual([401, 'Incorrect email or password.']);
    expect([unknown?.status, unknown?.message]).toEqual([401, 'Incorrect email or password.']);
  });

  it('rate limits repeated wrong guesses at one address, then still accepts the right password after the window', async () => {
    const e = email();
    await register(e);
    const results: (number | undefined)[] = [];
    for (let i = 0; i < 12; i++) results.push((await fail(auth.signIn({ email: e, password: `wrong guess ${i}` }, info())))?.status);
    expect(results.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(results.slice(10)).toEqual([429, 429]);
    // Even the right password is refused while limited, then works once the window passes.
    expect((await fail(auth.signIn({ email: e, password: PW }, info())))?.status).toBe(429);
    await query("UPDATE app.auth_rate SET window_start = now() - interval '1 hour' WHERE key = $1", [`login:email:${e}`]);
    expect((await auth.signIn({ email: e, password: PW }, info())).user.email).toBe(e);
  });

  it('rotates the refresh token on every use, tolerates two tabs, and kills the session when an old token is replayed', async () => {
    const e = email();
    const s1 = await register(e);
    const s2 = await auth.refresh(s1.refreshToken, info());
    expect(s2.refreshToken).not.toBe(s1.refreshToken);
    expect(await verifyAccessToken(s2.accessToken)).toMatchObject({ email: e });
    // Replayed within seconds: two tabs raced. Asked to retry, session untouched.
    expect((await fail(auth.refresh(s1.refreshToken, info())))?.status).toBe(409);
    const s3 = await auth.refresh(s2.refreshToken, info());
    // Replayed later: treated as stolen. The whole session is revoked, including the newest token.
    await query("UPDATE app.auth_sessions SET rotated_at = now() - interval '1 minute' WHERE token_hash = $1", [(await import('./tokens')).hashToken(s3.refreshToken)]);
    expect((await fail(auth.refresh(s2.refreshToken, info())))?.code).toBe('reuse');
    expect((await fail(auth.refresh(s3.refreshToken, info())))?.status).toBe(401);
    const { rows } = await query("SELECT count(*)::int AS n FROM app.auth_events WHERE kind = 'refresh_reuse' AND at > now() - interval '1 minute'");
    expect(rows[0]?.n).toBeGreaterThanOrEqual(1);
  });

  it('sign out ends that session only', async () => {
    const e = email();
    const a = await register(e);
    const b = await auth.signIn({ email: e, password: PW }, info());
    await auth.signOut(a.refreshToken);
    expect((await fail(auth.refresh(a.refreshToken, info())))?.status).toBe(401);
    expect((await auth.refresh(b.refreshToken, info())).user.email).toBe(e);
  });

  it('password reset: a generic answer for strangers, a one-time link for owners, every other session signed out', async () => {
    const e = email();
    const first = await register(e);
    const stranger = email();
    const before = mails.length;
    expect(await auth.forgotPassword(stranger, info())).toEqual({ status: 'check_email' });
    expect(mails.length).toBe(before);

    await auth.forgotPassword(e, info());
    const token = linkIn(lastMail(e) as MailMessage);
    // A weak password does not use the link up.
    expect((await fail(auth.resetPassword({ token, password: 'password123' }, info())))?.code).toBe('weak_password');
    const s = await auth.resetPassword({ token, password: 'a brand new passphrase' }, info());
    expect(s.user.id).toBe(first.user.id);
    expect((await fail(auth.resetPassword({ token, password: 'another passphrase here' }, info())))?.code).toBe('invalid_link');
    expect((await fail(auth.signIn({ email: e, password: PW }, info())))?.status).toBe(401);
    expect((await auth.signIn({ email: e, password: 'a brand new passphrase' }, info())).user.id).toBe(first.user.id);
    expect((await fail(auth.refresh(first.refreshToken, info())))?.status).toBe(401);
    expect(lastMail(e)?.subject).toMatch(/password was changed/i);
  });

  it('"forgot password" lets the owner of a pre-existing profile claim it (the migration path from the previous sign-in provider)', async () => {
    const e = email();
    const oldId = randomUUID();
    await query('INSERT INTO app.profiles (user_id, email, full_name) VALUES ($1, $2, $3)', [oldId, e, 'Old Owner']);
    await auth.forgotPassword(e, info());
    const s = await auth.resetPassword({ token: linkIn(lastMail(e) as MailMessage), password: 'my new passphrase' }, info());
    expect(s.user.id).toBe(oldId);
    expect((await auth.signIn({ email: e, password: 'my new passphrase' }, info())).user.id).toBe(oldId);
  });

  it('the owner can mint a reset link without email (the command-line path)', async () => {
    const e = email();
    await register(e);
    const url = await auth.createResetLink(e);
    expect(url).toMatch(/^https:\/\/example\.test\/reset-password\?token=/);
    const s = await auth.resetPassword({ token: new URL(url).searchParams.get('token'), password: 'set from the link ok' }, info());
    expect(s.user.email).toBe(e);
    expect((await fail(auth.createResetLink(email())))?.status).toBe(404);
  });

  it('scripts/auth-admin.mjs reset-link works end to end for a profile from before accounts moved here', async () => {
    const e = email();
    const oldId = randomUUID();
    await query('INSERT INTO app.profiles (user_id, email, full_name) VALUES ($1, $2, $3)', [oldId, e, 'Old Owner']);
    const run = (addr: string) =>
      spawnSync(process.execPath, ['scripts/auth-admin.mjs', 'reset-link', addr], { encoding: 'utf8', env: { ...process.env, NEXT_PUBLIC_SITE_URL: 'https://example.test' } });
    const out = run(e);
    expect(out.status, out.stderr).toBe(0);
    const link = out.stdout.trim();
    expect(link).toMatch(/^https:\/\/example\.test\/reset-password\?token=/);
    expect(run(email()).status).not.toBe(0); // unknown address: no link
    const s = await auth.resetPassword({ token: new URL(link).searchParams.get('token'), password: 'owner chosen passphrase' }, info());
    expect(s.user.id).toBe(oldId); // the old résumés and applications stay attached
    expect(await fail(auth.resetPassword({ token: new URL(link).searchParams.get('token'), password: 'owner chosen again!!' }, info()))).not.toBeNull(); // single use
    const logged = await query<{ kind: string }>("SELECT kind FROM app.auth_events WHERE email = $1::citext AND kind = 'reset_link_issued_by_owner'", [e]);
    expect(logged.rows).toHaveLength(1);
  });

  it('scripts/auth-admin.mjs set-password gives the owner a working password and signs out other devices', async () => {
    const e = email();
    const oldId = randomUUID();
    await query('INSERT INTO app.profiles (user_id, email, full_name) VALUES ($1, $2, $3)', [oldId, e, 'Old Owner']);
    const run = () => spawnSync(process.execPath, ['scripts/auth-admin.mjs', 'set-password', e], { encoding: 'utf8', env: process.env });
    const first = run();
    expect(first.status, first.stderr).toBe(0);
    const pw = first.stdout.trim();
    expect(pw).toMatch(/^[A-Za-z0-9]{5}(-[A-Za-z0-9]{5}){3}$/);
    const s = await auth.signIn({ email: e, password: pw }, info());
    expect(s.user.id).toBe(oldId);
    expect(s.user.emailVerified).toBe(true);
    const second = run();
    expect(second.status, second.stderr).toBe(0);
    expect((await fail(auth.refresh(s.refreshToken, info())))?.status).toBe(401); // the earlier session is gone
    expect((await fail(auth.signIn({ email: e, password: pw }, info())))?.status).toBe(401); // the old password no longer works
    expect((await auth.signIn({ email: e, password: second.stdout.trim() }, info())).user.id).toBe(oldId);
  });

  describe('sign-up while no email can be sent (AUTH_SIGNUP_WITHOUT_EMAIL=1)', () => {
    beforeAll(() => {
      __setTransport(null);
      process.env.AUTH_SIGNUP_WITHOUT_EMAIL = '1';
    });
    afterAll(() => {
      delete process.env.AUTH_SIGNUP_WITHOUT_EMAIL;
      __setTransport(async (m) => void mails.push(m));
    });

    it('opens an unconfirmed account at once and signs the person in', async () => {
      expect(auth.authFeatures()).toMatchObject({ email: false, signup: true, verifiedSignup: false });
      const e = email();
      const r = await auth.signUp({ email: e, password: PW, fullName: 'Direct' }, info());
      expect('refreshToken' in r).toBe(true);
      const s = r as Awaited<ReturnType<typeof auth.signIn>>;
      expect(s.user).toMatchObject({ email: e, emailVerified: false });
      expect((await verifyAccessToken(s.accessToken)).emailVerified).toBe(false);
      expect((await auth.signIn({ email: e, password: PW }, info())).user.id).toBe(s.user.id);
    });

    it('says plainly that an address is taken, and never hands over an older profile without the emailed link', async () => {
      const e = email();
      await auth.signUp({ email: e, password: PW }, info());
      expect((await fail(auth.signUp({ email: e, password: PW }, info())))?.code).toBe('exists');
      const old = email();
      await query('INSERT INTO app.profiles (user_id, email, full_name) VALUES ($1, $2, $3)', [randomUUID(), old, 'Earlier']);
      expect((await fail(auth.signUp({ email: old, password: PW }, info())))?.code).toBe('needs_email');
      expect((await query('SELECT 1 FROM app.auth_users WHERE email = $1::citext', [old])).rows).toHaveLength(0);
    });

    it('is off unless the owner switches it on', async () => {
      delete process.env.AUTH_SIGNUP_WITHOUT_EMAIL;
      expect(auth.authFeatures().signup).toBe(false);
      expect((await fail(auth.signUp({ email: email(), password: PW }, info())))?.code).toBe('mail_not_configured');
      process.env.AUTH_SIGNUP_WITHOUT_EMAIL = '1';
    });
  });

  it('changing the password needs the current one and signs out every other device but this one', async () => {
    const e = email();
    const a = await register(e);
    const b = await auth.signIn({ email: e, password: PW }, info());
    const caller = { userId: a.user.id, sessionId: (await verifyAccessToken(a.accessToken)).sessionId };
    expect((await fail(auth.changePassword(caller, { currentPassword: 'nope nope nope', newPassword: 'fresh passphrase 99' }, info())))?.code).toBe('wrong_password');
    expect((await fail(auth.changePassword(caller, { currentPassword: PW, newPassword: PW }, info())))?.code).toBe('same_password');
    await auth.changePassword(caller, { currentPassword: PW, newPassword: 'fresh passphrase 99' }, info());
    expect((await fail(auth.refresh(b.refreshToken, info())))?.status).toBe(401);
    expect((await auth.refresh(a.refreshToken, info())).user.email).toBe(e);
  });

  it('updates the display name and phone', async () => {
    const s = await register(email());
    const u = await auth.updateProfile(s.user.id, { fullName: '  New Name ', phone: '+91 99999 00000' });
    expect(u).toMatchObject({ displayName: 'New Name', phoneNumber: '+91 99999 00000' });
    expect(await auth.me(s.user.id)).toMatchObject({ displayName: 'New Name' });
  });

  it('Google: refuses an unverified address, creates the account, then signs in again by Google id, and links an existing account', async () => {
    const e = email();
    const sub = `g-${randomUUID()}`;
    expect((await fail(auth.signInWithGoogleProfile({ sub, email: e, emailVerified: false }, info())))?.code).toBe('google_unverified');
    const a = await auth.signInWithGoogleProfile({ sub, email: e, emailVerified: true, name: 'G User' }, info());
    expect(a.user).toMatchObject({ email: e, emailVerified: true });
    const b = await auth.signInWithGoogleProfile({ sub, email: e, emailVerified: true }, info());
    expect(b.user.id).toBe(a.user.id);
    // A Google-only account has no password; it signs in with Google, and password sign-in says the same as for a stranger.
    expect((await fail(auth.signIn({ email: e, password: PW }, info())))?.message).toBe('Incorrect email or password.');

    const e2 = email();
    const withPassword = await register(e2);
    const g = await auth.signInWithGoogleProfile({ sub: `g-${randomUUID()}`, email: e2, emailVerified: true }, info());
    expect(g.user.id).toBe(withPassword.user.id);
  });

  it('says plainly that sign-up is closed when email is not set up, instead of pretending to send', async () => {
    __setTransport(null);
    const saved = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    try {
      expect((await fail(auth.signUp({ email: email(), password: PW }, info())))?.code).toBe('mail_not_configured');
      expect((await fail(auth.forgotPassword(email(), info())))?.status).toBe(503);
      expect(auth.authFeatures().email).toBe(false);
    } finally {
      if (saved) process.env.SMTP_HOST = saved;
      __setTransport(async (m) => void mails.push(m));
    }
  });
});
