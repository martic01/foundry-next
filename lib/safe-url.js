// URL validation. Admin-entered URLs get rendered into href/src on student
// pages, so a `javascript:` or `data:` URL must never get through.

export function parseHttpUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

// For rendering: returns the URL string if it is http(s), else '#'.
export function safeHref(raw) {
  const u = parseHttpUrl(raw);
  return u ? u.toString() : '#';
}

// A video URL must be an https Cloudinary delivery URL under OUR cloud.
export function parseCloudinaryVideoUrl(raw, cloudName) {
  const u = parseHttpUrl(raw);
  if (!u || u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com') return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] !== cloudName || parts[1] !== 'video' || parts[2] !== 'upload') return null;
  return u.toString();
}

export function isPlausiblePublicId(id) {
  return typeof id === 'string' && id.length <= 255 && /^[A-Za-z0-9_\-./]+$/.test(id);
}
