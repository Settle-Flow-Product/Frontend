import 'server-only';

import type { Column, Record_, Table } from '@/types/table';
import type { FindOptions } from '@/utils/find-options';
import { query } from './db';
import { quote, rowJson } from './sql';

/**
 * Reads against a table the catalogue has already vouched for.
 *
 * **Every identifier here came from `schema.ts` and was compared for exact equality; every value is
 * bound.** Nothing in this file takes a name straight from a URL.
 */

/** Columns worth searching: the text-ish ones. Searching a timestamp for a substring is noise. */
function searchable(columns: readonly Column[]): Column[] {
  return columns.filter(
    (c) => c.dataType === 'text' || c.dataType.startsWith('character') || c.dataType === 'bytea',
  );
}

function orderBy(table: Table, options: FindOptions): string {
  const requested = options.sort;
  const known = requested && table.columns.some((c) => c.name === requested) ? requested : null;

  // A stable fallback, so paging does not reshuffle rows between requests. Postgres makes no
  // ordering promise without ORDER BY, and a pager over an unordered set shows duplicates.
  const column = known ?? table.primaryKey[0] ?? table.columns[0]?.name;
  if (!column) return '';
  return `ORDER BY ${quote(column)} ${options.direction === 'asc' ? 'ASC' : 'DESC'}`;
}

export interface Page {
  rows: Record_[];
  total: number;
}

export async function list(table: Table, options: FindOptions): Promise<Page> {
  const json = rowJson(table.columns);
  const cols = searchable(table.columns);

  const where: string[] = [];
  const values: unknown[] = [];

  if (options.search && cols.length > 0) {
    values.push(`%${options.search}%`);
    const idx = values.length;
    const clauses = cols.map((c) =>
      c.dataType === 'bytea'
        ? `encode(${quote(c.name)}, 'hex') ILIKE $${idx}`
        : `${quote(c.name)}::text ILIKE $${idx}`,
    );
    where.push(`(${clauses.join(' OR ')})`);
  }

  const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (options.page - 1) * options.perPage;

  const rows = await query<{ row: Record_ }>(
    `SELECT ${json} AS row FROM ${quote(table.name)} ${clause} ${orderBy(table, options)}
     LIMIT ${options.perPage} OFFSET ${offset}`,
    values,
  );

  const counted = await query<{ total: string }>(
    `SELECT count(*)::text AS total FROM ${quote(table.name)} ${clause}`,
    values,
  );

  return {
    rows: rows.map((r) => r.row),
    total: Number(counted[0]?.total ?? '0'),
  };
}

/** One row, found by its primary key. */
export async function find(table: Table, key: readonly string[]): Promise<Record_ | null> {
  if (table.primaryKey.length === 0 || key.length !== table.primaryKey.length) return null;

  const json = rowJson(table.columns);
  const conditions = table.primaryKey.map((name, i) => {
    const column = table.columns.find((c) => c.name === name);
    // A bytea key arrives as hex in the URL, because that is how it was displayed.
    if (column && column.dataType === 'bytea') return `${quote(name)} = decode($${i + 1}, 'hex')`;
    return `${quote(name)}::text = $${i + 1}`;
  });

  const rows = await query<{ row: Record_ }>(
    `SELECT ${json} AS row FROM ${quote(table.name)} WHERE ${conditions.join(' AND ')} LIMIT 1`,
    [...key],
  );
  return rows[0]?.row ?? null;
}
