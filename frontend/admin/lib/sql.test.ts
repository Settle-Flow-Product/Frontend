import { describe, expect, it } from 'vitest';

import { isBinaryType, isWideNumberType, literal, quote, rowJson } from './sql';

/**
 * These functions are the whole safety argument for a generic table browser: the one part of a
 * statement that cannot be a bound parameter is an identifier.
 */
describe('identifier quoting', () => {
  it('quotes a plain name', () => {
    expect(quote('payment_requests')).toBe('"payment_requests"');
  });

  it('survives a keyword or a capital', () => {
    expect(quote('order')).toBe('"order"');
    expect(quote('Amount')).toBe('"Amount"');
  });

  it('doubles an embedded quote rather than letting it end the identifier', () => {
    // The case where a name reaches here from somewhere other than the catalogue check.
    expect(quote('a"; DROP TABLE settlements; --')).toBe('"a""; DROP TABLE settlements; --"');
  });

  it('doubles an embedded quote in a literal too', () => {
    expect(literal("it's")).toBe("'it''s'");
  });
});

describe('types that do not survive a JavaScript number', () => {
  it('knows the wide ones', () => {
    expect(isWideNumberType('numeric')).toBe(true);
    expect(isWideNumberType('numeric(30,7)')).toBe(true);
    expect(isWideNumberType('bigint')).toBe(true);
  });

  it('leaves narrow ones alone', () => {
    expect(isWideNumberType('integer')).toBe(false);
    expect(isWideNumberType('text')).toBe(false);
  });

  it('excludes arrays, because casting one to text changes its shape', () => {
    expect(isWideNumberType('numeric[]')).toBe(false);
  });

  it('spots bytea, which renders unreadably by default', () => {
    expect(isBinaryType('bytea')).toBe(true);
    expect(isBinaryType('text')).toBe(false);
  });
});

describe('rendering a row as JSON', () => {
  it('casts wide numbers to text so the digits survive', () => {
    const sql = rowJson([{ name: 'amount', dataType: 'numeric(30,7)' }]);
    expect(sql).toContain('"amount"::text');
  });

  it('hex-encodes binary so an id is readable', () => {
    const sql = rowJson([{ name: 'id', dataType: 'bytea' }]);
    expect(sql).toContain(`encode("id", 'hex')`);
  });

  it('leaves ordinary columns as they are', () => {
    const sql = rowJson([{ name: 'status', dataType: 'text' }]);
    expect(sql).toContain(`'status', "status"`);
    expect(sql).not.toContain('::text');
  });
});
