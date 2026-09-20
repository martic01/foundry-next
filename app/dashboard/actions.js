'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';

// Routed through the set_installation_status() Postgres function (see
// supabase/schema.sql) rather than a plain .update() on profiles -- that
// function is scoped to exactly these two columns for auth.uid()'s own
// row, regardless of the profiles table's own RLS policy.
export async function setInstallationStatus(vscodeInstalled, gitInstalled) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_installation_status', {
    p_vscode: vscodeInstalled,
    p_git: gitInstalled
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
