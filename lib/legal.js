import { unstable_cache } from 'next/cache';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { LEGAL_DEFAULTS } from './legal-defaults';

export const LEGAL_TAG = 'legal-docs';
export const LEGAL_LIMITS = { sections: 60, items: 60, text: 4000, title: 160, summary: 20, intro: 2000, updated: 300 };

// Accepts only the exact shape we render; everything is plain text.
export function cleanLegal(raw) {
  const s = (v, max) => (typeof v === 'string' ? v.replace(/\r/g, '').trim().slice(0, max) : '');
  const list = (a, max, n) => (Array.isArray(a) ? a.map((x) => s(x, max)).filter(Boolean).slice(0, n) : []);
  if (!raw || typeof raw !== 'object') return null;
  const sections = (Array.isArray(raw.sections) ? raw.sections : []).slice(0, LEGAL_LIMITS.sections)
    .map((x) => ({ title: s(x?.title, LEGAL_LIMITS.title), items: list(x?.items, LEGAL_LIMITS.text, LEGAL_LIMITS.items) }))
    .filter((x) => x.title);
  if (!sections.length) return null;
  return {
    title: s(raw.title, 120) || 'Terms & Policy',
    updated: s(raw.updated, LEGAL_LIMITS.updated),
    intro: s(raw.intro, LEGAL_LIMITS.intro),
    summary: list(raw.summary, LEGAL_LIMITS.text, LEGAL_LIMITS.summary),
    sections
  };
}

const readSaved = unstable_cache(async () => {
  try {
    const sb = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.from('legal_docs').select('doc, content, updated_at');
    return error ? [] : data || [];
  } catch { return []; }
}, ['legal-docs'], { tags: [LEGAL_TAG], revalidate: 300 });

// The text to show for 'terms' | 'privacy': saved copy, else the built-in one.
export async function getLegal(doc) {
  const rows = await readSaved();
  const saved = cleanLegal(rows.find((r) => r.doc === doc)?.content);
  return { ...(saved || LEGAL_DEFAULTS[doc]), custom: !!saved };
}

// For the admin editor: uses the caller's own (admin) client.
export async function getLegalForAdmin(supabase, doc) {
  const { data } = await supabase.from('legal_docs').select('content, updated_at').eq('doc', doc).maybeSingle();
  const saved = cleanLegal(data?.content);
  return { content: saved || LEGAL_DEFAULTS[doc], custom: !!saved, updatedAt: data?.updated_at || null };
}
