// Account resolution for students the ADMIN enrolls by email, and the
// "claim" step that connects such an account to the student's own Google
// sign-in later. Server-only (takes the service-role client); kept free
// of Next imports so it can be unit-tested with a fake client.
//
// The problem this solves: an admin enrols jane@gmail.com BEFORE Jane has
// ever signed in, so an account is created for her. When she later signs
// in with Google, Supabase is NOT guaranteed to attach that sign-in to
// the account the admin made -- it can create a second, separate user.
// Then the registration sits on the account Jane never uses, and the one
// she does use looks empty. Hence:
//   * resolveStudentAccount  -- find-or-create by email, case-insensitively,
//     and repair half-made accounts, instead of failing with "already
//     registered".
//   * absorbShellAccounts    -- move registrations from an "admin-made,
//     never signed in" account onto the account that really signs in.

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

// ILIKE treats % and _ as wildcards, and _ is common in real addresses
// (john_doe@...). Escaped, so "john_doe" can't match "johnXdoe".
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

export async function findProfilesByEmail(admin, email) {
  const { data } = await admin
    .from('profiles')
    .select('id, role, full_name, email, created_at')
    .ilike('email', escapeLike(normalizeEmail(email)));
  return data || [];
}

// An auth user can exist with no profile row (e.g. an earlier attempt
// died between the two steps). The Admin API can't look up by email, so
// page through -- bounded, and this only runs on that rare repair path.
async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const users = data?.users || [];
    const hit = users.find((u) => normalizeEmail(u.email) === email);
    if (hit) return hit;
    if (users.length < 1000) return null;
  }
  return null;
}

const alreadyExists = (err) =>
  err?.code === 'email_exists' || err?.status === 422 || /already|exists|registered/i.test(err?.message || '');

// Returns { userId, fullName, created } or { error }.
//   created: true  -> a brand-new account was made
//   created: false -> an existing account (signed-in student, or a
//                     half-made one that has now been repaired)
export async function resolveStudentAccount(admin, { email, fullName }) {
  const address = normalizeEmail(email);

  // 1. A profile already exists for this email (any capitalisation).
  const profiles = await findProfilesByEmail(admin, address);
  if (profiles.length) {
    if (profiles.some((p) => p.role === 'admin')) {
      return { error: 'That email belongs to an admin account, not a student.' };
    }
    if (profiles.some((p) => p.role === 'teacher')) {
      return { error: 'That email belongs to a teacher account. A teacher can\u2019t also be a student.' };
    }
    let chosen = profiles[0];
    if (profiles.length > 1) {
      // Leftover duplicates: prefer the one the student actually signs
      // in with; otherwise the oldest.
      const signedIn = [];
      for (const p of profiles) {
        const { data } = await admin.auth.admin.getUserById(p.id);
        if (data?.user?.last_sign_in_at) signedIn.push(p);
      }
      const pool = signedIn.length ? signedIn : profiles;
      chosen = [...pool].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
    }
    return { userId: chosen.id, fullName: chosen.full_name, created: false };
  }

  // 2. No profile: create the account.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: address,
    email_confirm: true
  });

  let userId = created?.user?.id;
  let wasCreated = true;

  if (createError) {
    if (!alreadyExists(createError)) return { error: createError.message };
    // 3. The auth account exists but has no profile -- repair it rather
    //    than failing with "already registered".
    const existing = await findAuthUserByEmail(admin, address);
    if (!existing) return { error: createError.message };
    userId = existing.id;
    wasCreated = false;
  }

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: userId, full_name: fullName, email: address });
  if (profileError) return { error: profileError.message };

  return { userId, fullName, created: wasCreated };
}

// Moves registrations from other accounts with the same email onto
// `keep`, then deletes those emptied accounts. Only ever touches an
// account that is a student AND has never signed in -- i.e. one an admin
// created -- so two real, signed-in accounts are never merged. If moving
// the registrations fails, the old account is left alone.
export async function absorbShellAccounts(admin, keep) {
  const address = normalizeEmail(keep.email);
  if (!address) return 0;

  const others = (await findProfilesByEmail(admin, address)).filter((p) => p.id !== keep.id && p.role === 'student');
  let merged = 0;

  for (const other of others) {
    const { data } = await admin.auth.admin.getUserById(other.id);
    if (data?.user?.last_sign_in_at) continue; // a real account -- leave it

    const { error } = await admin.from('registrations').update({ user_id: keep.id }).eq('user_id', other.id);
    if (error) continue;

    await admin.auth.admin.deleteUser(other.id); // cascades the empty profile
    merged += 1;
  }
  return merged;
}

// ---------- Teachers ----------

// Registers (or finds) a teacher account by email. Returns
// { userId, fullName, created } or { error }.
//   * admin email                      -> refused
//   * already a teacher                -> returned as-is (idempotent)
//   * an existing student -> switched to teacher on the SAME account.
//     The role changes entirely: they only get the teacher portal. Any
//     paid enrolments are taken off their batches (status 'removed',
//     payment records kept) so they stop holding seats. If they have
//     enrolments the caller must pass confirmDropEnrolments: true;
//     otherwise { needsConfirm, enrolments, name } comes back first.
//   * no account yet                   -> one is created; their first
//     Google sign-in with this email claims it (see claimTeacherShells)
export async function resolveTeacherAccount(admin, { email, fullName, confirmDropEnrolments = false }) {
  const address = normalizeEmail(email);
  const profiles = await findProfilesByEmail(admin, address);

  if (profiles.some((p) => p.role === 'admin')) return { error: 'That email belongs to an admin account.' };

  const teacher = profiles.find((p) => p.role === 'teacher');
  if (teacher) return { userId: teacher.id, fullName: teacher.full_name, created: false };

  if (profiles.length) {
    const student = profiles[0];
    const { count } = await admin
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', student.id)
      .eq('status', 'paid');
    if (count && !confirmDropEnrolments) {
      return { needsConfirm: true, enrolments: count, name: student.full_name };
    }
    if (count) {
      const { error: dropError } = await admin
        .from('registrations')
        .update({ status: 'removed', batch_id: null })
        .eq('user_id', student.id)
        .eq('status', 'paid');
      if (dropError) return { error: dropError.message };
    }
    const { error } = await admin.from('profiles').update({ role: 'teacher' }).eq('id', student.id);
    if (error) return { error: error.message };
    return { userId: student.id, fullName: student.full_name, created: false, droppedEnrolments: count || 0 };
  }

  const made = await resolveStudentAccount(admin, { email: address, fullName });
  if (made.error) return made;
  const { error } = await admin.from('profiles').update({ role: 'teacher' }).eq('id', made.userId);
  if (error) return { error: error.message };
  return made;
}

// Same idea as absorbShellAccounts, for teachers: an admin registered
// this email as a teacher BEFORE the person first signed in, and Supabase
// may have given their Google sign-in a separate account. Moves the
// teaching assignments (and the role) onto the real account and deletes
// the empty one. Only touches a teacher account that has never signed in.
// Caller must have verified the email (the role is a privilege).
export async function claimTeacherShells(admin, keep) {
  const address = normalizeEmail(keep.email);
  if (!address) return 0;

  const shells = (await findProfilesByEmail(admin, address)).filter((p) => p.id !== keep.id && p.role === 'teacher');
  let claimed = 0;

  for (const shell of shells) {
    const { data } = await admin.auth.admin.getUserById(shell.id);
    if (data?.user?.last_sign_in_at) continue; // a real account -- leave it

    const { data: mine } = await admin.from('profiles').select('role').eq('id', keep.id).maybeSingle();
    if (mine?.role === 'admin') continue; // never downgrade an admin

    const { data: rows } = await admin.from('batch_teachers').select('batch_id').eq('teacher_id', shell.id);
    if (rows?.length) {
      const { error } = await admin
        .from('batch_teachers')
        .upsert(rows.map((r) => ({ batch_id: r.batch_id, teacher_id: keep.id })), { onConflict: 'batch_id,teacher_id' });
      if (error) continue;
    }
    if (mine?.role === 'student') {
      const { error } = await admin.from('profiles').update({ role: 'teacher' }).eq('id', keep.id);
      if (error) continue;
    }
    await admin.auth.admin.deleteUser(shell.id); // cascades profile + its assignments
    claimed += 1;
  }
  return claimed;
}
