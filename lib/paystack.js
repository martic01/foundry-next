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
