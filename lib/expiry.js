// Expiry dates for announcements, class links and videos.
// An item has an optional expires_at (null = never expires). Pure, shared
// by the form (client) and the server actions.

export const EXPIRY_PRESETS = [
  { key: 'never', label: 'Never expires' },
  { key: '1d', label: 'In 1 day', ms: 86400000 },
  { key: '3d', label: 'In 3 days', ms: 3 * 86400000 },
  { key: '1w', label: 'In 1 week', ms: 7 * 86400000 },
  { key: '2w', label: 'In 2 weeks', ms: 14 * 86400000 },
  { key: '1m', label: 'In 30 days', ms: 30 * 86400000 },
  { key: 'custom', label: 'Pick a date & time…' }
];

// Lagos is UTC+1 all year (no daylight saving), so a "datetime-local"
// value typed by the admin can be read as +01:00 without any library.
export const LAGOS_OFFSET_MS = 3600000;

export const defaultExpiry = () => ({ mode: 'never', custom: '' });

// UI state -> ISO string or null. Returns { iso } or { error }.
export function expiryToIso(state, now = Date.now()) {
  const mode = state?.mode || 'never';
  if (mode === 'never') return { iso: null };
  const preset = EXPIRY_PRESETS.find((p) => p.key === mode && p.ms);
  if (preset) return { iso: new Date(now + preset.ms).toISOString() };
  if (mode === 'custom') {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(state.custom || '')) return { error: 'Pick the date and time it should expire.' };
    const ms = Date.parse(`${state.custom}:00+01:00`);
    if (Number.isNaN(ms)) return { error: 'That expiry date isn’t valid.' };
    return { iso: new Date(ms).toISOString() };
  }
  return { error: 'Choose when it should expire.' };
}

// Existing expires_at -> UI state (for editing).
export function expiryFromIso(iso) {
  if (!iso) return defaultExpiry();
  const local = new Date(new Date(iso).getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 16);
  return { mode: 'custom', custom: local };
}

// SERVER-side validation of whatever the client sent.
// null / '' / undefined -> never. Otherwise it must be an ISO date that's
// at least a minute away and at most 3 years out.
export function parseExpiry(value, now = Date.now()) {
  if (value === null || value === undefined || value === '') return { value: null };
  if (typeof value !== 'string' || value.length > 40) return { error: 'That expiry date isn’t valid.' };
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return { error: 'That expiry date isn’t valid.' };
  if (ms < now + 60000) return { error: 'The expiry must be in the future.' };
  if (ms > now + 3 * 365 * 86400000) return { error: 'The expiry can’t be more than 3 years away.' };
  return { value: new Date(ms).toISOString() };
}

export function isExpired(item, now = Date.now()) {
  return !!item?.expires_at && new Date(item.expires_at).getTime() <= now;
}

export function formatExpiry(iso) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos'
  });
}
