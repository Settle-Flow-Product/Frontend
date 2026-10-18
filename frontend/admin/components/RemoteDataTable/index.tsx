import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cell, isAddressColumn, isHashColumn, expertAccount, expertTx } from '@/lib/format';
import type { Listing } from '@/types/table';
import { abbreviate } from '@/utils/string';

/**
 * One page of one table.
 *
 * A single component rather than a bespoke list per module. Ten hand-written copies would be ten
 * places to fix the same rendering bug, and the eleventh table would arrive with none of them.
 */
export function RemoteDataTable({ listing }: { listing: Listing }) {
  const { columns, rows, page, perPage, total } = listing;
  const pages = Math.max(1, Math.ceil(total / perPage));

  const href = (p: number) => `/admin/${listing.slug}?page=${p}&perPage=${perPage}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">{listing.title}</h1>
        <span className="text-muted-foreground text-xs">
          {total} {total === 1 ? 'row' : 'rows'}
        </span>
      </div>

      {/* Read-only is stated with its reason. A missing button explains nothing. */}
      {listing.readOnlyBecause ? (
        <p className="text-muted-foreground border-l-2 pl-3 text-xs">{listing.readOnlyBecause}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No rows.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.name} title={c.dataType}>
                    {c.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => {
                    const raw = row[c.name];
                    const text = cell(raw);
                    const long = typeof raw === 'string' && raw.length > 24;

                    let content: React.ReactNode = long ? abbreviate(raw as string) : text;
                    if (typeof raw === 'string' && raw !== '') {
                      if (isHashColumn(c.name)) {
                        content = (
                          <a
                            href={expertTx(raw)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4"
                          >
                            {abbreviate(raw)}
                          </a>
                        );
                      } else if (isAddressColumn(c.name)) {
                        content = (
                          <a
                            href={expertAccount(raw)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4"
                          >
                            {abbreviate(raw)}
                          </a>
                        );
                      }
                    }

                    return (
                      <TableCell
                        key={c.name}
                        className={long ? 'tabular text-xs' : 'text-xs'}
                        title={typeof raw === 'string' ? raw : undefined}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center gap-3 text-xs">
          {page > 1 ? (
            <a href={href(page - 1)} className="underline underline-offset-4">
              Previous
            </a>
          ) : (
            <span className="text-muted-foreground">Previous</span>
          )}
          <Badge variant="secondary">
            {page} of {pages}
          </Badge>
          {page < pages ? (
            <a href={href(page + 1)} className="underline underline-offset-4">
              Next
            </a>
          ) : (
            <span className="text-muted-foreground">Next</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
