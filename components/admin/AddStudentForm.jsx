'use client';

import { useState, useTransition } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { adminAddStudent } from '../../app/admin/actions';
import { COURSES } from '../../lib/courses';
import PaymentFields, { blankPayment } from './PaymentFields';

export default function AddStudentForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [course, setCourse] = useState('foundations');
  const [payment, setPayment] = useState(() => blankPayment(COURSES.foundations.priceNow));
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [isPending, startTransition] = useTransition();

  const price = COURSES[course].priceNow;

  // Changing the course changes the price the amounts default to.
  function handleCourseChange(next) {
    const nextPrice = COURSES[next].priceNow;
    setCourse(next);
    setPayment((p) => ({
      ...p,
      received: p.status === 'paid' ? String(nextPrice) : p.received,
      total: String(nextPrice)
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !age) return;
    startTransition(async () => {
      const res = await adminAddStudent(fullName.trim(), email.trim(), course, Number(age), payment);
      if (res?.error) {
        setStatus({ text: res.error, kind: 'error' });
      } else {
        // Say exactly where they went, so there's never a doubt about
        // whether it worked or a hunt through the lists to find out.
        setStatus({
          text: `Added ${res.studentName} to ${res.batchLabel || 'a batch'}${
            res.createdAccount
              ? ' \u2014 new account created. They sign in with this email via Google.'
              : ' \u2014 they already had an account, so it was used.'
          }`,
          kind: 'ok'
        });
        setFullName('');
        setEmail('');
        setAge('');
        setPayment(blankPayment(price));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 flex flex-col gap-3 p-5">
      <p className="text-sm font-semibold text-ink">Add a student directly</p>
      <p className="text-xs text-inkdim">
        Enrolls someone without going through Paystack -- for cash/offline
        payments or comps. If they&apos;ve never signed in before, this
        creates their account too, and their first Google sign-in with this
        exact email picks the enrollment up automatically. Already have an
        account? It&apos;s reused. Worth testing once with an email of your
        own before relying on it.
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
        <select value={course} onChange={(e) => handleCourseChange(e.target.value)} className="field" disabled={isPending}>
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

      <PaymentFields value={payment} onChange={setPayment} priceNaira={price} disabled={isPending} />
      <p className="text-xs text-inkdim">
        You can change the status later from <span className="font-medium text-ink">Payments</span>.
      </p>

      <button type="submit" disabled={isPending} className="cta-btn w-fit !px-4 !py-2 text-xs">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
        Add student
      </button>
      {status.text && (
        <p role={status.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${status.kind === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
          {status.text}
        </p>
      )}
    </form>
  );
}
