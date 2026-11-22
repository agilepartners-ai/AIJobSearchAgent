import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAuth } from '../../../server/auth/http';
import { forwardAuthIfWorkers } from '../../../server/proxy';

// Sign-in forms are tiny; anything bigger is not a form.
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

/**
 * All sign-in, sign-up, session and password endpoints. They run on the VM (next to the accounts in the database);
 * on the Cloudflare Worker this route only forwards, so passwords and signing keys never reach the edge.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await forwardAuthIfWorkers(req, res)) return;
  return handleAuth(req, res);
}
