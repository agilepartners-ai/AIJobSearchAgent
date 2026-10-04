import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../server/db/pool';
import { isWorkers } from '../../server/runtime';

/**
 * GET /api/health         → { ok, runtime }: the app is up (no database touched; safe to poll often)
 * GET /api/health?db=1    → also runs SELECT 1, which proves the database path (Hyperdrive on Workers)
 *
 * Reveals nothing but ok/not ok and which runtime answered.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const runtime = isWorkers() ? 'workers' : 'node';
  if (req.query.db !== '1') return res.status(200).json({ ok: true, runtime });
  try {
    await query('SELECT 1');
    return res.status(200).json({ ok: true, runtime, db: true });
  } catch (error) {
    console.error('[health] database check failed:', error instanceof Error ? error.message : error);
    return res.status(503).json({ ok: false, runtime, db: false });
  }
}
