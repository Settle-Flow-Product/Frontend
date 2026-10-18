import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The session token's format, on its own.
 *
 * Split from `session.ts` deliberately. That module reads cookies and the database and is therefore
 * `server-only`; this is pure, so it can be tested directly — and the crypto is the part worth
 * testing. The same split as `sql.ts` against `schema.ts`.
 *
 * # HS256, hand-rolled, with no algorithm negotiation
 *
 * The format is a JWT's — three base64url segments — and it is built here rather than taken from a
 * library because the whole of it is forty lines and the algorithm is fixed. A library's
 * flexibility is what produces the `alg: none` family of bugs; there is nothing to negotiate,
 * because the signature is checked against the one algorithm this file knows before the header is
 * even looked at.
 */

const HEADER = { alg: 'HS256', typ: 'JWT' } as const;

/** A shift, not an hour. It can be this long because the token is revocable — see `epo`. */
export const SESSION_SECONDS = 8 * 60 * 60;

export interface Claims {
  sub: string;
  eml: string;
  rol: string[];
  /** The `token_epoch` this was minted at. Bumping the column revokes every token before it. */
  epo: number;
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function unb64url(input: string): Buffer {
  const padded = input.replaceAll('-', '+').replaceAll('_', '/');
  return Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64');
}

function sign(data: string, key: Buffer): string {
  return b64url(createHmac('sha256', key).update(data).digest());
}

export function issue(claims: Omit<Claims, 'iat' | 'exp'>, key: Buffer, now: number): string {
  const full: Claims = { ...claims, iat: now, exp: now + SESSION_SECONDS };
  const head = b64url(JSON.stringify(HEADER));
  const body = b64url(JSON.stringify(full));
  return `${head}.${body}.${sign(`${head}.${body}`, key)}`;
}

/**
 * Verify a token's signature and expiry.
 *
 * The signature is checked **before** the payload is parsed. Trusting any field of an unverified
 * token — even to decide whether it is worth verifying — is how a forged one gets a foothold.
 */
export function verify(token: string, key: Buffer, now: number): Claims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, body, signature] = parts as [string, string, string];

  const expected = Buffer.from(sign(`${head}.${body}`, key));
  const provided = Buffer.from(signature);
  // Length first: timingSafeEqual throws on a mismatch rather than returning false.
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const claims = JSON.parse(unb64url(body).toString('utf8')) as Claims;
    if (typeof claims.exp !== 'number' || now >= claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}
