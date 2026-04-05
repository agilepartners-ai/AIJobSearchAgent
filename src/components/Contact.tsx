"use client";

import React, { useState } from 'react';
import { ArrowRight, Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';

const Contact: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setEmail('');
    }
  };

  return (
    <section id="contact" className="py-14 relative overflow-hidden" style={{ background: '#0D0D0D' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-10 rounded-full"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-0 relative z-10">
        {/* Full-width CTA block (#13) */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>
            Your Next Role Starts Here
          </span>
          <h2 className="text-white mt-4 mb-4">
            Your next role{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              starts here.
            </span>
          </h2>
          <p className="text-gray-400 mb-10" style={{ fontSize: '18px' }}>
            Join 12,000+ job seekers who found their dream role with our AI platform. Drop your email — we'll reach out within 2 hours.
          </p>

          {/* Single email input + CTA (#13) */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 px-5 py-4 rounded-xl text-white placeholder-gray-500 outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '15px',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 whitespace-nowrap group"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 24px rgba(124,58,237,0.35)', fontSize: '15px' }}
            >
              {submitted ? '✓ Got it!' : (
                <>
                  Get Started Free
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: '#4b5563' }}>
            No credit card required · Cancel anytime ·{' '}
            <Link href="/privacy-policy" className="hover:text-gray-400 underline transition-colors">Privacy Policy</Link>
          </p>
        </div>

        {/* Contact details — secondary, below the fold */}
        <div
          className="max-w-2xl mx-auto rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.15)' }}>
              <Phone size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <p className="text-white font-semibold" style={{ fontSize: '14px' }}>Phone</p>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>+1 (610) 704-2184</p>
              <p style={{ fontSize: '12px', color: '#4b5563' }}>Mon–Fri, 9AM–6PM EST</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.15)' }}>
              <Mail size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <p className="text-white font-semibold" style={{ fontSize: '14px' }}>Email</p>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>support@agilepartners-ai.com</p>
              <p style={{ fontSize: '12px', color: '#4b5563' }}>Response within 2 hours</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.15)' }}>
              <MapPin size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <p className="text-white font-semibold" style={{ fontSize: '14px' }}>Office</p>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>San Mateo, CA 94403</p>
              <p style={{ fontSize: '12px', color: '#4b5563' }}>United States</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
