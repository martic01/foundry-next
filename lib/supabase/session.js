import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from './server';

// Per-REQUEST memoised session lookups for Server Components.
//
// Before this, one page view made the same two calls over and over: the
// root <Nav />, the portal layout and the page itself each ran
// supabase.auth.getUser() (a network round-trip to Supabase Auth) and
// each queried the profile row. React's cache() collapses all of those
// into one call per request -- same result, a fraction of the latency.
//
// Scope note: cache() lives for a single request only, so nothing here
// can leak between users. Server Actions and route handlers do NOT use
// these -- they call auth.getUser() themselves on purpose, because they
// are the real authorization boundary and should always verify fresh.

// When Supabase can't be reached, a portal page must NOT treat that as
// "logged out" (it would bounce people to /login) and must not crash with
// a raw error either. It sends them to /offline, a calm "network is down"
// screen that returns to the same page once the connection is back.
export const isNetworkError = (err) =>
  !!err && (err.name === 'AuthRetryableFetchError' || err.status === 0 || /fetch failed|network|ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(err.message || ''));

function goOffline() {
  let next = '/';
  try {
    next = headers().get('x-pathname') || '/';
  } catch {
    /* no request context */
  }
  redirect(`/offline?next=${encodeURIComponent(next)}`);
}

async function rawUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  return { user, down: !user && isNetworkError(error) };
}

// Portal pages and layouts.
export const getUser = cache(async () => {
  const { user, down } = await rawUser();
  if (down) goOffline();
  return user;
});

// The public site's nav: if the network is down it simply shows the
// signed-out nav instead of redirecting away from a public page.
export const getUserSafe = cache(async () => {
  try {
    return (await rawUser()).user;
  } catch {
    return null;
  }
});

async function rawProfile(userId) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { data, down: !data && isNetworkError(error) };
}

// The signed-in user's own profile row (RLS only ever returns their own
// -- or, for an admin, any -- row). `select('*')` so Nav, the layouts and
// the pages share this one query.
export const getProfile = cache(async (userId) => {
  if (!userId) return null;
  const { data, down } = await rawProfile(userId);
  if (down) goOffline();
  return data;
});

export const getProfileSafe = cache(async (userId) => {
  if (!userId) return null;
  try {
    return (await rawProfile(userId)).data;
  } catch {
    return null;
  }
});
