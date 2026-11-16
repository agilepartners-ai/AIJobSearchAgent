import { describe, expect, it } from 'vitest';
import { cleanItem, isLinkCode } from './jobwingRepo';

describe('JobWing sync input', () => {
  it('accepts a normal item and bounds every field', () => {
    const item = cleanItem({ external_key: 'lever:acme:1', company_name: 'Acme', position: 'Data Analyst', status: 'applied', job_posting_url: 'https://acme.test/1', priority: 9, remote_option: 1, notes: 'x'.repeat(9000) });
    expect(item).toMatchObject({ external_key: 'lever:acme:1', status: 'applied', priority: 5, remote_option: true, job_posting_url: 'https://acme.test/1' });
    expect(item!.notes!.length).toBe(5000);
  });

  it('rejects items without a key, company or position', () => {
    expect(cleanItem({ company_name: 'Acme', position: 'X' })).toBeNull();
    expect(cleanItem({ external_key: 'k', position: 'X' })).toBeNull();
    expect(cleanItem('nope')).toBeNull();
    expect(cleanItem(null)).toBeNull();
  });

  it('falls back to not_applied for an unknown status and drops a non-web link', () => {
    const item = cleanItem({ external_key: 'k', company_name: 'A', position: 'B', status: 'hired!!', job_posting_url: 'javascript:alert(1)' });
    expect(item).toMatchObject({ status: 'not_applied', job_posting_url: null });
  });

  it('recognises link codes by shape only', () => {
    expect(isLinkCode('jwk_abcdefghijklmnopqrstuvwxyz012345')).toBe(true);
    expect(isLinkCode('eyJhbGciOiJFUzI1NiJ9.x.y')).toBe(false);
    expect(isLinkCode('jwk_short')).toBe(false);
    expect(isLinkCode(undefined)).toBe(false);
  });
});
