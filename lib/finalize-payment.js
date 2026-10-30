import { createAdminClient } from './supabase/admin';
import { verifyPaystackTransaction } from './paystack';
import { sendServerEmail } from './emailjs-server';
import { getCourse } from './courses';
import { revalidateTag } from 'next/cache';
import { getCourseSettings, COURSE_SETTINGS_TAG } from './course-settings';
import { SEAT_LIMIT } from './course-load';
import { getAvailability, startedBeforeClose, describeClosure } from './course-status';

// The ONE place a paid Paystack transaction becomes a seat. Called by the
// browser verify route (right after the popup) and by the webhook (in case
// the browser never got to call it). It is safe to call more than once for
// the same reference: the second call finds the seat and returns ok.
//
// Everything is checked against the payment_intents row the server wrote
// before the popup opened, not against today's price.
export async function finalizePayment(reference, { userId = null } = {}) {
  const admin = createAdminClient();
  const fail = (status, error, retryable = false) => ({ ok: false, status, error, retryable });

  const { data: intent, error: intentError } = await admin.from('payment_intents').select('*').eq('reference', reference).maybeSingle();
  if (intentError) return fail(500, 'Could not look up this payment. Please try again in a moment.', true);
  if (!intent) return fail(404, 'We have no record of this payment being started on this site.');
  if (userId && intent.user_id !== userId) return fail(403, 'This payment reference doesn’t belong to your account.');
  if (intent.status === 'completed') return { ok: true, already: true };

  const course = getCourse(intent.course);
  if (!course) return fail(400, 'Unknown course on this payment.');

  // Money may have moved in every case below, so each one flags the payment
  // for the admin and tells the person the reference.
  const flag = async (note) => {
    await admin.from('payment_intents').update({ status: 'needs_review', note }).eq('reference', reference).eq('status', 'pending');
    console.error('Payment needs review:', reference, note);
  };
  const contact = ' Please contact support with this reference: ' + reference;

  let txn;
  try {
    txn = await verifyPaystackTransaction(reference);
  } catch (err) {
    return fail(400, err.message, true);
  }
  if (txn.status !== 'success') return fail(400, 'Payment was not successful.');

  if (txn.amount !== intent.amount_kobo || txn.currency !== 'NGN') {
    await flag(`Paystack amount ${txn.amount} ${txn.currency} does not match the ${intent.amount_kobo} kobo that was started.`);
    return fail(400, 'The amount received doesn’t match what was started, so no seat was created.' + contact);
  }
  if (!txn.customer?.email || txn.customer.email.toLowerCase() !== intent.email.toLowerCase()) {
    await flag('Paystack customer email does not match the account that started this payment.');
    return fail(403, 'This payment doesn’t belong to your account.' + contact);
  }

  const settings = (await getCourseSettings(admin))[course.key];
  const availability = getAvailability(settings);
  // A payment started while registration was still open is honoured even if the
  // class clock started in the meantime. A full cohort is checked below, at the moment of the seat.
  const inFlightOk = availability.autoClosed === 'started';
  const fullNow = availability.autoClosed === 'full';
  if (!availability.open && !inFlightOk && !startedBeforeClose(settings, intent.created_at)) {
    await flag(fullNow ? 'The cohort was already full when this payment completed.' : 'Registration closed before this payment was started, but it was paid.');
    return fail(403, describeClosure(availability) + ' Your payment was received but no seat was created.' + contact);
  }

  // Already has this seat (browser and webhook raced, or a retry).
  const { data: sameRef } = await admin.from('registrations').select('id').eq('paystack_reference', reference).maybeSingle();
  if (sameRef) {
    await admin.from('payment_intents').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('reference', reference);
    return { ok: true, already: true };
  }
  const { data: otherPaid } = await admin.from('registrations').select('id').eq('user_id', intent.user_id).eq('course', course.key).eq('status', 'paid').maybeSingle();
  if (otherPaid) {
    await flag('Already registered for this course: this is a duplicate payment that needs a refund.');
    return fail(409, 'You’re already registered for this course. This looks like a duplicate payment.' + contact);
  }

  const { data: batchId, error: batchError } = await admin.rpc('assign_batch', { p_course: course.key });
  if (batchError) console.error('assign_batch error:', batchError);

  // The profile normally exists from sign-in. Only create it if it doesn't,
  // so the name the student chose is never overwritten and `role` is never touched.
  const { data: hasProfile } = await admin.from('profiles').select('id').eq('id', intent.user_id).maybeSingle();
  const { error: profileError } = hasProfile ? {} : await admin.from('profiles').insert({ id: intent.user_id, full_name: intent.full_name || intent.email, email: intent.email });
  if (profileError) {
    console.error('profiles upsert error:', profileError);
    return fail(500, 'Payment verified, but we could not save your profile.' + contact, true);
  }

  const { error: regError } = await admin.from('registrations').insert({
    user_id: intent.user_id,
    course: course.key,
    age: intent.age,
    batch_id: batchId || null,
    paystack_reference: reference,
    amount_kobo: txn.amount,
    status: 'paid',
    laptop_specs_agreed: true
  });
  const raced = regError?.code === '23505'; // the other path inserted it a moment ago
  if (regError && !raced) {
    console.error('registrations insert error:', regError);
    return fail(500, 'Payment verified, but we could not save your registration.' + contact, true);
  }
  // Two payments finishing at the same instant could both pass the check above.
  // Count again now: if this seat is over the limit, take back only the row we just made.
  if (!raced && settings.auto_close !== false) {
    const { count } = await admin.from('registrations').select('id', { count: 'exact', head: true }).eq('course', course.key).eq('status', 'paid');
    if ((count || 0) > SEAT_LIMIT) {
      await admin.from('registrations').delete().eq('paystack_reference', reference);
      await flag('The cohort filled up at the same moment as this payment. Refund this payment.');
      return fail(409, 'The last seat was taken at the same moment, so no seat was created for you.' + contact);
    }
  }
  await admin.from('payment_intents').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('reference', reference);
  try { revalidateTag(COURSE_SETTINGS_TAG); } catch { /* seat count shows on the next refresh */ }

  if (!raced) {
    try {
      await sendServerEmail({
        templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        params: {
          from_name: intent.full_name || intent.email,
          from_email: intent.email,
          to_email: process.env.ADMIN_NOTIFY_EMAIL || 'aboyadematthew@gmail.com',
          subject: 'New Cohort Registration — ' + course.name,
          message: 'New paid registration for ' + course.name + '.\nName: ' + (intent.full_name || '') + '\nEmail: ' + intent.email + '\nAge: ' + intent.age + '\nPaystack reference: ' + reference
        }
      });
    } catch (err) {
      console.error('Admin notification email failed (non-fatal):', err);
    }
  }
  return { ok: true };
}
