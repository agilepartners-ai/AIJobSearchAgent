import { describe, expect, it } from 'vitest';
import { KeyPool, parseKeyList, withKey, type AttemptResult } from './keyPool';

const clock = () => {
  let t = 1_000_000;
  return { now: () => t, advance: (ms: number) => (t += ms) };
};

describe('parseKeyList', () => {
  it('splits on commas, spaces and newlines, and de-duplicates', () => {
    expect(parseKeyList('a1, b2\nc3;a1  d4')).toEqual(['a1', 'b2', 'c3', 'd4']);
  });
  it('ignores blanks, quotes and .env.example placeholders', () => {
    expect(parseKeyList('"real-key", your_key_here, , changeme')).toEqual(['real-key']);
    expect(parseKeyList(undefined)).toEqual([]);
  });
});

describe('KeyPool', () => {
  it('rotates through every key before reusing one', () => {
    const pool = new KeyPool('t', ['aaaa', 'bbbb', 'cccc', 'dddd']);
    const seen = new Set(Array.from({ length: 4 }, () => pool.acquire()!.id));
    expect(seen.size).toBe(4);
  });

  it('benches a rate-limited key and skips it', () => {
    const c = clock();
    const pool = new KeyPool('t', ['aaaa', 'bbbb'], c.now);
    const first = pool.acquire()!;
    pool.report(first, 'rate_limited');
    for (let i = 0; i < 6; i += 1) expect(pool.acquire()!.id).not.toBe(first.id);
    c.advance(31_000);
    const ids = new Set(Array.from({ length: 4 }, () => pool.acquire()!.id));
    expect(ids.has(first.id)).toBe(true);
  });

  it('honours Retry-After over its own backoff', () => {
    const c = clock();
    const pool = new KeyPool('t', ['aaaa'], c.now);
    pool.report(pool.acquire()!, 'rate_limited', 5_000);
    expect(pool.nextAvailableInMs()).toBe(5_000);
  });

  it('backs off exponentially on repeated rate limits and resets on success', () => {
    const c = clock();
    const pool = new KeyPool('t', ['aaaa'], c.now);
    const key = pool.acquire()!;
    pool.report(key, 'rate_limited');
    const first = pool.nextAvailableInMs();
    c.advance(first);
    pool.report(pool.acquire()!, 'rate_limited');
    expect(pool.nextAvailableInMs()).toBe(first * 2);
    c.advance(first * 2);
    pool.report(pool.acquire()!, 'ok');
    pool.report(pool.acquire()!, 'rate_limited');
    expect(pool.nextAvailableInMs()).toBe(first);
  });

  it('returns null when every key is benched, and never leaks a secret in its snapshot', () => {
    const pool = new KeyPool('t', ['secret-key-1234']);
    pool.report(pool.acquire()!, 'auth');
    expect(pool.acquire()).toBeNull();
    const snap = JSON.stringify(pool.snapshot());
    expect(snap).not.toContain('secret-key');
    expect(snap).toContain('1234');
  });
});

describe('withKey', () => {
  const noSleep = async () => undefined;

  it('fails over to the next key on a rate limit without waiting', async () => {
    const pool = new KeyPool('t', ['aaaa', 'bbbb']);
    const used: string[] = [];
    const value = await withKey(
      pool,
      async (key): Promise<AttemptResult<string>> => {
        used.push(key.id);
        return used.length === 1
          ? { ok: false, kind: 'rate_limited', error: new Error('429') }
          : { ok: true, value: 'done' };
      },
      { sleep: noSleep },
    );
    expect(value).toBe('done');
    expect(new Set(used).size).toBe(2);
  });

  it('stops immediately on a fatal error', async () => {
    const pool = new KeyPool('t', ['aaaa', 'bbbb']);
    let calls = 0;
    await expect(
      withKey(pool, async () => {
        calls += 1;
        return { ok: false, kind: 'fatal', error: new Error('bad request') };
      }),
    ).rejects.toThrow('bad request');
    expect(calls).toBe(1);
  });

  it('gives up with the last error when every key is exhausted and waiting is too long', async () => {
    const pool = new KeyPool('t', ['aaaa']);
    await expect(
      withKey(
        pool,
        async () => ({ ok: false, kind: 'rate_limited', error: new Error('quota') }),
        { sleep: noSleep, maxWaitMs: 1_000 },
      ),
    ).rejects.toThrow('quota');
  });
});
