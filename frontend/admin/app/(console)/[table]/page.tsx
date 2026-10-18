import { notFound } from 'next/navigation';

import { RemoteDataTable } from '@/components/RemoteDataTable';
import { tableList } from '@/app/_actions/table';
import { isNoSuchTable } from '@/lib/no-such-table';
import type { Listing } from '@/types/table';

export const dynamic = 'force-dynamic';

/**
 * Every table module, in one route.
 *
 * The catalogue decides what exists, so a table added by a migration is browsable the moment the
 * migration runs — no file to add, and nothing that silently goes missing.
 */
export default async function TablePage({
  params,
  searchParams,
}: {
  params: Promise<{ table: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { table } = await params;

  let listing: Listing;
  try {
    listing = await tableList(table, await searchParams);
  } catch (error) {
    // A URL naming a table that is not on the catalogue — misspelled, or deliberately hidden.
    // Either way it is a 404, and both answer identically so neither confirms the other exists.
    if (isNoSuchTable(error)) notFound();
    throw error;
  }

  return <RemoteDataTable listing={listing} />;
}
