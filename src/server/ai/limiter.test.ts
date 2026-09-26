import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { estimateCostUsd } from './usageLedger';
import { acquireGenerationSlot, BusyError, limiterState } from './limiter';

describe('acquireGenerationSlot', () => {
  beforeEach(() => {
    vi.stubEnv('GEN_MAX_CONCURRENCY', '2');
    vi.stubEnv('GEN_QUEUE_WAIT_MS', '60');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('lets a user run one generation at a time', async () => {
    const release = await acquireGenerationSlot('alice');
    await expect(acquireGenerationSlot('alice')).rejects.toMatchObject({ scope: 'user' });
    release();
    const again = await acquireGenerationSlot('alice');
    again();
  });

  it('queues past the server cap and starts the waiter when a slot frees', async () => {
    const a = await acquireGenerationSlot('u1');
    const b = await acquireGenerationSlot('u2');
    let started = false;
    const third = acquireGenerationSlot('u3').then((release) => {
      started = true;
      return release;
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(started).toBe(false);
    a();
    const release3 = await third;
    expect(started).toBe(true);
    b();
    release3();
    expect(limiterState()).toEqual({ active: 0, waiting: 0, users: 0 });
  });

  it('gives up with a clear message when the queue never clears, and frees the user', async () => {
    const a = await acquireGenerationSlot('u1');
    const b = await acquireGenerationSlot('u2');
    await expect(acquireGenerationSlot('u3')).rejects.toBeInstanceOf(BusyError);
    // u3 must not be stuck as "already running" after being turned away.
    a();
    const retry = await acquireGenerationSlot('u3');
    retry();
    b();
  });

  it('release is safe to call twice', async () => {
    const release = await acquireGenerationSlot('solo');
    release();
    release();
    expect(limiterState().active).toBe(0);
  });
});

describe('estimateCostUsd', () => {
  afterEach(() => vi.unstubAllEnvs());
  const usage = { promptTokens: 4_000, outputTokens: 3_000, cachedTokens: 1_000 };

  it('is null until prices are configured, rather than guessing', () => {
    vi.stubEnv('GEMINI_PRICE_INPUT_PER_M', '');
    vi.stubEnv('GEMINI_PRICE_OUTPUT_PER_M', '');
    expect(estimateCostUsd(usage)).toBeNull();
  });

  it('prices uncached, cached and output tokens separately', () => {
    vi.stubEnv('GEMINI_PRICE_INPUT_PER_M', '0.10');
    vi.stubEnv('GEMINI_PRICE_OUTPUT_PER_M', '0.40');
    vi.stubEnv('GEMINI_PRICE_CACHED_PER_M', '0.01');
    // 3000*0.10 + 1000*0.01 + 3000*0.40 = 300 + 10 + 1200 = 1510 => $0.001510
    expect(estimateCostUsd(usage)).toBeCloseTo(0.00151, 8);
  });

  it('bills cached tokens at the input rate when no cache price is set (safe overestimate)', () => {
    vi.stubEnv('GEMINI_PRICE_INPUT_PER_M', '0.10');
    vi.stubEnv('GEMINI_PRICE_OUTPUT_PER_M', '0.40');
    vi.stubEnv('GEMINI_PRICE_CACHED_PER_M', '');
    expect(estimateCostUsd(usage)).toBeCloseTo((4_000 * 0.1 + 3_000 * 0.4) / 1_000_000, 8);
  });
});
