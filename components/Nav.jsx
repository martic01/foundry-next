import Link from 'next/link';
import { BookOpen, LayoutDashboard, Crown, LogOut, LogIn, Briefcase } from 'lucide-react';
import { createClient } from '../lib/supabase/server';
import { signOutAction } from '../app/actions';
import ThemeToggle from './ThemeToggle';

// PORTFOLIO_URL points back at the main (separate, static) portfolio site
// -- update this once that site has its real deployed domain.
const PORTFOLIO_URL = 'https://marticampf.vercel.app';

// A server component (not 'use client') so it can read the session
// cookie directly on every render -- this is what makes "Student login"
// correctly turn into "Dashboard" / "Admin" + "Log out" the moment
// someone is signed in, on every page, without a client-side fetch.
export default async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    role = profile?.role || 'student';
  }

  const homeHref = role === 'admin' ? '/admin' : '/dashboard';

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link href="/" className="flex-shrink-0 font-racing text-lg tracking-wide text-ink sm:text-2xl">
          The <span className="text-brand">Foundry</span>
        </Link>
        {/* Icon always shown; the label text only shows from `sm` up --
            on a narrow phone screen, four full labels plus the theme
            toggle simply don't fit without wrapping or crowding, so
            mobile gets icon-only nav (title attr covers accessibility/
            hover-hint in place of the visible label). Icons themselves
            are a touch smaller on mobile too (h-4 vs h-[18px]), and the
            row uses a tighter gap -- five icon-only buttons plus the
            wordmark was still crowding a narrow phone screen even with
            labels hidden. */}
        <div className="flex items-center gap-2.5 text-sm sm:gap-5">
          <Link href="/#courses" className="flex items-center gap-1.5 text-inkdim hover:text-ink" title="Courses">
            <BookOpen className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            <span className="hidden sm:inline">Courses</span>
          </Link>
          {user ? (
            <>
              <Link href={homeHref} className="flex items-center gap-1.5 text-inkdim hover:text-ink" title={role === 'admin' ? 'Admin' : 'Dashboard'}>
                {role === 'admin' ? <Crown className="h-4 w-4 sm:h-[18px] sm:w-[18px]" /> : <LayoutDashboard className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />}
                <span className="hidden sm:inline">{role === 'admin' ? 'Admin' : 'Dashboard'}</span>
              </Link>
              {/* A form + server action, not an onClick -- this works
                  without turning Nav into a client component, which
                  would lose the always-fresh session read above. */}
              <form action={signOutAction}>
                <button type="submit" className="flex items-center gap-1.5 text-inkdim hover:text-ink" title="Log out">
                  <LogOut className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="flex items-center gap-1.5 text-inkdim hover:text-ink" title="Student login">
              <LogIn className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              <span className="hidden sm:inline">Student login</span>
            </Link>
          )}
          {/* Briefcase, not an arrow -- an arrow reads as "back/previous
              page", not "this is a portfolio". Briefcase is the
              conventional icon for that. */}
          <a href={PORTFOLIO_URL} className="flex items-center gap-1.5 text-inkdim hover:text-ink" title="Portfolio">
            <Briefcase className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            <span className="hidden sm:inline">Portfolio</span>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
