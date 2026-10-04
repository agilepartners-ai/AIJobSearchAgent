import Link from 'next/link';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import Seo from '../../components/seo/Seo';
import { GUIDES_INDEX } from '../../content/pageData';
import { breadcrumbs } from '../../lib/seo/jsonld';

export default function GuidesIndexPage() {
  return (
    <MarketingLayout>
      <Seo path="/guides" jsonLd={[breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }])]} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-white text-3xl sm:text-4xl font-bold tracking-tight mb-6">{GUIDES_INDEX.h1}</h1>
        <p className="text-lg leading-relaxed text-gray-200 border-l-4 border-violet-500 pl-4 mb-10">{GUIDES_INDEX.answer}</p>
        <ul className="space-y-4 list-none p-0 m-0">
          {GUIDES_INDEX.guides.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="block rounded-xl border border-white/10 p-5 hover:border-violet-500/50 transition-colors">
                <h2 className="text-white text-xl font-semibold mb-1">{g.title}</h2>
                <p className="text-gray-400 m-0">{g.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingLayout>
  );
}
