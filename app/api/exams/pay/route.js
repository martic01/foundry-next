import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { createClient as createSessionClient } from '../../../../lib/supabase/server';
import { initializePaystackTransaction } from '../../../../lib/paystack';
import { loadExamContext } from '../../../../lib/exam/server';
import { EXAM_REF_PREFIX } from '../../../../lib/exam/pay';

// Starts the retake-fee payment. The server decides the amount and checks the student really owes a fee.
export async function POST() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const db = createAdminClient();
  const { data: ok } = await db.rpc('check_rate_limit', { p_key: `exampay:${user.id}`, p_max: 8, p_window_seconds: 300 });
  if (ok === false) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
  const ctx = await loadExamContext(db, user.id);
  if (!ctx || ctx.state.state !== 'pay') return NextResponse.json({ error: 'No retake payment is due right now.' }, { status: 409 });

  const reference = `${EXAM_REF_PREFIX}${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const amountKobo = ctx.settings.retakeFee * 100; // the admin's figure for this batch (default 5,000)
  const { error } = await db.from('exam_payments').insert({ reference, user_id: user.id, batch_id: ctx.batchId, course: ctx.course, amount_kobo: amountKobo, email: user.email });
  if (error) return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 500 });
  try {
    const tx = await initializePaystackTransaction({ email: user.email, amountKobo, reference, metadata: { purpose: 'exam_retake', course: ctx.course } });
    return NextResponse.json({ accessCode: tx.access_code, reference });
  } catch (e) {
    await db.from('exam_payments').delete().eq('reference', reference).eq('status', 'pending');
    console.error('[exam-pay] init', e?.message);
    return NextResponse.json({ error: 'Payment could not be started. Please try again shortly.' }, { status: 502 });
  }
}
