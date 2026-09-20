'use client';

import { useState, useTransition } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { adminAddStudent } from '../../app/admin/actions';
import { COURSES } from '../../lib/courses';

export default function AddStudentForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [course, setCourse] = useState('foundations');
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !age) return;
    startTransition(async () => {
      const res = await adminAddStudent(fullName.trim(), email.trim(), course, Number(age));
      if (res?.error) {
        setStatus(res.error);
      } else {
        setStatus('Added.');
        setFullName('');
        setEmail('');
        setAge('');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 flex flex-col gap-3 p-5">
      <p className="text-sm font-semibold text-ink">Add a student directly</p>
      <p className="text-xs text-inkdim">
        Enrolls someone without going through Paystack -- for cash/offline
        payments or comps. If they&apos;ve never signed in before, this
        creates their account too, but their first Google sign-in with this
        exact email isn&apos;t guaranteed to link to it automatically -- worth
        testing once with an email of your own before relying on this.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="field"
          disabled={isPending}
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="field"
          disabled={isPending}
          required
        />
        <select value={course} onChange={(e) => setCourse(e.target.value)} className="field" disabled={isPending}>
          {Object.values(COURSES).map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Age"
          min="1"
          className="field"
          disabled={isPending}
          required
        />
      </div>
      <button type="submit" disabled={isPending} className="cta-btn w-fit !px-4 !py-2 text-xs">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
        Add student
      </button>
      {status && <p className="text-xs text-inkdim">{status}</p>}
    </form>
  );
}
