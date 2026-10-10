import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RESPONSE_SCHEMA } from '../gmail/extract';
import { __resetQuotaBlock, generateWithWorkersAi, toJsonSchema, workersAiConfigured, workersAiModel, WorkersAiError } from './workersAi';

describe('toJsonSchema', () => {
  it('turns the Gemini schema into standard JSON Schema: lower-case types, nullable as a type list, strict objects', () => {
    const s = toJsonSchema(RESPONSE_SCHEMA) as { type: string; required: string[]; additionalProperties: boolean; properties: Record<string, { type: unknown; enum?: unknown[] }> };
    expect(s.type).toBe('object');
    expect(s.additionalProperties).toBe(false);
    expect(s.properties.company.type).toEqual(['string', 'null']);
    expect(s.properties.is_job_related.type).toBe('boolean');
    expect(s.properties.confidence.type).toBe('number');
    expect(s.properties.email_type.enum).toContain('interview_invite');
    expect(s.properties.work_mode.enum).toEqual(['remote', 'hybrid', 'onsite', null]);
  });

  it('keeps the required list from the source schema (the optional facts may be left out when unknown)', () => {
    const s = toJsonSchema(RESPONSE_SCHEMA) as { required: string[] };
    expect(s.required.sort()).toEqual([...RESPONSE_SCHEMA.required].sort());
  });
});

describe('generateWithWorkersAi', () => {
  beforeEach(() => {
    vi.stubEnv('CF_AI_ACCOUNT_ID', 'acct123');
    vi.stubEnv('CF_AI_TOKEN', 'secret-token');
    vi.stubEnv('WORKERS_AI_MODEL', '');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); __resetQuotaBlock(); });

  const reply = (body: unknown, status = 200) => vi.fn(async () => ({ ok: status < 400, status, json: async () => body }));

  it('defaults to the 70B model and reports whether it is configured', () => {
    expect(workersAiModel()).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect(workersAiConfigured()).toBe(true);
    expect(workersAiConfigured({ CF_AI_ACCOUNT_ID: 'a' })).toBe(false);
  });

  it('posts messages and the JSON schema to the account, with the token in a header only', async () => {
    const f = reply({ success: true, result: { response: { company: 'Acme' }, usage: { prompt_tokens: 500, completion_tokens: 80 } } });
    vi.stubGlobal('fetch', f);
    const usage: unknown[] = [];
    const out = await generateWithWorkersAi({ systemPrompt: 'sys', userPrompt: 'usr', jsonSchema: RESPONSE_SCHEMA, onUsage: (u) => usage.push(u) });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/acct123/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect(url).not.toContain('secret-token');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([{ role: 'system', content: 'sys' }, { role: 'user', content: 'usr' }]);
    expect(body.response_format.type).toBe('json_schema');
    expect(out).toBe('{"company":"Acme"}');
    expect(usage[0]).toMatchObject({ promptTokens: 500, outputTokens: 80 });
  });

  it('accepts a string response and the OpenAI-style choices shape', async () => {
    vi.stubGlobal('fetch', reply({ success: true, result: { response: '{"a":1}' } }));
    expect(await generateWithWorkersAi({ systemPrompt: 's', userPrompt: 'u' })).toBe('{"a":1}');
    vi.stubGlobal('fetch', reply({ success: true, result: { choices: [{ message: { content: '{"b":2}' } }] } }));
    expect(await generateWithWorkersAi({ systemPrompt: 's', userPrompt: 'u' })).toBe('{"b":2}');
  });

  it('flags the free daily allowance running out, and a server error as retryable', async () => {
    vi.stubGlobal('fetch', reply({ success: false, errors: [{ code: 4006, message: 'you have used up your daily free allocation of 10,000 neurons' }] }, 429));
    const quota = await generateWithWorkersAi({ systemPrompt: 's', userPrompt: 'u' }).catch((e) => e);
    expect(quota).toBeInstanceOf(WorkersAiError);
    expect(quota.quota).toBe(true);
    __resetQuotaBlock();
    vi.stubGlobal('fetch', reply({ success: false, errors: [{ message: 'oops' }] }, 503));
    const down = await generateWithWorkersAi({ systemPrompt: 's', userPrompt: 'u' }).catch((e) => e);
    expect(down.retryable).toBe(true);
    expect(down.quota).toBe(false);
  });

  it('after the allowance is used up it stops calling for a while instead of failing every message', async () => {
    const f = reply({ success: false, errors: [{ code: 4006, message: 'daily free allocation used' }] }, 429);
    vi.stubGlobal('fetch', f);
    await generateWithWorkersAi({ systemPrompt: 's', userPrompt: 'u' }).catch(() => undefined);
    const again = await generateWithWorkersAi({ systemPrompt: 's', userPrompt: 'u' }).catch((e) => e);
    expect(again.quota).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('refuses to run without credentials, and says so without a network call', async () => {
    vi.stubEnv('CF_AI_TOKEN', '');
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await expect(generateWithWorkersAi({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(/not set/);
    expect(f).not.toHaveBeenCalled();
  });
});
