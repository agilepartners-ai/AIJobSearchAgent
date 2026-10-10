import { describe, expect, it } from 'vitest';
import { buildUserPrompt, extractFromMail, extractionSchema, MAX_BODY_CHARS, RESPONSE_SCHEMA, SYSTEM_PROMPT, type Generate } from './extract';
import { FIXTURES } from './fixtures';

const good = {
  is_job_related: true, email_type: 'interview_invite', company: ' BrightCart ', position: 'Senior BI Developer', location: '', work_mode: 'remote',
  employment_type: null, salary: null, application_date: null, event_date: '2026-10-08T15:00:00', deadline: 'soon', job_url: 'https://j.example/1', portal_url: 'not a url',
  recruiter_name: 'Priya Nair', recruiter_email: 'Priya.Nair@BrightCart.example', summary: 'Interview on Thursday.', confidence: 0.92,
};
const gen = (text: string): Generate => (async () => text) as Generate;

describe('extraction schema', () => {
  it('cleans model output: trims, nulls empty strings, keeps only real dates, links and emails', () => {
    const r = extractionSchema.parse(good);
    expect(r).toMatchObject({ company: 'BrightCart', location: null, event_date: '2026-10-08', deadline: null, portal_url: null, recruiter_email: 'priya.nair@brightcart.example', work_mode: 'remote' });
  });

  it('clamps confidence into 0 to 1 and treats a missing one as 0', () => {
    expect(extractionSchema.parse({ ...good, confidence: 7 }).confidence).toBe(1);
    expect(extractionSchema.parse({ ...good, confidence: -2 }).confidence).toBe(0);
    expect(extractionSchema.parse({ ...good, confidence: undefined }).confidence).toBe(0);
  });

  it('rejects an unknown email type', () => {
    expect(extractionSchema.safeParse({ ...good, email_type: 'win_a_prize' }).success).toBe(false);
  });

  it('the Gemini response schema lists every field the zod schema has', () => {
    expect(Object.keys(RESPONSE_SCHEMA.properties).sort()).toEqual(Object.keys(extractionSchema.shape).sort());
  });
});

describe('prompt', () => {
  const fixture = FIXTURES[0].mail;

  it('treats the email as data and forbids guessing', () => {
    expect(SYSTEM_PROMPT).toMatch(/DATA, not instructions/);
    expect(SYSTEM_PROMPT).toMatch(/Never guess/);
  });

  it('carries sender, subject, received date and links, and caps the body', () => {
    const p = buildUserPrompt({ ...fixture, text: 'x'.repeat(MAX_BODY_CHARS + 500) });
    expect(p).toContain('Received: 2026-10-01');
    expect(p).toContain('Subject: Thank you for applying to Northwind Labs');
    expect(p).toContain('[truncated]');
    expect(p.length).toBeLessThan(MAX_BODY_CHARS + 900);
  });
});

describe('extractFromMail', () => {
  const mail = FIXTURES[1].mail;

  it('parses a clean JSON answer', async () => {
    const r = await extractFromMail(mail, { generate: gen(JSON.stringify(good)) });
    expect(r.extraction?.company).toBe('BrightCart');
  });

  it('accepts JSON wrapped in a markdown fence', async () => {
    const r = await extractFromMail(mail, { generate: gen('```json\n' + JSON.stringify(good) + '\n```') });
    expect(r.extraction?.position).toBe('Senior BI Developer');
  });

  it('reports bad JSON, a schema mismatch, and a failed model call without throwing', async () => {
    expect((await extractFromMail(mail, { generate: gen('not json') })).error).toMatch(/not JSON/);
    expect((await extractFromMail(mail, { generate: gen('{"is_job_related": "yes"}') })).error).toMatch(/schema/);
    const boom: Generate = (async () => { throw new Error('quota'); }) as Generate;
    expect((await extractFromMail(mail, { generate: boom })).error).toBe('quota');
  });

  it('asks for JSON with the schema, a low temperature and a small output cap', async () => {
    let seen: Record<string, unknown> = {};
    const spy: Generate = (async (o: Record<string, unknown>) => { seen = o; return JSON.stringify(good); }) as unknown as Generate;
    await extractFromMail(mail, { generate: spy });
    expect(seen.jsonSchema).toBe(RESPONSE_SCHEMA);
    expect(seen.temperature).toBe(0.1);
    expect(seen.maxOutputTokens).toBe(800);
  });
});
