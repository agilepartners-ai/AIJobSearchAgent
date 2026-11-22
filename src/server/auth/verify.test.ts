import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SignJWT, exportPKCS8, exportSPKI, generateKeyPair, importSPKI } from 'jose';
import { __resetSigningKey, signAccessToken } from './tokens';
import { __setKeys, AuthConfigError, UnauthenticatedError, verifyAccessToken } from './verify';

const SITE = 'https://example.test';
let signer: CryptoKey;
let stranger: CryptoKey;
let publicKey: Awaited<ReturnType<typeof importSPKI>>;

interface Opts { iss?: string; aud?: string; sub?: string | null; exp?: string; key?: CryptoKey; alg?: string }

function make(o: Opts = {}) {
  const jwt = new SignJWT({ email: 'a@b.co', email_verified: true, sid: 'sess-1' })
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setIssuer(o.iss ?? SITE)
    .setAudience(o.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(o.exp ?? '5m');
  if (o.sub !== null) jwt.setSubject(o.sub ?? 'user-1');
  return jwt.sign(o.key ?? signer);
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  delete process.env.AUTH_ISSUER;
  const a = await generateKeyPair('ES256', { extractable: true });
  signer = a.privateKey;
  publicKey = a.publicKey;
  stranger = (await generateKeyPair('ES256')).privateKey;
});

beforeEach(() => __setKeys([publicKey]));
afterEach(() => __setKeys(null));

describe('verifyAccessToken', () => {
  it('accepts a valid token and returns the user, the address, whether it is verified, and the session', async () => {
    expect(await verifyAccessToken(await make())).toEqual({ userId: 'user-1', email: 'a@b.co', emailVerified: true, sessionId: 'sess-1' });
  });

  it.each<[string, () => Promise<string> | string | undefined]>([
    ['a missing token', () => undefined],
    ['garbage', () => 'not.a.jwt'],
    ['a token signed by another key', () => make({ key: stranger })],
    ['the wrong issuer', () => make({ iss: 'https://evil.example' })],
    ['the wrong audience', () => make({ aud: 'anon' })],
    ['an expired token', () => make({ exp: '-1m' })],
    ['a token without a subject', () => make({ sub: null })],
  ])('rejects %s', async (_name, build) => {
    await expect(verifyAccessToken(await build())).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rejects a token that claims alg none or HS256 (algorithm confusion)', async () => {
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'x', iss: SITE, aud: 'authenticated', exp: 9999999999 })).toString('base64url')}.`;
    await expect(verifyAccessToken(none)).rejects.toBeInstanceOf(UnauthenticatedError);
    const hs = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject('x').setIssuer(SITE).setAudience('authenticated').setExpirationTime('5m').sign(new TextEncoder().encode('s'.repeat(32)));
    await expect(verifyAccessToken(hs)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('still accepts tokens from the previous key while keys are rotated', async () => {
    const other = await generateKeyPair('ES256');
    __setKeys([other.publicKey, publicKey]);
    expect((await verifyAccessToken(await make())).userId).toBe('user-1');
  });

  it('reports a missing public key as a configuration error, not a 401', async () => {
    __setKeys(null);
    const saved = process.env.AUTH_JWT_PUBLIC_KEY;
    delete process.env.AUTH_JWT_PUBLIC_KEY;
    await expect(verifyAccessToken('x.y.z')).rejects.toBeInstanceOf(AuthConfigError);
    if (saved) process.env.AUTH_JWT_PUBLIC_KEY = saved;
  });
});

describe('signAccessToken (the VM) and verifyAccessToken (anywhere) agree', () => {
  it('a token minted from the PEM environment verifies with only the public PEM', async () => {
    const pair = await generateKeyPair('ES256', { extractable: true });
    process.env.AUTH_JWT_PRIVATE_KEY = (await exportPKCS8(pair.privateKey)).replace(/\n/g, '\\n');
    process.env.AUTH_JWT_PUBLIC_KEY = (await exportSPKI(pair.publicKey)).replace(/\n/g, '\\n');
    __resetSigningKey();
    __setKeys(null);
    const { token, expiresAt } = await signAccessToken({ id: 'u-9', email: 'p@q.io', emailVerified: true }, 'sid-9');
    expect(expiresAt).toBeGreaterThan(Date.now() / 1000);
    expect(await verifyAccessToken(token)).toEqual({ userId: 'u-9', email: 'p@q.io', emailVerified: true, sessionId: 'sid-9' });
  });
});
