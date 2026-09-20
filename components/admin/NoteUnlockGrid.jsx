'use client';

import { useState, useTransition } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { unlockNoteDay, lockNoteDay } from '../../app/admin/actions';

export default function NoteUnlockGrid({ course, days, unlockedDays }) {
  const [unlocked, setUnlocked] = useState(new Set(unlockedDays));
  const [isPending, startTransition] = useTransition();

  function toggle(day) {
    const isUnlocked = unlocked.has(day);
    // Optimistic -- flip locally right away, then reconcile with the
    // server; revalidatePath in the action keeps every other page (the
    // student's own Notes page included) in sync afterward.
    setUnlocked((prev) => {
      const next = new Set(prev);
      isUnlocked ? next.delete(day) : next.add(day);
      return next;
    });
    startTransition(() => {
      (isUnlocked ? lockNoteDay(course, day) : unlockNoteDay(course, day)).then((res) => {
        if (res?.error) {
          // Revert on failure
          setUnlocked((prev) => {
            const next = new Set(prev);
            isUnlocked ? next.add(day) : next.delete(day);
            return next;
          });
        }
      });
    });
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-9">
      {days.map((day) => {
        const isUnlocked = unlocked.has(day.day);
        return (
          <button
            key={day.day}
            type="button"
            disabled={isPending}
            onClick={() => toggle(day.day)}
            title={day.title}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition ${
              isUnlocked
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-line bg-surfaceMuted text-inkdim hover:border-brand/40'
            }`}
          >
            {isUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            Day {day.day}
          </button>
        );
      })}
    </div>
  );
}
