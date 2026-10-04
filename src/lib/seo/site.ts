import registry from './pages.json';

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  section: 'core' | 'feature' | 'guide' | 'legal';
  priority: number;
  changefreq: string;
  lastmod: string;
}

export const SITE = registry.site;
export const PAGES = registry.pages as PageMeta[];
export const NOINDEX_PATHS = registry.noindex as string[];
export const CRAWLERS = registry.crawlers;

/** Canonical origin. NEXT_PUBLIC_SITE_URL lets a staging deploy point at itself. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE.url).replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path === '/' ? '' : path}`;
}

export function pageMeta(path: string): PageMeta {
  const page = PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`No SEO registry entry for ${path}. Add it to src/lib/seo/pages.json.`);
  return page;
}

export const LOGO_URL = () => absoluteUrl('/AGENT_Logo.png');
export const OG_IMAGE_URL = () => absoluteUrl('/og.png');
