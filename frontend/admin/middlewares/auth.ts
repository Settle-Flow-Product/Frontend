import { NextResponse, type NextRequest } from 'next/server';

import { COOKIE_NAME } from '@/lib/cookie';

/**
 * The outermost of three checks, and the weakest on purpose.
 *
 * Middleware runs on the Edge runtime, which has no database and no Node crypto — so this can only
 * see whether a cookie is *present*. That is enough to stop a browser being shown a screen it
 * cannot fill, and it is not a permission check.
 *
 * The other two do the work: the layout verifies the token and reads the account, and every server
 * action asks again before it touches anything.
 */
export function requireCookie(request: NextRequest): NextResponse | null {
  const hasCookie = request.cookies.has(COOKIE_NAME);
  if (hasCookie) return null;

  const url = request.nextUrl.clone();
  url.pathname = '/auth/login';
  url.search = '';
  return NextResponse.redirect(url);
}
