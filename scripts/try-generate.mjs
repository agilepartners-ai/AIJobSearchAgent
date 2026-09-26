#!/usr/bin/env node
/**
 * Generates a real resume + cover letter and keeps the output so you can open
 * the PDFs and judge them by eye.
 *
 *     npm run try:generate
 *
 * Writes resume.tex/.pdf and cover_letter.tex/.pdf into ./tmp-generated/.
 * Costs one Gemini call and two Texapi compiles. Bypasses the API route, so no
 * upload happens and no daily quota is consumed.
 *
 * This is a thin wrapper around the end-to-end test rather than a separate
 * implementation — one code path, so this cannot drift from what CI checks.
 */
import { spawn } from 'child_process';

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', 'src/server/ai/generateLatex.e2e.test.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, DUMP_OUTPUT: '1' },
    shell: process.platform === 'win32',
  },
);

child.on('exit', (code) => process.exit(code ?? 1));
