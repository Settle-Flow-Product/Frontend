import 'server-only';

import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';

/**
 * The admin console's own connection to Postgres.
 *
 * # Why the console talks to the database and not to the backend
 *
 * This app has a server. Routing every read through the Rust service would mean a hand-written
 * endpoint per table, in the language whose job is the money path — where the sequence lock and the
 * signature arithmetic live — for the sake of screens that browse rows. The backend keeps the
 * endpoints that compute a **verdict**; this answers "show me what is in the table".
 *
 * The database still has one owner of its shape. Migrations live in `backend/migrations` and are
 * applied by the backend at boot. Nothing here creates a table.
 *
 * # Everything here is server-only
 *
 * The `server-only` import is not decoration: it makes the build fail loudly if a client component
 * ever imports this module, rather than shipping a connection string into a browser bundle.
 *
 * # Numerics stay strings
 *
 * `pg` parses `numeric` and `bigint` into JavaScript numbers by default, which silently rounds
 * anything past 2^53. Every amount in this schema is `numeric(30,7)` and a ledger sequence is a
 * `bigint`. They are read as text and stay text all the way to the screen — the console displays
 * them and never does arithmetic on them.
 */

// 1700 numeric, 20 int8. Registered once, at module load, before any pool exists.
types.setTypeParser(1700, (v) => v);
types.setTypeParser(20, (v) => v);

declare global {
  // eslint-disable-next-line no-var
  var __settleAdminPool: Pool | undefined;
}

function make(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === '') {
    throw new Error(
      'DATABASE_URL is not set on the admin console. It reads the database directly — see ' +
        'docker-compose.yml, where it is the same URL the backend is given.',
    );
  }

  return new Pool({
    connectionString,
    // Small on purpose. This pool shares a database with the submitter, which holds a row lock
    // while it decides whether to send a payment. A console that can open thirty connections is a
    // console that can queue that decision behind a table browse.
    max: Number(process.env.DATABASE_POOL_MAX ?? '6'),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
}

/**
 * One pool per process, kept on `globalThis`.
 *
 * Next's dev server re-evaluates modules on every edit. A module-level `new Pool()` therefore leaks
 * a pool per save, and the symptom — `too many clients already`, twenty edits in — reads as a
 * database problem rather than a hot-reload one.
 */
export function pool(): Pool {
  globalThis.__settleAdminPool ??= make();
  return globalThis.__settleAdminPool;
}

/** A query, with the rows typed by the caller. */
export async function query<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  const result = await pool().query<T>(text, values as unknown[]);
  return result.rows;
}

/** The first row, or `null`. */
export async function one<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

/** Run a function inside one transaction. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
