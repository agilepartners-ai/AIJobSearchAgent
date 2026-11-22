/**
 * Server-side identity: verify our own access token, an ES256 JWT signed on the VM when a user signs in.
 *
 * Only the PUBLIC key is needed here, so this runs on the Cloudflare Worker as well as on the VM and neither the Worker nor
 * the browser can mint a token. The private key lives only in the VM's environment (see tokens.ts). Verification needs no
 * database, so a page's API calls keep authenticating for the token's lifetime even if the database is briefly unreachable.
 */
import { importSPKI, jwtVerify } from 'jose';
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
  /** True only when the address has been proved: every account has, because sign-up only creates the account after the email link. */
  emailVerified: boolean;
  /** The sign-in session this token belongs to (to keep it when other sessions are revoked). */
  sessionId?: string;
}

export const ACCESS_AUDIENCE = 'authenticated';

type PublicKey = Awaited<ReturnType<typeof importSPKI>>;
let keys: PublicKey[] | null = null;

/** The address the site is served from; it is also the token issuer. */
export function authIssuer(): string {
  const v = (process.env.AUTH_ISSUER || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  if (!v) throw new AuthConfigError('AUTH_ISSUER (or NEXT_PUBLIC_SITE_URL) is not set');
  return v;
}

/** PEM text kept in one line in environment files, with \n written out. */
export function pem(value: string): string {
  return value.replace(/\\n/g, '\n').trim();
}

async function getKeys(): Promise<PublicKey[]> {
  if (keys) return keys;
  // The current key, and the previous one while tokens signed with it are still alive (key rotation).
  const pems = [process.env.AUTH_JWT_PUBLIC_KEY, process.env.AUTH_JWT_PREVIOUS_PUBLIC_KEY].filter((v): v is string => !!v?.trim());
  if (!pems.length) throw new AuthConfigError('AUTH_JWT_PUBLIC_KEY is not set');
  try {
    keys = await Promise.all(pems.map((p) => importSPKI(pem(p), 'ES256')));
  } catch {
    throw new AuthConfigError('AUTH_JWT_PUBLIC_KEY is not a valid ES256 public key (PEM)');
  }
  return keys;
}

/** Test seam: supply keys instead of reading the environment. */
export function __setKeys(k: PublicKey[] | null): void {
  keys = k;
}

export async function verifyAccessToken(token: string | undefined | null): Promise<Caller> {
  if (!token) throw new UnauthenticatedError();
  const issuer = authIssuer();
  const candidates = await getKeys();
  for (const key of candidates) {
    try {
      const { payload } = await jwtVerify(token, key, { issuer, audience: ACCESS_AUDIENCE, algorithms: ['ES256'] });
      if (!payload.sub) break;
      return {
        userId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : null,
        emailVerified: payload.email_verified === true,
        sessionId: typeof payload.sid === 'string' ? payload.sid : undefined,
      };
    } catch {
      // Not this key (or not valid at all): try the next one, then refuse.
    }
  }
  throw new UnauthenticatedError();
}

/** `Authorization: Bearer …` (preferred); `idToken` in the body is accepted for the JobWing plugin and older clients. */
export function bearerFrom(req: NextApiRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  const body = req.body as { idToken?: unknown } | undefined;
  return typeof body?.idToken === 'string' ? body.idToken : undefined;
}

export async function requireUser(req: NextApiRequest): Promise<Caller> {
  return verifyAccessToken(bearerFrom(req));
}
