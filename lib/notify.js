// Fan-out of per-student alerts. Called from admin Server Actions with
// the admin's own session (RLS: notifications_admin_insert). Best-effort:
// a failure here must never fail the upload/announcement itself.

// target: { batchId?: uuid|null, course?: string|null }
//   batchId set  -> students in that batch
//   course set   -> students in that course (any batch)
//   neither      -> every student with paid access
export async function notifyStudents(supabase, target, { kind, title, body = null, href = null, messageId = null }) {
  try {
    let q = supabase.from('registrations').select('user_id').eq('status', 'paid');
    if (target?.batchId) q = q.eq('batch_id', target.batchId);
    if (target?.course) q = q.eq('course', target.course);
    const { data } = await q;
    const ids = [...new Set((data || []).map((r) => r.user_id))];
    const rows = ids.map((user_id) => ({ user_id, kind, title, body, href, message_id: messageId }));
    for (let i = 0; i < rows.length; i += 500) {
      await supabase.from('notifications').insert(rows.slice(i, i + 500));
    }
    return { count: rows.length };
  } catch {
    return { count: 0 };
  }
}
