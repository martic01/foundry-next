'use client';

import { useMemo, useState, useTransition } from 'react';
import { Award, Undo2, Users, CheckCircle2, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { awardCertificates, awardBatchCertificates, revokeCertificates, setCertificateName } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import SearchBox, { matchesQuery } from '../ui/SearchBox';
import { useSelection } from './useSelection';
import { BusyOverlay, Spinner } from './content-shared';

export default function CertificateManager({ batches, students }) {
  const [batchId, setBatchId] = useState(batches[0]?.id || '');
  const [filter, setFilter] = useState('all'); // all | awarded | pending
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null); // { tone, text, problems }
  const [busy, setBusy] = useState(null);
  const [isPending, startTransition] = useTransition();
  const sel = useSelection();
  const [editing, setEditing] = useState(null); // { userId, value }
  const [names, setNames] = useState({}); // userId -> corrected name (until the page refreshes)
  const { confirm } = useDialog();

  const inBatch = useMemo(() => students.filter((s) => s.batchId === batchId).map((s) => ({ ...s, name: names[s.userId] || s.name })), [students, batchId, names]);
  const rows = inBatch.filter((s) => (filter === 'all' || (filter === 'awarded') === !!s.cert) && matchesQuery(q, s.name, s.email, s.cert?.code));
  const awardedCount = inBatch.filter((s) => s.cert).length;
  const selected = inBatch.filter((s) => sel.has(s.key));
  const selAward = selected.filter((s) => !s.cert);
  const selRevoke = selected.filter((s) => s.cert);

  function finish(res, verbWord) {
    if (res?.error) return setMsg({ tone: 'error', text: res.error });
    const problems = (res.results || []).filter((r) => r.error);
    const name = (uid) => students.find((s) => s.userId === uid)?.name || 'A student';
    setMsg({
      tone: problems.length && !res.awarded ? 'error' : 'ok',
      text: `${res.awarded ?? res.revoked ?? 0} certificate${(res.awarded ?? res.revoked) === 1 ? '' : 's'} ${verbWord}.`,
      problems: problems.map((p) => `${name(p.userId)}: ${p.error}`)
    });
    sel.clear();
  }

  function go(label, fn, verbWord) {
    setMsg(null);
    setBusy(label);
    startTransition(async () => {
      try {
        finish(await fn(), verbWord);
      } catch {
        setMsg({ tone: 'error', text: 'Couldn’t reach the server. Check your internet connection and try again.' });
      } finally {
        setBusy(null);
      }
    });
  }

  function saveName() {
    const { userId, value } = editing;
    setBusy('Saving name…');
    startTransition(async () => {
      try {
        const res = await setCertificateName(userId, value);
        if (res?.error) setMsg({ tone: 'error', text: res.error });
        else { setNames((n) => ({ ...n, [userId]: res.name })); setEditing(null); setMsg({ tone: 'ok', text: 'Name updated. It will be printed on the certificate.' }); }
      } catch {
        setMsg({ tone: 'error', text: 'Couldn\u2019t reach the server. Try again.' });
      } finally { setBusy(null); }
    });
  }

  async function award(list, label) {
    if (!list.length) return;
    const ok = await confirm({ title: `Award ${list.length} certificate${list.length === 1 ? '' : 's'}?`, message: `${label} The students are told right away and can download their certificate.`, confirmLabel: 'Award' });
    if (ok) go('Awarding…', () => awardCertificates(list.map((s) => ({ userId: s.userId, course: s.course }))), 'awarded');
  }

  async function awardBatch() {
    const b = batches.find((x) => x.id === batchId);
    const ok = await confirm({ title: `Award everyone in ${b?.label || 'this batch'}?`, message: `Every student in this batch who doesn’t have one yet gets a certificate (${inBatch.length - awardedCount} students).`, confirmLabel: 'Award all' });
    if (ok) go('Awarding the whole batch…', () => awardBatchCertificates(batchId), 'awarded');
  }

  async function revoke(list) {
    if (!list.length) return;
    const ok = await confirm({
      title: `Revoke ${list.length} certificate${list.length === 1 ? '' : 's'}?`,
      message: 'The certificate ID is deleted for good, it will no longer pass verification, and the student’s Certificate tab locks again.',
      confirmLabel: 'Revoke',
      tone: 'danger'
    });
    if (ok) go('Revoking…', () => revokeCertificates(list.map((s) => s.cert.id)), 'revoked');
  }

  if (!batches.length) return <p className="text-sm text-inkdim">There are no batches yet.</p>;

  return (
    <div className="card relative p-5">
      {busy && <BusyOverlay label={busy} />}
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-inkdim">Batch</span>
          <select value={batchId} onChange={(e) => { setBatchId(e.target.value); sel.clear(); }} className="field">
            {batches.map((b) => (<option key={b.id} value={b.id}>{b.label}</option>))}
          </select>
        </label>
        <div className="flex items-end gap-2 text-xs text-inkdim">
          <Users className="mb-2.5 h-4 w-4" /><span className="mb-2.5">{awardedCount} of {inBatch.length} awarded</span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search by name, email or certificate ID" className="min-w-[14rem] flex-1" />
        <div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-xs">
          {[['all', 'All'], ['pending', 'Not awarded'], ['awarded', 'Awarded']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 transition ${filter === k ? 'bg-brand text-white' : 'text-inkdim'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => sel.setAll(rows.map((s) => s.key))} className="cta-btn-outline !px-3 !py-1.5 text-xs" disabled={!rows.length}>Select all shown</button>
        {selected.length > 0 && <button onClick={sel.clear} className="text-xs text-inkdim underline-offset-2 hover:underline">Clear ({selected.length})</button>}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <button onClick={() => award(selAward, `${selAward.length} selected student${selAward.length === 1 ? '' : 's'}.`)} disabled={!selAward.length || isPending} className="cta-btn !px-3 !py-1.5 text-xs">
          <Award className="h-3.5 w-3.5" /> Award selected ({selAward.length})
        </button>
        <button onClick={awardBatch} disabled={isPending || awardedCount === inBatch.length || !inBatch.length} className="cta-btn !px-3 !py-1.5 text-xs">
          <Award className="h-3.5 w-3.5" /> Award whole batch
        </button>
        <button onClick={() => revoke(selRevoke)} disabled={!selRevoke.length || isPending} className="cta-btn-outline !px-3 !py-1.5 text-xs !text-red-600">
          <Undo2 className="h-3.5 w-3.5" /> Revoke selected ({selRevoke.length})
        </button>
      </div>

      {msg && (
        <div className={`mb-3 rounded-lg border p-3 text-xs ${msg.tone === 'ok' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-700'}`}>
          <p className="flex items-center gap-1.5 font-medium">{msg.tone === 'ok' ? <CheckCircle2 className="pop-check h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}</p>
          {msg.problems?.length > 0 && <ul className="mt-1.5 list-disc pl-5">{msg.problems.map((p) => (<li key={p}>{p}</li>))}</ul>}
        </div>
      )}

      {!inBatch.length ? (
        <p className="text-sm text-inkdim">No students in this batch yet.</p>
      ) : !rows.length ? (
        <p className="text-sm text-inkdim">Nobody matches.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {rows.map((s) => (
            <div key={s.key} className="flex items-center gap-3 p-3 hover:bg-surfaceMuted">
              <input type="checkbox" checked={sel.has(s.key)} onChange={() => sel.toggle(s.key)} className="h-4 w-4 flex-shrink-0 accent-[rgb(var(--color-brand))]" aria-label={`Select ${s.name}`} />
              <div className="min-w-0 flex-1">
                {editing?.userId === s.userId ? (
                  <div className="flex items-center gap-1.5">
                    <input value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} className="field !py-1 text-sm" aria-label="Name on certificate" autoFocus />
                    <button onClick={saveName} className="rounded-md border border-line p-1.5 text-green-700" aria-label="Save name"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditing(null)} className="rounded-md border border-line p-1.5 text-inkdim" aria-label="Cancel"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                    <span className="truncate">{s.name}</span>
                    {!s.cert && <button onClick={() => setEditing({ userId: s.userId, value: s.name })} className="flex-shrink-0 text-inkdim hover:text-ink" aria-label={`Edit the name printed for ${s.name}`} title="Edit the name printed on the certificate"><Pencil className="h-3 w-3" /></button>}
                    {!s.hasCertName && !names[s.userId] && !s.cert && <span className="flex-shrink-0 rounded-full border border-amber-300 px-1.5 text-[10px] font-medium text-amber-700" title="They never typed a full name; this is their account name. Check it.">check name</span>}
                  </p>
                )}
                <p className="truncate text-xs text-inkdim">{s.email} · {s.courseName}</p>
              </div>
              {s.cert ? (
                <span className="flex-shrink-0 text-right">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">Awarded</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-inkdim">{s.cert.code} · {s.cert.date}</span>
                </span>
              ) : (
                <span className="flex-shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-inkdim">Not awarded</span>
              )}
            </div>
          ))}
        </div>
      )}
      {isPending && !busy && <Spinner />}
    </div>
  );
}
