import { unstable_cache } from 'next/cache';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { normalizePhone, isValidPhone, isValidEmail } from './contact-validation';

// Contact details for the HR service, the workspace and the event center. The admin edits
// them in the Registration tab of /admin (stored in site_settings); these are the
// defaults used until then.
export const SITE_CONTACT_DEFAULTS = {
  hr: { whatsapp: '08027245572', email: 'olufunmione@gmail.com' },
  workspace: {
    whatsapp: '08027245572',
    email: 'olufunmione@gmail.com',
    address: 'Yaya Abatan Road, Ogba, Lagos'
  },
  event: {
    whatsapp: '08027245572',
    email: 'olufunmione@gmail.com',
    address: 'Yaya Abatan Road, Ogba, Lagos'
  }
};
export const SITE_CONTACT_KEYS = Object.keys(SITE_CONTACT_DEFAULTS);
export const SITE_CONTACTS_TAG = 'site-contacts';

export { normalizePhone, isValidPhone, isValidEmail };

export function whatsappLink(phone, text) {
  const n = normalizePhone(phone);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

function merge(rows) {
  const out = JSON.parse(JSON.stringify(SITE_CONTACT_DEFAULTS));
  (rows || []).forEach((r) => {
    if (out[r.key] && r.value && typeof r.value === 'object') out[r.key] = { ...out[r.key], ...r.value };
  });
  return out;
}

// Works with the session client or the service-role client.
export async function getSiteContacts(supabase) {
  const { data, error } = await supabase.from('site_settings').select('key, value');
  return merge(error ? [] : data);
}

// Cached, cookie-less read for the public pages (table is public-read).
export const getPublicSiteContacts = unstable_cache(
  async () => {
    const supabase = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    return getSiteContacts(supabase);
  },
  ['public-site-contacts'],
  { revalidate: 60, tags: [SITE_CONTACTS_TAG] }
);
