import type { NextApiRequest, NextApiResponse } from 'next';
import { handleInbound, MAX_RAW_BYTES, secretsMatch } from '../../../server/gmail/inbound';
import { inboundEnabled } from '../../../server/gmail/oauth';
import { tokenFromAddress } from '../../../server/gmail/tokens';
import { isWorkers } from '../../../server/runtime';

/** The body is the raw email, not JSON. */
export const config = { api: { bodyParser: false, responseLimit: false } };

async function readBody(req: NextApiRequest, limit: number): Promise<Uint8Array | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += b.length;
    if (size > limit) return null;
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}

/**
 * POST /api/inbound/email: called by the Cloudflare Email Worker with one raw email.
 * Runs only on the VM (Node). Authenticated by INBOUND_SECRET, never by a user token: the user is the address the mail was sent to.
 * Answers 200 for anything it understood (even a mail it ignored) so the Worker does not retry; 4xx for a bad caller.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (isWorkers()) return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!secretsMatch(String(req.headers['x-inbound-secret'] ?? ''), process.env.INBOUND_SECRET)) return res.status(401).json({ error: 'Unauthorized' });
  if (!inboundEnabled()) return res.status(503).json({ error: 'Forwarding is off' });

  const token = tokenFromAddress(String(req.headers['x-inbound-to'] ?? ''));
  if (!token) return res.status(200).json({ status: 'unknown_address' });
  const raw = await readBody(req, MAX_RAW_BYTES);
  if (!raw) return res.status(200).json({ status: 'too_large' });

  try {
    const result = await handleInbound(token, raw);
    return res.status(200).json(result);
  } catch (e) {
    console.error('[inbound] failed:', e instanceof Error ? e.message : e);
    return res.status(500).json({ status: 'error' });
  }
}
