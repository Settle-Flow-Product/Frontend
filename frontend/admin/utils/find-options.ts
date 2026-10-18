/** How a list is paged and sorted, parsed from the query string. */

export const DEFAULT_PER_PAGE = 25;
export const MAX_PER_PAGE = 200;

export interface FindOptions {
  page: number;
  perPage: number;
  sort: string | null;
  direction: 'asc' | 'desc';
  search: string | null;
}

type Params = Record<string, string | string[] | undefined>;

/**
 * A positive integer, or the fallback.
 *
 * Explicit rather than `Number(x) || fallback`: that idiom silently turns 0 into the fallback and
 * -5 into -5, which are different kinds of wrong and only one of them is caught.
 */
function positive(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function first(params: Params, key: string): string | null {
  const v = params[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/**
 * Read paging out of a query string, clamping rather than trusting.
 *
 * `perPage` is capped because it reaches a `LIMIT`. An operator who types 100000 into the URL
 * should get a large page, not an unbounded scan of a table that shares its database with the
 * payment path.
 */
export function parseFindOptions(params: Params): FindOptions {
  const page = positive(first(params, 'page'), 1);
  // Clamped, not trusted: this reaches a LIMIT, and an operator who types 100000 into the URL
  // should get a large page rather than an unbounded scan of a table that shares its database
  // with the payment path.
  const perPage = Math.min(MAX_PER_PAGE, positive(first(params, 'perPage'), DEFAULT_PER_PAGE));
  const direction = first(params, 'direction') === 'asc' ? 'asc' : 'desc';
  const search = first(params, 'q');

  return {
    page,
    perPage,
    sort: first(params, 'sort'),
    direction,
    search: search && search.trim() !== '' ? search.trim() : null,
  };
}
