#!/usr/bin/env node
// Applies db/migrations/*.sql in order, once each, inside a transaction.
//   DATABASE_URL=postgres://jobsearch_app:…@host:5432/jobsearch node db/migrate.mjs
// An advisory lock serialises concurrent runs (CI + a manual run).
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const ssl = process.env.PGSSLMODE === 'disable' ? false : process.env.PG_SSL_CA ? { ca: process.env.PG_SSL_CA } : undefined;
const client = new pg.Client({ connectionString: url, ssl });

await client.connect();
try {
  await client.query('SELECT pg_advisory_lock(727001)');
  await client.query('CREATE SCHEMA IF NOT EXISTS app');
  await client.query(`CREATE TABLE IF NOT EXISTS app.schema_migrations (
    name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);

  const done = new Map((await client.query('SELECT name, checksum FROM app.schema_migrations')).rows.map((r) => [r.name, r.checksum]));
  const files = (await readdir(dir)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();

  let applied = 0;
  for (const file of files) {
    const sql = await readFile(path.join(dir, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    if (done.has(file)) {
      if (done.get(file) !== checksum) throw new Error(`${file} was edited after it was applied; add a new migration instead`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO app.schema_migrations (name, checksum) VALUES ($1, $2)', [file, checksum]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`${file}: ${err.message}`);
    }
    console.log('applied', file);
    applied += 1;
  }
  console.log(applied ? `done, ${applied} applied` : 'up to date');
} finally {
  await client.query('SELECT pg_advisory_unlock(727001)').catch(() => undefined);
  await client.end();
}
