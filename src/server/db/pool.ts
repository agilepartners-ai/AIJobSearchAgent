import { Client, Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { isWorkers, workerContext } from '../runtime';

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
 * Two runtimes, one interface.
 *
 * Node (local dev, the VM service): one lazily created pool per server instance, kept tiny because
 * serverless-style hosts open many short-lived instances against a database on a small shared VM.
 *
 * Cloudflare Workers: a connection cannot outlive the request that opened it, so each call opens a client
 * to the Hyperdrive binding (which pools the real connections, over TLS with our CA, at the edge) and closes it
 * after the response with waitUntil. `DATABASE_URL` is deliberately not used here: a Worker cannot verify our
 * private CA, which is exactly what Hyperdrive is configured to do for it.
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
  if (isWorkers()) throw new DbConfigError('getPool() is not available on Workers; use query() or withTransaction().');
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

/** Runs `fn` with a client that exists only for this request. */
async function withWorkerClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const { env, waitUntil } = await workerContext();
  const connectionString = env.HYPERDRIVE?.connectionString;
  if (!connectionString) throw new DbConfigError('The HYPERDRIVE binding is missing (see wrangler.jsonc).');
  const client = new Client({ connectionString, ssl: false, connectionTimeoutMillis: 8_000, application_name: 'jobsearch-worker' });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    // Close after the response is sent, so the user does not wait for the disconnect.
    waitUntil(client.end().catch(() => undefined));
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  if (isWorkers()) return withWorkerClient((c) => c.query<T>(text, params));
  return getPool().query<T>(text, params);
}

type Tx = Pick<PoolClient, 'query'>;

async function inTransaction<T>(client: Tx, fn: (client: Tx) => Promise<T>): Promise<T> {
  await client.query('BEGIN');
  try {
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

export async function withTransaction<T>(fn: (client: Tx) => Promise<T>): Promise<T> {
  if (isWorkers()) return withWorkerClient((c) => inTransaction(c, fn));
  const client = await getPool().connect();
  try {
    return await inTransaction(client, fn);
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  const p = pool;
  pool = null;
  await p?.end();
}
