import { verifyPaystackTransaction } from '../paystack';

export const EXAM_REF_PREFIX = 'FOUNDRY_EXAM_';

// Confirms with Paystack that a retake fee was paid, then marks it paid (once). Used by the
// browser verify route and by the webhook; safe to call twice.
export async function finalizeExamPayment(db, reference, { userId = null } = {}) {
  const fail = (status, error, retryable = false) => ({ ok: false, status, error, retryable });
  const { data: pay, error } = await db.from('exam_payments').select('*').eq('reference', reference).maybeSingle();
  if (error) return fail(500, 'Could not look up this payment. Try again in a moment.', true);
  if (!pay) return fail(404, 'No record of this payment.');
  if (userId && pay.user_id !== userId) return fail(403, 'This payment is not on your account.');
  if (pay.status === 'paid' || pay.status === 'used') return { ok: true, already: true };

  let txn;
  try { txn = await verifyPaystackTransaction(reference); } catch (e) { return fail(400, e.message, true); }
  if (txn.status !== 'success') return fail(400, 'Payment was not successful.');
  if (txn.amount !== pay.amount_kobo || txn.currency !== 'NGN') { // pay.amount_kobo was fixed by the server when the payment started
    await db.from('exam_payments').update({ status: 'needs_review' }).eq('reference', reference).eq('status', 'pending');
    return fail(400, 'The amount received does not match, so the exam was not unlocked. Contact support with reference ' + reference);
  }
  const { error: upErr } = await db.from('exam_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('reference', reference).eq('status', 'pending');
  if (upErr) return fail(500, 'Payment received but could not be recorded. Contact support with reference ' + reference, true);
  return { ok: true };
}
