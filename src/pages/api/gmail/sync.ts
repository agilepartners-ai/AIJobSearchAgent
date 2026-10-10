import type { NextApiRequest, NextApiResponse } from 'next';
import { route } from '../../../server/api';
import { forwardIfWorkers } from '../../../server/proxy';
import { gmailGuard, requireEnabled } from '../../../server/gmail/http';
import { syncUser } from '../../../server/gmail/sync';

export const config = { api: { bodyParser: { sizeLimit: '10kb' }, responseLimit: false } };

const run = route('gmail-sync', {
  POST: ({ userId }) =>
    gmailGuard(async () => {
      requireEnabled();
      return { ok: true, summary: await syncUser(userId) };
    }),
});

/**
 * POST /api/gmail/sync: read new Updates mail and update the board.
 * Long (Gmail and model waits) and a poor fit for a Worker's CPU limit, so on Workers it is forwarded to the VM, like generation.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (await forwardIfWorkers(req, res)) return;
  return run(req, res);
}
