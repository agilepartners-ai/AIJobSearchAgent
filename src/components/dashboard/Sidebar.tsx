/**
 * The dashboard's only navigation. Views live in one page, so switching is a
 * state change, not a page load — the indicator slides between items rather
 * than redrawing.
 */
import { motion } from 'framer-motion';
import { BarChart3, BookOpen, FileText, LayoutDashboard, Plus, Search, X } from 'lucide-react';
import React from 'react';

export type DashboardView = 'overview' | 'resumes' | 'documents' | 'analytics';

const NAV: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Applications', icon: <LayoutDashboard size={17} /> },
  { id: 'resumes', label: 'Resume Studio', icon: <FileText size={17} /> },
  { id: 'documents', label: 'Saved documents', icon: <BookOpen size={17} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={17} /> },
];

interface Props {
  view: DashboardView;
  onView: (view: DashboardView) => void;
  onFindJobs: () => void;
  onAddApplication: () => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ view, onView, onFindJobs, onAddApplication, open, onClose }: Props) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={onClose} aria-hidden />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-white/[0.07] dark:bg-[#0a0a0b]/95 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
            JS
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Job Search Agent</span>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800" aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 px-2">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onView(item.id);
                  onClose();
                }}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                    className="absolute inset-0 rounded-xl bg-slate-100 dark:bg-white/[0.07]"
                  />
                )}
                <span className="relative">{item.icon}</span>
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-1.5 border-t border-slate-100 p-3 dark:border-slate-800">
          <button
            onClick={onFindJobs}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Search size={16} /> Find jobs
          </button>
          <button
            onClick={onAddApplication}
            className="flex w-full items-center gap-2.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-95 dark:bg-white dark:text-slate-900"
          >
            <Plus size={16} /> Add application
          </button>
        </div>
      </aside>
    </>
  );
}
