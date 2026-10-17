'use client';

import { useMemo, useState } from 'react';
import { formatNaira } from '../../lib/courses';
import { getPayment, getSource, summarizePayments, REGISTRATION_SOURCES } from '../../lib/payments';
import PaymentStatTiles from './PaymentStatTiles';
import PaymentRow from './PaymentRow';
import SearchBox, { matchesQuery } from '../ui/SearchBox';

// Payments page body: stats, filters, and the ledger. The stat tiles
// always count EVERYONE (so the numbers don't jump around as you filter);
// the list below narrows by status and by how they registered.
export default function PaymentsLedger({ rows, initialStatus = 'all' }) {
  const [status, setStatus] = useState(initialStatus);
  const [source, setSource] = useState('all');
  const [q, setQ] = useState('');

  const summary = useMemo(() => summarizePayments(rows.map((r) => r.reg)), [rows]);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (status === 'all' || getPayment(r.reg).status === status) &&
          (source === 'all' || getSource(r.reg) === source) &&
          matchesQuery(q, r.studentName, r.reg.profiles?.email, r.courseName, r.reg.paystack_reference)
      ),
    [rows, status, source, q]
  );

  const inView = useMemo(() => summarizePayments(visible.map((r) => r.reg)), [visible]);
  const filtered = status !== 'all' || source !== 'all' || q.trim() !== '';

  const chip = (key, label, count) => (
    <button
      key={key}
      type="button"
      onClick={() => setSource(key)}
      aria-pressed={source === key}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        source === key ? 'border-brand bg-brand/10 text-ink' : 'border-line text-inkdim hover:text-ink'
      }`}
    >
      {label} <span className="text-inkdim">({count})</span>
    </button>
  );

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-inkdim">Collected</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink">{formatNaira(summary.collectedKobo / 100)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-inkdim">Outstanding</p>
          <p className={`mt-1 font-display text-2xl font-extrabold ${summary.outstandingKobo > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-ink'}`}>
            {formatNaira(summary.outstandingKobo / 100)}
          </p>
          <p className="text-xs text-inkdim">
            {summary.owingCount} {summary.owingCount === 1 ? 'student owes' : 'students owe'} money
          </p>
        </div>
      </div>

      <div className="mb-4">
        <PaymentStatTiles summary={summary} active={status} onSelect={setStatus} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-inkdim">Registered</span>
        {chip('all', 'Any way', summary.total)}
        {chip('manual', REGISTRATION_SOURCES.manual.label, summary.bySource.manual)}
        {chip('gateway', REGISTRATION_SOURCES.gateway.label, summary.bySource.gateway)}
      </div>

      {filtered && (
        <p className="mb-3 text-xs text-inkdim">
          Showing {visible.length} of {rows.length} · {formatNaira(inView.collectedKobo / 100)} collected
          {inView.outstandingKobo > 0 && <> · {formatNaira(inView.outstandingKobo / 100)} owed</>}{' '}
          <button
            type="button"
            onClick={() => {
              setStatus('all');
              setSource('all');
            }}
            className="font-medium text-brand hover:underline"
          >
            Clear filters
          </button>
        </p>
      )}

      <SearchBox value={q} onChange={setQ} placeholder="Search by name, email, course or Paystack reference" className="mb-3" />
      {!visible.length ? (
        <div className="card p-6 text-sm text-inkdim">{rows.length ? 'No one matches these filters.' : 'No payments yet.'}</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="flex flex-col divide-y divide-line">
            {visible.map((r) => (
              <PaymentRow key={r.reg.id} reg={r.reg} studentName={r.studentName} courseName={r.courseName} priceNaira={r.priceNaira} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
