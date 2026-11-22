/**
 * Guard: the previous backends are gone. Firebase went first; the hosted sign-in provider (Supabase) is gone too:
 * sign-in is our own, in our PostgreSQL. This fails if either name creeps back into the source, the scripts, the
 * workers or the deployment config. (db/migrations and docs keep their history and are not scanned for the second name.)
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['src', 'scripts', 'db', 'ci-cd-cloudrun', 'docs', 'deploy', 'workers'];
const HISTORY = ['db', 'docs'];
const FILES = ['package.json', 'netlify.toml', 'next.config.mjs', '.env.example', '.dev.vars.example', 'wrangler.jsonc', 'README.md'];
const SKIP_DIR = new Set(['node_modules', '.next', '.next-preview']);
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|sql|sh|yaml|yml|toml|conf|css|example)$|Dockerfile$/;
const FORBIDDEN = /firebase|firestore/i;
const HOSTED_AUTH = /supabase/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT.test(name)) out.push(full);
  }
  return out;
}

describe('legacy backend', () => {
  it('is not referenced anywhere in the project', () => {
    const files = [...DIRS.flatMap((d) => (existsSync(path.join(ROOT, d)) ? walk(path.join(ROOT, d)) : [])), ...FILES.map((f) => path.join(ROOT, f))].filter(existsSync);
    const hits = files
      .filter((f) => f !== __filename)
      .flatMap((f) => {
        const rel = path.relative(ROOT, f);
        const history = HISTORY.includes(rel.split(path.sep)[0]);
        const text = readFileSync(f, 'utf8');
        return text.split('\n').flatMap((line, i) =>
          FORBIDDEN.test(line) || (!history && HOSTED_AUTH.test(line)) ? [`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`] : [],
        );
      });
    expect(hits).toEqual([]);
  });
});
