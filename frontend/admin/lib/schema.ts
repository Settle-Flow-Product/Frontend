import 'server-only';

import type { Column, Table, Writability } from '@/types/table';
import { query } from './db';

export type { Column, Table, Writability };

/**
 * What is in the database, read from the database.
 *
 * # Why the catalogue and not a hand-written list of modules
 *
 * A module per table, hand-written, is ten files that are correct until the next migration and then
 * silently incomplete — the new table simply does not appear, and nothing says so. Reading
 * `pg_catalog` means a table added by a migration is a module the moment the migration runs.
 *
 * # Identifiers come from here and nowhere else
 *
 * A generic table browser is SQL injection waiting to happen, because the one part of a statement
 * that cannot be a bound parameter is a table or column name. Every identifier that reaches a
 * statement in `crud.ts` was first found in this catalogue and compared for exact equality. Values
 * are always bound. That is the whole safety argument, and it lives in these two files.
 */

/**
 * Rebuilt from the chain by the indexer. Readable, never writable.
 *
 * Editing a projection does not change what happened; it changes what the console *says* happened,
 * until the next ingest overwrites it. That is worse than not being able to edit at all.
 */
const PROJECTIONS = new Set(['chain_events', 'ingest_cursor']);

/**
 * Append-only by permission in the database, and by refusal here.
 *
 * `REVOKE UPDATE, DELETE` in migration 0008 is the real enforcement. This set means the console
 * does not offer a button that would fail, which is a different and smaller promise.
 */
const APPEND_ONLY = new Set(['audit_events', 'chain_events']);

/**
 * Not offered as a generic module at all.
 *
 * `auth_challenges` holds live single-use nonces: listing them is showing unspent credentials.
 *
 * `admin_users` is managed from the command line (`scripts/admin-user.mjs`) and has no screen at
 * all. A password must be hashed on the way in, and roles decide who may edit roles — reachable
 * through the generic writer, an `admin` could put a `password_hash` they generated into a
 * `superadmin`'s row and become one. Keeping account changes on the host, where they leave a shell
 * history, is a smaller thing to get right than a screen that has to re-derive that reasoning.
 */
const HIDDEN = new Set(['admin_users', 'auth_challenges', '_sqlx_migrations']);

/**
 * Tables the console must never write to, whatever the catalogue says.
 *
 * `settlements` and `settlement_approvals` are the money path. A row edited here would change what
 * the submitter believes about a payment that may already be in flight — including its reserved
 * sequence number, which is the one value two payments must never share.
 */
const MONEY_PATH = new Set(['settlements', 'settlement_approvals', 'payment_requests']);

export function addressable(table: Table): boolean {
  return table.primaryKey.length > 0;
}

export function writable(table: Table): boolean {
  return table.writability === 'writable' && addressable(table);
}

/** Why a table refuses writes, in words an operator can act on. */
export function whyReadOnly(table: Table): string | null {
  if (table.writability === 'projection') {
    return 'Rebuilt from the chain by the indexer. Editing it changes what this screen says, not what happened.';
  }
  if (table.writability === 'append-only') {
    return 'Append-only. The database has revoked UPDATE and DELETE on it — a log its own users can edit is not one.';
  }
  if (!addressable(table)) {
    return 'No primary key, so a statement cannot name one row. An UPDATE here would name all of them.';
  }
  return null;
}

function writabilityOf(name: string): Writability {
  if (PROJECTIONS.has(name)) return 'projection';
  if (APPEND_ONLY.has(name)) return 'append-only';
  if (MONEY_PATH.has(name)) return 'projection';
  return 'writable';
}

/** Every table the console will show, read from `pg_catalog`. */
export async function catalogue(): Promise<Table[]> {
  const rows = await query<{
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    has_default: boolean;
    is_primary_key: boolean;
    ordinal: number;
  }>(
    `
    SELECT c.relname                          AS table_name,
           a.attname                          AS column_name,
           format_type(a.atttypid, a.atttypmod) AS data_type,
           NOT a.attnotnull                   AS is_nullable,
           a.atthasdef                        AS has_default,
           COALESCE(pk.is_pk, false)          AS is_primary_key,
           a.attnum                           AS ordinal
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN LATERAL (
        SELECT true AS is_pk
        FROM pg_index i
        WHERE i.indrelid = c.oid AND i.indisprimary AND a.attnum = ANY (i.indkey)
    ) pk ON true
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname, a.attnum
    `,
  );

  const byTable = new Map<string, Table>();
  for (const r of rows) {
    if (HIDDEN.has(r.table_name)) continue;

    let t = byTable.get(r.table_name);
    if (!t) {
      t = {
        name: r.table_name,
        columns: [],
        primaryKey: [],
        writability: writabilityOf(r.table_name),
      };
      byTable.set(r.table_name, t);
    }
    t.columns.push({
      name: r.column_name,
      dataType: r.data_type,
      nullable: r.is_nullable,
      hasDefault: r.has_default,
    });
    if (r.is_primary_key) t.primaryKey.push(r.column_name);
  }

  return [...byTable.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** One table, or null if the catalogue does not have it. */
export async function describe(name: string): Promise<Table | null> {
  const all = await catalogue();
  return all.find((t) => t.name === name) ?? null;
}
