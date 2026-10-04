/**
 * GET /api/documents/file?p=…&u=…&e=…&s=…
 *
 * Serves a stored document to anyone holding an unexpired signed link made by
 * signLink() (see server/storage/documents.ts). No session is needed so it works
 * in an <iframe> or as a download link. Forging or editing a link invalidates it.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { readDocument, StorageConfigError, verifyLink } from '../../../server/storage/documents';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const check = verifyLink(req.query);
    if (!check.ok) {
      const status = check.reason === 'expired' ? 410 : 403;
      return res.status(status).json({ error: check.reason === 'expired' ? 'This link has expired.' : 'Invalid link.' });
    }

    const file = await readDocument(check.userId, check.path);
    if (!file) return res.status(404).json({ error: 'That document no longer exists.' });

    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Length', file.data.length);
    res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${file.filename.replace(/[^\w.-]/g, '_')}"`);
    // Regenerating overwrites in place, so a cached copy would show stale output.
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(req.method === 'HEAD' ? undefined : file.data);
  } catch (error) {
    if (error instanceof StorageConfigError) {
      console.error('[documents/file] Storage misconfigured:', error.message);
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    console.error('[documents/file] Failed:', error);
    return res.status(500).json({ error: 'Could not open that document.' });
  }
}
