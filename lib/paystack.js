// Confirms with Paystack itself that a transaction really succeeded --
// this is what makes payment verification trustworthy. The client-side
// Paystack popup calling "onSuccess" is NOT proof of payment on its own;
// that callback firing only means the browser *believes* it went
// through, and browser-side JS can be tampered with. This hits Paystack's
// API directly, server-to-server, using the secret key, which the
// browser never sees.
export async function verifyPaystackTransaction(reference) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    cache: 'no-store'
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message || 'Could not verify transaction with Paystack.');
  }
  return json.data; // { status, amount, currency, reference, ... }
}

// Turns Paystack's own transaction fields into a human "how they paid"
// line for the receipt -- e.g. "Mastercard ending in 4081" or "Bank
// Transfer" -- instead of just showing a reference number with no
// context on what was actually charged.
export function describePaystackChannel(txn) {
  if (!txn) return null;
  if (txn.channel === 'card' && txn.authorization?.last4) {
    const brand = txn.authorization.card_type || txn.authorization.brand || 'Card';
    const bank = txn.authorization.bank ? ` · ${txn.authorization.bank}` : '';
    return `${brand} ending in ${txn.authorization.last4}${bank}`;
  }
  if (txn.channel) {
    return txn.channel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

// Starts a transaction from the SERVER, so the amount is chosen here and the
// browser only receives an access code to open. Amount is in kobo.
export async function initializePaystackTransaction({ email, amountKobo, reference, metadata }) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('Payment isn’t configured yet. Please check back soon.');
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, amount: amountKobo, currency: 'NGN', reference, metadata }),
    cache: 'no-store'
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.status) throw new Error(json.message || 'Could not start the payment with Paystack.');
  return json.data; // { authorization_url, access_code, reference }
}

// Paystack signs every webhook: HMAC-SHA512 of the raw body with the secret
// key, sent in the x-paystack-signature header.
export async function isValidPaystackSignature(rawBody, signature) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const { createHmac, timingSafeEqual } = await import('node:crypto');
  const expected = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}
