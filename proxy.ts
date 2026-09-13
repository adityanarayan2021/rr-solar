import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

/**
 * Auth guard. Next.js 16 renamed this file convention from `middleware` to `proxy`.
 *
 * The login page lives under /admin, so it is matched by the matcher below and
 * MUST be allowed through explicitly — otherwise an unauthenticated visitor is
 * redirected to /admin/login, which redirects to /admin/login, forever.
 */
const PUBLIC_PATHS = ['/admin/login'];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Explicit list rather than a negative-lookahead pattern: an over-clever regex
  // here is how auth bypasses happen. Public exceptions are handled above.
  matcher: [
    '/admin/:path*',
    '/api/admin/leads/:path*',
    '/api/admin/reports/:path*',
    '/api/admin/projects/:path*',
  ],
};
