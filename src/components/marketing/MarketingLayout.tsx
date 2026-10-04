import Link from 'next/link';
import React from 'react';
import { SITE } from '../../lib/seo/site';
import Footer from '../Footer';

const NAV = [
  { href: '/resume-tailoring', label: 'Résumé tailoring' },
  { href: '/ats-resume-builder', label: 'Résumé builder' },
  { href: '/cover-letter-generator', label: 'Cover letters' },
  { href: '/job-application-tracker', label: 'Tracker' },
  { href: '/guides', label: 'Guides' },
];

/**
 * Shell for the public content pages. The landing page has its own in-page header; these pages need
 * real links that work from any URL. No JavaScript is required for the menu, so it also works when
 * a crawler renders the page without running scripts.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gray-950 text-gray-300">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur" style={{ background: 'rgba(13,13,13,0.9)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label={`${SITE.name} home`}>
            <img src="/AGENT_Logo.png" alt={SITE.name} width={541} height={177} className="h-9 w-auto" />
          </Link>

          <nav aria-label="Main" className="hidden lg:flex items-center gap-6">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-300 hover:text-white">Sign in</Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
            >
              Get started
            </Link>
          </div>
        </div>

        <nav aria-label="Main (compact)" className="lg:hidden border-t border-white/5 overflow-x-auto">
          <ul className="flex gap-5 px-4 py-2 list-none m-0 whitespace-nowrap">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-sm text-gray-400 hover:text-white">{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="content">{children}</main>
      <Footer />
    </div>
  );
}
