import 'server-only';

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * scrypt, from the standard library.
 *
 * No dependency, no native build step, and memory-hard — which is the property that matters against
 * somebody who has the table and a GPU. The parameters are Node's defaults; the salt is per
 * password, so two people who choose the same one do not share a hash.
 */
const KEY_LENGTH = 64;

export async function hash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Check a password against a stored hash.
 *
 * Constant-time, and it does the work even when the format is wrong — an early return on a
 * malformed hash would make "no such account" measurably faster than "wrong password".
 */
export async function verify(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    // Still spend the time.
    await scrypt(password, randomBytes(16), KEY_LENGTH);
    return false;
  }
  const salt = Buffer.from(parts[1]!, 'hex');
  const expected = Buffer.from(parts[2]!, 'hex');
  const derived = await scrypt(password, salt, KEY_LENGTH);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
