/**
 * A pool of API keys for one provider.
 *
 * With several users generating at once, a single key hits its per-minute quota
 * and everyone sees errors. The pool spreads calls round-robin across every
 * configured key, benches a key that is rate-limited or rejected for a
 * cool-down, and fails a request over to the next key immediately instead of
 * sleeping and retrying the same one.
 *
 * Keys come from the environment only, as a comma/space/newline separated list:
 *
 *   GEMINI_API_KEYS=key1,key2,key3,key4      (falls back to GEMINI_API_KEY)
 *   NVIDIA_API_KEYS=key1,key2,...            (falls back to NVIDIA_API_KEY)
 *
 * State is per server instance. On a serverless platform each instance keeps
 * its own view of which keys are cooling down, which is fine: a rate-limit
 * answer is discovered once per instance and the random starting offset keeps
 * instances from all hitting the same key first.
 *
 * Secrets never leave this module: logs and diagnostics use `id`, which is the
 * key's position and its last four characters.
 */

export type Provider = 'gemini' | 'nvidia';

export interface PooledKey {
  /** Safe to log: "#2…a1b2". */
  id: string;
  secret: string;
}

export type KeyOutcome = 'ok' | 'rate_limited' | 'auth' | 'server';

interface KeyState {
  key: PooledKey;
  /** Epoch ms before which this key must not be used. */
  benchedUntil: number;
  /** Consecutive failures, for exponential cool-down. */
  failures: number;
  uses: number;
}

const RATE_LIMIT_BASE_MS = 30_000;
const RATE_LIMIT_MAX_MS = 10 * 60_000;
/** A rejected credential will not fix itself in seconds; do not hammer it. */
const AUTH_COOLDOWN_MS = 15 * 60_000;
const SERVER_COOLDOWN_MS = 3_000;

/** Split an env value into distinct, plausible keys. */
export function parseKeyList(value: string | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(/[\s,;]+/)) {
    const key = part.trim().replace(/^["']|["']$/g, '');
    // Skip blanks and the obvious placeholders from .env.example.
    if (!key || /^(your[_-]|changeme|xxx|<)/i.test(key)) continue;
    seen.add(key);
  }
  return Array.from(seen);
}

export class KeyPool {
  private readonly states: KeyState[];
  private cursor: number;

  constructor(
    readonly provider: string,
    secrets: string[],
    private readonly now: () => number = Date.now,
  ) {
    this.states = secrets.map((secret, i) => ({
      key: { id: `#${i + 1}…${secret.slice(-4)}`, secret },
      benchedUntil: 0,
      failures: 0,
      uses: 0,
    }));
    // Random start so several instances do not all begin on key #1.
    this.cursor = this.states.length ? Math.floor(Math.random() * this.states.length) : 0;
  }

  get size(): number {
    return this.states.length;
  }

  /** Next usable key in round-robin order, or null when every key is benched. */
  acquire(): PooledKey | null {
    const t = this.now();
    for (let i = 0; i < this.states.length; i += 1) {
      const index = (this.cursor + i) % this.states.length;
      const state = this.states[index];
      if (state.benchedUntil <= t) {
        this.cursor = (index + 1) % this.states.length;
        state.uses += 1;
        return state.key;
      }
    }
    return null;
  }

  /** Milliseconds until some key is usable again (0 if one is usable now). */
  nextAvailableInMs(): number {
    if (!this.states.length) return Infinity;
    const t = this.now();
    return Math.max(0, Math.min(...this.states.map((s) => s.benchedUntil)) - t);
  }

  report(key: PooledKey, outcome: KeyOutcome, retryAfterMs?: number): void {
    const state = this.states.find((s) => s.key.id === key.id);
    if (!state) return;
    const t = this.now();

    if (outcome === 'ok') {
      state.failures = 0;
      return;
    }

    state.failures += 1;
    if (outcome === 'rate_limited') {
      const backoff = Math.min(RATE_LIMIT_BASE_MS * 2 ** (state.failures - 1), RATE_LIMIT_MAX_MS);
      // The server's own Retry-After wins when it gave one.
      state.benchedUntil = t + (retryAfterMs && retryAfterMs > 0 ? retryAfterMs : backoff);
    } else if (outcome === 'auth') {
      state.benchedUntil = t + AUTH_COOLDOWN_MS;
    } else {
      state.benchedUntil = t + SERVER_COOLDOWN_MS;
    }
  }

  /** Health for diagnostics and logs. Contains no secrets. */
  snapshot(): { id: string; available: boolean; uses: number; failures: number; benchedForMs: number }[] {
    const t = this.now();
    return this.states.map((s) => ({
      id: s.key.id,
      available: s.benchedUntil <= t,
      uses: s.uses,
      failures: s.failures,
      benchedForMs: Math.max(0, s.benchedUntil - t),
    }));
  }
}

// ---------------------------------------------------------------------------
// One pool per provider, rebuilt if the environment changes (tests do this).
// ---------------------------------------------------------------------------

const ENV_NAMES: Record<Provider, [list: string, single: string]> = {
  gemini: ['GEMINI_API_KEYS', 'GEMINI_API_KEY'],
  nvidia: ['NVIDIA_API_KEYS', 'NVIDIA_API_KEY'],
};

const pools = new Map<Provider, { signature: string; pool: KeyPool }>();

export function keysFromEnv(provider: Provider): string[] {
  const [list, single] = ENV_NAMES[provider];
  return parseKeyList(`${process.env[list] ?? ''},${process.env[single] ?? ''}`);
}

export function getKeyPool(provider: Provider): KeyPool {
  const keys = keysFromEnv(provider);
  const signature = keys.join('|');
  const existing = pools.get(provider);
  if (existing && existing.signature === signature) return existing.pool;
  const pool = new KeyPool(provider, keys);
  pools.set(provider, { signature, pool });
  return pool;
}

/** For tests. */
export function resetKeyPools(): void {
  pools.clear();
}

// ---------------------------------------------------------------------------
// Running a request against the pool
// ---------------------------------------------------------------------------

export type AttemptResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      /** rate_limited/auth/server are worth trying another key for; fatal is not. */
      kind: KeyOutcome | 'fatal';
      error: Error;
      retryAfterMs?: number;
    };

export interface WithKeyOptions {
  /** Upper bound on total attempts across all keys. */
  maxAttempts?: number;
  /** Longest a request will wait for a benched key to come back. */
  maxWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run `attempt` with a key from the pool, moving to the next key on a
 * rate-limit or credential failure and backing off on server errors.
 * Throws the last error once attempts or the wait budget run out.
 */
export async function withKey<T>(
  pool: KeyPool,
  attempt: (key: PooledKey) => Promise<AttemptResult<T>>,
  options: WithKeyOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? pool.size * 2 + 4;
  const maxWaitMs = options.maxWaitMs ?? 20_000;
  const sleep = options.sleep ?? defaultSleep;
  let lastError: Error | null = null;
  let serverFailures = 0;

  for (let n = 0; n < maxAttempts; n += 1) {
    const key = pool.acquire();

    if (!key) {
      const wait = pool.nextAvailableInMs();
      if (wait > maxWaitMs) {
        throw lastError ?? new Error(`All ${pool.provider} API keys are busy. Try again shortly.`);
      }
      await sleep(wait + Math.random() * 250);
      continue;
    }

    const result = await attempt(key);
    if (result.ok) {
      pool.report(key, 'ok');
      return result.value;
    }

    lastError = result.error;
    if (result.kind === 'fatal') throw result.error;

    pool.report(key, result.kind, result.retryAfterMs);

    if (result.kind === 'server') {
      // Not the key's fault: back off a little, jittered, then go again.
      serverFailures += 1;
      await sleep(Math.min(1_000 * 2 ** (serverFailures - 1), 8_000) + Math.random() * 500);
    }
    // rate_limited / auth: the key is now benched, so the next acquire() moves on.
  }

  throw lastError ?? new Error(`Could not complete the ${pool.provider} request.`);
}
