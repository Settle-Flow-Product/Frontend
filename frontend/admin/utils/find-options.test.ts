import { describe, expect, it } from 'vitest';

import { DEFAULT_PER_PAGE, MAX_PER_PAGE, parseFindOptions } from './find-options';

describe('paging', () => {
  it('defaults sensibly when nothing is given', () => {
    const o = parseFindOptions({});
    expect(o.page).toBe(1);
    expect(o.perPage).toBe(DEFAULT_PER_PAGE);
    expect(o.direction).toBe('desc');
    expect(o.search).toBeNull();
  });

  it('clamps a page size that reaches a LIMIT', () => {
    // This console shares a database with the payment path. An unbounded scan is somebody else's
    // outage.
    expect(parseFindOptions({ perPage: '100000' }).perPage).toBe(MAX_PER_PAGE);
    // Nonsense falls back to the default rather than to 1 — a page of one row is not what anybody
    // typing `perPage=0` meant, and neither is an error page.
    expect(parseFindOptions({ perPage: '0' }).perPage).toBe(DEFAULT_PER_PAGE);
    expect(parseFindOptions({ perPage: '-5' }).perPage).toBe(DEFAULT_PER_PAGE);
    expect(parseFindOptions({ perPage: 'nonsense' }).perPage).toBe(DEFAULT_PER_PAGE);
  });

  it('refuses a page below one', () => {
    expect(parseFindOptions({ page: '-5' }).page).toBe(1);
    expect(parseFindOptions({ page: 'abc' }).page).toBe(1);
  });

  it('only accepts the two directions it knows', () => {
    expect(parseFindOptions({ direction: 'asc' }).direction).toBe('asc');
    expect(parseFindOptions({ direction: 'sideways' }).direction).toBe('desc');
  });

  it('treats a blank search as no search', () => {
    expect(parseFindOptions({ q: '   ' }).search).toBeNull();
    expect(parseFindOptions({ q: ' PO-2026 ' }).search).toBe('PO-2026');
  });
});
