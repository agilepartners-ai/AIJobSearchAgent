/**
 * Enhancement analytics, merged into the dashboard from the old standalone
 * /analytics-dashboard page. Same data, same maths; compact presentation.
 */
import { motion } from 'framer-motion';
import { Award, BarChart3, Calendar, Loader2, TrendingUp } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { listResumes } from '../../../services/resumeService';

interface EnhancementRecord {
  jobDescription?: string;
  matchScore?: number;
  feedback?: 'positive' | 'negative' | null;
  timestamp?: { seconds: number } | string;
}

const toDate = (timestamp: EnhancementRecord['timestamp']): Date | null => {
  if (!timestamp) return null;
  if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? null : d;
};

const scoreTone = (score: number) =>
  score >= 85
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : score >= 70
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      : score >= 50
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';

export default function AnalyticsView({ uid }: { uid: string }) {
  const [records, setRecords] = useState<EnhancementRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Every generated résumé carries its match analysis, so the history is read from those.
    listResumes(uid)
      .then((resumes) => {
        if (cancelled) return;
        const data: EnhancementRecord[] = resumes
          .filter((r) => r.ai)
          .map((r) => ({
            jobDescription: [r.ai!.jobTitle, r.ai!.company].filter(Boolean).join(' – '),
            matchScore: r.ai!.analysis.match_score,
            timestamp: r.updatedAt,
          }));
        setRecords(data.sort((a, b) => (toDate(b.timestamp)?.getTime() ?? 0) - (toDate(a.timestamp)?.getTime() ?? 0)));
      })
      .catch(() => !cancelled && setRecords([]));
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const summary = useMemo(() => {
    const list = records ?? [];
    const withFeedback = list.filter((r) => r.feedback === 'positive' || r.feedback === 'negative');
    const positive = withFeedback.filter((r) => r.feedback === 'positive').length;
    return {
      average: list.length ? Math.round(list.reduce((sum, r) => sum + (r.matchScore ?? 0), 0) / list.length) : 0,
      positiveRatio: withFeedback.length ? Math.round((positive / withFeedback.length) * 100) : 0,
      positive,
      responses: withFeedback.length,
      total: list.length,
    };
  }, [records]);

  if (records === null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={16} /> Loading analytics…
      </div>
    );
  }

  const cards = [
    { icon: <TrendingUp size={18} />, label: 'Average match score', value: `${summary.average}%`, tone: 'text-blue-600' },
    {
      icon: <Award size={18} />,
      label: 'Positive feedback',
      value: `${summary.positiveRatio}%`,
      hint: `${summary.positive} of ${summary.responses} responses`,
      tone: 'text-emerald-600',
    },
    { icon: <BarChart3 size={18} />, label: 'Enhancements', value: String(summary.total), tone: 'text-violet-600' },
  ];

  return (
    <div className="h-full overflow-y-auto px-4 pb-10 pt-4 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={`flex items-center gap-2 ${c.tone}`}>
              {c.icon}
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</span>
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{c.value}</div>
            {c.hint && <div className="text-xs text-slate-400">{c.hint}</div>}
          </motion.div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Calendar size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent enhancements</h2>
        </div>

        {records.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <BarChart3 className="mx-auto mb-3 text-slate-300" size={36} />
            <p className="text-sm text-slate-600 dark:text-slate-300">No enhancement data yet</p>
            <p className="mt-1 text-xs text-slate-400">Enhance a resume against a job to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Job</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Match</th>
                  <th className="px-4 py-2 text-left font-medium">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.slice(0, 20).map((item, idx) => {
                  const date = toDate(item.timestamp);
                  return (
                    <tr key={idx} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="max-w-xs truncate px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                        {item.jobDescription || 'Untitled job'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {date ? date.toLocaleDateString() : '—'}
                        <span className="block text-xs text-slate-400">
                          {date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreTone(item.matchScore ?? 0)}`}>
                          {item.matchScore ?? 0}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {item.feedback === 'positive' ? (
                          <span className="text-emerald-600">Helpful</span>
                        ) : item.feedback === 'negative' ? (
                          <span className="text-rose-600">Not helpful</span>
                        ) : (
                          <span className="text-slate-400">No feedback</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
