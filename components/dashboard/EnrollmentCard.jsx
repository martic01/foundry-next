import { CheckCircle2, CalendarDays, Layers, BadgeCheck, Link2 } from 'lucide-react';
import { getPayment } from '../../lib/payments';
import { formatStartDate } from '../../lib/batch-timer';

// Overview card under the profile card: which batch the student is in,
// the course details, the batch start date, and payment status -- the
// four things a student most often wonders about.
export default function EnrollmentCard({ registration, course, batch, linkCount }) {
  const payment = getPayment(registration);
  const badgeTone = {
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
    warn: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
    muted: 'border-line bg-surfaceMuted text-inkdim'
  }[payment.tone];
  const paidOn = new Date(registration.created_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="card overflow-hidden">
      <div className="h-1" style={{ backgroundColor: course?.accent }} />
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold text-ink">{course?.name || registration.course}</p>
            {course?.tagline && <p className="text-sm text-inkdim">{course.tagline}</p>}
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone}`}>
            <BadgeCheck className="h-3.5 w-3.5" /> {payment.label}
          </span>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surfaceMuted p-3">
            <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-inkdim">
              <Layers className="h-3.5 w-3.5" /> Your batch
            </dt>
            <dd className="font-semibold text-ink">{batch?.label || 'Batch assignment pending'}</dd>
          </div>

          <div className="rounded-lg border border-line bg-surfaceMuted p-3">
            <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-inkdim">
              <CalendarDays className="h-3.5 w-3.5" /> Course starts
            </dt>
            <dd className="font-semibold text-ink">
              {batch?.start_date ? formatStartDate(batch.start_date) : 'To be announced'}
            </dd>
          </div>

          <div className="rounded-lg border border-line bg-surfaceMuted p-3">
            <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-inkdim">
              <CheckCircle2 className="h-3.5 w-3.5" /> Payment
            </dt>
            <dd className="font-semibold text-ink">
              {payment.status === 'paid' ? `${payment.detail} \u00b7 paid ${paidOn}` : payment.detail}
              {payment.method && payment.status !== 'paid' ? ` \u00b7 ${payment.method}` : ''}
            </dd>
          </div>

          <div className="rounded-lg border border-line bg-surfaceMuted p-3">
            <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-inkdim">
              <Link2 className="h-3.5 w-3.5" /> Class link
            </dt>
            <dd className="font-semibold text-ink">{linkCount ? 'Posted' : 'Not posted yet'}</dd>
          </div>
        </dl>

        {!!course?.learn?.length && (
          <ul className="mt-4 grid gap-1.5 text-xs text-inkdim sm:grid-cols-2">
            {course.learn.slice(0, 4).map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand" /> {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
