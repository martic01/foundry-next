import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// DANGER: this client uses the service-role key, which bypasses Row
// Level Security entirely. It must only ever be imported from
// server-only code (app/api/*/route.js) -- NEVER from a Client
// Component, and never returned to the browser in any form. Every route
// that uses this is responsible for its OWN authorization checks (e.g.
// "did Paystack actually confirm this payment?") since RLS isn't doing
// that job here.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
