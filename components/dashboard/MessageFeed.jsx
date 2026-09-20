'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

// Read-only by design -- there's no input here at all. The actual
// enforcement that only the admin can post is the messages_admin_insert
// RLS policy in supabase/schema.sql; this component not having a text box
// is just the UI matching what the database already guarantees.
export default function MessageFeed({ batchId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase
      .from('messages')
      .select('id, content, created_at')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (active && data) setMessages(data);
      });

    const channel = supabase
      .channel(`messages:${batchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `batch_id=eq.${batchId}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [batchId]);

  if (!messages.length) {
    return <p className="text-sm text-inkdim">No announcements yet — check back before the cohort starts.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) => (
        <div key={m.id} className="rounded-lg border border-line bg-surfaceMuted p-3">
          <p className="text-sm text-ink">{m.content}</p>
          <p className="mt-1 text-xs text-inkdim">{new Date(m.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
