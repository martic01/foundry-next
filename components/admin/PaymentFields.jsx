'use client';

import { PAYMENT_STATUSES, PAYMENT_METHODS } from '../../lib/payments';
import { formatNaira } from '../../lib/courses';

// The payment inputs shared by "Add a student directly" and the Payments
// ledger's "Edit payment". Fully controlled: the parent owns `value`
// ({ status, received, total, method }, amounts as naira strings) and
// hands it straight to the server action, which re-validates everything
// (lib/payments.js -> parsePaymentInput). Nothing here is trusted.

export function blankPayment(priceNaira) {
  return { status: 'paid', received: String(priceNaira), total: String(priceNaira), method: 'cash' };
}

export default function PaymentFields({ value, onChange, priceNaira, disabled }) {
  const set = (patch) => onChange({ ...value, ...patch });

  // Switching status pre-fills sensible numbers so the common cases are
  // one tap: Paid -> full price; Part -> total = price, received blank
  // (they type it); Pending -> total = price.
  function changeStatus(status) {
    const next = { ...value, status };
    if (status === 'paid') next.received = value.status === 'paid' && value.received ? value.received : String(priceNaira);
    if (status === 'part') {
      next.received = value.status === 'part' ? value.received : '';
      next.total = value.total || String(priceNaira);
    }
    if (status === 'pending') next.total = value.total || String(priceNaira);
    onChange(next);
  }

  const showReceived = value.status === 'paid' || value.status === 'part';
  const showTotal = value.status === 'part' || value.status === 'pending';

  const received = Number(String(value.received).replace(/,/g, '')) || 0;
  const total = Number(String(value.total).replace(/,/g, '')) || priceNaira;
  const balance = value.status === 'part' ? Math.max(0, total - received) : value.status === 'pending' ? total : 0;

  // One plain sentence saying what will be recorded, so the common case
  // (pick a status, done) needs no reading of the number fields at all.
  const summary = {
    paid: `Records ${formatNaira(received || priceNaira)} received (${(PAYMENT_METHODS[value.method] || 'cash').toLowerCase()}).`,
    part: !received
      ? 'Enter how much has been received so far.'
      : received >= total
        ? 'That covers the full amount \u2014 choose Paid instead.'
        : `Records ${formatNaira(received)} received, ${formatNaira(balance)} still owed.`,
    pending: `${formatNaira(total)} is owed. Nothing received yet.`,
    free: 'No charge \u2014 nothing is owed.'
  }[value.status];

  const label = 'mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim';

  const fields = (
    <div className="grid gap-3 sm:grid-cols-2">
      {showReceived && (
        <label>
          <span className={label}>{value.status === 'part' ? 'Received so far (\u20a6)' : 'Amount received (\u20a6)'}</span>
          <input type="text" inputMode="decimal" value={value.received} onChange={(e) => set({ received: e.target.value })} placeholder={String(priceNaira)} className="field" />
        </label>
      )}
      {showTotal && (
        <label>
          <span className={label}>{value.status === 'pending' ? 'Amount owed (\u20a6)' : 'Total agreed (\u20a6)'}</span>
          <input type="text" inputMode="decimal" value={value.total} onChange={(e) => set({ total: e.target.value })} placeholder={String(priceNaira)} className="field" />
        </label>
      )}
      {showReceived && (
        <label>
          <span className={label}>Paid by</span>
          <select value={value.method} onChange={(e) => set({ method: e.target.value })} className="field">
            {Object.entries(PAYMENT_METHODS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );

  return (
    <fieldset className="rounded-lg border border-line bg-surfaceMuted p-4" disabled={disabled}>
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-inkdim">Payment status</legend>

      <div role="radiogroup" aria-label="Payment status" className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1 text-sm font-medium sm:grid-cols-4">
        {Object.entries(PAYMENT_STATUSES).map(([key, s]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value.status === key}
            title={s.hint}
            onClick={() => changeStatus(key)}
            className={`rounded-md px-2 py-1.5 text-xs transition sm:text-sm ${
              value.status === key ? 'bg-brand text-ink shadow-sm' : 'text-inkdim hover:text-ink'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-inkdim">{summary}</p>

      {/* Part payment can't work without numbers, so its fields are
          always open. Paid and Pending already have a sensible default
          (the course price), so changing it is optional and folded away. */}
      {value.status === 'part' && <div className="mt-3">{fields}</div>}
      {(value.status === 'paid' || value.status === 'pending') && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-brand hover:underline">
            {value.status === 'paid' ? 'Change amount or payment method' : 'Change amount owed'}
          </summary>
          <div className="mt-3">{fields}</div>
        </details>
      )}
    </fieldset>
  );
}
