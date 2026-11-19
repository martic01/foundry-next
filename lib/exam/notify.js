// Alerts for students, sent when the admin (or the system) does something that concerns them.
// Best-effort: a failed alert must never undo the action itself. Pass the service-role client.
export async function notifyUsers(db, userIds, { title, body = null, href = '/dashboard/exam', kind = 'exam' }) {
  try {
    const ids = [...new Set((userIds || []).filter(Boolean))];
    if (!ids.length) return 0;
    const rows = ids.map((user_id) => ({ user_id, kind, title, body, href }));
    for (let i = 0; i < rows.length; i += 500) await db.from('notifications').insert(rows.slice(i, i + 500));
    return ids.length;
  } catch { return 0; }
}

export async function batchStudentIds(db, batchId) {
  const { data } = await db.from('registrations').select('user_id').eq('batch_id', batchId).eq('status', 'paid');
  return [...new Set((data || []).map((r) => r.user_id))];
}

export async function notifyBatch(db, batchId, payload) {
  return notifyUsers(db, await batchStudentIds(db, batchId), payload);
}

export async function adminIds(db) {
  const { data } = await db.from('profiles').select('id').eq('role', 'admin');
  return (data || []).map((r) => r.id);
}

// A pop-up the person must tap "I'm ready" on (the existing announcement pop-up) AND a line in their
// Announcements page. `to` = list of user ids. With `personal` the message is addressed to that single
// person only (needs database file 14); without it the message is the batch's. Best-effort, never throws.
export async function announce(db, { to, batchId = null, senderId, text, href = '/dashboard/exam', personal = false, ref = null }) {
  try {
    const ids = [...new Set((to || []).filter(Boolean))];
    if (!ids.length || !text) return 0;
    const content = String(text).slice(0, 4000);
    if (!senderId) senderId = (await adminIds(db))[0] || null; // messages need a sender: the school's first admin
    if (!senderId) return 0;
    const mk = async (extra) => {
      const { data, error } = await db.from('messages').insert({ batch_id: batchId, sender_id: senderId, content, ...extra }).select('id').single();
      return error ? null : data?.id || null;
    };
    const rows = [];
    if (personal) {
      for (const id of ids) {
        const messageId = await mk({ target_user_id: id });
        rows.push({ user_id: id, kind: 'announcement', title: 'New announcement', body: content, href, message_id: messageId, ...(ref ? { ref } : {}) });
      }
    } else {
      const messageId = await mk({});
      ids.forEach((id) => rows.push({ user_id: id, kind: 'announcement', title: 'New announcement', body: content, href, message_id: messageId, ...(ref ? { ref } : {}) }));
    }
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      let { error } = await db.from('notifications').insert(chunk);
      if (error && ref) ({ error } = await db.from('notifications').insert(chunk.map(({ ref: _r, ...r }) => r))); // file 14 not run yet
      if (error) console.error('[exam] announce', error.code, error.message);
    }
    return rows.length;
  } catch (e) { console.error('[exam] announce', e?.message); return 0; }
}

// ---- Manual / automatic sending for things the ADMIN changes ----
// site_settings.notify_mode = 'auto' (default): students are told straight away.
// 'manual': the notification waits in pending_notifications and the admin presses Send.
export async function notifyMode(db) {
  try {
    const { data } = await db.from('site_settings').select('value').eq('key', 'notify_mode').maybeSingle();
    return data?.value === 'manual' ? 'manual' : 'auto';
  } catch { return 'auto'; }
}

async function queue(db, label, kind, recipients, payload) {
  const { error } = await db.from('pending_notifications').insert({ label: String(label).slice(0, 160), kind, recipients, payload });
  if (error) { console.error('[notify] queue', error.code, error.message); return false; }
  return true;
}

export async function gUsers(db, userIds, payload) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return 0;
  if ((await notifyMode(db)) === 'manual' && (await queue(db, payload.title, 'users', ids.length, { ids, ...payload }))) return 0;
  return notifyUsers(db, ids, payload);
}
export async function gBatch(db, batchId, payload) {
  return gUsers(db, await batchStudentIds(db, batchId), payload);
}
export async function gAnnounce(db, args) {
  const ids = [...new Set((args.to || []).filter(Boolean))];
  if (!ids.length) return 0;
  if ((await notifyMode(db)) === 'manual' && (await queue(db, args.text, 'announce', ids.length, { ...args, to: ids }))) return 0;
  return announce(db, args);
}
// Sends one waiting notification (admin pressed Send). Returns true when it went out.
export async function sendPending(db, row) {
  const p = row.payload || {};
  if (row.kind === 'users') { const { ids, ...rest } = p; await notifyUsers(db, ids, rest); return true; }
  if (row.kind === 'announce') { await announce(db, p); return true; }
  return false;
}
