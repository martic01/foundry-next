import { formatNaira } from './courses';

// Payment status for registrations the ADMIN creates (cash / transfer /
// comps). Paystack registrations are always 'paid' and are verified by
// /api/payments/verify -- nothing here changes them.
//
// This is deliberately separate from registrations.status:
//   status ('paid' | 'removed')  -> does the student have access?
//   payment_status               -> how much of the money is in?
// An enrolled student gets full access whichever payment status the
// admin picks; "pending" is a note-to-self with a balance attached, not
// a lock. (Use Block / Remove to cut access.)

export const PAYMENT_STATUSES = {
  paid: { label: 'Paid', hint: 'Full amount received' },
  part: { label: 'Part payment', hint: 'Some received, balance owed' },
  pending: { label: 'Payment pending', hint: 'Nothing received yet' },
  free: { label: 'Complimentary', hint: 'No charge (comp)' }
};

export const PAYMENT_METHODS = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  pos: 'POS',
  other: 'Other'
};

// Admin-created registrations carry this reference prefix instead of a
// Paystack one -- it's how the app tells "editable manual record" from
// "verified Paystack payment" apart.
export const ADMIN_REF_PREFIX = 'ADMIN-ADDED-';
export const isAdminAdded = (reg) => !!reg?.paystack_reference?.startsWith(ADMIN_REF_PREFIX);

// How a registration came to exist -- shown as a chip next to the student
// in the admin lists. Derived from the reference rather than stored, so
// it is right for every registration that already exists too:
//   'manual'  -> an admin added them (cash / transfer / comp)
//   'gateway' -> they registered and paid online through Paystack
export const REGISTRATION_SOURCES = {
  manual: { label: 'Manual', title: 'Registered manually by an admin' },
  gateway: { label: 'Paystack', title: 'Registered and paid online through Paystack' }
};
export const getSource = (reg) => (isAdminAdded(reg) ? 'manual' : 'gateway');

const MAX_NAIRA = 10_000_000;

// Everything the UI needs to describe one registration's payment.
//   tone: 'ok' (settled) | 'warn' (money still owed) | 'muted' (comp)
export function getPayment(reg) {
  const status = PAYMENT_STATUSES[reg?.payment_status] ? reg.payment_status : 'paid';
  const receivedKobo = reg?.amount_kobo || 0;
  const dueKobo = reg?.amount_due_kobo ?? receivedKobo;
  const owes = status === 'part' || status === 'pending';
  const balanceKobo = owes ? Math.max(0, dueKobo - receivedKobo) : 0;
  const method = PAYMENT_METHODS[reg?.payment_method] || null;

  let detail;
  if (status === 'paid') detail = formatNaira(receivedKobo / 100);
  else if (status === 'part') detail = `${formatNaira(receivedKobo / 100)} paid \u00b7 ${formatNaira(balanceKobo / 100)} balance`;
  else if (status === 'pending') detail = `${formatNaira(balanceKobo / 100)} due`;
  else detail = 'No charge';

  return {
    status,
    label: PAYMENT_STATUSES[status].label,
    tone: owes ? 'warn' : status === 'free' ? 'muted' : 'ok',
    receivedKobo,
    dueKobo,
    balanceKobo,
    method,
    detail
  };
}

// "12500" / "12,500.50" / 12500 -> kobo (integer), or null if it isn't a
// sane money amount (negative, NaN, absurdly large, > 2 decimal places).
function toKobo(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0 || n > MAX_NAIRA) return null;
  const kobo = Math.round(n * 100);
  if (Math.abs(kobo - n * 100) > 1e-6) return null;
  return kobo;
}

// Turns what the admin typed into the columns to write, or a message
// saying what's wrong. Pure, and shared by "add student" and "edit
// payment" so both enforce identical rules -- and so it runs BEFORE any
// account is created, never after.
//
// input: { status, received, total, method }  (amounts in naira)
export function parsePaymentInput(input, defaultPriceNaira) {
  const status = input?.status;
  if (!PAYMENT_STATUSES[status]) return { error: 'Choose a payment status.' };

  const needsMethod = (kobo) => kobo > 0 && !PAYMENT_METHODS[input?.method];

  if (status === 'free') {
    return { row: { payment_status: 'free', amount_kobo: 0, amount_due_kobo: null, payment_method: null } };
  }

  if (status === 'paid') {
    const received = toKobo(input.received);
    if (!received) return { error: 'Enter the amount received (use Complimentary for no charge).' };
    if (needsMethod(received)) return { error: 'Choose how it was paid (cash, transfer, POS\u2026).' };
    return {
      row: { payment_status: 'paid', amount_kobo: received, amount_due_kobo: null, payment_method: input.method }
    };
  }

  // part + pending both need an agreed total; blank means "full price".
  const total = input.total === '' || input.total == null ? toKobo(defaultPriceNaira) : toKobo(input.total);
  if (!total) return { error: 'Enter the total amount agreed for this course.' };

  if (status === 'pending') {
    return { row: { payment_status: 'pending', amount_kobo: 0, amount_due_kobo: total, payment_method: null } };
  }

  // part
  const received = toKobo(input.received);
  if (!received) return { error: 'Enter how much has been received so far.' };
  if (received >= total) return { error: 'That covers the whole amount \u2014 choose Paid instead.' };
  if (needsMethod(received)) return { error: 'Choose how it was paid (cash, transfer, POS\u2026).' };
  return {
    row: { payment_status: 'part', amount_kobo: received, amount_due_kobo: total, payment_method: input.method }
  };
}

// One summary for the whole school -- used by the Payments page and the
// admin Overview so the two can never disagree about a number.
//   byStatus[s]  -> { count, receivedKobo, balanceKobo }   (s = paid|part|pending|free)
//   bySource     -> { manual, gateway } registration counts
//   collectedKobo / outstandingKobo -> money in / money still owed
export function summarizePayments(regs) {
  const byStatus = {};
  Object.keys(PAYMENT_STATUSES).forEach((k) => {
    byStatus[k] = { count: 0, receivedKobo: 0, balanceKobo: 0 };
  });
  const bySource = { manual: 0, gateway: 0 };
  let collectedKobo = 0;
  let outstandingKobo = 0;

  for (const reg of regs || []) {
    const p = getPayment(reg);
    byStatus[p.status].count += 1;
    byStatus[p.status].receivedKobo += p.receivedKobo;
    byStatus[p.status].balanceKobo += p.balanceKobo;
    bySource[getSource(reg)] += 1;
    collectedKobo += p.receivedKobo;
    outstandingKobo += p.balanceKobo;
  }

  return {
    total: (regs || []).length,
    byStatus,
    bySource,
    collectedKobo,
    outstandingKobo,
    owingCount: byStatus.part.count + byStatus.pending.count
  };
}
