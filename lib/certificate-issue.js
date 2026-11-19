import { randomInt } from 'node:crypto';
import { certificateTitleFor, CODE_ALPHABET, CODE_LENGTH } from './certificates';

// Creates the certificate for a student who passed (service-role client). The certificate
// carries only the name, course and code, never exam marks. Safe to call twice.
export async function issueCertificate(db, { userId, course, awardedBy = null }) {
  const title = certificateTitleFor(course);
  if (!title) return { error: 'No certificate for this course.' };
  const { data: existing } = await db.from('certificates').select('code').eq('user_id', userId).eq('course', course).maybeSingle();
  if (existing) return { ok: true, code: existing.code, already: true };
  let prof = await db.from('profiles').select('full_name, certificate_name, email, role').eq('id', userId).maybeSingle();
  if (prof.error) prof = await db.from('profiles').select('full_name, email, role').eq('id', userId).maybeSingle();
  const p = prof.data;
  if (!p || p.role !== 'student') return { error: 'Not a student.' };
  const name = String(p.certificate_name || '').trim() || String(p.full_name || '').trim() || String(p.email || '').split('@')[0];
  if (!name || !p.email) return { error: 'No name or email on file.' };
  for (let i = 0; i < 6; i++) {
    let code = '';
    for (let k = 0; k < CODE_LENGTH; k++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    const { error } = await db.from('certificates').insert({ code, user_id: userId, course, student_name: name.slice(0, 200), student_email: p.email, course_title: title, awarded_by: awardedBy });
    if (!error) return { ok: true, code };
    if (error.code === '23505') {
      const { data: again } = await db.from('certificates').select('code').eq('user_id', userId).eq('course', course).maybeSingle();
      if (again) return { ok: true, code: again.code, already: true };
      continue; // random id collided: try a new one
    }
    return { error: 'Could not save the certificate.' };
  }
  return { error: 'Could not create a unique id.' };
}
