'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';

// Uses the caller's own session client (not the service-role client) --
// signOut() only ever needs to clear the cookies belonging to whoever is
// making the request, never anyone else's.
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
