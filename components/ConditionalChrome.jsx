'use client';

import { usePathname } from 'next/navigation';

// Nav and Footer are rendered server-side in app/layout.jsx and passed
// in here as already-built elements (not re-imported/re-rendered here) --
// this component's only job is deciding whether to show them, based on
// the current path. /dashboard and /admin now have their own sidebar
// (components/portal/PortalShell.jsx), so the marketing top nav + footer
// would just be redundant chrome stacked on top of a real app shell.
export default function ConditionalChrome({ nav, footer, children }) {
  const pathname = usePathname();
  const isPortal = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  if (isPortal) {
    return children;
  }

  return (
    <>
      {nav}
      <div className="flex-1">{children}</div>
      {footer}
    </>
  );
}
