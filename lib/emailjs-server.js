// @emailjs/browser only works in the browser -- this hits EmailJS's own
// REST API directly instead, so the admin-notification email can be sent
// from server-side code (app/api/payments/verify/route.js) right after a
// registration completes. This is the ONLY thing EmailJS is used for in
// this app -- email verification is handled entirely by Google sign-in
// (see components/RegisterFlow.jsx), not by any email/code sent here.
export async function sendServerEmail({ templateId, params }) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: params
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('EmailJS send failed: ' + text);
  }
}
