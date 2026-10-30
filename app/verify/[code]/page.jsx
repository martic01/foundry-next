import Link from 'next/link';
import { headers } from 'next/headers';
import { ShieldCheck, ShieldX, Calendar, BookOpen, Hash, User, ArrowLeft } from 'lucide-react';
import { createAdminClient } from '../../../lib/supabase/admin';
import { normalizeCode, formatCode, formatCertDate } from '../../../lib/certificates';
import { NOINDEX, SITE_URL } from '../../../lib/seo';
import FoundryLogo from '../../../components/FoundryLogo';
import CertificateArt from '../../../components/certificate/CertificateArt';

export const metadata = { title: 'Certificate verification | The Foundry', description: 'Check that a Foundry certificate is genuine.', ...NOINDEX };
export const dynamic = 'force-dynamic'; // always a live check, never a cached answer

// Opened by scanning the QR code on a certificate. Looks up ONE exact
// certificate id and shows who earned it and for what. The email address is
// never shown here.
async function lookup(code) {
  const admin = createAdminClient();
  let blocked = false;
  try {
    const ip = (headers().get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const { data, error } = await admin.rpc('check_rate_limit', { p_key: `verify-page:${ip}`, p_max: 30, p_window_seconds: 60 });
    if (!error && data === false) blocked = true;
  } catch { /* the lookup itself is still safe: one exact id */ }
  if (blocked) return { status: 'limited' };
  const { data, error } = await admin
    .from('certificates')
    .select('code, student_name, course_title, awarded_at')
    .eq('code', code)
    .maybeSingle();
  if (error) return { status: 'error' };
  return data ? { status: 'valid', cert: data } : { status: 'invalid' };
}

export default async function VerifyPage({ params }) {
  const code = normalizeCode(params.code);
  const result = code ? await lookup(code) : { status: 'invalid' };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 flex justify-center sm:mb-8">
        <Link href="/" aria-label="The Foundry home"><FoundryLogo markClass="h-9 w-9 sm:h-11 sm:w-11" textClass="text-[length:clamp(1.25rem,5vw,1.75rem)]" /></Link>
      </header>

      {result.status === 'valid' ? <Valid cert={result.cert} /> : <NotValid status={result.status} code={code} />}

      <p className="mt-8 text-center text-xs text-inkdim">
        <Link href="/" className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Back to The Foundry</Link>
      </p>
    </main>
  );
}

function Valid({ cert }) {
  const data = {
    name: cert.student_name,
    course: cert.course_title,
    date: formatCertDate(cert.awarded_at),
    codeFormatted: formatCode(cert.code),
    verifyUrl: `${SITE_URL}/verify/${cert.code}`
  };
  const rows = [
    [User, 'Awarded to', cert.student_name],
    [BookOpen, 'Course completed', cert.course_title],
    [Calendar, 'Awarded on', data.date],
    [Hash, 'Certificate ID', data.codeFormatted]
  ];
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col items-center gap-2 border-b border-line bg-emerald-50 px-4 py-6 text-center sm:px-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><ShieldCheck className="h-8 w-8" /></span>
        <p className="eyebrow !text-emerald-700">Verified certificate</p>
        <h1 className="fluid-h2 font-display font-extrabold text-ink">This certificate is genuine</h1>
        <p className="max-w-md text-sm text-inkdim">It was issued by The Foundry and is in our records.</p>
      </div>

      <dl className="grid gap-4 px-4 py-6 sm:grid-cols-2 sm:px-8">
        {rows.map(([Icon, label, value]) => (
          <div key={label} className={`flex min-w-0 items-start gap-3 ${label === 'Course completed' ? 'sm:col-span-2' : ''}`}>
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand"><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-inkdim">{label}</dt>
              <dd className={`break-words font-semibold text-ink ${label === 'Certificate ID' ? 'font-mono text-sm tracking-wider' : ''}`}>{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="border-t border-line bg-surfaceMuted px-4 py-6 sm:px-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-inkdim">The certificate</p>
        <div className="overflow-hidden rounded-lg border border-line shadow-sm">
          <CertificateArt data={data} className="block h-auto w-full" />
        </div>
      </div>
    </section>
  );
}

function NotValid({ status, code }) {
  const msg = status === 'limited'
    ? 'Too many checks from your connection. Please wait a minute and scan again.'
    : status === 'error'
      ? 'We couldn’t check right now. Please try again shortly.'
      : 'No certificate matches this ID. Check it for typos. If it is right, the certificate was never issued or has been revoked.';
  return (
    <section className="card px-4 py-10 text-center sm:px-8">
      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700"><ShieldX className="h-8 w-8" /></span>
      <h1 className="fluid-h2 mb-2 font-display font-extrabold text-ink">{status === 'invalid' ? 'Certificate not found' : 'Could not verify'}</h1>
      {code && <p className="mb-2 font-mono text-sm tracking-wider text-inkdim">{formatCode(code)}</p>}
      <p className="mx-auto max-w-md text-sm text-inkdim">{msg}</p>
    </section>
  );
}
