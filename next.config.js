/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.paystack.co")' },
  // frame-ancestors is the modern clickjacking guard. A full script-src CSP
  // is not set: Next.js inline scripts + the Paystack widget need a
  // nonce-based setup; add it deliberately and test the payment flow.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // A full policy in REPORT-ONLY mode: it blocks nothing, but the browser
  // console lists anything it would have blocked. Click through sign-in,
  // payment, video playback and uploads once; if the console shows no
  // violations, rename this header to Content-Security-Policy to enforce
  // it (and then drop 'unsafe-eval' unless something needs it).
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://checkout.paystack.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co https://lh3.googleusercontent.com https://*.paystack.co https://*.paystack.com",
      "media-src 'self' blob: https://res.cloudinary.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://*.paystack.co https://*.paystack.com",
      "frame-src https://checkout.paystack.com https://js.paystack.co https://www.youtube.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'"
    ].join('; ')
  }
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The app uses plain <img> tags only, so the /_next/image optimizer isn't
  // needed -- turning it off removes an attack surface (Next 14 has no
  // patch for the 2026 image-optimizer vulnerabilities: AVIF/SVG RCE, SSRF, DoS).
  images: { unoptimized: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

module.exports = nextConfig;
