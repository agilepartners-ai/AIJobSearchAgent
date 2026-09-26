/** Short, URL-safe random ids. Collision-resistant enough for per-document keys. */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function newId(size = 12): string {
  const bytes = new Uint8Array(size);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < size; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
