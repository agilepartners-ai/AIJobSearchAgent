"use client";

import React from 'react';
import Link from 'next/link';
import { Mail, Shield, FileText, Github, Twitter, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white dark:bg-gray-950 border-t border-gray-800/60">
      <div className="max-w-6xl mx-auto px-0">

        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <img src="/AGENT_Logo.png" alt="AIJobSearchAgent" className="h-10 w-auto" />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Your AI-powered career success partner. Find the right job, ace interviews, and grow your career with intelligent automation.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:-translate-y-0.5"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:-translate-y-0.5"
                aria-label="Twitter"
              >
                <Twitter size={16} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:-translate-y-0.5"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h3>
            <ul className="space-y-3">
              {[
                { label: 'How It Works', href: '/#workflow' },
                { label: 'Job Search', href: '/job-search' },
                { label: 'AI Interview Prep', href: '/ai-interview' },
                { label: 'Analytics Dashboard', href: '/analytics-dashboard' },
                { label: 'Pricing', href: '/#pricing' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-3">
              {[
                { label: 'About Us', href: '/#about' },
                { label: 'Our Team', href: '/#team' },
                { label: 'Testimonials', href: '/#testimonials' },
                { label: 'Contact', href: '/#contact' },
                { label: 'Blog', href: '/blog' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Legal & Support</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy-policy"
                  className="flex items-center gap-2 text-gray-400 hover:text-blue-400 text-sm transition-colors group"
                >
                  <Shield size={14} className="group-hover:text-blue-400 transition-colors" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="flex items-center gap-2 text-gray-400 hover:text-purple-400 text-sm transition-colors group"
                >
                  <FileText size={14} className="group-hover:text-purple-400 transition-colors" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@aijobsearchagent.com"
                  className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <Mail size={14} />
                  support@aijobsearchagent.com
                </a>
              </li>
            </ul>

            {/* Sign Up CTA */}
            <div className="mt-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5"
              >
                Get Started Free →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm text-center sm:text-left">
            © {currentYear} AIJobSearchAgent. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/privacy-policy"
              className="text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <Shield size={12} />
              Privacy
            </Link>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <Link
              href="/terms-of-service"
              className="text-gray-500 hover:text-purple-400 transition-colors flex items-center gap-1"
            >
              <FileText size={12} />
              Terms
            </Link>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <Link
              href="/#contact"
              className="text-gray-500 hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>


    </footer>
  );
};

export default Footer;
