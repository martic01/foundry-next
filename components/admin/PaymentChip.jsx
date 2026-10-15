// The coloured "Paid / Part payment / Payment pending / Complimentary"
// chip. One component so the Students list, batch lists and Payments
// ledger all look the same. `payment` is the object from getPayment()
// (lib/payments.js). No hooks: usable from server and client components.
const TONE = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
  warn: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
  muted: 'border-line bg-surfaceMuted text-inkdim'
};

export default function PaymentChip({ payment }) {
  if (!payment) return null;
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE[payment.tone]}`}
    >
      {payment.label}
    </span>
  );
}
