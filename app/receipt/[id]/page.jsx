import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { verifyPaystackTransaction, describePaystackChannel } from '../../../lib/paystack';
import PrintButton from '../../../components/dashboard/PrintButton';
import Receipt from '../../../components/dashboard/Receipt';

export const metadata = { title: 'Payment receipt — The Foundry' };

export default async function ReceiptPage({ params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const { data: reg } = await supabase
    .from('registrations')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  // The registrations_select RLS policy already limits this to the
  // owner or an admin -- this check is the same rule enforced again in
  // code, not a substitute for it, so a receipt can't be pulled up by
  // ID by someone it doesn't belong to even if RLS is ever off.
  if (!reg || (reg.user_id !== user.id && profile?.role !== 'admin') || reg.status !== 'paid') {
    notFound();
  }

  const course = COURSES[reg.course];

  // Pull the actual transaction record from Paystack itself, server-side
  // with the secret key -- the same verified call the payment route
  // makes, reused here -- rather than only ever showing back the copy
  // we stored at checkout. This is what gets the payment method (card
  // brand + last 4, or bank transfer, etc.) onto the receipt, and it
  // means the amount/date on the receipt is Paystack's own record, not
  // just our database's memory of it.
  let paidAt = new Date(reg.created_at);
  let amountKobo = reg.amount_kobo;
  let paymentMethod = null;

  try {
    const txn = await verifyPaystackTransaction(reg.paystack_reference);
    if (txn?.status === 'success') {
      paidAt = new Date(txn.paid_at || txn.created_at || reg.created_at);
      amountKobo = txn.amount ?? reg.amount_kobo;
      paymentMethod = describePaystackChannel(txn);
    }
  } catch (err) {
    // Paystack being briefly unreachable shouldn't take the receipt
    // page down -- fall back to what's already in our own DB above, so
    // the receipt still renders, just without the payment-method line.
    console.error('Could not fetch live Paystack transaction for receipt:', err);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <p className="eyebrow mb-1">Payment receipt</p>
          <h1 className="font-display text-xl font-extrabold text-ink">Reference {reg.paystack_reference}</h1>
        </div>
        <PrintButton />
      </div>

      {/* Everything below this line is what actually prints / saves as
          PDF -- Nav and Footer are hidden via print:hidden, and the
          page chrome above (title + button) is also print:hidden, so
          the saved PDF is just the receipt itself. */}
      <Receipt
        reference={reg.paystack_reference}
        paidAt={paidAt}
        amountKobo={amountKobo}
        course={course}
        studentName={user.user_metadata?.full_name || user.user_metadata?.name || user.email}
        studentEmail={user.email}
        paymentMethod={paymentMethod}
      />
    </main>
  );
}
