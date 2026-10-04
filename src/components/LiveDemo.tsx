"use client";

import React, { useState } from 'react';
import { BarChart2, LayoutTemplate } from 'lucide-react';

/**
 * Product tour. Every figure and image here is real: the screenshots are of the current app
 * (rendered with fictional sample data) and the facts below are properties of the product.
 */
const TABS = [
  {
    id: 'applications',
    label: 'Applications',
    icon: BarChart2,
    image: '/images/app-applications.webp',
    alt: 'The AIJobSearchAgent applications screen: a searchable list of roles with status filters and the selected job description beside it',
    caption: 'Every application in one searchable list, with its job description, status and a Tailor resume button.',
  },
  {
    id: 'templates',
    label: 'Résumé templates',
    icon: LayoutTemplate,
    image: '/images/app-templates.webp',
    alt: 'The résumé template gallery showing the same résumé in several single- and two-column templates',
    caption: 'Pick a template and see your own résumé in it. Edit live, then export a PDF or the LaTeX source.',
  },
] as const;

const FACTS = [
  { value: '12', label: 'résumé templates' },
  { value: 'PDF + LaTeX', label: 'export formats' },
  { value: '10–30 s', label: 'typical time to generate' },
  { value: '5 / day', label: 'tailored sets per account' },
];

const LiveDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('applications');
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <section id="live-demo" className="py-16 relative" style={{ background: '#0D0D0D' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-48 opacity-10"
          style={{ background: 'radial-gradient(ellipse, #7c3aed, transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>Product tour</span>
          <h2 className="text-white mt-3 mb-3">
            See the{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>actual product.</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            These are screenshots of the app itself, shown with fictional sample data.
          </p>
        </div>

        <div className="flex justify-center mb-8" role="tablist" aria-label="Product screens">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: active ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    boxShadow: active ? '0 2px 12px rgba(124,58,237,0.3)' : 'none',
                  }}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <figure className="rounded-2xl overflow-hidden m-0" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <img
            src={tab.image}
            alt={tab.alt}
            width={1280}
            height={tab.id === 'applications' ? 702 : 644}
            loading="lazy"
            decoding="async"
            className="w-full h-auto block"
          />
          <figcaption className="px-5 py-3 text-sm text-gray-400" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {tab.caption}
          </figcaption>
        </figure>

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <dt className="sr-only">{f.label}</dt>
              <dd className="m-0 font-bold text-white" style={{ fontSize: '22px' }}>{f.value}</dd>
              <p className="mt-1 mb-0" style={{ fontSize: '12px', color: '#6b7280' }} aria-hidden="true">{f.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default LiveDemo;
