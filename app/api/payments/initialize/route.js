import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { createClient as createSessionClient } from '../../../../lib/supabase/server';
import { initializePaystackTransaction } from '../../../../lib/paystack';
import { MIN_AGE, calculateAge, getCourse } from '../../../../lib/courses';
import { getCourseSettings } from '../../../../lib/course-settings';
import { getAvailability, describeClosure } from '../../../../lib/course-status';
import { effectivePrice } from '../../../../lib/pricing';

// Step 1 of paying. The SERVER decides the amount (the admin's live price),
// records it, and asks Paystack to start the transaction. The browser only
// gets an access code to open the popup, so it can't change what is charged.
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const { courseKey, dob, specsAgreed, expectedPrice } = body || {};
  const course = getCourse(courseKey);
  if (!course || typeof dob !== 'string' || dob.length > 20) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  if (course.contactOnly) return NextResponse.json({ error: 'This course is by enquiry only. Please contact us on WhatsApp or email.' }, { status: 400 });
  if (!specsAgreed) return NextResponse.json({ error: 'Please confirm your laptop meets the minimum specs before paying.' }, { status: 400 });

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in with Google before paying.' }, { status: 401 });
  const { data: me } = await session.from('profiles').select('role, blocked, full_name, certificate_name').eq('id', user.id).maybeSingle();
  if (me?.role === 'teacher' || me?.role === 'admin') return NextResponse.json({ error: 'Teacher and admin accounts can’t register for a course.' }, { status: 403 });
  if (me?.blocked) return NextResponse.json({ error: 'This account’s access has been restricted.' }, { status: 403 });

  const admin = createAdminClient();
  const { data: withinLimit, error: rlError } = await admin.rpc('check_rate_limit', { p_key: `init:${user.id}`, p_max: 10, p_window_seconds: 300 });
  if (rlError) console.error('check_rate_limit error (failing open):', rlError);
  else if (withinLimit === false) return NextResponse.json({ error: 'Too many attempts -- please wait a few minutes and try again.' }, { status: 429 });

  const age = calculateAge(dob);
  if (age === null || age < MIN_AGE) return NextResponse.json({ error: `You must be at least ${MIN_AGE} to register for this course.` }, { status: 400 });

  const { data: existingPaid } = await admin.from('registrations').select('id').eq('user_id', user.id).eq('course', course.key).eq('status', 'paid').maybeSingle();
  if (existingPaid) return NextResponse.json({ error: 'You’ve already registered for this course.' }, { status: 409 });

  const settings = (await getCourseSettings(admin))[course.key];
  const availability = getAvailability(settings);
  if (!availability.open) return NextResponse.json({ error: describeClosure(availability) }, { status: 403 });

  const priceNow = effectivePrice(course, settings).now;
  // The admin changed the price after this page loaded: show the new one
  // first instead of charging something the student didn't see.
  if (Number.isInteger(expectedPrice) && expectedPrice !== priceNow) {
    return NextResponse.json({ error: 'price_changed', priceNow }, { status: 409 });
  }

  const email = user.email;
  const fullName = me?.certificate_name || me?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || email;
  const reference = 'FOUNDRY_' + course.key.toUpperCase() + '_' + Date.now() + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const amountKobo = priceNow * 100;

  const { error: insertError } = await admin.from('payment_intents').insert({ reference, user_id: user.id, email, full_name: fullName, course: course.key, amount_kobo: amountKobo, age });
  if (insertError) {
    console.error('payment_intents insert error:', insertError);
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 500 });
  }

  try {
    const tx = await initializePaystackTransaction({ email, amountKobo, reference, metadata: { course: course.key, course_name: course.name } });
    return NextResponse.json({ accessCode: tx.access_code, reference, priceNow });
  } catch (err) {
    await admin.from('payment_intents').delete().eq('reference', reference).eq('status', 'pending');
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
