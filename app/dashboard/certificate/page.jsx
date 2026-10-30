import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import CertificateTabs from '../../../components/certificate/CertificateTabs';
import { formatCode, formatCertDate } from '../../../lib/certificates';
import { SITE_URL } from '../../../lib/seo';

export const metadata = { title: 'Certificate — The Foundry' };

export default async function CertificatePage() {
  const supabase = await createClient();
  const user = await getUser();
  // RLS: a student can only ever read their own certificates.
  const { data } = await supabase
    .from('certificates')
    .select('code, course, student_name, course_title, awarded_at')
    .eq('user_id', user.id)
    .order('awarded_at', { ascending: false });

  const certs = (data || []).map((c) => ({
    code: c.code,
    codeFormatted: formatCode(c.code),
    name: c.student_name,
    course: c.course_title,
    date: formatCertDate(c.awarded_at),
    verifyUrl: `${SITE_URL}/verify/${c.code}`
  }));

  return (
    <div>
      <p className="eyebrow mb-2">Certificate</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Your certificate</h1>
      <p className="mb-6 text-sm text-inkdim">
        {certs.length
          ? 'Congratulations — your certificate is ready. Download it and share it with pride.'
          : 'This is locked for now. Your certificate unlocks once the programme director awards it to you after you complete your course.'}
      </p>
      <CertificateTabs certs={certs} />
    </div>
  );
}
