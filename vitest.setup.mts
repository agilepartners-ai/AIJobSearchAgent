/**
 * Loads .env then .env.local before tests run, mirroring Next.js precedence.
 *
 * Without this, the opt-in integration tests would need their keys exported by
 * hand on every invocation even though the project already has them in
 * .env.local. Values already present in the environment always win, so CI can
 * still override.
 */
import fs from 'fs';
import path from 'path';

for (const file of ['.env', '.env.local']) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) continue;

  for (const raw of fs.readFileSync(full, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let value = line.slice(eq + 1).trim();

    const quoted =
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1);
    if (quoted) value = value.slice(1, -1);

    if (process.env[key] === undefined) process.env[key] = value;
  }
}
