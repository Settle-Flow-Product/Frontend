/**
 * The backend, as functions.
 *
 * A hand-written wrapper rather than a generated client or a data-fetching library: there are nine
 * endpoints, and the interesting behaviour — a 202 meaning "not yet", a 409 meaning "wait and poll
 * with the SAME key" — is exactly what a generic layer would flatten into "an error".
 */

export type ErrorBody = {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
  retriable: boolean;
  trace_id?: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
}

export type PaymentRequest = {
  id: string;
  /** The business the request belongs to — what the contract authorises as. */
  creator_address: string;
  /** The PERSON who raised it: the wallet that was signed in. Null for older rows. */
  created_by: string | null;
  payee_address: string;
  asset_code: string;
  amount: string;
  reference: string;
  expiry_at: string;
  status: string;
  create_tx_hash: string | null;
  created_at: string;
};

export type Signer = { address: string; role: string; weight: number; signed: boolean };

export type Prepared = {
  settlement_id: string;
  /** The account the money leaves — not the creator. */
  treasury_address: string;
  unsigned_xdr: string;
  tx_hash: string;
  network_passphrase: string;
  valid_until: string;
  required_weight: number;
  collected_weight: number;
  signers: Signer[];
};

/** The destination preflight's verdict. `can_receive` is the one the button waits on. */
export type Receivable = {
  address: string;
  asset: string;
  exists: boolean;
  can_receive: boolean;
};

export type Milestone = {
  milestone: string;
  event: string;
  value: string | null;
  verify_url: string | null;
};

async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...init, headers });
  const text = await res.text();
  const parsed: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const body =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? ((parsed as { error: ErrorBody }).error)
        : { code: 'UNKNOWN', message: res.statusText, retriable: false };
    throw new ApiError(res.status, body);
  }
  return parsed as T;
}

export const api = {
  challenge: (address: string) =>
    call<{
      nonce: string;
      /** The SEP-10 challenge transaction — sequence number 0, so it cannot be submitted. */
      transaction_xdr: string;
      network_passphrase: string;
      expires_at: number;
    }>('/auth/wallet/challenge', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  verify: (nonce: string, signedXdr: string) =>
    call<{ token: string; wallet: string; expires_at: number }>('/auth/wallet/verify', {
      method: 'POST',
      body: JSON.stringify({ nonce, signed_xdr: signedXdr }),
    }),

  /**
   * Can this address actually be paid in this asset?
   *
   * Called from the address field behind a debounce. A missing USDC trustline fails the payment at
   * SUBMIT — after both approvers have signed — so it is worth a round trip while somebody is still
   * typing. Answers 200 with a verdict; a false `can_receive` is an answer, not an error.
   */
  canReceive: (token: string, address: string, asset: string) =>
    call<Receivable>(
      `/accounts/${encodeURIComponent(address)}/can-receive?asset=${encodeURIComponent(asset)}`,
      {},
      token,
    ),

  listRequests: (token: string, status?: string) =>
    call<PaymentRequest[]>(`/requests${status ? `?status=${status}` : ''}`, {}, token),

  getRequest: (token: string, id: string) =>
    call<{ request: PaymentRequest; settlement: unknown }>(`/requests/${id}`, {}, token),

  /**
   * Create a payment.
   *
   * The idempotency key is generated when the FORM OPENS, not when the button is clicked — so two
   * clicks send the same key and create one payment. Returns 202: the chain write has been
   * accepted, not confirmed.
   */
  createRequest: (
    token: string,
    idempotencyKey: string,
    body: { payee_address: string; amount: string; asset_code: string; reference: string },
  ) =>
    call<{ request_id: string; status: string; create_tx_hash: string | null }>(
      '/requests',
      { method: 'POST', body: JSON.stringify(body), headers: { 'idempotency-key': idempotencyKey } },
      token,
    ),

  prepare: (token: string, id: string) =>
    call<Prepared>(`/requests/${id}/prepare`, { method: 'POST' }, token),

  submitSignature: (token: string, id: string, signer_address: string, signature: string) =>
    call<{ collected_weight: number; required_weight: number; threshold_met: boolean }>(
      `/requests/${id}/signatures`,
      { method: 'POST', body: JSON.stringify({ signer_address, signature }) },
      token,
    ),

  reject: (token: string, id: string, signer_address: string) =>
    call<{ status: string }>(
      `/requests/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ signer_address }) },
      token,
    ),

  evidence: (token: string, id: string) =>
    call<{ reference: string; status: string; complete: boolean; milestones: Milestone[] }>(
      `/requests/${id}/evidence`,
      {},
      token,
    ),

  treasury: (token: string) =>
    call<{
      address: string;
      signer_count: number;
      master_weight: number;
      correct: boolean;
      problems: string[];
    }>('/treasury', {}, token),
};
