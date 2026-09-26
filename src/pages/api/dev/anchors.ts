/**
 * Development-only sink for the parity harness: the browser POSTs the anchors
 * it measured on /dev/resume-preview and they land in the OS temp directory,
 * ready for scripts/parity/compare.mjs. The file deliberately lives outside the
 * project: writing inside it trips the dev server's watcher, which reloads the
 * page mid-sweep. Not available in production.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  const dir = path.join(os.tmpdir(), 'resume-parity');
  const file = path.join(dir, 'browser-anchors.json');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(req.body, null, 2));
  return res.status(200).json({ file, presets: Object.keys(req.body ?? {}).length });
}
