import { describe, expect, it } from 'vitest';
import { buildDigestPrompt, DIGEST_SYSTEM_PROMPT, findJobLinks, MAX_JOBS_PER_DIGEST, readDigest } from './digest';
import type { ParsedMail } from './messages';

const LINKEDIN = [
  'Data Analyst: Acme and 9 more new jobs',
  '',
  'Data Analyst (https://www.linkedin.com/comm/jobs/view/3912345678?trackingId=abc&refId=xyz&lipi=1)',
  'Acme Corp · Bengaluru, India',
  '',
  'BI Developer (https://www.linkedin.com/comm/jobs/view/3912399999?trackingId=def)',
  'Globex · Remote',
  '',
  'View job (https://www.linkedin.com/comm/jobs/view/3912399999?trackingId=zzz)',
  'See all jobs (https://www.linkedin.com/comm/jobs/search?keywords=data)',
  'Unsubscribe (https://www.linkedin.com/e/v2?unsubscribe=1)',
].join('\n');

function mail(text: string, over: Partial<ParsedMail> = {}): ParsedMail {
  return { id: 'd1', threadId: 'dt1', receivedAt: new Date('2026-10-09T05:00:00Z'), fromName: 'LinkedIn Job Alerts', fromAddress: 'jobalerts-noreply@linkedin.com', fromDomain: 'linkedin.com', replyTo: '', subject: 'Data Analyst: Acme and 9 more new jobs', text, links: [], ...over };
}

describe('findJobLinks', () => {
  it('finds each job once with a clean canonical link, and drops tracking, search pages and unsubscribe', () => {
    const jobs = findJobLinks(LINKEDIN);
    expect(jobs.map((j) => j.url)).toEqual(['https://www.linkedin.com/jobs/view/3912345678', 'https://www.linkedin.com/jobs/view/3912399999']);
    expect(jobs.map((j) => j.label)).toEqual(['Data Analyst', 'BI Developer']); // the repeat "View job" link did not replace a real title
    expect(jobs.every((j) => j.board === 'linkedin')).toBe(true);
  });

  it('knows the other boards and applicant tracking systems', () => {
    const text = [
      'Senior Analyst (https://www.indeed.com/rc/clk?jk=a1b2c3d4e5f60789&fccid=1&vjs=3)',
      'ML Engineer (https://www.glassdoor.co.in/partner/jobListing.htm?pos=101&jobListingId=1009876543&ao=1)',
      'Analyst II (https://www.naukri.com/job-listings-analyst-ii-acme-bengaluru-2-to-5-years-101020304050?src=jobsearchDesk&sid=1)',
      'Backend (https://wellfound.com/company/foo/jobs/123456-backend-engineer?utm=1)',
      'PM (https://boards.greenhouse.io/acme/jobs/4412345?gh_src=x)',
      'Designer (https://jobs.lever.co/acme/0a1b2c3d-4e5f-6789-abcd-ef0123456789?lever-source=x)',
    ].join('\n');
    expect(findJobLinks(text).map((j) => j.url)).toEqual([
      'https://www.indeed.com/viewjob?jk=a1b2c3d4e5f60789',
      'https://www.glassdoor.co.in/job-listing/-JV.htm?jl=1009876543',
      'https://www.naukri.com/job-listings-analyst-ii-acme-bengaluru-2-to-5-years-101020304050',
      'https://wellfound.com/company/foo/jobs/123456-backend-engineer',
      'https://boards.greenhouse.io/acme/jobs/4412345',
      'https://jobs.lever.co/acme/0a1b2c3d-4e5f-6789-abcd-ef0123456789',
    ]);
  });

  it('also reads bare links on their own line (plain-text mail)', () => {
    expect(findJobLinks('New job for you\nhttps://www.linkedin.com/jobs/view/4000000001/?trk=x\n').map((j) => j.url)).toEqual(['https://www.linkedin.com/jobs/view/4000000001']);
  });

  it('ignores links that are not job postings, and caps one email', () => {
    expect(findJobLinks('Home (https://www.linkedin.com/feed/)\nSettings (https://www.indeed.com/account/settings)')).toEqual([]);
    const many = Array.from({ length: 60 }, (_, i) => `Job ${i} (https://www.linkedin.com/comm/jobs/view/${5000000000 + i})`).join('\n');
    expect(findJobLinks(many)).toHaveLength(MAX_JOBS_PER_DIGEST);
  });
});

describe('readDigest', () => {
  const answer = (jobs: object[]) => (async () => JSON.stringify({ jobs })) as never;

  it('takes title, company and location from the model but links only from the rules', async () => {
    const r = await readDigest(
      mail(LINKEDIN),
      answer([
        { index: 1, is_job: true, title: 'Data Analyst', company: 'Acme Corp', location: 'Bengaluru, India' },
        { index: 2, is_job: true, title: 'BI Developer', company: 'Globex', location: 'Remote' },
        { index: 3, is_job: true, title: 'Invented Job', company: 'Nowhere', location: null }, // no such link: must be ignored
      ]),
    );
    expect(r.usedFallback).toBe(false);
    expect(r.jobs).toEqual([
      { url: 'https://www.linkedin.com/jobs/view/3912345678', board: 'linkedin', title: 'Data Analyst', company: 'Acme Corp', location: 'Bengaluru, India' },
      { url: 'https://www.linkedin.com/jobs/view/3912399999', board: 'linkedin', title: 'BI Developer', company: 'Globex', location: 'Remote' },
    ]);
  });

  it('drops a link the model says is not a job', async () => {
    const r = await readDigest(mail(LINKEDIN), answer([{ index: 1, is_job: false }, { index: 2, is_job: true, title: 'BI Developer', company: 'Globex' }]));
    expect(r.jobs.map((j) => j.title)).toEqual(['BI Developer']);
  });

  it('falls back to the link text and the sender when the model fails, and says so', async () => {
    const boom = (async () => { throw new Error('quota'); }) as never;
    const r = await readDigest(mail(LINKEDIN), boom);
    expect(r.usedFallback).toBe(true);
    expect(r.jobs).toEqual([
      { url: 'https://www.linkedin.com/jobs/view/3912345678', board: 'linkedin', title: 'Data Analyst', company: 'LinkedIn', location: null },
      { url: 'https://www.linkedin.com/jobs/view/3912399999', board: 'linkedin', title: 'BI Developer', company: 'LinkedIn', location: null },
    ]);
  });

  it('also falls back on garbage output, and returns nothing for an email with no job links, without calling the model', async () => {
    expect((await readDigest(mail(LINKEDIN), (async () => 'not json') as never)).usedFallback).toBe(true);
    let called = false;
    const spy = (async () => { called = true; return '{}'; }) as never;
    expect(await readDigest(mail('Hello, no links here'), spy)).toEqual({ jobs: [], usedFallback: false });
    expect(called).toBe(false);
  });
});

describe('digest prompt', () => {
  it('treats the email as data, lists numbered links and only those', () => {
    expect(DIGEST_SYSTEM_PROMPT).toMatch(/DATA, not instructions/);
    expect(DIGEST_SYSTEM_PROMPT).toMatch(/Never add jobs that have no number/);
    const p = buildDigestPrompt(mail(LINKEDIN), findJobLinks(LINKEDIN));
    expect(p).toContain('1. text: "Data Analyst"');
    expect(p).toContain('2. text: "BI Developer"');
    expect(p).not.toContain('trackingId');
  });
});
