import type { NextApiRequest, NextApiResponse } from 'next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ workers: true }));
vi.mock('./runtime', () => ({ isWorkers: () => runtime.workers }));

import { forwardIfWorkers } from './proxy';

function fakeRes() {
  const out = { status: 0, headers: {} as Record<string, string>, body: undefined as unknown };
  const res = {
    status(code: number) {
      out.status = code;
      return res;
    },
    setHeader(k: string, v: string) {
      out.headers[k.toLowerCase()] = v;
      return res;
    },
    json(b: unknown) {
      out.body = b;
      return res;
    },
    send(b: unknown) {
      out.body = b;
      return res;
    },
  };
  return { res: res as unknown as NextApiResponse, out };
}

const req = (over: Partial<NextApiRequest> = {}) =>
  ({ method: 'POST', url: '/api/documents/generate', headers: { authorization: 'Bearer t0k', 'x-request-id': 'rid1', cookie: 'secret=1' }, body: { resumeText: 'hi' }, ...over }) as unknown as NextApiRequest;

const fetchMock = vi.fn();

beforeEach(() => {
  runtime.workers = true;
  process.env.GENERATE_ORIGIN = 'https://gen.example.com/';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GENERATE_ORIGIN;
});

describe('forwardIfWorkers', () => {
  it('does nothing on Node: the route runs in place', async () => {
    runtime.workers = false;
    const { res } = fakeRes();
    expect(await forwardIfWorkers(req(), res)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses with 503 instead of running generation inside the CPU limit when no origin is configured', async () => {
    delete process.env.GENERATE_ORIGIN;
    const { res, out } = fakeRes();
    expect(await forwardIfWorkers(req(), res)).toBe(true);
    expect(out.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards path, body and only the headers it needs (never cookies)', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ resumeId: 'r1' }), { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'rid1' } }));
    const { res, out } = fakeRes();
    expect(await forwardIfWorkers(req(), res)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gen.example.com/api/documents/generate');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer t0k');
    expect(init.headers['x-request-id']).toBe('rid1');
    expect(init.headers.cookie).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ resumeText: 'hi' });
    expect(out.status).toBe(200);
    expect(out.headers['content-type']).toBe('application/json');
    expect(JSON.parse(String(out.body))).toEqual({ resumeId: 'r1' });
  });

  it("relays the origin's error status and body unchanged (a 429 quota message must reach the user)", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'limit reached' }), { status: 429, headers: { 'content-type': 'application/json' } }));
    const { res, out } = fakeRes();
    await forwardIfWorkers(req(), res);
    expect(out.status).toBe(429);
    expect(JSON.parse(String(out.body))).toEqual({ error: 'limit reached' });
  });

  it('passes binary responses (a compiled PDF) through intact', async () => {
    const pdf = Buffer.from('%PDF-1.7 binary');
    fetchMock.mockResolvedValue(new Response(pdf, { status: 200, headers: { 'content-type': 'application/pdf' } }));
    const { res, out } = fakeRes();
    await forwardIfWorkers(req({ url: '/api/documents/compile' }), res);
    expect(out.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(out.body as Buffer).equals(pdf)).toBe(true);
  });

  it('answers 502 when the origin cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const { res, out } = fakeRes();
    expect(await forwardIfWorkers(req(), res)).toBe(true);
    expect(out.status).toBe(502);
  });
});
