'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Pencil, Check, X } from 'lucide-react';
import { updateRegistrationPayment } from '../../app/admin/actions';
import { formatNaira } from '../../lib/courses';
import { getPayment, isAdminAdded, getSource } from '../../lib/payments';
import SourceBadge from './SourceBadge';
import PaymentChip from './PaymentChip';
import PaymentFields from './PaymentFields';

// One line of the Payments ledger. Paystack payments are read-only;
// directly-added students get an Edit button (pending -> paid, record
// another instalment, fix a typo).
export default function PaymentRow({ reg, studentName, courseName, priceNaira }) {
  const payment = getPayment(reg);
  const editable = isAdminAdded(reg);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState({
    status: payment.status,
    received: payment.receivedKobo ? String(payment.receivedKobo / 100) : '',
    total: reg.amount_due_kobo ? String(reg.amount_due_kobo / 100) : String(priceNaira),
    method: reg.payment_method || 'cash'
  });
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateRegistrationPayment(reg.id, value);
      if (res?.error) setError(res.error);
      else {
        setError('');
        setEditing(false);
      }
    });
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
        <div className="mt-3 flex flex-col gap-3">
          <PaymentFields value={value} onChange={setValue} priceNaira={priceNaira} disabled={isPending} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={isPending} className="cta-btn !px-4 !py-2 text-xs">
              <Check className="h-3.5 w-3.5" /> Save payment
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError('');
              }}
              disabled={isPending}
              className="cta-btn-outline !px-4 !py-2 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
