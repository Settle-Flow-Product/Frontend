import { describe, expect, it } from 'vitest';

import { hash, verify } from './password';

describe('passwords', () => {
  it('verifies the password it hashed', async () => {
    const stored = await hash('a correct horse battery staple');
    expect(await verify('a correct horse battery staple', stored)).toBe(true);
  });

  it('refuses a wrong password', async () => {
    const stored = await hash('the right one');
    expect(await verify('the wrong one', stored)).toBe(false);
  });

  it('salts, so the same password hashes differently twice', async () => {
    const a = await hash('same');
    const b = await hash('same');
    expect(a).not.toBe(b);
    // And both still verify.
    expect(await verify('same', a)).toBe(true);
    expect(await verify('same', b)).toBe(true);
  });

  it('refuses a malformed hash rather than throwing', async () => {
    for (const bad of ['', 'nonsense', 'scrypt$only-two-parts', 'bcrypt$aa$bb']) {
      expect(await verify('anything', bad)).toBe(false);
    }
  });
});
