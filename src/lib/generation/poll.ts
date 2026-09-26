/**
 * Poll until something exists, or give up.
 *
 * Used to wait for a résumé the server is still finishing after the browser
 * lost its connection (a dropped request, a dev hot-reload, a slow network).
 * The server does not stop when the browser stops listening: the résumé gets
 * saved either way, so the right move is to go and look for it.
 */

export interface PollOptions {
  timeoutMs: number;
  intervalMs?: number;
  /** Stop early, e.g. when the component unmounts. */
  shouldStop?: () => boolean;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function pollFor<T>(find: () => Promise<T | null>, options: PollOptions): Promise<T | null> {
  const { timeoutMs, intervalMs = 3_000, shouldStop, sleep = realSleep, now = Date.now } = options;
  const started = now();
  while (now() - started < timeoutMs) {
    if (shouldStop?.()) return null;
    try {
      const found = await find();
      if (found) return found;
    } catch {
      // A failed look is not "not there"; try again until the deadline.
    }
    await sleep(intervalMs);
  }
  return null;
}
