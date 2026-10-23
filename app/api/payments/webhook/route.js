import { NextResponse } from 'next/server';
import { isValidPaystackSignature } from '../../../../lib/paystack';
import { finalizePayment } from '../../../../lib/finalize-payment';

// Paystack calls this itself when a payment succeeds, even if the student
// closed the tab before the browser could confirm it. Set the URL in the
// Paystack dashboard: Settings > API Keys & Webhooks > Webhook URL
//   https://YOUR-DOMAIN/api/payments/webhook
// Nothing here trusts the request until its signature checks out.
export async function POST(request) {
  const raw = await request.text();
  if (!(await isValidPaystackSignature(raw, request.headers.get('x-paystack-signature')))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }
  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  if (event?.event === 'charge.success' && typeof event.data?.reference === 'string') {
    const result = await finalizePayment(event.data.reference);
    // A temporary failure answers 500 so Paystack retries later. Anything
    // permanent is already flagged for the admin, so answer 200 to stop retries.
    if (!result.ok && result.retryable) return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
