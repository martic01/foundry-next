import { summarize, effectiveSchedule } from './rules';

// Records for the admin and teacher exam pages. Uses the service-role client AFTER the caller has been authorised.
// Question text and answers are never loaded here.
export async function loadBatchExamData(db, batchIds) {
  if (!batchIds.length) return { schedules: [], students: [], attempts: [], requests: [] };
  const [{ data: schedules }, { data: regs }, { data: attempts }, { data: requests }] = await Promise.all([
    db.from('exam_schedules').select('*').in('batch_id', batchIds),
    db.from('registrations').select('batch_id, user_id, course, blocked, profiles(full_name, email)').in('batch_id', batchIds).eq('status', 'paid'),
    db.from('exam_attempts').select('id, user_id, batch_id, course, status, started_at, expires_at, submitted_at, auto_submitted, score, total, percent, passed, sections, dismissed_reason, paid_ref, created_at').in('batch_id', batchIds).order('created_at'),
    db.from('exam_reschedule_requests').select('*').in('batch_id', batchIds)
  ]);
  // Full-screen violations (column exists after database file 15; ignored until then).
  const { data: vio } = await db.from('exam_attempts').select('id, violations').in('batch_id', batchIds).gt('violations', 0);
  const vmap = Object.fromEntries((vio || []).map((v) => [v.id, v.violations]));
  (attempts || []).forEach((a) => { if (vmap[a.id]) a.violations = vmap[a.id]; });
  const byUser = {};
  (attempts || []).forEach((a) => { (byUser[a.user_id] ||= []).push(a); });
  const students = (regs || []).map((r) => ({
    batchId: r.batch_id, userId: r.user_id, name: r.profiles?.full_name || r.profiles?.email || 'Student', email: r.profiles?.email || '',
    attempts: byUser[r.user_id] || [], summary: summarize(byUser[r.user_id] || []),
    ...(() => { const e = effectiveSchedule((schedules || []).filter((x) => x.batch_id === r.batch_id), r.user_id); return { examActive: !!e?.active, examAt: e?.startsAt || null, ownDate: !!e?.personal }; })()
  })).sort((a, b) => a.name.localeCompare(b.name));
  return { schedules: schedules || [], students, attempts: attempts || [], requests: requests || [] };
}
