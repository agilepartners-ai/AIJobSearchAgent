import type { NextApiRequest, NextApiResponse } from 'next';
import { AuthConfigError, requireUser, UnauthenticatedError } from '../../server/auth/verify';
import { getOrCreateProfile, updateProfile } from '../../server/db/profilesRepo';

/**
 * GET  /api/profile?name=…  → the caller's profile, created on first call
 * PUT  /api/profile {…}     → merge changes into it
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const caller = await requireUser(req);

    if (req.method === 'GET') {
      const name = typeof req.query.name === 'string' ? req.query.name : '';
      return res.status(200).json(await getOrCreateProfile(caller.userId, caller.email, name));
    }
    if (req.method === 'PUT') {
      const patch = req.body;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return res.status(400).json({ error: 'Expected a JSON object.' });
      }
      return res.status(200).json(await updateProfile(caller.userId, patch));
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return res.status(401).json({ error: error.message });
    if (error instanceof AuthConfigError) {
      console.error('[profile] auth misconfigured:', error.message);
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    console.error('[profile] failed:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not load your profile.' });
  }
}
