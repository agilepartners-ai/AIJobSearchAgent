"use client";

import React, { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { HOME_FAQ } from '../lib/seo/faq';

const faqs = HOME_FAQ;

const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 relative" style={{ background: '#0D0D0D' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-72 h-72 opacity-10 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(ellipse,#7c3aed,transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

          {/* ── LEFT sticky column ── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-28">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>FAQ</span>
              <h2 className="text-white mt-3 mb-4">
                Questions?{' '}
                <span style={{ background: 'linear-gradient(135deg,#818cf8,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  We have answers.
                </span>
              </h2>
              <p className="text-gray-400 mb-8" style={{ fontSize: '15px', lineHeight: '1.7' }}>
                What it does, what it costs, which files it reads, and where your data goes.
              </p>

              {/* CTA box */}
              <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))', border: '1px solid rgba(124,58,237,0.25)' }}>
                <p className="text-white font-semibold mb-1" style={{ fontSize: '15px' }}>Still have questions?</p>
                <p className="text-gray-400 text-sm mb-4">Email us and a person will reply.</p>
                <Link
                  href="#contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 group"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                >
                  Contact Support
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── RIGHT accordion ── */}
          <div className="lg:col-span-3 space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    border: isOpen ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(255,255,255,0.07)',
                    background: isOpen ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span
                      className="font-semibold pr-4"
                      style={{ fontSize: '14px', color: isOpen ? '#c4b5fd' : 'rgba(255,255,255,0.85)', lineHeight: '1.4' }}
                    >
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={18}
                      className="flex-shrink-0 transition-transform duration-300"
                      style={{ color: isOpen ? '#a78bfa' : '#4b5563', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: isOpen ? '400px' : '0' }}
                  >
                    <p className="px-5 pb-5 m-0" style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.7' }}>
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
