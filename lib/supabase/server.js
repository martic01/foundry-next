import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// For Server Components, Route Handlers, and Server Actions. Still only
// uses the public anon key and is still bound by Row Level Security --
// this is NOT a privilege-escalation client. It just knows how to read
// the visitor's session from cookies so RLS can see *who* is asking.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component render, which can't set
            // cookies -- middleware.js is what actually refreshes the
            // session in that case, so this is safe to ignore.
          }
        }
      }
    }
  );
}
