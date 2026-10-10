import { describe, expect, it } from 'vitest';
import { FIXTURES } from './fixtures';
import { boardFor, prefilter } from './prefilter';

const meta = (fromDomain: string, subject: string, snippet = '') => ({ fromDomain, subject, snippet });

describe('prefilter', () => {
  it('knows the job boards and applicant tracking systems, including subdomains', () => {
    expect(boardFor('us.greenhouse-mail.io')).toBe('greenhouse');
    expect(boardFor('hire.lever.co')).toBe('lever');
    expect(boardFor('acme.myworkdayjobs.com')).toBe('workday');
    expect(boardFor('jobs-noreply@linkedin.com'.split('@')[1])).toBe('linkedin');
    expect(boardFor('evil-linkedin.com')).toBeNull();
    expect(boardFor('gmail.com')).toBeNull();
  });

  it('lets application mail through', () => {
    expect(prefilter(meta('greenhouse.io', 'Thank you for applying to Acme')).candidate).toBe(true);
    expect(prefilter(meta('acme.example', 'Interview invitation: Data Analyst')).candidate).toBe(true);
    expect(prefilter(meta('acme.example', 'Update on your application')).candidate).toBe(true);
    expect(prefilter(meta('acme.example', 'Next steps', 'We would like to schedule your interview')).candidate).toBe(true);
  });

  it('recognises recommended-jobs emails as digests, for suggestions, and not as applications', () => {
    for (const subject of ['Data Analyst: Acme and 9 more new jobs', 'Senior BI Developer at Globex is hiring', '12 new jobs for you', 'Jobs you may be interested in', 'Be an early applicant: Analyst at Foo']) {
      const v = prefilter(meta('linkedin.com', subject));
      expect(v.digest, subject).toBe(true);
      expect(v.candidate, subject).toBe(false);
    }
    expect(prefilter(meta('greenhouse.io', 'Thank you for applying to Acme')).digest).toBeUndefined();
  });

  it('drops job-alert digests even from a job board', () => {
    expect(prefilter(meta('linkedin.com', '12 new jobs for you: data analyst')).candidate).toBe(false);
    expect(prefilter(meta('indeed.com', 'Jobs matching your alert')).candidate).toBe(false);
    expect(prefilter(meta('linkedin.com', 'Recommended jobs this week')).candidate).toBe(false);
  });

  it('keeps an alert-looking subject when it is really about the user\'s application', () => {
    expect(prefilter(meta('linkedin.com', 'Your application: 3 new jobs for you, interview request')).candidate).toBe(true);
  });

  it('drops receipts, security notices and marketing', () => {
    for (const subject of ['Your receipt for October', 'Security alert: new sign-in', 'Order confirmation #123', 'Your verification code', 'Weekly newsletter']) {
      expect(prefilter(meta('example.com', subject)).candidate, subject).toBe(false);
    }
  });

  it('drops mail with no job signals', () => {
    expect(prefilter(meta('friend.example', 'Lunch on Friday?')).candidate).toBe(false);
  });

  it('lets any board mail through (the model decides) unless it is a digest', () => {
    expect(prefilter(meta('wellfound.com', 'A message from the founder')).candidate).toBe(true);
  });

  it('agrees with the fixture set: every real application passes, digests and receipts do not', () => {
    for (const f of FIXTURES) {
      const verdict = prefilter({ fromDomain: f.mail.fromDomain, subject: f.mail.subject, snippet: f.mail.text.slice(0, 160) });
      if (f.expect.is_job_related && f.expect.email_type) expect(verdict.candidate, f.name).toBe(true);
      if (f.name.startsWith('Job alert') || f.name.startsWith('Receipt')) expect(verdict.candidate, f.name).toBe(false);
    }
  });
});
