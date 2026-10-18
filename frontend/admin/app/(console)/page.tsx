import { AlertTriangle } from 'lucide-react';

import { dashboardAttention, dashboardHealth, dashboardRecent } from '@/app/_actions/dashboard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatAmount } from '@/lib/format';
import { abbreviate } from '@/utils/string';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard · SettleFlow operations' };

function statusVariant(status: string) {
  switch (status) {
    case 'paid':
      return 'ok' as const;
    case 'pending':
      return 'warn' as const;
    case 'approved':
      return 'info' as const;
    case 'cancelled':
      return 'err' as const;
    default:
      return 'muted' as const;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          {label}
        </p>
        <p className="tabular mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [health, attention, recent] = await Promise.all([
    dashboardHealth(),
    dashboardAttention(),
    dashboardRecent(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pending" value={health.requests_pending} />
        <Stat label="Approved" value={health.requests_approved} />
        <Stat label="Paid" value={health.requests_paid} />
        <Stat label="In flight" value={health.settlements_in_flight} />
      </section>

      {/* What needs looking at comes before what merely happened. A dashboard of counts tells you
          the system is busy; this tells you what is stuck. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4" />
            Needs attention
            {attention.length > 0 ? (
              <Badge variant="warn">{attention.length}</Badge>
            ) : (
              <Badge variant="ok">clear</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attention.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing unresolved, nothing quarantined, nothing approved past its expiry.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attention.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant={a.severity === 'high' ? 'err' : 'warn'}>{a.kind}</Badge>
                    </TableCell>
                    <TableCell className="tabular text-xs">{a.detail}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{a.since ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signatures</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.reference}</TableCell>
                    <TableCell className="tabular text-xs">
                      {abbreviate(r.payee_address)}
                    </TableCell>
                    <TableCell className="tabular">
                      {formatAmount(r.amount)} {r.asset_code}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="tabular text-xs">
                      {r.collected !== null ? `${r.collected} / ${r.required}` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.created_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Ingest cursor at ledger {health.cursor ?? '—'} · {health.chain_events} chain events
        {Number(health.quarantined) > 0 ? ` · ${health.quarantined} quarantined` : ''}
      </p>
    </div>
  );
}
