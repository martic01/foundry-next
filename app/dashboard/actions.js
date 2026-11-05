'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';
import { isValidToolId } from '../../lib/installs';
import { isAdminAdded } from '../../lib/payments';

// One tool (or "I've joined the WhatsApp group") ticked or unticked for the
// signed-in student. Goes through set_tool_installed() so only that person's
// `installs` can change. Falls back to the old two-checkbox function for VS
// Code and Git if supabase/6-names-and-installs.sql has not been run yet.
export async function setToolInstalled(toolId, done) {
  if (typeof toolId !== 'string' || !isValidToolId(toolId)) return { error: 'Unknown tool.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in.' };
  const { error } = await supabase.rpc('set_tool_installed', { p_tool: toolId, p_done: !!done });
  if (error) {
    if ((toolId === 'vscode' || toolId === 'git')) {
      const { data: p } = await supabase.from('profiles').select('vscode_installed, git_installed').eq('id', user.id).maybeSingle();
      const legacy = await supabase.rpc('set_installation_status', {
        p_vscode: toolId === 'vscode' ? !!done : !!p?.vscode_installed,
        p_git: toolId === 'git' ? !!done : !!p?.git_installed
      });
      if (!legacy.error) { revalidatePath('/dashboard', 'layout'); return { ok: true }; }
    }
    return { error: 'Could not save that. Please try again.' };
  }
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

// The student clicks "I accept terms and policy". Only their own row changes.
export async function acceptTerms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in.' };
  const { error } = await supabase.rpc('accept_terms');
  if (error) return { error: 'Could not save that. Please try again.' };
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

// "Delete account (I don't agree)". Allowed ONLY for a student the admin added by
// hand who has not accepted yet, so it can never be used to wipe an account that is
// already in use, and never an admin or teacher.
export async function declineTermsDeleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in.' };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, terms_accepted_at').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'student') return { error: 'This account can\u2019t be deleted here.' };
  if (profile.terms_accepted_at) return { error: 'You already accepted the terms. Contact the school to close your account.' };
  const { data: regs } = await admin.from('registrations').select('paystack_reference').eq('user_id', user.id);
  if (!regs?.length || !regs.every(isAdminAdded)) return { error: 'This account can\u2019t be deleted here. Contact the school.' };
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: 'Could not delete the account. Please try again.' };
  await supabase.auth.signOut().catch(() => {});
  return { ok: true };
}
