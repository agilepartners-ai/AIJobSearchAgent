"use client";

import React from 'react';
import { CheckCircle, XCircle, Zap } from 'lucide-react';

const missingKeywords = ['TypeScript', 'Kubernetes', 'CI/CD', 'REST APIs', 'System Design'];
const addedKeywords = ['TypeScript', 'Kubernetes', 'CI/CD', 'REST APIs', 'System Design'];

const scores = [
  { label: 'Match score (sample)', before: 35, after: 92, color: '#34d399' },
  { label: 'Keyword coverage (sample)', before: 28, after: 89, color: '#818cf8' },
  { label: 'Readability (sample)', before: 60, after: 95, color: '#fb923c' },
];

const ResumeShowcase: React.FC = () => {
  return (
    <section className="py-16 relative overflow-hidden" style={{ background: '#141414' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-96 h-64 opacity-10 rounded-full"
          style={{ background: 'radial-gradient(ellipse,#7c3aed,transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>Resume AI · illustrative example</span>
          <h2 className="text-white mt-3 mb-3">
            From generic{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              to tailored.
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">The AI compares your résumé with the job description, scores the match, lists the keywords you cover or miss, and rewrites the résumé for that role.</p>
        </div>

        {/* Before / After */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          {/* BEFORE */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex items-center gap-2">
                <XCircle size={16} style={{ color: '#f87171' }} />
                <span className="text-sm font-semibold" style={{ color: '#f87171' }}>Before — Generic Resume</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                Example: low match
              </span>
            </div>
            <div className="p-5">
              <img
                src="/images/app-templates.webp"
                alt="Before: an untailored résumé shown with a muted filter"
                loading="lazy"
                decoding="async"
                className="w-full rounded-xl object-cover object-top"
                style={{ maxHeight: '320px', filter: 'grayscale(20%) brightness(0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {missingKeywords.map(k => (
                  <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <XCircle size={10} /> {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(52,211,153,0.25)' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ background: 'rgba(52,211,153,0.08)', borderBottom: '1px solid rgba(52,211,153,0.15)' }}>
              <div className="flex items-center gap-2">
                <Zap size={16} style={{ color: '#34d399' }} />
                <span className="text-sm font-semibold" style={{ color: '#34d399' }}>After — AI-Enhanced</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                Example: high match
              </span>
            </div>
            <div className="p-5">
              <img
                src="/images/app-templates.webp"
                alt="After: the same résumé tailored to a job, shown at full colour"
                loading="lazy"
                decoding="async"
                className="w-full rounded-xl object-cover object-top"
                style={{ maxHeight: '320px', filter: 'brightness(1)', border: '1px solid rgba(52,211,153,0.15)', boxShadow: '0 0 32px rgba(52,211,153,0.08)' }}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {addedKeywords.map(k => (
                  <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs"
                    style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <CheckCircle size={10} /> {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Score bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {scores.map(s => (
            <div key={s.label} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex justify-between items-center mb-3">
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{s.label}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '12px', color: '#f87171', textDecoration: 'line-through' }}>{s.before}%</span>
                  <span style={{ fontSize: '14px', color: s.color, fontWeight: 700 }}>{s.after}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-[1.5s]"
                  style={{ width: `${s.after}%`, background: `linear-gradient(90deg,${s.color}60,${s.color})` }} />
              </div>
              <p className="mt-2" style={{ fontSize: '11px', color: '#4b5563' }}>+{s.after - s.before} points improvement</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-6" style={{ fontSize: '12px', color: '#6b7280' }}>
          Illustration only: the scores and keywords above are sample values, not a result you should expect. Your match analysis comes from your own résumé and the job you paste in.
        </p>
      </div>
    </section>
  );
};

export default ResumeShowcase;
