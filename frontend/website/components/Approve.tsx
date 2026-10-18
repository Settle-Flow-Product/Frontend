'use client';

import { Check, PenLine, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ErrorNote, LoadingRows } from '@/components/States';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, api, type PaymentRequest, type Prepared } from '@/lib/api';
import { abbreviate, countdown, formatAmount } from '@/lib/format';
import { currentSession } from '@/lib/session';
import { isTerminal } from '@/lib/status';
import { signTransaction } from '@/lib/wallet';

export function Approve({ id }: { id: string }) {
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = currentSession();
    if (!session) {
      window.location.href = '/';
      return;
    }
    setMe(session.wallet);
    try {
      const { request: r } = await api.getRequest(session.token, id);
      setRequest(r);
      // Only prepare while the payment can still be made. Preparing a paid or cancelled request
      // would reserve the treasury's sequence for a payment that must never happen.
      if (r.status === 'pending' || r.status === 'approved') {
        setPrepared(await api.prepare(session.token, id));
      }
    } catch (e) {
      if (e instanceof ApiError) setError({ code: e.body.code, message: e.body.message });
      else setError({ code: 'UNKNOWN', message: 'Could not load this payment.' });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // The countdown is the TRANSACTION's window, not the request's expiry. A request may be valid
  // for a day while the transaction built from it is valid for an hour, and showing the wrong one
  // lets an approver believe they have time they do not have.
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function sign() {
    const session = currentSession();
    if (!session || !prepared) return;
    setBusy(true);
    setError(null);
    try {
      const signedXdr = await signTransaction(
        prepared.unsigned_xdr,
        session.wallet,
        prepared.network_passphrase,
        session.walletId,
      );
      await api.submitSignature(session.token, id, session.wallet, extractSignature(signedXdr));
      await load();
    } catch (e) {
      if (e instanceof ApiError) setError({ code: e.body.code, message: e.body.message });
      else
        setError({
          code: 'WALLET_REJECTED',
          message: 'You declined the signature in your wallet.',
        });
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    const session = currentSession();
    if (!session) return;
    if (!window.confirm('Reject this payment? No transaction will leave the treasury.')) return;
    setBusy(true);
    try {
      await api.reject(session.token, id, session.wallet);
      await load();
    } catch (e) {
      if (e instanceof ApiError) setError({ code: e.body.code, message: e.body.message });
    } finally {
      setBusy(false);
    }
  }

  if (error && !request) return <ErrorNote code={error.code} message={error.message} />;
  if (!request) return <LoadingRows rows={4} />;

  const expiry = prepared ? countdown(prepared.valid_until, tick) : null;
  const windowClosed = expiry === 'expired';
  const finished = isTerminal(request.status);

  // What THIS wallet can still do. A signer signs once — the primary key on the approvals table
  // enforces it — so offering the button again only produces ALREADY_SIGNED, which reads as a
  // malfunction rather than as "your part is done".
  const mySigner = prepared?.signers.find((s) => s.address === me) ?? null;
  const iHaveSigned = mySigner?.signed ?? false;
  const iAmNotAnApprover = prepared !== null && mySigner === null;
  const stillNeeded = prepared
    ? Math.max(0, prepared.required_weight - prepared.collected_weight)
    : 0;

  return (
    <main className="mx-auto max-w-md space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">Approve payment</h1>
        {expiry ? (
          <span
            className={`tabular text-xs ${windowClosed ? 'text-err-foreground' : 'text-muted-foreground'}`}
          >
            {windowClosed ? 'Signing window closed' : `Expires in ${expiry}`}
          </span>
        ) : null}
      </div>

      {/* The three things an approver must confirm in five seconds without scrolling. */}
      <Card>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Pay to vendor
            </p>
            <p className="tabular mt-1 text-3xl font-bold tracking-tight">
              {formatAmount(request.amount)} {request.asset_code}
            </p>
            <p className="tabular text-muted-foreground mt-1 text-sm break-all">
              {request.payee_address}
            </p>
          </div>

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-semibold">{request.reference}</dd>
            </div>
            {/* Two separate facts, and conflating them is how an approver misreads the screen: who
                ASKED for the payment, and which account it LEAVES. */}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Requested by</dt>
              <dd className="tabular">
                {request.created_by ? abbreviate(request.created_by) : 'not recorded'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">From account</dt>
              <dd className="tabular">
                {prepared ? abbreviate(prepared.treasury_address) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={request.status} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {prepared ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Signature progress · {prepared.collected_weight} of {prepared.required_weight} required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {prepared.signers.map((s) => (
                <li key={s.address} className="flex items-center justify-between gap-3">
                  <span className="flex items-baseline gap-1.5">
                    {/* The address, not just the role: all three read "approver", and a list of
                        three identical rows cannot tell an approver which one is theirs. */}
                    <span className="tabular text-xs">{abbreviate(s.address)}</span>
                    {s.address === me ? (
                      <span className="text-muted-foreground text-xs font-semibold">(you)</span>
                    ) : null}
                  </span>
                  <span
                    className={
                      s.signed
                        ? 'text-ok-foreground flex items-center gap-1'
                        : 'text-muted-foreground'
                    }
                  >
                    {s.signed ? (
                      <>
                        <Check className="size-3" /> Signed
                      </>
                    ) : (
                      'Waiting'
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {error ? <ErrorNote code={error.code} message={error.message} /> : null}

      {/* Terminal states HIDE their actions rather than disabling them: a disabled button implies
          it could be unlocked. */}
      {finished ? (
        <p className="text-muted-foreground text-sm">
          This payment is finished. Nothing further can be done to it.
        </p>
      ) : windowClosed ? (
        <p className="text-err-foreground text-sm">
          The signing window has closed. The transaction needs to be rebuilt before it can be signed.
        </p>
      ) : iHaveSigned ? (
        <p className="text-muted-foreground text-sm">
          You have signed this payment. It needs {stillNeeded} more before it can be released —
          disconnect and reconnect as another approver to continue.
        </p>
      ) : iAmNotAnApprover ? (
        <p className="text-muted-foreground text-sm">
          This wallet is not an approver for this payment, so it cannot sign or reject it.
        </p>
      ) : (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => void sign()} disabled={busy || !prepared}>
            <PenLine />
            {busy ? 'Waiting for your wallet…' : 'Sign in wallet'}
          </Button>
          {/* Visually equal to Sign, never hidden. */}
          <Button
            className="flex-1"
            variant="destructive"
            onClick={() => void reject()}
            disabled={busy}
          >
            <X />
            Reject
          </Button>
        </div>
      )}

      {/* The way out, present in every state.
          Signing does not navigate anywhere — an approver needs to see the progress move to 1 of 2,
          and being thrown back to a list would leave them unsure whether it counted. So the screen
          stays put, which makes an explicit way back the only way back: the logo is a link, but
          nobody reads a wordmark as navigation. */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <a href="/requests" className="underline underline-offset-4">
          ← All payments
        </a>
        <a href={`/evidence/${id}`} className="underline underline-offset-4">
          On-chain evidence
        </a>
      </div>
    </main>
  );
}

/**
 * Pull the raw signature out of the envelope a wallet returns.
 *
 * The wallet signs the transaction and hands back a full XDR envelope. The backend stores the
 * 64-byte signature itself, because it verifies each one against the transaction hash and sums
 * weights — work that needs the signature, not a copy of the envelope around it.
 */
export function extractSignature(signedXdr: string): string {
  const bytes = Uint8Array.from(atob(signedXdr), (c) => c.charCodeAt(0));
  // A DecoratedSignature is a 4-byte hint followed by a 4-byte length and 64 bytes of signature,
  // and the signature list sits at the end of the envelope.
  const signature = bytes.slice(bytes.length - 64);
  return Array.from(signature)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
