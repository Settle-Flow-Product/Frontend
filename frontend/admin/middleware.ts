import type { NextRequest } from 'next/server';

import { requireCookie } from '@/middlewares/auth';

export function middleware(request: NextRequest) {
  return requireCookie(request) ?? undefined;
}

export const config = {
  // Everything except the login page, the auth routes, and Next's own assets. Listing what is
  // public rather than what is protected means a new page is protected by default.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/login|api/auth).*)'],
};
