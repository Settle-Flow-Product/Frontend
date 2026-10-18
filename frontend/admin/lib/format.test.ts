import { describe, expect, it } from 'vitest';

import { cell, formatAmount, isAddressColumn, isHashColumn } from './format';

describe('amounts stay strings', () => {
  it('groups without touching the decimals', () => {
    expect(formatAmount('4500.0000000')).toBe('4,500.0000000');
    expect(formatAmount('1234567.8900000')).toBe('1,234,567.8900000');
  });

  it('survives a magnitude a double would round', () => {
    // The database sends amounts as text for exactly this reason.
    const big = '99999999999999999999.1234567';
    expect(formatAmount(big)).toContain('.1234567');
  });
});

describe('table cells', () => {
  it('shows a dash for nothing rather than "null"', () => {
    expect(cell(null)).toBe('—');
    expect(cell(undefined)).toBe('—');
  });

  it('spells out booleans', () => {
    expect(cell(true)).toBe('yes');
    expect(cell(false)).toBe('no');
  });

  it('leaves strings alone', () => {
    expect(cell('pending')).toBe('pending');
  });
});

describe('columns worth linking', () => {
  it('spots addresses and hashes', () => {
    expect(isAddressColumn('payee_address')).toBe(true);
    expect(isAddressColumn('treasury_address')).toBe(true);
    expect(isAddressColumn('reference')).toBe(false);
    expect(isHashColumn('tx_hash')).toBe(true);
    expect(isHashColumn('create_tx_hash')).toBe(true);
    expect(isHashColumn('amount')).toBe(false);
  });
});
