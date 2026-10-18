'use client';

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Empty, ErrorNote, LoadingRows } from '@/components/States';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError, api, type PaymentRequest } from '@/lib/api';
import { abbreviate, formatAmount } from '@/lib/format';
import { currentSession } from '@/lib/session';

export function RequestList() {
  const [rows, setRows] = useState<PaymentRequest[] | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const load = useCallback(async () => {
    const session = currentSession();
    if (!session) {
      window.location.href = '/';
      return;
    }
    try {
      setRows(await api.listRequests(session.token));
    } catch (e) {
      if (e instanceof ApiError) setError({ code: e.body.code, message: e.body.message });
      else setError({ code: 'UNKNOWN', message: 'Could not load payments.' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorNote code={error.code} message={error.message} />;
  if (!rows) return <LoadingRows />;

  return (
    <main className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">Payments</h1>
        <span className="text-muted-foreground text-xs">
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {rows.length === 0 ? (
        <Empty
          title="No payments yet."
          action={
            <Button asChild>
              <a href="/requests/new">
                <Plus />
                Create the first payment
              </a>
            </Button>
          }
        />
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="divide-y px-0">
            {rows.map((r) => (
              <a
                key={r.id}
                href={`/approve/${r.id}`}
                className="hover:bg-muted/50 block px-4 py-3 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{r.reference}</span>
                  <span className="tabular text-sm">
                    {formatAmount(r.amount)} {r.asset_code}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <StatusBadge status={r.status} />
                  <span className="tabular text-muted-foreground text-xs">
                    {abbreviate(r.payee_address)}
                  </span>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <Button asChild variant="outline">
        <a href="/requests/new">
          <Plus />
          Create payment
        </a>
      </Button>
    </main>
  );
}
