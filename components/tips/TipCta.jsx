import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

// Shown at the end of every section of the Tips page.
export default function TipCta({ topic }) {
  return (
    <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-brand/40 bg-brand/10 p-5 sm:flex-row sm:items-center">
      <p className="text-sm text-ink"><strong className="font-semibold">Want to learn {topic} properly?</strong> Join a live cohort with real projects and an instructor who gives you feedback.</p>
      <div className="flex flex-shrink-0 flex-wrap gap-2">
        <Link href="/register" className="cta-btn"><GraduationCap className="h-4 w-4" /> Register for a course</Link>
        <Link href="/#courses" className="cta-btn-outline">See courses</Link>
      </div>
    </div>
  );
}
