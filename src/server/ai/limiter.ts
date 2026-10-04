/**
 * Concurrency control for generations.
 *
 * Two limits protect a shared pool of API keys when many people use the app:
 *
 *  - one generation in flight per user, so a double-click (or a script) cannot
 *    fan out into several paid calls; and
 *  - a cap on generations running at once across the server. Requests over the
 *    cap wait in a short queue, and give up with a clear "busy" message rather
 *    than piling onto keys that are already rate-limited.
 *
 * State is per server instance. That is enough to bound each instance's load
 * on the key pool; the per-user daily quota in db/usage.ts is the
 * cross-instance, durable limit.
 */

export class BusyError extends Error {
  constructor(message: string, readonly scope: 'user' | 'server') {
    super(message);
    this.name = 'BusyError';
  }
}

const inFlight = new Set<string>();
let active = 0;
const waiting: (() => void)[] = [];

const maxConcurrent = (): number => {
  const n = Number(process.env.GEN_MAX_CONCURRENCY);
  return Number.isFinite(n) && n > 0 ? n : 6;
};

const maxQueueWaitMs = (): number => {
  const n = Number(process.env.GEN_QUEUE_WAIT_MS);
  return Number.isFinite(n) && n >= 0 ? n : 25_000;
};

/** Resolves with a `release` function; call it exactly once when the work ends. */
export async function acquireGenerationSlot(userId: string): Promise<() => void> {
  if (inFlight.has(userId)) {
    throw new BusyError('A generation is already running for your account. Please wait for it to finish.', 'user');
  }
  inFlight.add(userId);

  try {
    if (active >= maxConcurrent()) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          const i = waiting.indexOf(wake);
          if (i >= 0) waiting.splice(i, 1);
          reject(new BusyError('We are generating a lot of documents right now. Please try again in a moment.', 'server'));
        }, maxQueueWaitMs());
        const wake = () => {
          clearTimeout(timer);
          resolve();
        };
        waiting.push(wake);
      });
    }
  } catch (error) {
    inFlight.delete(userId);
    throw error;
  }

  active += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active -= 1;
    inFlight.delete(userId);
    waiting.shift()?.();
  };
}

/** For tests and diagnostics. */
export function limiterState(): { active: number; waiting: number; users: number } {
  return { active, waiting: waiting.length, users: inFlight.size };
}
