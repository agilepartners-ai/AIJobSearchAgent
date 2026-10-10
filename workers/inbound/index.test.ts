import { describe, expect, it, vi } from 'vitest';
import worker, { handleEmail, MAX_RAW_BYTES, type Env, type InboundMessage } from './index';

const env: Env = { INBOUND_ORIGIN: 'https://gen.example/', INBOUND_SECRET: 'shared-secret-0123456789' };
const TO = 'jobs+abcdefghijklmnopqrstuvwxyz@in.agilepartners-ai.com';

function msg(over: Partial<InboundMessage> = {}, body = 'From: a@b.c\r\n\r\nhello'): InboundMessage & { rejected?: string } {
  const bytes = new TextEncoder().encode(body);
  const m: InboundMessage & { rejected?: string } = {
    to: TO,
    rawSize: bytes.length,
    raw: new Response(bytes).body as ReadableStream<Uint8Array>,
    setReject(reason: string) { m.rejected = reason; },
    ...over,
  };
  return m;
}
const ok = () => vi.fn(async () => new Response('{}', { status: 200 }));

describe('inbound email worker', () => {
  it('posts the raw message to the VM with the secret and the recipient, and nothing else', async () => {
    const f = ok();
    const m = msg();
    expect(await handleEmail(m, env, f as unknown as typeof fetch)).toBe('delivered');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://gen.example/api/inbound/email');
    expect(init.method).toBe('POST');
    const h = init.headers as Record<string, string>;
    expect(h['x-inbound-secret']).toBe(env.INBOUND_SECRET);
    expect(h['x-inbound-to']).toBe(TO);
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('From: a@b.c\r\n\r\nhello');
    expect(m.rejected).toBeUndefined();
  });

  it('rejects, without calling the VM, an address that is not a forwarding address', async () => {
    const f = ok();
    for (const to of ['info@in.agilepartners-ai.com', 'jobs@in.agilepartners-ai.com', 'jobs+short@in.agilepartners-ai.com']) {
      const m = msg({ to });
      expect(await handleEmail(m, env, f as unknown as typeof fetch)).toBe('rejected');
      expect(m.rejected).toBe('Unknown address');
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('rejects an oversize message before reading it', async () => {
    const f = ok();
    const m = msg({ rawSize: MAX_RAW_BYTES + 1 });
    expect(await handleEmail(m, env, f as unknown as typeof fetch)).toBe('rejected');
    expect(m.rejected).toMatch(/too large/i);
    expect(f).not.toHaveBeenCalled();
  });

  it('throws when the VM is down or refuses us, so the mail is not silently lost', async () => {
    await expect(handleEmail(msg(), env, vi.fn(async () => new Response('x', { status: 503 })) as unknown as typeof fetch)).rejects.toThrow(/503/);
    await expect(handleEmail(msg(), env, vi.fn(async () => new Response('x', { status: 401 })) as unknown as typeof fetch)).rejects.toThrow(/refused/);
    await expect(handleEmail(msg(), env, vi.fn(async () => { throw new Error('network'); }) as unknown as typeof fetch)).rejects.toThrow(/network/);
  });

  it('answers a web request with a harmless line', async () => {
    const r = await worker.fetch();
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ajsa-inbound: email only');
  });
});
