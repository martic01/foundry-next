'use server';

import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';
import { COURSES, getCourse} from '../lib/courses';
import { getCourseSettings } from '../lib/course-settings';
import { getAvailability, describeClosure } from '../lib/course-status';

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
  return { open: availability.open, message: describeClosure(availability) };
}
