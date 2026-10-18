import { describe, expect, it } from 'vitest';

import { abbreviate, fromSlug, toSlug, toTitle } from './string';

describe('slugs', () => {
  it('round trips every table name in this schema', () => {
    const tables = [
      'payment_requests',
      'settlements',
      'settlement_approvals',
      'chain_events',
      'ingest_cursor',
      'idempotency_keys',
      'audit_events',
      'governance_policies',
      'policy_signers',
      'auth_challenges',
    ];
    for (const t of tables) {
      expect(fromSlug(toSlug(t))).toBe(t);
    }
  });

  it('turns a name into something readable', () => {
    expect(toTitle('payment_requests')).toBe('Payment requests');
    expect(toTitle('settlement_approvals')).toBe('Settlement approvals');
  });
});

describe('abbreviation', () => {
  it('shortens a long hash', () => {
    const hash = 'a'.repeat(64);
    expect(abbreviate(hash)).toBe('aaaaaa…aaaaaa');
  });

  it('leaves a short value alone', () => {
    expect(abbreviate('paid')).toBe('paid');
  });
});
