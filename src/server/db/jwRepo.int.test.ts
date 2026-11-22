/**
 * Live test of the per-user isolation against a real PostgreSQL (opt-in):
 *   RUN_DB_TESTS=1 DATABASE_URL=… PGSSLMODE=disable pnpm exec vitest run src/server/db/jwRepo.int.test.ts
 * Makes two throwaway accounts and deletes them (and everything of theirs) afterwards.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminSummary, deleteAll, getConsent, holds, ingest, parseIngest, purgeExpiredActivity, setConsent, withTenant } from './jwRepo';
import { closePool, query } from './pool';

const live = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const A = randomUUID();
const B = randomUUID();
const now = new Date().toISOString();
const payload = (device: string, n = 3) =>
  parseIngest({
    deviceId: device,
    appVersion: '0.2.0',
    os: 'win32',
    activity: Array.from({ length: n }, (_, i) => ({ at: now, kind: 'tool', name: `tool_${i}`, ms: 100 + i, ok: i !== 2, code: i === 2 ? 'timeout' : undefined })),
    runs: [{ runId: 1, kind: 'find', trigger: 'user', state: 'done', startedAt: now, endedAt: now, durationMs: 1000, toolUses: n, turns: 2 }],
    daily: [{ day: now.slice(0, 10), found: 100, openJobs: 80, matching: 10, applied: 3, byStatus: { applied: 3 } }],
  });

describe.skipIf(!live)('JobWing per-user storage (live database)', { timeout: 60_000 }, () => {
  beforeAll(async () => {
    for (const [id, who] of [[A, 'a'], [B, 'b']] as const) {
      await query('INSERT INTO app.auth_users (id, email, full_name) VALUES ($1, $2, $3)', [id, `jwtest-${who}-${id.slice(0, 8)}@example.test`, `Test ${who}`]);
    }
  });
  afterAll(async () => {
    await query('DELETE FROM app.auth_users WHERE id = ANY($1)', [[A, B]]);
    await closePool();
  });

  it('stores nothing until the user says yes', async () => {
    expect(await getConsent(A)).toEqual({ activityLog: null, decidedAt: null });
    const out = await ingest(A, payload('device-aaaa-1'));
    expect(out).toEqual({ consent: false, accepted: { activity: 0, runs: 0, daily: 0 } });
    expect((await holds(A)).activity).toBe(0);
  });

  it('keeps each user to their own rows, even when the query forgets a WHERE clause', async () => {
    await setConsent(A, true);
    await setConsent(B, true);
    expect((await ingest(A, payload('device-aaaa-1', 5))).accepted).toEqual({ activity: 5, runs: 1, daily: 1 });
    expect((await ingest(B, payload('device-bbbb-1', 2))).accepted.activity).toBe(2);
    expect((await holds(A)).activity).toBe(5);
    expect((await holds(B)).activity).toBe(2);
    // No WHERE clause at all: still only the named user's rows.
    expect(Number((await withTenant(A, (tx) => tx.query('SELECT count(*) AS n FROM jw.activity'))).rows[0].n)).toBe(5);
    expect(Number((await withTenant(B, (tx) => tx.query('SELECT count(*) AS n FROM jw.activity'))).rows[0].n)).toBe(2);
    expect(Number((await withTenant(B, (tx) => tx.query('SELECT count(*) AS n FROM jw.runs'))).rows[0].n)).toBe(1);
  });

  it('refuses to write a row for someone else, and to read or change theirs', async () => {
    await expect(withTenant(B, (tx) => tx.query("INSERT INTO jw.activity (user_id, device_id, at, kind, name) VALUES ($1, 'device-bbbb-1', now(), 'tool', 'forged')", [A]))).rejects.toThrow(/row-level security/);
    const upd = await withTenant(B, (tx) => tx.query("UPDATE jw.activity SET name = 'tampered' WHERE user_id = $1", [A]));
    expect(upd.rowCount).toBe(0);
    const del = await withTenant(B, (tx) => tx.query('DELETE FROM jw.runs WHERE user_id = $1', [A]));
    expect(del.rowCount).toBe(0);
    expect((await holds(A)).runs).toBe(1);
  });

  it('sees nothing when no user is named', async () => {
    const r = await query('SELECT count(*) AS n FROM jw.activity');
    expect(Number(r.rows[0].n)).toBe(0);
  });

  it('lets the owner read totals across users but never write across them', async () => {
    const s = await adminSummary();
    expect(s.users.consented).toBeGreaterThanOrEqual(2);
    expect(s.tools.reduce((a, t) => a + t.calls, 0)).toBeGreaterThanOrEqual(7);
    expect(s.tools.find((t) => t.name === 'tool_2')?.failed).toBe(1);
    expect(JSON.stringify(s)).not.toMatch(/example\.test|Test a|Test b/);
    const del = await withTenant(A, (tx) => tx.query("SELECT set_config('jw.admin', 'on', true)").then(() => tx.query('DELETE FROM jw.activity WHERE user_id = $1', [B])), { admin: true });
    expect(del.rowCount).toBe(0);
    expect((await holds(B)).activity).toBe(2);
  });

  it('writes into a month with no partition yet by creating it', async () => {
    const far = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const p = parseIngest({ deviceId: 'device-aaaa-1', activity: [{ at: far, kind: 'event', name: 'old_event' }] });
    expect((await ingest(A, p)).accepted.activity).toBe(1);
    expect((await holds(A)).activity).toBe(6);
  });

  it('turning the log off deletes what was collected; deleting all removes the choice too', async () => {
    await setConsent(B, false);
    expect((await holds(B)).activity).toBe(0);
    expect(await getConsent(B)).toMatchObject({ activityLog: false });
    expect((await ingest(B, payload('device-bbbb-1'))).consent).toBe(false);
    await deleteAll(A);
    expect(await getConsent(A)).toEqual({ activityLog: null, decidedAt: null });
    expect((await holds(A)).activity).toBe(0);
  });

  it('drops whole months older than the retention period and keeps recent ones', async () => {
    await query("SELECT jw.ensure_activity_partition('2025-01-01')");
    expect((await query("SELECT to_regclass('jw.activity_2025_01') AS r")).rows[0].r).not.toBeNull();
    const dropped = await purgeExpiredActivity(90);
    expect(dropped).toContain('activity_2025_01');
    expect((await query("SELECT to_regclass('jw.activity_2025_01') AS r")).rows[0].r).toBeNull();
    const thisMonth = `activity_${new Date().toISOString().slice(0, 7).replace('-', '_')}`;
    expect(dropped).not.toContain(thisMonth);
    expect((await query('SELECT count(*) AS n FROM jw.activity')).rows[0].n).toBeDefined();
  });
});
