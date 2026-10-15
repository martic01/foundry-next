'use client';

import { useState, useTransition } from 'react';
import { Link2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { addClassLink, updateClassLink, deleteClassLink } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import { AudienceSelect, AudienceChip, audienceOf, defaultAudienceFor, iconBtn, dangerBtn } from './content-shared';
import { safeHref } from '../../lib/safe-url';

export default function ClassLinkManager({ links, audienceOptions }) {
  const [audience, setAudience] = useState(() => defaultAudienceFor(audienceOptions));
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ audience: defaultAudienceFor(audienceOptions), title: '', url: '' });
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

  function startEdit(l) {
    setEditingId(l.id);
    setDraft({ audience: audienceOf(l), title: l.title || '', url: l.url });
  }

  async function handleDelete(l) {
    const who = l.batch_id ? 'the students in that batch' : 'all students';
    const ok = await confirm({
      title: 'Delete this class link?',
      message: `It disappears immediately for ${who}.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (ok) run(deleteClassLink, null, l.id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-line bg-surfaceMuted p-4">
        <p className="text-sm font-semibold text-ink">Post a class link</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Label (optional) — e.g. Live class" className="field" disabled={isPending} />
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/…" className="field" disabled={isPending} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <AudienceSelect value={audience} onChange={setAudience} options={audienceOptions} disabled={isPending} />
          </div>
          <button
            onClick={() => run(addClassLink, () => { setTitle(''); setUrl(''); }, audience, title, url)}
            disabled={isPending || !url.trim()}
            className="cta-btn !px-4 !py-2.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add link
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {!links.length ? (
        <p className="text-sm text-inkdim">No class links here yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {links.map((l) =>
            editingId === l.id ? (
              <div key={l.id} className="flex flex-col gap-3 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Label (optional)" className="field" disabled={isPending} />
                  <input type="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="field" disabled={isPending} />
                </div>
                <AudienceSelect value={draft.audience} onChange={(v) => setDraft({ ...draft, audience: v })} options={audienceOptions} disabled={isPending} />
                <div className="flex gap-2">
                  <button onClick={() => run(updateClassLink, () => setEditingId(null), l.id, draft)} disabled={isPending || !draft.url.trim()} className="cta-btn !px-4 !py-2 text-xs">
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} disabled={isPending} className="cta-btn-outline !px-4 !py-2 text-xs">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={l.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-brand" />
                    <p className="truncate text-sm font-medium text-ink">{l.title || 'Class link'}</p>
                    <AudienceChip batchId={l.batch_id} options={audienceOptions} />
                  </div>
                  <a href={safeHref(l.url)} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-brand hover:underline">
                    {l.url}
                  </a>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button onClick={() => startEdit(l)} disabled={isPending} className={iconBtn} aria-label="Edit class link">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(l)} disabled={isPending} className={dangerBtn} aria-label="Delete class link">
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
