'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';
import { isValidToolId } from '../../lib/installs';

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
