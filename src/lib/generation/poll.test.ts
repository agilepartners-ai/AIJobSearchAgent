import { describe, expect, it } from 'vitest';
import { isConnectionLoss } from './pending';
import { pollFor } from './poll';

const fakeClock = () => {
  let t = 0;
  return { now: () => t, sleep: async (ms: number) => void (t += ms) };
};

describe('pollFor', () => {
  it('returns as soon as the thing appears', async () => {
    const clock = fakeClock();
    let calls = 0;
    const found = await pollFor(async () => (++calls === 3 ? 'resume' : null), { timeoutMs: 60_000, ...clock });
    expect(found).toBe('resume');
    expect(calls).toBe(3);
  });

  it('keeps looking after a failed look instead of treating it as "not there"', async () => {
    const clock = fakeClock();
    let calls = 0;
    const found = await pollFor(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('offline');
        return 'resume';
      },
      { timeoutMs: 60_000, ...clock },
    );
    expect(found).toBe('resume');
  });

  it('gives up at the deadline', async () => {
    const clock = fakeClock();
    let calls = 0;
    const found = await pollFor(async () => (calls += 1, null), { timeoutMs: 10_000, intervalMs: 3_000, ...clock });
    expect(found).toBeNull();
    expect(calls).toBe(4);
  });

  it('stops when told to', async () => {
    const clock = fakeClock();
    let stop = false;
    let calls = 0;
    const found = await pollFor(async () => (calls += 1, (stop = calls >= 2), null), { timeoutMs: 60_000, shouldStop: () => stop, ...clock });
    expect(found).toBeNull();
    expect(calls).toBe(2);
  });
});

describe('isConnectionLoss', () => {
  it('is true for a dropped or timed-out request, false for a real server answer', () => {
    expect(isConnectionLoss(0)).toBe(true); // network error / page reloaded mid-request
    expect(isConnectionLoss(504)).toBe(true); // client-side timeout
    expect(isConnectionLoss(401)).toBe(false);
    expect(isConnectionLoss(429)).toBe(false);
    expect(isConnectionLoss(502)).toBe(false);
  });
});
