/**
 * POST /api/documents/compile
 *
 * Recompiles edited LaTeX. This is what makes the source genuinely editable in
 * the app rather than only in Overleaf.
 *
 * Unlike /generate this does not consume daily quota — it is a render, not a
 * generation — but it is still authenticated so the compile key cannot be used
 * as a free public LaTeX service.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCompiler, LatexCompileError } from '../../../server/latex/compile';
import { verifyAccessToken, AuthConfigError } from '../../../server/auth/verify';
import { FirebaseConfigError } from '../../../server/firebase/admin';

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' }, responseLimit: false },
};

const MAX_TEX_CHARS = 200_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken, tex } = req.body ?? {};

  try {
    if (!idToken) throw new Error('unauthenticated');
    await verifyAccessToken(idToken);
  } catch (error) {
    if (error instanceof FirebaseConfigError || error instanceof AuthConfigError) {
      console.error('[documents/compile] Firebase misconfigured:', error.message);
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    return res.status(401).json({ error: 'You must be signed in.' });
  }

  if (typeof tex !== 'string' || !tex.trim()) {
    return res.status(400).json({ error: 'No LaTeX source provided.' });
  }
  if (tex.length > MAX_TEX_CHARS) {
    return res.status(413).json({ error: 'That document is too large to compile.' });
  }

  try {
    const { pdf } = await getCompiler().compile(tex);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdf.length);
    return res.status(200).send(pdf);
  } catch (error) {
    if (error instanceof LatexCompileError) {
      console.error('[documents/compile] Compile failed:', error.message, error.status);
      return res.status(422).json({
        error:
          'That LaTeX did not compile. Check for unbalanced braces or an unclosed environment.',
      });
    }
    console.error('[documents/compile] Unexpected error:', error);
    return res.status(500).json({ error: 'Something went wrong while compiling.' });
  }
}
