import type { NextApiRequest, NextApiResponse } from 'next';
import { convertHtmlToDocxBuffer } from '../../services/htmlDocsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { html, filename } = req.body || {};
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing "html" field in request body' });
  }

  try {
    const buffer = await convertHtmlToDocxBuffer(html, { pageWidthPx: 1200 });
    const outName = (filename && typeof filename === 'string' ? filename : 'converted').replace(/[^a-z0-9_.-]/gi, '_') + '.docx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${outName}"`);
    res.setHeader('Content-Length', buffer.length.toString());

    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error('[convert-html-to-docx] error:', error);
    return res.status(500).json({ error: error?.message || 'Conversion failed' });
  }
}