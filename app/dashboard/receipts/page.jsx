import { createClient } from '../../../lib/supabase/server';
import { getUser, getProfile } from '../../../lib/supabase/session';
import { COURSES } from '../../../lib/courses';
import Receipt from '../../../components/dashboard/Receipt';
import { getPayment } from '../../../lib/payments';

export const metadata = { title: 'Receipts — The Foundry' };

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const user = await getUser();

  const [profile, { data: registrations }] = await Promise.all([
    getProfile(user.id),
    supabase
      .from('registrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
  ]);

  // A receipt only makes sense once money has actually been received --
  // not for a complimentary or still-pending enrollment.
  const receipts = (registrations || []).filter((r) => getPayment(r).receivedKobo > 0);

  return (
    <div>
      <p className="eyebrow mb-2">Receipts</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Payment history</h1>

      {!receipts.length ? (
        <div className="card p-6 text-sm text-inkdim">No payments on this account yet.</div>
      ) : (
        <div className="flex flex-col gap-6">
          {receipts.map((reg) => {
            const payment = getPayment(reg);
            return (
            <div key={reg.id}>
              <Receipt
                reference={reg.paystack_reference}
                paidAt={new Date(reg.created_at)}
                amountKobo={reg.amount_kobo}
                course={COURSES[reg.course]}
                studentName={profile?.full_name || user.user_metadata?.full_name || user.email}
                studentEmail={profile?.email || user.email}
                paymentMethod={payment.method}
                statusLabel={payment.label}
                balanceKobo={payment.balanceKobo}
                compact
              />
              <a
                href={`/receipt/${reg.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-btn-outline mt-3 inline-flex !py-2 text-sm"
              >
                Download as PDF &rarr;
              </a>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
