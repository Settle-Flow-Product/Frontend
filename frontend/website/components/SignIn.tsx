'use client';

import { Wallet } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ErrorNote } from '@/components/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, api } from '@/lib/api';
import { remember } from '@/lib/session';
import { connect, signChallenge } from '@/lib/wallet';

export function SignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { address, walletId } = await connect();
      const challenge = await api.challenge(address);
      const signedXdr = await signChallenge(
        challenge.transaction_xdr,
        address,
        challenge.network_passphrase,
        walletId,
      );
      const session = await api.verify(challenge.nonce, signedXdr);

      remember({
        token: session.token,
        wallet: session.wallet,
        expiresAt: session.expires_at,
        walletId,
      });
      window.location.href = '/requests';
    } catch (e) {
      if (e instanceof ApiError) setError({ code: e.body.code, message: e.body.message });
      else if (e instanceof Error && e.message === 'WALLET_REJECTED')
        setError({ code: 'WALLET_REJECTED', message: 'You declined the connection in your wallet.' });
      else setError({ code: 'UNKNOWN', message: 'Could not sign in. Try again.' });
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <main className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Connect a Stellar wallet and sign a challenge. It proves you control the address —{' '}
            <strong className="text-foreground">
              the challenge has sequence number 0, so it can never be submitted and moves no funds.
            </strong>{' '}
            SettleFlow never asks for a seed phrase or a private key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <ErrorNote code={error.code} message={error.message} /> : null}

          <Button className="w-full" onClick={() => void signIn()} disabled={busy}>
            <Wallet />
            {busy ? 'Waiting for your wallet…' : 'Connect wallet'}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Freighter · Albedo · xBull · Lobstr
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
