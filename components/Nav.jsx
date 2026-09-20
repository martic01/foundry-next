import Link from 'next/link';
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
    <nav className="border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-racing text-2xl tracking-wide text-ink">
          The <span className="text-brand">Foundry</span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/#courses" className="text-inkdim hover:text-ink">Courses</Link>
          {user ? (
            <>
              <Link href={homeHref} className="text-inkdim hover:text-ink">
                {role === 'admin' ? 'Admin' : 'Dashboard'}
              </Link>
              {/* A form + server action, not an onClick -- this works
                  without turning Nav into a client component, which
                  would lose the always-fresh session read above. */}
              <form action={signOutAction}>
                <button type="submit" className="text-inkdim hover:text-ink">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-inkdim hover:text-ink">Student login</Link>
          )}
          <a href={PORTFOLIO_URL} className="text-inkdim hover:text-ink">
            &larr; Portfolio
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
