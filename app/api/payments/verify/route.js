import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { createClient as createSessionClient } from '../../../../lib/supabase/server';
import { finalizePayment } from '../../../../lib/finalize-payment';
import { validateCertificateName } from '../../../../lib/certificates';

// Step 2 of paying, called by the browser right after the Paystack popup
// reports success. The popup callback is NOT proof of payment, so
// finalizePayment asks Paystack directly (server to server) and checks the
// result against the payment the server started in /api/payments/initialize.
// The Paystack webhook runs the same function, so a student who closes the
// tab early still gets their seat.
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const { reference } = body || {};
  if (typeof reference !== 'string' || !reference || reference.length > 100) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Must be signed in; the account comes from the session, never the body.
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in with Google before paying.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: withinLimit, error: rateLimitError } = await admin.rpc('check_rate_limit', { p_key: `verify:${user.id}`, p_max: 20, p_window_seconds: 300 });
  if (rateLimitError) console.error('check_rate_limit error (failing open):', rateLimitError);
  else if (withinLimit === false) return NextResponse.json({ error: 'Too many attempts -- please wait a few minutes and try again.' }, { status: 429 });

  const result = await finalizePayment(reference, { userId: user.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  // Backup save of the certificate name (also saved before payment).
  // Best-effort: it must never undo a payment.
  try {
    const v = validateCertificateName(body?.certificateName);
    if (v.ok) await admin.from('profiles').update({ certificate_name: v.name, full_name: v.name }).eq('id', user.id);
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true });
}
