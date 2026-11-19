import Link from 'next/link';
import { fmtWat } from '../../lib/exam/time';

// Read-only list of private messages (student requests and the school's replies). Server component.
export default function PersonalMessages({ items, empty }) {
  if (!items.length) return <p className="text-sm text-inkdim">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((m) => (
        <li key={m.id} className="py-3 text-sm">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-inkdim">
            <span className="rounded-full border border-line bg-surfaceMuted px-2 py-0.5 font-semibold uppercase tracking-wide">{m.from}</span>
            <span>{fmtWat(m.created_at)}</span>
          </div>
          <p className="whitespace-pre-wrap text-ink">{m.content}</p>
          {m.href && <Link href={m.href} className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">Open</Link>}
        </li>
      ))}
    </ul>
  );
}
