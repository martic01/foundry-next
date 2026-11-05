import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { sessionIdFromToken } from './lib/session-id';

const HOME = { admin: '/admin', teacher: '/teacher', student: '/dashboard' };

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

  if (!user || !(isAdminRoute || isDashboardRoute)) return response;

  // From here: a signed-in person on a portal page. Two checks, both fail OPEN
  // (a database hiccup never locks anyone out; Postgres RLS is the real wall).
  try {
    // 1. Which role are they? Send them to THEIR OWN home instead of a dead end
    //    (a student on /admin goes to /dashboard, and so on). Every home accepts
    //    its own role, so these redirects can never bounce back and forth.
    let { data: prof, error: profError } = await supabase.from('profiles').select('role, active_session').eq('id', user.id).maybeSingle();
    let hasSessionColumn = !profError;
    if (profError) ({ data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle());

    // 2. One device at a time: only the most recent sign-in may use the account.
    if (prof && hasSessionColumn) {
      const { data: { session } } = await supabase.auth.getSession();
      const sid = sessionIdFromToken(session?.access_token);
      if (sid && prof.active_session && prof.active_session !== sid) {
        const to = isAdminRoute ? '/admin/login' : '/login';
        return NextResponse.redirect(new URL(`/auth/signed-out?to=${encodeURIComponent(to)}`, request.url));
      }
      if (sid && !prof.active_session) await supabase.rpc('register_session', { p_session: sid, p_only_if_empty: true });
    }

    if (prof?.role) {
      const role = prof.role === 'admin' || prof.role === 'teacher' ? prof.role : 'student';
      const wanted = isAdminRoute ? 'admin' : path.startsWith('/teacher') ? 'teacher' : 'student';
      if (role !== wanted) return NextResponse.redirect(new URL(HOME[role], request.url));
    }
  } catch {
    /* network trouble: let the page decide */
  }
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/teacher/:path*']
};
