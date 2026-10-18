'use client';

import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ErrorNote } from '@/components/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, api } from '@/lib/api';
import { isStellarAddress, toStroops } from '@/lib/format';
import { currentSession } from '@/lib/session';
import { cn } from '@/lib/utils';

const ASSETS = ['USDC', 'XLM'] as const;

export function CreateRequest() {
  // Generated when the FORM OPENS, not when the button is clicked. Two clicks send the same key
  // and create one payment.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<(typeof ASSETS)[number]>('USDC');
  const [reference, setReference] = useState('');
  const [phase, setPhase] = useState<'editing' | 'writing' | 'done'>('editing');
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  // The destination preflight: shape is checked locally, then the network is asked whether the
  // address can actually RECEIVE this asset.
  const [destination, setDestination] = useState<
    { state: 'idle' | 'checking' } | { state: 'checked'; exists: boolean; canReceive: boolean }
  >({ state: 'idle' });

  useEffect(() => {
    if (!currentSession()) window.location.href = '/';
  }, []);

  const payeeValid = isStellarAddress(payee);
  const amountStroops = toStroops(amount);
  const amountValid = amountStroops !== null && amountStroops > 0n;
  const referenceValid = reference.trim().length >= 1 && reference.trim().length <= 64;

  /**
   * Ask the network whether this address can receive this asset, 500 ms after typing stops.
   *
   * Without this, a vendor address with no USDC trustline is accepted by the form, approved by two
   * people, and then fails at the ledger with `op_no_trust` — at submit, which is the most expensive
   * possible moment to discover it. The debounce is what keeps a round trip off every keystroke, and
   * the generation counter is what stops a slow reply for an old address overwriting a new one.
   */
  useEffect(() => {
    if (!payeeValid) {
      setDestination({ state: 'idle' });
      return;
    }
    const session = currentSession();
    if (!session) return;

    let live = true;
    setDestination({ state: 'checking' });
    const timer = setTimeout(() => {
      api
        .canReceive(session.token, payee.trim(), asset)
        .then((r) => {
          if (live) setDestination({ state: 'checked', exists: r.exists, canReceive: r.can_receive });
        })
        .catch(() => {
          // The network being unreachable is not the address being wrong. Fall back to the local
          // shape check rather than blocking the button on an answer we could not get.
          if (live) setDestination({ state: 'idle' });
        });
    }, 500);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [payee, payeeValid, asset]);

  // A verdict only blocks when we actually have one. An unreachable Horizon must not make the form
  // unusable — the payment would simply fail later, which is where it failed before this check.
  const destinationBlocks = destination.state === 'checked' && !destination.canReceive;
  // Disabled until every field is valid. Never submit and then report the error.
  const ready =
    payeeValid &&
    amountValid &&
    referenceValid &&
    !destinationBlocks &&
    destination.state !== 'checking' &&
    phase === 'editing';

  async function submit() {
    const session = currentSession();
    if (!session) return;

    setPhase('writing');
    setError(null);
    try {
      await api.createRequest(session.token, idempotencyKey, {
        payee_address: payee.trim(),
        amount: amount.trim(),
        asset_code: asset,
        reference: reference.trim(),
      });
      // 202 Accepted. NOT success — the chain write is confirmed by a readback, and until then the
      // honest thing to say is that it is being written.
      setPhase('done');
    } catch (e) {
      setPhase('editing');
      if (e instanceof ApiError) setError({ code: e.body.code, message: e.body.message });
      else setError({ code: 'UNKNOWN', message: 'Could not create the payment.' });
    }
  }

  if (phase === 'done') {
    return (
      <main className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Writing to chain</CardTitle>
            <CardDescription>
              The payment has been submitted to the registry. It shows as <strong>Pending</strong>{' '}
              once we have read it back from the network — we do not report success before then.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href="/requests">Back to payments</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Create payment</CardTitle>
          <CardDescription>The four fields the statement of work names.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error ? <ErrorNote code={error.code} message={error.message} /> : null}

          <div className="space-y-1.5">
            <Label htmlFor="payee">Vendor address</Label>
            <Input
              id="payee"
              className="tabular"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="G…"
              autoComplete="off"
              aria-invalid={payee.length > 0 && !payeeValid}
            />
            {/* The error lands under the input that caused it, never in a generic toast. */}
            {payee && !payeeValid ? (
              <p className="text-err-foreground text-xs">That is not a valid Stellar address.</p>
            ) : payeeValid && destination.state === 'checking' ? (
              <p className="text-muted-foreground text-xs">Checking the address on the network…</p>
            ) : payeeValid && destination.state === 'checked' && !destination.exists ? (
              <p className="text-err-foreground text-xs">
                This account does not exist on the network yet.
              </p>
            ) : payeeValid && destination.state === 'checked' && !destination.canReceive ? (
              <p className="text-err-foreground text-xs">
                This address is not set up to receive {asset}.
              </p>
            ) : payeeValid ? (
              <p className="text-ok-foreground flex items-center gap-1 text-xs">
                <Check className="size-3" />{' '}
                {destination.state !== 'checked'
                  ? 'Valid address'
                  : asset === 'USDC'
                    ? `Valid address · ${asset} trustline present`
                    : // Native XLM needs no trustline, so claiming one would be a false reassurance.
                      'Valid address · account exists'}
              </p>
            ) : null}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              {/* A text input, never type="number": a number input silently accepts exponents and
                  loses precision at the magnitudes this system reaches. */}
              <Input
                id="amount"
                className="tabular"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="4500.0000000"
                autoComplete="off"
                aria-invalid={amount.length > 0 && !amountValid}
              />
              {amount && !amountValid ? (
                <p className="text-err-foreground text-xs">
                  A positive number with at most seven decimal places.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Asset</Label>
              {/* Segmented rather than a dropdown: two options, both worth seeing at once. */}
              <div className="flex rounded-md border p-0.5" role="group" aria-label="Asset">
                {ASSETS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAsset(a)}
                    aria-pressed={asset === a}
                    className={cn(
                      'rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors',
                      asset === a
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="PO-2026-0417"
              maxLength={64}
              autoComplete="off"
              aria-invalid={reference.length > 0 && !referenceValid}
            />
            {reference && !referenceValid ? (
              <p className="text-err-foreground text-xs">A reference is 1 to 64 characters.</p>
            ) : null}
          </div>

          <div className="text-muted-foreground flex items-center justify-between rounded-md border px-3 py-2 text-xs">
            <span>Approval required</span>
            <span className="text-foreground font-semibold">2 of 3 signatures</span>
          </div>

          <Button className="w-full" onClick={() => void submit()} disabled={!ready}>
            {phase === 'writing' ? 'Writing to chain…' : 'Create payment'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
