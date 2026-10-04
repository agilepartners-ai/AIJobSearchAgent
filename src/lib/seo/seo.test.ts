import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generate } from '../../../scripts/generate-seo-files.mjs';
import * as data from '../../content/pageData';
import type { ContentPageData } from '../../components/marketing/ContentPage';
import { HOME_FAQ } from './faq';
import { article, breadcrumbs, faqPage, howTo, organization, serialise, softwareApplication, website } from './jsonld';
import { AUTH_FLOW_PATHS, isOpenToSignedOut, isPublicPage } from '../publicRoutes';
import registry from './pages.json';

const ROOT = path.resolve(__dirname, '../../..');
const PAGES = registry.pages;
const words = (s: string) => s.trim().split(/\s+/).length;

function pageFile(route: string): string | null {
  const rel = route === '/' ? 'index' : route.replace(/^\//, '');
  for (const candidate of [`src/pages/${rel}.tsx`, `src/pages/${rel}/index.tsx`]) {
    if (fs.existsSync(path.join(ROOT, candidate))) return candidate;
  }
  return null;
}

describe('page registry', () => {
  it('has a real Next page behind every entry', () => {
    expect(PAGES.filter((p) => !pageFile(p.path)).map((p) => p.path)).toEqual([]);
  });

  it('has unique, well-sized titles and descriptions', () => {
    for (const p of PAGES) {
      expect(p.title.length, `${p.path} title`).toBeGreaterThanOrEqual(20);
      expect(p.title.length, `${p.path} title`).toBeLessThanOrEqual(60);
      expect(p.description.length, `${p.path} description`).toBeGreaterThanOrEqual(70);
      expect(p.description.length, `${p.path} description`).toBeLessThanOrEqual(165);
    }
    expect(new Set(PAGES.map((p) => p.title)).size).toBe(PAGES.length);
    expect(new Set(PAGES.map((p) => p.description)).size).toBe(PAGES.length);
  });

  it('keeps noindex pages out of the registry and noindexes their files', () => {
    for (const route of registry.noindex) {
      expect(PAGES.some((p) => p.path === route), `${route} must not be indexable`).toBe(false);
      const file = pageFile(route);
      expect(file, `${route} page file`).not.toBeNull();
      expect(fs.readFileSync(path.join(ROOT, file!), 'utf8'), `${route} must render <NoIndex>`).toContain('NoIndex');
    }
  });

  it('uses valid ISO dates and sane priorities', () => {
    for (const p of PAGES) {
      expect(p.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.priority).toBeGreaterThan(0);
      expect(p.priority).toBeLessThanOrEqual(1);
    }
  });
});

describe('generated crawler files', () => {
  const out = generate(ROOT, undefined) as Record<string, string>;

  it('match what is committed in public/ (run `pnpm seo` if this fails)', () => {
    for (const [name, content] of Object.entries(out)) {
      const committed = fs.readFileSync(path.join(ROOT, 'public', name), 'utf8').replace(/\r\n/g, '\n');
      expect(committed, name).toBe(content);
    }
  });

  it('puts exactly the indexable pages in the sitemap', () => {
    const locs = Array.from(out['sitemap.xml'].matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    const expected = PAGES.map((p) => `${registry.site.url}${p.path === '/' ? '' : p.path}`);
    expect(locs.sort()).toEqual(expected.sort());
    for (const noindex of registry.noindex) expect(out['sitemap.xml']).not.toContain(`${registry.site.url}${noindex}<`);
  });

  it('welcomes search and answer bots and refuses training bots', () => {
    const robots = out['robots.txt'];
    expect(robots).toContain(`Sitemap: ${registry.site.url}/sitemap.xml`);
    const groups = robots.split(/\n\n+/);
    for (const bot of registry.crawlers.allow) {
      const g = groups.find((x) => x.split('\n').includes(`User-agent: ${bot}`));
      expect(g, `${bot} group`).toBeDefined();
      expect(g).toContain('Allow: /');
      expect(g).not.toMatch(/^Disallow: \/$/m);
    }
    for (const bot of registry.crawlers.blockTraining) {
      const g = groups.find((x) => x.split('\n').includes(`User-agent: ${bot}`));
      expect(g, `${bot} group`).toBeDefined();
      expect(g).toMatch(/^Disallow: \/$/m);
    }
    const star = groups.find((x) => x.includes('User-agent: *'))!;
    expect(star).not.toMatch(/^Disallow: \/$/m);
  });

  it('keeps account pages crawlable so their noindex is seen (only /api/ is blocked)', () => {
    const robots = out['robots.txt'];
    for (const route of registry.noindex) expect(robots).not.toContain(`Disallow: ${route}`);
    expect(robots).toContain('Disallow: /api/');
  });
});

const CONTENT: Record<string, ContentPageData> = {
  '/resume-tailoring': data.RESUME_TAILORING,
  '/ats-resume-builder': data.ATS_RESUME_BUILDER,
  '/cover-letter-generator': data.COVER_LETTER,
  '/job-application-tracker': data.TRACKER,
  '/mock-interview': data.MOCK_INTERVIEW,
  '/guides/tailor-resume-to-job-description': data.GUIDE_TAILOR,
  '/guides/how-ats-resume-scanners-work': data.GUIDE_ATS,
};

describe('content pages', () => {
  it('covers every feature and guide page in the registry', () => {
    const wanted = PAGES.filter((p) => p.section === 'feature' || (p.section === 'guide' && p.path !== '/guides')).map((p) => p.path);
    expect(Object.keys(CONTENT).sort()).toEqual(wanted.sort());
  });

  for (const [route, page] of Object.entries(CONTENT)) {
    describe(route, () => {
      it('leads with a direct answer of 35-75 words', () => {
        expect(words(page.answer)).toBeGreaterThanOrEqual(35);
        expect(words(page.answer)).toBeLessThanOrEqual(75);
      });

      it('is wired to its own registry entry and breadcrumb', () => {
        expect(page.path).toBe(route);
        expect(page.breadcrumb.at(-1)!.path).toBe(route);
        expect(page.breadcrumb[0].path).toBe('/');
        for (const b of page.breadcrumb) expect(PAGES.some((p) => p.path === b.path) || b.path === '/guides', b.path).toBe(true);
      });

      it('has unique section ids, headings and substantial body copy', () => {
        const ids = page.sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(page.sections.length).toBeGreaterThanOrEqual(3);
        const text = [page.answer, ...page.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.list?.items ?? []), ...(s.table?.rows.flat() ?? [])])].join(' ');
        expect(words(text)).toBeGreaterThanOrEqual(180);
      });

      it('has at least 3 FAQs with real answers', () => {
        expect(page.faqs?.length ?? 0).toBeGreaterThanOrEqual(3);
        for (const f of page.faqs ?? []) {
          expect(f.q.endsWith('?')).toBe(true);
          expect(words(f.a)).toBeGreaterThanOrEqual(10);
        }
      });

      it('links only to pages that exist', () => {
        expect(page.related.length).toBeGreaterThanOrEqual(3);
        for (const r of page.related) {
          expect(PAGES.some((p) => p.path === r.href), r.href).toBe(true);
          expect(r.href).not.toBe(route);
        }
      });
    });
  }
});

describe('structured data', () => {
  const parse = (x: unknown) => JSON.parse(serialise(x as Record<string, unknown>));

  it('builds FAQPage markup that matches the visible FAQ one-for-one', () => {
    const ld = parse(faqPage(HOME_FAQ));
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(HOME_FAQ.length);
    HOME_FAQ.forEach((f, i) => {
      expect(ld.mainEntity[i].name).toBe(f.q);
      expect(ld.mainEntity[i].acceptedAnswer.text).toBe(f.a);
    });
  });

  it('never claims offers, ratings or reviews we cannot back', () => {
    const blocks = [organization(), website(), softwareApplication({ path: '/', description: 'x', features: ['a'] })];
    for (const b of blocks) expect(JSON.stringify(b)).not.toMatch(/Offer|aggregateRating|AggregateRating|"Review"/);
  });

  it('uses absolute URLs and ISO dates', () => {
    const a = parse(article({ path: '/guides/x', headline: 'h', description: 'd', published: '2026-10-04', modified: '2026-10-04' }));
    expect(a.mainEntityOfPage).toMatch(/^https:\/\//);
    expect(a.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const b = parse(breadcrumbs([{ name: 'Home', path: '/' }, { name: 'X', path: '/x' }]));
    expect(b.itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2]);
    for (const i of b.itemListElement) expect(i.item).toMatch(/^https:\/\//);
    const h = parse(howTo({ name: 'n', description: 'd', steps: [{ name: 'a', text: 'b' }] }));
    expect(h.step[0].position).toBe(1);
  });

  it('cannot be broken out of its <script> tag', () => {
    expect(serialise({ a: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});

describe('no invented claims', () => {
  // Numbers, rates and guarantees that the product cannot back. This guard exists because the first
  // version of the landing page shipped several of them. If you have real data, cite its source in the copy.
  const BANNED = [
    /\b\d{1,3}(,\d{3})+\+?\s*(users|job seekers|jobs matched|candidates)/i,
    /\b\d+%\s*(interview|callback)\s*(rate|success)/i,
    /interview rate/i,
    /AES-256/i,
    /within \d+\s*(hours|hrs)/i,
    /\$\s?\d+\s*\/\s*mo/i,
    /\b(guaranteed?|guarantees)\b.*\b(interview|job|offer)/i,
    /app\.aijobsearchagent\.com/i,
  ];
  const FILES = [
    'src/content/pageData.ts',
    'src/lib/seo/faq.ts',
    'src/lib/seo/pages.json',
    ...['Hero', 'LiveDemo', 'Workflow', 'FAQ', 'ResumeShowcase', 'Footer'].map((n) => `src/components/${n}.tsx`),
  ];

  it.each(FILES)('%s', (file) => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const re of BANNED) expect(text, `${file} matches ${re}`).not.toMatch(re);
  });
});

describe('assets the pages rely on exist and are light', () => {
  it.each(['public/og.png', 'public/favicon.ico', 'public/manifest.webmanifest', 'public/icons/icon-32.png', 'public/icons/icon-192.png', 'public/icons/icon-512.png', 'public/icons/apple-touch-icon.png', 'public/images/app-applications.webp', 'public/images/app-templates.webp'])('%s', (file) => {
    const stat = fs.statSync(path.join(ROOT, file));
    expect(stat.size).toBeGreaterThan(100);
    expect(stat.size).toBeLessThan(250 * 1024);
  });
});

describe('public asset budget', () => {
  // Everything in public/ is uploaded on every deploy and some of it is fetched by visitors. The first version of the
  // site shipped 58 MB here, including a 25 MB video and three 3-4 MB images that nothing referenced.
  function files(dir: string): { file: string; size: number }[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? files(full) : [{ file: path.relative(ROOT, full), size: fs.statSync(full).size }];
    });
  }
  const all = files(path.join(ROOT, 'public'));

  it('has no single file over 4 MB', () => {
    expect(all.filter((f) => f.size > 4 * 1024 * 1024).map((f) => `${f.file} ${(f.size / 1048576).toFixed(1)} MB`)).toEqual([]);
  });

  it('stays under 14 MB in total', () => {
    const total = all.reduce((n, f) => n + f.size, 0);
    expect(total / 1048576).toBeLessThan(14);
  });

  it('contains no source maps and no competitor captures', () => {
    expect(all.filter((f) => /\.map$/.test(f.file)).map((f) => f.file)).toEqual([]);
    expect(all.filter((f) => /resumecom|competitor/i.test(f.file)).map((f) => f.file)).toEqual([]);
  });

  it('references only images that exist (no 404s on the landing page)', () => {
    const sources = ['Hero', 'LiveDemo', 'Workflow', 'ResumeShowcase', 'Footer', 'Header'].map((n) => fs.readFileSync(path.join(ROOT, `src/components/${n}.tsx`), 'utf8')).join('\n');
    const refs = Array.from(sources.matchAll(/["'`](\/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|webp|svg|mp4))["'`]/g)).map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(5);
    expect(refs.filter((r) => !fs.existsSync(path.join(ROOT, 'public', r))), 'missing').toEqual([]);
  });
});

describe('who may stay on a page while signed out', () => {
  // A signed-out visitor sent to /login from a marketing page (the bug this guards against) also bounces any
  // crawler that runs JavaScript, so the rule lives in one function and is tested against the registry.
  it('lets every indexable page stay open, so none of them bounces a visitor to sign-in', () => {
    for (const p of PAGES) expect(isOpenToSignedOut(p.path), p.path).toBe(true);
  });

  it('lets the sign-in flow stay open', () => {
    for (const p of AUTH_FLOW_PATHS) expect(isOpenToSignedOut(p), p).toBe(true);
  });

  it('keeps the app behind sign-in', () => {
    for (const p of ['/dashboard', '/job-search', '/job-listings', '/ai-interview', '/analytics-dashboard']) {
      expect(isOpenToSignedOut(p), p).toBe(false);
    }
  });

  it('server-renders exactly the registry pages, never an account page', () => {
    for (const p of PAGES) expect(isPublicPage(p.path)).toBe(true);
    for (const p of registry.noindex) expect(isPublicPage(p), p).toBe(false);
  });
});
