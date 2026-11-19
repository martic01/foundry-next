import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { createClient as createSessionClient } from '../../../../../lib/supabase/server';
import { finalizeExamPayment, EXAM_REF_PREFIX } from '../../../../../lib/exam/pay';
import { startAttempt } from '../../../../../lib/exam/server';

// Called right after the Paystack popup succeeds. Verifies with Paystack, then starts the exam straight away.
export async function POST(request) {
  let body; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const reference = body?.reference;
  if (typeof reference !== 'string' || !reference.startsWith(EXAM_REF_PREFIX) || reference.length > 100) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const db = createAdminClient();
  const res = await finalizeExamPayment(db, reference, { userId: user.id });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  const started = await startAttempt(db, user.id);
  // Paid but could not start yet (for example an exam already running): the paid token is kept for next time.
  return NextResponse.json({ ok: true, started: !!started.ok, note: started.error || null });
}
