/**
 * Accounts and sessions, in the VM's PostgreSQL. Every function here runs on the VM (the Worker forwards auth requests to it).
 *
 * Rules this file enforces:
 *  - No account exists until its email link is used (sign-up only stores a pending registration), so nobody can register an
 *    address they do not own, and a person who owns it always wins.
 *  - Passwords are scrypt hashes; a wrong password and an unknown address look and take the same.
 *  - A refresh token works once. Replaying an old one revokes that whole session (a stolen token is noticed).
 *  - Sign-in, sign-up and reset attempts are rate limited per address and per IP.
 *  - Changing or resetting a password signs out every other device.
 *  - Accounts from before this table (the previous sign-in provider) are re-linked by email: the new account takes the id found in app.profiles,
 *    so résumés and applications stay with their owner. Possession of the mailbox is the proof.
 */
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { query, withTransaction } from '../db/pool';
import { alreadyRegisteredEmail, confirmEmail, mailConfigured, passwordChangedEmail, resetEmail, sendMail } from './mailer';
import { hashPassword, needsRehash, passwordProblem, verifyAgainstDummy, verifyPassword } from './password';
import { ACCESS_TTL_SECONDS, hashToken, newToken, signAccessToken } from './tokens';

export class AuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'auth_error',
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface ClientInfo {
  ip: string;
  userAgent: string;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
}

export interface SessionResult {
  accessToken: string;
  /** Unix seconds. */
  expiresAt: number;
  user: PublicUser;
  /** For the HttpOnly cookie; never put in a response body. */
  refreshToken: string;
  refreshMaxAgeSeconds: number;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  email_verified_at: Date | null;
  full_name: string;
  phone: string;
  disabled_at: Date | null;
}

const USER_COLS = 'id, email, password_hash, email_verified_at, full_name, phone, disabled_at';
const REFRESH_DAYS = 30;
const SESSION_MAX_DAYS = 90;
const SIGNUP_TTL_HOURS = 24;
const RESET_TTL_MINUTES = 60;

type Run = <T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>;
const direct: Run = (sql, params) => query(sql, params ?? []);
const within =
  (c: Pick<PoolClient, 'query'>): Run =>
  (sql, params) =>
    c.query(sql, params ?? []) as never;

/* ------------------------------------------------------------------ helpers */

export function normalizeEmail(raw: unknown): string {
  const e = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (e.length < 5 || e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new AuthError(400, 'Enter a valid email address.', 'invalid_email');
  return e;
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://agilepartners-ai.com').replace(/\/+$/, '');

function toPublic(u: UserRow): PublicUser {
  return { id: u.id, email: u.email, displayName: u.full_name || null, phoneNumber: u.phone || null, emailVerified: !!u.email_verified_at };
}

async function audit(kind: string, f: { userId?: string | null; email?: string | null; info?: ClientInfo; detail?: string }): Promise<void> {
  try {
    await query('INSERT INTO app.auth_events (user_id, email, kind, ip, detail) VALUES ($1, $2, $3, $4, $5)', [f.userId ?? null, f.email ?? null, kind, f.info?.ip ?? null, f.detail?.slice(0, 300) ?? null]);
  } catch (e) {
    console.error('[auth] audit failed:', e instanceof Error ? e.message : e);
  }
}

/** Counts one attempt; true while still within the limit. */
async function hit(key: string, limit: number, windowSeconds: number, run: Run = direct): Promise<boolean> {
  const { rows } = await run<{ hits: number }>(
    `INSERT INTO app.auth_rate (key, window_start, hits) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       hits = CASE WHEN app.auth_rate.window_start < now() - make_interval(secs => $2::double precision) THEN 1 ELSE app.auth_rate.hits + 1 END,
       window_start = CASE WHEN app.auth_rate.window_start < now() - make_interval(secs => $2::double precision) THEN now() ELSE app.auth_rate.window_start END
     RETURNING hits`,
    [key, windowSeconds],
  );
  return (rows[0]?.hits ?? 1) <= limit;
}

async function guard(rules: [key: string, limit: number, windowSeconds: number][]): Promise<void> {
  let ok = true;
  for (const [key, limit, win] of rules) if (!(await hit(key, limit, win))) ok = false;
  if (!ok) throw new AuthError(429, 'Too many attempts. Please wait a few minutes and try again.', 'rate_limited');
}

/** Housekeeping, now and then, so the small tables stay small. */
async function maybeCleanup(): Promise<void> {
  if (Math.random() > 0.02) return;
  try {
    await query("DELETE FROM app.auth_tokens WHERE expires_at < now() - interval '7 days'");
    await query("DELETE FROM app.auth_rate WHERE window_start < now() - interval '2 days'");
    await query("DELETE FROM app.auth_sessions WHERE expires_at < now() - interval '30 days' OR revoked_at < now() - interval '30 days'");
    await query("DELETE FROM app.auth_events WHERE at < now() - interval '365 days'");
  } catch (e) {
    console.error('[auth] cleanup failed:', e instanceof Error ? e.message : e);
  }
}

/** The id an existing profile (made while accounts lived with the previous sign-in provider) already has for this address, if no account owns it yet. */
async function claimableProfileId(email: string, run: Run): Promise<string | null> {
  const { rows } = await run<{ user_id: string }>(
    `SELECT p.user_id FROM app.profiles p
      WHERE p.email = $1::citext AND NOT EXISTS (SELECT 1 FROM app.auth_users u WHERE u.id = p.user_id)
      ORDER BY p.created_at LIMIT 1`,
    [email],
  );
  return rows[0]?.user_id ?? null;
}

async function userByEmail(email: string, run: Run = direct): Promise<UserRow | null> {
  const { rows } = await run<UserRow>(`SELECT ${USER_COLS} FROM app.auth_users WHERE email = $1::citext`, [email]);
  return rows[0] ?? null;
}

async function userById(id: string, run: Run = direct): Promise<UserRow | null> {
  const { rows } = await run<UserRow>(`SELECT ${USER_COLS} FROM app.auth_users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function createUser(
  run: Run,
  f: { email: string; passwordHash: string | null; fullName?: string; phone?: string },
): Promise<UserRow> {
  const claimed = await claimableProfileId(f.email, run);
  const { rows } = await run<UserRow>(
    `INSERT INTO app.auth_users (id, email, password_hash, email_verified_at, full_name, phone, password_changed_at)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2::citext, $3, now(), $4, $5, CASE WHEN $3::text IS NULL THEN NULL ELSE now() END)
     RETURNING ${USER_COLS}`,
    [claimed, f.email, f.passwordHash, (f.fullName ?? '').slice(0, 200), (f.phone ?? '').slice(0, 40)],
  );
  return rows[0] as UserRow;
}

/** Start a sign-in session and mint its tokens. */
async function startSession(user: UserRow, info: ClientInfo, run: Run = direct): Promise<SessionResult> {
  const refreshToken = newToken();
  const { rows } = await run<{ id: string }>(
    `INSERT INTO app.auth_sessions (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, now() + make_interval(days => $3), $4, $5) RETURNING id`,
    [user.id, hashToken(refreshToken), REFRESH_DAYS, info.userAgent.slice(0, 300), info.ip.slice(0, 64)],
  );
  const { token, expiresAt } = await signAccessToken({ id: user.id, email: user.email, emailVerified: !!user.email_verified_at }, (rows[0] as { id: string }).id);
  await run('UPDATE app.auth_users SET last_login_at = now() WHERE id = $1', [user.id]);
  return { accessToken: token, expiresAt, user: toPublic(user), refreshToken, refreshMaxAgeSeconds: REFRESH_DAYS * 86_400 };
}

/** What the sign-in and sign-up screens need to know before showing their buttons. */
/**
 * Sign-up without a confirmation email: only while the site cannot send mail AND the owner switched it on (AUTH_SIGNUP_WITHOUT_EMAIL=1).
 * The account starts unverified, never takes over an older profile, and is not an admin. As soon as SMTP is set, sign-up goes back to
 * the emailed link, and the real owner of an address can always take an unverified account over with "forgot password".
 */
export function signupWithoutEmail(): boolean {
  return !mailConfigured() && process.env.AUTH_SIGNUP_WITHOUT_EMAIL === '1';
}

export function authFeatures(): { email: boolean; google: boolean; signup: boolean; verifiedSignup: boolean } {
  const email = mailConfigured();
  return {
    email,
    google: Boolean(process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET),
    signup: email || signupWithoutEmail(),
    verifiedSignup: email,
  };
}

/* ------------------------------------------------------------------ sign up */

export async function signUp(
  input: { email: unknown; password: unknown; fullName?: unknown; phone?: unknown },
  info: ClientInfo,
): Promise<{ status: 'check_email' } | SessionResult> {
  const email = normalizeEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const problem = passwordProblem(password, email);
  if (problem) throw new AuthError(400, problem, 'weak_password');
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim().slice(0, 200) : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim().slice(0, 40) : '';
  if (!mailConfigured() && !signupWithoutEmail()) throw new AuthError(503, 'Sign-up is not open yet: the site cannot send confirmation emails right now. Please try again later.', 'mail_not_configured');
  await guard([
    [`signup:ip:${info.ip}`, 10, 3600],
    [`signup:email:${email}`, 4, 3600],
  ]);
  void maybeCleanup();
  if (!mailConfigured()) return signUpDirect(email, password, fullName, phone, info);

  const existing = await userByEmail(email);
  if (existing) {
    // The same answer as for a new address, so the form cannot be used to find out who has an account.
    await safeSend(alreadyRegisteredEmail(email, `${siteUrl()}/login`, `${siteUrl()}/login?forgot=1`));
    await audit('signup_existing', { userId: existing.id, email, info });
    return { status: 'check_email' };
  }

  const token = newToken();
  const passwordHash = await hashPassword(password);
  await withTransaction(async (c) => {
    const run = within(c);
    await run("UPDATE app.auth_tokens SET used_at = now() WHERE purpose = 'signup' AND email = $1::citext AND used_at IS NULL", [email]);
    await run(
      `INSERT INTO app.auth_tokens (purpose, token_hash, email, payload, expires_at)
       VALUES ('signup', $1, $2::citext, $3::jsonb, now() + make_interval(hours => $4))`,
      [hashToken(token), email, JSON.stringify({ passwordHash, fullName, phone }), SIGNUP_TTL_HOURS],
    );
  });
  try {
    await sendMail(confirmEmail(email, fullName, `${siteUrl()}/verify-email?token=${token}`));
  } catch (e) {
    await query('UPDATE app.auth_tokens SET used_at = now() WHERE token_hash = $1', [hashToken(token)]);
    console.error('[auth] confirmation email failed:', e instanceof Error ? e.message : e);
    throw new AuthError(502, 'We could not send the confirmation email. Please try again in a few minutes.', 'mail_failed');
  }
  await audit('signup_requested', { email, info });
  return { status: 'check_email' };
}

/** Sign-up while no email can be sent (see signupWithoutEmail). Answers plainly when the address is taken: there is no email to hide it behind. */
async function signUpDirect(email: string, password: string, fullName: string, phone: string, info: ClientInfo): Promise<SessionResult> {
  if (await userByEmail(email)) throw new AuthError(409, 'This email already has an account. Sign in instead, or use "Forgot your password?".', 'exists');
  // An address that belonged to an earlier account can only be taken back by proving the mailbox, never by a plain sign-up.
  if (await claimableProfileId(email, direct)) {
    throw new AuthError(409, 'This email belongs to an earlier account. It can be reopened only through an emailed link, which is not available yet.', 'needs_email');
  }
  const passwordHash = await hashPassword(password);
  const result = await withTransaction(async (c) => {
    const run = within(c);
    const { rows } = await run<UserRow>(
      `INSERT INTO app.auth_users (email, password_hash, email_verified_at, full_name, phone, password_changed_at)
       VALUES ($1::citext, $2, NULL, $3, $4, now()) RETURNING ${USER_COLS}`,
      [email, passwordHash, fullName, phone],
    );
    return startSession(rows[0] as UserRow, info, run);
  });
  await audit('signup_unverified', { userId: result.user.id, email, info });
  return result;
}

/** Send the confirmation again for a pending registration (same password, new link). Always answers the same. */
export async function resendSignup(emailRaw: unknown, info: ClientInfo): Promise<{ status: 'check_email' }> {
  const email = normalizeEmail(emailRaw);
  if (!mailConfigured()) throw new AuthError(503, 'Email is not set up yet. Please try again later.', 'mail_not_configured');
  await guard([
    [`resend:ip:${info.ip}`, 10, 3600],
    [`resend:email:${email}`, 4, 3600],
  ]);
  const { rows } = await query<{ payload: { passwordHash: string; fullName?: string; phone?: string } }>(
    "SELECT payload FROM app.auth_tokens WHERE purpose = 'signup' AND email = $1::citext AND used_at IS NULL AND created_at > now() - interval '7 days' ORDER BY created_at DESC LIMIT 1",
    [email],
  );
  const pending = rows[0];
  if (pending && !(await userByEmail(email))) {
    const token = newToken();
    await withTransaction(async (c) => {
      const run = within(c);
      await run("UPDATE app.auth_tokens SET used_at = now() WHERE purpose = 'signup' AND email = $1::citext AND used_at IS NULL", [email]);
      await run(
        `INSERT INTO app.auth_tokens (purpose, token_hash, email, payload, expires_at)
         VALUES ('signup', $1, $2::citext, $3::jsonb, now() + make_interval(hours => $4))`,
        [hashToken(token), email, JSON.stringify(pending.payload), SIGNUP_TTL_HOURS],
      );
    });
    await safeSend(confirmEmail(email, pending.payload.fullName ?? '', `${siteUrl()}/verify-email?token=${token}`));
  }
  return { status: 'check_email' };
}

/** The link from the confirmation email: creates the account and signs the person in. */
export async function verifySignup(token: unknown, info: ClientInfo): Promise<SessionResult> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) throw new AuthError(400, 'This link is not valid.', 'invalid_link');
  await guard([[`verify:ip:${info.ip}`, 30, 3600]]);
  const result = await withTransaction(async (c) => {
    const run = within(c);
    const { rows } = await run<{ email: string; payload: { passwordHash: string; fullName?: string; phone?: string } }>(
      "UPDATE app.auth_tokens SET used_at = now() WHERE token_hash = $1 AND purpose = 'signup' AND used_at IS NULL AND expires_at > now() RETURNING email, payload",
      [hashToken(token)],
    );
    const t = rows[0];
    if (!t) throw new AuthError(400, 'This link is invalid or has expired. Ask for a new confirmation email.', 'invalid_link');
    if (await userByEmail(t.email, run)) throw new AuthError(409, 'This email already has an account. Sign in instead.', 'exists');
    const user = await createUser(run, { email: t.email, passwordHash: t.payload.passwordHash, fullName: t.payload.fullName, phone: t.payload.phone });
    return startSession(user, info, run);
  });
  await audit('signup_verified', { userId: result.user.id, email: result.user.email, info });
  return result;
}

/* ------------------------------------------------------------------ sign in */

const BAD_LOGIN = 'Incorrect email or password.';

export async function signIn(input: { email: unknown; password: unknown }, info: ClientInfo): Promise<SessionResult> {
  const email = normalizeEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  if (!password || password.length > 1024) throw new AuthError(401, BAD_LOGIN, 'invalid_credentials');
  await guard([
    [`login:ip:${info.ip}`, 40, 900],
    [`login:email:${email}`, 10, 900],
  ]);
  void maybeCleanup();

  const user = await userByEmail(email);
  if (!user || !user.password_hash || user.disabled_at) {
    await verifyAgainstDummy(password);
    await audit('login_failed', { userId: user?.id, email, info, detail: user ? (user.disabled_at ? 'disabled' : 'no password') : 'unknown' });
    throw new AuthError(401, BAD_LOGIN, 'invalid_credentials');
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    await audit('login_failed', { userId: user.id, email, info, detail: 'wrong password' });
    throw new AuthError(401, BAD_LOGIN, 'invalid_credentials');
  }
  if (needsRehash(user.password_hash)) {
    await query('UPDATE app.auth_users SET password_hash = $2 WHERE id = $1', [user.id, await hashPassword(password)]);
  }
  await query('DELETE FROM app.auth_rate WHERE key = $1', [`login:email:${email}`]);
  const session = await startSession(user, info);
  await audit('login', { userId: user.id, email, info });
  return session;
}

/* ------------------------------------------------------------------ sessions */

type RefreshOutcome = { ok: SessionResult } | { fail: AuthError; revoke?: string };

/** Trade a refresh token for a new access token and a new refresh token (the old one stops working). */
export async function refresh(rawToken: string | undefined, info: ClientInfo): Promise<SessionResult> {
  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) throw new AuthError(401, 'Signed out.', 'no_session');
  const h = hashToken(rawToken);
  const outcome = await withTransaction<RefreshOutcome>(async (c) => {
    const run = within(c);
    const { rows } = await run<{ id: string; user_id: string; revoked_at: Date | null; expired: boolean; created_at: Date }>(
      'SELECT id, user_id, revoked_at, expires_at <= now() AS expired, created_at FROM app.auth_sessions WHERE token_hash = $1 FOR UPDATE',
      [h],
    );
    const s = rows[0];
    if (!s) {
      const prev = await run<{ id: string; revoked_at: Date | null; recent: boolean }>(
        "SELECT id, revoked_at, rotated_at > now() - interval '10 seconds' AS recent FROM app.auth_sessions WHERE prev_hash = $1",
        [h],
      );
      const p = prev.rows[0];
      if (!p || p.revoked_at) return { fail: new AuthError(401, 'Signed out.', 'no_session') };
      // Two tabs refreshing at once: the browser already holds the newer cookie, so ask the client to try again.
      if (p.recent) return { fail: new AuthError(409, 'Try again.', 'retry') };
      // An old token came back later: it was copied. End the session.
      return { fail: new AuthError(401, 'Signed out.', 'reuse'), revoke: p.id };
    }
    if (s.revoked_at || s.expired) return { fail: new AuthError(401, 'Signed out.', 'no_session') };
    const user = await userById(s.user_id, run);
    if (!user || user.disabled_at) return { fail: new AuthError(401, 'Signed out.', 'no_session') };
    const next = newToken();
    await run(
      `UPDATE app.auth_sessions SET prev_hash = token_hash, token_hash = $2, rotated_at = now(), last_used_at = now(),
              expires_at = LEAST(now() + make_interval(days => $3), created_at + make_interval(days => $4)),
              ip = $5, user_agent = $6 WHERE id = $1`,
      [s.id, hashToken(next), REFRESH_DAYS, SESSION_MAX_DAYS, info.ip.slice(0, 64), info.userAgent.slice(0, 300)],
    );
    const { token, expiresAt } = await signAccessToken({ id: user.id, email: user.email, emailVerified: !!user.email_verified_at }, s.id);
    return { ok: { accessToken: token, expiresAt, user: toPublic(user), refreshToken: next, refreshMaxAgeSeconds: REFRESH_DAYS * 86_400 } };
  });
  if ('ok' in outcome) return outcome.ok;
  if (outcome.revoke) {
    await query('UPDATE app.auth_sessions SET revoked_at = now() WHERE id = $1', [outcome.revoke]);
    await audit('refresh_reuse', { info, detail: `session ${outcome.revoke} revoked` });
  }
  throw outcome.fail;
}

export async function signOut(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const h = hashToken(rawToken);
  await query('UPDATE app.auth_sessions SET revoked_at = now() WHERE (token_hash = $1 OR prev_hash = $1) AND revoked_at IS NULL', [h]);
}

/** Sign out everywhere, optionally keeping the session the request came from. */
async function revokeSessions(userId: string, keepSessionId?: string, run: Run = direct): Promise<void> {
  await run('UPDATE app.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND ($2::uuid IS NULL OR id <> $2::uuid)', [userId, keepSessionId ?? null]);
}

export async function me(userId: string): Promise<PublicUser> {
  const u = await userById(userId);
  if (!u || u.disabled_at) throw new AuthError(401, 'Signed out.', 'no_session');
  return toPublic(u);
}

export async function updateProfile(userId: string, input: { fullName?: unknown; phone?: unknown }): Promise<PublicUser> {
  const name = typeof input.fullName === 'string' ? input.fullName.trim().slice(0, 200) : null;
  const phone = typeof input.phone === 'string' ? input.phone.trim().slice(0, 40) : null;
  const { rows } = await query<UserRow>(
    `UPDATE app.auth_users SET full_name = COALESCE($2, full_name), phone = COALESCE($3, phone) WHERE id = $1 RETURNING ${USER_COLS}`,
    [userId, name, phone],
  );
  if (!rows[0]) throw new AuthError(401, 'Signed out.', 'no_session');
  return toPublic(rows[0]);
}

/* ---------------------------------------------------------------- passwords */

export async function forgotPassword(emailRaw: unknown, info: ClientInfo): Promise<{ status: 'check_email' }> {
  const email = normalizeEmail(emailRaw);
  if (!mailConfigured()) throw new AuthError(503, 'Password reset by email is not available yet. Please try again later.', 'mail_not_configured');
  await guard([
    [`forgot:ip:${info.ip}`, 20, 3600],
    [`forgot:email:${email}`, 5, 3600],
  ]);
  void maybeCleanup();
  const user = await userByEmail(email);
  const claimable = user ? null : await claimableProfileId(email, direct);
  if ((user && !user.disabled_at) || claimable) {
    await sendResetLink(email, user?.id ?? null);
    await audit('reset_requested', { userId: user?.id, email, info });
  }
  return { status: 'check_email' };
}

async function sendResetLink(email: string, userId: string | null): Promise<string> {
  const token = newToken();
  await withTransaction(async (c) => {
    const run = within(c);
    await run("UPDATE app.auth_tokens SET used_at = now() WHERE purpose = 'reset_password' AND email = $1::citext AND used_at IS NULL", [email]);
    await run(
      `INSERT INTO app.auth_tokens (purpose, token_hash, email, user_id, expires_at)
       VALUES ('reset_password', $1, $2::citext, $3, now() + make_interval(mins => $4))`,
      [hashToken(token), email, userId, RESET_TTL_MINUTES],
    );
  });
  await safeSend(resetEmail(email, `${siteUrl()}/reset-password?token=${token}`));
  return token;
}

/**
 * For the owner, from the VM's command line, when email is not set up: returns the reset link itself instead of mailing it.
 * (scripts/auth-admin.mjs does the same with plain SQL; this is the tested reference.)
 */
export async function createResetLink(emailRaw: string): Promise<string> {
  const email = normalizeEmail(emailRaw);
  const user = await userByEmail(email);
  const claimable = user ? null : await claimableProfileId(email, direct);
  if (!user && !claimable) throw new AuthError(404, 'No account or profile uses that address.', 'not_found');
  const token = newToken();
  await withTransaction(async (c) => {
    const run = within(c);
    await run("UPDATE app.auth_tokens SET used_at = now() WHERE purpose = 'reset_password' AND email = $1::citext AND used_at IS NULL", [email]);
    await run(
      `INSERT INTO app.auth_tokens (purpose, token_hash, email, user_id, expires_at) VALUES ('reset_password', $1, $2::citext, $3, now() + make_interval(mins => $4))`,
      [hashToken(token), email, user?.id ?? null, RESET_TTL_MINUTES],
    );
  });
  return `${siteUrl()}/reset-password?token=${token}`;
}

export async function resetPassword(input: { token: unknown; password: unknown }, info: ClientInfo): Promise<SessionResult> {
  const token = input.token;
  const password = typeof input.password === 'string' ? input.password : '';
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) throw new AuthError(400, 'This link is not valid.', 'invalid_link');
  await guard([[`reset:ip:${info.ip}`, 30, 3600]]);
  const h = hashToken(token);
  // Check the new password before the link is spent, so a weak password does not use it up.
  const peek = await query<{ email: string }>("SELECT email FROM app.auth_tokens WHERE token_hash = $1 AND purpose = 'reset_password' AND used_at IS NULL AND expires_at > now()", [h]);
  if (!peek.rows[0]) throw new AuthError(400, 'This link is invalid or has expired. Ask for a new one.', 'invalid_link');
  const problem = passwordProblem(password, peek.rows[0].email);
  if (problem) throw new AuthError(400, problem, 'weak_password');
  const passwordHash = await hashPassword(password);

  const result = await withTransaction(async (c) => {
    const run = within(c);
    const { rows } = await run<{ email: string; user_id: string | null }>(
      "UPDATE app.auth_tokens SET used_at = now() WHERE token_hash = $1 AND purpose = 'reset_password' AND used_at IS NULL AND expires_at > now() RETURNING email, user_id",
      [h],
    );
    const t = rows[0];
    if (!t) throw new AuthError(400, 'This link is invalid or has expired. Ask for a new one.', 'invalid_link');
    let user: UserRow | null = t.user_id ? await userById(t.user_id, run) : await userByEmail(t.email, run);
    if (user) {
      const upd = await run<UserRow>(
        `UPDATE app.auth_users SET password_hash = $2, password_changed_at = now(), email_verified_at = COALESCE(email_verified_at, now())
         WHERE id = $1 RETURNING ${USER_COLS}`,
        [user.id, passwordHash],
      );
      user = upd.rows[0] as UserRow;
      await revokeSessions(user.id, undefined, run);
    } else {
      user = await createUser(run, { email: t.email, passwordHash });
    }
    if (user.disabled_at) throw new AuthError(403, 'This account is disabled.', 'disabled');
    return { session: await startSession(user, info, run), created: !t.user_id };
  });
  await audit(result.created ? 'account_claimed' : 'password_reset', { userId: result.session.user.id, email: result.session.user.email, info });
  if (!result.created) await safeSend(passwordChangedEmail(result.session.user.email, new Date().toUTCString()));
  return result.session;
}

export async function changePassword(
  caller: { userId: string; sessionId?: string },
  input: { currentPassword?: unknown; newPassword: unknown },
  info: ClientInfo,
): Promise<void> {
  await guard([[`chpw:user:${caller.userId}`, 10, 3600]]);
  const user = await userById(caller.userId);
  if (!user || user.disabled_at) throw new AuthError(401, 'Signed out.', 'no_session');
  const next = typeof input.newPassword === 'string' ? input.newPassword : '';
  const problem = passwordProblem(next, user.email);
  if (problem) throw new AuthError(400, problem, 'weak_password');
  if (user.password_hash) {
    const current = typeof input.currentPassword === 'string' ? input.currentPassword : '';
    if (!current || !(await verifyPassword(current, user.password_hash))) {
      await audit('change_password_failed', { userId: user.id, email: user.email, info });
      throw new AuthError(400, 'Your current password is not correct.', 'wrong_password');
    }
    if (await verifyPassword(next, user.password_hash)) throw new AuthError(400, 'Your new password must be different from the current one.', 'same_password');
  }
  const hash = await hashPassword(next);
  await withTransaction(async (c) => {
    const run = within(c);
    await run('UPDATE app.auth_users SET password_hash = $2, password_changed_at = now() WHERE id = $1', [user.id, hash]);
    await revokeSessions(user.id, caller.sessionId, run);
  });
  await audit('password_changed', { userId: user.id, email: user.email, info });
  await safeSend(passwordChangedEmail(user.email, new Date().toUTCString()));
}

/* ------------------------------------------------------------------- Google */

/** The person Google says signed in. Sign in, or create the account, or link it to the account with the same verified address. */
export async function signInWithGoogleProfile(g: { sub: string; email: string; emailVerified: boolean; name?: string }, info: ClientInfo): Promise<SessionResult> {
  const email = normalizeEmail(g.email);
  const session = await withTransaction(async (c) => {
    const run = within(c);
    const linked = await run<{ user_id: string }>("SELECT user_id FROM app.auth_identities WHERE provider = 'google' AND provider_user_id = $1", [g.sub]);
    let user: UserRow | null = linked.rows[0] ? await userById(linked.rows[0].user_id, run) : null;
    if (!user) {
      // Only an address Google has verified may be linked to an account or used to create one.
      if (!g.emailVerified) throw new AuthError(403, 'Google has not verified that email address, so it cannot be used to sign in.', 'google_unverified');
      user = (await userByEmail(email, run)) ?? (await createUser(run, { email, passwordHash: null, fullName: g.name }));
      await run(
        "INSERT INTO app.auth_identities (provider, provider_user_id, user_id, email) VALUES ('google', $1, $2, $3::citext) ON CONFLICT DO NOTHING",
        [g.sub, user.id, email],
      );
    }
    if (user.disabled_at) throw new AuthError(403, 'This account is disabled.', 'disabled');
    return startSession(user, info, run);
  });
  await audit('login_google', { userId: session.user.id, email: session.user.email, info });
  return session;
}

/* ------------------------------------------------------------------ utility */

async function safeSend(m: Parameters<typeof sendMail>[0]): Promise<void> {
  try {
    await sendMail(m);
  } catch (e) {
    console.error('[auth] email failed:', e instanceof Error ? e.message : e);
  }
}

export { ACCESS_TTL_SECONDS };
