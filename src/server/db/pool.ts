import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';

// Counters and money come back as numbers, not strings (bigint and numeric are strings by default).
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => Number(v));

export class DbConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DbConfigError';
  }
}

/**
 * One lazily created pool per server instance. Netlify runs many short-lived
 * function instances against a database on a small shared VM, so each instance
 * keeps a tiny pool and lets idle connections go quickly.
 */
let pool: Pool | null = null;

function sslOption(): false | { ca?: string; rejectUnauthorized: boolean } {
  const mode = process.env.PGSSLMODE;
  if (mode === 'disable') return false;
  const ca = process.env.PG_SSL_CA?.replace(/\\n/g, '\n');
  // Verify the server certificate whenever a CA is supplied (production).
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: mode === 'verify-full' };
}

export function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DbConfigError('DATABASE_URL is not set');
  pool = new Pool({
    connectionString: url,
    ssl: sslOption(),
    max: Number(process.env.PG_POOL_MAX || 2),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    application_name: 'jobsearch-web',
  });
  // An idle client erroring (VM restart, network blip) must not crash the process.
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  const p = pool;
  pool = null;
  await p?.end();
}
