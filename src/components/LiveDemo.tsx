"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, FileText, BarChart2, MapPin, Building2, Clock, Star, TrendingUp } from 'lucide-react';

/* ── Animated counter ── */
function useCountUp(end: number, duration = 1600, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, end, duration]);
  return val;
}

const jobCards = [
  { title: 'Senior Software Engineer', company: 'Google', location: 'Mountain View, CA', match: 94, type: 'Full-time', salary: '$180k–$240k', logo: '🔵', days: '2d ago' },
  { title: 'ML Engineer', company: 'OpenAI', location: 'San Francisco, CA', match: 91, type: 'Full-time', salary: '$200k–$280k', logo: '🟢', days: '1d ago' },
  { title: 'Product Manager', company: 'Microsoft', location: 'Redmond, WA', match: 88, type: 'Full-time', salary: '$160k–$210k', logo: '🟦', days: '3d ago' },
  { title: 'Data Scientist', company: 'Netflix', location: 'Los Gatos, CA', match: 85, type: 'Full-time', salary: '$170k–$230k', logo: '🔴', days: '5d ago' },
];

const stats = [
  { label: 'Active Users', value: 12400, suffix: '+', decimals: false },
  { label: 'Callback Rate', value: 87, suffix: '%', decimals: false },
  { label: 'Jobs Matched', value: 94300, suffix: '+', decimals: false },
  { label: 'Avg. Time to Offer', value: 18, suffix: ' days', decimals: false },
];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'resume', label: 'Resume AI', icon: FileText },
  { id: 'jobs', label: 'Job Analysis', icon: Briefcase },
];

const LiveDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const statRef = useRef<HTMLDivElement>(null);
  const [statVisible, setStatVisible] = useState(false);

  const c0 = useCountUp(12400, 1800, statVisible);
  const c1 = useCountUp(87, 1400, statVisible);
  const c2 = useCountUp(94300, 1800, statVisible);
  const c3 = useCountUp(18, 1200, statVisible);
  const counts = [c0, c1, c2, c3];

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatVisible(true); }, { threshold: 0.3 });
    if (statRef.current) obs.observe(statRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="live-demo" className="py-16 relative" style={{ background: '#0D0D0D' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-48 opacity-10"
          style={{ background: 'radial-gradient(ellipse, #7c3aed, transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>Live Product Demo</span>
          <h2 className="text-white mt-3 mb-3">
            See it work{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>in real time.</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">No sign-up needed. Explore the exact tools 12,000+ job seekers use every day.</p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: active ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    boxShadow: active ? '0 2px 12px rgba(124,58,237,0.3)' : 'none',
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#16213e', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex gap-1.5">
              {['#FF5F57','#FFBD2E','#28CA41'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
            </div>
            <div className="flex-1 mx-4 px-3 py-0.5 rounded text-center" style={{ background:'rgba(255,255,255,0.05)', color:'#4b5563', fontSize:'11px' }}>
              app.aijobsearchagent.com/{activeTab}
            </div>
          </div>

          <div className="p-6 min-h-[380px]">
            {/* DASHBOARD TAB — real screenshot */}
            {activeTab === 'dashboard' && (
              <div className="flex justify-center">
                <img
                  src="/herosection2.png"
                  alt="AIJobSearchAgent Dashboard"
                  className="w-full rounded-xl object-cover object-top"
                  style={{ maxHeight: '460px', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
            )}

            {/* RESUME AI TAB */}
            {activeTab === 'resume' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'ATS Score', before: 35, after: 92, color: '#34d399' },
                    { label: 'Keyword Match', before: 28, after: 89, color: '#818cf8' },
                    { label: 'Readability', before: 60, after: 95, color: '#fb923c' },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex justify-between mb-2">
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{m.label}</span>
                        <span style={{ fontSize: '12px', color: m.color, fontWeight: 700 }}>{m.after}%</span>
                      </div>
                      <div className="h-2 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${m.after}%`, background: `linear-gradient(90deg,${m.color}80,${m.color})` }} />
                      </div>
                      <p style={{ fontSize: '10px', color: '#4b5563' }}>Was {m.before}% before AI</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,0,0,0.15)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: '#f87171' }}>Missing Keywords</p>
                    {['TypeScript', 'Kubernetes', 'CI/CD', 'REST APIs', 'Agile'].map(k => (
                      <span key={k} className="inline-block m-1 px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>{k}</span>
                    ))}
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(52,211,153,0.15)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: '#34d399' }}>AI Added Keywords</p>
                    {['TypeScript', 'Kubernetes', 'CI/CD', 'REST APIs', 'Agile'].map(k => (
                      <span key={k} className="inline-block m-1 px-2 py-0.5 rounded-md text-xs" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>{k}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* JOB ANALYSIS TAB */}
            {activeTab === 'jobs' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Jobs Analysed', val: '2,847', icon: '📊' },
                    { label: 'Perfect Matches', val: '147', icon: '🎯' },
                    { label: 'Salary Insights', val: '$165k avg', icon: '💰' },
                    { label: 'Response Rate', val: '38%', icon: '📬' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <p className="font-bold text-white" style={{ fontSize: '18px' }}>{s.val}</p>
                      <p style={{ fontSize: '11px', color: '#6b7280' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-white font-semibold text-sm mb-4">Top Hiring Companies for Your Profile</p>
                  {[
                    { co: 'Google', roles: 23, match: 94 },
                    { co: 'Microsoft', roles: 18, match: 91 },
                    { co: 'Amazon', roles: 31, match: 88 },
                    { co: 'Meta', roles: 12, match: 85 },
                  ].map(c => (
                    <div key={c.co} className="flex items-center gap-3 mb-3">
                      <span className="text-white text-sm font-medium w-24">{c.co}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${c.match}%`, background: 'linear-gradient(90deg,#7c3aed,#818cf8)' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>{c.match}%</span>
                      <span style={{ fontSize: '11px', color: '#4b5563' }}>{c.roles} open</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Animated stats strip */}
        <div ref={statRef} className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label} className="text-center rounded-2xl py-5 px-3" style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <p className="font-extrabold" style={{ fontSize: '32px', color: '#a78bfa', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {statVisible ? counts[i].toLocaleString() : '0'}{s.suffix}
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveDemo;
