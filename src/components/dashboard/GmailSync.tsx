/**
 * Gmail sync control in the dashboard header: connect, sync now, disconnect.
 * Renders nothing unless the server reports the feature is switched on (/api/gmail/status).
 * Explains exactly what is read before sending the user to Google (docs/GMAIL_JOB_SYNC_SCOPE.md, section 3).
 */
import { motion } from 'framer-motion';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
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

export default function GmailSync({ onSynced }: { onSynced: () => void | Promise<void> }) {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToastContext();
  const [status, setStatus] = useState<Status | null>(null);
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
  }, []);

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

  if (!status?.enabled) return null;

  const connected = Boolean(status.connected);
  const needsReconnect = status.status === 'revoked' || status.status === 'error';

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
        <span className="hidden sm:inline">{connected && !needsReconnect ? 'Gmail' : needsReconnect ? 'Reconnect Gmail' : 'Connect Gmail'}</span>
        {!!status.needsReview && connected && <span className="rounded-full bg-amber-100 px-1.5 text-[11px] text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">{status.needsReview}</span>}
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.16 }} role="dialog" aria-label="Gmail sync" className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {!connected || needsReconnect ? (
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
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{status.googleEmail}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">Imported</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900 dark:text-white">{status.imported ?? 0}</dd></div>
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><dt className="text-slate-500 dark:text-slate-400">To check</dt><dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900 dark:text-white">{status.needsReview ?? 0}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Last sync {when(status.lastSyncAt)}. New mail is also checked once a day.</p>
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
