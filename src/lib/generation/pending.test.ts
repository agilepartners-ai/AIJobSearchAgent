import { describe, expect, it } from 'vitest';
import { PAGE_OWNER, PENDING_TTL_MS, clearPending, isOrphaned, readPending, startPending, type PendingGeneration } from './pending';

const memory = () => {
  const data = new Map<string, string>();
  return {
    setItem: (k: string, v: string) => void data.set(k, v),
    getItem: (k: string) => data.get(k) ?? null,
    removeItem: (k: string) => void data.delete(k),
  };
};

describe('pending generation record', () => {
  const job = { requestId: 'req12345678', jobTitle: 'Engineer', company: 'Acme' };

  it('round-trips and clears', () => {
    const s = memory();
    expect(readPending(s)).toBeNull();
    startPending(job, s);
    expect(readPending(s)).toMatchObject({ requestId: 'req12345678', owner: PAGE_OWNER });
    clearPending(s);
    expect(readPending(s)).toBeNull();
  });

  it('is not orphaned on the page that started it (the live request is still in flight)', () => {
    const s = memory();
    startPending(job, s);
    expect(isOrphaned(readPending(s)!)).toBe(false);
  });

  it('is orphaned after a reload, but only while it is still recent', () => {
    const fromBeforeReload: PendingGeneration = { ...job, owner: 'previous-page-load', startedAt: 1_000_000, };
    expect(isOrphaned(fromBeforeReload, 1_000_000 + 30_000)).toBe(true);
    expect(isOrphaned(fromBeforeReload, 1_000_000 + PENDING_TTL_MS + 1)).toBe(false);
  });

  it('ignores corrupt data and unavailable storage', () => {
    expect(readPending({ getItem: () => '{not json' })).toBeNull();
    expect(readPending({ getItem: () => '{"a":1}' })).toBeNull();
    expect(() => startPending(job, null)).not.toThrow();
    expect(readPending(null)).toBeNull();
  });
});
