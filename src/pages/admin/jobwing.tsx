/**
 * Owner-only view of how JobWing is used, built from the filtered activity log that users chose to share.
 * Only numbers and tool names reach this page: there are no emails, names, résumés or messages in what the server stores, and the
 * API refuses anyone who is not on the owner list (ADMIN_EMAILS) with a verified address.
 */
import { Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { NoIndex } from '../../components/seo/Seo';
import { ApiError, authedFetch } from '../../lib/api/authedFetch';
import { getUser } from '../../lib/auth/session';

interface Summary {
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

type View = { s: 'loading' } | { s: 'signedout' } | { s: 'denied' } | { s: 'error'; message: string } | { s: 'ready'; data: Summary };

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '–' : n.toLocaleString());
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title} {sub && <span className="font-normal text-slate-500 dark:text-slate-400">{sub}</span>}
      </h2>
      <div className="mt-3 overflow-x-auto">{children}</div>
    </section>
  );
}

const th = 'px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400';
const td = 'px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 tabular-nums';

function AdminJobWingContent() {
  const [view, setView] = useState<View>({ s: 'loading' });

  const load = useCallback(async () => {
    setView({ s: 'loading' });
    try {
      const user = await getUser();
      if (!user) return setView({ s: 'signedout' });
      setView({ s: 'ready', data: await authedFetch<Summary>('/api/admin/jobwing') });
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setView({ s: 'denied' });
      else if (e instanceof ApiError && e.status === 401) setView({ s: 'signedout' });
      else setView({ s: 'error', message: e instanceof Error ? e.message : 'Could not load.' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (view.s === 'loading')
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500" role="status">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Loading…
      </div>
    );
  if (view.s === 'signedout')
    return (
      <p className="p-8 text-center text-slate-700 dark:text-slate-300">
        Sign in first. <Link href="/login" className="text-blue-600 underline">Go to sign in</Link>
      </p>
    );
  if (view.s === 'denied') return <p className="p-8 text-center text-slate-700 dark:text-slate-300">This page is for the product owner only.</p>;
  if (view.s === 'error')
    return (
      <p className="p-8 text-center text-red-600" role="alert">
        {view.message}{' '}
        <button className="underline" onClick={() => void load()}>
          Try again
        </button>
      </p>
    );

  const d = view.data;
  const maxRuns = Math.max(1, ...d.runsPerDay.map((r) => r.runs));
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">JobWing usage</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            From the filtered activity log people chose to share: tool names, timings and error codes. No emails, résumés or message text are stored.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sharing the log" value={fmt(d.users.consented)} hint="people who said yes" />
        <Stat label="Active, 7 days" value={fmt(d.users.active7d)} />
        <Stat label="Active, 30 days" value={fmt(d.users.active30d)} />
        <Stat label="Devices" value={fmt(d.users.devices)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Jobs found" value={fmt(d.funnel.found)} hint="latest count per person, summed" />
        <Stat label="Matching" value={fmt(d.funnel.matching)} hint={pct(d.funnel.matching, d.funnel.found) + ' of found'} />
        <Stat label="Applied" value={fmt(d.funnel.applied)} hint={pct(d.funnel.applied, d.funnel.matching) + ' of matching'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Runs per day" sub="last 14 days">
          {d.runsPerDay.length ? (
            <ul className="space-y-1.5">
              {d.runsPerDay.map((r) => (
                <li key={r.day} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="w-20 shrink-0 tabular-nums">{r.day.slice(5)}</span>
                  <span className="relative h-3 flex-1 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                    <span className="absolute inset-y-0 left-0 rounded-full bg-blue-500" style={{ width: `${(r.runs / maxRuns) * 100}%` }} />
                    {r.failed > 0 && <span className="absolute inset-y-0 left-0 rounded-full bg-red-500" style={{ width: `${(r.failed / maxRuns) * 100}%` }} />}
                  </span>
                  <span className="w-16 shrink-0 text-right tabular-nums">
                    {r.runs}
                    {r.failed > 0 && <span className="text-red-600"> · {r.failed} failed</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No runs yet.</p>
          )}
        </Panel>

        <Panel title="Runs by kind" sub="last 30 days">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Kind</th>
                <th className={th}>Runs</th>
                <th className={th}>Failed</th>
                <th className={th}>Avg time</th>
              </tr>
            </thead>
            <tbody>
              {d.runsByKind.map((r) => (
                <tr key={r.kind} className="border-t border-slate-100 dark:border-slate-800">
                  <td className={td}>{r.kind}</td>
                  <td className={td}>{fmt(r.runs)}</td>
                  <td className={td}>{r.failed ? `${r.failed} (${pct(r.failed, r.runs)})` : '0'}</td>
                  <td className={td}>{r.avgSeconds === null ? '–' : `${r.avgSeconds}s`}</td>
                </tr>
              ))}
              {!d.runsByKind.length && (
                <tr>
                  <td className={td} colSpan={4}>No runs yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Tools" sub="what runs call most, last 30 days (slow or failing ones are what to fix first)">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Tool</th>
              <th className={th}>Calls</th>
              <th className={th}>Failed</th>
              <th className={th}>Median</th>
              <th className={th}>Slowest 5%</th>
            </tr>
          </thead>
          <tbody>
            {d.tools.map((t) => (
              <tr key={t.name} className="border-t border-slate-100 dark:border-slate-800">
                <td className={`${td} font-mono text-xs`}>{t.name}</td>
                <td className={td}>{fmt(t.calls)}</td>
                <td className={`${td} ${t.failed / Math.max(1, t.calls) > 0.1 ? 'font-semibold text-red-600' : ''}`}>{t.failed ? `${t.failed} (${pct(t.failed, t.calls)})` : '0'}</td>
                <td className={td}>{t.p50ms === null ? '–' : `${fmt(t.p50ms)} ms`}</td>
                <td className={td}>{t.p95ms === null ? '–' : `${fmt(t.p95ms)} ms`}</td>
              </tr>
            ))}
            {!d.tools.length && (
              <tr>
                <td className={td} colSpan={5}>Nothing shared yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="App versions">
          <ul className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
            {d.versions.map((v) => (
              <li key={v.version} className="flex justify-between">
                <span>{v.version}</span>
                <span className="tabular-nums">{fmt(v.devices)}</span>
              </li>
            ))}
            {!d.versions.length && <li className="text-slate-500">None yet.</li>}
          </ul>
        </Panel>
        <Panel title="Error codes" sub="last 30 days">
          <ul className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
            {d.errors.map((e) => (
              <li key={e.code} className="flex justify-between">
                <span>{e.code}</span>
                <span className="tabular-nums">{fmt(e.n)}</span>
              </li>
            ))}
            {!d.errors.length && <li className="text-slate-500">No errors recorded.</li>}
          </ul>
        </Panel>
        <Panel title="Latest events">
          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
            {d.recent.slice(0, 12).map((r, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate font-mono">{r.name}</span>
                <span className={r.ok === false ? 'text-red-600' : 'text-slate-500'}>{r.ok === false ? 'failed' : new Date(r.at).toLocaleTimeString()}</span>
              </li>
            ))}
            {!d.recent.length && <li className="text-slate-500">Nothing yet.</li>}
          </ul>
        </Panel>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">Generated {new Date(d.generatedAt).toLocaleString()}. Raw activity rows are removed after about three to four months.</p>
    </div>
  );
}

export default function AdminJobWing() {
  return (
    <>
      <NoIndex title="JobWing usage" />
      <AdminJobWingContent />
    </>
  );
}
