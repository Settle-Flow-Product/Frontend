import { Badge } from '@/components/ui/badge';
import { statusVariant, statusLabel } from '@/lib/status';

/**
 * A payment's status.
 *
 * Four statuses, four colours — **always with the word**. Colour is never the only carrier.
 */
export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}
