'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase/server';
import { createAdminClient } from '../lib/supabase/admin';
import { notifyMode, sendPending } from '../lib/exam/notify';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function adminOnly() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return p?.role === 'admin' ? user : null;
}

export async function setNotifyMode(mode) {
  if (!(await adminOnly())) return { error: 'Not authorized.' };
  if (!['auto', 'manual'].includes(mode)) return { error: 'Invalid choice.' };
  const db = createAdminClient();
  const { error } = await db.from('site_settings').upsert({ key: 'notify_mode', value: mode, updated_at: new Date().toISOString() });
  if (error) { console.error('[notify]', error.code, error.message); return { error: 'Could not save. Has database file 15 been run?' }; }
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function sendPendingNotification(id) {
  if (!(await adminOnly())) return { error: 'Not authorized.' };
  if (typeof id !== 'string' || !UUID_RE.test(id)) return { error: 'Unknown notification.' };
  const db = createAdminClient();
  const { data: row } = await db.from('pending_notifications').select('*').eq('id', id).maybeSingle();
  if (!row) return { error: 'Already sent or removed.' };
  await sendPending(db, row);
  await db.from('pending_notifications').delete().eq('id', id);
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function sendAllPending() {
  if (!(await adminOnly())) return { error: 'Not authorized.' };
  const db = createAdminClient();
  const { data } = await db.from('pending_notifications').select('*').order('created_at');
  for (const row of data || []) { await sendPending(db, row); await db.from('pending_notifications').delete().eq('id', row.id); }
  revalidatePath('/admin', 'layout');
  return { ok: true, sent: (data || []).length };
}

export async function discardPendingNotification(id) {
  if (!(await adminOnly())) return { error: 'Not authorized.' };
  if (typeof id !== 'string' || !UUID_RE.test(id)) return { error: 'Unknown notification.' };
  await createAdminClient().from('pending_notifications').delete().eq('id', id);
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function currentNotifyMode() {
  return notifyMode(createAdminClient());
}
