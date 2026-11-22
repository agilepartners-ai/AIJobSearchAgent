import { getAccessToken } from '../auth/session';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** A valid access token, or null when signed out. */
export async function accessTokenOrNull(): Promise<string | null> {
  return getAccessToken();
}

export async function accessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new ApiError('You must be signed in.', 401);
  return token;
}

/** fetch() to our own /api routes, authenticated with the current session. One 401 triggers one token refresh and one retry. */
export async function authedFetch<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const send = async (token: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(url, { ...init, headers });
  };

  let res = await send(await accessToken());
  if (res.status === 401) {
    // The token may have expired between the check and the request, or the clock is off: renew once.
    const renewed = await getAccessToken(true);
    if (renewed) res = await send(renewed);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error || `Request failed (${res.status})`, res.status);
  return body as T;
}
