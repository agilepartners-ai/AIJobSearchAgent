import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, GmailConfigError, signState, toBase64Url, verifyState } from './crypto';

const KEY = toBase64Url(new Uint8Array(Array.from({ length: 32 }, (_, i) => i + 1)));
const OTHER_KEY = toBase64Url(new Uint8Array(Array.from({ length: 32 }, (_, i) => 200 - i)));
const SECRET = 'state-secret-for-tests-0123456789';

describe('refresh token encryption', () => {
  it('round-trips and never stores the plain token', async () => {
    const stored = await encryptToken('1//refresh-token-value', KEY);
    expect(stored.startsWith('v1.')).toBe(true);
    expect(stored).not.toContain('refresh-token-value');
    expect(await decryptToken(stored, KEY)).toBe('1//refresh-token-value');
  });

  it('uses a fresh IV, so the same token never encrypts to the same text', async () => {
    expect(await encryptToken('same', KEY)).not.toBe(await encryptToken('same', KEY));
  });

  it('refuses the wrong key and tampered ciphertext', async () => {
    const stored = await encryptToken('secret', KEY);
    await expect(decryptToken(stored, OTHER_KEY)).rejects.toBeTruthy();
    const [v, iv, ct] = stored.split('.');
    const flipped = `${v}.${iv}.${ct.slice(0, -2)}${ct.endsWith('AA') ? 'BB' : 'AA'}`;
    await expect(decryptToken(flipped, KEY)).rejects.toBeTruthy();
  });

  it('rejects a missing, short or malformed key and an unknown format', async () => {
    await expect(encryptToken('x', '')).rejects.toBeInstanceOf(GmailConfigError);
    await expect(encryptToken('x', toBase64Url(new Uint8Array(16)))).rejects.toBeInstanceOf(GmailConfigError);
    await expect(decryptToken('v9.a.b', KEY)).rejects.toBeInstanceOf(GmailConfigError);
  });
});

describe('OAuth state', () => {
  it('carries the user id and verifies', async () => {
    const state = await signState('user-1', 1_000_000, 600_000, SECRET);
    expect(await verifyState(state, 1_000_001, SECRET)).toMatchObject({ uid: 'user-1' });
  });

  it('expires after ten minutes', async () => {
    const state = await signState('user-1', 1_000_000, 600_000, SECRET);
    expect(await verifyState(state, 1_000_000 + 600_001, SECRET)).toBeNull();
  });

  it('rejects a forged payload, a wrong secret and garbage', async () => {
    const state = await signState('user-1', 1_000_000, 600_000, SECRET);
    const [body, sig] = state.split('.');
    const forged = toBase64Url(new TextEncoder().encode(JSON.stringify({ uid: 'attacker', nonce: 'x', exp: 9_999_999_999_999 })));
    expect(await verifyState(`${forged}.${sig}`, 1_000_001, SECRET)).toBeNull();
    expect(await verifyState(state, 1_000_001, 'a-different-secret-0123456789abc')).toBeNull();
    expect(await verifyState('not-a-state', 1_000_001, SECRET)).toBeNull();
    expect(await verifyState(`${body}.`, 1_000_001, SECRET)).toBeNull();
  });

  it('gives each state a different nonce', async () => {
    expect(await signState('u', 1, 1000, SECRET)).not.toBe(await signState('u', 1, 1000, SECRET));
  });
});
