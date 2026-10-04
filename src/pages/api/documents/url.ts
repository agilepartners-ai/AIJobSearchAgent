/**
 * POST /api/documents/url
 *
 * Mints a fresh signed link for a stored document the caller owns.
 *
 * Signed links expire (6.5 days), so the URLs written onto a job application go
 * stale. The path does not, and this endpoint turns it back into a working link.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireUser, AuthConfigError } from '../../../server/auth/verify';
import { objectExists, signLink, StorageConfigError } from '../../../server/storage/documents';

const ALLOWED_PREFIXES = ['ApplicationDocuments/', 'UserDocuments/'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path } = req.body ?? {};

  let userId: string;
  try {
    userId = (await requireUser(req)).userId;
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error('[documents/url] Auth misconfigured:', error.message);
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    return res.status(401).json({ error: 'You must be signed in.' });
  }

  if (typeof path !== 'string' || !path || path.length > 300) {
    return res.status(400).json({ error: 'No document path provided.' });
  }
  if (path.includes('..') || !ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return res.status(400).json({ error: 'Invalid document path.' });
  }

  try {
    // Ownership is part of the lookup: another user's path simply does not exist for this caller.
    if (!(await objectExists(userId, path))) {
      return res.status(404).json({ error: 'That document no longer exists.' });
    }
    return res.status(200).json({ url: signLink(userId, path) });
  } catch (error) {
    if (error instanceof StorageConfigError) {
      console.error('[documents/url] Storage misconfigured:', error.message);
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    console.error('[documents/url] Failed to sign link:', error);
    return res.status(500).json({ error: 'Could not open that document.' });
  }
}
