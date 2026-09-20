import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';

// Google (via Supabase's built-in provider) redirects here with a `code`
// query param after the person signs in. Exchanging it for a session is
// what actually proves they control that Google account's email -- this
// is the real verification, not something checked in the browser.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/register';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Role assignment lives HERE now, at sign-in -- not in the payment
      // route. `role` is deliberately left out of this upsert: on first
      // sign-in (INSERT) it falls through to the table's own
      // `default 'student'`; on every later sign-in (ON CONFLICT UPDATE)
      // Postgres only touches the columns actually listed in the
      // payload, so an existing role (e.g. an admin you promoted by
      // hand) is never overwritten back to 'student'. Uses the
      // service-role client because this runs before any registration
      // exists, i.e. before there's a paid record proving anything --
      // it's just recording "this Google account signed in."
      const user = data?.user;
      if (user) {
        const admin = createAdminClient();
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
        const { error: profileError } = await admin.from('profiles').upsert({
          id: user.id,
          full_name: fullName,
          email: user.email
        });
        if (profileError) {
          console.error('profile upsert on sign-in failed:', profileError);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing/invalid code -- send them back to try again rather than
  // silently failing.
  return NextResponse.redirect(`${origin}/register?oauth_error=1`);
}
