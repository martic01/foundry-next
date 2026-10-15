'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Next.js App Router has no built-in "navigation started" event (unlike
// the old Pages Router's router.events) -- so this listens at the DOM
// level instead: a click on any internal <a> (whether rendered by
// next/link or a plain anchor -- both exist across this app) means a
// navigation is ABOUT to start, and pathname/searchParams actually
// changing means the new page has resolved and it's over. That's the
// whole mechanism; no external library needed for it.
export default function NavigationLoader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safetyTimeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  // The route actually changed -- navigation resolved, clear the loader.
  // Skipped on first mount since there's no prior navigation to resolve.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLoading(false);
    clearTimeout(safetyTimeoutRef.current);
  }, [pathname, searchParams]);

  useEffect(() => {
    function startLoading() {
      setLoading(true);
      // If the pathname never actually changes for some reason (a full
      // page navigation that errors, a very slow network, a link to a
      // page that redirects back to itself), don't leave the bar
      // spinning forever.
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = setTimeout(() => setLoading(false), 8000);
    }

    function handleClick(e) {
      const anchor = e.target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // opening in a new tab/window some other way

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      // External link -- the browser handles its own loading state for
      // that; this app's loader is only for staying inside the app.
      if (url.origin !== window.location.origin) return;
      // Same page already (identical path + query) -- nothing to wait for.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      startLoading();
    }

    function handleSubmit(e) {
      // Deliberately scoped to forms explicitly marked as navigating
      // (data-nav-loading="true" -- see the "Log out" forms in Nav.jsx/
      // PortalShell.jsx) rather than every form on the page. Most forms
      // in this app (admin actions, the video uploader, etc.) submit via
      // a Server Action and stay on the same page updating in place --
      // showing a full-page navigation loader for those would be wrong,
      // and they already have their own local pending states.
      if (e.target?.dataset?.navLoading === 'true') startLoading();
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('submit', handleSubmit);
      clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-transparent" aria-hidden="true">
      {/* A segment narrower than the track (w-2/5), sliding across it --
          not a full-width bar, which would just flash on/off instead of
          producing the scanning-shimmer look. */}
      <div className="nav-loader-bar absolute inset-y-0 w-2/5 rounded-full bg-brand" />
    </div>
  );
}
