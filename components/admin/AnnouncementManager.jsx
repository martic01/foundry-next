'use client';

import { useState, useTransition } from 'react';
import { Send, Pencil, Trash2, Check, X } from 'lucide-react';
import { postAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import { AudienceSelect, AudienceChip, audienceOf, defaultAudienceFor, iconBtn, dangerBtn } from './content-shared';

export default function AnnouncementManager({ messages, audienceOptions }) {
  const [audience, setAudience] = useState(() => defaultAudienceFor(audienceOptions));
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ audience: defaultAudienceFor(audienceOptions), content: '' });
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { confirm } = useDialog();

  function run(action, onOk, ...args) {
    startTransition(async () => {
      const res = await action(...args);
      if (res?.error) setError(res.error);
      else {
        setError('');
        onOk?.();
      }
    });
  }

  async function handleDelete(m) {
    const ok = await confirm({
      title: 'Delete this announcement?',
      message: m.batch_id ? 'Students in that batch will no longer see it.' : 'No student will see it any more.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (ok) run(deleteAnnouncement, null, m.id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-line bg-surfaceMuted p-4">
        <p className="text-sm font-semibold text-ink">New announcement</p>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Write a message…" className="field resize-y" disabled={isPending} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <AudienceSelect value={audience} onChange={setAudience} options={audienceOptions} disabled={isPending} />
          </div>
          <button onClick={() => run(postAnnouncement, () => setContent(''), audience, content)} disabled={isPending || !content.trim()} className="cta-btn !px-4 !py-2.5 text-xs">
            <Send className="h-3.5 w-3.5" /> Post
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {!messages.length ? (
        <p className="text-sm text-inkdim">No announcements here yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {messages.map((m) =>
            editingId === m.id ? (
              <div key={m.id} className="flex flex-col gap-3 p-3">
                <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={3} className="field resize-y" disabled={isPending} />
                <AudienceSelect value={draft.audience} onChange={(v) => setDraft({ ...draft, audience: v })} options={audienceOptions} disabled={isPending} />
                <div className="flex gap-2">
                  <button onClick={() => run(updateAnnouncement, () => setEditingId(null), m.id, draft)} disabled={isPending || !draft.content.trim()} className="cta-btn !px-4 !py-2 text-xs">
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} disabled={isPending} className="cta-btn-outline !px-4 !py-2 text-xs">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="mb-1">
                    <AudienceChip batchId={m.batch_id} options={audienceOptions} />
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-ink">{m.content}</p>
                  <p className="mt-1 text-xs text-inkdim">
                    {new Date(m.created_at).toLocaleString()}
                    {m.updated_at ? ' · edited' : ''}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => {
                      setEditingId(m.id);
                      setDraft({ audience: audienceOf(m), content: m.content });
                    }}
                    disabled={isPending}
                    className={iconBtn}
                    aria-label="Edit announcement"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(m)} disabled={isPending} className={dangerBtn} aria-label="Delete announcement">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
