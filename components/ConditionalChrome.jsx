'use client';

import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import InstallAppButton from './InstallAppButton';

// Nav and Footer are rendered server-side in app/layout.jsx and passed
// in here as already-built elements (not re-imported/re-rendered here) --
// this component's only job is deciding whether to show them, based on
// the current path. /dashboard and /admin now have their own sidebar
// (components/portal/PortalShell.jsx), so the marketing top nav + footer
// would just be redundant chrome stacked on top of a real app shell.
export default function ConditionalChrome({ nav, footer, children }) {
  const pathname = usePathname();
  const isPortal = pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/teacher');

  if (isPortal) {
    return children;
  }

  return (
    <>
      {nav}
      <div className="flex-1">{children}</div>
      {footer}
      {/* The light / dark / system switch lives ONLY on the public Foundry
          pages: floating at the bottom-left. The portals don't have it. */}
      {pathname === '/' && <InstallAppButton />}
      <div className="fixed bottom-4 left-4 z-40 rounded-xl bg-surface/90 shadow-lg backdrop-blur print:hidden">
        <ThemeToggle />
      </div>
    </>
  );
}
