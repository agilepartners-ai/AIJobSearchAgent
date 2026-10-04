import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  workers: false,
  binding: { connectionString: 'postgres://u:p@hyperdrive.local:5432/db' } as { connectionString: string } | undefined,
  waited: [] as Promise<unknown>[],
  clients: [] as Array<{ opts: Record<string, unknown>; queries: string[]; ended: boolean; failOn?: string }>,
  poolQueries: [] as string[],
}));

vi.mock('../runtime', () => ({
  isWorkers: () => state.workers,
  workerContext: async () => ({ env: { HYPERDRIVE: state.binding }, waitUntil: (p: Promise<unknown>) => state.waited.push(p) }),
}));

vi.mock('pg', () => {
  class Client {
    record: (typeof state.clients)[number];
    constructor(opts: Record<string, unknown>) {
      this.record = { opts, queries: [], ended: false };
      state.clients.push(this.record);
    }
    async connect() {}
    async query(text: string) {
      this.record.queries.push(text);
      if (this.record.failOn && text.includes(this.record.failOn)) throw new Error('boom');
      return { rows: [{ ok: 1 }], rowCount: 1 };
    }
    async end() {
      this.record.ended = true;
    }
  }
  class Pool {
    on() {}
    async query(text: string) {
      state.poolQueries.push(text);
      return { rows: [{ viaPool: true }], rowCount: 1 };
    }
    async connect() {
      return { query: async (t: string) => (state.poolQueries.push(t), { rows: [] }), release() {} };
    }
    async end() {}
  }
  return { Client, Pool, types: { setTypeParser() {} }, default: {} };
});

import { DbConfigError, getPool, query, withTransaction } from './pool';

beforeEach(() => {
  state.workers = false;
  state.binding = { connectionString: 'postgres://u:p@hyperdrive.local:5432/db' };
  state.waited.length = 0;
  state.clients.length = 0;
  state.poolQueries.length = 0;
  process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/z';
});

describe('database layer on Node', () => {
  it('uses the shared pool', async () => {
    const r = await query('SELECT 1');
    expect(r.rows[0]).toEqual({ viaPool: true });
    expect(state.clients).toHaveLength(0);
  });

  it('wraps a transaction on one pooled connection', async () => {
    await withTransaction(async (c) => void (await c.query('UPDATE x')));
    expect(state.poolQueries).toEqual(['BEGIN', 'UPDATE x', 'COMMIT']);
  });
});

describe('database layer on Cloudflare Workers', () => {
  beforeEach(() => {
    state.workers = true;
  });

  it('opens a client to the Hyperdrive binding, not DATABASE_URL, without TLS from the Worker', async () => {
    const r = await query('SELECT 1');
    expect(r.rows[0]).toEqual({ ok: 1 });
    expect(state.clients).toHaveLength(1);
    expect(state.clients[0].opts.connectionString).toBe('postgres://u:p@hyperdrive.local:5432/db');
    expect(state.clients[0].opts.ssl).toBe(false);
    expect(state.poolQueries).toHaveLength(0);
  });

  it('closes the client after the response through waitUntil, never leaving it open', async () => {
    await query('SELECT 1');
    await Promise.all(state.waited);
    expect(state.waited).toHaveLength(1);
    expect(state.clients[0].ended).toBe(true);
  });

  it('uses a fresh client for every call (a connection cannot cross requests)', async () => {
    await query('SELECT 1');
    await query('SELECT 2');
    expect(state.clients).toHaveLength(2);
  });

  it('fails loudly when the Hyperdrive binding is missing', async () => {
    state.binding = undefined;
    await expect(query('SELECT 1')).rejects.toBeInstanceOf(DbConfigError);
  });

  it('commits a transaction on one client', async () => {
    await withTransaction(async (c) => void (await c.query('UPDATE x')));
    expect(state.clients).toHaveLength(1);
    expect(state.clients[0].queries).toEqual(['BEGIN', 'UPDATE x', 'COMMIT']);
  });

  it('rolls back and rethrows when the work fails, and still closes the client', async () => {
    await expect(
      withTransaction(async (c) => {
        (state.clients[0] as { failOn?: string }).failOn = 'UPDATE';
        await c.query('UPDATE x');
      }),
    ).rejects.toThrow('boom');
    expect(state.clients[0].queries).toEqual(['BEGIN', 'UPDATE x', 'ROLLBACK']);
    await Promise.all(state.waited);
    expect(state.clients[0].ended).toBe(true);
  });

  it('does not expose the shared pool', () => {
    expect(() => getPool()).toThrow(DbConfigError);
  });
});
