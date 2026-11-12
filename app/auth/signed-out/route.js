import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// A device whose session was replaced by a newer sign-in lands here: clear its
// cookies on this device only (scope 'local' never touches the other device),
// then show the login page with a short explanation.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const to = '/login';
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  return NextResponse.redirect(`${origin}${to}?reason=other_device`);
}
