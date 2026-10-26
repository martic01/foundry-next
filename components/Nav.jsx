import { Suspense } from 'react';
import Link from 'next/link';
import { BookOpen, LayoutDashboard, Crown, LogOut } from 'lucide-react';
import VerifyCertificate from './VerifyCertificate';
import GoogleIcon from './icons/GoogleIcon';
import { getUserSafe as getUser, getProfileSafe as getProfile } from '../lib/supabase/session';
import { signOutAction } from '../app/actions';

const LINK = 'flex items-center gap-[0.35em] rounded-md p-2.5 text-inkdim hover:text-ink sm:p-0';

// Two server components, split on purpose. <Nav> is the shell (logo,
// Courses, Portfolio) and renders immediately; <NavAuth> is
// the part that depends on the session, wrapped in <Suspense> so the
// page's HTML isn't held up waiting on it. The lookups inside are the
// per-request cached ones (lib/supabase/session.js), so on a page that
// also needs the user, the Supabase call happens once, not twice.
export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-4">
        <Link href="/" className="min-w-0 flex-shrink whitespace-nowrap font-racing text-[length:clamp(12px,3.4vw,24px)] tracking-wide text-ink">
          The <span className="text-brand">Foundry</span>
        </Link>
        {/* On phones the links are icons only (each has a label for screen readers and a tooltip), so they never run off the edge; from the sm breakpoint the text labels show. */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3.5 whitespace-nowrap text-sm min-[400px]:gap-5 sm:gap-5">
          <Link href="/#courses" className={LINK} title="Courses" aria-label="Courses">
            <BookOpen className="h-5 w-5 flex-shrink-0 sm:h-[1.25em] sm:w-[1.25em]" />
            <span className="hidden sm:inline">Courses</span>
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
          <Link href={homeHref} className={LINK} title={homeLabel} aria-label={homeLabel}>
            {role === 'admin' ? <Crown className="h-5 w-5 flex-shrink-0 sm:h-[1.25em] sm:w-[1.25em]" /> : <LayoutDashboard className="h-5 w-5 flex-shrink-0 sm:h-[1.25em] sm:w-[1.25em]" />}
            <span className="hidden sm:inline">{homeLabel}</span>
          </Link>
          {/* A form + server action, not an onClick -- this works
              without turning Nav into a client component, which
              would lose the per-request session read in NavAuth. */}
          {/* data-nav-loading -- picked up by NavigationLoader.jsx's
              global submit listener, so the top progress bar shows
              for this (it navigates away) without showing for every
              other form in the app (most stay on the same page). */}
          <form action={signOutAction} data-nav-loading="true">
            <button type="submit" className={LINK} title="Log out" aria-label="Log out">
              <LogOut className="h-5 w-5 flex-shrink-0 sm:h-[1.25em] sm:w-[1.25em]" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </form>
        </>
      ) : (
        <Link href="/login" className={LINK} title="Student login" aria-label="Student login">
          <GoogleIcon className="h-5 w-5 flex-shrink-0 sm:h-[1.25em] sm:w-[1.25em]" />
          <span className="hidden sm:inline">Student login</span>
        </Link>
      )}
    </>
  );
}
