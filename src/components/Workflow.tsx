"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/** The five steps describe what the product does today. */
const steps = [
  {
    num: '01',
    imageSrc: '/Step_1_JobSearch_AI.png',
    title: 'Find a Role',
    description: 'Search live job listings and save the roles you want, or add a job you found yourself.',
    href: '/job-application-tracker',
  },
  {
    num: '02',
    imageSrc: '/Step_2_EditeResume_AI.png',
    title: 'Tailor Your Resume',
    description: 'Upload a PDF or text résumé. The AI rewrites it for the job and writes a matching cover letter.',
    href: '/resume-tailoring',
  },
  {
    num: '03',
    imageSrc: '/Step_3_FillApplication_AI.png',
    title: 'Review and Export',
    description: 'Edit the result in the résumé editor, then download a PDF or the LaTeX source.',
    href: '/ats-resume-builder',
  },
  {
    num: '04',
    imageSrc: '/Step_4_KeepTrack_AI.png',
    title: 'Track Every Application',
    description: 'Keep each application, its status, job description, contact and notes in one list.',
    href: '/job-application-tracker',
  },
  {
    num: '05',
    imageSrc: '/Step_5_MockInterview_AI.png',
    title: 'Practise the Interview',
    description: 'Start an AI mock interview set up for the role you are applying to.',
    href: '/mock-interview',
  },
];

const Workflow: React.FC = () => {
  return (
    <section id="workflow" className="py-14 relative overflow-hidden" style={{ background: '#110E1F' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] opacity-20 rounded-full"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>How it works</span>
          <h2 className="text-white mt-3 mb-4">
            From job posting to{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              tailored application.
            </span>
          </h2>
          <p className="text-gray-400" style={{ fontSize: '18px' }}>
            Five steps, each one a real part of the app.
          </p>
        </div>

        <ol className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 list-none p-0 m-0">
          <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4) 15%, rgba(124,58,237,0.4) 85%, transparent)' }} />
          {steps.map((step) => (
            <li key={step.num} className="relative">
              <Link
                href={step.href}
                className="flex flex-col items-center text-center transition-all duration-300 p-6 rounded-2xl h-full hover:-translate-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm mb-4 z-10 relative"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,0.4)', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                >
                  {step.num}
                </span>
                <img src={step.imageSrc} alt="" width={64} height={64} loading="lazy" decoding="async" className="w-16 h-16 object-contain mb-4" />
                <h3 className="text-white mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>{step.title}</h3>
                <p className="m-0" style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.6' }}>{step.description}</p>
              </Link>
            </li>
          ))}
        </ol>

        <div className="text-center mt-10">
          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white border transition-all hover:-translate-y-0.5 group"
            style={{ borderColor: 'rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.08)' }}
          >
            Create your account
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Workflow;
