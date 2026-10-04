/**
 * JSON-LD builders. Rules we hold ourselves to:
 *  - markup describes only what is visible on the page (Google's requirement, and it is what
 *    keeps AI engines from quoting something the page does not say);
 *  - no Offer, Review or AggregateRating: there is no billing in the product and no verifiable
 *    review data, so none is claimed;
 *  - absolute URLs, ISO dates, no empty values.
 */
import { LOGO_URL, SITE, absoluteUrl, siteUrl } from './site';

type Json = Record<string, unknown>;

export function organization(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl()}/#organization`,
    name: SITE.name,
    url: siteUrl(),
    logo: { '@type': 'ImageObject', url: LOGO_URL() },
    description: SITE.tagline,
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: SITE.contactEmail }],
  };
}

export function website(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl()}/#website`,
    name: SITE.name,
    url: siteUrl(),
    inLanguage: SITE.locale,
    publisher: { '@id': `${siteUrl()}/#organization` },
  };
}

export function softwareApplication(opts: { path: string; description: string; features: string[] }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl()}/#app`,
    name: SITE.name,
    url: absoluteUrl(opts.path),
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: opts.description,
    featureList: opts.features,
    publisher: { '@id': `${siteUrl()}/#organization` },
  };
}

export interface Faq {
  q: string;
  a: string;
}

export function faqPage(faqs: Faq[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbs(trail: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  };
}

export function article(opts: { path: string; headline: string; description: string; published: string; modified: string }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: absoluteUrl(opts.path),
    datePublished: opts.published,
    dateModified: opts.modified,
    inLanguage: SITE.locale,
    image: absoluteUrl('/og.png'),
    author: { '@id': `${siteUrl()}/#organization` },
    publisher: { '@id': `${siteUrl()}/#organization` },
  };
}

export function howTo(opts: { name: string; description: string; steps: { name: string; text: string }[] }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
  };
}

/** Safe to embed in a <script> tag: `<` would let a string close the tag early. */
export function serialise(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
