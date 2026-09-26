/**
 * The applications list.
 *
 * One row per application, in a near-black, low-contrast palette that matches
 * the AI loader: white text at three opacities, hairline borders, and a single
 * filled button (the AI action). Status is a small dot plus a plain label
 * rather than a coloured badge, so nothing competes for attention with the one
 * thing worth doing next. There is no carousel: a list scans faster, holds more
 * on screen, and works the same on a phone.
 */
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, Eye, Pencil, Search, Sparkles, Trash2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { JobApplication } from '../../services/firebaseJobApplicationService';

interface ApplicationsTableProps {
  applications: JobApplication[];
  searchTerm: string;
  statusFilter: string;
  onSearchTermChange: (term: string) => void;
  onStatusFilterChange: (status: string) => void;
  onEditApplication: (application: JobApplication) => void;
  onViewJobDescription: (job: { title: string; company: string; description: string }) => void;
  onDeleteApplication: (id: string) => void;
  onUpdateApplicationStatus?: (id: string, status: string) => void;
  onLoadAIEnhanced?: (application: JobApplication) => void;
}

type Status = JobApplication['status'];

/** Label and dot for each real status. Muted on purpose; only outcomes get a hue. */
const STATUS: Record<Status, { label: string; dot: string }> = {
  not_applied: { label: 'To apply', dot: 'bg-white/30' },
  applied: { label: 'Applied', dot: 'bg-white/80' },
  interviewing: { label: 'Interviewing', dot: 'bg-sky-300/80' },
  offered: { label: 'Offer', dot: 'bg-emerald-300/80' },
  accepted: { label: 'Accepted', dot: 'bg-emerald-300/80' },
  rejected: { label: 'Rejected', dot: 'bg-white/20' },
  declined: { label: 'Declined', dot: 'bg-white/20' },
};

const STATUS_ORDER: Status[] = ['not_applied', 'applied', 'interviewing', 'offered', 'accepted', 'rejected', 'declined'];

/**
 * The filter groups statuses people think of together. (It used to offer
 * "interview" and "offer", which no application ever has, so those filters
 * always came back empty.)
 */
const FILTERS: { id: string; label: string; match: (s: Status) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'not_applied', label: 'To apply', match: (s) => s === 'not_applied' },
  { id: 'applied', label: 'Applied', match: (s) => s === 'applied' },
  { id: 'interviewing', label: 'Interviewing', match: (s) => s === 'interviewing' },
  { id: 'offered', label: 'Offers', match: (s) => s === 'offered' || s === 'accepted' },
  { id: 'closed', label: 'Closed', match: (s) => s === 'rejected' || s === 'declined' },
];

type Sort = 'recent' | 'company' | 'status';

const dateLabel = (value: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'MMM d');
};

const iconButton =
  'rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40';

const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  applications,
  searchTerm,
  statusFilter,
  onSearchTermChange,
  onStatusFilterChange,
  onEditApplication,
  onViewJobDescription,
  onDeleteApplication,
  onUpdateApplicationStatus,
  onLoadAIEnhanced,
}) => {
  const [sort, setSort] = useState<Sort>('recent');
  // Deleting takes two clicks: a single mis-click must not remove an application.
  const [confirming, setConfirming] = useState<string | null>(null);

  const filter = FILTERS.find((f) => f.id === statusFilter) ?? FILTERS[0];

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = applications.filter(
      (a) =>
        filter.match(a.status ?? 'not_applied') &&
        (!q || (a.position ?? '').toLowerCase().includes(q) || (a.company_name ?? '').toLowerCase().includes(q)),
    );
    const stamp = (a: JobApplication) => a.updated_at || a.application_date || '';
    return list.sort((a, b) => {
      if (sort === 'company') return (a.company_name ?? '').localeCompare(b.company_name ?? '');
      if (sort === 'status') return STATUS_ORDER.indexOf(a.status ?? 'not_applied') - STATUS_ORDER.indexOf(b.status ?? 'not_applied');
      return stamp(b).localeCompare(stamp(a));
    });
  }, [applications, filter, searchTerm, sort]);

  const countFor = (f: (typeof FILTERS)[number]) => applications.filter((a) => f.match(a.status ?? 'not_applied')).length;

  const apply = (a: JobApplication) => {
    if (!a.job_posting_url) return;
    window.open(a.job_posting_url, '_blank', 'noopener,noreferrer');
    // Opening the posting from "To apply" is a strong sign it is being applied to.
    if (a.status === 'not_applied') onUpdateApplicationStatus?.(a.id, 'applied');
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0a0a0b]" aria-label="Applications">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/[0.07]">
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Search role or company"
            aria-label="Search applications"
            className="w-full rounded-lg border border-slate-200 bg-transparent py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 dark:border-white/10 dark:text-white dark:placeholder:text-white/35 dark:focus:border-white/30"
          />
        </label>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => {
            const active = f.id === filter.id;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                onClick={() => onStatusFilterChange(f.id)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-white/45 dark:hover:text-white/80'
                }`}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-50">{countFor(f)}</span>
              </button>
            );
          })}
        </div>

        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-white/40">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-md border border-slate-200 bg-transparent px-2 py-1 text-xs text-slate-700 outline-none dark:border-white/10 dark:bg-[#0a0a0b] dark:text-white/80"
          >
            <option value="recent">Recent</option>
            <option value="company">Company</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      {/* Rows */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm text-slate-700 dark:text-white/80">
              {applications.length === 0 ? 'No applications yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-white/40">
              {applications.length === 0
                ? 'Use Find jobs to save a role, or Add application to enter one yourself.'
                : 'Try a different search or filter.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {rows.map((a) => {
              const status = a.status ?? 'not_applied';
              const meta = [dateLabel(a.application_date), a.location, a.remote_option ? 'Remote' : ''].filter(Boolean).join(' · ');
              const askingDelete = confirming === a.id;
              return (
                <motion.li
                  key={a.id}
                  layout="position"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="group grid grid-cols-1 items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.025] md:grid-cols-[minmax(0,1fr)_auto_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white/90">{a.position || 'Untitled role'}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-white/45">
                      {a.company_name || 'Unknown company'}
                      {meta && <span className="text-slate-400 dark:text-white/30"> · {meta}</span>}
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS[status].dot}`} aria-hidden />
                    <span className="sr-only">Status</span>
                    <select
                      value={status}
                      onChange={(e) => onUpdateApplicationStatus?.(a.id, e.target.value)}
                      disabled={!onUpdateApplicationStatus}
                      className="cursor-pointer rounded bg-transparent py-0.5 pr-1 text-xs outline-none hover:text-slate-900 dark:bg-[#0a0a0b] dark:hover:text-white"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS[s].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-1 md:justify-end">
                    {a.job_posting_url && (
                      <button
                        onClick={() => apply(a)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      >
                        {status === 'not_applied' ? 'Apply' : 'Open'}
                        <ArrowUpRight size={13} />
                      </button>
                    )}
                    {onLoadAIEnhanced && (
                      <button
                        onClick={() => onLoadAIEnhanced(a)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
                      >
                        <Sparkles size={13} />
                        Tailor resume
                      </button>
                    )}

                    {a.job_description && (
                      <button
                        onClick={() => onViewJobDescription({ title: a.position || '', company: a.company_name || '', description: a.job_description || '' })}
                        className={iconButton}
                        aria-label="View job description"
                        title="View job description"
                      >
                        <Eye size={15} />
                      </button>
                    )}
                    <button onClick={() => onEditApplication(a)} className={iconButton} aria-label="Edit application" title="Edit">
                      <Pencil size={15} />
                    </button>

                    {askingDelete ? (
                      <span className="flex items-center gap-1 rounded-lg bg-white/[0.06] pl-2 text-xs text-white/70" role="alert">
                        Delete?
                        <button
                          onClick={() => {
                            setConfirming(null);
                            onDeleteApplication(a.id);
                          }}
                          className={`${iconButton} text-rose-300/80 hover:text-rose-200`}
                          aria-label="Confirm delete"
                        >
                          <Check size={15} />
                        </button>
                        <button onClick={() => setConfirming(null)} className={iconButton} aria-label="Keep application">
                          <X size={15} />
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirming(a.id)} className={iconButton} aria-label="Delete application" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-white/[0.06] dark:text-white/30">
        {rows.length === applications.length ? `${rows.length} ${rows.length === 1 ? 'application' : 'applications'}` : `${rows.length} of ${applications.length}`}
      </div>
    </section>
  );
};

export default ApplicationsTable;
