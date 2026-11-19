'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import ExpandableText from '../ui/ExpandableText';
import Tabs from '../Tabs';

const VISIBLE = 5; // newest few shown; older ones tuck behind a button

// Read-only by design -- there's no input here at all. The actual
// enforcement that only the admin can post is the messages_admin_insert
// RLS policy in supabase/schema.sql; this component not having a text box
// is just the UI matching what the database already guarantees.
//
// Row Level Security already limits what comes back to announcements for
// THIS student's batch(es) plus ones aimed at all batches, so there's no
// batch filter here. Any change on the table (new, edited or deleted
// announcement) triggers a refetch, with a 20s poll as a fallback for
// when Realtime isn't enabled on the table.
export default function MessageFeed() {
  const [messages, setMessages] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const q = (cols) => supabase.from('messages').select(cols).order('created_at', { ascending: false });
    const load = async () => {
      let { data, error } = await q('id, content, created_at, updated_at, expires_at, batch_id, target_user_id, batches(label)');
      if (error) ({ data } = await q('id, content, created_at, updated_at, expires_at, batch_id, batches(label)')); // database file 14 not run yet
      if (active && data) setMessages(data);
    };

    load();
    const channel = supabase
      .channel('announcements-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .subscribe();
    const poll = setInterval(load, 20000);

    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  const now = Date.now();
  const live = messages ? messages.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > now) : null;

  if (messages === null) return <p className="text-sm text-inkdim">Loading&hellip;</p>;

  // Two groups: what the school announces to everyone, and what is addressed to this student alone
  // (exam alerts, replies to their reschedule requests).
  const system = live.filter((m) => !m.target_user_id);
  const mine = live.filter((m) => m.target_user_id);
  const newest = (arr) => (arr.length ? arr[0].created_at : null);
  return (
    <Tabs
      seenKey="student-announcements"
      tabs={[
        { key: 'system', label: 'System announcements', latest: newest(system), content: <Feed list={system} empty="No announcements yet — check back before the cohort starts." /> },
        { key: 'mine', label: 'My exam & requests', latest: newest(mine), content: <Feed list={mine} empty="Nothing here yet. Exam alerts and replies to your requests appear here." /> }
      ]}
    />
  );
}

function Feed({ list, empty }) {
  const [showAll, setShowAll] = useState(false);
  const shown = !showAll ? list.slice(0, VISIBLE) : list;
  if (!list.length) return <p className="text-sm text-inkdim">{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {shown.map((m) => (
        <div key={m.id} className="rounded-lg border border-line bg-surfaceMuted p-4">
          <div className="mb-1.5">
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-inkdim">
              {m.target_user_id ? 'Just for you' : m.batch_id ? m.batches?.label || 'Your batch' : 'All batches'}
            </span>
          </div>
          <ExpandableText text={m.content} lines={4} className="text-sm text-ink" />
          <p className="mt-1.5 text-xs text-inkdim">
            {new Date(m.created_at).toLocaleString()}
            {m.updated_at ? ' \u00b7 edited' : ''}
          </p>
        </div>
      ))}
      {list.length > VISIBLE && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-sm font-semibold text-brand hover:underline">
          {showAll ? 'Show fewer' : `Show ${list.length - VISIBLE} older`}
        </button>
      )}
    </div>
  );
}
