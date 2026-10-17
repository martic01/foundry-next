'use client';

import { useState, useTransition } from 'react';
import { Check, Trash2, Flag } from 'lucide-react';
import { resolveReport, deleteReport, removeReportedItem } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';
import ExpandableText from '../ui/ExpandableText';
import { iconBtn, dangerBtn } from './content-shared';
import SearchBox, { matchesQuery } from '../ui/SearchBox';

const KIND = { link: 'Class link', video: 'Class video', announcement: 'Announcement', student: 'Student' };

export default function ReportList({ reports }) {
  const [q, setQ] = useState('');
  const [show, setShow] = useState('all'); // all | open | resolved
  const [kind, setKind] = useState('all');
  const shown = reports.filter(
    (r) => (show === 'all' || r.status === show) && (kind === 'all' || r.kind === kind) && matchesQuery(q, r.item_title, r.message, r.reporter?.full_name, r.reporter?.email, r.batch?.label)
  );
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { confirm } = useDialog();

  function run(action, id) {
    startTransition(async () => {
      const res = await action(id);
      setError(res?.error || res?.warning || '');
    });
  }

  async function removeItem(r) {
    const ok = await confirm({
      title: `Delete this ${KIND[r.kind].toLowerCase()}?`,
      message: `“${r.item_title || 'Untitled'}” will be deleted for everyone and the report closed.`,
      confirmLabel: 'Delete item',
      danger: true
    });
    if (ok) run(removeReportedItem, r.id);
  }

  if (!reports.length) return <p className="text-sm text-inkdim">No reports. Teachers can flag admin-posted items from their Content and Announcements tabs.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchBox value={q} onChange={setQ} placeholder="Search reports, teachers or students" className="flex-1" />
        <select value={show} onChange={(e) => setShow(e.target.value)} className="field !w-auto" aria-label="Status">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="field !w-auto" aria-label="Type">
          <option value="all">All types</option>
          {Object.entries(KIND).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {!shown.length && <p className="text-sm text-inkdim">No report matches.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {shown.map((r) => (
        <div key={r.id} className={`rounded-lg border p-4 ${r.status === 'open' ? 'border-brand/40 bg-surfaceMuted' : 'border-line bg-surface opacity-70'}`}>
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 font-semibold uppercase tracking-wide text-inkdim">
              <Flag className="h-3 w-3" /> {KIND[r.kind] || r.kind}
            </span>
            <span className={r.status === 'open' ? 'font-semibold text-brand' : 'text-inkdim'}>{r.status === 'open' ? 'Open' : 'Resolved'}</span>
            <span className="text-inkdim">{new Date(r.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm font-semibold text-ink">{r.item_title || 'Untitled'}</p>
          <p className="mb-2 text-xs text-inkdim">
            Reported by {r.reporter?.full_name || r.reporter?.email || 'a teacher'}
            {r.batch?.label ? ` · ${r.batch.label}` : ''}
          </p>
          <ExpandableText text={r.message} lines={3} className="text-sm text-ink" />
          <div className="mt-3 flex flex-wrap gap-2">
            {r.status === 'open' && (
              <>
                {r.kind !== 'student' && <button type="button" disabled={isPending} onClick={() => removeItem(r)} className={dangerBtn + ' inline-flex items-center gap-1 !px-2.5 text-xs'}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete item
                </button>}
                <button type="button" disabled={isPending} onClick={() => run(resolveReport, r.id)} className={iconBtn + ' inline-flex items-center gap-1 !px-2.5 text-xs'}>
                  <Check className="h-3.5 w-3.5" /> Mark resolved
                </button>
              </>
            )}
            <button type="button" disabled={isPending} onClick={() => run(deleteReport, r.id)} className={iconBtn + ' inline-flex items-center gap-1 !px-2.5 text-xs'}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
