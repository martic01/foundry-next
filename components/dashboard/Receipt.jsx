import { formatNaira } from '../../lib/courses';

// One receipt layout, two places it's used: inline on /dashboard (fast,
// built from what's already in our own DB) and full-size on
// /receipt/[id] (built from live data fetched straight from Paystack --
// see that page for why). Both pass the same shape of props in, so the
// two never visually drift apart even though their data sources differ.
export default function Receipt({
  reference,
  paidAt,
  amountKobo,
  course,
  studentName,
  studentEmail,
  paymentMethod,
  compact = false
}) {
  return (
    <div
      className={`light-scope card border-2 border-brand/20 print:border-none print:shadow-none ${
        compact ? 'p-5' : 'p-8 print:p-0'
      }`}
    >
      <div className="mb-5 flex items-center justify-between border-b border-line pb-5">
        <div>
          <p className="font-racing text-lg tracking-wide text-ink">
            The <span className="text-brand">Foundry</span>
          </p>
          <p className="text-xs text-inkdim">State AI Training</p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Paid
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-y-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-inkdim">Reference</p>
          <p className="break-all font-medium text-ink">{reference}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-inkdim">Date paid</p>
          <p className="font-medium text-ink">
            {paidAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-inkdim">Student</p>
          <p className="font-medium text-ink">{studentName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-inkdim">Email</p>
          <p className="font-medium text-ink">{studentEmail}</p>
        </div>
        {paymentMethod && (
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wide text-inkdim">Payment method</p>
            <p className="font-medium text-ink">{paymentMethod}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-surfaceMuted p-4">
        <p className="mb-1 text-xs uppercase tracking-wide text-inkdim">Course</p>
        <p className="mb-3 font-display font-semibold text-ink">{course?.name || 'Course'}</p>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-inkdim">Amount paid</span>
          <span className="font-display text-xl font-semibold text-ink">
            {formatNaira(amountKobo / 100)}
          </span>
        </div>
      </div>

      {!compact && (
        <p className="mt-5 text-xs text-inkdim">
          This receipt was generated automatically and serves as proof of
          payment for the course listed above. For any billing questions,
          contact{' '}
          <a href="mailto:aboyadematthew@gmail.com" className="text-brand underline">
            aboyadematthew@gmail.com
          </a>{' '}
          and reference {reference}.
        </p>
      )}
    </div>
  );
}
