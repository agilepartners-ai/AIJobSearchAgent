/**
 * Gmail sync control in the dashboard header: connect, sync now, disconnect.
 * Renders nothing unless the server reports the feature is switched on (/api/gmail/status).
 * Explains exactly what is read before sending the user to Google (docs/GMAIL_JOB_SYNC_SCOPE.md, section 3).
 */
import { motion } from 'framer-motion';
import { Check, Copy, Loader2, Mail, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authedFetch } from '../../lib/api/authedFetch';
import { useToastContext } from '../ui/ToastProvider';

interface Status {
  enabled: boolean;
  connected?: boolean;
  status?: 'active' | 'revoked' | 'error';
  googleEmail?: string;
  lastSyncAt?: string | null;
  lastSummary?: { created: number; updated: number; needsReview: number; skipped: number; truncated: boolean } | null;
  imported?: number;
  needsReview?: number;
}

interface Inbound {
  enabled: boolean;
  address?: string;
  filterQuery?: string;
  lastReceivedAt?: string | null;
  receivedTotal?: number;
  confirmation?: { code: string | null; link: string | null; receivedAt: string } | null;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked: the text is selectable above */
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={label} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
      {done ? <Check size={12} /> : <Copy size={12} />} {done ? 'Copied' : 'Copy'}
    </button>
  );
}

const REASONS: Record<string, string> = {
  denied: 'Gmail access was not granted.',
  grant: 'Google did not return access. Tick the Gmail permission and try again.',
  state: 'That link expired. Try connecting again.',
  not_enabled: 'Gmail sync is not turned on yet.',
  google: 'Google reported a problem. Try again.',
  server: 'Something went wrong on our side. Try again.',
};

function when(iso?: string | null): string {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

function ForwardPanel({ inbound, onRotate }: { inbound: Inbound | null; onRotate: () => void }) {
  if (!inbound?.address) return <p className="text-slate-500">Loading your address…</p>;
  const got = (inbound.receivedTotal ?? 0) > 0;
  const step = 'flex gap-2.5';
  const num = 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200';
  return (
    <>
      <p className="font-semibold text-slate-900 dark:text-white">Forward job emails here</p>
      <p className="mt-1.5 text-slate-600 dark:text-slate-300">No Google permission needed, and it works with Outlook and Yahoo too. Gmail forwards only the emails you choose, and we add them to your board.</p>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
        <code className="min-w-0 flex-1 select-all break-all text-xs text-slate-800 dark:text-slate-100">{inbound.address}</code>
        <CopyButton text={inbound.address} label="Copy your forwarding address" />
      </div>

      <ol className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
        <li className={step}><span className={num}>1</span><span>In Gmail: <b>Settings → See all settings → Forwarding and POP/IMAP → Add a forwarding address</b>, paste the address above.</span></li>
        <li className={step}>
          <span className={num}>2</span>
          <span>
            Google sends a confirmation to that address. We catch it for you:{' '}
            {inbound.confirmation?.code ? (
              <span className="mt-1 flex items-center gap-2"><b className="rounded bg-emerald-50 px-2 py-0.5 text-sm tabular-nums text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{inbound.confirmation.code}</b><CopyButton text={inbound.confirmation.code} label="Copy the confirmation code" /> <span>enter this code in Gmail.</span></span>
            ) : (
              <i>waiting for it…</i>
            )}
          </span>
        </li>
        <li className={step}>
          <span className={num}>3</span>
          <span>
            <b>Create a filter</b> so only job mail is sent: in Gmail search paste the query below, choose <b>Create filter → Forward it to</b> your new address.
            <span className="mt-1 flex items-start gap-2"><code className="min-w-0 flex-1 select-all break-words rounded bg-slate-50 p-1.5 text-[11px] dark:bg-slate-800">{inbound.filterQuery}</code><CopyButton text={inbound.filterQuery ?? ''} label="Copy the Gmail filter query" /></span>
          </span>
        </li>
      </ol>

      <p className={`mt-3 rounded-lg px-2.5 py-2 text-xs ${got ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
        {got ? `${inbound.receivedTotal} email${inbound.receivedTotal === 1 ? '' : 's'} received, last ${when(inbound.lastReceivedAt)}. New applications show up on your board within a minute.` : 'Nothing received yet. Once step 3 is done, new job emails appear here on their own.'}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
        <li>Email text is not stored; only the job details we pull out.</li>
        <li>Treat the address like a password. If it leaks, make a new one.</li>
      </ul>
      <button type="button" onClick={onRotate} className="mt-2 text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Make a new address</button>
    </>
  );
}

export default function GmailSync({ onSynced }: { onSynced: () => void | Promise<void> }) {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToastContext();
  const [status, setStatus] = useState<Status | null>(null);
  const [inbound, setInbound] = useState<Inbound | null>(null);
  const [tab, setTab] = useState<'gmail' | 'forward'>('gmail');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'connect' | 'sync' | 'disconnect' | null>(null);
  const [removeImported, setRemoveImported] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const handledReturn = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await authedFetch<Status>('/api/gmail/status'));
    } catch {
      setStatus({ enabled: false });
    }
    try {
      setInbound(await authedFetch<Inbound>('/api/inbound/address'));
    } catch {
      setInbound({ enabled: false });
    }
  }, []);

  const rotate = async () => {
    try {
      setInbound(await authedFetch<Inbound>('/api/inbound/address', { method: 'POST', body: JSON.stringify({ rotate: true }) }));
      showInfo('New address', 'The old address stopped working. Update your Gmail filter to the new one.');
    } catch (e) {
      showError('Forwarding', (e as Error).message || 'Could not make a new address.');
    }
  };

  const sync = useCallback(
    async (first = false) => {
      setBusy('sync');
      try {
        const r = await authedFetch<{ summary: { created: number; updated: number; needsReview: number; truncated: boolean } }>('/api/gmail/sync', { method: 'POST', body: '{}' });
        const s = r.summary;
        const parts = [`${s.created} new`, `${s.updated} updated`];
        if (s.needsReview) parts.push(`${s.needsReview} to check`);
        showSuccess(first ? 'Gmail connected' : 'Gmail synced', `${parts.join(', ')}.${s.truncated ? ' More mail remains; sync again to continue.' : ''}`);
        await onSynced();
      } catch (e) {
        const err = e as { message?: string; status?: number };
        (err.status === 429 ? showInfo : showError)('Gmail sync', err.message || 'Could not sync Gmail.');
      } finally {
        setBusy(null);
        void refresh();
      }
    },
    [onSynced, refresh, showError, showInfo, showSuccess],
  );

  useEffect(() => void refresh(), [refresh]);

  // Back from Google: say how it went, then run the first sync.
  useEffect(() => {
    if (!router.isReady || handledReturn.current) return;
    const result = router.query.gmail;
    if (typeof result !== 'string') return;
    handledReturn.current = true;
    const reason = typeof router.query.reason === 'string' ? router.query.reason : '';
    void router.replace('/dashboard', undefined, { shallow: true });
    if (result === 'connected') void sync(true);
    else showError('Gmail not connected', REASONS[reason] || 'Try again.');
  }, [router, showError, sync]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const gmailOn = Boolean(status?.enabled);
  const forwardOn = Boolean(inbound?.enabled);
  const activeTab = gmailOn && forwardOn ? tab : gmailOn ? 'gmail' : 'forward';

  // On the forwarding tab, look for Gmail's confirmation code and the first forwarded mail every few seconds.
  useEffect(() => {
    if (!open || activeTab !== 'forward' || !forwardOn) return;
    const id = setInterval(() => void refresh(), 6000);
    return () => clearInterval(id);
  }, [open, activeTab, forwardOn, refresh]);

  if (!gmailOn && !forwardOn) return null;

  const st: Status = status ?? { enabled: false };
  const connected = Boolean(status?.connected);
  const needsReconnect = status?.status === 'revoked' || status?.status === 'error';

  const connect = async () => {
    setBusy('connect');
    try {
      const { url } = await authedFetch<{ url: string }>('/api/gmail/connect', { method: 'POST', body: '{}' });
      window.location.assign(url);
    } catch (e) {
      showError('Gmail', (e as Error).message || 'Could not start the connection.');
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    try {
      const r = await authedFetch<{ removedApplications: number }>('/api/gmail/disconnect', { method: 'POST', body: JSON.stringify({ deleteImported: removeImported }) });
      showSuccess('Gmail disconnected', r.removedApplications ? `${r.removedApplications} imported applications removed.` : 'Your applications were kept.');
      await onSynced();
    } catch (e) {
      showError('Gmail', (e as Error).message || 'Could not disconnect.');
    } finally {
      setBusy(null);
      setRemoveImported(false);
      void refresh();
    }
  };

  const chip = connected && !needsReconnect
    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-300 dark:hover:bg-emerald-400/10'
    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200';
  const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60';

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={open} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${chip}`}>
        {busy === 'sync' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
        <span className="hidden sm:inline">{connected && !needsReconnect ? 'Gmail' : needsReconnect ? 'Reconnect Gmail' : gmailOn ? 'Connect Gmail' : 'Add from email'}</span>
        {!!status?.needsReview && connected && <span className="rounded-full bg-amber-100 px-1.5 text-[11px] text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">{st.needsReview}</span>}
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.16 }} role="dialog" aria-label="Gmail sync" className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {gmailOn && forwardOn && (
            <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium dark:bg-slate-800" role="tablist">
              {([['gmail', 'Connect Gmail'], ['forward', 'Forward emails']] as const).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setTab(id)} className={`flex-1 rounded-md px-2 py-1.5 transition-colors ${activeTab === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{label}</button>
              ))}
            </div>
          )}
          {activeTab === 'forward' ? (
            <ForwardPanel inbound={inbound} onRotate={rotate} />
          ) : !connected || needsReconnect ? (
            <>
              <p className="font-semibold text-slate-900 dark:text-white">{needsReconnect ? 'Reconnect Gmail' : 'Fill your board from Gmail'}</p>
              <p className="mt-1.5 text-slate-600 dark:text-slate-300">
                We read your <b>Updates</b> tab for application confirmations, interview invites, assessments, offers and rejections, and add them here with the company, role, status and dates.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
                <li>Read-only. We cannot send, delete or change mail.</li>
                <li>Email text is not stored; only the job details we pull out.</li>
                <li>Used only for this feature, never for ads or model training.</li>
                <li>Disconnect any time, here or in your Google account.</li>
              </ul>
              {needsReconnect && <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">Google access expired or was removed.</p>}
              <button onClick={connect} disabled={busy !== null} className={`${btn} mt-3 w-full bg-indigo-600 text-white hover:bg-indigo-500`}>
                {busy === 'connect' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Connect with Google
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-900 dark:text-white">Gmail connected</p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{st.googleEmail}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">Imported</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900 dark:text-white">{st.imported ?? 0}</dd></div>
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">To check</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900 dark:text-white">{st.needsReview ?? 0}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Last sync {when(st.lastSyncAt)}. New mail is also checked once a day.</p>
              <button onClick={() => sync(false)} disabled={busy !== null} className={`${btn} mt-3 w-full bg-indigo-600 text-white hover:bg-indigo-500`}>
                {busy === 'sync' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {busy === 'sync' ? 'Reading your Updates tab…' : 'Sync now'}
              </button>
              <label className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <input type="checkbox" id="gmail-remove-imported" checked={removeImported} onChange={(e) => setRemoveImported(e.target.checked)} className="mt-0.5" />
                When disconnecting, also remove the applications imported from Gmail
              </label>
              <button onClick={disconnect} disabled={busy !== null} className={`${btn} mt-2 w-full border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`}>
                {busy === 'disconnect' ? <Loader2 size={15} className="animate-spin" /> : null} Disconnect Gmail
              </button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
