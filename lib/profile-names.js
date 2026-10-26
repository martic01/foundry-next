// Two names per person:
//  * full_name       what the site SHOWS (profile card, receipts, lists, emails).
//                    It is the name they typed at registration, the same one
//                    printed on their certificate.
//  * google_name     the name on their Google account. Only an alternative:
//                    shown as a small "Gmail name" note, and used as the
//                    display name until they have chosen their own.
//
// Runs at every Google sign-in, so signing in again never replaces a name the
// person chose with the Google one.
export async function syncSignInProfile(admin, user) {
  const googleName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || '').trim().slice(0, 120);
  const email = user.email;

  let hasGoogleColumn = true;
  let { data: existing, error } = await admin.from('profiles').select('full_name, certificate_name, google_name').eq('id', user.id).maybeSingle();
  if (error) {
    // supabase/6-names-and-installs.sql not run yet: behave as before.
    hasGoogleColumn = false;
    ({ data: existing, error } = await admin.from('profiles').select('full_name, certificate_name').eq('id', user.id).maybeSingle());
    if (error) return { error };
  }

  if (!existing) {
    const row = { id: user.id, full_name: googleName, email };
    if (hasGoogleColumn) row.google_name = googleName;
    const res = await admin.from('profiles').insert(row);
    return { error: res.error };
  }

  const chosen = !!String(existing.certificate_name || '').trim()
    || (hasGoogleColumn && existing.google_name && existing.full_name && existing.full_name !== existing.google_name);
  const patch = { email };
  if (hasGoogleColumn) patch.google_name = googleName;
  if (!chosen) patch.full_name = googleName;
  const res = await admin.from('profiles').update(patch).eq('id', user.id);
  return { error: res.error };
}
