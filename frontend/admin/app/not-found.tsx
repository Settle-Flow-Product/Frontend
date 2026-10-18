import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * The console's 404.
 *
 * Reached by a URL naming a table that is not on the catalogue — a typo, or one of the tables the
 * console does not show. Both land here and read the same, so this page cannot be used to work out
 * which tables exist.
 */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Alert>
        <FileQuestion />
        <AlertTitle>There is nothing at that address</AlertTitle>
        <AlertDescription>
          <p>The console has no page here. It may have been a mistyped table name.</p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/">Back to the dashboard</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
