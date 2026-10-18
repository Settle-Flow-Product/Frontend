import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names, with later Tailwind utilities winning over earlier ones.
 *
 * `clsx` handles conditionals; `twMerge` resolves conflicts, so a variant's `px-4` and a caller's
 * `px-2` do not both end up in the class list with the outcome decided by stylesheet order.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
