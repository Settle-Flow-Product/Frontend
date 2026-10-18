import { describe, expect, it } from 'vitest';

/**
 * The auth path signs a TRANSACTION, not a message.
 *
 * `signMessage` was tried first and is not interoperable: wallets disagree about what they sign,
 * and the resulting refusal is indistinguishable from a wrong key. What makes signing a transaction
 * safe here is sequence number 0 — the challenge can never be submitted.
 *
 * The signing itself needs a wallet extension, so what is asserted here is the contract the module
 * exports; the end-to-end proof is `cargo run -p settle-auth --example signin_probe`.
 */
describe('the wallet module', () => {
  it('exposes a challenge signer and a transaction signer, and no message signer', async () => {
    const wallet = await import('./wallet');
    expect(typeof wallet.signChallenge).toBe('function');
    expect(typeof wallet.signTransaction).toBe('function');
    expect(typeof wallet.connect).toBe('function');
    // signMessage is gone on purpose. Leaving it would invite the interop bug back.
    expect('signMessage' in wallet).toBe(false);
  });
});
