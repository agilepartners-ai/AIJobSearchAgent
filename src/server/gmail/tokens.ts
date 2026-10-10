/** Per-user forwarding address: `jobs+<token>@in.<domain>`. The token is the secret part. */
import { randomBytes } from 'node:crypto';

export const ADDRESS_LOCAL = 'jobs';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'; // base32, lower case: survives being retyped and lower-cased by mail systems

/** 26 characters, 130 bits. */
export function newToken(): string {
  return Array.from(randomBytes(26), (b) => ALPHABET[b % 32]).join('');
}

export function addressFor(token: string, domain: string): string {
  return `${ADDRESS_LOCAL}+${token}@${domain}`;
}

/** `jobs+TOKEN@in.example.com` (optionally with a display name and angle brackets) to the token, or null. */
export function tokenFromAddress(to: string): string | null {
  const m = to.trim().toLowerCase().match(/^(?:[^<]*<)?jobs\+([a-z2-7]{20,64})@[a-z0-9.-]+>?$/);
  return m ? m[1] : null;
}
