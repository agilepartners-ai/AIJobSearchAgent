import { describe, expect, it } from 'vitest';
import { IngestError, LIMITS, parseIngest } from './jwRepo';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const base = { deviceId: 'dev-12345678', appVersion: '0.2.0', os: 'win32' };
const act = (o: Record<string, unknown> = {}) => ({ at: '2026-11-22T11:00:00Z', kind: 'tool', name: 'search_next', ms: 120, ok: true, ...o });

describe('JobWing intake allow-list', () => {
  it('accepts a normal request and normalises it', () => {
    const r = parseIngest({ ...base, activity: [act()], runs: [{ runId: 7, kind: 'find', trigger: 'user', state: 'done', startedAt: '2026-11-22T10:00:00Z', endedAt: '2026-11-22T10:05:00Z', durationMs: 300000, toolUses: 12, turns: 4 }], daily: [{ day: '2026-11-22', found: 14000, openJobs: 9000, matching: 40, applied: 25, byStatus: { applied: 25, new: 100 } }] }, NOW);
    expect(r.activity).toHaveLength(1);
    expect(r.activity[0]).toMatchObject({ kind: 'tool', name: 'search_next', ms: 120, ok: true, code: null });
    expect(r.runs[0]).toMatchObject({ runId: 7, kind: 'find', toolUses: 12 });
    expect(r.daily[0]!.byStatus.applied).toBe(25);
  });

  it('refuses a field that is not on the list instead of keeping it', () => {
    expect(() => parseIngest({ ...base, activity: [], resume: 'Jane Doe, 5 years…' }, NOW)).toThrow(/"resume" is not allowed/);
    expect(() => parseIngest({ ...base, activity: [act({ args: { q: 'secret' } })] }, NOW)).toThrow(/"activity\[0\]\.args" is not allowed/);
    expect(() => parseIngest({ ...base, runs: [{ runId: 1, kind: 'find', trigger: 'user', state: 'done', startedAt: '2026-11-22T10:00:00Z', prompt: 'hi' }] }, NOW)).toThrow(/prompt/);
  });

  it('cannot smuggle an email, link or path through a name or code', () => {
    for (const name of ['jane@example.com', 'https://x.test/a', 'C:\\Users\\jane\\resume.pdf', '/home/jane/cv', 'a'.repeat(81), '']) {
      expect(() => parseIngest({ ...base, activity: [act({ name })] }, NOW), name).toThrow(IngestError);
    }
    expect(() => parseIngest({ ...base, activity: [act({ code: 'jane@example.com' })] }, NOW)).toThrow(/code/);
  });

  it('checks types, enums and ranges', () => {
    expect(() => parseIngest({ ...base, activity: [act({ kind: 'keylog' })] }, NOW)).toThrow(/kind/);
    expect(() => parseIngest({ ...base, activity: [act({ ms: -5 })] }, NOW)).toThrow(/ms/);
    expect(() => parseIngest({ ...base, activity: [act({ ok: 'yes' })] }, NOW)).toThrow(/ok/);
    expect(() => parseIngest({ ...base, daily: [{ day: '2026-11-22', found: 1, openJobs: 1, matching: 1, applied: 1, byStatus: { hired: 1 } }] }, NOW)).toThrow(/unknown status/);
    expect(() => parseIngest({ ...base, daily: [{ day: 'yesterday', found: 1, openJobs: 1, matching: 1, applied: 1 }] }, NOW)).toThrow(/2026-11-22/);
  });

  it('rejects times far in the future or older than 90 days', () => {
    expect(() => parseIngest({ ...base, activity: [act({ at: '2026-12-30T00:00:00Z' })] }, NOW)).toThrow(/future/);
    expect(() => parseIngest({ ...base, activity: [act({ at: '2026-01-01T00:00:00Z' })] }, NOW)).toThrow(/90 days/);
  });

  it('bounds the size of one request and the device id', () => {
    expect(() => parseIngest({ ...base, activity: Array.from({ length: LIMITS.activity + 1 }, () => act()) }, NOW)).toThrow(/at most/);
    expect(() => parseIngest({ ...base, deviceId: 'short' }, NOW)).toThrow(/deviceId/);
    expect(() => parseIngest({ ...base, deviceId: 'dev id with spaces!!' }, NOW)).toThrow(/deviceId/);
    expect(() => parseIngest('nope', NOW)).toThrow(/object/);
    expect(() => parseIngest([], NOW)).toThrow(/object/);
  });
});
