import Link from 'next/link';
import { NOINDEX } from '../lib/seo';

export const metadata = { title: 'Page not found | The Foundry', description: 'That page does not exist. Head back to The Foundry to explore our coding and AI courses.', ...NOINDEX };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="mb-3 font-display text-3xl font-extrabold text-ink">We can&apos;t find that page</h1>
      <p className="mb-6 text-sm text-inkdim">The link may be old or mistyped. Explore our coding and AI courses instead.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="cta-btn">Back to home</Link>
        <Link href="/register" className="cta-btn-outline">Register for a course</Link>
      </div>
    </main>
  );
}
