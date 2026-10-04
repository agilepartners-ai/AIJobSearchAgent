import Head from 'next/head';
import React from 'react';
import { serialise } from '../../lib/seo/jsonld';
import { NOINDEX_PATHS, OG_IMAGE_URL, SITE, absoluteUrl, pageMeta } from '../../lib/seo/site';

interface Props {
  /** Path of this page. Title and description come from src/lib/seo/pages.json, never from the caller. */
  path: string;
  /** JSON-LD objects for this page. */
  jsonLd?: Record<string, unknown>[];
}

/**
 * Per-page <head>: title, description, canonical, robots, Open Graph, Twitter and JSON-LD.
 * Pages in the registry are indexable; paths in `noindex` render a noindex meta instead
 * (see NoIndex below), which is what keeps account pages out of search without blocking crawl.
 */
export default function Seo({ path, jsonLd = [] }: Props) {
  const meta = pageMeta(path);
  const url = absoluteUrl(path);
  return (
    <Head>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

      <meta property="og:type" content={meta.section === 'guide' ? 'article' : 'website'} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={OG_IMAGE_URL()} />
      <meta property="og:locale" content="en_US" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={OG_IMAGE_URL()} />

      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialise(block) }} />
      ))}
    </Head>
  );
}

/** For account and app pages: crawlable (so the directive is seen) but never indexed. */
export function NoIndex({ title }: { title: string }) {
  return (
    <Head>
      <title>{`${title} | ${SITE.name}`}</title>
      <meta name="robots" content="noindex,nofollow" />
    </Head>
  );
}

export const isNoIndexPath = (path: string) => NOINDEX_PATHS.includes(path);
