/**
 * Guard: the previous backend (Firebase) is gone. Authentication is Supabase and
 * all data is PostgreSQL. This fails if either word creeps back into the source,
 * the scripts, the database files or the deployment config.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['src', 'scripts', 'db', 'ci-cd-cloudrun', 'docs'];
const FILES = ['package.json', 'netlify.toml', 'next.config.mjs', '.env.example', 'README.md'];
const SKIP_DIR = new Set(['node_modules', '.next', '.next-preview']);
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|sql|sh|yaml|yml|toml|conf|css|example)$|Dockerfile$/;
const FORBIDDEN = /firebase|firestore/i;

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
    const files = [...DIRS.flatMap((d) => walk(path.join(ROOT, d))), ...FILES.map((f) => path.join(ROOT, f))];
    const hits = files
      .filter((f) => f !== __filename)
      .flatMap((f) => {
        const text = readFileSync(f, 'utf8');
        return text.split('\n').flatMap((line, i) => (FORBIDDEN.test(line) ? [`${path.relative(ROOT, f)}:${i + 1}: ${line.trim().slice(0, 100)}`] : []));
      });
    expect(hits).toEqual([]);
  });
});
