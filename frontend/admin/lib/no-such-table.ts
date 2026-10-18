/**
 * The one refusal a page turns into a 404.
 *
 * `/admin/nonsense` is a bad URL, not a server fault. Rendering it as a 500 both misreports whose
 * mistake it was and writes a crash into the logs for ordinary bad input — which makes a real crash
 * harder to notice. Hidden tables refuse through this same path on purpose: a prober must not be
 * able to tell "exists but hidden" from "does not exist" by the status code.
 *
 * This lives outside the `'use server'` module because a server-action file may only export async
 * functions — a class there is a build error.
 */
export class NoSuchTable extends Error {
  readonly code = 'no_such_table' as const;

  constructor(name: string) {
    super(`there is no table called ${name} here`);
    this.name = 'NoSuchTable';
  }
}

/** Structural, not `instanceof`: the error may have crossed a module or action boundary. */
export function isNoSuchTable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'no_such_table';
}
