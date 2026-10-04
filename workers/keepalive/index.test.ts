import { describe, expect, it, vi } from 'vitest';
import worker, { runChecks, type Env } from './index';

const env: Env = {
  SUPABASE_URL: 'https://p.supabase.co/',
  SUPABASE_ANON_KEY: 'anon',
  SITE_URL: 'https://site.example/',
  GENERATE_ORIGIN: 'https://gen.example',
};

const reply = (map: Record<string, number>) =>
  vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    const key = Object.keys(map).find((k) => u.includes(k));
    if (!key) throw new Error(`unexpected request to ${u}`);
    return new Response('{}', { status: map[key] });
  }) as unknown as typeof fetch;

const healthy = { 'supabase.co/auth/v1/token': 400, '/api/health?db=1': 200, 'site.example/api/health': 200, 'gen.example/api/health': 200 };

describe('keep-alive checks', () => {
  it('passes when Supabase rejects the fake login (400), and the site, database and generator answer', async () => {
    const r = await runChecks(env, reply(healthy));
    expect(r.map((c) => [c.name, c.ok])).toEqual([['supabase', true], ['site', true], ['database', true], ['generation-service', true]]);
  });

  it('sends the anon key, never a real credential, to Supabase', async () => {
    const f = reply(healthy);
    await runChecks(env, f);
    const call = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls.find(([u]) => u.includes('/auth/v1/token'))!;
    expect((call[1].headers as Record<string, string>).apikey).toBe('anon');
    expect(String(call[1].body)).toContain('invalid.example');
  });

  it('flags Supabase when it is paused or down (anything but 400)', async () => {
    for (const status of [200, 401, 500, 503]) {
      const r = await runChecks(env, reply({ ...healthy, 'supabase.co/auth/v1/token': status }));
      expect(r.find((c) => c.name === 'supabase')!.ok, `status ${status}`).toBe(false);
    }
  });

  it('flags the database path separately from the site', async () => {
    const r = await runChecks(env, reply({ ...healthy, '/api/health?db=1': 503 }));
    expect(r.find((c) => c.name === 'site')!.ok).toBe(true);
    expect(r.find((c) => c.name === 'database')!.ok).toBe(false);
  });

  it('turns a network failure into a failed check, not a crash', async () => {
    const f = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as unknown as typeof fetch;
    const r = await runChecks(env, f);
    expect(r.every((c) => !c.ok)).toBe(true);
    expect(r[0].detail).toContain('ECONNREFUSED');
  });

  it('skips the generation service check when none is configured', async () => {
    const r = await runChecks({ ...env, GENERATE_ORIGIN: '' }, reply(healthy));
    expect(r.map((c) => c.name)).toEqual(['supabase', 'site', 'database']);
  });

  it('the scheduled run throws on failure so Cloudflare records a failed invocation', async () => {
    vi.stubGlobal('fetch', reply({ ...healthy, 'gen.example/api/health': 502 }));
    await expect(worker.scheduled({}, env)).rejects.toThrow(/generation-service/);
    vi.unstubAllGlobals();
  });

  it('the on-demand endpoint reports 200 when healthy and 503 when not', async () => {
    vi.stubGlobal('fetch', reply(healthy));
    expect((await worker.fetch(new Request('https://x'), env)).status).toBe(200);
    vi.stubGlobal('fetch', reply({ ...healthy, 'site.example/api/health': 500 }));
    expect((await worker.fetch(new Request('https://x'), env)).status).toBe(503);
    vi.unstubAllGlobals();
  });
});
