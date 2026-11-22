/**
 * Password hashing with scrypt (Node's built-in, memory-hard, nothing native to install). Runs only on the VM.
 * Format: scrypt$N$r$p$salt$hash (base64). The parameters are stored with each hash, so they can be raised later and old
 * hashes still verify; `needsRehash` tells sign-in to upgrade them on the next correct password.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// OWASP's scrypt guidance: N=2^15, r=8, p=3 (32 MiB per hash). The VM's container has a small memory limit, so the number of
// hashes running at once is capped as well.
const N = 2 ** 15;
const R = 8;
const P = 3;
const KEYLEN = 64;

let running = 0;
const waiting: (() => void)[] = [];
const MAX_PARALLEL = 2;

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await fn();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

function derive(password: string, salt: Buffer, n: number, r: number, p: number, keylen: number): Promise<Buffer> {
  return slot(
    () =>
      new Promise<Buffer>((resolve, reject) => {
        scrypt(password.normalize('NFKC'), salt, keylen, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) => (err ? reject(err) : resolve(key)));
      }),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEYLEN);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

function parse(stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return null;
  const params = { n: Number(n), r: Number(r), p: Number(p) };
  if (![params.n, params.r, params.p].every((v) => Number.isInteger(v) && v > 0) || params.n > 2 ** 20) return null;
  return { ...params, salt: Buffer.from(salt, 'base64'), hash: Buffer.from(hash, 'base64') };
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const h = parse(stored);
  if (!h) return false;
  const key = await derive(password, h.salt, h.n, h.r, h.p, h.hash.length);
  return key.length === h.hash.length && timingSafeEqual(key, h.hash);
}

export function needsRehash(stored: string): boolean {
  const h = parse(stored);
  return !h || h.n < N || h.r < R || h.p < P;
}

let dummy: Promise<string> | null = null;

/** Spend the same time as a real check when the account does not exist, so response time does not reveal which emails have accounts. */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummy ??= hashPassword('not-a-real-password');
  await verifyPassword(password, await dummy);
}

const COMMON = new Set(
  (
    '12345678 123456789 1234567890 11111111 00000000 password password1 password12 password123 passw0rd p@ssw0rd p@ssword qwertyui qwerty123 qwertyuiop ' +
    'iloveyou1 iloveyou12 letmein1 welcome1 welcome123 admin123 administrator abc12345 abcd1234 abcdefgh monkey123 dragon123 football1 baseball1 ' +
    'sunshine1 princess1 superman1 trustno1 master123 shadow123 michael1 jordan23 whatever1 changeme changeme1 zaq12wsx 1q2w3e4r 1qaz2wsx ' +
    'india123 india@123 delhi123 mumbai123 test1234 testtest guest123 default1 hello123 hello1234 login123 user1234 passcode secret123 asdfghjk asdf1234 qazwsxedc'
  ).split(' '),
);

/** The reason a password is not acceptable, or null when it is. Length matters more than symbols (NIST 800-63B). */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (Buffer.byteLength(password) > 256) return 'That password is too long (at most 128 characters).';
  if (password.length > 128) return 'That password is too long (at most 128 characters).';
  if (/^(.)\1+$/.test(password)) return 'Choose a password that is not one repeated character.';
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return 'That password is too common. Choose a different one.';
  const local = email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && (lower === local || lower === email?.toLowerCase())) return 'The password should not be your email address.';
  return null;
}
