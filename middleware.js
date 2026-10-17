import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  // Tell Server Components which page is being requested (lib/supabase/
  // session.js uses it to send people back here after a network drop).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          requestHeaders.set('cookie', request.headers.get('cookie') || '');
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  // Refreshes the session token if it's expired -- without this, a
  // Server Component further down the request could see a stale/expired
  // session and incorrectly treat someone as logged out (or vice versa).
  let user = null;
  try {
    const res = await supabase.auth.getUser();
    user = res.data?.user || null;
    if (!user && (res.error?.name === 'AuthRetryableFetchError' || res.error?.status === 0)) return response; // network, not logged out
  } catch {
    // Network trouble reaching Supabase. Don't turn it into a crash or a
    // bounce to /login: let the page through -- its own session check
    // (lib/supabase/session.js) throws, and app/error.jsx shows the
    // "network is down" screen. Real access control is RLS regardless.
    return response;
  }

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login';
  const isDashboardRoute = path.startsWith('/dashboard') || path.startsWith('/teacher');

  if (!user && (isAdminRoute || isDashboardRoute)) {
    const loginPath = isAdminRoute ? '/admin/login' : '/login';
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  // Role check (student trying /admin) happens in the page itself via
  // RLS-backed queries, not here -- middleware only needs to know
  // "logged in or not" to redirect; the real access boundary is Postgres
  // Row Level Security, which can't be bypassed by anything reaching this
  // far in the first place.
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/teacher/:path*']
};
