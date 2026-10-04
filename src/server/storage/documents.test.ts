import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signLink, verifyLink } from './documents';

const USER = '11111111-1111-4111-8111-111111111111';
const PATH = 'ApplicationDocuments/abc_resume.pdf';

const parse = (link: string) => Object.fromEntries(new URL(link, 'http://x').searchParams);

beforeEach(() => {
  vi.stubEnv('DOCUMENT_SIGNING_SECRET', 'test-secret-that-is-long-enough-123456');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('signed document links', () => {
  it('verifies a link it just made and returns the owner and path', () => {
    const check = verifyLink(parse(signLink(USER, PATH)));
    expect(check).toEqual({ ok: true, userId: USER, path: PATH });
  });

  it('rejects a link whose path was changed', () => {
    const q = parse(signLink(USER, PATH));
    expect(verifyLink({ ...q, p: 'ApplicationDocuments/other_resume.pdf' })).toEqual({ ok: false, reason: 'forged' });
  });

  it('rejects a link re-pointed at another user', () => {
    const q = parse(signLink(USER, PATH));
    expect(verifyLink({ ...q, u: '22222222-2222-4222-8222-222222222222' })).toEqual({ ok: false, reason: 'forged' });
  });

  it('rejects a link whose expiry was extended', () => {
    const q = parse(signLink(USER, PATH, 1000));
    expect(verifyLink({ ...q, e: String(Number(q.e) + 10 * 24 * 3600 * 1000) })).toEqual({ ok: false, reason: 'forged' });
  });

  it('rejects an expired link', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const link = signLink(USER, PATH, 60_000);
    vi.setSystemTime(new Date('2026-10-01T00:02:00Z'));
    expect(verifyLink(parse(link))).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a link signed with a different secret', () => {
    const link = signLink(USER, PATH);
    vi.stubEnv('DOCUMENT_SIGNING_SECRET', 'a-completely-different-secret-value-0000');
    expect(verifyLink(parse(link))).toEqual({ ok: false, reason: 'forged' });
  });

  it.each([{}, { p: PATH }, { p: PATH, u: USER, e: 'soon', s: 'x' }, { p: [PATH], u: USER, e: '1', s: 'x' }])('rejects malformed parameters %j', (q) => {
    expect(verifyLink(q).ok).toBe(false);
  });

  it('refuses to sign in production without a secret', () => {
    vi.stubEnv('DOCUMENT_SIGNING_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => signLink(USER, PATH)).toThrow(/DOCUMENT_SIGNING_SECRET/);
  });
});
