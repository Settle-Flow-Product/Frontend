/**
 * The session, held in `sessionStorage`.
 *
 * Not `localStorage`, deliberately: a session that outlives the tab is a session somebody forgets
 * they left open on a shared machine. The wallet id is stored alongside the token because the
 * wallet kit keeps the selection in memory only, and a page refresh would otherwise lose which
 * wallet to reopen.
 */

const KEY = 'settleflow.session.v1';

export type Session = {
  token: string;
  wallet: string;
  expiresAt: number;
  walletId?: string;
};

export function currentSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    // An expired token is worse than no token: it produces a 401 on the first action rather than
    // a sign-in prompt.
    if (session.expiresAt * 1000 <= Date.now()) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function remember(session: Session): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function forget(): void {
  window.sessionStorage.removeItem(KEY);
}
