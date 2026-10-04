/**
 * Server-side identity: verify a Supabase access token (a JWT signed with the
 * project's asymmetric key) against the project's public JWKS. No secret is
 * needed and Supabase's database is never touched.
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { NextApiRequest } from 'next';

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = 'You must be signed in.') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export interface Caller {
  userId: string;
  email: string | null;
}

let keys: JWTVerifyGetKey | null = null;

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  if (!url) throw new AuthConfigError('NEXT_PUBLIC_SUPABASE_URL is not set');
  return url;
}

function getKeys(): JWTVerifyGetKey {
  if (!keys) {
    // jose caches the key set and refetches on an unknown `kid` (key rotation).
    keys = createRemoteJWKSet(new URL(`${supabaseUrl()}/auth/v1/.well-known/jwks.json`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60_000,
    });
  }
  return keys;
}

/** Test seam: supply keys instead of fetching the project's JWKS. */
export function __setKeys(k: JWTVerifyGetKey | null): void {
  keys = k;
}

export async function verifyAccessToken(token: string | undefined | null): Promise<Caller> {
  if (!token) throw new UnauthenticatedError();
  try {
    const { payload } = await jwtVerify(token, getKeys(), {
      issuer: `${supabaseUrl()}/auth/v1`,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
    });
    if (!payload.sub) throw new UnauthenticatedError();
    return { userId: payload.sub, email: typeof payload.email === 'string' ? payload.email : null };
  } catch (err) {
    if (err instanceof AuthConfigError) throw err;
    throw new UnauthenticatedError();
  }
}

/** `Authorization: Bearer …` (preferred); `idToken` in the body is accepted while clients migrate. */
export function bearerFrom(req: NextApiRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  const body = req.body as { idToken?: unknown } | undefined;
  return typeof body?.idToken === 'string' ? body.idToken : undefined;
}

export async function requireUser(req: NextApiRequest): Promise<Caller> {
  return verifyAccessToken(bearerFrom(req));
}
