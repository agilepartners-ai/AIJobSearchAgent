import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'node:crypto';
import { isWorkers } from '../../../server/runtime';
import { gmailEnabled } from '../../../server/gmail/oauth';
import { dueConnections } from '../../../server/db/gmailRepo';
import { syncUser } from '../../../server/gmail/sync';

export const config = { api: { bodyParser: { sizeLimit: '2kb' }, responseLimit: false } };

const MAX_USERS_PER_RUN = 10;
const MIN_AGE_HOURS = 12;

/**
 * POST /api/gmail/sync-all: the daily timer. Runs only on the VM (Node) and is guarded by GMAIL_CRON_SECRET in `x-cron-secret`.
 * A bounded number of users per call keeps each run short; the next call picks up the rest.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (isWorkers()) return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.GMAIL_CRON_SECRET ?? '';
  const given = String(req.headers['x-cron-secret'] ?? '');
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });
  if (!gmailEnabled()) return res.status(503).json({ error: 'Gmail sync is off' });

  const users = await dueConnections(MIN_AGE_HOURS, MAX_USERS_PER_RUN);
  const results = { synced: 0, failed: 0 };
  for (const userId of users) {
    try {
      await syncUser(userId, { force: true });
      results.synced += 1;
    } catch (e) {
      results.failed += 1;
      console.error('[gmail-sync-all] user failed:', e instanceof Error ? e.message : e);
    }
  }
  return res.status(200).json({ ok: true, due: users.length, ...results });
}
