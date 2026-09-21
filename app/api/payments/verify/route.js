import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { createClient as createSessionClient } from '../../../../lib/supabase/server';
import { verifyPaystackTransaction } from '../../../../lib/paystack';
import { sendServerEmail } from '../../../../lib/emailjs-server';
import { COURSES, MIN_AGE, calculateAge } from '../../../../lib/courses';

// The whole registration now completes in this one request: Google
// sign-in (required before this is ever called) already proved the
// email and handled auth entirely -- there's no separate account-
// creation step, and nothing here ever touches a password, because this
// app doesn't manage one.
export async function POST(request) {
  const { reference, courseKey, dob, specsAgreed } = await request.json();
  const course = COURSES[courseKey];

  if (!reference || !course || !dob) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // Server-side backstop for the "Coming soon" stages -- RegisterFlow.jsx
  // already blocks this client-side (disabled button, and a dedicated
  // screen if someone lands on /register?course=react directly), but
  // this endpoint could always be called directly, so it can't rely on
  // that alone.
  if (course.comingSoon) {
    return NextResponse.json({ error: 'This course isn\u2019t open for registration yet.' }, { status: 400 });
  }

  // The laptop-spec checkbox is enforced here too, not just by disabling
  // the Pay button client-side -- same reasoning as the age check below.
  if (!specsAgreed) {
    return NextResponse.json({ error: 'Please confirm your laptop meets the minimum specs before paying.' }, { status: 400 });
  }

  // 1. Must be signed in via Google already -- this is what "email
  // verification" means in this app now. The email comes from the
  // session, never from anything the client sends in the request body,
  // so there's no way to register a payment against an email you don't
  // actually control.
  const sessionSupabase = await createSessionClient();
  const { data: { user } } = await sessionSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in with Google before paying.' }, { status: 401 });
  }
  const email = user.email;
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email;

  // 2. Age eligibility, computed from the date of birth and checked
  // server-side too -- the UI already blocks an under-15 date of birth
  // from reaching this point, but that's a convenience, not the actual
  // gate. Only the computed age is kept from here on (see the
  // registrations insert below) -- the raw date of birth is used for
  // this one check and then discarded, not stored.
  const age = calculateAge(dob);
  if (age === null || age < MIN_AGE) {
    return NextResponse.json({ error: `You must be at least ${MIN_AGE} to register for this course.` }, { status: 400 });
  }

  // 3. Already paid for this course? Reject before spending a Paystack
  // API call on it. This is the REAL gate against paying twice -- the
  // Pay button being disabled client-side (RegisterFlow.jsx) is only a
  // courtesy, since this endpoint could always be called directly. Uses
  // the service-role client since it needs to check across the whole
  // table reliably regardless of RLS state.
  const admin = createAdminClient();
  const { data: existingPaid } = await admin
    .from('registrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('course', course.key)
    .eq('status', 'paid')
    .maybeSingle();
  if (existingPaid) {
    return NextResponse.json({ error: 'You\u2019ve already registered for this course.' }, { status: 409 });
  }

  // 4. Ask Paystack directly whether this reference really succeeded,
  // for the amount this course actually costs. This is the actual proof
  // of payment -- the client-side "onSuccess" callback alone is never
  // trusted on its own.
  let txn;
  try {
    txn = await verifyPaystackTransaction(reference);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (txn.status !== 'success') {
    return NextResponse.json({ error: 'Payment was not successful.' }, { status: 400 });
  }
  if (txn.amount !== course.priceNow * 100 || txn.currency !== 'NGN') {
    return NextResponse.json({ error: 'Payment amount does not match this course.' }, { status: 400 });
  }

  // 5. Record the registration. `admin` (created in step 3 above) is
  // the service-role client -- not because RLS is being worked around
  // carelessly, but because THIS request is the trust boundary: it just
  // independently confirmed the payment with Paystack itself, so it's
  // allowed to write what a plain authenticated session isn't (a
  // session alone could forge a registration row without ever paying).
  const { data: batchId, error: batchError } = await admin.rpc('assign_batch', { p_course: course.key });
  if (batchError) console.error('assign_batch error:', batchError);

  // Payment only ever registers/updates name+email -- it never sets
  // `role`. Role assignment happens once, at Google sign-in (see
  // app/auth/callback/route.js), so this upsert can't accidentally
  // demote an admin back to 'student' if they ever pay for a course.
  // In the normal flow this row already exists by the time payment
  // happens (sign-in runs first) -- this upsert is a defensive fallback,
  // not the primary place profiles get created anymore.
  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    full_name: fullName,
    email
  });
  if (profileError) {
    console.error('profiles upsert error:', profileError);
    return NextResponse.json({ error: 'Payment verified, but we could not save your profile. Please contact support with this reference: ' + reference }, { status: 500 });
  }

  const { error: regError } = await admin.from('registrations').insert({
    user_id: user.id,
    course: course.key,
    age,
    batch_id: batchId || null,
    paystack_reference: reference,
    amount_kobo: txn.amount,
    status: 'paid',
    laptop_specs_agreed: true
  });
  if (regError) {
    console.error('registrations insert error:', regError);
    return NextResponse.json({ error: 'Payment verified, but we could not save your registration. Please contact support with this reference: ' + reference }, { status: 500 });
  }

  // Best-effort admin notification -- registration itself is already
  // done at this point regardless of whether this email succeeds. This
  // is now the ONLY thing EmailJS is used for in this app.
  try {
    await sendServerEmail({
      templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
      params: {
        from_name: fullName,
        from_email: email,
        to_email: 'aboyadematthew@gmail.com',
        subject: 'New Cohort Registration \u2014 ' + course.name,
        message:
          'New paid registration for ' + course.name + '.\n' +
          'Name: ' + fullName + '\n' +
          'Email: ' + email + '\n' +
          'Age: ' + age + '\n' +
          'Paystack reference: ' + reference
      }
    });
  } catch (err) {
    console.error('Admin notification email failed (non-fatal):', err);
  }

  return NextResponse.json({ ok: true });
}
