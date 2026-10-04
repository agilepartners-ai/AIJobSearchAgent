#!/usr/bin/env node
/**
 * Generates public/robots.txt, public/sitemap.xml and public/llms.txt from src/lib/seo/pages.json,
 * the single source of truth for which pages exist, which are indexable and which crawlers are welcome.
 *
 *     node scripts/generate-seo-files.mjs          # write the files (runs as part of `pnpm build`)
 *     node scripts/generate-seo-files.mjs --check  # exit 1 if the committed files are stale
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function generate(root = ROOT, siteOverride = process.env.NEXT_PUBLIC_SITE_URL) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'src', 'lib', 'seo', 'pages.json'), 'utf8'));
  const base = (siteOverride || registry.site.url).replace(/\/+$/, '');
  const url = (p) => `${base}${p === '/' ? '' : p}`;
  const { pages, crawlers, site } = registry;

  const agents = (list) => list.map((a) => `User-agent: ${a}`).join('\n');
  const robots = `# robots.txt for ${base}
# Policy (edit src/lib/seo/pages.json, then run pnpm seo):
#  - search engines and AI answer/retrieval bots may crawl the public site;
#  - AI model-training crawlers may not;
#  - account pages stay crawlable on purpose so their noindex tag is seen, and only /api/ is off limits.

User-agent: *
Allow: /
Disallow: /api/

# Search and answer engines (named explicitly: a bot that finds its own group ignores the * group)
${agents(crawlers.allow)}
Allow: /
Disallow: /api/

# AI model-training crawlers
${agents(crawlers.blockTraining)}
Disallow: /

Sitemap: ${base}/sitemap.xml
`;

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${escapeXml(url(p.path))}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  const group = (title, section) =>
    `## ${title}\n${pages
      .filter((p) => p.section === section)
      .map((p) => `- [${p.title}](${url(p.path)}): ${p.description}`)
      .join('\n')}\n`;

  const llms = `# ${site.name}

> ${site.name} is a web app that tailors a résumé to a specific job description. It also writes a matching cover letter, shows a match analysis (strengths, gaps, keywords), tracks job applications, and offers an AI mock interview.

## Facts
- Input: a résumé as PDF (with selectable text) or plain text, plus a pasted job description. DOCX and DOC are not supported.
- Output: a tailored résumé, a cover letter and a match analysis, usually in 10 to 30 seconds. Résumés can be edited in the app and exported as PDF or LaTeX; the LaTeX can be opened in Overleaf.
- There are 12 résumé templates. Single-column templates are the safest for applicant tracking systems.
- Each account can generate up to 5 tailored sets per day and start up to 5 mock interviews per day.
- There is no paid plan in the app at the moment; paid plans with higher limits are planned.
- Contact: ${site.contactEmail}

${group('Product', 'core')}
${group('Features', 'feature')}
${group('Guides', 'guide')}
${group('Legal', 'legal')}`.replace(/\n{3,}/g, '\n\n');

  return { 'robots.txt': robots, 'sitemap.xml': sitemap, 'llms.txt': llms.trimEnd() + '\n' };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const files = generate();
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(ROOT, 'public', name);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
    if (check) {
      if (current !== content) {
        stale += 1;
        console.error(`stale: public/${name}`);
      }
    } else {
      fs.writeFileSync(target, content);
      console.log(`wrote public/${name} (${content.length} bytes)`);
    }
  }
  if (check && stale) {
    console.error('Run: pnpm seo');
    process.exit(1);
  }
}
