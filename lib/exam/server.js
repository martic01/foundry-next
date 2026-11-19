import { randomInt } from 'node:crypto';
import { EXAM_RULES, hasExam, examTotal, passMarkFor, examSettings } from './config';
import { effectiveSchedule, examState, pickQuestions, gradeAttempt, summarize } from './rules';
import { BANK, BANK_BY_ID } from './bank';
import { notifyUsers, announce, notifyMode } from './notify';
import { issueCertificate } from '../certificate-issue';
import { fmtWat } from './time';

// SERVER ONLY exam logic that talks to the database (service-role client `db`).

const ATTEMPT_COLS = 'id, user_id, batch_id, course, status, started_at, expires_at, submitted_at, auto_submitted, questions, answers, score, total, percent, passed, sections, paid_ref, dismissed_reason, dismissed_by, created_at';

// Grades an attempt and stores the result. Only the first caller wins (status must still be in_progress).
export async function finishAttempt(db, attempt, answers, { auto = false, forced = false } = {}) {
  // A PAID attempt that ends in the first 10 minutes (network trouble, wrong click, forced out) does not
  // count: it is cancelled and the paid fee is given back as an unused token, so the student can start again.
  // (Not when the student was removed by the exam rules, e.g. the 3rd violation: that attempt stands.)
  if (!forced && attempt.paid_ref && Date.now() - Date.parse(attempt.started_at) < EXAM_RULES.minCountMinutes * 60000) {
    const { data: gone } = await db.from('exam_attempts').update({
      status: 'dismissed', dismissed_reason: `Ended in under ${EXAM_RULES.minCountMinutes} minutes, so it was not counted. Your payment is still valid.`, dismissed_at: new Date().toISOString(), answers
    }).eq('id', attempt.id).eq('status', 'in_progress').select('id').maybeSingle();
    if (!gone) return { already: true };
    await db.from('exam_payments').update({ status: 'paid', attempt_id: null }).eq('reference', attempt.paid_ref);
    await notifyUsers(db, [attempt.user_id], { title: 'Your exam did not count', body: `It ended in under ${EXAM_RULES.minCountMinutes} minutes. Your payment is still valid: open the Exam tab and start again, no new payment needed.`, href: '/dashboard/exam' });
    return { voided: true };
  }

  const { data: rows } = await db.from('exam_schedules').select('pass_percent').eq('batch_id', attempt.batch_id).is('user_id', null).limit(1);
  const passPercent = rows?.[0]?.pass_percent || EXAM_RULES.defaultPassPercent;
  const g = gradeAttempt(attempt.course, attempt.questions, answers, BANK_BY_ID, passPercent);
  const { data: done, error } = await db.from('exam_attempts').update({
    status: 'submitted', submitted_at: new Date().toISOString(), auto_submitted: auto, answers,
    score: g.score, total: g.total, percent: g.percent, passed: g.passed, sections: g.sections
  }).eq('id', attempt.id).eq('status', 'in_progress').select(ATTEMPT_COLS).maybeSingle();
  if (error || !done) return { already: true };

  if (g.passed) {
    const cert = await issueCertificate(db, { userId: attempt.user_id, course: attempt.course });
    await notifyUsers(db, [attempt.user_id], { title: `You passed the exam: ${g.percent}% (${g.label})`, body: 'Well done!', href: '/dashboard/exam' });
    if (cert.ok && !cert.already) {
      await notifyUsers(db, [attempt.user_id], { title: 'Your certificate is ready for download', body: 'Open the Certificate tab to download it.', href: '/dashboard/certificate', kind: 'certificate' });
    }
  } else {
    await notifyUsers(db, [attempt.user_id], { title: `Exam result: ${g.percent}%, not passed`, body: `You can try again after ${EXAM_RULES.gapHours} hours (about 2 days).`, href: '/dashboard/exam' });
  }
  return { attempt: done, grade: g };
}

// Any attempt whose time ran out is closed now, using the answers saved so far.
export async function settleExpired(db, attempts) {
  const now = Date.now();
  const out = [];
  for (const a of attempts) {
    if (a.status === 'in_progress' && Date.parse(a.expires_at) <= now) {
      const res = await finishAttempt(db, a, a.answers || {}, { auto: true });
      if (res.attempt) { out.push(res.attempt); continue; }
      const { data: fresh } = await db.from('exam_attempts').select(ATTEMPT_COLS).eq('id', a.id).maybeSingle();
      out.push(fresh || a);
    } else out.push(a);
  }
  return out;
}

// Everything the student's exam page needs for their exam course (null if they have none).
export async function loadExamContext(db, userId) {
  const { data: regs } = await db.from('registrations').select('course, batch_id, blocked').eq('user_id', userId).eq('status', 'paid');
  const reg = (regs || []).find((r) => hasExam(r.course) && r.batch_id && !r.blocked);
  if (!reg) return null;
  const [{ data: sched }, { data: att }, { data: tok }, { data: reqs }] = await Promise.all([
    db.from('exam_schedules').select('*').eq('batch_id', reg.batch_id),
    db.from('exam_attempts').select(ATTEMPT_COLS).eq('user_id', userId).eq('course', reg.course).order('created_at'),
    db.from('exam_payments').select('reference').eq('user_id', userId).eq('course', reg.course).eq('status', 'paid').is('attempt_id', null).limit(1),
    db.from('exam_reschedule_requests').select('*').eq('user_id', userId).eq('batch_id', reg.batch_id)
  ]);
  const attempts = await settleExpired(db, att || []);
  const schedule = effectiveSchedule(sched || [], userId);
  const paidToken = (tok || [])[0]?.reference || null;
  const st = examState({ schedule, attempts, paidToken: !!paidToken });
  const settings = examSettings(reg.course, schedule?.batchRow);
  // One reschedule request is allowed for EACH attempt: attempt number = finished attempts + 1.
  const nextNo = attempts.filter((a) => a.status === 'submitted' || (a.status === 'dismissed' && a.dismissed_by)).length + 1;
  const request = (reqs || []).find((r) => (r.attempt_no || 1) === nextNo) || null;
  return { course: reg.course, batchId: reg.batch_id, schedule, settings, attempts, paidToken, state: st, request, nextNo, summary: summarize(attempts) };
}

// Creates a new attempt (after checking the rules again on the server).
export async function startAttempt(db, userId) {
  const ctx = await loadExamContext(db, userId);
  if (!ctx) return { error: 'You have no exam to take.' };
  if (ctx.state.state !== 'ready') return { error: 'The exam is not available to start right now.' };
  let questions;
  try { questions = pickQuestions(ctx.course, BANK, (n) => randomInt(n), ctx.settings.counts); } catch (e) { console.error('[exam] pick', e.message); return { error: 'The question bank is not ready. Please tell the school.' }; }
  if (!questions.length) return { error: 'The exam has no questions set up. Please tell the school.' };
  const expires = new Date(Date.now() + ctx.settings.durationMinutes * 60000).toISOString();
  const { data, error } = await db.from('exam_attempts').insert({
    user_id: userId, batch_id: ctx.batchId, course: ctx.course, expires_at: expires, questions, paid_ref: ctx.state.free ? null : ctx.paidToken
  }).select('id').single();
  if (error) {
    if (error.code === '23505') return { error: 'An exam is already running on this account.' };
    console.error('[exam] start', error.code, error.message);
    return { error: 'Could not start the exam. Please try again.' };
  }
  if (!ctx.state.free && ctx.paidToken) await db.from('exam_payments').update({ status: 'used', attempt_id: data.id }).eq('reference', ctx.paidToken).eq('status', 'paid');
  return { ok: true, attemptId: data.id };
}

// What the browser may see: question text and options in the student's shuffled order. Never the answer.
export function clientQuestions(stored) {
  return stored.map((q) => {
    const real = BANK_BY_ID[q.id];
    return real ? { id: q.id, section: q.id.split('-')[0], q: real.q, options: q.o.map((i) => real.options[i]) } : null;
  }).filter(Boolean);
}

export function summaryLine(course, passPercent = EXAM_RULES.defaultPassPercent) {
  const total = examTotal(course);
  return { total, passMark: passMarkFor(total, passPercent), passPercent };
}

export { fmtWat };

// Cheap check for the sidebar: show the Exam tab only once the admin has switched the exam on
// (or the student already has exam history). Never throws.
export async function examTabVisible(db, userId, regs) {
  try {
    const reg = (regs || []).find((r) => hasExam(r.course) && r.batch_id && !r.blocked);
    if (!reg) return false;
    const [{ data: sched }, { count }] = await Promise.all([
      db.from('exam_schedules').select('id, user_id, activated, activate_at, starts_at, pass_percent').eq('batch_id', reg.batch_id),
      db.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('course', reg.course)
    ]);
    const eff = effectiveSchedule(sched || [], userId);
    if (eff?.active && eff.openRow?.id && !(count > 0)) await ensureOpenAlert(db, userId, reg.batch_id, eff);
    return !!eff?.active || (count || 0) > 0;
  } catch { return false; }
}

export const openRef = (rowId) => `exam-open:${rowId}`;
export function openText(startsAt) {
  return `Your exam is now open. It starts ${fmtWat(startsAt)} (Lagos time). Open the Exam tab, read the rules, and begin when you are ready.`;
}

// Exams that switch on by themselves (automatic activation time) have no admin click to send the
// pop-up, so the first time the student loads any page after that moment it is created here, once.
export async function ensureOpenAlert(db, userId, batchId, eff) {
  try {
    if ((await notifyMode(db)) === 'manual') return false; // the admin sends alerts by hand
    const ref = openRef(eff.openRow.id);
    const { data, error } = await db.from('notifications').select('id').eq('user_id', userId).eq('ref', ref).limit(1);
    if (error || (data && data.length)) return false; // file 14 missing, or already sent
    const personal = !!eff.openRow.user_id;
    await announce(db, { to: [userId], batchId, senderId: null, text: openText(eff.startsAt), personal, ref });
    return true;
  } catch { return false; }
}

// Profile-card summary: { [course]: summary } for the courses this student has taken an exam in.
export async function examSummaries(db, userId) {
  try {
    const { data } = await db.from('exam_attempts').select('course, status, passed, percent, score, total, sections, submitted_at').eq('user_id', userId).eq('status', 'submitted');
    const by = {};
    for (const a of data || []) (by[a.course] ||= []).push(a);
    return Object.fromEntries(Object.entries(by).map(([c, list]) => [c, summarize(list)]));
  } catch { return {}; }
}
