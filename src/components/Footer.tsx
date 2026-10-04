import React from 'react';
import Link from 'next/link';
import { SITE } from '../lib/seo/site';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/resume-tailoring', label: 'Résumé tailoring' },
      { href: '/ats-resume-builder', label: 'ATS-friendly résumé builder' },
      { href: '/cover-letter-generator', label: 'Cover letter generator' },
      { href: '/job-application-tracker', label: 'Application tracker' },
      { href: '/mock-interview', label: 'AI mock interview' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { href: '/guides/tailor-resume-to-job-description', label: 'Tailor a résumé to a job' },
      { href: '/guides/how-ats-resume-scanners-work', label: 'How ATS scanners work' },
      { href: '/guides', label: 'All guides' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/#contact', label: 'Contact' },
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms-of-service', label: 'Terms of Service' },
    ],
  },
];

/** Site footer: real internal links (they also pass authority to the content pages) and a working mailbox. */
const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-white border-t border-gray-800/60">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <Link href="/" className="inline-block">
            <img src="/AGENT_Logo.png" alt={SITE.name} width={541} height={177} loading="lazy" decoding="async" className="h-10 w-auto" />
          </Link>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">{SITE.tagline}.</p>
          <a href={`mailto:${SITE.contactEmail}`} className="mt-4 inline-block text-sm text-violet-300 hover:text-white">
            {SITE.contactEmail}
          </a>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-sm font-semibold text-white mb-4" style={{ fontSize: '14px' }}>{col.title}</h2>
            <ul className="space-y-2.5 list-none p-0 m-0">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-gray-800/60 text-xs text-gray-500">
        © {new Date().getFullYear()} {SITE.name}. Generated résumés and cover letters should always be reviewed before you send them.
      </div>
    </div>
  </footer>
);

export default Footer;
