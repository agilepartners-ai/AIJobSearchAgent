import type { NextApiRequest, NextApiResponse } from 'next';
import { encryptToken, verifyState } from '../../../server/gmail/crypto';
import { exchangeCode, gmailEnabled, GoogleAuthError } from '../../../server/gmail/oauth';
import { saveConnection } from '../../../server/db/gmailRepo';

/**
 * GET /api/gmail/callback: Google sends the browser here after consent.
 * No bearer token travels on a redirect, so the signed `state` (made by /connect for one user, valid 10 minutes)
 * is the proof of who this is.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const back = (result: string, reason?: string) => {
    const q = new URLSearchParams({ gmail: result });
    if (reason) q.set('reason', reason);
    res.redirect(302, `/dashboard?${q.toString()}`);
  };
  try {
    if (!gmailEnabled()) return back('error', 'not_enabled');
    if (typeof req.query.error === 'string') return back('error', req.query.error === 'access_denied' ? 'denied' : 'google');
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? await verifyState(req.query.state) : null;
    if (!code || !state) return back('error', 'state');

    const result = await exchangeCode(code);
    await saveConnection(state.uid, result.googleEmail, result.scope, await encryptToken(result.refreshToken));
    return back('connected');
  } catch (e) {
    console.error('[gmail-callback] failed:', e instanceof Error ? e.message : e);
    return back('error', e instanceof GoogleAuthError ? 'grant' : 'server');
  }
}
