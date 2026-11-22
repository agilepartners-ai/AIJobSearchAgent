/**
 * JobWing's per-user records on the server: what the desktop app is allowed to send, and the owner's reporting over them.
 *
 * Two safeguards, one in each layer:
 *   - `parseIngest` is an allow-list. Only the fields below are accepted; anything else (a résumé, an email, a path, a token, tool
 *     arguments) is refused with a 400 rather than silently kept. Names and codes are restricted to a safe character set, so an
 *     address, a link or a file path cannot be smuggled in as a "name".
 *   - Every table has forced row-level security (db/migrations/009_jobwing_tenant.sql). `withTenant` names the user for the
 *     transaction; the database then shows that user's rows and no others.
 */
import { query, withTransaction } from './pool';

export const POLICY_VERSION = '2026-11-22';

const KINDS = ['tool', 'event', 'run', 'sync', 'app'] as const;
const RUN_KINDS = ['daily', 'find', 'gmail', 'apply', 'people', 'sync', 'report', 'custom', 'followup'] as const;
const RUN_STATES = ['starting', 'running', 'idle', 'done', 'failed', 'stopped'] as const;
const STATUS_KEYS = ['new', 'filtered', 'shortlisted', 'skipped', 'approved', 'prepared', 'applied', 'interview', 'offer', 'rejected', 'closed'] as const;

export const LIMITS = { activity: 300, runs: 100, daily: 14, perUserPerDay: 20_000 } as const;

export class IngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestError';
  }
}

export interface ActivityIn { at: string; kind: (typeof KINDS)[number]; name: string; ms: number | null; ok: boolean | null; code: string | null }
export interface RunIn { runId: number; kind: (typeof RUN_KINDS)[number]; trigger: 'user' | 'schedule'; state: (typeof RUN_STATES)[number]; startedAt: string; endedAt: string | null; durationMs: number | null; toolUses: number; turns: number | null; errorCode: string | null }
export interface DailyIn { day: string; found: number; openJobs: number; matching: number; applied: number; byStatus: Record<string, number> }
export interface IngestIn { deviceId: string; appVersion: string; os: string; activity: ActivityIn[]; runs: RunIn[]; daily: DailyIn[] }

const NAME = /^[A-Za-z0-9_.\- ]{1,80}$/;
const CODE = /^[A-Za-z0-9_.\-]{1,40}$/;
const DEVICE = /^[A-Za-z0-9_-]{8,64}$/;
const VERSION = /^[A-Za-z0-9_.\-+]{0,24}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function onlyKeys(o: Record<string, unknown>, allowed: readonly string[], where: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new IngestError(`The field "${where}${k}" is not allowed.`);
}
function obj(v: unknown, where: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new IngestError(`${where} must be an object.`);
  return v as Record<string, unknown>;
}
function int(v: unknown, where: string, max = 2_000_000_000): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > max) throw new IngestError(`${where} must be a whole number from 0 to ${max}.`);
  return v;
}
function optInt(v: unknown, where: string): number | null {
  return v === null || v === undefined ? null : int(v, where);
}
function when(v: unknown, where: string, now: number): string {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isFinite(t)) throw new IngestError(`${where} must be a date and time.`);
  if (t > now + 2 * 86_400_000) throw new IngestError(`${where} is in the future.`);
  if (t < now - 90 * 86_400_000) throw new IngestError(`${where} is older than 90 days.`);
  return new Date(t).toISOString();
}
function oneOf<T extends string>(v: unknown, list: readonly T[], where: string): T {
  if (typeof v !== 'string' || !(list as readonly string[]).includes(v)) throw new IngestError(`${where} is not one of: ${list.join(', ')}.`);
  return v as T;
}
function arr(v: unknown, where: string, max: number): unknown[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new IngestError(`${where} must be a list.`);
  if (v.length > max) throw new IngestError(`${where} can hold at most ${max} items per request.`);
  return v;
}

/** Validates a request body against the allow-list. Throws IngestError naming the first problem. */
export function parseIngest(body: unknown, now = Date.now()): IngestIn {
  const b = obj(body, 'The request');
  onlyKeys(b, ['deviceId', 'appVersion', 'os', 'activity', 'runs', 'daily'], '');
  if (typeof b.deviceId !== 'string' || !DEVICE.test(b.deviceId)) throw new IngestError('deviceId must be 8 to 64 letters, digits, - or _.');
  const appVersion = typeof b.appVersion === 'string' ? b.appVersion : '';
  const os = typeof b.os === 'string' ? b.os : '';
  if (!VERSION.test(appVersion)) throw new IngestError('appVersion is not valid.');
  if (!VERSION.test(os)) throw new IngestError('os is not valid.');

  const activity = arr(b.activity, 'activity', LIMITS.activity).map((x, i): ActivityIn => {
    const w = `activity[${i}]`;
    const o = obj(x, w);
    onlyKeys(o, ['at', 'kind', 'name', 'ms', 'ok', 'code'], `${w}.`);
    if (typeof o.name !== 'string' || !NAME.test(o.name)) throw new IngestError(`${w}.name may only use letters, digits, space, _ - . (max 80).`);
    if (o.code !== undefined && o.code !== null && (typeof o.code !== 'string' || !CODE.test(o.code))) throw new IngestError(`${w}.code may only use letters, digits, _ - . (max 40).`);
    if (o.ok !== undefined && o.ok !== null && typeof o.ok !== 'boolean') throw new IngestError(`${w}.ok must be true or false.`);
    return { at: when(o.at, `${w}.at`, now), kind: oneOf(o.kind, KINDS, `${w}.kind`), name: o.name, ms: optInt(o.ms, `${w}.ms`), ok: (o.ok as boolean | null | undefined) ?? null, code: (o.code as string | null | undefined) ?? null };
  });

  const runs = arr(b.runs, 'runs', LIMITS.runs).map((x, i): RunIn => {
    const w = `runs[${i}]`;
    const o = obj(x, w);
    onlyKeys(o, ['runId', 'kind', 'trigger', 'state', 'startedAt', 'endedAt', 'durationMs', 'toolUses', 'turns', 'errorCode'], `${w}.`);
    if (o.errorCode !== undefined && o.errorCode !== null && (typeof o.errorCode !== 'string' || !CODE.test(o.errorCode))) throw new IngestError(`${w}.errorCode may only use letters, digits, _ - . (max 40).`);
    return {
      runId: int(o.runId, `${w}.runId`, Number.MAX_SAFE_INTEGER),
      kind: oneOf(o.kind, RUN_KINDS, `${w}.kind`),
      trigger: oneOf(o.trigger, ['user', 'schedule'] as const, `${w}.trigger`),
      state: oneOf(o.state, RUN_STATES, `${w}.state`),
      startedAt: when(o.startedAt, `${w}.startedAt`, now),
      endedAt: o.endedAt === undefined || o.endedAt === null ? null : when(o.endedAt, `${w}.endedAt`, now),
      durationMs: optInt(o.durationMs, `${w}.durationMs`),
      toolUses: o.toolUses === undefined ? 0 : int(o.toolUses, `${w}.toolUses`, 1_000_000),
      turns: optInt(o.turns, `${w}.turns`),
      errorCode: (o.errorCode as string | null | undefined) ?? null,
    };
  });

  const daily = arr(b.daily, 'daily', LIMITS.daily).map((x, i): DailyIn => {
    const w = `daily[${i}]`;
    const o = obj(x, w);
    onlyKeys(o, ['day', 'found', 'openJobs', 'matching', 'applied', 'byStatus'], `${w}.`);
    if (typeof o.day !== 'string' || !DAY.test(o.day) || Number.isNaN(Date.parse(o.day))) throw new IngestError(`${w}.day must look like 2026-11-22.`);
    const by = obj(o.byStatus ?? {}, `${w}.byStatus`);
    const byStatus: Record<string, number> = {};
    for (const [k, v] of Object.entries(by)) {
      if (!(STATUS_KEYS as readonly string[]).includes(k)) throw new IngestError(`${w}.byStatus has an unknown status "${k.slice(0, 20)}".`);
      byStatus[k] = int(v, `${w}.byStatus.${k}`, 10_000_000);
    }
    return { day: o.day, found: int(o.found, `${w}.found`, 10_000_000), openJobs: int(o.openJobs, `${w}.openJobs`, 10_000_000), matching: int(o.matching, `${w}.matching`, 10_000_000), applied: int(o.applied, `${w}.applied`, 10_000_000), byStatus };
  });
  return { deviceId: b.deviceId, appVersion, os, activity, runs, daily };
}

/* ------------------------------------------------------------------ database */

type Tx = Parameters<Parameters<typeof withTransaction>[0]>[0];

/** Runs `fn` as one user. The database shows only that user's rows (or, with `admin`, lets the owner read across users). */
export async function withTenant<T>(userId: string, fn: (tx: Tx) => Promise<T>, opts: { admin?: boolean } = {}): Promise<T> {
  return withTransaction(async (tx) => {
    await tx.query("SELECT set_config('jw.user_id', $1, true), set_config('jw.admin', $2, true)", [userId, opts.admin ? 'on' : 'off']);
    return fn(tx);
  });
}

export async function getConsent(userId: string): Promise<{ activityLog: boolean | null; decidedAt: string | null }> {
  return withTenant(userId, async (tx) => {
    const { rows } = await tx.query<{ activity_log: boolean; decided_at: Date }>('SELECT activity_log, decided_at FROM jw.consents WHERE user_id = $1', [userId]);
    return rows[0] ? { activityLog: rows[0].activity_log, decidedAt: rows[0].decided_at.toISOString() } : { activityLog: null, decidedAt: null };
  });
}

export async function setConsent(userId: string, on: boolean): Promise<void> {
  await withTenant(userId, async (tx) => {
    await tx.query(
      `INSERT INTO jw.consents (user_id, activity_log, policy_version) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET activity_log = EXCLUDED.activity_log, policy_version = EXCLUDED.policy_version, decided_at = now()`,
      [userId, on, POLICY_VERSION],
    );
    // Turning it off also removes what was collected: consent withdrawn means the data goes.
    if (!on) await purge(tx, userId);
  });
}

async function purge(tx: Tx, userId: string): Promise<void> {
  for (const t of ['activity', 'runs', 'daily', 'devices']) await tx.query(`DELETE FROM jw.${t} WHERE user_id = $1`, [userId]);
}

export async function deleteAll(userId: string): Promise<void> {
  await withTenant(userId, async (tx) => {
    await purge(tx, userId);
    await tx.query('DELETE FROM jw.consents WHERE user_id = $1', [userId]);
  });
}

export interface IngestOut { consent: boolean; accepted: { activity: number; runs: number; daily: number } }

/** Raw activity rows are kept for about three months. Whole monthly partitions older than that are dropped (cheap, and not subject to row policies). */
export const ACTIVITY_RETENTION_DAYS = 90;
let lastPurge = 0;

export async function purgeExpiredActivity(days = ACTIVITY_RETENTION_DAYS, nowMs = Date.now()): Promise<string[]> {
  const rows = await query<{ relname: string }>(
    `SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid JOIN pg_class p ON p.oid = i.inhparent JOIN pg_namespace n ON n.oid = p.relnamespace
     WHERE n.nspname = 'jw' AND p.relname = 'activity' AND c.relname ~ '^activity_[0-9]{4}_[0-9]{2}$'`,
  );
  const cutoff = nowMs - days * 86_400_000;
  const dropped: string[] = [];
  for (const { relname } of rows.rows) {
    const [, y, m] = /^activity_(\d{4})_(\d{2})$/.exec(relname)!;
    const monthEnd = Date.UTC(Number(y), Number(m), 1); // first day of the next month
    if (monthEnd < cutoff) {
      await query(`DROP TABLE jw."${relname}"`); // the name matched the pattern above, so it cannot carry anything else
      dropped.push(relname);
    }
  }
  return dropped;
}

/** Runs the purge at most every six hours per server process, and never lets a failure affect the request that triggered it. */
async function purgeSometimes(): Promise<void> {
  if (Date.now() - lastPurge < 6 * 3_600_000) return;
  lastPurge = Date.now();
  try {
    await purgeExpiredActivity();
  } catch (e) {
    console.error('jw retention purge failed', e instanceof Error ? e.message : e);
  }
}

export async function ingest(userId: string, input: IngestIn): Promise<IngestOut> {
  void purgeSometimes();
  return withTenant(userId, async (tx) => {
    const c = await tx.query<{ activity_log: boolean }>('SELECT activity_log FROM jw.consents WHERE user_id = $1', [userId]);
    if (!c.rows[0]?.activity_log) return { consent: false, accepted: { activity: 0, runs: 0, daily: 0 } };

    const today = await tx.query<{ n: string }>("SELECT count(*)::text AS n FROM jw.activity WHERE user_id = $1 AND received_at >= date_trunc('day', now())", [userId]);
    const room = Math.max(0, LIMITS.perUserPerDay - Number(today.rows[0]?.n ?? 0));
    const activity = input.activity.slice(0, room);

    await tx.query(
      `INSERT INTO jw.devices (user_id, device_id, app_version, os) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, device_id) DO UPDATE SET last_seen = now(), app_version = EXCLUDED.app_version, os = EXCLUDED.os`,
      [userId, input.deviceId, input.appVersion, input.os],
    );
    for (const m of Array.from(new Set(activity.map((a) => `${a.at.slice(0, 7)}-01`)))) await tx.query('SELECT jw.ensure_activity_partition($1::date)', [m]);
    for (const a of activity) {
      await tx.query('INSERT INTO jw.activity (user_id, device_id, at, kind, name, ms, ok, code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [userId, input.deviceId, a.at, a.kind, a.name, a.ms, a.ok, a.code]);
    }
    for (const r of input.runs) {
      await tx.query(
        `INSERT INTO jw.runs (user_id, device_id, run_id, kind, trigger, state, started_at, ended_at, duration_ms, tool_uses, turns, error_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (user_id, device_id, run_id) DO UPDATE SET state = EXCLUDED.state, ended_at = EXCLUDED.ended_at, duration_ms = EXCLUDED.duration_ms,
           tool_uses = EXCLUDED.tool_uses, turns = EXCLUDED.turns, error_code = EXCLUDED.error_code, received_at = now()`,
        [userId, input.deviceId, r.runId, r.kind, r.trigger, r.state, r.startedAt, r.endedAt, r.durationMs, r.toolUses, r.turns, r.errorCode],
      );
    }
    for (const d of input.daily) {
      await tx.query(
        `INSERT INTO jw.daily (user_id, day, found, open_jobs, matching, applied, by_status) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         ON CONFLICT (user_id, day) DO UPDATE SET found = EXCLUDED.found, open_jobs = EXCLUDED.open_jobs, matching = EXCLUDED.matching, applied = EXCLUDED.applied, by_status = EXCLUDED.by_status, received_at = now()`,
        [userId, d.day, d.found, d.openJobs, d.matching, d.applied, JSON.stringify(d.byStatus)],
      );
    }
    return { consent: true, accepted: { activity: activity.length, runs: input.runs.length, daily: input.daily.length } };
  });
}

export interface Holds { applications: number; dailyCounts: number; runs: number; activity: number; firstAt: string | null; lastAt: string | null; newest: { at: string; kind: string; detail: string }[] }

/** What the server holds about one user, for the "what we hold about you" view in the app. */
export async function holds(userId: string): Promise<Holds> {
  return withTenant(userId, async (tx) => {
    const a = await tx.query<{ n: string; first: Date | null; last: Date | null }>('SELECT count(*)::text AS n, min(at) AS first, max(at) AS last FROM jw.activity WHERE user_id = $1', [userId]);
    const r = await tx.query<{ n: string }>('SELECT count(*)::text AS n FROM jw.runs WHERE user_id = $1', [userId]);
    const d = await tx.query<{ n: string }>('SELECT count(*)::text AS n FROM jw.daily WHERE user_id = $1', [userId]);
    const apps = await tx.query<{ n: string }>('SELECT count(*)::text AS n FROM app.job_applications WHERE user_id = $1 AND external_key IS NOT NULL', [userId]);
    const newest = await tx.query<{ at: Date; kind: string; name: string; ok: boolean | null; ms: number | null; code: string | null }>(
      'SELECT at, kind, name, ok, ms, code FROM jw.activity WHERE user_id = $1 ORDER BY at DESC, id DESC LIMIT 10',
      [userId],
    );
    return {
      applications: Number(apps.rows[0]?.n ?? 0),
      dailyCounts: Number(d.rows[0]?.n ?? 0),
      runs: Number(r.rows[0]?.n ?? 0),
      activity: Number(a.rows[0]?.n ?? 0),
      firstAt: a.rows[0]?.first?.toISOString() ?? null,
      lastAt: a.rows[0]?.last?.toISOString() ?? null,
      newest: newest.rows.map((x) => ({ at: x.at.toISOString(), kind: x.kind, detail: `${x.name}${x.ok === false ? ' failed' : x.ok === true ? ' ok' : ''}${x.ms !== null ? ` · ${x.ms} ms` : ''}${x.code ? ` · ${x.code}` : ''}` })),
    };
  });
}

/* ---------------------------------------------------------------- owner view */

export interface AdminSummary {
  generatedAt: string;
  users: { consented: number; active7d: number; active30d: number; devices: number };
  runsPerDay: { day: string; runs: number; failed: number }[];
  runsByKind: { kind: string; runs: number; failed: number; avgSeconds: number | null }[];
  tools: { name: string; calls: number; failed: number; p50ms: number | null; p95ms: number | null }[];
  versions: { version: string; devices: number }[];
  errors: { code: string; n: number }[];
  funnel: { found: number; matching: number; applied: number };
  recent: { at: string; kind: string; name: string; ok: boolean | null }[];
}

/** Across all consenting users, as numbers only. Reads through the owner policy; there is no way to write across users from here. */
export async function adminSummary(): Promise<AdminSummary> {
  return withTenant('00000000-0000-0000-0000-000000000000', async (tx) => {
    const one = async <T extends Record<string, unknown>>(sql: string) => (await tx.query<T>(sql)).rows;
    const u = (await one<{ c: string; a7: string; a30: string; d: string }>(`
      SELECT (SELECT count(*) FROM jw.consents WHERE activity_log)::text AS c,
             (SELECT count(DISTINCT user_id) FROM jw.activity WHERE at > now() - interval '7 days')::text AS a7,
             (SELECT count(DISTINCT user_id) FROM jw.activity WHERE at > now() - interval '30 days')::text AS a30,
             (SELECT count(*) FROM jw.devices)::text AS d`))[0]!;
    const perDay = await one<{ day: string; runs: string; failed: string }>(`
      SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day, count(*)::text AS runs, count(*) FILTER (WHERE state = 'failed')::text AS failed
      FROM jw.runs WHERE started_at > now() - interval '14 days' GROUP BY 1 ORDER BY 1`);
    const byKind = await one<{ kind: string; runs: string; failed: string; s: string | null }>(`
      SELECT kind, count(*)::text AS runs, count(*) FILTER (WHERE state = 'failed')::text AS failed, round(avg(duration_ms) / 1000.0)::text AS s
      FROM jw.runs WHERE started_at > now() - interval '30 days' GROUP BY kind ORDER BY count(*) DESC`);
    const tools = await one<{ name: string; calls: string; failed: string; p50: string | null; p95: string | null }>(`
      SELECT name, count(*)::text AS calls, count(*) FILTER (WHERE ok = false)::text AS failed,
             round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ms))::text AS p50, round(percentile_cont(0.95) WITHIN GROUP (ORDER BY ms))::text AS p95
      FROM jw.activity WHERE kind = 'tool' AND at > now() - interval '30 days' GROUP BY name ORDER BY count(*) DESC LIMIT 25`);
    const versions = await one<{ v: string; n: string }>("SELECT app_version AS v, count(*)::text AS n FROM jw.devices GROUP BY 1 ORDER BY 2 DESC LIMIT 10");
    const errors = await one<{ c: string; n: string }>("SELECT code AS c, count(*)::text AS n FROM jw.activity WHERE code IS NOT NULL AND at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 10");
    const f = (await one<{ found: string | null; matching: string | null; applied: string | null }>(`
      SELECT sum(found)::text AS found, sum(matching)::text AS matching, sum(applied)::text AS applied FROM (
        SELECT DISTINCT ON (user_id) found, matching, applied FROM jw.daily ORDER BY user_id, day DESC) latest`))[0];
    const recent = await one<{ at: Date; kind: string; name: string; ok: boolean | null }>('SELECT at, kind, name, ok FROM jw.activity ORDER BY at DESC LIMIT 25');
    return {
      generatedAt: new Date().toISOString(),
      users: { consented: Number(u.c), active7d: Number(u.a7), active30d: Number(u.a30), devices: Number(u.d) },
      runsPerDay: perDay.map((r) => ({ day: r.day, runs: Number(r.runs), failed: Number(r.failed) })),
      runsByKind: byKind.map((r) => ({ kind: r.kind, runs: Number(r.runs), failed: Number(r.failed), avgSeconds: r.s === null ? null : Number(r.s) })),
      tools: tools.map((r) => ({ name: r.name, calls: Number(r.calls), failed: Number(r.failed), p50ms: r.p50 === null ? null : Number(r.p50), p95ms: r.p95 === null ? null : Number(r.p95) })),
      versions: versions.map((r) => ({ version: r.v || 'unknown', devices: Number(r.n) })),
      errors: errors.map((r) => ({ code: r.c, n: Number(r.n) })),
      funnel: { found: Number(f?.found ?? 0), matching: Number(f?.matching ?? 0), applied: Number(f?.applied ?? 0) },
      recent: recent.map((r) => ({ at: r.at.toISOString(), kind: r.kind, name: r.name, ok: r.ok })),
    };
  }, { admin: true });
}
