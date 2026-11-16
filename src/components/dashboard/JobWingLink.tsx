/**
 * "Connect JobWing" control in the dashboard header: makes the one-time link code the JobWing plugin uses to
 * push the jobs it finds and applies to into this dashboard, and to read status changes back.
 */
import { Check, Copy, Link2, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authedFetch } from '../../lib/api/authedFetch';

interface Info {
  linked: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
  synced: number;
}

export default function JobWingLink({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setInfo(await authedFetch<Info>('/api/jobwing/link'));
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await authedFetch<{ code: string }>('/api/jobwing/link', { method: 'POST' });
      setCode(r.code);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not make a code.');
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      await authedFetch('/api/jobwing/link', { method: 'DELETE' });
      setCode(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the code is selectable */
    }
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-expanded={open}
      >
        <Link2 size={14} /> JobWing
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="font-semibold text-slate-900 dark:text-white">Connect JobWing</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            JobWing is the Claude Code plugin that finds and fills job applications. Link it and every job it tracks shows up in this dashboard, and status changes you make here flow back.
          </p>
          {info?.linked && (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
              Linked · {info.synced} jobs synced{info.lastUsedAt ? ` · last used ${new Date(info.lastUsedAt).toLocaleString()}` : ' · not used yet'}
            </p>
          )}
          {code ? (
            <div className="mt-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">Copy this code now. It is shown once. In Claude Code say: “connect my JobWing account” and paste it.</p>
              <div className="mt-2 flex items-center gap-2">
                <input readOnly value={code} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800" aria-label="JobWing link code" />
                <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={make} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900">
                {busy && <Loader2 size={12} className="animate-spin" />} {info?.linked ? 'Make a new code' : 'Make link code'}
              </button>
              {info?.linked && (
                <button type="button" onClick={unlink} disabled={busy} className="text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-400">
                  Unlink
                </button>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
