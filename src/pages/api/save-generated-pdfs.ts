import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

/**
 * Removed API endpoint.
 *
 * This file has been intentionally replaced with a stub that returns 410 Gone.
 * The original functionality (file uploads / processing) was removed per request.
 */

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Called deprecated endpoint /api/save-generated-pdfs — returning 410 Gone');
  res.status(410).json({ message: 'The /api/save-generated-pdfs endpoint has been removed.' });
}