import { createClient } from '../../../lib/supabase/server';
import { getUser } from '../../../lib/supabase/session';
import MessageFeed from '../../../components/dashboard/MessageFeed';

export const metadata = { title: 'Announcements — The Foundry' };

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const user = await getUser();

  const { count } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'paid');

  return (
    <div>
      <p className="eyebrow mb-2">Announcements</p>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Announcements</h1>

      {!count ? (
        <div className="card p-6 text-sm text-inkdim">
          Announcements will appear here once you&apos;re registered.
        </div>
      ) : (
        <div className="card p-6">
          <MessageFeed />
        </div>
      )}
    </div>
  );
}
