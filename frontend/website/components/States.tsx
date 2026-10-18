import { AlertCircle, Clock } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Loading — a skeleton shaped like what is coming, never a full-screen spinner. */
export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

/** Empty — an explanation and one clear action. Never a forced creation flow. */
export function Empty({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-muted-foreground text-sm">{title}</p>
        {action}
      </CardContent>
    </Card>
  );
}

/** Error — a reason a person understands, plus the trace id support will ask for. */
export function ErrorNote({
  code,
  message,
  traceId,
}: {
  code: string;
  message: string;
  traceId?: string;
}) {
  return (
    <Alert variant="err">
      <AlertCircle />
      <AlertTitle>{message}</AlertTitle>
      <AlertDescription>
        <span className="tabular text-xs opacity-80">{traceId ? `${code} · ${traceId}` : code}</span>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Unresolved — the state that is usually got wrong.
 *
 * It offers **Check again**, never **Send again**. Offering a resend after a timeout is how a
 * vendor gets paid twice, so the only affordance re-reads rather than re-sends.
 */
export function Unresolved({ onCheckAgain, txHash }: { onCheckAgain: () => void; txHash?: string }) {
  return (
    <Alert variant="warn">
      <Clock />
      <AlertTitle>We have not been able to confirm the outcome</AlertTitle>
      <AlertDescription>
        <p>
          <strong>Do not send it again</strong> — reopen this page in a few minutes.
        </p>
        {txHash ? <span className="tabular text-xs">{txHash}</span> : null}
        <Button size="sm" variant="outline" className="mt-2" onClick={onCheckAgain}>
          Check again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
