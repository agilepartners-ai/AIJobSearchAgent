import { describe, expect, it, vi } from 'vitest';
import { cleanJobUrl, DescriptionError, descriptionToText, fetchJobDescription, findJobPosting, findLinkedInMarkup, isAllowedJobUrl } from './description';

const LONG = 'We are looking for a Data Analyst to build dashboards and reports for our product team. '.repeat(6);

const page = (ld: unknown, extra = '') => `<html><head><title>Job</title>${extra}<script type="application/ld+json">${JSON.stringify(ld)}</script></head><body>x</body></html>`;
const reply = (status: number, body: string, headers: Record<string, string> = {}) => new Response(body, { status, headers });

describe('isAllowedJobUrl', () => {
  it('accepts https links on known job sites only', () => {
    expect(isAllowedJobUrl('https://www.linkedin.com/jobs/view/3912345678')).not.toBeNull();
    expect(isAllowedJobUrl('https://boards.greenhouse.io/acme/jobs/123')).not.toBeNull();
    expect(isAllowedJobUrl('https://in.indeed.com/viewjob?jk=abc')).not.toBeNull();
  });

  it('refuses everything that could reach an internal address or a look-alike', () => {
    for (const bad of ['http://www.linkedin.com/jobs/view/1', 'https://localhost/x', 'https://10.0.0.1/', 'https://169.254.169.254/latest/meta-data', 'https://evil-linkedin.com/jobs', 'https://linkedin.com.evil.io/jobs', 'https://user:pw@www.linkedin.com/x', 'https://www.linkedin.com:8443/x', 'file:///etc/passwd', 'not a url']) {
      expect(isAllowedJobUrl(bad), bad).toBeNull();
    }
  });
});

describe('reading the posting out of a page', () => {
  it('finds a JobPosting in plain, listed and @graph JSON-LD', () => {
    const posting = { '@type': 'JobPosting', title: 'Data Analyst', description: '<p>Hello</p>' };
    expect(findJobPosting(page(posting))?.title).toBe('Data Analyst');
    expect(findJobPosting(page([{ '@type': 'Organization' }, posting]))?.title).toBe('Data Analyst');
    expect(findJobPosting(page({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite' }, posting] }))?.title).toBe('Data Analyst');
    expect(findJobPosting(page({ '@type': 'Organization' }))).toBeNull();
    expect(findJobPosting('<script type="application/ld+json">{broken</script>')).toBeNull();
  });

  it('turns the HTML description into text with bullets and no tags', () => {
    const t = descriptionToText('<p>About the role</p><ul><li>Build dashboards</li><li>Own reporting</li></ul><p>Apply &amp; grow</p>');
    expect(t).toContain('About the role');
    expect(t).toContain('• Build dashboards');
    expect(t).toContain('Apply & grow');
    expect(t).not.toMatch(/<\/?\w+>/);
  });

  it('also handles descriptions that arrive entity-escaped, as Greenhouse sends them', () => {
    expect(descriptionToText('&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;ul&gt;&lt;li&gt;One&lt;/li&gt;&lt;/ul&gt;')).toContain('• One');
  });
});

describe('LinkedIn pages', () => {
  it('turns the tracking link from an email into the clean public job link', () => {
    expect(cleanJobUrl('https://www.linkedin.com/comm/jobs/view/4466833623/?trackingId=a&refId=b&lipi=c')).toBe('https://www.linkedin.com/jobs/view/4466833623');
    expect(cleanJobUrl('https://in.linkedin.com/jobs/view/data-analyst-at-acme-4466833623?trk=x')).toBe('https://www.linkedin.com/jobs/view/4466833623');
    expect(cleanJobUrl('https://boards.greenhouse.io/acme/jobs/1')).toBe('https://boards.greenhouse.io/acme/jobs/1');
  });

  it('reads the description from the public page block', async () => {
    expect(findLinkedInMarkup('<div class="x show-more-less-html__markup show-more-less-html__markup--clamp-after-5"><strong>About</strong><br>Hi</div>')).toContain('About');
    const html = `<html><body><div class="show-more-less-html__markup relative">${LONG}<ul><li>SQL</li></ul></div></body></html>`;
    const f = vi.fn(async () => reply(200, html));
    const r = await fetchJobDescription('https://www.linkedin.com/comm/jobs/view/4466833623/?trackingId=a', f as unknown as typeof fetch);
    expect(r.via).toBe('page');
    expect(r.text).toContain('• SQL');
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('https://www.linkedin.com/jobs/view/4466833623');
  });
});

describe('fetchJobDescription', () => {
  it('reads a LinkedIn-style page from its JSON-LD', async () => {
    const f = vi.fn(async () => reply(200, page({ '@type': 'JobPosting', title: 'Data Analyst', description: `<p>${LONG}</p>` })));
    const r = await fetchJobDescription('https://www.linkedin.com/jobs/view/3912345678', f as unknown as typeof fetch);
    expect(r.via).toBe('json-ld');
    expect(r.text).toContain('build dashboards');
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('https://www.linkedin.com/jobs/view/3912345678');
  });

  it('uses the Greenhouse posting API instead of the page', async () => {
    const f = vi.fn(async (url: string) => {
      expect(url).toBe('https://boards-api.greenhouse.io/v1/boards/acme/jobs/4412345?content=true');
      return reply(200, JSON.stringify({ content: `&lt;p&gt;${LONG}&lt;/p&gt;` }));
    });
    const r = await fetchJobDescription('https://boards.greenhouse.io/acme/jobs/4412345?gh_src=x', f as unknown as typeof fetch);
    expect(r.via).toBe('ats-api');
    expect(r.text).toContain('Data Analyst');
  });

  it('uses the Lever posting API', async () => {
    const f = vi.fn(async (url: string) => {
      expect(url).toBe('https://api.lever.co/v0/postings/acme/0a1b2c3d-4e5f-6789-abcd-ef0123456789');
      return reply(200, JSON.stringify({ descriptionPlain: LONG, lists: [{ text: 'Requirements', content: '<li>SQL</li><li>Python</li>' }], additionalPlain: 'Equal opportunity employer.' }));
    });
    const r = await fetchJobDescription('https://jobs.lever.co/acme/0a1b2c3d-4e5f-6789-abcd-ef0123456789', f as unknown as typeof fetch);
    expect(r.text).toContain('Requirements');
    expect(r.text).toContain('• SQL');
  });

  it('says plainly when a site blocks automatic reading, wants sign-in, or the posting is gone', async () => {
    const status = (n: number) => fetchJobDescription('https://www.indeed.com/viewjob?jk=a1b2c3d4e5f60789', (async () => reply(n, 'nope')) as unknown as typeof fetch).catch((e) => e);
    expect((await status(403)).kind).toBe('blocked');
    expect((await status(429)).kind).toBe('blocked');
    expect((await status(404)).kind).toBe('not_found');
    expect((await status(500)).kind).toBe('unreadable');
  });

  it('treats a bot-check page as blocked, and a page with no posting data as unreadable', async () => {
    const check = (async () => reply(200, '<html><body>Please verify you are human. Captcha</body></html>')) as unknown as typeof fetch;
    expect((await fetchJobDescription('https://www.indeed.com/viewjob?jk=a1b2c3d4e5f60789', check).catch((e) => e)).kind).toBe('blocked');
    const empty = (async () => reply(200, '<html><body>Hello</body></html>')) as unknown as typeof fetch;
    expect((await fetchJobDescription('https://www.naukri.com/job-listings-x-1', empty).catch((e) => e)).kind).toBe('unreadable');
  });

  it('refuses a description that is too short to be real', async () => {
    const short = (async () => reply(200, page({ '@type': 'JobPosting', description: '<p>Apply now</p>' }))) as unknown as typeof fetch;
    expect((await fetchJobDescription('https://www.naukri.com/job-listings-x-1', short).catch((e) => e)).kind).toBe('unreadable');
  });

  it('does not follow a redirect off the job sites, and does not fetch an unsupported link at all', async () => {
    const f = vi.fn(async () => reply(302, '', { location: 'http://169.254.169.254/latest/meta-data/' }));
    const err = await fetchJobDescription('https://www.linkedin.com/jobs/view/3912345678', f as unknown as typeof fetch).catch((e) => e);
    expect(err).toBeInstanceOf(DescriptionError);
    expect(err.kind).toBe('unsupported');
    expect(f).toHaveBeenCalledTimes(1);
    const g = vi.fn();
    expect((await fetchJobDescription('https://evil.example/job', g as unknown as typeof fetch).catch((e) => e)).kind).toBe('unsupported');
    expect(g).not.toHaveBeenCalled();
  });

  it('follows a normal redirect between allowed hosts', async () => {
    let n = 0;
    const f = vi.fn(async () => (n++ === 0 ? reply(301, '', { location: 'https://www.linkedin.com/jobs/view/3912345678/' }) : reply(200, page({ '@type': 'JobPosting', description: `<p>${LONG}</p>` }))));
    expect((await fetchJobDescription('https://linkedin.com/jobs/view/3912345678', f as unknown as typeof fetch)).via).toBe('json-ld');
    expect(f).toHaveBeenCalledTimes(2);
  });
});
