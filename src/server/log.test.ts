import { describe, expect, it, vi } from 'vitest';
import { cleanRequestId, createRequestLog } from './log';

describe('cleanRequestId', () => {
  it('accepts a plain short token and rejects anything else', () => {
    expect(cleanRequestId('k3Jx9aQp2mZz')).toBe('k3Jx9aQp2mZz');
    expect(cleanRequestId('short')).toBeNull();
    expect(cleanRequestId('has spaces and \n newline')).toBeNull();
    expect(cleanRequestId('<script>alert(1)</script>')).toBeNull();
    expect(cleanRequestId('x'.repeat(65))).toBeNull();
    expect(cleanRequestId(undefined)).toBeNull();
    expect(cleanRequestId(12345678)).toBeNull();
  });
});

describe('createRequestLog', () => {
  const sink = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

  it('tags every line with the scope and request id, and includes data compactly', () => {
    const s = sink();
    const log = createRequestLog('generate', 'abc12345', s);
    log.step('llm', { calls: 1 });
    log.step('done');
    expect(s.info.mock.calls[0][0]).toMatch(/^\[generate rid=abc12345\] \+\d+ms llm \{"calls":1\}$/);
    expect(s.info.mock.calls[1][0]).toMatch(/^\[generate rid=abc12345\] \+\d+ms done$/);
  });

  it('logs an error with its class, message and where it was thrown', () => {
    const s = sink();
    const log = createRequestLog('generate', 'abc12345', s);
    log.error('failed', new TypeError('boom'), { refunded: true });
    const line = s.error.mock.calls[0][0] as string;
    expect(line).toContain('TypeError: boom');
    expect(line).toContain('{"refunded":true}');
    expect(line).toContain('@');
  });

  it('copes with a thrown non-Error', () => {
    const s = sink();
    createRequestLog('generate', 'abc12345', s).error('failed', 'just a string');
    expect(s.error.mock.calls[0][0]).toContain('just a string');
  });
});
