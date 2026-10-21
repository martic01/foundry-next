'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';
import { COURSES, getCourse} from '../lib/courses';
import { getCourseSettings } from '../lib/course-settings';
import { getAvailability, describeClosure } from '../lib/course-status';
import { createAdminClient } from '../lib/supabase/admin';
import { validateCertificateName } from '../lib/certificates';
import { effectivePrice } from '../lib/pricing';

// Uses the caller's own session client (not the service-role client) --
// signOut() only ever needs to clear the cookies belonging to whoever is
// making the request, never anyone else's.
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

// Fresh, server-side "is this course open right now?" -- called by
// RegisterFlow right before the Paystack window opens, so an admin
// closing registration takes effect immediately even for someone who
// loaded /register an hour ago. Public: it only reports what the
// landing page already shows anyone.
export async function checkCourseOpenAction(courseKey) {
  const course = getCourse(courseKey);
  if (!course) return { open: false, message: 'Unknown course.' };
  if (course.contactOnly) return { open: false, message: 'This course is by enquiry. Please contact us on WhatsApp or email.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (me?.role === 'teacher' || me?.role === 'admin') {
      return { open: false, message: 'Teacher and admin accounts can\u2019t register for a course.' };
    }
  }
  const settings = (await getCourseSettings(supabase))[course.key];
  const availability = getAvailability(settings);
  return { open: availability.open, message: describeClosure(availability), priceNow: effectivePrice(course, settings).now };
}


// Saves the full name that will be printed on the student's certificate.
// Called from the register page before payment opens. Written with the
// service-role client (after checking who is asking) so it doesn't depend
// on profile-update permissions.
export async function saveCertificateNameAction(rawName) {
  const v = validateCertificateName(rawName);
  if (v.error) return { error: v.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in first.' };
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role === 'teacher' || me?.role === 'admin') return { error: 'Teacher and admin accounts can\u2019t register for a course.' };
  const admin = createAdminClient();
  // The profile row normally exists from sign-in; create it only if it doesn't.
  const { error } = me
    ? await admin.from('profiles').update({ certificate_name: v.name }).eq('id', user.id)
    : await admin.from('profiles').upsert({ id: user.id, full_name: user.user_metadata?.full_name || user.email, email: user.email, certificate_name: v.name });
  if (error) return { error: 'We couldn\u2019t save your name just now. Please try again.' };
  return { ok: true, name: v.name };
}
