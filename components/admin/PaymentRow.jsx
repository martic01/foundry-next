'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Pencil, Check, X, Loader2, Undo2, ArrowRight } from 'lucide-react';
import { updateRegistrationPayment } from '../../app/admin/actions';
import { formatNaira } from '../../lib/courses';
import { getPayment, isAdminAdded, getSource, PAYMENT_STATUSES, PAYMENT_METHODS } from '../../lib/payments';
import SourceBadge from './SourceBadge';
import PaymentChip from './PaymentChip';
import PaymentFields from './PaymentFields';

// What changed between the last saved values and what is on screen now,
// like "track changes": only fields that matter for the chosen status.
function diffPayment(saved, now) {
  const rows = [];
  const num = (v) => (String(v ?? '').trim() === '' ? '\u2014' : formatNaira(Number(String(v).replace(/,/g, '')) || 0));
  if (saved.status !== now.status) rows.push({ key: 'status', label: 'Status', from: PAYMENT_STATUSES[saved.status]?.label || saved.status, to: PAYMENT_STATUSES[now.status]?.label || now.status });
  const showReceived = now.status === 'paid' || now.status === 'part';
  const showTotal = now.status === 'part' || now.status === 'pending';
  const same = (a, b) => String(a ?? '').replace(/,/g, '').trim() === String(b ?? '').replace(/,/g, '').trim();
  if (showReceived && !same(saved.received, now.received)) rows.push({ key: 'received', label: 'Received', from: num(saved.received), to: num(now.received) });
  if (showTotal && !same(saved.total, now.total)) rows.push({ key: 'total', label: now.status === 'pending' ? 'Owed' : 'Total agreed', from: num(saved.total), to: num(now.total) });
  if (showReceived && saved.method !== now.method) rows.push({ key: 'method', label: 'Paid by', from: PAYMENT_METHODS[saved.method] || saved.method, to: PAYMENT_METHODS[now.method] || now.method });
  return rows;
}

const clock = (d) => d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });

// One line of the Payments ledger. Paystack payments are read-only;
// directly-added students get an Edit button (pending -> paid, record
// another instalment, fix a typo).
export default function PaymentRow({ reg, studentName, courseName, priceNaira }) {
  const payment = getPayment(reg);
  const editable = isAdminAdded(reg);
  const [editing, setEditing] = useState(false);
  const initial = {
    status: payment.status,
    received: payment.receivedKobo ? String(payment.receivedKobo / 100) : '',
    total: reg.amount_due_kobo ? String(reg.amount_due_kobo / 100) : String(priceNaira),
    method: reg.payment_method || 'cash'
  };
  const [saved, setSaved] = useState(initial); // what is stored right now
  const [value, setValue] = useState(initial); // what is on screen
  const [savedAt, setSavedAt] = useState(null); // set after a save, cleared by the next edit
  const [log, setLog] = useState([]); // changes saved during this visit
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const changes = diffPayment(saved, value);
  const dirty = changes.length > 0;

  function edit(next) {
    setValue(next);
    setSavedAt(null); // the "Saved" tick is only true until you touch something
    setError('');
  }

  function save() {
    if (!dirty) return;
    const made = changes;
    startTransition(async () => {
      const res = await updateRegistrationPayment(reg.id, value);
      if (res?.error) {
        setError(res.error);
        return;
      }
      const now = new Date();
      setSaved(value);
      setSavedAt(now);
      setLog((l) => [{ at: now, rows: made }, ...l]);
    });
  }

  function revert() {
    setValue(saved);
    setSavedAt(null);
    setError('');
  }

  const hasReceipt = payment.receivedKobo > 0;
  const info = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate font-medium text-ink">{studentName}</p>
        <SourceBadge source={getSource(reg)} />
        <PaymentChip payment={payment} />
      </div>
      <p className="truncate text-xs text-inkdim">
        {courseName} · {new Date(reg.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
        {payment.method ? ` · ${payment.method}` : ''}
      </p>
      <p className="truncate text-xs text-inkdim">
        {editable ? 'Added by admin' : `Ref: ${reg.paystack_reference}`}
        {payment.balanceKobo > 0 ? ` · ${formatNaira(payment.balanceKobo / 100)} outstanding` : ''}
      </p>
    </div>
  );

  return (
    <div className="p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        {hasReceipt ? (
          <Link href={`/receipt/${reg.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 rounded transition hover:opacity-80">
            {info}
          </Link>
        ) : (
          <div className="min-w-0 flex-1">{info}</div>
        )}
        <div className="flex flex-shrink-0 items-center gap-3">
          <p className="font-semibold text-ink">{formatNaira(payment.receivedKobo / 100)}</p>
          {editable && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-line p-1.5 text-inkdim transition hover:border-brand/40 hover:text-brand"
              aria-label={`Edit payment for ${studentName}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className={`mt-3 flex flex-col gap-3 rounded-lg border-l-4 pl-3 transition-colors ${dirty ? 'border-amber-400' : savedAt ? 'border-emerald-500' : 'border-transparent'}`}>
          <PaymentFields value={value} onChange={edit} priceNaira={priceNaira} disabled={isPending} />

          {/* track-changes view: old value struck through, new value highlighted */}
          {dirty && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs" aria-live="polite">
              <p className="mb-2 font-semibold uppercase tracking-wide text-amber-800">{changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}</p>
              <ul className="space-y-1">
                {changes.map((c) => (
                  <li key={c.key} className="flex flex-wrap items-center gap-1.5 text-ink">
                    <span className="w-24 text-inkdim">{c.label}</span>
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 line-through">{c.from}</span>
                    <ArrowRight className="h-3 w-3 text-inkdim" />
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">{c.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={isPending || !dirty} className="cta-btn !px-4 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {isPending ? 'Saving\u2026' : 'Save payment'}
            </button>
            {dirty && !isPending && (
              <button onClick={revert} className="cta-btn-outline !px-3 !py-2 text-xs">
                <Undo2 className="h-3.5 w-3.5" /> Undo changes
              </button>
            )}
            <button
              onClick={() => {
                setEditing(false);
                setError('');
                if (dirty) revert();
              }}
              disabled={isPending}
              className="cta-btn-outline !px-4 !py-2 text-xs"
            >
              <X className="h-3.5 w-3.5" /> {dirty ? 'Cancel' : 'Close'}
            </button>
            <span className="ml-auto text-xs" role="status" aria-live="polite">
              {isPending ? <span className="text-inkdim">Saving&hellip;</span>
                : dirty ? <span className="font-medium text-amber-700">Unsaved changes</span>
                : savedAt ? <span className="font-medium text-emerald-700">Saved at {clock(savedAt)}</span>
                : <span className="text-inkdim">No changes yet</span>}
            </span>
          </div>

          {log.length > 0 && (
            <details className="text-xs text-inkdim">
              <summary className="cursor-pointer font-medium text-brand hover:underline">Changes saved this visit ({log.length})</summary>
              <ul className="mt-2 space-y-1.5">
                {log.map((entry, i) => (
                  <li key={i}>
                    <span className="font-medium text-ink">{clock(entry.at)}</span>{' '}
                    {entry.rows.map((c) => `${c.label}: ${c.from} \u2192 ${c.to}`).join(' \u00b7 ')}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
