/**
 * A table name is `payment_requests`; a URL segment is `payment-requests`.
 *
 * Two functions rather than one regular expression at each call site, so a slug that round-trips is
 * a property of this module and can be tested.
 */

export function toSlug(table: string): string {
  return table.replaceAll('_', '-');
}

export function fromSlug(slug: string): string {
  return slug.replaceAll('-', '_');
}

/** `payment_requests` → `Payment requests`. Sentence case, not Title Case: these are nouns. */
export function toTitle(table: string): string {
  const words = table.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Shorten a hash or an address for a table cell. Display only — never for comparison. */
export function abbreviate(value: string, lead = 6, tail = 6): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
