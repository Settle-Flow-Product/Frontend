/**
 * Money and identifiers, rendered.
 *
 * **No amount is ever a `number`.** Stellar uses seven decimal places and amounts reach magnitudes
 * where an IEEE double silently loses the last digits — which in a payment system means paying the
 * wrong amount and having no record of why. Everything here works on strings and `bigint`.
 */

export const STROOPS_PER_UNIT = 10_000_000n;
export const DECIMALS = 7;

/** Parse a decimal string into stroops. Returns null rather than guessing. */
export function toStroops(input: string): bigint | null {
  const s = input.trim().replace(/[,_]/g, '');
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return null;

  const [whole = '', frac = ''] = s.split('.');
  if (frac.length > DECIMALS) return null;

  const padded = frac.padEnd(DECIMALS, '0');
  try {
    return BigInt(whole || '0') * STROOPS_PER_UNIT + BigInt(padded || '0');
  } catch {
    return null;
  }
}

/** Render stroops with all seven places, so columns line up and nothing is hidden. */
export function fromStroops(stroops: bigint): string {
  const whole = stroops / STROOPS_PER_UNIT;
  const frac = stroops % STROOPS_PER_UNIT;
  return `${whole}.${frac.toString().padStart(DECIMALS, '0')}`;
}

/** Group the whole part for reading, keeping every decimal place. */
export function formatAmount(amount: string): string {
  const [whole = '0', frac = ''] = amount.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/**
 * The `GDX7…P4LM` form.
 *
 * For display only. Two different accounts can share an abbreviation, which is why the full value
 * is what gets copied and what gets compared.
 */
export function abbreviate(value: string, lead = 4, tail = 4): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

/** A countdown, in the form an approver reads at a glance. */
export function countdown(until: string, now: number = Date.now()): string {
  const remaining = new Date(until).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return 'expired';

  const total = Math.floor(remaining / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function expertTx(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}
export function expertAccount(address: string): string {
  return `https://stellar.expert/explorer/testnet/account/${address}`;
}
export function expertContract(id: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${id}`;
}

/** The shape check the API and the database also apply. */
export function isStellarAddress(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value.trim());
}
