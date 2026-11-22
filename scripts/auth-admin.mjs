#!/usr/bin/env node
/**
 * Owner tools for sign-in. Plain Node, no build step.
 *
 *   node scripts/auth-admin.mjs keygen <file>
 *       Makes the ES256 key pair for access tokens. Writes AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY as .env lines to <file>
 *       (refuses to overwrite) and prints only the public key. The private key never goes to the screen.
 *
 *   node scripts/auth-admin.mjs reset-link <email>
 *       Break glass, when email sending is not set up (or the mailbox is out of reach): prints a one-hour link that lets the
 *       owner of <email> choose a password, without sending any mail. Works for an existing account, and for a profile from
 *       before accounts moved here (the account is created with that profile's id, so résumés and applications are kept).
 *       Runs where DATABASE_URL points at the database, i.e. inside the VM container:
 *         docker exec -i ajsa-generate node --input-type=module - reset-link you@example.com < scripts/auth-admin.mjs
 *       The link is a credential: open it yourself, do not paste it into chat or a ticket. Using it signs nobody in by itself.
 *
 *   node scripts/auth-admin.mjs set-password <email>
 *       Owner only: sets a new random password for <email> and prints it once (send it straight to a private file). Signs out
 *       every device. Same container command as reset-link.
 *
 * Tested reference for the SQL below: createResetLink in src/server/auth/service.ts.
 */
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const [, , command, arg] = process.argv;
const die = (message) => {
  console.error(message);
  process.exit(1);
};

if (command === 'keygen') {
  if (!arg) die('Usage: keygen <file>');
  if (existsSync(arg)) die(`${arg} already exists; refusing to overwrite keys.`);
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const priv = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim().replace(/\n/g, '\\n');
  const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString().trim().replace(/\n/g, '\\n');
  writeFileSync(arg, `AUTH_JWT_PRIVATE_KEY=${priv}\nAUTH_JWT_PUBLIC_KEY=${pub}\nEDGE_SHARED_SECRET=${randomBytes(32).toString('base64url')}\n`, { flag: 'wx', mode: 0o600 });
  console.log(`Wrote the key pair and an EDGE_SHARED_SECRET to ${arg}. Public key:\n${pub.replace(/\\n/g, '\n')}`);
} else if (command === 'set-password') {
  // Owner only, from the VM: gives <email> a new random password and prints it ONCE on stdout (capture it to a private file).
  // Creates the account if only an older profile exists (keeping that profile's id). Signs out every existing session.
  const email = String(arg ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) die('Usage: set-password <email>');
  if (!process.env.DATABASE_URL) die('DATABASE_URL is not set. Run this inside the container.');
  const { scryptSync } = await import('node:crypto');
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(20);
  const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  const password = `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
  const [N, R, P] = [2 ** 15, 8, 3];
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize('NFKC'), salt, 64, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  const hash = `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: true } });
  await client.connect();
  try {
    await client.query('BEGIN');
    const user = (await client.query('SELECT id FROM app.auth_users WHERE email = $1::citext', [email])).rows[0];
    let id = user?.id;
    if (user) {
      await client.query(
        'UPDATE app.auth_users SET password_hash = $2, password_changed_at = now(), email_verified_at = COALESCE(email_verified_at, now()), disabled_at = NULL WHERE id = $1',
        [id, hash],
      );
      await client.query('UPDATE app.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
    } else {
      const profile = (await client.query(
        `SELECT p.user_id, p.full_name FROM app.profiles p WHERE p.email = $1::citext ORDER BY p.created_at LIMIT 1`,
        [email],
      )).rows[0];
      if (!profile) die('No account or profile uses that address.');
      id = profile.user_id;
      await client.query(
        `INSERT INTO app.auth_users (id, email, password_hash, email_verified_at, full_name, password_changed_at) VALUES ($1, $2::citext, $3, now(), $4, now())`,
        [id, email, hash, profile.full_name ?? ''],
      );
    }
    await client.query("UPDATE app.auth_tokens SET used_at = now() WHERE purpose = 'reset_password' AND email = $1::citext AND used_at IS NULL", [email]);
    await client.query(`INSERT INTO app.auth_events (user_id, email, kind, detail) VALUES ($1, $2, 'password_set_by_owner', 'auth-admin.mjs')`, [id, email]);
    await client.query('COMMIT');
    console.log(password);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
} else if (command === 'reset-link') {
  const email = String(arg ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) die('Usage: reset-link <email>');
  if (!process.env.DATABASE_URL) die('DATABASE_URL is not set. Run this inside the container: docker exec -i ajsa-generate node --input-type=module - reset-link <email> < scripts/auth-admin.mjs');
  const { default: pg } = await import('pg');
  const ssl = process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: true };
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl });
  await client.connect();
  try {
    await client.query('BEGIN');
    const user = (await client.query('SELECT id, disabled_at FROM app.auth_users WHERE email = $1::citext', [email])).rows[0];
    if (user?.disabled_at) die('That account is disabled.');
    const profile = user
      ? null
      : (await client.query(
          `SELECT p.user_id FROM app.profiles p
            WHERE p.email = $1::citext AND NOT EXISTS (SELECT 1 FROM app.auth_users u WHERE u.id = p.user_id)
            ORDER BY p.created_at LIMIT 1`,
          [email],
        )).rows[0];
    if (!user && !profile) die('No account or profile uses that address.');
    const token = randomBytes(32).toString('base64url');
    await client.query("UPDATE app.auth_tokens SET used_at = now() WHERE purpose = 'reset_password' AND email = $1::citext AND used_at IS NULL", [email]);
    await client.query(
      `INSERT INTO app.auth_tokens (purpose, token_hash, email, user_id, expires_at) VALUES ('reset_password', $1, $2::citext, $3, now() + interval '60 minutes')`,
      [createHash('sha256').update(token).digest('hex'), email, user?.id ?? null],
    );
    await client.query(`INSERT INTO app.auth_events (kind, email, detail) VALUES ('reset_link_issued_by_owner', $1, 'auth-admin.mjs')`, [email]);
    await client.query('COMMIT');
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agilepartners-ai.com').replace(/\/+$/, '');
    console.log(`${site}/reset-password?token=${token}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
} else {
  die('Usage: auth-admin.mjs keygen <file> | reset-link <email> | set-password <email>');
}
