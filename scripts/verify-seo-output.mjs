#!/usr/bin/env node
/**
 * Post-build check of the HTML that crawlers actually receive. Run after `next build`:
 *
 *     NEXT_DIST_DIR=.next pnpm seo:verify
 *
 * It reads the prerendered HTML (no JavaScript is executed, which is how most AI crawlers see the site) and fails if
 * a public page lacks real content, or a private page lacks its noindex directive. This exists because the first
 * version of the site sent every crawler an empty <div id="__next"></div>.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const dist = path.join(ROOT, process.env.NEXT_DIST_DIR || '.next', 'server', 'pages');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'seo', 'pages.json'), 'utf8'));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const failures = [];
const fail = (route, msg) => failures.push(`${route}: ${msg}`);

function htmlFor(route) {
  const rel = route === '/' ? 'index' : route.replace(/^\//, '');
  const file = path.join(dist, `${rel}.html`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

const text = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

for (const page of registry.pages) {
  const html = htmlFor(page.path);
  if (!html) {
    fail(page.path, `no prerendered HTML at ${path.relative(ROOT, dist)}`);
    continue;
  }
  if (!/<html lang="en"/.test(html)) fail(page.path, 'missing <html lang="en">');
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1];
  if (!title || decode(title) !== page.title) fail(page.path, `title is "${title}", expected "${page.title}"`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!desc || decode(desc) !== page.description) fail(page.path, 'meta description missing or different from the registry');
  const canonicalOrigin = registry.site.url;
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  if (canonical !== `${canonicalOrigin}${page.path === '/' ? '' : page.path}`) fail(page.path, `canonical is "${canonical}"`);
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) fail(page.path, 'public page is marked noindex');
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(page.path, `expected exactly one <h1>, found ${h1s.length}`);
  const words = text(html).split(' ').length;
  if (words < 150) fail(page.path, `only ${words} words of visible text in the HTML (is the page client-rendered only?)`);
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (!blocks.length) fail(page.path, 'no JSON-LD in the HTML');
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1].replace(/\\u003c/g, '<'));
      if (!j['@context'] || !j['@type']) fail(page.path, 'JSON-LD block lacks @context/@type');
    } catch {
      fail(page.path, 'a JSON-LD block is not valid JSON');
    }
  }
  if (/<div id="__next"><\/div>/.test(html)) fail(page.path, 'server HTML is an empty app shell');
}

for (const route of registry.noindex) {
  const html = htmlFor(route);
  if (!html) continue; // redirect-only routes may have no HTML
  if (!/<meta name="robots" content="noindex/.test(html)) fail(route, 'private page does not carry noindex in its server HTML');
}

const sitemap = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
if (/<loc>[^<]*(login|register|dashboard)[^<]*<\/loc>/.test(sitemap)) failures.push('sitemap lists a private page');

if (failures.length) {
  console.error(`SEO output check FAILED (${failures.length}):\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log(`SEO output check passed: ${registry.pages.length} public pages have real content, one H1, canonical and JSON-LD; ${registry.noindex.length} private routes are noindex.`);
