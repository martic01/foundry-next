'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { createAdminClient } from '../lib/supabase/admin';
import { EXAM_RULES, EXAMS, hasExam } from '../lib/exam/config';
import { BANK } from '../lib/exam/bank';
import { watToIso, fmtWat, defaultExamStart } from '../lib/exam/time';
import { removeProof, cleanRetention } from '../lib/exam/proof';
import { startAttempt, finishAttempt, loadExamContext, openRef, openText } from '../lib/exam/server';
import { adminIds, batchStudentIds, announce, gUsers, gBatch, gAnnounce } from '../lib/exam/notify';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (e) => { console.error('[exam]', e?.code, e?.message); return { error: 'Something went wrong. Please try again.' }; };
const refresh = () => { revalidatePath('/dashboard', 'layout'); revalidatePath('/admin/exams'); revalidatePath('/teacher/exams'); revalidatePath('/admin', 'layout'); };

async function who() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in.' };
  const { data: p } = await supabase.from('profiles').select('role, blocked').eq('id', user.id).maybeSingle();
  return { user, role: p?.role, blocked: !!p?.blocked };
}
async function student() {
  const w = await who();
  if (w.error) return w;
  if (w.role !== 'student' || w.blocked) return { error: 'Only active students can take the exam.' };
  return w;
}
async function admin() {
  const w = await who();
  if (w.error) return w;
  if (w.role !== 'admin') return { error: 'Not authorized.' };
  return w;
}

// ---------------- student ----------------
export async function startExam() {
  const s = await student();
  if (s.error) return s;
  const res = await startAttempt(createAdminClient(), s.user.id);
  if (res.error) return res;
  refresh();
  return { ok: true };
}

function cleanAnswers(raw, attempt) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const ids = new Set(attempt.questions.map((q) => q.id));
  const out = { ...(attempt.answers || {}) };
  for (const [id, v] of Object.entries(raw)) {
    if (!ids.has(id)) continue;
    if (v === null) { delete out[id]; continue; } // "Clear my answer"
    if (!Number.isInteger(v) || v < 0 || v > 3) continue;
    out[id] = v;
  }
  return out;
}

async function myRunning(db, userId, attemptId) {
  if (typeof attemptId !== 'string' || !UUID_RE.test(attemptId)) return null;
  const { data } = await db.from('exam_attempts').select('*').eq('id', attemptId).eq('user_id', userId).maybeSingle();
  return data;
}

// Autosave. Cheap and repeatable; the browser retries it if the network drops.
export async function saveExamAnswers(attemptId, answers) {
  const s = await student();
  if (s.error) return s;
  const db = createAdminClient();
  const a = await myRunning(db, s.user.id, attemptId);
  if (!a) return { error: 'Unknown exam.' };
  const serverNow = Date.now();
  if (a.status !== 'in_progress') return { ok: true, finished: true, serverNow };
  if (Date.parse(a.expires_at) < serverNow) {
    await finishAttempt(db, a, a.answers || {}, { auto: true });
    return { ok: true, finished: true, serverNow };
  }
  const merged = cleanAnswers(answers, a);
  if (!merged) return { error: 'Invalid answers.' };
  const { error } = await db.from('exam_attempts').update({ answers: merged }).eq('id', a.id).eq('status', 'in_progress');
  if (error) return fail(error);
  return { ok: true, serverNow };
}

// Final submit (by the student or by the timer). A connection that dropped at time-up may still
// deliver its answers for a few minutes (EXAM_RULES.graceSeconds); after that the saved copy is graded.
export async function submitExam(attemptId, answers, auto = false) {
  const s = await student();
  if (s.error) return s;
  const db = createAdminClient();
  const a = await myRunning(db, s.user.id, attemptId);
  if (!a) return { error: 'Unknown exam.' };
  if (a.status !== 'in_progress') return { ok: true, already: true };
  const late = Date.now() > Date.parse(a.expires_at) + EXAM_RULES.graceSeconds * 1000;
  // The browser's "auto" flag is not trusted: only a real time-up counts as automatic, so the early-submit lock cannot be skipped.
  const timeUp = Date.now() >= Date.parse(a.expires_at) - 15000;
  if (!late && !timeUp && Date.now() - Date.parse(a.started_at) < EXAM_RULES.minSubmitMinutes * 60000) return { error: `Too early to submit. You can submit after ${EXAM_RULES.minSubmitMinutes} minutes.` };
  const merged = late ? (a.answers || {}) : (cleanAnswers(answers, a) || a.answers || {});
  const res = await finishAttempt(db, a, merged, { auto: (!!auto && timeUp) || late });
  refresh();
  return { ok: true, already: !!res.already };
}

// The student left full screen or switched away. Counted on the server; the last allowed strike submits the exam.
export async function recordExamViolation(attemptId, answers) {
  const s = await student();
  if (s.error) return s;
  if (typeof attemptId !== 'string' || !UUID_RE.test(attemptId)) return { error: 'Unknown attempt.' };
  const db = createAdminClient();
  const { data: at } = await db.from('exam_attempts').select('*').eq('id', attemptId).eq('user_id', s.user.id).maybeSingle();
  if (!at || at.status !== 'in_progress') return { finished: true };
  const n = (at.violations || 0) + 1;
  await db.from('exam_attempts').update({ violations: n }).eq('id', attemptId).eq('status', 'in_progress'); // quietly skipped until database file 15 is run
  const max = EXAM_RULES.maxViolations;
  if (n >= max) {
    const clean = {};
    const merged = { ...(at.answers || {}), ...(answers && typeof answers === 'object' ? answers : {}) };
    for (const q of at.questions) { const v = merged[q.id]; if (Number.isInteger(v) && v >= 0 && v < 4) clean[q.id] = v; }
    await finishAttempt(db, at, clean, { auto: true, forced: true }); // a violation submit always stands, even in the first 10 minutes
    refresh();
    return { finished: true, violations: n, max };
  }
  return { ok: true, violations: n, max };
}

// A student can ask to move their exam ONCE FOR EACH ATTEMPT (1st try, 2nd try, ...). Needs database file 14.
export async function requestReschedule({ reason, preferred }) {
  const s = await student();
  if (s.error) return s;
  const text = String(reason || '').trim();
  if (text.split(/\s+/).filter(Boolean).length < 3 || text.length > 500) return { error: 'Please explain your reason in at least 3 words (up to 500 characters).' };
  const pref = preferred ? watToIso(preferred) : null;
  if (preferred && !pref) return { error: 'Invalid date.' };
  if (pref && Date.parse(pref) <= Date.now()) return { error: 'Pick a day in the future.' };
  const db = createAdminClient();
  const ctx = await loadExamContext(db, s.user.id);
  if (!ctx?.schedule) return { error: 'No exam is scheduled for you yet.' };
  if (ctx.state.state === 'passed') return { error: 'You have already passed.' };
  if (ctx.state.state === 'in_progress') return { error: 'You cannot ask to move an exam that is running.' };
  if (ctx.nextNo === 1 && Date.parse(ctx.schedule.startsAt) <= Date.now()) return { error: 'The exam date has already arrived.' };
  if (ctx.request) return { error: `You have already used your reschedule request for attempt ${ctx.nextNo}.` };
  const { data: made, error } = await db.from('exam_reschedule_requests').insert({ user_id: s.user.id, batch_id: ctx.batchId, attempt_no: ctx.nextNo, preferred_at: pref, reason: text }).select('id').single();
  if (error) {
    if (error.code === '23505') return { error: `You have already used your reschedule request for attempt ${ctx.nextNo}.` };
    if (/attempt_no/.test(error.message || '')) return { error: 'The school still has to finish a database update (file 14) before this works. Please tell them.' };
    return fail(error);
  }
  const { data: p } = await db.from('profiles').select('full_name, email').eq('id', s.user.id).maybeSingle();
  const who = p?.full_name || p?.email || 'A student';
  await announce(db, {
    to: await adminIds(db), senderId: s.user.id, personal: true, href: '/admin/exams', ref: `exam-resched:${made.id}`,
    text: `${who} asked to reschedule exam attempt ${ctx.nextNo}. Reason: ${text}.${pref ? ' Preferred: ' + fmtWat(pref) + ' (Lagos time).' : ''} Open the Exams tab to approve or decline.`
  });
  refresh();
  return { ok: true };
}

// ---------------- admin ----------------
export async function saveExamSchedule(batchId, { startsAt, activateAt, activated, passPercent, note, durationMinutes, counts, moveOwn, retakeFee }) {
  const a = await admin();
  if (a.error) return a;
  if (typeof batchId !== 'string' || !UUID_RE.test(batchId)) return { error: 'Unknown batch.' };
  const starts = watToIso(startsAt);
  if (!starts) return { error: 'Enter the exam date and time.' };
  const auto = activateAt ? watToIso(activateAt) : null;
  if (activateAt && !auto) return { error: 'Invalid activation time.' };
  const pass = Number(passPercent);
  if (!Number.isInteger(pass) || pass < 1 || pass > 100) return { error: 'The pass mark must be a whole number from 1 to 100.' };
  const db = createAdminClient();
  const { data: batch } = await db.from('batches').select('course').eq('id', batchId).maybeSingle();
  if (!batch || !hasExam(batch.course)) return { error: 'This course has no exam.' };

  // Exam length and questions per section (changes only affect attempts that start afterwards).
  const minutes = Number(durationMinutes);
  if (!Number.isInteger(minutes) || minutes < 10 || minutes > 360) return { error: 'The exam time must be a whole number of minutes from 10 to 360.' };
  const sectionCounts = {};
  let totalQ = 0;
  for (const s of EXAMS[batch.course].sections) {
    const n = Number(counts?.[s.key]);
    const max = (BANK[s.key] || []).length;
    if (!Number.isInteger(n) || n < 0) return { error: `${s.label}: enter a whole number of questions (0 or more).` };
    if (n > max) return { error: `${s.label}: the question bank only has ${max} questions.` };
    sectionCounts[s.key] = n; totalQ += n;
  }
  if (totalQ < 1) return { error: 'The exam needs at least one question.' };
  const { data: before } = await db.from('exam_schedules').select('starts_at, activated').eq('batch_id', batchId).is('user_id', null).maybeSingle();
  const row = { batch_id: batchId, user_id: null, starts_at: starts, activate_at: auto, activated: !!activated, pass_percent: pass, note: String(note || '').slice(0, 300) || null, updated_at: new Date().toISOString(), updated_by: a.user.id };
  const fee = Number(retakeFee);
  if (!Number.isInteger(fee) || fee < 100 || fee > 1000000) return { error: 'The retake fee must be a whole number of naira from 100 to 1,000,000.' };
  const full = { ...row, duration_minutes: minutes, section_counts: sectionCounts, retake_fee_naira: fee };
  const write = (r) => (before
    ? db.from('exam_schedules').update(r).eq('batch_id', batchId).is('user_id', null)
    : db.from('exam_schedules').insert(r));
  let { error } = await write(full);
  // Database file 13 not run yet: save the schedule anyway and say what was left out.
  let notice = '';
  if (error && /duration_minutes|section_counts|retake_fee_naira/.test(error.message || '')) {
    ({ error } = await write(row));
    notice = 'Saved, but the exam length and question numbers need database files 13 and 16 to be run first.';
  }
  if (error) return fail(error);

  if (!before) await gBatch(db, batchId, { title: 'Your exam has been scheduled', body: fmtWat(starts) + ' (Lagos time)', href: '/dashboard/timetable', kind: 'update' });
  else if (Date.parse(before.starts_at) !== Date.parse(starts)) await gBatch(db, batchId, { title: 'Your exam date has changed', body: 'New date: ' + fmtWat(starts) + ' (Lagos time)', href: '/dashboard/timetable', kind: 'update' });
  // Students with their own date keep it unless the admin ticked "move them too".
  if (moveOwn && before && Date.parse(before.starts_at) !== Date.parse(starts)) {
    const { data: own } = await db.from('exam_schedules').select('id, user_id').eq('batch_id', batchId).not('user_id', 'is', null);
    if (own?.length) {
      await db.from('exam_schedules').update({ starts_at: starts, updated_at: new Date().toISOString(), updated_by: a.user.id }).eq('batch_id', batchId).not('user_id', 'is', null);
      await gUsers(db, own.map((o) => o.user_id), { title: 'Your exam date has changed', body: 'New date: ' + fmtWat(starts) + ' (Lagos time)', href: '/dashboard/timetable', kind: 'update' });
    }
  }
  const { data: now } = await db.from('exam_schedules').select('id').eq('batch_id', batchId).is('user_id', null).maybeSingle();
  if (now?.id && activated && !before?.activated) {
    // Must-read pop-up for every student in the batch + a line in their Announcements.
    await gAnnounce(db, { to: await batchStudentIds(db, batchId), batchId, senderId: a.user.id, text: openText(starts), ref: openRef(now.id) });
  }
  if (before?.activated && !activated) {
    if (now?.id) await db.from('notifications').delete().eq('ref', openRef(now.id)); // lets a later re-open alert again
    await gBatch(db, batchId, { title: 'The exam has been paused', body: 'The school will tell you when it opens again.', href: '/dashboard/timetable', kind: 'update' });
  }
  refresh();
  return notice ? { ok: true, notice } : { ok: true };
}

// One student's own exam date (overrides the batch date). startsAt empty = back to the batch date.
export async function setStudentExamDate(batchId, userId, startsAt) {
  const a = await admin();
  if (a.error) return a;
  if (![batchId, userId].every((x) => typeof x === 'string' && UUID_RE.test(x))) return { error: 'Unknown student.' };
  const db = createAdminClient();
  if (!startsAt) {
    const { error } = await db.from('exam_schedules').delete().eq('batch_id', batchId).eq('user_id', userId);
    if (error) return fail(error);
    await gUsers(db, [userId], { title: 'Your exam date is back to the batch date', href: '/dashboard/timetable', kind: 'update' });
  } else {
    const iso = watToIso(startsAt);
    if (!iso) return { error: 'Invalid date.' };
    const { data: ex } = await db.from('exam_schedules').select('id').eq('batch_id', batchId).eq('user_id', userId).maybeSingle();
    const row = { batch_id: batchId, user_id: userId, starts_at: iso, updated_at: new Date().toISOString(), updated_by: a.user.id };
    const { error } = ex ? await db.from('exam_schedules').update(row).eq('id', ex.id) : await db.from('exam_schedules').insert(row);
    if (error) return fail(error);
    await gUsers(db, [userId], { title: 'Your exam date has changed', body: 'New date: ' + fmtWat(iso) + ' (Lagos time)', href: '/dashboard/timetable', kind: 'update' });
  }
  refresh();
  return { ok: true };
}

// Admin: delete chosen camera pictures / voice clips.
export async function deleteProofItems(ids) {
  const a = await admin();
  if (a.error) return a;
  const list = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === 'string' && UUID_RE.test(x)).slice(0, 500);
  if (!list.length) return { error: 'Nothing selected.' };
  const db = createAdminClient();
  const { data } = await db.from('exam_proctor_media').select('id, path').in('id', list);
  const n = await removeProof(db, data || []);
  return { ok: true, deleted: n };
}

// Admin: how long captures are kept.
export async function setProofRetention({ passDays, maxDays }) {
  const a = await admin();
  if (a.error) return a;
  const v = cleanRetention({ passDays, maxDays });
  if (String(v.passDays) !== String(Number(passDays)) || String(v.maxDays) !== String(Number(maxDays))) return { error: 'Use whole days: 0 to 365 after passing, and 1 to 365 in total.' };
  const db = createAdminClient();
  const { error } = await db.from('site_settings').upsert({ key: 'proof_retention', value: v, updated_at: new Date().toISOString() });
  if (error) return { error: 'Could not save. Has database file 18 been run?' };
  revalidatePath('/admin/exams');
  return { ok: true };
}

// Change the batch's exam date from the timetable. Creates the (still closed) exam entry if none exists yet.
export async function setBatchExamDate(batchId, startsAt) {
  const a = await admin();
  if (a.error) return a;
  if (typeof batchId !== 'string' || !UUID_RE.test(batchId)) return { error: 'Unknown batch.' };
  const iso = watToIso(startsAt);
  if (!iso) return { error: 'Choose a valid date and time.' };
  const db = createAdminClient();
  const { data: b } = await db.from('batches').select('course').eq('id', batchId).maybeSingle();
  if (!b || !hasExam(b.course)) return { error: 'This batch has no exam.' };
  const { data: ex } = await db.from('exam_schedules').select('id, starts_at, activated').eq('batch_id', batchId).is('user_id', null).maybeSingle();
  const { error } = ex
    ? await db.from('exam_schedules').update({ starts_at: iso, updated_at: new Date().toISOString(), updated_by: a.user.id }).eq('id', ex.id)
    : await db.from('exam_schedules').insert({ batch_id: batchId, starts_at: iso, activated: false, updated_by: a.user.id });
  if (error) return fail(error);
  if (!ex || Date.parse(ex.starts_at) !== Date.parse(iso)) await gBatch(db, batchId, { title: 'The exam date has been set', body: 'New date: ' + fmtWat(iso) + ' (Lagos time)', href: '/dashboard/timetable', kind: 'update' });
  refresh();
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

// Set the exam for ONE student: their own date/time (default 6:00 PM) and switch it on or off for them.
export async function setStudentExam(batchId, userId, { startsAt, activated }) {
  const a = await admin();
  if (a.error) return a;
  if (![batchId, userId].every((x) => typeof x === 'string' && UUID_RE.test(x))) return { error: 'Unknown student.' };
  const db = createAdminClient();
  const { data: reg } = await db.from('registrations').select('course').eq('batch_id', batchId).eq('user_id', userId).eq('status', 'paid').limit(1).maybeSingle();
  if (!reg || !hasExam(reg.course)) return { error: 'This student has no exam in this batch.' };
  const { data: ex } = await db.from('exam_schedules').select('id, starts_at, activated').eq('batch_id', batchId).eq('user_id', userId).maybeSingle();
  let iso = startsAt ? watToIso(startsAt) : null;
  if (startsAt && !iso) return { error: 'Invalid date.' };
  if (!iso) {
    if (ex?.starts_at) iso = ex.starts_at;
    else {
      const { data: b } = await db.from('exam_schedules').select('starts_at').eq('batch_id', batchId).is('user_id', null).maybeSingle();
      iso = b?.starts_at || defaultExamStart(EXAM_RULES.defaultExamHourWAT);
    }
  }
  const row = { batch_id: batchId, user_id: userId, starts_at: iso, activated: !!activated, updated_at: new Date().toISOString(), updated_by: a.user.id };
  const { data: saved, error } = ex
    ? await db.from('exam_schedules').update(row).eq('id', ex.id).select('id').single()
    : await db.from('exam_schedules').insert(row).select('id').single();
  if (error) return fail(error);
  if (activated && !ex?.activated) {
    await gAnnounce(db, { to: [userId], batchId, senderId: a.user.id, personal: true, text: openText(iso), ref: openRef(saved.id) });
  } else if (!activated && ex?.activated) {
    await db.from('notifications').delete().eq('ref', openRef(saved.id));
    await gUsers(db, [userId], { title: 'Your exam has been paused', body: 'The school will tell you when it opens again.', href: '/dashboard/timetable', kind: 'update' });
  } else if (!ex || Date.parse(ex.starts_at) !== Date.parse(iso)) {
    await gUsers(db, [userId], { title: 'Your exam date has changed', body: 'New date: ' + fmtWat(iso) + ' (Lagos time)', href: '/dashboard/timetable', kind: 'update' });
  }
  refresh();
  return { ok: true };
}

// Facts for the admin's Approve / Decline pop-up.
export async function getRescheduleInfo(requestId) {
  const a = await admin();
  if (a.error) return a;
  if (typeof requestId !== 'string' || !UUID_RE.test(requestId)) return { error: 'Invalid request.' };
  const db = createAdminClient();
  const { data: r } = await db.from('exam_reschedule_requests').select('*').eq('id', requestId).maybeSingle();
  if (!r) return { error: 'This request no longer exists.' };
  const { data: p } = await db.from('profiles').select('full_name, email').eq('id', r.user_id).maybeSingle();
  return { ok: true, status: r.status, name: p?.full_name || p?.email || 'A student', reason: r.reason, attemptNo: r.attempt_no || 1, preferred: r.preferred_at || null };
}

export async function decideReschedule(requestId, decision, { newStartsAt, note } = {}) {
  const a = await admin();
  if (a.error) return a;
  if (typeof requestId !== 'string' || !UUID_RE.test(requestId) || !['approve', 'decline'].includes(decision)) return { error: 'Invalid request.' };
  const db = createAdminClient();
  const { data: r } = await db.from('exam_reschedule_requests').select('*').eq('id', requestId).maybeSingle();
  if (!r || r.status !== 'pending') return { error: 'This request was already decided.' };
  let when = null;
  if (decision === 'approve') {
    when = newStartsAt ? watToIso(newStartsAt) : r.preferred_at;
    if (!when) return { error: 'Choose the new exam date and time.' };
    const { data: ex } = await db.from('exam_schedules').select('id').eq('batch_id', r.batch_id).eq('user_id', r.user_id).maybeSingle();
    const row = { batch_id: r.batch_id, user_id: r.user_id, starts_at: when, updated_at: new Date().toISOString(), updated_by: a.user.id };
    const { error: se } = ex ? await db.from('exam_schedules').update(row).eq('id', ex.id) : await db.from('exam_schedules').insert(row);
    if (se) return fail(se);
  }
  const { error } = await db.from('exam_reschedule_requests').update({ status: decision === 'approve' ? 'approved' : 'declined', admin_note: String(note || '').slice(0, 300) || null, decided_at: new Date().toISOString(), decided_by: a.user.id }).eq('id', requestId);
  if (error) return fail(error);
  await gAnnounce(db, {
    to: [r.user_id], batchId: r.batch_id, senderId: a.user.id, personal: true,
    text: decision === 'approve'
      ? `Your exam reschedule request was approved. Your new exam time is ${fmtWat(when)} (Lagos time).${note ? ' ' + String(note).slice(0, 200) : ''}`
      : `Your exam reschedule request was declined. ${String(note || 'The exam time stays the same.').slice(0, 200)}`
  });
  refresh();
  return { ok: true };
}

// The attempt no longer counts: the student may take it again (no 2-day wait, no fee).
export async function dismissAttempt(attemptId, reason) {
  const a = await admin();
  if (a.error) return a;
  if (typeof attemptId !== 'string' || !UUID_RE.test(attemptId)) return { error: 'Unknown attempt.' };
  const why = String(reason || '').trim();
  if (why.length < 3 || why.length > 300) return { error: 'Give a short reason (3 to 300 characters).' };
  const db = createAdminClient();
  const { data: at } = await db.from('exam_attempts').select('id, user_id, status, course, passed, started_at').eq('id', attemptId).maybeSingle();
  if (!at || at.status === 'dismissed') return { error: 'Unknown or already invalidated.' };
  if (at.status === 'in_progress') return { error: 'This attempt is still running. Wait until it ends, then invalidate it.' };
  const { error } = await db.from('exam_attempts').update({ status: 'dismissed', dismissed_by: a.user.id, dismissed_reason: why, dismissed_at: new Date().toISOString() }).eq('id', attemptId);
  if (error) return fail(error);
  // An invalid result undoes everything that came from it. If no other valid pass is left, the certificate the
  // exam issued automatically is withdrawn too (a certificate the director awarded by hand is left alone).
  let certGone = false;
  const { data: stillPassed } = await db.from('exam_attempts').select('id').eq('user_id', at.user_id).eq('course', at.course).eq('status', 'submitted').eq('passed', true).limit(1);
  if (!stillPassed?.length) {
    const { data: gone } = await db.from('certificates').delete().eq('user_id', at.user_id).eq('course', at.course).is('awarded_by', null).select('id');
    certGone = !!gone?.length;
    if (certGone) {
      await db.from('notifications').delete().eq('user_id', at.user_id).eq('kind', 'certificate'); // the old "certificate is ready" alert no longer applies
      revalidatePath('/admin/certificates'); revalidatePath('/dashboard/certificate');
    }
  }
  const nth = ((await db.from('exam_attempts').select('id').eq('user_id', at.user_id).eq('course', at.course).lte('started_at', at.started_at)).data || []).length;
  await gAnnounce(db, {
    to: [at.user_id], senderId: a.user.id, personal: true,
    text: `Your result for exam attempt ${nth} has been invalidated by the school. Reason: ${why}. That result no longer counts${certGone ? ', and the certificate that came from it has been withdrawn' : ''}, but it still uses one of your free attempts. You must write the exam again; if you have no free attempts left, the retake fee applies.`
  });
  refresh();
  return { ok: true, certificateWithdrawn: certGone };
}

export async function setTeacherExamView(batchId, allowed) {
  const a = await admin();
  if (a.error) return a;
  if (typeof batchId !== 'string' || !UUID_RE.test(batchId)) return { error: 'Unknown batch.' };
  const { error } = await createAdminClient().from('batches').update({ teacher_can_view_exams: !!allowed }).eq('id', batchId);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}
