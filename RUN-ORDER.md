
## Certificate QR + SEO (no new SQL)
The verify page uses the existing `certificates` table and `check_rate_limit`. Set `NEXT_PUBLIC_SITE_URL` to your real domain, because the QR code on every certificate points to `${NEXT_PUBLIC_SITE_URL}/verify/<code>`.
