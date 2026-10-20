'use client';

import { useState, useTransition } from 'react';
import { Send, Pencil, Trash2, Check, X } from 'lucide-react';
import { postAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import { AudienceSelect, AudienceChip, audienceOf, defaultAudienceFor, iconBtn, dangerBtn, ExpirySelect, ExpiryChip, canModify, ReportButton, BusyOverlay, Spinner } from './content-shared';
import ExpandableText from '../ui/ExpandableText';
import SearchBox, { matchesQuery } from '../ui/SearchBox';
import { defaultExpiry, expiryToIso, expiryFromIso } from '../../lib/expiry';

export default function AnnouncementManager({ messages, audienceOptions, viewer = { role: 'admin' } }) {
  const [q, setQ] = useState('');
  const shown = messages.filter((x) => matchesQuery(q, x.content));
  const [audience, setAudience] = useState(() => defaultAudienceFor(audienceOptions));
  const [content, setContent] = useState('');
  const [expiry, setExpiry] = useState(defaultExpiry());
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ audience: defaultAudienceFor(audienceOptions), content: '', expiry: defaultExpiry() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { confirm } = useDialog();

  function run(action, onOk, ...args) {
    startTransition(async () => {
      try {
        const res = await action(...args);
        if (res?.error) setError(res.error);
        else {
          setError('');
          onOk?.();
        }
      } catch {
        setError('Couldn\u2019t reach the server. Check your internet connection and try again.');
      } finally {
        setBusy(null);
      }
    });
  }

  function post() {
    const e = expiryToIso(expiry);
    if (e.error) return setError(e.error);
    run(postAnnouncement, () => { setContent(''); setExpiry(defaultExpiry()); }, audience, content, e.iso);
  }

  function saveEdit(m) {
    const e = expiryToIso(draft.expiry);
    if (e.error) return setError(e.error);
    setBusy({ id: m.id, label: 'Saving…' });
    run(updateAnnouncement, () => setEditingId(null), m.id, { audience: draft.audience, content: draft.content, expiresAt: e.iso });
  }

  async function handleDelete(m) {
    const ok = await confirm({
      title: 'Delete this announcement?',
      message: m.batch_id ? 'Students in that batch will no longer see it.' : 'No student will see it any more.',
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (ok) {
      setBusy({ id: m.id, label: 'Deleting…' });
      run(deleteAnnouncement, null, m.id);
    }
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
          <div className="min-w-[14rem] flex-1">
            <ExpirySelect value={expiry} onChange={setExpiry} disabled={isPending} />
          </div>
          <button onClick={post} disabled={isPending || !content.trim()} className="cta-btn !px-4 !py-2.5 text-xs">
            {isPending && !busy ? <><Spinner /> Posting…</> : <><Send className="h-3.5 w-3.5" /> Post</>}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {messages.length > 3 && <SearchBox value={q} onChange={setQ} placeholder="Search announcements" className="mb-3" />}
      {!messages.length ? (
        <p className="text-sm text-inkdim">No announcements here yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {!shown.length && <p className="p-3 text-sm text-inkdim">Nothing matches “{q}”.</p>}
          {shown.map((m) =>
            editingId === m.id ? (
              <div key={m.id} className="relative flex flex-col gap-3 p-3">
                {busy?.id === m.id && <BusyOverlay label={busy.label} />}
                <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={3} className="field resize-y" disabled={isPending} />
                <AudienceSelect value={draft.audience} onChange={(v) => setDraft({ ...draft, audience: v })} options={audienceOptions} disabled={isPending} />
                <ExpirySelect value={draft.expiry} onChange={(x) => setDraft({ ...draft, expiry: x })} disabled={isPending} />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(m)} disabled={isPending || !draft.content.trim()} className="cta-btn !px-4 !py-2 text-xs">
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} disabled={isPending} className="cta-btn-outline !px-4 !py-2 text-xs">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={m.id} className="relative flex items-start justify-between gap-3 p-3">
                {busy?.id === m.id && <BusyOverlay label={busy.label} />}
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <AudienceChip batchId={m.batch_id} options={audienceOptions} />
                    <ExpiryChip item={m} />
                    {!canModify(viewer, m, 'sender_id') && <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-inkdim">Posted by staff</span>}
                  </div>
                  <ExpandableText text={m.content} lines={3} className="text-sm text-ink" />
                  <p className="mt-1 text-xs text-inkdim">
                    {new Date(m.created_at).toLocaleString()}
                    {m.updated_at ? ' · edited' : ''}
                  </p>
                </div>
                {canModify(viewer, m, 'sender_id') ? (
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setEditingId(m.id);
                        setDraft({ audience: audienceOf(m), content: m.content, expiry: expiryFromIso(m.expires_at) });
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
                ) : (
                  <div className="max-w-[16rem] flex-shrink-0">
                    <ReportButton kind="announcement" itemId={m.id} />
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
