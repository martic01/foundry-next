'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';

// Every function here uses the caller's OWN session (via the regular,
// RLS-bound server client) -- never the service-role client -- with ONE
// exception: adminAddStudent/adminDeleteStudent below, which need the
// Supabase Auth ADMIN API (create/delete a user account outright), and
// that API only exists on the service-role client. Because that client
// bypasses RLS entirely, those two functions explicitly check
// `role === 'admin'` on the caller themselves before doing anything --
// they can't lean on Postgres to reject a non-admin the way every other
// function here does.

export async function removeFromBatch(registrationId) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('registrations')
    .update({ status: 'removed', batch_id: null })
    .eq('id', registrationId);
  if (error) return { error: error.message };
  // 'layout' revalidates every page nested under that layout in one call
  // -- Batches, Students (course list changes), Overview (counts), and
  // Payments (this registration drops off the ledger) all live under
  // /admin now, and the student's own portal needs refreshing too since
  // this removes their access to that batch's class link/announcements.
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

export async function setBlocked(profileId, blocked) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ blocked })
    .eq('id', profileId);
  if (error) return { error: error.message };
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

export async function setClassLink(batchId, url) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('class_links')
    .upsert({ batch_id: batchId, url, updated_at: new Date().toISOString(), updated_by: user?.id });
  if (error) return { error: error.message };
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

export async function sendBatchMessage(batchId, content) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('messages')
    .insert({ batch_id: batchId, sender_id: user?.id, content });
  if (error) return { error: error.message };
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

// Note: there is no more "prompt user to register again" action --
// registration now completes atomically inside /api/payments/verify
// right after a successful payment (Google sign-in already happened
// beforehand), so there's no in-between state where someone paid but
// left before finishing an account-creation step.

export async function unlockNoteDay(course, day) {
  const supabase = await createClient();
  const { error } = await supabase.from('note_unlocks').upsert({ course, day });
  if (error) return { error: error.message };
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

export async function lockNoteDay(course, day) {
  const supabase = await createClient();
  const { error } = await supabase.from('note_unlocks').delete().eq('course', course).eq('day', day);
  if (error) return { error: error.message };
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

// The video file itself is already sitting on Cloudinary by the time
// this runs (components/admin/ClassVideoManager.jsx uploads it directly
// from the browser via lib/cloudinary.js) -- this only ever records the
// resulting URL.
export async function addClassVideo(batchId, title, description, cloudinaryUrl, cloudinaryPublicId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('class_videos').insert({
    batch_id: batchId,
    title,
    description: description || null,
    cloudinary_url: cloudinaryUrl,
    cloudinary_public_id: cloudinaryPublicId || null,
    created_by: user?.id
  });
  if (error) return { error: error.message };
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

// Removes the row from OUR database only -- the video file stays on
// Cloudinary until removed there too (from the Cloudinary dashboard, or
// a future call to Cloudinary's destroy API using cloudinary_public_id).
// Students immediately lose access either way, since the app only ever
// shows what's in this table.
export async function deleteClassVideo(videoId) {
  const supabase = await createClient();
  const { error } = await supabase.from('class_videos').delete().eq('id', videoId);
  if (error) return { error: error.message };
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false, error: 'Not authorized.' };
  return { ok: true };
}

// Enrolls someone directly, bypassing Paystack entirely -- for cash/
// offline payments, comps, or anyone you want in a batch without them
// going through checkout. IMPORTANT CAVEAT, genuinely worth testing
// before relying on this for real students: if this email has never
// signed in before, this creates a brand-new auth.users row with no
// password and no Google identity attached to it yet. Whether that
// person's FUTURE "Continue with Google" sign-in (using this exact
// email) automatically links to THIS account, rather than erroring or
// silently creating a second, separate account, depends on your
// Supabase project's Auth settings for identity linking -- this isn't
// something the app can guarantee from here. Test it once (add a
// secondary email of your own this way, then try signing in with
// Google using it) before using this operationally.
export async function adminAddStudent(fullName, email, course, age) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const admin = createAdminClient();

  // Already has an account (signed in via Google before)? Enroll that
  // existing profile instead of creating a duplicate.
  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  let userId = existing?.id;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (createError) return { error: createError.message };
    userId = created.user.id;

    const { error: profileError } = await admin.from('profiles').upsert({ id: userId, full_name: fullName, email });
    if (profileError) return { error: profileError.message };
  }

  const { data: batchId, error: batchError } = await admin.rpc('assign_batch', { p_course: course });
  if (batchError) return { error: batchError.message };

  const { error: regError } = await admin.from('registrations').insert({
    user_id: userId,
    course,
    age,
    batch_id: batchId,
    // Distinguishable from a real Paystack reference at a glance in the
    // Payments ledger -- this student's amount_kobo is 0, so it's
    // already obvious there, but this makes it doubly clear on export.
    paystack_reference: `ADMIN-ADDED-${Date.now()}`,
    amount_kobo: 0,
    status: 'paid',
    laptop_specs_agreed: false
  });
  if (regError) return { error: regError.message };

  revalidatePath('/admin', 'layout');
  return { ok: true };
}

// Deletes the account entirely -- not a soft block, not "remove from
// batch". Calls the Auth Admin API to delete the auth.users row itself,
// which is what actually matters: profiles.id references auth.users(id)
// on delete cascade, so that single call cascades through profiles,
// registrations, everything tied to this person. Deleting only the
// profiles row (skipping this) would leave a dangling auth.users entry
// that could still sign in to an now-empty account.
export async function adminDeleteStudent(profileId) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
