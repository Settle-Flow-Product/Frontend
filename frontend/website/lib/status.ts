/**
 * Status presentation.
 *
 * Four statuses, four badge variants — **always with the word**. Colour is never the only carrier:
 * a colour-blind reader needs the text, and so does anyone reading a screenshot pasted into the
 * Instawards submission form.
 */

export type RequestStatus = 'pending' | 'approved' | 'paid' | 'cancelled' | 'expired';

export type StatusVariant = 'ok' | 'warn' | 'err' | 'info' | 'muted';

const VARIANTS: Record<RequestStatus, StatusVariant> = {
  pending: 'warn',
  approved: 'info',
  paid: 'ok',
  cancelled: 'err',
  expired: 'muted',
};

const LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export function statusVariant(status: string): StatusVariant {
  return VARIANTS[status as RequestStatus] ?? 'muted';
}

export function statusLabel(status: string): string {
  return LABELS[status as RequestStatus] ?? status;
}

/**
 * Whether any action is still possible.
 *
 * Terminal states HIDE their actions rather than disabling them — a disabled button implies it
 * could be unlocked.
 */
export function isTerminal(status: string): boolean {
  return status === 'paid' || status === 'cancelled' || status === 'expired';
}
