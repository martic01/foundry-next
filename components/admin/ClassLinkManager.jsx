'use client';

import { useState, useTransition } from 'react';
import { Link2, Plus, Pencil, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { addClassLink, addClassLinks, updateClassLink, deleteClassLink } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import { AudienceSelect, AudienceChip, audienceOf, defaultAudienceFor, iconBtn, dangerBtn, ExpirySelect, ExpiryChip, canModify, ReportButton, BusyOverlay, Spinner } from './content-shared';
import SearchBox, { matchesQuery } from '../ui/SearchBox';
import { defaultExpiry, expiryToIso, expiryFromIso } from '../../lib/expiry';
import { safeHref } from '../../lib/safe-url';
import { parseLinkLines } from '../../lib/link-lines';

export default function ClassLinkManager({ links, audienceOptions, viewer = { role: 'admin' } }) {
  const [q, setQ] = useState('');
  const shown = links.filter((x) => matchesQuery(q, x.title, x.url));
  const [audience, setAudience] = useState(() => defaultAudienceFor(audienceOptions));
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [expiry, setExpiry] = useState(defaultExpiry());
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ audience: defaultAudienceFor(audienceOptions), title: '', url: '', expiry: defaultExpiry() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [several, setSeveral] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProblems, setBulkProblems] = useState([]); // [{ line, text, reason }]
  const [bulkNote, setBulkNote] = useState('');
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

  // Many links at once: each line is judged on its own. Good lines are
  // saved and removed from the box; bad lines stay, with the reason.
  async function addMany() {
    const e = expiryToIso(expiry);
    if (e.error) return setError(e.error);
    const parsed = parseLinkLines(bulkText);
    if (!parsed.length) return setError('Paste at least one link first.');
    if (parsed.length > 30) return setError('That\u2019s more than 30 links. Add them in smaller groups.');
    setError('');
    setBulkNote('');
    const seen = new Set();
    const problems = [];
    const toSend = [];
    for (const p of parsed) {
      if (seen.has(p.url)) { problems.push({ line: p.line, text: p.raw, reason: 'Repeated earlier in this list.' }); continue; }
      seen.add(p.url);
      toSend.push(p);
    }
    setBulkSending(true);
    try {
      const res = await addClassLinks(audience, toSend.map((p) => ({ title: p.title, url: p.url })), e.iso);
      if (res?.error) {
        setError(res.error);
        return;
      }
      toSend.forEach((p, i) => {
        if (!res.results?.[i]?.ok) problems.push({ line: p.line, text: p.raw, reason: res.results?.[i]?.error || 'Couldn\u2019t be saved.' });
      });
      problems.sort((a, b) => a.line - b.line);
      setBulkProblems(problems);
      setBulkText(problems.map((x) => x.text).join('\n'));
      if (res.saved) setBulkNote(`${res.saved} link${res.saved === 1 ? '' : 's'} added.`);
      if (!problems.length) setExpiry(defaultExpiry());
    } catch {
      setError('Couldn\u2019t reach the server, so nothing was added. Check your internet connection and press Add again \u2014 your list is still here.');
    } finally {
      setBulkSending(false);
    }
  }

  function startEdit(l) {
    setEditingId(l.id);
    setDraft({ audience: audienceOf(l), title: l.title || '', url: l.url, expiry: expiryFromIso(l.expires_at) });
  }

  function add() {
    const e = expiryToIso(expiry);
    if (e.error) return setError(e.error);
    run(addClassLink, () => { setTitle(''); setUrl(''); setExpiry(defaultExpiry()); }, audience, title, url, e.iso);
  }

  function saveEdit(l) {
    const e = expiryToIso(draft.expiry);
    if (e.error) return setError(e.error);
    setBusy({ id: l.id, label: 'Saving…' });
    run(updateClassLink, () => setEditingId(null), l.id, { audience: draft.audience, title: draft.title, url: draft.url, expiresAt: e.iso });
  }

  async function handleDelete(l) {
    const who = l.batch_id ? 'the students in that batch' : 'all students';
    const ok = await confirm({
      title: 'Delete this class link?',
      message: `It disappears immediately for ${who}.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (ok) {
      setBusy({ id: l.id, label: 'Deleting link…' });
      run(deleteClassLink, null, l.id);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-line bg-surfaceMuted p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Post class links</p>
          <div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-xs">
            <button type="button" onClick={() => setSeveral(false)} className={`rounded-full px-3 py-1 transition ${!several ? 'bg-brand text-white' : 'text-inkdim'}`}>One link</button>
            <button type="button" onClick={() => setSeveral(true)} className={`rounded-full px-3 py-1 transition ${several ? 'bg-brand text-white' : 'text-inkdim'}`}>Several at once</button>
          </div>
        </div>
        {several ? (
          <>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={5}
              disabled={bulkSending}
              placeholder={'One link per line. A label is optional:\nLive class | https://meet.google.com/abc-defg\nhttps://docs.google.com/document/d/…'}
              className="field font-mono text-xs"
            />
            {bulkProblems.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50/60 p-2.5 text-xs text-red-700">
                <li className="font-semibold">These lines weren’t added (they stay in the box so you can fix them):</li>
                {bulkProblems.map((x) => (
                  <li key={x.line} className="flex gap-1.5"><AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" /><span><span className="font-medium">Line {x.line}:</span> {x.reason}</span></li>
                ))}
              </ul>
            )}
            {bulkNote && <p className="pop-check text-xs font-medium text-green-700">{bulkNote}</p>}
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Label (optional) — e.g. Live class" className="field" disabled={isPending} />
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/…" className="field" disabled={isPending} />
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <AudienceSelect value={audience} onChange={setAudience} options={audienceOptions} disabled={isPending || bulkSending} />
          </div>
          <div className="min-w-[14rem] flex-1">
            <ExpirySelect value={expiry} onChange={setExpiry} disabled={isPending || bulkSending} />
          </div>
          {several ? (
            <button onClick={addMany} disabled={bulkSending || !bulkText.trim()} className="cta-btn !px-4 !py-2.5 text-xs">
              {bulkSending ? <><Spinner /> Adding…</> : <><Plus className="h-3.5 w-3.5" /> Add links</>}
            </button>
          ) : (
            <button onClick={add} disabled={isPending || !url.trim()} className="cta-btn !px-4 !py-2.5 text-xs">
              {isPending && !busy ? <><Spinner /> Adding…</> : <><Plus className="h-3.5 w-3.5" /> Add link</>}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {links.length > 3 && <SearchBox value={q} onChange={setQ} placeholder="Search links by title or address" className="mb-3" />}
      {!links.length ? (
        <p className="text-sm text-inkdim">No class links here yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {!shown.length && <p className="p-3 text-sm text-inkdim">Nothing matches “{q}”.</p>}
          {shown.map((l) =>
            editingId === l.id ? (
              <div key={l.id} className="relative flex flex-col gap-3 p-3">
                {busy?.id === l.id && <BusyOverlay label={busy.label} />}
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Label (optional)" className="field" disabled={isPending} />
                  <input type="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="field" disabled={isPending} />
                </div>
                <AudienceSelect value={draft.audience} onChange={(v) => setDraft({ ...draft, audience: v })} options={audienceOptions} disabled={isPending} />
                <ExpirySelect value={draft.expiry} onChange={(v) => setDraft({ ...draft, expiry: v })} disabled={isPending} />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(l)} disabled={isPending || !draft.url.trim()} className="cta-btn !px-4 !py-2 text-xs">
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} disabled={isPending} className="cta-btn-outline !px-4 !py-2 text-xs">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={l.id} className="relative flex items-center justify-between gap-3 p-3">
                {busy?.id === l.id && <BusyOverlay label={busy.label} />}
                <div className="min-w-0">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-brand" />
                    <p className="truncate text-sm font-medium text-ink">{l.title || 'Class link'}</p>
                    <AudienceChip batchId={l.batch_id} options={audienceOptions} />
                    <ExpiryChip item={l} />
                    {!canModify(viewer, l, 'created_by') && <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-inkdim">Posted by staff</span>}
                  </div>
                  <a href={safeHref(l.url)} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-brand hover:underline">
                    {l.url}
                  </a>
                </div>
                {canModify(viewer, l, 'created_by') ? (
                  <div className="flex flex-shrink-0 gap-2">
                    <button onClick={() => startEdit(l)} disabled={isPending} className={iconBtn} aria-label="Edit class link">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(l)} disabled={isPending} className={dangerBtn} aria-label="Delete class link">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <ReportButton kind="link" itemId={l.id} />
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
