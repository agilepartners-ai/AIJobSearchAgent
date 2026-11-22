/**
 * Minting tokens. VM only: this is the one place that touches the private signing key.
 *
 * - Access token: ES256 JWT, 15 minutes, held by the browser in memory only (never in storage).
 * - Refresh token: 32 random bytes, kept in an HttpOnly cookie, stored in the database only as a SHA-256 hash.
 * - Email-link tokens: the same kind of random value, single use.
 */
import { createHash, randomBytes } from 'node:crypto';
import { calculateJwkThumbprint, exportJWK, importPKCS8, importSPKI, SignJWT } from 'jose';
import { ACCESS_AUDIENCE, AuthConfigError, authIssuer, pem } from './verify';

export const ACCESS_TTL_SECONDS = 15 * 60;

type PrivateKey = Awaited<ReturnType<typeof importPKCS8>>;
let signing: { key: PrivateKey; kid: string } | null = null;

async function getSigningKey() {
  if (signing) return signing;
  const priv = process.env.AUTH_JWT_PRIVATE_KEY;
  const pub = process.env.AUTH_JWT_PUBLIC_KEY;
  if (!priv?.trim() || !pub?.trim()) throw new AuthConfigError('AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY must both be set on the server that signs people in');
  let key: PrivateKey;
  let kid: string;
  try {
    key = await importPKCS8(pem(priv), 'ES256');
    kid = await calculateJwkThumbprint(await exportJWK(await importSPKI(pem(pub), 'ES256', { extractable: true })));
  } catch {
    throw new AuthConfigError('AUTH_JWT_PRIVATE_KEY / AUTH_JWT_PUBLIC_KEY are not a valid ES256 key pair (PEM)');
  }
  signing = { key, kid };
  return signing;
}

export function __resetSigningKey(): void {
  signing = null;
}

export async function signAccessToken(u: { id: string; email: string; emailVerified: boolean }, sessionId: string): Promise<{ token: string; expiresAt: number }> {
  const { key, kid } = await getSigningKey();
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
  const token = await new SignJWT({ email: u.email, email_verified: u.emailVerified, sid: sessionId })
    .setProtectedHeader({ alg: 'ES256', kid, typ: 'JWT' })
    .setSubject(u.id)
    .setIssuer(authIssuer())
    .setAudience(ACCESS_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
  return { token, expiresAt };
}

/** 256 random bits, URL-safe. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
