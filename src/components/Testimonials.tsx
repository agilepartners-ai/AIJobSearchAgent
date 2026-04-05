"use client";

import React from 'react';
import { Star } from 'lucide-react';

interface TestimonialProps {
  content: string;
  name: string;
  role: string;
  company: string;
  image: string;
  previousRole?: string;
}

const TestimonialCard: React.FC<TestimonialProps> = ({ content, name, role, company, image }) => (
  <div
    className="flex gap-5 p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1"
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.25)';
      (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(124,58,237,0.1)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
      (e.currentTarget as HTMLElement).style.boxShadow = '';
    }}
  >
    {/* Avatar */}
    <div className="flex-shrink-0">
      <img
        src={image}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: '64px', height: '64px', filter: 'grayscale(20%)' }}
      />
    </div>

    {/* Content */}
    <div className="flex flex-col justify-center min-w-0">
      {/* Stars */}
      <div className="flex gap-0.5 mb-2">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />
        ))}
      </div>
      {/* Quote — 2 lines max */}
      <p
        className="text-gray-300 mb-3"
        style={{ fontSize: '14px', lineHeight: '1.55', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        "{content}"
      </p>
      {/* Name + role + company */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-white font-semibold" style={{ fontSize: '13px' }}>{name}</p>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>{role}</p>
        </div>
        <span
          className="ml-auto font-semibold px-2.5 py-1 rounded-md"
          style={{ fontSize: '11px', color: '#4b5563', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}
        >
          {company}
        </span>
      </div>
    </div>
  </div>
);

const Testimonials: React.FC = () => {
  const testimonials: TestimonialProps[] = [
    {
      content: "The resume optimization completely transformed my job search. I went from zero responses to landing interviews at top tech companies. The AI suggestions were spot-on.",
      name: "Sarah Johnson",
      role: "Senior SWE",
      company: "Google",
      previousRole: "Junior Developer",
      image: "https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1"
    },
    {
      content: "The mock interview practice was life-changing. I was terrified of interviews — AI coaching helped me build confidence and perfect my answers. I aced every single one.",
      name: "Michael Chen",
      role: "Product Manager",
      company: "Microsoft",
      previousRole: "Business Analyst",
      image: "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1"
    },
    {
      content: "The job dashboard surfaced opportunities I never would have found myself. Personalized recommendations saved me hours every day and got me hired in 3 weeks.",
      name: "Dr. Emily Rodriguez",
      role: "Data Scientist",
      company: "Netflix",
      previousRole: "Research Analyst",
      image: "https://images.pexels.com/photos/5397723/pexels-photo-5397723.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1"
    },
  ];

  return (
    <section className="py-14" style={{ background: '#141414' }}>
      <div className="max-w-6xl mx-auto px-0">
        {/* Section header (#09) */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>
            Social Proof
          </span>
          <h2 className="text-white mt-3 mb-4">
            Real results,{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              real job seekers.
            </span>
          </h2>
          <p className="text-gray-400">
            Professionals who transformed their careers with our AI platform.
          </p>
        </div>

        {/* Compact horizontal cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
