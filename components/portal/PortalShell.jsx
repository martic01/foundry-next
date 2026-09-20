'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

// One shell, used by both app/dashboard/layout.jsx and
// app/admin/layout.jsx -- each passes its own navItems + role label, so
// the student and admin portals look and behave identically (same
// sidebar mechanics, same mobile behavior) while showing different
// sections. Icons are passed in as already-built elements (e.g.
// `icon: <BookOpen className="h-4 w-4" />`), not component references --
// a bare component reference can't cross the server/client boundary as a
// prop, but an already-rendered element can.
export default function PortalShell({ navItems, roleLabel, userName, userEmail, logoutAction, children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <div className="min-h-screen bg-surfaceMuted md:flex">
      {/* Mobile top bar -- the sidebar itself is off-screen by default on
          small viewports, this is what opens it. */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <Link href="/" className="font-racing text-xl tracking-wide text-ink">
          The <span className="text-brand">Foundry</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-ink hover:bg-surfaceMuted"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Backdrop, mobile only, closes the sidebar on tap-outside */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:w-64 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/" className="font-racing text-xl tracking-wide text-ink">
            The <span className="text-brand">Foundry</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1 text-inkdim hover:text-ink md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-brand/10 text-brand' : 'text-inkdim hover:bg-surfaceMuted hover:text-ink'
                }`}
              >
                {item.icon}
                {item.label}
                {item.badge && (
                  <span className="ml-auto h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-brand" aria-label="Action needed" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{userName}</p>
              <p className="truncate text-xs text-inkdim">{userEmail}</p>
            </div>
            <ThemeToggle />
          </div>
          <span className="inline-block rounded-full bg-surfaceMuted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-inkdim">
            {roleLabel}
          </span>
          {/* logoutAction is a Server Action passed down from the layout
              -- that's the one kind of function that IS allowed to cross
              the server/client prop boundary. */}
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-inkdim hover:bg-surfaceMuted hover:text-ink"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-4 py-8 sm:px-8 md:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
