import { createClient } from '../../../lib/supabase/server';
import { COURSES } from '../../../lib/courses';
import { getCourseSettings } from '../../../lib/course-settings';
import { effectivePrice } from '../../../lib/pricing';
import { PAYMENT_STATUSES } from '../../../lib/payments';
import PaymentsLedger from '../../../components/admin/PaymentsLedger';

export const metadata = { title: 'Payments — The Foundry' };

export default async function PaymentsPage({ searchParams }) {
  const supabase = await createClient();

  const courseSettings = await getCourseSettings(supabase);
  const base = 'id, course, amount_kobo, paystack_reference, created_at, profiles(full_name, email)';
  let { data: registrations, error } = await supabase
    .from('registrations')
    .select(`${base}, amount_due_kobo, payment_status, payment_method`)
    .eq('status', 'paid')
    .order('created_at', { ascending: false });

  // Migration not run yet? Fall back to the old columns so the ledger
  // still lists everyone (all treated as paid), and say what to run.
  const needsMigration = !!error;
  if (needsMigration) {
    ({ data: registrations } = await supabase
      .from('registrations')
      .select(base)
      .eq('status', 'paid')
      .order('created_at', { ascending: false }));
  }

  const rows = (registrations || []).map((r) => ({
    reg: r,
    studentName: r.profiles?.full_name || r.profiles?.email || 'Unknown',
    courseName: COURSES[r.course]?.name || r.course,
    priceNaira: COURSES[r.course] ? effectivePrice(COURSES[r.course], courseSettings[r.course]).now : 0
  }));

  // The Overview's stat tiles link here as /admin/payments?status=pending.
  const initialStatus = PAYMENT_STATUSES[searchParams?.status] ? searchParams.status : 'all';

  return (
    <div>
      <p className="eyebrow mb-2">Payments</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Payment ledger</h1>
      <p className="mb-6 text-sm text-inkdim">
        Everyone enrolled, and where their payment stands. Click a tile to filter.
      </p>

      {needsMigration && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          Payment status isn&apos;t set up in the database yet. Run{' '}
          <code className="font-mono text-xs">supabase/2-updates.sql</code> in the Supabase SQL Editor
          to turn it on.
        </div>
      )}

      {/* key = initialStatus so following an Overview tile link (same
          page, different ?status=) resets the filter to match the URL. */}
      <PaymentsLedger key={initialStatus} rows={rows} initialStatus={initialStatus} />
    </div>
  );
}
