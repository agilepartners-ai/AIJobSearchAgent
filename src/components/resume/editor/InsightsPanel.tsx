/** Match score, strengths, gaps and keywords for a resume generated against a job. */
import { AlertCircle, CheckCircle, Lightbulb, Target } from 'lucide-react';
import React from 'react';
import type { AiContext } from '../../../lib/resume/schema';

const tone = (score: number) =>
  score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600';

const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900';

function List({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className={card}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        {icon}
        {title}
      </h3>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {items.map((item, i) => (
          <li key={i} className="leading-snug">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Chips({ title, items, kind }: { title: string; items: string[]; kind: 'good' | 'bad' }) {
  if (!items.length) return null;
  const cls =
    kind === 'good'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
  return (
    <section className={card}>
      <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((k) => (
          <span key={k} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
            {k}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function InsightsPanel({ ai }: { ai: AiContext }) {
  const { analysis } = ai;
  return (
    <div className="space-y-3">
      <section className={`${card} text-center`}>
        <div className="mb-1 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
          <Target size={14} /> Match for {ai.jobTitle} at {ai.company}
        </div>
        <div className={`text-4xl font-semibold tabular-nums ${tone(analysis.match_score)}`}>
          {analysis.match_score}
          <span className="text-xl">%</span>
        </div>
      </section>
      <List icon={<CheckCircle size={15} className="text-emerald-600" />} title="Strengths" items={analysis.strengths} />
      <List icon={<AlertCircle size={15} className="text-amber-600" />} title="Gaps" items={analysis.gaps} />
      <List icon={<Lightbulb size={15} className="text-indigo-600" />} title="Suggestions" items={analysis.suggestions} />
      <Chips title="Keywords matched" items={analysis.present_keywords} kind="good" />
      <Chips title="Keywords missing" items={analysis.missing_keywords} kind="bad" />
    </div>
  );
}
