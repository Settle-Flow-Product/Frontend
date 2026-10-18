/**
 * Rendering values that came out of Postgres as strings.
 *
 * **No amount is ever a `number` here either.** The database sends them as text precisely so the
 * digits survive; parsing them for display would undo that.
 */

/** Group the whole part of an amount, keeping every decimal place. */
export function formatAmount(amount: string): string {
  const [whole = '0', frac = ''] = amount.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** Render a value from a JSON row for a table cell. */
export function cell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

export function expertTx(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function expertAccount(address: string): string {
  return `https://stellar.expert/explorer/testnet/account/${address}`;
}

/** Does this column hold something worth linking to a block explorer? */
export function isAddressColumn(name: string): boolean {
  return name.endsWith('_address') || name === 'address';
}

export function isHashColumn(name: string): boolean {
  return name.endsWith('tx_hash') || name === 'tx_hash';
}
