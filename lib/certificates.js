// Certificate wording and code helpers (safe for server and browser).

// What the certificate says for each course -- the full programme name,
// not the short card name. Edit here to change the wording.
export const CERTIFICATE_TITLES = {
  foundations: 'Frontend Web Development — HTML, CSS, JavaScript & AI',
  react: 'Full Frontend Development with React & AI',
  cybersecurity: 'Cybersecurity & AI Professional Program',
  hr: 'Human Resources — People, Strategy & Impact'
};

export const certificateTitleFor = (course) => CERTIFICATE_TITLES[course] || null;

// No 0/O/1/I/L so an id read aloud or typed from paper isn't ambiguous.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 12;

// "ab3k-9xqm 2tfw" -> "AB3K9XQM2TFW" (null if it can't be a valid id)
export function normalizeCode(raw) {
  const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === CODE_LENGTH ? c : null;
}

// "AB3K9XQM2TFW" -> "AB3K-9XQM-2TFW"
export const formatCode = (code) => (code ? String(code).replace(/(.{4})(?=.)/g, '$1-') : '');

export function formatCertDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });
}

// The name printed on the certificate, entered by the student before they
// register. Letters (any language), spaces, ' - . only; at least two words.
export function validateCertificateName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (name.length < 5) return { error: 'Enter your full name (first and last name) exactly as it should appear on your certificate.' };
  if (name.length > 100) return { error: 'That name is too long (100 characters max).' };
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'\u2019-]*$/u.test(name)) return { error: 'Use letters only in your name (spaces, hyphens and apostrophes are fine).' };
  if (name.split(' ').filter((w) => w.length > 0).length < 2) return { error: 'Enter your full name \u2014 at least a first and a last name.' };
  // All-lowercase / all-caps input looks wrong on a certificate: tidy it. Mixed case is left exactly as typed.
  const tidy = name === name.toLowerCase() || name === name.toUpperCase()
    ? name.toLowerCase().replace(/(^|[\s'\u2019-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
    : name;
  return { ok: true, name: tidy };
}
