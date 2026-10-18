'use client';

import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * The console's error boundary.
 *
 * It shows what went wrong rather than a blank page. Operators are the audience: a message they can
 * paste to whoever maintains this is more use than an apology.
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Alert variant="err">
        <AlertCircle />
        <AlertTitle>The console could not render that</AlertTitle>
        <AlertDescription>
          <p className="font-mono text-xs">{error.message}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
