"use client";

import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Load Three.js viz only client-side (no SSR)
const Interactive3DVisualization = dynamic(
  () => import('./Interactive3DVisualization'),
  { ssr: false }
);

const Hero: React.FC = () => {
  const [showChevron, setShowChevron] = useState(true);

  useEffect(() => {
    const onScroll = () => setShowChevron(window.scrollY < 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#0D0D0D' }}>

      {/* ── Three.js background — full bleed, pointer-events none ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Interactive3DVisualization className="w-full h-full opacity-60" />
      </div>

      {/* Ambient colour overlays on top of Three.js */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6d28d9 0%, transparent 70%)' }} />
        <div className="absolute -bottom-20 right-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── Content ── */}
      <div className="w-full relative z-10 pt-24 pb-12">
        <div className="flex flex-col lg:flex-row items-center min-h-[70vh]">

          {/* LEFT: Text */}
          <div className="flex-1 flex flex-col items-start px-8 lg:pl-16 lg:pr-6 py-8 lg:py-0">

            {/* Label pill — mobile only */}
            <span className="lg:hidden inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ borderColor: 'rgba(109,40,217,0.4)', color: '#a78bfa', background: 'rgba(109,40,217,0.1)' }}>
              ✦ AI-Powered Career Platform
            </span>

            {/* H1 */}
            <h1 className="text-white mb-5" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif", lineHeight: 1.08 }}>
              Land Your{' '}
              <span style={{ background: 'linear-gradient(135deg, #818cf8, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Dream Job
              </span>
              <br />
              With Smart AI
            </h1>

            {/* Subhead */}
            <p className="text-gray-400 mb-5" style={{ fontSize: '17px', lineHeight: '1.65', maxWidth: '480px' }}>
              Transform your job search with personalized resume optimization, AI-powered mock interviews, and smart job matching — all in one platform.
            </p>

            {/* Stat chips */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-8" style={{ fontSize: '13px', color: '#9ca3af' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                12,000 users
              </span>
              <span style={{ color: '#374151' }}>·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                87% interview rate
              </span>
              <span style={{ color: '#374151' }}>·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                48hr avg. to first match
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-2xl group"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 24px rgba(124,58,237,0.35)', fontSize: '15px' }}
              >
                Start Free Today
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white border transition-all hover:-translate-y-0.5"
                style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', fontSize: '15px' }}
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* RIGHT: Dashboard in browser chrome */}
          <div className="flex-1 flex items-center justify-center lg:justify-end pr-0 lg:pr-10 py-10 lg:py-0 w-full">
            <div
              className="relative w-full"
              style={{
                maxWidth: '560px',
                transform: 'rotate(4deg)',
                filter: 'drop-shadow(0 24px 60px rgba(124,58,237,0.22)) drop-shadow(0 8px 24px rgba(0,0,0,0.7))'
              }}
            >
              {/* Browser chrome */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a2e' }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#16213e', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFBD2E' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28CA41' }} />
                  </div>
                  <div className="flex-1 mx-3 px-3 py-0.5 rounded text-xs text-center"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280', fontSize: '11px' }}>
                    app.aijobsearchagent.com/dashboard
                  </div>
                </div>
                <img
                  src="/herosection2.png"
                  alt="AIJobSearchAgent dashboard"
                  className="w-full block"
                  style={{ maxHeight: '440px', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>

              {/* Floating badge */}
              <div
                className="absolute -bottom-3 -left-4 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', boxShadow: '0 6px 20px rgba(124,58,237,0.4)', transform: 'rotate(-4deg)' }}
              >
                87% Interview Rate
              </div>

              {/* Floating stat */}
              <div
                className="absolute -top-3 -right-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-white text-center"
                style={{ background: 'rgba(16,16,32,0.95)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', transform: 'rotate(-4deg)' }}
              >
                <div className="text-xl font-extrabold text-violet-400">15</div>
                <div className="text-gray-400" style={{ fontSize: '10px' }}>min to apply</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bouncing chevron */}
      {showChevron && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <ChevronDown size={22} className="animate-bounce-chevron" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
      )}
    </div>
  );
};

export default Hero;
