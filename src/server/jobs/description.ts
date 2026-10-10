/**
 * Fetches the text of one job posting, on request, so "Tailor resume" has a job description to work from.
 *
 * No browser is run. Most job pages publish the posting as structured data (schema.org JobPosting in a JSON-LD tag), and the
 * applicant tracking systems have public posting APIs. Both are read with a plain HTTP request from the server, one page per click.
 * Pages that require sign-in or show a bot check (Indeed, often LinkedIn) give nothing back, and the caller then asks the user
 * to paste the description.
 *
 * Safety: only https links to known job sites are fetched (no internal addresses), redirects are not followed blindly,
 * and the page size and wait are capped.
 */
import { htmlToText } from '../gmail/messages';

export class DescriptionError extends Error {
  constructor(message: string, readonly kind: 'blocked' | 'unsupported' | 'not_found' | 'unreadable') {
    super(message);
    this.name = 'DescriptionError';
  }
}

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;
export const MIN_DESCRIPTION_CHARS = 200;
export const MAX_DESCRIPTION_CHARS = 20_000;

/** Hosts we are willing to contact. Anything else is refused, which also rules out internal addresses. */
const ALLOWED_HOST =
  /(^|\.)(linkedin\.com|indeed\.[a-z.]+|glassdoor\.[a-z.]+|naukri\.com|wellfound\.com|angel\.co|foundit\.in|instahyre\.com|cutshort\.io|hirist\.tech|ziprecruiter\.com|monster\.com|greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|workable\.com|bamboohr\.com|recruitee\.com|teamtailor\.com|jobvite\.com|icims\.com|breezy\.hr|applytojob\.com|pinpointhq\.com)$/i;

export function isAllowedJobUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
    return ALLOWED_HOST.test(u.hostname) ? u : null;
  } catch {
    return null;
  }
}

const clip = (s: string) => s.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_DESCRIPTION_CHARS);

/** Text out of the HTML (possibly entity-escaped, as Greenhouse sends it). */
export function descriptionToText(html: string): string {
  const unescaped = /&lt;\s*\/?\s*(p|div|ul|li|br|h\d|strong|b)\b/i.test(html) ? html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : html;
  return clip(htmlToText(unescaped.replace(/<li[^>]*>/gi, '\n• ')));
}

interface JobPosting {
  description?: string;
  title?: string;
}

/** The JobPosting object from a page's JSON-LD blocks, if there is one. */
export function findJobPosting(html: string): JobPosting | null {
  const blocks = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)).map((m) => m[1]);
  const walk = (node: unknown): JobPosting | null => {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const n of node) {
        const hit = walk(n);
        if (hit) return hit;
      }
      return null;
    }
    const o = node as Record<string, unknown>;
    const type = o['@type'];
    if ((type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) && typeof o.description === 'string') return { description: o.description, title: typeof o.title === 'string' ? o.title : undefined };
    return walk(o['@graph']);
  };
  for (const b of blocks) {
    try {
      const hit = walk(JSON.parse(b.trim()));
      if (hit) return hit;
    } catch {
      /* a malformed block: try the next one */
    }
  }
  return null;
}

/** LinkedIn's public job page carries the description in a fixed block instead of JSON-LD. */
export function findLinkedInMarkup(html: string): string | null {
  const m = html.match(/<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  return m ? m[1] : null;
}

/** Email links carry tracking and a /comm/ prefix; the clean public page is /jobs/view/<id>. */
export function cleanJobUrl(raw: string): string {
  const m = raw.match(/^https:\/\/(?:[a-z]{2,3}\.|www\.)?linkedin\.com\/(?:comm\/)?jobs\/view\/(?:[^/?#]*-)?(\d{6,})/i);
  return m ? `https://www.linkedin.com/jobs/view/${m[1]}` : raw;
}

type Fetch = typeof fetch;

const API_HOST = /^(boards-api\.greenhouse\.io|api\.lever\.co|api\.ashbyhq\.com)$/i;

/** One GET. Redirects are followed by hand so every hop stays on an allowed host (an open redirect cannot lead inside our network). */
async function getText(doFetch: Fetch, url: string, accept: string): Promise<{ status: number; body: string }> {
  let current = url;
  for (let hop = 0; hop < 5; hop += 1) {
    const u = new URL(current);
    if (u.protocol !== 'https:' || !(ALLOWED_HOST.test(u.hostname) || API_HOST.test(u.hostname))) throw new DescriptionError('The link leads away from a supported job site.', 'unsupported');
    const res = await doFetch(current, {
      headers: { Accept: accept, 'User-Agent': 'Mozilla/5.0 (compatible; AIJobSearchAgent/1.0; +https://agilepartners-ai.com)', 'Accept-Language': 'en' },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location') as string, current).toString();
      continue;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) throw new DescriptionError('The page is too large to read.', 'unreadable');
    return { status: res.status, body: new TextDecoder().decode(buf) };
  }
  throw new DescriptionError('Too many redirects.', 'unreadable');
}

/** Public posting APIs of applicant tracking systems: exact and polite, no page scraping. */
async function fromAtsApi(u: URL, doFetch: Fetch): Promise<string | null> {
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);
  if (/greenhouse\.io$/.test(host)) {
    const i = parts.indexOf('jobs');
    const board = parts[0] === 'embed' ? u.searchParams.get('for') : parts[0];
    const id = i >= 0 ? parts[i + 1] : u.searchParams.get('gh_jid');
    if (!board || !id || !/^\d+$/.test(id)) return null;
    const r = await getText(doFetch, `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${id}?content=true`, 'application/json');
    if (r.status !== 200) return null;
    return descriptionToText(String((JSON.parse(r.body) as { content?: string }).content ?? ''));
  }
  if (/lever\.co$/.test(host) && parts.length >= 2) {
    const r = await getText(doFetch, `https://api.lever.co/v0/postings/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`, 'application/json');
    if (r.status !== 200) return null;
    const j = JSON.parse(r.body) as { descriptionPlain?: string; additionalPlain?: string; lists?: { text: string; content: string }[] };
    const lists = (j.lists ?? []).map((l) => `${l.text}\n${descriptionToText(l.content)}`).join('\n\n');
    return clip([j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n'));
  }
  if (/ashbyhq\.com$/.test(host) && parts.length >= 2) {
    const r = await getText(doFetch, `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(parts[0])}`, 'application/json');
    if (r.status !== 200) return null;
    const jobs = (JSON.parse(r.body) as { jobs?: { id: string; descriptionPlain?: string }[] }).jobs ?? [];
    return clip(jobs.find((j) => j.id === parts[1])?.descriptionPlain ?? '');
  }
  return null;
}

export async function fetchJobDescription(rawUrl: string, doFetch: Fetch = fetch): Promise<{ text: string; via: 'ats-api' | 'json-ld' | 'page' }> {
  const url = isAllowedJobUrl(cleanJobUrl(rawUrl));
  if (!url) throw new DescriptionError('That link is not on a supported job site.', 'unsupported');

  try {
    const viaApi = await fromAtsApi(url, doFetch);
    if (viaApi && viaApi.length >= MIN_DESCRIPTION_CHARS) return { text: viaApi, via: 'ats-api' };
  } catch {
    /* fall through to the page itself */
  }

  let page: { status: number; body: string };
  try {
    page = await getText(doFetch, url.toString(), 'text/html,application/xhtml+xml');
  } catch (e) {
    if (e instanceof DescriptionError) throw e;
    throw new DescriptionError('Could not reach that page.', 'unreadable');
  }
  if (page.status === 404 || page.status === 410) throw new DescriptionError('That job posting is no longer available.', 'not_found');
  if (page.status === 401 || page.status === 403 || page.status === 429 || page.status === 999) throw new DescriptionError('That site asks for sign-in or blocks automatic reading.', 'blocked');
  if (page.status !== 200) throw new DescriptionError(`The site answered ${page.status}.`, 'unreadable');
  if (/\b(captcha|are you a human|unusual traffic|verify you are human)\b/i.test(page.body.slice(0, 6000)) && !findJobPosting(page.body)) {
    throw new DescriptionError('That site asks for sign-in or blocks automatic reading.', 'blocked');
  }

  const posting = findJobPosting(page.body);
  const html = posting?.description ?? findLinkedInMarkup(page.body) ?? '';
  const text = html ? descriptionToText(html) : '';
  if (text.length < MIN_DESCRIPTION_CHARS) throw new DescriptionError('The page did not contain a readable job description.', 'unreadable');
  return { text, via: posting?.description ? 'json-ld' : 'page' };
}
