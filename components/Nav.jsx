import { Suspense } from 'react';
import Link from 'next/link';
import { BookOpen, LayoutDashboard, Crown, LogOut } from 'lucide-react';
import VerifyCertificate from './VerifyCertificate';
import GoogleIcon from './icons/GoogleIcon';
import { getUserSafe as getUser, getProfileSafe as getProfile } from '../lib/supabase/session';
import { signOutAction } from '../app/actions';

// Two server components, split on purpose. <Nav> is the shell (logo,
// Courses, Portfolio) and renders immediately; <NavAuth> is
// the part that depends on the session, wrapped in <Suspense> so the
// page's HTML isn't held up waiting on it. The lookups inside are the
// per-request cached ones (lib/supabase/session.js), so on a page that
// also needs the user, the Supabase call happens once, not twice.
export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-[clamp(6px,2vw,16px)] px-[clamp(8px,2.5vw,24px)] py-3 sm:py-4">
        <Link href="/" className="min-w-0 flex-shrink whitespace-nowrap font-racing text-[length:clamp(13px,4.2vw,24px)] tracking-wide text-ink">
          The <span className="text-brand">Foundry</span>
        </Link>
        {/* Labels always show. Instead of hiding the text on small
            screens, the font size (and icons, gaps and padding, which are
            all in em / clamp()) scales smoothly with the viewport width,
            so everything stays on one line without touching. */}
        <div className="flex min-w-0 items-center gap-[clamp(5px,2vw,20px)] whitespace-nowrap text-[length:clamp(8px,2.6vw,14px)]">
          <Link href="/#courses" className="flex items-center gap-[0.35em] text-inkdim hover:text-ink" title="Courses">
            <BookOpen className="h-[1.25em] w-[1.25em] flex-shrink-0" />
            <span>Courses</span>
          </Link>
          <Suspense fallback={<span className="h-4 w-16 animate-pulse rounded bg-surfaceMuted" aria-hidden="true" />}>
            <NavAuth />
          </Suspense>
          <VerifyCertificate />
        </div>
      </div>
    </nav>
  );
}

async function NavAuth() {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  const role = user ? profile?.role || 'student' : null;
  const homeHref = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/dashboard';
  const homeLabel = role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teaching' : 'Dashboard';

  return (
    <>
      {user ? (
        <>
          <Link href={homeHref} className="flex items-center gap-[0.35em] text-inkdim hover:text-ink" title={homeLabel}>
            {role === 'admin' ? <Crown className="h-[1.25em] w-[1.25em] flex-shrink-0" /> : <LayoutDashboard className="h-[1.25em] w-[1.25em] flex-shrink-0" />}
            <span>{homeLabel}</span>
          </Link>
          {/* A form + server action, not an onClick -- this works
              without turning Nav into a client component, which
              would lose the per-request session read in NavAuth. */}
          {/* data-nav-loading -- picked up by NavigationLoader.jsx's
              global submit listener, so the top progress bar shows
              for this (it navigates away) without showing for every
              other form in the app (most stay on the same page). */}
          <form action={signOutAction} data-nav-loading="true">
            <button type="submit" className="flex items-center gap-[0.35em] text-inkdim hover:text-ink" title="Log out">
              <LogOut className="h-[1.25em] w-[1.25em] flex-shrink-0" />
              <span>Log out</span>
            </button>
          </form>
        </>
      ) : (
        <Link href="/login" className="flex items-center gap-[0.35em] text-inkdim hover:text-ink" title="Student login">
          <GoogleIcon className="h-[1.25em] w-[1.25em] flex-shrink-0" />
          <span>Student login</span>
        </Link>
      )}
    </>
  );
}
