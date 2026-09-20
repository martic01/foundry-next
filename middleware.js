import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  // Refreshes the session token if it's expired -- without this, a
  // Server Component further down the request could see a stale/expired
  // session and incorrectly treat someone as logged out (or vice versa).
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login';
  const isDashboardRoute = path.startsWith('/dashboard');

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
  matcher: ['/admin/:path*', '/dashboard/:path*']
};
