import 'server-only';

import { cookies } from 'next/headers';

import type { Account } from '@/types/account';
import { grantsOf, isRole, type Grants } from '@/types/role';
import { COOKIE_NAME } from './cookie';
import { one } from './db';
import { issue as issueToken, verify as verifyToken } from './token';

export { COOKIE_NAME, cookieOptions } from './cookie';
export { SESSION_SECONDS } from './token';

/**
 * The token somebody carries after signing in.
 *
 * # A signed token, not a session table
 *
 * Every request would otherwise cost a lookup before it did anything. The token carries who and
 * what, signed with a key only this server holds, and one read confirms the account is still what
 * it claims — see `tokenEpoch` below.
 *
 * # httpOnly, so a script on the page cannot lift it
 *
 * A token in `localStorage` is readable by any script on the page and by every extension the
 * operator has installed. This one lives in an httpOnly cookie: the browser sends it, and nothing
 * running in the page can read it.
 *
 * # HS256, hand-rolled, with no algorithm negotiation
 *
 * The format is a JWT's — three base64url segments — and it is built here rather than taken from a
 * library because the whole of it is forty lines and the algorithm is fixed. A library's
 * flexibility is what produces the `alg: none` family of bugs; there is nothing to negotiate,
 * because the signature is checked against the one algorithm this file knows before the header is
 * even looked at.
 *
 * # Eight hours, and revocable inside them
 *
 * A shift, not an hour. It can be that generous precisely because the token is revocable: it
 * carries the `token_epoch` it was minted at, and suspending an account, changing its password or
 * editing its roles each bump that column. All three are moments where a token already in
 * somebody's browser asserts something that is no longer true.
 */

function key(): Buffer {
  const value = process.env.ADMIN_SESSION_KEY;
  if (value === undefined || value === '') {
    throw new Error('ADMIN_SESSION_KEY is not set. Rotating it signs everybody out.');
  }
  return Buffer.from(value, 'utf8');
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export function issue(account: Account): string {
  return issueToken(
    { sub: account.id, eml: account.email, rol: account.roles, epo: account.tokenEpoch },
    key(),
    now(),
  );
}

export function verify(token: string) {
  return verifyToken(token, key(), now());
}

export interface Caller {
  account: Account;
  grants: Grants;
}

/**
 * Who is calling, confirmed against the database.
 *
 * The token says who they were when it was minted. This checks they still are: the account exists,
 * is active, and its `token_epoch` has not moved. That last check is what makes a suspension take
 * effect at once rather than at the end of a shift.
 */
export async function currentCaller(): Promise<Caller | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const claims = verify(token);
  if (!claims) return null;

  const row = await one<{
    id: string;
    email: string;
    roles: string[];
    active: boolean;
    token_epoch: number;
  }>('SELECT id, email, roles, active, token_epoch FROM admin_users WHERE id = $1', [claims.sub]);

  if (!row || !row.active || row.token_epoch !== claims.epo) return null;

  const roles = row.roles.filter(isRole);
  const account: Account = {
    id: row.id,
    email: row.email,
    roles,
    active: row.active,
    tokenEpoch: row.token_epoch,
  };
  return { account, grants: grantsOf(roles) };
}
