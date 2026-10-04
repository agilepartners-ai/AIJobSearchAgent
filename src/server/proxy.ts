import type { NextApiRequest, NextApiResponse } from 'next';
import { isWorkers } from './runtime';

/**
 * Résumé generation and LaTeX compilation do not run on Cloudflare Workers.
 *
 * On the free plan a Worker may use 10 ms of CPU per request. Generation needs ~4 ms of pure compute before
 * framework overhead and cold starts, and a Worker killed mid-request cannot refund the user's daily quota.
 * (Time spent waiting on Gemini, NVIDIA or Texapi is not CPU, so the 15-60 s wait itself would be fine.)
 * The route also reads LaTeX templates from disk, which needs real Node.
 *
 * So on Workers these two routes forward the request, with the user's own token, to the same code running on
 * the VM behind a Cloudflare Tunnel. The VM verifies the token itself; the Worker adds no trust.
 * On Node (local dev, the VM) this function does nothing and the route runs in place.
 */
export async function forwardIfWorkers(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  if (!isWorkers()) return false;

  const origin = process.env.GENERATE_ORIGIN?.replace(/\/+$/, '');
  if (!origin) {
    // Refuse rather than silently run an expensive route inside the CPU limit.
    console.error('[proxy] GENERATE_ORIGIN is not set; generation is unavailable on this deployment');
    res.status(503).json({ error: 'Document generation is not available right now. Please try again later.' });
    return true;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  for (const name of ['authorization', 'x-request-id']) {
    const value = req.headers[name];
    if (typeof value === 'string') headers[name] = value;
  }

  try {
    const upstream = await fetch(`${origin}${req.url ?? ''}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
      // The wait for the model is long but bounded.
      signal: AbortSignal.timeout(150_000),
    });

    res.status(upstream.status);
    for (const name of ['content-type', 'x-request-id', 'content-disposition']) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error('[proxy] upstream failed:', error instanceof Error ? error.message : error);
    res.status(502).json({ error: 'The document service did not respond. Please try again.' });
  }
  return true;
}
