import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import Receipt from '../../../components/dashboard/Receipt';

export const metadata = { title: 'Receipts — The Foundry' };

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false });

  return (
    <div>
      <p className="eyebrow mb-2">Receipts</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Payment history</h1>

      {!registrations?.length ? (
        <div className="card p-6 text-sm text-inkdim">No payments on this account yet.</div>
      ) : (
        <div className="flex flex-col gap-6">
          {registrations.map((reg) => (
            <div key={reg.id}>
              <Receipt
                reference={reg.paystack_reference}
                paidAt={new Date(reg.created_at)}
                amountKobo={reg.amount_kobo}
                course={COURSES[reg.course]}
                studentName={profile?.full_name || user.user_metadata?.full_name || user.email}
                studentEmail={profile?.email || user.email}
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
          ))}
        </div>
      )}
    </div>
  );
}
