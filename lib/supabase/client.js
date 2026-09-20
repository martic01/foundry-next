import { createBrowserClient } from '@supabase/ssr';

// Safe to use in Client Components -- only ever holds the public anon
// key, which Row Level Security is specifically designed to be exposed
// alongside (see supabase/schema.sql for the actual access rules).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
