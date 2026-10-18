/** What an account may do. */

export type Role = 'superadmin' | 'admin' | 'operator' | 'viewer';

export const ROLES: readonly Role[] = ['superadmin', 'admin', 'operator', 'viewer'];

export interface Grants {
  read: boolean;
  write: boolean;
  manageAccounts: boolean;
}

/**
 * Roles collapse to grants here, once.
 *
 * Every permission question in the console is one of these three booleans. Asking "is this person
 * an admin?" at a call site is how a fourth role later gets forgotten in one of twenty places.
 *
 * **Nobody may write to the money path**, whatever their role — that is enforced in `schema.ts`,
 * not here, because it is a property of the table rather than of the person.
 */
export function grantsOf(roles: readonly string[]): Grants {
  const has = (r: Role) => roles.includes(r);
  return {
    read: has('superadmin') || has('admin') || has('operator') || has('viewer'),
    write: has('superadmin') || has('admin') || has('operator'),
    manageAccounts: has('superadmin'),
  };
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
