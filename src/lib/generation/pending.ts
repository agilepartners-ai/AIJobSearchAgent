/**
 * A record of a generation that is in flight, kept in sessionStorage.
 *
 * A generation takes 10-30 s. If the page reloads during that time (a dev
 * hot-reload, a refresh, a crashed tab) the in-memory state is gone, but the
 * server carries on and finishes: the résumé is saved and the quota is spent.
 * Without this record the user is left on a fresh form with nothing to show
 * for it and creates the résumé again.
 *
 * With it, the dashboard notices on load that a generation was orphaned by a
 * reload and waits for its résumé (matched by request id) to appear.
 */

export interface PendingGeneration {
  requestId: string;
  startedAt: number;
  /** Which page load started it; a different value on read means it was orphaned. */
  owner: string;
  jobTitle: string;
  company: string;
}

const KEY = 'jsa.pendingGeneration';
/** How long after starting a generation is still worth waiting for. */
export const PENDING_TTL_MS = 4 * 60_000;

/** New on every page load, so a record from before a reload is recognisably foreign. */
export const PAGE_OWNER = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const store = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null; // blocked storage: recovery is simply unavailable
  }
};

export function startPending(p: Omit<PendingGeneration, 'owner' | 'startedAt'>, storage: Pick<Storage, 'setItem'> | null = store()): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ ...p, owner: PAGE_OWNER, startedAt: Date.now() } satisfies PendingGeneration));
  } catch {
    /* recovery is best effort */
  }
}

export function readPending(storage: Pick<Storage, 'getItem'> | null = store()): PendingGeneration | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingGeneration;
    return p && typeof p.requestId === 'string' && typeof p.startedAt === 'number' ? p : null;
  } catch {
    return null;
  }
}

export function clearPending(storage: Pick<Storage, 'removeItem'> | null = store()): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The request never got an answer (network error, page reloaded mid-request) or
 * the browser gave up waiting. Different from the server saying "no": in these
 * cases the server may well still finish, so the pending record must be kept.
 */
export const isConnectionLoss = (status: number): boolean => status === 0 || status === 504;

/** Started by an earlier page load and still recent enough to be worth waiting for. */
export function isOrphaned(p: PendingGeneration, now = Date.now()): boolean {
  return p.owner !== PAGE_OWNER && now - p.startedAt < PENDING_TTL_MS;
}
