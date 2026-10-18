'use client';

import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { abbreviate } from '@/lib/format';
import { currentSession, forget } from '@/lib/session';
import { disconnect } from '@/lib/wallet';

/**
 * Who is signed in, and the way out.
 *
 * A client component inside a server layout, because the session lives in `sessionStorage` and is
 * therefore unknowable until the browser runs. `mounted` guards the first paint: rendering the
 * wallet on the server and nothing on the client is a hydration mismatch.
 *
 * The address is shown next to the button on purpose. Collecting two of three signatures means
 * signing, switching wallet, and signing again — and the failure that ruins a demo is signing twice
 * as the same approver without noticing, which looks like the threshold being broken.
 */
export function SessionBar() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWallet(currentSession()?.wallet ?? null);
  }, []);

  if (!mounted || !wallet) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="tabular text-muted-foreground hidden text-xs sm:inline" title={wallet}>
        {abbreviate(wallet)}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Both, in this order. The session is what the API trusts; the kit is what the browser
          // would otherwise reconnect to without asking.
          forget();
          disconnect();
          window.location.href = '/';
        }}
      >
        <LogOut className="size-3.5" />
        Disconnect
      </Button>
    </div>
  );
}
