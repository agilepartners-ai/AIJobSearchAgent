import type { NextApiRequest, NextApiResponse } from 'next';
import { cleanItem, syncApplications, userForBearer } from '../../../server/db/jobwingRepo';
import { forwardDataIfWorkers } from '../../../server/proxy';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

/**
 * Called by the JobWing app with the user's access token (signed in to the same account as the website), or by the plugin
 * with the older link code.
 * GET  → 200 when the code is valid (used to confirm the link)
 * POST → { applications: [...] } upserts them and returns { upserted, changes } with statuses the user moved further here
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (await forwardDataIfWorkers(req, res)) return;
  try {
    const header = req.headers.authorization;
    const code = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : undefined;
    const userId = await userForBearer(code);
    if (!userId) return res.status(401).json({ error: 'Sign in again, or use a valid JobWing link code.' });
    if (req.method === 'GET') return res.status(200).json({ ok: true });

    const list = (req.body as { applications?: unknown } | undefined)?.applications;
    if (!Array.isArray(list)) return res.status(400).json({ error: 'Expected { applications: [...] }.' });
    if (list.length > 500) return res.status(400).json({ error: 'At most 500 applications per request.' });
    const items = list.map(cleanItem).filter((i): i is NonNullable<typeof i> => !!i);
    return res.status(200).json(await syncApplications(userId, items));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Daily sync limit reached.') return res.status(429).json({ error: message });
    console.error('[jobwing-sync] failed:', message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
