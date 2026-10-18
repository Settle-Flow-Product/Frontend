import { describe, expect, it } from 'vitest';

import { abbreviate, countdown, formatAmount, fromStroops, isStellarAddress, toStroops } from './format';

describe('money never becomes a number', () => {
  it('parses seven decimal places exactly', () => {
    expect(toStroops('4500')).toBe(45_000_000_000n);
    expect(toStroops('4500.0000000')).toBe(45_000_000_000n);
    expect(toStroops('0.0000001')).toBe(1n);
    expect(toStroops('1.5')).toBe(15_000_000n);
  });

  it('refuses an eighth decimal place', () => {
    expect(toStroops('1.00000001')).toBeNull();
  });

  it('refuses what a permissive parser would accept', () => {
    for (const bad of ['4.5e3', 'abc', '', '.', '1.2.3', '-1', '0x10']) {
      expect(toStroops(bad), bad).toBeNull();
    }
  });

  it('tolerates the separators people paste', () => {
    expect(toStroops('4,500.50')).toBe(45_005_000_000n);
    expect(toStroops('4_500')).toBe(45_000_000_000n);
  });

  it('survives a magnitude that would break a double', () => {
    // 9,007,199,254.7409911 in stroops exceeds Number.MAX_SAFE_INTEGER. A number would lose the
    // last digits silently; a bigint does not.
    const large = '9007199254.7409911';
    expect(fromStroops(toStroops(large)!)).toBe(large);
  });

  it('round trips through its own rendering', () => {
    for (const s of ['4500.0000000', '0.0000001', '1.5000000', '999999.9999999']) {
      expect(fromStroops(toStroops(s)!)).toBe(s);
    }
  });

  it('groups the whole part without dropping a decimal place', () => {
    expect(formatAmount('4500.0000000')).toBe('4,500.0000000');
    expect(formatAmount('1234567.8900000')).toBe('1,234,567.8900000');
  });
});

describe('addresses', () => {
  const valid = `G${'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.repeat(2)}${'ABCDEFGHIJKLMNOPQRSTUV'}`.slice(0, 56);

  it('accepts a well-formed address', () => {
    expect(isStellarAddress(valid)).toBe(true);
  });

  it('refuses characters outside the base32 alphabet', () => {
    // 0, 1, 8 and 9 are excluded precisely so a typo is detectable.
    for (const bad of ['0', '1', '8', '9', 'a']) {
      expect(isStellarAddress(valid.slice(0, 10) + bad + valid.slice(11))).toBe(false);
    }
  });

  it('refuses a contract address', () => {
    expect(isStellarAddress(`C${valid.slice(1)}`)).toBe(false);
  });

  it('abbreviates for display only', () => {
    const short = abbreviate(valid);
    expect(short).toContain('…');
    expect(isStellarAddress(short)).toBe(false);
  });
});

describe('the approver countdown', () => {
  const now = Date.parse('2026-08-19T14:00:00Z');

  it('counts the transaction window down', () => {
    expect(countdown('2026-08-19T14:47:12Z', now)).toBe('47:12');
    expect(countdown('2026-08-19T15:30:00Z', now)).toBe('1:30:00');
  });

  it('says expired rather than counting backwards', () => {
    expect(countdown('2026-08-19T13:59:59Z', now)).toBe('expired');
    expect(countdown('2026-08-19T14:00:00Z', now)).toBe('expired');
  });

  it('does not crash on rubbish', () => {
    expect(countdown('not a date', now)).toBe('expired');
  });
});
