import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateText, GeminiError, getModel, type TokenUsage } from './gemini';
import { resetKeyPools } from './keyPool';

const ok = (text = 'hello') =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 300, thoughtsTokenCount: 20, cachedContentTokenCount: 900 },
    }),
    { status: 200 },
  );

const status = (code: number, body = '{}', headers: Record<string, string> = {}) =>
  new Response(body, { status: code, headers });

describe('gemini client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('GEMINI_API_KEYS', 'key-aaaa,key-bbbb,key-cccc,key-dddd');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('GEMINI_MODEL', '');
    resetKeyPools();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const call = (extra = {}) => generateText({ systemPrompt: 'SYSTEM', userPrompt: 'USER', ...extra });
  const sentKeys = () => fetchMock.mock.calls.map(([, init]) => (init.headers as Record<string, string>)['x-goog-api-key']);

  it('defaults to a lite model', () => {
    expect(getModel()).toMatch(/lite/);
  });

  it('puts the static prompt in systemInstruction and the request in contents', async () => {
    fetchMock.mockResolvedValue(ok());
    await call();
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.systemInstruction.parts[0].text).toBe('SYSTEM');
    expect(sent.contents[0].parts[0].text).toBe('USER');
    expect(sent.generationConfig.maxOutputTokens).toBeGreaterThan(0);
    expect(sent.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
  });

  it('steps down the thinking ladder on a generic 400, then remembers what worked', async () => {
    vi.stubEnv('GEMINI_MODEL', 'model-that-rejects-thinking');
    fetchMock.mockResolvedValueOnce(status(400, '{"error":{"message":"Request contains an invalid argument."}}'));
    fetchMock.mockResolvedValueOnce(status(400, '{"error":{"message":"Request contains an invalid argument."}}'));
    fetchMock.mockImplementation(async () => ok('worked'));

    await expect(call()).resolves.toBe('worked');
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).generationConfig.thinkingConfig);
    expect(bodies).toEqual([{ thinkingLevel: 'minimal' }, { thinkingBudget: 0 }, undefined]);

    // The next call goes straight to the mode that worked: no further 400s.
    fetchMock.mockClear();
    await call();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).generationConfig.thinkingConfig).toBeUndefined();
  });

  it('reports token usage, counting reasoning tokens as output', async () => {
    fetchMock.mockResolvedValue(ok());
    const usage: TokenUsage[] = [];
    await call({ onUsage: (u: TokenUsage) => usage.push(u) });
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ promptTokens: 1200, outputTokens: 320, cachedTokens: 900 });
    expect(usage[0].keyId).toMatch(/^#\d…/);
    expect(JSON.stringify(usage[0])).not.toContain('key-');
  });

  it('spreads consecutive calls across the keys', async () => {
    fetchMock.mockImplementation(async () => ok());
    for (let i = 0; i < 4; i += 1) await call();
    expect(new Set(sentKeys()).size).toBe(4);
  });

  it('fails over to another key on a 429 without waiting', async () => {
    fetchMock.mockResolvedValueOnce(status(429, '{"error":{"status":"RESOURCE_EXHAUSTED"}}'));
    fetchMock.mockResolvedValue(ok('second key worked'));
    const started = Date.now();
    await expect(call()).resolves.toBe('second key worked');
    const keys = sentKeys();
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
    expect(Date.now() - started).toBeLessThan(1_500);
  });

  it('skips a rejected key on later calls', async () => {
    fetchMock.mockResolvedValueOnce(status(403, '{"error":"denied"}'));
    fetchMock.mockImplementation(async () => ok());
    await call();
    const badKey = sentKeys()[0];
    fetchMock.mockClear();
    for (let i = 0; i < 6; i += 1) await call();
    expect(sentKeys()).not.toContain(badKey);
  });

  it('gives up once the whole thinking ladder has been tried on a genuinely bad request', async () => {
    vi.stubEnv('GEMINI_MODEL', 'model-that-is-just-broken');
    fetchMock.mockImplementation(async () => status(400, '{"error":"bad"}'));
    await expect(call()).rejects.toBeInstanceOf(GeminiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('says so clearly when no key is configured', async () => {
    vi.stubEnv('GEMINI_API_KEYS', '');
    resetKeyPools();
    await expect(call()).rejects.toThrow(/No Gemini API key/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
