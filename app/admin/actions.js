'use server';

import { parseCloudinaryVideoUrl, isPlausiblePublicId } from '../../lib/safe-url';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';
import { computeTimerTransition } from '../../lib/batch-timer';
import { TAGS, getAvailability, defaultSettingsFor, reopenDateToIso } from '../../lib/course-status';
import { COURSES, getCourse} from '../../lib/courses';
import { parsePaymentInput, isAdminAdded, ADMIN_REF_PREFIX } from '../../lib/payments';
import { resolveStudentAccount, absorbShellAccounts, resolveTeacherAccount } from '../../lib/accounts';
import { COURSE_SETTINGS_TAG } from '../../lib/course-settings';
import { notifyStudents } from '../../lib/notify';
import { destroyCloudinaryVideo, publicIdFromCloudinaryUrl } from '../../lib/cloudinary-server';

// Every function here uses the caller's OWN session (via the regular,
// RLS-bound server client) -- never the service-role client -- with ONE
// exception: adminAddStudent/adminDeleteStudent below, which need the
// Supabase Auth ADMIN API (create/delete a user account outright), and
// that API only exists on the service-role client.
//
// Every mutating function here also calls requireAdmin() itself now, up
// front -- not just adminAddStudent/adminDeleteStudent. These used to
// rely ENTIRELY on the database's own RLS policies (is_admin() checks in
// supabase/schema.sql) to reject a non-admin caller, with nothing
// checked in the application code at all. That's a single point of
// failure: RLS on this project has been toggled off before during
// development, and if that ever happens again -- a dashboard misclick, a
// migration that doesn't re-enable it, anything -- every one of these
// becomes callable by any signed-in student, not just an admin, since
// Server Actions are reachable directly (as a POST request) by anyone
// who can reach the deployed app, regardless of whether the admin-only
// UI that normally calls them is hidden from them. requireAdmin() here
// means that even in that scenario, these stay closed.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false, error: 'Not authorized.' };
  return { ok: true };
}

// Content actions (class links, videos, announcements) are open to the
// admin AND to teachers -- but a teacher only ever for batches they teach,
// and never for "all batches". Postgres RLS enforces the same rule
// (teaches_batch() in migration-teachers.sql); this gives a friendly
// error first and keeps the rule if RLS is ever misconfigured.
async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data: profile } = await supabase.from('profiles').select('role, blocked').eq('id', user.id).maybeSingle();
  if (profile?.role === 'admin') return { ok: true, role: 'admin', userId: user.id };
  if (profile?.role === 'teacher' && !profile.blocked) {
    const { data: rows } = await supabase.from('batch_teachers').select('batch_id').eq('teacher_id', user.id);
    return { ok: true, role: 'teacher', userId: user.id, batchIds: (rows || []).map((r) => r.batch_id) };
  }
  return { ok: false, error: 'Not authorized.' };
}

// Audience for a staff member: admins may pick 'all' or any batch; a
// teacher only a batch they teach.
function staffAudience(audience, staff) {
  const aud = parseAudience(audience);
  if (aud.error) return aud;
  if (staff.role === 'teacher' && (!aud.batchId || !staff.batchIds.includes(aud.batchId))) {
    return { error: 'You can only do this for a batch you teach.' };
  }
  return aud;
}

// For edit/delete of an existing row: a teacher may only touch rows
// aimed at one of their batches.
async function staffOwnsRow(staff, supabase, table, id) {
  if (staff.role === 'admin') return null;
  const { data } = await supabase.from(table).select('batch_id').eq('id', id).maybeSingle();
  if (!data || !data.batch_id || !staff.batchIds.includes(data.batch_id)) return 'You can only change items for a batch you teach.';
  return null;
}

export async function removeFromBatch(registrationId) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

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
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

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

// ---------- Helpers shared by the actions below ----------

function refreshEverything() {
  // 'layout' revalidates every page nested under that layout in one
  // call. Admin pages show counts/lists that depend on all of this, the
  // student portal needs refreshing too, and the public pages show
  // registration state.
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/teacher', 'layout');
  revalidatePath('/');
  revalidatePath('/register');
}

// The audience picker sends 'all' for "every batch" or a batch id.
// Anything else is rejected rather than silently treated as a batch id.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parseAudience(audience) {
  if (audience === 'all') return { batchId: null };
  if (typeof audience === 'string' && UUID_RE.test(audience)) return { batchId: audience };
  return { error: 'Choose which batch this is for.' };
}

// Class links end up in an <a href> on the student side, so only real
// web links are accepted -- a `javascript:` URL typed in here would
// otherwise run in a student's browser when they click "Join class".
function parseUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'The link must start with https://' };
    return { url: u.toString() };
  } catch {
    return { error: 'That doesn\u2019t look like a valid link.' };
  }
}

// ---------- Batches: name, start date, timer ----------

export async function updateBatchDetails(batchId, { label, startDate, capacity, autoAssign }) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };
  if (typeof batchId !== 'string' || !UUID_RE.test(batchId)) return { error: 'Unknown batch.' };

  const name = String(label || '').trim();
  if (!name) return { error: 'Batch name can\u2019t be empty.' };
  if (name.length > 80) return { error: 'Batch name is too long (80 characters max).' };
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { error: 'Invalid start date.' };

  const patch = { label: name, start_date: startDate || null };
  const supabase = await createClient();

  if (capacity !== undefined) {
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > MAX_BATCH_SIZE) return { error: `Seats must be a whole number from 1 to ${MAX_BATCH_SIZE}.` };
    const { count } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', batchId)
      .eq('status', 'paid');
    if ((count || 0) > cap) return { error: `${count} students are already in this batch \u2014 move some out before lowering it to ${cap}.` };
    patch.capacity = cap;
  }
  if (autoAssign !== undefined) patch.auto_assign = !!autoAssign;

  const { error } = await supabase.from('batches').update(patch).eq('id', batchId);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true };
}

// ---------- Manual batches + teachers ----------

// A batch never holds more than this many students (also a CHECK in the
// database). When automatic registration fills one, assign_batch()
// creates the next batch for that course by itself.
const MAX_BATCH_SIZE = 50;

function parseIds(list) {
  if (!Array.isArray(list)) return { ids: [] };
  const ids = [...new Set(list)];
  if (ids.length > 200 || ids.some((id) => typeof id !== 'string' || !UUID_RE.test(id))) return { error: 'Invalid selection.' };
  return { ids };
}

// Admin creates a batch by hand for any course, optionally with a seat
// count, a start date, "keep automatic registration out of it", and
// teachers.
export async function createBatch(courseKey, { label, capacity, startDate, autoAssign, teacherIds } = {}) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const course = getCourse(courseKey);
  if (!course) return { error: 'Choose a course.' };
  const cap = capacity === undefined || capacity === '' ? MAX_BATCH_SIZE : Number(capacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > MAX_BATCH_SIZE) return { error: `Seats must be a whole number from 1 to ${MAX_BATCH_SIZE}.` };
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { error: 'Invalid start date.' };
  const teachers = parseIds(teacherIds);
  if (teachers.error) return { error: teachers.error };

  const supabase = await createClient();
  let name = String(label || '').trim();
  if (name.length > 80) return { error: 'Batch name is too long (80 characters max).' };
  if (!name) {
    const { count } = await supabase.from('batches').select('id', { count: 'exact', head: true }).eq('course', courseKey);
    name = `${course.name.split(' \u2014 ')[0]} -- Batch ${(count || 0) + 1}`;
  }

  const { data: batch, error } = await supabase
    .from('batches')
    .insert({ course: courseKey, label: name, capacity: cap, start_date: startDate || null, auto_assign: autoAssign !== false })
    .select('id')
    .single();
  if (error) return { error: error.message };

  if (teachers.ids.length) {
    const { error: tErr } = await supabase
      .from('batch_teachers')
      .insert(teachers.ids.map((teacher_id) => ({ batch_id: batch.id, teacher_id })));
    if (tErr) {
      refreshEverything();
      return { ok: true, batchId: batch.id, warning: `Batch created, but teachers couldn\u2019t be assigned: ${tErr.message}` };
    }
  }
  refreshEverything();
  return { ok: true, batchId: batch.id };
}

// Add / remove ONE teacher on ONE batch (used from the batch card).
export async function assignTeacherToBatch(batchId, teacherId, assigned) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };
  if (![batchId, teacherId].every((v) => typeof v === 'string' && UUID_RE.test(v))) return { error: 'Invalid selection.' };

  const supabase = await createClient();
  if (assigned) {
    const { data: t } = await supabase.from('profiles').select('role').eq('id', teacherId).maybeSingle();
    if (t?.role !== 'teacher') return { error: 'That person isn\u2019t a teacher.' };
    const { error } = await supabase.from('batch_teachers').upsert({ batch_id: batchId, teacher_id: teacherId }, { onConflict: 'batch_id,teacher_id' });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('batch_teachers').delete().eq('batch_id', batchId).eq('teacher_id', teacherId);
    if (error) return { error: error.message };
  }
  refreshEverything();
  return { ok: true };
}

// Replaces a teacher's whole set of batches in one go (Teachers page).
export async function setTeacherBatches(teacherId, batchIds) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };
  if (typeof teacherId !== 'string' || !UUID_RE.test(teacherId)) return { error: 'Invalid teacher.' };
  const parsed = parseIds(batchIds);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const { data: t } = await supabase.from('profiles').select('role').eq('id', teacherId).maybeSingle();
  if (t?.role !== 'teacher') return { error: 'That person isn\u2019t a teacher.' };

  if (parsed.ids.length) {
    const { data: found } = await supabase.from('batches').select('id').in('id', parsed.ids);
    if ((found || []).length !== parsed.ids.length) return { error: 'One of those batches no longer exists \u2014 refresh and try again.' };
  }

  const { data: current } = await supabase.from('batch_teachers').select('batch_id').eq('teacher_id', teacherId);
  const have = new Set((current || []).map((r) => r.batch_id));
  const want = new Set(parsed.ids);
  const toAdd = parsed.ids.filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !want.has(id));

  if (toAdd.length) {
    const { error } = await supabase.from('batch_teachers').insert(toAdd.map((batch_id) => ({ batch_id, teacher_id: teacherId })));
    if (error) return { error: error.message };
  }
  if (toRemove.length) {
    const { error } = await supabase.from('batch_teachers').delete().eq('teacher_id', teacherId).in('batch_id', toRemove);
    if (error) return { error: error.message };
  }
  refreshEverything();
  return { ok: true };
}

// Registers someone as a teacher by name + email (they then sign in with
// Google using that email). Needs the service-role client for the Auth
// Admin API, like adminAddStudent.
export async function adminAddTeacher(fullName, email, batchIds, confirmDropEnrolments = false) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const name = String(fullName || '').trim();
  const address = String(email || '').trim();
  if (!name) return { error: 'Enter the teacher\u2019s name.' };
  if (name.length > 120) return { error: 'Name is too long (max 120).' };
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { error: 'Enter a valid email address.' };
  const parsed = parseIds(batchIds);
  if (parsed.error) return { error: parsed.error };

  const admin = createAdminClient();
  const account = await resolveTeacherAccount(admin, { email: address, fullName: name, confirmDropEnrolments: confirmDropEnrolments === true });
  if (account.error) return { error: account.error };
  if (account.needsConfirm) return { needsConfirm: true, enrolments: account.enrolments, name: account.name };

  if (parsed.ids.length) {
    const { error } = await admin
      .from('batch_teachers')
      .upsert(parsed.ids.map((batch_id) => ({ batch_id, teacher_id: account.userId })), { onConflict: 'batch_id,teacher_id' });
    if (error) return { error: `Teacher added, but batches couldn\u2019t be assigned: ${error.message}` };
  }
  refreshEverything();
  return { ok: true, created: account.created, droppedEnrolments: account.droppedEnrolments || 0 };
}

// Takes the teacher role away (back to a plain account) and unassigns
// every batch. Never touches admins or accounts that aren't teachers.
export async function removeTeacher(teacherId) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };
  if (typeof teacherId !== 'string' || !UUID_RE.test(teacherId)) return { error: 'Invalid teacher.' };

  const supabase = await createClient();
  const { data: t } = await supabase.from('profiles').select('role').eq('id', teacherId).maybeSingle();
  if (t?.role !== 'teacher') return { error: 'That person isn\u2019t a teacher.' };

  const { error: delError } = await supabase.from('batch_teachers').delete().eq('teacher_id', teacherId);
  if (delError) return { error: delError.message };
  const { error } = await supabase.from('profiles').update({ role: 'student' }).eq('id', teacherId);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true };
}

// One action for all five timer buttons. The transition rules live in
// lib/batch-timer.js (pure + tested); this just loads the row, applies
// them, and writes the result. The write is guarded on the status we
// read, so a double-click (or two admins) can't apply a stale transition.
export async function batchTimerAction(batchId, action) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const supabase = await createClient();
  const { data: batch, error: readError } = await supabase
    .from('batches')
    .select('id, class_status, timer_total_seconds, timer_elapsed_seconds, timer_started_at')
    .eq('id', batchId)
    .maybeSingle();
  if (readError) return { error: readError.message };
  if (!batch) return { error: 'Batch not found.' };

  const transition = computeTimerTransition(batch, action, Date.now());
  if (transition.error) return { error: transition.error };

  const { data: updated, error } = await supabase
    .from('batches')
    .update(transition.fields)
    .eq('id', batchId)
    .eq('class_status', batch.class_status)
    .select('id');
  if (error) return { error: error.message };
  if (!updated?.length) return { error: 'This batch was just changed by someone else \u2014 refresh and try again.' };

  refreshEverything();
  return { ok: true };
}

// Moves a paid student to another batch of the SAME course, if it has
// room. Also used to give an unassigned student (batch_id null) a batch.
export async function moveStudentToBatch(registrationId, targetBatchId) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const supabase = await createClient();
  const [{ data: reg }, { data: target }] = await Promise.all([
    supabase.from('registrations').select('id, course, batch_id, status').eq('id', registrationId).maybeSingle(),
    supabase.from('batches').select('id, course, capacity, label').eq('id', targetBatchId).maybeSingle()
  ]);
  if (!reg || !target) return { error: 'Student or batch not found.' };
  if (reg.status !== 'paid') return { error: 'Only students with an active registration can be moved.' };
  if (reg.course !== target.course) return { error: 'A student can only be moved to a batch of the same course.' };
  if (reg.batch_id === target.id) return { ok: true };

  const { count } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', target.id)
    .eq('status', 'paid');
  if ((count || 0) >= target.capacity) return { error: `${target.label} is full (${target.capacity}/${target.capacity}).` };

  const { error } = await supabase.from('registrations').update({ batch_id: target.id }).eq('id', registrationId);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true };
}

// Moves SEVERAL paid students to one batch of their course in one go.
// All-or-nothing: they must all be of the same course as the target, and
// the target must have room for everyone who actually moves.
export async function moveStudentsToBatch(registrationIds, targetBatchId) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };
  const parsed = parseIds(registrationIds);
  if (parsed.error || !parsed.ids.length) return { error: 'Select at least one student.' };
  if (typeof targetBatchId !== 'string' || !UUID_RE.test(targetBatchId)) return { error: 'Choose a batch to move them to.' };

  const supabase = await createClient();
  const [{ data: regs }, { data: target }] = await Promise.all([
    supabase.from('registrations').select('id, course, batch_id, status').in('id', parsed.ids),
    supabase.from('batches').select('id, course, capacity, label').eq('id', targetBatchId).maybeSingle()
  ]);
  if (!target) return { error: 'That batch no longer exists.' };
  if (!regs || regs.length !== parsed.ids.length) return { error: 'Some of those students no longer exist \u2014 refresh and try again.' };
  if (regs.some((r) => r.status !== 'paid')) return { error: 'Only students with an active registration can be moved.' };
  if (regs.some((r) => r.course !== target.course)) return { error: 'Students can only be moved to a batch of the same course.' };

  const moving = regs.filter((r) => r.batch_id !== target.id).map((r) => r.id);
  if (!moving.length) return { ok: true, moved: 0 };

  const { count } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', target.id)
    .eq('status', 'paid');
  const free = Math.max(target.capacity - (count || 0), 0);
  if (moving.length > free) {
    return { error: `${target.label} only has ${free} free ${free === 1 ? 'seat' : 'seats'} (${count || 0}/${target.capacity}) \u2014 you selected ${moving.length}.` };
  }

  const { error } = await supabase.from('registrations').update({ batch_id: target.id }).in('id', moving);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true, moved: moving.length };
}

// ---------- Class links ----------

export async function addClassLink(audience, title, rawUrl) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };
  const aud = staffAudience(audience, staff);
  if (aud.error) return { error: aud.error };
  const parsed = parseUrl(rawUrl);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('class_links').insert({
    batch_id: aud.batchId,
    title: String(title || '').trim().slice(0, 200) || null,
    url: parsed.url,
    updated_by: user?.id
  });
  if (error) return { error: error.message };
  await notifyStudents(supabase, { batchId: aud.batchId }, {
    kind: 'link',
    title: 'New class link',
    body: String(title || '').trim().slice(0, 200) || 'A new class link was added.',
    href: '/dashboard/courses'
  });
  refreshEverything();
  return { ok: true };
}

// "Replace" a link = edit its URL (and/or its title and audience).
export async function updateClassLink(linkId, { audience, title, url }) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };
  const aud = staffAudience(audience, staff);
  if (aud.error) return { error: aud.error };
  const parsed = parseUrl(url);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const denied = await staffOwnsRow(staff, supabase, 'class_links', linkId);
  if (denied) return { error: denied };
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('class_links')
    .update({
      batch_id: aud.batchId,
      title: String(title || '').trim().slice(0, 200) || null,
      url: parsed.url,
      updated_at: new Date().toISOString(),
      updated_by: user?.id
    })
    .eq('id', linkId);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true };
}

export async function deleteClassLink(linkId) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };

  const supabase = await createClient();
  const denied = await staffOwnsRow(staff, supabase, 'class_links', linkId);
  if (denied) return { error: denied };
  const { error } = await supabase.from('class_links').delete().eq('id', linkId);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true };
}

// ---------- Announcements ----------

export async function postAnnouncement(audience, content) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };
  const aud = staffAudience(audience, staff);
  if (aud.error) return { error: aud.error };
  const text = String(content || '').trim();
  if (!text) return { error: 'Write something to announce.' };
  if (text.length > 5000) return { error: 'Announcement is too long (max 5000).' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: posted, error } = await supabase
    .from('messages')
    .insert({ batch_id: aud.batchId, sender_id: user?.id, content: text })
    .select('id')
    .single();
  if (error) return { error: error.message };
  // Pop-up for every student who can see it; they must acknowledge it.
  await notifyStudents(supabase, { batchId: aud.batchId }, {
    kind: 'announcement',
    title: 'New announcement',
    body: text,
    href: '/dashboard/announcements',
    messageId: posted?.id
  });
  refreshEverything();
  return { ok: true };
}

export async function updateAnnouncement(messageId, { audience, content }) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };
  const aud = staffAudience(audience, staff);
  if (aud.error) return { error: aud.error };
  const text = String(content || '').trim();
  if (!text) return { error: 'An announcement can\u2019t be empty.' };
  if (text.length > 5000) return { error: 'Announcement is too long (max 5000).' };

  const supabase = await createClient();
  const denied = await staffOwnsRow(staff, supabase, 'messages', messageId);
  if (denied) return { error: denied };
  const { error } = await supabase
    .from('messages')
    .update({ batch_id: aud.batchId, content: text, updated_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true };
}

export async function deleteAnnouncement(messageId) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };

  const supabase = await createClient();
  const denied = await staffOwnsRow(staff, supabase, 'messages', messageId);
  if (denied) return { error: denied };
  const { error } = await supabase.from('messages').delete().eq('id', messageId);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true };
}

// ---------- Class videos ----------

// The video file itself is already sitting on Cloudinary by the time
// this runs (components/admin/ClassVideoManager.jsx uploads it directly
// from the browser via lib/cloudinary.js) -- this only ever records the
// resulting URL.
export async function addClassVideo(audience, title, description, cloudinaryUrl, cloudinaryPublicId) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };
  const aud = staffAudience(audience, staff);
  if (aud.error) return { error: aud.error };
  if (!String(title || '').trim()) return { error: 'Give the video a title.' };
  if (String(title).length > 200) return { error: 'Title is too long (max 200).' };
  if (String(description || '').length > 2000) return { error: 'Description is too long (max 2000).' };
  const videoUrl = parseCloudinaryVideoUrl(cloudinaryUrl, process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  if (!videoUrl) return { error: 'Video URL must be an https Cloudinary video from this account.' };
  if (cloudinaryPublicId && !isPlausiblePublicId(cloudinaryPublicId)) return { error: 'Invalid video id.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('class_videos').insert({
    batch_id: aud.batchId,
    title: String(title).trim(),
    description: String(description || '').trim() || null,
    cloudinary_url: videoUrl,
    cloudinary_public_id: cloudinaryPublicId || null,
    created_by: user?.id
  });
  if (error) return { error: error.message };
  await notifyStudents(supabase, { batchId: aud.batchId }, {
    kind: 'video',
    title: 'New class video',
    body: String(title).trim(),
    href: '/dashboard/courses'
  });
  refreshEverything();
  return { ok: true };
}

// Edit what a video says and who it shows for. (The file itself can't
// be swapped -- delete and re-upload for that.)
export async function updateClassVideo(videoId, { audience, title, description }) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };
  const aud = staffAudience(audience, staff);
  if (aud.error) return { error: aud.error };
  if (!String(title || '').trim()) return { error: 'Give the video a title.' };

  const supabase = await createClient();
  const denied = await staffOwnsRow(staff, supabase, 'class_videos', videoId);
  if (denied) return { error: denied };
  const { error } = await supabase
    .from('class_videos')
    .update({
      batch_id: aud.batchId,
      title: String(title).trim(),
      description: String(description || '').trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', videoId);
  if (error) return { error: error.message };
  refreshEverything();
  return { ok: true };
}

// Deletes the row AND the file on Cloudinary. The row goes first (so
// students lose access immediately whatever happens next); if the
// Cloudinary call then fails, the admin is told so they can remove the
// file by hand -- the app never silently leaves a paid-for file behind.
export async function deleteClassVideo(videoId) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };

  const supabase = await createClient();
  const denied = await staffOwnsRow(staff, supabase, 'class_videos', videoId);
  if (denied) return { error: denied };
  const { data: video } = await supabase
    .from('class_videos')
    .select('cloudinary_url, cloudinary_public_id')
    .eq('id', videoId)
    .maybeSingle();
  const { error } = await supabase.from('class_videos').delete().eq('id', videoId);
  if (error) return { error: error.message };
  refreshEverything();

  const publicId = video?.cloudinary_public_id || publicIdFromCloudinaryUrl(video?.cloudinary_url);
  const gone = await destroyCloudinaryVideo(publicId);
  if (!gone.ok) {
    return { ok: true, warning: `Removed from the app, but the file is still on Cloudinary: ${gone.error}` };
  }
  return { ok: true };
}

// Used when a browser upload to Cloudinary succeeded but recording it in
// our database failed -- removes the orphaned file.
export async function discardCloudinaryUpload(publicId) {
  const staff = await requireStaff();
  if (!staff.ok) return { error: staff.error };
  if (!isPlausiblePublicId(publicId)) return { error: 'Invalid video id.' };
  const supabase = await createClient();
  // Never delete a file that a live row still points at.
  const { data: inUse } = await supabase.from('class_videos').select('id').eq('cloudinary_public_id', publicId).limit(1);
  if (inUse?.length) return { error: 'That file is still in use.' };
  const gone = await destroyCloudinaryVideo(publicId);
  return gone.ok ? { ok: true } : { error: gone.error };
}

// ---------- Course registration controls ----------

// settings: { registrationOpen: boolean, tag: string,
//             reopenDate: 'YYYY-MM-DD' | '', untilFurtherNotice: boolean }
//
// When the result is "closed" (switch off, or a tag that closes), the
// admin MUST say when it reopens: a date or "until further notice".
export async function updateCourseSettings(courseKey, settings) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const course = getCourse(courseKey);
  if (!course) return { error: 'Unknown course.' };
  const tag = settings?.tag || 'none';
  if (!TAGS[tag]) return { error: 'Unknown tag.' };
  const registrationOpen = !!settings?.registrationOpen;

  const closing = !registrationOpen || TAGS[tag].closes;
  let reopenAt = null;
  if (closing) {
    if (settings?.reopenDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.reopenDate)) return { error: 'Invalid reopen date.' };
      reopenAt = reopenDateToIso(settings.reopenDate);
      if (new Date(reopenAt).getTime() <= Date.now()) return { error: 'The reopen date must be in the future.' };
    } else if (!settings?.untilFurtherNotice) {
      return { error: 'Closing registration needs a reopen date \u2014 or tick \u201cUntil further notice\u201d.' };
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prev } = await supabase.from('course_settings').select('*').eq('course', courseKey).maybeSingle();

  // Remember WHEN it closed (only on the open -> closed edge), so
  // /api/payments/verify can still honour payments started before that.
  const wasOpen = getAvailability(prev || defaultSettingsFor(course)).open;
  let closedAt = prev?.registration_closed_at ?? null;
  if (!closing) closedAt = null;
  else if (wasOpen || !closedAt) closedAt = new Date().toISOString();

  const { error } = await supabase.from('course_settings').upsert({
    course: courseKey,
    registration_open: registrationOpen,
    tag,
    reopen_at: reopenAt,
    registration_closed_at: closedAt,
    updated_at: new Date().toISOString(),
    updated_by: user?.id
  });
  if (error) return { error: error.message };
  revalidateTag(COURSE_SETTINGS_TAG); // landing + /register read this through a cache
  refreshEverything();
  return { ok: true };
}


// Note: there is no more "prompt user to register again" action --
// registration now completes atomically inside /api/payments/verify
// right after a successful payment (Google sign-in already happened
// beforehand), so there's no in-between state where someone paid but
// left before finishing an account-creation step.

function validNoteDay(course, day) {
  return !!getCourse(course) && Number.isInteger(day) && day >= 1 && day <= 365;
}

export async function unlockNoteDay(course, day) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };
  if (!validNoteDay(course, day)) return { error: 'Invalid course or day.' };

  const supabase = await createClient();
  const { error } = await supabase.from('note_unlocks').upsert({ course, day });
  if (error) return { error: error.message };
  await notifyStudents(supabase, { course }, {
    kind: 'notes',
    title: `Day ${day} notes unlocked`,
    body: `${getCourse(course).name.split(' \u2014 ')[0]} \u00b7 new lesson notes are ready.`,
    href: '/dashboard/notes'
  });
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

export async function lockNoteDay(course, day) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };
  if (!validNoteDay(course, day)) return { error: 'Invalid course or day.' };

  const supabase = await createClient();
  const { error } = await supabase.from('note_unlocks').delete().eq('course', course).eq('day', day);
  if (error) return { error: error.message };
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
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
// If the payment-status migration hasn't been run, say exactly what to do
// instead of surfacing a raw Postgres "column does not exist" error.
const MIGRATION_HINT =
  'The database needs one update first: run supabase/migration-payment-status.sql in the Supabase SQL Editor, then try again.';
const needsMigration = (error) => /payment_status|amount_due_kobo|payment_method/.test(error?.message || '');

export async function adminAddStudent(fullName, email, courseKey, age, payment) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const course = getCourse(courseKey);
  if (!course) return { error: 'Unknown course.' };
  const name = String(fullName || '').trim();
  const address = String(email || '').trim().toLowerCase();
  if (!name || !address) return { error: 'Name and email are required.' };
  if (name.length > 120) return { error: 'Name is too long (max 120).' };
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { error: 'Enter a valid email address.' };
  if (!Number.isInteger(age) || age < 1) return { error: 'Enter a valid age.' };

  // Validate the payment BEFORE touching anything: a typo in the amount
  // must never leave behind a half-created account.
  const parsed = parsePaymentInput(payment, course.priceNow);
  if (parsed.error) return { error: parsed.error };

  const admin = createAdminClient();

  // Cheap preflight BEFORE anything is created: if the new columns aren't
  // there yet, stop now rather than leaving an account without a
  // registration.
  const { error: schemaError } = await admin.from('registrations').select('payment_status').limit(1);
  if (schemaError && needsMigration(schemaError)) return { error: MIGRATION_HINT };

  // Find-or-create the account by email (case-insensitive, repairs a
  // half-made account instead of failing with "already registered").
  const account = await resolveStudentAccount(admin, { email: address, fullName: name });
  if (account.error) return { error: account.error };
  const userId = account.userId;

  // If an earlier manual add left a duplicate account for this email
  // that the student never signed in to, fold its registrations in first
  // -- so the "already enrolled" check below sees the true picture.
  await absorbShellAccounts(admin, { id: userId, email: address });

  const { data: already } = await admin
    .from('registrations')
    .select('id, batches(label)')
    .eq('user_id', userId)
    .eq('course', courseKey)
    .eq('status', 'paid')
    .limit(1)
    .maybeSingle();
  if (already) {
    return {
      error: `${account.fullName || name} is already enrolled in ${course.name.split(' \u2014 ')[0]}${already.batches?.label ? ` (${already.batches.label})` : ''}. Find them under Batches \u2014 you can edit their payment from Payments.`
    };
  }

  const { data: batchId, error: batchError } = await admin.rpc('assign_batch', { p_course: courseKey });
  if (batchError) return { error: batchError.message };

  const { error: regError } = await admin.from('registrations').insert({
    user_id: userId,
    course: courseKey,
    age,
    batch_id: batchId,
    // Distinguishable from a real Paystack reference at a glance, and
    // it is how the app knows this record is a manual one the admin may
    // edit later (lib/payments.js -> isAdminAdded).
    paystack_reference: `${ADMIN_REF_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...parsed.row, // payment_status, amount_kobo, amount_due_kobo, payment_method
    status: 'paid', // access: enrolled
    laptop_specs_agreed: false
  });
  if (regError) return { error: needsMigration(regError) ? MIGRATION_HINT : regError.message };

  // Tell the admin exactly where this student now lives, so "did it
  // work?" never needs a hunt through the lists.
  const { data: batch } = await admin.from('batches').select('label').eq('id', batchId).maybeSingle();

  refreshEverything();
  return {
    ok: true,
    studentName: account.fullName || name,
    batchLabel: batch?.label || null,
    createdAccount: account.created
  };
}

// Change the payment details of a directly-added student -- e.g. pending
// -> paid when they settle up, or record another instalment. Paystack
// registrations are refused: those amounts were verified against
// Paystack's own records and must not be editable by hand.
export async function updateRegistrationPayment(registrationId, payment) {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { error: authCheck.error };

  const supabase = await createClient();
  const { data: reg } = await supabase
    .from('registrations')
    .select('id, course, paystack_reference, status')
    .eq('id', registrationId)
    .maybeSingle();
  if (!reg) return { error: 'Registration not found.' };
  if (!isAdminAdded(reg)) return { error: 'Paystack payments are verified automatically and can\u2019t be edited.' };

  const course = COURSES[reg.course];
  const parsed = parsePaymentInput(payment, course?.priceNow);
  if (parsed.error) return { error: parsed.error };

  const { error } = await supabase.from('registrations').update(parsed.row).eq('id', registrationId);
  if (error) return { error: needsMigration(error) ? MIGRATION_HINT : error.message };
  refreshEverything();
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

  refreshEverything();
  return { ok: true };
}
