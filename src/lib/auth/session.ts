/**
 * The browser's sign-in state. The access token (15 minutes) lives only in memory: nothing sign-in related is written to
 * localStorage or sessionStorage, so a script injected into the page cannot read a long-lived credential. What survives a
 * reload is the refresh token, in an HttpOnly cookie the page cannot read at all; on load we trade it for a new access token.
 *
 * A network failure is not a sign-out: only the server saying "no session" (401) signs the user out here.
 */
import type { AuthUser } from '../../services/authService';

type Listener = (user: AuthUser | null) => void;

interface SessionBody {
  accessToken: string;
  expiresAt: number;
  user: AuthUser;
}

let token: { value: string; exp: number } | null = null;
let user: AuthUser | null = null;
let booted = false;
let inflight: Promise<boolean> | null = null;
const listeners = new Set<Listener>();

const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ajsa-auth') : null;

const now = () => Math.floor(Date.now() / 1000);
const emit = () => listeners.forEach((l) => l(user));

export function setSession(s: SessionBody, announce = true): void {
  token = { value: s.accessToken, exp: s.expiresAt };
  user = s.user;
  booted = true;
  emit();
  if (announce) channel?.postMessage('signin');
}

export function clearSession(announce = true): void {
  const had = token !== null || user !== null;
  token = null;
  user = null;
  booted = true;
  if (had || announce) emit();
  if (announce) channel?.postMessage('signout');
}

export function currentUser(): AuthUser | null {
  return user;
}

export function setUser(u: AuthUser): void {
  user = u;
  emit();
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Trade the refresh cookie for a new access token. Resolves false when there is no session; throws when the server cannot be reached. */
export function refreshSession(): Promise<boolean> {
  inflight ??= (async () => {
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'ajsa' } });
        if (res.ok) {
          setSession((await res.json()) as SessionBody, false);
          return true;
        }
        // Two tabs refreshed at once: the other tab's new cookie is already in the browser, so ask again.
        if (res.status === 409 && attempt === 0) {
          await wait(250);
          continue;
        }
        if (res.status === 401) {
          clearSession(false);
          return false;
        }
        throw new Error(`refresh failed (${res.status})`);
      }
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** The signed-in user, restoring the session from the cookie on first call. */
export async function getUser(): Promise<AuthUser | null> {
  if (!booted) {
    try {
      await refreshSession();
    } catch {
      // Offline or the server is restarting: show as signed out for now, but keep whatever the cookie holds.
      booted = true;
    }
  }
  return user;
}

/** A valid access token, refreshed when it is about to expire. Null when signed out. */
export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && token && token.exp - now() > 30) return token.value;
  try {
    await refreshSession();
  } catch {
    // Server unreachable: an unexpired token can still be tried.
    if (token && token.exp > now()) return token.value;
    throw new Error('Network error. Check your connection and try again.');
  }
  return token?.value ?? null;
}

/** Called once when the first state is known, then on every sign-in, sign-out and token owner change. */
export function onSessionChange(cb: Listener): () => void {
  listeners.add(cb);
  let live = true;
  void getUser().then((u) => live && booted && cb(u));
  return () => {
    live = false;
    listeners.delete(cb);
  };
}

if (typeof window !== 'undefined') {
  channel?.addEventListener('message', (e) => {
    if (e.data === 'signout') clearSession(false);
    else if (e.data === 'signin') void refreshSession().catch(() => undefined);
  });
  // Coming back to a tab that slept: renew now, not on the next failed request.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && token && token.exp - now() < 120) void refreshSession().catch(() => undefined);
  });
}
