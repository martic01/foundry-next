import { unstable_cache } from 'next/cache';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { COURSES } from './courses';
import { defaultSettingsFor } from './course-status';
import { createAdminClient } from './supabase/admin';
import { getCourseLoad, autoCloseReason } from './course-load';

// Reads every course's registration settings, falling back to the
// defaults in lib/courses.js for any course with no row (or if the
// table doesn't exist yet because the migration hasn't been run).
// Works with either the session client or the service-role client.
export async function getCourseSettings(supabase) {
  const { data, error } = await supabase.from('course_settings').select('*');
  return withAutoClose(mergeWithDefaults(error ? [] : data));
}

// Adds `auto_closed` ('full' | 'started' | null) to every course. Seat counts
// need to see every registration, so this always reads with the server
// (service-role) client, whichever client the caller passed in.
async function withAutoClose(byCourse) {
  let load = {};
  try { load = await getCourseLoad(createAdminClient()); } catch { /* no auto-close if the service key is missing */ }
  Object.keys(byCourse).forEach((k) => {
    byCourse[k] = { ...byCourse[k], auto_closed: autoCloseReason(load[k], byCourse[k]), seats_taken: load[k]?.paid || 0 };
  });
  return byCourse;
}

function mergeWithDefaults(rows) {
  const byCourse = {};
  Object.values(COURSES).forEach((c) => {
    byCourse[c.key] = defaultSettingsFor(c);
  });
  (rows || []).forEach((row) => {
    if (byCourse[row.course]) byCourse[row.course] = row;
  });
  return byCourse;
}

export const COURSE_SETTINGS_TAG = 'course-settings';

// Same data, for the PUBLIC pages (landing, /register) -- served from
// Next's data cache instead of hitting Supabase on every visit. The
// table is public-read anyway (see its RLS policy), so a cookie-less
// anon client is all that's needed -- which is also what makes it
// cacheable (a cookie-reading client can't be used inside a cache).
//
// Freshness: updateCourseSettings() calls revalidateTag(COURSE_SETTINGS_TAG),
// so an admin change shows up immediately; the 60s expiry is only a
// safety net. A scheduled reopen needs no cache bust at all -- the page
// compares reopen_at to "now" on every request (lib/course-status.js).
//
// NOT for anything that decides money: /api/payments/verify and the
// pre-payment check read the live table via getCourseSettings() above.
export const getPublicCourseSettings = unstable_cache(
  async () => {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await supabase.from('course_settings').select('*');
    return withAutoClose(mergeWithDefaults(error ? [] : data));
  },
  ['public-course-settings'],
  { revalidate: 60, tags: [COURSE_SETTINGS_TAG] }
);
