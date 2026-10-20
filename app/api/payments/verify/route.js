import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { createClient as createSessionClient } from '../../../../lib/supabase/server';
import { verifyPaystackTransaction } from '../../../../lib/paystack';
import { sendServerEmail } from '../../../../lib/emailjs-server';
import { COURSES, MIN_AGE, calculateAge, getCourse} from '../../../../lib/courses';
import { getCourseSettings } from '../../../../lib/course-settings';
import { getAvailability, startedBeforeClose, describeClosure } from '../../../../lib/course-status';

// The whole registration now completes in this one request: Google
// sign-in (required before this is ever called) already proved the
// email and handled auth entirely -- there's no separate account-
// creation step, and nothing here ever touches a password, because this
// app doesn't manage one.
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const { reference, courseKey, dob, specsAgreed } = body || {};
  if (typeof reference !== 'string' || reference.length > 100 || typeof dob !== 'string' || dob.length > 20) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const course = getCourse(courseKey);

  if (!reference || !course || !dob) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // Registration state is controlled by the admin (/admin/registration),
  // not a static flag. The cheap early rejection happens in step 3.5
  // below, once `admin` exists; the final decision -- which has to look
  // at WHEN the payment was started -- happens after Paystack confirms
  // the transaction (step 4.5).

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
  // Teachers and admins have one role only -- they don't enrol as
  // students, so refuse before any money moves.
  {
    const { data: me } = await sessionSupabase.from('profiles').select('role, blocked').eq('id', user.id).maybeSingle();
    if (me?.role === 'teacher' || me?.role === 'admin') {
      return NextResponse.json({ error: 'Teacher and admin accounts can\u2019t register for a course.' }, { status: 403 });
    }
    if (me?.blocked) {
      return NextResponse.json({ error: 'This account\u2019s access has been restricted.' }, { status: 403 });
    }
  }
  const email = user.email;
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email;

  // 1.5. Rate limit, keyed per-account -- this endpoint calls Paystack's
  // real API (step 4 below), so unrestricted retries burn real API
  // quota, not just server time. 10 attempts per 5 minutes is generous
  // for legitimate use (a payment that needs a couple of retries) while
  // still stopping a script from hammering this in a loop. Uses the
  // service-role client + check_rate_limit() (see supabase/schema.sql)
  // since serverless functions don't share in-memory state between
  // invocations -- the database is the only shared state available.
  // `admin` is created here (not at step 3, where it used to first
  // appear) specifically so this same client instance covers both.
  const admin = createAdminClient();
  const { data: withinLimit, error: rateLimitError } = await admin.rpc('check_rate_limit', {
    p_key: `verify:${user.id}`,
    p_max: 10,
    p_window_seconds: 300
  });
  if (rateLimitError) {
    // Fails open, not closed -- if the rate-limit check itself is
    // broken (a migration not yet run, a transient DB issue), that
    // should never be the reason a real payment can't be verified.
    console.error('check_rate_limit error (failing open):', rateLimitError);
  } else if (withinLimit === false) {
    return NextResponse.json({ error: 'Too many attempts -- please wait a few minutes and try again.' }, { status: 429 });
  }

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
  // table reliably regardless of RLS state. (Same `admin` instance
  // created above for the rate-limit check.)
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

  // 3.5. Registration closed? If the admin has never closed this course
  // (no registration_closed_at), nobody can have a legitimate in-flight
  // payment, so refuse before spending a Paystack call. If there IS a
  // close time, fall through: a payment started BEFORE it is still
  // honoured (checked in 4.5, since that needs Paystack's own timestamp).
  const settings = (await getCourseSettings(admin))[course.key];
  const availability = getAvailability(settings);
  if (!availability.open && !settings.registration_closed_at) {
    return NextResponse.json({ error: describeClosure(availability) }, { status: 403 });
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
  // The payment must also have been started FOR THIS COURSE. Prices can
  // match across courses, so amount + email alone would let one payment
  // be claimed for a different (say, closed) course.
  let paidMeta = txn.metadata;
  if (typeof paidMeta === 'string') {
    try { paidMeta = JSON.parse(paidMeta); } catch { paidMeta = null; }
  }
  if (!paidMeta || paidMeta.course !== course.key) {
    return NextResponse.json({ error: 'This payment was made for a different course.' }, { status: 400 });
  }
  // The reference alone isn't enough proof that THIS signed-in user is
  // the one who actually paid -- a reference is just a string, and this
  // endpoint has always accepted whatever reference the caller sends.
  // Paystack was told the payer's email at checkout init (see
  // RegisterFlow.jsx's `email: user.email` in the popup config), so its
  // own transaction record is independent proof of who really paid.
  // Cross-checking it here is what stops someone who has merely seen or
  // guessed a reference (references aren't cryptographically random --
  // see where `reference` is built in RegisterFlow.jsx) from claiming
  // someone ELSE's completed payment under their own account.
  if (!txn.customer?.email || txn.customer.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'This payment reference doesn\u2019t belong to your account.' }, { status: 403 });
  }

  // 4.5. Final registration-state decision. Closed now, and this payment
  // was started AFTER the close -> refuse, but say so loudly with the
  // reference: money may have moved, and the admin needs it to refund.
  if (!availability.open && !startedBeforeClose(settings, txn.created_at || txn.createdAt)) {
    return NextResponse.json(
      {
        error:
          describeClosure(availability) +
          ' Your payment was received but no seat was created \u2014 please contact support with this reference for a refund: ' +
          reference
      },
      { status: 403 }
    );
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
        to_email: process.env.ADMIN_NOTIFY_EMAIL || 'aboyadematthew@gmail.com',
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
