import ErrorScreen from '../../components/ui/ErrorScreen';
import { NOINDEX } from '../../lib/seo';

export const metadata = { title: 'Network is down — The Foundry', ...NOINDEX };

// Where portal pages send people when Supabase can't be reached (see
// lib/supabase/session.js). `next` is the page to return to; only same-site
// paths are honoured.
export default function OfflinePage({ searchParams }) {
  const raw = typeof searchParams?.next === 'string' ? searchParams.next : '/';
  const next = raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\') && !raw.startsWith('/offline') ? raw : '/';
  return <ErrorScreen forceNetwork retryTo={next} />;
}
