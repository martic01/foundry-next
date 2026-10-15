import { cache } from 'react';
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

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

// The signed-in user's own profile row (RLS only ever returns their own
// -- or, for an admin, any -- row). `select('*')` rather than a column
// list so Nav, the layouts and the pages can all share this one query.
export const getProfile = cache(async (userId) => {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
});
