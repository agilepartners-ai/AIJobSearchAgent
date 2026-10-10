/**
 * Daily health and keep-alive Worker (free plan: one cron trigger, a handful of requests a day).
 *
 * 1. Keeps the Supabase project awake. Free projects pause after about a week without database activity,
 *    which would break sign-in. A password sign-in for an address that does not exist is rejected with 400
 *    after Supabase looks it up in its database: that is the activity, and it creates no account.
 * 2. Checks the three things whose failure users would notice: the site, the database path
 *    (Hyperdrive), and the VM service that generates documents.
 *
 * A failing check makes the scheduled run throw, so it shows up as a failed invocation in the Cloudflare
 * dashboard where a notification can be attached. Open the Worker's URL to run the same checks on demand.
 */
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SITE_URL: string;
  GENERATE_ORIGIN?: string;
  /** Set (as a secret) to also trigger the daily Gmail sync on the VM. Unset: no sync call is made. */
  GMAIL_CRON_SECRET?: string;
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

type Fetch = typeof fetch;

const trim = (u: string) => u.replace(/\/+$/, '');

async function check(name: string, run: () => Promise<{ ok: boolean; detail: string }>): Promise<Check> {
  try {
    return { name, ...(await run()) };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

export async function runChecks(env: Env, doFetch: Fetch = fetch): Promise<Check[]> {
  const timeout = () => AbortSignal.timeout(15_000);
  const checks: Promise<Check>[] = [];

  checks.push(
    check('supabase', async () => {
      const r = await doFetch(`${trim(env.SUPABASE_URL)}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'keepalive@invalid.example', password: 'not-a-real-password' }),
        signal: timeout(),
      });
      // 400 invalid_credentials is the healthy answer: the database was consulted and said no.
      return { ok: r.status === 400, detail: `HTTP ${r.status}` };
    }),
  );

  checks.push(
    check('site', async () => {
      const r = await doFetch(`${trim(env.SITE_URL)}/api/health`, { signal: timeout() });
      return { ok: r.status === 200, detail: `HTTP ${r.status}` };
    }),
  );

  checks.push(
    check('database', async () => {
      const r = await doFetch(`${trim(env.SITE_URL)}/api/health?db=1`, { signal: timeout() });
      return { ok: r.status === 200, detail: `HTTP ${r.status}` };
    }),
  );

  if (env.GENERATE_ORIGIN) {
    checks.push(
      check('generation-service', async () => {
        const r = await doFetch(`${trim(env.GENERATE_ORIGIN as string)}/api/health`, { signal: timeout() });
        return { ok: r.status === 200, detail: `HTTP ${r.status}` };
      }),
    );
  }

  return Promise.all(checks);
}

/** Asks the VM to sync the next few connected mailboxes (bounded per call). Best effort: never fails the health run. */
export async function triggerGmailSync(env: Env, doFetch: Fetch = fetch): Promise<string> {
  if (!env.GMAIL_CRON_SECRET || !env.GENERATE_ORIGIN) return 'gmail sync not configured';
  try {
    const r = await doFetch(`${trim(env.GENERATE_ORIGIN)}/api/gmail/sync-all`, {
      method: 'POST',
      headers: { 'x-cron-secret': env.GMAIL_CRON_SECRET, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(25_000),
    });
    return `gmail sync HTTP ${r.status}`;
  } catch (error) {
    return `gmail sync failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export default {
  async scheduled(_event: unknown, env: Env): Promise<void> {
    console.log(await triggerGmailSync(env));
    const results = await runChecks(env);
    console.log(JSON.stringify(results));
    const failing = results.filter((r) => !r.ok);
    if (failing.length) throw new Error(`Failing checks: ${failing.map((f) => `${f.name} (${f.detail})`).join(', ')}`);
  },

  async fetch(_request: Request, env: Env): Promise<Response> {
    const results = await runChecks(env);
    const ok = results.every((r) => r.ok);
    return new Response(JSON.stringify({ ok, results }, null, 2), {
      status: ok ? 200 : 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  },
};
