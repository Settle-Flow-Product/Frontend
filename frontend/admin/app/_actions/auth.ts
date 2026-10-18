'use server';

import { cookies } from 'next/headers';

import { one } from '@/lib/db';
import { verify as verifyPassword } from '@/lib/password';
import { COOKIE_NAME, cookieOptions, issue } from '@/lib/session';
import type { Account } from '@/types/account';
import { isRole } from '@/types/role';

/** What a form gets back. A thrown error inside a form is a crashed page, not a message. */
export type SignInOutcome = { ok: true } | { ok: false; error: string };

/**
 * Sign in.
 *
 * Every failure returns the same message and does the same work: a wrong password and an unknown
 * email must be indistinguishable, in wording and in how long they take. Otherwise the form becomes
 * a way to enumerate who has an account.
 */
export async function signIn(email: string, password: string): Promise<SignInOutcome> {
  const refuse: SignInOutcome = { ok: false, error: 'Those details did not match an account.' };

  const row = await one<{
    id: string;
    email: string;
    password_hash: string;
    roles: string[];
    active: boolean;
    token_epoch: number;
  }>(
    'SELECT id, email, password_hash, roles, active, token_epoch FROM admin_users WHERE lower(email) = lower($1)',
    [email.trim()],
  );

  // A hash that cannot match, so an unknown email costs the same scrypt work as a known one.
  const stored = row?.password_hash ?? 'scrypt$00$00';
  const matches = await verifyPassword(password, stored);

  if (!row || !matches || !row.active) return refuse;

  const account: Account = {
    id: row.id,
    email: row.email,
    roles: row.roles.filter(isRole),
    active: row.active,
    tokenEpoch: row.token_epoch,
  };

  const store = await cookies();
  store.set(COOKIE_NAME, issue(account), cookieOptions());
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
