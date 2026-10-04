import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { __setKeys, AuthConfigError, UnauthenticatedError, verifyAccessToken } from './verify';

const URL = 'https://proj.supabase.co';
let signer: CryptoKey;
let stranger: CryptoKey;

interface Opts { iss?: string; aud?: string; sub?: string | null; exp?: string; key?: CryptoKey }

function make(o: Opts = {}) {
  const jwt = new SignJWT({ email: 'a@b.co' })
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setIssuer(o.iss ?? `${URL}/auth/v1`)
    .setAudience(o.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(o.exp ?? '5m');
  if (o.sub !== null) jwt.setSubject(o.sub ?? 'user-1');
  return jwt.sign(o.key ?? signer);
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
  const a = await generateKeyPair('ES256');
  signer = a.privateKey;
  stranger = (await generateKeyPair('ES256')).privateKey;
  const jwk = { ...(await exportJWK(a.publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };
  keySet = createLocalJWKSet({ keys: [jwk] });
});

let keySet: ReturnType<typeof createLocalJWKSet>;
beforeEach(() => __setKeys(keySet));
afterEach(() => __setKeys(null));

describe('verifyAccessToken', () => {
  it('accepts a valid token and returns the user id and email', async () => {
    expect(await verifyAccessToken(await make())).toEqual({ userId: 'user-1', email: 'a@b.co', emailVerified: false });
  });

  it.each<[string, () => Promise<string> | string | undefined]>([
    ['a missing token', () => undefined],
    ['garbage', () => 'not.a.jwt'],
    ['a token signed by another key', () => make({ key: stranger })],
    ['the wrong issuer', () => make({ iss: 'https://evil.example/auth/v1' })],
    ['the wrong audience', () => make({ aud: 'anon' })],
    ['an expired token', () => make({ exp: '-1m' })],
    ['a token without a subject', () => make({ sub: null })],
  ])('rejects %s', async (_name, build) => {
    await expect(verifyAccessToken(await build())).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('reports a missing project URL as a configuration error, not a 401', async () => {
    const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    __setKeys(null);
    await expect(verifyAccessToken('x.y.z')).rejects.toBeInstanceOf(AuthConfigError);
    process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
  });
});
