"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/* ── Animated counter hook ── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

const steps = [
  {
    num: '01',
    imageSrc: '/Step_1_JobSearch_AI.png',
    title: 'Find Your Match',
    description: 'Our AI scans thousands of postings to surface perfect-fit roles for your skills and goals — in seconds.',
  },
  {
    num: '02',
    imageSrc: '/Step_2_EditeResume_AI.png',
    title: 'Tailor Your Resume',
    description: 'One click adapts your resume and generates a targeted cover letter for every job description.',
  },
  {
    num: '03',
    imageSrc: '/Step_3_FillApplication_AI.png',
    title: 'Apply in One Click',
    description: 'Submit applications effortlessly using smart autofill across all major career platforms.',
  },
  {
    num: '04',
    imageSrc: '/Step_4_KeepTrack_AI.png',
    title: 'Track Every Application',
    description: 'Monitor all your applications in a unified dashboard with real-time status updates.',
  },
  {
    num: '05',
    imageSrc: '/Step_5_MockInterview_AI.png',
    title: 'Ace Every Interview',
    description: 'Practice with AI-powered mock interviews tailored to the specific job and company.',
  },
];

const companyLogos = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Apple',
];

const Workflow: React.FC = () => {
  const statRef = useRef<HTMLDivElement>(null);
  const [statVisible, setStatVisible] = useState(false);
  const count = useCountUp(15, 1400, statVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatVisible(true); },
      { threshold: 0.4 }
    );
    if (statRef.current) observer.observe(statRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="workflow" className="py-14 relative overflow-hidden" style={{ background: '#110E1F' }}>
      {/* Subtle purple ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] opacity-20 rounded-full"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-0 relative z-10">

        {/* ── Section header (#09) ── */}
        <div className="text-center max-w-3xl mx-auto mb-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>
            From Upload to Offer Letter
          </span>
          <h2 className="text-white mt-3 mb-4">
            From upload to offer letter<br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              in 48 hours.
            </span>
          </h2>
          <p className="text-gray-400" style={{ fontSize: '18px' }}>
            Stop sending into the void. Our AI does the heavy lifting — you just pick the role.
          </p>
        </div>

        {/* ── "15 min" animated stat (#10) ── */}
        <div ref={statRef} className="flex justify-center mb-10">
          <div className={`text-center ${statVisible ? 'stat-appear' : 'opacity-0'}`}>
            <div className="font-extrabold leading-none" style={{ fontSize: '80px', fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'linear-gradient(135deg, #818cf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {count}
            </div>
            <div className="text-gray-400 mt-1" style={{ fontSize: '15px' }}>
              minutes to apply for <span className="text-white font-semibold">10 jobs</span> — vs. days the old way
            </div>
          </div>
        </div>

        {/* ── Horizontal timeline (#03) ── */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4) 15%, rgba(124,58,237,0.4) 85%, transparent)' }} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {steps.map((step, i) => (
              <div
                key={i}
                className="relative flex flex-col items-center text-center group cursor-default transition-all duration-300 p-6 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 48px rgba(124,58,237,0.18)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                {/* Number bubble */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm mb-4 z-10 relative"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,0.4)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  {step.num}
                </div>
                <img src={step.imageSrc} alt={step.title} className="w-16 h-16 object-contain mb-4" />
                <h3 className="text-white mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.6' }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Social proof strip (#05) — replaces logo repeat ── */}
        <div className="mt-10 text-center">
          <p className="mb-6 font-semibold" style={{ fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Trusted by 12,000+ job seekers · Hired at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6">
            {companyLogos.map((name) => (
              <span
                key={name}
                className="font-bold"
                style={{ fontSize: '15px', color: '#4b5563', filter: 'grayscale(1)', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* ── CTA (white secondary style) ── */}
        <div className="text-center mt-8">
          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white border transition-all hover:-translate-y-0.5 group"
            style={{ borderColor: 'rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.08)' }}
          >
            Start Your AI-Powered Journey
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Workflow;
