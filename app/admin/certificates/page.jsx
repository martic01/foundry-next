import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { formatCode, formatCertDate } from '../../../lib/certificates';
import CertificateManager from '../../../components/admin/CertificateManager';

export const metadata = { title: 'Certificates — The Foundry' };

export default async function CertificatesPage() {
  const supabase = await createClient();
  const [{ data: batches }, { data: regs }, certRes, nameRes] = await Promise.all([
    supabase.from('batches').select('id, label, course').order('course').order('created_at'),
    supabase.from('registrations').select('id, course, batch_id, profiles(id, full_name, email, role)').eq('status', 'paid'),
    supabase.from('certificates').select('id, code, user_id, course, awarded_at'),
    supabase.from('profiles').select('id, certificate_name').not('certificate_name', 'is', null)
  ]);
  const certNames = Object.fromEntries((nameRes.error ? [] : nameRes.data || []).map((p) => [p.id, p.certificate_name]));

  const certByKey = {};
  (certRes.data || []).forEach((c) => { certByKey[`${c.user_id}:${c.course}`] = c; });

  // The admin and teachers are never students, so never get a certificate.
  const students = (regs || [])
    .filter((r) => r.profiles && (!r.profiles.role || r.profiles.role === 'student'))
    .map((r) => {
      const c = certByKey[`${r.profiles.id}:${r.course}`];
      return {
        key: r.id,
        userId: r.profiles.id,
        name: certNames[r.profiles.id] || r.profiles.full_name || 'Unknown',
        hasCertName: !!certNames[r.profiles.id],
        email: r.profiles.email || '',
        course: r.course,
        courseName: COURSES[r.course]?.name || r.course,
        batchId: r.batch_id || '',
        cert: c ? { id: c.id, code: formatCode(c.code), date: formatCertDate(c.awarded_at) } : null
      };
    });

  return (
    <div>
      <p className="eyebrow mb-2">Certificates</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Award certificates</h1>
      <p className="mb-6 text-sm text-inkdim">
        Award a certificate to one student, several, or a whole batch. Each one gets a unique ID printed on it that anyone can check
        from the website. Revoking removes the ID and locks the student&apos;s certificate again.
      </p>
      {certRes.error && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          The certificates table isn&apos;t set up yet. Run <code>supabase/2-updates.sql</code> in the Supabase SQL editor.
        </p>
      )}
      <CertificateManager batches={batches || []} students={students} />
    </div>
  );
}
