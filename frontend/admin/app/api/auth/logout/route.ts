import { NextResponse } from 'next/server';

import { publicPath } from '@/lib/base-path';
import { COOKIE_NAME } from '@/lib/cookie';

/**
 * Sign out.
 *
 * A route rather than an action, so a link can reach it and so a script holding a token has an
 * obvious way to drop it.
 */
export async function POST() {
  // A path, not a URL. `Location` is allowed to be origin-relative, and behind a proxy that is the
  // only spelling that cannot be wrong: building an absolute URL means asking this container what
  // origin it is served under, and the honest answer is its own — `http://localhost:5174`, a port
  // published on loopback that no browser outside the machine can reach. The browser resolves a
  // relative Location against the address it actually typed.
  //
  // The prefix IS written in, because nothing rewrites a header we set by hand: the console is
  // mounted at a basePath, and '/auth/login' alone would leave the app entirely.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: publicPath('/auth/login') },
  });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export const GET = POST;
