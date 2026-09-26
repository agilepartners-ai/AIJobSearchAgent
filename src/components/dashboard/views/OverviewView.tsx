/**
 * Applications overview: the stat row and the applications table.
 * Presentational — every action is handled by the dashboard shell.
 */
import React from 'react';
import type { ApplicationStats, JobApplication } from '../../../services/firebaseJobApplicationService';
import ApplicationsTable from '../ApplicationsTable';

const STATS: { key: keyof ApplicationStats; label: string }[] = [
  { key: 'total', label: 'Total' },
  { key: 'applied', label: 'Applied' },
  { key: 'pending', label: 'To apply' },
  { key: 'interviews', label: 'Interviewing' },
  { key: 'offers', label: 'Offers' },
  { key: 'rejected', label: 'Closed' },
];

interface Props {
  stats: ApplicationStats;
  applications: JobApplication[];
  searchTerm: string;
  statusFilter: string;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onEditApplication: (application: JobApplication) => void;
  onViewJobDescription: (job: { title: string; company: string; description: string }) => void;
  onDeleteApplication: (id: string) => void;
  onUpdateApplicationStatus: (id: string, status: string) => void;
  onLoadAIEnhanced: (application: JobApplication) => void;
}

export default function OverviewView({ stats, applications, ...table }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-4 py-4 sm:px-6">
      <div className="grid shrink-0 grid-cols-3 gap-2 sm:grid-cols-6">
        {STATS.map((s) => (
          <div
            key={s.key}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-white/[0.08] dark:bg-[#0c0c0e]"
          >
            <div className="truncate text-[11px] text-slate-500 dark:text-white/40">{s.label}</div>
            <div className="text-xl font-medium tabular-nums text-slate-900 dark:text-white/90">{stats[s.key]}</div>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ApplicationsTable
          applications={applications.map((app) => ({ ...app, updated_at: app.updated_at ?? '' }))}
          {...table}
        />
      </div>
    </div>
  );
}
