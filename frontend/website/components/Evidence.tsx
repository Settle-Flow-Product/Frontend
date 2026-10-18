'use client';

import { Circle, Copy, ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ErrorNote, LoadingRows } from '@/components/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type Milestone } from '@/lib/api';
import { abbreviate } from '@/lib/format';
import { currentSession } from '@/lib/session';

/**
 * The most important screen in SOW 1.
 *
 * The Chapter Lead accepts the work by opening this page. Six rows, six mandatory milestones.
 */
export function Evidence({ id }: { id: string }) {
  const [data, setData] = useState<{
    reference: string;
    complete: boolean;
    milestones: Milestone[];
  } | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const session = currentSession();
    if (!session) {
      window.location.href = '/';
      return;
    }
    try {
      setData(await api.evidence(session.token, id));
    } catch (e) {
      if (e instanceof ApiError) setError({ code: e.body.code, message: e.body.message });
      else setError({ code: 'UNKNOWN', message: 'Could not load the evidence.' });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorNote code={error.code} message={error.message} />;
  if (!data) return <LoadingRows rows={6} />;

  // Plain text in table form, ready to paste straight into the Instawards submission form.
  const plainText = data.milestones
    .map((m) => `${m.milestone}\t${m.event}\t${m.value ?? '(missing)'}`)
    .join('\n');

  return (
    <main className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">On-chain evidence</h1>
        <Badge variant={data.complete ? 'ok' : 'warn'}>
          {data.complete ? 'Complete' : 'Incomplete'}
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm">{data.reference}</p>

      <Card className="py-0">
        <CardContent className="px-2">
          <Table>
            <TableBody>
              {data.milestones.map((m) => (
                <TableRow key={m.milestone}>
                  <TableCell className="w-8">
                    {/* A grey circle rather than a tick, so a glance shows what is still missing. */}
                    {m.value ? (
                      <span className="text-ok-foreground">✓</span>
                    ) : (
                      <Circle className="text-muted-foreground size-3" />
                    )}
                  </TableCell>
                  <TableCell className="w-full whitespace-normal">{m.event}</TableCell>
                  <TableCell className="text-right">
                    {m.value ? (
                      m.verify_url ? (
                        <a
                          href={m.verify_url}
                          target="_blank"
                          rel="noreferrer"
                          title={m.value}
                          className="tabular inline-flex items-center gap-1 text-xs underline underline-offset-4"
                        >
                          {abbreviate(m.value)}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="tabular text-xs" title={m.value}>
                          {abbreviate(m.value)}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs">missing</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          void navigator.clipboard.writeText(plainText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        <Copy />
        {copied ? 'Copied' : 'Copy all hashes'}
      </Button>

      {/* Same affordance as the approval screen. This page is reachable from an approval and from a
          pasted link, so it cannot assume the browser has a history to go back through. */}
      <p className="text-center text-xs">
        <a href="/requests" className="underline underline-offset-4">
          ← All payments
        </a>
      </p>
    </main>
  );
}
