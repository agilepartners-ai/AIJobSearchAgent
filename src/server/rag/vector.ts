/**
 * Vector helpers, including int8 quantisation for storage.
 *
 * A 2048-dimension float vector is ~8 KB as JSON numbers; as int8 base64 it is
 * ~2.7 KB. Chunks are stored per account as jsonb rows in PostgreSQL, so the
 * 4x saving is the difference between "a few dozen chunks per document" and
 * "a few hundred". Int8 with a per-vector scale loses ~1% of cosine accuracy,
 * well under the noise in retrieval scores.
 */

export function norm(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i += 1) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

export function normalise(v: number[]): number[] {
  const n = norm(v);
  return n === 0 ? v.slice() : v.map((x) => x / n);
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface QuantisedVector {
  b64: string;
  scale: number;
}

export function quantise(v: number[]): QuantisedVector {
  let maxAbs = 0;
  for (const x of v) maxAbs = Math.max(maxAbs, Math.abs(x));
  const scale = maxAbs || 1;
  const bytes = new Int8Array(v.length);
  for (let i = 0; i < v.length; i += 1) bytes[i] = Math.round((v[i] / scale) * 127);
  return { b64: Buffer.from(bytes.buffer).toString('base64'), scale };
}

export function dequantise(b64: string, scale: number): number[] {
  const raw = Buffer.from(b64, 'base64');
  const bytes = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  const out = new Array<number>(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) out[i] = (bytes[i] * scale) / 127;
  return out;
}
