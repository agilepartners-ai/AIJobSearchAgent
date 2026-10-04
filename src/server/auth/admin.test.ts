import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminEmails, isAdmin } from './admin';

const ADMINS = 'Boss@Example.com, second@example.com ,';

describe('admin accounts', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('parses a comma-separated list, ignoring case, spaces and empty entries', () => {
    expect(Array.from(adminEmails(ADMINS)).sort()).toEqual(['boss@example.com', 'second@example.com']);
    expect(adminEmails('').size).toBe(0);
    vi.stubEnv('ADMIN_EMAILS', '');
    expect(adminEmails(undefined).size).toBe(0);
  });

  it('grants admin to a listed, verified address, whatever its letter case', () => {
    expect(isAdmin({ email: 'boss@example.com', emailVerified: true }, ADMINS)).toBe(true);
    expect(isAdmin({ email: 'BOSS@EXAMPLE.COM', emailVerified: true }, ADMINS)).toBe(true);
    expect(isAdmin({ email: ' second@example.com ', emailVerified: true }, ADMINS)).toBe(true);
  });

  it('refuses a listed address the provider has not verified', () => {
    expect(isAdmin({ email: 'boss@example.com', emailVerified: false }, ADMINS)).toBe(false);
  });

  it('refuses everyone who is not listed, including look-alikes', () => {
    for (const email of ['someone@example.com', 'boss@example.com.evil.io', 'xboss@example.com', 'boss@example.co']) {
      expect(isAdmin({ email, emailVerified: true }, ADMINS), email).toBe(false);
    }
  });

  it('refuses a token with no email, and refuses everyone when no admin is configured', () => {
    expect(isAdmin({ email: null, emailVerified: true }, ADMINS)).toBe(false);
    expect(isAdmin({ email: 'boss@example.com', emailVerified: true }, '')).toBe(false);
    vi.stubEnv('ADMIN_EMAILS', '');
    expect(isAdmin({ email: 'boss@example.com', emailVerified: true })).toBe(false);
  });

  it('reads ADMIN_EMAILS from the environment when no list is passed', () => {
    vi.stubEnv('ADMIN_EMAILS', 'boss@example.com');
    expect(isAdmin({ email: 'boss@example.com', emailVerified: true })).toBe(true);
    expect(isAdmin({ email: 'other@example.com', emailVerified: true })).toBe(false);
  });
});
