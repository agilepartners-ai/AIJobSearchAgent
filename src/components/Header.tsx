"use client";

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Workflow', href: '#workflow' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Live Demo', href: '#workflow' },
  ];

  return (
    <header
      className="fixed w-full z-[60] transition-all duration-500"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: scrolled ? 'rgba(13,13,13,0.88)' : 'rgba(13,13,13,0.4)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 32px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      {/* 3-column layout: Logo | Nav Center | CTAs */}
      <div className="w-full px-4 sm:px-6">
        <div
          className="grid items-center"
          style={{
            height: scrolled ? '60px' : '72px',
            transition: 'height 0.4s ease',
            gridTemplateColumns: '1fr auto 1fr',
          }}
        >
          {/* LEFT — Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img
                src="/AGENT_Logo.png"
                alt="AIJobSearchAgent"
                className="w-auto transition-all duration-300"
                style={{ height: scrolled ? '34px' : '42px' }}
              />
            </Link>
          </div>

          {/* CENTER — Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(item => (
              <a
                key={item.label}
                href={item.href}
                className="font-medium text-sm whitespace-nowrap transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.65)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
              >
                {item.label === 'Live Demo' ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {item.label}
                  </span>
                ) : item.label}
              </a>
            ))}
          </nav>

          {/* RIGHT — CTAs */}
          <div className="hidden md:flex items-center gap-3 justify-end">
            <Link
              href="/login"
              className="font-semibold px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-px"
              style={{
                color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
              }}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="font-semibold px-4 py-2 rounded-lg text-white text-sm transition-all duration-200 hover:-translate-y-px"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(124,58,237,0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(124,58,237,0.3)';
              }}
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex justify-end col-start-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg"
              style={{ color: 'rgba(255,255,255,0.8)' }}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className="md:hidden transition-all duration-300 overflow-hidden"
        style={{
          maxHeight: isOpen ? '480px' : '0',
          background: 'rgba(13,13,13,0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: isOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        <div className="px-4 sm:px-6 py-6 flex flex-col gap-3">
          {navLinks.map(item => (
            <a
              key={item.label}
              href={item.href}
              className="text-base font-medium py-2 transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Link
              href="/login"
              className="w-full text-center py-3 rounded-xl font-semibold text-sm"
              style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}
              onClick={() => setIsOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="w-full text-center py-3 rounded-xl font-semibold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              onClick={() => setIsOpen(false)}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
