// Camera snapshots and microphone clips taken while an exam is running. Server-only (service-role client).
export const PROOF_BUCKET = 'exam-proctor';
export const PROOF_KEEP_DAYS = 30;
export const PROOF_LIMITS = { photo: 200 * 1024, audio: 1.5 * 1024 * 1024 };

// Removes every stored file for a person (used when their account is deleted). Never throws.
export async function deleteProofForUser(db, userId) {
  try {
    const { data } = await db.from('exam_proctor_media').select('path').eq('user_id', userId);
    const paths = (data || []).map((r) => r.path);
    for (let i = 0; i < paths.length; i += 100) await db.storage.from(PROOF_BUCKET).remove(paths.slice(i, i + 100));
    return paths.length;
  } catch { return 0; }
}

export const DEFAULT_RETENTION = { passDays: 7, maxDays: 30 };
const clampInt = (v, lo, hi, d) => (Number.isInteger(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : d);
export const cleanRetention = (v) => ({ passDays: clampInt(v?.passDays, 0, 365, DEFAULT_RETENTION.passDays), maxDays: clampInt(v?.maxDays, 1, 365, DEFAULT_RETENTION.maxDays) });

export async function getRetention(db) {
  try {
    const { data } = await db.from('site_settings').select('value').eq('key', 'proof_retention').maybeSingle();
    return cleanRetention(data?.value);
  } catch { return { ...DEFAULT_RETENTION }; }
}

// Deletes the given media rows (files first, then rows). Returns how many.
export async function removeProof(db, rows) {
  if (!rows?.length) return 0;
  for (let i = 0; i < rows.length; i += 100) await db.storage.from(PROOF_BUCKET).remove(rows.slice(i, i + 100).map((r) => r.path));
  await db.from('exam_proctor_media').delete().in('id', rows.map((r) => r.id));
  return rows.length;
}

// Clean-up, using the admin's retention settings:
//  - every capture older than maxDays goes;
//  - captures of an attempt the student PASSED go passDays after they passed.
export async function purgeOldProof(db) {
  try {
    const { passDays, maxDays } = await getRetention(db);
    let n = 0;
    const old = await db.from('exam_proctor_media').select('id, path').lt('created_at', new Date(Date.now() - maxDays * 864e5).toISOString()).limit(500);
    n += await removeProof(db, old.data);
    const { data: passed } = await db.from('exam_attempts').select('id').eq('passed', true).lt('submitted_at', new Date(Date.now() - passDays * 864e5).toISOString()).limit(300);
    if (passed?.length) {
      const m = await db.from('exam_proctor_media').select('id, path').in('attempt_id', passed.map((a) => a.id)).limit(500);
      n += await removeProof(db, m.data);
    }
    return n;
  } catch { return 0; }
}
