import { authedFetch } from '../lib/api/authedFetch';

/**
 * Stored documents are served from /api/documents/file through signed links that
 * expire. A saved link can therefore go stale; its `p` parameter is the
 * permanent path, and /api/documents/url turns that back into a fresh link.
 */
const parse = (url: string): URL | null => {
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  } catch {
    return null;
  }
};

export const DocumentLinks = {
  /** True when the link has expired or will within `bufferMinutes`. Unknown shapes are treated as valid. */
  isExpired(url: string, bufferMinutes = 60): boolean {
    const u = url ? parse(url) : null;
    if (!u) return true;
    const expires = Number(u.searchParams.get('e'));
    return Number.isFinite(expires) && expires > 0 ? Date.now() >= expires - bufferMinutes * 60_000 : false;
  },

  pathOf(url: string): string | null {
    return parse(url)?.searchParams.get('p') ?? null;
  },

  /** A working link: the same one if it is still good, otherwise a fresh one for the same document. */
  async refreshUrlIfExpired(url: string): Promise<string> {
    if (!this.isExpired(url)) return url;
    const path = this.pathOf(url);
    if (!path) return url;
    const { url: fresh } = await authedFetch<{ url: string }>('/api/documents/url', { method: 'POST', body: JSON.stringify({ path }) });
    return fresh;
  },
};
