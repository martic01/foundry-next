'use client';

import { useState, useTransition } from 'react';
import { UserPlus, Save, Trash2 } from 'lucide-react';
import { adminAddTeacher, setTeacherBatches, removeTeacher } from '../../app/admin/actions';
import { useDialog } from '../ui/DialogProvider';

function BatchChecklist({ groups, selected, onToggle, disabled }) {
  if (!groups.length) return <p className="text-xs text-inkdim">No batches exist yet — create one on the Batches page.</p>;
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.course}>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-inkdim">{g.name}</p>
          <div className="flex flex-wrap gap-2">
            {g.batches.map((b) => {
              const on = selected.has(b.id);
              return (
                <label
                  key={b.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    on ? 'border-brand bg-brand/10 text-ink' : 'border-line text-inkdim hover:text-ink'
                  }`}
                >
                  <input type="checkbox" className="h-3.5 w-3.5 accent-[#caa43d]" checked={on} disabled={disabled} onChange={() => onToggle(b.id)} />
                  {b.label}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeacherCard({ teacher, groups }) {
  const [selected, setSelected] = useState(new Set(teacher.batchIds));
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState({ text: '', kind: '' });
  const { confirm } = useDialog();

  const dirty = selected.size !== teacher.batchIds.length || teacher.batchIds.some((id) => !selected.has(id));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setStatus({ text: '', kind: '' });
  }

  function save() {
    startTransition(async () => {
      const res = await setTeacherBatches(teacher.id, [...selected]);
      setStatus(res?.error ? { text: res.error, kind: 'error' } : { text: 'Saved.', kind: 'ok' });
    });
  }

  async function remove() {
    const ok = await confirm({
      title: `Remove ${teacher.full_name} as a teacher?`,
      message: 'They lose access to every batch. Their account stays, as a plain account with no role.',
      confirmLabel: 'Remove teacher',
      tone: 'danger'
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await removeTeacher(teacher.id);
      if (res?.error) setStatus({ text: res.error, kind: 'error' });
    });
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-ink">{teacher.full_name}</p>
          <p className="truncate text-xs text-inkdim">{teacher.email}</p>
        </div>
        <span className="rounded-full border border-line bg-surfaceMuted px-2.5 py-0.5 text-[11px] font-medium text-inkdim">
          {teacher.batchIds.length} {teacher.batchIds.length === 1 ? 'batch' : 'batches'}
        </span>
      </div>

      <BatchChecklist groups={groups} selected={selected} onToggle={toggle} disabled={isPending} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={isPending || !dirty} className="cta-btn !px-4 !py-2 text-xs">
          <Save className="h-3.5 w-3.5" /> Save batches
        </button>
        <button onClick={remove} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-inkdim hover:border-red-300 hover:text-red-600 disabled:opacity-40">
          <Trash2 className="h-3.5 w-3.5" /> Remove teacher
        </button>
        {status.text && <span className={`text-xs ${status.kind === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{status.text}</span>}
      </div>
    </div>
  );
}

function AddTeacherForm({ groups }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState({ text: '', kind: '' });
  const { confirm } = useDialog();

  function submit(e) {
    e.preventDefault();
    startTransition(async () => {
      let res = await adminAddTeacher(name, email, [...selected]);
      if (res?.needsConfirm) {
        // The email belongs to a student with paid enrolments. Switching
        // them to teacher is a full role change -- spell that out first.
        const go = await confirm({
          title: `Switch ${res.name || 'this student'} to a teacher?`,
          message: `They are enrolled in ${res.enrolments} course${res.enrolments === 1 ? '' : 's'}. As a teacher they will only have the teacher dashboard \u2014 no student access \u2014 so those enrolments are taken off their batches (payment records are kept).`,
          confirmLabel: 'Switch to teacher',
          tone: 'danger'
        });
        if (!go) return;
        res = await adminAddTeacher(name, email, [...selected], true);
      }
      if (res?.error) {
        setStatus({ text: res.error, kind: 'error' });
        return;
      }
      setStatus({
        text: res.created
          ? 'Teacher registered. They sign in with Google using this exact email.'
          : res.droppedEnrolments
            ? 'Switched to teacher. They now only see the teacher dashboard.'
            : 'Teacher updated.',
        kind: 'ok'
      });
      setName('');
      setEmail('');
      setSelected(new Set());
    });
  }

  return (
    <form onSubmit={submit} className="card mb-8 flex flex-col gap-3 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <UserPlus className="h-4 w-4 text-brand" /> Register a teacher
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" maxLength={120} className="field" disabled={isPending} required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email (their Google account)" maxLength={254} className="field" disabled={isPending} required />
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Batches they teach (optional — you can set these later)</p>
        <BatchChecklist
          groups={groups}
          selected={selected}
          disabled={isPending}
          onToggle={(id) =>
            setSelected((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending || !name.trim() || !email.trim()} className="cta-btn !px-4 !py-2 text-xs">
          <UserPlus className="h-3.5 w-3.5" /> Register teacher
        </button>
        {status.text && (
          <p role={status.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${status.kind === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}

export default function TeacherManager({ teachers, batchGroups }) {
  return (
    <div>
      <AddTeacherForm groups={batchGroups} />
      {!teachers.length ? (
        <div className="card p-6 text-sm text-inkdim">No teachers yet.</div>
      ) : (
        <div className="flex flex-col gap-5">
          {teachers.map((t) => (
            <TeacherCard key={t.id + t.batchIds.join(',')} teacher={t} groups={batchGroups} />
          ))}
        </div>
      )}
    </div>
  );
}
