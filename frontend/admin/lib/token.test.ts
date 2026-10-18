import { describe, expect, it } from 'vitest';

import { issue, SESSION_SECONDS, verify, type Claims } from './token';

const KEY = Buffer.from('a-development-key-that-is-not-a-default-in-production');
const OTHER = Buffer.from('a completely different key');
const NOW = 1_700_000_000;

const claims: Omit<Claims, 'iat' | 'exp'> = {
  sub: '00000000-0000-0000-0000-000000000001',
  eml: 'ops@settleflow.internal',
  rol: ['operator'],
  epo: 3,
};

function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o))
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

describe('session tokens', () => {
  it('round trips', () => {
    const out = verify(issue(claims, KEY, NOW), KEY, NOW);
    expect(out?.sub).toBe(claims.sub);
    expect(out?.rol).toEqual(['operator']);
    expect(out?.epo).toBe(3);
  });

  it('refuses a token signed with another key', () => {
    expect(verify(issue(claims, KEY, NOW), OTHER, NOW)).toBeNull();
  });

  it('refuses a tampered payload', () => {
    const token = issue(claims, KEY, NOW);
    const parts = token.split('.');
    // Claim superadmin, keep the original signature.
    const forged = b64url({ ...claims, rol: ['superadmin'], iat: NOW, exp: NOW + 999 });
    expect(verify(`${parts[0]}.${forged}.${parts[2]}`, KEY, NOW)).toBeNull();
  });

  it('refuses an alg:none token', () => {
    // The classic JWT library vulnerability. This never reads `alg`, so a forged header fails on
    // its signature like anything else.
    const token = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ exp: 9_999_999_999 })}.`;
    expect(verify(token, KEY, NOW)).toBeNull();
  });

  it('expires', () => {
    const token = issue(claims, KEY, NOW);
    expect(verify(token, KEY, NOW + SESSION_SECONDS - 1)).not.toBeNull();
    expect(verify(token, KEY, NOW + SESSION_SECONDS)).toBeNull();
  });

  it('refuses rubbish rather than throwing', () => {
    for (const bad of ['', '.', 'a.b', 'a.b.c.d', 'not-a-token', 'a.b.!!!']) {
      expect(verify(bad, KEY, NOW)).toBeNull();
    }
  });

  it('refuses a signature of the wrong length without throwing', () => {
    // timingSafeEqual throws on a length mismatch; the length check has to come first.
    const parts = issue(claims, KEY, NOW).split('.');
    expect(verify(`${parts[0]}.${parts[1]}.short`, KEY, NOW)).toBeNull();
  });
});
