import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { syncSignInProfile } from '../../../lib/profile-names';
import { absorbShellAccounts, claimTeacherShells } from '../../../lib/accounts';

// Google (via Supabase's built-in provider) redirects here with a `code`
// query param after the person signs in. Exchanging it for a session is
// what actually proves they control that Google account's email -- this
// is the real verification, not something checked in the browser.
// `next` must be a plain same-origin path -- rejects anything that could
// be interpreted as pointing off-site: a full URL (has a scheme), a
// protocol-relative URL (starts with //, which browsers treat as
// "same scheme, different host"), or a backslash (some legacy URL
// parsers normalize \ to /, which has been used to smuggle an
// off-origin host past checks like this one in the past). Falls back to
// the safe default rather than trying to "fix" a bad value.
function safeNextPath(value) {
  if (typeof value !== 'string') return '/register';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/register';
  try {
    // Resolving against a fixed dummy origin and checking it round-trips
    // to the same origin is a stronger guarantee than the string checks
    // above alone -- catches anything those miss.
    const resolved = new URL(value, 'https://dummy.internal');
    if (resolved.origin !== 'https://dummy.internal') return '/register';
  } catch {
    return '/register';
  }
  return value;
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

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
        const { error: profileError } = await syncSignInProfile(admin, user);
        if (profileError) {
          console.error('profile upsert on sign-in failed:', profileError);
        } else if (user.email_confirmed_at) {
          // If an admin enrolled this email BEFORE the student first
          // signed in, that registration lives on an account the student
          // has never used (Supabase doesn't always attach a Google
          // sign-in to a pre-made account). Move it onto THIS account so
          // their dashboard shows it. Gated on a verified email -- only
          // the real owner of the address gets here -- and it only ever
          // absorbs accounts that have never signed in. Never allowed to
          // break sign-in itself.
          try {
            await absorbShellAccounts(admin, { id: user.id, email: user.email });
          } catch (err) {
            console.error('claiming pre-registered account failed:', err);
          }
          // Same for a teacher the admin registered by email first.
          try {
            await claimTeacherShells(admin, { id: user.id, email: user.email });
          } catch (err) {
            console.error('claiming teacher account failed:', err);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing/invalid code -- send them back to try again rather than
  // silently failing.
  return NextResponse.redirect(`${origin}/register?oauth_error=1`);
}
