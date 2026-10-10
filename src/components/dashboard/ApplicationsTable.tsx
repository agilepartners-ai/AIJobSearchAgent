/**
 * The applications workspace, laid out the way LinkedIn Jobs is: a list on the
 * left, and the selected job in full on the right.
 *
 * Each row carries what a recruiter's inbox would: a company tile, the role,
 * company · location, small facts (remote, type, salary) and a status chip. The
 * right pane shows the whole job (description, dates, contact, notes, the
 * documents you generated) with the two actions that matter, Apply and Tailor
 * résumé, at the top.
 *
 * Deliberately static: no animation, no carousel. Colour is limited to a
 * muted tint on the status chip and on each company's tile, so state is
 * readable at a glance without anything shouting.
 */
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, Building2, Check, Eye, FileText, Mail, MapPin, Mic, Pencil, Search, Sparkles, Trash2, User, Wallet, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import type { JobApplication } from '../../services/jobApplicationService';

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

const STATUS: Record<Status, { label: string; chip: string }> = {
  not_applied: { label: 'To apply', chip: 'bg-slate-100 text-slate-600 dark:bg-white/[0.07] dark:text-white/60' },
  applied: { label: 'Applied', chip: 'bg-sky-50 text-sky-700 dark:bg-sky-400/[0.14] dark:text-sky-300' },
  interviewing: { label: 'Interviewing', chip: 'bg-violet-50 text-violet-700 dark:bg-violet-400/[0.14] dark:text-violet-300' },
  offered: { label: 'Offer', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/[0.14] dark:text-emerald-300' },
  accepted: { label: 'Accepted', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/[0.14] dark:text-emerald-300' },
  rejected: { label: 'Rejected', chip: 'bg-rose-50 text-rose-700 dark:bg-rose-400/[0.10] dark:text-rose-300/90' },
  declined: { label: 'Declined', chip: 'bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-white/45' },
};

const STATUS_ORDER: Status[] = ['not_applied', 'applied', 'interviewing', 'offered', 'accepted', 'rejected', 'declined'];

/** Groups of statuses people think of together. */
const FILTERS: { id: string; label: string; match: (s: Status) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'not_applied', label: 'To apply', match: (s) => s === 'not_applied' },
  { id: 'applied', label: 'Applied', match: (s) => s === 'applied' },
  { id: 'interviewing', label: 'Interviewing', match: (s) => s === 'interviewing' },
  { id: 'offered', label: 'Offers', match: (s) => s === 'offered' || s === 'accepted' },
  { id: 'closed', label: 'Closed', match: (s) => s === 'rejected' || s === 'declined' },
];

type Sort = 'recent' | 'company' | 'status';

const stampOf = (a: JobApplication) => a.updated_at || a.application_date || a.created_at || '';

function ago(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
}

function day(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy');
}

/** A stable hue per company, so the same company always gets the same tile. */
function hueOf(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function CompanyTile({ name, size = 44 }: { name: string; size?: number }) {
  const hue = hueOf(name || '?');
  const letters = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-lg font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hue} 32% 24%)`, color: `hsl(${hue} 70% 82%)` }}
    >
      {letters}
    </span>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-white/[0.06] dark:text-white/60">{children}</span>
);

const ghost =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-white/75 dark:hover:bg-white/[0.06]';

/** The interview page takes the job from the URL. The description is trimmed so the link stays a sensible length. */
const interviewHref = (a: JobApplication) => {
  const q = new URLSearchParams({
    jobTitle: a.position ?? '',
    companyName: a.company_name ?? '',
    jobDescription: (a.job_description ?? '').slice(0, 1500),
  });
  return `/ai-interview?${q.toString()}`;
};

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Deleting takes two clicks: a single mis-click must not remove an application.
  const [confirming, setConfirming] = useState(false);

  const filter = FILTERS.find((f) => f.id === statusFilter) ?? FILTERS[0];

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = applications.filter(
      (a) =>
        filter.match(a.status ?? 'not_applied') &&
        (!q || (a.position ?? '').toLowerCase().includes(q) || (a.company_name ?? '').toLowerCase().includes(q)),
    );
    return list.sort((a, b) => {
      if (sort === 'company') return (a.company_name ?? '').localeCompare(b.company_name ?? '');
      if (sort === 'status') return STATUS_ORDER.indexOf(a.status ?? 'not_applied') - STATUS_ORDER.indexOf(b.status ?? 'not_applied');
      return stampOf(b).localeCompare(stampOf(a));
    });
  }, [applications, filter, searchTerm, sort]);

  // Keep a valid selection: the first row when nothing (or something filtered out) is selected.
  const selected = rows.find((a) => a.id === selectedId) ?? rows[0] ?? null;
  useEffect(() => setConfirming(false), [selected?.id]);

  const countFor = (f: (typeof FILTERS)[number]) => applications.filter((a) => f.match(a.status ?? 'not_applied')).length;

  const apply = (a: JobApplication) => {
    if (!a.job_posting_url) return;
    window.open(a.job_posting_url, '_blank', 'noopener,noreferrer');
    // Opening the posting from "To apply" is a strong sign it is being applied to.
    if (a.status === 'not_applied') onUpdateApplicationStatus?.(a.id, 'applied');
  };

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0c0c0e]"
      aria-label="Applications"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-4 py-3 dark:border-white/[0.07]">
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

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => {
            const active = f.id === filter.id;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                onClick={() => onStatusFilterChange(f.id)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-white/55 dark:hover:bg-white/[0.05]'
                }`}
              >
                {f.label} <span className="tabular-nums opacity-60">{countFor(f)}</span>
              </button>
            );
          })}
        </div>

        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-white/40">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-md border border-slate-200 bg-transparent px-2 py-1 text-xs text-slate-700 outline-none dark:border-white/10 dark:bg-[#0c0c0e] dark:text-white/80"
          >
            <option value="recent">Recent</option>
            <option value="company">Company</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <Building2 size={28} className="mb-3 text-slate-300 dark:text-white/20" />
          <p className="text-sm text-slate-700 dark:text-white/80">{applications.length === 0 ? 'No applications yet' : 'No matches'}</p>
          <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-white/40">
            {applications.length === 0 ? 'Use Find jobs to save a role, or Add application to enter one yourself.' : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
          {/* List */}
          <ul className="min-h-0 divide-y divide-slate-100 overflow-y-auto border-slate-200 dark:divide-white/[0.06] dark:border-white/[0.07] lg:border-r" role="listbox" aria-label="Jobs">
            {rows.map((a) => {
              const status = a.status ?? 'not_applied';
              const active = a.id === selected?.id;
              const facts = [a.remote_option ? 'Remote' : '', a.employment_type, a.salary_range].filter(Boolean) as string[];
              return (
                <li key={a.id} role="option" aria-selected={active}>
                  <button
                    onClick={() => {
                      setSelectedId(a.id);
                      // Below the two-pane breakpoint there is no detail pane; open the description instead.
                      if (typeof window !== 'undefined' && window.innerWidth < 1024 && a.job_description) {
                        onViewJobDescription({ title: a.position || '', company: a.company_name || '', description: a.job_description });
                      }
                    }}
                    className={`flex w-full gap-3 border-l-2 px-4 py-3.5 text-left ${
                      active
                        ? 'border-l-slate-900 bg-slate-50 dark:border-l-white dark:bg-white/[0.05]'
                        : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <CompanyTile name={a.company_name || ''} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white/95">{a.position || 'Untitled role'}</span>
                        <span className="mt-0.5 flex shrink-0 items-center gap-1">
                          {a.source?.startsWith('suggestion:') && <span title="Recommended in a job-alert email. Not an application yet." className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-400/[0.14] dark:text-sky-300">Suggested</span>}
                          {a.needs_review && <span title="Read from an email the AI was not sure about. Check the details." className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-400/[0.14] dark:text-amber-300">Review</span>}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[status].chip}`}>{STATUS[status].label}</span>
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-600 dark:text-white/60">{a.company_name || 'Unknown company'}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-white/40">{[a.location, ago(a.application_date || a.created_at)].filter(Boolean).join(' · ')}</span>
                      {facts.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {facts.map((f) => (
                            <Chip key={f}>{f}</Chip>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Detail */}
          {selected && (
            <article className="hidden min-h-0 flex-col overflow-hidden lg:flex" aria-label="Job details">
              <div className="border-b border-slate-200 px-6 py-5 dark:border-white/[0.07]">
                <div className="flex items-start gap-4">
                  <CompanyTile name={selected.company_name || ''} size={56} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold leading-snug text-slate-900 dark:text-white">{selected.position || 'Untitled role'}</h2>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-white/60">
                      {selected.company_name || 'Unknown company'}
                      {selected.location && <span className="text-slate-400 dark:text-white/35"> · {selected.location}</span>}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
                      Added {ago(selected.application_date || selected.created_at) || 'recently'}
                      {selected.source && ` · via ${selected.source.replace(/^gmail:/, 'Gmail · ').replace(/^suggestion:/, 'recommended by ').replace(/_/g, ' ')}`}
                      {selected.needs_review && ' · please check the details, the AI was not sure'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[selected.status ?? 'not_applied'].chip}`}>
                    {STATUS[selected.status ?? 'not_applied'].label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {onLoadAIEnhanced && (
                    <button
                      onClick={() => onLoadAIEnhanced(selected)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                    >
                      <Sparkles size={15} />
                      Tailor resume
                    </button>
                  )}
                  <a href={interviewHref(selected)} className={ghost}>
                    <Mic size={14} />
                    Practise interview
                  </a>
                  {selected.job_posting_url && (
                    <button onClick={() => apply(selected)} className={ghost}>
                      {selected.status === 'not_applied' ? 'Apply' : 'Open posting'}
                      <ArrowUpRight size={14} />
                    </button>
                  )}
                  <label className="ml-1 flex items-center gap-2 text-xs text-slate-500 dark:text-white/45">
                    Status
                    <select
                      value={selected.status ?? 'not_applied'}
                      onChange={(e) => onUpdateApplicationStatus?.(selected.id, e.target.value)}
                      disabled={!onUpdateApplicationStatus}
                      className="rounded-md border border-slate-200 bg-transparent px-2 py-1.5 text-sm text-slate-800 outline-none dark:border-white/10 dark:bg-[#0c0c0e] dark:text-white/85"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS[s].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <span className="ml-auto flex items-center gap-1">
                    {selected.job_description && (
                      <button
                        onClick={() => onViewJobDescription({ title: selected.position || '', company: selected.company_name || '', description: selected.job_description || '' })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white"
                        aria-label="Open description in a window"
                        title="Open description in a window"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onEditApplication(selected)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      aria-label="Edit application"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    {confirming ? (
                      <span className="flex items-center gap-1 rounded-lg bg-rose-50 pl-2 text-xs text-rose-700 dark:bg-rose-400/10 dark:text-rose-300" role="alert">
                        Delete this application?
                        <button
                          onClick={() => {
                            setConfirming(false);
                            onDeleteApplication(selected.id);
                          }}
                          className="rounded p-2 hover:bg-rose-100 dark:hover:bg-rose-400/10"
                          aria-label="Confirm delete"
                        >
                          <Check size={15} />
                        </button>
                        <button onClick={() => setConfirming(false)} className="rounded p-2 hover:bg-rose-100 dark:hover:bg-rose-400/10" aria-label="Keep application">
                          <X size={15} />
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirming(true)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-rose-300"
                        aria-label="Delete application"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {/* Facts */}
                <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  {[
                    { icon: <MapPin size={14} />, label: 'Location', value: selected.location, extra: selected.remote_option ? 'Remote' : '' },
                    { icon: <Building2 size={14} />, label: 'Type', value: selected.employment_type },
                    { icon: <Wallet size={14} />, label: 'Salary', value: selected.salary_range },
                    { icon: <User size={14} />, label: 'Contact', value: selected.contact_person },
                    { icon: <Mail size={14} />, label: 'Email', value: selected.contact_email },
                    { icon: <FileText size={14} />, label: 'Applied on', value: selected.status !== 'not_applied' ? day(selected.application_date) : '' },
                    { icon: <FileText size={14} />, label: 'Interview', value: day(selected.interview_date) },
                    { icon: <FileText size={14} />, label: 'Follow up', value: day(selected.follow_up_date) },
                  ]
                    .filter((f) => f.value || f.extra)
                    .map((f) => (
                      <div key={f.label} className="flex items-start gap-2.5">
                        <span className="mt-0.5 text-slate-400 dark:text-white/30">{f.icon}</span>
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500 dark:text-white/40">{f.label}</dt>
                          <dd className="break-words text-slate-800 dark:text-white/85">{[f.value, f.extra].filter(Boolean).join(' · ')}</dd>
                        </div>
                      </div>
                    ))}
                </dl>

                {/* Generated documents */}
                {(selected.resume_url || selected.cover_letter_url) && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {selected.resume_url && (
                      <a href={selected.resume_url} target="_blank" rel="noopener noreferrer" className={ghost}>
                        <FileText size={14} /> Tailored resume
                      </a>
                    )}
                    {selected.cover_letter_url && (
                      <a href={selected.cover_letter_url} target="_blank" rel="noopener noreferrer" className={ghost}>
                        <Mail size={14} /> Cover letter
                      </a>
                    )}
                  </div>
                )}

                {selected.notes && (
                  <section className="mt-6">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/40">Notes</h3>
                    <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700 dark:text-white/70">{selected.notes}</p>
                  </section>
                )}

                <section className="mt-6">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/40">About the job</h3>
                  {selected.job_description ? (
                    <p className="mt-1.5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-white/70">{selected.job_description}</p>
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-white/40">No description saved. Use Edit to paste one, so Tailor resume can match against it.</p>
                  )}
                </section>
              </div>
            </article>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-white/[0.06] dark:text-white/30">
        {rows.length === applications.length ? `${rows.length} ${rows.length === 1 ? 'application' : 'applications'}` : `${rows.length} of ${applications.length}`}
      </div>
    </section>
  );
};

export default ApplicationsTable;
