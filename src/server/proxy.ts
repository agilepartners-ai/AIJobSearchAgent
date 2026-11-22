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

/**
 * Database-backed routes, when the Worker has no working path to PostgreSQL.
 *
 * The Worker normally reaches the database through Hyperdrive. That needs the database port published to the internet
 * (closed since October 2026) or a Cloudflare Tunnel route with Access (not enabled on the account). Until one of those
 * exists, `API_VIA_VM=1` makes these routes forward to the same code on the VM, which sits next to the database on a
 * private network and is already reachable through the existing tunnel. The VM verifies the caller itself.
 * Remove the variable to go back to Hyperdrive; nothing else changes.
 */
export async function forwardDataIfWorkers(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  if (!isWorkers() || process.env.API_VIA_VM !== '1') return false;
  return forwardIfWorkers(req, res);
}

/**
 * Sign-in, sign-up, sessions and passwords run on the VM, next to the accounts in the database. On the Worker the auth route
 * only forwards. Unlike the data routes it must carry the cookie (the refresh token), the visitor's address (for rate limits,
 * vouched for by a shared secret the VM checks) and it must hand redirects and Set-Cookie back to the browser untouched.
 */
export async function forwardAuthIfWorkers(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  if (!isWorkers()) return false;
  const origin = process.env.GENERATE_ORIGIN?.replace(/\/+$/, '');
  const secret = process.env.EDGE_SHARED_SECRET;
  if (!origin || !secret) {
    console.error('[proxy] GENERATE_ORIGIN or EDGE_SHARED_SECRET is not set; sign-in is unavailable on this deployment');
    res.status(503).json({ error: 'Sign-in is not available right now. Please try again later.' });
    return true;
  }

  // Built from scratch, never copied: a visitor cannot smuggle the secret or the client-address header through.
  const headers: Record<string, string> = { 'x-ajsa-edge': secret };
  const pass = (name: string, as = name) => {
    const v = req.headers[name];
    if (typeof v === 'string') headers[as] = v;
  };
  for (const n of ['content-type', 'authorization', 'cookie', 'user-agent', 'origin', 'x-requested-with', 'x-request-id']) pass(n);
  pass('cf-connecting-ip', 'x-ajsa-client-ip');

  try {
    const upstream = await fetch(`${origin}${req.url ?? ''}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    res.status(upstream.status);
    for (const name of ['content-type', 'cache-control', 'location', 'allow', 'x-request-id']) {
      const v = upstream.headers.get(name);
      if (v) res.setHeader(name, v);
    }
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error('[proxy] auth upstream failed:', error instanceof Error ? error.message : error);
    res.status(502).json({ error: 'Sign-in is not reachable right now. Please try again in a moment.' });
  }
  return true;
}
