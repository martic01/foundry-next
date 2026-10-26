// Pure helpers (no server code), so client components can import them
// without pulling next/cache or the database client into the browser bundle.
// "08027245572" / "+234 802 724 5572" / "2348027245572" -> "2348027245572"
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/[^\d]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '234' + d.slice(1);
  return d;
}
export const isValidPhone = (raw) => /^\d{10,15}$/.test(normalizePhone(raw));
export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '')) && String(e).length <= 254;
