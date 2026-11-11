'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Save, Undo2, ExternalLink } from 'lucide-react';
import LegalDoc from '../legal/LegalDoc';
import { saveLegalDoc, resetLegalDoc } from '../../app/schedule-actions';
import { useDialog } from '../ui/DialogProvider';

const toDraft = (c) => ({ title: c.title, updated: c.updated || '', intro: c.intro || '', summary: (c.summary || []).join('\n'), sections: c.sections.map((s) => ({ title: s.title, text: s.items.join('\n') })) });
const fromDraft = (d) => ({
  title: d.title, updated: d.updated, intro: d.intro,
  summary: d.summary.split('\n').map((x) => x.trim()).filter(Boolean),
  sections: d.sections.map((s) => ({ title: s.title.trim(), items: s.text.split('\n').map((x) => x.trim()).filter(Boolean) })).filter((s) => s.title)
});

export default function LegalEditor({ docs }) {
  const router = useRouter();
  const { confirm } = useDialog();
  const [which, setWhich] = useState('terms');
  const [mode, setMode] = useState('preview');
  const [drafts, setDrafts] = useState(() => ({ terms: toDraft(docs.terms.content), privacy: toDraft(docs.privacy.content) }));
  const [custom, setCustom] = useState({ terms: docs.terms.custom, privacy: docs.privacy.custom });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const d = drafts[which];
  const upd = (patch) => setDrafts((x) => ({ ...x, [which]: { ...x[which], ...patch } }));
  const updSection = (i, patch) => upd({ sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const move = (i, dir) => { const a = [...d.sections]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; upd({ sections: a }); };
  const addSection = () => upd({ sections: [...d.sections, { title: `${d.sections.length + 1}. New section`, text: '' }] });

  async function del(i) {
    if (!(await confirm({ title: 'Delete this section?', message: `“${d.sections[i].title}” will be removed once you save. Section numbers in other titles are not renumbered automatically.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    upd({ sections: d.sections.filter((_, j) => j !== i) });
  }
  function save() {
    start(async () => {
      const res = await saveLegalDoc(which, fromDraft(d));
      if (res?.error) return setMsg({ ok: '', err: res.error });
      setCustom((c) => ({ ...c, [which]: true }));
      setMsg({ ok: 'Saved. The public page is updated.', err: '' });
      router.refresh();
    });
  }
  async function reset() {
    if (!(await confirm({ title: 'Reset to the original text?', message: 'Your edits to this document are removed and the built-in text comes back.', confirmLabel: 'Reset', tone: 'danger' }))) return;
    start(async () => {
      const res = await resetLegalDoc(which);
      if (res?.error) return setMsg({ ok: '', err: res.error });
      setMsg({ ok: 'Reset to the original text. Reload this page to see it here.', err: '' });
      setCustom((c) => ({ ...c, [which]: false }));
      router.refresh();
    });
  }

  const preview = fromDraft(d);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-surfaceMuted p-1 text-sm font-medium">
          {[['terms', 'Terms & Policy'], ['privacy', 'Privacy Notice']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setWhich(k); setMsg({ ok: '', err: '' }); }} className={`rounded-md px-4 py-1.5 ${which === k ? 'bg-brand text-white' : 'text-inkdim hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        <div className="inline-flex rounded-lg bg-surfaceMuted p-1 text-sm font-medium">
          {[['preview', 'As visitors see it'], ['edit', 'Edit']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-md px-4 py-1.5 ${mode === k ? 'bg-brand text-white' : 'text-inkdim hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        <a href={which === 'terms' ? '/terms' : '/privacy'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Open public page</a>
        <span className="text-xs text-inkdim">{custom[which] ? 'Edited version is live.' : 'Showing the original text.'}</span>
      </div>

      {(msg.ok || msg.err) && <p role="status" className={`mb-4 rounded-lg border px-3 py-2 text-sm ${msg.err ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}>{msg.err || msg.ok}</p>}

      {mode === 'preview' ? (
        <div className="card overflow-hidden">
          <LegalDoc title={preview.title} updated={preview.updated} intro={preview.intro} summary={preview.summary.length ? preview.summary : null} sections={preview.sections} />
          <p className="border-t border-line px-4 py-2 text-xs text-inkdim">Preview reflects your current edits, including unsaved ones.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card space-y-3 p-4">
            <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Page title
              <input value={d.title} maxLength={120} onChange={(e) => upd({ title: e.target.value })} className="field mt-1 normal-case" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Version / last updated line
              <input value={d.updated} maxLength={300} onChange={(e) => upd({ updated: e.target.value })} className="field mt-1 normal-case" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Introduction
              <textarea value={d.intro} maxLength={2000} rows={3} onChange={(e) => upd({ intro: e.target.value })} className="field mt-1 normal-case" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-inkdim">Key points box (one point per line, empty = no box)
              <textarea value={d.summary} rows={5} onChange={(e) => upd({ summary: e.target.value })} className="field mt-1 normal-case" />
            </label>
          </div>

          {d.sections.map((s, i) => (
            <div key={i} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <input value={s.title} maxLength={160} onChange={(e) => updSection(i, { title: e.target.value })} aria-label="Section title" className="field min-w-0 flex-1 font-semibold" />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-md border border-line p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === d.sections.length - 1} aria-label="Move down" className="rounded-md border border-line p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => del(i)} aria-label="Delete section" className="rounded-md border border-red-300 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <textarea value={s.text} rows={Math.min(14, Math.max(4, s.text.split('\n').length + 1))} onChange={(e) => updSection(i, { text: e.target.value })} aria-label="Section paragraphs" className="field" />
              <p className="mt-1 text-xs text-inkdim">One paragraph per line.</p>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addSection} className="cta-btn-outline"><Plus className="h-4 w-4" /> Add a section</button>
            <button type="button" onClick={save} disabled={pending} className="cta-btn">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes</button>
            <button type="button" onClick={reset} disabled={pending} className="cta-btn-outline"><Undo2 className="h-4 w-4" /> Reset to original</button>
          </div>
          <p className="text-xs text-inkdim">Everything is shown as plain text. Section numbers are part of each title, so renumber by hand if you add or remove one. Remember to update the version line when you change the terms, and tell students about material changes.</p>
        </div>
      )}
    </div>
  );
}
