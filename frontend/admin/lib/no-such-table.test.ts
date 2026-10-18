import { describe, expect, it } from 'vitest';

import { isNoSuchTable, NoSuchTable } from './no-such-table';

describe('NoSuchTable', () => {
  it('names the table it refused, so a log line says which URL was asked for', () => {
    expect(new NoSuchTable('admin_users').message).toBe('there is no table called admin_users here');
  });

  it('is recognised structurally, because the error may have crossed a module boundary', () => {
    // Not `instanceof`: a bundler may load two copies of this module, and an error rebuilt from a
    // serialised action response is a plain object with the same shape and no prototype in common.
    expect(isNoSuchTable(new NoSuchTable('x'))).toBe(true);
    expect(isNoSuchTable({ code: 'no_such_table' })).toBe(true);
  });

  it('does not swallow other failures — only this one becomes a 404', () => {
    // If this ever returned true for a database outage, the console would answer "no such table"
    // while the real fault went unlogged.
    expect(isNoSuchTable(new Error('connection refused'))).toBe(false);
    expect(isNoSuchTable(new Error('sign in to use the console'))).toBe(false);
    expect(isNoSuchTable(null)).toBe(false);
    expect(isNoSuchTable(undefined)).toBe(false);
    expect(isNoSuchTable('no_such_table')).toBe(false);
  });
});
