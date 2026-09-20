import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { COURSES, formatNaira } from '../../../lib/courses';

export const metadata = { title: 'Payments — The Foundry' };

export default async function PaymentsPage() {
  const supabase = await createClient();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('id, course, amount_kobo, paystack_reference, created_at, profiles(full_name, email)')
    .eq('status', 'paid')
    .order('created_at', { ascending: false });

  const totalKobo = (registrations || []).reduce((sum, r) => sum + (r.amount_kobo || 0), 0);

  return (
    <div>
      <p className="eyebrow mb-2">Payments</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Payment ledger</h1>
      <p className="mb-6 text-sm text-inkdim">
        {registrations?.length || 0} payments · {formatNaira(totalKobo / 100)} total
      </p>

      {!registrations?.length ? (
        <div className="card p-6 text-sm text-inkdim">No payments yet.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="flex flex-col divide-y divide-line">
            {registrations.map((r) => (
              <Link
                key={r.id}
                href={`/receipt/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 p-4 text-sm transition hover:bg-surfaceMuted"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{r.profiles?.full_name || r.profiles?.email}</p>
                  <p className="truncate text-xs text-inkdim">
                    {COURSES[r.course]?.name || r.course} · {new Date(r.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="truncate text-xs text-inkdim">Ref: {r.paystack_reference}</p>
                </div>
                <p className="flex-shrink-0 font-semibold text-ink">{formatNaira(r.amount_kobo / 100)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
