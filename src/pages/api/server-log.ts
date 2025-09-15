export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  let payload = req.body;
  // Some clients may send text; try to parse if necessary
  if (!payload || typeof payload === 'string') {
    try {
      const text = typeof payload === 'string' ? payload : await req.text().catch(() => '');
      payload = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error('[server-log] Failed to parse request body as JSON', err);
      // fall through with raw body
    }
  }

  try {
    console.log('[server-log] -----------------------------');
    console.log('[server-log] timestamp:', new Date().toISOString());
    console.log('[server-log] payload:', JSON.stringify(payload, null, 2));
    console.log('[server-log] -----------------------------');
  } catch (err) {
    console.error('[server-log] Error logging payload:', err);
  }

  return res.status(200).json({ ok: true });
}