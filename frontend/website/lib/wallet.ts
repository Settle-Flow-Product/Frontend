/**
 * The wallet.
 *
 * The kit is imported dynamically on first use: it is the largest dependency in the bundle and
 * most page loads never need it.
 */

import type { ISupportedWallet, StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

let kit: StellarWalletsKit | null = null;

async function getKit(walletId?: string): Promise<StellarWalletsKit> {
  const mod = await import('@creit.tech/stellar-wallets-kit');
  if (!kit) {
    kit = new mod.StellarWalletsKit({
      network: mod.WalletNetwork.TESTNET,
      selectedWalletId: walletId ?? mod.FREIGHTER_ID,
      modules: mod.allowAllModules(),
    });
  }
  if (walletId) kit.setWallet(walletId);
  return kit;
}

export type Connected = { address: string; walletId: string };

/**
 * Forget the selected wallet.
 *
 * The kit caches the chosen wallet in module state, so dropping the session alone leaves the next
 * sign-in silently reconnecting to the same account. That is the opposite of what somebody pressing
 * "disconnect" wants, and on a shared machine it is a way to sign as the wrong person.
 */
export function disconnect(): void {
  kit = null;
}

/** Open the wallet chooser and return the account the person selected. */
export async function connect(): Promise<Connected> {
  const k = await getKit();
  return new Promise<Connected>((resolve, reject) => {
    void k.openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          k.setWallet(option.id);
          const { address } = await k.getAddress();
          resolve({ address, walletId: option.id });
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      },
      onClosed: () => reject(new Error('WALLET_REJECTED')),
    });
  });
}

/**
 * Sign the authentication challenge.
 *
 * A SEP-10 challenge transaction carrying **sequence number 0**, so it can never be submitted — a
 * transaction's sequence must be its source account's current sequence plus one, and zero is never
 * that. The wallet shows a transaction; what it signs is by construction unspendable.
 *
 * `signMessage` was tried first and is not interoperable: wallets disagree about what they sign,
 * and Freighter routes it through a legacy "sign blob" path that treats the payload as opaque. The
 * backend then cannot know what to verify against. `signTransaction` is the one operation every
 * wallet implements identically, because getting it wrong breaks payments.
 */
export async function signChallenge(
  transactionXdr: string,
  address: string,
  networkPassphrase: string,
  walletId?: string,
): Promise<string> {
  const k = await getKit(walletId);
  const { signedTxXdr } = await k.signTransaction(transactionXdr, {
    address,
    networkPassphrase,
  });
  return signedTxXdr;
}

/**
 * Sign the payment transaction — what an approver actually contributes.
 *
 * The signature is over this exact transaction, sequence number included, so it cannot be reused
 * for a rebuilt one.
 */
export async function signTransaction(
  xdr: string,
  address: string,
  networkPassphrase: string,
  walletId?: string,
): Promise<string> {
  const k = await getKit(walletId);
  const { signedTxXdr } = await k.signTransaction(xdr, {
    address,
    networkPassphrase,
  });
  return signedTxXdr;
}
