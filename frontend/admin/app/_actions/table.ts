'use server';

import * as crud from '@/lib/crud';
import { NoSuchTable } from '@/lib/no-such-table';
import { catalogue, describe, whyReadOnly, writable } from '@/lib/schema';
import { currentCaller, type Caller } from '@/lib/session';
import type { Listing, Module, Record_, Table } from '@/types/table';
import { parseFindOptions, type FindOptions } from '@/utils/find-options';
import { fromSlug, toSlug, toTitle } from '@/utils/string';

/**
 * Every table module's data access, in one place.
 *
 * # Server actions, not API routes
 *
 * The console has a server; a module's list is rendered by it. Going out to an HTTP endpoint that
 * this same process would answer adds a round trip, a second serialisation of every row, and a
 * second place to forget the permission check.
 *
 * # The permission check is here, per call
 *
 * Not in the layout, and not in the component that hides a button. The layout stops a browser being
 * shown a screen it cannot fill; hiding a button is a courtesy. A server action is a POST endpoint
 * with a generated name — anything callable is callable by somebody who is not supposed to, so each
 * one asks who is calling before it does anything.
 */
async function caller(need: 'read' | 'write'): Promise<Caller> {
  const who = await currentCaller();
  if (who === null) throw new Error('sign in to use the console');

  const allowed = need === 'read' ? who.grants.read : who.grants.write;
  if (!allowed) {
    throw new Error(`your roles (${who.account.roles.join(', ')}) do not allow that`);
  }
  return who;
}

/** Resolve a URL segment to a table, or refuse. `payment-requests` → `payment_requests`. */
async function tableOf(slug: string): Promise<Table> {
  const table = await describe(fromSlug(slug));
  if (table === null) throw new NoSuchTable(fromSlug(slug));
  return table;
}

/** Every table the console will show, for the navigation. */
export async function tableModules(): Promise<Module[]> {
  await caller('read');
  const tables = await catalogue();
  return tables.map((t) => ({
    slug: toSlug(t.name),
    table: t.name,
    title: toTitle(t.name),
    writable: writable(t),
    readOnlyBecause: whyReadOnly(t),
  }));
}

/** One page of one table. */
export async function tableList(
  slug: string,
  params: Record<string, string | string[] | undefined>,
): Promise<Listing> {
  await caller('read');
  const table = await tableOf(slug);
  const options: FindOptions = parseFindOptions(params);
  const { rows, total } = await crud.list(table, options);

  return {
    slug,
    title: toTitle(table.name),
    columns: table.columns,
    primaryKey: table.primaryKey,
    rows,
    total,
    page: options.page,
    perPage: options.perPage,
    writable: writable(table),
    readOnlyBecause: whyReadOnly(table),
  };
}

/** One row, by its primary key. */
export async function tableFind(slug: string, key: string[]): Promise<Record_ | null> {
  await caller('read');
  const table = await tableOf(slug);
  return crud.find(table, key);
}
