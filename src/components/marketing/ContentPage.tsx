import Link from 'next/link';
import React from 'react';
import { article, breadcrumbs, faqPage, howTo, softwareApplication, type Faq } from '../../lib/seo/jsonld';
import { pageMeta } from '../../lib/seo/site';
import Seo from '../seo/Seo';
import MarketingLayout from './MarketingLayout';

export interface Section {
  id: string;
  heading: string;
  paragraphs?: string[];
  list?: { ordered?: boolean; items: string[] };
  table?: { head: string[]; rows: string[][] };
}

export interface ContentPageData {
  path: string;
  /** Visible H1. */
  h1: string;
  /** The direct answer, 40-60 words: the first thing a reader (or an AI engine) sees. */
  answer: string;
  sections: Section[];
  faqs?: Faq[];
  /** Genuine step-by-step content, emitted as HowTo structured data. */
  steps?: { name: string; text: string }[];
  /** Feature pages describe the product; guides are articles. */
  kind: 'feature' | 'guide';
  /** Feature pages: the capabilities listed in SoftwareApplication.featureList. */
  features?: string[];
  breadcrumb: { name: string; path: string }[];
  related: { href: string; label: string; blurb: string }[];
  cta: { heading: string; text: string };
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-6 rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-gray-200">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/10">
              {r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="px-4 py-3 font-medium text-gray-100">{c}</th> : <td key={j} className="px-4 py-3 text-gray-400">{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContentPage({ data }: { data: ContentPageData }) {
  const meta = pageMeta(data.path);

  const jsonLd: Record<string, unknown>[] = [breadcrumbs(data.breadcrumb)];
  if (data.kind === 'feature') {
    jsonLd.push(softwareApplication({ path: data.path, description: meta.description, features: data.features ?? [] }));
  } else {
    jsonLd.push(article({ path: data.path, headline: meta.title, description: meta.description, published: meta.lastmod, modified: meta.lastmod }));
  }
  if (data.steps?.length) jsonLd.push(howTo({ name: data.h1, description: meta.description, steps: data.steps }));
  if (data.faqs?.length) jsonLd.push(faqPage(data.faqs));

  return (
    <MarketingLayout>
      <Seo path={data.path} jsonLd={jsonLd} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
          <ol className="flex flex-wrap items-center gap-2 list-none p-0 m-0">
            {data.breadcrumb.map((b, i) => (
              <li key={b.path} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                {i < data.breadcrumb.length - 1 ? <Link href={b.path} className="hover:text-white">{b.name}</Link> : <span aria-current="page" className="text-gray-300">{b.name}</span>}
              </li>
            ))}
          </ol>
        </nav>

        <h1 className="text-white text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-6">{data.h1}</h1>

        <p className="text-lg leading-relaxed text-gray-200 border-l-4 border-violet-500 pl-4 mb-10">{data.answer}</p>

        {data.sections.map((s) => (
          <section key={s.id} id={s.id} className="mb-10">
            <h2 className="text-white text-2xl font-semibold mb-4">{s.heading}</h2>
            {s.paragraphs?.map((p, i) => <p key={i} className="leading-relaxed mb-4">{p}</p>)}
            {s.list && (s.list.ordered
              ? <ol className="list-decimal pl-6 space-y-2 mb-4">{s.list.items.map((it, i) => <li key={i} className="leading-relaxed">{it}</li>)}</ol>
              : <ul className="list-disc pl-6 space-y-2 mb-4">{s.list.items.map((it, i) => <li key={i} className="leading-relaxed">{it}</li>)}</ul>)}
            {s.table && <Table head={s.table.head} rows={s.table.rows} />}
          </section>
        ))}

        {data.faqs && data.faqs.length > 0 && (
          <section id="faq" className="mb-10">
            <h2 className="text-white text-2xl font-semibold mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {data.faqs.map((f) => (
                <details key={f.q} className="group rounded-xl border border-white/10 bg-white/[0.02] open:bg-white/[0.04]">
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-gray-100 flex justify-between gap-4">
                    <span>{f.q}</span>
                    <span aria-hidden="true" className="text-gray-500 group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <p className="px-5 pb-5 m-0 leading-relaxed text-gray-400">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <aside className="rounded-2xl p-6 mb-12" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))', border: '1px solid rgba(124,58,237,0.25)' }}>
          <h2 className="text-white text-xl font-semibold mb-2">{data.cta.heading}</h2>
          <p className="mb-4 text-gray-300">{data.cta.text}</p>
          <Link href="/register" className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            Create your account
          </Link>
        </aside>

        <section aria-labelledby="related" className="border-t border-white/10 pt-8">
          <h2 id="related" className="text-white text-lg font-semibold mb-4">Related</h2>
          <ul className="grid sm:grid-cols-2 gap-4 list-none p-0 m-0">
            {data.related.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="block rounded-xl border border-white/10 p-4 hover:border-violet-500/50 transition-colors">
                  <span className="block font-semibold text-gray-100">{r.label}</span>
                  <span className="block text-sm text-gray-400 mt-1">{r.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-xs text-gray-600">Last updated {new Date(meta.lastmod).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
      </article>
    </MarketingLayout>
  );
}
