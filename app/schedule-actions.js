'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { createAdminClient } from '../lib/supabase/admin';
import { cleanRows, DATE_RE } from '../lib/timetable';
import { cleanLegal, LEGAL_TAG } from '../lib/legal';
import { LEGAL_DEFAULTS } from '../lib/legal-defaults';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (e) => { console.error('[schedule]', e?.code, e?.message); return { error: 'Something went wrong saving that. Please try again.' }; };

// Who is calling, and (for a teacher) whether they teach this batch and
// which permission flags the admin has switched on for it.
async function actor(batchId) {
  if (typeof batchId !== 'string' || !UUID_RE.test(batchId)) return { error: 'Unknown batch.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const { data: p } = await supabase.from('profiles').select('role, blocked').eq('id', user.id).maybeSingle();
  if (p?.role === 'admin') return { role: 'admin', userId: user.id };
  if (p?.role === 'teacher' && !p.blocked) {
    const admin = createAdminClient();
    const [{ data: link }, { data: batch }] = await Promise.all([
      admin.from('batch_teachers').select('batch_id').eq('teacher_id', user.id).eq('batch_id', batchId).maybeSingle(),
      admin.from('batches').select('teacher_can_edit_start, teacher_can_edit_timetable').eq('id', batchId).maybeSingle()
    ]);
    if (link && batch) return { role: 'teacher', userId: user.id, flags: batch };
  }
  return { error: 'Not authorized.' };
}

function refresh() {
  revalidatePath('/admin', 'layout');
  revalidatePath('/teacher', 'layout');
  revalidatePath('/dashboard', 'layout');
}

export async function saveTimetable(batchId, rows) {
  const a = await actor(batchId);
  if (a.error) return a;
  if (a.role === 'teacher' && !a.flags.teacher_can_edit_timetable) return { error: 'The admin has not allowed you to edit this timetable.' };
  const c = cleanRows(rows);
  if (c.error) return c;
  const db = createAdminClient();
  const { error: delErr } = await db.from('batch_timetable').delete().eq('batch_id', batchId);
  if (delErr) return fail(delErr);
  if (c.rows.length) {
    const { error } = await db.from('batch_timetable').insert(c.rows.map((r) => ({ ...r, batch_id: batchId })));
    if (error) return fail(error);
  }
  refresh();
  return { ok: true };
}

// Back to the generated default timetable.
export async function resetTimetable(batchId) {
  const a = await actor(batchId);
  if (a.error) return a;
  if (a.role === 'teacher' && !a.flags.teacher_can_edit_timetable) return { error: 'The admin has not allowed you to edit this timetable.' };
  const { error } = await createAdminClient().from('batch_timetable').delete().eq('batch_id', batchId);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// The batch's first week (cohort start). Admin always; a teacher only when allowed.
export async function updateBatchStart(batchId, startDate) {
  const a = await actor(batchId);
  if (a.error) return a;
  if (a.role === 'teacher' && !a.flags.teacher_can_edit_start) return { error: 'The admin has not allowed you to change the start date.' };
  if (startDate && !DATE_RE.test(startDate)) return { error: 'Invalid start date.' };
  const { error } = await createAdminClient().from('batches').update({ start_date: startDate || null }).eq('id', batchId);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function setTeacherPermissions(batchId, { start, timetable }) {
  const a = await actor(batchId);
  if (a.error) return a;
  if (a.role !== 'admin') return { error: 'Only the admin can change this.' };
  const { error } = await createAdminClient().from('batches').update({ teacher_can_edit_start: !!start, teacher_can_edit_timetable: !!timetable }).eq('id', batchId);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------- Terms & Privacy (admin only) ----------
async function requireAdminId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (p?.role !== 'admin') return { error: 'Not authorized.' };
  return { supabase, userId: user.id };
}

function refreshLegal() {
  revalidateTag(LEGAL_TAG);
  revalidatePath('/terms'); revalidatePath('/privacy'); revalidatePath('/admin/legal');
}

export async function saveLegalDoc(doc, content) {
  if (doc !== 'terms' && doc !== 'privacy') return { error: 'Unknown document.' };
  const a = await requireAdminId();
  if (a.error) return a;
  const clean = cleanLegal(content);
  if (!clean) return { error: 'A document needs at least one section with a title.' };
  const { error } = await a.supabase.from('legal_docs').upsert({ doc, content: clean, updated_at: new Date().toISOString(), updated_by: a.userId });
  if (error) return fail(error);
  refreshLegal();
  return { ok: true };
}

export async function resetLegalDoc(doc) {
  if (doc !== 'terms' && doc !== 'privacy' || !LEGAL_DEFAULTS[doc]) return { error: 'Unknown document.' };
  const a = await requireAdminId();
  if (a.error) return a;
  const { error } = await a.supabase.from('legal_docs').delete().eq('doc', doc);
  if (error) return fail(error);
  refreshLegal();
  return { ok: true };
}
