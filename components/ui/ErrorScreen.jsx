'use client';

import { useEffect, useState } from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

// Shared by app/error.jsx, app/global-error.jsx and app/offline/page.jsx.
// Next hides server error text in production, so "network down" is
// decided by the browser being offline OR the message looking
// network-related; otherwise we say the server couldn't be reached.
//
// "Try again" does a real page reload. (reset() alone only re-renders the
// failed boundary with the same failed server result, so it looked
// broken.) The page also reloads by itself the moment the connection
// returns.
const NETWORK_RE = /fetch failed|failed to fetch|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|load failed|timeout/i;

export default function ErrorScreen({ error, plain = false, forceNetwork = false, retryTo }) {
  const [offline, setOffline] = useState(false);
  const [trying, setTrying] = useState(false);

  const retry = () => {
    setTrying(true);
    if (retryTo) window.location.assign(retryTo);
    else window.location.reload();
  };

  useEffect(() => {
    setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    const off = () => setOffline(true);
    const on = () => {
      setOffline(false);
      if (retryTo) window.location.assign(retryTo);
      else window.location.reload();
    };
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => {
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
    };
  }, [retryTo]);

  const network = forceNetwork || offline || NETWORK_RE.test(error?.message || '');
  const Icon = network ? WifiOff : AlertTriangle;
  const wrap = plain ? { style: { fontFamily: 'system-ui, sans-serif', maxWidth: 440, margin: '20vh auto', padding: 24, textAlign: 'center' } } : { className: 'mx-auto flex min-h-[60vh] max-w-md items-center px-6 text-center' };

  return (
    <main {...wrap}>
      <div className={plain ? undefined : 'card w-full p-8'}>
        <Icon className="mx-auto mb-3 h-8 w-8" aria-hidden="true" />
        <h1 className={plain ? undefined : 'mb-2 font-display text-xl font-extrabold text-ink'} style={plain ? { fontSize: 20 } : undefined}>
          {network ? 'Network is down' : 'We couldn’t reach the server'}
        </h1>
        <p className={plain ? undefined : 'mb-5 text-sm text-inkdim'} style={plain ? { margin: '12px 0 20px' } : undefined}>
          {network
            ? 'It looks like your internet connection dropped. Nothing is lost — this page reloads by itself as soon as you’re back online.'
            : 'Something went wrong on our side, or the connection is unstable. Check your internet and try again in a moment.'}
        </p>
        <button type="button" onClick={retry} disabled={trying} className={plain ? undefined : 'cta-btn'}>
          <RefreshCw className={`h-4 w-4 ${trying ? 'animate-spin' : ''}`} /> {trying ? 'Trying…' : 'Try again'}
        </button>
      </div>
    </main>
  );
}
