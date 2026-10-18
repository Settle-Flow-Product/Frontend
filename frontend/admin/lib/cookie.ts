/** Where the session token lives, and for how long. Shared by the route handlers and the reader. */

export const COOKIE_NAME = 'settleflow_admin_session';

/** A shift, not an hour. */
export const SESSION_SECONDS = 8 * 60 * 60;

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_SECONDS,
    // Behind TLS in any real deployment. Off by default so a local HTTP run still works.
    secure: process.env.COOKIE_SECURE === 'true',
  };
}
